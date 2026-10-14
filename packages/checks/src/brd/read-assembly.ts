// CHK-BRD-05's own readers for the BOM, CPL and netlist text the board
// writes. They import nothing from @hackbuild/board, so a fault in the
// writer's header tables, CSV quoting or footprint naming cannot hide in the
// check that reads its output (the CHK-SHT-03 rule, D-138, M07-T06 step 5,
// applied to the board files).
//
// Header literals come from the legacy files, not from the writer:
// - CPL body-centre: SHUNT gen_fab.py lines 268 to 276 and its shipped
//   fab/shunt-CPL.csv, `Designator,Mid X,Mid Y,Rotation,Layer`, three
//   decimals, no unit.
// - CPL mm-suffix: ARMATURE-R1_CPL.csv, `Designator,Mid X,Mid Y,Layer,Rotation`,
//   `mm` after every coordinate.
// - BOM: no legacy file holds this column set. The columns are SPINDLE's
//   Designator, Qty and MPN (fab/spindle-BOM.csv) with SHUNT's value,
//   footprint, side and note (BOM.csv); the order is the one M08-T12 fixed
//   for the board BOM, written here as a literal so a reorder in the writer
//   fails the check instead of moving with it.
// - Netlist: SPINDLE pcb.py lines 482 to 485 and fab/spindle-netlist.txt,
//   one net per line, the name then its members, split on whitespace.

/** The two CPL dialects by header, from the legacy files named above. */
export const CPL_HEADS = {
  "body-centre": ["Designator", "Mid X", "Mid Y", "Rotation", "Layer"],
  "mm-suffix": ["Designator", "Mid X", "Mid Y", "Layer", "Rotation"],
} as const;

/** The BOM columns, in file order. */
export const BOM_HEAD = ["Designator", "Value", "MPN", "Footprint", "Side", "Qty", "Note"] as const;

/** Split CSV text into rows of fields per RFC 4180: quoted fields, doubled quotes, CRLF or LF. */
export function splitCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let i = 0;
  while (i < text.length) {
    const c = text[i]!;
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        quoted = false;
      } else field += c;
      i += 1;
      continue;
    }
    if (c === '"' && field === "") quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\r" || c === "\n") {
      row.push(field); rows.push(row); row = []; field = "";
      if (c === "\r" && text[i + 1] === "\n") i += 1;
    } else field += c;
    i += 1;
  }
  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

/**
 * A text field a spreadsheet would run as a formula is written with one
 * single quote in front (OWASP CSV injection guidance): a field that is one
 * or more quotes then =, +, -, @, tab or CR loses its first quote on read.
 */
export function unguard(v: string): string {
  return /^'+[=+\-@\t\r]/.test(v) ? v.slice(1) : v;
}

const sameHead = (got: readonly string[] | undefined, want: readonly string[]): boolean =>
  got !== undefined && got.length === want.length && got.every((g, i) => g === want[i]);

const body = (rows: readonly string[][]): string[][] => rows.slice(1).filter((r) => !(r.length === 1 && r[0] === ""));

export interface CplLine { readonly ref: string; readonly x: number; readonly y: number; readonly rot: number; readonly layer: string }
export type CplDialectName = keyof typeof CPL_HEADS;

/** A coordinate as the dialect writes it: bare for body-centre, with a trailing `mm` for mm-suffix; NaN otherwise. */
function coord(v: string, dialect: CplDialectName): number {
  if (dialect === "mm-suffix") return v.endsWith("mm") ? Number(v.slice(0, -2)) : Number.NaN;
  return v.endsWith("mm") ? Number.NaN : Number(v);
}

/** Read a CPL in either legacy dialect; undefined when the header is neither. */
export function readCplFile(text: string): { readonly dialect: CplDialectName; readonly rows: readonly CplLine[] } | undefined {
  const rows = splitCsv(text);
  const dialect = (Object.keys(CPL_HEADS) as CplDialectName[]).find((d) => sameHead(rows[0], CPL_HEADS[d]));
  if (dialect === undefined) return undefined;
  const col = (name: string): number => (CPL_HEADS[dialect] as readonly string[]).indexOf(name);
  return {
    dialect,
    rows: body(rows).map((r) => ({
      ref: r[col("Designator")] ?? "",
      x: coord(r[col("Mid X")] ?? "", dialect),
      y: coord(r[col("Mid Y")] ?? "", dialect),
      rot: Number(r[col("Rotation")]),
      layer: r[col("Layer")] ?? "",
    })),
  };
}

export interface BomLine { readonly ref: string; readonly value: string; readonly mpn: string; readonly footprint: string; readonly side: string; readonly qty: string; readonly note: string }

/** Read the BOM; undefined when the header is not BOM_HEAD. */
export function readBomFile(text: string): readonly BomLine[] | undefined {
  const rows = splitCsv(text);
  if (!sameHead(rows[0], BOM_HEAD)) return undefined;
  const at = (r: readonly string[], name: (typeof BOM_HEAD)[number]): string => r[BOM_HEAD.indexOf(name)] ?? "";
  return body(rows).map((r) => ({
    ref: at(r, "Designator"),
    value: unguard(at(r, "Value")),
    mpn: unguard(at(r, "MPN")),
    footprint: unguard(at(r, "Footprint")),
    side: at(r, "Side"),
    qty: at(r, "Qty"),
    note: unguard(at(r, "Note")),
  }));
}

/** Read a netlist: net name to members, in file order, and every name that heads more than one line. */
export function readNetText(text: string): { readonly nets: ReadonlyMap<string, readonly string[]>; readonly repeated: readonly string[] } {
  const nets = new Map<string, readonly string[]>();
  const repeated: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const words = line.split(/\s+/).filter((w) => w !== "");
    if (words.length === 0) continue;
    if (nets.has(words[0]!)) repeated.push(words[0]!);
    nets.set(words[0]!, words.slice(1));
  }
  return { nets, repeated };
}

/** The footprint a BOM row names for a catalog id: the KiCad library prefix `kicad:` dropped, any other id as is. */
export function bomFootprint(catalogId: string): string {
  const prefix = "kicad:";
  return catalogId.startsWith(prefix) ? catalogId.slice(prefix.length) : catalogId;
}
