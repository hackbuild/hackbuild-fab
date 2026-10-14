// reference/copper/vernier/build.ts
// VERNIER rev A on packages/copper (M05-T15). A line for line port of the
// canonical generator, reference/copper/vernier/legacy/gen_vernier.py
// (lineage vernier.generator/rev-a), returning declarations: every net as
// the shapes the generator adds to it, the two clip fields, the faceplate
// and its accents, the six layers and the 60 gates as a program. The kernel
// evaluates the draft (packages/copper/src/vinyl/draft.ts) and
// packages/checks/src/copper runs the program; nothing here measures
// geometry.
//
// This module imports @hackbuild/spec and types only, so it runs where only
// data may cross (BUILD_IMPORTS, D-178). Literals the generator wrote
// inline (the 1.0 mm riser overlap, the 1.2 mm escape inset, the 0.8 mm
// smoothing of the faceplate, gate floors, guide type sizes and offsets)
// are carried as written, each with its generator line.

import type { FieldDecl, GateStep, LayerDecl, LayerItem, Pt, Shape, VinylDraft } from "@hackbuild/copper";
import type { VernierParams } from "./chase.surface";

const box = (x0: number, y0: number, x1: number, y1: number): Shape => ({ op: "box", x0, y0, x1, y1 });
const rr = (x0: number, y0: number, x1: number, y1: number, r: number): Shape => ({ op: "rr", x0, y0, x1, y1, r });
const union = (of: readonly Shape[]): Shape => ({ op: "union", of });
const buffer = (of: Shape, d: number): Shape => ({ op: "buffer", d, of });
const inter = (a: Shape, b: Shape): Shape => ({ op: "intersection", of: [a, b] });

/** Colours of the generator's layers (gen_vernier.py line 288): ink, pink, cream, gold. */
const K = "#1a1a1a";
const PK = "#FE0386";
const CR = "#f5f0e6";
const GLD = "#d9b45a";

const NETS = ["B1", "B2", "B3", "B4", "B5", "B6", "S1A", "S1B", "S2A", "S2B", "S3A", "S3B"] as const;
/** gen_vernier.py lines 62 to 63. */
const LABEL: Readonly<Record<string, string>> = {
  B1: "BTN 1", B2: "BTN 2", B3: "BTN 3", B4: "BTN 4", B5: "BTN 5", B6: "BTN 6",
  S1A: "SL1 A", S1B: "SL1 B", S2A: "SL2 A", S2B: "SL2 B", S3A: "SL3 A", S3B: "SL3 B",
};

export interface VernierPad { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number; readonly col: number; readonly row: "hi" | "lo" }
export interface VernierTerm { readonly net: string; readonly cx: number; readonly y: number; readonly row: 1 | 2; readonly idx: number; readonly label: string; readonly field: "top" | "bottom" }

export interface VernierBuild {
  readonly draft: VinylDraft;
  /** The generator's P dict as its geometry JSON writes it, for the params round trip. */
  readonly params: Readonly<Record<string, unknown>>;
  readonly pads: Readonly<Record<string, VernierPad>>;
  readonly terminals: readonly VernierTerm[];
  /** Slider travel, mm (gen_vernier.py line 256). */
  readonly travel: number;
}

