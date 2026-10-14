// M06-T04: KNURL's Geneva and count-wheel detent from the canon's derive()
// ports against test/legacy/knurl.json, which record-knurl.mjs wrote by
// running the canonical knurl.html's own K.layout, K.geneva and K.sim, and
// against the card's golden table (docs/plan/milestones/M06-canons.md). The
// seed's two old formulas are evaluated here and must disagree with the
// goldens, so a regression to either fails. TUMBLER's crank radius input
// maps through d = cr / sin(pi/n) onto the same derive().

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  DETENT_PARAMS, GENEVA_PARAMS, TUMBLER_MATERIALS, TUMBLER_MODULES, defaultsOf, detentDerive, genevaDerive, mechanisms, tumblerDefaults, tumblerModule,
} from "@hackbuild/mechanisms";

interface Knurl {
  source: { lineage: string; sha256: string };
  defaults: { rounds: { R: number; d: number; pinR: number }; pawl: { thick: number; len: number; tip: number; height: number }; count: { N: number; fluteDepth: number }; print: { clr: number } };
  layout: Record<string, number>;
  geneva: { phi: number; theta: number }[];
  sims: { phi: number; driving: boolean }[];
  jam: { clr: number; pawlK: number; pawlLift: number; clickN: number; pawlStrain: number };
}
const root = new URL("../../../", import.meta.url);
const legacy = JSON.parse(readFileSync(new URL("packages/mechanisms/test/legacy/knurl.json", root), "utf8")) as Knurl;
const lineage = JSON.parse(readFileSync(new URL("lineage.json", root), "utf8")) as { id: string; sha256: string }[];

/** The card's golden table, M06-T04, read from the plan as text: quantity, value, tolerance. */
const card = ((): Map<string, string> => {
  const md = readFileSync(new URL("docs/plan/milestones/M06-canons.md", root), "utf8");
  const sec = md.slice(md.indexOf("## M06-T04 "), md.indexOf("## M06-T05 "));
  const rows = sec.split("\n").filter((l) => /^\| (Geneva|slot|carry|theta|detent|click|strain|pin sweep|pawl tip)/.test(l));
  return new Map(rows.map((l) => { const c = l.split("|").map((x) => x.trim()); return [c[1]!, c[2]!] as const; }));
})();
const num = (s: string): number => Number(/-?[\d.]+/.exec(s)![0]);

const g = genevaDerive(defaultsOf(GENEVA_PARAMS));
const det = detentDerive(defaultsOf(DETENT_PARAMS));

describe("legacy record", () => {
  test("pinned to the canonical knurl.html", () => {
    expect(lineage.find((r) => r.id === legacy.source.lineage)?.sha256).toBe(legacy.source.sha256);
  });
  test("the def's defaults are KNURL's K.defaults()", () => {
    const d = defaultsOf(GENEVA_PARAMS);
    expect([d["n"], d["d"], d["pinR"], d["clr"], d["flutes"]]).toEqual([legacy.defaults.rounds.R, legacy.defaults.rounds.d, legacy.defaults.rounds.pinR, legacy.defaults.print.clr, legacy.defaults.count.N]);
    const p = defaultsOf(DETENT_PARAMS);
    expect([p["stripT"], p["stripH"], p["freeLen"], p["fluteDepth"], p["clr"], p["tip"]]).toEqual([
      legacy.defaults.pawl.thick, legacy.defaults.pawl.height, legacy.defaults.pawl.len, legacy.defaults.count.fluteDepth, legacy.defaults.print.clr, legacy.defaults.pawl.tip,
    ]);
  });
});

