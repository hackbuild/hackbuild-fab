// M02-T03: the PAWL suite. Expected values come from outside the code under
// test: the legacy records (designs/pawl/legacy/records/run1.txt on
// rapier3d-compat 0.14.0 and det1.txt on the adopted 0.21.0, both printed by
// final.mjs), the step 1 records written from final.mjs stdout, and core.mjs
// itself run side by side with the TypeScript port. The whole 17 trial run
// takes about a minute on Apple M1 (measured), so the default run replays two
// push trials and the full suite is `npm run pawl -w packages/sim`.

import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { initRapier, liveWorlds, withWorld, type WorldParams } from "../src/rapier/index.js";
import { attitude, buildPawl, control, defaults } from "../src/programs/pawl/core.js";
import { legacyOutput, runPawlTrial, suiteVerdict, type PawlTrialRow } from "../src/programs/pawl/suite.js";
import { PAWL_SCENE } from "../scenes/pawl.js";

const read = (p: string): string => readFileSync(new URL(p, import.meta.url), "utf8");
const sha256 = (s: string): string => createHash("sha256").update(s).digest("hex");

interface LegacyRecord { readonly outputSha256: string; readonly passes: number; readonly runs: number; readonly pass: readonly string[]; readonly fall: readonly string[]; readonly trials: readonly { readonly label: string; readonly group: string; readonly ok: boolean; readonly line: string }[] }
interface PortRecord { readonly outputSha256: string; readonly passes: number; readonly runs: number; readonly trials: readonly PawlTrialRow[] }

const ARCHS = ["arm64", "x64"] as const;
const legacy = ARCHS.map((a) => JSON.parse(read(`../records/pawl-legacy-0.14.0-${a}.json`)) as LegacyRecord);
const port = ARCHS.map((a) => JSON.parse(read(`../records/pawl-0.21.0-${a}.json`)) as PortRecord);
const run1 = read("../../../designs/pawl/legacy/records/run1.txt");
const det1 = read("../../../designs/pawl/legacy/records/det1.txt");
const det1Line = (label: string): string => det1.split("\n").find((l) => l.startsWith(` ${label.padEnd(26)} `))!;

describe("PAWL records", () => {
  test("legacy 0.14.0 records reproduce run1.txt on both architectures", () => {
    for (const r of legacy) {
      expect(r.outputSha256).toBe(sha256(run1));
      expect(legacyOutput(r.trials)).toBe(run1);
      expect([r.runs, r.passes]).toEqual([17, 15]);
    }
  });

  test("port 0.21.0 records reproduce det1.txt, final.mjs on the adopted pin, on both architectures", () => {
    for (const r of port) {
      expect(r.outputSha256).toBe(sha256(det1));
      expect(legacyOutput(r.trials)).toBe(det1);
      expect([r.runs, r.passes]).toEqual([17, 9]);
    }
    expect(port[0]!.trials.map((t) => t.snapshotHash)).toEqual(port[1]!.trials.map((t) => t.snapshotHash));
  });
});

describe("PAWL scene", () => {
  test("trials in final.mjs order with the legacy labels and groups", () => {
    expect(PAWL_SCENE.trials.map((t) => [t.group, t.label])).toEqual(legacy[0]!.trials.map((t) => [t.group, t.label]));
  });

  test("world rows equal the T01 fixture", () => {
    const fx = JSON.parse(read("./fixtures/pawl-world.json")) as WorldParams;
    expect([PAWL_SCENE.world.gravity.value, PAWL_SCENE.world.timestep.value]).toEqual([fx.gravity.value, fx.timestep.value]);
  });

  test("declared set is the legacy record (D-074); the verdict follows D-153", () => {
    for (const r of legacy) {
      expect([...PAWL_SCENE.expected.pass].sort()).toEqual([...r.pass].sort());
      expect([...PAWL_SCENE.expected.fall].sort()).toEqual([...r.fall].sort());
    }
    expect(suiteVerdict(PAWL_SCENE, legacy[0]!.trials).exitCode).toBe(0);
    for (const r of port) {
      const v = suiteVerdict(PAWL_SCENE, r.trials);
      process.stdout.write(`measured pass 0.21.0 (${v.measuredPass.length}): ${v.measuredPass.join(", ")}\n`);
      process.stdout.write(`declared pass (${v.declaredPass.length}): ${v.declaredPass.join(", ")}\n`);
      process.stdout.write(`status: ${PAWL_SCENE.status}; suite exit ${v.exitCode}\n`);
      expect(v.exitCode).toBe(PAWL_SCENE.status === "met" ? 0 : 1);
      expect(v.onlyDeclared).toEqual(["hgt 192 (deep)", "open loop (should fail)", "T3.2 S38 sway23", "T2.8 S38 sway23", "T2.8 S38 sway18", "T2.8 S38 sway28"]);
      expect(v.onlyMeasured).toEqual([]);
    }
    expect(PAWL_SCENE.status).toBe("blocked: rapier 0.14 to 0.21 regression");
    // a short run is a different set, so it never reads as met
    expect(suiteVerdict(PAWL_SCENE, legacy[0]!.trials.slice(0, 16)).exitCode).toBe(1);
  });
});

describe("PAWL port on 0.21.0", () => {
  test("two push trials match det1.txt line for line and the committed snapshot hash", async () => {
    const rec = port[ARCHS.indexOf(process.arch as "arm64")];
    for (const label of ["z 0.06 N.s", "x 0.12 N.s"]) {
      const row = await runPawlTrial(PAWL_SCENE, PAWL_SCENE.trials.find((t) => t.label === label)!);
      expect(row.line).toBe(det1Line(label));
      if (rec) expect(row.snapshotHash).toBe(rec.trials.find((t) => t.label === label)!.snapshotHash);
    }
    expect(liveWorlds()).toBe(0);
  }, 60_000);

  test("parity with core.mjs: 2 s of stand, torso translation within 1e-12 m at every step", async () => {
    const C = await import(new URL("../../../designs/pawl/legacy/core.mjs", import.meta.url).href);
    const R = await initRapier();
    const L = C.makeWorld(R);
    try {
      await withWorld(PAWL_SCENE.world, (world) => {
        const rig = buildPawl(R, world, PAWL_SCENE.model);
        const P = defaults(PAWL_SCENE.model), Q = C.defaults();
        const DT = world.timestep, N = Math.round(2 / DT);
        expect(DT).toBe(L.world.timestep);
        let worst = 0;
        for (let n = 0; n < N; n++) {
          P.t += DT; Q.t += DT;
          control(PAWL_SCENE.model, P, rig, DT);
          C.control(Q, L.bodies, L.J, DT);
          world.step(); L.world.step();
          const a = rig.bodies.torso!.translation(), b = L.bodies.torso.translation();
          worst = Math.max(worst, Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.z - b.z));
        }
        process.stdout.write(`parity: ${N} steps, worst torso difference ${worst} m (computed)\n`);
        expect(worst).toBeLessThanOrEqual(1e-12);
        expect(attitude(rig.bodies).pitch).toBe(C.attitude(L.bodies).pitch);
      });
    } finally {
      L.world.free();
    }
    expect(liveWorlds()).toBe(0);
  }, 60_000);
});

test("records exist for both pins on both architectures", () => {
  for (const f of ["pawl-legacy-0.14.0-x64", "pawl-legacy-0.14.0-arm64", "pawl-0.21.0-x64", "pawl-0.21.0-arm64"]) {
    expect(existsSync(new URL(`../records/${f}.json`, import.meta.url))).toBe(true);
  }
});
