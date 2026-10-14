// A sheet scene and the one route from it to cut files (M07-T07). A scene
// is data: the request, the machine row its sheet must fit, the kerf mode,
// the writer options, and a file label per stock. cutScene runs it through
// the checked nest (connect.ts packSheets, which refuses a severed or
// hole-less part before anything is placed), draws the layout (dxf.ts
// drawSheets) and writes each sheet with the one DXF writer and its SVG
// twin. A refused nest writes no file. Scenes live in packages/nest/scenes
// and import node and types only, so core can load one by path until M10
// moves scene items into build.ts.

import { commandError, type KerfMode, type NestRequest, type NestResult, type ProfileLookup } from "@hackbuild/spec";
import type { Geom } from "@hackbuild/geom";
import { packSheets, type PackOutcome } from "./connect.js";
import { drawSheets, sheetEntities, writeDxf, type SheetDrawing, type WriteOptions } from "./dxf.js";
import { writeSvgCut } from "./svg.js";

export interface SheetScene {
  /** Scene id, lowercase slug. */
  readonly id: string;
  readonly request: NestRequest;
  /** Machine profile id whose sheet envelope bounds request.sheet (D-137: laser output has a sheet bound). */
  readonly machine: string;
  readonly kerfMode: KerfMode;
  /** Writer options; `arcs: false` writes every ring vertex for vertex. */
  readonly write: WriteOptions;
  /** File stem prefix, for example "slug". */
  readonly prefix: string;
  /** File label per stock id, for example ply3 to "ply"; every item stock needs one. */
  readonly labels: Readonly<Record<string, string>>;
  /** How the scene's numbers are qualified (D-007). */
  readonly qualifier: "computed" | "informational";
  /** Where each input came from, file and lines. */
  readonly sources: readonly string[];
}

/** One written sheet. */
export interface CutSheet {
  /** Sheet index of the layout, count from 0. */
  readonly sheet: number;
  readonly stock: string;
  /** File stem: prefix, stock label and the sheet number within that stock from 1, for example slug-ply-sheet1. */
  readonly name: string;
  readonly drawing: SheetDrawing;
  /** Entities written, count; with arcs off, one per ring. */
  readonly loops: number;
  readonly dxf: string;
  readonly svg: string;
}

export interface CutScene {
  readonly outcome: PackOutcome;
  /** Empty when a kernel refused the nest. */
  readonly sheets: readonly CutSheet[];
}

const refuse = (path: string, got: unknown, expected: string, hint: string): never => {
  throw commandError({ code: "E_SCHEMA", path, got, expected, hint });
};

/** Refuses a sheet that fits the machine's sheet envelope in neither orientation. */
function boundSheet(profile: ProfileLookup, scene: SheetScene): void {
  const env = profile.machine(scene.machine).envelope;
  if (!("sheet" in env)) return refuse("/machine", scene.machine, "a machine with a sheet envelope", `machine ${scene.machine} has no sheet envelope; name a laser or sheet machine`);
  const [W, H] = scene.request.sheet;
  const [eW, eH] = env.sheet;
  if (!((W <= eW && H <= eH) || (W <= eH && H <= eW))) {
    refuse("/request/sheet", [W, H], `a sheet within ${eW} x ${eH} mm (machine ${scene.machine})`, "use a sheet the machine takes, or name a larger machine");
  }
}

/** One laid out sheet: its index, its one stock and its file stem. */
export interface SheetName {
  /** Sheet index of the layout, count from 0. */
  readonly sheet: number;
  readonly stock: string;
  /** prefix, stock label and the sheet number within that stock from 1, for example slug-ply-sheet1. */
  readonly name: string;
}

/** The stock and file stem of every sheet of a layout; a sheet holding two stocks is refused. */
export function sheetNames(scene: SheetScene, result: NestResult): SheetName[] {
  const stockOf = new Map(scene.request.items.map((it) => [it.id, it.stock]));
  const seen = new Map<string, number>();
  return Array.from({ length: result.sheets }, (_, s): SheetName => {
    const stocks = [...new Set(result.placements.filter((p) => p.sheet === s).map((p) => stockOf.get(p.id)!))];
    if (stocks.length !== 1) refuse("/request/groupBy", scene.request.groupBy ?? "stock", "one stock per sheet", `sheet ${s + 1} holds ${stocks.join(", ")}; group by stock`);
    const stock = stocks[0]!;
    const n = (seen.get(stock) ?? 0) + 1;
    seen.set(stock, n);
    return { sheet: s, stock, name: `${scene.prefix}-${scene.labels[stock]!}-sheet${n}` };
  });
}

/** The checked nest of a scene: sheet and label bounds, then packSheets; writes nothing (nest.pack, M07-T14). */
export function packScene(geom: Geom, scene: SheetScene, profile: ProfileLookup): PackOutcome {
  boundSheet(profile, scene);
  scene.request.items.forEach((it, i) => {
    if (scene.labels[it.stock] === undefined) refuse(`/request/items/${i}/stock`, it.stock, Object.keys(scene.labels).join(" or "), `give stock ${it.stock} a file label in the scene`);
  });
  return packSheets(geom, scene.request, { profile, machine: scene.machine, kerfMode: scene.kerfMode });
}

/** Run a scene: checked nest, drawings, and one DXF and one SVG per sheet. */
export function cutScene(geom: Geom, scene: SheetScene, profile: ProfileLookup): CutScene {
  const outcome = packScene(geom, scene, profile);
  const result = outcome.result;
  if (result === null) return { outcome, sheets: [] };
  const drawings = drawSheets(outcome.items, result, scene.request.sheet);
  const names = sheetNames(scene, result);
  const sheets = drawings.map((drawing, s): CutSheet => {
    const { stock, name } = names[s]!;
    return {
      sheet: s, stock, name, drawing,
      loops: sheetEntities(drawing, scene.write).length,
      dxf: writeDxf(drawing, scene.write),
      svg: writeSvgCut(drawing, `${scene.id} ${name}`, scene.write),
    };
  });
  return { outcome, sheets };
}
