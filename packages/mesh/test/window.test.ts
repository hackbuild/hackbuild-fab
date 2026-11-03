// The window kind cuts its outline through the host along the face normal,
// across the whole host. Each expected volume follows from the box and the
// outline the test declares (computed).

import { describe, expect, test } from "vitest";
import { isThrownCommandError, type BodyDraft, type FeatureOf, type KernelCtx, type PartDraft, type Ring, type ShapeDecl } from "@hackbuild/spec";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { liveCount, runStages, windowCutter, windowKind } from "../src/index.js";

const profile = createProfileLookup(loadProfile());
const rect = (x0: number, y0: number, x1: number, y1: number): Ring => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const FRAME = { originOnAxis: false, carriesOffset: true, pose: "print" } as const;
/** A 20 x 30 x 5 mm block, y from -15 to 15. */
const block: BodyDraft = { id: "slab", role: "body", slot: 1, material: "petg", base: { route: "prism", outline: [rect(-10, -15, 10, 15)], z: [0, 5] } };
const draft: PartDraft = { id: "fixture", name: "fixture", process: "fdm", machine: "ffc5p", frame: FRAME, bodies: [block], features: [] };
/** A window in the y = 15 edge: u along x, v = normal x u = -z, so face y is minus part z. */
const win = (outline: Ring, extra: Partial<Record<string, unknown>> = {}): FeatureOf<"window"> => ({
  id: "window.c", kind: "window", outline, roof: "flat", face: { origin: [3, 15, 0], normal: [0, 1, 0], u: [1, 0, 0] }, ...extra,
}) as unknown as FeatureOf<"window">;
const ctx = (base: ShapeDecl = block.base): KernelCtx => ({ body: { ...block, base } }) as unknown as KernelCtx;

function codeOf(f: () => unknown): string {
  try { f(); } catch (e) { if (isThrownCommandError(e)) return e.hbf.code; throw e; }
  return "none";
}

describe("the window kind", () => {
  test("a rectangle in a vertical face cuts as a box prism on the z it names, 1 mm past the host each side", () => {
    const c = windowCutter(win(rect(-1, -3, 1, -1.75)), block.base);
    expect(c).toEqual({ route: "prism", outline: [[[2, -16], [4, -16], [4, 16], [2, 16]]], z: [1.75, 3] });
    expect(windowKind.generate(win(rect(-1, -3, 1, -1.75)), ctx()).postUnionCutters).toEqual([c]);
  });

  test("a gabled outline cuts as a sweep along the normal through the host", () => {
    const gable: Ring = [[-1, -1], [1, -1], [1, -2], [0, -3], [-1, -2]];
    const c = windowCutter(win(gable, { roof: "gabled", roofAngleDeg: 45 }), block.base);
    expect(c.route).toBe("sweep");
    const s = c as Extract<ShapeDecl, { route: "sweep" }>;
    expect(s.path).toEqual([[3, 16, 0], [3, -16, 0]]);
    // each section point lands where the face frame puts it: |section| equals |face point|
    s.section.forEach((p, i) => expect(Math.hypot(p[0], p[1])).toBeCloseTo(Math.hypot(gable[i]![0], gable[i]![1]), 12));
  });

  test("a revolve host and a two-point outline are refused", () => {
    expect(codeOf(() => windowCutter(win(rect(-1, -3, 1, -2)), { route: "revolve", profile: [[0, 0], [5, 0], [5, 5], [0, 5]] }))).toBe("E_KERNEL");
    expect(codeOf(() => windowCutter(win([[0, 0], [1, 1]]), block.base))).toBe("E_SCHEMA");
  });

  test("cut by the stage runner, the box channel leaves 3000 less 2 x 1.25 x 30 mm3 (z on the 1/1024 mm grid), and the gable its pentagon times 30", async () => {
    const box = await runStages({ draft, profile, cutters: { slab: { postUnionCutters: [windowCutter(win(rect(-1, -3, 1, -1.75)), block.base)] } } });
    expect(box.bodies[0]!.volumeMm3).toBeCloseTo(3000 - 2 * 1.25 * 30, 6);
    const gable: Ring = [[-1, -1], [1, -1], [1, -2], [0, -3], [-1, -2]];
    const sw = await runStages({ draft, profile, cutters: { slab: { postUnionCutters: [windowCutter(win(gable), block.base)] } } });
    // the pentagon: a 2 x 1 rectangle and a triangle of base 2 and height 1, 3 mm2 (computed)
    expect(sw.bodies[0]!.volumeMm3).toBeCloseTo(3000 - 3 * 30, 6);
    expect(liveCount()).toBe(0);
  });
});
