// M01-T05 step 4: every number constraints.query prints traces to a
// computation (D-010). The checker parses every number out of the text
// mirror and out of the strings in the result JSON and asks where it came
// from, recomputing independently of what the command printed:
//   a bound line's value      the bound its def returns when the test reruns it,
//                             at printed precision, floors up, ceilings down
//   the status line's legal   the max of the rerun floors and min of the rerun ceilings
//   a number in a reason      a fact the query passed, or a number the def read
//                             from the profile while the test watched, or the bound
//   E_UNSAT expected          its first number is inverted: that fact value fits
//                             and one printed digit less (at least) does not
//   got, next                 the facts
// A number with no source is a failure. The cases are the fixture queries
// below and every query golden a reference declares in queries.json
// (`{"queries": [{"golden": "expected/query-1.json", "input": {...}}]}`),
// read from disk.

// M04-T05 extends the same rule from queries to check findings. Every
// check fixture under packages/checks/test/fixtures/<id>/ runs through the
// registry, and check.run runs on every reference under reference/; the
// text mirror and the JSON string fields are parsed for numbers. A number
// in the measured, legal, fix or param line traces to a numeric field of
// its CheckResult (measured, legal bounds and nearest, fix.set,
// fix.paramLegal, predicts.measured, extra) or to a named derivation in
// core/src/text/fmt.ts applied to two of them. A number in the constraint
// (the because line, and the JSON string fields) may also trace to an
// input of the run, as M01-T05 admitted facts and profile reads: a profile
// value the check read while the test watched, or a declared number in the
// fixture data (meshes excluded). Exempt: the origin line, ids (CHK-PRT-04,
// D-068, U+2012, #FE0386, a cited plan step or section), versions, and
// exponents in a formula (L^4).
// Recompute: each finding is rebuilt from its inputs by a second run and
// renders to the same text; a reference's findings render as its
// committed expected/report.json does. Numbers a check module types by
// hand are listed in TYPED_IN_CHECKS, which only shrinks.
// check.run over every reference runs in the message-numbers.shard-<i>-of-<n>
// files through support/message-numbers.ts, with one build per reference
// per run read from the run's build store (R1-speed-01); this file keeps
// the queries, the check fixtures, the fix case, circuit.solve and the
// ledger.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, test, vi } from "vitest";
import {
  qualify, type Bound, type CheckLevel, type CheckResult, type CommandInput, type CommandResult, type ConstraintCtx, type ConstraintDef,
  type Interval, type KernelId, type ProfileLookup,
} from "@hackbuild/spec";
import { createRegistry, solve, type ConstraintRegistry } from "@hackbuild/constraints";
import { createProfileLookup } from "@hackbuild/profile";
import { DEFAULT_MACHINE, constraintRegistry, runConstraintsQuery } from "../src/commands/constraints-query.js";
import { finish } from "../src/result.js";
import { hashOf } from "../src/jcs.js";
import { fullProfile } from "../src/load-build.js";
import type { CoreCtx } from "../src/ctx.js";
import { renderFinding, renderResult } from "../src/text.js";
import { buildPart, loadDesign, resolveParams, runChecks } from "../src/commands/build.js";
import { solveBuilt, type CircuitSolveOutput } from "../src/commands/circuit-solve.js";
import { DEFAULT_TEMPLATE } from "@hackbuild/3mf";
import { CHECK_MODULES, IMPORT_PATH_CHECKS, KERNEL_LANDS, MILESTONE_IDS, TARGET_LANDS, registerChecks, runRegistry, CHECK_LEVELS } from "@hackbuild/checks";
import { loadFixture } from "../../packages/checks/test/fixture-load.js";
import { W, budgetFloor, capCeiling, fixtureRegistry, rowFloor } from "./fixtures/query-defs.js";
import { ROOT, hbf, json } from "./hbf.js";
import {
  TYPED_IN_CHECKS, cardDecimals, decimals, describeUntraced, isTyped, numbersIn, numbersOf, printedIn, prints, traceFinding, tracesTo,
  type Untraced,
} from "./support/message-numbers.js";
import { profileSeen } from "./support/profile-watch.js";

/**
 * Every number any ProfileLookup method returns while a check runs, so a
 * constraint may print a profile value the check read. Module-wide: core and
 * packages/checks build their lookups from this module.
 */
vi.mock("@hackbuild/profile", async (importOriginal) => (await import("./support/profile-watch.js")).watchProfile(await importOriginal()));

