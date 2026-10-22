// hbf mcp (utility verb, M12-T01 step 7, D-106): serve the registered
// commands over MCP on stdio until the client closes stdin.
//   hbf mcp [--workspace <dir>] [--tools all|query,prove|sweep]
// stdout carries only protocol frames, so console output moves to stderr
// for the life of the server. --http lands with M12-T03.

import path from "node:path";
import { TOOLSET_PROFILES, type ToolsetProfile } from "@hackbuild/spec";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { cmdError } from "../errors.js";
import { createHbfServer } from "../mcp/server.js";
import { projectRoot } from "./build.js";

export interface McpArgs {
  readonly workspace?: string;
  readonly tools?: string;
  readonly http?: string;
}

const PROFILES = Object.keys(TOOLSET_PROFILES) as ToolsetProfile[];

/** Start the stdio server and resolve when stdin closes. */
export async function runMcp(a: McpArgs, cwd: string): Promise<number> {
  if (a.http !== undefined) {
    throw cmdError({ code: "E_SCHEMA", path: "/http", got: a.http, hint: "the streamable http transport lands with M12-T03; run hbf mcp on stdio" });
  }
  const toolset = (a.tools ?? "all") as ToolsetProfile;
  if (!PROFILES.includes(toolset)) {
    throw cmdError({ code: "E_SCHEMA", path: "/tools", got: a.tools, expected: PROFILES.join(", "), hint: "name a toolset profile (D-107)" });
  }
  // A maker folder serves from its own store; the tools read the kernel of the hbf that runs.
  const asked = path.resolve(cwd, a.workspace ?? ".");
  let workspace: string;
  try {
    workspace = projectRoot(asked);
  } catch {
    throw cmdError({
      code: "E_REF", path: "/workspace", got: asked, expected: "the hackbuild-fab workspace or a maker folder hbf init wrote",
      hint: "point --workspace at the repository or at a folder holding chase.ts and the package.json hbf init wrote",
    });
  }
  for (const k of ["log", "info", "warn", "debug"] as const) console[k] = console.error;
  const closed = new Promise<void>((resolve) => {
    process.stdin.once("end", resolve);
    process.stdin.once("close", resolve);
  });
  const handle = serveStdio(() => createHbfServer({ workspace, toolset }), {
    onerror: (e) => process.stderr.write(`hbf mcp: ${e.message}\n`),
  });
  await closed;
  await handle.close();
  return 0;
}
