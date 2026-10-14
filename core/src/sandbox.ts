// The build sandbox, parent side (D-178, D-206, spec/build.ts
// BUILD_SANDBOX). Every build.ts runs in a fresh child node process, never
// in the process holding the store, the gate and the workspace:
//
//   node --permission --allow-fs-read=<design dir>,<workspace package.json,
//        spec, packages, kernel, core, node_modules>
//        --max-old-space-size=<heapMb> core/dist/sandbox-child.js
//
// with env {} and no write, child process, worker, addon or WASI
// permission. The child applies the import allowlist and removes fetch,
// WebSocket, EventSource and process.binding (sandbox-child.ts). The parent
// sends params, the chase and the profile snapshot, waits wallMs, then
// SIGKILLs the child; it validates the reply as plain data and the draft's
// shape before kernel stage 1. Every stop is E_KERNEL with record
// build-sandbox/<reason>; nothing is written.
//
// A child must not outlive its parent. A build in a synchronous loop never
// reaches its disconnect listener, and a parent killed by SIGKILL runs no
// handler, so on POSIX the child starts through /bin/sh with `ulimit -t`
// set to the wall budget plus 2 s of CPU: the kernel ends it with SIGXCPU
// whoever is left to watch. env -u drops the PWD, SHLVL and _ that sh
// exports, so the child still starts with env {}. The parent also SIGKILLs
// every live child on exit, SIGINT, SIGTERM and SIGHUP.
//
// The reply is one buffer the child serialized with v8.serialize; the
// parent checks its length against maxResultBytes before it deserializes
// it, and refuses any message that is not such a buffer.
//
// The draft check here is structural (plain data, finite numbers, the
// fields the kernel stages read); buildPart then applies each feature's
// FeatureKindDef.schema. The derived PartDraft schema replaces the
// structural check when chase.validate lands (M10, D-131). One child per call: the policy
// allows reuse while the source hash holds, which no caller needs yet.

import { fork, spawn, type ChildProcess } from "node:child_process";
import { existsSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deserialize } from "node:v8";
import {
  BUILD_IMPORTS, BUILD_SANDBOX, BUILD_SANDBOX_REASONS, ERROR_CODES,
  type BuildSandboxReason, type BuildWarning, type Chase, type CommandError, type Metric, type ProfileRead,
} from "@hackbuild/spec";
import type { ProfileTables } from "@hackbuild/profile";
import type { RasterMask } from "@hackbuild/mesh";
import { plainProblem } from "@hackbuild/pipeline";
import { cmdError } from "./errors.js";

export interface SandboxRequest {
  /** Absolute path of the module holding the build function. */
  readonly buildFile: string;
  readonly fn: string;
  readonly designDir: string;
  /** Workspace root; the trusted roots and read grants derive from it. */
  readonly root: string;
  readonly values: Readonly<Record<string, unknown>>;
  readonly chase: Chase;
  readonly tables: ProfileTables;
  /** Also call build.ts masks(params) for raster bodies (load-build stageMesh). */
  readonly masks: boolean;
}

export interface SandboxOptions {
  /** Wall budget, ms; BUILD_SANDBOX.wallMs unless a test shortens it. */
  readonly wallMs?: number;
  readonly heapMb?: number;
  /** Sees the child once forked; a test closes its channel to stand in for a parent that died. */
  readonly onChild?: (child: ChildProcess) => void;
}

export interface SandboxResult {
  readonly draft: unknown;
  /** Author.warn calls, in order. */
  readonly warnings: readonly BuildWarning[];
  /** Author.derive values as informational metrics, in call order. */
  readonly derived: readonly Metric[];
  /** Profile rows the build read, in read order. */
  readonly reads: readonly ProfileRead[];
  readonly profileWarnings: readonly BuildWarning[];
  readonly masks?: Readonly<Record<string, RasterMask>>;
}

/** core/, whether this module runs from core/src (tests) or core/dist (the bin). */
const CORE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHILD = path.join(CORE_DIR, "dist", "sandbox-child.js");

