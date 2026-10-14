// M04-T01 registry: every seeded row registers as a CheckDef with a
// module, a semver version, a dated origin, a legal kind and KernelId
// needs; the loader maps the old kind spellings and refuses the kinds that
// left the union; the seed carries the card's retargets, needs corrections
// and joint and assertion selections. The expected tables below are the
// card's words (milestones/M04-checks-project.md M04-T01 steps 2 to 4),
// copied, never derived from the code under test. The total is read from
// docs/plan/counts.json, which tools/counts.mjs generates (D-010).

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { KERNEL_IDS, isThrownCommandError, type CheckLevel } from "@hackbuild/spec";
import { CHK_INL_01_VERSION, CHK_INL_02_VERSION, CHK_INL_03_VERSION, CHK_INL_04_VERSION } from "@hackbuild/inlay";
import { CHECK_MODULES, defineCheck, loadSeed, registerChecks, skipMilestone, type AnyCheckModule } from "../src/index";

const read = (rel: string): string => readFileSync(new URL(`../../../${rel}`, import.meta.url), "utf8");
const seed = JSON.parse(read("packages/checks/seed/checks.seed.json")) as { note: string; checks: Record<string, unknown>[] };
const counts = JSON.parse(read("docs/plan/counts.json")) as { checks: { total: number; registered: { total: number } } };
const defs = registerChecks({ seed }, CHECK_MODULES);
const byId = new Map(defs.map((d) => [d.id as string, d]));

const thrown = (fn: () => unknown): { code: string; path?: string } => {
  try {
    fn();
  } catch (e) {
    if (isThrownCommandError(e)) return e.hbf;
    throw e;
  }
  throw new Error("expected a command error");
};

describe("registry", () => {
  test("every seeded row registers once, with semver, a dated origin, a legal kind and KernelId needs", () => {
    console.info(`registered ${defs.length} of ${seed.checks.length} seed rows`);
    expect(defs.length).toBe(seed.checks.length);
    expect(defs.length).toBe(counts.checks.registered.total);
    expect(new Set(defs.map((d) => d.id)).size).toBe(defs.length);
    for (const d of defs) {
      expect(d.version, d.id).toMatch(/^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/);
      expect(d.origin.date, d.id).toMatch(/^20[0-9]{2}-[0-9]{2}(-[0-9]{2})?$/);
      expect(d.origin.what.trim(), d.id).not.toBe("");
      expect(["interval", "set", "multipleOf", "boolean", "exactSet", "none"], d.id).toContain(d.legalKind);
      for (const k of d.needs) expect(KERNEL_IDS as readonly string[], d.id).toContain(k);
      expect(typeof d.run, d.id).toBe("function");
    }
  });

  test("a module per seed row and a seed row per module; levels agree", () => {
    const missing = CHECK_MODULES.filter((m) => m.id !== "CHK-PRT-01");
    expect(thrown(() => registerChecks({ seed }, missing))).toMatchObject({ code: "E_REF", path: "/checks/0/id" });
    const extra = [...CHECK_MODULES, defineCheck({ id: "CHK-PRT-99", level: "part", pending: "M05" })] as AnyCheckModule[];
    expect(thrown(() => registerChecks({ seed }, extra)).code).toBe("E_REF");
    const moved = CHECK_MODULES.map((m) => (m.id === "CHK-PRT-01" ? { ...m, level: "body" as CheckLevel } : m)) as AnyCheckModule[];
    expect(thrown(() => registerChecks({ seed }, moved))).toMatchObject({ code: "E_SCHEMA", path: "/checks/0/appliesTo/level" });
    expect(thrown(() => defineCheck({ id: "CHK-PRT-98", level: "part" })).code).toBe("E_SCHEMA");
  });

  test("the loader maps the D-017 aliases and refuses kinds that left the union", () => {
    const row = (kinds: string[]) => ({ checks: [{ ...seed.checks.find((r) => r["id"] === "CHK-FIT-03"), appliesTo: { level: "feature", kinds } }] });
    expect(loadSeed(row(["tabslot"]))[0]!.appliesTo.kinds).toEqual(["tabSlot"]);
    expect(loadSeed(row(["flexcut"]))[0]!.appliesTo.kinds).toEqual(["flexCut"]);
    expect(thrown(() => loadSeed(row(["pin_in_slot"])))).toMatchObject({ code: "E_SCHEMA", path: "/checks/0/appliesTo/kinds/0" });
    expect(thrown(() => loadSeed(row(["latch"])))).toMatchObject({ code: "E_SCHEMA", path: "/checks/0/appliesTo/kinds/0" });
    expect(thrown(() => loadSeed(row(["gear"])))).toMatchObject({ code: "E_SCHEMA", path: "/checks/0/appliesTo/kinds/0" });
    const dup = { checks: [seed.checks[0], seed.checks[0]] };
    expect(thrown(() => loadSeed(dup))).toMatchObject({ code: "E_SCHEMA", path: "/checks/1/id" });
  });

  test("the seed is written in the camelCase kinds (D-017)", () => {
    expect(byId.get("CHK-FIT-03")!.appliesTo.kinds).toEqual(["tabSlot"]);
    expect(byId.get("CHK-SHT-06")!.appliesTo.kinds).toEqual(["flexCut"]);
    expect(read("packages/checks/seed/checks.seed.json")).not.toMatch(/"(tabslot|flexcut|pin_in_slot|pivot|latch)"/);
  });
});

