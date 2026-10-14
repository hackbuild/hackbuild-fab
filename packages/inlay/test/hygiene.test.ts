// M03-T05: the three hygiene recipes against their benches, cell for cell.
// Oracles are the legacy code run unchanged (fixtures/hygiene-legacy.ts) and
// the browser captures of COLLAR v5 and SPRUE (scripts/hygiene-fixtures.mjs),
// never the port itself. Numbers in the tables are computed from the card's
// formulas; island sizes are computed by the legacy bench in Chromium.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { describe, expect, test } from "vitest";
import { boxDilate } from "../src/hygiene/box.js";
import { DESPECKLE_FACTOR_ID, despeckleCells, despeckleFactor, islandSizes } from "../src/hygiene/despeckle.js";
import { spanDilate, spanErode } from "../src/hygiene/disc.js";
import { hygiene, RECIPES, type CollarHygiene, type PrintForgeHygiene } from "../src/hygiene/recipes.js";
import { THIN_WEAK_KEPT, thinFlags } from "../src/hygiene/thin.js";
import type { LabelGrid } from "../src/surface.js";
import {
  collarCapture, collarLegacyHygiene, fixtureBytes, fixtureHashes, inlayLegacyHygiene, legacyDespeckleCells,
  sprueCapture, sprueEngine, sprueLegacyClean,
} from "./fixtures/hygiene-legacy.js";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const FACTOR = despeckleFactor(createProfileLookup(loadProfile()));

/** Deterministic xorshift32, so a failing case reproduces from its seed. */
function rng(seed: number): () => number {
  let x = seed >>> 0 || 1;
  return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
}

/** A label grid of random discs, bars and single-cell specks in slots 1 to nSlots over `base`. */
function blobs(w: number, h: number, nSlots: number, base: number, seed: number): Uint8Array {
  const r = rng(seed), g = new Uint8Array(w * h).fill(base);
  for (let k = 0; k < 18; k++) {
    const s = 1 + Math.floor(r() * nSlots), cx = r() * w, cy = r() * h;
    const kind = r();
    if (kind < 0.4) {
      const rad = 0.5 + r() * 7;
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if ((i + 0.5 - cx) ** 2 + (j + 0.5 - cy) ** 2 <= rad * rad) g[j * w + i] = s;
    } else if (kind < 0.8) {
      const len = 4 + r() * 30, thick = 1 + Math.floor(r() * 5), vert = r() < 0.5;
      for (let t = 0; t < len; t++) for (let u = 0; u < thick; u++) {
        const i = Math.floor(vert ? cx + u : cx + t), j = Math.floor(vert ? cy + t : cy + u);
        if (i >= 0 && j >= 0 && i < w && j < h) g[j * w + i] = s;
      }
    } else {
      for (let q = 0; q < 6; q++) {
        const i = Math.floor(r() * w), j = Math.floor(r() * h);
        g[j * w + i] = s;
      }
    }
  }
  return g;
}

const diff = (a: Uint8Array, b: Uint8Array): number => {
  if (a.length !== b.length) return Infinity;
  let n = 0;
  for (let p = 0; p < a.length; p++) if (a[p] !== b[p]) n++;
  return n;
};

describe("despeckle threshold", () => {
  test("the factor is profile constant despeckle.factor, 0.35", () => {
    expect(DESPECKLE_FACTOR_ID).toBe("despeckle.factor");
    expect(FACTOR).toBe(0.35);
  });

  test("a factor outside (0, 1] is E_SCHEMA", () => {
    const bad = { constant: (id: string) => ({ id, value: 1.5, unit: "fraction", provenance: { tier: "inferred", method: "failure", date: "2026-10-06", source: "test" } }) };
    expect(() => despeckleFactor(bad as never)).toThrow(/E_SCHEMA/);
  });

  // The card table (M03-T05, computed): bench, px per mm, minF mm, radius px, 0.35 cells, full disc cells.
  const TABLE: [string, number, number, number, number, number][] = [
    ["COLLAR v5", 512 / 44, 0.9, 5.236, 30, 86],
    ["INLAY", 8, 0.6, 2.4, 6, 18],
    ["SASH", 10, 0.6, 3.0, 10, 28],
    ["KNUCKLE", 6, 0.6, 1.8, 4, 10],
  ];
  test.each(TABLE)("%s: despeckleCells equals the card table", (_, res, minF, radius, cells, full) => {
    expect((minF / 2) * res).toBeCloseTo(radius, 3);
    expect(despeckleCells(minF, res, FACTOR)).toBe(cells);
    expect(despeckleCells(minF, res, 1)).toBe(full);
  });

  test("equals both legacy expressions over minF 0.30 to 2.00 and five resolutions", () => {
    const legacy = legacyDespeckleCells();
    let n = 0;
    for (const res of [512 / 44, 512 / 40, 6, 8, 10, 12]) {
      for (let c = 30; c <= 200; c++) {
        const minF = c / 100;
        expect(Math.max(1, despeckleCells(minF, res, 0.35)), `collar ${minF} ${res}`).toBe(legacy.collar(minF, res));
        expect(despeckleCells(minF, res, 0.35), `inlay ${minF} ${res}`).toBe(legacy.inlay(minF, res));
        n++;
      }
    }
    expect(n).toBe(1026);
  });
});

