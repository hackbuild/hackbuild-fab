// A maker folder made by hbf init builds outside the repository
// (R1-score-01). hbf init --from buttons/flex-cone writes ./cone in a temp
// folder; part.build, check.run, view.render and capabilities then run from
// inside it and by path from the repository, each exit 0. The store lands
// in the folder's .hbf/, the repository's git status and store stay as they
// were, and one MCP part_build served with --workspace on the folder gives
// the buildHash the CLI gave. Resolving the kernel from the folder, which
// holds no node_modules, fails the build.

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, realpathSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { CommandResult } from "@hackbuild/spec";
// @ts-expect-error tools/mcp/client.mjs is plain javascript without declarations
import { connect } from "../../tools/mcp/client.mjs";
import { hbfRoot, makerFolder, projectRoot, workspaceRoot } from "../src/commands/build.js";
import { commandWorkspace, main } from "../src/main.js";
import { ROOT } from "./hbf.js";

const TMP = realpathSync(mkdtempSync(path.join(os.tmpdir(), "hbf-maker-test-")));
const DIR = path.join(TMP, "cone");
afterAll(() => rmSync(TMP, { recursive: true, force: true }));

const gitStatus = (): string => execFileSync("git", ["status", "--porcelain"], { cwd: ROOT, encoding: "utf8" });

/** Run the CLI in process from `cwd` with --json. */
async function at(cwd: string, ...argv: string[]): Promise<{ code: number; r: CommandResult<Record<string, unknown>> }> {
  let out = "";
  const code = await main([...argv, "--json"], cwd, { out: (s) => { out += `${s}\n`; }, err: (s) => { out += `${s}\n`; } });
  return { code, r: JSON.parse(out) as CommandResult<Record<string, unknown>> };
}

const repoBuilds = (): string[] => {
  const d = path.join(ROOT, ".hbf", "store", "builds");
  return existsSync(d) ? readdirSync(d) : [];
};

let before = "";

beforeAll(async () => {
  before = gitStatus();
  const { code, r } = await at(TMP, "init", "cone", "--from", "buttons/flex-cone");
  expect(code, JSON.stringify(r.errors)).toBe(0);
}, 180_000);

describe("a maker folder made by hbf init (R1-score-01)", () => {
  it("reads as a maker folder whose kernel comes from the hbf that runs", () => {
    expect(path.relative(ROOT, DIR).startsWith("..")).toBe(true);
    expect(makerFolder(DIR)).toBe(DIR);
    expect(projectRoot(DIR)).toBe(DIR);
    expect(workspaceRoot(DIR)).toBe(hbfRoot());
    expect(realpathSync(hbfRoot())).toBe(realpathSync(ROOT));
    expect(commandWorkspace(ROOT, DIR)).toBe(DIR);
    expect(commandWorkspace(DIR)).toBe(DIR);
    expect(makerFolder(path.join(ROOT, "reference"))).toBeUndefined();
  });

  let hash = "";

  it("part.build, check.run, view.render and capabilities exit 0 from inside the folder and by path", async () => {
    const builds = repoBuilds();
    for (const [cwd, target] of [[DIR, "."], [ROOT, DIR]] as const) {
      const b = await at(cwd, "part.build", target);
      expect(b.code, JSON.stringify(b.r.errors)).toBe(0);
      const h = String(b.r.buildHash);
      expect(h).toMatch(/^[0-9a-f]{64}$/);
      if (hash === "") hash = h;
      expect(h, "the same folder builds to the same hash from either cwd").toBe(hash);
      const c = await at(cwd, "check.run", target);
      expect(c.code, JSON.stringify(c.r.errors)).toBe(0);
      const v = await at(cwd, "view.render", target, "--mode", "iso");
      expect(v.code, JSON.stringify(v.r.errors)).toBe(0);
    }
    for (const cwd of [DIR, TMP]) {
      let out = "";
      const code = await main(["capabilities", "--json"], cwd, { out: (s) => { out += s; }, err: (s) => { out += s; } });
      expect(code).toBe(0);
      expect(out).toContain("designs/");
    }
    expect(existsSync(path.join(DIR, ".hbf", "store", "builds", `${hash}.json`)), "the store sits in the folder").toBe(true);
    // Other test files write the repository store at the same time, so only this build's record is looked for.
    expect(builds.includes(`${hash}.json`) || !repoBuilds().includes(`${hash}.json`), "the folder's build is not in the repository store").toBe(true);
    expect(gitStatus(), "the repository's git status is unchanged").toBe(before);
  }, 300_000);

  it("one MCP part_build with --workspace on the folder gives the CLI's buildHash", async () => {
    expect(hash).not.toBe("");
    const { client, close } = await connect({ workspace: DIR, stderr: "ignore" }) as {
      client: { callTool(p: { name: string; arguments: Record<string, unknown> }): Promise<{ isError?: boolean; structuredContent?: Record<string, unknown> }> };
      close: () => Promise<void>;
    };
    try {
      const r = await client.callTool({ name: "part_build", arguments: { op: "build", chase: "." } });
      expect(r.isError ?? false, JSON.stringify(r.structuredContent?.["errors"])).toBe(false);
      expect(r.structuredContent?.["buildHash"]).toBe(hash);
    } finally {
      await close();
    }
    expect(gitStatus()).toBe(before);
  }, 180_000);

  it("hbf mcp on a folder that is neither the workspace nor a maker folder fails with a typed error naming --workspace", async () => {
    let out = "";
    const code = await main(["mcp", "--workspace", TMP], TMP, { out: (s) => { out += s; }, err: (s) => { out += s; } });
    expect(code).not.toBe(0);
    expect(out).toContain("E_REF");
    expect(out).toContain("path /workspace");
  });
});
