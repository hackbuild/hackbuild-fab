// M02-T04: snapshot determinism across runs. Expected values come from
// outside the code under test: the committed T01 golden
// (goldens/rapier-drop.json), the committed PAWL port record
// (records/pawl-0.21.0-arm64.json, written by scripts/pawl.mjs without the
// observer), node:crypto sha256 over takeSnapshot bytes, the scene files
// and their imports on disk, and the CI workflow text. The cross-architecture
// half of the card runs in the CI determinism job, not here.

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, onTestFinished, test } from "vitest";
import { parse } from "yaml";
import { isThrownCommandError } from "@hackbuild/spec";
import {
  CHECKPOINT_STEPS, liveWorlds, rapierScenes, recordScenes, snapshotHash, traceTrial, withWorld,
  type RapierScene, type TrialRecord, type WorldParams,
} from "../src/rapier/index.js";
import { SIM_SCENES } from "../src/scenes.js";

const SIM = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = path.resolve(SIM, "..", "..");
const TOOL = path.join(ROOT, "tools", "compare-snapshots.mjs");
const rows = (s: RapierScene): WorldParams => JSON.parse(readFileSync(path.join(SIM, s.worldRows), "utf8")) as WorldParams;
const golden = JSON.parse(readFileSync(path.join(SIM, "test", "goldens", "rapier-drop.json"), "utf8")) as { readonly sha256: string };
const fixture = JSON.parse(readFileSync(path.join(SIM, "test", "fixtures", "pawl-world.json"), "utf8")) as WorldParams;
const pawlRecord = JSON.parse(readFileSync(path.join(SIM, "records", "pawl-0.21.0-arm64.json"), "utf8")) as { readonly trials: readonly { readonly label: string; readonly snapshotHash: string }[] };
const SCENES = await rapierScenes((file) => import(path.join(SIM, "scenes", file)));

/** Free fall of one cuboid for `steps` steps; `kickAt` applies a lateral impulse after that step. */
function fall(steps: number, kickAt?: number): RapierScene {
  return {
    id: "fall",
    worldRows: "test/fixtures/pawl-world.json",
    trials: [{ trial: "cuboid", seed: 1 }],
    run: (params, _t, observe) => withWorld(params, (world, R) => {
      const body = world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(0, 1, 0));
      world.createCollider(R.ColliderDesc.cuboid(0.01, 0.01, 0.01), body);
      for (let i = 1; i <= steps; i += 1) {
        world.step();
        if (i === kickAt) body.applyImpulse({ x: 1e-4, y: 0, z: 0 }, true);
        observe(world, i);
      }
      return { snapshotHash: snapshotHash(world), steps };
    }),
  };
}

/** Scene modules on disk: every .ts under scenes/ and src/scenes/, index.ts aside, sorted. */
function sceneFiles(): string[] {
  return [path.join(SIM, "scenes"), path.join(SIM, "src", "scenes")]
    .filter((d) => existsSync(d))
    .flatMap((d) => readdirSync(d).filter((n) => n.endsWith(".ts") && n !== "index.ts").map((n) => path.join(d, n)))
    .sort();
}

