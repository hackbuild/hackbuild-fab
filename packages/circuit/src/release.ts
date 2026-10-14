// The M-S circuit slice, read half (M-S-T05): the charge-release operating
// point of each key net against the receiving pin's McuPinSpec (D-076,
// D-078, D-079). M05 completes the read models, the capacitance model and
// the contact rows.
//
// Charge-release (pip-controller firmware/pip_stick/pip_stick.ino:54 to 59):
// the pin is driven to `drive`, set to INPUT with no pull, and read after
// waitUs. A press joins the pin to the return net through the path, so the
// node decays as V(t) = Vret + (Vdrive - Vret) exp(-t / tau), tau = R C. A
// released pin holds its charge less the leakage droop I t / C.
//
// Node capacitance here is the pin's inputCap only (7 pF, inferred,
// pip-controller src/layout.js:46 cpin). Trace capacitance stays unknown
// until M05, and no ContactRow exists, so tau and settle are lower bounds and
// every read verdict carries qualifier unknown while the parts that are
// computed carry computed.
//
// The pullup sweep (D-076: both ends of the range) is the case
// pip-controller docs/electrical.md:164 warns of, a core that enables the
// internal pull on INPUT. With the pull on, a pressed pin settles at the
// divider R / (R + Rpu) of the supply and the press can read HIGH.

import type {
  BuildWarning, ContactElement, HookupDecl, McuPinSpec, Micros, NetResistance, Ohm, OperatingPoint, PartDraft,
  PinReading, ProfileLookup, Qualification, Qualified, ReadOutputs, Tier, Volt,
} from "@hackbuild/spec";
import { qualify, qualifyRow } from "@hackbuild/spec";
import { circuitError, conductorGraph, pressedPath, type PathLeg, type PressedPath } from "./path1d.js";
import { rcCrossingUs, rcTauUs } from "./flex-switch.js";
import { SETTLE_TAUS, chargeReleaseRead, emitWait, expectUnit, type ChargeReleaseRead } from "./read/charge-release.js";
import { classify, distinguishable, dividerV, pullupEnds } from "./read/pullup.js";

export { SETTLE_TAUS, classify, pullupEnds };
export type { ChargeReleaseRead };

/** Settle criterion for a key, time constants. */
export const KEY_SETTLE_TAUS = SETTLE_TAUS.key;

const tierOf = (q: Qualified): Tier | null => q.basis;

const qv = (value: number, unit: string, q: Qualification, source: string): Qualified => ({ value, unit, source, ...q });

/** Every printed-key contact on the path, each priced from a ContactRow or unknown. */
function pathContacts(
  path: PressedPath, part: PartDraft, profile: ProfileLookup, leadKind: "clip",
): { readonly elements: ContactElement[]; readonly tiers: Tier[] } {
  const tiers: Tier[] = [];
  const keyLead = path.legs[0];
  const returnLead = path.legs[path.legs.length - 1];
  const cap = part.bodies.find((b) => b.role === "flex-conductor");
  const element = (at: string, a: string, b: string, kind: ContactElement["kind"]): ContactElement => {
    const row = profile.contact(a, b, kind);
    if (row === null) return { at, kind, row: null, ohm: null, qualifier: "unknown" };
    tiers.push(row.provenance.tier);
    return { at, kind, row: row.id, ohm: [row.ohm[0], row.ohm[1]], qualifier: qualifyRow(row.provenance.tier).qualifier };
  };
  const material = (leg: PathLeg | undefined): string =>
    leg === undefined ? "unknown" : (part.features.find((f) => f.id === leg.conductor && f.kind === "conductor") as { material?: string } | undefined)?.material ?? "unknown";
  const capMaterial = cap?.material ?? "unknown";
  const keySide = path.legs.find((l) => l.conductor === path.contact.a || l.conductor === path.contact.b);
  const otherSide = [...path.legs].reverse().find((l) => l.conductor === path.contact.a || l.conductor === path.contact.b);
  const elements = [
    element(path.terminals[0], material(keyLead), "metal", leadKind),
    element(`${keySide?.conductor ?? path.contact.a}|${cap?.id ?? path.contact.id}`, material(keySide), capMaterial, "press"),
    element(`${cap?.id ?? path.contact.id}|${otherSide?.conductor ?? path.contact.b}`, capMaterial, material(otherSide), "press"),
    element(path.terminals[1], material(returnLead), "metal", leadKind),
  ];
  return { elements, tiers };
}

