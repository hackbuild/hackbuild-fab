// reference/sheet/slug-sheets/build.ts
// SLUG's laser sheets through nest (M07-T07): the slug-sheets scene in
// legacy-shelf mode (the shipped layout) and in fill mode with
// part-in-part, and the informational slug-sheets-complete scene, each run
// through nest's one route to cut files (cutScene: the checked nest, the
// drawings, the DXF writer and its SVG twin). It returns the three objects
// expected/ holds: layout.json, artifacts.json and findings.json. Nothing is
// computed here that cutScene does not compute; this file only names what
// the goldens keep.

import type { Geom } from "@hackbuild/geom";
import { sha256Hex, type ProfileLookup } from "@hackbuild/spec";
import { cutScene, type CutScene, type SheetScene } from "@hackbuild/nest";
import { slugSheetsScene } from "../../../packages/nest/scenes/slug-sheets.js";
import { slugSheetsCompleteScene } from "../../../packages/nest/scenes/slug-sheets-complete.js";

export interface SlugSheetsBuild {
  readonly layout: Record<string, unknown>;
  readonly artifacts: Record<string, Record<string, string>>;
  readonly findings: Record<string, unknown>;
  /** The legacy-shelf run whose files a laser receives. */
  readonly shelf: CutScene;
}

/** What a golden keeps of one run: counts per stock, per sheet, the layout hash and the chosen packer. */
function summary(scene: SheetScene, cut: CutScene, placements: boolean): Record<string, unknown> {
  const r = cut.outcome.result;
  if (r === null) return { scene: scene.id, refused: true };
  const perStock: Record<string, number> = {};
  for (const s of cut.sheets) perStock[s.stock] = (perStock[s.stock] ?? 0) + 1;
  return {
    scene: scene.id,
    qualifier: scene.qualifier,
    mode: scene.request.mode,
    partInPart: scene.request.partInPart,
    items: scene.request.items.length,
    pieces: scene.request.items.reduce((n, it) => n + it.qty, 0),
    sheets: r.sheets,
    perStock,
    packer: r.packer,
    ...(r.order === undefined ? {} : { order: r.order }),
    gap: r.gap,
    oversize: r.oversize,
    inside: r.placements.filter((p) => p.inside !== undefined).length,
    perSheet: cut.sheets.map((s, i) => ({ name: s.name, stock: s.stock, parts: s.drawing.parts.length, loops: s.loops, fillPercent: r.fill[i] })),
    layoutHash: r.layoutHash,
    ...(placements ? { placements: r.placements } : {}),
  };
}

export function build(geom: Geom, profile: ProfileLookup): SlugSheetsBuild {
  const scene = slugSheetsScene();
  const fillScene: SheetScene = { ...scene, request: { ...scene.request, mode: "fill", partInPart: true } };
  const complete = slugSheetsCompleteScene();
  const shelf = cutScene(geom, scene, profile);
  const fill = cutScene(geom, fillScene, profile);
  const full = cutScene(geom, complete, profile);
  const count = (cut: CutScene, check: string, verdict: string): number => cut.outcome.findings.filter((f) => f.check === check && f.finding.verdict === verdict).length;
  return {
    shelf,
    layout: {
      scene: scene.id,
      machine: scene.machine,
      kerfMode: scene.kerfMode,
      write: scene.write,
      sheet: scene.request.sheet,
      sources: scene.sources,
      legacyShelf: summary(scene, shelf, true),
      fill: summary(fillScene, fill, false),
      complete: { sources: complete.sources, ...summary(complete, full, false) },
    },
    artifacts: {
      dxf: Object.fromEntries(shelf.sheets.map((s) => [`${s.name}.dxf`, sha256Hex(s.dxf)])),
      "svg-cut": Object.fromEntries(shelf.sheets.map((s) => [`${s.name}.svg`, sha256Hex(s.svg)])),
    },
    findings: {
      scene: scene.id,
      checks: Object.fromEntries((["CHK-SHT-01", "CHK-SHT-02"] as const).map((c) => [c, { pass: count(shelf, c, "pass"), fail: count(shelf, c, "fail") }])),
      findings: shelf.outcome.findings.map((f) => ({ check: f.check, target: f.finding.target, verdict: f.finding.verdict, measured: f.finding.measured, constraint: f.finding.constraint })),
    },
  };
}
