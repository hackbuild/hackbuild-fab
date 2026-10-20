// Every chase in the repository against packages/chase (M10-T02
// acceptance): the declares-only rule passes on each chase.ts, and each
// validates with the registries core assembles, so every exporter, check,
// constraint dim, machine and material it names resolves. The waiver and
// expect rules refuse a check id that resolves to nothing (E_REF, exit 2,
// didYouMean), an empty reason and a waiver on a precondition check
// (E_SCHEMA, exit 2, D-067).

import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { checkDeclares, migrateChase, validateChase } from "@hackbuild/chase";
import { ERROR_TRANSPORT, type Chase, type CommandError } from "@hackbuild/spec";
import { chaseRegistries } from "../src/chase/registries.js";
import { ROOT } from "./hbf.js";

const reg = chaseRegistries(JSON.parse(readFileSync(path.join(ROOT, "packages", "checks", "seed", "checks.seed.json"), "utf8")));

/** reference/<area>/<id>/chase.ts and designs/<id>/chase.ts, listed from disk. */
function chaseFiles(): string[] {
  const out: string[] = [];
  for (const area of readdirSync(path.join(ROOT, "reference"), { withFileTypes: true })) {
    if (!area.isDirectory()) continue;
    for (const id of readdirSync(path.join(ROOT, "reference", area.name), { withFileTypes: true })) {
      const f = path.join("reference", area.name, id.name, "chase.ts");
      if (id.isDirectory() && existsSync(path.join(ROOT, f))) out.push(f);
    }
  }
  for (const id of readdirSync(path.join(ROOT, "designs"), { withFileTypes: true })) {
    const f = path.join("designs", id.name, "chase.ts");
    if (id.isDirectory() && existsSync(path.join(ROOT, f))) out.push(f);
  }
  return out.sort();
}

const files = chaseFiles();

/**
 * Reference ids the registries do not hold today, each stated in its own
 * chase.ts. The validator reports them; this list makes a new one fail and
 * a fixed one fail too, so it cannot drift. M10-T02 records them as
 * findings: pom3 and sheet15 have no profile row (M06-T02 card defects),
 * and no ConstraintDef registers contact.gap (CHK-KEY-01 carries that
 * interval itself).
 */
const KNOWN: Readonly<Record<string, readonly string[]>> = {
  "reference/joints/balance-beam/chase.ts": ["E_REF /materials/0/material sheet15"],
  "reference/keys/flex-pair/chase.ts": ["E_REF /params/1/fields/0/item/3/constraintDim contact.gap"],
};
const POM3 = ["E_REF /materials/0/material pom3"];
const known = (f: string): readonly string[] => KNOWN[f.split(path.sep).join("/")] ?? (readFileSync(path.join(ROOT, f), "utf8").includes('material: "pom3"') ? POM3 : []);

const flexPair = (): Chase => {
  const d = checkDeclares(readFileSync(path.join(ROOT, "reference/keys/flex-pair/chase.ts"), "utf8"), "chase.ts");
  if (!d.ok) throw new Error(d.error.hint);
  return d.chase;
};

describe("every chase in the repository", () => {
  it("lists the chases from disk", () => {
    expect(files).toContain(path.join("reference", "keys", "flex-pair", "chase.ts"));
    expect(files.length).toBeGreaterThan(40);
  });
  it.each(files)("%s declares only and validates against the registries", (f) => {
    const d = checkDeclares(readFileSync(path.join(ROOT, f), "utf8"), f);
    expect(d.ok ? [] : [`${d.line}: ${d.error.hint}`]).toEqual([]);
    if (!d.ok) return;
    expect(validateChase(d.chase, reg).map((e) => `${e.code} ${e.path} ${String(e.got)}`)).toEqual(known(f));
  });
});

/** Errors of a variant of flex-pair beyond the flex-pair's own known ones. */
function added(c: Chase): CommandError[] {
  const base = new Set(validateChase(flexPair(), reg).map((e) => `${e.code} ${e.path}`));
  return validateChase(c, reg).filter((e) => !base.has(`${e.code} ${e.path}`));
}

describe("expect and waive resolve in the check registry", () => {
  it("a waive naming CHK-KEY-99 is E_REF, exit 2, with the nearest registered ids", () => {
    const c = { ...flexPair(), waive: [{ check: "CHK-KEY-99", target: "pad", reason: "covered by the coupon" }] };
    const errs = added(c);
    expect(errs).toHaveLength(1);
    const e = errs[0]!;
    expect([e.code, e.path, ERROR_TRANSPORT[e.code].exit]).toEqual(["E_REF", "/waive/0/check", 2]);
    expect(e.didYouMean!.length).toBeGreaterThan(0);
    for (const id of e.didYouMean!) expect(id).toMatch(/^CHK-KEY-\d\d$/);
  });
  it("an expect naming CHK-KEY-99 is E_REF with didYouMean", () => {
    const c = { ...flexPair(), expect: [{ check: "CHK-KEY-99", target: "pad", verdict: "fail" as const }] };
    const e = added(c);
    expect(e.map((x) => [x.code, x.path])).toEqual([["E_REF", "/expect/0/check"]]);
    expect(e[0]!.didYouMean).toContain("CHK-KEY-01");
  });
  it("an empty waiver reason is E_SCHEMA, exit 2, at /waive/0/reason", () => {
    const c = { ...flexPair(), waive: [{ check: "CHK-KEY-01", target: "keys.1", reason: "  " }] };
    const e = added(c);
    expect(e.map((x) => [x.code, x.path, ERROR_TRANSPORT[x.code].exit])).toEqual([["E_SCHEMA", "/waive/0/reason", 2]]);
  });
  it("a waiver on a precondition check is E_SCHEMA, exit 2, naming D-067", () => {
    const pre = reg.checks.find((c) => c.precondition === true);
    expect(pre).toBeDefined();
    const c = { ...flexPair(), waive: [{ check: pre!.id, target: "pad", reason: "accepted for the coupon" }] };
    const e = added(c);
    expect(e.map((x) => [x.code, x.path, ERROR_TRANSPORT[x.code].exit])).toEqual([["E_SCHEMA", "/waive/0/check", 2]]);
    expect(e[0]!.hint).toContain("D-067");
  });
  it("a waiver on a registered check that is not a precondition validates", () => {
    const ok = reg.checks.find((c) => c.precondition !== true && c.id.startsWith("CHK-KEY-"))!;
    expect(added({ ...flexPair(), waive: [{ check: ok.id, target: "keys.1", reason: "travel set by the coupon" }] })).toEqual([]);
  });
  it("an export kind, machine, material or constraint dim that resolves to nothing is E_REF", () => {
    const base = flexPair();
    const bad = {
      ...base,
      meta: { ...base.meta, machines: ["ffc5q"] },
      exports: [{ kind: "3mff" }],
      materials: [{ ...base.materials[0]!, material: "petgg" }, ...base.materials.slice(1)],
    };
    expect(added(bad).map((e) => [e.code, e.path, e.didYouMean?.[0]])).toEqual([
      ["E_REF", "/meta/machines/0", "ffc5p"],
      ["E_REF", "/materials/0/material", "petg"],
      ["E_REF", "/exports/0/kind", "3mf"],
    ]);
  });
});

describe("the handoff template after 1-to-2", () => {
  it("validates with 0 errors against the registries core assembles", () => {
    const v1 = JSON.parse(readFileSync(path.join(ROOT, "packages", "chase", "test", "fixtures", "v1", "_template.chase.json"), "utf8")) as unknown;
    const { chase } = migrateChase(v1);
    expect(validateChase(chase, reg)).toEqual([]);
  });
});
