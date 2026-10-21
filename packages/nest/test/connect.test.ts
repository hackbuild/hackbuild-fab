// M07-T04 connectivity refusal. The numbers come from three places, none of
// them the port: the SLUG page's own baked outlines and the connectivity
// its record holds (packages/nest/records/slug-legacy.json), cutfiles.py's
// own functions run by designs/ogee16/extract/connect-record.py
// (packages/nest/records/ogee16-connect.json), and the card's arithmetic
// cases on the fixtures in test/fixtures/. The kerf of the OGEE run is read
// from cutfiles.py itself; no kerf is typed here (CHK-SHT-04).

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, test } from "vitest";
import { isThrownCommandError, type NestItem, type NestRequest, type ProfileLookup, type Ring } from "@hackbuild/spec";
import { loadGeom, type Geom } from "@hackbuild/geom";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { beamOf, connect, kerfNext, packSheets, type SheetFinding } from "../src/connect.js";
import { compensate, partProfile } from "../src/profile.js";
// @ts-expect-error the legacy tool is plain JavaScript with no declarations
import { extract } from "../../../designs/slug/extract/extract-nest.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const json = <T>(rel: string): T => JSON.parse(readFileSync(path.join(ROOT, rel), "utf8")) as T;
const fixture = (name: string) => json<{ items: NestItem[] }>(`packages/nest/test/fixtures/${name}.json`).items;

const slugRecord = json<{ result: { connectivity: { parts: number; loops: number; holes: number; severed: string[]; holesOutsideOuter: number } } }>(
  "packages/nest/records/slug-legacy.json",
).result.connectivity;

interface OgeePart {
  id: string; qty: number; rings: number[][][]; holes: number;
  compensated: { pieces: number; holes: number; x0: number; y0: number; w: number; h: number };
}
const ogee = json<{ result: { params: { kerf: number }; parts: OgeePart[]; severed: unknown[] } }>("packages/nest/records/ogee16-connect.json").result;

// cutfiles.py line 19: the beam its run compensated with.
const cutfiles = readFileSync(path.join(ROOT, "designs/ogee16/legacy/source/cutfiles.py"), "utf8");
const BEAM = Number(/^KERF = ([0-9.]+)/m.exec(cutfiles)?.[1]);

const body = (extract() as string).replace(/\nexport \{[^}]*\};\n$/, "\nreturn {OUTLINES,ACRYLIC};\n");
const S = new Function(body)() as { OUTLINES: Record<string, number[][][]>; ACRYLIC: Set<string> };
const slugItems: NestItem[] = Object.keys(S.OUTLINES).map((id) => ({
  id, rings: S.OUTLINES[id] as unknown as Ring[], qty: 1, stock: S.ACRYLIC.has(id) ? "acrylic" : "ply",
}));

/** The profile with sheet600's kerf set to the beam cutfiles.py ran at, the way a coupon entry would set it. */
function lookupWithBeam(beam: number): ProfileLookup {
  const t = loadProfile();
  return createProfileLookup({ ...t, machines: t.machines.map((m) => (m.id === "sheet600" ? { ...m, kerf: beam } : m)) });
}

const of = (fs: readonly SheetFinding[], check: SheetFinding["check"], part: string) =>
  fs.filter((f) => f.check === check && (f.finding.target as { part?: string }).part === part);

let geom: Geom;
let profile: ProfileLookup;
beforeAll(async () => {
  geom = await loadGeom();
  profile = createProfileLookup(loadProfile());
});

describe("SLUG baked outlines (computed)", () => {
  test("all 46 are one piece with every hole inside its outer, as the record holds", () => {
    expect(slugItems).toHaveLength(slugRecord.parts);
    const c = connect(geom, slugItems, 0, profile);
    const severed = c.parts.filter((p) => p.pieces !== 1).map((p) => `${p.id}:${p.pieces}`);
    expect(severed).toEqual(slugRecord.severed);
    expect(c.refused).toBe(false);
    expect(c.findings.filter((f) => f.check === "CHK-SHT-01")).toHaveLength(46);
    const profiles = slugItems.map((it) => partProfile(geom, it.rings));
    expect(profiles.reduce((n, p) => n + p.rings.length, 0)).toBe(slugRecord.loops);
    expect(profiles.reduce((n, p) => n + p.holes, 0)).toBe(slugRecord.holes);
    expect(profiles.reduce((n, p) => n + p.outside, 0)).toBe(slugRecord.holesOutsideOuter);
    expect(c.parts.reduce((n, p) => n + p.holeRings, 0)).toBe(slugRecord.holes);
  });
});

