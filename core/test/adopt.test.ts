// hbf adopt (plan v9 3.1, R1-engine-25) through the CLI. Every adopt runs in
// a throwaway git repository under .hbf/ (gitignored), inside the workspace
// so the build sandbox resolves, never in the checkout the test runs in,
// and bakes to a throwaway --out root. The draft is the committed fixture
// core/test/fixtures/draft/access-switch.html, cut from the page hbf draft
// baked; the variants below edit a copy of its block. The golden's geometry
// is checked against the 3MF of reference/keys/click-spring-window built
// here at its committed defaults, independent of adopt. No test runs
// export.run (the export gate is a person's); a blocking fail is shown by
// the check counts export.run reads before its gate.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { readChaseSource } from "@hackbuild/chase";
import { draft3mf } from "@hackbuild/pipeline";
import { DRAFT_BLOCK_FILE, DRAFT_BLOCK_TYPE, type CommandResult, type DraftBlock } from "@hackbuild/spec";
import { blockOfPage, draftExportDrift, geometryHashOf } from "../src/commands/adopt.js";
import { buildPart, loadDesign, resolveParams } from "../src/commands/build.js";
import { isDraftDir } from "../src/draft-block.js";
import { main } from "../src/main.js";
import { ROOT } from "./hbf.js";

const FIXTURE = path.join(ROOT, "core/test/fixtures/draft/access-switch.html");
const CLICK = "reference/keys/click-spring-window";

const made: string[] = [];
afterAll(() => {
  for (const d of made) rmSync(d, { recursive: true, force: true });
});

const git = (cwd: string, ...args: string[]): string => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
const shasum = (file: string): string => execFileSync("shasum", ["-a", "256", file], { encoding: "utf8" }).split(" ")[0]!;

function scratch(prefix: string): string {
  mkdirSync(path.join(ROOT, ".hbf"), { recursive: true });
  const d = mkdtempSync(path.join(ROOT, ".hbf", prefix));
  made.push(d);
  return d;
}

/** An empty git repository with one commit on main. */
function repo(): string {
  const top = scratch("adopt-test-");
  git(top, "init", "-q", "-b", "main");
  git(top, "-c", "user.name=test", "-c", "user.email=test@example.invalid", "-c", "core.hooksPath=/dev/null", "commit", "-q", "--allow-empty", "-m", "init");
  return top;
}

type Adopted = {
  design: string; branch: string; files: string[]; defHash: string; buildHash: string;
  checks: { pass: number; warn: number; fail: number; skip: number };
  page: { file: string; bytes: number; hash: string };
  golden: { file: string; sha256: string; source: string; geometryHash: string; adoptedGeometryHash: string; diff: string[] };
  slice: { status: string; reason: string }; widget: string | null;
};

async function adopt(cwd: string, ...argv: string[]): Promise<{ code: number; r: CommandResult<Adopted> }> {
  let out = "";
  const code = await main(["adopt", ...argv, "--json"], cwd, { out: (s) => { out += `${s}\n`; }, err: (s) => { out += `${s}\n`; } });
  return { code, r: JSON.parse(out) as CommandResult<Adopted> };
}

const fixtureHtml = readFileSync(FIXTURE, "utf8");
const fixtureBlock = blockOfPage(fixtureHtml, "fixture");

/** A copy of the fixture page whose block is edited by `edit`. */
function variant(edit: (b: DraftBlock) => DraftBlock): string {
  const open = `<script type="${DRAFT_BLOCK_TYPE}">`;
  const at = fixtureHtml.indexOf(open) + open.length;
  const end = fixtureHtml.indexOf("</script>", at);
  const file = path.join(scratch("adopt-page-"), "draft.html");
  writeFileSync(file, `${fixtureHtml.slice(0, at)}${JSON.stringify(edit(fixtureBlock))}${fixtureHtml.slice(end)}`);
  return file;
}

