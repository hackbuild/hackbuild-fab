// M07-T07: SLUG's sheets out of nest. Every number is held to a source
// outside nest: the committed legacy record
// packages/nest/records/slug-legacy.json (the page's own nest() and
// placedLoops()) here, and in slug-sheets-originals.test.ts the page's code
// evaluated from the original slug.html (extract-nest.mjs) and the 10
// shipped DXF files of the original, read with a POLYLINE split. The written sheets are
// committed in test/out (HBF_DXF_RECORD=1 rewrites them), where
// packages/checks reads them for CHK-SHT-03 and tools/py/audit_dxf.py
// reloads them with ezdxf.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, test } from "vitest";
import type { ProfileLookup } from "@hackbuild/spec";
import { loadGeom, type Geom } from "@hackbuild/geom";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { cutScene, type CutScene, type CutSheet, type SheetScene } from "../src/scene.js";
import { slugPage, slugSheetsScene, SLUG_STOCKS } from "../scenes/slug-sheets.js";
import { SLUG_OMITTED, slugSheetsCompleteScene } from "../scenes/slug-sheets-complete.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const OUT = path.join(ROOT, "packages/nest/test/out");
const RECORD = process.env.HBF_DXF_RECORD === "1";
const sha = (s: string | Buffer): string => createHash("sha256").update(s).digest("hex");

interface StockRecord { sheets: number; oversize: string[]; partsPerSheet: number[]; loopsPerSheet: number[]; fillPercent: number[] }
const record = JSON.parse(readFileSync(path.join(ROOT, "packages/nest/records/slug-legacy.json"), "utf8")) as {
  inputs: Record<string, string>;
  result: {
    params: { sheetW: number; sheetH: number; gap: number; margin: number };
    partQty: { names: number; pieces: number };
    nest: { ply: StockRecord; acrylic: StockRecord };
    acrylicWithDoorFlapAndWindow: { sheets: number; partsPerSheet: number[] };
  };
};

const fillRecord = JSON.parse(readFileSync(path.join(ROOT, "packages/nest/records/slug-fill.json"), "utf8")) as {
  result: { on: { layoutHash: string; sheets: { ply: number; acrylic: number } } };
};

/** Compare with, or under HBF_DXF_RECORD=1 write, a committed file in test/out. */
function golden(name: string, text: string): void {
  const file = path.join(OUT, name);
  if (RECORD) {
    mkdirSync(OUT, { recursive: true });
    writeFileSync(file, text);
    return;
  }
  expect(existsSync(file), `${name} is not committed; run with HBF_DXF_RECORD=1 once the asserts hold`).toBe(true);
  expect(sha(text), `${name} moved`).toBe(sha(readFileSync(file, "utf8")));
}

const perStock = (cut: CutScene, stock: string): CutSheet[] => cut.sheets.filter((s) => s.stock === stock);

let geom: Geom;
let profile: ProfileLookup;
let scene: SheetScene;
let shelf: CutScene;
beforeAll(async () => {
  geom = await loadGeom();
  profile = createProfileLookup(loadProfile());
  scene = slugSheetsScene();
  shelf = cutScene(geom, scene, profile);
});

describe("scene slug-sheets (read from the stored page lines)", () => {
  test("42 PART_QTY names and 63 pieces, stocks ply3 and acrylic3 by the ACRYLIC set", () => {
    const items = scene.request.items;
    expect(items).toHaveLength(record.result.partQty.names);
    expect(items.reduce((n, it) => n + it.qty, 0)).toBe(record.result.partQty.pieces);
    const page = slugPage();
    expect(items.map((it) => it.id)).toEqual(Object.keys(page.PART_QTY));
    expect(items.map((it) => it.rings)).toEqual(items.map((it) => page.OUTLINES[it.id]));
    for (const it of items) expect(it.stock).toBe(page.ACRYLIC.has(it.id) ? SLUG_STOCKS.acrylic : SLUG_STOCKS.ply);
    for (const id of [SLUG_STOCKS.ply, SLUG_STOCKS.acrylic]) expect(profile.material(id).processes).toContain("laser");
  });

  test("sheet, gap and margin are the page's controls, equal to the record and to the sheet600 envelope", () => {
    const { sheetW, sheetH, gap, margin } = record.result.params;
    expect([scene.request.sheet, scene.request.gap, scene.request.margin]).toEqual([[sheetW, sheetH], gap, margin]);
    const env = profile.machine(scene.machine).envelope;
    expect("sheet" in env ? [...env.sheet] : null).toEqual([sheetW, sheetH]);
    expect([scene.kerfMode, scene.request.mode, scene.request.rotations, scene.write.arcs]).toEqual(["none", "legacy-shelf", [0, 90], false]);
  });
});

