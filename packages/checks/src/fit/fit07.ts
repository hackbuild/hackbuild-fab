// CHK-FIT-07 run body (M05-T19 step 8, CHECKS.md 9.2): a printed conductive
// socket on a printed stud. Port of BAFFLE R3's tile socket checks
// (originals/baffle-r3/files/src/model.js lines 993 to 997, lineage
// baffle.model/r3-36-collet): the socket is 0.08 to 0.2 mm smaller than the peg
// (diametral interference), its wall is split into at least 3 fingers, and
// it bottoms on the peg tip with 0.06 to 0.2 mm of axial squeeze. The tile
// got its collet slots only after the first tile print (BAFFLE R3
// 2026-09-18).
//
// Applies to a bore that declares onStud on a conductive body (role
// conductor or flex-conductor); any other feature is not this check's
// target. Three findings per socket, each an interval: interference,
// squeeze (stud height over socket depth) and fingers, every bound a
// profile constant fit.collet.*. A through bore has no floor to bottom on,
// so its squeeze is E_PARAM_MISSING.

import type { BoreFeature, Finding, TargetOf } from "@hackbuild/spec";
import { CONDUCTIVE_ROLES } from "@hackbuild/circuit";
import type { RegistryCtx } from "../views.js";
import { featureTarget, fmt, intervalEvidence, missing } from "../defs/common.js";

/** The profile constants this check reads. */
export const COLLET_ROWS = {
  interferenceMin: "fit.collet.interferenceMinMm", interferenceMax: "fit.collet.interferenceMaxMm",
  squeezeMin: "fit.collet.squeezeMinMm", squeezeMax: "fit.collet.squeezeMaxMm", fingersMin: "fit.collet.fingersMin",
} as const;

export function runFit07(t: TargetOf<"feature">, ctx: RegistryCtx): readonly Finding[] {
  const f = t.feature;
  if (f.kind !== "bore") return [];
  const bore = f as BoreFeature;
  const stud = bore.onStud;
  if (stud === undefined) return [];
  const bodyId = bore.body ?? t.part.bodies[0]?.id;
  const body = t.part.bodies.find((b) => b.id === bodyId);
  if (body === undefined || !CONDUCTIVE_ROLES.includes(body.role)) return [];
  if (bore.depth === "through") throw missing(`/features/${bore.id}/depth`, `socket ${bore.id} is a through bore; a socket that seats on a stud tip declares its depth`);
  const c = (id: string) => ctx.profile.constant(id);
  const target = featureTarget(t.part, bore);
  const by = (...ids: readonly string[]): string => `${ids.join(" and ")} (${[...new Set(ids.map((id) => c(id).provenance.tier))].join(", ")})`;
  const interference = stud.studD - bore.d;
  const squeeze = stud.studH - bore.depth;
  const iMin = c(COLLET_ROWS.interferenceMin), iMax = c(COLLET_ROWS.interferenceMax);
  const sMin = c(COLLET_ROWS.squeezeMin), sMax = c(COLLET_ROWS.squeezeMax);
  const nMin = c(COLLET_ROWS.fingersMin);
  const one = (measured: number, lo: number, hi: number | null, unit: string, text: string, src: string, fix: string): Finding => {
    const ev = intervalEvidence(measured, lo, hi, unit);
    return {
      verdict: ev.inside ? "pass" : "fail", target, measured: ev.measured, legal: ev.legal,
      constraint: `${text}, legal ${fmt(lo)} to ${hi === null ? "any" : fmt(hi)}, set by ${src}${ev.inside ? "" : `; ${fix}`}`,
      extra: { studD: stud.studD, socketD: bore.d, studH: stud.studH, socketDepth: bore.depth, fingers: stud.fingers, body: body.id },
    };
  };
  return [
    one(interference, iMin.value, iMax.value, iMin.unit,
      `socket ${fmt(bore.d)} on a ${fmt(stud.studD)} stud, diametral interference ${fmt(interference)} mm`, by(COLLET_ROWS.interferenceMin, COLLET_ROWS.interferenceMax),
      "draw the socket bore smaller than the stud by the interference band, an interference fit and not a slip fit"),
    one(squeeze, sMin.value, sMax.value, sMin.unit,
      `socket depth ${fmt(bore.depth)} on a ${fmt(stud.studH)} stud, axial squeeze ${fmt(squeeze)} mm`, by(COLLET_ROWS.squeezeMin, COLLET_ROWS.squeezeMax),
      "set the socket depth so it bottoms on the stud tip rather than landing on the deck"),
    one(stud.fingers, nMin.value, null, nMin.unit,
      `socket wall split into ${stud.fingers} fingers`, by(COLLET_ROWS.fingersMin),
      `slot the socket wall into at least ${fmt(nMin.value)} fingers so it springs onto the stud instead of cracking`),
  ];
}
