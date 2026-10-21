// PAWL suite runner and recorder (M02-T03).
//
//   node scripts/pawl.mjs run [--record]
//     runs the port on the adopted Rapier, prints the measured and declared
//     pass sets, exits 0 when they are equal and 1 otherwise (D-153);
//     --record writes records/pawl-0.21.0-<arch>.json.
//   node scripts/pawl.mjs legacy <dir>
//     runs `node final.mjs` unchanged in <dir> (final.mjs, core.mjs and
//     @dimforge/rapier3d-compat 0.14.0 installed with npm i --no-save) and
//     writes records/pawl-legacy-0.14.0-<arch>.json.
//
// Needs `npx tsc -b` first: it loads dist/ and strips types from scenes/.

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { register } from "node:module";
import { cpus, release, platform } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const pkg = join(here, "..");
const root = join(pkg, "..", "..");
register(pathToFileURL(join(root, "core", "dist", "resolve-hook.js")));

const sha256 = (s) => createHash("sha256").update(s).digest("hex");

function machine() {
  const t = spawnSync("sysctl", ["-n", "sysctl.proc_translated"], { encoding: "utf8" });
  const translated = t.status === 0 && t.stdout.trim() === "1";
  return { cpu: cpus()[0]?.model ?? "unknown", os: `${platform()} ${release()}`, arch: process.arch, translated, node: process.version };
}

function write(name, record) {
  const path = join(pkg, "records", name);
  writeFileSync(path, `${JSON.stringify(record, null, 2)}\n`);
  process.stdout.write(`wrote ${relative(root, path)}\n`);
}

const LINE = /^ (.{26}) (PASS|FAIL @(\d+\.\d)s)  tilt (-?\d+\.\d)deg  y(-?\d+)  travel (-?\d+)mm  drift (-?\d+)mm  peak (\d+)% (\S*)$/;

/** Per-trial rows parsed from final.mjs stdout; the values are its rounded prints. */
function parseLegacy(text) {
  const rows = [];
  let group = "";
  for (const line of text.split("\n")) {
    const m = LINE.exec(line);
    if (m) {
      rows.push({ label: m[1].trimEnd(), group, ok: m[2] === "PASS", fellS: m[3] === undefined ? null : Number(m[3]), tiltDeg: Number(m[4]), heightMm: Number(m[5]), travelMm: Number(m[6]), driftMm: Number(m[7]), peakPct: Number(m[8]), peakJoint: m[9], line });
    } else if (line !== "" && !/^\d+\/\d+ pass/.test(line)) {
      group = line;
    }
  }
  return rows;
}

async function run(record) {
  const { runPawlSuite, legacyOutput } = await import(pathToFileURL(join(pkg, "dist", "programs", "pawl", "suite.js")).href);
  const { PAWL_SCENE } = await import(pathToFileURL(join(pkg, "scenes", "pawl.ts")).href);
  const { liveWorlds } = await import(pathToFileURL(join(pkg, "dist", "rapier", "world.js")).href);
  const res = await runPawlSuite(PAWL_SCENE);
  const out = legacyOutput(res.rows);
  process.stdout.write(out);
  process.stdout.write(`measured pass (${res.verdict.measuredPass.length}): ${res.verdict.measuredPass.join(", ")}\n`);
  process.stdout.write(`declared pass (${res.verdict.declaredPass.length}): ${res.verdict.declaredPass.join(", ")}\n`);
  process.stdout.write(`status: ${res.status}; exit ${res.verdict.exitCode}; live worlds ${liveWorlds()}; wall ${(res.trials.wallMs / 1000).toFixed(2)} s (measured)\n`);
  if (record) {
    const rapier = JSON.parse(readFileSync(join(root, "node_modules", "@dimforge", "rapier3d-deterministic-compat", "package.json"), "utf8"));
    write(`pawl-0.21.0-${process.arch}.json`, {
      record: "PAWL port on the adopted Rapier, M02-T03 step 4",
      pin: `${rapier.name} ${rapier.version}`,
      program: "packages/sim/src/programs/pawl/suite.ts with scene packages/sim/scenes/pawl.ts",
      command: "npm run pawl:record -w packages/sim",
      machine: machine(),
      date: new Date().toISOString().slice(0, 10),
      qualifier: "trial results computed; wallS measured on the machine named",
      wallS: Number((res.trials.wallMs / 1000).toFixed(2)),
      outputSha256: sha256(out),
      runs: res.trials.runs,
      passes: res.trials.passes,
      worst: res.trials.worst,
      lastSnapshotHash: res.trials.snapshotHash,
      verdict: { ...res.verdict, status: res.status },
      trials: res.rows,
    });
  }
  if (liveWorlds() !== 0) process.exitCode = 70;
  else process.exitCode = res.verdict.exitCode;
}

function legacy(dir) {
  const rapier = JSON.parse(readFileSync(join(dir, "node_modules", "@dimforge", "rapier3d-compat", "package.json"), "utf8"));
  if (rapier.version !== "0.14.0") throw new Error(`legacy pin is ${rapier.version}; install @dimforge/rapier3d-compat@0.14.0 with npm i --no-save`);
  // The pinned sha256 of each file is its lineage row's (pawl.final/sim-trials, pawl.core/final), the originals of record.
  const lineage = JSON.parse(readFileSync(join(root, "lineage.json"), "utf8"));
  for (const [f, id] of [["final.mjs", "pawl.final/sim-trials"], ["core.mjs", "pawl.core/final"]]) {
    const row = lineage.find((r) => r.id === id);
    if (row === undefined) throw new Error(`lineage.json has no row ${id}`);
    const a = sha256(readFileSync(join(dir, f)));
    if (a !== row.sha256) throw new Error(`${f} in ${dir} differs from ${row.source} (lineage ${id})`);
  }
  const t0 = Date.now();
  const r = spawnSync(process.execPath, ["final.mjs"], { cwd: dir, encoding: "utf8" });
  const wallS = (Date.now() - t0) / 1000;
  if (r.status !== 0) throw new Error(`final.mjs exited ${r.status}: ${r.stderr}`);
  const rows = parseLegacy(r.stdout);
  process.stdout.write(r.stdout);
  write(`pawl-legacy-0.14.0-${process.arch}.json`, {
    record: "PAWL legacy suite, final.mjs unchanged on its own pin, M02-T03 step 1",
    pin: `${rapier.name} ${rapier.version}`,
    inputs: { "final.mjs": sha256(readFileSync(join(dir, "final.mjs"))), "core.mjs": sha256(readFileSync(join(dir, "core.mjs"))) },
    command: "node final.mjs (via node packages/sim/scripts/pawl.mjs legacy <dir>)",
    machine: machine(),
    date: new Date().toISOString().slice(0, 10),
    qualifier: "trial results computed, rounded as final.mjs prints them; wallS measured on the machine named",
    wallS: Number(wallS.toFixed(2)),
    legacyExit: r.status,
    outputSha256: sha256(r.stdout),
    runs: rows.length,
    passes: rows.filter((x) => x.ok).length,
    pass: rows.filter((x) => x.ok).map((x) => x.label),
    fall: rows.filter((x) => !x.ok).map((x) => x.label),
    trials: rows,
  });
}

const [cmd, arg] = process.argv.slice(2);
if (cmd === "run") await run(process.argv.includes("--record"));
else if (cmd === "legacy" && arg) legacy(arg);
else {
  process.stderr.write("usage: node scripts/pawl.mjs run [--record] | legacy <dir>\n");
  process.exitCode = 2;
}
