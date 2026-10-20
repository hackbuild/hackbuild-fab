// chase.patch and arch.apply through it (M10-T05 steps 2 to 4). Every
// write goes to a throwaway git repository made under .hbf/ (gitignored),
// inside the workspace so loadDesign and the build sandbox resolve it,
// never to the checkout the test runs in. The flex-pair session of
// AGENT-SURFACE.md 8.6 replays on a copy of reference/keys/flex-pair; the
// arch.apply write is held to core/test/fixtures/arch-apply/applied, the
// chase the M06-T12 test already declares as the result of that placement.

import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { readChaseSource } from "@hackbuild/chase";
import { loadDesign } from "../src/commands/build.js";
import { designDefHash } from "../src/commands/chase-patch.js";
import { ROOT, json } from "./hbf.js";

const GAP = "/params/1/fields/0/item/3/default";
const made: string[] = [];

const git = (cwd: string, ...args: string[]): string => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();

/** A git repository holding designs/<name> copied from src, one commit on main. */
function repo(src: string, name: string, edit: (s: string) => string = (s) => s): { top: string; dir: string } {
  mkdirSync(path.join(ROOT, ".hbf"), { recursive: true });
  const top = mkdtempSync(path.join(ROOT, ".hbf", "patch-test-"));
  made.push(top);
  const dir = path.join(top, "designs", name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "chase.ts"), edit(readFileSync(path.join(ROOT, src, "chase.ts"), "utf8")));
  for (const f of ["build.ts", "bench.ts"]) if (existsSync(path.join(ROOT, src, f))) copyFileSync(path.join(ROOT, src, f), path.join(dir, f));
  git(top, "init", "-q", "-b", "main");
  git(top, "-c", "user.name=test", "-c", "user.email=test@example.invalid", "add", ".");
  git(top, "-c", "user.name=test", "-c", "user.email=test@example.invalid", "-c", "core.hooksPath=/dev/null", "commit", "-q", "-m", "init");
  return { top, dir };
}

afterAll(() => {
  for (const d of made) rmSync(d, { recursive: true, force: true });
});

