// OGEE R16-P build plates run headless from the original files (M07-T01 step 3).
// The data is the PARTS, GROUPS and DRIVE JSON that build_plate.py baked
// into the original ogee16-plate.html (lines 182, 266, 267; the base64 `stl` field is
// dropped). The packer is the block of source/plate_template.html from
// `const MARGIN = 10;` (line 263) to the line before `function show(n)`
// (line 341), byte identical to the same block of the shipped page, with
// the template's state lines 177 to 179 (`PLATE = 256`, `gap = 4`, `on`) and
// the drive switch of setDrive (lines 182 and 183). build_plate.py itself
// cannot run from the source zip: it reads three.min.js, which the zip does
// not hold.
//
// Each plate is audited on its footprint rectangles (w x d, swapped when
// turned): pairwise disjoint, inside the 10 mm margin of the 256 mm bed,
// and the smallest gap between two rectangles.
//
//   node designs/ogee16/extract/extract-plate.mjs --drive knobs|servos
//   node designs/ogee16/extract/extract-plate.mjs --write    both drives, write the record
//
// Writes packages/nest/records/ogee16-plates-legacy.json. Exit 1 when an
// input is not the pinned copy, a marker moved, a number of the M07 Records
// table moved, or the result differs from the committed record.

import { fileURLToPath } from "node:url";
import { Asserts, finish, marker, readPinned } from "../../../tools/legacy/record.mjs";
import { localOriginal } from "../../../tools/test-support/originals-root.ts";

// The original page and template, as archive ids; read through
// tools/test-support/originals-root.ts (HBF_ORIGINALS).
const PAGE = "fab-knowledge:originals/ogee16/files/ogee16-plate.html";
const PAGE_SHA256 = "86a000eb98eeb108fedfedc1d7c4ac9a08cfdeef8e8b2661b71069eb207c8837";
const TEMPLATE = "fab-knowledge:originals/ogee16/files/src/source/plate_template.html";
const TEMPLATE_SHA256 = "59507bfae682869fb87d9ff5d6aa59fe2746f51ece249359ab69b223290f04bf";

export function data() {
  const lines = readPinned(localOriginal(PAGE), PAGE_SHA256).toString("utf8").split("\n");
  const grab = (name, line) => {
    marker(lines, `const ${name} = `, line);
    return JSON.parse(lines[line - 1].slice(`const ${name} = `.length).replace(/;\s*$/, ""));
  };
  const PARTS = grab("PARTS", 182).map(({ stl, ...p }) => p);
  return { PARTS, GROUPS: grab("GROUPS", 266), DRIVE: grab("DRIVE", 267) };
}

export function packer() {
  const lines = readPinned(localOriginal(TEMPLATE), TEMPLATE_SHA256).toString("utf8").split("\n");
  marker(lines, "const PLATE = 256, MAXH = 256;", 177);
  marker(lines, "let gap = 4, cur = 0;", 178);
  marker(lines, "const on = {};", 179);
  marker(lines, "function setDrive(d){", 180);
  marker(lines, "const MARGIN = 10;", 263);
  marker(lines, "function show(n){", 341);
  const state = lines.slice(177 - 1, 179);
  const driveSwitch = lines.slice(182 - 1, 183);
  const block = lines.slice(263 - 1, 341 - 1);
  return `${state.join("\n")}\nfunction setDrive(d){\n${driveSwitch.join("\n")}\n}\n${block.join("\n")}\n`
    + "return {pack, autoGap, fill, setDrive, setGap: (g) => { gap = g; }, getGap: () => gap, MARGIN, PLATE};";
}

