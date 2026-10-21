// M02-T03: the PAWL records and port held to the originals. The step 1
// records (records/) reproduce run1.txt (rapier3d-compat 0.14.0) and
// det1.txt (the adopted 0.21.0), both printed by final.mjs, and core.mjs
// runs side by side with the TypeScript port. Reads the originals of record
// through localOriginal, so it runs on the owner runner and never skips.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { describe, expect, test } from "vitest";
import { localOriginal } from "../../../tools/test-support/originals-root.js";
import { initRapier, liveWorlds, withWorld } from "../src/rapier/index.js";
import { attitude, buildPawl, control, defaults } from "../src/programs/pawl/core.js";
import { legacyOutput, type PawlTrialRow } from "../src/programs/pawl/suite.js";
import { PAWL_SCENE } from "../scenes/pawl.js";

const RECORDS = "fab-knowledge:originals/pawl/files/records/";
const CORE = "fab-knowledge:originals/pawl/files/src/core.mjs";
const read = (p: string): string => readFileSync(new URL(p, import.meta.url), "utf8");
const sha256 = (s: string): string => createHash("sha256").update(s).digest("hex");

interface LegacyRecord { readonly outputSha256: string; readonly passes: number; readonly runs: number; readonly trials: readonly { readonly label: string; readonly group: string; readonly ok: boolean; readonly line: string }[] }
interface PortRecord { readonly outputSha256: string; readonly passes: number; readonly runs: number; readonly trials: readonly PawlTrialRow[] }

const ARCHS = ["arm64", "x64"] as const;
const legacy = ARCHS.map((a) => JSON.parse(read(`../records/pawl-legacy-0.14.0-${a}.json`)) as LegacyRecord);
const port = ARCHS.map((a) => JSON.parse(read(`../records/pawl-0.21.0-${a}.json`)) as PortRecord);
const run1 = readFileSync(localOriginal(`${RECORDS}final_mjs_rapier-compat-0.14.0_run1.txt`), "utf8");
const det1 = readFileSync(localOriginal(`${RECORDS}final_mjs_rapier-deterministic-0.21.0_det1.txt`), "utf8");

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

describe("PAWL port against core.mjs", () => {
  test("parity with core.mjs: 2 s of stand, torso translation within 1e-12 m at every step", async () => {
    const C = await import(pathToFileURL(localOriginal(CORE)).href);
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