type Input = CommandInput<"constraints.query">;
type Result = CommandResult<Interval>;

// ---- recomputation ----

/** A profile lookup that records every number any call returned. */
function watched(profile: ProfileLookup): { readonly profile: ProfileLookup; readonly seen: number[] } {
  const seen: number[] = [];
  const p = new Proxy(profile, {
    get(t, k, r) {
      const v = Reflect.get(t, k, r) as unknown;
      if (typeof v !== "function") return v;
      return (...args: unknown[]) => {
        const out = (v as (...a: unknown[]) => unknown).apply(t, args);
        numbersOf(out, seen);
        return out;
      };
    },
  });
  return { profile: p, seen };
}

interface Rerun {
  readonly bound: Bound;
  readonly def: ConstraintDef;
  /** Facts, the profile numbers this def read, and its own bound values. */
  readonly sources: readonly number[];
}

/** Rerun every def on the dim with a watched profile; each bound with its def and sources. */
function rerun(reg: ConstraintRegistry, input: Input): Rerun[] {
  const facts = input.facts ?? {};
  const out: Rerun[] = [];
  for (const def of reg.defsFor(input.dim!)) {
    const w = watched(createProfileLookup(fullProfile()));
    const ctx: ConstraintCtx = { profile: w.profile, machine: input.machine ?? DEFAULT_MACHINE, material: input.material!, facts };
    const bounds = def.bounds(input.dim!, ctx);
    const sources = [...numbersOf(facts), ...w.seen, ...bounds.map((b) => b.value)];
    for (const bound of bounds) out.push({ bound, def, sources });
  }
  return out;
}

/** The rerun bound a printed bound came from: same side, kernel and reason, value equal. */
function originOf(b: Bound, runs: readonly Rerun[]): Rerun | undefined {
  return runs.find((r) => r.bound.side === b.side && r.bound.kernel === b.kernel && r.bound.reason === b.reason && r.bound.value === b.value);
}

