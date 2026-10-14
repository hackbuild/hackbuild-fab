// Build plates: a print scene packed onto an FDM bed and its layout handed
// to the 3MF writer as instances (M07-T08). A plate scene is data: the nest
// request, the FDM machine whose envelope bounds the bed and every part's
// height, and each part's mesh parked on z 0 at the origin (the
// build_plate.py rule, designs/ogee16/legacy/source/build_plate.py lines 43
// to 52), whose XY bounds are its footprint. packPlates runs nest on it;
// plateLayouts turns the result into one instance list per plate in the
// shape packages/3mf PlateLayout takes (nest does not import 3mf; tools/tiers.json
// lists no nest to 3mf edge, so the shape is structural). A placement's `at`
// is the footprint's minimum corner after the turn, and the 3MF writer turns
// a part about its origin and then moves it, so each instance moves by `at`
// less the turned footprint's minimum corner. For a 90 turn that is
// (x + d, y), d the depth, the plate page's writeSTL rule
// (designs/ogee16/legacy/source/plate_template.html lines 409 to 418).
//
// printableParts runs before a plate is written. The 1/1024 mm weld of the
// imported route can leave a triangle whose three distinct vertices land on
// one line: OGEE rowbar_asm.stl holds 4 (0 as read in float32, computed),
// and validate_3mf.py fails CHK-PRT-01 topology on them. A part whose audit
// fails only on zero-area triangles is rebuilt through manifold (the
// constructor merges and flips them away) and welded again, the route
// union.ts takes for a union that fails only on them; the rebuild is kept
// only when it audits clean with the same bounds and volume.

import { commandError, type NestRequest, type NestResult, type ProfileLookup, type QuarterTurn, type Vec2 } from "@hackbuild/spec";
import { audit, bounds, loadManifold, meshOf, signedVolume, snapWeld, toManifold, withScope } from "@hackbuild/mesh";
import { nest } from "./sheet-loop.js";

/** One printed part type of a plate scene. */
export interface PlatePart {
  /** Item id of the request, unique. */
  readonly id: string;
  /** Mesh parked on z 0 at the origin, mm, vertices on the 1/1024 mm grid (D-054). */
  readonly mesh: { readonly positions: Float64Array; readonly triangles: Uint32Array };
  /** Footprint width along x, mm (computed from the mesh). */
  readonly w: number;
  /** Footprint depth along y, mm (computed from the mesh). */
  readonly d: number;
  /** Height along z, mm (computed from the mesh). */
  readonly h: number;
}

export interface PlateScene {
  /** Scene id, lowercase slug. */
  readonly id: string;
  /** groupBy "type" gives each part type its own plates. */
  readonly request: NestRequest;
  /** FDM machine profile id whose envelope bounds request.sheet and every part height. */
  readonly machine: string;
  /** One per request item, same ids. */
  readonly parts: readonly PlatePart[];
  /** How the scene's numbers are qualified (D-007). */
  readonly qualifier: "computed" | "informational";
  /** Where each input came from, file and lines. */
  readonly sources: readonly string[];
}

/** One plate instance; packages/3mf PlateInstance by shape. */
export interface PlateInstanceOut {
  /** Bed offset of the part origin after the turn, mm. */
  readonly at: readonly [number, number, number];
  /** Counter-clockwise turn about +z seen from above, deg. */
  readonly rotZ: QuarterTurn;
}

/** The instances of one plate keyed by part id; packages/3mf PlateLayout by shape. */
export interface PlateLayoutOut {
  /** Plate index, count from 0. */
  readonly plate: number;
  readonly instances: Readonly<Record<string, readonly PlateInstanceOut[]>>;
}

const refuse = (path: string, got: unknown, expected: string, hint: string): never => {
  throw commandError({ code: "E_SCHEMA", path, got, expected, hint });
};

/** Refuses a bed the FDM envelope does not hold, a part taller than it, or parts that do not match the items. */
function boundBed(profile: ProfileLookup, scene: PlateScene): void {
  const env = profile.machine(scene.machine).envelope;
  if (!Array.isArray(env)) return refuse("/machine", scene.machine, "an FDM machine with a 3 axis envelope", `machine ${scene.machine} has a sheet envelope; name a printer`);
  const [eX, eY, eZ] = env as readonly [number, number, number];
  const [W, H] = scene.request.sheet;
  if (W > eX || H > eY) refuse("/request/sheet", [W, H], `a bed within ${eX} x ${eY} mm (machine ${scene.machine})`, "use the bed the printer has");
  const ids = scene.request.items.map((it) => it.id);
  scene.parts.forEach((p, i) => {
    if (!ids.includes(p.id)) refuse(`/parts/${i}/id`, p.id, ids.join(", "), "give every part a request item of the same id");
    if (p.h > eZ) refuse(`/parts/${i}/h`, p.h, `at most ${eZ} mm (machine ${scene.machine} height)`, `part ${p.id} is taller than the build volume`);
  });
  ids.forEach((id, i) => {
    if (!scene.parts.some((p) => p.id === id)) refuse(`/request/items/${i}/id`, id, "an item with a part mesh", `give item ${id} its mesh`);
  });
}

