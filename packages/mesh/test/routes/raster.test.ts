// M00-T05 step 2: the raster route, a port of the seed rastermesh.js with
// the TOGGLE healer. The three seed healer fixtures (seed/test/heal.test.mjs,
// same mulberry32 draws) give the seed's goldens; each slot mesh is
// manifold, z bounds are exact on the snapped layer grid, slots are
// disjoint and sum to the solid. The seed itself (packages/mesh/seed) is
// run on the same snapped fixture and the per slot volumes agree. COLLAR
// parity is M00-T11.

import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import {
  audit, fixPinches, isWatertight, liveCount, loadManifold, raster, signedVolume, snap, unionReport, withScope,
  type MeshData, type RasterVolume,
} from "../../src/index.js";

// rng, stress and build follow seed/test/heal.test.mjs so the draws match its goldens.
function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function stress(seed: number): RasterVolume {
  const W = 80, H = 80, R = 38, rim = 4;
  const r = rng(seed);
  const mk = (f: (i: number, j: number) => number): Uint8Array => {
    const L = new Uint8Array(W * H);
    for (let j = 0; j < H; j++) {
      for (let i = 0; i < W; i++) {
        const d = Math.hypot(i + 0.5 - 40, j + 0.5 - 40);
        if (d > R) continue;
        L[j * W + i] = d > R - rim ? 3 : f(i, j);
      }
    }
    return L;
  };
  return {
    width: W, height: H, px: 0.125,
    slabs: [
      { labels: mk(() => (r() < 0.3 ? 2 : 1)), z: [0, 0.72] },
      { labels: mk(() => 1), z: [0.72, 2.88] },
      { labels: mk((i, j) => ((i + j) & 1 ? 2 : 1)), z: [2.88, 3.6] },
    ],
  };
}

function build(seed: number, W: number, H: number, K: number, nl: number, p: number): RasterVolume {
  const r = rng(seed);
  const slabs = [];
  for (let k = 0; k < K; k++) {
    const L = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) L[i] = r() < p ? 0 : 1 + Math.floor(r() * nl);
    slabs.push({ labels: L, z: [k, k + 1] as const });
  }
  return { width: W, height: H, px: 0.5, slabs };
}

const clone = (v: RasterVolume): RasterVolume => ({ ...v, slabs: v.slabs.map((s) => ({ labels: s.labels.slice(), z: s.z })) });

/** Cell count per slot times cell area times slab height: the analytic slot volume, mm3 (computed). */
function cellVolumes(v: RasterVolume): Map<number, number> {
  const out = new Map<number, number>();
  for (const s of v.slabs) {
    const dz = snap(s.z[1]) - snap(s.z[0]);
    for (const l of s.labels) if (l !== 0) out.set(l, (out.get(l) ?? 0) + v.px * v.px * dz);
  }
  return out;
}

async function manifoldOf(meshes: readonly MeshData[]): Promise<{ union: number; pairOverlap: number }> {
  const wasm = await loadManifold();
  return withScope((scope) => {
    const solids = meshes.map((m) => {
      const mesh = new wasm.Mesh({ numProp: 3, vertProperties: Float32Array.from(m.positions), triVerts: Uint32Array.from(m.triangles) });
      mesh.merge();
      return scope.own(new wasm.Manifold(mesh));
    });
    let pairOverlap = 0;
    for (let i = 0; i < solids.length; i++) for (let j = i + 1; j < solids.length; j++) pairOverlap += scope.own(solids[i]!.intersect(solids[j]!)).volume();
    return { union: unionReport(solids).solid.volume(), pairOverlap };
  });
}

describe("raster healer against the seed goldens", () => {
  it("fixture A checkerboard-80 converges with 2137 flips and meshes with the seed's triangle counts", () => {
    const v = stress(1);
    const r = raster(v);
    expect({ ...r.heal, passes: undefined }).toEqual({ changed: 2137, converged: true, frozen: 0, illFormed: 0, passes: undefined });
    expect([...r.meshes.keys()]).toEqual([1, 2, 3]);
    expect([1, 2, 3].map((s) => r.meshes.get(s)!.triangles.length / 3)).toEqual([16310, 14844, 5402]);
    expect(fixPinches(v).changed).toBe(0);
    // 2137 of 19200 cells, 11.13 percent (computed), warns above 0.2 percent
    expect(r.warnings.map((w) => w.code)).toEqual(["HEAL_FLIPS"]);
  });

  it("fixture B oscillation-6x6x2 converges with 4 cells frozen", () => {
    expect(fixPinches(build(2, 6, 6, 2, 3, 0.3))).toMatchObject({ changed: 32, converged: true, frozen: 4, illFormed: 0 });
  });

  it("fixture C frozen-8x8x3 does not converge: a build warns, a sweep refuses", () => {
    const b = raster(build(1, 8, 8, 3, 3, 0.3), "build");
    expect(b.heal).toMatchObject({ changed: 127, converged: false, frozen: 14, illFormed: 2 });
    expect(b.warnings.map((w) => w.code)).toContain("HEAL_NOT_CONVERGED");
    let code = "";
    try {
      raster(build(1, 8, 8, 3, 3, 0.3), "sweep");
    } catch (e) {
      code = (e as { hbf?: { code: string } }).hbf?.code ?? "";
    }
    expect(code).toBe("E_KERNEL");
  });
});

