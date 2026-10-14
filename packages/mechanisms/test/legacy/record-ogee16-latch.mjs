// Records the displacement-coincidence-latch bodies as OGEE16 R16-P shipped
// them (the originals rule, M06-T06 step 5). OpenSCAD is not on this
// machine, so the record is the original's own exported output, read from
// the two archives under originals/ogee16/files/exports/ pinned by the
// sha256 in originals/ogee16/SHA256SUMS:
//   ogee16-cut.zip   dxf/rod.dxf and dxf/latch.dxf, the p_rod() and
//                    p_latch() profiles as OpenSCAD's DXF export writes them
//                    (LINE entities, each coordinate as OpenSCAD prints it);
//   ogee16-print-stl.zip print/rod.stl and print/rod_asm.stl, the printed
//                    rod a_rod() in its print pose and its assembly pose.
// Each DXF is kept as its loops in file order, every coordinate as the
// printed text and as the number it parses to. Each STL is kept as its
// facet count, its volume (sum of signed tetrahedra about the origin) and
// its bounding box.
// Run: node packages/mechanisms/test/legacy/record-ogee16-latch.mjs
// Writes packages/mechanisms/test/legacy/ogee16-latch.json.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const ORIG = "/Users/obsidian/Projects/hackbuild/fab-knowledge/originals/ogee16/";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const sums = Object.fromEntries(readFileSync(`${ORIG}SHA256SUMS`, "utf8").trim().split("\n").map((l) => { const [h, f] = l.split(/\s+/); return [f, h]; }));

function archive(rel) {
  const bytes = readFileSync(`${ORIG}${rel}`);
  const h = sha(bytes);
  if (h !== sums[rel]) throw new Error(`${rel} sha256 ${h} differs from SHA256SUMS ${sums[rel]}`);
  return { file: rel, sha256: h };
}
const member = (rel, name) => execFileSync("unzip", ["-p", `${ORIG}${rel}`, name], { maxBuffer: 1 << 26 });

/** LINE entities chained into closed loops in file order; each vertex the start point of a segment. */
function dxfLoops(text) {
  const t = text.split(/\r?\n/).map((s) => s.trim());
  const segs = [];
  for (let i = 0; i < t.length; i++) {
    if (t[i] !== "LINE" || t[i - 1] !== "0") continue;
    const g = {};
    for (let j = i + 1; j < t.length - 1 && t[j] !== "0"; j += 2) g[t[j]] = t[j + 1];
    segs.push({ a: [g["10"], g["20"]], b: [g["11"], g["21"]] });
  }
  const loops = [];
  let cur = [];
  for (const s of segs) {
    cur.push(s.a);
    if (s.b[0] === cur[0][0] && s.b[1] === cur[0][1]) { loops.push(cur); cur = []; }
  }
  if (cur.length > 0) throw new Error("a DXF loop does not close");
  return { lines: segs.length, loops: loops.map((l) => ({ text: l, value: l.map(([x, y]) => [Number(x), Number(y)]) })) };
}

function stl(buf) {
  const text = buf.toString("utf8");
  const v = [...text.matchAll(/vertex\s+(\S+)\s+(\S+)\s+(\S+)/g)].map((m) => [Number(m[1]), Number(m[2]), Number(m[3])]);
  let vol = 0;
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < v.length; i += 3) {
    const [a, b, c] = [v[i], v[i + 1], v[i + 2]];
    vol += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
  }
  for (const p of v) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], p[k]); hi[k] = Math.max(hi[k], p[k]); }
  return { facets: v.length / 3, volume: vol, bbox: { min: lo, max: hi } };
}

const cut = archive("files/exports/ogee16-cut.zip");
const print = archive("files/exports/ogee16-print-stl.zip");
const rec = (zip, name) => { const b = member(zip.file, name); return { member: name, sha256: sha(b), bytes: b }; };
const rodDxf = rec(cut, "dxf/rod.dxf");
const latchDxf = rec(cut, "dxf/latch.dxf");
const rodStl = rec(print, "print/rod.stl");
const rodAsm = rec(print, "print/rod_asm.stl");

const out = {
  mechanism: "displacement-coincidence-latch",
  recorder: "packages/mechanisms/test/legacy/record-ogee16-latch.mjs",
  command: "node packages/mechanisms/test/legacy/record-ogee16-latch.mjs",
  source: {
    scad: { lineage: "ogee16.scad/r16p", file: "files/src/source/ogee16.scad", rod: "p_rod() lines 68 to 80", plate: "p_latch() lines 221 to 233" },
    params: { lineage: "ogee16.params/r16p", file: "files/src/source/params.scad" },
    cut, print,
    note: "OpenSCAD is not on this machine; the geometry is the original's own exports, as OpenSCAD wrote them on 2026-08-17",
  },
  rod: { dxf: { member: rodDxf.member, sha256: rodDxf.sha256, ...dxfLoops(rodDxf.bytes.toString("utf8")) } },
  plate: { dxf: { member: latchDxf.member, sha256: latchDxf.sha256, ...dxfLoops(latchDxf.bytes.toString("utf8")) } },
  rodStl: { print: { member: rodStl.member, sha256: rodStl.sha256, ...stl(rodStl.bytes) }, asm: { member: rodAsm.member, sha256: rodAsm.sha256, ...stl(rodAsm.bytes) } },
};
writeFileSync(new URL("./ogee16-latch.json", import.meta.url), `${JSON.stringify(out, null, 1)}\n`);
console.log(`rod ${out.rod.dxf.loops.length} loop(s) ${out.rod.dxf.lines} lines; plate ${out.plate.dxf.loops.length} loops; rod.stl volume ${out.rodStl.print.volume} facets ${out.rodStl.print.facets}; rod_asm.stl volume ${out.rodStl.asm.volume}`);
