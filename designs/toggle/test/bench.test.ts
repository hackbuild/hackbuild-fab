// The TOGGLE bench against the original's anatomy (knowledge/designs/
// toggle.md section 6) and the drive readout on the committed solo4
// metrics (test/golden/solo4-metrics.json, written by build.test.ts from a
// build, never by hand). The steps are the original's strip; the drive pad
// takes gesture tilt and one target per built direction; a tilt toward a
// direction's sector centre reads that direction and closes the pads the
// golden lists at the stop. Every number compared is read from the golden.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { Metric } from "@hackbuild/spec";
import { padModel } from "@hackbuild/bench-core";
import { bench } from "../bench";
import { contact } from "../build";
import { chase } from "../chase";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const golden = JSON.parse(readFileSync(path.join(HERE, "golden", "solo4-metrics.json"), "utf8")) as Record<string, number | string>;
const metrics = Object.entries(golden).map(([id, value]) => ({ id, value }) as unknown as Metric);
const num = (id: string): number => golden[id] as number;
const steps = bench.rail ?? [];
const drive = bench.views.drive;
if (drive === undefined) throw new Error("toggle bench declares no drive pad");
const dirs = Object.keys(golden).filter((id) => /^drive\.[A-Z]+$/.test(id)).map((id) => id.slice(6));

describe("toggle bench", () => {
  it("the steps are the original's strip, the last one the print step opening plate", () => {
    expect(steps.map((s) => s.step)).toEqual(["stick", "body", "filament", "print"]);
    expect(steps.at(-1)?.view).toBe("plate");
    const p = steps.at(-1)?.panels ?? [];
    expect(p.indexOf("exports")).toBeLessThan(p.indexOf("checks"));
  });

  it("each guide goal is one lowercase sentence of at least ten words", () => {
    for (const s of steps) {
      expect(s.goal, s.step).toMatch(/^[a-z]/);
      expect(s.goal.endsWith("."), s.step).toBe(true);
      expect(s.goal.slice(0, -1).includes(". "), s.step).toBe(false);
      expect(s.goal.split(/\s+/).length, s.step).toBeGreaterThanOrEqual(10);
    }
  });

  it("the welcome offers every chase preset, solo4 first", () => {
    expect(bench.welcome?.starts?.map((s) => s.preset)).toEqual(chase.presets?.map((p) => p.id));
  });

  it("the drive pad takes a tilt and names the one contact build.ts exports", () => {
    expect(drive).toMatchObject({ targets: "metrics.drive", gesture: "tilt", contact: "contact" });
  });
});

describe("toggle drive readout on the solo4 golden", () => {
  const pad = padModel({ decl: drive, hookup: chase.hookup ?? [], features: [], metrics, results: [], contact });
  const stopPads = (n: string): string[] =>
    String(golden[`tilt-stick.0.drive.${golden[`drive.${n}`] as number}.stop`]).split(",").map((s) => `tilt-stick.0.conductor.pad${s}`);

  it("one pad target per built direction, each holding the pads the golden lists at the stop", () => {
    expect(dirs).toEqual(["E", "N", "W", "S"]);
    expect(pad.problem).toBeNull();
    expect(pad.targets.map((t) => [t.target, t.contacts])).toEqual(dirs.map((n) => [n, stopPads(n)]));
  });

  it("a tilt toward each sector centre reads that direction, its tilt and azimuth", () => {
    const thStop = num("tilt-stick.0.stick.thStop");
    for (const n of dirs) {
      const phiDeg = num(`drive.${n}.deg`);
      for (const off of [-20, 0, 20]) {
        const r = contact(metrics, "E", { tiltDeg: thStop, phiDeg: phiDeg + off });
        expect(r.dir, `${n} ${off}`).toBe(n);
        expect(r.closed, `${n} ${off}`).toEqual(stopPads(n));
        expect(r.pose, `${n} ${off}`).toEqual({ tiltDeg: thStop, phiDeg });
      }
    }
  });

  it("below the contact tilt the readout is dir none with nothing closed", () => {
    const r = contact(metrics, "N", { tiltDeg: num("tilt-stick.0.stick.thContact") - 0.1, phiDeg: num("drive.N.deg") });
    expect(r.dir).toBe("none");
    expect(r.closed).toEqual([]);
  });
});
