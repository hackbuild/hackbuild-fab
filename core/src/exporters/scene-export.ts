// export.run on a nest scene (M07-T14 step 3, D-109): build, checks, then
// the gate. A sheet scene goes through nest's checked route (cutScene: the
// connectivity kernels, the layout, the one DXF writer and its SVG twin);
// CHK-SHT-01, 02, 03 and 07 run on every sheet, and any fail returns the
// findings with exit 1 and no prompt. A plate scene packs onto the bed and
// writes one 3MF a plate through the one plate writer; the M00 artifact
// checks run on every plate. Only then does the gate ask, once for the set;
// without a TTY the result is E_GATE_UNAVAILABLE naming the line a person
// runs. File names follow PACKAGES.md 8.2 (names.ts). Until M10 gives
// these designs a chase, --scene is the CLI's way to name them.

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { isThrownCommandError, sha256Hex, type ArtifactBytes, type CheckResult, type CommandInput, type Hash, type NestResult } from "@hackbuild/spec";
import { createProfileLookup } from "@hackbuild/profile";
import { loadGeom } from "@hackbuild/geom";
import { runArtifactChecks, skeletonChecks } from "@hackbuild/checks";
import { cutScene, kerfNext, packPlates, type CutScene, type PlateScene, type SheetScene } from "@hackbuild/nest";
import { cmdError, didYouMean } from "../errors.js";
import { fullProfile } from "../load-build.js";
import { countsOf, errorResult, findingsOf, worst, type CommandOut } from "../result.js";
import type { CoreCtx } from "../ctx.js";
import { askHost } from "../tty-gate.js";
import { loadWorkspace } from "../commands/build.js";
import { SHEET_EXPORTERS, type SheetExporter } from "./index.js";
import { laserName, nameSet, plateName } from "./names.js";
import { plateFiles } from "./plates.js";
import { EXPORT_CHECKS, sceneEntry, sceneParams, sheetChecks } from "./sheets.js";

/** export.run's input as the CLI reads it: chase or the transitional scene. */
export type ExportInput = Omit<CommandInput<"export.run">, "chase"> & { readonly chase?: string; readonly scene?: string };

/** The machine whose slicer preset a plate 3MF names (M07-T08 card defects: centauri carries none, both beds are 256 x 256 mm). */
export const PLATE_PRESET_MACHINE = "ffc5p";

/** SOURCE_DATE_EPOCH of the zip entries, s: the environment's, else 1980-01-01 (D-052). */
const epochOf = (): number => Number(process.env["SOURCE_DATE_EPOCH"] ?? 315532800);

const quote = (s: string): string => (/^[\w./:@,-]+$/.test(s) ? s : `'${s.replace(/'/g, "'\\''")}'`);

/** The command line a person runs at a terminal to answer the gate. */
export function scenePersonLine(input: ExportInput, out: string | undefined): string {
  const parts = ["npx --no-install hbf export.run --scene", quote(input.scene ?? ""), "--kind", input.kind];
  if (input.machine !== undefined) parts.push("--machine", quote(input.machine));
  if (input.params !== undefined) parts.push("--params", quote(JSON.stringify(input.params)));
  if (input.kerfMode !== undefined) parts.push("--kerf-mode", input.kerfMode);
  if (out !== undefined) parts.push("--out", quote(out));
  return parts.join(" ");
}

/** One file of the set, named and with its bytes. */
export interface SceneFile {
  readonly name: string;
  readonly bytes: Uint8Array;
  readonly mediaType: string;
  readonly ext: string;
}

/** What a scene export built and checked before the gate. */
export interface SceneBuilt {
  readonly scene: string;
  readonly machine: string;
  readonly layoutHash: Hash;
  readonly files: readonly SceneFile[];
  readonly results: readonly CheckResult[];
  /** Part id to the copies the scene asks for: the BOM, from the scene items (Part IR instance counts once M10 gives a chase). */
  readonly bom: Readonly<Record<string, number>>;
  /** File name to the part ids on it and the copies of each. */
  readonly contents: Readonly<Record<string, Readonly<Record<string, number>>>>;
}

/** Part copies per file from a layout's placements. */
function copies(r: NestResult, sheet: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of r.placements) if (p.sheet === sheet) out[p.id] = (out[p.id] ?? 0) + 1;
  return out;
}

