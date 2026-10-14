// Text layers: COLLAR renderLayer text branch (collar.html:1010 to 1072,
// lineage collar.bench/inlay-text). A pipe splits a line into runs; odd runs
// go to the accent slot. runGap mm of air goes in at each split, which keeps
// the full stop of hack|.build from merging into the letter beside it.
// Layout is pure arithmetic over Surface.measure; the surface only paints.
//
// The values passed to the surface are the ones COLLAR passes to the canvas,
// reordered into model terms: a canvas translate(tx, ty) is (x, y) = (tx,
// -ty) and a canvas rotate(t) is rot = -t, so a canvas surface that applies
// translate(x, -y) then rotate(-rot) issues COLLAR's own calls.

import { commandError } from "@hackbuild/spec";
import { readMask, type LayerResult, type RasterGrid, type Surface } from "../surface.js";

export interface TextLayer {
  kind: "text";
  /** A pipe splits runs: odd runs go to `accent`. A newline starts a line. */
  text: string;
  slot: number;
  /** 0 or absent: the runs all go to `slot`. */
  accent?: number;
  /** CSS family name. */
  font: string;
  /** mm */
  size: number;
  /** mm of air added at each pipe split */
  runGap: number;
  mode: "straight" | "arc";
  /** mm, arc mode */
  arcR?: number;
  /** degrees, arc mode: the angle of the middle of the string */
  arcDeg?: number;
  /** arc mode: set along the bottom of a seal, reading left to right */
  flip?: boolean;
  /** advance multiplier, arc mode, default 1 */
  track?: number;
  /** mm, straight mode */
  dx: number;
  /** mm, straight mode */
  dy: number;
  /** degrees counter-clockwise, straight mode */
  rot: number;
  /**
   * Straight mode: the line the dy offset places. Absent is "alphabetic",
   * COLLAR's canvas default; "middle" centres each line's em box on it, as
   * SPRUE sets straight text (sprue.html:1088). Arc mode ignores it.
   */
  baseline?: "alphabetic" | "middle";
  caps?: boolean;
  bold?: boolean;
  cut?: boolean;
  /** muted: skipped by composeFace */
  off?: boolean;
}

export interface TextRun {
  readonly t: string;
  readonly slot: number;
}

/** One paint call: what TextLayer becomes before it reaches a surface. */
export interface TextDraw {
  readonly text: string;
  readonly slot: number;
  /** frame origin, mm */
  readonly x: number;
  readonly y: number;
  /** radians counter-clockwise */
  readonly rot: number;
  /** mm along the baseline from the origin */
  readonly along: number;
  readonly align: "left" | "center";
  /** arc mode: the angle A of the character's middle, radians */
  readonly angle?: number;
  /** straight mode: the layer's baseline, absent for alphabetic */
  readonly baseline?: "middle";
}

/** Line height as a multiple of the size (collar.html:1053). */
export const LINE_HEIGHT = 1.18;

/** The surface font: weight 700 before the family when bold (collar.html:1015). */
export const textFont = (L: TextLayer): string => (L.bold ? `700 ${L.font}` : L.font);

/** Lines of runs, slot and accent alternating from slot (collar.html:1018 to 1019). */
export function textLines(L: TextLayer): TextRun[][] {
  const txt0 = L.caps ? L.text.toUpperCase() : L.text;
  const accent = L.accent || L.slot;
  return txt0.split("\n").map((line) => line.split("|").map((t, i) => ({ t, slot: i % 2 ? accent : L.slot })));
}

/** Slots with at least one non-empty run, in first-use order (collar.html:1020 to 1021). */
export function textSlots(lines: readonly (readonly TextRun[])[]): number[] {
  const slots: number[] = [];
  for (const ln of lines) for (const r of ln) if (r.t && !slots.includes(r.slot)) slots.push(r.slot);
  return slots;
}

