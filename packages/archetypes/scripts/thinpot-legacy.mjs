// Records the THINPOT original's numbers and bodies for the archetypes
// ported from it (M06-T09): ladder-keypad (`ladder`), dome-button
// (`switch` with `domeCap`) and membrane-slider-thinpot (`thinpot`), into
// test/legacy/thinpot.json.
//
//   node packages/archetypes/scripts/thinpot-legacy.mjs
//
// The page's first four script blocks (geom, FEELER_CORE with the
// archetypes, SIM) are evaluated in place from
// originals/thinpot/files/feeler_thinpot.html; nothing in the original is
// edited. Each archetype builds through the page's own Ctx at its declared
// defaults with the app's print settings (layerH 0.2, nozzle 0.4, slots
// PETG, CPLA, TPU95, CTPU; lines 5671 to 5705), then absorbTerminals and
// solve, as build() does (lines 5706 to 5719). The `n06` and `n05`
// variants set the page's own nozzle input to 0.6 and 0.5 at layer 0.2. The interpositions wrap
// Mesh.prototype.prism, revolve and lathe to record each call's arguments,
// and carry those records with absorbTerminals when it folds a part; each recorded primitive is rebuilt in manifold-3d to measure
// the union volume of every part (the page's meshes are soups of closed
// primitives the slicer unions), and each primitive's manifold volume is
// held against the page's own signed volume of the faces that call wrote.
// Bounding boxes are the page's own Mesh.bounds() in the assembled frame
// and of posedMesh() (lines 7004 to 7015), the print pose the 3MF carries.

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Module from "manifold-3d";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "..", "test", "legacy", "thinpot.json");
const FILE = "/Users/obsidian/Projects/hackbuild/fab-knowledge/originals/thinpot/files/feeler_thinpot.html";
const src = readFileSync(FILE, "utf8");
const sha = createHash("sha256").update(readFileSync(FILE)).digest("hex");
const blocks = [...src.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
globalThis.window = globalThis;
for (let i = 0; i < 4; i++) (0, eval)(blocks[i]);
const G = globalThis.geom, F = globalThis.FEELER_CORE;

const mf = await Module();
mf.setup();
const { Manifold, CrossSection } = mf;

// ---- record primitives ----
const proto = G.Mesh.prototype;
const orig = { prism: proto.prism, revolve: proto.revolve, lathe: proto.lathe, apex: proto.apex };
function signedVol(v, f, f0) {
  let vol = 0;
  for (let i = f0; i < f.length; i += 3) {
    const a = f[i] * 3, b = f[i + 1] * 3, c = f[i + 2] * 3;
    vol += (v[a] * (v[b + 1] * v[c + 2] - v[c + 1] * v[b + 2]) - v[a + 1] * (v[b] * v[c + 2] - v[c] * v[b + 2]) + v[a + 2] * (v[b] * v[c + 1] - v[c] * v[b + 1])) / 6;
  }
  return Math.abs(vol);
}
for (const k of ["prism", "revolve", "lathe", "apex"]) {
  proto[k] = function (...args) {
    const f0 = this.f.length;
    const r = orig[k].apply(this, args);
    if (this.f.length > f0) (this.prims ??= []).push({ k, args: JSON.parse(JSON.stringify(args)), vol: signedVol(this.v, this.f, f0) });
    return r;
  };
}

// absorbTerminals (line 1112) copies the terminals part's vertices, faces
// and slabs into its host; the recorded primitives follow them.
const absorb = F.Ctx.prototype.absorbTerminals;
F.Ctx.prototype.absorbTerminals = function () {
  const t = this.parts.find((p) => p.name === "terminals");
  const before = t ? t.mesh.v.length : 0;
  absorb.call(this);
  if (t && !this.parts.includes(t)) {
    const host = this.parts.find((p) => p.mesh.v.length >= before && (p.mesh.prims ?? []).length > 0 && p !== t && p.mesh.slabs.includes(t.mesh.slabs[0]));
    if (host) (host.mesh.prims ??= []).push(...(t.mesh.prims ?? []));
  }
};

/** A recorded primitive as a manifold, the way the page meshes it. */
function solidOf(p) {
  const [a0, a1, a2, a3, a4, a5, a6] = p.args;
  if (p.k === "prism") {
    const loops = [G.ccw(a0)].concat((a1 || []).map((h) => G.cw(h)));
    const s = a4 === undefined || a4 === null ? 1 : a4;
    if (s !== 1) throw new Error("scaled prism not read here");
    return new CrossSection(loops, "Positive").extrude(a3 - a2).translate([0, 0, a2]);
  }
  if (p.k === "revolve") {
    return new CrossSection([G.ccw(a0)], "Positive").revolve(a3 || 48).translate([a1, a2, 0]);
  }
  if (p.k === "lathe") {
    return new CrossSection([G.ccw(a0)], "Positive").revolve(a3 || 48).translate([a1, a2, 0]);
  }
  throw new Error(`primitive ${p.k} not read here`);
}

const r6 = (v) => (typeof v === "number" ? Number(v.toFixed(6)) : v);
function posed(p) {
  const q = p.pose; const v = p.mesh.v;
  const b = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
  for (let i = 0; i < v.length; i += 3) {
    let z = v[i + 2];
    if (q.flipZ) z = q.flipZ[0] + q.flipZ[1] - z;
    const x = v[i] + (q.dx || 0), y = v[i + 1] + (q.dy || 0); z += q.dz || 0;
    if (x < b[0]) b[0] = x; if (x > b[3]) b[3] = x; if (y < b[1]) b[1] = y; if (y > b[4]) b[4] = y; if (z < b[2]) b[2] = z; if (z > b[5]) b[5] = z;
  }
  return b;
}

function run(id, over) {
  const T = F.TYPES[id];
  const P = {};
  T.params.forEach((q) => { P[q.k] = q.def; });
  Object.assign(P, { layerH: 0.2, nozzle: 0.4, matRigid: "PETG", matCond: "CPLA", matFlex: "TPU95", matAux: "CTPU" }, over);
  const c = new F.Ctx(P);
  T.build(c); c.absorbTerminals();
  c.parts = c.parts.filter((p) => p.mesh.count() > 0);
  c.solve();
  const parts = c.parts.map((p) => {
    const prims = p.mesh.prims ?? [];
    const own = [];
    let sumM = 0, sumPage = 0, maxDiff = 0;
    for (const q of prims) {
      const m = solidOf(q); own.push(m);
      const d = Math.abs(m.volume() - q.vol);
      sumM += m.volume(); sumPage += q.vol; maxDiff = Math.max(maxDiff, d);
    }
    const u = Manifold.union(own);
    const vol = u.volume();
    const out = {
      name: p.name, role: p.role, virtual: !!p.virtual, primitives: prims.length,
      kinds: prims.reduce((s, q) => ({ ...s, [q.k]: (s[q.k] ?? 0) + 1 }), {}),
      volume: r6(vol), primitiveSum: r6(sumM), pageSum: r6(sumPage), primitiveMaxDiff: maxDiff,
      bbox: p.mesh.bounds().map(r6), pose: p.pose ?? null, posedBbox: p.pose ? posed(p).map(r6) : p.mesh.bounds().map(r6),
    };
    u.delete(); for (const m of own) m.delete();
    return out;
  });
  return {
    params: Object.fromEntries(Object.entries(P).filter(([k]) => k !== "constructor")),
    readout: c.readout, fits: c.fits, notes: c.notes, netReport: c.netReport, netCount: c.netCount,
    taps: c.taps.map((t) => ({ label: t.label, x: r6(t.x), y: r6(t.y), z: r6(t.z), net: t.net })),
    contacts: c.contacts, wires: c.wires, boms: c.boms, pauses: c.pauses, circuit: c.circuitSpec ?? null,
    ladder: c.ladder ? { N: c.ladder.N, R: c.ladder.R, Rlink: c.ladder.Rlink, keys: c.ladder.keys, rimR: c.ladder.rimR, plugDrop: c.ladder.plugDrop } : null,
    parts,
  };
}

const out = {
  command: "node packages/archetypes/scripts/thinpot-legacy.mjs",
  note: "the original evaluated in place; manifold-3d from the repo node_modules measures the union of each part's recorded primitives",
  manifold: JSON.parse(readFileSync(path.join(HERE, "..", "..", "..", "node_modules", "manifold-3d", "package.json"), "utf8")).version,
  sources: { thinpot: { "feeler_thinpot.html": sha } },
  print: { layerH: 0.2, nozzle: 0.4, slots: ["PETG", "CPLA", "TPU95", "CTPU"], lines: "5671 to 5705" },
  variants: {
    "ladder.defaults": run("ladder", {}),
    "ladder.inplace": run("ladder", { print: "inplace" }),
    "ladder.ffc5p": run("ladder", { layerH: 0.24 }),
    "switch.defaults": run("switch", {}),
    "switch.inplace": run("switch", { print: "inplace" }),
    "switch.ffc5p": run("switch", { layerH: 0.24 }),
    "thinpot.defaults": run("thinpot", {}),
    "thinpot.ffc5p": run("thinpot", { layerH: 0.24 }),
    "thinpot.ctpuLog": run("thinpot", { top: "ctpu", taper: "log" }),
    // nozzle 0.6 lifts every nozzle rule off its floor (0.6 x 1.5 = 0.9 > 0.6, 2.1 x 0.6 = 1.26 > 0.84, 2 x 0.6 = 1.2 > 1.0; the log taper reads the narrow track), so the page's coefficients set the geometry
    "ladder.n06": run("ladder", { nozzle: 0.6 }),
    // the inplace hinge band is min(cone wall 0.6, max(0.42, 1.05 x nozzle)); nozzle 0.5 puts it between the two at 0.525
    "ladder.inplace.n05": run("ladder", { print: "inplace", nozzle: 0.5 }),
    "switch.n06": run("switch", { nozzle: 0.6 }),
    "thinpot.n06": run("thinpot", { nozzle: 0.6 }),
    "thinpot.ctpuLog.n06": run("thinpot", { top: "ctpu", taper: "log", nozzle: 0.6 }),
  },
};
writeFileSync(OUT, JSON.stringify(out, null, 1) + "\n");
for (const [k, v] of Object.entries(out.variants)) console.log(k, v.parts.map((p) => `${p.name}:${p.volume}(${p.primitives},${p.primitiveMaxDiff.toExponential(1)})`).join(" "), v.netReport.filter((r) => !r.ok).length, "net fails");
