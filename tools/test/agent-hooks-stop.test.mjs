// tools/agent-hooks/stop-acceptance.mjs: the stop hook spawned on scratch
// git repos with one tiny workspace each. A red test blocks twice, then the
// third stop is allowed with the two-rounds line (PLAN.md 7 rule 1); a
// clean workspace allows at once; a voice hit blocks; a record written in a
// worktree is found from the session's start root.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { recordPath } from "../agent-hooks/touched.mjs";
import { blocksPath, failureHash } from "../agent-hooks/stop-acceptance.mjs";

const repo = execFileSync("git", ["-C", import.meta.dirname, "rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const hook = join(import.meta.dirname, "..", "agent-hooks", "stop-acceptance.mjs");
const EM_DASH = String.fromCodePoint(0x2014);

const PASSING = 'import { test, expect } from "vitest";\ntest("adds", () => expect(1 + 1).toBe(2));\n';
const FAILING = 'import { test, expect } from "vitest";\ntest("pin spacing holds", () => expect(0.31).toBe(0.4));\n';

/** A scratch git repo with workspace pkg holding one test file. */
function scratch(testBody) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "hbf-stop-")));
  execFileSync("git", ["init", "-q", root]);
  writeFileSync(join(root, "package.json"), JSON.stringify({ private: true, type: "module", workspaces: ["pkg"] }));
  symlinkSync(join(repo, "node_modules"), join(root, "node_modules"));
  writeFileSync(join(root, ".gitignore"), "node_modules\n.hbf\n");
  const file = join(root, "pkg", "test", "a.test.ts");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, testBody);
  return root;
}

function record(root, session, rec) {
  const path = recordPath(root, session);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(rec));
}

function stop(cwd, session, active, env = {}) {
  const r = spawnSync(process.execPath, [hook], {
    cwd,
    env: { ...process.env, CLAUDE_PROJECT_DIR: cwd, ...env },
    input: JSON.stringify({ session_id: session, hook_event_name: "Stop", cwd, stop_hook_active: active }),
    encoding: "utf8",
  });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout === "" ? null : JSON.parse(r.stdout);
}

test("a red workspace blocks, blocks again, then allows with the two-rounds line", () => {
  const root = scratch(FAILING);
  const session = `stop-red-${process.pid}`;
  try {
    record(root, session, { files: ["pkg/test/a.test.ts"], workspaces: ["pkg"] });
    const first = stop(root, session, false);
    assert.equal(first?.decision, "block");
    assert.match(first.reason, /pin spacing holds/);
    const second = stop(root, session, true);
    assert.equal(second?.decision, "block", "second round");
    const third = stop(root, session, true);
    assert.equal(third?.decision, undefined, "third stop is allowed");
    assert.match(third.hookSpecificOutput.additionalContext, /^acceptance still red after two rounds: .+; stop and report$/);
    assert.equal(third.hookSpecificOutput.hookEventName, "Stop");
    const counts = JSON.parse(readFileSync(blocksPath(root, session), "utf8"));
    assert.deepEqual(Object.values(counts), [2]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a clean workspace allows at once and clears the record", () => {
  const root = scratch(PASSING);
  const session = `stop-clean-${process.pid}`;
  try {
    record(root, session, { files: ["pkg/test/a.test.ts"], workspaces: ["pkg"] });
    assert.equal(stop(root, session, false), null);
    assert.deepEqual(JSON.parse(readFileSync(recordPath(root, session), "utf8")), { files: [], workspaces: [] });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a touched file with an em dash blocks on the voice lint", () => {
  const root = scratch(PASSING);
  const session = `stop-voice-${process.pid}`;
  try {
    writeFileSync(join(root, "pkg", "notes.md"), `pin spacing ${EM_DASH} measured\n`);
    record(root, session, { files: ["pkg/notes.md", "pkg/gone.md"], workspaces: [] });
    const reply = stop(root, session, false);
    assert.equal(reply?.decision, "block");
    assert.match(reply.reason, /pkg\/notes\.md:1:\d+ /);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("no record prints nothing, and a record in a worktree is found from the start root", () => {
  const root = scratch(PASSING);
  const wt = `${root}-wt`;
  const session = `stop-wt-${process.pid}`;
  try {
    assert.equal(stop(root, session, false), null, "read-only session");
    execFileSync("git", ["-C", root, "add", "-A"]);
    execFileSync("git", ["-C", root, "-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "seed"]);
    execFileSync("git", ["-C", root, "worktree", "add", "-q", wt]);
    symlinkSync(join(repo, "node_modules"), join(wt, "node_modules"));
    writeFileSync(join(wt, "pkg", "test", "a.test.ts"), FAILING);
    record(wt, session, { files: ["pkg/test/a.test.ts"], workspaces: ["pkg"] });
    const reply = stop(root, session, false);
    assert.equal(reply?.decision, "block");
    assert.ok(reply.reason.includes(wt), "names the worktree");
    assert.ok(!existsSync(recordPath(root, session)), "nothing recorded in the start root");
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(wt, { recursive: true, force: true });
  }
});

test("a zero budget allows the stop and names the workspace not run", () => {
  const root = scratch(FAILING);
  const session = `stop-budget-${process.pid}`;
  try {
    record(root, session, { files: [], workspaces: ["pkg"] });
    const reply = stop(root, session, false, { HBF_STOP_BUDGET_S: "0.001" });
    assert.equal(reply?.decision, undefined);
    assert.match(reply.systemMessage, /not run: pkg$/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a run past the budget is killed with its workers and named not run", () => {
  // The worker writes its pid, then waits past the budget.
  const root = scratch(
    'import { test } from "vitest";\nimport { writeFileSync } from "node:fs";\n' +
      'test("waits", () => { writeFileSync(new URL("../worker.pid", import.meta.url), String(process.pid)); return new Promise((r) => setTimeout(r, 120_000)); }, 150_000);\n',
  );
  const session = `stop-kill-${process.pid}`;
  try {
    record(root, session, { files: [], workspaces: ["pkg"] });
    const t0 = Date.now();
    const reply = stop(root, session, false, { HBF_STOP_BUDGET_S: "20" });
    assert.ok(Date.now() - t0 < 60_000, "returned at the budget");
    assert.match(reply.systemMessage, /not run: pkg$/);
    const pidFile = join(root, "pkg", "worker.pid");
    assert.ok(existsSync(pidFile), "the worker started inside the budget");
    const pid = Number(readFileSync(pidFile, "utf8"));
    let alive = true;
    for (let i = 0; i < 50 && alive; i++) {
      try {
        process.kill(pid, 0);
        execFileSync("sleep", ["0.1"]);
      } catch {
        alive = false;
      }
    }
    if (alive) process.kill(pid, "SIGKILL");
    assert.equal(alive, false, "the vitest worker outlived the hook");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("failureHash ignores timings and keeps the failing test name", () => {
  const a = "FAIL pkg/test/a.test.ts > pin spacing holds 12ms\nDuration 1.20s";
  const b = "FAIL pkg/test/a.test.ts > pin spacing holds 340ms\nDuration 9.81s";
  const c = "FAIL pkg/test/a.test.ts > hinge clears 12ms";
  assert.equal(failureHash(a), failureHash(b));
  assert.notEqual(failureHash(a), failureHash(c));
});
