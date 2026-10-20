// chase.diff over values (M10-T04 step 4). Both documents are migrated to
// the current schema first, so a schema 1 file and its schema 2 rewrite
// differ by nothing; the migration lines are returned beside the changes.
// The walk compares canonical JSON, so key order never shows as a change.
// Object keys are visited sorted and arrays by index, so the list order is
// a function of the two values alone.

import { canonicalize, type ChaseChange, type ChaseMigrations } from "@hackbuild/spec";
import { migrateChase } from "./migrate/index.js";

type Obj = Record<string, unknown>;
const isPlain = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

/** One JSON pointer segment (RFC 6901). */
const esc = (k: string): string => k.replace(/~/g, "~0").replace(/\//g, "~1");

/** Every value that differs from before to after, by JSON pointer under at. */
export function diffValues(before: unknown, after: unknown, at = ""): ChaseChange[] {
  if (canonicalize(before ?? null) === canonicalize(after ?? null)) return [];
  const out: ChaseChange[] = [];
  if (isPlain(before) && isPlain(after)) {
    for (const k of [...new Set([...Object.keys(before), ...Object.keys(after)])].sort()) {
      const p = `${at}/${esc(k)}`;
      if (!(k in after)) out.push({ op: "removed", path: p, from: before[k], to: null });
      else if (!(k in before)) out.push({ op: "added", path: p, from: null, to: after[k] });
      else out.push(...diffValues(before[k], after[k], p));
    }
    return out;
  }
  if (Array.isArray(before) && Array.isArray(after)) {
    for (let i = 0; i < Math.max(before.length, after.length); i++) {
      const p = `${at}/${i}`;
      if (i >= after.length) out.push({ op: "removed", path: p, from: before[i], to: null });
      else if (i >= before.length) out.push({ op: "added", path: p, from: null, to: after[i] });
      else out.push(...diffValues(before[i], after[i], p));
    }
    return out;
  }
  return [{ op: "changed", path: at === "" ? "/" : at, from: before, to: after }];
}

export interface ChaseDiff {
  readonly changes: readonly ChaseChange[];
  readonly migrations: { readonly against: ChaseMigrations; readonly chase: ChaseMigrations };
  /** Both documents at the current schema. */
  readonly against: unknown;
  readonly chase: unknown;
}

/** Migrate both chase documents and list what changed from against to chase. Throws E_SCHEMA for a document no migration reads. */
export function diffChase(against: unknown, chase: unknown): ChaseDiff {
  const a = migrateChase(against);
  const c = migrateChase(chase);
  const report = (r: typeof a.report): ChaseMigrations => ({ from: r.from, to: r.to, lines: r.lines });
  return {
    changes: diffValues(a.chase, c.chase),
    migrations: { against: report(a.report), chase: report(c.report) },
    against: a.chase, chase: c.chase,
  };
}
