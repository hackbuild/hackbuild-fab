// The flex-pair bench against the gold benches (gold-standard.md, GOLD-10,
// GOLD-12, GOLD-13). The guide goal of each step is one sentence that names
// the mechanism, as PIP's GUIDES do (pip-controller bench/part3.js lines
// 253 to 258). The welcome leads with the worked example, preset "two",
// which test/reference.test.ts builds. The print step opens plate view,
// shows the filament slots, and puts the export rows above the checks. The
// tagline's key count matches what the defaults and presets build.

import { describe, expect, it } from "vitest";
import { resolveParams } from "../../../../core/src/commands/build.js";
import { bench } from "../bench";
import { chase } from "../chase";

const WORKED = "two";
const steps = bench.rail ?? [];
const printStep = steps.at(-1);

describe("flex-pair bench", () => {
  it("each guide goal is one lowercase sentence of at least ten words", () => {
    for (const s of steps) {
      expect(s.goal, s.step).toMatch(/^[a-z]/);
      expect(s.goal.endsWith("."), s.step).toBe(true);
      expect(s.goal.slice(0, -1).includes(". "), s.step).toBe(false);
      expect(s.goal.split(/\s+/).length, s.step).toBeGreaterThanOrEqual(10);
    }
  });

  it("each design step goal names the material its step shapes", () => {
    const named: Record<string, string> = { pad: "PETG", keys: "TPU", wire: "conductive PLA" };
    for (const s of steps.filter((x) => x.step in named)) expect(s.goal, s.step).toContain(named[s.step]);
    expect(Object.keys(named).every((k) => steps.some((s) => s.step === k))).toBe(true);
  });

  it("the welcome leads with the worked example", () => {
    expect(bench.welcome?.presets?.[0]).toBe(WORKED);
    expect(bench.welcome?.starts?.[0]?.preset).toBe(WORKED);
    expect(chase.presets?.some((p) => p.id === WORKED)).toBe(true);
  });

  it("the print step opens plate, shows the filament slots and lists exports before checks", () => {
    expect(printStep?.step).toBe("print");
    expect(printStep?.view).toBe("plate");
    expect(bench.views.modes).toContain("plate");
    expect(printStep?.panels).toContain("materials");
    const p = printStep?.panels ?? [];
    expect(p[0]).toBe("exports");
    expect(p.indexOf("exports")).toBeLessThan(p.indexOf("checks"));
  });

  it("the tagline names every key count the defaults and presets build", () => {
    const counts = new Set<number>([undefined, ...(chase.presets ?? []).map((p) => p.id)].map((id) =>
      (resolveParams(chase, undefined, id)["keys"] as unknown[]).length));
    const words = ["zero", "one", "two", "three", "four"];
    const tagline = bench.welcome?.tagline ?? "";
    const said = words.flatMap((w, n) => (new RegExp(`\\b${w}\\b`).test(tagline) ? [n] : []));
    expect([...counts].sort()).toEqual(said.sort());
  });
});
