// The latch release margin, read from the pages that type it inline: OGEE
// viewer_template.html lines 395, 417 and 421 here and STIPPLE
// stipple-r17b.html line 154 in stipple-originals.test.ts. Each machine's latch must release at CAM plus that margin and
// not a hair before, and OGEE must catch only inside it (M07 audit: the
// number stood in five places across two kinematics files).

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { LATCH_RELEASE_MARGIN_MM, ogeeKinematics, readScadParams, readStippleParams, stippleKinematics } from "@hackbuild/motion";

const root = new URL("../../../", import.meta.url);
const read = (p: string): string => readFileSync(new URL(p, root), "utf8");
const lineOf = (p: string, n: number): string => read(p).split("\n")[n - 1] ?? "";
const literal = (line: string, re: RegExp): number => Number(re.exec(line)?.[1]);

describe("LATCH_RELEASE_MARGIN_MM", () => {
  test("equals the literal on every page line that types it", () => {
    const ogee = "designs/ogee16/legacy/source/viewer_template.html";
    expect(literal(lineOf(ogee, 395), /lp>=CAM\+([0-9.]+)/)).toBe(LATCH_RELEASE_MARGIN_MM);
    expect(literal(lineOf(ogee, 417), /lp<([0-9.]+)/)).toBe(LATCH_RELEASE_MARGIN_MM);
    expect(literal(lineOf(ogee, 421), /lp>=CAM\+([0-9.]+)/)).toBe(LATCH_RELEASE_MARGIN_MM);
  });

  const eps = 1e-9;
  test("OGEE R16 releases at CAM plus the margin and catches only inside the margin", () => {
    const l = ogeeKinematics(readScadParams(read("designs/ogee16/legacy/source/params.scad"))).latch;
    expect(l.released(l.CAM + LATCH_RELEASE_MARGIN_MM - eps)).toBe(false);
    expect(l.released(l.CAM + LATCH_RELEASE_MARGIN_MM)).toBe(true);
    expect(l.catching(LATCH_RELEASE_MARGIN_MM - eps)).toBe(true);
    expect(l.catching(LATCH_RELEASE_MARGIN_MM)).toBe(false);
  });

  test("STIPPLE R17b releases at CAM plus the margin", () => {
    const l = stippleKinematics(readStippleParams(read("packages/motion/inputs/stipple/stipple-r17b-DATA.txt")), "stipple-r17b").latch;
    expect(l.released(l.CAM + LATCH_RELEASE_MARGIN_MM - eps)).toBe(false);
    expect(l.released(l.CAM + LATCH_RELEASE_MARGIN_MM)).toBe(true);
    expect(l.catching(l.CAM + LATCH_RELEASE_MARGIN_MM - eps)).toBe(true);
  });
});
