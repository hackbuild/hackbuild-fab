// M04-T03: severity and precondition checks through the CLI (D-067,
// CHECKS.md section 3). Fixtures and their independent sources:
// lug.glb, a corpus file whose node parts trimesh finds open
// (tools/corpus/import/MANIFEST.json: 25 of 26 open, computed); the keys
// flex-pair reference at /keys/0/gap 1.0, the failing build the gate test
// already uses, which fails CHK-KEY-01, a block check. Every failing
// fixture leaves a stored Part IR whose hbf:// uris resolve, so a person
// can render it. Severity and the precondition flag come from the seed
// file, never from this test.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { CheckResult, CommandResult, Hash, Severity } from "@hackbuild/spec";
import { seedRows, stamp } from "../src/checks.js";
import { importAudit } from "../src/commands/part-build.js";
import { exitOf } from "../src/errors.js";
import type { CoreCtx } from "../src/ctx.js";
import { countsOf, findingsOf, finish, worst } from "../src/result.js";
import { Store } from "../src/store.js";
import { renderResult } from "../src/text.js";
import { PROCESS_STREAMS } from "../src/tty-gate.js";
import { REF, ROOT, hbf, json } from "./hbf.js";

const LUG = "tools/corpus/import/lug.glb";
const PROMPT_TAIL = "this approval does not identify who approved.";
const seed = JSON.parse(readFileSync(path.join(ROOT, "packages/checks/seed/checks.seed.json"), "utf8")) as { checks: { id: string; severity: Severity; precondition?: boolean; needs: string[]; appliesTo: { level: string } }[] };
const manifest = JSON.parse(readFileSync(path.join(ROOT, "tools/corpus/import/MANIFEST.json"), "utf8")) as { files: { file: string; outcome: string }[] };

function ctx(): CoreCtx {
  return {
    workspace: ROOT, cwd: ROOT, branch: "", store: new Store(ROOT), transport: "cli",
    clientCaps: { elicitation: false, tasks: false }, signal: { aborted: false, throwIfAborted: () => undefined },
    inputsHash: "0".repeat(64) as Hash, gate: PROCESS_STREAMS, cli: {},
  };
}

type StoredPart = { bodies: { mesh: { uri: string } }[] };

/** The stored Part IR of a build resolves through explain: the build and its part. */
async function storedPart(build: string): Promise<StoredPart> {
  const b = await json("explain", build);
  expect(b.code, build).toBe(0);
  const partId = new Store(ROOT).build(build).part.id;
  const p = await json("explain", `${build}/part/${partId}`);
  expect(p.code).toBe(0);
  const part = (p.r as unknown as { value: { part: StoredPart } }).value.part;
  expect(part.bodies.length).toBeGreaterThan(0);
  return part;
}

/** Every body mesh of a stored part resolves, so a person can render it. */
async function meshesResolve(part: StoredPart): Promise<void> {
  for (const uri of part.bodies.map((b) => b.mesh.uri)) {
    const m = await json("explain", uri);
    expect(m.code, `${uri} ${JSON.stringify(m.r.errors)}`).toBe(0);
  }
}

describe("a non-manifold body (lug.glb)", () => {
  it("the corpus records lug.glb as open, CHK-PRT-01 failing", () => {
    expect(manifest.files.find((f) => f.file === "lug.glb")?.outcome).toMatch(/open.*CHK-PRT-01 fails/);
    expect(seed.checks.find((c) => c.id === "CHK-PRT-01")).toMatchObject({ severity: "block", precondition: true });
  });

  it("part.build exits 1 at stage check, one CHK-PRT-01 fail on the body, and the stored Part IR resolves", async () => {
    const { code, r } = await json("part.build", "--import", LUG);
    expect(code).toBe(1);
    expect([r.verdict, r.stage, r.errors]).toEqual(["fail", "check", []]);
    const fails = r.findings.filter((f) => f.verdict === "fail");
    expect(fails.map((f) => [f.id, f.severity, f.target])).toEqual([["CHK-PRT-01", "block", { level: "body", part: "lug", body: "lug" }]]);
    await storedPart(String(r.result?.["build"]));
  }, 120_000);

  it("read at its authored unit (mm), the stored lug meshes resolve, so a person can render the failing part", async () => {
    const a = await importAudit([{ path: LUG, format: "glb", units: "mm", as: "body" }], ctx());
    expect(a.results.find((r) => r.id === "CHK-PRT-01")?.verdict).toBe("fail");
    await meshesResolve(await storedPart(`hbf://build/${a.part.buildHash}`));
  }, 120_000);

  it("the solid checks skip with reason precondition CHK-PRT-01 failed; every other check reports its own reason", async () => {
    const { results } = await importAudit([{ path: LUG, format: "glb", as: "body" }], ctx());
    const reason = "precondition CHK-PRT-01 failed";
    const gated = results.filter((r) => r.constraint === reason);
    // CHK-PRT-03 sums per-body volumes against the solid: the volume check the import route runs.
    expect(gated.map((r) => [r.id, r.verdict])).toEqual([["CHK-PRT-03", "skip"]]);
    const rows = seedRows(seed);
    for (const r of gated) expect(rows.get(r.id)?.needs, r.id).toContain("mesh");
    // The rest keep their own outcome: CHK-PRT-01 ran, the others skip for a reason that is not the gate.
    for (const r of results.filter((x) => x.id !== "CHK-PRT-01" && x.constraint !== reason)) expect(r.constraint, r.id).not.toMatch(/^precondition /);
    console.log(`lug.glb part.build results (computed): ${results.map((r) => `${r.id} ${r.verdict}`).join(", ")}`);
  }, 120_000);

  it("the text mirror prints the finding under FAIL", async () => {
    const { code, out } = await hbf(["part.build", "--import", LUG]);
    expect(code).toBe(1);
    expect(out).toMatch(/^FAIL CHK-PRT-01 lug on part lug$/m);
  }, 120_000);
});

