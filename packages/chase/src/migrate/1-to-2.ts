// Chase schema 1 to 2 (D-131, D-132, D-173, D-174; M10-T03 step 1). Schema 1
// is the handoff spec (hbf/spec/chase.ts): `meta.chase: 1`, one
// `meta.machine`, `ExportDecl.gated`, enum options as strings, layout on
// the chase. Every change is a line of the report; nothing changes
// silently. Running it on a schema 2 document is the caller's mistake, so
// index.ts never does.

import { EXPORT_ALIASES } from "@hackbuild/spec";

export interface MigrationLine {
  /** JSON pointer in the schema 1 document. */
  readonly pointer: string;
  readonly change: "converted" | "dropped" | "filled" | "moved" | "set";
  readonly from?: unknown;
  readonly to?: unknown;
  /** One line, lowercase: why the change was made. */
  readonly why: string;
}

export interface Migrated {
  readonly doc: Record<string, unknown>;
  readonly lines: MigrationLine[];
  /** Layout fields that left the chase for bench.ts (D-174), by key. */
  readonly bench: Record<string, unknown>;
}

type Obj = Record<string, unknown>;
const isPlain = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** Exports that make a board: those designs are CERN-OHL-W-2.0, every other CC-BY-SA-4.0 (D-041). */
const BOARD_EXPORTS: ReadonlySet<string> = new Set(["gerbers", "kicad"]);
const BOARD_LICENSE = "CERN-OHL-W-2.0";
const DESIGN_LICENSE = "CC-BY-SA-4.0";

/** Keys a schema 1 chase carried that bench.ts holds from schema 2 (D-174). */
const LAYOUT_KEYS = ["views", "rail", "status", "slots", "welcome"] as const;

function fields(list: unknown, base: string, lines: MigrationLine[]): void {
  arr(list).forEach((f, i) => {
    if (!isPlain(f)) return;
    const p = `${base}/${i}`;
    if (typeof f["label"] !== "string") {
      f["label"] = f["id"];
      lines.push({ pointer: `${p}/label`, change: "filled", to: f["id"], why: "schema 2 requires a label; set to the field id" });
    }
    if (f["type"] === "enum" && arr(f["options"]).some((o) => typeof o === "string")) {
      const from = f["options"];
      f["options"] = arr(from).map((o) => (typeof o === "string" ? { value: o, label: o } : o));
      lines.push({ pointer: `${p}/options`, change: "converted", from, to: f["options"], why: "enum options are {value, label}; label set to the value" });
    }
    if (f["type"] === "list") fields(f["item"], `${p}/item`, lines);
    if (f["type"] === "instances" && isPlain(f["types"])) {
      for (const [k, t] of Object.entries(f["types"])) if (isPlain(t)) fields(t["fields"], `${p}/types/${k}/fields`, lines);
    }
  });
}

export function migrate1to2(input: unknown): Migrated {
  // JSON round trip: a chase document is JSON data, and the input stays untouched.
  const doc: Obj = isPlain(input) ? (JSON.parse(JSON.stringify(input)) as Obj) : {};
  const lines: MigrationLine[] = [];
  const bench: Obj = {};
  const meta: Obj = isPlain(doc["meta"]) ? doc["meta"] : {};
  doc["meta"] = meta;

  if (typeof meta["machine"] === "string" && meta["machines"] === undefined) {
    meta["machines"] = [meta["machine"]];
    lines.push({ pointer: "/meta/machine", change: "converted", from: meta["machine"], to: meta["machines"], why: "machine became machines, first is the default (D-132)" });
  } else if (meta["machine"] !== undefined) {
    lines.push({ pointer: "/meta/machine", change: "dropped", from: meta["machine"], why: "machines is already set (D-132)" });
  }
  delete meta["machine"];
  if (meta["shell"] !== undefined) {
    bench["shell"] = meta["shell"];
    lines.push({ pointer: "/meta/shell", change: "moved", from: meta["shell"], why: "the shell is layout and lives in bench.ts (D-174)" });
    delete meta["shell"];
  }
  for (const k of LAYOUT_KEYS) {
    if (doc[k] === undefined) continue;
    bench[k] = doc[k];
    lines.push({ pointer: `/${k}`, change: "moved", from: doc[k], why: `${k} is layout and lives in bench.ts (D-174)` });
    delete doc[k];
  }
  if (doc["checks"] !== undefined) {
    lines.push({ pointer: "/checks", change: "dropped", from: doc["checks"], why: "a chase never selects checks; the registry runs every check whose appliesTo matches (D-173)" });
    delete doc["checks"];
  }

  arr(doc["exports"]).forEach((e, i) => {
    if (!isPlain(e)) return;
    if (e["gated"] !== undefined) {
      lines.push({ pointer: `/exports/${i}/gated`, change: "dropped", from: e["gated"], why: "gating comes from ExporterDef.fabrication, never the chase (D-132)" });
      delete e["gated"];
    }
    const kind = e["kind"];
    if (typeof kind === "string" && Object.prototype.hasOwnProperty.call(EXPORT_ALIASES, kind)) {
      e["kind"] = EXPORT_ALIASES[kind as keyof typeof EXPORT_ALIASES];
      lines.push({ pointer: `/exports/${i}/kind`, change: "converted", from: kind, to: e["kind"], why: "export kind through EXPORT_ALIASES (D-128)" });
    }
  });

  arr(doc["params"]).forEach((g, gi) => {
    if (!isPlain(g)) return;
    fields(g["fields"], `/params/${gi}/fields`, lines);
    fields(g["readouts"], `/params/${gi}/readouts`, lines);
  });

  const build = doc["build"];
  if (isPlain(build) && typeof build["module"] === "string" && /^\.\/[^.]+$/.test(build["module"])) {
    const from = build["module"];
    build["module"] = `${from}.ts`;
    lines.push({ pointer: "/build/module", change: "converted", from, to: build["module"], why: "the module path names the .ts source inside the design directory (D-178)" });
  }

  if (typeof meta["license"] !== "string" || meta["license"] === "") {
    const board = arr(doc["exports"]).some((e) => isPlain(e) && typeof e["kind"] === "string" && BOARD_EXPORTS.has(e["kind"]));
    meta["license"] = board ? BOARD_LICENSE : DESIGN_LICENSE;
    lines.push({ pointer: "/meta/license", change: "filled", to: meta["license"], why: board ? "exports a board (gerbers or kicad), CERN-OHL-W-2.0 (D-041)" : "a printable design, CC-BY-SA-4.0 (D-041)" });
  }
  lines.push({ pointer: "/meta/chase", change: "set", from: meta["chase"], to: 2, why: "schema version 2" });
  meta["chase"] = 2;
  return { doc, lines, bench };
}
