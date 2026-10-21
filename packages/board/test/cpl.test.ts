// M08-T12 steps 4 and 5: the BOM, CPL and netlist writers on the two
// direct-route records. Independent sources: the shipped SHUNT CPL
// (shunt-r1/fab/shunt-CPL.csv, body centres, gen_fab.py), the shipped
// SPINDLE BOM, CPL and netlist (spindle/fab/, pcb.py) and the ARMATURE CPL
// header (ARMATURE-R1_CPL.csv). The SPINDLE body-centre move is the
// committed golden reference/boards/spindle-r1/expected/cpl.json.

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, test } from "vitest";
import { isThrownCommandError, type BoardRecord } from "@hackbuild/spec";
import { sourcePath } from "../../../tools/test-support/originals-root.js";
import { NET_RE, PIN_RE, csvText, directArgs, parseBoardRecord, parseCsv, readBom, readCpl, readNetlist, recordHash, uncsvText, withHash, writeBom, writeCpl, writeNetlist } from "../src/index";

const ROOT = path.resolve(new URL("../../..", import.meta.url).pathname);
const BENCH = sourcePath("fab-work-directory:benches");
const SHUNT_CPL = `${BENCH}/shunt/outputs/shunt-r1/fab/shunt-CPL.csv`;
const SPINDLE_FAB = `${BENCH}/spindle/outputs/spindle/fab`;
const ARMATURE_CPL = `${BENCH}/armature/outputs/ARMATURE-R1_CPL.csv`;
const work = mkdtempSync(path.join(tmpdir(), "hbf-cpl-"));
afterAll(() => rmSync(work, { recursive: true, force: true }));

