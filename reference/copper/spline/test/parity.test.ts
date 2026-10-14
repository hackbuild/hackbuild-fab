// M05-T15: SPLINE rev A on packages/copper, held to its shipped generator
// (reference/copper/_harness/family.ts says which sources and goldens).
// Every number here is computed; nothing is measured on a cut board.

import { expect } from "vitest";
import { TOL, describeFamily } from "../../_harness/family";
import { build } from "../build";
import { chase } from "../chase.surface";

describeFamily({
  dir: "reference/copper/spline",
  name: "SPLINE",
  build,
  chaseModule: chase,
  files: ["00_guide_under.svg", "01_copper.svg", "02_vinyl_face.svg", "03_faceplate_print.svg", "04_vinyl_accents.svg", "05_backer.svg"],
  stats: ({ at, legacy }) => {
    const { b, r } = at();
    const s = legacy.stats as unknown as { arc_sweep_mm: number; lin_travel_mm: number; lanes_used: number; vinyl_area: number; rail_pitch: number; blade_area: number };
    const sb = b as ReturnType<typeof build>;
    expect(Math.round(sb.arcSweep)).toBe(s.arc_sweep_mm);
    expect(sb.linTravel).toBe(s.lin_travel_mm);
    expect(r.board.lanes!.used).toBe(s.lanes_used);
    const vinyl = r.board.shape(b.draft.mask!.region).area();
    expect(Math.abs(vinyl - s.vinyl_area) / s.vinyl_area).toBeLessThanOrEqual(TOL.areaFrac);
    expect(b.draft.fields![0]!.pitch).toBe(s.rail_pitch);
    const blades = b.draft.program.find((x) => x.kind === "plateArea")!;
    const blade = Math.min(...(blades as unknown as { regions: readonly never[] }).regions.map((g) => r.board.shape(g).area()));
    expect(Math.round(blade)).toBe(s.blade_area);
    return { arcSweepMm: Number(sb.arcSweep.toFixed(4)), linTravelMm: sb.linTravel, vinylMm2: Number(vinyl.toFixed(4)), bladeMm2: Number(blade.toFixed(4)) };
  },
});
