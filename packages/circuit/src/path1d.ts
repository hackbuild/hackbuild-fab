// The M-S circuit slice, path half (M-S-T05): nets from the declared
// conductor, contact and port features of one part, and the 1D path
// resistance of a pressed key, R = rho L / (w t) per conductor (D-072),
// read from the profile resistivity rows through ProfileLookup so the read
// is recorded. M05 replaces the conductor graph with net extraction from
// built bodies and adds the voxel solve (D-086); NetResistance.solved stays
// null here.
//
// Rules this slice applies, each a declaration read, never a guess:
// - A centreline conductor runs "along" for its centreline length at width
//   x t (spec/features.ts ConductorFeature: resistance uses the centreline
//   length). A path-region conductor is a column and runs "through" for t
//   over its region area.
// - Two conductors on one net touch when their footprints meet in plan and
//   their z ranges overlap; footprints are the polyline swept at width / 2
//   with round ends, or the filled region.
// - A net's lead is the conductor whose centreline end reaches the outline
//   of its body; the net's port sits there. A net with no lead has no
//   terminal and the path throws E_REF.
// - A net with a seat tap (PortFeature.tap, a board pin pressed on a seat
//   bump or socket) ends at the tapped conductor instead, and only there:
//   the board pin is the MCU terminal (K-04), so no lead to the outline is
//   needed and an outline end of that net is no terminal.

import type {
  BodyDraft, CommandError, ConductorFeature, ContactFeature, DirectionalResistance, Feature, Mm, NetResistance,
  Ohm, PartDraft, PortFeature, PortTap, ProfileLookup, Ring, ThrownCommandError, Tier, Vec2,
} from "@hackbuild/spec";
import { commandError, didYouMean, lowestTier } from "@hackbuild/spec";
import { sectionResistance } from "@hackbuild/profile";
import { faceBasis } from "@hackbuild/geom";

/** A CommandError thrown by the circuit slice (spec/errors.ts ThrownCommandError). */
export type CircuitError = ThrownCommandError;

/** Raise a circuit CommandError through spec/errors.ts commandError. */
export const circuitError: (hbf: CommandError) => CircuitError = commandError;

/** E_REF; with candidate ids it carries up to three by edit distance (spec/errors.ts didYouMean). */
const refError = (path: string, got: string, hint: string, ids: readonly string[] = []): CircuitError => {
  const near = didYouMean(got, ids);
  return circuitError({ code: "E_REF", path, got, ...(near.length > 0 ? { didYouMean: near } : {}), hint });
};

/** Plan distance at or under which two footprints count as touching, mm. Below the 1/1024 mm mesh grid. */
const TOUCH_EPS: Mm = 1e-4;

/** One conductor's leg of a 1D path, with the row it read. */
export interface PathLeg extends DirectionalResistance {
  /** Conductor feature id. */
  readonly conductor: string;
  readonly net: string;
  /** Profile ResistivityRow id read. */
  readonly row: string;
  readonly tier: Tier;
  /** Cross section the leg used, mm x mm: width x t for along, region area for through (second entry 1). */
  readonly section: readonly [Mm, Mm];
}

/** The pressed path of one key: lead to contact on the key net, contact to lead on the return net. */
export interface PressedPath {
  /** Key port id, return port id. */
  readonly terminals: readonly [from: string, to: string];
  readonly keyNet: string;
  readonly returnNet: string;
  /** Return port type: the level a press pulls the pin toward. */
  readonly returnType: PortFeature["type"];
  /** The seat tap each end lands on, key end then return end; null where the end is a lead on the outline. */
  readonly taps: readonly [PortTap | null, PortTap | null];
  readonly contact: ContactFeature;
  /** Legs in path order, key lead first. */
  readonly legs: readonly PathLeg[];
  /** NetResistance with the 1D preview only; solved is null until M05 (D-086). */
  readonly resistance: NetResistance;
  /** Lowest tier among the rows the legs read. */
  readonly tier: Tier;
}

// ---- plan geometry ----

