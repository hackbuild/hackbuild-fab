// drive.touch (plan v9 section 3.2: PIP touch pads): touch a pad and read
// what its charge-release pin sees. The numbers are the CHK-NET-29 read of
// each touch port on this build, the record packages/circuit
// chargeReleaseRead wrote through circuit.solve: the printed path, the
// bench skin in series, the node capacitance, the settle taus and the
// wait. Tau, settle and the pin level follow the circuit equations the
// drive pad already holds (src/drive/drive.ts chargeReleaseLevels, held to
// circuit floatPoint by drive.test.ts); this file adds none of its own.
// A port counts as a touch pad when the check priced a skin on it, so the
// pad set is the check's, never a second guess from the features.
//
// The pin is driven away from its active level and floats, so the rail a
// closed path returns to is the active level: a pad driven low returns to
// VDD (PIP touch, 3V3) and one driven high returns to ground (the
// ReadModel charge-release drive field, spec/circuit.ts).

import type { CheckResult, HookupDecl, PinState, Qualifier, WidgetDecl } from "@hackbuild/spec";
import { READ_CHECK, chargeReleaseLevels, pinRow, type ChargeRelease } from "../drive/drive.js";
import { fmt } from "../bench/locate.js";
import { liveOutputs } from "./live.js";
import type { WidgetEntry, WidgetModel } from "./registry.js";

/** The function drive.touch reads: the charge-release check (WidgetDecl.fn). */
export const TOUCH_FN = READ_CHECK;

/** What one charge-release pin reads now, open or closed. */
export interface ChargeReadNow {
  readonly port: string;
  readonly pin: string;
  readonly mcu: string;
  /** True when the check priced a skin on the path: a touch pad. */
  readonly touch: boolean;
  /** True while the pad is touched or the key held. */
  readonly closed: boolean;
  /** Printed path without the skin, ohm, computed. */
  readonly pathOhm: number;
  /** Skin in series for a touch pad, ohm, from the profile row the check read; 0 for a key. */
  readonly skinOhm: number;
  /** The closed path the floating pin discharges through, ohm, computed: path plus skin. */
  readonly rOhm: number;
  readonly cPf: number;
  readonly settleTaus: number;
  /** rOhm x cPf, us, computed. */
  readonly tauUs: number;
  /** settleTaus x tau, us, computed. */
  readonly settleUs: number;
  /** Float and wait before the read, us, qualified by waitQualifier. */
  readonly waitUs: number;
  readonly waitQualifier: string;
  /** Largest path the wait settles, ohm, computed. */
  readonly rejectOhm: number;
  /** The wait outlasts the settle. */
  readonly ok: boolean;
  /** Pin voltage at the read, V, computed; null when the catalog has no thresholds for the MCU. */
  readonly volts: number | null;
  readonly level: PinState | null;
  /** Qualifier of the check's read (circuit ReadOutputs.qualifier). */
  readonly qualifier: Qualifier;
}

const num = (x: unknown): number | null => (typeof x === "number" && Number.isFinite(x) ? x : null);
const str = (x: unknown): string | null => (typeof x === "string" && x !== "" ? x : null);

/** The charge-release read of one hookup port on this build, or why there is none. */
export function chargeReadNow(port: string, hookup: readonly HookupDecl[], results: readonly CheckResult[], closed: boolean): ChargeReadNow | string {
  const entry = hookup.find((h) => h.port === port);
  if (entry === undefined) return `no hookup entry reads ${port}`;
  if (entry.read.model !== "charge-release") return `${entry.pin} reads by ${entry.read.model}, not charge-release`;
  const read: ChargeRelease = entry.read;
  const r = results.find((x) => x.id === READ_CHECK && x.extra?.["port"] === port);
  const x = r?.extra ?? {};
  const pathOhm = num(x["pathOhm"]), cPf = num(x["cPf"]), taus = num(x["settleTaus"]), waitUs = num(x["waitUs"]), rejectOhm = num(x["rejectOhm"]);
  if (r === undefined || pathOhm === null || cPf === null || taus === null || waitUs === null || rejectOhm === null) {
    return `${READ_CHECK} has no read of ${port} in this build. build the design first.`;
  }
  const skinOhm = num(x["skinOhm"]) ?? 0;
  const rOhm = pathOhm + skinOhm;
  const tauUs = rOhm * cPf * 1e-6;
  const settleUs = taus * tauUs;
  const mcu = str(x["mcu"]) ?? entry.mcu;
  const row = pinRow(mcu);
  const levels = row === null ? null : chargeReleaseLevels(row, { drive: read.drive, waitUs }, rOhm, cPf, read.drive === "low" ? row.vddV : 0);
  const q = str(x["qualifier"]);
  return {
    port, pin: str(x["pin"]) ?? entry.pin, mcu, touch: num(x["skinOhm"]) !== null, closed,
    pathOhm, skinOhm, rOhm, cPf, settleTaus: taus, tauUs, settleUs, waitUs, waitQualifier: str(x["waitQualifier"]) ?? "unknown",
    rejectOhm, ok: waitUs > settleUs,
    volts: levels === null ? null : closed ? levels.pressedV : levels.releasedV,
    level: levels === null ? null : closed ? levels.pressed : levels.released,
    qualifier: (q ?? "unknown") as Qualifier,
  };
}

