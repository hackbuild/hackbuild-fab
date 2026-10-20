// tools/agent-hooks/quiet-output.mjs: the PostToolUse output rewrite.
// Logs come from tools/agent-hooks/fixtures/logs.mjs; the expected lines
// are read from those builders, never from the hook's own tables.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { reduce, handle } from "../agent-hooks/quiet-output.mjs";
import { FAILING, vitestLog, passingLog, tscLog, unknownLog } from "../agent-hooks/fixtures/logs.mjs";

const script = join(import.meta.dirname, "..", "agent-hooks", "quiet-output.mjs");
const count = (s) => (s.endsWith("\n") ? s.slice(0, -1) : s).split("\n").length;
const lastLines = (s, n) => (s.endsWith("\n") ? s.slice(0, -1) : s).split("\n").slice(-n);

test("the builders give the line counts the brief names", () => {
  assert.equal(count(vitestLog()), 800);
  assert.equal(count(passingLog()), 90);
  assert.equal(count(unknownLog()), 200);
  assert.equal(tscLog().match(/error TS\d+/g).length, 40);
});

test("an 800 line vitest log with 2 failures keeps both names and the summary in at most 150 lines", () => {
  const out = reduce(vitestLog());
  assert.ok(out !== null);
  assert.ok(count(out) <= 150, `${count(out)} lines`);
  for (const f of FAILING) {
    assert.ok(out.includes(` FAIL  ${f.file} > ${f.name}`), `FAIL line for ${f.name}`);
    assert.ok(out.includes(`AssertionError: expected ${f.got} to be ${f.want}`), `assertion for ${f.name}`);
  }
  assert.ok(out.includes(" Test Files  2 failed | 118 passed (120)"));
  assert.ok(out.includes("      Tests  2 failed | 640 passed (642)"));
});

test("a tsc log with 40 errors stays within 150 lines, keeps the first error and the Found line", () => {
  const log = tscLog();
  const out = reduce(log);
  assert.ok(count(out) <= 150, `${count(out)} lines`);
  assert.ok(out.includes(log.split("\n")[0]));
  assert.ok(out.endsWith("Found 40 errors in 8 files."));
  assert.match(out, /\[\d+ lines omitted\]/);
});

test("a 90 line passing log is reduced to its summary", () => {
  const log = passingLog();
  const out = reduce(log).split("\n");
  assert.deepEqual(out.slice(1), lastLines(log, 15));
  assert.equal(out[0], "[75 lines omitted]");
  assert.ok(out.includes(" Test Files  30 passed (30)"));
});

test("a log with no known marker returns null", () => {
  assert.equal(reduce(unknownLog()), null);
});

// One line per marker, buried mid log in noise no marker matches: each must
// survive on its own, so dropping any one marker fails here.
const MARKER_LINES = [
  " FAIL  packages/a/test/b.test.ts > suite > keeps radius",
  `   ${String.fromCodePoint(0x2717)} suite > keeps radius`,
  `   ${String.fromCodePoint(0x00d7)} suite > keeps radius`,
  "not ok 3 - keeps radius",
  "packages/a/src/b.ts(1,1): error TS2322: bad type",
  "AssertionError [ERR_ASSERTION]: values differ",
  "TypeError: x is undefined",
  "Expected: 1",
  "Received: 2",
  "3 failed",
  "E   assert 1 == 2",
];

test("every failure marker keeps its line", () => {
  const noise = (n, tag) => Array.from({ length: n }, (_, i) => `noise ${tag} ${i}`);
  for (const line of MARKER_LINES) {
    const out = reduce([...noise(60, "a"), line, ...noise(60, "b")].join("\n"));
    assert.ok(out !== null && out.split("\n").includes(line), `kept: ${line}`);
    assert.ok(out.includes("noise b 5") && !out.includes("noise b 6"), `six lines of context after: ${line}`);
  }
});

