// hbf draft (plan v9 3.1, R1-engine-24). The CLI writes a draft of the
// click spring window into --dir .hbf/drafts/ (gitignored) and bakes its
// DRAFT page; the page's bytes and sha256 are read back from disk and checked
// against shasum, the sources it embeds against the files beside it.
// export.run and a page bake refuse the draft with E_DRAFT. The DRAFT marks
// are checked on the real writer output of the reference build: the 3mf
// model carries hbf:draft = 1 with its prefix declared and still passes the
// package checks, the card opens with the draft line, a fail shows as a
// warning with the draft waiver. Without --from the goal picks the
// reference (R1-score-03): the routed drafts run from a cwd outside the
// repository and land there, as hbf init places a folder, and a goal no
// reference holds exits non-zero with the closest rows and writes nothing.

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import JSZip from "jszip";
import { afterAll, describe, expect, it } from "vitest";
import { build as build3mf } from "@hackbuild/3mf";
import { draft3mf, draftCard, draftResults, threeMfConfig } from "@hackbuild/pipeline";
import {
  DRAFT_BLOCK_TYPE, DRAFT_CARD_LINE, DRAFT_META_KEY, DRAFT_META_NS, DRAFT_WAIVER, draftName, type CheckResult, type DraftBlock,
} from "@hackbuild/spec";
import { buildPart, loadDesign, resolveParams } from "../src/commands/build.js";
import { runAllChecks, packageCheckIds } from "../src/commands/check-run.js";
import { goalMatch, nameOfGoal } from "../src/commands/draft.js";
import { main } from "../src/main.js";
import { json, ROOT } from "./hbf.js";

const CLICK = "reference/keys/click-spring-window";
/** A name no other test or person uses, so the run never meets a draft it did not write. */
const NAME = `draft-test-${process.pid}`;
const REL = `.hbf/drafts/${NAME}`;
const DIR = path.join(ROOT, ".hbf", "drafts", NAME);
/** A cwd outside the repository, as a maker runs hbf draft from their own folder. */
const OUT = mkdtempSync(path.join(os.tmpdir(), "hbf-draft-"));

afterAll(() => {
  rmSync(DIR, { recursive: true, force: true });
  rmSync(OUT, { recursive: true, force: true });
});

/** The CLI in process from cwd, --json. */
async function jsonAt(cwd: string, ...argv: string[]): Promise<{ code: number; r: { errors: { code: string; path?: string; didYouMean?: string[]; hint: string }[]; result?: Record<string, unknown> } }> {
  let out = "";
  const code = await main([...argv, "--json"], cwd, { out: (x) => { out += `${x}\n`; }, err: (x) => { out += `${x}\n`; } });
  return { code, r: JSON.parse(out) };
}

const shasum = (file: string): string => execFileSync("shasum", ["-a", "256", file], { encoding: "utf8" }).split(" ")[0]!;

type Drafted = { dir: string; files: string[]; page: { file: string; bytes: number; hash: string } };

