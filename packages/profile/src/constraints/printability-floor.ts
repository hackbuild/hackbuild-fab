// profile/printability-floor (M01-T06, CHK-PRT-04 origin): a conductor
// narrower than the perimeters the slicer lays down does not print as a
// solid trace. Floor = nozzle bore of the machine's default preset times
// constant prt.perimetersMin, 0.40 x 2 = 0.80 mm on ffc5p_20260819
// (computed from a vendor and an inferred row). The bore is read, not the
// 0.42 preset line width: syn/api-library-ai-design.md 6.4 C reasons
// "line width 0.40, two perimeters", and M01-T03 recorded the bore as the
// row that carries 0.40 (M01-T06 corrections).

import { commandError, qualify, type Bound, type ConstraintCtx, type ConstraintDef } from "@hackbuild/spec";

const DIM = "conductor.width" as const;

/** The machine's default preset, the first listed (packages/profile machines.ts). */
function defaultPreset(ctx: ConstraintCtx) {
  const m = ctx.profile.machine(ctx.machine);
  const p = m.presets[0];
  if (p === undefined) {
    throw commandError({
      code: "E_REF", path: "/machine", got: ctx.machine, expected: "a machine with a slicer preset",
      hint: `machine ${ctx.machine} has no slicer preset, so no perimeter width; query on an fdm machine with a preset`,
    });
  }
  return p;
}

export const printabilityFloor: ConstraintDef = {
  id: "profile/printability-floor",
  version: "1.0.0",
  dims: [DIM],
  kernels: ["profile"],
  units: { [DIM]: "mm" },
  bounds(dim, ctx): readonly Bound[] {
    if (dim !== DIM) return [];
    const preset = defaultPreset(ctx);
    const perims = ctx.profile.constant("prt.perimetersMin");
    return [{
      value: preset.nozzle * perims.value,
      side: "lo",
      kernel: "profile",
      reason: `nozzle bore ${preset.nozzle.toFixed(2)} x ${perims.value.toFixed(0)} perimeters (preset ${preset.id})`,
      source: "CHK-PRT-04",
      ...qualify([preset.provenance.tier, perims.provenance.tier]),
    }];
  },
};
