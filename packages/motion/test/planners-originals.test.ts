// M07-T12: every profile row the card added names a line of a canonical
// original; the line holds the value. The canonical files are DETENT
// detent-plot.html (lineage detent.plot/beam) and the WASHER page
// laser-rig.html (washer.app/laserriggg), read from the originals of record
// through localSource and held to the sha256 of their lineage rows. Runs on
// the owner runner and never skips.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { localSource } from "../../../tools/test-support/originals-root.js";

const root = new URL("../../../", import.meta.url);
const read = (p: string): string => readFileSync(new URL(p, root), "utf8");
const sha256 = (b: Uint8Array): string => createHash("sha256").update(b).digest("hex");
const lineage = JSON.parse(read("lineage.json")) as { id: string; kind: string; source: string; sha256: string }[];

/** The canonical page of a lineage row, read from its source and held to the row's sha256. */
function canonical(id: string): string[] {
  const row = lineage.find((r) => r.id === id && r.kind === "canonical")!;
  const b = readFileSync(localSource(row.source));
  expect(sha256(b), `${row.source} is the file lineage ${id} records`).toBe(row.sha256);
  return b.toString("utf8").split("\n");
}
const pages = { detent: () => canonical("detent.plot/beam"), washer: () => canonical("washer.app/laserriggg") };

const rows = (JSON.parse(read("packages/profile/data/constants.json")) as { constants: { id: string; value: number; provenance: { source: string } }[] }).constants
  .filter((c) => /^(detent|washer|servo)\.|^calibrate\./.test(c.id));
describe.each(rows)("profile row $id", (c) => {
  const m = /^originals\/(detent|washer)\/files\/\S+ line (\d+) /.exec(c.provenance.source);
  test("cites one line of a canonical original", () => expect(m).not.toBeNull());
  test("that line holds the value", () => {
    expect(m, `${c.id} cites no canonical line`).not.toBeNull();
    const line = pages[m![1] as "detent" | "washer"]()[Number(m![2]) - 1] ?? "";
    const field = c.id.split(".").at(-1)!;
    const numbers = (line.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
    expect(numbers, `${c.id} line ${m![2]}: ${line.trim()}`).toContain(c.value);
    if (c.id.startsWith("servo.")) expect(Number(new RegExp(`\\b${field}:([0-9.]+)`).exec(line)?.[1]), c.id).toBe(c.value);
  });
});
