// M05-T09 step 6 and 7: BLOCKS seats route on packages/copper. The seat
// configs are held to what BOSS handed its own router, value for value
// (packages/copper/test/fixtures/boss-seats/, written by
// tools/legacy/boss/dump-route-cfg.cjs from the legacy copy; this test never
// runs BOSS). Completion counts are held to BOSS's and the card's
// (benches-conductive-b.md B.6, computed by BOSS). Spacing and connectivity
// are read from the route geometry, not from the router's own counts.
// Lengths, vias and the pin to stud estimate are the committed golden
// test/golden/route-seat.json, rewritten with HBF_SEAT_RECORD=1; the
// estimate is informational (D-075). Every number is computed.

import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { ERROR_TRANSPORT, isThrownCommandError } from "@hackbuild/spec";
import { ROUTE_CONSTANTS, type RouteResult } from "@hackbuild/copper";
import { BOSS_STD, routeSeat, seatLayout, seatParams, type SeatLayout } from "../src/route-seat.js";

const repo = new URL("../../../", import.meta.url);
const read = (rel: string): string => readFileSync(new URL(rel, repo), "utf8");
const sha = (rel: string): string => createHash("sha256").update(readFileSync(new URL(rel, repo))).digest("hex");
const RECORD = process.env["HBF_SEAT_RECORD"] === "1";
const GOLDEN = new URL("./golden/route-seat.json", import.meta.url);

interface BossSeat {
  sources: Record<string, string>;
  name: string;
  params: Record<string, unknown>;
  std: { traceW: number; traceT: number; L1: number; postD: number; rhoCpla: number; cell: number; clr: number };
  seat: { cols: number; rows: number; top: number; routed: string | null; warnings: string[]; pinMap: unknown[] };
  pinToStudOhm: { net: string; ohm: number }[];
  cfg: SeatLayout["cfg"];
  result: { paths: { name: string; layer: number; len: number }[]; failed: string[]; rips: number };
}
const SEATS = ["c3mini-press", "c3mini-snap", "teensy40-press", "pico-snap", "pico-press-all40"] as const;
// Seats held to BOSS's config only: the other seats of BOSS's own sweep and
// one whose lane budget decides the column count.
const LAYOUT_ONLY = ["pico-press", "teensy40-snap-hooks", "custom-press", "c3mini-snap-hooks", "c3mini-press-lanes"] as const;
const boss = Object.fromEntries([...SEATS, ...LAYOUT_ONLY, "pico-press-pins-all-string"].map((k) => [k, JSON.parse(read(`packages/copper/test/fixtures/boss-seats/${k}.json`)) as BossSeat])) as Record<string, BossSeat>;
// BOSS's sweep passed hinge 'hooks', no SEAT_PARAMS option; seat() treats
// any hinge but 'pin' as none, so the port is asked for none.
const portParams = (p: Record<string, unknown>): Record<string, unknown> => (p["hinge"] === "hooks" ? { ...p, hinge: "none" } : p);
const profile = createProfileLookup(loadProfile());
const norm = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

// The card's counts (computed by BOSS, benches-conductive-b.md B.6).
const CARD: Record<(typeof SEATS)[number], number> = { "c3mini-press": 16, "c3mini-snap": 16, "teensy40-press": 28, "pico-snap": 30, "pico-press-all40": 40 };

// BOSS's pin to stud estimate (parts.js line 175): trace plus post at BOSS
// v1 rho, plus a 400 ohm contact estimate; informational only.
const bossOhm = (s: BossSeat, lenMm: number, top: number): number => {
  const barR = (rho: number, len: number, area: number): number => (rho * 10) * len / area;
  return barR(s.std.rhoCpla, lenMm, s.std.traceW * s.std.traceT) + barR(s.std.rhoCpla, top - s.std.L1, Math.PI * (s.std.postD / 2) ** 2) + 400;
};

