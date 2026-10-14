// M03-T06: split, mirror and bodies. The oracle is COLLAR v5 itself: script
// lines 605 to 1517 of designs/collar/legacy/collar.html (sha256 in
// legacy/sha256.txt) run unchanged, with buildFace handing back the fixture
// faces and labelSlab recorded as buildMesh calls it. The port's bands must
// equal the legacy slab labels cell for cell and its volume metrics the
// legacy estimateVolume. The fixture coin then goes through the M00 stage
// runner: bodies watertight, pairwise disjoint and summing to the solid, and
// the F on the back reads mirrored in the emitted bottom slab.

import { spawnSync } from "node:child_process";
import { mkdtempSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, beforeAll } from "vitest";
import { audit, fixPinches, liveCount, loadManifold, signedVolume, withScope, type MeshData } from "@hackbuild/mesh";
import type { ComposedFace } from "../src/face.js";
import { mirrorFace, mirrorX } from "../src/mirror.js";
import { maskUri, splitBodies, type SplitHost } from "../src/split.js";
import { legacyHtml } from "./fixtures/collar-legacy.js";
import { DEPTH, DIA, THK, backFace, frontFace, glyphMask, stageCoin, type StagedCoin } from "./fixtures/split-coin.js";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));

interface LegacySlab { readonly z0: number; readonly z1: number; readonly L: Uint8Array }
interface LegacyMesh {
  readonly ST: { inlay: number; thk: number; base: number; res: number; layer: number; rim: { on: boolean } };
  buildMesh(): { volume: Record<number, number> };
  readonly CAP: LegacySlab[];
}

/** COLLAR lines 605 to 1517 (LOGO_ARC to the end of estimateVolume), unchanged, fed the fixture faces. */
function legacyMesh(front: ComposedFace, back: ComposedFace): LegacyMesh {
  const lines = legacyHtml().split("\n");
  if (!lines[1367]!.startsWith("function buildMesh") || !lines[1507]!.startsWith("function estimateVolume") || !lines[1518]!.startsWith("/* ====")) {
    throw new Error("collar.html lines 1368, 1508 and 1519 are not buildMesh, estimateVolume and the exporters banner");
  }
  const body = lines.slice(604, 1517).join("\n");
  const tail = `
const CAP = [];
const recordSlab = labelSlab;
labelSlab = function (z0, z1, ...rest) { const L = recordSlab(z0, z1, ...rest); CAP.push({ z0, z1, L }); return L; };
buildFace = (which) => FACES[which];
return { ST, buildMesh, CAP };`;
  const faces = { front: { art: front.art.labels, holes: front.holes }, back: { art: back.art.labels, holes: back.holes } };
  const document = { createElement: () => ({ width: 0, height: 0, getContext: () => new Proxy({}, { get: () => () => undefined }) }) };
  return new Function("document", "FACES", `${body}\n${tail}`)(document, faces) as LegacyMesh;
}

const machineOf = (layerHeight: number): SplitHost["machine"] => ({ id: "collar-v5", layerHeight });

describe("mirrorFace (step 1)", () => {
  it("maps out[j][i] to in[j][w - 1 - i] for art and holes and leaves the input as read", () => {
    const w = 5, h = 3;
    const labels = Uint8Array.from({ length: w * h }, (_, p) => p + 1);
    const holes = Uint8Array.from({ length: w * h }, (_, p) => (p % w === 0 ? 1 : 0));
    const face: ComposedFace = { art: { w, h, res: 1, labels }, holes };
    const m = mirrorFace(face);
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        expect(m.art.labels[j * w + i]).toBe(labels[j * w + (w - 1 - i)]);
        expect(m.holes![j * w + i]).toBe(holes[j * w + (w - 1 - i)]);
      }
    }
    expect([...labels]).toEqual(Array.from({ length: w * h }, (_, p) => p + 1));
    expect(mirrorFace(m).art.labels).toEqual(labels);
    expect(mirrorFace({ ...face, holes: null }).holes).toBeNull();
  });

  it("refuses a grid whose cell count is not w x h", () => {
    expect(() => mirrorX(new Uint8Array(7), 2, 3)).toThrow(/E_SCHEMA/);
  });
});

