// reference/copper/stave/build.ts
// STAVE rev A on packages/copper (M05-T15). A line for line port of the
// canonical generator, reference/copper/stave/legacy/gen_stave.py (lineage
// stave.generator/rev-a), returning declarations: eight keys cut from one
// slab by identical chevron seams, two sliders whose B ends leave through
// the outer margin, the fan for the lane ranker (version 2 with x and y
// swapped: a y rail down the left edge with vertical lanes, lines 125 to
// 154), the faceplate, the six layers and the 57 gates as a program, the
// tape gate first.
//
// This module imports @hackbuild/spec and types only (BUILD_IMPORTS,
// D-178). Literals the generator wrote inline are carried as written,
// each with its generator line.

import type { FanDecl, FieldDecl, GateStep, LayerDecl, LayerItem, Pt, Shape, VinylDraft } from "@hackbuild/copper";
import type { StaveParams } from "./chase.surface";

const box = (x0: number, y0: number, x1: number, y1: number): Shape => ({ op: "box", x0, y0, x1, y1 });
const rr = (x0: number, y0: number, x1: number, y1: number, r: number): Shape => ({ op: "rr", x0, y0, x1, y1, r });
const union = (of: readonly Shape[]): Shape => ({ op: "union", of });
const buffer = (of: Shape, d: number): Shape => ({ op: "buffer", d, of });
const inter = (a: Shape, b: Shape): Shape => ({ op: "intersection", of: [a, b] });

/** gen_stave.py line 274. */
const K = "#1a1a1a";
const PK = "#FE0386";
const CR = "#f5f0e6";
const GLD = "#d9b45a";

export interface StavePad { readonly deg: number; readonly cy: number }
export interface StaveTerm { readonly net: string; readonly cy: number; readonly x: number; readonly d: number; readonly deep: boolean; readonly idx: number; readonly label: string }

export interface StaveBuild {
  readonly draft: VinylDraft;
  readonly params: Readonly<Record<string, unknown>>;
  readonly pads: Readonly<Record<string, StavePad>>;
  readonly terminals: readonly StaveTerm[];
  /** Slider travel, mm (gen_stave.py line 116). */
  readonly travel: readonly [number, number];
  /** Key pitch, mm (line 83). */
  readonly pitch: number;
  /** The key electrodes, the slab slices inset by half the seam (line 186). */
  readonly electrodes: readonly Shape[];
}

