// lineage/<subject>.json fragments gather into the committed root
// lineage.json (tools/gen/registries/lineage.mjs), and the generator refuses
// a row filed under the wrong subject or an id held by two fragments.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { gather, outputs } from "../gen/registries/lineage.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));

const row = (id) => ({ id, kind: "copy", source: `designs/${id}`, sha256: "0".repeat(64), fixes: [], dest: null });

function tempRoot(files) {
  const dir = mkdtempSync(join(tmpdir(), "hbf-lineage-"));
  mkdirSync(join(dir, "lineage"));
  for (const [name, rows] of Object.entries(files)) writeFileSync(join(dir, "lineage", name), JSON.stringify(rows, null, 2) + "\n");
  return dir;
}

test("gathered fragments equal the committed lineage.json byte for byte", () => {
  const [out] = outputs(root);
  assert.equal(out.path, "lineage.json");
  assert.equal(out.text, readFileSync(join(root, "lineage.json"), "utf8"));
});

test("one fragment per subject, each holding only its own subject", () => {
  const committed = JSON.parse(readFileSync(join(root, "lineage.json"), "utf8"));
  const subjects = new Set(committed.map((r) => r.id.slice(0, r.id.indexOf("/"))));
  const files = readdirSync(join(root, "lineage")).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5));
  assert.deepEqual(files.sort(), [...subjects].sort());
});

test("rows from several fragments come out sorted by id", () => {
  const dir = tempRoot({ "b.json": [row("b/z"), row("b/a")], "a.json": [row("a/x")] });
  try {
    assert.deepEqual(gather(dir).map((r) => r.id), ["a/x", "b/a", "b/z"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a row under the wrong subject is refused, naming the file it belongs in", () => {
  const dir = tempRoot({ "a.json": [row("a/x"), row("b/y")] });
  try {
    assert.throws(() => gather(dir), /lineage\/a\.json holds b\/y, whose subject is b\. move it to lineage\/b\.json/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a duplicate id is refused, naming both places", () => {
  const dir = tempRoot({ "a.json": [row("a/x"), row("a/x")] });
  try {
    assert.throws(() => gather(dir), /a\/x is in lineage\/a\.json and lineage\/a\.json/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a duplicate id across two files is refused", () => {
  // The subject rule refuses the second copy first; with that rule gone the
  // duplicate rule still refuses it. Either message names the second file.
  const dir = tempRoot({ "a.json": [row("a/x")], "a.v2.json": [row("a/x")] });
  try {
    assert.throws(() => gather(dir), /lineage\/a\.v2\.json/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a fragment that is not an array of rows is refused", () => {
  const dir = tempRoot({ "a.json": { id: "a/x" } });
  try {
    assert.throws(() => gather(dir), /lineage\/a\.json holds no array of rows/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
