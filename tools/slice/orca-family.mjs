// The Orca-family slicer driver: one driver for every slicer that shares
// the OrcaSlicer CLI and the Bambu 3MF dialect, with the binary path, the
// resources folder, the version line and any extra flags as parameters
// (fab-knowledge/plan-v5/slicers.md, "Adapter design").
//
// Measured on this machine: Flash Studio 1.7.14 (CLI 2.3.2) only. The
// orcaslicer, bambu-studio and snapmaker-orca rows are vendor-doc and
// inferred: their default paths, version lines and owner profile folder
// names follow the Orca lineage and are unverified until one is installed.
// No slice of those ids is tested here.
//
// The preset completion (presetIndex, flatten, completeProject,
// completed3mf), the fresh datadir and the argument builder live here;
// tools/slice/slice.mjs drives a run and re-exports them.

import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, statSync } from "node:fs";
import { register } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import JSZip from "jszip";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
register(pathToFileURL(path.join(ROOT, "core/dist/resolve-hook.js")).href, import.meta.url);
const { readEntries } = await import("@hackbuild/3mf");
/** The epoch the print card pins, s: 1980-01-01, the zip floor (core DEFAULT_EPOCH). */
export const { DEFAULT_EPOCH: CARD_EPOCH } = await import(pathToFileURL(path.join(ROOT, "core/dist/epoch.js")).href);
/** The evidence folder beside the repo; every virtual print output lands under it or under the temp folder. */
export const EVIDENCE_ROOT = path.resolve(ROOT, "..", "fab-knowledge", "evidence");
export const EVIDENCE = path.join(EVIDENCE_ROOT, "virtual-print");
export const DEFAULT_DATADIR_ROOT = path.join(EVIDENCE, "datadir");
export const PROJECT = "Metadata/project_settings.config";
/** Preset bookkeeping keys that name a preset, never a print setting. */
const PRESET_META = new Set(["name", "inherits", "type", "from", "instantiation", "setting_id", "filament_id", "compatible_printers", "compatible_printers_condition", "compatible_prints", "compatible_prints_condition", "description", "renamed_from", "version", "is_custom_defined"]);

/**
 * The Orca-family slicers by id. app is the default macOS executable;
 * resources and plist are relative to the executable's folder; versionRe
 * reads the CLI version from the --debug 3 log; extraArgs(o) gives the flags
 * this slicer takes beyond the common set; profileDirs are the folder names
 * under ~/Library/Application Support where the owner's profile lives.
 */
export const SLICERS = Object.freeze({
  "flash-studio": Object.freeze({
    label: "Flash Studio",
    app: "/Applications/Flash Studio.app/Contents/MacOS/Flash Studio",
    resources: "../Resources",
    plist: "../Info.plist",
    // measured 2026-10-07 on CLI 2.3.2
    versionRe: /Current Orca-Flashforge Version (\S+)/,
    extraArgs: () => [],
    profileDirs: ["Flash Studio", "FlashStudio", "Orca-Flashforge", "OrcaSlicer", "Orca-Flashforge-Studio"],
  }),
  orcaslicer: Object.freeze({
    label: "OrcaSlicer",
    app: "/Applications/OrcaSlicer.app/Contents/MacOS/OrcaSlicer",
    resources: "../Resources",
    plist: "../Info.plist",
    // inferred from the Flash Studio line: "Current <app name> Version <v>"
    versionRe: /Current OrcaSlicer Version (\S+)/,
    extraArgs: () => [],
    profileDirs: ["OrcaSlicer"],
  }),
  "bambu-studio": Object.freeze({
    label: "Bambu Studio",
    app: "/Applications/BambuStudio.app/Contents/MacOS/BambuStudio",
    resources: "../Resources",
    plist: "../Info.plist",
    versionRe: /Current BambuStudio Version (\S+)/,
    // vendor-doc, unverified here (slicers.md, read 2026-10-18; Bambu Studio
    // wiki Command-Line-Usage): --mstpp caps slicing seconds per plate, set to
    // the harness time limit so the slicer stops itself before it is killed.
    // --datadir needs Bambu Studio 2.8.2 or later.
    extraArgs: ({ timeLimitS }) => ["--mstpp", String(Math.ceil(timeLimitS))],
    profileDirs: ["BambuStudio"],
  }),
  "snapmaker-orca": Object.freeze({
    label: "Snapmaker Orca",
    app: "/Applications/Snapmaker Orca.app/Contents/MacOS/Snapmaker Orca",
    resources: "../Resources",
    plist: "../Info.plist",
    versionRe: /Current Snapmaker[_ ]Orca Version (\S+)/,
    extraArgs: () => [],
    profileDirs: ["Snapmaker_Orca", "Snapmaker Orca"],
  }),
});

