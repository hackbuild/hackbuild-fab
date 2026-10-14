// M03-T10: the canvas surface in its "px" text mode issues SPRUE's straight
// text calls. SPRUE drawLayer (designs/sprue/legacy/sprue.html lines 1038
// to 1095, pinned by designs/sprue/legacy/sha256.txt) runs unchanged on a
// recording 2D context; the port (inlay layoutSprueText through
// canvasSurface) runs on another. Each fillText must arrive with the same
// translate and rotate arguments bit for bit, the same font size, baseline,
// alignment and letter spacing, which is the cell-for-cell argument without
// a browser; the browser run is tools/legacy/sprue-parity.mjs.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import type { Ring } from "@hackbuild/spec";
import { sprueGeo, sprueRaw, type SprueBlank, type SprueTextLayer } from "@hackbuild/inlay";
import { canvasSurface, type Context2D } from "../src/surface/canvas-surface.js";

const root = fileURLToPath(new URL("../../../", import.meta.url));

function legacyDrawLayer(): (ctx: unknown, g: unknown, L: unknown) => void {
  const bytes = readFileSync(root + "designs/sprue/legacy/sprue.html");
  const want = readFileSync(root + "designs/sprue/legacy/sha256.txt", "utf8").split("\n").find((l) => l.endsWith("  sprue.html"))!.split(/\s+/)[0];
  if (createHash("sha256").update(bytes).digest("hex") !== want) throw new Error("designs/sprue/legacy/sprue.html does not match sha256.txt");
  const lines = bytes.toString("utf8").split("\n");
  if (!lines[1037]!.startsWith("function mm2px(g, x, y)") || !lines[1039]!.startsWith("function drawLayer(ctx, g, L) {") || lines[1094] !== "}") throw new Error("drawLayer moved in the legacy copy");
  const fontStack = (f: string): string => `"${f}", Impact, "Arial Black", "Helvetica Neue", Arial, sans-serif`;
  const f = new Function("fontStack", `${lines[1037]}\n${lines.slice(1039, 1095).join("\n")}\nreturn drawLayer;`) as (fs: unknown) => (ctx: unknown, g: unknown, L: unknown) => void;
  return f(fontStack);
}

interface Paint { text: string; x: number; y: number; ops: unknown[][]; font: string; align: string; baseline: string; spacing: string }

