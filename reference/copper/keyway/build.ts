// reference/copper/keyway/build.ts
// KEYWAY rev A on packages/copper (M05-T14). A line for line port of the
// canonical generator, reference/copper/keyway/legacy/gen_keyway.py
// (lineage keyway.generator/rev-a), returning declarations: every net as
// the shapes the generator adds to it, the art, the gates' probes, films,
// windows and wiper, and the eight layers. The kernel evaluates the draft
// (packages/copper/src/vinyl/draft.ts) and packages/checks/src/copper runs
// the 45 gates on it; nothing here measures geometry.
//
// This module imports @hackbuild/spec and types only, so it runs where only
// data may cross (BUILD_IMPORTS, D-178).
// Literals the generator wrote inline (route polylines, terminal and pad
// corner radius 1.2, tick sizes, guide type sizes and offsets) are carried
// as written, each with its generator line.

import { commandError } from "@hackbuild/spec";
import type { AuditProbe, LayerDecl, LayerItem, Shape, TerminalDecl, VinylDraft, ZoneDecl } from "@hackbuild/copper";
import type { KeywayParams } from "./chase.surface";

type Pt = readonly [number, number];

const box = (x0: number, y0: number, x1: number, y1: number): Shape => ({ op: "box", x0, y0, x1, y1 });
const rr = (x0: number, y0: number, x1: number, y1: number, r: number): Shape => ({ op: "rr", x0, y0, x1, y1, r });
const union = (of: readonly Shape[]): Shape => ({ op: "union", of });

/** Colours of the generator's layers (gen_keyway.py line 325): ink, pink, cream; the film tint (line 354). */
const K = "#1a1a1a";
const PK = "#FE0386";
const CR = "#f5f0e6";
const GOLD = "#d9b45a";

/** gen_keyway.py lines 63 to 64. */
const LABEL: Readonly<Record<string, string>> = {
  SA: "SLD A", SB: "SLD B", SC: "SLD W", COM: "COM", GND: "COM", P1: "PAD 1", P2: "PAD 2", P3: "PAD 3", P4: "PAD 4",
};

const NETS = ["COM", "P1", "P2", "P3", "P4", "SA", "SB", "SC"] as const;

export interface KeywayPad {
  readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number;
  readonly col: number; readonly row: number; readonly fingers: number;
  readonly com_sp: readonly [number, number]; readonly sen_sp: readonly [number, number];
}

export interface KeywayBuild {
  readonly draft: VinylDraft;
  /** The generator's P dict as its geometry JSON writes it, for the params round trip. */
  readonly params: Readonly<Record<string, unknown>>;
  readonly pads: Readonly<Record<string, KeywayPad>>;
  readonly terminals: readonly TerminalDecl[];
  /** Finger overlap per finger, mm: the declared 27.2 of the facing edge stat (gen_keyway.py line 378). */
  readonly fingerOverlap: number;
}

