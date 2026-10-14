// @hackbuild/constraints: the constraints registry and interval solver
// (D-044). Defs come from kernels and canons through core at load; this
// package imports spec only.

export { createRegistry, type ConstraintRegistry } from "./registry.js";
export { boundsFor, compose, nearest, onGrid, query, solve, type CeilingText, type OwnedBounds, type QueryResult } from "./solve.js";
export { forParams, type ParamSolve, type ParamUnsat } from "./params.js";
export { factPointer, unknownDimError } from "./errors.js";
export * from "./fixtures/index.js";
