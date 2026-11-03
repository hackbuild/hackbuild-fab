#!/usr/bin/env node
// stop-acceptance: a Stop and SubagentStop agent hook that runs the voice
// lint on the files a session touched and the vitest files that import them
// before the agent may stop (PLAN.md 6 release 1 rails, "acceptance at stop";
// PLAN.md 7 rule 1, "stop after two rounds without progress"; plan v11.2
// Phase 1 item 6b). Node built-ins only, so the plugin package can ship it.
//
// The touched record is <root>/.hbf/agent-hooks/<session_id>.json, written
// by touched-typecheck.mjs. The root comes from git rev-parse in the input
// cwd; since an edit in a worktree records in that worktree, every work
// tree git lists for that root is searched too. No record or no touched
// files: exit 0 with nothing printed, so a read-only agent pays nothing.
//
// Tests are selected by vitest's module graph (related-tests.mjs, the set
// `vitest related` would run) from the touched code files, never by
// workspace. Related files whose measured duration in tools/test-tiers.json
// is above measured.hookThresholdS never run here: they are counted and
// named as not run and CI stays the gate. That threshold is the hook's own,
// set so a typical edit's related set fits the budget; the fast tier of
// `npm run test:fast` uses the lower measured.thresholdS. So are the files
// that read the owner's archives (.github/scripts/owner-files.mjs). A touched
// file that no test imports runs nothing, and an edit to a workspace
// package's src selects only tests that import ../src, since the others
// import its dist. A module in the graph that vite cannot transform blocks
// the stop only when it is one of the touched code files, with vite's message.
// The graph is repo wide and is read to the first such error, so a broken file
// the session never touched, or a graph that cannot be read at all, falls back
// to the whole-workspace run of the touched workspaces (minus the same
// left-to-CI files) as before the graph existed: a parse error in a touched
// file that a workspace test imports still fails there, and another agent's
// half-edited file in an unrelated package does not block this stop.
//
// A red result blocks the stop with the reduced failures as the reason.
// The block count per failure lives in <session_id>.stop.json beside the
// record, because touched.mjs rewrites the record on every edit. When the
// stop hook is already active and the same failure has blocked twice, the
// stop is allowed with a context line telling the agent to stop and
// report. A run past the budget (HBF_STOP_BUDGET_S, default 300 s) allows
// the stop and names the tests not run: CI stays the gate. A result
// with no failure clears the record. Any error inside the hook exits 0.
import { existsSync, readFileSync, writeFileSync, mkdirSync, realpathSync, rmSync } from "node:fs";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { dirname, join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { recordPath, workspaceFor } from "./touched.mjs";

export const ROUNDS = 2;
export const DEFAULT_BUDGET_S = 300;
const SHOW = 150;
/** Characters of a failure header line. */
const HEAD = 120;
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

export const TIERS_FILE = "tools/test-tiers.json";
/** Touched files vitest's module graph can map to the tests that import them. */
const MAPPABLE = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs|vue)$/;
/** vitest's forceRerunTriggers: a config file in the related set selects every test. */
const CONFIG = /(^|\/)(vitest|vite)\.(config|workspace)\.[^/]+$/;
const NAMED = 5;

/**
 * The vitest files the hook leaves to CI, from the tiers file of root (else the
 * one beside this hook): {files, thresholdS}. A file is left when its measured
 * durationS is above measured.hookThresholdS; a tiers file without that field
 * leaves its slow-tier rows. thresholdS is null when there is no tiers file.
 */
export function skipTier(root) {
  const path = tool(root, TIERS_FILE);
  const tiers = path ? readJson(path, {}) : {};
  const limit = tiers.measured?.hookThresholdS;
  const rows = Object.entries(tiers.files ?? {}).filter(([, r]) => r && r.runner === "vitest");
  const left = typeof limit === "number" ? rows.filter(([, r]) => r.durationS > limit) : rows.filter(([, r]) => r.tier === "slow");
  return { files: left.map(([f]) => f).sort(), thresholdS: typeof limit === "number" ? limit : (tiers.measured?.thresholdS ?? null) };
}

