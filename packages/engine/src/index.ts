// @hackbuild/engine: the build half of a bench, for a page that loads it from
// a CDN or inlines it. A page writes a chase and a build function, passes
// them to createPageBuild with factsFor, and hands the result to
// @hackbuild/bench (pageBench). Headless: no DOM, no Vue.
//
// The engine owns geom and the one manifold-3d instance of a page. Other
// libraries read them from here (adoptManifold, configureManifold), so there
// is one instance and one set of options per page.

export { PACKAGE_KINDS as defaultKinds, createPageBuild, kernelKindsOf } from "@hackbuild/pipeline";
export type { KernelKinds, PageBuild, PageFacts, PageInput, PageResult } from "@hackbuild/pipeline";
export { pageFacts } from "@hackbuild/registry-loader";
export { adoptManifold, configureManifold, loadManifold } from "@hackbuild/geom";
export type { ManifoldOptions } from "@hackbuild/geom";
export { DEFAULT_EPOCH, factsFor } from "./facts.js";
export type { FactsOptions, PageSource } from "./facts.js";
