// The buried trace stack against the original (M06-T09, buried-trace-stack):
// PIP b137deb at its defaults, bleed 0, holds 869.687808 mm3 of conductive
// PLA below the pad plane (packages/archetypes/test/legacy/pip-seat.json,
// pipc.defaults stack slot 2, measured in place on manifold-3d 3.5.3 by
// packages/archetypes/scripts/pip-seat-legacy.mjs). The emit's regions and
// posts on PIP's own route (fixtures/pip-b137deb-route.json output), meshed
// as PIP meshes its conductors (model.js lines 33 to 48: each region and
// post extruded on its band, the nets unioned) and cut at the pad plane,
// give the same volume within 1e-3 mm3. The emit that snapped every entry
// and exit to the 1/1024 mm grid read 0.148 mm3 over, and snapping only the
// emitted rings reads 0.105 over (computed): PIP's 0.7 mm half trace sits
// between grid steps and the snap rounds both edges of a trace outward.

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { loadGeom, q, type Geom } from "@hackbuild/geom";
import type { Ring } from "@hackbuild/spec";
import { emitTraceLayers, traceStack, type TraceNet } from "../src/index.js";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/pip-b137deb-route.json", import.meta.url), "utf8"));
const legacy = JSON.parse(readFileSync(new URL("../../archetypes/test/legacy/pip-seat.json", import.meta.url), "utf8")) as {
  variants: Record<string, { params: { bleed: number }; z: { pad: number[] }; stack: { box: { z: number[] }; slots: Record<string, number> } }>;
};
const profile = createProfileLookup(loadProfile());
const s = fixture.input.route;

/** cPLA of the emitted nets between the bed and zTop, mm3: each ring extruded on its band, all unioned. */
function stackVolume(geom: Geom, nets: readonly TraceNet[], zTop: number, ring: (r: Ring) => Ring): number {
  const W = geom.wasm;
  const owned: { delete(): void }[] = [];
  const own = <T extends { delete(): void }>(x: T): T => { owned.push(x); return x; };
  try {
    const ext = (rings: readonly Ring[], z0: number, z1: number) => {
      const c = own(new W.CrossSection(rings.map((r) => ring(r).map(([x, y]) => [x, y] as [number, number])), "Positive"));
      return own(own(c.extrude(z1 - z0)).translate([0, 0, z0]));
    };
    const solids = nets.flatMap((n) => [
      ...n.layers.flatMap((l) => l.regions.map((g) => ext([g.outer, ...g.holes], l.z[0], l.z[1]))),
      ...n.posts.map((p) => ext([p.ring], p.z[0], p.z[1])),
    ]);
    const cut = own(own(W.Manifold.cube([400, 400, zTop + 1])).translate([-200, -200, -1]));
    return own(own(W.Manifold.union(solids)).intersect(cut)).volume();
  } finally {
    for (const x of owned.reverse()) x.delete();
  }
}

describe("buried trace stack volume against PIP b137deb", () => {
  const pip = legacy.variants["pipc.defaults"]!;

  test("the record is PIP's defaults at bleed 0, cut at the pad plane", () => {
    expect(pip.params.bleed).toBe(0);
    expect(pip.stack.box.z[1]).toBe(pip.z.pad[0]);
  });

  test("the emitted stack holds the original's conductive PLA within 1e-3 mm3", async () => {
    const geom = await loadGeom();
    const em = emitTraceLayers(geom, { routed: fixture.output.nets, nets: fixture.input.nets, w: s.w, via: s.via, bleed: 0, stack: traceStack(profile, 0.24) }, profile);
    const v = stackVolume(geom, em, pip.z.pad[0]!, (r) => r);
    expect(Math.abs(v - pip.stack.slots["2"]!)).toBeLessThan(1e-3);
    // the same rings snapped to the grid read high by more than the 1e-3 rule (computed 0.105 mm3)
    const snapped = stackVolume(geom, em, pip.z.pad[0]!, (r) => r.map(([x, y]) => [q(x), q(y)] as const));
    expect(snapped - pip.stack.slots["2"]!).toBeGreaterThan(0.1);
  });
});
