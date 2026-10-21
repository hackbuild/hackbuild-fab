// M02-T07: rotational swept volume, OGEE16 pin heads. Expected values come
// from the oracle's own stdout (packages/sim/test/goldens/ogee-sweep-oracle.json, written
// by packages/sim/scripts/ogee_sweep_oracle.py running check_sweep.py unedited), from the
// kin.py numbers in that golden, from printed.scad's pin_seat() comment and
// from manifold-3d's own minGap; never from the port. HBF_OGEE_RECORD=1
// (`npm run ogee:record -w core`) also writes packages/sim/records/ogee-sweep.json.
// It runs in core/test because the sweep reads every placement from
// packages/motion through core's binding; sim may not import motion (D-139).

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { cpus } from "node:os";
import { beforeAll, describe, expect, test } from "vitest";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { isThrownCommandError } from "@hackbuild/spec";
import { kernel, liveCount, loadManifold, scope } from "@hackbuild/mesh";
import { boxCorners, boxToMesh, pointsToMesh } from "../../packages/sim/src/closest.js";
import { placeMesh, rotateSweep } from "../../packages/sim/src/sweep/rotate.js";
import { applyPoint } from "@hackbuild/motion";
import { bindKinematics, CRANK_FILES, ogeeCranks, ogeeParams, runOgeeSweep, servoBoxes, type OgeeSweepRun } from "../../packages/sim/scenes/ogee16-cranks.js";
import { kinematics } from "./kinematics-binding.js";

bindKinematics(kinematics);

const root = new URL("../../", import.meta.url);
const read = (p: string): Buffer => readFileSync(new URL(p, root));
const sha = (b: Uint8Array): string => createHash("sha256").update(b).digest("hex");
const profile = createProfileLookup(loadProfile());
const STEPS = profile.constant("ogee16.sweepSteps").value;
const CLASH_MM3 = profile.constant("ogee16.sweepClashMm3").value;

interface OracleRun { readonly exit: number; readonly stdout: string }
const golden = JSON.parse(read("packages/sim/test/goldens/ogee-sweep-oracle.json").toString("utf8")) as {
  checkSweepSha256: string; paramsSha256: string; fixtureSha256: Record<string, string>; shippedSha256: Record<string, string>;
  versions: Record<string, string>; placement: { params: Record<string, number>; barPhiDeg: number[]; latchPhiDeg: number[]; rowPin: number[][][]; colPin: number[][][] };
  runs: { shipped: OracleRun; proud: OracleRun };
};

/** The oracle's printed clashes and closest approaches, as check_sweep.py formats them. */
function parseOracle(out: string) {
  const clashes = [...out.matchAll(/^ {3}!! (.+?) sweeps through (.+?): ([\d.]+) mm3$/gm)].map((m) => ({ sweep: m[1]!, with: m[2]!, mm3: Number(m[3]) }));
  const near = [...out.matchAll(/^ +([\d.]+) mm {3}(.+?) +to (.+?)(?: {2}<-- tight)?$/gm)].map((m) => ({ sweep: m[2]!, box: m[3]!, mm: Number(m[1]) }));
  return { clashes, near };
}

describe("oracle golden", () => {
  test("names the legacy oracle, params and STLs byte for byte", () => {
    expect(sha(read("designs/ogee16/legacy/source/check_sweep.py"))).toBe(golden.checkSweepSha256);
    expect(sha(read("designs/ogee16/legacy/source/params.scad"))).toBe(golden.paramsSha256);
    const sums = read("designs/ogee16/extract/fixtures/proud-head/SHA256SUMS").toString("utf8");
    for (const c of CRANK_FILES) {
      expect(sha(read(`designs/ogee16/legacy/out/print/${c}.stl`))).toBe(golden.shippedSha256[c]);
      const fx = sha(read(`designs/ogee16/extract/fixtures/proud-head/${c}.stl`));
      expect(fx).toBe(golden.fixtureSha256[c]);
      expect(sums).toContain(`${fx}  ${c}.stl`);
    }
  });

  test("shipped geometry: exit 0, no swept collisions; fixture: exit 1, eight", () => {
    expect(golden.runs.shipped.exit).toBe(0);
    expect(golden.runs.shipped.stdout).toContain("   no swept collisions");
    expect(golden.runs.proud.exit).toBe(1);
    expect(golden.runs.proud.stdout).toContain("   8 swept collisions");
  });
});

