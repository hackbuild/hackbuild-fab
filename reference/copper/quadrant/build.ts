// reference/copper/quadrant/build.ts
// QUADRANT rev A on packages/copper (M05-T15). A line for line port of the
// canonical generator, reference/copper/quadrant/legacy/gen_quadrant.py
// (lineage quadrant.generator/rev-a), returning declarations: every net as
// the shapes the generator adds to it, the fan for the lane ranker
// (version 1, greedy with two conditions, lines 137 to 163), the rail, the
// faceplate and its accents, the six layers and the 59 gates as a program.
// A wire reads its lane as { lane: net }; the kernel places the fan and
// resolves it, since only packages/copper/src/vinyl/lanes.ts ranks lanes.
//
// This module imports @hackbuild/spec and types only (BUILD_IMPORTS,
// D-178). Literals the generator wrote inline are carried as written,
// each with its generator line.

import type { FanDecl, FieldDecl, GateStep, LayerDecl, LayerItem, Pt, RadiusSpec, Shape, VinylDraft } from "@hackbuild/copper";
import type { Vec2 } from "@hackbuild/spec";
import type { QuadrantParams } from "./chase.surface";

const box = (x0: number, y0: number, x1: number, y1: number): Shape => ({ op: "box", x0, y0, x1, y1 });
const rr = (x0: number, y0: number, x1: number, y1: number, r: number): Shape => ({ op: "rr", x0, y0, x1, y1, r });
const union = (of: readonly Shape[]): Shape => ({ op: "union", of });
const buffer = (of: Shape, d: number): Shape => ({ op: "buffer", d, of });
const inter = (a: Shape, b: Shape): Shape => ({ op: "intersection", of: [a, b] });

/** gen_quadrant.py line 281. */
const K = "#1a1a1a";
const PK = "#FE0386";
const CR = "#f5f0e6";
const GLD = "#d9b45a";

const NETS = ["B1", "B2", "B3", "B4", "B5", "B6", "S1A", "S1B", "S2A", "S2B", "S3A", "S3B"] as const;
/** gen_quadrant.py lines 56 to 57. */
const label = (net: string): string => (net.startsWith("B") ? `BTN ${net.slice(1)}` : `SL${net[1]} ${net[2]}`);

export interface QuadrantPad { readonly a0: number; readonly a1: number; readonly r0: number; readonly r1: number; readonly mid: number }
export interface QuadrantTerm { readonly net: string; readonly cx: number; readonly y: number; readonly h: number; readonly deep: boolean; readonly idx: number; readonly label: string }

export interface QuadrantBuild {
  readonly draft: VinylDraft;
  readonly params: Readonly<Record<string, unknown>>;
  readonly pads: Readonly<Record<string, QuadrantPad>>;
  readonly terminals: readonly QuadrantTerm[];
  /** Inner arc sweep, mm (gen_quadrant.py line 250). */
  readonly sweep: number;
}

