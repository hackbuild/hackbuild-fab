// The BAIL layer kinds on the package (plan v11 section 4.3 step a): shape,
// scope, circuit and logo painters, and text with letter spacing and
// anchored arcs. Each kind is held to determinism (same layer, same bytes),
// bounds (no cell outside what the layer can reach), slot assignment (what
// bail.html slotFor gives each part) and, against BAIL's own canvas, the
// fixture tools/inlay/bail-canvas.cjs captured from the canonical file.

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { vectorSurface } from "@hackbuild/geom";
import { ART_SHAPES, artLayer, type ArtLayer } from "@hackbuild/spec";
import { describe, expect, test } from "vitest";
import { LAYER_RENDERERS, composeFace, type FaceContext, type PaintLayer } from "../src/face.js";
import { circuitGeometry, mulberry } from "../src/layers/circuit.js";
import { SHAPE_KINDS, shapeMask, type ShapeLayer } from "../src/layers/shapes.js";
import { SCOPE_SEGMENTS, scopePoints, type ScopeLayer } from "../src/layers/scope.js";
import { lowerArtLayer } from "../src/art-lower.js";
import { layoutArc, layoutStraight, type TextLayer } from "../src/layers/text.js";
import type { LayerResult, RasterGrid, Surface } from "../src/surface.js";

const RES = 8;
const grid: RasterGrid = { w: 400, h: 320, res: RES };
const surface = vectorSurface(grid);
const ctx: FaceContext = { surface, grid, rArt: 20 };
const sha = (m: Uint8Array): string => createHash("sha256").update(m).digest("hex");
const render = (L: PaintLayer, c: FaceContext = ctx): LayerResult[] => LAYER_RENDERERS[L.kind](L as never, c);
const maskOf = (r: LayerResult): Uint8Array => ("mask" in r ? r.mask : r.map);

/** Painted extent in mm (cell centres): [x0, x1, y0, y1], or null when nothing is painted. */
function extent(m: Uint8Array, g: RasterGrid = grid): [number, number, number, number] | null {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let j = 0; j < g.h; j++) for (let i = 0; i < g.w; i++) {
    if (!m[j * g.w + i]) continue;
    const x = (i + 0.5 - g.w / 2) / g.res, y = (j + 0.5 - g.h / 2) / g.res;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return x0 > x1 ? null : [x0, x1, y0, y1];
}
const count = (m: Uint8Array): number => m.reduce((a, b) => a + b, 0);

const shape = (s: ShapeLayer["shape"], o: Partial<ShapeLayer> = {}): ShapeLayer => ({
  kind: "shape", shape: s, w: 30, h: 20, t: 2, n: 4, dx: 0, dy: 0, rot: 0, slot: 3, ...o,
});
const scope = (o: Partial<ScopeLayer> = {}): ScopeLayer => ({ kind: "scope", a: 3, b: 2, phase: 90, w: 30, h: 22, t: 0.9, dx: 0, dy: 0, rot: 0, slot: 2, ...o });

