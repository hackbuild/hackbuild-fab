// M01-T11 step 2 (D-056): the determinism legs hash query JSON bytes. Each
// query id must equal the sha256 of the committed golden bytes under
// expected/, and fits ids must exist for exactly the references whose
// expected/fits.json fits.py wrote. Run `npx tsc -b` first: hashes.mjs
// loads core from its dist build.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { queryHashes, references } from "../determinism/hashes.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const fileSha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");

const out = {};
await queryHashes(out);

test("every queries.json golden has a query id equal to the sha256 of its committed bytes", () => {
  let n = 0;
  for (const ref of references()) {
    const decl = path.join(ROOT, ref, "queries.json");
    if (!existsSync(decl)) continue;
    for (const q of JSON.parse(readFileSync(decl, "utf8")).queries) {
      const id = `query:${ref}#${path.basename(q.golden)}`;
      assert.equal(out[id], fileSha(path.join(ROOT, ref, q.golden)), id);
      n += 1;
    }
  }
  assert.ok(n > 0, "no reference declares a query golden");
  assert.equal(Object.keys(out).filter((k) => k.startsWith("query:")).length, n);
});

test("fits ids exist for exactly the references with a fits.py golden", () => {
  const want = references().filter((r) => existsSync(path.join(ROOT, r, "expected", "fits.json"))).map((r) => `fits:${r}`);
  assert.ok(want.length > 0, "no reference holds expected/fits.json");
  assert.deepEqual(Object.keys(out).filter((k) => k.startsWith("fits:")).sort(), want.sort());
  for (const id of want) assert.match(out[id], /^[0-9a-f]{64}$/);
});
