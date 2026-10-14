// Face-frame placement (D-165): origin + x u + y v, v = normal x u. The
// expected points are worked by hand from that definition; the horizontal
// mapper is held to the plan formula [ox + x ux - y uy, oy + x uy + y ux]
// that mesh pocket and archetypes frameOf write out for normal [0, 0, 1].

import fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { FaceFrame } from "@hackbuild/spec";
import { cross, faceBasis, horizontalFrame, placeOnFace } from "../src/index.js";

const up = (u: FaceFrame["u"]): FaceFrame => ({ origin: [0, 0, 1], normal: [0, 0, 1], u });

describe("faceBasis", () => {
  test("u [2, 0, 0] is refused with E_SCHEMA, never scaled", () => {
    expect(() => faceBasis(up([2, 0, 0]), "/face")).toThrow(/^E_SCHEMA \/face\/u /);
  });

  test("a normal of length 2 is refused with E_SCHEMA", () => {
    expect(() => faceBasis({ origin: [0, 0, 0], normal: [0, 0, 2], u: [1, 0, 0] }, "/face")).toThrow(/^E_SCHEMA \/face\/normal /);
  });

  test("a unit u out of the face plane is refused with E_SCHEMA", () => {
    expect(() => faceBasis(up([0.6, 0, 0.8]), "/face")).toThrow(/^E_SCHEMA \/face\/u /);
  });

  test("a non-finite component is refused", () => {
    expect(() => faceBasis({ origin: [Number.NaN, 0, 0], normal: [0, 0, 1], u: [1, 0, 0] }, "/face")).toThrow(/^E_SCHEMA/);
  });

  test("v is normal x u", () => {
    expect(faceBasis(up([0, 1, 0]), "/face").v).toEqual([-1, 0, 0]);
    expect(cross([1, 0, 0], [0, 1, 0])).toEqual([0, 0, 1]);
  });
});

describe("placeOnFace", () => {
  test("(2, 3) on an upward face with u +y lands at [-3, 2, 1]", () => {
    expect(placeOnFace(faceBasis(up([0, 1, 0]), "/face"), [2, 3])).toEqual([-3, 2, 1]);
  });

  test("(2, 3) on a +x wall with u +y lands at [5, 2, 3]", () => {
    const b = faceBasis({ origin: [5, 0, 0], normal: [1, 0, 0], u: [0, 1, 0] }, "/face");
    expect(placeOnFace(b, [2, 3])).toEqual([5, 2, 3]);
  });
});

describe("horizontalFrame", () => {
  test("z0 is the face height and a 10 by 5 path stays 10 by 5", () => {
    const h = horizontalFrame(up([1, 0, 0]), "/face");
    expect(h.z0).toBe(1);
    expect([[0, 0], [10, 0], [10, 5], [0, 5]].map((p) => h.at(p as [number, number]))).toEqual([[0, 0], [10, 0], [10, 5], [0, 5]]);
  });

  test("u [2, 0, 0] is refused with E_SCHEMA before the tilt test", () => {
    expect(() => horizontalFrame(up([2, 0, 0]), "/face")).toThrow(/^E_SCHEMA \/face\/u /);
  });

  test("a tilted face is refused with the caller's code and hint", () => {
    const wall: FaceFrame = { origin: [0, 0, 0], normal: [1, 0, 0], u: [0, 1, 0] };
    expect(() => horizontalFrame(wall, "/face")).toThrow(/^E_KERNEL \/face /);
    expect(() => horizontalFrame(wall, "/face", { code: "E_SCHEMA", hint: "place it on the floor" })).toThrow("E_SCHEMA /face place it on the floor");
  });

  test("a downward face needs allowDown, and then v flips", () => {
    const down: FaceFrame = { origin: [0, 0, 4], normal: [0, 0, -1], u: [1, 0, 0] };
    expect(() => horizontalFrame(down, "/face")).toThrow(/^E_KERNEL/);
    expect(horizontalFrame(down, "/face", { allowDown: true }).at([2, 3])).toEqual([2, -3]);
  });

  test("on normal [0, 0, 1] the mapper equals the plan formula bit for bit, signed zero aside", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 2 * Math.PI, noNaN: true }),
        fc.tuple(fc.double({ min: -500, max: 500, noNaN: true }), fc.double({ min: -500, max: 500, noNaN: true })),
        fc.tuple(fc.double({ min: -500, max: 500, noNaN: true }), fc.double({ min: -500, max: 500, noNaN: true })),
        (a, [ox, oy], [x, y]) => {
          const ux = Math.cos(a), uy = Math.sin(a);
          const h = horizontalFrame({ origin: [ox, oy, 0], normal: [0, 0, 1], u: [ux, uy, 0] }, "/face");
          const [px, py] = h.at([x, y]);
          return px === ox + x * ux - y * uy && py === oy + x * uy + y * ux;
        },
      ),
    );
  });
});
