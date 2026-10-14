// The export gate over MCP (M12-T04, D-109). Over stdio through
// tools/mcp/client.mjs: a client without elicitation gets
// E_GATE_UNAVAILABLE naming the line a person runs; a client that declines
// or cancels gets E_GATE. In process, through the same handler the server
// runs: forged, expired, replayed and args-moved states refuse, and only a
// verified approval of the build the person saw writes. Every case asserts
// the files on disk before and after.

import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { canonicalize, type CommandResult } from "@hackbuild/spec";
// @ts-expect-error tools/mcp/client.mjs is plain javascript without declarations
import { connect } from "../../tools/mcp/client.mjs";
import { digestArgs, mintState, verifyState, type NonceLedger } from "../src/gate.js";
import { handle, type McpCall, type McpEnv } from "../src/mcp/handlers.js";
import { servedTools } from "../src/mcp/schema.js";
import { REF, ROOT } from "./hbf.js";

const OUT = path.join(ROOT, REF, "out");
const ARTIFACTS = path.join(ROOT, ".hbf", "store", "artifacts");
const ARGS = { chase: REF, kind: "3mf", machine: "ffc5p" };

/** Every file under the export folder and the artifact store, with size and mtime. */
function snapshot(): string[] {
  const walk = (dir: string): string[] => !existsSync(dir) ? [] : readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    const s = statSync(p);
    return [`${path.relative(ROOT, p)} ${s.size} ${s.mtimeMs}`];
  });
  return [...walk(OUT), ...walk(ARTIFACTS)].sort();
}

interface ToolResult { structuredContent?: CommandResult<unknown>; isError?: boolean }
interface McpClient { callTool(p: { name: string; arguments: Record<string, unknown> }): Promise<ToolResult> }

async function overStdio(onElicit?: (p: { message: string }) => Promise<unknown>): Promise<{ r: ToolResult; asked: string[] }> {
  const asked: string[] = [];
  const opts = onElicit === undefined ? { stderr: "ignore" } : { stderr: "ignore", onElicit: (p: { message: string }) => { asked.push(p.message); return onElicit(p); } };
  const { client, close } = await connect(opts) as { client: McpClient; close: () => Promise<void> };
  try {
    return { r: await client.callTool({ name: "export_run", arguments: ARGS }), asked };
  } finally {
    await close();
  }
}

describe("export_run over stdio writes nothing without an approval", () => {
  it("a client without elicitation gets E_GATE_UNAVAILABLE naming the cli line", async () => {
    const before = snapshot();
    const { r } = await overStdio();
    expect(r.isError).toBe(true);
    expect(r.structuredContent?.errors[0]).toMatchObject({ code: "E_GATE_UNAVAILABLE" });
    expect(r.structuredContent?.errors[0]?.personRuns).toBe(`npx --no-install hbf export.run ${REF} --kind 3mf --machine ffc5p`);
    expect(r.structuredContent?.artifacts).toEqual([]);
    expect(snapshot()).toEqual(before);
  }, 120_000);

  for (const action of ["decline", "cancel"] as const) {
    it(`a ${action} answer is E_GATE and the prompt named the build`, async () => {
      const before = snapshot();
      const { r, asked } = await overStdio(() => Promise.resolve({ action }));
      expect(asked).toHaveLength(1);
      expect(asked[0]).toMatch(/^export 3mf for ffc5p from .+, build [0-9a-f]{6}\.\.[0-9a-f]{2}, \d+ fail, \d+ warn\..* this approval does not identify who approved\.$/);
      expect(r.isError).toBe(true);
      expect(r.structuredContent?.errors[0]).toMatchObject({ code: "E_GATE", got: action });
      expect(snapshot()).toEqual(before);
    }, 120_000);
  }

  it("approve false is E_GATE", async () => {
    const before = snapshot();
    const { r } = await overStdio(() => Promise.resolve({ action: "accept", content: { approve: false } }));
    expect(r.structuredContent?.errors[0]).toMatchObject({ code: "E_GATE", got: "approve false" });
    expect(snapshot()).toEqual(before);
  }, 120_000);
});

class MemLedger implements NonceLedger {
  readonly used = new Set<string>();
  consume(nonce: string): boolean {
    if (this.used.has(nonce)) return false;
    this.used.add(nonce);
    return true;
  }
}

