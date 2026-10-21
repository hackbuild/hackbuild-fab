// The page build chase.bake wrote (tools/bake/from-chase.ts): the chase
// and build.ts, run in the page by the shared build and check pipeline
// (packages/pipeline createPageBuild, D-264). `hbf:facts` is the virtual
// module the bake writes from core's loadDesign. It sits outside defHash
// with bench.ts (D-174): build.ts never imports it.

import { createPageBuild } from "@hackbuild/pipeline";
import { pageFacts } from "@hackbuild/registry-loader";
import { facts } from "hbf:facts";
import { chase } from "./chase";
import * as module from "./build";

export const page = createPageBuild({ chase, module, facts: pageFacts(facts) });
