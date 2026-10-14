// owner-files.mjs derives the owner-file list from source (CI-03): a test
// that reads the originals or the benches is listed, one that only names
// them in a comment or as an identity string is not.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileSignal, ownerFiles, ownerSignal, TEST_FILE } from "./owner-files.mjs";

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