/** Problems with the numbers of one case; empty when every number traces. */
export function traceNumbers(reg: ConstraintRegistry, input: Input, r: Result): string[] {
  const problems: string[] = [];
  const iv = r.result!;
  const runs = rerun(reg, input);
  const facts = numbersOf(input.facts ?? {});
  const step = reg.stepOf(iv.dim);
  const floors = runs.filter((x) => x.bound.side === "lo").map((x) => x.bound.value);
  const ceils = runs.filter((x) => x.bound.side === "hi").map((x) => x.bound.value);
  const snap = (v: number, dir: "up" | "down"): number => (step === undefined ? v : (dir === "up" ? Math.ceil(v / step - 1e-9) : Math.floor(v / step + 1e-9)) * step);
  const floor = floors.length === 0 ? null : snap(Math.max(...floors), "up");
  const ceil = ceils.length === 0 ? null : snap(Math.min(...ceils), "down");

  const origin = (b: Bound, where: string): Rerun | undefined => {
    const o = originOf(b, runs);
    if (o === undefined) problems.push(`${where}: bound "${b.reason}" ${b.value} is not what any def returns on rerun`);
    return o;
  };
  const reasonNumbers = (s: string, sources: readonly number[], where: string): void => {
    for (const p of numbersIn(s)) if (!sources.some((v) => prints(p, v))) problems.push(`${where}: ${p} in "${s}" has no source`);
  };
  const bounds = [...iv.lo, ...iv.hi];
  for (const [i, b] of bounds.entries()) {
    const o = origin(b, `bound ${i}`);
    if (o !== undefined) reasonNumbers(b.reason, o.sources, `reason of bound ${i}`);
  }

  const expectedLine = (e: Result["errors"][number], where: string): void => {
    const def = runs.find((x) => x.def.id === e.record);
    const sources = [...(def?.sources ?? facts), ...(ceil === null ? [] : [ceil])];
    if (e.got !== undefined && numbersIn(String(e.got)).some((p) => !facts.some((v) => prints(p, v)))) problems.push(`${where}: got ${String(e.got)} is not a fact`);
    const nums = numbersIn(e.expected ?? "");
    const key = /^\/facts\/(.+)$/.exec(e.path ?? "")?.[1];
    if (key !== undefined && nums.length > 0) {
      const p = nums[0]!;
      const unit = 10 ** -decimals(p);
      const atLeast = /^at least /.test(e.expected!);
      const fits = (v: number): boolean => solve(reg, iv.dim, { ...ctxOf(input), facts: { ...input.facts, [key]: v } }).interval.legal !== null;
      if (!fits(Number(p))) problems.push(`${where}: ${p} in "${e.expected}" does not fit when set as ${key}`);
      if (fits(Number(p) + (atLeast ? -unit : unit))) problems.push(`${where}: ${p} in "${e.expected}" is not the boundary; one printed digit past it fits too`);
      reasonNumbers(nums.slice(1).join(" "), sources, where);
    } else if (e.code === "E_UNSAT" && e.path === undefined) {
      // Solver-worded: the only number is the ceiling, printed as a ceiling at the unit's precision.
      for (const p of nums) {
        if (ceil === null || decimals(p) !== cardDecimals(iv.unit) || !prints(p, ceil, "down")) problems.push(`${where}: ${p} in "${e.expected}" is not the ceiling ${String(ceil)} rounded down at ${cardDecimals(iv.unit)} decimals`);
      }
    } else reasonNumbers(e.expected ?? "", sources, where);
    reasonNumbers(e.hint, [], `${where} hint`);
  };
  for (const [i, e] of r.errors.entries()) expectedLine(e, `error ${i}`);
  for (const n of r.next) reasonNumbers(JSON.stringify(n.args) + " " + n.why, facts, "next");

  // The text mirror, line by line.
  const lines = renderResult("constraints.query", iv.dim, r).split("\n");
  const [status, ...body] = lines;
  const legal = numbersIn(status!.slice(status!.indexOf(" legal ")));
  const ends = iv.legal === null ? [] : ([[iv.legal[0], floor, "up"], [iv.legal[1], ceil, "down"]] as const).filter(([v]) => v !== null);
  if (legal.length !== ends.length) problems.push(`status: ${legal.length} numbers for ${ends.length} legal ends in "${status}"`);
  ends.forEach(([, want, dir], i) => {
    if (legal[i] !== undefined && (want === null || !prints(legal[i]!, want, dir))) problems.push(`status: ${legal[i]} is not the recomputed ${dir === "up" ? "floor" : "ceiling"} ${String(want)}`);
  });
  const binding = [...iv.binding.lo.map((i) => iv.lo[i]!), ...iv.binding.hi.map((i) => iv.hi[i]!)];
  let nb = 0;
  let nbinds = 0;
  const unit = iv.unit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const boundRe = new RegExp(`^(?: {2}|binds )(floor|ceil) +(\\S+) ${unit} {2}(.*) {2}\\[[^\\]]*\\]$`);
  for (const line of body) {
    const m = boundRe.exec(line);
    if (m !== null) {
      const b = line.startsWith("binds") ? binding[nbinds++] : bounds[nb++];
      const o = b === undefined ? undefined : originOf(b, runs);
      if (b === undefined || o === undefined) {
        problems.push(`text: "${line}" names no bound`);
        continue;
      }
      if (!prints(m[2]!, o.bound.value, b.side === "lo" ? "up" : "down")) problems.push(`text: ${m[2]} is not bound ${o.bound.value} at its precision`);
      reasonNumbers(m[3]!, o.sources, "text reason");
      continue;
    }
    if (/^E_[A-Z_]+ {2}/.test(line)) {
      const e = r.errors.find((x) => line.startsWith(`${x.code}  `))!;
      const rest = line.replace(/ {3}expected .*?(?= {3}|$)/, "").replace(/ {3}got \S+/, "").replace(/ {3}record \S+/, "").replace(/ {3}path \S+/, "");
      reasonNumbers(rest, [], "text error line");
      expectedLine(e, "text error");
      continue;
    }
    if (line.startsWith("next  ")) {
      reasonNumbers(line, facts, "text next");
      continue;
    }
    reasonNumbers(line, [], "text");
  }
  return problems;
}

const ctxOf = (input: Input): ConstraintCtx => ({
  profile: createProfileLookup(fullProfile()), machine: input.machine ?? DEFAULT_MACHINE, material: input.material!, facts: input.facts ?? {},
});

async function runQuery(reg: ConstraintRegistry, input: Input): Promise<Result> {
  const ctx = { workspace: ROOT, cwd: ROOT, inputsHash: hashOf(input) } as unknown as CoreCtx;
  return finish(await runConstraintsQuery(input, ctx, reg)) as Result;
}

// ---- the cases ----

