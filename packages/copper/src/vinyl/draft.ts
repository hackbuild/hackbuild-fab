// A cut-sheet board as declarations. A family build.ts returns a
// VinylDraft, plain data with no geometry library in it, so the same build
// can run where only data crosses (the D-178 sandbox reply); the kernel
// evaluates it here into a VinylBoard of regions the gates measure and
// the emitter writes. The order of evaluation is the generators': every
// net is unioned and then smoothed, copper is the nets plus the art
// (gen_keyway.py lines 194 to 195), and nothing is measured before the
// lanes and routes were fixed in data (knowledge/designs/keyway.md 4.1).
//
// Two numbers a build cannot know without geometry stay symbolic in the
// draft and the kernel resolves them here (M05-T15): the lane a net takes
// in the board's fan, which only the one lane ranker computes (lanes.ts,
// "compute lanes first then emit one polyline per net", benches-
// conductive-b.md A.12), and a centroid of a region, which TESSERA's taps
// read (gen_tessera.py lines 144 to 145).

import type { Section } from "@hackbuild/geom";
import type { Mm, ProfileLookup, Vec2 } from "@hackbuild/spec";
import { commandError } from "@hackbuild/spec";
import type { Font } from "./font.js";
import { centroid, islands, type Radius, type Vinyl } from "./helpers.js";
import { assignLanes, type LaneNet, type LaneVersion, type RailAxis } from "./lanes.js";
import type { GateStep } from "./program.js";
import { boundsOf, logoPaths, textGeom, type Anchor } from "./svgpath.js";

/**
 * A coordinate: a number, the lane coordinate the named net took in the
 * board's fan, or the centroid of a region along one axis plus an offset.
 */
export type Coord =
  | number
  | { readonly lane: string }
  | { readonly centroid: "x" | "y"; readonly of: Shape; readonly plus?: Mm };

export type Pt = readonly [Coord, Coord];

/**
 * A radius about an annulus centre: constant, or the family's linear taper
 * base + sign x (h0 + (h1 - h0) x (a - a0) / (a1 - a0)) over the angle a
 * (gen_quadrant.py lines 120 to 123), which is how wedge electrodes taper
 * in polar space.
 */
export type RadiusSpec =
  | Mm
  | { readonly base: Mm; readonly sign: 1 | -1; readonly h0: Mm; readonly h1: Mm; readonly a0: number; readonly a1: number };

/** A region as a tree of operations. */
export type Shape =
  | { readonly op: "box"; readonly x0: Mm; readonly y0: Mm; readonly x1: Mm; readonly y1: Mm }
  | { readonly op: "rr"; readonly x0: Mm; readonly y0: Mm; readonly x1: Mm; readonly y1: Mm; readonly r: Mm }
  | { readonly op: "poly"; readonly pts: readonly Vec2[] }
  | { readonly op: "wire"; readonly pts: readonly Pt[]; readonly w: Mm }
  | { readonly op: "annulus"; readonly c: Vec2; readonly rIn: RadiusSpec; readonly rOut: RadiusSpec; readonly a0: number; readonly a1: number; readonly n: number }
  /** Points closer to p than to q: a big quad on p's side of the bisector (gen_tessera.py lines 87 to 96). */
  | { readonly op: "halfplane"; readonly p: Vec2; readonly q: Vec2 }
  | { readonly op: "text"; readonly s: string; readonly weight: FontWeight; readonly cap: Mm; readonly x: Coord; readonly y: Coord; readonly anchor?: Anchor; readonly tracking?: Mm }
  /** One path of the owner's mark, fitted as the family places it: the whole mark's bounds to the origin, scaled so its long side is size, y flipped, its top left at (x, y + size). */
  | { readonly op: "mark"; readonly part: number; readonly size: Mm; readonly x: Mm; readonly y: Mm }
  | { readonly op: "union"; readonly of: readonly Shape[] }
  /** The first region less every other. */
  | { readonly op: "difference"; readonly of: readonly Shape[] }
  | { readonly op: "intersection"; readonly of: readonly Shape[] }
  | { readonly op: "outerOnly"; readonly of: Shape }
  | { readonly op: "rotate"; readonly deg: number; readonly origin: Vec2; readonly of: Shape }
  | { readonly op: "translate"; readonly dx: Mm; readonly dy: Mm; readonly of: Shape }
  | { readonly op: "buffer"; readonly d: Mm; readonly of: Shape }
  | { readonly op: "empty" }
  /** The board outline, the outline inset by edge keep, its rim, one smoothed net, every net, or the copper, as the kernel evaluated them. */
  | { readonly op: "outline" }
  | { readonly op: "keepout" }
  | { readonly op: "rim" }
  | { readonly op: "net"; readonly name: string }
  | { readonly op: "nets" }
  | { readonly op: "copper" };

