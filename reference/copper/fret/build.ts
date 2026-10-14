// reference/copper/fret/build.ts
// FRET rev A on packages/copper (M05-T15). A line for line port of the
// canonical generator, reference/copper/fret/legacy/gen_fret.py (lineage
// fret.generator/rev-a), returning declarations: the honeycomb of flat-top
// hex keys, each tapping out of its left flank into the zigzag grout
// ribbon beside it and following it down (the top key takes the innermost
// shift), two flank sliders, the top arc with its sideways escapes, the fan
// for the lane ranker (version 2, lines 224 to 250), the faceplate, the six
// layers and the 95 gates as a program.
//
// This module imports @hackbuild/spec and types only (BUILD_IMPORTS,
// D-178). Literals the generator wrote inline are carried as written,
// each with its generator line.

import type { FanDecl, FieldDecl, GateStep, LayerDecl, LayerItem, Pt, RadiusSpec, Shape, VinylDraft } from "@hackbuild/copper";
import type { Vec2 } from "@hackbuild/spec";
import type { FretParams } from "./chase.surface";

const box = (x0: number, y0: number, x1: number, y1: number): Shape => ({ op: "box", x0, y0, x1, y1 });
const rr = (x0: number, y0: number, x1: number, y1: number, r: number): Shape => ({ op: "rr", x0, y0, x1, y1, r });
const union = (of: readonly Shape[]): Shape => ({ op: "union", of });
const buffer = (of: Shape, d: number): Shape => ({ op: "buffer", d, of });
const inter = (a: Shape, b: Shape): Shape => ({ op: "intersection", of: [a, b] });

/** gen_fret.py line 410. */
const K = "#1a1a1a";
const PK = "#FE0386";
const CR = "#f5f0e6";
const GLD = "#d9b45a";
/** gen_fret.py line 66. */
const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;
/** The home key's major scale degrees, gen_fret.py line 337. */
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const SIN60 = Math.sin((60 * Math.PI) / 180);

export interface FretPad { readonly col: number; readonly row: number; readonly cx: number; readonly cy: number; readonly semi: number; readonly note: string }
export interface FretTerm { readonly net: string; readonly cx: number; readonly y: number; readonly h: number; readonly deep: boolean; readonly idx: number; readonly label: string }

export interface FretBuild {
  readonly draft: VinylDraft;
  readonly params: Readonly<Record<string, unknown>>;
  readonly pads: Readonly<Record<string, FretPad>>;
  readonly terminals: readonly FretTerm[];
  readonly electrodes: readonly Shape[];
  /** Arc sweep and straight travel, mm (gen_fret.py lines 374 and 194). */
  readonly arcSweep: number;
  readonly travel: readonly [number, number];
}

