// M03-T10: the SPRUE face module against SPRUE as shipped. The oracle is the
// committed legacy copy designs/sprue/legacy/sprue.html (pinned by
// designs/sprue/legacy/sha256.txt): its engine (lines 279 to 942) and its
// `geo` (lines 996 to 1033) are cut by line and run unchanged, and the
// browser capture of the phx preset (fixtures/sprue-phx.legacy.json.gz,
// written by scripts/hygiene-fixtures.mjs in Chrome) is the second source.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import type { Ring } from "@hackbuild/spec";
import {
  SPRUE_INK_ALPHA, composeSprue, layoutSprueText, sprueGeo, sprueRaw, sprueThin,
  type RasterGrid, type SprueBlank, type SprueTextLayer, type Surface,
} from "../src/index.js";
import { sprueCapture } from "./fixtures/hygiene-captures.js";

const root = fileURLToPath(new URL("../../../", import.meta.url));

function legacyLines(): string[] {
  const bytes = readFileSync(root + "designs/sprue/legacy/sprue.html");
  const want = readFileSync(root + "designs/sprue/legacy/sha256.txt", "utf8").split("\n").find((l) => l.endsWith("  sprue.html"))!.split(/\s+/)[0];
  if (createHash("sha256").update(bytes).digest("hex") !== want) throw new Error("designs/sprue/legacy/sprue.html does not match sha256.txt");
  return bytes.toString("utf8").split("\n");
}

function cut(lines: string[], first: number, last: number, head: string, tail: string): string {
  const a = lines[first - 1]!.trim(), b = lines[last - 1]!.trim();
  if (!a.startsWith(head) || !b.startsWith(tail)) throw new Error(`cut ${first} to ${last} reads "${a}" .. "${b}"`);
  return lines.slice(first - 1, last).join("\n");
}

interface Mask { w: number; h: number; d: Uint8Array }
interface LegacyGeo { W: number; H: number; ppm: number; blank: Mask; holes: Mask; ring: Mask; zone: Mask; poly: number[][] }

const lines = legacyLines();
const engineText = cut(lines, 279, 942, "(function (root) {", "})(typeof globalThis");
const geoText = cut(lines, 996, 1033, "function blankOutline() {", "}");

interface LegacyST { kind: "pick" | "coin"; pickScale: number; pickHole: boolean; holeD: number; coinD: number; ring: boolean; ringW: number; ringIn: number; margin: number; ppm: number }

function legacyGeo(st: LegacyST): LegacyGeo {
  const scope: { SPRUE?: unknown } = {};
  new Function("globalThis", engineText)(scope);
  const f = new Function("S", "ST", `${geoText}\nreturn geo();`) as (S: unknown, ST: unknown) => LegacyGeo;
  return f(scope.SPRUE, { ...st });
}

/** ST at boot (sprue.html:956 to 958) after PRESETS.phx (line 980). */
const PHX_ST: LegacyST = { kind: "pick", pickScale: 1, pickHole: true, holeD: 3.5, coinD: 36, ring: true, ringW: 0.8, ringIn: 1.5, margin: 1.6, ppm: 12 };

/** The package blank for a legacy ST: hole at 10.4 x scale (holeSpec, line 1003), keepout 0.9 (lines 1029 and 1031), as the design's chase defaults give them. */
const blankOf = (st: LegacyST): SprueBlank => ({
  kind: st.kind, pickHole: st.pickHole, holeD: st.holeD, holeY: 10.4 * st.pickScale, coinD: st.coinD,
  ring: st.ring, ringW: st.ringW, ringIn: st.ringIn, margin: st.margin, keep: 0.9, ppm: st.ppm,
});
const PHX = blankOf(PHX_ST);
/** The legacy outline as the package's input: the oracle's own polygon, so the test holds the rest of geo. */
const polyOf = (st: LegacyST): Ring => legacyGeo(st).poly as unknown as Ring;

const diff = (a: Uint8Array, b: Uint8Array): number => {
  let n = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++;
  return n;
};

