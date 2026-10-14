// M06-T03: every seeded mechanism has a status and a reason, every typed
// def's derive() answers with unit and qualifier on every field (D-007),
// and the derive() ports of the entries the originals rule holds candidate
// regenerate their originals' numbers at the original's printed precision.
// Expected values come from the legacy records the recorders wrote by
// running each original (test/legacy/*.json) and from the M06 card.

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { parse } from "yaml";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import {
  AILERON_PARAMS, BALANCE_BEAM_PARAMS, CAPSULE_ROTOR_PARAMS, COINCIDENCE_LATCH_PARAMS, SLEW_RING_PARAMS,
  aileronDerive, balanceBeamDerive, capsuleRotorDerive, coincidenceLatchDerive, defaultsOf, mechanisms, slewRingDerive,
} from "@hackbuild/mechanisms";
import type { DerivedValue } from "@hackbuild/spec";

const root = new URL("../../../", import.meta.url);
const read = (p: string): string => readFileSync(new URL(p, root), "utf8");
const seed = (parse(read("packages/mechanisms/seed/mechanisms.seed.yaml")) as { id: string }[]).map((r) => r.id);
const profile = createProfileLookup(loadProfile());

interface Pose { tilt: number; roll: number; servoA: number | null; servoB: number | null; nearLimit: boolean; reachable: boolean }
const stanchion = JSON.parse(read("packages/mechanisms/test/legacy/stanchion.json")) as { poses: Pose[] };
const originals = JSON.parse(read("packages/mechanisms/test/legacy/originals.json")) as {
  stipple: Record<"r17b" | "r17", { P: Record<string, number>; half: { thetaDeg: number; rise: number; crown: number }; full: { rise: number } }>;
  ogee16: { printed: Record<string, number> };
  pintle: { P: Record<string, number> };
  slug: { values: Record<string, number> };
};

const QUALIFIERS = ["measured", "computed", "vendor", "inferred", "unknown"];
function qualified(id: string, out: Readonly<Record<string, DerivedValue>>): void {
  expect(Object.keys(out).length, id).toBeGreaterThan(0);
  for (const [k, v] of Object.entries(out)) {
    expect(typeof v.unit === "string" && v.unit !== "", `${id} ${k} unit`).toBe(true);
    expect(QUALIFIERS, `${id} ${k} qualifier`).toContain(v.qualifier);
    expect(v.equation.trim(), `${id} ${k} equation`).not.toBe("");
    expect(Number.isFinite(v.value), `${id} ${k} value`).toBe(true);
  }
}

describe("status split", () => {
  test("every seeded id has a status and a reason when refused; the split is printed", () => {
    const by: Record<string, string[]> = {};
    for (const id of seed) {
      const d = mechanisms.resolve(id).def;
      (by[d.status] ??= []).push(id);
      if (d.status !== "typed") expect(d.statusReason, id).toMatch(/M\d\d/);
    }
    const line = ["typed", "stub", "candidate", "unproven"].map((s) => `${s} ${by[s]?.length ?? 0}`).join(" ");
    console.log(`seeded mechanisms: ${line}`);
    // The port's split, the exit number (M06-T03, M06-T06): 17 TUMBLER entries and
    // pin-free-balance-beam and capsule-pocket-rotor regenerate numbers and geometry;
    // the rest regenerate their originals' numbers but not their bodies, held candidate.
    expect(line).toBe("typed 19 stub 0 candidate 5 unproven 0");
  });

  test("every typed def answers derive() at its defaults with unit, qualifier and equation on every field", () => {
    for (const e of mechanisms.entries.filter((x) => x.def.status === "typed")) {
      const r = e.def.params["~standard"].validate({}) as { value?: Readonly<Record<string, number>> };
      expect(r.value, e.id).toBeDefined();
      qualified(e.id, e.def.derive(r.value!, profile));
    }
  });

  test("a field without a unit or a qualifier fails the check above", () => {
    expect(() => qualified("probe", { x: { value: 1, unit: "", equation: "x", qualifier: "computed", basis: null } })).toThrow();
    expect(() => qualified("probe", { x: { value: 1, unit: "mm", equation: "x", qualifier: "guessed" as "computed", basis: null } })).toThrow();
  });
});

