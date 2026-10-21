// Scene ogee16-r16p-plates (M07-T08, D-186): the OGEE R16-P printed bill on
// 256 mm build plates, one part type per plate. The bill is derived from a
// `drive` parameter (knobs by default) and the array size N, never typed:
// each part type carries the instance rule of the printed viewer that
// places it (printed_viewer_template.html of ogee16-source.zip, cited per
// row), as a count c0 + c1 N + c2 N^2. N is read from params.scad line 36,
// stored as inputs/ogee16-r16p-plates/params-scad-36.txt. The test holds the result to build_plate.py's QTY
// (lines 5 to 12), the PARTS baked into ogee16-plate.html and the closed
// forms of D-186; this file reads none of them.
//
// Parts load through the imported mesh route (M02, D-053): each type is its
// shipped print STL, stored as inputs/ogee16-r16p-plates/print/<id>.stl
// (members of ogee16-print-stl.zip, lineage ogee16.print-stl), welded on the 1/1024 mm grid
// and parked on z 0 at the origin; its footprint is the XY bounds (the
// build_plate.py rule, lines 43 to 52). Bed: machine centauri, read from the
// profile (256 x 256 x 256, vendor). Margin 10 and gap 4 are the plate
// page's packer settings (plate_template.html lines 263 and 178, stored as
// plate-template-263.txt and plate-template-178.txt), the
// rotations its two turns (line 274), the order its area sort (line 313).
// Items stay here until M10 gives OGEE16 a chase; then they move into its
// build.ts. Every file read here is a stored input
// (inputs/stored-inputs.json, its sha256 held by
// tools/test-support/stored-inputs.test.ts); no legacy folder is read.

import { existsSync, readFileSync } from "node:fs";
import type { NestItem, NestRequest, ProfileLookup } from "@hackbuild/spec";
import { bounds, importStl } from "@hackbuild/mesh";
import type { PlatePart, PlateScene } from "../src/plates.js";

/** The stored inputs of this scene: source lines and print STLs. */
export const PLATES_INPUTS = new URL("inputs/ogee16-r16p-plates/", import.meta.url);
const SOURCE_ZIP = "ogee16-source.zip (sha256 47d6077e0596eb4e)";

export type Drive = "knobs" | "servos";
export const DRIVES: readonly Drive[] = ["knobs", "servos"];

/** Which drive a type belongs to; common types print for both. */
export type DriveSet = "common" | Drive;

/** One printed part type and the viewer instances that give its count. */
export interface InstanceRule {
  /** Part id: the print STL stem and the build_plate.py name. */
  readonly id: string;
  readonly drive: DriveSet;
  /** count = c0 + c1 N + c2 N^2 */
  readonly c0: number;
  readonly c1: number;
  readonly c2: number;
  /** The instances, file and lines. */
  readonly where: string;
}

const V = "printed_viewer_template.html";
const one = (id: string, drive: DriveSet, where: string, c0 = 1): InstanceRule => ({ id, drive, c0, c1: 0, c2: 0, where });

/**
 * The printed build's instance rules, in build_plate.py QTY order (common,
 * then knob drive, then servo drive), so each plate keeps the page's plate
 * order. drivepin: every pinned crank seats one (printed.scad lines 339,
 * 354, 418, 422 and 434), 2N bar cranks plus the latch crank, and the bill
 * lists it with the common parts (build_plate.py line 8). With knobs the
 * latch is a pulled tab and only the 2N shaft cranks carry a pin, so the
 * knob bill holds one pin no knob assembly seats (M07-T08 card defects).
 */
export const INSTANCE_RULES: readonly InstanceRule[] = [
  one("base", "common", `${V} line 189`),
  one("face_asm", "common", `${V} line 198`),
  one("deck", "common", `${V} line 197`),
  one("latch_asm", "common", `${V} line 199`),
  one("wall_xp", "common", `${V} line 191`),
  one("wall_xn", "common", `${V} line 190`),
  one("wall_yp", "common", `${V} line 193`),
  one("wall_yn", "common", `${V} line 192`),
  one("rail", "common", `${V} lines 194 to 196, two rails`, 2),
  { id: "rowbar_asm", drive: "common", c0: 0, c1: 1, c2: 0, where: `${V} lines 204 to 207, one per row` },
  { id: "colbar_asm", drive: "common", c0: 0, c1: 1, c2: 0, where: `${V} lines 208 to 211, one per column` },
  { id: "link", drive: "common", c0: 0, c1: 0, c2: 1, where: `${V} line 213, one per cell` },
  { id: "rod", drive: "common", c0: 0, c1: 0, c2: 1, where: `${V} line 214, one per cell` },
  { id: "cap", drive: "common", c0: 0, c1: 0, c2: 1, where: `${V} line 215, one per cell` },
  { id: "pivot", drive: "common", c0: 0, c1: 0, c2: 2, where: `${V} lines 216 to 219, two per cell (pivR, pivC)` },
  { id: "drivepin", drive: "common", c0: 1, c1: 2, c2: 0, where: "printed.scad lines 339 and 354 (shaft cranks), 418 and 422 (bar cranks), 434 (latch crank); listed common at build_plate.py line 8" },
  { id: "shaft_row", drive: "knobs", c0: 0, c1: 1, c2: 0, where: `${V} lines 261 and 262, one per row` },
  { id: "shaft_col", drive: "knobs", c0: 0, c1: 1, c2: 0, where: `${V} lines 271 and 272, one per column` },
  { id: "knob", drive: "knobs", c0: 0, c1: 2, c2: 0, where: `${V} lines 263 to 266 and 273 to 276, one per shaft` },
  one("latchpull", "knobs", `${V} line 200`),
  one("svbracket_row", "servos", `${V} line 251`),
  one("svbracket_col", "servos", `${V} line 252`),
  one("latchtower", "servos", `${V} line 253`),
  { id: "crank", drive: "servos", c0: 0, c1: 2, c2: 0, where: `${V} lines 258 to 260 and 268 to 270, one per bar` },
  one("crank_latch", "servos", `${V} line 254`),
];

