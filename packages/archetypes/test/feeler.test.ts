// M06-T10: the 22 STYLUS THINPOT archetypes are registered candidates with
// typed params read from the original's own declarations, they refuse to
// apply naming M10, the encoder B phase is fixed to step / 4, and the
// electrical maths reproduces the original's functions. Expected values
// come from the original page (its reg lines, its params, its SIM blocks),
// evaluated here, never from the defs.

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  FEELER_TABLE, archetypes, dividerR, isQuadrature, ladderLevels, niceR, quadratureMarks, thinpotOut,
} from "@hackbuild/archetypes";
import { originalPath } from "../../../tools/test-support/originals-root.js";

const FILE = originalPath("thinpot/files/feeler_thinpot.html");
const page = readFileSync(FILE, "utf8");
const pageLines = page.split("\n");
/** A function of the page, evaluated as the page declares it. */
const pageFn = <T>(name: string): T => {
  const at = page.indexOf(`function ${name}(`);
  let depth = 0, end = at;
  for (let j = page.indexOf("{", at); j < page.length; j++) {
    if (page[j] === "{") depth++;
    if (page[j] === "}" && --depth === 0) { end = j + 1; break; }
  }
  return (0, eval)(`(${page.slice(at, end)})`) as T;
};

describe("STYLUS THINPOT candidates", () => {
  test("22 ids load as candidates, one per reg in the page, with group and line", () => {
    const regs = pageLines.flatMap((l, i) => { const m = /^id:'([a-z]+)', name:'([^']+)', group:'([^']+)'/.exec(l); return m ? [{ id: `feeler-${m[1]}`, group: m[3], line: i + 1 }] : []; });
    expect(regs.length).toBe(22);
    expect(FEELER_TABLE.map((t) => [t.id, t.group, t.lines[0]])).toEqual(regs.map((r) => [r.id, r.group, r.line]));
    for (const r of regs) {
      const d = archetypes.resolve(r.id).def;
      expect(d.status, r.id).toBe("candidate");
      expect(d.statusReason, r.id).toContain("M10");
      expect(pageLines.some((l) => l.startsWith(`SIM.${r.id.slice(7)} = {`)), r.id).toBe(true);
    }
  });

  test("each candidate's params default to the page's declared defaults", async () => {
    for (const t of FEELER_TABLE) {
      const d = archetypes.resolve(t.id).def;
      const r = await d.params["~standard"].validate({});
      expect(r.issues, t.id).toBeUndefined();
      const v = (r as { value: Record<string, unknown> }).value;
      const off = page.split("\n").slice(0, t.lines[0] - 1).join("\n").length;
      const seg = page.slice(off, page.indexOf("build:", off));
      for (const m of seg.matchAll(/\bn\('([A-Za-z0-9]+)',\s*'[^']*',\s*(-?[\d.]+)/g)) {
        const key = m[1] as string;
        if (key === "holeD" && v["mountHoleD"] !== undefined && Number(m[2]) === v["mountHoleD"]) continue;
        expect(v[key], `${t.id}.${key}`).toBe(Number(m[2]));
      }
    }
  });

  test("a candidate refuses apply with E_REF naming M10", () => {
    let hint = "";
    try { archetypes.resolve("feeler-encoder").def.apply(undefined as never); } catch (e) { hint = (e as { hbf: { hint: string } }).hbf.hint; }
    expect(hint).toContain("M10");
  });

  test("the linked proven or candidate entries exist", () => {
    for (const t of FEELER_TABLE) if (t.links !== null) expect(archetypes.get(t.links), t.links).toBeDefined();
  });
});

describe("encoder quadrature", () => {
  test("B is A rotated by a quarter of the mark period at step / 4; the page's step / 2 fails it", () => {
    for (const ppr of [4, 24, 96]) {
      expect(isQuadrature(quadratureMarks(ppr))).toBe(true);
      expect(isQuadrature(quadratureMarks(ppr, 0.5))).toBe(false);
    }
    // The page's own line: phase = k ? step / 2 : 0.
    expect(page).toContain("var phase = k? step/2 : 0;");
  });
});

describe("electrical maths equals the page's", () => {
  const pDividerR = pageFn<(r: number, v?: number) => number>("dividerR");
  const pNiceR = pageFn<(r: number) => number>("niceR");
  test("dividerR and niceR over a sweep", () => {
    for (const r of [10, 47, 120, 1000, 4700, 33000, 1e6]) {
      expect(dividerR(r)).toBe(pDividerR(r));
      expect(dividerR(r, 5)).toBe(pDividerR(r, 5));
      expect(niceR(r * 1.37)).toBe(pNiceR(r * 1.37));
    }
  });
  test("ladder levels and the loaded thinpot divider", () => {
    const lv = ladderLevels(4, 10000, 100000);
    // SIM.ladder: k = 0 is the top of the chain, V near 1; the levels fall with k.
    expect(lv[0]).toBeGreaterThan(lv[3] as number);
    const rPar = (30000 * 104000) / (30000 + 104000);
    expect(lv[1]).toBeCloseTo(rPar / (10000 + rPar), 12);
    expect(thinpotOut(5000, 5000, 0, 1e12)).toBeCloseTo(0.5, 8);
  });
});
