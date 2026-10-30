/// <reference lib="dom" />
// Binds an art board controller to a canvas (KNUCKLE part6.js:511 to 561):
// pointer events from mouse, pen and touch, the wheel, double click, keys
// on the document unless a field has focus, image drops at the cursor, and
// a resize observer. Every event repaints at once; there are no timers.

import type { ImageInput, RgbaImage } from "@hackbuild/inlay";
import type { ArtBoard } from "./controller.js";
import { drawArtBoard, type ArtBoardTheme } from "./draw.js";

export interface AttachOptions {
  readonly theme: ArtBoardTheme;
  /** A dropped file becomes an image; default createImageBitmap. */
  readonly decode?: (file: File) => Promise<ImageInput>;
  /** Runs after each repaint. */
  readonly onPaint?: () => void;
}

export interface Attached {
  paint(): void;
  detach(): void;
}

/** Token values of record from CSS custom properties on the element, for a canvas that cannot read var(). */
export function cssToken(el: Element, name: string): string {
  return getComputedStyle(el).getPropertyValue(name).trim();
}

function bitmapOf(img: RgbaImage): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  c.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(img.data), img.width, img.height), 0, 0);
  return c;
}

async function decodeFile(file: File): Promise<ImageInput> {
  const bmp = await createImageBitmap(file);
  return { width: bmp.width, height: bmp.height, native: bmp };
}

export function attachArtBoard(canvas: HTMLCanvasElement, board: ArtBoard, opts: AttachOptions): Attached {
  const g = canvas.getContext("2d")!;
  const dpr = (): number => globalThis.devicePixelRatio || 1;
  const paint = (): void => {
    // the rect, not clientWidth: pointer positions are rect-relative and clientWidth rounds to whole px
    const r = canvas.getBoundingClientRect();
    const w = r.width || 400, h = r.height || 400, k = dpr();
    if (canvas.width !== Math.round(w * k) || canvas.height !== Math.round(h * k)) {
      canvas.width = Math.round(w * k);
      canvas.height = Math.round(h * k);
    }
    board.resize(w, h);
    drawArtBoard({
      get fillStyle() { return g.fillStyle; }, set fillStyle(v) { g.fillStyle = v as string; },
      get strokeStyle() { return g.strokeStyle; }, set strokeStyle(v) { g.strokeStyle = v as string; },
      get lineWidth() { return g.lineWidth; }, set lineWidth(v) { g.lineWidth = v; },
      get font() { return g.font; }, set font(v) { g.font = v; },
      get imageSmoothingEnabled() { return g.imageSmoothingEnabled; }, set imageSmoothingEnabled(v) { g.imageSmoothingEnabled = v; },
      setTransform: (a, b, c, d, e, f) => g.setTransform(a * k, b * k, c * k, d * k, e * k, f * k),
      clearRect: (...a) => g.clearRect(...a),
      fillRect: (...a) => g.fillRect(...a),
      strokeRect: (...a) => g.strokeRect(...a),
      setLineDash: (d) => g.setLineDash(d),
      beginPath: () => g.beginPath(),
      moveTo: (x, y) => g.moveTo(x, y),
      lineTo: (x, y) => g.lineTo(x, y),
      closePath: () => g.closePath(),
      stroke: () => g.stroke(),
      fill: () => g.fill(),
      arc: (...a) => g.arc(...a),
      fillText: (t, x, y) => g.fillText(t, x, y),
      drawImage: (img, x, y, w2, h2) => g.drawImage(img as CanvasImageSource, x, y, w2, h2),
    }, board, opts.theme, bitmapOf);
    opts.onPaint?.();
  };
  const local = (e: { clientX: number; clientY: number }): [number, number] => {
    const r = canvas.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };
  const ptr = (e: PointerEvent) => {
    const [x, y] = local(e);
    return { x, y, button: e.button, shiftKey: e.shiftKey, altKey: e.altKey };
  };
  const ac = new AbortController();
  const on = <K extends keyof HTMLElementEventMap>(t: K, fn: (e: HTMLElementEventMap[K]) => void, o: AddEventListenerOptions = {}): void =>
    canvas.addEventListener(t, fn, { ...o, signal: ac.signal });

  on("pointerdown", (e) => {
    canvas.setPointerCapture(e.pointerId);
    board.pointerDown(ptr(e));
    e.preventDefault();
    paint();
  });
  on("pointermove", (e) => {
    if (board.drag() === null) {
      const [x, y] = local(e);
      canvas.style.cursor = board.cursor(x, y);
      return;
    }
    board.pointerMove(ptr(e));
    e.preventDefault();
    paint();
  });
  const end = (): void => {
    if (board.drag() === null) return;
    board.pointerUp();
    paint();
  };
  on("pointerup", end);
  on("pointercancel", end);
  on("contextmenu", (e) => e.preventDefault());
  on("wheel", (e) => {
    e.preventDefault();
    const [x, y] = local(e);
    board.wheel({ x, y, deltaY: e.deltaY });
    paint();
  }, { passive: false });
  on("dblclick", () => {
    board.dblclick();
    paint();
  });
  on("dragover", (e) => e.preventDefault());
  on("drop", (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files[0];
    if (file === undefined || !file.type.startsWith("image/")) return;
    const [x, y] = local(e);
    void (opts.decode ?? decodeFile)(file).then((img) => {
      board.drop(x, y, img);
      paint();
    });
  });
  document.addEventListener("keydown", (e) => {
    const t = e.target as Element | null;
    if (t !== null && t.matches?.("input, textarea, select")) return;
    if (board.key(e)) {
      e.preventDefault();
      paint();
    }
  }, { signal: ac.signal });
  const ro = new ResizeObserver(() => paint());
  ro.observe(canvas);
  paint();
  return {
    paint,
    detach() {
      ac.abort();
      ro.disconnect();
    },
  };
}
