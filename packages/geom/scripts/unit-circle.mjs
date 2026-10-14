// Generates packages/geom/src/unit-circle.table.ts, the committed unit-circle
// table of D-175, and the cos and sin of each earcut rotation attempt. No Math.sin or Math.cos: every value is computed in BigInt
// fixed point at 2^-256 and rounded once to the nearest float64, so the table
// is the correctly rounded cos and sin of each angle and any machine that runs
// this script writes the same bytes.
//
//   node packages/geom/scripts/unit-circle.mjs           print the table source
//   node packages/geom/scripts/unit-circle.mjs --write   write it over the committed file
//
// Keys. Point i of an n-point ring sits at the turn fraction i/n. Folding by
// the eight symmetries of the square maps every such fraction onto
// g = p/q in [0, 1/8] with q dividing 8n; the table holds cos(2 pi g) and
// sin(2 pi g) once per reduced p/q over n from MIN_SEGMENTS to MAX_SEGMENTS.
// Because each value is correctly rounded, the fold loses nothing:
// cos(pi/2 - x) and sin(x) are the same real, so they round to the same double.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const MIN_SEGMENTS = 3;
export const MAX_SEGMENTS = 256;

/** Fixed-point fraction bits; the result needs 53, the rest is guard. */
const BITS = 256n;
const ONE = 1n << BITS;
/** Guard below which a value is too close to a rounding midpoint to trust, in fixed-point units. */
const GUARD = 1n << 64n;

