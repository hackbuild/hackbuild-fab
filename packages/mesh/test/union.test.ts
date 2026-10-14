// M00-T04 step 3: union tries the batch, verifies a closed positive volume
// with a clean audit, else folds pairwise, and refuses when both fail.

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isThrownCommandError } from "@hackbuild/spec";
import { describe, expect, it } from "vitest";
import * as mesh from "../src/index.js";
import { audit, liveCount, loadManifold, meshOf, scope, snapWeld, union, unionReport } from "../src/index.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

/** TypeScript sources under dir, skipping node_modules, dist and tests. */
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (name === "node_modules" || name === "dist" || name === "test" || name === "seed" || name === "legacy" || name.startsWith(".")) return [];
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) return sources(p);
    return /\.(ts|mts)$/.test(name) && !name.endsWith(".d.ts") ? [p] : [];
  });
}

describe("union", () => {
  it("returns a single input as is", async () => {
    const wasm = await loadManifold();
    const via = scope(() => unionReport([wasm.Manifold.cube([1, 1, 1])]).via);
    expect(via).toBe("single");
    expect(liveCount()).toBe(0);
  });

  it("takes the verified batch for overlapping, disjoint and face-sharing cubes", async () => {
    const wasm = await loadManifold();
    const cases = [
      { at: [5, 0, 0], want: 1500 },
      { at: [20, 0, 0], want: 2000 },
      { at: [10, 0, 0], want: 2000 },
    ] as const;
    for (const c of cases) {
      const r = scope(() => {
        const u = unionReport([wasm.Manifold.cube([10, 10, 10]), wasm.Manifold.cube([10, 10, 10]).translate([...c.at])]);
        return { via: u.via, volume: u.solid.volume(), ok: audit(meshOf(u.solid)).ok };
      });
      expect(r).toEqual({ via: "batch", volume: c.want, ok: true });
    }
    expect(liveCount()).toBe(0);
  });

  it("refuses cubes touching at an edge or a corner with E_KERNEL after batch and fold both fail", async () => {
    const wasm = await loadManifold();
    for (const at of [[10, 10, 0], [10, 10, 10]] as const) {
      let caught: unknown;
      try {
        scope(() => union([wasm.Manifold.cube([10, 10, 10]), wasm.Manifold.cube([10, 10, 10]).translate([...at])]));
      } catch (e) {
        caught = e;
      }
      expect(isThrownCommandError(caught)).toBe(true);
      if (isThrownCommandError(caught)) {
        expect(caught.hbf.code).toBe("E_KERNEL");
        expect(Object.keys(caught.hbf.got as object)).toEqual(["batch", "fold"]);
      }
    }
    expect(liveCount()).toBe(0);
  });

  it("names the union site and its operands in the refusal when the caller gives them", async () => {
    // Finding K-03: a conductor T joint failed with E_KERNEL and no path, so
    // the failing traces took eight builds to bisect.
    const wasm = await loadManifold();
    let caught: unknown;
    try {
      scope(() => unionReport([wasm.Manifold.cube([10, 10, 10]), wasm.Manifold.cube([10, 10, 10]).translate([10, 10, 0])],
        { path: "/bodies", members: ["conductor.gndRow", "conductor.gndLoop"] }));
    } catch (e) {
      caught = e;
    }
    expect(isThrownCommandError(caught)).toBe(true);
    if (isThrownCommandError(caught)) {
      expect(caught.hbf.code).toBe("E_KERNEL");
      expect(caught.hbf.path).toBe("/bodies");
      expect(caught.hbf.hint).toContain("the union at /bodies of conductor.gndRow, conductor.gndLoop is refused");
    }
    expect(liveCount()).toBe(0);
  });

  it("takes a candidate whose only zero-area triangles are snap collisions, once it welds clean", async () => {
    // A sloped edge crosses x = 2 at y = 2 - 0.0002 mm, beside the box corner
    // (2, 2): the two vertices are 0.0002 mm apart, under half a grid step,
    // so the D-054 snap lands both on one point. Batch and fold each read 4
    // zero-area triangles; welded on the grid they audit clean (computed).
    // The flex-pair preset two partition cutter hit this (fidelity audit).
    const wasm = await loadManifold();
    const r = scope(() => {
      const box = wasm.Manifold.cube([2, 2, 1]);
      const slab = new wasm.CrossSection([[[1, 0.5], [3, 0.5], [3, 1.9], [1, 2.1 - 0.0004]]]).extrude(1);
      const u = unionReport([box, slab]);
      return { via: u.via, welded: u.welded, raw: audit(meshOf(u.solid)).degenerate, clean: audit(snapWeld(meshOf(u.solid))).ok };
    });
    expect(r).toEqual({ via: "welded", welded: "batch", raw: 4, clean: true });
    expect(liveCount()).toBe(0);
  });

  it("refuses an empty list with E_KERNEL", () => {
    let code = "";
    try {
      union([]);
    } catch (e) {
      if (isThrownCommandError(e)) code = e.hbf.code;
    }
    expect(code).toBe("E_KERNEL");
  });

  it("is the only union: no other source calls Manifold.union, and no second union is exported", () => {
    // A second union that checks status and volume only passes batches this
    // one refuses, and a build through it never runs the verified D-055
    // path its tests certify (fidelity audit).
    const roots = ["packages", "core", "kernel", "reference", "designs"].map((d) => path.join(ROOT, d));
    const callers = roots.flatMap(sources)
      .filter((f) => /\bManifold\.union\(/.test(readFileSync(f, "utf8")))
      .map((f) => path.relative(ROOT, f));
    expect(callers).toEqual(["packages/mesh/src/union.ts"]);
    expect("unionAll" in mesh).toBe(false);
  });
});