export function build(p: FretParams): FretBuild {
  const KEYS = Array.from({ length: p.cols * p.rows }, (_, i) => `K${i + 1}`);
  const NETS = [...KEYS, "AR_A", "AR_B", "L1_A", "L1_B", "L2_A", "L2_B"];
  const nets: Record<string, Shape[]> = Object.fromEntries(NETS.map((n) => [n, [] as Shape[]]));
  const add = (net: string, g: Shape): void => {
    nets[net]!.push(g);
  };
  const wire = (pts: readonly Pt[], w = p.tw): Shape => ({ op: "wire", pts, w });
  const arcC: Vec2 = [p.arcCX, p.arcCY];
  const apol = (r: number, a: number): [number, number] => {
    const t = (a * Math.PI) / 180;
    return [arcC[0] + r * Math.cos(t), arcC[1] + r * Math.sin(t)];
  };
  /** annulus() with the board's segment rule n = max(10, |a1 - a0| / 1.2) (lines 88 to 94). */
  const annulus = (rIn: RadiusSpec, rOut: RadiusSpec, a0: number, a1: number): Shape => ({
    op: "annulus", c: arcC, rIn, rOut, a0, a1, n: Math.max(10, Math.trunc(Math.abs(a1 - a0) / 1.2)),
  });
  /** Flat-top hex, points left and right (lines 96 to 100). */
  const hexagon = (cx: number, cy: number, s: number): Shape => ({
    op: "poly", pts: Array.from({ length: 6 }, (_, k) => [cx + s * Math.cos((60 * k * Math.PI) / 180), cy + s * Math.sin((60 * k * Math.PI) / 180)] as const),
  });
  const LABEL: Record<string, string> = {};
  const ESC: Record<string, Pt[]> = {};
  const ARRIVE: Record<string, number> = {};
  const linX = [[p.lin0X0, p.lin0X1], [p.lin1X0, p.lin1X1]] as const;
  const linCor = [p.linCor0, p.linCor1];
  const ly0 = p.linY0, ly1 = p.linY1;
  const lanesY = Array.from({ length: p.laneCount }, (_, i) => p.laneFar - p.laneStep * i);

  // ---- honeycomb and zigzag ribbons (lines 111 to 149)
  const s = p.hexS;
  const hexH = Math.sqrt(3) * s;
  const dxc = 1.5 * s;
  const ero = p.hexSeam / SIN60;
  const COLX = Array.from({ length: p.cols }, (_, c) => p.keyX0 + c * dxc);
  const cyOf = (c: number, r: number): number => p.keyY0 + hexH / 2 + (r + (c % 2 === 1 ? 0.5 : 0)) * hexH;
  const rowsOf = (c: number): number[] => Array.from({ length: p.rows }, (_, r) => cyOf(c, r));
  /** The grout centreline between columns c - 1 and c, top to bottom, alternating between the facing hex vertices (lines 121 to 134). */
  const ribbon = (c: number): [number, number][] => {
    const X = COLX[c]!;
    const set = [...new Set([...rowsOf(c), ...rowsOf(c - 1)])].sort((a, b) => b - a);
    const ys = [set[0]! + hexH / 2, ...set, set[set.length - 1]! - hexH / 2];
    return ys.map((y) => {
      const nearC = Math.min(...rowsOf(c).map((v) => Math.abs(y - v)));
      const nearP = Math.min(...rowsOf(c - 1).map((v) => Math.abs(y - v)));
      return [nearC <= nearP ? X - s : X - dxc + s, y];
    });
  };
  const pads: Record<string, FretPad> = {};
  const CHUSE: [number, string][][] = Array.from({ length: p.cols }, () => []);
  const semiOf = (c: number, r: number): number => p.base + (2 * r + (c % 2 === 1 ? 1 : 0)) + 6 * c;
  for (let c = 0; c < p.cols; c++) {
    const X = COLX[c]!;
    for (let r = 0; r < p.rows; r++) {
      const cy = cyOf(c, r);
      const net = `K${c * p.rows + r + 1}`;
      add(net, buffer(buffer(buffer(hexagon(X, cy, s), -p.hexSeam), -p.hexRound), p.hexRound));
      const semi = semiOf(c, r);
      LABEL[net] = `${NAMES[semi % 12]}${Math.floor(semi / 12) - 1}`;
      pads[net] = { col: c, row: r, cx: X, cy, semi, note: LABEL[net]! };
      CHUSE[c]!.push([cy, net]);
    }
  }
  // Sub-lanes: a sideways shift of the whole zigzag keeps a constant
  // perpendicular gap; the top key takes the innermost shift (lines 151 to 160).
  CHUSE[0]!.push([1e6, "AR_A"]);
  const SHIFT: Record<string, number> = {};
  const RIB: ([number, number][] | null)[] = [];
  for (let c = 0; c < p.cols; c++) {
    const orderIn = [...CHUSE[c]!].sort((a, b) => b[0] - a[0]).map(([, n]) => n);
    RIB[c] = c > 0 ? ribbon(c) : null;
    orderIn.forEach((net, i) => (SHIFT[net] = p.subGap * (i + 0.5)));
  }
  for (let c = 0; c < p.cols; c++) {
    for (const [, net] of CHUSE[c]!) {
      const pd = pads[net];
      if (pd === undefined) continue;
      const tap: [number, number] = [pd.cx - s + ero + 1.6, pd.cy];
      if (c === 0) {
        const x = p.lchan + SHIFT[net]!;
        ESC[net] = [tap, [x, pd.cy]];
        ARRIVE[net] = x;
      } else {
        const path = RIB[c]!.map(([px, py]) => [px + SHIFT[net]!, py] as [number, number]);
        const below = path.filter((q) => q[1] < pd.cy - 0.01);
        // enter the ribbon at the key's own height, then follow it down (lines 173 to 182)
        let entry: [number, number] | undefined;
        for (let j = 0; j + 1 < path.length; j++) {
          const [x1, y1] = path[j]!, [x2, y2] = path[j + 1]!;
          if (y1 >= pd.cy && pd.cy >= y2 && y1 !== y2) {
            const t = (y1 - pd.cy) / (y1 - y2);
            entry = [x1 + (x2 - x1) * t, pd.cy];
            break;
          }
        }
        ESC[net] = [tap, entry!, ...below];
        ARRIVE[net] = below[below.length - 1]![0];
      }
    }
  }

  // ---- sliders: flanks and the top arc (lines 184 to 222)
  const travel = linX.map(() => Number((ly1 - ly0).toFixed(1))) as [number, number];
  linX.forEach(([lx0, lx1], i) => {
    const tag = `L${i + 1}`;
    const wsum = (lx1 - lx0) - p.linGap;
    const hmax = wsum - p.linHmin;
    const yA0 = ly0, yA1 = ly1 - p.linOff;
    const yB0 = ly0 + p.linOff, yB1 = ly1;
    add(`${tag}_A`, { op: "poly", pts: [[lx0, yA0], [lx0 + hmax, yA0], [lx0 + p.linHmin, yA1], [lx0, yA1]] });
    add(`${tag}_B`, { op: "poly", pts: [[lx1, yB1], [lx1 - hmax, yB1], [lx1 - p.linHmin, yB0], [lx1, yB0]] });
    LABEL[`${tag}_A`] = `SL${i + 1} A`;
    LABEL[`${tag}_B`] = `SL${i + 1} B`;
    const xa = lx0 + hmax / 2;
    ESC[`${tag}_A`] = [[xa, ly0 + 1.6]];
    ARRIVE[`${tag}_A`] = xa;
    const cor = linCor[i]!;
    ESC[`${tag}_B`] = [[lx1 - hmax / 2, ly1 - 1.6], [cor, ly1 - 1.6]];
    ARRIVE[`${tag}_B`] = cor;
  });
  const rIn = p.arcR0, rOut = p.arcR1;
  const aa0 = p.arcA0, aa1 = p.arcA1 + p.arcOff;
  const ab0 = p.arcA0 - p.arcOff, ab1 = p.arcA1;
  const hmaxA = (rOut - rIn) - p.arcGap - p.arcHmin;
  const ARC_A = annulus(rIn, { base: rIn, sign: 1, h0: p.arcHmin, h1: hmaxA, a0: aa0, a1: aa1 }, aa0, aa1);
  const ARC_B = annulus({ base: rOut, sign: -1, h0: hmaxA, h1: p.arcHmin, a0: ab0, a1: ab1 }, rOut, ab0, ab1);
  add("AR_A", ARC_A);
  add("AR_B", ARC_B);
  LABEL["AR_A"] = "ARC A";
  LABEL["AR_B"] = "ARC B";
  const pa = apol(rIn + hmaxA / 2, aa1 - p.arcEsc);
  const pb = apol(rOut - hmaxA / 2, ab0 + p.arcEsc);
  // A joins the leftmost key channel, B drops in the gap right of the keys (lines 216 to 222)
  ESC["AR_A"] = [pa, [pa[0], p.arcRunY], [p.lchan + SHIFT["AR_A"]!, p.arcRunY]];
  ARRIVE["AR_A"] = p.lchan + SHIFT["AR_A"]!;
  ESC["AR_B"] = [pb, [pb[0], p.arcRunY], [p.arcOut, p.arcRunY]];
  ARRIVE["AR_B"] = p.arcOut;

  // ---- rail and constraint-ranked fan (lines 224 to 259)
  const order = [...NETS].sort((a, b) => ARRIVE[a]! - ARRIVE[b]!);
  const x0 = p.W / 2 - ((p.railN - 1) * p.railPitch) / 2.0;
  const TX: Record<string, number> = Object.fromEntries(order.map((k, i) => [k, x0 + i * p.railPitch]));
  const fan: FanDecl = {
    version: "v2", rail: "x", margin: p.tw + p.clr, lanes: lanesY,
    nets: order.map((k) => ({ net: k, arrive: ARRIVE[k]!, terminal: TX[k]! })),
  };
  const terminals: FretTerm[] = [];
  order.forEach((net, i) => {
    const cx = TX[net]!;
    const deep = i % 2 === 0;
    const h = deep ? p.railDeep : p.railShallow;
    const lane = { lane: net };
    add(net, wire([...ESC[net]!, [ARRIVE[net]!, lane], [cx, lane], [cx, p.railY0 + h - 1.0]]));
    add(net, rr(cx - p.railW / 2, p.railY0, cx + p.railW / 2, p.railY0 + h, p.railR));
    terminals.push({ net, cx, y: p.railY0, h, deep, idx: i, label: LABEL[net]! });
  });

  // ---- brand (lines 261 to 273)
  const mark = (part: number): Shape => ({ op: "mark", part, size: p.markSize, x: p.markX, y: p.markY });
  const wm1: Shape = { op: "text", s: "hack", weight: "700", cap: p.wmCap, x: p.wmX, y: p.markY + 7.0 };
  const wm2: Shape = { op: "text", s: ".build", weight: "700", cap: p.wmCap, x: p.wmX, y: p.markY + 0.4 };
  const brandK = union([mark(0), wm1]);
  const brandPK = union([mark(1), wm2]);
  const art: Shape[] = p.brand ? [mark(0), mark(1), wm1, wm2] : [];

  // ---- overlays (lines 278 to 290)
  const ELEC: Record<string, Shape> = Object.fromEntries(Object.entries(pads).map(([k, pd]) => [k, hexagon(pd.cx, pd.cy, s - p.hexSeam)]));
  const RAIL = union(terminals.map((t) => box(t.cx - p.railW / 2 - 1.0, t.y - 1.0, t.cx + p.railW / 2 + 1.0, t.y + t.h + 1.0)));
  const RAILZONE = box(
    Math.min(...terminals.map((t) => t.cx - p.railW / 2 - 1.0)), 0,
    Math.max(...terminals.map((t) => t.cx + p.railW / 2 + 1.0)), Math.max(...terminals.map((t) => t.y + t.h + 1.0)) + p.vinylRailClr,
  );
  const opened: Shape = { op: "difference", of: [buffer({ op: "outline" }, -2.0), RAILZONE] };
  const VINYL: Shape = { op: "outerOnly", of: buffer(buffer(opened, 0.8), -0.8) };
  const ARCFACE = annulus(rIn + 0.6, rOut - 0.6, ab0 + 1.0, aa1 - 1.0);
  const LINFACE = linX.map(([lx0, lx1]) => box(lx0 + 0.6, ly0 + 0.6, lx1 - 0.6, ly1 - 0.6));
  const ACCENT: Shape[] = [...Object.values(pads).map((pd) => hexagon(pd.cx, pd.cy, s - p.hexSeam - p.accentInset)), ARCFACE, ...LINFACE];
  const SLIDGEO = union([ARC_A, ARC_B, ...linX.map(([lx0, lx1]) => box(lx0, ly0, lx1, ly1))]);

  // ---- the gates (lines 292 to 404), in print order
  const oa0 = aa0 + 2.0, oa1 = ab1 - 2.0;
  const arcSweep = ((oa1 - oa0) * Math.PI / 180) * ((rIn + rOut) / 2);
  const keyList = Object.values(ELEC);
  const grid = Array.from({ length: p.cols }, (_, c) => Array.from({ length: p.rows }, (_, r) => semiOf(c, r)));
  const fields: FieldDecl[] = [{
    id: "rail", axis: "x", size: p.railW, pitch: p.railPitch, origin: x0, deep: p.railDeep, shallow: p.railShallow,
    fingers: terminals.map((t) => ({ net: t.net, at: t.cx, arrive: ARRIVE[t.net]!, deep: t.deep })),
  }];
  const program: GateStep[] = [
    { kind: "islands", pad: 5 }, { kind: "clearance" }, { kind: "keepout" }, { kind: "erode", style: "plain", pad: 5 },
    // the smallest key over 450 mm2 (line 311), as many keys as the lattice (315)
    { kind: "plateArea", regions: keyList, gt: 450, msg: "hex key plate {min:.0f} mm2, {w:.0f} x {h:.0f} mm across", vars: { w: 2 * (p.hexS - p.hexSeam / SIN60), h: Math.sqrt(3) * (p.hexS - p.hexSeam) } },
    { kind: "plateCount", regions: keyList, want: [p.cols * p.rows], msg: `{n} hex keys in ${p.cols} interlocking columns of ${p.rows}` },
    {
      kind: "isomorphic", grid, oddRaised: true, up: 2, upRight: 7, downRight: 5, rangeMin: 24, base: p.base, scale: MAJOR, degreesMin: 6, names: NAMES,
      msgs: {
        up: "up a column is a whole tone everywhere ({set})", upRight: "up-right is a perfect fifth everywhere ({set})",
        downRight: "down-right is a perfect fourth everywhere ({set})", distinct: "no duplicated notes ({n} distinct)",
        range: "range {range} semitones, {lo} to {hi}", degrees: "covers {k} of the 7 diatonic degrees of the home key",
      },
    },
  ];
  for (let c = 0; c < p.cols; c++) {
    const at = CHUSE[c]!.map(([, n]) => SHIFT[n]!);
    if (at.length > 1) program.push({ kind: "subLanes", at, scale: SIN60, min: p.tw + p.clr, msg: `channel ${c} carries {n} traces, {gap:.2f} mm apart across the grout` });
  }
  program.push(
    { kind: "laneBudget", counts: CHUSE.map((u) => u.length), max: p.rows + 1, msg: `no grout ribbon carries more than ${p.rows + 1} traces` },
    ...linX.map(([lx0, lx1], i): GateStep => ({
      kind: "ratio", a: `L${i + 1}_A`, b: `L${i + 1}_B`, dir: "down",
      window: { kind: "row", from: ly0 + p.linOff + 1.0, to: ly1 - p.linOff - 1.0, half: 0.35, x0: lx0 - 1, x1: lx1 + 1 },
      monoMsg: `slider L${i + 1} ratio monotone bottom to top`, spanMsg: `slider L${i + 1} span {max:.3f} to {min:.3f}, off both rails`,
    })),
    {
      kind: "ratio", a: "AR_A", b: "AR_B", dir: "up",
      // slices a +- 0.4 deg from r_in - 1 to r_out + 1, n max(10, 0.8 / 1.2) = 10 (line 368)
      window: { kind: "sector", from: oa0, to: oa1, half: 0.4, c: arcC, rIn: rIn - 1, rOut: rOut + 1, n: 10 },
      monoMsg: "arc ratio monotone along the sweep", spanMsg: "arc span {min:.3f} to {max:.3f}, off both rails",
    },
    { kind: "travel", values: [arcSweep], gt: 70, msg: "arc sweep {v:.0f} mm" },
    { kind: "travel", values: travel, ge: 55, msg: "straight sliders {v0:.0f} and {v1:.0f} mm" },
    { kind: "gap", pairs: [[SLIDGEO, union(keyList)]], min: p.clr, msg: "sliders clear the honeycomb by {d:.2f} mm" },
    { kind: "sliderKeepout", region: SLIDGEO, msg: "sliders inside the outline keepout" },
    { kind: "channels", want: 21, nets: false, msg: "exactly 21 channels: two MPR121 on one bus, 21 of 24 used" },
    // one row: pitch at least 10.5 (line 386), finger gap at least 2.0 (388)
    { kind: "fieldPitch", field: "rail", min: 10.5, msg: "rail is ONE row on {pitch:.1f} mm pitch" },
    { kind: "fingerGap", field: "rail", min: 2.0, msg: "rail finger gap {gap:.1f} mm" },
    { kind: "depthAlternates", field: "rail", msg: "finger depth alternates {deep:.0f} / {shallow:.0f} mm" },
    { kind: "railOrder", field: "rail", msg: "rail order follows arrival order (monotone fan)" },
    { kind: "lanes", style: "needs", msg: "fan needs {need} lanes, {have} available" },
    { kind: "bare", msg: "vinyl covers all live copper outside the rail zone ({bare:.2f} mm2 bare)" },
    { kind: "padsClear", msg: "vinyl clears every rail finger" },
    ...Object.entries(ELEC).map(([k, g]): GateStep => ({ kind: "overhang", electrode: g, out: p.vinylOut, msg: `vinyl overhangs key ${k}` })),
    { kind: "overhang", electrode: union([ARC_A, ARC_B]), out: p.vinylOut, msg: "vinyl overhangs the arc" },
    { kind: "maskPiece", msg: "vinyl faceplate is one connected piece" },
    { kind: "accents", inset: true, msg: "accent inlays clear the faceplate edge" },
    { kind: "maskKeepout", msg: "vinyl inside the shared outline keepout" },
  );

  // ---- type and ticks (lines 448 to 467)
  const txf: Shape[] = [], txg: Shape[] = [];
  const T = (str: string, cap: number, x: number, y: number, weight: "400" | "600" | "700" = "600", guide = false): void => {
    (guide ? txg : txf).push({ op: "text", s: str, weight, cap, x, y, anchor: "c" });
  };
  for (const t of terminals) T(t.label, 2.0, t.cx, t.y + t.h + 1.6, "600", true);
  for (const pd of Object.values(pads)) T(pd.note, 7.5, pd.cx, pd.cy - 3.6, "700");
  T("ARC", 2.4, arcC[0], ly1 + 3.5, "700");
  for (let z = 0; z < 9; z++) {
    const a = oa0 + (z * (oa1 - oa0)) / 8.0;
    txf.push(wire([apol(rIn + 0.4, a), apol(rIn + 2.6, a)], 0.7));
  }
  linX.forEach(([lx0, lx1], i) => {
    T(`SL${i + 1}`, 2.4, (lx0 + lx1) / 2, ly1 + 2.6, "700");
    for (let z = 0; z < 9; z++) {
      const y = ly0 + p.linOff + (z * ((ly1 - p.linOff) - (ly0 + p.linOff))) / 8.0;
      const side = i === 0 ? lx0 - 3.0 : lx1 + 1.2;
      txf.push(box(side, y - 0.35, side + 1.8, y + 0.35));
    }
  });
  T("FRET REV A  .  WICKI-HAYDEN  .  UP +2  UP-RIGHT +7  DOWN-RIGHT +5", 2.2, 126.0, 47.0);
  T("make things. break things. repeat.", 2.0, 126.0, 42.0, "400");

  // ---- the six layers, bottom to top (lines 440 to 481)
  const RIM: Shape = { op: "rim" };
  const ink = (g: Shape): LayerItem => ({ shape: union([g, RIM]), fill: K, opacity: 1, stroke: null, strokeWidth: 0 });
  const fill = (shape: Shape, colour: string, opacity = 1): LayerItem => ({ shape, fill: colour, opacity, stroke: null, strokeWidth: 0 });
  const line = (shape: Shape, colour: string, w: number): LayerItem => ({ shape, fill: null, opacity: 1, stroke: colour, strokeWidth: w });
  const FACE = VINYL;
  const layers: LayerDecl[] = [
    { id: "backer", file: "05_backer.svg", title: "FRET rev A  backer, 2 mm chipboard", role: "backer", material: "chipboard-2",
      region: { op: "outline" }, items: [fill(RIM, K)] },
    { id: "guide", file: "00_guide_under.svg", title: "FRET rev A  placement guide (print then cut, goes under the copper)", role: "guide",
      region: { op: "outline" }, ground: CR, items: [
        fill({ op: "nets" }, PK, 0.32), line(VINYL, PK, -0.3), fill(brandK, K), fill(brandPK, PK), fill(union([...txf, ...txg]), K),
      ] },
    { id: "copper", file: "01_copper.svg", title: "FRET rev A  copper: 16 hex keys, 3 sliders, 22 finger rail", role: "copper", material: "copper-tape",
      region: { op: "copper" }, items: [ink({ op: "copper" })] },
    { id: "vinyl", file: "02_vinyl_face.svg", title: "FRET rev A  vinyl faceplate, the dielectric you touch", role: "dielectric",
      region: VINYL, windows: RAILZONE, items: [ink(VINYL)] },
    { id: "faceplate", file: "03_faceplate_print.svg", title: "FRET rev A  printed faceplate (print then cut, top layer)", role: "faceplate",
      region: FACE, items: [
        fill(FACE, CR), fill(union(ACCENT), GLD, 0.22), line(union([...keyList, ARCFACE, ...LINFACE]), K, 0.35),
        fill(inter(brandK, FACE), K), fill(inter(brandPK, FACE), PK), fill(inter(union(txf), FACE), K),
      ] },
    { id: "accents", file: "04_vinyl_accents.svg", title: "FRET rev A  accent inlays, second colour vinyl (optional)", role: "accent",
      region: union(ACCENT), items: [ink(union(ACCENT))] },
  ];

  const draft: VinylDraft = {
    name: "FRET", rev: "A", W: p.W, H: p.H, R: p.R, edgeKeep: p.edgeKeep, clr: p.clr, smooth: p.smooth,
    nets: NETS.map((name) => ({ name, shapes: nets[name]! })),
    art, ticks: 0, brand: p.brand,
    audit: [], sliders: [], zones: [], films: [], spacers: [],
    fan, fields,
    mask: { mode: "faceplate", region: VINYL, zone: RAILZONE, pads: RAIL, accents: union(ACCENT) },
    layers, repeatClose: false, docStyle: "compact",
    program,
  };

  const params: Record<string, unknown> = {
    name: "FRET", rev: "A", W: p.W, H: p.H, R: p.R, edge_keep: p.edgeKeep, clr: p.clr, tw: p.tw,
    cols: p.cols, rows: p.rows, hex_s: p.hexS, hex_seam: p.hexSeam, hex_round: p.hexRound,
    key_x0: p.keyX0, key_y0: p.keyY0, sub_gap: p.subGap, lchan: p.lchan, base: p.base,
    lin_x: linX.map((x) => [...x]), lin_y: [ly0, ly1], lin_hmin: p.linHmin, lin_gap: p.linGap, lin_off: p.linOff, lin_cor: linCor,
    arc_c: [p.arcCX, p.arcCY], arc_r: [rIn, rOut], arc_a: [p.arcA0, p.arcA1], arc_hmin: p.arcHmin, arc_gap: p.arcGap, arc_off: p.arcOff, arc_esc: p.arcEsc,
    arc_run_y: p.arcRunY, arc_out: p.arcOut,
    rail_n: p.railN, rail_w: p.railW, rail_pitch: p.railPitch, rail_y0: p.railY0, rail_deep: p.railDeep, rail_shallow: p.railShallow, rail_r: p.railR,
    lanes: lanesY, vinyl_out: p.vinylOut, vinyl_rail_clr: p.vinylRailClr, accent_inset: p.accentInset,
    mark_size: p.markSize, mark_x: p.markX, mark_y: p.markY, wm_cap: p.wmCap, wm_x: p.wmX,
  };

  return { draft, params, pads, terminals, electrodes: keyList, arcSweep, travel };
}
