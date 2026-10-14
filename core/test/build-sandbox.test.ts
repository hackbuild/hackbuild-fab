// The build sandbox (D-178, D-206, spec/build.ts BUILD_SANDBOX). A
// build.ts calling fetch, writing through node:fs, importing
// node:child_process or a file outside its directory, reaching a builtin
// through process.getBuiltinModule, looping forever or returning NaN stops
// with E_KERNEL and record build-sandbox/<reason>, and writes nothing. A
// refusal the build catches is still reported. chase.ts is read as data,
// so code in it never runs; build.module and skeleton-kinds.ts cannot point
// the parent at code outside the design directory. The child sees no
// environment variable of the parent. Each draft feature passes its
// FeatureKindDef.schema before kernel stage 1. A build cannot send its own
// reply, an allowlisted name cannot resolve outside its workspace package,
// the parent reads only a serialized reply within the size cap, and a
// spinning child ends when its parent is killed.

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, copyFileSync, writeFileSync } from "node:fs";
import { serialize } from "node:v8";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { isThrownCommandError, type CommandError } from "@hackbuild/spec";
import { pathToFileURL } from "node:url";
import type { SchemaLike } from "@hackbuild/spec";
import { buildPart, featureSchemaProblem, loadDesign, resolveParams, type BuildOptions } from "../src/commands/build.js";
import { cpuSeconds, runSandboxed, unpackReply, type SandboxRequest } from "../src/sandbox.js";
import { ROOT } from "./hbf.js";

const FIX = path.join(ROOT, "core", "test", "fixtures", "sandbox");
const TMP = path.join(FIX, `.tmp-${process.pid}`);

async function attempt(dir: string, opts: BuildOptions = {}): Promise<CommandError | "built"> {
  try {
    const design = await loadDesign(path.join(FIX, dir), ROOT);
    await buildPart(design, resolveParams(design.chase, undefined, undefined), opts);
    return "built";
  } catch (e) {
    if (isThrownCommandError(e)) return e.hbf;
    throw e;
  }
}

async function stopped(dir: string, opts: BuildOptions = {}): Promise<CommandError> {
  const r = await attempt(dir, opts);
  if (r === "built") throw new Error(`${dir} built; the sandbox should have stopped it`);
  return r;
}

const saved = process.env["NPM_TOKEN"];
beforeAll(() => {
  process.env["NPM_TOKEN"] = "npm_SANDBOX_CANARY";
});
afterAll(() => {
  if (saved === undefined) delete process.env["NPM_TOKEN"];
  else process.env["NPM_TOKEN"] = saved;
  rmSync(TMP, { recursive: true, force: true });
});

describe("build.ts runs in the sandbox", () => {
  it("builds a plate with an empty environment; a type-only import is erased and allowed", async () => {
    expect(await attempt("ok")).toBe("built");
  }, 60_000);

  const cases: readonly (readonly [string, string])[] = [
    ["fetch", "network"],
    ["fs-write", "import"],
    ["dyn-fs", "import"],
    ["caught", "import"],
    ["child-process", "import"],
    ["escape-import", "import"],
    ["builtin", "import"],
  ];
  for (const [dir, reason] of cases) {
    it(`${dir} stops with build-sandbox/${reason}`, async () => {
      const e = await stopped(dir);
      expect(e.code).toBe("E_KERNEL");
      expect(e.record).toBe(`build-sandbox/${reason}`);
      expect(e.got).toBe(`core/test/fixtures/sandbox/${dir}/build.ts`);
    }, 60_000);
  }

  it("a NaN in the draft is build-sandbox/result-schema at its pointer", async () => {
    const e = await stopped("nan");
    expect(e.record).toBe("build-sandbox/result-schema");
    expect(e.path).toBe("/bodies/0/base/z/1");
  }, 60_000);

  it("a build that never returns is killed at the wall budget", async () => {
    const t = Date.now();
    const e = await stopped("loop", { sandbox: { wallMs: 3000 } });
    expect(e.record).toBe("build-sandbox/wall");
    expect(Date.now() - t).toBeLessThan(20_000);
  }, 60_000);

  it("a child that exits before replying is E_KERNEL", async () => {
    const e = await stopped("process-exit");
    expect(e.code).toBe("E_KERNEL");
    expect(e.hint).toMatch(/exited before it replied/);
  }, 60_000);

  it("wrote nothing in any fixture directory", () => {
    for (const d of ["fs-write", "dyn-fs", "caught", "chase-code", "kinds"]) expect(existsSync(path.join(FIX, d, "pwned.txt")), d).toBe(false);
  });
});

