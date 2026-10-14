// hbf parity on a surface reference (core/src/commands/surface.ts, M05-T14
// and M05-T15 card defects). The goldens it compares are the reference
// tests' own, pinned against the shipped generators' reruns
// (reference/copper/<name>/test/parity.test.ts); this file holds the
// verdict: equal goldens and a passing board, and a failure when either
// moves.

import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, test } from "vitest";
import { runParity } from "../src/commands/parity.js";
import { loadGeom } from "@hackbuild/geom";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { SURFACE_CHASE, buildSurface, isSurfaceDir, ladderGolden, ladderNets } from "../src/commands/surface.js";
import { main } from "../src/main.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const KEYWAY = "reference/copper/keyway";
const scratch: string[] = [];

afterAll(() => {
  for (const d of scratch) rmSync(d, { recursive: true, force: true });
});

/** A copy of a reference inside the workspace (the sandbox reads only workspace files), outside every reference/<area> tree. */
function copyRef(rel: string): string {
  const dir = mkdtempSync(path.join(ROOT, "core", ".surface-test-"));
  scratch.push(dir);
  for (const f of [SURFACE_CHASE, "build.ts", "expected"]) cpSync(path.join(ROOT, rel, f), path.join(dir, f), { recursive: true });
  return dir;
}

describe("hbf parity on surface references", () => {
  test("a surface directory takes the surface path; a chase.ts directory does not", () => {
    expect(isSurfaceDir(path.join(ROOT, KEYWAY))).toBe(true);
    expect(isSurfaceDir(path.join(ROOT, "reference/keys/flex-pair"))).toBe(false);
  });

  test("KEYWAY: 45 gates pass and gates, layers and stack equal expected/", async () => {
    const out = await runParity({ reference: KEYWAY }, ROOT);
    expect(out.surface).toEqual({ kind: "vinyl", passed: 45, failed: 0 });
    expect(out.files.map((f) => [f.file, f.status])).toEqual([["gates.json", "equal"], ["layers.json", "equal"], ["stack.json", "equal"]]);
    expect(out.ok).toBe(true);
  }, 120_000);

  test("SPLICE: seven nets whole after the weed erosion and the ladder golden equal", async () => {
    const out = await runParity({ reference: "reference/copper/splice-ladder" }, ROOT);
    expect(out.surface).toEqual({ kind: "ladder", passed: 7, failed: 0 });
    expect(out.files).toEqual([{ file: "ladder.json", status: "equal", moved: [] }]);
    expect(out.ok).toBe(true);
  }, 120_000);

  test("the ladder margin probe erodes half the declared trace width (M05 card: 0.80 is half the trace width)", async () => {
    const dir = path.join(ROOT, "reference/copper/splice-ladder");
    const g = await loadGeom();
    const svg = readFileSync(path.join(dir, "legacy/splice-copper.svg"), "utf8");
    const profile = createProfileLookup(loadProfile());
    const nets = ["SIGA", "5V", "GND", "SIGB", "BASE1", "BASE2", "COL"];
    const at = (width: number): number => {
      const decl = { source: "legacy/splice-copper.svg", nets, pitch: 2.54, width };
      return (ladderGolden(g, decl, ladderNets(g, decl, svg), profile).golden as { probe: { erode: number } }).probe.erode;
    };
    expect(at(1.6)).toBe(0.8);
    expect(at(2)).toBe(1);
  }, 120_000);

  test("one moved gate line in the golden fails parity and names the file", async () => {
    const gold = mkdtempSync(path.join(tmpdir(), "hbf-surface-gold-"));
    scratch.push(gold);
    cpSync(path.join(ROOT, KEYWAY, "expected"), gold, { recursive: true });
    const g = JSON.parse(readFileSync(path.join(gold, "gates.json"), "utf8")) as { line: string }[];
    g[0] = { ...g[0]!, line: `${g[0]!.line} ` };
    writeFileSync(path.join(gold, "gates.json"), `${JSON.stringify(g)}\n`);
    const out = await runParity({ reference: KEYWAY, expectedDir: gold }, ROOT);
    expect(out.files.find((f) => f.file === "gates.json")?.status).toBe("differs");
    expect(out.files.filter((f) => f.status === "equal").map((f) => f.file)).toEqual(["layers.json", "stack.json"]);
    expect(out.ok).toBe(false);
  }, 120_000);

  test("a board that fails a gate fails parity, whatever its goldens say", async () => {
    const dir = copyRef(KEYWAY);
    const chase = readFileSync(path.join(dir, SURFACE_CHASE), "utf8");
    const clr = 'range: [0.3, 2], step: 0.05, default: 0.7,';
    expect(chase).toContain(clr);
    writeFileSync(path.join(dir, SURFACE_CHASE), chase.replace(clr, 'range: [0.3, 2], step: 0.05, default: 1.1,'));
    const out = await runParity({ reference: dir }, ROOT);
    expect(out.surface).toEqual({ kind: "vinyl", passed: 44, failed: 1 });
    expect(out.ok).toBe(false);
    // Goldens equal to the failing board's own output still fail: a gate verdict is never accepted into a golden.
    const s = await buildSurface(dir);
    for (const [file, fresh] of Object.entries(s.fresh)) writeFileSync(path.join(dir, "expected", file), `${JSON.stringify(fresh)}\n`);
    const same = await runParity({ reference: dir }, ROOT);
    expect(same.files.map((f) => f.status)).toEqual(["equal", "equal", "equal"]);
    expect(same.surface?.failed).toBe(1);
    expect(same.ok).toBe(false);
  }, 120_000);

  test("a board that passes every gate with goldens that equal fresh output, and only then, passes", async () => {
    const dir = copyRef(KEYWAY);
    const clean = await runParity({ reference: dir }, ROOT);
    expect(clean.ok).toBe(true);
    rmSync(path.join(dir, "expected", "stack.json"));
    const missing = await runParity({ reference: dir }, ROOT);
    expect(missing.files.find((f) => f.file === "stack.json")?.status).toBe("missing");
    expect(missing.ok).toBe(false);
  }, 120_000);

  test("--accept is refused: the reference test is the one writer of surface goldens", async () => {
    await expect(runParity({ reference: KEYWAY, accept: true }, ROOT)).rejects.toMatchObject({ hbf: { code: "E_SCHEMA", path: "/accept" } });
  });

  test("the CLI exits 0 and prints the gate count", async () => {
    const lines: string[] = [];
    const io = { out: (s: string) => lines.push(s), err: (s: string) => lines.push(s) };
    const code = await main(["parity", KEYWAY], ROOT, io as never);
    expect(code).toBe(0);
    expect(lines.join("\n")).toMatch(/^PASS parity reference\/copper\/keyway build [0-9a-f]{6}\.\.[0-9a-f]{2}\ngates {4}45 pass, 0 fail\nequal {4}gates\.json\nequal {4}layers\.json\nequal {4}stack\.json$/);
  }, 120_000);
});
