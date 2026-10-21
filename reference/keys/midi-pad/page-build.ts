// The midi-pad page build the bake bundles (bake.json `build`) into one
// classic script: the chase and build.ts, run in the page by the shared
// build and check pipeline (packages/pipeline createPageBuild, D-264). The
// pad carries no draft kinds; its keys, fader and seat are registered
// archetypes placed through Author.arch. `hbf:facts` is the virtual module
// the bake writes from core's loadDesign (tools/bake/design-facts.mjs); the
// constraint versions come from the registry loader in the page, the baked
// ones are a cross-check. It sits outside defHash with bench.ts (D-174):
// build.ts never imports it.

import { createPageBuild } from "@hackbuild/pipeline";
import { pageFacts } from "@hackbuild/registry-loader";
import { facts } from "hbf:facts";
import { chase } from "./chase";
import * as module from "./build";

export const page = createPageBuild({ chase, module, facts: pageFacts(facts) });
