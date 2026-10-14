// M05-T14: KEYWAY rev A on packages/copper, held to independent sources
// and to its own goldens. Every number here is computed; nothing is
// measured on a cut board.
//
// Independent sources, never written by this test:
// - reference/copper/keyway/legacy/run-2026-10-04.txt, the 45 gate lines
//   of the shipped generator's rerun (lineage keyway.rerun/2026-10-04);
// - reference/copper/keyway/legacy/keyway_geometry.json, the shipped
//   params, stats, nets and layers (lineage keyway.geometry/rev-a);
// - reference/copper/keyway/expected/oracle-brand.txt and
//   oracle-brand-stats.json, the legacy generator run with the brand on
//   (tools/py/copper/run_legacy_gen.py and dump_keyway_brand.py).
// Own goldens, rewritten only with HBF_ACCEPT_VINYL=1: expected/gates.json,
// layers.json (document sha256) and stack.json in core's surface shape
// (core/src/commands/surface.ts vinylGoldens, which hbf parity compares),
// gates-brand.json, stats.json and edit.json.
// The tolerances below are this card's choice for a Clipper2 port of
// shapely geometry; they are recorded in expected/stats.json and the test
// reads them back from there.

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { beforeAll, describe, expect, test } from "vitest";
import type { Section } from "@hackbuild/geom";
import { flattenSvgPath, loadGeom, type Geom } from "@hackbuild/geom";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { distance, islands } from "@hackbuild/copper";
import { exportVinyl, runVinyl, sampleSlider, type VinylRun } from "@hackbuild/checks";
import { build, type KeywayBuild } from "../build";
import { chase as chaseModule, type KeywayParams } from "../chase.surface";
import { ROOT, chaseOf, loadInputs, paramsOf, read } from "../../_harness/vinyl";
import { vinylGoldens } from "../../../../core/src/commands/surface.js";

const DIR = "reference/copper/keyway";
const ACCEPT = process.env["HBF_ACCEPT_VINYL"] === "1";
const TOL = { areaFrac: 0.002, clearanceMm: 0.005, span: 0.002, travelMm: 0.1, netXorFrac: 0.005, brandMm: 0.005 } as const;

const profile = createProfileLookup(loadProfile());
const chase = chaseOf(DIR);
const inputs = loadInputs();
let g: Geom;
const runs = new Map<string, { b: KeywayBuild; r: VinylRun }>();

function at(edits?: Record<string, unknown>): { b: KeywayBuild; r: VinylRun } {
  const key = JSON.stringify(edits ?? {});
  let hit = runs.get(key);
  if (hit === undefined) {
    const b = build(paramsOf(chase, edits) as unknown as KeywayParams);
    hit = { b, r: runVinyl(g, b.draft, inputs, profile) };
    runs.set(key, hit);
  }
  return hit;
}

const golden = (name: string): unknown => (existsSync(new URL(`${DIR}/expected/${name}`, ROOT)) ? JSON.parse(read(`${DIR}/expected/${name}`)) : undefined);
const accepted: string[] = [];
function pin(name: string, fresh: unknown): void {
  if (ACCEPT) {
    mkdirSync(new URL(`${DIR}/expected/`, ROOT), { recursive: true });
    writeFileSync(new URL(`${DIR}/expected/${name}`, ROOT), `${JSON.stringify(fresh, null, 1)}\n`);
    accepted.push(name);
    return;
  }
  expect(fresh, `${DIR}/expected/${name}; rewrite with HBF_ACCEPT_VINYL=1 npx vitest run ${DIR}`).toEqual(golden(name));
}

const gateLines = (text: string): string[] => text.split("\n").filter((l) => /^(PASS|FAIL) /.test(l));
const CLEARANCE = /^(PASS|FAIL) min clearance ([\d.]+) mm at (\S+) \(gate ([\d.]+)\)$/;

/** The port's lines against the generator's, equal except the clearance line, whose pair must be in the port's tie. */
function sameGates(run: VinylRun, legacy: readonly string[]): void {
  expect(run.gates.map((x) => x.line).length).toBe(legacy.length);
  run.gates.forEach((x, i) => {
    const want = legacy[i]!;
    const m = CLEARANCE.exec(want);
    if (m === null) {
      expect(x.line, `gate ${i + 1}`).toBe(want);
      return;
    }
    const got = CLEARANCE.exec(x.line)!;
    expect([got[1], got[2], got[4]], `gate ${i + 1}`).toEqual([m[1], m[2], m[4]]);
    expect(String(x.finding.extra?.["ties"]).split(" "), `the generator's tightest pair ${m[3]} is one of the port's tied pairs`).toContain(m[3]);
  });
}

