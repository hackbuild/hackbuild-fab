// M05-T05: read models on port. The PIP figures come from two independent
// sources: the card's acceptance table (docs/plan/milestones/M05-circuit-copper.md,
// parsed below) and PIP's own read lines, pip-controller src/model.js lines
// 418 to 429 and layout.js line 46 at b137deb, evaluated from the vendored
// copy in designs/pip/legacy/src. The BOSS button case reads the M05-T03
// fixture and the M05-T07 expected table; the ADC bands read BOSS's own
// verdict line. ratiometric, column-scan and ladder have no legacy parity
// target in M05: their cases are computed from the formulas, this card.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { mcuPinRow } from "@hackbuild/catalog";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import type { ReadModel } from "@hackbuild/spec";
import {
  adcRead, benchSkinOhm, chargeReleaseRead, columnScan, emitWait, fullScaleCounts, ladderLevels, ladderRead, nodeCapPf, pulldownFloorOhm,
  pullupRead, rcCrossingUs, ratiometricRead, shippedWait, solveDc, swappedPair, touchPathOhm, traceCapRule, type DcElement,
} from "../src/index";
import { SETTLE_TAUS } from "../src/read/index";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const read = (p: string): string => readFileSync(`${ROOT}${p}`, "utf8");
const CARD = read("docs/plan/milestones/M05-circuit-copper.md");
const T05 = CARD.slice(CARD.indexOf("## M05-T05"), CARD.indexOf("## M05-T06"));
const T07 = CARD.slice(CARD.indexOf("## M05-T07"), CARD.indexOf("## M05-T08"));
const profile = createProfileLookup(loadProfile());
const rp2040 = mcuPinRow("rp2040");

/** The acceptance row of T05 whose first cell starts with label; its cells. */
function cardRow(label: string): string[] {
  const line = T05.split("\n").find((l) => l.startsWith(`| ${label}`));
  if (line === undefined) throw new Error(`card has no acceptance row ${label}`);
  return line.split("|").slice(1, -1).map((c) => c.trim());
}
const num = (cell: string, re: RegExp): number => {
  const m = cell.match(re);
  if (m === null) throw new Error(`no ${String(re)} in "${cell}"`);
  return Number(m[1]);
};
/** Equal to a card figure printed with `places` decimals. */
const nearCard = (got: number, want: number, places: number): void => {
  expect(Math.abs(got - want)).toBeLessThanOrEqual(0.5 * 10 ** -places + 1e-12);
};
const places = (cell: string, re: RegExp): number => (cell.match(re)?.[1]?.split(".")[1] ?? "").length;

// ---- PIP's read lines, evaluated as PIP wrote them ----

const MODEL = read("designs/pip/legacy/src/model.js").split("\n");
const LAYOUT = read("designs/pip/legacy/src/layout.js").split("\n");
const PH = ((): { cpin: number; leak: number; waitMech: number; waitTouch: number } => {
  const m = (LAYOUT[45] ?? "").match(/phys: (\{[^}]*\})/);
  if (m === null) throw new Error("layout.js line 46 holds no phys");
  return new Function(`return (${m[1]});`)() as { cpin: number; leak: number; waitMech: number; waitTouch: number };
})();
const READ_LINES = MODEL.slice(417, 429).join("\n");
const legacyRead = new Function("Ph", "netLen", "id", "bi", "total", `${READ_LINES}\nreturn { Cpf, read };`) as (
  ph: typeof PH, netLen: Map<string, number>, id: string, bi: { type: string }, total: number,
) => { Cpf: number; read: { tauMs: number; wait: number; ok: boolean; reject: number } };

/** The trace length that gives a card C at PIP's rule, mm. */
const lenFor = (cPf: number): number => (cPf - PH.cpin - 1) / 0.02;

test("the evaluated lines are PIP's capacitance and read lines", () => {
  expect(MODEL[417]).toContain("const Cpf = Ph.cpin + (netLen.get(id) || 0) * 0.02 + 1;");
  expect(READ_LINES).toContain("const Rskin = 20e6 + total;");
  expect(READ_LINES).toContain("ok: Ph.waitMech * 1e-3 > 5 * tau, reject: Ph.waitMech * 1e-3 / (5 * Cpf * 1e-12)");
});

