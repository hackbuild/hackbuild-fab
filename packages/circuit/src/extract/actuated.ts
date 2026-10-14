// The actuated state of a built part (M05-T19, CHK-NET-26 and CHK-NET-27).
//
// Port of the two FEELER net rules (STYLUS, lineage feeler.bench/thinpot-16-apart,
// feeler_thinpot.html): Ctx.apartExcept (line 1071) and its articulation
// check (lines 1180 to 1190) rebuild the union find with one part removed
// and require the named taps to fall onto distinct nets; makesContact (line
// 1102) only records a gap, and the source note's idea 2
// (benches-conductive-a.md line 665) makes it executable: move the moving
// part to its actuated state and run the touch test (slabsTouch, line 967)
// against its targets. Here the union find is net extraction (./nets.ts)
// over the built conductive bodies, and the touch is its one touch rule
// (touchDistance), so a press, a net and a short read the same distance.
//
// A press is the contact's declared actuator body moved along the declared
// axis by the contact's gap: a rigid translation of that body's mesh, no
// physics step. A contact that declares no actuator or axis is not moved,
// and says so.

import type { ContactFeature, ConductorFeature, MeshRef, Mm, Part, ProfileLookup, Vec3 } from "@hackbuild/spec";
import { loadManifold, toManifold, withScope, type MeshData } from "@hackbuild/mesh";
import { circuitError } from "../path1d.js";
import { bodyOfConductor, boxGap, extractNets, touchDistance, type Extraction, type TouchDistance } from "./nets.js";

/** A contact's press: its actuator body moved by delta, |delta| = travelMm along the declared axis. */
export interface Press {
  readonly contact: string;
  readonly body: string;
  readonly axis: Vec3;
  readonly travelMm: Mm;
  readonly delta: Vec3;
}

/** The press a contact declares, or the field it lacks. */
export function pressOf(c: ContactFeature): Press | { readonly reason: string } {
  if (c.actuator === undefined) return { reason: `contact ${c.id} declares no actuator body to move` };
  if (c.axis === undefined) return { reason: `contact ${c.id} declares no press axis` };
  if (c.gap === undefined) return { reason: `contact ${c.id} declares no gap, the travel to contact` };
  const n = Math.hypot(c.axis[0], c.axis[1], c.axis[2]);
  if (!(n > 0)) throw circuitError({ code: "E_SCHEMA", path: `/features/${c.id}/axis`, got: c.axis, expected: "a non-zero direction", hint: `contact ${c.id}: the press axis has no length` });
  const axis: Vec3 = [c.axis[0] / n, c.axis[1] / n, c.axis[2] / n];
  return { contact: c.id, body: c.actuator, axis, travelMm: c.gap, delta: [axis[0] * c.gap, axis[1] * c.gap, axis[2] * c.gap] };
}

/** A mesh translated by d, mm. */
export function movedMesh(m: MeshData, d: Vec3): MeshData {
  const p = Float64Array.from(m.positions);
  for (let i = 0; i < p.length; i += 3) {
    p[i] = p[i]! + d[0];
    p[i + 1] = p[i + 1]! + d[1];
    p[i + 2] = p[i + 2]! + d[2];
  }
  return { positions: p, triangles: m.triangles };
}

export interface ActuatedInput {
  /** A built part: Part IR with every conductive body's mesh resolvable. */
  readonly part: Pick<Part, "id" | "bodies" | "features">;
  readonly mesh: (ref: MeshRef) => MeshData | undefined;
  readonly profile: ProfileLookup;
  /** Stage 7 lift, as ExtractInput.itemTransform. */
  readonly itemTransform?: Vec3;
}

/** One terminal of a pressed contact: its conductor, the body that carries it, and the closest approach of the moved actuator, mm (computed). */
export interface TerminalApproach {
  readonly conductor: string;
  readonly body: string;
  readonly mm: Mm;
}

