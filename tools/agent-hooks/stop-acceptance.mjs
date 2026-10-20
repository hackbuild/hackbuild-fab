#!/usr/bin/env node
// stop-acceptance: a Stop and SubagentStop agent hook that runs the voice
// lint on the files a session touched and the vitest suites of the
// workspaces it touched before the agent may stop (PLAN.md 6 release 1
// rails, "acceptance at stop"; PLAN.md 7 rule 1, "stop after two rounds
// without progress"). Node built-ins only, so the plugin package can ship it.
//
// The touched record is <root>/.hbf/agent-hooks/<session_id>.json, written
// by touched-typecheck.mjs. The root comes from git rev-parse in the input
// cwd; since an edit in a worktree records in that worktree, every work
// tree git lists for that root is searched too. No record or no touched
// files: exit 0 with nothing printed, so a read-only agent pays nothing.
//
// A red result blocks the stop with the reduced failures as the reason.
// The block count per failure lives in <session_id>.stop.json beside the
// record, because touched.mjs rewrites the record on every edit. When the
// stop hook is already active and the same failure has blocked twice, the
// stop is allowed with a context line telling the agent to stop and
// report. A run past the budget (HBF_STOP_BUDGET_S, default 300 s) allows
// the stop and names the workspaces not run: CI stays the gate. A result
// with no failure clears the record. Any error inside the hook exits 0.
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { recordPath } from "./touched.mjs";

