// The flex-pair page build the bake bundles (bake.json `build`) into one
// classic script: the chase, build.ts and the draft kinds of
// skeleton-kinds.ts, run in the page by the shared build and check
// pipeline (packages/pipeline createPageBuild, D-264). `hbf:facts` is the
// virtual module the bake writes from core's loadDesign
// (tools/bake/design-facts.mjs); the constraint versions come from the
// registry loader in the page, the baked ones are a cross-check. It
// sits outside defHash with bench.ts (D-174): build.ts and
// skeleton-kinds.ts never import it.

import { createPageBuild } from "@hackbuild/pipeline";
import { pageFacts } from "@hackbuild/registry-loader";
import { facts } from "hbf:facts";
import { chase } from "./chase";
import * as module from "./build";
import * as kinds from "./skeleton-kinds";

export const page = createPageBuild({ chase, module, kinds, facts: pageFacts(facts) });
