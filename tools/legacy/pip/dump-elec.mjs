// M05-T11 step 1: PIP's drive readouts at b137deb, per key, as PIP's own
// model computes them, for packages/circuit/test/fixtures/pip-b137deb-elec.json.
// For the default layout it runs PIP's layout, router and model
// (test/load.mjs boot, then src/model.js build) and records, per key: the
// trace length with stubs, the via count, every post PIP prices (height,
// radius, how many), the switch resistance Rsw, the common path (GND or
// 3V3), the node capacitance and the bench row (R, tau, settle, reject).
//
// It runs inside the same scratch checkout as dump-route.mjs (b137deb,
// its own npm ci, manifold-3d 3.5.3 from its lock); hackbuild-fab CI reads
// the committed fixture. Nothing in the checkout is written.
//
// How the posts are read. The readout lines (src/model.js lines 381 to 438)
// keep their inputs in locals, so model.js is evaluated from the vendored
// bytes with four lines wrapped in memory, each one found exactly once and
// its value left unchanged:
//   line 393  Rpost records each (h, r) it is called with,
//   line 396  the GND common's posts and the stack heights are recorded,
//   line 399  each key starts a fresh list of posts,
//   line 430  each key's Rn, extra, Rsw, common and total are recorded.
// Rpost(h, r) is called in source order per key: the terminal posts (line
// 401), the via posts (line 401, evaluated even at 0 vias), the switch
// posts of `extra` (lines 403 to 413), then for touch the 3V3 common's posts
// (line 415). The dump refuses unless each recorded total equals the sum it
// rebuilds from those posts, Rtrace and Rsw within 1e-12 relative, so the
// fixture holds what PIP's lines computed and not a second reading of them.
//
// usage: node tools/legacy/pip/dump-elec.mjs <pip-controller checkout> [out.json]
// exit 0 written, 1 on a refusal (wrong commit, wrong manifold, src drift, a patch line missing, a total that does not rebuild)

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
  process.stderr.write("usage: node tools/legacy/pip/dump-elec.mjs <pip-controller checkout> [out.json]\n");
  process.exit(1);
}
const checkout = resolve(checkoutArg);
const out = resolve(outArg ?? join(repo, "packages/circuit/test/fixtures/pip-b137deb-elec.json"));
const refuse = (msg) => { process.stderr.write(`dump-elec: ${msg}\n`); process.exit(1); };