describe("placements from params.scad", () => {
  const P = ogeeParams();

  test("the params core binds equal every scalar kin.load_params reads", () => {
    const want = golden.placement.params;
    expect([...P.keys()].sort()).toEqual(Object.keys(want).sort());
    for (const [k, v] of Object.entries(want)) expect(P.get(k), k).toBeCloseTo(v, 12);
  });

  test("crank angles at the oracle's steps, equal to kin.crank_phi and check_sweep.py lphi", () => {
    const S = P.get("STROKE")!;
    const { crankPhi, lCrankPhi } = kinematics.ogee16;
    golden.placement.barPhiDeg.forEach((phi, k) => expect(crankPhi((S * k) / 24)).toBeCloseTo(phi, 10));
    golden.placement.latchPhiDeg.forEach((phi, k) => expect(lCrankPhi((P.get("LP_SLIDE")! * k) / 24)).toBeCloseTo(phi, 10));
  });

  test("each bar crank placement carries its drive pin to kin.crank_pin_row and crank_pin_col at every step", () => {
    // printed.scad a_crank_row and a_crank_col (lines 416 to 423) seat the pin at (RSV_CRK, CRANK_R, 0) and (CRANK_R, CSV_CRK, 0) in the crank frame.
    const R = P.get("CRANK_R")!;
    const cranks = ogeeCranks(P, "shipped");
    for (let i = 0; i < 4; i += 1) {
      golden.placement.rowPin[i]!.forEach((want, k) => {
        const got = applyPoint(cranks[i]!.place(k / 24), [P.get("RSV_CRK")!, R, 0]);
        got.forEach((v, a) => expect(v, `row ${i} step ${k}`).toBeCloseTo(want[a]!, 9));
      });
      golden.placement.colPin[i]!.forEach((want, k) => {
        const got = applyPoint(cranks[4 + i]!.place(k / 24), [R, P.get("CSV_CRK")!, 0]);
        got.forEach((v, a) => expect(v, `col ${i} step ${k}`).toBeCloseTo(want[a]!, 9));
      });
    }
  });

  test("the latch crank pin moves the plate LP_SLIDE in +y over the stroke (kin.py state lp)", () => {
    const latch = ogeeCranks(P, "shipped")[8]!;
    const pin = [P.get("LSV_X")! + P.get("LCRANK_R")!, P.get("LSV_Y")!, P.get("LSV_SHAFT_Z")!];
    const y0 = applyPoint(latch.place(0), pin)[1];
    for (let k = 0; k <= 24; k += 1) expect(applyPoint(latch.place(k / 24), pin)[1] - y0).toBeCloseTo((P.get("LP_SLIDE")! * k) / 24, 9);
  });
});

