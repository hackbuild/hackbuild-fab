// CHK-PRT-15, layer height and first layer height equal the written process
// preset; every feature z, Z snap and pauseBefore.z lies on a layer top,
// firstLayer + n x layer (COLLAR 2026-08: the generator defaulted to 0.2 mm
// layers under the "0.24mm Standard @FF C5" process it wrote, so the NFC
// floor at 1.8 landed mid layer; HAFT 2026-09-18 saved a 0.24 stack under
// 0.20mm Standard over a 0.25 first layer; CHECKS.md 9.2).
//
// Two clauses, both on the active preset of the part's machine. The process
// name the 3MF writes (slicer.process) states a layer height in its leading
// "<n>mm"; it must equal the preset's layer, the height every Z snap reads,
// so the slicer prints the grid the build snapped to. A name with no
// leading height is reported and passes. Then every declared pause
// (`sealed.pauseBefore.z`, the top of the last layer printed before the
// pause) must sit on a layer top of that preset: firstLayer, then whole
// layers above it (spec/build.ts MachineView.layerTop). Horizontal faces of
// the mesh are CHK-PRT-05's. The first layer height is not in the process
// name, so it is read from the preset and carried in extra.

import type { Feature, Finding } from "@hackbuild/spec";
import { LAYER_TOL_MM as TOL_MM, layerTopsAround } from "@hackbuild/profile";
import { defineCheck } from "../../registry.js";
import { featureTarget, fmt, partTarget, presetOf, sheetSkip } from "../common.js";

/** The layer height a process name leads with, mm, or undefined. */
export function nameLayerMm(process: string): number | undefined {
  const m = /^(\d+(?:\.\d+)?)\s*mm\b/i.exec(process.trim());
  return m === null ? undefined : Number(m[1]);
}

/** The declared pause of a feature, read by field so no kind is named here. */
function pauseZ(f: Feature): number | undefined {
  const sealed = (f as { readonly sealed?: unknown }).sealed;
  if (typeof sealed !== "object" || sealed === null) return undefined;
  const z = (sealed as { readonly pauseBefore?: { readonly z?: unknown } }).pauseBefore?.z;
  return typeof z === "number" ? z : undefined;
}

export const check = defineCheck({
  id: "CHK-PRT-15",
  level: "part",
  run: (t, ctx): readonly Finding[] => {
    const at = partTarget(t.part);
    const sheet = sheetSkip(t.part, ctx);
    if (sheet !== undefined) return [sheet];
    const p = presetOf(ctx, t.part.machine);
    const grid = `layer ${fmt(p.layer)} mm over a first layer of ${fmt(p.firstLayer)} mm, preset ${p.id}`;
    const named = nameLayerMm(p.slicer.process);
    const out: Finding[] = [];
    if (named === undefined) {
      out.push({
        verdict: "pass", target: at, measured: p.layer,
        legal: { kind: "multipleOf", base: p.layer, offset: 0, unit: "mm", nearest: [p.layer, p.layer] },
        constraint: `process "${p.slicer.process}" names no layer height; the slicer prints the preset's ${grid}`,
        extra: { process: p.slicer.process, firstLayerMm: p.firstLayer },
      });
    } else {
      // A whole multiple is still a different grid, so only one step of the preset's layer is legal.
      const same = Math.abs(named - p.layer) <= TOL_MM;
      out.push({
        verdict: same ? "pass" : "fail", target: at, measured: named,
        legal: { kind: "multipleOf", base: p.layer, offset: 0, unit: "mm", nearest: [p.layer, p.layer] },
        constraint: `process "${p.slicer.process}" written to the 3mf prints ${fmt(named)} mm layers; the build snaps to ${grid}`,
        extra: { process: p.slicer.process, firstLayerMm: p.firstLayer },
      });
    }
    for (const f of t.part.features) {
      const z = pauseZ(f);
      if (z === undefined) continue;
      // The grid and its tolerance are profile's (layerTopsAround), the ones snapLayer reads, so the verdict and the snap agree.
      const [below, above] = layerTopsAround(p, z);
      const on = Math.abs(z - below) <= TOL_MM || Math.abs(z - above) <= TOL_MM;
      const near = (v: number): number => Number(v.toFixed(6));
      out.push({
        verdict: on ? "pass" : "fail", target: featureTarget(t.part, f), measured: z,
        legal: { kind: "multipleOf", base: p.layer, offset: p.firstLayer, unit: "mm", nearest: [near(below), near(above)] },
        constraint: `pauseBefore.z of ${f.id} is the top of the last layer before the pause; layer tops are ${grid}`,
        extra: { feature: f.id, offMm: Number(Math.min(z - below, above - z).toFixed(6)) },
      });
    }
    return out;
  },
});
