// SLUG trial runner and recorder (M02-T08).
//
//   node scripts/slug.mjs run [--scene slug|slug-mouth58] [--trials N] [--seed S]
//     runs the scene and prints the TrialResult, the exit row line and the
//     per-trial deliveries as JSON; exits 0 when the measured set equals the
//     scene's declared expectation and 1 otherwise (D-153). It stands in for
//     `hbf sim.run --scene slug` until M02-T11 registers that command.
//   node scripts/slug.mjs record
//     runs 8 trials (seeds 1 to 8), 30 trials (seeds 1 to 30) and the 58 mm
//     mouth scene, and writes records/slug-trials.json with the wall times
//     of this machine (measured).
//
// Needs `npx tsc -b` first: it loads dist/ and strips types from scenes/.

import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { register } from "node:module";
import { cpus, platform, release } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const pkg = join(here, "..");
const root = join(pkg, "..", "..");
register(pathToFileURL(join(root, "core", "dist", "resolve-hook.js")));

const { applyVariant, runSlugTrials, slugVerdict } = await import(pathToFileURL(join(pkg, "dist", "capsule", "vend.js")).href);
const { SLUG_SCENE } = await import(pathToFileURL(join(pkg, "scenes", "slug.ts")).href);
const { SLUG_MOUTH58 } = await import(pathToFileURL(join(pkg, "scenes", "slug-mouth58.ts")).href);

const SCENES = { slug: SLUG_SCENE, "slug-mouth58": applyVariant(SLUG_SCENE, SLUG_MOUTH58) };

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : fallback;
}

function machine() {
  const t = spawnSync("sysctl", ["-n", "sysctl.proc_translated"], { encoding: "utf8" });
  const translated = t.status === 0 && t.stdout.trim() === "1";
  return { cpu: cpus()[0]?.model ?? "unknown", os: `${platform()} ${release()}`, arch: process.arch, translated, node: process.version };
}

const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;

function run() {
  const id = arg("--scene", "slug");
  const scene = SCENES[id];
  if (scene === undefined) {
    process.stderr.write(`E_REF /scene: got ${id}, expected one of ${Object.keys(SCENES).join(", ")}\n`);
    process.exit(2);
  }
  const r = runSlugTrials(scene, Number(arg("--trials", String(scene.trials))), Number(arg("--seed", String(scene.seed))), () => performance.now());
  const v = slugVerdict(scene, r);
  process.stdout.write(`${JSON.stringify({ ...r.result, line: v.line, met: v.met, delivered: r.rows.map((t) => ({ seed: t.seed, delivered: t.delivered })) }, null, 2)}\n`);
  process.exit(v.met ? 0 : 1);
}

function record() {
  const clock = () => performance.now();
  const strip = ({ result, rows }) => ({ result, rows });
  const r8 = runSlugTrials(SLUG_SCENE, 8, 1, clock);
  const r30 = runSlugTrials(SLUG_SCENE, 30, 1, clock);
  const m58 = SCENES["slug-mouth58"];
  const r58 = runSlugTrials(m58, m58.trials, m58.seed, clock);
  const vends = m58.protocol.vends;
  // The first 13 vends of a 16-vend trial are the 13-vend trial: the protocol is identical up to vend 13.
  const base = r8.rows.slice(0, m58.trials).map((t) => t.delivered.slice(0, vends).filter((n) => n === 1).length);
  const rec = {
    card: "M02-T08",
    note: "Pass counts are computed; wallMs is measured on the machine below. The runner behind BUILD.md's 126 of 128 is absent, so the protocol is the card's (M02-T08 step 4) and the expectation stays unverified until a run reproduces it.",
    date: new Date().toISOString().slice(0, 10),
    machine: machine(),
    program: "packages/sim/src/capsule/vend.ts with scenes packages/sim/scenes/slug.ts and slug-mouth58.ts",
    exitRow: slugVerdict(SLUG_SCENE, r8).line,
    trials8: strip(r8),
    trials30: strip(r30),
    mouth58: {
      ...strip(r58),
      meanPasses: mean(r58.rows.map((t) => t.passes)),
      mouth156MeanPasses: mean(base),
      mouth156Source: `trials8 seeds 1 to ${m58.trials}, passes among the first ${vends} vends`,
      belowMouth156: mean(r58.rows.map((t) => t.passes)) < mean(base),
      bench: "mean 5.5 of 13, worst 2 (BUILD.md line 234, declared)",
    },
  };
  const path = join(pkg, "records", "slug-trials.json");
  writeFileSync(path, `${JSON.stringify(rec, null, 2)}\n`);
  process.stdout.write(`wrote ${relative(root, path)}: ${rec.exitRow}; 30 trials ${r30.result.passes} of ${r30.result.runs}; mouth58 mean ${rec.mouth58.meanPasses} against ${rec.mouth58.mouth156MeanPasses}; wall ms ${Math.round(r8.result.wallMs)}, ${Math.round(r30.result.wallMs)}, ${Math.round(r58.result.wallMs)}\n`);
}

const mode = process.argv[2];
if (mode === "run") run();
else if (mode === "record") record();
else {
  process.stderr.write("usage: node scripts/slug.mjs run|record\n");
  process.exit(2);
}
