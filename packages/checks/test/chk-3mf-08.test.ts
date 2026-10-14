// M05-T20: CHK-3MF-08 through the registry on the three committed fixtures
// (tools/corpus/3mf/make-chk-3mf-08.mjs: the flex-pair export and two slicer
// edits of it). The expected numbers are read from their own sources: the
// beam width and depth from packages/profile/data/constants.json, the trace
// and column widths from the flex-pair chase defaults and build.ts, the
// conductor bodies from build.ts feature ids. The JS validator mirror must
// give the same verdict as the run body on every fixture; the Python mirror
// is held to the same verdicts in tools/py/test/test_chk_3mf_08.py.

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import type { ArtifactBytes, CheckResult, KernelId, Part } from "@hackbuild/spec";
import { DEFAULT_TEMPLATE, readEntries, validateEntries } from "@hackbuild/3mf";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { CHECK_MODULES, interlockingDefaults, registerChecks, runRegistry } from "../src/index";

const ROOT = new URL("../../../", import.meta.url);
const read = (rel: string): string => readFileSync(new URL(rel, ROOT), "utf8");
const seed = JSON.parse(read("packages/checks/seed/checks.seed.json")) as unknown;
const def = registerChecks({ seed, filamentTemplate: DEFAULT_TEMPLATE }, CHECK_MODULES).find((d) => d.id === "CHK-3MF-08")!;
const KERNELS = new Set<KernelId>(["3mf", "profile"]);

const constants = new Map((JSON.parse(read("packages/profile/data/constants.json")) as { constants: { id: string; value: number }[] }).constants.map((c) => [c.id, c.value]));
const WIDTH = constants.get("3mf.interlockingBeamWidth")!;
const DEPTH = constants.get("3mf.interlockingDepth")!;

