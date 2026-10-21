// M07-T03 shelf parity: SLUG's own nest() and placedLoops(), extracted from
// the pinned designs/slug/legacy/slug.html by the M07-T01 tool, against
// nest's legacy-shelf mode. Items, quantities, stocks, sheet, gap and margin
// all come from the page and its committed record
// (packages/nest/records/slug-legacy.json); nothing here is typed from the
// port.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import type { NestItem, NestRequest, Ring } from "@hackbuild/spec";
import { placeRings } from "../src/box.js";
import { nest } from "../src/sheet-loop.js";
// @ts-expect-error the legacy tool is plain JavaScript with no declarations
import { extract } from "../../../designs/slug/extract/extract-nest.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const record = JSON.parse(readFileSync(path.join(ROOT, "packages/nest/records/slug-legacy.json"), "utf8")) as {
  result: { params: { sheetW: number; sheetH: number; gap: number; margin: number }; nest: Record<"ply" | "acrylic", { sheets: number; partsPerSheet: number[] }> };
};

interface LegacyPart { name: string; e: { x0: number; y0: number; w: number; h: number }; rot: 0 | 90; x: number; y: number }
interface LegacySheet { parts: LegacyPart[] }
interface Legacy {
  OUTLINES: Record<string, number[][][]>;
  PART_QTY: Record<string, number>;
  ACRYLIC: Set<string>;
  nest: (names: string[], W: number, H: number, gap: number, margin: number) => LegacySheet[];
  placedLoops: (p: LegacyPart) => number[][][];
}

const body = (extract() as string).replace(/\nexport \{[^}]*\};\n$/, "\nreturn {OUTLINES,PART_QTY,ACRYLIC,nest,placedLoops};\n");
const S = new Function(body)() as Legacy;
const { sheetW: W, sheetH: H, gap: GAP, margin: MARGIN } = record.result.params;
const STOCKS = ["ply", "acrylic"] as const;
const stockOf = (name: string): (typeof STOCKS)[number] => (S.ACRYLIC.has(name) ? "acrylic" : "ply");

const names = Object.keys(S.PART_QTY).filter((n) => S.OUTLINES[n]);
const items: NestItem[] = names.map((n) => ({ id: n, rings: S.OUTLINES[n] as unknown as Ring[], qty: S.PART_QTY[n]!, stock: stockOf(n) }));
const request: NestRequest = {
  items, sheet: [W, H], margin: MARGIN, gap: GAP, mode: "legacy-shelf", rotations: [0, 90], partInPart: false, seed: 0,
};

// The page nests ply then acrylic, each from sheet 1; nest numbers sheets
// across stocks in order of first appearance, and ply comes first.
const legacySheets = STOCKS.flatMap((k) => S.nest(names.filter((n) => stockOf(n) === k), W, H, GAP, MARGIN));
const port = nest(request);

describe("SLUG shelf parity (computed)", () => {
  test("the stocks appear ply first, so global sheet numbers line up", () => {
    expect(stockOf(names[0]!)).toBe("ply");
  });

  test("sheet counts and parts per sheet equal the page and the committed record", () => {
    const perSheet = legacySheets.map((s) => s.parts.length);
    const recorded = [...record.result.nest.ply.partsPerSheet, ...record.result.nest.acrylic.partsPerSheet];
    expect(perSheet).toEqual(recorded);
    expect(port.sheets).toBe(legacySheets.length);
    expect(port.sheets).toBe(record.result.nest.ply.sheets + record.result.nest.acrylic.sheets);
    const ported = Array.from({ length: port.sheets }, (_, i) => port.placements.filter((p) => p.sheet === i).length);
    expect(ported).toEqual(perSheet);
    expect(port.oversize).toEqual([]);
    expect(port.packer).toBe("shelf");
  });

  test("every placement's (sheet, id, x, y, rot) equals the page in placement order to 1e-9 mm", () => {
    let k = 0;
    legacySheets.forEach((sh, si) => {
      for (const lp of sh.parts) {
        const p = port.placements[k++]!;
        expect([p.sheet, p.id, p.rot]).toEqual([si, lp.name, lp.rot]);
        expect(Math.abs(p.at[0] - lp.x)).toBeLessThanOrEqual(1e-9);
        expect(Math.abs(p.at[1] - lp.y)).toBeLessThanOrEqual(1e-9);
      }
    });
    expect(k).toBe(port.placements.length);
  });

  test("placed rings equal the page's placedLoops vertex for vertex to 1e-9 mm", () => {
    let k = 0, vertices = 0;
    for (const sh of legacySheets) {
      for (const lp of sh.parts) {
        const p = port.placements[k++]!;
        const mine = placeRings(S.OUTLINES[p.id] as unknown as Ring[], p.at, p.rot);
        const theirs = S.placedLoops(lp);
        expect(mine.length).toBe(theirs.length);
        mine.forEach((ring, r) => ring.forEach(([x, y], v) => {
          expect(Math.abs(x - theirs[r]![v]![0]!)).toBeLessThanOrEqual(1e-9);
          expect(Math.abs(y - theirs[r]![v]![1]!)).toBeLessThanOrEqual(1e-9);
          vertices++;
        }));
      }
    }
    expect(vertices).toBeGreaterThan(0);
  });

  test("copies of one part are numbered 0 to qty - 1 exactly once", () => {
    for (const it of items) {
      const copies = port.placements.filter((p) => p.id === it.id).map((p) => p.copy).sort((a, b) => a - b);
      expect(copies).toEqual(Array.from({ length: it.qty }, (_, i) => i));
    }
  });

  test("fill mode never uses more sheets than legacy-shelf on the same items", () => {
    const fill = nest({ ...request, mode: "fill" });
    expect(fill.sheets).toBeLessThanOrEqual(port.sheets);
    expect(fill.oversize).toEqual([]);
  });
});
