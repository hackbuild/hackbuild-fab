// M07-T05 part-in-part. Every containment claim is proven here on polygons
// built from the placed rings with the even-odd rule, so no hole
// classification of the port is reused: an inner part's outline less its
// host's holes has zero area, it keeps the gap from every edge of its host,
// and no two parts on a sheet share area. The card fixes the frame fixture
// (200 x 200 frame, 150 x 150 hole, sixteen 30 x 30 squares, 220 x 220
// sheet, margin 0, gap 4, 1 sheet against 2). The SLUG items, quantities,
// stocks, sheet, gap and margin come from the page and its committed record;
// the sheet counts of SLUG fill mode with and without part-in-part are held
// to packages/nest/records/slug-fill.json, which
// HBF_SLUG_FILL_RECORD=1 npm test -w packages/nest -- part-in-part rewrites.

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cpus } from "node:os";
import { beforeAll, describe, expect, test } from "vitest";
import { canonicalize, isThrownCommandError, sha256Hex, type NestItem, type NestRequest, type NestResult, type Placement, type Ring } from "@hackbuild/spec";
import { loadGeom, pointSegmentDistance, ringArea2, type Geom, type Section } from "@hackbuild/geom";
import { placeRings } from "../src/box.js";
import { nest, nestTrials, type Trial } from "../src/sheet-loop.js";
import { composePlacement, cutOrder, innerTurns, keyOf, nestHoles, ringsById } from "../src/part-in-part.js";
import { extentOf } from "../src/box.js";
// @ts-expect-error the legacy tool is plain JavaScript with no declarations
import { extract } from "../../../designs/slug/legacy/tools/extract-nest.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const RECORD = "packages/nest/records/slug-fill.json";

const square = (x0: number, y0: number, s: number): Ring => [[x0, y0], [x0 + s, y0], [x0 + s, y0 + s], [x0, y0 + s]];
const cw = (r: Ring): Ring => [...r].reverse();

// the card's fixture
const FRAME = 200, HOLE = 150, SMALL = 30, COUNT = 16, SHEET = 220, GAP = 4;
const frameItems: NestItem[] = [
  { id: "frame", rings: [square(0, 0, FRAME), cw(square((FRAME - HOLE) / 2, (FRAME - HOLE) / 2, HOLE))], qty: 1, stock: "ply3" },
  { id: "square", rings: [square(0, 0, SMALL)], qty: COUNT, stock: "ply3" },
];
const frameReq: NestRequest = {
  items: frameItems, sheet: [SHEET, SHEET], margin: 0, gap: GAP, mode: "fill", rotations: [0, 90], partInPart: true, seed: 0,
};

let geom: Geom;
beforeAll(async () => {
  geom = await loadGeom();
});

const ringsOf = (items: readonly NestItem[]) => new Map(items.map((it) => [it.id, it.rings] as const));
const largest = (rings: readonly Ring[]): Ring => rings.reduce((a, b) => (Math.abs(ringArea2(b)) > Math.abs(ringArea2(a)) ? b : a));
const region = (rings: readonly Ring[]): Section => geom.fromRings(rings, { fillRule: "EvenOdd", snap: false });

function minDistance(a: readonly Ring[], b: readonly Ring[]): number {
  let d = Infinity;
  const one = (pts: readonly Ring[], segs: readonly Ring[]) => {
    for (const ring of pts) for (const [x, y] of ring) for (const s of segs) {
      for (let i = 0, j = s.length - 1; i < s.length; j = i++) d = Math.min(d, pointSegmentDistance(x, y, s[j]![0], s[j]![1], s[i]![0], s[i]![1]));
    }
  };
  one(a, b);
  one(b, a);
  return d;
}

interface Proof {
  inside: number;
  /** Largest area of an inner outline outside its host's holes, mm2. */
  worstOutside: number;
  /** Smallest distance from an inner part to its host, mm. */
  worstClear: number;
  /** Largest area two parts on one sheet share, mm2. */
  worstOverlap: number;
}

