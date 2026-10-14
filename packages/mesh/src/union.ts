// Union per D-055 (M00-T04 step 3). The batch union failed on coplanar
// faces and the pairwise fold on shared edges in PINTLE (plan-deltas R51),
// so neither result is trusted until it reads as a closed positive volume:
// status NoError, a clean audit, volume above 0. Every object made here is
// owned by the caller's open scope (wasm.ts). Two bodies that share an
// exact face can leave collinear zero-area triangles in the batch result
// (knowledge/03-diagnostics.md); simplify at the solid's own tolerance
// keeps a subset of its vertices, so grid points and volume hold. Where
// two kernel vertices sit under half a grid step apart, the D-054 snap puts
// them on one point and the triangle between them reads zero area; that
// candidate is taken, last, only when its snapped and welded mesh (what
// every shipped body becomes) audits clean (fidelity audit, flex-pair
// preset two: 2 such triangles in a 15-solid partition cutter, computed).
// Where three solids share one face plane and their edges end along one
// line, the batch and the fold leave a cap: a zero-area triangle whose three
// grid vertices are distinct and collinear, one lying on the edge between
// the other two (THINPOT ladder base, three slabs on the face x 37.76 with
// laps of 0.01 to 0.03 mm, M06-T09 finding). simplify() keeps it below a
// tolerance of one grid step. The page itself never unions: it hands the
// overlapping slabs to the slicer as one object (feeler_thinpot.html
// Mesh.prism, lines 778 to 798), which fills their union. The last
// candidate here flips each cap into the triangle across its long edge, a
// change of triangulation that keeps every vertex and the volume.

import type { ErrorStatus, Manifold } from "manifold-3d";
import { audit, MIN_TRIANGLE_AREA_MM2, type MeshAudit } from "./audit.js";
import { kernel } from "./wasm.js";
import { meshError } from "./routes/prism.js";
import { meshOf, snapWeld, type MeshData } from "./hash.js";

export interface UnionReport {
  readonly solid: Manifold;
  /** single: one input, returned as is; batch: Manifold.union; simplified: the batch after simplify(); fold: a.add(b) in list order; capped: a candidate with its caps flipped. */
  readonly via: "single" | "batch" | "simplified" | "fold" | "welded" | "capped";
  /** Why the batch was refused, when the fold ran. */
  readonly batchRefused?: string;
  /** welded: which candidate was taken because only its unwelded snap held zero-area triangles; capped: which one had its caps flipped. */
  readonly welded?: "batch" | "fold";
}

/** Twice the area of triangle abc, mm2. */
function area2(p: Float64Array, a: number, b: number, c: number): number {
  const ux = p[b * 3]! - p[a * 3]!, uy = p[b * 3 + 1]! - p[a * 3 + 1]!, uz = p[b * 3 + 2]! - p[a * 3 + 2]!;
  const vx = p[c * 3]! - p[a * 3]!, vy = p[c * 3 + 1]! - p[a * 3 + 1]!, vz = p[c * 3 + 2]! - p[a * 3 + 2]!;
  return Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx);
}

const len2 = (p: Float64Array, a: number, b: number): number =>
  (p[a * 3]! - p[b * 3]!) ** 2 + (p[a * 3 + 1]! - p[b * 3 + 1]!) ** 2 + (p[a * 3 + 2]! - p[b * 3 + 2]!) ** 2;

/**
 * Flip every cap of a closed mesh: a triangle under MIN_TRIANGLE_AREA_MM2
 * with three distinct vertices, the middle one on the edge between the
 * other two. Triangle (B, C, A) and its neighbour (C, B, D) across the long
 * edge become (C, A, D) and (A, B, D): the long edge leaves the mesh, every
 * other edge keeps its twin, no vertex moves, and the two new triangles
 * cover the neighbour exactly. Null when a cap has no neighbour across its
 * long edge or the flips do not settle within one pass per triangle.
 */
export function flipCaps(mesh: MeshData): MeshData | null {
  const p = mesh.positions;
  const tris = Array.from(mesh.triangles);
  const edge = new Map<string, number>();
  const key = (a: number, b: number): string => `${a},${b}`;
  const index = (t: number): void => {
    for (let k = 0; k < 3; k++) edge.set(key(tris[t * 3 + k]!, tris[t * 3 + ((k + 1) % 3)]!), t);
  };
  const unindex = (t: number): void => {
    for (let k = 0; k < 3; k++) edge.delete(key(tris[t * 3 + k]!, tris[t * 3 + ((k + 1) % 3)]!));
  };
  const n = tris.length / 3;
  for (let t = 0; t < n; t++) index(t);
  const minArea2 = 2 * MIN_TRIANGLE_AREA_MM2;
  for (let pass = 0; pass <= n; pass++) {
    let flipped = false;
    for (let t = 0; t < n; t++) {
      const v = [tris[t * 3]!, tris[t * 3 + 1]!, tris[t * 3 + 2]!];
      if (v[0] === v[1] || v[1] === v[2] || v[0] === v[2]) continue;
      if (area2(p, v[0]!, v[1]!, v[2]!) >= minArea2) continue;
      // the long edge is the one opposite the middle vertex
      const k = [0, 1, 2].reduce((m, i) => (len2(p, v[i]!, v[(i + 1) % 3]!) > len2(p, v[m]!, v[(m + 1) % 3]!) ? i : m), 0);
      const B = v[k]!, C = v[(k + 1) % 3]!, A = v[(k + 2) % 3]!;
      const u = edge.get(key(C, B));
      if (u === undefined || u === t) return null;
      const w = [tris[u * 3]!, tris[u * 3 + 1]!, tris[u * 3 + 2]!];
      const j = w.findIndex((x, i) => x === C && w[(i + 1) % 3] === B);
      const D = w[(j + 2) % 3]!;
      if (D === A) return null;
      unindex(t); unindex(u);
      tris.splice(t * 3, 3, C, A, D);
      tris.splice(u * 3, 3, A, B, D);
      index(t); index(u);
      flipped = true;
    }
    if (!flipped) return { positions: p, triangles: Uint32Array.from(tris) };
  }
  return null;
}

