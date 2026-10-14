// Net extraction from the conductive bodies of a built part (M05-T04, D-086).
//
// Port of the PIP net pass (pip-controller src/model.js lines 207 to 224:
// per net union, decompose, count the pieces, minGap between solids) and of
// BOSS netCheck (designs/blocks/legacy/boss-src/src/kernel.js lines 351 to
// 382: union-find over conductive prisms, taps resolved by containment at
// the tap z). PIP unions each declared net and counts its pieces; BOSS joins
// prisms that overlap. Here every body with role conductor or
// flex-conductor is decomposed into connected components with the mesh
// kernel, and two components join one piece when manifold minGap between
// them is at most the touch distance. The declared nets a piece carries come
// from the conductor features that generated its bodies; a declared net in
// more than one piece is a split (CHK-NET-01 fail naming the pieces), and a
// piece carrying two declared nets is a short naming both.
//
// Touch distance. Stage 6 insets every conductive insert by the profile
// constant 3mf.coincidenceInset in plan (packages/mesh/src/stages.ts), so
// two conductors drawn abutting leave the build 2 x inset apart: 0.001953 mm
// on the 1/1024 mm grid (computed, two prisms drawn touching, M05-T04).
// The card's 1e-3 mm would split every abutting pair, so a touch is
// minGap <= 2 x 3mf.coincidenceInset + one grid step (0.002977 mm at the
// inferred 0.001 mm inset). A drawn 0.01 mm gap builds 0.0117 mm apart and
// stays two pieces. A body that took the pinch inset (0.02 mm) is not
// covered and reads as split, loudly.
//
// Components are diagnostics: they travel in Extraction for the CHK-NET-01
// extra (`components`), never in Net (spec/circuit.ts).

import type {
  Body, BuildWarning, ConductorFeature, MeshRef, Mm, Net, PadFeature, Part, PortFeature, ProfileLookup, Tier, Vec2, Vec3,
} from "@hackbuild/spec";
import { GRID } from "@hackbuild/geom";
import { loadManifold, toManifold, union, withScope, type MeshData } from "@hackbuild/mesh";

// manifold types through the mesh package, which owns the dependency.
type Manifold = ReturnType<typeof toManifold>;
import { circuitError, footprint, seatTaps } from "../path1d.js";
import { netRecord } from "./resistance.js";

/** Body roles whose material carries a net (spec/part-ir.ts BodyRole). */
export const CONDUCTIVE_ROLES: readonly Body["role"][] = ["conductor", "flex-conductor"];

/** Side of the cube a tap point is tested with, mm: four grid steps (computed from GRID). */
const TAP_CUBE: Mm = 4 * GRID;

export interface ExtractInput {
  /** A built part: Part IR, or the unhashed part packages/mesh assemblePart returns. */
  readonly part: Pick<Part, "id" | "bodies" | "features">;
  /** Resolves a body's MeshRef to its bytes; undefined when not at hand (E_REF). */
  readonly mesh: (ref: MeshRef) => MeshData | undefined;
  readonly profile: ProfileLookup;
  /**
   * Stage 7 lift taken off the vertices into the 3MF item transform, mm
   * (BuiltPart.itemTransform). Features stay in the draft frame, so their
   * points move by minus this before they meet the meshes. Absent reads 0.
   */
  readonly itemTransform?: Vec3;
  /**
   * Also measure net to net: manifold minGap between the union of each
   * declared net's components and every other's, out to profile
   * route.gapSearch (PIP model.js lines 216 to 223, M05-T10). Off by default.
   */
  readonly gaps?: boolean;
}

/** Profile constant: the net-to-net search distance, mm (PIP model.js line 221). */
export const NET_GAP_SEARCH = "route.gapSearch";

/** The solids of one net, owned by the caller's scope. */
export interface NetSolids {
  readonly net: string;
  readonly solids: readonly Manifold[];
}

