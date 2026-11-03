// Generates the committed glyph tables in packages/geom/src/text (one file
// per family, listed in TABLES), which the node text route sets type from
// (OK-01). It reads the vendored woff2 files in packages/geom/assets/fonts
// (IBM Plex Mono, VT323: OFL-1.1; Permanent Marker, Special Elite: Apache-2.0;
// all from @fontsource 5.3.0) through the workspace WOFF2 reader,
// src/text/woff2.ts (from dist), and writes every glyph of printable ASCII
// and Latin-1 the font maps: advance and TrueType contours in integer font
// units, composites resolved. No clock, no path and no host value reaches the
// output, so any machine that runs this script writes the same bytes.
//
//   node packages/geom/scripts/fonts.mjs [--out <table>]  print one table source
//   node packages/geom/scripts/fonts.mjs --write          write every table over the committed files

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { register } from "node:module";
import { fileURLToPath } from "node:url";
import { brotliDecompressSync } from "node:zlib";

// The reader is read from dist (run npx tsc -b first); @hackbuild/spec ships
// as source with extensionless imports, which the hbf CLI's resolve hook reads.
register(new URL("../../../core/dist/resolve-hook.js", import.meta.url).href);
const { parseWoff2 } = await import(new URL("../dist/text/woff2.js", import.meta.url).href);

export const TABLES = [
  {
    out: "plex-mono.table.ts", licence: "IBM Plex Mono woff2 files (OFL-1.1, packages/geom/assets/fonts/OFL-1.1.txt)",
    faces: [
      { name: "PLEX_MONO_400", family: "IBM Plex Mono", weight: "400", file: "ibm-plex-mono-latin-400-normal.woff2" },
      { name: "PLEX_MONO_700", family: "IBM Plex Mono", weight: "700", file: "ibm-plex-mono-latin-700-normal.woff2" },
    ],
  },
  {
    out: "permanent-marker.table.ts", licence: "Permanent Marker woff2 file (Apache-2.0, packages/geom/assets/fonts/APACHE-2.0-permanent-marker.txt)",
    faces: [{ name: "PERMANENT_MARKER_400", family: "Permanent Marker", weight: "400", file: "permanent-marker-latin-400-normal.woff2" }],
  },
  {
    out: "special-elite.table.ts", licence: "Special Elite woff2 file (Apache-2.0, packages/geom/assets/fonts/APACHE-2.0-special-elite.txt)",
    faces: [{ name: "SPECIAL_ELITE_400", family: "Special Elite", weight: "400", file: "special-elite-latin-400-normal.woff2" }],
  },
  {
    out: "vt323.table.ts", licence: "VT323 woff2 file (OFL-1.1, packages/geom/assets/fonts/OFL-1.1-vt323.txt)",
    faces: [{ name: "VT323_400", family: "VT323", weight: "400", file: "vt323-latin-400-normal.woff2" }],
  },
];
export const FACES = TABLES.flatMap((t) => t.faces);

/** Printable ASCII, then Latin-1 from the no-break space. */
export const CODE_POINTS = [
  ...Array.from({ length: 0x7e - 0x20 + 1 }, (_, i) => 0x20 + i),
  ...Array.from({ length: 0xff - 0xa0 + 1 }, (_, i) => 0xa0 + i),
];

const fontsDir = new URL("../assets/fonts/", import.meta.url);

function fail(msg) {
  throw new Error(`fonts.mjs: ${msg}`);
}

/** One face's table as plain data. */
export function readFace(face) {
  const bytes = new Uint8Array(readFileSync(new URL(face.file, fontsDir)));
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const f = parseWoff2(bytes, (b) => new Uint8Array(brotliDecompressSync(b)));
  const glyphs = [];
  for (const cp of CODE_POINTS) {
    const id = f.glyphId(cp);
    if (id === undefined) continue;
    const g = f.glyph(id);
    const contours = g.contours.map((c) => c.flatMap((p) => {
      if (!Number.isInteger(p.x) || !Number.isInteger(p.y)) fail(`${face.file} U+${cp.toString(16)} has a point off the font unit grid`);
      return [p.x, p.y, p.on ? 1 : 0];
    }));
    glyphs.push([cp, g.advance, contours]);
  }
  return {
    family: face.family, weight: face.weight, source: { file: `packages/geom/assets/fonts/${face.file}`, sha256 },
    unitsPerEm: f.unitsPerEm, ascender: f.ascender, descender: f.descender, capHeight: f.capHeight, glyphs,
  };
}

/** Zigzag then LEB128: the inverse of packages/geom/src/text/packed.ts. */
function pushVarint(out, v) {
  if (!Number.isSafeInteger(v) || v < 0) fail(`varint ${v} is not a non-negative safe integer`);
  do {
    let byte = v % 128;
    v = Math.floor(v / 128);
    if (v > 0) byte |= 0x80;
    out.push(byte);
  } while (v > 0);
}
const zig = (n) => (n >= 0 ? 2 * n : -2 * n - 1);

/** One glyph's contours as the base64 string packed.ts decodes. */
export function packContours(contours) {
  const out = [];
  pushVarint(out, contours.length);
  let x = 0, y = 0;
  for (const flat of contours) {
    pushVarint(out, flat.length / 3);
    for (let i = 0; i < flat.length; i += 3) {
      pushVarint(out, zig(flat[i] - x) * 2 + flat[i + 2]);
      pushVarint(out, zig(flat[i + 1] - y));
      x = flat[i];
      y = flat[i + 1];
    }
  }
  return Buffer.from(out).toString("base64");
}

export function tableSource(table = TABLES[0]) {
  const out = [
    `// Generated by packages/geom/scripts/fonts.mjs from the vendored ${table.licence}.`,
    "// Do not edit; regenerate with `node packages/geom/scripts/fonts.mjs --write`.",
    "",
    'import type { FaceTable } from "./outline.js";',
    "",
  ];
  for (const face of table.faces) {
    const t = readFace(face);
    out.push(`export const ${face.name}: FaceTable = {`);
    out.push(`  family: ${JSON.stringify(t.family)}, weight: ${JSON.stringify(t.weight)},`);
    out.push(`  source: { file: ${JSON.stringify(t.source.file)}, sha256: ${JSON.stringify(t.source.sha256)} },`);
    out.push(`  unitsPerEm: ${t.unitsPerEm}, ascender: ${t.ascender}, descender: ${t.descender}, capHeight: ${t.capHeight},`);
    out.push("  glyphs: {");
    for (const [cp, adv, contours] of t.glyphs) {
      out.push(`    0x${cp.toString(16).padStart(4, "0")}: [${adv}, ${JSON.stringify(packContours(contours))}],`);
    }
    out.push("  },");
    out.push("};");
    out.push("");
  }
  return out.join("\n");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes("--write")) {
    for (const t of TABLES) writeFileSync(new URL(`../src/text/${t.out}`, import.meta.url), tableSource(t));
  } else {
    // Without --write: print one table, chosen by --out <file> (default plex-mono.table.ts).
    const i = process.argv.indexOf("--out");
    const want = i < 0 ? TABLES[0].out : process.argv[i + 1];
    const t = TABLES.find((x) => x.out === want);
    if (t === undefined) fail(`no table ${want}; have ${TABLES.map((x) => x.out).join(", ")}`);
    process.stdout.write(tableSource(t));
  }
}
