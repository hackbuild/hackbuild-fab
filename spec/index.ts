// spec/index.ts
/** Status: follows the files it re-exports. MILESTONES.md 1.5, D-179. */
// Re-exports every contract file. Packages may import from a single file
// (for example "@hackbuild/spec/checks" once the kernel exposes subpaths) or
// from this index.
// Version 4, 2026-10-04. Carries D-046.

export * from "./ids.js";
export * from "./schema.js";
export * from "./part-ir.js";
export * from "./features.js";
export * from "./board-features.js";
export * from "./feature-kinds.js";
export * from "./build.js";
export * from "./checks.js";
export * from "./constraints.js";
export * from "./profile.js";
export * from "./circuit.js";
export * from "./catalog.js";
export * from "./canon.js";
export * from "./sim.js";
export * from "./registry.js";
export * from "./chase.js";
export * from "./claims.js";
export * from "./bench.js";
export * from "./widgets.js";
export * from "./draft.js";
export * from "./hook.js";
export * from "./commands.js";
export * from "./errors.js";
export * from "./capabilities.js";
export * from "./jcs.js";
export * from "./nest.js";
export * from "./motion.js";