/** Proves every inside placement by polygon containment and every sheet free of overlap. */
function prove(items: readonly NestItem[], res: NestResult): Proof {
  const rings = ringsOf(items);
  const placed = new Map<string, { p: Placement; rings: Ring[] }>();
  for (const p of res.placements) placed.set(`${p.id}#${p.copy}`, { p, rings: placeRings(rings.get(p.id)!, p.at, p.rot) });
  let inside = 0, worstOutside = 0, worstClear = Infinity, worstOverlap = 0;
  for (const { p, rings: r } of placed.values()) {
    if (p.inside === undefined) continue;
    const host = placed.get(`${p.inside.id}#${p.inside.copy}`)!;
    expect(host.p.sheet).toBe(p.sheet);
    const holes = region([largest(host.rings)]).difference(region(host.rings));
    worstOutside = Math.max(worstOutside, region([largest(r)]).difference(holes).area());
    worstClear = Math.min(worstClear, minDistance(r, host.rings));
    inside++;
  }
  const list = [...placed.values()];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i]!, b = list[j]!;
      if (a.p.sheet !== b.p.sheet) continue;
      worstOverlap = Math.max(worstOverlap, region(a.rings).intersection(region(b.rings)).area());
    }
  }
  return { inside, worstOutside, worstClear, worstOverlap };
}