const FIXTURE_CASES: readonly { readonly label: string; readonly input: Input }[] = [
  { label: "budget floor binds", input: { dim: W, material: "cpla-protopasta", facts: { lenMm: 62, budgetOhm: 100, capMm: 20 } } },
  { label: "E_UNSAT with a next call", input: { dim: W, material: "cpla-protopasta", facts: { lenMm: 62, budgetOhm: 50, capMm: 20 } } },
  { label: "inferred row, row floor binds", input: { dim: W, material: "cpla", facts: { lenMm: 62, budgetOhm: 8000, capMm: 20 } } },
  // 12.347 prints 12.35 rounded near and 12.34 as a ceiling.
  { label: "no budget, a ceiling that rounds down", input: { dim: W, material: "cpla-protopasta", facts: { lenMm: 62, capMm: 12.347 } } },
  // 30 x 62 / 11 = 169.0909: 169.09 rounded near, 169.10 as a floor.
  { label: "a floor that rounds up, E_UNSAT", input: { dim: W, material: "cpla-protopasta", facts: { lenMm: 62, budgetOhm: 11, capMm: 19.99 } } },
  // No budget: the row floor, which has no expectedFor, binds over 9.8766, so the solver words the E_UNSAT.
  { label: "solver-worded E_UNSAT, a ceiling that rounds down", input: { dim: W, material: "cpla-protopasta", facts: { lenMm: 62, capMm: 9.8766 } } },
];

/** Every reference queries.json entry, by walking reference/; `command` is absent for constraints.query. */
function declaredGoldens(): { readonly ref: string; readonly golden: string; readonly command?: string; readonly input: Input }[] {
  const out: { ref: string; golden: string; command?: string; input: Input }[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir).sort()) {
      const p = path.join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name === "queries.json") {
        const decl = JSON.parse(readFileSync(p, "utf8")) as { queries: { golden: string; command?: string; input: Input }[] };
        for (const q of decl.queries) out.push({ ref: path.relative(ROOT, dir), golden: q.golden, ...(q.command === undefined ? {} : { command: q.command }), input: q.input });
      }
    }
  };
  walk(path.join(ROOT, "reference"));
  return out;
}

/** Every expected/query-*.json under reference/. */
function goldenFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir).sort()) {
      const p = path.join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/^query-.+\.json$/.test(name) && path.basename(dir) === "expected") out.push(path.relative(ROOT, p));
    }
  };
  walk(path.join(ROOT, "reference"));
  return out;
}

describe("message numbers on the fixture queries", () => {
  for (const c of FIXTURE_CASES) {
    test(c.label, async () => {
      const reg = fixtureRegistry();
      const r = await runQuery(reg, c.input);
      expect(r.result?.dim).toBe(W);
      expect(traceNumbers(reg, c.input, r)).toEqual([]);
    });
  }
});

describe("message numbers on every reference query golden", () => {
  const declared = declaredGoldens();

  test("every expected/query-*.json is declared in its reference's queries.json", () => {
    const named = new Set(declared.map((d) => path.join(d.ref, d.golden)));
    expect(goldenFiles().filter((f) => !named.has(f))).toEqual([]);
  });

  // A circuit.solve golden (M05-T07) holds a solve; its numbers are traced in the circuit.solve block below.
  for (const d of declared.filter((x) => x.command === undefined || x.command === "constraints.query")) {
    test(`${d.ref} ${d.golden}`, async () => {
      const file = path.join(ROOT, d.ref, d.golden);
      expect(existsSync(file), `${file} is declared and missing`).toBe(true);
      const golden = JSON.parse(readFileSync(file, "utf8")) as Result;
      expect(golden.inputsHash, "the golden was written from this input").toBe(hashOf(d.input));
      const reg = constraintRegistry();
      expect((await runQuery(reg, d.input)).result).toEqual(golden.result);
      expect(traceNumbers(reg, d.input, golden)).toEqual([]);
    }, 60_000);
  }
});