describe("closest approach", () => {
  beforeAll(loadManifold);

  test("box to mesh gap equals manifold minGap, the shipped row crank against its servo at every step", () => {
    const P = ogeeParams();
    const crank = ogeeCranks(P, "shipped")[0]!;
    const box = servoBoxes(P)[0]!;
    if (box.kind !== "box") throw new Error("row 0 servo is a box");
    const colMajor = (m: readonly number[]) => [m[0]!, m[4]!, m[8]!, 0, m[1]!, m[5]!, m[9]!, 0, m[2]!, m[6]!, m[10]!, 0, m[3]!, m[7]!, m[11]!, 1];
    scope(() => {
      const w = kernel();
      const mesh = new w.Mesh({ numProp: 3, vertProperties: Float32Array.from(crank.mesh.positions), triVerts: Uint32Array.from(crank.mesh.triangles) });
      mesh.merge();
      const solid = w.Manifold.ofMesh(mesh);
      const b = w.Manifold.cube([...box.box.extents], true).translate([...box.box.center]);
      for (let k = 0; k < STEPS; k += 6) {
        const at = crank.place(k / (STEPS - 1));
        const ref = solid.transform(colMajor(at) as never).minGap(b, 10);
        expect(boxToMesh(box.box, placeMesh(crank.mesh, at)).mm, `step ${k}`).toBeCloseTo(ref, 4);
      }
      return 0;
    });
  });

  test("corner measure is the distance from the eight corners, never less than the true gap", () => {
    const tri = { positions: [0, 0, 0, 10, 0, 0, 0, 10, 0], triangles: [0, 1, 2] };
    const box = { center: [2, 2, 5] as const, extents: [2, 2, 2] as const };
    expect(boxCorners(box)).toHaveLength(8);
    expect(pointsToMesh(boxCorners(box), tri).mm).toBeCloseTo(4, 12);
    expect(boxToMesh(box, tri).mm).toBeCloseTo(4, 12);
    const tall = { center: [2, 2, 5] as const, extents: [40, 40, 2] as const };
    expect(boxToMesh(tall, tri).mm).toBeCloseTo(4, 12);
    expect(pointsToMesh(boxCorners(tall), tri).mm).toBeGreaterThan(4);
  });

  test("the sweep places the part at check_sweep.py's u = k / (STEPS - 1), both ends of the motion included", async () => {
    const P = ogeeParams();
    const crank = ogeeCranks(P, "shipped")[8]!;
    const seen: number[] = [];
    await rotateSweep({ ...crank, place: (u) => (seen.push(u), crank.place(u)) }, [], STEPS);
    // check_sweep.py swept() line 33.
    expect(seen).toEqual(Array.from({ length: STEPS }, (_, k) => k / (STEPS - 1)));
    expect(liveCount()).toBe(0);
  });

  test("a part that reaches an obstacle only at u = 0 or u = 1 is caught at both ends", async () => {
    // A 1 mm cube carried 10 mm along x over the motion. Each box overlaps one
    // end copy by 0.4 mm in x (0.4 mm3) and stays clear of the neighbouring step,
    // 10/24 mm away; the volumes are worked by hand, not by the port.
    await loadManifold();
    const cube = scope(() => {
      const g = kernel().Manifold.cube([1, 1, 1]).getMesh();
      return { positions: Float64Array.from(g.vertProperties), triangles: Uint32Array.from(g.triVerts) };
    });
    const part = { name: "probe", mesh: cube, place: (u: number) => [1, 0, 0, 10 * u, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] };
    const start = { name: "start", kind: "box" as const, box: { center: [-0.3, 0.5, 0.5] as const, extents: [1.4, 1, 1] as const } };
    const end = { name: "end", kind: "box" as const, box: { center: [11.3, 0.5, 0.5] as const, extents: [1.4, 1, 1] as const } };
    const r = await rotateSweep(part, [start, end], STEPS);
    expect(r.hits.map((h) => h.with).sort()).toEqual(["end", "start"]);
    for (const h of r.hits) {
      expect(h.mm3, h.with).toBeCloseTo(0.4, 5);
      expect(h.stepSumMm3, h.with).toBeCloseTo(0.4, 5);
    }
    expect(r.approach.map((a) => [a.with, a.gapMm, a.step])).toEqual([["start", 0, 0], ["end", 0, STEPS - 1]]);
    expect(liveCount()).toBe(0);
  });

  test("a sweep with fewer than two steps is E_SCHEMA", async () => {
    const P = ogeeParams();
    let code = "";
    try {
      await rotateSweep(ogeeCranks(P, "shipped")[0]!, [], 1);
    } catch (e) {
      if (isThrownCommandError(e)) code = e.hbf.code;
    }
    expect(code).toBe("E_SCHEMA");
  });
});