/** Least distance between two nets, mm (computed); a pair further apart than the search reads the search. */
export interface NetGap {
  readonly a: string;
  readonly b: string;
  readonly mm: Mm;
}

const boxOf = (m: Manifold): [Vec3, Vec3] => {
  const bb = m.boundingBox();
  return [[bb.min[0]!, bb.min[1]!, bb.min[2]!], [bb.max[0]!, bb.max[1]!, bb.max[2]!]];
};

/**
 * Net to net over every pair, in net order (PIP model.js lines 210 to 223
 * at b137deb): each net's solids unioned, then manifold minGap against
 * every later net out to searchMm, the union the mesh kernel's (D-055).
 * Pairs whose boxes lie further apart than the search skip the solve and
 * read searchMm, as minGap would. Call inside an open mesh scope
 * (withScope); the unions belong to it. A net with no solid is E_REF.
 */
export function netGaps(nets: readonly NetSolids[], searchMm: Mm): NetGap[] {
  if (!(Number.isFinite(searchMm) && searchMm > 0)) {
    throw circuitError({ code: "E_SCHEMA", path: `/constants/${NET_GAP_SEARCH}`, got: searchMm, expected: "a positive length in mm", hint: `set profile constant ${NET_GAP_SEARCH} to a positive length in mm` });
  }
  const unions = nets.map((n, k) => {
    if (n.solids.length === 0) throw circuitError({ code: "E_REF", path: `/nets/${k}`, got: n.net, hint: `net ${n.net} has no conductive solid to measure` });
    return union(n.solids);
  });
  const boxes = unions.map(boxOf);
  const out: NetGap[] = [];
  for (let i = 0; i < nets.length; i++) {
    for (let j = i + 1; j < nets.length; j++) {
      const far = boxGap(boxes[i]!, boxes[j]!) > searchMm;
      out.push({ a: nets[i]!.net, b: nets[j]!.net, mm: far ? searchMm : Math.min(searchMm, unions[i]!.minGap(unions[j]!, searchMm)) });
    }
  }
  return out;
}

/** One connected component of one conductive body. */
export interface NetComponent {
  /** "<body id>#<index>", index in bbox order (min x, then y, then z, then volume). */
  readonly id: string;
  readonly body: string;
  /** Enclosed volume, mm3 (computed). */
  readonly volumeMm3: number;
  /** Axis-aligned bounds in the emitted frame, min then max, mm. */
  readonly bbox: readonly [Vec3, Vec3];
}

/** Components joined by touch: one conducting piece. */
export interface NetPiece {
  /** Component ids in component order. */
  readonly components: readonly string[];
  /** Body ids, in part body order. */
  readonly bodies: readonly string[];
  /** Declared nets of the conductor features behind those bodies, in feature order. */
  readonly nets: readonly string[];
}

/** Where a terminal sits and the piece that contains it. */
export interface Tap {
  /** Port or pad feature id. */
  readonly terminal: string;
  readonly net: string;
  /** Tap point in the emitted frame, mm; null when the net has no lead. */
  readonly at: Vec3 | null;
  /** Index into Extraction.pieces of the piece containing `at`; null when none does. */
  readonly piece: number | null;
}

/**
 * A lead: a centreline end that reaches the plan bounds of its host body
 * (path1d lead rule on built geometry), or a seat tap, where a board pin
 * presses on a printed contact (PortFeature.tap). A tapped net lists its
 * taps first, so its read path starts at the board pin.
 */
export interface Lead {
  readonly conductor: string;
  /** 0 for the first centreline point, 1 for the last; 0 for a seat tap. */
  readonly end: 0 | 1;
  /** Tap point, emitted frame, mm: on the centreline inside the host bounds by half the trace width, or the board pin centre at mid height of its contact. */
  readonly tap: Vec3;
  /** The port whose board pin lands here; absent for a lead on the outline. */
  readonly port?: string;
}