// Distance from point p to segment ab, mm.
const segDist = (p: readonly number[], a: readonly number[], b: readonly number[]): number => {
  const dx = b[0]! - a[0]!, dy = b[1]! - a[1]!, L2 = dx * dx + dy * dy;
  const t = L2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0]! - a[0]!) * dx + (p[1]! - a[1]!) * dy) / L2));
  return Math.hypot(p[0]! - a[0]! - t * dx, p[1]! - a[1]! - t * dy);
};
// Copper edge to another net's pad or post, mm: the least distance from any
// trace centreline segment (stubs included) to a foreign obstacle's
// boundary, less half a trace. Sampled along each segment at 0.05 mm.
function padClearance(layout: SeatLayout, r: RouteResult, w: number): number {
  let min = Infinity;
  const obs = layout.cfg.obstacles;
  r.nets.forEach((n, k) => {
    const own = new Set(layout.cfg.nets[k]!.own);
    const segs: [readonly number[], readonly number[]][] = [];
    for (const layer of n.polys) for (const p of layer) for (let i = 1; i < p.length; i++) segs.push([p[i - 1]!, p[i]!]);
    for (const [t, c] of n.stubs) segs.push([t, c]);
    obs.forEach((o, oi) => {
      if (own.has(oi)) return;
      for (const [a, b] of segs) {
        const steps = Math.max(1, Math.ceil(Math.hypot(b[0]! - a[0]!, b[1]! - a[1]!) / 0.05));
        for (let s = 0; s <= steps; s++) {
          const x = a[0]! + ((b[0]! - a[0]!) * s) / steps, y = a[1]! + ((b[1]! - a[1]!) * s) / steps;
          const d = o.shape === "circle"
            ? Math.hypot(x - o.cx, y - o.cy) - o.r
            : Math.hypot(Math.max(o.x0 - x, 0, x - o.x1), Math.max(o.y0 - y, 0, y - o.y1));
          min = Math.min(min, d - w / 2);
        }
      }
    });
  });
  return min;
}

// Trace to trace: the least centreline distance between two nets on one
// layer, from the polylines, mm.
function traceGap(r: RouteResult): number {
  let min = Infinity;
  for (let a = 0; a < r.nets.length; a++) for (let b = a + 1; b < r.nets.length; b++) for (const l of [0, 1] as const) {
    for (const pa of r.nets[a]!.polys[l]) for (const pb of r.nets[b]!.polys[l]) {
      for (let i = 1; i < pa.length; i++) for (let j = 1; j < pb.length; j++) {
        const A0 = pa[i - 1]!, A1 = pa[i]!, B0 = pb[j - 1]!, B1 = pb[j]!;
        min = Math.min(min, segDist(A0, B0, B1), segDist(A1, B0, B1), segDist(B0, A0, A1), segDist(B1, A0, A1));
      }
    }
  }
  return min;
}

describe("the BOSS seat fixtures", () => {
  test("come from the pinned legacy copy", () => {
    for (const s of Object.values(boss)) {
      expect(s.sources["src/parts.js"]).toBe(sha("designs/blocks/legacy/boss-src/src/parts.js"));
      expect(s.sources["src/boss.js"]).toBe(sha("designs/blocks/legacy/boss-src/src/boss.js"));
    }
  });

  test("BOSS routed every seat completely with its own router, as the card says", () => {
    for (const k of SEATS) {
      const s = boss[k]!;
      expect([s.cfg.nets.length, s.result.paths.length, s.result.failed.length], k).toEqual([CARD[k], CARD[k], 0]);
      expect(s.seat.warnings, k).toEqual([]);
    }
  });
});

describe("seat layout against BOSS (parts.js lines 14 to 172)", () => {
  test.each([...SEATS, ...LAYOUT_ONLY].map((k) => [k] as const))("%s: the router config equals BOSS's value for value", (k) => {
    const s = boss[k]!;
    expect((s as unknown as { layoutOnly: boolean }).layoutOnly).toBe((LAYOUT_ONLY as readonly string[]).includes(k));
    const L = seatLayout(portParams(s.params));
    expect([L.cols, L.rows, L.top]).toEqual([s.seat.cols, s.seat.rows, s.seat.top]);
    expect(norm(L.pinMap)).toEqual(s.seat.pinMap);
    expect(norm(L.cfg)).toEqual(s.cfg);
  });

  test("BOSS v1 STD as the seat reads it", () => {
    const s = boss["c3mini-press"]!;
    expect([BOSS_STD.traceW, BOSS_STD.traceT, BOSS_STD.L1, BOSS_STD.postD, BOSS_STD.cell, BOSS_STD.clr]).toEqual([s.std.traceW, s.std.traceT, s.std.L1, s.std.postD, s.std.cell, s.std.clr]);
    expect(BOSS_STD.padTop).toBeCloseTo(5.28, 12);
  });
});

