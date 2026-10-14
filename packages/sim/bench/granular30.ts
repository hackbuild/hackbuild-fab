// M02-T05 step 4: the 30-trial granular runtime on this machine.
//
//   node bench/granular30.ts [--runs N] [--out file]
//
// Runs scene granular-funnel (seeds 1 to 30) N times (3 by default), times
// each trial with a monotonic clock, and writes records/granular30-<arch>.json.
// Needs `npx tsc -b` first: it loads dist/. Wall times are measured on the
// machine named in the record; no budget is set here (the PR asks the owner).

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { register } from "node:module";
import { cpus, release, platform } from "node:os";
import { dirname, join, relative } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const pkg = join(here, "..");
const root = join(pkg, "..", "..");
register(pathToFileURL(join(root, "core", "dist", "resolve-hook.js")));

const argv = process.argv.slice(2);
const flag = (name: string): string | undefined => { const i = argv.indexOf(name); return i < 0 ? undefined : argv[i + 1]; };
const runs = Number(flag("--runs") ?? "3");
if (!Number.isInteger(runs) || runs < 1) throw new Error(`--runs needs a positive integer, got ${flag("--runs")}`);

/** Percentile by the nearest-rank method over a sorted copy. */
function pct(xs: number[], p: number): number {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.max(0, Math.ceil((p / 100) * s.length) - 1)]!;
}
const round = (x: number, d = 3): number => Number(x.toFixed(d));

function machine() {
  const t = spawnSync("sysctl", ["-n", "sysctl.proc_translated"], { encoding: "utf8" });
  return { cpu: cpus()[0]?.model ?? "unknown", os: `${platform()} ${release()}`, arch: process.arch, translated: t.status === 0 && t.stdout.trim() === "1", node: process.version, image: process.env["ImageOS"] ?? process.env["RUNNER_IMAGE"] ?? "local" };
}

const sim = await import(pathToFileURL(join(pkg, "dist", "rapier", "index.js")).href);
const { granularFunnelScene: scene, runGranularTrial, liveWorlds } = sim;
const world = JSON.parse(readFileSync(join(pkg, scene.worldRows), "utf8"));
const rapier = JSON.parse(readFileSync(join(root, "node_modules", "@dimforge", "rapier3d-deterministic-compat", "package.json"), "utf8"));

const wall: Record<string, number[]> = {};
const first: Record<string, { seed: number; steps: number; ballsBelowMouth: number; snapshotHash: string }> = {};
const totals: number[] = [];
for (let r = 0; r < runs; r += 1) {
  const t0 = performance.now();
  for (const t of scene.trials) {
    const key = `${scene.id}/${t.trial}#seed${t.seed}`;
    const a = performance.now();
    const o = await runGranularTrial(world, t.seed, () => {});
    (wall[key] ??= []).push(performance.now() - a);
    const mine = { seed: t.seed, steps: o.steps, ballsBelowMouth: o.ballsBelowMouth, snapshotHash: o.snapshotHash };
    const prev = first[key];
    if (prev === undefined) first[key] = mine;
    else if (prev.snapshotHash !== mine.snapshotHash) throw new Error(`${key} hash differs between runs on this machine`);
  }
  totals.push(performance.now() - t0);
  process.stdout.write(`run ${r + 1} of ${runs}: ${(totals[r]! / 1000).toFixed(2)} s (measured)\n`);
}
if (liveWorlds() !== 0) throw new Error(`live worlds ${liveWorlds()}`);

const all = Object.values(wall).flat();
const trials = Object.fromEntries(Object.entries(first).map(([k, v]) => [k, { ...v, wallMs: wall[k]!.map((x) => round(x, 1)), wallMsP50: round(pct(wall[k]!, 50), 1) }]));
const record = {
  record: "granular-funnel 30-trial runtime on the adopted Rapier, M02-T05 step 4",
  pin: `${rapier.name} ${rapier.version}`,
  scene: "packages/sim/src/rapier/granular.ts with rows packages/sim/scenes/granular-funnel.world.json",
  command: `npm run bench:granular30 -w packages/sim -- --runs ${runs}`,
  machine: machine(),
  date: new Date().toISOString().slice(0, 10),
  qualifier: "wall times measured on the machine named; snapshotHash and ballsBelowMouth computed, ballsBelowMouth informational (D-075)",
  runs,
  trialCount: Object.keys(trials).length,
  stepsPerTrial: first[Object.keys(first)[0]!]!.steps,
  runWallS: totals.map((x) => round(x / 1000, 2)),
  totalWallS: { p50: round(pct(totals, 50) / 1000, 2), max: round(Math.max(...totals) / 1000, 2) },
  trialWallMs: { p50: round(pct(all, 50), 1), p90: round(pct(all, 90), 1), max: round(Math.max(...all), 1), samples: all.length },
  trials,
};
const out = flag("--out") ?? join(pkg, "records", `granular30-${process.arch}.json`);
writeFileSync(out, `${JSON.stringify(record, null, 2)}\n`);
process.stdout.write(`wrote ${relative(root, out)}; trial p50 ${record.trialWallMs.p50} ms, p90 ${record.trialWallMs.p90} ms\n`);