export function build(p: VernierParams): VernierBuild {
  const nets: Record<string, Shape[]> = Object.fromEntries(NETS.map((n) => [n, [] as Shape[]]));
  const add = (net: string, g: Shape): void => {
    nets[net]!.push(g);
  };
  const wire = (pts: readonly Pt[]): Shape => ({ op: "wire", pts, w: p.tw });
  const colX = [[p.col0X0, p.col0X1], [p.col1X0, p.col1X1], [p.col2X0, p.col2X1]] as const;
  const rowLo = [p.rowLoY0, p.rowLoY1] as const, rowHi = [p.rowHiY0, p.rowHiY1] as const;
  const bands = [[p.band1Y0, p.band1Y1], [p.band2Y0, p.band2Y1], [p.band3Y0, p.band3Y1]] as const;
  const wedgeA = [p.wedgeA0, p.wedgeA1] as const, wedgeB = [p.wedgeB0, p.wedgeB1] as const;
  const corL = [p.corL1, p.corL2], corR = [p.corR1, p.corR2];
  const topRows = [p.topRow0, p.topRow1], botRows = [p.botRow0, p.botRow1];
  const botX = [p.botX0, p.botX1, p.botX2, p.botX3, p.botX4, p.botX5];
  const botLanes = [p.botLane0, p.botLane1, p.botLane2];

  // ---- buttons and their escapes (lines 87 to 106): the upper row rises
  // straight out of the pad centre, the lower row jogs into a lane.
  const BTN = [["B1", 0, "hi"], ["B2", 0, "lo"], ["B3", 1, "hi"], ["B4", 1, "lo"], ["B5", 2, "hi"], ["B6", 2, "lo"]] as const;
  const LANE: Readonly<Record<string, number>> = { B2: p.laneG1, B4: p.laneG2, B6: p.laneRm };
  const pads: Record<string, VernierPad> = {};
  const TOPX: Record<string, number> = {};
  for (const [net, col, row] of BTN) {
    const [x0, x1] = colX[col];
    const [y0, y1] = row === "hi" ? rowHi : rowLo;
    add(net, rr(x0, y0, x1, y1, p.padR));
    pads[net] = { x0, y0, x1, y1, col, row };
    let lx: number;
    if (row === "hi") {
      lx = (x0 + x1) / 2;
      add(net, wire([[lx, y1 - 1.0], [lx, p.topBand]]));
    } else {
      lx = LANE[net]!;
      const jy = (rowLo[1] + rowHi[0]) / 2;
      const ex = Math.min(x1 - 1.5, lx);
      add(net, wire([[ex, y1 - 1.0], [ex, jy], [lx, jy], [lx, p.topBand]]));
    }
    TOPX[net] = lx;
  }

  // ---- sliders (lines 108 to 135): A hugs the band floor and thins to the
  // right, B hugs the ceiling and thins to the left; the upper two bands
  // escape through corridors at the band ends.
  const SLESC: Record<string, Pt[]> = {};
  bands.forEach(([y0, y1], i) => {
    const n = i + 1;
    const hs = (y1 - y0) - p.slGap;
    const hmax = hs - p.slHmin, hmin = p.slHmin;
    add(`S${n}A`, { op: "poly", pts: [[wedgeA[0], y0], [wedgeA[1], y0], [wedgeA[1], y0 + hmin], [wedgeA[0], y0 + hmax]] });
    add(`S${n}B`, { op: "poly", pts: [[wedgeB[1], y1], [wedgeB[0], y1], [wedgeB[0], y1 - hmin], [wedgeB[1], y1 - hmax]] });
    const xa = wedgeA[0] + 0.8, xb = wedgeB[1] - 0.8;
    if (n === 3) {
      SLESC["S3A"] = [[xa, y0 + 1.2]];
      SLESC["S3B"] = [[xb, y1 - 1.2]];
      TOPX["S3A"] = xa;
      TOPX["S3B"] = xb;
    } else {
      const cl = corL[n - 1]!, cr = corR[n - 1]!;
      SLESC[`S${n}A`] = [[xa, y0 + 1.2], [cl, y0 + 1.2]];
      SLESC[`S${n}B`] = [[xb, y1 - 1.2], [cr, y1 - 1.2]];
      TOPX[`S${n}A`] = cl;
      TOPX[`S${n}B`] = cr;
    }
  });

  // ---- top field (lines 138 to 146): six button terminals, each parked at
  // exactly the x its trace arrives on.
  const terminals: VernierTerm[] = [];
  const byTopX = (a: string, b: string): number => TOPX[a]! - TOPX[b]!;
  const topOrder = BTN.map((b) => b[0] as string).sort(byTopX);
  topOrder.forEach((net, i) => {
    const cx = TOPX[net]!;
    const y = topRows[i % 2]!;
    add(net, rr(cx - p.termSz / 2, y, cx + p.termSz / 2, y + p.termSz, p.termR));
    add(net, wire([[cx, p.topBand], [cx, y + p.termSz / 2]]));
    terminals.push({ net, cx, y, row: i % 2 === 0 ? 2 : 1, idx: i, label: LABEL[net]!, field: "top" });
  });

  // ---- bottom field (lines 148 to 162): the trace that travels farthest
  // takes the lane farthest from the block, per side.
  const botSrc = ["S1A", "S2A", "S3A", "S3B", "S2B", "S1B"].sort(byTopX);
  const travelOf: Record<string, number> = Object.fromEntries(botSrc.map((k, i) => [k, Math.abs(botX[i]! - TOPX[k]!)]));
  botSrc.forEach((net, i) => {
    const cx = botX[i]!;
    const side = botSrc.filter((k) => (TOPX[k]! < p.W / 2) === (TOPX[net]! < p.W / 2));
    const lane = botLanes[[...side].sort((a, b) => travelOf[a]! - travelOf[b]!).indexOf(net)]!;
    const y = botRows[i % 2]!;
    add(net, wire([...SLESC[net]!, [TOPX[net]!, lane], [cx, lane], [cx, y + p.termSz / 2]]));
    add(net, rr(cx - p.termSz / 2, y, cx + p.termSz / 2, y + p.termSz, p.termR));
    terminals.push({ net, cx, y, row: i % 2 === 0 ? 1 : 2, idx: i + 6, label: LABEL[net]!, field: "bottom" });
  });

  // ---- brand art (lines 164 to 178)
  const mark = (part: number): Shape => ({ op: "mark", part, size: p.markSize, x: p.markX, y: p.markY });
  const wm1: Shape = { op: "text", s: "hack", weight: "700", cap: p.wmCap, x: p.wmX, y: p.markY + 8.6 };
  const wm2: Shape = { op: "text", s: ".build", weight: "700", cap: p.wmCap, x: p.wmX, y: p.markY + 0.6 };
  const brandK = union([mark(0), wm1]);
  const brandPK = union([mark(1), wm2]);
  const art: Shape[] = p.brand ? [mark(0), mark(1), wm1, wm2] : [];

  // ---- material layers (lines 183 to 206)
  const ELEC: Record<string, Shape> = Object.fromEntries(Object.entries(pads).map(([k, pd]) => [k, rr(pd.x0, pd.y0, pd.x1, pd.y1, p.padR)]));
  const termBlk: Shape[] = [];
  for (const [f, ys] of [["top", topRows], ["bottom", botRows]] as const) {
    const ts = terminals.filter((t) => t.field === f);
    const x0 = Math.min(...ts.map((t) => t.cx)) - p.termSz / 2, x1 = Math.max(...ts.map((t) => t.cx)) + p.termSz / 2;
    termBlk.push(box(x0 - p.faceWin, Math.min(...ys) - p.faceWin, x1 + p.faceWin, Math.max(...ys) + p.termSz + p.faceWin));
  }
  const TERMBLK = union(termBlk);
  // The faceplate: the full face less the clip fields, smoothed at 0.8 and kept whole (lines 197 to 199).
  const opened: Shape = { op: "difference", of: [buffer({ op: "outline" }, -2.0), buffer(TERMBLK, p.vinylTermClr - p.faceWin)] };
  const VINYL: Shape = { op: "outerOnly", of: buffer(buffer(opened, 0.8), -0.8) };
  const ai = p.accentInset;
  const ACCENT: Shape[] = [
    ...Object.values(pads).map((pd) => rr(pd.x0 + ai, pd.y0 + ai, pd.x1 - ai, pd.y1 - ai, 2.0)),
    ...bands.map(([b0, b1]) => box(wedgeA[0] + ai, b0 + 2.0, wedgeB[1] - ai, b1 - 2.0)),
  ];
  const pads10 = union(terminals.map((t) => box(t.cx - 5, t.y, t.cx + 5, t.y + p.termSz)));

  // ---- the gates (lines 208 to 282), in print order
  const travel = (wedgeA[1] - 1.0) - (wedgeB[0] + 1.0);
  const program: GateStep[] = [
    { kind: "islands", pad: 4 }, { kind: "clearance" }, { kind: "keepout" }, { kind: "erode", style: "count", pad: 4 },
    // a rounded plate against pad_rr.buffer(-0.6) (line 233)
    ...Object.entries(pads).map(([k, pd]): GateStep => ({ kind: "solid", net: k, region: buffer(rr(pd.x0, pd.y0, pd.x1, pd.y1, p.padR), -0.6), msg: `button ${k} plate is solid copper` })),
  ];
  bands.forEach(([b0, b1], i) => {
    const n = i + 1;
    program.push(
      {
        kind: "ratio", a: `S${n}A`, b: `S${n}B`, dir: "down",
        window: { kind: "column", from: wedgeB[0] + 1.0, to: wedgeA[1] - 1.0, half: 0.35, y0: b0, y1: b1 },
        monoMsg: `slider ${n} ratio monotone across the travel`, spanMsg: `slider ${n} span {max:.3f} to {min:.3f}, off both rails`,
      },
      // plate area over 100 mm2 on each wedge (lines 252 to 254)
      { kind: "plateArea", regions: [inter({ op: "net", name: `S${n}A` }, box(wedgeA[0], b0, wedgeA[1], b1)), inter({ op: "net", name: `S${n}B` }, box(wedgeB[0], b0, wedgeB[1], b1))], gt: 100, msg: `slider ${n} both wedges carry real plate area` },
    );
  });
  const fields: FieldDecl[] = (["top", "bottom"] as const).map((f) => ({
    id: f, axis: "x", size: p.termSz,
    fingers: terminals.filter((t) => t.field === f).map((t) => ({ net: t.net, at: t.cx, arrive: TOPX[t.net]! })),
  }));
  program.push(
    { kind: "travel", values: [travel], abs: true, gt: 60, msg: "slider travel {v:.1f} mm" },
    { kind: "parked", field: "top", msg: "top field: all 6 terminals sit on their arrival x (no fan)" },
    // pitch at least 11.5 and same-row jaws at least 12.0 apart (lines 264 and 266)
    ...(["top", "bottom"] as const).flatMap((f): GateStep[] => [
      { kind: "fieldPitch", field: f, min: 11.5, msg: `${f} field pitch >= {least:.1f} mm, rows staggered` },
      { kind: "fieldJaws", field: f, min: 12.0, msg: `${f} field: {jaws:.1f} mm between same-row clip jaws` },
    ]),
    { kind: "channels", want: 12, nets: true, msg: "exactly 12 channels, one MPR121 or 12 S3 touch pins" },
    { kind: "bare", msg: "vinyl covers all live copper outside the clip fields ({bare:.2f} mm2 bare)" },
    { kind: "padsClear", msg: "vinyl clears every clip pad" },
    ...Object.entries(ELEC).map(([k, g]): GateStep => ({ kind: "overhang", electrode: g, out: p.vinylOut, msg: `vinyl overhangs button ${k} by {out:.1f} mm` })),
    { kind: "maskPiece", msg: "vinyl faceplate is one connected piece" },
    { kind: "accents", inset: false, msg: "accent tiles land inside the faceplate" },
    { kind: "maskKeepout", msg: "vinyl inside the shared outline keepout" },
    { kind: "accents", inset: true, msg: "accent tiles clear the faceplate edge by 1 mm" },
  );

  // ---- the guide's and faceplate's type (lines 326 to 345)
  const txf: Shape[] = [], txg: Shape[] = [];
  const T = (s: string, cap: number, x: number, y: number, weight: "400" | "600" | "700" = "600", anchor: "l" | "c" = "c", guide = false): void => {
    (guide ? txg : txf).push({ op: "text", s, weight, cap, x, y, anchor });
  };
  for (const t of terminals) {
    const up = t.field === "bottom" || t.row === 1;
    T(t.label, 2.2, t.cx, up ? t.y + p.termSz + 1.4 : t.y - 3.4, "600", "c", true);
  }
  for (const [k, pd] of Object.entries(pads)) T(k.slice(1, 2), 8.0, (pd.x0 + pd.x1) / 2, (pd.y0 + pd.y1) / 2 - 4.0, "700");
  bands.forEach(([b0, b1], i) => {
    T(`SL ${i + 1}`, 2.6, 2.6, (b0 + b1) / 2 - 1.0, "700", "l");
    for (let z = 0; z < 9; z++) {
      const x = wedgeB[0] + 1.0 + (z * ((wedgeA[1] - 1.0) - (wedgeB[0] + 1.0))) / 8.0;
      txf.push(box(x - 0.35, b0 + 0.7, x + 0.35, b0 + 2.5));
    }
  });
  T("VERNIER REV A", 2.2, 80.0, 116.0);
  T("12 CH . 6 PADS . 3 SLIDERS", 2.2, 78.0, 111.4);
  T("COPPER + VINYL + PAPER", 2.2, 80.0, 106.8);
  T("make things. break things. repeat.", 2.0, 55.0, 32.4, "400");

  // ---- the six layers, bottom to top as the README assembles them (lines 318 to 362)
  const RIM: Shape = { op: "rim" };
  const ink = (s: Shape): LayerItem => ({ shape: union([s, RIM]), fill: K, opacity: 1, stroke: null, strokeWidth: 0 });
  const fill = (shape: Shape, colour: string, opacity = 1): LayerItem => ({ shape, fill: colour, opacity, stroke: null, strokeWidth: 0 });
  const line = (shape: Shape, colour: string, w: number): LayerItem => ({ shape, fill: null, opacity: 1, stroke: colour, strokeWidth: w });
  const FACE = VINYL;
  const layers: LayerDecl[] = [
    { id: "backer", file: "05_backer.svg", title: "VERNIER rev A  backer, 2 mm chipboard", role: "backer", material: "chipboard-2",
      region: { op: "outline" }, items: [fill(RIM, K)] },
    { id: "guide", file: "00_guide_under.svg", title: "VERNIER rev A  placement guide (print then cut, goes under the copper)", role: "guide",
      region: { op: "outline" }, ground: CR, items: [
        fill({ op: "nets" }, PK, 0.32), line(union([VINYL]), PK, -0.3), fill(brandK, K), fill(brandPK, PK), fill(union([...txf, ...txg]), K),
      ] },
    { id: "copper", file: "01_copper.svg", title: "VERNIER rev A  copper: 6 button plates, 3 wedge sliders, 12 terminals", role: "copper", material: "copper-tape",
      region: { op: "copper" }, items: [ink({ op: "copper" })] },
    { id: "vinyl", file: "02_vinyl_face.svg", title: "VERNIER rev A  vinyl faceplate, the dielectric you touch", role: "dielectric",
      region: VINYL, windows: TERMBLK, items: [ink(VINYL)] },
    { id: "faceplate", file: "03_faceplate_print.svg", title: "VERNIER rev A  printed faceplate (print then cut, top layer)", role: "faceplate",
      region: FACE, items: [
        fill(FACE, CR), fill(union(ACCENT), GLD, 0.22), line(union(bands.map(([b0, b1]) => box(wedgeA[0], b0, wedgeB[1], b1))), K, 0.35),
        fill(inter(brandK, FACE), K), fill(inter(brandPK, FACE), PK), fill(inter(union(txf), FACE), K),
      ] },
    { id: "accents", file: "04_vinyl_accents.svg", title: "VERNIER rev A  accent tiles, second colour vinyl (optional)", role: "accent",
      region: union(ACCENT), items: [ink(union(ACCENT))] },
  ];

  const draft: VinylDraft = {
    name: "VERNIER", rev: "A", W: p.W, H: p.H, R: p.R, edgeKeep: p.edgeKeep, clr: p.clr, smooth: p.smooth,
    nets: NETS.map((name) => ({ name, shapes: nets[name]! })),
    art, ticks: 0, brand: p.brand,
    audit: [], sliders: [], zones: [], films: [], spacers: [],
    fields,
    mask: { mode: "faceplate", region: VINYL, zone: TERMBLK, pads: pads10, accents: union(ACCENT) },
    layers, repeatClose: false, docStyle: "compact",
    program,
  };

  const params: Record<string, unknown> = {
    name: "VERNIER", rev: "A", W: p.W, H: p.H, R: p.R, edge_keep: p.edgeKeep, clr: p.clr, tw: p.tw,
    col_x: colX.map((c) => [...c]), row_lo: [...rowLo], row_hi: [...rowHi], pad_r: p.padR,
    lane_g1: p.laneG1, lane_g2: p.laneG2, lane_rm: p.laneRm,
    bands: bands.map((b) => [...b]), wedge_a: [...wedgeA], wedge_b: [...wedgeB], sl_gap: p.slGap, sl_hmin: p.slHmin,
    cor_l: corL, cor_r: corR, brand_strip: [p.brandY0, p.brandY1],
    term_sz: p.termSz, term_r: p.termR, top_rows: topRows, bot_rows: botRows, bot_x: botX, bot_lanes: botLanes, top_band: p.topBand,
    vinyl_out: p.vinylOut, vinyl_term_clr: p.vinylTermClr, face_win: p.faceWin, accent_inset: p.accentInset,
    mark_size: p.markSize, mark_x: p.markX, mark_y: p.markY, wm_cap: p.wmCap, wm_x: p.wmX,
  };

  return { draft, params, pads, terminals, travel };
}
