// CHK-KEY-06, no mesh vertex sits exactly on a cavity face (PIP 2026-09: a
// flex cone kink on a cavity face exported a broken shell; PIP moves the
// kink points EZ * Hs / (rIn - rh) inside the well so no profile vertex
// lands on a cavity face, model.js lines 77 to 81, pip.md 5.1). On the
// part's solid, a vertex lying on a face that does not use it (a
// T-junction, a shell touching itself) is that failure. Vertices are
// matched by position on the 1/1024 mm grid (D-054), and on-face means
// in the face's plane and inside its edges within 1e-9 mm.

import { MESH_GRID_PER_MM, type Finding } from "@hackbuild/spec";
import { defineCheck } from "../../registry.js";
import { boolFinding, isReason, partTarget, skip, solidMesh } from "../common.js";

const ON_FACE_MM = 1e-9;

export const check = defineCheck({
  id: "CHK-KEY-06",
  level: "part",
  run: (t, ctx): readonly Finding[] => {
    const at = partTarget(t.part);
    const m = solidMesh(t.part, ctx);
    if (isReason(m)) return [skip(at, "not run", m.reason)];
    const p = m.positions, tri = m.triangles;
    const key = (i: number): string => `${Math.round(p[i * 3]! * MESH_GRID_PER_MM)},${Math.round(p[i * 3 + 1]! * MESH_GRID_PER_MM)},${Math.round(p[i * 3 + 2]! * MESH_GRID_PER_MM)}`;
    const keys = Array.from({ length: p.length / 3 }, (_, i) => key(i));
    // Bucket triangles by a coarse 3D cell so each vertex tests only nearby faces.
    let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
    for (let i = 0; i < p.length; i += 3) {
      x0 = Math.min(x0, p[i]!); y0 = Math.min(y0, p[i + 1]!); z0 = Math.min(z0, p[i + 2]!);
      x1 = Math.max(x1, p[i]!); y1 = Math.max(y1, p[i + 1]!); z1 = Math.max(z1, p[i + 2]!);
    }
    const nT = tri.length / 3;
    const side = Math.max(1, Math.round(Math.cbrt(nT / 8)));
    const cs = Math.max((x1 - x0) / side, (y1 - y0) / side, (z1 - z0) / side, 1e-6);
    const cell = (v: number, o: number): number => Math.min(side - 1, Math.max(0, Math.floor((v - o) / cs)));
    const buckets = new Map<number, number[]>();
    for (let k = 0; k < nT; k++) {
      const vs = [tri[k * 3]!, tri[k * 3 + 1]!, tri[k * 3 + 2]!];
      const lo = [0, 1, 2].map((d) => Math.min(...vs.map((v) => p[v * 3 + d]!)));
      const hi = [0, 1, 2].map((d) => Math.max(...vs.map((v) => p[v * 3 + d]!)));
      for (let i = cell(lo[0]!, x0); i <= cell(hi[0]!, x0); i++) for (let j = cell(lo[1]!, y0); j <= cell(hi[1]!, y0); j++) for (let l = cell(lo[2]!, z0); l <= cell(hi[2]!, z0); l++) {
        const b = (l * side + j) * side + i;
        const list = buckets.get(b) ?? [];
        list.push(k);
        buckets.set(b, list);
      }
    }
    let hits = 0;
    let first: readonly [number, number, number] | null = null;
    const seen = new Set<string>();
    for (let v = 0; v < p.length / 3; v++) {
      const kv = keys[v]!;
      if (seen.has(kv)) continue;
      seen.add(kv);
      const q = [p[v * 3]!, p[v * 3 + 1]!, p[v * 3 + 2]!] as const;
      const b = (cell(q[2], z0) * side + cell(q[1], y0)) * side + cell(q[0], x0);
      for (const k of buckets.get(b) ?? []) {
        const ia = tri[k * 3]!, ib = tri[k * 3 + 1]!, ic = tri[k * 3 + 2]!;
        if (keys[ia] === kv || keys[ib] === kv || keys[ic] === kv) continue;
        const A = [p[ia * 3]!, p[ia * 3 + 1]!, p[ia * 3 + 2]!], B = [p[ib * 3]!, p[ib * 3 + 1]!, p[ib * 3 + 2]!], C = [p[ic * 3]!, p[ic * 3 + 1]!, p[ic * 3 + 2]!];
        const u = [B[0]! - A[0]!, B[1]! - A[1]!, B[2]! - A[2]!], w = [C[0]! - A[0]!, C[1]! - A[1]!, C[2]! - A[2]!];
        const n = [u[1]! * w[2]! - u[2]! * w[1]!, u[2]! * w[0]! - u[0]! * w[2]!, u[0]! * w[1]! - u[1]! * w[0]!];
        const nl = Math.hypot(n[0]!, n[1]!, n[2]!);
        if (nl === 0) continue;
        const d = ((q[0] - A[0]!) * n[0]! + (q[1] - A[1]!) * n[1]! + (q[2] - A[2]!) * n[2]!) / nl;
        if (Math.abs(d) > ON_FACE_MM) continue;
        // Inside the triangle: the three edge cross products agree with the normal.
        const inside = [[A, B], [B, C], [C, A]].every(([s, e]) => {
          const ex = [e![0]! - s![0]!, e![1]! - s![1]!, e![2]! - s![2]!], px = [q[0] - s![0]!, q[1] - s![1]!, q[2] - s![2]!];
          const c = [ex[1]! * px[2]! - ex[2]! * px[1]!, ex[2]! * px[0]! - ex[0]! * px[2]!, ex[0]! * px[1]! - ex[1]! * px[0]!];
          return (c[0]! * n[0]! + c[1]! * n[1]! + c[2]! * n[2]!) / nl >= -ON_FACE_MM * Math.hypot(ex[0]!, ex[1]!, ex[2]!);
        });
        if (!inside) continue;
        hits += 1;
        first ??= q;
        break;
      }
    }
    return [boolFinding(first === null ? at : { level: "part", part: t.part.id, at: first }, hits === 0,
      "a vertex on a face that does not use it breaks the shell at export; profile vertices stay off cavity faces (PIP EZ inset)",
      { verticesOnFaces: hits, vertices: seen.size })];
  },
});