function segDist(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

const cross = (o: Vec2, a: Vec2, b: Vec2): number => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

function segsCross(a: Vec2, b: Vec2, c: Vec2, d: Vec2): boolean {
  const d1 = cross(c, d, a);
  const d2 = cross(c, d, b);
  const d3 = cross(a, b, c);
  const d4 = cross(a, b, d);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

function segSegDist(a: Vec2, b: Vec2, c: Vec2, d: Vec2): number {
  if (segsCross(a, b, c, d)) return 0;
  return Math.min(segDist(a, c, d), segDist(b, c, d), segDist(c, a, b), segDist(d, a, b));
}

function inside(p: Vec2, ring: Ring): boolean {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const a = ring[i];
    const b = ring[j];
    if (a === undefined || b === undefined) continue;
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) hit = !hit;
  }
  return hit;
}

const edges = (ring: Ring): [Vec2, Vec2][] =>
  ring.map((a, i) => [a, ring[(i + 1) % ring.length] ?? a] as [Vec2, Vec2]);

const polyline = (pts: readonly Vec2[]): [Vec2, Vec2][] =>
  pts.length === 1 && pts[0] !== undefined
    ? [[pts[0], pts[0]]]
    : pts.slice(1).map((b, i) => [pts[i] ?? b, b] as [Vec2, Vec2]);

/** Shoelace area of a ring, mm2. */
export function ringArea(ring: Ring): number {
  let s = 0;
  for (const [a, b] of edges(ring)) s += a[0] * b[1] - b[0] * a[1];
  return Math.abs(s) / 2;
}

/** Centreline length, mm. */
export function polylineLength(pts: readonly Vec2[]): Mm {
  return polyline(pts).reduce((s, [a, b]) => s + Math.hypot(b[0] - a[0], b[1] - a[1]), 0);
}

// ---- conductors ----

/** A conductor in plan: centreline with half width, or a filled region, with its z range, mm. */
export type Footprint =
  | { readonly kind: "line"; readonly pts: readonly Vec2[]; readonly half: Mm; readonly z: readonly [Mm, Mm] }
  | { readonly kind: "region"; readonly ring: Ring; readonly z: readonly [Mm, Mm] };

/** A conductor feature in the part frame; also read by net extraction (M05-T04) for its lead and tap. */
export function footprint(f: ConductorFeature): Footprint {
  if ("meshHash" in f.region) {
    throw circuitError({ code: "E_SCHEMA", path: `/features/${f.id}/region`, hint: `conductor ${f.id}: meshHash regions arrive at M05; declare a centreline or path` });
  }
  const face = f.region.face;
  // a non-unit frame fails as faceBasis words it, before the stricter M-S slice check
  faceBasis(face, `/features/${f.id}/region/face`);
  const [nx, ny, nz] = face.normal;
  if (nx !== 0 || ny !== 0 || nz !== 1 || face.u[0] !== 1 || face.u[1] !== 0 || face.u[2] !== 0) {
    throw circuitError({ code: "E_SCHEMA", path: `/features/${f.id}/region/face`, hint: `conductor ${f.id}: only a +z face with u along +x is in the M-S slice` });
  }
  const [ox, oy, oz] = face.origin;
  const z = [oz, oz + f.t] as const;
  const shift = (p: Vec2): Vec2 => [p[0] + ox, p[1] + oy];
  return "centreline" in f.region
    ? { kind: "line", pts: f.region.centreline.map(shift), half: f.width / 2, z }
    : { kind: "region", ring: f.region.path.map(shift), z };
}

