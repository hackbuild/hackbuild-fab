// M05-T20 step 1: stage 8 records one Part.bodyAdjacency row per pair of
// bodies with a coincident face, with the shared area, and the row hashes
// with the part. The areas here are worked out by hand from the outlines,
// never read back from the runner.

import { describe, expect, it } from "vitest";
import type { BodyDraft, PartDraft, Ring } from "@hackbuild/spec";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { ADJACENCY_MIN_MM2, liveCount, partContentHashOf, runStages, stagePart } from "../src/index.js";

const profile = createProfileLookup(loadProfile());
const rect = (x0: number, y0: number, x1: number, y1: number): Ring => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const FRAME = { originOnAxis: false, carriesOffset: true, pose: "print" } as const;
const draft = (bodies: BodyDraft[]): PartDraft => ({ id: "fixture", name: "fixture", process: "fdm", machine: "ffc5p", frame: FRAME, bodies, features: [] });
const box = (id: string, role: BodyDraft["role"], slot: number, outline: Ring, z: readonly [number, number]): BodyDraft =>
  ({ id, role, slot, material: slot === 2 ? "cpla" : "petg", base: { route: "prism", outline: [outline], z } });
/** One snap step, mm (D-054). */
const g = 1 / 1024;

describe("body adjacency (M05-T20 step 1)", () => {
  it("a lid on a pad shares its footprint; a body apart shares nothing", async () => {
    const pad = box("pad", "body", 1, rect(0, 0, 30, 20), [0, 3]);
    const lid = box("lid", "body", 1, rect(5, 5, 15, 13), [3, 5]);
    const far = box("far", "body", 1, rect(50, 0, 60, 10), [0, 3]);
    const out = await runStages({ draft: draft([pad, lid, far]), profile });
    // 10 x 8 mm footprint on the pad top, computed by hand
    expect(out.adjacency).toEqual([{ a: "pad", b: "lid", areaMm2: 80 }]);
    expect(liveCount()).toBe(0);
  });

  it("a conductor partitioned out of its pad shares the floor its inset keeps; the inset side walls sit one grid step off", async () => {
    const pad = box("pad", "body", 1, rect(0, 0, 30, 20), [0, 3]);
    const trace = box("trace", "conductor", 2, rect(10, 8, 20, 12), [1, 3]);
    const out = await runStages({ draft: draft([pad, trace]), profile });
    expect(out.adjacency).toHaveLength(1);
    const [row] = out.adjacency!;
    expect([row!.a, row!.b]).toEqual(["pad", "trace"]);
    // the floor at z 1 of the trace inset one grid step per side, (10 - 2g) x (4 - 2g) mm2 (computed)
    expect(row!.areaMm2).toBeCloseTo((10 - 2 * g) * (4 - 2 * g), 5);
  });

  it("finds a shared side wall and drops a body one grid step away", async () => {
    expect(ADJACENCY_MIN_MM2).toBe(g * g);
    const a = box("a", "body", 1, rect(0, 0, 3, 3), [0, 1]);
    const b = box("b", "body", 1, rect(3, 0, 6, 3), [0, 1]);
    const near = box("near", "body", 1, rect(6 + g, 0, 9, 3), [0, 1]);
    const out = await runStages({ draft: draft([a, b, near]), profile });
    // a and b share the 3 x 1 mm wall at x 3; near stands one grid step off b, inside the bounds test, and shares no face
    expect(out.adjacency).toEqual([{ a: "a", b: "b", areaMm2: 3 }]);
  });

  it("enters Part IR and the content hash", async () => {
    const pad = box("pad", "body", 1, rect(0, 0, 30, 20), [0, 3]);
    const lid = box("lid", "body", 1, rect(5, 5, 15, 13), [3, 5]);
    const built = await stagePart({ draft: draft([pad, lid]), profile });
    expect(built.part.bodyAdjacency).toEqual([{ a: "pad", b: "lid", areaMm2: 80 }]);
    const moved = { ...built.part, bodyAdjacency: [{ a: "pad", b: "lid", areaMm2: 81 }] };
    expect(partContentHashOf(moved, built.itemTransform)).not.toBe(built.contentHash);
  });
});
