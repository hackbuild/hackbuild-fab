// The one 2D code path: manifold's CrossSection (Clipper2 inside, D-163),
// set up as COTTER does (x/cotter-src/src/geo.js lines 10 to 27). A Section
// holds plain rings; every CrossSection an operation makes is freed before
// the operation returns, so no wasm object outlives a call and the live
// count stays at zero between calls (D-055).
//
// Coordinates are snapped to 1/1024 mm on entry (D-054) and on emit through
// toRings. Offsets and booleans run in float64 between the two. snap: false
// on entry or emit is the exemption for a parity route that compares
// against a non-dyadic legacy outline; its card states it.

import type { CrossSection, FillRule, JoinType, ManifoldToplevel, SimplePolygon } from "manifold-3d";
import type { CommandError, Mm, Ring, ThrownCommandError, Vec2 } from "@hackbuild/spec";
import { commandError } from "@hackbuild/spec";
import { loadManifold } from "./manifold.js";
import { q } from "./snap.js";
import { rrectRing, type RRect } from "./rrect.js";

export type { FillRule, JoinType };

/** Throwable CommandError (spec/errors.ts commandError). */
export const geomError: (hbf: CommandError) => ThrownCommandError = commandError;

export interface Bounds {
  readonly min: Vec2;
  readonly max: Vec2;
}

export interface EntryOptions {
  /** Fill rule for the rings, default Positive (COTTER GEO.cs). */
  readonly fillRule?: FillRule;
  /** Snap every coordinate to 1/1024 mm on entry, default true. */
  readonly snap?: boolean;
}

export interface OffsetOptions {
  /** Corner join, default Round. */
  readonly join?: JoinType;
  /** Miter limit as a multiple of |delta|, default 2 (Clipper2 default). */
  readonly miterLimit?: number;
  /** Segments per full circle for Round joins; 0 uses the circular settings. */
  readonly segments?: number;
}

/** Twice the signed area of a ring, mm2; positive when counter-clockwise. */
export function ringArea2(ring: Ring): number {
  let s = 0;
  for (let i = 0, n = ring.length, j = n - 1; i < n; j = i++) s += ring[j]![0] * ring[i]![1] - ring[i]![0] * ring[j]![1];
  return s;
}

function pointInRing(ring: Ring, x: number, y: number): boolean {
  let c = false;
  for (let i = 0, n = ring.length, j = n - 1; i < n; j = i++) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

// manifold's constructor reads contours[0] to tell one ring from many, so an empty region goes in as one empty ring
const asPolygons = (rings: readonly Ring[]): SimplePolygon[] => (rings.length === 0 ? [[]] : rings.map((r) => r.map(([x, y]) => [x, y] as [number, number])));

/** A 2D region as plain rings: outer rings counter-clockwise, holes clockwise, as CrossSection emits them. */
export class Section {
  readonly #geom: Geom;
  readonly rings: readonly Ring[];

  /** @internal Sections come from Geom; rings must already be normalised. */
  constructor(geom: Geom, rings: readonly Ring[]) {
    this.#geom = geom;
    this.rings = rings;
  }

  isEmpty(): boolean {
    return this.rings.length === 0;
  }

  /** Area, mm2. */
  area(): number {
    return this.#geom.use(this, (c) => c.area());
  }

  /** Axis-aligned bounds, mm; null for an empty section. */
  bounds(): Bounds | null {
    if (this.isEmpty()) return null;
    return this.#geom.use(this, (c) => {
      const b = c.bounds();
      return { min: [b.min[0], b.min[1]], max: [b.max[0], b.max[1]] };
    });
  }

  /** Offset by delta, mm, outward positive. */
  offset(delta: Mm, opts: OffsetOptions = {}): Section {
    return this.#geom.derive(this, (c, own) => own(c.offset(delta, opts.join ?? "Round", opts.miterLimit ?? 2, opts.segments ?? 0)));
  }

  union(...others: readonly Section[]): Section {
    return this.#geom.combine("union", [this, ...others]);
  }

  difference(...others: readonly Section[]): Section {
    return this.#geom.combine("difference", [this, ...others]);
  }

  intersection(...others: readonly Section[]): Section {
    return this.#geom.combine("intersection", [this, ...others]);
  }

  /** Rings, outer counter-clockwise and holes clockwise, snapped to 1/1024 mm unless snap is false. */
  toRings(opts: { readonly snap?: boolean } = {}): Ring[] {
    if (opts.snap === false) return this.rings.map((r) => r.slice());
    return this.rings.map((r) => r.map(([x, y]) => [q(x), q(y)] as Vec2));
  }

  /**
   * Rings grouped by outline: each entry is an outer ring then the holes it
   * directly contains. The hole flag comes from this grouping, so a caller
   * triangulating an entry never reads winding back off the area.
   */
  components(opts: { readonly snap?: boolean } = {}): { readonly outer: Ring; readonly holes: Ring[] }[] {
    const rings = this.toRings(opts);
    const outers = rings.filter((r) => ringArea2(r) > 0).map((r) => ({ outer: r, holes: [] as Ring[], area: ringArea2(r) }));
    const bySize = [...outers].sort((x, y) => x.area - y.area);
    for (const hole of rings.filter((r) => ringArea2(r) < 0)) {
      const host = bySize.find((o) => hole.some(([x, y]) => pointInRing(o.outer, x, y)));
      if (host === undefined) {
        throw geomError({ code: "E_KERNEL", got: hole.length, record: "kernels/mesh-kernel", hint: "a hole ring has no enclosing outer ring; report the input rings" });
      }
      host.holes.push(hole);
    }
    return outers.map(({ outer, holes }) => ({ outer, holes }));
  }
}