describe("Geneva, KNURL closed form (D-096)", () => {
  test("rp, Rs, slot length, alpha, slot width and pin sweep equal K.layout to 1e-9", () => {
    for (const [k, l] of [["rp", "rp"], ["Rs", "Rs"], ["slotLen", "slotLen"], ["alpha", "alpha"], ["slotWidth", "slotW"], ["pinSweep", "pinSweep"]] as const) {
      expect(Math.abs(g[k]!.value - legacy.layout[l]!), k).toBeLessThan(1e-9);
    }
  });
  test("the card's goldens: rp 21.650635, Rs 12.5, slotLen 9.150635 to 1e-6; alpha 60 exact; slot 3.4; pin sweep 23.600635", () => {
    expect(Math.abs(g["rp"]!.value - num(card.get("Geneva rp")!))).toBeLessThan(1e-6);
    expect(Math.abs(g["Rs"]!.value - num(card.get("Geneva Rs")!))).toBeLessThan(1e-6);
    expect(Math.abs(g["slotLen"]!.value - num(card.get("Geneva slotLen")!))).toBeLessThan(1e-6);
    expect(g["alpha"]!.value).toBe(num(card.get("Geneva alpha")!));
    expect(Math.abs(g["slotWidth"]!.value - num(card.get("slot width 2 (pinR + clr)")!))).toBeLessThan(1e-9);
    expect(Math.abs(g["pinSweep"]!.value - num(card.get("pin sweep radius")!))).toBeLessThan(1e-6);
  });
  test("dwell 5/6 and index 1/6 at n 3, exact; carry over 5.50 counts", () => {
    expect(g["dwell"]!.value).toBe(5 / 6);
    expect(g["index"]!.value).toBe(1 / 6);
    expect(g["carryOver"]!.value.toFixed(2)).toBe("5.50");
  });
  test("theta at phi -30, -15, 0, 15, 30 equals K.geneva to 1e-9 and the card to 1e-4", () => {
    const want = card.get("theta at phi -30, -15, 0, 15, 30 deg")!.split(",").map((x) => num(x));
    legacy.geneva.forEach((r, i) => {
      const t = genevaDerive({ ...defaultsOf(GENEVA_PARAMS), phi: r.phi })["theta"]!.value;
      expect(Math.abs(t - r.theta), `phi ${r.phi}`).toBeLessThan(1e-9);
      expect(Math.abs(t - want[i]!), `phi ${r.phi}`).toBeLessThan(1e-4);
    });
  });
  test("outside the drive window theta holds at sign(phi) 180/n, as K.sim does", () => {
    for (const s of legacy.sims.filter((x) => !x.driving)) {
      expect(genevaDerive({ ...defaultsOf(GENEVA_PARAMS), phi: s.phi })["theta"]!.value).toBe(Math.sign(s.phi) * 60);
    }
    expect(genevaDerive({ ...defaultsOf(GENEVA_PARAMS), phi: 45 })["theta"]!.value).toBe(60);
  });
  test("the seed's dwell (n - 2)/(2n) is the index fraction and fails the dwell golden", () => {
    const seedDwell = (n: number): number => (n - 2) / (2 * n);
    expect(seedDwell(3)).not.toBe(g["dwell"]!.value);
    expect(seedDwell(3)).toBe(g["index"]!.value);
  });
  test("TUMBLER's crank radius maps through d = cr / sin(pi/n): its gen readouts come back (n 6, cr 20: centres 40.00, wheel dia 69.3)", () => {
    const gen = tumblerModule("gen")!;
    const p = tumblerDefaults("gen");
    const n = p["n"]!;
    const d = p["cr"]! / Math.sin(Math.PI / n);
    const out = genevaDerive({ ...defaultsOf(GENEVA_PARAMS), n, d });
    const read = gen.drive({ n, cr: p["cr"]!, pd: p["pd"]!, sw2: p["sw2"]! }, TUMBLER_MATERIALS[0]!, { CK: 0 }, {}).read;
    expect(read.find(([k]) => k === "centres")![1]).toBe(`${d.toFixed(2)}mm`);
    expect(read.find(([k]) => k === "wheel dia")![1]).toBe(`${(Math.round(out["wheelDia"]!.value * 1000) / 1000).toFixed(1)}mm`);
    expect(Math.abs(out["rp"]!.value - p["cr"]!)).toBeLessThan(1e-9);
    expect(TUMBLER_MODULES.length).toBe(18);
  });
});

describe("count-wheel detent (D-096, verified-claims C4)", () => {
  test("k, lift, click and strain at clr 0.4 equal K.layout and the card", () => {
    expect(Math.abs(det["k"]!.value - legacy.layout["pawlK"]!)).toBeLessThan(1e-12);
    expect(Math.abs(det["lift"]!.value - legacy.layout["pawlLift"]!)).toBeLessThan(1e-12);
    expect(Math.abs(det["clickForce"]!.value - legacy.layout["clickN"]!)).toBeLessThan(1e-12);
    expect(Math.abs(det["strain"]!.value - legacy.layout["pawlStrain"]!)).toBeLessThan(1e-12);
    expect(Math.abs(det["k"]!.value - num(card.get("detent k")!))).toBeLessThan(1e-9);
    expect(Math.abs(det["lift"]!.value - num(card.get("detent lift at clr 0.4")!))).toBeLessThan(1e-12);
    expect(Math.abs(det["clickForce"]!.value - num(card.get("click force at clr 0.4")!))).toBeLessThan(1e-9);
    expect(Math.abs(det["strain"]!.value - num(card.get("strain at clr 0.4")!))).toBeLessThan(1e-12);
    expect(det["clickForce"]!.value.toFixed(2)).toBe("0.74");
  });
  test("the jam record at clr 0.15 equals KNURL at that clearance: 0.96768 N at 0.63 percent", () => {
    const jam = detentDerive({ ...defaultsOf(DETENT_PARAMS), clr: legacy.jam.clr });
    expect(Math.abs(jam["clickForce"]!.value - legacy.jam.clickN)).toBeLessThan(1e-12);
    expect(Math.abs(jam["strain"]!.value - legacy.jam.pawlStrain)).toBeLessThan(1e-12);
    expect(Math.abs(jam["clickForce"]!.value - num(card.get("click force at clr 0.15 (jam record)")!))).toBeLessThan(1e-9);
    expect(Math.abs(jam["strain"]!.value - num(card.get("strain at clr 0.15")!))).toBeLessThan(1e-12);
  });
  test("the pawl tip lands on a whole flute: 261.818182 deg", () => {
    expect(Math.abs(det["tipAngle"]!.value - legacy.layout["pawlTipDeg"]!)).toBeLessThan(1e-9);
    expect(Math.abs(det["tipAngle"]!.value - num(card.get("pawl tip angle")!))).toBeLessThan(1e-6);
  });
  test("the seed's I = t w^3 / 12 (w 3.6, t 1.6) gives k 4.6656 N/mm and disagrees with the golden", () => {
    const I = (1.6 * 3.6 ** 3) / 12;
    const k = (3 * 2000 * I) / 20 ** 3;
    expect(k).toBeCloseTo(4.6656, 9);
    expect(Math.abs(k - det["k"]!.value)).toBeGreaterThan(1);
  });
  test("the def stays candidate with its reason, so mech.derive refuses it until M10-T08", () => {
    for (const id of ["geneva-external", "count-wheel-detent"]) {
      const d = mechanisms.resolve(id).def;
      expect(d.status, id).toBe("candidate");
      expect(d.statusReason, id).toContain("M10-T08");
    }
  });
});