const head = execFileSync("git", ["-C", checkout, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
if (head !== COMMIT) refuse(`checkout is at ${head}, expected ${COMMIT}`);
const mf = JSON.parse(readFileSync(join(checkout, "node_modules/manifold-3d/package.json"), "utf8")).version;
if (mf !== MANIFOLD) refuse(`manifold-3d ${mf} in the checkout, expected ${MANIFOLD} from its lock; run npm ci there`);
for (const line of readFileSync(join(legacy, "SHA256SUMS"), "utf8").trim().split("\n")) {
  const [want, rel] = line.split(/\s+/);
  const got = createHash("sha256").update(readFileSync(join(checkout, rel))).digest("hex");
  if (got !== want) refuse(`${rel} in the checkout is ${got}, designs/pip/legacy/SHA256SUMS has ${want}`);
}

// The four wrapped lines: [model.js line, exact text, replacement]. Each replacement keeps the line's value.
const CAP = "globalThis.__hbfElec";
const PATCHES = [
  [393, "    const Rpost = (h, r) => rhoZ * h * 1e-3 / (Math.PI * (r * 1e-3) ** 2);",
    `    const Rpost = (h, r) => (${CAP}.posts.push([h, r]), rhoZ * h * 1e-3 / (Math.PI * (r * 1e-3) ** 2));`],
  [396, "    const rows = [];",
    `    const rows = []; ${CAP}.gnd = { posts: ${CAP}.posts.splice(0), ohm: gndR, lenMm: netLen.get('GND') || 0 }; ${CAP}.stack = { hPost, viaH: z.l2[1] - z.l1[0], l1: z.l1, l2: z.l2, floor: z.floor, w: Rt.w, trace: P.stack.trace, post: Rt.post, via: Rt.via, rho, rhoZ, rhoT, Atr };`],
  [399, "      for (const id of ids) {",
    `      for (const id of ids) { ${CAP}.posts.length = 0;`],
  [430, "        rows.push({ id, pin, type: bi.type, len: netLen.get(id) || 0, R: total, Rsw, C: Cpf, read });",
    `        ${CAP}.keys.push({ id, Rn, extra, Rsw, common, total, posts: ${CAP}.posts.splice(0) }); rows.push({ id, pin, type: bi.type, len: netLen.get(id) || 0, R: total, Rsw, C: Cpf, read });`],
];
const modelLines = readFileSync(join(checkout, "src/model.js"), "utf8").split("\n");
for (const [n, text, repl] of PATCHES) {
  if (modelLines[n - 1] !== text) refuse(`src/model.js line ${n} is not ${JSON.stringify(text)}`);
  if (modelLines.filter((l) => l === text).length !== 1) refuse(`src/model.js holds ${JSON.stringify(text)} more than once`);
  modelLines[n - 1] = repl;
}

const { boot } = await import(pathToFileURL(join(checkout, "test/load.mjs")).href);
const H = await boot();
globalThis.__hbfElec = { posts: [], keys: [] };
(0, eval)(modelLines.join("\n"));
const P = H.LAYOUT.defaults();
const L = H.LAYOUT.layout(P);
const R = H.ROUTER.route(L);
const M = H.MODEL.build(P, L, R);
const cap = globalThis.__hbfElec;
const S = cap.stack;

const hyp = (s) => Math.hypot(s[1][0] - s[0][0], s[1][1] - s[0][1]);
// model.js lines 384 to 392, as written there; used only to check that the recorded posts rebuild PIP's totals.
const Rtrace = (lenMm) => lenMm * 1e-3 * S.rho / S.Atr;
const Rpost = ([h, r]) => S.rhoZ * h * 1e-3 / (Math.PI * (r * 1e-3) ** 2);
const near = (a, b, what) => { if (!(Math.abs(a - b) <= 1e-12 * Math.max(1, Math.abs(b)))) refuse(`${what}: rebuilt ${a}, PIP ${b}`); };

const netLen = (name) => {
  const n = R.nets.find((x) => x.name === name);
  return n === undefined ? 0 : n.len + n.stubs.reduce((a, s) => a + hyp(s), 0);
};
const post = (what, [h, r], count) => ({ what, hMm: h, rMm: r, count });

if (cap.gnd.posts.length !== 1) refuse(`the GND common priced ${cap.gnd.posts.length} posts, expected 1 call (model.js line 395)`);
const commons = {
  GND: { net: "GND", lenMm: cap.gnd.lenMm, posts: [post("terminal", cap.gnd.posts[0], 2)], ohm: cap.gnd.ohm },
};
near(Rtrace(commons.GND.lenMm) + 2 * Rpost(cap.gnd.posts[0]), cap.gnd.ohm, "GND common");

const keys = M.elec.rows.map((row, i) => {
  const k = cap.keys[i];
  if (k === undefined || k.id !== row.id) refuse(`row ${i} ${row.id} has no recorded key`);
  const n = R.nets.find((x) => x.name === row.id);
  const vias = n === undefined ? 0 : n.vias.length;
  const touch = row.type === "touch";
  const calls = k.posts;
  // terminal posts, via posts, the switch posts, then for touch the 3V3 common's terminal posts
  const sw = calls.slice(2, touch ? calls.length - 1 : calls.length);
  if (calls.length < 2 || (touch && calls.length < 3)) refuse(`${row.id}: ${calls.length} Rpost calls`);
  // flex and clicky price their switch post pair twice over one call (lines 403, 406); touch once (line 413); stick two calls once each (line 410)
  const each = sw.length === 1 ? Math.round(k.extra / Rpost(sw[0])) : 1;
  const switchPosts = sw.map((c) => post("switch", c, each));
  const posts = [post("terminal", calls[0], 2), post("via", calls[1], vias), ...switchPosts];
  near(posts.slice(0, 2).reduce((a, p) => a + p.count * Rpost([p.hMm, p.rMm]), Rtrace(row.len)), k.Rn, `${row.id} Rn`);
  near(switchPosts.reduce((a, p) => a + p.count * Rpost([p.hMm, p.rMm]), 0), k.extra, `${row.id} extra`);
  const common = touch ? "3V3" : "GND";
  if (touch) {
    const c = { net: "3V3", lenMm: netLen("3V3"), posts: [post("terminal", calls[calls.length - 1], 2)], ohm: k.common };
    near(Rtrace(c.lenMm) + 2 * Rpost(calls[calls.length - 1]), k.common, `${row.id} 3V3 common`);
    commons["3V3"] = c;
  } else {
    near(k.common, commons.GND.ohm, `${row.id} GND common`);
  }
  near(k.Rn + k.extra + k.Rsw + k.common, k.total, `${row.id} total`);
  near(row.len, netLen(row.id), `${row.id} length`);
  return {
    id: row.id, pin: row.pin, type: row.type, net: row.id,
    lenMm: row.len, routeLenMm: n === undefined ? 0 : n.len, vias,
    posts, RswOhm: k.Rsw, common,
    parts: { RnOhm: k.Rn, extraOhm: k.extra, commonOhm: k.common },
    bench: {
      R: row.R, C: row.C, tauUs: row.read.tauMs * 1e3, waitUs: row.read.wait * 1e3, ok: row.read.ok, rejectOhm: row.read.reject,
      ...(touch ? { settle: row.read.settle } : {}),
    },
  };
});

const fixture = {
  meta: {
    generator: "node tools/legacy/pip/dump-elec.mjs <pip-controller checkout at b137deb>",
    source: "hackbuild/pip-controller",
    commit: COMMIT,
    manifold: MANIFOLD,
    node: process.version,
    qualifier: "computed by PIP b137deb",
    layout: "H.LAYOUT.layout(H.LAYOUT.defaults()), H.ROUTER.route(L), H.MODEL.build(P, L, R); src/model.js lines 393, 396, 399 and 430 wrapped in memory to record their locals",
  },
  phys: P.phys,
  route: { w: P.route.w, post: P.route.post, via: P.route.via },
  stack: { trace: S.trace, l1: S.l1, l2: S.l2, floor: S.floor, hPost: S.hPost, viaH: S.viaH },
  nets: R.nets.map((n) => ({ name: n.name, lenMm: n.len, stubMm: n.stubs.reduce((a, s) => a + hyp(s), 0), vias: n.vias.length })),
  commons,
  keys,
  droopV: M.elec.droop,
  rejectMinOhm: M.elec.rejectMin,
  warn: M.warn.filter((w) => /settle|droop/.test(w)),
};
writeFileSync(out, JSON.stringify(fixture, null, 1) + "\n");
const rng = (xs) => `${Math.min(...xs).toFixed(0)} to ${Math.max(...xs).toFixed(0)}`;
process.stdout.write(`dump-elec: ${keys.length} keys, key R ${rng(keys.filter((k) => k.type !== "touch").map((k) => k.bench.R))} ohm, touch R ${rng(keys.filter((k) => k.type === "touch").map((k) => k.bench.R))} ohm, droop ${fixture.droopV.toFixed(3)} V -> ${out}\n`);
