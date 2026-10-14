// M04-T13: rules.audit runs every registered project, source and artifact
// check over the workspace. The expectations come from outside the command:
// the check levels from the seed rows, the skip milestone of CHK-MOT-03
// from the card (M07), the planted line and its origin from the card
// acceptance (OGEE R15), the artifact bytes from the in-process 3MF writer
// at SOURCE_DATE_EPOCH 315532800 and a known-bad corpus package. Every run
// uses a store in a temp directory holding a fresh export of the current
// flex pair build: the workspace cache keeps every export a test or a person
// ever made, and CHK-ART-02 rightly fails the ones an edit has outdated, so
// an audit over it would test the cache's history, not the workspace.

import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { CheckResult, Hash } from "@hackbuild/spec";
import { buildPart, export3mf, loadDesign, resolveParams } from "../src/commands/build.js";
import { AUDIT_LEVELS, auditSources, gitFiles, runRulesAudit, sourceSkip, type AuditOut } from "../src/commands/rules-audit.js";
import { exitOf } from "../src/errors.js";
import { finish } from "../src/result.js";
import type { CoreCtx } from "../src/registry.js";
import { Store } from "../src/store.js";
import { ROOT, REF } from "./hbf.js";

const EPOCH = 315532800;
const PLANT = "core/test/fixtures/rules-audit-planted";
const PLANTED_LINE = "DRIVE_X = 126; // drive lugs DRIVE_Y = 126;";
const FIXED_LINES = "DRIVE_X = 126; // drive lugs\nDRIVE_Y = 126;";
const seed = JSON.parse(readFileSync(path.join(ROOT, "packages", "checks", "seed", "checks.seed.json"), "utf8")) as { checks?: { id: string; appliesTo: { level: string } }[] };
const rows = (seed.checks ?? (seed as unknown as { id: string; appliesTo: { level: string } }[]));

function ctxFor(store: Store): CoreCtx {
  return {
    workspace: ROOT, cwd: ROOT, branch: "", store, transport: "cli",
    clientCaps: { elicitation: false, tasks: false },
    signal: { aborted: false, throwIfAborted: () => undefined },
    inputsHash: "0".repeat(64) as Hash, gate: { isTTY: false } as never, cli: {},
  } as unknown as CoreCtx;
}

const resultsOf = (r: { result?: unknown }): readonly CheckResult[] => (r.result as AuditOut).results;

/** A temp store holding one export of the current flex pair build, as a person's fresh export would. */
async function freshStore(): Promise<{ readonly dir: string; readonly store: Store }> {
  const dir = mkdtempSync(path.join(os.tmpdir(), "hbf-rules-audit-"));
  const store = new Store(dir);
  const design = await loadDesign(REF, ROOT);
  const built = await buildPart(design, resolveParams(design.chase, undefined, undefined), { epoch: EPOCH });
  await store.put("artifact", (await export3mf(built)).bytes);
  return { dir, store };
}

/** rules.audit as the CLI finishes it, with the exit code main would return. */
async function audit(store: Store, input: { chase?: string } = {}): Promise<{ code: number; r: ReturnType<typeof finish<AuditOut>> }> {
  const r = finish(await runRulesAudit(input, ctxFor(store)));
  return { code: exitOf(r), r };
}

