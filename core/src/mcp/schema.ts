// The MCP projection of the command registry (M12-T01 step 3, D-107). Each
// tool in spec MCP_TOOLS is served when at least one command it covers has a
// CommandDef here; its input schema is the selector plus every field of
// every served covered command, derived from the CommandDef zod schemas, so
// the CLI and MCP share one validator. A field required by every served
// covered command stays required; any other field accepts null, which the
// router reads as absent.

import { z } from "zod";
import {
  CLI_ONLY, CLI_ONLY_FIELDS, toolsFor,
  type AnyCommandDef, type CommandName, type McpToolDef, type McpToolIO, type McpToolName, type ToolsetProfile,
} from "@hackbuild/spec";
import { commandOf } from "../registry.js";

/**
 * Selector value to command, per grouped tool, as McpToolIO declares the
 * selector enums. Each row is checked against McpToolIO, so a renamed or
 * added selector value fails tsc here.
 */
export const SELECTOR_ROUTES = {
  catalog_search: { find: "catalog.find", pins: "catalog.pins" } satisfies Record<McpToolIO["catalog_search"]["op"], CommandName>,
  canon_search: { mechanisms: "mech.find", archetypes: "arch.find", reference: "reference.list" } satisfies Record<McpToolIO["canon_search"]["canon"], CommandName>,
  chase_validate: { validate: "chase.validate", diff: "chase.diff" } satisfies Record<McpToolIO["chase_validate"]["op"], CommandName>,
  part_build: { build: "part.build", inspect: "part.inspect" } satisfies Record<McpToolIO["part_build"]["op"], CommandName>,
  layout_solve: { assembly: "asm.solve", nest: "nest.pack" } satisfies Record<McpToolIO["layout_solve"]["op"], CommandName>,
  check_run: { findings: "check.run", fits: "fits.table" } satisfies Record<McpToolIO["check_run"]["report"], CommandName>,
  sim_run: { trials: "sim.run", sweep: "sim.sweep" } satisfies Record<McpToolIO["sim_run"]["mode"], CommandName>,
  motion_run: { run: "motion.run", audit: "rules.audit" } satisfies Record<McpToolIO["motion_run"]["op"], CommandName>,
  chase_bake: { bake: "chase.bake", render: "chase.render" } satisfies Record<McpToolIO["chase_bake"]["mode"], CommandName>,
} as const satisfies { readonly [T in McpToolName]?: Readonly<Record<string, CommandName>> };

/**
 * Command field renames on the MCP side: layout_solve carries nest.pack
 * `mode` as `nestMode`, so no nest field reads as a selector (McpToolIO).
 */
export const FIELD_RENAMES: { readonly [N in CommandName]?: Readonly<Record<string, string>> } = {
  "nest.pack": { nestMode: "mode" },
};

/** One served tool: its spec row, the covered commands with a CommandDef, and the routes the selector takes. */
export interface ServedTool {
  readonly def: McpToolDef;
  /** Covered commands that have a CommandDef in this build, in covers order. */
  readonly commands: readonly AnyCommandDef[];
  /** Covered commands without a CommandDef in this build. */
  readonly missing: readonly CommandName[];
  /** Selector value to command for the served commands; empty for a one-command tool. */
  readonly routes: Readonly<Record<string, CommandName>>;
}

const shapeOf = (d: AnyCommandDef): Readonly<Record<string, z.ZodType>> =>
  (d.input as unknown as z.ZodObject).shape as Readonly<Record<string, z.ZodType>>;

/** MCP field name to command field name for command n. */
export function mcpFieldOf(n: CommandName, field: string): string {
  const renames = FIELD_RENAMES[n] ?? {};
  return Object.entries(renames).find(([, to]) => to === field)?.[0] ?? field;
}

/** The input fields a command takes over MCP: its schema keys less CLI_ONLY_FIELDS, renamed per FIELD_RENAMES. */
export function mcpFields(d: AnyCommandDef): string[] {
  const cliOnly: readonly string[] = (CLI_ONLY_FIELDS as Readonly<Record<string, readonly string[]>>)[d.name] ?? [];
  return Object.keys(shapeOf(d)).filter((k) => !cliOnly.includes(k)).map((k) => mcpFieldOf(d.name, k));
}

/** The tools a profile serves, in wire order, with the covered commands this build registers. */
export function servedTools(profile: ToolsetProfile): ServedTool[] {
  return toolsFor(profile).flatMap((def): ServedTool[] => {
    const covers = def.covers.filter((c) => !(CLI_ONLY as readonly string[]).includes(c));
    const commands = covers.map((c) => commandOf(c)).filter((d): d is AnyCommandDef => d !== undefined);
    if (commands.length === 0) return [];
    const all: Readonly<Record<string, CommandName>> = (SELECTOR_ROUTES as Readonly<Record<string, Readonly<Record<string, CommandName>>>>)[def.name] ?? {};
    const routes = Object.fromEntries(Object.entries(all).filter(([, c]) => commands.some((d) => d.name === c)));
    return [{ def, commands, missing: covers.filter((c) => commandOf(c) === undefined), routes }];
  });
}