describe("fixtures", () => {
  test("every fixture file matches collar-back-512.sha256", () => {
    const want = fixtureHashes();
    expect([...want.keys()].sort()).toEqual(["collar-512.legacy.json.gz", "collar-back-512.labels.bin", "sprue-phx.legacy.json.gz"]);
    for (const [name, h] of want) expect(createHash("sha256").update(fixtureBytes(name)).digest("hex"), name).toBe(h);
  });

  test("the card file is the back face pre-hygiene grid of the capture", () => {
    const cap = collarCapture();
    expect(diff(new Uint8Array(fixtureBytes("collar-back-512.labels.bin")), cap.faces.back.pre)).toBe(0);
    expect(cap.res).toBe(512);
    expect(cap.dia).toBe(44);
    expect(cap.art).toEqual({ boost: 0.1, gap: 0.45, keep: 1.4, despeck: true, minF: 0.9 });
  });
});

// ---- collar-v5

const capture = collarCapture();
const K = capture.res / capture.dia;
const collarCtx = (over: Partial<CollarHygiene> = {}): CollarHygiene => ({
  boost: capture.art.boost, gap: capture.art.gap, minF: capture.art.minF, despeck: capture.art.despeck,
  despeckleFactor: FACTOR, clip: { kind: "circle", r: capture.rArt }, ...over,
});
const grid512 = (labels: Uint8Array): LabelGrid => ({ w: 512, h: 512, res: K, labels });

/** The full stop of hack|.build: the slot 3 island whose leftmost cell is furthest left on the back face. */
function fullStop(pre: Uint8Array): number[] {
  const seen = new Uint8Array(pre.length);
  let best: number[] = [], bestX = Infinity;
  for (let s = 0; s < pre.length; s++) {
    if (pre[s] !== 3 || seen[s]) continue;
    const st = [s], cells: number[] = [];
    seen[s] = 1;
    while (st.length) {
      const p = st.pop()!;
      cells.push(p);
      const i = p % 512;
      for (const q of [i > 0 ? p - 1 : -1, i < 511 ? p + 1 : -1, p - 512, p + 512]) if (q >= 0 && q < pre.length && !seen[q] && pre[q] === 3) { seen[q] = 1; st.push(q); }
    }
    const minX = Math.min(...cells.map((p) => p % 512));
    if (minX < bestX) { bestX = minX; best = cells; }
  }
  return best;
}

describe("collar-v5 on the COLLAR hack.build preset at res 512 (browser capture)", () => {
  test.each(["front", "back"] as const)("%s face: 0 differing cells against the legacy buildFace", (face) => {
    const f = capture.faces[face];
    const got = hygiene(grid512(f.pre), "collar-v5", collarCtx());
    expect(diff(got.labels, f.post)).toBe(0);
  });

  test("the back face changes under hygiene, so the comparison is not vacuous", () => {
    expect(diff(capture.faces.back.pre, capture.faces.back.post)).toBeGreaterThan(1000);
  });

  test("island count and sizes after hygiene equal the legacy count captured with the fixture", () => {
    for (const face of ["front", "back"] as const) {
      const got = islandSizes(hygiene(grid512(capture.faces[face].pre), "collar-v5", collarCtx()).labels, 512, 512);
      const want = capture.faces[face].islandsPost;
      expect([...got.keys()].sort().map(String)).toEqual(Object.keys(want).sort());
      for (const [slot, sizes] of got) expect([...sizes].sort((a, b) => a - b), `${face} slot ${slot}`).toEqual([...want[String(slot)]!].sort((a, b) => a - b));
    }
    expect(Object.values(capture.faces.back.islandsPost).flat().length).toBe(11);
  });

  test("the input is never changed", () => {
    const pre = capture.faces.back.pre.slice();
    hygiene(grid512(pre), "collar-v5", collarCtx());
    expect(diff(pre, capture.faces.back.pre)).toBe(0);
  });
});

