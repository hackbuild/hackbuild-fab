// M05-T15: TESSERA rev A on packages/copper, held to its shipped generator
// (reference/copper/_harness/family.ts says which sources and goldens).
// The seed points come from ./pyrandom.ts and must equal, to the last
// digit, the seeds the shipped geometry JSON records for every tile.
// Every number here is computed; nothing is measured on a cut board.

import { expect } from "vitest";
import { TOL, describeFamily } from "../../_harness/family";
import { build } from "../build";
import { chase } from "../chase.surface";

describeFamily({
  dir: "reference/copper/tessera",
  name: "TESSERA",
  build,
  chaseModule: chase,
  files: ["00_guide_under.svg", "01_copper.svg", "02_vinyl_face.svg", "03_faceplate_print.svg", "04_vinyl_accents.svg", "05_backer.svg"],
  stats: ({ at, legacy }) => {
    const { b, r } = at();
    const s = legacy.stats as unknown as {
      tile_min: number; tile_max: number; arc_sweep_mm: number; lin_travel_mm: number; lanes_used: number;
      vinyl_area: number; rail_pitch: number; blade_area: number;
    };
    const tb = b as ReturnType<typeof build>;
    const shipped = legacy as unknown as { pads: Record<string, { seed: [number, number]; col: number; row: number }>; channels: number[] };
    // the draws of random.Random(11), equal exactly
    expect(Object.fromEntries(Object.entries(tb.pads).map(([k, pd]) => [k, { seed: [...pd.seed], col: pd.col, row: pd.row }])))
      .toEqual(Object.fromEntries(Object.entries(shipped.pads).map(([k, pd]) => [k, { seed: pd.seed, col: pd.col, row: pd.row }])));
    expect([...tb.channels]).toEqual(shipped.channels);
    const areas = Object.values(tb.tiles).map((g) => r.board.shape(g).area());
    expect([Math.round(Math.min(...areas)), Math.round(Math.max(...areas))]).toEqual([s.tile_min, s.tile_max]);
    expect(Math.round(Math.min(...areas))).toBe(s.blade_area);
    expect(Math.round(tb.arcSweep)).toBe(s.arc_sweep_mm);
    expect(tb.travel[0]).toBe(s.lin_travel_mm);
    expect(r.board.lanes!.used).toBe(s.lanes_used);
    const vinyl = r.board.shape(b.draft.mask!.region).area();
    expect(Math.abs(vinyl - s.vinyl_area) / s.vinyl_area).toBeLessThanOrEqual(TOL.areaFrac);
    expect(b.draft.fields![0]!.pitch).toBe(s.rail_pitch);
    return { tileMm2: [Number(Math.min(...areas).toFixed(4)), Number(Math.max(...areas).toFixed(4))], arcSweepMm: Number(tb.arcSweep.toFixed(4)), vinylMm2: Number(vinyl.toFixed(4)) };
  },
});
