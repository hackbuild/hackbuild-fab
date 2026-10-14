// The browser painter for the inlay Surface (M03-T04 step 6). A canvas of
// w x h pixels with COLLAR's mm transform: k = res cells per mm, origin at
// the centre, model y up (collar.html mmTransform, lines 935 to 939). Every
// paint issues the canvas calls COLLAR's renderLayer issues for the same
// layer, argument for argument, so a grid read here equals COLLAR's grid
// cell for cell; packages/ui-core/test/canvas-surface.test.ts holds the call
// streams equal.
//
// Fonts: canvas text silently falls back when a web font is not loaded, and
// a face never used on the page never loads (art-inlay.md, font
// determinism). measure and fillText refuse a font until fontsReady has
// loaded it; onFontsLoaded then runs, where the art board clears its bbox
// cache.

import { commandError } from "@hackbuild/spec";
import type { Affine, ImageInput, RasterGrid, RgbaImage, Surface, TextOptions } from "@hackbuild/inlay";

/** The part of CanvasRenderingContext2D the surface calls. */
export interface Context2D {
  font: string;
  textAlign: string;
  textBaseline: string;
  /** Absent on engines without canvas letterSpacing; text then refuses a spacing. */
  letterSpacing?: string;
  fillStyle: unknown;
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
  transform(a: number, b: number, c: number, d: number, e: number, f: number): void;
  translate(x: number, y: number): void;
  rotate(angle: number): void;
  scale(x: number, y: number): void;
  clearRect(x: number, y: number, w: number, h: number): void;
  fillText(text: string, x: number, y: number): void;
  measureText(text: string): { readonly width: number };
  drawImage(img: unknown, dx: number, dy: number, dw: number, dh: number): void;
  getImageData(x: number, y: number, w: number, h: number): { readonly data: Uint8ClampedArray };
  fill(path: unknown, rule: "evenodd"): void;
}

/** document.fonts, as far as the surface uses it. */
export interface FontLoader {
  load(spec: string): Promise<readonly unknown[]>;
}

export interface CanvasSurfaceOptions {
  /** A 2D context on a fresh w x h canvas. Default: OffscreenCanvas, else a canvas element. */
  readonly context?: (w: number, h: number) => Context2D;
  /** A Path2D for SVG path data. Default: the global Path2D. */
  readonly path?: (d: string) => unknown;
  /** Something drawImage accepts holding these RGBA pixels. Default: a canvas carrying an ImageData. */
  readonly bitmap?: (img: RgbaImage) => unknown;
  /** Default: the page's FontFaceSet. */
  readonly fonts?: FontLoader;
  /** Runs after fontsReady has loaded every font asked for. */
  readonly onFontsLoaded?: () => void;
  /**
   * Where text is set. "mm" (default): COLLAR's mm transform with the font
   * sized in mm. "px": SPRUE's pixel frame, a translate to the cell position
   * and the font sized in pixels (sprue.html drawLayer, lines 1040 to 1095);
   * Chromium rasterises the two differently at the cell edge, so each bench
   * gets its own call stream.
   */
  readonly text?: "mm" | "px";
}

export interface CanvasSurface extends Surface {
  /**
   * Load each font (CSS weight and family, no size) and resolve when all
   * have a face. A font with no matching face rejects with E_KERNEL naming
   * it, instead of painting in a fallback face.
   */
  fontsReady(fonts: readonly string[]): Promise<void>;
}

interface Canvasish {
  getContext(id: "2d", opts?: { willReadFrequently: boolean }): unknown;
  width: number;
  height: number;
}

type Globals = {
  OffscreenCanvas?: new (w: number, h: number) => Canvasish;
  Path2D?: new (d: string) => unknown;
  ImageData?: new (data: Uint8ClampedArray, w: number, h: number) => unknown;
  document?: { createElement(tag: "canvas"): Canvasish; fonts?: FontLoader };
};

const G = globalThis as Globals;

function noBrowser(what: string): Error {
  return commandError({ code: "E_KERNEL", got: what, record: "kernels/art-inlay", hint: `the canvas surface needs ${what}; in node use geom vectorSurface` });
}

function freshCanvas(w: number, h: number): Canvasish {
  if (G.OffscreenCanvas !== undefined) return new G.OffscreenCanvas(w, h);
  if (G.document !== undefined) {
    const c = G.document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  }
  throw noBrowser("a canvas");
}

const defaultContext = (w: number, h: number): Context2D => freshCanvas(w, h).getContext("2d", { willReadFrequently: true }) as Context2D;

function defaultPath(d: string): unknown {
  if (G.Path2D === undefined) throw noBrowser("Path2D");
  return new G.Path2D(d);
}

function defaultBitmap(img: RgbaImage): unknown {
  if (G.ImageData === undefined) throw noBrowser("ImageData");
  const c = freshCanvas(img.width, img.height);
  const ctx = c.getContext("2d") as { putImageData(d: unknown, x: number, y: number): void };
  ctx.putImageData(new G.ImageData(new Uint8ClampedArray(img.data), img.width, img.height), 0, 0);
  return c;
}

