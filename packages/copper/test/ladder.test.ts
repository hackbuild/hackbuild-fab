// M05-T14: the ladder rule on a constructed ladder. Three 1.6 mm rows on a
// 2.54 mm pitch leave a 0.94 mm gap (D-092), sit on one grid, and a run at
// 30 degrees is named as off the rule, with its flat end. SPLICE rev C's cut file is the
// reference case (reference/copper/splice-ladder).

import { describe, expect, test } from "vitest";
import { loadGeom } from "@hackbuild/geom";
import { Vinyl, ladderAudit, ladderGap } from "../src/index.js";

const OPTS = { pitch: 2.54, width: 1.6, minRun: 0.5, angleTol: 0.5, tol: 0.01 } as const;

describe("ladder rule", () => {
  test("rows on one 2.54 grid with 1.6 traces leave 0.94 mm; a 30 degree run is off the rule", async () => {
    const v = new Vinyl(await loadGeom());
    expect(ladderGap(2.54, 1.6)).toBeCloseTo(0.94, 12);
    const rows = [0, 1, 2].map((i) => [`R${i}`, v.wire([[0, 5 + 2.54 * i], [20, 5 + 2.54 * i]], 1.6)] as const);
    const a = ladderAudit(rows, OPTS);
    expect(a.gap).toBeCloseTo(0.94, 4);
    expect(a.ties).toEqual(["R0/R1", "R1/R2"]);
    expect(a.offAngle).toEqual([]);
    expect(a.rows.map((r) => [r.net, r.y, r.offGrid])).toEqual([["R0", 5, 0], ["R1", 7.54, 0], ["R2", 10.08, 0]]);
    const bent = ladderAudit([["D", v.wire([[0, 0], [10, 0], [10 + 10 * Math.cos(Math.PI / 6), 10 * Math.sin(Math.PI / 6)]], 1.6)]], OPTS);
    expect(bent.offAngle.length).toBeGreaterThan(0);
    // The 30 degree run's sides read 30 and 210, its flat end 120 and 300.
    expect([...new Set(bent.offAngle)].sort()).toEqual(["D 120.0", "D 210.0", "D 30.0"].sort());
  });
});