describe("hbf draft (R1-engine-24)", () => {
  it("names a draft from its goal", () => {
    expect(nameOfGoal("access switch")).toBe("access-switch");
    expect(nameOfGoal("A  Coin, with art.")).toBe("a-coin-with-art");
  });

  it("drafts the click spring window into one offline page under 16 MB carrying its sources", async () => {
    rmSync(DIR, { recursive: true, force: true });
    const t0 = performance.now();
    const { code, r } = await json("draft", "access switch", "--from", "click-spring-window", "--name", NAME, "--dir", REL);
    const ms = performance.now() - t0;
    expect(code, JSON.stringify(r.errors)).toBe(0);
    const res = r.result as unknown as Drafted;
    expect(res.dir).toBe(DIR.split(path.sep).join("/"));
    for (const f of ["chase.ts", "build.ts", "bench.ts", "draft.json", "bake.json", "bench.entry.ts", "page-build.ts", `${NAME}.html`]) expect(res.files).toContain(f);

    const file = res.page.file;
    expect(file).toBe(path.join(DIR, `${NAME}.html`));
    expect(res.page.bytes, "bytes measured on disk").toBe(statSync(file).size);
    expect(res.page.bytes).toBeLessThanOrEqual(16_777_216);
    expect(res.page.hash).toBe(shasum(file));
    // Turn one target 60 s on this machine (brief risk); the measured time is printed for the record.
    console.log(`hbf draft: ${Math.round(ms)} ms wall (measured, in process), page ${res.page.bytes} bytes (measured)`);
    expect(ms).toBeLessThan(60_000);

    const html = readFileSync(file, "utf8");
    const m = new RegExp(`<script type="${DRAFT_BLOCK_TYPE.replace("+", "\\+")}">(.*?)</script>`).exec(html);
    expect(m, "draft block in the page").not.toBeNull();
    const block = JSON.parse(m![1]!) as DraftBlock;
    expect(block.goal).toBe("access switch");
    expect(block.from).toBe("reference:click-spring-window");
    expect(block.chase).toBe(readFileSync(path.join(DIR, "chase.ts"), "utf8"));
    expect(block.build).toBe(readFileSync(path.join(DIR, "build.ts"), "utf8"));
    expect(block.widget).toBeNull();
    expect(block.chase).toContain(`id: "${NAME}"`);
    const design = await loadDesign(DIR, ROOT);
    expect(block.defHash).toBe(design.defHash);
    expect(block.kernelVersion).toBe(design.ws.versions.kernel);
    expect(block.state).toMatchObject({ l: 24, t: 0.55, Q: 2 });
    expect(readFileSync(path.join(DIR, "page-build.ts"), "utf8")).toContain("draft: true");
  }, 240_000);

  it("export.run on the draft exits 2 with E_DRAFT naming hbf adopt, before any build or gate", async () => {
    const { code, r } = await json("export.run", DIR, "--kind", "3mf", "--dry-run");
    expect(code).toBe(2);
    expect(r.errors[0]).toMatchObject({ code: "E_DRAFT", path: "/chase" });
    expect(r.errors[0]!.hint).toContain("hbf adopt");
    expect(existsSync(path.join(DIR, "out"))).toBe(false);
  }, 60_000);

  it("a page bake of the draft refuses with E_DRAFT; a second draft into the same folder refuses with E_EXISTS", async () => {
    const bake = await json("chase.bake", DIR);
    expect(bake.code).toBe(2);
    expect(bake.r.errors[0]).toMatchObject({ code: "E_DRAFT", path: "/chase" });
    const again = await json("draft", "access switch", "--from", "click-spring-window", "--name", NAME, "--dir", REL);
    expect(again.code).toBe(2);
    expect(again.r.errors[0]).toMatchObject({ code: "E_EXISTS", path: "/dir", got: DIR.split(path.sep).join("/") });
  }, 60_000);

  it("a widget.ts added later rides in the block and the entry on the next draft bake", async () => {
    const widget = 'export const widget = { id: "span", model: (s: { l: number }) => ({ span: s.l }), render: (el: HTMLElement, m: { span: number }) => { el.textContent = `span ${m.span} mm`; } };\n';
    writeFileSync(path.join(DIR, "widget.ts"), widget);
    const { code, r } = await json("chase.bake", DIR, "--mode", "draft");
    expect(code, JSON.stringify(r.errors)).toBe(0);
    expect((JSON.parse(readFileSync(path.join(DIR, "draft.json"), "utf8")) as DraftBlock).widget).toBe(widget);
    expect(readFileSync(path.join(DIR, "bench.entry.ts"), "utf8")).toContain('import { widget } from "./widget";');
  }, 240_000);
});

