// Fixture images for M03-T03, shared by scripts/quantize-golden.mjs (which
// runs them through the COLLAR and SPRUE originals) and test/quantize.test.ts
// (which runs them through the port). Every image is generated from a fixed
// seed, so the golden records only digests.

export interface Img {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export interface QuantizeCase {
  id: string;
  img: Img;
  mode: "palette" | "mono" | "alpha";
  opts: { res: number; slots?: string[]; body?: number; slot?: number; thr?: number; invert?: boolean };
}

export interface OtsuCase {
  id: string;
  img: Img;
}

/** Park and Miller minimal standard generator, so the fixtures never depend on Math.random. */
function lcg(seed: number): () => number {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647);
}

export function blank(width: number, height: number): Img {
  return { width, height, data: new Uint8ClampedArray(width * height * 4) };
}

export function put(img: Img, x: number, y: number, rgba: readonly number[]): void {
  const o = (y * img.width + x) * 4;
  for (let c = 0; c < 4; c++) img.data[o + c] = rgba[c] ?? 0;
}

/** Noise with alpha drawn around the 120 cut: 0, 119, 120, 121, 255 or any byte. */
function noise(width: number, height: number, seed: number): Img {
  const next = lcg(seed);
  const img = blank(width, height);
  const alphas = [0, 119, 120, 121, 255, 255, 255];
  for (let p = 0; p < width * height; p++) {
    const a = next() % 8;
    img.data[p * 4] = next() % 256;
    img.data[p * 4 + 1] = next() % 256;
    img.data[p * 4 + 2] = next() % 256;
    img.data[p * 4 + 3] = a < alphas.length ? alphas[a]! : next() % 256;
  }
  return img;
}

/** Greys 0 to 255 one per pixel, opaque, so every mono threshold edge is present. */
function greyRamp(): Img {
  const img = blank(16, 16);
  for (let p = 0; p < 256; p++) put(img, p % 16, Math.floor(p / 16), [p, p, p, 255]);
  return img;
}

/** The card's palette pixels in the first row of an otherwise clear image. */
export function cardPalettePixels(): Img {
  const img = blank(8, 8);
  put(img, 0, 0, [250, 10, 130, 255]);
  put(img, 1, 0, [240, 236, 226, 255]);
  put(img, 2, 0, [30, 30, 30, 255]);
  put(img, 3, 0, [250, 10, 130, 119]);
  put(img, 4, 0, [250, 10, 130, 120]);
  return img;
}

const CARD_SLOTS = ["#1A1A1A", "#F5F0E6", "#FE0386"];

export function quantizeCases(): QuantizeCase[] {
  const n1 = noise(64, 64, 7), n2 = noise(48, 48, 1234567), ramp = greyRamp();
  return [
    { id: "palette-card-pixels", img: cardPalettePixels(), mode: "palette", opts: { res: 8, slots: CARD_SLOTS, body: 1 } },
    { id: "palette-noise-body1", img: n1, mode: "palette", opts: { res: 8, slots: CARD_SLOTS, body: 1 } },
    { id: "palette-noise-body2", img: n1, mode: "palette", opts: { res: 8, slots: CARD_SLOTS, body: 2 } },
    { id: "palette-noise-body3", img: n2, mode: "palette", opts: { res: 4, slots: CARD_SLOTS, body: 3 } },
    { id: "palette-noise-short-hex", img: n2, mode: "palette", opts: { res: 4, slots: ["#0f0", "#00F", "#888888", "f00"], body: 4 } },
    { id: "palette-ties-ramp", img: ramp, mode: "palette", opts: { res: 16, slots: ["#000000", "#000000", "#ffffff"], body: 0 } },
    { id: "mono-ramp-128", img: ramp, mode: "mono", opts: { res: 16, slot: 1 } },
    { id: "mono-ramp-128-invert", img: ramp, mode: "mono", opts: { res: 16, slot: 3, invert: true } },
    { id: "mono-ramp-0", img: ramp, mode: "mono", opts: { res: 16, slot: 2, thr: 0 } },
    { id: "mono-ramp-255-invert", img: ramp, mode: "mono", opts: { res: 16, slot: 2, thr: 255, invert: true } },
    { id: "mono-noise-60", img: n1, mode: "mono", opts: { res: 8, slot: 4, thr: 60 } },
    { id: "mono-noise-200-invert", img: n1, mode: "mono", opts: { res: 8, slot: 5, thr: 200, invert: true } },
    { id: "alpha-noise", img: n1, mode: "alpha", opts: { res: 8, slot: 2 } },
    { id: "alpha-noise-slot7", img: n2, mode: "alpha", opts: { res: 4, slot: 7 } },
  ];
}

/** Opaque grey at luminance v (r = g = b = v). */
const grey = (v: number): number[] => [v, v, v, 255];

/** The card fixture: left half luminance 40, right half 210, 256 x 256. */
export function otsuHalves(borderLum: number | null): Img {
  const img = blank(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const edge = x === 0 || y === 0 || x === 255 || y === 255;
    put(img, x, y, grey(edge && borderLum !== null ? borderLum : x < 128 ? 40 : 210));
  }
  return img;
}

function fill(width: number, height: number, f: (x: number, y: number) => number[]): Img {
  const img = blank(width, height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) put(img, x, y, f(x, y));
  return img;
}

export function otsuCases(): OtsuCase[] {
  return [
    { id: "halves", img: otsuHalves(null) },
    { id: "halves-dark-border", img: otsuHalves(40) },
    { id: "noise-200x120", img: noise(200, 120, 99) },
    { id: "noise-8x8", img: noise(8, 8, 5) },
    { id: "uniform-40", img: fill(32, 32, () => grey(40)) },
    { id: "uniform-clear", img: fill(16, 16, () => [0, 0, 0, 0]) },
    // a dark mark on clear: alpha composites over white, the border reads 255
    { id: "mark-on-clear-256x9", img: fill(256, 9, (x) => (x > 60 && x < 190 ? [20, 20, 20, 200] : [0, 0, 0, 0])) },
    // light mark on a dark border, alpha ramp through the mark
    { id: "light-mark-dark-ground", img: fill(64, 48, (x, y) => (x > 10 && x < 54 && y > 8 && y < 40 ? [230, 220, 210, (x * 5) % 256] : grey(15))) },
    // 254 and 255 only: Otsu picks 255, clamped to 254; invert reads the unclamped 255
    { id: "near-white-clamp", img: fill(20, 20, (x, y) => grey(x === 0 || y === 0 || x === 19 || y === 19 ? 254 : (x + y) % 2 ? 255 : 254)) },
  ];
}
