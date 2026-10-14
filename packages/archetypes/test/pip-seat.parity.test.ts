// M06-T09: the RP2040-Zero seat regenerates the original's board fits
// rows, pad table, used pads and per-slot volumes about the pocket.
// Expected values come from test/legacy/pip-seat.json, written by
// scripts/pip-seat-legacy.mjs from the original files (haft-src, the
// canonical revision); the test checks the record's source hashes against
// the originals on disk, so a stale record fails here.
//
// Volumes: the seat's declarations are meshed by test/mesh-decl.ts without
// the D-054 snap and D-070 inset, as PIP meshes its own, then cut as PIP
// partitions (model.js lines 288 to 296): the box less the pocket cutters,
// plus the PETG packers, less the conductive PLA. The record's boxes lie
// inside PIP's outline (each box's envelope check equals its volume), so
// the box is the body there. The window runs to the original's 0.4 mm
// (windowEnd), the fin the port removes is checked on its own.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, test } from "vitest";
import type { ManifoldToplevel, Manifold } from "manifold-3d";
import { loadManifold } from "@hackbuild/mesh";
import type { ApplyOut, BleedRow, ProfileLookup } from "@hackbuild/spec";
import { SEAT_DEFAULTS, pipStack, seatApply, seatDerive, seatFits, shippedProfile, usedPads, zeroPads, type SeatParams } from "@hackbuild/archetypes";
import { solidOf, type Bag } from "./mesh-decl.js";
import { originalPath } from "../../../tools/test-support/originals-root.js";

interface Fit { group: string; name: string; value: string; ok: boolean; note: string }
interface Box { x: [number, number]; y: [number, number]; z: [number, number] }
interface SeatBox { box: Box; envelope: number; boxVolume: number; slots: Record<string, number> }
interface Variant {
  params: { bleed: number; contact: string }; z: { top: number; floor: number }; stand: number;
  boardRect: { cx: number; cy: number }; pads: { name: string; x: number; y: number; edge: string; num: number }[];
  bumps: { net: string; pad: string; x: number; y: number }[]; fits: Fit[]; seat: Record<"A" | "B", SeatBox> | null;
}
const LEG = JSON.parse(readFileSync(new URL("legacy/pip-seat.json", import.meta.url), "utf8")) as { sources: Record<string, Record<string, string>>; variants: Record<string, Variant> };
const V = (k: string): Variant => LEG.variants[k] as Variant;
const ORIG = originalPath("pip/files/");

function withBleed(bleed: number): ProfileLookup {
  const p = shippedProfile();
  return new Proxy(p, { get: (t, k) => (k === "bleed" ? (m: string, a: string, b: string): BleedRow => ({ ...t.bleed(m, a, b), bleed }) : Reflect.get(t, k)) });
}
const paramsOf = (v: Variant, extra: Partial<SeatParams> = {}): SeatParams => ({ ...SEAT_DEFAULTS, top: v.z.top, contact: v.params.contact === "socket" ? "socket" : "bump", ...extra });

describe("the record is the original's", () => {
  test("source hashes equal the originals on disk; every box lies inside PIP's outline", () => {
    for (const [key, dir] of [["haft", "haft-src/src/"], ["pipc", "pip-controller/src/"]] as const) {
      for (const [f, sha] of Object.entries(LEG.sources[key] ?? {})) {
        expect(createHash("sha256").update(readFileSync(`${ORIG}${dir}${f}`)).digest("hex"), `${dir}${f}`).toBe(sha);
      }
    }
    for (const [k, v] of Object.entries(LEG.variants)) {
      if (v.seat === null) continue;
      for (const b of Object.values(v.seat)) expect(b.envelope, k).toBeCloseTo(b.boxVolume, 6);
    }
  });
});

describe("pads and fits rows", () => {
  test("zeroPads equals the original's pad table and the catalog module's pin centres", () => {
    const v = V("haft.bleed0");
    const mine = zeroPads(SEAT_DEFAULTS);
    expect(mine.map((p) => [p.name, p.edge, p.num])).toEqual(v.pads.map((p) => [p.name, p.edge, p.num]));
    mine.forEach((p, i) => { expect(p.x).toBeCloseTo(v.pads[i]!.x, 6); expect(p.y).toBeCloseTo(v.pads[i]!.y, 6); });
    const cat = JSON.parse(readFileSync(new URL("../../catalog/data/modules/rp2040-zero.json", import.meta.url), "utf8")) as { fields: { pins: { value: { n: number; name: string; at: [number, number, number] }[] } } };
    for (const c of cat.fields.pins.value) {
      const p = mine.find((q) => q.num === c.n)!;
      expect(p.name, `pin ${c.n}`).toBe(c.name);
      expect(Math.abs(p.x - c.at[0]) + Math.abs(p.y - c.at[1]), c.name).toBeLessThan(1e-9);
    }
  });

  test("used pads and their nets equal the original's bumps at PIP's default pin map", () => {
    const v = V("haft.bleed0");
    const mine = usedPads(SEAT_DEFAULTS);
    expect(mine.map((u) => [u.net, u.pad.name])).toEqual(v.bumps.map((b) => [b.net, b.pad]));
    mine.forEach((u, i) => {
      expect(u.pad.x + v.boardRect.cx).toBeCloseTo(v.bumps[i]!.x, 6);
      expect(u.pad.y + v.boardRect.cy).toBeCloseTo(v.bumps[i]!.y, 6);
    });
  });

  for (const [key, bleed] of [["haft.bleed0", 0], ["haft.stickBleed0", 0], ["haft.socketBleed0", 0], ["haft.defaults", 0.15], ["haft.socket", 0.15]] as const) {
    test(`${key}: every board row by name, value and ok`, () => {
      const v = V(key);
      const s = pipStack(withBleed(bleed), "ffc5p", { body: "petg", trace: "cpla" });
      const mine = seatFits(paramsOf(v), s);
      const legacy = v.fits.filter((f) => f.group === "board");
      expect(mine.map((r) => [r.name, r.value, r.ok, r.note])).toEqual(legacy.map((f) => [f.name, f.value, f.ok, f.note]));
    });
  }

  test("the port derives the stand and the USB opening at PIP defaults", () => {
    const d = seatDerive({ ...SEAT_DEFAULTS, top: 13.68 }, shippedProfile());
    expect(d["stand"]!.value).toBe(0.48);
    expect(d["fits.USB opening height"]!.value.toFixed(2)).toBe("9.36");
    expect(d["usedPads"]!.value).toBe(12);
  });
});