describe("shape layers, all 13 kinds", () => {
  test("the kinds are spec ART_SHAPES, BAIL's list of 13", () => {
    expect(SHAPE_KINDS).toBe(ART_SHAPES);
    expect(SHAPE_KINDS).toHaveLength(13);
  });

  test.each(SHAPE_KINDS.map((k) => [k]))("%s: same layer, same bytes; a 0 and 1 mask that paints and is not full", (kind) => {
    const L = shape(kind);
    const a = shapeMask(L, grid), b = shapeMask({ ...L }, grid);
    expect(sha(a)).toBe(sha(b));
    expect(a.length).toBe(grid.w * grid.h);
    expect(a.every((v) => v === 0 || v === 1)).toBe(true);
    expect(count(a)).toBeGreaterThan(100);
    expect(count(a)).toBeLessThan(grid.w * grid.h / 2);
  });

  test.each(SHAPE_KINDS.map((k) => [k]))("%s: stays inside a circle of the reach of its own geometry", (kind) => {
    const L = shape(kind, { w: 30, h: 20, t: 2, n: 4, dx: 4, dy: -3 });
    const e = extent(shapeMask(L, grid))!;
    // The arrow's feathers reach 0.95 h along x and the chevrons 0.56 w + t; every other kind sits inside w by h plus its stroke.
    const reachX = kind === "arrow" ? Math.max(L.w / 2, 0.95 * L.h - L.w / 2) : kind === "chevrons" ? 0.56 * L.w + L.t : L.w / 2 + L.t * 5, reachY = L.h / 2 + L.t * 5;
    expect(Math.max(Math.abs(e[0] - 4), Math.abs(e[1] - 4))).toBeLessThanOrEqual(reachX + 1 / RES);
    expect(Math.max(Math.abs(e[2] + 3), Math.abs(e[3] + 3))).toBeLessThanOrEqual(reachY + 1 / RES);
  });

  test("a rect, ellipse, ring, frame and diamond fill exactly w by h about the centre, to one cell, and a mesa 0.95 h", () => {
    for (const k of ["rect", "ellipse", "ring", "frame", "diamond"] as const) {
      const e = extent(shapeMask(shape(k, { w: 30, h: 20 }), grid))!;
      expect(e[1] - e[0], k).toBeCloseTo(30, 0);
      expect(e[3] - e[2], k).toBeCloseTo(20, 0);
      expect((e[0] + e[1]) / 2, k).toBeCloseTo(0, 0);
    }
    const mesa = extent(shapeMask(shape("mesa", { w: 30, h: 20 }), grid))!;
    expect(mesa[3] - mesa[2]).toBeCloseTo(0.95 * 20, 0);
  });

  test("dx and dy move a layer, rot turns it about its own centre", () => {
    const at = extent(shapeMask(shape("rect", { w: 20, h: 10, dx: 7, dy: -4 }), grid))!;
    expect([(at[0] + at[1]) / 2, (at[2] + at[3]) / 2].map((v) => Math.round(v * 4) / 4)).toEqual([7, -4]);
    const turned = extent(shapeMask(shape("rect", { w: 20, h: 10, rot: 90 }), grid))!;
    expect(turned[1] - turned[0]).toBeCloseTo(10, 0);
    expect(turned[3] - turned[2]).toBeCloseTo(20, 0);
    // counter-clockwise: the right end of a 20 by 2 bar turns to the top
    const bar = extent(shapeMask(shape("rect", { w: 20, h: 2, rot: 90, dx: 0 }), grid))!;
    expect(bar[3]).toBeCloseTo(10, 0);
  });

  test("ring is the ellipse less an inner ellipse t smaller on each side; frame likewise with rectangles", () => {
    const ring = shapeMask(shape("ring", { w: 30, h: 30, t: 3 }), grid), disc = shapeMask(shape("ellipse", { w: 30, h: 30 }), grid), hole = shapeMask(shape("ellipse", { w: 24, h: 24 }), grid);
    for (let p = 0; p < ring.length; p++) expect(ring[p]).toBe(disc[p] && !hole[p] ? 1 : 0);
    const frame = shapeMask(shape("frame", { w: 30, h: 20, t: 3 }), grid), outer = shapeMask(shape("rect", { w: 30, h: 20 }), grid), inner = shapeMask(shape("rect", { w: 24, h: 14 }), grid);
    for (let p = 0; p < frame.length; p++) expect(frame[p]).toBe(outer[p] && !inner[p] ? 1 : 0);
  });

  test("sun: n gap bands cut the disc, and the gaps widen toward the horizon", () => {
    const bare = count(shapeMask(shape("ellipse", { w: 30, h: 30 }), grid));
    const sun = count(shapeMask(shape("sun", { w: 30, h: 30, t: 1, n: 5 }), grid));
    expect(sun).toBeLessThan(bare);
    expect(count(shapeMask(shape("sun", { w: 30, h: 30, t: 2, n: 5 }), grid))).toBeLessThan(sun);
    // the cut rows: every band row is empty at the disc centre column
    const m = shapeMask(shape("sun", { w: 30, h: 30, t: 1, n: 5 }), grid);
    const col = grid.w / 2;
    let runs = 0, inside = false;
    for (let j = 0; j < grid.h; j++) { const v = m[j * grid.w + col]!; if (v && !inside) runs++; inside = v === 1; }
    expect(runs).toBe(6);
  });

  test("grid: n + 1 bars across, and the rows follow round(n h / w)", () => {
    const m = shapeMask(shape("grid", { w: 40, h: 20, t: 0.8, n: 8 }), grid);
    const row = Math.round(grid.h / 2 + 4.5 * RES);
    let bars = 0, inside = false;
    for (let i = 0; i < grid.w; i++) { const v = m[row * grid.w + i]!; if (v && !inside) bars++; inside = v === 1; }
    expect(bars).toBe(9);
  });

  test("zigzag has n teeth up and the stepped diamond is symmetric in x and y", () => {
    const zz = shapeMask(shape("zigzag", { w: 40, h: 16, t: 2, n: 4 }), grid);
    const top = Math.round(grid.h / 2 + 6 * RES);
    let peaks = 0, inside = false;
    for (let i = 0; i < grid.w; i++) { const v = zz[top * grid.w + i]!; if (v && !inside) peaks++; inside = v === 1; }
    expect(peaks).toBe(4);
    const st = shapeMask(shape("steps", { w: 24, h: 24, t: 1.6, n: 3 }), grid);
    let asym = 0;
    for (let j = 0; j < grid.h; j++) for (let i = 0; i < grid.w; i++) if (st[j * grid.w + i] !== st[j * grid.w + (grid.w - 1 - i)]) asym++;
    expect(asym).toBe(0);
  });

  test("renders paint into the layer's slot only", () => {
    const [r] = render(shape("mesa", { slot: 4 }));
    expect(r).toMatchObject({ slot: 4 });
    expect(render(shape("mesa", { slot: 4 }))).toHaveLength(1);
  });
});

