// OGEE16 kinematics: the one place a moving OGEE part is placed (D-139).
//
// link3, pinState, crankPhi, lCrankPhi, CAM, E_REST and ceil_v are
// kin_block.js (designs/ogee16/legacy/source, lines 4 to 38) line for line;
// kin_block.js is itself the JS twin of kin.py (lineage ogee16.kin/r16p,
// canonical). CAMLIFT, canLatch and the readout are kin.py lines 90, 121 to
// 124 and 144 to 166, which kin_block.js does not carry. place() is
// audit_print.py build() (lines 17 to 54) and crank() the placements of
// check_sweep.py main() (lines 45 to 59), with the latch crank angle taken
// from lCrankPhi, which equals check_sweep.py lphi(u) at lCrankPhi(LP_SLIDE u).
//
// Every dimension is read from params.scad by readScadParams, the port of
// kin.load_params (kin.py lines 17 to 41). Lengths in mm, angles in degrees
// unless a name says rad.

import { commandError } from "@hackbuild/spec";
import { IDENTITY, mul, rotX, rotY, rotZ, trans, type Mat4 } from "./mat4.js";
import { LATCH_RELEASE_MARGIN_MM, type CoincidenceLatch } from "../latch.js";

// ------------------------------------------------------------ kin.load_params

const FUNCS: Readonly<Record<string, (x: number) => number>> = {
  sqrt: Math.sqrt,
  sin: (d) => Math.sin((d * Math.PI) / 180),
  cos: (d) => Math.cos((d * Math.PI) / 180),
  tan: (d) => Math.tan((d * Math.PI) / 180),
  asin: (v) => (Math.asin(v) * 180) / Math.PI,
};

