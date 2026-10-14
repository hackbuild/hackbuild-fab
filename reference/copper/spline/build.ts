// reference/copper/spline/build.ts
// SPLINE rev A on packages/copper (M05-T15). A line for line port of the
// canonical generator, reference/copper/spline/legacy/gen_spline.py
// (lineage spline.generator/rev-a), returning declarations: twelve blades
// with radial stub escapes into the hub void, the arc slider with its
// concentric detour, two straight sliders, the fan for the lane ranker
// (version 1, lines 157 to 180), the rail, the faceplate, the six layers
// and the 85 gates as a program. A wire reads its lane as { lane: net };
// the kernel places the fan and resolves it.
//
// This module imports @hackbuild/spec and types only (BUILD_IMPORTS,
// D-178). Literals the generator wrote inline are carried as written,
// each with its generator line.

import type { FanDecl, FieldDecl, GateStep, LayerDecl, LayerItem, Pt, RadiusSpec, Shape, VinylDraft } from "@hackbuild/copper";
import type { Vec2 } from "@hackbuild/spec";
import type { SplineParams } from "./chase.surface";

const box = (x0: number, y0: number, x1: number, y1: number): Shape => ({ op: "box", x0, y0, x1, y1 });
const rr = (x0: number, y0: number, x1: number, y1: number, r: number): Shape => ({ op: "rr", x0, y0, x1, y1, r });
const union = (of: readonly Shape[]): Shape => ({ op: "union", of });
const buffer = (of: Shape, d: number): Shape => ({ op: "buffer", d, of });
const inter = (a: Shape, b: Shape): Shape => ({ op: "intersection", of: [a, b] });

/** gen_spline.py line 311. */
const K = "#1a1a1a";
const PK = "#FE0386";
const CR = "#f5f0e6";
const GLD = "#d9b45a";

const KEYS = Array.from({ length: 12 }, (_, i) => `K${i + 1}`);
const NETS = [...KEYS, "AR_A", "AR_B", "L1_A", "L1_B", "L2_A", "L2_B"];
/** gen_spline.py lines 59 to 60. */
const LABEL: Readonly<Record<string, string>> = {
  ...Object.fromEntries(KEYS.map((k) => [k, `KEY ${k.slice(1)}`])),
  AR_A: "ARC A", AR_B: "ARC B", L1_A: "SL1 A", L1_B: "SL1 B", L2_A: "SL2 A", L2_B: "SL2 B",
};

export interface SplinePad { readonly a0: number; readonly a1: number; readonly r0: number; readonly r1: number; readonly mid: number }
export interface SplineTerm { readonly net: string; readonly cx: number; readonly y: number; readonly h: number; readonly deep: boolean; readonly idx: number; readonly label: string }

export interface SplineBuild {
  readonly draft: VinylDraft;
  readonly params: Readonly<Record<string, unknown>>;
  readonly pads: Readonly<Record<string, SplinePad>>;
  readonly terminals: readonly SplineTerm[];
  /** Arc sweep and straight travel, mm (gen_spline.py lines 260 and 277). */
  readonly arcSweep: number;
  readonly linTravel: number;
}

