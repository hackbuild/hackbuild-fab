// The plan signature cache of TOGGLE's route search (toggle src/src/part2d.js
// lines 207 to 217, lineage toggle.build/part2d): routing depends only on
// the plan view, so the last few results are kept by a signature of it and
// an edit that leaves the plan view alone never reroutes. The signature is
// the RFC 8785 canonical JSON of the plan view (spec/jcs.ts), so key order
// in the caller's object never splits one plan into two entries.

import { canonicalize } from "@hackbuild/spec";

/** Results kept, newest first (part2d.js line 215). */
export const ROUTE_CACHE_SIZE = 6;

/** A most recently stored first cache of route results keyed by plan view. */
export class RouteCache<V> {
  private readonly rows: { key: string; val: V }[] = [];

  constructor(readonly size: number = ROUTE_CACHE_SIZE) {}

  /** The canonical signature of a plan view. */
  static key(plan: unknown): string {
    return canonicalize(plan);
  }

  get(key: string): V | undefined {
    return this.rows.find((r) => r.key === key)?.val;
  }

  put(key: string, val: V): void {
    this.rows.unshift({ key, val });
    if (this.rows.length > this.size) this.rows.pop();
  }

  get length(): number {
    return this.rows.length;
  }
}
