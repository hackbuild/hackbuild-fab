// Cut-sheet gates of the KEYWAY family on packages/copper (M05-T14,
// M05-T15): run bodies over the board as data, one file per gate family,
// run by the board's gate program.

export { boolGate, fill, intervalGate, type Gate, type GateCtx, type GateId } from "./gate.js";
export { GATE_STEPS, runProgram } from "./program.js";
export { sampleRatio } from "./ratio.js";
export { erodeSurvival, minClearance, netlistAudit, outlineKeepout, singleIsland } from "./nets.js";
export { artGaps } from "./art.js";
export { sampleSlider, sliderGates, type SliderSamples } from "./slider.js";
export { clipStagger } from "./clips.js";
export { foreignNets, slidingFilm, zoneGates } from "./film.js";
export { wiperGates } from "./wiper.js";
export { filmKeepout, oneDocumentSize, spacersOnePiece } from "./sheets.js";
export { exportVinyl, runVinyl, vinylGates, type VinylExport, type VinylRun } from "./run.js";
