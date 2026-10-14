// The SLUG capsule solver (M02-T08 step 2): step(dt, omegaRad) and
// relax(iters) of designs/slug/legacy/slug.html lines 811 to 954, with the
// spawn of lines 695 to 705 (lineage slug.capsule-solver/slug-12). The
// order of operations and every constant are the page's; the constants
// arrive as ContactRows from the scene. The page's unseeded lateral
// velocity is drawn from the seeded generator in the same range (D-136).
// The solver measures where capsules go; it never decides a vend.

import type { Prng } from "../prng.js";
import {
  hitFunnel, inHood, nearestPocket, PAIR_D2_RELAX, PAIR_D2_STEP, LEN_EPS, plateTop, plateTopRect, spawnPos,
  type Capsule, type CapsuleGeometry, type ContactRows,
} from "./geometry.js";

/** Solver state: the capsules in spawn order, the rotor angle, deg, and the door. */
export interface CapsuleWorld {
  readonly g: CapsuleGeometry;
  readonly k: ContactRows;
  readonly caps: Capsule[];
  rotorDeg: number;
  doorOpen: boolean;
}

export function capsuleWorld(g: CapsuleGeometry, k: ContactRows): CapsuleWorld {
  return { g, k, caps: [], rotorDeg: 0, doorOpen: false };
}

/** Adds one capsule at the next lattice point; draws two numbers, x then y (slug.html line 701). */
export function addCapsule(w: CapsuleWorld, rng: Prng): Capsule {
  const span = w.k.spawnLateralSpan;
  const p = spawnPos(w.g.rows, w.caps.length);
  const vx = (rng.next() - 0.5) * span;
  const vy = (rng.next() - 0.5) * span;
  const c: Capsule = { p, v: { x: vx, y: vy, z: 0 } };
  w.caps.push(c);
  return c;
}

/** The physics half of the page's reset button (lines 973 to 976): empty, rotor to 0, add n. */
export function resetWorld(w: CapsuleWorld, n: number, rng: Prng): void {
  w.caps.length = 0;
  w.rotorDeg = 0;
  for (let i = 0; i < n; i++) addCapsule(w, rng);
}

/** One fixed step of dt seconds with the rotor turning at omegaRad rad/s (slug.html lines 811 to 912). */
export function step(w: CapsuleWorld, dt: number, omegaRad: number): void {
  const { g, k } = w;
  const P = g.rows;
  const r = g.capR;
  for (const c of w.caps) {
    c.v.z -= k.gravity * dt;
    c.p.x += c.v.x * dt; c.p.y += c.v.y * dt; c.p.z += c.v.z * dt;

    if (c.p.x - r < P.xl) { c.p.x = P.xl + r; c.v.x = Math.abs(c.v.x) * k.wallRestitution; }
    if (c.p.x + r > P.xr) { c.p.x = P.xr - r; c.v.x = -Math.abs(c.v.x) * k.wallRestitution; }
    if (c.p.y - r < P.yb) { c.p.y = P.yb + r; c.v.y = Math.abs(c.v.y) * k.wallRestitution; }
    if (c.p.y + r > P.yf && !(w.doorOpen && c.p.z < P.doorZ1 + r)) { c.p.y = P.yf - r; c.v.y = -Math.abs(c.v.y) * k.wallRestitution; }

    if (c.p.z > g.zCeilTop - r) {
      for (const f of g.funPlanes) hitFunnel(c, f, r, k);
      if (c.p.z > g.zCeilTop && c.p.y - r < P.yFback) { c.p.y = P.yFback + r; if (c.v.y < 0) c.v.y *= -k.wallRestitution; }
    }

    if (inHood(g, c.p.x, c.p.y)) {
      if (c.p.z < g.zCeilTop + r && c.p.z > g.zCeilTop - r) {
        c.p.z = g.zCeilTop + r;
        if (c.v.z < 0) { c.v.z *= -k.restBounce; c.v.x *= k.restKeep; c.v.y *= k.restKeep; }
      }
    } else {
      plateTopRect(c, g.zCeilTop, P.thr[0], P.thr[1], P.fb, r, k);
    }

    const np = nearestPocket(g, w.rotorDeg, c.p.x, c.p.y);
    if (c.p.z < g.zRotTop + r && c.p.z > g.zDeckTop - r) {
      const inPocket = c.p.z < g.zRotTop && np.d < P.pockD / 2;
      if (inPocket) {
        const lim = P.pockD / 2 - r;
        if (np.d > lim) {
          const ux = (c.p.x - np.cx) / np.d, uy = (c.p.y - np.cy) / np.d;
          c.p.x = np.cx + ux * lim; c.p.y = np.cy + uy * lim;
          const tvx = -omegaRad * c.p.y, tvy = omegaRad * c.p.x;
          c.v.x = c.v.x * k.pocketKeep + tvx * k.pocketCarry; c.v.y = c.v.y * k.pocketKeep + tvy * k.pocketCarry;
        } else {
          const tvx = -omegaRad * c.p.y, tvy = omegaRad * c.p.x;
          c.v.x += (tvx - c.v.x) * Math.min(1, dt * k.pocketRate); c.v.y += (tvy - c.v.y) * Math.min(1, dt * k.pocketRate);
        }
      } else if (c.p.z < g.zRotTop) {
        c.p.z = g.zRotTop + r;
        if (c.v.z < 0) c.v.z = 0;
      } else if (plateTop(c, g.zRotTop, np.cx, np.cy, P.pockD / 2, r, k) && omegaRad !== 0) {
        const tvx = -omegaRad * c.p.y, tvy = omegaRad * c.p.x, q = Math.min(1, dt * k.faceRate);
        c.v.x += (tvx - c.v.x) * q; c.v.y += (tvy - c.v.y) * q;
      }
    }
    plateTop(c, g.zDeckTop, P.exi[0], P.exi[1], P.exiD / 2, r, k);

    if (c.p.z < g.zDeckTop) {
      const n = g.rampN, o = g.rampO;
      const along = c.p.y - P.rampA[0];
      if (along > -k.rampMargin && along < P.rampB[0] - P.rampA[0] + k.rampMargin) {
        const d = (c.p.x - o.x) * n.x + (c.p.y - o.y) * n.y + (c.p.z - o.z) * n.z;
        if (d < r + P.t / 2) {
          const q = r + P.t / 2 - d;
          c.p.x += n.x * q; c.p.y += n.y * q; c.p.z += n.z * q;
          const vn = c.v.x * n.x + c.v.y * n.y + c.v.z * n.z;
          if (vn < 0) {
            const s = -vn * k.rampReflect;
            c.v.x += n.x * s; c.v.y += n.y * s; c.v.z += n.z * s;
            c.v.x *= k.rampKeepX; c.v.y *= k.rampKeepY;
          }
        }
      }
      const lim = P.rampW / 2 - r;
      if (c.p.x > lim) { c.p.x = lim; c.v.x = -Math.abs(c.v.x) * k.wallRestitution; }
      if (c.p.x < -lim) { c.p.x = -lim; c.v.x = Math.abs(c.v.x) * k.wallRestitution; }
      if (c.p.z - r < P.zBase + P.t) {
        c.p.z = P.zBase + P.t + r;
        if (c.v.z < 0) { c.v.z *= -k.baseBounce; c.v.x *= k.baseKeep; c.v.y *= k.baseKeep; }
      }
    }
  }

  const caps = w.caps;
  const R = 2 * r;
  for (let i = 0; i < caps.length; i++) for (let j = i + 1; j < caps.length; j++) {
    const a = caps[i]!, b = caps[j]!;
    const dx = b.p.x - a.p.x, dy = b.p.y - a.p.y, dz = b.p.z - a.p.z;
    const d2 = dx * dx + dy * dy + dz * dz;
    if (d2 < R * R && d2 > PAIR_D2_STEP) {
      const d = Math.sqrt(d2), q = (R - d) / 2 / d;
      a.p.x -= dx * q; a.p.y -= dy * q; a.p.z -= dz * q;
      b.p.x += dx * q; b.p.y += dy * q; b.p.z += dz * q;
      const nx = dx / d, ny = dy / d, nz = dz / d;
      const rv = (b.v.x - a.v.x) * nx + (b.v.y - a.v.y) * ny + (b.v.z - a.v.z) * nz;
      if (rv < 0) {
        const jimp = -rv * k.pairImpulse;
        a.v.x -= nx * jimp; a.v.y -= ny * jimp; a.v.z -= nz * jimp;
        b.v.x += nx * jimp; b.v.y += ny * jimp; b.v.z += nz * jimp;
      }
    }
  }
  relax(w, k.relaxIters);
  for (const c of caps) {
    const sp = Math.hypot(c.v.x, c.v.y, c.v.z);
    if (sp > k.speedCap) { const s = k.speedCap / sp; c.v.x *= s; c.v.y *= s; c.v.z *= s; }
    c.v.x *= k.damping; c.v.y *= k.damping; c.v.z *= k.damping;
  }
}