export type FontWeight = "400" | "600" | "700";

/** What a cut-sheet layer is for (D-063). */
export type SheetRole = "copper" | "film" | "spacer" | "wiper" | "dielectric" | "faceplate" | "accent" | "caps" | "backer" | "guide";

/** One emitted region of a layer document. */
export interface LayerItem {
  readonly shape: Shape;
  readonly fill: string | null;
  readonly opacity: number;
  readonly stroke: string | null;
  /** Negative draws dashed. */
  readonly strokeWidth: number;
}

/** A cut sheet: role, profile material, its file and what it draws; every layer carries the shared rim. */
export interface LayerDecl {
  readonly id: string;
  readonly file: string;
  readonly title: string;
  readonly role: SheetRole;
  /** Profile material id; absent on a layer with no stock in profile (the print then cut guide). */
  readonly material?: string;
  /** The cut region, rim excluded; what the cross-layer gates read. */
  readonly region: Shape;
  /** Openings, for the stack declaration. */
  readonly windows?: Shape;
  /** Items drawn, in order; a cut layer draws its region with the rim. */
  readonly items: readonly LayerItem[];
  /** Fill the outline under the items (the guide's cream ground). */
  readonly ground?: string;
}

/** A named connection the netlist audit counts (gen_keyway.py lines 205 to 214). */
export interface AuditProbe {
  readonly net: string;
  readonly what: string;
  /** intersects a region, or contains a point. */
  readonly region?: Shape;
  readonly point?: Vec2;
}

/** A wedge pair slider sampled across its travel (gen_keyway.py lines 239 to 249). */
export interface SliderDecl {
  readonly id: string;
  readonly a: string;
  readonly b: string;
  /** Sample travel, x from and to, mm. */
  readonly travel: readonly [Mm, Mm];
  /** Cut lines run from y0 - 1 to y1 + 1 over the band. */
  readonly band: readonly [Mm, Mm];
}

export interface TerminalDecl {
  readonly name: string;
  readonly net: string;
  readonly label: string;
  readonly cx: Mm;
  readonly y: Mm;
  readonly row: 1 | 2;
  readonly idx: number;
}

/** The clip field: pads on a pitch in field order. */
export interface ClipFieldDecl {
  readonly pitch: Mm;
  readonly size: Mm;
  readonly terminals: readonly TerminalDecl[];
}

/** A force zone: the film over it bridges common and its own net only, and both it and the spacer window reach both combs. */
export interface ZoneDecl {
  readonly net: string;
  readonly common: string;
  readonly film: Shape;
  readonly window: Shape;
}

/** The top conductor and what holds it (gen_keyway.py lines 275 to 284). */
export interface WiperDecl {
  readonly wiper: Shape;
  readonly film: Shape;
  /** The sliding film's own nets. */
  readonly filmNets: readonly string[];
  readonly collector: string;
  /** The collector pad box the tail lands on. */
  readonly landing: readonly [Mm, Mm, Mm, Mm];
  /** Outer box of the spacer that holds the wiper off. */
  readonly spacerOuter: Shape;
  readonly slot: Shape;
}

/** The fan the lane ranker places (lanes.ts): arrivals, terminals, margin and lanes, farthest from the rail first. */
export interface FanDecl {
  readonly version: LaneVersion;
  readonly rail: RailAxis;
  /** Trace width plus clearance, mm. */
  readonly margin: Mm;
  readonly lanes: readonly Mm[];
  readonly nets: readonly LaneNet[];
}

