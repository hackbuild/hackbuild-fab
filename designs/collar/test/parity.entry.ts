// designs/collar/test/parity.entry.ts
// The package side of the COLLAR browser parity (M03-T09 steps 3 and 6).
// tools/py/harness/collar_parity.py bundles this file with tsdown 0.23.0 as
// one IIFE (dist/parity.iife.js, loaded by parity.html from file://) and
// calls COLLAR_PARITY.run in the same Chromium context that drives the
// legacy page.
//
// It composes COLLAR's 'hack.build coin' preset (legacy collar.html lines
// 2853 to 2878) with @hackbuild/inlay on the bench-core canvas surface: the
// mark as a palette image, the back text through the pipe split, the
// collar-v5 hygiene recipe clipped to the art radius. The reeded edge and the
// rim band are geometry, outside the art grid. The per-slot volumes come from
// the design's own slab labeller (../build.ts labelBands) fed the package
// faces, the back mirrored by inlay mirrorX, as COLLAR buildMesh does
// (collar.html lines 1379 to 1393).
//
// The mark paths arrive from the harness, read from the brand seed svg
// (lineage brand.mark/seed-svg); this file keeps no copy of them.

import {
  artRadius, composeFace, hygiene, mirrorX,
  type Layer, type NativeImage, type RasterGrid,
} from "@hackbuild/inlay";
import { findConstant, loadProfile } from "@hackbuild/profile";
import { canvasSurface } from "@hackbuild/bench-core";
import { cellCounts, cellMm, labelBands, stateOf } from "../build";
import { chase, type CollarParams } from "../chase";

/** One path of the brand mark: SVG path data placed at `at` in the view box. */
export interface MarkPath {
  readonly at: readonly [number, number];
  readonly d: string;
}

export interface ParityInput {
  /** Grid cells across the diameter, count (COLLAR buildFace res). */
  readonly res: number;
  readonly mark: { readonly viewBox: readonly [number, number, number, number]; readonly arc: MarkPath; readonly wrench: MarkPath };
}

export interface ParityOutput {
  /** Slot per cell after hygiene, row 0 at the bottom, base64. */
  readonly front: string;
  readonly back: string;
  /** Per-slot volume, mm3 (computed), keyed by slot. */
  readonly volumes: Readonly<Record<string, number>>;
  /** Art radius, mm (computed). */
  readonly rArt: number;
  /** profile despeckle.factor as read, with its provenance tier. */
  readonly despeckle: { readonly value: number; readonly tier: string };
}

// ---- the preset, translated into inlay terms ----

/** Slot colours of the preset (collar.html lines 2862 to 2867); entry q is slot q + 1. */
const SLOTS = ["#1A1A1A", "#F5F0E6", "#FE0386", "#2B6CB0"] as const;

/** Art settings of the preset (collar.html line 2859): stroke boost, colour gap and min feature in mm, keepout in mm. */
const ART = { boost: 0.10, gap: 0.45, keep: 1.4, despeck: true, minF: 0.90 } as const;

/** Geometry params the preset sets over blankState (collar.html lines 2855 to 2860); every other field keeps its chase default. */
const PRESET: Partial<CollarParams> = {
  dia: 44, thk: 3.6, cham: 0.5, inlay: 1.2, layer: 0.2, nSlots: 3, base: 1,
  style: "reeded", count: 40, depth: 1.0, width: 2.8, twist: 35, gapDeg: 0,
  on: true, w: 2.2, rimSlot: 3, shape: "round",
};

/** The back face: hack in slot 2, .build in slot 3, Permanent Marker 8.4 mm, 0.7 mm of air at the split (collar.html lines 2873 to 2877). */
const BACK: Layer[] = [{
  kind: "text", text: "hack|.build", slot: 2, accent: 3, font: "Permanent Marker", size: 8.4,
  mode: "straight", dx: 0, dy: 0, rot: 0, runGap: 0.7, caps: false, bold: false,
}];

