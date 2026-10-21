// The registered surface (M00-T13 step 1, M01-T05 step 7, M02-T11 step 9, M04-T13, M05-T06, M07-T14,
// M10-T04, MILESTONES.md 1.3): the commands and utility verbs equal the cumulative
// M-S, M00, M01 and M02 rows of the 1.3 table, read from the file, so the
// count is never typed here. M01_PENDING names the M01 commands whose card
// has not landed; each card deletes its entry, and M01-T11 checks the list
// is empty.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CLI_ONLY, CLI_ONLY_FIELDS, COMMAND_GROUP, COMMAND_NAMES, UTILITY_VERBS } from "@hackbuild/spec";
import { CLI_FORM, COMMANDS, VERBS } from "../src/registry.js";
import { ROOT } from "./hbf.js";

/** Rows of the MILESTONES.md 1.3 table for the given milestones, as [milestone, commands cell]. */
function surfaceRows(milestones: readonly string[]): [string, string][] {
  const text = readFileSync(path.join(ROOT, "docs", "plan", "MILESTONES.md"), "utf8");
  const section = text.slice(text.indexOf("### 1.3"), text.indexOf("### 1.4"));
  return section.split("\n").filter((l) => /^\| M/.test(l)).map((l) => l.split("|").map((c) => c.trim()))
    .filter((r) => milestones.includes(r[1]!)).map((r) => [r[1]!, r[2]!]);
}

const mentioned = (cell: string, names: readonly string[]): string[] =>
  names.filter((n) => new RegExp(`(^|[\\s,(])${n.replace(".", "\\.")}([\\s,)]|$)`).test(cell));

/** Release 1 utility verbs (plan v9 section 3.1): hbf evidence add and list landed with R1-engine-26. */
const R1_VERBS: readonly string[] = ["evidence"];

/** M01 commands not registered yet; fits.table landed with M01-T09. */
const M01_PENDING: readonly string[] = [];
/** M04 commands not registered yet; project.graph landed with M04-T09 and rules.audit with M04-T13. */
const M04_PENDING: readonly string[] = [];
/** M06 commands not registered yet; mech.find, mech.derive and arch.find landed with M06-T11, arch.apply with M06-T12. */
const M06_PENDING: readonly string[] = [];
/** M10 commands not registered yet; chase.validate landed with M10-T04 and each card deletes its entry. */
const M10_PENDING: readonly string[] = ["chase.render"];

