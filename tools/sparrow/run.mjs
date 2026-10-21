#!/usr/bin/env node
// M07-T13: the sparrow evaluation. Evaluation only (D-137); nothing under
// packages/ imports this file, and nest keeps refusing packer "sparrow"
// until a DECISIONS.md entry adopts it.
//
//   node tools/sparrow/run.mjs build-record           merge the build of tools/sparrow/build.sh
//   node tools/sparrow/run.mjs eval [options]         run the sets and merge the results
//   node tools/sparrow/run.mjs repro-record <a> <b>   compare two build folders (tools/sparrow/repro.sh)
//
// eval options:
//   --time <s>        sparrow time limit per strip (default 60, the card's)
//   --seeds <a,b>     seeds, each run twice (default 1,2)
//   --sets <a,b>      sets to run (default every set)
//   --wasm-sets <a,b> sets also run once through the wasm build at the first seed (default slug-acrylic)
//   --out <file>      the record (default packages/nest/records/sparrow-eval.json)
//
// The work folder is $SPARROW_WORK, default the sparrow folder of the
// fab-knowledge evidence tree, where build.sh keeps the pinned checkout,
// the native binary and the wasm package. Every sparrow run gets a folder
// of its own under <work>/runs, since the CLI writes to ./output.
//
// The sets (M07-T13 Inputs): SLUG ply and SLUG acrylic from the scene of
// M07-T07 (packages/nest/scenes/slug-sheets.ts, kerf mode none), and the
// OGEE16 R16 lasercut of M07-T06 (records/ogee16-connect.json, compensated
// at the cutfiles.py KERF, margin and gap the cutfiles.py GAP). Both sides
// get one request: fill mode, part-in-part on, quarter turns 0, 90, 180,
// 270. nest packs it with its own candidates (connect.ts packSheets);
// sparrow packs the roots nest's part-in-part pass leaves, strip by strip,
// and the inners ride with their hosts (M07-T13 step 2).

import { spawn, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { register } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import vm from "node:vm";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
register(pathToFileURL(path.join(ROOT, "core/dist/resolve-hook.js")).href, import.meta.url);
const { composePlacement, extentOf, keyOf, layoutHash, nestHoles, packSheets, ringsById } = await import("@hackbuild/nest");
const { loadGeom } = await import("@hackbuild/geom");
const { createProfileLookup, loadProfile } = await import("@hackbuild/profile");
const { QUARTER_TURNS, readSolution, stripFrame, toInstance } = await import("./to-instance.mjs");
const { slugSheetsScene, SLUG_STOCKS } = await import(pathToFileURL(path.join(ROOT, "packages/nest/scenes/slug-sheets.ts")).href);

export const WORK = process.env.SPARROW_WORK ?? path.resolve(ROOT, "..", "fab-knowledge", "evidence", "sparrow");
const RECORD = path.join(ROOT, "packages/nest/records/sparrow-eval.json");
const NATIVE = path.join(WORK, "src/target/release/sparrow");
const PKG = path.join(WORK, "pkg");
const WASM = path.join(PKG, "hbf_sparrow_wasm_bg.wasm");
const GLUE = path.join(PKG, "hbf_sparrow_wasm.js");
/** Bake ceiling, bytes (D-129). */
const BAKE_LIMIT = 16 * 1024 * 1024;
/** Separation the read back must keep, below the gap, mm: sparrow stores f32. */
const SEP_TOL = 1e-3;

const sha = (b) => createHash("sha256").update(b).digest("hex");
const now = () => performance.now();
const round = (v, d = 3) => Math.round(v * 10 ** d) / 10 ** d;
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

function args(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith("--")) throw new Error(`unexpected argument ${argv[i]}`);
    o[argv[i].slice(2)] = argv[++i];
  }
  return o;
}

function readRecord(file) {
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
}

