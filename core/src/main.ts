// The hbf command line (M00-T13 step 2, AGENT-SURFACE.md 3.3):
//   hbf <command> <target> [--params <json>] [--json] [--detail summary|full] [flags]
// Each flag maps one to one onto an input field of the command's CommandDef
// (registry.ts CLI_FORM); the input then validates against the zod schema,
// so a schema failure is E_SCHEMA with a JSON pointer, got, expected and a
// hint, and an unknown id is E_REF with up to three didYouMean. Every
// command prints CommandResult (--json) or its text mirror and exits by the
// spec/errors.ts transport tables. Utility verbs print their own record.

import { COMMAND_NAMES, isThrownCommandError, type CommandResult, type Hash } from "@hackbuild/spec";
import { EXIT_INTERNAL, cmdError, didYouMean, exitOf } from "./errors.js";
import { execute } from "./execute.js";
import { hashOf } from "./jcs.js";
import { errorResult } from "./result.js";
import { CLI_FORM, COMMANDS, VERBS, commandOf, type CliForm } from "./registry.js";
import type { CoreCtx } from "./ctx.js";
import { Store } from "./store.js";
import { renderError, renderResult } from "./text.js";
import { oneLine } from "./text/safe.js";
import { PROCESS_STREAMS, type GateStreams } from "./tty-gate.js";
import { workspaceRoot } from "./commands/build.js";
import { boardDoctor, doctor, renderDoctor } from "./commands/doctor.js";
import { explain, explainUri, renderExplained } from "./commands/explain.js";
import { runParity, type ParityOut } from "./commands/parity.js";
import { runMcp } from "./commands/mcp.js";
import { mcpFacts } from "./mcp/discover.js";

export interface Io {
  readonly out: (s: string) => void;
  readonly err: (s: string) => void;
  /** The gate's terminal; process.stdin and process.stdout by default. */
  readonly gate?: GateStreams;
}

const STDIO: Io = { out: (s) => process.stdout.write(`${s}\n`), err: (s) => process.stderr.write(`${s}\n`) };

const flagList = (f: CliForm): string =>
  [...Object.entries(f.flags).map(([k, d]) => (d.kind === "switch" ? `[--${k}]` : `[--${k} <${d.field}>]`)), ...f.transport.map((t) => `[--${t} <file>]`), "[--json]"].join(" ");

export function usage(): string {
  return [
    "usage: hbf <command> <target> [flags]",
    ...COMMANDS.map((c) => {
      const f = CLI_FORM[c.name]!;
      return `  ${c.name.padEnd(18)}${f.targetOptional === true ? `[<${f.target}>]` : `<${f.target}>`} ${flagList(f)}`;
    }),
    "  doctor            [--json]",
    "  mcp               [--workspace <dir>] [--tools all|query,prove|sweep]",
    "  explain           <check id, error code or hbf:// uri> [--json]",
    "  parity            <reference> [--accept] [--json]",
  ].join("\n");
}

interface Parsed {
  readonly positional: readonly string[];
  readonly values: Readonly<Record<string, string>>;
  readonly switches: ReadonlySet<string>;
}

interface ParsedRest extends Parsed {
  /** Flags outside the form, by name, when the form gathers them (CliForm.rest). */
  readonly extra: Readonly<Record<string, string>>;
}