describe("scope layers", () => {
  test("a closed Lissajous of 1600 segments, deterministic, inside w by h plus the trace", () => {
    const pts = scopePoints(scope());
    expect(pts).toHaveLength(SCOPE_SEGMENTS + 1);
    expect(Math.hypot(pts[0]![0] - pts[SCOPE_SEGMENTS]![0], pts[0]![1] - pts[SCOPE_SEGMENTS]![1])).toBeLessThan(1e-9);
    const [r] = render(scope());
    expect(sha(maskOf(r!))).toBe(sha(maskOf(render(scope())[0]!)));
    const e = extent(maskOf(r!))!;
    expect(e[1]).toBeLessThanOrEqual(15 + 0.45 + 1 / RES);
    expect(e[3]).toBeLessThanOrEqual(11 + 0.45 + 1 / RES);
    expect(e[1]).toBeGreaterThan(14);
    expect(r).toMatchObject({ slot: 2 });
  });

  test("a and b set the lobes: 3 by 2 crosses a row above the centre more often than 1 by 1", () => {
    const crossings = (a: number, b: number): number => {
      const m = maskOf(render(scope({ a, b, w: 30, h: 30, t: 0.8 }))[0]!);
      const row = grid.h / 2 + 3;
      let n = 0, inside = false;
      for (let i = 0; i < grid.w; i++) { const v = m[row * grid.w + i]!; if (v && !inside) n++; inside = v === 1; }
      return n;
    };
    expect(crossings(1, 1)).toBeLessThan(crossings(3, 2));
  });
});