export interface Extraction {
  /** One Net per declared net, in conductor feature order. */
  readonly nets: readonly Net[];
  readonly components: readonly NetComponent[];
  readonly pieces: readonly NetPiece[];
  /** Declared nets in more than one piece: CHK-NET-01 fail naming the pieces (indices into pieces). */
  readonly splits: readonly { readonly net: string; readonly pieces: readonly number[] }[];
  /** Pieces carrying two or more declared nets: a short naming them. */
  readonly shorts: readonly { readonly nets: readonly string[]; readonly piece: number }[];
  /** Pieces carrying no declared net, such as a key cap that closes only when pressed. */
  readonly floating: readonly number[];
  readonly taps: readonly Tap[];
  /** Leads per net, first in feature order. */
  readonly leads: Readonly<Record<string, readonly Lead[]>>;
  /** Body id pairs whose components touch, each pair sorted, list sorted. */
  readonly touching: readonly (readonly [string, string])[];
  /** The touch distance used, mm, the rule and the tier of the profile constant behind it. */
  readonly touch: { readonly mm: Mm; readonly rule: string; readonly tier: Tier };
  /** Net to net over every pair of declared nets, when ExtractInput.gaps is set; else empty. */
  readonly gaps: readonly NetGap[];
  /** The search distance the gaps used and the tier of its profile constant; null when gaps were not measured. */
  readonly gapSearch: { readonly mm: Mm; readonly tier: Tier } | null;
  readonly warnings: readonly BuildWarning[];
}

const isConductor = (f: Part["features"][number]): f is ConductorFeature => f.kind === "conductor";

/** The conductive body a conductor feature generated: the body named after it, else the body it names. */
export function bodyOfConductor(f: ConductorFeature, bodies: readonly Pick<Body, "id" | "role">[]): string | null {
  const own = bodies.find((b) => b.id === f.id);
  if (own !== undefined) return CONDUCTIVE_ROLES.includes(own.role) ? own.id : null;
  const named = bodies.find((b) => b.id === (f.body ?? bodies[0]?.id));
  return named !== undefined && CONDUCTIVE_ROLES.includes(named.role) ? named.id : null;
}

function insideBox(p: Vec2, lo: Vec2, hi: Vec2): boolean {
  return p[0] >= lo[0] && p[0] <= hi[0] && p[1] >= lo[1] && p[1] <= hi[1];
}

/** First parameter t in [0, 1] where a + t (b - a) enters the box, or null (Liang-Barsky). */
function entry(a: Vec2, b: Vec2, lo: Vec2, hi: Vec2): number | null {
  let t0 = 0, t1 = 1;
  for (let k = 0; k < 2; k++) {
    const d = b[k]! - a[k]!;
    for (const [p, q] of [[-d, a[k]! - lo[k]!], [d, hi[k]! - a[k]!]] as const) {
      if (p === 0) {
        if (q < 0) return null;
      } else {
        const r = q / p;
        if (p < 0) t0 = Math.max(t0, r);
        else t1 = Math.min(t1, r);
      }
    }
  }
  return t0 <= t1 ? t0 : null;
}