function parseFlags(command: string, rest: readonly string[], values: readonly string[], switches: readonly string[], repeat: readonly string[] = [], gather = false): ParsedRest {
  const extra: Record<string, string> = {};
  const vals: Record<string, string> = {};
  const sw = new Set<string>();
  const positional: string[] = [];
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i]!;
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }
    const eq = arg.indexOf("=");
    const name = arg.slice(2, eq < 0 ? undefined : eq);
    if (switches.includes(name) && eq < 0) sw.add(name);
    else if (values.includes(name)) {
      const v = eq < 0 ? rest[++i] : arg.slice(eq + 1);
      if (v === undefined) throw cmdError({ code: "E_SCHEMA", path: `/${name}`, expected: "a value", hint: `give --${name} a value` });
      vals[name] = vals[name] !== undefined && repeat.includes(name) ? `${vals[name]},${v}` : v;
    } else if (gather && /^[a-zA-Z][\w]*$/.test(name)) {
      const v = eq < 0 ? rest[++i] : arg.slice(eq + 1);
      if (v === undefined) throw cmdError({ code: "E_SCHEMA", path: `/${name}`, expected: "a value", hint: `give --${name} a value` });
      extra[name] = v;
    } else {
      const all = [...values, ...switches];
      throw cmdError({ code: "E_SCHEMA", path: `/${name}`, got: arg, expected: all.map((f) => `--${f}`).join(", "), didYouMean: didYouMean(name, all).map((f) => `--${f}`), hint: `remove ${arg}; ${command} takes no such flag` });
    }
  }
  return { positional, values: vals, switches: sw, extra };
}

function readFlag(kind: CliForm["flags"][string]["kind"], name: string, raw: string): unknown {
  if (kind === "json") {
    try {
      return JSON.parse(raw);
    } catch {
      throw cmdError({ code: "E_SCHEMA", path: `/${name}`, got: raw, expected: "json", hint: `quote --${name} as json, for example '{"W": 64}'` });
    }
  }
  if (kind === "list") return raw.split(",").map((s) => s.trim()).filter((s) => s !== "");
  if (kind === "import") return readImports(raw);
  if (kind === "facts") return readFacts(name, raw);
  if (kind === "pairs") return readPairs(name, raw);
  if (kind === "gap") return raw === "auto" ? raw : NUMBER.test(raw) ? Number(raw) : raw;
  if (kind === "size") {
    const m = /^(\d+)[x,](\d+)$/.exec(raw);
    return m === null ? raw : [Number(m[1]), Number(m[2])];
  }
  return raw;
}

/** File extension to ImportSpec.format; an extension outside it stays as written and the schema refuses it. */
const IMPORT_FORMAT: Readonly<Record<string, string>> = { stl: "stl", glb: "glb", step: "step", stp: "step", wrl: "wrl", scad: "scad" };

/** `path#N` declares N pieces; a # with anything but digits after it stays in the path. */
const PIECES = /^(.+)#(\d+)$/;

/**
 * --import as paths joined by commas, each one body for audit at its
 * format's default units; `plate.stl#2` declares two pieces (ImportSpec.pieces).
 * The range check is part.build's; here a count only parses.
 */
export function readImports(raw: string): unknown[] {
  return raw.split(",").map((s) => s.trim()).filter((s) => s !== "").map((entry) => {
    const m = PIECES.exec(entry);
    const p = m === null ? entry : m[1]!;
    const ext = p.slice(p.lastIndexOf(".") + 1).toLowerCase();
    const spec = { path: p, format: IMPORT_FORMAT[ext] ?? ext, as: "body" };
    return m === null ? spec : { ...spec, pieces: Number(m[2]) };
  });
}

const NUMBER = /^-?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;

/**
 * --facts as k=v,k=v (numbers and true or false parse, anything else stays
 * a string) or as a json object, the form a next line prints.
 */
function readFacts(name: string, raw: string): unknown {
  if (raw.trim().startsWith("{")) return readFlag("json", name, raw);
  const out: Record<string, number | string | boolean> = {};
  for (const pair of raw.split(",")) {
    const eq = pair.indexOf("=");
    const k = pair.slice(0, eq).trim();
    const v = pair.slice(eq + 1).trim();
    if (eq < 1 || k === "" || v === "") {
      throw cmdError({ code: "E_SCHEMA", path: `/${name}`, got: pair, expected: "key=value pairs joined by commas", hint: `write --${name} as k=v,k=v, for example pathMm=62,flexes=true` });
    }
    out[k] = v === "true" ? true : v === "false" ? false : NUMBER.test(v) ? Number(v) : v;
  }
  return out;
}

/**
 * --params of mech.derive and arch.apply as a json object or as k=v pairs
 * joined by commas. A v that reads as a number, NaN included, becomes one,
 * so E=NaN reaches mech.derive and comes back as E_PARAM_MISSING naming E;
 * anything else stays a string (standard=boss-v1) for the schema to judge.
 */
