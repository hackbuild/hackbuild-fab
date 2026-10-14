// CHK-PRT-12, bed contact face excluded from overhang (PAWL 2026-07: a
// flat cover read 41.7% overhang). Ported from PAWL fdm.py analyse()
// (originals/pawl/files/src/fdm.py lines 27 to 50): per triangle normal
// against the build direction, overhang past the profile limit
// overhang.maxDeg, and a triangle whose highest vertex sits under the bed
// contact band above the lowest point left out; the shared rule and its
// one departure from fdm.py, a face at the limit is not past it, are in
// overhang.ts. The check recomputes the overhang share of the surface in
// print pose both with and without the band; a part metric that reports
// overhang must carry the excluded figure. With no such metric the
// computed figure is the evidence. Golden: fdm.py on the PAWL foot, thigh
// and ankle yoke exports (test/originals/pawl/fdm-golden.json).

import type { Finding, Metric } from "@hackbuild/spec";
import { defineCheck } from "../../registry.js";
import { inPrintPose, triNormal } from "../../solid/mesh.js";
import { bodyMeshes, boolFinding, fmt, isReason, partTarget, sheetSkip, skip } from "../common.js";
import { BED_BAND_CONSTANT, OVERHANG_CONSTANT, bedBand, onBed, overhangLimit, pastLimit } from "./overhang.js";

const isOverhangMetric = (m: Metric): boolean => /overhang/i.test(m.id) && typeof m.value === "number" && m.unit === "percent";

export const check = defineCheck({
  id: "CHK-PRT-12",
  level: "part",
  run: (t, ctx): readonly Finding[] => {
    const at = partTarget(t.part);
    const sheet = sheetSkip(t.part, ctx);
    if (sheet !== undefined) return [sheet];
    const got = bodyMeshes(t.part, ctx);
    if (isReason(got)) return [skip(at, "not run", got.reason)];
    const limit = overhangLimit(ctx.profile);
    const band = bedBand(ctx.profile);
    const { meshes } = inPrintPose(t.part, got.meshes);
    let total = 0, withBed = 0, excluded = 0;
    for (const m of meshes) {
      for (let k = 0; k < m.triangles.length / 3; k++) {
        const { n, area } = triNormal(m, k);
        if (area === 0) continue;
        total += area;
        if (!pastLimit(n[2] / (2 * area), limit.deg)) continue;
        withBed += area;
        if (!onBed(m, k, band.mm)) excluded += area;
      }
    }
    const pctIn = (100 * withBed) / total;
    const pctOut = (100 * excluded) / total;
    const reported = t.part.metrics.filter(isOverhangMetric);
    // A reported percent rounded to one decimal sits within 0.05 of the figure it rounds.
    const wrong = reported.filter((m) => Math.abs((m.value as number) - pctOut) > 0.05);
    const first = wrong[0];
    return [boolFinding(at, wrong.length === 0,
      `overhang counts faces past ${limit.deg} deg from vertical (profile ${OVERHANG_CONSTANT}, ${limit.tier}) and leaves out the bed contact band ${fmt(band.mm)} mm (profile ${BED_BAND_CONSTANT}, ${band.tier}; PAWL fdm.py)`,
      {
        overhangPct: Number(pctOut.toFixed(2)), overhangWithBedPct: Number(pctIn.toFixed(2)), metrics: reported.length,
        ...(first === undefined ? {} : { metric: first.id, metricPct: first.value as number }),
      })];
  },
});
