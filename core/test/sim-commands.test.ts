// M02-T11: sim.run, sim.sweep, asm.solve and part.probe through the CLI.
// Expected values come from outside the code under test: the check_sweep.py
// stdout in packages/sim/test/goldens/ogee-sweep-oracle.json, the hook_fit.py
// golden cotter-insert-oracle.json, the SASH bench's own captured check,
// designs/davit/contacts.json, the committed SLUG record, and an all-pairs
// distance over the DAVIT proxies written here. Wall time of this file is
// about 30 s on an Apple M1 (measured, shared machine).

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { decodeProxy, extractData } from "../../packages/sim/src/proxy/decode.js";
import { json, ROOT } from "./hbf.js";

type R = Record<string, unknown>;
const read = (p: string): string => readFileSync(path.join(ROOT, p), "utf8");
const golden = <T>(p: string): T => JSON.parse(read(p)) as T;
const round2 = (v: number): string => v.toFixed(2);

/** check_sweep.py stdout: the closest-approach table and the swept collisions. */
function oracleRun(variant: "shipped" | "proud"): { closest: Map<string, string>; clashes: string[] } {
  const g = golden<{ runs: Record<string, { exit: number; stdout: string }> }>("packages/sim/test/goldens/ogee-sweep-oracle.json");
  const out = g.runs[variant]!.stdout;
  const closest = new Map([...out.matchAll(/^\s+([\d.]+) mm\s+(.+?)\s+to (.+)$/gm)].map((m) => [`${m[2]} to ${m[3]!.trim()}`, m[1]!]));
  const clashes = [...out.matchAll(/!! (.+?) sweeps through (.+?):/g)].map((m) => `${m[1]} with ${m[2]}`).sort();
  return { closest, clashes };
}

