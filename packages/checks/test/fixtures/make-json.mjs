#!/usr/bin/env node
// Writes the JSON fixtures of the runnable checks (M04-T01 step 8): one
// passing and one failing input per check, each from its origin's own
// numbers where the seed, the notes or the design records give them. The
// meshes are recipes fixture-load.ts builds with the kernel mesher, so a
// fixture stays small and readable. The inlay fixtures carry the art uri
// packages/inlay computes, which is why this is a script.
//
//   npx tsc -b && node packages/checks/test/fixtures/make-json.mjs
//
// Generated, never hand-edited; the tests read the committed JSON.

import { mkdirSync, writeFileSync } from "node:fs";
import { register } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../../..");
register(pathToFileURL(path.join(ROOT, "core/dist/resolve-hook.js")).href);
const INLAY = await import(pathToFileURL(path.join(ROOT, "packages/inlay/dist/index.js")).href);

const out = new Map();
const put = (id, which, obj) => out.set(`${id}/${which}`, obj);

// ---- shapes ----
const sq = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const box = (x0, y0, z0, x1, y1, z1) => ({ box: [x0, y0, z0, x1, y1, z1] });
const circle = (cx, cy, r, n = 64) => Array.from({ length: n }, (_, i) => {
  const a = (2 * Math.PI * i) / n;
  return [Number((cx + r * Math.cos(a)).toFixed(6)), Number((cy + r * Math.sin(a)).toFixed(6))];
});
const UP = (z) => ({ origin: [0, 0, z], normal: [0, 0, 1], u: [1, 0, 0] });
const q = { qualifier: "computed", basis: null };
const fit = (cls, drawn = 0.1) => ({ class: cls, drawnPerSide: drawn, basis: "perSide" });
const one = (id, mesh = "b", extra = {}) => ({ id, bodies: [{ id: "b", mesh: `@${mesh}` }], ...extra });

// ---- PRT ----
put("CHK-PRT-01", "pass", { note: "a closed 10 mm cube", meshes: { b: { solids: [box(0, 0, 0, 10, 10, 10)] } }, parts: [one("cube")] });
put("CHK-PRT-01", "fail", {
  note: "two cubes sharing one vertical edge: the four-face edges CRESSET shipped (40 + 16 + 1 in cresset-132mm.3mf)",
  meshes: { b: { solids: [box(0, 0, 0, 10, 10, 10), box(10, 10, 0, 20, 20, 10)] } }, parts: [one("cubes")],
});

const band = (z) => ({ outline: [sq(0, 0, 10, 10)], z });
put("CHK-PRT-02", "pass", {
  note: "two stacked bands overlapping 0.015 mm, inside stack.bandOverlap 0.01 to 0.02",
  meshes: { b: { solids: [box(0, 0, 0, 10, 10, 4)] } }, parts: [one("lid")],
  shapes: { "lid/b": { route: "stack", bands: [band([0, 2]), band([1.985, 4])] } },
});
put("CHK-PRT-02", "fail", {
  note: "two bands on one coincident ring at z 2, the COAMING 4-face edges",
  meshes: { b: { solids: [box(0, 0, 0, 10, 10, 4)] } }, parts: [one("lid")],
  shapes: { "lid/b": { route: "stack", bands: [band([0, 2]), band([2, 4])] } },
});

const ref = (name, vol) => ({ uri: `hbf://mesh/${name}`, hash: name.padEnd(64, "0"), triangles: 12, bbox: [[0, 0, 0], [10, 10, 10]], volumeMm3: vol, watertight: true });
put("CHK-PRT-03", "pass", {
  note: "bodies of 100 and 50 mm3 in a 150 mm3 solid",
  assembly: { id: "coin", parts: [{ id: "coin", bodies: [{ id: "base", mesh: ref("a1", 100) }, { id: "art", mesh: ref("b1", 50) }], solid: ref("c1", 150) }] },
});
put("CHK-PRT-03", "fail", {
  note: "bodies of 100 and 50 mm3 in a 140 mm3 solid: 10 mm3 counted twice, the COLLAR overlap validate_3mf --overlap found",
  assembly: { id: "coin", parts: [{ id: "coin", bodies: [{ id: "base", mesh: ref("a2", 100) }, { id: "art", mesh: ref("b2", 50) }], solid: ref("c2", 140) }] },
});

const pocketPart = (lo, hi) => ({
  id: "stylus", bodies: [{ id: "b", mesh: "@b", outline: [sq(0, 0, 10, 10)] }],
  features: [{ kind: "pocket", id: "pocket.well", body: "b", outline: sq(lo, lo, hi, hi), face: UP(5), depth: 3, floor: "flat", fit: fit("LOCATE") }],
});
put("CHK-PRT-04", "pass", { note: "a 1.68 mm wall, 4 lines of 0.42", meshes: { b: { solids: [box(0, 0, 0, 10, 10, 5)] } }, parts: [pocketPart(1.68, 8.32)] });
put("CHK-PRT-04", "fail", { note: "a 0.3 mm wall, under one 0.42 line (STYLUS: a sub-line-width wall read as empty layers)", meshes: { b: { solids: [box(0, 0, 0, 10, 10, 5)] } }, parts: [pocketPart(0.3, 9.7)] });

put("CHK-PRT-05", "pass", { note: "a 2.17 mm plate: first layer 0.25 plus 8 layers of 0.24", meshes: { b: { solids: [box(0, 0, 0, 20, 20, 2.17)] } }, parts: [one("plate")] });
put("CHK-PRT-05", "fail", { note: "a 2.0 mm plate, 0.07 over the layer top at 1.93 (LOCKET rev C quantization audit)", meshes: { b: { solids: [box(0, 0, 0, 20, 20, 2)] } }, parts: [one("plate")] });

const plugPass = { note: "a 3 mm block on the bed", meshes: { b: { solids: [box(0, 0, 0, 10, 10, 3)] } }, parts: [one("plug")] };
const plugFail = {
  note: "a conductive plug body starting 0.5 mm above the base body, nothing under it (STYLUS: the cTPU plug printed disconnected)",
  meshes: { base: { solids: [box(0, 0, 0, 10, 10, 2)] }, plug: { solids: [box(3, 3, 2.5, 7, 7, 4)] } },
  parts: [{ id: "plug", bodies: [{ id: "base", mesh: "@base" }, { id: "plug", mesh: "@plug", role: "conductor", material: "ctpu", slot: 2 }] }],
};
put("CHK-PRT-06", "pass", plugPass);
put("CHK-PRT-06", "fail", plugFail);
put("CHK-PRT-07", "pass", plugPass);
put("CHK-PRT-07", "fail", { ...plugFail, note: "the same floating plug, an island at both 0.24 and 0.20 layers (islands.py)" });

const teardrop = (cx, cy, r, up) => {
  const pts = [];
  for (let a = 135; a <= 405; a += 5) pts.push([cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180)]);
  pts.push([cx, cy + r * Math.SQRT2]);
  const ring = pts.map(([x, y]) => [Number(x.toFixed(6)), Number((up ? y : 2 * cy - y).toFixed(6))]);
  return up ? ring : ring.reverse();
};
const borePart = (up) => ({
  note: up ? "a d 4 bore along x through a 12 mm block, teardrop peak up" : "the same bore with its teardrop peak at -Z (DETENT rev D: two composed rotations)",
  meshes: { b: { solids: [{ prism: { outline: sq(0, 0, 12, 12), holes: [teardrop(6, 6, 2, up)], z: [0, 20], axis: "x" } }] } },
  parts: [{ ...one("bracket"), features: [{ kind: "bore", id: "bore.pin", axis: { origin: [0, 6, 6], dir: [1, 0, 0] }, d: 4, depth: "through", fit: fit("LOCATE"), teardrop: "auto" }] }],
});
put("CHK-PRT-08", "pass", borePart(true));
put("CHK-PRT-08", "fail", borePart(false));

const bridge = (span) => ({
  note: `a 1 mm slab over two 3 mm posts ${span} mm apart (SLATE: the card's ${span} mm against under 9)`,
  meshes: { b: { solids: [box(0, 0, 0, 3, 5, 5), box(3 + span, 0, 0, 6 + span, 5, 5), box(0, 0, 5, 6 + span, 5, 6)] } },
  parts: [one("rail")],
});
put("CHK-PRT-09", "pass", bridge(8.5));
put("CHK-PRT-09", "fail", bridge(9.5));