class Rec implements Context2D {
  font = "10px sans-serif";
  textAlign = "start";
  textBaseline = "alphabetic";
  letterSpacing = "0px";
  fillStyle: unknown = "#000";
  paints: Paint[] = [];
  #ops: unknown[][] = [];
  #stack: unknown[][][] = [];
  constructor(readonly w: number, readonly h: number) {}
  save(): void { this.#stack.push(this.#ops.map((o) => [...o])); }
  restore(): void { this.#ops = this.#stack.pop() ?? []; }
  setTransform(...a: number[]): void { this.#ops = a.join() === "1,0,0,1,0,0" ? [] : [["setTransform", ...a]]; }
  transform(...a: number[]): void { this.#ops.push(["transform", ...a]); }
  translate(...a: number[]): void { this.#ops.push(["translate", ...a]); }
  rotate(a: number): void { this.#ops.push(["rotate", a]); }
  scale(...a: number[]): void { this.#ops.push(["scale", ...a]); }
  clearRect(): void { this.#ops = [...this.#ops]; }
  fillRect(): void { /* SPRUE's white ground; nothing to record */ }
  measureText(text: string): { width: number } {
    const px = Number(/ ([\d.]+)px/.exec(this.font)![1]);
    return { width: [...text].reduce((s, ch) => s + px * (0.3 + (ch.codePointAt(0)! % 11) / 19), 0) };
  }
  fillText(text: string, x: number, y: number): void {
    this.paints.push({ text, x, y, ops: this.#ops.map((o) => [...o]), font: this.font, align: this.textAlign, baseline: this.textBaseline, spacing: this.letterSpacing });
  }
  drawImage(): void { throw new Error("unused"); }
  getImageData(_x: number, _y: number, w: number, h: number): { data: Uint8ClampedArray } { return { data: new Uint8ClampedArray(w * h * 4) }; }
  fill(): void { throw new Error("unused"); }
}

const PHX: SprueBlank = { kind: "pick", pickHole: true, holeD: 3.5, holeY: 10.4, coinD: 36, ring: true, ringW: 0.8, ringIn: 1.5, margin: 1.6, keep: 0.9, ppm: 12 };
/** Blank outlines of the two grid sizes SPRUE uses at ppm 12, a 26 x 31 mm box and a 36 mm box (only the grid size matters here). */
const box = (w: number, h: number): Ring => [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];
const text = (o: Partial<SprueTextLayer>): SprueTextLayer => ({ type: "text", text: "FAN", font: "Anton", weight: "400", size: 4.8, tracking: 0.2, x: 0, y: 5.2, rot: 0, arc: 0, arcTop: true, ...o });

/** Font size and weight, the part of the CSS font that sets the glyphs once the face is loaded. */
const sizeOf = (font: string): string => /^(\d{3} [\d.]+px)/.exec(font)![1]!;

describe("canvasSurface text 'px' issues SPRUE's straight text calls", () => {
  const drawLayer = legacyDrawLayer();
  const cases: [string, SprueTextLayer][] = [
    ["phx FAN", text({})],
    ["phx PROJECT", text({ text: "PROJECT", size: 5.4, y: 0.4, tracking: 0.15 })],
    ["phx PHX 2026", text({ text: "PHX 2026", size: 4.6, y: -4.9, tracking: 0.15 })],
    ["turned, offset, bold, no tracking", text({ text: "2026", weight: "700", size: 9.6, x: -1.3, y: -2.8, rot: 17.5, tracking: 0 })],
    ["coin year 2026", text({ text: "2026", size: 9.6, y: -2.8, tracking: 0.2 })],
  ];
  for (const [name, L] of cases) {
    test(name, async () => {
      for (const kind of ["pick", "coin"] as const) {
        const g = sprueGeo({ ...PHX, kind }, kind === "pick" ? box(25.8, 30.7) : box(36, 36));
        const legacy = new Rec(g.w, g.h);
        drawLayer(legacy, { W: g.w, H: g.h, ppm: g.ppm }, L);
        const ctx = new Rec(g.w, g.h);
        const surface = canvasSurface({ w: g.w, h: g.h, res: g.ppm }, { context: () => ctx, fonts: { load: async () => [{}] }, text: "px" });
        await surface.fontsReady([`${L.weight} ${L.font}`]);
        sprueRaw([L], surface, g);
        expect(ctx.paints).toHaveLength(1);
        const [a, b] = [legacy.paints[0]!, ctx.paints[0]!];
        expect(b.ops).toEqual(a.ops);
        expect([b.text, b.x, b.y, b.align, b.baseline, b.spacing]).toEqual([a.text, a.x, a.y, a.align, a.baseline, a.spacing]);
        expect(sizeOf(b.font)).toBe(sizeOf(a.font));
        expect(ctx.letterSpacing).toBe("0px");
      }
    });
  }

  test("the mm mode keeps COLLAR's stream: no letter spacing touched, mm transform", async () => {
    const ctx = new Rec(64, 64);
    const surface = canvasSurface({ w: 64, h: 64, res: 4 }, { context: () => ctx, fonts: { load: async () => [{}] } });
    await surface.fontsReady(["Anton"]);
    surface.fillText("A", "Anton", 5, 1, 2, 0.5, { align: "left", along: 3 });
    expect(ctx.paints[0]!.ops).toEqual([["setTransform", 4, 0, 0, 4, 32, 32], ["translate", 1, -2], ["rotate", -0.5]]);
    expect([ctx.paints[0]!.baseline, ctx.paints[0]!.spacing, ctx.paints[0]!.x, ctx.paints[0]!.font]).toEqual(["alphabetic", "0px", 3, "5px Anton"]);
  });

  test("a spacing on a context without letterSpacing is refused", async () => {
    const ctx = new Rec(64, 64) as Partial<Rec>;
    delete ctx.letterSpacing;
    Object.defineProperty(ctx, "letterSpacing", { value: undefined, writable: true });
    const surface = canvasSurface({ w: 64, h: 64, res: 4 }, { context: () => ctx as Context2D, fonts: { load: async () => [{}] }, text: "px" });
    await surface.fontsReady(["400 Anton"]);
    expect(() => surface.fillText("A", "400 Anton", 5, 0, 0, 0, { align: "center", along: 0, spacing: 0.2 })).toThrow(/letterSpacing/);
  });
});