/** Stderr kept from a child for heap detection and the hint, bytes. */
const STDERR_KEEP = 16384;

const real = (p: string): string => (existsSync(p) ? realpathSync(p) : p);

/** Workspace directories whose modules are trusted and readable in the child. */
export function trustedRoots(root: string): string[] {
  return ["spec", "packages", "kernel", "core", "node_modules"].map((d) => real(path.join(root, d))).filter((d) => existsSync(d));
}

/** Each BUILD_IMPORTS specifier to the realpath of its workspace package; the child refuses one that resolves elsewhere. */
export function importRoots(root: string): Record<string, string> {
  return Object.fromEntries(BUILD_IMPORTS.map((s) => [s, real(path.join(root, "node_modules", ...s.split("/").slice(0, 2)))]));
}

/** E_KERNEL with record build-sandbox/<reason>, naming the build file. */
export function sandboxStop(root: string, buildFile: string, reason: BuildSandboxReason, detail: string, at = "/build"): Error {
  return cmdError({
    code: "E_KERNEL", path: at, got: path.relative(root, buildFile).split(path.sep).join("/"),
    hint: `the build sandbox stopped build.ts (${reason}): ${detail}; nothing was written`,
    record: `build-sandbox/${reason}`,
  });
}

const stopError = (req: SandboxRequest, reason: BuildSandboxReason, detail: string, at = "/build"): Error => sandboxStop(req.root, req.buildFile, reason, detail, at);

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v) && !ArrayBuffer.isView(v);

export { draftProblem, plainProblem } from "@hackbuild/pipeline";

const isWarning = (w: unknown): w is BuildWarning => isRecord(w) && typeof w["code"] === "string" && typeof w["text"] === "string";
const isDerived = (m: unknown): m is Metric => isRecord(m) && typeof m["id"] === "string" && m["id"].startsWith("derived.")
  && typeof m["value"] === "number" && Number.isFinite(m["value"]) && typeof m["note"] === "string" && m["gate"] === "informational"
  && (m["drivenBy"] === undefined || (Array.isArray(m["drivenBy"]) && m["drivenBy"].every((x) => typeof x === "string")))
  && plainProblem(m) === undefined;
const isRead = (r: unknown): r is ProfileRead => isRecord(r) && typeof r["table"] === "string" && typeof r["id"] === "string";

function masksProblem(m: unknown): string | undefined {
  if (!isRecord(m)) return "masks(params) did not return an object of masks by uri";
  for (const [uri, v] of Object.entries(m)) {
    if (!isRecord(v)) return `mask ${uri} is not an object`;
    const { width, height, labels, origin } = v as { width?: unknown; height?: unknown; labels?: unknown; origin?: unknown };
    if (!Number.isInteger(width) || !Number.isInteger(height) || (width as number) <= 0 || (height as number) <= 0) return `mask ${uri} needs positive integer width and height`;
    if (!(labels instanceof Uint8Array) || labels.length !== (width as number) * (height as number)) return `mask ${uri} labels must be a Uint8Array of width x height`;
    if (origin !== undefined && (!Array.isArray(origin) || origin.length !== 2 || !origin.every((x) => typeof x === "number" && Number.isFinite(x)))) return `mask ${uri} origin must be two finite numbers`;
  }
  return undefined;
}