describe("the checker refuses numbers with no source", () => {
  const input: Input = { dim: W, material: "cpla-protopasta", facts: { lenMm: 62, budgetOhm: 100, capMm: 20 } };

  test("a number typed into a reason", async () => {
    const typed: ConstraintDef = { ...capCeiling, bounds: (d, ctx) => capCeiling.bounds(d, ctx).map((b) => ({ ...b, reason: `${b.reason}, 2 x 7.5 clearance` })) };
    const reg = createRegistry([rowFloor, budgetFloor, typed]);
    const problems = traceNumbers(reg, input, await runQuery(reg, input));
    expect(problems.some((p) => p.includes("7.5"))).toBe(true);
    expect(problems.some((p) => p.includes(" 2 in "))).toBe(true);
  });

  test("a reason that prints its value off by one digit", async () => {
    const off: ConstraintDef = { ...capCeiling, bounds: (d, ctx) => capCeiling.bounds(d, ctx).map((b) => ({ ...b, reason: `cap ${(b.value + 0.01).toFixed(2)} mm` })) };
    const reg = createRegistry([rowFloor, budgetFloor, off]);
    expect(traceNumbers(reg, input, await runQuery(reg, input)).length).toBeGreaterThan(0);
  });

  test("an E_UNSAT expected value that is not the boundary", async () => {
    const loose: ConstraintDef = {
      ...budgetFloor,
      expectedFor: (d, ceiling, ctx) => {
        const e = budgetFloor.expectedFor!(d, ceiling, ctx)!;
        return { ...e, expected: e.expected.replace(/^at least (\d+)/, (_m, n: string) => `at least ${Number(n) + 5}`) };
      },
    };
    const reg = createRegistry([rowFloor, loose, capCeiling]);
    const unsat: Input = { ...input, facts: { lenMm: 62, budgetOhm: 50, capMm: 20 } };
    const problems = traceNumbers(reg, unsat, await runQuery(reg, unsat));
    expect(problems.some((p) => p.includes("is not the boundary"))).toBe(true);
  });

  test("a solver-worded E_UNSAT that prints the raw ceiling", async () => {
    const reg = fixtureRegistry();
    const unsat: Input = { ...input, facts: { lenMm: 62, capMm: 9.8766 } };
    const r = await runQuery(reg, unsat);
    const raw: Result = { ...r, errors: r.errors.map((e) => ({ ...e, expected: "a floor at most 9.8766 mm, the ceiling" })) };
    expect(traceNumbers(reg, unsat, raw).some((p) => p.includes("9.8766"))).toBe(true);
  });

  test("a printed bound value the def does not return", async () => {
    const reg = fixtureRegistry();
    const r = await runQuery(reg, input);
    const iv = r.result!;
    const forged: Result = { ...r, result: { ...iv, hi: iv.hi.map((b) => ({ ...b, value: b.value + 1 })) } };
    expect(traceNumbers(reg, input, forged).length).toBeGreaterThan(0);
  });

  test("a bound qualifier change leaves every number traced; only numbers are checked here", async () => {
    const requal: ConstraintDef = { ...capCeiling, bounds: (d, ctx) => capCeiling.bounds(d, ctx).map((b) => ({ ...b, ...qualify(["vendor"]) })) };
    const reg = createRegistry([rowFloor, budgetFloor, requal]);
    expect(traceNumbers(reg, input, await runQuery(reg, input))).toEqual([]);
  });
});

/** The M04 kernel set and target levels, derived from the skip rule's tables, as conformance runs them. */
const M04 = MILESTONE_IDS.indexOf("M04");
const KERNELS = new Set((Object.entries(KERNEL_LANDS) as [KernelId, string][]).filter(([, m]) => MILESTONE_IDS.indexOf(m as never) <= M04).map(([k]) => k));
const TARGETS = new Set<CheckLevel>(CHECK_LEVELS.filter((l) => TARGET_LANDS[l] === undefined));

const FIXTURES = path.join(ROOT, "packages", "checks", "test", "fixtures");
const checkSeed: unknown = JSON.parse(readFileSync(path.join(ROOT, "packages", "checks", "seed", "checks.seed.json"), "utf8"));
const checkDefs = registerChecks({ seed: checkSeed, filamentTemplate: DEFAULT_TEMPLATE }, CHECK_MODULES);

interface FixtureCase {
  readonly id: string;
  readonly which: string;
  readonly file: string;
}

/** Every <id>/<case>.json or .3mf under the check fixtures; a JSON case that declares an expected error is the E_PARAM_MISSING case conformance runs. */
function fixtureCases(): FixtureCase[] {
  const out: FixtureCase[] = [];
  for (const id of readdirSync(FIXTURES).sort()) {
    const dir = path.join(FIXTURES, id);
    if (!statSync(dir).isDirectory()) continue;
    for (const name of readdirSync(dir).sort()) {
      const m = /^(.+)\.(json|3mf)$/.exec(name);
      if (m === null || !statSync(path.join(dir, name)).isFile()) continue;
      if (m[2] === "json" && (JSON.parse(readFileSync(path.join(dir, name), "utf8")) as { expect?: unknown }).expect !== undefined) continue;
      out.push({ id, which: m[1]!, file: path.join(dir, name) });
    }
  }
  return out;
}

