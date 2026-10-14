// Text to outlines for the node painter (OK-01): the font outline route the
// vector surface lacked. COLLAR sets inlay text with canvas fillText over
// fonts loaded from Google Fonts (collar.html:9, 1010 to 1072); node has no
// canvas, so the faces are read from the vendored woff2 files once, by
// scripts/fonts.mjs, into the committed table plex-mono.table.ts, and set
// here from that table with no font file, no DOM and no clock. One string,
// font and size give the same rings on every machine.
//
// Placement follows the canvas calls the ui-core canvas surface issues for
// the same TextDraw, in model terms (y up): the run starts `along` mm along
// the baseline, or is centred there for align "center"; letter spacing is
// added after every character, as canvas letterSpacing adds it, and counts
// in the measured width; the frame is rotated `rot` radians counter-clockwise
// about (x, y). There is no kerning: the Plex Mono GPOS carries mark
// positioning only (read with fontTools 4.66.1), so advances are the hmtx
// widths. Shaping is one glyph per code point; GSUB ccmp, which the browser
// applies, changes nothing for precomposed Latin-1 text.

import { commandError, type Ring } from "@hackbuild/spec";
import { PLEX_MONO_400, PLEX_MONO_700 } from "./plex-mono.table.js";

/**
 * One face as the table stores it. Contours are TrueType points flattened
 * to [x, y, on, x, y, on, ...] in font units, composites already resolved;
 * `on` is 1 on the curve and 0 for a quadratic control point.
 */
export interface FaceTable {
  /** CSS family name the layer's `font` names. */
  readonly family: string;
  /** CSS weight, "400" or "700". */
  readonly weight: string;
  /** Where the outlines came from: file and sha256 of the vendored woff2. */
  readonly source: { readonly file: string; readonly sha256: string };
  readonly unitsPerEm: number;
  readonly ascender: number;
  readonly descender: number;
  readonly capHeight: number;
  /** Code point to [advance, contours]. */
  readonly glyphs: Readonly<Record<number, readonly [number, readonly (readonly number[])[]]>>;
}

/** Faces the node surface can set, in table order. */
export const TEXT_FACES: readonly FaceTable[] = [PLEX_MONO_400, PLEX_MONO_700];

/**
 * Points per quadratic segment: the path layer's quadratic count
 * (vector-surface PATH_CURVE_POINTS.quad, the KEYWAY svgpath.py rule), so a
 * glyph and a logo curve flatten alike.
 */
export const GLYPH_QUAD_POINTS = 10;

export interface TextPlacement {
  /** "left" puts the run's start at the origin, "center" its middle. */
  readonly align?: "left" | "center";
  /** mm along the rotated baseline from the origin. */
  readonly along?: number;
  /** "middle" sets the middle of the em box (hhea ascender and descender) on the origin. */
  readonly baseline?: "alphabetic" | "middle";
  /** mm after every character. */
  readonly spacing?: number;
}

function noFace(font: string): Error {
  const have = TEXT_FACES.map((f) => (f.weight === "400" ? f.family : `${f.weight} ${f.family}`));
  return commandError({
    code: "E_KERNEL", path: "/font", got: font, expected: `one of ${have.join(", ")}`, record: "kernels/art-inlay",
    hint: `node sets text only in the vendored faces; set font to ${TEXT_FACES[0]!.family} (bold for weight 700)`,
  });
}

