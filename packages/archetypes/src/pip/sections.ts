// The declared conductor paths of the four PIP buttons at their defaults
// (M06-T07 step 3), from the same dims the apply() and derive() read, on
// the shipped profile stack. Round sections give the side of the
// equal-area square. The model.js lines are where PIP prices each path.

import type { ConductorSection, ProfileLookup } from "@hackbuild/spec";
import { pipStack } from "./common.js";
import { FLEX_DEFAULTS, flexZ } from "./flex.js";
import { TOUCH_DEFAULTS, touchZ } from "./touch.js";
import { STICK_DEFAULTS, stickZ } from "./stick.js";
import { CLICK_DEFAULTS } from "./click.js";

const sq = (area: number): number => Math.sqrt(area);
const SRC = "originals/pip/files/haft-src/src/model.js";

export function flexSections(profile: ProfileLookup): ConductorSection[] {
  const s = pipStack(profile, "ffc5p", { body: "petg", trace: "cpla" });
  const F = FLEX_DEFAULTS;
  const { fd, colTop } = flexZ(F, s);
  return [
    { id: "switch.span", material: "ctpu", direction: "bulk", widthMm: 2 * fd.colR, thicknessMm: F.cap, lengthMm: F.colGap + fd.colR, source: `${SRC} line 469: the cap across the split` },
    { id: "switch.through", material: "ctpu", direction: "bulk", widthMm: sq((Math.PI * fd.colR ** 2) / 2), thicknessMm: sq((Math.PI * fd.colR ** 2) / 2), lengthMm: F.cap, series: 2, source: `${SRC} line 469: through the cap to each half` },
    { id: "column", material: "cpla", direction: "through", widthMm: sq(Math.PI * (0.7 * fd.colR) ** 2), thicknessMm: sq(Math.PI * (0.7 * fd.colR) ** 2), lengthMm: colTop - s.z.floor, series: 2, source: `${SRC} line 468: both column halves above the floor` },
  ];
}

export function touchSections(profile: ProfileLookup): ConductorSection[] {
  const s = pipStack(profile, "ffc5p", { body: "petg", trace: "cpla" });
  const T = TOUCH_DEFAULTS;
  const { top } = touchZ(T, s);
  return [
    { id: "post", material: "cpla", direction: "through", widthMm: sq(Math.PI * T.post ** 2), thicknessMm: sq(Math.PI * T.post ** 2), lengthMm: top + T.bezel - s.z.floor, source: `${SRC} line 478: the sense post to the comb` },
  ];
}

export function stickSections(profile: ProfileLookup): ConductorSection[] {
  const s = pipStack(profile, "ffc5p", { body: "petg", trace: "cpla" });
  const S = STICK_DEFAULTS;
  const { d } = stickZ(S, s);
  const a = sq(Math.PI * S.post ** 2);
  return [
    { id: "switch.band", material: "ctpu", direction: "bulk", widthMm: 2, thicknessMm: S.bandH, lengthMm: d.span / 2, source: `${SRC} line 476: half the band span across a 2 mm strip` },
    { id: "post.pad", material: "cpla", direction: "through", widthMm: a, thicknessMm: a, lengthMm: d.padZ[0] - s.z.floor, source: `${SRC} line 475: the wall pad post` },
    { id: "post.ring", material: "cpla", direction: "through", widthMm: a, thicknessMm: a, lengthMm: d.comZ[0] - s.z.floor, source: `${SRC} line 475: the ring post` },
  ];
}

/** The click tip path needs the FE contact travel; its pads post length is the slot floor, so only the tip span is declared. */
export function clickSections(): ConductorSection[] {
  const C = CLICK_DEFAULTS;
  return [
    { id: "switch.tip", material: "ctpu", direction: "bulk", widthMm: C.w, thicknessMm: 0.8, lengthMm: C.tip / 2 + 0.6, source: `${SRC} line 472: tip across the pad split, tipExp 0.8 (layout.js line 88)` },
    { id: "switch.down", material: "ctpu", direction: "bulk", widthMm: C.w, thicknessMm: 1.3, lengthMm: 0.8, series: 2, source: `${SRC} line 472: down through the tip to each pad` },
  ];
}
