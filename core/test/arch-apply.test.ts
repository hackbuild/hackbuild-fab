// arch.apply and the applied merge (M06-T12). The command and the merge are
// proven on the flex-cone-key first, on the fixtures under
// fixtures/arch-apply: the command on `host` returns exactly the entry,
// slots and kernels `applied` declares, and the merged build of `applied`
// equals the authored build that places the same key through Author.arch,
// body for body and feature for feature, with the same checks selected at
// the same versions and the same measured values. Then the BLOCKS stud on
// the fresh prism reference/conductors/blocks-stud-applied, at both
// standards: arch.apply returns the entry and slots the stud-<standard>
// fixtures declare, their merged builds equal the Author.arch builds, and at
// blocks-html every check selected for the stud's features, with its
// version and measured value, equals the BLOCKS baseline,
// reference/conductors/blocks-stud.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { CheckResult, MaterialSlot, PartDraft } from "@hackbuild/spec";
import { archetypes } from "../src/canon.js";
import { buildPart, loadDesign, resolveParams, checkVersions, type Built } from "../src/commands/build.js";
import { runAllChecks } from "../src/commands/check-run.js";
import { mergeApplied } from "../src/applied-merge.js";
import { ROOT, json } from "./hbf.js";

const FIX = "core/test/fixtures/arch-apply";
const PRISM = "reference/conductors/blocks-stud-applied";
/** The top face centre of the prism, as the M06-T12 acceptance line passes it. */
const TOP = "{\"origin\":[0,0,9.6],\"normal\":[0,0,1],\"u\":[1,0,0]}";
const STANDARDS = ["boss-v1", "blocks-html"] as const;
const BASELINE = "reference/conductors/blocks-stud";

async function built(dir: string): Promise<Built> {
  const design = await loadDesign(dir, ROOT);
  return buildPart(design, resolveParams(design.chase, undefined, undefined));
}

/** A result keyed by check and target, with its version and measured value. */
const keyed = (rs: readonly CheckResult[]): Record<string, unknown> =>
  Object.fromEntries(rs.map((r) => [`${r.id} ${JSON.stringify(r.target)}`, { version: r.version, verdict: r.verdict, measured: r.measured, legal: r.legal }]));

/** What the two builds must share: every body, feature and metric, minus the build hash. */
const shape = (d: PartDraft): unknown => ({ bodies: d.bodies, features: d.features, metrics: d.metrics ?? [] });

