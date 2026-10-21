// M05-T09 step 5: run TOGGLE's own plan view and route search on its four
// presets and record what the packages/copper search layer is held to, one
// JSON file per preset in packages/copper/test/fixtures/toggle-presets/.
//
// It loads part2a.js to part2d.js of the TOGGLE source of record
// (lineage router/toggle-part2c and toggle.build/part2d, the files under
// fab-knowledge/originals/toggle/files/src/src/) with vm.runInThisContext,
// in the script order of toggle.html. Routing needs no RasterMesh, so
// rastermesh.js, orca3mf.js and part2e.js stay unloaded. Nothing is edited.
//
// Per preset the file holds:
//   plan    the layoutXY fields routeSearch and tryRoute read (part2d.js
//           lines 13 to 116, 170 to 260), and S.print.route;
//   tries   every T.route call routeSearch made, in order, recorded by
//           wrapping T.route: the spec (grid, layers, top, w, clr,
//           obstacles, nets, iters), the keep-in answers inside(x, y, l)
//           over the grid per layer as run lengths, and T.route's result;
//   search  routeSearch's answer (layers, lead, phiA, map, tries) as
//           T.routeAll returned it, less the routed nets already in tries;
//   assignments  T.assignments over the sector centres plus each tried
//           COM gap, the DP output step 1 of the card names.
//
// usage: node tools/legacy/toggle/dump-route.cjs <toggle src/src dir> <out dir>
// exit 0 written, 1 on a refusal (bytes not the TOGGLE of record), 2 on a
// usage error

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");

const [srcArg, outArg] = process.argv.slice(2);
if (!srcArg || !outArg || process.argv.length !== 4) {
  console.error("usage: node tools/legacy/toggle/dump-route.cjs <toggle src/src dir> <out dir>");
  process.exit(2);
}
const SRC = path.resolve(srcArg);
const OUT = path.resolve(outArg);

// The bytes of record, as lineage.json pins them (toggle.lathe/part2a,
// toggle.solver/part2b, router/toggle-part2c, toggle.build/part2d).
const PINNED = {
  "part2a.js": "ceb482f4d9393c24699815453825c5f68f40afc8991da317732c54775f6fa889",
  "part2b.js": "c8acaba6c3ff3acffb63b7496c8398076b1ae4fa4ebbbcecfdd0da57289d6c02",
  "part2c.js": "af62a4f9ddbb90b9bcf1a85e941194aed0d929ea05471abef85fb0888b2aa0ef",
  "part2d.js": "1da486e757df5334a0a920dd40cb54ef1d9780a39ffec7c4c919b3635f951523",
};
const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
for (const [rel, want] of Object.entries(PINNED)) {
  const got = sha256(fs.readFileSync(path.join(SRC, rel)));
  if (got !== want) {
    console.error(`${rel} sha256 ${got}, pinned ${want}: not the TOGGLE of record`);
    process.exit(1);
  }
}
for (const f of Object.keys(PINNED)) vm.runInThisContext(fs.readFileSync(path.join(SRC, f), "utf8"), { filename: path.join(SRC, f) });
const T = vm.runInThisContext("TOGGLE");

// Run lengths of a boolean grid in row order, starting with a run of false.
function runs(W, H, f) {
  const out = [];
  let cur = false, n = 0;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const v = !!f(i, j);
    if (v === cur) n++; else { out.push(n); cur = v; n = 1; }
  }
  out.push(n);
  return out;
}

const tries = [];
const route = T.route;
T.route = function (spec) {
  const res = route.call(this, spec);
  const { g, x0, y0, W, H, layers, top, w, clr, obst, nets, iters } = spec;
  const inside = [];
  for (let l = 0; l < layers; l++) inside.push(runs(W, H, (i, j) => spec.inside(x0 + i * g, y0 + j * g, l)));
  tries.push({ spec: { g, x0, y0, W, H, layers, top, w, clr, obst, nets, iters, viaCost: spec.viaCost === undefined ? null : spec.viaCost }, inside, result: res });
  return res;
};

fs.mkdirSync(OUT, { recursive: true });
for (const key of ["solo4", "solo8", "blocks4", "blocks8"]) {
  tries.length = 0;
  const S = T.preset(key);
  const G = T.layoutXY(S);
  const plan = {
    dirs: G.dirs, blocks: G.blocks, termKind: G.termKind === undefined ? null : G.termKind,
    w: G.w, clr: G.clr, cons: G.cons, rf: G.rf, Re: G.Re, RA: G.RA,
    sectors: G.sectors.map((s) => ({ c: s.c, half: s.half })),
    terms: G.terms.map((t) => ({ x: t.x, y: t.y, r: t.r, label: t.label })),
    bbox: G.bbox, outKind: G.outKind,
    outR: G.outR === undefined ? null : G.outR,
    tab: G.tab === undefined ? null : G.tab,
    outHx: G.outHx === undefined ? null : G.outHx,
    outHy0: G.outHy0 === undefined ? null : G.outHy0,
    outHy1: G.outHy1 === undefined ? null : G.outHy1,
    foot: G.foot === undefined ? null : G.foot,
    route: S.print.route,
  };
  const R = T.routeAll(G, S);
  const centres = G.sectors.map((s) => s.c);
  const okA = [];
  // routeSearch's own gap list (part2d.js lines 222 to 235), so assignments are dumped per gap
  {
    const n = G.dirs;
    const all = [];
    for (let k = 0; k < n; k++) all.push(T.angNorm(2 * Math.PI * (k + 0.5) / n));
    const ok = all.filter((a) => G.blocks || G.termKind === "pads" || G.terms.every((t) => Math.hypot(t.x - G.RA * Math.cos(a), t.y - G.RA * Math.sin(a)) >= t.r + 0.71 + G.clr));
    const tc = G.terms.reduce((s, t) => [s[0] + t.x, s[1] + t.y], [0, 0]);
    const tAng = Math.atan2(tc[1], tc[0]);
    ok.sort((p, q) => T.angDist(p, tAng) - T.angDist(q, tAng));
    if (!ok.length) ok.push(all[0]);
    okA.push(...ok);
  }
  const assignments = okA.map((phiA) => ({ phiA, list: T.assignments(G, centres.concat([phiA])) }));
  const rec = {
    meta: {
      preset: key,
      generator: "node tools/legacy/toggle/dump-route.cjs <toggle src/src dir> packages/copper/test/fixtures/toggle-presets",
      source: "fab-knowledge:originals/toggle/files/src/src/",
      sha256: PINNED,
      node: process.version,
      qualifier: "computed by TOGGLE",
    },
    plan,
    gaps: okA,
    assignments,
    search: { ok: !!R.res, layers: R.layers, lead: R.lead, phiA: R.phiA, map: R.map, tries: R.tries, cached: R.cached === true },
    tries,
  };
  // a second call is the cache hit TOGGLE serves from the same plan view
  const before = tries.length;
  const again = T.routeAll(G, S);
  rec.cacheHit = { cached: again.cached === true, routeCalls: tries.length - before };
  fs.writeFileSync(path.join(OUT, `${key}.json`), JSON.stringify(rec) + "\n");
  console.log(`${key}: layers ${R.layers}, tries ${R.tries}, ok ${!!R.res}, ${rec.tries.length} route calls`);
}