/** A reply the child sent: checked field by field, since a hostile build can send its own. */
function settle(req: SandboxRequest, msg: unknown): SandboxResult {
  if (!isRecord(msg)) throw stopError(req, "result-schema", "the child replied with no result");
  if (msg["kind"] === "stop") {
    const reason = BUILD_SANDBOX_REASONS.find((r) => r === msg["reason"]) ?? "result-schema";
    throw stopError(req, reason, String(msg["detail"] ?? ""));
  }
  if (msg["kind"] === "error") {
    const hbf = msg["hbf"];
    if (isRecord(hbf) && (ERROR_CODES as readonly unknown[]).includes(hbf["code"]) && typeof hbf["hint"] === "string") throw cmdError(hbf as unknown as CommandError);
    throw stopError(req, "result-schema", "the child sent an error that is not a CommandError");
  }
  if (msg["kind"] === "threw") {
    throw cmdError({ code: "E_KERNEL", path: "/build", got: String(msg["message"]), hint: "build.ts threw; read the message and fix the build function", record: "agent-capability" });
  }
  if (msg["kind"] !== "ok") throw stopError(req, "result-schema", "the child sent an unknown reply");
  const { draft, warnings, derived, reads, profileWarnings, masks } = msg;
  if (!Array.isArray(warnings) || !warnings.every(isWarning)) throw stopError(req, "result-schema", "Author.warn records are not { code, text }", "/warnings");
  if (!Array.isArray(derived) || !derived.every(isDerived)) throw stopError(req, "result-schema", "Author.derive records are not informational derived.<field> metrics", "/metrics");
  if (!Array.isArray(profileWarnings) || !profileWarnings.every(isWarning)) throw stopError(req, "result-schema", "profile warnings are not { code, text }", "/warnings");
  if (!Array.isArray(reads) || !reads.every(isRead)) throw stopError(req, "result-schema", "the profile read log is not { table, id }");
  if (masks !== undefined) {
    const problem = masksProblem(masks);
    if (problem !== undefined) throw stopError(req, "result-schema", problem, "/bodies/layers/mask");
  }
  return {
    draft, warnings: warnings.map((w) => ({ ...w })), derived: derived.map((m) => JSON.parse(JSON.stringify(m)) as Metric), reads: reads.map((r) => ({ table: r.table, id: r.id }) as ProfileRead),
    profileWarnings: profileWarnings.map((w) => ({ ...w })),
    ...(masks === undefined ? {} : { masks: masks as Record<string, RasterMask> }),
  };
}

/** CPU seconds a child may use: the wall budget plus 2 s (ulimit -t). */
export const cpuSeconds = (wallMs: number): number => Math.ceil(wallMs / 1000) + 2;

/** Children not yet ended; each is SIGKILLed if this process exits or takes a stop signal. */
const LIVE = new Set<ChildProcess>();
const STOP_SIGNALS = ["SIGINT", "SIGTERM", "SIGHUP"] as const;

function killLive(): void {
  for (const c of LIVE) c.kill("SIGKILL");
  LIVE.clear();
}

/** Kill the children, then let the signal do what it would have done: re-raise it when no other listener handles it. */
function onStopSignal(sig: NodeJS.Signals): void {
  killLive();
  unhook();
  if (process.listenerCount(sig) === 0) process.kill(process.pid, sig);
}

let hooked = false;
function hook(): void {
  if (hooked) return;
  hooked = true;
  process.on("exit", killLive);
  for (const sig of STOP_SIGNALS) process.on(sig, onStopSignal);
}
function unhook(): void {
  if (!hooked) return;
  hooked = false;
  process.removeListener("exit", killLive);
  for (const sig of STOP_SIGNALS) process.removeListener(sig, onStopSignal);
}

function track(child: ChildProcess): void {
  LIVE.add(child);
  hook();
  child.once("exit", () => {
    LIVE.delete(child);
    if (LIVE.size === 0) unhook();
  });
}

/** Fork the child: on POSIX through /bin/sh, so the CPU limit holds when no parent is left to kill it. */
function start(execArgv: readonly string[], cwd: string, wallMs: number): ChildProcess {
  const options = { cwd, env: {}, serialization: "advanced" as const, stdio: ["ignore", "ignore", "pipe", "ipc"] as ("ignore" | "pipe" | "ipc")[] };
  if (process.platform === "win32") return fork(CHILD, [], { ...options, execArgv: [...execArgv] });
  const script = `ulimit -t ${cpuSeconds(wallMs)} && exec /usr/bin/env -u PWD -u SHLVL -u _ "$0" "$@"`;
  return spawn("/bin/sh", ["-c", script, process.execPath, ...execArgv, CHILD], options);
}

