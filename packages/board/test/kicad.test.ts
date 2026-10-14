// M08-T08 KiCad writer and readback on kicadts. The legacy file
// (kicad/spindle-r1.kicad_pcb, sha256 55d09eba...) is the independent
// source: it reads back to the SPINDLE record 55 of 55 pads, and its
// round trip keeps the Records table's counts (18 footprints, 59 pads, 59
// segments, 15 vias, 20 nets, 2 zones, 4 gr_arc, 8 gr_line, 54 gr_text;
// counted, scratch run). The new file must read back the same, and a
// second write must equal the first.

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { parseKicadPcb } from "kicadts";
import { afterAll, describe, expect, test } from "vitest";
import { directArgs, kicadCounts, kicadExtrasOf, readbackKicad, withHash, writeKicad, type KicadExtras } from "../src/index";
import type { BoardRecord } from "@hackbuild/spec";

const ROOT = path.resolve(new URL("../../..", import.meta.url).pathname);
const LEGACY = "/Users/obsidian/Projects/hackbuild/fab-work-directory/benches/spindle/outputs/spindle/kicad/spindle-r1.kicad_pcb";
const work = mkdtempSync(path.join(tmpdir(), "hbf-kicad-"));
afterAll(() => rmSync(work, { recursive: true, force: true }));

const out = path.join(work, "spindle");
const r = spawnSync("uv", directArgs(path.join(ROOT, "tools", "py"), path.join(ROOT, "reference", "boards", "spindle-r1", "gen.py"), out, 315532800), { cwd: ROOT, encoding: "utf8" });
const record: BoardRecord = withHash(JSON.parse(readFileSync(path.join(out, "record.json"), "utf8")) as Omit<BoardRecord, "recordHash">);
const gates = JSON.parse(readFileSync(path.join(out, "gates.json"), "utf8")) as KicadExtras & { maskExpansion?: number };
const extras: KicadExtras = { ...kicadExtrasOf(record), silkLines: gates.silkLines!, corner: gates.corner!, maskExpansion: 0.05 };

// Records table, counted on the scratch round trip of the legacy file.
const COUNTS = { footprints: 18, pads: 59, segments: 59, vias: 15, nets: 20, zones: 2, grArcs: 4, grLines: 8, grTexts: 54 };

describe.skipIf(!existsSync(LEGACY))("legacy spindle-r1.kicad_pcb", () => {
  const text = readFileSync(LEGACY, "utf8");

  test("is the file the lineage row names", () => {
    expect(createHash("sha256").update(text).digest("hex")).toBe("55d09eba04102cd70885849c045311c4752c9afaf1d925f7543e59e598a03cd8");
  });

  test("reads back 55 of 55 pads and 15 of 15 vias against the record", () => {
    expect(r.status).toBe(0);
    const rb = readbackKicad(text, record);
    expect(rb.pads).toEqual({ matched: 55, total: 55, misses: [] });
    expect(rb.vias).toEqual({ matched: 15, total: 15, misses: [] });
    expect(rb.nets).toEqual({ matched: 19, total: 19, misses: [] });
    expect(rb.islands).toEqual({ whole: 19, total: 19, split: [] });
    // The D-249 short is in the shipped file and the record alike: 4 B.Cu segment and via pairs, 5V to GND (audit3 kicad-shorts.mjs).
    expect(rb.shorts).toEqual({ file: 4, record: 4, extra: [] });
  });

  test("round trip keeps the counts and a second write equals the first", () => {
    const once = parseKicadPcb(text).getString();
    expect(kicadCounts(parseKicadPcb(once))).toEqual(COUNTS);
    expect(parseKicadPcb(once).getString()).toBe(once);
  });
});

describe("the written spindle-r1.kicad_pcb", () => {
  const text = writeKicad(record, extras);

  test("holds the legacy counts", () => {
    expect(kicadCounts(parseKicadPcb(text))).toEqual(COUNTS);
  });

  test("reads back 55 of 55 pads, 15 of 15 vias, 19 nets one island each", () => {
    const rb = readbackKicad(text, record);
    expect(rb.pads).toEqual({ matched: 55, total: 55, misses: [] });
    expect(rb.vias).toEqual({ matched: 15, total: 15, misses: [] });
    expect(rb.nets).toEqual({ matched: 19, total: 19, misses: [] });
    expect(rb.islands).toEqual({ whole: 19, total: 19, split: [] });
    expect(rb.shorts).toEqual({ file: 4, record: 4, extra: [] });
  });

  test("a cross-net segment the record lacks reads back as an extra short", () => {
    // A GPIO0 segment on F.Cu from U1.GPIO0 to U1.GPIO1 touches the GPIO1 pad: one short, net pair GPIO0 and GPIO1.
    const H = Math.max(...record.board.outline.map((p) => p[1]));
    const a = record.pads.find((p) => p.ref === "U1" && p.pin === "GPIO0")!;
    const b = record.pads.find((p) => p.ref === "U1" && p.pin === "GPIO1")!;
    const id = 1 + record.nets.findIndex((n) => n.name === "GPIO0");
    const seg = `  (segment (start ${a.x} ${H - a.y}) (end ${b.x} ${H - b.y}) (width 0.25) (layer "F.Cu") (net ${id}) (tstamp 00000000-0000-0000-0000-000000000001))`;
    const bad = text.replace(/\)\s*$/, `${seg}\n)\n`);
    expect(bad).not.toBe(text);
    const rb = readbackKicad(bad, record);
    expect(rb.shorts.extra).toEqual(["short GPIO0 to GPIO1 on F.Cu: 1 in the file against 0 in the record"]);
    expect(rb.shorts.file).toBe(5);
  });

  test("one record hash writes one file: parts, pads, holes, tracks, vias and silk reversed write the same bytes", () => {
    const rev = {
      ...record, parts: [...record.parts].reverse(), pads: [...record.pads].reverse(), holes: [...record.holes].reverse(),
      tracks: [...record.tracks].reverse(), vias: [...record.vias].reverse(), silk: [...(record.silk ?? [])].reverse(),
    } as BoardRecord;
    expect(withHash(rev).recordHash).toBe(record.recordHash);
    expect(writeKicad(rev, { ...kicadExtrasOf(rev), silkLines: gates.silkLines!, corner: gates.corner!, maskExpansion: 0.05 })).toBe(text);
  });

  test("is a fixed point of kicadts and one record writes one file", () => {
    expect(parseKicadPcb(text).getString()).toBe(text);
    expect(writeKicad(record, extras)).toBe(text);
  });

  test("a copy with one drill offset negated fails naming the pad", () => {
    const i = record.pads.findIndex((p) => p.ref === "U1" && p.pin === "GPIO20");
    const bad = { ...record, pads: record.pads.map((p, j) => (j === i ? { ...p, holeDx: -(p.holeDx ?? 0) } : p)) } as BoardRecord;
    const rb = readbackKicad(writeKicad(bad, extras), record);
    expect(rb.pads.matched).toBe(54);
    expect(rb.pads.misses).toEqual([expect.stringMatching(/^U1\.GPIO20 drill offset -?1\.13 against -?1\.13$/)]);
  });

  test("a net broken in two shows as two islands", () => {
    const cut = { ...record, tracks: record.tracks.filter((t) => !(t.net === "LSW")) } as BoardRecord;
    const rb = readbackKicad(writeKicad(cut, extras), record);
    expect(rb.islands.split).toEqual(["LSW in 2 islands"]);
  });
});
