// The COLLAR NFC pause fixture against the owner print cards (M03-T09 step
// 7). Card arithmetic only: every fixture value equals the card text, read
// from the committed copy of the lineage source (the nfc-card copy row) and
// checked against the canonical row's sha256; ceiling minus floor is the
// pocket height; pocket minus tag is the clearance; the pause layer sits on
// the grid the case names. The layer grid comes from profile when profile
// has the preset, else from the uniform grid the fixture names.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { layerIndex, layerTop, loadProfile } from "@hackbuild/profile";
import { D062, NFC_CASES, type NfcCase } from "./nfc-pause.fixture";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const rows = JSON.parse(readFileSync(ROOT + "lineage.json", "utf8")) as { id: string; kind: string; source: string; sha256: string; dest: string | null }[];

const EPS = 1e-9;
const mm2 = (x: number): number => Math.round(x * 100) / 100;

function cardText(c: NfcCase): string {
  const row = rows.find((r) => r.id === c.lineage);
  if (row === undefined) throw new Error(`lineage.json has no row ${c.lineage}`);
  // the card's bytes are committed beside this test so a hosted runner reads them
  const copy = rows.find((r) => r.kind === "copy" && r.source === row.source && r.dest?.startsWith("designs/collar/test/fixtures/") === true);
  if (copy?.dest == null) throw new Error(`lineage.json has no committed copy of ${c.lineage}`);
  expect(copy.sha256).toBe(row.sha256);
  const buf = readFileSync(ROOT + copy.dest);
  expect(createHash("sha256").update(buf).digest("hex")).toBe(row.sha256);
  return buf.toString("utf8");
}

function num(text: string, re: RegExp): number {
  const m = re.exec(text);
  if (m === null) throw new Error(`card has no match for ${re}`);
  return Number(m[1]);
}

function grid(c: NfcCase): { firstLayer: number; layer: number } {
  if ("uniform" in c.grid) return c.grid.uniform;
  const id = c.grid.preset;
  const preset = loadProfile().machines.flatMap((m) => m.presets ?? []).find((p) => p.id === id);
  if (preset === undefined) throw new Error(`profile has no preset ${id}`);
  return preset;
}

/** Layer tops either side of z on the grid, mm; equal when z is a layer top. */
function nearest(g: { firstLayer: number; layer: number }, z: number): [number, number] {
  const i = layerIndex(g, z);
  const top = layerTop(g, i);
  if (Math.abs(top - z) < 1e-6) return [mm2(top), mm2(top)];
  return [mm2(layerTop(g, i - 1)), mm2(top)];
}

describe.each(NFC_CASES)("case $id", (c) => {
  const text = cardText(c);

  test("every fixture value is the card's", () => {
    expect(c.card.layer).toBe(num(text, /\(\d+ layers at ([\d.]+)\)/));
    expect(c.card.blank).toBe(num(text, /dia x ([\d.]+) mm/));
    expect(c.card.inlay).toBe(num(text, /inlay depth\s+([\d.]+) mm/));
    expect(c.card.pocket).toBe(num(text, /([\d.]+) mm wide for a/));
    expect(c.card.tag).toBe(num(text, /for a ([\d.]+) mm tag/));
    expect(c.card.height).toBe(num(text, /mm tag, ([\d.]+) mm tall/));
    expect(c.card.floorZ).toBe(num(text, /floor Z ([\d.]+)/));
    expect(c.card.ceilingZ).toBe(num(text, /ceiling Z ([\d.]+)/));
    expect(c.card.pauseLayer).toBe(num(text, /layer (\d+)\s*$/m));
    expect(c.card.floorWall).toBe(num(text, /floor wall ([\d.]+) mm/));
    expect(c.card.roofWall).toBe(num(text, /roof wall ([\d.]+) mm/));
  });

  test("the pocket declares the card: pause at the ceiling, depth the pocket height, clearance per side", () => {
    const p = c.pocket;
    expect(p.sealed.pauseBefore.z).toBe(c.card.ceilingZ);
    expect(p.face.origin[2]).toBe(c.card.ceilingZ);
    expect(mm2(c.card.ceilingZ - c.card.floorZ)).toBe(c.card.height);
    expect(p.depth).toBe(c.card.height);
    expect(mm2(p.face.origin[2] - p.depth)).toBe(c.card.floorZ);
    expect(p.fit.drawnPerSide).toBe(0.5);
    const r = Math.max(...p.outline.map(([x, y]) => Math.hypot(x, y)));
    expect(Math.abs(r - c.card.pocket / 2)).toBeLessThan(1e-3);
  });

  test("walls: the card's floor and roof walls follow from the blank, the inlay and the pocket", () => {
    expect(mm2(c.card.floorZ - c.card.inlay)).toBe(c.card.floorWall);
    expect(mm2(c.card.blank - c.card.inlay - c.card.ceilingZ)).toBe(c.card.roofWall);
  });

  test("D-062 read two ways matches the expected outcome", () => {
    const verdict = (v: number, min: number): "pass" | "fail" => (v + EPS >= min ? "pass" : "fail");
    expect({
      allPlastic: { floor: verdict(c.card.floorZ, D062.floorMin), roof: verdict(c.card.blank - c.card.ceilingZ, D062.roofMin) },
      wallToInlay: { floor: verdict(c.card.floorWall, D062.floorMin), roof: verdict(c.card.roofWall, D062.roofMin) },
    }).toEqual(c.expected.d062);
  });

  test("CHK-PRT-15 expectation: pauseBefore.z on or off the grid the case names", () => {
    const g = grid(c);
    const [lo, hi] = nearest(g, c.pocket.sealed.pauseBefore.z);
    if (c.expected.chkPrt15.result === "pass") {
      expect(lo).toBe(hi);
      expect(lo).toBe(c.card.ceilingZ);
    } else {
      expect(lo).not.toBe(hi);
      expect([lo, hi]).toEqual(c.expected.chkPrt15.nearest);
    }
  });
});

describe("grid arithmetic of the two cards", () => {
  const [a, b] = NFC_CASES as [NfcCase, NfcCase];

  test("case a: 0.20 grid, floor is layer 8's top, ceiling layer 11's top, pause before layer 12", () => {
    const g = grid(a);
    expect(g.firstLayer).toBe(g.layer);
    expect(layerIndex(g, a.card.floorZ) + 1).toBe(8);
    expect(layerIndex(g, a.card.ceilingZ) + 1).toBe(11);
    expect(layerIndex(g, a.card.ceilingZ) + 2).toBe(a.card.pauseLayer);
    expect(mm2(layerTop(g, a.card.pauseLayer - 2))).toBe(a.card.ceilingZ);
  });

  test("case b: on a uniform 0.24 grid the floor is layer 7's top and the ceiling is 9.5 layers", () => {
    expect(mm2(b.card.floorZ / b.card.layer)).toBe(7);
    expect(mm2(b.card.ceilingZ / b.card.layer)).toBe(9.5);
  });

  test("case b on ffc5p_20260819: both ends off grid; the card's layer 11 starts 0.13 above the declared ceiling", () => {
    const g = grid(b);
    expect(g.firstLayer).toBe(0.25);
    expect(g.layer).toBe(b.card.layer);
    expect(nearest(g, b.card.floorZ)).toEqual([1.45, 1.69]);
    expect(nearest(g, b.card.ceilingZ)).toEqual([2.17, 2.41]);
    const start = layerTop(g, b.card.pauseLayer - 2);
    expect(mm2(start)).toBe(2.41);
    expect(mm2(start - b.card.ceilingZ)).toBe(0.13);
  });
});
