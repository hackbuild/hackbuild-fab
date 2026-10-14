// CHK-NET-29 run body (M05-T19 step 4, CHECKS.md 9.4, D-078, D-079, D-081):
// a charge-release path settles inside the wait. Applies to every net that
// ends at a port whose hookup entry reads by charge-release.
//
// Measured is the closed path the released pin discharges through, plus
// the bench skin for a touch port: ReadOutputs.rOhm. Legal is 0 to
// ReadOutputs.rejectOhm = wait.emit / (settleTaus x C). The read record is
// the one charge-release reader's (packages/circuit chargePort, M05-T05):
// circuit.solve hands it in through views.circuit with the pressed path to
// the return net. Without that view (check.run, the M-S skeleton nets) the
// record is read from the net itself through the same chargeReleaseRead,
// with Net.totalOhm hi end as the path and Net.capToGndPf as C.
//
// A pass reports warn while the wait or the resistivity rows behind the
// path are not measured, or a contact on it is unpriced (D-081). A fail
// names the smallest whole microsecond wait that settles the path and the
// interval it predicts. The wait is a hookup fact, never a param, so the
// fix travels in the constraint and extra and no Fix is attached (Fix.param
// points into params).

import type { Finding, HookupDecl, Net, PortFeature, ProfileLookup, ReadOutputs, TargetOf, Tier } from "@hackbuild/spec";
import { SETTLE_TAUS, benchSkinOhm, chargeReleaseRead, emitWait, settlingWait, touchPathOhm, type ChargePort } from "@hackbuild/circuit";
import type { CheckCtx } from "@hackbuild/spec";
import { viewsOf } from "../views.js";
import { fmt, intervalEvidence, missing } from "../defs/common.js";

export { SETTLE_TAUS };

/** Tiers at which a path or a wait counts as measured (D-081). */
const MEASURED_TIERS: readonly string[] = ["measured", "verified"];

type ChargeRead = HookupDecl & { readonly read: Extract<HookupDecl["read"], { model: "charge-release" }> };

const isCharge = (p: unknown): p is ChargePort =>
  typeof p === "object" && p !== null && "read" in p && "op" in p && "path" in p && typeof (p as { read: { settleTaus?: unknown } }).read.settleTaus === "number";

/** What one charge-release port reads: the record, the path without the skin, its tier and unpriced contacts. */
interface PortRead {
  readonly read: ReadOutputs;
  readonly pathOhm: number;
  readonly skin: { readonly ohm: number; readonly tier: Tier | null } | null;
  readonly tier: Tier;
  readonly unpriced: readonly string[];
  readonly from: "circuit.solve" | "net";
}

/** The read of one port from the net alone, through the one charge-release reader. */
function readFromNet(net: Net, h: ChargeRead, touch: boolean, profile: ProfileLookup): PortRead {
  const cPf = net.capToGndPf;
  if (!(cPf > 0)) throw missing(`/nets/${net.id}/capToGndPf`, `net ${net.id} has no capacitance to ground; charge-release needs the pin capacitance`);
  const pathOhm = net.totalOhm[1];
  if (!Number.isFinite(pathOhm)) throw missing(`/nets/${net.id}/totalOhm`, `net ${net.id} has no path resistance`);
  const skin = touch ? benchSkinOhm(profile) : null;
  // The pin leakage lives on the catalog row, which the net does not carry; idleDroopV is not read here.
  const read = chargeReleaseRead({
    net: net.id, pathOhm: skin === null ? pathOhm : touchPathOhm(pathOhm, skin.value), nodePf: cPf,
    settleTaus: touch ? SETTLE_TAUS.touch : SETTLE_TAUS.key, emit: emitWait(h.read), leakNa: 0, qualifier: net.qualifier,
  });
  return { read, pathOhm, skin: skin === null ? null : { ohm: skin.value, tier: skin.basis }, tier: net.tier, unpriced: net.unpricedContacts, from: "net" };
}