/** The `--exclude=<absolute path>` flags for the files that read the owner's archives. */
function ownerExcludes(root, timeoutMs) {
  const owner = join(root, ".github", "scripts", "owner-files.mjs");
  if (!existsSync(owner)) return [];
  const r = spawnSync(process.execPath, [owner, "excludes"], { cwd: root, encoding: "utf8", timeout: Math.max(1, timeoutMs) });
  return r.status === 0 ? r.stdout.split("\n").filter((l) => l.startsWith("--exclude=")) : [];
}

/**
 * The lister's reply: {files} for its array, else {error: {id, message}} from its
 * error line, else the raw output as the message of an error with no id.
 */
export function readGraph(out, status) {
  const lines = out.split("\n").reverse();
  try {
    const list = lines.find((l) => l.startsWith("["));
    // The array is the last line that starts with a bracket; a warning may follow it.
    if (status === 0 && list !== undefined) {
      const files = JSON.parse(list);
      if (Array.isArray(files)) return { files };
    }
    const err = lines.find((l) => l.startsWith('{"error"'));
    const e = err === undefined ? null : JSON.parse(err).error;
    if (e && typeof e.message === "string") return { error: { id: typeof e.id === "string" ? e.id : null, message: e.message } };
  } catch {
    // The raw output is the message.
  }
  return { error: { id: null, message: out.trim() === "" ? `the module graph read exited ${String(status)} with no output` : out } };
}

const some = (list) => (list.length > NAMED ? `${list.slice(0, NAMED).join(", ")} and ${list.length - NAMED} more` : list.join(", "));

/** A module id from vite's error as a path: no virtual-module mark, no query. */
const moduleName = (id) => id.replace(/^\0/, "").replace(/\?.*$/, "");

/**
 * Lint and test one root within budgetMs: {fail, text, notRun, slow, owner,
 * thresholdS, related, fallback}. notRun is a list of {names, why} for what the
 * budget or a missing tool kept from running, slow the files over the hook
 * threshold (thresholdS) left to CI, owner the files that need the owner's
 * archives, related how many test files the module graph selected (null when
 * the touched workspaces ran whole instead), fallback {why, workspaces} when
 * the graph could not be read for a reason other than a touched file.
 * A touched code file that vite cannot transform is a failure; a graph that
 * fails on any other module runs the touched workspaces, as the hook did
 * before it read the graph.
 */
