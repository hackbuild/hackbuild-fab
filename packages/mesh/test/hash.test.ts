// M00-T04 step 5: meshHash per D-175 (AGENT-SURFACE.md 7.3). Properties run
// under fast-check with the seed printed, so a failure replays with
// HBF_FC_SEED=<seed>.

import { createHash } from "node:crypto";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { q } from "@hackbuild/geom";
import { meshHash, snap, snapMesh, type MeshData } from "../src/index.js";
import { cube, inverted, join } from "./fixtures.js";

const seed = Number(process.env["HBF_FC_SEED"] ?? Date.now() % 2147483647);
const params = { seed, numRuns: 200 };

/** Relabel vertices by perm, rotate each triangle by its own amount, and reorder the triangle list. */
function relabel(m: MeshData, perm: readonly number[], rot: readonly number[], triOrder: readonly number[]): MeshData {
  const n = m.positions.length / 3;
  const positions = new Float64Array(m.positions.length);
  for (let v = 0; v < n; v += 1) positions.set(m.positions.subarray(v * 3, v * 3 + 3), perm[v]! * 3);
  const triangles = new Uint32Array(m.triangles.length);
  triOrder.forEach((src, dst) => {
    const t = [perm[m.triangles[src * 3]!]!, perm[m.triangles[src * 3 + 1]!]!, perm[m.triangles[src * 3 + 2]!]!];
    const r = rot[src]! % 3;
    triangles.set([t[r]!, t[(r + 1) % 3]!, t[(r + 2) % 3]!], dst * 3);
  });
  return { positions, triangles };
}

/** Triangles as winding-preserving canonical strings over positions, sorted; an independent model of what the hash covers. */
function triangleKeys(m: MeshData): string[] {
  const key = (i: number): string => Array.from(m.positions.subarray(i * 3, i * 3 + 3)).join(",");
  const out: string[] = [];
  for (let t = 0; t < m.triangles.length; t += 3) {
    const ks = [key(m.triangles[t]!), key(m.triangles[t + 1]!), key(m.triangles[t + 2]!)];
    const rots = [0, 1, 2].map((r) => [ks[r], ks[(r + 1) % 3], ks[(r + 2) % 3]].join("|"));
    out.push(rots.sort()[0]!);
  }
  return out.sort();
}

const base = join(cube(10, [0.5, 1.25, -3]), cube(2.5, [20, 0, 0]));
const nVert = base.positions.length / 3;
const nTri = base.triangles.length / 3;

describe("meshHash", () => {
  console.log(`fast-check seed ${seed}`);

  // Known answer for the D-175 byte layout. The input vertices are not in
  // sorted order, so the vertex sort, the index remap and the triangle
  // rotation all feed the value. The constant was cross-checked against an
  // independent Python hashlib model of spec/ids.ts MeshHash.
  const tetra: MeshData = {
    positions: Float64Array.from([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1]),
    triangles: Uint32Array.from([0, 2, 1, 0, 1, 3, 0, 3, 2, 1, 2, 3]),
  };
  const TETRA_HASH = "f63dcbfde2b742b721d99b38f7b4f761bcd535a289e45f53c433928765fb8a8a";

  it("returns the known answer for a unit tetrahedron", () => {
    expect(meshHash(tetra)).toBe(TETRA_HASH);
  });

  it("matches the D-175 bytes rebuilt by hand and hashed with node:crypto", () => {
    // Sorted by x, y, z on round(v * 1024): (0,0,0) (0,0,1) (0,1,0) (1,0,0),
    // so old indices 0 1 2 3 map to 0 3 2 1. Remapped triangles 0,2,3 0,3,1
    // 0,1,2 3,2,1 rotate to 0,2,3 0,3,1 0,1,2 1,3,2 and sort as below.
    const verts = [0, 0, 0, 0, 0, 1024, 0, 1024, 0, 1024, 0, 0];
    const tris = [0, 1, 2, 0, 2, 3, 0, 3, 1, 1, 3, 2];
    const tag = Buffer.from("hbf-mesh-2", "ascii");
    const body = Buffer.alloc(4 + verts.length * 4 + 4 + tris.length * 4);
    let at = body.writeUInt32LE(verts.length / 3, 0);
    for (const v of verts) at = body.writeInt32LE(v, at);
    at = body.writeUInt32LE(tris.length / 3, at);
    for (const i of tris) at = body.writeUInt32LE(i, at);
    const expected = createHash("sha256").update(Buffer.concat([tag, body])).digest("hex");
    expect(expected).toBe(TETRA_HASH);
    expect(meshHash(tetra)).toBe(expected);
  });

  it("hashes a vertex-permuted copy equal", () => {
    fc.assert(
      fc.property(
        fc.shuffledSubarray([...Array(nVert).keys()], { minLength: nVert, maxLength: nVert }),
        fc.array(fc.nat(2), { minLength: nTri, maxLength: nTri }),
        fc.shuffledSubarray([...Array(nTri).keys()], { minLength: nTri, maxLength: nTri }),
        (perm, rot, order) => meshHash(relabel(base, perm, rot, order)) === meshHash(base),
      ),
      params,
    );
  });

  it("hashes equal vertices with different triangles different", () => {
    const tri = fc.tuple(fc.nat(nVert - 1), fc.nat(nVert - 1), fc.nat(nVert - 1));
    fc.assert(
      fc.property(fc.array(tri, { minLength: 1, maxLength: 12 }), fc.array(tri, { minLength: 1, maxLength: 12 }), (a, b) => {
        const ma: MeshData = { positions: base.positions, triangles: Uint32Array.from(a.flat()) };
        const mb: MeshData = { positions: base.positions, triangles: Uint32Array.from(b.flat()) };
        fc.pre(triangleKeys(ma).join(";") !== triangleKeys(mb).join(";"));
        return meshHash(ma) !== meshHash(mb);
      }),
      params,
    );
  });

  it("hashes an inverted copy different", () => {
    fc.assert(
      fc.property(fc.double({ min: 0.01, max: 500, noNaN: true }), fc.tuple(fc.integer({ min: -900, max: 900 }), fc.integer({ min: -900, max: 900 }), fc.integer({ min: -900, max: 900 })), (s, o) => {
        const m = cube(s, o);
        return meshHash(inverted(m)) !== meshHash(m);
      }),
      params,
    );
  });

  it("writes 64 lowercase hex characters", () => {
    expect(meshHash(base)).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("snap has one owner (D-054)", () => {
  it("is geom q, so negative zero comes back as zero", () => {
    expect(snap).toBe(q);
    expect(Object.is(snap(-0.0001), 0)).toBe(true);
    expect(Object.is(snap(-0), 0)).toBe(true);
    const m = snapMesh({ positions: Float64Array.from([-0.0001, 0, 0, 1, 0, 0, 0, 1, 0]), triangles: Uint32Array.from([0, 1, 2]) });
    expect(Object.is(m.positions[0], 0)).toBe(true);
  });
});
