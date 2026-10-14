// M05-T15: STAVE rev A on packages/copper, held to its shipped generator
// (reference/copper/_harness/family.ts says which sources and goldens).
// Every number here is computed; nothing is measured on a cut board.

import { expect } from "vitest";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { TOL, describeFamily } from "../../_harness/family";
import { build } from "../build";
import { chase } from "../chase.surface";

describeFamily({
  dir: "reference/copper/stave",
  name: "STAVE",
  build,
  chaseModule: chase,
  files: ["00_guide_under.svg", "01_copper.svg", "02_vinyl_face.svg", "03_faceplate_print.svg", "04_vinyl_accents.svg", "05_backer.svg"],
  stats: ({ at, legacy }) => {
    const { b, r } = at();
    const s = legacy.stats as unknown as {
      key_area: number; key_w: number; key_h: number; lin_travel_mm: number; lin2_travel_mm: number; lanes_used: number;
      vinyl_area: number; rail_pitch: number; tape_margin: number;
    };
    const sb = b as ReturnType<typeof build>;
    const keys = sb.electrodes.map((g) => r.board.shape(g).area());
    expect(Math.round(Math.min(...keys))).toBe(s.key_area);
    expect([52, Number((sb.pitch - 1.6).toFixed(1))]).toEqual([s.key_w, s.key_h]);
    expect([...sb.travel]).toEqual([s.lin_travel_mm, s.lin2_travel_mm]);
    expect(r.board.lanes!.used).toBe(s.lanes_used);
    const vinyl = r.board.shape(b.draft.mask!.region).area();
    expect(Math.abs(vinyl - s.vinyl_area) / s.vinyl_area).toBeLessThanOrEqual(TOL.areaFrac);
    expect(b.draft.fields![0]!.pitch).toBe(s.rail_pitch);
    expect(Number(((Number(legacy.params["tape_w"]) - b.draft.W) / 2).toFixed(1))).toBe(s.tape_margin);
    // The tape the board cuts from is the cricut machine row's sheet (profile machines.json, STAVE tape roll).
    const env = createProfileLookup(loadProfile()).machine("cricut").envelope;
    expect("sheet" in env ? env.sheet[0] : undefined).toBe(legacy.params["tape_w"]);
    return { keyMm2: Number(Math.min(...keys).toFixed(4)), vinylMm2: Number(vinyl.toFixed(4)), travelMm: [...sb.travel] };
  },
});
