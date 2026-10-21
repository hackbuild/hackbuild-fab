// The OGEE16 originals the motion tests take as their expected values,
// read from the originals of record (fab-knowledge:originals/ogee16/files/src/source):
// every input the kin record packages/motion/records/ogee16-kin.json names,
// kin.py and params.scad as the M02-T07 oracle golden names them, and the
// viewer lines that type the latch release margin latch-margin.test.ts
// holds the constant to. Reads through localOriginal, so it runs on the
// owner runner and never skips.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { LATCH_RELEASE_MARGIN_MM } from "@hackbuild/motion";
import { localOriginal } from "../../../tools/test-support/originals-root.js";

const SOURCE = "fab-knowledge:originals/ogee16/files/src/source/";
const original = (f: string): Buffer => readFileSync(localOriginal(`${SOURCE}${f}`));
const sha = (b: Uint8Array): string => createHash("sha256").update(b).digest("hex");
const read = (p: string): string => readFileSync(new URL(`../../../${p}`, import.meta.url), "utf8");
const record = JSON.parse(read("packages/motion/records/ogee16-kin.json")) as { inputs: Record<string, string> };
const oracle = JSON.parse(read("packages/sim/test/goldens/ogee-sweep-oracle.json")) as { kinSha256: string; paramsSha256: string };

describe("the kin record and the sweep oracle", () => {
  test("every input the record names is its original, byte for byte", () => {
    // the record names each input by the source/ folder it was read from when written
    for (const [f, h] of Object.entries(record.inputs)) expect(sha(original(f.slice(f.lastIndexOf("source/") + "source/".length))), f).toBe(h);
  });

  test("kin.py and params.scad are the bytes the oracle golden names", () => {
    expect(sha(original("kin.py"))).toBe(oracle.kinSha256);
    expect(sha(original("params.scad"))).toBe(oracle.paramsSha256);
  });
});

describe("viewer_template.html", () => {
  const literal = (n: number, re: RegExp): number => Number(re.exec(original("viewer_template.html").toString("utf8").split("\n")[n - 1] ?? "")?.[1]);
  test("lines 395, 417 and 421 type the latch release margin LATCH_RELEASE_MARGIN_MM holds", () => {
    expect(literal(395, /lp>=CAM\+([0-9.]+)/)).toBe(LATCH_RELEASE_MARGIN_MM);
    expect(literal(417, /lp<([0-9.]+)/)).toBe(LATCH_RELEASE_MARGIN_MM);
    expect(literal(421, /lp>=CAM\+([0-9.]+)/)).toBe(LATCH_RELEASE_MARGIN_MM);
  });
});
