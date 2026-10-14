// M00-T14: the M00-T05 route fixtures and the D-175 ring set, hashed. One
// module serves node (tools/determinism/hashes.mjs) and the page the
// browser legs load (tools/determinism/bake.mjs), so both sides run the same
// code over the same data. It never touches fs or the DOM: the caller hands
// in the mesh package, a loaded geom and the two corpus files.
//
// Fixture sources:
// - prism: tools/corpus/mesh/boss-prism.json, the five BOSS fixtures.
// - stack: the four fixtures of packages/mesh/test/routes/stack.test.ts.
// - revolve: every call in tools/corpus/mesh/tenon-revolve-calls.jsonl.
// - raster: fixtures A, B and C of packages/mesh/test/routes/raster.test.ts
//   (the seed heal.test.mjs mulberry32 draws); COLLAR raster parity is the
//   orca-3mf-roundtrip reference, which hashes.mjs builds.
// The stack and raster fixtures are declared inside their tests, which this
// module cannot import, so they are repeated here; a change to either test
// fixture belongs in both places.

/** mulberry32, as raster.test.ts and the seed heal test draw it. */
function rng(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function stress(seed) {
  const W = 80, H = 80, R = 38, rim = 4;
  const r = rng(seed);
  const mk = (f) => {
    const L = new Uint8Array(W * H);
    for (let j = 0; j < H; j++) {
      for (let i = 0; i < W; i++) {
        const d = Math.hypot(i + 0.5 - 40, j + 0.5 - 40);
        if (d > R) continue;
        L[j * W + i] = d > R - rim ? 3 : f(i, j);
      }
    }
    return L;
  };
  return {
    width: W, height: H, px: 0.125,
    slabs: [
      { labels: mk(() => (r() < 0.3 ? 2 : 1)), z: [0, 0.72] },
      { labels: mk(() => 1), z: [0.72, 2.88] },
      { labels: mk((i, j) => ((i + j) & 1 ? 2 : 1)), z: [2.88, 3.6] },
    ],
  };
}

function grid(seed, W, H, K, nl, p) {
  const r = rng(seed);
  const slabs = [];
  for (let k = 0; k < K; k++) {
    const L = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) L[i] = r() < p ? 0 : 1 + Math.floor(r() * nl);
    slabs.push({ labels: L, z: [k, k + 1] });
  }
  return { width: W, height: H, px: 0.5, slabs };
}

const RASTER = [
  ["A-checkerboard-80", () => stress(1)],
  ["B-oscillation-6x6x2", () => grid(2, 6, 6, 2, 3, 0.3)],
  ["C-frozen-8x8x3", () => grid(1, 8, 8, 3, 3, 0.3)],
];

const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
// Overlaps of 12, 16 and 20 grid steps, mm (computed), as stack.test.ts.
const O12 = 12 / 1024;
const O16 = 16 / 1024;
const O20 = 20 / 1024;

const STACK = [
  ["two-base-boss", [
    { outline: [rect(0, 0, 20, 10)], z: [0, 2] },
    { outline: [rect(5, 0, 15, 10)], z: [2 - O16, 5] },
  ]],
  ["two-overhang", [
    { outline: [rect(0, 0, 10, 10)], z: [0, 1] },
    { outline: [rect(5, 2, 17, 8)], z: [1 - O20, 3] },
  ]],
  ["three-ring-cap", [
    { outline: [rect(0, 0, 12, 12)], z: [0, 1] },
    { outline: [rect(0, 0, 12, 12), rect(3, 3, 9, 9)], z: [1 - O12, 4] },
    { outline: [rect(2, 2, 10, 10)], z: [4 - O16, 4.5] },
  ]],
  ["three-equal-merge", [
    { outline: [rect(0, 0, 6, 4)], z: [0, 1] },
    { outline: [rect(0, 0, 6, 4)], z: [1 - O16, 2] },
    { outline: [rect(0, 0, 6, 4)], z: [2 - O16, 3] },
  ]],
];

/** Ring set radius, mm, and prism height, mm. */
const RING_R = 10;
const RING_Z = [0, 1];
/** Segment counts of the ring set (D-175): 3 to 256. */
export const RING_SEGMENTS = [3, 256];


/** sha256 over the ring as little-endian int32 grid coordinates. */
function ringHash(mesh, ring) {
  const bytes = new Uint8Array(ring.length * 8);
  const dv = new DataView(bytes.buffer);
  ring.forEach(([x, y], i) => {
    dv.setInt32(i * 8, Math.round(x * 1024), true);
    dv.setInt32(i * 8 + 4, Math.round(y * 1024), true);
  });
  return mesh.sha256Hex(bytes);
}

/**
 * Every route fixture and ring hashed, id to hash. Ids start `route:` for
 * a meshHash and `ring:` for a ring point hash.
 *
 * @param {object} o
 * @param {typeof import("@hackbuild/mesh")} o.mesh the mesh package
 * @param {import("@hackbuild/geom").Geom} o.geom a loaded geom
 * @param {typeof import("@hackbuild/geom").circleRing} o.circleRing the geom
 *   circle Author.ring.circle draws from the committed unit-circle table
 *   (D-175), so every leg hashes the shipped points
 * @param {{fixtures: {name: string, z: [number, number], polygons: {outline: number[][][]}[]}[]}} o.bossPrism
 * @param {string} o.revolveCalls the jsonl text
 * @returns {Record<string, string>}
 */
export function routeHashes({ mesh, geom, circleRing, bossPrism, revolveCalls }) {
  const out = {};
  for (const f of bossPrism.fixtures) {
    f.polygons.forEach((p, i) => {
      out[`route:prism/${f.name}/${i}`] = mesh.meshHash(mesh.prismMesh(geom, p.outline, f.z, `/fixtures/${f.name}/${i}`).mesh);
    });
  }
  for (const [name, bands] of STACK) {
    // packages/mesh/test/routes/stack.test.ts holds these overlaps to the
    // profile band; the hash runs on the overlaps the fixture declares.
    const overlaps = bands.slice(1).map((b, i) => mesh.snap(bands[i].z[1]) - mesh.snap(b.z[0]));
    mesh.stackMesh(geom, bands, [Math.min(...overlaps), Math.max(...overlaps)]).shells.forEach((s, i) => {
      out[`route:stack/${name}/${i}`] = mesh.meshHash(s);
    });
  }
  for (const [name, make] of RASTER) {
    for (const [slot, m] of mesh.raster(make(), "build").meshes) out[`route:raster/${name}/slot${slot}`] = mesh.meshHash(m);
  }
  const lines = revolveCalls.trim().split("\n");
  for (const line of lines.slice(1)) {
    const c = JSON.parse(line);
    const made = c.fields.map((f) => mesh.radialField(f.id).make(f.params));
    const rows = c.rows.map(([r, z, k]) => ({ r, z, f: k < 0 ? null : made[k] }));
    out[`route:revolve/${String(c.call).padStart(4, "0")}`] = mesh.meshHash(mesh.revolveRows(rows, mesh.thetaList(c.thetaN, c.thetaEdges)));
  }
  for (let n = RING_SEGMENTS[0]; n <= RING_SEGMENTS[1]; n++) {
    const ring = circleRing(RING_R, [0, 0], n);
    const id = String(n).padStart(3, "0");
    out[`ring:circle/${id}`] = ringHash(mesh, ring);
    out[`route:prism/circle/${id}`] = mesh.meshHash(mesh.prismMesh(geom, [ring], RING_Z, `/rings/${id}`).mesh);
  }
  return out;
}
