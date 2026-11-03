// PNG to RgbaImage with no host decoder (PNG 1.2: IHDR, PLTE, tRNS, IDAT,
// IEND; the five filter types; colour types 0, 2, 3, 4 and 6 at bit depths
// 1 to 16), so an art doc image layer lowers the same in node and in
// a page. zlib inflate is fflate's (MIT, already bundled, tools/licences.json).
// Interlaced (Adam7) files are refused with a fix, as are images past the
// pixel cap: a dropped PNG is art, never a photo of record.

import { unzlibSync } from "fflate";
import { commandError } from "@hackbuild/spec";
import type { RgbaImage } from "./intake/image.js";

/** Largest decoded image, pixels (inferred: 4096 x 4096 holds any art a person drops on a 50 mm face at 80 px per mm). */
export const PNG_MAX_PIXELS = 4096 * 4096;

const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

function refuse(got: unknown, expected: string, hint: string): never {
  throw commandError({ code: "E_SCHEMA", path: "/src", got, expected, record: "kernels/art-inlay", hint });
}

const u32 = (b: Uint8Array, at: number): number => ((b[at]! << 24) >>> 0) + (b[at + 1]! << 16) + (b[at + 2]! << 8) + b[at + 3]!;

/** Decodes PNG bytes to 8-bit RGBA, row 0 at the top. */
export function decodePng(bytes: Uint8Array): RgbaImage {
  if (bytes.length < 8 || SIGNATURE.some((v, i) => bytes[i] !== v)) refuse(bytes.length, "PNG bytes", "the image is not a PNG; export it as PNG");
  let at = 8;
  let w = 0, h = 0, depth = 0, type = -1, interlace = 0;
  let palette: Uint8Array | undefined, trns: Uint8Array | undefined;
  const idat: Uint8Array[] = [];
  while (at + 8 <= bytes.length) {
    const len = u32(bytes, at);
    const kind = String.fromCharCode(bytes[at + 4]!, bytes[at + 5]!, bytes[at + 6]!, bytes[at + 7]!);
    const body = bytes.subarray(at + 8, at + 8 + len);
    if (body.length !== len) refuse(len, "a whole chunk", "the PNG ends inside a chunk; export it again");
    if (kind === "IHDR") {
      w = u32(body, 0); h = u32(body, 4); depth = body[8]!; type = body[9]!; interlace = body[12]!;
    } else if (kind === "PLTE") palette = body;
    else if (kind === "tRNS") trns = body;
    else if (kind === "IDAT") idat.push(body);
    else if (kind === "IEND") break;
    at += 12 + len;
  }
  if (w <= 0 || h <= 0) refuse(`${w} x ${h}`, "an IHDR with a size", "the PNG has no image header; export it again");
  if (w * h > PNG_MAX_PIXELS) refuse(`${w} x ${h}`, `at most ${PNG_MAX_PIXELS} pixels`, "scale the art down before dropping it");
  if (interlace !== 0) refuse("interlaced", "a non-interlaced PNG", "save the PNG without interlacing");
  const channels = ({ 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 } as Record<number, number>)[type];
  if (channels === undefined || ![1, 2, 4, 8, 16].includes(depth)) refuse(`colour type ${type} depth ${depth}`, "a PNG colour type and bit depth", "export it as an 8-bit RGBA PNG");
  if (type === 3 && palette === undefined) refuse("no PLTE", "a palette for a colour type 3 PNG", "export it as an 8-bit RGBA PNG");

  let total = 0;
  for (const c of idat) total += c.length;
  const z = new Uint8Array(total);
  for (let i = 0, o = 0; i < idat.length; o += idat[i]!.length, i += 1) z.set(idat[i]!, o);
  const raw = unzlibSync(z);
  const bpp = Math.max(1, (channels * depth) / 8);
  const stride = Math.ceil((w * channels * depth) / 8);
  if (raw.length < h * (stride + 1)) refuse(raw.length, `${h * (stride + 1)} bytes of image data`, "the PNG data is short; export it again");

  // Unfilter in place, row by row (PNG 1.2 section 9).
  const rows = new Uint8Array(h * stride);
  for (let y = 0; y < h; y += 1) {
    const f = raw[y * (stride + 1)]!;
    const src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const row = rows.subarray(y * stride, (y + 1) * stride);
    const up = y === 0 ? undefined : rows.subarray((y - 1) * stride, y * stride);
    for (let x = 0; x < stride; x += 1) {
      const a = x >= bpp ? row[x - bpp]! : 0, b = up?.[x] ?? 0, c = x >= bpp && up !== undefined ? up[x - bpp]! : 0;
      let p = src[x]!;
      if (f === 1) p += a;
      else if (f === 2) p += b;
      else if (f === 3) p += (a + b) >> 1;
      else if (f === 4) {
        const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
        p += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      } else if (f !== 0) refuse(f, "a filter type 0 to 4", "the PNG is damaged; export it again");
      row[x] = p & 0xff;
    }
  }

  const sample = (row: Uint8Array, i: number): number => {
    if (depth === 8) return row[i]!;
    if (depth === 16) return row[i * 2]!;
    const per = 8 / depth, byte = row[Math.floor(i / per)]!, shift = 8 - depth * ((i % per) + 1);
    const v = (byte >> shift) & ((1 << depth) - 1);
    return type === 3 ? v : Math.round((v * 255) / ((1 << depth) - 1));
  };
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y += 1) {
    const row = rows.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < w; x += 1) {
      const o = (y * w + x) * 4;
      let r: number, g: number, bl: number, al = 255;
      if (type === 3) {
        const i = sample(row, x);
        r = palette![i * 3] ?? 0; g = palette![i * 3 + 1] ?? 0; bl = palette![i * 3 + 2] ?? 0;
        al = trns !== undefined && i < trns.length ? trns[i]! : 255;
      } else if (type === 0 || type === 4) {
        r = g = bl = sample(row, x * channels);
        if (type === 4) al = sample(row, x * channels + 1);
      } else {
        r = sample(row, x * channels); g = sample(row, x * channels + 1); bl = sample(row, x * channels + 2);
        if (type === 6) al = sample(row, x * channels + 3);
      }
      out[o] = r; out[o + 1] = g; out[o + 2] = bl; out[o + 3] = al;
    }
  }
  return { width: w, height: h, data: out };
}

/** The bytes of a data uri ("data:image/png;base64,..."); a src of any other form is refused with a fix. */
export function dataUriBytes(src: string): Uint8Array {
  const m = /^data:image\/png;base64,([A-Za-z0-9+/=\s]+)$/.exec(src);
  if (m === null) refuse(src.slice(0, 40), "a data:image/png;base64 uri", "embed the image as a PNG data uri; a link or an hbf:// uri does not lower in a build");
  const s = m[1]!.replace(/\s+/g, "");
  const bytes = new Uint8Array(Math.floor((s.replace(/=+$/, "").length * 3) / 4));
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let acc = 0, bits = 0, n = 0;
  for (const ch of s) {
    if (ch === "=") break;
    acc = (acc << 6) | A.indexOf(ch);
    bits += 6;
    if (bits >= 8) { bits -= 8; bytes[n++] = (acc >> bits) & 0xff; }
  }
  return bytes.subarray(0, n);
}
