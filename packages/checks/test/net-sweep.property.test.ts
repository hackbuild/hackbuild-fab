// M05-T10 step 6: zero silent failures over PIP's own generator space. The
// 40 designs PIP's test/sweep.mjs draws at seed 1 (layouts recorded by
// tools/legacy/pip/dump-route.mjs, PIP's verdicts on them by
// tools/legacy/pip/dump-sweep.mjs) go through the copper pipeline: route,
// emitTraceLayers on the profile stack, the solids of each net, net to net
// by circuit netGaps, then the CHK-NET-12 and CHK-NET-02 bodies. The
// property: a design whose route is clean and whose nets are all at least
// the 0.60 mm floor apart passes; every other design fails CHK-NET-12 or
// CHK-NET-02 naming the nets. A route problem never sits beside a pass.
//
// Two modes. The baseline routes in legacy mode (Float32 history), which
// equals PIP b137deb point for point on all 40 (negotiated-sweep.test.ts),
// so its counts are PIP's: 28 designs route clean and 12 carry unrouted
// connections or conflicts (computed). The property runs fast-check
// (seeded, shrinking, path replay) over the public default mode with a
// drawn iteration cap, so caps under convergence add conflicted routes.
// Every number is computed, none measured.

import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, test } from "vitest";
import fc from "fast-check";
import type { Finding } from "@hackbuild/spec";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { loadGeom, q } from "@hackbuild/geom";
import { loadManifold, withScope } from "@hackbuild/mesh";
import { NET_GAP_SEARCH, netGaps, type NetGap } from "@hackbuild/circuit";
import { emitTraceLayers, readRouteMetrics, route, routeMetrics, routeRecord, traceStack, type RouteNet, type RouteResult } from "@hackbuild/copper";
import { routeNegotiated } from "../../copper/src/route/negotiated.js";
import { pairFindings, routeFinding, NET_FLOOR } from "../src/index.js";

interface Input {
  route: { w: number; clr: number; grid: number; via: number; margin: number; iters: number };
  outline: [number, number][][];
  nets: RouteNet[];
}
interface SweepCase { i: number; input?: Input; output?: { conflicts: number; unrouted: number } }
interface PipVerdict {
  i: number;
  route: { conflicts: number; unrouted: number; iters: number; w: number };
  elec: { minGap: number; pairs: { a: string; b: string; g: number }[]; nets: { name: string; parts: number }[] };
  fitsNetToNet: { value: string; ok: boolean };
  warns: { clearance: boolean; splitNets: number; total: number };
}

const fixtures = new URL("../../copper/test/fixtures/", import.meta.url);
const sweep = JSON.parse(readFileSync(new URL("pip-b137deb-sweep-route.json", fixtures), "utf8")) as { meta: { commit: string }; cases: SweepCase[] };
const pipDir = new URL("pip-sweep-seed1/", fixtures);
const pip = readdirSync(pipDir).filter((f) => f.startsWith("design-")).sort()
  .map((f) => JSON.parse(readFileSync(new URL(f, pipDir), "utf8")) as PipVerdict & { meta: { commit: string } });
const profile = createProfileLookup(loadProfile());
const floorMm = profile.constant(NET_FLOOR).value;
const searchMm = profile.constant(NET_GAP_SEARCH).value;
const MACHINE = "ffc5p";
const stack = traceStack(profile, profile.preset(MACHINE).layer);
const bleed = profile.bleed(MACHINE, "petg", "cpla").bleed;

const settings = (s: Input["route"], iters = s.iters) => ({ w: s.w, clr: s.clr, grid: s.grid, via: s.via, margin: s.margin, iters });

interface Verdicts {
  readonly r: RouteResult;
  readonly gaps: readonly NetGap[];
  readonly net12: Finding;
  readonly net02: readonly Finding[];
}

/** The copper pipeline on one routed layout: emit, solids per net, gaps, then the two check bodies. */
async function verdicts(input: Input, r: RouteResult): Promise<Verdicts> {
  const geom = await loadGeom();
  const wasm = await loadManifold();
  const em = emitTraceLayers(geom, { routed: r.nets, nets: input.nets, w: input.route.w, via: input.route.via, bleed, stack }, profile);
  const gaps = withScope((scope) => netGaps(em.map((n) => ({
    net: n.name,
    solids: [
      // the emit's rings are off the grid; the kernel snaps a ring when it meshes it (D-054), so the solids here do too
      ...n.layers.flatMap((l) => l.regions.map((g) => scope.own(new wasm.CrossSection([g.outer, ...g.holes].map((ring) => ring.map(([x, y]) => [q(x), q(y)] as [number, number])), "Positive").extrude(l.z[1] - l.z[0]).translate([0, 0, l.z[0]])))),
      ...n.posts.map((p) => scope.own(new wasm.CrossSection([p.ring.map(([x, y]) => [q(x), q(y)] as [number, number])], "Positive").extrude(p.z[1] - p.z[0]).translate([0, 0, p.z[0]]))),
    ],
  })), searchMm));
  const view = readRouteMetrics(routeMetrics(routeRecord(r)));
  if (view === null) throw new Error("route metrics did not read back");
  return {
    r, gaps,
    net12: routeFinding("sweep", view, gaps, floorMm),
    net02: pairFindings("sweep", gaps, { mm: floorMm, tier: "inferred" }, searchMm),
  };
}

