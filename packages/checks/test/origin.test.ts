// M04-T02 origin records and check pages. Expected values come from
// independent sources: the seed and the knowledge records read from disk,
// the reference READMEs, D-233 (the CHK-ASM-05 figure of record), the
// M04-T01 card table (58 run, 28 skip at M04) and the committed pages
// under docs/reference/checks. Heading anchors and qualifiers are matched
// by this file's own rules, never by the code under test.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import {
  CHECK_MODULES, checkPage, checkPageMarkdown, coversOf, indexMarkdown, numberLine, originFromSeed, originGapsMarkdown,
  KERNEL_LANDS, PAGE_MILESTONE, kernelsAt, parseRecordId, registerChecks, renderCheckPage, type ReferenceCovers,
} from "../src/index";
import { SEEDED_IDS } from "./seeded-ids";

const ROOT = new URL("../../../", import.meta.url);
const read = (rel: string): string => readFileSync(new URL(rel, ROOT), "utf8");
const seed = JSON.parse(read("packages/checks/seed/checks.seed.json")) as {
  checks: { id: string; origin: { project: string; date: string; what: string; knowledge?: string; evidence?: string | null; numbers?: Record<string, unknown> } }[];
  candidates?: { title: string; origin: { evidence?: string | null } }[];
};
const defs = registerChecks({ seed }, CHECK_MODULES);

// The reference folders and their covers lines, read here from disk.
const refs: ReferenceCovers[] = readdirSync(new URL("reference/", ROOT), { withFileTypes: true }).filter((a) => a.isDirectory()).flatMap((a) =>
  readdirSync(new URL(`reference/${a.name}/`, ROOT), { withFileTypes: true }).filter((d) => d.isDirectory())
    .filter((d) => existsSync(new URL(`reference/${a.name}/${d.name}/README.md`, ROOT)))
    .map((d) => ({ path: `reference/${a.name}/${d.name}`, covers: coversOf(read(`reference/${a.name}/${d.name}/README.md`)) })));
const pages = defs.map((d) => checkPage(d, refs));
const byId = new Map(pages.map((p) => [p.id, p]));

// This file's anchor rule (GitHub style): lowercase, keep a to z, digits, space and hyphen, spaces to hyphens.
const anchor = (h: string): string => h.trim().toLowerCase().replace(/[^a-z0-9 -]/g, "").replace(/ /g, "-");
const QUAL = /\b(measured|computed|vendor|inferred|unknown)\b/;

