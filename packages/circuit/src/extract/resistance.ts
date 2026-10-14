// Per-direction resistance of an extracted net (M05-T04, D-020, D-081).
//
// Each conductor on the read path is one leg through path1d legOf: a
// centreline trace reads the row's `along` value over its centreline length
// at width x t, a path region (a post or column) reads `through` over t at
// its region area, the PIP Rpost (pip-controller src/model.js lines 383 to
// 392). legOf calls profile sectionResistance, the one home of R = rho L /
// (w t) (spec/profile.ts SectionResistance), and reads the row through
// ProfileLookup so the read is recorded; nothing here restates the formula.
// Every leg carries its row's tier; Net.tier is the lowest of them.
//
// Read path: from the net's lead (its first centreline end at the host
// body's plan bounds, ./nets.ts) along the shortest chain of touching
// conductors to the conductor a ContactFeature names, else to another lead,
// else the lead conductor alone (one trace end to end, the BOSS wire).
// Touching is geometric: two conductors touch when the built components of
// their bodies joined in extraction.
//
// A tapped net (a board pin pressed on a seat contact, PortFeature.tap)
// starts at the tap. With no contact its far end is the conductor the most
// touching steps away, the worst case a source resistance must cover (an
// ADC wiper lead to its terminal). With several contacts each gets its own
// pair, tap to contact, so a press on any key prices its own return leg
// instead of the first key's (a branched net once had one pair, INES-02).
//
// Left for later cards, so the fields say so instead of guessing:
// - capToGndPf, couplingPf: the per-mm rule needs the receiving pin's
//   inputCap from Chase.hookup, M05-T05; written 0 and {} here.
// - solved: the voxel solve (spec/circuit.ts VoxelSolve) is not built;
//   solved and solvedOverPreview are null and bulkOhm is the preview.
// - pairs other than the read path on a branched net.

import type {
  ConductorFeature, ContactElement, ContactFeature, ContactKind, DirectionalResistance, Net, NetResistance,
  PadFeature, Part, PortFeature, ProfileLookup, Tier,
} from "@hackbuild/spec";
import { lowestTier, qualifyRow } from "@hackbuild/spec";
import { legOf, type PathLeg } from "../path1d.js";
import { bodyOfConductor, type Lead } from "./nets.js";

/** Pad kind to the series contact it makes (spec/profile.ts ContactKind); screw, peg and tape press on the pad. */
const PAD_CONTACT: Readonly<Record<PadFeature["for"], ContactKind>> = {
  solder: "solder", clip: "clip", screw: "press", peg: "press", tape: "press",
};

/** The read path of one net: terminal ids, conductor chain and its legs. */
export interface ReadPath {
  readonly terminals: readonly [from: string, to: string];
  /** Conductor feature ids, lead first. */
  readonly chain: readonly string[];
  readonly legs: readonly PathLeg[];
}

export interface NetInput {
  readonly id: string;
  readonly part: Pick<Part, "bodies" | "features">;
  readonly profile: ProfileLookup;
  readonly leads: readonly Lead[];
  /** Body id pairs whose components touch (Extraction.touching). */
  readonly touching: readonly (readonly [string, string])[];
  /** True when a conductive body carries this net. */
  readonly bodiesOf: (bodyId: string) => boolean;
}

/** Shortest chain of touching conductors from `from` to `to`, neighbours in feature order; null when apart. */
function chainBetween(ids: readonly string[], from: string, to: string, touches: (a: string, b: string) => boolean): string[] | null {
  const prev = new Map<string, string | null>([[from, null]]);
  const queue = [from];
  while (queue.length > 0) {
    const at = queue.shift() as string;
    if (at === to) {
      const chain: string[] = [];
      for (let c: string | null = at; c !== null; c = prev.get(c) ?? null) chain.push(c);
      return chain.reverse();
    }
    for (const next of ids) {
      if (!prev.has(next) && touches(at, next)) {
        prev.set(next, at);
        queue.push(next);
      }
    }
  }
  return null;
}

/** The conductor the most touching steps from `from` (the last in feature order on a tie); `from` when nothing touches it. */
function farthest(ids: readonly string[], from: string, touches: (a: string, b: string) => boolean): string {
  const depth = new Map<string, number>([[from, 0]]);
  const queue = [from];
  while (queue.length > 0) {
    const at = queue.shift() as string;
    for (const next of ids) {
      if (!depth.has(next) && touches(at, next)) {
        depth.set(next, (depth.get(at) as number) + 1);
        queue.push(next);
      }
    }
  }
  let best = from;
  for (const id of ids) if ((depth.get(id) ?? -1) >= (depth.get(best) as number)) best = id;
  return best;
}

/** The touch test of one net's conductors: same conductive body, or bodies whose components joined in extraction. */
function touchesOf(input: NetInput, conductors: readonly ConductorFeature[]): (a: string, b: string) => boolean {
  const bodyOf = new Map(conductors.map((f) => [f.id, bodyOfConductor(f, input.part.bodies)] as const));
  const pairs = new Set(input.touching.map(([a, b]) => `${a}\u0000${b}`));
  return (a, b) => {
    const ba = bodyOf.get(a), bb = bodyOf.get(b);
    if (ba === null || bb === null || ba === undefined || bb === undefined) return false;
    return ba === bb || pairs.has(`${ba}\u0000${bb}`) || pairs.has(`${bb}\u0000${ba}`);
  };
}

