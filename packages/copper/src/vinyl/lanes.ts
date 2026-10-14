// The lane ranker, one primitive for the KEYWAY family's rail-and-fan
// escapes (D-092). Each net runs a source drop from the sensor to its
// lane, along the lane, then a finger drop to its terminal. Inputs are the
// arrival coordinate, the terminal coordinate, the margin (trace width
// plus clearance) and the lanes, farthest from the rail first; orientation
// says which axis those coordinates run along (an x rail with horizontal
// lanes, or STAVE's y rail down the left edge with vertical lanes). The
// algorithm reads only the scalars, so orientation is carried to the
// result for the caller that draws the polylines.
//
// Version 1, greedy with two conditions (gen_quadrant.py lines 132 to 163,
// gen_spline.py lines 158 to 180): nets by travel, longest first, each on
// the farthest lane that keeps its span clear of that lane's spans and
// keeps every vertical clear of the lanes it passes through.
//
// Version 2, constraint ranking (gen_tessera.py lines 183 to 225,
// gen_fret.py lines 224 to 250, gen_stave.py lines 125 to 154): p is
// farther than q when p's arrival lands in q's span (p's source drop
// crosses q's lane), q is farther than p when p's terminal lands in q's
// span; rank is the longest path, relaxed up to n + 2 times; the lane is
// lanes[need - 1 - rank], since lanes[0] is the farthest and the index has
// to count down. A cycle is reported with two nets on it.

export type RailAxis = "x" | "y";

export interface LaneNet {
  readonly net: string;
  readonly arrive: number;
  readonly terminal: number;
}

export interface LaneInput {
  readonly nets: readonly LaneNet[];
  /** Trace width plus clearance, mm. */
  readonly margin: number;
  /** Lane coordinates, farthest from the rail first. */
  readonly lanes: readonly number[];
  readonly rail: RailAxis;
}

export type LaneResult =
  | { readonly ok: true; readonly rail: RailAxis; readonly lane: Readonly<Record<string, number>>; readonly used: number; readonly need: number; readonly rank?: Readonly<Record<string, number>> }
  | { readonly ok: false; readonly reason: "cycle"; readonly nets: readonly [string, string]; readonly message: string }
  | { readonly ok: false; readonly reason: "lanes"; readonly need: number; readonly have: number; readonly message: string }
  | { readonly ok: false; readonly reason: "no-lane"; readonly net: string; readonly message: string }
  | { readonly ok: false; readonly reason: "overlap"; readonly nets: readonly [string, string]; readonly lane: number; readonly message: string };

const byArrival = (nets: readonly LaneNet[]): LaneNet[] => [...nets].sort((a, b) => a.arrive - b.arrive);
const span = (n: LaneNet): readonly [number, number] => [Math.min(n.terminal, n.arrive), Math.max(n.terminal, n.arrive)];
const usedCount = (lane: Readonly<Record<string, number>>): number => new Set(Object.values(lane)).size;

/** Version 1: greedy, longest travel first, farthest lane first, both conditions. */
export function rankLanesGreedy(input: LaneInput): LaneResult {
  const M = input.margin;
  const clears = (lo: number, hi: number, x: number): boolean => x < lo - M || x > hi + M;
  const order = byArrival(input.nets);
  const travel = (n: LaneNet): number => Math.abs(n.terminal - n.arrive);
  const used = new Map<number, { lo: number; hi: number; q: LaneNet }[]>(input.lanes.map((y) => [y, []]));
  const nearer = new Map(input.lanes.map((y, i) => [y, i]));
  const lane: Record<string, number> = {};
  for (const net of [...order].sort((a, b) => travel(b) - travel(a))) {
    const [lo, hi] = span(net);
    let placed = false;
    for (const y of input.lanes) {
      let ok = used.get(y)!.every(({ lo: a, hi: b }) => hi < a - M || lo > b + M);
      for (const yy of input.lanes) {
        for (const { lo: a, hi: b, q } of used.get(yy)!) {
          if (nearer.get(yy)! > nearer.get(y)!) ok = ok && clears(a, b, net.terminal) && clears(lo, hi, q.arrive);
          else if (nearer.get(yy)! < nearer.get(y)!) ok = ok && clears(a, b, net.arrive) && clears(lo, hi, q.terminal);
        }
      }
      if (ok) {
        lane[net.net] = y;
        used.get(y)!.push({ lo, hi, q: net });
        placed = true;
        break;
      }
    }
    if (!placed) return { ok: false, reason: "no-lane", net: net.net, message: `no free fan lane for ${net.net}: add a lane` };
  }
  const u = usedCount(lane);
  return { ok: true, rail: input.rail, lane, used: u, need: u };
}