/** One key net's charge-release result: path, contacts, capacitance, read outputs and operating points. */
export interface KeyNetPoint {
  readonly net: string;
  readonly port: string;
  readonly mcu: string;
  readonly pin: string;
  readonly path: NetResistance;
  /** Per-conductor legs of the 1D path, key lead first. */
  readonly legs: readonly PathLeg[];
  /** Sum of the legs, ohm, qualifier computed over the resistivity rows. A lower bound while contacts are unpriced. */
  readonly pathOhm: Qualified;
  /** Terminal and cap interfaces in path order; ohm null where no ContactRow exists. */
  readonly contacts: readonly ContactElement[];
  readonly unpricedContacts: readonly string[];
  /** Bulk resistance of the flex cap between the two contact halves, ohm: unknown until a coupon (the cap is no declared conductor). */
  readonly capOhm: Qualified;
  /** Pin input capacitance, pF, from McuPinSpec.inputCap. */
  readonly pinPf: Qualified;
  /** Trace capacitance, pF: unknown until M05. */
  readonly tracePf: Qualified;
  /** RC time constant over pathOhm and pinPf, us: a lower bound. */
  readonly tau: Qualified;
  /** Time for the pressed pin to cross VIL max from the drive level, us: a lower bound. */
  readonly crossing: Qualified;
  /** Ohm the unpriced contacts and cap may add before the path stops settling inside the wait: rejectOhm minus pathOhm. */
  readonly headroomOhm: Qualified;
  readonly read: ReadOutputs;
  /** The read as declared: float with no pull, so each reading's pullupOhm is null (D-225). */
  readonly op: OperatingPoint;
  /** The same read with the internal pull enabled during the float, at both ends of the pullup range. */
  readonly pullSweep: OperatingPoint;
}

export interface SolveKeysInput {
  readonly part: PartDraft;
  readonly hookup: readonly HookupDecl[];
  readonly profile: ProfileLookup;
  /** McuPinSpec by catalog id: the catalog mcuPinRow (M05-T02, D-076). */
  readonly mcu: (id: string) => McuPinSpec;
  /** How the leads are wired; the flex-pair default is clip pads. */
  readonly leadKind?: "clip";
}

export interface SolveKeysOutput {
  readonly points: readonly KeyNetPoint[];
  readonly warnings: readonly BuildWarning[];
}

/** Pin voltage at time t of a float from v0 toward vInf with time constant tauUs. */
const decay = (v0: Volt, vInf: Volt, tUs: Micros, tauUs: Micros): Volt => vInf + (v0 - vInf) * Math.exp(-tUs / tauUs);

const reading = (pullupOhm: Ohm | null, volts: Volt, mcu: McuPinSpec): PinReading => ({ pullupOhm, volts, state: classify(volts, mcu) });

export interface FloatPointInput {
  readonly net: string;
  readonly mcu: McuPinSpec;
  /** Pressed path to the return rail, ohm (ReadOutputs.rOhm). */
  readonly pathOhm: Ohm;
  readonly read: ChargeReleaseRead;
  /** Return rail voltage, V: 0 for a gnd return, VDD for a power return. */
  readonly vRetV: Volt;
  /** The read record of the same path (chargeReleaseRead): tau and idle droop. */
  readonly out: Pick<ReadOutputs, "tauUs" | "idleDroopV">;
  readonly qualifier: OperatingPoint["qualifier"];
}

/**
 * The declared charge-release read as an operating point: the pin floats
 * with no pull (pullupOhm null, D-225) from the drive level for waitUs.
 * Pressed, it decays toward the return rail with tau; released, it holds
 * the drive level less the leakage droop (pip_stick.ino:54 to 59).
 */
export function floatPoint(i: FloatPointInput): OperatingPoint {
  const vdd = i.mcu.vddV;
  const vDrive: Volt = i.read.drive === "high" ? vdd : 0;
  const released = i.read.drive === "high" ? Math.max(0, vDrive - i.out.idleDroopV) : Math.min(vdd, vDrive + i.out.idleDroopV);
  const pressed = [reading(null, decay(vDrive, i.vRetV, i.read.waitUs, i.out.tauUs), i.mcu)];
  const rel = [reading(null, released, i.mcu)];
  return {
    net: i.net, mcu: i.mcu.id, pathOhm: i.pathOhm, pressed, released: rel,
    distinguishable: distinguishable(pressed, rel), qualifier: i.qualifier,
  };
}