export const ROUNDS = 2;
export const DEFAULT_BUDGET_S = 300;
const SHOW = 150;
const ANSI = /\u001b\[[0-9;]*[A-Za-z]/g;

/** The repo root holding dir, or null outside a git work tree. */
export function repoRoot(dir) {
  try {
    return execFileSync("git", ["-C", dir, "rev-parse", "--show-toplevel"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() || null;
  } catch {
    return null;
  }
}

/** The work trees git lists for root, root first. */
function worktrees(root) {
  const out = [root];
  try {
    const text = execFileSync("git", ["-C", root, "worktree", "list", "--porcelain"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    for (const l of text.split("\n")) if (l.startsWith("worktree ") && !out.includes(l.slice(9))) out.push(l.slice(9));
  } catch {
    // root alone.
  }
  return out;
}

/** The roots that hold a touched record for this session. */
export function rootsFor(input) {
  const starts = [input.cwd, process.env.CLAUDE_PROJECT_DIR].filter((d) => typeof d === "string" && d !== "");
  const seen = new Set();
  for (const d of starts) {
    const r = repoRoot(d);
    if (r) for (const w of worktrees(r)) seen.add(w);
  }
  return [...seen].filter((r) => existsSync(recordPath(r, input.session_id)));
}

const readJson = (path, fallback) => {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
};
const writeJson = (path, value) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
};

/** The block counts path beside the touched record. */
export const blocksPath = (root, session) => recordPath(root, session).replace(/\.json$/, ".stop.json");

/** A tool of the checked repo, else the one beside this hook. */
function tool(root, rel) {
  const own = join(root, rel);
  if (existsSync(own)) return own;
  const here = join(import.meta.dirname, "..", "..", rel);
  return existsSync(here) ? here : null;
}

/** 05's reduce when it is present, else the last SHOW lines. */
async function reducer() {
  try {
    const { reduce } = await import("./quiet-output.mjs");
    return (text) => reduce(text) ?? text.split("\n").slice(-SHOW).join("\n");
  } catch {
    return (text) => text.split("\n").slice(-SHOW).join("\n");
  }
}

/**
 * The failure's identity, stable across reruns: the failing test, lint and
 * compiler lines with timings and counts of milliseconds removed, sorted.
 */
export function failureHash(text) {
  const marks = new RegExp(`FAIL|not ok|error TS\\d+|AssertionError|^\\S+:\\d+:\\d+ \\S+|${String.fromCodePoint(0x2717)}|${String.fromCodePoint(0x00d7)}`);
  const norm = (l) => l.replace(ANSI, "").replace(/\d+(\.\d+)?\s?m?s\b/g, "").trim();
  let picked = text.split("\n").filter((l) => marks.test(l)).map(norm);
  if (picked.length === 0) picked = [text.replace(/\d+/g, "")];
  return createHash("sha256").update([...new Set(picked)].sort().join("\n")).digest("hex").slice(0, 16);
}

/**
 * Run argv in its own process group; past timeoutMs the whole group is
 * killed, so vitest's fork workers do not outlive the hook.
 */
export function runGroup(argv, opts, timeoutMs) {
  return new Promise((done) => {
    const child = spawn(argv[0], argv.slice(1), { ...opts, detached: true, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    child.stdout.on("data", (b) => (out += b));
    child.stderr.on("data", (b) => (out += b));
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch {
        // Already gone.
      }
    }, Math.max(1, timeoutMs));
    child.on("error", () => {
      clearTimeout(timer);
      done({ status: null, timedOut, out });
    });
    child.on("close", (status) => {
      clearTimeout(timer);
      done({ status, timedOut, out });
    });
  });
}

/** Lint and test one root within budgetMs: {fail, text, notRun}. */
export async function accept(root, rec, budgetMs) {
  const start = Date.now();
  const left = () => budgetMs - (Date.now() - start);
  const parts = [];
  let fail = false;
  const env = { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0", CI: "1" };
  const files = (rec.files ?? []).filter((f) => existsSync(join(root, f)));
  const lint = tool(root, "tools/lint-voice.mjs");
  if (lint && files.length) {
    const r = spawnSync(process.execPath, [lint, ...files], { cwd: root, encoding: "utf8", env, timeout: Math.max(1, left()), stdio: ["ignore", "pipe", "pipe"] });
    if (r.status !== 0) {
      fail = true;
      parts.push(`lint-voice:\n${`${r.stdout ?? ""}${r.stderr ?? ""}`.trim()}`);
    }
  }
  const workspaces = (rec.workspaces ?? []).filter((w) => existsSync(join(root, w)));
  const notRun = [];
  const vitest = tool(root, "node_modules/vitest/vitest.mjs");
  if (workspaces.length && !vitest) notRun.push(...workspaces);
  else if (workspaces.length) {
    let excludes = [];
    const owner = join(root, ".github", "scripts", "owner-files.mjs");
    if (existsSync(owner)) {
      const r = spawnSync(process.execPath, [owner, "excludes"], { cwd: root, encoding: "utf8", timeout: Math.max(1, left()) });
      if (r.status === 0) excludes = r.stdout.split("\n").filter((l) => l.startsWith("--exclude="));
    }
    for (const ws of workspaces) {
      if (left() <= 0) {
        notRun.push(ws);
        continue;
      }
      const r = await runGroup([process.execPath, vitest, "run", "--passWithNoTests", `${ws}/`, ...excludes], { cwd: root, env }, left());
      if (r.timedOut) notRun.push(ws);
      else if (r.status !== 0) {
        fail = true;
        parts.push(`vitest ${ws}:\n${r.out.replace(ANSI, "").trim()}`);
      }
    }
  }
  return { fail, text: parts.join("\n\n"), notRun };
}

/** The hook's JSON reply for one Stop or SubagentStop input, or null to print nothing. */
export async function handle(input) {
  if (!input || !input.session_id) return null;
  const event = input.hook_event_name === "SubagentStop" ? "SubagentStop" : "Stop";
  const budgetS = Number(process.env.HBF_STOP_BUDGET_S) > 0 ? Number(process.env.HBF_STOP_BUDGET_S) : DEFAULT_BUDGET_S;
  const deadline = Date.now() + budgetS * 1000;
  const reduce = await reducer();
  const reasons = [];
  const notes = [];
  for (const root of rootsFor(input)) {
    const recPath = recordPath(root, input.session_id);
    const rec = readJson(recPath, {});
    if (!(rec.files ?? []).length && !(rec.workspaces ?? []).length) continue;
    const res = await accept(root, rec, Math.max(0, deadline - Date.now()));
    if (res.notRun.length) notes.push(`acceptance budget of ${budgetS} s spent in ${root}; not run: ${res.notRun.join(", ")}`);
    const bPath = blocksPath(root, input.session_id);
    if (!res.fail) {
      // Workspaces past the budget are named once, then left to CI.
      writeJson(recPath, { ...rec, files: [], workspaces: [] });
      rmSync(bPath, { force: true });
      continue;
    }
    // A stop that is not a hook continuation starts a fresh round count.
    const blocks = input.stop_hook_active ? readJson(bPath, {}) : {};
    const hash = failureHash(res.text);
    const short = reduce(res.text);
    if ((blocks[hash] ?? 0) >= ROUNDS) {
      const first = short.split("\n").find((l) => l.trim() !== "") ?? "";
      notes.push(`acceptance still red after two rounds: ${first.trim()} (${root}); stop and report`);
      continue;
    }
    blocks[hash] = (blocks[hash] ?? 0) + 1;
    writeJson(bPath, blocks);
    reasons.push(`acceptance failed in ${root}:\n${short}`);
  }
  if (reasons.length) return { decision: "block", reason: [...reasons, ...notes].join("\n\n") };
  if (notes.length) return { systemMessage: notes.join("\n"), hookSpecificOutput: { hookEventName: event, additionalContext: notes.join("\n") } };
  return null;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    const reply = await handle(JSON.parse(readFileSync(0, "utf8")));
    if (reply) process.stdout.write(`${JSON.stringify(reply)}\n`);
  } catch {
    // The stop stands.
  }
  process.exit(0);
}
