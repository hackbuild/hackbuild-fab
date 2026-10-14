// Public surface of the copper router (D-092): the octile negotiated core,
// its Manhattan mode, TOGGLE's assignment DP and route search, and the plan
// view cache. The test-only parity switches of negotiated.ts, manhattan.ts
// and search.ts stay out of these options.

import type { ConstantSource } from "@hackbuild/geom";
import { routeNegotiated, type RouteInput, type RouteResult } from "./negotiated.js";
import { routeManhattan as manhattanCore, type ManhattanInput, type ManhattanResult } from "./manhattan.js";
import { routeAll as routeAllCore, routeSearch as routeSearchCore, type StickPlan, type StickRoute } from "./search.js";
import type { RouteCache } from "./cache.js";

export { NEGOTIATION, ROUTE_CONSTANTS } from "./negotiated.js";
export type { HotCell, RouteInput, RouteNet, RouteResult, RouteSettings, RouteTerminal, RoutedNet } from "./negotiated.js";
export { MANHATTAN } from "./manhattan.js";
export type { ManhattanInput, ManhattanNet, ManhattanNetResult, ManhattanObstacle, ManhattanResult, ManhattanRun } from "./manhattan.js";
export { ASSIGN_RADIUS_WEIGHT, angDist, angNorm, assignments } from "./assign.js";
export type { Assignment } from "./assign.js";
export { ROUTE_CACHE_SIZE, RouteCache } from "./cache.js";
export { SEARCH, SEARCH_CONSTANTS, comGaps, createRouteCache } from "./search.js";
export type { PlanRect, StickPlan, StickRoute, StickTry } from "./search.js";

/** Route every net of `input` on two layers in octile mode with Float64 costs; `profile` supplies the keepout and zone pads. */
export function route(input: RouteInput, profile: ConstantSource): RouteResult {
  return routeNegotiated(input, profile);
}

/** Route two terminal nets in Manhattan mode (4-connected, TOGGLE constants) with Float64 costs. */
export function routeManhattan(input: ManhattanInput): ManhattanResult {
  return manhattanCore(input);
}

/** Route a tilt stick plan view: layer escalation, COM gaps, assignments and lead variants, first clean try wins. */
export function routeSearch(plan: StickPlan, profile: ConstantSource): StickRoute {
  return routeSearchCore(plan, profile);
}

/** routeSearch behind a plan view cache; a hit returns the stored route with cached true. */
export function routeAll(plan: StickPlan, profile: ConstantSource, cache: RouteCache<StickRoute>): StickRoute {
  return routeAllCore(plan, profile, cache);
}
