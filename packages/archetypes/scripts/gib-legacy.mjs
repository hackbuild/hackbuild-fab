// Records the GIB original's numbers and bodies for the archetypes ported
// from it (M06-T09): membrane-slider-gib (`buildMembrane`) and finger-pot
// (`buildFinger`), into test/legacy/gib.json.
//
//   node packages/archetypes/scripts/gib-legacy.mjs
//
// originals/gib/files/src/src/part2.js (GIBCORE) is evaluated in place with
// the earcut the bench inlines (gib_4.html, the canonical revision, line
// 292), as sweep.js loads it with its own earcut; nothing is edited. Each
// case is blankState() with the sense set (and the width of the bench's
// example exports, gib-example-*-flex-60x14 and 60x16), built by build().
// The interposition wraps Mesh.prototype.prism to keep each queued prism;
// after build() settles, the queue holds the final polygons (every nudge is
// written back into them, part2.js lines 108 to 113), and each part's union
// is measured in manifold-3d. The page's own part volume (float32 soup) and
// bounding box stand beside it. A finger case also records simFinger (part2.js
// line 431), the divider the page's wiper reads, at five finger positions.

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Module from "manifold-3d";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "..", "test", "legacy", "gib.json");
const DIR = "/Users/obsidian/Projects/hackbuild/fab-knowledge/originals/gib/files/";
const PART2 = `${DIR}src/src/part2.js`, PAGE = `${DIR}gib_4.html`;
const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
const page = readFileSync(PAGE, "utf8");
const ec = /<script>\/\* inlined earcut\.min\.js \*\/\n([\s\S]*?)<\/script>/.exec(page);
if (!ec) throw new Error("earcut block not found in gib_4.html");
globalThis.window = globalThis;
(0, eval)(ec[1]);
if (typeof globalThis.earcut !== "function") throw new Error("earcut did not load");
// part2.js keeps Mesh inside its closure; the evaluated text (never the
// file) gains one line beside its own export line (561) that hands Mesh to
// this script, so its prism queue can be read.
const src = readFileSync(PART2, "utf8");
const at = src.indexOf("root.GIBCORE = {");
if (at < 0) throw new Error("GIBCORE export line not found");
(0, eval)(`${src.slice(0, at)}root.__gibMesh = Mesh;\n${src.slice(at)}`);
const C = globalThis.GIBCORE;
const Mesh = globalThis.__gibMesh;

const mf = await Module();
mf.setup();

const r6 = (v) => Number(v.toFixed(6));
const SIM_AT = [0, 0.25, 0.5, 0.75, 1];
function run(over) {
  const S = C.blankState();
  for (const [k, v] of Object.entries(over)) { if (typeof v === "object") Object.assign(S[k], v); else S[k] = v; }
  const queues = [];
  const prism = Mesh.prototype.prism;
  Mesh.prototype.prism = function (o, h, z0, z1) { queues.push({ mesh: this, q: [o, h || [], z0, z1] }); return prism.call(this, o, h, z0, z1); };
  let G;
  try { G = C.build(S); } finally { Mesh.prototype.prism = prism; }
  const byName = new Map();
  for (const { mesh, q } of queues) { const l = byName.get(mesh.name) ?? []; l.push(q); byName.set(mesh.name, l); }
  const pageParts = new Map([...G.parts, ...(G.memParts ?? [])].map((p) => [p.name, p]));
  const parts = [...byName.entries()].map(([name, qs]) => {
    const own = [];
    for (const [o, holes, z0, z1] of qs) {
      if (z1 - z0 < 1e-6) continue;
      const ring = (L, ccw) => { const a = L.reduce((s, p, i) => { const q = L[(i + 1) % L.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0); return (a > 0) === ccw ? L.map((p) => [p[0], p[1]]) : L.map((p) => [p[0], p[1]]).reverse(); };
      const cs = new mf.CrossSection([ring(o, true), ...holes.map((h) => ring(h, false))], "Positive");
      own.push(cs.extrude(z1 - z0).translate([0, 0, z0]));
      cs.delete();
    }
    const u = mf.Manifold.union(own);
    const bb = u.boundingBox();
    const pp = pageParts.get(name);
    let pageVol = null, pageBbox = null;
    if (pp) {
      const v = pp.positions; const b = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
      for (let i = 0; i < v.length; i += 3) for (let k = 0; k < 3; k++) { b[k] = Math.min(b[k], v[i + k]); b[k + 3] = Math.max(b[k + 3], v[i + k]); }
      pageVol = r6(C.volume ? C.volume(pp) : 0); pageBbox = b.map(r6);
    }
    const out = { name, prisms: qs.length, volume: r6(u.volume()), bbox: [...bb.min, ...bb.max].map(r6), pageVolume: pageVol, pageBbox };
    u.delete(); for (const m of own) m.delete();
    return out;
  });
  return {
    state: S, T: G.T, objectSizes: G.objects.map((o) => o.size), f: G.f, stack: G.stack, warn: G.warn, notes: G.notes, nudges: G.nudges, memInstall: G.memInstall ?? null,
    phys: G.phys, geom: Object.fromEntries(Object.entries(G.geom).filter(([, v]) => typeof v === "number")), parts,
    ...(S.sense === "finger" ? { sim: SIM_AT.map((x) => ({ x01: x, ...C.simFinger(G, x) })) } : {}),
  };
}

const out = {
  command: "node packages/archetypes/scripts/gib-legacy.mjs",
  note: "the original evaluated in place with the bench's inlined earcut; manifold-3d from the repo node_modules measures each part's union from the settled prism queue",
  manifold: JSON.parse(readFileSync(path.join(HERE, "..", "..", "..", "node_modules", "manifold-3d", "package.json"), "utf8")).version,
  sources: { gib: { "part2.js": sha(PART2), "gib_4.html": sha(PAGE) } },
  variants: {
    "finger.defaults": run({ sense: "finger" }),
    "finger.rigid": run({ sense: "finger", body: "rigid", cond: "cpla", W: 16 }),
    "finger.sweep": run({ sense: "finger", W: 18, pad: 2.5, holeD: 1.5 }),
    "membrane.defaults": run({ sense: "membrane" }),
    "membrane.example": run({ sense: "membrane", W: 16 }),
    "membrane.sweep": run({ sense: "membrane", T: 2.4, W: 20, pad: 2.5, holeD: 1.5 }),
  },
};
writeFileSync(OUT, JSON.stringify(out, null, 1) + "\n");
for (const [k, v] of Object.entries(out.variants)) console.log(k, "T", v.T, "nudges", v.nudges, "warn", JSON.stringify(v.warn), v.parts.map((p) => `${p.name}:${p.volume}/${p.pageVolume}`).join(" "));
