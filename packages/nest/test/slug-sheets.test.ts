// M07-T07: SLUG's sheets out of nest. Every number is held to a source
// outside nest: the page's own nest() and placedLoops() evaluated from the
// pinned designs/slug/legacy/slug.html (extract-nest.mjs), the committed
// legacy record packages/nest/records/slug-legacy.json, and the 10 shipped
// DXF files in designs/slug/legacy/sheets/ (sha256 pinned in SHA256SUMS),
// read with a POLYLINE split written in this file. The written sheets are
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
import { slugPage, slugSheetControls, slugSheetsScene, SLUG_STOCKS } from "../scenes/slug-sheets.js";
import { SLUG_OMITTED, slugSheetsCompleteScene } from "../scenes/slug-sheets-complete.js";
// @ts-expect-error the legacy tool is plain JavaScript with no declarations
import { extract } from "../../../designs/slug/legacy/tools/extract-nest.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const OUT = path.join(ROOT, "packages/nest/test/out");
const SHEETS = path.join(ROOT, "designs/slug/legacy/sheets");
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

interface LegacyPart { name: string }
interface LegacySheet { parts: LegacyPart[] }
interface Legacy {
  OUTLINES: Record<string, number[][][]>;
  PART_QTY: Record<string, number>;
  ACRYLIC: Set<string>;
  nest: (names: string[], W: number, H: number, gap: number, margin: number) => LegacySheet[];
  placedLoops: (p: LegacyPart) => number[][][];
}
const legacyBody = (extract() as string).replace(/\nexport \{[^}]*\};\n$/, "\nreturn {OUTLINES,PART_QTY,ACRYLIC,nest,placedLoops};\n");
const S = new Function(legacyBody)() as Legacy;

/** The page's own nest() of a quantity table, ply then acrylic as buildSheets runs it (slug.html lines 1149 to 1153). */
function legacyNest(table: Record<string, number>): { stock: "ply" | "acrylic"; sheet: LegacySheet }[] {
  const qty = { ...table };
  const saved = { ...S.PART_QTY };
  for (const k of Object.keys(S.PART_QTY)) delete S.PART_QTY[k];
  Object.assign(S.PART_QTY, qty);
  try {
    const { sheet: [W, H], gap, margin } = slugSheetControls();
    const names = Object.keys(qty).filter((n) => S.OUTLINES[n]);
    return (["ply", "acrylic"] as const).flatMap((stock) =>
      S.nest(names.filter((n) => S.ACRYLIC.has(n) === (stock === "acrylic")), W, H, gap, margin).map((sheet) => ({ stock, sheet })));
  } finally {
    for (const k of Object.keys(S.PART_QTY)) delete S.PART_QTY[k];
    Object.assign(S.PART_QTY, saved);
  }
}

/** Closed rings of a DXF, split here: POLYLINE then VERTEX 10/20 (the legacy writer), or LWPOLYLINE 10/20 with the repeated first vertex dropped. */
function ringsOfDxf(text: string): number[][][] {
  const lines = text.split("\n").map((l) => l.trim());
  const rings: number[][][] = [];
  let ring: number[][] | null = null;
  let lw = false;
  let x: number | null = null;
  const close = (): void => {
    if (ring === null) return;
    const [a, b] = [ring[0], ring[ring.length - 1]];
    if (lw && ring.length > 1 && a![0] === b![0] && a![1] === b![1]) ring.pop();
    rings.push(ring);
    ring = null;
  };
  for (let i = 0; i + 1 < lines.length; i += 2) {
    const code = Number(lines[i]), value = lines[i + 1]!;
    if (code === 0) {
      if (value === "POLYLINE" || value === "LWPOLYLINE") { close(); ring = []; lw = value === "LWPOLYLINE"; continue; }
      if (value === "VERTEX") continue;
      close();
      continue;
    }
    if (ring === null) continue;
    if (code === 10) x = Number(value);
    else if (code === 20 && x !== null) { ring.push([x, Number(value)]); x = null; }
  }
  close();
  return rings;
}

/** A ring with every vertex equal to the one before it dropped, the closing wrap included. */
function distinct(ring: number[][]): number[][] {
  const out: number[][] = [];
  for (const p of ring) {
    const q = out[out.length - 1];
    if (q === undefined || q[0] !== p[0] || q[1] !== p[1]) out.push(p);
  }
  while (out.length > 1 && out[0]![0] === out[out.length - 1]![0] && out[0]![1] === out[out.length - 1]![1]) out.pop();
  return out;
}

/** Pairs every shipped ring with a written ring of the same length, vertex for vertex within tol; returns the worst delta, mm. */
function matchRings(shipped: number[][][], written: number[][][], tol: number): { unmatched: number; worst: number } {
  const used = new Set<number>();
  let unmatched = 0, worst = 0;
  for (const r of shipped) {
    let hit = -1, hitWorst = Infinity;
    written.forEach((w, k) => {
      if (hit >= 0 || used.has(k) || w.length !== r.length) return;
      let d = 0;
      for (let v = 0; v < r.length && d <= tol; v++) d = Math.max(d, Math.abs(r[v]![0]! - w[v]![0]!), Math.abs(r[v]![1]! - w[v]![1]!));
      if (d <= tol) { hit = k; hitWorst = d; }
    });
    if (hit < 0) unmatched++;
    else { used.add(hit); worst = Math.max(worst, hitWorst); }
  }
  return { unmatched, worst };
}

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