/** "700 Permanent Marker" at 7.5 is "700 7.5px Permanent Marker", the string COLLAR builds (collar.html:1015). */
export function cssFont(font: string, sizeMm: number): string {
  const m = /^(\d{3}) (.+)$/.exec(font);
  return m === null ? `${sizeMm}px ${font}` : `${m[1]} ${sizeMm}px ${m[2]}`;
}

export function canvasSurface(grid: RasterGrid, opts: CanvasSurfaceOptions = {}): CanvasSurface {
  const { w, h, res: k } = grid;
  const ctx = (opts.context ?? defaultContext)(w, h);
  const path = opts.path ?? defaultPath;
  const bitmap = opts.bitmap ?? defaultBitmap;
  const loaded = new Set<string>();
  const px = opts.text === "px";

  const mm = (): void => ctx.setTransform(k, 0, 0, k, w / 2, h / 2);
  const ready = (font: string): void => {
    if (!loaded.has(font)) {
      throw commandError({ code: "E_KERNEL", path: "/font", got: font, record: "kernels/art-inlay", hint: `font ${font} is not loaded; await fontsReady([${JSON.stringify(font)}]) before text is measured or painted` });
    }
  };
  const same = (g: RasterGrid): void => {
    if (g.w !== w || g.h !== h || g.res !== k) {
      throw commandError({ code: "E_SCHEMA", path: "/grid", got: `${g.w} x ${g.h} at ${g.res}`, expected: `${w} x ${h} at ${k} cells per mm`, hint: "read back on the grid the surface was made for" });
    }
  };
  const pixels = (g: RasterGrid): Uint8ClampedArray => {
    same(g);
    return ctx.getImageData(0, 0, w, h).data;
  };

  return {
    async fontsReady(fonts) {
      const loader = opts.fonts ?? G.document?.fonts;
      if (loader === undefined) throw noBrowser("a FontFaceSet");
      for (const font of fonts) {
        const m = /^(\d{3} )?(.+)$/.exec(font)!;
        const faces = await loader.load(`${m[1] ?? ""}16px "${m[2]}"`);
        if (faces.length === 0) {
          throw commandError({ code: "E_KERNEL", path: "/font", got: font, record: "kernels/art-inlay", hint: `no face for ${font}; embed it as an @font-face before painting text` });
        }
        loaded.add(font);
      }
      opts.onFontsLoaded?.();
    },
    measure(text, font, sizeMm) {
      ready(font);
      if (px) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.font = cssFont(font, sizeMm * k);
        return ctx.measureText(text).width / k;
      }
      mm();
      ctx.font = cssFont(font, sizeMm);
      return ctx.measureText(text).width;
    },
    fillText(text, font, sizeMm, x, y, rot, o?: TextOptions) {
      ready(font);
      const spacing = o?.spacing ?? 0;
      if (spacing !== 0 && ctx.letterSpacing === undefined) {
        throw commandError({ code: "E_KERNEL", path: "/spacing", got: spacing, record: "kernels/art-inlay", hint: "this canvas has no letterSpacing; run the art in a browser that supports it" });
      }
      if (px) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.translate(w / 2 + x * k, h / 2 - y * k);
        ctx.rotate(-rot);
        ctx.fillStyle = "#000";
        ctx.font = cssFont(font, sizeMm * k);
      } else {
        mm();
        ctx.font = cssFont(font, sizeMm);
        ctx.fillStyle = "#000";
      }
      ctx.textBaseline = o?.baseline ?? "alphabetic";
      ctx.textAlign = o?.align ?? "left";
      if (!px) {
        ctx.translate(x, -y);
        ctx.rotate(-rot);
      }
      if (spacing !== 0) ctx.letterSpacing = `${px ? spacing * k : spacing}px`;
      ctx.fillText(text, px ? (o?.along ?? 0) * k : o?.along ?? 0, 0);
      if (spacing !== 0) ctx.letterSpacing = "0px";
    },
    fillPath(svgPath, t: Affine) {
      mm();
      ctx.transform(t[0], -t[1], t[2], -t[3], t[4], -t[5]);
      ctx.fillStyle = "#000";
      ctx.fill(path(svgPath), "evenodd");
    },
    drawImage(img: ImageInput, cx, cy, spanMm, rot, mirror) {
      const iw = img.width, ih = img.height;
      const s = (spanMm * k) / Math.max(iw, ih);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.translate(w / 2 + cx * k, h / 2 - cy * k);
      ctx.rotate(-rot);
      if (mirror) ctx.scale(-1, 1);
      const src = "native" in img ? img.native : bitmap(img);
      ctx.drawImage(src, -iw * s / 2, -ih * s / 2, iw * s, ih * s);
    },
    readAlpha(g) {
      const d = pixels(g);
      const out = new Uint8Array(w * h);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) out[(h - 1 - j) * w + i] = d[(j * w + i) * 4 + 3]!;
      return out;
    },
    readRgba(g) {
      const d = pixels(g);
      const data = new Uint8ClampedArray(w * h * 4);
      for (let j = 0; j < h; j++) data.set(d.subarray(j * w * 4, (j + 1) * w * 4), (h - 1 - j) * w * 4);
      return { width: w, height: h, data };
    },
    clear() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, w, h);
    },
  };
}
