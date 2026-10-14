// M05-T15: VERNIER rev A on packages/copper, held to its shipped generator
// (reference/copper/_harness/family.ts says which sources and goldens).
// Every number here is computed; nothing is measured on a cut board.

import { expect } from "vitest";
import { sampleRatio } from "@hackbuild/checks";
import { Vinyl } from "@hackbuild/copper";
import { TOL, describeFamily } from "../../_harness/family";
import { build } from "../build";
import { chase } from "../chase.surface";

describeFamily({
  dir: "reference/copper/vernier",
  name: "VERNIER",
  build,
  chaseModule: chase,
  files: ["00_guide_under.svg", "01_copper.svg", "02_vinyl_face.svg", "03_faceplate_print.svg", "04_vinyl_accents.svg", "05_backer.svg"],
  stats: ({ g, profile, at, legacy }) => {
    const { b, r } = at();
    const s = legacy.stats as unknown as { span: [number, number]; travel_mm: number; vinyl_area: number };
    const step = b.draft.program.find((x) => x.kind === "ratio")!;
    const rat = sampleRatio({ v: new Vinyl(g), board: r.board, profile }, step as never);
    const span = [Math.max(...rat), Math.min(...rat)];
    expect(Math.abs(span[0]! - s.span[0])).toBeLessThanOrEqual(TOL.span);
    expect(Math.abs(span[1]! - s.span[1])).toBeLessThanOrEqual(TOL.span);
    const travel = (b as ReturnType<typeof build>).travel;
    expect(Math.abs(travel - s.travel_mm)).toBeLessThanOrEqual(TOL.travelMm);
    const vinyl = r.board.shape(b.draft.mask!.region).area();
    expect(Math.abs(vinyl - s.vinyl_area) / s.vinyl_area).toBeLessThanOrEqual(TOL.areaFrac);
    return { span1: span.map((x) => Number(x.toFixed(6))), travelMm: travel, vinylMm2: Number(vinyl.toFixed(4)) };
  },
});