export interface ContactTouch {
  readonly press: Press;
  readonly touch: TouchDistance;
  /** Terminal a then terminal b. */
  readonly terminals: readonly [TerminalApproach, TerminalApproach];
  /** True when the moved actuator touches both terminals. */
  readonly closes: boolean;
}

const meshOf = (input: ActuatedInput, body: string, at: string): MeshData => {
  const b = input.part.bodies.find((x) => x.id === body);
  if (b === undefined) throw circuitError({ code: "E_REF", path: at, got: body, hint: `no body ${body} in part ${input.part.id}` });
  const m = input.mesh(b.mesh);
  if (m === undefined) throw circuitError({ code: "E_REF", path: at, got: b.mesh.uri, hint: `body ${body}: its mesh is not at hand; build the part first` });
  return m;
};

/**
 * Move a contact's actuator by its press and measure its closest approach to
 * the body of each terminal conductor; it closes when both are at most the
 * touch distance (FEELER slabsTouch on the moved part).
 */
export async function contactTouch(input: ActuatedInput & { readonly contact: ContactFeature }): Promise<ContactTouch | { readonly reason: string }> {
  const press = pressOf(input.contact);
  if ("reason" in press) return press;
  const touch = touchDistance(input.profile);
  const at = `/features/${input.contact.id}`;
  const conductorBody = (id: string, side: "a" | "b"): { conductor: string; body: string } | { reason: string } => {
    const f = input.part.features.find((x): x is ConductorFeature => x.kind === "conductor" && x.id === id);
    if (f === undefined) return { reason: `contact ${input.contact.id} terminal ${side} names ${id}, no conductor feature` };
    const body = bodyOfConductor(f, input.part.bodies);
    if (body === null) return { reason: `conductor ${id} has no conductive body in the build` };
    return { conductor: id, body };
  };
  const a = conductorBody(input.contact.a, "a");
  if ("reason" in a) return a;
  const b = conductorBody(input.contact.b, "b");
  if ("reason" in b) return b;
  const moved = movedMesh(meshOf(input, press.body, `${at}/actuator`), press.delta);
  const ma = meshOf(input, a.body, `${at}/a`);
  const mb = meshOf(input, b.body, `${at}/b`);
  const wasm = await loadManifold();
  const [da, db] = withScope((scope) => {
    const act = toManifold(wasm, scope, moved, `${at}/actuator`);
    const box = (m: ReturnType<typeof toManifold>): [Vec3, Vec3] => {
      const bb = m.boundingBox();
      return [[bb.min[0]!, bb.min[1]!, bb.min[2]!], [bb.max[0]!, bb.max[1]!, bb.max[2]!]];
    };
    const ab = box(act);
    // Search out to the diagonal of the two boxes' union, which no two points of them exceed.
    const reach = (other: ReturnType<typeof toManifold>): Mm => {
      const ob = box(other);
      const span = [0, 1, 2].map((k) => Math.max(ab[1][k]!, ob[1][k]!) - Math.min(ab[0][k]!, ob[0][k]!));
      const search = Math.hypot(span[0]!, span[1]!, span[2]!);
      return boxGap(ab, ob) > search ? search : act.minGap(other, search);
    };
    return [reach(toManifold(wasm, scope, ma, `${at}/a`)), reach(toManifold(wasm, scope, mb, `${at}/b`))] as const;
  });
  const terminals: [TerminalApproach, TerminalApproach] = [{ ...a, mm: da }, { ...b, mm: db }];
  return { press, touch, terminals, closes: da <= touch.mm && db <= touch.mm };
}

/** One net graph of the apartExcept test: which named nets share a piece. */
export interface NetGraphState {
  /** Groups of named nets that share a piece, each in the order named; a net alone is not listed. */
  readonly shared: readonly (readonly string[])[];
  /** Body pairs that touch across two named nets, each pair sorted, list sorted. */
  readonly joiningBodies: readonly (readonly [string, string])[];
  /** Bodies of the pieces that carry two or more named nets, in part body order. */
  readonly pieceBodies: readonly string[];
}

