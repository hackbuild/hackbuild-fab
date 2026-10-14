// The port pass of circuit.solve (M05-T06, D-064, D-076, D-078): for every
// chase hookup entry, the pressed path from the extracted nets, the read
// model of that entry, and an operating point per receiving pin.
//
// Pressed path. A press closes a ContactFeature between a conductor of the
// read net and a conductor of a return net, so the pin reaches the return
// rail through the read net's read path, the closed contact and the return
// net's read path. This is PIP's key total (pip-controller src/model.js
// lines 395 to 416: total = Rn + extra + Rsw + common, the key net, the
// switch and the GND trace gndR) on extracted nets (M05-T04). The hi end of each Net.totalOhm is
// used: the worst end for a LOW read and the end ReadOutputs.rOhm names.
// The closed contact has no ContactRow and the cap bridge needs geometry the
// Part IR does not carry, so it stays unpriced and the path is a lower
// bound (qualifier unknown), as release.ts reports it on the 1D graph.
//
// Engines (D-086). Analytic is the default: the pullup read model's divider
// (read/pullup.ts). A DividerEngine supplies the pressed voltage at each
// pullup end from another solver; spiceDivider runs ngspice .op over the
// same pull and path. Classification happens in one place either way.

import type {
  BuildWarning, ConductorFeature, ContactFeature, HookupDecl, McuPinSpec, Net, OperatingPoint, Ohm, Part, PortFeature, ProfileLookup, Qualified, Qualifier,
  ReadOutputs, Tier, Volt,
} from "@hackbuild/spec";
import { lowestTier, qualify } from "@hackbuild/spec";
import { circuitError } from "../path1d.js";
import { floatPoint } from "../release.js";
import { SETTLE_TAUS, benchSkinOhm, chargeReleaseRead, emitWait, expectUnit, nodeCapPf, touchPathOhm, traceCapRule } from "../read/charge-release.js";
import { pullupEnds, pullupRead } from "../read/pullup.js";
import { adcRead, type AdcReadOutputs } from "../read/adc.js";
import { nodeVolts, type SpiceEngine } from "../spice/engine.js";

/** Which ends of a pullup range circuit.solve classifies at; "range" is both (D-076). */
export type PullupEnds = "range" | "min" | "max";

/** One pressed divider: the pull from VDD to the pin and the path from the pin to the 0 V return. */
export interface PressedDivider {
  readonly vddV: Volt;
  readonly pullupOhm: Ohm;
  readonly pathOhm: Ohm;
}

/** A solver for the pressed pin voltage of one divider, V. */
export type DividerEngine = (d: PressedDivider) => Promise<Volt>;

/** ngspice .op over the divider: V1 vdd 0, R pull vdd pin, R path pin 0 (M05-T01 engine). */
export function spiceDivider(engine: Pick<SpiceEngine, "run">): DividerEngine {
  return async (d) => {
    const r = await engine.run({
      title: "circuit solve pressed divider",
      elements: [
        { kind: "V", name: "dd", pos: "vdd", neg: "0", volts: d.vddV },
        { kind: "R", name: "pu", a: "vdd", b: "pin", ohm: d.pullupOhm },
        { kind: "R", name: "path", a: "pin", b: "0", ohm: d.pathOhm },
      ],
      analysis: { kind: "op" },
    });
    return nodeVolts(r, "pin");
  };
}

/** The pressed path of one port: read net, contact, return net. */
export interface PressedPathOhm {
  readonly net: string;
  /** Return net id, for example GND. */
  readonly returnNet: string;
  /** Contact feature the press closes. */
  readonly contact: string;
  /** Read net plus return net, Net.totalOhm hi ends, ohm. */
  readonly pathOhm: Ohm;
  /** Return rail voltage relative to VDD: "gnd" 0 V, "power" VDD. */
  readonly returnType: "gnd" | "power";
  /** Lowest tier of the two nets' rows. */
  readonly tier: Tier;
  /** ContactElement.at values with no ContactRow on either net, then the closed contact's id: it has no row either. */
  readonly unpriced: readonly string[];
  /** Length of the read net's in-plane legs, mm: PIP's netLen (model.js:418). */
  readonly traceMm: number;
}

