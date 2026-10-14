// The build sandbox child (D-178, D-206, spec/build.ts BUILD_SANDBOX). The
// parent forks this file under `node --permission` with read access to the
// design directory and the workspace's kernel and dependency directories,
// no write, child process, worker, addon or WASI permission, env {} and a
// heap cap (core/src/sandbox.ts). It loads its own modules first, then
// installs the import policy and removes the network globals, then imports
// build.ts, runs the build function through an Author over the profile
// snapshot the parent sent, and replies once over IPC.
//
// Only node: builtins load statically: @hackbuild/spec ships source with
// extensionless relative imports, so the resolve hook must be registered
// before any @hackbuild module loads.
//
// The import policy applies to every module whose parent is not trusted
// workspace code: build.ts, its relative imports, and code they evaluate.
// Such a module may import BUILD_IMPORTS and relative files whose realpath
// lies inside the design directory, nothing else (node: builtins, URLs,
// other packages, "../" escapes, dynamic import included). A refusal is
// recorded even when the build catches the error, so the reply names it.
// An allowlisted name must also resolve, by realpath, inside the workspace
// package the parent named for it: a node_modules folder or symlink in the
// design directory cannot stand in for @hackbuild/spec.
//
// The build cannot send over IPC: process.send and process._send are
// replaced before build.ts loads and put back only for the one synchronous
// send of the reply, which is a v8.serialize buffer the parent checks for
// size before it reads it. process.channel stays, since Node's disconnect
// path asserts it; a build that writes raw frames to its handle still
// meets the parent's size check and buffer-only rule.

