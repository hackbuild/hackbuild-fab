import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// A page holds one copy of manifold.ts per library that bundles geom. The
// query string gives each import its own module instance, as two bundles have.
type Copy = typeof import("../src/manifold.js");
const FILE = fileURLToPath(new URL("../src/manifold.ts", import.meta.url));
const copy = (tag: string): Promise<Copy> => import(/* @vite-ignore */ `${FILE}?copy=${tag}`) as Promise<Copy>;

describe("manifold state shared by two copies of geom", () => {
  it("loads one instance through either copy", async () => {
    const [a, b] = await Promise.all([copy("a"), copy("b")]);
    expect(a.loadManifold).not.toBe(b.loadManifold);
    const [fromA, fromB] = await Promise.all([a.loadManifold(), b.loadManifold()]);
    expect(fromA).toBe(fromB);
  });

  it("refuses configuration in one copy once the other has started loading", async () => {
    const [a, b] = await Promise.all([copy("c"), copy("d")]);
    await a.loadManifold();
    expect(() => b.configureManifold({ locateFile: (p) => p })).toThrow(/already loading/);
  });

  it("refuses a second instance adopted in one copy after the other loaded", async () => {
    const [a, b] = await Promise.all([copy("e"), copy("f")]);
    const first = await a.loadManifold();
    expect(() => b.adoptManifold({ ...first } as unknown as typeof first)).toThrow(/already loading/);
    expect(() => b.adoptManifold(first)).not.toThrow();
  });
});