export const DEFAULT_SLICER = "flash-studio";

export function slicerEntry(id) {
  const e = Object.hasOwn(SLICERS, id) ? SLICERS[id] : undefined;
  if (e === undefined) throw new Error(`unknown slicer "${id}"; one of ${Object.keys(SLICERS).join(", ")}`);
  return e;
}

export function appPresent(app = SLICERS[DEFAULT_SLICER].app) {
  return existsSync(app) && statSync(app).isFile();
}

/** The resources folder beside an executable of this slicer. */
export function resourcesOf(id, app = slicerEntry(id).app) {
  return path.resolve(path.dirname(app), slicerEntry(id).resources);
}

/** CFBundleShortVersionString from the app's Info.plist, or "unknown". Never throws. */
export function appVersionOf(id, app = slicerEntry(id).app) {
  try {
    const plist = path.resolve(path.dirname(app), slicerEntry(id).plist);
    if (!existsSync(plist)) return "unknown";
    return /<key>CFBundleShortVersionString<\/key>\s*<string>([^<]+)<\/string>/.exec(readFileSync(plist, "utf8"))?.[1] ?? "unknown";
  } catch {
    return "unknown";
  }
}

/** The CLI version a slice log names, or "unknown" when the line is absent. */
export function cliVersionOf(id, log) {
  return slicerEntry(id).versionRe.exec(log)?.[1] ?? "unknown";
}

/**
 * Whether this slicer is installed, without slicing. cliVersion is
 * "unknown" here: only a slice log names it. A missing app gives
 * available false; it never throws for one.
 */
export function probe(id, app) {
  const entry = slicerEntry(id);
  const p = app ?? entry.app;
  let available = false;
  try {
    available = appPresent(p);
  } catch {
    available = false;
  }
  return { id, available, path: p, appVersion: available ? appVersionOf(id, p) : "unknown", cliVersion: "unknown" };
}

/**
 * The CLI arguments for slicing plate 1: the common Orca set, the slicer's
 * extra flags, then the 3MF. Every path is absolute so none reads as an option.
 */
export function sliceArgs(id, { datadir, outputDir, input, timeLimitS }) {
  return ["--datadir", datadir, "--slice", "1", "--outputdir", outputDir, "--debug", "3", ...slicerEntry(id).extraArgs({ timeLimitS }), input];
}

/** Folders the owner's slicers keep their profile in; a datadir here is refused. */
export function ownerProfileDirs() {
  const lib = path.join(os.homedir(), "Library", "Application Support");
  const names = [...new Set(Object.values(SLICERS).flatMap((e) => e.profileDirs))];
  return names.map((n) => path.join(lib, n));
}

export function inside(child, parent) {
  const rel = path.relative(parent, child);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

/** A new empty datadir under root; never the owner's profile folder. */
export function freshDatadir(root = DEFAULT_DATADIR_ROOT) {
  const r = path.resolve(root);
  for (const o of ownerProfileDirs()) if (inside(r, o) || inside(o, r)) throw new Error(`refusing datadir root ${r}: it overlaps the owner's slicer profile ${o}`);
  mkdirSync(r, { recursive: true });
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..*$/, "");
  for (let i = 0; ; i++) {
    const d = path.join(r, `run-${stamp}-${process.pid}-${i}`);
    if (!existsSync(d)) {
      mkdirSync(d);
      return d;
    }
  }
}

/** The real path of dir, through its nearest existing parent, so a link or a case variant resolves as the volume does. */
export function realOf(dir) {
  const abs = path.resolve(dir);
  let head = abs;
  const tail = [];
  while (!existsSync(head)) {
    tail.unshift(path.basename(head));
    const up = path.dirname(head);
    if (up === head) break;
    head = up;
  }
  return path.join(realpathSync(head), ...tail);
}

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return undefined;
  }
}

function walkJson(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkJson(p, out);
    else if (e.name.endsWith(".json")) out.push(p);
  }
  return out;
}

/**
 * Index of bundled presets by kind and name. The vendor folder that holds
 * the machine wins over OrcaFilamentLibrary, as the slicer resolves them.
 */
