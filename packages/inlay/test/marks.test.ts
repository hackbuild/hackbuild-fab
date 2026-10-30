// The marks registry (src/marks.ts): the two marks are BAIL's verbatim
// (bail.html:1056 to 1059, part 2a, "verbatim mark geometry. never redraw").
// The path strings are held by sha256 so a changed byte fails here on every
// machine, and equal to the canonical file where it is on this machine. The
// hack.build strings also equal the two paths of coin-inlay's build.ts.

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { flattenSvgPath } from "@hackbuild/geom";
import { ART_BRANDS } from "@hackbuild/spec";
import { describe, expect, test } from "vitest";
import { MARKS } from "../src/marks.js";
import { sourcePath } from "../../../tools/test-support/originals-root.js";

const sha = (s: string | Uint8Array): string => createHash("sha256").update(s).digest("hex");
const HASHES = {
  "hb.arc": "a6fc829315e7d16803901737ef1534b9a360ec7c33810c313fbb6519accd36a6",
  "hb.wrench": "7c0f86b635236eafd7999d3ca22b5b935aad0b36783a5a42b9cb748bce3d3aa4",
  "hsl.sun": "e6bbf6403e5b5bb1fe35495a0b8d5ce2d3ff86946290093600546f2e846e650f",
  "hsl.flame": "aa2789d1598966155ea1ce64e037a15e343d03395c49bebabcb81b809d64ab74",
} as const;

describe("marks registry", () => {
  test("one mark per spec brand, hack.build and HeatSync Labs", () => {
    expect(Object.keys(MARKS).sort()).toEqual([...ART_BRANDS].sort());
    expect(MARKS.hb.name).toBe("hack.build");
    expect(MARKS.hsl.name).toBe("HeatSync Labs");
  });

  test("the numbers and parts are BAIL's: span, centre, offsets, paint order and slots", () => {
    expect(MARKS.hb).toMatchObject({ span: 800, centre: [517, 503] });
    expect(MARKS.hb.parts.map((p) => [p.id, p.at, p.slot, p.fill])).toEqual([["arc", [490, 121], "slot", "nonzero"], ["wrench", [498, 314], "slot2", "nonzero"]]);
    expect(MARKS.hsl).toMatchObject({ span: 985, centre: [459.5, 479] });
    expect(MARKS.hsl.parts.map((p) => [p.id, p.at, p.slot, p.fill])).toEqual([["sun", [-26, -4], "slot2", "evenodd"], ["flame", [-26, -4], "slot", "evenodd"]]);
  });

  test("every path string is the verbatim sha256", () => {
    for (const [key, want] of Object.entries(HASHES)) {
      const [brand, part] = key.split(".") as ["hb" | "hsl", string];
      expect(sha(MARKS[brand].parts.find((p) => p.id === part)!.d), key).toBe(want);
    }
  });

  test("the hack.build paths equal the two of reference/cosmetic/coin-inlay", () => {
    const build = readFileSync(fileURLToPath(new URL("../../../reference/cosmetic/coin-inlay/build.ts", import.meta.url)), "utf8");
    const arc = /arc: \{\s*at: \[490, 121\],\s*d: "([^"]+)"/.exec(build)![1];
    const wrench = /wrench: \{\s*at: \[498, 314\],\s*d: "([^"]+)"/.exec(build)![1];
    expect(MARKS.hb.parts[0]!.d).toBe(arc);
    expect(MARKS.hb.parts[1]!.d).toBe(wrench);
  });

  test("the strings equal bail.html lines 1056 to 1059 where the canonical file is on this machine", (t) => {
    const file = sourcePath("fab-knowledge:originals/bail/files/bail.html");
    if (!existsSync(file)) { t.skip(); return; }
    const lines = readFileSync(file, "utf8").split("\n").slice(1055, 1059).join("\n");
    const M = new Function(`${lines}; return MARKS;`)() as Record<"hb" | "hsl", Record<string, string | number>>;
    expect(sha(readFileSync(file))).toBe("4accb6428d31b3e687340ed8e35c2fb5f0edc19307d4090bd37d066474e86ccd");
    expect(MARKS.hb.parts[0]!.d).toBe(M.hb["arc"]);
    expect(MARKS.hb.parts[1]!.d).toBe(M.hb["wrench"]);
    expect(MARKS.hsl.parts[0]!.d).toBe(M.hsl["sun"]);
    expect(MARKS.hsl.parts[1]!.d).toBe(M.hsl["flame"]);
  });

  test("each part flattens to rings; the hb parts are one simple ring each, so nonzero and even-odd give the same cells", () => {
    for (const brand of ["hb", "hsl"] as const) for (const part of MARKS[brand].parts) {
      const rings = flattenSvgPath(part.d, [1, 0, 0, 1, 0, 0], { curves: { cubic: 12, quad: 10 } });
      expect(rings.length, `${brand}.${part.id}`).toBeGreaterThan(0);
      if (brand === "hb") expect(rings, part.id).toHaveLength(1);
    }
    // One ring: the rule only matters where the ring crosses itself, so test for no crossing.
    for (const part of MARKS.hb.parts) {
      const ring = flattenSvgPath(part.d)[0]!;
      let crossings = 0;
      const n = ring.length;
      const ccw = (a: readonly number[], b: readonly number[], c: readonly number[]): number => (b[0]! - a[0]!) * (c[1]! - a[1]!) - (b[1]! - a[1]!) * (c[0]! - a[0]!);
      for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) {
        if (i === 0 && j === n - 1) continue;
        const a = ring[i]!, b = ring[(i + 1) % n]!, c = ring[j]!, d = ring[(j + 1) % n]!;
        if (ccw(a, b, c) * ccw(a, b, d) < 0 && ccw(c, d, a) * ccw(c, d, b) < 0) crossings++;
      }
      expect(crossings, part.id).toBe(0);
    }
  });
});
