// M04-T06 step 5: DAVIT constant interference as expect sets (D-074). The
// measured pairs come from the committed M02-T06 sweep record and the marks
// from designs/davit/contacts.json; the SHUNT sets of steps 1 and 2 are in
// expect-shunt.test.ts. Nothing here is produced by the code under test.

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import type { ResultTarget } from "@hackbuild/spec";
import { constantFindings, expectFinding, idSet, pairId, type ContactMark } from "../src/expect";

const root = new URL("../../../", import.meta.url);
const bytes = (rel: string): Buffer => readFileSync(new URL(rel, root));
const text = (rel: string): string => bytes(rel).toString("utf8");

// ---------------------------------------------------------------- DAVIT

interface Contacts {
  models: Record<"std" | "mini", { pairs: ContactMark[] }>;
  hub: ContactMark & { pipes: string[] };
}
interface SweepRecord {
  poseSets: { gated: { poses: number } };
  models: Record<"std" | "mini", Record<string, { constantInterference: Record<string, number> }>>;
}
const contacts = JSON.parse(text("designs/davit/contacts.json")) as Contacts;
const record = JSON.parse(text("packages/sim/records/davit-sweep.json")) as SweepRecord;
const POSES = record.poseSets.gated.poses;
const PIPES = ["1in", "125in", "15in"] as const;
const SIDES = ["R", "L"] as const;

/** The record's constant pairs for one model, pipe and side: pairId to point-pair count. */
function measuredConstant(model: "std" | "mini", pipe: string, side: string): Record<string, number> {
  const ci = record.models[model][pipe]!.constantInterference;
  return Object.fromEntries(Object.entries(ci).filter(([k]) => k.endsWith(`@${side}`)).map(([k, n]) => {
    const [a, b] = k.slice(0, -2).split("|");
    return [pairId(a!, b!), n];
  }));
}
const marksOf = (model: "std" | "mini", pipe: string): ContactMark[] =>
  [...contacts.models[model].pairs, ...(contacts.hub.pipes.includes(pipe) ? [contacts.hub] : [])];
const pairTarget = (side: string) => (pair: string): ResultTarget => {
  const [a, b] = pair.split("|");
  return { level: "pair", a: { level: "assembly", assembly: `davit@${side}`, part: a! }, b: { level: "assembly", assembly: `davit@${side}`, part: b ?? a! } };
};

describe("DAVIT constant interference (CHK-ASM-11 rule, step 5)", () => {
  for (const model of ["std", "mini"] as const) {
    test.each(PIPES.flatMap((p) => SIDES.map((s) => [p, s] as const)))(`${model} %s side %s: verdicts equal the constant flags`, (pipe, side) => {
      const measured = measuredConstant(model, pipe, side);
      const marks = marksOf(model, pipe);
      const found = constantFindings(measured, marks, POSES, pairTarget(side));
      const flagged = new Set(marks.filter((m) => m.constant === true).map((m) => pairId(m.a, m.b)));
      expect(found.map((f) => f.extra?.pair)).toEqual(idSet([...Object.keys(measured), ...flagged]));
      for (const f of found) {
        const pair = String(f.extra?.pair);
        expect(f.verdict).toBe(flagged.has(pair) && Object.hasOwn(measured, pair) ? "pass" : "fail");
        expect(f.extra?.poses).toBe(POSES);
        expect(f.extra?.pointPairs).toBe(measured[pair] ?? 0);
      }
      expect(found.every((f) => f.verdict === "pass")).toBe(true);
      const set = expectFinding({ level: "assembly", assembly: `davit@${side}` }, { target: `davit-${model}-${pipe}`, verdict: "warn", set: [...flagged] }, Object.keys(measured), "constant interference");
      expect(set.verdict).toBe("pass");
    });
  }

  test("the std record lists 16 constant pairs per side and every one is marked", () => {
    const m = measuredConstant("std", "125in", "R");
    expect(Object.keys(m)).toHaveLength(16);
    expect(marksOf("std", "125in").filter((x) => x.constant === true)).toHaveLength(16);
  });

  test("an unmarked constant interference fails, naming the pair and the pose count", () => {
    const marks = marksOf("std", "125in").map((m) => (pairId(m.a, m.b) === "palm|pincap" ? { a: m.a, b: m.b } : m));
    const found = constantFindings(measuredConstant("std", "125in", "R"), marks, POSES, pairTarget("R"));
    const failed = found.filter((f) => f.verdict === "fail");
    expect(failed.map((f) => f.extra?.pair)).toEqual(["palm|pincap"]);
    expect(failed[0]!.constraint).toContain(`all ${POSES} poses`);
    expect(failed[0]!.extra?.pointPairs).toBe(2072);
  });

  test("a mark with an empty reason fails; a stale mark fails", () => {
    const blank = marksOf("std", "125in").map((m) => (pairId(m.a, m.b) === "fore|upper" ? { ...m, reason: " " } : m));
    expect(constantFindings(measuredConstant("std", "125in", "R"), blank, POSES, pairTarget("R")).filter((f) => f.verdict === "fail").map((f) => f.extra?.pair)).toEqual(["fore|upper"]);
    const stale = marksOf("std", "125in").map((m) => (pairId(m.a, m.b) === "crank|upper" ? { ...m, constant: true, reason: "r" } : m));
    const f = constantFindings(measuredConstant("std", "125in", "R"), stale, POSES, pairTarget("R")).filter((x) => x.verdict === "fail");
    expect(f.map((x) => x.extra?.pair)).toEqual(["crank|upper"]);
    expect(f[0]!.extra?.constant).toBe("not measured");
  });
});
