#!/usr/bin/env node
// Virtual print, slicer half: slice plate 1 of a 3MF headless with an
// Orca-family CLI (Flash Studio by default) and write its G-code, with the command,
// slicer version, exit code and wall time recorded beside it.
//
//   node tools/slice/slice.mjs <file.3mf> <outdir> [options]
//   node tools/slice/slice.mjs --design reference/keys/flex-pair --preset two <outdir> [options]
//
// options:
//   --filament-map "<name in 3mf>=<bundled preset name>"   repeatable
//   --time-limit <s>        kill the slicer after this many seconds (default 600)
//   --datadir-root <dir>    parent of the fresh --datadir (default: the evidence folder)
//   --slicer <id>           flash-studio (default), orcaslicer, bambu-studio or
//                           snapmaker-orca; tools/slice/orca-family.mjs holds the table
//   --app <path>            the slicer executable (default: the table's macOS path)
//   --allow-failing         slice a --design build whose checks fail (recorded)
//
// --design writes the 3MF bytes in process through the same path the
// reference tests use (core build, packages/3mf writer) at
// SOURCE_DATE_EPOCH 315532800 and runs every check export.run runs on it
// first: a build that fails a check is not sliced unless --allow-failing is
// passed, and the run record names the failing checks either way. It never
// opens the fabrication export gate. The G-code is a virtual print, read by
// tools/py/gcode/analyze.py, never sent to a printer; every output folder
// must resolve inside the fab-knowledge evidence folder or the temp folder.
// Every 3MF read here passes the packages/3mf zip limits (D-166).
//
// Why the 3MF is completed before slicing: the writer embeds only the keys
// it sets (136 of about 670 for keys flex-pair). The GUI fills the rest from
// the presets the project names; the CLI with a fresh --datadir does not,
// and Orca-Flashforge 2.3.2 exits on SIGSEGV (139) right after loading a
// project config without nozzle_diameter, printable_height and gcode_flavor
// (measured 2026-10-07, found by key bisection against an owner save). The
// harness does what the GUI does: it flattens the bundled system presets the
// project names (machine, process, one filament per slot) and lays the
// embedded keys over them, so every embedded value wins. --load-settings is
// not used: the CLI ranks it above the 3MF, so it would override the design.
//
// The owner's own slicer profile folder is never read or written:
// every run gets a new, empty --datadir under --datadir-root.

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  CARD_EPOCH, DEFAULT_DATADIR_ROOT, DEFAULT_SLICER, EVIDENCE_ROOT, PROJECT, SLICERS,
  appPresent, appVersionOf, cliVersionOf, completeProject, completed3mf, freshDatadir, inside, presetIndex, realOf, resourcesOf, sliceArgs, slicerEntry,
} from "./orca-family.mjs";

export {
  CARD_EPOCH, DEFAULT_DATADIR_ROOT, DEFAULT_SLICER, EVIDENCE, EVIDENCE_ROOT, SLICERS,
  appPresent, completeProject, completed3mf, flatten, freshDatadir, ownerProfileDirs, presetIndex, probe, sliceArgs,
} from "./orca-family.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, "..", "..");
// orca-family.mjs registered the workspace resolve hook on import
const { readEntries } = await import("@hackbuild/3mf");
export const DEFAULT_APP = SLICERS[DEFAULT_SLICER].app;

const sha256 = (b) => createHash("sha256").update(b).digest("hex");

/** Roots a virtual print may write under: the evidence folder and the temp folder, as real paths. */
export function outRoots() {
  return [EVIDENCE_ROOT, os.tmpdir()].filter((d) => existsSync(d)).map((d) => realpathSync(d));
}

export function assertOutDir(dir) {
  const real = realOf(dir);
  if (!outRoots().some((r) => inside(real, r))) {
    throw new Error(`refusing ${dir}: a virtual print writes only under ${EVIDENCE_ROOT} or the temp folder ${os.tmpdir()}, never beside gated exports`);
  }
}

/**
 * What the analyzer compares the G-code against, read from the build the
 * bytes came from: the net of each conductor body by its 3MF part name, and
 * per key the declared trace band, colTop and gap (as the reference test
 * test/section.ts readKey reads them). All mm, computed.
 */
