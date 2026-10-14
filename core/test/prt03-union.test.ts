// CHK-PRT-03 2.0.0 through check.run (core/src/commands/check-run.ts, the
// M00 part checks): the part carries the kernel's union volume
// (Part.unionVolumeMm3) and the check measures overlap against it, so two
// bodies that never overlap pass even where the snapped solid moves by more
// than the ceiling. The fixture's bodies are worked by hand in
// packages/mesh test/union-volume.test.ts.

import { describe, expect, it } from "vitest";
import { buildPart, loadDesign, resolveParams } from "../src/commands/build.js";
import { runAllChecks } from "../src/commands/check-run.js";
import { ROOT } from "./hbf.js";

describe("CHK-PRT-03 on crossings off the grid", () => {
  it("passes on the kernel union and reports the snap residue apart", async () => {
    const design = await loadDesign("core/test/fixtures/prt03-crossings", ROOT);
    const built = await buildPart(design, resolveParams(design.chase, undefined, undefined));
    const parts = built.part.bodies.reduce((s, b) => s + b.mesh.volumeMm3, 0);
    expect(Math.abs(parts - built.part.solid.volumeMm3)).toBeGreaterThan(1e-3);
    expect(Math.abs(parts - built.part.unionVolumeMm3!)).toBeLessThan(1e-6);
    const rs = (await runAllChecks(built, [], undefined)).results.filter((r) => r.id === "CHK-PRT-03");
    expect(rs.length).toBeGreaterThan(0);
    for (const r of rs) {
      expect(r.verdict).toBe("pass");
      expect(r.version).toBe("2.0.0");
      expect(r.measured as number).toBeLessThan(1e-3);
      expect(r.extra?.["snapResidueMm3"] as number).toBeGreaterThan(1e-3);
    }
  });
});
