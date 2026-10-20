#!/usr/bin/env node
// quiet-output: a PostToolUse agent hook that shortens long test and
// compile logs before they reach the agent's context (PLAN.md 6 release 1
// rails, "hooks (output rewrite ...)"). Node built-ins only, so the plugin
// package can ship it.
//
// It acts only on a Bash call whose command runs a test or compile tool and
// whose stdout plus stderr exceeds 80 lines. The full output goes to
// <repo>/.hbf/agent-hooks/logs/<session_id>-<n>.log and the agent sees the
// failure lines with 6 lines of context each and the last 15 lines, at most
// 150 lines, then the log path. Output it does not understand (no failure
// marker and no summary line) passes through unchanged. It never returns a
// permission decision, so the export ask rules stay untouched. Any error
// inside the hook exits 0 with nothing printed: the tool output stands.
import { readFileSync, mkdirSync, writeFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export const COMMAND = /\b(vitest|tsc|node --test|playwright test|pytest|npm (run )?(test|check|typecheck))\b/;
export const MIN_LINES = 81;
export const CONTEXT = 6;
export const TAIL = 15;
export const CAP = 150;

// Failure markers. The vitest cross glyphs are U+2717 and U+00D7, built
// from code points so this file passes the voice lint's dingbat rule.
export const FAILURE = [
  /FAIL/,
  new RegExp(String.fromCodePoint(0x2717)),
  new RegExp(String.fromCodePoint(0x00d7)),
  /not ok/,
  /error TS\d+/,
  /AssertionError/,
  /Error:/,
  /Expected/,
  /Received/,
  /failed/,
  /^E {3}/,
];
export const SUMMARY = [/Test Files/, /Tests/, /# pass/, /# fail/, /passed/, /Found \d+ error/];

const omitted = (n) => `[${n} lines omitted]`;

/** Split a log into lines, dropping one trailing newline. */
export function lines(text) {
  const s = text.endsWith("\n") ? text.slice(0, -1) : text;
  return s.split("\n");
}

/**
 * The shortened log, or null when the text carries no failure marker and
 * no summary line (pass it through unchanged). Keeps every failure line,
 * the CONTEXT lines after each, and the last TAIL lines, in order, with a
 * marker line for each gap, at most CAP lines. When the failure context
 * overflows the cap, the earliest failures win and the tail is kept whole.
 */
export function reduce(text) {
  const all = lines(text);
  const hit = (res, l) => res.some((re) => re.test(l));
  const fails = [];
  let summary = false;
  for (let i = 0; i < all.length; i++) {
    if (hit(FAILURE, all[i])) fails.push(i);
    if (hit(SUMMARY, all[i])) summary = true;
  }
  if (fails.length === 0 && !summary) return null;
  const tailStart = Math.max(0, all.length - TAIL);
  const keep = new Set();
  for (const i of fails) for (let j = i; j <= i + CONTEXT && j < tailStart; j++) keep.add(j);
  const head = [...keep].sort((a, b) => a - b);
  // Budget for the head: the cap less the tail and one gap marker before it.
  const budget = CAP - (all.length - tailStart) - (tailStart > 0 ? 1 : 0);
  const out = [];
  let next = 0;
  for (const i of head) {
    const gap = i > next ? 1 : 0;
    if (out.length + gap + 1 > budget) break;
    if (gap) out.push(omitted(i - next));
    out.push(all[i]);
    next = i + 1;
  }
  if (tailStart > next) out.push(omitted(tailStart - next));
  for (let i = tailStart; i < all.length; i++) out.push(all[i]);
  return out.join("\n");
}

/** The repo root holding dir, or null outside a git work tree. */
function repoRoot(dir) {
  try {
    return execFileSync("git", ["-C", dir, "rev-parse", "--show-toplevel"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() || null;
  } catch {
    return null;
  }
}

/** Write the full log and return its path: <root>/.hbf/agent-hooks/logs/<session>-<n>.log. */
function writeLog(root, session, text) {
  const dir = join(root, ".hbf", "agent-hooks", "logs");
  mkdirSync(dir, { recursive: true });
  const id = String(session || "session").replace(/[^A-Za-z0-9_-]/g, "_");
  const prefix = `${id}-`;
  let n = 1;
  for (const f of readdirSync(dir)) {
    const m = f.startsWith(prefix) && /^(\d+)\.log$/.exec(f.slice(prefix.length));
    if (m) n = Math.max(n, Number(m[1]) + 1);
  }
  const path = join(dir, `${prefix}${n}.log`);
  writeFileSync(path, text);
  return path;
}

/** The hook's JSON reply for one PostToolUse input, or null to print nothing. */
export function handle(input) {
  if (!input || input.tool_name !== "Bash") return null;
  const command = input.tool_input?.command;
  if (typeof command !== "string" || !COMMAND.test(command)) return null;
  const res = input.tool_response ?? {};
  const stdout = typeof res.stdout === "string" ? res.stdout : "";
  const stderr = typeof res.stderr === "string" ? res.stderr : "";
  const text = stderr ? (stdout && !stdout.endsWith("\n") ? `${stdout}\n${stderr}` : stdout + stderr) : stdout;
  const count = text ? lines(text).length : 0;
  if (count < MIN_LINES) return null;
  const short = reduce(text);
  if (short === null) return null;
  const root = repoRoot(input.cwd || process.cwd());
  if (!root) return null;
  const path = writeLog(root, input.session_id, text);
  return {
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      updatedToolOutput: { stdout: `${short}\nfull log: ${path} (${count} lines)`, stderr: "", interrupted: Boolean(res.interrupted), isImage: false },
    },
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    const reply = handle(JSON.parse(readFileSync(0, "utf8")));
    if (reply) process.stdout.write(`${JSON.stringify(reply)}\n`);
  } catch {
    // The tool output stands unchanged.
  }
  process.exit(0);
}