describe("charge-release against PIP model.js and the card", () => {
  const rule = traceCapRule(profile);
  const keyRead = (net: string, R: number, cPf: number, waitUs: number) =>
    chargeReleaseRead({
      net, pathOhm: R, nodePf: nodeCapPf(rp2040.inputCap.value, lenFor(cPf), { perMmPf: rule.perMmPf.value, fixedPf: rule.fixedPf.value }),
      settleTaus: SETTLE_TAUS.key, emit: { value: waitUs, unit: "us", qualifier: "inferred", basis: "inferred" }, leakNa: rp2040.leakage.value,
    });

  test("the profile trace rule and the pin row equal PIP's constants", () => {
    expect(rule.perMmPf.value).toBe(0.02);
    expect(rule.fixedPf.value).toBe(1);
    expect(rp2040.inputCap.value).toBe(PH.cpin);
    expect(rp2040.leakage.value).toBe(PH.leak);
    expect(benchSkinOhm(profile).value).toBe(20e6);
  });

  test("node capacitance equals PIP's double over a sweep of trace lengths", () => {
    let differ = 0;
    for (let i = 0; i <= 20000; i += 1) {
      const len = i / 100;
      const want = legacyRead(PH, new Map([["K", len]]), "K", { type: "flex" }, 1e6).Cpf;
      expect(nodeCapPf(PH.cpin, len, { perMmPf: rule.perMmPf.value, fixedPf: rule.fixedPf.value })).toBe(want);
      if (PH.cpin + (len * 0.02 + 1) !== want) differ += 1;
    }
    // the sweep reaches lengths where another summation order gives another double
    expect(differ).toBeGreaterThan(0);
  });

  test("PIP LEFT key, wait 200 us: tau, settle, ok; capacitance equals PIP's double", () => {
    const row = cardRow("PIP LEFT key, wait 200 us");
    const R = num(row[1]!, /R (\d+) ohm/);
    const C = num(row[1]!, /C ([\d.]+) pF/);
    const len = lenFor(C);
    const legacy = legacyRead(PH, new Map([["LEFT", len]]), "LEFT", { type: "flex" }, R);
    const out = keyRead("LEFT", R, C, PH.waitMech * 1e3);
    expect(out.cPf).toBe(legacy.Cpf);
    expect(Math.abs(out.tauUs - legacy.read.tauMs * 1e3)).toBeLessThanOrEqual(1e-12 * out.tauUs);
    expect(Math.abs(out.rejectOhm - legacy.read.reject)).toBeLessThanOrEqual(1e-9 * out.rejectOhm);
    expect(out.ok).toBe(legacy.read.ok);
    nearCard(out.tauUs, num(row[2]!, /tau ([\d.]+) us/), places(row[2]!, /tau ([\d.]+) us/));
    nearCard(out.settleUs, num(row[2]!, /settle ([\d.]+) us/), places(row[2]!, /settle ([\d.]+) us/));
    expect(out.settleTaus).toBe(num(row[2]!, /settleTaus (\d)/));
    expect(row[2]).toMatch(/, ok$/);
    expect(out.ok).toBe(true);
    expect(out.qualifier).toBe("computed");
  });

  test("PIP A key: reject at 200 us and at 3500 us", () => {
    const row200 = cardRow("PIP A key, wait 200 us");
    const R = num(row200[1]!, /R (\d+) ohm/);
    const C = num(row200[1]!, /C ([\d.]+) pF/);
    const legacy = legacyRead(PH, new Map([["A", lenFor(C)]]), "A", { type: "flex" }, R);
    const at200 = keyRead("A", R, C, 200);
    expect(Math.abs(at200.rejectOhm - legacy.read.reject)).toBeLessThanOrEqual(1e-9 * at200.rejectOhm);
    nearCard(at200.rejectOhm / 1e6, num(row200[2]!, /reject ([\d.]+) Mohm/), places(row200[2]!, /reject ([\d.]+) Mohm/));
    const row3500 = cardRow("PIP A key, wait 3500 us");
    const at3500 = keyRead("A", R, C, 3500);
    nearCard(at3500.rejectOhm / 1e6, num(row3500[2]!, /reject ([\d.]+) Mohm/), places(row3500[2]!, /reject ([\d.]+) Mohm/));
    expect(at3500.acceptOhm).toBeUndefined();
  });

  test("PIP START touch, wait 1500 us: skin in series, 3 tau, reject and ok", () => {
    const row = cardRow("PIP START touch, wait 1500 us");
    const R = num(row[1]!, /R (\d+) ohm/);
    const C = num(row[1]!, /C ([\d.]+) pF/);
    expect(num(row[1]!, /skin (\d+) Mohm/) * 1e6).toBe(benchSkinOhm(profile).value);
    const legacy = legacyRead(PH, new Map([["START", lenFor(C)]]), "START", { type: "touch" }, R);
    const out = chargeReleaseRead({
      net: "START", pathOhm: touchPathOhm(R, benchSkinOhm(profile).value),
      nodePf: nodeCapPf(rp2040.inputCap.value, lenFor(C), { perMmPf: 0.02, fixedPf: 1 }), settleTaus: SETTLE_TAUS.touch,
      emit: { value: PH.waitTouch * 1e3, unit: "us", qualifier: "inferred", basis: "inferred" }, leakNa: rp2040.leakage.value,
    });
    expect(out.cPf).toBe(legacy.Cpf);
    expect(Math.abs(out.tauUs - legacy.read.tauMs * 1e3)).toBeLessThanOrEqual(1e-12 * out.tauUs);
    expect(Math.abs(out.rejectOhm - legacy.read.reject)).toBeLessThanOrEqual(1e-9 * out.rejectOhm);
    expect(out.ok).toBe(legacy.read.ok);
    nearCard(out.rejectOhm / 1e6, num(row[2]!, /reject ([\d.]+) Mohm/), places(row[2]!, /reject ([\d.]+) Mohm/));
    expect(row[2]).toMatch(/, ok$/);
    expect(out.ok).toBe(true);
    expect(out.acceptOhm).toBe(out.rejectOhm);
  });

  test("PIP LEFT crossing of RP2040 VIL from 3.3 V", () => {
    const row = cardRow("PIP LEFT crossing");
    const R = num(row[1]!, /R (\d+)/);
    const C = num(row[1]!, /C ([\d.]+)/);
    expect(row[0]).toContain(`VIL ${String(rp2040.vilMaxV)} V from ${String(rp2040.vddV)} V`);
    const us = rcCrossingUs({ ohm: R, capPf: C, vDrive: rp2040.vddV, vRet: 0, vThreshold: rp2040.vilMaxV });
    nearCard(us, num(row[2]!, /([\d.]+) us/), places(row[2]!, /([\d.]+) us/));
  });

  test("the PIP read record carries the emitted, computed and shipped waits with qualifiers and sources", () => {
    const line = T05.slice(T05.indexOf("- The read record for PIP"), T05.indexOf("- `npx -y -p typescript"));
    const emitUs = num(line, /`wait\.emit` (\d+) us inferred/);
    const shippedUs = num(line, /`wait\.firmwareShipped` (\d+) us unknown/);
    const computedUs = num(line, /`wait\.computed` (\d+) us computed/);
    const decl: ReadModel = { model: "charge-release", drive: "high", driveUs: 30, waitUs: emitUs, waitSource: "default" };
    const emit = emitWait(decl);
    const shipped = shippedWait(shippedUs, "pip-controller firmware/pip/pip.ino:20 (D-080)");
    const row = cardRow("PIP LEFT key, wait 200 us");
    const C = num(row[1]!, /C ([\d.]+) pF/);
    const out = chargeReleaseRead({
      net: "LEFT", pathOhm: num(row[1]!, /R (\d+) ohm/), nodePf: nodeCapPf(7, lenFor(C), { perMmPf: 0.02, fixedPf: 1 }),
      settleTaus: SETTLE_TAUS.key, emit, shipped, leakNa: 1,
    });
    expect(out.wait.emit).toMatchObject({ value: emitUs, unit: "us", qualifier: "inferred", basis: "inferred" });
    expect(out.wait.emit.source).toContain("pip_stick.ino:25");
    expect(line).toContain("(pip_stick.ino:25)");
    expect(out.wait.computed).toMatchObject({ unit: "us", qualifier: "computed" });
    expect(Math.round(out.wait.computed.value)).toBe(computedUs);
    expect(out.wait.firmwareShipped).toMatchObject({ value: shippedUs, unit: "us", qualifier: "unknown", basis: null });
    expect(out.wait.firmwareShipped?.source).toContain("pip.ino:20");
    expect(line).toContain("(pip.ino:20)");
    // the bench default PIP's model reads equals the wait pip.ino ships
    expect(PH.waitMech * 1e3).toBe(shippedUs);
    expect(out.ok).toBe(true);
    // a coupon wait carries no qualifier before its row exists
    expect(emitWait({ ...decl, waitSource: "coupon" }).qualifier).toBe("unknown");
  });

  test("a wait in the wrong unit is refused", () => {
    expect(() => chargeReleaseRead({
      net: "X", pathOhm: 1e6, nodePf: 9, settleTaus: 5, emit: { value: 3.5, unit: "ms", qualifier: "inferred", basis: "inferred" }, leakNa: 1,
    })).toThrow(/must be in us/);
  });
});

