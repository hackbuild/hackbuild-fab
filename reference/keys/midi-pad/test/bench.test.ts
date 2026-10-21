// The midi-pad bench against the gold benches (gold-standard.md, GOLD-10,
// GOLD-12, GOLD-13), as the flex-pair bench test reads them: one sentence
// per guide goal naming the material its step shapes, the welcome leading
// with the worked example the reference test builds, and the print step
// opening plate with the exports above the checks. The drive pad holds
// the key group the build emits (metrics.keys), one target per key.

import { describe, expect, it } from "vitest";
import { bench } from "../bench";
import { chase } from "../chase";

const steps = bench.rail ?? [];
const printStep = steps.at(-1);

describe("midi-pad bench", () => {
  it("each guide goal is one lowercase sentence of at least ten words", () => {
    for (const s of steps) {
      expect(s.goal, s.step).toMatch(/^[a-z]/);
      expect(s.goal.endsWith("."), s.step).toBe(true);
      expect(s.goal.slice(0, -1).includes(". "), s.step).toBe(false);
      expect(s.goal.split(/\s+/).length, s.step).toBeGreaterThanOrEqual(10);
    }
  });

  it("each design step goal names the material its step shapes", () => {
    const named: Record<string, string> = { keys: "TPU", fader: "conductive PLA", board: "PETG" };
    for (const s of steps.filter((x) => x.step in named)) expect(s.goal, s.step).toContain(named[s.step]);
    expect(Object.keys(named).every((k) => steps.some((s) => s.step === k))).toBe(true);
  });

  it("the welcome leads with the worked example the chase defaults build", () => {
    expect(bench.welcome?.starts?.[0]?.preset).toBe("default");
    expect(chase.presets?.find((p) => p.id === "default")?.params).toEqual({});
  });

  it("the print step opens plate, shows the filament slots and lists exports before checks", () => {
    expect(printStep?.step).toBe("print");
    expect(printStep?.view).toBe("plate");
    const p = printStep?.panels ?? [];
    expect(p).toContain("materials");
    expect(p.indexOf("exports")).toBeLessThan(p.indexOf("checks"));
  });

  it("the drive pad holds the keys by their build metrics and names the build's contact function", () => {
    expect(bench.views.drive).toMatchObject({ targets: "metrics.keys", gesture: "hold", contact: "contact" });
  });
});
