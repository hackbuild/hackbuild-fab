// The published packages and their build outputs (plan v10 Phase 1 step 4).
// One table read by build-lib.mjs, lint-packages.mjs and the output tests, so
// no list of packages, globals or externals is kept twice.
//
// Layout per package: dist/ is the npm ESM (tsc -b, plus the vite library
// build for bench), dist/cdn/<short>.js is one ESM file for an import map,
// dist/iife/<short>.js is one classic script with one global.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** The es target of the cdn and iife files. Nothing in these four packages needs more than es2020 (measured: the builds pass). */
export const TARGET = "es2020";

/** Peer dependency specifiers and the page global each one is read from in an IIFE. */
export const PEER_GLOBALS = { vue: "Vue", pinia: "Pinia", three: "THREE" };

export const PACKAGES = [
  { short: "spec", name: "@hackbuild/spec", dir: "spec", entry: "index.ts", global: "HackbuildSpec", peers: [], vue: false },
  { short: "viewer", name: "@hackbuild/viewer", dir: "packages/viewer", entry: "src/index.ts", global: "HackbuildViewer", peers: ["three"], vue: false },
  { short: "bench-core", name: "@hackbuild/bench-core", dir: "packages/bench-core", entry: "src/index.ts", global: "HackbuildBenchCore", peers: [], vue: false },
  { short: "bench", name: "@hackbuild/bench", dir: "packages/bench", entry: "src/index.ts", global: "HackbuildBench", peers: ["vue", "pinia", "three"], vue: true, attwSkip: ["style.css", "entry"], publintAllow: [{ code: "LOCAL_DEPENDENCY", path: "dependencies.@virgilvox/hackbuild-ui", why: "hackbuild-ui 0.3.0 is not on npm yet (PLAN.md 3.2); the package stays private until it is published and D-037 is answered" }] },
];

/** Names the package leaves as bare imports: its peers and the other published packages. */
export function externalsOf(pkg) {
  return [...pkg.peers, ...PACKAGES.filter((p) => p.name !== pkg.name).map((p) => p.name)];
}

/** Global name per external, for the IIFE. */
export function globalsOf(pkg) {
  const g = {};
  for (const p of pkg.peers) g[p] = PEER_GLOBALS[p];
  for (const o of PACKAGES) if (o.name !== pkg.name) g[o.name] = o.global;
  return g;
}

/** Does an import specifier belong to an external name (the name itself or a subpath)? */
export const matches = (id, names) => names.some((n) => id === n || id.startsWith(`${n}/`));

export const VENDOR_THREE = "tools/vendor/three/dist/three.js";
export const BUDGET_FILE = "tools/lib/size-budget.json";
