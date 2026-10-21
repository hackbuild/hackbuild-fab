// Records the TANG R6 original's numbers and bodies for the TANG archetypes
// (M06-T09) into test/legacy/tang.json.
//
//   node packages/archetypes/scripts/tang-legacy.mjs
//
// The script evaluates the original in place, the way its own headless
// rerun does (originals/tang-r6/files/runs/run.js): a vm context, the
// Clipper and earcut builds inlined in tang_r6_4.html (the canonical
// revision, D-222), then src/02_kernel.js to 05_design.js. Nothing in the
// original is edited. It builds D.defaults() through D.build() and records
// the readouts, checks and dims the archetypes regenerate, and the bodies
// as the original's own kernel computes them: per slot and per z band the
// union area of the prisms there (K.unionAll, K.area) times the band
// height, which is the solid the original's meshPart slabs cover before its
// DZ lift and EZ feet, and the bounding box of those prisms.

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { localSource } from "../../../tools/test-support/originals-root.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "..", "test", "legacy", "tang.json");
const ORIG = localSource("fab-knowledge:originals/tang-r6/files/");
const HTML = `${ORIG}tang_r6_4.html`;
const SRC = ["02_kernel.js", "03_design.js", "04_design.js", "05_design.js"].map((f) => `${ORIG}src/${f}`);
const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
const r6 = (v) => Number(v.toFixed(6));

// The page's inline scripts; the vendor builds are the ones defining ClipperLib and earcut.
const html = readFileSync(HTML, "utf8");
const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const clipper = blocks.find((b) => b.includes("ClipperLib.Clipper =") || b.includes("ClipperLib.Clipper="));
const earcut = blocks.find((b) => b.includes(".earcut=e()"));
if (clipper === undefined || earcut === undefined) throw new Error("vendor blocks not found in tang_r6_4.html");

const ctx = { console, Math, Date, JSON, Object, Array, Set, Map, Number, String, Infinity, NaN, isFinite, parseFloat, parseInt, Float32Array, Float64Array, Uint32Array, Int32Array, Uint8Array, Error };
ctx.globalThis = ctx; ctx.navigator = { userAgent: "node", appName: "node" }; ctx.window = ctx; ctx.self = ctx;
vm.createContext(ctx);
vm.runInContext(clipper, ctx, { filename: "tang_r6_4.html#clipper" });
vm.runInContext(earcut, ctx, { filename: "tang_r6_4.html#earcut" });
for (const f of SRC) vm.runInContext(readFileSync(f, "utf8"), ctx, { filename: f });
const { K, D } = ctx;

/** Per slot: solid volume (sum over z bands of the union area times the band) and bbox, from the original's kernel. */
function solids(prisms) {
  const bySlot = {};
  for (const p of prisms) if (p.paths && p.paths.length && p.z1 - p.z0 > 1e-9) (bySlot[p.slot] ??= []).push(p);
  const out = {};
  for (const [slot, list] of Object.entries(bySlot)) {
    const zs = [...new Set(list.flatMap((p) => [p.z0, p.z1]))].sort((a, b) => a - b);
    let vol = 0;
    for (let i = 0; i + 1 < zs.length; i++) {
      const zm = (zs[i] + zs[i + 1]) / 2;
      const here = list.filter((p) => p.z0 <= zm && p.z1 >= zm);
      if (here.length) vol += K.area(K.unionAll(here.map((p) => p.paths))) * (zs[i + 1] - zs[i]);
    }
    const bb = list.map((p) => K.bbox(p.paths));
    out[slot] = {
      volume: r6(vol),
      bbox: { min: [r6(Math.min(...bb.map((b) => b.x0))), r6(Math.min(...bb.map((b) => b.y0))), r6(Math.min(...list.map((p) => p.z0)))],
        max: [r6(Math.max(...bb.map((b) => b.x1))), r6(Math.max(...bb.map((b) => b.y1))), r6(Math.max(...list.map((p) => p.z1)))] },
    };
  }
  return out;
}

const S = D.defaults();
const M = D.build(S);
const N = M.neck, R = M.rotor, F = M.face;
const ro = M.readouts;
const check = (re) => M.checks.filter((c) => re.test(c.text)).map((c) => ({ kind: c.kind, text: c.text }));

