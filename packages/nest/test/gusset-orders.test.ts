// M07-T03 GUSSET sort orders: GUSSET's nest() and nestOnce(), evaluated
// from the pinned legacy page (designs/gusset/legacy/gusset-10.html lines
// 1264 to 1313, with the five comparators of lines 1265 to 1271), on the
// OGEE16 R16 lasercut footprints (183 pieces; committed record
// packages/nest/records/ogee16-cut-footprints.json, written by
// designs/ogee16/legacy/tools/footprint-record.py from cutfiles.py), against
// nest's MaxRects in fill mode. The sheet and gap are the record's
// (cutfiles.py SHEET_W, SHEET_H, GAP); margin 0.
//
// GUSSET's free root is its bin plus one gap, nest's is the sheet inset by
// the margin less one gap (OGEE packOne), so GUSSET runs on a bin of
// W - 2 margin - 2 gap and both see the same free rectangles.
//
// nest carries packOne's exact fit test; GUSSET's find() accepts a fit
// within 1e-6 mm. On this set that changes the height order from 2 sheets
// to 3 (computed), and nothing else the card asks for: the bin count and
// the winning order agree.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import type { NestItem, NestRequest, SortOrder } from "@hackbuild/spec";
import { ORDER_LIST } from "../src/maxrects.js";
import { nest } from "../src/sheet-loop.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const PAGE = path.join(ROOT, "designs/gusset/legacy/gusset-10.html");

interface GItem { id: string; w: number; h: number; key: string }
interface GBin { placed: { it: GItem; x: number; y: number; rot: boolean }[] }
interface GResult { bins: GBin[]; oversize: GItem[] }
type Cmp = (a: GItem, b: GItem) => number;
interface Gusset {
  nest: (items: GItem[], W: number, H: number, gap: number, allowRot: boolean) => GResult;
  nestOnce: (items: GItem[], W: number, H: number, gap: number, allowRot: boolean, cmp: Cmp) => GResult;
  orders: Cmp[];
}

const FIND_SLACK = "if (ww <= f.w + 1e-6 && hh <= f.h + 1e-6) {";

/** GUSSET from the pinned page; `exact` drops the 1e-6 mm slack of find() (line 1285), the one line nest does not carry. */
function pinnedLegacy(exact = false): Gusset {
  const bytes = readFileSync(PAGE);
  const sums = readFileSync(path.join(ROOT, "designs/gusset/legacy/SHA256SUMS"), "utf8");
  const pin = sums.match(/^([0-9a-f]{64}) {2}gusset-10\.html$/m)?.[1];
  expect(createHash("sha256").update(bytes).digest("hex")).toBe(pin);
  const lines = bytes.toString("utf8").split("\n");
  const at = (text: string): number => lines.findIndex((l) => l.startsWith(text)) + 1;
  expect([at("function nest(items, W, H, gap, allowRot) {"), at("  const orders = ["), at("function nestOnce("), at("function laserItems(")]).toEqual([1264, 1265, 1276, 1315]);
  expect(lines[1271 - 1]!.trim()).toBe("];");
  expect(lines[1285 - 1]!.trim()).toBe(FIND_SLACK);
  let fns = lines.slice(1264 - 1, 1314 - 1).join("\n");
  if (exact) fns = fns.replace(FIND_SLACK, "if (ww <= f.w && hh <= f.h) {");
  const orders = lines.slice(1265 - 1, 1271).join("\n");
  return new Function(`${fns}\n${orders}\nreturn {nest, nestOnce, orders};`)() as Gusset;
}

const record = JSON.parse(readFileSync(path.join(ROOT, "packages/nest/records/ogee16-cut-footprints.json"), "utf8")) as {
  result: { params: { sheetW: number; sheetH: number; gap: number }; parts: { id: string; qty: number; w: number; h: number }[]; pieces: number };
};
const { sheetW: W, sheetH: H, gap: GAP } = record.result.params;
const MARGIN = 0;
const G = pinnedLegacy();
const gItems: GItem[] = record.result.parts.flatMap((p) => Array.from({ length: p.qty }, () => ({ id: p.id, w: p.w, h: p.h, key: "all" })));
const items: NestItem[] = record.result.parts.map((p) => ({ id: p.id, rings: [[[0, 0], [p.w, 0], [p.w, p.h], [0, p.h]]], qty: p.qty, stock: "ply3" }));
const request: NestRequest = {
  items, sheet: [W, H], margin: MARGIN, gap: GAP, mode: "fill", rotations: [0, 90], partInPart: false, seed: 0, packer: "maxrects-bssf",
};
const GW = W - 2 * MARGIN - 2 * GAP, GH = H - 2 * MARGIN - 2 * GAP;

describe("GUSSET five sort orders on the OGEE16 R16 lasercut set (computed)", () => {
  test("183 pieces, the record's count", () => {
    expect(gItems.length).toBe(record.result.pieces);
    expect(gItems.length).toBe(183);
  });

  test("bins per order: GUSSET nestOnce() gives 2, 2, 2, 2, 3; nest gives 2, 2, 3, 2, 3", () => {
    const legacy = G.orders.map((cmp) => G.nestOnce(gItems, GW, GH, GAP, true, cmp).bins.length);
    const port = ORDER_LIST.map((order: SortOrder) => nest({ ...request, order }).sheets);
    expect(legacy).toEqual([2, 2, 2, 2, 3]);
    expect(port).toEqual([2, 2, 3, 2, 3]);
  });

  test("the height order differs by GUSSET's 1e-6 mm fit slack: without it GUSSET's counts equal nest's order by order", () => {
    const X = pinnedLegacy(true);
    const exact = X.orders.map((cmp) => X.nestOnce(gItems, GW, GH, GAP, true, cmp).bins.length);
    expect(exact).toEqual(ORDER_LIST.map((order) => nest({ ...request, order }).sheets));
  });

  test("bin count and winning order equal GUSSET nest(): 2 sheets, maxSide", () => {
    const best = G.nest(gItems, GW, GH, GAP, true);
    const counts = G.orders.map((cmp) => G.nestOnce(gItems, GW, GH, GAP, true, cmp).bins.length);
    const winner = ORDER_LIST[counts.indexOf(Math.min(...counts))];
    const port = nest(request);
    expect([port.sheets, port.order]).toEqual([best.bins.length, winner]);
    expect([port.sheets, port.order]).toEqual([2, "maxSide"]);
    expect(port.oversize).toEqual([]);
  });
});
