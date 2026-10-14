// Plate 3MF files of a plate scene (M07-T08, M07-T14): one 3MF per plate
// through packages/3mf with the plate layout as instances (D-159 dialect),
// each part as printableParts leaves it. This is the one plate writer: the
// export.run exporter and reference/sheet/ogee16-r16p-plates/build.ts both
// call it and pass their own file names.
//
// The bed machine of an OGEE scene (centauri) carries no slicer preset
// (PROFILE.md 8), so the 3MF names the preset of `presetMachine`; the caller
// says which (M07-T08 card defects). The filament type is the slicer type
// whose name is the stock id, as core's slicerType reads the table, and the
// colour the template was harvested with.

import type { NestResult } from "@hackbuild/spec";
import type { SkeletonLookup } from "@hackbuild/profile";
import { write3mf, type FilamentTemplate, type SlicerMaterials } from "@hackbuild/3mf";
import { plateLayouts, printableParts, type PlateLayoutOut, type PlateScene } from "@hackbuild/nest";

export interface PlateFileOut {
  /** Plate index, count from 0. */
  readonly plate: number;
  readonly name: string;
  /** Instances on the plate, count. */
  readonly pieces: number;
  /** Part ids on the plate, in placement order. */
  readonly ids: readonly string[];
  readonly bytes: Uint8Array;
}

export interface PlateWrite {
  readonly profile: SkeletonLookup;
  readonly template: FilamentTemplate;
  readonly materials: SlicerMaterials;
  /** Machine whose slicer preset the 3MF names. */
  readonly presetMachine: string;
  /** SOURCE_DATE_EPOCH of the zip entries, s. */
  readonly sourceDateEpoch: number;
  /** File name of one plate: its layout, the ids on it and their instance count. */
  readonly name: (lay: PlateLayoutOut, ids: readonly string[], pieces: number) => string;
}

/** One 3MF per plate of a packed plate scene. */
export async function plateFiles(scene: PlateScene, r: NestResult, w: PlateWrite): Promise<PlateFileOut[]> {
  const preset = w.profile.preset(w.presetMachine);
  const stock = scene.request.items[0]!.stock;
  const type = Object.keys(w.materials).find((k) => k.toLowerCase() === stock);
  if (type === undefined) throw new Error(`${scene.id}: no slicer filament type for stock ${stock}`);
  const out: PlateFileOut[] = [];
  const parts = await printableParts(scene.parts);
  for (const lay of plateLayouts(r, parts)) {
    const ids = Object.keys(lay.instances);
    const pieces = ids.reduce((n, id) => n + lay.instances[id]!.length, 0);
    const name = w.name(lay, ids, pieces);
    const written = await write3mf({
      title: name.replace(/\.3mf$/, ""), chase: scene.id, buildHash: r.layoutHash,
      sourceDateEpoch: w.sourceDateEpoch, slicer: preset.slicer, nozzleMm: preset.nozzle, template: w.template, materials: w.materials,
      filaments: [{ colour: w.template.keys["filament_colour"]?.[0] ?? "", type, material: stock }],
      objects: ids.map((id) => {
        const part = parts.find((p) => p.id === id)!;
        return { name: id, position: [0, 0, 0] as const, bodies: [{ name: id, slot: 1, mesh: part.mesh }] };
      }),
      plate: { instances: lay.instances },
    });
    out.push({ plate: lay.plate, name, pieces, ids, bytes: written.bytes });
  }
  return out;
}
