// Parity tests for the KEYWAY family boards on packages/copper (M05-T15).
// Each board's test/parity.test.ts calls describeFamily with its build and
// what its geometry JSON states; the tests here hold the port to sources
// the port never writes:
// - reference/copper/<name>/legacy/run-2026-10-04.txt, the generator's
//   rerun gate lines (lineage <name>.rerun/2026-10-04), line for line;
// - reference/copper/<name>/legacy/<name>_geometry.json, the shipped params
//   (equal), stats and net paths (lineage <name>.geometry/rev-a);
// - the M05-T13 table in docs/plan/milestones/M05-circuit-copper.md: gates
//   passed, least clearance and the tightest pair.
// The board's own goldens, expected/gates.json, stats.json, layers.json and
// stack.json, are rewritten only with HBF_ACCEPT_VINYL=1; gates, layers and
// stack take core's surface shape (core/src/commands/surface.ts
// vinylGoldens), the objects hbf parity compares. Tolerances are
// M05-T14's for a Clipper2 port of shapely geometry and are recorded in
// expected/stats.json, which the test reads back.

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { beforeAll, describe, expect, test } from "vitest";
import { planCard } from "../../../tools/test-support/plan-root.js";
import type { Section } from "@hackbuild/geom";
import { flattenSvgPath, loadGeom, type Geom } from "@hackbuild/geom";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import type { Chase } from "@hackbuild/spec";
import type { VinylDraft } from "@hackbuild/copper";
import { exportVinyl, runVinyl, type VinylRun } from "@hackbuild/checks";
import { ROOT, chaseOf, loadInputs, paramsOf, read } from "./vinyl";
import { vinylGoldens } from "../../../core/src/commands/surface.js";

/** M05-T14's tolerances for a Clipper2 port of shapely geometry. */
export const TOL = { areaFrac: 0.002, clearanceMm: 0.005, span: 0.002, travelMm: 0.1, netXorFrac: 0.005 } as const;

export interface FamilyBuild {
  readonly draft: VinylDraft;
  readonly params: Readonly<Record<string, unknown>>;
}

export interface Legacy {
  readonly params: Record<string, unknown>;
  readonly stats: Record<string, unknown> & { readonly copper_area: number; readonly min_clearance: number };
  readonly nets: Record<string, string>;
  readonly vinyl: string;
  readonly accents: string;
  readonly electrodes: Record<string, string>;
}

export interface FamilyCtx {
  readonly g: Geom;
  readonly profile: ReturnType<typeof createProfileLookup>;
  /** The board at the chase defaults, or with JSON pointer edits. */
  readonly at: (edits?: Record<string, unknown>) => { readonly b: FamilyBuild; readonly r: VinylRun };
  readonly legacy: Legacy;
  /** A legacy path string (y written as H - y) as a region. */
  readonly region: (d: string) => Section;
}

export interface FamilyOptions<B extends FamilyBuild> {
  /** reference/copper/<name> */
  readonly dir: string;
  readonly name: string;
  readonly build: (p: never) => B;
  readonly chaseModule: Chase;
  /** Layer files the board writes. */
  readonly files: readonly string[];
  /** Board specific stats against the geometry JSON. */
  readonly stats: (ctx: FamilyCtx) => Record<string, number | readonly number[]>;
}

const gateLines = (text: string): string[] => text.split("\n").filter((l) => /^(PASS|FAIL) /.test(l));
const CLEARANCE = /^(PASS|FAIL) min clearance ([\d.]+) mm at (\S+) \(gate ([\d.]+)\)$/;