export function presetIndex(resources, machineName) {
  const profiles = path.join(resources, "profiles");
  const vendors = readdirSync(profiles, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
  const vendor = vendors.find((v) => walkJson(path.join(profiles, v, "machine")).some((f) => readJson(f)?.name === machineName));
  if (vendor === undefined) throw new Error(`no bundled machine preset named "${machineName}" under ${profiles}`);
  const idx = new Map();
  for (const dir of ["OrcaFilamentLibrary", vendor]) {
    for (const kind of ["machine", "process", "filament"]) {
      for (const f of walkJson(path.join(profiles, dir, kind))) {
        const d = readJson(f);
        if (d && typeof d.name === "string") idx.set(`${dir}\u0000${kind}\u0000${d.name}`, { data: d, file: path.relative(resources, f) });
      }
    }
  }
  return { vendor, idx, folders: [vendor, "OrcaFilamentLibrary"] };
}

/**
 * A preset with its inherits chain applied, child over parent; files lists
 * the chain from leaf up. A parent resolves in its child's folder first, so
 * an OrcaFilamentLibrary preset inherits from its own base files.
 */
export function flatten(index, kind, name) {
  const files = [];
  const find = (n, prefer) => {
    for (const dir of prefer === undefined ? index.folders : [prefer, ...index.folders.filter((f) => f !== prefer)]) {
      const hit = index.idx.get(`${dir}\u0000${kind}\u0000${n}`);
      if (hit !== undefined) return { ...hit, dir };
    }
    return undefined;
  };
  const walk = (n, depth, prefer) => {
    const hit = find(n, prefer);
    if (hit === undefined) return undefined;
    if (depth > 16) throw new Error(`inherits loop at ${kind} "${n}"`);
    files.push(hit.file);
    const parent = typeof hit.data.inherits === "string" && hit.data.inherits !== "" ? walk(hit.data.inherits, depth + 1, hit.dir) : {};
    if (parent === undefined) throw new Error(`${kind} "${n}" inherits "${hit.data.inherits}", which no bundled preset holds`);
    return { ...parent, ...hit.data };
  };
  const values = walk(name, 0, undefined);
  return values === undefined ? undefined : { values, files };
}

/**
 * The project config the GUI would slice: flattened presets, then every
 * embedded key over them. Filament keys become one entry per slot.
 */
export function completeProject(embedded, index, filamentMap = {}) {
  const printer = flatten(index, "machine", embedded.printer_settings_id);
  const proc = flatten(index, "process", embedded.print_settings_id);
  if (printer === undefined) throw new Error(`machine preset "${embedded.printer_settings_id}" is not bundled`);
  if (proc === undefined) throw new Error(`process preset "${embedded.print_settings_id}" is not bundled`);
  const names = embedded.filament_settings_id ?? [];
  const substitutions = [];
  const filaments = names.map((n, i) => {
    const direct = flatten(index, "filament", n);
    if (direct !== undefined) return direct;
    const mapped = filamentMap[n];
    if (mapped === undefined) throw new Error(`slot ${i + 1} filament preset "${n}" is not bundled in this slicer; pass --filament-map "${n}=<bundled name>"`);
    const sub = flatten(index, "filament", mapped);
    if (sub === undefined) throw new Error(`--filament-map target "${mapped}" is not bundled`);
    substitutions.push({ slot: i + 1, named: n, used: mapped });
    return sub;
  });
  const base = {};
  for (const src of [printer.values, proc.values]) for (const [k, v] of Object.entries(src)) if (!PRESET_META.has(k)) base[k] = v;
  const filamentKeys = new Set(filaments.flatMap((f) => Object.keys(f.values)).filter((k) => !PRESET_META.has(k)));
  for (const k of filamentKeys) {
    base[k] = filaments.map((f) => {
      const v = f.values[k];
      return Array.isArray(v) ? String(v[0] ?? "") : v === undefined ? "" : String(v);
    });
  }
  const filled = Object.keys(base).filter((k) => !(k in embedded)).sort();
  const out = { ...base, ...embedded };
  return {
    config: out,
    filled,
    embeddedKeys: Object.keys(embedded).length,
    presets: { machine: printer.files, process: proc.files, filaments: filaments.map((f) => f.files) },
    substitutions,
  };
}

/**
 * Same file entries in the same order with project_settings replaced; every
 * date pinned to the card epoch. No folder entries: JSZip adds one per
 * parent folder unless createFolders is false, and it stamps those with the
 * clock, so the bytes would move with the minute of the run.
 */
export async function completed3mf(bytes, config) {
  const entries = await readEntries(bytes);
  const zout = new JSZip();
  const date = new Date(CARD_EPOCH * 1000);
  for (const [name, data] of Object.entries(entries)) {
    const body = name === PROJECT ? `${JSON.stringify(config, null, 4)}\n` : data;
    zout.file(name, body, { date, compression: "DEFLATE", createFolders: false });
  }
  return zout.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 6 } });
}
