// M00-T02 load rules (D-099, D-083, PROFILE.md 2.2 and 2.4), fit classes
// (D-100) and constants (PROFILE.md 10).

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { TIERS, isThrownCommandError, type FitClassId, type Tier } from "@hackbuild/spec";
import { PROFILE_DATA, createProfileLookup, loadProfile, refError, tablesFromData, tierRank } from "../src/index";

const tables = loadProfile();
const seed = JSON.parse(readFileSync(new URL("../seed/profile.seed.json", import.meta.url), "utf8")) as {
  materials: { id: string; provenance: { tier: Tier } }[];
  machines: { id: string; provenance: { tier: Tier } }[];
  constants: { id: string; value: number | number[]; provenance: { tier: Tier } }[];
};

function errOf(f: () => unknown): { code?: string; path?: string; got?: unknown; expected?: string; hint?: string; didYouMean?: readonly string[] } {
  try {
    f();
  } catch (e) {
    if (isThrownCommandError(e)) return e.hbf;
    throw e;
  }
  return {};
}

type Json = Record<string, unknown>;
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

/** Every provenance record in the data files, with its JSON path. */
function provenances(x: unknown, path = ""): { path: string; tier: Tier; method: string; source: string }[] {
  if (Array.isArray(x)) return x.flatMap((v, i) => provenances(v, `${path}/${i}`));
  if (typeof x !== "object" || x === null) return [];
  const out: { path: string; tier: Tier; method: string; source: string }[] = [];
  for (const [k, v] of Object.entries(x as Json)) {
    if (k === "provenance") out.push({ path: `${path}/provenance`, ...(v as { tier: Tier; method: string; source: string }) });
    else out.push(...provenances(v, `${path}/${k}`));
  }
  return out;
}

describe("load rules", () => {
  test("a row with no tier fails with E_SCHEMA", () => {
    const m = clone(PROFILE_DATA.materials) as { materials: Json[] };
    delete (m.materials[0]?.["provenance"] as Json)["tier"];
    const e = errOf(() => tablesFromData({ ...PROFILE_DATA, materials: m }));
    expect([e.code, e.path]).toEqual(["E_SCHEMA", "/materials/0/provenance/tier"]);
    const c = clone(PROFILE_DATA.constants) as { constants: Json[] };
    delete (c.constants[0]?.["provenance"] as Json)["tier"];
    expect(errOf(() => tablesFromData({ ...PROFILE_DATA, constants: c })).code).toBe("E_SCHEMA");
  });

  test("a measured row without a coupon record fails with E_PROVENANCE", () => {
    const l = clone(PROFILE_DATA.loss) as { loss: Json[] };
    const row = l.loss[0] as Json;
    row["provenance"] = { ...(row["provenance"] as Json), tier: "measured", method: "coupon", machine: "ffc5p" };
    expect(errOf(() => tablesFromData({ ...PROFILE_DATA, loss: l })).code).toBe("E_PROVENANCE");
    (row["provenance"] as Json)["coupon"] = "fit-gauge-0001";
    expect(errOf(() => tablesFromData({ ...PROFILE_DATA, loss: l })).code).toBe("E_PROVENANCE");
    expect(errOf(() => tablesFromData({ ...PROFILE_DATA, loss: l }, { coupons: ["fit-gauge-0001"] })).code).toBeUndefined();
  });

  test("an fdm material without handling fails with E_SCHEMA", () => {
    const m = clone(PROFILE_DATA.materials) as { materials: Json[] };
    delete m.materials[0]?.["handling"];
    expect(errOf(() => tablesFromData({ ...PROFILE_DATA, materials: m })).code).toBe("E_SCHEMA");
  });

  test("every row in data carries a tier, a method and a source; none is measured or verified", () => {
    const all = Object.values(PROFILE_DATA).flatMap((d) => provenances(d));
    expect(all.length).toBeGreaterThan(50);
    for (const p of all) {
      expect(TIERS).toContain(p.tier);
      expect(p.source.length).toBeGreaterThan(0);
      expect(["measured", "verified"]).not.toContain(p.tier);
    }
  });

  test("no import raises a seeded tier", () => {
    const loaded = new Map<string, Tier>([
      ...tables.materials.map((m) => [`material:${m.id}`, m.provenance.tier] as const),
      ...tables.machines.map((m) => [`machine:${m.id}`, m.provenance.tier] as const),
      ...(tables.constants?.constants ?? []).map((c) => [`constant:${c.id}`, c.provenance.tier] as const),
    ]);
    const seeded: [string, Tier][] = [
      ...seed.materials.map((m) => [`material:${m.id}`, m.provenance.tier] as [string, Tier]),
      ...seed.machines.map((m) => [`machine:${m.id}`, m.provenance.tier] as [string, Tier]),
      ...seed.constants.map((c) => [`constant:${c.id}`, c.provenance.tier] as [string, Tier]),
    ];
    let compared = 0;
    for (const [key, t] of seeded) {
      const now = loaded.get(key);
      if (now === undefined) continue;
      compared += 1;
      expect(tierRank(now), key).toBeGreaterThanOrEqual(tierRank(t));
    }
    expect(compared).toBeGreaterThan(15);
  });
});

