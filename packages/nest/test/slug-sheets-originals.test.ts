// M07-T07: SLUG's sheets against the page's own code and its shipped files.
// The page's nest() and placedLoops() are evaluated from the original
// slug.html by designs/slug/extract/extract-nest.mjs, and the 10 shipped
// DXF files are read from the original's files/sheets/, both through
// tools/test-support/originals-root.ts, so this file runs on the owner
// runner (.github/scripts/owner-files.mjs) and never skips. The DXF rings
// are read with a POLYLINE split written in this file. slug-sheets.test.ts
// holds the rest to the committed record.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, test } from "vitest";
import type { ProfileLookup } from "@hackbuild/spec";
import { loadGeom, type Geom } from "@hackbuild/geom";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { localOriginal } from "../../../tools/test-support/originals-root.js";
import { cutScene, type CutScene } from "../src/scene.js";
import { slugPage, slugSheetControls, slugSheetsScene, SLUG_STOCKS } from "../scenes/slug-sheets.js";
import { SLUG_OMITTED, slugSheetsCompleteScene } from "../scenes/slug-sheets-complete.js";
// @ts-expect-error the extraction tool is plain JavaScript with no declarations
import { extract } from "../../../designs/slug/extract/extract-nest.mjs";

const SHEETS = "fab-knowledge:originals/slug/files/sheets";
const sha = (s: string | Buffer): string => createHash("sha256").update(s).digest("hex");
const record = JSON.parse(readFileSync(new URL("../records/slug-legacy.json", import.meta.url), "utf8")) as { inputs: Record<string, string> };

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


let geom: Geom;
let profile: ProfileLookup;
let shelf: CutScene;
beforeAll(async () => {
  geom = await loadGeom();
  profile = createProfileLookup(loadProfile());
  shelf = cutScene(geom, slugSheetsScene(), profile);
});

describe("scene slug-sheets against the page's code", () => {
  test("the stored lines the scene parses equal the page's own code, evaluated", () => {
    const page = slugPage();
    expect([page.PART_QTY, [...page.ACRYLIC].sort(), page.OUTLINES]).toEqual([{ ...S.PART_QTY }, [...S.ACRYLIC].sort(), S.OUTLINES]);
  });
});

describe("legacy-shelf: the shipped layout (computed)", () => {
  test("parts and loops per sheet equal the page's nest()", () => {
    const legacy = legacyNest(S.PART_QTY);
    expect(shelf.sheets.map((s) => s.drawing.parts.length)).toEqual(legacy.map((l) => l.sheet.parts.length));
    expect(shelf.sheets.map((s) => s.loops)).toEqual(legacy.map((l) => l.sheet.parts.reduce((n, p) => n + S.placedLoops(p).length, 0)));
  });

  test("each written sheet holds the shipped file's rings, vertex for vertex to 1e-3 mm, less the page's zero-length edges", () => {
    const legacy = legacyNest(S.PART_QTY);
    const dropped: number[] = [];
    shelf.sheets.forEach((s, i) => {
      const name = `${s.name.replace(/-/g, "_")}.dxf`;
      const bytes = readFileSync(localOriginal(`${SHEETS}/${name}`));
      // the record names each shipped sheet by the folder it was read from when written; its sha256 is the identity
      const key = Object.keys(record.inputs).find((k) => k.endsWith(`sheets/${name}`));
      expect(sha(bytes)).toBe(record.inputs[key!]);
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

});

describe("scene slug-sheets-complete (informational)", () => {
  test("legacy-shelf equals the page's nest() on the same table", () => {
    const cut = cutScene(geom, slugSheetsCompleteScene(), profile);
    const legacy = legacyNest({ ...S.PART_QTY, ...SLUG_OMITTED });
    expect(cut.sheets.map((s) => s.drawing.parts.length)).toEqual(legacy.map((l) => l.sheet.parts.length));
    expect(cut.sheets.map((s) => s.stock)).toEqual(legacy.map((l) => SLUG_STOCKS[l.stock]));
    expect(cut.sheets.map((s) => s.loops)).toEqual(legacy.map((l) => l.sheet.parts.reduce((n, p) => n + S.placedLoops(p).length, 0)));
  });
});