let mf: ManifoldToplevel;
beforeAll(async () => { mf = await loadManifold(); });

/** PETG and cPLA of the seat inside a recorded box, partitioned as PIP partitions. */
function boxSlots(out: ApplyOut, b: Box): { petg: number; cpla: number } {
  const own: Bag = [];
  const keep = (m: Manifold): Manifold => { own.push(m); return m; };
  try {
    const box = keep(mf.Manifold.cube([b.x[1] - b.x[0], b.y[1] - b.y[0], b.z[1] - b.z[0]], false).translate([b.x[0], b.y[0], b.z[0]]));
    const cut: Manifold[] = [], add: Manifold[] = [], cond: Manifold[] = [];
    for (const f of out.features) {
      if (f.kind === "pocket") {
        const z0 = f.face.origin[2] - f.depth;
        cut.push(solidOf(mf, { route: "prism", outline: [f.outline as [number, number][]], z: [z0, f.face.origin[2] + 1] }, own));
      }
      if (f.kind === "conductor" && "path" in f.region) cond.push(solidOf(mf, { route: "prism", outline: [f.region.path], z: [f.region.face.origin[2], f.region.face.origin[2] + f.t] }, own));
    }
    for (const x of out.bodies) (x.material === "petg" ? add : cond).push(solidOf(mf, x.base, own));
    const condM = keep(mf.Manifold.union(cond));
    let petg = keep(box.subtract(keep(mf.Manifold.union(cut))));
    if (add.length > 0) petg = keep(petg.add(keep(mf.Manifold.union(add))));
    petg = keep(petg.subtract(condM));
    const cpla = keep(condM.intersect(box));
    return { petg: keep(petg.intersect(box)).volume(), cpla: cpla.volume() };
  } finally {
    for (const m of own) m.delete();
  }
}

const draft = { id: "body", name: "body", process: "fdm" as const, machine: "ffc5p", frame: { originOnAxis: false, carriesOffset: false, pose: "print" as const }, bodies: [], features: [] };

describe("per-slot volumes about the pocket", () => {
  for (const [key, bleed] of [["haft.bleed0", 0], ["haft.stickBleed0", 0], ["haft.socketBleed0", 0], ["haft.defaults", 0.15], ["haft.socket", 0.15]] as const) {
    test(`${key}: PETG and cPLA in both boxes within 1e-3 mm3 of the original`, () => {
      const v = V(key);
      const p = withBleed(bleed);
      const s = pipStack(p, "ffc5p", { body: "petg", trace: "cpla" });
      const face = { origin: [v.boardRect.cx, v.boardRect.cy, s.z.floor] as [number, number, number], normal: [0, 0, 1] as [number, number, number], u: [1, 0, 0] as [number, number, number] };
      const out = seatApply({ draft, face, profile: p, params: paramsOf(v, { windowEnd: 0.4 }) }, "rp2040-zero-seat");
      for (const k of ["A", "B"] as const) {
        const rec = v.seat![k];
        const got = boxSlots(out, rec.box);
        expect(Math.abs(got.petg - rec.slots["1"]!), `${key} box ${k} PETG ${got.petg} against ${rec.slots["1"]}`).toBeLessThanOrEqual(1e-3);
        expect(Math.abs(got.cpla - rec.slots["2"]!), `${key} box ${k} cPLA ${got.cpla} against ${rec.slots["2"]}`).toBeLessThanOrEqual(1e-3);
      }
    });
  }

  test("the port's window fix removes exactly the 0.1 mm strip across the window's 12.64 mm width, 0.48 tall (computed)", () => {
    const v = V("haft.bleed0");
    const p = shippedProfile();
    const s = pipStack(p, "ffc5p", { body: "petg", trace: "cpla" });
    const face = { origin: [v.boardRect.cx, v.boardRect.cy, s.z.floor] as [number, number, number], normal: [0, 0, 1] as [number, number, number], u: [1, 0, 0] as [number, number, number] };
    const orig = boxSlots(seatApply({ draft, face, profile: p, params: paramsOf(v, { windowEnd: 0.4 }) }, "rp2040-zero-seat"), v.seat!.B.box);
    const fixed = boxSlots(seatApply({ draft, face, profile: p, params: paramsOf(v) }, "rp2040-zero-seat"), v.seat!.B.box);
    const notchZ0 = Math.max(s.z.pl[0] + s.layer, v.z.floor + 0.48 + 1.0 + 3.26 / 2 - 3.6);
    const windowW = 2 * (SEAT_DEFAULTS.W / 2 - SEAT_DEFAULTS.inset - 1.3);
    expect(orig.petg - fixed.petg).toBeCloseTo(0.1 * windowW * (s.z.floor - notchZ0), 6);
  });
});