function gcd(a, b) {
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

/** atan(1/x) in fixed point, x a positive BigInt above 1. */
function atanInv(x) {
  const x2 = x * x;
  let term = ONE / x;
  let sum = term;
  for (let k = 1n; term !== 0n; k++) {
    term /= x2;
    const t = term / (2n * k + 1n);
    sum += k % 2n === 1n ? -t : t;
  }
  return sum;
}

/** pi in fixed point by Machin: 16 atan(1/5) - 4 atan(1/239). */
const PI = 16n * atanInv(5n) - 4n * atanInv(239n);

/** cos and sin of a fixed-point angle in [0, pi/4], Taylor series in fixed point. */
function cosSin(theta) {
  const t2 = (theta * theta) >> BITS;
  let c = ONE;
  let s = theta;
  let ct = ONE;
  let st = theta;
  for (let k = 1n; ct !== 0n || st !== 0n; k++) {
    ct = -((ct * t2) >> BITS) / ((2n * k - 1n) * (2n * k));
    st = -((st * t2) >> BITS) / ((2n * k) * (2n * k + 1n));
    c += ct;
    s += st;
  }
  return [c, s];
}

/** Nearest float64 to a non-negative fixed-point value, ties to even; refuses a value near a midpoint. */
function toDouble(v) {
  if (v < 0n) throw new Error("toDouble expects a non-negative value");
  if (v === 0n) return 0;
  const len = BigInt(v.toString(2).length);
  const shift = len - 53n;
  if (shift <= 0n) return Number(v) * 2 ** -Number(BITS);
  let m = v >> shift;
  const rem = v - (m << shift);
  const half = 1n << (shift - 1n);
  const off = rem > half ? rem - half : half - rem;
  if (off < GUARD) throw new Error(`value within the guard of a rounding midpoint at ${v}`);
  if (rem > half) m += 1n;
  return Number(m) * 2 ** Number(shift - BITS);
}

/** The folded key of point i of n: octant o and g = p/q in [0, 1/8], reduced. */
export function foldKey(i, n) {
  const a = 8 * i;
  const o = Math.floor(a / n);
  const r = a - o * n;
  const num = o % 2 === 0 ? r : n - r;
  const den = 8 * n;
  const d = gcd(num, den);
  return { o, p: num / d, q: den / d };
}

/** Every reduced key p/q the rings from MIN_SEGMENTS to MAX_SEGMENTS read, sorted by q then p. */
export function tableKeys() {
  const seen = new Map();
  for (let n = MIN_SEGMENTS; n <= MAX_SEGMENTS; n++) {
    for (let i = 0; i < n; i++) {
      const { p, q } = foldKey(i, n);
      seen.set(`${q}/${p}`, [q, p]);
    }
  }
  return [...seen.values()].sort((x, y) => x[0] - y[0] || x[1] - y[1]);
}

/** Correctly rounded [cos, sin] of 2 pi p / q, for p / q in [0, 1/8]. */
export function exactCosSin(p, q) {
  if (p === 0) return [1, 0];
  const theta = (2n * PI * BigInt(p)) / BigInt(q);
  const [c, s] = cosSin(theta);
  return [toDouble(c), toDouble(s)];
}

/** Correctly rounded [cos, sin] of a float64 angle in [0, pi/4], radians, taken as the exact dyadic value it holds. */
export function exactCosSinOf(x) {
  const scaled = x * 2 ** 100;
  if (!(x >= 0 && x <= 0.78) || !Number.isInteger(scaled)) throw new Error(`angle ${x} outside [0, 0.78] or finer than 2^-100`);
  const [c, s] = cosSin(BigInt(scaled) << (BITS - 100n));
  return [toDouble(c), toDouble(s)];
}

const earcutSource = fileURLToPath(new URL("../src/earcut.ts", import.meta.url));

/** ROTATION, ROTATION_STEP and ATTEMPTS as earcut.ts declares them; the generator reads them so they live in one place. */
export function earcutRotation() {
  const text = readFileSync(earcutSource, "utf8");
  const read = (name) => {
    const m = new RegExp(`export const ${name} = ([0-9.]+);`).exec(text);
    if (m === null) throw new Error(`earcut.ts declares no numeric ${name}`);
    return Number(m[1]);
  };
  return { rotation: read("ROTATION"), step: read("ROTATION_STEP"), attempts: read("ATTEMPTS") };
}

/** [cos, sin] of the earcut rotation for each attempt, at the angle ROTATION + attempt * ROTATION_STEP evaluates to. */
export function rotationRows() {
  const { rotation, step, attempts } = earcutRotation();
  return Array.from({ length: attempts }, (_, attempt) => exactCosSinOf(rotation + attempt * step));
}

/** The table source text. */
export function generate() {
  const keys = tableKeys();
  const lines = keys.map(([q, p]) => {
    const [c, s] = exactCosSin(p, q);
    return `  ${q}, ${p}, ${String(c)}, ${String(s)},`;
  });
  return [
    "// Generated by packages/geom/scripts/unit-circle.mjs; never edit by hand.",
    "// The committed unit-circle table of D-175: for each reduced turn fraction",
    "// p/q in [0, 1/8] that a ring of " + MIN_SEGMENTS + " to " + MAX_SEGMENTS + " points reads after the eight-way",
    "// fold, the correctly rounded float64 cos(2 pi p/q) and sin(2 pi p/q).",
    "// Rows are q, p, cos, sin, sorted by q then p. packages/geom/test/unit-circle.test.ts",
    "// regenerates this file and fails on any difference.",
    "",
    `/** Fewest points a table ring may have, count. */`,
    `export const UNIT_CIRCLE_MIN_SEGMENTS = ${MIN_SEGMENTS};`,
    `/** Most points a table ring may have, count. */`,
    `export const UNIT_CIRCLE_MAX_SEGMENTS = ${MAX_SEGMENTS};`,
    `/** Rows in UNIT_CIRCLE_TABLE, count. */`,
    `export const UNIT_CIRCLE_ROWS = ${keys.length};`,
    "",
    "/** Flat rows of four: q, p, cos(2 pi p/q), sin(2 pi p/q). */",
    "export const UNIT_CIRCLE_TABLE: readonly number[] = [",
    ...lines,
    "];",
    "",
    "/**",
    " * Flat rows of two, one per earcut attempt: the correctly rounded cos and sin",
    " * of the float64 ROTATION + attempt * ROTATION_STEP (earcut.ts).",
    " */",
    "export const EARCUT_ROTATION_TABLE: readonly number[] = [",
    ...rotationRows().map(([c, s]) => `  ${String(c)}, ${String(s)},`),
    "];",
    "",
  ].join("\n");
}

const target = fileURLToPath(new URL("../src/unit-circle.table.ts", import.meta.url));

/** The committed table source, for the regeneration test. */
export function committed() {
  return readFileSync(target, "utf8");
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  const text = generate();
  if (process.argv.includes("--write")) writeFileSync(target, text);
  else process.stdout.write(text);
}
