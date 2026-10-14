// STIPPLE (OGEE R17 and R17b) kinematics: the one place a moving STIPPLE
// part is placed (D-139). The pin-free balance beam has no pivot pin: the
// column end is a nose resting on a slot floor and the row end a boss in a
// coplanar slot, so the crown sits at the mean of the two floor heights
// plus CROWN_R at any tilt.
//
// ceil_v, E_REST, CAM, link, rodState, canLatch and crankPhi are the page
// script of designs/stipple/legacy/stipple-r17b.html lines 138 to 170 line
// for line (lineage stipple.bench/r17b, canonical; R17 carries the same
// lines, 3 lines earlier). place() is the cell placement of apply() (lines
// 346 to 353) and buildCheck() the page's placement check (lines 680 to
// 714), both through the row-major matrices of mat4.ts in place of three.js
// Object3D. CAMLIFT is not in the page: it is kin.py line 90 on this
// beam, the cam lift the R17b record and stipple_latch.py read.
//
// Every dimension is DATA.P of the page (line 117), read by
// readStippleParams. Lengths in mm, angles in degrees unless a name says rad.

import { commandError } from "@hackbuild/spec";
import { applyPoint, mul, rotY, trans, type Mat4 } from "./mat4.js";
import { LATCH_RELEASE_MARGIN_MM, type CoincidenceLatch } from "../latch.js";

/**
 * DATA.P of a STIPPLE page: the JSON object literal after `const DATA=` on
 * line 117, parsed as the page parses it, so the reader never edits the
 * copy it reads.
 */
export function readStippleParams(html: string): Readonly<Record<string, number>> {
  const at = html.indexOf("const DATA=");
  if (at < 0) {
    throw commandError({ code: "E_REF", path: "/DATA", got: null, expected: "a STIPPLE page with `const DATA=` on line 117", hint: "pass designs/stipple/legacy/stipple-r17b.html or stipple-r17.html", record: "motion-latch" });
  }
  const from = at + "const DATA=".length;
  let depth = 0, str = false, end = -1;
  for (let k = from; k < html.length; k += 1) {
    const ch = html[k];
    if (str) {
      if (ch === "\\") k += 1;
      else if (ch === "\"") str = false;
    } else if (ch === "\"") str = true;
    else if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        end = k + 1;
        break;
      }
    }
  }
  const data = JSON.parse(html.slice(from, end)) as { P: Record<string, number> };
  return data.P;
}

/** The DATA.P names the kinematics read; a missing one is a port fault, never a default. */
export const STIPPLE_PARAM_NAMES = [
  "N", "PITCH", "C", "T", "STROKE", "CROWN_R", "CROWN_TOP", "NOSE_R", "BOSS_R", "LINK_L", "RT_FLOOR", "CT_FLOOR",
  "PIN_PLAY", "RAMP_A", "PIN_W", "LUG_P", "LUG_TOT", "SLOT_E", "LP_Z", "LP_T", "LP_SLIDE", "Z_LUG0", "R_LATCH",
  "CRANK_R", "CRANK_SW", "FACE2_Z",
] as const;
export type StippleParams = Readonly<Record<(typeof STIPPLE_PARAM_NAMES)[number], number>> & {
  /** The cap well rim, R17b only (lines 247 to 250), mm. */
  readonly FACE2_TOP?: number;
};

function pick(P: Readonly<Record<string, number>>): StippleParams {
  const out: Record<string, number> = {};
  for (const k of STIPPLE_PARAM_NAMES) {
    const v = P[k];
    if (typeof v !== "number" || !Number.isFinite(v)) {
      throw commandError({
        code: "E_REF", path: `/P/${k}`, got: null, expected: "a number DATA.P defines",
        hint: `the STIPPLE page's DATA.P has no ${k}; check the legacy copy against SHA256SUMS`, record: "motion-latch",
      });
    }
    out[k] = v;
  }
  if (typeof P.FACE2_TOP === "number") out.FACE2_TOP = P.FACE2_TOP;
  return out as StippleParams;
}

/** link(): the beam's tilt (rad), both contact centres, the mid point and the crown centre height. */
export interface StippleLink {
  readonly theta: number;
  readonly xb: number;
  readonly zb: number;
  readonly xa: number;
  readonly za: number;
  readonly mx: number;
  readonly mz: number;
  readonly crown: number;
}

/** rodState(): the rod's y offset, origin z, its beam and its lug bottom. */
export interface StippleRod {
  readonly y: number;
  readonly z: number;
  readonly link: StippleLink;
  readonly lugBot: number;
}

/** The state of apply(): bar rises, plate slide, and the latched cells. */
export interface StippleState {
  readonly zR: readonly number[];
  readonly zC: readonly number[];
  readonly lp: number;
  readonly latched: readonly (readonly boolean[])[];
}

