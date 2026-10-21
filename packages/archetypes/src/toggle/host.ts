// The TOGGLE host plan: what part2d.js layoutXY computes beside the stick
// (originals/toggle/files/src/src/part2d.js lines 60 to 114: the solo
// terminal row, the round outline's tab, the BLOCKS grid positions and
// footprint), the BLOCKS ledge top of T.stack (line 165) and the pin cup
// heights of T.build (lines 429 to 433). A host build places its body and
// terminals from it and hands `plan` to the copper route search
// (packages/copper src/route/search.ts StickPlan, the same fields
// tools/legacy/toggle/dump-route.cjs records from the original).

import type { ProfileLookup } from "@hackbuild/spec";
import { solveToggle, type ToggleG, type ToggleState } from "./solver.js";
import { toggleLayer, type ToggleParams } from "./toggle.js";

/** Solo terminals (part2d.js lines 62 to 65): header pitch, header bore, the cup wall past the bore, the flat pad, mm. */
export const TOGGLE_TERMINAL = { pitch: 2.54, headerBoreR: 0.45, wireBoreMinR: 0.3, cupWall: 0.5, padR: 0.9 } as const;
/** The round outline (part2d.js lines 70 to 75): row offset past the minimum, tab top as a fraction of the radius. */
export const TOGGLE_ROUND = { rowLift: 0.4, tabTop: 0.35 } as const;
/**
 * BLOCKS brick (part2d.js lines 90 to 114, 165, 313 to 324), mm: stud
 * pitch, post radius, socket ring, plain PETG bore, flange, ledge stud and
 * its height, the ledge top floor and step, and the clearance a socket
 * under the body keeps from the collar beyond the lead radius.
 */
export const TOGGLE_BLOCKS = {
  pitch: 8, postR: 1.0, socketR0: 2.3, socketR1: 3.3, petgBoreR: 2.45, flangeR: 3.3, studR: 2.4, studH: 1.8,
  ledgeMin: 6.4, ledgeStep: 3.2, socketUp: 2.4, underPad: 0.65, underPost: 1.0, underEdge: 0.3,
} as const;

export interface ToggleRect { readonly x0: number; readonly x1: number; readonly y0: number; readonly y1: number }

/** One terminal: a solo pin cup or pad, or a BLOCKS grid position a net may land on. */
export interface ToggleTerm {
  readonly x: number;
  readonly y: number;
  /** Cup, pad or post radius, mm. */
  readonly r: number;
  /** P1 from the left seen from the top on a solo body; column letter and row number on BLOCKS. */
  readonly label: string;
}

/** A BLOCKS grid position (part2d.js lines 96 to 104). */
export interface ToggleBlocksPos {
  readonly i: number;
  readonly j: number;
  readonly x: number;
  readonly y: number;
  readonly label: string;
  /** In a ledge row beside the body. */
  readonly ledge: boolean;
  /** A net may land here: every ledge stud, and a socket under the body clear of the collar when pegs is bottom. */
  readonly usable: boolean;
}

/** The plan view the copper route search reads, field for field (StickPlan). */
export interface ToggleRoutePlan {
  readonly dirs: number;
  readonly blocks: boolean;
  readonly termKind: string | null;
  readonly w: number;
  readonly clr: number;
  readonly cons: number;
  readonly rf: number;
  readonly Re: number;
  readonly RA: number;
  readonly sectors: readonly { readonly c: number; readonly half: number }[];
  readonly terms: readonly { readonly x: number; readonly y: number; readonly r: number }[];
  readonly bbox: readonly [number, number, number, number];
  readonly outKind: "round" | "square";
  readonly outR: number | null;
  readonly tab: ToggleRect | null;
  readonly outHx: number | null;
  readonly outHy0: number | null;
  readonly outHy1: number | null;
  readonly foot: ToggleRect | null;
  readonly route: "1" | "2" | "auto";
}

export interface ToggleHost {
  /** The solved stick at the params' trace layer count. */
  readonly G: ToggleG;
  readonly plan: ToggleRoutePlan;
  readonly terms: readonly ToggleTerm[];
  /** Pin bore radius; 0 for pads and BLOCKS. */
  readonly boreR: number;
  /** Bore top and cup top, mm; null for pads and BLOCKS. */
  readonly boreTop: number | null;
  readonly cupTop: number | null;
  /** Top of the round outline's tab, mm; null without a tab. */
  readonly tabTop: number | null;
  /** BLOCKS only. */
  readonly positions: readonly ToggleBlocksPos[];
  readonly ledgeTop: number | null;
  /** The original's host warnings, word for word. */
  readonly warnings: readonly string[];
}

