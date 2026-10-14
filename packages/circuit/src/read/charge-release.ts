// Charge-release read model (PIP), M05-T05 step 1 and 2, D-078 to D-080.
//
// Ported from pip-controller src/model.js lines 418 to 428 at b137deb
// (designs/pip/legacy/src/model.js, lineage
// pip.model/pip-controller-b137deb-release):
//   Cpf = cpin + len x 0.02 + 1                          (line 418)
//   touch: Rskin = 20e6 + total, ok when wait > 3 tau,
//          reject = wait / (3 Cpf)                       (lines 421 to 423)
//   keys:  tau = total Cpf, ok when wait > 5 tau,
//          reject = wait / (5 Cpf)                       (lines 425 to 428)
// The pin is driven away from its active level, floated, and read after the
// wait (firmware/pip_stick/pip_stick.ino lines 54 to 59). Every value here
// is computed; the waits travel as Qualified so the emitted wait (inferred,
// pip_stick.ino:25) and the published firmware's wait (unknown, pip.ino:20)
// never read as measured (D-007).
//
// The trace rule and the bench skin come from profile constants
// electrical.tracePfPerMm, electrical.tracePfFixed and electrical.skinOhm.hi
// (inferred rows over model.js:418 and :422); the pin capacitance and
// leakage come from the receiving catalog row (inputCap, leakage).

import type {
  Micros, Ohm, ProfileLookup, Qualification, Qualified, Qualifier, ReadModel, ReadOutputs, Volt,
} from "@hackbuild/spec";
import { qualifyRow } from "@hackbuild/spec";
import { circuitError } from "../path1d.js";
import { rcTauUs } from "../flex-switch.js";
import { rowValue } from "./rows.js";

export type ChargeReleaseRead = Extract<ReadModel, { model: "charge-release" }>;

/**
 * Settle criterion, time constants: a key read waits 5 tau and a touch read
 * 3 tau (pip-controller src/model.js:420 to 428). CHK-NET-29 reads this table.
 */
export const SETTLE_TAUS = { key: 5, touch: 3 } as const;

/** A Qualified value in `unit`, or E_SCHEMA naming what. */
export function expectUnit(q: Qualified, unit: string, what: string): number {
  if (q.unit !== unit) {
    throw circuitError({ code: "E_SCHEMA", path: `/${what}/unit`, got: q.unit, hint: `${what} must be in ${unit}` });
  }
  return q.value;
}

/** PIP's trace capacitance rule, read from profile: pF per mm of the key net and a fixed pF (model.js:418). */
export interface TraceCapRule {
  readonly perMmPf: Qualified;
  readonly fixedPf: Qualified;
}

export function traceCapRule(profile: ProfileLookup): TraceCapRule {
  return { perMmPf: rowValue(profile, "electrical.tracePfPerMm", "pF/mm"), fixedPf: rowValue(profile, "electrical.tracePfFixed", "pF") };
}

/**
 * Node capacitance of a read pin, pF: pin plus traceMm of key net at the
 * rule's pF per mm plus the rule's fixed pF, summed in model.js:418 order so
 * a value equals PIP's double for the same inputs.
 */
export function nodeCapPf(pinPf: number, traceMm: number, rule: { readonly perMmPf: number; readonly fixedPf: number }): number {
  return pinPf + traceMm * rule.perMmPf + rule.fixedPf;
}

/** The skin a touch read assumes, ohm: the hi end of the skin range, PIP's 20 Mohm bench figure (model.js:422). */
export function benchSkinOhm(profile: ProfileLookup): Qualified {
  return rowValue(profile, "electrical.skinOhm.hi", "ohm");
}

/** A touch path: the skin in series with the printed path, ohm (model.js:422 order). */
export const touchPathOhm = (pathOhm: Ohm, skinOhm: Ohm): Ohm => skinOhm + pathOhm;

/**
 * The wait the emitted firmware uses, unit "us". waitSource "default" is the
 * PIP emit default, a margin chosen above the crossings measured on a
 * printed stick (113 to 2431 us, pip-controller docs/electrical.md:147),
 * so it reads inferred (D-079); a coupon wait has no row before M05 ends.
 * A key drives high and waits KEY_WAIT_US (pip_stick.ino:25); a touch pad
 * drives low and waits TOUCH_WAIT_US (pip_stick.ino:31, pip_stick.ino:63
 * to 64), so the source follows the drive level.
 */
