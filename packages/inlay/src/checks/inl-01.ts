// CHK-INL-01 no stroke below line width (CHECKS.md 6, version 2.0.0, now on
// `inlay` instead of `pocket`). Measured: the area of this feature's slot
// cells, both faces, that a print-forge open at radius minF / 2 removes
// (openLabels, the one disc open of hygiene/disc.ts, r = floor(minF / 2 x
// res) cells). Legal: 0 mm2. A recipe that opens at the same radius leaves
// nothing to remove, since an open of an open is the open; a stroke under
// the floor, or a recipe with no open step, leaves cells behind.

import type { CheckCtx, Finding, Part } from "@hackbuild/spec";
import { artFaces, artOf, type InlayDecl } from "../kind.js";
import { openLabels } from "../hygiene/disc.js";
import type { LabelGrid } from "../surface.js";
import { minFeatureOf, tidy } from "./common.js";

export const CHK_INL_01 = "CHK-INL-01" as const;
export const CHK_INL_01_VERSION = "2.0.0";

/** CHK-INL-01 on one label grid, without a Part: what the eval harness and the run body share. */
export interface Inl01GridCtx {
  /** stroke floor, mm (profile inlay.minFeature or a larger feature value) */
  readonly minF: number;
  /** slots measured; every label present other than 0 and `host` when omitted */
  readonly slots?: readonly number[];
  /** the slot art is carved from, never measured */
  readonly host?: number;
}

export interface Inl01Grid {
  readonly verdict: "pass" | "fail";
  /** mm2 of measured slot cells the open removes */
  readonly measured: number;
  readonly removedCells: number;
  readonly openRadiusCells: number;
}

/** The open radius print-forge applies at a min feature, cells: floor(minF / 2 x res). */
export function inl01Radius(minF: number, res: number): number {
  return Math.max(0, Math.floor((minF / 2) * res));
}

function removed(labels: Uint8Array, w: number, h: number, slot: number, r: number): number {
  const opened = labels.slice();
  openLabels(opened, w, h, slot, r, 0);
  let n = 0;
  for (let p = 0; p < labels.length; p++) if (labels[p] === slot && opened[p] !== slot) n++;
  return n;
}

/** Cells of the measured slots an open at the min-feature radius removes; legal 0. */
export function checkInl01(grid: LabelGrid, ctx: Inl01GridCtx): Inl01Grid {
  const { w, h, res, labels } = grid;
  const host = ctx.host ?? 0;
  let slots = ctx.slots;
  if (slots === undefined) {
    const seen = new Set<number>();
    for (let p = 0; p < labels.length; p++) { const v = labels[p]!; if (v !== 0 && v !== host) seen.add(v); }
    slots = [...seen].sort((a, b) => a - b);
  }
  const r = inl01Radius(ctx.minF, res);
  let n = 0;
  for (const s of slots) n += removed(labels, w, h, s, r);
  return { verdict: n === 0 ? "pass" : "fail", measured: tidy(n / (res * res), 6), removedCells: n, openRadiusCells: r };
}

export function runInl01(t: { readonly part: Part; readonly feature: InlayDecl }, ctx: CheckCtx): readonly Finding[] {
  const f = t.feature;
  const faces = artFaces(artOf(f));
  const { minF, profileMinF, from } = minFeatureOf(f, ctx);
  const res = faces.top.art.res;
  const top = checkInl01(faces.top.art, { minF, slots: [f.slot] });
  const bed = checkInl01(faces.bed.art, { minF, slots: [f.slot] });
  const r = top.openRadiusCells;
  const cells = top.removedCells + bed.removedCells;
  const area = tidy(cells / (res * res), 6);
  return [{
    verdict: cells === 0 ? "pass" : "fail",
    target: { level: "feature", part: t.part.id, feature: f.id },
    measured: area,
    legal: { kind: "interval", lo: 0, hi: 0, unit: "mm2", nearest: 0 },
    constraint: `slot ${f.slot} strokes under min feature ${minF} mm (${from === "profile" ? `profile inlay.minFeature ${profileMinF} mm, inferred` : `the feature's minFeature, profile floor ${profileMinF} mm inferred`}) do not print with this nozzle: an open at radius ${r} cells removes nothing`,
    extra: { slot: f.slot, openRadiusCells: r, removedTopCells: top.removedCells, removedBedCells: bed.removedCells, cellMm: tidy(1 / res, 9) },
  }];
}
