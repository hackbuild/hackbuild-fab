// spec/fixtures/surface.ts
// Compile-time assertions on the command surface: 33 CLI commands, 19 MCP
// tools, no duplicates, every command covered by exactly one MCP tool or
// declared CLI-only, every closed vocabulary matching its union. The runtime
// twin is spec/test/surface.test.ts.
// Version 4, 2026-10-04. Carries D-057, D-058, D-059, D-106, D-107, D-177.

import { COMMAND_NAMES, MCP_TOOL_NAMES, MCP_TOOLS, CLI_ONLY, type CliOnlyField, type CommandName, type CommandIO, type McpToolIO, type McpToolName } from "../commands.js";
import { FEATURE_KINDS, CORE_FEATURE_KINDS, ADMITTED_FEATURE_KINDS, type FeatureKind, type KindsAdmittedBy, type MovedFeatureKind } from "../features.js";
import { BOARD_FEATURE_KINDS, type BoardFeatureKind } from "../board-features.js";
import { ERROR_CODES } from "../errors.js";
import { REGISTRY_KINDS } from "../registry.js";
import { KERNEL_IDS, MESH_ROUTES, TIERS, QUALIFIERS } from "../ids.js";

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Expect<T extends true> = T;

type HasDuplicates<T extends readonly unknown[]> =
  T extends readonly [infer H, ...infer R] ? (H extends R[number] ? true : HasDuplicates<R>) : false;

type Covered = (typeof MCP_TOOLS)[number]["covers"][number] | (typeof CLI_ONLY)[number];

/** Each MCP tool's covers, as a tuple of unions, to detect a command covered twice. */
type CoversFlat<T extends readonly { covers: readonly unknown[] }[]> =
  T extends readonly [infer H extends { covers: readonly unknown[] }, ...infer R extends readonly { covers: readonly unknown[] }[]]
    ? [...H["covers"], ...CoversFlat<R>]
    : [];

/** Every MCP_TOOLS selector names a field of that tool's McpToolIO input. */
type SelectorsResolve = {
  [T in (typeof MCP_TOOLS)[number] as T["name"]]: T["selector"] extends null
    ? true
    : T["selector"] extends keyof McpToolIO[T["name"]] ? true : false;
};

/**
 * Per tool, the CLI-only fields (network paths, standard rule 10) of its
 * covered commands that its MCP input still accepts; never on every tool.
 */
type LeakedCliOnlyFields = {
  [T in (typeof MCP_TOOLS)[number] as T["name"]]: Extract<keyof McpToolIO[T["name"]], CliOnlyField<T["covers"][number]>>;
};

export type SurfaceAssertions = [
  Expect<Equal<(typeof COMMAND_NAMES)["length"], 33>>,
  Expect<Equal<HasDuplicates<typeof COMMAND_NAMES>, false>>,
  Expect<Equal<(typeof MCP_TOOL_NAMES)["length"], 19>>,
  Expect<Equal<HasDuplicates<typeof MCP_TOOL_NAMES>, false>>,
  Expect<Equal<(typeof MCP_TOOLS)["length"], 19>>,
  Expect<Equal<keyof CommandIO, CommandName>>,
  Expect<Equal<keyof McpToolIO, McpToolName>>,
  Expect<Equal<SelectorsResolve[McpToolName], true>>,
  Expect<Equal<LeakedCliOnlyFields[McpToolName], never>>,
  Expect<Equal<CliOnlyField<"catalog.find">, "fetch">>,
  Expect<Equal<Covered, CommandName>>,
  Expect<Equal<HasDuplicates<[...CoversFlat<typeof MCP_TOOLS>, ...typeof CLI_ONLY]>, false>>,
  Expect<Equal<(typeof CORE_FEATURE_KINDS)["length"], 22>>,
  Expect<Equal<KindsAdmittedBy<"M16">, FeatureKind>>,
  Expect<Equal<KindsAdmittedBy<"M00">, never>>,
  Expect<Equal<KindsAdmittedBy<"M03">, "pocket" | "inlay">>,
  Expect<Equal<Extract<FeatureKind, MovedFeatureKind>, never>>,
  Expect<Equal<(typeof ADMITTED_FEATURE_KINDS)["length"], 8>>,
  Expect<Equal<(typeof FEATURE_KINDS)[number], FeatureKind>>,
  Expect<Equal<HasDuplicates<typeof FEATURE_KINDS>, false>>,
  Expect<Equal<(typeof BOARD_FEATURE_KINDS)[number], BoardFeatureKind>>,
  Expect<Equal<(typeof ERROR_CODES)["length"], 13>>,
  Expect<Equal<(typeof REGISTRY_KINDS)["length"], 11>>,
  Expect<Equal<(typeof KERNEL_IDS)["length"], 11>>,
  Expect<Equal<(typeof MESH_ROUTES)["length"], 11>>,
  Expect<Equal<(typeof TIERS)["length"], 5>>,
  Expect<Equal<(typeof QUALIFIERS)["length"], 5>>,
];

/** MCP tool order must equal the order of MCP_TOOLS entries. */
type ToolOrder<T extends readonly { name: unknown }[]> =
  T extends readonly [infer H extends { name: unknown }, ...infer R extends readonly { name: unknown }[]] ? [H["name"], ...ToolOrder<R>] : [];
export type OrderAssertion = Expect<Equal<ToolOrder<typeof MCP_TOOLS>, [...typeof MCP_TOOL_NAMES]>>;
