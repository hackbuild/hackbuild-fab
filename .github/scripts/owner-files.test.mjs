// owner-files.mjs derives the owner-file list from source (CI-03): a test
// that reads the originals or the benches is listed, one that only names
// them in a comment or as an identity string is not.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { fileSignal, isGuarded, ownerFiles, ownerReads, ownerSignal, planLine, planNodeTests, TEST_FILE } from "./owner-files.mjs";

const root = join(import.meta.dirname, "..", "..");

test("a reader imported from originals-root marks the file", () => {
  assert.match(ownerSignal('import { originalPath } from "../../../tools/test-support/originals-root.js";'), /originalPath/);
  assert.match(ownerSignal('import { ORIGINALS_OF_RECORD, localOriginal } from "../../tools/test-support/originals-root.js";'), /localOriginal/);
  assert.match(ownerSignal('import { localSource } from "../../../tools/test-support/originals-root.js";'), /localSource/);
  assert.match(ownerSignal('import { benchPath } from "../../../tools/test-support/benches-root.js";'), /benches-root/);
});

test("a vitest file importing plan-root is an owner file, left out of the hosted runs", () => {
  for (const spec of ["../../../tools/test-support/plan-root.js", "../../tools/test-support/plan-root", "../test-support/plan-root.mjs"]) {
    const why = ownerSignal(`import { planCard } from "${spec}";`);
    assert.equal(why, "imports plan-root", spec);
    assert.equal(isGuarded(why), false, spec);
  }
  assert.equal(ownerSignal("// cards come through tools/test-support/plan-root (HBF_PLAN)"), null);
});

test("the report names the plan-drift node tests and says not run when the plan archive is absent", () => {
  const files = planNodeTests(root);
  for (const f of ["tools/test/plan-drift.test.mjs", "tools/test/plan-drift-audit3.test.mjs", "tools/test/ci-exit-rows.test.mjs"]) assert.ok(files.includes(f), f);
  assert.ok(!files.includes("tools/test/plan-root.test.mjs"), "the module's own test reads a temp plan");
  assert.equal(planLine(files, false), `not run in ci: the plan card tests of ${files.length} node test files in tools/test skip (plan archive not on this runner: not run; set HBF_PLAN)`);
  assert.match(planLine(files, true), /^plan archive here: /);
});

test("the identity constant alone, or a path in a comment, does not mark the file", () => {
  assert.equal(ownerSignal('import { ORIGINALS_OF_RECORD } from "../../../tools/test-support/originals-root.js";'), null);
  assert.equal(ownerSignal("// Source: /x/fab-work-directory/benches/collar/collar.html\nconst a = 1;"), null);
  assert.equal(ownerSignal("/* harvest of fab-work-directory/benches/sprue */\nconst a = 1;"), null);
  assert.match(ownerSignal('const BENCH = "/x/fab-work-directory/benches";'), /fab-work-directory/);
});

test("a lineage row source passed to a read marks the file, directly or through a name or a local reader", () => {
  const head = 'const rows = JSON.parse(readFileSync(ROOT + "lineage.json", "utf8"));\n';
  assert.match(ownerSignal(head + "const buf = readFileSync(row.source);\n"), /row\.source\) unguarded/);
  assert.match(ownerSignal(head + 'const sourceOf = (id) => rows.find((r) => r.id === id)?.source ?? "";\nconst src = sourceOf("a");\nreadFileSync(src, "utf8");\n'), /\(src\) unguarded/);
  assert.match(ownerSignal(head + 'const original = (id) => {\n  const row = rows.find((r) => r.id === id);\n  return row.source;\n};\nconst line = (path, n) => readFileSync(path, "utf8").split("\\n")[n - 1];\nline(original("a"), 3);\n'), /\(original\("a"\)\) unguarded/);
  assert.match(ownerSignal('const P = "/Users/someone/fab-knowledge/originals/x.txt";\nreadFileSync(P);\n'), /\(P\) unguarded/);
});

