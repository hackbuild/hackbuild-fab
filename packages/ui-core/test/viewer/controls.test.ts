// Gold G-15: a fit keeps the model inside the stage at the stage's own
// shape, and a commit that moves the bounds by more than 20 percent refits.
// The projection is three's PerspectiveCamera, independent of the fit code.
// Stage sizes are the gold-run measures: 574 x 630 px (single kind at 1280,
// the W 90 failure), 940 x 588 px (16:10 wide stage), 358 x 224 px (390 px
// phone). The flex-pair box at W 90 is 90 x 30 x 11 mm, computed from
// test/bench/flex-pair.part.json widened from W 60.

import { describe, expect, test } from "vitest";
import { PerspectiveCamera, Vector3 } from "three";
import { boundsMoved, CAMS, eye, fit, type CamName, type Orbit } from "../../src/viewer/controls.js";
import { createOwner } from "../../src/viewer/dispose.js";
import { createStageScene } from "../../src/viewer/scene.js";

const FOV = createStageScene(createOwner()).camera.fov;

function corners(lo: readonly number[], hi: readonly number[]): Vector3[] {
  const out: Vector3[] = [];
  for (let i = 0; i < 8; i++) out.push(new Vector3(i & 1 ? hi[0] : lo[0], i & 2 ? hi[1] : lo[1], i & 4 ? hi[2] : lo[2]));
  return out;
}

/** Largest |ndc| of the box corners seen from the orbit on a stage of w x h px. */
function reach(o: Orbit, box: readonly [readonly number[], readonly number[]], w: number, h: number): number {
  const cam = new PerspectiveCamera(FOV, w / h, 1, 3000);
  cam.up.set(0, 0, 1);
  cam.position.set(...eye(o));
  cam.lookAt(...o.target);
  cam.updateMatrixWorld();
  return Math.max(...corners(box[0], box[1]).map((c) => {
    const p = c.project(cam);
    return Math.max(Math.abs(p.x), Math.abs(p.y));
  }));
}

const orbitAt = (cam: CamName): Orbit => ({ theta: CAMS[cam][0], phi: CAMS[cam][1], dist: 260, target: [0, 0, 6] });

describe("fit at the stage's shape (G-15)", () => {
  const boxes: readonly (readonly [readonly number[], readonly number[]])[] = [
    [[-30, -15, 0], [30, 15, 11.07]],
    [[-45, -15, 0], [45, 15, 11.07]],
    [[-120, -15, 0], [120, 15, 11.07]],
  ];
  const stages: readonly [number, number][] = [[574, 630], [940, 588], [358, 224]];
  for (const [w, h] of stages) {
    test(`every corner projects inside a ${w} x ${h} px stage from every cam`, () => {
      for (const box of boxes) {
        for (const cam of Object.keys(CAMS) as CamName[]) {
          const o = orbitAt(cam);
          fit(o, box, { fovDeg: FOV, aspect: w / h });
          expect(reach(o, box, w, h)).toBeLessThan(1);
        }
      }
    });
  }

  test("the W 90 box overran a 574 x 630 stage at the extent-only distance", () => {
    const box = boxes[1] as (typeof boxes)[number];
    const o = orbitAt("iso");
    fit(o, box);
    expect(reach(o, box, 574, 630)).toBeGreaterThan(1);
  });
});

describe("refit on a bounds move (G-15)", () => {
  const a: readonly [readonly number[], readonly number[]] = [[-30, -15, 0], [30, 15, 11]];
  test("a 10 percent change keeps the camera; a 25 percent change refits", () => {
    expect(boundsMoved(a, [[-33, -15, 0], [33, 15, 11]])).toBe(false);
    expect(boundsMoved(a, [[-37.5, -15, 0], [37.5, 15, 11]])).toBe(true);
  });
  test("a centre shift past 20 percent of the largest extent refits", () => {
    expect(boundsMoved(a, [[-30 + 11, -15, 0], [30 + 11, 15, 11]])).toBe(false);
    expect(boundsMoved(a, [[-30 + 13, -15, 0], [30 + 13, 15, 11]])).toBe(true);
  });
});
