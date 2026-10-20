// M04-T01 steps 8 and 9: every check the skip rule runs on the M04 kernel
// set has a passing and a failing fixture under fixtures/<id>/, and through
// the registry it passes the one and fails the other. Every result carries
// measured, a legal of the seed's kind (or none on a skip), a constraint
// and its origin uri. A warn-severity check may report its failure as
// warn. The fixtures are committed data (make-json.mjs, make-3mf.mjs); the
// set of checks is derived from the seed and the rule, never listed here.
// A NaN measured value is E_PARAM_MISSING, never a fail: the FEELER
// encoder fit fixture.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { isThrownCommandError, type CheckLevel, type CheckResult, type KernelId } from "@hackbuild/spec";
import { DEFAULT_TEMPLATE } from "@hackbuild/3mf";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { CHECK_MODULES, CLAIM_CHECKS, IMPORT_PATH_CHECKS, registerChecks, runRegistry, skipReason } from "../src/index";
import { loadFixture } from "./fixture-load";

const seed = JSON.parse(readFileSync(new URL("../seed/checks.seed.json", import.meta.url), "utf8")) as unknown;
const defs = registerChecks({ seed, filamentTemplate: DEFAULT_TEMPLATE }, CHECK_MODULES);
const KERNELS = new Set<KernelId>(["geom", "mesh", "profile", "3mf", "sim", "inlay"]);
const TARGETS = new Set<CheckLevel>(["part", "body", "feature", "assembly", "artifact", "source", "project"]);
// The import path checks read pieces Part IR never carries; their fixtures feed
// prt18Finding and prt19Finding in prt18-19.test.ts. The claim check reads chase
// claims no Part IR fixture carries; claims.test.ts feeds them.
const runnable = defs.filter((d) => skipReason({ needs: d.needs, target: d.appliesTo.level, pending: d.pending ?? null }, KERNELS, TARGETS) === null && !IMPORT_PATH_CHECKS.includes(d.id) && !CLAIM_CHECKS.includes(d.id));
const profile = createProfileLookup(loadProfile());

async function run(id: string, which: string): Promise<readonly CheckResult[]> {
  const def = defs.find((d) => d.id === id)!;
  const fx = loadFixture(id, which);
  const report = await runRegistry([def], {
    kernels: KERNELS, produced: TARGETS, targets: fx.targets, views: fx.views,
    ctx: { profile, machine: "ffc5p", whitelist: new Map(), ...(fx.sim === undefined ? {} : { sim: fx.sim }) },
  });
  return report.results;
}

function contract(id: string, rs: readonly CheckResult[]): void {
  const kind = defs.find((d) => d.id === id)!.legalKind;
  for (const r of rs) {
    expect(r.id).toBe(id);
    expect((r as { measured?: unknown }).measured, `${id} measured`).not.toBeUndefined();
    expect(r.verdict === "skip" ? ["none", kind] : [kind], `${id} legal kind`).toContain(r.legal.kind);
    expect(r.constraint.trim(), `${id} constraint`).not.toBe("");
    expect(r.origin).toBe(`hbf://check/${id}`);
  }
}

const has = (id: string, which: string): boolean =>
  existsSync(new URL(`./fixtures/${id}/${which}.json`, import.meta.url)) || existsSync(new URL(`./fixtures/${id}/${which}.3mf`, import.meta.url));

/**
 * The fail fixtures of a check: `fail`, or one `fail-<case>` per named
 * failure when a card names several (CHK-3MF-08: fail-project-beam and
 * fail-object-beam, M05-T20). A JSON case declaring an expected error is
 * not a fail fixture.
 */
function failCases(id: string): string[] {
  const dir = new URL(`./fixtures/${id}/`, import.meta.url);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((n) => {
    const m = /^(fail(?:-[a-z0-9-]+)?)\.(json|3mf)$/.exec(n);
    if (m === null) return [];
    if (m[2] === "json" && (JSON.parse(readFileSync(new URL(n, dir), "utf8")) as { expect?: unknown }).expect !== undefined) return [];
    return [m[1]!];
  }).sort();
}

/**
 * Runnable checks with no failing fixture, each with the reason no input
 * reaches a fail; the test below fails if one gains a fail fixture or
 * another loses one, so this list only shrinks. CHK-INL-04's run body
 * rebuilds the generator's split from the declaration and compares it with
 * an independent mirror, so no Part IR input can fail it: the emitted masks
 * are not in the Part IR (card defect M04-T01).
 */
const NO_FAIL_FIXTURE: Readonly<Record<string, string>> = {
  "CHK-INL-04": "the run body recomputes the emitted split from the declaration; Part IR carries no mask a fixture could corrupt",
};

const line = (rs: readonly CheckResult[]): string => rs.map((r) => `${r.verdict} ${JSON.stringify(r.measured)}`).join("; ");

describe("conformance of the runnable checks", () => {
  test("the rule leaves the card's 58 checks runnable, each with both fixtures", () => {
    console.info(`runnable ${runnable.length}`);
    expect(runnable.filter((d) => !has(d.id, "pass")).map((d) => d.id)).toEqual([]);
    const noFail = runnable.filter((d) => failCases(d.id).length === 0).map((d) => d.id);
    for (const id of noFail) console.info(`${id} has no fail fixture: ${NO_FAIL_FIXTURE[id] ?? "no reason recorded"}`);
    expect(noFail).toEqual(Object.keys(NO_FAIL_FIXTURE));
  });

  for (const d of runnable) {
    test(`${d.id} passes its pass fixture and fails its fail fixture`, async () => {
      const pass = await run(d.id, "pass");
      contract(d.id, pass);
      expect(pass.some((r) => r.verdict === "pass"), `${d.id} pass: ${line(pass)}`).toBe(true);
      expect(pass.filter((r) => r.verdict === "fail" || r.verdict === "warn"), `${d.id} pass: ${line(pass)}`).toEqual([]);
      if (NO_FAIL_FIXTURE[d.id] !== undefined) {
        console.info(`${d.id} pass: ${line(pass)} | fail: not run, ${NO_FAIL_FIXTURE[d.id]}`);
        return;
      }
      const bad = d.severity === "warn" ? ["fail", "warn"] : ["fail"];
      for (const which of failCases(d.id)) {
        const fail = await run(d.id, which);
        contract(d.id, fail);
        console.info(`${d.id} pass: ${line(pass)} | ${which}: ${line(fail)}`);
        expect(fail.some((r) => bad.includes(r.verdict)), `${d.id} ${which}: ${line(fail)}`).toBe(true);
      }
    }, 60_000);
  }

  test("a NaN measured value is E_PARAM_MISSING with the pointer, never a fail (FEELER encoder fit)", async () => {
    const fx = loadFixture("CHK-FIT-01", "missing");
    let err: unknown;
    try {
      await run("CHK-FIT-01", "missing");
    } catch (e) {
      err = e;
    }
    expect(isThrownCommandError(err)).toBe(true);
    expect((err as { hbf: { code: string; path: string } }).hbf).toMatchObject({ code: fx.expect!.error, path: fx.expect!.path });
  });
});
