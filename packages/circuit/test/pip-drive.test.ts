// M05-T11: PIP drive readouts from circuit and the read model. Three
// independent sources hold the port: the card's acceptance table and
// summary line (docs/plan/milestones/M05-circuit-copper.md, parsed below),
// the bench rows PIP b137deb computed (packages/circuit/test/fixtures/
// pip-b137deb-elec.json, written by tools/legacy/pip/dump-elec.mjs), and
// PIP's own read lines, src/model.js lines 418 to 429, evaluated from the
// vendored copy in designs/pip/legacy/src. The default-mode lengths are
// the M05-T08 golden (packages/copper/test/golden/pip-b137deb-default.json)
// plus the terminal stubs, which depend on the terminals and the grid only
// (router.js), never on the history mode.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { planCard } from "../../../tools/test-support/plan-root.js";
import { mcuPinRow } from "@hackbuild/catalog";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import type { DriveSceneDecl, HookupDecl } from "@hackbuild/spec";
import {
  chargePort, crossingUs, driveKeys, drivePortFeatures, loadSpice, rcCrossingUs, solveDriveScene, type ChargeHookup, type DriveKey,
} from "../src/index";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const read = (p: string): string => readFileSync(`${ROOT}${p}`, "utf8");
const CARD = planCard("M05-circuit-copper.md");
const T11 = CARD.slice(CARD.indexOf("## M05-T11"), CARD.indexOf("## M05-T12"));
const profile = createProfileLookup(loadProfile());
const rp2040 = mcuPinRow("rp2040");

interface Post { what: string; hMm: number; rMm: number; count: number }
interface ElecKey {
  id: string; pin: string; type: string; net: string; lenMm: number; routeLenMm: number; vias: number; posts: Post[]; RswOhm: number; common: string;
  parts: { RnOhm: number; extraOhm: number; commonOhm: number };
  bench: { R: number; C: number; tauUs: number; waitUs: number; ok: boolean; rejectOhm: number; settle?: number };
}
interface Elec {
  meta: { commit: string; qualifier: string };
  phys: { rhoC: number; rhoCz: number; rhoT: number; cpin: number; leak: number; waitMech: number; waitTouch: number };
  route: { w: number; post: number; via: number };
  stack: { trace: number; hPost: number; viaH: number };
  nets: { name: string; lenMm: number; stubMm: number; vias: number }[];
  commons: Record<string, { net: string; lenMm: number; posts: Post[]; ohm: number }>;
  keys: ElecKey[];
  droopV: number;
  rejectMinOhm: number;
}
const ELEC = JSON.parse(read("packages/circuit/test/fixtures/pip-b137deb-elec.json")) as Elec;
const DEFAULT = JSON.parse(read("packages/copper/test/golden/pip-b137deb-default.json")) as {
  conflicts: number; unrouted: number; nets: { name: string; len: number; vias: unknown[] }[];
};

// ---- the card ----

interface CardRow { key: string; pin: string; type: string; R: number; C: number; tau: number; tauPlaces: number }
const CARD_ROWS: CardRow[] = T11.split("\n").filter((l) => /^\| [A-Z]+ \| GP\d+ \|/.test(l)).map((l) => {
  const c = l.split("|").slice(1, -1).map((x) => x.trim());
  const tau = /^([\d.]+)/.exec(c[5]!)![1]!;
  return { key: c[0]!, pin: c[1]!, type: c[2]!, R: Number(c[3]), C: Number(c[4]), tau: Number(tau), tauPlaces: tau.split(".")[1]!.length };
});
const summary = T11.slice(T11.indexOf("- Summary figures (computed)"), T11.indexOf("- With the default-mode route"));
const fig = (re: RegExp): number => Number(re.exec(summary.replace(/\s+/g, " "))![1]);

// ---- PIP's read lines, evaluated as PIP wrote them ----

const MODEL = read("designs/pip/legacy/src/model.js").split("\n");
const READ_LINES = MODEL.slice(417, 429).join("\n");
const legacyRead = new Function("Ph", "netLen", "id", "bi", "total", `${READ_LINES}\nreturn { Cpf, read };`) as (
  ph: Elec["phys"], netLen: Map<string, number>, id: string, bi: { type: string }, total: number,
) => { Cpf: number; read: { tauMs: number; wait: number; ok: boolean; reject: number; settle: number } };

