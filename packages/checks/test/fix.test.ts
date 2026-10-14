// M04-T04 step 3: a failing finding driven by one param gets a fix whose
// predicted verdict comes from a rebuild; applying the fix and rebuilding
// gives the predicted measured value and verdict. Each fixture under
// fixtures/<id>/<case>/ builds Part IR from param values, the registry runs
// the check, proposeFix predicts by rebuilding, and the test then applies
// the fix through a separate rebuild. The goldens are the committed
// expected.json beside each fixture (the card's step 5 table).

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  canonicalize, sha256Hex, type CheckLevel, type CheckResult, type CheckTarget, type Finding, type KernelId, type Verdict,
} from "@hackbuild/spec";
import { DEFAULT_TEMPLATE } from "@hackbuild/3mf";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { createRegistry, solve } from "@hackbuild/constraints";
import { SPRING_Q, clickRules, clickSpringWindow, feRun } from "@hackbuild/sim";
import {
  CHECK_MODULES, drivenPointers, proposeFix, registerChecks, runRegistry, targetsFor, type FixInput,
} from "../src/index";
import { loadFixtureJson, type FixFixture } from "./fixture-load";
import { fixture as key01 } from "./fixtures/CHK-KEY-01/fix-gap-2.15/fixture";
import { fixture as key04 } from "./fixtures/CHK-KEY-04/fix-q-2.40/fixture";
import { fixture as prt04 } from "./fixtures/CHK-PRT-04/fix-wall-1.05/fixture";
import { fixture as prt09 } from "./fixtures/CHK-PRT-09/no-fix/fixture";

const seed = JSON.parse(readFileSync(new URL("../seed/checks.seed.json", import.meta.url), "utf8")) as unknown;
const defs = registerChecks({ seed, filamentTemplate: DEFAULT_TEMPLATE }, CHECK_MODULES);
const KERNELS = new Set<KernelId>(["geom", "mesh", "profile", "3mf", "sim", "inlay"]);
const TARGETS = new Set<CheckLevel>(["part", "body", "feature", "assembly", "artifact", "source", "project"]);
const profile = createProfileLookup(loadProfile());
const CONSTRAINTS = [clickSpringWindow];

const golden = <T>(rel: string): T => JSON.parse(readFileSync(new URL(`./fixtures/${rel}/expected.json`, import.meta.url), "utf8")) as T;
const FIXTURES: Readonly<Record<string, FixFixture>> = {
  "CHK-KEY-04/fix-q-2.40": key04, "CHK-KEY-01/fix-gap-2.15": key01, "CHK-PRT-04/fix-wall-1.05": prt04, "CHK-PRT-09/no-fix": prt09,
};
const fixtureOf = (rel: string): FixFixture => FIXTURES[rel]!;

/** The build hash of a fixture build: its check and values, canonical (core hashes BuildInputs the same way). */
const hashOf = (fx: FixFixture, values: Readonly<Record<string, unknown>>): string => sha256Hex(canonicalize({ check: fx.check, values }));

interface Built {
  readonly results: readonly CheckResult[];
  readonly targets: readonly unknown[];
  readonly buildHash: string;
}

/** Build the fixture at these values and run its check through the registry. */
async function buildAndRun(fx: FixFixture, values: Readonly<Record<string, unknown>>): Promise<Built> {
  const buildHash = hashOf(fx, values);
  const json = fx.build(values);
  const loaded = loadFixtureJson({ ...json, parts: (json.parts ?? []).map((p) => ({ ...p, buildHash })) }, `${fx.check} ${JSON.stringify(values)}`);
  const def = defs.find((d) => d.id === fx.check)!;
  const report = await runRegistry([def], {
    kernels: KERNELS, produced: TARGETS, targets: loaded.targets, views: loaded.views,
    ctx: { profile, machine: "ffc5p", whitelist: new Map() },
  });
  return { results: report.results, targets: targetsFor(def, loaded.targets), buildHash };
}

/** The solver's interval for spring.Q on the fixture's spring, the facts CHK-KEY-04 queries with. */
function springLegal(built: Built): readonly [number | null, number | null] | null {
  const t = built.targets[0] as { part: { machine: string; bodies: { material: string }[] }; feature: Record<string, number | string> };
  const f = t.feature;
  const q = solve(createRegistry(CONSTRAINTS), SPRING_Q, {
    profile, machine: t.part.machine, material: t.part.bodies[0]!.material,
    facts: { l: f["l"]!, t: f["t"]!, w: f["w"]!, sw: f["sw"]!, bend: f["bend"]! },
  });
  return q.interval.legal;
}

