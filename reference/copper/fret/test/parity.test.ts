// M05-T15: FRET rev A on packages/copper, held to its shipped generator
// (reference/copper/_harness/family.ts says which sources and goldens).
// Every number here is computed; nothing is measured on a cut board.

import { expect } from "vitest";
import { TOL, describeFamily } from "../../_harness/family";
import { build } from "../build";
import { chase } from "../chase.surface";

describeFamily({
  dir: "reference/copper/fret",
  name: "FRET",
  build,
  chaseModule: chase,
  files: ["00_guide_under.svg", "01_copper.svg", "02_vinyl_face.svg", "03_faceplate_print.svg", "04_vinyl_accents.svg", "05_backer.svg"],
  stats: ({ at, legacy }) => {
    const { b, r } = at();
    const s = legacy.stats as unknown as {
      key_area: number; key_w: number; key_h: number; arc_sweep_mm: number; lin_travel_mm: number; lin2_travel_mm: number;
      lanes_used: number; range_semis: number; vinyl_area: number; rail_pitch: number; tile_min: number; tile_max: number;
    };
    const fb = b as ReturnType<typeof build>;
    const keys = fb.electrodes.map((g) => r.board.shape(g).area());
    expect([Math.round(Math.min(...keys)), Math.round(Math.max(...keys))]).toEqual([s.tile_min, s.tile_max]);
    expect(Math.round(Math.min(...keys))).toBe(s.key_area);
    expect(Math.round(fb.arcSweep)).toBe(s.arc_sweep_mm);
    expect([...fb.travel]).toEqual([s.lin_travel_mm, s.lin2_travel_mm]);
    expect(r.board.lanes!.used).toBe(s.lanes_used);
    const semis = Object.values(fb.pads).map((pd) => pd.semi);
    expect(Math.max(...semis) - Math.min(...semis)).toBe(s.range_semis);
    const notes = (legacy as unknown as { notes: Record<string, string> }).notes;
    expect(Object.fromEntries(Object.entries(fb.pads).map(([k, pd]) => [k, pd.note]))).toEqual(notes);
    const vinyl = r.board.shape(b.draft.mask!.region).area();
    expect(Math.abs(vinyl - s.vinyl_area) / s.vinyl_area).toBeLessThanOrEqual(TOL.areaFrac);
    expect(b.draft.fields![0]!.pitch).toBe(s.rail_pitch);
    return { keyMm2: Number(Math.min(...keys).toFixed(4)), arcSweepMm: Number(fb.arcSweep.toFixed(4)), vinylMm2: Number(vinyl.toFixed(4)) };
  },
});
