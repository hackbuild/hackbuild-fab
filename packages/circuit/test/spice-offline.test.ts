// M05-T01 step 5: the analytic path never resolves eecircuit-engine (D-086).
//
// vi.mock replaces the package for this file's whole module graph and
// counts each time the graph resolves it. Importing the circuit package and
// running its analytic functions must leave the count at zero; loadSpice()
// must move it to one, which proves the spy sees the dynamic import.
// circuit.solve lives in core, which this package may not import (tiers);
// core/test/circuit-solve.test.ts runs `circuit.solve --engine analytic`
// under the same counting mock and asserts zero, then spice and one
// (M05-T06).

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test, vi } from "vitest";

const spy = vi.hoisted(() => ({ resolved: 0 }));

vi.mock("eecircuit-engine", () => {
  spy.resolved += 1;
  class Simulation {
    start(): Promise<void> { return Promise.resolve(); }
    setNetList(): void {}
    runSim(): Promise<never> { return Promise.reject(new Error("mock engine runs nothing")); }
    getInitInfo(): string { return "** ngspice-45.2 : Circuit level simulation program\n"; }
    getError(): string[] { return []; }
  }
  return { Simulation };
});

const SRC = fileURLToPath(new URL("../src/", import.meta.url));

function filesUnder(dir: string): string[] {
  return readdirSync(dir).sort().flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? filesUnder(p) : [p];
  });
}

describe("offline path", () => {
  test("importing the package and running the analytic path resolves eecircuit-engine zero times", async () => {
    const c = await import("../src/index");
    expect(c.rcCrossingUs({ ohm: 1722798, capPf: 9.109, vDrive: 3.3, vRet: 0, vThreshold: 0.8 })).toBeGreaterThan(0);
    expect(c.flexCapBridgeOhm({ ohmCm: 500, colGapMm: 1, colRMm: 1, capTMm: 1 })).toBeGreaterThan(0);
    expect(c.toNetlist({ title: "t", elements: [], analysis: { kind: "op" } })).toBe("* t\n.op\n.end\n");
    expect(c.constraintDefs.length).toBeGreaterThan(0);
    expect(spy.resolved).toBe(0);

    const engine = await c.loadSpice();
    expect(spy.resolved).toBe(1);
    expect(engine.ngspice).toBe("45.2");
  });

  test("only src/spice/engine.ts names the package, and only through import()", () => {
    const hits = filesUnder(SRC).filter((f) => readFileSync(f, "utf8").includes('"eecircuit-engine"'));
    expect(hits.map((f) => relative(SRC, f))).toEqual(["spice/engine.ts"]);
    const text = readFileSync(join(SRC, "spice/engine.ts"), "utf8");
    const code = text.split("\n").filter((l) => !l.trimStart().startsWith("//"));
    // Module references only; the BuildInputs licence key "eecircuit-engine" is a string, not a module.
    const uses = code.filter((l) => /\b(?:import|require|from)\b[^"]*"eecircuit-engine"/.test(l));
    expect(uses).toHaveLength(1);
    expect(uses[0]).toMatch(/await import\("eecircuit-engine"\)/);
  });

  test.todo("M09 bake suite: the default bake contains no eecircuit-engine bytes and its manifest lists no LGPL item");
});
