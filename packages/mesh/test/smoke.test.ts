// M00-T01 smoke: manifold-3d loads at its pin, a 10 mm cube built inside a
// scope reads 1000 mm3 (computed), and closing the scope leaves live count 0.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { liveCount, loadManifold, withScope } from "../src/index.js";

const readJson = (rel: string): Record<string, unknown> =>
  JSON.parse(readFileSync(new URL(rel, import.meta.url), "utf8")) as Record<string, unknown>;

describe("mesh smoke", () => {
  it("installs manifold-3d at the version mesh pins", () => {
    // The wasm module exposes no version call and the package exports no
    // ./package.json, so the installed manifest is read from disk here.
    const pinned = (readJson("../package.json")["dependencies"] as Record<string, string>)["manifold-3d"];
    const installed = readJson("../../../node_modules/manifold-3d/package.json")["version"];
    expect(pinned).toBe("3.5.4");
    expect(installed).toBe(pinned);
  });

  it("builds a 10 mm cube of 1000 mm3 and frees it to live count 0", async () => {
    const wasm = await loadManifold();
    const volume = withScope((scope) => {
      const cube = scope.own(wasm.Manifold.cube([10, 10, 10]));
      expect(liveCount()).toBe(1);
      return cube.volume();
    });
    expect(volume).toBe(1000);
    expect(liveCount()).toBe(0);
    console.log(`cube volume ${volume} mm3 (computed), live count ${liveCount()}`);
  });
});
