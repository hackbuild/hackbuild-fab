// Part IR reads the viewer draws from and the bench resolves against: which
// features a body answers to, and which net a body carries. They live here so
// the viewer imports nothing from bench-core.

import type { Body, Feature, Part } from "@hackbuild/spec";

/** The Part IR fields locate reads. */
export type LocatePart = Pick<Part, "id" | "bodies" | "features">;

export type Fields = Readonly<Record<string, unknown>>;

const HOST = "body";

function stringsOf(f: Fields, skip: ReadonlySet<string>): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(f)) {
    if (skip.has(k)) continue;
    if (typeof v === "string") out.push(v);
    else if (Array.isArray(v)) for (const x of v) if (typeof x === "string") out.push(x);
  }
  return out;
}

const SKIP_OWN = new Set(["id", "kind", HOST]);

/** Body ids a feature resolves to, in Part.bodies order. */
export function bodiesOfFeature(part: LocatePart, featureId: string): string[] {
  const bodies = new Set(part.bodies.map((b) => b.id));
  const byId = new Map(part.features.map((f) => [f.id, f as unknown as Fields]));
  const f = byId.get(featureId);
  if (f === undefined) return bodies.has(featureId) ? [featureId] : [];
  const hit = new Set<string>();
  if (bodies.has(featureId)) hit.add(featureId);
  for (const s of stringsOf(f, SKIP_OWN)) if (bodies.has(s)) hit.add(s);
  // A string naming another feature that is not a body: that feature's own body, one level.
  for (const s of stringsOf(f, SKIP_OWN)) {
    const g = byId.get(s);
    if (g === undefined || s === featureId) continue;
    for (const t of stringsOf(g, SKIP_OWN)) if (bodies.has(t)) hit.add(t);
  }
  if (hit.size === 0) {
    const host = f[HOST];
    if (typeof host === "string" && bodies.has(host)) hit.add(host);
  }
  return part.bodies.map((b) => b.id).filter((id) => hit.has(id));
}

/** Feature ids that resolve to a body, the body's own feature first (the viewer's pick). */
export function featuresOfBody(part: LocatePart, bodyId: string): string[] {
  const own = part.features.filter((f) => f.id === bodyId).map((f) => f.id);
  const rest = part.features.filter((f) => f.id !== bodyId && bodiesOfFeature(part, f.id).includes(bodyId)).map((f) => f.id);
  return [...own, ...rest];
}

/** Net per body: a feature whose id is the body's and that names a net. */
export function bodyNets(bodies: readonly Pick<Body, "id">[], features: readonly Feature[]): Map<string, string> {
  const ids = new Set(bodies.map((b) => b.id));
  const out = new Map<string, string>();
  for (const f of features) {
    const net = (f as unknown as Record<string, unknown>)["net"];
    if (typeof net === "string" && ids.has(f.id)) out.set(f.id, net);
  }
  return out;
}