describe("legacy-shelf: the shipped layout (computed)", () => {
  test("9 ply and 1 acrylic sheets, parts and loops per sheet equal the record of the page's nest()", () => {
    const ply = record.result.nest.ply, acr = record.result.nest.acrylic;
    const sheets = shelf.sheets;
    expect(sheets.map((s) => s.name)).toEqual([
      ...Array.from({ length: ply.sheets }, (_, i) => `slug-ply-sheet${i + 1}`),
      ...Array.from({ length: acr.sheets }, (_, i) => `slug-acrylic-sheet${i + 1}`),
    ]);
    expect([perStock(shelf, SLUG_STOCKS.ply).length, perStock(shelf, SLUG_STOCKS.acrylic).length]).toEqual([9, 1]);
    const parts = sheets.map((s) => s.drawing.parts.length);
    expect(parts).toEqual([...ply.partsPerSheet, ...acr.partsPerSheet]);
    const loops = sheets.map((s) => s.loops);
    expect(loops).toEqual([...ply.loopsPerSheet, ...acr.loopsPerSheet]);
    expect(loops).toEqual([34, 26, 38, 97, 52, 38, 39, 89, 5, 6]);
    expect(shelf.outcome.result!.oversize).toEqual([]);
  });

  test("0 severed: CHK-SHT-01 and CHK-SHT-02 pass on all 42 parts", () => {
    const f = shelf.outcome.findings;
    expect(f.filter((x) => x.check === "CHK-SHT-01")).toHaveLength(42);
    expect(f.filter((x) => x.finding.verdict !== "pass")).toEqual([]);
    expect(shelf.outcome.beam).toBe(0);
  });

  test("the written sheets equal the committed files in test/out", () => {
    for (const s of shelf.sheets) {
      golden(`${s.name}.dxf`, s.dxf);
      golden(`${s.name}.svg`, s.svg);
    }
  });

  test("two runs give one layoutHash and the same bytes", () => {
    const again = cutScene(geom, slugSheetsScene(), profile);
    expect(again.outcome.result!.layoutHash).toBe(shelf.outcome.result!.layoutHash);
    expect(again.sheets.map((s) => sha(s.dxf))).toEqual(shelf.sheets.map((s) => sha(s.dxf)));
  });
});

describe("fill mode with part-in-part (computed)", () => {
  test("declared expectation (D-074): at most 9 ply and 1 acrylic sheets", () => {
    const fill = cutScene(geom, { ...scene, request: { ...scene.request, mode: "fill", partInPart: true } }, profile);
    expect(fill.outcome.result!.oversize).toEqual([]);
    expect(perStock(fill, SLUG_STOCKS.ply).length).toBeLessThanOrEqual(9);
    expect(perStock(fill, SLUG_STOCKS.acrylic).length).toBeLessThanOrEqual(1);
    // the M07-T05 record of the same request: the shelf candidate wins and part-in-part saves no sheet
    expect(fill.outcome.result!.layoutHash).toBe(fillRecord.result.on.layoutHash);
    expect([perStock(fill, SLUG_STOCKS.ply).length, perStock(fill, SLUG_STOCKS.acrylic).length]).toEqual([fillRecord.result.on.sheets.ply, fillRecord.result.on.sheets.acrylic]);
  });
});

describe("scene slug-sheets-complete (informational)", () => {
  test("adds the four omitted outlines; the acrylic sheet equals the record", () => {
    const complete = slugSheetsCompleteScene();
    const qty = { ...slugPage().PART_QTY, ...SLUG_OMITTED };
    expect(complete.request.items.map((it) => it.id)).toEqual(Object.keys(qty));
    const cut = cutScene(geom, complete, profile);
    expect(cut.outcome.findings.filter((x) => x.finding.verdict !== "pass")).toEqual([]);
    const acr = perStock(cut, SLUG_STOCKS.acrylic);
    expect(acr.length).toBe(record.result.acrylicWithDoorFlapAndWindow.sheets);
    expect(acr.map((s) => s.drawing.parts.length)).toEqual(record.result.acrylicWithDoorFlapAndWindow.partsPerSheet);
  });
});
