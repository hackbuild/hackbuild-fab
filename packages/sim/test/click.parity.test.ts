// SNAPFE parity at PIP defaults and the Q sweep (M01-T02). Two independent
// sources of expected values, neither written by the port:
//   1. The legacy stdout under test/legacy/, produced by the legacy scripts
//      run against x/pip-controller/src/snapfe.js (lineage rows
//      snapfe.fe2pip/x-click-parity, snapfe.fe/scratch, snapfe.qfine/scratch,
//      snapfe/x-pip-controller-fe2pip, snapfe/x-pip-controller-fe and
//      snapfe/x-pip-controller-click-parity).
//   2. The tables typed into docs/plan/milestones/M01-constraints.md, M01-T02,
//      copied below as CARD_* with the precision the card states.
// The click rule lengths and the valley fraction come from profile through
// clickRules; the PIP default params (l, t, w, E, sw) are design inputs.

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { clickReadout, clickRigid, clickRules, curve, type ClickSpring } from "../src/fe/index.js";

const rules = clickRules(createProfileLookup(loadProfile()));
const legacy = (name: string): string[] =>
  readFileSync(new URL(`./legacy/${name}`, import.meta.url), "utf8").split("\n").filter((s) => s.length > 0);

/** PIP defaults, layout.js line 36 `clicky`: mm, mm, mm, MPa, mm. */
const PIP: Omit<ClickSpring, "Q"> = { l: 24, t: 0.55, w: 1.6, E: 1900, sw: 3 };

function run(p: ClickSpring) {
  const fe = clickRigid(p, rules);
  return { fe, r: clickReadout(fe, rules) };
}

// Card table 1, M01-T02: peak N, dPeak mm, drop percent, contact mm, eStop percent.
const CARD_CASES = [
  { name: "Q 2.0 (PIP default)", p: { ...PIP, Q: 2 }, peak: "2.527", dPeak: "0.629", dropPct: "76.5", cg: "1.369", eStop: "2.31", snap: true, bi: false },
  { name: "l 22, t 0.5, Q 2.0 (v3 numbers)", p: { ...PIP, l: 22, t: 0.5, Q: 2 }, peak: "2.282", dPeak: "0.571", dropPct: "76.5", cg: "1.245", eStop: "2.32", snap: true, bi: false },
] as const;

// Card table 2, M01-T02: Q sweep at PIP defaults. drop to 3 decimals (4 where
// the card gives 4), eStop to 2 decimals (3 where the card gives 3).
const CARD_SWEEP: ReadonlyArray<{ Q: number; snap: boolean; drop: string; eStop: string; bi: boolean }> = [
  { Q: 1.0, snap: false, drop: "0.000", eStop: "0.73", bi: false },
  { Q: 1.1, snap: false, drop: "0.000", eStop: "0.76", bi: false },
  { Q: 1.2, snap: true, drop: "0.0139", eStop: "1.42", bi: false },
  { Q: 1.51, snap: true, drop: "0.293", eStop: "1.79", bi: false },
  { Q: 1.52, snap: true, drop: "0.303", eStop: "1.80", bi: false },
  { Q: 1.55, snap: true, drop: "0.335", eStop: "1.84", bi: false },
  { Q: 2.0, snap: true, drop: "0.765", eStop: "2.31", bi: false },
  { Q: 2.19, snap: true, drop: "0.913", eStop: "2.495", bi: false },
  { Q: 2.2, snap: true, drop: "0.920", eStop: "2.504", bi: false },
  { Q: 2.25, snap: true, drop: "0.955", eStop: "2.55", bi: false },
  { Q: 2.31, snap: true, drop: "0.995", eStop: "2.60", bi: false },
  { Q: 2.32, snap: true, drop: "1.002", eStop: "2.61", bi: true },
];

const decimals = (s: string): number => s.split(".")[1]?.length ?? 0;

describe("PIP defaults and the v3 numbers (card table 1)", () => {
  for (const c of CARD_CASES) {
    test(`${c.name}: ${c.peak} N at ${c.dPeak} mm, drop ${c.dropPct} percent, contact ${c.cg} mm, eStop ${c.eStop} percent (computed)`, () => {
      const { r } = run(c.p);
      expect(r.ok).toBe(true);
      expect([r.peakN.toFixed(3), r.peakAtMm.toFixed(3), (r.drop * 100).toFixed(1), r.contactMm.toFixed(3), r.eStopPct.toFixed(2)])
        .toEqual([c.peak, c.dPeak, c.dropPct, c.cg, c.eStop]);
      expect([r.snaps, r.bistable]).toEqual([c.snap, c.bi]);
    });
  }
});

describe("Q sweep at PIP defaults (card table 2)", () => {
  for (const row of CARD_SWEEP) {
    test(`Q ${row.Q}: snap ${row.snap}, drop ${row.drop}, eStop ${row.eStop} percent, bistable ${row.bi} (computed)`, () => {
      const { r } = run({ ...PIP, Q: row.Q });
      expect(r.ok).toBe(true);
      expect([r.snaps, r.drop.toFixed(decimals(row.drop)), r.eStopPct.toFixed(decimals(row.eStop)), r.bistable])
        .toEqual([row.snap, row.drop, row.eStop, row.bi]);
    });
  }

  test("the snap flag first sets at Q 1.16 with drop 0.000026 (computed, card M01-T02)", () => {
    expect(run({ ...PIP, Q: 1.15 }).r.snaps).toBe(false);
    const { r } = run({ ...PIP, Q: 1.16 });
    expect([r.snaps, r.drop.toFixed(6)]).toEqual([true, "0.000026"]);
  });

  test("eStop is not monotonic in Q: 2.423 at Q 2.09, 2.409 at Q 2.10 (computed, card M01-T02)", () => {
    expect(run({ ...PIP, Q: 2.09 }).r.eStopPct.toFixed(3)).toBe("2.423");
    expect(run({ ...PIP, Q: 2.1 }).r.eStopPct.toFixed(3)).toBe("2.409");
  });
});