describe("circuit layers", () => {
  const circ = (o: Partial<Extract<PaintLayer, { kind: "circuit" }>> = {}): PaintLayer => ({
    kind: "circuit", seed: 7, w: 34, h: 36, pitch: 2.4, tw: 0.8, pad: 2.2, drill: 0.7, density: 1, clip: "ellipse", dx: 0, dy: 0, rot: 0, slot: 2, slot2: 3, ...o,
  });

  test("seeded: one seed gives one board, byte for byte, and another seed another", () => {
    const a = render(circ()), b = render(circ());
    expect(a.map((r) => sha(maskOf(r)))).toEqual(b.map((r) => sha(maskOf(r))));
    expect(sha(maskOf(render(circ({ seed: 8 }))[0]!))).not.toBe(sha(maskOf(a[0]!)));
    expect(JSON.stringify(circuitGeometry({ seed: 7, w: 34, h: 36, pitch: 2.4, pad: 2.2, density: 1, clip: "ellipse" }))).toBe(JSON.stringify(circuitGeometry({ seed: 7, w: 34, h: 36, pitch: 2.4, pad: 2.2, density: 1, clip: "ellipse" })));
  });

  test("mulberry32 draws BAIL's stream", () => {
    const r = mulberry(7 * 9973 + 17);
    const first = [r(), r(), r()];
    expect(first.every((v) => v >= 0 && v < 1)).toBe(true);
    expect(mulberry(7 * 9973 + 17)()).toBe(first[0]);
    expect(mulberry(7 * 9973 + 18)()).not.toBe(first[0]);
  });

  test("traces and pads sit on the node grid inside the board; every trace has 3 or more nodes and a pad at each end", () => {
    const g = circuitGeometry({ seed: 11, w: 34, h: 36, pitch: 2.4, pad: 2.2, density: 1, clip: "ellipse" });
    expect(g.traces.length).toBeGreaterThan(5);
    expect(g.pads).toHaveLength(2 * g.traces.length);
    g.traces.forEach((t, k) => {
      expect(t.length).toBeGreaterThanOrEqual(3);
      expect(g.pads[2 * k]).toEqual(t[0]);
      expect(g.pads[2 * k + 1]).toEqual(t[t.length - 1]);
      for (const [x, y] of t) {
        expect(Math.abs(x)).toBeLessThanOrEqual(17 - 1.1 + 1e-9);
        expect(Math.abs(y)).toBeLessThanOrEqual(18 - 1.1 + 1e-9);
        expect(Math.abs(x / 2.4 - Math.round(x / 2.4))).toBeLessThan(1e-9);
        expect((x / (17 - 1.1)) ** 2 + (y / (18 - 1.1)) ** 2).toBeLessThanOrEqual(1.0001);
      }
    });
  });

  test("slots: traces in slot, pads in slot2, drills in the body, which is 0 (the host) without a palette", () => {
    const r = render(circ());
    expect(r.map((x) => ("slot" in x ? x.slot : -1))).toEqual([2, 3, 0]);
    const withBody = render(circ(), { ...ctx, palette: { slots: ["#111111", "#222222", "#333333"], body: 1 } });
    expect(withBody.map((x) => ("slot" in x ? x.slot : -1))).toEqual([2, 3, 1]);
  });

  test("a drill sits inside its pad, so composing the face leaves a hole in the pad slot", () => {
    const face = composeFace([circ() as PaintLayer], ctx);
    const pads = maskOf(render(circ())[1]!), drills = maskOf(render(circ())[2]!);
    let drilled = 0, padOnly = 0;
    for (let p = 0; p < pads.length; p++) {
      if (drills[p]) { expect(face.art.labels[p]).toBe(0); drilled++; expect(pads[p]).toBe(1); }
      else if (pads[p] && face.art.labels[p] === 3) padOnly++;
    }
    expect(drilled).toBeGreaterThan(50);
    expect(padOnly).toBeGreaterThan(drilled);
  });

  test("drill 0 drills nothing and density 0 draws no traces", () => {
    expect(count(maskOf(render(circ({ drill: 0 }))[2]!))).toBe(0);
    expect(count(maskOf(render(circ({ density: 0 }))[0]!))).toBe(0);
  });
});