describe("splitBodies against COLLAR v5 buildMesh (steps 2 and 4)", () => {
  const cells = 256;
  const front = frontFace(cells), back = backFace(cells);
  const frontBefore = front.art.labels.slice(), backBefore = back.art.labels.slice();
  let legacy: LegacyMesh;
  let volume: Record<number, number>;
  beforeAll(() => {
    legacy = legacyMesh(front, back);
    legacy.ST.res = cells;
    legacy.ST.rim.on = false;
    volume = legacy.buildMesh().volume;
  });
  const split = () => splitBodies(front, back, legacy.ST.inlay, {
    id: "inlay", thk: legacy.ST.thk, slot: legacy.ST.base, machine: machineOf(legacy.ST.layer), materials: ["petg", "petg", "petg"],
  });
  const artOf = (L: Uint8Array, base: number): Uint8Array => L.map((s) => (s === base ? 0 : s));

  it("the bottom band holds the mirrored back art and the top band the front art, cell for cell", () => {
    const s = split();
    const layer = (k: number): Uint8Array => s.masks.get(s.shape.layers[k]!.mask)!.labels;
    const { inlay, thk, base } = legacy.ST;
    const bottom = legacy.CAP.filter((x) => x.z1 <= inlay + 1e-9);
    const top = legacy.CAP.filter((x) => x.z0 >= thk - inlay - 1e-9);
    expect(bottom.length).toBeGreaterThan(0);
    expect(top.length).toBeGreaterThan(0);
    for (const sl of bottom) expect(layer(0)).toEqual(artOf(sl.L, base));
    for (const sl of top) expect(layer(s.shape.layers.length - 1)).toEqual(artOf(sl.L, base));
    expect(s.shape.layers.map((l) => l.z)).toEqual([[0, inlay], [inlay, thk - inlay], [thk - inlay, thk]]);
    expect([...layer(1)].every((x) => x === 0)).toBe(true);
  });

  it("holes are the front holes and the mirrored back holes, cut through every band", () => {
    const s = split();
    const middle = legacy.CAP.filter((x) => x.z0 >= legacy.ST.inlay - 1e-9 && x.z1 <= legacy.ST.thk - legacy.ST.inlay + 1e-9);
    expect(middle.length).toBeGreaterThan(0);
    const k = cells / DIA;
    for (const sl of middle) {
      for (let j = 0; j < cells; j++) {
        for (let i = 0; i < cells; i++) {
          const x = (i + 0.5 - cells / 2) / k, y = (j + 0.5 - cells / 2) / k;
          if (x * x + y * y > 14 * 14) continue;
          const p = j * cells + i;
          expect(s.holes![p], `cell ${i}, ${j}`).toBe(sl.L[p] === 0 ? 1 : 0);
        }
      }
    }
    expect(s.holes!.reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
  });

  it("per-slot volume metrics equal the legacy estimateVolume for every art slot", () => {
    const s = split();
    const art = Object.keys(volume).map(Number).filter((x) => x !== legacy.ST.base).sort((a, b) => a - b);
    expect(s.metrics.map((m) => m.id)).toEqual(art.map((x) => `inlay.${x}.volume`));
    for (const m of s.metrics) {
      const slot = Number(m.id.split(".")[1]);
      expect(m.unit).toBe("mm3");
      expect(m.qualifier).toBe("computed");
      expect(Math.abs((m.value as number) - volume[slot]!) / volume[slot]!).toBeLessThan(1e-12);
    }
  });

  it("returns one art body per slot on one shared raster shape and leaves the faces as read", () => {
    const s = split();
    expect(s.bodies.map((b) => [b.id, b.role, b.slot, b.material])).toEqual([["inlay.slot2", "art", 2, "petg"], ["inlay.slot3", "art", 3, "petg"]]);
    for (const b of s.bodies) expect(b.base).toBe(s.shape);
    for (const [uri, m] of s.masks) expect(maskUri(m)).toBe(uri);
    expect(s.shape.res).toBeCloseTo(DIA / cells, 15);
    expect(front.art.labels).toEqual(frontBefore);
    expect(back.art.labels).toEqual(backBefore);
  });

  it("refuses a depth that is not a whole number of layers with E_SCHEMA naming the layer height", () => {
    let hbf: { code: string; path?: string; hint: string } | undefined;
    try {
      splitBodies(front, back, 1.1, { id: "inlay", thk: 3.6, slot: 1, machine: { id: "ffc5p_20260819", layerHeight: 0.24 }, materials: ["petg", "petg", "petg"] });
    } catch (e) {
      hbf = (e as { hbf?: typeof hbf }).hbf;
    }
    expect(hbf?.code).toBe("E_SCHEMA");
    expect(hbf?.path).toBe("/depth");
    expect(hbf?.hint).toContain("0.24 mm layers");
    expect(hbf?.hint).toContain("set 0.96 or 1.2 mm");
    expect(() => splitBodies(front, back, 1.2, { id: "inlay", thk: 3.6, slot: 1, machine: { id: "ffc5p_20260819", layerHeight: 0.24 }, materials: ["petg", "petg", "petg"] })).not.toThrow();
    expect(() => splitBodies(front, back, 2.4, { id: "inlay", thk: 3.6, slot: 1, machine: { id: "ffc5p_20260819", layerHeight: 0.24 }, materials: ["petg", "petg", "petg"] })).toThrow(/E_SCHEMA \/depth/);
  });
});

async function overlap(a: MeshData, b: MeshData): Promise<number> {
  const wasm = await loadManifold();
  return withScope((scope) => {
    const m = (x: MeshData) => {
      const mesh = new wasm.Mesh({ numProp: 3, vertProperties: Float32Array.from(x.positions), triVerts: Uint32Array.from(x.triangles) });
      mesh.merge();
      return scope.own(new wasm.Manifold(mesh));
    };
    return scope.own(m(a).intersect(m(b))).volume();
  });
}

/** Cells whose centre lies under a z = 0 triangle of the mesh. */
function bedCells(mesh: MeshData, cells: number): Uint8Array {
  const out = new Uint8Array(cells * cells);
  const P = mesh.positions, T = mesh.triangles;
  const px = DIA / cells, x0 = -DIA / 2;
  for (let t = 0; t < T.length; t += 3) {
    const v = [T[t]!, T[t + 1]!, T[t + 2]!].map((i) => [P[3 * i]!, P[3 * i + 1]!, P[3 * i + 2]!] as const);
    if (v.some((q) => q[2] !== 0)) continue;
    const [a, b, c] = v as unknown as [readonly number[], readonly number[], readonly number[]];
    const cross = (p: readonly number[], q: readonly number[], x: number, y: number): number => (q[0]! - p[0]!) * (y - p[1]!) - (q[1]! - p[1]!) * (x - p[0]!);
    const i0 = Math.max(0, Math.floor((Math.min(a[0]!, b[0]!, c[0]!) - x0) / px)), i1 = Math.min(cells - 1, Math.ceil((Math.max(a[0]!, b[0]!, c[0]!) - x0) / px));
    const j0 = Math.max(0, Math.floor((Math.min(a[1]!, b[1]!, c[1]!) - x0) / px)), j1 = Math.min(cells - 1, Math.ceil((Math.max(a[1]!, b[1]!, c[1]!) - x0) / px));
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const x = x0 + (i + 0.5) * px, y = x0 + (j + 0.5) * px;
        const d1 = cross(a, b, x, y), d2 = cross(b, c, x, y), d3 = cross(c, a, x, y);
        // a centre on a fan diagonal counts; a centre never lies on a cell edge
        if ((d1 >= 0 && d2 >= 0 && d3 >= 0) || (d1 <= 0 && d2 <= 0 && d3 <= 0)) out[j * cells + i] = 1;
      }
    }
  }
  return out;
}