/** Run proposeFix on the fixture's one failing result. */
async function fixOf(rel: string) {
  const fx = fixtureOf(rel);
  const first = await buildAndRun(fx, fx.values);
  const def = defs.find((d) => d.id === fx.check)!;
  const failing = first.results.filter((r) => r.verdict === "fail" || r.verdict === "warn");
  expect(failing.length, `${rel} fails once`).toBe(1);
  const result = failing[0]!;
  const driven = drivenPointers(def, first.targets[0] as CheckTarget, { params: fx.params, values: fx.values, constraints: CONSTRAINTS });
  const predicted: { values: Readonly<Record<string, unknown>>; verdict: Verdict }[] = [];
  const input: FixInput = {
    pointers: driven.pointers, dims: driven.dims, params: fx.params, values: fx.values, measuresParam: fx.measuresParam,
    ...(fx.check === "CHK-KEY-04" ? { paramLegal: () => springLegal(first) } : {}),
    predict: async (values) => {
      const again = await buildAndRun(fx, values);
      const r = again.results.find((x) => JSON.stringify(x.target) === JSON.stringify(result.target));
      if (r !== undefined) predicted.push({ values, verdict: r.verdict });
      return r === undefined ? undefined : { finding: r, buildHash: again.buildHash };
    },
    chase: `packages/checks/test/fixtures/${rel}`,
  };
  const out = await proposeFix(result as unknown as Finding, input);
  return { fx, first, result, driven, out, predicted };
}

/** Apply a fix by rebuilding with it set, independent of the prediction run. */
async function applied(fx: FixFixture, pointer: string, set: number): Promise<CheckResult> {
  const segs = pointer.split("/").slice(1);
  const values = JSON.parse(JSON.stringify(fx.values)) as Record<string, unknown>;
  let at: Record<string, unknown> = values;
  for (const s of segs.slice(0, -1)) at = at[s] as Record<string, unknown>;
  at[segs[segs.length - 1]!] = set;
  const built = await buildAndRun(fx, values);
  expect(built.results.length).toBe(1);
  return built.results[0]!;
}

interface Golden {
  measured: number;
  legal?: [number, number];
  fix: { param: string; set: number; paramLegal: [number, number] } | null;
  predicts?: { measured: number; verdict: Verdict };
}

describe("CHK-KEY-04 on the click spring at Q 2.40", async () => {
  const g = golden<Golden & { predicts: { strainLimitPct: number; drop: number } }>("CHK-KEY-04/fix-q-2.40");
  const { fx, result, driven, out } = await fixOf("CHK-KEY-04/fix-q-2.40");

  test("the pointer comes from byConstraintDim: /Q declares spring.Q, the dim of sim/click-spring-window", () => {
    expect(driven).toEqual({ pointers: [g.fix!.param], dims: [SPRING_Q], from: "dim" });
  });

  test(`measured ${g.measured}, legal ${g.legal![0]} to ${g.legal![1]}, fix set ${g.fix!.param} = ${g.fix!.set}, predicts pass`, () => {
    expect(result.measured).toBe(g.measured);
    expect(result.legal).toMatchObject({ kind: "interval", lo: g.legal![0], hi: g.legal![1] });
    expect(out.finding.fix).toEqual({ param: g.fix!.param, set: g.fix!.set, paramLegal: g.fix!.paramLegal, predicts: { measured: g.predicts.measured, verdict: g.predicts.verdict } });
    expect(out.next).toEqual([]);
  });

  test(`the predicted beam: strain at the stop within ${g.predicts.strainLimitPct} percent and drop ${g.predicts.drop} (snapfe, computed)`, () => {
    const r = feRun({ l: 24, t: 0.55, w: 1.6, E: profile.material("petg").modulusMPa!, sw: 3, Q: g.fix!.set }, clickRules(profile));
    expect(r.ok).toBe(true);
    expect(profile.strain("petg", "click", "inPlane").pct).toBe(g.predicts.strainLimitPct);
    expect(r.eStopPct).toBeLessThanOrEqual(g.predicts.strainLimitPct);
    expect(Number(r.drop.toFixed(2))).toBe(g.predicts.drop);
    expect(r.drop).toBeGreaterThanOrEqual(profile.constant("click.dropMin").value);
  });

  test("applying the fix and rebuilding gives the predicted measured value and verdict, at the predicted build", async () => {
    const after = await applied(fx, g.fix!.param, g.fix!.set);
    expect([after.measured, after.verdict]).toEqual([out.finding.fix!.predicts.measured, out.finding.fix!.predicts.verdict]);
    expect(out.finding.extra?.["predictedBuild"]).toBe(hashOf(fx, { ...fx.values, Q: g.fix!.set }));
  });
});

