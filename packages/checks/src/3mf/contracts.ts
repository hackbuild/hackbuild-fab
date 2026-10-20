// The vendored hackbuild-3mf carries its own copy of the spec contracts it
// reads (js/src/contracts.ts), so packages/3mf imports no workspace package
// (D-027, R1-engine-03). tsc -b compiles this file; a drift between the
// copy and spec fails the build here, in the one tier that sees both.

import type { BuildWarning as SpecBuildWarning, CheckResult as SpecCheckResult, CommandError as SpecCommandError, MachinePreset } from "@hackbuild/spec";
import type { BuildWarning, CheckResult, CommandError, SlicerPreset } from "@hackbuild/3mf";

/** True only when A and B are the same type, each assignable to the other in every position. */
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

/** The slicer block of a machine preset, as the writer reads it. */
export const SLICER_PRESET_IS_SPEC: Equal<SlicerPreset, MachinePreset["slicer"]> = true;
/** Errors the writer throws are spec command errors. */
export const COMMAND_ERROR_IS_SPEC: Equal<CommandError, SpecCommandError> = true;
// The copy types Fix.patch and BuildWarning.bound as unknown, wider than
// spec PatchEdit and Bound, and brands Hash with its own symbol. The
// vendored code sets neither field, so fab narrows its results to the spec
// types where they cross (pipeline export3mf, defs/3mf/validator.ts); these
// two keep that narrowing one way.
/** Every spec check result is a vendored one. */
export const SPEC_CHECK_RESULT_FITS: SpecCheckResult extends CheckResult ? true : false = true;
/** Every spec build warning is a vendored one. */
export const SPEC_BUILD_WARNING_FITS: SpecBuildWarning extends BuildWarning ? true : false = true;