describe("the 3-slot fixture coin through the M00 raster route (step 3)", () => {
  const cells = 128;
  let coin: StagedCoin;
  beforeAll(async () => {
    coin = await stageCoin(cells);
  }, 120_000);

  it("the fixture volume needs no pinch repair, so the meshes carry the split labels unchanged", () => {
    const { split } = coin;
    const slabs = split.shape.layers.map((l) => ({ labels: split.masks.get(l.mask)!.labels.slice(), z: l.z }));
    const heal = fixPinches({ width: cells, height: cells, px: split.shape.res, slabs });
    expect(heal.changed).toBe(0);
    expect(heal.converged).toBe(true);
  });

  it("bodies are watertight, pairwise disjoint and sum to the solid", async () => {
    const { out } = coin;
    expect(out.bodies.map((b) => [b.draft.id, b.draft.role, b.draft.slot])).toEqual([["coin", "body", 1], ["inlay.slot2", "art", 2], ["inlay.slot3", "art", 3]]);
    for (const b of out.bodies) expect(audit(b.mesh).ok, b.draft.id).toBe(true);
    for (let i = 0; i < out.bodies.length; i++) {
      for (let k = i + 1; k < out.bodies.length; k++) expect(await overlap(out.bodies[i]!.mesh, out.bodies[k]!.mesh)).toBeLessThan(1e-6);
    }
    const sum = out.bodies.reduce((a, b) => a + b.volumeMm3, 0);
    expect(Math.abs(sum - signedVolume(out.solid))).toBeLessThan(1e-6);
    expect(out.warnings).toEqual([]);
    expect(liveCount()).toBe(0);
  });

  it("art bodies hold cells x cell area x band height, the band bounds on the 1/1024 mm grid", () => {
    const { split } = coin;
    const q = (z: number): number => Math.round(z * 1024) / 1024;
    const layer = (k: number): Uint8Array => split.masks.get(split.shape.layers[k]!.mask)!.labels;
    const bottom = layer(0), top = layer(split.shape.layers.length - 1);
    const area = split.shape.res ** 2;
    for (const m of split.metrics) {
      const slot = Number(m.id.split(".")[1]);
      const nb = bottom.filter((s) => s === slot).length, nt = top.filter((s) => s === slot).length;
      const body = coin.out.bodies.find((b) => b.draft.slot === slot)!;
      expect(m.value).toBeCloseTo((nb + nt) * area * DEPTH, 9);
      expect(body.volumeMm3).toBeCloseTo(area * (nb * q(DEPTH) + nt * (q(THK) - q(THK - DEPTH))), 6);
    }
    // the host is the prism less every art cell: its volume moves by the art volume (computed)
    const art = coin.out.bodies.filter((b) => b.draft.role === "art").reduce((a, b) => a + b.volumeMm3, 0);
    const host = coin.out.bodies.find((b) => b.draft.id === "coin")!;
    expect(art).toBeGreaterThan(0);
    expect(host.volumeMm3 + art).toBeCloseTo(signedVolume(coin.out.solid), 6);
    expect(THK).toBeCloseTo(15 * 0.24, 12);
    expect(DEPTH).toBeCloseTo(5 * 0.24, 12);
  });

  it("the F on the back reads mirrored in the emitted bottom slab and as read in the face function", () => {
    const f = coin.out.bodies.find((b) => b.draft.slot === 3)!;
    const got = bedCells(f.mesh, cells);
    const asRead = glyphMask(cells);
    const holes = coin.split.holes!;
    const mirrored = mirrorX(asRead, cells, cells).map((v, p) => (holes[p] ? 0 : v));
    expect(got).toEqual(mirrored);
    expect(got).not.toEqual(asRead.map((v, p) => (holes[p] ? 0 : v)));
    // the face function still returns the F as read: stem on the left (x < 0)
    const k = cells / DIA, at = (x: number, y: number): number => Math.floor(y * k + cells / 2) * cells + Math.floor(x * k + cells / 2);
    const back = backFace(cells);
    expect(back.art.labels[at(-4.5, -6)]).toBe(3);
    expect(back.art.labels[at(4.5, -6)]).toBe(0);
    expect(got[at(4.5, -6)]).toBe(1);
    expect(got[at(-4.5, -6)]).toBe(0);
  });
});

// The exported 3MF through tools/py/validate_3mf.py --overlap. CI installs uv; there a missing uv fails.
const UV = spawnSync("uv", ["--version"], { encoding: "utf8" }).status === 0;
describe.skipIf(!UV && process.env["CI"] === undefined)("exported fixture coin passes validate_3mf.py --overlap", () => {
  it("writes the 3MF and the validator exits 0", () => {
    const dir = mkdtempSync(join(tmpdir(), "hbf-split-"));
    const file = join(dir, "split-coin.3mf");
    try {
      const w = spawnSync(process.execPath, [join(ROOT, "tools/inlay/split-fixture.mjs"), file], { cwd: ROOT, encoding: "utf8", timeout: 300_000 });
      expect(w.status, w.stderr).toBe(0);
      expect(existsSync(file)).toBe(true);
      const v = spawnSync("uv", ["run", "--project", "tools/py", "tools/py/validate_3mf.py", "--overlap", file], { cwd: ROOT, encoding: "utf8", timeout: 300_000, maxBuffer: 64 * 1024 * 1024 });
      expect(v.status, `${v.stdout}\n${v.stderr}`).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 600_000);
});
