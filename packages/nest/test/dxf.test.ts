// M07-T06: the one DXF writer and its SVG twin. Every number here comes
// from outside the writer: the skeleton is compared with the committed
// template its generator checks (tools/py/make_dxf_template.py), the
// written bytes with the committed files in test/out (the same files
// tools/py/audit_dxf.py reloads with ezdxf and packages/checks reads with
// its own reader), entity facts with a group-code split written in this
// file, and the OGEE R16 lasercut with the parts, kerf, gap and BOM of
// cutfiles.py (packages/nest/records/ogee16-connect.json, the stitched
// rings its rings_from_dxf() produced; KERF and GAP read from the script's
// lines 18 to 32, stored in test/inputs).
// HBF_DXF_RECORD=1 rewrites test/out; without it a byte that moved fails.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, test } from "vitest";
import type { NestItem, NestRequest, NestResult, Placement, ProfileLookup, Ring } from "@hackbuild/spec";
import { circleRing, loadGeom, rrect, rrectRing, type Geom } from "@hackbuild/geom";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { packSheets } from "../src/connect.js";
import { drawSheets, sheetEntities, writeDxf, type SheetDrawing } from "../src/dxf.js";
import { layoutHash } from "../src/hash.js";
import { writeSvgCut } from "../src/svg.js";
import { fitArcs, wholeCircle } from "../src/arcs.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const OUT = path.join(ROOT, "packages/nest/test/out");
const RECORD = process.env.HBF_DXF_RECORD === "1";
const json = <T>(rel: string): T => JSON.parse(readFileSync(path.join(ROOT, rel), "utf8")) as T;
const sha = (s: string): string => createHash("sha256").update(s).digest("hex");

/** Group code pairs of a DXF text, split here and nowhere else. */
function entitiesOf(dxf: string): { type: string; pairs: [number, string][] }[] {
  const lines = dxf.split("\n");
  const out: { type: string; pairs: [number, string][] }[] = [];
  let inEntities = false;
  for (let i = 0; i + 1 < lines.length; i += 2) {
    const code = Number(lines[i]!.trim()), value = lines[i + 1]!;
    if (code === 2 && value === "ENTITIES") inEntities = true;
    else if (code === 0 && value === "ENDSEC") inEntities = false;
    else if (inEntities && code === 0) out.push({ type: value, pairs: [] });
    else if (inEntities) out[out.length - 1]!.pairs.push([code, value]);
  }
  return out;
}
const values = (e: { pairs: [number, string][] }, code: number): string[] => e.pairs.filter(([c]) => c === code).map(([, v]) => v);

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

const template = json<{ ezdxf: string; layers: string[]; owner: string; first: number; tpl: string }>("packages/nest/data/dxf-template.json");

// cutfiles.py: KERF (line 18), GAP (line 20), the BOM and the per-part rings its own functions produced.
const cutfiles = readFileSync(path.join(ROOT, "packages/nest/test/inputs/ogee16/cutfiles-18-32.txt"), "utf8");
const KERF = Number(/^KERF = ([0-9.]+)/m.exec(cutfiles)?.[1]);
const GAP = Number(/^GAP = ([0-9.]+)/m.exec(cutfiles)?.[1]);
const BOM = [...(/^BOM = \[([\s\S]*?)^\]/m.exec(cutfiles)?.[1] ?? "").matchAll(/\("(\w+)", (\d+)\)/g)].map((m) => [m[1]!, Number(m[2])] as const);
const ogee = json<{ result: { parts: { id: string; qty: number; rings: number[][][] }[] } }>("packages/nest/records/ogee16-connect.json").result;

let geom: Geom;
let profile: ProfileLookup;
beforeAll(async () => {
  geom = await loadGeom();
  profile = createProfileLookup(loadProfile());
});

const square = (x: number, y: number, s: number): Ring => [[x, y], [x + s, y], [x + s, y + s], [x, y + s]];
const reversed = (r: Ring): Ring => [...r].reverse();

/**
 * A fixture sheet: a 10 mm circle, a rounded rectangle, and a frame holding
 * an insert in its hole, placed by hand (bbox minimum corners), so the
 * layout does not depend on the packer.
 */
function fixtureSheet(): { drawing: SheetDrawing; items: NestItem[] } {
  const items: NestItem[] = [
    { id: "disc", stock: "ply3", qty: 1, rings: [circleRing(5)] },
    { id: "plate", stock: "ply3", qty: 1, rings: [rrectRing(rrect(0, 0, 30, 15, 6))] },
    { id: "frame", stock: "ply3", qty: 1, rings: [square(0, 0, 80), reversed(square(10, 10, 60))] },
    { id: "insert", stock: "ply3", qty: 1, rings: [square(0, 0, 30), reversed(square(10, 10, 10))] },
  ];
  const placements: Placement[] = [
    { id: "disc", copy: 0, sheet: 0, at: [10, 10], rot: 0 },
    { id: "plate", copy: 0, sheet: 0, at: [10, 40], rot: 0 },
    { id: "frame", copy: 0, sheet: 0, at: [100, 10], rot: 0 },
    { id: "insert", copy: 0, sheet: 0, at: [125, 35], rot: 90, inside: { id: "frame", copy: 0 } },
  ];
  const result: NestResult = { sheets: 1, placements, packer: "shelf", gap: 4, fill: [0], oversize: [], layoutHash: layoutHash(placements) };
  return { drawing: drawSheets(items, result, [300, 200])[0]!, items };
}