describe("the full stop of hack|.build (COLLAR v3 failure)", () => {
  const pre = capture.faces.back.pre;
  const stop = fullStop(pre);
  const kept = (labels: Uint8Array): number => stop.filter((p) => labels[p] === 3).length;

  test("the full stop is a 239 cell slot 3 island at res 512 across 44 mm", () => {
    expect(stop.length).toBe(239);
  });

  test("at the v5 default min feature 0.90 it survives at 0.35 and at 1.0, since 239 cells exceed the 86 cell full disc", () => {
    expect(kept(hygiene(grid512(pre), "collar-v5", collarCtx()).labels)).toBeGreaterThan(200);
    expect(kept(hygiene(grid512(pre), "collar-v5", collarCtx({ despeckleFactor: 1 })).labels)).toBeGreaterThan(200);
  });

  test("at min feature 1.60 (a 1.6 mm dot) it survives at 0.35 (95 cells) and is removed at 1.0 (272 cells)", () => {
    expect(despeckleCells(1.6, K, FACTOR)).toBe(95);
    expect(despeckleCells(1.6, K, 1)).toBe(272);
    expect(kept(hygiene(grid512(pre), "collar-v5", collarCtx({ minF: 1.6 })).labels)).toBeGreaterThan(200);
    expect(kept(hygiene(grid512(pre), "collar-v5", collarCtx({ minF: 1.6, despeckleFactor: 1 })).labels)).toBe(0);
  });

  test("the node run of the legacy hygiene agrees at both factors", () => {
    const legacy = collarLegacyHygiene();
    const a = legacy(pre, 512, 44, { ...capture.art, minF: 1.6 }, capture.rArt);
    expect(kept(a)).toBeGreaterThan(200);
    expect(diff(hygiene(grid512(pre), "collar-v5", collarCtx({ minF: 1.6 })).labels, a)).toBe(0);
  });
});

describe("collar-v5 against the legacy hygiene run in node", () => {
  const legacy = collarLegacyHygiene();

  test("the node run reproduces the browser capture on both faces", () => {
    for (const face of ["front", "back"] as const) {
      const f = capture.faces[face];
      expect(diff(legacy(f.pre, 512, 44, capture.art, capture.rArt), f.post)).toBe(0);
    }
  });

  // boost and gap span below and above the 1 px switch; minF spans the bench range.
  const CASES: [number, number, number, number, boolean][] = [];
  for (let seed = 1; seed <= 8; seed++) {
    const r = rng(seed * 7919);
    CASES.push([seed, Math.round(r() * 60) / 100, Math.round(r() * 150) / 100, 0.3 + Math.round(r() * 170) / 100, r() < 0.8]);
  }
  CASES.push([101, 0.1, 0.45, 0.9, true], [102, 0.6, 0, 2, true], [103, 0, 1.5, 0.3, false]);

  test.each(CASES)("seed %i boost %f gap %f minF %f despeck %s", (seed, boost, gap, minF, despeck) => {
    const res = 96, dia = 44, k = res / dia, rArt = 18.4;
    const pre = blobs(res, res, 3, 0, seed);
    const want = legacy(pre, res, dia, { boost, gap, minF, despeck }, rArt);
    const got = hygiene({ w: res, h: res, res: k, labels: pre }, "collar-v5", { boost, gap, minF, despeck, despeckleFactor: FACTOR, clip: { kind: "circle", r: rArt } });
    expect(diff(got.labels, want)).toBe(0);
  });

  test("a mask clip equal to the circle gives the circle result; clip none keeps the corners", () => {
    const res = 96, k = res / 44, rArt = 18.4, pre = blobs(res, res, 3, 0, 5);
    const circle = new Uint8Array(res * res);
    for (let j = 0; j < res; j++) for (let i = 0; i < res; i++) {
      const x = (i + 0.5 - res / 2) / k, y = (j + 0.5 - res / 2) / k;
      if (x * x + y * y <= rArt * rArt) circle[j * res + i] = 1;
    }
    const g = { w: res, h: res, res: k, labels: pre };
    const base = { boost: 0.1, gap: 0.45, minF: 0.9, despeck: true, despeckleFactor: FACTOR };
    const a = hygiene(g, "collar-v5", { ...base, clip: { kind: "circle", r: rArt } });
    const b = hygiene(g, "collar-v5", { ...base, clip: { kind: "mask", mask: circle } });
    const c = hygiene(g, "collar-v5", { ...base, clip: { kind: "none" } });
    expect(diff(a.labels, b.labels)).toBe(0);
    expect(diff(a.labels, c.labels)).toBeGreaterThan(0);
  });

  test("boxDilate under 1 px returns the same mask and at 2.62 px grows by a 3 px box", () => {
    const m = new Uint8Array(11 * 11);
    m[5 * 11 + 5] = 1;
    expect(boxDilate(m, 11, 11, 0.58)).toBe(m);
    const g = boxDilate(m, 11, 11, (0.45 * K) / 2);
    expect(g.reduce((a, v) => a + v, 0)).toBe(49);
  });
});

