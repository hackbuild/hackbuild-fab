// designs/blocks: the chase read the way every command reads it
// (packages/chase source.ts, then validate.ts), and each part value built
// through the hbf CLI (core/bin/hbf.mjs part.build: the sandbox, the stage
// runner and every registered check). A design may not import core
// (tools/tiers.json), so the build and parity runs are the commands
// themselves. Held to sources this run does not write: the wire to
// reference/conductors/blocks-wire's committed goldens, the blocks-html
// stud to reference/conductors/blocks-stud's, and the boss-v1 stud's taps
// and post top to BOSS evaluated in place
// (packages/archetypes/test/legacy/blocks.json, boss both@9.6). The
// parity goldens are rerun without accept off the pinned epoch.

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { readChaseSource, validateDocument } from "@hackbuild/chase";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const DESIGN = "designs/blocks";
const HBF = path.join(ROOT, "core", "bin", "hbf.mjs");
const read = (...p: string[]): string => readFileSync(path.join(ROOT, ...p), "utf8");
const json = <T>(...p: string[]): T => JSON.parse(read(...p)) as T;
const { chase } = readChaseSource(read(DESIGN, "chase.ts"), `${DESIGN}/chase.ts`);

interface Golden { meshHashes: Record<string, string> }
const BOSS = json<{ boss: { stud: Record<string, { asBuilt: { taps: { name: string; z: number }[]; feats: { z1: number; tag: string }[] } }> } }>(
  "packages", "archetypes", "test", "legacy", "blocks.json").boss.stud["both@9.6"]!.asBuilt;

interface Finding { readonly id: string; readonly verdict: string; readonly measured?: unknown }
interface BuildOut {
  readonly ok: boolean;
  readonly findings: readonly Finding[];
  readonly errors: readonly { readonly code: string; readonly path?: string; readonly hint?: string }[];
  readonly result?: {
    readonly metrics: readonly { readonly id: string; readonly value: number | string }[];
    readonly warnings: readonly { readonly code: string }[];
    readonly ir: { readonly bodies: readonly { readonly id: string; readonly mesh: { readonly hash: string } }[] };
  };
}

/** One hbf command, JSON out, at the given epoch. */
function hbf<T>(args: readonly string[], epoch = "315532800"): T {
  const run = spawnSync(process.execPath, [HBF, ...args, "--json"], { cwd: ROOT, encoding: "utf8", env: { ...process.env, SOURCE_DATE_EPOCH: epoch }, maxBuffer: 1 << 28 });
  if (run.stdout === "") throw new Error(`hbf ${args.join(" ")} wrote nothing: ${run.stderr}`);
  return JSON.parse(run.stdout) as T;
}
const build = (args: readonly string[]): BuildOut => hbf<BuildOut>(["part.build", DESIGN, "--detail", "full", ...args]);
const metric = (b: BuildOut, id: string): number | string | undefined => b.result?.metrics.find((m) => m.id === id)?.value;
const fails = (b: BuildOut): string[] => b.findings.filter((f) => f.verdict === "fail").map((f) => `${f.id} ${String(f.measured)}`);
const hashes = (b: BuildOut): Record<string, string> => Object.fromEntries((b.result?.ir.bodies ?? []).map((x) => [x.id, x.mesh.hash]));
const warnings = (b: BuildOut): string[] => (b.result?.warnings ?? []).map((w) => w.code);

describe("blocks chase", () => {
  test("validates with 0 errors through packages/chase validate.ts", () => {
    const v = validateDocument({ chase, buildSource: read(DESIGN, "build.ts") });
    expect(v.errors).toEqual([]);
    expect(chase.meta).toMatchObject({ id: "blocks", kind: "single", machines: ["ffc5p"] });
  });

  test("asks the brick standard with no standard preselected (D-087), and each preset is one standard start", () => {
    const std = chase.params.flatMap((g) => g.fields).find((f) => f.id === "standard");
    expect(std?.type).toBe("enum");
    if (std?.type !== "enum") return;
    expect(std.default).toBe("unset");
    expect(std.options.map((o) => o.value)).toEqual(["unset", "boss-v1", "blocks-html"]);
    expect((chase.presets ?? []).map((p) => [p.id, p.params["standard"]])).toEqual([["boss-v1", "boss-v1"], ["blocks-html", "blocks-html"]]);
  });

  test("offers only the parts whose archetypes are proven: the wire and the stud", () => {
    const part = chase.params.flatMap((g) => g.fields).find((f) => f.id === "part");
    expect(part?.type === "enum" ? part.options.map((o) => o.value) : []).toEqual(["wire", "stud"]);
  });
});

describe("blocks build", () => {
  test("the defaults build the wire on blocks-html, with no failing check, equal to the blocks-wire reference", () => {
    const b = build([]);
    expect(b.ok).toBe(true);
    expect(fails(b)).toEqual([]);
    expect(metric(b, "blocks.standard")).toBe("blocks-html");
    expect(warnings(b)).toContain("LAYER");
    expect(hashes(b)).toEqual(json<Golden>("reference", "conductors", "blocks-wire", "expected", "build.json").meshHashes);
  });

  test("the blocks-html start builds the blocks-stud reference brick, with no failing check", () => {
    const b = build(["--preset", "blocks-html"]);
    expect(b.ok).toBe(true);
    expect(fails(b)).toEqual([]);
    expect(metric(b, "blocks-stud.0.stud.standard")).toBe("blocks-html");
    expect(hashes(b)).toEqual(json<Golden>("reference", "conductors", "blocks-stud", "expected", "build.json").meshHashes);
  });

  test("the boss-v1 start builds BOSS's column: taps and post top as BOSS places them, no failing check", () => {
    const b = build(["--preset", "boss-v1"]);
    expect(b.ok).toBe(true);
    expect(fails(b)).toEqual([]);
    expect(warnings(b)).not.toContain("LAYER");
    expect(metric(b, "blocks-stud.0.stud.standard")).toBe("boss-v1");
    expect(metric(b, "blocks-stud.0.stud.tap.S")).toBeCloseTo(BOSS.taps.find((t) => t.name === "S")!.z, 9);
    expect(metric(b, "blocks-stud.0.stud.tap.S-sock")).toBeCloseTo(BOSS.taps.find((t) => t.name === "S.sock")!.z, 9);
    expect(metric(b, "blocks-stud.0.stud.postTop")).toBeCloseTo(BOSS.feats.find((f) => f.tag === "post S")!.z1, 9);
  });

  test.each([
    [{ part: "stud" }, "pick a brick standard"],
    [{ part: "wire", standard: "boss-v1" }, "blocks-html standard only"],
  ] as const)("refuses %j with E_SCHEMA at /standard", (params, hint) => {
    const b = build(["--params", JSON.stringify(params)]);
    expect(b.ok).toBe(false);
    expect(b.errors.map((e) => [e.code, e.path])).toEqual([["E_SCHEMA", "/standard"]]);
    expect(b.errors[0]?.hint).toContain(hint);
  });

  test("parity goldens hold off the pinned epoch", { timeout: 300_000 }, () => {
    const out = hbf<{ ok: boolean; files: readonly { file: string; status: string }[] }>(["parity", DESIGN], "1000000000");
    expect(out.files.map((f) => [f.file, f.status])).toEqual([
      ["build.json", "equal"], ["report.json", "equal"], ["edit.json", "equal"], ["artifacts.json", "equal"],
    ]);
    expect(out.ok).toBe(true);
  });
});