/** A cycle in the farther-than graph, as the first two nets on it. */
function findCycle(order: readonly LaneNet[], farther: ReadonlyMap<string, ReadonlySet<string>>): [string, string] {
  const state = new Map<string, number>();
  const stack: string[] = [];
  const visit = (p: string): [string, string] | undefined => {
    state.set(p, 1);
    stack.push(p);
    for (const q of farther.get(p) ?? []) {
      if (state.get(q) === 1) {
        const at = stack.indexOf(q);
        const cyc = stack.slice(at);
        return [cyc[0]!, cyc[1] ?? cyc[0]!];
      }
      if (state.get(q) === undefined) {
        const r = visit(q);
        if (r !== undefined) return r;
      }
    }
    stack.pop();
    state.set(p, 2);
    return undefined;
  };
  for (const n of order) {
    if (state.get(n.net) === undefined) {
      const r = visit(n.net);
      if (r !== undefined) return r;
    }
  }
  return [order[0]?.net ?? "", order[1]?.net ?? ""];
}

/** Version 2: rank the farther-than partial order, index down the lane list. */
export function rankLanes(input: LaneInput): LaneResult {
  const M = input.margin;
  const inside = (lo: number, hi: number, x: number): boolean => lo - M <= x && x <= hi + M;
  const order = byArrival(input.nets);
  const farther = new Map<string, Set<string>>(order.map((n) => [n.net, new Set<string>()]));
  for (const p of order) {
    for (const q of order) {
      if (p === q) continue;
      const [lo, hi] = span(q);
      if (inside(lo, hi, p.arrive)) farther.get(p.net)!.add(q.net);
      if (inside(lo, hi, p.terminal)) farther.get(q.net)!.add(p.net);
    }
  }
  const rank: Record<string, number> = Object.fromEntries(order.map((n) => [n.net, 0]));
  let settled = false;
  for (let it = 0; it < order.length + 2; it++) {
    let changed = false;
    for (const p of order) {
      const want = Math.max(0, ...[...farther.get(p.net)!].map((q) => rank[q]! + 1));
      if (want > rank[p.net]!) {
        rank[p.net] = want;
        changed = true;
      }
    }
    if (!changed) {
      settled = true;
      break;
    }
  }
  if (!settled) {
    const nets = findCycle(order, farther);
    return { ok: false, reason: "cycle", nets, message: `lane constraints contain a cycle through ${nets[0]} and ${nets[1]}: rethink the escape topology` };
  }
  const need = Math.max(...Object.values(rank)) + 1;
  if (need > input.lanes.length) return { ok: false, reason: "lanes", need, have: input.lanes.length, message: `need ${need} fan lanes, have ${input.lanes.length}` };
  const lane: Record<string, number> = Object.fromEntries(order.map((n) => [n.net, input.lanes[need - 1 - rank[n.net]!]!]));
  for (const y of input.lanes) {
    const on = order.filter((n) => lane[n.net] === y);
    for (let i = 0; i < on.length; i++) {
      for (let j = i + 1; j < on.length; j++) {
        const [a, b] = span(on[i]!);
        const [c, d] = span(on[j]!);
        if (!(b < c - M || a > d + M)) {
          return { ok: false, reason: "overlap", nets: [on[i]!.net, on[j]!.net], lane: y, message: `lane ${y.toFixed(1)}: ${on[i]!.net} and ${on[j]!.net} overlap` };
        }
      }
    }
  }
  return { ok: true, rail: input.rail, lane, used: usedCount(lane), need, rank };
}

export type LaneVersion = "v1" | "v2";

/** The one entry: version 1 (QUADRANT, SPLINE) or version 2 (TESSERA, FRET, STAVE). */
export function assignLanes(input: LaneInput, version: LaneVersion): LaneResult {
  return version === "v1" ? rankLanesGreedy(input) : rankLanes(input);
}
