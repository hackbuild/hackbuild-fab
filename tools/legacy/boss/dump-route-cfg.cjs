// M05-T09 step 6: dump the router config every BOSS SEAT hands BOSS.route,
// with BOSS's own route result, so designs/blocks/src/route-seat.ts can be
// held to the seat layout (parts.js lines 29 to 36 and 72 to 172) and the
// completion counts can be compared with BOSS's (benches-conductive-b.md
// B.6). One file per seat in packages/copper/test/fixtures/boss-seats/.
//
// It loads kernel.js, boss.js and parts.js from the legacy copy, wraps
// BOSS.route to record its cfg argument and result, and builds each seat
// with PARTS.make('seat', params). Nothing on disk is edited (D-142).
//
// Seats: the four of test_parts.js line 9, the real all-40 Pico case (every
// pin listed by name, benches-conductive-b.md B.6 and B.11), and the
// vacuous sweep.js line 6 case `pins: 'all'`, recorded as BOSS built it (a
// 0-pin seat that reports clean) so the port's refusal is checked against
// the legacy behaviour it replaces.
//
// usage: node tools/legacy/boss/dump-route-cfg.cjs <boss-src dir> <out dir>
// exit 0 written, 1 on a refusal (bytes not the BOSS of record), 2 on a
// usage error or when polygon-clipping is not installed

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

// polygon-clipping stays out of the root lock (.hbf-notes/m00-report.md);
// kernel.js needs it to build every part. Install it next to the repo
// modules before running:
//   npm install --no-save polygon-clipping@0.15.7
let polygonClipping;
try {
  polygonClipping = require("polygon-clipping");
} catch {
  console.error("polygon-clipping missing. run: npm install --no-save polygon-clipping@0.15.7");
  process.exit(2);
}
const earcut = require("earcut");

const [srcArg, outArg] = process.argv.slice(2);
if (!srcArg || !outArg || process.argv.length !== 4) {
  console.error("usage: node tools/legacy/boss/dump-route-cfg.cjs <boss-src dir> <out dir>");
  process.exit(2);
}
const SRC = path.resolve(srcArg);
const OUT = path.resolve(outArg);

// The legacy files this dump runs, pinned to designs/blocks/legacy/README.md
// and lineage.json (blocks.kernel/boss-legacy, router/boss-route,
// blocks.parts/boss-legacy); any other bytes are not the BOSS of record.
const PINNED = {
  "src/kernel.js": "344d80b3df3b6b15e5861de343a03c79663669fd700578bf162f97afba499de1",
  "src/boss.js": "fad77485920bb29d996610adf577d4d10c60f813ce4abc036a10f5a4aa8bfcf7",
  "src/parts.js": "e9e44eaca651fac61e248e5d066cb523ec7d71252c8a792d1ef09057f801d9e6",
};
const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
for (const [rel, want] of Object.entries(PINNED)) {
  const got = sha256(fs.readFileSync(path.join(SRC, rel)));
  if (got !== want) {
    console.error(`${rel} sha256 ${got}, pinned ${want}: not the BOSS legacy copy`);
    process.exit(1);
  }
}

globalThis.earcut = earcut;
globalThis.polygonClipping = polygonClipping;
for (const f of Object.keys(PINNED)) require(path.join(SRC, f));
const BOSS = globalThis.BOSS;
const PARTS = globalThis.PARTS;

const calls = [];
const route = BOSS.route;
BOSS.route = function (cfg) {
  const before = JSON.parse(JSON.stringify(cfg));
  const r = route.call(this, cfg);
  calls.push({ cfg: before, result: { paths: r.paths, failed: r.failed, rips: BOSS.lastRoute.rips } });
  return r;
};

