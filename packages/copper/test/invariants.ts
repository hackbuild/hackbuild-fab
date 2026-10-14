// Spacing and connectivity of a route read from its output geometry alone,
// so a clean route is shown clean without trusting the router's own
// conflict count (M05-T08).

import { expect } from "vitest";
import type { RouteResult } from "../src/route/negotiated.js";

// Grid cells a net's polylines pass through, per layer, rebuilt from the
// simplified points: each segment runs in one of the eight grid directions.
function cellsOf(n: { polys: readonly (readonly (readonly [number, number])[])[][] }, gp: number): [Set<string>, Set<string>] {
  const out: [Set<string>, Set<string>] = [new Set(), new Set()];
  n.polys.forEach((layer, l) => {
    for (const p of layer) {
      for (let i = 0; i < p.length; i++) {
        const a = p[i]!, b = p[Math.min(i + 1, p.length - 1)]!;
        const di = Math.round((b[0] - a[0]) / gp), dj = Math.round((b[1] - a[1]) / gp);
        const steps = Math.max(Math.abs(di), Math.abs(dj));
        if (steps > 0) expect(Math.abs(di) === Math.abs(dj) || di === 0 || dj === 0, "segment off the eight directions").toBe(true);
        for (let t = 0; t <= steps; t++) {
          const ii = Math.round(a[0] / gp) + (steps ? Math.round((di * t) / steps) : 0);
          const jj = Math.round(a[1] / gp) + (steps ? Math.round((dj * t) / steps) : 0);
          out[l as 0 | 1].add(`${ii},${jj}`);
        }
      }
    }
  });
  return out;
}

// Spacing and connectivity read from the output geometry alone, so they
// hold without trusting the router's own conflict count.
export function invariants(r: RouteResult): { minGap: number; split: string[] } {
  const gp = r.grid.gp;
  const cells = r.nets.map((n) => cellsOf(n, gp));
  let minGap = Infinity;
  for (let a = 0; a < cells.length; a++) for (let b = a + 1; b < cells.length; b++) for (const l of [0, 1] as const) {
    for (const ca of cells[a]![l]) for (const cb of cells[b]![l]) {
      const [ia, ja] = ca.split(",").map(Number) as [number, number], [ib, jb] = cb.split(",").map(Number) as [number, number];
      minGap = Math.min(minGap, Math.hypot(ia - ib, ja - jb) * gp);
    }
  }
  const split: string[] = [];
  r.nets.forEach((n, k) => {
    const [c0, c1] = cells[k]!;
    const all = new Set([...[...c0].map((c) => `0,${c}`), ...[...c1].map((c) => `1,${c}`)]);
    const vias = new Set(n.vias.map(([x, y]) => `${Math.round(x / gp)},${Math.round(y / gp)}`));
    // terminals are posts through both layers
    const terms = n.stubs.map(([, c]) => `${Math.round(c[0] / gp)},${Math.round(c[1] / gp)}`);
    const nodes = new Set([...all, ...terms.flatMap((t) => [`0,${t}`, `1,${t}`])]);
    const seen = new Set<string>([`0,${terms[0]!}`]);
    const stack = [`0,${terms[0]!}`];
    while (stack.length) {
      const [l, i, j] = stack.pop()!.split(",").map(Number) as [number, number, number];
      const next = [`${1 - l},${i},${j}`];
      for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) if (di || dj) next.push(`${l},${i + di},${j + dj}`);
      for (const q of next) {
        if (!nodes.has(q) || seen.has(q)) continue;
        const cross = q.startsWith(`${1 - l},`);
        if (cross && !(vias.has(`${i},${j}`) || terms.includes(`${i},${j}`))) continue;
        seen.add(q); stack.push(q);
      }
    }
    for (const t of terms) if (!seen.has(`0,${t}`)) split.push(`${n.name} terminal ${t}`);
  });
  return { minGap, split };
}