// The face items one pot owns (04_design.js lines 194 to 231), as the face assembly bands them (lines 413 to 420):
// full-height items over L1, sub lower over the first two layers, sub upper over the third.
const st = F.stack, zm = st.l1[0] + 2 * S.print.layer;
const potItems = (k) => F.R.l1.filter((i) => i.tag.startsWith(`pot${k} `));
function potPrisms(k) {
  const out = [];
  for (const i of potItems(k)) {
    const slot = i.slot || 2;
    if (i.sub === "lower") out.push({ z0: st.l1[0], z1: zm, paths: i.paths, slot });
    else if (i.sub === "upper") out.push({ z0: zm, z1: st.l1[1], paths: i.paths, slot });
    else out.push({ z0: st.l1[0], z1: st.l1[1], paths: i.paths, slot });
  }
  return out;
}
const stopPrisms = (k) => [{ z0: -S.pots.stopH, z1: 0, paths: F.stops[k], slot: 1 }];

const record = {
  command: "node packages/archetypes/scripts/tang-legacy.mjs",
  note: "TANG R6 r6_4 evaluated in place in a vm (as runs/run.js does) with the Clipper and earcut builds inlined in tang_r6_4.html; D.build(D.defaults()). Volumes are union area times band height per slot from the original's own kernel (K.unionAll, K.area), before meshPart's DZ lift and EZ feet; bboxes from K.bbox and the prism z ranges. mm, mm3, ohm; computed.",
  sources: { "tang-r6": Object.fromEntries([HTML, ...SRC].map((f) => [path.basename(f), sha(f)])) },
  defaults: { pots: S.pots, neck: S.neck, el: S.el, mat: { cplaXY: S.mat.cplaXY, cplaZ: S.mat.cplaZ, ctpu: S.mat.ctpu, tpuE: S.mat.tpuE }, layer: S.print.layer, faceStack: st },
  neck: {
    dims: { xm0: N.xm0, xm1: N.xm1, zc0: r6(N.zc0), zc1: r6(N.zc1), zw0: r6(N.zw0), zw1: r6(N.zw1), memT: r6(N.memT), trackLen: N.trackLen, uPeg: N.uPeg, size: N.size },
    readouts: { trackR: r6(ro.neck.trackR), leadA: r6(ro.neck.leadA), leadB: r6(ro.neck.leadB), wiperR: r6(ro.neck.wiperR), swing: r6(ro.neck.swing), counts: ro.neck.counts, lead33: r6(ro.pots.lead33), leadG: r6(ro.pots.leadG) },
    checks: check(/^membrane|^neck|joinery|pegs/),
    netCheck: M.checks.filter((c) => c.text.startsWith("neck")).map((c) => c.kind + " " + c.text),
    solids: solids(N.prisms),
    prisms: N.prisms.length,
  },
  pot: {
    readouts: { arcOhms: r6(ro.pots.arcOhms), rPar: r6(ro.pots.rPar), swing: r6(ro.pots.swing), counts: ro.pots.counts, lead33: r6(ro.pots.lead33), leadG: r6(ro.pots.leadG) },
    info: F.potInfo.map((p) => ({ x: p.x, y: p.y, wv: p.wv.map(r6), e3: p.e3.map(r6), eG: p.eG.map(r6), arcSpan: p.arcSpan, colSpan: p.colSpan })),
    items: potItems(1).map((i) => ({ tag: i.tag, net: i.net, slot: i.slot || 2, sub: i.sub ?? null, area: r6(K.area(i.paths)), len: i.len === undefined ? null : r6(i.len) })),
    tracks: [1, 2, 3].map((k) => solids(potPrisms(k))),
    stops: [0, 1, 2].map((k) => solids(stopPrisms(k))),
    rotor: { preload: r6(R.preload), hubTop: r6(R.hubTop), bumpTop: r6(R.bumpTop), armT: r6(R.armT), shaftL: r6(R.shaftL), size: R.size, solids: solids(R.prisms) },
    cap: { height: r6(M.cap.height), ring: r6(M.cap.ring), solids: solids(M.cap.prisms) },
    checks: check(/^rotor|hub reaches|arc and collector|balance arm|pot pitch|pot wiper/),
    resistors: ro.resistors.filter((r) => r.tag.includes("arc")).map((r) => ({ tag: r.tag, ohms: r6(r.ohms) })),
  },
  firmware: D.firmware(M),
};
writeFileSync(OUT, `${JSON.stringify(record, null, 1)}\n`);
console.log("wrote", OUT, M.checks.length, "checks");
