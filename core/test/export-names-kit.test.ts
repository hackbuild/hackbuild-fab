// M07-T14 step 6: the export slug and quantity forms held to COTTER's own
// KIT.slug and KIT.qty, run from the original kit.js
// (originals/cotter/files/cotter-src/src/kit.js, lineage cotter.kit, sha256
// c77e2307), so a drifted port fails here. Reads the original through
// localOriginal, so it runs on the owner runner and never skips.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { localOriginal } from "../../tools/test-support/originals-root.js";
import { qtyOf, slugOf } from "../src/exporters/names.js";

const KIT_SOURCE = "fab-knowledge:originals/cotter/files/cotter-src/src/kit.js";
const kitBytes = readFileSync(localOriginal(KIT_SOURCE));
const lineage = JSON.parse(readFileSync(new URL("../../lineage.json", import.meta.url), "utf8")) as { source: string; sha256: string }[];
const box: { KIT?: { slug(s: string): string; qty(n: number): string } } = {};
runInNewContext(kitBytes.toString("utf8"), { globalThis: box, Float32Array, Map, Set, Math, String, Number, Array, Object, JSON });
const KIT = box.KIT!;

describe("the names are COTTER's", () => {
  it("kit.js is the file lineage records", () => {
    const sha = createHash("sha256").update(kitBytes).digest("hex");
    expect(lineage.some((r) => r.source === KIT_SOURCE && r.sha256 === sha)).toBe(true);
  });

  it.each(["SLUG ply sheet 1", "  rotor_gear_a  ", "OGEE16--R16P", "x", "a/b\\c", "Ünïcode part", ""])("slugOf(%j) equals KIT.slug", (s) => {
    expect(slugOf(s)).toBe(KIT.slug(s));
  });

  it.each([1, 2, 9, 10, 16, 124, 1000])("qtyOf(%i) equals KIT.qty", (n) => {
    expect(qtyOf(n)).toBe(KIT.qty(n));
  });
});
