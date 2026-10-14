// WOFF2 font reader, the one home for outline type in the workspace. Moved
// from packages/copper/src/vinyl/font.ts (M05-T14), where the KEYWAY
// family's outlined type was proved equal to fontTools on every printable
// ASCII glyph of Plex Mono 400, 600 and 700; copper re-exports it. It reads
// the WOFF2 container (W3C WOFF2, section 4 to 5), the transformed glyf
// stream (section 5.1, the triplet encoding of the reference decoder),
// composite glyphs flattened as fontTools Glyph.getCoordinates does, cmap
// formats 4 and 12, hmtx, head, hhea, maxp and OS/2.
//
// Brotli is not decoded here: the tier 0 kernel stays free of node and DOM
// modules, so the caller passes the decompressor (node:zlib
// brotliDecompressSync on the CLI, in tests and in the font table script).

import { commandError } from "@hackbuild/spec";

/** One outline point in font units; on is the TrueType on-curve flag. */
export interface FontPoint {
  readonly x: number;
  readonly y: number;
  readonly on: boolean;
}

export interface Glyph {
  /** Contours in font units, already shifted by lsb minus xMin as fontTools draws them; a composite's components flattened. */
  readonly contours: readonly (readonly FontPoint[])[];
  /** Built from other glyphs (in Plex Mono latin: the double quote, colon and semicolon). */
  readonly composite: boolean;
  /** Advance width, font units. */
  readonly advance: number;
}

export interface Font {
  readonly unitsPerEm: number;
  /** OS/2 sCapHeight, font units; 0 when the table is older than version 2. */
  readonly capHeight: number;
  /** hhea ascender and descender, font units; the descender is negative. */
  readonly ascender: number;
  readonly descender: number;
  /** Glyph id for a code point, the best cmap subtable as fontTools getBestCmap picks it. */
  glyphId(codePoint: number): number | undefined;
  glyph(id: number): Glyph;
}

export type BrotliDecompress = (compressed: Uint8Array) => Uint8Array;

/** WOFF2 known table tags, index = flags & 63 (WOFF2 section 4.2). */
const KNOWN_TAGS = [
  "cmap", "head", "hhea", "hmtx", "maxp", "name", "OS/2", "post", "cvt ", "fpgm", "glyf", "loca", "prep", "CFF ", "VORG", "EBDT",
  "EBLC", "gasp", "hdmx", "kern", "LTSH", "PCLT", "VDMX", "vhea", "vmtx", "BASE", "GDEF", "GPOS", "GSUB", "EBSC", "JSTF", "MATH",
  "CBDT", "CBLC", "COLR", "CPAL", "SVG ", "sbix", "acnt", "avar", "bdat", "bloc", "bsln", "cvar", "fdsc", "feat", "fmtx", "fvar",
  "gvar", "hsty", "just", "lcar", "mort", "morx", "opbd", "prop", "trak", "Zapf", "Silf", "Glat", "Gloc", "Feat", "Sill",
] as const;

function fontError(got: unknown, expected: string, hint: string): Error {
  return commandError({ code: "E_SCHEMA", path: "/font", got, expected, record: "kernels/copper-routing", hint });
}

class Reader {
  readonly bytes: Uint8Array;
  readonly dv: DataView;
  pos: number;

  constructor(bytes: Uint8Array, pos = 0) {
    this.bytes = bytes;
    this.dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    this.pos = pos;
  }

  u8(): number {
    return this.dv.getUint8(this.pos++);
  }

  i8(): number {
    return this.dv.getInt8(this.pos++);
  }

  u16(): number {
    const v = this.dv.getUint16(this.pos);
    this.pos += 2;
    return v;
  }

  i16(): number {
    const v = this.dv.getInt16(this.pos);
    this.pos += 2;
    return v;
  }

  u32(): number {
    const v = this.dv.getUint32(this.pos);
    this.pos += 4;
    return v;
  }