export function build(p: SplineParams): SplineBuild {
  const nets: Record<string, Shape[]> = Object.fromEntries(NETS.map((n) => [n, [] as Shape[]]));
  const add = (net: string, g: Shape): void => {
    nets[net]!.push(g);
  };
  const wire = (pts: readonly Pt[], w = p.tw): Shape => ({ op: "wire", pts, w });
  const hub: Vec2 = [p.hubX, p.hubY];
  const pol = (r: number, a: number): [number, number] => {
    const t = (a * Math.PI) / 180;
    return [hub[0] + r * Math.cos(t), hub[1] + r * Math.sin(t)];
  };
  /** annulus() with the board's segment rule n = max(10, |a1 - a0| / 1.5) (lines 81 to 87). */
  const annulus = (rIn: RadiusSpec, rOut: RadiusSpec, a0: number, a1: number): Shape => ({
    op: "annulus", c: hub, rIn, rOut, a0, a1, n: Math.max(10, Math.trunc(Math.abs(a1 - a0) / 1.5)),
  });
  const linX = [[p.lin0X0, p.lin0X1], [p.lin1X0, p.lin1X1]] as const;
  const linCor = [p.linCor0, p.linCor1];
  const lanesY = [p.lane0, p.lane1, p.lane2, p.lane3, p.lane4, p.lane5, p.lane6, p.lane7];
  const ESC: Record<string, Pt[]> = {};
  const ARRIVE: Record<string, number> = {};

  // ---- 12 radial blade keys (lines 97 to 113): angle grows leftward, so
  // labels read left to right; each blade stubs out along its own angle
  // into the hub void before it drops.
  const pads: Record<string, SplinePad> = {};
  const kstep = (p.keyA1 - p.keyA0) / p.keyN;
  const kw = kstep - p.keyGapA;
  for (let i = 0; i < p.keyN; i++) {
    const lo = p.keyA0 + i * kstep + p.keyGapA / 2;
    const hi = lo + kw;
    const net = `K${p.keyN - i}`;
    add(net, buffer(buffer(annulus(p.keyR0, p.keyR1, lo, hi), -p.keyRound), p.keyRound));
    const mid = (lo + hi) / 2;
    const stub = [pol(p.keyTap0, mid), pol(p.keyTap1, mid)];
    pads[net] = { a0: lo, a1: hi, r0: p.keyR0, r1: p.keyR1, mid };
    ESC[net] = stub;
    ARRIVE[net] = stub[1]![0];
  }

  // ---- arc slider with detour escapes (lines 115 to 134)
  const rIn = p.arcR0, rOut = p.arcR1;
  const aa0 = p.arcA0, aa1 = p.arcA1 + p.arcOff;
  const ab0 = p.arcA0 - p.arcOff, ab1 = p.arcA1;
  const hmaxA = (rOut - rIn) - p.arcGap - p.arcHmin;
  const ARC_A = annulus(rIn, { base: rIn, sign: 1, h0: p.arcHmin, h1: hmaxA, a0: aa0, a1: aa1 }, aa0, aa1);
  const ARC_B = annulus({ base: rOut, sign: -1, h0: hmaxA, h1: p.arcHmin, a0: ab0, a1: ab1 }, rOut, ab0, ab1);
  add("AR_A", ARC_A);
  add("AR_B", ARC_B);
  for (const [net, aEnd, aExit, rMid] of [["AR_A", aa1 - 1.0, p.arcExit1, rIn + hmaxA / 2], ["AR_B", ab0 + 1.0, p.arcExit0, rOut - hmaxA / 2]] as const) {
    const pts: [number, number][] = [pol(rMid, aEnd), pol(p.arcDetour, aEnd)];
    const n = Math.max(6, Math.trunc(Math.abs(aExit - aEnd) / 2));
    for (let j = 1; j <= n; j++) pts.push(pol(p.arcDetour, aEnd + ((aExit - aEnd) * j) / n));
    add(net, wire(pts));
    ESC[net] = [pts[pts.length - 1]!];
    ARRIVE[net] = pts[pts.length - 1]![0];
  }

  // ---- two straight sliders (lines 136 to 155): A thick at the bottom,
  // B thick at the top; B leaves through a corridor at the board edge.
  const ly0 = p.linY0, ly1 = p.linY1;
  linX.forEach(([lx0, lx1], i) => {
    const tag = `L${i + 1}`;
    const wsum = (lx1 - lx0) - p.linGap;
    const hmaxL = wsum - p.linHmin;
    const yA0 = ly0, yA1 = ly1 - p.linOff;
    const yB0 = ly0 + p.linOff, yB1 = ly1;
    add(`${tag}_A`, { op: "poly", pts: [[lx0, yA0], [lx0 + hmaxL, yA0], [lx0 + p.linHmin, yA1], [lx0, yA1]] });
    add(`${tag}_B`, { op: "poly", pts: [[lx1, yB1], [lx1 - hmaxL, yB1], [lx1 - p.linHmin, yB0], [lx1, yB0]] });
    const xa = lx0 + hmaxL / 2;
    ESC[`${tag}_A`] = [[xa, ly0 + 1.0]];
    ARRIVE[`${tag}_A`] = xa;
    const xb = lx1 - hmaxL / 2;
    const cor = linCor[i]!;
    ESC[`${tag}_B`] = [[xb, ly1 - 1.2], [cor, ly1 - 1.2]];
    ARRIVE[`${tag}_B`] = cor;
  });

  // ---- single-row rail and monotone fan (lines 157 to 189)
  const order = [...NETS].sort((a, b) => ARRIVE[a]! - ARRIVE[b]!);
  const x0 = hub[0] - ((p.railN - 1) * p.railPitch) / 2.0;
  const TX: Record<string, number> = Object.fromEntries(order.map((k, i) => [k, x0 + i * p.railPitch]));
  const fan: FanDecl = {
    version: "v1", rail: "x", margin: p.tw + p.clr, lanes: lanesY,
    nets: order.map((k) => ({ net: k, arrive: ARRIVE[k]!, terminal: TX[k]! })),
  };
  const terminals: SplineTerm[] = [];
  order.forEach((net, i) => {
    const cx = TX[net]!;
    const deep = i % 2 === 0;
    const h = deep ? p.railDeep : p.railShallow;
    const lane = { lane: net };
    add(net, wire([...ESC[net]!, [ARRIVE[net]!, lane], [cx, lane], [cx, p.railY0 + h - 1.0]]));
    add(net, rr(cx - p.railW / 2, p.railY0, cx + p.railW / 2, p.railY0 + h, p.railR));
    terminals.push({ net, cx, y: p.railY0, h, deep, idx: i, label: LABEL[net]! });
  });

  // ---- brand art (lines 191 to 203)
  const mark = (part: number): Shape => ({ op: "mark", part, size: p.markSize, x: p.markX, y: p.markY });
  const wm1: Shape = { op: "text", s: "hack", weight: "700", cap: p.wmCap, x: p.wmX, y: p.markY + 7.8 };
  const wm2: Shape = { op: "text", s: ".build", weight: "700", cap: p.wmCap, x: p.wmX, y: p.markY + 0.6 };
  const brandK = union([mark(0), wm1]);
  const brandPK = union([mark(1), wm2]);
  const art: Shape[] = p.brand ? [mark(0), mark(1), wm1, wm2] : [];

  // ---- overlays (lines 208 to 221)
  const ELEC: Record<string, Shape> = Object.fromEntries(Object.entries(pads).map(([k, pd]) => [k, annulus(pd.r0, pd.r1, pd.a0, pd.a1)]));
  const RAIL = union(terminals.map((t) => box(t.cx - p.railW / 2 - 1.0, t.y - 1.0, t.cx + p.railW / 2 + 1.0, t.y + t.h + 1.0)));
  const RAILZONE = box(
    Math.min(...terminals.map((t) => t.cx - p.railW / 2 - 1.0)), 0,
    Math.max(...terminals.map((t) => t.cx + p.railW / 2 + 1.0)), Math.max(...terminals.map((t) => t.y + t.h + 1.0)) + p.vinylRailClr,
  );
  const opened: Shape = { op: "difference", of: [buffer({ op: "outline" }, -2.0), RAILZONE] };
  const VINYL: Shape = { op: "outerOnly", of: buffer(buffer(opened, 0.8), -0.8) };
  const ARCFACE = annulus(rIn + 0.6, rOut - 0.6, ab0 + 1.0, aa1 - 1.0);
  const LINFACE = linX.map(([lx0, lx1]) => box(lx0 + 0.6, ly0 + 0.6, lx1 - 0.6, ly1 - 0.6));
  const ai = p.accentInset;
  const ACCENT: Shape[] = [
    ...Object.values(pads).map((pd) => buffer(buffer(annulus(pd.r0 + ai, pd.r1 - ai, pd.a0 + 0.5, pd.a1 - 0.5), -0.8), 0.8)),
    ARCFACE, ...LINFACE,
  ];

  // ---- the gates (lines 223 to 305), in print order
  const oa0 = aa0 + 2.0, oa1 = ab1 - 2.0;
  const arcSweep = ((oa1 - oa0) * Math.PI / 180) * ((rIn + rOut) / 2);
  const linTravel = ly1 - ly0;
  const fields: FieldDecl[] = [{
    id: "rail", axis: "x", size: p.railW, pitch: p.railPitch, origin: x0, deep: p.railDeep, shallow: p.railShallow,
    fingers: terminals.map((t) => ({ net: t.net, at: t.cx, arrive: ARRIVE[t.net]!, deep: t.deep })),
  }];
  const program: GateStep[] = [
    { kind: "islands", pad: 5 }, { kind: "clearance" }, { kind: "keepout" }, { kind: "erode", style: "plain", pad: 5 },
    ...Object.entries(pads).map(([k, pd]): GateStep => ({ kind: "solid", net: k, region: annulus(pd.r0 + 2.0, pd.r1 - 2.0, pd.a0 + 1.2, pd.a1 - 1.2), msg: `blade ${k} is solid copper` })),
    // the smallest blade over 120 mm2, "a fingertip is about 100" (line 246)
    { kind: "plateArea", regions: Object.values(ELEC), gt: 120, msg: "smallest blade plate {min:.0f} mm2 (a fingertip is about 100)" },
    {
      kind: "ratio", a: "AR_A", b: "AR_B", dir: "up",
      // slices a +- 0.5 deg from r_in - 1 to r_out + 1, n max(10, 1 / 1.5) = 10 (line 254)
      window: { kind: "sector", from: oa0, to: oa1, half: 0.5, c: hub, rIn: rIn - 1, rOut: rOut + 1, n: 10 },
      monoMsg: "arc ratio monotone along the sweep", spanMsg: "arc span {min:.3f} to {max:.3f}, off both rails",
    },
    { kind: "travel", values: [arcSweep], gt: 40, lt: 100, msg: "arc sweep {v:.0f} mm, small by design" },
    ...linX.map(([lx0, lx1], i): GateStep => ({
      kind: "ratio", a: `L${i + 1}_A`, b: `L${i + 1}_B`, dir: "down",
      window: { kind: "row", from: ly0 + 3.0, to: ly1 - 3.0, half: 0.35, x0: lx0 - 1, x1: lx1 + 1 },
      monoMsg: `slider L${i + 1} ratio monotone bottom to top`, spanMsg: `slider L${i + 1} span {max:.3f} to {min:.3f}, off both rails`,
    })),
    { kind: "travel", values: [linTravel], gt: 30, lt: 60, msg: "straight slider travel {v:.0f} mm, small by design" },
    { kind: "channels", want: 18, nets: true, msg: "exactly 18 channels: two MPR121 on one bus, 18 of 24 used" },
    // one row: pitch at least 12.5 (line 281), finger gap at least 3.5 (283), depth step at least 4.0 (284)
    { kind: "fieldPitch", field: "rail", min: 12.5, msg: "rail is ONE row on {pitch:.1f} mm pitch" },
    { kind: "fingerGap", field: "rail", min: 3.5, msg: "rail finger gap {gap:.1f} mm" },
    { kind: "depthStep", field: "rail", min: 4.0, msg: "alternating finger depth {step:.1f} mm so adjacent clip bodies nest" },
    { kind: "depthAlternates", field: "rail", msg: "depth alternates every finger" },
    { kind: "railOrder", field: "rail", msg: "rail order follows arrival order (monotone fan)" },
    { kind: "lanes", style: "fits", msg: "fan fits {used} lanes for {nets} nets" },
    { kind: "bare", msg: "vinyl covers all live copper outside the rail zone ({bare:.2f} mm2 bare)" },
    { kind: "padsClear", msg: "vinyl clears every rail finger" },
    ...Object.entries(ELEC).map(([k, g]): GateStep => ({ kind: "overhang", electrode: g, out: p.vinylOut, msg: `vinyl overhangs blade ${k}` })),
    { kind: "overhang", electrode: union([ARC_A, ARC_B]), out: p.vinylOut, msg: "vinyl overhangs the arc slider" },
    { kind: "overhang", electrode: union(linX.map(([lx0, lx1]) => box(lx0, ly0, lx1, ly1))), out: p.vinylOut, msg: "vinyl overhangs both straight sliders" },
    { kind: "maskPiece", msg: "vinyl faceplate is one connected piece" },
    { kind: "accents", inset: true, msg: "accent tiles clear the faceplate edge by 1 mm" },
    { kind: "maskKeepout", msg: "vinyl inside the shared outline keepout" },
  ];

  // ---- type and ticks (lines 349 to 370)
  const txf: Shape[] = [], txg: Shape[] = [];
  const T = (s: string, cap: number, x: number, y: number, weight: "400" | "600" | "700" = "600", guide = false): void => {
    (guide ? txg : txf).push({ op: "text", s, weight, cap, x, y, anchor: "c" });
  };
  for (const t of terminals) T(t.label, 2.0, t.cx, t.y + t.h + 1.6, "600", true);
  for (const [k, pd] of Object.entries(pads)) {
    const [x, y] = pol(pd.r1 - 6.0, pd.mid);
    T(k.slice(1), 4.2, x, y, "700");
  }
  const [ax, ay] = pol((rIn + rOut) / 2, aa1 + 4.0);
  T("ARC", 2.4, ax, ay, "700");
  for (let z = 0; z < 9; z++) {
    const a = oa0 + (z * (oa1 - oa0)) / 8.0;
    txf.push(wire([pol(rIn + 0.4, a), pol(rIn + 2.4, a)], 0.7));
  }
  linX.forEach(([lx0, lx1], i) => {
    T(`SL${i + 1}`, 2.4, (lx0 + lx1) / 2, ly1 + 2.4, "700");
    for (let z = 0; z < 9; z++) {
      const y = ly0 + 2.0 + (z * ((ly1 - 2.0) - (ly0 + 2.0))) / 8.0;
      txf.push(box(lx0 - 2.6, y - 0.35, lx0 - 0.8, y + 0.35));
    }
  });
  T("SPLINE REV A . 18 CHANNELS", 2.2, 200.0, 136.0);
  T("12 BLADE KEYS . 1 ARC + 2 SLIDERS", 2.2, 200.0, 131.4);
  T("18 CONTACTS IN ONE ROW . NO VELOSTAT . NO COMPONENTS", 2.2, 121.0, 51.0);
  T("make things. break things. repeat.", 2.0, 121.0, 46.0, "400");

  // ---- the six layers, bottom to top (lines 341 to 384)
  const RIM: Shape = { op: "rim" };
  const ink = (s: Shape): LayerItem => ({ shape: union([s, RIM]), fill: K, opacity: 1, stroke: null, strokeWidth: 0 });
  const fill = (shape: Shape, colour: string, opacity = 1): LayerItem => ({ shape, fill: colour, opacity, stroke: null, strokeWidth: 0 });
  const line = (shape: Shape, colour: string, w: number): LayerItem => ({ shape, fill: null, opacity: 1, stroke: colour, strokeWidth: w });
  const FACE = VINYL;
  const layers: LayerDecl[] = [
    { id: "backer", file: "05_backer.svg", title: "SPLINE rev A  backer, 2 mm chipboard", role: "backer", material: "chipboard-2",
      region: { op: "outline" }, items: [fill(RIM, K)] },
    { id: "guide", file: "00_guide_under.svg", title: "SPLINE rev A  placement guide (print then cut, goes under the copper)", role: "guide",
      region: { op: "outline" }, ground: CR, items: [
        fill({ op: "nets" }, PK, 0.32), line(VINYL, PK, -0.3), fill(brandK, K), fill(brandPK, PK), fill(union([...txf, ...txg]), K),
      ] },
    { id: "copper", file: "01_copper.svg", title: "SPLINE rev A  copper: 12 blade keys, 1 arc + 2 straight sliders, 18 finger rail", role: "copper", material: "copper-tape",
      region: { op: "copper" }, items: [ink({ op: "copper" })] },
    { id: "vinyl", file: "02_vinyl_face.svg", title: "SPLINE rev A  vinyl faceplate, the dielectric you touch", role: "dielectric",
      region: VINYL, windows: RAILZONE, items: [ink(VINYL)] },
    { id: "faceplate", file: "03_faceplate_print.svg", title: "SPLINE rev A  printed faceplate (print then cut, top layer)", role: "faceplate",
      region: FACE, items: [
        fill(FACE, CR), fill(union(ACCENT), GLD, 0.22), line(union([ARCFACE, ...LINFACE]), K, 0.35),
        fill(inter(brandK, FACE), K), fill(inter(brandPK, FACE), PK), fill(inter(union(txf), FACE), K),
      ] },
    { id: "accents", file: "04_vinyl_accents.svg", title: "SPLINE rev A  accent tiles, second colour vinyl (optional)", role: "accent",
      region: union(ACCENT), items: [ink(union(ACCENT))] },
  ];

  const draft: VinylDraft = {
    name: "SPLINE", rev: "A", W: p.W, H: p.H, R: p.R, edgeKeep: p.edgeKeep, clr: p.clr, smooth: p.smooth,
    nets: NETS.map((name) => ({ name, shapes: nets[name]! })),
    art, ticks: 0, brand: p.brand,
    audit: [], sliders: [], zones: [], films: [], spacers: [],
    fan, fields,
    mask: { mode: "faceplate", region: VINYL, zone: RAILZONE, pads: RAIL, accents: union(ACCENT) },
    layers, repeatClose: false, docStyle: "compact",
    program,
  };

  const params: Record<string, unknown> = {
    name: "SPLINE", rev: "A", W: p.W, H: p.H, R: p.R, edge_keep: p.edgeKeep, clr: p.clr, tw: p.tw,
    hub: [p.hubX, p.hubY],
    key_n: p.keyN, key_r: [p.keyR0, p.keyR1], key_a: [p.keyA0, p.keyA1], key_gap_a: p.keyGapA, key_round: p.keyRound, key_tap: [p.keyTap0, p.keyTap1],
    arc_r: [p.arcR0, p.arcR1], arc_a: [p.arcA0, p.arcA1], arc_detour: p.arcDetour, arc_exit: [p.arcExit0, p.arcExit1],
    arc_hmin: p.arcHmin, arc_gap: p.arcGap, arc_off: p.arcOff,
    lin_x: linX.map((x) => [...x]), lin_y: [ly0, ly1], lin_hmin: p.linHmin, lin_gap: p.linGap, lin_off: p.linOff, lin_cor: linCor,
    rail_n: p.railN, rail_w: p.railW, rail_pitch: p.railPitch, rail_y0: p.railY0, rail_deep: p.railDeep, rail_shallow: p.railShallow, rail_r: p.railR,
    lanes: lanesY, vinyl_out: p.vinylOut, vinyl_rail_clr: p.vinylRailClr, accent_inset: p.accentInset,
    mark_size: p.markSize, mark_x: p.markX, mark_y: p.markY, wm_cap: p.wmCap, wm_x: p.wmX,
  };

  return { draft, params, pads, terminals, arcSweep, linTravel };
}
