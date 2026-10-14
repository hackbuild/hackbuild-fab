// The conductor kind places its region through geom horizontalFrame
// (audit3): a face frame whose u is not unit is refused with E_SCHEMA
// instead of scaling the copper by |u|. The face below is the reproduced
// defect: u [2, 0, 0] doubled every path point.

import { describe, expect, test } from "vitest";
import { isThrownCommandError, type ConductorFeature, type KernelCtx } from "@hackbuild/spec";
import { conductorKind } from "../src/index";

const path: [number, number][] = [[0, 0], [10, 0], [10, 5], [0, 5]];
const feature = (u: [number, number, number]) => ({
  id: "c1", kind: "conductor", net: "A", material: "cpla", t: 0.6, width: 1,
  region: { face: { origin: [0, 0, 1], normal: [0, 0, 1], u }, path },
}) as unknown as ConductorFeature;

function codeOf(f: () => unknown): string {
  try { f(); } catch (e) { if (isThrownCommandError(e)) return e.hbf.code; throw e; }
  return "none";
}

describe("conductor face frame", () => {
  test("u [2, 0, 0] is E_SCHEMA, never a copper region scaled 2x", () => {
    expect(codeOf(() => conductorKind.generate(feature([2, 0, 0]), {} as KernelCtx))).toBe("E_SCHEMA");
  });

  test("a tilted unit face stays E_KERNEL (the horizontal rule, not the unit rule)", () => {
    const f = { ...feature([1, 0, 0]), region: { face: { origin: [0, 0, 1], normal: [0, 1, 0], u: [1, 0, 0] }, path } } as unknown as ConductorFeature;
    expect(codeOf(() => conductorKind.generate(f, {} as KernelCtx))).toBe("E_KERNEL");
  });
});