describe("aileron-differential: STANCHION solveHorns", () => {
  test("35 poses equal the page's HUD at one decimal: reach, servo A and servo B", () => {
    expect(stanchion.poses.length).toBe(35);
    for (const p of stanchion.poses) {
      const out = aileronDerive({ ...defaultsOf(AILERON_PARAMS), tilt: p.tilt, roll: p.roll });
      qualified("aileron-differential", out);
      expect(out["reachable"]!.value === 1, `${p.tilt},${p.roll}`).toBe(p.reachable);
      expect(out["nearTravelLimit"]!.value === 1, `${p.tilt},${p.roll}`).toBe(p.nearLimit);
      if (p.servoA !== null) expect(out["servoA"]!.value.toFixed(1), `${p.tilt},${p.roll} A`).toBe(p.servoA.toFixed(1));
      if (p.servoB !== null) expect(out["servoB"]!.value.toFixed(1), `${p.tilt},${p.roll} B`).toBe(p.servoB.toFixed(1));
    }
  });
  test("tilt 10, roll 10 gives servo A 46.1 and servo B 0.6 deg (card, M06-T03 step 3)", () => {
    const out = aileronDerive({ ...defaultsOf(AILERON_PARAMS), tilt: 10, roll: 10 });
    expect([out["servoA"]!.value.toFixed(1), out["servoB"]!.value.toFixed(1)]).toEqual(["46.1", "0.6"]);
  });
});

describe("pin-free-balance-beam: STIPPLE link()", () => {
  for (const [rev, card] of [["r17b", { rise: "2.500", tilt: "24.624" }], ["r17", { rise: "2.400", tilt: "23.578" }]] as const) {
    test(`${rev}: half select rise ${card.rise} mm and tilt ${card.tilt} deg, as the page's link() computes`, () => {
      const s = originals.stipple[rev];
      const p = {
        ...defaultsOf(BALANCE_BEAM_PARAMS), zRow: s.P["STROKE"]!, zCol: 0, stroke: s.P["STROKE"]!, crownR: s.P["CROWN_R"]!, crownTop: s.P["CROWN_TOP"]!,
        noseR: s.P["NOSE_R"]!, bossR: s.P["BOSS_R"]!, linkL: s.P["LINK_L"]!, rtFloor: s.P["RT_FLOOR"]!, ctFloor: s.P["CT_FLOOR"]!,
      };
      const out = balanceBeamDerive(p);
      qualified("pin-free-balance-beam", out);
      expect(Math.abs(out["halfSelectRise"]!.value - s.half.rise)).toBeLessThan(1e-12);
      expect(Math.abs(out["tiltMax"]!.value - s.half.thetaDeg)).toBeLessThan(1e-12);
      expect(Math.abs(out["fullSelectRise"]!.value - s.full.rise)).toBeLessThan(1e-12);
      expect(out["halfSelectRise"]!.value.toFixed(3)).toBe(card.rise);
      expect(out["tiltMax"]!.value.toFixed(3)).toBe(card.tilt);
    });
  }
  test("the def's defaults are R17b's DATA.P", () => {
    const s = originals.stipple.r17b.P;
    const d = defaultsOf(BALANCE_BEAM_PARAMS);
    expect([d["stroke"], d["crownR"], d["crownTop"], d["noseR"], d["bossR"], d["linkL"], d["rtFloor"], d["ctFloor"]]).toEqual(
      [s["STROKE"], s["CROWN_R"], s["CROWN_TOP"], s["NOSE_R"], s["BOSS_R"], s["LINK_L"], s["RT_FLOOR"], s["CT_FLOOR"]]);
  });
});