describe("CHK-KEY-01 on BOSS's cone button, gap 2.15 on 3.20", async () => {
  const g = golden<Golden & { nearest: number; predicts: { percentOfCone: number } }>("CHK-KEY-01/fix-gap-2.15");
  const { fx, result, driven, out } = await fixOf("CHK-KEY-01/fix-gap-2.15");

  test("the pointer is the one build.ts bound to the contact gap", () => {
    expect(driven).toMatchObject({ pointers: [g.fix!.param], from: "module" });
  });

  test(`legal ${g.legal![0]} to ${g.legal![1]}, nearest ${g.nearest}, fix ${g.fix!.param} = ${g.fix!.set} (D-064)`, () => {
    expect(result.measured).toBe(g.measured);
    if (result.legal.kind !== "interval") throw new Error("interval expected");
    expect(result.legal.lo).toBeCloseTo(g.legal![0], 9);
    expect(result.legal.hi).toBeCloseTo(g.legal![1], 9);
    expect(out.finding.legal).toMatchObject({ nearest: g.nearest });
    expect(out.finding.fix).toEqual({ param: g.fix!.param, set: g.fix!.set, paramLegal: g.fix!.paramLegal, predicts: { measured: g.predicts!.measured, verdict: g.predicts!.verdict } });
  });

  test(`applying the fix gives ${g.predicts.percentOfCone} percent of the cone and pass`, async () => {
    const after = await applied(fx, g.fix!.param, g.fix!.set);
    expect([after.measured, after.verdict]).toEqual([out.finding.fix!.predicts.measured, out.finding.fix!.predicts.verdict]);
    expect(after.extra?.["percentOfCone"]).toBe(g.predicts.percentOfCone);
    expect(out.finding.extra?.["predictedBuild"]).toBe(hashOf(fx, { keys: [{ gap: g.fix!.set }] }));
  });
});

describe("CHK-PRT-04: wall 1.05 on a 0.42 line, a tie", async () => {
  const g = golden<Golden & { nearest: [number, number]; below: { set: number; verdict: Verdict } }>("CHK-PRT-04/fix-wall-1.05");
  const { fx, result, driven, out, predicted } = await fixOf("CHK-PRT-04/fix-wall-1.05");

  test("the pointer comes from the wall metric the check gates", () => {
    expect(driven).toMatchObject({ pointers: [g.fix!.param], from: "metric" });
  });

  test(`both neighbours ${g.nearest.join(" and ")} pass, so the larger, ${g.fix!.set}, is set`, async () => {
    expect(result.measured).toBeCloseTo(g.measured, 9);
    expect(result.legal).toMatchObject({ kind: "multipleOf", base: 0.42 });
    expect(out.finding.fix).toEqual({ param: g.fix!.param, set: g.fix!.set, paramLegal: g.fix!.paramLegal, predicts: { measured: expect.closeTo(g.predicts!.measured, 9), verdict: g.predicts!.verdict } });
    expect(predicted.map((p) => p.values["wall"])).toEqual([g.fix!.set]);
    const below = await applied(fx, g.fix!.param, g.below.set);
    expect(below.verdict).toBe(g.below.verdict);
  });

  test("on a tie where the larger fails, the neighbour that passes is set", async () => {
    const stub = await proposeFix(result as unknown as Finding, {
      pointers: [g.fix!.param], dims: [], params: fx.params, values: fx.values, measuresParam: true,
      predict: async (v) => ({ finding: { measured: v["wall"] as number, verdict: v["wall"] === g.fix!.set ? "fail" : "pass" }, buildHash: String(v["wall"]) }),
    });
    expect(stub.finding.fix).toMatchObject({ set: g.below.set, predicts: { verdict: "pass" } });
    expect(stub.finding.extra?.["predictedBuild"]).toBe(String(g.below.set));
  });

  test("applying the fix and rebuilding gives the predicted measured value and verdict", async () => {
    const after = await applied(fx, g.fix!.param, g.fix!.set);
    expect(after.measured).toBeCloseTo(out.finding.fix!.predicts.measured as number, 9);
    expect(after.verdict).toBe(out.finding.fix!.predicts.verdict);
  });
});

describe("CHK-PRT-09: a span driven by two params", async () => {
  const g = golden<Golden & { next: { command: string; pointers: string[] }[] }>("CHK-PRT-09/no-fix");
  const { result, driven, out, predicted } = await fixOf("CHK-PRT-09/no-fix");

  test(`span ${g.measured} over ${g.legal![1]}: no fix, no rebuild, one next naming constraints.query`, () => {
    expect(result.measured).toBeCloseTo(g.measured, 1);
    expect(driven.pointers).toEqual(g.next[0]!.pointers);
    expect(out.finding.fix).toBeUndefined();
    expect(predicted).toEqual([]);
    expect(out.next.map((n) => [n.command, (n.args as { pointers?: string[] }).pointers])).toEqual(g.next.map((n) => [n.command, n.pointers]));
  });
});

describe("no fix without a single driving param", () => {
  const f: Finding = {
    verdict: "fail", target: { level: "part", part: "p" }, measured: 2, constraint: "c",
    legal: { kind: "interval", lo: 0, hi: 1, unit: "mm", nearest: 1 },
  };
  const base = { dims: [], params: [], values: {}, measuresParam: true, predict: async () => undefined };

  test("no pointer and no dim: no fix and no next; a dim alone: next in dim form", async () => {
    expect(await proposeFix(f, { ...base, pointers: [] })).toEqual({ finding: f, next: [] });
    const out = await proposeFix(f, { ...base, pointers: [], dims: ["spring.Q"] });
    expect(out.next.map((n) => [n.command, n.args])).toEqual([["constraints.query", { dim: "spring.Q" }]]);
  });

  test("a passing finding is returned unchanged", async () => {
    const pass: Finding = { ...f, verdict: "pass", measured: 0.5 };
    expect(await proposeFix(pass, { ...base, pointers: ["/a"] })).toEqual({ finding: pass, next: [] });
  });
});
