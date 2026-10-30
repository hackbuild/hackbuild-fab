// The PIP bench against the gold benches (gold-standard.md, GOLD-10,
// GOLD-12, GOLD-13), as the flex-pair and blocks bench tests read them:
// one sentence per guide goal naming the material its step shapes, the
// four steps of PIP's GUIDES as bench.ts carries them, the print step
// opening plate with the exports above the checks. The drive pad's
// targets are read from the worked example's metrics golden
// (test/golden/worked-metrics.json, written by build.test.ts from the
// build), never from a list here: each target the pad offers is a hookup
// port of the chase and build.ts's contact closes it on a hold (G-20).

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { Metric } from "@hackbuild/spec";
import { targetIds } from "@hackbuild/bench-core";
import { bench } from "../bench";
import { contact } from "../build";
import { chase } from "../chase";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const golden = JSON.parse(readFileSync(path.join(HERE, "golden", "worked-metrics.json"), "utf8")) as Record<string, number | string>;
const metrics: Metric[] = Object.entries(golden).map(([id, value]) => ({ id, value }) as Metric);
const steps = bench.rail ?? [];
const printStep = steps.at(-1);

describe("pip bench", () => {
  it("the steps are PIP's GUIDES in order", () => {
    expect(steps.map((s) => s.step)).toEqual(["layout", "buttons", "board", "print"]);
  });

  it("each guide goal is one lowercase sentence of at least ten words", () => {
    for (const s of steps) {
      expect(s.goal, s.step).toMatch(/^[a-z]/);
      expect(s.goal.endsWith("."), s.step).toBe(true);
      expect(s.goal.slice(0, -1).includes(". "), s.step).toBe(false);
      expect(s.goal.split(/\s+/).length, s.step).toBeGreaterThanOrEqual(10);
    }
  });

  it("every param group of the chase shows in some step", () => {
    const shown = new Set(steps.flatMap((s) => s.panels));
    for (const g of chase.params) expect(shown.has(`params.${g.id}`), g.id).toBe(true);
  });

  it("the print step opens plate, shows the filament slots and lists exports before checks", () => {
    expect(printStep?.step).toBe("print");
    expect(printStep?.view).toBe("plate");
    const p = printStep?.panels ?? [];
    expect(p).toContain("materials");
    expect(p.indexOf("exports")).toBeLessThan(p.indexOf("checks"));
  });

  it("the welcome starts are the chase presets, the worked example first", () => {
    const starts = bench.welcome?.starts ?? [];
    expect(starts[0]?.preset).toBe("worked");
    for (const s of starts) expect(chase.presets?.some((p) => p.id === s.preset), s.preset).toBe(true);
  });

  it("the drive pad holds every key of the worked example, each a hookup port its contact closes", () => {
    const decl = bench.views.drive;
    expect(decl).toBeDefined();
    expect(bench.views.overlays).toContain("drive");
    if (decl === undefined) return;
    expect(decl.gesture).toBe("hold");
    expect(decl.contact).toBe("contact");
    const ids = targetIds(decl, metrics) ?? [];
    const ports = (chase.hookup ?? []).map((h) => h.port.replace(/^port\./, ""));
    expect(ids.length).toBe(metrics.filter((m) => m.id.startsWith("drive.")).length);
    expect(ids.length).toBeGreaterThan(0);
    for (const t of ids) {
      expect(ports, t).toContain(t);
      expect(contact(metrics, t, true).closed.length, t).toBeGreaterThan(0);
      expect(contact(metrics, t, false).closed, t).toEqual([]);
    }
  });
});
