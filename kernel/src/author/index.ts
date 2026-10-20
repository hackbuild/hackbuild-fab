// @hackbuild/kernel/author: what a chase.ts and a build.ts import (M10-T02
// step 6). defineChase, defineBuild and ParamsOf come from packages/chase;
// the Author API of AGENT-SURFACE.md 8.3 joins this entry as it lands. The
// source reader admits this module and @hackbuild/spec as chase imports
// (CHASE_IMPORT_MODULES, D-178). prismWithEdges is the edge spec on the stack
// route (PLAN.md 3.3, R1-engine-06); a build.ts awaits it for a body base.

export { defineBuild, defineChase, type BuildFn, type CheckedChase, type ParamIdOf, type ParamsOf } from "@hackbuild/chase";
export { prismWithEdges, type EdgePrism } from "@hackbuild/mesh";
export type { EdgeKind, EdgeProfile, EdgeSpec } from "@hackbuild/geom";
