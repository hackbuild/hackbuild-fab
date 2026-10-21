// M01-T10 interval fixtures, moved with their defs to packages/mechanisms
// at M06-T02 (cascade-slop) and M06-T03 (hook-rule), unchanged. The test
// lives in core because it drives the constraints solver, which the
// mechanisms package, its tier-1 sibling, may not import. Every
// expected number is read from a source the code under test never wrote: the golden tables of the M01-T10 card
// (docs/plan/milestones/M01-constraints.md), the canonical originals the
// lineage rows name (tumbler.html, params.scad), and the closed form run
// of hook_fit.py recorded in test/legacy/hook-rule.py.stdout.txt.

import { existsSync, readFileSync } from "node:fs";
import { sourcePath } from "../../tools/test-support/originals-root.js";
import { describe, expect, test } from "vitest";
import { planCard } from "../../tools/test-support/plan-root.js";
import { isThrownCommandError, type ConstraintCtx } from "@hackbuild/spec";
type Facts = ConstraintCtx["facts"];
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { createRegistry, nearest, solve, verdictOf } from "@hackbuild/constraints";
import {
  CASCADE_DEPTH, CASCADE_SEVERITY, CASCADE_WARN_TEXT, HOOK_CONSTANTS, HOOK_D, HOOK_RB, HOOK_SWEEP, cascadeReadout, constraintDefs, hookRule,
} from "@hackbuild/mechanisms";

const repo = new URL("../../", import.meta.url);
const read = (rel: string): string => readFileSync(new URL(rel, repo), "utf8");
const lineage = JSON.parse(read("lineage.json")) as { id: string; source: string; sha256: string }[];
const sourceOf = (id: string): string => { const s = lineage.find((r) => r.id === id)?.source; return s === undefined ? "" : sourcePath(s); };

const profile = createProfileLookup(loadProfile());
const reg = createRegistry(constraintDefs);
const ctxOf = (facts: Facts): ConstraintCtx => ({ profile, machine: "ffc5p", material: "", facts });

/** The M01-T10 section of the card. */
const card = ((): string => {
  const md = planCard("M01-constraints.md");
  const at = md.indexOf("## M01-T10 ");
  return md.slice(at, md.indexOf("\n## ", at + 1));
})();

/** Rows of the first card table whose header starts with head, as cells. */
function cardTable(head: string): string[][] {
  const lines = card.split("\n");
  const at = lines.findIndex((l) => l.startsWith(`| ${head}`));
  expect(at, `card has no table headed ${head}`).toBeGreaterThanOrEqual(0);
  const rows: string[][] = [];
  for (const l of lines.slice(at + 2)) {
    if (!l.startsWith("|")) break;
    rows.push(l.slice(1, -1).split("|").map((c) => c.trim()));
  }
  return rows;
}

function thrown(f: () => unknown): { code: string; path?: string } {
  try {
    f();
  } catch (e) {
    if (isThrownCommandError(e)) return e.hbf;
    throw e;
  }
  throw new Error("expected a command error");
}

