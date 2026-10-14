// Dumps the element list the BOSS sim solves, scene by scene, with BOSS's
// own node voltages, element currents and pin readings, so the analytic DC
// solver in packages/circuit/src/dc/nodal.ts can be held to it (M05-T03).
//
// It loads kernel.js, boss.js and parts.js from the legacy copy, then
// evaluates sim.js with two textual patches; the file on disk stays byte
// identical (D-142):
//   1. the string `50e3` (the PULLUP pin, sim.js line 91) becomes
//      `globalThis.__PU`, 50e3 unless a scene sets it;
//   2. after `const gnd = idOf(gndKey);` (line 101) it inserts
//      `globalThis.__DUMP = { R, V, diodes, gnd, nodes: [...nodeIds] };`.
// The R objects are the ones solve() later gives `.i` (line 137), so the
// dump carries BOSS's element currents as well as its inputs.
//
// Scenes: every solve() that test_sim.js and test_sim2.js run, in order,
// with the lines each script prints, and the BUTTON scenes of M05-T07 step
// 1 (c3mini press seat, IO2 PULLUP, two equal wires IO2 to A and GND to B).
//
// usage: node tools/legacy/boss/dump-elements.cjs <boss-src dir> <out dir> [--table]
// --table writes only the pressed BUTTON scenes at the 50 kohm pullup, the
// rows of the M05-T07 table, into the BLOCKS reproduction reference's
// scenes/ folder; the bytes equal the fixtures of the same name.
// exit 0 written, 1 on a failure, 2 on a usage error or when
// polygon-clipping is not installed

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const util = require("node:util");
const crypto = require("node:crypto");
const Module = require("node:module");

// polygon-clipping stays out of the root lock (.hbf-notes/m00-report.md,
// lint-voice and its predicates dependency); kernel.js needs it to build
// every part. Install it next to the repo modules before running:
//   npm install --no-save polygon-clipping@0.15.7
let polygonClipping;
try {
  polygonClipping = require("polygon-clipping");
} catch {
  console.error("polygon-clipping missing. run: npm install --no-save polygon-clipping@0.15.7");
  process.exit(2);
}
const earcut = require("earcut");

const [srcArg, outArg, ...flags] = process.argv.slice(2);
const TABLE = flags.length === 1 && flags[0] === "--table";
if (!srcArg || !outArg || (flags.length > 0 && !TABLE)) {
  console.error("usage: node tools/legacy/boss/dump-elements.cjs <boss-src dir> <out dir> [--table]");
  process.exit(2);
}
const SRC = path.resolve(srcArg);
const OUT = path.resolve(outArg);

// The legacy files this dump runs, pinned to designs/blocks/legacy/README.md
// and lineage.json; any other bytes are not the BOSS of record.
const PINNED = {
  "src/kernel.js": "344d80b3df3b6b15e5861de343a03c79663669fd700578bf162f97afba499de1",
  "src/boss.js": "fad77485920bb29d996610adf577d4d10c60f813ce4abc036a10f5a4aa8bfcf7",
  "src/parts.js": "e9e44eaca651fac61e248e5d066cb523ec7d71252c8a792d1ef09057f801d9e6",
  "src/sim.js": "27e4b12212b75c63d3e812db7f2dbb6137e7875049b63419676965706a38e6f5",
  "test_sim.js": "ed86f4dc1d164abcc930fbf6909350c17b54e84a14b29c8e4f2d21ff7b77f0de",
  "test_sim2.js": "72508dc766f68afdc36d6bcd51c0951faf6d4e1eb184925724421e7ca5e957b4",
};
const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
for (const [rel, want] of Object.entries(PINNED)) {
  const got = sha256(fs.readFileSync(path.join(SRC, rel)));
  if (got !== want) {
    console.error(`${rel} sha256 ${got}, pinned ${want}: not the BOSS legacy copy`);
    process.exit(1);
  }
}