describe("fit classes (D-100)", () => {
  test("PSLIDE returns E_REF naming PSLIP", () => {
    const p = createProfileLookup(tables);
    const e = errOf(() => p.fit("PSLIDE" as FitClassId));
    expect(e.code).toBe("E_REF");
    expect(e.didYouMean?.[0]).toBe("PSLIP");
    expect(e.hint).toContain("D-100");
  });

  test("PSLIP is laser in fdm, real 0.15 to 0.275 per side; its print-over is the 0.075 per side loss row", () => {
    const p = createProfileLookup(tables);
    const b = p.fit("PSLIP" as FitClassId);
    expect([b.processes, b.realLoPerSide, b.realHiPerSide, b.provenance.tier]).toEqual([["laser", "fdm"], 0.15, 0.275, "inferred"]);
    const over = tables.loss.find((r) => r.processA === "laser" && r.processB === "fdm" && r.motion === "slide");
    expect(over && over.outerOverPerSide * 2).toBe(0.15);
  });

  test("every seed fit row loads halved, per side, at tier inferred", () => {
    const seedFits = (JSON.parse(readFileSync(new URL("../seed/profile.seed.json", import.meta.url), "utf8")) as {
      fits: { class: string; realLo: number; realHi: number }[];
    }).fits;
    const p = createProfileLookup(tables);
    for (const f of seedFits) {
      const b = p.fit(f.class as FitClassId);
      expect([b.realLoPerSide, b.realHiPerSide, b.basis, b.provenance.tier]).toEqual([f.realLo / 2, f.realHi / 2, "perSide", "inferred"]);
    }
  });
});

describe("load errors carry got and expected where the value is in hand (spec/errors.ts CommandError)", () => {
  test("a preset field, a fit basis and motion, a loss process and a provenance method", () => {
    const m = clone(PROFILE_DATA.machines) as { machines: { presets: Json[] }[] };
    (m.machines[0]?.presets[0] as Json)["nozzle"] = 0;
    expect(errOf(() => tablesFromData({ ...PROFILE_DATA, machines: m }))).toMatchObject({
      code: "E_SCHEMA", path: "/machines/0/presets/0/nozzle", got: 0, expected: "a number above 0, mm",
    });

    const f = clone(PROFILE_DATA.fits) as { fits: Json[] };
    (f.fits[0] as Json)["basis"] = "diametral";
    expect(errOf(() => tablesFromData({ ...PROFILE_DATA, fits: f }))).toMatchObject({
      code: "E_SCHEMA", path: "/fits/0/basis", got: "diametral", expected: "perSide",
    });
    const g = clone(PROFILE_DATA.fits) as { fits: Json[] };
    (g.fits[0] as Json)["motion"] = "spin";
    const motion = errOf(() => tablesFromData({ ...PROFILE_DATA, fits: g }));
    expect([motion.code, motion.path, motion.got]).toEqual(["E_SCHEMA", "/fits/0/motion", "spin"]);
    expect(motion.expected).toContain("slide");

    const l = clone(PROFILE_DATA.loss) as { loss: Json[] };
    (l.loss[0] as Json)["processA"] = "cnc";
    const proc = errOf(() => tablesFromData({ ...PROFILE_DATA, loss: l }));
    expect([proc.code, proc.path, proc.got]).toEqual(["E_SCHEMA", "/loss/0/processA", "cnc"]);
    expect(proc.expected).toContain("fdm");

    const mat = clone(PROFILE_DATA.materials) as { materials: Json[] };
    ((mat.materials[0] as Json)["provenance"] as Json)["method"] = "guess";
    const method = errOf(() => tablesFromData({ ...PROFILE_DATA, materials: mat }));
    expect([method.code, method.got]).toEqual(["E_SCHEMA", "guess"]);
    expect(method.expected).toContain("datasheet");
  });

  test("refError ranks by edit distance, ties by name, after the ids named first", () => {
    const e = errOf(() => { throw refError("/fit", "PSLAP", "no fit", ["PRESS", "PSLIP", "PSLID", "PSNAP"]); });
    expect(e.didYouMean).toEqual(["PSLIP", "PSNAP", "PSLID"]);
    const lead = errOf(() => { throw refError("/fit", "PSLAP", "no fit", ["PSLIP", "PSNAP"], ["PRESS"]); });
    expect(lead.didYouMean).toEqual(["PRESS", "PSLIP", "PSNAP"]);
  });

  test("the thrown message reads code, path and hint", () => {
    try {
      throw refError("/fit", "X", "no fit X in profile");
    } catch (e) {
      expect(isThrownCommandError(e)).toBe(true);
      expect((e as Error).message).toBe("E_REF /fit no fit X in profile");
    }
  });
});

