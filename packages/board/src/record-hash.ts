// recordHash (M08-T02 step 3, D-051 method): sha256 over the RFC 8785
// canonical JSON of the record with recordHash removed and every length in
// mm rounded to 1e-6, the meshHash grid. Arrays the record treats as sets
// (parts, pads, vias, holes, tracks, jumpers, bridges, reads, zones,
// keepouts, slots, silk) are sorted by
// the canonical JSON of their quantised element first, so emission order
// never moves the hash; outline rings and track points keep their order.
// canonicalize and sha256Hex are spec/jcs.ts, the one implementation.

import { canonicalize, sha256Hex, type BoardRecord, type Hash } from "@hackbuild/spec";

/** Steps per mm of the grid every hashed length snaps to: 1e-6 mm (D-051). */
export const STEPS_PER_MM = 1e6;

/** Keys whose numbers are lengths in mm. rot (degrees), required (a count), schema and copperLayers are left exact. */
const LENGTH_KEYS = new Set(["x", "y", "w", "h", "z", "r", "drill", "holeDx", "pad", "width", "thickness", "clearance", "size"]);
/** Keys holding point lists, every number a length in mm. */
const POINT_KEYS = new Set(["outline", "pts"]);
/** Top-level arrays that are sets. */
const SET_KEYS = ["parts", "pads", "vias", "holes", "tracks", "jumpers", "bridges", "reads", "zones", "keepouts", "slots", "silk"] as const;

/** Round to the 1e-6 mm grid; -0 folds to 0 so the canonical text has one form. */
export function quantise(v: number): number {
  const r = Math.round(v * STEPS_PER_MM) / STEPS_PER_MM;
  return r === 0 ? 0 : r;
}

function quantiseValue(v: unknown, key: string | undefined, inPoints: boolean): unknown {
  if (typeof v === "number") return inPoints || (key !== undefined && LENGTH_KEYS.has(key)) ? quantise(v) : v;
  if (Array.isArray(v)) return v.map((e) => quantiseValue(e, key, inPoints));
  if (v !== null && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, e] of Object.entries(v)) out[k] = quantiseValue(e, k, inPoints || POINT_KEYS.has(k));
    return out;
  }
  return v;
}

/**
 * A set array in canonical order: sorted by the canonical JSON of each
 * quantised element. The one sort hashedForm and every writer use, so two
 * records with one recordHash hold their sets in one order and write one
 * file (D-051).
 */
export function canonicalOrder<T>(arr: readonly T[]): T[] {
  return arr.map((e) => [canonicalize(quantiseValue(e, undefined, false)), e] as const)
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)).map(([, e]) => e);
}

/** The record with every set array in canonical order; writers start from this. */
export function canonicalRecord<R extends Omit<BoardRecord, "recordHash"> | BoardRecord>(record: R): R {
  const out: Record<string, unknown> = { ...record };
  for (const k of SET_KEYS) {
    const arr = out[k];
    if (Array.isArray(arr)) out[k] = canonicalOrder(arr);
  }
  return out as R;
}

/** The record as hashed: no recordHash, lengths on the grid, sets in canonical order. */
export function hashedForm(record: Omit<BoardRecord, "recordHash"> | BoardRecord): Record<string, unknown> {
  const { recordHash: _drop, ...rest } = canonicalRecord(record as BoardRecord);
  return quantiseValue(rest, undefined, false) as Record<string, unknown>;
}

export function recordHash(record: Omit<BoardRecord, "recordHash"> | BoardRecord): Hash {
  return sha256Hex(canonicalize(hashedForm(record))) as Hash;
}

/** Stamp a record with its hash. */
export function withHash(record: Omit<BoardRecord, "recordHash">): BoardRecord {
  return { ...record, recordHash: recordHash(record) };
}