/** A legacy path string (y written as H - y) as a region. */
function legacyRegion(d: string, H: number): Section {
  return g.fromRings(flattenSvgPath(d, [1, 0, 0, -1, 0, H]), { fillRule: "EvenOdd", snap: false });
}

beforeAll(async () => {
  g = await loadGeom();
});

describe("KEYWAY on packages/copper against the shipped generator", () => {
  test("the surface chase reads as data and equals its module's export (D-178)", () => {
    expect(chaseOf(DIR)).toStrictEqual(chaseModule);
  });

  const legacy = JSON.parse(read(`${DIR}/legacy/keyway_geometry.json`)) as {
    params: Record<string, unknown>; stats: { copper_area: number; fingers: number; facing_edge_mm: number; min_clearance: number; slider_span: [number, number]; travel_mm: number };
    nets: Record<string, string>; velostat: string; spacer_lower: string; spacer_upper: string; wiper: string; foam: string; art: string;
  };

  test("45 gates pass, line for line with the 2026-10-04 rerun", () => {
    const { r } = at();
    const want = gateLines(read(`${DIR}/legacy/run-2026-10-04.txt`));
    expect(want).toHaveLength(45);
    sameGates(r, want);
    expect([r.passed, r.failed]).toEqual([45, 0]);
  });

  test("params round trip to the generator's P dict", () => {
    expect(at().b.params).toEqual(legacy.params);
  });

  test("stats: copper area, clearance, slider, fingers, clips and one document size", () => {
    const { b, r } = at();
    const s = legacy.stats;
    const area = r.board.copper.area();
    expect(Math.abs(area - s.copper_area) / s.copper_area).toBeLessThanOrEqual(TOL.areaFrac);
    const clr = r.gates.find((x) => x.line.includes("min clearance"))!;
    expect(Math.abs((clr.finding.measured as number) - s.min_clearance)).toBeLessThanOrEqual(TOL.clearanceMm);
    const sm = sampleSlider({ v: undefined as never, board: r.board, profile }, b.draft.sliders[0]!);
    expect(Math.abs(sm.span[0]! - s.slider_span[0])).toBeLessThanOrEqual(TOL.span);
    expect(Math.abs(sm.span[sm.span.length - 1]! - s.slider_span[1])).toBeLessThanOrEqual(TOL.span);
    expect(Math.abs(sm.travel - s.travel_mm)).toBeLessThanOrEqual(TOL.travelMm);
    expect(b.pads["P1"]!.fingers).toBe(s.fingers);
    expect(Math.round(b.pads["P1"]!.fingers * b.fingerOverlap)).toBe(s.facing_edge_mm);
    expect(b.terminals).toHaveLength(9);
    expect(2 * b.draft.clips!.pitch - b.draft.clips!.size).toBe(14);
    expect(r.layers.map((l) => l.size)).toEqual(Array(8).fill([110, 174]));
  });

  test("each net within 0.2 percent of the shipped net's area and 0.5 percent symmetric difference; film, spacers, wiper and caps equal", () => {
    const { r } = at();
    for (const [k, d] of Object.entries(legacy.nets)) {
      const L = legacyRegion(d, 174);
      const M = r.board.nets.get(k)!;
      const xor = L.difference(M).area() + M.difference(L).area();
      expect(Math.abs(M.area() - L.area()) / L.area(), k).toBeLessThanOrEqual(TOL.areaFrac);
      expect(xor / L.area(), k).toBeLessThanOrEqual(TOL.netXorFrac);
    }
    const layer = (id: string): Section => r.board.shape(r.board.draft.layers.find((l) => l.id === id)!.region);
    const want = (d: string): number => legacyRegion(d, 174).area();
    expect(layer("film").area()).toBeCloseTo(want(legacy.velostat), 6);
    expect(layer("spacer-lower").area()).toBeCloseTo(want(legacy.spacer_lower), 6);
    expect(layer("spacer-upper").area()).toBeCloseTo(want(legacy.spacer_upper), 6);
    expect(layer("wiper").area()).toBeCloseTo(want(legacy.wiper), 6);
    expect(layer("caps").area()).toBeCloseTo(want(legacy.foam), 6);
    expect(r.board.art.area()).toBeCloseTo(want(legacy.art), 3);
  });

  test("brand in copper: 45 gates line for line with the legacy brand run; copper, brand art and its distance as the generator computes them", () => {
    const { b, r } = at({ "/brand": true });
    sameGates(r, gateLines(read(`${DIR}/expected/oracle-brand.txt`)));
    const o = JSON.parse(read(`${DIR}/expected/oracle-brand-stats.json`)) as { copper_area: number; brand_area: number; brand_islands: number; brand_nearest_net: string; brand_nearest_mm: number; art_islands: number };
    expect(Math.abs(r.board.copper.area() - o.copper_area) / o.copper_area).toBeLessThanOrEqual(TOL.areaFrac);
    const brand = r.board.shape({ op: "union", of: b.draft.art.slice(0, 4) });
    expect(Math.abs(brand.area() - o.brand_area) / o.brand_area).toBeLessThanOrEqual(TOL.areaFrac);
    expect(islands(brand)).toBe(o.brand_islands);
    expect(islands(r.board.art)).toBe(o.art_islands);
    const near = [...r.board.nets].map(([k, s]) => [k, distance(brand, s)] as const).sort((x, y) => x[1] - y[1])[0]!;
    expect(near[0]).toBe(o.brand_nearest_net);
    expect(Math.abs(near[1] - o.brand_nearest_mm)).toBeLessThanOrEqual(TOL.brandMm);
  });
});

