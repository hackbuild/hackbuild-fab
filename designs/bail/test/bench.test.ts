// The BAIL bench: one sentence per guide goal, the six steps of bail.html in
// order, the art board on the art step, the print step opening plate.

import { describe, expect, it } from "vitest";
import { bench } from "../bench";
import { chase } from "../chase";

const steps = bench.rail ?? [];

describe("bail bench", () => {
  it("each guide goal is one lowercase sentence of at least ten words", () => {
    for (const s of steps) {
      expect(s.goal, s.step).toMatch(/^[a-z]/);
      expect(s.goal.endsWith("."), s.step).toBe(true);
      expect(s.goal.slice(0, -1).includes(". "), s.step).toBe(false);
      expect(s.goal.split(/\s+/).length, s.step).toBeGreaterThanOrEqual(10);
    }
  });

  it("the steps are art, slide, clasp, ends, colour and print, with the art param on the art step", () => {
    expect(steps.map((s) => s.step)).toEqual(["art", "slide", "clasp", "ends", "colour", "print"]);
    expect(steps[0]?.panels).toContain("params.artrow");
    const art = chase.params.flatMap((g): readonly { id: string; type: string }[] => g.fields as readonly { id: string; type: string }[]).find((f) => f.id === "art");
    expect(art?.type).toBe("art");
  });

  it("the print step opens on the plate with the exports above the checks", () => {
    const last = steps.at(-1);
    expect(last?.view).toBe("plate");
    expect((last?.panels ?? []).indexOf("exports")).toBeLessThan((last?.panels ?? []).indexOf("checks"));
  });

  it("every welcome start names a preset of the chase", () => {
    const ids = (chase.presets ?? []).map((p) => p.id);
    for (const s of bench.welcome?.starts ?? []) expect(ids).toContain(s.preset);
  });
});
