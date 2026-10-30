/// <reference lib="dom" />
// The BLOCKS bench entry the bake bundles (bake.json `entry`): the chase
// and bench beside it, mounted by the ui bench shell (M09-T07). It sits
// outside defHash with bench.ts (D-174). This folder's tsconfig excludes it:
// it imports single-file components, which only the ui package's vue shim
// declares (packages/bench/src/vue-shim.d.ts). The shell comes in by the
// @hackbuild/bench/entry source export, so tools/tiers.mjs checks the
// edge (a design may reach tier 3 outside build.ts and chase.ts).

import { mountBench, pageBench, pageOf } from "@hackbuild/bench/entry";
import { bench } from "./bench";
import { chase } from "./chase";

// No drive pad, so no ContactFn. The library build, its checks and the
// 3mf, stl and card writers come from the page build classic script
// (bake.json `build`, D-264).
mountBench({ chase, bench, ...pageBench(pageOf("HbfPageBuild")) });
