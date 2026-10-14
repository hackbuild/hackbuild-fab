// Stage 8 records the volume of the union as the kernel computed it, before
// the D-054 snap of the union's own vertices (Part.unionVolumeMm3, read by
// CHK-PRT-03). A tall block standing on a pad with its footprint turned off
// the axes crosses the pad's edges at points off the 1/1024 mm grid: the
// union holds those crossings, the snap moves them, and the snapped solid
// no longer equals the bodies it is made of. The expected volumes are worked
// out from the outlines by hand, never read back from the runner.

import { describe, expect, it } from "vitest";
import type { BodyDraft, PartDraft, Ring } from "@hackbuild/spec";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { liveCount, runStages, signedVolume, stagePart } from "../src/index.js";

const profile = createProfileLookup(loadProfile());
const FRAME = { originOnAxis: false, carriesOffset: true, pose: "print" } as const;
const draft = (bodies: BodyDraft[]): PartDraft => ({ id: "fixture", name: "fixture", process: "fdm", machine: "ffc5p", frame: FRAME, bodies, features: [] });
const rect = (x0: number, y0: number, x1: number, y1: number): Ring => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

/** A square of half diagonal r about (cx, cy), turned by a, as grid-exact corners (1/1024 mm). */
function turned(cx: number, cy: number, r: number, a: number): Ring {
  const g = (v: number): number => Math.round(v * 1024) / 1024;
  return [0, 1, 2, 3].map((k) => [g(cx + r * Math.cos(a + (k * Math.PI) / 2)), g(cy + r * Math.sin(a + (k * Math.PI) / 2))] as const);
}

/** Shoelace area of a ring, mm2. */
const area = (ring: Ring): number => ring.reduce((s, p, i) => {
  const q = ring[(i + 1) % ring.length]!;
  return s + (p[0] * q[1] - q[0] * p[1]) / 2;
}, 0);

describe("stage 8 union volume (CHK-PRT-03 measure)", () => {
  // The tower's footprint overhangs the pad on all four sides at 0.3 rad, so
  // each of its edges crosses a pad edge: eight crossings, none on the grid.
  const padRing = rect(0, 0, 20, 20);
  const towerRing = turned(10, 10, 12.5, 0.3);
  const pad: BodyDraft = { id: "pad", role: "body", slot: 1, material: "petg", base: { route: "prism", outline: [padRing], z: [0, 2] } };
  const tower: BodyDraft = { id: "tower", role: "body", slot: 1, material: "petg", base: { route: "prism", outline: [towerRing], z: [2, 80] } };

  it("equals the bodies' sum where the snapped solid does not", async () => {
    const out = await runStages({ draft: draft([pad, tower]), profile });
    const want = area(padRing) * 2 + area(towerRing) * 78;
    const parts = out.bodies.reduce((s, b) => s + b.volumeMm3, 0);
    expect(parts).toBeCloseTo(want, 6);
    expect(out.unionVolumeMm3).toBeDefined();
    // the kernel's union holds the bodies exactly: no part overlaps another
    expect(Math.abs(out.unionVolumeMm3! - parts)).toBeLessThan(1e-6);
    // the snap of the eight crossings moves the solid by more than the CHK-PRT-03 ceiling (computed)
    expect(Math.abs(signedVolume(out.solid) - parts)).toBeGreaterThan(1e-3);
    expect(liveCount()).toBe(0);
  });

  it("enters Part IR beside the snapped solid", async () => {
    const built = await stagePart({ draft: draft([pad, tower]), profile });
    expect(built.part.unionVolumeMm3).toBeCloseTo(area(padRing) * 2 + area(towerRing) * 78, 6);
    expect(built.part.solid.volumeMm3).not.toBeCloseTo(built.part.unionVolumeMm3!, 3);
  });

  it("is the one body's volume for a single body", async () => {
    const out = await runStages({ draft: draft([pad]), profile });
    expect(out.unionVolumeMm3).toBeCloseTo(area(padRing) * 2, 9);
  });
});
