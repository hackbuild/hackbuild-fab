// CHK-SHT-05, sag under self weight below the margin it must hold (OGEE
// R13, R17 2026-08: a single strip drooped 0.95 against a 0.775 margin;
// STIPPLE R17: comb sag 0.073 against margin 0.785). The OGEE bars were
// rated by a cantilever model a measured 0.168 mm calibrated (bench notes,
// "sag kills scale changes"); no model source was harvested, so this is
// new code from the title and that note: a uniform strip of the part's
// thickness t and density rho, cantilevered over its longest extent L,
// sags delta = 3 rho g L^4 / (2 E t^2) (w L^4 / (8 E I) with w = rho g b t
// and I = b t^3 / 12). The margin is the part metric gated by this check.

import type { Finding, Metric } from "@hackbuild/spec";
import { defineCheck } from "../../registry.js";
import { fmt, intervalFinding, missing, partTarget, skip } from "../common.js";
import { STANDARD_GRAVITY as G } from "../../claims/evidence.js";

export const check = defineCheck({
  id: "CHK-SHT-05",
  level: "part",
  run: (t, ctx): readonly Finding[] => {
    const p = t.part;
    const at = partTarget(p);
    // Part.thickness and Part.stack are sheet-part fields (spec/part-ir.ts); a part with neither is no strip.
    if (p.thickness === undefined && p.stack === undefined) return [skip(at, "not run", `part ${p.id} declares no sheet thickness; sag applies to sheet strips`)];
    const margin = p.metrics.find((m: Metric) => m.gate === "CHK-SHT-05");
    if (margin === undefined || typeof margin.value !== "number") throw missing(`/parts/${p.id}/metrics`, `part ${p.id} has no metric gated by CHK-SHT-05; the margin the sag must stay under is a metric`);
    const tMm = p.thickness ?? p.stack?.layers.reduce((s, l) => s + l.t, 0);
    if (tMm === undefined || !(tMm > 0)) throw missing(`/parts/${p.id}/thickness`, `part ${p.id} declares no sheet thickness`);
    const body = p.bodies[0];
    if (body === undefined) throw missing(`/parts/${p.id}/bodies/0`, `part ${p.id} has no body`);
    const mat = ctx.profile.material(body.material);
    if (mat.densityGcm3 === undefined) throw missing(`/profile/materials/${mat.id}/densityGcm3`, `material ${mat.id} has no density row`);
    if (mat.modulusMPa === undefined) throw missing(`/profile/materials/${mat.id}/modulusMPa`, `material ${mat.id} has no modulus row`);
    const [lo, hi] = p.solid.bbox;
    const L = Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]);
    // SI: rho kg/m3, L and t m, E Pa; delta back to mm.
    const rho = mat.densityGcm3 * 1000, Lm = L / 1000, tm = tMm / 1000, E = mat.modulusMPa * 1e6;
    const sag = ((3 * rho * G * Lm ** 4) / (2 * E * tm ** 2)) * 1000;
    return [intervalFinding(at, Number(sag.toFixed(4)), 0, margin.value, "mm",
      `a ${fmt(tMm)} mm ${mat.id} strip cantilevered ${fmt(L)} mm sags 3 rho g L^4 / (2 E t^2); it must hold the ${margin.id} margin ${fmt(margin.value)} mm`,
      { lengthMm: Number(L.toFixed(3)), thicknessMm: tMm, modulusMPa: mat.modulusMPa, densityGcm3: mat.densityGcm3 })];
  },
});
