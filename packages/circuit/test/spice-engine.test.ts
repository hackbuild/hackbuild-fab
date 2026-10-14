// M05-T01: eecircuit-engine 1.8.0 (ngspice 45.2) against the analytic path.
//
// Inputs are the card's (docs/plan/milestones/M05-circuit-copper.md,
// M05-T01 acceptance): the divider V1 1 0 5, R1 1 2 1k, R2 2 0 1k, and the
// PIP LEFT key RC discharge, R 1722798 ohm, C 9.109 pF, initial 3.3 V,
// .tran 0.01u 60u UIC, crossing 0.8 V. The expected crossing 22.238 us is
// the card's computed figure (relative difference 1.36e-8 recorded there,
// from /Users/obsidian/Projects/hackbuild/fab-knowledge/evidence/scratch/c9/m05rc.mjs).
// The analytic side of the RC is the package's one rcCrossingUs. The
// divider's analytic side is the closed form until M05-T03 lands the nodal
// solver, which then joins this comparison.
// No timing is asserted: start and .op figures are one machine's (C9).

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { isThrownCommandError } from "@hackbuild/spec";
import {
  EECIRCUIT_LICENCE, crossingUs, loadSpice, ngspiceVersion, nodeVolts, rcCrossingUs, spiceBuildInputs, toNetlist,
  type OperatingPointInput,
} from "../src/index";

const divider: OperatingPointInput = {
  title: "divider",
  elements: [
    { kind: "V", name: "1", pos: "1", neg: "0", volts: 5 },
    { kind: "R", name: "1", a: "1", b: "2", ohm: 1000 },
    { kind: "R", name: "2", a: "2", b: "0", ohm: 1000 },
  ],
  analysis: { kind: "op" },
};

const LEFT = { ohm: 1722798, capPf: 9.109, v0: 3.3, vth: 0.8 } as const;

const leftRelease: OperatingPointInput = {
  title: "pip left key charge release",
  elements: [
    { kind: "R", name: "1", a: "1", b: "0", ohm: LEFT.ohm },
    { kind: "C", name: "1", a: "1", b: "0", pf: LEFT.capPf, icV: LEFT.v0 },
  ],
  analysis: { kind: "tran", stepUs: 0.01, stopUs: 60 },
};

describe("toNetlist", () => {
  test("divider deck", () => {
    expect(toNetlist(divider)).toBe("* divider\nV1 1 0 5\nR1 1 2 1000\nR2 2 0 1000\n.op\n.end\n");
  });

  test("RC deck carries IC and UIC, the m05rc.mjs line shapes", () => {
    expect(toNetlist(leftRelease)).toBe(
      "* pip left key charge release\nR1 1 0 1722798\nC1 1 0 9.109p IC=3.3\n.tran 0.01u 60u UIC\n.end\n",
    );
  });

  test("no UIC without an initial condition", () => {
    const noIc: OperatingPointInput = {
      ...leftRelease,
      elements: [{ kind: "R", name: "1", a: "1", b: "0", ohm: 1 }, { kind: "C", name: "1", a: "1", b: "0", pf: 1 }],
    };
    expect(toNetlist(noIc)).toContain(".tran 0.01u 60u\n");
  });

  test("a value cannot open a second line", () => {
    const bad: OperatingPointInput = { ...divider, elements: [{ kind: "R", name: "1\n.include x", a: "1", b: "0", ohm: 1 }] };
    let caught: unknown;
    try { toNetlist(bad); } catch (e) { caught = e; }
    expect(isThrownCommandError(caught) && caught.hbf.code).toBe("E_SCHEMA");
    expect(() => toNetlist({ ...divider, elements: [{ kind: "R", name: "1", a: "1", b: "0", ohm: Number.NaN }] })).toThrow();
  });
});

describe("ngspice on demand", () => {
  test("divider node 2 is 2.5 V from both engines within 1e-9 V (computed)", async () => {
    const spice = await loadSpice();
    const r = await spice.run(divider);
    expect(r.plot).toBe("Operating Point");
    const analytic = (5 * 1000) / (1000 + 1000);
    expect(analytic).toBe(2.5);
    expect(Math.abs(nodeVolts(r, "2") - 2.5)).toBeLessThan(1e-9);
    expect(Math.abs(nodeVolts(r, "2") - analytic)).toBeLessThan(1e-9);
  });

  test("LEFT RC crossing 22.238 us from ngspice and from rcCrossingUs, relative difference under 1e-6 (computed)", async () => {
    const spice = await loadSpice();
    const r = await spice.run(leftRelease);
    const ng = crossingUs(r, "1", LEFT.vth);
    const an = rcCrossingUs({ ohm: LEFT.ohm, capPf: LEFT.capPf, vDrive: LEFT.v0, vRet: 0, vThreshold: LEFT.vth });
    expect(ng).not.toBeNull();
    expect((ng as number).toFixed(3)).toBe("22.238");
    expect(an.toFixed(3)).toBe("22.238");
    expect(Math.abs(((ng as number) - an) / an)).toBeLessThan(1e-6);
  });

  test("one cached engine; version and licence for BuildInputs", async () => {
    const a = await loadSpice();
    const b = await loadSpice();
    expect(b).toBe(a);
    expect(a.ngspice).toBe("45.2");
    const bi = spiceBuildInputs(a);
    expect(bi.engines).toEqual({ ngspice: "45.2" });
    // The audited value is tools/licences.json's, never a second copy (LICENSING.md 4.1).
    const table = JSON.parse(readFileSync(new URL("../../../tools/licences.json", import.meta.url), "utf8")) as {
      dependencies: { ecosystem: string; name: string; version: string; audited: string; load: string }[];
    };
    const row = table.dependencies.find((d) => d.ecosystem === "npm" && d.name === "eecircuit-engine" && d.version === "1.8.0");
    expect(row?.load).toBe("lazy-separate-file");
    expect(bi.licences).toEqual({ "eecircuit-engine": row?.audited });
    expect(EECIRCUIT_LICENCE).toBe(row?.audited);
  });

  test("ngspiceVersion reads the init banner", () => {
    expect(ngspiceVersion("******\n** ngspice-45.2 : Circuit level simulation program\n")).toBe("45.2");
    expect(() => ngspiceVersion("no banner")).toThrow();
  });
});
