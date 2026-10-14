// M07-T03 properties of nest() over generated requests (fast-check 4.10.2,
// seed and run count below): no two footprints on a sheet overlap or come
// closer than the gap, every footprint sits inside the margin, every copy
// is placed exactly once or its item is listed oversize and truly fits no
// allowed turn, one request gives one layoutHash, and fill mode never uses
// more sheets than legacy-shelf. The expected values come from the request,
// never from the packers.

import fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { NestItem, NestRequest, NestResult, QuarterTurn } from "@hackbuild/spec";
import { extentOf } from "../src/box.js";
import { nest } from "../src/sheet-loop.js";

const SEED = 20261008;
const RUNS = 1000;
const EPS = 1e-9;

const rect = (x0: number, y0: number, w: number, h: number): NestItem["rings"] => [[[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]]];
const ell = (x0: number, y0: number, w: number, h: number): NestItem["rings"] => [
  [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h / 2], [x0 + w / 2, y0 + h / 2], [x0 + w / 2, y0 + h], [x0, y0 + h]],
];

const len = fc.double({ min: 1, max: 320, noNaN: true, noDefaultInfinity: true });
const itemArb = fc.record({
  shape: fc.constantFrom("rect", "ell"),
  x0: fc.double({ min: -50, max: 50, noNaN: true, noDefaultInfinity: true }),
  y0: fc.double({ min: -50, max: 50, noNaN: true, noDefaultInfinity: true }),
  w: len,
  h: len,
  qty: fc.integer({ min: 0, max: 6 }),
  stock: fc.constantFrom("ply3", "acrylic3"),
});

const requestArb = fc.record({
  items: fc.array(itemArb, { minLength: 1, maxLength: 6 }),
  W: fc.double({ min: 40, max: 400, noNaN: true, noDefaultInfinity: true }),
  H: fc.double({ min: 40, max: 400, noNaN: true, noDefaultInfinity: true }),
  margin: fc.double({ min: 0, max: 12, noNaN: true, noDefaultInfinity: true }),
  gap: fc.oneof({ weight: 9, arbitrary: fc.double({ min: 0, max: 8, noNaN: true, noDefaultInfinity: true }) }, { weight: 1, arbitrary: fc.constant("auto" as const) }),
  mode: fc.constantFrom("fill" as const, "legacy-shelf" as const),
  packer: fc.constantFrom(undefined, "maxrects-bssf" as const, "shelf" as const),
  order: fc.constantFrom(undefined, "maxSide" as const, "area" as const, "height" as const, "width" as const, "minSide" as const),
  groupBy: fc.constantFrom(undefined, "stock" as const, "type" as const),
  rotations: fc.subarray([0, 90, 180, 270] as QuarterTurn[], { minLength: 1 }),
}).map((r): NestRequest => {
  const shelfOnly = r.mode === "legacy-shelf" || r.packer === "shelf";
  return {
    items: r.items.map((it, i) => ({ id: `p${i}`, rings: (it.shape === "rect" ? rect : ell)(it.x0, it.y0, it.w, it.h), qty: it.qty, stock: it.stock })),
    sheet: [r.W, r.H], margin: r.margin, gap: r.gap, mode: r.mode, rotations: r.rotations, partInPart: false, seed: 0,
    ...(r.mode === "fill" && r.packer !== undefined ? { packer: r.packer } : {}),
    ...(!shelfOnly && r.order !== undefined ? { order: r.order } : {}),
    ...(r.groupBy === undefined ? {} : { groupBy: r.groupBy }),
  };
});

interface Foot { sheet: number; x0: number; y0: number; x1: number; y1: number }

function footprints(req: NestRequest, res: NestResult): Foot[] {
  const byId = new Map(req.items.map((it) => [it.id, extentOf(it.rings)]));
  return res.placements.map((p) => {
    const e = byId.get(p.id)!;
    const [w, h] = p.rot === 90 || p.rot === 270 ? [e.h, e.w] : [e.w, e.h];
    return { sheet: p.sheet, x0: p.at[0], y0: p.at[1], x1: p.at[0] + w, y1: p.at[1] + h };
  });
}

/** Whether a w x h footprint fits the request in some allowed turn under the winning packer's own rule. */
function fitsSomeTurn(req: NestRequest, res: NestResult, w: number, h: number): boolean {
  const [W, H] = req.sheet;
  const g = res.gap;
  return req.rotations.some((r) => {
    const [a, b] = r === 90 || r === 270 ? [h, w] : [w, h];
    return res.packer === "shelf"
      ? a <= W - 2 * req.margin + 1e-6 && b <= H - 2 * req.margin + 1e-6
      : a + g <= W - 2 * req.margin - g && b + g <= H - 2 * req.margin - g;
  });
}

