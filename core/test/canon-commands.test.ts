// mech.find, mech.derive and arch.find (M06-T11): the acceptance lines of
// the card through the CLI in process, the run bodies for the paths the
// CLI cannot reach (NaN arriving over MCP or HTTP), and the hbf://mechanism
// and hbf://archetype resources. Expected numbers come from the originals'
// committed records (the STIPPLE latch record, the TUMBLER legacy record),
// never from the port that computes them.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { isThrownCommandError, type CanonHit, type DerivedValue } from "@hackbuild/spec";
import { mechanisms } from "@hackbuild/mechanisms";
import { archetypes } from "../src/canon.js";
import { runMechDerive } from "../src/commands/mech.derive.js";
import { explainUri } from "../src/commands/explain.js";
import type { CoreCtx } from "../src/ctx.js";
import { ROOT, json } from "./hbf.js";
import { originalPath } from "../../tools/test-support/originals-root.js";

const ORIG = originalPath("");
const ctx = { inputsHash: "0".repeat(64) } as unknown as CoreCtx;

/** The thrown CommandError of a run body. */
function thrown(f: () => unknown): { code: string; path?: string; hint: string; expected?: string } {
  try {
    f();
  } catch (e) {
    if (isThrownCommandError(e)) return e.hbf;
    throw e;
  }
  throw new Error("no error thrown");
}

const hits = (r: { result?: unknown }): CanonHit[] => (r.result as { hits: CanonHit[] }).hits;
const derived = (r: { result?: unknown }): Record<string, DerivedValue> => (r.result as { derived: Record<string, DerivedValue> }).derived;

describe("mech.find (M06-T11 step 1)", () => {
  it("geneva: first hit geneva-external with the registry's status, its original and its reference ids", async () => {
    const { code, r } = await json("mech.find", "geneva");
    expect(code).toBe(0);
    const h = hits(r)[0]!;
    const def = mechanisms.resolve("geneva-external").def;
    expect(h.id).toBe("geneva-external");
    expect(h.status).toBe(def.status);
    expect(h.reference).toEqual(def.reference);
    expect(h.original?.[0]?.slug).toBe("knurl");
    expect(h.uri).toBe("hbf://mechanism/geneva-external");
  });

  it("typed entries rank before every refused one, and each refused hit carries its reason", async () => {
    const { r } = await json("mech.find", "detent");
    const list = hits(r);
    expect(list.length).toBeGreaterThan(1);
    const firstRefused = list.findIndex((h) => h.status !== "typed");
    if (firstRefused >= 0) expect(list.slice(firstRefused).every((h) => h.status !== "typed")).toBe(true);
    for (const h of list.filter((x) => x.status !== "typed")) expect(h.statusReason, h.id).toMatch(/\S/);
  });

  it("detent lists the four M06-T14 detents as candidates with their originals, after every typed hit", async () => {
    const { r } = await json("mech.find", "detent");
    const list = hits(r);
    const lastTyped = list.map((h) => h.status).lastIndexOf("typed");
    for (const id of ["leaf-spring-detent-drum", "flexure-finger-spinner", "slide-detent-in-plane", "leaf-detent-pin"]) {
      const i = list.findIndex((h) => h.id === id);
      expect(i, id).toBeGreaterThan(lastTyped);
      expect(list[i]!.status, id).toBe("candidate");
      expect(list[i]!.original?.[0]?.file, id).toMatch(/\S/);
    }
  });

  it("arch.find slide lists skin-bridge-slider and touch-segment-slider as candidates with their originals (M06-T14)", async () => {
    const { r } = await json("arch.find", "--behaviour", "slide");
    for (const id of ["skin-bridge-slider", "touch-segment-slider"]) {
      const h = hits(r).find((x) => x.id === id);
      expect(h?.status, id).toBe("candidate");
      expect(h?.original?.[0]?.slug, id).toMatch(/\S/);
    }
  });

  it("family and process narrow the hits", async () => {
    const { r } = await json("mech.find", "snap", "--family", "snap");
    expect(hits(r).length).toBeGreaterThan(0);
    expect(hits(r).every((h) => h.family === "snap")).toBe(true);
    const { r: laser } = await json("mech.find", "hinge", "--process", "laser");
    expect(hits(laser).every((h) => h.processes.includes("laser"))).toBe(true);
    expect(hits(laser).map((h) => h.id)).toContain("living-hinge");
    // count-wheel-detent carries processes ["fdm"]: a hit without the filter, none with --process laser
    expect(hits((await json("mech.find", "detent")).r).map((h) => h.id)).toContain("count-wheel-detent");
    expect(hits((await json("mech.find", "detent", "--process", "laser")).r).map((h) => h.id)).not.toContain("count-wheel-detent");
  });
});

