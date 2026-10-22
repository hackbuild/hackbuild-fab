// The corpus shards cover their lists exactly once (R1-speed-01). Shard
// files are read from core/test by name (support/shards.ts), so a shard
// file deleted or renamed leaves its slice uncovered and fails here.

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { ROOT } from "../hbf.js";
import { chases } from "./metric-record.js";
import { referenceDirs } from "./message-numbers.js";
import { SHARD_FILE, shardOf, slice } from "./shards.js";

const DIR = path.join(ROOT, "core", "test");

/** Each family's list and the call its shard files make. */
const FAMILIES: Readonly<Record<string, { readonly list: () => string[]; readonly runner: string }>> = {
  "message-numbers": { list: referenceDirs, runner: "referenceChecks" },
  "metric-record": { list: chases, runner: "metricShard" },
};

const shardFiles = (): string[] => readdirSync(DIR).filter((f) => SHARD_FILE.test(f)).sort();

describe("corpus shards", () => {
  test("every shard file belongs to a known family, and every family has shards", () => {
    const families = new Set(shardFiles().map((f) => shardOf(f).family));
    expect([...families].sort()).toEqual(Object.keys(FAMILIES).sort());
  });

  for (const [family, { list, runner }] of Object.entries(FAMILIES)) {
    test(`${family}: the shards are 1 to n of one n and cover every item exactly once`, () => {
      const files = shardFiles().filter((f) => shardOf(f).family === family);
      const shards = files.map(shardOf);
      const n = shards[0]!.n;
      expect(shards.map((s) => s.n), "one shard count").toEqual(shards.map(() => n));
      expect(shards.map((s) => s.i).sort((a, b) => a - b)).toEqual(Array.from({ length: n }, (_, k) => k + 1));
      for (const f of files) expect(readFileSync(path.join(DIR, f), "utf8"), f).toContain(`${runner}(import.meta.url);`);
      const items = list();
      expect(items.length).toBeGreaterThan(n);
      const seen = new Map<string, number>();
      for (const s of shards) for (const x of slice(items, s.i, s.n)) seen.set(x, (seen.get(x) ?? 0) + 1);
      expect(items.filter((x) => seen.get(x) !== 1), "covered other than once").toEqual([]);
      expect([...seen.keys()].sort()).toEqual([...items].sort());
    });
  }

  test("a name that is no shard is refused", () => {
    expect(() => shardOf("message-numbers.test.ts")).toThrow(/is not named/);
    expect(() => shardOf("metric-record.shard-4-of-3.test.ts")).toThrow(/out of range/);
  });
});