/** Declared numbers of a JSON fixture, meshes and note left out; a 3mf fixture declares none. */
function declaredNumbers(file: string): number[] {
  if (!file.endsWith(".json")) return [];
  const { meshes: _m, note: _n, ...decl } = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
  return numbersOf(decl);
}

/** One registry run of a fixture with its profile reads. */
async function runFixture(c: FixtureCase): Promise<{ readonly results: readonly CheckResult[]; readonly inputs: number[] }> {
  const def = checkDefs.find((d) => d.id === c.id);
  if (def === undefined) throw new Error(`fixtures/${c.id} names no registered check`);
  const fx = loadFixture(c.id, c.which);
  profileSeen.nums.length = 0;
  const report = await runRegistry([def], {
    kernels: KERNELS, produced: TARGETS, targets: fx.targets, views: fx.views,
    ctx: { profile: createProfileLookup(fullProfile()), machine: DEFAULT_MACHINE, whitelist: new Map(), ...(fx.sim === undefined ? {} : { sim: fx.sim }) },
  });
  return { results: report.results, inputs: [...profileSeen.nums, ...declaredNumbers(c.file)] };
}
/** Every untraced number seen across the cases, so the ledger test can compare. */
const seenUntraced: Untraced[] = [];

/** Fixture folders whose check is not registered yet cannot run; they are listed as not run. */
const registered = new Set<string>(checkDefs.map((d) => d.id));

describe("message numbers on every check fixture", () => {
  test("fixture folders with no registered check are reported as not run", () => {
    const notRun = [...new Set(fixtureCases().map((c) => c.id).filter((id) => !registered.has(id)))];
    for (const id of notRun) console.info(`not run: fixtures/${id} names no registered check`);
    expect(notRun.every((id) => /^CHK-[A-Z0-9]+-\d+$/.test(id))).toBe(true);
    // The import path checks' fixtures hold pieces for the finding functions core calls on an import;
    // Part IR carries no pieces, so no registry run reads them.
    const importPath = [...new Set(fixtureCases().map((c) => c.id).filter((id) => IMPORT_PATH_CHECKS.includes(id)))];
    for (const id of importPath) console.info(`not run: fixtures/${id} feeds the import path finding function, not a registry run`);
  });

  for (const c of fixtureCases().filter((x) => registered.has(x.id) && !IMPORT_PATH_CHECKS.includes(x.id))) {
    test(`${c.id}/${path.basename(c.file)}`, async () => {
      const first = await runFixture(c);
      expect(first.results.length, "the fixture gives a result").toBeGreaterThan(0);
      const untraced = first.results.flatMap((r) => traceFinding(r, first.inputs));
      seenUntraced.push(...untraced);
      expect(untraced.filter((u) => !isTyped(u)).map(describeUntraced)).toEqual([]);
      const again = await runFixture(c);
      expect(again.results.map(renderFinding), "recomputed from its inputs").toEqual(first.results.map(renderFinding));
    }, 60_000);
  }
});

describe("message numbers on check.run over every reference", () => {
  test("a finding with a fix: coin-inlay at depth 0.72 fails CHK-INL-03, fix and param lines trace", async () => {
    const at = async (): Promise<{ results: readonly CheckResult[]; inputs: number[] }> => {
      const design = await loadDesign("reference/cosmetic/coin-inlay", ROOT);
      profileSeen.nums.length = 0;
      const built = await buildPart(design, resolveParams(design.chase, { inlay: { depth: 0.72 } }, undefined));
      const checked = await runChecks(built, [], ["CHK-INL-03"]);
      return { results: checked.results, inputs: [...profileSeen.nums, 0.72] };
    };
    const first = await at();
    const fixed = first.results.filter((r) => r.fix !== undefined);
    expect(fixed.length, "the run proposes a fix").toBeGreaterThan(0);
    expect(renderFinding(fixed[0]!)).toMatch(/\n {2}fix {6}set \/depth = 1\.2 /);
    const untraced = first.results.flatMap((r) => traceFinding(r, first.inputs));
    seenUntraced.push(...untraced);
    expect(untraced.filter((u) => !isTyped(u)).map(describeUntraced)).toEqual([]);
    expect((await at()).results.map(renderFinding), "recomputed from its inputs").toEqual(first.results.map(renderFinding));
  }, 120_000);
});