describe("mech.derive (M06-T11 step 2)", () => {
  it("genva: exit 2, E_REF with didYouMean geneva-external", async () => {
    const { code, r } = await json("mech.derive", "genva");
    expect(code).toBe(2);
    expect(r.errors[0]!.code).toBe("E_REF");
    expect(r.errors[0]!.didYouMean).toContain("geneva-external");
  });

  it("count-wheel-detent E=NaN: exit 2, E_PARAM_MISSING naming E, on the cli and in the run body", async () => {
    const { code, r } = await json("mech.derive", "count-wheel-detent", "--params", "E=NaN");
    expect(code).toBe(2);
    expect(r.errors[0]!.code).toBe("E_PARAM_MISSING");
    expect(r.errors[0]!.path).toBe("/params/E");
    const e = thrown(() => runMechDerive({ id: "count-wheel-detent", params: { E: Number.NaN } }, ctx));
    expect(e.code).toBe("E_PARAM_MISSING");
    expect(e.path).toBe("/params/E");
    expect(e.hint).toContain("E");
    // non-finite, not only NaN: Infinity arrives over MCP or HTTP from JSON 1e999
    const inf = thrown(() => runMechDerive({ id: "count-wheel-detent", params: { E: Number.POSITIVE_INFINITY } }, ctx));
    expect(inf.code).toBe("E_PARAM_MISSING");
    expect(inf.path).toBe("/params/E");
  });

  it("counterbalance-band: exit 2, E_REF naming status candidate and the reason owner milestone unassigned", async () => {
    const { code, r } = await json("mech.derive", "counterbalance-band");
    expect(code).toBe(2);
    const e = r.errors[0]!;
    expect(e.code).toBe("E_REF");
    const def = mechanisms.resolve("counterbalance-band").def;
    expect(e.hint).toBe(`mechanism counterbalance-band is candidate: ${def.statusReason}`);
    expect(e.hint).toContain("owner milestone unassigned");
    expect(e.expected).toContain("originals/derrick/files/src/arm_build.py");
  });

  it("an unknown param key is E_SCHEMA naming the key", async () => {
    const { code, r } = await json("mech.derive", "living-hinge", "--params", "{\"nope\": 1}");
    expect(code).toBe(2);
    expect(r.errors[0]!.code).toBe("E_SCHEMA");
    expect(r.errors[0]!.path).toBe("/params/nope");
  });

  it("living-hinge at the bench defaults: the TUMBLER record's per row 12.9 deg, every output with unit and qualifier, origin hbf://mechanism", async () => {
    const legacy = JSON.parse(readFileSync(path.join(ROOT, "reference/mechanisms/living-hinge/expected/legacy.json"), "utf8")) as { readouts: [string, string][] };
    const perRow = Number.parseFloat(legacy.readouts.find(([k]) => k === "per row")![1]);
    const { code, r } = await json("mech.derive", "living-hinge");
    expect(code).toBe(0);
    const d = derived(r);
    expect(d["degPerRow"]!.value.toFixed(1)).toBe(perRow.toFixed(1));
    for (const [k, v] of Object.entries(d)) {
      expect(v.unit, k).toMatch(/\S/);
      expect(v.qualifier, k).toMatch(/^(measured|computed|vendor|inferred|unknown)$/);
    }
    expect((r.result as { origin: string }).origin).toBe("hbf://mechanism/living-hinge");
    expect((r.result as { inputs: Record<string, number> }).inputs["rows"]).toBeGreaterThan(0);
  });

  it("pin-free-balance-beam at R17b defaults: the STIPPLE latch record's half select rise 2.500 mm and tilt 24.624 deg, or the candidate refusal", async () => {
    const rec = JSON.parse(readFileSync(path.join(ORIG, "stipple/files/derived/stipple_latch.json"), "utf8")) as Record<string, { half_rise: number; tilt_max: number }>;
    const r17b = rec["stipple (1).html"]!;
    const def = mechanisms.resolve("pin-free-balance-beam").def;
    const { code, r } = await json("mech.derive", "pin-free-balance-beam");
    if (def.status !== "typed") {
      expect(code).toBe(2);
      expect(r.errors[0]!.hint).toBe(`mechanism pin-free-balance-beam is ${def.status}: ${def.statusReason}`);
      return;
    }
    expect(code).toBe(0);
    const d = derived(r);
    expect(d["halfSelectRise"]!.value.toFixed(3)).toBe(r17b.half_rise.toFixed(3));
    expect(d["tiltMax"]!.value.toFixed(3)).toBe(r17b.tilt_max.toFixed(3));
  });

  it("leaf-spring-detent-drum: exit 2, E_REF naming status candidate and its original, cotter-src/src/modules2.js lines 38 to 65 (M06-T14)", async () => {
    const { code, r } = await json("mech.derive", "leaf-spring-detent-drum");
    expect(code).toBe(2);
    const e = r.errors[0]!;
    expect(e.code).toBe("E_REF");
    expect(e.hint).toMatch(/^mechanism leaf-spring-detent-drum is candidate: /);
    expect(e.expected).toContain("cotter-src/src/modules2.js lines 38 to 65");
  });

  it("every refused entry refuses with the hint mechanism <id> is <status>: <reason>", () => {
    for (const e of mechanisms.entries.filter((x) => x.def.status !== "typed")) {
      const got = thrown(() => runMechDerive({ id: e.id }, ctx));
      expect(got.code, e.id).toBe("E_REF");
      expect(got.hint, e.id).toBe(`mechanism ${e.id} is ${e.def.status}: ${e.def.statusReason}`);
    }
  });
});