/** The host plan for P on the machine's layer; `route` is the original's print.route (auto tries 1 then 2 layers). */
export function toggleHost(P: ToggleParams, profile: ProfileLookup, machine = "ffc5p", route: "1" | "2" | "auto" = "auto"): ToggleHost {
  const L = toggleLayer(profile, machine);
  const G = solveToggle(P as ToggleState, L);
  const warnings: string[] = [];
  const up = (z: number): number => Math.ceil(z / L - 1e-6) * L;
  const n = G.dirs;
  const terms: ToggleTerm[] = [];
  const positions: ToggleBlocksPos[] = [];
  let boreR = 0, tab: ToggleRect | null = null, foot: ToggleRect | null = null;
  let bbox: [number, number, number, number];
  if (!G.blocks) {
    const T = TOGGLE_TERMINAL, np = n + 1;
    boreR = P.term === "header" ? T.headerBoreR : P.term === "wire" ? Math.max(T.wireBoreMinR, P.bore / 2) : 0;
    const cupR = P.term === "pads" ? T.padR : boreR + T.cupWall;
    const rowHalf = (np - 1) / 2 * T.pitch;
    const rowMin = G.Rw + G.pd + G.clr + cupR;
    let rowY: number;
    if (G.outKind === "round") {
      rowY = -Math.max(rowMin, Math.min(G.outR - G.edge - cupR, rowMin + TOGGLE_ROUND.rowLift));
      let out = false;
      for (let k = 0; k < np; k++) { const x = -rowHalf + k * T.pitch; if (Math.hypot(x, rowY) + cupR + G.edge > G.outR) out = true; }
      tab = out ? { x0: -(rowHalf + cupR + G.edge), x1: rowHalf + cupR + G.edge, y0: rowY - cupR - G.edge, y1: -G.outR * TOGGLE_ROUND.tabTop } : null;
      bbox = tab === null ? [-G.outR, -G.outR, G.outR, G.outR] : [Math.min(-G.outR, tab.x0), Math.min(-G.outR, tab.y0), Math.max(G.outR, tab.x1), G.outR];
    } else {
      rowY = -Math.max(rowMin, G.outHx - G.edge - cupR);
      bbox = [-G.outHx, -G.outHx, G.outHx, G.outHx];
    }
    for (let k = 0; k < np; k++) terms.push({ x: -rowHalf + k * T.pitch, y: rowY, r: cupR, label: `P${k + 1}` });
  } else {
    const B = G.studs, nets = n + 1, K = TOGGLE_BLOCKS;
    const half = B * K.pitch / 2;
    const addRow = (j: number, ledge: boolean): void => {
      for (let i = 0; i < B; i++) {
        positions.push({ i, j, x: -half + K.pitch / 2 + K.pitch * i, y: half - K.pitch / 2 - K.pitch * j, label: `${String.fromCharCode(65 + i)}${j + 1}`, ledge, usable: false });
      }
    };
    for (let j = 0; j < B; j++) addRow(j, false);
    const clear = G.Re + K.underPad + G.clr + K.underPost;
    const under = positions.filter((p) => Math.hypot(p.x, p.y) >= clear + K.underEdge).length;
    const rows = P.pegs === "bottom" ? (under >= nets ? 0 : Math.ceil((nets - under) / B)) : Math.ceil(nets / B);
    for (let j = B; j < B + rows; j++) addRow(j, true);
    positions.forEach((p, q) => { positions[q] = { ...p, usable: p.ledge || (P.pegs === "bottom" && Math.hypot(p.x, p.y) >= clear + K.underEdge) }; });
    const hx = G.outHx;
    foot = { x0: -hx, x1: hx, y0: half - K.pitch * (B + rows) + 0.1, y1: hx };
    bbox = [foot.x0, foot.y0, foot.x1, foot.y1];
    for (const p of positions) if (p.usable) terms.push({ x: p.x, y: p.y, r: K.postR, label: p.label });
  }
  let boreTop: number | null = null, cupTop: number | null = null, tabTop: number | null = null, ledgeTop: number | null = null;
  if (!G.blocks && P.term !== "pads") {
    boreTop = Math.max(G.topTrace.z1, up(P.pinDepth));
    cupTop = boreTop + 2 * L;
    if (cupTop > G.zT - 0.5) warnings.push("pin cups reach the top of the body");
  }
  if (tab !== null) tabTop = Math.max((cupTop ?? 0) + 2 * L, G.zf);
  if (G.blocks) {
    ledgeTop = Math.max(TOGGLE_BLOCKS.ledgeMin, Math.ceil((G.zf + 2 * L) / TOGGLE_BLOCKS.ledgeStep - 1e-6) * TOGGLE_BLOCKS.ledgeStep);
    if (G.zT < ledgeTop + 0.5) warnings.push("body top sits below the ledge studs");
  }
  const square = G.outKind === "square";
  const plan: ToggleRoutePlan = {
    dirs: n, blocks: G.blocks, termKind: G.blocks ? null : P.term, w: G.w, clr: G.clr, cons: G.cons, rf: G.rf, Re: G.Re, RA: G.RA,
    sectors: G.sectors.map((s) => ({ c: s.c, half: s.half })), terms: terms.map((t) => ({ x: t.x, y: t.y, r: t.r })), bbox,
    outKind: G.outKind, outR: square ? null : G.outR, tab, outHx: square ? G.outHx : null, outHy0: square ? G.outHy0 : null, outHy1: square ? G.outHy1 : null,
    foot, route,
  };
  return { G, plan, terms, boreR, boreTop, cupTop, tabTop, positions, ledgeTop, warnings };
}