const cone = (riTop) => ({
  note: riTop === 1 ? "a cone shell 5 mm tall, inner and outer lines both falling 1 mm: horizontal wall 1.0 throughout"
    : "the inner line falls 0.4 mm against the outer 1 mm: the wall thins from 1.0 to 0.4 (STYLUS)",
  meshes: { b: { solids: [{ revolve: { profile: [[2, 0], [3, 0], [2, 5], [riTop, 5]], segments: 64 } }] } },
  parts: [{ ...one("knob"), features: [{ kind: "boss", id: "boss.cone", axis: { origin: [0, 0, 0], dir: [0, 0, 1] }, d: 6, h: 5 }] }],
});
put("CHK-PRT-10", "pass", cone(1));
put("CHK-PRT-10", "fail", cone(1.6));

put("CHK-PRT-11", "pass", {
  note: "a 20 x 10 x 5 print pose of a 20 x 5 x 10 assembly twin: the same 1000 mm3",
  meshes: { print: { solids: [box(0, 0, 0, 20, 10, 5)] }, twin: { solids: [box(0, 0, 0, 20, 5, 10)] } },
  parts: [{ id: "latchpull", bodies: [{ id: "b", mesh: "@print" }], solid: "@print", frame: { pose: "print", assemblyTwin: "@twin" } }],
});
put("CHK-PRT-11", "fail", {
  note: "the print pose shrunk 0.05 all round against its twin (OGEE R16-P: four parts shrunk in one pose only)",
  meshes: { print: { solids: [box(0.05, 0.05, 0.05, 19.95, 9.95, 4.95)] }, twin: { solids: [box(0, 0, 0, 20, 5, 10)] } },
  parts: [{ id: "latchpull", bodies: [{ id: "b", mesh: "@print" }], solid: "@print", frame: { pose: "print", assemblyTwin: "@twin" } }],
});

const cover = (pct) => ({
  note: pct === 0 ? "a 40 x 40 x 4 flat cover whose overhang metric leaves the bed face out: 0 percent"
    : "the same cover reporting 41.67 percent overhang: its bed face counted (PAWL: a flat cover read 41.7 percent)",
  meshes: { b: { solids: [box(0, 0, 0, 40, 40, 4)] } },
  parts: [{ ...one("cover"), metrics: [{ id: "print.overhangPct", value: pct, unit: "percent", ...q, note: "overhang share of the surface", gate: "CHK-PRT-12" }] }],
});
put("CHK-PRT-12", "pass", cover(0));
put("CHK-PRT-12", "fail", cover(41.67));

// ---- FIT ----
const fitsPart = (drawn, shaft = 8) => ({
  id: "wall", bodies: [{ id: "b", mesh: "@b" }],
  metrics: [
    { id: "fits.model", value: "ogee16-fits-v1", ...q, note: "fit model the rows are banded by", gate: "informational", group: "fits" },
    { id: "fits.01.hole", value: shaft === null ? 8.75 : Number((shaft + drawn).toFixed(4)), unit: "mm", ...q, note: "crank shaft in its wall bore: hole", gate: "informational", group: "fits" },
    { id: "fits.01.shaft", value: shaft, unit: "mm", ...q, note: "crank shaft in its wall bore: shaft", gate: "informational", group: "fits" },
    { id: "fits.01.drawn", value: drawn, unit: "mm", ...q, note: "crank shaft in its wall bore", gate: "CHK-FIT-01", group: "fits" },
    { id: "fits.01.class", value: "SLIDE", ...q, note: "crank shaft in its wall bore: fit class", gate: "informational", group: "fits" },
  ],
});
const fitAsm = (note, p) => ({ note, meshes: { b: { solids: [box(0, 0, 0, 20, 20, 3)] } }, assembly: { id: "ogee", parts: [p] } });
put("CHK-FIT-01", "pass", fitAsm("the OGEE16 crank shaft row at FIT_SLIDE 0.75 drawn, SLIDE band 0.70 to 0.90", fitsPart(0.75)));
put("CHK-FIT-01", "fail", fitAsm("the same row at 0.55 drawn, the stale FIT_SLIDE fits.py kept (OGEE R16-P: seven of seventeen pairs out of band)", fitsPart(0.55)));
put("CHK-FIT-01", "missing", {
  ...fitAsm("FEELER's encoder fit read P.armW, an undefined param, so its shaft is NaN (serialized null): E_PARAM_MISSING, never a fail", fitsPart(0.75, null)),
  expect: { error: "E_PARAM_MISSING", path: "/metrics/fits.01.shaft" },
});

const snap = (i) => ({
  note: i === 0.7 ? "the OGEE barb: 0.7 a side means closing 1.4 to pass a 1.0 slit" : "a barb 0.45 a side closes 0.9 inside its 1.0 slit",
  meshes: { b: { solids: [box(0, 0, 0, 10, 4, 6)] } },
  parts: [{ ...one("pivot"), features: [{ kind: "snap", id: "snap.barb", catch: { interferencePerSide: i, leadInAngleDeg: 20 }, closure: { legWidth: 0.73, slotWidth: 1.0, mustCloseBy: 1.0 }, bend: "inPlane" }] }],
});
put("CHK-FIT-02", "pass", snap(0.45));
put("CHK-FIT-02", "fail", snap(0.7));

const tab = (cls) => ({
  note: cls === "SLIP" ? "a printed lug declared SLIP, the laser pair class (OGEE R16 sheets: a printed lug in a cut slot had 0.25 real)" : "the printed lug declared PSLIP",
  meshes: { b: { solids: [box(0, 0, 0, 8, 3, 3)] } },
  parts: [{ ...one("lug"), features: [{ kind: "tabSlot", id: "tabSlot.lug", role: "tab", w: 8, t: 3, process: "fdm", fit: fit(cls, 0.2), mate: "tabSlot.deck" }] }],
});
put("CHK-FIT-03", "pass", tab("PSLIP"));
put("CHK-FIT-03", "fail", tab("SLIP"));

put("CHK-FIT-04", "fail", {
  note: "fits.py lines 21 to 23 and 41 to 47 as shipped (originals/ogee16/files/src/source/fits.py): a checker that imports P and still copies FIT_SLIDE_",
  source: { path: "fits.py", text: [
    "import math, os, sys", "import kin", "from kin import P", "", "LOSS = 0.25",
    "# these mirror printed.scad. HARDCODING THEM MEANT THE TABLE REPORTED 0.55 AFTER",
    "FIT_SLIDE_ = 0.75",
    "PR = dict(PRINT_GAP=FIT_SLIDE_/2, PRINT_SHRINK=0.05, FIT_SLIDE=FIT_SLIDE_, FIT_LOCATE=0.30,",
    "          FIT_PRESS=0.10, SHAFT_D=8.0, SHAFT_FLAT=6.4, LTAB_W=8.0)", "",
  ].join("\n") },
});
put("CHK-FIT-04", "pass", {
  note: "the same checker reading every constant from P",
  source: { path: "fits.py", text: [
    "from kin import P", "", "FIT_SLIDE_ = P[\"FIT_SLIDE\"]",
    "PR = dict(PRINT_GAP=FIT_SLIDE_/2, PRINT_SHRINK=P[\"PRINT_SHRINK\"], FIT_LOCATE=P[\"FIT_LOCATE\"])", "",
  ].join("\n") },
});

const bearing = (depth) => ({
  note: depth === 3 ? "a 3 mm plate bearing on an 8 mm shaft, L/D 0.375 (OGEE R16-P: the shaft walked 29 mm)" : "the OGEE16 hub, 8 mm of land on 8 mm, L/D 1.0",
  meshes: { b: { solids: [box(0, 0, 0, 16, 16, depth)] } },
  parts: [{ ...one("hub"), features: [{ kind: "bore", id: "bore.shaft", axis: { origin: [8, 8, 0], dir: [0, 0, 1] }, d: 8, depth, fit: fit("SLIDE", 0.375) }] }],
});
put("CHK-FIT-05", "pass", bearing(8));
put("CHK-FIT-05", "fail", bearing(3));

