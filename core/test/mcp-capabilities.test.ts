// hbf://capabilities (R1-designs-reach-16): the hbf mcp server, driven by
// the SDK client over stdio through tools/mcp/client.mjs, lists one
// resource whose body equals hbf capabilities --json, and server/discover
// reports it with the sha256 of that body. The resource adds no tool: the
// list stays the served tools (spec MCP_TOOL_NAMES declares 21; a tool whose
// commands have no CommandDef yet is unserved, so the count is computed).

import { createHash } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MCP_TOOL_NAMES } from "@hackbuild/spec";
// @ts-expect-error tools/mcp/client.mjs is plain javascript without declarations
import { connect } from "../../tools/mcp/client.mjs";
import { servedTools, unservedTools } from "../src/mcp/schema.js";
import { hbf } from "./hbf.js";

interface McpClient {
  listTools(): Promise<{ tools: { name: string }[] }>;
  listResources(): Promise<{ resources: { uri: string; name: string; mimeType?: string }[] }>;
  listResourceTemplates(): Promise<{ resourceTemplates: { uriTemplate: string }[] }>;
  readResource(p: { uri: string }): Promise<{ contents: { uri: string; mimeType?: string; text?: string }[] }>;
  discover(): Promise<{ _meta?: Record<string, unknown> }>;
}

let client: McpClient;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ client, close } = await connect({ stderr: "ignore" }) as { client: McpClient; close: () => Promise<void> });
}, 60_000);
afterAll(async () => {
  await close();
});

describe("hbf://capabilities over stdio", () => {
  it("lists the capabilities resource as application/json", async () => {
    const { resources } = await client.listResources();
    expect(resources.map((r) => ({ uri: r.uri, name: r.name, mimeType: r.mimeType }))).toEqual([
      { uri: "hbf://capabilities", name: "capabilities", mimeType: "application/json" },
      { uri: "hbf://project/graph", name: "project-graph", mimeType: "application/json" },
    ]);
  }, 60_000);

  it("serves hbf://check/{id} as a template backed by explain, and the project graph", async () => {
    const { resourceTemplates } = await client.listResourceTemplates();
    expect(resourceTemplates.map((t) => t.uriTemplate)).toEqual(["hbf://check/{id}"]);
    const check = await client.readResource({ uri: "hbf://check/CHK-PRT-01" });
    expect(JSON.parse((check.contents[0] as { text: string }).text)).toMatchObject({ id: "CHK-PRT-01" });
    const graph = await client.readResource({ uri: "hbf://project/graph" });
    expect(JSON.parse((graph.contents[0] as { text: string }).text)).toHaveProperty("items");
  }, 120_000);

  it("reads the same rows hbf capabilities --json prints, and discover carries the sha256 of that body", async () => {
    const { contents } = await client.readResource({ uri: "hbf://capabilities" });
    expect(contents).toHaveLength(1);
    const body = contents[0]!;
    expect(body.uri).toBe("hbf://capabilities");
    expect(body.mimeType).toBe("application/json");
    const cli = await hbf(["capabilities", "--json"]);
    expect(cli.code).toBe(0);
    const rows = JSON.parse(body.text ?? "") as { functions: { function: string }[] };
    expect(rows).toEqual(JSON.parse(cli.out));
    expect(rows.functions.map((f) => f.function)).toContain("read");
    const d = await client.discover();
    const sha = createHash("sha256").update(body.text ?? "").digest("hex");
    expect(d._meta?.["resources"]).toEqual([{ uri: "hbf://capabilities", mimeType: "application/json", sha256: sha }]);
  }, 120_000);

  it("adds no tool: the list is the served tools, declared 21 less the unserved", async () => {
    const { tools } = await client.listTools();
    expect(MCP_TOOL_NAMES).toHaveLength(21);
    expect(tools.map((t) => t.name)).toEqual(servedTools("all").map((t) => t.def.name));
    expect(tools).toHaveLength(MCP_TOOL_NAMES.length - unservedTools("all").length);
    expect(tools.map((t) => t.name)).not.toContain("capabilities");
  }, 60_000);
});
