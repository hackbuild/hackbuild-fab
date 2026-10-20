// Top and bottom edge profiles of a prism as an outline inset d(z), mm
// (PLAN.md 3.3; geometry-strategy.md section 6 item 1). Ports the layer
// stepped edge breaks of the originals: COLLAR insetAt (collar.html lines
// 1215 to 1218, max(0, cham - z, cham - (thk - z))), PIP chamferTop
// (haft-src model.js lines 624 to 635), PAWL bed_relief (parts.py line 82)
// and the KNURL elephant foot relief (knurl.html lines 1014 to 1015, foot
// over footZ). The round, cove and teardrop shapes follow the BOSL2
// offset_sweep profiles os_circle and os_teardrop; the closed forms below are
// written here, no BOSL2 source is copied. The stack generator (R1-engine-06)
// turns d(z) into bands; this file carries no physical number of its own.
//
// BOSL2: BSD 2-Clause License, Copyright (c) 2017-2019, Revar Desmera.
// All rights reserved. Redistribution and use in source and binary forms,
// with or without modification, are permitted provided that the following
// conditions are met: redistributions of source code must retain the above
// copyright notice, this list of conditions and the following disclaimer;
// redistributions in binary form must reproduce the above copyright notice,
// this list of conditions and the following disclaimer in the documentation
// and/or other materials provided with the distribution. THIS SOFTWARE IS
// PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS
// OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
// WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
// DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
// LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

import type { Mm } from "@hackbuild/spec";
import { geomError } from "./cs.js";
import { UNIT_CIRCLE_MAX_SEGMENTS, UNIT_CIRCLE_MIN_SEGMENTS, unitCircle } from "./unit-circle.js";

export type EdgeKind = "round" | "chamfer" | "cove" | "teardrop" | "foot";

/**
 * One edge. size: radius for round, cove and teardrop; inset at the face for
 * chamfer; height of the relieved band for foot. angleDeg: the flat's angle
 * from the face plane for chamfer and teardrop, default 45. inset: the
 * constant relief for foot, required there and refused elsewhere.
 */
export interface EdgeProfile {
  readonly kind: EdgeKind;
  readonly size: Mm;
  readonly angleDeg?: number;
  readonly inset?: Mm;
}

export interface EdgeSpec {
  readonly top?: EdgeProfile;
  readonly bottom?: EdgeProfile;
}

const roundAt = (r: Mm, t: Mm): Mm => r - Math.sqrt(r * r - (r - t) ** 2);

/** Point count n with angleDeg * n / 360 whole, so cos and sin come from the D-175 table; null when none fits. */
function tableTurn(deg: number): readonly [number, number] | null {
  for (let n = UNIT_CIRCLE_MIN_SEGMENTS; n <= UNIT_CIRCLE_MAX_SEGMENTS; n++) if (Number.isInteger((deg * n) / 360)) return [(deg * n) / 360, n];
  return null;
}

/** [cos, sin] of the profile's flat angle from the table, so node and WebKit agree (D-175). */
function cosSin(p: EdgeProfile): readonly [number, number] {
  const [i, n] = tableTurn(p.angleDeg ?? 45)!;
  return unitCircle(i, n);
}
const tanOf = (p: EdgeProfile): number => {
  const [c, s] = cosSin(p);
  return s / c;
};
const ANGLED: ReadonlySet<EdgeKind> = new Set(["chamfer", "teardrop"]);