/** Handle on one manifold instance with COTTER's circular settings. */
export class Geom {
  readonly wasm: ManifoldToplevel;

  constructor(wasm: ManifoldToplevel) {
    this.wasm = wasm;
  }

  /** Rings under a fill rule, snapped on entry unless snap is false. */
  fromRings(rings: readonly Ring[], opts: EntryOptions = {}): Section {
    rings.forEach((r, i) => {
      if (r.length < 3) {
        throw geomError({ code: "E_SCHEMA", path: `/rings/${i}`, got: r.length, expected: "at least 3 vertices", hint: "give the ring three or more vertices" });
      }
    });
    const input = opts.snap === false ? rings : rings.map((r) => r.map(([x, y]) => [q(x), q(y)] as Vec2));
    return this.#normalise(input, opts.fillRule ?? "Positive");
  }

  /**
   * One outline with holes flagged by position. Each ring is reoriented,
   * outer counter-clockwise and holes clockwise, so a hole drawn the same
   * way round as its outer ring still cuts (mesh kernel record section 2).
   */
  fromOutline(outer: Ring, holes: readonly Ring[] = [], opts: Omit<EntryOptions, "fillRule"> = {}): Section {
    const orient = (r: Ring, hole: boolean): Ring => (ringArea2(r) > 0 === hole ? [...r].reverse() : r);
    return this.fromRings([orient(outer, false), ...holes.map((h) => orient(h, true))], { ...opts, fillRule: "Positive" });
  }

  /** A rounded rectangle emitted from its analytic form. */
  rrect(r: RRect, opts: Omit<EntryOptions, "fillRule"> & { readonly segments?: number } = {}): Section {
    return this.fromRings([rrectRing(r, opts.segments)], { fillRule: "Positive", ...(opts.snap === undefined ? {} : { snap: opts.snap }) });
  }

  empty(): Section {
    return new Section(this, []);
  }

  /** Union of any number of sections. */
  union(list: readonly Section[]): Section {
    if (list.length === 0) return this.empty();
    return this.combine("union", list);
  }

  /** @internal Run fn on a temporary CrossSection of s, freed before return. */
  use<T>(s: Section, fn: (c: CrossSection) => T): T {
    const c = new this.wasm.CrossSection(asPolygons(s.rings), "Positive");
    try {
      return fn(c);
    } finally {
      c.delete();
    }
  }

  /** @internal Derive a new section; every CrossSection passed to own is freed. */
  derive(s: Section, fn: (c: CrossSection, own: (x: CrossSection) => CrossSection) => CrossSection): Section {
    const owned: CrossSection[] = [];
    const own = (x: CrossSection): CrossSection => {
      owned.push(x);
      return x;
    };
    try {
      const base = own(new this.wasm.CrossSection(asPolygons(s.rings), "Positive"));
      return new Section(this, fn(base, own).toPolygons());
    } finally {
      for (const x of owned) x.delete();
    }
  }

  /** @internal Boolean over sections, first operand first. */
  combine(op: "union" | "difference" | "intersection", list: readonly Section[]): Section {
    const owned = list.map((s) => new this.wasm.CrossSection(asPolygons(s.rings), "Positive"));
    let result: CrossSection | undefined;
    try {
      const CS = this.wasm.CrossSection;
      result = op === "union" ? CS.union(owned) : op === "difference" ? CS.difference(owned) : CS.intersection(owned);
      return new Section(this, result.toPolygons());
    } finally {
      for (const x of owned) x.delete();
      result?.delete();
    }
  }

  #normalise(rings: readonly Ring[], fillRule: FillRule): Section {
    const c = new this.wasm.CrossSection(asPolygons(rings), fillRule);
    try {
      return new Section(this, c.toPolygons());
    } finally {
      c.delete();
    }
  }
}

let loading: Promise<Geom> | undefined;

/**
 * Load the shared manifold-3d instance; manifold.ts applies COTTER's
 * circular settings, setMinCircularAngle(8) and setMinCircularEdgeLength(0.35).
 */
export function loadGeom(): Promise<Geom> {
  loading ??= loadManifold().then((wasm) => new Geom(wasm));
  return loading;
}