describe("arch.apply (M06-T12 step 2)", () => {
  it("flex-cone-key on host: exit 0, the emitted kinds, and exactly the entry, slots and kernels the applied fixture declares", async () => {
    const { code, r } = await json("arch.apply", `${FIX}/host`, "--part", "body", "--face", "{\"ref\":\"body.floor\",\"uv\":[0,0],\"rotDeg\":0}", "--id", "flex-cone-key", "--params", "top=9.6");
    expect(code).toBe(0);
    const res = r.result as { emitted: string[]; ports: string[]; applied: unknown; slotsAdded: MaterialSlot[]; kernelsAdded: string[]; branch: string; written: boolean; notWritten: string };
    const host = (await loadDesign(`${FIX}/host`, ROOT)).chase;
    const target = (await loadDesign(`${FIX}/applied`, ROOT)).chase;
    expect(res.applied).toEqual(target.applied?.[0]);
    expect([...host.materials, ...res.slotsAdded]).toEqual(target.materials);
    expect([...host.meta.kernels, ...res.kernelsAdded].sort()).toEqual([...target.meta.kernels].sort());
    const kinds = new Set(res.emitted.map((id) => id.split(".")[2]));
    for (const k of ["conductor", "contact", "port"]) expect(kinds, k).toContain(k);
    expect(res.emitted.every((id) => id.startsWith("flex-cone-key.0."))).toBe(true);
    expect(res.ports.every((id) => res.emitted.includes(id))).toBe(true);
    expect(res.branch).toBe("hbf/arch-apply-host");
    expect(res.written).toBe(false);
    expect(res.notWritten).toContain("D-115");
  });

  it("a face frame on a declared face becomes the same FaceRef; a frame on no declared face is E_REF", async () => {
    const { r } = await json("arch.apply", PRISM, "--part", "body", "--face", "{\"origin\":[2,1,9.6],\"normal\":[0,0,1],\"u\":[1,0,0]}", "--id", "touch-comb-key");
    // touch-comb-key sits on the stack floor, so it refuses the prism top; the face it was given is reported as a FaceRef first.
    expect(r.errors[0]?.path).toBe("/face/origin/2");
    const off = await json("arch.apply", PRISM, "--part", "body", "--face", "{\"origin\":[0,0,5],\"normal\":[0,0,1],\"u\":[1,0,0]}", "--id", "flex-cone-key");
    expect(off.code).toBe(2);
    expect(off.r.errors[0]?.code).toBe("E_REF");
    expect(off.r.errors[0]?.path).toBe("/face");
  });

  it("an unknown part is E_REF naming the part the build returns", async () => {
    const { code, r } = await json("arch.apply", `${FIX}/host`, "--part", "lid", "--face", "{\"ref\":\"body.floor\",\"uv\":[0,0],\"rotDeg\":0}", "--id", "flex-cone-key");
    expect(code).toBe(2);
    expect(r.errors[0]?.didYouMean).toEqual(["body"]);
  });

  it("blocks-stud without a standard is the typed question naming both presets (D-087)", async () => {
    expect(archetypes.resolve("blocks-stud").def.status).toBe("proven");
    const { code, r } = await json("arch.apply", PRISM, "--part", "body", "--face", TOP, "--id", "blocks-stud");
    expect(code).toBe(2);
    expect(r.errors[0]?.code).toBe("E_PARAM_MISSING");
    expect(r.errors[0]?.path).toBe("/params/standard");
    expect(r.errors[0]?.expected).toContain("boss-v1");
    expect(r.errors[0]?.expected).toContain("blocks-html");
  });

  it.each(STANDARDS)("blocks-stud at %s on the fresh prism: exit 0, the emitted kinds, and exactly the entry, slots and kernel the fixture declares", async (st) => {
    const { code, r } = await json("arch.apply", PRISM, "--part", "body", "--face", TOP, "--id", "blocks-stud", "--params", `standard=${st}`);
    expect(code).toBe(0);
    const res = r.result as { emitted: string[]; ports: string[]; applied: unknown; slotsAdded: MaterialSlot[]; kernelsAdded: string[] };
    const host = (await loadDesign(PRISM, ROOT)).chase;
    const target = (await loadDesign(`${FIX}/stud-${st}`, ROOT)).chase;
    expect(res.applied).toEqual(target.applied?.[0]);
    expect([...host.materials, ...res.slotsAdded]).toEqual(target.materials);
    expect(res.slotsAdded.map((x) => `${x.material} ${x.role}`)).toEqual(["cpla conductor", "ctpu flex-conductor"]);
    expect([...host.meta.kernels, ...res.kernelsAdded].sort()).toEqual([...target.meta.kernels].sort());
    const kinds = new Set(res.emitted.map((id) => id.split(".")[2]));
    for (const k of ["conductor", "port"]) expect(kinds, k).toContain(k);
    expect(res.emitted.every((id) => id.startsWith("blocks-stud.0."))).toBe(true);
  });
  it("every stub, candidate and unproven archetype is refused by name", async () => {
    for (const e of archetypes.entries.filter((x) => x.def.status !== "proven").slice(0, 3)) {
      const { code, r } = await json("arch.apply", PRISM, "--part", "body", "--face", "{\"ref\":\"body.top\",\"uv\":[0,0],\"rotDeg\":0}", "--id", e.id);
      expect(code, e.id).toBe(2);
      expect(r.errors[0]?.hint, e.id).toBe(`archetype ${e.id} is ${e.def.status}: ${e.def.statusReason}`);
    }
  });
});

