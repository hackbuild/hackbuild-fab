// Transport parity (M12-T01 step 6): the MCP server, driven by the SDK
// client over stdio through tools/mcp/client.mjs, returns the same
// CommandResult the CLI prints with --json, compared as RFC 8785 canonical
// JSON with inputsHash and buildHash included.

import { createHash } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { canonicalize, type CommandResult } from "@hackbuild/spec";
// @ts-expect-error tools/mcp/client.mjs is plain javascript without declarations
import { connect } from "../../tools/mcp/client.mjs";
import { servedTools } from "../src/mcp/schema.js";
import { hbf, json, REF } from "./hbf.js";

interface ToolResult { structuredContent?: CommandResult<unknown>; content: { type: string; text?: string }[]; isError?: boolean }
interface McpClient {
  listTools(): Promise<{ tools: { name: string; annotations?: Record<string, boolean>; inputSchema: Record<string, unknown>; outputSchema?: unknown; description?: string }[] }>;
  callTool(p: { name: string; arguments: Record<string, unknown> }): Promise<ToolResult>;
  discover(): Promise<{ supportedVersions: string[]; _meta?: Record<string, unknown> }>;
}

let client: McpClient;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ client, close } = await connect({ stderr: "ignore" }) as { client: McpClient; close: () => Promise<void> });
}, 60_000);
afterAll(async () => {
  await close();
});

const canon = (r: unknown): string => canonicalize(r);

describe("hbf mcp over stdio", () => {
  it("lists every declared tool whose commands are registered, in wire order, with annotations and an output schema", async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toEqual(servedTools("all").map((t) => t.def.name));
    for (const t of tools) {
      const def = servedTools("all").find((s) => s.def.name === t.name)!.def;
      expect(t.annotations).toMatchObject({ ...def.annotations });
      expect(t.outputSchema).toBeDefined();
      expect(t.description?.startsWith(`Covers ${def.covers.join(", ")}.`)).toBe(true);
    }
    const pb = tools.find((t) => t.name === "part_build")!;
    expect((pb.inputSchema["properties"] as Record<string, { enum?: string[] }>)["op"]?.enum).toEqual(["build", "inspect"]);
  });

  it("part_build on the flex pair equals hbf part.build --json byte for byte", async () => {
    const cli = await json("part.build", REF);
    const mcp = await client.callTool({ name: "part_build", arguments: { op: "build", chase: REF, params: null, preset: null } });
    expect(mcp.isError ?? false).toBe(false);
    expect(mcp.structuredContent?.buildHash).toBe(cli.r.buildHash);
    expect(mcp.structuredContent?.inputsHash).toBe(cli.r.inputsHash);
    expect(canon(mcp.structuredContent)).toBe(canon(cli.r));
    const text = mcp.content.find((c) => c.type === "text")?.text ?? "";
    const mirror = await hbf(["part.build", REF]);
    expect(`${text}\n`).toBe(mirror.out);
  }, 120_000);

  it("check_run on the flex pair equals hbf check.run --json byte for byte", async () => {
    const cli = await json("check.run", REF);
    const mcp = await client.callTool({ name: "check_run", arguments: { report: "findings", build: REF } });
    expect(mcp.isError ?? false).toBe(false);
    expect(canon(mcp.structuredContent)).toBe(canon(cli.r));
  }, 120_000);

  it("a missing selector and a field another covered command owns are E_SCHEMA results, isError true", async () => {
    const none = await client.callTool({ name: "check_run", arguments: { build: REF } });
    expect(none.isError).toBe(true);
    expect(none.structuredContent?.errors[0]).toMatchObject({ code: "E_SCHEMA", path: "/report" });
    const other = await client.callTool({ name: "part_build", arguments: { op: "inspect", part: REF, chase: REF } });
    expect(other.isError).toBe(true);
    expect(other.structuredContent?.errors[0]).toMatchObject({ code: "E_SCHEMA", path: "/chase" });
  }, 60_000);

  it("view_render carries the png it stored as an image block, so a host off the server's disk sees the render", async () => {
    const built = await client.callTool({ name: "part_build", arguments: { op: "build", chase: REF } });
    const build = (built.structuredContent?.result as { build: string }).build;
    const mcp = await client.callTool({ name: "view_render", arguments: { target: build, mode: "iso" } });
    expect(mcp.isError ?? false).toBe(false);
    const art = mcp.structuredContent!.artifacts[0]!;
    expect(art.mediaType).toBe("image/png");
    const img = mcp.content.find((c) => c.type === "image") as { data: string; mimeType: string } | undefined;
    expect(img?.mimeType).toBe("image/png");
    const bytes = Buffer.from(img!.data, "base64");
    expect(bytes.length).toBe(art.bytes);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(art.hash);
  }, 120_000);

  it("server/discover carries the protocol and the facts hbf doctor --json prints", async () => {
    const d = await client.discover();
    expect(d.supportedVersions).toContain("2026-07-28");
    const doc = await hbf(["doctor", "--json"]);
    const facts = (JSON.parse(doc.out) as { result: { mcp: Record<string, unknown> } }).result.mcp;
    for (const k of ["toolsHash", "profileHash", "kernelVersion", "toolset", "protocol"]) expect(d._meta?.[k]).toEqual(facts[k]);
    expect(d._meta?.["tools"]).toEqual(servedTools("all").map((t) => t.def.name));
  }, 120_000);
});