function declaredModel(built) {
  const features = built.draft.features;
  const slotOf = new Map(built.meshed.slots.map((s) => [s.name, s.slot]));
  const shared = (slot) => built.meshed.slots.filter((x) => x.slot === slot).length > 1;
  const label = (slot) => built.design.chase.materials.find((x) => x.slot === slot)?.label ?? `slot${slot}`;
  const partName = (name) => {
    const slot = slotOf.get(name);
    return slot === undefined ? name : shared(slot) ? `${label(slot)} ${name}` : label(slot);
  };
  const nets = {};
  for (const f of features) if (f.kind === "conductor") nets[partName(f.id)] = f.net;
  const byId = (kind, id) => features.find((f) => f.kind === kind && f.id === id);
  const keys = (built.values["keys"] ?? []).map((k, i) => {
    const n = i + 1;
    const col = byId("conductor", `conductor.key${n}col`);
    const trace = byId("conductor", `conductor.key${n}`);
    const contact = byId("contact", `contact.key${n}`);
    const skin = col !== undefined && "face" in col.region ? col.region.face.origin[2] : null;
    return {
      key: n, x: k.x,
      keyColumn: partName(`conductor.key${n}col`), gndColumn: partName(`conductor.gnd${n}col`), cap: partName(`cap${n}`), trace: partName(`conductor.key${n}`),
      traceBand: skin === null || trace === undefined ? null : [skin, skin + trace.t],
      colTop: skin === null ? null : skin + col.t,
      gap: contact?.gap ?? null,
      coneH: contact?.coneH ?? null,
    };
  });
  return { qualifier: "computed", nets, keys };
}

/**
 * The record of the checks a --design build ran; throws "not run" when one
 * fails and allowFailing is not set. worst is core's verdict order.
 */
export function checkGate(results, worst, { allowFailing = false, what = "the build" } = {}) {
  const failed = [...new Set(results.filter((r) => r.verdict === "fail").map((r) => r.id))].sort();
  if (failed.length > 0 && !allowFailing) throw new Error(`not run: ${what} fails ${failed.join(", ")}; fix the build or pass --allow-failing`);
  return { worst: worst(results), ran: results.length, failed, allowFailing };
}

/**
 * Writes the keys flex-pair (or any design) 3MF in process at the card
 * epoch, without the export gate, after the checks export.run runs: the
 * Part IR checks, then CHK-3MF-06 and CHK-3MF-07 on the package. A failing
 * build throws unless allowFailing; the record names the checks either way.
 */
export async function design3mf(designDir, preset, { allowFailing = false } = {}) {
  const saved = process.env["SOURCE_DATE_EPOCH"];
  process.env["SOURCE_DATE_EPOCH"] = String(CARD_EPOCH);
  try {
    const m = await import(pathToFileURL(path.join(ROOT, "core/dist/commands/build.js")).href);
    const { packageCheckIds, runAllChecks } = await import(pathToFileURL(path.join(ROOT, "core/dist/commands/check-run.js")).href);
    const { worst } = await import(pathToFileURL(path.join(ROOT, "core/dist/result.js")).href);
    const design = await m.loadDesign(designDir, ROOT);
    const built = await m.buildPart(design, m.resolveParams(design.chase, undefined, preset));
    const partChecks = await runAllChecks(built, [], undefined);
    const pkg = await m.export3mf(built);
    const pkgChecks = await runAllChecks(built, [{ exporter: "3mf", name: pkg.name, bytes: pkg.bytes, part: built.part }], packageCheckIds(built));
    const checks = checkGate([...partChecks.results, ...pkgChecks.results], worst, { allowFailing, what: `${designDir} preset ${preset}` });
    return { bytes: pkg.bytes, artifactHash: pkg.artifactHash, warnings: pkg.warnings.map((w) => w.text ?? String(w)), model: declaredModel(built), checks };
  } finally {
    if (saved === undefined) delete process.env["SOURCE_DATE_EPOCH"];
    else process.env["SOURCE_DATE_EPOCH"] = saved;
  }
}