// ---- ASM ----
const screw = (blocked) => ({
  note: blocked ? "a bar 5 mm over the screw head blocks the driver (DAVIT R4: horn screws behind a D2.8 waist)" : "an M3 head seat with 20 mm clear above it",
  meshes: { b: { solids: [box(0, 0, 0, 20, 20, 5), ...(blocked ? [box(8, -5, 10, 12, 25, 12)] : [])] } },
  parts: [{ ...one("wrist"), features: [{ kind: "screw", id: "screw.horn", thread: "M3", axis: { origin: [10, 10, 5], dir: [0, 0, -1] }, driverAxis: [0, 0, 1], reachLen: 20, engagementLen: 6 }] }],
});
put("CHK-ASM-01", "pass", screw(false));
put("CHK-ASM-01", "fail", screw(true));

const shell = (closed) => [
  box(0, 0, 0, 20, 20, 2), box(0, 0, 0, 2, 20, 20), box(18, 0, 0, 20, 20, 20), box(0, 0, 0, 20, 2, 20), box(0, 18, 0, 20, 20, 20),
  ...(closed ? [box(0, 0, 18, 20, 20, 20)] : []),
];
const I = [0, 0, 0, 1];
const order = (closed) => ({
  note: closed ? "a rod installed after the face that closes over it (OGEE R16-P: the fused rod and cap made the face unassemblable)" : "the rod drops into an open tray installed before it",
  meshes: { tray: { solids: shell(closed) }, rod: { solids: [box(8, 8, 4, 12, 12, 14)] } },
  assembly: {
    id: "face",
    parts: [{ id: "tray", bodies: [{ id: "b", mesh: "@tray" }] }, { id: "rod", bodies: [{ id: "b", mesh: "@rod" }] }],
    instances: [{ id: "tray1", part: "tray", pose: { frame: "assembly", pos: [0, 0, 0], rot: I } }, { id: "rod1", part: "rod", pose: { frame: "assembly", pos: [0, 0, 0], rot: I } }],
  },
});
put("CHK-ASM-02", "pass", order(false));
put("CHK-ASM-02", "fail", order(true));

const horn = (closed) => ({
  note: closed ? "a servo pocket closed on every face (PAWL mk2: a pocket sealed on four faces)" : "the servo pocket open at the top so the servo drops in (STANCHION)",
  meshes: { b: { solids: shell(closed) } },
  parts: [{ ...one("yaw"), features: [{ kind: "horn", id: "horn.yaw", servo: "sg90", keyed: true, recessDepth: 2 }] }],
});
put("CHK-ASM-03", "pass", horn(false));
put("CHK-ASM-03", "fail", horn(true));

const servoAsm = (mm) => ({
  note: mm < 0 ? "the SG90 flange 0.6 mm into the wall over the joint range (OGEE R16-P: servos invisible to a part-only audit)" : "the SG90 envelope 0.8 mm clear of the wall",
  meshes: { wall: { solids: [box(0, 0, 0, 40, 3, 30)] }, servo: { solids: [box(5, 3, 5, 28, 15, 27)] } },
  assembly: {
    id: "ogee", parts: [{ id: "wall", bodies: [{ id: "b", mesh: "@wall" }] }],
    instances: [{ id: "wall1", part: "wall", pose: { frame: "assembly", pos: [0, 0, 0], rot: I } }],
    bought: [{ id: "servo1", catalogId: "sg90", tier: "vendor", envelope: "@servo", pose: { frame: "assembly", pos: [0, 0, 0], rot: I } }],
  },
  sim: { closest: [{ a: "servo1", b: "wall1", mm, at: [10, 3, 10], state: "u 0.4" }] },
});
put("CHK-ASM-04", "pass", servoAsm(0.8));
put("CHK-ASM-04", "fail", servoAsm(-0.6));

const pinAsm = (extra) => ({
  meshes: { frame: { solids: [box(0, 0, 0, 30, 10, 3)] }, pin: { solids: [box(5, 3, 3, 8, 6, 9)] } },
  assembly: {
    id: "ogee",
    parts: [
      { id: "frame", bodies: [{ id: "b", mesh: "@frame" }], features: [{ kind: "pocket", id: "pocket.slot", body: "b", outline: sq(4, 2, 26, 7), face: UP(3), depth: 3, floor: "flat", fit: fit("SLIDE", 0.375) }] },
      { id: "crank", bodies: [{ id: "b", mesh: "@pin" }], features: [{ kind: "boss", id: "boss.pin", axis: { origin: [6.5, 4.5, 3], dir: [0, 0, 1] }, d: 3, h: 6 }] },
    ],
    instances: [{ id: "frame1", part: "frame", pose: { frame: "assembly", pos: [0, 0, 0], rot: I } }, { id: "crank1", part: "crank", pose: { frame: "assembly", pos: [0, 0, 0], rot: I } }],
    joints: [{ id: "j.slot", kind: "prismatic", a: "frame1", b: "crank1", axis: { origin: [0, 0, 0], dir: [1, 0, 0] }, range: { min: 0, max: 18 }, via: { featureA: "pocket.slot", featureB: "boss.pin" } }],
    ...extra,
  },
});
put("CHK-ASM-05", "pass", { ...pinAsm({}), note: "the crank pin swept along its slot over 25 poses, no share with any obstacle",
  sim: { sweep: [{ part: "crank1", joint: "j.slot", sweptHash: "0".repeat(64), poses: 25, clashes: [] }] } });
put("CHK-ASM-05", "fail", { ...pinAsm({}), note: "the pin head swept into its own servo: 682 mm3, the OGEE16 per-step sum per bar crank (D-233), standing for the swept share",
  sim: { sweep: [{ part: "crank1", joint: "j.slot", sweptHash: "0".repeat(64), poses: 25, clashes: [{ with: "servo1", mm3: 682, masked: false }] }] } });
const contact = { assertions: [{ type: "contact", a: "frame1", b: "crank1", over: "range" }] };
put("CHK-ASM-06", "pass", { ...pinAsm(contact), note: "the pin keeps 0.15 mm to its slot through travel, under the SLIDE real ceiling 0.2",
  sim: { closest: [{ a: "frame1", b: "crank1", mm: 0.15, at: [6.5, 4.5, 4], state: "u 0.5" }] } });
put("CHK-ASM-06", "fail", { ...pinAsm(contact), note: "the pin never reaches its yoke: 2.4 mm at its closest (OGEE R16-P: pin never engaged)",
  sim: { closest: [{ a: "frame1", b: "crank1", mm: 2.4, at: [6.5, 4.5, 4], state: "u 0" }] } });

const twoParts = (mm) => ({
  note: mm < 3 ? "a crank and a servo at 2.40 mm, which read as contact in a render (OGEE R16-P)" : "the crank 3.4 mm clear of the servo",
  meshes: { a: { solids: [box(0, 0, 0, 10, 10, 10)] }, c: { solids: [box(20, 0, 0, 30, 10, 10)] } },
  assembly: {
    id: "ogee", parts: [{ id: "crank", bodies: [{ id: "b", mesh: "@a" }] }, { id: "servo", bodies: [{ id: "b", mesh: "@c" }] }],
    instances: [{ id: "crank1", part: "crank", pose: { frame: "assembly", pos: [0, 0, 0], rot: I } }, { id: "servo1", part: "servo", pose: { frame: "assembly", pos: [0, 0, 0], rot: I } }],
  },
  sim: { closest: [{ a: "crank1", b: "servo1", mm, at: [15, 5, 5], state: "u 0.7" }] },
});
put("CHK-ASM-07", "pass", twoParts(3.4));
put("CHK-ASM-07", "fail", twoParts(2.4));

const link = (z) => ({
  note: z === 0 ? "a link whose pivot bore axis runs through the mesh origin (F1)" : "a link whose mesh origin sits 48 mm below its pivot bore (OGEE R14)",
  meshes: { b: { solids: [box(-5, -5, z - 1.5, 60, 5, z + 1.5)] } },
  parts: [{ ...one("link"), frame: { originOnAxis: true }, features: [{ kind: "bore", id: "bore.pivot", axis: { origin: [0, 0, z], dir: [0, 1, 0] }, d: 3, depth: "through", fit: fit("SLIDE", 0.375) }] }],
});
put("CHK-ASM-08", "pass", link(0));
put("CHK-ASM-08", "fail", link(48));

