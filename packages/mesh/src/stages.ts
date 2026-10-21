// The D-047 stage runner, per body then per part: 1 base shape through its
// route; 2 pre-union cutters; 3 union positives; 4 post-union cutters; 5
// partition by role priority (flex-conductor, flex, conductor, art, body);
// 6 insets (coincidence, pinch); 7 frame emit; 8 hash. Stages 2 to 4 take
// the lists a caller passes per body id, and feature kind bodies (conductor,
// inlay) join the draft's bodies before stage 1. This is the only stage
// runner: core's part.build meshes every design here (ARCHITECTURE.md 4).
// Every wasm object a run makes is owned by one scope and freed before the
// run returns (D-055).
//
// One file per stage under ./stages/ (R1-split-01); this file re-exports
// what the package index and the tests read.

export { ADJACENCY_MIN_MM2 } from "./stages/adjacency.js";
export { MESH_ROUTE_DEFS } from "./stages/base.js";
export { toManifold } from "./stages/cut.js";
export { runStages } from "./stages/run.js";
export { stageImported } from "./stages/imported.js";
export type { BodyCutters, RasterMask, StageInput, StagedBody, StageOutput } from "./stages/types.js";
export type { ImportedGroup, ImportedPiece, ImportedStageBody, ImportedStageOutput } from "./stages/imported.js";
