// M03-T10 step 2: trace, simplify and group against the SPRUE engine as
// shipped. The engine is cut from the committed legacy copy
// designs/sprue/legacy/sprue.html (lines 279 to 942, "Pure JS, no DOM"),
// whose bytes are pinned by designs/sprue/legacy/sha256.txt and the lineage
// row sprue.bench/sprue-html, and run whole; the port is compared with what
// that code returns, never with numbers typed here.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { groupLoops, groupsArea, loopArea, maskLoops, simplifyLoop, trace, type Pt, type TraceMask } from "../src/index.js";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const LEGACY = root + "designs/sprue/legacy/sprue.html";

interface SprueEngine {
  trace(m: TraceMask): Pt[][];
  simplify(loop: readonly Pt[], tol: number): Pt[] | null;
  group(loops: readonly Pt[][]): { outer: Pt[]; area: number; holes: Pt[][] }[];
  slabMesh(m: TraceMask, ppm: number, z0: number, z1: number, tol: number, sink: number[]): { area: number; want: number; polys: number };
}

function engine(): SprueEngine {
  const bytes = readFileSync(LEGACY);
  const want = readFileSync(root + "designs/sprue/legacy/sha256.txt", "utf8").split("\n").find((l) => l.endsWith("  sprue.html"))!.split(/\s+/)[0];
  if (createHash("sha256").update(bytes).digest("hex") !== want) throw new Error("designs/sprue/legacy/sprue.html does not match sha256.txt");
  const lines = bytes.toString("utf8").split("\n");
  const head = lines[278]!, tail = lines[941]!;
  if (!head.startsWith("(function (root) {") || !tail.startsWith("})(typeof globalThis")) throw new Error(`engine cut reads "${head}" .. "${tail}"`);
  const scope: { SPRUE?: SprueEngine } = {};
  new Function("globalThis", lines.slice(278, 942).join("\n"))(scope);
  return scope.SPRUE!;
}

const S = engine();

/** A random mask: blobs of filled cells, holes and diagonal contacts included. */
const maskArb = fc.record({ w: fc.integer({ min: 1, max: 24 }), h: fc.integer({ min: 1, max: 24 }), seed: fc.array(fc.boolean(), { minLength: 576, maxLength: 576 }) })
  .map(({ w, h, seed }): TraceMask => ({ w, h, d: Uint8Array.from({ length: w * h }, (_, p) => (seed[p] ? 1 : 0)) }));

function disc(w: number, h: number, cx: number, cy: number, r: number, into: Uint8Array = new Uint8Array(w * h), v = 1): Uint8Array {
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r) into[y * w + x] = v;
  return into;
}

/** A ring with a bar across it and a separate dot: two outers, two holes. */
function annulus(): TraceMask {
  const w = 64, h = 48;
  const d = disc(w, h, 24, 24, 18);
  disc(w, h, 24, 24, 11, d, 0);
  for (let y = 22; y < 26; y++) for (let x = 6; x < 42; x++) d[y * w + x] = 1;
  disc(w, h, 55, 10, 6, d);
  return { w, h, d };
}

describe("trace", () => {
  test("equals the SPRUE trace on random masks, loop for loop", () => {
    fc.assert(fc.property(maskArb, (m) => {
      expect(trace(m)).toEqual(S.trace(m));
    }), { numRuns: 300 });
  });

  test("one cell is one loop of its four corners, clockwise on screen", () => {
    const loops = trace({ w: 3, h: 3, d: Uint8Array.from([0, 0, 0, 0, 1, 0, 0, 0, 0]) });
    expect(loops).toEqual([[[1, 1], [2, 1], [2, 2], [1, 2]]]);
  });

  test("a diagonal contact splits into two loops (4-connectivity)", () => {
    const loops = trace({ w: 2, h: 2, d: Uint8Array.from([1, 0, 0, 1]) });
    expect(loops).toHaveLength(2);
    expect(loops.map((l) => Math.abs(loopArea(l)))).toEqual([1, 1]);
  });
});

describe("simplify", () => {
  test("a loop and its reverse simplify to the same point list", () => {
    const loops = trace(annulus());
    expect(loops.length).toBe(4);
    for (const l of loops) {
      const fwd = simplifyLoop(l, 0.75)!;
      const rev = simplifyLoop([...l].reverse(), 0.75)!;
      expect(fwd.length).toBeGreaterThanOrEqual(3);
      // Same points from the same start; the reverse keeps its own direction.
      expect(rev).toEqual([fwd[0], ...fwd.slice(1).reverse()]);
    }
  });

  test("equals the SPRUE simplify at 0.75 px and at 2 px on every traced loop", () => {
    fc.assert(fc.property(maskArb, fc.constantFrom(0.75, 2), (m, tol) => {
      for (const l of S.trace(m)) {
        expect(simplifyLoop(l, tol)).toEqual(S.simplify(l, tol));
        const r = [...l].reverse();
        expect(simplifyLoop(r, tol)).toEqual(S.simplify(r, tol));
      }
    }), { numRuns: 300 });
  });

  test("a straight run of collinear points collapses to its corners", () => {
    expect(simplifyLoop([[0, 0], [1, 0], [2, 0], [2, 1], [2, 2], [1, 2], [0, 2], [0, 1]], 0.75)).toEqual([[0, 0], [2, 0], [2, 2], [0, 2]]);
  });
});

describe("group and maskLoops", () => {
  test("outers counter-clockwise and holes clockwise, each hole in its smallest outer, as SPRUE groups", () => {
    const m = annulus(), ppm = 12;
    const groups = maskLoops(m, ppm);
    const cx = m.w / 2, cy = m.h / 2;
    const legacyLoops: Pt[][] = [];
    for (const l of S.trace(m)) {
      const s = S.simplify(l, 0.75);
      if (s) legacyLoops.push(s.map((p): Pt => [(p[0] - cx) / ppm, (cy - p[1]) / ppm]).reverse());
    }
    expect(groups).toEqual(S.group(legacyLoops));
    expect(groupLoops(legacyLoops)).toEqual(S.group(legacyLoops));
    expect(groups).toHaveLength(2);
    for (const g of groups) {
      expect(loopArea(g.outer)).toBeGreaterThan(0);
      for (const hl of g.holes) expect(loopArea(hl)).toBeLessThan(0);
    }
    expect(groups.map((g) => g.holes.length).sort()).toEqual([0, 2]);
  });

  test("the cap area equals slabMesh's wanted area on random masks", () => {
    fc.assert(fc.property(maskArb, (m) => {
      const r = S.slabMesh(m, 12, 0, 1, 0.75, []);
      expect(groupsArea(maskLoops(m, 12))).toBeCloseTo(r.want, 12);
    }), { numRuns: 200 });
  });
});
