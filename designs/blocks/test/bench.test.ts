// The BLOCKS bench against the gold benches (gold-standard.md, GOLD-10,
// GOLD-12, GOLD-13), as the flex-pair and midi-pad bench tests read them:
// one sentence per guide goal naming the material its step shapes, the
// print step opening plate with the exports above the checks. The welcome
// offers both brick standards as starts and preselects neither (D-087):
// its starts are the chase's presets, one per standard, and the chase
// default stays "unset". No drive pad, as blocks.html has none
// (knowledge/designs/blocks.md section 6).

import { describe, expect, it } from "vitest";
import { bench } from "../bench";
import { chase } from "../chase";

const steps = bench.rail ?? [];
const printStep = steps.at(-1);

describe("blocks bench", () => {
  it("each guide goal is one lowercase sentence of at least ten words", () => {
    for (const s of steps) {
      expect(s.goal, s.step).toMatch(/^[a-z]/);
      expect(s.goal.endsWith("."), s.step).toBe(true);
      expect(s.goal.slice(0, -1).includes(". "), s.step).toBe(false);
      expect(s.goal.split(/\s+/).length, s.step).toBeGreaterThanOrEqual(10);
    }
  });

  it("the part step carries the pick and both part groups, so its numeric fields show on open, and names both materials", () => {
    expect(steps[0]?.panels).toEqual(["params.pick", "params.wire", "params.brick"]);
    expect(steps[0]?.goal).toContain("TPU");
    expect(steps[0]?.goal).toContain("PETG");
    const mats = steps.find((s) => s.step === "materials");
    for (const m of ["PETG", "conductive PLA", "TPU", "conductive TPU"]) expect(mats?.goal).toContain(m);
  });

  it("the welcome starts are the two brick standards, one each, and the chase preselects neither", () => {
    type Field = { id: string; default?: unknown; options?: readonly { value: string }[] };
    const std = chase.params.flatMap((g): readonly Field[] => g.fields as readonly Field[]).find((f) => f.id === "standard");
    const offered = (std?.options ?? []).map((o) => o.value).filter((v) => v !== "unset");
    expect(offered).toEqual(["boss-v1", "blocks-html"]);
    const starts = bench.welcome?.starts ?? [];
    expect(starts.map((s) => s.preset)).toEqual(offered);
    for (const s of starts) expect(chase.presets?.find((p) => p.id === s.preset)?.params.standard).toBe(s.preset);
    expect(std?.default).toBe("unset");
  });

  it("the part step's focus is the standard question", () => {
    expect(steps[0]).toMatchObject({ step: "part", focus: "standard" });
  });

  it("the print step opens plate, shows the filament slots and lists exports before checks", () => {
    expect(printStep?.step).toBe("print");
    expect(printStep?.view).toBe("plate");
    const p = printStep?.panels ?? [];
    expect(p).toContain("materials");
    expect(p.indexOf("exports")).toBeLessThan(p.indexOf("checks"));
  });

  it("declares no drive pad, as blocks.html has none", () => {
    expect(bench.views.drive).toBeUndefined();
    expect(bench.views.overlays).not.toContain("drive");
  });
});
