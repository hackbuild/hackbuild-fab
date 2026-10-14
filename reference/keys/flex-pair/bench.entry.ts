/// <reference lib="dom" />
// The flex-pair bench entry the bake bundles (bake.json `entry`): the chase
// and bench beside it, mounted by the ui bench shell (M09-T07). It sits
// outside defHash with bench.ts (D-174). This folder's tsconfig excludes it:
// it imports single-file components, which only the ui package's vue shim
// declares (packages/ui/src/vue-shim.d.ts).

import { mountBench } from "../../../packages/ui/src/bench/entry";
import { bench } from "./bench";
import { chase } from "./chase";
import { contact } from "./build";

// The drive pad and BENCH.drive call the ContactFn bench.ts names (G-20).
mountBench({ chase, bench, contact });
