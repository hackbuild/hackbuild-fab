#!/usr/bin/env node
// M04-T10 (D-051, D-052, D-056): the build hash, every body meshHash and the
// reportHash of each reference reproduce on a cold rebuild. Pass one
// exports the tree to a fresh directory at another path, installs it with
// npm ci, and runs `hbf part.build` and `hbf check.run` per reference under
// a foreign time zone, locale and home directory, with SOURCE_DATE_EPOCH set
// to the value the reference's expected/build.json inputs record. Pass two
// removes the working tree's .hbf store and rebuilds in place. Every stored
// build, report and artifact of both passes is then scanned for the
// temporary directory and both home directories.
//
// The tree exported is HEAD. Before the first commit there is no HEAD, and
// the export is the working tree as git would stage it (tracked plus
// untracked files outside .gitignore); the first line printed names which.
//
// Output: one line per reference and pass,
//   <reference> <pass> build ok mesh ok report ok
// with "fail" and the two hashes in place of "ok" on a mismatch; a board
// reference (M08) reads `<reference> <pass> parity ok`, or the goldens
// `hbf parity` found unequal. Then one
// line for the path leak scan. Exit 0 only when every line is ok.
//
// Flags: --only cold|warm runs one pass; --keep keeps the temporary tree.
// The references are listed by tools/determinism/hashes.mjs references(),
// so this file holds no list of its own.

import { execFileSync, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** The foreign environment of pass one (M04-T10 step 1). */
export const FOREIGN = { TZ: "Pacific/Chatham", LANG: "tr_TR.UTF-8", LC_ALL: "tr_TR.UTF-8" };

/** What a reference's expected/ directory holds for the comparison. */
export function expectedOf(refDir) {
  const build = JSON.parse(readFileSync(path.join(refDir, "expected", "build.json"), "utf8"));
  const report = JSON.parse(readFileSync(path.join(refDir, "expected", "report.json"), "utf8"));
  const epoch = build?.inputs?.sourceDateEpoch;
  if (!Number.isSafeInteger(epoch)) throw new Error(`${refDir}: expected/build.json inputs.sourceDateEpoch is ${String(epoch)}, want whole seconds`);
  if (typeof build.buildHash !== "string" || typeof report.reportHash !== "string") {
    throw new Error(`${refDir}: expected/build.json buildHash or expected/report.json reportHash is missing`);
  }
  return { buildHash: build.buildHash, meshHashes: build.meshHashes ?? {}, reportHash: report.reportHash, sourceDateEpoch: epoch };
}

/**
 * What a board reference's expected/ holds (M08): the board build hash, the
 * artifact hashes and, when its build reads one, the epoch. A board has no
 * bodies, and a wiring board runs no checks, so neither meshHashes nor
 * report.json is asked of it; `hbf parity` compares every golden it keeps.
 */
export function boardExpectedOf(refDir) {
  const build = JSON.parse(readFileSync(path.join(refDir, "expected", "build.json"), "utf8"));
  const artifacts = JSON.parse(readFileSync(path.join(refDir, "expected", "artifacts.json"), "utf8"));
  const epoch = build?.inputs?.sourceDateEpoch;
  if (typeof build.buildHash !== "string") throw new Error(`${refDir}: expected/build.json buildHash is missing`);
  if (epoch !== undefined && !Number.isSafeInteger(epoch)) throw new Error(`${refDir}: expected/build.json inputs.sourceDateEpoch is ${String(epoch)}, want whole seconds`);
  return { buildHash: build.buildHash, artifactHashes: artifacts, sourceDateEpoch: epoch };
}

/** One comparison line for a board reference from its `hbf parity --json` result; ok only when every golden is equal. */
export function parityLine(ref, pass, got) {
  const differs = (got.files ?? []).filter((f) => f.status !== "equal").map((f) => `${f.file} ${f.status}`);
  const ok = got.ok === true && got.accepted !== true && differs.length === 0;
  return { ok, line: `${ref} ${pass} parity ${ok ? "ok" : `fail ${differs.join(", ") || "not ok"}`}` };
}

const short = (h) => String(h).slice(0, 12);

/** Mesh hashes compared by body id; a body missing on either side is a mismatch. */
function meshDiff(got, want) {
  const ids = [...new Set([...Object.keys(got), ...Object.keys(want)])].sort();
  return ids.filter((id) => got[id] !== want[id]).map((id) => `${id} ${short(got[id] ?? "absent")} want ${short(want[id] ?? "absent")}`);
}

/**
 * One comparison line. got = {buildHash, meshHashes, reportHash} read from
 * the hbf output; want = expectedOf(). ok is true only when all three agree.
 */
export function compareLine(ref, pass, got, want) {
  const parts = [];
  let ok = true;
  if (got.buildHash === want.buildHash) parts.push("build ok");
  else { ok = false; parts.push(`build fail ${short(got.buildHash)} want ${short(want.buildHash)}`); }
  const md = meshDiff(got.meshHashes, want.meshHashes);
  if (md.length === 0) parts.push("mesh ok");
  else { ok = false; parts.push(`mesh fail ${md.join(", ")}`); }
  if (got.reportHash === want.reportHash) parts.push("report ok");
  else { ok = false; parts.push(`report fail ${short(got.reportHash)} want ${short(want.reportHash)}`); }
  return { ok, line: `${ref} ${pass} ${parts.join(" ")}` };
}

/** Files under dir, recursively; an absent dir has none. */
function filesUnder(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) out.push(...filesUnder(p));
    else out.push(p);
  }
  return out;
}

