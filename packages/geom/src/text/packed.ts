// Glyph contours as packages/geom/scripts/fonts.mjs packs them: base64 of
// unsigned LEB128 varints. The stream holds the contour count, then per
// contour its point count and per point two varints: the zigzag delta of x
// from the previous point, shifted left one with the on-curve flag in bit 0,
// then the zigzag delta of y. Deltas run across the glyph's contours from
// (0, 0). Unpacked, a contour is the flat [x, y, on, ...] list in integer font
// units the outline route reads. The tables carry this form because the
// decimal lists put about 1 MB of text into every bake (measured 2026-11-02);
// the decoder needs no host base64, so it runs in node and in a page alike.

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const VALUE = new Int16Array(128).fill(-1);
for (let i = 0; i < ALPHABET.length; i += 1) VALUE[ALPHABET.charCodeAt(i)] = i;

function bytesOf(s: string): Uint8Array {
  const out = new Uint8Array(Math.floor((s.replace(/=+$/, "").length * 3) / 4));
  let acc = 0, bits = 0, n = 0;
  for (let i = 0; i < s.length; i += 1) {
    const c = s.charCodeAt(i);
    if (c === 61) break;
    const v = c < 128 ? VALUE[c]! : -1;
    if (v < 0) throw new Error(`packed glyph: character ${JSON.stringify(s[i])} is not base64`);
    acc = (acc << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[n++] = (acc >> bits) & 0xff;
    }
  }
  return out.subarray(0, n);
}

/** The flat contours a packed string holds. */
export function unpackContours(s: string): number[][] {
  const b = bytesOf(s);
  let at = 0;
  const varint = (): number => {
    let v = 0, shift = 0, byte = 0;
    do {
      if (at >= b.length) throw new Error("packed glyph: the stream ends inside a varint");
      byte = b[at++]!;
      v += (byte & 0x7f) * 2 ** shift;
      shift += 7;
    } while (byte & 0x80);
    return v;
  };
  const unzig = (z: number): number => (z % 2 === 0 ? z / 2 : -(z + 1) / 2);
  const contours: number[][] = [];
  let x = 0, y = 0;
  for (let c = varint(); c > 0; c -= 1) {
    const flat: number[] = [];
    for (let p = varint(); p > 0; p -= 1) {
      const vx = varint();
      x += unzig(Math.floor(vx / 2));
      y += unzig(varint());
      flat.push(x, y, vx % 2);
    }
    contours.push(flat);
  }
  if (at !== b.length) throw new Error("packed glyph: bytes left after the last contour");
  return contours;
}