describe("sprueGeo against SPRUE geo", () => {
  const cases: [string, LegacyST][] = [
    ["phx pick", PHX_ST],
    ["pick at scale 1.3 with a 5 mm hole", { ...PHX_ST, pickScale: 1.3, holeD: 5 }],
    ["pick at scale 0.85 without a hole", { ...PHX_ST, pickScale: 0.85, pickHole: false }],
    ["coin with ring", { ...PHX_ST, kind: "coin" }],
    ["coin without ring, margin 2.7, ppm 16", { ...PHX_ST, kind: "coin", ring: false, margin: 2.7, ppm: 16 }],
    ["coin 30 mm at ppm 8", { ...PHX_ST, kind: "coin", coinD: 30, ppm: 8 }],
  ];
  for (const [name, st] of cases) {
    test(`${name}: every mask equals the legacy one cell for cell`, () => {
      const L = legacyGeo(st), g = sprueGeo(blankOf(st), polyOf(st));
      expect([g.w, g.h, g.ppm]).toEqual([L.W, L.H, L.ppm]);
      expect(g.poly).toEqual(L.poly);
      for (const k of ["blank", "holes", "ring", "zone"] as const) expect(diff(g[k], L[k].d), k).toBe(0);
      expect(g.blank.reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
    });
  }

  test("the phx zone and ring equal the Chrome capture", () => {
    const cap = sprueCapture();
    const g = sprueGeo(PHX, polyOf(PHX_ST));
    expect([g.w, g.h]).toEqual([cap.zone.w, cap.zone.h]);
    expect(diff(g.zone, cap.zone.d)).toBe(0);
    expect(diff(g.ring, cap.ring.d)).toBe(0);
  });
});

/** A surface that paints nothing and reads back a given alpha grid, row 0 at the bottom. */
function alphaSurface(alpha: Uint8Array, calls: unknown[] = []): Surface {
  return {
    measure: (t: string) => t.length,
    fillText: (...a: unknown[]) => { calls.push(a); },
    fillPath: () => undefined,
    drawImage: () => undefined,
    readAlpha: (_g: RasterGrid) => alpha,
    readRgba: () => { throw new Error("unused"); },
    clear: () => { calls.push("clear"); },
  };
}

describe("sprueRaw", () => {
  const g = sprueGeo(PHX, polyOf(PHX_ST));
  const L: SprueTextLayer = { type: "text", text: "FAN", font: "Anton", weight: "400", size: 4.8, tracking: 0.2, x: 0, y: 5.2, rot: 0, arc: 0, arcTop: true };

  test("reads ink at alpha 127 and above, flips rows to SPRUE's top-first order and keeps the zone only", () => {
    const n = g.w * g.h;
    const alpha = new Uint8Array(n);
    // bottom-first rows: fill everything at 127 except one cell at 126
    alpha.fill(SPRUE_INK_ALPHA);
    const mid = Math.floor(g.h / 2) * g.w + Math.floor(g.w / 2);
    alpha[mid] = SPRUE_INK_ALPHA - 1;
    const m = sprueRaw([L], alphaSurface(alpha), g);
    const flipped = (g.h - 1 - Math.floor(g.h / 2)) * g.w + Math.floor(g.w / 2);
    let zoneCells = 0;
    for (let p = 0; p < n; p++) {
      zoneCells += g.zone[p]!;
      if (p === flipped) expect(m[p]).toBe(0);
      else expect(m[p]).toBe(g.zone[p]);
    }
    expect(zoneCells).toBeGreaterThan(1000);
  });

  test("a layer is painted with SPRUE's straight text call: centre, middle baseline, tracking as spacing", () => {
    const calls: unknown[] = [];
    sprueRaw([L, { ...L, text: "HIDDEN", mute: true }], alphaSurface(new Uint8Array(g.w * g.h), calls), g);
    expect(calls).toEqual(["clear", ["FAN", "400 Anton", 4.8, 0, 5.2, 0, { align: "center", along: 0, baseline: "middle", spacing: 0.2 }]]);
  });

  test("an image layer is refused with E_KERNEL", () => {
    expect(() => sprueRaw([{ type: "image" }], alphaSurface(new Uint8Array(g.w * g.h)), g)).toThrow(/not ported/);
  });
});

describe("composeSprue and sprueThin on the phx capture", () => {
  const cap = sprueCapture();
  const g = sprueGeo(PHX, polyOf(PHX_ST));
  // A surface that reads back the captured raw grid, flipped to bottom-first, at full ink.
  const fromRaw = (raw: Uint8Array): Surface => {
    const a = new Uint8Array(raw.length);
    for (let j = 0; j < g.h; j++) for (let i = 0; i < g.w; i++) a[(g.h - 1 - j) * g.w + i] = raw[j * g.w + i] ? 255 : 0;
    return alphaSurface(a);
  };

  test("the back face cleans to the captured grid", () => {
    const L: SprueTextLayer = { type: "text", text: "x", font: "Anton", weight: "400", size: 5, tracking: 0, x: 0, y: 0, rot: 0, arc: 0, arcTop: true };
    const out = composeSprue([L], fromRaw(cap.faces.back.raw.d), g, PHX, { minF: 0.6, minGap: 0.35 });
    expect(diff(out.raw, cap.faces.back.raw.d)).toBe(0);
    expect(diff(out.clean, cap.faces.back.clean.d)).toBe(0);
  });

  test("thin flags equal the page's L.thin", () => {
    const layers = cap.faces.back.layers;
    let i = 0;
    const surface: Surface = { ...alphaSurface(new Uint8Array(0)), readAlpha: () => (fromRaw(layers[i++]!.raw.d).readAlpha({ w: g.w, h: g.h, res: g.ppm })) };
    const texts: SprueTextLayer[] = layers.map((x) => ({ type: "text", text: x.text ?? "", font: "Anton", weight: "400", size: 5, tracking: 0, x: 0, y: 0, rot: 0, arc: 0, arcTop: true }));
    const r = sprueThin(texts, "back", surface, g, { minF: 0.6, minGap: 0.35 });
    expect(r.layers.map((x) => x.flag)).toEqual(layers.map((x) => x.thin));
    expect(r.layers.map((x) => x.param)).toEqual(["/faces/back/0", "/faces/back/1", "/faces/back/2"]);
  });
});

describe("layoutSprueText arc against SPRUE drawLayer", () => {
  const ppm = 12, W = 512, H = 512;
  const draw = cut(lines, 1040, 1095, "function drawLayer(ctx, g, L) {", "}");
  const mm2px = cut(lines, 1038, 1038, "function mm2px(g, x, y)", "function mm2px");

  /** A 2D context that tracks its transform and records each fillText's origin and angle in pixels. */
  function recorder(measure: (t: string) => number) {
    let m = [1, 0, 0, 1, 0, 0];
    const stack: number[][] = [];
    const out: { text: string; x: number; y: number; angle: number; baseline: string; align: string; spacing: string; font: string }[] = [];
    const mul = (a: number[], b: number[]) => [a[0]! * b[0]! + a[2]! * b[1]!, a[1]! * b[0]! + a[3]! * b[1]!, a[0]! * b[2]! + a[2]! * b[3]!, a[1]! * b[2]! + a[3]! * b[3]!, a[0]! * b[4]! + a[2]! * b[5]! + a[4]!, a[1]! * b[4]! + a[3]! * b[5]! + a[5]!];
    const ctx = {
      font: "", textAlign: "start", textBaseline: "alphabetic", letterSpacing: "0px", fillStyle: "",
      save() { stack.push(m); }, restore() { m = stack.pop()!; },
      translate(x: number, y: number) { m = mul(m, [1, 0, 0, 1, x, y]); },
      rotate(t: number) { m = mul(m, [Math.cos(t), Math.sin(t), -Math.sin(t), Math.cos(t), 0, 0]); },
      measureText(t: string) { return { width: measure(t) }; },
      fillText(t: string, x: number, y: number) {
        const p = mul(m, [1, 0, 0, 1, x, y]);
        out.push({ text: t, x: p[4]!, y: p[5]!, angle: Math.atan2(p[1]!, p[0]!), baseline: ctx.textBaseline, align: ctx.textAlign, spacing: ctx.letterSpacing, font: ctx.font });
      },
    };
    return { ctx, out };
  }

  const widthPx = (t: string): number => (t.charCodeAt(0) % 7 + 4) * ppm * 0.31;
  const legacy = (L: SprueTextLayer) => {
    const r = recorder(widthPx);
    new Function("ctx", "g", "L", "fontStack", `${mm2px}\n${draw}\ndrawLayer(ctx, g, L);`)(r.ctx, { ppm, W, H }, L, (f: string) => `"${f}"`);
    return r.out;
  };
  const surface = { measure: (t: string) => widthPx(t) / ppm };

  for (const [name, L] of [
    ["coin year arc over the top", { type: "text", text: "FOR THE FANS", font: "Anton", weight: "400", size: 5, tracking: 0.35, x: 0, y: 0, rot: 0, arc: 9.9, arcTop: true }],
    ["arc under, offset and turned 30 degrees", { type: "text", text: "PHX 26", font: "Anton", weight: "700", size: 4, tracking: 0.1, x: 1.5, y: -2, rot: 30, arc: 8, arcTop: false }],
    ["straight, turned -12 degrees", { type: "text", text: "PROJECT", font: "Anton", weight: "400", size: 5.4, tracking: 0.15, x: 0.4, y: 0.4, rot: -12, arc: 0, arcTop: true }],
  ] as [string, SprueTextLayer][]) {
    test(`${name}: each glyph lands where SPRUE puts it`, () => {
      const want = legacy(L);
      const got = layoutSprueText(L, surface);
      expect(got.length).toBe(want.length);
      got.forEach((d, i) => {
        const w = want[i]!;
        expect(d.text).toBe(w.text);
        expect(W / 2 + d.x * ppm).toBeCloseTo(w.x, 9);
        expect(H / 2 - d.y * ppm).toBeCloseTo(w.y, 9);
        expect(Math.cos(-d.rot)).toBeCloseTo(Math.cos(w.angle), 12);
        expect(Math.sin(-d.rot)).toBeCloseTo(Math.sin(w.angle), 12);
        expect(d.baseline).toBe(w.baseline);
        expect(`${d.spacing * ppm}px`).toBe(w.spacing);
        expect(w.align).toBe("center");
        expect(w.font.startsWith(`${L.weight} ${L.size * ppm}px`)).toBe(true);
      });
    });
  }
});
