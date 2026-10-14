// M04-T06 steps 1, 2 and 5: expect sets (D-074) and DAVIT constant
// interference. Independent sources: the measured SHUNT sets come from the
// legacy board.json `defects` (byte copy, sha256 checked against
// SHA256SUMS and the M04 card header); the declared sets come from the
// CHECKS.md section 10 fixture table and the counts from gen_board.py's own
// G7 EXPECT line; the DAVIT measured pairs come from the committed M02-T06
// sweep record and the marks from designs/davit/contacts.json. Nothing
// here is produced by the code under test.

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { sha256Hex, type ExpectDecl, type Finding, type ResultTarget } from "@hackbuild/spec";
import { constantFindings, declaredSet, expectFinding, expectsFor, idSet, pairId, setDrift, type ContactMark } from "../src/expect";

const root = new URL("../../../", import.meta.url);
const bytes = (rel: string): Buffer => readFileSync(new URL(rel, root));
const text = (rel: string): string => bytes(rel).toString("utf8");

const LEGACY = "designs/shunt/legacy/";

/** sha256 by file name from a SHA256SUMS file. */
function sums(rel: string): Map<string, string> {
  return new Map(text(rel).trim().split("\n").map((l) => {
    const m = /^([0-9a-f]{64}) {2}(.+)$/.exec(l);
    if (m === null) throw new Error(`bad SHA256SUMS line in ${rel}: ${l}`);
    return [m[2]!, m[1]!] as const;
  }));
}

