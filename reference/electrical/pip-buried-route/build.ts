// reference/electrical/pip-buried-route/build.ts
// The PIP buried stack as built (M05-T10). The route and the trace layers
// are computed outside the build sandbox by packages/copper (route() and
// emitTraceLayers, run by packages/copper/scripts/pip-buried-route.mjs into
// route.data.ts), since a build module imports only @hackbuild/spec and
// relative files (BUILD_IMPORTS, D-178). This file places them: one PETG
// body on PIP's outline from the bed to the stack floor, each net's layer
// regions as conductor features on their bands, each terminal post and via
// as a conductor feature through the bands, the route's gated metrics and
// warnings, and the stack as informational metrics.
//
// The stack rows, the bleed and the emit constants are read from profile
// here so they enter profileHash; a value that differs from the one the
// data was generated against is E_STALE naming the generator, so the
// geometry never lags its profile.

import { commandError, defineBuild, qualify, type Feature, type FaceFrame, type Metric, type Ring } from "@hackbuild/spec";
import { chase } from "./chase";
import { ROUTE_DATA } from "./route.data";

const top = (z: number): FaceFrame => ({ origin: [0, 0, z], normal: [0, 0, 1], u: [1, 0, 0] });

export const build = defineBuild(chase, (p, k) => {
  const D = ROUTE_DATA;
  const m = k.machine(D.machine);
  const constant = (id: string): number => k.profile.constant(id).value;
  const now: Record<keyof typeof D.stack, number> = {
    skin: constant("stack.skin"), trace: constant("stack.trace"), iso: constant("stack.iso"), overL2: constant("stack.overL2"),
    layer: m.layerHeight, bleed: k.profile.bleed(D.machine, D.materials.body, D.materials.trace).bleed,
    postSep: constant("route.postSep"), discPad: constant("route.discPad"), regionClose: constant("route.regionClose"),
    postOverlap: constant("route.postOverlap"),
  };
  const w = constant("stack.traceWidth");
  const stale = [
    ...Object.entries(now).filter(([key, v]) => D.stack[key as keyof typeof D.stack] !== v).map(([key, v]) => `${key} ${v} (data ${D.stack[key as keyof typeof D.stack]})`),
    ...(w === D.settings.w ? [] : [`traceWidth ${w} (data ${D.settings.w})`]),
  ];
  if (stale.length > 0) {
    throw commandError({
      code: "E_STALE", path: "/route.data", got: stale.join(", "), expected: "the profile values the route data was generated against",
      hint: `rerun ${D.generator} after npx tsc -b packages/copper`,
    });
  }
  const run = D.runs.find((r) => p.iters >= r.iters[0] && p.iters <= r.iters[1]);
  if (run === undefined) {
    throw commandError({ code: "E_SCHEMA", path: "/iters", got: p.iters, expected: `1 to ${D.settings.iters}`, hint: "set iters within the route the data holds" });
  }

  const body = k.body("body", { role: "body", slot: 1, base: { route: "prism", outline: D.outline as unknown as Ring[], z: [0, D.z.floor] } });
  const features: Feature[] = [];
  for (const n of run.nets) {
    for (const l of n.layers) {
      for (const g of l.regions) {
        features.push({ kind: "conductor", id: g.id, body: "body", material: D.materials.trace, net: n.name,
          region: { path: g.ring as unknown as Ring, face: top(l.z[0]) }, width: D.settings.w, t: l.z[1] - l.z[0] });
      }
    }
    for (const post of n.posts) {
      features.push({ kind: "conductor", id: post.id, body: "body", material: D.materials.trace, net: n.name,
        region: { path: post.ring as unknown as Ring, face: top(post.z[0]) }, width: 2 * post.drawnR, t: post.z[1] - post.z[0] });
    }
  }
  for (const wn of run.warnings) k.warn(wn.code, wn.text);

  const z = D.z;
  const stackMetric = (id: string, value: number, note: string): Metric => ({
    id: `stack.${id}`, value: Number(value.toFixed(6)), unit: "mm", ...qualify([]), note, gate: "informational", group: "stack",
  });
  const metrics: Metric[] = [
    ...(run.metrics as unknown as Metric[]),
    stackMetric("l1.bottom", z.l1[0], "trace layer 1 bottom, on the skin"),
    stackMetric("l1.top", z.l1[1], "trace layer 1 top"),
    stackMetric("l2.bottom", z.l2[0], "trace layer 2 bottom, isolation over layer 1"),
    stackMetric("l2.top", z.l2[1], "trace layer 2 top"),
    stackMetric("pads.bottom", z.pads[0], "pad plane bottom, isolation over layer 2"),
    stackMetric("floor", z.floor, "stack floor, pads flush here; PETG over layer 2 is floor less the layer 2 top"),
    stackMetric("iso", z.l2[0] - z.l1[1], "PETG between the trace layers"),
    stackMetric("overL2", z.floor - z.l2[1], "PETG over trace layer 2"),
    stackMetric("traceWidth", D.settings.w - D.stack.bleed, "emitted trace width: routed width less the bleed (D-084)"),
  ];
  return k.part({
    id: "stack", name: "PIP BURIED ROUTE", process: "fdm", machine: D.machine,
    frame: { originOnAxis: false, carriesOffset: false, pose: "print" },
    bodies: [body], features, metrics, assertions: [],
  });
});