function readPairs(name: string, raw: string): unknown {
  if (raw.trim().startsWith("{")) return readFlag("json", name, raw);
  const out: Record<string, number | string> = {};
  for (const pair of raw.split(",")) {
    const eq = pair.indexOf("=");
    const k = pair.slice(0, eq).trim();
    const v = pair.slice(eq + 1).trim();
    if (eq < 1 || k === "" || v === "") {
      throw cmdError({ code: "E_SCHEMA", path: `/${name}`, got: pair, expected: "key=value pairs joined by commas, or a json object", hint: `write --${name} as k=v,k=v, for example clr=0.4,E=2000` });
    }
    out[k] = NUMBER.test(v) || v === "NaN" ? Number(v) : v;
  }
  return out;
}

/** The input a CLI call stands for, and its transport flags. */
function inputOf(command: string, form: CliForm, rest: readonly string[]): { input: Record<string, unknown>; cli: CoreCtx["cli"]; json: boolean } {
  const valueFlags = [...Object.entries(form.flags).filter(([, d]) => d.kind !== "switch").map(([k]) => k), ...form.transport];
  const switchFlags = [...Object.entries(form.flags).filter(([, d]) => d.kind === "switch").map(([k]) => k), "json"];
  const p = parseFlags(command, rest, valueFlags, switchFlags, form.repeat, form.rest !== undefined);
  const cli: { artifact?: string; out?: string } = {};
  for (const t of form.transport) if (p.values[t] !== undefined) cli[t] = p.values[t]!;
  const [target, ...extra] = p.positional;
  if (extra.length > 0) throw cmdError({ code: "E_SCHEMA", path: `/${form.target}`, got: extra.join(" "), hint: "pass one target; set params with --params" });
  const input: Record<string, unknown> = {};
  if (target !== undefined) input[form.target] = target;
  else if (form.targetOptional === true && cli.artifact !== undefined) input[form.target] = cli.artifact;
  for (const [flag, d] of Object.entries(form.flags)) {
    if (d.kind === "switch") {
      if (p.switches.has(flag)) input[d.field] = true;
    } else if (p.values[flag] !== undefined) input[d.field] = readFlag(d.kind, flag, p.values[flag]!);
  }
  if (form.rest !== undefined && Object.keys(p.extra).length > 0) {
    const into: Record<string, unknown> = { ...(input[form.rest] as Record<string, unknown> | undefined) };
    for (const [k, v] of Object.entries(p.extra)) into[k] = NUMBER.test(v) ? Number(v) : v;
    input[form.rest] = into;
  }
  return { input, cli, json: p.switches.has("json") };
}

function renderParity(p: ParityOut): string {
  const lines = p.files.map((f) => `${f.status.padEnd(8)} ${f.file}${f.moved.length > 0 ? `   moved ${f.moved.join(", ")}` : ""}`);
  const head = `${p.ok ? "PASS" : "FAIL"} parity ${p.reference} build ${p.buildHash.slice(0, 6)}..${p.buildHash.slice(-2)}${p.accepted ? "   goldens written" : ""}`;
  const tail = p.ok || p.accepted ? [] : [`next  hbf parity ${p.reference} --accept   (a person reads the diff before it lands)`];
  const warn = p.warnings.map((w) => `warn  ${w}`);
  const surface = p.surface === undefined ? []
    : [p.surface.kind === "vinyl" ? `gates    ${p.surface.passed} pass, ${p.surface.failed} fail` : `weed     ${p.surface.passed} nets whole, ${p.surface.failed} split`];
  const next = p.surface === undefined ? tail : tail.length === 0 ? [] : [`next  HBF_ACCEPT_VINYL=1 npx vitest run ${p.reference}   (a person reads the diff before it lands)`];
  return [head, ...surface, ...lines, ...warn, ...next].map(oneLine).join("\n");
}

