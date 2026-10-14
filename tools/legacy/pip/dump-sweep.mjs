// M05-T10 step 6: PIP's own verdicts on its seed 1 sweep, as PIP b137deb
// computes them, for the net-sweep property test to hold the copper
// pipeline and CHK-NET-12 and CHK-NET-02 against. For the default layout
// and each of the 40 designs test/sweep.mjs draws at seed 1 (lines 5 to
// 26), it runs PIP's layout, router and full model (test/export.mjs run(),
// src/model.js build) and records what PIP reports: the route counts, the
// model's net check (parts per net, the least net to net gap and the eight
// closest pairs, model.js lines 207 to 224 and 435 to 436), the 'net to
// net, measured' fits row with PIP's own pass at 0.4 mm (line 451), and
// which of the model warnings fired: the clearance line fires only under
// 0.3 mm (line 224). PIP's model gaps include its button floor pads and contacts,
// which no hackbuild-fab build here makes, so the test reads them as PIP's
// verdicts, never as the copper stack's.
//
// It runs inside the same scratch checkout as dump-route.mjs (b137deb,
// its own npm ci, manifold-3d 3.5.3 from its lock); hackbuild-fab CI reads
// the committed files. Nothing in the checkout is written.
//
// usage: node tools/legacy/pip/dump-sweep.mjs <pip-controller checkout> [out dir]
// writes <out dir>/default.json and <out dir>/design-00.json to design-39.json,
// default out dir packages/copper/test/fixtures/pip-sweep-seed1
// exit 0 written, 1 on a refusal (wrong commit, wrong manifold, src drift)

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const COMMIT = "b137deb518229ea8910bfe85e6416d34cee353f3";
const MANIFOLD = "3.5.3";
const repo = fileURLToPath(new URL("../../../", import.meta.url));
const legacy = join(repo, "designs/pip/legacy");

const [checkoutArg, outArg] = process.argv.slice(2);
if (!checkoutArg) {
  process.stderr.write("usage: node tools/legacy/pip/dump-sweep.mjs <pip-controller checkout> [out dir]\n");
  process.exit(1);
}
const checkout = resolve(checkoutArg);
const outDir = resolve(outArg ?? join(repo, "packages/copper/test/fixtures/pip-sweep-seed1"));
const refuse = (msg) => { process.stderr.write(`dump-sweep: ${msg}\n`); process.exit(1); };

const head = execFileSync("git", ["-C", checkout, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
if (head !== COMMIT) refuse(`checkout is at ${head}, expected ${COMMIT}`);
const mf = JSON.parse(readFileSync(join(checkout, "node_modules/manifold-3d/package.json"), "utf8")).version;
if (mf !== MANIFOLD) refuse(`manifold-3d ${mf} in the checkout, expected ${MANIFOLD} from its lock; run npm ci there`);
for (const line of readFileSync(join(legacy, "SHA256SUMS"), "utf8").trim().split("\n")) {
  const [want, rel] = line.split(/\s+/);
  const got = createHash("sha256").update(readFileSync(join(checkout, rel))).digest("hex");
  if (got !== want) refuse(`${rel} in the checkout is ${got}, designs/pip/legacy/SHA256SUMS has ${want}`);
}

const { setup, run } = await import(pathToFileURL(join(checkout, "test/export.mjs")).href);
const H = await setup();
const meta = {
  generator: "node tools/legacy/pip/dump-sweep.mjs <pip-controller checkout at b137deb>",
  source: "hackbuild/pip-controller",
  commit: COMMIT,
  manifold: MANIFOLD,
  node: process.version,
  qualifier: "computed by PIP b137deb",
};

/** What PIP reports for one design: route counts, the model's net check, the fits row and the warnings. */
function record(P) {
  const { R, M } = run(H, P);
  const row = M.fits.find((f) => f.group === "traces" && f.name === "net to net, measured");
  return {
    route: { conflicts: R.conflicts, unrouted: R.unrouted, iters: R.iters, w: P.route.w },
    elec: { minGap: M.elec.minGap, pairs: M.elec.pairs, nets: M.elec.nets.map((n) => ({ name: n.name, parts: n.parts })) },
    fitsNetToNet: row === undefined ? null : { value: row.value, ok: row.ok },
    // PIP's warnings as flags: its clearance line fires under 0.3 mm (model.js line 224) and its
    // net check names split nets; the counts behind them are in elec.nets and route.
    warns: { clearance: M.warn.some((w) => w.startsWith("clearance under 0.3 mm")), splitNets: M.warn.filter((w) => / is in \d+ pieces$/.test(w)).length, total: M.warn.length },
    z: { l1: M.z.l1, l2: M.z.l2, pad: M.z.pad, floor: M.z.floor },
  };
}

mkdirSync(outDir, { recursive: true });
const t0 = Date.now();
const def = record(H.LAYOUT.defaults());
writeFileSync(join(outDir, "default.json"), JSON.stringify({ meta: { ...meta, layout: "H.LAYOUT.defaults(), test/export.mjs run()" }, ...def }) + "\n");

// test/sweep.mjs lines 5 to 26 at b137deb: the same Park-Miller draws in the same order.
const SEED = 1, COUNT = 40;
let seed = SEED;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const uni = (a, b, q) => { const v = a + (b - a) * rnd(); return q ? Math.round(v / q) * q : v; };
let clean = 0;
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
  let rec;
  try { rec = { i, ...record(P) }; } catch (e) { rec = { i, error: String(e && e.message) }; }
  if (rec.route && rec.route.conflicts === 0 && rec.route.unrouted === 0) clean++;
  writeFileSync(join(outDir, `design-${String(i).padStart(2, "0")}.json`), JSON.stringify({ meta: { ...meta, layout: `test/sweep.mjs parameter draws at seed ${SEED}, design ${i}, test/export.mjs run()` }, ...rec }) + "\n");
}
process.stdout.write(`dump-sweep: default minGap ${def.elec.minGap}, sweep seed ${SEED}: ${COUNT} designs, ${clean} route clean, ${((Date.now() - t0) / 1000).toFixed(0)} s -> ${outDir}\n`);
