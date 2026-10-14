// M-S-T03 mesh slice: the keys flex-pair pad on the prism route with its
// pockets cut at stage 2, a stage 3 positive, a stable meshHash, and zero
// live wasm objects after every build. Every build goes through runStages,
// the one D-047 stage runner, with a one-body draft.
//
// The layer grid is ffc5p_20260819 (first layer 0.25 mm, then 0.24 mm,
// profile values). packages/profile owns it from M00; this test restates
// only the two preset numbers and computes everything else from them.

import { describe, expect, it } from "vitest";
import { isThrownCommandError, type MeshRef, type PartDraft, type Ring, type ShapeDecl, type Vec2 } from "@hackbuild/spec";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import * as mesh from "../src/index.js";
import {
  isWatertight, liveCount, meshHash, meshRef, runStages, sha256Hex, signedVolume, snap, type BodyCutters, type MeshData,
} from "../src/index.js";

const profile = createProfileLookup(loadProfile());

/** One body through stages 1 to 3 of D-047: its base, then pre-union cutters and union positives. */
interface Body {
  readonly base: ShapeDecl;
  readonly cutters?: BodyCutters;
}

const prism = (outline: readonly Ring[], z: readonly [number, number]): ShapeDecl => ({ route: "prism", outline: [...outline], z: [z[0], z[1]] });

/** Build one body through runStages, the one stage runner, and hash its mesh (stage 8). */
async function build(b: Body): Promise<{ readonly mesh: MeshData; readonly ref: MeshRef }> {
  const draft: PartDraft = {
    id: "skeleton", name: "skeleton", process: "fdm", machine: "ffc5p",
    frame: { originOnAxis: false, carriesOffset: true, pose: "print" }, features: [],
    bodies: [{ id: "pad", role: "body", slot: 1, material: "petg", base: b.base }],
  };
  const out = await runStages({ draft, profile, ...(b.cutters === undefined ? {} : { cutters: { pad: b.cutters } }) });
  const m = out.bodies[0]!.mesh;
  return { mesh: m, ref: meshRef(m) };
}

const FIRST_LAYER = 0.25;
const LAYER_HEIGHT = 0.24;
const layerTop = (i: number): number => FIRST_LAYER + i * LAYER_HEIGHT;
const layerIndex = (z: number): number => (z <= FIRST_LAYER ? 0 : Math.ceil((z - FIRST_LAYER) / LAYER_HEIGHT - 1e-6));
const layer = (z: number): number => layerTop(layerIndex(z));

// Circle points from the rational parametrisation of the unit circle, so the
// rings carry no trig (D-175); 4n vertices, counter-clockwise.
function circle(r: number, at: Vec2, n = 8): Ring {
  const quarter: Vec2[] = [];
  for (let k = 0; k < n; k += 1) {
    const t = k / n;
    quarter.push([(1 - t * t) / (1 + t * t), (2 * t) / (1 + t * t)]);
  }
  const unit: Vec2[] = [];
  for (const [rx, ry] of [[1, 1], [-1, 1], [-1, -1], [1, -1]] as const) {
    for (const [x, y] of quarter) unit.push(rx * ry > 0 ? [rx * x, ry * y] : [rx * y, ry * x]);
  }
  return unit.map(([x, y]) => [at[0] + r * x, at[1] + r * y]);
}

function roundRect(w: number, h: number, r: number): Ring {
  const out: Vec2[] = [];
  const corners: readonly (readonly [number, number])[] = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
  corners.forEach(([sx, sy], q) => {
    const c: Vec2 = [sx * (w / 2 - r), sy * (h / 2 - r)];
    const arc = circle(r, c, 4);
    for (let k = 0; k <= 4; k += 1) out.push(arc[(q * 4 + k) % arc.length]!);
  });
  return out;
}

function ringArea(ring: Ring): number {
  let s = 0;
  ring.forEach(([x0, y0], i) => {
    const [x1, y1] = ring[(i + 1) % ring.length]!;
    s += snap(x0) * snap(y1) - snap(x1) * snap(y0);
  });
  return Math.abs(s) / 2;
}