/** The SHUNT input hashes in the M04 card header table, by file name. */
function cardHashes(): Map<string, string> {
  const md = text("docs/plan/milestones/M04-checks-project.md");
  const out = new Map<string, string>();
  for (const m of md.matchAll(/^\| `corpus\/shunt\/outputs\/shunt-r1\/([^`]+)` \| ([0-9a-f]{64}) \|$/gm)) out.set(m[1]!, m[2]!);
  return out;
}

/** CHECKS.md section 10, SHUNT G7 row: the declared shorts and floating nets. */
function declaredFromChecks(): { shorts: string[]; floating: string[] } {
  const md = text("docs/plan/CHECKS.md");
  const row = /^\| SHUNT G7 inverted gate \| 5 shorts \(([^)]+)\), 5 floating nets \(([^)]+)\) \|/m.exec(md);
  if (row === null) throw new Error("CHECKS.md section 10 has no SHUNT G7 row");
  const shorts = row[1]!.split(", ").map((s) => {
    const both = /^(\S+) and (\S+)$/.exec(s);
    return both === null ? s : pairId(both[1]!, both[2]!);
  });
  return { shorts, floating: row[2]!.split(", ") };
}

interface Board { defects: { shorts: [string, string, string][]; floating: string[] } }
const board = JSON.parse(text(`${LEGACY}board.json`)) as Board;
const measuredShorts = board.defects.shorts.map(([a, b]) => pairId(a, b));
const measuredFloating = board.defects.floating;
const declared = declaredFromChecks();

const SHORTS_TARGET = "shunt-r1/shorts";
const FLOATING_TARGET = "shunt-r1/floating";
const at = (target: string): ResultTarget => ({ level: "artifact", artifact: target, path: `${LEGACY}board.json` });
const decl = (target: string, set: readonly string[]): ExpectDecl => ({ check: "unassigned until M08", target, verdict: "fail", set });
const drift = (f: Finding): { missing: unknown; extra: unknown } => ({ missing: JSON.parse(String(f.extra?.missing)), extra: JSON.parse(String(f.extra?.extra)) });

describe("SHUNT G7 legacy copy", () => {
  test("board.json and gen_board.py match SHA256SUMS and the M04 card header", () => {
    const s = sums(`${LEGACY}SHA256SUMS`);
    const card = cardHashes();
    for (const f of ["board.json", "gen_board.py"]) {
      expect(sha256Hex(new Uint8Array(bytes(`${LEGACY}${f}`)))).toBe(s.get(f));
      expect(s.get(f)).toBe(card.get(f));
    }
  });

  test("the declared counts equal gen_board.py's own G7 EXPECT line", () => {
    const g = /^EXPECT = dict\(shorts=(\d+), floating=(\d+),/m.exec(text(`${LEGACY}gen_board.py`));
    expect(g).not.toBeNull();
    expect(declared.shorts).toHaveLength(Number(g![1]));
    expect(declared.floating).toHaveLength(Number(g![2]));
  });
});

describe("expect sets", () => {
  test("SHUNT passes with the declared 5 shorts and 5 floating nets", () => {
    const shorts = expectFinding(at(SHORTS_TARGET), decl(SHORTS_TARGET, declared.shorts), measuredShorts, "deliberate shorts on the board");
    const floating = expectFinding(at(FLOATING_TARGET), decl(FLOATING_TARGET, declared.floating), measuredFloating, "deliberately floating nets");
    for (const f of [shorts, floating]) {
      expect(f.verdict).toBe("pass");
      expect(f.legal.kind).toBe("exactSet");
      expect(drift(f)).toEqual({ missing: [], extra: [] });
      expect(f.extra?.measuredCount).toBe(5);
      expect(f.extra?.declaredCount).toBe(5);
    }
    expect(shorts.measured).toEqual(idSet(["N8V|P8V", "BOOT", "ANALOG", "ENC", "NANO"]));
    expect(floating.measured).toEqual(["GND?", "MAGIC", "MATRIX", "PROBE", "VIBES"]);
  });

  test("removing ENC from the declared set fails with extra [\"ENC\"]", () => {
    const f = expectFinding(at(SHORTS_TARGET), decl(SHORTS_TARGET, declared.shorts.filter((s) => s !== "ENC")), measuredShorts, "deliberate shorts on the board");
    expect(f.verdict).toBe("fail");
    expect(f.extra?.extra).toBe('["ENC"]');
    expect(f.extra?.missing).toBe("[]");
  });

  test("a sixth declared floating net fails with it under missing", () => {
    // NC is the sixth name G7 looks for (gen_board.py line 711); no part carries it, so it is not floating.
    expect(text(`${LEGACY}gen_board.py`)).toContain('"PROBE", "MATRIX", "NC")');
    const f = expectFinding(at(FLOATING_TARGET), decl(FLOATING_TARGET, [...declared.floating, "NC"]), measuredFloating, "deliberately floating nets");
    expect(f.verdict).toBe("fail");
    expect(drift(f)).toEqual({ missing: ["NC"], extra: [] });
    expect(f.extra?.declaredCount).toBe(6);
  });

  test("drift in both directions fails and names both", () => {
    const f = expectFinding(at(SHORTS_TARGET), decl(SHORTS_TARGET, [...declared.shorts.filter((s) => s !== "BOOT"), "VCC"]), measuredShorts, "c");
    expect(f.verdict).toBe("fail");
    expect(drift(f)).toEqual({ missing: ["VCC"], extra: ["BOOT"] });
  });

  test("an omitted set means the target alone; ctx.expect is read by target id", () => {
    expect(declaredSet({ target: "ENC" })).toEqual(["ENC"]);
    expect(expectFinding(at("ENC"), { target: "ENC", verdict: "fail" }, ["ENC"], "c").verdict).toBe("pass");
    expect(expectFinding(at("ENC"), { target: "ENC", verdict: "fail" }, [], "c").verdict).toBe("fail");
    const ctx = { expect: [{ target: "a", verdict: "fail" as const, set: ["x"] }, { target: "b", verdict: "warn" as const }] };
    expect(expectsFor(ctx, "b")).toEqual([{ target: "b", verdict: "warn" }]);
    expect(expectsFor({}, "b")).toEqual([]);
  });

  test("set helpers: duplicates collapse, order is code unit order, a self pair is one id", () => {
    expect(idSet(["b", "a", "b", "B"])).toEqual(["B", "a", "b"]);
    expect(pairId("P8V", "N8V")).toBe("N8V|P8V");
    expect(pairId("BOOT", "BOOT")).toBe("BOOT");
    expect(setDrift(["a", "b"], ["b", "c"])).toEqual({ missing: ["a"], extra: ["c"] });
  });
});

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