/** One clip pad or edge finger: its net, its coordinate along the field, the coordinate its trace arrives on, and whether it is a deep finger. */
export interface FingerDecl {
  readonly net: string;
  readonly at: Mm;
  readonly arrive: Mm;
  readonly deep?: boolean;
}

/** A clip field or edge rail: fingers along one axis on a pitch from an origin. */
export interface FieldDecl {
  readonly id: string;
  readonly axis: RailAxis;
  /** Finger or pad width across the field, mm. */
  readonly size: Mm;
  /** The rail's declared pitch, mm; a clip field placed by list has none. */
  readonly pitch?: Mm;
  /** Coordinate of the first finger in arrival order, mm; a rail only. */
  readonly origin?: Mm;
  readonly deep?: Mm;
  readonly shallow?: Mm;
  readonly fingers: readonly FingerDecl[];
}

/**
 * The vinyl over the copper (D-063, CHK-NET-24). In faceplate mode it is a
 * dielectric piece with windows over the wiring zone (the capacitive
 * boards, benches-conductive-b.md Deltas conflict 7); soldermask mode
 * follows the outline with a 1.2 mm border (CHK-NET-09) and has no board
 * in the family yet.
 */
export interface MaskDecl {
  readonly mode: "faceplate" | "soldermask";
  readonly region: Shape;
  /** The wiring zone left bare: clip fields or the rail. */
  readonly zone: Shape;
  /** The clip pads or rail fingers the mask must clear. */
  readonly pads: Shape;
  /** Second colour tiles that sit on the mask. */
  readonly accents: Shape;
}

export interface VinylDraft {
  readonly name: string;
  readonly rev: string;
  readonly W: Mm;
  readonly H: Mm;
  /** Outline corner radius, mm. */
  readonly R: Mm;
  /** Copper keepout from the outline, mm. */
  readonly edgeKeep: Mm;
  /** Net to net clearance gate, mm. */
  readonly clr: Mm;
  /** Smoothing distance, mm (0.4 or 0.25 by board). */
  readonly smooth: Mm;
  /** Nets in gate order, each the shapes added to it. */
  readonly nets: readonly { readonly name: string; readonly shapes: readonly Shape[] }[];
  /** Art in the copper: slider ticks always, the brand when switched on. */
  readonly art: readonly Shape[];
  readonly ticks: number;
  readonly brand: boolean;
  readonly audit: readonly AuditProbe[];
  readonly sliders: readonly SliderDecl[];
  readonly clips?: ClipFieldDecl;
  readonly zones: readonly ZoneDecl[];
  /** The film's name in gate lines, as the generator prints it ("Velostat"). */
  readonly filmName?: string;
  readonly wiper?: WiperDecl;
  /** Films the keepout gate holds inside the copper keepout. */
  readonly films: readonly Shape[];
  /** Spacer regions that must each be one piece. */
  readonly spacers: readonly Shape[];
  /** Bottom first. */
  readonly layers: readonly LayerDecl[];
  /** Write the closing vertex again in emitted rings (KEYWAY does, the later boards do not). */
  readonly repeatClose: boolean;
  /** KEYWAY writes W x H at 3 decimals on three lines; the later boards at 1 decimal on one line (gen_vernier.py lines 313 to 316). */
  readonly docStyle?: "keyway" | "compact";
  readonly fan?: FanDecl;
  readonly fields?: readonly FieldDecl[];
  readonly mask?: MaskDecl;
  /** The gates, in the generator's order. */
  readonly program: readonly GateStep[];
}

/** The inputs a draft reads outside its params: fonts by weight and the mark's SVG text, already sanitised. */
export interface VinylInputs {
  readonly fonts: Readonly<Record<FontWeight, Font>>;
  readonly logo: string;
}