const pico = PARTS.boardPins(PARTS.BOARDS.pico).map((q) => q.name);
const SEATS = [
  { name: "c3mini-press", params: { board: "c3mini", mount: "press" }, from: "test_parts.js line 9" },
  { name: "c3mini-snap", params: { board: "c3mini", mount: "snap" }, from: "test_parts.js line 9" },
  { name: "teensy40-press", params: { board: "teensy40", mount: "press" }, from: "test_parts.js line 9" },
  { name: "pico-snap", params: { board: "pico", mount: "snap" }, from: "test_parts.js line 9" },
  { name: "pico-press-all40", params: { board: "pico", mount: "press", pins: pico }, from: "benches-conductive-b.md B.6 and B.11, every Pico pin listed by name" },
  { name: "pico-press-pins-all-string", params: { board: "pico", mount: "press", pins: "all" }, from: "sweep.js line 6, the vacuous case of benches-conductive-b.md B.11" },
  // layout only: the remaining sweep.js line 5 seats, as BOSS ran them
  // (hinge 'hooks' is no SEAT_PARAMS option; seat() treats any hinge but
  // 'pin' as none), and a seat whose lane budget (parts.js lines 81 to 83)
  // decides the column count
  { name: "pico-press", params: { board: "pico", mount: "press" }, from: "sweep.js line 5", layoutOnly: true },
  { name: "teensy40-snap-hooks", params: { board: "teensy40", mount: "snap", hinge: "hooks" }, from: "sweep.js line 5", layoutOnly: true },
  { name: "custom-press", params: { board: "custom", mount: "press" }, from: "sweep.js line 5", layoutOnly: true },
  { name: "c3mini-snap-hooks", params: { board: "c3mini", mount: "snap", hinge: "hooks" }, from: "sweep.js line 5", layoutOnly: true },
  { name: "c3mini-press-lanes", params: { board: "c3mini", mount: "press", pins: ["5V", "GND", "3V3", "IO4", "IO5", "IO6", "IO7", "IO8"] }, from: "four pins a side, where the lane budget adds a column (computed with BOSS autosize)", layoutOnly: true },
];

// The STD and SLOTS values the seat layout and BOSS's pin to stud estimate
// read (boss.js lines 11 to 25 and 29 to 33; parts.js line 175).
const STD = BOSS.STD;
const std = {
  P: STD.P, studD: STD.studD, brickH: STD.brickH, postD: STD.postD, padW: STD.padW, boreInPad: STD.boreInPad,
  L1: STD.L1, traceT: STD.traceT, padTop: STD.padTop, traceW: STD.traceW, clr: STD.clr, cell: STD.cell, L: BOSS.L,
  rhoCpla: BOSS.SLOTS[1].rho,
};

fs.mkdirSync(OUT, { recursive: true });
const written = new Set();
for (const s of SEATS) {
  calls.length = 0;
  const part = PARTS.make("seat", s.params);
  if (calls.length !== 1) throw new Error(`${s.name}: ${calls.length} route calls, expected 1`);
  const routed = part.readout.find((r) => r[0] === "routed");
  const doc = {
    note: "written by tools/legacy/boss/dump-route-cfg.cjs from designs/blocks/legacy/boss-src (M05-T09 step 6); never edited by hand. Lengths in mm, resistance in ohm; every value computed by BOSS.",
    sources: PINNED,
    node: process.version,
    name: s.name,
    from: s.from,
    layoutOnly: s.layoutOnly === true,
    params: s.params,
    std,
    seat: { cols: part.cols, rows: part.rows, top: part.top, routed: routed ? routed[1] : null, warnings: part.warnings, pinMap: part.pinMap },
    pinToStudOhm: part.model.elements.filter((e) => e.type === "R").map((e) => ({ net: e.b, ohm: e.R })),
    cfg: calls[0].cfg,
    result: calls[0].result,
  };
  const file = `${s.name}.json`;
  written.add(file);
  fs.writeFileSync(path.join(OUT, file), `${JSON.stringify(doc)}\n`);
  console.log(`${s.name}: ${part.cols} x ${part.rows}, nets ${calls[0].cfg.nets.length}, routed ${routed ? routed[1] : "none"}, failed ${calls[0].result.failed.length}, warnings ${part.warnings.length}`);
}
for (const f of fs.readdirSync(OUT)) if (f.endsWith(".json") && !written.has(f)) fs.rmSync(path.join(OUT, f));
