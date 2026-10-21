// M07-T11: CHK-MOT-04, -05 and -06 run bodies through the registry, on
// handles the motion kernel opens over the legacy machines: OGEE16 R16
// (params.scad) and STIPPLE R17 and R17b (DATA.P of each page). Expected
// figures come from the legacy records: kin.py's readout in
// packages/motion/records/ogee16-kin.json and the downloads reader's
// designs/stipple/legacy/derived/stipple_latch.json. The failing fixtures
// are physical: STIPPLE with its lug seat raised past the half select
// margin, and a kernel that took the half rise as stroke/2 (the seeded
// form CHK-MOT-05 v2 replaced).

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import type { Assembly, CheckResult, KernelId, MotionHandle, Part, ProjectGraph } from "@hackbuild/spec";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import {
  latchHandle, latchIdentity, ogeeKinematics, ogeeProgram, readScadParams, readStippleParams, stippleKinematics, stippleProgram,
} from "@hackbuild/motion";
import { CHECK_MODULES, registerChecks, runRegistry } from "../src/index";

const ROOT = new URL("../../../", import.meta.url);
const text = (rel: string): string => readFileSync(new URL(rel, ROOT), "utf8");
const profile = createProfileLookup(loadProfile());
const seed = JSON.parse(text("packages/checks/seed/checks.seed.json")) as Parameters<typeof registerChecks>[0]["seed"];
const DEFS = registerChecks({ seed }, CHECK_MODULES).filter((d) => ["CHK-MOT-04", "CHK-MOT-05", "CHK-MOT-06"].includes(d.id));
const KERNELS = new Set<KernelId>(["geom", "mesh", "profile", "motion"]);

const OG = ogeeKinematics(readScadParams(text("packages/motion/inputs/ogee16/params.scad")));
const P17b = readStippleParams(text("packages/motion/inputs/stipple/stipple-r17b-DATA.txt"));
const ST = stippleKinematics(P17b, "stipple-r17b");
const ST17 = stippleKinematics(readStippleParams(text("packages/motion/inputs/stipple/stipple-r17-DATA.txt")), "stipple-r17");
const stipple = JSON.parse(text("packages/motion/inputs/stipple/stipple_latch.json")) as Record<string, { margin: number; LUG_TOT: number }>;

const HANDLES: [string, MotionHandle][] = [
  ["OGEE16 R16", latchHandle(OG.latch, ogeeProgram(OG, "ogee.checker"))],
  ["STIPPLE R17b", latchHandle(ST.latch, stippleProgram(ST, "stipple.checker"))],
  ["STIPPLE R17", latchHandle(ST17.latch, stippleProgram(ST17, "stipple.checker"))],
];

// Stand-ins for core's targets: the checks read only these fields.
const assembly = { id: "latch-field", parts: [], instances: [], bought: [], joints: [], connections: [], assertions: [], metrics: [], warnings: [] } as unknown as Assembly;
const part = { id: "cell", bodies: [], features: [], metrics: [], assertions: [{ type: "identity", mechanism: "displacement-coincidence-latch" }] } as unknown as Part;
const project = {} as unknown as ProjectGraph;

async function run(motion?: MotionHandle): Promise<Record<string, CheckResult>> {
  const report = await runRegistry(DEFS, {
    kernels: KERNELS, produced: new Set(["assembly", "part", "project"]),
    targets: { assemblies: [assembly], parts: [part], project },
    ctx: { profile, machine: "ffc5p", whitelist: new Map(), ...(motion === undefined ? {} : { motion }) },
  });
  return Object.fromEntries(report.results.map((r) => [r.id, r]));
}

describe.each(HANDLES)("%s", (_name, handle) => {
  test("CHK-MOT-04, -05 and -06 pass", async () => {
    const r = await run(handle);
    expect(Object.keys(r).sort()).toEqual(["CHK-MOT-04", "CHK-MOT-05", "CHK-MOT-06"]);
    for (const x of Object.values(r)) expect(x.verdict, `${x.id} ${x.constraint}`).toBe("pass");
    expect(r["CHK-MOT-04"]!.measured).toBe(true);
    expect(r["CHK-MOT-04"]!.extra?.bars).toBe(2 * (handle.machine === "ogee16" ? 4 : 10));
    expect(r["CHK-MOT-06"]!.extra?.schedules).toBe(3);
    expect(r["CHK-MOT-05"]!.legal).toMatchObject({ kind: "interval", lo: -0.001, hi: 0.001, unit: "mm" });
  });
});

test("the identity sides the check reports equal the legacy records (computed)", async () => {
  const og = JSON.parse(text("packages/motion/records/ogee16-kin.json")) as { result: { latchIdentity: { marginPlusOvershoot: number; generalForm: number } } };
  const r16 = (await run(HANDLES[0]![1]))["CHK-MOT-05"]!;
  expect(Math.abs((r16.extra!.lhsMm as number) - og.result.latchIdentity.marginPlusOvershoot)).toBeLessThan(1e-9);
  expect(Math.abs((r16.extra!.rhsMm as number) - og.result.latchIdentity.generalForm)).toBeLessThan(1e-9);
  expect(r16.extra!.mechanism).toBe("displacement-coincidence-latch");
  const r17b = (await run(HANDLES[1]![1]))["CHK-MOT-05"]!;
  expect(Math.abs((r17b.extra!.marginMm as number) - stipple["stipple (1).html"]!.margin)).toBeLessThanOrEqual(5e-5);
});

test("without a motion handle each check reports not run", async () => {
  const r = await run();
  for (const x of Object.values(r)) {
    expect(x.verdict).toBe("skip");
    expect(x.measured).toBe("not run");
    expect(x.constraint).toMatch(/no motion handle/);
  }
});

test("CHK-MOT-04 fails when the lug seat sits past the half select margin: a single row then latches its whole row", async () => {
  const row = stipple["stipple (1).html"]!;
  const raised = stippleKinematics({ ...P17b, Z_LUG0: P17b.Z_LUG0! + row.margin + row.LUG_TOT + 0.1 }, "stipple-r17b-raised");
  const r = (await run(latchHandle(raised.latch, stippleProgram(raised, "stipple.checker"))))["CHK-MOT-04"]!;
  expect(r.verdict).toBe("fail");
  expect(r.measured).toBe(false);
  expect(r.extra?.barsThatLatched).toBe(20);
  expect(r.extra?.firstBar).toBe("zR[0]");
  expect(String(r.extra?.firstCells).split(" ")).toHaveLength(10);
});

test("CHK-MOT-05 fails on R16 when the half rise is taken as stroke/2: the residual is 0.25 mm", async () => {
  const id = latchIdentity(OG.latch);
  const seeded: MotionHandle = { ...HANDLES[0]![1], latchIdentity: () => ({ ...id, halfRiseMm: id.strokeMm / 2, rhsMm: id.strokeMm / 2 - id.camLiftMm - id.lugTotMm }) };
  const r = (await run(seeded))["CHK-MOT-05"]!;
  expect(r.verdict).toBe("fail");
  expect((r.measured as number).toFixed(4)).toBe("0.2515");
});

test("CHK-MOT-06 fails when the end hash moves with the frame schedule", async () => {
  const h = HANDLES[0]![1];
  const frameDecided: MotionHandle = { ...h, schedules: () => h.schedules().map((s, k) => (k === 1 ? { ...s, endHash: "0".repeat(64) as typeof s.endHash } : s)) };
  const r = (await run(frameDecided))["CHK-MOT-06"]!;
  expect(r.verdict).toBe("fail");
  expect(r.extra?.endHashes).toBe(2);
});