// ---- M05-T06: numbers in circuit.solve ----

/**
 * Untraced numbers of circuit.solve's text mirror: each finding block
 * through traceFinding with the run's profile reads, the status line
 * against the counts, and every result line against the numeric fields of
 * the output the line describes (nets, points, reads, the pin rows used
 * and the engine version), never against the check results or BuildInputs.
 */
function traceSolve(text: string, r: CommandResult<CircuitSolveOutput>, inputs: readonly number[]): Untraced[] {
  const out: Untraced[] = r.findings.flatMap((f) => traceFinding(f as CheckResult, inputs));
  let rest = text;
  for (const f of r.findings as readonly CheckResult[]) {
    const block = renderFinding(f);
    if (!rest.includes(block)) out.push({ check: f.id, line: block.split("\n")[0]!, number: "(block missing from the text)" });
    rest = rest.replace(block, "");
  }
  const res = r.result!;
  const pool = [
    ...numbersOf([res.nets, res.points, res.reads, res.mcus]),
    ...(res.engine.ngspice === undefined ? [] : [Number(res.engine.ngspice)]),
  ];
  const [status, ...lines] = rest.split("\n").filter((l) => l.trim() !== "");
  const counts = Object.values(r.counts);
  for (const { p } of printedIn(status!.replace(/ build \S+/, ""))) if (!counts.includes(Number(p))) out.push({ check: "status", line: status!, number: p });
  for (const line of lines) for (const { p, next } of printedIn(line)) if (!pool.some((v) => tracesTo(p, next, v))) out.push({ check: "circuit.solve", line, number: p });
  return out;
}

describe("message numbers on circuit.solve (M05-T06)", () => {
  const ctx = { workspace: ROOT, cwd: ROOT, inputsHash: "0".repeat(64) } as unknown as CoreCtx;

  test("the flex pair on the CLI: every number in the text and in the JSON strings traces", async () => {
    profileSeen.nums.length = 0;
    const { r } = await json("circuit.solve", "reference/keys/flex-pair");
    const { out: text } = await hbf(["circuit.solve", "reference/keys/flex-pair"]);
    const run = r as unknown as CommandResult<CircuitSolveOutput>;
    const untraced = traceSolve(text, run, [...profileSeen.nums]);
    expect(untraced.map(describeUntraced)).toEqual([]);
    expect(run.result!.lines.length).toBeGreaterThan(2);
  }, 180_000);

  test("a pullup read, internal pull and a 900 kohm resistor: findings, pin lines and the fix trace; a rerun renders the same", async () => {
    const design = await loadDesign("reference/keys/flex-pair", ROOT);
    const base = await buildPart(design, resolveParams(design.chase, undefined, undefined));
    for (const read of [{ model: "pullup", active: "low" }, { model: "pullup", active: "low", externalOhm: 900_000 }] as const) {
      const built = { ...base, design: { ...base.design, chase: { ...base.design.chase, hookup: [{ port: "port.key1", mcu: "rp2040", pin: "GP2", read }] } } };
      const at = async (): Promise<{ r: CommandResult<CircuitSolveOutput>; inputs: number[] }> => {
        profileSeen.nums.length = 0;
        const r = finish(await solveBuilt(built, { build: "reference/keys/flex-pair" }, ctx));
        return { r, inputs: [...profileSeen.nums, ...("externalOhm" in read ? [read.externalOhm] : [])] };
      };
      const first = await at();
      expect(first.r.counts.fail, JSON.stringify(read)).toBe(1);
      const text = renderResult("circuit.solve", "reference/keys/flex-pair", first.r);
      expect(traceSolve(text, first.r, first.inputs).map(describeUntraced)).toEqual([]);
      expect(renderResult("circuit.solve", "reference/keys/flex-pair", (await at()).r), "recomputed from its inputs").toBe(text);
    }
  }, 180_000);

  test("the BLOCKS reproduction on the CLI (M05-T07): every number in the text traces", async () => {
    profileSeen.nums.length = 0;
    const { r } = await json("circuit.solve", "reference/electrical/blocks-pullup-band");
    const { out: text } = await hbf(["circuit.solve", "reference/electrical/blocks-pullup-band"]);
    const run = r as unknown as CommandResult<CircuitSolveOutput>;
    expect(traceSolve(text, run, [...profileSeen.nums]).map(describeUntraced)).toEqual([]);
  }, 180_000);

  test("a read line that prints tau off in its second decimal is named", async () => {
    const { r } = await json("circuit.solve", "reference/keys/flex-pair");
    const run = r as unknown as CommandResult<CircuitSolveOutput>;
    const line = run.result!.lines.find((l) => l.includes("charge-release"))!;
    const forged = line.replace(/tau ([\d.]+) us/, (_, t: string) => `tau ${(Number(t) + 0.01).toFixed(3)} us`);
    const text = renderResult("circuit.solve", "reference/keys/flex-pair", run).replace(line, forged);
    expect(traceSolve(text, run, []).map((u) => u.line)).toContain(forged);
  }, 120_000);
});