test("an owner read behind existsSync is guarded; a relocated or identity-only source is no read", () => {
  const head = 'const rows = JSON.parse(readFileSync(ROOT + "lineage.json", "utf8"));\n';
  const guarded = ownerSignal(head + 'const src = rows[0].source;\ntest.skipIf(!existsSync(src))("a", () => {\n  readFileSync(src, "utf8");\n});\n');
  assert.ok(isGuarded(guarded), guarded);
  const sameTest = ownerSignal(head + 'test("b", (ctx) => {\n  if (!existsSync(rows[0].source)) return ctx.skip();\n  const buf = readFileSync(rows[0].source);\n});\n');
  assert.ok(isGuarded(sameTest), sameTest);
  assert.equal(ownerReads(head + "readFileSync(localOriginal(row.source));\n").length, 0);
  assert.equal(ownerReads(head + "readFileSync(localSource(row.source));\n").length, 0);
  assert.equal(ownerReads(head + 'const src = localSource(rows[0].source);\nreadFileSync(src, "utf8");\n').length, 0);
  assert.equal(ownerReads(head + 'expect(rows[0].source.endsWith("x")).toBe(true);\nexpect(fx.meta.source).toBe("/Users/someone/x/");\n').length, 0);
  assert.equal(ownerReads("readFileSync(row.source);\n").length, 0, "a .source without lineage.json is some other source");
  assert.equal(ownerReads('readFileSync(new URL("../src/a.ts", import.meta.url));\n').length, 0);
});

test("excludes names every unguarded owner file and no guarded one", () => {
  const files = ownerFiles(root);
  const ex = new Set(execFileSync(process.execPath, [join(root, ".github/scripts/owner-files.mjs"), "excludes"], { encoding: "utf8" }).split("\n").filter(Boolean));
  for (const { file, why } of files) assert.equal(ex.has(`--exclude=${join(root, file)}`), !isGuarded(why), `${file}: ${why}`);
  assert.equal(ex.size, files.filter((f) => !isGuarded(f.why)).length);
});

test("no hosted test reads an owner path unguarded: every unguarded reader in the tree is excluded", () => {
  const tracked = execFileSync("git", ["ls-files", "--", "*.test.ts"], { cwd: root, encoding: "utf8" }).split("\n").filter((f) => TEST_FILE.test(f));
  const listed = new Map(ownerFiles(root).map((r) => [r.file, r.why]));
  for (const f of tracked) {
    const abs = join(root, f);
    if (!existsSync(abs)) continue;
    const reads = fileSignal(abs);
    if (reads !== null) assert.ok(listed.has(f), `${f} reads an owner path and is not listed`);
  }
  assert.ok(!listed.has("designs/collar/test/nfc-pause.test.ts"), "nfc-pause reads its committed card copies");
});