export function emitWait(read: ChargeReleaseRead): Qualified {
  if (read.waitSource === "default") {
    const line = read.drive === "low" ? "pip_stick.ino:31" : "pip_stick.ino:25";
    return { value: read.waitUs, unit: "us", source: `pip-controller firmware/pip_stick/${line} (D-079)`, ...qualifyRow("inferred") };
  }
  return { value: read.waitUs, unit: "us", source: "coupon wait row: outside the M-S slice", qualifier: "unknown", basis: null };
}

/**
 * The wait a published firmware ships when it differs from the emitted one,
 * unit "us", qualifier unknown: no measurement stands behind it. PIP: 200 us
 * at pip-controller firmware/pip/pip.ino:20 (D-080).
 */
export function shippedWait(waitUs: Micros, source: string): Qualified {
  return { value: waitUs, unit: "us", source, qualifier: "unknown", basis: null };
}

export interface ChargeReleaseInput {
  readonly net: string;
  /** Closed path the released pin discharges through, ohm (for touch, touchPathOhm). */
  readonly pathOhm: Ohm;
  /** Node capacitance, pF (nodeCapPf). */
  readonly nodePf: number;
  /** 5 for keys, 3 for touch (SETTLE_TAUS). */
  readonly settleTaus: 3 | 5;
  /** emitWait(read). */
  readonly emit: Qualified;
  /** shippedWait(...), when the published firmware differs. */
  readonly shipped?: Qualified;
  /** Pin leakage, nA (catalog row leakage). */
  readonly leakNa: number;
  /** Qualification and source of wait.computed; default computed from geometry and the named rows. */
  readonly computed?: { readonly q: Qualification; readonly source: string };
  /** Verdict qualifier; default computed. A path with an unpriced contact passes unknown. */
  readonly qualifier?: Qualifier;
}

/** The path that settles exactly at waitUs over settleTaus x tau at nodePf, ohm: wait / (settleTaus C). */
export const rejectOhmAt = (waitUs: Micros, settleTaus: number, nodePf: number): Ohm => (waitUs * 1e-6) / (settleTaus * nodePf * 1e-12);

/** The smallest whole microsecond wait whose reject bound holds pathOhm, us, and that bound, ohm (the CHK-NET-29 fix). */
export function settlingWait(pathOhm: Ohm, settleTaus: number, nodePf: number): { readonly waitUs: number; readonly rejectOhm: Ohm } {
  const waitUs = Math.ceil(settleTaus * rcTauUs(pathOhm, nodePf) - 1e-9);
  return { waitUs, rejectOhm: rejectOhmAt(waitUs, settleTaus, nodePf) };
}

/**
 * The per-net read record (spec/circuit.ts ReadOutputs). tau = R C, settle
 * at settleTaus x tau, ok when the emitted wait exceeds it, reject the path
 * that settles exactly at the wait: wait / (settleTaus C).
 */
export function chargeReleaseRead(i: ChargeReleaseInput): ReadOutputs {
  const tUs = expectUnit(i.emit, "us", "wait/emit");
  const tauUs: Micros = rcTauUs(i.pathOhm, i.nodePf);
  const settleUs: Micros = i.settleTaus * tauUs;
  const computed: Qualified = {
    value: settleUs, unit: "us",
    source: i.computed?.source ?? `${i.settleTaus} x tau over the path and node capacitance`,
    ...(i.computed?.q ?? { qualifier: "computed", basis: null }),
  };
  const rejectOhm: Ohm = rejectOhmAt(tUs, i.settleTaus, i.nodePf);
  const idleDroopV: Volt = (i.leakNa * 1e-9 * tUs * 1e-6) / (i.nodePf * 1e-12);
  return {
    net: i.net,
    rOhm: i.pathOhm,
    cPf: i.nodePf,
    tauUs,
    settleTaus: i.settleTaus,
    settleUs,
    wait: i.shipped === undefined ? { emit: i.emit, computed } : { emit: i.emit, computed, firmwareShipped: i.shipped },
    rejectOhm,
    ...(i.settleTaus === SETTLE_TAUS.touch ? { acceptOhm: rejectOhm } : {}),
    idleDroopV,
    ok: tUs > settleUs,
    qualifier: i.qualifier ?? "computed",
  };
}