/** What CHK-NET-05 reads for one port read by pullup (packages/checks views.circuit). */
export interface PullupPort {
  readonly port: string;
  readonly pin: string;
  readonly mcu: McuPinSpec;
  readonly path: PressedPathOhm;
  /** The pullup ends classified, ohm. */
  readonly ends: readonly Ohm[];
  /** Declared external pull, ohm; absent for the MCU's internal pull. */
  readonly externalOhm?: Ohm;
  readonly op: OperatingPoint;
}

/** What CHK-NET-06 reads for one port read by adc. */
export interface AdcPort {
  readonly port: string;
  readonly pin: string;
  readonly net: string;
  readonly mcu: McuPinSpec;
  readonly read: AdcReadOutputs;
}

/** One port read by charge-release: the read record and the declared float point. */
export interface ChargePort {
  readonly port: string;
  readonly pin: string;
  readonly mcu: McuPinSpec;
  readonly path: PressedPathOhm;
  readonly read: ReadOutputs;
  readonly op: OperatingPoint;
}

export interface PortSolveInput {
  readonly part: Pick<Part, "id" | "features">;
  /** Extracted nets (extractNets, M05-T04). */
  readonly nets: readonly Net[];
  readonly hookup: readonly HookupDecl[];
  readonly profile: ProfileLookup;
  /** The receiving pin row by catalog id (catalog mcuPinRow); the caller applies an --mcu override. */
  readonly mcu: (id: string, at: `/${string}`) => McuPinSpec;
  readonly ends: PullupEnds;
  /** Pressed voltage solver; the pullup model's own divider when absent. */
  readonly engine?: DividerEngine;
}

export interface PortSolve {
  /** One OperatingPoint per solved pullup or charge-release port, in hookup order. */
  readonly points: readonly OperatingPoint[];
  /** One ReadOutputs per charge-release port, in hookup order. */
  readonly reads: readonly ReadOutputs[];
  readonly pullups: readonly PullupPort[];
  readonly adcs: readonly AdcPort[];
  /** Each charge-release port with its read record and declared float point. */
  readonly charges: readonly ChargePort[];
  /** Hookup ports with no solve, with the reason. */
  readonly unsolved: readonly { readonly port: string; readonly reason: string }[];
  readonly warnings: readonly BuildWarning[];
  /** True when the engine ran at least once. */
  readonly engineRan: boolean;
}

/** The pullup ends a call classifies at, from every end a row or resistor offers. */
export const pickEnds = (all: readonly Ohm[], which: PullupEnds): Ohm[] => {
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  if (which === "min") return [lo];
  if (which === "max") return [hi];
  return lo === hi ? [lo] : [lo, hi];
};

/** The pressed path of a port's net, or the reason there is none. */
export function pressedPathOf(
  part: Pick<Part, "features">, nets: readonly Net[], port: PortFeature,
): { readonly path: PressedPathOhm; readonly warning?: BuildWarning } | { readonly reason: string } {
  const net = nets.find((n) => n.id === port.net);
  if (net === undefined || net.resistance.length === 0) return { reason: `net ${port.net} has no read path in the extracted nets` };
  const conductorNet = (id: string): string | undefined => part.features.find((f): f is ConductorFeature => f.kind === "conductor" && f.id === id)?.net;
  const contacts = part.features.filter((f): f is ContactFeature => f.kind === "contact");
  const contact = contacts.find((c) => conductorNet(c.a) === net.id || conductorNet(c.b) === net.id);
  if (contact === undefined) return { reason: `net ${net.id} has no contact feature to a return net` };
  const returnId = conductorNet(conductorNet(contact.a) === net.id ? contact.b : contact.a);
  const ret = nets.find((n) => n.id === returnId);
  if (returnId === undefined || ret === undefined || ret.resistance.length === 0) {
    return { reason: `contact ${contact.id} closes net ${net.id} onto ${returnId ?? "no conductor"}, which has no read path` };
  }
  const retPort = part.features.find((f): f is PortFeature => f.kind === "port" && f.net === ret.id);
  if (retPort === undefined || retPort.type === "signal") {
    return { reason: `return net ${ret.id} ends at ${retPort === undefined ? "no port" : `signal port ${retPort.id}`}; a press returns to a gnd or power port` };
  }
  const warning: BuildWarning | undefined = ret.resistance[0]!.terminals[1] === contact.id ? undefined : {
    code: "RETURN_PATH_PAIR",
    text: `return net ${ret.id} is priced on its read path ${ret.resistance[0]!.terminals.join(" to ")}, not to ${contact.id}; a branched net has one priced pair (M05-T04)`,
  };
  const traceMm = net.resistance[0]!.preview.segments.filter((s) => s.direction === "along").reduce((s, x) => s + x.lengthMm, 0);
  const path: PressedPathOhm = {
    net: net.id, returnNet: ret.id, contact: contact.id,
    pathOhm: net.totalOhm[1] + ret.totalOhm[1],
    returnType: retPort.type,
    tier: lowestTier([net.tier, ret.tier]) as Tier,
    unpriced: [...net.unpricedContacts, ...ret.unpricedContacts, contact.id],
    traceMm,
  };
  return warning === undefined ? { path } : { path, warning };
}

