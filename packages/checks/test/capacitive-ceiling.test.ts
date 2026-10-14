// CHK-NET-28 run body (M05-T12): the capacitive path ceiling on a net that
// ends at a capacitive port, read through views.circuit. The ceiling is
// read here from packages/profile/data/constants.json raw, and the seed row
// from packages/checks/seed/checks.seed.json raw, never from the code under
// test. The Capricate figures are the card's (capricate.txt lines 407 to 416).

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import type { CheckResult, Net, Part, PortFeature, SeriesSceneDecl } from "@hackbuild/spec";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { solveSeriesScene, type SeriesPort } from "@hackbuild/circuit";
import { CHECK_MODULES, kernelsAt, registerChecks, runRegistry } from "../src/index";

const read = (rel: string): string => readFileSync(new URL(`../../../${rel}`, import.meta.url), "utf8");
const seed = JSON.parse(read("packages/checks/seed/checks.seed.json")) as { checks: { id: string; version: string; pending?: string; constraint?: string; origin: { project: string; numbers?: Record<string, string>; evidence: string | null } }[] };
const CEIL = (JSON.parse(read("packages/profile/data/constants.json")) as { constants: { id: string; value: number }[] }).constants.find((c) => c.id === "capacitive.pathCeilOhm")!.value;
const defs = registerChecks({ seed }, CHECK_MODULES).filter((d) => d.id === "CHK-NET-28");
const profile = createProfileLookup(loadProfile());

/** A net record with its hi end at `ohm` and no contacts. */
const netOf = (id: string, ohm: number, unpriced: readonly string[] = []): Net => ({
  id, conductors: [], bodies: [], terminals: [`port.${id}`], resistance: [], bulkOhm: ohm, contacts: [], totalOhm: [ohm, ohm],
  unpricedContacts: unpriced, capToGndPf: 0, couplingPf: {}, capMethod: "pip-per-mm", tier: "community", qualifier: unpriced.length > 0 ? "unknown" : "computed",
});
const portOf = (net: string, iface: string): PortFeature => ({ kind: "port", id: `port.${net}`, net, type: "signal", interface: iface });

async function run(nets: readonly Net[], ports: readonly PortFeature[], series: readonly SeriesPort[] = []): Promise<readonly CheckResult[]> {
  const part = { id: "touch", machine: "ffc5p", bodies: [], features: ports, metrics: [], assertions: [], warnings: [] } as unknown as Part;
  const byPort = new Map(series.map((s) => [s.port, s] as const));
  const report = await runRegistry(defs, {
    kernels: kernelsAt("M05"),
    targets: { parts: [part], nets: nets.map((net) => ({ net, part })) },
    ctx: { profile, machine: "ffc5p", whitelist: new Map(), hookup: [] },
    views: { circuit: (p, port) => (p === "touch" ? byPort.get(port) : undefined) },
  });
  return report.results;
}

const scene = (nets: SeriesSceneDecl["nets"]): SeriesSceneDecl => ({
  material: "cabs",
  electrodes: [{ id: "electrode.d10", diameterMm: 10, tMm: 0.2 }],
  leads: [{ id: "lead.min", lengthMm: 100, widthMm: 0.8, tMm: 0.2 }],
  nets,
});

async function seriesRun(nets: SeriesSceneDecl["nets"]): Promise<readonly CheckResult[]> {
  const solved = solveSeriesScene(scene(nets), profile);
  return run(solved.map((s) => netOf(s.net, s.conductorOhm)), solved.map((s) => portOf(s.net, s.interface)), solved);
}

