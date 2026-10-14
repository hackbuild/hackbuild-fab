// M06-T09: the archetypes ported from THINPOT regenerate the original's
// readouts, fits and bodies. Expected values come from
// test/legacy/thinpot.json, written by scripts/thinpot-legacy.mjs from
// originals/thinpot/files/feeler_thinpot.html evaluated in place; the test
// checks the record's source hash against the original on disk, so a stale
// record fails here.
//
// The page prints at its own settings (layer 0.2, nozzle 0.4, lines 5671
// to 5705) and prices traces with its own cPLA rho 15 ohm cm (line 1006).
// The port reads the layer from the machine preset and the rho from the
// profile row (D-098), so these cases pass both in memory: a preset with
// the page's layer and a cPLA row whose value the test reads from the
// page's line. The `ffc5p` variant is the page evaluated at the shipped
// preset's 0.24 layer, which the reference builds at. The `n06` variant is
// the page at nozzle 0.6, where every nozzle rule (clearance 1.5 x nozzle,
// collar 2.1 x nozzle, narrow track 2 x nozzle) sits above its floor, so
// the page's coefficients set the geometry; `ladder.inplace.n05` puts the
// inplace hinge band, 1.05 x nozzle, between its 0.42 floor and the 0.6
// cone wall.
//
// Volumes: each part's declarations are meshed here as the page meshes its
// own primitives (prisms extruded, revolves and lathes revolved), unioned
// per part, and compared with the record's union of the page's recorded
// primitives within 1e-3 mm3; bounding boxes of the posed parts within
// 1e-6 mm.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, test } from "vitest";
import type { Manifold, ManifoldToplevel } from "manifold-3d";
import { loadManifold } from "@hackbuild/mesh";
import type { ApplyOut, ProfileLookup, ResistivityRow, ShapeDecl } from "@hackbuild/spec";
import { LADDER_DEFAULTS, SWITCH_DEFAULTS, THINPOT_DEFAULTS, thinpotApply, thinpotBuild, type ThinpotParams, archetypes, ladderApply, ladderDerive, ladderBuild, shippedProfile, switchApply, switchBuild, type LadderParams, type SwitchParams } from "@hackbuild/archetypes";
import { originalPath } from "../../../tools/test-support/originals-root.js";

const FILE = originalPath("thinpot/files/feeler_thinpot.html");
interface Part { name: string; role: string; volume: number; bbox: number[]; posedBbox: number[]; primitives: number }
interface Variant { params: Record<string, unknown>; readout: { k: string; v: string; u: string }[]; fits: { name: string; nominal: number; actual: number; min: number; max: number; ok: boolean }[]; notes: string[]; netReport: { ok: boolean; say: string }[]; ladder: { N: number; R: number; Rlink: number[] } | null; parts: Part[] }
const LEG = JSON.parse(readFileSync(new URL("legacy/thinpot.json", import.meta.url), "utf8")) as { sources: { thinpot: Record<string, string> }; variants: Record<string, Variant> };
const V = (k: string): Variant => LEG.variants[k] as Variant;

/** The page's own cPLA row, read from its materials table (line 1006). */
function pageCpla(): ResistivityRow {
  const line = readFileSync(FILE, "utf8").split("\n")[1005] ?? "";
  const rho = Number(/CPLA:.*?rho:(\d+(?:\.\d+)?),/.exec(line)?.[1]);
  return { id: "cpla.feeler", direction: "along", ohmCm: rho, form: "printed", brand: "FEELER", provenance: { tier: "inferred", method: "derived", date: "2026-10-09", source: `${FILE} line 1006` } };
}

/** The page's own CTPU row: its rhoZ, the across-layer value the contact model reads (line 1008). */
function pageCtpu(): ResistivityRow {
  const line = readFileSync(FILE, "utf8").split("\n")[1007] ?? "";
  const rho = Number(/CTPU:.*?rhoZ:(\d+(?:\.\d+)?),/.exec(line)?.[1]);
  return { id: "ctpu.feeler", direction: "through", ohmCm: rho, form: "printed", brand: "FEELER", provenance: { tier: "inferred", method: "derived", date: "2026-10-09", source: `${FILE} line 1008` } };
}

/** The shipped profile with the page's layer and nozzle on the ffc5p preset and the page's cPLA row (in memory, never the data files). */
function pageProfile(layer: number, nozzle: number): ProfileLookup {
  const p = shippedProfile();
  const cpla = pageCpla(), ctpu = pageCtpu();
  return new Proxy(p, {
    get: (t, k) => {
      if (k === "resistivity") return (m: string) => (m === "ctpu" ? ctpu : cpla);
      if (k === "machine") return (id: string) => { const m = t.machine(id); return { ...m, presets: m.presets.map((q, i) => (i === 0 ? { ...q, layer, nozzle } : q)) }; };
      return Reflect.get(t, k);
    },
  });
}

