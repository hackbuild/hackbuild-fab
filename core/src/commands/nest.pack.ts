// nest.pack (M07-T14 step 1, D-106 group make, D-109): pack a scene's parts
// onto sheets or plates and return NestResult with CHK-SHT-01, 02 and 07 in
// findings. It writes nothing; export.run writes the cut files after the
// gate. On MCP it is layout_solve with op nest (D-193).
//
// No chase declares sheet items before M10, so --build is E_REF and the
// parts come from a nest scene (packages/nest/scenes/index.ts): --scene
// <id> nests the scene as declared, and --parts <ids> nests one copy of
// each named part, drawn from the first sheet scene that holds them all,
// on that scene's sheet settings. The flags override the scene: --mode,
// --sheet or --machine (its sheet envelope), --gap, --margin,
// --part-in-part, --seed and --kerf-mode.
//
// Kerf mode outline on a machine whose kerf is null (D-101) is
// E_PARAM_MISSING naming the profile row, exit 2, with the same call at
// kerf mode none and the coupon search as next (spec/errors.ts). A part
// that falls into pieces is refused before anything is placed: CHK-SHT-01
// fails and the result holds no layout, exit 1.

import {
  isThrownCommandError, type CommandInput, type CommandOutput, type KerfMode, type NestItem, type NestMode, type NestRequest, type NestResult, type ProfileLookup,
} from "@hackbuild/spec";
import { createProfileLookup } from "@hackbuild/profile";
import { loadGeom } from "@hackbuild/geom";
import { kerfNext, packPlates, packScene, sheetNames, type PlateScene, type SheetScene } from "@hackbuild/nest";
import { cmdError, didYouMean } from "../errors.js";
import { fullProfile } from "../load-build.js";
import { countsOf, errorResult, findingsOf, worst, type CommandOut } from "../result.js";
import type { CoreCtx } from "../registry.js";
import { PACK_CHECKS, sceneEntry, sceneManifest, sceneParams, sheetChecks, type SceneEntry } from "../exporters/sheets.js";

/** The CLI input: the spec input widened by the transitional scene and its params (until M10). */
export type NestPackInput = CommandInput<"nest.pack"> & {
  readonly scene?: string;
  readonly params?: Readonly<Record<string, unknown>>;
};

/** What nest.pack returns: spec's layout and refused, and what it ran on. */
export interface NestPackOutput extends CommandOutput<"nest.pack"> {
  readonly scene: string;
  readonly kind: "sheet" | "plate";
  readonly machine: string;
  readonly kerfMode: KerfMode | null;
  /** Beam applied to every outline, mm: the machine kerf in mode outline, 0 in mode none; null for plates. */
  readonly beam: number | null;
  /** File stems of the sheets or plates, in sheet order. */
  readonly names: readonly string[];
}

/** The scene a call nests: --scene, or the sheet scene that holds every --parts id. */
async function pickScene(i: NestPackInput, ctx: CoreCtx): Promise<SceneEntry> {
  if (i.build !== undefined && i.scene !== undefined) {
    throw cmdError({ code: "E_SCHEMA", path: "/scene", got: i.scene, expected: "--build or --scene, not both", hint: "pass one of --build and --scene" });
  }
  if (i.build !== undefined) {
    throw cmdError({
      code: "E_REF", path: "/build", got: i.build, expected: "a build whose chase declares sheet items",
      hint: "no chase declares sheet items before M10; nest a scene with --scene <id> or its parts with --parts", record: "sheet-design",
    });
  }
  if (i.scene !== undefined) return sceneEntry(i.scene, ctx);
  if (i.parts === undefined) {
    throw cmdError({ code: "E_PARAM_MISSING", path: "/parts", expected: "--scene <id> or --parts <ids>", hint: "name what to nest with --scene <id> or --parts a,b,c" });
  }
  const profile = createProfileLookup(fullProfile());
  const sheets = (await sceneManifest(ctx.workspace)).filter((s) => s.kind === "sheet");
  const loaded = sheets.map((s) => ({ s, ids: new Set((s.load(profile, {}) as SheetScene).request.items.map((it) => it.id)) }));
  const known = [...new Set(loaded.flatMap((x) => [...x.ids]))];
  i.parts.forEach((p, k) => {
    if (!known.includes(p)) throw cmdError({ code: "E_REF", path: `/parts/${k}`, got: p, didYouMean: didYouMean(p, known), hint: "name a part of a nest scene" });
  });
  const hit = loaded.find((x) => i.parts!.every((p) => x.ids.has(p)));
  if (hit === undefined) {
    throw cmdError({ code: "E_SCHEMA", path: "/parts", got: i.parts, expected: "parts of one nest scene", hint: `the parts come from different scenes (${sheets.map((s) => s.id).join(", ")}); nest them in separate calls` });
  }
  return hit.s;
}

