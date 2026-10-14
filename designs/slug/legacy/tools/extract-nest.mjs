// SLUG's shelf nest run headless from the legacy page (M07-T01 step 2).
// Two blocks of designs/slug/legacy/slug.html are copied byte for byte:
// line 272 (`const OUTLINES`, the cut loops baked from slug.scad) and the
// block from `const PART_QTY` (line 1042) to the line before
// `function download` (line 1138), which holds ACRYLIC, extent, nest,
// placedLoops, sheetSVG and sheetDXF. The page's own nest() packs ply and
// acrylic at 600 x 400, gap 4, margin 6 (the page's call), and sheetDXF and
// sheetSVG(forCut) regenerate every sheet for a byte compare against the 20
// shipped files in ../sheets/.
//
//   node designs/slug/legacy/tools/extract-nest.mjs --check   compare with the record
//   node designs/slug/legacy/tools/extract-nest.mjs --write   write the record
//   node designs/slug/legacy/tools/extract-nest.mjs --out f   write the extracted module
//
// Writes packages/nest/records/slug-legacy.json. Exit 1 when the page or a
// shipped sheet is not the pinned copy, a marker moved, a number of the M07
// Records table moved, or the result differs from the committed record.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Asserts, finish, marker, readPinned, sha256 } from "../../../../tools/legacy/record.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const LEGACY = join(here, "..");
const PAGE = join(LEGACY, "slug.html");
const PAGE_SHA256 = "2d09238c27d5ca4bf023eeee44939b1500470ad2058822b8d0add48ec9bf3241";
const SHEETS = join(LEGACY, "sheets");

/** The shipped sheets, pinned by the sheets/ lines of ../SHA256SUMS. */
function shippedPins() {
  const pins = {};
  for (const line of readFileSync(join(LEGACY, "SHA256SUMS"), "utf8").split("\n")) {
    const m = line.match(/^([0-9a-f]{64}) {2}sheets\/(.+)$/);
    if (m) pins[m[2]] = m[1];
  }
  if (Object.keys(pins).length !== 20) throw new Error(`SHA256SUMS pins ${Object.keys(pins).length} sheet files, expected 20`);
  return pins;
}

export function extract() {
  const lines = readPinned(PAGE, PAGE_SHA256).toString("utf8").split("\n");
  marker(lines, "const OUTLINES=JSON.parse(", 272);
  marker(lines, "const PART_QTY=", 1042);
  marker(lines, "const ACRYLIC=", 1051);
  marker(lines, "function nest(names, W, H, gap, margin){", 1061);
  marker(lines, "function sheetDXF(sh){", 1129);
  marker(lines, "function download(", 1138);
  const outlines = lines[272 - 1];
  const block = lines.slice(1042 - 1, 1138 - 1);
  return `${outlines}\n${block.join("\n")}\nexport {OUTLINES,PART_QTY,ACRYLIC,extent,nest,placedLoops,sheetSVG,sheetDXF};\n`;
}

function load() {
  const body = extract().replace(/\nexport \{[^}]*\};\n$/, "\nreturn {OUTLINES,PART_QTY,ACRYLIC,extent,nest,placedLoops,sheetSVG,sheetDXF};\n");
  return new Function(body)();
}