describe("logo layers", () => {
  const logo = (brand: "hb" | "hsl", o: Partial<Extract<PaintLayer, { kind: "logo" }>> = {}): PaintLayer => ({
    kind: "logo", brand, w: 30, dx: 0, dy: 0, rot: 0, slot: 2, slot2: 3, ...o,
  });

  test("hb: the arc in slot, the wrench in slot2; hsl: the sun disc in slot2 first, the flames in slot over it", () => {
    expect(render(logo("hb")).map((r) => ("slot" in r ? r.slot : -1))).toEqual([2, 3]);
    expect(render(logo("hsl")).map((r) => ("slot" in r ? r.slot : -1))).toEqual([3, 2]);
  });

  test("both marks span their width and are deterministic", () => {
    for (const brand of ["hb", "hsl"] as const) {
      const a = render(logo(brand)), b = render(logo(brand));
      expect(a.map((r) => sha(maskOf(r)))).toEqual(b.map((r) => sha(maskOf(r))));
      const all = new Uint8Array(grid.w * grid.h);
      for (const r of a) maskOf(r).forEach((v, p) => { if (v) all[p] = 1; });
      const e = extent(all)!;
      // The mark's own ink spans most of the layer width; hsl is wider than tall, hb square.
      expect(e[1] - e[0]).toBeGreaterThan(brand === "hb" ? 22 : 24);
      expect(e[1] - e[0]).toBeLessThanOrEqual(30 * (brand === "hb" ? 1 : 1.05));
    }
  });

  test("w scales the mark and dx moves it", () => {
    const big = extent(maskOf(render(logo("hb", { w: 40 }))[0]!))!, small = extent(maskOf(render(logo("hb", { w: 20 }))[0]!))!;
    expect((big[1] - big[0]) / (small[1] - small[0])).toBeCloseTo(2, 1);
    const moved = extent(maskOf(render(logo("hb", { dx: 6 }))[0]!))!, home = extent(maskOf(render(logo("hb"))[0]!))!;
    expect(moved[0] - home[0]).toBeCloseTo(6, 0);
  });
});