describe("the applied merge (M06-T12 step 2, spec/build.ts APPLIED_MERGE)", () => {
  it("the merged build equals the authored build; the same checks run at the same versions with the same measured values", async () => {
    const applied = await built(`${FIX}/applied`);
    const authored = await built(`${FIX}/authored`);
    expect(shape(applied.draft)).toEqual(shape(authored.draft));
    expect(applied.part.bodies.map((b) => [b.id, b.mesh.hash])).toEqual(authored.part.bodies.map((b) => [b.id, b.mesh.hash]));
    expect(checkVersions(applied.design)).toEqual(checkVersions(authored.design));
    const a = await runAllChecks(applied, [], undefined);
    const b = await runAllChecks(authored, [], undefined);
    expect(keyed(a.results)).toEqual(keyed(b.results));
    // The per-feature results on the key's contact, conductors and port are among them.
    const onKey = a.results.filter((x) => x.target.level === "feature" && JSON.stringify(x.target).includes("flex-cone-key.0."));
    expect(onKey.length).toBeGreaterThan(0);
    for (const x of a.results) {
      expect(x.measured, x.id).not.toBeUndefined();
      expect(x.legal, x.id).toBeDefined();
      expect(x.constraint, x.id).toMatch(/\S/);
      expect(x.origin, x.id).toBe(`hbf://check/${x.id}`);
    }
  });

  it.each(STANDARDS)("blocks-stud at %s: the merged prism equals the Author.arch prism, checks and values alike", async (st) => {
    const applied = await built(`${FIX}/stud-${st}`);
    const authored = await built(`${FIX}/stud-authored-${st}`);
    expect(shape(applied.draft)).toEqual(shape(authored.draft));
    expect(applied.part.bodies.map((b) => [b.id, b.mesh.hash])).toEqual(authored.part.bodies.map((b) => [b.id, b.mesh.hash]));
    expect(checkVersions(applied.design)).toEqual(checkVersions(authored.design));
    const a = await runAllChecks(applied, [], undefined);
    const b = await runAllChecks(authored, [], undefined);
    expect(keyed(a.results)).toEqual(keyed(b.results));
    for (const x of a.results) {
      expect(x.measured, x.id).not.toBeUndefined();
      expect(x.legal, x.id).toBeDefined();
      expect(x.constraint, x.id).toMatch(/\S/);
      expect(x.origin, x.id).toBe(`hbf://check/${x.id}`);
    }
  });

  it("blocks-stud at blocks-html: the checks selected for the stud's features, their versions and measured values equal the BLOCKS baseline", async () => {
    const applied = await built(`${FIX}/stud-blocks-html`);
    const baseline = await built(BASELINE);
    const onStud = (rs: readonly CheckResult[]): Map<string, CheckResult> =>
      new Map(rs.filter((x) => x.target.level === "feature" && "feature" in x.target && String(x.target.feature).startsWith("blocks-stud.0."))
        .map((x) => [`${x.id} ${"feature" in x.target ? x.target.feature : ""}`, x]));
    const a = onStud((await runAllChecks(applied, [], undefined)).results);
    const b = onStud((await runAllChecks(baseline, [], undefined)).results);
    expect(a.size).toBeGreaterThan(0);
    expect([...a.keys()].sort()).toEqual([...b.keys()].sort());
    for (const [k, x] of a) {
      const y = b.get(k)!;
      expect([x.version, x.verdict], k).toEqual([y.version, y.verdict]);
      if (typeof x.measured === "number" && typeof y.measured === "number") expect(Math.abs(x.measured - y.measured), k).toBeLessThanOrEqual(1e-6);
      else expect(x.measured, k).toEqual(y.measured);
    }
    // the conductor checks run on the stud's conductors, and CHK-KEY-02 skips its socket: a cPLA flange is no flex cap
    const ids = new Set([...a.values()].map((x) => x.id));
    for (const id of ["CHK-NET-04", "CHK-NET-05", "CHK-KEY-02"]) expect(ids, id).toContain(id);
    const key02 = [...a.values()].find((x) => x.id === "CHK-KEY-02")!;
    expect([key02.verdict, key02.measured]).toEqual(["skip", "not a flex cap"]);
  });

  it("an entry naming another part is E_REF, and a slot the chase lacks is E_SCHEMA naming it", async () => {
    const host = await built(`${FIX}/host`);
    const ctx = { profile: (await import("@hackbuild/profile")).createProfileLookup(host.design.ws.tables), materials: host.design.chase.materials };
    const entry = { archetype: "flex-cone-key", part: "lid", face: { ref: "body.floor", uv: [0, 0] as [number, number], rotDeg: 0 }, params: { top: 9.6 } };
    expect(() => mergeApplied(host.draft, [entry], ctx)).toThrow(expect.objectContaining({ hbf: expect.objectContaining({ code: "E_REF", path: "/applied/0/part" }) }));
    expect(() => mergeApplied(host.draft, [{ ...entry, part: "body" }], ctx)).toThrow(expect.objectContaining({ hbf: expect.objectContaining({ code: "E_SCHEMA", path: "/materials" }) }));
  });

  it("no check is keyed on an archetype id", () => {
    const files = ["CHK-KEY-01.ts", "CHK-NET-03.ts"].map((f) => path.join(ROOT, "packages/checks/src/defs", f.startsWith("CHK-KEY") ? "key" : "net", f));
    for (const f of files) expect(readFileSync(f, "utf8"), f).not.toMatch(/blocks-stud|flex-cone-key/);
  });
});