describe("OGEE R16 lasercut parts against cutfiles.py (computed)", () => {
  test("the beam read from cutfiles.py is the one its record ran at", () => {
    expect(BEAM).toBe(ogee.params.kerf);
    expect(ogee.parts).toHaveLength(27);
    expect(ogee.severed).toEqual([]);
  });

  test("hole count of each profile equals polygon_from_rings", () => {
    for (const p of ogee.parts) expect([p.id, partProfile(geom, p.rings as unknown as Ring[]).holes]).toEqual([p.id, p.holes]);
  });

  test("after compensate at the beam, pieces, holes and bounds equal shapely's", () => {
    for (const p of ogee.parts) {
      const s = compensate(partProfile(geom, p.rings as unknown as Ring[]).section, BEAM);
      const comps = s.components();
      expect([p.id, comps.length, comps.reduce((n, c) => n + c.holes.length, 0)]).toEqual([p.id, p.compensated.pieces, p.compensated.holes]);
      const b = s.bounds()!;
      // one grid step (D-054) plus the polygonal arcs both kernels draw
      const tol = 2e-3;
      expect(Math.abs(b.min[0] - p.compensated.x0), `${p.id} x0`).toBeLessThanOrEqual(tol);
      expect(Math.abs(b.min[1] - p.compensated.y0), `${p.id} y0`).toBeLessThanOrEqual(tol);
      expect(Math.abs(b.max[0] - b.min[0] - p.compensated.w), `${p.id} w`).toBeLessThanOrEqual(tol);
      expect(Math.abs(b.max[1] - b.min[1] - p.compensated.h), `${p.id} h`).toBeLessThanOrEqual(tol);
    }
  });
});

describe("CHK-SHT-01 refuses a severed profile (computed)", () => {
  test("a 200 x 20 deck with a 4 mm channel edge to edge is 2 pieces and refused; stopped short it is 1", () => {
    const c = connect(geom, fixture("severed-deck"), 0, profile);
    const [deck] = of(c.findings, "CHK-SHT-01", "deck");
    expect(deck!.finding).toMatchObject({ verdict: "fail", measured: false, legal: { kind: "boolean", must: true }, extra: { pieces: 2 } });
    expect(of(c.findings, "CHK-SHT-01", "deck-short")[0]!.finding).toMatchObject({ verdict: "pass", extra: { pieces: 1 } });
    expect(c.refused).toBe(true);
  });

  test("a 20 mm washer with two diametral relief slits is 2 pieces; one slit is 1", () => {
    const c = connect(geom, fixture("keeper-two-slits"), 0, profile);
    expect(of(c.findings, "CHK-SHT-01", "keeper-two-slits")[0]!.finding).toMatchObject({ verdict: "fail", extra: { pieces: 2 } });
    expect(of(c.findings, "CHK-SHT-01", "keeper-one-slit")[0]!.finding).toMatchObject({ verdict: "pass", extra: { pieces: 1 } });
  });

  test("an island inside a hole is solid at depth 2, so it is a second piece the cutter frees", () => {
    const frame: NestItem = {
      id: "frame-island", stock: "ply3", qty: 1,
      rings: [[[0, 0], [40, 0], [40, 40], [0, 40]], [[5, 5], [35, 5], [35, 35], [5, 35]], [[15, 15], [25, 15], [25, 25], [15, 25]]],
    };
    const p = partProfile(geom, frame.rings);
    expect([p.rings.map((r) => r.depth), p.holes, p.solids, p.outside]).toEqual([[0, 1, 2], 1, 1, 0]);
    expect(of(connect(geom, [frame], 0, profile).findings, "CHK-SHT-01", "frame-island")[0]!.finding).toMatchObject({ verdict: "fail", extra: { pieces: 2 } });
  });

  test("the beam keeps the channel open: still 2 pieces at the cutfiles.py kerf", () => {
    const c = connect(geom, fixture("severed-deck"), BEAM, profile);
    expect(c.parts.map((p) => [p.id, p.pieces])).toEqual([["deck", 2], ["deck-short", 1]]);
  });
});

describe("CHK-SHT-07 hub arithmetic (computed)", () => {
  const c = () => connect(geom, fixture("hub-holes"), 0, profile);

  test("hub b 4, R 10, hole d 3 at r 5 is refused: r - d/2 = 3.5 < b + w = 5.0", () => {
    const [f] = of(c().findings, "CHK-SHT-07", "hub-near");
    expect(f!.finding).toMatchObject({ verdict: "fail", measured: false, target: { level: "feature", part: "hub-near", feature: "hub-near.pin" } });
    expect(f!.finding.extra).toMatchObject({ innerWebMm: -0.5, minFeatureMm: 1 });
    expect(f!.finding.constraint).toContain("spans 3.5 to 6.5 mm, legal 5 to 9");
  });

  test("hole d 3 at r 7 is legal: 5.5 >= 5.0 and 8.5 <= 9.0", () => {
    const [f] = of(c().findings, "CHK-SHT-07", "hub-far");
    expect(f!.finding).toMatchObject({ verdict: "pass", measured: true });
    expect(f!.finding.constraint).toContain("spans 5.5 to 8.5 mm, legal 5 to 9");
  });

  test("the near hole joins the bore, so the profile is still one piece: only the arithmetic sees it", () => {
    expect(of(c().findings, "CHK-SHT-01", "hub-near")[0]!.finding.verdict).toBe("pass");
  });

  test("w is the profile row ply3.minFeature, 1.0 mm inferred from SKETCH v3", () => {
    const k = profile.constant("ply3.minFeature");
    expect([k.value, k.unit, k.provenance.tier]).toEqual([1, "mm", "inferred"]);
    expect(k.provenance.source).toMatch(/sketch\.html line 483/);
  });
});

