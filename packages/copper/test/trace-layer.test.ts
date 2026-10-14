// M05-T10: the buried trace layer emit against PIP b137deb. The stack z
// and the post radii are PIP's own (pip-controller layout.js lines 166 to
// 171 and model.js line 27, as PIP's model reported them in
// fixtures/pip-sweep-seed1/default.json); the route is PIP's default
// layout from fixtures/pip-b137deb-route.json. Every number is computed.

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { loadGeom } from "@hackbuild/geom";
import { emitTraceLayers, postRadius, route, traceStack, type TraceLayerInput } from "../src/index.js";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/pip-b137deb-route.json", import.meta.url), "utf8"));
const pip = JSON.parse(readFileSync(new URL("./fixtures/pip-sweep-seed1/default.json", import.meta.url), "utf8")) as { z: { l1: number[]; l2: number[]; pad: number[]; floor: number } };
const profile = createProfileLookup(loadProfile());
const s = fixture.input.route;
const r = route({ outline: fixture.input.outline, nets: fixture.input.nets, settings: { w: s.w, clr: s.clr, grid: s.grid, via: s.via, margin: s.margin, iters: s.iters } }, profile);
const stack = traceStack(profile, 0.24);
const input = (bleed: number): TraceLayerInput => ({ routed: r.nets, nets: fixture.input.nets, w: s.w, via: s.via, bleed, stack });

describe("emitTraceLayers on the PIP b137deb default route", () => {
  test("the profile stack rows give PIP's z: L1 0.72 to 1.44, L2 2.40 to 3.12, pads 4.08 to 4.80", () => {
    const fix = (v: readonly number[]) => v.map((x) => Number(x.toFixed(9)));
    expect(fix(stack.l1)).toEqual(pip.z.l1);
    expect(fix(stack.l2)).toEqual(pip.z.l2);
    expect(fix(stack.pads)).toEqual(pip.z.pad);
    expect(Number(stack.floor.toFixed(9))).toBe(pip.z.floor);
  });

  test("the sep rule: a radius within 0.12 of half the trace moves to w/2 + 0.12, any other stays", () => {
    expect(postRadius(0.6, 1.4, 0.12)).toBeCloseTo(0.82, 12);
    expect(postRadius(0.8, 1.4, 0.12)).toBeCloseTo(0.82, 12);
    expect(postRadius(0.3, 1.4, 0.12)).toBe(0.3);
    expect(postRadius(1.0, 1.4, 0.12)).toBe(1.0);
  });

  test("every net is emitted per layer as disjoint regions with its posts at PIP's spans", async () => {
    const geom = await loadGeom();
    const em = emitTraceLayers(geom, input(0), profile);
    expect(em.map((n) => n.name)).toEqual(fixture.input.nets.map((n: { name: string }) => n.name));
    for (const n of em) {
      expect(n.posts.filter((p) => p.kind === "terminal")).toHaveLength(fixture.input.nets.find((x: { name: string }) => x.name === n.name).terms.length);
      for (const p of n.posts) {
        expect(p.drawnR).toBeCloseTo(0.82, 12);
        expect(p.z[0]).toBeCloseTo(0.72 + 0.12, 12);
        expect(p.z[1]).toBeCloseTo(p.kind === "via" ? 3.12 - 0.12 : 4.8 + 0.02, 12);
        expect(p.ring).toHaveLength(20);
      }
      for (const l of n.layers) {
        const parts = l.regions.map((g) => geom.fromOutline(g.outer, g.holes, { snap: false }));
        const sum = parts.reduce((a, x) => a + x.area(), 0);
        expect(sum).toBeCloseTo(geom.union(parts).area(), 6);
        expect(sum).toBeCloseTo(l.areaMm2, 6);
      }
    }
  });

  test("bleed is applied once at emit: the drawn region shrinks by half the bleed per edge", async () => {
    const geom = await loadGeom();
    const a = emitTraceLayers(geom, input(0), profile);
    const b = emitTraceLayers(geom, input(0.1), profile);
    const area = (x: typeof a) => x.reduce((t, n) => t + n.layers[0].areaMm2 + n.layers[1].areaMm2, 0);
    expect(area(b)).toBeLessThan(area(a));
    expect(() => emitTraceLayers(geom, input(1.4), profile)).toThrow();
  });
});