describe("export_run gate states, in process", () => {
  const tool = servedTools("all").find((t) => t.def.name === "export_run")!;
  const key = Buffer.alloc(32, 7);
  let clock = 1_791_072_000_000;
  const env = (ledger: NonceLedger = new MemLedger()): McpEnv => ({ workspace: ROOT, now: () => clock, key: () => key, ledger });
  const call = (extra: Partial<McpCall> = {}): McpCall => ({ args: ARGS, elicitation: true, signal: new AbortController().signal, ...extra });
  const accept = { approve: { action: "accept", content: { approve: true } } };
  const written: string[] = [];
  afterEach(() => {
    for (const f of written.splice(0)) rmSync(f, { force: true });
  });

  async function ask(e: McpEnv): Promise<string> {
    const o = await handle(tool, call(), e);
    if (o.kind !== "ask") throw new Error(`expected input_required, got ${JSON.stringify(o)}`);
    return o.requestState;
  }

  it("forged, expired, args-moved and replayed states write nothing", async () => {
    const e = env();
    const state = await ask(e);
    const before = snapshot();
    // The first signature character carries six signature bits; the last
    // carries two unused padding bits, so flipping it can decode unchanged.
    const flip = (s: string): string => {
      const i = s.lastIndexOf(".") + 1;
      return `${s.slice(0, i)}${s[i] === "A" ? "B" : "A"}${s.slice(i + 1)}`;
    };
    const forged = await handle(tool, call({ requestState: flip(state), inputResponses: accept }), e);
    const moved = await handle(tool, call({ args: { ...ARGS, machine: "centauri" }, requestState: state, inputResponses: accept }), e);
    clock += 600_001;
    const expired = await handle(tool, call({ requestState: state, inputResponses: accept }), e);
    clock -= 600_001;
    for (const [o, reason] of [[forged, "forged"], [moved, "args-moved"], [expired, "expired"]] as const) {
      expect(o.kind).toBe("result");
      if (o.kind === "result") {
        expect(o.isError).toBe(true);
        expect(o.result.errors[0]).toMatchObject({ code: "E_GATE", got: reason });
      }
    }
    expect(snapshot()).toEqual(before);
    const ledger = new MemLedger();
    const e2 = env(ledger);
    const s2 = await ask(e2);
    const claim = JSON.parse(Buffer.from(s2.split(".")[0]!, "base64url").toString("utf8")) as { nonce: string };
    ledger.used.add(claim.nonce);
    const replayed = await handle(tool, call({ requestState: s2, inputResponses: accept }), e2);
    expect(replayed.kind === "result" && replayed.result.errors[0]).toMatchObject({ code: "E_GATE", got: "replayed" });
    expect(snapshot()).toEqual(before);
  }, 180_000);

  it("a verified approval of the same build writes the 3mf once", async () => {
    const e = env();
    const state = await ask(e);
    const before = new Set(snapshot().map((l) => l.split(" ")[0]));
    const o = await handle(tool, call({ requestState: state, inputResponses: accept }), e);
    for (const l of snapshot()) {
      const f = l.split(" ")[0]!;
      if (!before.has(f) && f.startsWith(path.join(REF, "out"))) written.push(path.join(ROOT, f));
    }
    expect(o.kind).toBe("result");
    if (o.kind !== "result") return;
    expect(o.result.errors).toEqual([]);
    expect(o.result.artifacts).toHaveLength(1);
    expect(o.result.artifacts[0]?.kind).toBe("3mf");
    const again = await handle(tool, call({ requestState: state, inputResponses: accept }), e);
    expect(again.kind === "result" && again.result.errors[0]).toMatchObject({ code: "E_GATE", got: "replayed" });
  }, 180_000);
});

describe("gate test vector (M12-T04)", () => {
  const key = Buffer.from("0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20", "hex");
  const vector = "eyJhcmdzRGlnZXN0IjoiYzViZDBkMzcwODE2MzUxZDdjMGFhNGViNDBiYjUwNGYwZGU4MGQ2MjI4NmRhYjE0ODE0NTJkYWM4N2NiNWFjNCIsImJ1aWxkSGFzaCI6Ijc0Y2Q2N2U4M2Q4ZTkxZTdjOTc5ZDUzYTZlMDYzNWNhYmEwNWE2MTNhZWU0MTA3Y2IxN2FhYzg0YjUwZDllNDIiLCJjbWQiOiJleHBvcnQucnVuIiwiZXhwIjoxNzkxMDcyNjAwMDAwLCJub25jZSI6IkFBQUFBQUFBQUFBQUFBQUFBQUFBQUEifQ.jc6VVUtfo_ZQjlf40szqPLJU5BK9tkqVanSxfLWkPzA";
  const args = { chase: "keys-flex-pair", kind: "3mf", machine: "ffc5p" };
  const digest = "c5bd0d370816351d7c0aa4eb40bb504f0de80d62286dab1481452dac87cb5ac4";

  it("mints the vector state and digests dryRun false to the same args", () => {
    expect(digestArgs(args, canonicalize)).toBe(digest);
    expect(digestArgs({ ...args, dryRun: false }, canonicalize)).toBe(digest);
    const state = mintState({ argsDigest: digest, buildHash: "74cd67e83d8e91e7c979d53a6e0635caba05a613aee4107cb17aac84b50d9e42", cmd: "export.run", exp: 1_791_072_600_000, nonce: "AAAAAAAAAAAAAAAAAAAAAA" }, key);
    expect(state).toBe(vector);
    expect(verifyState(vector, key, 1_791_072_000_000, new MemLedger(), { cmd: "export.run", argsDigest: digestArgs({ ...args, dryRun: false }, canonicalize) }).ok).toBe(true);
  });
});
