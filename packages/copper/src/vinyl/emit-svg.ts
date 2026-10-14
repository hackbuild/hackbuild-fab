// Layer SVG emit for cut sheets, ported from gen_keyway.py lines 295 to 323
// (the same in all seven boards): every ring simplified at 0.012 mm, y
// flipped to H - y, 3 decimals, one M ... Z per ring, evenodd fill, and a
// document of W x H mm with a matching viewBox. Every layer of a board
// carries the shared rim, so all report one document size.

import { douglasPeucker, type Section } from "@hackbuild/geom";
import type { Mm, Ring } from "@hackbuild/spec";

export interface PathOptions {
  /** Document height, mm; y is written as H - y. */
  readonly H: Mm;
  /** Write the ring's closing vertex again before Z, as KEYWAY's poly_path does (ring.coords); the later boards drop it. */
  readonly repeatClose?: boolean;
  /** Simplify tolerance, mm; profile vinyl.emitTolerance (gen_keyway.py line 298). */
  readonly tolerance: Mm;
}

/** One ring simplified, closed by its first point; a ring the tolerance would collapse is kept whole. */
export function simplifyRing(r: Ring, tol: Mm): Ring {
  const closed = [...r, r[0]!];
  const kept = douglasPeucker(closed.map(([x, y]) => [x, y] as [number, number]), tol);
  return kept.length >= 4 ? kept.slice(0, -1).map(([x, y]) => [x, y] as const) : r;
}

const f3 = (v: number): string => {
  const s = v.toFixed(3);
  return s === "-0.000" ? "0.000" : s;
};

/** poly_path: the path data of a region, or "" when it is empty. */
export function polyPath(s: Section, opts: PathOptions): string {
  if (s.isEmpty()) return "";
  const tol = opts.tolerance;
  const out: string[] = [];
  for (const r of s.rings) {
    const ring = simplifyRing(r, tol);
    const pts = opts.repeatClose === true ? [...ring, ring[0]!] : ring;
    out.push(`M ${pts.map(([x, y]) => `${f3(x)} ${f3(opts.H - y)}`).join(" L ")} Z`);
  }
  return out.join(" ");
}

/** One drawn region: fill colour or none, opacity, stroke, stroke width (negative draws dashed 1.6 1.2). */
export interface SvgItem {
  readonly geom: Section;
  readonly fill: string | null;
  readonly opacity: number;
  readonly stroke: string | null;
  readonly strokeWidth: number;
}

export interface SvgDoc {
  readonly W: Mm;
  readonly H: Mm;
  readonly title: string;
  readonly items: readonly SvgItem[];
  /** Outline filled under every item (the guide sticker's cream ground). */
  readonly bg?: { readonly outline: Section; readonly fill: string };
  readonly repeatClose?: boolean;
  /** Simplify tolerance, mm. */
  readonly tolerance: Mm;
  /**
   * keyway: W x H at 3 decimals, title and body on their own lines and a
   * closing newline (gen_keyway.py lines 320 to 322); compact: 1 decimal,
   * one line, no closing newline (gen_vernier.py lines 313 to 316 and the
   * same in QUADRANT to STAVE).
   */
  readonly style?: "keyway" | "compact";
}

/** svg(): the document text, byte for byte the generator's layout. */
export function svgDoc(doc: SvgDoc): string {
  const popts: PathOptions = { H: doc.H, tolerance: doc.tolerance, ...(doc.repeatClose === undefined ? {} : { repeatClose: doc.repeatClose }) };
  const body: string[] = [];
  if (doc.bg !== undefined) body.push(`<path d="${polyPath(doc.bg.outline, popts)}" fill="${doc.bg.fill}"/>`);
  for (const it of doc.items) {
    const d = polyPath(it.geom, popts);
    if (d.length === 0) continue;
    let a = `d="${d}" fill-rule="evenodd" fill="${it.fill ?? "none"}"`;
    if (it.opacity !== 1) a += ` fill-opacity="${it.opacity.toFixed(2)}"`;
    if (it.stroke !== null) {
      a += ` stroke="${it.stroke}" stroke-width="${Math.abs(it.strokeWidth).toFixed(3)}" stroke-linejoin="round"`;
      if (it.strokeWidth < 0) a += ' stroke-dasharray="1.6 1.2"';
    }
    body.push(`<path ${a}/>`);
  }
  if (doc.style === "compact") {
    const w = doc.W.toFixed(1), h = doc.H.toFixed(1);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}"><title>${doc.title}</title>${body.join("")}</svg>`;
  }
  const w = doc.W.toFixed(3), h = doc.H.toFixed(3);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}">\n<title>${doc.title}</title>\n${body.join("\n")}\n</svg>\n`;
}

const SIZE = /<svg[^>]*\swidth="([\d.]+)mm"\s+height="([\d.]+)mm"/;

/** The W x H a layer document reports, read back from its text; null when the header is missing. */
export function docSize(svg: string): readonly [number, number] | null {
  const m = SIZE.exec(svg);
  return m === null ? null : [Number(m[1]), Number(m[2])];
}