describe("KEYWAY goldens, edit and refusal", () => {
  test("gates, stats, layer documents and stack equal expected/", () => {
    const def = at();
    const brand = at({ "/brand": true });
    const surface = vinylGoldens(def.r);
    pin("gates.json", surface["gates.json"]);
    pin("gates-brand.json", vinylGoldens(brand.r)["gates.json"]);
    const sm = sampleSlider({ v: undefined as never, board: def.r.board, profile }, def.b.draft.sliders[0]!);
    pin("stats.json", {
      note: "computed by packages/copper and packages/checks at the chase defaults; tolerances are M05-T14's choice for a Clipper2 port of shapely geometry",
      tolerances: TOL,
      copperMm2: Number(def.r.board.copper.area().toFixed(4)),
      brandCopperMm2: Number(brand.r.board.copper.area().toFixed(4)),
      nets: Object.fromEntries([...def.r.board.nets].map(([k, s]) => [k, Number(s.area().toFixed(4))])),
      sliderSpan: [Number(sm.span[0]!.toFixed(6)), Number(sm.span[sm.span.length - 1]!.toFixed(6))],
      travelMm: Number(sm.travel.toFixed(6)),
    });
    pin("layers.json", surface["layers.json"]);
    pin("stack.json", surface["stack.json"]);
    if (!ACCEPT) expect((golden("stats.json") as { tolerances: unknown }).tolerances).toEqual(TOL);
  });

  test("the stack declares seven sheets, bottom first, thickness from profile; the guide has no stock row and is left out", () => {
    const s = at().r.stack;
    expect(s.layers.map((l) => [l.role, l.material, l.t])).toEqual([
      ["backer", "chipboard-2", profile.material("chipboard-2").thickness],
      ["conductor", "copper-tape", profile.material("copper-tape").thickness],
      ["spacer", "cardstock-030", profile.material("cardstock-030").thickness],
      ["resistive", "velostat", profile.material("velostat").thickness],
      ["spacer", "cardstock-030", profile.material("cardstock-030").thickness],
      ["conductor", "copper-tape", profile.material("copper-tape").thickness],
      ["face", "eva-2", profile.material("eva-2").thickness],
    ]);
    expect(new Set(s.layers.map((l) => l.registration))).toEqual(new Set(["outline"]));
    expect(s.layers[2]!.windows).toHaveLength(4);
    expect(s.layers[4]!.windows).toHaveLength(1);
  });

  test("an edit to one param moves the expected gates: clearance gate 1.10 fails only the clearance line and export refuses", () => {
    const base = at();
    const edit = { pointer: "/clr", from: 0.7, to: 1.1 };
    const after = at({ [edit.pointer]: edit.to });
    const flipped = after.r.gates.filter((x, i) => x.ok !== base.r.gates[i]!.ok).map((x) => x.line);
    const ex = exportVinyl(after.r);
    pin("edit.json", { ...edit, expect: { flipped, written: ex.written, failures: ex.written ? [] : ex.failures } });
    expect(flipped).toHaveLength(1);
    expect(flipped[0]).toMatch(/^FAIL min clearance 1\.000 mm at \S+ \(gate 1\.10\)$/);
    expect(ex.written).toBe(false);
  });

  test("export writes the eight layer documents only when every gate passes", () => {
    const ex = exportVinyl(at().r);
    expect(ex.written).toBe(true);
    if (ex.written) expect(ex.files.map((f) => f.file).sort()).toEqual([
      "01_copper_base.svg", "02_velostat.svg", "03_spacer_lower.svg", "04_spacer_upper.svg",
      "05_copper_wiper.svg", "06_foam_caps.svg", "07_backer.svg", "08_overlay_guide.svg",
    ]);
  });

  test("goldens were compared, not written", () => {
    if (ACCEPT) console.info(`accepted ${accepted.join(", ")}`);
    expect(ACCEPT || accepted.length === 0).toBe(true);
  });
});