function writeRecord(file, patch) {
  const head = {
    record: "sparrow-eval",
    card: "M07-T13",
    qualifier: "build and wall times measured on the machine named; sheets, lengths, separations and layoutHashes computed",
    commands: ["bash tools/sparrow/build.sh", "node tools/sparrow/run.mjs eval"],
  };
  const out = { ...head, ...readRecord(file), ...patch };
  writeFileSync(file, `${JSON.stringify(out, null, 1)}\n`);
}

const tool = (cmd, a) => {
  try {
    return execFileSync(cmd, a, { encoding: "utf8" }).trim();
  } catch {
    return "not found";
  }
};

function machine() {
  return {
    cpu: os.cpus()[0]?.model ?? "unknown",
    cores: os.cpus().length,
    memGiB: Math.round(os.totalmem() / 2 ** 30),
    os: `${os.platform()} ${os.arch()} ${os.release()}`,
    node: process.version,
    rustc: tool("rustc", ["-V"]),
    cargo: tool("cargo", ["-V"]),
    wasmPack: tool("wasm-pack", ["--version"]),
  };
}

// ------------------------------------------------------------- wasm load

/** Load the classic-script glue and instantiate the wasm from bytes, as a bake would; measured. */
function loadWasm() {
  const glue = readFileSync(GLUE, "utf8");
  const bytes = readFileSync(WASM);
  // the glue declares `let wasm_bindgen` at script scope, as a page script would; a function
  // scope around it lets every load run the glue again and hand the binding out
  const api = vm.runInThisContext(`(function () {\n${glue}\n;return wasm_bindgen;\n})()`);
  const t0 = now();
  api.initSync({ module: bytes });
  const loadMs = now() - t0;
  return { api, bytes, glue, loadMs };
}

/** Load time in a fresh node process each time, so no compile cache of an earlier load is reused; measured. */
function freshLoadMs() {
  const code = `const fs=require("node:fs"),vm=require("node:vm");const g=fs.readFileSync(${JSON.stringify(GLUE)},"utf8"),b=fs.readFileSync(${JSON.stringify(WASM)});const t0=performance.now();const api=vm.runInThisContext("(function(){"+g+";return wasm_bindgen;})()");api.initSync({module:b});process.stdout.write(String(performance.now()-t0));`;
  return Number(execFileSync(process.execPath, ["-e", code], { encoding: "utf8" }));
}

/** What a bake would hold, and whether it keeps the D-129 rules; computed from the files. */
function wasmFacts() {
  const loads = Array.from({ length: 5 }, freshLoadMs);
  const w = loadWasm();
  const base64 = Math.ceil(w.bytes.length / 3) * 4;
  return {
    wasm: { file: "pkg/hbf_sparrow_wasm_bg.wasm", bytes: w.bytes.length, sha256: sha(w.bytes) },
    glue: { file: "pkg/hbf_sparrow_wasm.js", bytes: Buffer.byteLength(w.glue), sha256: sha(w.glue), kind: "classic script (wasm-pack --target no-modules), global wasm_bindgen" },
    loadMs: { qualifier: "measured, glue evaluated and initSync from bytes, one fresh node process per load, 5 loads; V8 compiles lazily, so part of the compile moves to the first call", values: loads.map((v) => round(v, 2)), mean: round(mean(loads), 2) },
    bake: {
      limitBytes: BAKE_LIMIT,
      base64Bytes: base64,
      withinLimit: base64 + Buffer.byteLength(w.glue) <= BAKE_LIMIT,
      networkAtLoad: "none when initSync is given the bytes; the glue's fetch runs only when init is given a URL",
      workerMentions: (w.glue.match(/Worker/g) ?? []).length,
      sharedMemory: /shared/i.test(w.glue) ? "mentioned in glue" : "none",
    },
  };
}

/**
 * Licences of the crates linked into the wasm, read from cargo metadata of
 * the wrapper for wasm32-unknown-unknown (normal dependencies only); computed.
 */
