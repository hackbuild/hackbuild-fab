// Trigonometry in IEEE double arithmetic alone, so a sim that calls it
// gives the same bits on every machine (D-232 follow-up, CI-03). V8 computes
// Math.sin, Math.cos, Math.tan and Math.atan2 in compiled C++, and the Node
// 22.18.0 builds disagree by one ulp: Linu// answer everywhere. Every constant is the C source's. Argument reduction
// covers |x| up to 2^20 pi/2 (about 1647099 rad); past that the
// Payne-Hanek path is not ported and the call stops. x64 and macOS arm64 differ on
// 136 of 92695 atan2 calls, 2907 of 775434 sin calls and 2877 of 775431 cos
// calls of one SLUG trial (computed 2026-10-14, evidence in
// fab-knowledge/evals/2026-10-14/calls/). JavaScript +, -, *, / and
// Math.sqrt are correctly rounded by the language, so these ports of fdlibm
// 5.3 as V8 carries it in src/base/ieee754.cc (s_sin.c, s_cos.c, s_tan.c,
// k_sin.c, k_cos.c, k_tan.c, e_rem_pio2.c, s_atan.c, e_atan2.c) give one
// answer everywhere. Every constant is the C source's. Argument reduction
// covers |x| up to 2^20 pi/2 (about 1647099 rad); past that the Payne-Hanek
// path is not ported and the call stops.
//
// The notice the C sources carry, preserved as they ask:
// Copyright (C) 1993 by Sun Microsystems, Inc. All rights reserved.
// Developed at SunPro, a Sun Microsystems, Inc. business.
// Permission to use, copy, modify, and distribute this
// software is freely granted, provided that this notice
// is preserved.

const view = new DataView(new ArrayBuffer(8));

/** High 32 bits of a double, signed. */
function hi(x: number): number {
  view.setFloat64(0, x);
  return view.getInt32(0);
}

/** Low 32 bits of a double, unsigned. */
function lo(x: number): number {
  view.setFloat64(0, x);
  return view.getUint32(4);
}

/** The double with high word h and low word l. */
function fromWords(h: number, l: number): number {
  view.setInt32(0, h);
  view.setUint32(4, l);
  return view.getFloat64(0);
}

/** x with its low word cleared. */
function zeroLow(x: number): number {
  return fromWords(hi(x), 0);
}

const S1 = -1.66666666666666324348e-01, S2 = 8.33333333332248946124e-03, S3 = -1.98412698298579493134e-04;
const S4 = 2.75573137070700676789e-06, S5 = -2.50507602534068634195e-08, S6 = 1.58969099521155010221e-10;

/** k_sin.c: sin on [-pi/4, pi/4], y the tail of x, iy 0 when y is 0. */
function kernelSin(x: number, y: number, iy: number): number {
  const ix = hi(x) & 0x7fffffff;
  if (ix < 0x3e400000 && Math.trunc(x) === 0) return x;
  const z = x * x, v = z * x;
  const r = S2 + z * (S3 + z * (S4 + z * (S5 + z * S6)));
  if (iy === 0) return x + v * (S1 + z * r);
  return x - ((z * (0.5 * y - v * r) - y) - v * S1);
}

const C1 = 4.16666666666666019037e-02, C2 = -1.38888888888741095749e-03, C3 = 2.48015872894767294178e-05;
const C4 = -2.75573143513906633035e-07, C5 = 2.08757232129817482790e-09, C6 = -1.13596475577881948265e-11;

/** k_cos.c: cos on [-pi/4, pi/4], y the tail of x. */
function kernelCos(x: number, y: number): number {
  const ix = hi(x) & 0x7fffffff;
  if (ix < 0x3e400000 && Math.trunc(x) === 0) return 1;
  const z = x * x;
  const r = z * (C1 + z * (C2 + z * (C3 + z * (C4 + z * (C5 + z * C6)))));
  if (ix < 0x3fd33333) return 1 - (0.5 * z - (z * r - x * y));
  const qx = ix > 0x3fe90000 ? 0.28125 : fromWords(ix - 0x00200000, 0);
  const hz = 0.5 * z - qx, a = 1 - qx;
  return a - (hz - (z * r - x * y));
}