  /** F2Dot14. */
  f2(): number {
    return this.i16() / 16384;
  }

  /** UIntBase128 (WOFF2 section 4.1). */
  base128(): number {
    let v = 0;
    for (let i = 0; i < 5; i++) {
      const b = this.u8();
      if (i === 0 && b === 0x80) throw fontError(b, "UIntBase128 without a leading zero byte", "the woff2 file is malformed");
      v = v * 128 + (b & 0x7f);
      if ((b & 0x80) === 0) return v;
    }
    throw fontError(null, "UIntBase128 of at most 5 bytes", "the woff2 file is malformed");
  }

  /** 255UInt16 (WOFF2 section 4.1). */
  u255(): number {
    const code = this.u8();
    if (code === 253) return this.u16();
    if (code === 255) return this.u8() + 253;
    if (code === 254) return this.u8() + 506;
    return code;
  }

  sub(len: number): Reader {
    const r = new Reader(this.bytes.subarray(this.pos, this.pos + len));
    this.pos += len;
    return r;
  }
}

interface RawGlyph {
  readonly points: { x: number; y: number; on: boolean }[];
  readonly ends: number[];
  readonly components?: readonly { readonly glyph: number; readonly flags: number; readonly dx: number; readonly dy: number; readonly m: readonly [number, number, number, number] }[];
  readonly xMin: number;
}

const ARG_1_AND_2_ARE_WORDS = 0x0001;
const ARGS_ARE_XY_VALUES = 0x0002;
const WE_HAVE_A_SCALE = 0x0008;
const MORE_COMPONENTS = 0x0020;
const WE_HAVE_AN_X_AND_Y_SCALE = 0x0040;
const WE_HAVE_A_TWO_BY_TWO = 0x0080;
const WE_HAVE_INSTRUCTIONS = 0x0100;

/** One triplet-coded point delta (WOFF2 section 5.2, the reference decoder's TripletDecode). */
function triplet(flag: number, glyphs: Reader): [number, number] {
  const sign = (f: number, v: number): number => ((f & 1) !== 0 ? v : -v);
  if (flag < 10) return [0, sign(flag, ((flag & 14) << 7) + glyphs.u8())];
  if (flag < 20) return [sign(flag, (((flag - 10) & 14) << 7) + glyphs.u8()), 0];
  if (flag < 84) {
    const b0 = flag - 20;
    const b1 = glyphs.u8();
    return [sign(flag, 1 + (b0 & 0x30) + (b1 >> 4)), sign(flag >> 1, 1 + ((b0 & 0x0c) << 2) + (b1 & 0x0f))];
  }
  if (flag < 120) {
    const b0 = flag - 84;
    const d0 = glyphs.u8();
    const d1 = glyphs.u8();
    return [sign(flag, 1 + (Math.floor(b0 / 12) << 8) + d0), sign(flag >> 1, 1 + (((b0 % 12) >> 2) << 8) + d1)];
  }
  if (flag < 124) {
    const d0 = glyphs.u8();
    const b2 = glyphs.u8();
    const d2 = glyphs.u8();
    return [sign(flag, (d0 << 4) + (b2 >> 4)), sign(flag >> 1, ((b2 & 0x0f) << 8) + d2)];
  }
  const d0 = glyphs.u8();
  const d1 = glyphs.u8();
  const d2 = glyphs.u8();
  const d3 = glyphs.u8();
  return [sign(flag, (d0 << 8) + d1), sign(flag >> 1, (d2 << 8) + d3)];
}