function wasmClosure() {
  const meta = JSON.parse(execFileSync("cargo", ["metadata", "--format-version", "1", "--locked", "--filter-platform", "wasm32-unknown-unknown"], { cwd: path.join(WORK, "wasm"), encoding: "utf8", maxBuffer: 64 * 2 ** 20 }));
  const nodes = new Map(meta.resolve.nodes.map((n) => [n.id, n]));
  const pkgs = new Map(meta.packages.map((p) => [p.id, p]));
  const seen = new Set();
  const stack = [meta.resolve.root];
  while (stack.length) {
    const id = stack.pop();
    if (seen.has(id)) continue;
    seen.add(id);
    for (const d of nodes.get(id).deps) if (d.dep_kinds.some((k) => k.kind === null)) stack.push(d.pkg);
  }
  const counts = {};
  const copyleft = [];
  const noField = [];
  for (const id of seen) {
    const p = pkgs.get(id);
    if (p.license === null) noField.push(`${p.name} ${p.version}`);
    else counts[p.license] = (counts[p.license] ?? 0) + 1;
    if (/MPL|GPL|EUPL|CDDL/.test(p.license ?? "")) copyleft.push({ crate: p.name, version: p.version, licence: p.license });
  }
  return {
    qualifier: "computed from cargo metadata of tools/sparrow/wasm for wasm32-unknown-unknown",
    crates: seen.size,
    licences: Object.fromEntries(Object.entries(counts).sort(([a], [b]) => (a < b ? -1 : 1))),
    copyleft: copyleft.sort((a, b) => (a.crate < b.crate ? -1 : 1)),
    noLicenceField: noField.sort(),
  };
}

// ----------------------------------------------------------- build record

function buildRecord() {
  const env = process.env;
  const status = env.SPARROW_STATUS ?? "unknown";
  const build = {
    date: env.SPARROW_DATE ?? new Date().toISOString().slice(0, 10),
    status,
    ...(env.SPARROW_FAILED_STEP ? { failedStep: env.SPARROW_FAILED_STEP, exit: Number(env.SPARROW_FAILED_EXIT) } : {}),
    machine: machine(),
    sparrow: {
      repo: "https://github.com/JeroenGar/sparrow",
      commit: env.SPARROW_COMMIT,
      version: "0.3.0 (Cargo.toml at the commit)",
      licence: "MIT",
      jaguaRs: { version: "1.0.0 (tools/sparrow/native/Cargo.lock; the commit tracks no Cargo.lock)", licence: "MPL-2.0" },
      wrapperPortedFrom: "https://github.com/JeroenGar/sparrow-studio web/wasm/src/lib.rs at a738c18d9c28e371983b164129190dad1616d273 (MIT)",
    },
    native: env.SPARROW_NATIVE_DONE === "1"
      ? {
        command: env.SPARROW_NATIVE_CMD,
        rustflags: env.SPARROW_NATIVE_RUSTFLAGS ?? "none",
        seconds: Number(env.SPARROW_NATIVE_S),
        qualifier: "measured, wall time of the cargo build",
        binary: { bytes: statSync(NATIVE).size, sha256: sha(readFileSync(NATIVE)) },
      }
      : "not run",
    wasm: env.SPARROW_WASM_DONE === "1"
      ? { command: env.SPARROW_WASM_CMD, rustflags: env.SPARROW_RUSTFLAGS ?? "none", seconds: Number(env.SPARROW_WASM_S), qualifier: "measured, wall time of wasm-pack", ...wasmFacts(), closure: wasmClosure() }
      : "not run",
  };
  writeRecord(RECORD, { build });
  if (build.wasm !== "not run") console.log(`wasm ${build.wasm.wasm.bytes} bytes, ${build.wasm.bake.base64Bytes} as base64, load ${build.wasm.loadMs.mean} ms mean`);
  console.log(`build ${status}${build.failedStep ? ` at ${build.failedStep}` : ""}; written to ${path.relative(ROOT, RECORD)}`);
}