describe("preset wall loops (PROFILE.md 8.1)", () => {
  test("wallLoops is the slicer wall_loops count: 2 on ffc5p_20260819, 3 on ffc5p-n025_20260819 (vendor)", () => {
    const ffc5p = tables.machines.find((m) => m.id === "ffc5p");
    expect(ffc5p?.presets.map((p) => [p.id, p.wallLoops, p.provenance.tier])).toEqual([
      ["ffc5p_20260819", 2, "vendor"], ["ffc5p-n025_20260819", 3, "vendor"],
    ]);
  });

  test("a preset without a whole wallLoops of at least 1 fails with E_SCHEMA naming the field", () => {
    for (const bad of [undefined, 0, 2.5, "2"]) {
      const m = clone(PROFILE_DATA.machines) as { machines: { presets: Json[] }[] };
      const preset = m.machines[0]?.presets[0] as Json;
      if (bad === undefined) delete preset["wallLoops"];
      else preset["wallLoops"] = bad;
      const e = errOf(() => tablesFromData({ ...PROFILE_DATA, machines: m }));
      expect([e.code, e.path], String(bad)).toEqual(["E_SCHEMA", "/machines/0/presets/0/wallLoops"]);
    }
  });
});

describe("constants (PROFILE.md 10)", () => {
  test("the check and route floors load as mm rows, inferred: key.flexGapFloor 1.2, stack.bandOverlap.lo 0.01 and .hi 0.02", () => {
    const p = createProfileLookup(tables);
    const got = ["key.flexGapFloor", "stack.bandOverlap.lo", "stack.bandOverlap.hi"].map((id) => p.constant(id));
    expect(got.map((c) => [c.value, c.unit, c.provenance.tier])).toEqual([[1.2, "mm", "inferred"], [0.01, "mm", "inferred"], [0.02, "mm", "inferred"]]);
    for (const c of got) expect(c.provenance.source).toMatch(/CHECKS\.md CHK-(KEY-01|PRT-02)/);
  });

  test("the three new M00 constants load with tier inferred and a non-empty source", () => {
    const p = createProfileLookup(tables);
    const got = ["3mf.coincidenceInset", "3mf.pinchInset", "geom.sliverMin.n04"].map((id) => p.constant(id));
    expect(got.map((c) => [c.value, c.unit])).toEqual([[0.001, "mm"], [0.02, "mm"], [0.6, "mm"]]);
    for (const c of got) {
      expect(c.provenance.tier).toBe("inferred");
      expect(c.provenance.source.trim().length).toBeGreaterThan(0);
    }
  });

  test("28byj48.halfStepsPerRev is 4075.7728, vendor, derived from the gear train", () => {
    const c = createProfileLookup(tables).constant("28byj48.halfStepsPerRev");
    expect([c.value, c.provenance.tier, c.provenance.method]).toEqual([4075.7728, "vendor", "derived"]);
    expect(4075.7728).toBeCloseTo(63.68395 * 64, 6);
  });

  test("every seeded constant resolves, or names where it moved", () => {
    const p = createProfileLookup(tables);
    for (const s of seed.constants) {
      const moved = (tables.constants?.moved ?? []).some((m) => m.id === s.id);
      if (Array.isArray(s.value) && !moved) {
        expect(s.value.map((_, i) => p.constant(`${s.id}.${i === 0 ? "lo" : "hi"}`).value), s.id).toEqual(s.value);
        expect(errOf(() => p.constant(s.id)).didYouMean?.slice(0, 2), s.id).toEqual([`${s.id}.lo`, `${s.id}.hi`]);
        continue;
      }
      const e = errOf(() => p.constant(s.id));
      if (e.code === undefined) {
        expect(p.constant(s.id).value, s.id).toBe(s.value);
      } else {
        expect([e.code, e.hint?.includes("catalog")], s.id).toEqual(["E_REF", true]);
      }
    }
  });
});
