// packages/profile/data/constants/<prefix>.json fragments gather into the
// committed packages/profile/data/constants.json
// (tools/gen/registries/constants.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { gatherConstants, outputs } from "../gen/registries/constants.mjs";
import { publishText } from "../publish-paths.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const DATA = "packages/profile/data";
const FRAGS = `${DATA}/constants`;

const row = (id) => ({ id, value: 1, unit: "mm", provenance: { tier: "inferred", method: "derived", date: "2026-10-20", source: "test" } });

function fragRoot(head, files) {
  const dir = mkdtempSync(join(tmpdir(), "hbf-constants-"));
  const at = join(dir, FRAGS);
  mkdirSync(at, { recursive: true });
  writeFileSync(join(at, "_head.json"), JSON.stringify(head, null, 2) + "\n");
  for (const [file, rows] of Object.entries(files)) writeFileSync(join(at, file), JSON.stringify(rows, null, 2) + "\n");
  return dir;
}

function withRoot(head, files, fn) {
  const dir = fragRoot(head, files);
  try {
    fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("gathered fragments equal the committed constants.json byte for byte", () => {
  for (const out of outputs(root)) assert.equal(out.text, readFileSync(join(root, out.path), "utf8"), out.path);
});

// The constants.json the split was cut from, read from git history so the
// comparison stands on a source the generator never wrote. Its only byte
// difference is number form (1.0 written 1), so the parsed objects match,
// row order included. Source paths are compared in publish form, since the
// fragments later named the owner archive by prefix (R1-fix-15). A shallow
// checkout without that commit skips.
const SPLIT_FROM = "cae984a";

function beforeText() {
  try {
    return execFileSync("git", ["show", `${SPLIT_FROM}:${DATA}/constants.json`], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return null;
  }
}

test("gathered constants parse equal to constants.json as it stood before the split, rows added since after it", (t) => {
  const text = beforeText();
  if (text === null) return t.skip(`commit ${SPLIT_FROM} not in this checkout (shallow clone)`);
  const was = JSON.parse(publishText(text));
  assert.equal(was.constants.length, 234);
  const got = gatherConstants(root);
  // Rows added after the split land after the frozen ones and never reuse a frozen id.
  const frozen = new Set(was.constants.map((c) => c.id));
  assert.deepEqual({ ...got, constants: got.constants.slice(0, was.constants.length) }, was);
  for (const c of got.constants.slice(was.constants.length)) assert.equal(frozen.has(c.id), false, c.id);
});

test("one fragment per id prefix, each holding exactly the rows of that prefix", () => {
  const ids = JSON.parse(readFileSync(join(root, DATA, "constants.json"), "utf8")).constants.map((c) => c.id);
  const prefixes = [...new Set(ids.map((id) => id.slice(0, id.indexOf("."))))].sort();
  const files = readdirSync(join(root, FRAGS)).filter((f) => f.endsWith(".json") && f !== "_head.json").map((f) => f.slice(0, -5));
  assert.deepEqual(files.sort(), prefixes);
  for (const p of prefixes) {
    const held = JSON.parse(readFileSync(join(root, FRAGS, `${p}.json`), "utf8")).map((r) => r.id);
    assert.deepEqual(held, ids.filter((id) => id.startsWith(`${p}.`)), p);
  }
});

test("a new row lands after the frozen ids, sorted among the new ones", () => {
  withRoot(
    { note: "n", moved: [{ id: "old.x", to: "catalog" }], order: ["b.two", "a.one"] },
    { "a.json": [row("a.one"), row("a.zed"), row("a.mid")], "b.json": [row("b.two")], "c.json": [row("c.new")] },
    (dir) => {
      const got = gatherConstants(dir);
      assert.deepEqual(Object.keys(got), ["note", "constants", "moved"]);
      assert.deepEqual(got.constants.map((c) => c.id), ["b.two", "a.one", "a.mid", "a.zed", "c.new"]);
      assert.deepEqual(got.moved, [{ id: "old.x", to: "catalog" }]);
    },
  );
});

test("a row filed under another prefix is refused, naming the right file", () => {
  withRoot({ order: [] }, { "a.json": [row("b.one")] }, (dir) => {
    assert.throws(() => gatherConstants(dir), /constants\/a\.json holds b\.one\. move it to .*constants\/b\.json/);
  });
});

test("an id without a prefix is refused", () => {
  withRoot({ order: [] }, { "a.json": [row("loose")] }, (dir) => {
    assert.throws(() => gatherConstants(dir), /constants\/a\.json holds id "loose" with no prefix/);
  });
});

test("an id listed twice is refused", () => {
  withRoot({ order: [] }, { "a.json": [row("a.one"), row("a.one")] }, (dir) => {
    assert.throws(() => gatherConstants(dir), /constants\/a\.json lists a\.one twice/);
  });
});

test("a fragment that is not an array of rows is refused", () => {
  withRoot({ order: [] }, { "a.json": row("a.one") }, (dir) => {
    assert.throws(() => gatherConstants(dir), /constants\/a\.json holds no array of constant rows/);
  });
});

test("a split without _head.json, or with an id twice in its order, is refused", () => {
  withRoot({ order: [] }, {}, (dir) => {
    rmSync(join(dir, FRAGS, "_head.json"));
    assert.throws(() => gatherConstants(dir), /no packages\/profile\/data\/constants\/_head\.json/);
  });
  withRoot({ order: ["a.one", "a.one"] }, { "a.json": [row("a.one")] }, (dir) => {
    assert.throws(() => gatherConstants(dir), /_head\.json lists an id twice in order/);
  });
});