function planDist(a: Footprint, b: Footprint): number {
  if (a.kind === "line" && b.kind === "line") {
    let d = Infinity;
    for (const [p, q] of polyline(a.pts)) for (const [r, s] of polyline(b.pts)) d = Math.min(d, segSegDist(p, q, r, s));
    return d - a.half - b.half;
  }
  if (a.kind === "region" && b.kind === "region") {
    if (a.ring.some((p) => inside(p, b.ring)) || b.ring.some((p) => inside(p, a.ring))) return 0;
    let d = Infinity;
    for (const [p, q] of edges(a.ring)) for (const [r, s] of edges(b.ring)) d = Math.min(d, segSegDist(p, q, r, s));
    return d;
  }
  const line = a.kind === "line" ? a : (b as Extract<Footprint, { kind: "line" }>);
  const region = a.kind === "region" ? a : (b as Extract<Footprint, { kind: "region" }>);
  if (line.pts.some((p) => inside(p, region.ring))) return 0;
  let d = Infinity;
  for (const [p, q] of polyline(line.pts)) for (const [r, s] of edges(region.ring)) d = Math.min(d, segSegDist(p, q, r, s));
  return d - line.half;
}

const zOverlap = (a: Footprint, b: Footprint): boolean => a.z[0] <= b.z[1] + TOUCH_EPS && b.z[0] <= a.z[1] + TOUCH_EPS;

/** The plan outline of a body, from its prism or stack base. */
function bodyOutline(part: PartDraft, bodyId: string | undefined): Ring {
  const body: BodyDraft | undefined = bodyId === undefined ? part.bodies[0] : part.bodies.find((b) => b.id === bodyId);
  if (body === undefined) throw refError("/bodies", String(bodyId), `no body ${String(bodyId)} in part ${part.id}`, part.bodies.map((b) => b.id));
  const base = body.base;
  const ring = base.route === "prism" ? base.outline[0] : base.route === "stack" ? base.bands[0]?.outline[0] : undefined;
  if (ring === undefined) {
    throw circuitError({ code: "E_SCHEMA", path: `/bodies/${body.id}/base`, hint: `body ${body.id}: route ${base.route} has no plan outline in the M-S slice` });
  }
  return ring;
}

/** The declared conductor graph of one part, by net. */
export interface ConductorGraph {
  readonly conductors: ReadonlyMap<string, ConductorFeature>;
  /** Net id to conductor ids, in feature order. */
  readonly nets: ReadonlyMap<string, readonly string[]>;
  /** Conductor id to the ids it touches on its own net. */
  readonly touches: ReadonlyMap<string, readonly string[]>;
  /** Conductor ids a read path may end on: the seat taps of a tapped net, else the centreline ends on the body outline. */
  readonly leads: ReadonlySet<string>;
  /** Tapped conductor id to the port whose board pin presses on it. */
  readonly taps: ReadonlyMap<string, PortFeature>;
}

/** The seat taps of a part, tapped conductor id to port; E_REF when a tap names no conductor of the port's net. */
export function seatTaps(features: readonly Feature[]): Map<string, PortFeature> {
  const out = new Map<string, PortFeature>();
  for (const f of features) {
    if (f.kind !== "port" || f.tap === undefined) continue;
    const c = features.find((x): x is ConductorFeature => x.kind === "conductor" && x.id === f.tap!.conductor);
    if (c === undefined || c.net !== f.net) {
      const ids = features.filter((x): x is ConductorFeature => x.kind === "conductor" && x.net === f.net).map((x) => x.id);
      throw refError(`/features/${f.id}/tap/conductor`, f.tap.conductor, `port ${f.id} taps ${f.tap.conductor}, which is no conductor on net ${f.net}`, ids);
    }
    out.set(c.id, f);
  }
  return out;
}

