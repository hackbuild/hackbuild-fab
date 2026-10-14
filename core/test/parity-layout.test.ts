// hbf parity names a golden diff where every meshHash moved and every volume
// stayed equal, so --accept cannot re-baseline a hash layout change unnoticed.

import { describe, expect, it } from "vitest";
import { layoutWarnings } from "../src/commands/parity.js";

const golden = { meshHashes: { a: "1", b: "2" }, volumes: { a: 10, b: 20 } };

describe("parity mesh-layout warning", () => {
  it("warns when every meshHash moved and every volume is equal", () => {
    const w = layoutWarnings(golden, { meshHashes: { a: "3", b: "4" }, volumes: { a: 10, b: 20 } });
    expect(w).toHaveLength(1);
    expect(w[0]).toMatch(/^mesh-layout: all 2 meshHashes moved/);
  });

  it("is quiet when a volume moved with the hashes (geometry drift)", () => {
    expect(layoutWarnings(golden, { meshHashes: { a: "3", b: "4" }, volumes: { a: 10, b: 21 } })).toEqual([]);
  });

  it("is quiet when one meshHash is unchanged", () => {
    expect(layoutWarnings(golden, { meshHashes: { a: "1", b: "4" }, volumes: { a: 10, b: 20 } })).toEqual([]);
  });

  it("is quiet with no golden or no shared body", () => {
    expect(layoutWarnings(undefined, golden)).toEqual([]);
    expect(layoutWarnings(golden, { meshHashes: { c: "9" }, volumes: { c: 1 } })).toEqual([]);
  });
});