const sheetPivot = (stock) => ({
  note: stock ? "two cut sheets turning on a 3 mm bought rod" : "two cut sheets turning on a cut peg (OGEE R12: a square peg's contact radius ran 1.500 to 2.121)",
  meshes: { a: { solids: [box(0, 0, 0, 40, 10, 3)] }, c: { solids: [box(0, 0, 3, 40, 10, 6)] } },
  assembly: {
    id: "ogee",
    parts: [{ id: "deck", process: "laser", bodies: [{ id: "b", mesh: "@a", material: "acrylic3" }] }, { id: "arm", process: "laser", bodies: [{ id: "b", mesh: "@c", material: "acrylic3" }] }],
    instances: [{ id: "deck1", part: "deck", pose: { frame: "assembly", pos: [0, 0, 0], rot: I } }, { id: "arm1", part: "arm", pose: { frame: "assembly", pos: [0, 0, 0], rot: I } }],
    joints: [{ id: "j.pivot", kind: "revolute", a: "deck1", b: "arm1", ...(stock ? { stock: { kind: "rod", d: 3, catalogId: "rod-3mm" } } : {}) }],
  },
});
put("CHK-ASM-09", "pass", sheetPivot(true));
put("CHK-ASM-09", "fail", sheetPivot(false));

// ---- SHT ----
put("CHK-SHT-04", "pass", { note: "kerf read from the machine profile row", source: { path: "deck.ts", text: "const kerf = profile.machine(\"laser1220\").kerf;\nexport const slot = 3 + 2 * kerf;\n" } });
put("CHK-SHT-04", "fail", { note: "kerf typed beside the parts, a second copy of the coupon row", source: { path: "deck.ts", text: "const KERF = 0.15;\nexport const slot = 3 + 2 * KERF;\n" } });
// kerfLiterals cases (2.0.1). They live here, under the audit's fixture skip,
// since the same lines in a test source would fail CHK-SHT-04 on that test.
put("CHK-SHT-04", "literals", {
  note: "a number scaling a named quantity derives the kerf; a bare number is a copy (2.0.1)",
  cases: [
    { text: "const kerf = 2 * f.burn;\n", literals: [] },
    { text: "const kerf = 2*burn;\n", literals: [] },
    { text: "const kerf = 0.2;\n", literals: ["kerf = 0.2"] },
    { text: "const kerf = 0.2 + burn;\n", literals: ["kerf = 0.2"] },
    { text: "{ kerf_mm: 0.15, k: 2 }\n", literals: ["kerf_mm: 0.15"] },
  ],
});

const strip = (len) => ({
  note: len === 172 ? "a 3 mm petg strip cantilevered 172 mm sags 0.96 against the 0.775 one-bar margin (OGEE R13: a single strip drooped 0.95)"
    : "the strip at 150 mm sags 0.55, under the 0.775 margin",
  meshes: { b: { solids: [box(0, 0, 0, len, 10, 3)] } },
  parts: [{ ...one("rowbar"), thickness: 3, plane: "XY", metrics: [{ id: "latch.margin", value: 0.775, unit: "mm", ...q, note: "one-bar half-select margin", gate: "CHK-SHT-05" }] }],
});
put("CHK-SHT-05", "pass", strip(150));
put("CHK-SHT-05", "fail", strip(172));

const hinge = (deg) => ({
  note: deg > 13 ? "living hinge rows at 15 deg each, over the TUMBLER 13 deg rule" : "rows at 12 deg each",
  meshes: { b: { solids: [box(0, 0, 0, 60, 30, 3)] } },
  parts: [{ ...one("tumbler"), features: [{ kind: "flexCut", id: "flexCut.spine", rows: 7, degPerRow: deg, slotLen: 20, landLen: 3, pitch: 1.5 }] }],
});
put("CHK-SHT-06", "pass", hinge(12));
put("CHK-SHT-06", "fail", hinge(15));

// TUMBLER FINGER JOINT EDGE A at its defaults (L 80, 4 fingers, t 3, kerf 0.22, fit 0):
// the edge from fingerEdgePts as the original writes it (tumbler.html lines 322 to 331),
// closed back to y 40. The fail fixture draws the same edge with no kerf while the
// feature still declares burn 0.11, the joint a generator that forgot the kerf cuts.
const fingerEdge = (L, n, depth, kerf) => {
  const seg = L / (2 * n + 1);
  const pts = [[0, 0]];
  let x = 0;
  for (let i = 0; i < 2 * n + 1; i++) {
    const w = seg + (i % 2 === 1 ? kerf : -kerf);
    if (i % 2 === 1) { pts.push([x, depth], [x + w, depth], [x + w, 0]); x += w; } else { x += w; pts.push([x, 0]); }
  }
  return [...pts, [L, 40], [0, 40]];
};
const finger = (kerf) => ({
  note: kerf > 0 ? "TUMBLER EDGE A at kerf 0.22: fingers 8.67 and recesses 9.11 mm on an 8.89 mm pitch" : "the same edge cut with no kerf while the feature declares burn 0.11: every segment 0.22 mm off",
  meshes: { b: { solids: [box(0, 0, 0, 80, 40, 3)] } },
  parts: [{ ...one("finger"), features: [{ kind: "finger", id: "finger.a", body: "b", count: 4, width: 80 / 9, processA: "laser", processB: "laser", burn: 0.11, edge: { from: [0, 0], to: [80, 0] } }] }],
  shapes: { "finger/b": { route: "prism", outline: [fingerEdge(80, 4, 3, kerf)], z: [0, 3] } },
});
put("CHK-SHT-11", "pass", finger(0.22));
put("CHK-SHT-11", "fail", finger(0));

// ---- NET ----
const halves = (gap) => [
  { kind: "conductor", id: "conductor.key", body: "pad", material: "cpla", net: "K1", region: { path: sq(gap / 2, -1.5, 1.6, 1.5), face: UP(1) }, width: 1.2, t: 2 },
  { kind: "conductor", id: "conductor.gnd", body: "pad", material: "cpla", net: "GND", region: { path: sq(-1.6, -1.5, -gap / 2, 1.5), face: UP(1) }, width: 1.2, t: 2 },
];
const padPart = (features) => ({ id: "keys", bodies: [{ id: "pad", mesh: "@b", outline: [sq(-10, -10, 10, 10)] }], features });
const padMesh = { b: { solids: [box(-10, -10, 0, 10, 10, 4)] } };
put("CHK-NET-03", "pass", { note: "a flex key contact backed by its 1.8 mm travel on a 4.0 mm cone (PIP defaults)", meshes: padMesh,
  parts: [padPart([...halves(0.8), { kind: "contact", id: "contact.key1", a: "conductor.key", b: "conductor.gnd", forceMinN: 0.5, maxOhm: 2e6, gap: 1.8, coneH: 4 }])] });
put("CHK-NET-03", "fail", { note: "a wiper contact declared with no fit and no travel (STYLUS: the wiper arms sat beside the tracks)", meshes: padMesh,
  parts: [padPart([...halves(0.8), { kind: "contact", id: "contact.wiper", a: "conductor.key", b: "conductor.gnd", forceMinN: 0.3, maxOhm: 1e5 }])] });
put("CHK-NET-04", "pass", { note: "a collector inside its 20 mm host body", meshes: padMesh,
  parts: [padPart([{ kind: "conductor", id: "conductor.collector", body: "pad", material: "cpla", net: "OUT", region: { path: sq(-3, -3, 3, 3), face: UP(1) }, width: 6, t: 1 }])] });
put("CHK-NET-04", "fail", { note: "a collector post overlapping the host frame by 1 mm (STYLUS)", meshes: padMesh,
  parts: [padPart([{ kind: "conductor", id: "conductor.collector", body: "pad", material: "cpla", net: "OUT", region: { path: sq(7, -3, 11, 3), face: UP(1) }, width: 4, t: 1 }])] });

// ---- 3MF ----
const coin = (artR) => ({
  note: artR < 5 ? "a 4.98 mm art disc in a 5 mm structure hole, 0.02 clear" : "the art disc pushed out to 5.05 mm, into the wall (COLLAR: a homothety pushed spirals into the wall)",
  meshes: { s: { solids: [{ prism: { outline: sq(-10, -10, 10, 10), holes: [circle(0, 0, 5)], z: [0, 3] } }] }, a: { solids: [{ prism: { outline: circle(0, 0, artR), z: [2, 3] } }] } },
  parts: [{ id: "coin", bodies: [
    { id: "base", mesh: "@s", outline: [sq(-10, -10, 10, 10), [...circle(0, 0, 5)].reverse()] },
    { id: "spiral", mesh: "@a", role: "art", slot: 2, outline: [circle(0, 0, artR)] },
  ] }],
});
put("CHK-3MF-04", "pass", coin(4.98));
put("CHK-3MF-04", "fail", coin(5.05));

