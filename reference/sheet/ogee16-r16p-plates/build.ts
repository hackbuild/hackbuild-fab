// reference/sheet/ogee16-r16p-plates/build.ts
// The OGEE R16-P plates through nest (M07-T08): the ogee16-r16p-plates
// scene for both drives, packed by packPlates at the page's gap 4 and with
// gap auto, and each plate written as one 3MF through packages/3mf with the
// plate layout as instances (M07-T02, D-159 dialect), each part as
// printableParts leaves it (packages/nest/src/plates.ts), by the one plate
// writer export.run also calls (core/src/exporters/plates.ts, M07-T14). It returns what
// expected/ holds (layout.json, artifacts.json) and the plate files the
// test writes and audits. Nothing is computed here that nest or the writer
// does not compute; this file names what the goldens keep.
//
// The bed is machine centauri (profile, vendor). centauri carries no slicer
// preset (PROFILE.md 8), so the 3MF names the ffc5p default preset, the
// printer the R16-P notes print on (knowledge/designs/ogee16.md section 2);
// both beds are 256 x 256 mm (M07-T08 card defects). The zip dates come
// from SOURCE_DATE_EPOCH 315532800; the build hash slot carries the
// layoutHash, since the scene has no chase until M10.

import { readFileSync } from "node:fs";
import { sha256Hex, type NestResult } from "@hackbuild/spec";
import type { SkeletonLookup } from "@hackbuild/profile";
import { filamentTemplate, slicerMaterials, type FilamentTemplate } from "@hackbuild/3mf";
import { packPlates, type PlateScene } from "@hackbuild/nest";
import { plateFiles } from "../../../core/src/exporters/plates.js";
import { DRIVES, ogee16PlatesScene, type Drive } from "../../../packages/nest/scenes/ogee16-r16p-plates.js";

const ROOT = new URL("../../../", import.meta.url);
const readJson = (rel: string): unknown => JSON.parse(readFileSync(new URL(rel, ROOT), "utf8")) as unknown;

/** SOURCE_DATE_EPOCH the plate files are written at, s (1980-01-01, the first zip mtime). */
export const PLATE_EPOCH = 315532800;
/** The machine whose preset names the slicer in the 3MF; the bed comes from the scene's machine. */
export const PRESET_MACHINE = "ffc5p";

export interface PlateFile {
  readonly drive: Drive;
  /** Plate index, count from 0. */
  readonly plate: number;
  /** File name, quantity and part id in it, for example ogee16-r16p-knobs-p12-link-x16.3mf. */
  readonly name: string;
  readonly bytes: Uint8Array;
}

export interface PlatesBuild {
  readonly layout: Record<string, unknown>;
  readonly artifacts: Record<string, Record<string, string>>;
  readonly files: readonly PlateFile[];
  readonly scenes: Readonly<Record<Drive, PlateScene>>;
  readonly results: Readonly<Record<Drive, NestResult>>;
}

/** What a golden keeps of one run. */
function summary(scene: PlateScene, r: NestResult, placements: boolean): Record<string, unknown> {
  return {
    items: scene.request.items.length,
    pieces: scene.request.items.reduce((n, it) => n + it.qty, 0),
    sheets: r.sheets, packer: r.packer, ...(r.order === undefined ? {} : { order: r.order }), gap: r.gap, oversize: r.oversize,
    perPlate: Array.from({ length: r.sheets }, (_, s) => {
      const on = r.placements.filter((p) => p.sheet === s);
      return { id: on[0]!.id, pieces: on.length, fillPercent: r.fill[s] };
    }),
    layoutHash: r.layoutHash,
    ...(placements ? { placements: r.placements } : {}),
  };
}

const pad = (n: number): string => String(n + 1).padStart(2, "0");

async function plateFilesOf(drive: Drive, scene: PlateScene, r: NestResult, profile: SkeletonLookup, template: FilamentTemplate): Promise<PlateFile[]> {
  const files = await plateFiles(scene, r, {
    profile, template, materials: slicerMaterials(readJson("packages/3mf/seed/materials.json")), presetMachine: PRESET_MACHINE, sourceDateEpoch: PLATE_EPOCH,
    name: (lay, ids, count) => `ogee16-r16p-${drive}-p${pad(lay.plate)}-${ids.join("-")}-x${count}.3mf`,
  });
  return files.map((f) => ({ drive, plate: f.plate, name: f.name, bytes: f.bytes }));
}

export async function build(profile: SkeletonLookup): Promise<PlatesBuild> {
  const template = filamentTemplate(readJson("packages/3mf/data/filament_template.json"));
  const scenes = {} as Record<Drive, PlateScene>;
  const results = {} as Record<Drive, NestResult>;
  const layout: Record<string, unknown> = {};
  const files: PlateFile[] = [];
  for (const drive of DRIVES) {
    const scene = ogee16PlatesScene(profile, drive);
    const r = packPlates(scene, profile);
    const auto = packPlates(ogee16PlatesScene(profile, drive, "auto"), profile);
    scenes[drive] = scene;
    results[drive] = r;
    layout[drive] = {
      bill: scene.request.items.map((it) => [it.id, it.qty]),
      footprints: scene.parts.map((p) => ({ id: p.id, w: p.w, d: p.d, h: p.h })),
      gap4: summary(scene, r, true),
      gapAuto: summary(scene, auto, false),
    };
    files.push(...await plateFilesOf(drive, scene, r, profile, template));
  }
  const first = scenes.knobs;
  return {
    scenes, results, files,
    layout: {
      scene: first.id, machine: first.machine, presetMachine: PRESET_MACHINE, sheet: first.request.sheet,
      margin: first.request.margin, rotations: first.request.rotations, qualifier: first.qualifier, sources: first.sources, ...layout,
    },
    artifacts: { "3mf": Object.fromEntries(files.map((f) => [f.name, sha256Hex(f.bytes)])) },
  };
}
