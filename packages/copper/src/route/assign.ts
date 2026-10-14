// Order preserving net to terminal assignment, ported from TOGGLE's route
// search (toggle src/src/part2d.js lines 118 to 143, lineage
// toggle.build/part2d). Nets and terminals are both taken in angular order
// from north counter clockwise; for every rotation of the terminal ring a
// dynamic program picks an order preserving injection of nets into
// terminals scoring angular distance plus a weight times the terminal
// radius, and the distinct maps come back sorted by cost.

/** Weight of the terminal radius in the assignment cost, rad per mm (part2d.js line 133). */
export const ASSIGN_RADIUS_WEIGHT = 0.02;

/** An angle in [0, 2 pi) (TOGGLE part2a.js line 45). */
export function angNorm(a: number): number {
  a %= 2 * Math.PI;
  return a < 0 ? a + 2 * Math.PI : a;
}

/** Unsigned angular distance, 0 to pi (TOGGLE part2a.js line 46). */
export function angDist(a: number, b: number): number {
  const d = Math.abs(angNorm(a) - angNorm(b));
  return Math.min(d, 2 * Math.PI - d);
}

export interface Assignment {
  /** The map joined with commas; two rotations giving one map share it. */
  readonly key: string;
  /** map[k] is the terminal index of net k. */
  readonly map: readonly number[];
  readonly cost: number;
}

/**
 * Every distinct order preserving map of nets (by their lead angle, rad,
 * measured from +x) into terminals (by position, mm), cheapest first.
 */
export function assignments(terms: readonly { readonly x: number; readonly y: number }[], netAngles: readonly number[]): Assignment[] {
  const psiOf = (x: number, y: number): number => angNorm(Math.atan2(y, x) - Math.PI / 2);
  const nets = netAngles.map((a, k) => ({ k, psi: angNorm(a - Math.PI / 2) })).sort((p, q) => p.psi - q.psi);
  const ring = terms.map((t, k) => ({ k, psi: psiOf(t.x, t.y), d: Math.hypot(t.x, t.y) })).sort((p, q) => p.psi - q.psi || p.d - q.d);
  const m = ring.length, kk = nets.length;
  const results: Assignment[] = [];
  // more nets than terminals has no injection; TOGGLE indexed past the ring here
  if (kk > m) return results;
  for (let off = 0; off < m; off++) {
    const P: (typeof ring)[number][] = [];
    for (let q = 0; q < m; q++) P.push(ring[(off + q) % m]!);
    const dp: number[][] = [], ch: number[][] = [];
    for (let i = 0; i <= kk; i++) { dp.push(new Array<number>(m + 1).fill(Infinity)); ch.push(new Array<number>(m + 1).fill(0)); }
    for (let j = 0; j <= m; j++) dp[0]![j] = 0;
    for (let i = 1; i <= kk; i++) for (let j = i; j <= m; j++) {
      const skip = dp[i]![j - 1]!;
      const take = dp[i - 1]![j - 1]! + angDist(nets[i - 1]!.psi, P[j - 1]!.psi) + ASSIGN_RADIUS_WEIGHT * P[j - 1]!.d;
      if (take <= skip) { dp[i]![j] = take; ch[i]![j] = 1; } else { dp[i]![j] = skip; ch[i]![j] = 0; }
    }
    const map = new Array<number>(kk);
    let i = kk, j = m;
    while (i > 0) { if (ch[i]![j]) { map[nets[i - 1]!.k] = P[j - 1]!.k; i--; j--; } else j--; }
    const key = map.join(",");
    if (!results.some((r) => r.key === key)) results.push({ key, map, cost: dp[kk]![m]! });
  }
  return results.sort((a, b) => a.cost - b.cost);
}