export async function accept(root, rec, budgetMs) {
  const start = Date.now();
  const left = () => budgetMs - (Date.now() - start);
  const parts = [];
  let fail = false;
  const env = { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0", CI: "1" };
  const files = (rec.files ?? []).filter((f) => existsSync(join(root, f)));
  const notRun = [];
  const slow = [];
  const owner = [];
  let thresholdS = null;
  let selected = null;
  let fallback = null;
  const out = () => ({ fail, text: parts.join("\n\n"), notRun, slow, owner, thresholdS, related: selected, fallback });
  const lint = tool(root, "tools/lint-voice.mjs");
  if (lint && files.length) {
    const r = spawnSync(process.execPath, [lint, ...files], { cwd: root, encoding: "utf8", env, timeout: Math.max(1, left()), stdio: ["ignore", "pipe", "pipe"] });
    // A lint killed by the budget did not find anything.
    if (r.error?.code === "ETIMEDOUT") notRun.push({ names: "voice lint on the touched files", why: "budget" });
    else if (r.status !== 0) {
      fail = true;
      parts.push(`lint-voice:\n${`${r.stdout ?? ""}${r.stderr ?? ""}`.trim()}`);
    }
  }
  const code = files.filter((f) => MAPPABLE.test(f) && !CONFIG.test(f));
  if (code.length === 0) return out();
  const label = `tests related to ${some(code)}`;
  const vitest = tool(root, "node_modules/vitest/vitest.mjs");
  const lister = join(import.meta.dirname, "related-tests.mjs");
  if (!vitest || !existsSync(join(root, "node_modules", "vitest", "dist", "node.js"))) {
    notRun.push({ names: label, why: "vitest is not installed" });
    return out();
  }
  const found = await runGroup([process.execPath, lister, root, ...code], { cwd: root, env }, left());
  if (found.timedOut) {
    notRun.push({ names: label, why: "budget" });
    return out();
  }
  const graph = readGraph(found.out, found.status);
  const named = graph.files || graph.error.id === null ? null : moduleName(graph.error.id);
  const detail = graph.files ? "" : graph.error.message.replace(ANSI, "").trim();
  if (named !== null && code.includes(named)) {
    // A touched file vite cannot transform fails the stop as the workspace run did.
    fail = true;
    parts.push(`module graph, ${label}:\nFAIL ${named}\n${detail}`);
    return out();
  }
  const skip = skipTier(root);
  thresholdS = skip.thresholdS;
  const ownerFlags = ownerExcludes(root, left());
  const ownerSet = new Set(ownerFlags.map((l) => l.slice("--exclude=".length)));
  const real = realpathSync(root);
  const isOwner = (f) => ownerSet.has(join(root, f)) || ownerSet.has(join(real, f));
  let argv;
  let names;
  let shown;
  if (graph.files) {
    selected = graph.files.length;
    const slowSet = new Set(skip.files);
    const run = [];
    for (const f of graph.files) {
      if (slowSet.has(f)) slow.push(f);
      else if (isOwner(f)) owner.push(f);
      else run.push(f);
    }
    if (run.length === 0) return out();
    argv = run;
    names = `${label}, ${run.length} files`;
    shown = some(run);
  } else {
    // The module graph is repo wide, so its error can be another session's file.
    const why = named === null ? (detail.split("\n").find((l) => l.trim() !== "") ?? "no message").trim().slice(0, HEAD) : `${named} is not a touched file`;
    const workspaces = [...new Set(code.map((f) => workspaceFor(root, f)).filter((w) => w !== null))].filter((w) => existsSync(join(root, w)));
    if (workspaces.length === 0) {
      notRun.push({ names: label, why: `the module graph failed (${why}) and the touched files are in no workspace` });
      return out();
    }
    fallback = { why, workspaces };
    const under = (f) => workspaces.some((w) => f.startsWith(`${w}/`));
    slow.push(...skip.files.filter((f) => under(f) && existsSync(join(root, f))));
    for (const p of ownerSet) {
      const rel = [relative(root, p), relative(real, p)].find((r) => !r.startsWith(".."));
      if (rel !== undefined && under(rel)) owner.push(rel);
    }
    argv = [...workspaces.map((w) => `${w}/`), ...slow.map((f) => `--exclude=${join(root, f)}`), ...ownerFlags];
    names = `touched workspaces ${workspaces.join(", ")}`;
    shown = workspaces.join(", ");
  }
  if (left() <= 0) {
    notRun.push({ names, why: "budget" });
    return out();
  }
  const r = await runGroup([process.execPath, vitest, "run", "--passWithNoTests", ...argv], { cwd: root, env }, left());
  if (r.timedOut) notRun.push({ names, why: "budget" });
  else if (r.status !== 0) {
    fail = true;
    parts.push(`vitest ${shown}:\n${r.out.replace(ANSI, "").trim()}`);
  }
  return out();
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
    if (!(rec.files ?? []).length) continue;
    const res = await accept(root, rec, Math.max(0, deadline - Date.now()));
    const spent = res.notRun.filter((n) => n.why === "budget");
    const failed = res.notRun.filter((n) => n.why !== "budget");
    if (spent.length) notes.push(`acceptance budget of ${budgetS} s spent in ${root}; not run: ${spent.map((n) => n.names).join(", ")}`);
    for (const n of failed) notes.push(`acceptance could not select tests in ${root}: ${n.why}; not run: ${n.names}`);
    if (res.fallback) notes.push(`module graph failed in ${root} (${res.fallback.why}); ran the touched workspaces whole instead: ${res.fallback.workspaces.join(", ")}`);
    if (res.slow.length) {
      const of = res.related === null ? "of the test files in the touched workspaces" : `of ${res.related} related test files`;
      notes.push(`${res.slow.length} ${of} measured above ${res.thresholdS} s left to CI in ${root}; not run: ${some(res.slow)}`);
    }
    if (res.owner.length) notes.push(`owner files need the owner's archives in ${root}; not run: ${some(res.owner)}`);
    const bPath = blocksPath(root, input.session_id);
    if (!res.fail) {
      // Tests past the budget or over the hook threshold are named once, then left to CI.
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