/** Every glyph of a transformed glyf table (WOFF2 section 5.1). */
function decodeGlyf(table: Uint8Array): RawGlyph[] {
  const h = new Reader(table);
  h.u16(); // reserved
  const optionFlags = h.u16();
  const numGlyphs = h.u16();
  h.u16(); // indexFormat, read back from loca, which this reader never rebuilds
  const sizes = [h.u32(), h.u32(), h.u32(), h.u32(), h.u32(), h.u32(), h.u32()];
  const [nContours, nPoints, flags, glyphs, composite, bbox, instructions] = sizes.map((n) => h.sub(n)) as [Reader, Reader, Reader, Reader, Reader, Reader, Reader];
  void optionFlags;
  const bitmapLen = ((numGlyphs + 31) >> 5) * 4;
  const bitmap = bbox.sub(bitmapLen);
  const hasBox = (i: number): boolean => (bitmap.bytes[i >> 3]! & (0x80 >> (i & 7))) !== 0;
  const out: RawGlyph[] = [];
  for (let gi = 0; gi < numGlyphs; gi++) {
    const n = nContours.i16();
    let box: [number, number, number, number] | undefined;
    if (hasBox(gi)) box = [bbox.i16(), bbox.i16(), bbox.i16(), bbox.i16()];
    if (n === 0) {
      out.push({ points: [], ends: [], xMin: 0 });
      continue;
    }
    if (n < 0) {
      const comps: { glyph: number; flags: number; dx: number; dy: number; m: [number, number, number, number] }[] = [];
      let f = 0;
      let instr = false;
      do {
        f = composite.u16();
        const glyph = composite.u16();
        let dx: number, dy: number;
        if ((f & ARG_1_AND_2_ARE_WORDS) !== 0) {
          dx = (f & ARGS_ARE_XY_VALUES) !== 0 ? composite.i16() : composite.u16();
          dy = (f & ARGS_ARE_XY_VALUES) !== 0 ? composite.i16() : composite.u16();
        } else {
          dx = (f & ARGS_ARE_XY_VALUES) !== 0 ? composite.i8() : composite.u8();
          dy = (f & ARGS_ARE_XY_VALUES) !== 0 ? composite.i8() : composite.u8();
        }
        let m: [number, number, number, number] = [1, 0, 0, 1];
        if ((f & WE_HAVE_A_SCALE) !== 0) {
          const s = composite.f2();
          m = [s, 0, 0, s];
        } else if ((f & WE_HAVE_AN_X_AND_Y_SCALE) !== 0) {
          m = [composite.f2(), 0, 0, composite.f2()];
        } else if ((f & WE_HAVE_A_TWO_BY_TWO) !== 0) {
          m = [composite.f2(), composite.f2(), composite.f2(), composite.f2()];
        }
        if ((f & WE_HAVE_INSTRUCTIONS) !== 0) instr = true;
        comps.push({ glyph, flags: f, dx, dy, m });
      } while ((f & MORE_COMPONENTS) !== 0);
      if (instr) instructions.sub(glyphs.u255());
      if (box === undefined) throw fontError(gi, "an explicit bbox for a composite glyph", "the woff2 file is malformed");
      out.push({ points: [], ends: [], components: comps, xMin: box[0] });
      continue;
    }
    const ends: number[] = [];
    let total = 0;
    for (let c = 0; c < n; c++) {
      total += nPoints.u255();
      ends.push(total - 1);
    }
    const points: { x: number; y: number; on: boolean }[] = [];
    let x = 0;
    let y = 0;
    for (let p = 0; p < total; p++) {
      const fl = flags.u8();
      const [dx, dy] = triplet(fl & 0x7f, glyphs);
      x += dx;
      y += dy;
      points.push({ x, y, on: (fl & 0x80) === 0 });
    }
    instructions.sub(glyphs.u255());
    const xMin = box !== undefined ? box[0] : Math.min(...points.map((p) => p.x));
    out.push({ points, ends, xMin });
  }
  return out;
}

/** fontTools getBestCmap preference order: (3,10), (0,6), (0,4), (3,1), (0,3), (0,2), (0,1), (0,0). */
const CMAP_ORDER: readonly (readonly [number, number])[] = [[3, 10], [0, 6], [0, 4], [3, 1], [0, 3], [0, 2], [0, 1], [0, 0]];

