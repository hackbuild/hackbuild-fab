// Author.derive and Author.fit (spec/build.ts): a derived value reaches
// Part.metrics, so it hashes and shows in the HUD, and a fit class resolves
// against the profile fits table, not a compiled list.

import path from "node:path";
import { describe, expect, it } from "vitest";
import { isThrownCommandError, type Chase, type CommandError, type Metric } from "@hackbuild/spec";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { makeAuthor } from "../src/author.js";
import { buildPart, loadDesign, resolveParams } from "../src/commands/build.js";
import { ROOT, REF } from "./hbf.js";

function errOf(f: () => unknown): CommandError {
  try {
    f();
  } catch (e) {
    if (isThrownCommandError(e)) return e.hbf;
    throw e;
  }
  throw new Error("expected a CommandError");
}

async function buildErr(dir: string, params: Record<string, unknown>): Promise<CommandError> {
  const design = await loadDesign(dir, ROOT);
  try {
    await buildPart(design, resolveParams(design.chase, params, undefined));
  } catch (e) {
    if (isThrownCommandError(e)) return e.hbf;
    throw e;
  }
  throw new Error("expected the build to stop");
}

const chase = {
  meta: { id: "author-test", machines: ["ffc5p"] },
  materials: [{ slot: 1, material: "petg", role: "body", label: "plate", preview: "#1A1A1A" }],
  params: [
    { id: "plate", label: "PLATE", live: "commit", fields: [
      { id: "T", type: "derived", label: "thickness", fn: "plateThickness", unit: "mm" },
      { id: "h", type: "mm", label: "height", range: [0, 9], default: 0, auto: { at: 0, label: "auto", fn: "autoHeight" } },
      { id: "keys", type: "list", label: "keys", min: 1, max: 4, item: [
        { id: "reach", type: "derived", label: "reach", fn: "keyReach", unit: "mm" },
      ] },
    ] },
  ],
} as unknown as Chase;

describe("Author.derive", () => {
  const author = () => {
    const derived: Metric[] = [];
    const k = makeAuthor(chase, createProfileLookup(loadProfile()), [], derived);
    return { k, derived };
  };

  it("records a declared derive id as an informational derived.<field> metric and returns the value", () => {
    const { k, derived } = author();
    expect(k.derive("plateThickness", 2.4, "two layers over the floor", ["/plate/w"])).toBe(2.4);
    expect(k.derive("autoHeight", 3, "auto height")).toBe(3);
    expect(derived).toEqual([
      { id: "derived.T", value: 2.4, unit: "mm", qualifier: "computed", basis: null, note: "two layers over the floor", drivenBy: ["/plate/w"], gate: "informational" },
      { id: "derived.h", value: 3, unit: "mm", qualifier: "computed", basis: null, note: "auto height", gate: "informational" },
    ]);
  });

  it("indexes a derived field inside a list item, one metric per call", () => {
    const { k, derived } = author();
    k.derive("keyReach", 1, "first");
    k.derive("keyReach", 2, "second");
    expect(derived.map((m) => m.id)).toEqual(["derived.keys.reach.0", "derived.keys.reach.1"]);
  });

  it("refuses an undeclared id with E_SCHEMA at /author/derive and suggests the declared fn", () => {
    const { k } = author();
    const e = errOf(() => k.derive("plateThicknes", 1, "typo"));
    expect(e.code).toBe("E_SCHEMA");
    expect(e.path).toBe("/author/derive");
    expect(e.got).toBe("plateThicknes");
    expect(e.didYouMean).toContain("plateThickness");
  });

  it("refuses a second call for a field outside a list, and a non-finite value", () => {
    const { k } = author();
    k.derive("plateThickness", 1, "once");
    expect(errOf(() => k.derive("plateThickness", 2, "twice")).code).toBe("E_SCHEMA");
    expect(errOf(() => author().k.derive("plateThickness", Number.NaN, "nan")).code).toBe("E_SCHEMA");
  });
});

describe("Author.fit", () => {
  it("resolves against the profile fits table and records the read", () => {
    const profile = createProfileLookup(loadProfile());
    const k = makeAuthor(chase, profile, []);
    expect(k.fit("LOCATE")).toBe("LOCATE");
    expect(profile.reads()).toContainEqual({ table: "fit", id: "LOCATE" });
  });

  it("names the replacement for a dropped class (D-100) and suggests table ids for an unknown one", () => {
    const k = makeAuthor(chase, createProfileLookup(loadProfile()), []);
    const dropped = errOf(() => k.fit("PSLIDE"));
    expect(dropped.code).toBe("E_REF");
    expect(dropped.didYouMean?.[0]).toBe("PSLIP");
    expect(dropped.hint).toContain("use PSLIP");
    expect(errOf(() => k.fit("LOCAT")).didYouMean).toContain("LOCATE");
  });
});

describe("derived values through the build sandbox", () => {
  const FIX = path.join(ROOT, "core", "test", "fixtures", "sandbox", "derive");

  it("the derive fixture puts derived.T in Part.metrics and the part content hash moves with it", async () => {
    const design = await loadDesign(FIX, ROOT);
    const a = await buildPart(design, resolveParams(design.chase, undefined, undefined));
    const b = await buildPart(design, resolveParams(design.chase, { plate: { w: 30 } }, undefined));
    expect(a.part.metrics).toContainEqual(expect.objectContaining({ id: "derived.T", value: 3, unit: "mm", drivenBy: ["/plate/w"], gate: "informational" }));
    expect(b.part.metrics.find((m) => m.id === "derived.T")?.value).toBe(3.5);
    expect(a.draft.metrics).toEqual(a.part.metrics);
  }, 60_000);

  it("an undeclared derive id stops the build with E_SCHEMA across the sandbox", async () => {
    const e = await buildErr(FIX, { plate: { mode: "undeclared" } });
    expect(e.code).toBe("E_SCHEMA");
    expect(e.path).toBe("/author/derive");
    expect(e.didYouMean).toContain("plateThickness");
  }, 60_000);

  it("a dropped fit class stops the build with E_REF naming PSLIP", async () => {
    const e = await buildErr(FIX, { plate: { mode: "fit" } });
    expect(e.code).toBe("E_REF");
    expect(e.didYouMean?.[0]).toBe("PSLIP");
    expect(e.hint).toContain("use PSLIP");
  }, 60_000);

  it("flex-pair padThickness reaches Part.metrics as derived.T with its note and drivenBy", async () => {
    const design = await loadDesign(path.join(ROOT, REF), ROOT);
    const built = await buildPart(design, resolveParams(design.chase, undefined, undefined));
    const t = built.part.metrics.find((m) => m.id === "derived.T");
    expect(t).toMatchObject({ unit: "mm", gate: "informational", drivenBy: ["/keys/*/cone", "/keys/*/d"] });
    expect(t?.note).toContain("snapped up to a layer top");
    const pad = built.draft.bodies.find((x) => x.id === "pad");
    expect(pad?.base.route === "prism" ? pad.base.z[1] : undefined).toBe(t?.value);
  }, 60_000);
});
