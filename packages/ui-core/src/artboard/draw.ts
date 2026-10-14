// Painting the art board (KNUCKLE part6.js drawPreview, lines 458 to 510,
// lineage inlay.face-editor/knuckle-part6): the raster with nearest
// neighbour scaling, the dashed board edge, the centre snap guides during a
// move, the selected layer's dashed box, four corner squares, the stem and
// the rotate dot, a live readout while rotating or scaling, and the raster
// label. Colours come from the host theme (token values read from CSS), so
// this file names none.

import { hexToRgb, type ComposedFace, type RgbaImage } from "@hackbuild/inlay";
import type { ArtBoard } from "./controller.js";
import { HANDLE, mm2px } from "./hit.js";

/** The part of CanvasRenderingContext2D the board paints with. */
export interface Paint2D {
  fillStyle: unknown;
  strokeStyle: unknown;
  lineWidth: number;
  font: string;
  imageSmoothingEnabled: boolean;
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
  clearRect(x: number, y: number, w: number, h: number): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  strokeRect(x: number, y: number, w: number, h: number): void;
  setLineDash(d: number[]): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  closePath(): void;
  stroke(): void;
  fill(): void;
  arc(x: number, y: number, r: number, a0: number, a1: number): void;
  fillText(t: string, x: number, y: number): void;
  drawImage(img: unknown, x: number, y: number, w: number, h: number): void;
}

export interface ArtBoardTheme {
  /** stage background and cut cells */
  readonly void: string;
  /** cells no layer painted (the blank) */
  readonly blank: string;
  /** selection, handles: the one focal pink of the stage */
  readonly pink: string;
  /** board edge, snap guides */
  readonly guide: string;
  /** readouts and the raster label */
  readonly readout: string;
  /** instrument font family for readouts (VT323) */
  readonly numberFont: string;
  /** slot colours as #rrggbb, slot 1 first */
  readonly slots: readonly string[];
}

/** RGBA of a composed face, row 0 at the top as a canvas wants it. */
export function faceRgba(face: ComposedFace, theme: ArtBoardTheme): RgbaImage {
  const { w, h, labels } = face.art;
  const data = new Uint8ClampedArray(w * h * 4);
  const cols = theme.slots.map(hexToRgb), blank = hexToRgb(theme.blank), cut = hexToRgb(theme.void);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const p = j * w + i, q = ((h - 1 - j) * w + i) * 4, v = labels[p]!;
    const c = face.holes?.[p] ? cut : v ? cols[v - 1] ?? cut : blank;
    data[q] = c[0];
    data[q + 1] = c[1];
    data[q + 2] = c[2];
    data[q + 3] = 255;
  }
  return { width: w, height: h, data };
}

/** Paint the board; `bitmap` turns RGBA into something drawImage takes. */
export function drawArtBoard(g: Paint2D, b: ArtBoard, theme: ArtBoardTheme, bitmap: (img: RgbaImage) => unknown): void {
  const v = b.view(), f = b.frame();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = theme.void;
  g.fillRect(0, 0, v.w, v.h);
  const r = b.raster();
  const [rx, ry] = mm2px(v, -f.w / 2, f.h / 2);
  g.imageSmoothingEnabled = false;
  g.drawImage(bitmap(faceRgba(r.face, theme)), rx, ry, f.w * v.scale, f.h * v.scale);

  g.strokeStyle = theme.guide;
  g.lineWidth = 1;
  g.setLineDash([4, 4]);
  g.strokeRect(rx, ry, f.w * v.scale, f.h * v.scale);
  const d = b.drag();
  if (d !== null && d.mode === "move" && d.snapped !== null) {
    g.setLineDash([3, 3]);
    if (d.snapped.x) { g.beginPath(); g.moveTo(v.ox, 0); g.lineTo(v.ox, v.h); g.stroke(); }
    if (d.snapped.y) { g.beginPath(); g.moveTo(0, v.oy); g.lineTo(v.w, v.oy); g.stroke(); }
  }
  g.setLineDash([]);

  const hd = b.handles(), L = b.selected();
  if (hd !== null && L !== null) {
    g.strokeStyle = theme.pink;
    g.lineWidth = 1.5;
    g.setLineDash([6, 4]);
    g.beginPath();
    hd.corners.forEach((c, i) => (i ? g.lineTo(c[0], c[1]) : g.moveTo(c[0], c[1])));
    g.closePath();
    g.stroke();
    g.setLineDash([]);
    g.beginPath();
    g.moveTo(hd.top[0], hd.top[1]);
    g.lineTo(hd.dot[0], hd.dot[1]);
    g.stroke();
    g.fillStyle = theme.pink;
    for (const c of hd.corners) g.fillRect(c[0] - HANDLE, c[1] - HANDLE, HANDLE * 2, HANDLE * 2);
    g.beginPath();
    g.arc(hd.dot[0], hd.dot[1], HANDLE + 1, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = theme.readout;
    g.font = `15px ${theme.numberFont}`;
    if (d?.mode === "rotate") {
      const deg = "rot" in L ? L.rot ?? 0 : "arcDeg" in L ? L.arcDeg ?? 0 : 0;
      g.fillText(`${deg} deg`, hd.dot[0] + 12, hd.dot[1] + 5);
    }
    if (d?.mode === "scale") {
      g.fillText(`${(hd.bb.x1 - hd.bb.x0).toFixed(1)} x ${(hd.bb.y1 - hd.bb.y0).toFixed(1)} mm`, hd.corners[2][0] + 10, hd.corners[2][1] + 14);
    }
  }
  g.fillStyle = theme.readout;
  g.font = `15px ${theme.numberFont}`;
  g.fillText(`${f.w} x ${f.h} mm  ${r.mode === "exact" ? "print raster" : "preview"}${v.zoom !== 1 ? `  x${v.zoom.toFixed(1)}` : ""}`, 10, 20);
}
