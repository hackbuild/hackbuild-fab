// Chase migrations (D-131; M10-T03 steps 1 and 2). Migrations run in order
// by meta.chase until the document is at CHASE_SCHEMA_VERSION; a document
// already there is returned unchanged with an empty report, so migrating
// twice is a no-op. A version newer than this build, or none at all, is
// E_SCHEMA: nothing guesses a schema.

import { CHASE_SCHEMA_VERSION, commandError } from "@hackbuild/spec";
import { migrate1to2, type MigrationLine, type Migrated } from "./1-to-2.js";

export type { MigrationLine, Migrated } from "./1-to-2.js";
export { migrate1to2 } from "./1-to-2.js";

export interface Migration {
  readonly from: number;
  readonly to: number;
  readonly run: (doc: unknown) => Migrated;
}

/** Every migration, in schema order. */
export const MIGRATIONS: readonly Migration[] = [{ from: 1, to: 2, run: migrate1to2 }];

export interface MigrationReport {
  /** Schema version the document arrived at. */
  readonly from: number;
  readonly to: number;
  readonly lines: readonly MigrationLine[];
  /** Layout fields that left the chase for bench.ts (D-174). */
  readonly bench: Readonly<Record<string, unknown>>;
}

type Obj = Record<string, unknown>;
const isPlain = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

/** The schema version a chase document declares, or E_SCHEMA. */
export function chaseVersionOf(doc: unknown): number {
  const v = isPlain(doc) && isPlain(doc["meta"]) ? doc["meta"]["chase"] : undefined;
  if (typeof v !== "number" || !Number.isInteger(v) || v < 1) {
    throw commandError({ code: "E_SCHEMA", path: "/meta/chase", got: v ?? null, expected: `a schema version from 1 to ${CHASE_SCHEMA_VERSION}`, hint: "set meta.chase to the schema the document was written for", record: "chase-migrate/version" });
  }
  if (v > CHASE_SCHEMA_VERSION) {
    throw commandError({ code: "E_SCHEMA", path: "/meta/chase", got: v, expected: `at most ${CHASE_SCHEMA_VERSION}`, hint: `this build reads chase schema ${CHASE_SCHEMA_VERSION}; update hbf to read schema ${v}`, record: "chase-migrate/version" });
  }
  return v;
}

/** Migrate a chase document of any earlier schema to the current one. */
export function migrateChase(doc: unknown): { readonly chase: unknown; readonly report: MigrationReport } {
  const from = chaseVersionOf(doc);
  let cur: unknown = doc;
  let at = from;
  const lines: MigrationLine[] = [];
  const bench: Obj = {};
  while (at < CHASE_SCHEMA_VERSION) {
    const m = MIGRATIONS.find((x) => x.from === at);
    if (m === undefined) {
      throw commandError({ code: "E_SCHEMA", path: "/meta/chase", got: at, expected: "a schema with a migration", hint: `no migration leaves schema ${at}`, record: "chase-migrate/version" });
    }
    const r = m.run(cur);
    cur = r.doc;
    lines.push(...r.lines);
    Object.assign(bench, r.bench);
    at = m.to;
  }
  return { chase: cur, report: { from, to: at, lines, bench } };
}
