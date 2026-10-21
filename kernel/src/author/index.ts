// @hackbuild/kernel/author: what a chase.ts and a build.ts import (M10-T02
// step 6). defineChase, defineBuild and ParamsOf come from packages/chase;
// the Author API of AGENT-SURFACE.md 8.3 joins this entry as it lands. The
// source reader admits this module and @hackbuild/spec as chase imports
// (CHASE_IMPORT_MODULES, D-178). prismWithEdges is the edge spec on the stack
// route (PLAN.md 3.3, R1-engine-06); a build.ts awaits it for a body base.
// toggleHost and routeSearch let a tilt stick host route its own leads in
// the sandbox (R1-designs-reach-11): the host plan of the TOGGLE presets
// (packages/archetypes toggle/host.ts) and the copper route search over it,
// both pure functions of params and profile. The PIP stack, the z plan of
// each PIP button and seat, the copper router and its route record let
// designs/pip find its one host top, route its own terminals and emit the
// buried trace layers through the one port of model.js lines 30 to 51,
// emitTraceLayers, on the geom it loads (R1-designs-reach-09).

export { defineBuild, defineChase, type BuildFn, type CheckedChase, type ParamIdOf, type ParamsOf } from "@hackbuild/chase";
export { prismWithEdges, type EdgePrism } from "@hackbuild/mesh";
export type { EdgeKind, EdgeProfile, EdgeSpec } from "@hackbuild/geom";
export { TOGGLE_BLOCKS, TOGGLE_NAMES, toggleHost, toggleParams, type ToggleHost, type ToggleParams } from "@hackbuild/archetypes";
export {
  circle as pipCircle, clickDerive, clickParams, flexDims, flexParams, flexZ, pipStack, seatParams, seatZ, sep, snapUp, stickParams, stickZ, touchParams, touchZ,
  type ClickParams, type FlexParams, type PipStack, type SeatParams, type StickParams, type TouchParams,
} from "@hackbuild/archetypes";
export {
  emitTraceLayers, route, routeMetrics, routeRecord, routeSearch, traceStack, type RouteNet, type RouteResult, type StickRoute,
} from "@hackbuild/copper";
export { loadGeom, snapRing } from "@hackbuild/geom";
