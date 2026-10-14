// What `server/discover` and `hbf doctor --json` both report about the MCP
// surface (M12-T09 step 1 and 2), so a host can tell from one request
// whether its cached tool list is current. Every hash is computed here from
// files and the registry, never typed.

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { MCP_TOOL_NAMES, sha256Hex, type ToolsetProfile } from "@hackbuild/spec";
import { hashOf } from "../jcs.js";
import { servedTools, toolInputJson, unservedTools } from "./schema.js";

/** The protocol revision the pinned SDK serves (PLAN.md section 16, D-108). */
export const MCP_PROTOCOL = "2026-07-28";

export interface McpFacts {
  readonly protocol: string;
  readonly toolset: ToolsetProfile;
  /** Tools this server lists for the toolset, wire order. */
  readonly tools: readonly string[];
  /** Tools the toolset names whose covered commands have no CommandDef yet. */
  readonly unserved: readonly string[];
  /** count, computed: spec MCP_TOOL_NAMES. */
  readonly declared: number;
  /** sha256 of the canonical tool list (name, annotations, input schema), computed. */
  readonly toolsHash: string;
  /** sha256 over the profile data files in path order, computed. */
  readonly profileHash: string;
  /** @hackbuild/kernel package version. */
  readonly kernelVersion: string;
  /** Installed versions of the MCP SDK packages. */
  readonly sdk: Readonly<Record<string, string>>;
}

const versionOf = (file: string): string => {
  try {
    return String((JSON.parse(readFileSync(file, "utf8")) as { version?: unknown }).version ?? "unknown");
  } catch {
    return "absent";
  }
};

/** sha256 over packages/profile/data/*.json, each file as its relative path and its sha256. */
export function profileHash(workspace: string): string {
  const dir = path.join(workspace, "packages", "profile", "data");
  let files: string[];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
  } catch {
    return "absent";
  }
  return hashOf(files.map((f) => ({ path: `packages/profile/data/${f}`, sha256: sha256Hex(readFileSync(path.join(dir, f))) })));
}

export function mcpFacts(workspace: string, toolset: ToolsetProfile): McpFacts {
  const served = servedTools(toolset);
  const nm = path.join(workspace, "node_modules", "@modelcontextprotocol");
  return {
    protocol: MCP_PROTOCOL,
    toolset,
    tools: served.map((t) => t.def.name),
    unserved: unservedTools(toolset),
    declared: MCP_TOOL_NAMES.length,
    toolsHash: hashOf(served.map((t) => ({ name: t.def.name, annotations: t.def.annotations, inputSchema: toolInputJson(t) }))),
    profileHash: profileHash(workspace),
    kernelVersion: versionOf(path.join(workspace, "kernel", "package.json")),
    sdk: Object.fromEntries(["server", "core", "client"].map((p) => [`@modelcontextprotocol/${p}`, versionOf(path.join(nm, p, "package.json"))])),
  };
}
