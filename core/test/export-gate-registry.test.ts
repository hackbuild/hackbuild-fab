// Security finding 3 of the audit of 2026-10-08: export.run gated on the
// skeleton and M00 checks only, so a registry block check such as
// CHK-PRT-16 (build volume) never reached the D-109 gate. runAllChecks now
// runs the registry checks of the build levels, export.run gates on its
// results, and their versions enter registryHash and reportHash.
import { describe, expect, it } from "vitest";
import { buildPart, checkVersions, loadDesign, registryDefs, resolveParams, type Built } from "../src/commands/build.js";
import { allCheckIds, runAllChecks } from "../src/commands/check-run.js";
import { ROOT } from "./hbf.js";

/** The build with every body mesh scaled about the origin, so it overflows the 256 mm ffc5p volume. */
function scaled(b: Built, k: number): Built {
  const bodies = b.meshed.bodies.map((x) => ({ ...x, mesh: { ...x.mesh, positions: x.mesh.positions.map((v) => v * k) } }));
  return { ...b, meshed: { ...b.meshed, bodies } };
}

describe("the export gate runs the registry block checks", () => {
  it("CHK-PRT-16 runs in runAllChecks and fails an oversize print, which export.run's worst() stops", async () => {
    process.env["SOURCE_DATE_EPOCH"] = "315532800";
    const design = await loadDesign("reference/keys/flex-pair", ROOT);
    const built = await buildPart(design, resolveParams(design.chase, undefined, undefined));
    expect(registryDefs(design).map((d) => d.id)).toContain("CHK-PRT-16");
    expect(allCheckIds(built)).toContain("CHK-PRT-16");
    expect(Object.keys(checkVersions(design))).toContain("CHK-PRT-16");
    // The import path checks read pieces Part IR never carries: no chase build runs them or hashes their versions.
    for (const id of ["CHK-PRT-18", "CHK-PRT-19"]) {
      expect(registryDefs(design).map((d) => d.id), id).not.toContain(id);
      expect(Object.keys(checkVersions(design)), id).not.toContain(id);
    }

    const fits = await runAllChecks(built, [], ["CHK-PRT-16"]);
    expect(fits.results.map((r) => r.verdict)).toEqual(["pass", "pass", "pass"]);

    const big = await runAllChecks(scaled(built, 10), [], ["CHK-PRT-16"]);
    const fails = big.results.filter((r) => r.verdict === "fail");
    expect(fails.length).toBeGreaterThan(0);
    expect(fails.every((r) => r.id === "CHK-PRT-16" && r.severity === "block")).toBe(true);
  }, 120_000);

  it("an unknown --only name is E_REF before anything runs", async () => {
    const design = await loadDesign("reference/keys/flex-pair", ROOT);
    const built = await buildPart(design, resolveParams(design.chase, undefined, undefined));
    await expect(runAllChecks(built, [], ["CHK-NOPE-99"])).rejects.toMatchObject({ hbf: { code: "E_REF", path: "/only/0" } });
  }, 120_000);
});
