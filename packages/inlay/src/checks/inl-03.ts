// CHK-INL-03 inlay depth meets the opacity floor for the filament pair
// (CHECKS.md 6, version 2.0.0: retargeted from `pocket` to `inlay`, origin
// the python hackbuild coin v1, whose 0.8 inlay over black read grey and
// 1.2 fixed it). Measured: depthLayers x the preset layer height, mm. Legal:
// at least opacityFloor(slot colour, host colour, layer), read from profile
// opacity.* (M03-T07). The depth is the param the build drives it from, so
// the registry's fix sets that param to the floor on its own step grid.

import type { CheckCtx, Finding, Part } from "@hackbuild/spec";
import { depthOf, type InlayDecl } from "../kind.js";
import { opacityFloor } from "../opacity.js";
import { hostOf, layerHeightOf, tidy } from "./common.js";

export const CHK_INL_03 = "CHK-INL-03" as const;
export const CHK_INL_03_VERSION = "2.0.0";

export function runInl03(t: { readonly part: Part; readonly feature: InlayDecl }, ctx: CheckCtx): readonly Finding[] {
  const f = t.feature;
  const layer = layerHeightOf(t.part, ctx);
  const host = hostOf(t.part, f, ctx);
  const inlay = f.palette[f.slot - 1];
  const under = f.palette[host.slot - 1];
  if (inlay === undefined || under === undefined) {
    return [{
      verdict: "skip", target: { level: "feature", part: t.part.id, feature: f.id }, measured: "no slot colour", legal: { kind: "none" },
      constraint: `palette has no colour for slot ${inlay === undefined ? f.slot : host.slot}; the opacity floor needs both colours`,
    }];
  }
  const floor = opacityFloor(inlay, under, layer, ctx.profile);
  const measured = depthOf(f, layer);
  const lo = tidy(floor.floor);
  return [{
    verdict: measured >= lo - 1e-9 ? "pass" : "fail",
    target: { level: "feature", part: t.part.id, feature: f.id },
    measured,
    legal: { kind: "interval", lo, hi: null, unit: "mm", nearest: measured >= lo - 1e-9 ? measured : lo },
    constraint: `${floor.constant}: ${floor.bound.reason}; a thinner inlay lets the host colour show through`,
    extra: { slot: f.slot, hostSlot: host.slot, layers: f.depthLayers, layerMm: layer, rule: floor.rule },
  }];
}

/** The param whose change moves the depth: the pointer the build bound to depthLayers, if any. */
export function inl03DrivenBy(t: { readonly feature: InlayDecl }): readonly string[] {
  const p = t.feature.drivenBy?.["depthLayers"];
  return p === undefined ? [] : [p];
}