const bomOf = (items: readonly { readonly id: string; readonly qty: number }[]): Record<string, number> =>
  Object.fromEntries(items.filter((it) => it.qty > 0).map((it) => [it.id, it.qty]));

async function sheetSet(exporter: SheetExporter, scene: SheetScene, ctx: CoreCtx): Promise<SceneBuilt | CommandOut<never>> {
  const profile = createProfileLookup(fullProfile());
  let cut: CutScene;
  try {
    cut = cutScene(await loadGeom(), scene, profile);
  } catch (e) {
    if (isThrownCommandError(e) && e.hbf.code === "E_PARAM_MISSING") {
      const { ok: _ok, ...out } = errorResult(e.hbf, ctx.inputsHash, { next: kerfNext("export.run", { scene: scene.id, kind: exporter.id, kerfMode: scene.kerfMode }) });
      return out as CommandOut<never>;
    }
    throw e;
  }
  const unique = nameSet();
  const names = new Map(cut.sheets.map((s) => {
    const t = profile.material(s.stock).thickness;
    if (t === undefined) throw cmdError({ code: "E_PARAM_MISSING", path: `hbf://profile/material/${s.stock}#/thickness`, expected: "the stock thickness in mm", hint: `material ${s.stock} has no thickness row; a laser file names it` });
    return [s.name, { dxf: laserName(s.name, 1, t, s.stock, "dxf"), own: unique(laserName(s.name, 1, t, s.stock, exporter.ext)) }] as const;
  }));
  const results = await sheetChecks(EXPORT_CHECKS, scene, cut.outcome, profile, ctx, { scene: cut, fileOf: (n) => names.get(n)!.dxf });
  const r = cut.outcome.result;
  return {
    scene: scene.id, machine: scene.machine, layoutHash: (r?.layoutHash ?? sha256Hex("")) as Hash, results,
    files: cut.sheets.map((s) => ({ name: names.get(s.name)!.own, bytes: exporter.bytes(s), mediaType: exporter.mediaType, ext: exporter.ext })),
    bom: bomOf(scene.request.items),
    contents: r === null ? {} : Object.fromEntries(cut.sheets.map((s) => [names.get(s.name)!.own, copies(r, s.sheet)])),
  };
}

async function plateSet(scene: PlateScene, ctx: CoreCtx): Promise<SceneBuilt> {
  const profile = createProfileLookup(fullProfile());
  const ws = await loadWorkspace(ctx.workspace);
  const r = packPlates(scene, profile);
  const unique = nameSet();
  const written = await plateFiles(scene, r, {
    profile, template: ws.template, materials: ws.materials, presetMachine: PLATE_PRESET_MACHINE, sourceDateEpoch: epochOf(),
    name: (lay, ids) => unique(plateName(lay.plate + 1, r.sheets, ids.join("-"))),
  });
  const defs = skeletonChecks({ seed: ws.checksSeed, filamentTemplate: ws.template }).filter((d) => d.appliesTo.level === "artifact");
  const artifacts: ArtifactBytes[] = written.map((f) => ({ exporter: "3mf", name: f.name, bytes: f.bytes }));
  const results = await runArtifactChecks(defs, { artifacts, profile, machine: PLATE_PRESET_MACHINE });
  return {
    scene: scene.id, machine: scene.machine, layoutHash: r.layoutHash, results: [...results],
    files: written.map((f) => ({ name: f.name, bytes: f.bytes, mediaType: "model/3mf", ext: "3mf" })),
    bom: bomOf(scene.request.items),
    contents: Object.fromEntries(written.map((f) => [f.name, copies(r, f.plate)])),
  };
}