/** A drive declaration over the fixture's own lengths: PIP's legacy route. */
function legacyDecl(lengthOf: (net: string) => number): DriveSceneDecl {
  return {
    material: "cpla",
    trace: { widthMm: ELEC.route.w, tMm: ELEC.stack.trace },
    terminal: { hMm: ELEC.stack.hPost, rMm: ELEC.route.post },
    via: { hMm: ELEC.stack.viaH, rMm: ELEC.route.via },
    route: "test",
    nets: ELEC.nets.map((n) => ({
      net: n.name, lengthMm: lengthOf(n.name), terminalPosts: 2, vias: n.vias,
      ...(n.name === "GND" ? { rail: "gnd" as const } : n.name === "3V3" ? { rail: "power" as const } : {}),
    })),
    keys: ELEC.keys.map((k) => ({
      port: `port.${k.id}`, interface: k.type === "touch" ? "touch" : "digital", net: k.net, return: k.common,
      posts: k.posts.filter((p) => p.what === "switch").map((p) => ({ id: `switch.${k.id}`, hMm: p.hMm, rMm: p.rMm, count: p.count })),
      contactOhm: k.RswOhm, ...(k.RswOhm > 0 ? { contactMaterial: "ctpu" } : {}), contactSource: "test",
    })),
  };
}
const legacyLength = (net: string): number => {
  const n = ELEC.nets.find((x) => x.name === net)!;
  return n.lenMm + n.stubMm;
};

/** The hookup PIP's bench reads: keys at waitMech, touch at waitTouch (layout.js:46). */
const benchHookup: HookupDecl[] = ELEC.keys.map((k) => ({
  port: `port.${k.id}`, mcu: "rp2040", pin: k.pin,
  read: k.type === "touch"
    ? { model: "charge-release", drive: "low", driveUs: 30, waitUs: ELEC.phys.waitTouch * 1e3, waitSource: "default" }
    : { model: "charge-release", drive: "high", driveUs: 30, waitUs: ELEC.phys.waitMech * 1e3, waitSource: "default" },
}));

const decl = legacyDecl(legacyLength);
const keys = driveKeys(decl, profile);
const solved = solveDriveScene({ decl, hookup: benchHookup, profile, mcu: (id) => mcuPinRow(id) });
const keyOf = (id: string): DriveKey => keys.find((k) => k.net === id)!;
const chargeOf = (id: string) => solved.charges.find((c) => c.path.net === id)!;

test("the card table, the fixture and PIP's rows name the same ten keys, pins and types", () => {
  expect(ELEC.meta.commit).toBe("b137deb518229ea8910bfe85e6416d34cee353f3");
  expect(ELEC.meta.qualifier).toBe("computed by PIP b137deb");
  expect(CARD_ROWS.map((r) => [r.key, r.pin, r.type])).toEqual(ELEC.keys.map((k) => [k.id, k.pin, k.type]));
  expect(MODEL[417]).toContain("const Cpf = Ph.cpin + (netLen.get(id) || 0) * 0.02 + 1;");
});

test("the fixture's bench rows are PIP's read lines over its totals and lengths", () => {
  for (const k of ELEC.keys) {
    const legacy = legacyRead(ELEC.phys, new Map([[k.id, k.lenMm]]), k.id, { type: k.type }, k.bench.R);
    expect(legacy.Cpf, k.id).toBe(k.bench.C);
    expect(legacy.read.tauMs * 1e3, k.id).toBe(k.bench.tauUs);
    expect(legacy.read.reject, k.id).toBe(k.bench.rejectOhm);
    expect(legacy.read.ok, k.id).toBe(k.bench.ok);
  }
});

test("the profile rows the path reads are PIP's phys constants", () => {
  expect(profile.resistivity("cpla", "along", "printed").ohmCm).toBe(ELEC.phys.rhoC);
  expect(profile.resistivity("cpla", "through", "printed").ohmCm).toBe(ELEC.phys.rhoCz);
  expect(profile.resistivity("ctpu", "bulk", "printed").ohmCm).toBe(ELEC.phys.rhoT);
  expect(rp2040.inputCap.value).toBe(ELEC.phys.cpin);
  expect(rp2040.leakage.value).toBe(ELEC.phys.leak);
  expect(profile.constant("stack.traceWidth").value).toBe(ELEC.route.w);
  expect(profile.constant("stack.trace").value).toBe(ELEC.stack.trace);
});

