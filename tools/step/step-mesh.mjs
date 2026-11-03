#!/usr/bin/env node
// STEP to binary STL through occt-import-js (LGPL-2.1, OCCT 7 in wasm), run
// in its own node process: core's part.build spawns this file for an import
// of format step, so the LGPL library loads as a separate file and never
// enters an MIT package or a bake (D-043, plan v11.2 section 5 item 4;
// tools/licences.json row load lazy-separate-file). The board viewer route,
// packages/board/seed/step2mesh.mjs, writes Y-up viewer JSON from the same
// library; this route keeps the file's Z-up frame for the Part IR.
//
//   node tools/step/step-mesh.mjs <in.step> <out.stl> [--deflection <mm>]
//
// Every mesh in the file goes into the one STL, in file order. The output is
// in millimetres whatever unit the STEP declares (the converter's
// linearUnit). stdout is one JSON line: meshes, triangles, names, bounds in
// mm and the converter version. Exit 0 when written, 1 when the file does not
// read, 2 on a usage error.

import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";

/** Chord tolerance of the triangulation, mm (inferred: 0.01 mm sits under a 0.4 mm nozzle's resolution by 40x). */
export const DEFAULT_DEFLECTION_MM = 0.01;
/** OCCT's angular deflection, radians (vendor default of BRepMesh, 0.5). */
const ANGULAR_DEFLECTION = 0.5;

const require = createRequire(import.meta.url);

/** Binary STL bytes from flat triangle soups, normals left zero (readers recompute them). */
export function binaryStl(tris) {
  const n = tris.length / 9;
  const buf = Buffer.alloc(84 + n * 50);
  buf.write("hbf step-mesh, occt-import-js", 0, "latin1");
  buf.writeUInt32LE(n, 80);
  for (let t = 0; t < n; t += 1) {
    const at = 84 + t * 50 + 12;
    for (let k = 0; k < 9; k += 1) buf.writeFloatLE(tris[t * 9 + k], at + k * 4);
  }
  return buf;
}

/** Reads STEP bytes; returns the triangle soup in mm and a summary. */
export async function stepToSoup(bytes, deflection = DEFAULT_DEFLECTION_MM) {
  const occt = await require("occt-import-js")();
  const r = occt.ReadStepFile(new Uint8Array(bytes), {
    linearUnit: "millimeter", linearDeflectionType: "absolute_value", linearDeflection: deflection, angularDeflection: ANGULAR_DEFLECTION,
  });
  if (!r.success) throw new Error("occt-import-js could not read the STEP file");
  const tris = [];
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const m of r.meshes) {
    const p = m.attributes.position.array;
    const ix = m.index.array;
    for (let i = 0; i < ix.length; i += 1) {
      for (let k = 0; k < 3; k += 1) {
        const v = p[ix[i] * 3 + k];
        tris.push(v);
        if (v < lo[k]) lo[k] = v;
        if (v > hi[k]) hi[k] = v;
      }
    }
  }
  const version = JSON.parse(readFileSync(require.resolve("occt-import-js/package.json"), "utf8")).version;
  return {
    tris,
    summary: { meshes: r.meshes.length, triangles: tris.length / 9, names: r.meshes.map((m) => m.name), boundsMm: tris.length === 0 ? null : { lo, hi }, deflectionMm: deflection, converter: `occt-import-js ${version}` },
  };
}

async function main() {
  const argv = process.argv.slice(2);
  const di = argv.indexOf("--deflection");
  const deflection = di >= 0 ? Number(argv.splice(di, 2)[1]) : DEFAULT_DEFLECTION_MM;
  const [input, output] = argv;
  if (input === undefined || output === undefined || !(deflection > 0)) {
    process.stderr.write("usage: node tools/step/step-mesh.mjs <in.step> <out.stl> [--deflection <mm>]\n");
    process.exit(2);
  }
  try {
    const { tris, summary } = await stepToSoup(readFileSync(input), deflection);
    if (summary.triangles === 0) throw new Error("the STEP file holds no solid or surface that meshes");
    writeFileSync(output, binaryStl(tris));
    process.stdout.write(`${JSON.stringify(summary)}\n`);
  } catch (e) {
    process.stderr.write(`step-mesh: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exit(1);
  }
}

if (process.argv[1] !== undefined && import.meta.url === new URL(`file://${process.argv[1]}`).href) await main();