// ---- pullup: the BOSS button through 10 mm cPLA wires ----

interface Scene {
  network: {
    nodeCount: number; ground: number; nodes: string[];
    resistors: { a: number; b: number; ohm: number; tag: string }[];
    leds: unknown[];
    sources: { pos: number; neg: number; volts: number; tag: string }[];
  };
  boss: { pins: { pin: string; node: number; v: number; mode: string }[] };
  button: { lenMm: number; core: string; shape: string; pressed: boolean };
}

describe("pullup read on the BOSS button scene", () => {
  const scene = JSON.parse(readFileSync(new URL("./fixtures/boss-scenes/button-cpla-straight-010.json", import.meta.url), "utf8")) as Scene;
  const pin = scene.boss.pins.find((p) => p.mode === "PULLUP");
  if (pin === undefined) throw new Error("scene has no PULLUP pin");
  const pullup = scene.network.resistors.find((r) => r.tag === `pullup ${pin.pin}`)!;
  const vio = scene.network.sources.find((s) => s.tag === "vio")!;
  const solveWith = (pu: number | null): number => {
    const elements: DcElement[] = [
      ...scene.network.resistors.filter((r) => r !== pullup || pu !== null)
        .map((r): DcElement => ({ kind: "resistor", a: r.a, b: r.b, ohm: r === pullup ? pu! : r.ohm })),
      ...scene.network.sources.map((v): DcElement => ({ kind: "vsource", pos: v.pos, neg: v.neg, volts: v.volts })),
    ];
    return solveDc({ nodeCount: scene.network.nodeCount, ground: scene.network.ground, elements }).volts[pin.node]!;
  };
  // Thevenin of the pressed path seen from the pin, over the same linear network.
  const vth = solveWith(null);
  const v1 = solveWith(pullup.ohm);
  const pathOhm = (pullup.ohm * (v1 - vth)) / (vio.volts - v1);

  test("the scene is the card's: cPLA, straight, 10 mm, pressed, BOSS 50 kohm", () => {
    expect(scene.button).toMatchObject({ core: "cpla", shape: "straight", lenMm: 10, pressed: true });
    expect(pullup.ohm).toBe(50000);
    expect(scene.network.leds).toEqual([]);
    expect(Math.abs(vth)).toBeLessThan(1e-6);
  });

  test("rp2040 reads UNDEFINED at both pullup ends", () => {
    const row = cardRow("BOSS button through 10 mm cPLA wires");
    expect(row[0]).toContain("rp2040");
    const out = pullupRead({ net: pin.pin, pathOhm, mcu: rp2040, active: "low" });
    expect(out.op.pressed.map((r) => r.pullupOhm)).toEqual([50000, 80000]);
    expect(row[2]).toBe("UNDEFINED at both pullup ends");
    expect(out.op.pressed.map((r) => r.state)).toEqual(["UNDEFINED", "UNDEFINED"]);
    expect(out.op.released.map((r) => r.state)).toEqual(["HIGH", "HIGH"]);
    expect(out.op.distinguishable).toBe(false);
    // BOSS's own pin reading at 50 kohm, and the M05-T07 table at 80 kohm
    expect(Math.abs(out.op.pressed[0]!.volts - pin.v)).toBeLessThan(1e-6);
    const t07 = T07.split("\n").find((l) => l.startsWith("| cPLA 10 mm |"))!.split("|").map((c) => c.trim());
    nearCard(out.op.pressed[1]!.volts, Number(t07[6]!.split(" ")[0]), 3);
    expect(t07[6]).toContain("UNDEFINED");
    expect(out.tauUs.map((t) => t.tauUs)).toEqual([50000 * 7e-6, 80000 * 7e-6]);
  });

  test("an active-high pullup read is refused", () => {
    expect(() => pullupRead({ net: "X", pathOhm: 1e3, mcu: rp2040, active: "high" })).toThrow(/active high/);
  });
});

