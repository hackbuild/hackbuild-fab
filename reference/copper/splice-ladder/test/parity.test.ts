// M05-T14: SPLICE rev C's cut file on packages/copper, the ladder rule and
// the weedability proof. Independent sources: the shipped SVG
// (legacy/splice-copper.svg, lineage splice.copper/rev-c) and shapely's
// figures on it (expected/oracle-shapely.json, written by
// tools/py/copper/dump_splice.py). Own golden, rewritten only with
// HBF_ACCEPT_VINYL=1: expected/ladder.json, in core's surface shape
// (core/src/commands/surface.ts ladderGolden, which hbf parity compares).
// Every number is computed.

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { beforeAll, describe, expect, test } from "vitest";
import { loadGeom, type Geom, type Section } from "@hackbuild/geom";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { Vinyl, islands, ladderAudit, ladderGap, weedProof } from "@hackbuild/copper";
import { build } from "../build";
import { chase as chaseModule, type SpliceParams } from "../chase.surface";
import { ROOT, chaseOf, paramsOf, read } from "../../_harness/vinyl";
import { LADDER_AUDIT as AUDIT, ladderGolden, ladderProbe, ladderNets } from "../../../../core/src/commands/surface.js";

const DIR = "reference/copper/splice-ladder";
const ACCEPT = process.env["HBF_ACCEPT_VINYL"] === "1";

const profile = createProfileLookup(loadProfile());
const oracle = JSON.parse(read(`${DIR}/expected/oracle-shapely.json`)) as {
  nets: Record<string, number>; islands: Record<string, number>; min_gap: number; pair: string; erode: Record<string, Record<string, number>>;
};
let g: Geom;
let nets: [string, Section][];
let decl: ReturnType<typeof build>;

beforeAll(async () => {
  g = await loadGeom();
  decl = build(paramsOf(chaseOf(DIR)) as unknown as SpliceParams);
  nets = ladderNets(g, decl, read(`${DIR}/${decl.source}`));
  expect(nets).toHaveLength(decl.nets.length);
});

describe("SPLICE rev C ladder and weedability", () => {
  test("the surface chase reads as data and equals its module's export (D-178)", () => {
    expect(chaseOf(DIR)).toStrictEqual(chaseModule);
  });

  test("seven nets, each one piece, areas as shapely reads the cut file", () => {
    expect(nets.map(([n]) => n)).toEqual(Object.keys(oracle.nets));
    for (const [n, s] of nets) {
      expect(islands(s), n).toBe(oracle.islands[n]);
      expect(s.area(), n).toBeCloseTo(oracle.nets[n]!, 3);
    }
  });

  test("least gap 0.940 mm, pitch less width; shapely's pair is in the port's tie; every long run orthogonal or 45 degrees", () => {
    const a = ladderAudit(nets, { pitch: decl.pitch, width: decl.width, ...AUDIT });
    expect(ladderGap(decl.pitch, decl.width)).toBeCloseTo(0.94, 12);
    expect(Math.abs(a.gap - oracle.min_gap)).toBeLessThanOrEqual(0.005);
    expect(Math.abs(a.gap - ladderGap(decl.pitch, decl.width))).toBeLessThanOrEqual(1e-5);
    expect(a.ties).toContain(oracle.pair);
    expect(a.offAngle).toEqual([]);
  });

  test("weedable: every net one piece after the profile erosion; the card's 0.80 mm probe splits or empties the nets shapely says", () => {
    const v = new Vinyl(g);
    const e = profile.constant("vinyl.weedErode").value;
    const proof = weedProof(v, nets, e);
    expect(proof.ok).toBe(true);
    expect(Object.fromEntries(proof.nets.map((n) => [n.net, n.pieces]))).toEqual(oracle.erode[e.toFixed(2)]);
    const at = ladderProbe(decl.width);
    const probe = weedProof(v, nets, at);
    expect(Object.fromEntries(probe.nets.map((n) => [n.net, n.pieces]))).toEqual(oracle.erode[at.toFixed(2)]);
    expect(probe.failing).toEqual(["SIGA", "5V", "GND", "SIGB", "BASE1", "COL"]);
  });

  test("ladder golden equals expected/ladder.json", () => {
    const fresh = ladderGolden(g, decl, nets, profile).golden;
    const file = new URL(`${DIR}/expected/ladder.json`, ROOT);
    if (ACCEPT) {
      mkdirSync(new URL(`${DIR}/expected/`, ROOT), { recursive: true });
      writeFileSync(file, `${JSON.stringify(fresh, null, 1)}\n`);
      return;
    }
    expect(existsSync(file), `${DIR}/expected/ladder.json; write it with HBF_ACCEPT_VINYL=1 npx vitest run ${DIR}`).toBe(true);
    expect(fresh).toEqual(JSON.parse(read(`${DIR}/expected/ladder.json`)));
  });
});