export interface VinylBoard {
  readonly draft: VinylDraft;
  /** Rim width every layer carries, mm (profile vinyl.rim). */
  readonly rimWidth: Mm;
  /** Emit simplify tolerance, mm (profile vinyl.emitTolerance). */
  readonly emitTolerance: Mm;
  readonly outline: Section;
  readonly keepout: Section;
  readonly rim: Section;
  readonly nets: ReadonlyMap<string, Section>;
  readonly art: Section;
  readonly copper: Section;
  /** Evaluate any further shape of the draft against the same inputs. */
  readonly shape: (s: Shape) => Section;
  /** The fan as the lane ranker placed it, when the draft declares one. */
  readonly lanes?: PlacedFan;
}

/** A placed fan: the lane per net, the lanes used and needed, and the lanes available. */
export interface PlacedFan {
  readonly lane: Readonly<Record<string, number>>;
  readonly used: number;
  readonly need: number;
  readonly have: number;
  readonly nets: number;
}

function draftError(path: string, got: unknown, hint: string): Error {
  return commandError({ code: "E_SCHEMA", path, got, expected: "a vinyl draft shape", record: "kernels/copper-routing", hint });
}

/** The board regions the outline, keepout, rim, net, nets and copper ops read. */
export interface BoardRegions {
  readonly outline: Section;
  readonly keepout: Section;
  readonly rim: Section;
  readonly nets: ReadonlyMap<string, Section>;
  readonly copper: Section;
}

/** The family's linear radius taper as a function of angle. */
function radius(r: RadiusSpec): Radius {
  if (typeof r === "number") return r;
  return (a: number) => r.base + r.sign * (r.h0 + (r.h1 - r.h0) * ((a - r.a0) / (r.a1 - r.a0)));
}

/** Evaluate shapes against one geom handle and the shipped inputs; the board ops need regions, a lane coordinate needs the placed fan. */
export function shapeEvaluator(v: Vinyl, inputs: VinylInputs, regions?: () => BoardRegions, fan?: PlacedFan): (s: Shape) => Section {
  const board = (op: string): BoardRegions => {
    if (regions === undefined) throw draftError(`/${op}`, op, "board regions exist only after the nets are evaluated; draw nets from primitives");
    return regions();
  };
  // A draft reuses one shape object wherever the generator reuses a region
  // (a tile is a net, an electrode, an accent and a tap); evaluate it once.
  const memo = new WeakMap<Shape, Section>();
  const coord = (c: Coord): number => {
    if (typeof c === "number") return c;
    if ("lane" in c) {
      const at = fan?.lane[c.lane];
      if (at === undefined) throw draftError("/fan", c.lane, "declare the net in the draft's fan before a wire reads its lane");
      return at;
    }
    const [x, y] = centroid(ev(c.of));
    return (c.centroid === "x" ? x : y) + (c.plus ?? 0);
  };
  let marks: { paths: Section[]; bounds: [number, number, number, number] } | undefined;
  const markPaths = (): { paths: Section[]; bounds: [number, number, number, number] } => {
    if (marks === undefined) {
      const paths = logoPaths(v, inputs.logo);
      marks = { paths, bounds: boundsOf([v.union(paths)]) };
    }
    return marks;
  };
  const ev = (s: Shape): Section => {
    const hit = memo.get(s);
    if (hit !== undefined) return hit;
    const out = evOnce(s);
    memo.set(s, out);
    return out;
  };
  const evOnce = (s: Shape): Section => {
    switch (s.op) {
      case "box":
        return v.box(s.x0, s.y0, s.x1, s.y1);
      case "rr":
        return v.rr(s.x0, s.y0, s.x1, s.y1, s.r);
      case "poly":
        return v.poly(s.pts);
      case "wire":
        return v.wire(s.pts.map(([x, y]) => [coord(x), coord(y)] as const), s.w);
      case "annulus":
        return v.annulus(s.c, radius(s.rIn), radius(s.rOut), s.a0, s.a1, { n: s.n });
      case "halfplane":
        return v.halfplane(s.p, s.q);
      case "text":
        return textGeom(v, inputs.fonts[s.weight], s.s, s.cap, coord(s.x), coord(s.y), s.tracking ?? 0, s.anchor ?? "l").geom;
      case "mark": {
        const m = markPaths();
        const p = m.paths[s.part];
        if (p === undefined) throw draftError("/mark/part", s.part, `the mark has ${m.paths.length} paths`);
        const [x0, y0, x1, y1] = m.bounds;
        const k = s.size / Math.max(x1 - x0, y1 - y0);
        return v.translate(v.scale(v.translate(p, -x0, -y0), k, -k), s.x, s.y + s.size);
      }
      case "union":
        return v.union(s.of.map(ev));
      case "difference": {
        const [first, ...rest] = s.of.map(ev);
        if (first === undefined) return v.g.empty();
        const cut = rest.filter((r) => !r.isEmpty());
        return cut.length === 0 ? first : first.difference(...cut);
      }
      case "intersection": {
        const all = s.of.map(ev);
        if (all.length === 0 || all.some((r) => r.isEmpty())) return v.g.empty();
        return all.length === 1 ? all[0]! : all[0]!.intersection(...all.slice(1));
      }
      case "outerOnly":
        return v.outerOnly(ev(s.of));
      case "rotate":
        return v.rotate(ev(s.of), s.deg, s.origin);
      case "translate":
        return v.translate(ev(s.of), s.dx, s.dy);
      case "buffer":
        return v.buffer(ev(s.of), s.d);
      case "empty":
        return v.g.empty();
      case "outline":
        return board("outline").outline;
      case "keepout":
        return board("keepout").keepout;
      case "rim":
        return board("rim").rim;
      case "net": {
        const n = board("net").nets.get(s.name);
        if (n === undefined) throw draftError("/net/name", s.name, `name one of ${[...board("net").nets.keys()].join(", ")}`);
        return n;
      }
      case "nets":
        return v.union([...board("nets").nets.values()]);
      case "copper":
        return board("copper").copper;
    }
  };
  return ev;
}