// ---- adc: BOSS's wire verdict bands ----

describe("adc bands follow BOSS parts.js line 426", () => {
  const line = read("designs/blocks/legacy/boss-src/src/parts.js").split("\n")[425]!;
  const m = line.match(/R < (1e\d) \? 'signal and ADC fine' : R < (1e\d) \? 'digital fine, ADC needs a (\d+) nF at the pin'/);
  if (m === null) throw new Error("parts.js line 426 holds no verdict");
  const [lo, hi, nf] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const decl = { model: "adc", bits: 12, samples: 1, refV: 3.3 } as const;
  const at = (ohm: number) => adcRead({ net: "W", sourceOhm: ohm, read: decl, profile });

  test("the line, the ceiling and the hold capacitor", () => {
    expect(at(lo - 1).band).toBe("fine");
    expect(at(lo - 1).ok).toBe(true);
    expect(at(lo).band).toBe("hold-cap");
    expect(at(lo).holdCapNf?.value).toBe(nf);
    expect(at(hi - 1).band).toBe("hold-cap");
    expect(at(hi).band).toBe("digital-only");
    expect(at(hi).holdCapNf).toBeNull();
    expect(at(hi).ok).toBe(false);
    expect(at(lo).qualifier).toBe("computed");
    expect(at(lo).lsbV).toBe(3.3 / 4095);
    expect(fullScaleCounts(10)).toBe(1023);
  });
});

