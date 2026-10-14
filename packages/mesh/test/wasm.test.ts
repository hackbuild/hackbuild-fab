// M00-T04 steps 1 and 2: every kernel object joins the pool, scope() frees
// it, keep() hands one out, and a newer build cancels the older one through
// the manifold ExecutionContext with live count back at 0.

import { isThrownCommandError } from "@hackbuild/spec";
import { describe, expect, it } from "vitest";
import { BuildRunner, free, keep, liveCount, loadManifold, scope, withScope } from "../src/index.js";

describe("wasm ownership", () => {
  it("pools constructors, statics, methods and array results, then frees them", async () => {
    const wasm = await loadManifold();
    const counts = scope(() => {
      const a = wasm.Manifold.cube([10, 10, 10]);
      const b = a.translate([20, 0, 0]);
      const both = a.add(b);
      const parts = both.decompose();
      const section = new wasm.CrossSection([[[0, 0], [1, 0], [1, 1]]]);
      const prism = section.extrude(2);
      return { live: liveCount(), parts: parts.length, volume: prism.volume() };
    });
    // cube, translate, add, 2 from decompose, CrossSection, extrude: 7 objects.
    expect(counts).toEqual({ live: 7, parts: 2, volume: 1 });
    expect(liveCount()).toBe(0);
  });

  it("frees on throw and refuses a kernel object returned from a scope", async () => {
    const wasm = await loadManifold();
    expect(() => scope(() => {
      wasm.Manifold.cube([1, 1, 1]);
      throw new Error("stop");
    })).toThrow("stop");
    expect(liveCount()).toBe(0);
    let code = "";
    try {
      scope(() => wasm.Manifold.cube([1, 1, 1]));
    } catch (e) {
      if (isThrownCommandError(e)) code = e.hbf.code;
    }
    expect(code).toBe("E_KERNEL");
    expect(liveCount()).toBe(0);
  });

  it("keep hands an object to the enclosing scope, and free releases one kept at the top", async () => {
    const wasm = await loadManifold();
    const volume = scope(() => {
      const inner = scope(() => {
        keep(wasm.Manifold.cube([2, 2, 2]));
        return liveCount();
      });
      expect(inner).toBe(1);
      expect(liveCount()).toBe(1);
      return 0;
    });
    expect(volume).toBe(0);
    expect(liveCount()).toBe(0);

    const held = scope(() => keep(wasm.Manifold.cube([3, 3, 3])));
    expect(liveCount()).toBe(1);
    expect(held.volume()).toBe(27);
    free(held);
    expect(liveCount()).toBe(0);
  });

  it("keeps the M-S Scope handle working on the same pool", async () => {
    const wasm = await loadManifold();
    const v = withScope((s) => s.own(wasm.Manifold.cube([10, 10, 10])).volume());
    expect(v).toBe(1000);
    expect(liveCount()).toBe(0);
  });

  it("resolves a build cancelled by a newer build as cancelled with live count 0", async () => {
    const wasm = await loadManifold();
    const runner = new BuildRunner();
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));

    const older = runner.run(async (b) => {
      const solid = b.step(() => wasm.Manifold.cube([10, 10, 10]).add(wasm.Manifold.sphere(6, 48).translate([5, 5, 5])));
      await gate;
      b.evaluate(solid);
      return b.step(() => solid.volume());
    });
    // Let the older build reach its await before the newer one starts.
    await new Promise((r) => setTimeout(r, 0));
    expect(liveCount()).toBeGreaterThan(0);

    const newer = runner.run((b) => b.step(() => wasm.Manifold.cube([4, 4, 4]).volume()));
    release();
    const [a, n] = await Promise.all([older, newer]);
    console.log(`older build ${a.status}, newer build ${n.status}, live count ${liveCount()}`);
    expect(a).toEqual({ status: "cancelled" });
    expect(n).toEqual({ status: "done", value: 64 });
    expect(liveCount()).toBe(0);
  });

  it("reports the manifold Cancelled status through evaluate and honours an aborted signal", async () => {
    const wasm = await loadManifold();
    const runner = new BuildRunner();
    const self = await runner.run((b) => {
      const solid = b.step(() => wasm.Manifold.cube([10, 10, 10]).subtract(wasm.Manifold.sphere(6, 48)));
      b.ctx.cancel();
      return b.evaluate(solid);
    });
    expect(self).toEqual({ status: "cancelled" });

    // manifold-3d 3.5.x (C-11): a cancelled context turns status() of a deferred tree into Cancelled.
    const status = await runner.run((b) => {
      const solid = b.step(() => wasm.Manifold.cube([10, 10, 10]).subtract(wasm.Manifold.sphere(6, 48)));
      b.ctx.cancel();
      return b.step(() => solid.withContext(b.ctx).status());
    });
    expect(status).toEqual({ status: "cancelled" });
    const raw = scope(() => {
      const ctx = new (wasm as unknown as { ExecutionContext: new () => { cancel(): void } }).ExecutionContext();
      const tree = wasm.Manifold.cube([10, 10, 10]).subtract(wasm.Manifold.sphere(6, 48)).withContext(ctx as never);
      ctx.cancel();
      return tree.status();
    });
    expect(raw).toBe("Cancelled");

    const signal = { aborted: true, throwIfAborted: () => undefined };
    const aborted = await runner.run((b) => b.step(() => 1), { signal });
    expect(aborted).toEqual({ status: "cancelled" });
    expect(liveCount()).toBe(0);
  });
});
