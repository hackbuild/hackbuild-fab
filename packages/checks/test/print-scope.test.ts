// The print-layer checks run on fdm parts only. A laser or vinyl part is
// cut from sheet and has no layers, islands or overhangs, so CHK-PRT-07,
// -12 and -13 skip it and none of its passes or fails reaches the verdict.
// A box built by construction here floats one slab in mid air, so the same
// part as fdm fails CHK-PRT-07 and as laser skips.

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import type { CheckResult, MeshRef, Part } from "@hackbuild/spec";
import { DEFAULT_TEMPLATE } from "@hackbuild/3mf";
import type { MeshData } from "@hackbuild/mesh";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { CHECK_MODULES, registerChecks, runRegistry, type KernelViews } from "../src/index";

const ROOT = new URL("../../../", import.meta.url);
const seed: unknown = JSON.parse(readFileSync(new URL("packages/checks/seed/checks.seed.json", ROOT), "utf8"));
const defs = registerChecks({ seed: seed as never, filamentTemplate: DEFAULT_TEMPLATE }, CHECK_MODULES);
const profile = createProfileLookup(loadProfile());

/** An axis box as 12 triangles, outward winding. */
function box(lo: readonly number[], hi: readonly number[], at: number, pos: number[], tri: number[]): void {
  const [x0, y0, z0] = lo as [number, number, number];
  const [x1, y1, z1] = hi as [number, number, number];
  pos.push(x0, y0, z0, x1, y0, z0, x1, y1, z0, x0, y1, z0, x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y1, z1);
  const f = [0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7];
  for (const i of f) tri.push(at + i);
}

/** A 10 mm cube on the bed and a slab 5 mm above it, the slab touching nothing. */
function floatingSlab(): MeshData {
  const pos: number[] = [], tri: number[] = [];
  box([0, 0, 0], [10, 10, 2], 0, pos, tri);
  box([20, 0, 5], [30, 10, 7], 8, pos, tri);
  return { positions: Float64Array.from(pos), triangles: Uint32Array.from(tri) };
}

async function run(id: string, process: "fdm" | "laser" | "vinyl", machine: string): Promise<CheckResult> {
  const mesh = floatingSlab();
  const ref = { uri: "hbf://mesh/under-test", hash: "a".repeat(64), triangles: mesh.triangles.length / 3, bbox: [[0, 0, 0], [30, 10, 7]], volumeMm3: 400, watertight: true } as unknown as MeshRef;
  const part = {
    id: "p", name: "p", process, machine, features: [], source: { kind: "kernel", routes: ["prism"] },
    metrics: [], warnings: [], assertions: [], buildHash: "0".repeat(64),
    bodies: [{ id: "b", mesh: ref, material: "petg", slot: 1, role: "body" }], solid: ref,
    frame: { originOnAxis: false, carriesOffset: false, pose: "print" },
  } as unknown as Part;
  const views = { mesh: (r: MeshRef) => (r.uri === ref.uri ? mesh : undefined) } as KernelViews;
  const report = await runRegistry([defs.find((d) => d.id === id)!], {
    kernels: new Set(["mesh", "profile"]), produced: new Set(["part"]), targets: { parts: [part] }, views,
    ctx: { profile, machine, whitelist: new Map() },
  });
  expect(report.results.length).toBe(1);
  return report.results[0]!;
}

describe("print-layer checks scope by part process", () => {
  test("a floating slab fails CHK-PRT-07 as an fdm part", async () => {
    expect((await run("CHK-PRT-07", "fdm", "ffc5p")).verdict).toBe("fail");
  });

  for (const id of ["CHK-PRT-07", "CHK-PRT-12", "CHK-PRT-13"]) {
    test(`${id} skips a laser part on a sheet machine`, async () => {
      const r = await run(id, "laser", "sheet600");
      expect(r.verdict).toBe("skip");
      expect(r.constraint).toMatch(/no layer grid/);
    });

    test(`${id} skips a non-fdm part even on a machine that carries a preset`, async () => {
      const r = await run(id, "vinyl", "ffc5p");
      expect(r.verdict).toBe("skip");
      expect(r.constraint).toBe("part p is a vinyl part and has no print layers; this check applies to fdm parts");
    });
  }
});
