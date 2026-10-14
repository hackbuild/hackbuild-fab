// M00-T05 step 4 and step 8 stack parity: fixtures of two and three
// overlapping prisms in one slot. The manifold union of the shells equals
// the analytic volume within 1e-6 relative (computed), every shell is
// manifold, and every z overlap lies in the profile band overlap,
// stack.bandOverlap.lo to .hi (0.01 to 0.02 mm, inferred).

import { beforeAll, describe, expect, it } from "vitest";
import type { Ring } from "@hackbuild/spec";
import { loadGeom, type Geom } from "@hackbuild/geom";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { audit, bandOverlap, liveCount, loadManifold, snap, stackMesh, unionReport, withScope, type MeshData } from "../../src/index.js";

const profile = createProfileLookup(loadProfile());
const OVERLAP = bandOverlap(profile);

let geom: Geom;
beforeAll(async () => {
  geom = await loadGeom();
});

const rect = (x0: number, y0: number, x1: number, y1: number): Ring => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

async function unionVolume(shells: readonly MeshData[]): Promise<number> {
  const wasm = await loadManifold();
  return withScope((scope) => {
    const solids = shells.map((m) => {
      const mesh = new wasm.Mesh({ numProp: 3, vertProperties: Float32Array.from(m.positions), triVerts: Uint32Array.from(m.triangles) });
      mesh.merge();
      return scope.own(new wasm.Manifold(mesh));
    });
    return unionReport(solids).solid.volume();
  });
}

// Overlaps of 12, 16 and 20 grid steps: 0.01171875, 0.015625 and 0.01953125 mm (computed), on the grid and inside 0.01 to 0.02.
const O12 = 12 / 1024;
const O16 = 16 / 1024;
const O20 = 20 / 1024;

interface Fixture {
  readonly name: string;
  readonly bands: { readonly outline: Ring[]; readonly z: readonly [number, number] }[];
  /** Analytic union volume, mm3 (computed by hand from the rectangles). */
  readonly analytic: number;
  readonly runs: number;
}

const FIXTURES: readonly Fixture[] = [
  {
    name: "two: base 20 x 10 then a 10 x 10 boss",
    bands: [
      { outline: [rect(0, 0, 20, 10)], z: [0, 2] },
      { outline: [rect(5, 0, 15, 10)], z: [2 - O16, 5] },
    ],
    // the boss lies inside the base footprint, so its overlap slab is counted once
    analytic: 20 * 10 * 2 + 10 * 10 * 3,
    runs: 2,
  },
  {
    name: "two: offset rectangles that overhang",
    bands: [
      { outline: [rect(0, 0, 10, 10)], z: [0, 1] },
      { outline: [rect(5, 2, 17, 8)], z: [1 - O20, 3] },
    ],
    // union = A + B - (A and B): A and B share x 5 to 10, y 2 to 8 over the overlap height
    analytic: 10 * 10 * 1 + 12 * 6 * (2 + O20) - 5 * 6 * O20,
    runs: 2,
  },
  {
    name: "three: base, ring with a hole, cap",
    bands: [
      { outline: [rect(0, 0, 12, 12)], z: [0, 1] },
      { outline: [rect(0, 0, 12, 12), rect(3, 3, 9, 9)], z: [1 - O12, 4] },
      { outline: [rect(2, 2, 10, 10)], z: [4 - O16, 4.5] },
    ],
    // base 144, ring 108 x (3 + O12) minus the overlap with the base 108 x O12, cap 64 x (0.5 + O16) minus its overlap with the ring
    // (cap and ring share 64 - 36 = 28 mm2 over O16)
    analytic: 144 * 1 + 108 * 3 + 64 * (0.5 + O16) - 28 * O16,
    runs: 3,
  },
  {
    name: "three: equal sections merge into one run",
    bands: [
      { outline: [rect(0, 0, 6, 4)], z: [0, 1] },
      { outline: [rect(0, 0, 6, 4)], z: [1 - O16, 2] },
      { outline: [rect(0, 0, 6, 4)], z: [2 - O16, 3] },
    ],
    analytic: 6 * 4 * 3,
    runs: 1,
  },
];

