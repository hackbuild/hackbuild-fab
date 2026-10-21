// M07-T03 MaxRects parity: OGEE16 R16-P plate_template.html pack() and
// autoGap(), evaluated by the M07-T01 tool from the pinned legacy files on
// the PARTS, GROUPS and DRIVE baked into ogee16-plate.html, against nest's
// maxrects-bssf packer (area order, one part type per plate). The bed,
// margin and gap come from the legacy block; the bills come from the page.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import type { NestItem, NestRequest } from "@hackbuild/spec";
import { nest } from "../src/sheet-loop.js";
// @ts-expect-error the legacy tool is plain JavaScript with no declarations
import { data, packer } from "../../../designs/ogee16/extract/extract-plate.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const record = JSON.parse(readFileSync(path.join(ROOT, "packages/nest/records/ogee16-plates-legacy.json"), "utf8")) as {
  result: Record<"knobs" | "servos", { gap4: { plates: number; pieces: number }; autoGap: { gap: number; plates: number } }>;
};

interface Part { id: string; qty: number; w: number; d: number }
interface Placed { p: Part; x: number; y: number; rot: 0 | 90 }
interface Api {
  pack: () => Placed[][];
  autoGap: () => { gap: number; plates: number };
  setDrive: (d: string) => void;
  setGap: (g: number) => void;
  getGap: () => number;
  MARGIN: number;
  PLATE: number;
}

const { PARTS, GROUPS, DRIVE } = data() as { PARTS: Part[]; GROUPS: { label: string; items: { id: string; n: number }[] }[]; DRIVE: Record<string, string[]> };

function legacy(drive: string): Api {
  const api = new Function("PARTS", "GROUPS", "DRIVE", packer() as string)(PARTS, GROUPS, DRIVE) as Api;
  api.setDrive(drive);
  return api;
}

/** The page's bill for a drive: setDrive zeroes the other drive's parts, pack() takes min(n, on). */
function items(drive: string): NestItem[] {
  const off = new Set(Object.entries(DRIVE).filter(([k]) => k !== drive).flatMap(([, ids]) => ids));
  return GROUPS.flatMap((g) => g.items.map((it) => {
    const p = PARTS.find((q) => q.id === it.id)!;
    return { id: p.id, rings: [[[0, 0], [p.w, 0], [p.w, p.d], [0, p.d]]], qty: off.has(p.id) ? 0 : Math.min(it.n, p.qty), stock: "pla" };
  }));
}

function request(drive: string, api: Api, gap: number | "auto"): NestRequest {
  return {
    items: items(drive), sheet: [api.PLATE, api.PLATE], margin: api.MARGIN, gap, mode: "fill", rotations: [0, 90],
    partInPart: false, seed: 0, packer: "maxrects-bssf", order: "area", groupBy: "type",
  };
}

function samePlates(api: Api, drive: string, gap: number): void {
  api.setGap(gap);
  const plates = api.pack();
  const port = nest(request(drive, api, gap));
  expect(port.sheets).toBe(plates.length);
  let k = 0;
  plates.forEach((pl, si) => {
    for (const it of pl) {
      const p = port.placements[k++]!;
      expect([p.sheet, p.id, p.rot]).toEqual([si, it.p.id, it.rot]);
      expect(Math.abs(p.at[0] - it.x)).toBeLessThanOrEqual(1e-9);
      expect(Math.abs(p.at[1] - it.y)).toBeLessThanOrEqual(1e-9);
    }
  });
  expect(k).toBe(port.placements.length);
  expect(port.oversize).toEqual([]);
}

describe.each(["knobs", "servos"] as const)("OGEE16 R16-P plates, %s drive (computed)", (drive) => {
  const api = legacy(drive);

  test("plates and placements equal the page's pack() at gap 4 to 1e-9 mm", () => {
    samePlates(api, drive, 4);
    const port = nest(request(drive, api, 4));
    expect(port.sheets).toBe(record.result[drive].gap4.plates);
    expect(port.placements.length).toBe(record.result[drive].gap4.pieces);
  });

  test("gap auto equals the page's autoGap() and the committed record, and the placements at that gap equal pack()", () => {
    api.setGap(4);
    const want = api.autoGap();
    const port = nest(request(drive, api, "auto"));
    expect([port.gap, port.sheets]).toEqual([want.gap, want.plates]);
    expect([port.gap, port.sheets]).toEqual([record.result[drive].autoGap.gap, record.result[drive].autoGap.plates]);
    samePlates(api, drive, want.gap);
  });
});

test("the card's numbers: gap auto gives 16 with 20 plates for knobs and 16 with 21 for servos (computed)", () => {
  const got = (["knobs", "servos"] as const).map((d) => {
    const r = nest(request(d, legacy(d), "auto"));
    return [r.gap, r.sheets];
  });
  expect(got).toEqual([[16, 20], [16, 21]]);
});