/** The read circuit.solve made: chargePort put the same bench skin row in series for a touch port. */
function readFromSolve(c: ChargePort, touch: boolean, profile: ProfileLookup): PortRead {
  const skin = touch ? benchSkinOhm(profile) : null;
  return {
    read: c.read, pathOhm: c.path.pathOhm,
    skin: skin === null ? null : { ohm: skin.value, tier: skin.basis },
    tier: c.path.tier, unpriced: c.path.unpriced, from: "circuit.solve",
  };
}

export { settlingWait };

export function runNet29(target: TargetOf<"net">, ctx: CheckCtx): readonly Finding[] {
  const { part, net } = target;
  const reads = (ctx.hookup ?? []).filter((h): h is ChargeRead => h.read.model === "charge-release" && net.terminals.includes(h.port));
  const view = viewsOf(ctx).circuit;
  return reads.map((h): Finding => {
    const port = part.features.find((f): f is PortFeature => f.kind === "port" && f.id === h.port);
    const touch = port?.interface === "touch";
    const solved = view?.(part.id, h.port);
    const pr = isCharge(solved) ? readFromSolve(solved, touch, ctx.profile) : readFromNet(net, h, touch, ctx.profile);
    const r = pr.read;
    const waitUs = r.wait.emit.value;
    const ev = intervalEvidence(r.rOhm, 0, r.rejectOhm, "ohm");
    const waitMeasured = MEASURED_TIERS.includes(r.wait.emit.qualifier);
    const pathMeasured = MEASURED_TIERS.includes(pr.tier);
    const settledVerdict = (wait: boolean): "pass" | "warn" => (wait && pathMeasured && pr.unpriced.length === 0 ? "pass" : "warn");
    const why = [
      waitMeasured ? null : `wait ${r.wait.emit.qualifier}`,
      pathMeasured ? null : `path rows ${pr.tier}`,
      pr.unpriced.length === 0 ? null : `${pr.unpriced.length} contacts unpriced, path a lower bound`,
    ].filter((s): s is string => s !== null);
    const kind = pr.skin === null ? "key" : `touch, skin ${fmt(pr.skin.ohm / 1e6)} Mohm ${pr.skin.tier ?? "unknown"}`;
    let constraint = `charge-release path ${Math.round(r.rOhm)} ohm, legal 0 to ${Math.round(r.rejectOhm)} ohm, set by wait ${fmt(waitUs)} us over ${r.settleTaus} tau at ${fmt(r.cPf)} pF (${[kind, ...why].join("; ")})`;
    const fix = ev.inside ? null : settlingWait(r.rOhm, r.settleTaus, r.cPf);
    if (fix !== null) {
      // A fixed wait is chosen, not measured, so the rerun reports warn at best.
      constraint += `; fix: set hookup ${h.port} read.waitUs = ${fix.waitUs}, predicts legal 0 to ${Math.round(fix.rejectOhm)} ohm, ${settledVerdict(false)}`;
    }
    return {
      verdict: !ev.inside ? "fail" : settledVerdict(waitMeasured),
      target: { level: "net", part: part.id, net: net.id },
      measured: ev.measured,
      legal: ev.legal,
      constraint,
      extra: {
        port: h.port, mcu: h.mcu, pin: h.pin, waitUs, waitSource: h.read.waitSource ?? "unset", waitFrom: r.wait.emit.source ?? "no source", waitQualifier: r.wait.emit.qualifier,
        cPf: r.cPf, settleTaus: r.settleTaus, rejectOhm: r.rejectOhm, pathOhm: pr.pathOhm,
        ...(pr.skin === null ? {} : { skinOhm: pr.skin.ohm }),
        bulkOhm: net.bulkOhm, unpricedContacts: pr.unpriced.length, tier: pr.tier, qualifier: r.qualifier, readFrom: pr.from, gates: "read.rejectOhm",
        ...(fix === null ? {} : { fixWaitUs: fix.waitUs, fixRejectOhm: fix.rejectOhm, fixVerdict: settledVerdict(false) }),
      },
    };
  });
}