/** One placed cell part of apply(): label, DATA.parts name, world matrix. */
export interface StipplePlaced {
  readonly name: string;
  readonly part: string;
  readonly at: Mat4;
}

/** One row of buildCheck(): what was probed, where the matrices put it, where the formulas say it is. */
export type StippleCheckRow = readonly [name: string, got: number, want: number];

export interface StippleKinematics {
  readonly P: StippleParams;
  readonly N: number;
  readonly CAM: number;
  readonly E_REST: number;
  readonly CAMLIFT: number;
  ceil_v(u: number): number;
  link(i: number, j: number, zR: readonly number[], zC: readonly number[]): StippleLink;
  rodState(i: number, j: number, zR: readonly number[], zC: readonly number[], lp: number, latched: boolean): StippleRod;
  canLatch(i: number, j: number, zR: readonly number[], zC: readonly number[]): boolean;
  crankPhi(rise: number): number;
  /** apply() lines 346 to 353: every link, rod and cap at the state, cap meshes carrying their FACE2_Z offset. */
  place(s: StippleState): StipplePlaced[];
  /** buildCheck() lines 680 to 714: 20 rows on R17, 22 with the cap well rows on R17b; bad rows are over 2e-3 mm (line 710). */
  buildCheck(): { readonly rows: readonly StippleCheckRow[]; readonly bad: readonly string[] };
  /** The latch as the programs and CHK-MOT-05 read it. */
  readonly latch: CoincidenceLatch;
}

const D2R = Math.PI / 180;