test("every summary marker alone keeps the tail", () => {
  for (const line of ["Test Files  3 passed (3)", "      Tests  9 passed (9)", "# pass 12", "# fail 0", "12 passed in 0.40s", "Found 0 errors. Watching for file changes."]) {
    const out = reduce([...Array.from({ length: 100 }, (_, i) => `noise ${i}`), line].join("\n"));
    assert.ok(out !== null && out.endsWith(line), line);
  }
});

const repo = () => {
  const dir = mkdtempSync(join(tmpdir(), "hbf-quiet-"));
  execFileSync("git", ["init", "-q", dir]);
  return dir;
};
const input = (cwd, stdout, extra = {}) => ({
  session_id: "s1",
  cwd,
  hook_event_name: "PostToolUse",
  tool_name: "Bash",
  tool_input: { command: "npx vitest run packages/geom" },
  tool_response: { stdout, stderr: "", interrupted: false, isImage: false },
  ...extra,
});
const run = (obj) => spawnSync(process.execPath, [script], { input: JSON.stringify(obj), encoding: "utf8" });

test("the hook rewrites a 500 line vitest stdout and writes the full log", (t) => {
  const dir = repo();
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const log = vitestLog(500);
  const r = run(input(dir, log));
  assert.equal(r.status, 0);
  const reply = JSON.parse(r.stdout);
  assert.deepEqual(Object.keys(reply), ["hookSpecificOutput"]);
  assert.deepEqual(Object.keys(reply.hookSpecificOutput).sort(), ["hookEventName", "updatedToolOutput"]);
  assert.equal(reply.hookSpecificOutput.hookEventName, "PostToolUse");
  const o = reply.hookSpecificOutput.updatedToolOutput;
  assert.deepEqual({ stderr: o.stderr, interrupted: o.interrupted, isImage: o.isImage }, { stderr: "", interrupted: false, isImage: false });
  assert.ok(count(o.stdout) <= 151, `${count(o.stdout)} lines`);
  const logs = join(execFileSync("git", ["-C", dir, "rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim(), ".hbf", "agent-hooks", "logs");
  const path = join(logs, "s1-1.log");
  assert.equal(lastLines(o.stdout, 1)[0], `full log: ${path} (500 lines)`);
  assert.equal(readFileSync(path, "utf8"), log);
  run(input(dir, log));
  assert.deepEqual(readdirSync(logs).sort(), ["s1-1.log", "s1-2.log"]);
});

test("the hook joins stderr into the log and keeps interrupted", (t) => {
  const dir = repo();
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const reply = handle(input(dir, passingLog(), { tool_response: { stdout: passingLog(), stderr: "warn: slow test\n", interrupted: true, isImage: false } }));
  const o = reply.hookSpecificOutput.updatedToolOutput;
  assert.equal(o.interrupted, true);
  assert.match(o.stdout, /warn: slow test\nfull log: .* \(91 lines\)$/);
});

test("the hook prints nothing when it should not act", (t) => {
  const dir = repo();
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const cases = [
    input(dir, vitestLog(), { tool_name: "Read" }),
    input(dir, vitestLog(), { tool_input: { command: "ls -la" } }),
    input(dir, passingLog(80)),
    input(dir, unknownLog()),
  ];
  for (const c of cases) {
    const r = run(c);
    assert.equal(r.status, 0);
    assert.equal(r.stdout, "");
  }
  assert.equal(run(input(dir, passingLog(81))).stdout === "", false);
  const bad = spawnSync(process.execPath, [script], { input: "not json", encoding: "utf8" });
  assert.deepEqual([bad.status, bad.stdout], [0, ""]);
});

test("the command filter acts on the brief's tools and no other", (t) => {
  const dir = repo();
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const acts = (command) => handle(input(dir, vitestLog(), { tool_input: { command } })) !== null;
  for (const command of ["npx vitest run packages/ui", "npx tsc -b", "node --test tools/test/x.test.mjs", "npx playwright test", "uv run --project tools/py pytest", "npm test", "npm run check", "npm run typecheck"]) {
    assert.equal(acts(command), true, command);
  }
  for (const command of ["git log", "cat README.md", "npm run build", "node tools/counts.mjs"]) assert.equal(acts(command), false, command);
});
