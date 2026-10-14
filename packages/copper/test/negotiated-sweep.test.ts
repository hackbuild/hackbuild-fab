// M05-T08: the copper router in legacy mode (Float32 history, PIP as
// shipped) against PIP's own routes of the 40 designs its sweep draws at
// seed 1 (test/sweep.mjs at b137deb), recorded by
// tools/legacy/pip/dump-route.mjs. These layouts negotiate up to 25
// iterations, use vias and leave conflicts and unrouted terminals, so turn,
// via, history and present costs all reach the output. Every number is
// computed by PIP b137deb or by this package, none measured.

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { routeNegotiated, type RouteResult } from "../src/route/negotiated.js";

interface Case {
  i: number;
  input: { route: { w: number; clr: number; grid: number; via: number; margin: number; iters: number }; outline: [number, number][][]; nets: { name: string; terms: { x: number; y: number; r: number }[] }[] };
  output: { nets: readonly unknown[]; conflicts: number; hot: readonly unknown[]; unrouted: number; iters: number; grid: unknown };
}
const sweep = JSON.parse(readFileSync(new URL("./fixtures/pip-b137deb-sweep-route.json", import.meta.url), "utf8")) as { meta: { commit: string }; cases: Case[] };
const profile = createProfileLookup(loadProfile());
const view = (r: RouteResult): Case["output"] => ({
  nets: r.nets.map((n) => ({ name: n.name, polys: n.polys, stubs: n.stubs, vias: n.vias, fails: n.fails, len: n.len })),
  conflicts: r.conflicts, hot: r.hot, unrouted: r.unrouted, iters: r.iters, grid: r.grid,
});

describe("legacy mode on the PIP b137deb seed 1 sweep", () => {
  test("the sweep holds 40 designs from b137deb that exercise vias, conflicts and long negotiation", () => {
    expect(sweep.meta.commit).toBe("b137deb518229ea8910bfe85e6416d34cee353f3");
    expect(sweep.cases.map((c) => c.i)).toEqual(Array.from({ length: 40 }, (_, i) => i));
    const out = sweep.cases.map((c) => c.output);
    expect(out.filter((o) => o.conflicts > 0 || o.unrouted > 0).length).toBe(12);
    expect(out.filter((o) => o.iters > 2).length).toBeGreaterThan(10);
  });

  test.each(sweep.cases.map((c) => [c.i, c] as const))("design %i equals PIP point for point", (_, c) => {
    const s = c.input.route;
    const r = routeNegotiated({ outline: c.input.outline, nets: c.input.nets, settings: { w: s.w, clr: s.clr, grid: s.grid, via: s.via, margin: s.margin, iters: s.iters } }, profile, { legacyFloat32History: true });
    expect(view(r)).toEqual(c.output);
  });
});