describe("rules.audit sources (M04-T13 step 1)", () => {
  it("reads the files git lists, leaving out legacy trees and check fixtures", async () => {
    const files = gitFiles(ROOT);
    const legacy = files.filter((f) => /^designs\/[^/]+\/legacy\//.test(f));
    const fixtures = files.filter((f) => f.startsWith("packages/checks/test/fixtures/"));
    expect(legacy.length).toBeGreaterThan(0);
    expect(fixtures.length).toBeGreaterThan(0);
    for (const f of [...legacy, ...fixtures]) expect(sourceSkip(f), f).not.toBeNull();
    const sources = (await auditSources(ROOT, files)).map((s) => s.path);
    expect(sources).toContain("RULES.md");
    expect(sources).toContain("core/src/commands/rules-audit.ts");
    expect(sources.filter((p) => legacy.includes(p) || fixtures.includes(p))).toEqual([]);
  });

  it("narrows sources to the directories it is given", async () => {
    const sources = await auditSources(ROOT, gitFiles(ROOT), [REF]);
    expect(sources.length).toBeGreaterThan(0);
    expect(sources.every((s) => s.path.startsWith(`${REF}/`))).toBe(true);
    expect(sources.map((s) => s.path)).toContain(`${REF}/chase.ts`);
  });
});

describe("rules.audit over the workspace (M04-T13 steps 1, 2, 4)", () => {
  let all: Awaited<ReturnType<typeof audit>>;
  let tmp: string;
  beforeAll(async () => {
    const fresh = await freshStore();
    tmp = fresh.dir;
    all = await audit(fresh.store);
    expect((all.r.result as AuditOut).audited.artifacts).toBe(1);
  }, 180_000);
  afterAll(() => rmSync(tmp, { recursive: true, force: true }));

  it("runs exactly the seeded project, source and artifact checks, each with a result", () => {
    const want = rows.filter((r) => (AUDIT_LEVELS as readonly string[]).includes(r.appliesTo.level)).map((r) => r.id).sort();
    expect(want.length).toBeGreaterThan(0);
    const got = [...new Set(resultsOf(all.r).map((r) => r.id as string))].sort();
    expect(got).toEqual(want);
    expect(got).toEqual(expect.arrayContaining(["CHK-LNT-01", "CHK-LNT-02", "CHK-LNT-03", "CHK-LNT-04", "CHK-FIT-04", "CHK-SHT-04"]));
  });

  it("CHK-MOT-03 is one skip naming M07 until the motion kernel registers", () => {
    const mot = resultsOf(all.r).filter((r) => r.id === "CHK-MOT-03");
    expect(mot).toHaveLength(1);
    expect(mot[0]!.verdict).toBe("skip");
    expect(mot[0]!.constraint).toMatch(/\bM07\b/);
  });

  it("every source result names a git listed file outside the skips, and the exit follows the block fails", () => {
    const listed = new Set(gitFiles(ROOT));
    for (const r of resultsOf(all.r).filter((x) => x.target.level === "source")) {
      const p = (r.target as { path: string }).path;
      expect(listed.has(p), p).toBe(true);
      expect(sourceSkip(p), p).toBeNull();
    }
    const blockFails = resultsOf(all.r).filter((r) => r.verdict === "fail" && r.severity === "block").length;
    expect(all.code).toBe(blockFails > 0 ? 1 : 0);
    expect(all.r.counts.fail).toBe(blockFails);
  });

  it("the workspace holds no block fail and exits 0 (acceptance 1)", () => {
    const fails = resultsOf(all.r).filter((r) => r.verdict === "fail" && r.severity === "block")
      .map((r) => `${r.id} ${(r.target as { path?: string }).path ?? r.target.level}`);
    expect(fails).toEqual([]);
    expect(all.code).toBe(0);
  });

  it("prose records skip the code rules and still run the voice rules", () => {
    const on = (p: string): Record<string, string> =>
      Object.fromEntries(resultsOf(all.r).filter((r) => (r.target as { path?: string }).path === p).map((r) => [r.id, r.verdict]));
    expect(on("RULES.md")).toMatchObject({ "CHK-LNT-01": "pass", "CHK-LNT-02": "pass", "CHK-LNT-03": "skip", "CHK-LNT-04": "skip", "CHK-FIT-04": "skip", "CHK-SHT-04": "skip" });
    expect(on("core/src/commands/rules-audit.ts")).toMatchObject({ "CHK-LNT-03": "pass", "CHK-LNT-04": "pass", "CHK-FIT-04": "pass", "CHK-SHT-04": "pass" });
  });
});

describe("rules.audit on a planted line (M04-T13 acceptance 2)", () => {
  const dir = path.join(ROOT, PLANT);
  let tmp: string;
  let store: Store;
  beforeAll(async () => {
    mkdirSync(dir, { recursive: true });
    cpSync(path.join(ROOT, REF, "chase.ts"), path.join(dir, "chase.ts"));
    ({ dir: tmp, store } = await freshStore());
  }, 180_000);
  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
    rmSync(tmp, { recursive: true, force: true });
  });

  it("DRIVE_Y hidden behind a comment fails CHK-LNT-04 and exits 1; the same values on two lines exit 0", async () => {
    writeFileSync(path.join(dir, "drive.scad"), `${PLANTED_LINE}\n`);
    const bad = await audit(store, { chase: PLANT });
    expect(bad.code).toBe(1);
    const hit = bad.r.findings.filter((f) => f.id === "CHK-LNT-04");
    expect(hit).toHaveLength(1);
    expect(hit[0]!.target).toEqual({ level: "source", path: `${PLANT}/drive.scad` });
    expect(hit[0]!.origin).toBe("hbf://check/CHK-LNT-04");
    expect(hit[0]!.extra).toMatchObject({ lines: 1, firstLine: 1 });
    expect(hit[0]!.constraint).toMatch(/OGEE R15/);
    expect((bad.r.result as unknown as AuditOut).audited.sources).toBe(2);

    writeFileSync(path.join(dir, "drive.scad"), `${FIXED_LINES}\n`);
    const good = await audit(store, { chase: PLANT });
    expect(good.r.findings).toEqual([]);
    expect(good.code).toBe(0);
  }, 120_000);
});