export function conductorGraph(part: PartDraft): ConductorGraph {
  const list = part.features.filter((f): f is ConductorFeature => f.kind === "conductor");
  const conductors = new Map(list.map((f) => [f.id, f] as const));
  const prints = new Map(list.map((f) => [f.id, footprint(f)] as const));
  const nets = new Map<string, string[]>();
  for (const f of list) nets.set(f.net, [...(nets.get(f.net) ?? []), f.id]);

  const touches = new Map<string, string[]>(list.map((f) => [f.id, []]));
  for (const ids of nets.values()) {
    ids.forEach((a, i) => {
      for (const b of ids.slice(i + 1)) {
        const fa = prints.get(a);
        const fb = prints.get(b);
        if (fa === undefined || fb === undefined) continue;
        if (zOverlap(fa, fb) && planDist(fa, fb) <= TOUCH_EPS) {
          touches.get(a)?.push(b);
          touches.get(b)?.push(a);
        }
      }
    });
  }

  const taps = seatTaps(part.features);
  const tapped = new Set([...taps.values()].map((p) => p.net));
  const leads = new Set<string>(taps.keys());
  for (const f of list) {
    if (tapped.has(f.net)) continue;
    const fp = prints.get(f.id);
    if (fp === undefined || fp.kind !== "line") continue;
    const outline = bodyOutline(part, f.body);
    const ends = [fp.pts[0], fp.pts[fp.pts.length - 1]].filter((p): p is Vec2 => p !== undefined);
    const reaches = ends.some((p) => !inside(p, outline)
      || Math.min(...edges(outline).map(([a, b]) => segDist(p, a, b))) <= fp.half + TOUCH_EPS);
    if (reaches) leads.add(f.id);
  }
  return { conductors, nets, touches, leads, taps };
}

/**
 * Why a hookup entry cannot read the net it names, or null: a tapped net is
 * wired by the seat, so the entry must read the board pin the seat lands on
 * the net, on the MCU that board carries.
 */
export function tapMismatch(features: readonly Feature[], net: string, h: { readonly mcu: string; readonly pin: string }): string | null {
  const port = [...seatTaps(features).values()].find((p) => p.net === net);
  if (port === undefined) return null;
  const t = port.tap!;
  if (h.pin !== t.pin) return `hookup reads ${h.pin}, but net ${net} lands on ${t.board} pin ${t.pin} at ${port.id}; set the hookup pin to ${t.pin} or move the net to ${h.pin} in the seat`;
  if (h.mcu !== t.mcu) return `hookup reads mcu ${h.mcu}, but the seated board ${t.board} carries ${t.mcu}; set the hookup mcu to ${t.mcu}`;
  return null;
}

/** Shortest chain of touching conductors from `from` to a lead of the same net, breadth first. */
function chainToLead(g: ConductorGraph, from: string, net: string): string[] {
  const prev = new Map<string, string | null>([[from, null]]);
  const queue = [from];
  while (queue.length > 0) {
    const at = queue.shift() as string;
    if (g.leads.has(at)) {
      const chain: string[] = [];
      for (let c: string | null = at; c !== null; c = prev.get(c) ?? null) chain.push(c);
      return chain.reverse();
    }
    for (const next of g.touches.get(at) ?? []) {
      if (!prev.has(next)) {
        prev.set(next, at);
        queue.push(next);
      }
    }
  }
  const tap = [...g.taps.values()].find((p) => p.net === net);
  if (tap !== undefined) {
    throw refError(`/features/${from}`, net, `net ${net} has no chain of touching conductors from ${from} to its seat tap ${tap.tap!.conductor} (${tap.tap!.board} ${tap.tap!.pin}); route a trace onto the seat terminal`);
  }
  throw refError(`/features/${from}`, net, `net ${net} has no lead from ${from} to its body outline; extend a trace to the edge, or seat the board so its pin taps the net`);
}

/** One leg read from a resistivity row: lengthMm over areaMm2 in `direction`, through profile sectionResistance. */
function rowLeg(
  conductor: string, net: string, material: string, direction: "along" | "through", lengthMm: Mm, areaMm2: number,
  section: readonly [Mm, Mm], profile: ProfileLookup,
): PathLeg {
  const row = profile.resistivity(material, direction, "printed");
  const r = sectionResistance(row, lengthMm, areaMm2);
  // A ranged row takes its high end: the slower path is the one a wait must cover.
  const ohm: Ohm = typeof r.ohm === "number" ? r.ohm : r.ohm[1];
  const ohmCm = typeof row.ohmCm === "number" ? row.ohmCm : row.ohmCm[1];
  return { conductor, net, direction, lengthMm, areaMm2, ohmCm, ohm, row: r.rowId, tier: r.tier, section };
}

