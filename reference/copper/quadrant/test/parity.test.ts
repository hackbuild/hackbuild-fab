// M05-T15: QUADRANT rev A on packages/copper, held to its shipped
// generator (reference/copper/_harness/family.ts says which sources and
// goldens). Every number here is computed; nothing is measured on a cut
// board.

import { expect } from "vitest";
import { sampleRatio } from "@hackbuild/checks";
import { Vinyl } from "@hackbuild/copper";
import { TOL, describeFamily } from "../../_harness/family";
import { build } from "../build";
import { chase } from "../chase.surface";

describeFamily({
  dir: "reference/copper/quadrant",
  name: "QUADRANT",
  build,
  chaseModule: chase,
  files: ["00_guide_under.svg", "01_copper.svg", "02_vinyl_face.svg", "03_faceplate_print.svg", "04_vinyl_accents.svg", "05_backer.svg"],
  stats: ({ g, profile, at, legacy }) => {
    const { b, r } = at();
    const s = legacy.stats as unknown as { span: [number, number]; sweep_mm: number; vinyl_area: number; rail_pitch: number; rail_rows: number };
    const step = b.draft.program.find((x) => x.kind === "ratio")!;
    const rat = sampleRatio({ v: new Vinyl(g), board: r.board, profile }, step as never);
    const span = [Math.min(...rat), Math.max(...rat)];
    expect(Math.abs(span[0]! - s.span[0])).toBeLessThanOrEqual(TOL.span);
    expect(Math.abs(span[1]! - s.span[1])).toBeLessThanOrEqual(TOL.span);
    const sweep = (b as ReturnType<typeof build>).sweep;
    expect(Math.round(sweep)).toBe(s.sweep_mm);
    const vinyl = r.board.shape(b.draft.mask!.region).area();
    expect(Math.abs(vinyl - s.vinyl_area) / s.vinyl_area).toBeLessThanOrEqual(TOL.areaFrac);
    const rail = b.draft.fields!.find((f) => f.id === "rail")!;
    expect([rail.pitch, new Set(rail.fingers.map((t) => t.at)).size === rail.fingers.length ? 1 : 0]).toEqual([s.rail_pitch, s.rail_rows]);
    return { span1: span.map((x) => Number(x.toFixed(6))), sweepMm: Number(sweep.toFixed(4)), vinylMm2: Number(vinyl.toFixed(4)) };
  },
});
