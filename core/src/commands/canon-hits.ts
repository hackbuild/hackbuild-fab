// The ranking mech.find and arch.find share (M06-T11 steps 1 and 3): the
// query splits into lowercase words, each word scores against the entry's
// id, its family and its text fields, and runnable entries (typed or
// proven) rank before stub, candidate and unproven ones whatever their
// score. Ties fall back to id order, so the answer is a pure function of
// the registry.

/** Words of a query: lowercase, split on anything that is not a letter or digit. */
export function words(q: string): string[] {
  return q.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w !== "");
}

/** What one entry offers the scorer. */
export interface Scored {
  readonly id: string;
  readonly family: string;
  /** Text the entry states: governs, senses, emits, limits, provenance. */
  readonly text: readonly string[];
  /** True for typed mechanisms and proven archetypes. */
  readonly runs: boolean;
}

/**
 * Score of one entry: 3 per query word inside the id, 2 when a word names
 * the family, 1 per word found in the entry's text. 0 means no hit.
 */
export function score(e: Scored, ws: readonly string[]): number {
  const text = e.text.join(" ").toLowerCase();
  let s = 0;
  for (const w of ws) {
    if (e.id.includes(w)) s += 3;
    if (e.family.toLowerCase().includes(w)) s += 2;
    if (text.includes(w)) s += 1;
  }
  return s;
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