// ---- ratiometric, ladder and column-scan: computed, this card ----

describe("ratiometric (computed, this card)", () => {
  test("the pull-down floor is max(1 Mohm, 20 Rsrc)", () => {
    const rule = { ratio: 20, minOhm: 1e6 };
    expect(pulldownFloorOhm(10e3, rule)).toBe(1e6);
    expect(pulldownFloorOhm(226e3, rule)).toBe(4.52e6);
    const decl = { model: "ratiometric", pair: ["V1", "V2"] } as const;
    const tight = ratiometricRead({ read: decl, sourceOhm: 226e3, pulldownOhm: 4.5e6, profile });
    expect(tight.floorOhm).toBe(4.52e6);
    expect(tight.ok).toBe(false);
    expect(ratiometricRead({ read: decl, sourceOhm: 226e3, pulldownOhm: 4.52e6, profile }).ok).toBe(true);
    expect(ratiometricRead({ read: decl, sourceOhm: 226e3, profile }).ok).toBe(true);
  });

  test("a swapped pair cancels a series factor", () => {
    // track 0.25 of the way, any series skin scales both readings by the same k
    for (const k of [1, 0.4, 0.05]) {
      const p = swappedPair(0.25 * 3.3 * k, 0.75 * 3.3 * k);
      expect(p.position).toBeCloseTo(0.25, 15);
      expect(p.sumV).toBeCloseTo(3.3 * k, 15);
    }
  });
});

