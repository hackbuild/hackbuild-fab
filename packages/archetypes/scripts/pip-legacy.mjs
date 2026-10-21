// Records the PIP original's numbers and per-slot volumes for the four PIP
// buttons (M06-T08 steps 1 and 6) into test/legacy/pip-fits.json.
//
//   node packages/archetypes/scripts/pip-legacy.mjs <modules>
//
// <modules> is a node_modules directory holding manifold-3d 3.5.3, the
// version the original pins (haft-src/package.json ^3.5.3, the wasm inlined
// in haft (9).html is 3.5.3; RECORD.md 1.1). The script evaluates the
// original files in place, in the order test/load.mjs boots them, from
// originals/pip/files/haft-src/src (the canonical revision, D-222) and from
// originals/pip/files/pip-controller/src (the published copy the card's
// tables were computed from), and runs layout, route and build exactly as
// test/export.mjs run() does. Nothing in the original is edited; the only
// interposition is GEO.flush, held off during a build so the assembled
// solids can be measured, then called for real.

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { localSource } from "../../../tools/test-support/originals-root.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "..", "test", "legacy", "pip-fits.json");
const ORIG = localSource("fab-knowledge:originals/pip/files/");
const SOURCES = {
  haft: `${ORIG}haft-src/src/`,
  pipc: `${ORIG}pip-controller/src/`,
};
const FILES = ["snapfe.js", "geom.js", "font.js", "layout.js", "router.js", "model.js"];
/** Cylinder segments for the parity cylinders; the archetype side builds the same cylinder. */
const CYL_SEGMENTS = 256;

const modules = process.argv[2];
if (modules === undefined) {
  process.stderr.write("usage: node pip-legacy.mjs <node_modules holding manifold-3d 3.5.3>\n");
  process.exit(2);
}
const mfPkg = JSON.parse(readFileSync(path.join(path.resolve(modules), "manifold-3d", "package.json"), "utf8"));
if (mfPkg.version !== "3.5.3") {
  process.stderr.write(`manifold-3d ${mfPkg.version} found; the original pins 3.5.3\n`);
  process.exit(2);
}
const Module = (await import(pathToFileURL(path.join(path.resolve(modules), "manifold-3d", "manifold.js")).href)).default;
const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");

const r6 = (v) => (typeof v === "number" ? Number(v.toFixed(6)) : v);

async function bootFrom(dir, ns) {
  const mf = await Module();
  mf.setup();
  globalThis.MF = mf;
  delete globalThis.HAFT;
  delete globalThis.PIP;
  delete globalThis.SNAPFE;
  for (const f of FILES) (0, eval)(readFileSync(path.join(dir, f), "utf8"));
  const H = globalThis[ns];
  H.GEO.init();
  return { H, mf };
}

/** Volume of a solid inside an upright cylinder, z from z0 up to z1. */
function cylVol(mf, m, x, y, r, z0, z1) {
  const c = mf.Manifold.cylinder(z1 - z0, r, r, CYL_SEGMENTS, false).translate([x, y, z0]);
  const v = m.intersect(c).volume();
  return v;
}

function bbox(m) {
  const b = m.boundingBox();
  return { min: [...b.min].map(r6), max: [...b.max].map(r6) };
}

