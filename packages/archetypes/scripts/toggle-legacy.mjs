// Records the TOGGLE original's numbers for the tilt-stick TOGGLE presets
// (M06-T09 step 2, M06-T14 flex-neck-tilt-pivot) into
// test/legacy/toggle.json.
//
//   node packages/archetypes/scripts/toggle-legacy.mjs
//
// The script evaluates the original kernel files in place, in the order
// the bench loads them (originals/toggle/files/src/harness/load.js:
// rastermesh, part2a to part2e; orca3mf and jszip are only the 3MF writer
// and are not loaded), and runs TOGGLE.build on each preset exactly as
// the bench does. Nothing in the original is edited. Each preset is also
// built with stick.tex 'none', a setting the original exposes, because the
// kernel's lathe route with a heightfield has not landed: those builds are
// the geometry the port regenerates.

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { localSource } from "../../../tools/test-support/originals-root.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "..", "test", "legacy", "toggle.json");
const ORIG = localSource("fab-knowledge:originals/toggle/files/");
const FILES = ["extracted/rastermesh.js", "src/src/part2a.js", "src/src/part2b.js", "src/src/part2c.js", "src/src/part2d.js", "src/src/part2e.js"];
const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");

for (const f of FILES) vm.runInThisContext(readFileSync(ORIG + f, "utf8"), { filename: f });
const T = globalThis.TOGGLE;

const r9 = (v) => (typeof v === "number" && Number.isFinite(v) ? Number(v.toPrecision(12)) : v);

function bbox(m) {
  const p = m.positions, lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < p.length; i += 3) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], p[i + k]); hi[k] = Math.max(hi[k], p[i + k]); }
  return { min: lo.map(r9), max: hi.map(r9) };
}

const G_KEYS = [
  "L", "rn", "neckL", "pivot", "r0", "bandH", "alpha", "over", "r1", "rs", "Rd", "rimT", "rf", "riser", "Rw", "pd", "Re", "RA", "needR",
  "size", "outHx", "outR", "rowY", "studs", "ledgeRows", "ledgeTop", "zf", "layers", "traceT", "sepT", "boreTop", "cupTop",
  "zn1", "zp", "zb0", "zb1", "zci", "zc0", "zc1", "zB0", "zB1", "zA0", "zA1", "contactB", "contactA", "zr0", "tLip", "thS", "roofLift",
  "rh", "K", "roofTop", "zT", "zcb", "zrim", "ztop", "thContact", "thStop", "thStop45", "restOk", "restBand", "squeeze", "phiA", "routeTries",
];

function run(key, patch) {
  const S = T.preset(key);
  if (patch) for (const k in patch) Object.assign(S[k], patch[k]);
  const out = T.build(S);
  const G = out.G;
  const g = {};
  for (const k of G_KEYS) if (G[k] !== undefined) g[k] = r9(G[k]);
  const ph = out.G.phys;
  const phys = {};
  for (const [k, v] of Object.entries(ph)) if (typeof v === "number" || typeof v === "boolean" || v === null) phys[k] = r9(v);
  phys.nets = ph.nets.map((n) => ({ net: n.net, len: r9(n.len), R: r9(n.R) }));
  const nets = G.nets.map((n) => ({ name: n.name, kind: n.kind, len: r9(n.route ? n.route.len : 0), vias: n.route && n.route.vias ? n.route.vias.length : 0 }));
  const lathe = {
    tpu: { volume: r9(T.signedVolume(out.lathe.tpu)), bbox: bbox(out.lathe.tpu), triangles: out.lathe.tpu.indices.length / 3 },
    ctpu: { volume: r9(T.signedVolume(out.lathe.ctpu)), bbox: bbox(out.lathe.ctpu), triangles: out.lathe.ctpu.indices.length / 3 },
  };
  const raster = {};
  for (const [slot, m] of Object.entries(out.raster)) if (m) raster[slot] = { volume: r9(T.signedVolume(m)), bbox: bbox(m) };
  const sectors = G.sectors.map((s) => ({ c: r9(s.c), a0: r9(s.a0), a1: r9(s.a1), half: r9(s.half) }));
  const contact = {
    "13.8@180": T.contact(G, 13.8, 180).sectors,
    "14.2@180": T.contact(G, 14.2, 180).sectors,
    "16@0": T.contact(G, 16, 0).sectors,
    "30@22.5": (() => { const c = T.contact(G, 30, 22.5); return { sectors: c.sectors, dir: r9(c.dir) }; })(),
  };
  // TOGGLE has no stem stress row; the M06-T14 row adds one: a 20 N side push at the cap top on
  // the neck core through the band, lever from the band top (record toggle.md 5.1 limits).
  const stem = { leverMm: r9(G.ztop - G.zb1), sigmaMPa: r9((20 * (G.ztop - G.zb1)) / ((Math.PI * Math.pow(2 * G.rn, 3)) / 32)), equation: "20 (ztop - zb1) / (pi (2 rn)^3 / 32), computed by this script from the original's G" };
  return { state: S, G: g, sectors, leadAng: (G.leadAng || []).map(r9), phys, nets, lathe, raster, contact, stem, warnings: out.warnings, dims: Object.fromEntries(Object.entries(out.dims).map(([k, v]) => [k, r9(v)])) };
}

const variants = {};
for (const key of ["solo4", "solo8", "blocks4", "blocks8"]) {
  variants[key] = run(key);
  variants[`${key}.texNone`] = run(key, { stick: { tex: "none" } });
}

const record = {
  command: "node packages/archetypes/scripts/toggle-legacy.mjs",
  node: process.version,
  note: "TOGGLE.build per preset, evaluated in place from originals/toggle/files; .texNone variants set stick.tex 'none' (an original setting) for the untextured lathe the port builds; stem is computed by this script from the original's solved G (the original has no stem stress row)",
  sources: { toggle: Object.fromEntries(FILES.map((f) => [path.basename(f), sha(ORIG + f)])) },
  variants,
};
writeFileSync(OUT, JSON.stringify(record, null, 1) + "\n");
process.stdout.write(`wrote ${OUT}\n`);
for (const [k, v] of Object.entries(variants)) process.stdout.write(`${k}: zf ${v.G.zf} Rw ${v.G.Rw} zT ${v.G.zT} ztop ${v.G.ztop} thContact ${v.G.thContact} thStop ${v.G.thStop} pullup ${v.phys.pullup} rSwitch ${v.phys.rSwitch} stem ${v.stem.sigmaMPa} tpu ${v.lathe.tpu.volume} ctpu ${v.lathe.ctpu.volume} layers ${v.G.layers}\n`);