function cmapLookup(table: Uint8Array): (cp: number) => number | undefined {
  const r = new Reader(table);
  r.u16();
  const n = r.u16();
  const subs: { pid: number; eid: number; off: number }[] = [];
  for (let i = 0; i < n; i++) subs.push({ pid: r.u16(), eid: r.u16(), off: r.u32() });
  for (const [pid, eid] of CMAP_ORDER) {
    const s = subs.find((x) => x.pid === pid && x.eid === eid);
    if (s === undefined) continue;
    const t = new Reader(table, s.off);
    const format = t.u16();
    if (format === 4) {
      t.u16();
      t.u16();
      const segX2 = t.u16();
      t.pos += 6;
      const seg = segX2 / 2;
      const base = t.pos;
      const endAt = (k: number): number => t.dv.getUint16(base + 2 * k);
      const startAt = (k: number): number => t.dv.getUint16(base + segX2 + 2 + 2 * k);
      const deltaAt = (k: number): number => t.dv.getInt16(base + 2 * segX2 + 2 + 2 * k);
      const roAddr = (k: number): number => base + 3 * segX2 + 2 + 2 * k;
      return (cp) => {
        if (cp > 0xffff) return undefined;
        for (let k = 0; k < seg; k++) {
          if (cp > endAt(k)) continue;
          if (cp < startAt(k)) return undefined;
          const ro = t.dv.getUint16(roAddr(k));
          let gid: number;
          if (ro === 0) gid = (cp + deltaAt(k)) & 0xffff;
          else {
            const g = t.dv.getUint16(roAddr(k) + ro + 2 * (cp - startAt(k)));
            gid = g === 0 ? 0 : (g + deltaAt(k)) & 0xffff;
          }
          return gid === 0 ? undefined : gid;
        }
        return undefined;
      };
    }
    if (format === 12) {
      t.u16();
      t.u32();
      t.u32();
      const groups = t.u32();
      const g: [number, number, number][] = [];
      for (let k = 0; k < groups; k++) g.push([t.u32(), t.u32(), t.u32()]);
      return (cp) => {
        for (const [a, b, s0] of g) if (cp >= a && cp <= b) return s0 + cp - a;
        return undefined;
      };
    }
  }
  throw fontError(subs.map((s) => `${s.pid},${s.eid}`).join(" "), "a unicode cmap subtable of format 4 or 12", "use a font with a unicode cmap");
}

