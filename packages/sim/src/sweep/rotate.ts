// Rotational swept volume (M02-T07), ported from OGEE16 check_sweep.py
// `swept()` and the loop of `main()` (lineage ogee16.check-sweep/r16p).
// A rotating part is placed at `steps` evenly spaced values of its motion
// parameter u, 0 to 1 inclusive, and the swept region is the union of the
// placed copies. The oracle concatenates the copies (trimesh.util.concatenate)
// and hands the overlapping shells to the boolean; the port counts a region
// once, and reports the per-step sum beside it so the two can be compared.
//
// The swept region is measured and never built (its own volume is not
// reported: the 25 overlapping copies of one bar crank take 7.8 s to resolve,
// measured on an Apple M1, and the card asks only for what it hits). Its
// volume in common with an obstacle is the obstacle's volume less what is
// left after every copy that reaches it is subtracted in turn, the same set
// as obstacle and union. The verified union (@hackbuild/mesh) is not used:
// it audits on the D-054 grid and refuses the 25 placed copies of a shipped
// OGEE16 bar crank with E_KERNEL (open edges and non-manifold vertices after
// the weld). Distances are taken over the placed copies' own triangles,
// which for a point outside every copy equals the distance to the union.
//
// The sim measures and never decides: every volume and distance is
// returned; the caller's declared threshold turns them into clashes.

import type { Box as ManifoldBox, Manifold } from "manifold-3d";
import { kernel, loadManifold, meshHash, scope, type MeshData } from "@hackbuild/mesh";
import { commandError, type Hash, type Vec3 } from "@hackbuild/spec";
import type { Mat4 } from "../place.js";
import { boxCorners, boxToMesh, pointsToMesh, type Box } from "../closest.js";

/** A rotating part: its mesh in its own frame and its placement at motion parameter u in [0, 1] (row-major 4x4). */
export interface RotatingPart {
  readonly name: string;
  readonly mesh: MeshData;
  readonly place: (u: number) => Mat4;
}

/** Something the swept part may hit: a placed mesh, or an axis-aligned box (a bought servo envelope). */
export type Obstacle =
  | { readonly name: string; readonly kind: "mesh"; readonly mesh: MeshData; readonly at: Mat4 }
  | { readonly name: string; readonly kind: "box"; readonly box: Box };

export interface SweepHit {
  readonly with: string;
  /** Volume the swept region shares with the obstacle, each point counted once, mm3 (computed). */
  readonly mm3: number;
  /** Sum over the steps of each placed copy's volume in common with the obstacle, mm3 (computed). */
  readonly stepSumMm3: number;
}

export interface BoxApproach {
  readonly with: string;
  /** check_sweep.py measure: the eight box corners to the swept surface, mm (computed). */
  readonly cornerMm: number;
  /** True gap from the box solid to the swept surface, mm (computed); 0 on contact. */
  readonly gapMm: number;
  /** Point of the swept surface at the true gap, mm. */
  readonly at: Vec3;
  /** Step index of the copy that holds that point. */
  readonly step: number;
}

export interface RotateSweepResult {
  readonly part: string;
  /** Placements evaluated, count. */
  readonly poses: number;
  /** meshHash (D-175) of the placed copies taken together. */
  readonly sweptHash: Hash;
  /** Every obstacle the swept region shares volume with, largest first. */
  readonly hits: readonly SweepHit[];
  /** One row per box obstacle, in obstacle order. */
  readonly approach: readonly BoxApproach[];
  /** Mesh obstacles skipped because their bounds miss the swept bounds (check_sweep.py's bounds test), count. */
  readonly skipped: number;
}

/** Row-major 4x4 to the column-major array Manifold.transform takes. */
const colMajor = (m: Mat4): number[] => [m[0]!, m[4]!, m[8]!, 0, m[1]!, m[5]!, m[9]!, 0, m[2]!, m[6]!, m[10]!, 0, m[3]!, m[7]!, m[11]!, 1];

/** Positions of mesh under a row-major 4x4. */
export function placeMesh(mesh: MeshData, m: Mat4): MeshData {
  const p = mesh.positions;
  const out = new Float64Array(p.length);
  for (let i = 0; i < p.length; i += 3) {
    const x = p[i]!, y = p[i + 1]!, z = p[i + 2]!;
    out[i] = m[0]! * x + m[1]! * y + m[2]! * z + m[3]!;
    out[i + 1] = m[4]! * x + m[5]! * y + m[6]! * z + m[7]!;
    out[i + 2] = m[8]! * x + m[9]! * y + m[10]! * z + m[11]!;
  }
  return { positions: out, triangles: mesh.triangles };
}

function concat(meshes: readonly MeshData[]): MeshData {
  const nPos = meshes.reduce((s, m) => s + m.positions.length, 0);
  const nTri = meshes.reduce((s, m) => s + m.triangles.length, 0);
  const positions = new Float64Array(nPos);
  const triangles = new Uint32Array(nTri);
  let p = 0, t = 0;
  for (const m of meshes) {
    positions.set(m.positions, p);
    for (let i = 0; i < m.triangles.length; i += 1) triangles[t + i] = m.triangles[i]! + p / 3;
    p += m.positions.length;
    t += m.triangles.length;
  }
  return { positions, triangles };
}

