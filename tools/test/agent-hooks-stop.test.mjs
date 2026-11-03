// tools/agent-hooks/stop-acceptance.mjs: the stop hook spawned on scratch
// git repos with one tiny workspace each. A red test blocks twice, then the
// third stop is allowed with the two-rounds line (PLAN.md 7 rule 1); a
// clean workspace allows at once; a voice hit blocks; a record written in a
// worktree is found from the session's start root. Tests are selected from
// the touched files by vitest's module graph: a touched source file selects
// the tests that import it, a related file measured above the hook threshold
// is skipped and named while a slower-than-fast one under it runs, a source
// file vite cannot transform blocks the stop, a file nobody touched that vite
// cannot transform in an unrelated package does not (the touched workspace
// runs whole instead, as before the graph), and a record with no touched
// files runs nothing.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { recordPath } from "../agent-hooks/touched.mjs";
import { blocksPath, failureHash, readGraph, skipTier } from "../agent-hooks/stop-acceptance.mjs";

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

/** Write body at root/rel, creating folders. */
function put(root, rel, body) {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), body);
}

/** A test that writes a marker file named name beside the workspace when it runs, then passes or fails. */
const marking = (name, importSrc, expectation) =>
  'import { test, expect } from "vitest";\nimport { writeFileSync } from "node:fs";\n' +
  (importSrc ? 'import { pinSpacing } from "../src/x.ts";\n' : "") +
  `test("${name}", () => { writeFileSync(new URL("../${name.replace(/\W+/g, "-")}.ran", import.meta.url), "x"); ${expectation}; });\n`;

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

