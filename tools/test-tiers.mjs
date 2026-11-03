#!/usr/bin/env node
// Test tiers (plan v11.2 Phase 1 item 6b). tools/test-tiers.json holds, for
// every test file a measurement saw, its measured duration and its tier: slow
// above THRESHOLD_S, fast at or below it. The list is generated from the
// measurement reports, never typed. `npm run test:fast` runs everything not
// in the slow tier. tools/agent-hooks/stop-acceptance.mjs has its own, higher
// threshold, measured.hookThresholdS: it skips the related files measured above
// it, so a stop runs most of what an edit touches inside its budget. CI keeps
// running the full suites and stays the gate for both.
//
//   node tools/test-tiers.mjs measure <dir>     vitest per workspace with the
//                                               json reporter, one workspace at a
//                                               time, then node --test per file
//   node tools/test-tiers.mjs generate <dir> [--threshold <s>] [--hook-threshold <s>]
//                                               write tools/test-tiers.json from <dir>
//   node tools/test-tiers.mjs check             shape, listed files exist, tiers agree
//   node tools/test-tiers.mjs slow              the slow tier, one path per line
//   node tools/test-tiers.mjs fast [--owner]    the fast tier (npm run test:fast)
//
// measure runs the whole suite and takes minutes: start it in the background
// with a log. The owner's archives (HBF_ORIGINALS and the other variables of
// tools/test-support/originals-root.ts) must be set for the files that read
// them to measure; fast leaves those files to the owner-files job unless
// --owner is passed.
import { spawn, spawnSync } from "node:child_process";
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, readdirSync, realpathSync, writeFileSync } from "node:fs";
import os from "node:os";
import { join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = resolve(import.meta.dirname, "..");

export const TIERS_FILE = "tools/test-tiers.json";
/** Seconds of measured file duration above which a file is slow. */
export const THRESHOLD_S = 3;
/**
 * Seconds of measured file duration above which the stop hook skips a related
 * file. The hook budget is 300 s (HBF_STOP_BUDGET_S), so this is higher than
 * THRESHOLD_S, which is sized to fit test:fast into 60 s. At 15 s the 59
 * non-owner related files of an edit to core/src/commands/build.ts ran in
 * 43.5 s wall (measured 2026-11-02, load average 12), 40 more than at 3 s.
 */
export const HOOK_THRESHOLD_S = 15;
export const OWNER_SCRIPT = ".github/scripts/owner-files.mjs";
const REPORTER = "tools/test-tiers-reporter.mjs";
const SHOW_SLOWEST = 5;
const RUNNERS = ["vitest", "node"];
const TIERS = ["fast", "slow"];
const ANSI = /\u001b\[[0-9;]*[A-Za-z]/g;

const readJson = (path, fallback) => {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
};
const round1 = (n) => Math.round(n * 10) / 10;

/** The workspace a test file belongs to: packages/<name>, else its top folder. */
export function groupOf(file) {
  const parts = file.split("/");
  return parts[0] === "packages" ? parts.slice(0, 2).join("/") : parts[0];
}

const vitestBin = (root) => join(root, "node_modules", "vitest", "vitest.mjs");

/** The vitest test files the root config includes, repo relative and sorted. */
export function vitestFiles(root = ROOT) {
  const r = spawnSync(process.execPath, [vitestBin(root), "list", "--filesOnly"], { cwd: root, encoding: "utf8", env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" }, maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error(`vitest list exited ${String(r.status)}: ${(r.stderr ?? "").trim().split("\n").pop()}`);
  const out = r.stdout.replace(ANSI, "").split("\n").map((l) => l.trim()).filter((l) => /\.test\.[cm]?[jt]s$/.test(l) && !l.startsWith("/"));
  return [...new Set(out)].sort();
}

/** The paths a glob with * segments matches under root, repo relative. */
function expand(root, pattern) {
  let bases = [""];
  for (const seg of pattern.split("/")) {
    const next = [];
    for (const base of bases) {
      if (!seg.includes("*")) {
        next.push(base ? `${base}/${seg}` : seg);
        continue;
      }
      const re = new RegExp(`^${seg.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*")}$`);
      let names = [];
      try {
        names = readdirSync(join(root, base)).sort();
      } catch {
        // No such folder: no match.
      }
      for (const n of names) if (re.test(n)) next.push(base ? `${base}/${n}` : n);
    }
    bases = next;
  }
  return bases.filter((p) => existsSync(join(root, p)));
}

/** The node test files `npm test` runs, read from the test script's `node --test` globs. */
export function nodeTestFiles(root = ROOT) {
  const script = readJson(join(root, "package.json"), {}).scripts?.test ?? "";
  const m = script.match(/node --test ([^&|;]+)/);
  if (!m) return [];
  const files = m[1].trim().split(/\s+/).flatMap((g) => expand(root, g));
  return [...new Set(files)].sort();
}

/** The parsed tiers file, or null when it is absent or torn. */
export function readTiers(root = ROOT) {
  return readJson(join(root, TIERS_FILE), null);
}

/** The slow-tier paths for one runner, as a Set. */
export function slowFiles(tiers, runner) {
  const out = new Set();
  for (const [file, row] of Object.entries(tiers?.files ?? {})) if (row.tier === "slow" && (!runner || row.runner === runner)) out.add(file);
  return out;
}

/** The tier a measured duration earns. */
export const tierOf = (durationS, thresholdS) => (durationS > thresholdS ? "slow" : "fast");

/**
 * The tiers object for a measurement directory written by `measure`. A vitest
 * duration is the file's tracked time from tools/test-tiers-reporter.mjs
 * (environment, prepare, collect, setup and test phases), else the json
 * reporter's endTime minus startTime (the test and hook phase only).
 */
export function build(root, dir, thresholdS = THRESHOLD_S, hookThresholdS = HOOK_THRESHOLD_S) {
  const m = readJson(join(dir, "measure.json"), null);
  if (!m) throw new Error(`${join(dir, "measure.json")} is missing or torn; run measure first`);
  const real = realpathSync(root);
  const files = {};
  const warnings = [];
  for (const g of m.vitest ?? []) {
    const report = readJson(join(dir, g.report), null);
    if (!report) {
      warnings.push(`${g.group}: report ${g.report} is missing or torn, its files are not listed`);
      continue;
    }
    const times = g.times ? readJson(join(dir, g.times), {}) : {};
    for (const r of report.testResults ?? []) {
      let rel = relative(real, r.name);
      if (rel.startsWith("..")) rel = relative(root, r.name);
      if (rel.startsWith("..") || groupOf(rel) !== g.group) continue;
      const durationS = times[rel] ? times[rel].totalS : round1(Math.max(0, (r.endTime - r.startTime) / 1000));
      files[rel] = { runner: "vitest", durationS, tier: tierOf(durationS, thresholdS) };
      if (r.status !== "passed") warnings.push(`${rel}: ${String(r.status)} when measured, duration may be cut short`);
    }
  }
  for (const n of m.node ?? []) {
    if (!existsSync(join(root, n.file))) continue;
    const durationS = round1(n.durationS);
    files[n.file] = { runner: "node", durationS, tier: tierOf(durationS, thresholdS) };
    if (n.exit !== 0) warnings.push(`${n.file}: exit ${String(n.exit)} when measured, duration may be cut short`);
  }
  const sorted = Object.fromEntries(Object.entries(files).sort(([a], [b]) => (a < b ? -1 : 1)));
  return {
    tiers: {
      measured: {
        date: m.date,
        host: m.host,
        thresholdS,
        hookThresholdS,
        commands: m.commands,
        env: m.env,
        note: "durationS is measured wall time of one file inside its workspace run; vitest files are the tracked time of tools/test-tiers-reporter.mjs (import, collect, setup and test phases), node files are the wall time of node --test on the file",
      },
      files: sorted,
    },
    warnings,
  };
}

/** The tiers object as JSON text with one line per file. */
export function serialize(tiers) {
  const { files, ...head } = tiers;
  const headText = JSON.stringify(head, null, 2).slice(0, -2);
  const rows = Object.entries(files).map(([f, row]) => `    ${JSON.stringify(f)}: ${JSON.stringify(row)}`);
  return `${headText},\n  "files": {\n${rows.join(",\n")}\n  }\n}\n`;
}

/** What is wrong with a tiers object, as strings; empty when it holds. */
export function problems(tiers, root = ROOT) {
  const out = [];
  if (!tiers || typeof tiers !== "object") return ["tools/test-tiers.json is missing or not an object"];
  const m = tiers.measured;
  if (!m || typeof m !== "object") out.push("measured is missing");
  else {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(m.date))) out.push("measured.date is not YYYY-MM-DD");
    if (!(m.thresholdS > 0)) out.push("measured.thresholdS is not a positive number");
    if (!(m.hookThresholdS >= m.thresholdS)) out.push("measured.hookThresholdS is not a number of seconds at or above measured.thresholdS");
    if (!Array.isArray(m.commands) || m.commands.length === 0 || m.commands.some((c) => typeof c !== "string" || c === "")) out.push("measured.commands is not a list of command strings");
    if (!m.host || typeof m.host !== "object") out.push("measured.host is missing");
  }
  const files = tiers.files;
  if (!files || typeof files !== "object" || Array.isArray(files) || Object.keys(files).length === 0) {
    out.push("files is missing or empty");
    return out;
  }
  for (const [file, row] of Object.entries(files)) {
    if (!existsSync(join(root, file))) out.push(`${file}: listed but does not exist`);
    if (!row || typeof row !== "object") {
      out.push(`${file}: row is not an object`);
      continue;
    }
    if (!RUNNERS.includes(row.runner)) out.push(`${file}: runner ${String(row.runner)} is not one of ${RUNNERS.join(", ")}`);
    if (typeof row.durationS !== "number" || !(row.durationS >= 0)) out.push(`${file}: durationS is not a number of seconds`);
    if (!TIERS.includes(row.tier)) out.push(`${file}: tier ${String(row.tier)} is not one of ${TIERS.join(", ")}`);
    else if (typeof row.durationS === "number" && m && m.thresholdS > 0 && row.tier !== tierOf(row.durationS, m.thresholdS)) {
      out.push(`${file}: tier ${row.tier} disagrees with ${row.durationS} s against threshold ${m.thresholdS} s; regenerate, do not edit`);
    }
  }
  return out;
}

/** One child run with stdout and stderr appended to logPath; resolves {status, wallS}. */
function runLogged(argv, opts, logPath) {
  return new Promise((done) => {
    const fd = openSync(logPath, "a");
    const t0 = process.hrtime.bigint();
    const child = spawn(argv[0], argv.slice(1), { ...opts, stdio: ["ignore", fd, fd] });
    const finish = (status) => {
      closeSync(fd);
      done({ status, wallS: Number(process.hrtime.bigint() - t0) / 1e9 });
    };
    child.on("error", () => finish(null));
    child.on("close", (status) => finish(status));
  });
}

/** Measure every vitest workspace and node test file into dir, one run at a time. */
export async function measure(root, dir) {
  mkdirSync(dir, { recursive: true });
  const env = { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0", CI: "1" };
  const byGroup = new Map();
  for (const f of vitestFiles(root)) {
    const g = groupOf(f);
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g).push(f);
  }
  const manifest = {
    date: new Date().toISOString().slice(0, 10),
    host: { platform: process.platform, arch: process.arch, cpus: os.availableParallelism(), memGB: Math.round(os.totalmem() / 2 ** 30), node: process.version, vitest: readJson(join(root, "node_modules", "vitest", "package.json"), {}).version ?? "unknown", loadAvg1mAtStart: round1(os.loadavg()[0]) },
    env: Object.keys(process.env).filter((k) => /^HBF_/.test(k)).sort(),
    commands: [
      "npx vitest run --passWithNoTests --reporter=json --reporter=dot --reporter=tools/test-tiers-reporter.mjs --outputFile.json=<dir>/<workspace>.json <the workspace test files>, one workspace at a time",
      "node --test <file>, one file at a time",
    ],
    vitest: [],
    node: [],
  };
  for (const [group, files] of byGroup) {
    const name = group.replaceAll("/", "-");
    const report = `${name}.json`;
    const log = join(dir, `${name}.log`);
    const times = `${name}.times.json`;
    const argv = [process.execPath, vitestBin(root), "run", "--passWithNoTests", "--reporter=json", "--reporter=dot", `--reporter=${join(root, REPORTER)}`, `--outputFile.json=${join(dir, report)}`, ...files];
    const r = await runLogged(argv, { cwd: root, env: { ...env, HBF_TIERS_DIAG: join(dir, times) } }, log);
    manifest.vitest.push({ group, report, times, files: files.length, wallS: round1(r.wallS), exit: r.status, loadAvg1m: round1(os.loadavg()[0]) });
    console.log(`measure: ${group} ${files.length} files wall ${round1(r.wallS)} s exit ${String(r.status)} load ${round1(os.loadavg()[0])}`);
  }
  for (const file of nodeTestFiles(root)) {
    const log = join(dir, "node.log");
    const r = await runLogged([process.execPath, "--test", file], { cwd: root, env }, log);
    manifest.node.push({ file, durationS: round1(r.wallS), exit: r.status, loadAvg1m: round1(os.loadavg()[0]) });
    console.log(`measure: ${file} wall ${round1(r.wallS)} s exit ${String(r.status)} load ${round1(os.loadavg()[0])}`);
  }
  writeFileSync(join(dir, "measure.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

/** The --exclude flags for the test files that read the owner's archives, from the owner-files script. */
function ownerExcludes(root) {
  const script = join(root, OWNER_SCRIPT);
  if (!existsSync(script)) return [];
  const r = spawnSync(process.execPath, [script, "excludes"], { cwd: root, encoding: "utf8" });
  return r.status === 0 ? r.stdout.split("\n").filter((l) => l.startsWith("--exclude=")) : [];
}

const spawnInherit = (argv, opts) =>
  new Promise((done) => {
    const child = spawn(argv[0], argv.slice(1), { ...opts, stdio: "inherit" });
    child.on("error", () => done(null));
    child.on("close", (status) => done(status));
  });

/** One child with stdout and stderr collected: resolves {status, out}. */
const spawnCollect = (argv, opts) =>
  new Promise((done) => {
    const child = spawn(argv[0], argv.slice(1), { ...opts, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    child.stdout.on("data", (b) => (out += b));
    child.stderr.on("data", (b) => (out += b));
    child.on("error", () => done({ status: null, out }));
    child.on("close", (status) => done({ status, out }));
  });

/** Run the fast tier: vitest over every file not slow, then the fast node tests. Returns the exit code. */
export async function fast(root, { owner = false } = {}) {
  const tiers = readTiers(root);
  const all = problems(tiers, root);
  const stale = all.filter((p) => p.endsWith("listed but does not exist"));
  const bad = all.filter((p) => !stale.includes(p));
  if (bad.length) {
    console.error(`test:fast: ${TIERS_FILE} is not usable, ${bad[0]}. measure and generate it again: node tools/test-tiers.mjs measure <dir>, then generate <dir>.`);
    return 1;
  }
  for (const p of stale) console.error(`test:fast: warning ${p}; regenerate ${TIERS_FILE}`);
  const t0 = Date.now();
  const slowV = [...slowFiles(tiers, "vitest")].sort();
  const slowN = [...slowFiles(tiers, "node")].sort();
  const ownerFlags = owner ? [] : ownerExcludes(root);
  const excludes = [...slowV.map((f) => `--exclude=${join(root, f)}`), ...ownerFlags];
  const env = { ...process.env, CI: process.env.CI ?? "1" };
  // tsc -b first, since the node tests and the build sandbox run the compiled dist; then
  // vitest and the node tests share the cores. The node report prints after vitest's.
  const tsc = await spawnInherit([join(root, "node_modules", ".bin", "tsc"), "-b"], { cwd: root, env });
  if (tsc !== 0) {
    console.error(`test:fast: tsc -b exited ${String(tsc)}; fix the build before the tests run against a stale dist`);
    return 1;
  }
  const slowSet = new Set(slowN);
  const nodeFiles = nodeTestFiles(root).filter((f) => !slowSet.has(f));
  const nodeRun = nodeFiles.length ? spawnCollect([process.execPath, "--test", "--test-reporter=dot", ...nodeFiles], { cwd: root, env }).then((r) => ({ ...r, wallS: (Date.now() - t0) / 1000 })) : Promise.resolve({ status: 0, out: "", wallS: 0 });
  const vStatus = await spawnInherit([process.execPath, vitestBin(root), "run", "--passWithNoTests", ...excludes], { cwd: root, env });
  const vWallS = (Date.now() - t0) / 1000;
  const node = await nodeRun;
  if (node.out) console.log(`\nnode --test, ${nodeFiles.length} files:\n${node.out.replace(ANSI, "").trim()}`);
  const nStatus = node.status;
  const wallS = (Date.now() - t0) / 1000;
  const dur = (f) => `${f} (${tiers.files[f].durationS} s measured)`;
  console.log(`\ntest:fast: vitest exit ${String(vStatus)} after ${vWallS.toFixed(1)} s, node exit ${String(nStatus)} after ${node.wallS.toFixed(1)} s, wall ${wallS.toFixed(1)} s (measured), load average ${os.loadavg()[0].toFixed(1)} at the end`);
  console.log(`not run, slow tier above ${tiers.measured.thresholdS} s (measured ${tiers.measured.date}), CI is the gate: ${slowV.length} vitest files, ${slowN.length} node files; node tools/test-tiers.mjs slow lists them. slowest:`);
  for (const f of [...slowV, ...slowN].sort((a, b) => tiers.files[b].durationS - tiers.files[a].durationS).slice(0, SHOW_SLOWEST)) console.log(`  ${dur(f)}`);
  if (ownerFlags.length) console.log(`not run, owner files that read the owner's archives: ${ownerFlags.length} vitest files; pass --owner with HBF_ORIGINALS set, or run the owner-files job`);
  return vStatus === 0 && nStatus === 0 ? 0 : 1;
}

async function main(argv) {
  const [cmd, ...rest] = argv;
  if (cmd === "measure" && rest[0]) {
    const m = await measure(ROOT, resolve(rest[0]));
    return m.vitest.some((g) => g.exit === null) ? 1 : 0;
  }
  if (cmd === "generate" && rest[0]) {
    const secs = (name, fallback) => {
      const at = rest.indexOf(name);
      return at >= 0 ? Number(rest[at + 1]) : fallback;
    };
    const thresholdS = secs("--threshold", THRESHOLD_S);
    const hookThresholdS = secs("--hook-threshold", HOOK_THRESHOLD_S);
    if (!(thresholdS > 0) || !(hookThresholdS >= thresholdS)) {
      console.error("test-tiers: fail --threshold and --hook-threshold need positive numbers of seconds, the hook one not below the other");
      return 2;
    }
    const { tiers, warnings } = build(ROOT, resolve(rest[0]), thresholdS, hookThresholdS);
    for (const w of warnings) console.error(`test-tiers: warning ${w}`);
    const bad = problems(tiers, ROOT);
    if (bad.length) {
      for (const b of bad) console.error(`test-tiers: fail ${b}`);
      return 1;
    }
    writeFileSync(join(ROOT, TIERS_FILE), serialize(tiers));
    const rows = Object.values(tiers.files);
    console.log(`test-tiers: wrote ${TIERS_FILE}, ${rows.length} files, ${rows.filter((r) => r.tier === "slow").length} slow above ${tiers.measured.thresholdS} s, ${rows.filter((r) => r.runner === "vitest" && r.durationS > tiers.measured.hookThresholdS).length} vitest files over the hook threshold ${tiers.measured.hookThresholdS} s`);
    return 0;
  }
  if (cmd === "check") {
    const tiers = readTiers(ROOT);
    const bad = problems(tiers, ROOT);
    for (const b of bad) console.error(`test-tiers: fail ${b}`);
    if (!bad.length) console.log(`test-tiers: ${Object.keys(tiers.files).length} files listed, ${slowFiles(tiers).size} slow`);
    return bad.length ? 1 : 0;
  }
  if (cmd === "slow") {
    for (const f of [...slowFiles(readTiers(ROOT))].sort()) console.log(f);
    return 0;
  }
  if (cmd === "fast") return fast(ROOT, { owner: rest.includes("--owner") });
  console.error("usage: node tools/test-tiers.mjs measure <dir> | generate <dir> | check | slow | fast [--owner]");
  return 2;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  process.exitCode = await main(process.argv.slice(2));
}
