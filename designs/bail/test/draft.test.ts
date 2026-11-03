// designs/bail: build.ts run in process through the pipeline's Author (a design
// test does not reach core), so the draft the build declares is read before
// meshing: the rim ring, the bridge slot, the channel and fin numbers BAIL
// computes (claspGeom, bail.html 1690 to 1694), the tip bore, the rigid fin
// rule and the structured warnings. Every expected number below is computed
// from bail.html on the hackbuild preset (cord 4, clearance 0.5, fin
// projection 0.35, bore clearance 0.3, layer 0.24 over a 0.25 first layer).
// The meshed build and its checks are build.test.ts.

import { describe, expect, test } from "vitest";
import { isThrownCommandError, type BodyDraft, type BuildWarning, type CommandError, type PartDraft, type Ring, type ShapeDecl } from "@hackbuild/spec";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { makeAuthor, resolveParams } from "@hackbuild/pipeline";
import { build } from "../build";
import { chase, type BailParams } from "../chase";

const profile = createProfileLookup(loadProfile());
const PRESETS = ["heatsync", "hackbuild", "scope", "trace", "mesa", "concho", "monogram", "custom"] as const;

interface Run { readonly draft: PartDraft; readonly warnings: readonly BuildWarning[]; readonly params: BailParams }

async function run(preset: string, params: Record<string, unknown> = {}): Promise<Run> {
  const warnings: BuildWarning[] = [];
  const values = resolveParams(chase, params, preset) as unknown as BailParams;
  const draft = (await build(values, makeAuthor(chase, profile, warnings))) as PartDraft;
  return { draft, warnings, params: values };
}

const body = (r: Run, id: string): BodyDraft => {
  const b = r.draft.bodies.find((x) => x.id === id);
  if (b === undefined) throw new Error(`no body ${id} in ${r.draft.bodies.map((x) => x.id).join(", ")}`);
  return b;
};
type Prism = Extract<ShapeDecl, { route: "prism" }>;
type Csg = Extract<ShapeDecl, { route: "csg" }>;
type Revolve = Extract<ShapeDecl, { route: "revolve" }>;
const prism = (s: ShapeDecl): Prism => { if (s.route !== "prism") throw new Error(`expected prism, got ${s.route}`); return s; };
const csg = (s: ShapeDecl): Csg => { if (s.route !== "csg") throw new Error(`expected csg, got ${s.route}`); return s; };
const span = (ring: Ring, axis: 0 | 1): number => Math.max(...ring.map((q) => q[axis])) - Math.min(...ring.map((q) => q[axis]));
const r_ids = (r: Run): string[] => r.draft.bodies.map((b) => b.id);
const code = (r: Run, c: string): BuildWarning | undefined => r.warnings.find((w) => w.code === c);
const caught = async (preset: string, params: Record<string, unknown>): Promise<CommandError> => {
  try { await run(preset, params); } catch (e) { if (isThrownCommandError(e)) return e.hbf; throw e; }
  throw new Error("the build did not refuse");
};
/** A warning carries what failed, measured, legal, constraint and origin in its text, and a bound. */
const structured = (w: BuildWarning | undefined): void => {
  expect(w).toBeDefined();
  expect(w?.text).toMatch(/\((computed|inferred)\)/);
  expect(w?.text).toContain("legal");
  expect(w?.text).toContain("constraint");
  expect(w?.text).toContain("origin");
  expect(w?.bound).toBeDefined();
  expect(w?.bound?.reason).not.toBe("");
  expect(w?.bound?.source).toBeDefined();
};

