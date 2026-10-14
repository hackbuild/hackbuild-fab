// Runs BOSS Mesh.prism (boss-src.zip member src/kernel.js) on the BOSS
// fixtures (rect, rrect, ring2, stroke, circle with a hole) and writes each
// prism's volume and audits to tools/corpus/mesh/boss-prism.json
// (M00-T05 step 8).
//
// The fixture outlines come from kernel.js constructors, then every vertex
// is snapped to the 1/1024 mm grid (D-054) before Mesh.prism sees it, so
// the mesh route and BOSS triangulate one outline. kernel.js then rounds
// those values to its own 6-decimal grid (cleanRing), a move of at most
// 5e-7 mm per vertex.
//
// The BLOCKS kernel.js (lineage mesh.prism/blocks-1, canonical) differs from
// the BOSS member only in clipRetry, rotY and 14 cap tries where BOSS has 6;
// pass its path to replay the fixtures on it. On these fixtures neither copy
// retries, so both write the same volumes and audits.
//
// usage: node tools/legacy/boss-prism-dump.cjs [path/to/boss-src.zip | path/to/kernel.js] [out.json]
// exit 0 written, 1 on a failure, 2 when polygon-clipping is not installed

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");
const JSZip = require("jszip");
const earcut = require("earcut");

// polygon-clipping is a legacy-only tool kept out of the root lock (see boss-booleans.cjs):
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
const OUT = path.join(ROOT, "tools", "corpus", "mesh", "boss-prism.json");
const MEMBER = "src/kernel.js";
const GRID = 1024;

const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
const version = (name) => JSON.parse(fs.readFileSync(require.resolve(`${name}/package.json`), "utf8")).version;
const q = (v) => {
  const s = Math.round(v * GRID) / GRID;
  return s === 0 ? 0 : s;
};

// The boss-booleans.cjs fixture subjects, built from kernel.js constructors only; z in mm on the grid.
const FIXTURES = [
  { name: "rect", mp: (K) => K.rect(0, 0, 20, 10), z: [0, 3] },
  { name: "rrect", mp: (K) => K.rrect(0, 0, 30, 16, 4, 8), z: [0.25, 2.41015625] },
  { name: "ring2", mp: (K) => K.ring2(0, 0, 10, 6, 48), z: [0, 1.4501953125] },
  { name: "stroke", mp: (K) => K.stroke([[-10, 0], [0, 5], [10, 0]], 2, "round", 24), z: [0, 0.73046875] },
  { name: "circle-hole", mp: (K) => K.diff(K.circle(0, 0, 8, 48), K.circle(0, 0, 3, 32)), z: [1, 4] },
];

async function main() {
  const zipPath = process.argv[2] || DEFAULT_ZIP;
  const outPath = process.argv[3] ? path.resolve(process.argv[3]) : OUT;
  const zipBytes = fs.readFileSync(zipPath);
  let kernelSrc;
  if (zipPath.endsWith(".js")) {
    kernelSrc = zipBytes.toString("utf8");
  } else {
    const zip = await JSZip.loadAsync(zipBytes);
    const member = zip.file(MEMBER);
    if (!member) throw new Error(`${MEMBER} missing from ${zipPath}`);
    kernelSrc = await member.async("string");
  }

  const sandbox = { earcut, polygonClipping, Math, Array, Object, Set, Map, Infinity, Error, Int32Array, Uint32Array, Float32Array };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(kernelSrc, sandbox, { filename: MEMBER });
  const K = sandbox.K;

  const fixtures = FIXTURES.map((f) => {
    const raw = JSON.parse(JSON.stringify(f.mp(K)));
    const mp = raw.map((poly) => poly.map((ring) => ring.map(([x, y]) => [q(x), q(y)])));
    const polygons = mp.map((poly) => {
      const m = new K.Mesh(`${f.name}`, 1);
      m.prism([poly], f.z[0], f.z[1]);
      const indexed = K.auditIndexed(m.idx, m.pos.length / 3);
      const merged = m.audit();
      return {
        outline: poly,
        volume: m.volume(),
        triangles: m.tris,
        shells: m.nshells,
        auditIndexed: { ok: indexed.ok, bad: indexed.bad, dir: indexed.dir },
        auditMerged: { ok: merged.ok, bad: merged.bad, dir: merged.dir, vertsMerged: merged.vertsMerged },
        warnings: Array.from(m.warnings),
      };
    });
    return { name: f.name, z: f.z, polygons };
  });

  const out = {
    source: zipPath.endsWith(".js")
      ? { file: zipPath, sha256: sha256(zipBytes) }
      : { zip: zipPath, zipSha256: sha256(zipBytes), member: MEMBER, memberSha256: sha256(Buffer.from(kernelSrc, "utf8")) },
    versions: { earcut: version("earcut"), "polygon-clipping": version("polygon-clipping"), node: process.version },
    units: {
      outline: "mm, snapped to 1/1024 before Mesh.prism",
      z: "mm",
      volume: "mm3, computed by kernel.js Mesh.volume over one Mesh.prism call per polygon",
      audits: "kernel.js auditIndexed on raw indices and Mesh.audit after a 1e-4 mm vertex merge; bad counts edges not shared by exactly two faces",
    },
    fixtures,
  };
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(out, null, 1)}\n`);
  for (const f of fixtures) {
    for (const [i, p] of f.polygons.entries()) {
      console.log(`${f.name}[${i}] volume ${p.volume.toFixed(6)} mm3 (computed), audit bad ${p.auditIndexed.bad} and ${p.auditMerged.bad}, warnings ${p.warnings.length}`);
    }
  }
  console.log(`wrote ${path.relative(ROOT, outPath)}`);
}

main().catch((e) => {
  console.error(e.stack || String(e));
  process.exit(1);
});
