// spec/index.ts
/** Status: follows the files it re-exports. MILESTONES.md 1.5, D-179. */
// Re-exports every contract file. Packages may import from a single file
// (for example "@hackbuild/spec/checks" once the kernel exposes subpaths) or
// from this index.
// Version 4, 2026-10-04. Carries D-046.

export * from "./ids";
export * from "./schema";
export * from "./part-ir";
export * from "./features";
export * from "./board-features";
export * from "./feature-kinds";
export * from "./build";
export * from "./checks";
export * from "./constraints";
export * from "./profile";
export * from "./circuit";
export * from "./catalog";
export * from "./canon";
export * from "./sim";
export * from "./registry";
export * from "./chase";
export * from "./claims";
export * from "./bench";
export * from "./widgets";
export * from "./hook";
export * from "./commands";
export * from "./errors";
export * from "./capabilities";
export * from "./jcs";
export * from "./nest";
export * from "./motion";
