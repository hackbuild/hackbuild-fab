// M03-T10 step 5: designs/sprue/build.ts against SPRUE as shipped. The
// oracle is the committed legacy copy designs/sprue/legacy/sprue.html
// (pinned by designs/sprue/legacy/sha256.txt): its engine (lines 279 to
// 942) and app `geo` (lines 996 to 1033) are cut by line and run in node.
// The outline functions must return SPRUE's polygons exactly; the build,
// run through core at SOURCE_DATE_EPOCH 315532800, must match SPRUE.build's
// own volumes on masks of the same blank and art, within the raster error
// measured below, per colour.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type { Ring } from "@hackbuild/spec";
import { buildPart, loadDesign, resolveParams, type Built } from "../../core/src/commands/build.js";
import { BOLT, BOLT_SCALE, coinMaskOutline, holeYOf, insetConvex, pickOutline } from "../../designs/sprue/build";
import type { SprueParams } from "../../designs/sprue/chase";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const EPOCH = 315532800;

function legacyLines(): string[] {
  const bytes = readFileSync(join(REPO, "designs/sprue/legacy/sprue.html"));
  const want = readFileSync(join(REPO, "designs/sprue/legacy/sha256.txt"), "utf8").split("\n").find((l) => l.endsWith("  sprue.html"))!.split(/\s+/)[0];
  if (createHash("sha256").update(bytes).digest("hex") !== want) throw new Error("designs/sprue/legacy/sprue.html does not match sha256.txt");
  return bytes.toString("utf8").split("\n");
}
const lines = legacyLines();
function cut(first: number, last: number, head: string, tail: string): string {
  const a = lines[first - 1]!.trim(), b = lines[last - 1]!.trim();
  if (!a.startsWith(head) || !b.startsWith(tail)) throw new Error(`cut ${first} to ${last} reads "${a}" .. "${b}"`);
  return lines.slice(first - 1, last).join("\n");
}

interface Mask { w: number; h: number; d: Uint8Array }
interface Engine {
  pickOutline(s: number): number[][];
  circleOutline(r: number, n: number): number[][];
  fromPolygon(w: number, h: number, ppm: number, poly: readonly (readonly number[])[]): Mask;
  and(a: Mask, b: Mask): Mask;
  or(a: Mask, b: Mask): Mask;
  mask(w: number, h: number): Mask;
  build(sp: Record<string, unknown>): { stats: { whiteVol: number; blackVol: number; thk: number; inlay: number; layers: number } };
}
const S: Engine = (() => {
  const scope: { SPRUE?: Engine } = {};
  new Function("globalThis", cut(279, 942, "(function (root) {", "})(typeof globalThis"))(scope);
  return scope.SPRUE!;
})();
const geoText = cut(996, 1033, "function blankOutline() {", "}");
const legacyGeo = (st: Record<string, unknown>): { W: number; H: number; ppm: number; blank: Mask; holes: Mask; zone: Mask; ring: Mask } =>
  (new Function("S", "ST", `${geoText}\nreturn geo();`) as (s: unknown, st: unknown) => never)(S, st);

const savedEpoch = process.env["SOURCE_DATE_EPOCH"];
let pick: Built, coin: Built, pickBack: Built;
beforeAll(async () => {
  process.env["SOURCE_DATE_EPOCH"] = String(EPOCH);
  const design = await loadDesign("designs/sprue", REPO);
  pick = await buildPart(design, resolveParams(design.chase, undefined, undefined));
  coin = await buildPart(design, resolveParams(design.chase, undefined, "coin"));
  pickBack = await buildPart(design, resolveParams(design.chase, { front: "none", back: "bolt" } as never, undefined));
}, 120_000);
afterAll(() => {
  if (savedEpoch === undefined) delete process.env["SOURCE_DATE_EPOCH"];
  else process.env["SOURCE_DATE_EPOCH"] = savedEpoch;
});

const vol = (b: Built, id: string): number => b.part.bodies.find((x) => x.id === id)?.mesh.volumeMm3 ?? 0;

