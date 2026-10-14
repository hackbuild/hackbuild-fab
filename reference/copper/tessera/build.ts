// reference/copper/tessera/build.ts
// TESSERA rev A on packages/copper (M05-T15). A line for line port of the
// canonical generator, reference/copper/tessera/legacy/gen_tessera.py
// (lineage tessera.generator/rev-a), returning declarations: the tiles as
// Voronoi cells of the jittered seed grid inside each column strip, the
// edge taps into the channel sub-lanes (the top row takes the leftmost),
// the sliders parked between channels, the fan for the lane ranker
// (version 2, lines 182 to 225), the faceplate, the six layers and the 85
// gates as a program.
//
// The seeds come from the declared seed through ./pyrandom.ts, which
// reproduces Python's random.Random(11) draws (M05-T15 step 2); the test
// holds them equal to the seeds the shipped geometry JSON records. A tap's
// height is the centroid of the tile's left strip (lines 144 to 145), which
// only geometry knows, so the wire reads it as { centroid: "y", of } and
// the kernel resolves it.
//
// This module imports @hackbuild/spec, types and a file in its own
// directory only (BUILD_IMPORTS, D-178). Literals the generator wrote
// inline are carried as written, each with its generator line.

import type { FanDecl, FieldDecl, GateStep, LayerDecl, LayerItem, Pt, RadiusSpec, Shape, VinylDraft } from "@hackbuild/copper";
import type { Vec2 } from "@hackbuild/spec";
import type { TesseraParams } from "./chase.surface";
import { PyRandom } from "./pyrandom";

const box = (x0: number, y0: number, x1: number, y1: number): Shape => ({ op: "box", x0, y0, x1, y1 });
const rr = (x0: number, y0: number, x1: number, y1: number, r: number): Shape => ({ op: "rr", x0, y0, x1, y1, r });
const union = (of: readonly Shape[]): Shape => ({ op: "union", of });
const buffer = (of: Shape, d: number): Shape => ({ op: "buffer", d, of });
const inter = (a: Shape, b: Shape): Shape => ({ op: "intersection", of: [a, b] });

/** gen_tessera.py line 365. */
const K = "#1a1a1a";
const PK = "#FE0386";
const CR = "#f5f0e6";
const GLD = "#d9b45a";

export interface TesseraPad { readonly col: number; readonly row: number; readonly seed: readonly [number, number] }
export interface TesseraTerm { readonly net: string; readonly cx: number; readonly y: number; readonly h: number; readonly deep: boolean; readonly idx: number; readonly label: string }

export interface TesseraBuild {
  readonly draft: VinylDraft;
  readonly params: Readonly<Record<string, unknown>>;
  readonly pads: Readonly<Record<string, TesseraPad>>;
  readonly terminals: readonly TesseraTerm[];
  /** The tiles, in the generator's order. */
  readonly tiles: Readonly<Record<string, Shape>>;
  /** Channel centres, mm (line 109). */
  readonly channels: readonly number[];
  /** Arc sweep and straight travel, mm (lines 326 and 315). */
  readonly arcSweep: number;
  readonly travel: readonly [number, number];
}

