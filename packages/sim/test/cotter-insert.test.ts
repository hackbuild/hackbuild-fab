// M02-T09: insertion by search, COTTER hook. Expected values come from the
// oracle golden (test/goldens/cotter-insert-oracle.json, written by
// scripts/cotter_insert_oracle.py running hook_fit.py unedited), never from
// the port. Verdicts, the shapely predicate at fixed poses and the clip and
// board outlines are gated; pose counts and max tilt are stored beside the
// oracle's in records/cotter-insert.json and not gated against it, since
// CrossSection and shapely outlines differ at the vertex level (card).
// HBF_COTTER_RECORD=1 (`npm run cotter:record -w packages/sim`) rewrites the
// record; otherwise the port's own numbers are compared to it, so a change
// to the search shows up as a diff.

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { cpus } from "node:os";
import { beforeAll, describe, expect, test } from "vitest";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { kernel, liveCount, loadManifold, scope } from "@hackbuild/mesh";
import { boardSection, clipSection, hookCentreline, type HookDims } from "../src/programs/cotter/hook.js";
import { insertSearch } from "../src/sweep/insert.js";
import { SHARP_CASE, clipConstants, hookCases, insertSettings, kitBoard, runHookCase, verifyPairs, type HookCase, type HookCaseResult } from "../scenes/cotter-hook.js";

const root = new URL("../../../", import.meta.url);
const read = (p: string): Buffer => readFileSync(new URL(p, root));
const sha = (b: Uint8Array): string => createHash("sha256").update(b).digest("hex");
const profile = createProfileLookup(loadProfile());
const RECORD = "packages/sim/records/cotter-insert.json";

type State = [number, number, number];
interface OracleCase {
  id: string; from: string; hole: number; tb: number;
  dims: { d: number; Rb: number; sweep: number; ext?: number; gap?: number };
  clip: { area: number; bounds: number[]; top: number; tip: number[] };
  board: { area: number; bounds: number[] };
  inserts: boolean; msg: string; poses: number; maxTiltDeg: number | null; clearing: State | null; path: State[];
}
const golden = JSON.parse(read("packages/sim/test/goldens/cotter-insert-oracle.json").toString("utf8")) as {
  source: { file: string; sha256: string }; kit: { file: string; sha256: string }; env: Record<string, string>;
  verify: { exit: number; stdout: string };
  cases: OracleCase[];
  probes: { case: string; poses: { state: State; intersects: boolean; minX: number }[] };
};
const oracle = new Map(golden.cases.map((c) => [c.id, c]));
const oracleOf = (id: string): OracleCase => oracle.get(id) ?? (() => { throw new Error(`no oracle case ${id}`); })();
/** The test's binding of `design`: the oracle's own design_full output for that hole and board. */
const design = (hole: number, tb: number): HookDims => {
  const c = golden.cases.find((x) => x.hole === hole && x.tb === tb && x.id !== "sharp");
  if (c === undefined || c.dims.ext === undefined || c.dims.gap === undefined) throw new Error(`no design_full output for ${hole}, ${tb}`);
  return { d: c.dims.d, Rb: c.dims.Rb, sweep: c.dims.sweep, ext: c.dims.ext, gap: c.dims.gap };
};
const ALL: HookCase[] = [...hookCases(), SHARP_CASE];

describe("oracle golden", () => {
  test("names the oracle and the kit layout by their lineage rows and the stored copies by sha256", () => {
    const lineage = JSON.parse(read("lineage.json").toString("utf8")) as { id: string; source: string; sha256: string }[];
    const row = (id: string) => lineage.find((r) => r.id === id)!;
    expect([golden.source.file, golden.source.sha256]).toEqual([row("cotter.hook-fit/r5").source, row("cotter.hook-fit/r5").sha256]);
    expect([golden.kit.file, golden.kit.sha256]).toEqual([row("cotter.kit-layout/2026-09-21").source, row("cotter.kit-layout/2026-09-21").sha256]);
    // The layout is stored whole, so its copy has the source sha256; the scene reads that copy.
    expect(sha(read("packages/sim/scenes/inputs/cotter-hook/kit-2026-09-21-layout.json"))).toBe(golden.kit.sha256);
  });

  test("verify_all: exit 0, seven lines INSERTS", () => {
    expect(golden.verify.exit).toBe(0);
    const lines = golden.verify.stdout.trim().split("\n");
    expect(lines).toHaveLength(7);
    for (const l of lines) expect(l).toMatch(/\| INSERTS \(clear after \d+ poses, max tilt \d+ deg\)$/);
  });

  test("the sharp case is TRAPPED in the oracle, max tilt 12 deg (M02-sim.md records)", () => {
    const s = oracleOf("sharp");
    expect([s.inserts, s.msg]).toEqual([false, "trapped, max tilt 12 deg"]);
  });
});

