// Writes packages/copper/test/golden/toggle-presets-default.json: TOGGLE's
// four preset plan views (packages/copper/test/fixtures/toggle-presets/)
// routed by the search layer in default mode (Float64 g and history,
// D-092), as computed by this package. M05-T09 asserts the legacy tries and
// layers against the card; the golden holds the default-mode tries, layers,
// COM gap, map and routes so a change shows up as a diff a person reads.
//
//   node packages/copper/scripts/toggle-default-golden.mjs           print the golden
//   node packages/copper/scripts/toggle-default-golden.mjs --write   write it over the committed file
//
// Run `npx tsc -b packages/copper` first; the script reads dist/ and
// resolves the spec sources through core's resolve hook.

import { readFileSync, writeFileSync } from "node:fs";
import { register } from "node:module";

const here = (p) => new URL(p, import.meta.url);
register(here("../../../core/dist/resolve-hook.js"));
const { createProfileLookup, loadProfile } = await import("@hackbuild/profile");
const { routeSearch } = await import(here("../dist/index.js").href);
const profile = createProfileLookup(loadProfile());
const PRESETS = ["solo4", "solo8", "blocks4", "blocks8"];
const presets = PRESETS.map((k) => {
  const f = JSON.parse(readFileSync(here(`../test/fixtures/toggle-presets/${k}.json`), "utf8"));
  const { terms, ...rest } = f.plan;
  const r = routeSearch({ ...rest, terms: terms.map(({ x, y, r: rr }) => ({ x, y, r: rr })) }, profile);
  return { preset: k, ok: r.res !== null, layers: r.layers, tries: r.tries, phiA: r.phiA, map: r.map, nets: r.res ? r.res.nets : null };
});
const golden = {
  meta: {
    qualifier: "computed",
    generator: "node packages/copper/scripts/toggle-default-golden.mjs --write",
    input: "packages/copper/test/fixtures/toggle-presets/",
    mode: "default, Float64 g and history",
  },
  presets,
};
const text = JSON.stringify(golden) + "\n";
if (process.argv.includes("--write")) writeFileSync(here("../test/golden/toggle-presets-default.json"), text);
else process.stdout.write(text);