const bands3 = (holedFirst) => ({
  note: holedFirst ? "a full band over a holed band, running down into it (the band order reversed)" : "a holed band running down 0.015 into the full band under it",
  meshes: { b: { solids: [box(0, 0, 0, 10, 10, 4)] } }, parts: [one("sheath")],
  shapes: { "sheath/b": { route: "stack", bands: holedFirst
    ? [{ outline: [sq(0, 0, 10, 10), sq(4, 4, 6, 6).reverse()], z: [0, 2] }, band([1.985, 4])]
    : [band([0, 2]), { outline: [sq(0, 0, 10, 10), sq(4, 4, 6, 6).reverse()], z: [1.985, 4] }] } },
});
put("CHK-3MF-05", "pass", bands3(false));
put("CHK-3MF-05", "fail", bands3(true));

// ---- INL ----
const THK = 3.6;
const grid = { w: 176, h: 176, res: 4 };
const boxPath = (x0, y0, x1, y1) => `M ${x0} ${y0} H ${x1} V ${y1} H ${x0} Z`;
const layer = (d, slot) => ({ kind: "path", d, transform: [1, 0, 0, 1, 0, 0], slot });
const SQUARE = layer(boxPath(-3, -3, 3, 3), 2);
const SPECK = layer(boxPath(5, 5, 5.25, 5.25), 3);
const ELL = layer("M 4 -8 H 6 V -2 H 10 V 0 H 4 Z", 3);
const inlay = (o = {}) => {
  const base = {
    kind: "inlay", id: `inlay.s${o.slot ?? 2}`, body: "coin", art: "", face: { origin: [0, 0, THK], normal: [0, 0, 1], u: [1, 0, 0] }, slot: o.slot ?? 2,
    depthLayers: o.depthLayers ?? 5, minFeature: 0.6, despeckle: o.despeckle ?? 0.35, grid, layers: o.layers ?? { top: [SQUARE], bed: [] },
    recipe: o.recipe ?? "print-forge", boost: 0, gap: 0, palette: ["#1A1A1A", "#FE0386", "#F5F0E6"], material: "petg",
  };
  return { ...base, art: INLAY.artUri(INLAY.artOf(base)) };
};
const coinPart = (...features) => ({ note: "", meshes: { b: { solids: [box(-22, -22, 0, 22, 22, THK)] } }, parts: [{ id: "coin", bodies: [{ id: "coin", mesh: "@b" }], features }] });
put("CHK-INL-01", "pass", { ...coinPart(inlay()), note: "a 6 mm square, print-forge opens at the min feature: nothing left under the line" });
put("CHK-INL-01", "fail", { ...coinPart(inlay({ recipe: "collar-v5" })), note: "collar-v5 has no open: the square's four corner cells are strokes under the line, 0.25 mm2" });
put("CHK-INL-02", "pass", { ...coinPart(inlay({ recipe: "collar-v5", layers: { top: [SQUARE, SPECK], bed: [] } })), note: "despeckle at 0.35 removes the one-cell speck" });
put("CHK-INL-02", "fail", { ...coinPart(inlay({ recipe: "collar-v5", despeckle: 0, layers: { top: [SQUARE, SPECK], bed: [] } })), note: "despeckle off keeps a 0.0625 mm2 speck under 0.09896 (COLLAR v3)" });
put("CHK-INL-03", "pass", { ...coinPart(inlay()), note: "light over dark at 5 layers, 1.2 mm (python hackbuild coin v1: 1.2 fixed it)" });
put("CHK-INL-03", "fail", { ...coinPart(inlay({ depthLayers: 3 })), note: "light over dark at 3 layers, 0.72 mm (the coin's 0.8 tinted pink)" });
put("CHK-INL-04", "pass", { ...coinPart(inlay({ layers: { top: [SQUARE], bed: [ELL] } })), note: "an L on the bed face, emitted mirrored in X" });

// ---- LNT ----
put("CHK-LNT-01", "pass", { note: "a range written with to", source: { path: "notes.md", text: "travel 1.2 to 1.6 mm, set by the cone.\n" } });
put("CHK-LNT-01", "fail", { note: "a range written with an en dash", source: { path: "notes.md", text: "travel 1.2{U+2013}1.6 mm, set by the cone.\n" } });
put("CHK-LNT-02", "pass", { note: "an icon named in words", source: { path: "panel.md", text: "press the check icon.\n" } });
put("CHK-LNT-02", "fail", { note: "a four-point sparkle in a heading (hackbuild design system: rejected by name)", source: { path: "panel.md", text: "# new {U+2728} keys\n" } });
put("CHK-LNT-03", "pass", { note: "one bill total, stated twice alike", source: { path: "build-it.html", text: "The scene places 124 pieces.\nThe plate pages print 124 pieces.\n" } });
put("CHK-LNT-03", "fail", {
  note: "OGEE build-it 2026-08-18: PARTS_TBL gives 99 pieces, the scene places 124, a check row says 115 (ogee_buildit_run.json)",
  source: { path: "build-it.html", text: "PARTS_TBL lists 99 pieces.\nThe scene places 124 pieces and the blurb says 124 pieces.\nThe check row counts 115 pieces.\n" },
});
put("CHK-LNT-04", "pass", { note: "one assignment per line", source: { path: "params.scad", text: "ROW_Y = -1.5;\nDRIVE_Y = 3.2;\n" } });
put("CHK-LNT-04", "fail", { note: "DRIVE_Y hidden in a comment after another assignment (OGEE R15: four parts parked at -1.5)", source: { path: "params.scad", text: "ROW_Y = -1.5; // DRIVE_Y = 3.2;\n" } });

// ---- SHP ----
const twoBodies = { b: { solids: [box(0, 0, 0, 20, 20, 5)] }, c: { solids: [box(25, 0, 0, 45, 20, 5)] } };
const chamferPart = (body) => ({ id: "chassis", bodies: [{ id: "floor", mesh: "@b" }, { id: "wall", mesh: "@c" }],
  features: [{ kind: "chamfer", id: "chamfer.top", ...(body === undefined ? {} : { body }), edges: { where: "top" }, size: 1, angleDeg: 45 }] });
put("CHK-SHP-01", "pass", { note: "a chamfer naming the sub-solid it cuts before the union", meshes: twoBodies, parts: [chamferPart("floor")] });
put("CHK-SHP-01", "fail", { note: "a chamfer on a two-body part naming no body: the whole-part half-space DETENT rev D let take a wall", meshes: twoBodies, parts: [chamferPart(undefined)] });
const knurl = (depth) => ({
  note: depth < 0.42 ? "64 reeds 0.3 mm deep, under one 0.42 line (KNURL: 0.5 deep printed practically round)" : "40 reeds 1.0 mm deep (KNURL: read)",
  meshes: { b: { solids: [{ revolve: { profile: [[5, 0], [15, 0], [15, 10], [5, 10]], segments: 64 } }] } },
  parts: [{ ...one("knob"), features: [{ kind: "edgeProfile", id: "edgeProfile.reeds", style: "reeded", params: { count: depth < 0.42 ? 64 : 40, depth }, zDependent: false }] }],
});
put("CHK-SHP-02", "pass", knurl(1));
put("CHK-SHP-02", "fail", knurl(0.3));
const windowPart = (roof, extra) => ({ ...one("davit"), features: [{ kind: "window", id: "window.web", outline: sq(0, 0, 12, 6), face: { origin: [0, 0, 0], normal: [0, 1, 0], u: [1, 0, 0] }, roof, ...extra }] });
const wmesh = { b: { solids: [box(-5, 0, -5, 20, 3, 15)] } };
put("CHK-SHP-03", "pass", { note: "a gabled roof at 45 deg (DAVIT R4)", meshes: wmesh, parts: [windowPart("gabled", { roofAngleDeg: 45 })] });
put("CHK-SHP-03", "fail", { note: "a gabled roof at 30 deg, under the 45 deg that carries itself (DAVIT R4, DETENT rev D)", meshes: wmesh, parts: [windowPart("gabled", { roofAngleDeg: 30 })] });
const webPart = (y) => ({ id: "deck", bodies: [{ id: "b", mesh: "@b", outline: [sq(0, 0, 20, 10), sq(0, 15, 20, 25)] }],
  features: [{ kind: "web", id: "web.weld", body: "b", from: [10, 9], to: [10, y], thickness: 2, clipToProfile: true }] });