describe("scene slug-sheets (read from the pinned page)", () => {
  test("42 PART_QTY names and 63 pieces, stocks ply3 and acrylic3 by the ACRYLIC set", () => {
    const items = scene.request.items;
    expect(items).toHaveLength(record.result.partQty.names);
    expect(items.reduce((n, it) => n + it.qty, 0)).toBe(record.result.partQty.pieces);
    expect(items.map((it) => it.id)).toEqual(Object.keys(S.PART_QTY));
    // the scene reads the page as data; the page's own code, evaluated, must agree
    const page = slugPage();
    expect([page.PART_QTY, [...page.ACRYLIC].sort(), page.OUTLINES]).toEqual([{ ...S.PART_QTY }, [...S.ACRYLIC].sort(), S.OUTLINES]);
    expect(items.map((it) => it.rings)).toEqual(items.map((it) => S.OUTLINES[it.id]));
    for (const it of items) expect(it.stock).toBe(S.ACRYLIC.has(it.id) ? SLUG_STOCKS.acrylic : SLUG_STOCKS.ply);
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
  test("9 ply and 1 acrylic sheets, parts and loops per sheet equal the page's nest() and the record", () => {
    const ply = record.result.nest.ply, acr = record.result.nest.acrylic;
    const legacy = legacyNest(S.PART_QTY);
    const sheets = shelf.sheets;
    expect(sheets.map((s) => s.name)).toEqual([
      ...Array.from({ length: ply.sheets }, (_, i) => `slug-ply-sheet${i + 1}`),
      ...Array.from({ length: acr.sheets }, (_, i) => `slug-acrylic-sheet${i + 1}`),
    ]);
    expect([perStock(shelf, SLUG_STOCKS.ply).length, perStock(shelf, SLUG_STOCKS.acrylic).length]).toEqual([9, 1]);
    const parts = sheets.map((s) => s.drawing.parts.length);
    expect(parts).toEqual([...ply.partsPerSheet, ...acr.partsPerSheet]);
    expect(parts).toEqual(legacy.map((l) => l.sheet.parts.length));
    const loops = sheets.map((s) => s.loops);
    expect(loops).toEqual([...ply.loopsPerSheet, ...acr.loopsPerSheet]);
    expect(loops).toEqual([34, 26, 38, 97, 52, 38, 39, 89, 5, 6]);
    expect(loops).toEqual(legacy.map((l) => l.sheet.parts.reduce((n, p) => n + S.placedLoops(p).length, 0)));
    expect(shelf.outcome.result!.oversize).toEqual([]);
  });

  test("0 severed: CHK-SHT-01 and CHK-SHT-02 pass on all 42 parts", () => {
    const f = shelf.outcome.findings;
    expect(f.filter((x) => x.check === "CHK-SHT-01")).toHaveLength(42);
    expect(f.filter((x) => x.finding.verdict !== "pass")).toEqual([]);
    expect(shelf.outcome.beam).toBe(0);
  });

  test("each written sheet holds the shipped file's rings, vertex for vertex to 1e-3 mm, less the page's zero-length edges", () => {
    const legacy = legacyNest(S.PART_QTY);
    const dropped: number[] = [];
    shelf.sheets.forEach((s, i) => {
      const file = path.join(SHEETS, `${s.name.replace(/-/g, "_")}.dxf`);
      const bytes = readFileSync(file);
      expect(sha(bytes)).toBe(record.inputs[path.relative(ROOT, file)]);
      const raw = ringsOfDxf(bytes.toString("utf8"));
      const shipped = raw.map(distinct);
      const written = ringsOfDxf(s.dxf);
      expect(written.length, s.name).toBe(raw.length);
      const m = matchRings(shipped, written, 1e-3);
      expect(m.unmatched, s.name).toBe(0);
      expect(m.worst).toBeLessThanOrEqual(1e-3);
      // the writer drops a vertex equal to the one before it; the page's placed loops say how many there are
      const zero = legacy[i]!.sheet.parts.flatMap((p) => S.placedLoops(p)).reduce((n, l) => n + l.length - distinct(l).length, 0);
      dropped.push(raw.reduce((n, r) => n + r.length, 0) - written.reduce((n, r) => n + r.length, 0));
      expect(dropped[i], s.name).toBe(zero);
    });
    // pinion ring 4 (4 each, 2 copies) on ply sheet 4; rotor_gear_a and _b outer rings (80 each) on ply sheet 8
    expect(dropped).toEqual([0, 0, 0, 8, 0, 0, 0, 160, 0, 0]);
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
  test("adds the four omitted outlines; legacy-shelf equals the page's nest() on the same table", () => {
    const complete = slugSheetsCompleteScene();
    const qty = { ...S.PART_QTY, ...SLUG_OMITTED };
    expect(complete.request.items.map((it) => it.id)).toEqual(Object.keys(qty));
    const cut = cutScene(geom, complete, profile);
    expect(cut.outcome.findings.filter((x) => x.finding.verdict !== "pass")).toEqual([]);
    const legacy = legacyNest(qty);
    expect(cut.sheets.map((s) => s.drawing.parts.length)).toEqual(legacy.map((l) => l.sheet.parts.length));
    expect(cut.sheets.map((s) => s.stock)).toEqual(legacy.map((l) => SLUG_STOCKS[l.stock]));
    expect(cut.sheets.map((s) => s.loops)).toEqual(legacy.map((l) => l.sheet.parts.reduce((n, p) => n + S.placedLoops(p).length, 0)));
    const acr = perStock(cut, SLUG_STOCKS.acrylic);
    expect(acr.length).toBe(record.result.acrylicWithDoorFlapAndWindow.sheets);
    expect(acr.map((s) => s.drawing.parts.length)).toEqual(record.result.acrylicWithDoorFlapAndWindow.partsPerSheet);
  });
});
