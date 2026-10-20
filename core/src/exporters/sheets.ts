// Nest scenes on the core side (M07-T14): the scene manifest loaded by path
// (packages/nest/scenes/index.ts, the one list of scene ids, until M10
// moves scene items into build.ts) and the CHK-SHT checks on a sheet
// layout. nest computes the connectivity findings before it places
// anything (packSheets, M07-T04) and writes the cut files (cutScene,
// M07-T06 and T07); the registry stamps them with severity and origin as
// CheckResults, one sheet target per laid out sheet. A refused nest has no
// sheets, so its findings go on one target for the unplaced request.

import path from "node:path";
import { pathToFileURL } from "node:url";
import type { CheckResult, Finding, KernelId, ProfileLookup, Sheet } from "@hackbuild/spec";
import { CHECK_MODULES, kernelsAt, registerChecks, runRegistry, type KernelViews } from "@hackbuild/checks";
import { sheetNames, type CutScene, type PackOutcome, type PlateScene, type SheetScene } from "@hackbuild/nest";
import { cmdError, didYouMean } from "../errors.js";
import type { CoreCtx } from "../ctx.js";
import { loadWorkspace } from "../commands/build.js";

/** One manifest row of packages/nest/scenes/index.ts, by shape (core's rootDir holds no scene file). */
export type SceneEntry =
  | { readonly id: string; readonly kind: "sheet"; readonly params: readonly string[]; load(profile: ProfileLookup, p: Readonly<Record<string, unknown>>): SheetScene }
  | { readonly id: string; readonly kind: "plate"; readonly params: readonly string[]; load(profile: ProfileLookup, p: Readonly<Record<string, unknown>>): PlateScene };

/** The scene manifest of the workspace. */
export async function sceneManifest(workspace: string): Promise<readonly SceneEntry[]> {
  const mod = (await import(pathToFileURL(path.join(workspace, "packages", "nest", "scenes", "index.ts")).href)) as { SCENES: readonly SceneEntry[] };
  return mod.SCENES;
}

/** The manifest row a --scene names; E_REF with didYouMean otherwise. */
export async function sceneEntry(id: string, ctx: CoreCtx, pointer = "/scene"): Promise<SceneEntry> {
  const all = await sceneManifest(ctx.workspace);
  const hit = all.find((s) => s.id === id);
  if (hit === undefined) {
    const ids = all.map((s) => s.id);
    throw cmdError({ code: "E_REF", path: pointer, got: id, didYouMean: didYouMean(id, ids), hint: `name a nest scene: ${ids.join(", ")}` });
  }
  return hit;
}

/** Scene params from a call: only the ones the scene reads; any other is E_SCHEMA. */
export function sceneParams(e: SceneEntry, params: Readonly<Record<string, unknown>> | undefined): Readonly<Record<string, unknown>> {
  for (const k of Object.keys(params ?? {})) {
    if (!e.params.includes(k)) {
      throw cmdError({
        code: "E_SCHEMA", path: `/params/${k}`, got: k, expected: e.params.length === 0 ? "no params" : e.params.join(", "),
        didYouMean: didYouMean(k, e.params), hint: `scene ${e.id} reads ${e.params.length === 0 ? "no params" : e.params.join(", ")}`,
      });
    }
  }
  return params ?? {};
}

/** The checks nest.pack returns on a sheet layout (M07-T14 step 1). */
export const PACK_CHECKS = ["CHK-SHT-01", "CHK-SHT-02", "CHK-SHT-07"] as const;
/** The checks a sheet export gates on (M07-T14 step 3): the cut file reloads closed as well. */
export const EXPORT_CHECKS = ["CHK-SHT-01", "CHK-SHT-02", "CHK-SHT-03", "CHK-SHT-07"] as const;

/** One sheet target: id, size, stock as material, machine and its placements. */
interface Target {
  readonly sheet: Sheet;
  /** Part ids whose connectivity findings belong to this sheet. */
  readonly ids: ReadonlySet<string>;
}

function targets(scene: SheetScene, outcome: PackOutcome): Target[] {
  const r = outcome.result;
  const size = scene.request.sheet;
  if (r === null) {
    const stocks = [...new Set(scene.request.items.map((it) => it.stock))];
    return [{
      sheet: { id: `${scene.prefix}-unplaced`, size, material: stocks.join(" "), machine: scene.machine, placements: [] },
      ids: new Set(scene.request.items.map((it) => it.id)),
    }];
  }
  return sheetNames(scene, r).map((n) => {
    const on = r.placements.filter((p) => p.sheet === n.sheet);
    return {
      sheet: { id: n.name, size, material: n.stock, machine: scene.machine, placements: on.map((p) => ({ part: p.id, at: p.at, rotDeg: p.rot })) },
      ids: new Set(on.map((p) => p.id)),
    };
  });
}

/**
 * The CHK-SHT checks named in `ids` on a sheet layout, through the
 * registry. `cut` hands CHK-SHT-03 the DXF bytes and SVG twin written for
 * each sheet, under the file name the export gives it.
 */
export async function sheetChecks(
  ids: readonly string[], scene: SheetScene, outcome: PackOutcome, profile: ProfileLookup, ctx: CoreCtx,
  cut?: { readonly scene: CutScene; readonly fileOf: (sheet: string) => string },
): Promise<CheckResult[]> {
  const ws = await loadWorkspace(ctx.workspace);
  const defs = registerChecks({ seed: ws.checksSeed, filamentTemplate: ws.template }, CHECK_MODULES).filter((d) => ids.includes(d.id));
  const ts = targets(scene, outcome);
  const byId = new Map(ts.map((t) => [t.sheet.id, t]));
  const views: KernelViews = {
    sheetConnect: (sheet) => {
      const t = byId.get(sheet);
      return t === undefined ? undefined : outcome.findings.filter((f) => t.ids.has(partOf(f.finding)));
    },
    ...(cut === undefined ? {} : {
      sheetCut: (sheet: string) => {
        const s = cut.scene.sheets.find((x) => x.name === sheet);
        return s === undefined ? undefined : { name: cut.fileOf(s.name), dxf: new TextEncoder().encode(s.dxf), svg: s.svg };
      },
    }),
  };
  const report = await runRegistry(defs, {
    kernels: kernelsAt("M07") as ReadonlySet<KernelId>, produced: new Set(["sheet"]),
    targets: { sheets: ts.map((t) => ({ sheet: t.sheet, parts: [] })) },
    ctx: { profile, machine: scene.machine, whitelist: new Map() }, views,
  });
  return [...report.results];
}

const partOf = (f: Finding): string => (f.target as { part?: string }).part ?? "";