describe("displacement-coincidence-latch: OGEE16 kin.py", () => {
  const out = coincidenceLatchDerive(defaultsOf(COINCIDENCE_LATCH_PARAMS));
  test("the readout kin.py prints regenerates at its three decimals", () => {
    qualified("displacement-coincidence-latch", out);
    const pr = originals.ogee16.printed;
    for (const k of ["cam", "camLift", "fullRise", "halfRise", "margin", "overshoot"] as const) {
      expect(out[k]!.value.toFixed(3), k).toBe(pr[k]!.toFixed(3));
    }
  });
  test("the CHK-MOT-05 identity holds to 1e-9; the stroke/2 form misses it by the half rise's 0.25 mm", () => {
    expect(Math.abs(out["identityLhs"]!.value - out["identityRhs"]!.value)).toBeLessThan(1e-9);
    expect(Math.abs(out["identityStrokeHalf"]!.value - out["identityRhs"]!.value - (out["halfRise"]!.value - 9 / 2))).toBeLessThan(1e-9);
    expect(Math.abs(out["identityStrokeHalf"]!.value - out["identityLhs"]!.value)).toBeGreaterThan(0.2);
  });
});

describe("slew-ring-joint: PINTLE R6", () => {
  const p = originals.pintle.P;
  const out = slewRingDerive({ ...defaultsOf(SLEW_RING_PARAMS), rJ: p["r_j"]!, flangeT: p["flange_t"]!, rBore: p["r_bore"]!, rRboss: p["r_rboss"]!, clJournal: p["cl_journal"]!, clThrust: p["cl_thrust"]!, splineD: p["sv_spline_d"]! });
  test("the defaults are R6's P dict", () => {
    expect(defaultsOf(SLEW_RING_PARAMS)).toMatchObject({ rJ: p["r_j"], flangeT: p["flange_t"], rBore: p["r_bore"], rRboss: p["r_rboss"], clJournal: p["cl_journal"], clThrust: p["cl_thrust"], splineD: p["sv_spline_d"] });
  });
  test("journal 320.4 mm2 and spline 18.10 mm2 as the card; the R6 thrust annulus 12.9 to 17.0 is 385.1 mm2, the R4 README's 409.2 used 12.6", () => {
    qualified("slew-ring-joint", out);
    expect(out["journalArea"]!.value.toFixed(1)).toBe("320.4");
    expect(out["splineArea"]!.value.toFixed(2)).toBe("18.10");
    expect(out["thrustRIn"]!.value).toBe(12.9);
    expect(out["thrustArea"]!.value.toFixed(1)).toBe("385.1");
    expect((Math.PI * (17 ** 2 - 12.6 ** 2)).toFixed(1)).toBe("409.2");
  });
});

describe("capsule-pocket-rotor: SLUG", () => {
  const v = originals.slug.values;
  const out = capsuleRotorDerive(defaultsOf(CAPSULE_ROTOR_PARAMS), profile);
  test("the defaults are slug.scad's assignments; ratio and centre distance equal its RATIO and CD", () => {
    const d = defaultsOf(CAPSULE_ROTOR_PARAMS);
    expect([d["capD"], d["pockD"], d["nPock"], d["gm"], d["gzRot"], d["gzPin"]]).toEqual([v["cap_d"], v["pock_d"], v["npock"], v["gm"], v["gz_rot"], v["gz_pin"]]);
    qualified("capsule-pocket-rotor", out);
    expect(out["ratio"]!.value).toBe(v["RATIO"]);
    expect(out["centreDistance"]!.value).toBe(v["CD"]);
  });
  test("one vend per motor revolution, 4075.7728 half steps; the mouth is 3.07 capsules", () => {
    expect(out["motorRevsPerVend"]!.value).toBe(1);
    expect(out["halfStepsPerVend"]!.value).toBe(4075.7728);
    expect(out["mouthOverCapsule"]!.value.toFixed(2)).toBe("3.07");
  });
  test("2 pockets on the same 76/19 train: two motor turns and 8151.5456 half steps a vend", () => {
    const two = capsuleRotorDerive({ ...defaultsOf(CAPSULE_ROTOR_PARAMS), nPock: 2 }, profile);
    expect(two["motorRevsPerVend"]!.value).toBe(2);
    expect(two["halfStepsPerVend"]!.value).toBe(8151.5456);
  });
});