/** Position-only passes: pairs, box, pocket clamps and the exit rule (slug.html lines 916 to 954). */
export function relax(w: CapsuleWorld, iters: number): void {
  const { g } = w;
  const P = g.rows;
  const r = g.capR, R = 2 * r;
  const caps = w.caps;
  for (let it = 0; it < iters; it++) {
    for (let i = 0; i < caps.length; i++) for (let j = i + 1; j < caps.length; j++) {
      const a = caps[i]!, b = caps[j]!;
      const dx = b.p.x - a.p.x, dy = b.p.y - a.p.y, dz = b.p.z - a.p.z;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < R * R && d2 > PAIR_D2_RELAX) {
        const d = Math.sqrt(d2), q = (R - d) / 2 / d;
        a.p.x -= dx * q; a.p.y -= dy * q; a.p.z -= dz * q;
        b.p.x += dx * q; b.p.y += dy * q; b.p.z += dz * q;
      }
    }
    for (const c of caps) {
      if (c.p.x - r < P.xl) c.p.x = P.xl + r;
      if (c.p.x + r > P.xr) c.p.x = P.xr - r;
      if (c.p.y - r < P.yb) c.p.y = P.yb + r;
      if (c.p.y + r > P.yf && !(w.doorOpen && c.p.z < P.doorZ1 + r)) c.p.y = P.yf - r;
      if (c.p.z - r < P.zBase + P.t) c.p.z = P.zBase + P.t + r;

      if (c.p.z < g.zRotTop && c.p.z > g.zDeckTop) {
        const np = nearestPocket(g, w.rotorDeg, c.p.x, c.p.y), lim = P.pockD / 2 - r;
        if (np.d > lim) {
          const inCost = np.d - lim, upCost = g.zRotTop + r - c.p.z;
          if (inCost < upCost && np.d > LEN_EPS) {
            const q = lim / np.d;
            c.p.x = np.cx + (c.p.x - np.cx) * q;
            c.p.y = np.cy + (c.p.y - np.cy) * q;
          } else c.p.z = g.zRotTop + r;
        }
      }
      if (c.p.z < g.zDeckTop + r && c.p.z > g.zDeckTop - r) {
        if (Math.hypot(c.p.x - P.exi[0], c.p.y - P.exi[1]) > P.exiD / 2 - r) c.p.z = g.zDeckTop + r;
      }
    }
  }
}