describe("hbf draft reads the goal (R1-score-03)", () => {
  it("routes a goal to the reference whose readme holds its words, and refuses one no reference holds", () => {
    expect(goalMatch("two-key pad I can read on a Pico", ROOT)).toMatchObject({ from: "reference:keys/flex-pair", words: expect.arrayContaining(["pad", "pico"]) });
    expect(goalMatch("big round switch on a 3.5 mm jack", ROOT)).toMatchObject({ from: "reference:keys/access-switch", words: expect.arrayContaining(["round", "jack"]) });
    expect(() => goalMatch("a teapot", ROOT)).toThrow(/no reference matches the goal/);
  });

  for (const [goal, ref] of [["two-key pad I can read on a Pico", "keys/flex-pair"], ["big round switch on a 3.5 mm jack", "keys/access-switch"]] as const) {
    it(`drafts "${goal}" from ${ref} into the cwd outside the repository, naming the match`, async () => {
      const { code, r } = await jsonAt(OUT, "draft", goal);
      expect(code, JSON.stringify(r.errors)).toBe(0);
      const res = r.result as unknown as Drafted & { match: { from: string; score: number; words: string[] } };
      const dir = path.join(OUT, nameOfGoal(goal));
      expect(res.dir).toBe(dir.split(path.sep).join("/"));
      expect(res.match.from).toBe(`reference:${ref}`);
      expect(res.match.score).toBeGreaterThanOrEqual(0.5);
      expect(res.files).toContain("package.json");
      expect(res.page.hash).toBe(shasum(res.page.file));
      expect((JSON.parse(readFileSync(path.join(dir, "draft.json"), "utf8")) as DraftBlock).from).toBe(`reference:${ref}`);
      expect(readFileSync(path.join(dir, "chase.ts"), "utf8")).toContain(`id: "${nameOfGoal(goal)}"`);
      const again = await jsonAt(OUT, "draft", goal);
      expect(again.code).toBe(2);
      expect(again.r.errors[0]).toMatchObject({ code: "E_EXISTS", path: "/name", got: res.dir });
    }, 240_000);
  }

  it("a goal no reference holds exits non-zero with E_REF naming the closest rows and writes nothing", async () => {
    const before = readdirSync(OUT).sort();
    const { code, r } = await jsonAt(OUT, "draft", "a teapot");
    expect(code).toBe(2);
    expect(r.errors[0]).toMatchObject({ code: "E_REF", path: "/goal" });
    expect(r.errors[0]!.didYouMean).toHaveLength(3);
    for (const row of r.errors[0]!.didYouMean!) expect(r.errors[0]!.hint).toContain(row.slice("reference:".length));
    expect(readdirSync(OUT).sort()).toEqual(before);
  }, 60_000);
});

describe("DRAFT marks on the reference build's real writer output", () => {
  it("the draft 3mf model carries hbf:draft = 1 with its prefix declared, and the package checks still pass", async () => {
    const design = await loadDesign(CLICK, ROOT);
    const built = await buildPart(design, resolveParams(design.chase, {}, undefined));
    const pkg = await draft3mf(built, "click-spring-window");
    expect(pkg.name).toBe("click-spring-window.3mf");
    const model = await (await JSZip.loadAsync(pkg.bytes)).file("3D/3dmodel.model")!.async("string");
    expect(model).toContain(`<metadata name="${DRAFT_META_KEY}">1</metadata>`);
    expect(model).toContain(`xmlns:hbf="${DRAFT_META_NS}"`);
    const checked = await runAllChecks(built, [{ exporter: "3mf", name: pkg.name, bytes: pkg.bytes, part: built.part }], packageCheckIds(built));
    expect(checked.results.length).toBeGreaterThan(0);
    expect(checked.results.filter((x) => x.verdict === "fail").map((x) => x.id)).toEqual([]);

    const card = build3mf(threeMfConfig(built, "click-spring-window"));
    if (!card.ok) throw new Error("writer refused the reference build");
    expect(draftCard(card.card()).split("\n")[0]).toBe(DRAFT_CARD_LINE);
    expect(draftName("click-spring-window.3mf")).toBe("DRAFT_click-spring-window.3mf");
    expect(draftName("DRAFT_x.3mf")).toBe("DRAFT_x.3mf");
  }, 120_000);

  it("a fail shows as a warning carrying the draft waiver; a pass and a waived fail stand", () => {
    const base = { version: "1.0.0", severity: "error", target: { kind: "part" }, constraint: "c", origin: "hbf://check/CHK-X-01", measured: { value: 1, unit: "mm" }, legal: { kind: "min", min: 2, unit: "mm" } };
    const fail = { ...base, id: "CHK-X-01", verdict: "fail" } as unknown as CheckResult;
    const pass = { ...base, id: "CHK-X-02", verdict: "pass" } as unknown as CheckResult;
    const waived = { ...base, id: "CHK-X-03", verdict: "warn", waived: { reason: "chase waiver" } } as unknown as CheckResult;
    const [a, b, c] = draftResults([fail, pass, waived]);
    expect(a).toMatchObject({ verdict: "warn", waived: { reason: DRAFT_WAIVER }, measured: { value: 1 } });
    expect(b).toBe(pass);
    expect(c).toBe(waived);
  });
});
