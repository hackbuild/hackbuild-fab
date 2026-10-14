// M03-T04 acceptance, text placement in node. A recording surface measures
// 1 mm per character, so every expected number below is computed by hand
// from the card's rules: straight runs at -total / 2 with runGap at each
// pipe, arc characters at A = A0 + sign (cur + adv / 2) / Rb.

import { describe, expect, test } from "vitest";
import { layoutArc, layoutStraight, renderText, textLines, textSlots, type TextLayer } from "../src/layers/text.js";
import type { RasterGrid, Surface, TextOptions } from "../src/surface.js";

interface Fill {
  text: string;
  font: string;
  size: number;
  x: number;
  y: number;
  rot: number;
  align: string;
  along: number;
}

/** 1 mm per character; records fills and clears; alpha 200 on cell p after the p-th fill. */
class Recorder implements Surface {
  fills: Fill[] = [];
  log: string[] = [];
  measured: string[] = [];
  measure(text: string): number {
    this.measured.push(text);
    return [...text].length;
  }
  fillText(text: string, font: string, size: number, x: number, y: number, rot: number, o?: TextOptions): void {
    this.fills.push({ text, font, size, x, y, rot, align: o?.align ?? "left", along: o?.along ?? 0 });
    this.log.push(`fill ${text}`);
  }
  fillPath(): void {}
  drawImage(): void {}
  readAlpha(grid: RasterGrid): Uint8Array {
    const a = new Uint8Array(grid.w * grid.h);
    const n = this.log.filter((l) => l.startsWith("fill")).length;
    this.log.push("read");
    a[n % a.length] = 200;
    a[(n + 1) % a.length] = 120;
    return a;
  }
  readRgba(grid: RasterGrid) {
    return { width: grid.w, height: grid.h, data: new Uint8ClampedArray(grid.w * grid.h * 4) };
  }
  clear(): void {
    this.log.push("clear");
  }
}

const base = (over: Partial<TextLayer>): TextLayer => ({
  kind: "text", text: "hack|.build", slot: 2, accent: 3, font: "Permanent Marker", size: 7.5,
  runGap: 0.7, mode: "straight", dx: 0, dy: 0, rot: 0, ...over,
});

/** The model point where a straight run starts: origin plus along on the rotated baseline. */
const start = (f: Fill): [number, number] => [f.x + f.along * Math.cos(f.rot), f.y + f.along * Math.sin(f.rot)];

describe("straight text: pipe split and runGap", () => {
  test("hack|.build at runGap 0.7: run 0 (hack, slot 2) at -5.35, run 1 (.build, accent 3) at -0.65", () => {
    const d = layoutStraight(base({}), new Recorder());
    expect(d.map((r) => [r.text, r.slot])).toEqual([["hack", 2], [".build", 3]]);
    // computed: total 4 + 6 + 0.7 = 10.7, first run at -10.7 / 2
    expect(start(d[0]! as unknown as Fill)[0]).toBe(-5.35);
    expect(start(d[1]! as unknown as Fill)[0]).toBeCloseTo(-0.65, 12);
    expect(d.every((r) => r.align === "left" && r.y === 0)).toBe(true);
  });

  test("runGap 0 puts run 1 at -1.0", () => {
    const d = layoutStraight(base({ runGap: 0 }), new Recorder());
    expect(start(d[1]! as unknown as Fill)[0]).toBe(-1);
  });

  test("dx, dy and rot move the block; lines step by size x 1.18 centred on dy", () => {
    const d = layoutStraight(base({ text: "ab\ncd|e", dx: 2, dy: 3, rot: 90, runGap: 0.5 }), new Recorder());
    // computed: lh = 7.5 x 1.18 = 8.85; line 0 at y = 3 + 8.85 / 2, line 1 at 3 - 8.85 / 2
    expect(d.map((r) => r.y)).toEqual([3 + 4.425, 3 - 4.425, 3 - 4.425].map((v) => expect.closeTo(v, 12)));
    expect(d.map((r) => r.x)).toEqual([2, 2, 2]);
    expect(d[0]!.rot).toBeCloseTo(Math.PI / 2, 15);
    // line 1 runs: cd (2) + gap 0.5 + e (1), total 3.5, starts at -1.75, e at -1.75 + 2.5
    expect(d.map((r) => r.along)).toEqual([-1, -1.75, 0.75]);
    expect(d.map((r) => r.slot)).toEqual([2, 2, 3]);
  });

  test("accent 0 or absent falls back to slot; caps uppercases; bold sets weight 700", () => {
    expect(textLines(base({ accent: 0 })).flat().map((r) => r.slot)).toEqual([2, 2]);
    const { accent: _, ...noAccent } = base({});
    expect(textLines(noAccent as TextLayer).flat().map((r) => r.slot)).toEqual([2, 2]);
    expect(textLines(base({ caps: true })).flat().map((r) => r.t)).toEqual(["HACK", ".BUILD"]);
    const rec = new Recorder();
    renderText(base({ bold: true }), rec, { w: 4, h: 4, res: 1 });
    expect(rec.fills.every((f) => f.font === "700 Permanent Marker" && f.size === 7.5)).toBe(true);
  });

  test("runs alternate slot, accent, slot; empty runs place nothing but keep the gap", () => {
    const L = base({ text: "a||b|c", runGap: 1 });
    expect(textLines(L)[0]!.map((r) => r.slot)).toEqual([2, 3, 2, 3]);
    const d = layoutStraight(L, new Recorder());
    // computed: widths 1, 0, 1, 1 plus 3 gaps of 1, total 6
    expect(d.map((r) => [r.text, r.along])).toEqual([["a", -3], ["b", 0], ["c", 2]]);
  });
});

