// @hackbuild/commands: every command hbf registers as a spec with no run
// body (tier 2, no node built-ins), the CLI form derived from the specs, and
// bind(), which joins the specs to a host's run bodies.

import type { UtilityVerb } from "@hackbuild/spec";
import { SPECS } from "./defs/index.js";
import type { CliForm } from "./spec.js";

export { bind } from "./spec.js";
export type { AnySpec, CliForm, CommandSpec, FlagKind, HostLists, Runs } from "./spec.js";
export { VIEW_MODES, type ViewModeName } from "./defs/view-render.js";
export { SPECS };

/** The CLI form of every command, read from its spec. */
export const CLI_FORM: Readonly<Record<string, CliForm>> = Object.fromEntries(SPECS.map((s) => [s.name, s.cli]));

/** The registered utility verbs (no verdict, no CommandDef). */
export const VERBS = ["doctor", "explain", "parity", "mcp"] as const satisfies readonly UtilityVerb[];
