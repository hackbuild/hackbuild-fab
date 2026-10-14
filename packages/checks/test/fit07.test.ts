// CHK-FIT-07 (M05-T19 step 8): a printed conductive socket on a printed
// stud, BAFFLE R3's tile socket (originals/baffle-r3/files/src/model.js
// lines 123, 125 and 993 to 997). The socket numbers are read from the
// original here, so the fixture and the bounds are checked against source.

import { existsSync, readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { loadFixture } from "./fixture-load";
import { profile, ran, runFixture } from "./button-run";
import { originalPath } from "../../../tools/test-support/originals-root.js";

const MODEL = originalPath("baffle-r3/files/src/model.js");

describe("CHK-FIT-07 collet socket", () => {
  test.skipIf(!existsSync(MODEL))("the fixture socket and the bounds are BAFFLE R3's", () => {
    const lines = readFileSync(MODEL, "utf8").split("\n");
    const tile = /sockD: ([\d.]+), sockH: ([\d.]+),.*slots: (\d+)/.exec(lines[122]!)!;
    const deck = /studD: ([\d.]+), studH: ([\d.]+)/.exec(lines[124]!)!;
    const fx = loadFixture("CHK-FIT-07", "pass");
    const bore = fx.targets.parts![0]!.features[0] as { d: number; depth: number; onStud: { studD: number; studH: number; fingers: number } };
    expect([bore.d, bore.depth, bore.onStud.fingers]).toEqual([Number(tile[1]), Number(tile[2]), Number(tile[3])]);
    expect([bore.onStud.studD, bore.onStud.studH]).toEqual([Number(deck[1]), Number(deck[2])]);
    expect(lines[993]).toContain("inter >= 0.08 && inter <= 0.2");
    expect(lines[994]).toContain("T0.slots >= 3");
    expect(lines[996]).toContain("axial >= 0.06 && axial <= 0.2");
    expect(["fit.collet.interferenceMinMm", "fit.collet.interferenceMaxMm", "fit.collet.fingersMin", "fit.collet.squeezeMinMm", "fit.collet.squeezeMaxMm"].map((id) => profile.constant(id).value))
      .toEqual([0.08, 0.2, 3, 0.06, 0.2]);
  });

  test("BAFFLE R3 socket: interference 0.12, squeeze 0.12, 4 fingers, all pass", async () => {
    const rs = ran(await runFixture("CHK-FIT-07", "pass"));
    expect(rs.map((r) => [r.verdict, Number((r.measured as number).toFixed(6))])).toEqual([["pass", 0.12], ["pass", 0.12], ["pass", 4]]);
  });

  test("the first tile print, no collet slots: the fingers fail", async () => {
    const rs = ran(await runFixture("CHK-FIT-07", "fail"));
    expect(rs.map((r) => r.verdict)).toEqual(["pass", "pass", "fail"]);
    expect(rs[2]!.legal).toMatchObject({ kind: "interval", lo: 3, hi: null, unit: "count", nearest: 3 });
  });
});