// keys flex-pair defaults (spec/fixtures/keys-flex-pair.ts): pad 60 x 30 mm,
// corner 4 mm, cap 11 mm, cone 3.2 mm snapped through the grid, two keys at
// x = -14 and 14 mm, pocket radius cap/2 + 0.3 mm.
const skin = layer(0.72);
const band = layer(skin + 0.72) - skin;
const z0 = layer(skin + band + 0.96);
const cone = layer(z0 + 3.2) - z0;
const T = layerTop(layerIndex(z0 + cone) + 4);
const pockets = [-14, 14].map((x) => circle(11 / 2 + 0.3, [x, 0]));
const post: Ring = [[-15, -1], [-13, -1], [-13, 1], [-15, 1]];

const pad: Body = {
  base: prism([roundRect(60, 30, 4)], [0, T]),
  cutters: {
    preUnionCutters: pockets.map((ring) => prism([ring], [z0, T])),
    unionPositives: [prism([post], [z0, z0 + 1])],
  },
};

const flipped = (m: MeshData): MeshData => {
  const t = m.triangles.slice();
  for (let i = 0; i < t.length; i += 3) [t[i + 1], t[i + 2]] = [t[i + 2]!, t[i + 1]!];
  return { positions: m.positions, triangles: t };
};

describe("mesh skeleton", () => {
  it("sha256 matches the FIPS 180-4 vector for abc", () => {
    expect(sha256Hex(new Uint8Array([0x61, 0x62, 0x63]))).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("pins the snapped ffc5p layer tops with no tolerance (D-054)", () => {
    expect([layerTop(2), layerTop(5), layerTop(9)].map(snap)).toEqual([0.73046875, 1.4501953125, 2.41015625]);
    expect(snap(z0)).toBe(2.41015625);
  });

  it("builds the pad watertight with both pockets cut; two builds give one meshHash; live count 0", async () => {
    const a = await build(pad);
    expect(liveCount()).toBe(0);
    const b = await build(pad);
    expect(liveCount()).toBe(0);
    expect(a.ref.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(b.ref.hash).toBe(a.ref.hash);
    expect(a.ref.uri).toBe(`hbf://mesh/${a.ref.hash}`);
    expect(a.ref.watertight).toBe(true);

    const [lo, hi] = a.ref.bbox;
    expect(lo[2]).toBe(0);
    expect(hi[2]).toBe(snap(T));
    for (const v of a.mesh.positions) expect(Number.isInteger(v * 1024)).toBe(true);
    const zs = new Set(Array.from({ length: a.mesh.positions.length / 3 }, (_, i) => a.mesh.positions[i * 3 + 2]));
    expect(zs.has(snap(z0))).toBe(true);

    // Computed: pad prism, less two pocket prisms, plus the stage 3 post that
    // stands inside pocket 1 and survives because cutters run first.
    const depth = snap(T) - snap(z0);
    const want = ringArea(roundRect(60, 30, 4)) * snap(T) - pockets.reduce((s, r) => s + ringArea(r) * depth, 0) + ringArea(post) * 1;
    expect(Math.abs(a.ref.volumeMm3 - want) / want).toBeLessThan(1e-9);
    console.log(`pad volume ${a.ref.volumeMm3} mm3 (computed), want ${want} mm3 (computed), top ${hi[2]} mm, hash ${a.ref.hash.slice(0, 6)}..${a.ref.hash.slice(-2)}`);
  });

  it("hashes a flipped mesh different and a relabelled mesh the same", async () => {
    const { mesh, ref } = await build(pad);
    const inside = flipped(mesh);
    expect(meshHash(inside)).not.toBe(ref.hash);
    expect(signedVolume(inside)).toBeLessThan(0);

    const n = mesh.positions.length / 3;
    const perm = Array.from({ length: n }, (_, i) => (i * 7 + 3) % n);
    const positions = new Float64Array(mesh.positions.length);
    perm.forEach((dst, src) => positions.set(mesh.positions.subarray(src * 3, src * 3 + 3), dst * 3));
    const triangles = mesh.triangles.map((i) => perm[i]!);
    expect(new Set(perm).size).toBe(n);
    expect(meshHash({ positions, triangles })).toBe(ref.hash);
  });

  it("cuts a hole drawn with the same winding as its outer ring", async () => {
    const outer: Ring = [[0, 0], [10, 0], [10, 10], [0, 10]];
    const hole: Ring = [[3, 3], [7, 3], [7, 7], [3, 7]];
    const { ref } = await build({ base: prism([outer, hole], [0, 1]) });
    expect(ref.volumeMm3).toBe(84);
    expect(ref.watertight).toBe(true);
  });

  it("stacks bands that overlap 0.01 mm and refuses abutting bands", async () => {
    const sq: Ring = [[0, 0], [10, 0], [10, 10], [0, 10]];
    const small: Ring = [[2, 2], [8, 2], [8, 8], [2, 8]];
    const bands = [{ outline: [sq], z: [0, 1] as const }, { outline: [small], z: [0.99, 2] as const }];
    const ok = await build({ base: { route: "stack", bands } });
    expect(ok.ref.watertight).toBe(true);
    // computed: 10 x 10 x 1 plus 6 x 6 x 1 above it; the 0.01 mm overlap counts once in the union
    expect(ok.ref.volumeMm3).toBeCloseTo(10 * 10 * 1 + 6 * 6 * 1, 9);
    expect(liveCount()).toBe(0);

    await expect(build({ base: { route: "stack", bands: [{ outline: [sq], z: [0, 1] }, { outline: [small], z: [1, 2] }] } })).rejects.toSatisfy(
      (e: unknown) => isThrownCommandError(e) && e.hbf.code === "E_SCHEMA" && e.hbf.path === "/bodies/0/base/bands/1/z/0");
    expect(liveCount()).toBe(0);
  });

  it("joins stage 3 positives through the verified D-055 union and refuses an edge touch", async () => {
    // A positive that meets the base only along a vertical edge: the batch
    // reads NoError with volume 2 mm3 (computed), so a status and volume
    // test passes it; stage 3 must audit it, fold, and refuse both.
    const sq: Ring = [[0, 0], [1, 0], [1, 1], [0, 1]];
    const corner: Ring = [[1, 1], [2, 1], [2, 2], [1, 2]];
    let err: unknown;
    try {
      await build({ base: prism([sq], [0, 1]), cutters: { unionPositives: [prism([corner], [0, 1])] } });
    } catch (e) {
      err = e;
    }
    expect(isThrownCommandError(err) && err.hbf.code).toBe("E_KERNEL");
    if (isThrownCommandError(err)) expect(Object.keys(err.hbf.got as object)).toEqual(["batch", "fold"]);
    expect(liveCount()).toBe(0);
  });

  it("frees every object when a build throws partway", async () => {
    const bad: Body = { ...pad, cutters: { ...pad.cutters, preUnionCutters: [prism([pockets[0]!], [T, z0])] } };
    await expect(build(bad)).rejects.toSatisfy((e: unknown) => isThrownCommandError(e) && e.hbf.code === "E_SCHEMA");
    expect(liveCount()).toBe(0);
  });

  it("keeps watertight on a consistent flip and loses it with one triangle removed", async () => {
    const { mesh } = await build(pad);
    expect(isWatertight(flipped(mesh))).toBe(true);
    expect(isWatertight({ positions: mesh.positions, triangles: mesh.triangles.subarray(3) })).toBe(false);
  });

  it("keeps one stage runner and one prism: no second body runner or manifold prism is exported", () => {
    // stages.ts runStages is the only D-047 runner and prismMesh the only prism (D-047, D-053, D-055)
    for (const name of ["bodySolid", "buildBody", "stack", "prism"]) expect(Object.keys(mesh), name).not.toContain(name);
  });
});
