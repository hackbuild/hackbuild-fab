// M06-T03 step 4 and M06-T04 step 4: the recorded rules and KNURL's detent
// bands as ConstraintDefs, solved through the constraints registry. It
// lives in core, which may import both tier-1 packages. Expected
// values are the rules as CANONS.md 3.2 and the M06 card state them, the
// seed lines they cite, KNURL's own warn lines and the profile constants'
// provenance, never the defs under test.

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { createRegistry, solve } from "@hackbuild/constraints";
import type { ConstraintCtx } from "@hackbuild/spec";
import { DETENT_PARAMS, constraintDefs, defaultsOf, detentDerive } from "@hackbuild/mechanisms";
import { originalPath } from "../../tools/test-support/originals-root.js";

const root = new URL("../../", import.meta.url);
const profile = createProfileLookup(loadProfile());
const reg = createRegistry(constraintDefs);
const ctx: ConstraintCtx = { profile, machine: "ffc5p", material: "", facts: {} };
const seed = readFileSync(new URL("packages/mechanisms/seed/mechanisms.seed.yaml", root), "utf8").split("\n");
const knurl = readFileSync(originalPath("knurl/files/knurl.html"), "utf8").split("\n");

describe("recorded rules legal exactly at 0 (CANONS.md 3.2)", () => {
  for (const [id, dim, line] of [
    ["mech/rigid-two-pin-link", "link.dzAtRest", 104],
    ["mech/crown-from-rocker-origin", "crown.originOffset", 103],
    ["mech/detent-strip-separate", "detent.fusedLength", 90],
    ["mech/peg-is-cam", "journal.flats", 105],
  ] as const) {
    test(`${id}: ${dim} legal 0 to 0, reason citing seed line ${line}`, () => {
      const r = solve(reg, dim, ctx);
      expect(r.interval.legal).toEqual([0, 0]);
      expect(r.interval.lo[0]!.source).toBe(id);
      expect(r.interval.lo[0]!.reason).toContain(`line ${line}`);
      expect(seed[line - 1]!.trim()).not.toBe("");
    });
  }
});

describe("mech/coincidence-ramp", () => {
  test("floor 40 deg from coincidence.rampMinDeg, reason naming the acrylic friction row 0.45", () => {
    const r = solve(reg, "latch.rampDeg", ctx);
    expect(r.interval.legal).toEqual([40, null]);
    expect(r.interval.lo[0]!.reason).toContain("static friction 0.45");
    expect(r.interval.lo[0]!.reason).toContain("24.2 deg");
    expect(r.interval.lo[0]).toMatchObject({ qualifier: "inferred", basis: "inferred" });
    expect(seed[100]).toContain("ramp_a >= 40 deg against acrylic friction 0.45");
  });
});

describe("mech/detent-bands (KNURL lines 1202 to 1204)", () => {
  test("the constants equal KNURL's literals", () => {
    expect(knurl[1201]).toContain("G.pawlStrain < 0.02");
    expect(knurl[1202]).toContain("G.clickN < 3");
    expect(knurl[1203]).toContain("G.clickN > 0.4");
    expect(profile.constant("knurl.pawlStrainMax").value).toBe(0.02);
    expect(profile.constant("knurl.clickMaxN").value).toBe(3);
    expect(profile.constant("knurl.clickMinN").value).toBe(0.4);
  });
  test("strain at most 0.02; click 0.4 to 3 N; KNURL's default and the clr 0.15 jam both sit inside", () => {
    expect(solve(reg, "detent.strain", ctx).interval.legal).toEqual([null, 0.02]);
    expect(solve(reg, "detent.clickForce", ctx).interval.legal).toEqual([0.4, 3]);
    for (const clr of [0.4, 0.15]) {
      const d = detentDerive({ ...defaultsOf(DETENT_PARAMS), clr });
      expect(d["strain"]!.value, `clr ${clr}`).toBeLessThan(0.02);
      expect(d["clickForce"]!.value, `clr ${clr}`).toBeGreaterThan(0.4);
      expect(d["clickForce"]!.value, `clr ${clr}`).toBeLessThan(3);
    }
  });
});