describe("outlines", () => {
  test("pickOutline is S.pickOutline point for point", () => {
    for (const s of [0.8, 1, 1.15, 1.4]) expect(pickOutline(s)).toEqual(S.pickOutline(s));
  });
  test("coinMaskOutline is S.circleOutline point for point", () => {
    for (const r of [12, 18, 30]) expect(coinMaskOutline(r)).toEqual(S.circleOutline(r, 192));
  });
  test("insetConvex keeps every point at least d inside each edge, each corner exactly d from two edges", () => {
    const p = pickOutline(1);
    const ring = [...p].reverse(); // counter-clockwise, as insetConvex reads it
    const dist = (e: number, q: readonly number[]): number => {
      const a = ring[e]!, b = ring[(e + 1) % ring.length]!;
      return ((b[0] - a[0]) * (q[1]! - a[1]) - (b[1] - a[1]) * (q[0]! - a[0])) / Math.hypot(b[0] - a[0], b[1] - a[1]);
    };
    for (const d of [0.3, 0.6, 1.6, 4]) {
      const q = insetConvex(p, d);
      for (const v of q) {
        const ds = ring.map((_, e) => dist(e, v));
        expect(Math.min(...ds)).toBeGreaterThan(d - 1e-9);
        expect(ds.filter((x) => Math.abs(x - d) < 1e-9).length).toBeGreaterThanOrEqual(2);
      }
    }
    // shallow insets keep every edge; at 4 mm the tip loses some (computed)
    expect(insetConvex(p, 0.3)).toHaveLength(p.length);
    expect(insetConvex(p, 4).length).toBeLessThan(p.length);
    expect(() => insetConvex(p, 13)).toThrow(/nothing of the blank/);
    expect(() => insetConvex([[0, 0], [4, 0], [2, 1], [4, 4], [0, 4]], 0.5)).toThrow(/turns right/);
  });
});

/** SPRUE.build on masks of the same blank and art the design declares. */
function legacyBuild(p: SprueParams, ppm: number) {
  const st = { ...p, ppm };
  const g = legacyGeo(st);
  const bolt = (mirror: boolean): number[][] => BOLT.map((q) => [q[0] * BOLT_SCALE[0] * (mirror ? -1 : 1), q[1] * BOLT_SCALE[1]]);
  const ring = (m: Mask): Mask => (p.kind === "coin" && p.ring ? S.or(m, legacyGeo(st).ring) : m);
  const art = (which: string, mirror: boolean): Mask => ring(which === "bolt" ? S.and(S.fromPolygon(g.W, g.H, ppm, bolt(mirror)), g.zone) : S.mask(g.W, g.H));
  // The bench reads the back as drawn and mirrors it itself; the design's back bolt is drawn, so the oracle gets it unmirrored too.
  return S.build({
    ppm, w: g.W, h: g.H, layer: 0.24, thk: p.kind === "coin" ? p.coinThk : p.pickThk, inlayLayers: p.inlay, breakLayers: p.breakL,
    breakStep: p.kind === "coin" ? p.breakStepCoin : p.breakStepPick, blank: g.blank, holes: g.holes, front: art(p.front, false), back: art(p.back, false), tol: 0.75,
  }).stats;
}

describe("the build against SPRUE.build", () => {
  test("pick, coin and back-only pick: volumes per colour within the raster error", () => {
    const rows: string[] = [];
    for (const [name, b] of [["pick", pick], ["coin", coin], ["pick back", pickBack]] as const) {
      const p = b.values as unknown as SprueParams;
      const L = legacyBuild(p, 24);
      const w = vol(b, "white"), k = vol(b, "black");
      rows.push(`${name} white ${w.toFixed(3)} legacy ${L.whiteVol.toFixed(3)}, black ${k.toFixed(3)} legacy ${L.blackVol.toFixed(3)}`);
      // measured 2026-10-06: white within 0.05 percent, black within 0.25 mm3 (ppm 24 oracle)
      expect(Math.abs(w - L.whiteVol), name).toBeLessThan(0.001 * L.whiteVol);
      expect(Math.abs(k - L.blackVol), name).toBeLessThan(Math.max(0.3, 0.005 * L.blackVol));
    }
    console.log(rows.join("\n"));
  });

  test("the bed-face art is mirrored in X and sits in the bottom slab; the top art in the top slab (D-063)", () => {
    const bb = (b: Built) => b.part.bodies.find((x) => x.id === "black")!.mesh.bbox;
    const [f0, f1] = bb(pick), [b0, b1] = bb(pickBack);
    expect(b0[0]).toBeCloseTo(-f1[0], 6);
    expect(b1[0]).toBeCloseTo(-f0[0], 6);
    expect(Math.abs(f0[0] + f1[0])).toBeGreaterThan(0.1); // the bolt is not symmetric, so the mirror shows
    const thk = 5 * 0.24, D = 2 * 0.24; // computed: round(1.2 / 0.24) layers, inlay clamped to 2
    expect([f0[2], f1[2]].map((z) => Number(z.toFixed(3)))).toEqual([Number((thk - D).toFixed(3)), thk]);
    expect([b0[2], b1[2]].map((z) => Number(z.toFixed(3)))).toEqual([0, D]);
  });
});
