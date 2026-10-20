// One handler for every MCP tool (M12-T01 step 3, M12-T04 step 3). The
// handler reads the selector, turns absent values into absent fields, hands
// the chosen command exactly its own input and runs it through execute, the
// path the CLI runs. A fabrication export asks the person through the host:
// a client that declared elicitation gets input_required with a signed
// requestState bound to the build it was shown; any other client gets
// E_GATE_UNAVAILABLE naming the line a person runs. Nothing is written
// before an approval verifies against a fresh build with the same hash.

import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { PassThrough } from "node:stream";
import {
  CLI_ONLY_FIELDS, ERROR_TRANSPORT, canonicalize, isThrownCommandError,
  type AnyCommandDef, type CommandError, type CommandResult, type Hash,
} from "@hackbuild/spec";
import { cmdError, didYouMean } from "../errors.js";
import { execute } from "../execute.js";
import { GATE_TTL_MS, digestArgs, mintState, newNonce, verifyState, type GateCheck, type NonceLedger } from "../gate.js";
import { hashOf } from "../jcs.js";
import { CLI_FORM, commandOf } from "../registry.js";
import type { CoreCtx } from "../ctx.js";
import { errorResult } from "../result.js";
import { Store } from "../store.js";
import { renderError, renderResult } from "../text.js";
import { oneLine } from "../text/safe.js";
import { gatePrompt, type GateInfo, type GateStreams, type HostGate } from "../tty-gate.js";
import { FIELD_RENAMES, SELECTOR_ROUTES, mcpFields, type ServedTool } from "./schema.js";

/** Server-wide settings; the workspace comes from `hbf mcp --workspace`, never from a tool argument. */
export interface McpEnv {
  readonly workspace: string;
  /** Epoch ms; tests inject a clock. */
  readonly now: () => number;
  /** The gate MAC key, read on first gated call. */
  readonly key: () => Buffer;
  readonly ledger: NonceLedger;
}

/** One tools/call as the handler sees it. */
export interface McpCall {
  readonly args: Readonly<Record<string, unknown>>;
  /** The client declared elicitation on this request. */
  readonly elicitation: boolean;
  /** The echoed requestState, raw. */
  readonly requestState?: string;
  /** The bare responses a retried request carries, by key. */
  readonly inputResponses?: Readonly<Record<string, unknown>>;
  readonly signal: AbortSignal;
}

/** The elicitation key and form the export gate asks. */
export const GATE_INPUT_KEY = "approve";
export const GATE_FORM = {
  type: "object",
  properties: {
    approve: { type: "boolean", title: "approve this export", description: "true writes the files named above; false writes nothing" },
  },
  required: ["approve"],
} as const;

export type McpOutcome =
  | { readonly kind: "result"; readonly result: CommandResult<unknown>; readonly text: string; readonly isError: boolean }
  | { readonly kind: "ask"; readonly message: string; readonly requestState: string };

/** Streams that are never a terminal, so the CLI prompt can never run inside the server. */
const NO_TTY: GateStreams = { input: new PassThrough(), output: new PassThrough() };

/** Before routing, a field that is null, absent, false, an empty string or an empty array counts as absent. */
export function isAbsent(v: unknown): boolean {
  return v === undefined || v === null || v === false || v === "" || (Array.isArray(v) && v.length === 0);
}