describe("scene", () => {
  test("cases equal the oracle's: verify_all pairs in order, the kit board, then the sharp fixture", () => {
    expect(verifyPairs()).toHaveLength(7);
    expect(ALL.map((c) => [c.id, c.hole, c.tb])).toEqual(golden.cases.map((c) => [c.id, c.hole, c.tb]));
    expect(kitBoard()).toEqual({ hole: 6.35, tb: 4.1 });
    const s = oracleOf("sharp");
    expect([SHARP_CASE.dims?.d, SHARP_CASE.dims?.Rb, SHARP_CASE.dims?.sweep]).toEqual([s.dims.d, s.dims.Rb, s.dims.sweep]);
  });

  test("kit board: design_full gives rod 5.40, bend R 6.70, sweep 68 (card step 5)", () => {
    expect(design(6.35, 4.1)).toEqual({ d: 5.4, Rb: 6.7, sweep: 68, ext: 2, gap: 0.6 });
  });
});

describe("clip and board outlines against shapely", () => {
  beforeAll(loadManifold);
  const k = clipConstants(profile);

  test("centreline: the tip and top equal hook_fit.py clip_poly info", () => {
    for (const c of ALL) {
      const o = oracleOf(c.id);
      const cl = hookCentreline(c.tb, c.dims ?? design(c.hole, c.tb), k);
      const tip = cl[cl.length - 1]!;
      expect(tip[0], c.id).toBeCloseTo(o.clip.tip[0]!, 10);
      expect(tip[1], c.id).toBeCloseTo(o.clip.tip[1]!, 10);
      expect(cl).toHaveLength(k.arcSegments + 3);
    }
  });

  test("clip area within 0.05 percent and bounds within 0.01 mm of shapely's buffer, every case", async () => {
    for (const c of ALL) {
      const o = oracleOf(c.id);
      const clip = await clipSection(c.tb, c.dims ?? design(c.hole, c.tb), k);
      expect(Math.abs(clip.area - o.clip.area) / o.clip.area, c.id).toBeLessThan(5e-4);
      clip.bounds.forEach((v, i) => expect(Math.abs(v - o.clip.bounds[i]!), `${c.id} bounds ${i}`).toBeLessThan(0.01));
      expect(clip.info.top, c.id).toBeCloseTo(o.clip.top, 10);
    }
    expect(liveCount()).toBe(0);
  });

  test("inset board area and bounds equal shapely's", async () => {
    for (const c of ALL) {
      const o = oracleOf(c.id);
      const b = await boardSection(c.tb, c.hole, k);
      expect(b.area, c.id).toBeCloseTo(o.board.area, 6);
      b.bounds.forEach((v, i) => expect(v, `${c.id} bounds ${i}`).toBeCloseTo(o.board.bounds[i]!, 9));
    }
    expect(liveCount()).toBe(0);
  });

  test("the overlap test and least x at the oracle's probe poses equal shapely's", async () => {
    const c = ALL.find((x) => x.id === golden.probes.case)!;
    const st = insertSettings(profile);
    const clip = await clipSection(c.tb, design(c.hole, c.tb), k);
    const board = await boardSection(c.tb, c.hole, k);
    expect(golden.probes.poses.length).toBeGreaterThan(40);
    scope(() => {
      const CS = kernel().CrossSection;
      const moving = new CS(clip.polygons, "Positive");
      const obstacle = new CS(board.polygons, "Positive");
      for (const p of golden.probes.poses) {
        const [t, i, j] = p.state;
        const g = moving.rotate(t * st.tiltStep).translate(i * st.xyStep, j * st.xyStep);
        expect(!g.intersect(obstacle).isEmpty(), `overlap at ${p.state.join(",")}`).toBe(p.intersects);
        expect(Math.abs(g.bounds().min[0] - p.minX), `least x at ${p.state.join(",")}`).toBeLessThan(0.01);
      }
      return 0;
    });
    expect(liveCount()).toBe(0);
  });
});

