// FRET's isomorphic lattice (gen_fret.py lines 318 to 339): every
// physically adjacent pair of keys walks the same interval for the same
// move, up a column, up-right and down-right, where odd columns sit half a
// key higher so the up-right neighbour of an odd column is one row up; no
// note repeats; the range is at least the board's floor; the keys cover
// enough of the home scale. The layout cannot silently stop being
// isomorphic (benches-conductive-b.md A.10).

import type { GateStep } from "@hackbuild/copper";
import { boolGate, fill, intervalGate, sheetTarget, type Gate, type GateCtx } from "./gate.js";

type Step = Extract<GateStep, { kind: "isomorphic" }>;

/** Python's repr of a sorted list of ints. */
const pyInts = (xs: Iterable<number>): string => `[${[...xs].sort((a, b) => a - b).join(", ")}]`;
const mod12 = (x: number): number => ((x % 12) + 12) % 12;

export function isomorphic(ctx: GateCtx, s: Step): Gate[] {
  const g = s.grid;
  const cols = g.length;
  const rows = g[0]?.length ?? 0;
  const vert = new Set<number>(), upRight = new Set<number>(), downRight = new Set<number>();
  for (let c = 0; c < cols; c++) for (let r = 0; r + 1 < rows; r++) vert.add(g[c]![r + 1]! - g[c]![r]!);
  for (let c = 0; c + 1 < cols; c++) {
    const odd = s.oddRaised && c % 2 === 1;
    for (let r = 0; r < rows; r++) {
      const ur = odd ? r + 1 : r;
      const dr = odd ? r : r - 1;
      if (ur >= 0 && ur < rows) upRight.add(g[c + 1]![ur]! - g[c]![r]!);
      if (dr >= 0 && dr < rows) downRight.add(g[c + 1]![dr]! - g[c]![r]!);
    }
  }
  const all = g.flat().sort((a, b) => a - b);
  const distinct = new Set(all).size;
  const range = all[all.length - 1]! - all[0]!;
  const have = new Set(all.map((x) => mod12(x - s.base)));
  const degrees = s.scale.filter((d) => have.has(d)).length;
  const t = sheetTarget(ctx, "copper");
  const only = (set: Set<number>, want: number): boolean => set.size === 1 && set.has(want);
  return [
    boolGate("CHK-NET-44", only(vert, s.up), fill(s.msgs.up, { set: pyInts(vert) }), t, `up a column is ${s.up} semitones everywhere`),
    boolGate("CHK-NET-44", only(upRight, s.upRight), fill(s.msgs.upRight, { set: pyInts(upRight) }), t, `up-right is ${s.upRight} semitones everywhere`),
    boolGate("CHK-NET-44", only(downRight, s.downRight), fill(s.msgs.downRight, { set: pyInts(downRight) }), t, `down-right is ${s.downRight} semitones everywhere`),
    boolGate("CHK-NET-44", distinct === cols * rows, fill(s.msgs.distinct, { n: distinct }), t, "every key plays its own note"),
    intervalGate("CHK-NET-44", range >= s.rangeMin, fill(s.msgs.range, { range, lo: s.names[mod12(all[0]!)]!, hi: s.names[mod12(all[all.length - 1]!)]! }), t,
      range, s.rangeMin, null, "semitones", `the lattice spans at least ${s.rangeMin} semitones`),
    intervalGate("CHK-NET-44", degrees >= s.degreesMin, fill(s.msgs.degrees, { k: degrees }), t, degrees, s.degreesMin, s.scale.length, "degrees",
      `at least ${s.degreesMin} of the ${s.scale.length} degrees of the home scale`),
  ];
}
