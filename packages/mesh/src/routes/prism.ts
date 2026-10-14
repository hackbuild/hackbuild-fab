// The prism route (D-053): one outline extruded over a z range, no CSG.
// outline[0] is the outer ring and the rest are holes. Holes are read by
// position in the array, never by winding: geom normalises the outline
// (outer counter-clockwise, holes clockwise, Positive fill), so a hole drawn
// the same way round as its outer ring still cuts
// (knowledge/kernels/mesh-kernel.md section 2). prismMesh is the one prism
// implementation; the D-047 stage runner in stages.ts calls it.

import type { CommandError, Mm, Ring, ThrownCommandError, Vec2 } from "@hackbuild/spec";
import { commandError } from "@hackbuild/spec";
import { triangulate, type Geom, type Outline, type Triangulation } from "@hackbuild/geom";
import { snap, type MeshData } from "../hash.js";
import { audit } from "../audit.js";

/** Throwable CommandError for the transports (spec/errors.ts commandError). */
export const meshError: (hbf: CommandError) => ThrownCommandError = commandError;

/** z range on the snap grid, bottom below top, mm. */
export function snappedZ(z: readonly [Mm, Mm], path: string): readonly [Mm, Mm] {
  const lo = snap(z[0]);
  const hi = snap(z[1]);
  if (!(hi > lo)) {
    throw meshError({ code: "E_SCHEMA", path, got: z, expected: "z top above z bottom by at least 1/1024 mm", hint: "raise the top of the z range above its bottom" });
  }
  return [lo, hi];
}

// ---- constructive prism mesh, ported from BLOCKS Mesh.prism ----
// Canonical row mesh.prism/blocks-1 (D-156): originals/blocks/files/
// src-extracted/kernel.js, cleanRing lines 26 to 47, Mesh.prism lines 223
// to 236, _prismPoly lines 237 to 271. BOSS kernel.js is an older copy of
// the same kernel with 6 tries where BLOCKS has 14. geom replaces
// polygon-clipping: the outline is normalised by CrossSection (Positive
// fill, holes flagged by position) and snapped to the 1/1024 mm grid
// (D-054), and caps come from the geom earcut wrapper, whose ATTEMPTS are
// the rotated first try plus PRISM_RETRIES retries. An attempt is retried
// when its caps are degenerate or incomplete or when its shell fails the
// audit, as _prismPoly does. A shell that still fails after the retries is
// kept with a warning, never dropped (3MF dialect geometry rule 7).

/** Retries after the first cap triangulation, count (BLOCKS _prismPoly: tries 0 to 13, kernel.js lines 241, 248, 266). */
export const PRISM_RETRIES = 13;

/** A route warning in the Part IR shape (spec/part-ir.ts BuildWarning). */
export interface RouteWarning {
  readonly code: string;
  readonly text: string;
}

export interface PrismMesh {
  /** Every shell, one per outline component, in one indexed mesh. */
  readonly mesh: MeshData;
  /** Each shell on its own. */
  readonly shells: readonly MeshData[];
  /** Cap retries summed over the shells, count. */
  readonly retries: number;
  readonly warnings: readonly RouteWarning[];
}

/**
 * BOSS cleanRing on grid coordinates: drop a vertex within 5e-6 mm of the
 * one before it and the closing duplicate, then strip midpoints within
 * 2e-5 mm of the line through their neighbours. earcut skips collinear
 * midpoints, which leaves wall T-junctions against the caps.
 */
export function cleanRing(ring: Ring): Vec2[] {
  const tol = 5e-6;
  const out: Vec2[] = [];
  for (const p of ring) {
    const q2 = out[out.length - 1];
    if (q2 !== undefined && Math.abs(q2[0] - p[0]) < tol && Math.abs(q2[1] - p[1]) < tol) continue;
    out.push([p[0], p[1]]);
  }
  while (out.length > 1 && Math.abs(out[0]![0] - out[out.length - 1]![0]) < tol && Math.abs(out[0]![1] - out[out.length - 1]![1]) < tol) out.pop();
  let changed = true;
  while (changed && out.length > 3) {
    changed = false;
    for (let i = 0; i < out.length; i++) {
      const a = out[(i + out.length - 1) % out.length]!;
      const b = out[i]!;
      const c = out[(i + 1) % out.length]!;
      const cr = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      const l = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1;
      if (Math.abs(cr) / l < 2e-5) {
        out.splice(i, 1);
        changed = true;
        break;
      }
    }
  }
  return out;
}