const T = [
  3.33333333333334091986e-01, 1.33333333333201242699e-01, 5.39682539762260521377e-02, 2.18694882948595424599e-02,
  8.86323982359930005737e-03, 3.59207910759131235356e-03, 1.45620945432529025516e-03, 5.88041240820264096874e-04,
  2.46463134818469906812e-04, 7.81794442939557092300e-05, 7.14072491382608190305e-05, -1.85586374855275456654e-05,
  2.59073051863633712884e-05,
] as const;
const PIO4 = 7.85398163397448278999e-01, PIO4LO = 3.06161699786838301793e-17;

/** k_tan.c: tan on [-pi/4, pi/4] when iy is 1, -1/tan when iy is -1. */
function kernelTan(x0: number, y0: number, iy: number): number {
  let x = x0, y = y0;
  const hx = hi(x), ix = hx & 0x7fffffff;
  if (ix < 0x3e300000 && Math.trunc(x) === 0) {
    if (((ix | lo(x)) | (iy + 1)) === 0) return 1 / Math.abs(x);
    if (iy === 1) return x;
    const w = x + y, z = zeroLow(w), v = y - (z - x);
    const a = -1 / w, t = zeroLow(a), s = 1 + t * z;
    return t + a * (s + t * v);
  }
  if (ix >= 0x3fe59428) {
    if (hx < 0) { x = -x; y = -y; }
    const z = PIO4 - x, w = PIO4LO - y;
    x = z + w; y = 0;
  }
  const z = x * x, w = z * z;
  let r = T[1] + w * (T[3] + w * (T[5] + w * (T[7] + w * (T[9] + w * T[11]))));
  const v = z * (T[2] + w * (T[4] + w * (T[6] + w * (T[8] + w * (T[10] + w * T[12])))));
  const s = z * x;
  r = y + z * (s * (r + v) + y);
  r += T[0] * s;
  const sum = x + r;
  if (ix >= 0x3fe59428) {
    const vv = iy;
    return (1 - ((hx >> 30) & 2)) * (vv - 2 * (x - (sum * sum / (sum + vv) - r)));
  }
  if (iy === 1) return sum;
  const zz = zeroLow(sum), vv = r - (zz - x);
  const a = -1 / sum, t = zeroLow(a), ss = 1 + t * zz;
  return t + a * (ss + t * vv);
}

const INVPIO2 = 6.36619772367581382433e-01;
const PIO2_1 = 1.57079632673412561417e+00, PIO2_1T = 6.07710050650619224932e-11;
const PIO2_2 = 6.07710050630396597660e-11, PIO2_2T = 2.02226624879595063154e-21;
const PIO2_3 = 2.02226624871116645580e-21, PIO2_3T = 8.47842766036889956997e-32;
const NPIO2_HW = [
  0x3ff921fb, 0x400921fb, 0x4012d97c, 0x401921fb, 0x401f6a7a, 0x4022d97c, 0x4025fdbb, 0x402921fb,
  0x402c463a, 0x402f6a7a, 0x4031475c, 0x4032d97c, 0x40346b9c, 0x4035fdbb, 0x40378fdb, 0x403921fb,
  0x403ab41b, 0x403c463a, 0x403dd85a, 0x403f6a7a, 0x40407e4c, 0x4041475c, 0x4042106c, 0x4042d97c,
  0x4043a28c, 0x40446b9c, 0x404534ac, 0x4045fdbb, 0x4046c6cb, 0x40478fdb, 0x404858eb, 0x404921fb,
] as const;

/** Largest |x| the ported reduction covers, rad: high word 0x413921fb, 2^20 pi/2. */
export const TRIG_ARG_LIMIT = fromWords(0x413921fb, 0xffffffff);

