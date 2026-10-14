// OK-01: the node text route. The committed glyph table must equal a fresh
// read of the vendored woff2 files, and one string must give the same rings
// on every run; the pinned hashes were computed on 2026-10-14 from the table
// at fonts.mjs output sha256 deb4ee72..7466 (computed). The vector surface
// then sets text where the canvas surface would, with counters as holes.

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { brotliDecompressSync } from "node:zlib";
import { describe, expect, test } from "vitest";
import { isThrownCommandError } from "@hackbuild/spec";
import { TEXT_FACES, contourRing, measureText, parseWoff2, textFace, textRings, vectorSurface, type RasterGrid } from "../src/index.js";

const repo = new URL("../../../", import.meta.url);
const sha = (b: Uint8Array | string): string => createHash("sha256").update(b).digest("hex");

function hbfOf(f: () => unknown): Record<string, unknown> | undefined {
  try {
    f();
  } catch (e) {
    return isThrownCommandError(e) ? (e.hbf as unknown as Record<string, unknown>) : undefined;
  }
  return undefined;
}

describe("the Plex Mono glyph table equals the vendored woff2", () => {
  for (const face of TEXT_FACES) {
    test(`${face.family} ${face.weight}: source hash, metrics, every glyph`, () => {
      const bytes = new Uint8Array(readFileSync(new URL(face.source.file, repo)));
      expect(sha(bytes)).toBe(face.source.sha256);
      const f = parseWoff2(bytes, (b) => new Uint8Array(brotliDecompressSync(b)));
      expect([f.unitsPerEm, f.ascender, f.descender, f.capHeight]).toEqual([face.unitsPerEm, face.ascender, face.descender, face.capHeight]);
      const cps = Object.keys(face.glyphs).map(Number);
      // Printable ASCII and Latin-1 from U+00A0, every one mapped.
      expect(cps).toHaveLength(95 + 96);
      for (const cp of cps) {
        const g = f.glyph(f.glyphId(cp)!);
        const want = [g.advance, g.contours.map((c) => c.flatMap((p) => [p.x, p.y, p.on ? 1 : 0]))];
        expect(face.glyphs[cp], `U+${cp.toString(16)}`).toEqual(want);
      }
    });
  }

  test("the table script prints the committed file byte for byte, twice", () => {
    const run = (): string => {
      const r = spawnSync(process.execPath, ["packages/geom/scripts/fonts.mjs"], { cwd: repo, encoding: "utf8", maxBuffer: 1 << 24 });
      expect(r.status, r.stderr).toBe(0);
      return r.stdout;
    };
    const committed = readFileSync(new URL("packages/geom/src/text/plex-mono.table.ts", repo), "utf8");
    const first = run();
    expect(sha(first)).toBe(sha(committed));
    expect(run()).toBe(first);
  });

  test("composite glyphs keep their components (the double quote draws two marks)", () => {
    expect(textFace("700 IBM Plex Mono").glyphs[0x22]![1]).toHaveLength(2);
    expect(textRings("\"", "700 IBM Plex Mono", 10, 0, 0, 0)[0]).toHaveLength(2);
  });
});

describe("text outlines are stable", () => {
  const ringsHash = (t: string, font: string): string =>
    sha(JSON.stringify(textRings(t, font, 8, 1.5, -2, 0, { align: "center", baseline: "middle", spacing: 0.2 })));

  test("two runs give equal rings, equal to the pinned hashes", () => {
    expect(ringsHash("JMK", "700 IBM Plex Mono")).toBe(ringsHash("JMK", "700 IBM Plex Mono"));
    expect(ringsHash("JMK", "700 IBM Plex Mono")).toBe("04ce0bf7af2effb951f7121bc334dca211d626d26f11fa01fb84ba1886e36513");
    expect(ringsHash("hack|.build", "IBM Plex Mono")).toBe("7d91241d051ca922906db70a4e50326540ae20943306ff3d5e52bc5607163fbb");
  });

  test("a contour of on-curve points stays a polygon; a quadratic flattens to 10 points", () => {
    expect(contourRing([0, 0, 1, 10, 0, 1, 10, 10, 1])).toEqual([[0, 0], [10, 0], [10, 10]]);
    const r = contourRing([0, 0, 1, 10, 0, 0, 10, 10, 1]);
    expect(r).toHaveLength(1 + 10 + 0);
    expect(r[r.length - 1]).toEqual([10, 10]);
  });
});

describe("placement follows the canvas calls", () => {
  const BOLD = "700 IBM Plex Mono";

  test("advance is 600 font units per character, spacing after each", () => {
    expect(measureText("JMK", BOLD, 10)).toBeCloseTo(18, 12);
    expect(measureText("JMK", BOLD, 10, 0.5)).toBeCloseTo(19.5, 12);
  });

  test("align center puts the run's middle on the origin; rotation turns about (x, y)", () => {
    const xs = (r: ReturnType<typeof textRings>): number[] => r.flat(2).map((p) => p[0]);
    const left = textRings("II", BOLD, 10, 0, 0, 0);
    const mid = textRings("II", BOLD, 10, 0, 0, 0, { align: "center" });
    expect(Math.min(...xs(mid)) + 6).toBeCloseTo(Math.min(...xs(left)), 9);
    const turned = textRings("II", BOLD, 10, 3, 4, Math.PI / 2, { align: "center" });
    const a = mid.flat(2)[0]!, b = turned.flat(2)[0]!;
    expect(b[0]).toBeCloseTo(3 - a[1], 9);
    expect(b[1]).toBeCloseTo(4 + a[0], 9);
  });

  test("middle baseline lifts the run by half of ascender plus descender", () => {
    const f = textFace(BOLD);
    const ys = (r: ReturnType<typeof textRings>): number[] => r.flat(2).map((p) => p[1]);
    const lo = Math.min(...ys(textRings("H", BOLD, 10, 0, 0, 0)));
    const loMid = Math.min(...ys(textRings("H", BOLD, 10, 0, 0, 0, { baseline: "middle" })));
    expect(lo - loMid).toBeCloseTo(((f.ascender + f.descender) / 2) * 10 / f.unitsPerEm, 9);
  });

  test("the vector surface fills glyphs with their counters open", () => {
    const g: RasterGrid = { w: 80, h: 40, res: 4 };
    const s = vectorSurface(g);
    s.fillText("O", BOLD, 8, 0, 0, 0, { align: "center", along: 0, baseline: "middle" });
    const a = s.readAlpha(g);
    const at = (x: number, y: number): number => a[Math.floor(y * g.res + g.h / 2) * g.w + Math.floor(x * g.res + g.w / 2)]!;
    expect(at(0, 0)).toBe(0);
    expect(at(-2, 0)).toBe(255);
    expect(a.filter((v) => v === 255).length).toBeGreaterThan(50);
  });
});

describe("refusals", () => {
  test("a face the table does not carry is E_KERNEL naming the faces it does", () => {
    expect(hbfOf(() => textFace("Permanent Marker"))).toMatchObject({ code: "E_KERNEL", path: "/font", expected: "one of IBM Plex Mono, 700 IBM Plex Mono" });
    expect(hbfOf(() => textFace("600 IBM Plex Mono"))).toMatchObject({ code: "E_KERNEL" });
  });

  test("a character without a glyph is E_SCHEMA naming it", () => {
    const e = hbfOf(() => measureText("AЖ", "IBM Plex Mono", 5));
    expect(e).toMatchObject({ code: "E_SCHEMA", path: "/text" });
    expect(String(e?.["hint"])).toMatch(/U\+0416/);
  });
});