/**
 * Place the draft's fan with the one lane ranker. A fan the ranker cannot
 * place refuses the board, as the generators raise SystemExit before any
 * gate runs (gen_tessera.py lines 210 to 214).
 */
export function placeFan(fan: FanDecl): PlacedFan {
  const r = assignLanes({ nets: fan.nets, margin: fan.margin, lanes: fan.lanes, rail: fan.rail }, fan.version);
  if (!r.ok) {
    throw commandError({ code: "E_SCHEMA", path: "/fan", got: r.reason, expected: "a fan the lane ranker can place", record: "kernels/copper-routing", hint: r.message });
  }
  return { lane: r.lane, used: r.used, need: r.need, have: fan.lanes.length, nets: fan.nets.length };
}

/** Evaluate a draft: the fan, outline, keepout, rim, smoothed nets, art and copper. */
export function evaluateDraft(v: Vinyl, draft: VinylDraft, inputs: VinylInputs, profile: ProfileLookup): VinylBoard {
  const rimWidth = profile.constant("vinyl.rim").value;
  const emitTolerance = profile.constant("vinyl.emitTolerance").value;
  const lanes = draft.fan === undefined ? undefined : placeFan(draft.fan);
  let regions: BoardRegions | undefined;
  const shape = shapeEvaluator(v, inputs, () => regions!, lanes);
  const prim = shapeEvaluator(v, inputs, undefined, lanes);
  const outline = v.rr(0, 0, draft.W, draft.H, draft.R);
  const keepout = v.buffer(outline, -draft.edgeKeep);
  const rim = outline.difference(v.buffer(outline, -rimWidth));
  const nets = new Map<string, Section>();
  for (const n of draft.nets) {
    if (nets.has(n.name)) throw draftError("/nets", n.name, "name every net once");
    nets.set(n.name, v.smooth(v.union(n.shapes.map(prim)), draft.smooth));
  }
  const art = v.union(draft.art.map(prim));
  const copper = v.union([...nets.values(), art]);
  regions = { outline, keepout, rim, nets, copper };
  return { draft, rimWidth, emitTolerance, outline, keepout, rim, nets, art, copper, shape, ...(lanes === undefined ? {} : { lanes }) };
}

/** Polygon count of every net, for a reader that wants it without the gates. */
export function netIslands(board: VinylBoard): Record<string, number> {
  return Object.fromEntries([...board.nets].map(([k, s]) => [k, islands(s)]));
}
