#!/usr/bin/env node
// Writes the piece fixtures of the import corpus (R1-rails-import-02):
// binary STLs, mm, each under 50 KB, built with manifold-3d at a fixed
// circularSegments so the bytes stay put across runs.
//
//   floating-cap.stl  cylinder r 4 h 20 on z 0, a dome r 8 whose flat base
//                     is at z 22 (2 mm above the stem), the union mesh: two
//                     shells
//   pile.stl          five overlapping primitives, each meshed alone and
//                     concatenated with no boolean
//   pile-union.stl    the union of the same five: positive control, 1 piece
//   hollow-box.stl    20 mm box less a 12 mm box: positive control, 1 piece
//                     with 1 void
//   two-on-bed.stl    two 10 mm cubes 5 mm apart, both on z 0: 2 pieces,
//                     none floating
//   corner-touch.stl  two 10 mm cubes sharing one corner, concatenated: the
//                     union is refused
//
//   npx tsc -b && node tools/corpus/import/make-pieces.mjs [--out <dir>]
//
// The STL bytes come from the 3mf writer's stl() and the volume from the
// mesh package's signedVolume, so neither has a second copy here. Each line
// printed is file, sha256, triangles and signed volume in mm3 (computed).
// Generated, never hand-edited; SHA256SUMS and MANIFEST.json pin the bytes.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { register } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const at = (p) => pathToFileURL(path.join(ROOT, p)).href;
for (const p of ["core/dist/resolve-hook.js", "packages/3mf/dist/writer/stl.js", "packages/mesh/dist/hash.js"]) {
  if (!existsSync(path.join(ROOT, p))) {
    console.error(`${p} is missing; run npx tsc -b first`);
    process.exit(2);
  }
}
register(at("core/dist/resolve-hook.js"));
const { stl } = await import(at("packages/3mf/dist/writer/stl.js"));
const { signedVolume } = await import(at("packages/mesh/dist/hash.js"));
const { default: Module } = await import("manifold-3d");

const oi = process.argv.indexOf("--out");
const OUT = oi > 0 ? path.resolve(process.argv[oi + 1]) : path.join(ROOT, "tools/corpus/import");
const SEGS = 24;
// Five curved primitives at 24 segments put pile.stl at 77884 bytes; 16 keeps both pile files under the limit.
const PILE_SEGS = 16;
const LIMIT = 50 * 1024;

const wasm = await Module();
wasm.setup();
const { Manifold, CrossSection } = wasm;

/** A manifold as xyz positions and triangle indices. */
function soup(m) {
  const g = m.getMesh();
  const n = g.vertProperties.length / g.numProp;
  const positions = new Float32Array(n * 3);
  for (let i = 0; i < n; i += 1) for (let k = 0; k < 3; k += 1) positions[i * 3 + k] = g.vertProperties[i * g.numProp + k];
  return { positions, indices: Uint32Array.from(g.triVerts) };
}

/** Meshes appended with no boolean: overlaps and contacts stay in the file. */
function concat(ms) {
  const parts = ms.map(soup);
  const positions = new Float32Array(parts.reduce((s, p) => s + p.positions.length, 0));
  const indices = new Uint32Array(parts.reduce((s, p) => s + p.indices.length, 0));
  let po = 0, io = 0;
  for (const p of parts) {
    positions.set(p.positions, po);
    for (let i = 0; i < p.indices.length; i += 1) indices[io + i] = p.indices[i] + po / 3;
    po += p.positions.length;
    io += p.indices.length;
  }
  return { positions, indices };
}

const box = (x, y, z, sx, sy, sz) => Manifold.cube([sx, sy, sz]).translate([x, y, z]);

// floating-cap: the img2threejs mushroom mistake (plan-v5/image-eval.md line 25).
const stem = Manifold.cylinder(20, 4, 4, SEGS);
const dome = Manifold.sphere(8, SEGS).translate([0, 0, 22]).intersect(box(-10, -10, 22, 20, 20, 10));

// pile: five overlapping primitives on z 0, as the raw concatenation of line 27.
const pile = [
  box(0, 0, 0, 20, 20, 6),
  Manifold.cylinder(16, 4, 4, PILE_SEGS).translate([10, 10, 0]),
  Manifold.sphere(6, PILE_SEGS).translate([10, 10, 16]),
  CrossSection.circle(2, PILE_SEGS).translate([7, 0]).revolve(PILE_SEGS).translate([10, 10, 6]),
  box(14, 14, 4, 6, 6, 6),
];

const files = {
  "floating-cap.stl": soup(stem.add(dome)),
  "pile.stl": concat(pile),
  "pile-union.stl": soup(Manifold.union(pile)),
  "hollow-box.stl": soup(box(0, 0, 0, 20, 20, 20).subtract(box(4, 4, 4, 12, 12, 12))),
  "two-on-bed.stl": soup(box(0, 0, 0, 10, 10, 10).add(box(15, 0, 0, 10, 10, 10))),
  "corner-touch.stl": concat([box(0, 0, 0, 10, 10, 10), box(10, 10, 10, 10, 10, 10)]),
};

mkdirSync(OUT, { recursive: true });
let bad = 0;
for (const [name, m] of Object.entries(files)) {
  const bytes = stl({ name, slot: 1, positions: m.positions, indices: m.indices }, `hackbuild-fab make-pieces ${name}`);
  const sha = createHash("sha256").update(bytes).digest("hex");
  const vol = signedVolume({ positions: m.positions, triangles: m.indices });
  if (bytes.length > LIMIT) {
    console.error(`${name} is ${bytes.length} bytes, over the ${LIMIT} byte limit; lower SEGS`);
    bad += 1;
  }
  writeFileSync(path.join(OUT, name), bytes);
  console.log(`${name} ${sha} triangles ${m.indices.length / 3} volume ${vol.toFixed(3)} mm3 (computed)`);
}
process.exit(bad ? 1 : 0);
