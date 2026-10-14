// Search to build hand-off: a canon search returns a bounded page an MCP
// host accepts, each reference id a hit names resolves as a part.build
// chase, and a sheet part proposes no export its machine cannot take.

import path from "node:path";
import { describe, expect, it } from "vitest";
import type { CanonHit } from "@hackbuild/spec";
import { HIT_CAP, words } from "../src/commands/canon-hits.js";
import { resolveTarget } from "../src/load-build.js";
import { ROOT, json } from "./hbf.js";

const hits = (r: { result?: unknown }): CanonHit[] => (r.result as { hits: CanonHit[] }).hits;

describe("canon search page", () => {
  it("function words match nothing: a query of only function words returns no hit", async () => {
    expect(words("print in place")).toEqual(["print", "place"]);
    const { code, r } = await json("mech.find", "in");
    expect(code).toBe(0);
    expect(hits(r)).toEqual([]);
  });

  it("a four word query returns at most HIT_CAP hits, ratchet-pawl first, and counts the rest in truncated", async () => {
    const { r } = await json("mech.find", "ratchet pawl print in place");
    const list = hits(r);
    expect(list.length).toBeLessThanOrEqual(HIT_CAP);
    expect(list[0]?.id).toBe("ratchet-pawl");
    expect(r.truncated?.omitted).toBeGreaterThan(0);
    // 25000 tokens at 4 bytes a token (AGENT-SURFACE.md estimator) is the host limit the uncapped page crossed.
    expect(JSON.stringify(r).length).toBeLessThan(100_000);
  });

  it("a query with more than HIT_CAP hits sets truncated.omitted to the hits left out", async () => {
    const { r } = await json("mech.find", "snap");
    expect(hits(r)).toHaveLength(HIT_CAP);
    expect(r.truncated?.omitted).toBeGreaterThan(0);
  });
});

describe("canon reference ids resolve as chases", () => {
  it("every reference a mechanism or archetype hit names resolves to reference/<area>/<id>", async () => {
    const refs = [
      ...hits((await json("mech.find", "ratchet pawl")).r),
      ...hits((await json("arch.find", "--behaviour", "press", "--process", "fdm")).r),
    ].flatMap((h) => h.reference ?? []);
    expect(refs).toContain("mechanisms/ratchet-pawl");
    for (const ref of refs) {
      expect(resolveTarget(ref, ROOT, ROOT), ref).toBe(path.join(ROOT, "reference", ...ref.split("/")));
    }
  });

  it("part.build takes the registry form mechanisms/ratchet-pawl", async () => {
    const { code, r } = await json("part.build", "mechanisms/ratchet-pawl");
    expect(r.errors).toEqual([]);
    expect(code).toBe(0);
  }, 120_000);
});

describe("exports a sheet part is offered", () => {
  it("part.build on a laser part proposes no 3mf export", async () => {
    const { r } = await json("part.build", "reference/mechanisms/coincidence-and");
    expect(r.verdict).not.toBe("fail");
    expect(r.next.filter((n) => n.command === "export.run")).toEqual([]);
  }, 120_000);

  it("export.run kind 3mf on a laser part is E_SCHEMA at /kind naming the machine and the sheet exporters", async () => {
    const { code, r } = await json("export.run", "reference/mechanisms/coincidence-and", "--kind", "3mf");
    expect(code).toBe(2);
    const e = r.errors[0]!;
    expect(e).toMatchObject({ code: "E_SCHEMA", path: "/kind", got: "3mf" });
    expect(e.didYouMean ?? []).not.toContain("sheet600");
    expect(e.hint).toMatch(/sheet600, a laser machine/);
    expect(e.hint).toMatch(/svg-cut/);
  }, 120_000);
});