/** Count of one rule at array size N. */
export const countOf = (r: InstanceRule, n: number): number => r.c0 + r.c1 * n + r.c2 * n * n;

/** The bill of one drive at array size N: [id, count] in rule order, zero counts dropped. */
export function billOf(drive: Drive, n: number): readonly (readonly [string, number])[] {
  return INSTANCE_RULES.filter((r) => r.drive === "common" || r.drive === drive)
    .map((r) => [r.id, countOf(r, n)] as const)
    .filter(([, q]) => q > 0);
}

/** A source line stored as one file: `<stem>-<line>.txt`, the line and its newline. */
type StoredLine = "params-scad" | "plate-template";
const STORED_OF: Readonly<Record<StoredLine, string>> = { "params-scad": "params.scad", "plate-template": "plate_template.html" };

/** The text of a stored source line after its marker, refused when the marker moved. */
function lineAfter(stem: StoredLine, line: number, marker: string): string {
  const text = readFileSync(new URL(`${stem}-${line}.txt`, PLATES_INPUTS), "utf8").replace(/\n$/, "");
  if (!text.startsWith(marker)) throw new Error(`scene ogee16-r16p-plates: ${STORED_OF[stem]} line ${line} does not start with ${marker}`);
  return text.slice(marker.length);
}

/** Leading number of a line remainder, refused when there is none. */
function leadNumber(rel: string, line: number, rest: string): number {
  const m = /^\s*([0-9.]+)/.exec(rest);
  if (m === null) throw new Error(`scene ogee16-r16p-plates: ${rel} line ${line} carries no number`);
  return Number(m[1]);
}

/** The array size N, params.scad line 36 (`N        = 4;`). */
export function arraySize(): number {
  return leadNumber("params.scad", 36, lineAfter("params-scad", 36, "N        ="));
}

/** The plate page's margin and default gap, mm: `const MARGIN = 10;` (line 263) and `let gap = 4, cur = 0;` (line 178). */
export function plateSettings(): { readonly margin: number; readonly gap: number } {
  return {
    margin: leadNumber("plate_template.html", 263, lineAfter("plate-template", 263, "const MARGIN =")),
    gap: leadNumber("plate_template.html", 178, lineAfter("plate-template", 178, "let gap =")),
  };
}

/** One part type through the imported route, parked on z 0 at the origin. */
export function loadPart(id: string): PlatePart {
  const url = new URL(`print/${id}.stl`, PLATES_INPUTS);
  if (!existsSync(url)) throw new Error(`scene ogee16-r16p-plates: print/${id}.stl is not a stored input of this scene`);
  const body = importStl(new Uint8Array(readFileSync(url)), `print/${id}.stl`);
  const [lo, hi] = bounds(body.mesh);
  const positions = body.mesh.positions.map((v, i) => v - lo[i % 3]!);
  return { id, mesh: { positions, triangles: body.mesh.triangles }, w: hi[0] - lo[0], d: hi[1] - lo[1], h: hi[2] - lo[2] };
}

/** The scene for one drive; knobs is the default (D-186). */
export function ogee16PlatesScene(profile: ProfileLookup, drive: Drive = "knobs", gap: number | "auto" = plateSettings().gap): PlateScene {
  const machine = "centauri";
  const env = profile.machine(machine).envelope;
  if (!Array.isArray(env)) throw new Error(`scene ogee16-r16p-plates: machine ${machine} has no 3 axis envelope`);
  const n = arraySize();
  const bill = billOf(drive, n);
  const parts = bill.map(([id]) => loadPart(id));
  const items: NestItem[] = bill.map(([id, qty], i): NestItem => {
    const p = parts[i]!;
    return { id, rings: [[[0, 0], [p.w, 0], [p.w, p.d], [0, p.d]]], qty, stock: "petg" };
  });
  const request: NestRequest = {
    items, sheet: [env[0], env[1]], margin: plateSettings().margin, gap,
    mode: "fill", rotations: [0, 90], partInPart: false, seed: 0,
    packer: "maxrects-bssf", order: "area", groupBy: "type",
  };
  return {
    id: "ogee16-r16p-plates", request, machine, parts, qualifier: "computed",
    sources: [
      `bill: instance rules of printed_viewer_template.html and printed.scad (${SOURCE_ZIP}), drive ${drive}, N ${n} from params.scad line 36`,
      "parts: fab-knowledge:originals/ogee16/files/exports/ogee16-print-stl.zip member print/<id>.stl (sha256 855ffe7c28c139e5), imported route, footprint the XY bounds parked at the origin (build_plate.py lines 43 to 52)",
      `bed: profile machine ${machine} envelope ${env[0]} x ${env[1]} x ${env[2]} mm (vendor, PROFILE.md 8)`,
      "margin, gap, rotations and order: plate_template.html lines 263, 178, 274 and 313 (lineage ogee16.packone/r16p)",
      "stock petg: the R16-P prints in PETG (knowledge/designs/ogee16.md section 2, notes/PRINT.md)",
    ],
  };
}