// ---- print-forge

describe("print-forge against INLAY composeFace hygiene over the seed RasterMesh", () => {
  const legacy = inlayLegacyHygiene();
  const CASES: [string, number, number, PrintForgeHygiene][] = [
    ["INLAY defaults", 8, 11, { boost: 0.15, gap: 0, minF: 0.6, despeck: true, despeckleFactor: FACTOR, host: 1, slots: 3 }],
    ["SASH res", 10, 12, { boost: 0.15, gap: 0, minF: 0.6, despeck: true, despeckleFactor: FACTOR, host: 1, slots: 3 }],
    ["KNUCKLE res", 6, 13, { boost: 0.15, gap: 0, minF: 0.6, despeck: true, despeckleFactor: FACTOR, host: 2, slots: 4 }],
    ["gap 0.2", 10, 14, { boost: 0.1, gap: 0.2, minF: 0.6, despeck: true, despeckleFactor: FACTOR, host: 1, slots: 3 }],
    ["no despeckle", 8, 15, { boost: 0, gap: 0.25, minF: 0.9, despeck: false, despeckleFactor: FACTOR, host: 3, slots: 4 }],
  ];
  test.each(CASES)("%s: 0 differing cells", (_, res, seed, ctx) => {
    const W = 90, H = 70, labels = blobs(W, H, ctx.slots, ctx.host, seed);
    const want = legacy(labels, W, H, res, { boost: ctx.boost, minF: ctx.minF, gap: ctx.gap, despeckle: ctx.despeck }, ctx.slots, ctx.host);
    const got = hygiene({ w: W, h: H, res, labels }, "print-forge", ctx);
    expect(diff(got.labels, want)).toBe(0);
    expect(diff(labels, want)).toBeGreaterThan(0);
  });

  test("air outside the blank (label 0) never triggers the colour gap", () => {
    const W = 80, H = 80, labels = blobs(W, H, 3, 1, 31);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (Math.hypot(i + 0.5 - 40, j + 0.5 - 40) > 30) labels[j * W + i] = 0;
    const ctx: PrintForgeHygiene = { boost: 0, gap: 0.3, minF: 0.25, despeck: false, despeckleFactor: FACTOR, host: 1, slots: 3 };
    const want = legacy(labels, W, H, 10, { boost: 0, minF: 0.25, gap: 0.3, despeckle: false }, 3, 1);
    expect(diff(hygiene({ w: W, h: H, res: 10, labels }, "print-forge", ctx).labels, want)).toBe(0);
  });

  test("on the COLLAR back face art at 11.64 px per mm: 0 differing cells", () => {
    const labels = capture.faces.back.pre.map((v) => (v === 0 ? 1 : v));
    const ctx: PrintForgeHygiene = { boost: 0.15, gap: 0.2, minF: 0.6, despeck: true, despeckleFactor: FACTOR, host: 1, slots: 3 };
    const want = legacy(labels, 512, 512, K, { boost: 0.15, minF: 0.6, gap: 0.2, despeckle: true }, 3, 1);
    expect(diff(hygiene(grid512(labels), "print-forge", ctx).labels, want)).toBe(0);
  });

  test("the rim band is re-stamped after hygiene", () => {
    const W = 40, H = 40, labels = blobs(W, H, 3, 1, 21), rim = new Uint8Array(W * H);
    for (let i = 0; i < W; i++) { rim[i] = 1; rim[(H - 1) * W + i] = 1; }
    const got = hygiene({ w: W, h: H, res: 8, labels }, "print-forge", { boost: 0.15, gap: 0, minF: 0.6, despeck: true, despeckleFactor: FACTOR, host: 1, slots: 3, restamp: { mask: rim, slot: 3 } });
    for (let p = 0; p < W * H; p++) if (rim[p]) expect(got.labels[p]).toBe(3);
  });
});