describe("legacy stdout of scratch/fe.cjs (3 decimals)", () => {
  // "24 0.55 2 1.6 peak 2.527 @ 0.629 drop 76.5 cg 1.369 eStop 2.31"; E 1900 and sw 3 are fixed in fe.cjs.
  const rows = legacy("fe.stdout.txt");
  test("two rows, PIP default and l 22 t 0.5", () => expect(rows).toHaveLength(2));
  for (const line of rows) {
    test(line, () => {
      const f = line.split(" ");
      const { r } = run({ ...PIP, l: Number(f[0]), t: Number(f[1]), Q: Number(f[2]), w: Number(f[3]) });
      expect([r.peakN.toFixed(3), r.peakAtMm.toFixed(3), (r.drop * 100).toFixed(1), r.contactMm.toFixed(3), r.eStopPct.toFixed(2)])
        .toEqual([f[5], f[7], f[9], f[11], f[13]]);
    });
  }
});

describe("legacy stdout of x/fe2pip.cjs (2 decimals)", () => {
  // fe2pip prints the l 22 row, then 15 rows of a Q loop from 1.0 by repeated
  // += 0.1 (labelled Q.toFixed(1)), then Q 2.25, 2.3 and 2.35 from a literal
  // list. The loop's accumulation is replayed so h = Q t matches bit for bit.
  const looped: number[] = [];
  for (let Q = 1.0; Q <= 2.45; Q += 0.1) looped.push(Q);
  const rows = legacy("fe2pip.stdout.txt");
  const json = rows.filter((s) => s.endsWith("}"));
  test("1 + 15 + 3 curve rows and the flat-beam line", () => {
    expect([looped.length, json.length]).toEqual([15, 19]);
    expect(rows.at(-1)).toMatch(/^flat beam small d/);
  });
  json.forEach((line, i) => {
    test(line, () => {
      const want = JSON.parse(line.slice(line.indexOf("{"))) as Record<string, number | boolean>;
      const label = line.split(" ")[1]!;
      const p: ClickSpring = i === 0 ? { ...PIP, l: 22, t: 0.5, Q: 2 }
        : { ...PIP, Q: i <= looped.length ? looped[i - 1]! : Number(label) };
      if (i > 0 && i <= looped.length) expect(p.Q.toFixed(1)).toBe(label);
      const { fe, r } = run(p);
      const n2 = (x: number): number => +x.toFixed(2);
      expect({
        snap: fe.snap, peak: n2(fe.peak), dPeak: n2(fe.dPeak), valley: n2(fe.valley), drop: n2(fe.drop),
        bi: fe.bistable, cg: n2(r.contactMm), eStop: n2(r.eStopPct),
      }).toEqual(want);
    });
  });
  test("flat-beam line: FE k 0.585396 and theory 0.585394 N/mm (computed)", () => {
    const f = rows.at(-1)!.split(/\s+/);
    const pt = curve({ l: 24, h: 0.001, t: 0.55, w: 1.6, E: 1900, nel: 18, steps: 56, dmax: 0.01 }).pts[5]!;
    const I = 1.6 * 0.55 ** 3 / 12;
    expect([(pt.F / pt.d).toFixed(6), (2 * 12 * 1900 * I / 12 ** 3).toFixed(6)]).toEqual([f[8], f.at(-1)]);
  });
});

describe("legacy stdout of scratch/qfine.cjs: the 0.01 grid, Q 1.00 to 2.40", () => {
  test("every row: snap and bistable exact, ok true, peak, dPeak, drop, cg, eStop to 3 decimals", () => {
    const rows = legacy("qfine.stdout.txt");
    const t0 = performance.now();
    let compared = 0;
    for (const line of rows) {
      const [q, snap, peak, dPeak, drop, bi, cg, eStop, ok] = line.split(" ");
      const { r } = run({ ...PIP, Q: Number(q) });
      expect([r.snaps ? "1" : "0", r.bistable ? "1" : "0", String(r.ok)], `Q ${q}`).toEqual([snap, bi, ok]);
      expect([r.peakN, r.peakAtMm, r.drop, r.contactMm, r.eStopPct].map((x) => x.toFixed(3)), `Q ${q}`)
        .toEqual([peak, dPeak, drop, cg, eStop]);
      compared++;
    }
    const ms = performance.now() - t0;
    process.stdout.write(`click.parity grid: ${compared} rows compared, Q 1.00 to 2.40 at 0.01; sweep runtime ${(ms / 1000).toFixed(2)} s (measured, this run)\n`);
    // 141 = (2.40 - 1.00) / 0.01 + 1, from the grid definition (computed).
    expect(compared).toBe(141);
  }, 120_000);
});
