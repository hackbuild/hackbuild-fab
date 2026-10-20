// The chase record of the writer goes through canonicalize (D-051, D-206).
// The canonicalize here is the vendored hackbuild-3mf copy of spec/jcs.ts;
// packages/checks/test/canonical-3mf.test.ts holds it to the spec bytes.

import { describe, expect, it } from "vitest";
import { build, canonicalize, type BuildConfig } from "../src/index.js";
import { box, EPOCH } from "./cube.js";

describe("the chase record goes through spec canonicalize (3mf)", () => {
  it("writes Metadata/hackbuild_chase.json as canonicalize({chase, buildHash})", () => {
    const chase = 'kéy "x" \\';
    const cfg: BuildConfig = {
      title: "t", target: "core", chase, buildHash: "c".repeat(64), sourceDateEpoch: EPOCH,
      filaments: [{ color: "#1a1a1a", type: "PETG" }],
      objects: [{ name: "t", parts: [box("t", 1, [0, 0, 0], [5, 5, 1])] }],
    };
    const b = build(cfg);
    if (!b.ok) throw new Error("completeness failed");
    const text = b.entries["Metadata/hackbuild_chase.json"]!;
    expect(text).toBe(canonicalize({ chase, buildHash: "c".repeat(64) }));
    expect(JSON.parse(text)).toEqual({ chase, buildHash: "c".repeat(64) });
  });
});