// M04-T01 step 3, the card's table.
const RETARGET: Readonly<Record<string, CheckLevel>> = {
  "CHK-3MF-01": "artifact", "CHK-3MF-02": "artifact", "CHK-3MF-03": "artifact", "CHK-3MF-06": "artifact", "CHK-3MF-07": "artifact",
  "CHK-BRD-01": "artifact", "CHK-BRD-05": "artifact",
  "CHK-FIT-04": "source", "CHK-SHT-04": "source", "CHK-MOT-03": "source",
  "CHK-LNT-01": "source", "CHK-LNT-02": "source", "CHK-LNT-03": "source", "CHK-LNT-04": "source",
  "CHK-UI-01": "page", "CHK-UI-02": "page",
  "CHK-BRD-06": "project", "CHK-MOT-06": "project", "CHK-NET-12": "project",
};
// The versions those rows carry after the step: a patch over the uncorrected seed where the level moved or
// needs gained a kernel; CHK-3MF-06 and -07 were artifact rows already (M-S-T06) and MOT-06 stays project.
// CHK-FIT-04, -SHT-04, -LNT-03 and -04 moved to 2.0.0 at M04-T13 when their rules left prose records out.
// CHK-UI-01, -02 and CHK-NET-12 took a second patch for the HAFT to PIP origin (CHECKS.md 7.7, D-013).
// CHK-LNT-01 and -02 moved to 2.0.0 on 2026-10-08 when the extra dashes and the emoji presentation
// set of RULES.md Language joined their rules (a pass can now fail). CHK-LNT-03 took a patch for its
// OGEE build-it second origin (CheckOrigin.also, CHECKS.md 7.7). CHK-SHT-04 took a patch on 2026-10-10
// when a number scaling a named quantity (kerf = 2 * burn) stopped reading as a typed kerf.
const RETARGET_VERSION: Readonly<Record<string, string>> = {
  "CHK-3MF-01": "1.0.1", "CHK-3MF-02": "1.0.1", "CHK-3MF-03": "1.0.1", "CHK-3MF-06": "2.0.0", "CHK-3MF-07": "2.0.0",
  "CHK-BRD-01": "1.0.1", "CHK-BRD-05": "1.0.1", "CHK-FIT-04": "2.0.0", "CHK-SHT-04": "2.0.1", "CHK-MOT-03": "1.0.1",
  "CHK-LNT-01": "2.0.0", "CHK-LNT-02": "2.0.0", "CHK-LNT-03": "2.0.1", "CHK-LNT-04": "2.0.0", "CHK-UI-01": "1.0.2", "CHK-UI-02": "1.0.2",
  "CHK-BRD-06": "1.0.1", "CHK-MOT-06": "1.0.0", "CHK-NET-12": "1.0.2",
};