function check(p: EdgeProfile, path: string): void {
  if (!(Number.isFinite(p.size) && p.size > 0)) throw geomError({ code: "E_SCHEMA", path: `${path}/size`, got: p.size, expected: "a positive length in mm", hint: "give the edge a positive size" });
  if (p.angleDeg !== undefined && (!ANGLED.has(p.kind) || !(p.angleDeg > 0 && p.angleDeg < 90) || tableTurn(p.angleDeg) === null)) {
    throw geomError({ code: "E_SCHEMA", path: `${path}/angleDeg`, got: p.angleDeg, expected: `an angle strictly between 0 and 90 deg whose turn fraction has at most ${UNIT_CIRCLE_MAX_SEGMENTS} parts, on a chamfer or teardrop only`, hint: "drop angleDeg, or set a whole even degree between 0 and 90 on a chamfer or teardrop" });
  }
  if ((p.kind === "foot") !== (p.inset !== undefined) || (p.inset !== undefined && !(Number.isFinite(p.inset) && p.inset > 0))) {
    throw geomError({ code: "E_SCHEMA", path: `${path}/inset`, got: p.inset, expected: "a positive length in mm on a foot, absent otherwise", hint: "give a foot its relief inset from profile, and no other kind an inset" });
  }
}

/** Height of the band the profile changes, mm, measured from its face. */
export function edgeExtent(p: EdgeProfile): Mm {
  return p.kind === "chamfer" ? p.size * tanOf(p) : p.size;
}

/** d(t) per kind for 0 <= t < edgeExtent(p), mm. */
export const EDGE_PROFILES: Readonly<Record<EdgeKind, (p: EdgeProfile, t: Mm) => Mm>> = {
  round: (p, t) => roundAt(p.size, t),
  cove: (p, t) => Math.sqrt(p.size * p.size - t * t),
  chamfer: (p, t) => p.size - t / tanOf(p),
  foot: (p) => p.inset!,
  // The flat at angle a from the face meets the round tangentially at height r(1 - cos a).
  teardrop: (p, t) => {
    const r = p.size, [c, s] = cosSin(p);
    return t >= r * (1 - c) ? roundAt(r, t) : r * (1 - s) + (r * (1 - c) - t) / (s / c);
  },
};

/** Inset of one profile at distance t >= 0 from its face, mm. */
export function profileInset(p: EdgeProfile, t: Mm): Mm {
  return t >= edgeExtent(p) ? 0 : EDGE_PROFILES[p.kind](p, t);
}

/** Largest inset of the spec, mm: every kind is widest at its face. */
export function edgeMaxInset(spec: EdgeSpec): Mm {
  return Math.max(0, ...[spec.top, spec.bottom].filter((p) => p !== undefined).map((p) => profileInset(p, 0)));
}

/**
 * Outline inset d(z) >= 0 of a body of height h at height z, mm: the larger
 * of the top and bottom profiles, as COLLAR insetAt takes the max. The two
 * zones must fit in h, and with inradius given the widest inset must stay
 * under it so no band offsets to an empty ring (E_UNSAT).
 */
export function edgeInset(spec: EdgeSpec, h: Mm, z: Mm, inradius: Mm = Infinity): Mm {
  if (spec.top !== undefined) check(spec.top, "/edge/top");
  if (spec.bottom !== undefined) check(spec.bottom, "/edge/bottom");
  if (!(h > 0) || !(z >= 0 && z <= h)) throw geomError({ code: "E_SCHEMA", path: "/z", got: { h, z }, expected: "0 <= z <= h and h > 0, mm", hint: "ask for the inset at a height inside the body" });
  const zones = (spec.top ? edgeExtent(spec.top) : 0) + (spec.bottom ? edgeExtent(spec.bottom) : 0);
  if (zones > h) throw geomError({ code: "E_UNSAT", path: "/edge", got: zones, expected: `top and bottom zones within the body height ${h} mm`, hint: "shrink the top or bottom edge so both fit the body height" });
  const widest = edgeMaxInset(spec);
  if (widest >= inradius) throw geomError({ code: "E_UNSAT", path: "/edge", got: widest, expected: `an inset under the outline inradius ${inradius} mm`, hint: "shrink the edge below the outline inradius or the band offsets to nothing" });
  const top = spec.top ? profileInset(spec.top, h - z) : 0;
  const bottom = spec.bottom ? profileInset(spec.bottom, z) : 0;
  return Math.max(0, top, bottom);
}