interface Verdict {
  readonly ok: boolean;
  readonly status: ErrorStatus;
  readonly audit?: MeshAudit;
  readonly volumeMm3: number;
}

function verify(solid: Manifold): Verdict {
  const status = solid.status();
  if (status !== "NoError" || solid.isEmpty()) return { ok: false, status, volumeMm3: 0 };
  const volumeMm3 = solid.volume();
  if (!(volumeMm3 > 0)) return { ok: false, status, volumeMm3 };
  const report = audit(meshOf(solid));
  return { ok: report.ok, status, audit: report, volumeMm3 };
}

/** Closed and consistently wound, failing only on zero-area triangles. */
function onlyDegenerate(v: Verdict): boolean {
  const a = v.audit;
  return a !== undefined && a.degenerate > 0 && a.openEdgesRaw === 0 && a.openEdges === 0 && a.windingErrors === 0 && a.nonManifoldVertices === 0 && a.signedVolumeMm3 > 0;
}

/** Fails only on zero-area triangles that the D-054 snap and weld collapse, leaving a clean closed mesh. */
function weldsClean(solid: Manifold, v: Verdict): boolean {
  return onlyDegenerate(v) && audit(snapWeld(meshOf(solid))).ok;
}

/** The candidate rebuilt from its snapped mesh with the caps flipped, when that verifies; undefined otherwise. */
function cappedOf(solid: Manifold, v: Verdict): Manifold | undefined {
  if (!onlyDegenerate(v)) return undefined;
  const flipped = flipCaps(snapWeld(meshOf(solid)));
  if (flipped === null || !audit(flipped).ok) return undefined;
  const wasm = kernel();
  const mesh = new wasm.Mesh({ numProp: 3, vertProperties: Float32Array.from(flipped.positions), triVerts: Uint32Array.from(flipped.triangles) });
  mesh.merge();
  const rebuilt = new wasm.Manifold(mesh);
  return verify(rebuilt).ok ? rebuilt : undefined;
}

function describe(v: Verdict): string {
  if (v.status !== "NoError") return `status ${v.status}`;
  if (v.audit === undefined) return `volume ${v.volumeMm3} mm3 (computed)`;
  const a = v.audit;
  return `open edges ${a.openEdges}, winding errors ${a.windingErrors}, degenerate ${a.degenerate}, non-manifold vertices ${a.nonManifoldVertices}, volume ${a.signedVolumeMm3} mm3 (computed)`;
}

/** Where a union sits in the build, so a refusal names it: a JSON pointer and the ids of its operands in list order. */
export interface UnionSite {
  readonly path: string;
  readonly members?: readonly string[];
}

/**
 * Union with the route it took; throws E_KERNEL when both the batch and the
 * fold fail verification. With `at`, the refusal carries its path and names
 * the operands, so a coincident-face failure points at the bodies or
 * features that meet instead of at no one.
 */
export function unionReport(list: readonly Manifold[], at?: UnionSite): UnionReport {
  const first = list[0];
  if (first === undefined) {
    throw meshError({ code: "E_KERNEL", got: 0, expected: "at least one solid", hint: "declare at least one solid to union", record: "mesh-kernel" });
  }
  if (list.length === 1) return { solid: first, via: "single" };

  const batch = kernel().Manifold.union([...list]);
  const batchVerdict = verify(batch);
  if (batchVerdict.ok) return { solid: batch, via: "batch" };
  if (onlyDegenerate(batchVerdict)) {
    const simplified = batch.simplify();
    if (verify(simplified).ok) return { solid: simplified, via: "simplified", batchRefused: describe(batchVerdict) };
  }

  let acc = first;
  for (const next of list.slice(1)) acc = acc.add(next);
  const foldVerdict = verify(acc);
  if (foldVerdict.ok) return { solid: acc, via: "fold", batchRefused: describe(batchVerdict) };
  if (weldsClean(batch, batchVerdict)) return { solid: batch, via: "welded", welded: "batch", batchRefused: describe(batchVerdict) };
  if (weldsClean(acc, foldVerdict)) return { solid: acc, via: "welded", welded: "fold", batchRefused: describe(batchVerdict) };
  for (const [solid, v, which] of [[batch, batchVerdict, "batch"], [acc, foldVerdict, "fold"]] as const) {
    const capped = cappedOf(solid, v);
    if (capped !== undefined) return { solid: capped, via: "capped", welded: which, batchRefused: describe(batchVerdict) };
  }

  const members = at?.members !== undefined && at.members.length > 0 ? ` of ${at.members.join(", ")}` : "";
  throw meshError({
    code: "E_KERNEL",
    ...(at === undefined ? {} : { path: at.path }),
    got: { batch: describe(batchVerdict), fold: describe(foldVerdict) },
    expected: "a closed positive volume with a clean audit",
    hint: `${at === undefined ? "" : `the union at ${at.path}${members} is refused; `}separate solids that touch at an edge or a corner, or overlap them`,
    record: "mesh-kernel",
  });
}

/** Union of list per D-055: batch, verified, else pairwise fold, verified, else a candidate clean once welded on the grid, else one clean once its caps are flipped. */
export function union(list: readonly Manifold[]): Manifold {
  return unionReport(list).solid;
}
