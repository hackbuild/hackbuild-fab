// M02-T09: the insertion search moves held to the original hook_fit.py
// (lineage cotter.hook-fit/r5, the source the oracle golden names), read
// through localSource, so this file runs on the owner runner and never skips.

import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { localSource } from "../../../tools/test-support/originals-root.js";
import { INSERT_MOVES } from "../src/sweep/insert.js";

const golden = JSON.parse(readFileSync(new URL("./goldens/cotter-insert-oracle.json", import.meta.url), "utf8")) as { source: { file: string } };

test("the eleven moves are hook_fit.py line 62's, in order", () => {
  const src = readFileSync(localSource(golden.source.file), "utf8");
  const line = /for d in \((\(.*\))\):/.exec(src)![1]!;
  const want = [...line.matchAll(/\((-?\d+),(-?\d+),(-?\d+)\)/g)].map((m) => [Number(m[1]), Number(m[2]), Number(m[3])]);
  expect(INSERT_MOVES).toEqual(want);
});