test("a zero budget allows the stop and names the tests not run", () => {
  const root = scratch(FAILING);
  const session = `stop-budget-${process.pid}`;
  try {
    record(root, session, { files: ["pkg/test/a.test.ts"], workspaces: ["pkg"] });
    const reply = stop(root, session, false, { HBF_STOP_BUDGET_S: "0.001" });
    assert.equal(reply?.decision, undefined);
    assert.match(reply.systemMessage, /not run: voice lint on the touched files, tests related to pkg\/test\/a\.test\.ts$/);
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
    record(root, session, { files: ["pkg/test/a.test.ts"], workspaces: ["pkg"] });
    const t0 = Date.now();
    const reply = stop(root, session, false, { HBF_STOP_BUDGET_S: "30" });
    assert.ok(Date.now() - t0 < 90_000, "returned at the budget");
    assert.match(reply.systemMessage, /not run: tests related to pkg\/test\/a\.test\.ts, 1 files$/);
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

const X_SRC = "export const pinSpacing = 0.31;\n";

test("a touched source file selects the tests that import it and no others", () => {
  const root = scratch(PASSING);
  const session = `stop-related-${process.pid}`;
  try {
    put(root, "pkg/src/x.ts", X_SRC);
    put(root, "pkg/test/a.test.ts", marking("pin spacing holds", true, "expect(pinSpacing).toBe(0.4)"));
    put(root, "pkg/test/b.test.ts", marking("hinge clears", false, "expect(1).toBe(2)"));
    record(root, session, { files: ["pkg/src/x.ts"], workspaces: ["pkg"] });
    const reply = stop(root, session, false);
    assert.equal(reply?.decision, "block");
    assert.match(reply.reason, /pin spacing holds/);
    assert.doesNotMatch(reply.reason, /hinge clears/);
    assert.ok(existsSync(join(root, "pkg", "pin-spacing-holds.ran")), "the importing test ran");
    assert.ok(!existsSync(join(root, "pkg", "hinge-clears.ran")), "the unrelated test did not run");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

/** A tiers file whose rows are {file: durationS}, the fast threshold 3 s and the hook threshold 15 s. */
const tiersFile = (rows) => ({
  measured: { date: "2026-11-02", thresholdS: 3, hookThresholdS: 15 },
  files: Object.fromEntries(Object.entries(rows).map(([f, durationS]) => [f, { runner: "vitest", durationS, tier: durationS > 3 ? "slow" : "fast" }])),
});

test("a related file over the hook threshold is skipped and counted, and slow-tier and fast files under it run", () => {
  const root = scratch(PASSING);
  const session = `stop-slow-${process.pid}`;
  try {
    put(root, "pkg/src/x.ts", X_SRC);
    put(root, "pkg/test/fast.test.ts", marking("fast holds", true, "expect(pinSpacing).toBe(0.31)"));
    put(root, "pkg/test/mid.test.ts", marking("mid holds", true, "expect(pinSpacing).toBe(0.31)"));
    put(root, "pkg/test/slow.test.ts", marking("slow holds", true, "expect(pinSpacing).toBe(0.4)"));
    put(root, "tools/test-tiers.json", JSON.stringify(tiersFile({ "pkg/test/slow.test.ts": 40, "pkg/test/mid.test.ts": 10, "pkg/test/fast.test.ts": 1 })));
    record(root, session, { files: ["pkg/src/x.ts"], workspaces: ["pkg"] });
    const reply = stop(root, session, false);
    assert.equal(reply?.decision, undefined, "the red slow test did not run, so nothing blocks");
    assert.match(reply.systemMessage, /^1 of 3 related test files measured above 15 s left to CI in .+; not run: pkg\/test\/slow\.test\.ts$/);
    assert.doesNotMatch(reply.systemMessage, /fast\.test|mid\.test/);
    assert.ok(existsSync(join(root, "pkg", "fast-holds.ran")), "the fast test ran");
    assert.ok(existsSync(join(root, "pkg", "mid-holds.ran")), "the file over the fast threshold and under the hook threshold ran");
    assert.ok(!existsSync(join(root, "pkg", "slow-holds.ran")), "the file over the hook threshold did not run");
    assert.deepEqual(JSON.parse(readFileSync(recordPath(root, session), "utf8")), { files: [], workspaces: [] });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a source file vite cannot transform blocks the stop and keeps the record until it is fixed", () => {
  const root = scratch(PASSING);
  const session = `stop-parse-${process.pid}`;
  try {
    put(root, "pkg/src/x.ts", "export const pinSpacing = (0.31;\n");
    put(root, "pkg/test/a.test.ts", marking("pin spacing holds", true, "expect(pinSpacing).toBe(0.31)"));
    record(root, session, { files: ["pkg/src/x.ts"], workspaces: ["pkg"] });
    const first = stop(root, session, false);
    assert.equal(first?.decision, "block", "a parse error is a failure, not a graph that could not be read");
    assert.match(first.reason, /FAIL pkg\/src\/x\.ts/);
    assert.match(first.reason, /pkg\/src\/x\.ts:1:\d+/, "vite's location survives the reduction");
    assert.deepEqual(JSON.parse(readFileSync(recordPath(root, session), "utf8")).files, ["pkg/src/x.ts"], "the record is kept");
    assert.equal(stop(root, session, true)?.decision, "block", "second round");
    const third = stop(root, session, true);
    assert.equal(third?.decision, undefined, "the same failure after two rounds is allowed with the report line");
    assert.match(third.hookSpecificOutput.additionalContext, /^acceptance still red after two rounds: .+; stop and report$/);
    put(root, "pkg/src/x.ts", X_SRC);
    assert.equal(stop(root, session, false), null, "fixed: the related test runs and passes");
    assert.ok(existsSync(join(root, "pkg", "pin-spacing-holds.ran")));
    assert.deepEqual(JSON.parse(readFileSync(recordPath(root, session), "utf8")), { files: [], workspaces: [] });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

const CLEARED = { files: [], workspaces: [] };
const BROKEN = "export const y = (2;\n";
const IMPORTS_Y = 'import { test, expect } from "vitest";\nimport { y } from "../src/y.ts";\ntest("y", () => expect(y).toBe(2));\n';

test("a broken file nobody touched does not block the stop, and the touched workspace runs whole", () => {
  const root = scratch(PASSING);
  const session = `stop-foreign-${process.pid}`;
  try {
    put(root, "package.json", JSON.stringify({ private: true, type: "module", workspaces: ["pkg", "other"] }));
    put(root, "pkg/src/x.ts", X_SRC);
    put(root, "pkg/test/a.test.ts", marking("pin spacing holds", true, "expect(pinSpacing).toBe(0.31)"));
    put(root, "other/src/y.ts", BROKEN);
    put(root, "other/test/b.test.ts", IMPORTS_Y);
    record(root, session, { files: ["pkg/src/x.ts"], workspaces: ["pkg"] });
    const reply = stop(root, session, false);
    assert.equal(reply?.decision, undefined, "another session's parse error in another package is not this stop's failure");
    assert.match(reply.systemMessage, /^module graph failed in .+ \(other\/src\/y\.ts is not a touched file\); ran the touched workspaces whole instead: pkg$/);
    assert.ok(existsSync(join(root, "pkg", "pin-spacing-holds.ran")), "the touched workspace ran");
    assert.deepEqual(JSON.parse(readFileSync(recordPath(root, session), "utf8")), CLEARED);
    assert.ok(!existsSync(blocksPath(root, session)), "no block was counted");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a broken file the touched workspace imports still blocks, through the workspace run", () => {
  const root = scratch(PASSING);
  const session = `stop-dep-${process.pid}`;
  try {
    put(root, "pkg/src/z.ts", BROKEN.replace("y", "z"));
    put(root, "pkg/src/x.ts", 'export { z } from "./z.ts";\nexport const pinSpacing = 0.31;\n');
    put(root, "pkg/test/a.test.ts", marking("pin spacing holds", true, "expect(pinSpacing).toBe(0.31)"));
    record(root, session, { files: ["pkg/src/x.ts"], workspaces: ["pkg"] });
    const reply = stop(root, session, false);
    assert.equal(reply?.decision, "block", "the untouched dependency breaks a test of the touched workspace");
    assert.match(reply.reason, /FAIL +pkg\/test\/a\.test\.ts/);
    assert.deepEqual(JSON.parse(readFileSync(recordPath(root, session), "utf8")).files, ["pkg/src/x.ts"], "the record is kept");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the workspace run leaves slow-tier and owner files to CI and names them", () => {
  const root = scratch(PASSING);
  const session = `stop-foreign-slow-${process.pid}`;
  try {
    put(root, "pkg/src/x.ts", X_SRC);
    put(root, "pkg/test/a.test.ts", marking("pin spacing holds", true, "expect(pinSpacing).toBe(0.31)"));
    put(root, "pkg/test/slow.test.ts", marking("slow holds", true, "expect(pinSpacing).toBe(0.4)"));
    put(root, "pkg/test/o.test.ts", marking("owner reads", true, "expect(pinSpacing).toBe(0.4)"));
    put(root, "other/src/y.ts", BROKEN);
    put(root, "other/test/b.test.ts", IMPORTS_Y);
    put(root, "tools/test-tiers.json", JSON.stringify(tiersFile({ "pkg/test/slow.test.ts": 40, "pkg/test/a.test.ts": 1 })));
    put(root, ".github/scripts/owner-files.mjs", 'console.log("--exclude=" + new URL("../../pkg/test/o.test.ts", import.meta.url).pathname);\n');
    record(root, session, { files: ["pkg/src/x.ts"], workspaces: ["pkg"] });
    const reply = stop(root, session, false);
    assert.equal(reply?.decision, undefined, "the red slow and owner tests did not run");
    const lines = reply.systemMessage.split("\n");
    assert.match(lines[0], /^module graph failed in .+ \(other\/src\/y\.ts is not a touched file\)/);
    assert.match(lines[1], /^1 of the test files in the touched workspaces measured above 15 s left to CI in .+; not run: pkg\/test\/slow\.test\.ts$/);
    assert.match(lines[2], /^owner files need the owner's archives in .+; not run: pkg\/test\/o\.test\.ts$/);
    assert.ok(existsSync(join(root, "pkg", "pin-spacing-holds.ran")), "the fast test ran");
    assert.ok(!existsSync(join(root, "pkg", "slow-holds.ran")), "the slow-tier test did not run");
    assert.ok(!existsSync(join(root, "pkg", "owner-reads.ran")), "the owner test did not run");
    assert.deepEqual(JSON.parse(readFileSync(recordPath(root, session), "utf8")), CLEARED);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a test the owner-files script lists is skipped and named, not run", () => {
  const root = scratch(PASSING);
  const session = `stop-owner-${process.pid}`;
  try {
    put(root, "pkg/src/x.ts", X_SRC);
    put(root, "pkg/test/o.test.ts", marking("owner reads", true, "expect(pinSpacing).toBe(0.4)"));
    put(root, ".github/scripts/owner-files.mjs", 'console.log("--exclude=" + new URL("../../pkg/test/o.test.ts", import.meta.url).pathname);\n');
    record(root, session, { files: ["pkg/src/x.ts"], workspaces: ["pkg"] });
    const reply = stop(root, session, false);
    assert.equal(reply?.decision, undefined);
    assert.match(reply.systemMessage, /^owner files need the owner's archives in .+; not run: pkg\/test\/o\.test\.ts$/);
    assert.ok(!existsSync(join(root, "pkg", "owner-reads.ran")), "the owner test did not run");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a record with no touched files runs nothing, and a workspace entry alone selects nothing", () => {
  const root = scratch(PASSING);
  const session = `stop-none-${process.pid}`;
  try {
    put(root, "pkg/src/x.ts", X_SRC);
    put(root, "pkg/test/a.test.ts", marking("pin spacing holds", true, "expect(pinSpacing).toBe(0.4)"));
    record(root, session, { files: [], workspaces: ["pkg"] });
    assert.equal(stop(root, session, false), null);
    record(root, session, { files: ["pkg/package.json", "pkg/vitest.config.ts"], workspaces: ["pkg"] });
    put(root, "pkg/vitest.config.ts", "export default {};\n");
    put(root, "pkg/package.json", "{}\n");
    assert.equal(stop(root, session, false), null, "a config or package.json would select every test, so neither is mapped");
    assert.ok(!existsSync(join(root, "pkg", "pin-spacing-holds.ran")), "no test ran");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("skipTier lists the vitest rows over the hook threshold, else the slow-tier rows, and ignores node rows", () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "hbf-slow-")));
  try {
    const rows = {
      "b/test/x.test.ts": { runner: "vitest", durationS: 20, tier: "slow" },
      "a/test/y.test.ts": { runner: "vitest", durationS: 15.1, tier: "slow" },
      "d/test/w.test.ts": { runner: "vitest", durationS: 15, tier: "slow" },
      "c/test/z.test.ts": { runner: "vitest", durationS: 1, tier: "fast" },
      "tools/test/n.test.mjs": { runner: "node", durationS: 99, tier: "slow" },
    };
    put(root, "tools/test-tiers.json", JSON.stringify({ measured: { thresholdS: 3, hookThresholdS: 15 }, files: rows }));
    assert.deepEqual(skipTier(root), { files: ["a/test/y.test.ts", "b/test/x.test.ts"], thresholdS: 15 });
    put(root, "tools/test-tiers.json", JSON.stringify({ measured: { thresholdS: 3 }, files: rows }));
    assert.deepEqual(skipTier(root), { files: ["a/test/y.test.ts", "b/test/x.test.ts", "d/test/w.test.ts"], thresholdS: 3 }, "no hook threshold: the slow tier");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("readGraph returns the array, vite's error line, or the raw output as the message", () => {
  assert.deepEqual(readGraph('warning\n["a/test/x.test.ts"]\nlate warning\n', 0), { files: ["a/test/x.test.ts"] });
  const err = { error: { id: "pkg/src/x.ts", message: "Transform failed" } };
  assert.deepEqual(readGraph(`${JSON.stringify(err)}\n`, 1), { error: err.error });
  assert.deepEqual(readGraph('["a"]\n', 1), { error: { id: null, message: '["a"]\n' } }, "an array with a failing exit is not a result");
  assert.deepEqual(readGraph("Error: boom\n", 1), { error: { id: null, message: "Error: boom\n" } });
  assert.match(readGraph("", null).error.message, /^the module graph read exited null with no output$/);
});

test("failureHash ignores timings and keeps the failing test name", () => {
  const a = "FAIL pkg/test/a.test.ts > pin spacing holds 12ms\nDuration 1.20s";
  const b = "FAIL pkg/test/a.test.ts > pin spacing holds 340ms\nDuration 9.81s";
  const c = "FAIL pkg/test/a.test.ts > hinge clears 12ms";
  assert.equal(failureHash(a), failureHash(b));
  assert.notEqual(failureHash(a), failureHash(c));
});