async function runVerb(verb: string, rest: readonly string[], cwd: string, io: Io): Promise<number> {
  const root = workspaceRoot(cwd);
  if (verb === "doctor") {
    const p = parseFlags(verb, rest, [], ["json"]);
    const board = boardDoctor(root);
    const lines = doctor(root, board);
    io.out(p.switches.has("json") ? JSON.stringify({ lines, result: { board, mcp: mcpFacts(root, "all") } }, null, 2) : renderDoctor(lines));
    return lines.some((l) => l.status === "fail") ? 1 : 0;
  }
  if (verb === "mcp") {
    const p = parseFlags(verb, rest, ["workspace", "tools", "http"], []);
    return runMcp({ ...p.values }, cwd);
  }
  if (verb === "explain") {
    const p = parseFlags(verb, rest, [], ["json"]);
    const id = p.positional[0];
    if (id === undefined) throw cmdError({ code: "E_SCHEMA", path: "/id", expected: "a check id or error code", hint: "name what to explain, for example hbf explain CHK-3MF-06" });
    if (id.startsWith("hbf://")) {
      const r = await explainUri(id, root);
      io.out(JSON.stringify(r, null, 2));
      return 0;
    }
    const e = explain(id, root);
    io.out(p.switches.has("json") ? JSON.stringify(e, null, 2) : renderExplained(e));
    return 0;
  }
  const p = parseFlags(verb, rest, [], ["json", "accept"]);
  const ref = p.positional[0];
  if (ref === undefined) throw cmdError({ code: "E_SCHEMA", path: "/reference", expected: "a reference directory", hint: "name the reference, for example hbf parity reference/keys/flex-pair" });
  const out = await runParity({ reference: ref, ...(p.switches.has("accept") ? { accept: true } : {}) }, cwd);
  io.out(p.switches.has("json") ? JSON.stringify(out, null, 2) : renderParity(out));
  return out.ok ? 0 : 1;
}

/** Run one CLI call and return its exit code. */
export async function main(argv: readonly string[], cwd: string, io: Io = STDIO): Promise<number> {
  if (argv.length === 0 || argv[0] === "--help" || argv[0] === "help") {
    io.out(usage());
    return argv.length === 0 ? 2 : 0;
  }
  const [command, ...rest] = argv as [string, ...string[]];
  const json = rest.includes("--json");
  let inputsHash = hashOf(argv);
  let target = "";
  try {
    if ((VERBS as readonly string[]).includes(command)) return await runVerb(command, rest, cwd, io);
    const def = commandOf(command);
    const form = CLI_FORM[command];
    if (def === undefined || form === undefined) {
      const registered = [...COMMANDS.map((c) => c.name as string), ...VERBS];
      const later = ([...COMMAND_NAMES] as string[]).includes(command);
      throw cmdError({
        code: "E_REF", path: "/command", got: command, didYouMean: didYouMean(command, registered),
        hint: later ? `${command} is not registered in this build; hbf runs ${registered.join(", ")}` : "name a command hbf registers",
      });
    }
    const { input, cli } = inputOf(command, form, rest);
    target = String(input[form.target] ?? input["chase"] ?? "");
    inputsHash = hashOf({ ...input, ...cli }) as Hash;
    const r: CommandResult<unknown> = await execute(def, input, (): CoreCtx => {
      const workspace = workspaceRoot(cwd);
      return {
        workspace, cwd, branch: "", store: new Store(workspace), transport: "cli",
        clientCaps: { elicitation: false, tasks: false },
        signal: { aborted: false, throwIfAborted: () => undefined },
        inputsHash, gate: io.gate ?? PROCESS_STREAMS, cli,
      };
    });
    io.out(json ? JSON.stringify(r, null, 2) : renderResult(command, target, r));
    return exitOf(r);
  } catch (e) {
    if (isThrownCommandError(e)) {
      const r = errorResult(e.hbf, inputsHash);
      const shown = target !== "" ? target : rest.find((x) => !x.startsWith("--")) ?? "";
      io.out(json ? JSON.stringify(r, null, 2) : `${oneLine(`FAIL ${command} ${shown}`)}\n${renderError(e.hbf)}`);
      return exitOf(r);
    }
    io.err(`hbf: internal error: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}`);
    return EXIT_INTERNAL;
  }
}