/** Touch ports of this build: every port the charge-release check priced a skin on, in result order. */
export function touchPorts(results: readonly CheckResult[]): string[] {
  const out: string[] = [];
  for (const r of results) {
    const port = r.id === READ_CHECK ? str(r.extra?.["port"]) : null;
    if (port !== null && num(r.extra?.["skinOhm"]) !== null && !out.includes(port)) out.push(port);
  }
  return out;
}

export interface TouchModel extends WidgetModel {
  /** One read per touch pad, open or touched. */
  readonly pads: readonly ChargeReadNow[];
}

const byPort = <T>(pads: readonly ChargeReadNow[], f: (p: ChargeReadNow) => T): Record<string, T> => Object.fromEntries(pads.map((p) => [p.port, f(p)]));

function refusal(decl: WidgetDecl, problem: string): TouchModel {
  return { id: decl.id, kind: decl.kind, outputs: {}, problem, pads: [] };
}

export const driveTouch: WidgetEntry<TouchModel> = {
  model(decl, build) {
    if (decl.fn !== TOUCH_FN) return refusal(decl, `widget fn ${decl.fn} is not ${TOUCH_FN}; drive.touch reads the charge-release check`);
    const ports = touchPorts(build.results);
    if (ports.length === 0) return refusal(decl, `${READ_CHECK} read no touch pad in this build. build the design first.`);
    const closed = new Set(build.closed ?? []);
    const reads = ports.map((p) => chargeReadNow(p, build.hookup, build.results, closed.has(p)));
    const missing = reads.filter((r): r is string => typeof r === "string");
    const pads = reads.filter((r): r is ChargeReadNow => typeof r !== "string");
    const outputs: Record<string, unknown> = {
      pads: pads.map((p) => p.port),
      touched: byPort(pads, (p) => p.closed),
      pin: byPort(pads, (p) => p.pin),
      rOhm: byPort(pads, (p) => p.rOhm),
      tauUs: byPort(pads, (p) => p.tauUs),
      settleUs: byPort(pads, (p) => p.settleUs),
      waitUs: byPort(pads, (p) => p.waitUs),
      ok: byPort(pads, (p) => p.ok),
      volts: byPort(pads, (p) => p.volts),
      level: byPort(pads, (p) => p.level),
      qualifier: byPort(pads, (p) => ({ rOhm: p.qualifier, tauUs: p.qualifier, settleUs: p.qualifier, waitUs: p.waitQualifier, volts: p.qualifier, level: p.qualifier })),
    };
    return { id: decl.id, kind: decl.kind, outputs, problem: missing.length > 0 ? missing.join("; ") : null, pads };
  },
  liveness: liveOutputs,
};

/** One readout line per pad: pin, level, the path and the timing, each number with its qualifier. */
export function touchLine(p: ChargeReadNow): string {
  const level = p.level === null ? `level unknown, ${p.mcu} has no pin thresholds in the catalog` : `${p.level} at ${fmt(p.volts as number)} V ${p.qualifier}`;
  const path = p.closed
    ? `path ${fmt(p.rOhm / 1e6)} Mohm with skin ${p.qualifier}, tau ${fmt(p.tauUs)} us, settle ${fmt(p.settleUs)} us ${p.qualifier}`
    : "open, leakage droop only";
  const slow = p.ok ? "" : `; wait ${fmt(p.waitUs)} us is shorter than the settle, raise read.waitUs`;
  return `${p.pin} ${p.closed ? "touched" : "idle"}: ${level}, ${path}, wait ${fmt(p.waitUs)} us ${p.waitQualifier}${slow}`;
}