describe("origin records", () => {
  test("every origin has design, date and a non-empty failure", () => {
    expect(pages.length).toBe(seed.checks.length);
    for (const p of pages) {
      const row = seed.checks.find((r) => r.id === p.id)!;
      expect(p.origin.design.trim(), p.id).not.toBe("");
      expect(p.origin.design, p.id).not.toMatch(/20\d\d-\d\d/);
      expect(row.origin.project.startsWith(p.origin.design), p.id).toBe(true);
      expect(p.origin.date, p.id).toBe(row.origin.date);
      expect(p.origin.failure.trim(), p.id).not.toBe("");
      expect(p.origin.failure, p.id).toBe(row.origin.what);
    }
  });

  test("every record that is not null resolves to a file and a heading under knowledge/", () => {
    for (const p of pages) {
      if (p.origin.record === null) continue;
      const id = parseRecordId(p.origin.record);
      expect(id, `${p.id} ${p.origin.record}`).not.toBeNull();
      const rel = `knowledge/${id!.path}.md`;
      expect(existsSync(new URL(rel, ROOT)), `${p.id} ${rel}`).toBe(true);
      const heads = read(rel).split("\n").filter((l) => /^#{1,6} /.test(l)).map((l) => anchor(l.replace(/^#+/, "")));
      expect(heads, `${p.id} ${p.origin.record}`).toContain(id!.slug);
    }
  });

  test("a record id outside knowledge/ or without a section is refused", () => {
    expect(parseRecordId("knowledge:01-invariants#printability")).toEqual({ path: "01-invariants", slug: "printability" });
    expect(parseRecordId("knowledge:../RULES#language")).toBeNull();
    expect(parseRecordId("knowledge:01-invariants")).toBeNull();
    expect(parseRecordId("01-invariants#printability")).toBeNull();
  });

  test("every quoted number carries a qualifier", () => {
    let n = 0;
    for (const p of pages) for (const line of p.origin.numbers) {
      n += 1;
      expect(line, p.id).toMatch(QUAL);
    }
    expect(n).toBeGreaterThan(0);
    expect(numberLine("sagMm", 0.95, "computed")).toBe("0.95 mm sag (computed)");
    expect(numberLine("settleUs", "78 (computed)", "inferred")).toBe("78 (computed) us settle");
  });

  // fab-knowledge: and fab-work-directory: name the owner's evidence archive by
  // prefix (CLAUDE.md, tools/publish-paths.mjs). Each is read from its variable
  // when set, else from the owner's folder of that name under Projects/hackbuild.
  const owner = (name: string, variable: string): { prefix: string; dir: string } =>
    ({ prefix: `${name}:`, dir: process.env[variable] || join(homedir(), "Projects", "hackbuild", name) });
  const ARCHIVES = [owner("fab-knowledge", "HBF_FAB_KNOWLEDGE"), owner("fab-work-directory", "HBF_FAB_WORK_DIRECTORY")];
  test("an evidence path is repo-relative or fab-knowledge:, never a local absolute path", () => {
    for (const p of pages) {
      const e = p.origin.evidence;
      if (e === null) continue;
      expect(e.startsWith("/") || e.startsWith("~"), `${p.id} ${e}`).toBe(false);
      expect(e, p.id).not.toMatch(/\/Users\//);
      for (const a of p.origin.also) if (a.evidence !== null) expect(a.evidence.startsWith("/") || a.evidence.startsWith("~"), `${p.id} ${a.evidence}`).toBe(false);
    }
    for (const c of seed.candidates ?? []) if (typeof c.origin.evidence === "string") expect(c.origin.evidence.startsWith("/"), c.title).toBe(false);
  });

  test("a repo evidence path exists; an archive one exists where that archive is on this host", () => {
    for (const p of pages) {
      const e = p.origin.evidence;
      if (e === null) continue;
      const a = ARCHIVES.find((x) => e.startsWith(x.prefix));
      if (a !== undefined) {
        if (existsSync(a.dir)) expect(existsSync(join(a.dir, e.slice(a.prefix.length))), `${p.id} ${e}`).toBe(true);
      } else {
        expect(existsSync(new URL(e, ROOT)), `${p.id} ${e}`).toBe(true);
      }
    }
  });

  test("CHK-ASM-05 quotes the D-233 figure of record and never the retired 577", () => {
    const o = byId.get("CHK-ASM-05")!.origin;
    expect(o.design).toBe("OGEE R16-P");
    expect(o.date).toBe("2026-08");
    expect(o.failure).toBe("every pin head swept into its own servo");
    expect(o.numbers.some((n) => n.startsWith("682 mm3 swept per bar crank (computed, per-step sum over 25 steps"))).toBe(true);
    expect(o.numbers.some((n) => n.startsWith("577"))).toBe(false);
    expect(o.record).toBe("knowledge:01-invariants#motion-and-latching");
    expect(byId.get("CHK-ASM-05")!.version).toBe("2.0.1");
  });

  test("the design drops only a trailing month, and the date field wins", () => {
    expect(originFromSeed({ project: "OGEE R16-P 2026-08", date: "2026-08", what: "x" }).design).toBe("OGEE R16-P");
    expect(originFromSeed({ project: "TANG R5 2026-08-17", date: "2026-08-17", what: "x" }).design).toBe("TANG R5");
    expect(originFromSeed({ project: "PAWL mk2, STANCHION 2026-07", date: "2026-07", what: "x" }).design).toBe("PAWL mk2, STANCHION");
  });
});

describe("check pages", () => {
  test("run state at M04 splits 58 run and 28 skip (M04-T01 table), and every skip names a milestone", () => {
    const seeded = defs.map((d) => checkPage(d, refs, "M04")).filter((p) => SEEDED_IDS.has(p.id));
    expect(seeded.length).toBe(86);
    expect(seeded.filter((p) => p.run.runs).length).toBe(58);
    for (const p of seeded.filter((x) => !x.run.runs)) expect(p.run.reason, p.id).toMatch(/\(lands M\d\d/);
    // Rows entered at M04-T12 skip on their pending milestone or a missing kernel; either names the milestone.
    const atM04 = defs.map((d) => checkPage(d, refs, "M04"));
    for (const p of atM04.filter((x) => !x.run.runs && !SEEDED_IDS.has(x.id))) expect(p.run.reason, p.id).toMatch(/lands M\d\d/);
    const m04 = new Map(atM04.map((p) => [p.id, p]));
    expect(m04.get("CHK-BRD-01")!.run.reason).toBe("kernel board not registered (lands M08)");
    expect(m04.get("CHK-UI-01")!.run.reason).toBe("no page targets yet (lands M09)");
  });

  // M05 registers circuit and copper and the net level they produce (the
  // package placement table of the M05 card, read here, never
  // KERNEL_LANDS): at M05 no page skips for a missing circuit or copper
  // kernel or for no net targets, and a sheet or motion check still waits on M07.
  test("run state at M05: circuit, copper and net targets landed", () => {
    expect(read("docs/plan/milestones/M05-circuit-copper.md")).toMatch(/^\| circuit \| 1 \|/m);
    expect(read("docs/plan/milestones/M05-circuit-copper.md")).toMatch(/^\| copper \| 1 \|/m);
    const m05 = new Map(defs.map((d) => checkPage(d, refs, "M05")).map((p) => [p.id, p]));
    for (const p of m05.values()) expect(p.run.reason ?? "", p.id).not.toMatch(/kernel (circuit|copper)\b|no net targets/);
    expect(m05.get("CHK-NET-05")!.run).toEqual({ at: "M05", runs: true, reason: null });
    expect(m05.get("CHK-NET-40")!.run.reason).toBe("no sheet targets yet (lands M07)");
    expect(m05.get("CHK-NET-23")!.run.reason).toBe("run lands M05");
    expect(m05.get("CHK-MOT-01")!.run.reason).toMatch(/^kernel motion not registered \(lands M07\)$/);
  });

  // The committed pages read the run state check.run registers,
  // PAGE_MILESTONE (publish audit D-05). The index names the kernels and
  // target levels that land after it, so "at M05" never reads as the
  // current milestone; moving it waits on golden acceptance (D-152).
  test("pages read the run state at PAGE_MILESTONE and the index names what lands later", () => {
    for (const p of pages) expect(p.run.at, p.id).toBe(PAGE_MILESTONE);
    const index = read("docs/reference/checks/INDEX.md");
    expect(index).toMatch(new RegExp(`^\\d+ registered checks; at ${PAGE_MILESTONE} `, "m"));
    const later = (Object.keys(KERNEL_LANDS) as (keyof typeof KERNEL_LANDS)[]).filter((k) => kernelsAt(PAGE_MILESTONE).has(k) === false);
    expect(later.length).toBeGreaterThan(0);
    for (const k of later) expect(index, k).toContain(`${k} (${KERNEL_LANDS[k]})`);
    expect(index).toContain("D-152");
    expect(indexMarkdown(defs.map((d) => checkPage(d, refs, "M09")))).not.toContain("land later");
  });

  test("the legal derivation names the ConstraintDef that backs it", () => {
    expect(byId.get("CHK-KEY-04")!.legal.constraint).toBe("sim/click-spring-window");
    expect(byId.get("CHK-KEY-04")!.legal.derivation).toContain("sim/click-spring-window");
    expect(byId.get("CHK-PRT-01")!.legal.constraint).toBeNull();
  });

  test("references come from the README covers lines", () => {
    expect(coversOf("x\ncovers: ['feature:inlay', 'CHK-INL-01']\n")).toEqual(["feature:inlay", "CHK-INL-01"]);
    expect(coversOf("covers: [export:3mf, CHK-3MF-01]")).toEqual(["export:3mf", "CHK-3MF-01"]);
    for (const id of ["CHK-INL-01", "CHK-INL-02", "CHK-INL-03", "CHK-INL-04"]) expect(byId.get(id)!.references, id).toContain("reference/cosmetic/coin-inlay");
    expect(byId.get("CHK-3MF-06")!.references).toContain("reference/exports/orca-3mf-roundtrip");
    expect(byId.get("CHK-ASM-05")!.references).toEqual([]);
  });

  test("explain text starts with the id and carries the uri, origin and run state", () => {
    const t = renderCheckPage(byId.get("CHK-ASM-05")!);
    expect(t).toMatch(/^CHK-ASM-05 2\.0\.1 /);
    expect(t).toContain("hbf://check/CHK-ASM-05   OGEE R16-P 2026-08, every pin head swept into its own servo");
    expect(t).toContain(`runs at ${PAGE_MILESTONE}`);
  });

  test("every registry id has a page and every page has a registry id", () => {
    const files = readdirSync(new URL("docs/reference/checks/", ROOT)).filter((f) => /^CHK-.*\.md$/.test(f)).map((f) => f.slice(0, -3)).sort();
    expect(files).toEqual(seed.checks.map((c) => c.id).sort());
  });

  test("the committed pages, INDEX.md and origin-gaps.md equal a regeneration", () => {
    for (const p of pages) expect(read(`docs/reference/checks/${p.id}.md`), p.id).toBe(checkPageMarkdown(p));
    expect(read("docs/reference/checks/INDEX.md")).toBe(indexMarkdown(pages));
    expect(read("docs/reference/checks/origin-gaps.md")).toBe(originGapsMarkdown(pages));
  });

  test("origin-gaps.md lists exactly the checks whose seed names no knowledge record", () => {
    const missing = seed.checks.filter((c) => c.origin.knowledge === undefined).map((c) => c.id).sort();
    const listed = [...read("docs/reference/checks/origin-gaps.md").matchAll(/^\| \[(CHK-[A-Z0-9]+-\d\d)\]/gm)].map((m) => m[1]).sort();
    expect(listed).toEqual(missing);
    expect(missing.length).toBeGreaterThan(0);
  });
});