describe("a fixture failing only a block check (flex-pair, /keys/0/gap 1.0)", () => {
  const params = '{"/keys/0/gap": 1.0}';

  it("part.build exits 1 at stage check with the IR stored; every fail is a block check", async () => {
    const { code, r } = await json("part.build", REF, "--params", params);
    expect(code).toBe(1);
    expect([r.verdict, r.stage]).toEqual(["fail", "check"]);
    const fails = r.findings.filter((f) => f.verdict === "fail");
    expect(fails.map((f) => f.id)).toEqual(["CHK-KEY-01"]);
    for (const f of fails) expect(seed.checks.find((c) => c.id === f.id)?.severity).toBe("block");
    await meshesResolve(await storedPart(String(r.result?.["build"])));
  }, 120_000);

  it("export.run exits 1 with the findings and the prompt text never appears", async () => {
    const { code, out } = await hbf(["export.run", REF, "--kind", "3mf", "--machine", "ffc5p", "--params", params, "--json"]);
    expect(code).toBe(1);
    const r = JSON.parse(out) as CommandResult<{ artifacts: unknown[] }>;
    expect([r.verdict, r.stage, r.errors, r.artifacts]).toEqual(["fail", "check", [], []]);
    expect(r.findings.some((f) => f.id === "CHK-KEY-01" && f.verdict === "fail")).toBe(true);
    expect(out).not.toContain(PROMPT_TAIL);
  }, 120_000);
});

describe("severity decides the exit of a fail", () => {
  // Core stamps through the seed row, so the severity is the row's. Seed rows of each severity:
  const rows = seedRows(seed);
  const blockRow = rows.get("CHK-PRT-04")!;
  const warnRow = rows.get("CHK-PRT-05")!;
  const fail = (row: typeof blockRow): CheckResult => stamp(row, {
    verdict: "fail", target: { level: "part", part: "p" }, constraint: "c", measured: 10, legal: { kind: "multipleOf", base: 0.24, offset: 0.25, unit: "mm", nearest: [9.85, 10.09] },
  });
  const result = (rs: CheckResult[]) => finish({ verdict: worst(rs), stage: "done", inputsHash: "0".repeat(64) as Hash, findings: findingsOf(rs), counts: countsOf(rs), errors: [], artifacts: [], next: [] });

  it("a warn check's fail is verdict warn, exit 0, printed WARN; a block check's fail is exit 1, printed FAIL", () => {
    expect([blockRow.severity, warnRow.severity]).toEqual(["block", "warn"]);
    const w = result([fail(warnRow)]);
    expect([w.verdict, w.ok, exitOf(w)]).toEqual(["warn", true, 0]);
    expect(renderResult("part.build", "d", w)).toMatch(/^WARN CHK-PRT-05 p$/m);
    const b = result([fail(blockRow)]);
    expect([b.verdict, b.ok, exitOf(b)]).toEqual(["fail", false, 1]);
    expect(renderResult("part.build", "d", b)).toMatch(/^FAIL CHK-PRT-04 p$/m);
  });

  it("the mirror prints FAIL, then WARN, then NOTE, whatever order the checks ran in", () => {
    const note = { ...fail(warnRow), id: "CHK-PRT-12" as CheckResult["id"], severity: "note" as const, verdict: "warn" as const };
    const r = result([note, fail(warnRow), fail(blockRow)]);
    const lines = renderResult("part.build", "d", r).split("\n").filter((l) => /^(FAIL|WARN|NOTE) CHK/.test(l)).map((l) => l.split(" ").slice(0, 2).join(" "));
    expect(lines).toEqual(["FAIL CHK-PRT-04", "WARN CHK-PRT-05", "NOTE CHK-PRT-12"]);
  });
});