describe("rules.audit on stored artifacts (M04-T13 acceptance 1, CHK-3MF-*)", () => {
  let tmp: string;
  let store: Store;
  beforeAll(() => {
    tmp = mkdtempSync(path.join(os.tmpdir(), "hbf-rules-audit-"));
    store = new Store(tmp);
  });
  afterAll(() => rmSync(tmp, { recursive: true, force: true }));

  it("the flex pair 3MF written in process passes every artifact check that runs; a known-bad package fails CHK-3MF-07", async () => {
    const design = await loadDesign(REF, ROOT);
    const built = await buildPart(design, resolveParams(design.chase, undefined, undefined), { epoch: EPOCH });
    const good = await store.put("artifact", (await export3mf(built)).bytes);
    const bad = await store.put("artifact", new Uint8Array(readFileSync(path.join(ROOT, "tools", "corpus", "3mf", "known-bad", "overhang-numeric.3mf"))));

    const r = await runRulesAudit({}, ctxFor(store));
    const out = r.result!;
    expect(out.audited.artifacts).toBe(2);
    const artifactIds = rows.filter((x) => x.appliesTo.level === "artifact").map((x) => x.id);
    const on = (uri: string): CheckResult[] => out.results.filter((x) => x.target.level === "artifact" && (x.target as { artifact: string }).artifact === uri);
    const ran = on(good).filter((x) => x.verdict !== "skip");
    expect(ran.map((x) => x.id).sort()).toEqual(expect.arrayContaining(["CHK-3MF-01", "CHK-3MF-02", "CHK-3MF-03", "CHK-3MF-06", "CHK-3MF-07"]));
    expect(ran.every((x) => artifactIds.includes(x.id))).toBe(true);
    expect(ran.filter((x) => x.verdict !== "pass")).toEqual([]);
    expect(on(bad).filter((x) => x.verdict === "fail").map((x) => x.id)).toContain("CHK-3MF-07");

    const narrowed = await runRulesAudit({ chase: REF }, ctxFor(store));
    expect(narrowed.result!.audited.artifacts).toBe(1);
  }, 180_000);
});
