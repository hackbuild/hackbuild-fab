// The CLI on the keys flex-pair reference through main() with captured
// output: part.build, check.run, export.run with an answered gate, and
// parity, both the --accept path and the committed goldens. Figures
// asserted here are computed by the build (the CHK-KEY-01 band and fix come
// from the reference defaults on the ffc5p_20260819 grid: cone 4.0 snapped
// to 4.08 mm, band 1.428 to 2.04 mm at 35 to 50 percent, fix 1.44 mm on
// the 0.02 mm param step; D-223 as D-241 corrects it).

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { PassThrough } from "node:stream";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { liveCount } from "@hackbuild/mesh";
import type { CommandResult } from "@hackbuild/spec";
import { main } from "../src/main.js";
import type { GateStreams } from "../src/tty-gate.js";
import { runParity } from "../src/commands/parity.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const REF = "reference/keys/flex-pair";
const tmp = mkdtempSync(path.join(tmpdir(), "hbf-ms-t08-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

/** A terminal that answers the export prompt with `answer`. */
function terminal(answer: string): GateStreams {
  const input = Object.assign(new PassThrough(), { isTTY: true });
  const output = Object.assign(new PassThrough(), { isTTY: true });
  output.resume();
  input.end(answer);
  return { input, output };
}

async function hbf(argv: readonly string[], gate?: GateStreams): Promise<{ code: number; out: string }> {
  let out = "";
  const code = await main(argv, ROOT, { out: (s) => { out += `${s}\n`; }, err: (s) => { out += `${s}\n`; }, ...(gate === undefined ? {} : { gate }) });
  return { code, out };
}

async function json(...argv: string[]): Promise<{ code: number; r: CommandResult<Record<string, unknown>> }> {
  const { code, out } = await hbf([...argv, "--json"]);
  return { code, r: JSON.parse(out) as CommandResult<Record<string, unknown>> };
}

/** export.run answered y at a terminal. */
async function approved(...argv: string[]): Promise<{ code: number; r: CommandResult<Record<string, unknown>> }> {
  const { code, out } = await hbf([...argv, "--json"], terminal("y\n"));
  return { code, r: JSON.parse(out) as CommandResult<Record<string, unknown>> };
}

const sha = (file: string): string => createHash("sha256").update(readFileSync(file)).digest("hex");

describe("hbf CLI on the flex pair", () => {
  it("part.build exits 0 with one buildHash on two runs and frees every wasm object", async () => {
    const live = liveCount();
    const a = await json("part.build", REF);
    const b = await json("part.build", REF);
    expect(a.code).toBe(0);
    expect(a.r.ok).toBe(true);
    expect(a.r.buildHash).toMatch(/^[0-9a-f]{64}$/);
    expect(b.r.buildHash).toBe(a.r.buildHash);
    expect(a.r.result?.["ir"]).toBeNull();
    expect(liveCount()).toBe(live);
  }, 60_000);

  it("refuses an unknown param with E_SCHEMA, exit 2", async () => {
    const { code, r } = await json("part.build", REF, "--params", '{"bogus": 1}');
    expect(code).toBe(2);
    expect(r.ok).toBe(false);
    expect(r.errors[0]?.code).toBe("E_SCHEMA");
    expect(r.errors[0]?.path).toBe("/bogus");
  });

  it("refuses an unknown command, preset and pointer with E_REF, exit 2", async () => {
    const cmd = await json("part.bild", REF);
    expect(cmd.code).toBe(2);
    expect(cmd.r.errors[0]?.code).toBe("E_REF");
    expect(cmd.r.errors[0]?.didYouMean?.[0]).toBe("part.build");
    const preset = await json("part.build", REF, "--preset", "three");
    expect(preset.code).toBe(2);
    expect(preset.r.errors[0]?.code).toBe("E_REF");
    const ptr = await json("part.build", REF, "--params", '{"/keys/3/gap": 1.5}');
    expect(ptr.code).toBe(2);
    expect(ptr.r.errors[0]?.code).toBe("E_REF");
  }, 60_000);

  it("check.run runs the skeleton and M00 part checks; gap 1.0 fails CHK-KEY-01 with a one-param fix, exit 1", async () => {
    const ok = await json("check.run", REF);
    expect(ok.code).toBe(0);
    const ids = new Set((ok.r.result?.["results"] as { id: string }[]).map((x) => x.id));
    // The skeleton and M00 checks, then every seeded row of the part, body
    // and feature levels the registry runs on the build (security finding 3,
    // 2026-10-08), read from the seed, not from core.
    const seed = JSON.parse(readFileSync(path.join(ROOT, "packages", "checks", "seed", "checks.seed.json"), "utf8")) as { checks: { id: string; appliesTo: { level: string } }[] };
    const levels = seed.checks.filter((c) => ["part", "body", "feature"].includes(c.appliesTo.level)).map((c) => c.id);
    const skeletonAndM00 = ["CHK-3MF-04", "CHK-3MF-06", "CHK-3MF-07", "CHK-KEY-01", "CHK-NET-02", "CHK-NET-29", "CHK-PRT-01", "CHK-PRT-03", "CHK-PRT-04"];
    // The chase lists the circuit kernel, whose exported conductors carry CHK-3MF-08 (core/src/kinds.ts, M05-T20).
    const kernel = ["CHK-3MF-08"];
    expect([...ids].sort()).toEqual([...new Set([...skeletonAndM00, ...kernel, ...levels])].sort());
    expect((ok.r.result?.["results"] as { id: string; verdict: string }[]).find((x) => x.id === "CHK-3MF-08")?.verdict).toBe("pass");
    expect(ids.has("CHK-PRT-16")).toBe(true);
    // The CHK-KEY-01 band is 35 to 50 percent of the built cone, 4.08 mm (computed, D-241): 1.428 to 2.04.
    type KeyResult = { id: string; verdict: string; measured: number; legal: { lo: number; hi: number } };
    const pass = (ok.r.result?.["results"] as KeyResult[]).find((x) => x.id === "CHK-KEY-01");
    expect(pass?.verdict).toBe("pass");
    expect(pass?.measured).toBeCloseTo(1.84, 9);
    expect(pass?.legal.lo).toBeCloseTo(1.428, 9);
    expect(pass?.legal.hi).toBeCloseTo(2.04, 9);

    const bad = await json("part.build", REF, "--params", '{"/keys/0/gap": 1.0}');
    expect(bad.code).toBe(1);
    const key = bad.r.findings.find((f) => f.id === "CHK-KEY-01");
    expect(key?.verdict).toBe("fail");
    expect(key?.measured).toBe(1.0);
    expect(key?.legal).toMatchObject({ kind: "interval" });
    const legal = key?.legal as { lo: number; hi: number } | undefined;
    expect(legal?.lo).toBeCloseTo(1.428, 9);
    expect(legal?.hi).toBeCloseTo(2.04, 9);
    expect(key?.fix?.param).toBe("/keys/0/gap");
    expect(key?.fix?.set).toBe(1.44);
    expect(key?.fix?.predicts.verdict).toBe("pass");
    expect(bad.r.next[0]?.args).toMatchObject({ params: { "/keys/0/gap": 1.44 } });
  }, 120_000);

  it("export.run writes equal bytes twice and refuses a failing build without writing, exit 1", async () => {
    const a = path.join(tmp, "a.3mf");
    const b = path.join(tmp, "b.3mf");
    const first = await approved("export.run", REF, "--kind", "3mf", "--out", a);
    expect(first.code).toBe(0);
    expect(first.r.artifacts[0]?.kind).toBe("3mf");
    await approved("export.run", REF, "--kind", "3mf", "--out", b);
    expect(sha(a)).toBe(sha(b));

    const c = path.join(tmp, "c.3mf");
    const refused = await approved("export.run", REF, "--kind", "3mf", "--out", c, "--params", '{"/keys/0/gap": 1.0}');
    expect(refused.code).toBe(1);
    expect(refused.r.artifacts).toEqual([]);
    expect(existsSync(c)).toBe(false);

    const kind = await json("export.run", REF, "--kind", "stl", "--out", c);
    expect(kind.code).toBe(2);
    expect(kind.r.errors[0]?.code).toBe("E_REF");
  }, 120_000);

  it("parity --accept path: writes the four goldens to a scratch dir, then compares equal against them", async () => {
    const expectedDir = path.join(tmp, "expected");
    const accepted = await runParity({ reference: REF, accept: true, expectedDir }, ROOT);
    // The four JSON goldens, then the circuit.solve query golden queries.json declares (M05-T18).
    expect(accepted.files.map((f) => [f.file, f.status])).toEqual([
      ["build.json", "written"], ["report.json", "written"], ["edit.json", "written"], ["artifacts.json", "written"], ["expected/query-solve.json", "written"],
    ]);
    const again = await runParity({ reference: REF, expectedDir }, ROOT);
    expect(again.ok).toBe(true);
    const edit = JSON.parse(readFileSync(path.join(expectedDir, "edit.json"), "utf8")) as { pointer: string; expect: { changed: string[]; unchanged: string[] } };
    expect(edit.pointer).toBe("/keys/0/gap");
    expect(edit.expect.unchanged).toContain("pad");
    expect(edit.expect.changed.length).toBeGreaterThan(0);
  }, 120_000);

  it("parity edit on a chase default pointer: E_STALE when the default moved, E_REF when it names no numeric field", async () => {
    const expectedDir = path.join(tmp, "expected-stale");
    mkdirSync(expectedDir, { recursive: true });
    const run = async (edit: Record<string, unknown>): Promise<unknown> => {
      writeFileSync(path.join(expectedDir, "edit.json"), JSON.stringify(edit));
      try {
        await runParity({ reference: REF, expectedDir }, ROOT);
        return null;
      } catch (e) {
        return (e as { hbf?: { code: string; path?: string } }).hbf ?? e;
      }
    };
    expect(await run({ pointer: "/params/1/fields/0/item/3/default", from: 1.44, to: 2.15 })).toMatchObject({ code: "E_STALE", path: "/edit/from" });
    expect(await run({ pointer: "/params/2/fields/1/default", from: 1, to: 2 })).toMatchObject({ code: "E_REF", path: "/edit/pointer" });
  }, 120_000);
});

/**
 * The committed goldens (TESTING.md 5.1): each reference rebuilt now must
 * equal its expected/ folder file for file. SOURCE_DATE_EPOCH is set to a
 * value the goldens were not written at, so the test also proves parity
 * builds at the epoch build.json records and not at the caller's or the
 * HEAD commit's.
 */
describe("parity against the committed goldens", () => {
  const saved = process.env["SOURCE_DATE_EPOCH"];
  beforeAll(() => {
    process.env["SOURCE_DATE_EPOCH"] = "1791072000";
  });
  afterAll(() => {
    if (saved === undefined) delete process.env["SOURCE_DATE_EPOCH"];
    else process.env["SOURCE_DATE_EPOCH"] = saved;
  });

  for (const reference of [REF, "reference/exports/orca-3mf-roundtrip"]) {
    it(`${reference}: build, report, edit and artifacts goldens are equal`, async () => {
      const out = await runParity({ reference }, ROOT);
      expect(out.files.map((f) => [f.file, f.status, f.moved])).toEqual([
        ["build.json", "equal", []], ["report.json", "equal", []], ["edit.json", "equal", []], ["artifacts.json", "equal", []],
        ...(reference === REF ? [["expected/query-solve.json", "equal", []]] : []),
      ]);
      expect(out.ok).toBe(true);
    }, 300_000);
  }
});