describe("registered surface (M00-T13 step 1, M01-T05 step 7, M02-T11 step 9, M04-T09, M10-T04)", () => {
  const rows = surfaceRows(["M-S", "M00", "M01", "M02"]);
  const m04 = surfaceRows(["M04"]).flatMap(([, cell]) => mentioned(cell, COMMAND_NAMES));
  const m05 = surfaceRows(["M05"]).flatMap(([, cell]) => mentioned(cell, COMMAND_NAMES));
  const m07 = surfaceRows(["M07"]).flatMap(([, cell]) => mentioned(cell, COMMAND_NAMES));
  /** catalog.find and catalog.pins landed with M08-T04 and M08-T05; M08-T14 pins the exit count. */
  const m08 = surfaceRows(["M08"]).flatMap(([, cell]) => mentioned(cell, COMMAND_NAMES));
  const m06 = surfaceRows(["M06"]).flatMap(([, cell]) => mentioned(cell, COMMAND_NAMES));
  const m10 = surfaceRows(["M10"]).flatMap(([, cell]) => mentioned(cell, COMMAND_NAMES));

  it("registers exactly the commands of the M-S, M00, M01, M02, M04, M05, M06, M07, M08 and M10 rows, less the pending M01, M04, M06 and M10 ones", () => {
    const all = new Set([...rows.flatMap(([, cell]) => mentioned(cell, COMMAND_NAMES)), ...m04, ...m05, ...m06, ...m07, ...m08, ...m10]);
    const want = [...all].filter((n) => !M01_PENDING.includes(n) && !M04_PENDING.includes(n) && !M06_PENDING.includes(n) && !M10_PENDING.includes(n));
    expect(COMMANDS.map((c) => c.name).sort()).toEqual(want.sort());
    expect(COMMANDS.length).toBe(want.length);
  });

  it("every pending command is an M01 row command that is not registered", () => {
    const m01 = new Set(surfaceRows(["M01"]).flatMap(([, cell]) => mentioned(cell, COMMAND_NAMES)));
    for (const n of M01_PENDING) {
      expect(m01.has(n), `${n} is not in an M01 row`).toBe(true);
      expect(COMMANDS.some((c) => c.name === n), `${n} is registered; delete it from M01_PENDING`).toBe(false);
    }
    expect(COMMANDS.some((c) => c.name === "constraints.query")).toBe(true);
  });

  it("no M01 command is pending at the M01 exit (M01-T11 step 4)", () => {
    expect(M01_PENDING).toEqual([]);
  });

  it("the M02 rows add sim.run, sim.sweep, asm.solve and part.probe, in the groups D-106 gives them", () => {
    const m02 = surfaceRows(["M02"]).flatMap(([, cell]) => mentioned(cell, COMMAND_NAMES)).sort();
    expect(m02).toEqual(["asm.solve", "part.probe", "sim.run", "sim.sweep"]);
    for (const n of m02) expect(COMMANDS.find((c) => c.name === n)?.group, n).toBe(COMMAND_GROUP[n as keyof typeof COMMAND_GROUP]);
  });

  it("every pending M04 command is in the M04 row and unregistered; project.graph is registered in group look, CLI only", () => {
    for (const n of M04_PENDING) {
      expect(m04, `${n} is not in the M04 row`).toContain(n);
      expect(COMMANDS.some((c) => c.name === n), `${n} is registered; delete it from M04_PENDING`).toBe(false);
    }
    expect(COMMANDS.find((c) => c.name === "project.graph")?.group).toBe(COMMAND_GROUP["project.graph"]);
    expect(CLI_ONLY).toContain("project.graph");
  });

  it("no M04 command is pending once rules.audit lands, and rules.audit is registered in group prove (M04-T13)", () => {
    expect(M04_PENDING).toEqual([]);
    expect(m04).toContain("rules.audit");
    expect(COMMANDS.find((c) => c.name === "rules.audit")?.group).toBe(COMMAND_GROUP["rules.audit"]);
    expect(COMMAND_GROUP["rules.audit"]).toBe("prove");
    expect(CLI_FORM["rules.audit"]?.flags["chase"]?.field).toBe("chase");
  });

  it("the M05 row adds circuit.solve in group prove; its CLI flags set engine, mcu and pullup and the target sets build (M05-T06)", () => {
    expect(m05).toEqual(["circuit.solve"]);
    expect(COMMANDS.find((c) => c.name === "circuit.solve")?.group).toBe(COMMAND_GROUP["circuit.solve"]);
    expect(COMMAND_GROUP["circuit.solve"]).toBe("prove");
    const form = CLI_FORM["circuit.solve"]!;
    expect(form.target).toBe("build");
    for (const f of ["engine", "mcu", "pullup"]) expect(form.flags[f]?.field, f).toBe(f);
  });

  it("the M06 row adds mech.find, mech.derive, arch.find and arch.apply; every pending one is in the row and unregistered (M06-T11)", () => {
    expect([...m06].sort()).toEqual(["arch.apply", "arch.find", "mech.derive", "mech.find"]);
    for (const n of M06_PENDING) {
      expect(m06, n).toContain(n);
      expect(COMMANDS.some((c) => c.name === n), `${n} is registered; delete it from M06_PENDING`).toBe(false);
    }
    for (const n of m06.filter((x) => !M06_PENDING.includes(x))) expect(COMMANDS.find((c) => c.name === n)?.group, n).toBe(COMMAND_GROUP[n as keyof typeof COMMAND_GROUP]);
  });

  it("the M10 row adds chase.validate, chase.diff, chase.patch and chase.scaffold in their spec group; every pending one is in the row and unregistered (M10-T04)", () => {
    expect(m10).toContain("chase.validate");
    for (const n of M10_PENDING) {
      expect(m10, `${n} is not in the M10 row`).toContain(n);
      expect(COMMANDS.some((c) => c.name === n), `${n} is registered; delete it from M10_PENDING`).toBe(false);
    }
    for (const n of ["chase.validate", "chase.diff", "chase.patch", "chase.scaffold"] as const) expect(COMMANDS.find((c) => c.name === n)?.group, n).toBe(COMMAND_GROUP[n]);
  });

  it("the M07 row adds nest.pack in group make and motion.run in group prove (M07-T14)", () => {
    expect([...m07].sort()).toEqual(["motion.run", "nest.pack"]);
    for (const n of m07) expect(COMMANDS.find((c) => c.name === n)?.group, n).toBe(COMMAND_GROUP[n as keyof typeof COMMAND_GROUP]);
    expect(COMMAND_GROUP["nest.pack"]).toBe("make");
    expect(COMMAND_GROUP["motion.run"]).toBe("prove");
  });

  it("registers exactly the utility verbs of the M-S, M00, M01 and M02 rows, mcp and the release 1 verbs", () => {
    // hbf mcp landed ahead of M12 from the M12-T01 card; the M12 row names it.
    const m12 = surfaceRows(["M12"]).flatMap(([, cell]) => mentioned(cell, UTILITY_VERBS)).filter((v) => v === "mcp");
    expect(m12).toContain("mcp");
    for (const v of R1_VERBS) expect(UTILITY_VERBS, v).toContain(v);
    const want = new Set([...rows.flatMap(([, cell]) => mentioned(cell, UTILITY_VERBS)), ...m12, ...R1_VERBS]);
    expect([...VERBS].sort()).toEqual([...want].sort());
  });

  it("names, groups and CLI forms agree with spec/commands.ts", () => {
    for (const c of COMMANDS) {
      expect(COMMAND_NAMES).toContain(c.name);
      expect(c.group).toBe(COMMAND_GROUP[c.name]);
      expect(CLI_FORM[c.name], c.name).toBeDefined();
    }
    expect(COMMANDS.find((c) => c.name === "export.run")?.writes).toBe("outside");
    // writes "network" marks exactly the commands with a CLI-only field that reaches the network
    for (const c of COMMANDS) expect(c.writes === "network", c.name).toBe(Object.hasOwn(CLI_ONLY_FIELDS, c.name));
  });
});