describe("frame fixture (computed)", () => {
  test("1 sheet with part-in-part, 2 without; every square inside the hole by polygon test", () => {
    const on = nest(frameReq, geom);
    const off = nest({ ...frameReq, partInPart: false });
    expect(on.sheets).toBe(1);
    expect(off.sheets).toBe(2);
    expect(on.placements).toHaveLength(1 + COUNT);
    const inner = on.placements.filter((p) => p.inside !== undefined);
    expect(inner).toHaveLength(COUNT);
    for (const p of inner) expect(p.inside).toEqual({ id: "frame", copy: 0 });
    const proof = prove(frameItems, on);
    expect(proof.inside).toBe(COUNT);
    expect(proof.worstOutside).toBeLessThanOrEqual(1e-6);
    expect(proof.worstClear).toBeGreaterThanOrEqual(GAP - 1e-6);
    expect(proof.worstOverlap).toBeLessThanOrEqual(1e-6);
    // and the squares really sit in the 150 mm hole, not merely in the frame's bbox
    const host = on.placements.find((p) => p.id === "frame")!;
    for (const p of inner) {
      expect(p.at[0]).toBeGreaterThanOrEqual(host.at[0] + (FRAME - HOLE) / 2 + GAP - 1e-9);
      expect(p.at[0] + SMALL).toBeLessThanOrEqual(host.at[0] + (FRAME + HOLE) / 2 - GAP + 1e-9);
    }
  });

  test("a tie goes to the layout without part-in-part", () => {
    // on a sheet that takes the frame and the squares side by side, part-in-part saves nothing
    const wide = nest({ ...frameReq, sheet: [400, 220] }, geom);
    expect(wide.sheets).toBe(1);
    expect(wide.placements.every((p) => p.inside === undefined)).toBe(true);
  });

  test("a hole too small for every remaining footprint hosts nothing", () => {
    const req: NestRequest = { ...frameReq, items: [frameItems[0]!, { id: "big", rings: [square(0, 0, 160)], qty: 1, stock: "ply3" }] };
    const res = nest(req, geom);
    expect(res.placements.every((p) => p.inside === undefined)).toBe(true);
    expect(res.sheets).toBe(2);
  });

  test("an island inside a hole is not free space", () => {
    // a 60 mm island in the middle of the hole leaves a 45 mm ring of space, so 30 mm squares fit only around it
    const island: NestItem = { ...frameItems[0]!, id: "framed", rings: [...frameItems[0]!.rings, square(70, 70, 60)] };
    const items = [island, { ...frameItems[1]!, qty: 6 }];
    const res = nest({ ...frameReq, items }, geom);
    expect(res.sheets).toBe(1);
    const proof = prove(items, res);
    expect(proof.inside).toBe(6);
    expect(proof.worstOutside).toBeLessThanOrEqual(1e-6);
    expect(proof.worstClear).toBeGreaterThanOrEqual(GAP - 1e-6);
    expect(proof.worstOverlap).toBeLessThanOrEqual(1e-6);
  });

  test("the polygon test turns away a footprint that fits the container's bbox but crosses an island", () => {
    // twelve squares fit the ring around the island by hand; every one the pass takes must be proven, and some are turned away
    const island: NestItem = { ...frameItems[0]!, id: "framed", rings: [...frameItems[0]!.rings, square(70, 70, 60)] };
    const items = [island, { ...frameItems[1]!, qty: 12 }];
    const boxes = items.flatMap((it) => {
      const e = extentOf(it.rings);
      return Array.from({ length: it.qty }, (_, copy) => ({ id: it.id, copy, w: e.w, h: e.h }));
    });
    const n = nestHoles(geom, boxes, ringsById(items), { sheet: [SHEET, SHEET], margin: 0, gap: GAP, rotations: [0, 90] });
    expect(n.roots.map((b) => b.id)).toContain("framed");
    const root = n.roots.find((b) => b.id === "framed")!;
    const inners = n.inners.get(keyOf("framed", 0))!;
    expect(inners.length).toBeGreaterThan(0);
    expect(inners.length).toBeLessThan(12);
    const placements: Placement[] = [{ id: "framed", copy: 0, sheet: 0, at: [0, 0], rot: 0 }, ...inners.map((i) => composePlacement(root, 0, [0, 0], 0, i))];
    const proof = prove(items, { sheets: 1, placements, packer: "shelf", gap: GAP, fill: [], oversize: [], layoutHash: "" as NestResult["layoutHash"] });
    expect(proof.inside).toBe(inners.length);
    expect(proof.worstOutside).toBeLessThanOrEqual(1e-6);
    expect(proof.worstClear).toBeGreaterThanOrEqual(GAP - 1e-6);
    expect(proof.worstOverlap).toBeLessThanOrEqual(1e-6);
  });

  test("a frame inside a frame: the inner frame's hole hosts too, and turns compose", () => {
    // the outer hole sits off centre and the dot is not square, so a wrong composition of turns shows
    const items: NestItem[] = [
      { id: "outer", rings: [square(0, 0, 200), cw(square(10, 30, 160))], qty: 1, stock: "ply3" },
      { id: "middle", rings: [square(0, 0, 120), cw(square(25, 25, 70))], qty: 1, stock: "ply3" },
      { id: "dot", rings: [[[0, 0], [50, 0], [50, 40], [0, 40]]], qty: 1, stock: "ply3" },
    ];
    for (const rot of [0, 90, 180, 270] as const) {
      const res = nest({ ...frameReq, items, rotations: [rot] }, geom);
      expect(res.sheets).toBe(1);
      expect(res.placements.find((p) => p.id === "outer")!.rot).toBe(rot);
      const dot = res.placements.find((p) => p.id === "dot")!;
      expect(dot.inside).toEqual({ id: "middle", copy: 0 });
      expect(dot.rot).toBe(rot);
      expect(res.placements.find((p) => p.id === "middle")!.inside).toEqual({ id: "outer", copy: 0 });
      const proof = prove(items, res);
      expect(proof.inside).toBe(2);
      expect(proof.worstOutside).toBeLessThanOrEqual(1e-6);
      expect(proof.worstClear).toBeGreaterThanOrEqual(GAP - 1e-6);
      expect(proof.worstOverlap).toBeLessThanOrEqual(1e-6);
      // cut order frees the dot, then the middle frame, then the outer frame
      const order = cutOrder(res.placements).map((p) => p.id);
      expect(order).toEqual(["dot", "middle", "outer"]);
    }
  });

  test("an inner part keeps a turn every root turn allows", () => {
    expect(innerTurns([0, 90])).toEqual([0]);
    expect(innerTurns([0])).toEqual([0]);
    expect(innerTurns([0, 180])).toEqual([0, 180]);
    expect(innerTurns([0, 90, 180, 270])).toEqual([0, 90, 180, 270]);
    // with rotations [0, 90] the squares' sheet turns stay within the request
    const res = nest(frameReq, geom);
    for (const p of res.placements) expect([0, 90]).toContain(p.rot);
  });

  test("one request gives one layoutHash", () => {
    expect(nest(frameReq, geom).layoutHash).toBe(nest(frameReq, geom).layoutHash);
  });

  test("refusals: legacy-shelf mode, and part-in-part without the geom handle", () => {
    const code = (f: () => unknown): string | undefined => {
      try {
        f();
      } catch (e) {
        return isThrownCommandError(e) ? `${e.hbf.code} ${e.hbf.path}` : String(e);
      }
      return undefined;
    };
    expect(code(() => nest({ ...frameReq, mode: "legacy-shelf" }, geom))).toBe("E_SCHEMA /partInPart");
    expect(code(() => nest(frameReq))).toBe("E_SCHEMA /partInPart");
  });
});

