// The pocket kind places its outline through geom horizontalFrame (audit3):
// a face frame whose u is not unit is refused with E_SCHEMA instead of
// scaling the cutter by |u|.

import { describe, expect, test } from "vitest";
import { isThrownCommandError, type FeatureOf, type KernelCtx } from "@hackbuild/spec";
import { pocketKind } from "../src/index";

const outline: [number, number][] = [[0, 0], [10, 0], [10, 5], [0, 5]];
const pocket = (u: [number, number, number]) => ({
  id: "p1", kind: "pocket", outline, depth: 2, floor: "flat", fit: { class: "clearance" },
  face: { origin: [0, 0, 4], normal: [0, 0, 1], u },
}) as unknown as FeatureOf<"pocket">;
const ctx = { machineView: { layerHeight: 0.2 } } as unknown as KernelCtx;

function codeOf(f: () => unknown): string {
  try { f(); } catch (e) { if (isThrownCommandError(e)) return e.hbf.code; throw e; }
  return "none";
}

describe("pocket face frame", () => {
  test("u [2, 0, 0] is E_SCHEMA, never a cutter scaled 2x", () => {
    expect(codeOf(() => pocketKind.generate(pocket([2, 0, 0]), ctx))).toBe("E_SCHEMA");
  });

  test("a unit frame cuts the outline as declared, from 2 mm below the face to one layer above", () => {
    const g = pocketKind.generate(pocket([0, 1, 0]), ctx);
    const cut = g.postUnionCutters[0] as unknown as { outline: [number, number][][]; z: [number, number] };
    expect(cut.outline[0]).toEqual([[0, 0], [0, 10], [-5, 10], [-5, 0]]);
    expect(cut.z).toEqual([2, 4.2]);
  });
});