const PU_TEXT = "50e3";
const GND_TEXT = "const gnd = idOf(gndKey);";
const DUMP_TEXT = " globalThis.__DUMP = { R, V, diodes, gnd, nodes: [...nodeIds] };";

function patchedSim(text) {
  const count = (s) => text.split(s).length - 1;
  if (count(PU_TEXT) !== 1) throw new Error(`sim.js holds ${count(PU_TEXT)} copies of ${PU_TEXT}, expected 1`);
  if (count(GND_TEXT) !== 1) throw new Error(`sim.js holds ${count(GND_TEXT)} copies of ${GND_TEXT}, expected 1`);
  return text.replace(PU_TEXT, "globalThis.__PU").replace(GND_TEXT, GND_TEXT + DUMP_TEXT);
}

globalThis.earcut = earcut;
globalThis.polygonClipping = polygonClipping;
for (const f of ["src/kernel.js", "src/boss.js", "src/parts.js"]) require(path.join(SRC, f));

// sim.js is evaluated patched and registered in the require cache under its
// own path, so the test scripts' require('./src/sim.js') gets this copy.
const simPath = path.join(SRC, "src/sim.js");
vm.runInThisContext(patchedSim(fs.readFileSync(simPath, "utf8")), { filename: simPath });
const simModule = new Module(simPath, module);
simModule.filename = simPath;
simModule.loaded = true;
require.cache[simPath] = simModule;

const SIM = globalThis.SIM;
const PARTS = globalThis.PARTS;
const PU_DEFAULT = 50e3;
globalThis.__PU = PU_DEFAULT;

// Every solve() lands here: inputs from __DUMP, outputs from BOSS's result.
const scenes = [];
let current = null;
const solve = SIM.Scene.prototype.solve;
SIM.Scene.prototype.solve = function () {
  globalThis.__DUMP = null;
  const r = solve.call(this);
  const d = globalThis.__DUMP;
  const rec = { name: `${current.prefix}-${String(++current.n).padStart(2, "0")}`, source: current.source, pullupOhm: globalThis.__PU, ok: r.ok };
  if (!r.ok || d === null) {
    rec.reason = r.reason;
    scenes.push(rec);
    current.last = rec;
    return r;
  }
  const idOfRoot = new Map(d.nodes);
  const idOf = (key) => idOfRoot.get(r.find(key));
  const x = new Array(d.nodes.length);
  for (const [key, id] of d.nodes) x[id] = r.volts[key];
  rec.network = {
    nodeCount: d.nodes.length,
    ground: d.gnd,
    nodes: d.nodes.map(([key]) => key),
    resistors: d.R.map((e) => ({ a: e.a, b: e.b, ohm: e.r, tag: e.tag })),
    leds: d.diodes.map((e) => ({ anode: e.a, cathode: e.k, vfV: e.vf, seriesOhm: e.rs })),
    sources: d.V.map((e) => ({ pos: e.a, neg: e.b, volts: e.v, tag: e.tag })),
  };
  rec.boss = {
    nodeVolts: x,
    resistorAmps: d.R.map((e) => e.i),
    leds: r.readings.leds.map((l) => ({ mA: l.mA, v: l.v })),
    pins: r.readings.pins.map((p) => ({ pin: p.pin, mode: p.mode, node: idOf(p.node), v: p.v, adc: p.adc, digital: p.digital })),
  };
  rec.printed = [];
  scenes.push(rec);
  current.last = rec;
  return r;
};

// test_sim.js and test_sim2.js run as shipped; each printed line is kept on
// the scene whose solve() ran last before it.
function runScript(file) {
  current = { prefix: path.basename(file, ".js").replace(/_/g, "-"), source: file, n: 0, last: null };
  const log = console.log;
  const pre = [];
  console.log = (...args) => { const line = util.format(...args); (current.last ? current.last.printed : pre).push(line); };
  try {
    require(path.join(SRC, file));
  } finally {
    console.log = log;
  }
  if (pre.length) scenes.find((s) => s.source === file).printedBefore = pre;
}
runScript("test_sim.js");
runScript("test_sim2.js");

