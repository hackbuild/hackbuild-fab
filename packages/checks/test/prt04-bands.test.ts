// CHK-PRT-04 2.0.0: a wall is material between two cavities on the same
// layers (STYLUS 2026-08, a sub-line-width wall above a skirt read as empty
// layers). Pockets are measured per z band, joined where they touch, cross
// or nest, and a cavity open past the host outline has no wall to it. The
// cases are the two the plan-only measure failed on, cut down: tilt-stick's
// foot and neck keep-outs (concentric, never on one layer) and
// rp2040-zero-seat's back window opened through the USB notch and its
// anti-smear slots inside the board pocket. Distances are worked by hand.

import { describe, expect, test } from "vitest";
import type { CheckResult, Part, PocketFeature, Ring } from "@hackbuild/spec";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { pocketWalls } from "../src/skeleton/index.js";
import { runPrt04 } from "../src/skeleton/prt04.js";

const profile = createProfileLookup(loadProfile());
const ctx = { profile, machine: "ffc5p", whitelist: new Map() } as never;
const rect = (x0: number, y0: number, x1: number, y1: number): Ring => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const circle = (r: number, n = 64): Ring => Array.from({ length: n }, (_, k) => [r * Math.cos((2 * Math.PI * k) / n), r * Math.sin((2 * Math.PI * k) / n)] as const);
const pocket = (id: string, outline: Ring, top: number, depth: number): PocketFeature => ({
  kind: "pocket", id, body: "body", outline, face: { origin: [0, 0, top], normal: [0, 0, 1], u: [1, 0, 0] }, depth, floor: "flat",
  fit: { class: "LOCATE", drawnPerSide: 0, basis: "perSide" },
} as unknown as PocketFeature);
const part = (features: PocketFeature[], outline: Ring = rect(-20, -20, 20, 20)): Part =>
  ({ id: "p", bodies: [{ id: "body", outline: [outline] }], features } as unknown as Part);
const run = (p: Part): CheckResult => runPrt04({ level: "part", part: p } as never, ctx)[0] as CheckResult;

describe("CHK-PRT-04 per z band", () => {
  test("concentric keep-outs 1.2 mm apart in plan that share no layer make no wall", () => {
    // foot r 3.0 from z 1 to 1.5, neck r 1.8 from z 1.5 to 4: the plan-only measure read 1.20 mm
    const p = part([pocket("foot", circle(3.0), 1.5, 0.5), pocket("neck", circle(1.8), 4, 2.5)]);
    const walls = pocketWalls(p);
    expect(walls.some((w) => w.between === "foot|neck")).toBe(false);
    // what is left is each keep-out to the 40 mm square outline: 17.0 mm and 18.2 mm, infill walls
    expect(walls.map((w) => w.between)).toEqual(["foot|body.outline", "neck|body.outline"]);
    expect(walls[0]!.mm).toBeCloseTo(17, 9);
    expect(run(p).verdict).toBe("skip");
  });

  test("the same pair on one layer is a 1.2 mm wall, off the 0.42 line grid", () => {
    const ring = (r: number): Ring => circle(r).map(([x, y]) => [x + 6, y] as const);
    const p = part([pocket("a", circle(1.8), 4, 2.5), pocket("b", ring(3.0), 4, 2.5)]);
    // centres 6 apart, radii 1.8 and 3.0: 1.2 mm between them (64-gon vertices on the line of centres)
    const f = run(p);
    expect(f.verdict).toBe("fail");
    expect(f.measured as number).toBeCloseTo(1.2, 9);
    expect(f.extra).toMatchObject({ between: "a|b", zFromMm: 1.5, zToMm: 4 });
  });

  test("bands that overlap by less than a grid step make no wall", () => {
    const ring = (r: number): Ring => circle(r).map(([x, y]) => [x + 6, y] as const);
    const p = part([pocket("a", circle(1.8), 4, 2.5), pocket("b", ring(3.0), 1.5 + 0.0005, 1)]);
    expect(pocketWalls(p).some((w) => w.between === "a|b")).toBe(false);
  });

  test("a window opened onto the outside through the notch it touches has no wall to the outline", () => {
    // outline edge at y 10; window stops at y 8.7 where the notch starts, notch runs past the edge
    const outline = rect(-20, -20, 20, 10);
    const window = pocket("window", rect(-6.32, 0, 6.32, 8.7), 5, 2);
    const notch = pocket("usb", rect(-6.25, 8.7, 6.25, 16), 5, 2);
    const walls = pocketWalls(part([window, notch], outline));
    expect(walls.some((w) => w.between.startsWith("window|"))).toBe(false);
    // without the notch the window stands 1.3 mm off the edge
    const alone = pocketWalls(part([window], outline));
    expect(alone[0]).toMatchObject({ between: "window|body.outline" });
    expect(alone[0]!.mm).toBeCloseTo(1.3, 9);
  });

  test("a slot inside the board pocket over their shared band is one cavity; below the floor it is measured alone", () => {
    // board pocket from z 2 up to 6; slot from z 1.5 to 2.1, 0.08 mm inside the pocket's edge at x -10
    const board = pocket("board", rect(-10, -10, 10, 10), 6, 4);
    const slot = pocket("slot", rect(-9.92, -0.35, -6.72, 0.35), 2.1, 0.6);
    const walls = pocketWalls(part([board, slot]));
    expect(walls.some((w) => w.between === "board|slot")).toBe(false);
    // the slot below the floor stands 10.08 mm off the outline at x -20
    expect(walls.find((w) => w.between === "slot|body.outline")!.mm).toBeCloseTo(10.08, 9);
  });

  test("a hole in the host outline is a cavity in every band", () => {
    const outline = rect(-20, -20, 20, 20);
    const hole = rect(5, -2, 7, 2);
    const p = { id: "p", bodies: [{ id: "body", outline: [outline, [...hole].reverse()] }], features: [pocket("a", rect(-2, -2, 4, 2), 4, 1)] } as unknown as Part;
    const w = pocketWalls(p).find((x) => x.between === "a|outline.hole0");
    expect(w!.mm).toBeCloseTo(1, 9);
  });
});
