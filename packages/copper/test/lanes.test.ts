// M05-T14: the lane ranker against the KEYWAY family's own fans. The
// fixture is the generators' globals after a pinned run
// (tools/py/copper/dump_lanes.py): arrivals, terminals, margin, lanes
// farthest first, and the lane each net took. The lanes-used counts the
// card states are read from the card itself.

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { assignLanes, type LaneVersion, type RailAxis } from "../src/index.js";

const repo = new URL("../../../", import.meta.url);
const read = (rel: string): string => readFileSync(new URL(rel, repo), "utf8");
const fixture = JSON.parse(read("packages/copper/test/fixtures/lanes-legacy.json")) as {
  boards: { name: string; version: LaneVersion; rail: RailAxis; margin: number; lanes: number[]; nets: { net: string; arrive: number; terminal: number; lane: number }[]; lanes_used: number }[];
};

/** "TESSERA, FRET and STAVE lane counts used 4 of 9, 3 of 12, 5 of 6; SPLINE 6 of 8" from the M05-T14 acceptance. */
function cardCounts(): Map<string, [number, number]> {
  const card = read("docs/plan/milestones/M05-circuit-copper.md").split(/^## M05-T14 /m)[1]!.split(/^## M05-T15 /m)[0]!;
  const line = /TESSERA, FRET and STAVE lane counts\s+used ([^;]+); SPLINE (\d+) of (\d+)/.exec(card.replace(/\n\s*/g, " "));
  expect(line, "the card's lane count line").not.toBeNull();
  const three = [...line![1]!.matchAll(/(\d+) of (\d+)/g)].map((m) => [Number(m[1]), Number(m[2])] as [number, number]);
  return new Map([["tessera", three[0]!], ["fret", three[1]!], ["stave", three[2]!], ["spline", [Number(line![2]), Number(line![3])]]]);
}

describe("lane ranker on the family's fans", () => {
  const counts = cardCounts();
  for (const b of fixture.boards) {
    test(`${b.name} (${b.version}, ${b.rail} rail): every net on the generator's lane`, () => {
      const r = assignLanes({ nets: b.nets, margin: b.margin, lanes: b.lanes, rail: b.rail }, b.version);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.lane).toEqual(Object.fromEntries(b.nets.map((n) => [n.net, n.lane])));
      expect(r.used).toBe(b.lanes_used);
      const card = counts.get(b.name);
      if (card !== undefined) expect([r.used, b.lanes.length]).toEqual(card);
    });
  }

  test("the card names a count for SPLINE, TESSERA, FRET and STAVE", () => {
    expect([...counts.keys()].sort()).toEqual(["fret", "spline", "stave", "tessera"]);
  });

  test("two escape drops inside each other's spans make a cycle, reported with both nets", () => {
    const r = assignLanes({
      nets: [{ net: "A", arrive: 10, terminal: 30 }, { net: "B", arrive: 12, terminal: 4 }],
      margin: 2.5, lanes: [40, 37, 34], rail: "x",
    }, "v2");
    expect(r.ok).toBe(false);
    if (!r.ok && r.reason === "cycle") expect([...r.nets].sort()).toEqual(["A", "B"]);
    else expect.fail(`expected a cycle, got ${JSON.stringify(r)}`);
  });

  test("version 2 refuses a fan that needs more lanes than it has; version 1 names the net it cannot place", () => {
    const nets = [{ net: "A", arrive: 0, terminal: 20 }, { net: "B", arrive: 5, terminal: 25 }, { net: "C", arrive: 10, terminal: 30 }];
    const v2 = assignLanes({ nets, margin: 2.5, lanes: [40], rail: "y" }, "v2");
    expect(v2.ok ? "ok" : v2.reason).toBe("lanes");
    const v1 = assignLanes({ nets, margin: 2.5, lanes: [40], rail: "x" }, "v1");
    expect(v1.ok ? "ok" : v1.reason).toBe("no-lane");
  });
});