describe("sim.sweep, mode rotate (OGEE16)", () => {
  it("shipped: exit 0, nine closest approaches equal to check_sweep.py at its 0.01 mm print", async () => {
    const { code, r } = await json("sim.sweep", "--scene", "ogee16-cranks", "--mode", "rotate");
    expect(code).toBe(0);
    expect(r.verdict).toBe("pass");
    const res = r.result as { closest: { body: string; with: string; mm: number; at: number[]; state: string }[]; clashes: unknown[]; sweptHash: string; poses: number };
    const want = oracleRun("shipped");
    expect(want.closest.size).toBe(9);
    expect(new Map(res.closest.map((c) => [`${c.body} to ${c.with}`, round2(c.mm)]))).toEqual(want.closest);
    expect(new Set(res.closest.map((c) => round2(c.mm)))).toEqual(new Set(["2.10", "3.02"]));
    for (const c of res.closest) {
      expect(c.at).toHaveLength(3);
      expect(c.state).toMatch(/^step \d+ of 25$/);
    }
    expect(res.clashes).toEqual([]);
    expect(res.poses).toBe(9 * 25);
    expect(res.sweptHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("proud-head fixture: exit 1, the clashes are check_sweep.py's eight bar cranks, each with its own servo", async () => {
    const { code, r } = await json("sim.sweep", "--scene", "ogee16-cranks-proud", "--mode", "rotate");
    expect(code).toBe(1);
    expect(r.verdict).toBe("fail");
    const res = r.result as { clashes: { body: string; with: string; mm3: number }[]; closest: { body: string; with: string; mm: number }[] };
    const want = oracleRun("proud");
    expect(want.clashes).toHaveLength(8);
    expect(res.clashes.map((c) => `${c.body} with ${c.with}`).sort()).toEqual(want.clashes);
    for (const c of res.clashes) expect(c.mm3).toBeGreaterThan(1);
    expect(new Map(res.closest.map((c) => [`${c.body} to ${c.with}`, round2(c.mm)]))).toEqual(want.closest);
  });

  it("--steps moves the placements; a mode the scene lacks is E_SCHEMA, exit 2", async () => {
    const bad = await json("sim.sweep", "--scene", "ogee16-cranks", "--mode", "insert");
    expect(bad.code).toBe(2);
    expect(bad.r.errors[0]).toMatchObject({ code: "E_SCHEMA", path: "/mode", expected: "rotate" });
    const steps = await json("sim.sweep", "--scene", "cotter-hook", "--steps", "5");
    expect(steps.code).toBe(2);
    expect(steps.r.errors[0]).toMatchObject({ code: "E_SCHEMA", path: "/steps" });
  });
});

interface OracleCase { id: string; hole: number; tb: number; inserts: boolean; dims: { d: number; Rb: number; sweep: number; ext?: number; gap?: number } }

describe("sim.sweep, mode insert (COTTER)", () => {
  const oracle = golden<{ cases: OracleCase[] }>("packages/sim/test/goldens/cotter-insert-oracle.json").cases;

  it("cotter-hook: exit 0, eight cases INSERTS with the dims hook_fit.py design_full gives", async () => {
    const { code, r } = await json("sim.sweep", "--scene", "cotter-hook", "--mode", "insert");
    expect(code).toBe(0);
    const cases = (r.result as { cases: { id: string; verdict: string; dims: OracleCase["dims"] }[] }).cases;
    const want = oracle.filter((c) => c.id !== "sharp");
    expect(cases.map((c) => [c.id, c.verdict])).toEqual(want.map((c) => [c.id, c.inserts ? "INSERTS" : "TRAPPED"]));
    expect(cases.map((c) => c.dims)).toEqual(want.map((c) => c.dims));
  });

  it("cotter-hook-sharp: exit 1, TRAPPED as the oracle finds it", async () => {
    const { code, r } = await json("sim.sweep", "--scene", "cotter-hook-sharp", "--mode", "insert");
    expect(code).toBe(1);
    expect(r.verdict).toBe("fail");
    const sharp = oracle.find((c) => c.id === "sharp")!;
    expect(sharp.inserts).toBe(false);
    expect((r.result as { cases: { verdict: string; maxTiltDeg: number }[] }).cases.map((c) => c.verdict)).toEqual(["TRAPPED"]);
  });
});

describe("sim.sweep, mode prismatic (SASH)", () => {
  it("sash-slide: overlap per lane equals the bench's captured runCheck", async () => {
    const { code, r } = await json("sim.sweep", "--scene", "sash-slide");
    const fx = golden<{ check: { name: string; overlapCells: number }[] }>("designs/sash/extract/fixtures/battery-default.json");
    expect(code).toBe(fx.check.every((l) => l.overlapCells === 0) ? 0 : 1);
    const res = r.result as { clashes: { body: string; cells: number }[]; closest: { body: string; mm: number }[]; mode: string };
    expect(res.mode).toBe("prismatic");
    expect(res.clashes.map((c) => [c.body, c.cells])).toEqual(fx.check.filter((l) => l.overlapCells > 0).map((l) => [l.name, l.overlapCells]));
    expect(res.closest.map((c) => c.body)).toEqual(fx.check.map((l) => l.name));
  });
});

type Pair = { a: string; b: string };
const contacts = golden<{ models: { std: { pairs: Pair[] }; mini: { pairs: Pair[] } }; hub: Pair }>("designs/davit/contacts.json");
const declaredOf = (model: "std" | "mini"): string[] => [...contacts.models[model].pairs, contacts.hub].map((p) => (p.a < p.b ? `${p.a}|${p.b}` : `${p.b}|${p.a}`)).sort();
const declared = declaredOf("std");

interface StageARow { poses: number; declaredPairs: number; realFailCount: number; leftRightContacts: number; closestMm: Record<string, number> }
/** The committed T06 record, written by `npm run davit:sweep` (Stage A rows printed to 0.001 mm). */
const davitRecord = golden<{ poseSets: { gated: { poses: number } }; models: Record<"std" | "mini", Record<string, Record<"R" | "L", { stageA: StageARow }>>> }>("packages/sim/records/davit-sweep.json");

describe("sim.sweep, mode pose (DAVIT)", () => {
  it("davit-std-1in: exit 0, 0 real fails over the gated set on both arms, a closest approach per declared pair per side", async () => {
    const { code, r } = await json("sim.sweep", "--scene", "davit-std-1in", "--mode", "pose");
    expect(code).toBe(0);
    const res = r.result as { realFailCount: number; closest: { body: string; with: string; mm: number }[]; poses: number };
    expect(res.realFailCount).toBe(0);
    for (const side of ["R", "L"]) {
      const pairs = res.closest.filter((c) => c.body.endsWith(`@${side}`)).map((c) => `${c.body.split("@")[0]}|${c.with.split("@")[0]}`).sort();
      expect(pairs).toEqual(declared);
    }
  });
});

describe("sim.sweep, mode pose (DAVIT MINI)", () => {
  it("the davit scenes are every model and pipe the scene module sweeps, std and MINI", async () => {
    const { SIM_SCENES } = await import("../../packages/sim/src/scenes.js");
    const { MODELS, PIPES } = await import("../../packages/sim/scenes/davit.js");
    const ids = SIM_SCENES.filter((d) => d.file === "davit.ts").map((d) => d.id).sort();
    expect(ids).toEqual(MODELS.flatMap((m) => PIPES.map((p) => `davit-${m}-${p}`)).sort());
    expect(MODELS).toEqual(Object.keys(davitRecord.models));
  });

  it.each(["1in", "125in", "15in"])("davit-mini-%s: the record's Stage A rows, both arms: real fails, left-right contacts and the closest approach of each declared pair", async (pipe) => {
    const { code, r } = await json("sim.sweep", "--scene", `davit-mini-${pipe}`, "--mode", "pose");
    const res = r.result as { realFailCount: number; closest: { body: string; with: string; mm: number }[]; poses: number; expectation: { measured: string } };
    const rows = davitRecord.models.mini[pipe]!;
    const fails = rows.R.stageA.realFailCount + rows.L.stageA.realFailCount;
    const lr = rows.R.stageA.leftRightContacts + rows.L.stageA.leftRightContacts;
    expect(code).toBe(fails === 0 && lr === 0 ? 0 : 1);
    expect(res.realFailCount).toBe(fails);
    expect(res.expectation.measured).toBe(`${fails} real fails, ${lr} left-right contacts`);
    expect(res.poses).toBe(rows.R.stageA.poses + rows.L.stageA.poses);
    expect(res.poses).toBe(2 * davitRecord.poseSets.gated.poses);
    for (const side of ["R", "L"] as const) {
      const got = Object.fromEntries(res.closest.filter((c) => c.body.endsWith(`@${side}`)).map((c) => [`${c.body.split("@")[0]}|${c.with.split("@")[0]}`, c.mm]));
      const want = rows[side].stageA.closestMm;
      expect(Object.keys(got).sort()).toEqual(declaredOf("mini"));
      expect(Object.keys(want).sort()).toEqual(declaredOf("mini"));
      // The record prints to 0.001 mm, so the port lands within half of that.
      for (const [pair, mm] of Object.entries(want)) expect(Math.abs(got[pair]! - mm), `${pair} ${side}`).toBeLessThanOrEqual(0.0005 + 1e-9);
    }
  }, 120_000);

  it("asm.solve places the MINI arms: micro servos at every joint, the MINI links, 0 real fails at REACH", async () => {
    const { code, r } = await json("asm.solve", "--scene", "davit-mini-125in", "--pose", "REACH");
    expect(code).toBe(0);
    const res = r.result as { realFails: unknown[]; closest: { pair: string; side: string }[]; placements: Record<string, unknown> };
    expect(res.realFails).toEqual([]);
    for (const side of ["R", "L"]) expect(res.closest.filter((c) => c.side === side).map((c) => c.pair).sort()).toEqual(declaredOf("mini"));
    expect(Object.keys(res.placements).filter((k) => k.startsWith("std_"))).toEqual([]);
    expect(Object.keys(res.placements).filter((k) => k.startsWith("mic_servo") && k.endsWith("@R"))).toHaveLength(5);
  });
});

interface Placement { frame: string; pos: number[]; rot: number[] }

describe("asm.solve (DAVIT)", () => {
  it("davit-std-1in at REACH: exit 0, 0 real fails, a closest approach for every declared pair on each arm", async () => {
    const { code, r } = await json("asm.solve", "--scene", "davit-std-1in", "--pose", "REACH");
    expect(code).toBe(0);
    const res = r.result as { realFails: unknown[]; closest: { pair: string; side: string; mm: number; a: number[]; b: number[] }[]; placements: Record<string, Placement>; unsatisfied: unknown[] };
    expect(res.realFails).toEqual([]);
    for (const side of ["R", "L"]) expect(res.closest.filter((c) => c.side === side).map((c) => c.pair).sort()).toEqual(declared);
    for (const c of res.closest) expect(Math.hypot(c.a[0]! - c.b[0]!, c.a[1]! - c.b[1]!, c.a[2]! - c.b[2]!)).toBeCloseTo(c.mm, 9);
    // mount, both bases and 17 bodies per arm (davit.html chain: 7 links and 10 servos and horns)
    expect(Object.keys(res.placements)).toHaveLength(3 + 2 * 17);
    expect(res.placements["mount"]).toEqual({ frame: "assembly", pos: [0, 0, 0], rot: [0, 0, 0, 1] });
    const lb = res.placements["base@L"]!;
    expect(Math.abs(lb.rot[2]!)).toBeCloseTo(1, 12);
    expect(res.unsatisfied).toEqual([]);
  });

  it("--clamp bisects 8 times: the clamped value is clear, the contact value is not, 180/256 deg apart", async () => {
    const { r } = await json("asm.solve", "--scene", "davit-std-125in", "--pose", "HANG", "--clamp", "elbow=180");
    const c = (r.result as { clamp: { from: number; requested: number; clamped: number; contactAt: number; iterations: number; failsAtRequest: number } }).clamp;
    expect(c.iterations).toBe(8);
    expect(c.failsAtRequest).toBeGreaterThan(0);
    expect(c.contactAt - c.clamped).toBeCloseTo((c.requested - c.from) / 2 ** 8, 12);
    const at = await json("asm.solve", "--scene", "davit-std-125in", "--pose", "HANG", "--clamp", `elbow=${c.clamped}`);
    expect((at.r.result as { clamp: { contactAt: number | null } }).clamp.contactAt).toBeNull();
    const past = await json("asm.solve", "--scene", "davit-std-125in", "--pose", "HANG", "--clamp", `elbow=${c.contactAt}`);
    expect((past.r.result as { clamp: { failsAtRequest: number } }).clamp.failsAtRequest).toBeGreaterThan(0);
  });

  it("a scene with no assembly and an unknown pose are input errors, exit 2", async () => {
    expect((await json("asm.solve", "--scene", "slug")).code).toBe(2);
    const pose = await json("asm.solve", "--scene", "davit-std-1in", "--pose", "REECH");
    expect(pose.code).toBe(2);
    expect(pose.r.errors[0]).toMatchObject({ code: "E_REF", path: "/pose" });
    expect(pose.r.errors[0]?.didYouMean?.[0]).toBe("REACH");
  });
});

describe("part.probe (DAVIT)", () => {
  it("crank to upper at HANG: exit 0, a distance in mm equal to an all-pairs search over the placed proxies", async () => {
    const { code, r } = await json("part.probe", "--scene", "davit-std-1in", "--a", "crank", "--b", "upper", "--pose", "HANG");
    expect(code).toBe(0);
    expect(r.verdict).toBe("skip");
    const res = r.result as { mm: number; a: { point: number[] }; b: { point: number[] }; declared: boolean; maskedMm: number };
    const asm = await json("asm.solve", "--scene", "davit-std-1in", "--pose", "HANG");
    const place = (asm.r.result as { placements: Record<string, Placement> }).placements;
    const data = extractData(read("designs/davit/legacy/davit.html"));
    const world = (key: string, p: Placement): number[][] => {
      const px = decodeProxy(data.prox[key]!);
      const [x, y, z, w] = p.rot as [number, number, number, number];
      const out: number[][] = [];
      for (let i = 0; i < px.n; i += 1) {
        const v = [px.pts[i * 3]!, px.pts[i * 3 + 1]!, px.pts[i * 3 + 2]!] as const;
        // v + 2 q x (q x v + w v), the quaternion rotation
        const t = [2 * (y * v[2] - z * v[1]), 2 * (z * v[0] - x * v[2]), 2 * (x * v[1] - y * v[0])];
        out.push([v[0] + w * t[0]! + (y * t[2]! - z * t[1]!) + p.pos[0]!, v[1] + w * t[1]! + (z * t[0]! - x * t[2]!) + p.pos[1]!, v[2] + w * t[2]! + (x * t[1]! - y * t[0]!) + p.pos[2]!]);
      }
      return out;
    };
    const A = world("crank", place["crank@R"]!), B = world("upper", place["upper@R"]!);
    let best = Infinity;
    for (const p of A) for (const q of B) best = Math.min(best, Math.hypot(p[0]! - q[0]!, p[1]! - q[1]!, p[2]! - q[2]!));
    expect(res.mm).toBeCloseTo(best, 6);
    expect(Math.hypot(...res.a.point.map((v, i) => v - res.b.point[i]!))).toBeCloseTo(res.mm, 9);
    expect(res.declared).toBe(declared.includes("crank|upper"));
    expect(res.maskedMm).toBeGreaterThanOrEqual(res.mm);
  }, 120_000);
});

describe("sim.run", () => {
  it("an unknown scene is E_REF with didYouMean, exit 2", async () => {
    const { code, r } = await json("sim.run", "--scene", "nope");
    expect(code).toBe(2);
    expect(r.errors[0]).toMatchObject({ code: "E_REF", path: "/scene", got: "nope" });
    expect(r.errors[0]?.didYouMean?.length).toBeGreaterThan(0);
    const near = await json("sim.run", "--scene", "slgu");
    expect(near.r.errors[0]?.didYouMean).toContain("slug");
  });

  it("a --build no chase can declare a scene for is E_REF; no target is E_PARAM_MISSING", async () => {
    const b = await json("sim.run", "--build", "hbf://build/0000");
    expect(b.code).toBe(2);
    expect(b.r.errors[0]).toMatchObject({ code: "E_REF", path: "/build" });
    const none = await json("sim.run");
    expect(none.r.errors[0]).toMatchObject({ code: "E_PARAM_MISSING", path: "/build" });
  });

  it("slug-vend1: trials and seed move the run; nothing declared is verdict skip, exit 0; a rerun hashes the same", async () => {
    const one = await json("sim.run", "--scene", "slug-vend1", "--trials", "2", "--seed", "5");
    expect(one.code).toBe(0);
    expect(one.r.verdict).toBe("skip");
    const res = one.r.result as { trials: { runs: number; passes: number; worst: string; seed: number; snapshotHash: string }; rows: { seed: number; hash: string }[] };
    expect(res.rows.map((x) => x.seed)).toEqual([5, 6]);
    expect(res.trials.runs).toBe(2);
    expect(res.trials.seed).toBe(5);
    expect(res.trials.snapshotHash).toBe(res.rows[1]!.hash);
    const two = await json("sim.run", "--scene", "slug-vend1", "--trials", "2", "--seed", "5");
    expect((two.r.result as typeof res).rows.map((x) => x.hash)).toEqual(res.rows.map((x) => x.hash));
  });

  it("slug: 8 trials against the declared 126 of 128, the committed record's measured set and hash, exit 1 while they differ", async () => {
    const rec = golden<{ exitRow: string; trials8: { result: { passes: number; runs: number; snapshotHash: string } } }>("packages/sim/records/slug-trials.json");
    const { code, r } = await json("sim.run", "--scene", "slug");
    const res = r.result as { trials: { passes: number; runs: number; snapshotHash: string }; expectation: { measured: string; met: boolean } };
    expect([res.trials.passes, res.trials.runs, res.trials.snapshotHash]).toEqual([rec.trials8.result.passes, rec.trials8.result.runs, rec.trials8.result.snapshotHash]);
    expect(res.expectation.measured).toBe(rec.exitRow);
    expect(code).toBe(res.expectation.met ? 0 : 1);
  });
});