/** Leads of one conductor: each centreline end within half the width plus the touch distance of its host's plan bounds. */
function leadsOf(f: ConductorFeature, part: ExtractInput["part"], lift: Vec3, touchMm: Mm): Lead[] {
  if (!("centreline" in f.region)) return [];
  const fp = footprint(f);
  if (fp.kind !== "line") return [];
  const host = part.bodies.find((b) => b.id === (f.body ?? part.bodies[0]?.id));
  if (host === undefined) return [];
  const [bmin, bmax] = host.mesh.bbox;
  const pts = fp.pts.map((p): Vec2 => [p[0] - lift[0], p[1] - lift[1]]);
  const lo: Vec2 = [bmin[0], bmin[1]];
  const hi: Vec2 = [bmax[0], bmax[1]];
  const inLo: Vec2 = [bmin[0] + fp.half, bmin[1] + fp.half];
  const inHi: Vec2 = [bmax[0] - fp.half, bmax[1] - fp.half];
  const z = (fp.z[0] + fp.z[1]) / 2 - lift[2];
  const out: Lead[] = [];
  for (const end of [0, 1] as const) {
    const path = end === 0 ? pts : [...pts].reverse();
    const p = path[0];
    if (p === undefined) continue;
    const edge = Math.min(p[0] - lo[0], hi[0] - p[0], p[1] - lo[1], hi[1] - p[1]);
    if (insideBox(p, lo, hi) && edge > fp.half + touchMm) continue;
    let tap: Vec2 | null = null;
    for (let i = 0; i + 1 < path.length && tap === null; i++) {
      const a = path[i]!, b = path[i + 1]!;
      const t = entry(a, b, inLo, inHi);
      if (t !== null) tap = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
    }
    if (tap === null) {
      const a = path[0]!, b = path[1] ?? path[0]!;
      tap = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    }
    out.push({ conductor: f.id, end, tap: [tap[0], tap[1], z] });
  }
  return out;
}

/** Least distance between two axis-aligned boxes, mm; 0 when they meet. */
export const boxGap = (a: readonly [Vec3, Vec3], b: readonly [Vec3, Vec3]): number =>
  Math.max(0, a[0][0] - b[1][0], b[0][0] - a[1][0], a[0][1] - b[1][1], b[0][1] - a[1][1], a[0][2] - b[1][2], b[0][2] - a[1][2]);

/** The touch distance two built conductive solids join at, mm, its rule and the tier of the profile row behind it. */
export interface TouchDistance {
  readonly mm: Mm;
  readonly rule: string;
  readonly tier: Tier;
}

/**
 * The one touch rule (header, Touch distance): minGap at most two stage 6
 * insets plus one grid step. Net extraction joins components by it and the
 * actuated contact test (./actuated.ts, CHK-NET-27) closes a contact by it.
 */
export function touchDistance(profile: ProfileLookup): TouchDistance {
  const inset = profile.constant("3mf.coincidenceInset");
  if (inset.unit !== "mm" || !(inset.value > 0)) {
    throw circuitError({ code: "E_SCHEMA", path: "/constants/3mf.coincidenceInset", got: `${inset.value} ${inset.unit}`, expected: "a positive length in mm", hint: "set profile constant 3mf.coincidenceInset to a positive length in mm" });
  }
  return {
    mm: 2 * inset.value + GRID,
    rule: "minGap <= 2 x 3mf.coincidenceInset + one 1/1024 mm grid step (stage 6 insets both sides)",
    tier: inset.provenance.tier,
  };
}

/**
 * Nets of a built part from its conductive bodies, with per-direction
 * resistance on each net's read path (./resistance.ts). Throws E_REF when a
 * conductive body's mesh is not at hand and E_KERNEL when the kernel
 * refuses a body mesh.
 */
