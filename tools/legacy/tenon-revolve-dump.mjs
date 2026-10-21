// Runs TENON sweep.js (tenon-src.zip members sweep.js and src/part2.js) over
// its 63 states (3 presets plus 60 random) and records every
// revolve(rows, thetas) call with the legacy volume and the sweep's own
// mesh and profile audits, one JSON line per call, into
// tools/corpus/mesh/tenon-revolve-calls.jsonl (M00-T05 step 8).
//
// Three things differ from running `node sweep.js` by hand, and none of
// them changes a number the legacy computes:
// - Math.random is a seeded mulberry32 stream (SEED below), so the 60
//   random states are the same on every run.
// - Field closures are tagged with the data that made them, so a call can
//   be replayed without the legacy source. The four field constructors
//   (extThread, intThread, lugField, grooveField) are wrapped, and the
//   three inline closures in part2.js (lines 461, 539 and 582) are
//   rewritten as tagged closures with the same body. The run checks that
//   each rewrite matched exactly once.
// - sweep.js gets one statement after its first line that hands its
//   check() and simple() to the recorder, and its failure dumps to /tmp
//   are discarded.
// The run also replays the sweep with no tagging at all and fails unless
// every call gives the same volume, so the tags are proven inert.
//
// usage: node tools/legacy/tenon-revolve-dump.mjs [tenon-src.zip as an archive-prefix or repo path]
// exit 0 written, 1 on a failure

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const JSZip = require("jszip");

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
// The source is named in publish form (tools/publish-paths.mjs) and recorded as given; its bytes
// are read from the archive's local copy (tools/test-support/originals-root.ts).
const DEFAULT_ZIP = "fab-knowledge:evidence/x/tenon/tenon-src.zip";
const OUT = join(ROOT, "tools", "corpus", "mesh", "tenon-revolve-calls.jsonl");
const SEED = 20261005;

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Each rewrite: the exact legacy text and its tagged twin. The closure body is unchanged.
const REWRITES = [
  {
    line: 461,
    from: "field: (th, z) => gf(th, L - z),",
    to: "field: __hbfTag((th, z) => gf(th, L - z), gf, { zOrigin: L, zSign: -1 }),",
  },
  {
    line: 539,
    from: "spField = (th, z) => lf(th, z - Lh);",
    to: "spField = __hbfTag((th, z) => lf(th, z - Lh), lf, { zOrigin: Lh, zSign: 1 });",
  },
  {
    line: 582,
    from: "grooveF = (th, z) => { const k = Math.round(th / (TAU / gv.n)); return Math.abs(wrapPi(th - k * TAU / gv.n)) <= half ? dep : 0; };",
    to: "grooveF = __hbfTag((th, z) => { const k = Math.round(th / (TAU / gv.n)); return Math.abs(wrapPi(th - k * TAU / gv.n)) <= half ? dep : 0; }, null, { id: 'tenon.groove.axial', params: { n: gv.n, half, depth: dep } });",
  },
];

const bool = (v) => (v ? 1 : 0);

// Field data per constructor, with every value a number (spec/build.ts ShapeDecl field params).
const FIELD_PARAMS = {
  extThread: (o) => ({
    id: "tenon.thread.external",
    params: {
      z0: o.z0, z1: o.z1, pitch: o.pitch, starts: o.starts, depth: o.depth, hand: o.hand || 1,
      chamferLo: bool(o.chamferLo), chamferHi: bool(o.chamferHi), fillLo: bool(o.fillLo), fillHi: bool(o.fillHi),
    },
  }),
  intThread: (o) => ({
    id: "tenon.thread.internal",
    params: { z0: o.z0, z1: o.z1, mouthHi: bool(o.mouth === "hi"), pitch: o.pitch, starts: o.starts, depth: o.depth, hand: o.hand || 1 },
  }),
  lugField: (j, Rsp) => ({
    id: "tenon.bayonet.lug",
    params: { lugs: j.lugs, lugW: j.lugW, lugH: j.lugH, lugT: j.lugT, lugGap: j.lugGap, radius: Rsp },
  }),
  grooveField: (j, Rsock) => ({
    id: "tenon.bayonet.groove",
    params: {
      lugs: j.lugs, lugW: j.lugW, lugH: j.lugH, lugT: j.lugT, lugGap: j.lugGap, clear: j.clear, sweep: j.sweep,
      preload: j.preload, clearZ: j.clearZ, bite: j.bite, dir: j.dir, radius: Rsock,
    },
  }),
};