describe("legacy route lengths: every key equals the bench and the card", () => {
  test.each(CARD_ROWS.map((r) => [r.key, r] as const))("%s: R within 1 ohm, C exact, tau within 0.001 us", (id, row) => {
    const k = keyOf(id);
    const pip = ELEC.keys.find((x) => x.id === id)!;
    expect(Math.abs(k.totalOhm - pip.bench.R)).toBeLessThanOrEqual(1);
    expect(Math.abs(k.totalOhm - row.R)).toBeLessThanOrEqual(1);
    // PIP's parts, one by one: the net, the switch posts, the common
    expect(Math.abs(k.rnOhm - pip.parts.RnOhm)).toBeLessThanOrEqual(1e-9 * pip.parts.RnOhm);
    expect(Math.abs(k.extraOhm - pip.parts.extraOhm)).toBeLessThanOrEqual(1e-9 * Math.max(1, pip.parts.extraOhm));
    expect(Math.abs(k.commonOhm - pip.parts.commonOhm)).toBeLessThanOrEqual(1e-9 * pip.parts.commonOhm);
    expect(k.contactOhm).toBe(pip.RswOhm);
    const c = chargeOf(id);
    expect(c.read.cPf).toBe(pip.bench.C);
    expect(c.read.cPf.toFixed(3)).toBe(row.C.toFixed(3));
    expect(Math.abs(c.read.tauUs - pip.bench.tauUs)).toBeLessThanOrEqual(0.001);
    expect(Math.abs(c.read.tauUs - row.tau)).toBeLessThanOrEqual(0.5 * 10 ** -row.tauPlaces + 1e-12);
    expect(Math.abs(c.read.rejectOhm - pip.bench.rejectOhm)).toBeLessThanOrEqual(1e-9 * pip.bench.rejectOhm);
    expect(c.read.ok).toBe(pip.bench.ok);
    expect(c.read.settleTaus).toBe(pip.type === "touch" ? 3 : 5);
    expect(k.q).toEqual({ qualifier: "computed", basis: "inferred" });
  });

  test("touch rows carry the 20 Mohm bench skin; key rows none", () => {
    for (const r of CARD_ROWS) {
      const c = chargeOf(r.key);
      const skin = r.type === "touch" ? 20e6 : 0;
      expect(c.read.rOhm - keyOf(r.key).totalOhm).toBe(skin);
      expect(c.path.returnType).toBe(r.type === "touch" ? "power" : "gnd");
    }
    expect(T11).toContain("(with 20 Mohm skin)");
  });
});