/** Tools in a profile none of whose covered commands is registered yet. */
export function unservedTools(profile: ToolsetProfile): McpToolName[] {
  const served = new Set(servedTools(profile).map((t) => t.def.name));
  return toolsFor(profile).map((t) => t.name).filter((n) => !served.has(n));
}

type Json = Record<string, unknown>;

function jsonOf(d: AnyCommandDef): { properties: Json; required: string[] } {
  const js = z.toJSONSchema(d.input as unknown as z.ZodType, { io: "input", unrepresentable: "any" }) as Json;
  const props = (js["properties"] ?? {}) as Json;
  const cliOnly: readonly string[] = (CLI_ONLY_FIELDS as Readonly<Record<string, readonly string[]>>)[d.name] ?? [];
  const properties: Json = {};
  for (const [k, v] of Object.entries(props)) if (!cliOnly.includes(k)) properties[mcpFieldOf(d.name, k)] = v;
  const required = ((js["required"] ?? []) as string[]).filter((k) => !cliOnly.includes(k)).map((k) => mcpFieldOf(d.name, k));
  return { properties, required };
}

const nullable = (s: unknown): Json => ({ anyOf: [s, { type: "null" }] });

/** The JSON Schema a tool lists: the selector enum, then every field of every served covered command. */
export function toolInputJson(t: ServedTool): Json {
  const parts = t.commands.map(jsonOf);
  const properties: Json = {};
  const required: string[] = [];
  if (t.def.selector !== null) {
    properties[t.def.selector] = {
      type: "string", enum: Object.keys(t.routes),
      description: `picks the command: ${Object.entries(t.routes).map(([v, c]) => `${v} runs ${c}`).join(", ")}`,
    };
    required.push(t.def.selector);
  }
  for (const p of parts) {
    for (const [k, v] of Object.entries(p.properties)) {
      const everywhere = parts.every((q) => q.required.includes(k));
      if (properties[k] !== undefined) continue;
      const owners = t.commands.filter((_, j) => parts[j]!.properties[k] !== undefined).map((d) => d.name);
      const desc = (v as Json)["description"];
      const note = t.commands.length > 1 && owners.length < t.commands.length ? `${owners.join(", ")} only` : undefined;
      const body = note === undefined ? v : { ...(v as Json), description: [desc, note].filter((x) => x !== undefined).join("; ") };
      properties[k] = everywhere ? body : nullable(body);
      if (everywhere) required.push(k);
    }
  }
  return { type: "object", properties, required, additionalProperties: false };
}

/** The outputSchema every tool lists: the CommandResult top level (spec/commands.ts). */
export const COMMAND_RESULT_JSON: Json = {
  type: "object",
  properties: {
    ok: { type: "boolean" },
    verdict: { type: "string", enum: ["pass", "warn", "fail", "skip"] },
    stage: { type: "string", enum: ["input", "preflight", "build", "check", "gate", "done"] },
    result: {},
    buildHash: { type: "string" },
    inputsHash: { type: "string" },
    findings: { type: "array", items: { type: "object" } },
    counts: {
      type: "object",
      properties: { pass: { type: "integer" }, warn: { type: "integer" }, fail: { type: "integer" }, skip: { type: "integer" } },
      required: ["pass", "warn", "fail", "skip"],
    },
    errors: { type: "array", items: { type: "object" } },
    artifacts: { type: "array", items: { type: "object" } },
    truncated: { type: "object" },
    next: { type: "array", items: { type: "object" } },
    gate: { type: "string", enum: ["approval"] },
  },
  required: ["ok", "verdict", "stage", "inputsHash", "findings", "counts", "errors", "artifacts", "next"],
};

/** Top-level keys COMMAND_RESULT_JSON requires; the output check reads only these. */
const RESULT_KEYS = COMMAND_RESULT_JSON["required"] as readonly string[];

/**
 * A Standard Schema with JSON for the SDK. The input side passes the value
 * through unchanged: the router validates with the CommandDef schema, so a
 * bad argument comes back as an E_SCHEMA CommandResult, never as an SDK
 * text error. The output side checks the CommandResult top level.
 */
export function standardOf(json: Json, side: "input" | "output"): { readonly "~standard": unknown } {
  return {
    "~standard": {
      version: 1,
      vendor: "hbf",
      validate: (value: unknown) => {
        if (side === "input") return { value };
        const missing = typeof value === "object" && value !== null ? RESULT_KEYS.filter((k) => !(k in value)) : [...RESULT_KEYS];
        return missing.length === 0 ? { value } : { issues: [{ message: `commandresult lacks ${missing.join(", ")}` }] };
      },
      jsonSchema: { input: () => json, output: () => json },
    },
  };
}