async function readMember(zip, name) {
  const m = zip.file(name);
  if (!m) throw new Error(`${name} missing from the zip`);
  return m.async("string");
}

/** One sweep run. tag false runs the legacy text unchanged and records volumes only. */
function runSweep(part2Src, sweepSrc, tag) {
  const tags = new WeakMap();
  const thetaArgs = new WeakMap();
  const calls = [];
  let caseIndex = -1;
  const sandbox = {
    console: { log: () => {} },
    Math: Object.create(Math),
    performance: { now: () => 0 },
    Date: { now: () => 0 },
    JSON, Object, Array, Set, Map, Number, String, Error, Infinity, NaN, Float32Array, Float64Array, Int32Array, Uint8Array, Uint32Array, WeakMap,
  };
  sandbox.Math.random = mulberry32(SEED);
  sandbox.globalThis = sandbox;
  sandbox.__hbfTag = (fn, inner, extra) => {
    if (extra.id !== undefined) tags.set(fn, { id: extra.id, params: extra.params });
    else {
      const base = tags.get(inner);
      if (base === undefined) throw new Error("inline field wraps an untagged field");
      tags.set(fn, { id: base.id, params: { ...base.params, zOrigin: extra.zOrigin, zSign: extra.zSign } });
    }
    return fn;
  };
  const mod = { exports: {} };
  sandbox.module = mod;
  vm.createContext(sandbox);

  let src = part2Src;
  if (tag) {
    for (const r of REWRITES) {
      const hits = src.split(r.from).length - 1;
      if (hits !== 1) throw new Error(`rewrite for part2.js line ${r.line} matched ${hits} times`);
      src = src.replace(r.from, r.to);
    }
  }
  vm.runInContext(src, sandbox, { filename: "src/part2.js" });

  if (tag) {
    for (const name of Object.keys(FIELD_PARAMS)) {
      const orig = sandbox[name];
      sandbox[name] = (...args) => {
        const fn = orig(...args);
        tags.set(fn, FIELD_PARAMS[name](...args));
        return fn;
      };
    }
    const origTheta = sandbox.thetaList;
    sandbox.thetaList = (n, edges) => {
      const out = origTheta(n, edges);
      thetaArgs.set(out, { n, edges: [...(edges || [])] });
      return out;
    };
  }
  const origRevolve = sandbox.revolve;
  sandbox.revolve = (rows, thetas) => {
    const part = origRevolve(rows, thetas);
    const volume = sandbox.BENCH.signedVolume(part);
    if (!tag) {
      calls.push({ volume });
      return part;
    }
    const fields = [];
    const fieldIndex = new Map();
    const outRows = rows.map((r) => {
      if (!r.f) return [r.r, r.z, -1];
      let k = fieldIndex.get(r.f);
      if (k === undefined) {
        const t = tags.get(r.f);
        if (t === undefined) throw new Error("revolve row carries an untagged field");
        k = fields.length;
        fields.push(t);
        fieldIndex.set(r.f, k);
      }
      return [r.r, r.z, k];
    });
    const th = thetaArgs.get(thetas);
    if (th === undefined) throw new Error("thetas did not come from thetaList");
    const legacy = sandbox.__check(part);
    const dedup = rows.filter((r, i, a) => i === 0 || Math.abs(r.r - a[i - 1].r) > 1e-9 || Math.abs(r.z - a[i - 1].z) > 1e-9);
    calls.push({
      call: calls.length,
      case: caseIndex,
      volume,
      audit: { degen: legacy.degen, bad: legacy.bad },
      profile: sandbox.__simple(dedup),
      triangles: part.indices.length / 3,
      vertices: part.positions.length / 3,
      thetaN: th.n,
      thetaEdges: th.edges,
      thetaCount: thetas.length,
      thetaSha256: sha256(Buffer.from(Float64Array.from(thetas).buffer)),
      fields,
      rows: outRows,
    });
    return part;
  };
  const origBuild = mod.exports.build;
  mod.exports.build = (S, into) => {
    caseIndex += 1;
    return origBuild(S, into);
  };

  const sweepCtx = sandbox;
  sweepCtx.require = (name) => {
    if (name === "./src/part2.js") return mod.exports;
    if (name === "fs") return { writeFileSync: () => {} };
    throw new Error(`sweep.js asked for ${name}`);
  };
  const logs = [];
  sweepCtx.console = { log: (...a) => logs.push(a.join(" ")) };
  // check and simple are hoisted function declarations, so they exist on the first line.
  const head = "const m = require('./src/part2.js');";
  if (sweepSrc.split(head).length !== 2) throw new Error("sweep.js first line changed");
  const exposed = sweepSrc.replace(head, `${head} globalThis.__check = check; globalThis.__simple = simple;`);
  vm.runInContext(exposed, sweepCtx, { filename: "sweep.js" });
  return { calls, cases: caseIndex + 1, summary: logs[logs.length - 1] ?? "" };
}