describe("search", () => {
  beforeAll(loadManifold);

  test("a seated pose that overlaps stops at once; an empty obstacle clears on the first pose with x past clearX", async () => {
    const st = insertSettings(profile);
    const sq = (x0: number, x1: number): [number, number][] => [[x0, -1], [x1, -1], [x1, 1], [x0, 1]];
    const seated = await insertSearch({ moving: [sq(-1, 1)], obstacle: [sq(0, 2)], settings: st });
    expect([seated.reached, seated.stop, seated.poses]).toEqual([false, "seated", 0]);
    const free = await insertSearch({ moving: [sq(-1, 1)], obstacle: [sq(-50, -40)], settings: st, trace: true });
    expect([free.reached, free.stop]).toEqual([true, "clear"]);
    expect(free.clearing!.minXMm).toBeGreaterThan(st.clearX);
    expect(free.path![free.path!.length - 1]).toEqual(free.clearing!.state);
    expect(free.path!.slice(0, -1).length).toBe(free.poses - 1);
    expect(liveCount()).toBe(0);
  });

  const results = new Map<string, HookCaseResult>();
  test("verdicts equal the oracle on all nine cases; each equals its declared expectation", async () => {
    for (const c of ALL) {
      const r = await runHookCase(c, design, profile, { trace: true });
      results.set(c.id, r);
      const o = oracleOf(c.id);
      expect(r.verdict, c.id).toBe(o.inserts ? "INSERTS" : "TRAPPED");
      expect(r.verdict, c.id).toBe(c.expect);
    }
    expect(results.get("sharp")!.verdict).toBe("TRAPPED");
    expect(results.get("sharp")!.stop).toBe("exhausted");
    expect(liveCount()).toBe(0);
  });

  test("a clearing pose is free of the board and past clearX; the trapped case reports no pose", async () => {
    const k = clipConstants(profile);
    const st = insertSettings(profile);
    for (const c of ALL) {
      const r = results.get(c.id)!;
      if (r.verdict === "TRAPPED") {
        expect(r.clearing, c.id).toBeNull();
        continue;
      }
      const clip = await clipSection(c.tb, r.dims, k);
      const board = await boardSection(c.tb, c.hole, k);
      const p = r.clearing!;
      scope(() => {
        const CS = kernel().CrossSection;
        const g = new CS(clip.polygons, "Positive").rotate(p.tiltDeg).translate(p.xMm, p.yMm);
        expect(g.intersect(new CS(board.polygons, "Positive")).isEmpty(), c.id).toBe(true);
        expect(g.bounds().min[0], c.id).toBeGreaterThan(st.clearX);
        return 0;
      });
      expect(r.path![r.path!.length - 1], c.id).toEqual(p.state);
      expect(r.poses, c.id).toBe(r.path!.length);
      expect(r.maxTiltDeg, c.id).toBe(Math.max(...r.path!.map((s) => s[0] * st.tiltStep)));
    }
    expect(liveCount()).toBe(0);
  });

  test("record: port numbers beside the oracle's", () => {
    const rows = ALL.map((c) => {
      const r = results.get(c.id)!;
      const o = oracleOf(c.id);
      let prefix = 0;
      while (prefix < Math.min(r.path!.length, o.path.length) && r.path![prefix]!.join() === o.path[prefix]!.join()) prefix += 1;
      return {
        id: c.id, hole: c.hole, tb: c.tb, dims: r.dims, expect: c.expect,
        oracle: { verdict: o.inserts ? "INSERTS" : "TRAPPED", poses: o.poses, maxTiltDeg: o.maxTiltDeg, clearing: o.clearing, msg: o.msg },
        port: { verdict: r.verdict, stop: r.stop, poses: r.poses, maxTiltDeg: r.maxTiltDeg, clearing: r.clearing?.state ?? null },
        samePathPrefix: prefix,
        portWallMs: Math.round(r.wallMs),
      };
    });
    const portOnly = rows.map(({ id, port, samePathPrefix }) => ({ id, port, samePathPrefix }));
    if (process.env["HBF_COTTER_RECORD"] === "1") {
      const record = {
        record: "cotter-insert",
        card: "M02-T09",
        date: new Date().toISOString().slice(0, 10),
        qualifier: "verdicts, pose counts, tilts and clearing poses are computed; wall times are measured on the named machine and are not gated",
        command: "npm run cotter:record -w packages/sim",
        machine: { cpu: cpus()[0]?.model ?? "unknown", cores: cpus().length, os: `${process.platform} ${process.arch}`, node: process.version, note: "shared with other builds while it ran; wall times include contention" },
        oracle: { file: golden.source.file, sha256: golden.source.sha256, env: golden.env },
        gate: "verdict equal to the oracle and to the scene's expectation; poses and max tilt are not gated against the oracle (card M02-T09 acceptance)",
        cases: rows,
      };
      writeFileSync(new URL(RECORD, root), JSON.stringify(record, null, 1) + "\n");
      return;
    }
    const rec = JSON.parse(read(RECORD).toString("utf8")) as { cases: typeof rows };
    expect(rec.cases.map(({ id, port, samePathPrefix }) => ({ id, port, samePathPrefix }))).toEqual(portOnly);
    expect(rec.cases.map((c) => c.oracle)).toEqual(rows.map((c) => c.oracle));
  });
});
