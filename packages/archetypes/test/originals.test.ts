// M06-T09 originals rule, the part this package can hold: every proven
// archetype ports from an original pinned by sha256 (load.test.ts checks the
// bytes, lineage.json and SHA256SUMS), and the record of that original's
// numbers (test/legacy/<file>.json) names source hashes equal to the
// original files. The numbers and volumes are asserted in
// pip-buttons.parity.test.ts and the reference tests.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { archetypes } from "@hackbuild/archetypes";
import { originalPath } from "../../../tools/test-support/originals-root.js";

const ORIG = originalPath("");
/**
 * The legacy record of each original, by slug. A record names the hash of
 * every source file it ran under `sources[<key>][<basename>]`; PIP's record
 * keys its canonical revision as haft.
 */
const RECORDS: Readonly<Record<string, { readonly file: string; readonly key: string }>> = {
  pip: { file: "legacy/pip-fits.json", key: "haft" },
  blocks: { file: "legacy/blocks.json", key: "blocks" },
  boss: { file: "legacy/blocks.json", key: "boss" },
  "tang-r6": { file: "legacy/tang.json", key: "tang-r6" },
  thinpot: { file: "legacy/thinpot.json", key: "thinpot" },
  gib: { file: "legacy/gib.json", key: "gib" },
  toggle: { file: "legacy/toggle.json", key: "toggle" },
  coffer: { file: "legacy/coffer.json", key: "coffer" },
};

describe("originals", () => {
  test("each proven entry's first original has a record whose source hash equals the file", () => {
    for (const e of archetypes.entries) {
      if (e.def.status !== "proven") continue;
      const o = e.def.original?.[0];
      expect(o, e.id).toBeDefined();
      const rec = RECORDS[o!.slug];
      expect(rec, `${e.id}: no legacy record for ${o!.slug}`).toBeDefined();
      const r = JSON.parse(readFileSync(new URL(rec!.file, import.meta.url), "utf8")) as { sources: Record<string, Record<string, string>> };
      const name = o!.file.split("/").pop()!;
      const sha = createHash("sha256").update(readFileSync(`${ORIG}${o!.slug}/${o!.file}`)).digest("hex");
      expect(sha, e.id).toBe(o!.sha256);
      expect(r.sources[rec!.key]?.[name], `${e.id} ${name}`).toBe(sha);
    }
  });
});