/** A hookup entry read by charge-release. */
export type ChargeHookup = HookupDecl & { readonly read: Extract<HookupDecl["read"], { model: "charge-release" }> };

export interface ChargePortInput {
  readonly hookup: ChargeHookup;
  /** The port the entry reads; interface "touch" reads with the skin in series and 3 tau. */
  readonly port: Pick<PortFeature, "interface">;
  readonly mcu: McuPinSpec;
  readonly path: PressedPathOhm;
  readonly profile: ProfileLookup;
  /** True when a contact on the path has no price: the read qualifies unknown. */
  readonly unknown: boolean;
  /** What the path is, for the computed wait's source line. */
  readonly source: string;
  /** shippedWait(...), when the published firmware's wait differs from the emitted one (D-080). */
  readonly shipped?: Qualified;
}

/**
 * One port read by charge-release: PIP's key and touch read (model.js:418
 * to 428) over a pressed path, node capacitance by the PIP trace rule over
 * the read net's trace length, and the declared float point. circuit.solve
 * reads extracted paths and declared drive paths through this one function.
 */
export function chargePort(i: ChargePortInput): ChargePort {
  const { hookup: h, mcu, path, profile } = i;
  const touch = i.port.interface === "touch";
  const taus = touch ? SETTLE_TAUS.touch : SETTLE_TAUS.key;
  const pinPf = expectUnit(mcu.inputCap, "pF", "inputCap");
  const leakNa = expectUnit(mcu.leakage, "nA", "leakage");
  const rule = traceCapRule(profile);
  const cPf = nodeCapPf(pinPf, path.traceMm, { perMmPf: rule.perMmPf.value, fixedPf: rule.fixedPf.value });
  const skin = touch ? benchSkinOhm(profile) : null;
  const pathOhm = skin === null ? path.pathOhm : touchPathOhm(path.pathOhm, skin.value);
  const tiers = [path.tier, mcu.inputCap.basis, rule.perMmPf.basis, rule.fixedPf.basis, ...(skin === null ? [] : [skin.basis])];
  const read = chargeReleaseRead({
    net: path.net, pathOhm, nodePf: cPf, settleTaus: taus, emit: emitWait(h.read), leakNa,
    ...(i.shipped === undefined ? {} : { shipped: i.shipped }),
    computed: { q: qualify(tiers), source: `${taus} x tau over ${i.source} and the PIP trace rule (model.js:418)` },
    qualifier: i.unknown ? "unknown" : qualify(tiers).qualifier,
  });
  const op = floatPoint({
    net: path.net, mcu, pathOhm, read: h.read, vRetV: path.returnType === "gnd" ? 0 : mcu.vddV, out: read, qualifier: read.qualifier,
  });
  return { port: h.port, pin: h.pin, mcu, path, read, op };
}