/** The sheet a call sets: --sheet, else the --machine sheet envelope, else the scene's. */
function sheetOf(i: NestPackInput, profile: ProfileLookup, fallback: readonly [number, number]): readonly [number, number] {
  if (i.sheet !== undefined) return i.sheet;
  if (i.machine === undefined) return fallback;
  const env = profile.machine(i.machine).envelope;
  if (!("sheet" in env)) {
    throw cmdError({ code: "E_SCHEMA", path: "/machine", got: i.machine, expected: "a machine with a sheet envelope", hint: "name a laser or sheet machine, or give --sheet WxH" });
  }
  return env.sheet;
}

/** The scene's request with the call's overrides; --parts takes one copy of each named part. */
function requestOf(i: NestPackInput, req: NestRequest, profile: ProfileLookup): NestRequest {
  const items: readonly NestItem[] = i.parts === undefined ? req.items : i.parts.map((p) => ({ ...req.items.find((it) => it.id === p)!, qty: 1 }));
  const sheet = sheetOf(i, profile, req.sheet);
  return {
    ...req, items, sheet: [sheet[0], sheet[1]],
    ...(i.mode === undefined ? {} : { mode: i.mode as NestMode }),
    ...(i.gap === undefined ? {} : { gap: i.gap }),
    ...(i.margin === undefined ? {} : { margin: i.margin }),
    ...(i.partInPart === undefined ? {} : { partInPart: i.partInPart }),
    ...(i.seed === undefined ? {} : { seed: i.seed }),
  };
}

const ZERO = { pass: 0, warn: 0, fail: 0, skip: 0 } as const;

/** The spec input of the call, as kerfNext repeats it. */
function argsOf(i: NestPackInput): Record<string, unknown> {
  return Object.fromEntries(Object.entries(i).filter(([, v]) => v !== undefined));
}

export async function runNestPack(i: NestPackInput, ctx: CoreCtx): Promise<CommandOut<NestPackOutput>> {
  const entry = await pickScene(i, ctx);
  const profile = createProfileLookup(fullProfile());
  const params = sceneParams(entry, i.params);
  if (entry.kind === "plate") {
    const scene: PlateScene = entry.load(profile, params);
    // --machine names the bed printer here, so the sheet comes from --sheet or the scene, never a sheet envelope.
    const { machine: _sheetMachine, ...rest } = i;
    const plate: PlateScene = { ...scene, request: requestOf(rest, scene.request, profile), machine: i.machine ?? scene.machine };
    const r = packPlates(plate, profile);
    return {
      verdict: "pass", stage: "done", inputsHash: ctx.inputsHash, findings: [], counts: { ...ZERO }, errors: [], artifacts: [], next: [],
      result: { scene: scene.id, kind: "plate", machine: plate.machine, kerfMode: null, beam: null, layout: r, names: Array.from({ length: r.sheets }, (_, s) => `${scene.id}-plate${s + 1}`), refused: [] },
    };
  }
  const loaded: SheetScene = entry.load(profile, params);
  const scene: SheetScene = {
    ...loaded, request: requestOf(i, loaded.request, profile), machine: i.machine ?? loaded.machine, kerfMode: i.kerfMode ?? loaded.kerfMode,
  };
  const geom = await loadGeom();
  let outcome;
  try {
    outcome = packScene(geom, scene, profile);
  } catch (e) {
    if (isThrownCommandError(e) && e.hbf.code === "E_PARAM_MISSING") {
      const { ok: _ok, ...out } = errorResult(e.hbf, ctx.inputsHash, { next: kerfNext("nest.pack", { ...argsOf(i), kerfMode: scene.kerfMode }) });
      return out as CommandOut<NestPackOutput>;
    }
    throw e;
  }
  const results = await sheetChecks(PACK_CHECKS, scene, outcome, profile, ctx);
  const refused = [...new Set(outcome.findings.filter((f) => f.finding.verdict === "fail").map((f) => (f.finding.target as { part?: string }).part ?? ""))];
  const verdict = worst(results);
  return {
    verdict, stage: verdict === "fail" ? "check" : "done", inputsHash: ctx.inputsHash, findings: findingsOf(results), counts: countsOf(results),
    errors: [], artifacts: [], next: [],
    result: {
      scene: scene.id, kind: "sheet", machine: scene.machine, kerfMode: scene.kerfMode, beam: outcome.beam, layout: outcome.result,
      names: outcome.result === null ? [] : sheetNames(scene, outcome.result).map((n) => n.name), refused,
    },
  };
}
