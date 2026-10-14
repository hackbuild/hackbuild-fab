// The gate program interpreter (M05-T15 step 1): one registry from step
// kind to its family's run body, so every board runs the same gate logic
// over its own declarations, in the order its generator prints them.

import type { EmittedLayer, GateKind, GateStep } from "@hackbuild/copper";
import type { Gate, GateCtx } from "./gate.js";
import { artGaps } from "./art.js";
import { clipStagger } from "./clips.js";
import { slidingFilm, zoneGates } from "./film.js";
import { isomorphic } from "./lattice.js";
import { accents, bare, maskKeepout, maskPiece, overhang, padsClear } from "./mask.js";
import { erodeSurvival, minClearance, netlistAudit, outlineKeepout, singleIsland } from "./nets.js";
import { plateArea, plateCount, plateGap, plateIslands, solidPlate } from "./plates.js";
import { channels, depthAlternates, depthStep, fieldJaws, fieldPitch, fingerGap, laneBudget, lanes, parked, railOrder, subLanes } from "./rail.js";
import { ratioSlider, sliderKeepout, travel } from "./ratio.js";
import { filmKeepout, oneDocumentSize, spacersOnePiece } from "./sheets.js";
import { sliderGates } from "./slider.js";
import { wiperGates } from "./wiper.js";
import { apart, inside, stock, zoneGap } from "./zones.js";

type Run<K extends GateKind> = (ctx: GateCtx, step: Extract<GateStep, { kind: K }>, layers: readonly EmittedLayer[]) => Gate[];

/** Every step kind to its run body. */
export const GATE_STEPS: { readonly [K in GateKind]: Run<K> } = {
  islands: (ctx, s) => singleIsland(ctx, s.pad),
  audit: (ctx) => [netlistAudit(ctx)],
  clearance: (ctx) => [minClearance(ctx)],
  keepout: (ctx) => [outlineKeepout(ctx)],
  erode: (ctx, s) => erodeSurvival(ctx, s.style, s.pad),
  artGaps: (ctx) => artGaps(ctx),
  wedge: (ctx, s) => {
    const sl = ctx.board.draft.sliders[s.slider];
    if (sl === undefined) throw new Error(`wedge step names slider ${s.slider}; the draft declares ${ctx.board.draft.sliders.length}`);
    return sliderGates(ctx, sl);
  },
  stagger: (ctx) => [clipStagger(ctx)],
  zones: (ctx) => zoneGates(ctx),
  slidingFilm: (ctx) => slidingFilm(ctx),
  wiper: (ctx) => wiperGates(ctx),
  filmKeepout: (ctx) => [filmKeepout(ctx)],
  spacers: (ctx) => [spacersOnePiece(ctx)],
  docSize: (ctx, _s, layers) => [oneDocumentSize(ctx, layers)],
  solid: solidPlate,
  plateArea,
  plateCount,
  plateIslands,
  gap: plateGap,
  ratio: ratioSlider,
  travel,
  sliderKeepout,
  inside,
  apart,
  zoneGap,
  fieldPitch,
  fieldJaws,
  fingerGap,
  depthStep,
  depthAlternates,
  railOrder,
  parked,
  lanes,
  subLanes,
  laneBudget,
  channels,
  bare,
  padsClear,
  overhang,
  maskPiece,
  accents,
  maskKeepout,
  isomorphic,
  stock,
};

/** Run the board's program in order. */
export function runProgram(ctx: GateCtx, layers: readonly EmittedLayer[]): Gate[] {
  return ctx.board.draft.program.flatMap((step) => (GATE_STEPS[step.kind] as Run<GateKind>)(ctx, step as never, layers));
}
