// The hbf MCP server (M12-T01, D-107, D-108) on @modelcontextprotocol/server
// 2.3.0, protocol 2026-07-28. Stateless: no session map and no cache that
// changes a result; every handle is an hbf:// uri into the workspace store.
// Tools come from spec MCP_TOOLS and the CommandDef registry; each result
// carries structuredContent = the CommandResult, one text block holding
// the text mirror the CLI prints, and one image block per png artifact.
// Resources come from MCP_RESOURCES; a read builds its body at call time.

import {
  CLIENT_CAPABILITIES_META_KEY, McpServer, inputRequired,
  type CallToolResult, type ServerContext, type ToolAnnotations,
} from "@modelcontextprotocol/server";
import type { ToolsetProfile } from "@hackbuild/spec";
import { gateKey } from "../gate.js";
import { FileNonceLedger } from "../gate-ledger.js";
import { GATE_FORM, GATE_INPUT_KEY, handle, imageBlocks, type McpEnv } from "./handlers.js";
import { COMMAND_RESULT_JSON, servedTools, standardOf, toolInputJson, type ServedTool } from "./schema.js";
import { MCP_RESOURCES, mcpFacts } from "./discover.js";

export interface McpServerOptions {
  readonly workspace: string;
  readonly toolset: ToolsetProfile;
  /** Epoch ms; tests inject a clock. */
  readonly now?: () => number;
}

/** Tool description: "Covers <cli names>." then each covered command's own description (spec MCP_TOOLS). */
function describe(t: ServedTool): string {
  const head = `Covers ${t.def.covers.join(", ")}.`;
  const missing = t.missing.length === 0 ? [] : [`${t.missing.join(", ")} not registered in this build.`];
  const gate = t.def.gated ? ["A fabrication export asks the person through the host before it writes; a client without elicitation gets E_GATE_UNAVAILABLE naming the line a person runs."] : [];
  return [head, ...missing, ...gate, ...t.commands.map((d) => `${d.name}: ${d.description}`)].join(" ");
}

function clientElicits(ctx: ServerContext, server: McpServer): boolean {
  const env = ctx.mcpReq.envelope as Record<string, unknown> | undefined;
  const caps = (env?.[CLIENT_CAPABILITIES_META_KEY] ?? server.server.getClientCapabilities()) as { elicitation?: unknown } | undefined;
  return caps?.elicitation !== undefined && caps.elicitation !== null;
}

/** A fresh server for one connection; the stdio entry calls this once per connection. */
export function createHbfServer(o: McpServerOptions): McpServer {
  const env: McpEnv = {
    workspace: o.workspace,
    now: o.now ?? Date.now,
    key: () => gateKey(o.workspace),
    ledger: new FileNonceLedger(o.workspace),
  };
  const facts = mcpFacts(o.workspace, o.toolset);
  const server = new McpServer({ name: "hbf", version: "0.0.0" }, { capabilities: { tools: { listChanged: false } } });
  for (const t of servedTools(o.toolset)) {
    const annotations: ToolAnnotations = { ...t.def.annotations };
    server.registerTool(t.def.name, {
      description: describe(t),
      inputSchema: standardOf(toolInputJson(t), "input") as never,
      outputSchema: standardOf(COMMAND_RESULT_JSON, "output") as never,
      annotations,
    }, (async (args: Record<string, unknown>, ctx: ServerContext) => {
      const responses = ctx.mcpReq.inputResponses;
      const state = ctx.mcpReq.requestState<string>();
      const out = await handle(t, {
        args: args ?? {},
        elicitation: clientElicits(ctx, server),
        ...(typeof state === "string" ? { requestState: state } : {}),
        ...(responses === undefined ? {} : { inputResponses: responses }),
        signal: ctx.mcpReq.signal,
      }, env);
      if (out.kind === "ask") {
        return inputRequired({
          inputRequests: { [GATE_INPUT_KEY]: inputRequired.elicit({ message: out.message, requestedSchema: GATE_FORM as never }) },
          requestState: out.requestState,
        });
      }
      const result: CallToolResult = {
        content: [{ type: "text", text: out.text }, ...(await imageBlocks(out.result, o.workspace))],
        structuredContent: out.result as unknown as Record<string, unknown>,
        ...(out.isError ? { isError: true } : {}),
      };
      return result;
    }) as never);
  }
  for (const r of MCP_RESOURCES) {
    server.registerResource(r.name, r.uri, { title: r.title, description: r.description, mimeType: r.mimeType }, (uri) => ({
      contents: [{ uri: uri.href, mimeType: r.mimeType, text: r.text(o.workspace) }],
    }));
  }
  // server/discover keeps the SDK's answer and adds the facts a host caches by (M12-T09 step 1).
  // The serving entry reinstalls the discover handler on connect and calls the
  // instance's _ondiscover, so that method is the seam (SDK 2.3.0, pinned).
  const inner = server.server as unknown as { _ondiscover: () => Record<string, unknown> };
  const sdkDiscover = inner._ondiscover.bind(server.server);
  inner._ondiscover = () => {
    const sdk = sdkDiscover();
    return { ...sdk, _meta: { ...(sdk["_meta"] as Record<string, unknown> | undefined), ...facts } };
  };
  return server;
}
