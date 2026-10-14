// M05-T02 per-MCU pin rows. Expected values are the card's table
// (milestones/M05-circuit-copper.md M05-T02; D-076; RP2040 datasheet pp. 616
// to 617, ESP32-C3 datasheet v2.4 p. 55; BOSS boss-src.zip src/sim.js:91 and
// :135, blocks.html hint code), typed here and never read back from the
// rows under test.

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { isThrownCommandError } from "@hackbuild/spec";
import { BOSS_LEGACY_ID, BOSS_REPRODUCTION, MCU_PIN_IDS, bossLegacyRow, mcuPinRow } from "../src/mcu";

const PROVENANCE = { method: "datasheet", date: "2026-10-04" } as const;
const PIP_CAP = { value: 7, unit: "pF", qualifier: "inferred", basis: "inferred" } as const;
const PIP_LEAK = { value: 1, unit: "nA", qualifier: "inferred", basis: "inferred" } as const;

function errorOf(fn: () => unknown): { code: string; path?: string; hint: string; didYouMean?: readonly string[]; record?: string } {
  try {
    fn();
  } catch (e) {
    if (isThrownCommandError(e)) return e.hbf;
    throw e;
  }
  throw new Error("expected a command error");
}

describe("vendor rows (D-076)", () => {
  test("verdict ids are rp2040, pico, esp32-c3, esp32-s3 in file order (esp32-s3 M08-T04 step 6); the legacy row is not one", () => {
    expect(MCU_PIN_IDS).toEqual(["rp2040", "pico", "esp32-c3", "esp32-s3"]);
  });

  test("rp2040: 3.3 V, pullup range 50000 to 80000 ohm, VIL max 0.8 V, VIH min 2.0 V, vendor", () => {
    const r = mcuPinRow("rp2040");
    expect({ vdd: r.vddV, pullup: r.pullup, vil: r.vilMaxV, vih: r.vihMinV, tier: r.tier, source: r.source }).toEqual({
      vdd: 3.3, pullup: { kind: "range", minOhm: 50000, maxOhm: 80000 }, vil: 0.8, vih: 2.0, tier: "vendor", source: "RP2040 datasheet pp. 616 to 617",
    });
    expect(r.provenance).toEqual({ tier: "vendor", ...PROVENANCE, source: "RP2040 datasheet pp. 616 to 617" });
    expect(r.inputCap).toMatchObject(PIP_CAP);
    expect(r.leakage).toMatchObject(PIP_LEAK);
    expect(r.legacy).toBeUndefined();
  });

  test("pico inherits every rp2040 GPIO figure and is marked not checked against the Pico datasheet", () => {
    const p = mcuPinRow("pico");
    expect(p).toMatchObject({
      id: "pico", inherits: "rp2040", vddV: 3.3, pullup: { kind: "range", minOhm: 50000, maxOhm: 80000 }, vilMaxV: 0.8, vihMinV: 2.0, tier: "vendor",
    });
    expect(p.source).toContain("not checked against the Pico datasheet");
    expect(p.provenance).toMatchObject({ tier: "vendor", ...PROVENANCE });
    expect(p.inputCap).toMatchObject(PIP_CAP);
    expect(p.leakage).toMatchObject(PIP_LEAK);
  });

  test("esp32-c3: 3.3 V, pullup 45000 typical, VIL max 0.825 V (0.25 VDD), VIH min 2.475 V (0.75 VDD), vendor", () => {
    const r = mcuPinRow("esp32-c3");
    expect({ vdd: r.vddV, pullup: r.pullup, vil: r.vilMaxV, vih: r.vihMinV, tier: r.tier }).toEqual({
      vdd: 3.3, pullup: { kind: "typical", typOhm: 45000 }, vil: 0.825, vih: 2.475, tier: "vendor",
    });
    expect(r.vilMaxV).toBeCloseTo(0.25 * r.vddV, 12);
    expect(r.vihMinV).toBeCloseTo(0.75 * r.vddV, 12);
    expect(r.source).toContain("ESP32-C3 datasheet v2.4 p. 55");
    expect(r.provenance).toMatchObject({ tier: "vendor", ...PROVENANCE });
    expect(r.inputCap).toMatchObject(PIP_CAP);
    expect(r.leakage).toMatchObject(PIP_LEAK);
  });

  test("stored provenance carries machine null and coupon null on every row (D-099)", () => {
    const raw = JSON.parse(readFileSync(new URL("../data/mcu-pins.json", import.meta.url), "utf8")) as { rows: { id: string; provenance: Record<string, unknown> }[] };
    expect(raw.rows.map((r) => r.id)).toEqual(["rp2040", "pico", "esp32-c3", "esp32-s3", BOSS_LEGACY_ID]);
    for (const r of raw.rows) expect(r.provenance, r.id).toMatchObject({ machine: null, coupon: null, date: r.id === "esp32-s3" ? "2026-10-09" : "2026-10-04" });
  });

  test("an unknown id is E_REF with up to three catalog ids", () => {
    const e = errorOf(() => mcuPinRow("rp2041", "/facts/mcu"));
    expect(e).toMatchObject({ code: "E_REF", path: "/facts/mcu" });
    expect(e.didYouMean?.[0]).toBe("rp2040");
    expect(e.didYouMean?.length).toBeLessThanOrEqual(3);
    expect(e.didYouMean).not.toContain(BOSS_LEGACY_ID);
  });
});

describe("boss-legacy row (D-076, M05-T07)", () => {
  test("mcuPinRow refuses it with E_REF naming D-076", () => {
    const e = errorOf(() => mcuPinRow(BOSS_LEGACY_ID, "/facts/mcu"));
    expect(e).toMatchObject({ code: "E_REF", path: "/facts/mcu", record: "D-076" });
    expect(e.hint).toContain("D-076");
  });

  test("bossLegacyRow refuses every caller but the reproduction reference", () => {
    for (const ref of ["", "reference/keys/flex-pair", "circuit.solve", `${BOSS_REPRODUCTION}/`]) {
      const e = errorOf(() => bossLegacyRow(ref));
      expect(e, ref).toMatchObject({ code: "E_REF", record: "D-076" });
      expect(e.hint, ref).toContain("D-076");
    }
  });

  test("the reproduction reads 50000 ohm typical, single 0.5 VIO (1.65 V) and hint band 0.3 to 0.7 VIO (0.99 to 2.31 V), inferred", () => {
    expect(BOSS_REPRODUCTION).toBe("reference/electrical/blocks-pullup-band");
    const r = bossLegacyRow(BOSS_REPRODUCTION);
    expect({ id: r.id, vdd: r.vddV, pullup: r.pullup, legacy: r.legacy, tier: r.tier }).toEqual({
      id: "boss-legacy", vdd: 3.3, pullup: { kind: "typical", typOhm: 50000 }, legacy: { single: 0.5, hintBand: [0.3, 0.7] }, tier: "inferred",
    });
    expect(r.vilMaxV).toBeCloseTo(1.65, 12);
    expect(r.vihMinV).toBeCloseTo(1.65, 12);
    expect(r.legacy.hintBand.map((f) => f * r.vddV)).toEqual([expect.closeTo(0.99, 12), expect.closeTo(2.31, 12)]);
    expect(r.provenance).toMatchObject({ tier: "inferred", method: "derived", date: "2026-10-04" });
    expect(r.source).toContain("src/sim.js:91");
    expect(r.source).toContain(":135");
    expect(r.source).toContain("blocks.html");
  });
});