describe("template", () => {
  test("the skeleton is ezdxf 1.4.4 AC1024 in millimetres with the five layers, ENTITIES and $HANDSEED left open", () => {
    const py = readFileSync(path.join(ROOT, "tools/py/pyproject.toml"), "utf8");
    expect(template.ezdxf).toBe(/"ezdxf==([\d.]+)"/.exec(py)?.[1]);
    expect(template.tpl).toContain("  9\n$ACADVER\n  1\nAC1024\n");
    expect(template.tpl).toContain("  9\n$INSUNITS\n 70\n4\n");
    expect(template.tpl).toContain("  9\n$MEASUREMENT\n 70\n1\n");
    const layers = template.tpl.split("  0\nLAYER\n").slice(1).map((rec) => /\n {2}2\n([^\n]+)\n/.exec(rec)?.[1]);
    for (const l of ["ENGRAVE", "SCORE", "CUT_INNER", "CUT", "LIGHT"]) expect(layers).toContain(l);
    expect(template.layers).toEqual(["ENGRAVE", "SCORE", "CUT_INNER", "CUT", "LIGHT"]);
    expect(template.tpl.split("{{ENTITIES}}")).toHaveLength(2);
    expect(template.tpl.split("{{SEED}}")).toHaveLength(2);
    expect(template.first).toBe(0x100);
  });
});

describe("writer", () => {
  test("two writes of one layout give equal sha256", () => {
    const a = fixtureSheet().drawing, b = fixtureSheet().drawing;
    expect(sha(writeDxf(a))).toBe(sha(writeDxf(b)));
    expect(sha(writeSvgCut(a, "fixture"))).toBe(sha(writeSvgCut(b, "fixture")));
  });

  test("a 10 mm circle becomes one CIRCLE of radius 5", () => {
    const ents = entitiesOf(writeDxf({ size: [20, 20], parts: [{ id: "disc", copy: 0, holes: [], outlines: [circleRing(5, [10, 10])] }] }));
    expect(ents.map((e) => e.type)).toEqual(["CIRCLE"]);
    expect([values(ents[0]!, 10)[0], values(ents[0]!, 20)[0]]).toEqual(["10", "10"]);
    // the mean radius of a ring snapped to the 1/1024 mm grid (D-054)
    expect(Number(values(ents[0]!, 40)[0])).toBeCloseTo(5, 3);
    expect(values(ents[0]!, 8)).toEqual(["CUT"]);
  });

  test("a rounded rectangle carries four bulges of a quarter turn on four arcs", () => {
    const ents = entitiesOf(writeDxf({ size: [80, 50], parts: [{ id: "plate", copy: 0, holes: [], outlines: [rrectRing(rrect(40, 25, 30, 15, 6))] }] }));
    expect(ents.map((e) => e.type)).toEqual(["LWPOLYLINE"]);
    const bulges = values(ents[0]!, 42).map(Number).filter((b) => b !== 0);
    expect(bulges).toHaveLength(4);
    // a quarter turn: tan(90 deg / 4)
    for (const b of bulges) expect(b).toBeCloseTo(Math.tan(Math.PI / 8), 6);
    expect(values(ents[0]!, 90)).toEqual([String(values(ents[0]!, 10).length)]);
    expect(values(ents[0]!, 10)).toHaveLength(9);
  });

  test("a regular octagon stays an octagon: the edge midpoints sit off its circumcircle", () => {
    const oct: Ring = Array.from({ length: 8 }, (_, i) => [20 * Math.cos((i * Math.PI) / 4), 20 * Math.sin((i * Math.PI) / 4)]);
    expect(wholeCircle(oct)).toBeNull();
    expect(fitArcs(oct, true).every((s) => s.kind === "line")).toBe(true);
  });

  test("every LWPOLYLINE repeats its first vertex, flagged closed, with handles from 100 below $HANDSEED", () => {
    const dxf = writeDxf(fixtureSheet().drawing);
    const ents = entitiesOf(dxf);
    expect(ents.length).toBeGreaterThan(3);
    for (const e of ents.filter((x) => x.type === "LWPOLYLINE")) {
      const xs = values(e, 10), ys = values(e, 20);
      expect([xs[0], ys[0]]).toEqual([xs[xs.length - 1], ys[ys.length - 1]]);
      expect(values(e, 70)).toEqual(["1"]);
      expect(e.pairs.slice(0, 6).map(([c]) => c)).toEqual([5, 330, 100, 8, 100, 90]);
      expect(values(e, 330)).toEqual([template.owner]);
    }
    const handles = ents.map((e) => parseInt(values(e, 5)[0]!, 16));
    expect(handles).toEqual(handles.map((_, i) => 0x100 + i));
    const seed = /\$HANDSEED\n {2}5\n([0-9A-F]+)\n/.exec(dxf)?.[1];
    expect(parseInt(seed!, 16)).toBe(0x100 + handles.length);
    // no exponent in any coordinate or bulge (the skeleton's $EXTMIN 1e+20 is ezdxf's own)
    for (const e of ents) for (const [c, v] of e.pairs) if (c === 10 || c === 20 || c === 40 || c === 42) expect(v).toMatch(/^-?\d+(\.\d+)?$/);
  });

  test("cut order: the insert is cut whole before the frame's hole around it, holes before outlines", () => {
    const ents = sheetEntities(fixtureSheet().drawing);
    const seq = ents.map((e) => `${e.part}:${e.layer}`);
    const at = (s: string): number => seq.indexOf(s);
    expect(at("insert#0:CUT_INNER")).toBeLessThan(at("insert#0:CUT"));
    expect(at("insert#0:CUT")).toBeLessThan(at("frame#0:CUT_INNER"));
    expect(at("frame#0:CUT_INNER")).toBeLessThan(at("frame#0:CUT"));
    expect(seq.filter((s) => s.startsWith("disc"))).toEqual(["disc#0:CUT"]);
  });

  test("the svg twin: mm size, one y flip, the red hairline, every entity drawn once", () => {
    const { drawing } = fixtureSheet();
    const svg = writeSvgCut(drawing, "fixture sheet 1");
    expect(svg).toContain('width="300mm" height="200mm" viewBox="0 0 300 200"');
    expect(svg.match(/scale\(1,-1\)/g)).toHaveLength(1);
    expect(svg).toContain('stroke="#ff0000" stroke-width="0.1"');
    expect(svg.match(/<path /g)).toHaveLength(sheetEntities(drawing).length);
  });

  test("the fixture sheet and its twin equal the committed files", () => {
    const { drawing } = fixtureSheet();
    golden("fixture-sheet1.dxf", writeDxf(drawing));
    golden("fixture-sheet1.svg", writeSvgCut(drawing, "fixture sheet 1"));
  });
});

