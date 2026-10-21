// M05-T07: the BLOCKS undefined-band result through the legacy scene solve
// of circuit.solve. Every expected number and state is read from the card
// (the expected table, the D-077 rounding and the acceptance lines) or from
// BOSS's own readings in the M05-T03 fixtures; none comes from this run.
// The scenes are the reference's scenes/ folder, written by
// tools/legacy/boss/dump-elements.cjs --table.

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { planCard } from "../../../tools/test-support/plan-root.js";
import type { McuPinSpec } from "@hackbuild/spec";
import { bossLegacyRow, mcuPinRow } from "@hackbuild/catalog";
import { bossDigital, bossScene, sceneVolts, solveLegacyScenes, stateAt, type BossScene, type LegacySceneRow } from "@hackbuild/circuit";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const REFERENCE = "reference/electrical/blocks-pullup-band";
const SCENES = `${ROOT}${REFERENCE}/scenes/`;
const FIXTURES = fileURLToPath(new URL("./fixtures/boss-scenes/", import.meta.url));
const CARD = planCard("M05-circuit-copper.md");
const T07 = CARD.slice(CARD.indexOf("## M05-T07 "), CARD.indexOf("## M05-T08 "));
const FLAT = T07.replace(/\s+/g, " ");

const files = readdirSync(SCENES).filter((f) => f.endsWith(".json")).sort();
const scenes: BossScene[] = files.map((f) => bossScene(JSON.parse(readFileSync(SCENES + f, "utf8")), f));
const legacy = bossLegacyRow(REFERENCE);
const mcus: McuPinSpec[] = [mcuPinRow("rp2040"), mcuPinRow("esp32-c3")];
const solved = solveLegacyScenes({ scenes, pin: "IO2", legacy, mcus, ends: "range" });
const row = (name: string): LegacySceneRow => {
  const r = solved.rows.find((x) => x.scene === name);
  if (r === undefined) throw new Error(`no solved scene ${name}`);
  return r;
};
const nameOf = (core: string, shape: string | undefined, len: string): string => `button-${core.toLowerCase()}-${shape ?? "straight"}-${len.padStart(3, "0")}`;

describe("the scenes", () => {
  test("every scene is the M05-T03 fixture of the same name, byte for byte", () => {
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) expect(readFileSync(SCENES + f, "utf8"), f).toBe(readFileSync(FIXTURES + f, "utf8"));
  });

  test("every scene is a pressed BUTTON scene and every one solves", () => {
    expect(solved.unsolved).toEqual([]);
    expect(solved.rows.map((r) => r.scene)).toEqual(scenes.map((s) => s.name));
  });

  test("the PULLUP element replaced in the 80 mm cPLA scene gives BOSS's own pin reading at 80000 and 45000 ohm within 1e-9 V", () => {
    const base = scenes.find((s) => s.name === "button-cpla-straight-080")!;
    for (const pu of [80000, 45000]) {
      const boss = JSON.parse(readFileSync(`${FIXTURES}button-cpla-straight-080-pu${pu}.json`, "utf8")) as { boss: { pins: { pin: string; v: number }[] } };
      const want = boss.boss.pins.find((p) => p.pin === "IO2")!.v;
      expect(Math.abs(sceneVolts(base, "IO2", pu) - want)).toBeLessThan(1e-9);
    }
  });

  test("the 0.5 VIO read equals BOSS's own digital reading on every scene", () => {
    for (const s of scenes) {
      const boss = JSON.parse(readFileSync(FIXTURES + `${s.name}.json`, "utf8")) as { boss: { pins: { pin: string; v: number; digital: string }[] } };
      const pin = boss.boss.pins.find((p) => p.pin === "IO2")!;
      expect(row(s.name).digital, s.name).toBe(pin.digital);
      expect(bossDigital(pin.v, legacy.vddV, legacy.legacy), s.name).toBe(pin.digital);
      expect(Math.abs(row(s.name).volts - pin.v), s.name).toBeLessThan(1e-9);
    }
  });
});