describe("a child whose parent died exits", () => {
  // The parent's death closes the IPC channel and no one SIGKILLs the child
  // at wallMs. Five children orphaned that way spun at 50 to 100 percent CPU
  // for about 40 h (measured, ps, 2026-10-08): a reply on the closed channel
  // raised an error the uncaughtException handler answered with another
  // reply. Here the test closes the channel while the build waits 1500 ms;
  // the wall is 8000 ms, so a child that never exits reads as record wall.
  async function orphaned(dir: string): Promise<{ readonly e: CommandError; readonly afterClose: number }> {
    const design = await loadDesign(path.join(FIX, dir), ROOT);
    let closedAt = 0;
    const run = runSandboxed({
      buildFile: design.buildFile, fn: design.chase.build.fn, designDir: design.dir, root: ROOT,
      values: resolveParams(design.chase, undefined, undefined), chase: design.chase, tables: design.ws.tables, masks: false,
    }, {
      wallMs: 8000,
      onChild: (child) => {
        child.stderr?.on("data", (b: Buffer) => {
          if (closedAt === 0 && b.toString("utf8").includes("hbf-sandbox-started")) {
            closedAt = Date.now();
            child.disconnect();
          }
        });
      },
    });
    try {
      await run;
    } catch (e) {
      if (isThrownCommandError(e)) return { e: e.hbf, afterClose: Date.now() - closedAt };
      throw e;
    }
    throw new Error(`${dir} replied after its channel closed`);
  }

  it("exits at once when the channel closes, before the build's own timer", async () => {
    const { e, afterClose } = await orphaned("orphan");
    expect(e.record).toBe("agent-capability");
    expect(e.hint).toMatch(/exited before it replied/);
    expect(afterClose).toBeLessThan(1500);
  }, 60_000);

  it("a build that removes the disconnect listener still ends: the reply is dropped, never retried", async () => {
    const { e } = await orphaned("orphan-deaf");
    expect(e.record).not.toBe("build-sandbox/wall");
    expect(e.hint).toMatch(/exited before it replied/);
  }, 60_000);
});