function build(id: string): BoardRecord {
  const out = path.join(work, id);
  const r = spawnSync("uv", directArgs(path.join(ROOT, "tools", "py"), path.join(ROOT, "reference", "boards", id, "gen.py"), out, 315532800), { cwd: ROOT, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`${id} gen.py exited ${r.status}: ${r.stderr}`);
  return withHash(JSON.parse(readFileSync(path.join(out, "record.json"), "utf8")) as Omit<BoardRecord, "recordHash">);
}
const shunt = build("shunt-art");
const spindle = build("spindle-r1");
const legacy = (name: string): string => readFileSync(path.join(SPINDLE_FAB, name), "utf8");

describe("CPL dialects", () => {
  test.skipIf(!existsSync(SHUNT_CPL))("body-centre on SHUNT holds the shipped shunt-CPL.csv header and its 28 lines at body centres", () => {
    const text = writeCpl(shunt, "body-centre");
    // gen_fab.py wrote through Python's csv module, which ends lines CRLF; the port ends them LF.
    // The port writes rows in canonicalOrder (D-051, one hash one file) where gen_fab.py wrote emission order, so the lines compare as a set.
    const [head, ...lines] = readFileSync(SHUNT_CPL, "utf8").replace(/\r\n/g, "\n").trimEnd().split("\n");
    const [nowHead, ...nowLines] = text.trimEnd().split("\n");
    expect(nowHead).toBe(head);
    expect([...nowLines].sort()).toEqual([...lines].sort());
    expect(text.split("\n")[0]).toBe("Designator,Mid X,Mid Y,Rotation,Layer");
    expect(readCpl(text)!.rows).toHaveLength(28);
  });

  test.skipIf(!existsSync(ARMATURE_CPL))("mm-suffix writes the ARMATURE header and mm on every coordinate", () => {
    const text = writeCpl(shunt, "mm-suffix");
    expect(text.split("\n")[0]).toBe(readFileSync(ARMATURE_CPL, "utf8").split(/\r?\n/)[0]);
    const rows = parseCsv(text).slice(1).filter((r) => r.length > 1);
    expect(rows).toHaveLength(28);
    for (const r of rows) {
      expect(r[1], r[0]).toMatch(/^-?\d+\.\d{3}mm$/);
      expect(r[2], r[0]).toMatch(/^-?\d+\.\d{3}mm$/);
    }
    const back = readCpl(text)!;
    expect(back.dialect).toBe("mm-suffix");
    expect(back.rows.map((r) => [r.ref, r.x, r.y])).toEqual(readCpl(writeCpl(shunt))!.rows.map((r) => [r.ref, r.x, r.y]));
  });

  test.skipIf(!existsSync(SPINDLE_FAB))("SPINDLE: every part keeps its legacy pad-centroid row except the parts the golden names, which move by its delta", () => {
    const golden = JSON.parse(readFileSync(path.join(ROOT, "reference/boards/spindle-r1/expected/cpl.json"), "utf8")) as {
      moved: Record<string, { legacy: [number, number]; bodyCentre: [number, number]; delta: [number, number] }>; unmoved: number;
    };
    const old = new Map(parseCsv(legacy("spindle-CPL.csv")).slice(1).filter((r) => r.length > 1).map((r) => [r[0]!, [Number(r[1]), Number(r[2])] as const]));
    const now = readCpl(writeCpl(spindle))!.rows;
    const moved = now.filter((r) => { const o = old.get(r.ref)!; return Math.abs(o[0] - r.x) > 5e-4 || Math.abs(o[1] - r.y) > 5e-4; });
    expect(moved.map((r) => r.ref).sort()).toEqual(Object.keys(golden.moved).sort());
    expect(now.length - moved.length).toBe(golden.unmoved);
    for (const r of moved) {
      const g = golden.moved[r.ref]!;
      expect([r.x, r.y]).toEqual(g.bodyCentre);
      expect([...old.get(r.ref)!]).toEqual(g.legacy);
      expect(r.x - old.get(r.ref)![0]).toBeCloseTo(g.delta[0], 6);
      expect(r.y - old.get(r.ref)![1]).toBeCloseTo(g.delta[1], 6);
    }
  });
});

describe.skipIf(!existsSync(SPINDLE_FAB))("BOM and netlist against the shipped SPINDLE files", () => {
  test("the BOM holds the shipped designators with their values, purposes and MPNs (record part order)", () => {
    const old = parseCsv(legacy("spindle-BOM.csv")).slice(1).filter((r) => r.length > 1);
    const now = readBom(writeBom(spindle))!;
    const by = (rows: (string | number)[][]) => [...rows].sort((a, b) => (String(a[0]) < String(b[0]) ? -1 : 1));
    expect(by(now.map((r) => [r.ref, r.value, r.note, r.mpn, r.qty]))).toEqual(by(old.map((r) => [r[0]!, r[1]!, r[2]!, r[4]!, Number(r[3])])));
    expect(now.find((r) => r.ref === "Q1")!.footprint).toBe("SOT-23");
  });

  test("the netlist holds the shipped nets with the same member sets", () => {
    const old = readNetlist(legacy("spindle-netlist.txt"));
    const now = readNetlist(writeNetlist(spindle));
    expect([...now.keys()]).toEqual([...old.keys()]);
    for (const [n, m] of old) expect([...now.get(n)!].sort(), n).toEqual([...m].sort());
  });
});

// D-051: a record's set arrays are sets, so recordHash ignores their order;
// the writers must too, or one hash writes two files.
describe("one record hash writes one BOM, CPL and netlist", () => {
  test("SHUNT with parts, pads, vias and tracks reversed has the same hash and writes the same bytes", () => {
    const rev = { ...shunt, parts: [...shunt.parts].reverse(), pads: [...shunt.pads].reverse(), vias: [...shunt.vias].reverse(), tracks: [...shunt.tracks].reverse() } as BoardRecord;
    expect(shunt.parts.length).toBeGreaterThan(1);
    expect(recordHash(rev)).toBe(recordHash(shunt));
    expect(writeBom(rev)).toBe(writeBom(shunt));
    for (const d of ["body-centre", "mm-suffix"] as const) expect(writeCpl(rev, d), d).toBe(writeCpl(shunt, d));
    expect(writeNetlist(rev)).toBe(writeNetlist(shunt));
  });
});

// A name or text that reaches a CSV can neither shift a column nor start a spreadsheet formula.
describe("CSV fields", () => {
  const hintOf = (rec: unknown): string => {
    try {
      parseBoardRecord(rec);
    } catch (e) {
      if (isThrownCommandError(e)) return e.hbf.hint;
      throw e;
    }
    return "accepted";
  };
  const part = shunt.parts[0]!;
  const one = (p: Partial<typeof part>): BoardRecord => ({ ...shunt, parts: [{ ...part, ...p }] }) as BoardRecord;

  test("the record schema refuses a ref holding a comma, a dot, a space or a formula start", () => {
    for (const ref of ["R1,R2", "R1.2", "R 1", "=R1", "+R1", "-R1", "@R1"]) {
      const bad = withHash({ ...shunt, recordHash: undefined, parts: shunt.parts.map((p, i) => (i === 0 ? { ...p, ref } : p)) } as unknown as Omit<BoardRecord, "recordHash">);
      expect(hintOf(bad), ref).toMatch(/ref must be/);
    }
  });

  test("the record schema refuses a pin or net holding a comma, a quote or whitespace, and keeps +5V and GND?", () => {
    const i = shunt.pads.findIndex((p) => p.net === "");
    expect(i).toBeGreaterThanOrEqual(0);
    for (const pin of ["1,2", "1 2", '1"']) {
      const bad = withHash({ ...shunt, recordHash: undefined, pads: shunt.pads.map((p, j) => (j === i ? { ...p, pin } : p)) } as unknown as Omit<BoardRecord, "recordHash">);
      expect(hintOf(bad), pin).toMatch(/pin must be/);
    }
    expect(hintOf(shunt)).toBe("accepted");
    expect(hintOf(spindle)).toBe("accepted");
    expect(shunt.nets.some((n) => n.name === "GND?")).toBe(true);
    expect(["+5V", "GND?", "5V_MOD"].every((n) => NET_RE.test(n))).toBe(true);
    expect(["-", "+", "2/2", "GPIO20"].every((n) => PIN_RE.test(n))).toBe(true);
  });

  test("every CPL field goes through csvField: a ref the schema would refuse still cannot shift a column", () => {
    const row = readCpl(writeCpl(one({ ref: "R1,R2", x: 1.5, y: -2.25 })))!.rows[0]!;
    expect(row).toEqual({ ref: "R1,R2", x: 1.5, y: -2.25, rot: part.rot, layer: part.side === "top" ? "Top" : "Bottom" });
  });

  test("a CPL coordinate keeps its minus sign", () => {
    expect(writeCpl(one({ x: -1.5 })).split("\n")[1]).toMatch(/^[A-Za-z0-9_]+,-1\.500,/);
  });

  test.each(["=HYPERLINK(\"x\")", "+1+1", "-2+3", "@SUM(A1)", "\tcmd", "'=quoted", "''+x"])("a BOM text field %j starts with a single quote in the file and reads back unchanged", (v) => {
    const text = writeBom(one({ value: v, note: v, mpn: v }));
    const fields = parseCsv(text)[1]!;
    for (const k of [1, 2, 6]) expect(fields[k]!.startsWith("'"), String(k)).toBe(true);
    for (const k of [1, 2, 6]) expect(/^[=+\-@\t\r]/.test(fields[k]!), String(k)).toBe(false);
    const back = readBom(text)![0]!;
    expect([back.value, back.mpn, back.note]).toEqual([v, v, v]);
  });

  test("csvText leaves plain text and an inner formula character alone", () => {
    for (const v of ["10k 0805", "CR2032 (+-8V x4)", "a=b", "'quoted"]) {
      expect(csvText(v), v).toBe(v.includes(",") ? `"${v}"` : v);
      expect(uncsvText(v), v).toBe(v);
    }
  });
});