describe("summary figures (computed, the card's line)", () => {
  const keyRows = CARD_ROWS.filter((r) => r.type !== "touch").map((r) => keyOf(r.key).totalOhm);
  const touchRows = CARD_ROWS.filter((r) => r.type === "touch").map((r) => keyOf(r.key).totalOhm);
  const slow = [...solved.charges].filter((c) => c.path.returnType === "gnd").sort((a, b) => b.read.tauUs - a.read.tauUs)[0]!;

  test("key paths 1.50 to 1.72 Mohm, touch paths 0.91 to 0.93 Mohm", () => {
    expect((Math.min(...keyRows) / 1e6).toFixed(2)).toBe(fig(/key paths ([\d.]+) to/).toFixed(2));
    expect((Math.max(...keyRows) / 1e6).toFixed(2)).toBe(fig(/key paths [\d.]+ to ([\d.]+) Mohm/).toFixed(2));
    expect((Math.min(...touchRows) / 1e6).toFixed(2)).toBe(fig(/touch paths ([\d.]+) to/).toFixed(2));
    expect((Math.max(...touchRows) / 1e6).toFixed(2)).toBe(fig(/touch paths [\d.]+ to ([\d.]+) Mohm/).toFixed(2));
  });

  test("slowest key tau 15.7 us, settle 78 us at 5 tau", () => {
    expect(slow.path.net).toBe("LEFT");
    expect(slow.read.tauUs.toFixed(1)).toBe(fig(/slowest key tau ([\d.]+) us/).toFixed(1));
    expect(Math.round(slow.read.settleUs)).toBe(fig(/settle ([\d.]+) us \(5 tau\)/));
    expect(slow.read.settleUs).toBe(5 * slow.read.tauUs);
  });

  test("key reject at 200 us 4.35 Mohm on A, equal to PIP's rejectMin", () => {
    const keyCharges = solved.charges.filter((c) => c.path.returnType === "gnd");
    const least = [...keyCharges].sort((a, b) => a.read.rejectOhm - b.read.rejectOhm)[0]!;
    expect(least.read.wait.emit.value).toBe(200);
    expect(least.path.net).toBe("A");
    expect((least.read.rejectOhm / 1e6).toFixed(2)).toBe(fig(/key reject at 200 us ([\d.]+) Mohm/).toFixed(2));
    expect(Math.abs(least.read.rejectOhm - ELEC.rejectMinOhm)).toBeLessThanOrEqual(1e-9 * ELEC.rejectMinOhm);
  });

  test("touch accepts under 58.4 Mohm at 1500 us", () => {
    const touch = solved.charges.filter((c) => c.path.returnType !== "gnd");
    const least = Math.min(...touch.map((c) => c.read.acceptOhm!));
    expect(touch.every((c) => c.read.wait.emit.value === 1500)).toBe(true);
    expect((least / 1e6).toFixed(1)).toBe(fig(/touch accepts under ([\d.]+) Mohm/).toFixed(1));
  });

  test("idle droop 0.21 V at 1 nA over 1.5 ms: PIP's figure over the pin's 7 pF; the read record's over the node", () => {
    // PIP divides by the pin capacitance alone (model.js line 433); the catalog row gives the same figure.
    const pinDroop = (rp2040.leakage.value * 1e-9 * ELEC.phys.waitTouch * 1e-3) / (rp2040.inputCap.value * 1e-12);
    expect(pinDroop).toBe(ELEC.droopV);
    expect(pinDroop.toFixed(2)).toBe(fig(/idle droop ([\d.]+) V/).toFixed(2));
    // The read record divides the same charge by the node capacitance, pin plus trace (charge-release.ts), so it reads lower.
    const sel = chargeOf("SELECT").read;
    expect(sel.idleDroopV).toBeCloseTo((1e-9 * 1500e-6) / (sel.cPf * 1e-12), 12);
    expect(sel.idleDroopV).toBeLessThan(pinDroop);
  });
});

describe("default-mode route of M05-T08", () => {
  const defaultLength = (net: string): number => DEFAULT.nets.find((n) => n.name === net)!.len + ELEC.nets.find((n) => n.name === net)!.stubMm;
  const dkeys = driveKeys(legacyDecl(defaultLength), profile);

  test("the golden route is clean and has the fixture's nets and vias", () => {
    expect([DEFAULT.conflicts, DEFAULT.unrouted]).toEqual([0, 0]);
    expect(DEFAULT.nets.map((n) => [n.name, n.vias.length])).toEqual(ELEC.nets.map((n) => [n.name, n.vias]));
  });

  test("the same ranges hold after rounding: keys 1.50 to 1.72, touch 0.91 to 0.93 Mohm", () => {
    const keysR = dkeys.filter((k) => k.returnNet === "GND").map((k) => k.totalOhm / 1e6);
    const touchR = dkeys.filter((k) => k.returnNet === "3V3").map((k) => k.totalOhm / 1e6);
    expect([Math.min(...keysR).toFixed(2), Math.max(...keysR).toFixed(2)]).toEqual(["1.50", "1.72"]);
    expect([Math.min(...touchR).toFixed(2), Math.max(...touchR).toFixed(2)]).toEqual(["0.91", "0.93"]);
  });

  test("per key, the default-mode path against the legacy one (computed, recorded)", () => {
    // Default mode lands every net on the legacy polylines for this layout, so each path agrees to rounding.
    for (const k of dkeys) expect(Math.abs(k.totalOhm - keyOf(k.net).totalOhm), k.net).toBeLessThanOrEqual(1e-6 * keyOf(k.net).totalOhm);
  });
});

