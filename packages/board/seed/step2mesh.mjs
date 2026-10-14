#!/usr/bin/env node
// step2mesh.mjs, convert a STEP model to viewer-ready JSON meshes.
//
// Same output schema as wrl.py so viewers consume either source:
//   {"meshes":[{"name","color":[r,g,b],"positions":[x,y,z,...],"indices":[...]}],
//    "bbox":[[lo],[hi]], "leads":[[x,z],...]}   (mm, Y-up)
//
// Facts verified against KiCad packages3D models:
// - STEP files are unit-aware; KiCad/vendor STEP is real millimetres.
//   Do NOT apply the 0.1 inch scale that .wrl needs.
// - Board CAD convention is Z-up with the board plane at Z=0. Viewers are
//   Y-up, so swap Y and Z per vertex AND reverse triangle winding (the
//   swap is a reflection). After the swap, a TO-92 STEP matches its .wrl
//   twin exactly (248 tris, same bbox, leads at 0/2.54/5.08 pitch).
// - occt-import-js only reports mesh.color when the STEP carries color
//   assignments; many do not. Callers get a neutral default and can
//   recolor by mesh name.
//
// Usage:
//   node step2mesh.mjs model.step out.json [linearDeflection]
//   npm i occt-import-js    (WASM build of OCCT, works headless)
import fs from "node:fs";
import { createRequire } from "node:module";
let occtimportjs = null;
for (const base of [process.cwd() + "/", import.meta.url]) {
  try { occtimportjs = createRequire(base)("occt-import-js"); break; } catch {}
}
if (!occtimportjs) {
  console.error("occt-import-js not found: run  npm i occt-import-js  in the working directory");
  process.exit(1);
}

const [src, out, defl] = process.argv.slice(2);
if (!src) {
  console.error("usage: node step2mesh.mjs model.step [out.json] [linearDeflection]");
  process.exit(1);
}

const occt = await occtimportjs();
const params = defl
  ? { linearUnit: "millimeter", linearDeflectionType: "absolute_value", linearDeflection: parseFloat(defl) }
  : null;
const r = occt.ReadStepFile(new Uint8Array(fs.readFileSync(src)), params);
if (!r.success) {
  console.error("STEP read failed");
  process.exit(2);
}

const meshes = [];
for (const m of r.meshes) {
  const p = m.attributes.position.array;
  const positions = new Array(p.length);
  for (let i = 0; i < p.length; i += 3) {
    positions[i] = p[i];         // x
    positions[i + 1] = p[i + 2]; // world y = step z (Z-up to Y-up)
    positions[i + 2] = p[i + 1]; // world z = step y
  }
  const ix = m.index.array;
  const indices = new Array(ix.length);
  for (let i = 0; i < ix.length; i += 3) {
    indices[i] = ix[i];          // reversed winding: swap 2nd and 3rd
    indices[i + 1] = ix[i + 2];
    indices[i + 2] = ix[i + 1];
  }
  meshes.push({
    name: m.name || "",
    color: m.color ? [m.color[0], m.color[1], m.color[2]] : [0.62, 0.62, 0.62],
    positions,
    indices,
  });
}

const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
for (const m of meshes)
  for (let i = 0; i < m.positions.length; i += 3)
    for (let a = 0; a < 3; a++) {
      lo[a] = Math.min(lo[a], m.positions[i + a]);
      hi[a] = Math.max(hi[a], m.positions[i + a]);
    }

// lead recovery: cluster XZ of vertices below the board plane
const below = -0.05, cluster = 0.8, groups = [];
for (const m of meshes)
  for (let i = 0; i < m.positions.length; i += 3)
    if (m.positions[i + 1] < below) {
      const x = m.positions[i], z = m.positions[i + 2];
      let hit = false;
      for (const g of groups)
        if (Math.abs(g[0] / g[2] - x) < cluster && Math.abs(g[1] / g[2] - z) < cluster) {
          g[0] += x; g[1] += z; g[2] += 1; hit = true; break;
        }
      if (!hit) groups.push([x, z, 1]);
    }
const leads = groups.map(g => [+(g[0] / g[2]).toFixed(3), +(g[1] / g[2]).toFixed(3)]);

const tris = meshes.reduce((a, m) => a + m.indices.length / 3, 0);
console.log(`${src}: ${meshes.length} meshes, ${tris} tris`);
console.log(`  bbox mm  x ${lo[0].toFixed(2)}..${hi[0].toFixed(2)}  y ${lo[1].toFixed(2)}..${hi[1].toFixed(2)}  z ${lo[2].toFixed(2)}..${hi[2].toFixed(2)}`);
console.log(`  leads below board: ${leads.length} at ${JSON.stringify(leads)}`);
if (out) {
  fs.writeFileSync(out, JSON.stringify({ meshes, bbox: [lo, hi], leads }));
  console.log(`  wrote ${out}`);
}