import { registerHooks } from "node:module";
import { realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { serialize } from "node:v8";

/** What the parent sends; see SandboxRequest in sandbox.ts. */
interface Request {
  readonly buildFile: string;
  readonly fn: string;
  readonly designDir: string;
  readonly trusted: readonly string[];
  /** Each allowlisted specifier to the realpath of the workspace package it must resolve inside. */
  readonly allowed: Readonly<Record<string, string>>;
  readonly values: Record<string, unknown>;
  readonly chase: unknown;
  readonly tables: unknown;
  readonly masks: boolean;
  readonly maxResultBytes: number;
}

type Reason = "import" | "fs-read" | "fs-write" | "network" | "child-process" | "worker" | "addon" | "result-size" | "result-schema";

const RELATIVE = /^\.{1,2}\//;
const HAS_EXTENSION = /\.[cm]?[jt]s$|\.json$/;

let policy: { readonly designDir: string; readonly trusted: readonly string[]; readonly allowed: ReadonlyMap<string, string> } | undefined;
let stop: { reason: Reason; detail: string } | undefined;

const send = process.send?.bind(process);

/** The process members that send over IPC, as Node set them up. */
const IPC_MEMBERS = ["send", "_send"] as const;
const ipcOriginal = new Map(IPC_MEMBERS.map((n) => [n, Object.getOwnPropertyDescriptor(process, n)] as const));

/** Replace the send members: a call records the stop and throws. */
function sealIpc(): void {
  for (const n of IPC_MEMBERS) {
    const removed = function removed(): never {
      throw halt("result-schema", `process.${n} is removed in the build sandbox; return the draft from the build function`);
    };
    Object.defineProperty(process, n, { value: removed, writable: false, configurable: true, enumerable: false });
  }
}

/** Put the IPC members back for one synchronous send. */
function openIpc(): void {
  for (const [n, d] of ipcOriginal) {
    if (d !== undefined) Object.defineProperty(process, n, d);
  }
}

function halt(reason: Reason, detail: string): Error {
  stop ??= { reason, detail };
  return Object.assign(new Error(`build-sandbox/${reason}: ${detail}`), { code: "ERR_HBF_SANDBOX" });
}

const inside = (dir: string, p: string): boolean => {
  const rel = path.relative(dir, p);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
};

/** True when the importing module is trusted workspace code, not the design. */
function trustedParent(parentURL: string | undefined): boolean {
  if (policy === undefined) return true;
  if (parentURL === undefined || !parentURL.startsWith("file:")) return false;
  const p = fileURLToPath(parentURL);
  if (inside(policy.designDir, p)) return false;
  return policy.trusted.some((t) => inside(t, p));
}

type Next = (specifier: string, context?: Parameters<NonNullable<Parameters<typeof registerHooks>[0]["resolve"]>>[1]) => { url: string; format?: string | null | undefined; shortCircuit?: boolean | undefined };

/** The default resolver, retrying an extensionless relative specifier with .js, .ts and index files. */
function resolveWithRetry(specifier: string, context: Parameters<Next>[1], next: Next): ReturnType<Next> {
  try {
    return next(specifier, context);
  } catch (e) {
    if (!RELATIVE.test(specifier) || HAS_EXTENSION.test(specifier)) throw e;
    for (const ext of [".ts", ".js", "/index.ts", "/index.js"]) {
      try {
        return next(specifier + ext, context);
      } catch {
        // try the next form
      }
    }
    throw e;
  }
}

registerHooks({
  resolve(specifier, context, next) {
    if (trustedParent(context.parentURL)) return resolveWithRetry(specifier, context, next as Next);
    const p = policy!;
    const pkg = p.allowed.get(specifier);
    if (pkg !== undefined) {
      const r = resolveWithRetry(specifier, context, next as Next);
      let real = "";
      try {
        real = realpathSync(fileURLToPath(r.url));
      } catch {
        // an unreadable or non-file target is refused below
      }
      if (real === "" || !inside(pkg, real)) throw halt("import", `${specifier} resolves to ${real || r.url}, outside its workspace package ${pkg}`);
      return r;
    }
    if (!RELATIVE.test(specifier) || context.parentURL === undefined || !context.parentURL.startsWith("file:")) {
      throw halt("import", `${specifier} is outside the import allowlist (${[...p.allowed.keys()].join(", ")} and relative files in the design directory)`);
    }
    const target = fileURLToPath(new URL(specifier, context.parentURL));
    if (!inside(p.designDir, target)) throw halt("import", `${specifier} resolves outside the design directory`);
    const r = resolveWithRetry(specifier, context, next as Next);
    let real: string;
    try {
      real = realpathSync(fileURLToPath(r.url));
    } catch {
      throw halt("import", `${specifier} does not resolve to a readable file in the design directory`);
    }
    if (!inside(p.designDir, real)) throw halt("import", `${specifier} links outside the design directory`);
    return r;
  },
});

/** Replace a global or process member with a function that records the stop and throws. */
function remove(target: object, name: string, reason: Reason): void {
  const stub = function removed(): never {
    throw halt(reason, `${name} is removed in the build sandbox`);
  };
  try {
    Object.defineProperty(target, name, { value: stub, writable: false, configurable: false, enumerable: false });
  } catch {
    // A member that cannot be redefined is absent on this Node.
  }
}

function permissionReason(e: unknown): Reason | undefined {
  const err = e as { code?: unknown; permission?: unknown };
  if (err?.code !== "ERR_ACCESS_DENIED") return undefined;
  const map: Readonly<Record<string, Reason>> = {
    FileSystemRead: "fs-read", FileSystemWrite: "fs-write", ChildProcess: "child-process", WorkerThreads: "worker", Addon: "addon", WASI: "addon",
  };
  return map[String(err.permission)] ?? "fs-read";
}

function reply(msg: { readonly max?: number; readonly [k: string]: unknown }): void {
  // A closed channel has no reader: a send on it raises an error event, the
  // uncaughtException handler replies again, and the child spins forever.
  if (send === undefined || !process.connected) return;
  const { max = Number.POSITIVE_INFINITY, ...body } = msg;
  let bytes: Buffer;
  try {
    bytes = serialize(body);
  } catch (e) {
    post(serialize({ kind: "stop", reason: "result-schema", detail: `the build result is not plain data: ${String(e)}` }));
    return;
  }
  if (bytes.length > max) {
    post(serialize({ kind: "stop", reason: "result-size", detail: `${bytes.length} bytes over the ${max} byte cap` }));
    return;
  }
  post(bytes);
}

/** Send one serialized reply with the IPC members back in place, then remove them again. */
function post(bytes: Buffer): void {
  openIpc();
  try {
    send!(bytes);
  } finally {
    sealIpc();
  }
}

async function run(req: Request): Promise<void> {
  // Trusted modules load before the policy and the removals take effect.
  const spec = await import("@hackbuild/spec");
  const { createProfileLookup } = await import("@hackbuild/profile");
  const { makeAuthor } = await import("./author.js");
  type Tables = Parameters<typeof createProfileLookup>[0];

  policy = { designDir: req.designDir, trusted: req.trusted, allowed: new Map(Object.entries(req.allowed)) };
  sealIpc();
  for (const g of ["fetch", "WebSocket", "EventSource"]) remove(globalThis, g, "network");
  for (const m of ["binding", "_linkedBinding"]) remove(process, m, "network");
  remove(process, "dlopen", "addon");
  remove(process, "getBuiltinModule", "import");
  remove(process, "kill", "child-process");

  const max = req.maxResultBytes;
  try {
    const mod = (await import(pathToFileURL(req.buildFile).href)) as Record<string, unknown>;
    const fn = mod[req.fn];
    if (typeof fn !== "function") {
      const fns = Object.keys(mod).filter((k) => typeof mod[k] === "function");
      const near = spec.didYouMean(req.fn, fns);
      reply({ kind: "error", max, hbf: { code: "E_REF", path: "/build/fn", got: req.fn, ...(near.length > 0 ? { didYouMean: near } : {}), hint: `export function ${req.fn} from build.ts` } });
      return;
    }
    const profile = createProfileLookup(req.tables as Tables);
    const warnings: { code: string; text: string }[] = [];
    const derived: Parameters<typeof makeAuthor>[3] = [];
    const k = makeAuthor(req.chase as Parameters<typeof makeAuthor>[0], profile, warnings, derived);
    const draft: unknown = await (fn as (v: unknown, k: unknown) => unknown)(req.values, k);
    const maskFn = mod["masks"];
    const masks: unknown = req.masks && typeof maskFn === "function" ? (maskFn as (v: unknown) => unknown)(req.values) : undefined;
    if (stop !== undefined) {
      reply({ kind: "stop", max, ...stop });
      return;
    }
    reply({
      kind: "ok", max, draft, warnings, derived, reads: profile.reads(), profileWarnings: profile.warnings(),
      ...(masks === undefined ? {} : { masks }),
    });
  } catch (e) {
    if (stop !== undefined) {
      reply({ kind: "stop", max, ...stop });
      return;
    }
    const reason = permissionReason(e);
    if (reason !== undefined) {
      reply({ kind: "stop", max, reason, detail: String((e as Error).message ?? e) });
      return;
    }
    if (spec.isThrownCommandError(e)) {
      reply({ kind: "error", max, hbf: JSON.parse(JSON.stringify(e.hbf)) as unknown });
      return;
    }
    reply({ kind: "threw", max, message: e instanceof Error ? e.message : String(e) });
  }
}

process.on("uncaughtException", (e) => {
  const reason = permissionReason(e);
  if (stop !== undefined || reason !== undefined) reply({ kind: "stop", ...(stop ?? { reason: reason!, detail: String(e) }) });
  else reply({ kind: "threw", message: e instanceof Error ? e.message : String(e) });
  process.exitCode = 1;
});

// The parent's death closes the channel and leaves no one to SIGKILL this
// child at wallMs; nothing it computes can be delivered, so it exits.
process.once("disconnect", () => process.exit(1));

// The parent kills the child once the reply arrives, so nothing here waits on timers the build left.
process.once("message", (req: Request) => {
  void run(req);
});
