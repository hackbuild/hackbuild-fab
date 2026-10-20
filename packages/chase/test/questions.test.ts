// The question audit of chase.validate (M10-T04 step 3). The resistivity
// facts are read here from packages/profile/data/materials.json, the
// committed profile, never from the code under test: the row a material's
// slot reads is its printed along row, else its printed bulk row, the
// rule circuit.solve applies through profile.resistivity. Dropping the
// Q-TIER rule fails the flex pair case.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { Chase } from "@hackbuild/spec";
import { QUESTION_RULES, chaseQuestions, type QuestionFacts, type RowInForce } from "@hackbuild/chase";
import { ROOT, flexPair } from "./helpers.js";

interface Row { id: string; direction: string; form: string; ohmCm: number; provenance: { tier: string } }
const materials = (JSON.parse(readFileSync(path.join(ROOT, "packages", "profile", "data", "materials.json"), "utf8")) as { materials: { id: string; resistivity: Row[] }[] }).materials;

/** The printed along row of each material, else its printed bulk row. */
const rows: Record<string, RowInForce> = Object.fromEntries(materials.flatMap((m) => {
  const printed = m.resistivity.filter((r) => r.form === "printed");
  const r = printed.find((x) => x.direction === "along") ?? printed.find((x) => x.direction === "bulk");
  return r === undefined ? [] : [[m.id, { id: r.id, tier: r.provenance.tier, ohmCm: r.ohmCm }]];
}));
const facts: QuestionFacts = { resistivity: rows, fabricationExports: ["3mf", "dxf"] };

const ask = (c: Chase, f: QuestionFacts = facts) => chaseQuestions(c, f).map((q) => [q.id, q.path, q.defaultInForce ?? null]);

describe("the flex pair", () => {
  it("asks exactly two Q-TIER questions, at the cpla and ctpu slots, each naming the inferred row in force", () => {
    // materials index 1 is slot 2 cpla (conductor), index 3 is slot 4 ctpu (flex-conductor)
    expect(rows["cpla"]).toMatchObject({ id: "cpla.pip.along", tier: "inferred" });
    expect(rows["ctpu"]).toMatchObject({ id: "ctpu.pip.bulk", tier: "inferred" });
    expect(ask(flexPair())).toEqual([
      ["Q-TIER", "/materials/1", "cpla.pip.along, 500 ohm cm inferred, CHK-NET-05 warns"],
      ["Q-TIER", "/materials/3", "ctpu.pip.bulk, 400 ohm cm inferred, CHK-NET-05 warns"],
    ]);
  });
  it("asks nothing of a slot whose row in force is above inferred, so a coupon row removes the question", () => {
    const measured = { ...rows, cpla: { ...rows["cpla"]!, tier: "measured" } };
    expect(ask(flexPair(), { ...facts, resistivity: measured }).map((q) => q[1])).toEqual(["/materials/3"]);
  });
  it("never asks Q-TIER of a body or flex slot", () => {
    const c = flexPair();
    const allInferred = Object.fromEntries(c.materials.map((m) => [m.material, { id: `${m.material}.x`, tier: "inferred", ohmCm: 1 }]));
    expect(ask(c, { resistivity: allInferred }).map((q) => q[1])).toEqual(["/materials/1", "/materials/3"]);
  });
});

describe("each rule", () => {
  const base = flexPair();
  const only = (c: Chase, id: string) => chaseQuestions(c, facts).filter((q) => q.id === id);
  it("Q-STACK on a surface with no stack, at /build", () => {
    expect(only({ ...base, meta: { ...base.meta, kind: "surface" } }, "Q-STACK").map((q) => q.path)).toEqual(["/build"]);
    expect(only(base, "Q-STACK")).toEqual([]);
  });
  it("Q-MOTION on a machine with no motion program", () => {
    const m = { ...base, meta: { ...base.meta, kind: "machine" as const } };
    expect(only(m, "Q-MOTION").map((q) => q.path)).toEqual(["/motion"]);
    expect(only({ ...m, motion: "ogee.checker" }, "Q-MOTION")).toEqual([]);
  });
  it("Q-READ-MODEL when the circuit kernel runs and no port has a hookup", () => {
    const { hookup: _h, ...bare } = base;
    expect(only(bare, "Q-READ-MODEL").map((q) => q.path)).toEqual(["/hookup"]);
    expect(only(base, "Q-READ-MODEL")).toEqual([]);
  });
  it("Q-FAB-MACHINE per fabrication export with no machine, default the first meta.machines entry", () => {
    const c = { ...base, exports: [{ kind: "3mf" }, { kind: "stl" }, { kind: "dxf", machine: "laser1" }] };
    expect(only(c, "Q-FAB-MACHINE").map((q) => [q.path, q.defaultInForce])).toEqual([["/exports/0", "ffc5p"]]);
  });
  it("Q-PRESETS when the chase declares none, default start blank only", () => {
    const { presets: _p, ...bare } = base;
    expect(only(bare, "Q-PRESETS").map((q) => [q.path, q.defaultInForce])).toEqual([["/presets", "start blank only"]]);
  });
  it("lists the rules in table order and every question is a typed record, never a string", () => {
    expect(QUESTION_RULES).toEqual(["Q-STACK", "Q-MOTION", "Q-READ-MODEL", "Q-FAB-MACHINE", "Q-PRESETS", "Q-TIER"]);
    const { presets: _p, ...bare } = base;
    for (const q of chaseQuestions({ ...bare, meta: { ...base.meta, kind: "surface" } }, facts)) {
      expect(Object.keys(q).every((k) => ["id", "path", "question", "options", "defaultInForce"].includes(k))).toBe(true);
      expect(q.path.startsWith("/")).toBe(true);
    }
  });
});