test("a fixture one relative import down carries its signal to the test", () => {
  const dir = mkdtempSync(join(tmpdir(), "owner-files-"));
  try {
    mkdirSync(join(dir, "test", "fixtures"), { recursive: true });
    writeFileSync(join(dir, "test", "fixtures", "legacy.ts"), 'export const P = "/x/fab-work-directory/benches/a.html";\n');
    writeFileSync(join(dir, "test", "a.test.ts"), 'import { P } from "./fixtures/legacy.js";\n');
    writeFileSync(join(dir, "test", "b.test.ts"), 'import { describe } from "vitest";\n');
    assert.match(fileSignal(join(dir, "test", "a.test.ts")), /via fixtures\/legacy\.ts/);
    assert.equal(fileSignal(join(dir, "test", "b.test.ts")), null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the include pattern follows vitest.config.ts roots", () => {
  for (const f of ["core/test/a.test.ts", "packages/mesh/test/x/b.test.ts", "designs/collar/test/c.test.ts", "tools/parity/d.test.ts", "reference/keys/flex-pair/test/e.test.ts"]) assert.ok(TEST_FILE.test(f), f);
  for (const f of ["packages/mesh/src/a.test.ts", "core/test/a.ts", "node_modules/x/test/a.test.ts"]) assert.ok(!TEST_FILE.test(f), f);
});

test("on this tree every listed file exists and the known originals readers are listed", () => {
  const files = ownerFiles(root).map((r) => r.file);
  assert.ok(files.length > 0, "owner files found");
  for (const f of files) assert.ok(existsSync(join(root, f)), f);
  for (const f of ["core/test/canon-commands.test.ts", "packages/archetypes/test/originals.test.ts", "packages/board/test/kicad.test.ts"]) {
    if (existsSync(join(root, f))) assert.ok(files.includes(f), `${f} is listed`);
  }
});

test("a lineage source mapped by sourcePath stays an owner read, guarded only by existsSync", () => {
  const head = 'const rows = JSON.parse(readFileSync(ROOT + "lineage.json", "utf8"));\n';
  const open = ownerSignal(head + 'const sourceOf = (id) => { const s = rows.find((r) => r.id === id)?.source; return s === undefined ? "" : sourcePath(s); };\nconst src = sourceOf("a");\nreadFileSync(src, "utf8");\n');
  assert.match(open, /\(src\) unguarded/);
  const guarded = ownerSignal(head + 'const sourceOf = (id) => { const s = rows.find((r) => r.id === id)?.source; return s === undefined ? "" : sourcePath(s); };\ntest("a", (t) => {\n  const src = sourceOf("a");\n  if (!existsSync(src)) return t.skip();\n  readFileSync(src, "utf8");\n});\n');
  assert.ok(isGuarded(guarded), guarded);
});

test("an archive-prefix path through sourcePath is an owner read, as a name or a template on one", () => {
  const imp = 'import { sourcePath } from "../../../tools/test-support/originals-root.js";\n';
  const open = ownerSignal(imp + 'const BENCH = sourcePath("fab-work-directory:benches");\nreadFileSync(`${BENCH}/a/b.csv`, "utf8");\n');
  assert.match(open, /unguarded/);
  assert.equal(isGuarded(open), false);
  const guarded = ownerSignal(imp + 'const BENCH = sourcePath("fab-work-directory:benches");\nconst CPL = `${BENCH}/a/b.csv`;\ntest.skipIf(!existsSync(CPL))("a", () => {\n  readFileSync(CPL, "utf8");\n});\n');
  assert.ok(isGuarded(guarded), guarded);
  assert.equal(ownerSignal(imp + 'const id = "fab-work-directory:benches/a.csv";\nexpect(row.source).toBe(id);\n'), null);
});

test("an owner path a fixture exports and the test reads is the test's own read", () => {
  const dir = mkdtempSync(join(tmpdir(), "owner-files-"));
  try {
    mkdirSync(join(dir, "test", "fixtures"), { recursive: true });
    writeFileSync(join(dir, "test", "fixtures", "src.ts"), 'import { sourcePath } from "../../../tools/test-support/originals-root.js";\nexport const SRC = sourcePath("fab-knowledge:originals/a/files/a.html");\n');
    writeFileSync(join(dir, "test", "a.test.ts"), 'import { SRC } from "./fixtures/src.js";\ntest("a", (ctx) => {\n  if (!existsSync(SRC)) return ctx.skip();\n  readFileSync(SRC, "utf8");\n});\n');
    writeFileSync(join(dir, "test", "b.test.ts"), 'import { SRC } from "./fixtures/src.js";\nreadFileSync(SRC, "utf8");\n');
    const a = fileSignal(join(dir, "test", "a.test.ts"));
    assert.match(a, /\(SRC\) behind existsSync/);
    assert.match(fileSignal(join(dir, "test", "b.test.ts")), /\(SRC\) unguarded/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
