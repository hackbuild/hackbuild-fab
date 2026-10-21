// OGEE16 swept cranks scene (M02-T07): check_sweep.py main (lineage
// ogee16.check-sweep/r16p) over the shipped print STLs, stored as
// inputs/ogee16/print/<name>.stl (members of ogee16-print-stl.zip, lineage
// ogee16.print-stl), or the proud-head fixture
// (designs/ogee16/extract/fixtures/proud-head). The crank placements
// and the rest pose of audit_print.build come from the OGEE16 kinematics in
// packages/motion (D-139) through the binding core hands the loader
// (src/place.ts), with every dimension read from params.scad there; this
// file computes no pose. Nothing physical is typed here: the step count and
// the clash volume are profile constants ogee16.sweepSteps and
// ogee16.sweepClashMm3.

import { readFileSync } from "node:fs";
import { importStl, type MeshData } from "@hackbuild/mesh";
import { commandError } from "@hackbuild/spec";
import type { BindKinematics, Mat4, SceneKinematics } from "../src/place.js";
import { rotateSweep, type Obstacle, type RotateSweepResult, type RotatingPart } from "../src/sweep/rotate.js";

/** The stored print STLs of the OGEE16 scenes (inputs/stored-inputs.json). */
export const OGEE_PRINT = new URL("inputs/ogee16/print/", import.meta.url);
const FIXTURE = new URL("../../../designs/ogee16/extract/fixtures/proud-head/", import.meta.url);

export type Variant = "shipped" | "proud";
export const CRANK_FILES = ["crank_row_asm", "crank_col_asm", "crank_latch_asm"] as const;

// ------------------------------------------------------------ kinematics

let kin: SceneKinematics["ogee16"] | undefined;
/** The scene loader (src/scenes.ts) and core/test bind the OGEE16 kinematics of packages/motion here. */
export const bindKinematics: BindKinematics = (k) => {
  kin = k.ogee16;
};

function bound(): SceneKinematics["ogee16"] {
  if (kin === undefined) throw new Error("scenes/ogee16-cranks.ts has no kinematics bound: core binds packages/motion through SceneDeps.kinematics (sim takes place(pose), D-139)");
  return kin;
}

/** The params.scad scalars, as the bound kinematics read them (kin.load_params). */
export function ogeeParams(): ReadonlyMap<string, number> {
  return bound().params;
}

/** A parameter params.scad must define; a missing one is a port fault, never a default. */
function need(P: ReadonlyMap<string, number>, k: string): number {
  const v = P.get(k);
  if (v === undefined) throw commandError({ code: "E_REF", path: `/params/${k}`, got: null, expected: "a scalar params.scad defines", hint: `params.scad defines no ${k}; check packages/motion/inputs/ogee16/params.scad against its stored-inputs.json sha256`, record: "viewer-sim" });
  return v;
}

// ------------------------------------------------------------ meshes

const cache = new Map<string, MeshData>();

/** One OGEE16 STL as a welded mesh (the imported route, D-053); cranks come from the fixture when variant is proud. */
export function ogeeMesh(name: string, variant: Variant = "shipped"): MeshData {
  const proud = variant === "proud" && (CRANK_FILES as readonly string[]).includes(name);
  const key = (proud ? "fixtures/proud-head/" : "print/") + name;
  let m = cache.get(key);
  if (m === undefined) {
    m = importStl(readFileSync(proud ? new URL(`${name}.stl`, FIXTURE) : new URL(`${name}.stl`, OGEE_PRINT)), `${name}.stl`).mesh;
    cache.set(key, m);
  }
  return m;
}

// ------------------------------------------------------------ check_sweep.py main

/** The nine rotating cranks in check_sweep.py order: four row, four column, the latch. */
export function ogeeCranks(P: ReadonlyMap<string, number>, variant: Variant): RotatingPart[] {
  const k = bound();
  const n = need(P, "N");
  const out: RotatingPart[] = [];
  for (let i = 0; i < n; i += 1) out.push({ name: `row crank ${i}`, mesh: ogeeMesh("crank_row_asm", variant), place: (u) => k.crank("row", i, u) });
  for (let j = 0; j < n; j += 1) out.push({ name: `col crank ${j}`, mesh: ogeeMesh("crank_col_asm", variant), place: (u) => k.crank("col", j, u) });
  out.push({ name: "latch crank", mesh: ogeeMesh("crank_latch_asm", variant), place: (u) => k.crank("latch", 0, u) });
  return out;
}

