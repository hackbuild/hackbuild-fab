// slew-ring-joint against the bodies PINTLE R6 builds (M06-T05, M06-T06,
// the originals rule). test/legacy/slew-ring.json is written by
// record-slew-ring.py, which runs pintle_parts.py stator() and rotor() as
// written; this file holds the port's numbers to those meshes and records
// why the entry stays candidate: the D-054 grid alone moves the original's
// volumes past the rule's 1e-3 mm3.

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { SLEW_RING_PARAMS, defaultsOf, mechanisms, slewRingDerive } from "@hackbuild/mechanisms";

const root = new URL("../../../", import.meta.url);
interface Summary { volume: number; bboxMin: number[]; bboxMax: number[]; faces: number; watertight: boolean }
const rec = JSON.parse(readFileSync(new URL("packages/mechanisms/test/legacy/slew-ring.json", root), "utf8")) as {
  source: { sha256: string; lineage: string; command: string };
  P: Record<string, number>;
  SEG: number;
  boreSeg: number;
  bodies: Record<"stator" | "rotor", { built: Summary; gridSnapVolume: number; export: Summary & { file: string } }>;
  thrustContact: { area: number; rIn: number; rOut: number };
};
const lineage = JSON.parse(readFileSync(new URL("lineage.json", root), "utf8")) as { id: string; kind: string; sha256: string }[];
const def = mechanisms.resolve("slew-ring-joint").def;
const out = slewRingDerive(defaultsOf(SLEW_RING_PARAMS));
/** Area of a regular n-gon with circumradius r, mm2: how trimesh.creation.cylinder and frustum cut a circle. */
const ngon = (n: number, r: number): number => (n / 2) * r * r * Math.sin((2 * Math.PI) / n);

describe("slew-ring-joint: the record is the R6 original's own output", () => {
  test("the recorded source is the def's original and the lineage canonical row", () => {
    expect(rec.source.sha256).toBe(def.original![0]!.sha256);
    const row = lineage.find((r) => r.id === rec.source.lineage)!;
    expect([row.kind, row.sha256]).toEqual(["canonical", rec.source.sha256]);
    expect(rec.source.command).toMatch(/^uv run --project tools\/py /);
  });

  test("the shipped STL exports equal the bodies the recorder built, parked on z 0 as build.py line 27 parks them: volume 1e-3 mm3, bbox 1e-6 mm", () => {
    for (const b of ["stator", "rotor"] as const) {
      const { built, export: shipped } = rec.bodies[b];
      expect(built.watertight && shipped.watertight, b).toBe(true);
      expect(Math.abs(built.volume - shipped.volume), b).toBeLessThan(1e-3);
      const park = [0, 0, built.bboxMin[2]!];
      for (let i = 0; i < 3; i++) {
        expect(Math.abs(built.bboxMin[i]! - park[i]! - shipped.bboxMin[i]!), b).toBeLessThan(1e-6);
        expect(Math.abs(built.bboxMax[i]! - park[i]! - shipped.bboxMax[i]!), b).toBeLessThan(1e-6);
      }
    }
  });
});

describe("slew-ring-joint: derive() against the meshes", () => {
  test("the defaults are the recorded P", () => {
    const d = defaultsOf(SLEW_RING_PARAMS);
    expect([d["rJ"], d["flangeT"], d["rBore"], d["rRboss"], d["clJournal"]]).toEqual([rec.P["r_j"], rec.P["flange_t"], rec.P["r_bore"], rec.P["r_rboss"], rec.P["cl_journal"]]);
  });

  test("the contact the meshes bear on runs from the bore's 96-gon to r_j - leadIn, the rotor's chamfer foot", () => {
    const c = rec.thrustContact;
    expect(Math.abs(c.rIn - out["thrustRIn"]!.value * Math.cos(Math.PI / rec.boreSeg))).toBeLessThan(1e-5);
    expect(Math.abs(c.rOut - out["thrustContactROut"]!.value)).toBeLessThan(1e-5);
    // the mesh area is exactly the two polygons, float32 coordinates aside
    const polygons = ngon(rec.SEG, out["thrustContactROut"]!.value) - ngon(rec.boreSeg, out["thrustRIn"]!.value);
    expect(Math.abs(c.area - polygons)).toBeLessThan(1e-3);
  });

  test("thrustContactArea is the smooth form of that contact, 322.2 mm2, inside the tessellation gap; the flange annulus 385.1 is not what bears", () => {
    const a = out["thrustContactArea"]!.value;
    expect(a.toFixed(1)).toBe("322.2");
    const gap = Math.abs(Math.PI * out["thrustContactROut"]!.value ** 2 - ngon(rec.SEG, out["thrustContactROut"]!.value))
      + Math.abs(Math.PI * out["thrustRIn"]!.value ** 2 - ngon(rec.boreSeg, out["thrustRIn"]!.value));
    expect(Math.abs(a - rec.thrustContact.area)).toBeLessThanOrEqual(gap);
    expect(out["thrustArea"]!.value - rec.thrustContact.area).toBeGreaterThan(60);
  });
});

describe("slew-ring-joint stays candidate", () => {
  test("the D-054 grid moves each original body's volume past the originals rule's 1e-3 mm3", () => {
    for (const b of ["stator", "rotor"] as const) {
      expect(Math.abs(rec.bodies[b].gridSnapVolume - rec.bodies[b].built.volume), b).toBeGreaterThan(1e-3);
    }
  });

  test("the entry is candidate and its reason names the rail, the grid and the promotion card", () => {
    expect(def.status).toBe("candidate");
    expect(def.statusReason).toMatch(/dovetail rail/);
    expect(def.statusReason).toMatch(/0\.157 and 0\.172 mm3/);
    expect(def.statusReason).toMatch(/M11-T09/);
    expect(() => def.derive({}, undefined as never)).toThrow(/slew-ring-joint is candidate/);
  });
});