/**
 * Two build folders of tools/sparrow/repro.sh against each other: the sha256 of the native binary,
 * the wasm and the glue in each, and the count of absolute folder names left in the bytes. The record
 * keeps the folders' depth and whether they differ, never the folder names (they hold a home path).
 */
function reproRecord(a, b) {
  const files = { native: "src/target/release/sparrow", wasm: "pkg/hbf_sparrow_wasm_bg.wasm", glue: "pkg/hbf_sparrow_wasm.js" };
  const out = { date: new Date().toISOString().slice(0, 10), qualifier: "measured, two clean builds by tools/sparrow/repro.sh", foldersDiffer: path.resolve(a) !== path.resolve(b), depths: [a, b].map((d) => path.resolve(d).split(path.sep).length - 1) };
  let equal = true;
  for (const [k, rel] of Object.entries(files)) {
    const [x, y] = [a, b].map((d) => readFileSync(path.join(d, rel)));
    const leaks = [[x, a], [y, b]].map(([bytes, d]) => bytes.toString("latin1").split(path.resolve(d)).length - 1);
    out[k] = { sha256: [sha(x), sha(y)], equal: sha(x) === sha(y), workPathsInBytes: leaks };
    equal &&= out[k].equal;
  }
  out.equal = equal;
  writeRecord(RECORD, { reproducible: out });
  console.log(`native ${out.native.equal}, wasm ${out.wasm.equal}, glue ${out.glue.equal}; written to ${path.relative(ROOT, RECORD)}`);
  if (!equal) process.exitCode = 1;
}

// ------------------------------------------------------------------ sets

async function sets(geom) {
  const profile = createProfileLookup(loadProfile());
  const slug = slugSheetsScene();
  const slugSet = (stock) => ({
    items: slug.request.items.filter((it) => it.stock === stock),
    sheet: slug.request.sheet, margin: slug.request.margin, gap: slug.request.gap,
    machine: slug.machine, kerfMode: slug.kerfMode, profile,
    source: `packages/nest/scenes/slug-sheets.ts (M07-T07), stock ${stock}, kerf mode none`,
  });
  // cutfiles.py KERF (line 18) and GAP (line 20), read from its stored lines the way dxf.test.ts reads them
  const cutfiles = readFileSync(path.join(ROOT, "packages/nest/test/inputs/ogee16/cutfiles-18-32.txt"), "utf8");
  const KERF = Number(/^KERF = ([0-9.]+)/m.exec(cutfiles)?.[1]);
  const GAP = Number(/^GAP = ([0-9.]+)/m.exec(cutfiles)?.[1]);
  const ogee = JSON.parse(readFileSync(path.join(ROOT, "packages/nest/records/ogee16-connect.json"), "utf8")).result;
  const base = loadProfile();
  // the kerf cutfiles.py ran at, entered on the machine row as dxf.test.ts does; provenance stays inferred
  const ogeeProfile = createProfileLookup({ ...base, machines: base.machines.map((m) => (m.id === "sheet600" ? { ...m, kerf: KERF } : m)) });
  const env = ogeeProfile.machine("sheet600").envelope;
  return {
    "slug-ply": slugSet(SLUG_STOCKS.ply),
    "slug-acrylic": slugSet(SLUG_STOCKS.acrylic),
    "ogee16-r16": {
      items: ogee.parts.map((p) => ({ id: p.id, qty: p.qty, stock: "ply3", rings: p.rings })),
      sheet: [env.sheet[0], env.sheet[1]], margin: GAP, gap: GAP,
      machine: "sheet600", kerfMode: "outline", profile: ogeeProfile,
      source: `packages/nest/records/ogee16-connect.json (M07-T06), compensated at cutfiles.py KERF ${KERF}, margin and gap GAP ${GAP}`,
    },
  };
}

const requestOf = (s) => ({ items: s.items, sheet: s.sheet, margin: s.margin, gap: s.gap, mode: "fill", rotations: QUARTER_TURNS, partInPart: true, seed: 0 });

// ---------------------------------------------------------------- backends

