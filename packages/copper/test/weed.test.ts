// M05-T14: the weedability proof on constructed nets. A 1.6 mm trace
// with one right-angle bend survives an erosion of the profile's
// vinyl.weedErode (0.75 mm) as one piece; past half its width the straight
// runs vanish and the bend keeps a piece until about 0.94 mm, where the
// circle inscribed between the inner corner and the two outer edges
// closes (computed: t sqrt2 = 1.6 - t); two pads joined by a 1.2 mm neck
// split. SPLICE rev C's cut file is the reference case
// (reference/copper/splice-ladder).

import { describe, expect, test } from "vitest";
import { loadGeom } from "@hackbuild/geom";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { Vinyl, weedProof } from "../src/index.js";

describe("weedability proof", () => {
  test("a trace stays one piece, a necked pair splits, and each failure is named", async () => {
    const v = new Vinyl(await loadGeom());
    const e = createProfileLookup(loadProfile()).constant("vinyl.weedErode").value;
    expect(e).toBe(0.75);
    const trace = v.wire([[0, 0], [20, 0], [20, 10]], 1.6);
    const necked = v.union([v.box(0, 10, 6, 16), v.box(10, 10, 16, 16), v.box(6, 12.4, 10, 13.6)]);
    const p = weedProof(v, [["T", trace], ["N", necked]], e);
    expect(p.nets.map((n) => [n.net, n.pieces])).toEqual([["T", 1], ["N", 2]]);
    expect([p.ok, p.failing]).toEqual([false, ["N"]]);
    expect(weedProof(v, [["T", trace]], 0.85).nets[0]!.pieces).toBe(1);
    expect(weedProof(v, [["T", trace]], 0.95).nets[0]!.pieces).toBe(0);
  });
});