const IMPORT = /(?:^|\n)\s*(?:import|export)\s+(type\s+)?[^;]*?from\s+"([^"]+)"|import\(\s*"([^"]+)"\s*\)/g;

/**
 * Whether a scene module's import graph, read from the files on disk,
 * reaches @dimforge/rapier3d. A scene module is data and names its runner
 * by type, so its own type imports count; past it only value imports do,
 * because a type import loads nothing.
 */
function buildsRapierWorld(scene: string): boolean {
  const seen = new Set<string>();
  const stack: [string, boolean][] = [[scene, true]];
  while (stack.length > 0) {
    const [file, isScene] = stack.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    for (const m of readFileSync(file, "utf8").matchAll(IMPORT)) {
      const spec = m[2] ?? m[3]!;
      if (m[1] !== undefined && !isScene) continue;
      if (spec.startsWith("@dimforge/rapier3d")) return true;
      if (!spec.startsWith(".")) continue;
      const ts = path.resolve(path.dirname(file), spec).replace(/\.js$/, ".ts");
      if (existsSync(ts)) stack.push([ts, false]);
    }
  }
  return false;
}

function writeRecord(dir: string, name: string, trials: Record<string, TrialRecord>): string {
  const file = path.join(dir, name);
  writeFileSync(file, JSON.stringify({ every: CHECKPOINT_STEPS, trials }));
  return file;
}

function compare(a: string, b: string): { status: number | null; out: string } {
  const r = spawnSync(process.execPath, [TOOL, "compare", a, b], { encoding: "utf8" });
  return { status: r.status, out: r.stdout + r.stderr };
}

describe("snapshot determinism across runs (M02-T04)", () => {
  test("the import reader finds Rapier in pawl.ts alone of the scene files on disk", () => {
    // Hand-checked 2026-10-07: pawl.ts names its runner (programs/pawl/suite.ts,
    // which steps withWorld); the other seven scene modules run kinematic sweeps,
    // proxies, the SLUG capsule program or the OGEE printed audit and import no Rapier.
    const files = sceneFiles();
    expect(files.map((f) => path.basename(f))).toEqual(["cotter-hook.ts", "davit.ts", "ogee16-cranks.ts", "ogee16-printed.ts", "pawl.ts", "sash-slide.ts", "slug-mouth58.ts", "slug.ts"]);
    expect(files.filter(buildsRapierWorld).map((f) => path.basename(f))).toEqual(["pawl.ts"]);
  });

  test("every scene file is a sim scene, every one that builds a Rapier world is a Rapier scene, ids unique, world rows carry provenance", () => {
    const ids = SCENES.map((s) => s.id);
    expect(ids).toEqual(["drop", "granular-funnel", "pawl"]);
    expect(new Set(ids).size).toBe(ids.length);
    const simFiles = new Set(SIM_SCENES.map((s) => s.file));
    for (const f of sceneFiles()) {
      const base = path.basename(f);
      expect([...simFiles], `${f} is not the file of any SIM_SCENES entry`).toContain(base);
      if (buildsRapierWorld(f)) expect(ids, `${f} builds a Rapier world and is not a registered Rapier scene (RAPIER_SCENES or RAPIER_SCENE_MODULES)`).toContain(base.replace(/\.ts$/, ""));
    }
    for (const s of SCENES) {
      const w = rows(s);
      for (const c of [w.gravity, w.timestep]) expect(c.provenance.tier, `${s.id} ${c.id}`).toMatch(/^(measured|computed|vendor|inferred)$/);
      expect(s.trials.length, s.id).toBeGreaterThan(0);
    }
  });

  test("two runs of each registered scene give equal hashes, checkpoint every 480 steps, live worlds 0", async () => {
    // The first trial of each scene keeps the default run under 60 s; every
    // trial of every scene runs twice in `npm run snapshots -w packages/sim`
    // and in the CI determinism job.
    const scenes = SCENES.map((s) => ({ ...s, trials: s.trials.slice(0, 1) }));
    const first = await recordScenes(scenes, rows);
    const second = await recordScenes(scenes, rows);
    const want = scenes.length;
    expect(Object.keys(first)).toHaveLength(want);
    expect(second).toEqual(first);
    for (const [key, t] of Object.entries(first)) {
      expect(t.snapshotHash, key).toMatch(/^[0-9a-f]{64}$/);
      expect(t.checkpoints, key).toHaveLength(Math.floor(t.steps / 480));
    }
    expect(first["pawl/60 s#seed1"]?.snapshotHash, "PAWL 60 s against the committed port record").toBe(pawlRecord.trials.find((t) => t.label === "60 s")!.snapshotHash);
    expect(liveWorlds()).toBe(0);
   }, 60_000);

  test("the PAWL scene runs the 17 suite trials at seed 1, and a push trial ends on its committed record hash", async () => {
    const pawl = SCENES.find((s) => s.id === "pawl")!;
    expect(pawl.trials.map((t) => t.trial)).toEqual(pawlRecord.trials.map((t) => t.label));
    expect(new Set(pawl.trials.map((t) => t.seed))).toEqual(new Set([1]));
    const r = await recordScenes([{ ...pawl, trials: pawl.trials.filter((t) => t.trial === "x 0.12 N.s") }], rows);
    const t = r["pawl/x 0.12 N.s#seed1"]!;
    expect(t.snapshotHash).toBe(pawlRecord.trials.find((x) => x.label === "x 0.12 N.s")!.snapshotHash);
    expect(t.steps).toBe(5760);
    expect(t.checkpoints).toHaveLength(12);
    expect(liveWorlds()).toBe(0);
   }, 30_000);

  test("the drop scene ends on the committed T01 golden", async () => {
    const r = await recordScenes(SCENES.filter((s) => s.id === "drop"), rows);
    expect(r["drop/cuboid-1s#seed1"]?.snapshotHash).toBe(golden.sha256);
    expect(r["drop/cuboid-1s#seed1"]?.checkpoints).toEqual([golden.sha256]);
  });

  test("checkpoints are sha256 of takeSnapshot at steps 480, 960, 1440", async () => {
    const seen: string[] = [];
    const base = fall(1440);
    const spy: RapierScene = { ...base, run: (p, t, observe) => base.run(p, t, (w, step) => {
      if (step % 480 === 0) seen.push(createHash("sha256").update(w.takeSnapshot()).digest("hex"));
      observe(w, step);
    }) };
    const r = await traceTrial(spy, fixture, spy.trials[0]!);
    expect(r.checkpoints).toEqual(seen);
    expect(r.checkpoints).toHaveLength(3);
    expect(r.snapshotHash).toBe(seen[2]);
  });

  test("a scene that steps without observing is E_SCHEMA", async () => {
    const base = fall(960);
    const deaf: RapierScene = { ...base, run: (p, t, observe) => base.run(p, t, (w, step) => { if (step < 900) observe(w, step); }) };
    await expect(traceTrial(deaf, fixture, deaf.trials[0]!)).rejects.toSatisfy((e: unknown) => isThrownCommandError(e) && e.hbf.code === "E_SCHEMA" && e.hbf.path === "/fall/cuboid/steps");
    expect(liveWorlds()).toBe(0);
  });

  test("compare-snapshots names the first differing trial and checkpoint step, exit 1; equal records exit 0", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "hbf-snap-"));
    onTestFinished(() => rmSync(dir, { recursive: true, force: true }));
    const clean = await recordScenes([fall(1440)], rows);
    const kicked = await recordScenes([fall(1440, 1000)], rows);
    const drop = await recordScenes(SCENES.filter((s) => s.id === "drop"), rows);
    const a = writeRecord(dir, "a.json", { ...drop, ...clean });
    const b = writeRecord(dir, "b.json", { ...drop, ...kicked });
    const same = compare(a, a);
    expect(same.status).toBe(0);
    expect(same.out).toContain("compared 2 trials (counted), 0 differ");
    const moved = compare(a, b);
    expect(moved.status).toBe(1);
    expect(moved.out).toContain("first differs fall/cuboid#seed1 first at step 1440 (equal through step 960)");
    const short = writeRecord(dir, "c.json", { ...clean });
    const gone = compare(a, short);
    expect(gone.status).toBe(1);
    expect(gone.out).toContain(`first differs drop/cuboid-1s#seed1: missing in ${short}`);
    expect(compare(a, path.join(dir, "absent.json")).status).toBe(2);
  });

  test("the CI determinism job records on x64 and arm64 and the compare job compares them", () => {
    const ci = parse(readFileSync(path.join(ROOT, ".github", "workflows", "ci.yml"), "utf8")) as {
      jobs: Record<string, { strategy?: { matrix: { include: { leg: string; kind: string }[] } }; steps: { run?: string; if?: string }[] }>;
    };
    const legs = ci.jobs["determinism"]!.strategy!.matrix.include.filter((l) => l.kind === "node").map((l) => l.leg);
    expect(legs).toEqual(expect.arrayContaining(["x64", "arm64"]));
    const rec = ci.jobs["determinism"]!.steps.find((s) => s.run?.includes("compare-snapshots.mjs record"));
    expect(rec?.run).toContain("snapshots-${{ matrix.leg }}.json");
    const cmp = ci.jobs["determinism-compare"]!.steps.map((s) => s.run ?? "").join("\n");
    expect(cmp).toContain("compare-snapshots.mjs compare det/determinism-x64/snapshots-x64.json det/determinism-arm64/snapshots-arm64.json");
  });
});