describe("CHK-NET-28 seed row (M05-T12 step 2)", () => {
  const row = seed.checks.find((r) => r.id === "CHK-NET-28")!;
  test("backed by circuit/capacitive-path-ceiling, landed (no pending), Capricate sweep in its origin", () => {
    expect([row.version, row.pending, row.constraint]).toEqual(["1.0.1", undefined, "circuit/capacitive-path-ceiling"]);
    expect(row.origin.project).toMatch(/^Capricate, UIST 2015/);
    expect(row.origin.numbers).toEqual({ resistorsKohm: "20 to 120 in steps of 10 (measured by others)", electrodesMm: "5, 10, 15, 20 (measured by others)" });
    expect(row.origin.evidence).toMatch(/web-hci-fab-research\/capricate\.txt$/);
    expect(CHECK_MODULES.find((m) => m.id === "CHK-NET-28")?.run).toBeTypeOf("function");
  });
});

describe("CHK-NET-28 on declared series nets", () => {
  test("20 and 30 kohm pass, 30 kohm on the bound; 40 kohm fails naming the ceiling and Capricate", async () => {
    const r = await seriesRun([20000, 30000, 40000].map((ohm) => ({ net: `D10-R${ohm / 1000}`, interface: "capacitive", electrode: "electrode.d10", resistorOhm: ohm, leads: [] })));
    expect(r.map((x) => [x.target, x.verdict, x.measured])).toEqual([
      [{ level: "net", part: "touch", net: "D10-R20" }, "pass", 20000],
      [{ level: "net", part: "touch", net: "D10-R30" }, "pass", 30000],
      [{ level: "net", part: "touch", net: "D10-R40" }, "fail", 40000],
    ]);
    for (const x of r) expect(x.legal).toEqual({ kind: "interval", lo: null, hi: CEIL, unit: "ohm", nearest: Math.min(x.measured as number, CEIL) });
    const fail = r[2]!;
    expect(fail.constraint).toMatch(/at most 30000 ohm/);
    expect(fail.constraint).toMatch(/capacitive\.pathCeilOhm/);
    expect(fail.constraint).toMatch(/Capricate/);
    expect(fail.constraint).toMatch(/fix: bring the path to at most 30000 ohm/);
    expect(fail.extra).toMatchObject({ resistorOhm: 40000, leadMm: 0, conductorOhm: 0, ceilingOhm: CEIL, electrode: "electrode.d10" });
  });

  test("measured is the resistor plus the lead share: 29 kohm with the 100 mm trace fails", async () => {
    const r = await seriesRun([{ net: "R29-LEAD", interface: "capacitive", resistorOhm: 29000, leads: ["lead.min"] }]);
    const lead = (0.4382 * 10 * 100) / (0.8 * 0.2);
    expect(r[0]!.verdict).toBe("fail");
    expect(Math.abs((r[0]!.measured as number) - (29000 + lead))).toBeLessThan(1e-6);
  });

  test("the minimal trace alone passes at 2738.75 ohm", async () => {
    const r = await seriesRun([{ net: "TRACE-MIN", interface: "capacitive", resistorOhm: 0, leads: ["lead.min"] }]);
    expect(r[0]!.verdict).toBe("pass");
    expect(Math.abs((r[0]!.measured as number) - 2738.75)).toBeLessThan(1e-6);
  });
});

describe("CHK-NET-28 on other nets", () => {
  test("a net with no capacitive port is skipped: the ceiling never reads a pullup or touch port", async () => {
    const r = await run([netOf("K1", 120000), netOf("T1", 900000)], [portOf("K1", "digital"), portOf("T1", "touch")]);
    expect(r.map((x) => [x.verdict, x.constraint])).toEqual([
      ["skip", "net K1 has no port of interface capacitive"],
      ["skip", "net T1 has no port of interface capacitive"],
    ]);
  });

  test("an extracted capacitive net reads Net.totalOhm hi end; with an unpriced contact a pass reports warn", async () => {
    const r = await run([netOf("E1", 12000), netOf("E2", 12000, ["pad.e2"]), netOf("E3", 31000)], [portOf("E1", "capacitive"), portOf("E2", "capacitive"), portOf("E3", "capacitive")]);
    expect(r.map((x) => [x.verdict, x.measured])).toEqual([["pass", 12000], ["warn", 12000], ["fail", 31000]]);
    expect(r[1]!.constraint).toMatch(/1 contacts unpriced, path a lower bound/);
  });
});