/** The face a surface font string names: CSS weight then family, as inlay textFont writes it ("700 IBM Plex Mono"). */
export function textFace(font: string): FaceTable {
  const m = /^(?:(\d{3}) )?["']?(.+?)["']?$/.exec(font.trim());
  if (m === null) throw noFace(font);
  const weight = m[1] ?? "400";
  const family = m[2]!.toLowerCase();
  const face = TEXT_FACES.find((f) => f.weight === weight && f.family.toLowerCase() === family);
  if (face === undefined) throw noFace(font);
  return face;
}

function glyphOf(face: FaceTable, ch: string, text: string): readonly [number, readonly (readonly number[])[]] {
  const g = face.glyphs[ch.codePointAt(0)!];
  if (g === undefined) {
    throw commandError({
      code: "E_SCHEMA", path: "/text", got: text, expected: `characters ${face.family} ${face.weight} carries (printable ASCII and Latin-1)`,
      record: "kernels/art-inlay",
      hint: `character ${JSON.stringify(ch)} (U+${ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}) has no glyph; remove it or spell it in ASCII`,
    });
  }
  return g;
}

/** Advance width in mm of `text` at `sizeMm` (the em size), spacing added after each character. */
export function measureText(text: string, font: string, sizeMm: number, spacing = 0): number {
  const face = textFace(font);
  const s = sizeMm / face.unitsPerEm;
  let w = 0;
  for (const ch of text) w += glyphOf(face, ch, text)[0] * s + spacing;
  return w;
}

/**
 * Rings of one TrueType contour in font units. Runs of off-curve points
 * become quadratics split at implied midpoints; a contour with no on-curve
 * point starts at the midpoint of its last and first points.
 */
export function contourRing(flat: readonly number[], n = GLYPH_QUAD_POINTS): [number, number][] {
  const pts: { x: number; y: number; on: boolean }[] = [];
  for (let i = 0; i + 2 < flat.length; i += 3) pts.push({ x: flat[i]!, y: flat[i + 1]!, on: flat[i + 2] === 1 });
  const m = pts.length;
  if (m === 0) return [];
  let first = pts.findIndex((p) => p.on);
  let start: { x: number; y: number };
  if (first < 0) {
    const a = pts[m - 1]!, b = pts[0]!;
    start = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    first = 0;
  } else {
    start = pts[first]!;
    first += 1;
  }
  const out: [number, number][] = [[start.x, start.y]];
  let cur = start;
  let ctrl: { x: number; y: number } | null = null;
  const quad = (c: { x: number; y: number }, e: { x: number; y: number }): void => {
    for (let k = 1; k <= n; k++) {
      const t = k / n, u = 1 - t;
      out.push([u * u * cur.x + 2 * u * t * c.x + t * t * e.x, u * u * cur.y + 2 * u * t * c.y + t * t * e.y]);
    }
    cur = e;
  };
  for (let k = 0; k < m; k++) {
    const p = pts[(first + k) % m]!;
    if (p.on) {
      if (ctrl === null) {
        out.push([p.x, p.y]);
        cur = p;
      } else {
        quad(ctrl, p);
        ctrl = null;
      }
    } else if (ctrl === null) {
      ctrl = p;
    } else {
      quad(ctrl, { x: (ctrl.x + p.x) / 2, y: (ctrl.y + p.y) / 2 });
      ctrl = p;
    }
  }
  if (ctrl !== null) quad(ctrl, start);
  // The walk ends back on the start point; a ring does not repeat its first vertex.
  const last = out[out.length - 1]!;
  if (out.length > 1 && last[0] === start.x && last[1] === start.y) out.pop();
  return out;
}

/**
 * Outlines of `text` in model mm, one ring set per glyph (each fills even-odd
 * on its own, so counters are holes and neighbours never cancel). The frame
 * origin is (x, y), rotated `rot` radians counter-clockwise.
 */
export function textRings(text: string, font: string, sizeMm: number, x: number, y: number, rot: number, o: TextPlacement = {}): Ring[][] {
  const face = textFace(font);
  const s = sizeMm / face.unitsPerEm;
  const spacing = o.spacing ?? 0;
  const width = measureText(text, font, sizeMm, spacing);
  const x0 = (o.along ?? 0) - (o.align === "center" ? width / 2 : 0);
  const y0 = o.baseline === "middle" ? -((face.ascender + face.descender) / 2) * s : 0;
  const c = rot === 0 ? 1 : Math.cos(rot);
  const sn = rot === 0 ? 0 : Math.sin(rot);
  const out: Ring[][] = [];
  let pen = x0;
  for (const ch of text) {
    const [adv, contours] = glyphOf(face, ch, text);
    const rings: Ring[] = [];
    for (const contour of contours) {
      const ring = contourRing(contour).map(([gx, gy]): [number, number] => {
        const lx = pen + gx * s, ly = y0 + gy * s;
        return [x + c * lx - sn * ly, y + sn * lx + c * ly];
      });
      if (ring.length >= 3) rings.push(ring);
    }
    if (rings.length > 0) out.push(rings);
    pen += adv * s + spacing;
  }
  return out;
}
