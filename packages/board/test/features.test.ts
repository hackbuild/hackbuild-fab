// M08-T12 step 1: the board feature namespace. Every kind of
// spec/board-features.ts has one row, and every field, writer, check and
// reference a row names exists in the tree: the record key in the zod
// schema, the writer function in its file, the check id in the seed, the
// reference directory with a chase. A cell without an implementation says
// "none:" and why. The coverage test holds the covered kinds to the list
// the M08 card states, typed here from the card.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { BOARD_FEATURE_KINDS } from "@hackbuild/spec";
import { BOARD_FEATURES, boardRecordSchema } from "../src/index";

const ROOT = path.resolve(new URL("../../..", import.meta.url).pathname);
const seed = JSON.parse(readFileSync(path.join(ROOT, "packages/checks/seed/checks.seed.json"), "utf8")) as { checks: { id: string }[] };
const ids = new Set(seed.checks.map((c) => c.id));
const none = (v: string): boolean => /^none: \S/.test(v);

function writerExists(cell: string): boolean {
  const [file, fn] = cell.split(":");
  const p = path.join(ROOT, file!);
  if (!existsSync(p)) return false;
  const text = readFileSync(p, "utf8");
  return new RegExp(`(?:^def ${fn}\\(|^class ${fn}\\b|export function ${fn}\\b|^\\s+def ${fn}\\()`, "m").test(text);
}

describe("board feature namespace (D-061)", () => {
  test("one row per kind, in the spec's order", () => {
    expect(BOARD_FEATURES.map((r) => r.kind)).toEqual([...BOARD_FEATURE_KINDS]);
  });

  test.each(BOARD_FEATURES.map((r) => [r.kind, r] as const))("%s: every named field, writer, check and reference exists", (_k, r) => {
    const keys = Object.keys(boardRecordSchema.shape);
    if (!none(r.record)) expect(keys, r.record).toContain(r.record.split(" ")[0]);
    for (const w of [r.gerber, r.kicad]) if (!none(w)) expect(writerExists(w), w).toBe(true);
    expect(none(r.circuitJson), r.circuitJson).toBe(true);
    if (!none(r.check)) expect(ids.has(r.check), r.check).toBe(true);
    for (const ref of r.references) expect(existsSync(path.join(ROOT, "reference/boards", ref, "chase.ts")), ref).toBe(true);
    if (r.references.length === 0) expect(none(r.check) || none(r.record), `${r.kind} names no reference, so its gap must be stated`).toBe(true);
  });

  // The M08 card (docs/plan/milestones/M08-board-catalog.md, T12 notes,
  // step 1) names the seven gaps by hand: keepout, registration mark, mask
  // opening and thermal slot have no ported board; art layer and bare lead
  // have no record field; a declared bridge has no writer of its own. The
  // covered seven are the rest of the spec's fourteen kinds.
  const CARD_GAPS = ["keepout", "artLayer", "registrationMark", "maskOpening", "thermalSlot", "bareLead", "declaredBridge"];
  const CARD_FULL = ["outline", "routedSlot", "npthMount", "antennaKeepout", "silkString", "castellatedSeat", "solderJumper"];

  test("coverage: 7 of 14 kinds have a record field, a writer path, a check and a reference, the ones the M08 card names", () => {
    expect([...CARD_FULL, ...CARD_GAPS].sort()).toEqual([...BOARD_FEATURE_KINDS].sort());
    const full = BOARD_FEATURES.filter((r) => !none(r.record) && (!none(r.gerber) || !none(r.kicad)) && !none(r.check) && r.references.length > 0).map((r) => r.kind);
    console.info(`board features covered end to end: ${full.length} of ${BOARD_FEATURES.length}`);
    expect(full.length).toBe(7);
    expect([...full].sort()).toEqual([...CARD_FULL].sort());
  });
});