describe("hbf adopt (R1-engine-25)", () => {
  const here = git(ROOT, "rev-parse", "HEAD");

  it("adopts the fixture draft page into a design that validates with 0 errors, builds and bakes without the banner", async () => {
    const top = repo();
    const out = scratch("adopt-out-");
    const { code, r } = await adopt(top, FIXTURE, "--out", out);
    expect(code, JSON.stringify(r.errors)).toBe(0);
    const res = r.result!;
    expect(res.design).toBe("designs/access-switch");
    expect(res.branch).toBe("hbf/access-switch");
    expect(git(top, "symbolic-ref", "--short", "HEAD")).toBe("hbf/access-switch");
    expect(git(top, "rev-list", "--count", "HEAD"), "adopt never commits").toBe("1");
    expect(git(top, "diff", "--cached", "--name-only").split("\n").sort()).toEqual(res.files);
    for (const f of ["chase.ts", "build.ts", "bench.ts", "expected/draft-export.3mf", "expected/draft-export.json", "test/draft-export.test.ts"]) {
      expect(res.files).toContain(`designs/access-switch/${f}`);
    }
    const dir = path.join(top, res.design);
    expect(isDraftDir(dir)).toBe(false);
    expect(existsSync(path.join(dir, DRAFT_BLOCK_FILE))).toBe(false);
    const chaseText = readFileSync(path.join(dir, "chase.ts"), "utf8");
    expect(readChaseSource(chaseText, "chase.ts").chase.meta.id).toBe("access-switch");

    const v = await main(["chase.validate", "designs/access-switch", "--json"], top, { out: () => {}, err: () => {} });
    expect(v, "chase.validate exit").toBe(0);
    expect(res.buildHash).toMatch(/^[0-9a-f]{64}$/);
    expect(res.checks.fail).toBe(0);

    const page = path.isAbsolute(res.page.file) ? res.page.file : path.join(ROOT, res.page.file);
    expect(page.startsWith(out)).toBe(true);
    expect(res.page.bytes, "bytes measured on disk").toBe(statSync(page).size);
    expect(res.page.hash).toBe(shasum(page));
    const html = readFileSync(page, "utf8");
    // The draft block is a script element; the bench-core IIFE names the type as a string.
    expect(html).not.toContain(`<script type="${DRAFT_BLOCK_TYPE}">`);
    expect(readFileSync(path.join(dir, "page-build.ts"), "utf8")).not.toContain("draft: true");

    const golden = path.join(top, res.golden.file);
    expect(res.golden.source).toBe("computed");
    expect(res.golden.sha256).toBe(shasum(golden));
    expect(res.golden.diff).toEqual([]);
    expect(res.golden.adoptedGeometryHash).toBe(res.golden.geometryHash);
    // Independent of adopt: the reference the draft came from, built here at its committed defaults.
    const ref = await loadDesign(CLICK, ROOT);
    const refPkg = await draft3mf(await buildPart(ref, resolveParams(ref.chase, undefined, undefined)), "click-spring-window");
    expect(res.golden.geometryHash).toBe(await geometryHashOf(refPkg.bytes));
    expect(JSON.parse(readFileSync(path.join(dir, "expected/draft-export.json"), "utf8"))).toMatchObject({ sha256: res.golden.sha256, draftDefHash: fixtureBlock.defHash });
    expect((await draftExportDrift(dir, top)).diff).toEqual([]);

    expect(res.slice.status).toBe("not run");
    expect(res.widget).toBeNull();
    expect(git(ROOT, "rev-parse", "HEAD")).toBe(here);
  }, 300_000);

  it("adopts a draft whose build fails a blocking check, with the page state patched in; its checks still block", async () => {
    const top = repo();
    const page = variant((b) => ({
      ...b,
      chase: b.chase.replace("range: [12, 36], step: 0.5, default: 24", "range: [12, 300], step: 0.5, default: 24"),
      state: { ...b.state, l: 280 },
      widget: 'export const widget = { id: "span", model: (s: { l: number }) => ({ span: s.l }), render: (el: HTMLElement, m: { span: number }) => { el.textContent = `span ${m.span} mm`; } };\n',
    }));
    const { code, r } = await adopt(top, page, "--name", "wide-switch", "--out", scratch("adopt-out-"));
    expect(r.errors).toEqual([]);
    expect(code).toBe(1);
    const res = r.result!;
    expect(res.checks.fail).toBeGreaterThan(0);
    expect(r.findings.filter((f) => f.verdict === "fail").map((f) => f.id)).toContain("CHK-PRT-16");
    const dir = path.join(top, res.design);
    const chase = readChaseSource(readFileSync(path.join(dir, "chase.ts"), "utf8"), "chase.ts").chase;
    expect(chase.params[0]!.fields.find((f) => f.id === "l")).toMatchObject({ default: 280 });
    expect(isDraftDir(dir)).toBe(false);
    expect(res.golden.diff).toEqual([]);
    expect(res.widget).toBe("designs/wide-switch/widgets/widget.ts");
    expect(res.files).toContain("designs/wide-switch/widgets/widget.ts");
    expect(res.slice).toMatchObject({ status: "not run" });
  }, 300_000);

  it("refuses a draft with an unknown check id at chase.validate, writing nothing", async () => {
    const top = repo();
    const page = variant((b) => ({ ...b, chase: b.chase.replace("  exports: [", '  expect: [{ check: "CHK-NOPE-99", target: "part", verdict: "warn" }],\n  exports: [') }));
    const { code, r } = await adopt(top, page, "--name", "bad-check");
    expect(code).toBe(2);
    expect(r.errors.length).toBeGreaterThan(0);
    expect(JSON.stringify(r.errors)).toContain("CHK-NOPE-99");
    expect(existsSync(path.join(top, "designs"))).toBe(false);
    expect(git(top, "branch", "--list", "hbf/*")).toBe("");
  }, 120_000);

  it("refuses a page without the draft block as not an hbf draft", async () => {
    const top = repo();
    const file = path.join(scratch("adopt-page-"), "bench.html");
    writeFileSync(file, "<!doctype html><html><head><title>bench</title></head><body></body></html>\n");
    const { code, r } = await adopt(top, file);
    expect(code).toBe(2);
    expect(r.errors[0]).toMatchObject({ code: "E_SCHEMA", path: "/draft" });
    expect(r.errors[0]!.expected).toContain("not an hbf draft");
    expect(existsSync(path.join(top, "designs"))).toBe(false);
  }, 60_000);
});
