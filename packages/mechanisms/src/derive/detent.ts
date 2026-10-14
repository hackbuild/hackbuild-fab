// count-wheel-detent, KNURL's pawl (originals/knurl/files/knurl.html lines
// 643 to 649; lineage knurl.bench/knurl-8), D-096 and verified-claims C4:
// I = stripH stripT^3 / 12, the cube on the bending thickness (the seed's
// I = t w^3 / 12 cubed the width); k = 3 E I / L^3; lift = fluteDepth - clr;
// click = k lift; strain = 3 lift stripT / (2 L^2). E 2000 MPa is KNURL's
// literal ("PETG E ~ 2000 MPa", line 648); profile petg reads 1900 MPa
// (PIP), so the def keeps KNURL's value as its default and says so.

import type { DerivedValue } from "@hackbuild/spec";
import { computed, type InputParam, type Values } from "./common.js";

export const DETENT_PARAMS: readonly InputParam[] = [
  { key: "E", unit: "MPa", doc: "strip modulus, KNURL's literal at line 648 (profile petg reads 1900)", default: 2000 },
  { key: "stripT", unit: "mm", doc: "strip thickness in the bending direction (KNURL pawl.thick)", default: 1.6 },
  { key: "stripH", unit: "mm", doc: "strip height, the print height (KNURL pawl.height)", default: 3.6 },
  { key: "freeLen", unit: "mm", doc: "free length (KNURL pawl.len)", default: 20 },
  { key: "fluteDepth", unit: "mm", doc: "flute depth on the count wheel (KNURL count.fluteDepth)", default: 1.2 },
  { key: "clr", unit: "mm", doc: "pin and pawl clearance (KNURL print.clr; 0.15 jammed the first print)", default: 0.4 },
  { key: "tip", unit: "deg", doc: "pawl tip angle asked for (KNURL pawl.tip)", default: 262 },
  { key: "flutes", unit: "count", doc: "count wheel flutes (KNURL count.N)", default: 33 },
];

export function detentDerive(p: Values): Record<string, DerivedValue> {
  const t = p["stripT"]!;
  const L = p["freeLen"]!;
  const I = (p["stripH"]! * t ** 3) / 12;
  const k = (3 * p["E"]! * I) / L ** 3;
  const lift = p["fluteDepth"]! - p["clr"]!;
  const delta = 360 / p["flutes"]!;
  return {
    I: computed(I, "mm4", "stripH stripT^3 / 12, the cube on the bending thickness"),
    k: computed(k, "N/mm", "3 E I / L^3"),
    lift: computed(lift, "mm", "fluteDepth - clr"),
    clickForce: computed(k * lift, "N", "k lift"),
    strain: computed((3 * lift * t) / (2 * L * L), "ratio", "3 lift stripT / (2 L^2)"),
    tipAngle: computed(Math.round(p["tip"]! / delta) * delta, "deg", "the tip angle rounded to a whole flute, round(tip / (360/flutes)) 360/flutes"),
  };
}