describe("numbers typed into check modules", () => {
  test("every TYPED_IN_CHECKS row is still seen; a fixed one leaves the list", () => {
    const seen = new Set(seenUntraced.map((u) => `${u.check} ${u.number}`));
    const stale = Object.entries(TYPED_IN_CHECKS).flatMap(([id, ns]) => ns.map((n) => `${id} ${n}`)).filter((k) => !seen.has(k));
    for (const u of seenUntraced.filter(isTyped)) console.info(`typed by hand: ${describeUntraced(u)}`);
    expect(stale).toEqual([]);
  });
});

describe("the finding checker refuses numbers with no source", () => {
  const base = async (): Promise<CheckResult> => {
    const { results } = await runFixture({ id: "CHK-PRT-09", which: "fail", file: path.join(FIXTURES, "CHK-PRT-09", "fail.json") });
    const r = results.find((x) => x.verdict !== "pass" && x.verdict !== "skip");
    if (r === undefined) throw new Error(`CHK-PRT-09 fail fixture gave ${results.map((x) => x.verdict).join(", ")}`);
    return r;
  };

  test("a planted constraint with a typed 1.20 and no source field names that number", async () => {
    const r = await base();
    const planted = { ...r, constraint: `${r.constraint}; clear 1.20 mm` } as CheckResult;
    const u = traceFinding(planted, []);
    expect(u.map(describeUntraced)).toContain(`CHK-PRT-09: 1.20 in "because  ${planted.constraint}" has no source field`);
    expect(u.some((x) => x.line.startsWith("json ") && x.number === "1.20")).toBe(true);
  });

  test("a waiver reason that quotes measured off by one printed digit", async () => {
    const r = await base();
    const off = (Number(r.measured) + 0.01).toFixed(2);
    const forged = { ...r, waived: { reason: `accepted at ${off} mm` } } as CheckResult;
    expect(traceFinding(forged, []).map((x) => x.number)).toEqual([off]);
  });

  test("a whole number traces only to an equal field, never to one that rounds to it", () => {
    expect(tracesTo("2", "x", 1.84)).toBe(false);
    expect(tracesTo("2", "x", 2)).toBe(true);
    expect(tracesTo("295309", "ohm", 295309.28)).toBe(true);
    expect(tracesTo("1.84", "mm", 1.8367)).toBe(true);
  });

  test("a percent prints only through the named derivation", () => {
    const r = { id: "CHK-KEY-01", verdict: "fail", measured: 2.15, legal: { kind: "interval", lo: 1.28, hi: 1.6, unit: "mm", nearest: 1.6 }, extra: { coneMm: 3.2 }, constraint: "travel 67 percent of cone 3.2", target: { level: "part", part: "p" } } as unknown as CheckResult;
    expect(traceFinding(r, [])).toEqual([]);
    const off = { ...r, constraint: "travel 68 percent of cone 3.2" } as CheckResult;
    expect(traceFinding(off, []).map((u) => u.number)).toEqual(["68", "68"]);
  });

  test("ids, code points, colours, versions and exponents are not numbers", () => {
    expect(printedIn("CHK-PRT-04 D-068 U+2012 #1A1A1A 1.0.1 L^4 ffc5p_20260819 R15 (M00-T09 step 4) section 6.3").map((x) => x.p)).toEqual([]);
    expect(printedIn("clear 1.20 mm over 4 steps").map((x) => x.p)).toEqual(["1.20", "4"]);
  });
});