/** The STIPPLE kinematics over one page's DATA.P (readStippleParams). */
export function stippleKinematics(params: Readonly<Record<string, number>>, machine = "stipple"): StippleKinematics {
  const P = pick(params);
  const N = P.N | 0, PITCH = P.PITCH, C = P.C, T = P.T;
  const px = (j: number): number => j * PITCH, py = (i: number): number => i * PITCH;

  // Lines 138 to 140.
  const ceil_v = (u: number): number => -(u - (T / 2 - P.PIN_PLAY)) * Math.tan(P.RAMP_A * D2R);
  const E_REST = -P.PIN_PLAY;
  const CAM = (P.PIN_W / 2 + P.LUG_P + P.PIN_PLAY) - P.SLOT_E;

  // Lines 142 to 148.
  function link(i: number, j: number, zR: readonly number[], zC: readonly number[]): StippleLink {
    const xb = px(j) + C, zb = P.RT_FLOOR + zR[i]! + P.BOSS_R;
    const za = P.CT_FLOOR + zC[j]! + P.NOSE_R;
    const dz = zb - za, span = Math.sqrt(Math.max(P.LINK_L * P.LINK_L - dz * dz, 0));
    return { theta: Math.atan2(dz, span), xb, zb, xa: xb - span, za, mx: (xb + xb - span) / 2, mz: (za + zb) / 2, crown: (za + zb) / 2 + P.CROWN_R };
  }
  // Lines 149 to 161.
  function rodState(i: number, j: number, zR: readonly number[], zC: readonly number[], lp: number, latched: boolean): StippleRod {
    const lk = link(i, j, zR, zC), free = lk.crown;
    const riseFree = free - P.CROWN_TOP;
    const rise = latched ? Math.max(riseFree, P.R_LATCH) : riseFree;
    const lugBot = P.Z_LUG0 + rise;
    const released = lp >= CAM + LATCH_RELEASE_MARGIN_MM;
    let cammed = (!released) && (lugBot + P.LUG_TOT > P.LP_Z) && (lugBot < P.LP_Z + P.LP_T);
    if (latched && rise >= P.R_LATCH - 1e-9) cammed = false;
    const e = cammed ? (E_REST + CAM) : E_REST;
    let z = free - ceil_v(e + T / 2);
    if (latched) z = Math.max(z, P.CROWN_TOP + P.R_LATCH);
    return { y: -e, z, link: lk, lugBot: P.Z_LUG0 + (z - P.CROWN_TOP) };
  }
  // Lines 162 to 164.
  const canLatch = (i: number, j: number, zR: readonly number[], zC: readonly number[]): boolean =>
    rodState(i, j, zR, zC, 0, false).lugBot >= P.LP_Z + P.LP_T;
  // Lines 165 to 170.
  const PHI_REST = 180 + P.CRANK_SW;
  const crankPhi = (rise: number): number => {
    let s = Math.sin(PHI_REST * D2R) + rise / P.CRANK_R;
    s = Math.max(-1, Math.min(1, s));
    return 180 - Math.asin(s) / D2R;
  };
  // kin.py line 90 on this beam.
  const CAMLIFT = ceil_v(E_REST + T / 2) - ceil_v(E_REST + CAM + T / 2);

  // apply() lines 346 to 353. The link mesh is sheetXZ("link", 0) posed at
  // (mx, py(i), mz) with rotation.y = -theta; rods and caps translate only.
  function place(s: StippleState): StipplePlaced[] {
    const out: StipplePlaced[] = [];
    for (let i = 0; i < N; i += 1) {
      for (let j = 0; j < N; j += 1) {
        const st = rodState(i, j, s.zR, s.zC, s.lp, s.latched[i]?.[j] === true);
        out.push({ name: `link${i},${j}`, part: "link", at: mul(trans(st.link.mx, py(i), st.link.mz), rotY(-st.link.theta)) });
        out.push({ name: `rod${i},${j}`, part: "rod", at: trans(px(j), py(i) + st.y - P.PIN_PLAY, st.z - P.CROWN_TOP) });
        out.push({ name: `cap${i},${j}`, part: "cap", at: trans(px(j), py(i) + st.y, st.z - P.CROWN_TOP) });
      }
    }
    return out;
  }

  // buildCheck() lines 680 to 714, on the matrices place() gives.
  function buildCheck(): { rows: StippleCheckRow[]; bad: string[] } {
    const rows: StippleCheckRow[] = [];
    const blank = (): boolean[][] => Array.from({ length: N }, () => new Array<boolean>(N).fill(false));
    const at = (placed: StipplePlaced[], name: string): Mat4 => placed.find((p) => p.name === name)!.at;
    const probe = (i: number, j: number, zr: number, zc: number): void => {
      const zR = new Array<number>(N).fill(0), zC = new Array<number>(N).fill(0);
      zR[i] = zr;
      zC[j] = zc;
      const m = at(place({ zR, zC, lp: 0, latched: blank() }), `link${i},${j}`);
      const a = applyPoint(m, [-C, 0, 0]), b = applyPoint(m, [C, 0, 0]);
      rows.push(["col seat z", a[2], P.CT_FLOOR + zc + P.NOSE_R]);
      rows.push(["row seat z", b[2], P.RT_FLOOR + zr + P.BOSS_R]);
      rows.push(["row seat x", b[0], px(j) + C]);
      rows.push(["crown top", (a[2] + b[2]) / 2 + P.CROWN_R, P.CROWN_TOP + (zr + zc) / 2]);
    };
    probe(0, 0, 0, 0); probe(3, 6, P.STROKE, 0); probe(3, 6, 0, P.STROKE);
    probe(9, 9, P.STROKE, P.STROKE); probe(4, 7, P.STROKE, P.STROKE / 2);
    if (P.FACE2_TOP !== undefined) {
      const rim = P.FACE2_TOP;
      const latched = blank();
      latched[2]![5] = true;
      const placed = place({ zR: new Array<number>(N).fill(0), zC: new Array<number>(N).fill(0), lp: 0, latched });
      const capTop = P.FACE2_Z + T;
      const up = applyPoint(at(placed, "cap2,5"), [0, 0, capTop])[2];
      const dn = applyPoint(at(placed, "cap2,6"), [0, 0, capTop])[2];
      rows.push(["latched cap flush with rim", up, rim]);
      rows.push(["resting cap below rim", rim - dn, P.R_LATCH]);
    }
    const bad = rows.filter((r) => Math.abs(r[1] - r[2]) > 2e-3).map((r) => `${r[0]} ${r[1].toFixed(4)} != ${r[2].toFixed(4)}`);
    return { rows, bad };
  }

  const latch: CoincidenceLatch = {
    machine, N, STROKE: P.STROKE, LP_SLIDE: P.LP_SLIDE, CAM, CAMLIFT, LUG_TOT: P.LUG_TOT, plateTop: P.LP_Z + P.LP_T,
    crownRise: (i, j, zR, zC) => link(i, j, zR, zC).crown - P.CROWN_TOP,
    lugBot: (i, j, zR, zC, lp) => rodState(i, j, zR, zC, lp, false).lugBot,
    // writeRow() line 379 tests canLatch at the top of the stroke; it reads the plate at rest whatever lp is.
    latches: (i, j, zR, zC) => canLatch(i, j, zR, zC),
    // writeRow() commits with the plate at rest; doClear() (lines 364 to 369) drops every pin once the plate is out.
    catching: (lp) => lp < CAM + LATCH_RELEASE_MARGIN_MM,
    released: (lp) => lp >= CAM + LATCH_RELEASE_MARGIN_MM,
  };

  return { P, N, CAM, E_REST, CAMLIFT, ceil_v, link, rodState, canLatch, crankPhi, place, buildCheck, latch };
}