describe("arch.find (M06-T11 step 3)", () => {
  it("press on fdm lists click-spring-key, flex-cone-key and dome-button, proven first, each with tier and resistances from the working rows", async () => {
    const { code, r } = await json("arch.find", "--behaviour", "press", "--process", "fdm");
    expect(code).toBe(0);
    const list = hits(r);
    const ids = list.map((h) => h.id);
    for (const id of ["click-spring-key", "flex-cone-key", "dome-button"]) expect(ids, id).toContain(id);
    const firstRefused = list.findIndex((h) => h.status !== "proven");
    expect(list.slice(firstRefused).every((h) => h.status !== "proven")).toBe(true);
    for (const h of list) {
      expect(h.tier, h.id).toBe(archetypes.resolve(h.id).def.tier);
      expect(h.processes, h.id).toContain("fdm");
    }
    for (const id of ["click-spring-key", "flex-cone-key"]) {
      const h = list.find((x) => x.id === id)!;
      const sections = archetypes.resolve(id).def.sections ?? [];
      expect(h.resistances?.map((x) => x.id), id).toEqual(sections.map((s) => s.id));
      for (const x of h.resistances ?? []) expect(x.rowId, `${id} ${x.id}`).toMatch(/\S/);
    }
  });

  it("press on laser lists graded-slider-wiper, a copper family archetype the vinyl and laser processes carry", async () => {
    const { code, r } = await json("arch.find", "--behaviour", "press", "--process", "laser");
    expect(code).toBe(0);
    expect(hits(r).map((h) => h.id)).toContain("graded-slider-wiper");
    for (const h of hits(r)) expect(h.processes, h.id).toContain("laser");
  });

  it("channels keeps only archetypes that fit the channels available", async () => {
    const { r } = await json("arch.find", "--behaviour", "slide", "--channels", "1");
    for (const h of hits(r)) expect(h.channels === null || (h.channels ?? 0) <= 1, h.id).toBe(true);
  });

  it("channels at the boundary: an archetype needing exactly the channels available is kept, one fewer drops it", async () => {
    const all = hits((await json("arch.find", "--behaviour", "slide")).r);
    const c = Math.max(...all.map((h) => h.channels ?? 0));
    expect(c).toBeGreaterThan(1);
    const atC = all.filter((h) => h.channels === c).map((h) => h.id);
    const kept = hits((await json("arch.find", "--behaviour", "slide", "--channels", String(c))).r).map((h) => h.id);
    for (const id of atC) expect(kept, id).toContain(id);
    const under = hits((await json("arch.find", "--behaviour", "slide", "--channels", String(c - 1))).r).map((h) => h.id);
    for (const id of atC) expect(under, id).not.toContain(id);
  });
});

describe("hbf://mechanism and hbf://archetype (M06-T11 step 5)", () => {
  it("a mechanism resolves to its def, the text of its derive() and its outputs at the defaults", async () => {
    const r = await explainUri("hbf://mechanism/living-hinge", ROOT);
    const v = r.value as { id: string; deriveSource: string; atDefaults: Record<string, DerivedValue> | null };
    expect(v.id).toBe("living-hinge");
    expect(v.deriveSource).toMatch(/derive/i);
    expect(v.atDefaults?.["degPerRow"]?.equation).toBe("bend / rows");
  });

  it("an archetype resolves to its def with apply() and derive() text", async () => {
    const r = await explainUri("hbf://archetype/flex-cone-key", ROOT);
    const v = r.value as { id: string; deriveSource: string; applySource: string };
    expect(v.id).toBe("flex-cone-key");
    expect(v.applySource.length).toBeGreaterThan(0);
  });

  it("an unknown id is E_HANDLE with near uris", async () => {
    await expect(explainUri("hbf://mechanism/genva-external", ROOT)).rejects.toSatisfy((e: unknown) =>
      isThrownCommandError(e) && e.hbf.code === "E_HANDLE" && (e.hbf.didYouMean ?? []).includes("hbf://mechanism/geneva-external"));
  });
});