describe("text with letter spacing and anchored arcs", () => {
  /** 1 mm a character, no kerning, as a recording surface. */
  const unit: Surface = {
    measure: (t) => [...t].length, fillText: () => undefined, fillPath: () => undefined, drawImage: () => undefined,
    readAlpha: (g) => new Uint8Array(g.w * g.h), readRgba: (g) => ({ width: g.w, height: g.h, data: new Uint8ClampedArray(g.w * g.h * 4) }), clear: () => undefined,
  };
  const text = (o: Partial<TextLayer> = {}): TextLayer => ({
    kind: "text", text: "ABCD", slot: 1, font: "IBM Plex Mono", size: 4, runGap: 0, mode: "straight", dx: 0, dy: 0, rot: 0, baseline: "middle", ...o,
  });

  test("without ls a run is one draw; with ls each glyph is a draw advancing width plus ls, centred on the run less one ls", () => {
    expect(layoutStraight(text(), unit)).toHaveLength(1);
    const d = layoutStraight(text({ ls: 0.5 }), unit);
    expect(d.map((x) => x.text)).toEqual(["A", "B", "C", "D"]);
    // total = 4 x (1 + 0.5) - 0.5 = 5.5, so the run starts at -2.75
    expect(d.map((x) => x.along)).toEqual([-2.75, -1.25, 0.25, 1.75]);
    expect(d.every((x) => x.baseline === "middle")).toBe(true);
  });

  test("with ls the pipe split still puts runGap between runs and accent on the second", () => {
    const d = layoutStraight(text({ text: "AB|CD", ls: 0.5, accent: 2, runGap: 1 }), unit);
    // runs 2 x (1 + 0.5) - 0.5 = 2.5 each, plus the gap 1: total 6, start -3, the second run at -3 + 2.5 + 1
    expect(d.map((x) => [x.text, x.slot, x.along])).toEqual([["A", 1, -3], ["B", 1, -1.5], ["C", 2, 0.5], ["D", 2, 2]]);
  });

  test("an arc without anchored is COLLAR's and ignores dx, dy, rot and baseline; anchored moves, turns and sets the baseline", () => {
    const arc = text({ mode: "arc", arcR: 10, arcDeg: 90, text: "AB", dx: 5, dy: 2, rot: 30 });
    const plain = layoutArc(arc, unit);
    expect(plain.map((d) => d.baseline)).toEqual([undefined, undefined]);
    expect(plain[0]!.x).toBeCloseTo(10 * Math.cos(Math.PI / 2 + 0.5 / 10), 9);
    const held = layoutArc({ ...arc, anchored: true }, unit);
    expect(held.every((d) => d.baseline === "middle")).toBe(true);
    const c = Math.cos(Math.PI / 6), s = Math.sin(Math.PI / 6);
    expect(held[0]!.x).toBeCloseTo(5 + c * plain[0]!.x - s * plain[0]!.y, 9);
    expect(held[0]!.y).toBeCloseTo(2 + s * plain[0]!.x + c * plain[0]!.y, 9);
    expect(held[0]!.rot).toBeCloseTo(plain[0]!.rot + Math.PI / 6, 9);
  });

  test("arc with ls advances each glyph by width plus ls and centres on the run less one ls", () => {
    const d = layoutArc(text({ mode: "arc", arcR: 10, arcDeg: 90, text: "ABC", ls: 1 }), unit);
    // glyph centres at s = -2, 0, +2 mm along the arc: total 3 x 2 - 1 = 5, start -2.5, centres -2, 0, 2
    expect(d.map((x) => x.angle)).toEqual([Math.PI / 2 + 2 / 10, Math.PI / 2, Math.PI / 2 - 2 / 10].map((v) => expect.closeTo(v, 12)));
  });

  test("lowering a BAIL text layer: arc 0 straight with slot2 after a pipe, arc above 0 top, below 0 bottom flipped", () => {
    const t = (o: Partial<Extract<ArtLayer, { kind: "text" }>>): TextLayer => lowerArtLayer(artLayer("text", "t", { font: "plexb", text: "hack|.build", ...o })) as TextLayer;
    expect(t({ slot: 1, slot2: 2 })).toMatchObject({ mode: "straight", accent: 2, bold: true, font: "IBM Plex Mono", baseline: "middle", ls: 0, runGap: 0.6 });
    expect(t({ arc: 17.2, slot: 1, slot2: 2 })).toMatchObject({ mode: "arc", arcR: 17.2, arcDeg: 90, flip: false, anchored: true, runGap: 0 });
    expect(t({ arc: 17.2 }).accent).toBeUndefined();
    expect(t({ arc: -18.4 })).toMatchObject({ arcR: 18.4, arcDeg: -90, flip: true });
  });
});

// ---- against BAIL's own canvas ----

interface Captured { name: string; layer: ArtLayer; masks: number[][]; circuit?: { traces: number[][][]; pads: number[][] } }
const captured = JSON.parse(gunzipSync(readFileSync(fileURLToPath(new URL("./fixtures/bail-canvas.json.gz", import.meta.url)))).toString("utf8")) as {
  sha256: string; grid: RasterGrid; cases: Captured[];
};
const unrle = (r: readonly number[], n: number): Uint8Array => {
  const m = new Uint8Array(n);
  let p = 0, v = 0;
  for (const run of r) { if (v) m.fill(1, p, p + run); p += run; v ^= 1; }
  return m;
};

