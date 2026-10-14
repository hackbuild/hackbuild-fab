// CHK-NET-05 run body (M05-T06 step 3, CHECKS.md 7.5, D-076, D-081): a
// port read by pullup reads LOW when pressed. The registry form is the
// pullup interval of circuit/pullup-low-read (M01-T08): the floor is the
// smallest pullup that reads LOW over the pressed path, R (VDD - VIL) / VIL,
// and the ceiling the internal pull's maximum or the declared resistor.
// Measured is the low end of the pullup ends circuit.solve classified, the
// worst end for LOW. The pin-voltage form of the card step (pressed volts
// at that end at most VIL) is the same inequality; the volts and the state
// at each end travel in extra, and circuit.solve prints them per pin.
//
// The path and the operating point come from circuit.solve's port pass
// (views.circuit), never from here. While the path rests on an inferred
// resistivity row, or a contact on it has no ContactRow (a lower bound), a
// pass reports warn (D-081). A port read by charge-release is CHK-NET-29's.

import type { Finding, HookupDecl, PortFeature, TargetOf } from "@hackbuild/spec";
import { createRegistry, solve, type ConstraintRegistry } from "@hackbuild/constraints";
import { PULLUP_DIM, maxPathOhm, pullupLowRead, whole, type PullupPort } from "@hackbuild/circuit";
import type { RegistryCtx } from "../views.js";
import { NO_CIRCUIT, viewsOf } from "../views.js";
import { featureTarget, fmt, intervalEvidence, skip } from "../defs/common.js";

let reg: ConstraintRegistry | undefined;
const registry = (): ConstraintRegistry => (reg ??= createRegistry([pullupLowRead]));

const isPullup = (p: unknown): p is PullupPort => typeof p === "object" && p !== null && "op" in p && "path" in p && "ends" in p;

/** Tiers at which a computed path carries no inferred row (D-081). */
const MEASURED_TIERS: readonly string[] = ["measured", "verified"];

export function runNet05(t: TargetOf<"feature", "port">, ctx: RegistryCtx): readonly Finding[] {
  const port: PortFeature = t.feature;
  const target = featureTarget(t.part, port);
  const h = (ctx.hookup ?? []).find((x: HookupDecl) => x.port === port.id);
  if (h === undefined) return [skip(target, "not run", `port ${port.id} has no hookup entry; no pin reads it`)];
  if (h.read.model !== "pullup") {
    return [skip(target, "not run", `port ${port.id} is read by ${h.read.model}, no port with read model pullup${h.read.model === "charge-release" ? "; CHK-NET-29 gates it" : ""}`)];
  }
  const solved = viewsOf(ctx).circuit?.(t.part.id, port.id);
  if (!isPullup(solved)) return [skip(target, "not run", NO_CIRCUIT)];

  const { mcu, path, op, ends } = solved;
  const external = solved.externalOhm !== undefined;
  const lowEnd = Math.min(...ends);
  const highEnd = Math.max(...ends);
  const q = solve(registry(), PULLUP_DIM, {
    profile: ctx.profile, machine: ctx.machine, material: "", part: t.part, feature: port,
    facts: {
      mcu: mcu.id, pathOhm: path.pathOhm, pullup: external ? "external" : "internal",
      ...(external ? { pullupOhm: solved.externalOhm!, pullupCeilOhm: solved.externalOhm! } : {}),
    },
  });
  const iv = q.interval;
  const reasons = [...iv.lo.filter((_, i) => iv.binding.lo.includes(i)), ...iv.hi.filter((_, i) => iv.binding.hi.includes(i))].map((b) => b.reason);
  const largest = whole(maxPathOhm(mcu, lowEnd), "down");
  const at = (end: number): { volts: number; state: string } => {
    const r = op.pressed.find((x) => x.pullupOhm === end) ?? op.pressed[0]!;
    return { volts: r.volts, state: r.state };
  };
  // The floor as the def's reason prints it: whole ohm, up (circuit/pullup-low-read).
  const floorOhm = whole(Math.max(...iv.lo.map((b) => b.value)), "up");
  const lo = at(lowEnd);
  const hi = at(highEnd);
  const lowerBound = path.unpriced.length > 0;
  const measuredTier = MEASURED_TIERS.includes(path.tier);
  const extra = {
    mcu: mcu.id, pin: h.pin, net: path.net, returnNet: path.returnNet, tier: path.tier, qualifier: op.qualifier,
    pathOhm: path.pathOhm, pullupLowOhm: lowEnd, pullupHighOhm: highEnd,
    pressedLowV: lo.volts, stateLow: lo.state, pressedHighV: hi.volts, stateHigh: hi.state,
    vilMaxV: mcu.vilMaxV, vihMinV: mcu.vihMinV, floorOhm, largestPathOhm: largest, unpricedContacts: path.unpriced.length, rowSource: mcu.source,
  };
  const fix = `fix: a path of at most ${String(largest)} ohm reads LOW at ${String(lowEnd)} ohm; widen the read path through conductor.width (M01-T08 chain)`;
  if (iv.legal === null) {
    // E_UNSAT is an answer (CHECKS.md 2.3): no pullup the port can have reads LOW over this path.
    const floor = Math.max(...iv.lo.map((b) => b.value));
    const ceiling = Math.min(...iv.hi.map((b) => b.value));
    return [{
      verdict: "fail", target, measured: lowEnd,
      legal: { kind: "interval", lo: floor, hi: ceiling, unit: "ohm", nearest: floor },
      constraint: `circuit/pullup-low-read is empty for ${port.id} on ${mcu.id}, floor over ceiling: ${reasons.join("; ")}; ${fix}`,
      extra: { ...extra, unsat: "yes" },
    }];
  }
  const ev = intervalEvidence(lowEnd, iv.legal[0], iv.legal[1], "ohm");
  const why = [
    measuredTier ? null : `path rows ${path.tier} (D-081)`,
    lowerBound ? `${path.unpriced.length} contacts unpriced, path a lower bound` : null,
  ].filter((s): s is string => s !== null);
  return [{
    verdict: !ev.inside ? "fail" : why.length > 0 ? "warn" : "pass",
    target, measured: ev.measured, legal: ev.legal,
    constraint: `circuit/pullup-low-read on ${mcu.id} pin ${h.pin}, pressed path ${fmt(path.pathOhm, 0)} ohm: ${reasons.join("; ")}${why.length > 0 ? `; ${why.join("; ")}` : ""}${ev.inside ? "" : `; ${fix}`}`,
    extra,
  }];
}