describe("mech/cascade-slop (TUMBLER)", () => {
  const golden = cardTable("material").map((c) => ({
    material: c[0]!.replace(/ \(.*\)$/, ""), k: Number(c[1]), c: Number(c[2]), perStage: Number(c[3]),
    ceiling: Number(c[4]), slop3: Number(c[5]), slop4: Number(c[6]), verdict4: c[7]!,
  }));

  /** The bench default row (Delrin) and the print row of the card table, so no kerf is typed here. */
  const delrin = golden[0]!;
  const print = golden[2]!;

  test("the card table has the three material rows", () => {
    expect(golden.map((g) => g.material)).toEqual(["Delrin/POM 3mm", "Cardboard 3mm", "PLA print 2mm"]);
  });

  test("kerf of each row equals the MATS table and fit equals G of the canonical tumbler.html", (t) => {
    const src = sourceOf("tumbler.bench/harvest");
    if (!existsSync(src)) {
      t.skip(`not on this machine: ${src}`);
      return;
    }
    const html = readFileSync(src, "utf8");
    for (const g of golden) {
      const m = new RegExp(`'${g.material.replace(/[/]/g, "\\/")}':\\{t:[\\d.]+,k:([\\d.]+)`).exec(html);
      expect(Number(m?.[1]), g.material).toBe(g.k);
    }
    expect(Number(/const G=\{[^}]*c:([\d.]+)/.exec(html)?.[1])).toBe(0.15);
    expect(html).toContain(`slop>${profile.constant("cascade.slopWarn").value}?`);
    expect(html).toContain(`stroke=dep*${profile.constant("cascade.strokePerStage").value}`);
    expect(html).toContain(CASCADE_WARN_TEXT);
  });

  test("for every MATS row of the canonical tumbler.html, the interval reads the bench's own status line at depths 0 to 24", (t) => {
    const src = sourceOf("tumbler.bench/harvest");
    if (!existsSync(src)) {
      t.skip(`not on this machine: ${src}`);
      return;
    }
    const html = readFileSync(src, "utf8");
    // The bench's expressions, read from the file: slop = dep * (G.k + G.c), warned when slop > the literal.
    expect(html).toContain("slop=dep*(G.k+G.c)");
    const warnAt = Number(/\$\{slop>([\d.]+)\?'<b style="color:#ff5c4d">deep chain/.exec(html)?.[1]);
    const c = Number(/const G=\{[^}]*c:([\d.]+)/.exec(html)?.[1]);
    const mats = [...html.matchAll(/'([^']+)':\{t:[\d.]+,k:([\d.]+),E:/g)].map((m) => ({ name: m[1]!, k: Number(m[2]) }));
    expect(mats.length).toBe(9);
    expect(Number.isFinite(warnAt) && Number.isFinite(c)).toBe(true);
    for (const m of mats) {
      const r = solve(reg, CASCADE_DEPTH, ctxOf({ kerf: m.k, fit: c }));
      for (let dep = 0; dep <= 24; dep += 1) {
        const slop = dep * (m.k + c);
        const bench = slop > warnAt ? "warn" : "pass";
        expect(verdictOf(r.interval, dep, CASCADE_SEVERITY), `${m.name} depth ${dep}`).toBe(bench);
      }
    }
  });

  test("severity maps per D-067: block reads fail, warn reads warn, note reads pass", () => {
    const r = solve(reg, CASCADE_DEPTH, ctxOf({ kerf: delrin.k, fit: delrin.c }));
    expect(["block", "warn", "note"].map((s) => verdictOf(r.interval, 9, s as typeof CASCADE_SEVERITY))).toEqual(["fail", "warn", "pass"]);
    expect(verdictOf(r.interval, 2, "block")).toBe("pass");
  });

  for (const g of golden) {
    test(`${g.material}: legal 0 to ${g.ceiling}, slop ${g.slop3} at depth 3 and ${g.slop4} at depth 4 (${g.verdict4})`, () => {
      const ctx = ctxOf({ kerf: g.k, fit: g.c });
      const r = solve(reg, CASCADE_DEPTH, ctx);
      expect(r.interval.legal).toEqual([0, g.ceiling]);
      expect(r.interval.unit).toBe("stages");
      expect(r.interval.binding).toEqual({ lo: [0], hi: [0] });
      expect(r.interval.hi[0]!.reason).toContain("1.2 mm");
      expect(r.interval.hi[0]!.reason).toContain(CASCADE_WARN_TEXT);
      expect(r.interval.hi[0]).toMatchObject({ kernel: "motion", qualifier: "computed", basis: "inferred" });
      expect(r.interval.lo[0]!.reason).toContain("no input wire has depth 0");
      expect(r.unsat).toBeNull();
      expect(cascadeReadout(1, ctx).slop.value).toBeCloseTo(g.perStage, 12);
      expect(cascadeReadout(3, ctx).slop.value).toBeCloseTo(g.slop3, 12);
      expect(cascadeReadout(4, ctx).slop.value).toBeCloseTo(g.slop4, 12);
      expect(verdictOf(r.interval, 4, CASCADE_SEVERITY)).toBe(g.verdict4);
      expect(verdictOf(r.interval, g.ceiling, CASCADE_SEVERITY)).toBe("pass");
      expect(verdictOf(r.interval, g.ceiling + 1, CASCADE_SEVERITY)).toBe("warn");
    });
  }

  test("stroke needed at depth 3 is 30 mm (card), qualified computed on an inferred row", () => {
    const want = Number(/Stroke needed at depth 3 is (\d+) mm/.exec(card)?.[1]);
    const s = cascadeReadout(3, ctxOf({ kerf: delrin.k, fit: delrin.c })).stroke;
    expect(s).toEqual({ value: want, unit: "mm", source: "cascade.strokePerStage", qualifier: "computed", basis: "inferred" });
  });

  test("zero slop per stage leaves the ceiling open; a missing or negative fact is refused at its pointer", () => {
    expect(print.k).toBe(0);
    expect(solve(reg, CASCADE_DEPTH, ctxOf({ kerf: print.k, fit: 0 })).interval.legal).toEqual([0, null]);
    expect(thrown(() => solve(reg, CASCADE_DEPTH, ctxOf({ fit: 0.15 })))).toMatchObject({ code: "E_PARAM_MISSING", path: "/facts/kerf" });
    expect(thrown(() => solve(reg, CASCADE_DEPTH, ctxOf({ kerf: delrin.k, fit: -0.1 })))).toMatchObject({ code: "E_SCHEMA", path: "/facts/fit" });
  });
});

