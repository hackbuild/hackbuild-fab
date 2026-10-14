// Extracts the capsule physics of designs/slug/legacy/slug.html as an ES
// module that runs in node (M02-T08 step 1), the way the shipped tests
// tri2.mjs and placecheck.mjs loaded the page through /tmp/app.mjs. Two
// blocks are copied byte for byte: the parameter echo and funnel functions
// (from `const P = {` to `const FBACK_X`, lines 202 to 262) and the capsule
// physics (from `const CAPCOL` to the line before the UI banner, lines 677 to
// 955). three.js is stubbed for Vector3 math only, with the method bodies of
// three.js r160 src/math/Vector3.js and Quaternion.setFromAxisAngle, so the
// arithmetic matches the page; meshes, geometries and groups are inert.
//
// The page's drive state (rotorDeg, motorSteps, targetSteps, doorOpen) is
// module scope `let`; the footer exposes it through accessors and adds
// reset(), which is the physics half of the page's reset button (lines 973
// to 976). Math.random is read at call time, so a caller that replaces it
// before reset() seeds the spawn velocities.
//
//   node designs/slug/legacy/tools/extract.mjs --out <file.mjs>
//
// Exit 1 when the page bytes are not the legacy copy or a marker moved.

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const PAGE = join(here, "..", "slug.html");
const PAGE_SHA256 = "2d09238c27d5ca4bf023eeee44939b1500470ad2058822b8d0add48ec9bf3241";

/** 1-based line numbers the card and the slug record cite; a moved marker fails the extraction. */
const MARKERS = [
  ["const P = {", 202],
  ["const FBACK_X=", 262],
  ["const CAPCOL=", 677],
  ["function spawnPos(i){", 686],
  ["function addCapsule(){", 695],
  ["function step(dt,omegaRad){", 811],
  ["function relax(iters){", 916],
  ["   UI", 957],
];

const STUB = `// three.js stub: Vector3 math only, bodies as three.js r160.
class Vector3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
  clone() { return new Vector3(this.x, this.y, this.z); }
  sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }
  add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
  addScaledVector(v, s) { this.x += v.x * s; this.y += v.y * s; this.z += v.z * s; return this; }
  multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
  divideScalar(s) { return this.multiplyScalar(1 / s); }
  dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
  length() { return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z); }
  normalize() { return this.divideScalar(this.length() || 1); }
  applyAxisAngle(axis, angle) {
    const halfAngle = angle / 2, s = Math.sin(halfAngle);
    const qx = axis.x * s, qy = axis.y * s, qz = axis.z * s, qw = Math.cos(halfAngle);
    const vx = this.x, vy = this.y, vz = this.z;
    const tx = 2 * (qy * vz - qz * vy);
    const ty = 2 * (qz * vx - qx * vz);
    const tz = 2 * (qx * vy - qy * vx);
    this.x = vx + qw * tx + qy * tz - qz * ty;
    this.y = vy + qw * ty + qz * tx - qx * tz;
    this.z = vz + qw * tz + qx * ty - qy * tx;
    return this;
  }
}
class Inert { constructor() { this.position = new Vector3(); this.rotation = {}; } add() {} }
const THREE = { Vector3, Mesh: Inert, SphereGeometry: Inert, TorusGeometry: Inert, MeshLambertMaterial: Inert };
const MAT = { black: null };
const groups = { cap: { add() {}, remove() {} } };
`;

const FOOTER = `
export const slug = {
  P, CAP_R, ZCEIL_TOP, ZROT_TOP, ZDECK_TOP, STEPS_VEND, DEG_PER_STEP, rad,
  caps, funPlanes, spawnPos, step, relax, refill,
  get rotorDeg() { return rotorDeg; }, set rotorDeg(v) { rotorDeg = v; },
  get motorSteps() { return motorSteps; }, set motorSteps(v) { motorSteps = v; },
  get targetSteps() { return targetSteps; }, set targetSteps(v) { targetSteps = v; },
  get doorOpen() { return doorOpen; }, set doorOpen(v) { doorOpen = v; },
  reset() { caps.length = 0; motorSteps = 0; targetSteps = 0; rotorDeg = 0; refill(18); },
};
`;

export function extract() {
  const bytes = readFileSync(PAGE);
  const sha = createHash("sha256").update(bytes).digest("hex");
  if (sha !== PAGE_SHA256) throw new Error(`slug.html sha256 ${sha}, legacy copy is ${PAGE_SHA256}`);
  const lines = bytes.toString("utf8").split("\n");
  for (const [text, line] of MARKERS) {
    const at = lines.findIndex((l) => l.startsWith(text)) + 1;
    if (at !== line) throw new Error(`marker "${text}" at line ${at}, expected ${line}`);
  }
  const params = lines.slice(202 - 1, 262);
  // The physics block ends at the comment banner that opens the UI section.
  const physics = lines.slice(677 - 1, 957 - 1);
  if (!physics[physics.length - 1].startsWith("/* ====")) throw new Error("physics block does not end at the UI banner");
  physics.pop();
  return `${STUB}\n${params.join("\n")}\n\n${physics.join("\n")}\n${FOOTER}`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const i = process.argv.indexOf("--out");
  const out = i > 0 ? process.argv[i + 1] : undefined;
  try {
    const text = extract();
    if (out === undefined) process.stdout.write(text);
    else writeFileSync(out, text);
  } catch (e) {
    process.stderr.write(`extract: ${e.message}\n`);
    process.exit(1);
  }
}
