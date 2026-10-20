#!/usr/bin/env node
// touched-typecheck: a PostToolUse agent hook for Edit and Write that type
// checks the project holding the edited file (PLAN.md 6 release 1 rails,
// "touched-package type check"). Node built-ins only.
//
// The repo root comes from git rev-parse in the edited file's directory,
// never from CLAUDE_PROJECT_DIR or cwd: inside a worktree both can name
// the session's start root. The file is recorded in
// <root>/.hbf/agent-hooks/<session_id>.json, then one check runs with a
// 60 s limit. On errors the hook adds the first 20 error lines as context
// and exits 0: the edit has happened and the agent fixes it next. A clean
// check prints nothing. Any error inside the hook prints nothing.
import { readFileSync, existsSync, realpathSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { projectFor, recordTouched } from "./touched.mjs";

export const TOOLS = new Set(["Edit", "Write", "MultiEdit"]);
export const LIMIT_MS = 60_000;
export const SHOW = 20;

/** The repo root holding dir, or null outside a git work tree. */
export function repoRoot(dir) {
  try {
    return execFileSync("git", ["-C", dir, "rev-parse", "--show-toplevel"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() || null;
  } catch {
    return null;
  }
}

/** The tsc bin of the edited repo, else the one beside this hook. */
function tscBin(root) {
  const own = join(root, "node_modules", ".bin", "tsc");
  if (existsSync(own)) return own;
  const here = join(import.meta.dirname, "..", "..", "node_modules", ".bin", "tsc");
  return existsSync(here) ? here : null;
}

/** The command for a projectFor result, as [argv, label], or null when none applies. */
export function commandFor(root, project) {
  if (project.kind === "vue") {
    const script = join(root, "tools", "vue-check.mjs");
    return existsSync(script) ? [[process.execPath, script], "vue files"] : null;
  }
  const tsc = tscBin(root);
  if (!tsc) return null;
  if (project.kind === "build") return [[process.execPath, tsc, "-b", project.dir], project.dir];
  if (project.kind === "tests") return [[process.execPath, tsc, "-p", "tsconfig.tests.json"], "tsconfig.tests.json"];
  if (project.kind === "tools") return [[process.execPath, tsc, "-p", "tools/tsconfig.json"], "tools/tsconfig.json"];
  return null;
}

/** The context line for a failed run, or null when the check passed. */
export function summarize(result, label) {
  if (result.error?.code === "ETIMEDOUT" || result.signal) return `type check of ${label} did not finish in ${LIMIT_MS / 1000} s, not run`;
  if (result.status === 0) return null;
  const out = `${result.stdout ?? ""}${result.stderr ?? ""}`.split("\n").filter((l) => l.trim() !== "");
  const errors = out.filter((l) => /error TS\d+/.test(l));
  const shown = (errors.length ? errors : out).slice(0, SHOW);
  return `${shown.join("\n")}\n(${errors.length} errors in ${label})`;
}

/** The hook's JSON reply for one PostToolUse input, or null to print nothing. */
export function handle(input) {
  if (!input || !TOOLS.has(input.tool_name)) return null;
  const file = input.tool_input?.file_path;
  if (typeof file !== "string" || file === "") return null;
  // git prints the resolved root (/private/var on macOS), so the file is
  // resolved the same way before paths are made relative to it.
  const given = resolve(input.cwd || process.cwd(), file);
  const abs = existsSync(given) ? realpathSync(given) : given;
  const root = repoRoot(dirname(abs));
  if (!root) return null;
  recordTouched(root, input.session_id, abs);
  const project = projectFor(root, abs);
  if (!project) return null;
  const cmd = commandFor(root, project);
  if (!cmd) return null;
  const [argv, label] = cmd;
  const result = spawnSync(argv[0], argv.slice(1), { cwd: root, encoding: "utf8", timeout: LIMIT_MS, stdio: ["ignore", "pipe", "pipe"] });
  const context = summarize(result, label);
  if (context === null) return null;
  return { hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: context } };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    const reply = handle(JSON.parse(readFileSync(0, "utf8")));
    if (reply) process.stdout.write(`${JSON.stringify(reply)}\n`);
  } catch {
    // The edit stands; no context is added.
  }
  process.exit(0);
}
