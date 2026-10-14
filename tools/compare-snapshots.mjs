#!/usr/bin/env node
// M02-T04 (D-056, D-134): Rapier snapshot determinism.
//
//   record --out <file> [--runs N] [--scene <id>]...
//     Runs every scene rapierScenes returns (packages/sim/src/rapier/scenes.ts)
//     N times (2 when not given) in this process, compares the runs key by
//     key, and writes snapshots-<arch>.json: scene, trial and seed mapped to
//     the final snapshotHash, with a checkpoint hash every 480 steps. Exits
//     1 when two runs on this machine differ.
//
//   compare <a.json> <b.json>
//     Compares two records key by key. Exits 1 when any trial hash differs
//     or one side lacks a trial, printing the first differing trial and the
//     first checkpoint step at which its hashes differ; exits 2 on a usage
//     or read error.
//
// Run `npx tsc -b` first: the scenes load from packages/sim/dist. Nothing
// here enters BuildInputs (admission.ts, M02-T05).

import { register } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { performance } from "node:perf_hooks";
import { diff } from "./determinism/compare.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SIM = path.join(ROOT, "packages", "sim");

/**
 * Where trial `key` first differs between records a and b.
 * Returns { key, step, equalThrough } where step is the first checkpoint
 * step whose hash differs, or the final step when every checkpoint agrees;
 * equalThrough is the last checkpoint step both agree on (0 when none).
 * A trial one side lacks has step null.
 */
export function locate(key, a, b) {
  const ta = a.trials[key];
  const tb = b.trials[key];
  if (ta === undefined || tb === undefined) return { key, step: null, equalThrough: 0, missing: ta === undefined ? "a" : "b" };
  const every = a.every;
  const n = Math.min(ta.checkpoints.length, tb.checkpoints.length);
  for (let i = 0; i < n; i += 1) {
    if (ta.checkpoints[i] !== tb.checkpoints[i]) return { key, step: (i + 1) * every, equalThrough: i * every };
  }
  if (ta.checkpoints.length !== tb.checkpoints.length || ta.steps !== tb.steps) {
    return { key, step: (n + 1) * every, equalThrough: n * every };
  }
  return { key, step: ta.steps, equalThrough: n * every };
}

/** Differing trial keys, in the run order of a (then b's extra keys). */
export function differences(a, b) {
  if (a.every !== b.every) throw new Error(`checkpoint spacing differs: ${a.every} and ${b.every} steps`);
  const final = (r) => Object.fromEntries(Object.entries(r.trials).map(([k, t]) => [k, t.snapshotHash]));
  const bad = new Set(diff(final(a), final(b)));
  const order = [...Object.keys(a.trials), ...Object.keys(b.trials).filter((k) => !(k in a.trials))];
  return order.filter((k) => bad.has(k)).map((k) => locate(k, a, b));
}

function describe(d, la, lb) {
  if (d.step === null) return `differs ${d.key}: missing in ${d.missing === "a" ? la : lb}`;
  return `differs ${d.key} first at step ${d.step} (equal through step ${d.equalThrough})`;
}

/** Prints every difference, first one flagged; returns the count. */
export function report(a, b, la, lb, write = (s) => process.stdout.write(s)) {
  const ds = differences(a, b);
  ds.forEach((d, i) => write(`${i === 0 ? "first " : ""}${describe(d, la, lb)}\n`));
  const keys = new Set([...Object.keys(a.trials), ...Object.keys(b.trials)]);
  write(`compared ${keys.size} trials (counted), ${ds.length} differ\n`);
  return ds.length;
}

function readRecord(file) {
  const v = JSON.parse(readFileSync(file, "utf8"));
  if (typeof v !== "object" || v === null || typeof v.trials !== "object" || !Number.isInteger(v.every)) {
    throw new Error(`${file}: want a snapshot record with every and trials`);
  }
  return v;
}

function args(argv) {
  const out = { _: [], scene: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--out" || a === "--runs") out[a.slice(2)] = argv[++i];
    else if (a === "--scene") out.scene.push(argv[++i]);
    else out._.push(a);
  }
  return out;
}

async function record(opt) {
  const runs = opt.runs === undefined ? 2 : Number(opt.runs);
  if (!Number.isInteger(runs) || runs < 2) throw new Error("--runs wants an integer 2 or more: the runs on one machine are compared");
  if (opt.out === undefined) throw new Error("record wants --out <file>");
  // @hackbuild/spec ships as source with extensionless imports
  // (core/src/resolve-hook.ts); compare mode needs no build, so only record registers it.
  register(pathToFileURL(path.join(ROOT, "core", "dist", "resolve-hook.js")).href, import.meta.url);
  const sim = await import(pathToFileURL(path.join(SIM, "dist", "rapier", "index.js")).href);
  let scenes = await sim.rapierScenes((file) => import(pathToFileURL(path.join(SIM, "scenes", file)).href));
  if (opt.scene.length > 0) {
    const ids = new Set(scenes.map((s) => s.id));
    for (const s of opt.scene) if (!ids.has(s)) throw new Error(`no scene ${s}; registered: ${[...ids].join(", ")}`);
    scenes = scenes.filter((s) => opt.scene.includes(s.id));
  }
  const rows = (s) => JSON.parse(readFileSync(path.join(SIM, s.worldRows), "utf8"));
  const engine = JSON.parse(readFileSync(path.join(ROOT, "node_modules", "@dimforge", "rapier3d-deterministic-compat", "package.json"), "utf8"));
  const records = [];
  const wallMs = [];
  for (let r = 0; r < runs; r += 1) {
    const t0 = performance.now();
    records.push(await sim.recordScenes(scenes, rows, sim.CHECKPOINT_STEPS));
    wallMs.push(Math.round(performance.now() - t0));
  }
  if (sim.liveWorlds() !== 0) throw new Error(`live worlds after record: ${sim.liveWorlds()}`);
  const head = {
    engine: `${engine.name}@${engine.version}`,
    arch: process.arch,
    platform: process.platform,
    node: process.version,
    every: sim.CHECKPOINT_STEPS,
    scenes: Object.fromEntries(scenes.map((s) => [s.id, s.trials.length])),
    wallMsPerRun: wallMs,
    wallMsNote: "measured on this runner; the hashes are computed",
  };
  let differ = 0;
  for (let r = 1; r < runs; r += 1) {
    process.stdout.write(`run 1 against run ${r + 1} on ${process.arch}\n`);
    differ += report({ ...head, trials: records[0] }, { ...head, trials: records[r] }, "run 1", `run ${r + 1}`);
  }
  writeFileSync(opt.out, `${JSON.stringify({ ...head, trials: records[0] }, null, 2)}\n`);
  process.stdout.write(`wrote ${opt.out}: ${Object.keys(records[0]).length} trials (counted), wall ms per run ${wallMs.join(", ")} (measured, ${process.arch})\n`);
  return differ === 0 ? 0 : 1;
}

async function main(argv) {
  const [mode, ...rest] = argv;
  const opt = args(rest);
  try {
    if (mode === "record") return await record(opt);
    if (mode === "compare" && opt._.length === 2) {
      const [fa, fb] = opt._;
      return report(readRecord(fa), readRecord(fb), fa, fb) === 0 ? 0 : 1;
    }
  } catch (e) {
    process.stderr.write(`compare-snapshots: ${e instanceof Error ? e.message : String(e)}\n`);
    return 2;
  }
  process.stderr.write("usage: compare-snapshots.mjs record --out <file> [--runs N] [--scene <id>]...\n       compare-snapshots.mjs compare <a.json> <b.json>\n");
  return 2;
}

if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}