export function build(p: KeywayParams): KeywayBuild {
  const nets: Record<string, Shape[]> = Object.fromEntries(NETS.map((n) => [n, [] as Shape[]]));
  const add = (net: string, g: Shape): void => {
    nets[net]!.push(g);
  };

  // ---- pads: sense outer, COM inner (lines 88 to 113)
  const pads: Record<string, KeywayPad> = {};
  const padX = [p.padX0, p.padX1];
  const padY = [p.padY0, p.padY1];
  for (const [name, col, row] of [["P1", 0, 1], ["P2", 1, 1], ["P3", 0, 0], ["P4", 1, 0]] as const) {
    const x0 = padX[col]!, y0 = padY[row]!;
    const x1 = x0 + p.padW, y1 = y0 + p.padH;
    const sw = p.spineW, fw = p.fingW, pitch = p.fingPitch, tg = p.tipGap;
    const left = col === 0;
    const senSp: [number, number] = left ? [x0, x0 + sw] : [x1 - sw, x1];
    const comSp: [number, number] = left ? [x1 - sw, x1] : [x0, x0 + sw];
    const senSide = left ? "L" : "R";
    const comSide = left ? "R" : "L";
    add("COM", box(comSp[0], y0, comSp[1], y1));
    add(name, box(senSp[0], y0, senSp[1], y1));
    const n = Math.floor((p.padH - 1.0) / pitch);
    const ybase = y0 + (p.padH - (n - 1) * pitch - fw) / 2.0;
    const span = (mine: readonly [number, number], other: readonly [number, number], side: string): [number, number] =>
      side === "L" ? [mine[1], other[0] - tg] : [other[1] + tg, mine[0]];
    for (let i = 0; i < n; i++) {
      const yy = ybase + i * pitch;
      if (i % 2 === 0) {
        const [a, b] = span(comSp, senSp, comSide);
        add("COM", box(Math.min(a, b), yy, Math.max(a, b), yy + fw));
      } else {
        const [a, b] = span(senSp, comSp, senSide);
        add(name, box(Math.min(a, b), yy, Math.max(a, b), yy + fw));
      }
    }
    pads[name] = { x0, y0, x1, y1, col, row, fingers: n, com_sp: comSp, sen_sp: senSp };
  }

  // ---- COM centre bus with the knocked out label (lines 115 to 121)
  const kt: Shape = {
    op: "translate", dx: (p.busX0 + p.busX1) / 2 + p.koCap / 2, dy: p.koY,
    of: { op: "rotate", deg: 90, origin: [0, 0], of: { op: "outerOnly", of: { op: "text", s: p.koText, weight: "700", cap: p.koCap, x: 0, y: 0 } } },
  };
  add("COM", { op: "difference", of: [box(p.busX0, p.busY0, p.busX1, p.busY1), kt] });

  // ---- slider (lines 123 to 137)
  const y0s = p.slY0, y1s = p.slY1;
  const xa0 = p.slA0, xa1 = p.slA1, xb0 = p.slB0, xb1 = p.slB1, xw0 = p.slW0, xw1 = p.slW1;
  const hmax = p.slHmax, hmin = p.slHmin, sg = p.slGap;
  const hA = (x: number): number => hmax + (hmin - hmax) * ((x - xw0) / (xw1 - xw0));
  add("SA", box(xa0, y0s, xa1, y1s));
  add("SA", { op: "poly", pts: [[xw0, y0s], [xw1, y0s], [xw1, y0s + hA(xw1)], [xw0, y0s + hA(xw0)]] });
  add("SB", box(xb0, y0s, xb1, y1s));
  const xbt = xa1 + sg;
  add("SB", { op: "poly", pts: [[xbt, y0s + hA(xbt) + sg], [xb0, y0s + hA(xb0) + sg], [xb0, y1s], [xbt, y1s]] });
  add("SC", rr(p.scX0, p.scY0, p.scX1, p.scY1, 1.2));

  // ---- escapes (lines 139 to 157). Within each side the trace that travels
  // farthest takes the lowest lane, so no riser crosses an occupied horizontal.
  const S = { SA: p.slotSA, P3: p.slotP3, P1: p.slotP1, P2: p.slotP2, P4: p.slotP4, SC: p.slotSC, SB: p.slotSB };
  const LN = [p.fanLane0, p.fanLane1, p.fanLane2, p.fanLane3] as const;
  const ROUTE: Readonly<Record<string, readonly Pt[]>> = {
    P1: [[15.5, 130.0], [S.P1, 130.0], [S.P1, LN[0]], [31.0, LN[0]], [31.0, 147.0]],
    P3: [[15.5, 64.0], [S.P3, 64.0], [S.P3, LN[1]], [19.0, LN[1]], [19.0, 160.0]],
    SA: [[14.5, 43.0], [14.5, p.hSA], [S.SA, p.hSA], [S.SA, LN[2]], [7.0, LN[2]], [7.0, 147.0]],
    COM: [[50.0, 132.0], [50.0, LN[0]], [43.0, LN[0]], [43.0, 160.0]],
    GND: [[57.0, 132.0], [57.0, LN[1]], [55.0, LN[1]], [55.0, 147.0]],
    P2: [[94.5, 130.0], [S.P2, 130.0], [S.P2, LN[0]], [67.0, LN[0]], [67.0, 160.0]],
    P4: [[94.5, 64.0], [S.P4, 64.0], [S.P4, LN[1]], [79.0, LN[1]], [79.0, 147.0]],
    SC: [[95.0, p.hSC], [S.SC, p.hSC], [S.SC, LN[2]], [91.0, LN[2]], [91.0, 160.0]],
    SB: [[88.0, 43.0], [88.0, p.hSB], [S.SB, p.hSB], [S.SB, LN[3]], [103.0, LN[3]], [103.0, 147.0]],
  };
  for (const [nm, pts] of Object.entries(ROUTE)) add(nm === "COM" || nm === "GND" ? "COM" : nm, { op: "wire", pts, w: p.tw });

  // ---- clip field (lines 159 to 167)
  const order = p.termOrder.split(/\s+/).filter((x) => x.length > 0);
  const terminals: TerminalDecl[] = [];
  order.forEach((nm, i) => {
    const cx = p.termX0 + i * p.termPitch;
    const row1 = i % 2 === 1;
    const y = row1 ? p.termRow1Y : p.termRow2Y;
    const net = nm === "COM" || nm === "GND" ? "COM" : nm;
    add(net, rr(cx - p.termSz / 2, y, cx + p.termSz / 2, y + p.termSz, 1.2));
    const end = ROUTE[nm]?.[ROUTE[nm]!.length - 1];
    // The generator asserts every route ends inside its pad (line 167).
    if (end === undefined || Math.abs(end[0] - cx) >= 1e-6 || !(y < end[1] && end[1] < y + p.termSz)) {
      throw commandError({ code: "E_SCHEMA", path: "/termOrder", got: nm, expected: `a route ending inside the clip pad at x ${cx}`, hint: "keep the field order monotone with the fan arrival order" });
    }
    terminals.push({ name: nm, net, label: LABEL[nm] ?? nm, cx, y, row: row1 ? 1 : 2, idx: i });
  });

  // ---- brand art and slider ticks (lines 169 to 192)
  const mark = (part: number): Shape => ({ op: "mark", part, size: p.markSize, x: p.markX, y: p.markY });
  const wm1: Shape = { op: "text", s: "hack", weight: "700", cap: p.wmCap, x: p.wmX, y: p.wmY1 };
  const wm2: Shape = { op: "text", s: ".build", weight: "700", cap: p.wmCap, x: p.wmX, y: p.wmY2 };
  const art: Shape[] = p.brand ? [mark(0), mark(1), wm1, wm2] : [];
  const brandK = union([mark(0), wm1]);
  const brandPK = union([mark(1), wm2]);
  const ticks: Shape[] = [];
  for (let i = 0; i < 5; i++) {
    const t = i / 4.0;
    const tx0 = xbt + 0.6 + t * ((xw1 - 0.6) - (xbt + 0.6));
    const hgt = i === 0 || i === 2 || i === 4 ? 3.0 : 2.0;
    ticks.push(box(tx0 - 0.9, 56.0, tx0 + 0.9, 56.0 + hgt));
  }
  art.push(...ticks);

  // ---- the netlist audit's 20 connections (lines 205 to 214)
  const audit: AuditProbe[] = [];
  for (const [nm, pd] of Object.entries(pads)) {
    audit.push({ net: "COM", what: `${nm} com spine`, region: box(pd.com_sp[0], pd.y0, pd.com_sp[1], pd.y1) });
    audit.push({ net: nm, what: `${nm} sense spine`, region: box(pd.sen_sp[0], pd.y0, pd.sen_sp[1], pd.y1) });
  }
  for (const t of terminals) audit.push({ net: t.net, what: `${t.name} clip pad`, point: [t.cx, t.y + p.termSz / 2] });
  audit.push({ net: "SA", what: "a spine", region: box(xa0, y0s, xa1, y1s) });
  audit.push({ net: "SB", what: "b spine", region: box(xb0, y0s, xb1, y1s) });
  audit.push({ net: "SC", what: "collector pad", region: box(p.scX0, p.scY0, p.scX1, p.scY1) });

  // ---- non-copper layers (lines 254 to 266)
  const padList = Object.values(pads);
  const inset = (pd: KeywayPad, d: number): Shape => box(pd.x0 + d, pd.y0 + d, pd.x1 - d, pd.y1 - d);
  const VELO = padList.map((pd) => inset(pd, p.veloInset));
  const VELO_SL = box(p.veloSlX0, p.veloSlY0, p.veloSlX1, p.veloSlY1);
  const SP_WIN = padList.map((pd) => inset(pd, p.spWinInset));
  const SPL: Shape = { op: "difference", of: [box(p.padX0 - p.spOut, p.padY0 - p.spOut, p.padX1 + p.padW + p.spOut, p.padY1 + p.padH + p.spOut), union(SP_WIN)] };
  const SPU_BOX = box(p.spuX0, p.spuY0, p.spuX1, p.spuY1);
  const SLOT = box(p.slotX0, p.slotY0, p.slotX1, p.slotY1);
  const SPU: Shape = { op: "difference", of: [SPU_BOX, SLOT] };
  const WIPER = box(p.wiperX0, p.wiperY0, p.wiperX1, p.wiperY1);
  const FOAM = padList.map((pd) => inset(pd, p.foamInset));

  const zones: ZoneDecl[] = Object.keys(pads).map((nm, i) => ({ net: nm, common: "COM", film: VELO[i]!, window: SP_WIN[i]! }));

  // ---- the guide's type (lines 343 to 352)
  const tx: Shape[] = [];
  const T = (s: string, cap: number, x: number, y: number, weight: "400" | "600" | "700" = "600"): void => {
    tx.push({ op: "text", s, weight, cap, x, y, anchor: "c" });
  };
  for (const t of terminals) T(t.label, 2.2, t.cx, t.row === 1 ? t.y + p.termSz + 1.4 : t.y - 3.2);
  for (const [nm, pd] of Object.entries(pads)) T(nm.slice(1), 7.0, (pd.x0 + pd.x1) / 2, (pd.y0 + pd.y1) / 2 - 3.5, "700");
  T(`KEYWAY  REV A  .  4 FORCE ZONES + GRADED SLIDER`, 2.2, p.W / 2, 31.4);
  T("make things. break things. repeat.", 2.0, p.W / 2, 1.9, "400");

  // ---- the eight layers, bottom first (lines 326 to 362)
  const RIM: Shape = { op: "rim" };
  const ink = (s: Shape): LayerItem => ({ shape: union([s, RIM]), fill: K, opacity: 1, stroke: null, strokeWidth: 0 });
  const fill = (shape: Shape, colour: string, opacity: number): LayerItem => ({ shape, fill: colour, opacity, stroke: null, strokeWidth: 0 });
  const dashed = (shape: Shape, colour: string, w: number): LayerItem => ({ shape, fill: null, opacity: 1, stroke: colour, strokeWidth: -w });
  const layers: LayerDecl[] = [
    { id: "backer", file: "07_backer.svg", title: "KEYWAY rev A  backer, 2 mm chipboard or 1/16 in ply", role: "backer", material: "chipboard-2",
      region: { op: "outline" }, items: [{ shape: RIM, fill: K, opacity: 1, stroke: null, strokeWidth: 0 }] },
    { id: "guide", file: "08_overlay_guide.svg", title: "KEYWAY rev A  placement guide / faceplate art  (print then cut)", role: "guide",
      region: { op: "outline" }, ground: CR, items: [
        fill(union([...VELO, VELO_SL]), GOLD, 0.3),
        fill({ op: "nets" }, PK, 0.3),
        fill(brandK, K, 1),
        fill(brandPK, PK, 1),
        fill(union(ticks), K, 1),
        dashed(union([...SP_WIN, SLOT]), K, 0.25),
        dashed(union([SPL, SPU, WIPER]), PK, 0.3),
        fill(union(tx), K, 1),
      ] },
    { id: "copper", file: "01_copper_base.svg", title: `KEYWAY rev A  base copper + outline  (adhesive copper foil)${p.brand ? "  [brand art in copper]" : ""}`,
      role: "copper", material: "copper-tape", region: { op: "copper" }, items: [ink({ op: "copper" })] },
    { id: "spacer-lower", file: "03_spacer_lower.svg", title: "KEYWAY rev A  lower spacer, 0.3 mm cardstock (tents the pad Velostat)",
      role: "spacer", material: "cardstock-030", region: SPL, windows: union(SP_WIN), items: [ink(SPL)] },
    { id: "film", file: "02_velostat.svg", title: "KEYWAY rev A  Velostat / Linqstat force layer", role: "film", material: "velostat",
      region: union([...VELO, VELO_SL]), items: [ink(union([...VELO, VELO_SL]))] },
    { id: "spacer-upper", file: "04_spacer_upper.svg", title: "KEYWAY rev A  upper spacer, 0.3 mm cardstock (holds the wiper off)",
      role: "spacer", material: "cardstock-030", region: SPU, windows: SLOT, items: [ink(SPU)] },
    { id: "wiper", file: "05_copper_wiper.svg", title: "KEYWAY rev A  slider wiper, top copper", role: "wiper", material: "copper-tape",
      region: WIPER, items: [ink(WIPER)] },
    { id: "caps", file: "06_foam_caps.svg", title: "KEYWAY rev A  key caps, 2 mm EVA foam (optional)", role: "caps", material: "eva-2",
      region: union(FOAM), items: [ink(union(FOAM))] },
  ];

  const draft: VinylDraft = {
    name: "KEYWAY", rev: "A", W: p.W, H: p.H, R: p.R, edgeKeep: p.edgeKeep, clr: p.clr, smooth: p.smooth,
    nets: NETS.map((name) => ({ name, shapes: nets[name]! })),
    art, ticks: ticks.length, brand: p.brand,
    audit,
    sliders: [{ id: "slider", a: "SA", b: "SB", travel: [xbt + 0.6, xw1 - 0.6], band: [y0s, y1s] }],
    clips: { pitch: p.termPitch, size: p.termSz, terminals },
    zones, filmName: "Velostat",
    wiper: { wiper: WIPER, film: VELO_SL, filmNets: ["SA", "SB"], collector: "SC", landing: [p.scX0, p.scY0, p.scX1, p.scY1], spacerOuter: SPU_BOX, slot: SLOT },
    films: [...VELO, VELO_SL],
    spacers: [SPL, SPU],
    layers,
    repeatClose: true,
    // The gates in print order (lines 201 to 287, the document size last at lines 382 to 383).
    program: [
      { kind: "islands", pad: 4 }, { kind: "audit" }, { kind: "clearance" }, { kind: "keepout" }, { kind: "erode", style: "ratio", pad: 4 },
      { kind: "artGaps" }, { kind: "wedge", slider: 0 }, { kind: "stagger" }, { kind: "zones" }, { kind: "slidingFilm" }, { kind: "wiper" },
      { kind: "filmKeepout" }, { kind: "spacers" }, { kind: "docSize" },
    ],
  };

  const params: Record<string, unknown> = {
    name: "KEYWAY", rev: "A", W: p.W, H: p.H, R: p.R, edge_keep: p.edgeKeep, clr: p.clr, tw: p.tw,
    pad_w: p.padW, pad_h: p.padH, pad_x: [p.padX0, p.padX1], pad_y: [p.padY0, p.padY1],
    spine_w: p.spineW, fing_w: p.fingW, fing_pitch: p.fingPitch, tip_gap: p.tipGap,
    bus: [p.busX0, p.busX1], bus_y: [p.busY0, p.busY1], ko_text: p.koText, ko_cap: p.koCap, ko_y: p.koY,
    slots: { SA: p.slotSA, P3: p.slotP3, P1: p.slotP1, P2: p.slotP2, P4: p.slotP4, SC: p.slotSC, SB: p.slotSB },
    sl_y: [p.slY0, p.slY1], sl_gap: p.slGap, sl_hmax: p.slHmax, sl_hmin: p.slHmin,
    sl_a_spine: [p.slA0, p.slA1], sl_b_spine: [p.slB0, p.slB1], sl_wedge: [p.slW0, p.slW1],
    sc_pad: [p.scX0, p.scY0, p.scX1, p.scY1], h_sa: p.hSA, h_sb: p.hSB, h_sc: p.hSC,
    term_n: order.length, term_x0: p.termX0, term_pitch: p.termPitch, term_sz: p.termSz,
    term_row2_y: p.termRow2Y, term_row1_y: p.termRow1Y, fan_y: p.fanY,
    fan_lanes: [p.fanLane0, p.fanLane1, p.fanLane2, p.fanLane3], term_order: order,
    band: [p.bandY0, p.bandY1], mark_size: p.markSize, mark_x: p.markX, mark_y: p.markY,
    wm_cap: p.wmCap, wm_x: p.wmX, wm_y1: p.wmY1, wm_y2: p.wmY2,
    velo_inset: p.veloInset, sp_win_inset: p.spWinInset, sp_out: p.spOut, foam_inset: p.foamInset,
    velo_sl: [p.veloSlX0, p.veloSlY0, p.veloSlX1, p.veloSlY1], spu: [p.spuX0, p.spuY0, p.spuX1, p.spuY1],
    spu_slot: [p.slotX0, p.slotY0, p.slotX1, p.slotY1], wiper: [p.wiperX0, p.wiperY0, p.wiperX1, p.wiperY1],
  };

  return { draft, params, pads, terminals, fingerOverlap: 27.2 };
}