describe("the record is the original's", () => {
  test("source hash equals the original on disk; the page's own net report passes", () => {
    expect(createHash("sha256").update(readFileSync(FILE)).digest("hex")).toBe(LEG.sources.thinpot["feeler_thinpot.html"]);
    for (const v of Object.values(LEG.variants)) for (const r of v.netReport) expect(r.ok, r.say).toBe(true);
    for (const k of ["ladder.n06", "switch.n06", "thinpot.n06", "thinpot.ctpuLog.n06"]) expect(V(k).params.nozzle, k).toBe(0.6);
    expect(V("ladder.inplace.n05").params.nozzle).toBe(0.5);
    expect(pageCpla().ohmCm).toBe(15);
    expect(pageCtpu().ohmCm).toBe(3500);
  });
});

let mf: ManifoldToplevel;
beforeAll(async () => { mf = await loadManifold(); });

function solid(shape: ShapeDecl, own: Manifold[]): Manifold {
  const keep = <T extends { delete(): void }>(m: T): T => { own.push(m as unknown as Manifold); return m; };
  if (shape.route === "prism") {
    const cs = keep(new mf.CrossSection(shape.outline.map((r) => r.map(([x, y]) => [x, y] as [number, number])), "Positive"));
    return keep(keep(cs.extrude(shape.z[1] - shape.z[0])).translate([0, 0, shape.z[0]]));
  }
  if (shape.route === "revolve") {
    const cs = keep(new mf.CrossSection([shape.profile.map(([r, z]) => [r, z] as [number, number])], "Positive"));
    const o = shape.axis?.origin ?? [0, 0, 0];
    return keep(keep(cs.revolve(shape.segments ?? 64, 360)).translate([o[0], o[1], 0]));
  }
  if (shape.route === "csg" && shape.op === "union") return keep(mf.Manifold.union(shape.of.map((x) => solid(x, own))));
  throw new Error(`route ${shape.route} is not read here`);
}

/** Per page part (body ids are the part name, or the part name and a group index): the union of its bodies. */
function measure(out: ApplyOut, names: readonly string[]): Record<string, { volume: number; bbox: number[] }> {
  const res: Record<string, { volume: number; bbox: number[] }> = {};
  for (const name of names) {
    const id = name.replace(/[^a-z0-9]+/gi, "-");
    const mine = out.bodies.filter((b) => b.id === id || b.id.startsWith(`${id}.`));
    const own: Manifold[] = [];
    try {
      const m = mf.Manifold.union(mine.map((b) => solid(b.base, own)));
      own.push(m);
      const bb = m.boundingBox();
      res[name] = { volume: m.volume(), bbox: [...bb.min, ...bb.max] };
    } finally { for (const m of own) m.delete(); }
  }
  return res;
}

function sameBodies(out: ApplyOut, v: Variant): void {
  const names = v.parts.map((p) => p.name);
  const ids = new Set(out.bodies.map((b) => b.id.replace(/\.\d+$/, "")));
  expect([...ids].sort()).toEqual(names.map((n) => n.replace(/[^a-z0-9]+/gi, "-")).sort());
  const got = measure(out, names);
  for (const p of v.parts) {
    const g = got[p.name]!;
    expect(Math.abs(g.volume - p.volume), `${p.name}: ${g.volume} against ${p.volume}`).toBeLessThanOrEqual(1e-3);
    g.bbox.forEach((x, i) => expect(Math.abs(x - p.posedBbox[i]!), `${p.name} bbox ${i}: ${x} against ${p.posedBbox[i]}`).toBeLessThanOrEqual(1e-6));
  }
}

const draft = { id: "body", name: "body", process: "fdm" as const, machine: "ffc5p", frame: { originOnAxis: false, carriesOffset: false, pose: "print" as const }, bodies: [], features: [] };
const FACE = { origin: [0, 0, 0] as [number, number, number], normal: [0, 0, 1] as [number, number, number], u: [1, 0, 0] as [number, number, number] };

const cases: [string, Partial<LadderParams>, number, number][] = [
  ["ladder.defaults", {}, 0.2, 0.4],
  ["ladder.inplace", { print: "inplace" }, 0.2, 0.4],
  ["ladder.ffc5p", {}, 0.24, 0.4],
  ["ladder.n06", {}, 0.2, 0.6],
  ["ladder.inplace.n05", { print: "inplace" }, 0.2, 0.5],
];