describe("M05-T07 acceptance", () => {
  // "assert the seven cPLA straight rows equal 1.31, 1.62, 1.92, 2.12, 2.24, 2.31, 2.39 V within 0.01 V"
  const d077 = /the seven cPLA straight rows equal ([\d., ]+?) V within 0\.01 V/.exec(FLAT)![1]!.split(", ").map(Number);
  const lengths = /Lengths ([\d, ]+?) mm/.exec(FLAT)![1]!.split(", ").map((s) => s.trim());

  test("the seven cPLA straight rows equal the D-077 values within 0.01 V", () => {
    expect(d077).toHaveLength(7);
    expect(lengths).toHaveLength(7);
    lengths.forEach((len, i) => expect(Math.abs(row(nameOf("cPLA", undefined, len)).volts - d077[i]!), len).toBeLessThanOrEqual(0.01));
  });

  test("every cTPU row from 40 to 200 mm lies in 3.15 to 3.27 V within 0.01 V, on every shape", () => {
    const [lo, hi] = /every cTPU row from 40 to 200 mm lies in ([\d.]+) to ([\d.]+) V within 0\.01 V/.exec(FLAT)!.slice(1).map(Number) as [number, number];
    const ctpu = solved.rows.filter((r) => r.button!.core === "ctpu" && r.button!.lenMm >= 40);
    expect(ctpu.length).toBeGreaterThanOrEqual(5);
    for (const r of ctpu) {
      expect(r.volts, r.scene).toBeGreaterThanOrEqual(lo - 0.01);
      expect(r.volts, r.scene).toBeLessThanOrEqual(hi + 0.01);
    }
  });

  test("the rp2040 row at 50 kohm and 80 mm reads UNDEFINED where the BOSS 0.5 VIO read says HIGH", () => {
    const r = row("button-cpla-straight-080");
    expect(r.digital).toBe("HIGH");
    expect(stateAt(r.reads.find((m) => m.mcu === "rp2040")!, 50000)).toBe("UNDEFINED");
  });
});

describe("M05-T07 expected table, every cell", () => {
  // | core, length | V at 50 kohm (BOSS) | BOSS 0.5 VIO read | hint band | rp2040 at 50 kohm | rp2040 at 80 kohm | esp32-c3 at 45 kohm |
  const rows = [...T07.matchAll(/^\| (cPLA|cTPU)(?: (zigzag|spiral))? (\d+) mm \| (\d\.\d{3}) \| (LOW|HIGH) \| (undefined|released|low) \|([^|]*)\|([^|]*)\|([^|]*)\|$/gm)];
  test("the table parses", () => expect(rows.length).toBe(13));

  const cell = (text: string): { v: string; state: string } | undefined => {
    const m = /^\s*(\d\.\d{3}) (LOW|UNDEFINED|HIGH)\s*$/.exec(text);
    return m === null ? undefined : { v: m[1]!, state: m[2]! };
  };

  test.each(rows.map((m) => [m[0].slice(2, 24), m] as const))("%s", (_, m) => {
    const [, core, shape, len, at50, read, band, rp50, rp80, esp45] = m;
    const r = row(nameOf(core!, shape, len!));
    expect(r.volts.toFixed(3)).toBe(at50);
    expect(r.digital).toBe(read);
    expect(r.band).toBe(band);
    const checks: [string, string | undefined, number][] = [["rp2040", rp50, 50000], ["rp2040", rp80, 80000], ["esp32-c3", esp45, 45000]];
    for (const [mcu, text, pu] of checks) {
      const want = cell(text ?? "");
      if (want === undefined) {
        expect((text ?? "").trim(), `${mcu} ${pu} cell`).toBe("");
        continue;
      }
      const read = r.reads.find((x) => x.mcu === mcu)!;
      const p = read.port.op.pressed.find((x) => x.pullupOhm === pu)!;
      expect(p.volts.toFixed(3), `${mcu} at ${pu}`).toBe(want.v);
      expect(p.state, `${mcu} at ${pu}`).toBe(want.state);
    }
  });
});

describe("the reference README table", () => {
  const readme = readFileSync(`${ROOT}${REFERENCE}/README.md`, "utf8");
  const rows = [...readme.matchAll(/^\| (cPLA|cTPU)(?: (zigzag|spiral))? (\d+) mm \| (\d\.\d{3}) \| (LOW|HIGH) \| (undefined|released|low) \| (\d\.\d{3}) (\w+) \| (\d\.\d{3}) (\w+) \| (\d\.\d{3}) (\w+) \|$/gm)];

  test("holds one row per scene", () => expect(rows.map((m) => nameOf(m[1]!, m[2], m[3]!)).sort()).toEqual(scenes.map((s) => s.name).sort()));

  test.each(rows.map((m) => [m[0].slice(2, 24), m] as const))("%s matches the solve", (_, m) => {
    const r = row(nameOf(m[1]!, m[2], m[3]!));
    expect([r.volts.toFixed(3), r.digital, r.band]).toEqual([m[4], m[5], m[6]]);
    const at = (mcu: string, pu: number): string[] => {
      const p = r.reads.find((x) => x.mcu === mcu)!.port.op.pressed.find((x) => x.pullupOhm === pu)!;
      return [p.volts.toFixed(3), p.state];
    };
    expect([...at("rp2040", 50000), ...at("rp2040", 80000), ...at("esp32-c3", 45000)]).toEqual(m.slice(7, 13));
  });
});