/** The command a tool call names and exactly its own input (spec McpRoute). */
export function route(tool: ServedTool, raw: Readonly<Record<string, unknown>>): { def: AnyCommandDef; input: Record<string, unknown> } {
  const args: Record<string, unknown> = Object.fromEntries(Object.entries(raw).filter(([, v]) => !isAbsent(v)));
  let def = tool.commands[0]!;
  const sel = tool.def.selector;
  if (sel !== null) {
    const v = args[sel];
    delete args[sel];
    const all: Readonly<Record<string, string>> = (SELECTOR_ROUTES as Readonly<Record<string, Readonly<Record<string, string>>>>)[tool.def.name] ?? {};
    if (typeof v !== "string" || all[v] === undefined) {
      throw cmdError({
        code: "E_SCHEMA", path: `/${sel}`, ...(v === undefined ? {} : { got: v }), expected: Object.keys(tool.routes).join(", "),
        ...(typeof v === "string" ? { didYouMean: didYouMean(v, Object.keys(all)) } : {}),
        hint: `set ${sel} to pick the command ${tool.def.name} runs`,
      });
    }
    const name = tool.routes[v];
    if (name === undefined) {
      throw cmdError({
        code: "E_REF", path: `/${sel}`, got: v, didYouMean: Object.keys(tool.routes),
        hint: `${all[v]} is not registered in this build; ${tool.def.name} serves ${Object.keys(tool.routes).join(", ")}`,
      });
    }
    def = commandOf(name)!;
  }
  const own = mcpFields(def);
  const cliOnly: readonly string[] = (CLI_ONLY_FIELDS as Readonly<Record<string, readonly string[]>>)[def.name] ?? [];
  const input: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(args)) {
    if (!own.includes(k)) {
      const owner = tool.commands.find((d) => d !== def && mcpFields(d).includes(k));
      if (owner !== undefined) {
        throw cmdError({ code: "E_SCHEMA", path: `/${k}`, got: k, expected: own.join(", "), hint: `${k} belongs to ${owner.name}; drop it or set ${sel ?? "the selector"} for that command` });
      }
      if (cliOnly.includes(k)) {
        throw cmdError({ code: "E_SCHEMA", path: `/${k}`, got: k, expected: own.join(", "), hint: `${k} reaches the network and runs on the cli only: hbf ${def.name} --${k}` });
      }
      throw cmdError({ code: "E_SCHEMA", path: `/${k}`, got: k, expected: own.join(", "), didYouMean: didYouMean(k, own), hint: `remove ${k}; ${tool.def.name} takes no such input` });
    }
    input[FIELD_RENAMES[def.name]?.[k] ?? k] = v;
  }
  return { def, input };
}

/** The prompt line without the terminal's [y/N] answer hint. */
function gateMessage(info: GateInfo): string {
  return gatePrompt(info).replace(/\s*\[y\/N\]\s*$/, "");
}

/** Raised inside the host gate to stop the run before any write and ask the person. */
class GateAsk {
  constructor(readonly info: GateInfo, readonly stale: boolean) {}
}

const GATE_REASON_HINT: Readonly<Record<Exclude<GateCheck, { ok: true }>["reason"], string>> = {
  malformed: "requestState is malformed; call export_run again without it and answer the new prompt",
  forged: "requestState failed its mac check; call export_run again without it and answer the new prompt",
  expired: "the approval expired after 10 minutes; call export_run again without requestState and answer the new prompt",
  replayed: "that approval was already spent; call export_run again without requestState and answer the new prompt",
  "args-moved": "the arguments differ from the ones the person approved; call export_run again without requestState",
};

function text(command: string, target: string, r: CommandResult<unknown>): string {
  const e = r.errors[0];
  return e !== undefined && r.findings.length === 0 && r.result === undefined
    ? `${oneLine(`FAIL ${command} ${target}`)}\n${renderError(e)}`
    : renderResult(command, target, r);
}

function outcome(command: string, target: string, r: CommandResult<unknown>): McpOutcome {
  const e = r.errors[0];
  return { kind: "result", result: r, text: text(command, target, r), isError: e !== undefined && ERROR_TRANSPORT[e.code].isError };
}

/** E_STALE goes to .hbf/calls.jsonl when the build moved between ask and answer (M12-T04 step 3.4). */
function logStale(workspace: string, t: number, cmd: string, was: string, now: string): void {
  const dir = path.join(workspace, ".hbf");
  mkdirSync(dir, { recursive: true });
  appendFileSync(path.join(dir, "calls.jsonl"), `${JSON.stringify({ t, cmd, code: "E_STALE", approvedBuildHash: was, buildHash: now })}\n`);
}