describe("the hackbuild preset: the numbers BAIL computes", () => {
  test("channel 4.5 wide and 4.56 tall, fins 0.6 deep, cord squeezed to 3.30 mm", async () => {
    // bail.html 1690 to 1694: cw = cord + clr = 4.5, ch = snapUp(4.5) = 19 x 0.24 = 4.56, finP = min(cw / 2 - 0.2, clr / 2 + gripP) = 0.6.
    const r = await run("hackbuild");
    expect(r.params).toMatchObject({ cord: 4, clr: 0.5, gripP: 0.35, thk: 4.33 });
    const bridge = csg(csg(body(r, "bridge1").base).of[0]!);
    const tunnel = prism(bridge.of[1]!);
    expect(span(tunnel.outline[0]!, 0)).toBeCloseTo(4.5, 6);
    expect(tunnel.z[1] - 4.33).toBeCloseTo(4.56, 6);
    const ribs = csg(csg(body(r, "fins1").base).of[0]!).of.map(prism);
    const left = ribs[0]!.outline[0]!, right = ribs[1]!.outline[0]!;
    expect(span(left, 0)).toBeCloseTo(0.6, 6);
    expect(span(right, 0)).toBeCloseTo(0.6, 6);
    const open = Math.min(...right.map((q) => q[0])) - Math.max(...left.map((q) => q[0]));
    expect(open).toBeCloseTo(3.3, 6);
    expect(prism(ribs[0]!).z[1] - 4.33).toBeCloseTo(4.56, 6);
  });

  test("the tip bore is 4.30 mm across the flats of the 48 sided bore", async () => {
    const r = await run("hackbuild");
    const tip = body(r, "tip1.band1").base as Revolve;
    const segs = tip.segments ?? 0;
    expect(segs).toBe(48);
    // The profile is (r, z); the bore wall is the smaller radius on the z = 0 face, held at the circumscribed radius of the 48 gon.
    const rb = Math.min(...tip.profile.filter(([, z]) => Math.abs(z) < 1e-9).map(([q]) => q).filter((q) => q > 0));
    expect(2 * rb * Math.cos(Math.PI / segs)).toBeCloseTo(4.3, 6);
  });

  test("the bridges print in the clasp slot, 1 by default, and the fins in the TPU slot as flex", async () => {
    const r = await run("hackbuild");
    expect(r.params.claspSlot).toBe(1);
    expect(body(r, "bridge1")).toMatchObject({ slot: 1, material: "petg" });
    expect(body(r, "bridge2")).toMatchObject({ slot: 1, material: "petg" });
    expect(body(r, "fins1")).toMatchObject({ slot: 4, material: "tpu95", role: "flex" });
    const moved = await run("hackbuild", { claspSlot: 2 });
    expect(body(moved, "bridge1").slot).toBe(2);
    expect(body(moved, "slide").slot).toBe(3);
  });

  test("the bridges stand 5.76 mm over the slide: channel 4.56 plus roof 1.2 (computed)", async () => {
    const r = await run("hackbuild");
    const block = prism(csg(csg(body(r, "bridge1").base).of[0]!).of[0]!);
    expect(block.z[1] - block.z[0]).toBeCloseTo(5.76, 6);
  });

  test("the clasp slot of the buried presets is BAIL's: trace 1, monogram 3", async () => {
    expect(body(await run("trace"), "bridge1").slot).toBe(1);
    expect(body(await run("monogram"), "bridge1").slot).toBe(3);
  });
});

describe("the rim is a body through the whole thickness", () => {
  test("a ring in the rim slot, with the slide prism inside it", async () => {
    const r = await run("heatsync");
    const rim = prism(body(r, "rim").base), slide = prism(body(r, "slide").base);
    expect(body(r, "rim").slot).toBe(1);
    expect(rim.z).toEqual([0, 4.81]);
    expect(slide.z).toEqual([0, 4.81]);
    expect(rim.outline).toHaveLength(2);
    expect(slide.outline).toHaveLength(1);
    expect(span(rim.outline[0]!, 0)).toBeCloseTo(46, 2);
    expect(span(rim.outline[1]!, 0)).toBeCloseTo(46 - 2 * 1.6, 2);
    expect(slide.outline[0]).toEqual(rim.outline[1]);
  });

  test("no rim body when the band is off or shares the body slot", async () => {
    expect(r_ids(await run("trace"))).not.toContain("rim");
    expect(r_ids(await run("heatsync", { rimOn: false }))).not.toContain("rim");
    const same = await run("heatsync", { rim: 3 });
    expect(r_ids(same)).not.toContain("rim");
    expect(span(prism(body(same, "slide").base).outline[0]!, 0)).toBeCloseTo(46, 2);
  });
});

