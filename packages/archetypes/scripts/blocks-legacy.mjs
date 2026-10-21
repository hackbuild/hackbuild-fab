// Records the BLOCKS and BOSS originals' numbers and per-slot volumes for
// blocks-stud (both standards) and blocks-wire into
// test/legacy/blocks.json (M06-T09 step 2, the originals rule).
//
//   node packages/archetypes/scripts/blocks-legacy.mjs
//
// The originals run headless as their own harness runs them
// (boss-src/test_parts.js: earcut and polygon-clipping on globalThis, then
// kernel.js, the standard and parts.js evaluated in order). earcut and
// polygon-clipping are the copies each page inlines (blocks.html and
// boss.html script blocks 2 and 3); the source files are evaluated in place
// from originals/blocks/files/src-extracted (byte-identical to the
// blocks.html blocks) and originals/boss/files/boss-src/src. Nothing in an
// original is edited.
//
// Each case is recorded twice: as the original builds it (every non base
// prism inset 1 um and shortened 1 um at each end, kernel.js lines 142 to
// 156 and 220 to 226) and as declared (that shrink held off by passing
// shrink false through Mesh.prototype.prism), since the port declares the
// shapes and the hbf kernel applies its own D-070 inset. Volumes are the
// union of each slot's recorded prisms, measured with manifold-3d
// (the repo's copy; the originals do not use it).

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { localSource } from "../../../tools/test-support/originals-root.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..");
const OUT = path.join(HERE, "..", "test", "legacy", "blocks.json");
const ORIG = localSource("fab-knowledge:originals/");
const MF_DIR = path.join(ROOT, "node_modules", "manifold-3d");
const Module = (await import(pathToFileURL(path.join(MF_DIR, "manifold.js")).href)).default;
const mfVersion = JSON.parse(readFileSync(path.join(MF_DIR, "package.json"), "utf8")).version;
const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
const r6 = (v) => Number(v.toFixed(6));

/** The inline script blocks of a page, by the leading comment each carries. */
function pageScripts(file) {
  const s = readFileSync(file, "utf8");
  const out = {};
  const re = /<script[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    const head = /^\/\* ([\w.-]+) \*\//.exec(m[1]);
    if (head !== null) out[head[1]] = m[1];
  }
  return out;
}

const mf = await Module();
mf.setup();

/**
 * Union volume and bbox of each slot's recorded prisms, and the volume two
 * slots share (the original's Body.build refuses a cross slot overlap,
 * blocks.js lines 80 to 86; a part built outside Body is not checked).
 */
function measure(meshes) {
  const out = {};
  const unions = [];
  const own = [];
  for (const m of meshes) {
    const solids = m.prisms.map((p) => {
      const rings = p.mp.flatMap((poly) => poly.map((ring) => ring.map((q) => [q[0], q[1]])));
      const cs = new mf.CrossSection(rings, "Positive"); own.push(cs);
      const e = cs.extrude(p.z1 - p.z0); own.push(e);
      const t = e.translate([0, 0, p.z0]); own.push(t);
      return t;
    });
    const u = mf.Manifold.union(solids); own.push(u);
    const b = u.boundingBox();
    if (out[m.slot] !== undefined) throw new Error(`slot ${m.slot} measured twice`);
    out[m.slot] = { name: m.name, volume: r6(u.volume()), bbox: { min: [...b.min].map(r6), max: [...b.max].map(r6) }, prisms: m.prisms.length, tris: m.tris };
    unions.push([m.slot, u]);
  }
  const shared = {};
  for (let i = 0; i < unions.length; i++) for (let j = i + 1; j < unions.length; j++) {
    const x = unions[i][1].intersect(unions[j][1]); own.push(x);
    shared[`${unions[i][0]}x${unions[j][0]}`] = r6(x.volume());
  }
  for (const o of own) o.delete();
  return { ...out, shared };
}

function boot(page, files, dir) {
  for (const k of ["K", "BLOCKS", "BOSS", "PARTS", "earcut", "polygonClipping"]) delete globalThis[k];
  const inl = pageScripts(page);
  (0, eval)(inl["earcut.min.js"]);
  (0, eval)(inl["polygon-clipping.umd.min.js"]);
  if (globalThis.earcut === undefined || globalThis.polygonClipping === undefined) throw new Error(`${page}: earcut or polygon-clipping did not load`);
  for (const f of files) (0, eval)(readFileSync(path.join(dir, f), "utf8"));
  return { libs: { "earcut.min.js": createHash("sha256").update(inl["earcut.min.js"]).digest("hex"), "polygon-clipping.umd.min.js": createHash("sha256").update(inl["polygon-clipping.umd.min.js"]).digest("hex") } };
}

/** Run f twice: as built, then with the 1 um shrink held off. */
function both(f) {
  const proto = globalThis.K.Mesh.prototype;
  const prism = proto.prism;
  const asBuilt = f();
  proto.prism = function (mp, z0, z1, opts) { return prism.call(this, mp, z0, z1, { ...(opts ?? {}), shrink: false }); };
  try {
    const declared = f();
    return { asBuilt, declared };
  } finally {
    proto.prism = prism;
  }
}

// ---------- BLOCKS (blocks-html standard) ----------
const bDir = `${ORIG}blocks/files/src-extracted/`;
const bFiles = ["kernel.js", "blocks.js", "parts.js"];
const bBoot = boot(`${ORIG}blocks/files/blocks.html`, bFiles, bDir);
const K = globalThis.K, B = globalThis.BLOCKS, PARTS = globalThis.PARTS;

