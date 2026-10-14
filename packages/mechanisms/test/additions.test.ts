// M06-T05 step 4: the D-096 additions register as candidates and their
// derive() goldens run here, since mech.derive refuses a candidate. The
// goldens are the card table's computed values; PLINTH's strain is also
// compared with the original's own statement run on its defaults
// (test/legacy/originals.json).

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { isThrownCommandError } from "@hackbuild/spec";
import {
  ADDED_MECHANISMS, COUNTERBALANCE_PARAMS, CRANK_YOKE_PARAMS, METERING_PARAMS, SNAP_TONGUE_PARAMS,
  counterbalanceDerive, crankYokeDerive, defaultsOf, mechanisms, meteringDerive, snapTongueDerive,
} from "@hackbuild/mechanisms";

const root = new URL("../../../", import.meta.url);
const originals = JSON.parse(readFileSync(new URL("packages/mechanisms/test/legacy/originals.json", root), "utf8")) as { plinth: { strain: number; free: number } };
const profile = createProfileLookup(loadProfile());

describe("D-096 additions", () => {
  // The D-096 additions; the M06-T14 originals rows (decision D-222) have their own test.
  const d096 = ADDED_MECHANISMS.filter((a) => a.decision === "D-096");
  test("all eight are registered as candidates with a reason naming their promotion", () => {
    expect(d096.map((a) => a.id).sort()).toEqual([
      "counterbalance-band", "crank-yoke", "integer-metering-ratio", "snap-c-socket-lip", "snap-finger-collar", "snap-holster-tab", "snap-press-plug-ribs", "snap-tongue-relief",
    ]);
    for (const a of d096) {
      const d = mechanisms.resolve(a.id).def;
      expect(d.status, a.id).toBe("candidate");
      expect(d.statusReason, a.id).toBeTruthy();
    }
  });

  test("snap-tongue-relief: lipW 1.5, d 0.3, free 5.6 gives 2.152 percent, equal to PLINTH's own statement", () => {
    const out = snapTongueDerive(defaultsOf(SNAP_TONGUE_PARAMS));
    expect(out["free"]!.value).toBeCloseTo(5.6, 12);
    expect(out["strain"]!.value.toFixed(3)).toBe("2.152");
    expect(out["strain"]!.value).toBe(originals.plinth.strain);
  });

  test("counterbalance-band: 500 gf at 47.6 mm gives 233.4 N mm; 234 N mm needs 501.3 gf", () => {
    const out = counterbalanceDerive(defaultsOf(COUNTERBALANCE_PARAMS));
    expect(out["momentOfBand"]!.value.toFixed(1)).toBe("233.4");
    expect(out["bandForNeeded"]!.value.toFixed(1)).toBe("501.3");
  });

  test("integer-metering-ratio: 76/19 = 4; one vend is 4075.7728 half steps (28byj48.halfStepsPerRev, vendor)", () => {
    const out = meteringDerive(defaultsOf(METERING_PARAMS), profile);
    expect(out["ratio"]!.value).toBe(4);
    expect(out["halfStepsPerVend"]!.value).toBe(4075.7728);
    expect(out["halfStepsPerVend"]).toMatchObject({ qualifier: "computed", basis: "vendor" });
  });

  test("integer-metering-ratio: 2 pockets on the same 76/19 train is two motor turns, 8151.5456 half steps a vend", () => {
    const out = meteringDerive({ ...defaultsOf(METERING_PARAMS), nPock: 2 }, profile);
    expect(out["ratio"]!.value).toBe(4);
    expect(out["halfStepsPerVend"]!.value).toBe(8151.5456);
  });

  test("crank-yoke: R 6, stroke 9 gives SW 48.590 deg", () => {
    expect(crankYokeDerive(defaultsOf(CRANK_YOKE_PARAMS))["sweep"]!.value.toFixed(3)).toBe("48.590");
  });

  test("the def refuses derive() with E_REF naming candidate and its promotion: crank-yoke at M07, counterbalance-band owner milestone unassigned", () => {
    const hint = (id: string): string => {
      try {
        mechanisms.resolve(id).def.derive({}, profile);
      } catch (e) {
        if (isThrownCommandError(e)) return `${e.hbf.code} ${e.hbf.hint}`;
      }
      return "";
    };
    expect(hint("crank-yoke")).toMatch(/^E_REF mechanism crank-yoke is candidate: .*M07/);
    expect(hint("counterbalance-band")).toMatch(/^E_REF mechanism counterbalance-band is candidate: .*owner milestone unassigned/);
  });
});