/** The property for one design: clean and every pair at the floor passes; anything else fails naming nets. */
function holds(v: Verdicts): void {
  const clean = v.r.conflicts === 0 && v.r.unrouted === 0;
  const least = Math.min(...v.gaps.map((g) => g.mm));
  const net02Fails = v.net02.filter((f) => f.verdict === "fail");
  if (clean && least >= floorMm) {
    expect(v.net12.verdict).toBe("pass");
    expect(net02Fails).toEqual([]);
    return;
  }
  expect(v.net12.verdict).toBe("fail");
  const named = String((v.net12.extra as { nets?: string } | undefined)?.nets ?? "");
  expect(named.length).toBeGreaterThan(0);
  if (least < floorMm) {
    expect(net02Fails.length).toBeGreaterThan(0);
    for (const f of net02Fails) expect(f.constraint).toMatch(/^nets \S+ and \S+ /);
  }
}

describe("the seed 1 sweep through copper, CHK-NET-12 and CHK-NET-02", () => {
  test("the recorded designs are PIP b137deb's", () => {
    expect(sweep.meta.commit).toBe("b137deb518229ea8910bfe85e6416d34cee353f3");
    expect(pip.map((p) => p.meta.commit)).toEqual(Array(40).fill("b137deb518229ea8910bfe85e6416d34cee353f3"));
    expect(pip.map((p) => p.i)).toEqual(sweep.cases.map((c) => c.i));
  });

  test("legacy mode classifies the PIP baseline: 28 pass, 12 fail loudly, 9 of them under the floor", { timeout: 600_000 }, async () => {
    const rows: { i: number; clean: boolean; least: number; net12: string; pipOk: boolean }[] = [];
    let compared = 0;
    for (const c of sweep.cases) {
      const input = c.input!;
      const r = routeNegotiated({ outline: input.outline, nets: input.nets, settings: settings(input.route) }, profile, { legacyFloat32History: true });
      const p = pip[c.i]!;
      // The route is PIP's: the counts equal what PIP's model reported for the same design.
      expect([r.conflicts, r.unrouted]).toEqual([p.route.conflicts, p.route.unrouted]);
      const v = await verdicts(input, r);
      holds(v);
      const least = Math.min(...v.gaps.map((g) => g.mm));
      // PIP's model nets add button floor pads and contacts to these traces,
      // so where PIP's closest pair is one of ours the copper stack is no
      // nearer than PIP's model, to two 1/1024 mm grid steps (snap and the
      // D-175 circle table).
      for (const pair of p.elec.pairs) {
        const ours = v.gaps.find((g) => (g.a === pair.a && g.b === pair.b) || (g.a === pair.b && g.b === pair.a));
        if (ours !== undefined && ours.mm < searchMm) {
          expect(ours.mm).toBeGreaterThanOrEqual(pair.g - 2 / 1024);
          compared++;
        }
      }
      rows.push({ i: c.i, clean: r.conflicts === 0 && r.unrouted === 0, least, net12: v.net12.verdict, pipOk: p.fitsNetToNet.ok });
    }
    expect(compared).toBeGreaterThan(100);
    const clean = rows.filter((x) => x.clean);
    const dirty = rows.filter((x) => !x.clean);
    expect(clean.length).toBe(28);
    expect(dirty.length).toBe(12);
    expect(clean.every((x) => x.net12 === "pass" && x.least >= floorMm)).toBe(true);
    expect(dirty.every((x) => x.net12 === "fail")).toBe(true);
    const under = dirty.filter((x) => x.least < floorMm);
    expect(under.length).toBe(9);
    // Least gap among the twelve, 0.000 to 0.528 mm (computed on the copper stack).
    expect(Math.min(...under.map((x) => x.least))).toBeLessThan(1e-6);
    expect(Math.max(...under.map((x) => x.least))).toBeLessThan(0.53);
    // PIP's clearance warning fires only under 0.3 mm, on the designs whose copper stack gap is under 0.3 too.
    expect(rows.filter((x) => pip[x.i]!.warns.clearance).map((x) => x.i)).toEqual(rows.filter((x) => x.least < 0.3).map((x) => x.i));
    // PIP's own fits row passes at 0.4 mm on ten of the twelve; here none passes.
    expect(dirty.filter((x) => x.pipOk).length).toBe(10);
    // The pipeline adds no route problem of its own: the clean set is PIP's.
    expect(dirty.map((x) => x.i)).toEqual(pip.filter((p) => p.route.conflicts > 0 || p.route.unrouted > 0).map((p) => p.i));
  });

  test("forced failure: the PIP default layout capped at 1 iteration, which needs 2, fails CHK-NET-12", { timeout: 120_000 }, async () => {
    const fx = JSON.parse(readFileSync(new URL("pip-b137deb-route.json", fixtures), "utf8")) as { input: Input };
    const at = async (cap: number) => verdicts(fx.input, route({ outline: fx.input.outline, nets: fx.input.nets, settings: settings(fx.input.route, cap) }, profile));
    const capped = await at(1);
    expect(capped.r.conflicts).toBeGreaterThan(0);
    expect(capped.net12.verdict).toBe("fail");
    expect(capped.net12.measured).toBeGreaterThan(0);
    const full = await at(fx.input.route.iters);
    expect([full.r.conflicts, full.r.unrouted, full.net12.verdict]).toEqual([0, 0, "pass"]);
  });

  test("property: default mode at any iteration cap never pairs a route problem with a pass", { timeout: 600_000 }, async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 0, max: 39 }), fc.integer({ min: 1, max: 24 }), async (i, cap) => {
        const input = sweep.cases[i]!.input!;
        const r = route({ outline: input.outline, nets: input.nets, settings: settings(input.route, Math.min(cap, input.route.iters)) }, profile);
        holds(await verdicts(input, r));
      }),
      { seed: 10, numRuns: 24, endOnFailure: true },
    );
  });
});