// reference/keys/flex-pair: the trace width default p.w and the column half width colR - cg2 (build.ts conductor features).
const buildTs = read("reference/keys/flex-pair/build.ts");
const CONDUCTORS = [...buildTs.matchAll(/kind: "conductor", id: `?"?(conductor\.[a-z]+(?:\$\{n\})?[a-z]*)/g)].map((m) => m[1]!.replace("${n}", "1"));
const CAP = "cap1";

const fixture = (name: string, part?: Part): ArtifactBytes => ({
  exporter: "3mf", name: `CHK-3MF-08/${name}.3mf`,
  bytes: new Uint8Array(readFileSync(new URL(`packages/checks/test/fixtures/CHK-3MF-08/${name}.3mf`, ROOT))),
  ...(part === undefined ? {} : { part }),
});

async function run(artifact: ArtifactBytes): Promise<CheckResult> {
  const profile = createProfileLookup(loadProfile());
  const report = await runRegistry([def], {
    kernels: KERNELS, produced: new Set(["artifact"]), targets: { artifacts: [artifact] }, views: {},
    ctx: { profile, machine: "ffc5p", whitelist: new Map() },
  });
  expect(report.results).toHaveLength(1);
  expect(profile.reads().map((r) => `${r.table}/${r.id}`)).toEqual(["constant/3mf.interlockingBeamWidth", "constant/3mf.interlockingDepth"]);
  return report.results[0]!;
}

/** Part IR stand-in with the flex-pair's bodies and roles, for the record cross-check. */
function partOf(extra: readonly { id: string; role: Part["bodies"][number]["role"] }[] = []): Part {
  const bodies = [
    { id: "pad", role: "body" }, { id: "cone1", role: "flex" }, { id: CAP, role: "flex-conductor" }, { id: "top1", role: "flex" },
    ...CONDUCTORS.map((id) => ({ id, role: "conductor" })), ...extra,
  ];
  return { id: "pad", bodies, bodyAdjacency: [{ a: "pad", b: "conductor.gnd", areaMm2: 1 }, { a: "cone1", b: CAP, areaMm2: 1 }] } as unknown as Part;
}

describe("CHK-3MF-08 on the flex-pair fixtures", () => {
  test("the conductor bodies come from build.ts", () => {
    expect(CONDUCTORS).toEqual(["conductor.gnd", "conductor.key1col", "conductor.gnd1col", "conductor.key1", "conductor.gnd1stub"]);
    expect([WIDTH, DEPTH]).toEqual([0.8, 2]);
  });

  test("pass.3mf: the export carries the overrides and passes", async () => {
    const r = await run(fixture("pass"));
    expect([r.verdict, r.measured, r.severity, r.version]).toEqual(["pass", true, "block", "1.0.0"]);
    expect(r.constraint).toBe("interlocking_beam off on every object that holds or touches a conductor: flex-pair");
    expect(r.extra).toEqual({ objects: 1, failing: 0 });
  });

  test("fail-project-beam.3mf: the object inherits beams from the project; the loss is depth x width against 1.2 to 1.4 mm conductors", async () => {
    const r = await run(fixture("fail-project-beam"));
    expect(r.verdict).toBe("fail");
    expect(r.constraint).toContain("flex-pair (from the project; holding ");
    for (const b of [CAP, ...CONDUCTORS]) expect(r.constraint).toContain(b);
    // 2 cells x 0.8 mm, one cell taken as one beam width (inferred upper bound)
    expect(r.extra?.["lossMm"]).toBeCloseTo(DEPTH * WIDTH, 9);
    expect(r.constraint).toContain(`beams cut up to ${DEPTH * WIDTH} mm per shared side`);
    expect(r.constraint).toContain("inferred upper bound");
    // p.w 1.4 mm traces (chase default) and the 1.2 mm column halves
    expect([r.extra?.["widthMinMm"], r.extra?.["widthMaxMm"]]).toEqual([1.2, 1.4]);
    expect(r.constraint).toMatch(/set interlocking_beam 0 on each object$/);
  });

  test("fail-object-beam.3mf: the object itself turns beams on; the fail names flex-pair and conductor.key1", async () => {
    const r = await run(fixture("fail-object-beam"));
    expect(r.verdict).toBe("fail");
    expect(String(r.extra?.["first"])).toMatch(/^flex-pair \(from the object; holding .*conductor\.key1[,;]/);
    expect(r.extra?.["failing"]).toBe(1);
  });

  test("with the build's Part IR at hand, a record that misses a beam-free body fails", async () => {
    expect((await run(fixture("pass", partOf()))).verdict).toBe("pass");
    const r = await run(fixture("pass", partOf([{ id: "conductor.extra", role: "conductor" }])));
    expect(r.verdict).toBe("fail");
    expect(r.constraint).toMatch(/^the conductor record misses 1 Part IR bodies .*conductor\.extra/);
  });

  test("a package with no conductor record skips alone, and passes against a Part IR with no conductor", async () => {
    const tetra = new Uint8Array(readFileSync(new URL("packages/checks/test/fixtures/CHK-3MF-01/pass.3mf", ROOT)));
    const bare: ArtifactBytes = { exporter: "3mf", name: "tetra.3mf", bytes: tetra };
    const alone = await run(bare);
    expect([alone.verdict, alone.constraint]).toEqual(["skip", "not run: Metadata/hackbuild_chase.json carries no conductor record; check.run on the build reads body roles from Part IR"]);
    const none = await run({ ...bare, part: { id: "tetra", bodies: [{ id: "left", role: "body" }] } as unknown as Part });
    expect(none.verdict).toBe("pass");
    const missing = await run({ ...bare, part: partOf() });
    expect(missing.verdict).toBe("fail");
  });

  test("the validator mirror gives the run body's verdict and message on each fixture", async () => {
    const defaults = interlockingDefaults(createProfileLookup(loadProfile()));
    for (const name of ["pass", "fail-project-beam", "fail-object-beam"]) {
      const art = fixture(name);
      const mirror = validateEntries(await readEntries(art.bytes), { mode: "export", interlocking: defaults }).results.find((x) => x.id === "CHK-3MF-08")!;
      const body = await run(art);
      expect([mirror.verdict, mirror.constraint, mirror.extra], name).toEqual([body.verdict, body.constraint, body.extra]);
    }
  });
});