describe("seed corrections", () => {
  test("the 19 project rows sit on the target that carries what they read (D-065)", () => {
    expect(Object.keys(RETARGET).length).toBe(19);
    for (const [id, level] of Object.entries(RETARGET)) {
      expect(byId.get(id)!.appliesTo.level, id).toBe(level);
      expect(byId.get(id)!.version, id).toBe(RETARGET_VERSION[id]);
    }
  });

  test("four needs corrections: NET-10 and NET-12 circuit, MOT-05 motion, BRD-06 board (D-057)", () => {
    expect(byId.get("CHK-NET-10")!.needs).toEqual(["circuit"]);
    expect(byId.get("CHK-NET-12")!.needs).toEqual(["circuit"]);
    expect(byId.get("CHK-MOT-05")!.needs).toEqual(["motion"]);
    expect(byId.get("CHK-BRD-06")!.needs).toEqual(["board"]);
    expect(byId.get("CHK-NET-10")!.version).toBe("1.0.1");
  });

  test("the four moved kinds select by joint or assertion at major 2 (D-177, CHECKS.md 7.7)", () => {
    expect(byId.get("CHK-ASM-05")!.appliesTo).toEqual({ level: "assembly", joints: ["prismatic", "planar"] });
    expect(byId.get("CHK-ASM-06")!.appliesTo).toEqual({ level: "assembly", joints: ["prismatic", "planar"] });
    expect(byId.get("CHK-ASM-09")!.appliesTo).toEqual({ level: "assembly", joints: ["revolute"] });
    expect(byId.get("CHK-MOT-05")!.appliesTo).toEqual({ level: "part", assertions: ["identity"] });
    for (const id of ["CHK-ASM-06", "CHK-ASM-09", "CHK-MOT-05"]) expect(byId.get(id)!.version, id).toBe("2.0.0");
    // CHK-ASM-05 rides 2.0.1: its origin text dropped the retired 577 mm3 (D-233, CHECKS.md 1.3 patch, M04-T02).
    expect(byId.get("CHK-ASM-05")!.version).toBe("2.0.1");
  });

  test("the inlay kernel's run bodies carry the versions their seed rows hold", () => {
    expect(byId.get("CHK-INL-01")!.version).toBe(CHK_INL_01_VERSION);
    expect(byId.get("CHK-INL-02")!.version).toBe(CHK_INL_02_VERSION);
    expect(byId.get("CHK-INL-03")!.version).toBe(CHK_INL_03_VERSION);
    expect(byId.get("CHK-INL-04")!.version).toBe(CHK_INL_04_VERSION);
  });

  test("a module that carries no run names the milestone the skip rule derives on the M04 set, or an entered row's own pending", () => {
    const kernels = new Set(["geom", "mesh", "profile", "3mf", "sim", "inlay"] as const);
    const targets = new Set<CheckLevel>(["part", "body", "feature", "assembly", "artifact", "source", "project"]);
    const pendingOnly = CHECK_MODULES.filter((m) => m.run === undefined);
    for (const m of pendingOnly) {
      const d = byId.get(m.id)!;
      // An entered row (M04-T12) names its milestone from the card; entered.test.ts holds it to CHECKS.md section 9.
      const want = d.status === "entered" && d.seed.pending !== undefined ? d.seed.pending : skipMilestone({ needs: d.needs, target: d.appliesTo.level, pending: null }, kernels, targets);
      expect(m.pending, m.id).toBe(want);
    }
    console.info(`pending-only modules ${pendingOnly.length}`);
  });
});