describe("chase.patch (M10-T05)", () => {
  let here: string;
  beforeEach(() => {
    here = git(ROOT, "rev-parse", "HEAD");
  });

  it("the 8.6 pointer edit: exit 0, one edit staged on hbf/keys-flex-pair, one literal changed, no commit", async () => {
    const { top, dir } = repo("reference/keys/flex-pair", "flex-pair");
    const before = readFileSync(path.join(dir, "chase.ts"), "utf8");
    const { code, r } = await json("chase.patch", path.join(dir, "chase.ts"), "--pointer", GAP, "--set", "1.44");
    expect(code, JSON.stringify(r.errors)).toBe(0);
    const res = r.result as { edits: number; branch: string; defHashBefore: string; defHash: string };
    expect(res.edits).toBe(1);
    expect(res.branch).toBe("hbf/keys-flex-pair");
    expect(git(top, "symbolic-ref", "--short", "HEAD")).toBe("hbf/keys-flex-pair");
    expect(git(top, "rev-list", "--count", "HEAD")).toBe("1");
    expect(git(top, "diff", "--cached", "--numstat")).toBe("1\t1\tdesigns/flex-pair/chase.ts");
    const after = readFileSync(path.join(dir, "chase.ts"), "utf8");
    expect(after).toBe(before.replace("step: 0.02, default: 1.84", "step: 0.02, default: 1.44"));
    const log = readFileSync(path.join(top, ".hbf", "patches.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l) as Record<string, unknown>);
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ chase: "keys-flex-pair", file: "designs/flex-pair/chase.ts", edits: [{ pointer: GAP, set: 1.44 }], inverse: [{ pointer: GAP, set: 1.84 }], revert: null });
    expect(log[0]!["defHashBefore"]).toBe(res.defHashBefore);
    expect(log[0]!["defHashAfter"]).toBe(res.defHash);
    expect(res.defHash).not.toBe(res.defHashBefore);
    expect(git(ROOT, "rev-parse", "HEAD")).toBe(here);
  });

  it("the inverse is a staged patch marked revert that restores the file", async () => {
    const { top, dir } = repo("reference/keys/flex-pair", "flex-pair");
    const before = readFileSync(path.join(dir, "chase.ts"), "utf8");
    await json("chase.patch", path.join(dir, "chase.ts"), "--pointer", GAP, "--set", "1.44");
    const first = JSON.parse(readFileSync(path.join(top, ".hbf", "patches.jsonl"), "utf8").trim()) as { id: string; inverse: unknown };
    const { code } = await json("chase.patch", path.join(dir, "chase.ts"), "--edits", JSON.stringify(first.inverse));
    expect(code).toBe(0);
    expect(readFileSync(path.join(dir, "chase.ts"), "utf8")).toBe(before);
    const log = readFileSync(path.join(top, ".hbf", "patches.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l) as { revert: string | null });
    expect(log[1]!.revert).toBe(first.id);
  });

  it("the 8.6 anchor matching twice exits 2 with E_STALE matched 2 times, writes nothing, leaves the branch", async () => {
    const { top, dir } = repo("reference/keys/flex-pair", "flex-pair", (s) => s.replace("default: 1.84", "default: 2.15").replace("step: 0.05, default: 1.4", "step: 0.05, default: 2.15"));
    const before = readFileSync(path.join(dir, "chase.ts"), "utf8");
    const { code, r } = await json("chase.patch", path.join(dir, "chase.ts"), "--anchor", "default: 2.15", "--replace", "default: 1.44");
    expect(code).toBe(2);
    expect(r.errors[0]?.code).toBe("E_STALE");
    expect(r.errors[0]?.hint).toContain("matched 2 times");
    expect(readFileSync(path.join(dir, "chase.ts"), "utf8")).toBe(before);
    expect(git(top, "symbolic-ref", "--short", "HEAD")).toBe("main");
    expect(existsSync(path.join(top, ".hbf", "patches.jsonl"))).toBe(false);
  });

  it("an edit that breaks the schema exits 2 and writes nothing", async () => {
    const { top, dir } = repo("reference/keys/flex-pair", "flex-pair");
    const before = readFileSync(path.join(dir, "chase.ts"), "utf8");
    const { code, r } = await json("chase.patch", path.join(dir, "chase.ts"), "--pointer", "/meta/id", "--set", "Flex Pair");
    expect(code).toBe(2);
    expect(r.errors[0]?.path).toBe("/meta/id");
    expect(readFileSync(path.join(dir, "chase.ts"), "utf8")).toBe(before);
    expect(git(top, "status", "--porcelain")).toBe("");
    expect(git(top, "branch", "--list", "hbf/*")).toBe("");
  });

  it("a reference is refused before any git write", async () => {
    const { code, r } = await json("chase.patch", "reference/keys/flex-pair/chase.ts", "--pointer", GAP, "--set", "1.44");
    expect(code).toBe(2);
    expect(r.errors[0]?.code).toBe("E_REF");
    expect(r.errors[0]?.hint).toContain("reference/keys/flex-pair is not a design directory");
    expect(git(ROOT, "status", "--porcelain", "reference/keys/flex-pair")).toBe("");
  });

  it("defHash is the one loadDesign computes", async () => {
    const d = await loadDesign("designs/collar", ROOT);
    expect(designDefHash(d.dir, d.chase)).toBe(d.defHash);
  });
});

describe("arch.apply writes through chase.patch (M10-T05 step 4)", () => {
  it("flex-cone-key on a design copy of the host: written, and chase.ts reads as the applied fixture", async () => {
    const { top, dir } = repo("core/test/fixtures/arch-apply/host", "host");
    const { code, r } = await json("arch.apply", dir, "--part", "body", "--face", "{\"ref\":\"body.floor\",\"uv\":[0,0],\"rotDeg\":0}", "--id", "flex-cone-key", "--params", "top=9.6");
    expect(code, JSON.stringify(r.errors)).toBe(0);
    const res = r.result as { written: boolean; notWritten?: string; branch: string };
    expect(res.notWritten).toBeUndefined();
    expect(res.written).toBe(true);
    expect(git(top, "symbolic-ref", "--short", "HEAD")).toBe(res.branch);
    const got = readChaseSource(readFileSync(path.join(dir, "chase.ts"), "utf8"), "chase.ts").chase;
    const want = readChaseSource(readFileSync(path.join(ROOT, "core/test/fixtures/arch-apply/applied/chase.ts"), "utf8"), "chase.ts").chase;
    expect(got.applied).toEqual(want.applied);
    expect(got.materials).toEqual(want.materials);
    expect([...got.meta.kernels].sort()).toEqual([...want.meta.kernels].sort());
    expect(git(top, "diff", "--cached", "--name-only")).toBe("designs/host/chase.ts");
  });
});
