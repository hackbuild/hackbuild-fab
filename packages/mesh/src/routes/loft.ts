// Loft mesher (geometry-strategy.md section 6 item 4): fixed count sections
// joined vertex to vertex, capped by the geom earcut wrapper, every vertex
// snapped to the 1/1024 mm grid (D-054). The skin is the TENON revolve
// pattern (part2.js revolve, line 220: rings of N vertices, two triangles
// per quad, flipped when the signed volume comes out negative) with the
// pole rows replaced by triangulated caps, as the prototype loft
// (fab-knowledge:evidence/geom-proto-2026-10-20/proto.mjs line 40) needs
// for sections that are not star shaped about the origin. sweep.ts places
// one section along a path and skins it with the same function. Pure
// functions returning MeshData; no route registration here.

import { triangulate } from "@hackbuild/geom";
import type { Mm, Ring, Vec2 } from "@hackbuild/spec";
import { signedVolume, snapWeld, type MeshData } from "../hash.js";
import { meshError } from "./prism.js";

/** One loft section: a closed ring in the xy plane at height z, mm. */
export interface LoftSection {
  readonly ring: Ring;
  readonly z: Mm;
}

/** Twice the signed area of a ring, mm2; positive when counter-clockwise. */
function area2(ring: readonly Vec2[]): number {
  let s = 0;
  for (let i = 0, n = ring.length, j = n - 1; i < n; j = i++) s += ring[j]![0] * ring[i]![1] - ring[i]![0] * ring[j]![1];
  return s;
}

/**
 * Sections with a closing duplicate dropped, all made counter-clockwise by
 * one reversal so vertex i still matches vertex i across sections. Throws
 * E_SCHEMA when the counts differ, a ring has under 3 points or zero area,
 * or the rings wind both ways.
 */
export function orientSections(rings: readonly Ring[], path: string): Vec2[][] {
  const out = rings.map((r) => {
    const a = r[0];
    const b = r[r.length - 1];
    const closed = r.length > 1 && a !== undefined && b !== undefined && a[0] === b[0] && a[1] === b[1];
    return (closed ? r.slice(0, -1) : r.slice()).map(([x, y]) => [x, y] as Vec2);
  });
  const n = out[0]?.length ?? 0;
  out.forEach((r, k) => {
    if (r.length !== n || n < 3) {
      throw meshError({ code: "E_SCHEMA", path: `${path}/${k}`, got: r.length, expected: `${Math.max(n, 3)} points, the count of the first section`, hint: "give every section the same point count, at least 3" });
    }
  });
  const signs = out.map((r) => Math.sign(area2(r)));
  if (signs.some((s) => s === 0) || signs.some((s) => s !== signs[0])) {
    throw meshError({ code: "E_SCHEMA", path, got: signs, expected: "every section winding the same way with nonzero area", hint: "draw every section counter-clockwise" });
  }
  return signs[0]! < 0 ? out.map((r) => r.reverse()) : out;
}

/** Counter-clockwise cap triangles of a counter-clockwise ring, indices into it; E_SCHEMA when earcut cannot cap it. */
export function capTriangles(ring: readonly Vec2[], path: string): Uint32Array {
  const t = triangulate({ outer: ring });
  if (!t.complete || t.degenerate > 0) {
    throw meshError({ code: "E_SCHEMA", path, got: { complete: t.complete, degenerate: t.degenerate }, expected: "a simple ring earcut caps with n - 2 triangles", hint: "remove the self intersection or the repeated point from the section" });
  }
  return t.triangles;
}

/**
 * Skin k rings of n points (positions, ring after ring, each ring
 * counter-clockwise about the direction from the first ring to the last)
 * with two triangles per quad, close the first ring with first and the
 * last with last, flip the whole surface if its volume is negative, then
 * snap and weld (D-054).
 */
export function skinRings(positions: Float64Array, n: number, first: Uint32Array, last: Uint32Array): MeshData {
  const k = positions.length / 3 / n;
  const idx: number[] = [];
  for (let j = 0; j < k - 1; j++) {
    for (let i = 0; i < n; i++) {
      const a = j * n + i, b = j * n + ((i + 1) % n), c = a + n, d = b + n;
      idx.push(a, b, d, a, d, c);
    }
  }
  const top = (k - 1) * n;
  for (let t = 0; t < first.length; t += 3) idx.push(first[t]!, first[t + 2]!, first[t + 1]!);
  for (let t = 0; t < last.length; t += 3) idx.push(top + last[t]!, top + last[t + 1]!, top + last[t + 2]!);
  const triangles = Uint32Array.from(idx);
  if (signedVolume({ positions, triangles }) < 0) {
    for (let i = 0; i < triangles.length; i += 3) {
      const x = triangles[i + 1]!;
      triangles[i + 1] = triangles[i + 2]!;
      triangles[i + 2] = x;
    }
  }
  return snapWeld({ positions, triangles });
}

/**
 * Loft fixed count sections at rising heights: vertex i of each section
 * joins vertex i of the next, the first and last sections are capped by
 * earcut. Sections must rise strictly in z and share one point count.
 */
export function loftMesh(sections: readonly LoftSection[], path = "/sections"): MeshData {
  if (sections.length < 2) {
    throw meshError({ code: "E_SCHEMA", path, got: sections.length, expected: "2 or more sections", hint: "give the loft a bottom and a top section" });
  }
  sections.forEach((s, k) => {
    if (k > 0 && !(s.z > sections[k - 1]!.z)) {
      throw meshError({ code: "E_SCHEMA", path: `${path}/${k}/z`, got: s.z, expected: `above ${sections[k - 1]!.z} mm`, hint: "order the sections by rising z" });
    }
  });
  const rings = orientSections(sections.map((s) => s.ring), path);
  const n = rings[0]!.length;
  const positions = new Float64Array(rings.length * n * 3);
  rings.forEach((r, j) => {
    r.forEach(([x, y], i) => positions.set([x, y, sections[j]!.z], (j * n + i) * 3));
  });
  return skinRings(positions, n, capTriangles(rings[0]!, `${path}/0`), capTriangles(rings[rings.length - 1]!, `${path}/${rings.length - 1}`));
}
