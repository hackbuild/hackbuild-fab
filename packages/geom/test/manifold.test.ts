import { describe, expect, it } from "vitest";
import { configureManifold, loadManifold } from "../src/index.js";

describe("shared manifold instance", () => {
  it("hands every caller the same module", async () => {
    const [a, b] = await Promise.all([loadManifold(), loadManifold()]);
    expect(a).toBe(b);
    expect(await loadManifold()).toBe(a);
  });

  it("refuses configuration once loading has started", async () => {
    await loadManifold();
    expect(() => configureManifold({ locateFile: (p) => p })).toThrow(/already loading/);
  });
});