/** One conductor's 1D leg against its profile row. */
export function legOf(f: ConductorFeature, profile: ProfileLookup): PathLeg {
  const column = "path" in f.region;
  const lengthMm = column ? f.t : "centreline" in f.region ? polylineLength(f.region.centreline) : 0;
  const areaMm2 = "path" in f.region ? ringArea(f.region.path) : f.width * f.t;
  return rowLeg(f.id, f.net, f.material, column ? "through" : "along", lengthMm, areaMm2, column ? [areaMm2, 1] : [f.width, f.t], profile);
}

/**
 * A round post of height hMm and radius rMm, read "through" over its disc
 * pi r^2: PIP's Rpost (pip-controller src/model.js line 393), whose posts
 * are cylinders and never a faceted ring.
 */
export function postLeg(conductor: string, net: string, material: string, hMm: Mm, rMm: Mm, profile: ProfileLookup): PathLeg {
  const areaMm2 = Math.PI * rMm ** 2;
  return rowLeg(conductor, net, material, "through", hMm, areaMm2, [areaMm2, 1], profile);
}

/**
 * The pressed path of the key read at `portId`: from the port's lead along
 * the key net to the contact, across the contact to the return net, and
 * along it to that net's lead.
 */
export function pressedPath(part: PartDraft, portId: string, profile: ProfileLookup, g: ConductorGraph = conductorGraph(part)): PressedPath {
  const port = part.features.find((f): f is PortFeature => f.kind === "port" && f.id === portId);
  if (port === undefined) {
    const ports = part.features.filter((f) => f.kind === "port").map((f) => f.id);
    throw refError("/features", portId, `no port ${portId} in part ${part.id}`, ports);
  }
  const keyIds = g.nets.get(port.net) ?? [];
  const contact = part.features.find((f): f is ContactFeature =>
    f.kind === "contact" && (keyIds.includes(f.a) || keyIds.includes(f.b)));
  if (contact === undefined) throw refError(`/features/${portId}`, port.net, `net ${port.net} has no contact; a key needs one`);
  const keySide = keyIds.includes(contact.a) ? contact.a : contact.b;
  const otherSide = keySide === contact.a ? contact.b : contact.a;
  const other = g.conductors.get(otherSide);
  if (other === undefined) throw refError(`/features/${contact.id}`, otherSide, `contact ${contact.id} names no conductor ${otherSide}`);
  const portOf = (net: string): PortFeature | undefined =>
    [...g.taps.values()].find((p) => p.net === net) ?? part.features.find((f: Feature): f is PortFeature => f.kind === "port" && f.net === net);
  const returnPort = portOf(other.net);
  if (returnPort === undefined) throw refError(`/features/${contact.id}`, other.net, `net ${other.net} has no port`);
  const keyPort = [...g.taps.values()].find((p) => p.net === port.net) ?? port;

  const keyChain = chainToLead(g, keySide, port.net).reverse();
  const returnChain = chainToLead(g, otherSide, other.net);
  const legs = [...keyChain, ...returnChain].map((id) => {
    const f = g.conductors.get(id);
    if (f === undefined) throw refError("/features", id, `no conductor ${id}`);
    return legOf(f, profile);
  });
  const ohm = legs.reduce((s, l) => s + l.ohm, 0);
  const segments: DirectionalResistance[] = legs.map((l) => ({
    direction: l.direction, lengthMm: l.lengthMm, areaMm2: l.areaMm2, ohmCm: l.ohmCm, ohm: l.ohm,
  }));
  return {
    terminals: [keyPort.id, returnPort.id],
    keyNet: port.net,
    returnNet: other.net,
    returnType: returnPort.type,
    taps: [keyPort.tap ?? null, returnPort.tap ?? null],
    contact,
    legs,
    resistance: {
      terminals: [keyPort.id, returnPort.id],
      preview: { method: "path-1d", segments, ohm },
      solved: null,
      solvedOverPreview: null,
    },
    tier: lowestTier(legs.map((l) => l.tier)) ?? "inferred",
  };
}
