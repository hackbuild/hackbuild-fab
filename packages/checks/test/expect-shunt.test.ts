// M04-T06 steps 1, 2 and 5, SHUNT: expect sets (D-074). Independent
// sources: the measured sets come from the original board.json `defects`
// (originals/shunt/files, lineage shunt.board, sha256 checked against the
// M04 card header); the declared sets come from the CHECKS.md section 10
// fixture table and the counts from gen_board.py's own G7 EXPECT line.
// Nothing here is produced by the code under test. Reads the originals
// through localOriginal, so it runs on the owner runner and never skips.

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { planCard } from "../../../tools/test-support/plan-root.js";
import { sha256Hex, type ExpectDecl, type Finding, type ResultTarget } from "@hackbuild/spec";
import { localOriginal } from "../../../tools/test-support/originals-root.js";
import { declaredSet, expectFinding, expectsFor, idSet, pairId, setDrift } from "../src/expect";

const root = new URL("../../../", import.meta.url);
const bytes = (rel: string): Buffer => readFileSync(new URL(rel, root));
const text = (rel: string): string => bytes(rel).toString("utf8");

const SHUNT = "fab-knowledge:originals/shunt/files/";
const original = (f: string): Buffer => readFileSync(localOriginal(`${SHUNT}${f}`));

/** The SHUNT input hashes in the M04 card header table, by file name. */
function cardHashes(): Map<string, string> {
  const md = planCard("M04-checks-project.md");
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
const board = JSON.parse(original("board.json").toString("utf8")) as Board;
const measuredShorts = board.defects.shorts.map(([a, b]) => pairId(a, b));
const measuredFloating = board.defects.floating;
const declared = declaredFromChecks();

const SHORTS_TARGET = "shunt-r1/shorts";
const FLOATING_TARGET = "shunt-r1/floating";
const at = (target: string): ResultTarget => ({ level: "artifact", artifact: target, path: `${SHUNT}board.json` });
const decl = (target: string, set: readonly string[]): ExpectDecl => ({ check: "unassigned until M08", target, verdict: "fail", set });
const drift = (f: Finding): { missing: unknown; extra: unknown } => ({ missing: JSON.parse(String(f.extra?.missing)), extra: JSON.parse(String(f.extra?.extra)) });

describe("SHUNT G7 originals", () => {
  test("board.json and gen_board.py match the M04 card header", () => {
    const card = cardHashes();
    for (const f of ["board.json", "gen_board.py"]) expect(sha256Hex(new Uint8Array(original(f))), f).toBe(card.get(f));
  });

  test("the declared counts equal gen_board.py's own G7 EXPECT line", () => {
    const g = /^EXPECT = dict\(shorts=(\d+), floating=(\d+),/m.exec(original("gen_board.py").toString("utf8"));
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
    expect(original("gen_board.py").toString("utf8")).toContain('"PROBE", "MATRIX", "NC")');
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