describe("CHK-SHT-02 declared holes (computed)", () => {
  test("a part declaring 3 holes and emitting 0 fails, naming the 3 feature ids", () => {
    const bracket: NestItem = {
      id: "latchbracket", stock: "ply3", qty: 1, rings: [[[0, 0], [40, 0], [40, 20], [0, 20]]],
      holes: [{ feature: "slot.a", at: [8, 10] }, { feature: "slot.b", at: [20, 10] }, { feature: "slot.c", at: [32, 10] }],
    };
    const [f] = of(connect(geom, [bracket], 0, profile).findings, "CHK-SHT-02", "latchbracket");
    expect(f!.finding).toMatchObject({ verdict: "fail", measured: 0, legal: { kind: "interval", lo: 3, hi: null, unit: "count", nearest: 3 } });
    expect(f!.finding.extra).toMatchObject({ holeRings: 0, missing: "slot.a slot.b slot.c" });
  });

  test("the hub parts declare bore and pin, and both are rings", () => {
    const fs = connect(geom, fixture("hub-holes"), 0, profile).findings.filter((f) => f.check === "CHK-SHT-02");
    expect(fs.map((f) => [f.finding.verdict, f.finding.measured])).toEqual([["pass", 2], ["pass", 2]]);
  });
});

describe("kerf mode and the checked nest (computed)", () => {
  const request = (items: readonly NestItem[]): NestRequest => ({
    items, sheet: [600, 400], margin: 6, gap: 4, mode: "fill", rotations: [0, 90], partInPart: false, seed: 0,
  });

  test("outline on sheet600, whose kerf is null, is E_PARAM_MISSING naming the row", () => {
    expect(profile.machine("sheet600").kerf).toBeNull();
    let err: unknown;
    try {
      packSheets(geom, request(slugItems), { profile, machine: "sheet600", kerfMode: "outline" });
    } catch (e) {
      err = e;
    }
    expect(isThrownCommandError(err)).toBe(true);
    expect((err as { hbf: unknown }).hbf).toMatchObject({ code: "E_PARAM_MISSING", path: "hbf://profile/machine/sheet600#/kerf" });
  });

  test("the next calls are the same call at kerf mode none and the coupon search", () => {
    const args = { parts: ["gauge"], sheet: [600, 400], machine: "sheet600", kerfMode: "outline" };
    expect(kerfNext("nest.pack", args)).toEqual([
      { command: "nest.pack", args: { ...args, kerfMode: "none" }, why: "cut at nominal; slots carry the design slop" },
      { command: "knowledge.search", args: { query: "kerf coupon" }, why: "a person cuts the coupon and enters kerf" },
    ]);
  });

  test("kerf mode none needs no kerf: the 46 SLUG parts nest with every finding passing", () => {
    expect(beamOf(profile, "sheet600", "none")).toBe(0);
    const out = packSheets(geom, request(slugItems), { profile, machine: "sheet600", kerfMode: "none" });
    expect(out.findings.every((f) => f.finding.verdict === "pass")).toBe(true);
    expect(out.result).not.toBeNull();
    expect(out.result!.placements).toHaveLength(46);
    expect(out.result!.oversize).toEqual([]);
  });

  test("a severed part refuses the nest before anything is placed", () => {
    const out = packSheets(geom, request(fixture("severed-deck")), { profile, machine: "sheet600", kerfMode: "none" });
    expect(out.result).toBeNull();
    expect(out.findings.filter((f) => f.finding.verdict === "fail").map((f) => [f.check, (f.finding.target as { part: string }).part])).toEqual([["CHK-SHT-01", "deck"]]);
  });

  test("outline with a kerf on the row packs the compensated outlines, each side grown by half the beam", () => {
    const withBeam = lookupWithBeam(BEAM);
    expect(beamOf(withBeam, "sheet600", "outline")).toBe(BEAM);
    const short = fixture("severed-deck").filter((it) => it.id === "deck-short");
    const out = packSheets(geom, request(short), { profile: withBeam, machine: "sheet600", kerfMode: "outline" });
    expect(out.beam).toBe(BEAM);
    const b = compensate(partProfile(geom, short[0]!.rings).section, BEAM).bounds()!;
    expect(b.max[0] - b.min[0]).toBeCloseTo(200 + BEAM, 3);
    expect(b.max[1] - b.min[1]).toBeCloseTo(20 + BEAM, 3);
    // fill is footprint over usable area, so it shows the packer saw the grown outline
    const usable = (600 - 2 * 6) * (400 - 2 * 6);
    expect(out.result!.sheets).toBe(1);
    expect(out.result!.fill[0]).toBeCloseTo((100 * (200 + BEAM) * (20 + BEAM)) / usable, 3);
    const nominal = packSheets(geom, request(short), { profile: withBeam, machine: "sheet600", kerfMode: "none" });
    expect(nominal.result!.fill[0]).toBeCloseTo((100 * 200 * 20) / usable, 6);
  });
});