describe("seats routed on packages/copper in octile mode (computed, this card)", () => {
  const rows: Record<string, unknown> = {};
  const golden = existsSync(GOLDEN) ? (JSON.parse(readFileSync(GOLDEN, "utf8")) as { seats: Record<string, unknown> }) : null;
  const zonePad = profile.constant(ROUTE_CONSTANTS.zonePad).value;

  test.each(SEATS.map((k) => [k] as const))("%s: completion equals BOSS, clean, spacing read from the geometry", (k) => {
    const s = boss[k]!;
    const r = routeSeat(s.params, profile);
    const w = BOSS_STD.traceW, clr = BOSS_STD.clr;
    expect([r.routed, r.total], `${k} routed`).toEqual([CARD[k], CARD[k]]);
    expect([r.route.conflicts, r.route.unrouted, r.route.warnings.length], `${k} clean`).toEqual([0, 0, 0]);
    const gap = traceGap(r.route), pad = padClearance(r.layout, r.route, w);
    expect(gap, `${k} trace to trace centreline`).toBeGreaterThanOrEqual(w + clr - 1e-9);
    expect(pad, `${k} copper to a foreign pad or post`).toBeGreaterThanOrEqual(clr - 1e-9);
    const ohm = r.lenMm.map((n) => bossOhm(s, n.mm, r.layout.top));
    const bossR = s.pinToStudOhm.map((e) => e.ohm);
    const row = {
      routed: r.routed, total: r.total, iters: r.route.iters, vias: r.route.nets.reduce((a, n) => a + n.vias.length, 0),
      lenMm: r.lenMm.map((n) => [n.net, n.mm]),
      minTraceGapMm: gap, minPadClearanceMm: pad,
      pinToStudOhm: { min: Math.min(...ohm), max: Math.max(...ohm) },
      bossPinToStudOhm: { min: Math.min(...bossR), max: Math.max(...bossR) },
      zonePadMm: zonePad,
    };
    rows[k] = norm(row);
    // informational against BOSS's 6.1 to 51.2 kohm (D-075), not asserted
    process.stdout.write(`${k}: routed ${r.routed}/${r.total}, iters ${row.iters}, vias ${row.vias}, pin to stud ${(row.pinToStudOhm.min / 1e3).toFixed(1)} to ${(row.pinToStudOhm.max / 1e3).toFixed(1)} kohm against BOSS ${(row.bossPinToStudOhm.min / 1e3).toFixed(1)} to ${(row.bossPinToStudOhm.max / 1e3).toFixed(1)} kohm (computed)\n`);
    if (!RECORD) {
      expect(golden, "test/golden/route-seat.json is not committed; run with HBF_SEAT_RECORD=1 once the asserts hold").not.toBeNull();
      expect(rows[k]).toEqual(golden!.seats[k]);
    }
  });

  test("the golden holds exactly these seats", () => {
    if (RECORD) {
      writeFileSync(GOLDEN, JSON.stringify({ meta: { qualifier: "computed", generator: "HBF_SEAT_RECORD=1 npm test -w designs/blocks -- route-seat", input: "packages/copper/test/fixtures/boss-seats/", mode: "octile, Float64" }, seats: rows }, null, 1) + "\n");
    }
    const g = JSON.parse(readFileSync(GOLDEN, "utf8")) as { seats: Record<string, unknown> };
    expect(Object.keys(g.seats)).toEqual([...SEATS]);
  });
});

describe("sweep inputs are schema-validated before they run (step 7, B.11)", () => {
  const exitOf = (f: () => unknown): [string, number] | null => {
    try { f(); } catch (e) { if (isThrownCommandError(e)) return [e.hbf.code, ERROR_TRANSPORT[e.hbf.code].exit]; throw e; }
    return null;
  };

  test("pins: 'all' exits 2 with E_SCHEMA where BOSS built a 0-pin seat that reported clean", () => {
    const legacy = boss["pico-press-pins-all-string"]!;
    expect(legacy.params).toEqual({ board: "pico", mount: "press", pins: "all" });
    expect([legacy.cfg.nets.length, legacy.seat.warnings.length]).toEqual([0, 0]);
    expect(exitOf(() => routeSeat(legacy.params, profile))).toEqual(["E_SCHEMA", 2]);
    expect(exitOf(() => seatLayout({ board: "pico", mount: "press", pins: "all" }))).toEqual(["E_SCHEMA", 2]);
  });

  test("other vacuous inputs are refused too: an unknown key, a pin the board lacks, an off-step length, an unknown board, an empty pin list, hinge hooks", () => {
    expect(exitOf(() => seatParams({ board: "c3mini", led: 3 }))).toEqual(["E_SCHEMA", 2]);
    expect(exitOf(() => seatParams({ board: "c3mini", pins: ["GP0"] }))).toEqual(["E_SCHEMA", 2]);
    expect(exitOf(() => seatParams({ board: "c3mini", pinLen: 6.2 }))).toEqual(["E_SCHEMA", 2]);
    expect(exitOf(() => seatParams({ board: "esp32" }))).toEqual(["E_SCHEMA", 2]);
    expect(exitOf(() => seatParams({ board: "pico", pins: [] }))).toEqual(["E_SCHEMA", 2]);
    expect(exitOf(() => seatParams({ board: "teensy40", mount: "snap", hinge: "hooks" }))).toEqual(["E_SCHEMA", 2]);
    expect(exitOf(() => seatParams({ board: "pico", mount: "press" }))).toBeNull();
  });
});