/** Straight mode: runs centred on dx, lines centred on dy, the block rotated rot (collar.html:1052 to 1070). */
export function layoutStraight(L: TextLayer, surface: Surface): TextDraw[] {
  const lines = textLines(L);
  const font = textFont(L);
  const gapMM = L.runGap || 0;
  const lh = L.size * LINE_HEIGHT;
  const rot = (L.rot || 0) * Math.PI / 180;
  const out: TextDraw[] = [];
  lines.forEach((runs, li) => {
    const ws = runs.map((r) => surface.measure(r.t, font, L.size));
    const total = ws.reduce((a, b) => a + b, 0) + gapMM * (runs.length - 1);
    const yy = -(L.dy || 0) + (li - (lines.length - 1) / 2) * lh;
    let x = -total / 2;
    runs.forEach((r, ri) => {
      if (r.t) out.push({ text: r.t, slot: r.slot, x: L.dx || 0, y: -yy, rot, along: x, align: "left", ...(L.baseline === "middle" ? { baseline: "middle" as const } : {}) });
      x += ws[ri]! + gapMM;
    });
  });
  return out;
}

/**
 * Arc mode, first line only: one entry per character, a space measured as
 * `n`, widths times track, a runGap entry with no glyph at each split.
 * Character n sits at A = A0 + sign (cur + adv / 2) / Rb, sign = flip ? 1 :
 * -1, Rb = max(1, arcR) (collar.html:1024 to 1050).
 */
export function layoutArc(L: TextLayer, surface: Surface): TextDraw[] {
  if (L.arcR === undefined || L.arcDeg === undefined) {
    throw commandError({ code: "E_SCHEMA", path: L.arcR === undefined ? "/arcR" : "/arcDeg", got: null, expected: "a number in arc mode", hint: "give arc text a radius in mm and a centre angle in degrees" });
  }
  const lines = textLines(L);
  const font = textFont(L);
  const gapMM = L.runGap || 0;
  const first = lines[0]!;
  const chars: { ch: string; slot: number; extra?: number }[] = [];
  first.forEach((r, ri) => {
    for (const ch of r.t) chars.push({ ch, slot: r.slot });
    if (ri < first.length - 1 && gapMM) chars.push({ ch: "", slot: r.slot, extra: gapMM });
  });
  const widths = chars.map((c) => (c.extra ? c.extra : surface.measure(c.ch === " " ? "n" : c.ch, font, L.size) * (L.track ?? 1)));
  const total = widths.reduce((a, b) => a + b, 0);
  const Rb = Math.max(1, L.arcR), sign = L.flip ? 1 : -1, A0 = L.arcDeg * Math.PI / 180;
  let cur = -total / 2;
  const out: TextDraw[] = [];
  chars.forEach((c, n) => {
    const adv = widths[n]!;
    if (c.ch && c.ch !== " ") {
      const A = A0 + sign * ((cur + adv / 2) / Rb);
      out.push({
        text: c.ch,
        slot: c.slot,
        x: Rb * Math.cos(A),
        y: Rb * Math.sin(A),
        rot: L.flip ? Math.PI / 2 + A : A - Math.PI / 2,
        along: 0,
        align: "center",
        angle: A,
      });
    }
    cur += adv;
  });
  return out;
}

/** One coverage mask per used slot, each painted on a cleared surface (collar.html:1022 to 1071). */
export function renderText(L: TextLayer, surface: Surface, grid: RasterGrid): LayerResult[] {
  const slots = textSlots(textLines(L));
  const font = textFont(L);
  const out: LayerResult[] = [];
  for (const sl of slots) {
    surface.clear();
    const draws = L.mode === "arc" ? layoutArc(L, surface) : layoutStraight(L, surface);
    for (const d of draws) {
      if (d.slot !== sl) continue;
      surface.fillText(d.text, font, L.size, d.x, d.y, d.rot, { align: d.align, along: d.along, ...(d.baseline === undefined ? {} : { baseline: d.baseline }) });
    }
    out.push({ mask: readMask(surface, grid), slot: sl });
  }
  return out;
}
