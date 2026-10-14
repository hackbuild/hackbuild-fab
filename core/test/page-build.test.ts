// The page build of a baked bench and `hbf part.build` share one pipeline
// (packages/pipeline, D-264): for the same values, PageFacts and
// SOURCE_DATE_EPOCH the page build gives the CLI's buildHash, check
// verdicts and 3mf bytes. The page build runs here in node over the facts
// tools/bake/design-facts.mjs writes into a bake; the browser run of the
// same comparison is tools/smoke/page-build.spec.ts.

import { describe, expect, it } from "vitest";
import { createPageBuild, type PageFacts } from "@hackbuild/pipeline";
import { buildPart, export3mf, loadDesign, resolveParams } from "../src/commands/build.js";
import { runAllChecks } from "../src/commands/check-run.js";
import { constraintVersions } from "../src/checks.js";
import { REF, ROOT } from "./hbf.js";
import { chase } from "../../reference/keys/flex-pair/chase.js";
import * as module from "../../reference/keys/flex-pair/build.js";
import * as kinds from "../../reference/keys/flex-pair/skeleton-kinds.js";

const EPOCH = 315532800;

describe("page build equals part.build", () => {
  it("one buildHash, one verdict per check and one 3mf for the defaults and preset two", async () => {
    const design = await loadDesign(REF, ROOT);
    const facts: PageFacts = {
      name: "flex-pair", defHash: design.defHash, tables: JSON.parse(JSON.stringify(design.ws.tables)) as PageFacts["tables"],
      checksSeed: design.ws.checksSeed, versions: design.ws.versions, constraints: constraintVersions(), epoch: EPOCH,
    };
    const page = createPageBuild({ chase, module, kinds, facts });
    for (const preset of [undefined, "two"]) {
      const values = resolveParams(design.chase, undefined, preset);
      const cli = await buildPart(design, values, { epoch: EPOCH });
      const cliChecks = await runAllChecks(cli, [], undefined);
      const inPage = await page.build(values);
      expect(inPage.buildHash, `buildHash, preset ${preset ?? "none"}`).toBe(cli.part.buildHash);
      expect(inPage.results.map((r) => [r.id, r.verdict])).toEqual(cliChecks.results.map((r) => [r.id, r.verdict]));
      const pkg = await export3mf(cli);
      const file = await page.exportFile("3mf", inPage.buildHash);
      expect(file.name).toBe(pkg.name);
      expect(Buffer.from(file.bytes as Uint8Array).equals(Buffer.from(pkg.bytes)), `3mf bytes, preset ${preset ?? "none"}`).toBe(true);
      expect(file.results.map((r) => r.id).sort()).toEqual(["CHK-3MF-06", "CHK-3MF-07", "CHK-3MF-08"]);
      expect(page.liveCount()).toBe(0);
    }
  }, 240_000);

  it("refuses an export of a build it no longer holds", async () => {
    const design = await loadDesign(REF, ROOT);
    const facts: PageFacts = {
      name: "flex-pair", defHash: design.defHash, tables: design.ws.tables, checksSeed: design.ws.checksSeed,
      versions: design.ws.versions, constraints: constraintVersions(), epoch: EPOCH,
    };
    const page = createPageBuild({ chase, module, kinds, facts });
    await expect(page.exportFile("3mf", "0".repeat(64))).rejects.toThrow("build 000000000000 is no longer held. rebuild, then export.");
  });
});