/** Runs the CLI with a time cap; resolves with exit code, signal and wall ms (measured). */
// The slicer dies with this process: a signal or an exit here kills it, so
// it never runs on under PPID 1 past the time limit.
function runCapped(cmd, args, logFile, limitS) {
  return new Promise((resolve) => {
    const t0 = process.hrtime.bigint();
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    const chunks = [];
    child.stdout.on("data", (c) => chunks.push(c));
    child.stderr.on("data", (c) => chunks.push(c));
    let killed = false;
    const timer = setTimeout(() => {
      killed = true;
      child.kill("SIGKILL");
    }, limitS * 1000);
    const onExit = () => child.kill("SIGKILL");
    const onSignal = (sig) => {
      child.kill("SIGKILL");
      release();
      process.kill(process.pid, sig);
    };
    const release = () => {
      process.off("exit", onExit);
      for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) process.off(sig, onSignal);
    };
    process.on("exit", onExit);
    for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(sig, onSignal);
    child.on("close", (code, signal) => {
      release();
      clearTimeout(timer);
      const log = Buffer.concat(chunks);
      writeFileSync(logFile, log);
      resolve({ code, signal, killedAtLimit: killed, wallMs: Number(process.hrtime.bigint() - t0) / 1e6, log: log.toString("utf8") });
    });
    child.on("error", (e) => {
      release();
      clearTimeout(timer);
      resolve({ code: null, signal: null, killedAtLimit: false, wallMs: 0, log: String(e), spawnError: String(e) });
    });
  });
}

/**
 * Slices plate 1. Returns the run record also written to <outDir>/slice-run.json.
 * input: { file } or { design, preset }.
 */
export async function slice({ input, outDir: outArg, slicer = DEFAULT_SLICER, app, datadirRoot = DEFAULT_DATADIR_ROOT, filamentMap = {}, timeLimitS = 600, allowFailing = false }) {
  // absolute from here on, so no path the slicer receives can read as an option
  const outDir = path.resolve(outArg);
  assertOutDir(outDir);
  if (!(Number.isFinite(timeLimitS) && timeLimitS > 0)) throw new Error(`--time-limit takes a positive number of seconds, got ${timeLimitS}`);
  const entry = slicerEntry(slicer);
  app ??= entry.app;
  if (!appPresent(app)) throw new Error(`not run: no ${entry.label} executable at ${app}`);
  mkdirSync(outDir, { recursive: true });
  const resources = resourcesOf(slicer, app);
  let bytes;
  let source;
  if (input.file !== undefined) {
    bytes = readFileSync(input.file);
    source = { file: path.resolve(input.file) };
  } else {
    const d = await design3mf(input.design, input.preset, { allowFailing });
    bytes = d.bytes;
    source = { design: input.design, preset: input.preset, sourceDateEpoch: CARD_EPOCH, artifactHash: d.artifactHash, warnings: d.warnings, model: d.model, checks: d.checks, writer: "core export3mf, packages/3mf write3mf (no export gate, not a fabrication export)" };
  }
  const stem = input.file !== undefined ? path.basename(input.file, ".3mf") : `${path.basename(input.design)}-${input.preset}`;
  const original = path.join(outDir, `${stem}.3mf`);
  if (input.file === undefined || path.resolve(input.file) !== original) writeFileSync(original, bytes);
  if (source.model !== undefined) writeFileSync(path.join(outDir, `${stem}.model.json`), `${JSON.stringify(source.model, null, 2)}\n`);

  const project = (await readEntries(bytes))[PROJECT];
  if (typeof project !== "string") throw new Error(`${PROJECT} missing from the 3MF; the CLI cannot name presets for it`);
  const embedded = JSON.parse(project);
  const index = presetIndex(resources, embedded.printer_settings_id);
  const done = completeProject(embedded, index, filamentMap);
  const completedBytes = await completed3mf(bytes, done.config);
  const completedPath = path.join(outDir, `${stem}.completed.3mf`);
  writeFileSync(completedPath, completedBytes);

  const datadir = freshDatadir(datadirRoot);
  const gcodeDir = path.join(outDir, "gcode");
  mkdirSync(gcodeDir, { recursive: true });
  const args = sliceArgs(slicer, { datadir, outputDir: gcodeDir, input: completedPath, timeLimitS });
  const run = await runCapped(app, args, path.join(outDir, "slicer.log"), timeLimitS);
  const version = cliVersionOf(slicer, run.log);
  const appVersion = appVersionOf(slicer, app);
  const gcodeFile = path.join(gcodeDir, "plate_1.gcode");
  const gcode = existsSync(gcodeFile) ? readFileSync(gcodeFile) : undefined;
  const record = {
    tool: "tools/slice/slice.mjs",
    purpose: "virtual print: G-code for tools/py/gcode/analyze.py, never sent to a printer",
    source,
    input3mf: { path: original, bytes: bytes.length, sha256: sha256(bytes) },
    completed3mf: { path: completedPath, bytes: completedBytes.length, sha256: sha256(completedBytes), embeddedKeys: done.embeddedKeys, filledFromPresets: done.filled.length, presetVendor: index.vendor, presets: done.presets, substitutions: done.substitutions },
    slicer: { id: slicer, app, appVersion, cliVersion: version },
    command: [app, ...args],
    datadir,
    exitCode: run.code,
    signal: run.signal,
    killedAtLimit: run.killedAtLimit,
    timeLimitS,
    wallMs: Math.round(run.wallMs),
    wallQualifier: "measured",
    gcode: gcode === undefined ? null : { path: gcodeFile, bytes: gcode.length, sha256: sha256(gcode) },
    status: gcode !== undefined && run.code === 0 ? "sliced" : "failed",
  };
  writeFileSync(path.join(outDir, "slice-run.json"), `${JSON.stringify(record, null, 2)}\n`);
  return record;
}

