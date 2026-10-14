// reference/keys/click-spring-window/build.ts
// The PIP click spring's double cosine arch as two prisms on the M00 prism
// route, printed flat: each arch is its centreline offset by t / 2 each
// side, extruded by w (M01-T07 step 4). Ported from clickElement2D
// (haft-src/src/model.js lines 683 to 694, the arch helper): the centreline
// is v = vb + h / 2 (1 + cos(2 pi u / l)) over 64 segments, h = Q t, the
// lower arch on vb 0 and the upper on vb t + g. Conditionals and loops live
// here, never in chase.ts; its bytes enter defHash (D-174, D-178).
//
// Deviations from PIP, each named where it lands: the arch stops at the span
// ends, without the 0.4 mm run-out into the end blocks, since this reference
// builds no blocks, shuttle, tip or grooves. The FE readout (peak, drop,
// contact, eStop) is not a metric here: build.ts imports only spec and the
// author surface (BUILD_IMPORTS, D-178), and k.mech is outside the slice
// until M06, so the window is proved by the query goldens in queries.json.

import { defineBuild, qualify, type Metric, type Ring, type Vec2 } from "@hackbuild/spec";
import { chase } from "./chase";

/** Segments per arch edge (model.js line 686, n = 64); a discretization. */
const SEGMENTS = 64;

/** One arch on base vb as a counter-clockwise ring: lower edge left to right, upper edge back. */
function arch(l: number, h: number, t: number, vb: number): Ring {
  const lower: Vec2[] = [];
  const upper: Vec2[] = [];
  for (let i = 0; i <= SEGMENTS; i++) {
    const u = -l / 2 + (l * i) / SEGMENTS;
    const v = vb + (h / 2) * (1 + Math.cos((2 * Math.PI * u) / l));
    lower.push([u, v - t / 2]);
    upper.push([u, v + t / 2]);
  }
  return [...lower, ...upper.reverse()];
}

export const build = defineBuild(chase, (p, k) => {
  const h = p.Q * p.t;
  const bodies = [0, p.t + p.g].map((vb, i) =>
    k.body(`arch${i + 1}`, { role: "body", slot: 1, base: { route: "prism", outline: [arch(p.l, h, p.t, vb)], z: [0, p.w] } }));
  const metrics: Metric[] = [
    { id: "spring.riseMm", value: Number(h.toFixed(4)), unit: "mm", ...qualify([]), note: "rise h = Q t at the arch centre",
      drivenBy: ["/Q", "/t"], gate: "informational", group: "spring" },
  ];
  return k.part({
    id: "spring", name: "CLICK SPRING", process: "fdm", machine: "ffc5p",
    frame: { originOnAxis: false, carriesOffset: false, pose: "print" },
    bodies, features: [], metrics, assertions: [],
  });
});
