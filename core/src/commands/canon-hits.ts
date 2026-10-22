// The ranking mech.find and arch.find share (M06-T11 steps 1 and 3): the
// query splits into lowercase words, each word scores against the entry's
// id, its family and its text fields, and runnable entries (typed or
// proven) rank before stub, candidate and unproven ones whatever their
// score. Ties fall back to id order, so the answer is a pure function of
// the registry.

/** Function words name no behaviour and sit inside other words ("in" in "print"), so a query drops them. */
const STOP = new Set(["a", "an", "and", "as", "at", "by", "for", "from", "in", "into", "is", "it", "of", "on", "or", "the", "to", "with"]);

/** Words of a query: lowercase, split on anything that is not a letter or digit, function words dropped. */
export function words(q: string): string[] {
  return q.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w !== "" && !STOP.has(w));
}

/** Most hits one search returns; the rest are counted in truncated.omitted. */
export const HIT_CAP = 10;

/** What one entry offers the scorer. */
export interface Scored {
  readonly id: string;
  readonly family: string;
  /** Text the entry states: governs, senses, emits, limits, provenance. */
  readonly text: readonly string[];
  /** True for typed mechanisms and proven archetypes. */
  readonly runs: boolean;
}

/** Where one query word starts a word of an entry: its id, its family, its text. */
export type HitField = "id" | "family" | "text";

/** Each query word that hits the entry, with the fields it starts a word of; a word that hits nothing is left out. */
export function wordHits(e: Scored, ws: readonly string[]): { readonly word: string; readonly fields: readonly HitField[] }[] {
  const tokens: Readonly<Record<HitField, readonly string[]>> = {
    id: e.id.toLowerCase().split(/[^a-z0-9]+/),
    family: e.family.toLowerCase().split(/[^a-z0-9]+/),
    text: words(e.text.join(" ")),
  };
  return ws.flatMap((w) => {
    // A word matches a whole word of the entry or its start, so "detent" finds "detents" and "in" finds nothing.
    const fields = (["id", "family", "text"] as const).filter((f) => tokens[f].some((t) => t.startsWith(w)));
    return fields.length === 0 ? [] : [{ word: w, fields }];
  });
}

/** Points a hit in each field scores. */
const FIELD_POINTS: Readonly<Record<HitField, number>> = { id: 3, family: 2, text: 1 };

/**
 * Score of one entry: 3 per query word starting a word of the id, 2 when
 * a word starts a word of the family, 1 per word starting a word of the
 * entry's text. 0 means no hit.
 */
export function score(e: Scored, ws: readonly string[]): number {
  return wordHits(e, ws).reduce((s, h) => s + h.fields.reduce((n, f) => n + FIELD_POINTS[f], 0), 0);
}

/** Entries with a positive score, runnable first, then by score, then by id. */
export function rank<T extends Scored>(entries: readonly T[], query: string): T[] {
  const ws = words(query);
  return entries
    .map((e) => ({ e, s: score(e, ws) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => Number(b.e.runs) - Number(a.e.runs) || b.s - a.s || (a.e.id < b.e.id ? -1 : a.e.id > b.e.id ? 1 : 0))
    .map((x) => x.e);
}

export const ZERO = { pass: 0, warn: 0, fail: 0, skip: 0 } as const;

/** The first HIT_CAP hits and, when more matched, the CommandResult truncated field naming how many were left out. */
export function capped<T>(hits: readonly T[]): { readonly hits: T[]; readonly truncated?: { readonly omitted: number; readonly cursor: string } } {
  if (hits.length <= HIT_CAP) return { hits: [...hits] };
  // No canon search takes a cursor (spec CommandIO); the cursor names the narrowing a caller adds instead.
  return { hits: hits.slice(0, HIT_CAP), truncated: { omitted: hits.length - HIT_CAP, cursor: "narrow behaviour, family or process" } };
}
