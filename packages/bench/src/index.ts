// The @hackbuild/bench surface (PLAN.md 4, tier 3 row): the bench mount, the
// shell and its components, the shell store and useBench. The vite library
// build (vite.config.ts) bundles this file to dist/index.js; tsc -b leaves
// it out, since tsc cannot compile the single-file components it names.

export { BenchRefusal, createBench, mountBench, pageBench, pageOf, type BenchBuild, type BenchController, type BenchOptions, type BenchViewOptions, type BenchWriter, type CreateBenchOptions, type DraftWidget, type MountOptions, type MountedBench, type PageBuildLike } from "./bench/entry.js";
export { useBench, type UseBench } from "./bench/use-bench.js";
export { useShell, type BenchReport, type BenchResult, type Values } from "./stores/shell.js";
export { default as ArtBoard } from "./art/ArtBoard.vue";
export { default as BenchShell } from "./bench/BenchShell.vue";
export { default as BenchView } from "./bench/BenchView.vue";
export { default as ChaseBench } from "./bench/ChaseBench.vue";
export { default as ChecksPanel } from "./panels/ChecksPanel.vue";
export { default as CurvePanel } from "./panels/CurvePanel.vue";
export { default as ExportsPanel } from "./panels/ExportsPanel.vue";
export { default as FitsPanel } from "./panels/FitsPanel.vue";
export { default as LogPanel } from "./panels/LogPanel.vue";
export { default as NotesPanel } from "./panels/NotesPanel.vue";
export { default as ParamRail } from "./rail/ParamRail.vue";
export { default as DrivePad } from "./stage/DrivePad.vue";
export { default as DrivePress } from "./widgets/DrivePress.vue";
export { default as PlotCurve } from "./widgets/PlotCurve.vue";
export { default as DriveTouch } from "./widgets/DriveTouch.vue";
export { default as DriveFader } from "./widgets/DriveFader.vue";
export { default as ReadoutSignal } from "./widgets/ReadoutSignal.vue";
export { default as DriveCode } from "./widgets/DriveCode.vue";
export { default as ViewLight } from "./widgets/ViewLight.vue";
export { default as ViewNetlens } from "./widgets/ViewNetlens.vue";