describe("the drive read as declared and refused when malformed", () => {
  test("the ports: a signal port per key at its interface, a gnd and a power port for the commons", () => {
    const ports = drivePortFeatures(decl);
    expect(ports.filter((p) => p.type === "signal").map((p) => [p.id, p.interface])).toEqual(ELEC.keys.map((k) => [`port.${k.id}`, k.type === "touch" ? "touch" : "digital"]));
    expect(ports.filter((p) => p.type !== "signal").map((p) => [p.net, p.type])).toEqual([["GND", "gnd"], ["3V3", "power"]]);
  });

  test("the shipped key wait travels with the key reads, never the touch reads", () => {
    const s = solveDriveScene({ decl: { ...decl, shipped: { keyWaitUs: 200, source: "pip-controller firmware/pip/pip.ino:20 (D-080)" } }, hookup: benchHookup, profile, mcu: (id) => mcuPinRow(id) });
    expect(s.charges.filter((c) => c.read.wait.firmwareShipped !== undefined).map((c) => c.path.net)).toEqual(["UP", "DOWN", "LEFT", "RIGHT", "X", "B", "Y", "A"]);
    expect(s.charges.find((c) => c.path.net === "UP")!.read.wait.firmwareShipped).toMatchObject({ value: 200, qualifier: "unknown", basis: null });
  });

  test("touch waits cite TOUCH_WAIT_US and key waits KEY_WAIT_US", () => {
    expect(chargeOf("SELECT").read.wait.emit.source).toContain("pip_stick.ino:31");
    expect(chargeOf("UP").read.wait.emit.source).toContain("pip_stick.ino:25");
  });

  test("an unknown net, a repeated net, a priced contact with no row and a fractional post count are refused", () => {
    expect(() => driveKeys({ ...decl, keys: [{ ...decl.keys[0]!, return: "VBUS" }] }, profile)).toThrow(expect.objectContaining({ hbf: expect.objectContaining({ code: "E_REF" }) }));
    expect(() => driveKeys({ ...decl, nets: [...decl.nets, decl.nets[0]!] }, profile)).toThrow(expect.objectContaining({ hbf: expect.objectContaining({ code: "E_SCHEMA" }) }));
    const { contactMaterial: _drop, ...bare } = decl.keys[0]!;
    expect(() => driveKeys({ ...decl, keys: [bare] }, profile)).toThrow(/a priced contact names its row/);
    expect(() => driveKeys({ ...decl, nets: decl.nets.map((n) => (n.net === "UP" ? { ...n, vias: 0.5 } : n)) }, profile)).toThrow(expect.objectContaining({ hbf: expect.objectContaining({ code: "E_SCHEMA" }) }));
  });

  test("a hookup entry read by another model is reported unsolved", () => {
    const h: HookupDecl[] = [{ port: "port.UP", mcu: "rp2040", pin: "GP29", read: { model: "pullup", active: "low" } }];
    expect(solveDriveScene({ decl, hookup: h, profile, mcu: (id) => mcuPinRow(id) }).unsolved).toEqual([
      { port: "port.UP", reason: "read model pullup; a declared drive key is read by charge-release" },
    ]);
  });

  test("chargePort reads the same path the drive handed it", () => {
    const c = chargeOf("LEFT");
    const again = chargePort({ hookup: benchHookup[2] as ChargeHookup, port: { interface: "digital" }, mcu: rp2040, path: c.path, profile, unknown: false, source: "the declared PIP key path" });
    expect(again).toEqual(c);
  });
});

describe("eecircuit cross-check (M05-T01 engine)", () => {
  test("LEFT crosses 0.8 V at 22.24 us in ngspice, equal to the analytic value within 1e-6 relative", async () => {
    const c = chargeOf("LEFT");
    const vth = rp2040.vilMaxV;
    expect(T11).toMatch(/LEFT crosses 0\.8 V at 22\.24 us/);
    expect(vth).toBe(0.8);
    const spice = await loadSpice();
    const r = await spice.run({
      title: "pip drive left key charge release",
      elements: [
        { kind: "R", name: "1", a: "1", b: "0", ohm: c.read.rOhm },
        { kind: "C", name: "1", a: "1", b: "0", pf: c.read.cPf, icV: rp2040.vddV },
      ],
      analysis: { kind: "tran", stepUs: 0.01, stopUs: 60 },
    });
    const ng = crossingUs(r, "1", vth)!;
    const an = rcCrossingUs({ ohm: c.read.rOhm, capPf: c.read.cPf, vDrive: rp2040.vddV, vRet: 0, vThreshold: vth });
    expect(an.toFixed(2)).toBe("22.24");
    expect(ng.toFixed(2)).toBe("22.24");
    expect(Math.abs((ng - an) / an)).toBeLessThan(1e-6);
  }, 120_000);
});