export function build(p: StaveParams): StaveBuild {
  const KEYS = Array.from({ length: p.keys }, (_, i) => `D${i + 1}`);
  const NETS = [...KEYS, "L1_A", "L1_B", "L2_A", "L2_B"];
  /** gen_stave.py lines 56 to 57. */
  const LABEL: Readonly<Record<string, string>> = {
    ...Object.fromEntries(KEYS.map((k) => [k, `DEG ${k.slice(1)}`])), L1_A: "SL1 A", L1_B: "SL1 B", L2_A: "SL2 A", L2_B: "SL2 B",
  };
  const nets: Record<string, Shape[]> = Object.fromEntries(NETS.map((n) => [n, [] as Shape[]]));
  const add = (net: string, g: Shape): void => {
    nets[net]!.push(g);
  };
  const wire = (pts: readonly Pt[]): Shape => ({ op: "wire", pts, w: p.tw });
  const lanesX = Array.from({ length: p.laneCount }, (_, i) => p.laneFar - p.laneStep * i);
  const lin = [[p.lin0X0, p.lin0Y0, p.lin0X1, p.lin0Y1], [p.lin1X0, p.lin1Y0, p.lin1X1, p.lin1Y1]] as const;
  const linOuter = [p.linOuter0, p.linOuter1];
  const KX0 = p.keyX0, KY0 = p.keyY0, KX1 = p.keyX1, KY1 = p.keyY1;
  const ESC: Record<string, Pt[]> = {};
  const ARRIVE: Record<string, number> = {};

  // ---- the slab, sliced into keys (lines 82 to 104): every seam is the
  // same chevron, so the keys nest and read as one slab.
  const pitch = (KY1 - KY0) / p.keys;
  const xm = (KX0 + KX1) / 2;
  const seam = (k: number, n = 25): [number, number][] => {
    const pts: [number, number][] = [];
    for (let i = 0; i <= n; i++) {
      const x = KX0 + ((KX1 - KX0) * i) / n;
      const off = -p.chev + (2 * p.chev * Math.abs(x - xm)) / ((KX1 - KX0) / 2);
      pts.push([x, KY0 + k * pitch + off]);
    }
    return pts;
  };
  const slice = (k: number): Shape => ({ op: "poly", pts: [...seam(k), ...seam(k + 1).reverse()] });
  const pads: Record<string, StavePad> = {};
  for (let k = 0; k < p.keys; k++) {
    const net = `D${k + 1}`;
    add(net, buffer(buffer(buffer(slice(k), -p.seam / 2), -p.keyRound), p.keyRound));
    const cy = KY0 + (k + 0.5) * pitch;
    pads[net] = { deg: k + 1, cy };
    ESC[net] = [[KX0 + 2.0, cy]];
    ARRIVE[net] = cy;
  }

  // ---- two long sliders at the ends (lines 106 to 123): A thick at the
  // left end, B at the right; B's escape passes outside A's end
  // (xb = lx1 - 3.0, right of lx1 - lin_off) and leaves through the margin.
  const travel = lin.map(([lx0, , lx1]) => Number((lx1 - lx0).toFixed(1))) as [number, number];
  lin.forEach(([lx0, ly0, lx1, ly1], i) => {
    const tag = `L${i + 1}`;
    const hsum = (ly1 - ly0) - p.linGap;
    const hmax = hsum - p.linHmin;
    add(`${tag}_A`, { op: "poly", pts: [[lx0, ly0], [lx1 - p.linOff, ly0], [lx1 - p.linOff, ly0 + p.linHmin], [lx0, ly0 + hmax]] });
    add(`${tag}_B`, { op: "poly", pts: [[lx1, ly1], [lx0 + p.linOff, ly1], [lx0 + p.linOff, ly1 - p.linHmin], [lx1, ly1 - hmax]] });
    ESC[`${tag}_A`] = [[lx0 + 1.6, ly0 + hmax / 2]];
    ARRIVE[`${tag}_A`] = ly0 + hmax / 2;
    const xb = lx1 - 3.0;
    const yo = linOuter[i]!;
    ESC[`${tag}_B`] = [[lx1 - 1.6, ly1 - hmax / 2], [xb, ly1 - hmax / 2], [xb, yo]];
    ARRIVE[`${tag}_B`] = yo;
  });

  // ---- rail down the left edge (lines 125 to 163)
  const order = [...NETS].sort((a, b) => ARRIVE[a]! - ARRIVE[b]!);
  const y0 = p.H / 2 - ((p.railN - 1) * p.railPitch) / 2.0;
  const TY: Record<string, number> = Object.fromEntries(order.map((k, i) => [k, y0 + i * p.railPitch]));
  const fan: FanDecl = {
    version: "v2", rail: "y", margin: p.tw + p.clr, lanes: lanesX,
    nets: order.map((k) => ({ net: k, arrive: ARRIVE[k]!, terminal: TY[k]! })),
  };
  const terminals: StaveTerm[] = [];
  order.forEach((net, i) => {
    const cy = TY[net]!;
    const deep = i % 2 === 0;
    const d = deep ? p.railDeep : p.railShallow;
    const lane = { lane: net };
    add(net, wire([...ESC[net]!, [lane, ARRIVE[net]!], [lane, cy], [p.railX0 + d - 1.0, cy]]));
    add(net, rr(p.railX0, cy - p.railH / 2, p.railX0 + d, cy + p.railH / 2, p.railR));
    terminals.push({ net, cy, x: p.railX0, d, deep, idx: i, label: LABEL[net]! });
  });

  // ---- brand (lines 165 to 177)
  const mark = (part: number): Shape => ({ op: "mark", part, size: p.markSize, x: p.markX, y: p.markY });
  const wm1: Shape = { op: "text", s: "hack", weight: "700", cap: p.wmCap, x: p.wmX, y: p.markY + 6.2 };
  const wm2: Shape = { op: "text", s: ".build", weight: "700", cap: p.wmCap, x: p.wmX, y: p.markY + 0.4 };
  const brandK = union([mark(0), wm1]);
  const brandPK = union([mark(1), wm2]);
  const art: Shape[] = p.brand ? [mark(0), mark(1), wm1, wm2] : [];

  // ---- overlays (lines 182 to 195)
  const ELEC: Record<string, Shape> = Object.fromEntries(KEYS.map((k, i) => [k, buffer(slice(i), -p.seam / 2)]));
  const railBoxes = terminals.map((t) => [t.x - 1.0, t.cy - p.railH / 2 - 1.0, t.x + t.d + 1.0, t.cy + p.railH / 2 + 1.0] as const);
  const RAIL = union(railBoxes.map(([a, b, c, d]) => box(a, b, c, d)));
  const railRight = Math.max(...railBoxes.map((b) => b[2]));
  const RAILZONE = box(0, Math.min(...railBoxes.map((b) => b[1])), railRight + p.vinylRailClr, Math.max(...railBoxes.map((b) => b[3])));
  const opened: Shape = { op: "difference", of: [buffer({ op: "outline" }, -2.0), RAILZONE] };
  const VINYL: Shape = { op: "outerOnly", of: buffer(buffer(opened, 0.8), -0.8) };
  const LINFACE = lin.map(([lx0, ly0, lx1, ly1]) => box(lx0 + 0.6, ly0 + 0.6, lx1 - 0.6, ly1 - 0.6));
  const ACCENT: Shape[] = [...Object.values(ELEC).map((g) => buffer(g, -p.accentInset)), ...LINFACE];

  // ---- the gates (lines 197 to 268), in print order
  const keyList = Object.values(ELEC);
  const fields: FieldDecl[] = [{
    id: "rail", axis: "y", size: p.railH, pitch: p.railPitch, origin: y0, deep: p.railDeep, shallow: p.railShallow,
    fingers: terminals.map((t) => ({ net: t.net, at: t.cy, arrive: ARRIVE[t.net]!, deep: t.deep })),
  }];
  const program: GateStep[] = [
    // the tape gate is first: a wider board fails loudly (line 201, 4.0 mm of margin)
    { kind: "stock", stock: p.tapeW, margin: 4.0, msg: "board {W:.0f} mm wide fits {stock:.1f} mm tape with {side:.1f} mm each side" },
    { kind: "islands", pad: 5 }, { kind: "clearance" }, { kind: "keepout" }, { kind: "erode", style: "plain", pad: 5 },
    // plate over 600 mm2 (line 220), one size within 5 mm2 (221), eight keys (222)
    { kind: "plateArea", regions: keyList, gt: 600, msg: "key plate {min:.0f} mm2, {w:.0f} x {h:.0f} mm", vars: { w: KX1 - KX0, h: pitch - p.seam } },
    { kind: "plateArea", regions: keyList, lt: 5, msg: "all 8 keys the same size within {spread:.1f} mm2" },
    { kind: "plateCount", regions: keyList, want: [8], msg: "8 keys, one octave of any scale" },
    // consecutive keys, bottom up as their centroids sort (lines 223 to 226)
    { kind: "gap", pairs: keyList.slice(1).map((g, i) => [keyList[i]!, g] as const), min: p.clr, msg: "chevron seams hold {d:.2f} mm between keys" },
    ...lin.map(([lx0, ly0, lx1, ly1], i): GateStep => ({
      kind: "ratio", a: `L${i + 1}_A`, b: `L${i + 1}_B`, dir: "down",
      window: { kind: "column", from: lx0 + p.linOff + 1.0, to: lx1 - p.linOff - 1.0, half: 0.35, y0: ly0 - 1, y1: ly1 + 1 },
      monoMsg: `slider L${i + 1} ratio monotone left to right`, spanMsg: `slider L${i + 1} span {max:.3f} to {min:.3f}, off both rails`,
    })),
    { kind: "travel", values: travel, ge: 45, msg: "sliders {v0:.0f} mm of travel each" },
    { kind: "channels", want: 12, nets: false, msg: "exactly 12 channels, one MPR121 or 12 ESP32-S3 touch pins" },
    // one row: pitch at least 11.5 (line 247), finger gap at least 2.5 (249)
    { kind: "fieldPitch", field: "rail", min: 11.5, msg: "rail is ONE row on {pitch:.1f} mm pitch down the left edge" },
    { kind: "fingerGap", field: "rail", min: 2.5, msg: "rail finger gap {gap:.1f} mm" },
    { kind: "depthAlternates", field: "rail", msg: "finger depth alternates {deep:.0f} / {shallow:.0f} mm" },
    { kind: "railOrder", field: "rail", msg: "rail order follows arrival order (monotone fan)" },
    { kind: "lanes", style: "needs", msg: "fan needs {need} lanes, {have} available" },
    // the wiring zone, grown by the rail clearance, stops 1.0 mm before the keys (line 255)
    { kind: "zoneGap", end: railRight, clear: p.vinylRailClr, start: KX0, margin: 1.0, msg: "the wiring zone ends {gap:.1f} mm before the keys start" },
    { kind: "bare", msg: "vinyl covers all live copper outside the rail zone ({bare:.2f} mm2 bare)" },
    { kind: "padsClear", msg: "vinyl clears every rail finger" },
    ...Object.entries(ELEC).map(([k, g]): GateStep => ({ kind: "overhang", electrode: g, out: p.vinylOut, msg: `vinyl overhangs key ${k}` })),
    { kind: "overhang", electrode: union(lin.map(([a, b, c, d]) => box(a, b, c, d))), out: p.vinylOut, msg: "vinyl overhangs both sliders" },
    { kind: "maskPiece", msg: "vinyl faceplate is one connected piece" },
    { kind: "accents", inset: true, msg: "accent inlays clear the faceplate edge" },
    { kind: "maskKeepout", msg: "vinyl inside the shared outline keepout" },
  ];

  // ---- type and ticks (lines 312 to 327)
  const txf: Shape[] = [], txg: Shape[] = [];
  const T = (s: string, cap: number, x: number, y: number, weight: "400" | "600" | "700" = "600", guide = false): void => {
    (guide ? txg : txf).push({ op: "text", s, weight, cap, x, y, anchor: "c" });
  };
  for (const t of terminals) T(t.label, 2.0, t.x + t.d + 7.0, t.cy - 0.9, "600", true);
  for (const pd of Object.values(pads)) T(String(pd.deg), 8.0, xm, pd.cy - 3.4, "700");
  lin.forEach(([lx0, ly0, lx1, ly1], i) => {
    T(`SL${i + 1}`, 2.4, (lx0 + lx1) / 2, i !== 0 ? ly1 + 4.0 : ly0 - 6.2, "700");
    for (let z = 0; z < 9; z++) {
      const x = lx0 + p.linOff + (z * ((lx1 - p.linOff) - (lx0 + p.linOff))) / 8.0;
      txf.push(i === 0 ? box(x - 0.35, ly0 - 2.6, x + 0.35, ly0 - 0.8) : box(x - 0.35, ly1 + 0.8, x + 0.35, ly1 + 2.6));
    }
  });
  T("STAVE REV A . 8 DEGREES", 2.0, 66.0, 45.6);
  T("make things. break things. repeat.", 1.9, 66.0, 41.2, "400");

  // ---- the six layers, bottom to top (lines 304 to 341)
  const RIM: Shape = { op: "rim" };
  const ink = (s: Shape): LayerItem => ({ shape: union([s, RIM]), fill: K, opacity: 1, stroke: null, strokeWidth: 0 });
  const fill = (shape: Shape, colour: string, opacity = 1): LayerItem => ({ shape, fill: colour, opacity, stroke: null, strokeWidth: 0 });
  const line = (shape: Shape, colour: string, w: number): LayerItem => ({ shape, fill: null, opacity: 1, stroke: colour, strokeWidth: w });
  const FACE = VINYL;
  const layers: LayerDecl[] = [
    { id: "backer", file: "05_backer.svg", title: "STAVE rev A  backer, 2 mm chipboard", role: "backer", material: "chipboard-2",
      region: { op: "outline" }, items: [fill(RIM, K)] },
    { id: "guide", file: "00_guide_under.svg", title: "STAVE rev A  placement guide (print then cut, goes under the copper)", role: "guide",
      region: { op: "outline" }, ground: CR, items: [
        fill({ op: "nets" }, PK, 0.32), line(VINYL, PK, -0.3), fill(brandK, K), fill(brandPK, PK), fill(union([...txf, ...txg]), K),
      ] },
    { id: "copper", file: "01_copper.svg", title: "STAVE rev A  copper: 8 chevron keys, 2 sliders, 12 finger rail (fits 4 in tape)", role: "copper", material: "copper-tape",
      region: { op: "copper" }, items: [ink({ op: "copper" })] },
    { id: "vinyl", file: "02_vinyl_face.svg", title: "STAVE rev A  vinyl faceplate, the dielectric you touch", role: "dielectric",
      region: VINYL, windows: RAILZONE, items: [ink(VINYL)] },
    { id: "faceplate", file: "03_faceplate_print.svg", title: "STAVE rev A  printed faceplate (print then cut, top layer)", role: "faceplate",
      region: FACE, items: [
        fill(FACE, CR), fill(union(ACCENT), GLD, 0.22), line(union([...keyList, ...LINFACE]), K, 0.35),
        fill(inter(brandK, FACE), K), fill(inter(brandPK, FACE), PK), fill(inter(union(txf), FACE), K),
      ] },
    { id: "accents", file: "04_vinyl_accents.svg", title: "STAVE rev A  accent inlays, second colour vinyl (optional)", role: "accent",
      region: union(ACCENT), items: [ink(union(ACCENT))] },
  ];

  const draft: VinylDraft = {
    name: "STAVE", rev: "A", W: p.W, H: p.H, R: p.R, edgeKeep: p.edgeKeep, clr: p.clr, smooth: p.smooth,
    nets: NETS.map((name) => ({ name, shapes: nets[name]! })),
    art, ticks: 0, brand: p.brand,
    audit: [], sliders: [], zones: [], films: [], spacers: [],
    fan, fields,
    mask: { mode: "faceplate", region: VINYL, zone: RAILZONE, pads: RAIL, accents: union(ACCENT) },
    layers, repeatClose: false, docStyle: "compact",
    program,
  };

  const params: Record<string, unknown> = {
    name: "STAVE", rev: "A", W: p.W, H: p.H, R: p.R, edge_keep: p.edgeKeep, clr: p.clr, tw: p.tw,
    tape_w: p.tapeW,
    rail_n: p.railN, rail_h: p.railH, rail_pitch: p.railPitch, rail_x0: p.railX0, rail_deep: p.railDeep, rail_shallow: p.railShallow, rail_r: p.railR,
    lanes: lanesX,
    keys: p.keys, key_box: [KX0, KY0, KX1, KY1], seam: p.seam, chev: p.chev, key_round: p.keyRound,
    lin: lin.map((x) => [...x]), lin_hmin: p.linHmin, lin_gap: p.linGap, lin_off: p.linOff, lin_outer: linOuter,
    vinyl_out: p.vinylOut, vinyl_rail_clr: p.vinylRailClr, accent_inset: p.accentInset,
    mark_size: p.markSize, mark_x: p.markX, mark_y: p.markY, wm_cap: p.wmCap, wm_x: p.wmX,
  };

  return { draft, params, pads, terminals, travel, pitch, electrodes: keyList };
}