/** The read path of a net to `contact` (else its first contact), or null when its far end is not reachable from its lead. */
export function readPath(input: NetInput, contactId?: string): ReadPath | null {
  const { id, part, profile } = input;
  const conductors = part.features.filter((f): f is ConductorFeature => f.kind === "conductor" && f.net === id);
  const ids = conductors.map((f) => f.id);
  const start = input.leads[0]?.conductor ?? ids[0];
  if (start === undefined) return null;
  const contact = part.features.find((f): f is ContactFeature =>
    f.kind === "contact" && (contactId === undefined || f.id === contactId) && (ids.includes(f.a) || ids.includes(f.b)));
  const tapPort = input.leads[0]?.port;
  const touches = touchesOf(input, conductors);
  // A second lead, preferring one on another conductor; the far end of a lone trace is its own other end.
  const otherLead = tapPort === undefined ? input.leads.slice(1).find((l) => l.conductor !== start) ?? input.leads[1] : undefined;
  const finish = contact !== undefined ? (ids.includes(contact.a) ? contact.a : contact.b)
    : tapPort !== undefined ? farthest(ids, start, touches) : otherLead?.conductor ?? start;

  const chain = chainBetween(ids, start, finish, touches);
  if (chain === null) return null;

  const terms = part.features.filter((f): f is PortFeature | PadFeature => (f.kind === "port" || f.kind === "pad") && f.net === id);
  const from = tapPort ?? terms.find((f) => f.kind === "port")?.id ?? terms[0]?.id ?? start;
  const to = contact?.id ?? (otherLead !== undefined ? terms.find((f) => f.id !== from)?.id : undefined) ?? finish;
  const legs = chain.map((c) => {
    const f = conductors.find((x) => x.id === c) as ConductorFeature;
    return legOf(f, profile);
  });
  return { terminals: [from, to], chain, legs };
}

/** The spec Net record of one extracted net. */
export function netRecord(input: NetInput): Net {
  const { id, part, profile } = input;
  const conductors = part.features.filter((f): f is ConductorFeature => f.kind === "conductor" && f.net === id);
  const terminals = part.features.filter((f): f is PortFeature | PadFeature => (f.kind === "port" || f.kind === "pad") && f.net === id);
  const bodies = part.bodies.filter((b) => input.bodiesOf(b.id)).map((b) => b.id);
  const path = readPath(input);

  const resistance: NetResistance[] = [];
  const pairOf = (p: ReadPath): NetResistance => ({
    terminals: p.terminals,
    preview: {
      method: "path-1d",
      segments: p.legs.map((l): DirectionalResistance => ({ direction: l.direction, lengthMm: l.lengthMm, areaMm2: l.areaMm2, ohmCm: l.ohmCm, ohm: l.ohm })),
      ohm: p.legs.reduce((s, l) => s + l.ohm, 0),
    },
    solved: null,
    solvedOverPreview: null,
  });
  if (path !== null) {
    resistance.push(pairOf(path));
    // A tapped net prices one pair per further contact on it, tap to contact.
    if (input.leads[0]?.port !== undefined) {
      const ids = new Set(conductors.map((f) => f.id));
      for (const c of part.features) {
        if (c.kind !== "contact" || c.id === path.terminals[1] || !(ids.has(c.a) || ids.has(c.b))) continue;
        const more = readPath(input, c.id);
        if (more !== null) resistance.push(pairOf(more));
      }
    }
  }

  // Series contacts in path order: the pads, then every material interface on the chain.
  const contacts: ContactElement[] = [];
  const tiers: Tier[] = [];
  const priced = (at: string, a: string, b: string, kind: ContactKind): ContactElement => {
    const row = profile.contact(a, b, kind);
    if (row === null) return { at, kind, row: null, ohm: null, qualifier: "unknown" };
    tiers.push(row.provenance.tier);
    return { at, kind, row: row.id, ohm: row.ohm, qualifier: qualifyRow(row.provenance.tier).qualifier };
  };
  const material = conductors[0]?.material ?? "";
  for (const t of terminals) if (t.kind === "pad") contacts.push(priced(t.id, material, "metal", PAD_CONTACT[t.for]));
  // A seat tap is a board pin pressed on the tapped conductor: a press contact on that conductor's material.
  for (const t of terminals) {
    if (t.kind !== "port" || t.tap === undefined) continue;
    const on = conductors.find((f) => f.id === t.tap!.conductor);
    contacts.push(priced(t.id, on?.material ?? material, "metal", "press"));
  }
  if (path !== null) {
    for (let i = 0; i + 1 < path.chain.length; i++) {
      const a = conductors.find((f) => f.id === path.chain[i]);
      const b = conductors.find((f) => f.id === path.chain[i + 1]);
      if (a !== undefined && b !== undefined && a.material !== b.material) contacts.push(priced(`${a.id}|${b.id}`, a.material, b.material, "printed-interface"));
    }
  }

  // Every conductor on the net reads its row, so the tier covers the whole net, not only the path.
  for (const f of conductors) tiers.push(legOf(f, profile).tier);
  // Never empty: a net is extracted only from the conductor features that declare it.
  const tier = lowestTier(tiers) as Tier;
  const bulkOhm = resistance[0]?.preview.ohm ?? 0;
  const lo = contacts.reduce((s, c) => s + (c.ohm?.[0] ?? 0), 0);
  const hi = contacts.reduce((s, c) => s + (c.ohm?.[1] ?? 0), 0);
  const unpricedContacts = contacts.filter((c) => c.ohm === null).map((c) => c.at);
  return {
    id,
    conductors: conductors.map((f) => f.id),
    bodies,
    terminals: terminals.map((t) => t.id),
    resistance,
    bulkOhm,
    contacts,
    totalOhm: [bulkOhm + lo, bulkOhm + hi],
    unpricedContacts,
    capToGndPf: 0,
    couplingPf: {},
    capMethod: "pip-per-mm",
    tier,
    qualifier: path === null || unpricedContacts.length > 0 ? "unknown" : "computed",
  };
}