describe("the parent runs no design code", () => {
  it("chase.ts is read as data: a statement in it is refused and never runs", async () => {
    const e = await stopped("chase-code");
    expect(e.code).toBe("E_SCHEMA");
    expect(e.record).toMatch(/^chase-source\//);
    expect(existsSync(path.join(FIX, "chase-code", "pwned.txt"))).toBe(false);
  });

  it("build.module outside the directory is refused by the reader", async () => {
    const e = await stopped("escape");
    expect(e.code).toBe("E_SCHEMA");
    expect(e.record).toBe("chase-source/build-path");
    expect(e.path).toBe("/build/module");
  });

  it("build.module through a symlink that leaves the directory is refused", async () => {
    const dir = path.join(TMP, "symlink");
    mkdirSync(dir, { recursive: true });
    copyFileSync(path.join(FIX, "ok", "chase.ts"), path.join(dir, "chase.ts"));
    symlinkSync(path.join(FIX, "outside.ts"), path.join(dir, "build.ts"));
    const e = await stopped(path.relative(FIX, dir));
    expect(e.code).toBe("E_SCHEMA");
    expect(e.path).toBe("/build/module");
    expect(e.record).toBe("build-sandbox/import");
  });

  it("skeleton-kinds.ts outside DRAFT_KIND_DIRS is refused before it loads", async () => {
    const e = await stopped("kinds");
    expect(e.code).toBe("E_SCHEMA");
    expect(e.record).toBe("build-sandbox/import");
    expect(existsSync(path.join(FIX, "kinds", "pwned.txt"))).toBe(false);
  });
});

describe("references under the import allowlist", () => {
  it("orca-3mf-roundtrip/collar-build.ts is a byte copy of designs/collar/build.ts", () => {
    const copy = readFileSync(path.join(ROOT, "reference", "exports", "orca-3mf-roundtrip", "collar-build.ts"));
    const source = readFileSync(path.join(ROOT, "designs", "collar", "build.ts"));
    expect(copy.equals(source), "copy designs/collar/build.ts over the reference's collar-build.ts").toBe(true);
  });
});

describe("the parent applies FeatureKindDef.schema before kernel stage 1", () => {
  async function flexPairSchemas(): Promise<Record<string, SchemaLike>> {
    const mod = (await import(pathToFileURL(path.join(ROOT, "reference", "keys", "flex-pair", "skeleton-kinds.ts")).href)) as { SKELETON_KINDS: Record<string, { schema: SchemaLike }> };
    return Object.fromEntries(Object.entries(mod.SKELETON_KINDS).map(([k, d]) => [k, d.schema]));
  }

  it("a pocket without depth is refused at its pointer", async () => {
    const features = [
      { kind: "port", id: "port.a", net: "a", type: "gpio", interface: "pad" },
      { kind: "pocket", id: "pocket.a", outline: [], face: "top", floor: 1, fit: "none" },
    ];
    const p = await featureSchemaProblem(await flexPairSchemas(), features);
    expect(p?.path).toBe("/features/1/depth");
    expect(p?.detail).toMatch(/pocket\.a fails the pocket schema: pocket needs depth/);
  });

  it("a kind with no schema entry is left to its generator", async () => {
    expect(await featureSchemaProblem(await flexPairSchemas(), [{ kind: "hinge", id: "hinge.a" }])).toBeUndefined();
  });

  it("the flex-pair draft passes its schemas, so loadDesign carries them", async () => {
    const design = await loadDesign(path.join(ROOT, "reference", "keys", "flex-pair"), ROOT);
    expect(Object.keys(design.featureSchemas ?? {}).sort()).toEqual(["conductor", "contact", "pad", "pocket", "port"]);
  }, 60_000);
});

describe("the child cannot forge its reply or shadow an allowlisted package", () => {
  it("a build that calls process.send itself stops with build-sandbox/result-schema", async () => {
    const e = await stopped("forge");
    expect(e.code).toBe("E_KERNEL");
    expect(e.record).toBe("build-sandbox/result-schema");
    expect(e.hint).toMatch(/process\.send is removed/);
  }, 60_000);

  function shadowed(name: string, link: (dir: string) => void): string {
    const dir = path.join(TMP, name);
    mkdirSync(path.join(dir, "node_modules", "@hackbuild"), { recursive: true });
    for (const f of ["chase.ts", "build.ts"]) copyFileSync(path.join(FIX, "shadow", f), path.join(dir, f));
    link(path.join(dir, "node_modules", "@hackbuild", "spec"));
    return path.relative(FIX, dir);
  }

  it("@hackbuild/spec through a design node_modules symlink to another package is build-sandbox/import", async () => {
    const dir = shadowed("shadow-link", (at) => symlinkSync(path.join(ROOT, "node_modules", "semver"), at, "dir"));
    const e = await stopped(dir);
    expect(e.record).toBe("build-sandbox/import");
    expect(e.hint).toMatch(/outside its workspace package/);
  }, 60_000);

  it("@hackbuild/spec from a package directory inside the design is build-sandbox/import", async () => {
    const dir = shadowed("shadow-copy", (at) => {
      mkdirSync(at);
      writeFileSync(path.join(at, "package.json"), JSON.stringify({ name: "@hackbuild/spec", type: "module", exports: "./index.js" }));
      writeFileSync(path.join(at, "index.js"), "export const defineBuild = (c, f) => f;\n");
    });
    const e = await stopped(dir);
    expect(e.record).toBe("build-sandbox/import");
  }, 60_000);

  const REQ = { root: ROOT, buildFile: path.join(FIX, "ok", "build.ts") } as unknown as SandboxRequest;
  const hbfOf = (f: () => unknown): CommandError => {
    try {
      f();
    } catch (e) {
      if (isThrownCommandError(e)) return e.hbf;
      throw e;
    }
    throw new Error("unpackReply accepted the message");
  };

  it("the parent refuses a reply that is not a serialized buffer, and one over the cap before reading it", () => {
    expect(hbfOf(() => unpackReply(REQ, { kind: "ok", draft: {} }, 1024)).record).toBe("build-sandbox/result-schema");
    const big = serialize({ kind: "ok", name: "x".repeat(4096) });
    const over = hbfOf(() => unpackReply(REQ, big, 1024));
    expect(over.record).toBe("build-sandbox/result-size");
    expect(over.hint).toContain(`${big.length} bytes over the 1024 byte cap`);
    expect(unpackReply(REQ, new Uint8Array(serialize({ kind: "ok", n: 1 })), 1024)).toEqual({ kind: "ok", n: 1 });
  });
});

describe("a spinning child does not outlive a parent that was killed", () => {
  // A build in a synchronous loop never runs its disconnect listener. With
  // the parent killed by SIGKILL nothing is left to stop it but the cpu
  // limit the child starts under (ulimit -t, wall + 2 s); a SIGTERM or
  // SIGINT parent kills its children itself. Measured before the limit
  // (2026-10-08): the child of a SIGKILLed hbf spun under PPID 1 at full cpu.
  const WALL = 2000;
  const alive = (pid: number): boolean => {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  };

  async function killParent(signal: NodeJS.Signals): Promise<{ readonly gone: number; readonly exit: NodeJS.Signals | null }> {
    const parent = spawn(process.execPath, [path.join(FIX, "parent.mjs"), "loop", String(WALL)], { cwd: ROOT, stdio: ["ignore", "pipe", "inherit"] });
    let pid = 0;
    try {
      pid = await new Promise<number>((resolve, reject) => {
        let out = "";
        parent.stdout.on("data", (b: Buffer) => {
          out += b.toString("utf8");
          const m = /child (\d+)/.exec(out);
          if (m !== null) resolve(Number(m[1]));
        });
        parent.on("exit", () => reject(new Error(`parent exited first: ${out}`)));
      });
      await new Promise((r) => setTimeout(r, 500));
      expect(alive(pid)).toBe(true);
      const exited = new Promise<NodeJS.Signals | null>((r) => parent.on("exit", (_c, sig) => r(sig)));
      const t = Date.now();
      parent.kill(signal);
      const exit = await exited;
      // The limit counts cpu seconds; under a loaded test run they take longer in wall time, hence the margin.
      const deadline = t + cpuSeconds(WALL) * 1000 + 40_000;
      while (alive(pid) && Date.now() < deadline) await new Promise((r) => setTimeout(r, 100));
      return { gone: alive(pid) ? Number.POSITIVE_INFINITY : Date.now() - t, exit };
    } finally {
      if (pid !== 0 && alive(pid)) process.kill(pid, "SIGKILL");
      if (parent.exitCode === null && parent.signalCode === null) parent.kill("SIGKILL");
    }
  }

  it.skipIf(process.platform === "win32")("SIGKILL of the parent: the cpu limit ends the child, which would otherwise spin forever", async () => {
    const { gone } = await killParent("SIGKILL");
    expect(gone).toBeLessThan(cpuSeconds(WALL) * 1000 + 40_000);
  }, 90_000);

  it("SIGTERM of the parent: it kills the child, then ends by the signal", async () => {
    const { gone, exit } = await killParent("SIGTERM");
    expect(exit).toBe("SIGTERM");
    expect(gone).toBeLessThan(1500);
  }, 60_000);
});