function parseArgs(argv) {
  const o = { filamentMap: {}, positional: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`${a} needs a value`);
      return v;
    };
    if (a === "--design") o.design = next();
    else if (a === "--preset") o.preset = next();
    else if (a === "--time-limit") o.timeLimitS = Number(next());
    else if (a === "--datadir-root") o.datadirRoot = next();
    else if (a === "--app") o.app = next();
    else if (a === "--slicer") o.slicer = next();
    else if (a === "--allow-failing") o.allowFailing = true;
    else if (a === "--filament-map") {
      const [k, v] = next().split("=");
      if (!k || !v) throw new Error("--filament-map takes \"<name in 3mf>=<bundled name>\"");
      o.filamentMap[k] = v;
    } else o.positional.push(a);
  }
  return o;
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  const input = o.design !== undefined ? { design: o.design, preset: o.preset } : { file: o.positional.shift() };
  const outDir = o.positional.shift();
  if ((input.file === undefined && input.design === undefined) || outDir === undefined) {
    process.stderr.write("usage: node tools/slice/slice.mjs <file.3mf> <outdir> | --design <dir> --preset <name> <outdir>\n");
    process.exit(2);
  }
  const slicer = o.slicer ?? DEFAULT_SLICER;
  const entry = slicerEntry(slicer);
  if (!appPresent(o.app ?? entry.app)) {
    process.stdout.write(`not run: no ${entry.label} executable at ${o.app ?? entry.app}\n`);
    process.exit(3);
  }
  const r = await slice({ input, outDir, slicer, app: o.app, datadirRoot: o.datadirRoot, filamentMap: o.filamentMap, timeLimitS: o.timeLimitS, allowFailing: o.allowFailing });
  process.stdout.write(`${r.status}: exit ${r.exitCode}${r.signal ? ` signal ${r.signal}` : ""}, ${r.wallMs} ms wall (measured), ${entry.label} CLI ${r.slicer.cliVersion}\n`);
  if (r.gcode) process.stdout.write(`gcode ${r.gcode.path}, ${r.gcode.bytes} bytes, sha256 ${r.gcode.sha256}\n`);
  process.exit(r.status === "sliced" ? 0 : 1);
}

if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    process.stderr.write(`slice: ${e.message}\n`);
    process.exit(1);
  });
}
