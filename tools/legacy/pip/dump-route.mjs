// M05-T08 step 3: run PIP's own layout and router at b137deb and record the
// route input and output the packages/copper port is held to, in
// packages/copper/test/fixtures/pip-b137deb-route.json. It runs inside a
// scratch checkout of hackbuild/pip-controller at b137deb after that
// checkout's own `npm ci` (manifold-3d 3.5.3 from its lock); hackbuild-fab
// CI never runs it and reads the committed fixture. Nothing in the checkout
// is written (D-013, D-080).
//
// The checkout's src/ must equal designs/pip/legacy/SHA256SUMS, so the
// fixture comes from the bytes vendored here. The keep-in samples are the
// L.inside(x, y, margin) answers the router asked for, recorded in call
// order by wrapping L.inside, so the fixture holds what router.js lines 48
// to 51 saw and not a second implementation of it.
//
// A second file, packages/copper/test/fixtures/pip-b137deb-sweep-route.json,
// holds the same record for the 40 designs of PIP's own sweep at seed 1
// (test/sweep.mjs lines 5 to 26, its Park-Miller draws in its order). The
// default layout routes in two iterations with no vias and few turns, so
// it cannot tell a turn or via cost apart; the sweep layouts negotiate
// longer, leave conflicts and unrouted terminals and use vias.
//
// usage: node tools/legacy/pip/dump-route.mjs <pip-controller checkout> [out.json [sweep.json]]
// exit 0 written, 1 on a refusal (wrong commit, wrong manifold, src drift)

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const COMMIT = "b137deb518229ea8910bfe85e6416d34cee353f3";
const MANIFOLD = "3.5.3";
const repo = fileURLToPath(new URL("../../../", import.meta.url));
const legacy = join(repo, "designs/pip/legacy");

const [checkoutArg, outArg] = process.argv.slice(2);
if (!checkoutArg) {
  process.stderr.write("usage: node tools/legacy/pip/dump-route.mjs <pip-controller checkout> [out.json]\n");
  process.exit(1);
}
const checkout = resolve(checkoutArg);
const out = resolve(outArg ?? join(repo, "packages/copper/test/fixtures/pip-b137deb-route.json"));
const refuse = (msg) => { process.stderr.write(`dump-route: ${msg}\n`); process.exit(1); };