/** The M05-T13 table row of the board: gates passed, failed, least clearance, tightest pair. */
export function t13Row(name: string): { passed: number; failed: number; clearance: string; pair: string } {
  const card = planCard("M05-circuit-copper.md").split(/^## M05-T13 /m)[1]!.split(/^## M05-T14 /m)[0]!;
  const line = card.split("\n").find((l) => l.startsWith(`| ${name} |`));
  expect(line, `the M05-T13 table names ${name}`).toBeDefined();
  const c = line!.split("|").slice(1, -1).map((x) => x.trim());
  return { passed: Number(c[1]), failed: Number(c[2]), clearance: c[3]!, pair: c[4]! };
}

export function describeFamily<B extends FamilyBuild>(o: FamilyOptions<B>): void {
  const lower = o.name.toLowerCase();
  const ACCEPT = process.env["HBF_ACCEPT_VINYL"] === "1";
  const profile = createProfileLookup(loadProfile());
  const chase = chaseOf(o.dir);
  const inputs = loadInputs();
  const legacy = JSON.parse(read(`${o.dir}/legacy/${lower}_geometry.json`)) as Legacy;
  const H = Number(legacy.params["H"]);
  let g: Geom;
  const runs = new Map<string, { b: B; r: VinylRun }>();
  const at = (edits?: Record<string, unknown>): { b: B; r: VinylRun } => {
    const key = JSON.stringify(edits ?? {});
    let hit = runs.get(key);
    if (hit === undefined) {
      const b = o.build(paramsOf(chase, edits) as never);
      hit = { b, r: runVinyl(g, b.draft, inputs, profile) };
      runs.set(key, hit);
    }
    return hit;
  };
  const region = (d: string): Section => g.fromRings(flattenSvgPath(d, [1, 0, 0, -1, 0, H]), { fillRule: "EvenOdd", snap: false });
  const ctx = (): FamilyCtx => ({ g, profile, at, legacy, region });

  const golden = (file: string): unknown => (existsSync(new URL(`${o.dir}/expected/${file}`, ROOT)) ? JSON.parse(read(`${o.dir}/expected/${file}`)) : undefined);
  const accepted: string[] = [];
  const pin = (file: string, fresh: unknown): void => {
    if (ACCEPT) {
      mkdirSync(new URL(`${o.dir}/expected/`, ROOT), { recursive: true });
      writeFileSync(new URL(`${o.dir}/expected/${file}`, ROOT), `${JSON.stringify(fresh, null, 1)}\n`);
      accepted.push(file);
      return;
    }
    expect(fresh, `${o.dir}/expected/${file}; rewrite with HBF_ACCEPT_VINYL=1 npx vitest run ${o.dir}`).toEqual(golden(file));
  };

  beforeAll(async () => {
    g = await loadGeom();
  });

  describe(`${o.name} on packages/copper against the shipped generator`, () => {
    test("the surface chase reads as data and equals its module's export (D-178)", () => {
      expect(chaseOf(o.dir)).toStrictEqual(o.chaseModule);
    });

    test("gates pass line for line with the 2026-10-04 rerun; count, least clearance and tightest pair as the M05-T13 table", () => {
      const { r } = at();
      const want = gateLines(read(`${o.dir}/legacy/run-2026-10-04.txt`));
      const row = t13Row(o.name);
      expect(want).toHaveLength(row.passed + row.failed);
      expect(r.gates.map((x) => x.line).length).toBe(want.length);
      r.gates.forEach((x, i) => {
        const w = want[i]!;
        const m = CLEARANCE.exec(w);
        if (m === null) {
          expect(x.line, `gate ${i + 1}`).toBe(w);
          return;
        }
        const got = CLEARANCE.exec(x.line);
        expect(got, `gate ${i + 1}: ${x.line}`).not.toBeNull();
        expect([got![1], got![2], got![4]], `gate ${i + 1}`).toEqual([m[1], m[2], m[4]]);
        expect(m[2]).toBe(row.clearance);
        expect(m[3]).toBe(row.pair);
        // The tightest pair is a tie wherever the clearance is exact (copper TIE_MM); the generator's pair is one of the port's tied pairs.
        expect(String(x.finding.extra?.["ties"]).split(" "), `the generator's tightest pair ${m[3]} is in the port's tie`).toContain(m[3]);
      });
      expect([r.passed, r.failed]).toEqual([row.passed, row.failed]);
    });

    test("params round trip to the generator's P dict", () => {
      expect(at().b.params).toEqual(legacy.params);
    });

    test("stats: copper area, least clearance and the board's own figures", () => {
      const { r } = at();
      const s = legacy.stats;
      expect(Math.abs(r.board.copper.area() - s.copper_area) / s.copper_area).toBeLessThanOrEqual(TOL.areaFrac);
      const clr = r.gates.find((x) => x.line.includes("min clearance"))!;
      expect(Math.abs((clr.finding.measured as number) - s.min_clearance)).toBeLessThanOrEqual(TOL.clearanceMm);
      expect(Number(s["channels"])).toBe(r.board.draft.nets.length);
      const own = o.stats(ctx());
      expect(Object.keys(own).length).toBeGreaterThan(0);
    });

    test("each net within 0.2 percent of the shipped net's area and 0.5 percent symmetric difference; faceplate, accents and electrodes equal in area", () => {
      const { r } = at();
      expect(Object.keys(legacy.nets)).toEqual(r.board.draft.nets.map((n) => n.name));
      for (const [k, d] of Object.entries(legacy.nets)) {
        const L = region(d);
        const M = r.board.nets.get(k)!;
        const xor = L.difference(M).area() + M.difference(L).area();
        expect(Math.abs(M.area() - L.area()) / L.area(), k).toBeLessThanOrEqual(TOL.areaFrac);
        expect(xor / L.area(), k).toBeLessThanOrEqual(TOL.netXorFrac);
      }
      const mask = r.board.draft.mask!;
      const near = (got: number, want: number, what: string): void => {
        expect(Math.abs(got - want) / want, what).toBeLessThanOrEqual(TOL.areaFrac);
      };
      near(r.board.shape(mask.region).area(), region(legacy.vinyl).area(), "vinyl");
      near(r.board.shape(mask.accents).area(), region(legacy.accents).area(), "accents");
    });
  });

  describe(`${o.name} goldens and refusal`, () => {
    test("gates, stats, layer documents and stack equal expected/", () => {
      const { r } = at();
      const surface = vinylGoldens(r);
      pin("gates.json", surface["gates.json"]);
      pin("stats.json", {
        note: "computed by packages/copper and packages/checks at the chase defaults; tolerances are M05-T14's choice for a Clipper2 port of shapely geometry",
        tolerances: TOL,
        copperMm2: Number(r.board.copper.area().toFixed(4)),
        nets: Object.fromEntries([...r.board.nets].map(([k, s]) => [k, Number(s.area().toFixed(4))])),
        ...(r.board.lanes === undefined ? {} : { lanesUsed: r.board.lanes.used, lanesNeed: r.board.lanes.need, lanes: r.board.lanes.lane }),
        board: o.stats(ctx()),
      });
      pin("layers.json", surface["layers.json"]);
      pin("stack.json", surface["stack.json"]);
      if (!ACCEPT) expect((golden("stats.json") as { tolerances: unknown }).tolerances).toEqual(TOL);
    });

    test("every layer document reports the board's one size; export writes them only when every gate passes", () => {
      const { r } = at();
      expect(new Set(r.layers.map((l) => JSON.stringify(l.size)))).toEqual(new Set([JSON.stringify([legacy.params["W"], legacy.params["H"]])]));
      const ex = exportVinyl(r);
      expect(ex.written).toBe(true);
      if (ex.written) expect(ex.files.map((x) => x.file).sort()).toEqual([...o.files].sort());
    });

    test("a clearance gate above the board's least clearance refuses the board", () => {
      // On a board with a fan the clearance is also the lane margin (tw + clr), so the raised
      // gate can leave the lane ranker without a lane: the kernel refuses before any gate,
      // as the generator's SystemExit does. Otherwise the clearance gate fails and export refuses.
      const row = t13Row(o.name);
      const edits = { "/clr": Number((Number(row.clearance) + 0.1).toFixed(2)) };
      let after: { r: VinylRun } | undefined;
      try {
        after = at(edits);
      } catch (e) {
        expect(at().r.board.lanes, "only a fan board refuses at the lane ranker").toBeDefined();
        expect(String((e as Error).message)).toMatch(/^E_SCHEMA \/fan (no free fan lane for \S+: add a lane|need \d+ fan lanes, have \d+|lane constraints contain a cycle)/);
        return;
      }
      const line = after.r.gates.find((x) => x.line.includes("min clearance"))!;
      expect(line.ok).toBe(false);
      const ex = exportVinyl(after.r);
      expect(ex.written).toBe(false);
      if (!ex.written) expect(ex.failures).toContain(line.line);
    });

    test("goldens were compared, not written", () => {
      if (ACCEPT) console.info(`accepted ${accepted.join(", ")}`);
      expect(ACCEPT || accepted.length === 0).toBe(true);
    });
  });
}
