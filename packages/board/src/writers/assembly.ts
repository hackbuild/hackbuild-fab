// BOM, CPL and netlist writers (M08-T12 steps 4 and 5): the one
// implementation of each, written from the BoardRecord so the three files
// agree with the record by designator. The direct generators no longer
// write their own copies.
//
// CPL dialects, both ported: `body-centre` is SHUNT's (gen_fab.py lines
// 268 to 276: header `Designator,Mid X,Mid Y,Rotation,Layer`, body centre,
// rotation as placed, three decimals); `mm-suffix` is ARMATURE's
// (ARMATURE-R1_CPL.csv: `Designator,Mid X,Mid Y,Layer,Rotation`, `mm` on
// every coordinate). Which assembler wants which is not recorded in the
// evidence; body-centre is the default and the mapping is unconfirmed.
// SPINDLE's legacy CPL put each part at its pad centroid (pcb.py lines 473
// to 481); the record holds body centres, so its CPL moves for parts whose
// pads are not centred on the body.
//
// Netlist: SPINDLE's text form (pcb.py lines 482 to 485), the net name
// padded to 10 then the members; nets and members come sorted from the
// record (parseBoardRecord holds both orders), and nets are no set array
// of recordHash, so their order is already part of the hash.
//
// BOM: SPINDLE's Designator, Qty and MPN with SHUNT's value, footprint,
// side and note (gen_board.py lines 851 to 861); the record holds no
// description apart from value and note, so those are the columns.
//
// Row order: parts in canonicalOrder (record-hash.ts), the order recordHash
// sorts them in, so two records with one hash write one file (D-051). The
// shipped files list parts in generator emission order instead; the rows
// are the same set.
//
// Every CSV field goes through csvField. Text fields (BOM value, MPN,
// footprint, note) also go through csvText, which prefixes a single quote
// to a field that starts with =, +, -, @, tab or carriage return, so a
// spreadsheet opening the file reads it as text and runs no formula. CPL
// coordinates are numbers and keep their minus sign; refs cannot start
// with those characters (record.zod.ts).

import type { BoardRecord, RecordPart } from "@hackbuild/spec";
import { canonicalOrder } from "../record-hash.js";

export type CplDialect = "body-centre" | "mm-suffix";
export const CPL_DIALECTS: readonly CplDialect[] = ["body-centre", "mm-suffix"];

export const CPL_HEADER: Readonly<Record<CplDialect, string>> = {
  "body-centre": "Designator,Mid X,Mid Y,Rotation,Layer",
  "mm-suffix": "Designator,Mid X,Mid Y,Layer,Rotation",
};
export const BOM_HEADER = "Designator,Value,MPN,Footprint,Side,Qty,Note";

/** RFC 4180 field: quoted when it holds a comma, a quote or a line break. */
export function csvField(v: string): string {
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** A text field a spreadsheet would read as a formula: =, +, - or @ (or tab, CR) after any run of single quotes. */
const FORMULA = /^'*[=+\-@\t\r]/;

/** A text field neutralised for spreadsheets, then quoted: one single quote goes in front of a formula start. */
export function csvText(v: string): string {
  return csvField(FORMULA.test(v) ? `'${v}` : v);
}

/** Undo csvText's quote on a parsed text field. */
export function uncsvText(v: string): string {
  return FORMULA.test(v) && v.startsWith("'") ? v.slice(1) : v;
}

const layerOf = (p: Pick<RecordPart, "side">): string => (p.side === "top" ? "Top" : "Bottom");

/** The footprint a part names: its catalog id without the `kicad:` library prefix. */
export function footprintOf(p: Pick<RecordPart, "catalogId">): string {
  return p.catalogId.startsWith("kicad:") ? p.catalogId.slice("kicad:".length) : p.catalogId;
}

export function writeCpl(record: BoardRecord, dialect: CplDialect = "body-centre"): string {
  const rows = [CPL_HEADER[dialect]];
  for (const p of canonicalOrder(record.parts)) {
    const x = p.x.toFixed(3);
    const y = p.y.toFixed(3);
    const rot = p.rot.toFixed(1);
    const fields = dialect === "body-centre" ? [p.ref, x, y, rot, layerOf(p)] : [p.ref, `${x}mm`, `${y}mm`, layerOf(p), rot];
    rows.push(fields.map(csvField).join(","));
  }
  return `${rows.join("\n")}\n`;
}

export function writeBom(record: BoardRecord): string {
  const rows = [BOM_HEADER];
  for (const p of canonicalOrder(record.parts)) {
    rows.push([csvField(p.ref), ...[p.value, p.mpn ?? "", footprintOf(p)].map(csvText), csvField(layerOf(p)), "1", csvText(p.note ?? "")].join(","));
  }
  return `${rows.join("\n")}\n`;
}

export function writeNetlist(record: BoardRecord): string {
  return `${record.nets.map((n) => `${n.name.padEnd(10)} ${n.members.join(" ")}`.trimEnd()).join("\n")}\n`;
}

/** Split CSV text into rows of fields (RFC 4180 quoting). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let f = "";
  let q = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i]!;
    if (q) {
      if (c === '"' && text[i + 1] === '"') { f += '"'; i += 1; } else if (c === '"') q = false; else f += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(f); f = ""; } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i += 1;
      row.push(f); rows.push(row); row = []; f = "";
    } else f += c;
  }
  if (f !== "" || row.length > 0) { row.push(f); rows.push(row); }
  return rows;
}

export interface CplRow { readonly ref: string; readonly x: number; readonly y: number; readonly rot: number; readonly layer: string }
export interface BomRow { readonly ref: string; readonly value: string; readonly mpn: string; readonly footprint: string; readonly side: string; readonly qty: number; readonly note: string }

/** Read a CPL in either dialect, told apart by its header; undefined for a header neither dialect writes. */
export function readCpl(text: string): { readonly dialect: CplDialect; readonly rows: readonly CplRow[] } | undefined {
  const [head, ...body] = parseCsv(text);
  const h = (head ?? []).join(",");
  const dialect = (Object.keys(CPL_HEADER) as CplDialect[]).find((d) => CPL_HEADER[d] === h);
  if (dialect === undefined) return undefined;
  const mm = (v: string): number => Number(v.replace(/mm$/, ""));
  return {
    dialect,
    rows: body.filter((r) => r.length > 1).map((r) => dialect === "body-centre"
      ? { ref: r[0]!, x: mm(r[1]!), y: mm(r[2]!), rot: Number(r[3]), layer: r[4]! }
      : { ref: r[0]!, x: mm(r[1]!), y: mm(r[2]!), layer: r[3]!, rot: Number(r[4]) }),
  };
}

export function readBom(text: string): readonly BomRow[] | undefined {
  const [head, ...body] = parseCsv(text);
  if ((head ?? []).join(",") !== BOM_HEADER) return undefined;
  return body.filter((r) => r.length > 1).map((r) => ({
    ref: r[0]!, value: uncsvText(r[1]!), mpn: uncsvText(r[2]!), footprint: uncsvText(r[3]!), side: r[4]!, qty: Number(r[5]), note: uncsvText(r[6]!),
  }));
}

/** Read a netlist: net name to members, in file order. */
export function readNetlist(text: string): ReadonlyMap<string, readonly string[]> {
  const out = new Map<string, readonly string[]>();
  for (const line of text.split("\n")) {
    if (line.trim() === "") continue;
    const [name, ...members] = line.trim().split(/\s+/);
    out.set(name!, members);
  }
  return out;
}