/** Packs a plate scene; throws a CommandError (E_SCHEMA) on a bed or part the machine cannot take. */
export function packPlates(scene: PlateScene, profile: ProfileLookup): NestResult {
  boundBed(profile, scene);
  return nest(scene.request);
}

/** Minimum corner of a w x d footprint at the origin after a counter-clockwise turn, mm. */
function turnedMin(w: number, d: number, rot: QuarterTurn): Vec2 {
  if (rot === 90) return [-d, 0];
  if (rot === 180) return [-w, -d];
  if (rot === 270) return [0, -w];
  return [0, 0];
}

/** One instance list per plate, in plate order; within a plate, ids in placement order and copies in copy order. */
export function plateLayouts(result: NestResult, parts: readonly PlatePart[]): PlateLayoutOut[] {
  const byId = new Map(parts.map((p) => [p.id, p]));
  const plates = Array.from({ length: result.sheets }, () => new Map<string, { copy: number; inst: PlateInstanceOut }[]>());
  for (const pl of result.placements) {
    const part = byId.get(pl.id);
    if (part === undefined) return refuse("/placements", pl.id, "a placement of a scene part", `placement ${pl.id} names no part mesh`);
    const [mx, my] = turnedMin(part.w, part.d, pl.rot);
    const list = plates[pl.sheet]!.get(pl.id) ?? [];
    list.push({ copy: pl.copy, inst: { at: [pl.at[0] - mx, pl.at[1] - my, 0], rotZ: pl.rot } });
    plates[pl.sheet]!.set(pl.id, list);
  }
  return plates.map((m, plate) => ({
    plate,
    instances: Object.fromEntries([...m].map(([id, list]) => [id, list.sort((a, b) => a.copy - b.copy).map((x) => x.inst)])),
  }));
}

/** Closed and consistently wound, failing only on zero-area triangles. */
const onlyDegenerate = (a: ReturnType<typeof audit>): boolean =>
  a.degenerate > 0 && a.openEdgesRaw === 0 && a.openEdges === 0 && a.windingErrors === 0 && a.nonManifoldVertices === 0 && a.signedVolumeMm3 > 0;

/** Volume a rebuild may move, relative (computed: the OGEE rowbar rebuild moves it by under 1e-9). */
const VOLUME_TOL = 1e-9;

/**
 * Parts ready for a 3MF: an audit-clean part as it is, a part failing only
 * on zero-area triangles rebuilt through manifold, anything else E_KERNEL.
 */
export async function printableParts(parts: readonly PlatePart[]): Promise<PlatePart[]> {
  const wasm = await loadManifold();
  return parts.map((p, i) => {
    const a = audit(p.mesh);
    if (a.ok) return p;
    const fail = (got: unknown): never => {
      throw commandError({ code: "E_KERNEL", path: `/parts/${i}`, got, expected: "a closed mesh whose only fault is zero-area triangles", hint: `part ${p.id} does not audit clean; export it again as a closed mesh` });
    };
    if (!onlyDegenerate(a)) return fail(`open edges ${a.openEdges}, winding errors ${a.windingErrors}, degenerate ${a.degenerate}, non-manifold vertices ${a.nonManifoldVertices}`);
    const mesh = withScope((scope) => snapWeld(meshOf(toManifold(wasm, scope, p.mesh, `/parts/${i}`))));
    const b = audit(mesh);
    const [lo0, hi0] = bounds(p.mesh), [lo1, hi1] = bounds(mesh);
    const same = [...lo0, ...hi0].every((v, k) => v === [...lo1, ...hi1][k]);
    const v0 = signedVolume(p.mesh), v1 = signedVolume(mesh);
    if (!b.ok || !same || Math.abs(v1 - v0) > VOLUME_TOL * v0) return fail(`rebuilt: degenerate ${b.degenerate}, bounds ${same ? "kept" : "moved"}, volume ${v0} to ${v1} mm3`);
    return { ...p, mesh };
  });
}
