// CHK-NET-46 run body (K-04, flagship MIDI pad 2026-10-13): a seated
// board's pin lands on its printed contact. A seat tap (PortFeature.tap)
// ends a net's read path at a board pin instead of a lead on the body
// outline, so the landing is measured on the declarations
// (copper-routing.md, contact and containment: "makesContact is only a
// CLAIM").
//
// Two findings per tapped port of the net:
// - pin on contact: the plan distance from the board pin centre (the
//   catalog row's pin, placed by the seat frame) in to the edge of the
//   tapped conductor's face, legal at least profile seat.pinOnContactMin.
//   The catalog row carries no pad size, so the pin centre stands for the
//   pad. A pin outside the contact measures negative.
// - press depth: the declared clamp interference less the height the pin
//   face sits above the contact top. A bump is legal over profile
//   seat.bumpPress.lo (exclusive) to seat.bumpPress.hi, PIP's bezel squeeze
//   (model.js line 576); a socket takes the header pin length, at least
//   seat.socketPinMin (model.js line 595). A bump pressed by a clamp body
//   the part does not carry (PIP's bezel ribs, a second print) passes as
//   warn and names the clamp: the board rests on the bumps until it is on.

import type { ConductorFeature, Finding, PortFeature, ProfileLookup, Ring, TargetOf, Vec2 } from "@hackbuild/spec";
import type { CheckCtx } from "@hackbuild/spec";
import { footprint } from "@hackbuild/circuit";
import { fmt, intervalEvidence, missing, skip } from "../defs/common.js";

function segDist(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

function inside(p: Vec2, ring: Ring): boolean {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const a = ring[i]!, b = ring[j]!;
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) hit = !hit;
  }
  return hit;
}

/** Signed plan distance from p to the ring's edge, mm: positive inside. */
export function depthInside(p: Vec2, ring: Ring): number {
  let d = Infinity;
  for (let i = 0; i < ring.length; i++) d = Math.min(d, segDist(p, ring[i]!, ring[(i + 1) % ring.length]!));
  return inside(p, ring) ? d : -d;
}

const row = (profile: ProfileLookup, id: string): { readonly value: number; readonly tier: string } => {
  const c = profile.constant(id);
  if (c.unit !== "mm" || !Number.isFinite(c.value)) throw missing(`/constants/${id}`, `profile constant ${id} is not a length in mm`);
  return { value: c.value, tier: c.provenance.tier };
};

export function runNet46(t: TargetOf<"net">, ctx: CheckCtx): readonly Finding[] {
  const { part, net } = t;
  const target = { level: "net" as const, part: part.id, net: net.id };
  const ports = part.features.filter((f): f is PortFeature => f.kind === "port" && f.net === net.id && f.tap !== undefined);
  if (ports.length === 0) return [skip(target, "not applicable", `net ${net.id} has no seat tap; this check proves a seated board pin's landing`)];
  const out: Finding[] = [];
  for (const port of ports) {
    const tap = port.tap!;
    const c = part.features.find((f): f is ConductorFeature => f.kind === "conductor" && f.id === tap.conductor);
    if (c === undefined || !("path" in c.region)) {
      out.push(skip(target, "not run", `${port.id} taps ${tap.conductor}, which is no region conductor of the part; the landing is unproven`, { port: port.id }));
      continue;
    }
    const fp = footprint(c);
    if (fp.kind !== "region") {
      out.push(skip(target, "not run", `${port.id} taps ${tap.conductor}, which has no region face; the landing is unproven`, { port: port.id }));
      continue;
    }
    const pin: Vec2 = [tap.at[0], tap.at[1]];
    const name = `${tap.board} ${tap.pin}`;

    const onMin = row(ctx.profile, "seat.pinOnContactMin");
    const depth = depthInside(pin, fp.ring);
    const ev = intervalEvidence(depth, onMin.value, null, "mm");
    out.push({
      verdict: ev.inside ? "pass" : "fail",
      target, measured: ev.measured, legal: ev.legal,
      constraint: ev.inside
        ? `${name} pin centre ${fmt(depth)} mm inside ${tap.conductor}, legal at least ${fmt(onMin.value)} mm, set by seat.pinOnContactMin (${onMin.tier}, the catalog inset conflict)`
        : `${name} pin centre ${depth < 0 ? `${fmt(-depth)} mm outside` : `${fmt(depth)} mm inside`} ${tap.conductor}, legal at least ${fmt(onMin.value)} mm, set by seat.pinOnContactMin (${onMin.tier}); fix: move the contact under the catalog pin at [${fmt(pin[0])}, ${fmt(pin[1])}] or widen it`,
      extra: { port: port.id, board: tap.board, pin: tap.pin, conductor: tap.conductor, measure: "pin on contact", pinX: pin[0], pinY: pin[1] },
    });

    const top = fp.z[1];
    const gap = tap.at[2] - top;
    const press = tap.pressMm - gap;
    if (tap.contact === "socket") {
      const lo = row(ctx.profile, "seat.socketPinMin");
      const pv = intervalEvidence(tap.pressMm, lo.value, null, "mm");
      out.push({
        verdict: pv.inside ? "pass" : "fail", target, measured: pv.measured, legal: pv.legal,
        constraint: `${name} header pin ${fmt(tap.pressMm)} mm into ${tap.conductor}, legal at least ${fmt(lo.value)} mm, set by seat.socketPinMin (${lo.tier})${pv.inside ? "" : `; fix: set the seat pinLen to ${fmt(lo.value)}`}`,
        extra: { port: port.id, board: tap.board, pin: tap.pin, conductor: tap.conductor, measure: "press depth", contact: tap.contact },
      });
      continue;
    }
    const lo = row(ctx.profile, "seat.bumpPress.lo");
    const hi = row(ctx.profile, "seat.bumpPress.hi");
    const pv = intervalEvidence(press, lo.value, hi.value, "mm");
    // The lo end is exclusive: at no interference the board rests on the bumps.
    const ok = pv.inside && press > lo.value + 1e-9;
    const clampHere = tap.clamp !== undefined && part.bodies.some((b) => b.id === tap.clamp);
    const legal = `legal over ${fmt(lo.value)} to ${fmt(hi.value)} mm, set by seat.bumpPress (${lo.tier})`;
    const what = `${name} pressed ${fmt(press)} mm into ${tap.conductor} (clamp ${fmt(tap.pressMm)} mm, pin face ${fmt(gap)} mm over the contact top)`;
    const constraint = !ok
      ? `${what}, ${legal}; fix: set the seat press inside the range and close the pin face onto the contact top`
      : clampHere
        ? `${what} by ${tap.clamp}, ${legal}`
        : `${what}, ${legal}; the clamp is not in part ${part.id}: print the bezel or a lid with ribs reaching the board top less ${fmt(tap.pressMm)} mm, or the board rests on the bumps`;
    out.push({
      verdict: !ok ? "fail" : clampHere ? "pass" : "warn",
      target, measured: pv.measured, legal: { ...pv.legal, nearest: ok ? press : hi.value },
      constraint,
      extra: { port: port.id, board: tap.board, pin: tap.pin, conductor: tap.conductor, measure: "press depth", contact: tap.contact, clampMm: tap.pressMm, gapMm: gap, clamp: clampHere ? (tap.clamp as string) : "not in part" },
    });
  }
  return out;
}