export interface ApartExcept {
  readonly nets: readonly string[];
  readonly cut: string;
  /** Contacts pressed for the actuated state, each with the body it moved. */
  readonly presses: readonly Press[];
  /** Contacts left at rest, with why. */
  readonly unpressed: readonly { readonly contact: string; readonly reason: string }[];
  readonly touch: TouchDistance;
  /** Every contact pressed, the cut body in place. */
  readonly actuated: NetGraphState;
  /** Every contact pressed, the cut body removed. */
  readonly withoutCut: NetGraphState;
  /** All named nets in one piece while actuated. */
  readonly joined: boolean;
  /** No two named nets in one piece once the cut body is removed. */
  readonly apart: boolean;
}

function graphState(ex: Extraction, nets: readonly string[], bodyOrder: readonly string[]): NetGraphState {
  const shared = ex.pieces.map((p) => nets.filter((n) => p.nets.includes(n))).filter((g) => g.length > 1);
  const pieceBodies = new Set(ex.pieces.filter((p) => nets.filter((n) => p.nets.includes(n)).length > 1).flatMap((p) => p.bodies));
  const named = (body: string): string[] => nets.filter((n) => ex.nets.find((x) => x.id === n)?.bodies.includes(body) === true);
  const joining = ex.touching.filter(([x, y]) => {
    const nx = named(x);
    const ny = named(y);
    return nx.length > 0 && ny.length > 0 && (nx.some((n) => !ny.includes(n)) || ny.some((n) => !nx.includes(n)));
  });
  return { shared, joiningBodies: joining, pieceBodies: bodyOrder.filter((b) => pieceBodies.has(b)) };
}

/**
 * FEELER apartExcept on the built part: press every contact that declares
 * its actuator, extract the nets, and require the named nets in one piece;
 * remove the cut body, extract again, and require no two of them in one
 * piece. A cut that names no body is E_REF.
 */
export async function apartExcept(input: ActuatedInput & { readonly nets: readonly string[]; readonly cut: string }): Promise<ApartExcept> {
  const { part } = input;
  if (!part.bodies.some((b) => b.id === input.cut)) {
    throw circuitError({ code: "E_REF", path: "/assertions/apartExcept/cut", got: input.cut, hint: `apartExcept cuts body ${input.cut}, which part ${part.id} does not have` });
  }
  const presses: Press[] = [];
  const unpressed: { contact: string; reason: string }[] = [];
  for (const f of part.features) {
    if (f.kind !== "contact") continue;
    const p = pressOf(f);
    if ("reason" in p) unpressed.push({ contact: f.id, reason: p.reason });
    else presses.push(p);
  }
  // A pressed body gets its own mesh ref, so a twin body with the same mesh hash stays at rest.
  const moved = new Map<string, MeshData>();
  const bodies = part.bodies.map((b) => {
    const p = presses.find((x) => x.body === b.id);
    if (p === undefined) return b;
    const uri = `${b.mesh.uri}#pressed-${b.id}` as MeshRef["uri"];
    moved.set(uri, movedMesh(meshOf(input, b.id, `/bodies/${b.id}`), p.delta));
    return { ...b, mesh: { ...b.mesh, uri } };
  });
  const mesh = (r: MeshRef): MeshData | undefined => moved.get(r.uri) ?? input.mesh(r);
  const lift = input.itemTransform === undefined ? {} : { itemTransform: input.itemTransform };
  const order = part.bodies.map((b) => b.id);
  const on = await extractNets({ part: { ...part, bodies }, mesh, profile: input.profile, ...lift });
  const off = await extractNets({ part: { ...part, bodies: bodies.filter((b) => b.id !== input.cut) }, mesh, profile: input.profile, ...lift });
  const actuated = graphState(on, input.nets, order);
  const withoutCut = graphState(off, input.nets, order);
  return {
    nets: input.nets, cut: input.cut, presses, unpressed, touch: on.touch, actuated, withoutCut,
    joined: actuated.shared.some((g) => g.length === input.nets.length),
    apart: withoutCut.shared.length === 0,
  };
}
