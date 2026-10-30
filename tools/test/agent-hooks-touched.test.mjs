// tools/agent-hooks/touched.mjs and touched-typecheck.mjs: which type check
// an edit triggers, and one spawn of the hook on a scratch project. The
// expected projects are read from the root tsconfig.json references and
// tsconfig.tests.json and tools/tsconfig.json includes, never from the
// hook's own tables.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { projectFor, recordTouched } from "../agent-hooks/touched.mjs";

const repo = execFileSync("git", ["-C", import.meta.dirname, "rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const hook = join(import.meta.dirname, "..", "agent-hooks", "touched-typecheck.mjs");
const refs = JSON.parse(readFileSync(join(repo, "tsconfig.json"), "utf8")).references.map((r) => r.path);

test("the root references and test includes hold the dirs these cases name", () => {
  for (const dir of ["packages/geom", "reference/keys/flex-pair", "designs/collar"]) assert.ok(refs.includes(dir), dir);
  const tests = JSON.parse(readFileSync(join(repo, "tsconfig.tests.json"), "utf8")).include;
  assert.ok(tests.includes("packages/*/test/**/*.ts"));
  const tools = JSON.parse(readFileSync(join(repo, "tools", "tsconfig.json"), "utf8")).include;
  assert.ok(tools.includes("test/**/*.ts"));
});

const CASES = [
  ["packages/geom/src/x.ts", { kind: "build", dir: "packages/geom" }],
  ["packages/geom/test/x.test.ts", { kind: "tests" }],
  ["reference/keys/flex-pair/build.ts", { kind: "build", dir: "reference/keys/flex-pair" }],
  ["designs/collar/src/x.ts", { kind: "build", dir: "designs/collar" }],
  ["packages/bench/src/bench/Rail.vue", { kind: "vue" }],
  ["tools/test/x.ts", { kind: "tools" }],
  ["README.md", null],
];

for (const [path, want] of CASES) {
  test(`projectFor ${path}`, () => {
    assert.deepEqual(projectFor(repo, join(repo, path)), want);
    assert.deepEqual(projectFor(repo, path), want, "relative path");
  });
}

/** A scratch git work tree with a root tsconfig referencing one project. */
function scratch(refDir) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "hbf-touched-")));
  execFileSync("git", ["init", "-q", root]);
  writeFileSync(join(root, "tsconfig.json"), JSON.stringify({ files: [], references: [{ path: refDir }] }));
  writeFileSync(join(root, "package.json"), JSON.stringify({ private: true, workspaces: [refDir.split("/")[0] === "packages" ? "packages/*" : refDir] }));
  return root;
}

test("projectFor in a worktree copy under a temp dir answers relative to that copy", () => {
  const root = scratch("packages/geom");
  try {
    assert.deepEqual(projectFor(root, join(root, "packages/geom/src/x.ts")), { kind: "build", dir: "packages/geom" });
    assert.equal(projectFor(root, join(root, "packages/mesh/src/x.ts")), null, "mesh is not referenced in the copy");
    assert.equal(projectFor(root, join(repo, "packages/geom/src/x.ts")), null, "a file outside the copy");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("recordTouched keeps each file and workspace once", () => {
  const root = scratch("packages/geom");
  try {
    recordTouched(root, "s/1", join(root, "packages/geom/src/a.ts"));
    recordTouched(root, "s/1", join(root, "packages/geom/src/a.ts"));
    const rec = recordTouched(root, "s/1", join(root, "README.md"));
    assert.deepEqual(rec, { files: ["packages/geom/src/a.ts", "README.md"], workspaces: ["packages/geom"] });
    assert.deepEqual(JSON.parse(readFileSync(join(root, ".hbf/agent-hooks/s_1.json"), "utf8")), rec);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the hook on a type error in a scratch project exits 0 and names TS2322, clean prints nothing", () => {
  const root = scratch("pkg");
  const session = `touched-test-${process.pid}`;
  try {
    const tsconfig = { compilerOptions: { composite: true, strict: true, outDir: "dist", rootDir: "src", types: [], target: "ES2022", module: "NodeNext" }, include: ["src"] };
    const file = join(root, "pkg", "src", "bad.ts");
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(join(root, "pkg", "tsconfig.json"), JSON.stringify(tsconfig));
    writeFileSync(file, 'export const n: number = "x";\n');
    const run = () =>
      spawnSync(process.execPath, [hook], {
        // The session started in the main checkout: the hook must ignore both.
        cwd: repo,
        env: { ...process.env, CLAUDE_PROJECT_DIR: repo },
        input: JSON.stringify({ session_id: session, tool_name: "Edit", cwd: repo, tool_input: { file_path: file } }),
        encoding: "utf8",
      });
    const bad = run();
    assert.equal(bad.status, 0, bad.stderr);
    const reply = JSON.parse(bad.stdout);
    assert.equal(reply.hookSpecificOutput.hookEventName, "PostToolUse");
    assert.match(reply.hookSpecificOutput.additionalContext, /error TS2322/);
    assert.match(reply.hookSpecificOutput.additionalContext, /\(1 errors in pkg\)$/);
    const rec = JSON.parse(readFileSync(join(root, ".hbf", "agent-hooks", `${session}.json`), "utf8"));
    assert.deepEqual(rec, { files: ["pkg/src/bad.ts"], workspaces: ["pkg"] });
    assert.ok(!existsSync(join(repo, ".hbf", "agent-hooks", `${session}.json`)), "recorded in the session start root");

    writeFileSync(file, "export const n: number = 1;\n");
    const clean = run();
    assert.equal(clean.status, 0, clean.stderr);
    assert.equal(clean.stdout, "");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