const runs: Partial<Record<"shipped" | "proud", OgeeSweepRun & { wallMs: number }>> = {};

async function run(variant: "shipped" | "proud") {
  const t0 = performance.now();
  const r = await runOgeeSweep(variant, STEPS, CLASH_MM3);
  runs[variant] = { ...r, wallMs: Math.round(performance.now() - t0) };
  return r;
}

describe("port against the oracle", () => {
  test("shipped: 0 clashes; closest approach latch 2.10 mm, each bar crank 3.02 mm, within 0.01 mm of the oracle (computed)", async () => {
    const r = await run("shipped");
    const oracle = parseOracle(golden.runs.shipped.stdout);
    expect(oracle.clashes).toEqual([]);
    expect(r.clashes).toEqual([]);
    expect(oracle.near).toHaveLength(9);
    for (const o of oracle.near) {
      const p = r.near.find((n) => n.sweep === o.sweep)!;
      expect(p.box, o.sweep).toBe(o.box);
      expect(Math.abs(p.cornerMm - o.mm), o.sweep).toBeLessThanOrEqual(0.01);
    }
    expect(oracle.near.find((n) => n.sweep === "latch crank")!.mm).toBe(2.1);
    expect(oracle.near.filter((n) => n.sweep !== "latch crank").every((n) => n.mm === 3.02)).toBe(true);
    expect(liveCount()).toBe(0);
  }, 60_000);

  test("proud-head fixture: clash set equals the oracle's, exactly the eight bar cranks each against its own servo; latch head clear (computed)", async () => {
    const r = await run("proud");
    const oracle = parseOracle(golden.runs.proud.stdout);
    const key = (c: { sweep: string; with: string }) => `${c.sweep} x ${c.with}`;
    const want = ["row", "col"].flatMap((a) => [0, 1, 2, 3].map((i) => `${a} crank ${i} x ${a} ${i} servo`)).sort();
    expect(oracle.clashes.map(key).sort()).toEqual(want);
    expect(r.clashes.map(key).sort()).toEqual(want);
    // The oracle's volume is the per-step sum of its concatenated copies; the port's union counts a point once.
    for (const o of oracle.clashes) {
      const p = r.clashes.find((c) => key(c) === key(o))!;
      expect(Math.abs(p.stepSumMm3 - o.mm3) / o.mm3, key(o)).toBeLessThan(0.02);
      expect(p.mm3).toBeLessThan(p.stepSumMm3);
    }
    // printed.scad pin_seat() comment: the latch head sat 0.5 mm above its servo case.
    const latch = r.near.find((n) => n.sweep === "latch crank")!;
    expect(latch.box).toBe("latch servo");
    expect(latch.gapMm).toBeCloseTo(0.5, 3);
    for (const o of oracle.near) expect(Math.abs(r.near.find((n) => n.sweep === o.sweep)!.cornerMm - o.mm), o.sweep).toBeLessThanOrEqual(0.01);
    // The count-once volume against manifold's own batch union of the 25 copies cut by the box, one crank per bar axis.
    const P = ogeeParams();
    const cranks = ogeeCranks(P, "proud"), boxes = servoBoxes(P);
    const colMajor = (m: readonly number[]) => [m[0]!, m[4]!, m[8]!, 0, m[1]!, m[5]!, m[9]!, 0, m[2]!, m[6]!, m[10]!, 0, m[3]!, m[7]!, m[11]!, 1];
    for (const k of [0, 4]) {
      const crank = cranks[k]!, box = boxes[k]!;
      if (box.kind !== "box") throw new Error(`${box.name} is a box`);
      const ref = scope(() => {
        const w = kernel();
        const mesh = new w.Mesh({ numProp: 3, vertProperties: Float32Array.from(crank.mesh.positions), triVerts: Uint32Array.from(crank.mesh.triangles) });
        mesh.merge();
        const solid = w.Manifold.ofMesh(mesh);
        const b = w.Manifold.cube([...box.box.extents], true).translate([...box.box.center]);
        return w.Manifold.union(Array.from({ length: STEPS }, (_, s) => solid.transform(colMajor(crank.place(s / (STEPS - 1))) as never).intersect(b))).volume();
      });
      expect(r.clashes.find((c) => c.sweep === crank.name)!.mm3, crank.name).toBeCloseTo(ref, 3);
    }
    expect(liveCount()).toBe(0);
  }, 60_000);

  test.runIf(process.env.HBF_OGEE_RECORD === "1")("writes records/ogee-sweep.json", () => {
    const shipped = runs.shipped!, proud = runs.proud!;
    const oracle = { shipped: parseOracle(golden.runs.shipped.stdout), proud: parseOracle(golden.runs.proud.stdout) };
    const record = {
      record: "ogee-sweep",
      card: "M02-T07",
      date: new Date().toISOString().slice(0, 10),
      qualifier: "volumes and distances are computed; wall times are measured on the named machine; the retired bench figure is a chat record, not reproduced (D-233)",
      command: "npm run ogee:record -w core",
      machine: { cpu: cpus()[0]?.model ?? "unknown", cores: cpus().length, os: `${process.platform} ${process.arch}`, node: process.version, note: "shared with other builds while it ran; wall times include contention" },
      params: { steps: STEPS, clashMm3: CLASH_MM3 },
      oracle: { versions: golden.versions, exit: { shipped: golden.runs.shipped.exit, proud: golden.runs.proud.exit } },
      fixture: {
        dir: "designs/ogee16/extract/fixtures/proud-head",
        openscad: "OpenSCAD 2021.01, files.openscad.org/OpenSCAD-2021.01.dmg sha256 4e4568e19992636ba497c04bc2238399c92314fcb7bf75dc3632aa623ca3635e (vendor), x86_64 under Rosetta",
        command: "openscad -o <part>.stl -D part=\"<part>\" -D shape=\"circle\" printed_proud.scad",
        ignoringUnknownLines: 0,
        renderWallS: { crank_row_asm: 16.06, crank_col_asm: 9.74, crank_latch_asm: 12.22, qualifier: "measured, Apple M1, 2026-10-07" },
        shippedRerender: "the same OpenSCAD on the unedited printed.scad gives crank_row_asm, crank_col_asm and crank_latch_asm with the shipped volumes 299.965, 299.965 and 343.000 mm3 and bounds (computed, trimesh 5.1.1); the bytes differ",
        sha256: golden.fixtureSha256,
      },
      retiredBenchFigure: {
        value: 577, unit: "mm3 per pin head",
        qualifier: "retired by D-233: a bench chat record (notes/benches-mechanisms.md) that neither check_sweep.py (681.7 to 682.0 mm3 per bar crank, per-step sum) nor the count-once union (78.96 to 79.16 mm3) reproduces; never a number of record",
      },
      variants: Object.fromEntries((["shipped", "proud"] as const).map((v) => {
        const r = v === "shipped" ? shipped : proud;
        return [v, {
          wallMs: r.wallMs,
          clashes: r.clashes.map((c) => ({ ...c, oracleMm3: oracle[v].clashes.find((o) => o.sweep === c.sweep && o.with === c.with)?.mm3 ?? null })),
          near: r.near.map((n) => ({ ...n, oracleMm: oracle[v].near.find((o) => o.sweep === n.sweep)?.mm ?? null })),
          sweptHash: Object.fromEntries(r.results.map((x) => [x.part, x.sweptHash])),
        }];
      })),
    };
    writeFileSync(new URL("../../packages/sim/records/ogee-sweep.json", import.meta.url), JSON.stringify(record, null, 1) + "\n");
  });
});
