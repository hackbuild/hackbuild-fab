// Scene slug-sheets (M07-T07 step 1): SLUG's laser sheets as a nest
// request. Data only, read from the pinned legacy page and never typed:
// the items are the PART_QTY names with their baked OUTLINES (slug.html
// line 272 and lines 1042 to 1050, the lines
// designs/slug/legacy/tools/extract-nest.mjs copies, read here as data;
// lineage slug.nest/slug-12),
// the stock of each from the ACRYLIC set (line 1051), and the sheet, gap
// and margin from the page's sheet controls (lines 174 to 177, the values
// buildSheets reads at lines 1147 and 1148). Kerf mode none: the page cuts
// with compensation off and leaves the 0.15 mm slip to the outlines (lines
// 1159 and 1160). Rotations 0 and 90: the shelf packer turns parts by a quarter only
// (line 1060). The items come from the legacy extraction until M10 gives
// SLUG a chase; then they move into its build.ts.
//
// This file imports node and types only, so Node strips it without a build.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import type { NestItem, NestRequest, Ring } from "@hackbuild/spec";
import type { SheetScene } from "../src/scene.js";

const PAGE = new URL("../../../designs/slug/legacy/slug.html", import.meta.url);
/** designs/slug/legacy/SHA256SUMS, the same pin extract-nest.mjs reads with. */
export const PAGE_SHA256 = "2d09238c27d5ca4bf023eeee44939b1500470ad2058822b8d0add48ec9bf3241";
const CITE = `designs/slug/legacy/slug.html (sha256 ${PAGE_SHA256.slice(0, 16)}, lineage slug.nest/slug-12)`;

/** The page's part data: baked outlines, quantities and the acrylic set. */
export interface SlugPage {
  readonly OUTLINES: Readonly<Record<string, number[][][]>>;
  readonly PART_QTY: Readonly<Record<string, number>>;
  readonly ACRYLIC: ReadonlySet<string>;
}

/** The pinned page's lines; a page that is not the pinned copy stops the load. */
function pageLines(): string[] {
  const bytes = readFileSync(PAGE);
  const sha = createHash("sha256").update(bytes).digest("hex");
  if (sha !== PAGE_SHA256) throw new Error(`scene slug-sheets: slug.html sha256 ${sha} is not the pinned ${PAGE_SHA256}`);
  return bytes.toString("utf8").split("\n");
}

/** The text of a page line after its marker, refused when the marker moved. */
function after(lines: readonly string[], line: number, marker: string): string {
  const text = lines[line - 1] ?? "";
  if (!text.startsWith(marker)) throw new Error(`scene slug-sheets: slug.html line ${line} does not start with ${marker}`);
  return text.slice(marker.length);
}

/**
 * The part data read as data from the page, the lines extract-nest.mjs
 * copies: OUTLINES is a JSON string on line 272, PART_QTY an object of
 * name:count pairs on lines 1042 to 1050, ACRYLIC a JSON array on line 1051.
 */
export function slugPage(): SlugPage {
  const lines = pageLines();
  const outlines = after(lines, 272, "const OUTLINES=JSON.parse('");
  if (!outlines.endsWith("');")) throw new Error("scene slug-sheets: slug.html line 272 does not end the OUTLINES string");
  const qtyText = [after(lines, 1042, "const PART_QTY={"), ...lines.slice(1042, 1050)].join("\n");
  if (!qtyText.trimEnd().endsWith("};")) throw new Error("scene slug-sheets: slug.html PART_QTY does not close on line 1050");
  const acrylic = after(lines, 1051, "const ACRYLIC=new Set(");
  return {
    OUTLINES: JSON.parse(outlines.slice(0, -3)) as Record<string, number[][][]>,
    PART_QTY: Object.fromEntries([...qtyText.matchAll(/(\w+):(\d+)/g)].map((m) => [m[1]!, Number(m[2])])),
    ACRYLIC: new Set(JSON.parse(acrylic.replace(/\);$/, "")) as string[]),
  };
}

/** One numeric sheet control of the page: `<input type="number" id="<id>" value="<v>"`, on the line given. */
function control(lines: readonly string[], line: number, id: string): number {
  const m = new RegExp(`id="${id}" value="([0-9.]+)"`).exec(lines[line - 1] ?? "");
  if (m === null) throw new Error(`scene slug-sheets: slug.html line ${line} has no number input ${id}`);
  return Number(m[1]);
}

/** Sheet width and height, gap and margin, mm, from the page's sheet controls. */
export function slugSheetControls(): { readonly sheet: readonly [number, number]; readonly gap: number; readonly margin: number } {
  const lines = pageLines();
  return { sheet: [control(lines, 174, "nW"), control(lines, 175, "nH")], gap: control(lines, 176, "nGap"), margin: control(lines, 177, "nMar") };
}

/** SLUG stocks: 3 mm ply throughout and 3 mm acrylic for the panes (BUILD.md line 4; params.json t 3). */
export const SLUG_STOCKS = { ply: "ply3", acrylic: "acrylic3" } as const;

/** Items for a quantity table, in its key order, every name with a baked outline. */
export function slugItems(page: SlugPage, qty: Readonly<Record<string, number>>): NestItem[] {
  return Object.keys(qty).filter((n) => page.OUTLINES[n] !== undefined).map((n): NestItem => ({
    id: n,
    rings: page.OUTLINES[n] as unknown as Ring[],
    qty: qty[n]!,
    stock: page.ACRYLIC.has(n) ? SLUG_STOCKS.acrylic : SLUG_STOCKS.ply,
  }));
}

/** The scene for a quantity table; slug-sheets passes the page's PART_QTY. */
export function slugScene(id: string, qty: Readonly<Record<string, number>>, page: SlugPage, qualifier: SheetScene["qualifier"], extra: readonly string[] = []): SheetScene {
  const c = slugSheetControls();
  const request: NestRequest = {
    items: slugItems(page, qty),
    sheet: [c.sheet[0], c.sheet[1]], margin: c.margin, gap: c.gap,
    mode: "legacy-shelf", rotations: [0, 90], partInPart: false, seed: 0,
  };
  return {
    id, request,
    // the 600 x 400 sheet machine of the profile (source "SLUG, OGEE sheets"); kerf null is fine in mode none
    machine: "sheet600",
    kerfMode: "none",
    // vertex for vertex, as the shipped sheets were cut (M07-T06 card defects: parity writes with arcs off)
    write: { arcs: false },
    prefix: "slug",
    labels: { [SLUG_STOCKS.ply]: "ply", [SLUG_STOCKS.acrylic]: "acrylic" },
    qualifier,
    sources: [
      `items: ${CITE} line 272 (OUTLINES) and lines 1042 to 1051 (PART_QTY, ACRYLIC), read as data`,
      `sheet, gap, margin: ${CITE} lines 174 to 177 (nW, nH, nGap, nMar), read by buildSheets at lines 1147 and 1148`,
      `kerf mode none: ${CITE} lines 1159 and 1160, cut with kerf compensation off`,
      "stocks ply3 and acrylic3: designs/slug/legacy/BUILD.md line 4, 3 mm ply throughout and 3 mm acrylic for the panes",
      ...extra,
    ],
  };
}

/** SLUG's sheets as shipped: the page's PART_QTY, 42 names and 63 pieces. */
export function slugSheetsScene(): SheetScene {
  const page = slugPage();
  return slugScene("slug-sheets", page.PART_QTY, page, "computed");
}
