// The metric record packages/checks/test/metric-gates.test.ts reads
// (M04-T07, D-075). packages/checks sits at tier 2 and cannot import the
// build, so this file builds every reference and design that holds a
// chase.ts, at its default params, through the one build path
// (loadDesign, resolveParams, buildPart), and checks the committed record
// still equals a fresh one. The record keeps each metric's id and its gate
// field exactly as the build emitted it, absent when absent, so the gate
// rule over there sees what the build wrote. A person who has read the diff
// rewrites the record with HBF_ACCEPT_METRICS=1.

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildPart, loadDesign, resolveParams } from "../src/commands/build.js";
import { buildBoard, isBoardDesign } from "../src/board.js";
import { isWiringDesign } from "../src/exporters/wiring.js";
import { ROOT } from "./hbf.js";

const RECORD = path.join(ROOT, "packages", "checks", "test", "metric-gates", "builds.json");

const dirs = (p: string): string[] =>
  readdirSync(p, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();

/**
 * Designs whose chase landed before their build.ts: designs/pip/chase.ts
 * (R1-designs-reach-08) ahead of its build (R1-designs-reach-09). Each must
 * still lack build.ts, so the entry fails once the build lands and is then
 * removed; nothing else is skipped.
 */
const BUILD_PENDING: readonly string[] = ["designs/pip"];

/** reference/<area>/<id> and designs/<id> holding a chase.ts, read from the tree. */
function chases(): string[] {
  const refs = dirs(path.join(ROOT, "reference")).flatMap((a) => dirs(path.join(ROOT, "reference", a)).map((id) => `reference/${a}/${id}`));
  const designs = dirs(path.join(ROOT, "designs")).map((id) => `designs/${id}`);
  return [...designs, ...refs].filter((rel) => existsSync(path.join(ROOT, rel, "chase.ts")) && !BUILD_PENDING.includes(rel)).sort();
}

describe("metric record for the gate rule", () => {
  // One test per build, each with its own time limit; one test over every
  // build timed out at 300 s under load in full core runs (R1-fix-13, as
  // R1-fix-06 did for project-graph). The record is compared after them.
  const builds = new Map<string, { build: string; part: string; metrics: { id: string; gate?: unknown }[] }>();
  const all = chases();
  for (const rel of all) {
    it(`builds ${rel}`, async () => {
      const design = await loadDesign(rel, ROOT);
      // A wiring board builds no part and emits no metric; a board's part comes from its generator (M08).
      if (isWiringDesign(design)) {
        builds.set(rel, { build: rel, part: path.basename(design.dir), metrics: [] });
        return;
      }
      const board = isBoardDesign(design) ? await buildBoard(design, {}) : undefined;
      if (board !== undefined && "refused" in board) throw new Error(`${rel}: generator refused, ${board.lines[0] ?? `exit ${board.exit}`}`);
      const built = board ?? await buildPart(design, resolveParams(design.chase, undefined, undefined));
      builds.set(rel, {
        build: rel,
        part: built.part.id,
        metrics: built.part.metrics.map((m) => {
          const raw = m as unknown as Record<string, unknown>;
          return "gate" in raw ? { id: m.id, gate: raw["gate"] } : { id: m.id };
        }),
      });
    }, 120_000);
  }

  it("skips only chases whose build.ts has not landed", () => {
    for (const rel of BUILD_PENDING) {
      expect(existsSync(path.join(ROOT, rel, "chase.ts")), `${rel} has a chase.ts`).toBe(true);
      expect(existsSync(path.join(ROOT, rel, "build.ts")), `${rel}/build.ts landed: remove it from BUILD_PENDING`).toBe(false);
    }
  });

  it("equals a fresh build of every reference and design", () => {
    expect([...builds.keys()], "every build ran").toEqual(all);
    const text = `${JSON.stringify({
      note: "recorded by core/test/metric-record.test.ts from part metrics at default params; read by metric-gates.test.ts",
      builds: all.map((rel) => builds.get(rel)),
    }, null, 2)}\n`;
    if (process.env["HBF_ACCEPT_METRICS"] === "1") writeFileSync(RECORD, text);
    expect(text).toBe(readFileSync(RECORD, "utf8"));
  });
});