describe("arc text", () => {
  const arc = (over: Partial<TextLayer>): TextLayer => base({ text: "MAKE THINGS", mode: "arc", arcR: 14, arcDeg: 90, flip: false, track: 1.05, size: 4.2, runGap: 0.6, ...over });

  function expected(L: TextLayer): { ch: string; A: number }[] {
    const chars = [...L.text.replace("|", "")];
    const widths = chars.map(() => 1.05);
    const total = widths.reduce((a, b) => a + b, 0);
    const sign = L.flip ? 1 : -1, Rb = Math.max(1, L.arcR!), A0 = (L.arcDeg! * Math.PI) / 180;
    let cur = -total / 2;
    const out: { ch: string; A: number }[] = [];
    chars.forEach((ch, n) => {
      if (ch !== " ") out.push({ ch, A: A0 + sign * ((cur + widths[n]! / 2) / Rb) });
      cur += widths[n]!;
    });
    return out;
  }

  test.each([false, true])("MAKE THINGS at arcR 14, arcDeg 90, track 1.05, flip %s: angles equal the formula to 1e-12", (flip) => {
    const L = arc({ flip });
    const rec = new Recorder();
    const d = layoutArc(L, rec);
    const want = expected(L);
    expect(d.map((r) => r.text)).toEqual(want.map((w) => w.ch));
    d.forEach((r, n) => {
      const A = want[n]!.A;
      expect(Math.abs(r.angle! - A)).toBeLessThanOrEqual(1e-12);
      expect(Math.abs(r.x - 14 * Math.cos(A))).toBeLessThanOrEqual(1e-12);
      expect(Math.abs(r.y - 14 * Math.sin(A))).toBeLessThanOrEqual(1e-12);
      expect(Math.abs(r.rot - (flip ? Math.PI / 2 + A : A - Math.PI / 2))).toBeLessThanOrEqual(1e-12);
      expect(r.align).toBe("center");
      expect(r.along).toBe(0);
    });
    // a space is measured as n
    expect(rec.measured).toContain("n");
    expect(rec.measured).not.toContain(" ");
  });

  test("a split adds a glyphless entry of runGap mm; sign -1 runs clockwise from A0", () => {
    const L = arc({ text: "AB|C", runGap: 2, track: 1 });
    const d = layoutArc(L, new Recorder());
    // computed: widths 1, 1, gap 2, 1, total 5; centres at -2, -1, +2 mm of arc
    const A = (s: number): number => Math.PI / 2 - s / 14;
    expect(d.map((r) => r.angle)).toEqual([A(-2), A(-1), A(2)].map((v) => expect.closeTo(v, 12)));
    expect(d.map((r) => r.slot)).toEqual([2, 2, 3]);
    expect(layoutArc(arc({ text: "AB|C", runGap: 0, track: 1 }), new Recorder()).map((r) => r.angle)).toEqual(
      [A(-1), A(0), A(1)].map((v) => expect.closeTo(v, 12)),
    );
  });

  test("arcR under 1 mm lays out on Rb 1; only the first line is set", () => {
    const d = layoutArc(arc({ text: "AB\nCD", arcR: 0.2, track: 1 }), new Recorder());
    expect(d.map((r) => r.text)).toEqual(["A", "B"]);
    expect(d[0]!.angle).toBeCloseTo(Math.PI / 2 + 0.5, 12);
  });

  test("arc mode without arcR is E_SCHEMA", () => {
    const { arcR: _, ...L } = arc({});
    expect(() => layoutArc(L as TextLayer, new Recorder())).toThrow(/E_SCHEMA \/arcR/);
  });
});

describe("renderText paints one slot per cleared read", () => {
  test("slots in first-use order, each pass clears, fills only its runs, then reads", () => {
    const rec = new Recorder();
    const grid = { w: 8, h: 1, res: 1 };
    const out = renderText(base({ text: "x|y\nz" }), rec, grid);
    expect(textSlots(textLines(base({ text: "x|y\nz" })))).toEqual([2, 3]);
    expect(rec.log).toEqual(["clear", "fill x", "fill z", "read", "clear", "fill y", "read"]);
    expect(out.map((r) => ("slot" in r ? r.slot : -1))).toEqual([2, 3]);
    // alpha 200 counts, 120 does not (COLLAR keeps alpha above 120)
    const m0 = (out[0] as { mask: Uint8Array }).mask;
    expect([...m0]).toEqual([0, 0, 1, 0, 0, 0, 0, 0]);
  });

  test("an empty text paints nothing and reads nothing", () => {
    const rec = new Recorder();
    expect(renderText(base({ text: "" }), rec, { w: 2, h: 2, res: 1 })).toEqual([]);
    expect(rec.log).toEqual([]);
  });
});
