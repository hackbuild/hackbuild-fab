// Records the PIP original's numbers and per-slot volumes for the
// RP2040-Zero seat (pip.md 5.7, model.js lines 180 to 248) and the buried
// trace stack (pip.md 5.5, model.js lines 26 to 51) into
// test/legacy/pip-seat.json (M06-T09).
//
//   node packages/archetypes/scripts/pip-seat-legacy.mjs <modules>
//
// <modules> is a node_modules directory holding manifold-3d 3.5.3, the
// version the original pins. The original files are evaluated in place, in
// the order test/load.mjs boots them, and run as test/export.mjs run()
// does; nothing in them is edited. GEO.flush is held off during a build so
// the assembled solids can be measured, then called for real.
//
// Seat volumes are read inside two boxes about the board pocket, chosen to
// lie inside PIP's stadium outline and clear of every other PIP feature:
// box A runs from 2 mm outside the pocket to y 27.0 (inside the bezel lip
// groove, model.js line 255) for the full body height above the trace
// layers; box B covers the cable end from y 27.0 to the outline's flat top
// edge and stops under the groove floor. Each box's envelope check (the
// stadium solid inside the box equals the box) is recorded with it.
// Stack volumes are the conductive slot below the pad layer, where only the
// routed trace layers, vias and posts live.

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "..", "test", "legacy", "pip-seat.json");
const ORIG = "/Users/obsidian/Projects/hackbuild/fab-knowledge/originals/pip/files/";
const SOURCES = { haft: `${ORIG}haft-src/src/`, pipc: `${ORIG}pip-controller/src/` };
const FILES = ["snapfe.js", "geom.js", "font.js", "layout.js", "router.js", "model.js"];

const modules = process.argv[2];
if (modules === undefined) {
  process.stderr.write("usage: node pip-seat-legacy.mjs <node_modules holding manifold-3d 3.5.3>\n");
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
const r6o = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Array.isArray(v) ? v.map(r6) : r6(v)]));

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

function boxVol(mf, m, b) {
  const c = mf.Manifold.cube([b.x[1] - b.x[0], b.y[1] - b.y[0], b.z[1] - b.z[0]], false).translate([b.x[0], b.y[0], b.z[0]]);
  return m.intersect(c).volume();
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
  const z = M.z, pk = L.pocketRect, bd = L.board, B = P.board, BZ = P.bezel;
  const halfH = P.shape.H / 2;
  // The groove's inner wall on the flat top edge, less 0.1 (model.js lines 252 to 255).
  const yGroove = r6(halfH - BZ.lipInset - BZ.lipT - BZ.lipFit / 2 - 0.1);
  const outlineCS = H.LAYOUT.outline(P);
  const env = GEO.ext(outlineCS, -1, z.top);
  const yTopEdge = env.boundingBox().max[1];
  const zLow = r6(z.floor - 0.6);
  const boxes = {
    A: { x: [r6(pk.x0 - 2), r6(pk.x1 + 2)], y: [r6(pk.y0 - 2), yGroove], z: [zLow, r6(z.top)] },
    B: { x: [r6(pk.x0 - 2), r6(pk.x1 + 2)], y: [yGroove, r6(yTopEdge - 1e-6)], z: [zLow, r6(z.top - BZ.lipD - 0.3 - 0.05)] },
  };
  // pip-controller b137deb has no bezel lip, so no groove bounds the boxes: its seat is not recorded.
  const seat = Number.isFinite(yGroove) ? {} : null;
  for (const [k, b] of seat === null ? [] : Object.entries(boxes)) {
    const full = (b.x[1] - b.x[0]) * (b.y[1] - b.y[0]) * (b.z[1] - b.z[0]);
    const row = { box: b, envelope: r6(boxVol(mf, env, b)), boxVolume: r6(full), slots: {} };
    for (const p of body.asm) row.slots[p.slot] = r6((row.slots[p.slot] ?? 0) + boxVol(mf, solidOf(p.mesh), b));
    for (const s of [1, 2, 3, 4]) row.slots[s] ??= 0;
    seat[k] = row;
  }
  // The stack: everything conductive below the pad layer.
  const bb = env.boundingBox();
  const stackBox = { x: [r6(bb.min[0] - 1), r6(bb.max[0] + 1)], y: [r6(bb.min[1] - 1), r6(bb.max[1] + 1)], z: [-1, r6(z.pad[0])] };
  const stack = { box: stackBox, slots: {} };
  for (const p of body.asm) stack.slots[p.slot] = r6((stack.slots[p.slot] ?? 0) + boxVol(mf, solidOf(p.mesh), stackBox));
  const out = {
    name,
    params: { bleed: P.route.bleed ?? 0, left: P.groups.left.kind ?? "dpad", contact: B.contact, mode: B.mode },
    board: r6o(B),
    z: Object.fromEntries(Object.entries(z).map(([k, v]) => [k, Array.isArray(v) ? v.map(r6) : r6(v)])),
    stand: r6(L.stand),
    boardRect: r6o(bd),
    pocketRect: r6o(pk),
    halfH, yTopEdge: r6(yTopEdge),
    pads: L.pads.map((p) => ({ name: p.name, x: r6(p.x), y: r6(p.y), edge: p.edge, num: p.num })),
    bumps: L.bumps.map((b) => ({ net: b.net, pad: b.pad.name, x: r6(b.x), y: r6(b.y) })),
    usedPins: [...L.usedPins.entries()],
    fits: M.fits.map((f) => ({ group: f.group, name: f.name, value: f.value, ok: f.ok, note: f.note })),
    elec: { minGap: r6(M.elec.minGap), pairs: M.elec.pairs.map((p) => ({ a: p.a, b: p.b, g: r6(p.g) })), nets: M.elec.nets.map((n) => ({ name: n.name, parts: n.parts, vol: r6(n.vol) })) },
    unrouted: R.unrouted, conflicts: R.conflicts,
    warn: M.warn,
    seat,
    stack,
  };
  GEO.flush = flush;
  GEO.flush([]);
  return out;
}

const record = {
  how: "node packages/archetypes/scripts/pip-seat-legacy.mjs <modules>, manifold-3d 3.5.3, node " + process.version,
  sources: {},
  variants: {},
};
for (const [key, dir] of Object.entries(SOURCES)) {
  record.sources[key] = Object.fromEntries(FILES.map((f) => [f, sha(path.join(dir, f))]));
  const { H, mf } = await bootFrom(dir, key === "haft" ? "HAFT" : "PIP");
  const runs = key === "haft"
    ? [
      ["defaults", (P) => P],
      ["bleed0", (P) => { P.route.bleed = 0; return P; }],
      ["stickBleed0", (P) => { P.groups.left.kind = "stick"; P.route.bleed = 0; return P; }],
      ["socketBleed0", (P) => { P.board.contact = "socket"; P.route.bleed = 0; return P; }],
      ["socket", (P) => { P.board.contact = "socket"; return P; }],
    ]
    : [["defaults", (P) => P]];
  for (const [name, edit] of runs) {
    const P = edit(H.LAYOUT.defaults());
    record.variants[`${key}.${name}`] = variant(H, mf, P, name);
    const v = record.variants[`${key}.${name}`];
    process.stdout.write(`${key}.${name}: ${v.fits.filter((f) => f.group === "board").length} board rows, top ${v.z.top}, seat A cPLA ${v.seat?.A.slots[2] ?? "not recorded"}\n`);
  }
}
writeFileSync(OUT, `${JSON.stringify(record, null, 1)}\n`);
process.stdout.write(`wrote ${path.relative(process.cwd(), OUT)}\n`);