/** e_rem_pio2.c: x = n pi/2 + (y0 + y1), returns [n, y0, y1]. */
function remPio2(x: number): [number, number, number] {
  const hx = hi(x), ix = hx & 0x7fffffff;
  if (ix <= 0x3fe921fb) return [0, x, 0];
  if (ix < 0x4002d97c) {
    if (hx > 0) {
      let z = x - PIO2_1;
      if (ix !== 0x3ff921fb) { const y0 = z - PIO2_1T; return [1, y0, (z - y0) - PIO2_1T]; }
      z -= PIO2_2;
      const y0 = z - PIO2_2T;
      return [1, y0, (z - y0) - PIO2_2T];
    }
    let z = x + PIO2_1;
    if (ix !== 0x3ff921fb) { const y0 = z + PIO2_1T; return [-1, y0, (z - y0) + PIO2_1T]; }
    z += PIO2_2;
    const y0 = z + PIO2_2T;
    return [-1, y0, (z - y0) + PIO2_2T];
  }
  if (ix <= 0x413921fb) {
    let t = Math.abs(x);
    const n = Math.trunc(t * INVPIO2 + 0.5), fn = n;
    let r = t - fn * PIO2_1, w = fn * PIO2_1T, y0: number;
    if (n < 32 && ix !== NPIO2_HW[n - 1]) {
      y0 = r - w;
    } else {
      const j = ix >> 20;
      y0 = r - w;
      let i = j - ((hi(y0) >> 20) & 0x7ff);
      if (i > 16) {
        t = r; w = fn * PIO2_2; r = t - w; w = fn * PIO2_2T - ((t - r) - w); y0 = r - w;
        i = j - ((hi(y0) >> 20) & 0x7ff);
        if (i > 49) { t = r; w = fn * PIO2_3; r = t - w; w = fn * PIO2_3T - ((t - r) - w); y0 = r - w; }
      }
    }
    const y1 = (r - y0) - w;
    return hx < 0 ? [-n, -y0, -y1] : [n, y0, y1];
  }
  if (ix >= 0x7ff00000) return [0, x - x, x - x];
  throw new RangeError(`trig argument ${x} rad, legal |x| up to ${TRIG_ARG_LIMIT} rad, set by the ported reduction (2^20 pi/2)`);
}

/** s_sin.c. */
export function sin(x: number): number {
  const ix = hi(x) & 0x7fffffff;
  if (ix <= 0x3fe921fb) return kernelSin(x, 0, 0);
  if (ix >= 0x7ff00000) return x - x;
  const [n, y0, y1] = remPio2(x);
  switch (n & 3) {
    case 0: return kernelSin(y0, y1, 1);
    case 1: return kernelCos(y0, y1);
    case 2: return -kernelSin(y0, y1, 1);
    default: return -kernelCos(y0, y1);
  }
}

/** s_cos.c. */
export function cos(x: number): number {
  const ix = hi(x) & 0x7fffffff;
  if (ix <= 0x3fe921fb) return kernelCos(x, 0);
  if (ix >= 0x7ff00000) return x - x;
  const [n, y0, y1] = remPio2(x);
  switch (n & 3) {
    case 0: return kernelCos(y0, y1);
    case 1: return -kernelSin(y0, y1, 1);
    case 2: return -kernelCos(y0, y1);
    default: return kernelSin(y0, y1, 1);
  }
}

/** s_tan.c. */
export function tan(x: number): number {
  const ix = hi(x) & 0x7fffffff;
  if (ix <= 0x3fe921fb) return kernelTan(x, 0, 1);
  if (ix >= 0x7ff00000) return x - x;
  const [n, y0, y1] = remPio2(x);
  return kernelTan(y0, y1, 1 - ((n & 1) << 1));
}

const ATANHI = [4.63647609000806093515e-01, 7.85398163397448278999e-01, 9.82793723247329054082e-01, 1.57079632679489655800e+00] as const;
const ATANLO = [2.26987774529616870924e-17, 3.06161699786838301793e-17, 1.39033110312309984516e-17, 6.12323399573676603587e-17] as const;
const AT = [
  3.33333333333329318027e-01, -1.99999999998764832476e-01, 1.42857142725034663711e-01, -1.11111104054623557880e-01,
  9.09088713343650656196e-02, -7.69187620504482999495e-02, 6.66107313738753120669e-02, -5.83357013379057348645e-02,
  4.97687799461593236017e-02, -3.65315727442169155270e-02, 1.62858201153657823623e-02,
] as const;

