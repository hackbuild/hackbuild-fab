// A stub inlay Surface for node: text is a box from the baseline to 0.7 of
// the size, ADVANCE x size wide per character, and an image is a filled
// rectangle of its span, both rotated about their origin and filled at cell
// centres. Enough to give layers real mask bounds without a canvas.

import type { ImageInput, RasterGrid, RgbaImage, Surface, TextOptions } from "@hackbuild/inlay";

export const ADVANCE = 0.6;
export const CAP = 0.7;

export interface StubSurface extends Surface {
  /** paint calls since the surface was made */
  paints: number;
}

export function stubSurface(grid: RasterGrid): StubSurface {
  const { w, h, res } = grid;
  let alpha = new Uint8Array(w * h);
  // fill the quad (u0..u1, v0..v1) in a frame at (ox, oy) rotated rot
  const quad = (ox: number, oy: number, rot: number, u0: number, u1: number, v0: number, v1: number): void => {
    const c = Math.cos(rot), s = Math.sin(rot);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const x = (i + 0.5 - w / 2) / res - ox, y = (j + 0.5 - h / 2) / res - oy;
      const u = x * c + y * s, v = -x * s + y * c;
      if (u >= u0 && u <= u1 && v >= v0 && v <= v1) alpha[j * w + i] = 255;
    }
  };
  const self: StubSurface = {
    paints: 0,
    measure: (text, _font, size) => [...text].length * ADVANCE * size,
    fillText(text, _font, size, x, y, rot, o?: TextOptions) {
      self.paints++;
      const width = [...text].length * ADVANCE * size;
      const a = o?.along ?? 0, start = o?.align === "center" ? a - width / 2 : a;
      quad(x, y, rot, start, start + width, 0, CAP * size);
    },
    fillPath() {
      self.paints++;
    },
    drawImage(img: ImageInput, cx, cy, span, rot) {
      self.paints++;
      const m = Math.max(img.width, img.height);
      const hw = span * img.width / m / 2, hh = span * img.height / m / 2;
      quad(cx, cy, rot, -hw, hw, -hh, hh);
    },
    readAlpha: () => alpha.slice(),
    readRgba(): RgbaImage {
      const data = new Uint8ClampedArray(w * h * 4);
      for (let p = 0; p < w * h; p++) data[p * 4 + 3] = alpha[p]!;
      return { width: w, height: h, data };
    },
    clear() {
      alpha = new Uint8Array(w * h);
    },
  };
  return self;
}
