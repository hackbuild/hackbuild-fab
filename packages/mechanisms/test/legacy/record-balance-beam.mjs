// Records the pin-free-balance-beam body from its canonical original,
// STIPPLE R17b (lineage stipple.kin/r17b, sha256 checked first). The page
// carries no generator: its 27 part outlines live in DATA.parts (line
// 117) and the page builds each body with its own geomOf() (lines 186 to
// 193), a THREE.ExtrudeGeometry of shapeOf() rings (lines 175 to 184) at
// depth T, with three.js r128 inlined at line 115. This script runs that
// three.js, shapeOf and geomOf in node with no DOM and records the link's
// rings, its thickness, and the volume and bounding box of the mesh the
// page builds; then link() (lines 125 to 171) at rest, half and full
// select. R17's companion (lineage stipple.bench/r17) is read for its link
// ring and STROKE, the edit the reference's README names.
//
//   node packages/mechanisms/test/legacy/record-balance-beam.mjs
//
// writes reference/joints/balance-beam/expected/legacy.json.

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { localSource } from "../../../../tools/test-support/originals-root.ts";
import vm from "node:vm";

const repo = new URL("../../../../", import.meta.url);
const lineage = JSON.parse(readFileSync(new URL("lineage.json", repo), "utf8"));

function pinned(id) {
  const row = lineage.find((r) => r.id === id);
  if (row === undefined) throw new Error(`lineage.json has no row ${id}`);
  const bytes = readFileSync(localSource(row.source));
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (sha256 !== row.sha256) throw new Error(`${row.source}: sha256 ${sha256}, lineage ${row.sha256}`);
  const text = bytes.toString("utf8");
  return { text, lines: text.split("\n"), source: row.source, sha256, lineage: id };
}

function dataOf(f) {
  const d = f.text.slice(f.text.indexOf("const DATA=") + "const DATA=".length);
  return JSON.parse(d.slice(0, d.indexOf("</script>")).replace(/;\s*$/, ""));
}

/** The page's own body builder: three.js line 115, shapeOf and geomOf, run on DATA. */
function pageBody(f, DATA, name) {
  if (!f.lines[114].startsWith("!function(t,e)")) throw new Error(`${f.source}: line 115 is not three.js`);
  if (!f.lines[174].startsWith("function shapeOf(poly)")) throw new Error(`${f.source}: line 175 is not shapeOf`);
  if (!f.lines[185].startsWith("function geomOf(name)") || !f.lines[184].startsWith("const GCACHE")) throw new Error(`${f.source}: line 186 is not geomOf`);
  const ctx = vm.createContext({ Math, DATA, console, self: {} });
  ctx.globalThis = ctx;
  vm.runInContext(f.lines[114], ctx);
  // Lines 125 to 171 bind P, PARTS, T and TC as the page does; 175 to 194 are shapeOf, GCACHE and geomOf verbatim.
  const body = [
    f.lines.slice(124, 171).join("\n"),
    f.lines.slice(174, 194).join("\n"),
    `this.__ = geomOf(${JSON.stringify(name)});`,
  ].join("\n");
  vm.runInContext(body, ctx);
  const { g, t } = ctx.__;
  const pos = g.attributes.position.array;
  const idx = g.index === null ? null : g.index.array;
  const n = idx === null ? pos.length / 3 : idx.length;
  const v = (k) => { const i = idx === null ? k : idx[k]; return [pos[3 * i], pos[3 * i + 1], pos[3 * i + 2]]; };
  let vol = 0;
  for (let k = 0; k < n; k += 3) {
    const [a, b, c] = [v(k), v(k + 1), v(k + 2)];
    vol += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
  }
  g.computeBoundingBox();
  const bb = g.boundingBox;
  return { t, triangles: n / 3, volume: vol, bbox: { min: [bb.min.x, bb.min.y, bb.min.z], max: [bb.max.x, bb.max.y, bb.max.z] } };
}

function kin(f, DATA) {
  if (!f.lines[124].startsWith("const P = DATA.P")) throw new Error(`${f.source}: line 125 is not the kinematics block`);
  const ctx = vm.createContext({ Math, DATA });
  vm.runInContext(`${f.lines.slice(124, 171).join("\n")}\nthis.__ = { link, P };`, ctx);
  const { link, P } = ctx.__;
  const S = P.STROKE;
  const pose = (zR, zC) => { const l = link(0, 0, [zR], [zC]); return { zRow: zR, zCol: zC, thetaDeg: (l.theta * 180) / Math.PI, crown: l.crown, rise: l.crown - P.CROWN_TOP }; };
  return [pose(0, 0), pose(S, 0), pose(S, S)];
}

const b = pinned("stipple.kin/r17b");
const c = pinned("stipple.bench/r17");
const D = dataOf(b);
const D17 = dataOf(c);
const link = D.parts.link;
const P = D.P;
const record = {
  mechanism: "pin-free-balance-beam",
  part: "link",
  source: { lineage: b.lineage, file: "files/stipple-r17b.html", sha256: b.sha256, data: "117 (DATA.parts.link, DATA.P)", body: "175 to 194 (shapeOf, geomOf), three.js r128 line 115", kinematics: "125 to 171 (link)", recorder: "packages/mechanisms/test/legacy/record-balance-beam.mjs" },
  P: Object.fromEntries(["T", "STROKE", "CROWN_R", "CROWN_HX", "LINK_UND", "CROWN_TOP", "NOSE_R", "BOSS_R", "LINK_L", "RT_FLOOR", "CT_FLOOR", "TILT_MAX", "XDRIFT"].map((k) => [k, P[k]])),
  thicknessFlag: link.t,
  rings: link.rings,
  body: pageBody(b, D, "link"),
  poses: kin(b, D),
  r17: {
    lineage: c.lineage, sha256: c.sha256,
    sameLinkRings: JSON.stringify(D17.parts.link) === JSON.stringify(link),
    T: D17.P.T, STROKE: D17.P.STROKE,
    poses: kin(c, D17),
  },
};
writeFileSync(new URL("reference/joints/balance-beam/expected/legacy.json", repo), `${JSON.stringify(record, null, 1)}\n`);
console.log(JSON.stringify({ body: record.body, poses: record.poses.map((p) => [p.rise, p.thetaDeg]), r17: record.r17.sameLinkRings }));