function audit(plates, margin, plate) {
  let overlaps = 0, outOfBounds = 0, pieces = 0, minGap = Infinity;
  const types = new Set();
  for (const pl of plates) {
    const r = pl.map((it) => ({ x: it.x, y: it.y, w: it.rot ? it.p.d : it.p.w, h: it.rot ? it.p.w : it.p.d }));
    pieces += pl.length;
    for (const it of pl) types.add(it.p.id);
    for (const q of r) if (q.x < margin - 1e-9 || q.y < margin - 1e-9 || q.x + q.w > plate - margin + 1e-9 || q.y + q.h > plate - margin + 1e-9) outOfBounds++;
    for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) {
      const A = r[i], B = r[j];
      const dx = Math.max(B.x - (A.x + A.w), A.x - (B.x + B.w)), dy = Math.max(B.y - (A.y + A.h), A.y - (B.y + B.h));
      if (dx < -1e-9 && dy < -1e-9) overlaps++;
      minGap = Math.min(minGap, Math.max(dx, dy));
    }
  }
  return { plates: plates.length, pieces, types: types.size, overlaps, outOfBounds, minGap: +minGap.toFixed(3) };
}

function runDrive(drive) {
  const { PARTS, GROUPS, DRIVE } = data();
  const api = new Function("PARTS", "GROUPS", "DRIVE", packer())(PARTS, GROUPS, DRIVE);
  api.setDrive(drive);
  const atGap4 = api.pack();
  const auto = api.autoGap();
  api.setGap(auto.gap);
  const atAuto = api.pack();
  return {
    gap4: { ...audit(atGap4, api.MARGIN, api.PLATE), labels: atGap4.map((p) => `${p.label}:${p.length}`), fillPercent: atGap4.map(api.fill) },
    autoGap: auto,
    atAutoGap: { ...audit(atAuto, api.MARGIN, api.PLATE), labels: atAuto.map((p) => `${p.label}:${p.length}`) },
  };
}

// The M07 Records table, 2026-10-04 (computed), and D-186.
const EXPECT = {
  knobs: { pieces: 124, types: 20, plates: 20, autoGap: 16 },
  servos: { pieces: 119, types: 21, plates: 21 },
};

function check(a, drive, r) {
  const e = EXPECT[drive];
  a.eq(`${drive} pieces`, r.gap4.pieces, e.pieces);
  a.eq(`${drive} types`, r.gap4.types, e.types);
  a.eq(`${drive} plates`, r.gap4.plates, e.plates);
  a.eq(`${drive} overlaps`, r.gap4.overlaps, 0);
  a.eq(`${drive} out of bounds`, r.gap4.outOfBounds, 0);
  a.eq(`${drive} one type per plate`, r.gap4.plates, r.gap4.types);
  a.eq(`${drive} min gap at gap 4`, r.gap4.minGap, 4);
  a.eq(`${drive} autoGap keeps the plate count`, r.autoGap.plates, e.plates);
  if (e.autoGap !== undefined) a.eq(`${drive} autoGap`, r.autoGap.gap, e.autoGap);
  a.eq(`${drive} overlaps at autoGap`, r.atAutoGap.overlaps, 0);
  a.eq(`${drive} out of bounds at autoGap`, r.atAutoGap.outOfBounds, 0);
}

const argv = process.argv;
if (argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const d = argv.indexOf("--drive");
    const drives = d > 0 ? [argv[d + 1]] : ["knobs", "servos"];
    for (const k of drives) if (!(k in EXPECT)) throw new Error(`--drive ${k}: knobs or servos`);
    const a = new Asserts();
    const result = {};
    for (const k of ["knobs", "servos"]) { result[k] = runDrive(k); check(a, k, result[k]); }
    finish({
      record: "ogee16-plates-legacy",
      out: "packages/nest/records/ogee16-plates-legacy.json",
      command: "node designs/ogee16/extract/extract-plate.mjs --drive knobs; --drive servos",
      qualifier: "computed: plate_template.html packOne, pack and autoGap run in node on the PARTS, GROUPS and DRIVE baked into ogee16-plate.html; audit on footprint rectangles",
      inputs: { [PAGE]: PAGE_SHA256, [TEMPLATE]: TEMPLATE_SHA256 },
    }, result, a);
    for (const k of drives) {
      const r = result[k].gap4;
      process.stdout.write(`${k}: ${r.pieces} pieces, ${r.types} types, ${r.plates} plates, ${r.overlaps} overlaps, ${r.outOfBounds} out of bounds, min gap ${r.minGap}, autoGap ${result[k].autoGap.gap}\n`);
    }
  } catch (e) {
    process.stderr.write(`extract-plate: ${e.message}\n`);
    process.exit(1);
  }
}
