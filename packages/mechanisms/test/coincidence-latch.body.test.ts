// displacement-coincidence-latch bodies against OGEE16 R16-P's own exports
// (the originals rule). The legacy record is test/legacy/ogee16-latch.json,
// written by record-ogee16-latch.mjs from the original's exported DXF and
// STL files; OpenSCAD is not on this machine. The port's profile is held to
// the DXF vertex for vertex at the original's own resolution: OpenSCAD's 2D
// booleans run on a 2^-16 mm integer grid (inferred from the DXF, where
// -2.225 reads back as -2.22499 and 1.85 as 1.84999, truncated toward zero)
// and its DXF export prints six significant digits. The printed rod's STL
// volume is held to the profile area x T.

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, test } from "vitest";
import { ORIGINALS_OF_RECORD, localSource, originalPath } from "../../../tools/test-support/originals-root.js";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import type { Vec2 } from "@hackbuild/spec";
import {
  COINCIDENCE_LATCH_PARAMS, coincidenceLatchApply, coincidenceLatchDerive, defaultsOf, ogeeLatchPlateProfile, ogeeRodProfile,
} from "@hackbuild/mechanisms";

interface Loop { text: [string, string][]; value: [number, number][] }
interface StlRec { member: string; sha256: string; facets: number; volume: number; bbox: { min: number[]; max: number[] } }
interface Legacy {
  source: { cut: { file: string; sha256: string }; print: { file: string; sha256: string }; scad: { lineage: string; file: string }; params: { lineage: string; file: string } };
  rod: { dxf: { loops: Loop[] } };
  plate: { dxf: { loops: Loop[] } };
  rodStl: { print: StlRec; asm: StlRec };
}
interface LineageRow { id: string; kind: string; source: string; sha256: string }

const root = new URL("../../../", import.meta.url);
const orig = (rel: string): string => originalPath(`ogee16/${rel}`);
const leg = JSON.parse(readFileSync(new URL("./legacy/ogee16-latch.json", import.meta.url), "utf8")) as Legacy;
const lineage = JSON.parse(readFileSync(new URL("lineage.json", root), "utf8")) as LineageRow[];
const profile = createProfileLookup(loadProfile());
const D = defaultsOf(COINCIDENCE_LATCH_PARAMS);

/** OpenSCAD's 2D grid, mm (inferred from the DXF, see the header). */
const GRID = 2 ** -16;
/** The tolerance one printed coordinate carries: the grid plus half a unit in its sixth significant digit. */
function printedTol(text: string): number {
  const v = Math.abs(Number(text));
  const half = v === 0 ? 5e-7 : 0.5 * 10 ** (Math.floor(Math.log10(v)) - 5);
  return GRID + half;
}
/** Worst coordinate gap over the best cyclic start and winding, and whether every coordinate is inside its printed tolerance. */
function match(ring: readonly Vec2[], loop: Loop): { gap: number; ok: boolean } {
  let best = { gap: Infinity, ok: false };
  if (ring.length !== loop.value.length) return best;
  for (const r of [ring, [...ring].reverse()]) {
    for (let s = 0; s < r.length; s++) {
      let gap = 0;
      let ok = true;
      loop.value.forEach((q, i) => {
        const p = r[(i + s) % r.length]!;
        for (const k of [0, 1] as const) {
          const g = Math.abs(p[k] - q[k]);
          gap = Math.max(gap, g);
          if (g > printedTol(loop.text[i]![k])) ok = false;
        }
      });
      if (ok && (!best.ok || gap < best.gap)) best = { gap, ok };
      else if (!best.ok && gap < best.gap) best = { gap, ok };
    }
  }
  return best;
}
const area = (r: readonly Vec2[]): number => r.reduce((a, p, i) => { const q = r[(i + 1) % r.length]!; return a + (p[0] * q[1] - q[0] * p[1]) / 2; }, 0);

/** params.scad top-level assignments that are plain numbers, read from the original file. */
function scadNumbers(): Record<string, number> {
  const text = readFileSync(orig("files/src/source/params.scad"), "utf8");
  const out: Record<string, number> = {};
  for (const m of text.matchAll(/(?:^|;)\s*([A-Z_0-9]+)\s*=\s*(-?\d+(?:\.\d+)?)\s*;/gm)) out[m[1]!] = Number(m[2]);
  return out;
}

