// Opacity floor of an inlay over the colour under it (M03-T07, D-145).
// Rule from print-reality.md lines 20 to 28 (lineage
// knowledge.print-reality/inlay-skill): light over dark needs about 1.2 mm
// or the dark shows through; dark over light hides in two layers. Both
// numbers are profile constants (packages/profile/data/opacity.json); this
// file holds only the classifier. A pair is light over dark when the inlay's
// WCAG 2 relative luminance exceeds the luminance under it, so equal
// luminance takes the dark over light floor.

import {
  commandError, qualify, qualifyRow,
  type Bound, type Constant, type Mm, type ProfileLookup, type Qualification,
} from "@hackbuild/spec";
import { hexToRgb } from "./quantize.js";

/** Profile constant: depth floor of an inlay lighter than the colour under it, mm. */
export const OPACITY_LIGHT_OVER_DARK_ID = "opacity.lightOverDark";
/** Profile constant: depth floor of an inlay darker than the colour under it, in layers. */
export const OPACITY_DARK_OVER_LIGHT_ID = "opacity.darkOverLight";

export type OpacityRule = "light-over-dark" | "dark-over-light";

const RULE_ROW: Readonly<Record<OpacityRule, { readonly id: string; readonly unit: string }>> = {
  "light-over-dark": { id: OPACITY_LIGHT_OVER_DARK_ID, unit: "mm" },
  "dark-over-light": { id: OPACITY_DARK_OVER_LIGHT_ID, unit: "layers" },
};

/** sRGB channel 0 to 255 to linear light, the WCAG 2 transfer. */
function lin(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** WCAG 2 relative luminance of "#rgb" or "#rrggbb", 0 (black) to 1 (white). */
export function relLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export interface OpacityFloor {
  /** Least inlay depth that hides the colour under it, mm. */
  readonly floor: Mm;
  readonly rule: OpacityRule;
  /** The profile constant that set the floor. */
  readonly constant: string;
  /** inferred for the mm row read as is; computed (basis the row tier) for layers times layer height. */
  readonly qualification: Qualification;
  /** The floor as a solver bound on the inlay depth, kernel profile. */
  readonly bound: Bound;
}

function row(profile: Pick<ProfileLookup, "constant">, rule: OpacityRule): Constant {
  const want = RULE_ROW[rule];
  const c = profile.constant(want.id);
  if (c.unit !== want.unit || !Number.isFinite(c.value) || !(c.value > 0)) {
    throw commandError({
      code: "E_SCHEMA", path: `/constants/${c.id}`, got: { value: c.value, unit: c.unit },
      expected: `a value above 0 in ${want.unit}`, hint: `set profile constant ${c.id} in ${want.unit}`,
    });
  }
  return c;
}

const fmt = (x: number, d: number): string => x.toFixed(d);

/**
 * Opacity floor of `inlayHex` over `underHex` at process layer height
 * `layer` (mm), read from profile so the read lands in BuildInputs.
 */
export function opacityFloor(
  inlayHex: string, underHex: string, layer: Mm, profile: Pick<ProfileLookup, "constant">,
): OpacityFloor {
  if (!Number.isFinite(layer) || !(layer > 0)) {
    throw commandError({ code: "E_SCHEMA", path: "/layer", got: layer, expected: "a layer height above 0 mm", hint: "pass the layer height of the active preset" });
  }
  const li = relLuminance(inlayHex);
  const lu = relLuminance(underHex);
  const rule: OpacityRule = li > lu ? "light-over-dark" : "dark-over-light";
  const c = row(profile, rule);
  const lum = `inlay ${inlayHex} luminance ${fmt(li, 4)} over ${underHex} ${fmt(lu, 4)} (computed)`;
  let floor: Mm;
  let qualification: Qualification;
  let how: string;
  if (rule === "light-over-dark") {
    floor = c.value;
    qualification = qualifyRow(c.provenance.tier);
    how = `${fmt(floor, 2)} mm (${qualification.qualifier})`;
  } else {
    floor = c.value * layer;
    qualification = qualify([c.provenance.tier]);
    how = `${c.value} layers x ${layer} mm = ${fmt(floor, 2)} mm (computed)`;
  }
  const bound: Bound = {
    value: floor, side: "lo", kernel: "profile", source: c.id,
    reason: `${rule.replace(/-/g, " ")}: ${lum}, floor ${how}`,
    ...qualification,
  };
  return { floor, rule, constant: c.id, qualification, bound };
}
