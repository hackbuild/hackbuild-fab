// M02-T01: owned Rapier worlds and the snapshot hash. Expected values come
// from outside the code under test: node:crypto sha256 over the snapshot
// bytes, the semi-implicit Euler closed form for a free fall, the PAWL
// world constants in fixtures/pawl-world.json, and the committed golden in
// goldens/rapier-drop.json (recorded on the machine it names).

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { isThrownCommandError, type Constant } from "@hackbuild/spec";
import { initRapier, liveWorlds, snapshotHash, withWorld, type Rapier, type WorldParams } from "../src/rapier/index.js";
import { simSnapshotsAdmitted } from "../src/admission.js";

type World = Parameters<Parameters<typeof withWorld>[1]>[0];

const fixture = JSON.parse(readFileSync(new URL("./fixtures/pawl-world.json", import.meta.url), "utf8")) as WorldParams;
const golden = JSON.parse(readFileSync(new URL("./goldens/rapier-drop.json", import.meta.url), "utf8")) as {
  readonly sha256: string; readonly bytes: number; readonly yM: number;
};

/** Start height of the cuboid, m; a test input, not a physical constant. */
const Y0 = 1;
/** Drop length, s. */
const SECONDS = 1;

async function drop(params: WorldParams, seconds: number): Promise<{ hash: string; bytes: Uint8Array; y: number; substeps: number; dt: number }> {
  return withWorld(params, (world: World, R: Rapier) => {
    const body = world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(0, Y0, 0));
    world.createCollider(R.ColliderDesc.cuboid(0.01, 0.01, 0.01), body);
    const steps = Math.round(seconds / params.timestep.value);
    for (let i = 0; i < steps; i += 1) world.step();
    return {
      hash: snapshotHash(world), bytes: world.takeSnapshot(), y: body.translation().y,
      substeps: world.integrationParameters.numSolverIterations, dt: world.timestep,
    };
  });
}

describe("Rapier wired, owned and hashed (M02-T01)", () => {
  test("initRapier awaits RAPIER.init once per process and returns one module", async () => {
    const a = initRapier();
    expect(initRapier()).toBe(a);
    const R = await a;
    expect(typeof R.World).toBe("function");
  });

  test("a 1 s drop of one cuboid hashed twice in one process gives one hash", async () => {
    const first = await drop(fixture, SECONDS);
    const second = await drop(fixture, SECONDS);
    expect(first.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(second.hash).toBe(first.hash);
    expect(liveWorlds()).toBe(0);
  });

  test("snapshotHash is sha256 of takeSnapshot (node:crypto) and equals the committed golden", async () => {
    const r = await drop(fixture, SECONDS);
    expect(r.hash).toBe(createHash("sha256").update(r.bytes).digest("hex"));
    expect(r.bytes.length).toBe(golden.bytes);
    expect(r.hash).toBe(golden.sha256);
  });

  test("the world runs the fixture gravity and timestep: free fall matches substepped semi-implicit Euler", async () => {
    // Rapier 0.21 integrates gravity once per solver iteration (vendor
    // default 4 per step, read from the world), so m = n s substeps of
    // h = dt / s from rest give y = y0 - g h^2 m (m + 1) / 2 (computed).
    const r = await drop(fixture, SECONDS);
    const g = fixture.gravity.value;
    const dt = fixture.timestep.value;
    expect(r.dt).toBeCloseTo(dt, 9);
    const h = dt / r.substeps;
    const m = Math.round(SECONDS / dt) * r.substeps;
    const expected = Y0 - (g * h * h * m * (m + 1)) / 2;
    expect(Math.abs(r.y - expected)).toBeLessThan(1e-4);
    expect(r.y).toBe(golden.yM);
  });

  test("a different state gives a different hash", async () => {
    const full = await drop(fixture, SECONDS);
    const half = await drop(fixture, SECONDS / 2);
    expect(half.hash).not.toBe(full.hash);
  });

  test("withWorld counts live worlds and frees in finally, also when fn throws", async () => {
    let kept: World | undefined;
    await withWorld(fixture, async (outer) => {
      kept = outer;
      expect(liveWorlds()).toBe(1);
      await withWorld(fixture, () => {
        expect(liveWorlds()).toBe(2);
      });
      expect(liveWorlds()).toBe(1);
    });
    expect(liveWorlds()).toBe(0);
    expect(() => kept!.takeSnapshot()).toThrow();

    let thrown: World | undefined;
    await expect(withWorld(fixture, (w) => {
      thrown = w;
      throw new Error("fn failed");
    })).rejects.toThrow("fn failed");
    expect(liveWorlds()).toBe(0);
    expect(() => thrown!.takeSnapshot()).toThrow();
  });

  test("a constant in the wrong unit or not above 0 is E_SCHEMA and creates no world", async () => {
    const wrong: Constant = { ...fixture.timestep, unit: "ms" };
    const zero: Constant = { ...fixture.gravity, value: 0 };
    await expect(withWorld({ ...fixture, timestep: wrong }, () => 0)).rejects.toSatisfy((e: unknown) => isThrownCommandError(e) && e.hbf.code === "E_SCHEMA" && e.hbf.path === "/timestep/unit");
    await expect(withWorld({ ...fixture, gravity: zero }, () => 0)).rejects.toSatisfy((e: unknown) => isThrownCommandError(e) && e.hbf.code === "E_SCHEMA" && e.hbf.path === "/gravity/value");
    expect(liveWorlds()).toBe(0);
  });

  test("sim snapshot hashes are not admitted to BuildInputs before T05 (D-134)", () => {
    expect(simSnapshotsAdmitted).toBe(false);
  });

  test("live-world count is 0 after the suite", () => {
    expect(liveWorlds()).toBe(0);
  });
});