describe("stack route", () => {
  for (const f of FIXTURES) {
    it(`${f.name}: union volume within 1e-6 relative of analytic, every shell manifold, overlaps 0.01 to 0.02 mm`, async () => {
      const m = stackMesh(geom, f.bands, OVERLAP);
      expect(m.runs.length).toBe(f.runs);
      for (const s of m.shells) expect(audit(s).ok).toBe(true);
      for (let i = 1; i < f.bands.length; i++) {
        const overlap = snap(f.bands[i - 1]!.z[1]) - snap(f.bands[i]!.z[0]);
        expect(overlap).toBeGreaterThanOrEqual(OVERLAP[0]);
        expect(overlap).toBeLessThanOrEqual(OVERLAP[1]);
      }
      const v = await unionVolume(m.shells);
      const rel = Math.abs(v - f.analytic) / f.analytic;
      console.log(`${f.name}: union ${v.toFixed(9)} mm3, analytic ${f.analytic.toFixed(9)} mm3, relative ${rel.toExponential(2)} (computed), runs ${m.runs.length}, shells ${m.shells.length}`);
      expect(rel).toBeLessThanOrEqual(1e-6);
      expect(liveCount()).toBe(0);
    });
  }

  it("caps a run only where the neighbour section differs: three equal bands give 2 caps of 2 triangles and 4 walls of 2", () => {
    const m = stackMesh(geom, FIXTURES[3]!.bands, OVERLAP);
    expect(m.shells.length).toBe(1);
    expect(m.shells[0]!.triangles.length / 3).toBe(12);
  });

  it("reads the band overlap from profile: stack.bandOverlap.lo and .hi are 0.01 and 0.02 mm, inferred", () => {
    expect(OVERLAP).toEqual([0.01, 0.02]);
    for (const id of ["stack.bandOverlap.lo", "stack.bandOverlap.hi"]) {
      const c = profile.constant(id);
      expect([c.unit, c.provenance.tier]).toEqual(["mm", "inferred"]);
    }
  });

  it("refuses an overlap outside the profile band with E_SCHEMA naming the band", () => {
    let hbf: { code: string; path?: string } | undefined;
    try {
      stackMesh(geom, [
        { outline: [rect(0, 0, 4, 4)], z: [0, 1] },
        { outline: [rect(0, 0, 2, 2)], z: [0.9, 2] },
      ], OVERLAP);
    } catch (e) {
      hbf = (e as { hbf?: { code: string; path?: string } }).hbf;
    }
    expect(hbf?.code).toBe("E_SCHEMA");
    expect(hbf?.path).toBe("/bands/1/z/0");
  });

  it("takes the overlap it is given: a 0.1 mm overlap passes under a 0.05 to 0.15 band, and the message and hint name that band", () => {
    const bands = [
      { outline: [rect(0, 0, 4, 4)], z: [0, 1] as const },
      { outline: [rect(0, 0, 2, 2)], z: [0.9, 2] as const },
    ];
    expect(stackMesh(geom, bands, [0.05, 0.15]).shells.length).toBeGreaterThan(0);
    let hbf: { code: string; expected?: string; hint?: string } | undefined;
    try {
      stackMesh(geom, bands, [0.2, 0.3]);
    } catch (e) {
      hbf = (e as { hbf?: { code: string; expected?: string; hint?: string } }).hbf;
    }
    expect(hbf?.code).toBe("E_SCHEMA");
    expect(hbf?.expected).toContain("band overlap 0.2 to 0.3 mm");
    expect(hbf?.hint).toBe("start each band 0.2 to 0.3 mm below the top of the band under it");
  });

  it("refuses a profile overlap row that is not a positive mm length, or lo over hi", () => {
    const row = (id: string, value: number, unit = "mm") => ({ id, value, unit, provenance: { tier: "inferred" as const, method: "derived" as const, date: "2026-10-06", source: "test" } });
    const lookup = (lo: ReturnType<typeof row>, hi: ReturnType<typeof row>) => ({ constant: (id: string) => (id === lo.id ? lo : hi) });
    const code = (f: () => unknown): string | undefined => {
      try { f(); } catch (e) { return (e as { hbf?: { code: string } }).hbf?.code; }
      return undefined;
    };
    expect(code(() => bandOverlap(lookup(row("stack.bandOverlap.lo", 0.01, "layers"), row("stack.bandOverlap.hi", 0.02))))).toBe("E_SCHEMA");
    expect(code(() => bandOverlap(lookup(row("stack.bandOverlap.lo", 0), row("stack.bandOverlap.hi", 0.02))))).toBe("E_SCHEMA");
    expect(code(() => bandOverlap(lookup(row("stack.bandOverlap.lo", 0.03), row("stack.bandOverlap.hi", 0.02))))).toBe("E_SCHEMA");
    expect(bandOverlap(lookup(row("stack.bandOverlap.lo", 0.03), row("stack.bandOverlap.hi", 0.04)))).toEqual([0.03, 0.04]);
  });
});
