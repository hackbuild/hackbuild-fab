// Writes reference/electrical/pip-buried-route/route.data.ts: the PIP
// b137deb default layout (packages/copper/test/fixtures/pip-b137deb-route.json,
// M05-T08) routed by this package in its public default mode and emitted
// as buried trace layers on the profile stack (M05-T10). build.ts imports
// only @hackbuild/spec and relative files (BUILD_IMPORTS, D-178), so the
// router and the emit run here, outside the build sandbox, and the build
// places what they computed. reference/electrical/pip-buried-route/test
// reruns this and fails when the committed module differs.
//
// The route is recorded once per distinct result over the iteration caps
// 1 to the layout's own cap: the router stops at convergence, so every
// cap at or above the converging count gives the same route, and each
// cap below it is recorded as its own run. build.ts picks the run that
// holds params.iters.
//
//   node packages/copper/scripts/pip-buried-route.mjs           print a summary
//   node packages/copper/scripts/pip-buried-route.mjs --write   write route.data.ts
//
// Run `npx tsc -b packages/copper` first; the script reads dist/ and
// resolves the spec sources through core's resolve hook.

import { readFileSync, writeFileSync } from "node:fs";
import { register } from "node:module";

const here = (p) => new URL(p, import.meta.url);
register(here("../../../core/dist/resolve-hook.js"));
const { createProfileLookup, loadProfile } = await import("@hackbuild/profile");
const { loadGeom, q } = await import("@hackbuild/geom");
const copper = await import(here("../dist/index.js").href);

export const MACHINE = "ffc5p";
/** The materials of the buried stack: PETG body, conductive PLA traces (PIP print card slots 1 and 2). */
export const BODY_MATERIAL = "petg";
export const TRACE_MATERIAL = "cpla";
const OUT = here("../../../reference/electrical/pip-buried-route/route.data.ts");

/** The data module text for the current profile and package. */
export async function routeData() {
  const fixture = JSON.parse(readFileSync(here("../test/fixtures/pip-b137deb-route.json"), "utf8"));
  const profile = createProfileLookup(loadProfile());
  const geom = await loadGeom();
  const { route: s, outline, nets } = fixture.input;
  const w = profile.constant("stack.traceWidth").value;
  if (w !== s.w) throw new Error(`profile stack.traceWidth ${w} mm differs from the PIP layout's route.w ${s.w} mm`);
  const layer = profile.preset(MACHINE).layer;
  const bleed = profile.bleed(MACHINE, BODY_MATERIAL, TRACE_MATERIAL).bleed;
  const stack = copper.traceStack(profile, layer);
  const read = (id) => profile.constant(id).value;
  const settings = { w, clr: s.clr, grid: s.grid, via: s.via, margin: s.margin };
  const routeAt = (iters) => copper.route({ outline, nets, settings: { ...settings, iters } }, profile);

  // One run per distinct result over caps 1 to s.iters.
  const runs = [];
  for (let cap = 1; cap <= s.iters; cap++) {
    const r = routeAt(cap);
    const key = JSON.stringify(r);
    const last = runs.at(-1);
    if (last !== undefined && last.key === key) {
      last.iters[1] = cap;
      continue;
    }
    runs.push({ key, iters: [cap, cap], r });
  }
  const out = runs.map(({ iters, r }) => {
    const em = copper.emitTraceLayers(geom, { routed: r.nets, nets, w, via: s.via, bleed, stack }, profile);
    const rec = copper.routeRecord(r);
    return {
      iters,
      metrics: copper.routeMetrics(rec),
      warnings: rec.warnings,
      nets: em.map((n) => {
        for (const l of n.layers) {
          if (l.regions.some((g) => g.holes.length > 0)) throw new Error(`net ${n.name} layer ${l.layer + 1}: a region with a hole; ConductorFeature carries one ring`);
        }
        return {
          name: n.name,
          layers: n.layers.map((l) => ({
            z: l.z,
            regions: l.regions.map((g, i) => ({ id: copper.traceFeatureId({ kind: "layer", net: n.name, layer: l.layer, index: i }), ring: g.outer })),
          })),
          posts: n.posts.map((p, i) => ({
            id: copper.traceFeatureId({ kind: p.kind === "terminal" ? "post" : "via", net: n.name, index: i }),
            kind: p.kind, r: p.r, drawnR: p.drawnR, z: p.z, ring: p.ring,
          })),
        };
      }),
    };
  });
  return {
    generator: "node packages/copper/scripts/pip-buried-route.mjs --write",
    source: { fixture: "packages/copper/test/fixtures/pip-b137deb-route.json", commit: fixture.meta.commit, layout: fixture.meta.layout },
    machine: MACHINE,
    materials: { body: BODY_MATERIAL, trace: TRACE_MATERIAL },
    settings: { ...settings, post: s.post, iters: s.iters },
    stack: {
      skin: read("stack.skin"), trace: read("stack.trace"), iso: read("stack.iso"), overL2: read("stack.overL2"), layer, bleed,
      postSep: read("route.postSep"), discPad: read("route.discPad"), regionClose: read("route.regionClose"), postOverlap: read("route.postOverlap"),
    },
    z: stack,
    outline: outline.map((ring) => ring.map(([x, y]) => [q(x), q(y)])),
    runs: out,
  };
}

export function moduleText(data) {
  return [
    "// reference/electrical/pip-buried-route/route.data.ts",
    "// Generated by packages/copper/scripts/pip-buried-route.mjs --write; never edit by hand.",
    "// The PIP b137deb default layout routed by packages/copper (default mode) and emitted as",
    "// buried trace layers on the profile stack (M05-T10). Every number is computed.",
    "",
    `export const ROUTE_DATA = ${JSON.stringify(data)} as const;`,
    "",
  ].join("\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const data = await routeData();
  const text = moduleText(data);
  if (process.argv.includes("--write")) writeFileSync(OUT, text);
  for (const run of data.runs) {
    const m = Object.fromEntries(run.metrics.filter((x) => !x.id.startsWith("route.net.")).map((x) => [x.id, x.value]));
    process.stdout.write(`iters ${run.iters[0]} to ${run.iters[1]}: conflicts ${m["route.conflicts"]}, unrouted ${m["route.unrouted"]}, router iters ${m["route.iters"]}, ${run.nets.length} nets, ${run.nets.reduce((a, n) => a + n.layers.reduce((b, l) => b + l.regions.length, 0), 0)} layer regions, ${run.nets.reduce((a, n) => a + n.posts.length, 0)} posts\n`);
  }
  process.stdout.write(`${text.length} bytes${process.argv.includes("--write") ? ` -> ${OUT.pathname}` : ""}\n`);
}