function solidOf(mesh: MeshData): Manifold {
  const wasm = kernel();
  const m = new wasm.Mesh({ numProp: 3, vertProperties: Float32Array.from(mesh.positions), triVerts: Uint32Array.from(mesh.triangles) });
  m.merge();
  const s = wasm.Manifold.ofMesh(m);
  const status = s.status();
  if (status !== "NoError") {
    throw commandError({ code: "E_KERNEL", got: status, expected: "NoError", hint: `the kernel refused a sweep mesh (${status}); check it is closed`, record: "viewer-sim" });
  }
  return s;
}

const boundsCache = new WeakMap<MeshData, Map<Mat4, ManifoldBox>>();

/** Bounds of mesh under a placement, kept per mesh and placement so a scene's obstacles are bounded once. */
function placedBounds(mesh: MeshData, at: Mat4): ManifoldBox {
  let byAt = boundsCache.get(mesh);
  if (byAt === undefined) boundsCache.set(mesh, (byAt = new Map()));
  let b = byAt.get(at);
  if (b === undefined) {
    const p = placeMesh(mesh, at).positions;
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < p.length; i += 1) {
      const k = i % 3;
      if (p[i]! < min[k]!) min[k] = p[i]!;
      if (p[i]! > max[k]!) max[k] = p[i]!;
    }
    b = { min: min as never, max: max as never };
    byAt.set(at, b);
  }
  return b;
}

const disjoint = (a: ManifoldBox, b: ManifoldBox): boolean =>
  [0, 1, 2].some((k) => a.max[k]! < b.min[k]! || b.max[k]! < a.min[k]!);

/** Volume solid shares with the union of cutters, each point once: solid less what survives every cutter. */
function sharedMm3(solid: Manifold, cutters: readonly Manifold[]): number {
  let rest = solid;
  for (const c of cutters) rest = rest.subtract(c);
  return solid.volume() - rest.volume();
}

/**
 * Sweep one rotating part through `steps` placements and measure it against
 * the obstacles. Every kernel object is made and freed inside one scope
 * (D-055); the result is plain data.
 */
export async function rotateSweep(part: RotatingPart, obstacles: readonly Obstacle[], steps: number): Promise<RotateSweepResult> {
  await loadManifold();
  if (!(Number.isInteger(steps) && steps >= 2)) {
    throw commandError({ code: "E_SCHEMA", path: "/steps", got: steps, expected: "an integer of at least 2", hint: `steps ${steps}, legal an integer of at least 2; a sweep needs both ends of the motion`, record: "viewer-sim" });
  }
  const placements = Array.from({ length: steps }, (_, k) => part.place(k / (steps - 1)));
  const placed = placements.map((m) => placeMesh(part.mesh, m));
  const surface = concat(placed);
  return scope(() => {
    const wasm = kernel();
    const base = solidOf(part.mesh);
    const copies = placements.map((m) => base.transform(colMajor(m) as never));
    const boxes = copies.map((c) => c.boundingBox());
    const lo = [0, 1, 2].map((k) => Math.min(...boxes.map((b) => b.min[k]!)));
    const hi = [0, 1, 2].map((k) => Math.max(...boxes.map((b) => b.max[k]!)));
    const sweptBox: ManifoldBox = { min: lo as never, max: hi as never };

    const hits: SweepHit[] = [];
    const approach: BoxApproach[] = [];
    let skipped = 0;
    for (const ob of obstacles) {
      let solid: Manifold;
      if (ob.kind === "box") {
        solid = wasm.Manifold.cube([ob.box.extents[0], ob.box.extents[1], ob.box.extents[2]], true).translate([ob.box.center[0], ob.box.center[1], ob.box.center[2]]);
        const corners = boxCorners(ob.box);
        let cornerMm = Infinity, gapMm = Infinity, at: Vec3 = [NaN, NaN, NaN], step = -1;
        placed.forEach((m, k) => {
          cornerMm = Math.min(cornerMm, pointsToMesh(corners, m).mm);
          const g = boxToMesh(ob.box, m);
          if (g.mm < gapMm) {
            gapMm = g.mm;
            at = g.at;
            step = k;
          }
        });
        approach.push({ with: ob.name, cornerMm, gapMm, at, step });
      } else {
        if (disjoint(sweptBox, placedBounds(ob.mesh, ob.at))) {
          skipped += 1;
          continue;
        }
        solid = solidOf(ob.mesh).transform(colMajor(ob.at) as never);
      }
      const obBox = solid.boundingBox();
      const reaching = copies.filter((_, k) => !disjoint(boxes[k]!, obBox));
      let stepSumMm3 = 0;
      for (const c of reaching) stepSumMm3 += solid.intersect(c).volume();
      if (!(stepSumMm3 > 0)) continue;
      hits.push({ with: ob.name, mm3: sharedMm3(solid, reaching), stepSumMm3 });
    }
    hits.sort((a, b) => b.mm3 - a.mm3 || (a.with < b.with ? -1 : 1));
    return { part: part.name, poses: steps, sweptHash: meshHash(surface), hits, approach, skipped };
  });
}