const head = execFileSync("git", ["-C", checkout, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
if (head !== COMMIT) refuse(`checkout is at ${head}, expected ${COMMIT}`);
const mf = JSON.parse(readFileSync(join(checkout, "node_modules/manifold-3d/package.json"), "utf8")).version;
if (mf !== MANIFOLD) refuse(`manifold-3d ${mf} in the checkout, expected ${MANIFOLD} from its lock; run npm ci there`);
for (const line of readFileSync(join(legacy, "SHA256SUMS"), "utf8").trim().split("\n")) {
  const [want, rel] = line.split(/\s+/);
  const got = createHash("sha256").update(readFileSync(join(checkout, rel))).digest("hex");
  if (got !== want) refuse(`${rel} in the checkout is ${got}, designs/pip/legacy/SHA256SUMS has ${want}`);
}

const { boot } = await import(pathToFileURL(join(checkout, "test/load.mjs")).href);
const H = await boot();
// One layout and route, recorded: the route input as PIP hands it to its
// router and the router's output less its wall time.
function record(P) {
  const L = H.LAYOUT.layout(P);
  const samples = [];
  let first = null;
  const inside = L.inside;
  L.inside = (x, y, m) => {
    const v = inside(x, y, m);
    if (first === null) first = { x, y, margin: m };
    samples.push(v ? 1 : 0);
    return v;
  };
  const R = H.ROUTER.route(L);
  L.inside = inside;
  // Run lengths over the samples in call order (j outer, i inner), starting
  // with a run of outside cells, which may be empty.
  const runs = [];
  let cur = 0, n = 0;
  for (const s of samples) {
    if (s === cur) { n++; continue; }
    runs.push(n); cur = s; n = 1;
  }
  runs.push(n);
  return {
    input: {
      route: P.route,
      outline: L.outlinePolys,
      nets: L.nets.map((net) => ({ name: net.name, terms: net.terms.map((t) => ({ x: t.x, y: t.y, r: t.r, what: t.what })) })),
      keepIn: { first, count: samples.length, runs },
    },
    output: {
      nets: R.nets.map((net) => ({ name: net.name, polys: net.polys, stubs: net.stubs, vias: net.vias, fails: net.fails, len: net.len })),
      conflicts: R.conflicts,
      hot: R.hot,
      unrouted: R.unrouted,
      iters: R.iters,
      grid: R.grid,
    },
  };
}

const meta = {
  generator: "node tools/legacy/pip/dump-route.mjs <pip-controller checkout at b137deb>",
  source: "hackbuild/pip-controller",
  commit: COMMIT,
  manifold: MANIFOLD,
  node: process.version,
  qualifier: "computed by PIP b137deb",
};
const one = record(H.LAYOUT.defaults());
writeFileSync(out, JSON.stringify({ meta: { ...meta, layout: "H.LAYOUT.layout(H.LAYOUT.defaults()) then H.ROUTER.route(L), test/load.mjs boot" }, ...one }) + "\n");
process.stdout.write(`dump-route: ${one.output.nets.length} nets, conflicts ${one.output.conflicts}, unrouted ${one.output.unrouted}, iters ${one.output.iters}, grid ${one.output.grid.nx} x ${one.output.grid.ny}, ${one.input.keepIn.count} keep-in samples -> ${out}\n`);

// test/sweep.mjs lines 5 to 26 at b137deb, the parameter draws only; the
// model build and mesh checks that follow them draw nothing.
const SEED = 1, COUNT = 40;
let seed = SEED;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const uni = (a, b, q) => { const v = a + (b - a) * rnd(); return q ? Math.round(v / q) * q : v; };
const cases = [];
for (let i = 0; i < COUNT; i++) {
  const P = H.LAYOUT.defaults();
  P.shape.style = pick(['stadium', 'slab', 'grips']);
  P.shape.W = uni(140, 190, 1); P.shape.H = uni(60, 80, 1);
  for (const [k, g] of Object.entries(P.groups)) { g.on = rnd() < (k === 'shoulder' ? 0.3 : 0.85); g.type = pick(['flex', 'clicky', 'touch']); }
  P.groups.left.kind = pick(['dpad', 'stick']);
  P.groups.left.x = -P.shape.W / 2 + uni(26, 34, 0.5); P.groups.face.x = P.shape.W / 2 - uni(26, 34, 0.5);
  P.groups.left.pitch = uni(14, 18, 0.5); P.groups.face.pitch = uni(15, 19, 0.5);
  P.board.mode = pick(['press', 'wire', 'both']);
  P.flex.Hs = uni(3, 5, 0.24); P.flex.face = uni(8, 12, 0.2); P.flex.hole = uni(3, 4.4, 0.1);
  P.clicky.l = uni(20, 24, 0.5); P.clicky.Q = uni(1.9, 2.2, 0.05); P.clicky.cap = uni(9, 11, 0.5);
  P.touch.d = uni(10, 14, 0.5);
  P.stick.tilt = uni(12, 18, 0.5); P.stick.bandR = uni(4.2, 5.6, 0.1);
  P.route.w = uni(1.2, 1.8, 0.05);
  P.bezel.mark = rnd() < 0.7; P.bezel.labels = rnd() < 0.8;
  try { cases.push({ i, ...record(P) }); } catch (e) { cases.push({ i, error: String(e && e.message) }); }
}
const sweepOut = resolve(process.argv[4] ?? join(repo, "packages/copper/test/fixtures/pip-b137deb-sweep-route.json"));
writeFileSync(sweepOut, JSON.stringify({ meta: { ...meta, layout: `test/sweep.mjs parameter draws at seed ${SEED}, ${COUNT} designs, each H.LAYOUT.layout(P) then H.ROUTER.route(L)` }, cases }) + "\n");
const ok = cases.filter((c) => c.output);
process.stdout.write(`dump-route: sweep seed ${SEED}, ${cases.length} designs, ${cases.length - ok.length} layout throws, ${ok.filter((c) => c.output.conflicts || c.output.unrouted).length} with conflicts or unrouted, ${ok.filter((c) => c.output.nets.some((n) => n.vias.length)).length} with vias -> ${sweepOut}\n`);