/** The bought servo envelopes check_sweep.py boxes, as obstacles. */
export function servoBoxes(P: ReadonlyMap<string, number>): Obstacle[] {
  const n = need(P, "N"), pitch = need(P, "PITCH");
  const L = need(P, "SV_L"), W = need(P, "SV_W"), H = need(P, "SV_H");
  const out: Obstacle[] = [];
  for (let i = 0; i < n; i += 1) {
    out.push({ name: `row ${i} servo`, kind: "box", box: { center: [need(P, "RSV_CRK") + need(P, "SV_T_CRK0") - H / 2, i * pitch + need(P, "ROW_BAR_Y"), need(P, "RSV_Z")], extents: [H, L, W] } });
  }
  for (let j = 0; j < n; j += 1) {
    out.push({ name: `col ${j} servo`, kind: "box", box: { center: [j * pitch + need(P, "COL_BAR_X"), need(P, "CSV_CRK") + need(P, "SV_T_CRK0") - H / 2, need(P, "CSV_Z")], extents: [L, H, W] } });
  }
  const z0 = need(P, "LSV_BRK_Z") - need(P, "SV_T_BRK0");
  out.push({ name: "latch servo", kind: "box", box: { center: [need(P, "LSV_X") - need(P, "SV_SHAFT_OFF"), need(P, "LSV_Y"), z0 + H / 2], extents: [L, W, H] } });
  return out;
}

/** check_sweep.py OK: the parts a swept crank may touch, by name prefix. */
export const SWEEP_ALLOWED = ["rowbar", "colbar", "latch", "shaft", "crank", "base", "wall", "rail", "latchtower", "svbracket"] as const;

/** audit_print.build at rest (all rises 0, latch plate home), as named placed meshes in its order. */
export function restParts(P: ReadonlyMap<string, number>): { name: string; file: string; at: Mat4 }[] {
  const z0 = Array.from({ length: need(P, "N") }, () => 0);
  return bound().place({ zR: z0, zC: z0, lp: 0 }).map((p) => ({ ...p }));
}

/** The obstacles of one sweep: every servo box, then every rest part not in SWEEP_ALLOWED. */
export function sweepObstacles(P: ReadonlyMap<string, number>): Obstacle[] {
  const parts = restParts(P).filter((p) => !SWEEP_ALLOWED.some((o) => p.name.startsWith(o)));
  return [...servoBoxes(P), ...parts.map((p): Obstacle => ({ name: p.name, kind: "mesh", mesh: ogeeMesh(p.file), at: p.at }))];
}

export interface OgeeClash { readonly sweep: string; readonly with: string; readonly mm3: number; readonly stepSumMm3: number }
/** A crank's closest servo box by the oracle's corner measure, with the true gap to that same box, mm (computed). */
export interface OgeeNear { readonly sweep: string; readonly box: string; readonly cornerMm: number; readonly gapMm: number }
export interface OgeeSweepRun { readonly variant: Variant; readonly results: readonly RotateSweepResult[]; readonly clashes: readonly OgeeClash[]; readonly near: readonly OgeeNear[] }

/**
 * check_sweep.py main on one variant: every crank swept through `steps`
 * placements; a hit over clashMm3 is a swept collision, and each crank's
 * closest approach is its smallest corner distance to a servo box, the
 * first box winning a tie as the oracle's strict less-than does.
 */
export async function runOgeeSweep(variant: Variant, steps: number, clashMm3: number): Promise<OgeeSweepRun> {
  const P = ogeeParams();
  const obstacles = sweepObstacles(P);
  const results: RotateSweepResult[] = [];
  for (const crank of ogeeCranks(P, variant)) results.push(await rotateSweep(crank, obstacles, steps));
  const clashes: OgeeClash[] = [];
  const near: OgeeNear[] = [];
  for (const r of results) {
    for (const h of r.hits) if (h.mm3 > clashMm3) clashes.push({ sweep: r.part, with: h.with, mm3: h.mm3, stepSumMm3: h.stepSumMm3 });
    let best = r.approach[0]!;
    for (const a of r.approach) if (a.cornerMm < best.cornerMm) best = a;
    near.push({ sweep: r.part, box: best.with, cornerMm: best.cornerMm, gapMm: best.gapMm });
  }
  return { variant, results, clashes, near };
}
