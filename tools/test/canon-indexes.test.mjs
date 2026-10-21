// The mechanism and archetype def indexes are generated from their def
// directories (tools/gen/registries/canon-indexes.mjs); archetypes
// defs/feeler/index.ts stays hand-written and is only spread.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { defEntries, outputs } from "../gen/registries/canon-indexes.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const MECH = "packages/mechanisms/src/defs";
const ARCH = "packages/archetypes/src/defs";
const PATHS = [`${MECH}/index.ts`, `${MECH}/originals/index.ts`, `${ARCH}/index.ts`, `${ARCH}/originals/index.ts`];

// A temp root holding a copy of both defs trees.
function copyRoot() {
  const dir = mkdtempSync(join(tmpdir(), "hbf-canon-"));
  for (const d of [MECH, ARCH]) cpSync(join(root, d), join(dir, d), { recursive: true });
  return dir;
}

const byPath = (r) => Object.fromEntries(outputs(r).map((o) => [o.path, o.text]));

test("the generated indexes equal the committed ones byte for byte", () => {
  const outs = outputs(root);
  assert.deepEqual(outs.map((o) => o.path), PATHS);
  for (const out of outs) assert.equal(out.text, readFileSync(join(root, out.path), "utf8"), out.path);
});

test("every def file is imported and listed once, in file name order", () => {
  for (const [dir, type] of [[MECH, "MechanismDef"], [`${MECH}/originals`, "MechanismDef"], [ARCH, "ArchetypeDef"], [`${ARCH}/originals`, "ArchetypeDef"]]) {
    const files = readdirSync(join(root, dir)).filter((f) => f.endsWith(".ts") && f !== "index.ts").sort();
    const entries = defEntries(root, dir, type);
    assert.deepEqual(entries.map((e) => e.from), files.map((f) => `./${f.slice(0, -3)}.js`), dir);
    const text = readFileSync(join(root, dir, "index.ts"), "utf8");
    for (const e of entries) assert.equal(text.split(`  ${e.name},\n`).length, 2, `${dir} lists ${e.name} once`);
  }
});

test("a new def file appears in its index and feeler/ is not touched", () => {
  const dir = copyRoot();
  try {
    const feelerBefore = readFileSync(join(dir, ARCH, "feeler", "index.ts"), "utf8");
    writeFileSync(join(dir, MECH, "aaa-temp-def.ts"), 'import type { MechanismDef } from "@hackbuild/spec";\nexport const aaaTempDef: MechanismDef = {} as MechanismDef;\n');
    writeFileSync(join(dir, ARCH, "originals", "zzz-temp-def.ts"), "export const origZzzTempDef = refusedArchetype({});\n");
    const out = byPath(dir);
    assert.ok(!(`${ARCH}/feeler/index.ts` in out), "feeler/index.ts is never an output");
    const mech = out[`${MECH}/index.ts`];
    assert.match(mech, /\nimport type \{ MechanismDef \} from "@hackbuild\/spec";\nimport \{ aaaTempDef \} from "\.\/aaa-temp-def\.js";\nimport \{ aileronDifferential \}/);
    assert.match(mech, /= \[\n {2}aaaTempDef,\n {2}aileronDifferential,\n/);
    const orig = out[`${ARCH}/originals/index.ts`];
    assert.match(orig, /import \{ origZzzTempDef \} from "\.\/zzz-temp-def\.js";\n\nexport const ORIGINAL_ARCHETYPE_DEFS/);
    assert.match(orig, / {2}origZzzTempDef,\n\];\n/);
    assert.match(out[`${ARCH}/index.ts`], / {2}\.\.\.FEELER_DEFS,\n {2}\/\/ The originals canon additions \(M06-T14, D-222\)\.\n {2}\.\.\.ORIGINAL_ARCHETYPE_DEFS,\n\];\n$/);
    assert.equal(readFileSync(join(dir, ARCH, "feeler", "index.ts"), "utf8"), feelerBefore);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a def file exporting no single def const is refused by name", () => {
  const dir = copyRoot();
  try {
    writeFileSync(join(dir, MECH, "two-exports.ts"), "export const a = 1;\nexport const b = 2;\n");
    assert.throws(() => outputs(dir), /packages\/mechanisms\/src\/defs\/two-exports\.ts: expected one exported const of type MechanismDef/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a root without the packages yields no outputs", () => {
  const dir = mkdtempSync(join(tmpdir(), "hbf-canon-empty-"));
  try {
    assert.deepEqual(outputs(dir), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