function runNative(dir, instance, seed, seconds) {
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "instance.json");
  writeFileSync(file, JSON.stringify(instance));
  return new Promise((resolve, reject) => {
    const child = spawn(NATIVE, ["-i", file, "-t", String(seconds), "-x", "-s", String(seed)], { cwd: dir, stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    child.stderr.on("data", (d) => { err += d; });
    const guard = setTimeout(() => child.kill("SIGKILL"), (seconds * 3 + 30) * 1000);
    child.on("error", (e) => { clearTimeout(guard); reject(e); });
    child.on("exit", (code, signal) => {
      clearTimeout(guard);
      if (code !== 0) return reject(new Error(`sparrow exit ${code ?? signal} in ${dir}: ${err.slice(0, 400)}`));
      resolve(JSON.parse(readFileSync(path.join(dir, "output", `final_${instance.name}.json`), "utf8")));
    });
  });
}

let wasmApi = null;
function runWasm(instance, seed, seconds) {
  wasmApi ??= loadWasm().api;
  return JSON.parse(wasmApi.solve(JSON.stringify(instance), seconds, BigInt(seed), true, 0));
}

// ------------------------------------------------------------ verification

function segDist2(p, q, a, b) {
  const d = (u, v, w) => {
    const [vx, vy] = [w[0] - v[0], w[1] - v[1]];
    const L = vx * vx + vy * vy;
    let t = L === 0 ? 0 : ((u[0] - v[0]) * vx + (u[1] - v[1]) * vy) / L;
    t = Math.max(0, Math.min(1, t));
    const [x, y] = [v[0] + t * vx - u[0], v[1] + t * vy - u[1]];
    return x * x + y * y;
  };
  const o = (u, v, w) => Math.sign((v[0] - u[0]) * (w[1] - u[1]) - (v[1] - u[1]) * (w[0] - u[0]));
  if (o(p, q, a) * o(p, q, b) < 0 && o(a, b, p) * o(a, b, q) < 0) return 0;
  return Math.min(d(p, a, b), d(q, a, b), d(a, p, q), d(b, p, q));
}

function inside(ring, [x, y]) {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

/** Smallest distance between two outer rings, 0 when they cross or one holds the other, mm. */
function ringDistance(a, b) {
  if (inside(a, b[0]) || inside(b, a[0])) return 0;
  let best = Infinity;
  for (let i = 0; i < a.length; i++) {
    const p = a[i], q = a[(i + 1) % a.length];
    for (let k = 0; k < b.length; k++) {
      best = Math.min(best, segDist2(p, q, b[k], b[(k + 1) % b.length]));
      if (best === 0) return 0;
    }
  }
  return Math.sqrt(best);
}

/** Bounds and separation of one sheet's outers on the sheet; computed. */
function checkSheet(outers, frame) {
  const [W, H] = frame.sheet;
  let edge = Infinity;
  for (const r of outers) for (const [x, y] of r) edge = Math.min(edge, x, y, W - x, H - y);
  let sep = Infinity;
  const boxes = outers.map((r) => extentOf([r]));
  for (let i = 0; i < outers.length; i++) {
    for (let k = i + 1; k < outers.length; k++) {
      const a = boxes[i], b = boxes[k];
      const gx = Math.max(a.x0 - (b.x0 + b.w), b.x0 - (a.x0 + a.w), 0), gy = Math.max(a.y0 - (b.y0 + b.h), b.y0 - (a.y0 + a.h), 0);
      if (Math.hypot(gx, gy) >= sep) continue;
      sep = Math.min(sep, ringDistance(outers[i], outers[k]));
    }
  }
  return { edge, sep };
}

// ------------------------------------------------------------- sheet loop

/**
 * Sheets over strips (research idea 8): pack every root into one strip as
 * high as the sheet, keep the whole parts left of the cut, and pack what is
 * left into the next strip, until nothing is left.
 */
async function sparrowSheets(name, s, outcome, nesting, backend, seed, seconds, runDir) {
  const frame = stripFrame(s);
  const ringsOf = ringsById(outcome.items);
  let remaining = nesting.roots.slice();
  const placements = [];
  const strips = [];
  let edge = Infinity, sep = Infinity;
  const t0 = now();
  for (let sheet = 0; remaining.length > 0; sheet++) {
    const { instance, classes } = toInstance(`${name}-${sheet + 1}`, remaining, ringsOf, frame, nesting.inners);
    const ts = now();
    const out = backend === "wasm" ? runWasm(instance, seed, seconds) : await runNative(path.join(runDir, `strip${sheet + 1}`), instance, seed, seconds);
    const wallMs = now() - ts;
    const placed = readSolution(out, classes, ringsOf);
    const kept = placed.filter((p) => p.at[0] + p.w <= frame.cut + 1e-9);
    if (kept.length === 0) throw new Error(`${name}: strip ${sheet + 1} keeps no part left of the cut at ${frame.cut} mm`);
    const outers = [];
    for (const p of kept) {
      const at = [p.at[0] + frame.shift, p.at[1] + frame.shift];
      placements.push({ id: p.box.id, copy: p.box.copy, sheet, at, rot: p.rot });
      for (const inner of nesting.inners.get(keyOf(p.box.id, p.box.copy)) ?? []) placements.push(composePlacement(p.box, sheet, at, p.rot, inner));
      outers.push(p.outer.map(([x, y]) => [x + frame.shift, y + frame.shift]));
    }
    const c = checkSheet(outers, s);
    edge = Math.min(edge, c.edge);
    sep = Math.min(sep, c.sep);
    const keys = new Set(kept.map((p) => keyOf(p.box.id, p.box.copy)));
    strips.push({
      roots: remaining.length, kept: kept.length, stripLength: round(out.solution.strip_width), usedLength: round(Math.max(...outers.flatMap((r) => r.map(([x]) => x))) + s.margin),
      wallMs: Math.round(wallMs), firstPlacementsSha256: sha(JSON.stringify(out.solution.layout.placed_items)),
    });
    remaining = remaining.filter((b) => !keys.has(keyOf(b.id, b.copy)));
  }
  const pieces = placements.length;
  return {
    backend, seed, sheets: strips.length, pieces,
    inside: placements.filter((p) => p.inside !== undefined).length,
    oneStripLength: strips[0].stripLength,
    usedLength: round(strips.reduce((n, x) => n + x.usedLength, 0)),
    wallMs: Math.round(now() - t0),
    minEdge: round(edge, 4), minSeparation: round(sep, 4),
    holds: edge >= s.margin - SEP_TOL && sep >= s.gap - SEP_TOL,
    layoutHash: layoutHash(placements),
    strips,
  };
}

// ------------------------------------------------------------------- eval

async function evaluate(o) {
  if (!existsSync(NATIVE)) throw new Error(`no native sparrow at ${NATIVE}; run bash tools/sparrow/build.sh`);
  const seconds = Number(o.time ?? 60);
  const seeds = (o.seeds ?? "1,2").split(",").map(Number);
  const geom = await loadGeom();
  const all = await sets(geom);
  const names = (o.sets ?? Object.keys(all).join(",")).split(",");
  const wasmSets = new Set((o["wasm-sets"] ?? "slug-acrylic").split(",").filter(Boolean));
  const out = readRecord(o.out ?? RECORD).sets ?? {};
  for (const name of names) {
    const s = all[name];
    if (s === undefined) throw new Error(`no set ${name}; sets are ${Object.keys(all).join(", ")}`);
    const req = requestOf(s);
    const fillMs = [];
    let outcome = null;
    for (let i = 0; i < 3; i++) {
      const t0 = now();
      outcome = packSheets(geom, req, { profile: s.profile, machine: s.machine, kerfMode: s.kerfMode });
      fillMs.push(now() - t0);
    }
    if (outcome.result === null) throw new Error(`${name}: nest refused the set`);
    const r = outcome.result;
    const frame = { sheet: s.sheet, margin: s.margin, gap: s.gap, rotations: QUARTER_TURNS };
    const boxes = outcome.items.flatMap((it) => {
      const e = extentOf(it.rings);
      return Array.from({ length: it.qty }, (_, copy) => ({ id: it.id, copy, w: e.w, h: e.h }));
    });
    const nesting = nestHoles(geom, boxes, ringsById(outcome.items), frame);
    const strip = stripFrame(s);
    const fillUsed = Array.from({ length: r.sheets }, (_, k) => {
      const xs = r.placements.filter((p) => p.sheet === k && p.inside === undefined).map((p) => {
        const e = extentOf(outcome.items.find((it) => it.id === p.id).rings);
        return p.at[0] + (p.rot === 90 || p.rot === 270 ? e.h : e.w);
      });
      return Math.max(...xs) + s.margin;
    });
    const runs = [];
    for (const seed of seeds) {
      for (let run = 1; run <= 2; run++) {
        const dir = path.join(WORK, "runs", `${name}-seed${seed}-run${run}`);
        rmSync(dir, { recursive: true, force: true });
        const res = await sparrowSheets(name, s, outcome, nesting, "native", seed, seconds, dir);
        console.log(`${name} seed ${seed} run ${run}: ${res.sheets} sheets, ${res.wallMs} ms, ${res.layoutHash.slice(0, 12)}`);
        runs.push({ run, ...res });
      }
    }
    const wasmRuns = [];
    if (wasmSets.has(name)) {
      const res = await sparrowSheets(name, s, outcome, nesting, "wasm", seeds[0], seconds, null);
      console.log(`${name} wasm seed ${seeds[0]}: ${res.sheets} sheets, ${res.wallMs} ms, ${res.layoutHash.slice(0, 12)}`);
      wasmRuns.push(res);
    }
    const perSeed = Object.fromEntries(seeds.map((seed) => {
      const h = runs.filter((x) => x.seed === seed).map((x) => x.layoutHash);
      return [seed, { layoutHashes: h, equal: h.every((v) => v === h[0]) }];
    }));
    out[name] = {
      input: {
        source: s.source,
        items: s.items.length, pieces: s.items.reduce((n, it) => n + it.qty, 0),
        sheet: s.sheet, margin: s.margin, gap: s.gap, kerfMode: s.kerfMode, rotations: QUARTER_TURNS, partInPart: true,
        roots: nesting.roots.length, insideHoles: boxes.length - nesting.roots.length,
        strip: { height: strip.stripHeight, cut: strip.cut, shift: strip.shift, minItemSeparation: s.gap },
      },
      fill: {
        sheets: r.sheets, packer: r.packer, order: r.order ?? null, inside: r.placements.filter((p) => p.inside !== undefined).length,
        usedLength: round(fillUsed.reduce((a, b) => a + b, 0)),
        layoutHash: r.layoutHash,
        wallMs: { qualifier: "measured, packSheets with checks, 3 runs", values: fillMs.map((v) => Math.round(v)), mean: Math.round(mean(fillMs)) },
      },
      sparrow: {
        settings: { timeLimitS: seconds, earlyTermination: true, workers: "3, the CLI default", seeds, runsPerSeed: 2 },
        perSeed, runs, wasm: wasmRuns.length ? wasmRuns : "not run",
      },
    };
    writeRecord(o.out ?? RECORD, { evalDate: new Date().toISOString().slice(0, 10), evalMachine: machine(), sets: out });
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === "build-record") buildRecord();
  else if (cmd === "eval") await evaluate(args(rest));
  else if (cmd === "repro-record" && rest.length === 2) reproRecord(rest[0], rest[1]);
  else {
    console.error("usage: node tools/sparrow/run.mjs build-record | repro-record <a> <b> | eval [--time s] [--seeds a,b] [--sets a,b] [--wasm-sets a,b] [--out file]");
    process.exit(2);
  }
}
