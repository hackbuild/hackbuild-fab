// The metric record build of core/test/metric-record.test.ts, which the
// metric-record.shard-<i>-of-<n> files split between them (R1-speed-01).
// A shard compares each fresh entry with the committed one as text;
// metric-record.test.ts proves the record lists every chase in order and
// is written in the one form recordText gives, so together they hold the
// whole-file equality the record had in one file.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildPart, loadDesign, resolveParams } from "../../src/commands/build.js";
import { buildBoard, isBoardDesign } from "../../src/board.js";
import { isWiringDesign } from "../../src/exporters/wiring.js";
import { ROOT } from "../hbf.js";
import { shardOf, slice } from "./shards.js";

export const RECORD = path.join(ROOT, "packages", "checks", "test", "metric-gates", "builds.json");

/** One record entry: the build, its part and each metric's id and gate as the build emitted them. */
export interface Entry {
  readonly build: string;
  readonly part: string;
  readonly metrics: readonly { readonly id: string; readonly gate?: unknown }[];
}

const dirs = (p: string): string[] =>
  readdirSync(p, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();

/**
 * Designs whose chase landed before their build.ts. Each must still lack
 * build.ts, so an entry fails once the build lands and is then removed;
 * nothing else is skipped. designs/pip left it with R1-designs-reach-09.
 */
export const BUILD_PENDING: readonly string[] = [];

/** reference/<area>/<id> and designs/<id> holding a chase.ts, read from the tree. */
export function chases(): string[] {
  const refs = dirs(path.join(ROOT, "reference")).flatMap((a) => dirs(path.join(ROOT, "reference", a)).map((id) => `reference/${a}/${id}`));
  const designs = dirs(path.join(ROOT, "designs")).map((id) => `designs/${id}`);
  return [...designs, ...refs].filter((rel) => existsSync(path.join(ROOT, rel, "chase.ts")) && !BUILD_PENDING.includes(rel)).sort();
}

/** A fresh entry: rel built at its default params through the one build path. */
export async function entryOf(rel: string): Promise<Entry> {
  const design = await loadDesign(rel, ROOT);
  // A wiring board builds no part and emits no metric; a board's part comes from its generator (M08).
  if (isWiringDesign(design)) return { build: rel, part: path.basename(design.dir), metrics: [] };
  const board = isBoardDesign(design) ? await buildBoard(design, {}) : undefined;
  if (board !== undefined && "refused" in board) throw new Error(`${rel}: generator refused, ${board.lines[0] ?? `exit ${board.exit}`}`);
  const built = board ?? await buildPart(design, resolveParams(design.chase, undefined, undefined));
  return {
    build: rel,
    part: built.part.id,
    metrics: built.part.metrics.map((m) => {
      const raw = m as unknown as Record<string, unknown>;
      return "gate" in raw ? { id: m.id, gate: raw["gate"] } : { id: m.id };
    }),
  };
}

/** The record file's one form. */
export const recordText = (builds: readonly (Entry | undefined)[]): string => `${JSON.stringify({
  note: "recorded by core/test/metric-record.test.ts from part metrics at default params; read by metric-gates.test.ts",
  builds,
}, null, 2)}\n`;

/** The committed entries, by build. */
export function recorded(): Map<string, Entry> {
  const rec = JSON.parse(readFileSync(RECORD, "utf8")) as { builds: Entry[] };
  return new Map(rec.builds.map((b) => [b.build, b]));
}

/**
 * One shard's slice of the chases, each built in its own test with its own
 * time limit, its entry equal as text to the committed one. An accept run
 * (HBF_ACCEPT_METRICS=1) is written by metric-record.test.ts from its own
 * builds, so a shard then builds without comparing.
 */
export function metricShard(file: string): void {
  const { i, n } = shardOf(file);
  const accept = process.env["HBF_ACCEPT_METRICS"] === "1";
  describe("metric record for the gate rule", () => {
    const committed = recorded();
    for (const rel of slice(chases(), i, n)) {
      it(`builds ${rel}`, async () => {
        const fresh = await entryOf(rel);
        if (!accept) expect(JSON.stringify(fresh, null, 2)).toBe(JSON.stringify(committed.get(rel), null, 2));
      }, 120_000);
    }
  });
}
