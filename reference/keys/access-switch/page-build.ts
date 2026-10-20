// The access-switch page build the bake bundles (bake.json `build`) into
// one classic script: the chase and build.ts, run in the page by the
// shared build and check pipeline (packages/pipeline createPageBuild,
// D-264). The switch carries no draft kinds; its spring is the registered
// click-spring-key archetype, whose solver createPageBuild registers.
// `hbf:facts` is the virtual module the bake writes from core's loadDesign
// (tools/bake/design-facts.mjs). It sits outside defHash with bench.ts
// (D-174): build.ts never imports it.

import { createPageBuild } from "@hackbuild/pipeline";
import { facts } from "hbf:facts";
import { chase } from "./chase";
import * as module from "./build";

export const page = createPageBuild({ chase, module, facts });
