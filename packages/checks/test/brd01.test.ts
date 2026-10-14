// M08-T07: CHK-BRD-01 through the registry. The reparse itself runs in
// tools/py/board/reparse.py (held by tools/py/board/test/test_reparse.py on
// the SPINDLE R1 fab set); here a stub board view stands in for core's uv
// call, so the run body's verdict, its constraint text and its skips are
// pinned: a report that holds a failure fails, a clean one passes, and no
// record, no view or another exporter each skip with the reason.

import { describe, expect, test } from "vitest";
import type { ArtifactBytes, BoardRecord, CheckResult, KernelId, Part } from "@hackbuild/spec";
import { DEFAULT_TEMPLATE } from "@hackbuild/3mf";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { readFileSync } from "node:fs";
import { CHECK_MODULES, registerChecks, runRegistry, type KernelViews, type ReparseReport } from "../src/index";

const ROOT = new URL("../../../", import.meta.url);
const seed = JSON.parse(readFileSync(new URL("packages/checks/seed/checks.seed.json", ROOT), "utf8")) as unknown;
const def = registerChecks({ seed, filamentTemplate: DEFAULT_TEMPLATE }, CHECK_MODULES).find((d) => d.id === "CHK-BRD-01")!;
const KERNELS = new Set<KernelId>(["board", "profile"]);
const RECORD = { schema: 1, backend: "direct" } as unknown as BoardRecord;
const part = { id: "spindle-r1", board: RECORD } as unknown as Part;

const zip = (exporter = "gerbers", withPart = true): ArtifactBytes => ({
  exporter, name: "spindle-r1-gerbers.zip", bytes: new Uint8Array([0x50, 0x4b]), ...(withPart ? { part } : {}),
});

async function run(artifact: ArtifactBytes, report?: ReparseReport): Promise<CheckResult> {
  const seen: unknown[] = [];
  const views: KernelViews = report === undefined ? {} : { board: { reparse: async (_z, rec) => { seen.push(rec); return report; } } };
  const out = await runRegistry([def], {
    kernels: KERNELS, targets: { artifacts: [artifact] }, views,
    ctx: { profile: createProfileLookup(loadProfile()), machine: "", whitelist: new Map() },
  });
  if (report !== undefined && artifact.part !== undefined && artifact.exporter === "gerbers") expect(seen).toEqual([RECORD]);
  return out.results[0]!;
}

describe("CHK-BRD-01", () => {
  test("a clean reparse passes with the worst symmetric difference in its constraint", async () => {
    const r = await run(zip(), { ok: true, fails: [], lines: [], worstSymdiff: 0.000087 });
    expect(r.verdict).toBe("pass");
    expect(r.measured).toBe(true);
    expect(r.constraint).toContain("worst layer symmetric difference 0.000087 mm2, legal 0 to 0.001");
  });

  test("a failed assertion fails and names the first failure", async () => {
    const fails = ["B_Cu piece of 34.15 mm2 joins nets 5V, GND through holes at (2.40, 20.00)", "4 GND holes sit off the pour"];
    const r = await run(zip(), { ok: false, fails, lines: [], worstSymdiff: 0.000087 });
    expect(r.verdict).toBe("fail");
    expect(r.measured).toBe(false);
    expect(r.constraint).toBe(`spindle-r1-gerbers.zip fails its reparse: ${fails[0]}, and 1 more`);
    expect(r.extra).toMatchObject({ failed: 2 });
  });

  test("no record, no view or another exporter each skip with the reason", async () => {
    expect((await run(zip("gerbers", false), { ok: true, fails: [], lines: [], worstSymdiff: 0 })).constraint).toMatch(/no BoardRecord beside/);
    expect((await run(zip())).constraint).toMatch(/board readers not supplied/);
    const k = await run(zip("kicad"), { ok: true, fails: [], lines: [], worstSymdiff: 0 });
    expect(k.verdict).toBe("skip");
    expect(k.constraint).toMatch(/kicad export; CHK-BRD-01 reads gerbers zips/);
  });
});