export function build(p: QuadrantParams): QuadrantBuild {
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
  /** annulus() with the board's segment rule n = max(12, |a1 - a0| / 1.5) (lines 78 to 85). */
  const annulus = (rIn: RadiusSpec, rOut: RadiusSpec, a0: number, a1: number): Shape => ({
    op: "annulus", c: hub, rIn, rOut, a0, a1, n: Math.max(12, Math.trunc(Math.abs(a1 - a0) / 1.5)),
  });
  const arcs = [p.arc0, p.arc1, p.arc2];
  const lanesY = [p.lane0, p.lane1, p.lane2, p.lane3, p.lane4, p.lane5];

  // ---- button fan, numbered left to right (lines 96 to 112)
  const pads: Record<string, QuadrantPad> = {};
  const ESC: Record<string, Pt[]> = {};
  const ARRIVE: Record<string, number> = {};
  const step = (p.btnA1 - p.btnA0 + p.btnGapA) / 6.0;
  const sec = step - p.btnGapA;
  for (let i = 0; i < 6; i++) {
    const lo = p.btnA0 + i * step;
    const hi = lo + sec;
    const net = `B${6 - i}`;
    add(net, buffer(buffer(annulus(p.btnR0, p.btnR1, lo, hi), -p.btnRound), p.btnRound));
    const mid = (lo + hi) / 2;
    const [px, py] = pol(p.btnR0 + 0.9, mid);
    pads[net] = { a0: lo, a1: hi, r0: p.btnR0, r1: p.btnR1, mid };
    ESC[net] = [[px, py]];
    ARRIVE[net] = px;
  }

  // ---- arc sliders (lines 114 to 129): A hugs the inner radius and
  // thickens with angle, B hugs the outer radius and thins.
  const hmax = p.arcW - p.slGap - p.slHmin;
  arcs.forEach((rIn, i) => {
    const n = i + 1;
    const rOut = rIn + p.arcW;
    add(`S${n}A`, annulus(rIn, { base: rIn, sign: 1, h0: p.slHmin, h1: hmax, a0: p.arcA0, a1: p.arcA1 }, p.arcA0, p.arcA1));
    add(`S${n}B`, annulus({ base: rOut, sign: -1, h0: hmax, h1: p.slHmin, a0: p.arcB0, a1: p.arcB1 }, rOut, p.arcB0, p.arcB1));
    const pa = pol(rIn + hmax / 2, p.escA);
    const pb = pol(rOut - hmax / 2, p.escB);
    ESC[`S${n}A`] = [pa];
    ESC[`S${n}B`] = [pb];
    ARRIVE[`S${n}A`] = pa[0];
    ARRIVE[`S${n}B`] = pb[0];
  });

  // ---- single-row rail and fan (lines 131 to 172)
  const order = [...NETS].sort((a, b) => ARRIVE[a]! - ARRIVE[b]!);
  const x0 = hub[0] - ((p.railN - 1) * p.railPitch) / 2.0;
  const TX: Record<string, number> = Object.fromEntries(order.map((k, i) => [k, x0 + i * p.railPitch]));
  const fan: FanDecl = {
    version: "v1", rail: "x", margin: p.tw + p.clr, lanes: lanesY,
    nets: order.map((k) => ({ net: k, arrive: ARRIVE[k]!, terminal: TX[k]! })),
  };
  const terminals: QuadrantTerm[] = [];
  order.forEach((net, i) => {
    const cx = TX[net]!;
    const deep = i % 2 === 0;
    const h = deep ? p.railDeep : p.railShallow;
    const lane = { lane: net };
    add(net, wire([...ESC[net]!, [ARRIVE[net]!, lane], [cx, lane], [cx, p.railY0 + h - 1.0]]));
    add(net, rr(cx - p.railW / 2, p.railY0, cx + p.railW / 2, p.railY0 + h, p.railR));
    terminals.push({ net, cx, y: p.railY0, h, deep, idx: i, label: label(net) });
  });

  // ---- brand art (lines 174 to 186)
  const mark = (part: number): Shape => ({ op: "mark", part, size: p.markSize, x: p.markX, y: p.markY });
  const wm1: Shape = { op: "text", s: "hack", weight: "700", cap: p.wmCap, x: p.wmX, y: p.markY + 7.8 };
  const wm2: Shape = { op: "text", s: ".build", weight: "700", cap: p.wmCap, x: p.wmX, y: p.markY + 0.6 };
  const brandK = union([mark(0), wm1]);
  const brandPK = union([mark(1), wm2]);
  const art: Shape[] = p.brand ? [mark(0), mark(1), wm1, wm2] : [];

  // ---- overlays (lines 191 to 206)
  const ELEC: Record<string, Shape> = Object.fromEntries(Object.entries(pads).map(([k, pd]) => [k, annulus(pd.r0, pd.r1, pd.a0, pd.a1)]));
  const railBoxes = terminals.map((t) => box(t.cx - p.railW / 2 - 1.0, t.y - 1.0, t.cx + p.railW / 2 + 1.0, t.y + t.h + 1.0));
  const RAIL = union(railBoxes);
  // RAIL.bounds from the boxes' own corners
  const rb = [Math.min(...terminals.map((t) => t.cx - p.railW / 2 - 1.0)), Math.max(...terminals.map((t) => t.cx + p.railW / 2 + 1.0)), Math.max(...terminals.map((t) => t.y + t.h + 1.0))] as const;
  const RAILZONE = box(rb[0], 0, rb[1], rb[2] + p.vinylRailClr);
  const opened: Shape = { op: "difference", of: [buffer({ op: "outline" }, -2.0), RAILZONE] };
  const VINYL: Shape = { op: "outerOnly", of: buffer(buffer(opened, 0.8), -0.8) };
  const ai = p.accentInset;
  const ARCFACE = arcs.map((r) => annulus(r + 0.6, r + p.arcW - 0.6, p.arcB0 + 1.0, p.arcA1 - 1.0));
  const ACCENT: Shape[] = [
    ...Object.values(pads).map((pd) => buffer(buffer(annulus(pd.r0 + ai, pd.r1 - ai, pd.a0 + 1.6, pd.a1 - 1.6), -1.2), 1.2)),
    ...ARCFACE,
  ];

  // ---- the gates (lines 208 to 275), in print order
  const sweep = (((p.arcB1 - 2) - (p.arcA0 + 2)) * Math.PI / 180) * (arcs[0]! + p.arcW / 2);
  const program: GateStep[] = [
    { kind: "islands", pad: 4 }, { kind: "clearance" }, { kind: "keepout" }, { kind: "erode", style: "count", pad: 4 },
    ...Object.entries(pads).map(([k, pd]): GateStep => ({ kind: "solid", net: k, region: annulus(pd.r0 + 2.5, pd.r1 - 2.5, pd.a0 + 3.0, pd.a1 - 3.0), msg: `sector ${k} is solid copper` })),
  ];
  arcs.forEach((rIn, i) => {
    const n = i + 1;
    const rOut = rIn + p.arcW;
    program.push(
      {
        kind: "ratio", a: `S${n}A`, b: `S${n}B`, dir: "up",
        // annular slices a +- 0.5 deg from r_in - 1 to r_out + 1, n max(12, 1 / 1.5) = 12 (line 241)
        window: { kind: "sector", from: p.arcA0 + 2.0, to: p.arcB1 - 2.0, half: 0.5, c: hub, rIn: rIn - 1, rOut: rOut + 1, n: 12 },
        monoMsg: `arc ${n} ratio monotone along the sweep`, spanMsg: `arc ${n} span {min:.3f} to {max:.3f}, off both rails`,
      },
      // each wedge over 200 mm2 (line 248)
      { kind: "plateArea", regions: [{ op: "net", name: `S${n}A` }, { op: "net", name: `S${n}B` }], gt: 200, msg: `arc ${n} both wedges carry real plate area` },
    );
  });
  const fields: FieldDecl[] = [{
    id: "rail", axis: "x", size: p.railW, pitch: p.railPitch, origin: x0, deep: p.railDeep, shallow: p.railShallow,
    fingers: terminals.map((t) => ({ net: t.net, at: t.cx, arrive: ARRIVE[t.net]!, deep: t.deep })),
  }];
  program.push(
    { kind: "travel", values: [sweep], gt: 100, msg: "inner arc sweep {v:.0f} mm of travel" },
    { kind: "channels", want: 12, nets: true, msg: "exactly 12 channels, one MPR121 or 12 S3 touch pins" },
    // one row: pitch at least 13.5 (line 255), finger gap at least 4.0 (257), depth step at least 4.0 (259)
    { kind: "fieldPitch", field: "rail", min: 13.5, msg: "rail is ONE row on {pitch:.1f} mm pitch" },
    { kind: "fingerGap", field: "rail", min: 4.0, msg: "rail finger gap {gap:.1f} mm" },
    { kind: "depthStep", field: "rail", min: 4.0, msg: "alternating finger depth {step:.1f} mm so adjacent clip bodies nest" },
    { kind: "depthAlternates", field: "rail", msg: "depth alternates every finger" },
    { kind: "railOrder", field: "rail", msg: "rail order follows arrival order (monotone fan, no crossings)" },
    { kind: "bare", msg: "vinyl covers all live copper outside the rail zone ({bare:.2f} mm2 bare)" },
    { kind: "padsClear", msg: "vinyl clears every rail finger" },
    ...Object.entries(ELEC).map(([k, g]): GateStep => ({ kind: "overhang", electrode: g, out: p.vinylOut, msg: `vinyl overhangs sector ${k} by {out:.1f} mm` })),
    { kind: "maskPiece", msg: "vinyl faceplate is one connected piece" },
    { kind: "accents", inset: true, msg: "accent tiles clear the faceplate edge by 1 mm" },
    { kind: "maskKeepout", msg: "vinyl inside the shared outline keepout" },
  );

  // ---- type and ticks (lines 319 to 338)
  const txf: Shape[] = [], txg: Shape[] = [];
  const T = (s: string, cap: number, x: number, y: number, weight: "400" | "600" | "700" = "600", guide = false): void => {
    (guide ? txg : txf).push({ op: "text", s, weight, cap, x, y, anchor: "c" });
  };
  for (const t of terminals) T(t.label, 2.2, t.cx, t.y + t.h + 1.6, "600", true);
  for (const [k, pd] of Object.entries(pads)) {
    const [x, y] = pol((pd.r0 + pd.r1) / 2 - 4.0, pd.mid);
    T(k.slice(1, 2), 7.0, x, y, "700");
  }
  arcs.forEach((r, i) => {
    const [x, y] = pol(r + p.arcW / 2 - 1.4, p.arcA1 + 5.0);
    T(`SL${i + 1}`, 2.6, x, y, "700");
    for (let z = 0; z < 9; z++) {
      const a = p.arcA0 + 2.0 + (z * ((p.arcB1 - 2.0) - (p.arcA0 + 2.0))) / 8.0;
      txf.push(wire([pol(r + 0.4, a), pol(r + 2.4, a)], 0.7));
    }
  });
  T("QUADRANT REV A", 2.2, 158.0, 126.0);
  T("12 CHANNELS", 2.2, 158.0, 121.4);
  T("6 SECTORS + 3 ARC SLIDERS . 12 CONTACTS IN ONE ROW", 2.2, 95.0, 33.4);
  T("make things. break things. repeat.", 2.0, 95.0, 27.0, "400");

  // ---- the six layers, bottom to top (lines 311 to 352)
  const RIM: Shape = { op: "rim" };
  const ink = (s: Shape): LayerItem => ({ shape: union([s, RIM]), fill: K, opacity: 1, stroke: null, strokeWidth: 0 });
  const fill = (shape: Shape, colour: string, opacity = 1): LayerItem => ({ shape, fill: colour, opacity, stroke: null, strokeWidth: 0 });
  const line = (shape: Shape, colour: string, w: number): LayerItem => ({ shape, fill: null, opacity: 1, stroke: colour, strokeWidth: w });
  const FACE = VINYL;
  const layers: LayerDecl[] = [
    { id: "backer", file: "05_backer.svg", title: "QUADRANT rev A  backer, 2 mm chipboard", role: "backer", material: "chipboard-2",
      region: { op: "outline" }, items: [fill(RIM, K)] },
    { id: "guide", file: "00_guide_under.svg", title: "QUADRANT rev A  placement guide (print then cut, goes under the copper)", role: "guide",
      region: { op: "outline" }, ground: CR, items: [
        fill({ op: "nets" }, PK, 0.32), line(VINYL, PK, -0.3), fill(brandK, K), fill(brandPK, PK), fill(union([...txf, ...txg]), K),
      ] },
    { id: "copper", file: "01_copper.svg", title: "QUADRANT rev A  copper: 6 sector pads, 3 arc sliders, 12 finger rail", role: "copper", material: "copper-tape",
      region: { op: "copper" }, items: [ink({ op: "copper" })] },
    { id: "vinyl", file: "02_vinyl_face.svg", title: "QUADRANT rev A  vinyl faceplate, the dielectric you touch", role: "dielectric",
      region: VINYL, windows: RAILZONE, items: [ink(VINYL)] },
    { id: "faceplate", file: "03_faceplate_print.svg", title: "QUADRANT rev A  printed faceplate (print then cut, top layer)", role: "faceplate",
      region: FACE, items: [
        fill(FACE, CR), fill(union(ACCENT), GLD, 0.22), line(union(ARCFACE), K, 0.35),
        fill(inter(brandK, FACE), K), fill(inter(brandPK, FACE), PK), fill(inter(union(txf), FACE), K),
      ] },
    { id: "accents", file: "04_vinyl_accents.svg", title: "QUADRANT rev A  accent tiles, second colour vinyl (optional)", role: "accent",
      region: union(ACCENT), items: [ink(union(ACCENT))] },
  ];

  const draft: VinylDraft = {
    name: "QUADRANT", rev: "A", W: p.W, H: p.H, R: p.R, edgeKeep: p.edgeKeep, clr: p.clr, smooth: p.smooth,
    nets: NETS.map((name) => ({ name, shapes: nets[name]! })),
    art, ticks: 0, brand: p.brand,
    audit: [], sliders: [], zones: [], films: [], spacers: [],
    fan, fields,
    mask: { mode: "faceplate", region: VINYL, zone: RAILZONE, pads: RAIL, accents: union(ACCENT) },
    layers, repeatClose: false, docStyle: "compact",
    program,
  };

  const params: Record<string, unknown> = {
    name: "QUADRANT", rev: "A", W: p.W, H: p.H, R: p.R, edge_keep: p.edgeKeep, clr: p.clr, tw: p.tw,
    hub: [p.hubX, p.hubY], btn_r: [p.btnR0, p.btnR1], btn_a: [p.btnA0, p.btnA1], btn_gap_a: p.btnGapA, btn_round: p.btnRound,
    arcs, arc_w: p.arcW, arc_a_span: [p.arcA0, p.arcA1], arc_b_span: [p.arcB0, p.arcB1], sl_hmin: p.slHmin, sl_gap: p.slGap,
    esc_a: p.escA, esc_b: p.escB,
    rail_n: p.railN, rail_w: p.railW, rail_pitch: p.railPitch, rail_y0: p.railY0, rail_deep: p.railDeep, rail_shallow: p.railShallow, rail_r: p.railR,
    lanes: lanesY, vinyl_out: p.vinylOut, vinyl_rail_clr: p.vinylRailClr, accent_inset: p.accentInset,
    mark_size: p.markSize, mark_x: p.markX, mark_y: p.markY, wm_cap: p.wmCap, wm_x: p.wmX,
  };

  return { draft, params, pads, terminals, sweep };
}