/** One closed shell from a triangulated outline: caps from the triangulation, walls from the original rings. */
function shellOf(t: Triangulation, lo: Mm, hi: Mm): MeshData {
  const n = t.points.length;
  const pos = new Float64Array(n * 6);
  t.points.forEach(([x, y], k) => {
    pos.set([x, y, lo], k * 3);
    pos.set([x, y, hi], (k + n) * 3);
  });
  const idx: number[] = [];
  const tri = t.triangles;
  for (let i = 0; i < tri.length; i += 3) {
    idx.push(tri[i]! + n, tri[i + 1]! + n, tri[i + 2]! + n);
    idx.push(tri[i]!, tri[i + 2]!, tri[i + 1]!);
  }
  // outer counter-clockwise and holes clockwise, so one quad formula faces outward on both
  t.ringStarts.forEach((off, r) => {
    const end = t.ringStarts[r + 1] ?? n;
    const m = end - off;
    for (let i = 0; i < m; i++) {
      const a = off + i;
      const b = off + ((i + 1) % m);
      idx.push(a, b, b + n, a, b + n, a + n);
    }
  });
  return { positions: pos, triangles: Uint32Array.from(idx) };
}

/** Several meshes as one, indices offset. */
export function joinMeshes(list: readonly MeshData[]): MeshData {
  let nv = 0;
  let nt = 0;
  for (const m of list) {
    nv += m.positions.length;
    nt += m.triangles.length;
  }
  const positions = new Float64Array(nv);
  const triangles = new Uint32Array(nt);
  let pv = 0;
  let pt = 0;
  for (const m of list) {
    positions.set(m.positions, pv);
    const base = pv / 3;
    for (let i = 0; i < m.triangles.length; i++) triangles[pt + i] = m.triangles[i]! + base;
    pv += m.positions.length;
    pt += m.triangles.length;
  }
  return { positions, triangles };
}

/** The outline as geom components, cleaned on the grid; an outline with no area is E_SCHEMA. */
export function outlineComponents(geom: Geom, outline: readonly Ring[], path: string): Outline[] {
  if (outline.length === 0) {
    throw meshError({ code: "E_SCHEMA", path: `${path}/outline`, got: 0, expected: "an outer ring, then holes", hint: "give the prism an outer ring" });
  }
  outline.forEach((ring, i) => {
    if (ring.length < 3) throw meshError({ code: "E_SCHEMA", path: `${path}/outline/${i}`, got: ring.length, expected: "at least 3 vertices", hint: "give the ring three or more vertices" });
  });
  const section = geom.fromOutline(outline[0]!, outline.slice(1));
  const parts = section.components().map((c) => ({ outer: cleanRing(c.outer), holes: c.holes.map(cleanRing).filter((h) => h.length >= 3) }));
  const kept = parts.filter((c) => c.outer.length >= 3);
  if (kept.length === 0) {
    throw meshError({ code: "E_SCHEMA", path: `${path}/outline`, got: 0, expected: "an outline with area on the 1/1024 mm grid", hint: "widen the outline; it collapses on the snap grid" });
  }
  return kept;
}

/** Constructive prism over [z0, z1], one closed shell per outline component, no CSG. */
export function prismMesh(geom: Geom, outline: readonly Ring[], z: readonly [Mm, Mm], path = ""): PrismMesh {
  return prismFromComponents(outlineComponents(geom, outline, path), z, path);
}

/** Constructive prism over outline components already normalised and on the grid. */
export function prismFromComponents(components: readonly Outline[], z: readonly [Mm, Mm], path = ""): PrismMesh {
  const [lo, hi] = snappedZ(z, `${path}/z`);
  const shells: MeshData[] = [];
  const warnings: RouteWarning[] = [];
  let retries = 0;
  for (const c of components) {
    // BLOCKS _prismPoly retries while the whole shell fails auditIndexed
    // (kernel.js line 265), not only while the caps are degenerate, so the
    // shell audit is the acceptance test for each attempt.
    const audited = new Map<Triangulation, { readonly shell: MeshData; readonly a: ReturnType<typeof audit> }>();
    const t = triangulate(c, (tried) => {
      const s = shellOf(tried, lo, hi);
      const a = audit(s);
      audited.set(tried, { shell: s, a });
      return a.ok;
    });
    retries += t.attempt;
    // the returned attempt's shell, audited once more unless accept already did
    const shell = audited.get(t)?.shell ?? shellOf(t, lo, hi);
    const a = audited.get(t)?.a ?? audit(shell);
    if (t.degenerate > 0 || !t.complete) {
      warnings.push({ code: "PRISM_DEGENERATE", text: `cap triangulation degenerate after ${t.attempt} retries, ${t.degenerate} slivers, kept: ${path || "/"}` });
    } else if (t.attempt > 0) {
      warnings.push({ code: "PRISM_RETRY", text: `cap triangulated on retry ${t.attempt} of ${PRISM_RETRIES}: ${path || "/"}` });
    }
    if (!a.ok) {
      warnings.push({ code: "PRISM_NOT_MANIFOLD", text: `prism shell not manifold after retries, open edges ${a.openEdges}, winding errors ${a.windingErrors}, kept: ${path || "/"}` });
    }
    shells.push(shell);
  }
  return { mesh: joinMeshes(shells), shells, retries, warnings };
}