const seen = { runs: 0, oversize: 0, multiSheet: 0, auto: 0, fillAgainstShelf: 0, placements: 0 };

function check(req: NestRequest): void {
  const res = nest(req);
  seen.runs++;
  if (res.oversize.length) seen.oversize++;
  if (res.sheets > 1) seen.multiSheet++;
  if (req.gap === "auto") seen.auto++;
  seen.placements += res.placements.length;
  const [W, H] = req.sheet;
  const feet = footprints(req, res);
  // inside the margin
  for (const f of feet) {
    expect(f.x0).toBeGreaterThanOrEqual(req.margin - EPS);
    expect(f.y0).toBeGreaterThanOrEqual(req.margin - EPS);
    expect(f.x1).toBeLessThanOrEqual(W - req.margin + 1e-6);
    expect(f.y1).toBeLessThanOrEqual(H - req.margin + 1e-6);
    expect(f.sheet).toBeGreaterThanOrEqual(0);
    expect(f.sheet).toBeLessThan(res.sheets);
  }
  // no overlap, and at least the gap apart on one axis
  for (let i = 0; i < feet.length; i++) {
    for (let j = i + 1; j < feet.length; j++) {
      const a = feet[i]!, b = feet[j]!;
      if (a.sheet !== b.sheet) continue;
      const dx = Math.max(b.x0 - a.x1, a.x0 - b.x1), dy = Math.max(b.y0 - a.y1, a.y0 - b.y1);
      expect(Math.max(dx, dy)).toBeGreaterThanOrEqual(res.gap - 1e-6);
    }
  }
  // every copy placed once, or the item listed oversize and fitting no turn
  for (const it of req.items) {
    const copies = res.placements.filter((p) => p.id === it.id).map((p) => p.copy).sort((a, b) => a - b);
    const e = extentOf(it.rings);
    if (res.oversize.includes(it.id)) {
      expect(copies).toEqual([]);
      expect(fitsSomeTurn(req, res, e.w, e.h)).toBe(false);
    } else {
      expect(copies).toEqual(Array.from({ length: it.qty }, (_, i) => i));
    }
  }
  // no empty sheet, one fill entry per sheet
  for (let s = 0; s < res.sheets; s++) expect(feet.some((f) => f.sheet === s)).toBe(true);
  expect(res.fill.length).toBe(res.sheets);
  if (req.gap === "auto") expect(Number.isInteger(res.gap) && res.gap >= 2 && res.gap <= 16).toBe(true);
  else expect(res.gap).toBe(req.gap);
  // one request, one hash
  const again = nest(req);
  expect(again.layoutHash).toBe(res.layoutHash);
  expect(again).toEqual(res);
  // fill never uses more sheets than legacy-shelf
  if (req.mode === "fill" && req.packer === undefined && req.order === undefined) {
    const shelf = nest({ ...req, mode: "legacy-shelf" });
    expect(res.sheets).toBeLessThanOrEqual(shelf.sheets);
    expect(res.oversize).toEqual(shelf.oversize);
    seen.fillAgainstShelf++;
  }
}

describe("nest properties (fast-check)", () => {
  test(`${RUNS} generated requests, seed ${SEED}`, () => {
    fc.assert(fc.property(requestArb, (req) => check(req)), { seed: SEED, numRuns: RUNS });
    // the generator reaches every branch the properties guard
    expect(seen.runs).toBe(RUNS);
    for (const k of ["oversize", "multiSheet", "auto", "fillAgainstShelf"] as const) expect(seen[k], k).toBeGreaterThan(20);
    expect(seen.placements).toBeGreaterThan(RUNS);
  }, 240_000);

  test("a change to one placement changes layoutHash", () => {
    const req: NestRequest = {
      items: [{ id: "a", rings: rect(0, 0, 50, 20), qty: 3, stock: "ply3" }], sheet: [200, 100], margin: 5, gap: 2,
      mode: "fill", rotations: [0, 90], partInPart: false, seed: 0,
    };
    const res = nest(req);
    const moved = nest({ ...req, margin: 6 });
    expect(moved.layoutHash).not.toBe(res.layoutHash);
    expect(res.layoutHash).toMatch(/^[0-9a-f]{64}$/);
  });
});
