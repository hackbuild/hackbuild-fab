// Scene ogee16-r16p-plates (M07-T08, D-186): the OGEE R16-P printed bill on
// 256 mm build plates, one part type per plate. The bill is derived from a
// `drive` parameter (knobs by default) and the array size N, never typed:
// each part type carries the instance rule of the printed viewer that
// places it (designs/ogee16/legacy/source/printed_viewer_template.html,
// cited per row), as a count c0 + c1 N + c2 N^2. N is read from the pinned
// params.scad (line 36). The test holds the result to build_plate.py's QTY
// (lines 5 to 12), the PARTS baked into ogee16-plate.html and the closed
// forms of D-186; this file reads none of them.
//
// Parts load through the imported mesh route (M02, D-053): each type is its
// shipped print STL (designs/ogee16/legacy/out/print/<id>.stl, pinned in
// ../../../designs/ogee16/legacy/SHA256SUMS), welded on the 1/1024 mm grid
// and parked on z 0 at the origin; its footprint is the XY bounds (the
// build_plate.py rule, lines 43 to 52). Bed: machine centauri, read from the
// profile (256 x 256 x 256, vendor). Margin 10 and gap 4 are the plate
// page's packer settings (plate_template.html lines 263 and 178), the
// rotations its two turns (line 274), the order its area sort (line 313).
// Items stay here until M10 gives OGEE16 a chase; then they move into its
// build.ts.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import type { NestItem, NestRequest, ProfileLookup } from "@hackbuild/spec";
import { bounds, importStl } from "@hackbuild/mesh";
import type { PlatePart, PlateScene } from "../src/plates.js";

const LEGACY = new URL("../../../designs/ogee16/legacy/", import.meta.url);
const SOURCE_ZIP = "ogee16-source.zip (sha256 47d6077e0596eb4e)";

/** Pins of the source files read here, from designs/ogee16/legacy/SHA256SUMS. */
const PINS = {
  "source/params.scad": "1c0a4b898b4977d87d435273a04857111fab5d43324bee591c2a6ad641591d6d",
  "source/plate_template.html": "59507bfae682869fb87d9ff5d6aa59fe2746f51ece249359ab69b223290f04bf",
} as const;

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

function readPinned(rel: keyof typeof PINS | string, sha256: string): Buffer {
  const bytes = readFileSync(new URL(rel, LEGACY));
  const got = createHash("sha256").update(bytes).digest("hex");
  if (got !== sha256) throw new Error(`scene ogee16-r16p-plates: ${rel} sha256 ${got} is not the pinned ${sha256}`);
  return bytes;
}

/** The text of a pinned file's line after its marker, refused when the marker moved. */
function lineAfter(rel: keyof typeof PINS, line: number, marker: string): string {
  const text = readPinned(rel, PINS[rel]).toString("utf8").split("\n")[line - 1] ?? "";
  if (!text.startsWith(marker)) throw new Error(`scene ogee16-r16p-plates: ${rel} line ${line} does not start with ${marker}`);
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
  return leadNumber("source/params.scad", 36, lineAfter("source/params.scad", 36, "N        ="));
}

/** The plate page's margin and default gap, mm: `const MARGIN = 10;` (line 263) and `let gap = 4, cur = 0;` (line 178). */
export function plateSettings(): { readonly margin: number; readonly gap: number } {
  return {
    margin: leadNumber("source/plate_template.html", 263, lineAfter("source/plate_template.html", 263, "const MARGIN =")),
    gap: leadNumber("source/plate_template.html", 178, lineAfter("source/plate_template.html", 178, "let gap =")),
  };
}

/** Pins of the shipped print STLs, from designs/ogee16/legacy/SHA256SUMS. */
function stlPins(): ReadonlyMap<string, string> {
  const pins = new Map<string, string>();
  for (const line of readFileSync(new URL("SHA256SUMS", LEGACY), "utf8").split("\n")) {
    const m = /^([0-9a-f]{64}) {2}out\/print\/([a-z_]+)\.stl$/.exec(line);
    if (m !== null) pins.set(m[2]!, m[1]!);
  }
  return pins;
}

/** One part type through the imported route, parked on z 0 at the origin. */
export function loadPart(id: string, pins: ReadonlyMap<string, string> = stlPins()): PlatePart {
  const pin = pins.get(id);
  if (pin === undefined) throw new Error(`scene ogee16-r16p-plates: out/print/${id}.stl is not pinned in SHA256SUMS`);
  const rel = `out/print/${id}.stl`;
  const body = importStl(new Uint8Array(readPinned(rel, pin)), `designs/ogee16/legacy/${rel}`);
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
  const pins = stlPins();
  const bill = billOf(drive, n);
  const parts = bill.map(([id]) => loadPart(id, pins));
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
      "parts: designs/ogee16/legacy/out/print/<id>.stl (ogee16-print-stl.zip, sha256 855ffe7c28c139e5), imported route, footprint the XY bounds parked at the origin (build_plate.py lines 43 to 52)",
      `bed: profile machine ${machine} envelope ${env[0]} x ${env[1]} x ${env[2]} mm (vendor, PROFILE.md 8)`,
      "margin, gap, rotations and order: plate_template.html lines 263, 178, 274 and 313 (lineage ogee16.packone/r16p)",
      "stock petg: the R16-P prints in PETG (knowledge/designs/ogee16.md section 2, notes/PRINT.md)",
    ],
  };
}