describe("OGEE16 R16 lasercut through the writer", () => {
  test("cutfiles.py bill: 27 distinct parts, 183 pieces, kerf 0.18 inferred", () => {
    expect(BOM).toHaveLength(27);
    expect(BOM.reduce((n, [, q]) => n + q, 0)).toBe(183);
    expect(ogee.parts.map((p) => [p.id, p.qty])).toEqual(BOM.map(([id, q]) => [id, q]));
    expect([KERF, GAP]).toEqual([0.18, 4]);
  });

  test("compensated at the cutfiles.py kerf, packed legacy-shelf: 3 sheets of 600 x 400, 0 severed, files equal the committed ones", () => {
    const t = loadProfile();
    // the kerf cutfiles.py ran at, entered on the machine row the way a coupon result would be; provenance stays inferred
    const lookup = createProfileLookup({ ...t, machines: t.machines.map((m) => (m.id === "sheet600" ? { ...m, kerf: KERF } : m)) });
    const env = lookup.machine("sheet600").envelope;
    if (!("sheet" in env)) throw new Error("sheet600 has no sheet envelope");
    const sheet: [number, number] = [env.sheet[0], env.sheet[1]];
    expect(sheet).toEqual([600, 400]);
    const items: NestItem[] = ogee.parts.map((p) => ({ id: p.id, qty: p.qty, stock: "ply3", rings: p.rings as unknown as Ring[] }));
    const req: NestRequest = { items, sheet, margin: GAP, gap: GAP, mode: "legacy-shelf", rotations: [0], partInPart: false, seed: 1 };
    const out = packSheets(geom, req, { profile: lookup, machine: "sheet600", kerfMode: "outline" });
    expect(out.beam).toBe(KERF);
    expect(out.findings.filter((f) => f.check === "CHK-SHT-01" && f.finding.verdict !== "pass")).toEqual([]);
    expect(out.findings.filter((f) => f.check === "CHK-SHT-01")).toHaveLength(27);
    const r = out.result!;
    expect([r.sheets, r.placements.length, r.oversize]).toEqual([3, 183, []]);
    const drawings = drawSheets(out.items, r, sheet);
    drawings.forEach((d, i) => {
      golden(`ogee16-r16-sheet${i + 1}.dxf`, writeDxf(d));
      golden(`ogee16-r16-sheet${i + 1}.svg`, writeSvgCut(d, `ogee16 r16 lasercut sheet ${i + 1}`));
    });
    expect(drawings.reduce((n, d) => n + d.parts.length, 0)).toBe(183);
  });
});
