// designs/blocks/src/route-seat.ts
// BLOCKS seats route on packages/copper (M05-T09 step 6, the D-029 trigger).
// A port of the BOSS SEAT router setup from the legacy copy
// designs/blocks/legacy/boss-src (lineage blocks.parts/boss-legacy,
// router/boss-route; the canonical BLOCKS-1 seat, blocks.parts/blocks-1,
// lands pins in sockets with other pads and heights, and D-087 keeps the
// reproduction at BOSS v1): the board pad maps and boardPins (src/parts.js lines
// 14 to 36), autosize and seatTargets (lines 72 to 100), the parameter
// defaults (lines 101 to 111) and the part of seat() that picks pins,
// targets, obstacles and nets (lines 112 to 172), with the BOSS v1 STD
// values it reads (src/boss.js lines 11 to 25, snap at line 6). The config
// this file builds equals what BOSS handed BOSS.route, value for value
// (packages/copper/test/fixtures/boss-seats/, written by
// tools/legacy/boss/dump-route-cfg.cjs).
//
// BOSS's own route() (boss.js lines 132 to 256: 4-connected A*, bend 4,
// rip up) is not ported. The nets go to the one router in octile mode
// (D-092): pads and posts become terminals, a pad keeps its rectangle,
// the outline keep-in is BOSS's border dilation clr + w/2 (boss.js lines
// 136 and 155 to 156). The full BLOCKS chase port is M10; D-087 keeps the
// reproduction at BOSS v1.
//
// Seat params are schema checked before anything is laid out: BOSS's own
// sweep passed `pins: 'all'`, which seat() read as a list, matched nothing
// and built a 0-pin seat that reported clean (benches-conductive-b.md
// B.11). Here an
// unknown key, a value outside the parameter's range or a pin name the
// board does not have is E_SCHEMA, exit 2.

import type { ConstantSource } from "@hackbuild/geom";
import { commandError } from "@hackbuild/spec";
import { route, type RouteInput, type RouteResult } from "@hackbuild/copper";

/** BOSS v1 STD values the seat layout reads, mm (boss.js lines 11 to 25, L line 5). */
export const BOSS_STD = (() => {
  const s = { P: 8.0, studD: 4.8, brickH: 9.6, postD: 3.0, padW: 1.8, boreInPad: 1.2, L1: 3.36, traceT: 0.72, gapT: 0.48, traceW: 1.0, clr: 0.6, cell: 0.4, L: 0.24 };
  const L2 = s.L1 + s.traceT + s.gapT;
  return { ...s, L2, padTop: L2 + s.traceT } as const;
})();

/** BOSS's layer snap (boss.js line 6). */
const snap = (z: number, up: boolean): number => (up ? Math.ceil(z / BOSS_STD.L - 1e-6) : Math.round(z / BOSS_STD.L)) * BOSS_STD.L;

/** A board pad map: dimensions mm, pins per side top to bottom; provenance inferred, no drawing cited (benches-conductive-b.md B.6). */
export interface SeatBoard {
  readonly name: string;
  readonly w: number;
  readonly l: number;
  readonly pitch: number;
  readonly rowX: number;
  readonly n: number;
  readonly left: readonly string[] | null;
  readonly right: readonly string[] | null;
  readonly defaultPins?: readonly string[];
}