/** The charge-release outputs and operating points of one key path against one MCU. */
export function chargeRelease(
  path: PressedPath, read: ChargeReleaseRead, mcu: McuPinSpec, contacts: readonly ContactElement[], contactTiers: readonly Tier[],
): Omit<KeyNetPoint, "port" | "pin" | "legs" | "contacts" | "unpricedContacts" | "path"> {
  const net = path.keyNet;
  const unpriced = contacts.filter((c) => c.ohm === null).map((c) => c.at);
  // ReadOutputs.rOhm is the hi end of the total (spec/circuit.ts).
  const pricedHi = contacts.reduce((s, c) => s + (c.ohm?.[1] ?? 0), 0);
  const R: Ohm = path.resistance.preview.ohm + pricedHi;
  const pinPf = expectUnit(mcu.inputCap, "pF", "inputCap");
  const leakNa = expectUnit(mcu.leakage, "nA", "leakage");
  const capTier = tierOf(mcu.inputCap);
  const rTiers: (Tier | null)[] = [path.tier, ...contactTiers];

  const vdd = mcu.vddV;
  const vDrive: Volt = read.drive === "high" ? vdd : 0;
  const vRet: Volt = path.returnType === "gnd" ? 0 : path.returnType === "power" ? vdd : Number.NaN;
  if (Number.isNaN(vRet)) {
    throw circuitError({ code: "E_SCHEMA", path: `/features/${path.terminals[1]}/type`, got: path.returnType, hint: "a key returns to a gnd or power port" });
  }
  const emit = emitWait(read);
  const waitTier: Tier | null = emit.basis;
  const tUs = read.waitUs;

  const rq = qualify(rTiers);
  const tauQ = qualify([...rTiers, capTier]);
  const crossingUs = rcCrossingUs({ ohm: R, capPf: pinPf, vDrive, vRet, vThreshold: read.drive === "high" ? mcu.vilMaxV : mcu.vihMinV });
  const unknown: Qualification = { qualifier: "unknown", basis: null };
  const verdictQ = unpriced.length > 0 ? "unknown" : tauQ.qualifier;

  const readOut: ReadOutputs = chargeReleaseRead({
    net, pathOhm: R, nodePf: pinPf, settleTaus: KEY_SETTLE_TAUS, emit, leakNa,
    computed: { q: tauQ, source: `${KEY_SETTLE_TAUS} x tau over the 1D path and inputCap` },
    qualifier: verdictQ,
  });
  const { tauUs, rejectOhm } = readOut;

  // Declared read: no pull while floating.
  const opDone = floatPoint({ net, mcu, pathOhm: R, read, vRetV: vRet, out: readOut, qualifier: verdictQ });

  // Pull enabled while floating, at each end of the range.
  const ends = pullupEnds(mcu);
  const pressedSweep = ends.map((rpu) => {
    const vInf = dividerV(vdd, rpu, vRet, R);
    const tauPar = rcTauUs((R * rpu) / (R + rpu), pinPf);
    return reading(rpu, decay(vDrive, vInf, tUs, tauPar), mcu);
  });
  const releasedSweep = ends.map((rpu) => reading(rpu, decay(vDrive, vdd, tUs, rcTauUs(rpu, pinPf)), mcu));
  const pullSweep: OperatingPoint = {
    net, mcu: mcu.id, pathOhm: R, pressed: pressedSweep, released: releasedSweep,
    distinguishable: distinguishable(pressedSweep, releasedSweep), qualifier: verdictQ,
  };

  return {
    net,
    mcu: mcu.id,
    pathOhm: qv(R, "ohm", rq, "R = rho L / (w t) per conductor leg, profile resistivity rows (D-072)"),
    capOhm: qv(Number.NaN, "ohm", unknown, "no ContactRow or coupon for the flex cap bridge"),
    pinPf: { ...mcu.inputCap },
    tracePf: qv(Number.NaN, "pF", unknown, "trace capacitance arrives at M05"),
    tau: qv(tauUs, "us", tauQ, "pathOhm x inputCap; lower bound"),
    crossing: qv(crossingUs, "us", tauQ, "tau x ln(drive swing / threshold swing); lower bound"),
    headroomOhm: qv(rejectOhm - R, "ohm", qualify([...rTiers, capTier, waitTier]), "rejectOhm - pathOhm"),
    read: readOut,
    op: opDone,
    pullSweep,
  };
}

/** Charge-release operating points for every hookup entry read by charge-release. */
export function solveKeys(input: SolveKeysInput): SolveKeysOutput {
  const { part, profile } = input;
  const graph = conductorGraph(part);
  const warnings: BuildWarning[] = [];
  const points: KeyNetPoint[] = [];
  for (const h of input.hookup) {
    if (h.read.model !== "charge-release") continue;
    if (!part.features.some((f) => f.kind === "port" && f.id === h.port)) {
      warnings.push({ code: "HOOKUP_PORT_ABSENT", text: `hookup port ${h.port} is not in this build; skipped` });
      continue;
    }
    const mcu = input.mcu(h.mcu);
    const path = pressedPath(part, h.port, profile, graph);
    const { elements: contacts, tiers } = pathContacts(path, part, profile, input.leadKind ?? "clip");
    const core = chargeRelease(path, h.read, mcu, contacts, tiers);
    points.push({
      ...core,
      port: h.port,
      pin: h.pin,
      path: path.resistance,
      legs: path.legs,
      contacts,
      unpricedContacts: contacts.filter((c) => c.ohm === null).map((c) => c.at),
    });
  }
  return { points, warnings };
}
