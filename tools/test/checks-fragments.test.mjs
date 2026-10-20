// packages/checks/seed/checks/<ID>.json fragments gather into the committed
// checks.seed.json, and defs/*/CHK-*.ts gather into the committed
// defs/index.ts (tools/gen/registries/checks.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { gatherSeed, indexText, outputs } from "../gen/registries/checks.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const SEED = "packages/checks/seed";
const DEFS = "packages/checks/src/defs";

const row = (id) => ({ id, version: "1.0.0", title: `row ${id}` });

function seedRoot(head, rows) {
  const dir = mkdtempSync(join(tmpdir(), "hbf-checks-"));
  const at = join(dir, SEED, "checks");
  mkdirSync(at, { recursive: true });
  writeFileSync(join(at, "_head.json"), JSON.stringify(head, null, 2) + "\n");
  for (const [file, r] of Object.entries(rows)) writeFileSync(join(at, file), JSON.stringify(r, null, 2) + "\n");
  return dir;
}

function defsRoot(files) {
  const dir = mkdtempSync(join(tmpdir(), "hbf-checkdefs-"));
  for (const f of files) {
    mkdirSync(join(dir, DEFS, f.slice(0, f.indexOf("/"))), { recursive: true });
    writeFileSync(join(dir, DEFS, f), "export const check = {};\n");
  }
  return dir;
}

test("gathered fragments equal the committed seed and index byte for byte", () => {
  for (const out of outputs(root)) assert.equal(out.text, readFileSync(join(root, out.path), "utf8"), out.path);
});

test("the committed seed keeps the frozen order of _head.json, then sorted ids", () => {
  const head = JSON.parse(readFileSync(join(root, SEED, "checks", "_head.json"), "utf8"));
  const ids = JSON.parse(readFileSync(join(root, SEED, "checks.seed.json"), "utf8")).checks.map((c) => c.id);
  assert.deepEqual(ids.slice(0, head.order.length), head.order);
  const rest = ids.slice(head.order.length);
  assert.deepEqual(rest, [...rest].sort());
});

test("one fragment per seed row, each named for its id", () => {
  const ids = JSON.parse(readFileSync(join(root, SEED, "checks.seed.json"), "utf8")).checks.map((c) => c.id);
  const files = readdirSync(join(root, SEED, "checks")).filter((f) => f.endsWith(".json") && f !== "_head.json").map((f) => f.slice(0, -5));
  assert.deepEqual(files.sort(), [...ids].sort());
});

test("a new fragment lands after the frozen ids, sorted among the new ones", () => {
  const dir = seedRoot(
    { note: "n", candidates: [], order: ["CHK-B-02", "CHK-A-01"] },
    { "CHK-A-01.json": row("CHK-A-01"), "CHK-B-02.json": row("CHK-B-02"), "CHK-C-09.json": row("CHK-C-09"), "CHK-A-05.json": row("CHK-A-05") },
  );
  try {
    const seed = gatherSeed(dir);
    assert.deepEqual(Object.keys(seed), ["note", "checks", "candidates"]);
    assert.deepEqual(seed.checks.map((c) => c.id), ["CHK-B-02", "CHK-A-01", "CHK-A-05", "CHK-C-09"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a fragment named for another id is refused, naming the right file", () => {
  const dir = seedRoot({ order: [] }, { "CHK-A-01.json": row("CHK-A-02") });
  try {
    assert.throws(() => gatherSeed(dir), /checks\/CHK-A-01\.json holds CHK-A-02\. name the file .*checks\/CHK-A-02\.json/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a seed without _head.json is refused", () => {
  const dir = seedRoot({ order: [] }, {});
  rmSync(join(dir, SEED, "checks", "_head.json"));
  try {
    assert.throws(() => gatherSeed(dir), /no packages\/checks\/seed\/checks\/_head\.json/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// Independent walk of the committed defs tree, read without the generator.
function chkFiles(dir, rel = "") {
  return readdirSync(join(dir, rel), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? chkFiles(dir, join(rel, e.name)) : /^CHK-.*\.ts$/.test(e.name) ? [`./${join(rel, e.name).slice(0, -3)}.js`] : [],
  );
}

test("the committed index imports every CHK-*.ts module and nothing else", () => {
  const text = readFileSync(join(root, DEFS, "index.ts"), "utf8");
  const imports = [...text.matchAll(/^import (.*) from "(.*)";$/gm)];
  const checks = imports.filter((m) => m[1] !== "type { AnyCheckModule }");
  assert.equal(imports.length - checks.length, 1);
  assert.deepEqual(checks.map((m) => m[2]).sort(), chkFiles(join(root, DEFS)).sort());
  const names = checks.map((m) => /^\{ check as (\w+) \}$/.exec(m[1])?.[1]);
  const listed = /CHECK_MODULES[^=]*= \[([^\]]*)\]/.exec(text)[1].split(",").map((s) => s.trim()).filter(Boolean);
  assert.deepEqual(listed, names);
});

test("helper files beside the modules stay out of the index", () => {
  const dir = defsRoot(["net/CHK-NET-02.ts", "net/CHK-NET-01.ts", "net/validator.ts", "3mf/CHK-3MF-10.ts"]);
  try {
    const text = indexText(dir);
    assert.deepEqual([...text.matchAll(/from "(\.\/.*)";/g)].map((m) => m[1]), ["./3mf/CHK-3MF-10.js", "./net/CHK-NET-01.js", "./net/CHK-NET-02.js"]);
    assert.match(text, /^ {2}c3mf10, cnet01, cnet02,$/m);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a module outside its family directory is refused", () => {
  const dir = defsRoot(["net/CHK-BRD-01.ts"]);
  try {
    assert.throws(() => indexText(dir), /net\/CHK-BRD-01\.ts sits outside its family directory brd/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
