// R1-flagship-access-switch-03: the solver core registers hands the
// archetype SNAPFE's load steps, so the click spring can emit its force
// curve as metrics. The steps are compared with the original's own, as
// packages/archetypes/test/legacy/pip-fits.json records them at PIP
// defaults (computed by the original).

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CLICK_DEFAULTS, shippedProfile } from "@hackbuild/archetypes";
import { simClickCurve } from "../src/canon.js";

interface Pt { d: number; F: number }
const LEG = JSON.parse(readFileSync(new URL("../../packages/archetypes/test/legacy/pip-fits.json", import.meta.url), "utf8")) as { variants: Record<string, { fe: { peak: number; pts: Pt[] } }> };
const FE = LEG.variants["haft.defaults"]!.fe;

describe("simClickCurve load steps", () => {
  it("carries the original's d and F at every step at PIP defaults", () => {
    const C = CLICK_DEFAULTS;
    const fe = simClickCurve({ l: C.l, t: C.t, Q: C.Q, w: C.w, E: C.E, sw: C.sw }, shippedProfile());
    const pts = fe.pts ?? [];
    expect(pts.length).toBe(FE.pts.length);
    pts.forEach((p, i) => {
      expect(Math.abs(p.d - FE.pts[i]!.d), `d at step ${i}`).toBeLessThanOrEqual(1e-5);
      expect(Math.abs(p.F - FE.pts[i]!.F), `F at step ${i}`).toBeLessThanOrEqual(1e-5);
    });
    expect(Math.max(...pts.map((p) => p.F).slice(0, pts.findIndex((p) => p.d > fe.peakAtMm + 1e-9)))).toBeCloseTo(fe.peakN, 9);
  });
});