/**
 * Stored files under storeDirs whose bytes hold any of the needles (step 3).
 * Bytes are searched as latin1 so a path inside a zip or an .hbfm header
 * is found as well as one in JSON; a deflated entry hides its text, so a
 * 3MF is scanned through its inflated entries by the caller's reader when
 * one is passed.
 */
export async function pathLeaks(storeDirs, needles, inflate) {
  const found = [];
  const wanted = needles.filter((n) => typeof n === "string" && n.length > 1);
  for (const dir of storeDirs) {
    for (const file of filesUnder(dir)) {
      const bytes = readFileSync(file);
      const texts = [bytes.toString("latin1")];
      if (inflate !== undefined && bytes[0] === 0x50 && bytes[1] === 0x4b) {
        for (const v of Object.values(await inflate(new Uint8Array(bytes)))) texts.push(typeof v === "string" ? v : Buffer.from(v).toString("latin1"));
      }
      for (const n of wanted) if (texts.some((t) => t.includes(n))) found.push(`${file} holds ${n}`);
    }
  }
  return found;
}

/** The hashes one reference rebuilds to, from `hbf part.build --detail full` and `hbf check.run` in cwd. */
function rebuildRef(cwd, ref, env) {
  const run = (args) => {
    const r = spawnSync("npx", ["--no-install", "hbf", ...args], { cwd, env, encoding: "utf8", maxBuffer: 256 * 2 ** 20 });
    let j;
    try { j = JSON.parse(r.stdout); } catch { throw new Error(`hbf ${args.join(" ")} in ${cwd} printed no json (exit ${r.status}): ${r.stderr.slice(0, 400)}`); }
    if (j.errors?.length > 0) throw new Error(`hbf ${args.join(" ")}: ${JSON.stringify(j.errors[0])}`);
    return j;
  };
  const built = run(["part.build", ref, "--detail", "full", "--json"]);
  const bodies = built.result?.ir?.bodies ?? [];
  const checked = run(["check.run", ref, "--json"]);
  const report = String(checked.result?.report ?? "");
  return {
    buildHash: built.buildHash,
    meshHashes: Object.fromEntries(bodies.map((b) => [b.id, b.mesh.hash])),
    reportHash: report.startsWith("hbf://report/") ? report.slice("hbf://report/".length) : report,
  };
}

/** A board reference rebuilt and compared against every golden by `hbf parity` in cwd. */
function rebuildBoard(cwd, ref, env) {
  const r = spawnSync("npx", ["--no-install", "hbf", "parity", ref, "--json"], { cwd, env, encoding: "utf8", maxBuffer: 256 * 2 ** 20 });
  try { return JSON.parse(r.stdout); } catch { throw new Error(`hbf parity ${ref} in ${cwd} printed no json (exit ${r.status}): ${r.stderr.slice(0, 400)}`); }
}

/** The env of one hbf run: nothing inherited but PATH, so no outside variable reaches the build. */
function runEnv(base, epoch) {
  return { PATH: process.env.PATH ?? "", ...base, ...(epoch === undefined ? {} : { SOURCE_DATE_EPOCH: String(epoch) }) };
}

