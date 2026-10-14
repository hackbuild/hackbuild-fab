// M05-T14: the WOFF2 reader and glyph pen against fontTools. The fixture
// is written by tools/py/copper/dump_glyphs.py from the shipped Plex Mono
// files through svgpath.py's _Pen; every printable ASCII glyph of the three
// weights must draw the same path string and advance, byte for byte. The
// composite glyphs (double quote, colon, semicolon) draw nothing there, and
// so here.

import { readFileSync } from "node:fs";
import { brotliDecompressSync } from "node:zlib";
import { describe, expect, test } from "vitest";
import { isThrownCommandError } from "@hackbuild/spec";
import { glyphPath, parseWoff2 } from "../src/index.js";

const repo = new URL("../../../", import.meta.url);
const fixture = JSON.parse(readFileSync(new URL("packages/copper/test/fixtures/plex-glyphs.json", repo), "utf8")) as {
  fonts: Record<string, { unitsPerEm: number; capHeight: number; glyphs: Record<string, [string, number] | null> }>;
};

describe("Plex Mono woff2 through font.ts equals fontTools", () => {
  for (const w of ["400", "600", "700"]) {
    test(`weight ${w}: header, cmap, every printable ASCII glyph path and advance`, () => {
      const bytes = new Uint8Array(readFileSync(new URL(`reference/copper/_inputs/ibm-plex-mono-latin-${w}-normal.woff2`, repo)));
      const f = parseWoff2(bytes, (b) => new Uint8Array(brotliDecompressSync(b)));
      const want = fixture.fonts[w]!;
      expect([f.unitsPerEm, f.capHeight]).toEqual([want.unitsPerEm, want.capHeight]);
      const entries = Object.entries(want.glyphs);
      expect(entries).toHaveLength(95);
      for (const [ch, ref] of entries) {
        const id = f.glyphId(ch.codePointAt(0)!);
        if (ref === null) {
          expect(id, ch).toBeUndefined();
          continue;
        }
        const g = f.glyph(id!);
        expect([glyphPath(g), g.advance], JSON.stringify(ch)).toEqual(ref);
      }
    });
  }

  test("a file that is not woff2 is refused with E_SCHEMA", () => {
    let hbf: unknown;
    try {
      parseWoff2(new Uint8Array([0, 1, 0, 0, 0, 0]), (b) => b);
    } catch (e) {
      hbf = isThrownCommandError(e) ? e.hbf : e;
    }
    expect(hbf).toMatchObject({ code: "E_SCHEMA", expected: "the wOF2 signature" });
  });
});
