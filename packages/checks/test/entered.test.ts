// M04-T12: the checks plan-deltas R54 named, entered with origins. The
// expected ids, titles, targets, needs, legal kinds, severities and run
// milestones are read from the plan on disk (the card's tables in
// docs/plan/milestones/M04-checks-project.md and docs/plan/CHECKS.md
// sections 9 and 15), never from the seed or modules under test. The run
// bodies that land here are driven through the registry on their origins:
// COTTER's hook pairs through the M02-T09 insertion scene, the COLLAR NFC
// card's pause, the CASK export and the TENON export.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import type { Assembly, CheckLevel, CheckResult, KernelId } from "@hackbuild/spec";
import { DEFAULT_TEMPLATE } from "@hackbuild/3mf";
import { LAYER_TOL_MM, createProfileLookup, layerTop, layerTopsAround, loadProfile, snapLayer } from "@hackbuild/profile";
import { runSweep, type InsertCaseView, type SceneDeps } from "@hackbuild/sim";
import {
  CHECK_ID_ALIASES, CHECK_MODULES, originFromSeed, registerChecks, resolveCheckId, runRegistry, type InsertMeasure, type KernelViews,
} from "../src/index";
import { loadFixture } from "./fixture-load";
import { SEEDED_IDS } from "./seeded-ids";

const ROOT = new URL("../../../", import.meta.url);
const read = (rel: string): string => readFileSync(new URL(rel, ROOT), "utf8");

interface Row {
  id: string; version: string; title: string; status: string; severity: string; legalKind: string; needs: string[]; pending?: string;
  appliesTo: { level: string; kinds?: string[]; assertions?: string[] };
  origin: { project: string; date: string; what: string; evidence?: string | null };
}
interface Candidate { title: string; status?: string; id?: string; origin: { project: string; date: string; what: string; evidence?: string | null }; waitsOn: string }
const seed = JSON.parse(read("packages/checks/seed/checks.seed.json")) as { checks: Row[]; candidates?: Candidate[] };
const defs = registerChecks({ seed, filamentTemplate: DEFAULT_TEMPLATE }, CHECK_MODULES);
const byId = new Map(seed.checks.map((r) => [r.id, r]));
const profile = createProfileLookup(loadProfile());