/** The reply buffer, checked for size before it is deserialized; any other message is result-schema. */
export function unpackReply(req: SandboxRequest, msg: unknown, max: number): unknown {
  if (!(msg instanceof Uint8Array)) throw stopError(req, "result-schema", "the child sent a message that is not its serialized reply");
  if (msg.byteLength > max) throw stopError(req, "result-size", `${msg.byteLength} bytes over the ${max} byte cap`);
  try {
    return deserialize(Buffer.from(msg.buffer, msg.byteOffset, msg.byteLength));
  } catch (e) {
    throw stopError(req, "result-schema", `the reply does not deserialize: ${String(e)}`);
  }
}

/**
 * Run one build function in the sandbox. Resolves with the reply checked
 * as data; the draft itself is checked by the caller with draftProblem, so
 * an assembly can be told apart from a malformed part.
 */
export function runSandboxed(req: SandboxRequest, opts: SandboxOptions = {}): Promise<SandboxResult> {
  if (!existsSync(CHILD)) {
    return Promise.reject(new Error(`hbf: ${path.relative(req.root, CHILD)} is missing; run npx tsc -b from the repo root`));
  }
  const wallMs = opts.wallMs ?? BUILD_SANDBOX.wallMs;
  const heapMb = opts.heapMb ?? BUILD_SANDBOX.heapMb;
  const designDir = real(req.designDir);
  const trusted = trustedRoots(req.root);
  const readable = [designDir, real(path.join(req.root, "package.json")), ...trusted];
  const child = start(["--permission", ...readable.map((p) => `--allow-fs-read=${p}`), `--max-old-space-size=${heapMb}`, "--disable-warning=ExperimentalWarning"], designDir, wallMs);
  track(child);
  let stderr = "";
  child.stderr?.on("data", (b: Buffer) => {
    stderr = (stderr + b.toString("utf8")).slice(-STDERR_KEEP);
  });
  opts.onChild?.(child);
  return new Promise<SandboxResult>((resolve, reject) => {
    let done = false;
    let timedOut = false;
    const finish = (f: () => void): void => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      child.kill("SIGKILL");
      f();
    };
    const timer = setTimeout(() => {
      timedOut = true;
      finish(() => reject(stopError(req, "wall", `no result after ${wallMs} ms; the child was killed`)));
    }, wallMs);
    child.on("message", (msg) => {
      finish(() => {
        try {
          resolve(settle(req, unpackReply(req, msg, BUILD_SANDBOX.maxResultBytes)));
        } catch (e) {
          reject(e);
        }
      });
    });
    child.on("error", (e) => finish(() => reject(e)));
    child.on("exit", (code, signal) => {
      if (done || timedOut) return;
      const tail = stderr.trim().split("\n").slice(-3).join(" ").slice(0, 400);
      if (signal === "SIGXCPU") {
        finish(() => reject(stopError(req, "wall", `the child used its ${cpuSeconds(wallMs)} s cpu budget and was killed`)));
        return;
      }
      if (/heap out of memory|Reached heap limit/i.test(stderr)) {
        finish(() => reject(stopError(req, "heap", `the child ran out of its ${heapMb} MB heap`)));
        return;
      }
      finish(() => reject(cmdError({
        code: "E_KERNEL", path: "/build", got: signal ?? code,
        hint: `the build child exited before it replied${tail === "" ? "" : `: ${tail}`}; nothing was written`,
        record: "agent-capability",
      })));
    });
    child.send({
      buildFile: real(req.buildFile), fn: req.fn, designDir, trusted, allowed: importRoots(req.root),
      values: req.values, chase: req.chase, tables: req.tables, masks: req.masks, maxResultBytes: BUILD_SANDBOX.maxResultBytes,
    });
  });
}