/** parts.js lines 14 to 28, the routing fields. */
export const SEAT_BOARDS: Readonly<Record<"c3mini" | "pico" | "teensy40" | "custom", SeatBoard>> = {
  c3mini: { name: "ESP32-C3 SuperMini", w: 18.0, l: 22.4, pitch: 2.54, rowX: 8.75, n: 8,
    left: ["5V", "GND", "3V3", "IO4", "IO3", "IO2", "IO1", "IO0"], right: ["IO5", "IO6", "IO7", "IO8", "IO9", "IO10", "IO20", "IO21"] },
  pico: { name: "Raspberry Pi Pico", w: 21.0, l: 51.0, pitch: 2.54, rowX: 8.89, n: 20,
    left: ["GP0", "GP1", "GND", "GP2", "GP3", "GP4", "GP5", "GND", "GP6", "GP7", "GP8", "GP9", "GND", "GP10", "GP11", "GP12", "GP13", "GND", "GP14", "GP15"],
    right: ["VBUS", "VSYS", "GND", "3V3_EN", "3V3", "ADC_VREF", "GP28", "GND", "GP27", "GP26", "RUN", "GP22", "GND", "GP21", "GP20", "GP19", "GP18", "GND", "GP17", "GP16"],
    defaultPins: ["GP0", "GP1", "GND", "GP2", "GP3", "GP4", "GP5", "GP6", "GP7", "GP8", "GP9", "GP10", "VBUS", "VSYS", "GND", "3V3", "GP28", "GP27", "GP26", "GP22", "GP21", "GP20", "GP19", "GP18"] },
  teensy40: { name: "Teensy 4.0", w: 17.78, l: 35.56, pitch: 2.54, rowX: 7.62, n: 14,
    left: ["GND", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
    right: ["Vin", "GND", "3.3V", "23", "22", "21", "20", "19", "18", "17", "16", "15", "14", "13"] },
  custom: { name: "custom board", w: 18, l: 24, pitch: 2.54, rowX: 8.75, n: 8, left: null, right: null },
};

export interface SeatPin { readonly name: string; readonly side: "L" | "R"; readonly k: number; x: number; readonly y: number }

/** Pins left then right, top to bottom (parts.js lines 29 to 36). */
export function boardPins(bd: SeatBoard): SeatPin[] {
  const left = bd.left ?? Array.from({ length: bd.n }, (_, k) => "L" + (k + 1));
  const right = bd.right ?? Array.from({ length: bd.n }, (_, k) => "R" + (k + 1));
  const pins: SeatPin[] = [];
  for (let k = 0; k < bd.n; k++) { const y = (bd.n - 1) / 2 * bd.pitch - k * bd.pitch; pins.push({ name: left[k]!, side: "L", k, x: -bd.rowX, y }); }
  for (let k = 0; k < bd.n; k++) { const y = (bd.n - 1) / 2 * bd.pitch - k * bd.pitch; pins.push({ name: right[k]!, side: "R", k, x: bd.rowX, y }); }
  return pins;
}

/** Seat parameters (parts.js lines 101 to 111). */
export interface SeatParams {
  readonly board: keyof typeof SEAT_BOARDS;
  readonly mount: "press" | "snap";
  readonly pinLen: number;
  readonly hinge: "pin" | "none";
  readonly cw: number;
  readonly cl: number;
  readonly cn: number;
  readonly crow: number;
  /** Pin names (or name#index) that get a column; null is the board default. */
  readonly pins: readonly string[] | null;
}

type NumKey = "pinLen" | "cw" | "cl" | "cn" | "crow";
const NUM: Readonly<Record<NumKey, { min: number; max: number; step: number; def: number }>> = {
  pinLen: { min: 3, max: 8, step: 0.5, def: 6 },
  cw: { min: 10, max: 40, step: 0.1, def: 18 },
  cl: { min: 10, max: 80, step: 0.1, def: 24 },
  cn: { min: 2, max: 24, step: 1, def: 8 },
  crow: { min: 4, max: 20, step: 0.01, def: 8.75 },
};
const ENUM = { board: Object.keys(SEAT_BOARDS) as (keyof typeof SEAT_BOARDS)[], mount: ["press", "snap"], hinge: ["pin", "none"] } as const;
const DEFAULTS = { board: "c3mini", mount: "press", hinge: "pin", pins: null } as const;

const schema = (path: string, got: unknown, expected: string, hint: string): never => {
  throw commandError({ code: "E_SCHEMA", path, got, expected, hint });
};

/** Validate seat params against the schema and fill the defaults; anything else is E_SCHEMA, exit 2. */
export function seatParams(raw: unknown): SeatParams {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return schema("", raw, "an object of seat params", "pass seat params as an object");
  const p = raw as Record<string, unknown>;
  const known = new Set<string>([...Object.keys(ENUM), ...Object.keys(NUM), "pins"]);
  for (const k of Object.keys(p)) if (!known.has(k)) schema(`/${k}`, p[k], `one of ${[...known].join(", ")}`, `drop ${k}; the seat does not read it`);
  const pick = <K extends keyof typeof ENUM>(k: K): (typeof ENUM)[K][number] => {
    const v = p[k] ?? DEFAULTS[k];
    if (typeof v !== "string" || !(ENUM[k] as readonly string[]).includes(v)) schema(`/${k}`, v, `one of ${ENUM[k].join(", ")}`, `set ${k} to one of ${ENUM[k].join(", ")}`);
    return v as (typeof ENUM)[K][number];
  };
  const num = (k: NumKey): number => {
    const s = NUM[k], v = p[k] ?? s.def;
    const onStep = typeof v === "number" && Math.abs((v - s.min) / s.step - Math.round((v - s.min) / s.step)) < 1e-6;
    if (typeof v !== "number" || !Number.isFinite(v) || v < s.min || v > s.max || !onStep) schema(`/${k}`, v, `a number from ${s.min} to ${s.max} in steps of ${s.step}`, `set ${k} inside its range`);
    return v as number;
  };
  const board = pick("board");
  const out = { board, mount: pick("mount"), hinge: pick("hinge"), pinLen: num("pinLen"), cw: num("cw"), cl: num("cl"), cn: num("cn"), crow: num("crow") };
  const pins = p["pins"] ?? null;
  if (pins !== null) {
    if (!Array.isArray(pins) || pins.length === 0 || !pins.every((q) => typeof q === "string")) {
      schema("/pins", pins, "a non-empty list of pin names, or null for the board default", "list the pins by name, for example [\"IO2\", \"GND\"]");
    }
    const names = boardPins(boardOf(out)).flatMap((q, i) => [q.name, `${q.name}#${i}`]);
    for (const [i, q] of (pins as string[]).entries()) if (!names.includes(q)) schema(`/pins/${i}`, q, `a pin of ${SEAT_BOARDS[board].name}`, `name a pin the board has`);
  }
  return { ...out, pins: pins as readonly string[] | null };
}

function boardOf(p: Pick<SeatParams, "board" | "cw" | "cl" | "cn" | "crow">): SeatBoard {
  const bd = SEAT_BOARDS[p.board];
  return p.board === "custom" ? { ...bd, w: p.cw, l: p.cl, n: p.cn, rowX: p.crow } : bd;
}

/** parts.js lines 72 to 85. */
function autosize(bd: SeatBoard, mount: string, nSel: number, hinge: string): { cols: number; rows: number; lanes: number } {
  const { P } = BOSS_STD, STD = BOSS_STD;
  const halfNeed = mount === "snap" ? bd.w / 2 + 0.2 + 1.2 + (hinge === "pin" ? 0.3 + 4.4 : 1.6 + 0.9) + 0.3 : bd.w / 2 + 0.8;
  let cols = 4; while ((cols - 1) * P / 2 - STD.studD / 2 - 0.4 < halfNeed) cols++;
  const halfLen = bd.l / 2 + (mount === "snap" ? 3.2 : 1.2);
  let rows = 3; while ((rows - 1) * P / 2 - STD.studD / 2 - 0.4 < halfLen) rows++;
  const perSide = (c: number, r: number): number => r + 2 * Math.floor((c - 2) / 2);
  while (perSide(cols, rows) < nSel) { if ((cols + 1) * rows <= cols * (rows + 1) && perSide(cols + 1, rows) > perSide(cols, rows)) cols++; else rows++; }
  const laneStart = bd.rowX + STD.padW / 2 + STD.clr + STD.traceW / 2;
  const lanes = (c: number): number => Math.floor(((c - 1) * P / 2 - STD.postD / 2 - STD.clr - STD.traceW / 2 - laneStart) / 0.8) + 1;
  while (lanes(cols) < Math.ceil(nSel / 2) + 2) cols++;
  return { cols, rows, lanes: lanes(cols) };
}

/** parts.js lines 86 to 100. */
function seatTargets(cols: number, rows: number): { L: { i: number; j: number }[]; R: { i: number; j: number }[] } {
  const P = BOSS_STD.P;
  const e = Math.floor((cols - 2) / 2);
  const mk = (side: "L" | "R"): { i: number; j: number }[] => {
    const sx = side === "L" ? -1 : 1, endXs: number[] = [];
    for (let q = 1; q <= e; q++) endXs.push(sx * (cols - 1 - 2 * q) / 2 * P * -1);
    const endTop = endXs.map((x) => ({ i: Math.round(x / P + (cols - 1) / 2), j: rows - 1 }));
    const endBot = endXs.map((x) => ({ i: Math.round(x / P + (cols - 1) / 2), j: 0 })).reverse();
    const sideI = side === "L" ? 0 : cols - 1;
    const sideCol: { i: number; j: number }[] = []; for (let j = rows - 1; j >= 0; j--) sideCol.push({ i: sideI, j });
    return endTop.concat(sideCol, endBot);
  };
  return { L: mk("L"), R: mk("R") };
}

export type SeatObstacle =
  | { readonly shape: "rect"; readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number }
  | { readonly shape: "circle"; readonly cx: number; readonly cy: number; readonly r: number };

export interface SeatNet {
  readonly name: string;
  /** Pad or bump centre, mm. */
  readonly a: readonly [number, number];
  /** Column post centre, mm. */
  readonly b: readonly [number, number];
  /** Obstacle indices this net owns: its pad and its post. */
  readonly own: readonly [number, number];
  readonly prefer: number;
}

/** The router config of one seat, in BOSS's shape (boss.js line 131). */
export interface SeatLayout {
  readonly cols: number;
  readonly rows: number;
  /** Body top, mm. */
  readonly top: number;
  readonly pinMap: readonly { pin: string; col: string; i: number; j: number }[];
  readonly cfg: { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number; readonly obstacles: readonly SeatObstacle[]; readonly nets: readonly SeatNet[]; readonly layers: 2 };
}

/** Lay out a seat's router config (parts.js lines 112 to 172). */
export function seatLayout(raw: unknown): SeatLayout {
  const p = seatParams(raw);
  const STD = BOSS_STD, P = STD.P;
  const cx = (i: number, cols: number): number => (i - (cols - 1) / 2) * P, cy = (j: number, rows: number): number => (j - (rows - 1) / 2) * P;
  const bd = boardOf(p);
  const pins = boardPins(bd);
  const selNames = p.pins ?? bd.defaultPins ?? pins.map((q) => q.name);
  const selected = pins.map((q, idx) => selNames.includes(q.name) || selNames.includes(q.name + "#" + idx));
  const nSelL = pins.filter((q, i) => q.side === "L" && selected[i]).length, nSelR = pins.filter((q, i) => q.side === "R" && selected[i]).length;
  const { cols, rows } = autosize(bd, p.mount, Math.max(nSelL, nSelR), p.hinge);
  const snapMode = p.mount === "snap";
  const top = snapMode ? STD.brickH : snap(STD.padTop + STD.boreInPad + (p.pinLen - STD.boreInPad), true);
  const T = seatTargets(cols, rows);
  const pick = <V>(list: V[], n: number): V[] => { const s = Math.max(0, Math.floor((list.length - n) / 2)); return list.slice(s, s + n); };
  const tl = pick(T.L, nSelL), tr = pick(T.R, nSelR);
  let li = 0, ri = 0;
  const nets: SeatNet[] = [], obstacles: SeatObstacle[] = [], pinMap: { pin: string; col: string; i: number; j: number }[] = [];
  const padHalf = STD.padW / 2;
  for (let idx = 0; idx < pins.length; idx++) {
    const q = pins[idx]!;
    if (!selected[idx]) continue;
    // the snap seat's contact bump sits under the castellation (parts.js lines 144 to 148)
    if (snapMode) q.x = q.side === "L" ? -(bd.w / 2 - 1.0) : (bd.w / 2 - 1.0);
    obstacles.push({ shape: "rect", x0: q.x - (snapMode ? 1.0 : padHalf), y0: q.y - (snapMode ? 0.7 : padHalf), x1: q.x + (snapMode ? 1.0 : padHalf), y1: q.y + (snapMode ? 0.7 : padHalf) });
    const tgt = q.side === "L" ? tl[li++]! : tr[ri++]!;
    const X = cx(tgt.i, cols), Y = cy(tgt.j, rows);
    pinMap.push({ pin: q.name, col: `C${tgt.i + 1}.${tgt.j + 1}`, i: tgt.i, j: tgt.j });
    obstacles.push({ shape: "circle", cx: X, cy: Y, r: STD.postD / 2 });
    nets.push({ name: q.name, a: [q.x, q.y], b: [X, Y], own: [obstacles.length - 2, obstacles.length - 1], prefer: q.k % 2 });
  }
  const half = (cols * P) / 2, halfL = (rows * P) / 2;
  return { cols, rows, top, pinMap, cfg: { x0: -half, y0: -halfL, x1: half, y1: halfL, obstacles, nets, layers: 2 } };
}

/**
 * Route settings for a seat on the one router. w, clr and grid are BOSS's
 * (traceW, clr, cell); the keep-in margin is BOSS's border dilation clr +
 * w/2; a via is a w x w plug through the separation layer as TOGGLE emits
 * one (toggle src/src/part2d.js line 299, BOSS has none); iterations are
 * PIP's default (pip-controller src/layout.js line 28).
 */
export const SEAT_ROUTE = { iters: 24 } as const;

/** The seat's nets as router input: the pad is a terminal with its rectangle, the post a disc. */
export function seatRouteInput(layout: SeatLayout): RouteInput {
  const STD = BOSS_STD, c = layout.cfg;
  const nets = c.nets.map((n) => {
    const pad = c.obstacles[n.own[0]]!, post = c.obstacles[n.own[1]]!;
    if (pad.shape !== "rect" || post.shape !== "circle") throw new Error(`seat net ${n.name} owns ${pad.shape} and ${post.shape}, expected rect and circle`);
    const hx = (pad.x1 - pad.x0) / 2, hy = (pad.y1 - pad.y0) / 2;
    return { name: n.name, terms: [{ x: n.a[0], y: n.a[1], r: Math.min(hx, hy), pad: { hx, hy } }, { x: n.b[0], y: n.b[1], r: post.r }] };
  });
  return {
    outline: [[[c.x0, c.y0], [c.x1, c.y0], [c.x1, c.y1], [c.x0, c.y1]]],
    nets,
    settings: { w: STD.traceW, clr: STD.clr, grid: STD.cell, via: STD.traceW, margin: STD.clr + STD.traceW / 2, iters: SEAT_ROUTE.iters },
  };
}

export interface SeatRoute {
  readonly layout: SeatLayout;
  readonly route: RouteResult;
  /** Nets with every terminal connected. */
  readonly routed: number;
  readonly total: number;
  /** Per net trace length, stubs included, mm. */
  readonly lenMm: readonly { readonly net: string; readonly mm: number }[];
}

/** Lay out a seat and route it on packages/copper in octile mode. */
export function routeSeat(raw: unknown, profile: ConstantSource): SeatRoute {
  const layout = seatLayout(raw);
  const r = route(seatRouteInput(layout), profile);
  const lenMm = r.nets.map((n) => ({ net: n.name, mm: n.len + n.stubs.reduce((a, [t, c]) => a + Math.hypot(t[0] - c[0], t[1] - c[1]), 0) }));
  return { layout, route: r, routed: r.nets.filter((n) => n.fails === 0).length, total: r.nets.length, lenMm };
}
