// owner-files.mjs derives the owner-file list from source (CI-03): a test
// that reads the originals or the benches is listed, one that only names
// them in a comment or as an identity string is not.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { fileSignal, isGuarded, ownerFiles, ownerReads, ownerSignal, TEST_FILE } from "./owner-files.mjs";

const root = join(import.meta.dirname, "..", "..");

test("a reader imported from originals-root marks the file", () => {
  assert.match(ownerSignal('import { originalPath } from "../../../tools/test-support/originals-root.js";'), /originalPath/);
  assert.match(ownerSignal('import { ORIGINALS_OF_RECORD, localOriginal } from "../../tools/test-support/originals-root.js";'), /localOriginal/);
  assert.match(ownerSignal('import { benchPath } from "../../../tools/test-support/benches-root.js";'), /benches-root/);
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