describe("ladder keypad regenerates the original", () => {
  for (const [key, over, layer, nozzle] of cases) {
    test(`${key}: readouts, fits, links and levels as the page prints them`, () => {
      const v = V(key);
      const b = ladderBuild({ ...LADDER_DEFAULTS, ...over }, { layerH: layer, nozzle }, pageCpla());
      expect(b.readout).toEqual(v.readout);
      expect(b.fits).toEqual(v.fits);
      for (const n of b.notes) expect(v.notes, n).toContain(n);
      expect(b.rLink.length).toBe(v.ladder!.Rlink.length);
      b.rLink.forEach((r, i) => expect(Math.abs(r - v.ladder!.Rlink[i]!) / r, `link ${i}`).toBeLessThan(1e-12));
      expect(Math.abs(b.r - v.ladder!.R) / b.r).toBeLessThan(1e-12);
    });

    test(`${key}: every part's volume within 1e-3 mm3 and posed bounding box within 1e-6 mm`, () => {
      const v = V(key);
      const out = ladderApply({ draft, face: FACE, profile: pageProfile(layer, nozzle), params: { ...LADDER_DEFAULTS, ...over } }, "ladder-keypad");
      sameBodies(out, v);
    });
  }

  test("derive at the shipped profile prices the chain on the profile cPLA row, not the page's 15 ohm cm", () => {
    const p = shippedProfile();
    const row = p.resistivity("cpla", "along", "printed");
    const d = ladderDerive(LADDER_DEFAULTS, p);
    const page = V("ladder.ffc5p").ladder!.R;
    expect(d["R.step"]!.value / page).toBeCloseTo((row.ohmCm as number) / 15, 9);
    expect(d["R.step"]!.qualifier).toBe("computed");
  });
});

const switchCases: [string, Partial<SwitchParams>, number, number][] = [
  ["switch.defaults", {}, 0.2, 0.4],
  ["switch.inplace", { print: "inplace" }, 0.2, 0.4],
  ["switch.ffc5p", {}, 0.24, 0.4],
  ["switch.n06", {}, 0.2, 0.6],
];

describe("dome switch regenerates the original", () => {
  for (const [key, over, layer, nozzle] of switchCases) {
    test(`${key}: readouts, fits, bodies`, () => {
      const v = V(key);
      const b = switchBuild({ ...SWITCH_DEFAULTS, ...over }, { layerH: layer, nozzle }, pageCpla());
      expect(b.readout).toEqual(v.readout);
      expect(b.fits).toEqual(v.fits);
      for (const n of b.notes) expect(v.notes, n).toContain(n);
      const out = switchApply({ draft, face: FACE, profile: pageProfile(layer, nozzle), params: { ...SWITCH_DEFAULTS, ...over } }, "dome-button");
      sameBodies(out, v);
    });
  }
});

const thinpotCases: [string, Partial<ThinpotParams>, number, number][] = [
  ["thinpot.defaults", {}, 0.2, 0.4],
  ["thinpot.ffc5p", {}, 0.24, 0.4],
  ["thinpot.ctpuLog", { top: "ctpu", taper: "log" }, 0.2, 0.4],
  ["thinpot.n06", {}, 0.2, 0.6],
  ["thinpot.ctpuLog.n06", { top: "ctpu", taper: "log" }, 0.2, 0.6],
];

describe("THINPOT membrane slider regenerates the original", () => {
  for (const [key, over, layer, nozzle] of thinpotCases) {
    test(`${key}: readouts, fits, bodies`, () => {
      const v = V(key);
      const b = thinpotBuild({ ...THINPOT_DEFAULTS, ...over }, { layerH: layer, nozzle }, pageCpla(), pageCtpu());
      expect(b.readout).toEqual(v.readout);
      expect(b.fits).toEqual(v.fits);
      for (const n of b.notes) expect(v.notes, n).toContain(n);
      const out = thinpotApply({ draft, face: FACE, profile: pageProfile(layer, nozzle), params: { ...THINPOT_DEFAULTS, ...over } }, "membrane-slider-thinpot");
      sameBodies(out, v);
    });
  }
});

describe("registry", () => {
  test("the THINPOT slider runs; the ladder and the dome are refused with the reason their references give", () => {
    expect(archetypes.resolve("membrane-slider-thinpot").def.status).toBe("proven");
    // the ladder now builds (one union body per page part, caps flipped) and both wait on the CHK-PRT-13 owner question
    for (const id of ["ladder-keypad", "dome-button"]) {
      expect(archetypes.resolve(id).def.status, id).toBe("candidate");
      expect(archetypes.resolve(id).def.statusReason, id).toMatch(/CHK-PRT-13.*owner|owner.*CHK-PRT-13/);
    }
  });
});