describe("against BAIL's canvas (tools/inlay/bail-canvas.cjs, bail.html sha256 4accb6428d31)", () => {
  test("the fixture is of the canonical file at the grid the painters are held to", () => {
    expect(captured.sha256.startsWith("4accb6428d31")).toBe(true);
    expect(captured.grid).toEqual(grid);
    expect(captured.cases.length).toBe(44);
  });

  const diffOf = (a: Uint8Array, b: Uint8Array): number => { let d = 0; for (let p = 0; p < a.length; p++) if (a[p] !== b[p]) d++; return d; };

  // A canvas paints a cell when its coverage passes one half, with Skia's coarse supersampling;
  // the painters test the cell centre. The two differ on the cells an edge crosses.
  const LIMIT: Record<string, number> = { shape: 0.02, scope: 0.02, logo: 0.015, circuit: 0.08 };

  test.each(captured.cases.filter((c) => c.layer.kind !== "text" && c.layer.kind !== "circuit").map((c) => [c.name, c] as const))("%s: within 2 percent of the cells BAIL's canvas paints", (_n, c) => {
    const results = render(lowerArtLayer(c.layer));
    expect(results).toHaveLength(c.masks.length);
    results.forEach((r, i) => {
      const want = unrle(c.masks[i]!, grid.w * grid.h);
      expect(diffOf(maskOf(r), want) / Math.max(1, count(want)), `${c.name} part ${i}`).toBeLessThan(LIMIT[c.layer.kind]!);
      expect(count(want)).toBeGreaterThan(0);
    });
  });

  test.each(captured.cases.filter((c) => c.layer.kind === "circuit").map((c) => [c.name, c] as const))("%s: BAIL's own circuitOf, node for node, and its three parts within 8 percent", (_n, c) => {
    const L = c.layer as Extract<ArtLayer, { kind: "circuit" }>;
    const g = circuitGeometry(L);
    expect(JSON.stringify(g.traces)).toBe(JSON.stringify(c.circuit!.traces));
    expect(JSON.stringify(g.pads)).toBe(JSON.stringify(c.circuit!.pads));
    render(lowerArtLayer(L)).forEach((r, i) => {
      const want = unrle(c.masks[i]!, grid.w * grid.h);
      expect(diffOf(maskOf(r), want) / Math.max(1, count(want)), `part ${i}`).toBeLessThan(LIMIT["circuit"]!);
    });
  });

  // Text goes through a font. The node route sets IBM Plex Mono from its vendored outlines and
  // BAIL's canvas sets the loaded face, so the cells differ along every stroke: the placement is
  // compared. Horizontal ink extent agrees to a cell; vertically the node middle baseline sits
  // 0.075 em under Chrome's (measured here, 0.38 mm at 5 mm), so extents are held to 0.1 em.
  test.each(captured.cases.filter((c) => c.layer.kind === "text").map((c) => [c.name, c] as const))("%s: the ink lands where BAIL's canvas puts it", (_n, c) => {
    const L = c.layer as Extract<ArtLayer, { kind: "text" }>;
    const results = render(lowerArtLayer(c.layer));
    expect(results).toHaveLength(c.masks.length);
    results.forEach((r, i) => {
      const want = unrle(c.masks[i]!, grid.w * grid.h);
      const a = extent(maskOf(r))!, b = extent(want)!;
      const tol = L.arc === 0 ? 1.5 / RES : 0.1 * L.size + 1.5 / RES;
      if (L.arc === 0 && L.rot === 0) { expect(Math.abs(a[0] - b[0]), "left").toBeLessThanOrEqual(tol); expect(Math.abs(a[1] - b[1]), "right").toBeLessThanOrEqual(tol); }
      for (let k = 0; k < 4; k++) expect(Math.abs(a[k]! - b[k]!), `edge ${k}`).toBeLessThanOrEqual(k < 2 && L.arc === 0 ? Math.max(tol, 0.1 * L.size + 1.5 / RES) : 0.1 * L.size + 2 / RES + (L.arc !== 0 ? 0.3 : 0));
      expect(count(maskOf(r)) / count(want)).toBeGreaterThan(0.8);
      expect(count(maskOf(r)) / count(want)).toBeLessThan(1.2);
    });
  });
});