// ---- sprue

const sprue = sprueCapture();

describe("sprue on the SPRUE phx preset at ppm 12 (browser capture)", () => {
  const ctx = { minF: sprue.st.minF, minGap: sprue.st.minGap, zone: sprue.zone.d };
  const ring = sprue.st.kind === "coin" && sprue.st.ring ? { ring: sprue.ring.d } : {};
  const g = (m: { w: number; h: number; d: Uint8Array }): LabelGrid => ({ w: m.w, h: m.h, res: sprue.st.ppm, labels: m.d });

  test("the capture is the phx pick at ppm 12, minF 0.6, minGap 0.35, with three back layers", () => {
    expect(sprue.st).toMatchObject({ kind: "pick", minF: 0.6, minGap: 0.35, ppm: 12 });
    expect(sprue.faces.back.layers.map((L) => L.text)).toEqual(["FAN", "PROJECT", "PHX 2026"]);
  });

  test.each(["front", "back"] as const)("%s face: 0 differing cells", (face) => {
    const f = sprue.faces[face];
    expect(diff(hygiene(g(f.raw), "sprue", { ...ctx, ...ring }).labels, f.clean.d)).toBe(0);
  });

  test("each back layer alone: 0 differing cells, and the cleanup moves cells", () => {
    let moved = 0;
    for (const L of sprue.faces.back.layers) {
      expect(diff(hygiene(g(L.raw), "sprue", ctx).labels, L.clean.d), L.text ?? "").toBe(0);
      moved += diff(L.raw.d, L.clean.d);
    }
    expect(moved).toBeGreaterThan(0);
  });

  test("thin flags equal the flags the page set", () => {
    const layers = sprue.faces.back.layers.map((L, i) => ({ param: `/faces/back/${i}`, raw: g(L.raw) }));
    const got = thinFlags(layers, "sprue", ctx);
    expect(got.layers.map((r) => r.flag)).toEqual(sprue.faces.back.layers.map((L) => L.thin));
  });

  test("the node run of the legacy cleanup reproduces the capture", () => {
    const clean = sprueLegacyClean();
    for (const L of sprue.faces.back.layers) {
      const out = clean({ ...L.raw, d: L.raw.d.slice() }, { ...sprue.st }, { ppm: sprue.st.ppm, ring: sprue.ring }, [L]);
      expect(diff(out.d, L.clean.d)).toBe(0);
    }
  });
});

describe("sprue ring and zone (coin kind; the phx pick carries no ring)", () => {
  test("ring cells are ORed after cleaning, zone ANDed before, as the legacy lines do", () => {
    const S = sprueEngine(), clean = sprueLegacyClean();
    const w = 64, h = 64, m = blobs(w, h, 1, 0, 77), ring = new Uint8Array(w * h), zone = new Uint8Array(w * h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const d = Math.hypot(i + 0.5 - 32, j + 0.5 - 32);
      if (d > 28 && d <= 31) ring[j * w + i] = 1;
      if (d <= 28) zone[j * w + i] = 1;
    }
    const zoned = { w, h, d: m.map((v, p) => v & zone[p]!) };
    const want = clean({ ...zoned, d: zoned.d.slice() }, { minF: 0.6, minGap: 0.35, kind: "coin", ring: true }, { ppm: 12, ring: { w, h, d: ring } }, null);
    const got = hygiene({ w, h, res: 12, labels: m }, "sprue", { minF: 0.6, minGap: 0.35, zone, ring });
    expect(diff(got.labels, want.d)).toBe(0);
    expect(S.count({ w, h, d: ring })).toBeGreaterThan(0);
    for (let p = 0; p < w * h; p++) if (ring[p]) expect(got.labels[p]).toBe(1);
    expect(diff(hygiene({ w, h, res: 12, labels: m }, "sprue", { minF: 0.6, minGap: 0.35, ring }).labels, want.d)).toBeGreaterThan(0);
  });
});