const webMesh = { b: { solids: [box(0, 0, 0, 20, 10, 3), box(0, 15, 0, 20, 25, 3)] } };
put("CHK-SHP-04", "pass", { note: "a weld from the deck 1 mm into its neighbour at y 15 to 25", meshes: webMesh, parts: [webPart(16)] });
put("CHK-SHP-04", "fail", { note: "a weld ending on the neighbour's edge, a tangency (OGEE R16-M: six bodies after the print shrink)", meshes: webMesh, parts: [webPart(15)] });
const imported = (tier) => ({ note: tier === "inferred" ? "an imported STL with inferred provenance" : "an imported STL from a vendor model", meshes: { b: { solids: [box(0, 0, 0, 10, 10, 10)] } },
  parts: [{ ...one("bracket"), source: { kind: "imported", format: "stl", tier, uri: "hbf://import/bracket" } }] });
put("CHK-SHP-05", "pass", imported("vendor"));
put("CHK-SHP-05", "fail", imported("inferred"));

// ---- KEY ----
const flexKey = (gap) => ({
  note: gap === 1.8 ? "PIP defaults: travel 1.8 on a 4.0 cone, 45 percent" : "the BOSS button: travel 2.15 on a 3.2 cone, 67 percent (CHECKS.md 2.6 A)",
  meshes: padMesh,
  parts: [padPart([...halves(0.8), { kind: "contact", id: "contact.key1", a: "conductor.key", b: "conductor.gnd", forceMinN: 0.5, maxOhm: 2e6, gap, coneH: gap === 1.8 ? 4 : 3.2 }])],
});
put("CHK-KEY-01", "pass", flexKey(1.8));
put("CHK-KEY-01", "fail", flexKey(2.15));
// The cap is its own conductive TPU body over the PETG hole, as PIP prints it
// (pip.md 5.1 step 6); a cPLA cover is the BLOCKS stud flange over its socket.
const capPocket = (r, cover = { role: "flex-conductor", material: "ctpu" }) => ({
  note: cover.material !== "ctpu" ? "a 5.2 mm hole under a cPLA flange: no flex cap, CHK-PRT-09 holds the bridge"
    : r === 1.8 ? "a 3.6 mm hole under the cap, the PIP default" : "a 5.2 mm hole under the cap, over the 4.5 bridge",
  meshes: { b: { solids: [{ prism: { outline: sq(-6, -6, 6, 6), holes: [circle(0, 0, r)], z: [0, 4] } }] }, cap: { solids: [box(-6, -6, 4, 6, 6, 4.72)] } },
  parts: [{
    id: "keys", bodies: [{ id: "b", mesh: "@b" }, { id: "cap", mesh: "@cap", slot: 2, ...cover }],
    features: [{ kind: "pocket", id: "pocket.hole", body: "b", outline: circle(0, 0, r), face: UP(4), depth: 4, floor: "flat", fit: fit("LOCATE") }],
  }],
});
put("CHK-KEY-02", "pass", capPocket(1.8));
put("CHK-KEY-02", "fail", capPocket(2.6));
put("CHK-KEY-02", "cpla-cover", capPocket(2.6, { role: "conductor", material: "cpla" }));
const split = (gap) => ({
  note: gap >= 0.6 ? "contact halves split 0.8 (PIP colGap)" : "halves split 0.4: a string across it reads as a press (PIP)",
  meshes: padMesh,
  parts: [padPart([...halves(gap), { kind: "contact", id: "contact.key1", a: "conductor.key", b: "conductor.gnd", forceMinN: 0.5, maxOhm: 2e6, gap: 1.8, coneH: 4 }])],
});
put("CHK-KEY-03", "pass", split(0.8));
put("CHK-KEY-03", "fail", split(0.4));
const spring = (Q) => ({
  note: Q === 2 ? "PIP defaults: l 24, t 0.55, w 1.6, sw 3, petg in plane, Q 2.0 inside 1.72 to 2.19" : "Q 2.4, past the 2.19 strain ceiling (CHECKS.md 2.6 B)",
  meshes: { b: { solids: [box(-12, -2, 0, 12, 2, 1.6)] } },
  parts: [{ ...one("clicky"), features: [{ kind: "spring", id: "spring.click1", l: 24, t: 0.55, w: 1.6, riseQ: Q, ends: "clamped", bend: "inPlane", sw: 3 }] }],
});
put("CHK-KEY-04", "pass", spring(2));
put("CHK-KEY-04", "fail", spring(2.4));
const tipPad = (dx) => ({
  note: dx === 0 ? "the tip lands 1.2 mm across the pad" : "the tip lands 0.3 mm across the pad, short of 0.5 (PIP fit row)",
  meshes: { b: { solids: [box(-6, -6, 0, 6, 6, 3)] } },
  parts: [{ id: "clicky", bodies: [{ id: "b", mesh: "@b", outline: [sq(-6, -6, 6, 6)] }], features: [
    { kind: "spring", id: "spring.click1", l: 24, t: 0.55, w: 1.6, riseQ: 2, ends: "clamped", bend: "inPlane" },
    { kind: "conductor", id: "conductor.tip", body: "b", material: "ctpu", net: "K1", region: { path: sq(-1.6 + dx, -1, 1.6 + dx, 1), face: { origin: [0, 0, 2], normal: [0, 0, -1], u: [1, 0, 0] } }, width: 2, t: 0.5 },
    { kind: "conductor", id: "conductor.pad", body: "b", material: "cpla", net: "K1", region: { path: sq(0.4, -1, 2.3, 1), face: UP(0.5) }, width: 1.9, t: 0.5 },
    { kind: "contact", id: "contact.click1", a: "conductor.tip", b: "conductor.pad", forceMinN: 0.5, maxOhm: 2e6 },
  ] }],
});
put("CHK-KEY-05", "pass", tipPad(0));
put("CHK-KEY-05", "fail", tipPad(-0.9));
// PIP holds flex and click keys in one part (D-624): the flex contact joins a
// column and its common side by side, no overlap in plan, and declares coneH.
const flexBeside = (() => {
  const fx = tipPad(-0.9);
  fx.note = "a flex contact (coneH 1.2) beside a click contact whose tip lands 0.3 mm across its pad, in one part with a click spring (PIP)";
  fx.parts[0].features.push(
    { kind: "conductor", id: "conductor.col", body: "b", material: "ctpu", net: "K2", region: { path: sq(-5, 2, -3, 4), face: UP(1) }, width: 2, t: 0.5 },
    { kind: "conductor", id: "conductor.colCommon", body: "b", material: "ctpu", net: "K2", region: { path: sq(-2.4, 2, -0.4, 4), face: UP(1) }, width: 2, t: 0.5 },
    { kind: "contact", id: "contact.flex1", a: "conductor.col", b: "conductor.colCommon", forceMinN: 0.5, maxOhm: 2e6, gap: 0.6, coneH: 1.2, actuator: "b", axis: [0, 0, -1] },
  );
  return fx;
})();
put("CHK-KEY-05", "flex-beside-click", flexBeside);
put("CHK-KEY-06", "pass", { note: "a closed block, no vertex on another face", meshes: { b: { solids: [box(0, 0, 0, 10, 10, 10)] } }, parts: [one("keys")] });
put("CHK-KEY-06", "fail", {
  note: "a block with a second block resting on its top: the upper block's corners sit on the lower top face (PIP: a cone kink on a cavity face)",
  meshes: { b: { solids: [box(0, 0, 0, 10, 10, 10), box(3, 3, 10, 7, 7, 14)] } }, parts: [one("keys")],
});