/** Evaluate one params.scad expression over env; undefined where kin.py's Python eval would raise. */
function evalExpr(src: string, env: ReadonlyMap<string, number>): number | undefined {
  const toks = src.match(/\d+\.?\d*(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?|[A-Za-z_]\w*|[-+*/%(),]|\S/g) ?? [];
  let i = 0;
  const peek = (): string | undefined => toks[i];
  const fail = (): never => {
    throw new SyntaxError(src);
  };
  const primary = (): number => {
    const t = toks[i++] ?? fail();
    if (/^[\d.]/.test(t)) return Number(t);
    if (t === "(") {
      const v = sum();
      if (toks[i++] !== ")") fail();
      return v;
    }
    if (t === "-") return -primary();
    if (t === "+") return primary();
    if (/^[A-Za-z_]/.test(t)) {
      if (peek() === "(") {
        i += 1;
        const f = FUNCS[t] ?? fail();
        const v = sum();
        if (toks[i++] !== ")") fail();
        return f(v);
      }
      return env.get(t) ?? fail();
    }
    return fail();
  };
  const product = (): number => {
    let v = primary();
    for (let t = peek(); t === "*" || t === "/" || t === "%"; t = peek()) {
      i += 1;
      const r = primary();
      v = t === "*" ? v * r : t === "/" ? v / r : v - Math.floor(v / r) * r;
    }
    return v;
  };
  const sum = (): number => {
    let v = product();
    for (let t = peek(); t === "+" || t === "-"; t = peek()) {
      i += 1;
      v = t === "+" ? v + product() : v - product();
    }
    return v;
  };
  try {
    const v = sum();
    return i === toks.length && Number.isFinite(v) ? v : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Port of kin.load_params (kin.py lines 17 to 41): strip line comments,
 * split on ";", keep each `NAME = expr` whose expression evaluates over the
 * names before it, later assignments winning. List literals, functions,
 * modules and specials ($fa) are skipped as kin.py skips them for scalars.
 */
export function readScadParams(text: string): Map<string, number> {
  const env = new Map<string, number>();
  for (const raw of text.replace(/\/\/.*/g, "").split(";")) {
    const m = /^([A-Za-z_]\w*)\s*=\s*([\s\S]+)$/.exec(raw.trim());
    if (m === null || m[1] === "function" || m[1] === "module" || m[2]!.trim().startsWith("[")) continue;
    const v = evalExpr(m[2]!.trim(), env);
    if (v !== undefined) env.set(m[1]!, v);
  }
  return env;
}

// ------------------------------------------------------------ params

/** The params.scad names the kinematics read; a missing one is a port fault, never a default. */
export const OGEE_PARAM_NAMES = [
  "N", "PITCH", "C", "T", "STROKE", "R_LATCH", "ROD_Z", "CROWN_R", "CROWN_OFF", "CROWN_TOP", "PIN_PLAY", "RAMP_A", "PIN_W",
  "LUG_P", "SLOT_E", "LP_SLIDE", "Z_LUG0", "LP_Z", "LUG_TOT", "CRANK_R", "CRANK_SW", "LCRANK_R", "LCRANK_SW",
  "ROW_BAR_Y", "COL_BAR_X", "RSV_Z", "CSV_Z", "LSV_X", "LSV_Y", "LSV_SHAFT_Z", "RAIL_X0", "RAIL_X1",
] as const;
export type OgeeParams = Readonly<Record<(typeof OGEE_PARAM_NAMES)[number], number>>;

function pick(P: ReadonlyMap<string, number>): OgeeParams {
  const out: Record<string, number> = {};
  for (const k of OGEE_PARAM_NAMES) {
    const v = P.get(k);
    if (v === undefined) {
      throw commandError({
        code: "E_REF", path: `/params/${k}`, got: null, expected: "a scalar params.scad defines",
        hint: `designs/ogee16/legacy/source/params.scad defines no ${k}; check the legacy copy against SHA256SUMS`, record: "viewer-sim",
      });
    }
    out[k] = v;
  }
  return out as OgeeParams;
}

// ------------------------------------------------------------ state and results

/** The state variables of kin.py: row and column bar rises, 0 to STROKE, and the latch plate slide, 0 to LP_SLIDE. */
export interface OgeeState {
  readonly zR: readonly number[];
  readonly zC: readonly number[];
  readonly lp: number;
}

/** link3: rocker angle (rad), pivot distance, link origin, crown centre and both pivots. */
export interface Link3 {
  readonly th: number;
  readonly L: number;
  readonly slot: number;
  readonly ox: number;
  readonly oz: number;
  readonly cx: number;
  readonly cz: number;
  readonly ax: number;
  readonly az: number;
  readonly bx: number;
  readonly bz: number;
}

/** pinState: the rod's y offset, origin z, slot offset e, whether it is cammed aside, its rise and lug bottom. */
export interface PinState {
  readonly y: number;
  readonly z: number;
  readonly e: number;
  readonly cammed: boolean;
  readonly rise: number;
  readonly lugBot: number;
  readonly crownTop: number;
  readonly rk: Link3;
}

/** One placed part of audit_print.py build(): label, STL base name, world matrix. */
export interface OgeePlaced {
  readonly name: string;
  readonly file: string;
  readonly at: Mat4;
}

/** The figures kin.py prints when run (lines 144 to 166), unrounded. */
export interface OgeeReadout {
  /** Lateral travel the lug needs to pass the plate edge, mm (CAM). */
  readonly cam: number;
  /** Lateral travel available, 2 PIN_PLAY, mm. */
  readonly camAvailable: number;
  /** Rise the rod gets climbing its own notch while cammed, mm (CAMLIFT). */
  readonly camLift: number;
  /** Crown rise of cell 0,0 with row 0 and column 0 at STROKE, mm. */
  readonly fullRise: number;
  /** Crown rise of cell 0,0 with row 0 at STROKE and column 0 at rest, mm. */
  readonly halfRise: number;
  /** Row slot taken up at half select, mm. */
  readonly halfSlotUse: number;
  /** Crown x offset from the cell at half select, mm. */
  readonly halfCrownX: number;
  /** Plate top minus lug top at half select, mm. */
  readonly halfMargin: number;
  /** Lug bottom minus plate top at full select, mm. */
  readonly fullOvershoot: number;
  /** Lug top at rest, mm. */
  readonly restLugTop: number;
  /** canLatch for every cell with row 0 and column 0 at STROKE, 1 where it latches. */
  readonly latchMatrix: readonly (readonly (0 | 1)[])[];
}

export interface OgeeKinematics {
  readonly P: OgeeParams;
  readonly N: number;
  readonly CAM: number;
  readonly E_REST: number;
  readonly CAMLIFT: number;
  ceil_v(u: number): number;
  link3(i: number, j: number, zR: readonly number[], zC: readonly number[]): Link3;
  pinState(i: number, j: number, zR: readonly number[], zC: readonly number[], lp: number, latched: boolean): PinState;
  crankPhi(rise: number): number;
  lCrankPhi(sl: number): number;
  canLatch(i: number, j: number, zR: readonly number[], zC: readonly number[]): boolean;
  readout(): OgeeReadout;
  /** audit_print.py build(zR, zC, lp): every part in its order, unlatched pins. */
  place(s: OgeeState): OgeePlaced[];
  /** check_sweep.py main(): the crank of a row or column bar, or the latch crank, at stroke fraction u, 0 to 1. */
  crank(kind: "row" | "col" | "latch", index: number, u: number): Mat4;
  /**
   * The latch as the programs and CHK-MOT-05 read it. The commit test is the
   * viewer's apply() (viewer_template.html lines 416 to 421): a free lug
   * bottom at or over the plate top less 1e-6 latches while lp < LATCH_RELEASE_MARGIN_MM, and
   * lp >= CAM + LATCH_RELEASE_MARGIN_MM drops every pin.
   */
  readonly latch: CoincidenceLatch;
}

const DEG = Math.PI / 180;

/** The OGEE16 kinematics over a params.scad reading (readScadParams). */
export function ogeeKinematics(params: ReadonlyMap<string, number>): OgeeKinematics {
  const P = pick(params);
  const N = P.N, PITCH = P.PITCH, T = P.T, C = P.C;
  const px = (j: number): number => j * PITCH, py = (i: number): number => i * PITCH;

  // kin_block.js lines 4 to 38.
  const CAM = (P.PIN_W / 2 + P.LUG_P + P.PIN_PLAY) - P.SLOT_E;
  const E_REST = -P.PIN_PLAY;
  const ceil_v = (u: number): number => -(u - (T / 2 - P.PIN_PLAY)) * Math.tan(P.RAMP_A * DEG);
  function link3(i: number, j: number, zR: readonly number[], zC: readonly number[]): Link3 {
    const xa = px(j) - C, za = P.ROD_Z + zC[j]!;
    const xb = px(j) + C, zb = P.ROD_Z + zR[i]!;
    const dx = xb - xa, dz = zb - za, L = Math.hypot(dx, dz), th = Math.atan2(dz, dx);
    return {
      th, L, slot: L - 2 * C,
      ox: xa + C * Math.cos(th), oz: za + C * Math.sin(th),
      cx: xa + (C + P.CROWN_OFF) * Math.cos(th), cz: za + (C + P.CROWN_OFF) * Math.sin(th),
      ax: xa, az: za, bx: xb, bz: zb,
    };
  }
  function pinState(i: number, j: number, zR: readonly number[], zC: readonly number[], lp: number, latched: boolean): PinState {
    const rk = link3(i, j, zR, zC);
    const crownTop = rk.cz + P.CROWN_R;
    const zFree = crownTop - ceil_v(E_REST + T / 2);
    const riseFree = zFree - P.CROWN_TOP;
    const rise = latched ? Math.max(riseFree, P.R_LATCH) : riseFree;
    const lugBot = P.Z_LUG0 + rise, lugTop = lugBot + P.LUG_TOT;
    const released = lp >= CAM + LATCH_RELEASE_MARGIN_MM;
    let cammed = !released && lugTop > P.LP_Z && lugBot < P.LP_Z + T;
    if (latched && rise >= P.R_LATCH - 1e-9) cammed = false;
    const e = cammed ? E_REST + CAM : E_REST;
    const zOn = crownTop - ceil_v(e + T / 2);
    const z = latched ? Math.max(zOn, P.CROWN_TOP + P.R_LATCH) : zOn;
    return { y: -e, z, e, cammed, rise: z - P.CROWN_TOP, lugBot: P.Z_LUG0 + (z - P.CROWN_TOP), crownTop, rk };
  }
  const PHI_REST = 180 + P.CRANK_SW;
  const crankPhi = (rise: number): number => {
    let s = Math.sin(PHI_REST * DEG) + rise / P.CRANK_R;
    s = Math.max(-1, Math.min(1, s));
    return 180 - Math.asin(s) / DEG;
  };
  const LPHI_REST = -P.LCRANK_SW;
  const lCrankPhi = (sl: number): number => {
    let s = Math.sin(LPHI_REST * DEG) + sl / P.LCRANK_R;
    s = Math.max(-1, Math.min(1, s));
    return Math.asin(s) / DEG;
  };

  // kin.py line 90.
  const CAMLIFT = ceil_v(E_REST + T / 2) - ceil_v(E_REST + CAM + T / 2);
  // kin.py lines 121 to 124.
  const canLatch = (i: number, j: number, zR: readonly number[], zC: readonly number[]): boolean => pinState(i, j, zR, zC, 0, false).lugBot >= P.LP_Z + T;

  function readout(): OgeeReadout {
    const z0 = Array.from({ length: N }, () => 0);
    const full = Array.from({ length: N }, () => P.STROKE);
    const one = Array.from({ length: N }, (_, k) => (k === 0 ? P.STROKE : 0));
    const rFull = link3(0, 0, full, full), rHalf = link3(0, 0, full, z0);
    const half = pinState(0, 0, full, z0, 0, false), sel = pinState(0, 0, full, full, 0, false);
    return {
      cam: CAM, camAvailable: 2 * P.PIN_PLAY, camLift: CAMLIFT,
      fullRise: rFull.cz + P.CROWN_R - P.CROWN_TOP,
      halfRise: rHalf.cz + P.CROWN_R - P.CROWN_TOP, halfSlotUse: rHalf.slot, halfCrownX: rHalf.cx - px(0),
      halfMargin: P.LP_Z + T - (half.lugBot + P.LUG_TOT),
      fullOvershoot: sel.lugBot - (P.LP_Z + T),
      restLugTop: P.Z_LUG0 + P.LUG_TOT,
      latchMatrix: Array.from({ length: N }, (_, i) => Array.from({ length: N }, (_, j) => (canLatch(i, j, one, one) ? 1 : 0))),
    };
  }

  // audit_print.py build(), lines 17 to 54, in its order.
  function place(s: OgeeState): OgeePlaced[] {
    const out: OgeePlaced[] = [];
    const add = (name: string, file: string, at: Mat4 = IDENTITY): void => {
      out.push({ name, file, at });
    };
    add("base", "base_asm"); add("deck", "deck"); add("face", "face_asm");
    for (const w of ["wall_xn_asm", "wall_xp_asm", "wall_yn_asm", "wall_yp_asm"]) add(w.replace("_asm", ""), w);
    add("rail0", "rail_asm");
    add("rail1", "rail_asm", trans(P.RAIL_X1 - P.RAIL_X0, 0, 0));
    add("latch", "latch_asm", trans(0, s.lp, 0));
    add("pull", "latchpull_asm", trans(0, s.lp, 0));
    for (let i = 0; i < N; i += 1) {
      add(`rowbar${i}`, "rowbar_asm", trans(0, py(i), s.zR[i]!));
      add(`shaftR${i}`, "shaft_row", mul(trans(0, py(i) + P.ROW_BAR_Y, P.RSV_Z), rotX(crankPhi(s.zR[i]!) * DEG)));
    }
    for (let j = 0; j < N; j += 1) {
      add(`colbar${j}`, "colbar_asm", trans(px(j), 0, s.zC[j]!));
      add(`shaftC${j}`, "shaft_col", mul(trans(px(j) + P.COL_BAR_X, 0, P.CSV_Z), rotY(-crankPhi(s.zC[j]!) * DEG)));
    }
    for (let i = 0; i < N; i += 1) {
      for (let j = 0; j < N; j += 1) {
        const rk = link3(i, j, s.zR, s.zC);
        add(`link${i}${j}`, "link", mul(trans(rk.ox, py(i), rk.oz), rotY(-rk.th)));
        const st = pinState(i, j, s.zR, s.zC, s.lp, false);
        const at = trans(px(j), py(i) + st.y - P.PIN_PLAY, st.z - P.CROWN_TOP);
        add(`rod${i}${j}`, "rod_asm", at);
        add(`cap${i}${j}`, "cap_asm", at);
      }
    }
    return out;
  }

  // check_sweep.py main(), lines 45 to 59.
  function crank(kind: "row" | "col" | "latch", index: number, u: number): Mat4 {
    if (kind === "row") return mul(trans(0, py(index) + P.ROW_BAR_Y, P.RSV_Z), rotX(crankPhi(P.STROKE * u) * DEG));
    if (kind === "col") return mul(trans(px(index) + P.COL_BAR_X, 0, P.CSV_Z), rotY(-crankPhi(P.STROKE * u) * DEG));
    const lx = P.LSV_X, ly = P.LSV_Y, lz = P.LSV_SHAFT_Z;
    return mul(mul(trans(lx, ly, lz), rotZ(lCrankPhi(P.LP_SLIDE * u) * DEG)), trans(-lx, -ly, -lz));
  }

  const latch: CoincidenceLatch = {
    machine: "ogee16", N, STROKE: P.STROKE, LP_SLIDE: P.LP_SLIDE, CAM, CAMLIFT, LUG_TOT: P.LUG_TOT, plateTop: P.LP_Z + T,
    crownRise: (i, j, zR, zC) => link3(i, j, zR, zC).cz + P.CROWN_R - P.CROWN_TOP,
    lugBot: (i, j, zR, zC, lp) => pinState(i, j, zR, zC, lp, false).lugBot,
    latches: (i, j, zR, zC, lp) => pinState(i, j, zR, zC, lp, false).lugBot >= P.LP_Z + T - 1e-6,
    catching: (lp) => lp < LATCH_RELEASE_MARGIN_MM,
    released: (lp) => lp >= CAM + LATCH_RELEASE_MARGIN_MM,
  };

  return { P, N, CAM, E_REST, CAMLIFT, ceil_v, link3, pinState, crankPhi, lCrankPhi, canLatch, readout, place, crank, latch };
}