// SLUG, as shelf-parity.test.ts loads it: the page's PART_QTY over its baked OUTLINES
interface SlugRecord { result: { params: { sheetW: number; sheetH: number; gap: number; margin: number } } }
const slugParams = (JSON.parse(readFileSync(path.join(ROOT, "packages/nest/records/slug-legacy.json"), "utf8")) as SlugRecord).result.params;
const body = (extract() as string).replace(/\nexport \{[^}]*\};\n$/, "\nreturn {OUTLINES,PART_QTY,ACRYLIC};\n");
const S = new Function(body)() as { OUTLINES: Record<string, number[][][]>; PART_QTY: Record<string, number>; ACRYLIC: Set<string> };
const slugItems: NestItem[] = Object.keys(S.PART_QTY).filter((n) => S.OUTLINES[n]).map((n) => ({
  id: n, rings: S.OUTLINES[n] as unknown as Ring[], qty: S.PART_QTY[n]!, stock: S.ACRYLIC.has(n) ? "acrylic" : "ply",
}));
const slugReq: NestRequest = {
  items: slugItems, sheet: [slugParams.sheetW, slugParams.sheetH], margin: slugParams.margin, gap: slugParams.gap,
  mode: "fill", rotations: [0, 90], partInPart: true, seed: 0,
};

function perStock(res: NestResult): Record<"ply" | "acrylic", number> {
  const stock = new Map(slugItems.map((it) => [it.id, it.stock]));
  const count = (k: string) => new Set(res.placements.filter((p) => stock.get(p.id) === k).map((p) => p.sheet)).size;
  return { ply: count("ply"), acrylic: count("acrylic") };
}

const summary = ({ result: res, trials }: { result: NestResult; trials: readonly Trial[] }) => ({
  sheets: perStock(res), packer: res.packer, order: res.order ?? null, inside: res.placements.filter((p) => p.inside !== undefined).length,
  layoutHash: res.layoutHash, trials,
});

describe("SLUG fill mode with part-in-part (computed)", () => {
  test("at most 9 ply and 1 acrylic sheets, 0 overlaps by polygon test; counts held to slug-fill.json", () => {
    const onRun = nestTrials(slugReq, geom), offRun = nestTrials({ ...slugReq, partInPart: false });
    const on = onRun.result, off = offRun.result;
    const s = { on: summary(onRun), off: summary(offRun) };
    // part-in-part is a second candidate: the six without it, then the same six on the roots of the pass
    expect(s.on.trials.map((t) => t.partInPart)).toEqual([...Array(6).fill(false), ...Array(6).fill(true)]);
    expect(s.on.trials.slice(0, 6)).toEqual(s.off.trials);
    expect(Math.min(...s.on.trials.map((t) => t.sheets))).toBe(on.sheets);
    expect(s.on.sheets.ply).toBeLessThanOrEqual(9);
    expect(s.on.sheets.acrylic).toBeLessThanOrEqual(1);
    expect(on.sheets).toBeLessThanOrEqual(off.sheets);
    expect(on.oversize).toEqual([]);
    const proof = prove(slugItems, on);
    expect(proof.worstOverlap).toBeLessThanOrEqual(1e-6);
    expect(proof.inside).toBe(s.on.inside);
    if (proof.inside > 0) {
      expect(proof.worstOutside).toBeLessThanOrEqual(1e-6);
      expect(proof.worstClear).toBeGreaterThanOrEqual(slugParams.gap - 1e-6);
    }
    if (process.env["HBF_SLUG_FILL_RECORD"] === "1") {
      const record = {
        record: "slug-fill",
        card: "M07-T05",
        date: new Date().toISOString().slice(0, 10),
        qualifier: "computed; sheet counts are a metric of SLUG fill mode with part-in-part on and off, D-075",
        command: "HBF_SLUG_FILL_RECORD=1 npm test -w packages/nest -- part-in-part",
        machine: { cpu: cpus()[0]?.model ?? "unknown", os: `${process.platform} ${process.arch}`, node: process.version },
        input: { file: "designs/slug/legacy/slug.html", items: slugItems.length, pieces: slugItems.reduce((n, it) => n + it.qty, 0), request: { ...slugReq, items: undefined } },
        result: s,
        resultSha256: sha256Hex(canonicalize(s)),
      };
      writeFileSync(path.join(ROOT, RECORD), JSON.stringify(record, null, 1) + "\n");
      return;
    }
    const rec = JSON.parse(readFileSync(path.join(ROOT, RECORD), "utf8")) as { result: typeof s; resultSha256: string };
    expect(s).toEqual(rec.result);
    expect(sha256Hex(canonicalize(rec.result))).toBe(rec.resultSha256);
  }, 240_000);
});