export function build(p: TesseraParams): TesseraBuild {
  const TILES = Array.from({ length: p.cols * p.rows }, (_, i) => `T${i + 1}`);
  const NETS = [...TILES, "AR_A", "AR_B", "L1_A", "L1_B", "L2_A", "L2_B"];
  /** gen_tessera.py lines 56 to 57. */
  const LABEL: Readonly<Record<string, string>> = {
    ...Object.fromEntries(TILES.map((k) => [k, `TILE ${k.slice(1)}`])),
    AR_A: "ARC A", AR_B: "ARC B", L1_A: "SL1 A", L1_B: "SL1 B", L2_A: "SL2 A", L2_B: "SL2 B",
  };
  const nets: Record<string, Shape[]> = Object.fromEntries(NETS.map((n) => [n, [] as Shape[]]));
  const add = (net: string, g: Shape): void => {
    nets[net]!.push(g);
  };
  const wire = (pts: readonly Pt[], w = p.tw): Shape => ({ op: "wire", pts, w });
  const FX0 = p.fieldX0, FY0 = p.fieldY0, FX1 = p.fieldX1, FY1 = p.fieldY1;
  const arcC: Vec2 = [p.arcCX, p.arcCY];
  const apol = (r: number, a: number): [number, number] => {
    const t = (a * Math.PI) / 180;
    return [arcC[0] + r * Math.cos(t), arcC[1] + r * Math.sin(t)];
  };
  /** annulus() with the board's segment rule n = max(10, |a1 - a0| / 1.2) (lines 79 to 85). */
  const annulus = (rIn: RadiusSpec, rOut: RadiusSpec, a0: number, a1: number): Shape => ({
    op: "annulus", c: arcC, rIn, rOut, a0, a1, n: Math.max(10, Math.trunc(Math.abs(a1 - a0) / 1.2)),
  });
  const lin = [[p.lin0X0, p.lin0X1], [p.lin1X0, p.lin1X1]] as const;
  const ly0 = p.slidY0, ly1 = p.slidY1;
  const lanesY = Array.from({ length: p.laneCount }, (_, i) => p.laneFar - p.laneStep * i);
  const ESC: Record<string, Pt[]> = {};
  const ARRIVE: Record<string, number> = {};

  // ---- channels and seeds (lines 106 to 120): the coursing is staggered
  // per column so the seams do not line up across channels.
  const nch = p.cols + 1;
  const cellW = ((FX1 - FX0) - nch * p.chanW) / p.cols;
  const CHAN = Array.from({ length: nch }, (_, i) => FX0 + i * (cellW + p.chanW) + p.chanW / 2);
  const rng = new PyRandom(p.seed);
  const SEED = new Map<string, [number, number]>();
  for (let j = 0; j < p.cols; j++) {
    const cx0 = CHAN[j]! + p.chanW / 2;
    const off = ((FY1 - FY0) / p.rows) * (j % 2 === 1 ? 0.34 : -0.34);
    for (let r = 0; r < p.rows; r++) {
      const yc = FY0 + ((FY1 - FY0) * (r + 0.5)) / p.rows + off;
      const sx = cx0 + cellW / 2 + rng.uniform(-p.jitterX, p.jitterX);
      const sy = yc + rng.uniform(-p.jitterY, p.jitterY);
      SEED.set(`${j},${r}`, [sx, sy]);
    }
  }

  // ---- tiles: Voronoi in y, channels in x (lines 122 to 147)
  const pads: Record<string, TesseraPad> = {};
  const TILE: Record<string, Shape> = {};
  for (let j = 0; j < p.cols; j++) {
    const left = CHAN[j]! + p.chanW / 2;
    const right = CHAN[j + 1]! - p.chanW / 2;
    for (let r = 0; r < p.rows; r++) {
      const me = SEED.get(`${j},${r}`)!;
      const cell: Shape = { op: "intersection", of: [box(left, FY0, right, FY1), ...[...SEED].filter(([key]) => key !== `${j},${r}`).map(([, q]): Shape => ({ op: "halfplane", p: me, q }))] };
      const g = buffer(buffer(buffer(cell, -p.tileSeam), -p.tileRound), p.tileRound);
      // numbered top down per column: row 0 is the bottom course (knowledge/designs/tessera.md 5.1; the comment on line 135 says bottom up)
      const net = `T${j * p.rows + (p.rows - r)}`;
      add(net, g);
      TILE[net] = g;
      pads[net] = { col: j, row: r, seed: me };
      // tap out of the left edge into the channel beside it; inside a channel the top row takes the leftmost sub-lane
      const sub = CHAN[j]! - ((p.rows - 1) * p.subGap) / 2 + (p.rows - 1 - r) * p.subGap;
      const ty = { centroid: "y" as const, of: inter(g, box(left, FY0 - 1, left + 2.6, FY1 + 1)) };
      ESC[net] = [[left + 1.4, ty], [sub, ty]];
      ARRIVE[net] = sub;
    }
  }

  // ---- sliders, parked between channels (lines 149 to 180)
  const travel = lin.map(([lx0, lx1]) => Number((lx1 - lx0).toFixed(1))) as [number, number];
  lin.forEach(([lx0, lx1], i) => {
    const tag = `L${i + 1}`;
    const hsum = (ly1 - ly0) - p.linGap;
    const hmax = hsum - p.linHmin;
    const xA0 = lx0, xA1 = lx1 - p.linOff;
    const xB0 = lx0 + p.linOff, xB1 = lx1;
    add(`${tag}_A`, { op: "poly", pts: [[xA0, ly0], [xA1, ly0], [xA1, ly0 + p.linHmin], [xA0, ly0 + hmax]] });
    add(`${tag}_B`, { op: "poly", pts: [[xB1, ly1], [xB0, ly1], [xB0, ly1 - p.linHmin], [xB1, ly1 - hmax]] });
    const xa = lx0 + 1.4, xb = lx1 - 1.4;
    ESC[`${tag}_A`] = [[xa, ly0 + hmax / 2]];
    ESC[`${tag}_B`] = [[xb, ly1 - hmax / 2]];
    ARRIVE[`${tag}_A`] = xa;
    ARRIVE[`${tag}_B`] = xb;
  });
  const rIn = p.arcR0, rOut = p.arcR1;
  const aa0 = p.arcA0, aa1 = p.arcA1 + p.arcOff;
  const ab0 = p.arcA0 - p.arcOff, ab1 = p.arcA1;
  const hmaxA = (rOut - rIn) - p.arcGap - p.arcHmin;
  const ARC_A = annulus(rIn, { base: rIn, sign: 1, h0: p.arcHmin, h1: hmaxA, a0: aa0, a1: aa1 }, aa0, aa1);
  const ARC_B = annulus({ base: rOut, sign: -1, h0: hmaxA, h1: p.arcHmin, a0: ab0, a1: ab1 }, rOut, ab0, ab1);
  add("AR_A", ARC_A);
  add("AR_B", ARC_B);
  for (const [net, aEnd, rMid] of [["AR_A", aa1 - p.arcEsc, rIn + hmaxA / 2], ["AR_B", ab0 + p.arcEsc, rOut - hmaxA / 2]] as const) {
    const q = apol(rMid, aEnd);
    ESC[net] = [q];
    ARRIVE[net] = q[0];
  }

  // ---- rail and monotone fan (lines 182 to 234)
  const order = [...NETS].sort((a, b) => ARRIVE[a]! - ARRIVE[b]!);
  const x0 = p.W / 2 - ((p.railN - 1) * p.railPitch) / 2.0;
  const TX: Record<string, number> = Object.fromEntries(order.map((k, i) => [k, x0 + i * p.railPitch]));
  const fan: FanDecl = {
    version: "v2", rail: "x", margin: p.tw + p.clr, lanes: lanesY,
    nets: order.map((k) => ({ net: k, arrive: ARRIVE[k]!, terminal: TX[k]! })),
  };
  const terminals: TesseraTerm[] = [];
  order.forEach((net, i) => {
    const cx = TX[net]!;
    const deep = i % 2 === 0;
    const h = deep ? p.railDeep : p.railShallow;
    const lane = { lane: net };
    add(net, wire([...ESC[net]!, [ARRIVE[net]!, lane], [cx, lane], [cx, p.railY0 + h - 1.0]]));
    add(net, rr(cx - p.railW / 2, p.railY0, cx + p.railW / 2, p.railY0 + h, p.railR));
    terminals.push({ net, cx, y: p.railY0, h, deep, idx: i, label: LABEL[net]! });
  });

  // ---- brand (lines 236 to 248)
  const mark = (part: number): Shape => ({ op: "mark", part, size: p.markSize, x: p.markX, y: p.markY });
  const wm1: Shape = { op: "text", s: "hack", weight: "700", cap: p.wmCap, x: p.wmX, y: p.markY + 7.0 };
  const wm2: Shape = { op: "text", s: ".build", weight: "700", cap: p.wmCap, x: p.wmX, y: p.markY + 0.4 };
  const brandK = union([mark(0), wm1]);
  const brandPK = union([mark(1), wm2]);
  const art: Shape[] = p.brand ? [mark(0), mark(1), wm1, wm2] : [];

  // ---- overlays (lines 253 to 264)
  const tiles = Object.values(TILE);
  const RAIL = union(terminals.map((t) => box(t.cx - p.railW / 2 - 1.0, t.y - 1.0, t.cx + p.railW / 2 + 1.0, t.y + t.h + 1.0)));
  const RAILZONE = box(
    Math.min(...terminals.map((t) => t.cx - p.railW / 2 - 1.0)), 0,
    Math.max(...terminals.map((t) => t.cx + p.railW / 2 + 1.0)), Math.max(...terminals.map((t) => t.y + t.h + 1.0)) + p.vinylRailClr,
  );
  const opened: Shape = { op: "difference", of: [buffer({ op: "outline" }, -2.0), RAILZONE] };
  const VINYL: Shape = { op: "outerOnly", of: buffer(buffer(opened, 0.8), -0.8) };
  const ARCFACE = annulus(rIn + 0.6, rOut - 0.6, ab0 + 1.0, aa1 - 1.0);
  const LINFACE = lin.map(([lx0, lx1]) => box(lx0 + 0.6, ly0 + 0.6, lx1 - 0.6, ly1 - 0.6));
  // each tile eroded by the inset; an eroded tile that vanishes adds nothing (line 264)
  const ACCENT: Shape[] = [...tiles.map((g) => buffer(g, -p.accentInset)), ARCFACE, ...LINFACE];

  // ---- the gates (lines 266 to 359), in print order
  const oa0 = aa0 + 2.0, oa1 = ab1 - 2.0;
  const arcSweep = ((oa1 - oa0) * Math.PI / 180) * ((rIn + rOut) / 2);
  const fields: FieldDecl[] = [{
    id: "rail", axis: "x", size: p.railW, pitch: p.railPitch, origin: x0, deep: p.railDeep, shallow: p.railShallow,
    fingers: terminals.map((t) => ({ net: t.net, at: t.cx, arrive: ARRIVE[t.net]!, deep: t.deep })),
  }];
  const program: GateStep[] = [
    { kind: "islands", pad: 5 }, { kind: "clearance" }, { kind: "keepout" }, { kind: "erode", style: "plain", pad: 5 },
    // the smallest tile over 400 mm2 (line 287), every tile one piece (289), 4 x 3 = 12 tiles (290)
    { kind: "plateArea", regions: tiles, gt: 400, msg: "smallest tile {min:.0f} mm2, largest {max:.0f} (a fingertip is about 100)" },
    { kind: "plateIslands", regions: tiles, msg: "every tile is one connected piece" },
    { kind: "plateCount", regions: tiles, want: [p.cols * p.rows, 12], msg: `12 tiles from ${p.cols} columns x ${p.rows} rows` },
    // every channel strip clear of every tile (lines 292 to 295)
    ...CHAN.map((c, j): GateStep => ({
      kind: "apart", a: tiles, each: true, b: box(c - p.chanW / 2, FY0 - 1, c + p.chanW / 2, FY1 + 1), msg: `channel ${j} at x=${c.toFixed(1)} is clear of every tile`,
    })),
  ];
  for (let j = 0; j < p.cols; j++) {
    const at = Array.from({ length: p.rows }, (_, k) => ARRIVE[`T${j * p.rows + k + 1}`]!);
    program.push({ kind: "subLanes", at, scale: 1, min: p.tw + p.clr, msg: `channel ${j} sub-lanes on {gap:.1f} mm centres` });
  }
  program.push(
    ...lin.map(([lx0, lx1], i): GateStep => ({
      kind: "ratio", a: `L${i + 1}_A`, b: `L${i + 1}_B`, dir: "down",
      window: { kind: "column", from: lx0 + p.linOff + 1.0, to: lx1 - p.linOff - 1.0, half: 0.35, y0: ly0 - 1, y1: ly1 + 1 },
      monoMsg: `slider L${i + 1} ratio monotone left to right`, spanMsg: `slider L${i + 1} span {max:.3f} to {min:.3f}, off both rails`,
    })),
    {
      kind: "ratio", a: "AR_A", b: "AR_B", dir: "up",
      // slices a +- 0.4 deg from r_in - 1 to r_out + 1, n max(10, 0.8 / 1.2) = 10 (line 320)
      window: { kind: "sector", from: oa0, to: oa1, half: 0.4, c: arcC, rIn: rIn - 1, rOut: rOut + 1, n: 10 },
      monoMsg: "arc ratio monotone along the sweep", spanMsg: "arc span {min:.3f} to {max:.3f}, off both rails",
    },
    { kind: "travel", values: [arcSweep], gt: 25, lt: 70, msg: "arc sweep {v:.0f} mm, small by design" },
    // the arc within the slider band, 0.1 mm of slack (line 329)
    { kind: "inside", outer: box(FX0, ly0 - 0.1, FX1, ly1 + 0.1), inner: union([ARC_A, ARC_B]), msg: "the arc stays inside the slider band" },
    { kind: "travel", values: travel, gt: 30, lt: 70, msg: "straight sliders {v0:.0f} mm each, small by design" },
    // the band grown 2 mm against the tiles (line 333)
    { kind: "apart", a: [union(tiles)], each: false, b: box(FX0 - 2, ly0 - 2, FX1 + 2, ly1 + 2), msg: "the slider band is clear of every tile" },
    { kind: "channels", want: 18, nets: false, msg: "exactly 18 channels: two MPR121 on one bus, 18 of 24 used" },
    // one row: pitch at least 12.5 (line 339), finger gap at least 3.5 (341)
    { kind: "fieldPitch", field: "rail", min: 12.5, msg: "rail is ONE row on {pitch:.1f} mm pitch" },
    { kind: "fingerGap", field: "rail", min: 3.5, msg: "rail finger gap {gap:.1f} mm" },
    { kind: "depthAlternates", field: "rail", msg: "finger depth alternates {deep:.0f} / {shallow:.0f} mm" },
    { kind: "railOrder", field: "rail", msg: "rail order follows arrival order (monotone fan)" },
    { kind: "lanes", style: "needs", msg: "fan needs {need} lanes, {have} available" },
    { kind: "bare", msg: "vinyl covers all live copper outside the rail zone ({bare:.2f} mm2 bare)" },
    { kind: "padsClear", msg: "vinyl clears every rail finger" },
    ...Object.entries(TILE).map(([k, g]): GateStep => ({ kind: "overhang", electrode: g, out: p.vinylOut, msg: `vinyl overhangs tile ${k}` })),
    { kind: "overhang", electrode: union([ARC_A, ARC_B]), out: p.vinylOut, msg: "vinyl overhangs the arc" },
    { kind: "overhang", electrode: union(lin.map(([lx0, lx1]) => box(lx0, ly0, lx1, ly1))), out: p.vinylOut, msg: "vinyl overhangs both straight sliders" },
    { kind: "maskPiece", msg: "vinyl faceplate is one connected piece" },
    { kind: "accents", inset: true, msg: "accent tiles clear the faceplate edge by 1 mm" },
    { kind: "maskKeepout", msg: "vinyl inside the shared outline keepout" },
  );

  // ---- type and ticks (lines 403 to 422)
  const txf: Shape[] = [], txg: Shape[] = [];
  type C = number | { readonly centroid: "x" | "y"; readonly of: Shape; readonly plus?: number };
  const T = (str: string, cap: number, x: C, y: C, weight: "400" | "600" | "700" = "600", guide = false): void => {
    (guide ? txg : txf).push({ op: "text", s: str, weight, cap, x, y, anchor: "c" });
  };
  for (const t of terminals) T(t.label, 2.0, t.cx, t.y + t.h + 1.6, "600", true);
  for (const [k, g] of Object.entries(TILE)) T(k.slice(1), 9.0, { centroid: "x", of: g }, { centroid: "y", of: g, plus: -4.5 }, "700");
  T("ARC", 2.4, arcC[0], ly1 + 2.2, "700");
  for (let z = 0; z < 9; z++) {
    const a = oa0 + (z * (oa1 - oa0)) / 8.0;
    txf.push(wire([apol(rIn + 0.4, a), apol(rIn + 2.6, a)], 0.7));
  }
  lin.forEach(([lx0, lx1], i) => {
    T(`SL${i + 1}`, 2.4, (lx0 + lx1) / 2, ly1 + 2.2, "700");
    for (let z = 0; z < 9; z++) {
      const x = lx0 + 2.0 + (z * ((lx1 - 2.0) - (lx0 + 2.0))) / 8.0;
      txf.push(box(x - 0.35, ly0 - 2.8, x + 0.35, ly0 - 1.0));
    }
  });
  T("TESSERA REV A", 2.2, 95.0, 47.0);
  T("make things. break things. repeat.", 2.0, 95.0, 42.4, "400");

  // ---- the six layers, bottom to top (lines 395 to 436)
  const RIM: Shape = { op: "rim" };
  const ink = (g: Shape): LayerItem => ({ shape: union([g, RIM]), fill: K, opacity: 1, stroke: null, strokeWidth: 0 });
  const fill = (shape: Shape, colour: string, opacity = 1): LayerItem => ({ shape, fill: colour, opacity, stroke: null, strokeWidth: 0 });
  const line = (shape: Shape, colour: string, w: number): LayerItem => ({ shape, fill: null, opacity: 1, stroke: colour, strokeWidth: w });
  const FACE = VINYL;
  const layers: LayerDecl[] = [
    { id: "backer", file: "05_backer.svg", title: "TESSERA rev A  backer, 2 mm chipboard", role: "backer", material: "chipboard-2",
      region: { op: "outline" }, items: [fill(RIM, K)] },
    { id: "guide", file: "00_guide_under.svg", title: "TESSERA rev A  placement guide (print then cut, goes under the copper)", role: "guide",
      region: { op: "outline" }, ground: CR, items: [
        fill({ op: "nets" }, PK, 0.32), line(VINYL, PK, -0.3), fill(brandK, K), fill(brandPK, PK), fill(union([...txf, ...txg]), K),
      ] },
    { id: "copper", file: "01_copper.svg", title: "TESSERA rev A  copper: 12 tile keys, 1 arc + 2 straight sliders, 18 finger rail", role: "copper", material: "copper-tape",
      region: { op: "copper" }, items: [ink({ op: "copper" })] },
    { id: "vinyl", file: "02_vinyl_face.svg", title: "TESSERA rev A  vinyl faceplate, the dielectric you touch", role: "dielectric",
      region: VINYL, windows: RAILZONE, items: [ink(VINYL)] },
    { id: "faceplate", file: "03_faceplate_print.svg", title: "TESSERA rev A  printed faceplate (print then cut, top layer)", role: "faceplate",
      region: FACE, items: [
        fill(FACE, CR), fill(union(ACCENT), GLD, 0.22), line(union([...tiles, ARCFACE, ...LINFACE]), K, 0.35),
        fill(inter(brandK, FACE), K), fill(inter(brandPK, FACE), PK), fill(inter(union(txf), FACE), K),
      ] },
    { id: "accents", file: "04_vinyl_accents.svg", title: "TESSERA rev A  accent tiles, second colour vinyl (optional)", role: "accent",
      region: union(ACCENT), items: [ink(union(ACCENT))] },
  ];

  const draft: VinylDraft = {
    name: "TESSERA", rev: "A", W: p.W, H: p.H, R: p.R, edgeKeep: p.edgeKeep, clr: p.clr, smooth: p.smooth,
    nets: NETS.map((name) => ({ name, shapes: nets[name]! })),
    art, ticks: 0, brand: p.brand,
    audit: [], sliders: [], zones: [], films: [], spacers: [],
    fan, fields,
    mask: { mode: "faceplate", region: VINYL, zone: RAILZONE, pads: RAIL, accents: union(ACCENT) },
    layers, repeatClose: false, docStyle: "compact",
    program,
  };

  const params: Record<string, unknown> = {
    name: "TESSERA", rev: "A", W: p.W, H: p.H, R: p.R, edge_keep: p.edgeKeep, clr: p.clr, tw: p.tw,
    seed: p.seed, jitter: [p.jitterX, p.jitterY], cols: p.cols, rows: p.rows, field: [FX0, FY0, FX1, FY1],
    chan_w: p.chanW, sub_gap: p.subGap, tile_seam: p.tileSeam, tile_round: p.tileRound,
    slid_y: [ly0, ly1], lin: lin.map((x) => [...x]), lin_hmin: p.linHmin, lin_gap: p.linGap, lin_off: p.linOff,
    arc_c: [p.arcCX, p.arcCY], arc_r: [rIn, rOut], arc_a: [p.arcA0, p.arcA1], arc_hmin: p.arcHmin, arc_gap: p.arcGap, arc_off: p.arcOff, arc_esc: p.arcEsc,
    rail_n: p.railN, rail_w: p.railW, rail_pitch: p.railPitch, rail_y0: p.railY0, rail_deep: p.railDeep, rail_shallow: p.railShallow, rail_r: p.railR,
    lanes: lanesY, vinyl_out: p.vinylOut, vinyl_rail_clr: p.vinylRailClr, accent_inset: p.accentInset,
    mark_size: p.markSize, mark_x: p.markX, mark_y: p.markY, wm_cap: p.wmCap, wm_x: p.wmX,
  };

  return { draft, params, pads, terminals, tiles: TILE, channels: CHAN, arcSweep, travel };
}