describe("displacement-coincidence-latch bodies: OGEE16 R16-P exports", () => {
  test("the record reads the original's exports pinned by SHA256SUMS, and the sources are the canonical lineage rows", () => {
    const sums = readFileSync(orig("SHA256SUMS"), "utf8");
    for (const a of [leg.source.cut, leg.source.print]) {
      expect(sums).toContain(`${a.sha256}  ${a.file}`);
      expect(createHash("sha256").update(readFileSync(orig(a.file))).digest("hex")).toBe(a.sha256);
    }
    for (const s of [leg.source.scad, leg.source.params]) {
      const row = lineage.find((r) => r.id === s.lineage)!;
      expect(row.kind).toBe("canonical");
      expect(row.source).toBe(`${ORIGINALS_OF_RECORD}ogee16/${s.file}`);
      expect(createHash("sha256").update(readFileSync(localSource(row.source))).digest("hex")).toBe(row.sha256);
    }
  });

  test("the def's defaults are params.scad's numbers", () => {
    const s = scadNumbers();
    const keys: Record<string, string> = {
      T: "T", stroke: "STROKE", C: "C", rodZ: "ROD_Z", crownR: "CROWN_R", crownOff: "CROWN_OFF", rLatch: "R_LATCH", lpZ: "LP_Z",
      pinW: "PIN_W", lugP: "LUG_P", lugH: "LUG_H", lugRamp: "LUG_RAMP", notchW: "NOTCH_W", rampA: "RAMP_A", slotE: "SLOT_E", faceZ: "FACE_Z", notchD: "NOTCH_D",
    };
    for (const [k, v] of Object.entries(keys)) expect(D[k], k).toBe(s[v]);
  });

  test("p_rod() regenerates dxf/rod.dxf vertex for vertex at the original's printed resolution", () => {
    const [loop] = leg.rod.dxf.loops;
    expect(leg.rod.dxf.loops).toHaveLength(1);
    const m = match(ogeeRodProfile(D), loop!);
    expect(m.ok).toBe(true);
    // Worst gap 2.38e-5 mm (computed), at the ramp crossing 15.1904762 printed 15.1905.
    expect(m.gap).toBeLessThan(2.4e-5);
  });

  test("p_latch() regenerates dxf/latch.dxf: the outline, 16 rod slots and the drive slot", () => {
    const pl = ogeeLatchPlateProfile();
    const rings = [pl.outer, ...pl.holes];
    expect(leg.plate.dxf.loops).toHaveLength(rings.length);
    const used = new Set<number>();
    for (const loop of leg.plate.dxf.loops) {
      const i = rings.findIndex((r, k) => !used.has(k) && match(r, loop).ok);
      expect(i, JSON.stringify(loop.text[0])).toBeGreaterThanOrEqual(0);
      used.add(i);
    }
  });

  test("the printed rod's STL volume is the profile area x T, and its assembly bounding box is the profile placed by v_rod()", () => {
    const r = ogeeRodProfile(D);
    const vol = area(r) * D["T"]!;
    // The originals rule's volume tolerance, 1e-3 mm3; the gap is 7.1e-4 mm3 (computed), the STL's vertices sitting on OpenSCAD's grid.
    expect(Math.abs(vol - leg.rodStl.print.volume)).toBeLessThan(1e-3);
    expect(leg.rodStl.asm.volume).toBeCloseTo(leg.rodStl.print.volume, 9);
    // v_rod() = translate([0, PIN_PLAY, CROWN_TOP]) sheetYZ(0): profile x to world y, profile y to world z, T across x.
    const pinPlay = (D["notchW"]! - D["T"]!) / 2;
    const crownTop = D["rodZ"]! + D["crownR"]!;
    const xs = r.map((p) => p[0]);
    const ys = r.map((p) => p[1]);
    const want = { min: [-D["T"]! / 2, Math.min(...xs) + pinPlay, Math.min(...ys) + crownTop], max: [D["T"]! / 2, Math.max(...xs) + pinPlay, Math.max(...ys) + crownTop] };
    for (const k of [0, 1, 2]) {
      expect(Math.abs(leg.rodStl.asm.bbox.min[k]! - want.min[k]!)).toBeLessThan(1e-6);
      expect(Math.abs(leg.rodStl.asm.bbox.max[k]! - want.max[k]!)).toBeLessThan(1e-6);
    }
  });

  test("one edit, lugP 1.25 to 1.5, moves the lug face 0.25 mm and CAM 0.25 mm", () => {
    const a = ogeeRodProfile(D);
    const b = ogeeRodProfile({ ...D, lugP: 1.5 });
    expect(b[1]![0] - a[1]![0]).toBeCloseTo(0.25, 12);
    expect(coincidenceLatchDerive({ ...D, lugP: 1.5 })["cam"]!.value - coincidenceLatchDerive(D)["cam"]!.value).toBeCloseTo(0.25, 12);
  });

  test("a param that breaks the construction's topology is E_SCHEMA", () => {
    expect(() => ogeeRodProfile({ ...D, notchW: 12 })).toThrow(expect.objectContaining({ hbf: expect.objectContaining({ code: "E_SCHEMA", path: "/params/notchW" }) }));
  });

  test("apply() emits the rod prism, latch.margin gated by CHK-MOT-05 and the identity assertion", () => {
    const out = coincidenceLatchApply({
      draft: { id: "", name: "", process: "laser", machine: "sheet600", frame: { originOnAxis: false, carriesOffset: false, pose: "print" }, bodies: [], features: [] },
      face: { origin: [0, 0, 0], normal: [0, 0, 1], u: [1, 0, 0] }, params: D, profile,
    });
    expect(out.bodies).toHaveLength(1);
    const base = out.bodies[0]!.base as unknown as { route: string; outline: Vec2[][]; z: number[] };
    expect(base.route).toBe("prism");
    expect(base.z).toEqual([0, 3]);
    expect(area(base.outline[0]!)).toBeGreaterThan(0);
    expect(match(base.outline[0]!, leg.rod.dxf.loops[0]!).ok).toBe(true);
    expect(out.metrics.map((m) => [m.id, m.gate, Number(m.value).toFixed(3)])).toEqual([["latch.margin", "CHK-MOT-05", "0.775"]]);
    expect(out.assertions).toEqual([{ type: "identity", mechanism: "displacement-coincidence-latch" }]);
  });
});