describe("raster route guarantees (D-053)", () => {
  it("fixture A: per slot manifold, exact Z, slots disjoint, slots sum to the solid", async () => {
    const v = stress(1);
    const r = raster(v);
    const bounds = new Set(v.slabs.flatMap((s) => [snap(s.z[0]), snap(s.z[1])]));
    const mids = new Set(v.slabs.map((s) => snap((snap(s.z[0]) + snap(s.z[1])) / 2)));
    const want = cellVolumes(v);
    let sum = 0;
    for (const [slot, m] of r.meshes) {
      const a = audit(m);
      expect(a.ok).toBe(true);
      expect(isWatertight(m)).toBe(true);
      for (let i = 2; i < m.positions.length; i += 3) {
        const z = m.positions[i]!;
        expect(bounds.has(z) || mids.has(z)).toBe(true);
      }
      expect(Math.abs(signedVolume(m) - want.get(slot)!)).toBeLessThan(1e-9);
      sum += signedVolume(m);
    }
    const { union, pairOverlap } = await manifoldOf([...r.meshes.values()]);
    console.log(`fixture A slot volumes sum ${sum.toFixed(6)} mm3, union ${union.toFixed(6)} mm3, pairwise overlap ${pairOverlap} mm3 (computed)`);
    expect(pairOverlap).toBeLessThan(1e-9);
    expect(Math.abs(union - sum) / sum).toBeLessThan(1e-9);
    expect(liveCount()).toBe(0);
  }, 60_000); // 3.2 s alone (measured); over 5 s under the root run's parallel load

  it("layer tops enter as q(firstLayer + i x layerHeight) and come out exact (ffc5p 0.25 then 0.24)", () => {
    const top = (i: number): number => snap(0.25 + i * 0.24);
    const L = new Uint8Array(16).fill(1);
    const v: RasterVolume = { width: 4, height: 4, px: 0.5, slabs: [0, 1, 2].map((i) => ({ labels: L.slice(), z: [i === 0 ? 0 : top(i - 1), top(i)] as const })) };
    const m = raster(v).meshes.get(1)!;
    const zs = new Set<number>();
    for (let i = 2; i < m.positions.length; i += 3) zs.add(m.positions[i]!);
    expect(zs.has(0.73046875)).toBe(true);
    expect(zs.has(0.25)).toBe(true);
  });

  it("agrees with the seed rastermesh.js on the same snapped fixture, slot by slot", () => {
    const src = readFileSync(new URL("../../seed/rastermesh.js", import.meta.url), "utf8");
    type Seed = { volume: (...a: number[]) => { addSlab: (l: Uint8Array, z0: number, z1: number) => void; fixPinches: () => unknown; mesh: () => Record<string, { positions: Float32Array; indices: Uint32Array }> } };
    const ctx = vm.createContext({ Math, Map, Set, Array, Object, Uint8Array, Uint32Array, Float32Array, Error }) as { RasterMesh?: Seed };
    vm.runInContext(src, ctx);
    const v = stress(1);
    const seed = ctx.RasterMesh!.volume(v.width, v.height, v.px, 0, 0);
    for (const s of v.slabs) seed.addSlab(s.labels.slice(), snap(s.z[0]), snap(s.z[1]));
    seed.fixPinches();
    const legacy = seed.mesh();
    const ours = raster(clone(v)).meshes;
    for (const [slot, m] of ours) {
      const l = legacy[String(slot)]!;
      const lv = signedVolume({ positions: Float64Array.from(l.positions), triangles: l.indices });
      expect(m.triangles.length).toBe(l.indices.length);
      expect(Math.abs(signedVolume(m) - lv) / lv).toBeLessThan(1e-6);
    }
  });
});

// M00-T11 step 4: zGrid "given" keeps slab bounds as declared (COLLAR at
// 0.2 mm has no dyadic form); XY still lands on the 1/1024 mm grid.
describe("raster zGrid given", () => {
  it("keeps unsnapped z bounds exact and the cell volume exact", () => {
    const v = stress(3);
    const given: RasterVolume = { ...clone(v), slabs: v.slabs.map((s, k) => ({ labels: s.labels.slice(), z: [k * 0.2, (k + 1) * 0.2] as const })), zGrid: "given" };
    const want = cellVolumes(given);
    const r = raster(given);
    const zs = new Set<number>();
    for (const [slot, m] of r.meshes) {
      for (let i = 2; i < m.positions.length; i += 3) zs.add(m.positions[i]!);
      expect(audit(m).ok).toBe(true);
      const dz = given.slabs.map((s) => s.z[1] - s.z[0]);
      let exact = 0;
      given.slabs.forEach((s, k) => { for (const l of s.labels) if (l === slot) exact += given.px * given.px * dz[k]!; });
      expect(Math.abs(signedVolume(m) - exact)).toBeLessThan(1e-9);
      expect(want.has(slot)).toBe(true);
    }
    const bounds = new Set([0, 0.2, 0.4, 0.6000000000000001]);
    const mids = new Set([0.1, 0.30000000000000004, 0.5]);
    for (const z of zs) expect(bounds.has(z) || mids.has(z), `z ${z}`).toBe(true);
  });
});
