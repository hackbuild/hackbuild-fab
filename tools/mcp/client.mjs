#!/usr/bin/env node
// A small MCP client for hbf: the pinned SDK client over stdio, spawning
// `hbf mcp`. Agents and tests drive the server through it.
//
//   node tools/mcp/client.mjs list [--tools <profile>] [--workspace <dir>]
//   node tools/mcp/client.mjs call <tool> '<json args>' [--ask] [--workspace <dir>]
//   node tools/mcp/client.mjs discover [--tools <profile>]
//
// list prints the tools as json; call prints the CommandResult
// (structuredContent) as json, then exits 0 when ok, 1 when not ok and 70
// on a protocol error. Without --ask the client declares no elicitation, so
// a fabrication export comes back E_GATE_UNAVAILABLE naming the line a
// person runs. With --ask it declares elicitation and puts the server's
// question to the person on this terminal; anything but y or yes declines,
// and without a terminal it declines. Nothing here answers for a person.

import { createInterface } from "node:readline";
import { createReadStream, createWriteStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport, getDefaultEnvironment } from "@modelcontextprotocol/client/stdio";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const HBF = path.join(ROOT, "core", "bin", "hbf.mjs");

/**
 * Connect to a fresh `hbf mcp` child. onElicit, when given, declares
 * elicitation and answers each form request; it returns the ElicitResult.
 */
export async function connect({ workspace = ROOT, toolset = "all", onElicit, stderr = "inherit" } = {}) {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [HBF, "mcp", "--workspace", workspace, "--tools", toolset],
    cwd: workspace,
    // The SDK default env drops SOURCE_DATE_EPOCH; the child builds under the caller's epoch, as the CLI does.
    env: { ...getDefaultEnvironment(), ...(process.env.SOURCE_DATE_EPOCH === undefined ? {} : { SOURCE_DATE_EPOCH: process.env.SOURCE_DATE_EPOCH }) },
    stderr,
  });
  const capabilities = onElicit === undefined ? {} : { elicitation: { form: {} } };
  // hbf serves protocol 2026-07-28 (D-108); the SDK client defaults to the 2025 handshake.
  const client = new Client({ name: "hbf-client", version: "0.0.0" }, { capabilities, versionNegotiation: { mode: { pin: "2026-07-28" } } });
  if (onElicit !== undefined) client.setRequestHandler("elicitation/create", (req) => onElicit(req.params));
  await client.connect(transport);
  return { client, close: () => client.close() };
}

/** Ask the person at this terminal; anything but y or yes declines. */
async function askTerminal(params) {
  if (process.stdin.isTTY !== true || process.stderr.isTTY !== true) return { action: "decline" };
  const input = createReadStream("/dev/tty");
  const output = createWriteStream("/dev/tty");
  const rl = createInterface({ input, output, terminal: false });
  try {
    output.write(`${params.message} [y/N] `);
    const line = await new Promise((resolve) => {
      rl.once("line", resolve);
      rl.once("close", () => resolve(undefined));
    });
    return /^\s*(y|yes)\s*$/i.test(line ?? "") ? { action: "accept", content: { approve: true } } : { action: "decline" };
  } finally {
    rl.close();
    input.destroy();
    output.end();
  }
}

function flags(argv) {
  const out = { positional: [], workspace: ROOT, tools: "all", ask: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--ask") out.ask = true;
    else if (a === "--workspace") out.workspace = path.resolve(argv[++i] ?? ".");
    else if (a === "--tools") out.tools = argv[++i] ?? "all";
    else out.positional.push(a);
  }
  return out;
}

const USAGE = "usage: node tools/mcp/client.mjs list|discover [--tools <profile>] | call <tool> '<json>' [--ask] [--workspace <dir>]";

async function cli(argv) {
  const f = flags(argv);
  const [verb, tool, json] = f.positional;
  if (verb !== "list" && verb !== "call" && verb !== "discover") {
    process.stderr.write(`${USAGE}\n`);
    return 2;
  }
  let args = {};
  if (verb === "call") {
    if (tool === undefined) {
      process.stderr.write(`${USAGE}\n`);
      return 2;
    }
    try {
      args = json === undefined ? {} : JSON.parse(json);
    } catch {
      process.stderr.write(`hbf-client: the args are not json: ${json}\n`);
      return 2;
    }
  }
  const { client, close } = await connect({ workspace: f.workspace, toolset: f.tools, ...(f.ask ? { onElicit: askTerminal } : {}) });
  try {
    if (verb === "list") {
      const { tools } = await client.listTools();
      process.stdout.write(`${JSON.stringify(tools, null, 2)}\n`);
      return 0;
    }
    if (verb === "discover") {
      process.stdout.write(`${JSON.stringify(await client.discover(), null, 2)}\n`);
      return 0;
    }
    const r = await client.callTool({ name: tool, arguments: args });
    const result = r.structuredContent ?? { isError: r.isError === true, content: r.content };
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return result.ok === true ? 0 : 1;
  } catch (e) {
    process.stderr.write(`hbf-client: ${e instanceof Error ? e.message : String(e)}\n`);
    return 70;
  } finally {
    await close();
  }
}

if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await cli(process.argv.slice(2));
}