// ---- M04-T12 entries ----
put("CHK-PRT-13", "pass", { ...borePart(true), note: "a d 4 bore along x through a 12 mm block, teardrop peak up: every roof face at 45 deg or steeper" });
put("CHK-PRT-13", "fail", { ...borePart(false), note: "the same bore with its teardrop peak at -Z, a round roof over the hole (DETENT rev C: the inverted laser teardrop verify_revC.py printed as information)" });

const sealedCoin = (z, note) => ({
  note, meshes: { b: { solids: [box(-22, -22, 0, 22, 22, 4)] } },
  parts: [{ id: "coin", bodies: [{ id: "b", mesh: "@b", outline: [sq(-22, -22, 22, 22)] }], features: [{
    kind: "pocket", id: "pocket.nfc", body: "b", outline: sq(-13, -13, 13, 13), face: UP(z), depth: 0.6, floor: "flat", fit: fit("LOCATE"), sealed: { pauseBefore: { z } },
  }] }],
});
put("CHK-PRT-15", "pass", sealedCoin(2.17, "an NFC pocket paused at 2.17 mm, the top of layer 8 on ffc5p_20260819: first layer 0.25 plus 8 layers of 0.24"));
put("CHK-PRT-15", "fail", sealedCoin(2.28, "COLLAR NFC card (1) case b: ceiling and pause at 2.28 mm on a 0.24 grid from the bed; on ffc5p_20260819 the tops around it are 2.17 and 2.41"));

put("CHK-PRT-16", "pass", { note: "a 200 x 20 x 10 rail inside the 256 mm ffc5p build volume", meshes: { b: { solids: [box(0, 0, 0, 200, 20, 10)] } }, parts: [one("rail")] });
put("CHK-PRT-16", "fail", { note: "a 300 x 20 x 10 rail, 44 mm past the 256 mm ffc5p bed on x (COTTER platePlan lists such a print apart)", meshes: { b: { solids: [box(0, 0, 0, 300, 20, 10)] } }, parts: [one("rail")] });

// The search results are the port's own (packages/sim/records/cotter-insert.json, computed): verify-1 and sharp.
const hookAsm = (row) => ({
  note: row.verdict === "INSERTS"
    ? "COTTER verify-1, hook for a 6.35 hole in a 6.35 board: the search clears after 106 poses at tilt 57 deg"
    : "COTTER sharp-bend case, rod 5.40 and bend 6.0 in the same board: trapped after 381 poses, max tilt 12 deg",
  meshes: { b: { solids: [box(0, 0, 0, 10, 10, 6.35)] } },
  assembly: {
    id: "cotter", parts: [one("hook"), one("board")],
    instances: [
      { id: "hook1", part: "hook", pose: { frame: "assembly", pos: [0, 0, 0], rot: I } },
      { id: "board1", part: "board", pose: { frame: "assembly", pos: [20, 0, 0], rot: I } },
    ],
    assertions: [{ type: "insertable", part: "hook1", into: "board1" }],
  },
  sim: { insert: [{ part: "hook1", into: "board1", ...row }] },
});
put("CHK-ASM-10", "pass", hookAsm({ verdict: "INSERTS", stop: "clear", poses: 106, maxTiltDeg: 57, clearing: { state: [57, 88, 46], tiltDeg: 57, xMm: 17.6, yMm: 9.2 } }));
put("CHK-ASM-10", "fail", hookAsm({ verdict: "TRAPPED", stop: "exhausted", poses: 381, maxTiltDeg: 12, clearing: null }));

// OGEE R16-P printed audit (M04-T11): audit_print.py's tolerance, touch
// ceiling and box margin, and the step 5 negative, row bar 0 driven 3 mm
// past its stroke into the column bars, 144.00 mm3 per pair (computed),
// drawn here as one 12 x 12 mm bar section overlapping its neighbour by 1 mm.
const AUDIT_PRINT = { tolMm3: 0.5, touchCeilingMm3: 120, boxMarginMm: 1e-6, origin: "fab-knowledge:originals/ogee16/files/src/source/audit_print.py audit()" };
const barAsm = (dz) => ({
  note: dz < 3
    ? "OGEE R16-P row bar 0 driven 3 mm past its stroke: 144 mm3 into column bar 0, not a touch pair (audit_print.py)"
    : "OGEE R16-P row bar 0 at rest, 1 mm under column bar 0 (audit_print.py rest pose)",
  meshes: { bar: { solids: [box(0, 0, 0, 12, 12, 3)] } },
  assembly: {
    id: "ogee16-printed-fixture", parts: [one("rowbar", "bar"), one("colbar", "bar")],
    instances: [
      { id: "rowbar0", part: "rowbar", pose: { frame: "assembly", pos: [0, 0, 0], rot: I } },
      { id: "colbar0", part: "colbar", pose: { frame: "assembly", pos: [0, 0, dz], rot: I } },
    ],
    assertions: [],
  },
  interference: AUDIT_PRINT,
});
put("CHK-ASM-11", "pass", barAsm(4));
put("CHK-ASM-11", "fail", barAsm(2));

// ---- MOT ----
const motAsm = (clashes) => ({ ...pinAsm({}), note: clashes.length === 0 ? "every joint swept over its range, no clash" : "the left arm's mirrored hub contact the right-arm-only mask missed (DAVIT)",
  sim: { sweep: [{ part: "crank1", joint: "j.slot", sweptHash: "0".repeat(64), poses: 25, clashes }] } });
put("CHK-MOT-02", "pass", motAsm([]));
put("CHK-MOT-02", "fail", motAsm([{ with: "hubL", mm3: 14.2, masked: false }]));