function chaseDefaults(): CollarParams {
  const out: Record<string, unknown> = {};
  for (const g of chase.params) for (const f of g.fields) out[f.id] = f.default;
  return out as CollarParams;
}

/** The mark as COLLAR's logoSVG draws it: the arc in slot 2's colour, the wrench in slot 3's (collar.html lines 2831 to 2834). */
async function markImage(mark: ParityInput["mark"]): Promise<NativeImage> {
  const [x, y, w, h] = mark.viewBox;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}">`
    + `<path transform="translate(${mark.arc.at[0]},${mark.arc.at[1]})" fill="${SLOTS[1]}" d="${mark.arc.d}"/>`
    + `<path transform="translate(${mark.wrench.at[0]},${mark.wrench.at[1]})" fill="${SLOTS[2]}" d="${mark.wrench.d}"/></svg>`;
  const img = new (globalThis as unknown as { Image: new () => BrowserImage }).Image();
  img.src = "data:image/svg+xml;base64," + btoa(svg);
  await img.decode();
  return { width: img.naturalWidth || img.width, height: img.naturalHeight || img.height, native: img };
}

/** The part of HTMLImageElement this page reads; the design tsconfig carries no DOM lib. */
interface BrowserImage {
  src: string;
  readonly naturalWidth: number;
  readonly naturalHeight: number;
  readonly width: number;
  readonly height: number;
  decode(): Promise<void>;
}

function b64(a: Uint8Array): string {
  let s = "";
  for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode(...a.subarray(i, i + 0x8000));
  return btoa(s);
}

async function run(input: ParityInput): Promise<ParityOutput> {
  const p: CollarParams = { ...chaseDefaults(), ...PRESET, res: input.res };
  const grid: RasterGrid = { w: input.res, h: input.res, res: input.res / p.dia };
  const surface = canvasSurface(grid);
  await surface.fontsReady(["Permanent Marker"]);
  const despeckle = findConstant(loadProfile().constants!, "despeckle.factor");
  const rArt = artRadius({ dia: p.dia, shape: { kind: p.shape, aspect: p.aspect, corner: p.corner }, rim: { on: p.on, w: p.w }, keep: ART.keep });
  const ctx = { surface, grid, rArt, palette: { slots: SLOTS.slice(0, p.nSlots), body: p.base } };
  const front: Layer[] = [{ kind: "image", img: await markImage(input.mark), mode: "palette", slot: 2, scale: 1, dx: 0, dy: 0, rot: 0 }];
  const face = (layers: readonly Layer[]) => {
    const c = composeFace(layers, ctx);
    const art = hygiene(c.art, "collar-v5", {
      boost: ART.boost, gap: ART.gap, minF: ART.minF, despeck: ART.despeck,
      despeckleFactor: despeckle.value, clip: { kind: "circle", r: rArt },
    });
    return { art: art.labels, holes: c.holes };
  };
  const F = face(front), B = face(BACK);
  const n = input.res * input.res;
  let holes: Uint8Array | null = null;
  if (F.holes !== null || B.holes !== null) {
    holes = new Uint8Array(n);
    const bh = B.holes === null ? null : mirrorX(B.holes, input.res, input.res);
    for (let q = 0; q < n; q++) if (F.holes?.[q] || bh?.[q]) holes[q] = 1;
  }
  const st = stateOf(p);
  const bands = labelBands(st, (z) => z, { artF: F.art, artB: mirrorX(B.art, input.res, input.res), holes });
  const a = cellMm(st) * cellMm(st);
  const volumes: Record<string, number> = {};
  for (const b of bands) {
    const per = cellCounts([b]);
    for (const [s, c] of Object.entries(per)) volumes[s] = (volumes[s] ?? 0) + c * a * (b.z1 - b.z0);
  }
  return { front: b64(F.art), back: b64(B.art), volumes, rArt, despeckle: { value: despeckle.value, tier: despeckle.provenance.tier } };
}

(globalThis as { COLLAR_PARITY?: unknown }).COLLAR_PARITY = { run };
