// The metric record packages/checks/test/metric-gates.test.ts reads
// (M04-T07, D-075). packages/checks sits at tier 2 and cannot import the
// build, so the record is built from every reference and design that holds
// a chase.ts, at its default params, through the one build path
// (loadDesign, resolveParams, buildPart), and the committed record must
// still equal a fresh one. The record keeps each metric's id and its gate
// field exactly as the build emitted it, absent when absent, so the gate
// rule over there sees what the build wrote. A person who has read the diff
// rewrites the record with HBF_ACCEPT_METRICS=1.
//
// The builds run in the metric-record.shard-<i>-of-<n> files, one test per
// build, each entry compared as text with the committed one
// (support/metric-record.ts, R1-speed-01). This file proves the record
// lists every chase in order and is in the one written form, so the shards
// and this file hold the whole-file equality. An accept run builds every
// chase here, in one file, and writes the record.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ROOT } from "./hbf.js";
import { BUILD_PENDING, RECORD, chases, entryOf, recordText, type Entry } from "./support/metric-record.js";

describe("metric record for the gate rule", () => {
  it("skips only chases whose build.ts has not landed", () => {
    for (const rel of BUILD_PENDING) {
      expect(existsSync(path.join(ROOT, rel, "chase.ts")), `${rel} has a chase.ts`).toBe(true);
      expect(existsSync(path.join(ROOT, rel, "build.ts")), `${rel}/build.ts landed: remove it from BUILD_PENDING`).toBe(false);
    }
  });

  if (process.env["HBF_ACCEPT_METRICS"] === "1") {
    const builds = new Map<string, Entry>();
    for (const rel of chases()) it(`builds ${rel}`, async () => { builds.set(rel, await entryOf(rel)); }, 120_000);
    it("writes a fresh build of every reference and design", () => {
      expect([...builds.keys()], "every build ran").toEqual(chases());
      writeFileSync(RECORD, recordText(chases().map((rel) => builds.get(rel))));
    });
  }

  it("lists every reference and design in order, in the one written form", () => {
    const text = readFileSync(RECORD, "utf8");
    const rec = JSON.parse(text) as { builds: Entry[] };
    expect(rec.builds.map((b) => b.build), "every chase, in order").toEqual(chases());
    expect(recordText(rec.builds)).toBe(text);
  });
});
