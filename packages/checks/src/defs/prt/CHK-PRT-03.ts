// CHK-PRT-03, parts of one object never overlap and sum to the solid
// (COLLAR 2026-08: validate_3mf --overlap). The validator's two rules
// (tools/py/validate_3mf.py check_overlap): the parts' intersection is at
// most 1e-3 mm3 (OVERLAP_MAX_MM3), and with --solid the parts sum to the
// solid within 0.1 percent (SUM_TOLERANCE x max(1, solid)). Overlap here is
// the parts' summed volume less the volume of their union as the kernel
// computed it (Part.unionVolumeMm3), which is at least every pairwise
// intersection. The solid's mesh is that union snapped to the D-054 grid:
// where a face of one part crosses a face of another the union holds
// vertices off the grid, and the snap moves volume no part holds (tilt-stick
// references, 0.0016 and 0.0022 mm3 over 28 crossings, computed), so the
// snapped solid is held to the validator's sum rule and never read as
// overlap. A part with no recorded union falls back to the snapped solid.
// Volumes are the Part IR MeshRef volumes; core calls prt03Finding on its
// export slots, so both paths share one rule.

import type { Finding, Part, ResultTarget } from "@hackbuild/spec";
import { defineCheck } from "../../registry.js";

/** CHK-PRT-03 legal ceiling, mm3 (CHECKS.md section 6, interval 0 to 0.001; validate_3mf.py OVERLAP_MAX_MM3). */
export const OVERLAP_CEILING_MM3 = 0.001;

/** Parts sum to the snapped solid within this fraction of max(1 mm3, solid) (validate_3mf.py SUM_TOLERANCE). */
export const SUM_TOLERANCE = 0.001;

export const PRT03_CONSTRAINT = "overlapping parts double-count material and break per-body checks; parts of one object sum to the solid";

const round = (v: number, d = 6): number => Number(v.toFixed(d));

/**
 * The CHK-PRT-03 finding: body volumes against the union volume, mm3.
 * unionVolumeMm3 is the kernel's union before the snap; without it the
 * snapped solid stands for the union.
 */
export function prt03Finding(target: ResultTarget, volumesMm3: readonly number[], solidVolumeMm3: number, unionVolumeMm3?: number): Finding {
  const sum = volumesMm3.reduce((s, v) => s + v, 0);
  const union = unionVolumeMm3 ?? solidVolumeMm3;
  const overlap = round(Math.abs(sum - union));
  const sumOff = Math.abs(sum - solidVolumeMm3);
  const sums = sumOff <= SUM_TOLERANCE * Math.max(1, solidVolumeMm3);
  return {
    verdict: overlap <= OVERLAP_CEILING_MM3 && sums ? "pass" : "fail", target, measured: overlap,
    legal: { kind: "interval", lo: 0, hi: OVERLAP_CEILING_MM3, unit: "mm3", nearest: Math.min(overlap, OVERLAP_CEILING_MM3) },
    constraint: PRT03_CONSTRAINT,
    extra: {
      partsVolumeMm3: round(sum, 3), solidVolumeMm3: round(solidVolumeMm3, 3), parts: volumesMm3.length,
      ...(unionVolumeMm3 === undefined ? {} : { unionVolumeMm3: round(unionVolumeMm3, 3), snapResidueMm3: round(Math.abs(unionVolumeMm3 - solidVolumeMm3)) }),
      ...(sums ? {} : { sum: `parts sum to ${sum.toFixed(3)} mm3 but the solid is ${solidVolumeMm3.toFixed(3)}, over ${SUM_TOLERANCE * 100} percent` }),
    },
  };
}

/** prt03Finding on a Part IR part: its bodies, its snapped solid and its kernel union. */
export function prt03OfPart(target: ResultTarget, part: Pick<Part, "bodies" | "solid" | "unionVolumeMm3">): Finding {
  return prt03Finding(target, part.bodies.map((b) => b.mesh.volumeMm3), part.solid.volumeMm3, part.unionVolumeMm3);
}

export const check = defineCheck({
  id: "CHK-PRT-03",
  level: "assembly",
  run: (t) => t.assembly.parts.map((p) => prt03OfPart({ level: "part", part: p.id }, p)),
});