describe("slot 4 is the TPU grip slot", () => {
  test.each(PRESETS)("preset %s puts no rigid part or colour on slot 4", async (id) => {
    const r = await run(id);
    const rigid = r.draft.bodies.filter((b) => b.slot === 4 && b.role !== "flex");
    expect(rigid.map((b) => b.id)).toEqual([]);
    const features = r.draft.features.filter((f) => f.kind === "inlay" && (f as { slot: number }).slot === 4);
    expect(features).toEqual([]);
    expect(chase.materials.find((m) => m.slot === 4)?.material).toBe("tpu95");
  });

  test.each([1, 2, 3])("grip fins in slot %i raise GRIP_RIGID and build as a rigid body", async (slot) => {
    const r = await run("hackbuild", { gripSlot: slot });
    const w = code(r, "GRIP_RIGID");
    structured(w);
    expect(w?.text).toContain("by 0.70 mm (computed)");
    expect(w?.text).toContain("squeeze");
    expect(w?.text).toContain(`legal: no squeeze for a rigid fin`);
    expect(w?.text).toContain(`constraint: the material of slot ${slot} is not flexible in the profile (handling.flexible false`);
    expect(w?.text).toContain("PRINT-NOTES.md");
    expect(w?.bound).toMatchObject({ value: 0, side: "hi" });
    expect(body(r, "fins1")).toMatchObject({ slot, role: "body" });
  });

  test("grip fins in slot 4 raise no rigid warning and build as flex", async () => {
    const r = await run("hackbuild", { gripSlot: 4 });
    expect(code(r, "GRIP_RIGID")).toBeUndefined();
    expect(body(r, "fins1").role).toBe("flex");
  });

  test("the decision is the profile's: tpu95 is flexible and petg is not", () => {
    expect(profile.material("tpu95").handling?.flexible).toBe(true);
    expect(profile.material("petg").handling?.flexible).toBe(false);
  });

  test("a grip that is off reads no grip material", async () => {
    const r = await run("hackbuild", { grip: false, gripSlot: 2 });
    expect(code(r, "GRIP_RIGID")).toBeUndefined();
    expect(r_ids(r)).not.toContain("fins1");
  });
});

describe("the three ported BAIL checks", () => {
  test("pad recess near the edge warns under 1.2 mm and refuses past the blank", async () => {
    // A 24 mm round slide, the 17.4 x 8.4 mm recess at offset 3 mm: a corner sits near 1 mm from the edge.
    const near = await run("custom", { w: 24, padY: 3 });
    const w = code(near, "PAD_EDGE");
    structured(w);
    expect(w?.text).toContain("origin bail.html line 1776");
    expect(w?.bound).toMatchObject({ value: 1.2, side: "lo" });
    expect(code(await run("custom", { w: 24, padY: 0 }), "PAD_EDGE")).toBeUndefined();
    const out = await caught("custom", { w: 24, padY: 5 });
    expect(out.code).toBe("E_SCHEMA");
    expect(out.path).toBe("/padY");
  });

  test("a bridge trimmed at the edge warns, and refuses past 5 percent", async () => {
    const warn = await run("hackbuild", { w: 30, tunY: 2 });
    const w = code(warn, "BRIDGE_TRIMMED");
    structured(w);
    expect(w?.text).toContain("origin bail.html line 1788");
    expect(code(await run("hackbuild"), "BRIDGE_TRIMMED")).toBeUndefined();
    const out = await caught("hackbuild", { w: 24 });
    expect(out.code).toBe("E_SCHEMA");
    expect(out.path).toBe("/len");
  });

  test("kit tips refuse a cord over the bore plus 0.05 mm", async () => {
    const fits = await run("custom", { cord: 4 });
    const kit = code(fits, "KIT_TIPS");
    expect(kit?.text).toContain("legal to 4.05 mm");
    const out = await caught("custom", { cord: 4.5 });
    expect(out.code).toBe("E_SCHEMA");
    expect(out.path).toBe("/cord");
    expect(String(out.expected)).toContain("bail.html line 1977");
  });
});

describe("clamps and slopes say what is legal and where it comes from", () => {
  test("thickness moved to a layer top", async () => {
    const w = code(await run("hackbuild", { thk: 4.8 }), "CLAMP");
    structured(w);
    expect(w?.text).toContain("moved up to the layer top 4.81 mm (computed)");
    expect(w?.text).toContain("origin profile machine ffc5p");
    expect(w?.param).toBe("/thk");
  });

  test("tip bore depth limited to keep the wall", async () => {
    const w = code(await run("hackbuild", { tips: "bullet", tipL: 24, bore: 24 }), "CLAMP");
    structured(w);
    expect(w?.text).toContain("tip bore depth limited from 24 mm");
    expect(w?.text).toContain("origin bail.html line 1988");
    expect(w?.param).toBe("/bore");
  });

  test("a tip that widens past 45 degrees", async () => {
    const w = code(await run("hackbuild", { tips: "probe", tipL: 24, tipD: 14 }), "SLOPE");
    structured(w);
    expect(w?.text).toContain("legal to 1.05 (inferred)");
    expect(w?.text).toContain("origin bail.html line 1992");
    expect(w?.bound).toMatchObject({ value: 1.05, side: "hi" });
  });
});
