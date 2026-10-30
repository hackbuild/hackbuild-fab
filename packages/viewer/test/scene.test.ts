// M09-T06 headless half: the stage scene frees what each draw made (D-055)
// and the orbit numbers are PIP's (bench/part3.js lines 22 to 98). The
// browser half, with a renderer and renderer.info.memory, is
// tools/smoke/viewer.spec.ts.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import type { Part } from "@hackbuild/spec";
import { CAMS, DIST_RANGE, eye, fit, pan, rotate, zoom, type Orbit } from "../src/controls.js";
import { createOwner } from "../src/dispose.js";
import { createStageScene, type Palette, type ViewModes, type ViewPart } from "../src/scene.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const part = JSON.parse(readFileSync(path.join(HERE, "fixtures/flex-pair.part.json"), "utf8")) as Part;

/** One box per body at its Part IR bbox: enough triangles to draw and outline. */
function boxMesh(b: Part["bodies"][number]) {
  const [lo, hi] = b.mesh.bbox;
  const positions: number[] = [];
  for (let i = 0; i < 8; i++) positions.push(i & 1 ? hi[0] : lo[0], i & 2 ? hi[1] : lo[1], i & 4 ? hi[2] : lo[2]);
  const triangles = [0, 2, 1, 1, 2, 3, 4, 5, 6, 5, 7, 6, 0, 1, 4, 1, 5, 4, 2, 6, 3, 3, 6, 7, 0, 4, 2, 2, 4, 6, 1, 3, 5, 3, 7, 5];
  return { positions, triangles };
}
const view: ViewPart = { part, meshes: Object.fromEntries(part.bodies.map((b) => [b.id, boxMesh(b)])) };
const palette: Palette = { slot: () => "rgb(240, 240, 230)", net: () => "rgb(166, 226, 46)", focus: "rgb(254, 3, 134)", bed: "rgb(26, 26, 26)" };
const plain: ViewModes = { explode: false, xray: false, section: null, plate: false, focus: [] };

describe("stage scene ownership", () => {
  test("live objects return to the first draw's count after 50 draws through every mode", () => {
    const owner = createOwner();
    const st = createStageScene(owner);
    const empty = owner.live;
    st.draw(view, plain, palette);
    const first = owner.live;
    // One geometry and one material per body, on top of the bed's two.
    expect(first - empty).toBe(part.bodies.length * 2);
    const modes: ViewModes[] = [
      { ...plain, explode: true },
      { ...plain, xray: true },
      { ...plain, section: 2.69 },
      { ...plain, plate: true },
      { ...plain, focus: ["contact.key1", "cap1"] },
    ];
    for (let i = 0; i < 50; i++) st.draw(view, modes[i % modes.length] as ViewModes, palette);
    st.draw(view, plain, palette);
    expect(owner.live).toBe(first);
    st.draw(null, plain, palette);
    expect(owner.live).toBe(empty);
    st.dispose();
    expect(owner.live).toBe(0);
  });

  test("focus adds one outline geometry and material per focused body", () => {
    const owner = createOwner();
    const st = createStageScene(owner);
    st.draw(view, plain, palette);
    const base = owner.live;
    st.draw(view, { ...plain, focus: ["contact.key1", "cap1", "conductor.key1col"] }, palette);
    expect(owner.live - base).toBe(4);
    st.dispose();
  });

  test("explode lifts each slot one step; the bounds grow", () => {
    const st = createStageScene(createOwner());
    st.draw(view, plain, palette);
    const flat = st.bounds();
    st.draw(view, { ...plain, explode: true }, palette);
    const up = st.bounds();
    expect(flat).not.toBeNull();
    expect((up?.max.z ?? 0) - (flat?.max.z ?? 0)).toBeGreaterThan(0);
    st.dispose();
  });
});

describe("orbit", () => {
  const o = (): Orbit => ({ theta: CAMS.iso[0], phi: CAMS.iso[1], dist: 260, target: [0, 0, 6] });

  test("PIP cams", () => {
    expect(CAMS.iso).toEqual([-1.2, 0.85]);
    expect(CAMS.front).toEqual([-Math.PI / 2, 0.12]);
    expect(CAMS.under).toEqual([-1.2, -0.85]);
  });

  test("drag orbits at 0.008 rad per px and holds phi inside 1.5 rad", () => {
    const a = o();
    rotate(a, 100, 0);
    expect(a.theta).toBeCloseTo(-1.2 - 0.8, 12);
    rotate(a, 0, 1000);
    expect(a.phi).toBe(1.5);
  });

  test("wheel distance stays inside 20 to 1500 mm", () => {
    const a = o();
    for (let i = 0; i < 100; i++) zoom(a, 0.9);
    expect(a.dist).toBe(DIST_RANGE[0]);
    for (let i = 0; i < 100; i++) zoom(a, 1.1);
    expect(a.dist).toBe(DIST_RANGE[1]);
  });

  test("pan keeps the eye to target vector", () => {
    const a = o();
    const before = eye(a).map((v, i) => v - (a.target[i] as number));
    pan(a, 30, -20);
    const after = eye(a).map((v, i) => v - (a.target[i] as number));
    after.forEach((v, i) => expect(v).toBeCloseTo(before[i] as number, 9));
    expect(a.target).not.toEqual([0, 0, 6]);
  });

  test("fit aims at the box centre, 1.75 times its largest extent away", () => {
    const a = o();
    fit(a, [[-30, -15, 0], [30, 15, 11]]);
    expect(a.target).toEqual([0, 0, 5.5]);
    expect(a.dist).toBeCloseTo(105, 9);
  });
});