// ---- the plan, read here ----
const card = read("docs/plan/milestones/M04-checks-project.md");
const t12 = card.split(/^## M04-T12 /m)[1]!.split(/^## M04-T13 /m)[0]!;
const checks = read("docs/plan/CHECKS.md");
const s9 = checks.split(/^## 9\. /m)[1]!.split(/^## 10\. /m)[0]!;
const s15 = checks.split(/^## 15\. /m)[1]!;
const cells = (line: string): string[] => line.split("|").slice(1, -1).map((c) => c.trim());

/** CHECKS.md section 9 rows by id: title, target and needs, legal, severity, runs from. */
const S9 = new Map(s9.split("\n").filter((l) => /^\| CHK-/.test(l)).map((l) => {
  const c = cells(l);
  return [c[0]!, { title: c[1]!.replace(/`/g, ""), target: c[2]!, legal: c[3]!, severity: c[4]!, runs: c[c.length - 1]! }] as const;
}));

/** Ids in the card's step 4 tables (new entries and the rows appended from CHECKS.md). */
const cardIds = [...t12.matchAll(/^\| (CHK-[A-Z0-9]+-\d\d) \|/gm)].map((m) => m[1]!);

/** Ids of the CHECKS.md section 15 append list, "CHK-ART-05 to -07" expanded. */
function appendList(): string[] {
  const line = s15.split("\n").find((l) => l.startsWith("| CHK-FIT-06, CHK-FIT-07"))!;
  const first = cells(line)[0]!;
  return first.split(",").flatMap((part) => {
    const range = /(CHK-[A-Z0-9]+)-(\d\d) to -(\d\d)/.exec(part.trim());
    if (range === null) return [part.trim()];
    const out: string[] = [];
    for (let n = Number(range[2]); n <= Number(range[3]); n++) out.push(`${range[1]}-${String(n).padStart(2, "0")}`);
    return out;
  });
}

/**
 * Entries whose run is not where CHECKS.md section 9 puts it, with why.
 * The test fails if a reason goes stale: an entry here must not have a run
 * body, and every pending entry that CHECKS.md says runs at M04 must be here.
 */
const MOVED: Readonly<Record<string, { readonly pending: string; readonly why: string }>> = {
  "CHK-ART-05": { pending: "M09", why: "no exporter declares a QR region before the M09 print card, and profile has no qr.moduleMinMm row" },
  "CHK-ART-06": { pending: "M09", why: "no exporter declares a QR region or its relief before the M09 print card" },
};

/**
 * Entries whose run body landed at their CHECKS.md milestone, by the card
 * that landed it: no longer pending, and a run body is required.
 */
const LANDED: Readonly<Record<string, string>> = {
  "CHK-NET-28": "M05-T12",
  "CHK-NET-13": "M05-T19", "CHK-NET-26": "M05-T19", "CHK-NET-27": "M05-T19", "CHK-NET-30": "M05-T19", "CHK-FIT-07": "M05-T19",
  "CHK-3MF-08": "M05-T20",
  "CHK-SHT-11": "M06-T02",
  "CHK-BRD-07": "M08-T12", "CHK-BRD-08": "M08-T12", "CHK-BRD-09": "M08-T12", "CHK-BRD-20": "M08-T12", "CHK-BRD-21": "M08-T12",
  "CHK-BRD-19": "M08-T09", "CHK-BRD-22": "M08-T08",
  "CHK-NET-46": "K-04",
  "CHK-PRT-18": "R1-rails-import", "CHK-PRT-19": "R1-rails-import",
  "CHK-CLAIM-01": "R1-engine-11",
};

const enteredBy = (r: Row): string | undefined => (r as { enteredBy?: string }).enteredBy;
const T12 = seed.checks.filter((r) => !SEEDED_IDS.has(r.id) && enteredBy(r) === "M04-T12");
/**
 * Rows a later card entered, each with its CHECKS.md section 9 row: M05-T14
 * the KEYWAY gates no row covered, M05-T17 the six KEYWAY family gate
 * families that ran under candidate names, M05-T20 CHK-3MF-08 with its run
 * body, M08-T08 the KiCad readback, M08-T12 the jumper default and the
 * island and short check, K-04 (the 2026-10-13 flagship finding) the
 * seat tap landing, R1-rails-import the import piece count and floating
 * piece (hbf image eval 2026-10-20), R1-engine-11 the function claim
 * band.
 */
const LATER: Readonly<Record<string, readonly string[]>> = {
  "M05-T14": ["CHK-NET-31", "CHK-NET-32", "CHK-NET-33", "CHK-NET-34", "CHK-NET-35", "CHK-NET-36", "CHK-NET-37", "CHK-NET-38"],
  "M05-T17": ["CHK-NET-40", "CHK-NET-41", "CHK-NET-42", "CHK-NET-43", "CHK-NET-44", "CHK-NET-45"],
  "M05-T20": ["CHK-3MF-08"],
  "M06-T02": ["CHK-SHT-11"],
  "M08-T08": ["CHK-BRD-22"],
  "M08-T12": ["CHK-BRD-20", "CHK-BRD-21"],
  "K-04": ["CHK-NET-46"],
  "R1-rails-import": ["CHK-PRT-18", "CHK-PRT-19"],
  "R1-engine-11": ["CHK-CLAIM-01"],
};
const KERNELS = new Set<KernelId>(["geom", "mesh", "profile", "3mf", "sim", "inlay"]);
const TARGETS = new Set<CheckLevel>(["part", "body", "feature", "assembly", "artifact", "source", "project"]);

async function runOne(id: string, targets: Parameters<typeof runRegistry>[1]["targets"], views: KernelViews): Promise<readonly CheckResult[]> {
  const def = defs.find((d) => d.id === id)!;
  const report = await runRegistry([def], { kernels: KERNELS, produced: TARGETS, targets, views, ctx: { profile, machine: "ffc5p", whitelist: new Map() } });
  return report.results;
}

describe("entered rows (M04-T12)", () => {
  test("every row the card and CHECKS.md section 15 name is entered, and no other row is new", () => {
    const named = [...new Set([...cardIds, ...appendList(), "CHK-3MF-10"])].filter((id) => !SEEDED_IDS.has(id)).sort();
    console.info(`card and section 15 name ${named.length} new ids; seed enters ${T12.length}`);
    expect(T12.map((r) => r.id).sort()).toEqual(named);
    for (const r of T12) expect([r.status, enteredBy(r)], r.id).toEqual(["entered", "M04-T12"]);
    const later = seed.checks.filter((r) => !SEEDED_IDS.has(r.id) && enteredBy(r) !== "M04-T12");
    expect(Object.fromEntries(Object.keys(LATER).map((card) => [card, later.filter((r) => enteredBy(r) === card).map((r) => r.id).sort()]))).toEqual(LATER);
    expect(later.length).toBe(Object.values(LATER).flat().length);
    for (const r of later) {
      expect(r.status, r.id).toBe("entered");
      const s = S9.get(r.id);
      expect(s, `${r.id} has no CHECKS.md section 9 row`).toBeDefined();
      // A row whose run body landed with it is no longer pending (LANDED).
      const pending = LANDED[r.id] === undefined ? /^M\d\d/.exec(s!.runs)?.[0] : undefined;
      expect([r.title, r.severity, r.legalKind, r.pending], r.id).toEqual([s!.title, s!.severity, s!.legal.split(/[\s,]/)[0], pending]);
      expect(CHECK_MODULES.find((m) => m.id === r.id)?.run !== undefined, r.id).toBe(LANDED[r.id] !== undefined);
    }
    for (const r of seed.checks.filter((x) => SEEDED_IDS.has(x.id))) expect((r as { enteredBy?: string }).enteredBy, r.id).toBeUndefined();
    for (const id of ["CHK-NET-30", "CHK-FIT-07", "CHK-FIT-06", "CHK-NET-28", "CHK-PRT-16", "CHK-SHT-10", "CHK-ART-05", "CHK-ART-06", "CHK-ART-07", "CHK-3MF-10"]) {
      expect(byId.get(id)?.status, id).toBe("entered");
    }
  });

  test("ids are unique across seeded and entered rows, and the 86 seeded rows are all still there", () => {
    expect(new Set(seed.checks.map((r) => r.id)).size).toBe(seed.checks.length);
    expect([...SEEDED_IDS].filter((id) => !byId.has(id))).toEqual([]);
    expect(SEEDED_IDS.size).toBe(86);
  });

  // Entered rows start at 1.0.0. CHK-NET-05 entered at its 2.0.0 rewrite (CHECKS.md 7.5); CHK-PRT-13
  // took the per triangle bed band of PAWL fdm.py line 43, which can flip a verdict (major, CHECKS.md 1.3),
  // then a patch when its message named the band's profile row overhang.bedBandMm (D-242).
  // CHK-ASM-10 and -11 took a patch for their BUCK second origin (CheckOrigin.also, CHECKS.md 7.7).
  // CHK-NET-28 took a patch for the Capricate sweep numbers and evidence in its origin (M05-T12 step 2).
  // CHK-CLAIM-01 took evidence rows (R1-engine-26): a measured reading can flip a pass to fail on the same Part IR (major).
  const ENTERED_VERSION: Readonly<Record<string, string>> = { "CHK-NET-05": "2.0.0", "CHK-PRT-13": "2.0.1", "CHK-ASM-10": "1.0.1", "CHK-ASM-11": "1.0.1", "CHK-NET-28": "1.0.1", "CHK-SHT-11": "1.0.1", "CHK-CLAIM-01": "2.0.0" };
  test("every entered row has an origin with design, date and failure", () => {
    for (const r of seed.checks.filter((x) => x.status === "entered")) {
      const o = originFromSeed(r.origin as never);
      expect(o.design.trim(), r.id).not.toBe("");
      expect(r.origin.date, r.id).toMatch(/^\d{4}-\d{2}(-\d{2})?$/);
      expect(r.origin.project, r.id).toContain(r.origin.date);
      expect(o.failure.trim(), r.id).not.toBe("");
      expect(r.version, r.id).toBe(ENTERED_VERSION[r.id] ?? "1.0.0");
    }
  });

  test("each entry equals its CHECKS.md section 9 row: title, target, needs, legal kind, severity", () => {
    for (const r of T12) {
      const s = S9.get(r.id);
      expect(s, `${r.id} has no CHECKS.md section 9 row`).toBeDefined();
      const [target, needs] = s!.target.split(";").map((x) => x.trim());
      const [level, kind] = target!.split(/\s+/);
      expect(r.title, r.id).toBe(s!.title);
      expect(r.appliesTo.level, r.id).toBe(level);
      expect(r.appliesTo.kinds, r.id).toEqual(kind === undefined ? undefined : [kind]);
      expect(r.needs, r.id).toEqual(needs === undefined || needs === "none" ? [] : needs.split(",").map((x) => x.trim()));
      expect(r.legalKind, r.id).toBe(s!.legal.split(/[\s,]/)[0]);
      expect(r.severity, r.id).toBe(s!.severity);
    }
    expect(byId.get("CHK-ASM-10")!.appliesTo.assertions).toEqual(["insertable"]);
  });

  test("a pending row names its CHECKS.md milestone, M05 to M13; a row CHECKS.md runs at M04 has a run body unless MOVED says why", () => {
    const modules = new Map(CHECK_MODULES.map((m) => [m.id as string, m]));
    for (const r of T12) {
      const runs = S9.get(r.id)!.runs;
      const at = /^M\d\d/.exec(runs)?.[0];
      const moved = MOVED[r.id];
      const hasRun = modules.get(r.id)!.run !== undefined;
      if (moved !== undefined) {
        expect([r.pending, hasRun], `${r.id}: ${moved.why}`).toEqual([moved.pending, false]);
        continue;
      }
      if (at === "M04" || at === "M00" || LANDED[r.id] !== undefined) {
        expect([r.pending, hasRun], `${r.id}${LANDED[r.id] === undefined ? "" : `, landed by ${LANDED[r.id]}`}`).toEqual([undefined, true]);
        continue;
      }
      expect(r.pending, r.id).toBe(at);
      expect(hasRun, r.id).toBe(false);
      expect(Number(r.pending!.slice(1)), r.id).toBeGreaterThanOrEqual(5);
      expect(Number(r.pending!.slice(1)), r.id).toBeLessThanOrEqual(13);
    }
    for (const [id, m] of Object.entries(MOVED)) expect(byId.get(id)?.pending, `${id}: ${m.why}`).toBe(m.pending);
    const runsNow = T12.filter((r) => modules.get(r.id)!.run !== undefined).map((r) => r.id).sort();
    console.info(`run bodies landed here: ${runsNow.join(", ")}`);
    expect(runsNow).toEqual([
      "CHK-3MF-10", "CHK-ART-01", "CHK-ART-02", "CHK-ART-07", "CHK-ASM-10", "CHK-ASM-11", "CHK-BRD-07", "CHK-BRD-08", "CHK-BRD-09", "CHK-BRD-19", "CHK-FIT-07",
      "CHK-NET-13", "CHK-NET-26", "CHK-NET-27", "CHK-NET-28", "CHK-NET-30", "CHK-PRT-13", "CHK-PRT-15", "CHK-PRT-16",
    ]);
  });

  test("the four DAVIT R4 candidates carry their origin and no status entered", () => {
    const table = t12.split("The DAVIT R4 candidate rows")[1]!.split(/^5\. /m)[0]!;
    const titles = table.split("\n").filter((l) => /^\| [a-z]/.test(l) && !l.startsWith("| candidate")).map((l) => cells(l)[0]!);
    expect(titles).toHaveLength(4);
    const cands = seed.candidates ?? [];
    expect(cands.map((c) => c.title)).toEqual(titles);
    for (const c of cands) {
      expect(c.status, c.title).toBeUndefined();
      expect(c.id, c.title).toBeUndefined();
      expect(c.origin.project, c.title).toBe("DAVIT R4 2026-08-02");
      expect(c.origin.date).toBe("2026-08-02");
      expect(c.origin.what.trim(), c.title).not.toBe("");
      expect(c.origin.evidence, c.title).toBe("fab-knowledge:evidence/x/downloads/dl-robots-machines/unzipped/davit_r4/README_R4.md");
    }
    expect(seed.checks.some((r) => (cands as { title: string }[]).some((c) => c.title === r.title))).toBe(false);
  });
});

describe("run bodies on their origins", () => {
  test("CHK-ART-01 registers export-completeness: the alias resolves and the TENON export fails", async () => {
    expect(CHECK_ID_ALIASES).toEqual({ "export-completeness": "CHK-ART-01" });
    expect(resolveCheckId("export-completeness")).toBe("CHK-ART-01");
    expect(resolveCheckId("CHK-PRT-01")).toBe("CHK-PRT-01");
    const bytes = new Uint8Array(readFileSync(new URL("tools/corpus/3mf/known-bad/tenon-undefined.3mf", ROOT)));
    const rs = await runOne("CHK-ART-01", { artifacts: [{ exporter: "3mf", name: "tenon-undefined.3mf", bytes }] }, {});
    console.info(`tenon-undefined.3mf: ${rs.map((r) => `${r.verdict} ${String(r.extra?.["first"] ?? "")}`).join("; ")}`);
    expect(rs.map((r) => r.verdict)).toEqual(["fail"]);
    expect(String(rs[0]!.extra?.["first"])).toMatch(/tenon-undefined/);
  }, 60_000);

  test("CHK-3MF-10 fails the CASK Sep 5 export on every slot", async () => {
    const bytes = new Uint8Array(readFileSync(new URL("tools/corpus/3mf/known-bad/cask-empty-plate.3mf", ROOT)));
    const rs = await runOne("CHK-3MF-10", { artifacts: [{ exporter: "3mf", name: "cask-empty-plate.3mf", bytes }] }, {});
    expect(rs.map((r) => [r.verdict, r.extra?.["slots"], r.extra?.["escapedSlots"], r.extra?.["first"]])).toEqual([["fail", 3, 3, 0]]);
  });

  test("CHK-PRT-15 on the COLLAR NFC card case b: pause at 2.28 fails with nearest 2.17 and 2.41 on ffc5p_20260819", async () => {
    const fx = loadFixture("CHK-PRT-15", "fail");
    const rs = await runOne("CHK-PRT-15", fx.targets, fx.views);
    const pause = rs.find((r) => r.target.level === "feature")!;
    expect(pause.verdict).toBe("fail");
    expect(pause.legal).toEqual({ kind: "multipleOf", base: 0.24, offset: 0.25, unit: "mm", nearest: [2.17, 2.41] });
    expect(rs.find((r) => r.target.level === "part")!.verdict).toBe("pass");
  });

  // Audit of 2026-10-08 (evidence/audit2/verify/geom-layergrid/fuzz2.txt): at
  // layerTop(7) + 0.5e-6 the check read on-grid while snapLayer moved the z a
  // whole layer up, because layerIndex applied 1e-6 in layer units. Both now
  // read profile LAYER_TOL_MM in mm through layerTopsAround.
  test("CHK-PRT-15 and snapLayer agree on a pause within the grid tolerance of a top, and just past it", async () => {
    const preset = profile.machine("ffc5p").presets[0]!;
    expect(preset.id).toBe("ffc5p_20260819");
    for (const [z, on] of [[layerTop(preset, 7) + 0.5e-6, true], [layerTop(preset, 7) - 0.5e-6, true], [layerTop(preset, 7) + 5e-6, false]] as const) {
      const fx = loadFixture("CHK-PRT-15", "fail");
      const json = JSON.stringify(fx.targets).replace(/"z":2\.28\b/, `"z":${z}`);
      expect(json, "the fail fixture pauses at 2.28").not.toBe(JSON.stringify(fx.targets));
      const rs = await runOne("CHK-PRT-15", JSON.parse(json) as typeof fx.targets, fx.views);
      const pause = rs.find((r) => r.target.level === "feature")!;
      expect(pause.verdict, `z ${z}`).toBe(on ? "pass" : "fail");
      // On the grid, the snap leaves z on the same top; off it, the snap moves z to the next one.
      expect(Math.abs(snapLayer(preset, z) - layerTop(preset, 7)) <= LAYER_TOL_MM, `snapLayer(${z})`).toBe(on);
      const [below, above] = layerTopsAround(preset, z);
      expect([below, above], `z ${z}`).toEqual(on ? [layerTop(preset, 7), layerTop(preset, 7)] : [layerTop(preset, 7), layerTop(preset, 8)]);
    }
  });

  test("CHK-PRT-13 gates the overhang DETENT printed as information", async () => {
    const pass = await runOne("CHK-PRT-13", loadFixture("CHK-PRT-13", "pass").targets, loadFixture("CHK-PRT-13", "pass").views);
    const fail = await runOne("CHK-PRT-13", loadFixture("CHK-PRT-13", "fail").targets, loadFixture("CHK-PRT-13", "fail").views);
    console.info(`teardrop up ${String(pass[0]!.measured)} deg, area past ${String(pass[0]!.extra?.["overhangAreaMm2"])}; peak down ${String(fail[0]!.measured)} deg, area past ${String(fail[0]!.extra?.["overhangAreaMm2"])}`);
    expect(pass.map((r) => r.verdict)).toEqual(["pass"]);
    expect(pass[0]!.extra?.["overhangAreaMm2"]).toBe(0);
    expect(fail.map((r) => r.verdict)).toEqual(["fail"]);
    expect(fail[0]!.measured as number).toBeGreaterThan(45);
    expect(fail[0]!.extra?.["overhangAreaMm2"] as number).toBeGreaterThan(0);
  });

  test("CHK-ASM-10 over the M02-T09 insertion scenes: COTTER's 7 verify pairs and the kit board insert, the sharp bend is trapped", async () => {
    const golden = JSON.parse(read("packages/sim/test/goldens/cotter-insert-oracle.json")) as {
      cases: { id: string; hole: number; tb: number; dims: { d: number; Rb: number; sweep: number; ext?: number; gap?: number } }[];
    };
    // The binding sim's own test uses: the oracle's design_full output for a hole and board.
    const hookDesign = (hole: number, tb: number) => {
      const c = golden.cases.find((x) => x.hole === hole && x.tb === tb && x.id !== "sharp")!;
      return { d: c.dims.d, Rb: c.dims.Rb, sweep: c.dims.sweep, ext: c.dims.ext!, gap: c.dims.gap! };
    };
    const deps: SceneDeps = {
      constant: (id) => profile.constant(id),
      load: (file) => import(fileURLToPath(new URL(`packages/sim/scenes/${file}`, ROOT))) as Promise<unknown>,
      readText: (p) => read(p),
      hookDesign,
    };
    const cases: InsertCaseView[] = [];
    for (const scene of ["cotter-hook", "cotter-hook-sharp"]) cases.push(...((await runSweep(scene, { mode: "insert" }, deps)).cases ?? []));
    expect(cases.map((c) => c.id)).toEqual(golden.cases.map((c) => c.id));
    const I = [0, 0, 0, 1] as const;
    const assembly = {
      id: "cotter", parts: [], bought: [], joints: [], connections: [], metrics: [], warnings: [], buildHash: "0".repeat(64),
      instances: cases.flatMap((c) => [
        { id: `hook-${c.id}`, part: "hook", pose: { frame: "assembly", pos: [0, 0, 0], rot: I } },
        { id: `board-${c.id}`, part: "board", pose: { frame: "assembly", pos: [0, 0, 0], rot: I } },
      ]),
      assertions: cases.map((c) => ({ type: "insertable", part: `hook-${c.id}`, into: `board-${c.id}` })),
    } as unknown as Assembly;
    const insert = async (_a: string, x: { part: string }): Promise<InsertMeasure | undefined> => cases.find((c) => `hook-${c.id}` === x.part);
    const rs = await runOne("CHK-ASM-10", { assemblies: [assembly] }, { insert });
    const verdicts = Object.fromEntries(rs.map((r) => [(r.target as { a: { part: string } }).a.part.slice(5), r.verdict]));
    console.info(rs.map((r) => r.constraint).join("\n"));
    expect(verdicts).toEqual({
      "verify-1": "pass", "verify-2": "pass", "verify-3": "pass", "verify-4": "pass", "verify-5": "pass", "verify-6": "pass", "verify-7": "pass",
      "kit-2026-09-21": "pass", sharp: "fail",
    });
  }, 120_000);
});
