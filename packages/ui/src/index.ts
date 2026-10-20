// The @hackbuild/ui surface (PLAN.md 4, tier 3 row): the bench mount, the
// shell and its components, the shell store and useBench. The vite library
// build (vite.config.ts) bundles this file to dist/index.js; tsc -b leaves
// it out, since tsc cannot compile the single-file components it names.

export { mountBench, pageBench, pageOf, type BenchBuild, type BenchWriter, type MountOptions, type MountedBench, type PageBuildLike } from "./bench/entry.js";
export { useBench, type UseBench } from "./bench/use-bench.js";
export { useShell, type BenchReport, type BenchResult, type Values } from "./stores/shell.js";
export { default as BenchShell } from "./bench/BenchShell.vue";
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