// M05-T07 step 1: the BUTTON scene at BOSS v1, laid out as test_sim2.js
// lines 5 to 9 (seat at 1,1, button at 12,12), button pressed unless named.
const CORES = { 2: "cpla", 4: "ctpu" };
const BUTTON_SCENES = [
  ...[10, 40, 80, 120, 150, 170, 200].map((len) => ({ shape: "straight", len, core: 2 })),
  { shape: "zigzag", len: 200, core: 2 },
  { shape: "spiral", len: 200, core: 2 },
  { shape: "straight", len: 80, core: 2, pressed: false },
  { shape: "straight", len: 80, core: 2, pu: 80000 },
  { shape: "straight", len: 80, core: 2, pu: 45000 },
  ...[10, 40, 80, 200].map((len) => ({ shape: "straight", len, core: 4 })),
  { shape: "zigzag", len: 200, core: 4 },
  { shape: "spiral", len: 200, core: 4 },
];
for (const s of BUTTON_SCENES) {
  const pressed = s.pressed !== false;
  const pu = s.pu ?? PU_DEFAULT;
  current = { prefix: "", source: "tools/legacy/boss/dump-elements.cjs BUTTON_SCENES (M05-T07 step 1)", n: 0, last: null };
  globalThis.__PU = pu;
  const sc = new SIM.Scene();
  const st = sc.add(PARTS.make("seat", { board: "c3mini", mount: "press" }), 1, 1, 0);
  sc.pinModes[st.uid] = { IO2: "PULLUP" };
  const b = sc.add(PARTS.make("button", {}), 12, 12, 0);
  const mk = () => PARTS.make("wire", { shape: s.shape, len: s.len, core: s.core });
  sc.addWire(mk(), { inst: st, port: "IO2" }, { inst: b, port: "A" });
  sc.addWire(mk(), { inst: st, port: "GND" }, { inst: b, port: "B" });
  b.ctrl.pressed = pressed;
  sc.solve();
  const rec = scenes[scenes.length - 1];
  rec.name = `button-${CORES[s.core]}-${s.shape}-${String(s.len).padStart(3, "0")}${pressed ? "" : "-released"}${pu === PU_DEFAULT ? "" : `-pu${pu}`}`;
  rec.button = { shape: s.shape, lenMm: s.len, core: CORES[s.core], pressed };
  delete rec.printed;
  globalThis.__PU = PU_DEFAULT;
}

// M05-T07 table rows: pressed BUTTON scenes at BOSS's own pullup.
const keep = TABLE ? scenes.filter((s) => s.button !== undefined && s.button.pressed && s.pullupOhm === PU_DEFAULT) : scenes;

fs.mkdirSync(OUT, { recursive: true });
const written = new Set();
for (const s of keep) {
  const file = `${s.name}.json`;
  if (written.has(file)) throw new Error(`two scenes named ${s.name}`);
  written.add(file);
  const doc = {
    note: "written by tools/legacy/boss/dump-elements.cjs from designs/blocks/legacy/boss-src (M05-T03); never edited by hand. Volts in V, currents in A, LED current in mA as BOSS reports it; every value computed by the BOSS sim.",
    sources: Object.fromEntries(Object.entries(PINNED)),
    ...s,
  };
  fs.writeFileSync(path.join(OUT, file), `${JSON.stringify(doc, null, 1)}\n`);
}
// A scene this run did not write is stale.
for (const f of fs.readdirSync(OUT)) if (f.endsWith(".json") && !written.has(f)) fs.rmSync(path.join(OUT, f));
console.log(`wrote ${written.size} scenes to ${path.relative(process.cwd(), OUT) || "."}`);
