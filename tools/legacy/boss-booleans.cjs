// Runs BOSS kernel.js (boss-src.zip member src/kernel.js) on earcut 2.2.4 and
// polygon-clipping 0.15.7, the versions its package.json pins, and writes the
// union and difference areas of the M00-T03 step 8 fixtures, plus the raw
// earcut index output for each fixture polygon, to
// packages/geom/test/fixtures/boss-booleans.json.
//
// usage: node tools/legacy/boss-booleans.cjs [path/to/boss-src.zip]
// exit 0 written, 1 on a failure, 2 when polygon-clipping is not installed

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");
const JSZip = require("jszip");
const earcut = require("earcut");

// polygon-clipping is a legacy-only tool and stays out of the root lock: its
// predicates dependency carries a name on the lint-voice marketing list.
// Install it next to the repo modules before running this script:
//   npm install --no-save polygon-clipping@0.15.7
let polygonClipping;
try {
  polygonClipping = require("polygon-clipping");
} catch {
  console.error("polygon-clipping missing. run: npm install --no-save polygon-clipping@0.15.7");
  process.exit(2);
}

const ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_ZIP = "/Users/obsidian/Projects/hackbuild/fab-work-directory/benches/blocks/outputs/boss/boss-src.zip";
const OUT = path.join(ROOT, "packages", "geom", "test", "fixtures", "boss-booleans.json");
const MEMBER = "src/kernel.js";

const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
const version = (name) => JSON.parse(fs.readFileSync(require.resolve(`${name}/package.json`), "utf8")).version;

// Each fixture is built from kernel.js constructors only; a is the subject, b the tool.
const FIXTURES = [
  { name: "rect", a: (K) => K.rect(0, 0, 20, 10), b: (K) => K.circle(20, 5, 4, 48) },
  { name: "rrect", a: (K) => K.rrect(0, 0, 30, 16, 4, 8), b: (K) => K.rect(10, -4, 22, 4) },
  { name: "ring2", a: (K) => K.ring2(0, 0, 10, 6, 48), b: (K) => K.rect(-2, -12, 2, 12) },
  { name: "stroke", a: (K) => K.stroke([[-10, 0], [0, 5], [10, 0]], 2, "round", 24), b: (K) => K.circle(0, 5, 2.5, 32) },
  { name: "circle-hole", a: (K) => K.diff(K.circle(0, 0, 8, 48), K.circle(0, 0, 3, 32)), b: (K) => K.rrect(4, 0, 10, 4, 1, 8) },
];

function flatten(poly) {
  const flat = [];
  const holes = [];
  poly.forEach((ring, k) => {
    if (k > 0) holes.push(flat.length / 2);
    for (const [x, y] of ring) flat.push(x, y);
  });
  return { flat, holes };
}

async function main() {
  const zipPath = process.argv[2] || DEFAULT_ZIP;
  const zipBytes = fs.readFileSync(zipPath);
  const zip = await JSZip.loadAsync(zipBytes);
  const member = zip.file(MEMBER);
  if (!member) throw new Error(`${MEMBER} missing from ${zipPath}`);
  const kernelSrc = await member.async("string");

  const sandbox = { earcut, polygonClipping, Math, Array, Object, Set, Map, Infinity, Error };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(kernelSrc, sandbox, { filename: MEMBER });
  const K = sandbox.K;

  const fixtures = FIXTURES.map((f) => {
    const a = JSON.parse(JSON.stringify(f.a(K)));
    const b = JSON.parse(JSON.stringify(f.b(K)));
    const union = K.union(a, b);
    const difference = K.diff(a, b);
    // kernel.js cleans every boolean result onto a 1e-6 mm grid and strips
    // near-collinear vertices (cleanRing); the raw areas are polygon-clipping
    // before that cleaning.
    const rawArea = (mp) => mp.reduce((s, poly) => s + poly.reduce((t, ring) => t + K.area(ring), 0), 0);
    const perimeter = (mp) => mp.reduce((s, poly) => s + poly.reduce((t, r) => t + r.reduce((u, p, i) => u + Math.hypot(r[(i + 1) % r.length][0] - p[0], r[(i + 1) % r.length][1] - p[1]), 0), 0), 0);
    const triangulations = [...a, ...b].map((poly) => {
      const { flat, holes } = flatten(poly);
      return { holes, indices: earcut(flat, holes.length ? holes : null, 2) };
    });
    return {
      name: f.name,
      a,
      b,
      areaA: K.mArea(a),
      areaB: K.mArea(b),
      union: K.mArea(union),
      difference: K.mArea(difference),
      unionRaw: rawArea(polygonClipping.union(a, b)),
      differenceRaw: rawArea(polygonClipping.difference(a, b)),
      unionPerimeter: perimeter(union),
      differencePerimeter: perimeter(difference),
      triangulations,
    };
  });

  const out = {
    source: { zip: zipPath, zipSha256: sha256(zipBytes), member: MEMBER, memberSha256: sha256(Buffer.from(kernelSrc, "utf8")) },
    versions: { earcut: version("earcut"), "polygon-clipping": version("polygon-clipping") },
    units: { coordinates: "mm", areas: "mm2, computed: union and difference by kernel.js mArea over its cleaned polygon-clipping output, the Raw fields over polygon-clipping output before cleaning" },
    fixtures,
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(out, null, 1)}\n`);
  for (const f of fixtures) console.log(`${f.name} union ${f.union.toFixed(6)} mm2, difference ${f.difference.toFixed(6)} mm2 (computed)`);
  console.log(`wrote ${path.relative(ROOT, OUT)}`);
}

main().catch((e) => {
  console.error(e.stack || String(e));
  process.exit(1);
});