/** Run one tool call. A thrown CommandError becomes its error result; anything else propagates as a crash. */
export async function handle(tool: ServedTool, call: McpCall, env: McpEnv): Promise<McpOutcome> {
  let command: string = tool.commands[0]!.name;
  let target = "";
  let inputsHash = hashOf(call.args);
  try {
    const { def, input } = route(tool, call.args);
    command = def.name;
    const form = CLI_FORM[def.name];
    target = String((form === undefined ? undefined : input[form.target]) ?? input["chase"] ?? "");
    inputsHash = hashOf(input);
    const gated = def.writes === "outside";
    let hostGate: HostGate = () => Promise.resolve("unavailable");
    let approvedHash: string | undefined;
    if (gated && call.requestState !== undefined) {
      const argsDigest = digestArgs(input, canonicalize);
      const check = verifyState(call.requestState, env.key(), env.now(), env.ledger, { cmd: def.name, argsDigest });
      if (!check.ok) {
        throw cmdError({ code: "E_GATE", path: "/requestState", got: check.reason, hint: GATE_REASON_HINT[check.reason] });
      }
      const answer = call.inputResponses?.[GATE_INPUT_KEY] as { action?: unknown; content?: { approve?: unknown } } | undefined;
      if (answer?.action !== "accept" || answer.content?.approve !== true) {
        const how = answer === undefined ? "no answer" : answer.action === "accept" ? "approve false" : String(answer.action);
        throw cmdError({ code: "E_GATE", path: "/inputResponses/approve", got: how, hint: "the person did not approve the export; nothing written" });
      }
      approvedHash = check.claim.buildHash;
      const claimed = approvedHash;
      hostGate = (info) => (info.buildHash === claimed ? Promise.resolve("approved") : Promise.reject(new GateAsk(info, true)));
    } else if (gated && call.elicitation) {
      hostGate = (info) => Promise.reject(new GateAsk(info, false));
    }
    try {
      const r = await execute(def, input, (): CoreCtx => ({
        workspace: env.workspace, cwd: env.workspace, branch: "", store: new Store(env.workspace), transport: "mcp",
        clientCaps: { elicitation: call.elicitation, tasks: false },
        signal: { get aborted() { return call.signal.aborted; }, throwIfAborted: () => call.signal.throwIfAborted() },
        inputsHash, gate: NO_TTY, hostGate, cli: {},
      }));
      return outcome(command, target, overMcp(r));
    } catch (e) {
      if (!(e instanceof GateAsk)) throw e;
      const t = env.now();
      if (e.stale) logStale(env.workspace, t, def.name, approvedHash ?? "", e.info.buildHash);
      const requestState = mintState({
        argsDigest: digestArgs(input, canonicalize), buildHash: e.info.buildHash, cmd: def.name, exp: t + GATE_TTL_MS, nonce: newNonce(),
      }, env.key());
      const moved = e.stale ? "the build moved since the last approval; " : "";
      return { kind: "ask", message: `${moved}${gateMessage(e.info)}`, requestState };
    }
  } catch (e) {
    if (!isThrownCommandError(e)) throw e;
    return outcome(command, target, overMcp(errorResult(e.hbf, inputsHash as Hash)));
  }
}

/** The MCP wording of an unavailable gate: the client cannot ask, a person runs the line. */
function overMcp(r: CommandResult<unknown>): CommandResult<unknown> {
  const e = r.errors[0];
  if (e?.code !== "E_GATE_UNAVAILABLE") return r;
  const fixed: CommandError = { ...e, hint: "this mcp client declared no elicitation, so the server cannot ask a person; a person runs the export line at a terminal and answers the prompt" };
  return { ...r, errors: [fixed, ...r.errors.slice(1)] };
}

/** Media types a host shows as an image content block. */
const IMAGE_TYPES: ReadonlySet<string> = new Set(["image/png"]);

/**
 * Image content blocks for the png artifacts a result names, read back from
 * the store after their hash recomputes. A remote host cannot open the
 * server's .hbf/store, so the render travels in the result beside its uri.
 */
export async function imageBlocks(r: CommandResult<unknown>, workspace: string): Promise<{ type: "image"; data: string; mimeType: string }[]> {
  const shown = r.artifacts.filter((a) => IMAGE_TYPES.has(a.mediaType));
  if (shown.length === 0) return [];
  const store = new Store(workspace);
  const out: { type: "image"; data: string; mimeType: string }[] = [];
  for (const a of shown) {
    const { bytes } = await store.artifact(a.uri.slice("hbf://artifact/".length), "/artifacts");
    out.push({ type: "image", data: Buffer.from(bytes).toString("base64"), mimeType: a.mediaType });
  }
  return out;
}