// Even-odd ray test from the loop's first vertex; a loop is an outer when an
// even number of larger loops of the same part contain it. A part with more
// than one outer is severed (the cutfiles.py check_connected failure class).
function inside(pt, l) {
  let c = false;
  for (let i = 0, j = l.length - 1; i < l.length; j = i++) {
    const [xi, yi] = l[i], [xj, yj] = l[j];
    if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
const area = (l) => Math.abs(l.reduce((a, [x, y], i) => { const [x2, y2] = l[(i + 1) % l.length]; return a + x * y2 - x2 * y; }, 0) / 2);

function connectivity(OUTLINES) {
  let loops = 0, holes = 0, severed = [], outside = 0;
  for (const name of Object.keys(OUTLINES)) {
    const L = OUTLINES[name];
    loops += L.length;
    let outers = 0;
    L.forEach((l, i) => {
      const depth = L.filter((m, j) => j !== i && area(m) > area(l) && inside(l[0], m)).length;
      if (depth % 2 === 0) outers++;
    });
    if (outers !== 1) severed.push(`${name}:${outers}`);
    const big = L.reduce((a, l) => (area(l) > area(a) ? l : a), L[0]);
    for (const l of L) if (l !== big) { holes++; if (!inside(l[0], big)) outside++; }
  }
  return { parts: Object.keys(OUTLINES).length, loops, holes, severed, holesOutsideOuter: outside };
}

function run() {
  const S = load();
  const { OUTLINES, PART_QTY, ACRYLIC, nest, placedLoops, sheetDXF, sheetSVG } = S;
  const W = 600, H = 400, GAP = 4, MARGIN = 6;
  const names = Object.keys(PART_QTY);
  const ply = names.filter((n) => !ACRYLIC.has(n) && OUTLINES[n]);
  const acr = names.filter((n) => ACRYLIC.has(n) && OUTLINES[n]);
  const nests = {};
  const files = [];
  let dxfEqual = 0, svgEqual = 0;
  for (const [label, list] of [["ply", ply], ["acrylic", acr]]) {
    const sheets = nest(list, W, H, GAP, MARGIN);
    nests[label] = {
      sheets: sheets.length,
      oversize: [...nest.oversize],
      partsPerSheet: sheets.map((s) => s.parts.length),
      loopsPerSheet: sheets.map((s) => s.parts.reduce((n, p) => n + placedLoops(p).length, 0)),
      fillPercent: sheets.map((s) => Math.round(s.fill * 100)),
    };
    sheets.forEach((sh, i) => {
      for (const [ext, text] of [["dxf", sheetDXF(sh)], ["svg", sheetSVG(sh, W, H, true)]]) {
        const name = `slug_${label}_sheet${i + 1}.${ext}`;
        const shipped = readFileSync(join(SHEETS, name));
        const equal = shipped.equals(Buffer.from(text, "utf8"));
        if (equal && ext === "dxf") dxfEqual++;
        if (equal && ext === "svg") svgEqual++;
        files.push({ name, shippedSha256: sha256(shipped), regeneratedSha256: sha256(text), equal });
      }
    });
  }
  const pieces = Object.values(PART_QTY).reduce((a, b) => a + b, 0);
  const notNested = Object.keys(OUTLINES).filter((n) => !(n in PART_QTY));
  // BUILD.md lines 4, 109 and 153 name the door flap and the window; the
  // quantity 1 each is inferred, so this run is informational.
  const inferredQty = { ...PART_QTY, door_flap: 1, window: 1 };
  const acrInferred = Object.keys(inferredQty).filter((n) => ACRYLIC.has(n) && OUTLINES[n]);
  const saved = { ...PART_QTY };
  Object.assign(PART_QTY, inferredQty);
  const inf = nest(acrInferred, W, H, GAP, MARGIN);
  for (const k of Object.keys(PART_QTY)) if (!(k in saved)) delete PART_QTY[k];
  Object.assign(PART_QTY, saved);
  return {
    params: { sheetW: W, sheetH: H, gap: GAP, margin: MARGIN },
    partQty: { names: names.length, pieces },
    outlines: { names: Object.keys(OUTLINES).length, notInPartQty: notNested },
    nest: nests,
    dxfByteEqual: dxfEqual,
    svgByteEqual: svgEqual,
    files,
    connectivity: connectivity(OUTLINES),
    acrylicWithDoorFlapAndWindow: { qualifier: "informational, quantities inferred from BUILD.md lines 4, 109, 153", sheets: inf.length, partsPerSheet: inf.map((s) => s.parts.length) },
  };
}

const argv = process.argv;
if (argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const o = argv.indexOf("--out");
    if (o > 0) { writeFileSync(argv[o + 1], extract()); process.exit(0); }
    for (const [name, pin] of Object.entries(shippedPins())) readPinned(join(SHEETS, name), pin);
    const r = run();
    const a = new Asserts();
    // The M07 Records table, 2026-10-04 (computed).
    a.eq("ply sheets", r.nest.ply.sheets, 9);
    a.eq("ply parts per sheet", r.nest.ply.partsPerSheet, [3, 3, 11, 18, 5, 5, 6, 7, 2]);
    a.eq("ply loops per sheet", r.nest.ply.loopsPerSheet, [34, 26, 38, 97, 52, 38, 39, 89, 5]);
    a.eq("acrylic sheets", r.nest.acrylic.sheets, 1);
    a.eq("acrylic parts", r.nest.acrylic.partsPerSheet, [3]);
    a.eq("acrylic loops", r.nest.acrylic.loopsPerSheet, [6]);
    a.eq("oversize", [...r.nest.ply.oversize, ...r.nest.acrylic.oversize], []);
    a.eq("dxf byte-equal", r.dxfByteEqual, 10);
    a.eq("svg byte-equal", r.svgByteEqual, 10);
    a.eq("PART_QTY names", r.partQty.names, 42);
    a.eq("PART_QTY pieces", r.partQty.pieces, 63);
    a.eq("baked outlines", r.outlines.names, 46);
    a.eq("baked, not in PART_QTY", [...r.outlines.notInPartQty].sort(), ["door_flap", "ret_back", "ret_lip", "window"]);
    a.eq("connectivity loops", r.connectivity.loops, 369);
    a.eq("connectivity holes", r.connectivity.holes, 323);
    a.eq("severed parts", r.connectivity.severed, []);
    a.eq("holes outside their outer", r.connectivity.holesOutsideOuter, 0);
    a.eq("acrylic with door_flap and window", [r.acrylicWithDoorFlapAndWindow.sheets, r.acrylicWithDoorFlapAndWindow.partsPerSheet], [1, [5]]);
    const inputs = { [PAGE]: PAGE_SHA256 };
    for (const f of r.files) inputs[join(SHEETS, f.name)] = f.shippedSha256;
    finish({
      record: "slug-legacy",
      out: "packages/nest/records/slug-legacy.json",
      command: "node designs/slug/legacy/tools/extract-nest.mjs --check",
      qualifier: "computed: the page's own nest(), sheetDXF() and sheetSVG() run in node on the pinned slug.html; connectivity by an even-odd ray test from each loop's first vertex",
      inputs,
    }, r, a);
    process.stdout.write(`ply ${r.nest.ply.sheets} sheets, acrylic ${r.nest.acrylic.sheets} sheet, ${r.dxfByteEqual} of 10 byte-equal\n`);
  } catch (e) {
    process.stderr.write(`extract-nest: ${e.message}\n`);
    process.exit(1);
  }
}