/** s_atan.c. */
export function atan(x0: number): number {
  let x = x0;
  const hx = hi(x), ix = hx & 0x7fffffff;
  if (ix >= 0x44100000) {
    if (ix > 0x7ff00000 || (ix === 0x7ff00000 && lo(x) !== 0)) return x + x;
    return hx > 0 ? ATANHI[3] + ATANLO[3] : -ATANHI[3] - ATANLO[3];
  }
  let id: number;
  if (ix < 0x3fdc0000) {
    if (ix < 0x3e400000) return x;
    id = -1;
  } else {
    x = Math.abs(x);
    if (ix < 0x3ff30000) {
      if (ix < 0x3fe60000) { id = 0; x = (2 * x - 1) / (2 + x); } else { id = 1; x = (x - 1) / (x + 1); }
    } else if (ix < 0x40038000) { id = 2; x = (x - 1.5) / (1 + 1.5 * x); } else { id = 3; x = -1 / x; }
  }
  const z = x * x, w = z * z;
  const s1 = z * (AT[0] + w * (AT[2] + w * (AT[4] + w * (AT[6] + w * (AT[8] + w * AT[10])))));
  const s2 = w * (AT[1] + w * (AT[3] + w * (AT[5] + w * (AT[7] + w * AT[9]))));
  if (id < 0) return x - x * (s1 + s2);
  const r = ATANHI[id]! - ((x * (s1 + s2) - ATANLO[id]!) - x);
  return hx < 0 ? -r : r;
}

const PI_O_4 = 7.8539816339744827900e-01, PI_O_2 = 1.5707963267948965580e+00;
const PI = 3.1415926535897931160e+00, PI_LO = 1.2246467991473531772e-16, TINY = 1e-300;

/** e_atan2.c. */
export function atan2(y: number, x: number): number {
  const hx = hi(x), ix = hx & 0x7fffffff, lx = lo(x);
  const hy = hi(y), iy = hy & 0x7fffffff, ly = lo(y);
  if ((ix | (lx !== 0 ? 1 : 0)) > 0x7ff00000 || (iy | (ly !== 0 ? 1 : 0)) > 0x7ff00000) return x + y;
  if (hx === 0x3ff00000 && lx === 0) return atan(y);
  let m = ((hy >> 31) & 1) | ((hx >> 30) & 2);
  if ((iy | ly) === 0) {
    switch (m) {
      case 0: case 1: return y;
      case 2: return PI + TINY;
      default: return -PI - TINY;
    }
  }
  if ((ix | lx) === 0) return hy < 0 ? -PI_O_2 - TINY : PI_O_2 + TINY;
  if (ix === 0x7ff00000) {
    if (iy === 0x7ff00000) {
      switch (m) {
        case 0: return PI_O_4 + TINY;
        case 1: return -PI_O_4 - TINY;
        case 2: return 3 * PI_O_4 + TINY;
        default: return -3 * PI_O_4 - TINY;
      }
    }
    switch (m) {
      case 0: return 0;
      case 1: return -0;
      case 2: return PI + TINY;
      default: return -PI - TINY;
    }
  }
  if (iy === 0x7ff00000) return hy < 0 ? -PI_O_2 - TINY : PI_O_2 + TINY;
  const k = (iy - ix) >> 20;
  let z: number;
  if (k > 60) { z = PI_O_2 + 0.5 * PI_LO; m &= 1; }
  else if (hx < 0 && k < -60) z = 0;
  else z = atan(Math.abs(y / x));
  switch (m) {
    case 0: return z;
    case 1: return -z;
    case 2: return PI - (z - PI_LO);
    default: return (z - PI_LO) - PI;
  }
}
