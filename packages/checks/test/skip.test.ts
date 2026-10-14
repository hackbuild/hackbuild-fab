// M04-T01 steps 5 and 6: the skip rule on the M04 kernel set (geom, mesh,
// profile, 3mf, sim, inlay) and targets (part, body, feature, assembly,
// artifact, source, project). The run and skip sets are derived from the
// seed through the rule and must equal the card's table, copied below; the
// test prints the split. A registry run with no targets returns one result
// per check, and every skip carries a reason. The card's table covers the
// seeded rows (CHECKS.md section 6); rows entered at M04-T12 are tested in
// entered.test.ts.

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import type { CheckLevel, KernelId } from "@hackbuild/spec";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { CHECK_MODULES, KERNEL_LANDS, registerChecks, runRegistry, skipReason } from "../src/index";
import { SEEDED_IDS } from "./seeded-ids";

const seed = JSON.parse(readFileSync(new URL("../seed/checks.seed.json", import.meta.url), "utf8")) as unknown;
const defs = registerChecks({ seed }, CHECK_MODULES).filter((d) => SEEDED_IDS.has(d.id));

const KERNELS = new Set<KernelId>(["geom", "mesh", "profile", "3mf", "sim", "inlay"]);
const TARGETS = new Set<CheckLevel>(["part", "body", "feature", "assembly", "artifact", "source", "project"]);

// M04-T01 step 6, the card's table.
const CARD: Readonly<Record<string, readonly string[]>> = {
  "no sheet targets yet (lands M07)": ["CHK-SHT-01", "CHK-SHT-02", "CHK-SHT-03", "CHK-SHT-07", "CHK-NET-08", "CHK-NET-09"],
  "no net targets yet (lands M05)": ["CHK-NET-02", "CHK-NET-07", "CHK-NET-11"],
  "kernel circuit not registered (lands M05)": ["CHK-NET-01", "CHK-NET-05", "CHK-NET-06", "CHK-NET-10", "CHK-NET-12", "CHK-NET-29"],
  "kernel motion not registered (lands M07)": ["CHK-MOT-01", "CHK-MOT-03", "CHK-MOT-04", "CHK-MOT-05", "CHK-MOT-06"],
  "kernel board not registered (lands M08)": ["CHK-BRD-01", "CHK-BRD-02", "CHK-BRD-03", "CHK-BRD-04", "CHK-BRD-05", "CHK-BRD-06"],
  "no page targets yet (lands M09)": ["CHK-UI-01", "CHK-UI-02"],
};
const CARD_RUN = 58;

/** A reason with every missing kernel collapsed to the one the card's row names. */
const reasonOf = (id: string): string | null => {
  const d = defs.find((x) => x.id === id)!;
  return skipReason({ needs: d.needs, target: d.appliesTo.level, pending: d.pending ?? null }, KERNELS, TARGETS);
};

describe("skip rule on the M04 kernel set", () => {
  test("derived run and skip sets equal the card", () => {
    expect(defs.length).toBe(86);
    const skips = new Map<string, string[]>();
    const runs: string[] = [];
    for (const d of defs) {
      const r = reasonOf(d.id);
      if (r === null) runs.push(d.id);
      else skips.set(r, [...(skips.get(r) ?? []), d.id]);
    }
    const skipped = [...skips.values()].flat().length;
    console.info(`run ${runs.length} skip ${skipped}`);
    expect(runs.length).toBe(CARD_RUN);
    expect(Object.fromEntries([...skips].map(([k, v]) => [k, [...v].sort()]))).toEqual(
      Object.fromEntries(Object.entries(CARD).map(([k, v]) => [k, [...v].sort()])),
    );
  });

  test("each reason names what is missing and the milestone that lands it", () => {
    expect(skipReason({ needs: ["circuit", "geom"], target: "net", pending: null }, KERNELS, TARGETS)).toBe("kernel circuit not registered (lands M05)");
    expect(skipReason({ needs: ["board", "motion"], target: "part", pending: null }, KERNELS, TARGETS)).toBe("kernel board, motion not registered (lands M08, M07)");
    expect(skipReason({ needs: ["geom"], target: "sheet", pending: null }, KERNELS, TARGETS)).toBe("no sheet targets yet (lands M07)");
    expect(skipReason({ needs: [], target: "part", pending: "M06" }, KERNELS, TARGETS)).toBe("run lands M06");
    expect(skipReason({ needs: ["mesh"], target: "part", pending: null }, KERNELS, TARGETS)).toBeNull();
    for (const k of Object.keys(KERNEL_LANDS)) expect(KERNEL_LANDS[k as KernelId]).toMatch(/^M\d\d$/);
  });

  test("a run with no targets returns a result for every check, and no skip lacks a reason", async () => {
    const profile = createProfileLookup(loadProfile());
    const report = await runRegistry(defs, {
      kernels: KERNELS, produced: TARGETS, targets: {}, ctx: { profile, machine: "ffc5p", whitelist: new Map() },
    });
    expect(new Set(report.results.map((r) => r.id)).size).toBe(defs.length);
    for (const r of report.results) {
      expect(r.verdict, r.id).toBe("skip");
      expect(r.constraint.trim(), r.id).not.toBe("");
      expect(r.origin, r.id).toBe(`hbf://check/${r.id}`);
    }
    const empty = report.results.filter((r) => r.constraint.startsWith("no ") && r.constraint.endsWith("in this build"));
    expect(empty.length).toBe(CARD_RUN);
  });
});