export async function extractNets(input: ExtractInput): Promise<Extraction> {
  const { part, profile } = input;
  const lift: Vec3 = input.itemTransform ?? [0, 0, 0];
  const touch = touchDistance(profile);
  const touchMm: Mm = touch.mm;

  const conductive = part.bodies.filter((b) => CONDUCTIVE_ROLES.includes(b.role));
  const conductors = part.features.filter(isConductor);
  const netsOfBody = new Map<string, string[]>(conductive.map((b) => [b.id, []]));
  for (const f of conductors) {
    const b = bodyOfConductor(f, part.bodies);
    if (b === null) continue;
    const list = netsOfBody.get(b);
    if (list !== undefined && !list.includes(f.net)) list.push(f.net);
  }

  const leads: Record<string, Lead[]> = {};
  for (const p of seatTaps(part.features).values()) {
    const t = p.tap!;
    // Probed at mid height of the contact: the layer snap may move its face, and
    // whether the pin reaches that face is CHK-NET-46's measure, not the piece's.
    const c = conductors.find((f) => f.id === t.conductor)!;
    const z = footprint(c).z;
    (leads[p.net] ??= []).push({ conductor: t.conductor, end: 0, tap: [t.at[0] - lift[0], t.at[1] - lift[1], (z[0] + z[1]) / 2 - lift[2]], port: p.id });
  }
  for (const f of conductors) (leads[f.net] ??= []).push(...leadsOf(f, part, lift, touchMm));
  const terminals = part.features.filter((f): f is PortFeature | PadFeature => f.kind === "port" || f.kind === "pad");
  // A tapped port is tested at its own pin; any other terminal at its net's first lead.
  const tapAt = (t: PortFeature | PadFeature): Vec3 | null =>
    (t.kind === "port" ? leads[t.net]?.find((l) => l.port === t.id)?.tap : undefined) ?? leads[t.net]?.[0]?.tap ?? null;

  const featureNetsOf = (): string[] => {
    const out: string[] = [];
    for (const f of conductors) if (!out.includes(f.net)) out.push(f.net);
    return out;
  };
  const searchRow = input.gaps === true ? profile.constant(NET_GAP_SEARCH) : null;
  const search = searchRow === null ? null : { mm: searchRow.unit === "mm" ? searchRow.value : Number.NaN, tier: searchRow.provenance.tier };
  const wasm = await loadManifold();
  const geo = withScope((scope) => {
    const comps: { readonly c: NetComponent; readonly m: ReturnType<typeof toManifold> }[] = [];
    conductive.forEach((b) => {
      const at = part.bodies.indexOf(b);
      const data = input.mesh(b.mesh);
      if (data === undefined) {
        throw circuitError({ code: "E_REF", path: `/bodies/${at}/mesh`, got: b.mesh.uri, hint: `body ${b.id}: its mesh is not at hand; build the part before extracting nets` });
      }
      const pieces = toManifold(wasm, scope, data, `/bodies/${at}`).decompose().map((m) => {
        const bb = m.boundingBox();
        return { m, bbox: [[bb.min[0]!, bb.min[1]!, bb.min[2]!], [bb.max[0]!, bb.max[1]!, bb.max[2]!]] as [Vec3, Vec3], volumeMm3: m.volume() };
      });
      pieces.sort((p, q) => p.bbox[0][0] - q.bbox[0][0] || p.bbox[0][1] - q.bbox[0][1] || p.bbox[0][2] - q.bbox[0][2] || p.volumeMm3 - q.volumeMm3);
      pieces.forEach((p, k) => comps.push({ c: { id: `${b.id}#${k}`, body: b.id, volumeMm3: p.volumeMm3, bbox: p.bbox }, m: p.m }));
    });

    // Union-find over components (BOSS netCheck), joined on manifold minGap (PIP model.js:219).
    const parent = comps.map((_, i) => i);
    const find = (i: number): number => {
      while (parent[i] !== i) {
        parent[i] = parent[parent[i]!]!;
        i = parent[i]!;
      }
      return i;
    };
    const touching = new Set<string>();
    for (let i = 0; i < comps.length; i++) {
      for (let j = i + 1; j < comps.length; j++) {
        const a = comps[i]!, b = comps[j]!;
        if (boxGap(a.c.bbox, b.c.bbox) > touchMm) continue;
        if (a.m.minGap(b.m, 2 * touchMm) > touchMm) continue;
        const ri = find(i), rj = find(j);
        if (ri !== rj) parent[Math.max(ri, rj)] = Math.min(ri, rj);
        if (a.c.body !== b.c.body) touching.add(JSON.stringify([a.c.body, b.c.body].sort()));
      }
    }

    // Taps: the component whose solid meets a small cube at the tap point (BOSS netCheck taps, by containment).
    const contains = (p: Vec3): number | null => {
      const probe = wasm.Manifold.cube([TAP_CUBE, TAP_CUBE, TAP_CUBE], true).translate([p[0], p[1], p[2]]);
      const k = comps.findIndex((x) => boxGap(x.c.bbox, [p, p]) === 0 && x.m.intersect(probe).volume() > 0);
      return k < 0 ? null : k;
    };
    const tapComp = terminals.map((t) => {
      const at = tapAt(t);
      return at === null ? null : contains(at);
    });
    const gaps = search === null ? [] : netGaps(featureNetsOf().map((net) => ({
      net, solids: comps.filter((x) => netsOfBody.get(x.c.body)?.includes(net) === true).map((x) => x.m),
    })), search.mm);
    return {
      gaps,
      components: comps.map((x) => x.c),
      roots: comps.map((_, i) => find(i)),
      touching: [...touching].sort().map((s) => JSON.parse(s) as [string, string]),
      tapComp,
    };
  });

  // Pieces in order of their first component.
  const rootOrder: number[] = [];
  for (const r of geo.roots) if (!rootOrder.includes(r)) rootOrder.push(r);
  const bodyOrder = part.bodies.map((b) => b.id);
  const featureNets = featureNetsOf();
  const pieces: NetPiece[] = rootOrder.map((r) => {
    const members = geo.components.filter((_, i) => geo.roots[i] === r);
    const bodies = bodyOrder.filter((id) => members.some((c) => c.body === id));
    const nets = featureNets.filter((n) => bodies.some((b) => netsOfBody.get(b)?.includes(n)));
    return { components: members.map((c) => c.id), bodies, nets };
  });
  const pieceOfComp = (k: number | null): number | null => (k === null ? null : rootOrder.indexOf(geo.roots[k]!));

  const splits = featureNets
    .map((net) => ({ net, pieces: pieces.flatMap((p, i) => (p.nets.includes(net) ? [i] : [])) }))
    .filter((s) => s.pieces.length > 1);
  const shorts = pieces.flatMap((p, i) => (p.nets.length > 1 ? [{ nets: p.nets, piece: i }] : []));
  const floating = pieces.flatMap((p, i) => (p.nets.length === 0 ? [i] : []));
  const taps: Tap[] = terminals.map((t, i) => ({
    terminal: t.id, net: t.net, at: tapAt(t), piece: pieceOfComp(geo.tapComp[i] ?? null),
  }));

  const warnings: BuildWarning[] = [];
  for (const s of splits) warnings.push({ code: "NET_SPLIT", text: `net ${s.net} extracts in ${s.pieces.length} pieces: ${s.pieces.map((i) => pieces[i]!.components.join(" + ")).join(", ")}` });
  for (const s of shorts) warnings.push({ code: "NET_SHORT", text: `nets ${s.nets.join(" and ")} extract as one piece: ${pieces[s.piece]!.components.join(" + ")}` });
  for (const t of taps) {
    if (t.at === null) warnings.push({ code: "TAP_NO_LEAD", text: `${t.terminal}: net ${t.net} has no centreline end at its body edge to tap` });
    else if (t.piece === null || !pieces[t.piece]!.nets.includes(t.net)) {
      warnings.push({ code: "TAP_MISS", text: `${t.terminal}: the tap at [${t.at.map((v) => v.toFixed(3)).join(", ")}] mm lies in no piece of net ${t.net}` });
    }
  }

  const nets = featureNets.map((id) => netRecord({
    id, part, profile, leads: leads[id] ?? [], touching: geo.touching, bodiesOf: (b) => netsOfBody.get(b)?.includes(id) ?? false,
  }));
  for (const n of nets) {
    if (n.resistance.length === 0) warnings.push({ code: "NO_READ_PATH", text: `net ${n.id}: no chain of touching conductors from its lead to its far end` });
  }
  return { nets, components: geo.components, pieces, splits, shorts, floating, taps, leads, touching: geo.touching, touch, gaps: geo.gaps, gapSearch: search, warnings };
}