/** One column on a 1 x 1 brick (brickBody, parts.js line 52), built and measured. */
function blocksColumn(peg, top) {
  const body = new B.Body("stud", K.rrect(0, 0, B.STD.P, B.STD.P, 0.6, 3), 0, top);
  B.column(body, 0, 0, { name: "S", top, peg });
  const built = body.build("stud");
  const meshes = Object.values(built.meshes).filter((m) => m.slot !== B.S.PETG);
  return {
    volumes: measure(meshes), errors: built.errors, taps: body.taps.map((t) => ({ ...t, x: r6(t.x), y: r6(t.y), z: r6(t.z) })),
    bores: body.bores, feats: body.feats.concat(body.extra).map((f) => ({ slot: f.slot, z0: f.z0, z1: f.z1, tag: f.tag })),
  };
}
const blocksStud = {};
for (const top of [B.STD.brickH, B.STD.plateH]) {
  for (const peg of ["both", "down", "up", "pad"]) blocksStud[`${peg}@${top}`] = both(() => blocksColumn(peg, top));
}
const blocksStd = Object.fromEntries(Object.entries(B.STD).filter(([, v]) => typeof v === "number"));
// parts.js line 59, evaluated with the original's barR and its cPLA slot rho (blocks.js line 57).
const postR = (top) => B.barR(B.SLOTS[B.S.CPLA - 1].rho, Math.max(1, top - B.STD.L1), Math.PI * (B.STD.postD / 2) ** 2) + 400;

const WIRE_CASES = {
  "straight.ctpu": {},
  "straight.cpla": { core: 2 },
  "spiral.200": { shape: "spiral", len: 200 },
  arc: { shape: "arc" },
  "zigzag.bareA": { shape: "zigzag", endA: "bare" },
  "s.cpla": { shape: "s", core: 2 },
  "straight.downUp": { endA: "down", endB: "up" },
};
const wires = {};
for (const [k, v] of Object.entries(WIRE_CASES)) {
  wires[k] = {
    params: v,
    ...both(() => {
      const p = PARTS.make("wire", v);
      const meshes = p.objects.flatMap((o) => o.meshes);
      const R = p.model.elements.find((e) => e.type === "R").R;
      return {
        name: p.name, len: r6(p.len), chord: r6(p.chord), span: p.span, R: r6(R), readout: p.readout, fits: p.fits, warnings: p.warnings,
        ports: p.ports, tris: p.tris, pts: p.pts.map((q) => [r6(q[0]), r6(q[1])]), volumes: measure(meshes),
      };
    }),
  };
}

// ---------- BOSS v1 ----------
const sDir = `${ORIG}boss/files/boss-src/src/`;
const sFiles = ["kernel.js", "boss.js", "parts.js"];
const sBoot = boot(`${ORIG}boss/files/boss.html`, sFiles, sDir);
const K2 = globalThis.K, S2 = globalThis.BOSS;
if (S2 === undefined) throw new Error("boss.js did not define BOSS");
function bossColumn(socket, stud, top) {
  const body = new S2.Body("stud", K2.rrect(0, 0, S2.STD.P, S2.STD.P, 0.6, 3), 0, top);
  S2.column(body, 0, 0, { name: "S", top, socket, stud });
  const built = body.build("stud");
  const meshes = Object.values(built.meshes).filter((m) => m.slot !== S2.S.PETG);
  return {
    volumes: measure(meshes), errors: built.errors, taps: body.taps.map((t) => ({ ...t, x: r6(t.x), y: r6(t.y), z: r6(t.z) })),
    feats: body.feats.concat(body.extra).map((f) => ({ slot: f.slot, z0: f.z0, z1: f.z1, tag: f.tag })),
  };
}
const bossStud = {};
for (const [socket, stud, k] of [[true, true, "both"], [true, false, "down"], [false, true, "up"]]) {
  bossStud[`${k}@${S2.STD.brickH}`] = both(() => bossColumn(socket, stud, S2.STD.brickH));
}
const bossStd = Object.fromEntries(Object.entries(S2.STD).filter(([, v]) => typeof v === "number"));

const record = {
  command: "node packages/archetypes/scripts/blocks-legacy.mjs",
  measuredWith: `manifold-3d ${mfVersion} (union of each slot's recorded prisms)`,
  sources: {
    blocks: Object.fromEntries(bFiles.map((f) => [f, sha(path.join(bDir, f))]).concat([["blocks.html", sha(`${ORIG}blocks/files/blocks.html`)]])),
    boss: Object.fromEntries(sFiles.map((f) => [f, sha(path.join(sDir, f))]).concat([["boss.html", sha(`${ORIG}boss/files/boss.html`)]])),
  },
  libs: { blocks: bBoot.libs, boss: sBoot.libs },
  blocks: {
    std: blocksStd, layer: B.L, fit: B.FIT, shrink: B.SHRINK, slots: B.SLOTS.map((s) => ({ id: s.id, name: s.name, rho: s.rho })),
    postR: { [String(B.STD.brickH)]: r6(postR(B.STD.brickH)), [String(B.STD.plateH)]: r6(postR(B.STD.plateH)) },
    stud: blocksStud, wire: wires,
  },
  boss: { std: bossStd, layer: 0.24, slots: S2.SLOTS.map((s) => ({ id: s.id, name: s.name, rho: s.rho })), stud: bossStud },
};
writeFileSync(OUT, `${JSON.stringify(record, null, 1)}\n`);
process.stdout.write(`wrote ${path.relative(ROOT, OUT)}\n`);