// ---- M05-T19: the button path checks (CHK-NET-13, -26, -27, -29, -30, CHK-FIT-07) ----
// A flex key reduced to boxes: a PETG pad, the split cPLA column under a
// cTPU cap (halves 0.8 mm apart, colGap of PIP's flex key), a K1 lead from
// under its half, a GND stub to the bus. Column tops at 3.0 mm; the cap
// underside sits `rise` above them; the contact declares travel `gap`.
const TRACE = { w: 1.4, t: 0.72, z0: 0.73 };
const cond = (id, net, region, t = TRACE.t) => ({ kind: "conductor", id, body: "pad", material: "cpla", net, region, width: TRACE.w, t });
const line = (pts) => ({ centreline: pts, face: UP(TRACE.z0) });
// A net as a target: the checks here read its id and terminals, and the built bodies or the declared conductors behind it.
const bareNet = (id, terminals) => ({
  id, conductors: [], bodies: [], terminals, resistance: [], bulkOhm: 0, contacts: [], totalOhm: [0, 0],
  unpricedContacts: [], capToGndPf: 0, couplingPf: {}, capMethod: "pip-per-mm", tier: "inferred", qualifier: "unknown",
});
const pressKey = (rise, gap, busY) => {
  const top = 3.0;
  const cap = top + rise;
  const busLo = busY - TRACE.w / 2, busHi = busY + TRACE.w / 2;
  const stubTo = busY;
  const zt = TRACE.z0 + TRACE.t;
  return {
    meshes: {
      pad: { solids: [box(-20, -15, 0, 20, 15, TRACE.z0)] },
      k1col: { solids: [box(0.4, -1.5, TRACE.z0, 1.6, 1.5, top)] },
      g1col: { solids: [box(-1.6, -1.5, TRACE.z0, -0.4, 1.5, top)] },
      k1: { solids: [box(0.4, -15, TRACE.z0, 1.8, 0, zt)] },
      g1stub: { solids: [box(-1.8, Math.min(0, stubTo), TRACE.z0, -0.4, Math.max(0, stubTo), zt)] },
      gbus: { solids: [box(-1.8, busLo, TRACE.z0, 20, busHi, zt)] },
      cap1: { solids: [box(-2.5, -2.5, cap, 2.5, 2.5, cap + 0.72)] },
    },
    parts: [{
      id: "pad",
      bodies: [
        { id: "pad", mesh: "@pad" },
        { id: "conductor.key1col", mesh: "@k1col", material: "cpla", slot: 2, role: "conductor" },
        { id: "conductor.gnd1col", mesh: "@g1col", material: "cpla", slot: 2, role: "conductor" },
        { id: "conductor.key1", mesh: "@k1", material: "cpla", slot: 2, role: "conductor" },
        { id: "conductor.gnd1stub", mesh: "@g1stub", material: "cpla", slot: 2, role: "conductor" },
        { id: "conductor.gnd", mesh: "@gbus", material: "cpla", slot: 2, role: "conductor" },
        { id: "cap1", mesh: "@cap1", material: "ctpu", slot: 4, role: "flex-conductor" },
      ],
      features: [
        cond("conductor.key1col", "K1", { path: sq(0.4, -1.5, 1.6, 1.5), face: UP(TRACE.z0) }, top - TRACE.z0),
        cond("conductor.gnd1col", "GND", { path: sq(-1.6, -1.5, -0.4, 1.5), face: UP(TRACE.z0) }, top - TRACE.z0),
        cond("conductor.key1", "K1", line([[1.1, 0], [1.1, -15]])),
        cond("conductor.gnd1stub", "GND", line([[-1.1, 0], [-1.1, stubTo]])),
        cond("conductor.gnd", "GND", line([[-1.1, busY], [20, busY]])),
        { kind: "contact", id: "contact.key1", a: "conductor.key1col", b: "conductor.gnd1col", forceMinN: 0.5, maxOhm: 2e6, gap, coneH: 4.08, actuator: "cap1", axis: [0, 0, -1] },
        { kind: "port", id: "port.key1", body: "pad", net: "K1", type: "signal", interface: "digital" },
        { kind: "port", id: "port.gnd", body: "pad", net: "GND", type: "gnd", interface: "digital" },
      ],
      assertions: [{ type: "apartExcept", nets: ["K1", "GND"], cut: "cap1" }],
    }],
    nets: [bareNet("K1", ["port.key1"]), bareNet("GND", ["port.gnd"])],
  };
};
put("CHK-NET-13", "pass", {
  note: "flex-pair traces on one face: bus, K1 lead and GND stub on the trace face at z 0.73 (computed 0.00 deg)",
  meshes: { pad: { solids: [box(-20, -15, 0, 20, 15, 2)] } },
  parts: [{ id: "pad", bodies: [{ id: "pad", mesh: "@pad" }], features: [
    cond("conductor.gnd", "GND", line([[0, 3], [30, 3]])), cond("conductor.key1", "K1", line([[1.1, 0], [1.1, -15]])), cond("conductor.gnd1stub", "GND", line([[-1.1, 0], [-1.1, 3]])),
  ] }],
});
put("CHK-NET-13", "fail", {
  note: "a conductor ramp rising 10 mm over a 5 mm run, laid on a unit face frame whose u axis climbs (computed 63.43 deg; D-255 refuses a non-unit frame)",
  meshes: { pad: { solids: [box(0, -5, 0, 5, 5, 10)] } },
  parts: [{ id: "ramp", bodies: [{ id: "pad", mesh: "@pad" }], features: [
    cond("conductor.ramp", "K1", { centreline: [[0, 0], [Math.hypot(5, 10), 0]], face: { origin: [0, 0, 0], normal: [-2 / Math.sqrt(5), 0, 1 / Math.sqrt(5)], u: [1 / Math.sqrt(5), 0, 2 / Math.sqrt(5)] } }),
  ] }],
});
put("CHK-NET-26", "pass", { note: "flex key, cap1 the cut: pressed it joins K1 to GND, removed they fall apart; bus at y 3", ...pressKey(1.44, 1.44, 3) });
put("CHK-NET-26", "fail", { note: "flex key variant whose GND bus runs under key 1's lead at y -5: K1 and GND join without the cap", ...pressKey(1.44, 1.44, -5) });
put("CHK-NET-27", "pass", { note: "flex key at gap 1.44: the cap pressed 1.44 mm lands on both column halves", ...pressKey(1.44, 1.44, 3) });
put("CHK-NET-27", "fail", { note: "a contact whose gap 1.44 is 0.48 mm short of the built cap-to-column distance 1.92", ...pressKey(1.92, 1.44, 3) });

// CHK-NET-29 on PIP's drive readouts (reference/electrical/pip-drive, M05-T11), rounded as the card states them:
// the A key path 1687980 ohm over 60 mm of trace (C 7 + 60 x 0.02 + 1 = 9.200 pF), and the START touch
// path 910897 ohm over 24.7 mm (8.494 pF), skin in series, read at pip.ino's 200 us.
const chargeFixture = (note, port, iface, ohm, traceMm, drive, waitUs, returnNet, returnType) => ({
  note,
  meshes: { pad: { solids: [box(0, 0, 0, 10, 10, 2)] } },
  parts: [{ id: "pip", bodies: [{ id: "pad", mesh: "@pad" }], features: [{ kind: "port", id: `port.${port}`, body: "pad", net: port, type: "signal", interface: iface }] }],
  nets: [{
    id: port, conductors: [], bodies: [], terminals: [`port.${port}`], resistance: [], bulkOhm: ohm, contacts: [], totalOhm: [ohm, ohm],
    unpricedContacts: [], capToGndPf: Number((7 + traceMm * 0.02 + 1).toFixed(3)), couplingPf: {}, capMethod: "pip-per-mm", tier: "inferred", qualifier: "computed",
  }],
  hookup: [{ port: `port.${port}`, mcu: "rp2040", pin: "GP4", read: { model: "charge-release", drive, driveUs: 30, waitUs, waitSource: "default" } }],
  charges: [{ port: `port.${port}`, path: { net: port, returnNet, contact: `switch.${port}`, pathOhm: ohm, returnType, tier: "inferred", unpriced: [], traceMm } }],
});
put("CHK-NET-29", "pass", chargeFixture("PIP A key, path 1687980 ohm, 9.200 pF, waited 3500 us as pip_stick emits", "A", "digital", 1687980, 60, "high", 3500, "GND", "gnd"));
put("CHK-NET-29", "fail", chargeFixture("PIP START touch, path 910897 ohm plus the 20 Mohm bench skin, 8.494 pF, waited 200 us as pip.ino ships", "START", "touch", 910897, 24.7, "low", 200, "3V3", "power"));

// CHK-NET-30: a cPLA track between two cPLA leads 40 mm each, 1.4 mm wide (BAFFLE R3's rule, model.js line 1012).
const swingPart = (note, w) => ({
  note,
  meshes: { pad: { solids: [box(-50, -10, 0, 50, 10, 2)] } },
  parts: [{ id: "slider", bodies: [{ id: "pad", mesh: "@pad" }], features: [
    { ...cond("conductor.track", "SLD", line([[-30, 0], [30, 0]])), width: w, role: "element" },
    cond("conductor.leadA", "SLD", line([[-30, 0], [-30, -40]])),
    cond("conductor.leadB", "SLD", line([[30, 0], [30, -40]])),
  ] }],
  nets: [bareNet("SLD", [])],
});
put("CHK-NET-30", "pass", swingPart("a 60 mm track 1.0 mm wide over two 40 mm leads 1.4 mm wide, one material", 1.0));
put("CHK-NET-30", "fail", swingPart("the same track 3.0 mm wide: the leads carry most of the loop", 3.0));

// CHK-FIT-07: BAFFLE R3's tile socket on its deck stud (model.js lines 123 and 125): 4.68 on 4.8, 1.68 deep on a 1.8 stud, 4 slots.
const colletPart = (note, fingers) => ({
  note,
  meshes: { tile: { solids: [{ prism: { outline: sq(-4, -4, 4, 4), holes: [circle(0, 0, 2.34)], z: [0, 1.68] } }] } },
  parts: [{ id: "tile", bodies: [{ id: "tile", mesh: "@tile", material: "cpla", slot: 2, role: "conductor" }], features: [
    { kind: "bore", id: "bore.socket", body: "tile", axis: { origin: [0, 0, 0], dir: [0, 0, 1] }, d: 4.68, depth: 1.68, fit: fit("PRESS", -0.06), onStud: { studD: 4.8, studH: 1.8, fingers } },
  ] }],
});
put("CHK-FIT-07", "pass", colletPart("BAFFLE R3 tile socket: interference 0.12, squeeze 0.12, 4 collet fingers", 4));
put("CHK-FIT-07", "fail", colletPart("the first tile print: the same socket with no collet slots, one solid wall", 0));

for (const [key, obj] of out) {
  const [id, which] = key.split("/");
  mkdirSync(path.join(HERE, id), { recursive: true });
  writeFileSync(path.join(HERE, id, `${which}.json`), JSON.stringify(obj, null, 1) + "\n");
}
console.log(`wrote ${out.size} fixtures`);