describe("SPRUE disc against the legacy engine", () => {
  const S = sprueEngine();
  test.each([[1, 0.4], [2, 1.2], [3, 2.1], [4, 3.6], [5, 4.49], [6, 6]])("seed %i radius %f: dilate and erode equal", (seed, r) => {
    const w = 61, h = 47, m = blobs(w, h, 1, 0, seed + 400);
    expect(diff(spanDilate(m, w, h, r), S.dilate({ w, h, d: m }, r).d)).toBe(0);
    expect(diff(spanErode(m, w, h, r), S.erode({ w, h, d: m }, r).d)).toBe(0);
  });

  test("out-of-grid cells do not erode a full grid", () => {
    const full = new Uint8Array(20 * 20).fill(1);
    expect(spanErode(full, 20, 20, 3).every((v) => v === 1)).toBe(true);
  });
});

describe("thinFlags", () => {
  const ppm = 12, w = 120, h = 60;
  const bar = (widthPx: number): LabelGrid => {
    const labels = new Uint8Array(w * h);
    for (let j = 30; j < 30 + widthPx; j++) for (let i = 10; i < 110; i++) labels[j * w + i] = 1;
    return { w, h, res: ppm, labels };
  };

  test("a 0.3 mm line at ppm 12 with minF 0.6 is gone, as a THIN_GONE build warning", () => {
    const r = thinFlags([{ param: "/faces/back/0", raw: bar(Math.round(0.3 * ppm)) }], "sprue", { minF: 0.6, minGap: 0.35 });
    expect(r.layers[0]).toMatchObject({ flag: "gone", raw: 400, kept: 0 });
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0]).toMatchObject({ code: "THIN_GONE", param: "/faces/back/0" });
  });

  test("a 1.0 mm bar keeps most cells, no flag; weak under 75 percent kept", () => {
    expect(THIN_WEAK_KEPT).toBe(0.75);
    const ok = thinFlags([{ param: "/a", raw: bar(12) }], "sprue", { minF: 0.6, minGap: 0.35 });
    expect(ok.layers[0]!.flag).toBeNull();
    expect(ok.warnings).toHaveLength(0);
    // A 9 cell bar with a row of single specks: the specks go, the bar stays.
    const g = bar(9);
    for (let j = 0; j <= 20; j += 2) for (let i = 10; i < 110; i += 2) g.labels[j * w + i] = 1;
    const weak = thinFlags([{ param: "/b", raw: g }], "sprue", { minF: 0.6, minGap: 0.35 });
    expect(weak.layers[0]!.kept / weak.layers[0]!.raw).toBeLessThan(0.75);
    expect(weak.layers[0]!.flag).toBe("weak");
    expect(weak.warnings[0]!.code).toBe("THIN_WEAK");
  });
});

describe("recipe registry", () => {
  test("three recipes, each naming the canonical row the README lists", () => {
    const readme = readFileSync(root + "packages/inlay/README.md", "utf8");
    const rows = readme.slice(readme.indexOf("## Hygiene recipes")).split("\n").filter((l) => /^\| (collar-v5|print-forge|sprue) \|/.test(l));
    const fromReadme = Object.fromEntries(rows.map((l) => l.split("|").map((c) => c.trim()).slice(1, 3)));
    expect(Object.keys(RECIPES)).toEqual(["collar-v5", "print-forge", "sprue"]);
    for (const [id, def] of Object.entries(RECIPES)) expect(def.lineage, id).toBe(fromReadme[id]);
  });

  test("an unknown recipe is E_REF and a short label array is E_SCHEMA", () => {
    expect(() => hygiene({ w: 2, h: 2, res: 1, labels: new Uint8Array(4) }, "potrace" as never, {} as never)).toThrow(/E_REF/);
    expect(() => hygiene({ w: 2, h: 2, res: 1, labels: new Uint8Array(3) }, "sprue", { minF: 0.6, minGap: 0.35 })).toThrow(/E_SCHEMA/);
  });
});