async function main() {
  const zipPath = process.argv[2] || DEFAULT_ZIP;
  const { localSource } = await import(new URL("../test-support/originals-root.ts", import.meta.url).href);
  const zipBytes = readFileSync(localSource(zipPath));
  const zip = await JSZip.loadAsync(zipBytes);
  const part2Src = await readMember(zip, "src/part2.js");
  const sweepSrc = await readMember(zip, "sweep.js");

  const plain = runSweep(part2Src, sweepSrc, false);
  const tagged = runSweep(part2Src, sweepSrc, true);
  if (plain.calls.length !== tagged.calls.length) throw new Error(`tagged run made ${tagged.calls.length} calls, plain run ${plain.calls.length}`);
  plain.calls.forEach((c, i) => {
    if (c.volume !== tagged.calls[i].volume) throw new Error(`call ${i}: tagged volume ${tagged.calls[i].volume} differs from plain ${c.volume}`);
  });

  const header = {
    header: true,
    source: {
      zip: zipPath,
      zipSha256: sha256(zipBytes),
      part2: "src/part2.js",
      part2Sha256: sha256(Buffer.from(part2Src, "utf8")),
      sweep: "sweep.js",
      sweepSha256: sha256(Buffer.from(sweepSrc, "utf8")),
    },
    seed: SEED,
    cases: tagged.cases,
    calls: tagged.calls.length,
    sweepSummary: tagged.summary,
    units: {
      rows: "[r mm, z mm, field index or -1]",
      volume: "mm3, computed by part2.js signedVolume over its Float32Array positions",
      audit: "sweep.js check(): degen and bad edge counts",
      profile: "sweep.js simple(): area mm2, cross, neg, back counts over the deduplicated rows",
    },
    node: process.version,
  };
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, [header, ...tagged.calls].map((x) => JSON.stringify(x)).join("\n") + "\n");
  console.log(`sweep: ${tagged.summary}`);
  console.log(`${tagged.calls.length} revolve calls over ${tagged.cases} states; tagged and plain runs agree on every volume`);
  console.log(`wrote ${relative(ROOT, OUT)}`);
}

main().catch((e) => {
  console.error(e.stack || String(e));
  process.exit(1);
});