function variant(H, mf, P, name) {
  const GEO = H.GEO;
  const flush = GEO.flush;
  const meshOf = GEO.meshOf;
  const solids = [];
  GEO.flush = () => {};
  GEO.meshOf = (m) => { const r = meshOf(m); solids.push({ r, m }); return r; };
  const L = H.LAYOUT.layout(P);
  const R = H.ROUTER.route(L);
  const M = H.MODEL.build(P, L, R);
  GEO.meshOf = meshOf;
  const solidOf = (mesh) => solids.find((s) => s.r === mesh)?.m;

  const body = M.objects.find((o) => o.name === "body");
  const z = M.z;
  const cylinders = [];
  for (const b of L.btns) {
    // The cylinder: the button's own footprint. flex, clicky and touch use
    // b.r (the well, the cap well, the boss); the stick's common ring runs
    // to Rw + 3.9, outside its well Rw, so its cylinder is that ring.
    const r = b.type === "stick" ? L.stick.Rw + 3.9 : b.r;
    const zTop = z.bezelTop + 40;
    const row = { id: b.id, type: b.type, x: b.x, y: b.y, r: r6(r), segments: CYL_SEGMENTS, z: [r6(z.pad[0]), r6(zTop)], slots: {}, slotsFull: {} };
    for (const p of body.asm) {
      if (p.slot === 1) continue;
      const m = solidOf(p.mesh);
      row.slots[p.slot] = r6(cylVol(mf, m, b.x, b.y, r, z.pad[0], zTop));
      row.slotsFull[p.slot] = r6(cylVol(mf, m, b.x, b.y, r, -1, zTop));
    }
    for (const s of [2, 3, 4]) {
      if (row.slots[s] === undefined) { row.slots[s] = 0; row.slotsFull[s] = 0; }
    }
    cylinders.push(row);
  }
  const loose = M.objects.filter((o) => o.name !== "body" && o.name !== "bezel").map((o) => ({
    name: o.name, count: o.count,
    parts: o.print.map((p) => {
      const m = solidOf(p.mesh);
      return { name: p.name, slot: p.slot, vol: r6(p.vol), bbox: m === undefined ? null : bbox(m) };
    }),
  }));
  const fe = L.click ? L.click.fe : null;
  const out = {
    name,
    params: { bleed: P.route.bleed ?? 0, left: P.groups.left.kind ?? "dpad" },
    z: Object.fromEntries(Object.entries(z).map(([k, v]) => [k, Array.isArray(v) ? v.map(r6) : r6(v)])),
    btns: L.btns.map((b) => ({ id: b.id, group: b.group, type: b.type, x: r6(b.x), y: r6(b.y), ang: r6(b.ang ?? null), r: r6(b.r), bezR: r6(b.bezR), termOff: r6(b.termOff ?? null) })),
    flexDims: L.flex ? Object.fromEntries(Object.entries(L.flex).map(([k, v]) => [k, r6(v)])) : null,
    click: L.click ? Object.fromEntries(Object.entries(L.click).filter(([k]) => k !== "fe").map(([k, v]) => [k, r6(v)])) : null,
    stick: L.stick ? Object.fromEntries(Object.entries(L.stick).map(([k, v]) => [k, Array.isArray(v) ? v.map(r6) : typeof v === "boolean" ? v : r6(v)])) : null,
    fe: fe === null ? null : {
      peak: r6(fe.peak), valley: r6(fe.valley), drop: r6(fe.drop), dPeak: r6(fe.dPeak), dValley: r6(fe.dValley),
      bistable: fe.bistable, snap: fe.snap, ok: fe.ok,
      pts: fe.pts.map((p) => ({ d: r6(p.d), F: r6(p.F), e: r6(p.e) })),
    },
    fits: M.fits.map((f) => ({ group: f.group, name: f.name, value: f.value, ok: f.ok, note: f.note })),
    mech: Object.fromEntries(Object.entries(M.mech).map(([k, v]) => [k, Object.fromEntries(Object.entries(v).filter(([kk]) => kk !== "curve").map(([kk, vv]) => [kk, Array.isArray(vv) ? vv.map(r6) : typeof vv === "boolean" ? vv : r6(vv)]))])),
    elec: M.elec.rows.map((r) => ({ id: r.id, pin: r.pin, type: r.type, len: r6(r.len), R: r6(r.R), Rsw: r6(r.Rsw), C: r6(r.C), read: Object.fromEntries(Object.entries(r.read).map(([k, v]) => [k, typeof v === "boolean" ? v : r6(v)])) })),
    btnInfo: M.btnInfo.map((b) => Object.fromEntries(Object.entries(b).map(([k, v]) => [k, typeof v === "number" ? r6(v) : v]))),
    unrouted: R.unrouted, conflicts: R.conflicts,
    warn: M.warn,
    cylinders,
    loose,
  };
  GEO.flush = flush;
  GEO.flush([]);
  return out;
}

const record = {
  how: "node packages/archetypes/scripts/pip-legacy.mjs <modules>, manifold-3d 3.5.3, node " + process.version,
  sources: {},
  variants: {},
};
for (const [key, dir] of Object.entries(SOURCES)) {
  record.sources[key] = Object.fromEntries(FILES.map((f) => [f, sha(path.join(dir, f))]));
  const { H, mf } = await bootFrom(dir, key === "haft" ? "HAFT" : "PIP");
  const runs = [
    ["defaults", (P) => P],
    ["bleed0", (P) => { P.route.bleed = 0; return P; }],
    ["stick", (P) => { P.groups.left.kind = "stick"; return P; }],
    ["stickBleed0", (P) => { P.groups.left.kind = "stick"; P.route.bleed = 0; return P; }],
    // gapPct 20 puts 20 percent of Hs 4.0 (0.8 mm) under flexDims' 1.2 mm floor (layout.js line 154).
    ["flexGapFloorBleed0", (P) => { P.flex.gapPct = 20; P.route.bleed = 0; return P; }],
  ];
  for (const [name, edit] of runs) {
    if (key === "pipc" && name.endsWith("Bleed0")) continue;
    if (key === "pipc" && name === "bleed0") continue;
    const P = edit(H.LAYOUT.defaults());
    record.variants[`${key}.${name}`] = variant(H, mf, P, name);
    process.stdout.write(`${key}.${name}: ${record.variants[`${key}.${name}`].fits.length} fit rows\n`);
  }
}
writeFileSync(OUT, `${JSON.stringify(record, null, 1)}\n`);
process.stdout.write(`wrote ${path.relative(process.cwd(), OUT)}\n`);