/** Every hookup entry of the build: its pressed path, read model and operating point. */
export async function solvePorts(input: PortSolveInput): Promise<PortSolve> {
  const { part, nets, profile } = input;
  const points: OperatingPoint[] = [];
  const reads: ReadOutputs[] = [];
  const pullups: PullupPort[] = [];
  const adcs: AdcPort[] = [];
  const charges: ChargePort[] = [];
  const unsolved: { port: string; reason: string }[] = [];
  const warnings: BuildWarning[] = [];
  let engineRan = false;
  for (const [i, h] of input.hookup.entries()) {
    const port = part.features.find((f): f is PortFeature => f.kind === "port" && f.id === h.port);
    if (port === undefined) {
      warnings.push({ code: "HOOKUP_PORT_ABSENT", text: `hookup port ${h.port} is not in this build; skipped` });
      continue;
    }
    const mcu = input.mcu(h.mcu, `/hookup/${i}/mcu`);
    if (h.read.model === "adc") {
      const net = nets.find((n) => n.id === port.net);
      if (net === undefined) {
        unsolved.push({ port: h.port, reason: `net ${port.net} was not extracted` });
        continue;
      }
      adcs.push({
        port: h.port, pin: h.pin, net: net.id, mcu,
        read: adcRead({ net: net.id, sourceOhm: net.totalOhm[1], sourceTiers: [net.tier], read: h.read, profile }),
      });
      continue;
    }
    if (h.read.model !== "pullup" && h.read.model !== "charge-release") {
      unsolved.push({ port: h.port, reason: `read model ${h.read.model} has no operating point in circuit.solve; its outputs land with the archetypes that use it (M05-T05 step 3)` });
      continue;
    }
    const found = pressedPathOf(part, nets, port);
    if ("reason" in found) {
      unsolved.push({ port: h.port, reason: found.reason });
      continue;
    }
    const { path, warning: w } = found;
    if (w !== undefined && !warnings.some((x) => x.text === w.text)) warnings.push(w);
    const unknown = path.unpriced.length > 0;

    if (h.read.model === "pullup") {
      if (path.returnType !== "gnd") {
        throw circuitError({ code: "E_SCHEMA", path: `/hookup/${i}/read/active`, got: path.returnType, hint: `${h.port} returns to a ${path.returnType} port; a pullup read with active low needs a gnd return` });
      }
      const ext = h.read.externalOhm;
      if (ext !== undefined && typeof ext !== "number") {
        throw circuitError({
          code: "E_SCHEMA", path: `/hookup/${i}/read/externalOhm`, got: ext, expected: "an ohm value",
          hint: "the auto E12 pullup has no solver in M05; declare the resistor in ohm",
        });
      }
      const ends = pickEnds(ext === undefined ? pullupEnds(mcu) : [ext], input.ends);
      let solvedV: ((rpu: Ohm) => Volt) | undefined;
      if (input.engine !== undefined) {
        const volts = new Map<Ohm, Volt>();
        for (const rpu of ends) volts.set(rpu, await input.engine({ vddV: mcu.vddV, pullupOhm: rpu, pathOhm: path.pathOhm }));
        engineRan = true;
        solvedV = (rpu) => volts.get(rpu)!;
      }
      // The read model sweeps the row's own ends; one picked end (or a declared resistor) is passed as the pull.
      const r = pullupRead({
        net: path.net, pathOhm: path.pathOhm, pathTiers: [path.tier], mcu, active: h.read.active,
        ...(ends.length === 1 ? { externalOhm: ends[0]! } : {}),
        ...(solvedV === undefined ? {} : { solvedV }),
      });
      const q: Qualifier = unknown ? "unknown" : r.op.qualifier;
      const op: OperatingPoint = { ...r.op, qualifier: q };
      points.push(op);
      pullups.push({ port: h.port, pin: h.pin, mcu, path, ends, ...(ext === undefined ? {} : { externalOhm: ext }), op });
      continue;
    }

    // charge-release: PIP's key and touch read (model.js:418 to 428) over the extracted path.
    const charge = chargePort({ hookup: h as ChargeHookup, port, mcu, path, profile, unknown, source: "the extracted pressed path" });
    reads.push(charge.read);
    points.push(charge.op);
    charges.push(charge);
  }
  return { points, reads, pullups, adcs, charges, unsolved, warnings, engineRan };
}