/** Parse a WOFF2 file. */
export function parseWoff2(bytes: Uint8Array, brotli: BrotliDecompress): Font {
  const r = new Reader(bytes);
  if (r.u32() !== 0x774f4632) throw fontError(bytes.subarray(0, 4).join(","), "the wOF2 signature", "pass a woff2 file");
  r.u32(); // flavor
  r.u32(); // length
  const numTables = r.u16();
  r.u16();
  r.u32(); // totalSfntSize
  const compressedSize = r.u32();
  r.pos = 48;
  const dir: { tag: string; len: number }[] = [];
  for (let i = 0; i < numTables; i++) {
    const f = r.u8();
    const tag = (f & 0x3f) === 0x3f ? String.fromCharCode(r.u8(), r.u8(), r.u8(), r.u8()) : KNOWN_TAGS[f & 0x3f]!;
    const version = (f >> 6) & 3;
    const orig = r.base128();
    const glyfLoca = tag === "glyf" || tag === "loca";
    const transformed = glyfLoca ? version === 0 : version !== 0;
    const len = transformed ? r.base128() : orig;
    if (transformed && tag !== "glyf" && tag !== "loca" && tag !== "hmtx") throw fontError(tag, "transforms on glyf, loca and hmtx only", "the woff2 file is malformed");
    if (tag === "hmtx" && transformed) throw fontError(tag, "an untransformed hmtx table", "re-encode the woff2 without the hmtx transform");
    dir.push({ tag, len });
  }
  const data = brotli(bytes.subarray(r.pos, r.pos + compressedSize));
  const tables = new Map<string, Uint8Array>();
  let at = 0;
  for (const t of dir) {
    tables.set(t.tag, data.subarray(at, at + t.len));
    at += t.len;
  }
  const need = (tag: string): Uint8Array => {
    const t = tables.get(tag);
    if (t === undefined) throw fontError(tag, "a font with this table", "use a TrueType flavoured woff2");
    return t;
  };
  const glyfDir = dir.find((t) => t.tag === "glyf");
  const head = new Reader(need("head"));
  head.pos = 18;
  const unitsPerEm = head.u16();
  const hhea = new Reader(need("hhea"));
  hhea.pos = 4;
  const ascender = hhea.i16();
  const descender = hhea.i16();
  hhea.pos = 34;
  const numberOfHMetrics = hhea.u16();
  const maxp = new Reader(need("maxp"));
  maxp.pos = 4;
  const numGlyphs = maxp.u16();
  const os2 = new Reader(need("OS/2"));
  const os2Version = os2.u16();
  let capHeight = 0;
  if (os2Version >= 2) {
    os2.pos = 88;
    capHeight = os2.i16();
  }
  const hmtx = new Reader(need("hmtx"));
  const adv: number[] = [];
  const lsb: number[] = [];
  for (let i = 0; i < numberOfHMetrics; i++) {
    adv.push(hmtx.u16());
    lsb.push(hmtx.i16());
  }
  for (let i = numberOfHMetrics; i < numGlyphs; i++) {
    adv.push(adv[numberOfHMetrics - 1]!);
    lsb.push(hmtx.i16());
  }
  if (glyfDir === undefined) throw fontError("glyf", "a TrueType flavoured woff2", "CFF fonts are not read here");
  const raw = decodeGlyf(need("glyf"));
  if (raw.length !== numGlyphs) throw fontError(raw.length, `${numGlyphs} glyphs, as maxp says`, "the woff2 file is malformed");
  const lookup = cmapLookup(need("cmap"));

  // Flattened coordinates and contour ends, as fontTools Glyph.getCoordinates.
  const flat = (gid: number, depth: number): { pts: FontPoint[]; ends: number[] } => {
    if (depth > 8) throw fontError(gid, "composite glyphs nested at most 8 deep", "the font is malformed");
    const g = raw[gid]!;
    if (g.components === undefined) return { pts: g.points.map((p) => ({ ...p })), ends: g.ends.slice() };
    const pts: FontPoint[] = [];
    const ends: number[] = [];
    for (const c of g.components) {
      if ((c.flags & ARGS_ARE_XY_VALUES) === 0) throw fontError(gid, "composite components placed by offset", "point-matched components are not read here");
      const sub = flat(c.glyph, depth + 1);
      const [a, b, cc, d] = c.m;
      const base = pts.length;
      for (const p of sub.pts) pts.push({ x: a * p.x + cc * p.y + c.dx, y: b * p.x + d * p.y + c.dy, on: p.on });
      for (const e of sub.ends) ends.push(base + e);
    }
    return { pts, ends };
  };

  return {
    unitsPerEm,
    capHeight,
    ascender,
    descender,
    glyphId: (cp) => lookup(cp),
    glyph(id: number): Glyph {
      if (!(id >= 0 && id < numGlyphs)) throw fontError(id, `a glyph id under ${numGlyphs}`, "look the glyph up with glyphId");
      const { pts, ends } = flat(id, 0);
      const shift = lsb[id]! - raw[id]!.xMin;
      const contours: FontPoint[][] = [];
      let start = 0;
      for (const e of ends) {
        contours.push(pts.slice(start, e + 1).map((p) => ({ x: p.x + shift, y: p.y, on: p.on })));
        start = e + 1;
      }
      return { contours, advance: adv[id]!, composite: raw[id]!.components !== undefined };
    },
  };
}