describe("ladder (computed, this card)", () => {
  // FEELER's closed form over one mean step R: Rup = k R, Rdn = (N - k) R.
  const closed = (n: number, r: number, rpd: number, rc: number): number[] => {
    const out: number[] = [];
    for (let k = 0; k < n; k += 1) {
      const rl = rc + rpd;
      const rdn = (n - k) * r;
      const rpar = (rdn * rl) / (rdn + rl);
      out.push(rpar / (k * r + rpar));
    }
    return [...out, 0];
  };

  test("equal steps reproduce FEELER's levels and the smallest step in counts", () => {
    const steps = Array.from({ length: 12 }, () => 10e3);
    const lv = ladderLevels(steps, 100e3, 4000);
    const want = closed(12, 10e3, 100e3, 4000);
    lv.forEach((v, i) => expect(Math.abs(v - want[i]!)).toBeLessThanOrEqual(1e-15));
    const out = ladderRead({ net: "OUT", read: { model: "ladder", stepsOhm: steps, bits: 10 }, pulldownOhm: 100e3, vccV: 3.3, profile });
    expect(out.leadOhm.value).toBe(4000);
    let sep = Infinity;
    for (let k = 0; k < want.length - 1; k += 1) sep = Math.min(sep, Math.abs(want[k]! - want[k + 1]!));
    expect(Math.abs(out.minStepCounts - sep * 1023)).toBeLessThanOrEqual(1e-9);
    expect(out.ok).toBe(out.minStepCounts >= 25);
    expect(out.chainAmps).toBeCloseTo(3.3 / 120e3, 15);
  });

  test("a long chain on a small pull-down falls under the 25 count floor", () => {
    const steps = Array.from({ length: 64 }, () => 10e3);
    const out = ladderRead({ net: "OUT", read: { model: "ladder", stepsOhm: steps, bits: 10 }, pulldownOhm: 10e3, vccV: 3.3, profile });
    expect(out.minStepFloor.value).toBe(25);
    expect(out.minStepCounts).toBeLessThan(25);
    expect(out.ok).toBe(false);
  });
});

describe("column-scan (computed, this card)", () => {
  const c3 = mcuPinRow("esp32-c3");
  const decl = { model: "column-scan", rows: ["DRIVE1", "DRIVE2"], cols: ["SENSEA", "SENSEB"], settleUs: 100 } as const;

  test("a 10 kohm key reads HIGH over a 45 kohm pull-down; a 300 kohm skin bridge does not", () => {
    const firm = columnScan({ read: decl, keyOhm: 10e3, pulldownOhm: [45e3], mcu: c3 });
    expect(firm.pressed[0]!.volts).toBeCloseTo((c3.vddV * 45e3) / 55e3, 12);
    expect(firm.pressed[0]!.state).toBe("HIGH");
    expect(firm.released[0]!.state).toBe("LOW");
    expect(firm.distinguishable).toBe(true);
    expect(firm.settleNeededUs).toBeCloseTo(5 * 45e3 * 7e-6, 12);
    expect(firm.ok).toBe(true);
    const skin = columnScan({ read: decl, keyOhm: 300e3, pulldownOhm: [45e3], mcu: c3 });
    expect(skin.pressed[0]!.state).toBe("LOW");
    expect(skin.distinguishable).toBe(false);
    expect(skin.ok).toBe(false);
  });

  test("a settle shorter than five time constants fails", () => {
    const short = columnScan({ read: { ...decl, settleUs: 1 }, keyOhm: 10e3, pulldownOhm: [45e3], mcu: c3 });
    expect(short.ok).toBe(false);
  });
});

describe("charge-release edges (M05 audit)", () => {
  const read = (emitUs: number, settleTaus: 3 | 5) => chargeReleaseRead({
    net: "n", pathOhm: 1722798, nodePf: 9.1095, settleTaus, emit: { value: emitUs, unit: "us", qualifier: "inferred", basis: "inferred" }, leakNa: 1,
  });

  test("a wait equal to the settle time is not ok; ok needs the wait past it (pip-controller model.js:420 to 428)", () => {
    const settle = read(3500, SETTLE_TAUS.key).settleUs;
    expect(read(settle, SETTLE_TAUS.key).ok).toBe(false);
    expect(read(settle * (1 + 1e-9), SETTLE_TAUS.key).ok).toBe(true);
  });

  test("acceptOhm is written for a touch read only, equal to its reject bound", () => {
    const touch = read(200, SETTLE_TAUS.touch);
    expect(touch.acceptOhm).toBe(touch.rejectOhm);
    expect("acceptOhm" in read(3500, SETTLE_TAUS.key)).toBe(false);
  });
});
