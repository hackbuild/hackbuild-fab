// Writes packages/copper/test/golden/pip-b137deb-default.json: the PIP
// b137deb fixture inputs (the default layout and the 40 seed 1 sweep
// designs) routed in default mode (Float64 history, D-092), as computed by
// this package. M05-T08 records default-mode lengths and
// iterations as computed and asserts only conflicts 0 and unrouted 0 against
// the card; the golden holds the rest so a change to the default route shows
// up as a diff a person reads.
//
//   node packages/copper/scripts/pip-default-golden.mjs           print the golden
//   node packages/copper/scripts/pip-default-golden.mjs --write   write it over the committed file
//
// Run `npx tsc -b packages/copper` first; the script reads dist/ and
// resolves the spec sources through core's resolve hook.

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { register } from "node:module";

const here = (p) => new URL(p, import.meta.url);
register(here("../../../core/dist/resolve-hook.js"));
const { createProfileLookup, loadProfile } = await import("@hackbuild/profile");
const { route } = await import(here("../dist/index.js").href);
const fixture = JSON.parse(readFileSync(here("../test/fixtures/pip-b137deb-route.json"), "utf8"));
const sweep = JSON.parse(readFileSync(here("../test/fixtures/pip-b137deb-sweep-route.json"), "utf8"));
const profile = createProfileLookup(loadProfile());
const settings = (s) => ({ w: s.w, clr: s.clr, grid: s.grid, via: s.via, margin: s.margin, iters: s.iters });
const { route: s, outline, nets } = fixture.input;
const r = route({ outline, nets, settings: settings(s) }, profile);
const sha = (v) => createHash("sha256").update(JSON.stringify(v)).digest("hex");
// Per sweep design: the counts, each net's length, and a sha256 over the
// nets (polylines, stubs, vias, fails, lengths) as the test serialises them.
const sweepRows = sweep.cases.map((c) => {
  const d = route({ outline: c.input.outline, nets: c.input.nets, settings: settings(c.input.route) }, profile);
  return {
    i: c.i, conflicts: d.conflicts, unrouted: d.unrouted, iters: d.iters, vias: d.nets.reduce((a, n) => a + n.vias.length, 0),
    len: d.nets.map((n) => [n.name, n.len]),
    nets: sha(d.nets.map((n) => ({ name: n.name, polys: n.polys, stubs: n.stubs, vias: n.vias, fails: n.fails, len: n.len }))),
    warnings: d.warnings.map((w) => w.code),
  };
});
const golden = {
  meta: {
    qualifier: "computed",
    generator: "node packages/copper/scripts/pip-default-golden.mjs --write",
    input: "packages/copper/test/fixtures/pip-b137deb-route.json",
    mode: "default, Float64 history",
    sweep: "packages/copper/test/fixtures/pip-b137deb-sweep-route.json",
  },
  conflicts: r.conflicts,
  unrouted: r.unrouted,
  iters: r.iters,
  grid: r.grid,
  nets: r.nets.map((n) => ({ name: n.name, len: n.len, polys: n.polys, vias: n.vias, fails: n.fails })),
  warnings: r.warnings,
  sweep: sweepRows,
};
const text = JSON.stringify(golden) + "\n";
if (process.argv.includes("--write")) writeFileSync(here("../test/golden/pip-b137deb-default.json"), text);
else process.stdout.write(text);