/** Build and check a scene's file set for an export kind; a CommandOut when the build stopped on an error with next calls. */
export async function buildSceneExport(input: ExportInput, ctx: CoreCtx): Promise<SceneBuilt | CommandOut<never>> {
  const entry = await sceneEntry(input.scene!, ctx);
  const profile = createProfileLookup(fullProfile());
  const params = sceneParams(entry, input.params as Readonly<Record<string, unknown>> | undefined);
  const sheetKinds = SHEET_EXPORTERS.map((e) => e.id);
  const want = entry.kind === "sheet" ? sheetKinds : ["3mf"];
  if (!want.includes(input.kind)) {
    throw cmdError({ code: "E_SCHEMA", path: "/kind", got: input.kind, expected: want.join(" or "), didYouMean: didYouMean(input.kind, want), hint: `scene ${entry.id} is a ${entry.kind} scene; export it as ${want.join(" or ")}` });
  }
  if (input.preset !== undefined) throw cmdError({ code: "E_SCHEMA", path: "/preset", got: input.preset, expected: "absent", hint: "a nest scene declares no presets; leave --preset out" });
  if (entry.kind === "plate") {
    if (input.kerfMode !== undefined) throw cmdError({ code: "E_SCHEMA", path: "/kerfMode", got: input.kerfMode, expected: "absent", hint: "a plate prints; kerf mode is for sheet exports" });
    const scene = entry.load(profile, params);
    if (input.machine !== undefined && input.machine !== scene.machine) {
      throw cmdError({ code: "E_REF", path: "/machine", got: input.machine, didYouMean: [scene.machine], hint: `scene ${scene.id} packs on ${scene.machine}` });
    }
    return plateSet(scene, ctx);
  }
  const loaded = entry.load(profile, params);
  const scene: SheetScene = { ...loaded, machine: input.machine ?? loaded.machine, kerfMode: input.kerfMode ?? loaded.kerfMode };
  return sheetSet(SHEET_EXPORTERS.find((e) => e.id === input.kind)!, scene, ctx);
}

/** export.run --scene: the checked set, then the gate, then the files. */
export async function runSceneExport(input: ExportInput, ctx: CoreCtx): Promise<CommandOut<unknown>> {
  if (input.chase !== undefined) {
    throw cmdError({ code: "E_SCHEMA", path: "/scene", got: input.scene, expected: "a chase or --scene, not both", hint: "pass one of the chase and --scene" });
  }
  const built = await buildSceneExport(input, ctx);
  if (!("files" in built)) return built;
  const results = built.results;
  const counts = countsOf(results);
  const evidence = { buildHash: built.layoutHash, inputsHash: ctx.inputsHash, findings: findingsOf(results), counts };
  const summary = { scene: built.scene, files: built.files.map((f) => f.name), bom: built.bom, contents: built.contents };
  if (worst(results) === "fail") {
    return { ...evidence, verdict: "fail", stage: "check", errors: [], artifacts: [], next: [], result: { ...summary, artifacts: [], warnings: [] } };
  }
  const dir = path.resolve(ctx.cwd, ctx.cli.out ?? path.join(ctx.workspace, "out", built.scene));
  const rel = path.relative(ctx.cwd, dir);
  const shown = rel === "" || rel.startsWith("..") ? dir : rel;
  if (input.dryRun === true) {
    return { ...evidence, verdict: worst(results), stage: "gate", errors: [], artifacts: [], next: [], result: { ...summary, artifacts: [], warnings: [] } };
  }
  const answer = await askHost(ctx, {
    kind: input.kind, machine: built.machine, chase: built.scene, buildHash: built.layoutHash,
    fail: counts.fail, warn: counts.warn, path: `${shown}${path.sep} (${built.files.length} files)`,
  });
  if (answer === "unavailable") {
    throw cmdError({
      code: "E_GATE_UNAVAILABLE", path: "/", personRuns: scenePersonLine(input, ctx.cli.out),
      hint: "no interactive terminal on stdin and stdout; a person runs the export line at a terminal and answers the prompt",
    });
  }
  if (answer === "declined") throw cmdError({ code: "E_GATE", path: "/", got: "n", hint: "export declined at the prompt; nothing written" });
  mkdirSync(dir, { recursive: true });
  const artifacts = built.files.map((f) => {
    writeFileSync(path.join(dir, f.name), f.bytes);
    const hash = sha256Hex(f.bytes) as Hash;
    const uri = ctx.store.putArtifact(hash, f.ext, f.bytes);
    return { uri, kind: input.kind, mediaType: f.mediaType, hash, bytes: f.bytes.length };
  });
  return {
    ...evidence, verdict: worst(results), stage: "done", errors: [], artifacts, next: [],
    result: { ...summary, artifacts: artifacts.map((a) => a.uri), warnings: [] },
  };
}