const sh = (cmd, args, cwd, extra = {}) => execFileSync(cmd, args, { cwd, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8", maxBuffer: 256 * 2 ** 20, ...extra });

function hasHead() {
  try { sh("git", ["rev-parse", "--verify", "-q", "HEAD"], ROOT); return true; } catch { return false; }
}

/** Export the tree to dest: HEAD by git archive, or the would-be-staged working tree when no commit exists. */
function exportTree(dest) {
  mkdirSync(dest, { recursive: true });
  if (hasHead()) {
    const tar = spawnSync("git", ["archive", "HEAD"], { cwd: ROOT, maxBuffer: 2 ** 31 - 1 });
    if (tar.status !== 0) throw new Error(`git archive HEAD failed: ${String(tar.stderr)}`);
    const x = spawnSync("tar", ["-x", "-C", dest], { input: tar.stdout });
    if (x.status !== 0) throw new Error(`tar -x failed: ${String(x.stderr)}`);
    return "HEAD";
  }
  const files = sh("git", ["ls-files", "-z", "-co", "--exclude-standard"], ROOT).split("\0").filter((f) => f !== "");
  for (const f of files) {
    const from = path.join(ROOT, f);
    if (!existsSync(from)) continue;
    mkdirSync(path.dirname(path.join(dest, f)), { recursive: true });
    cpSync(from, path.join(dest, f));
  }
  return `working tree as staged (no HEAD commit), ${files.length} files`;
}

async function main(argv) {
  const only = argv.includes("--only") ? argv[argv.indexOf("--only") + 1] : undefined;
  const keep = argv.includes("--keep");
  const { references, boardReferences } = await import("./determinism/hashes.mjs");
  const refs = references();
  const boards = await boardReferences();
  if (refs.length === 0) { console.log("no reference with chase.ts under reference/"); return 1; }
  const tmp = os.tmpdir();
  const hex = randomBytes(4).toString("hex");
  const clone = path.join(tmp, `cold-${hex}`);
  const home = path.join(tmp, `home-${hex}`);
  let ok = true;
  const stores = [];
  const lines = [];
  const say = (s) => { lines.push(s); console.log(s); };

  try {
    if (only === undefined || only === "cold") {
      const what = exportTree(clone);
      say(`cold tree ${clone} from ${what}`);
      mkdirSync(home, { recursive: true });
      // npm keeps the caller's HOME so its cache answers offline; only hbf runs see the foreign home.
      sh("npm", ["ci", "--ignore-scripts", "--no-audit", "--no-fund", "--prefer-offline"], clone, { timeout: 20 * 60 * 1000 });
      sh("npx", ["--no-install", "tsc", "-b"], clone, { timeout: 20 * 60 * 1000 });
      for (const ref of refs) {
        if (!existsSync(path.join(clone, ref, "chase.ts"))) { ok = false; say(`${ref} cold fail: absent from the exported tree`); continue; }
        if (boards.has(ref)) {
          const c = parityLine(ref, "cold", rebuildBoard(clone, ref, runEnv({ ...FOREIGN, HOME: home }, boardExpectedOf(path.join(ROOT, ref)).sourceDateEpoch)));
          ok &&= c.ok;
          say(c.line);
          continue;
        }
        const want = expectedOf(path.join(ROOT, ref));
        const got = rebuildRef(clone, ref, runEnv({ ...FOREIGN, HOME: home }, want.sourceDateEpoch));
        const c = compareLine(ref, "cold", got, want);
        ok &&= c.ok;
        say(c.line);
      }
      stores.push(path.join(clone, ".hbf"));
    }
    if (only === undefined || only === "warm") {
      // Step 2: the store is a content-addressed cache; removing it forces every object to be rebuilt.
      rmSync(path.join(ROOT, ".hbf"), { recursive: true, force: true });
      for (const ref of refs) {
        if (boards.has(ref)) {
          const c = parityLine(ref, "warm", rebuildBoard(ROOT, ref, runEnv({ HOME: os.homedir() }, boardExpectedOf(path.join(ROOT, ref)).sourceDateEpoch)));
          ok &&= c.ok;
          say(c.line);
          continue;
        }
        const want = expectedOf(path.join(ROOT, ref));
        const got = rebuildRef(ROOT, ref, runEnv({ HOME: os.homedir() }, want.sourceDateEpoch));
        const c = compareLine(ref, "warm", got, want);
        ok &&= c.ok;
        say(c.line);
      }
      stores.push(path.join(ROOT, ".hbf"));
    }
    const { readEntries } = await import(new URL("../packages/3mf/dist/index.js", import.meta.url).href);
    const leaks = await pathLeaks(stores, [tmp, clone, home, os.homedir()], readEntries);
    if (leaks.length === 0) say(`path leak scan ok: ${stores.length} store(s), no ${tmp}, cold tree or home path in any stored object`);
    else { ok = false; for (const l of leaks) say(`path leak fail: ${l}`); }
  } finally {
    if (!keep) {
      rmSync(clone, { recursive: true, force: true });
      rmSync(home, { recursive: true, force: true });
    }
  }
  return ok ? 0 : 1;
}

if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}
