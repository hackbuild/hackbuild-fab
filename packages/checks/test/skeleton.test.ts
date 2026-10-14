// M-S-T06 skeleton checks: the six run bodies on the keys flex-pair build
// (spec fixture, through a test Author), selected by appliesTo and stamped
// from the seed rows. Expected figures are computed here from the reference
// chase defaults (D-223: face 10, cone 4 built at 4.08, travel 1.84, four
// slots), the ffc5p_20260819 preset (line width 0.42 mm, vendor) and the
// PIP rows the circuit slice reads (inferred).

import { existsSync, readFileSync } from "node:fs";
import JSZip from "jszip";
import { describe, expect, test } from "vitest";
import {
  canonicalize, isThrownCommandError,
  type ArtifactBytes, type Author, type CheckResult, type ConductorFeature, type FitClassId, type HookupDecl, type MachineView,
  type ContactFeature, type McuPinSpec, type MeshRef, type Part, type PartDraft, type Ring, type Vec2,
} from "@hackbuild/spec";
import { createProfileLookup, layerIndex, layerTop, loadProfile, snapLayer, tablesFromSeed, type ProfileTables } from "@hackbuild/profile";
import { filamentTemplate, slicerMaterials, write3mf, type FilamentSlot } from "@hackbuild/3mf";
import { build, chase, type FlexPairParams } from "../../../spec/fixtures/keys-flex-pair";
import { mcuPinRow } from "@hackbuild/catalog";
import {
  KEY01_FLOOR_ID, KEY01_FRACTION_IDS, NET_FLOOR_MM, SKELETON_CHECK_IDS, elementType, key01Floor, key01Fractions, key01Interval, pocketWalls, runSkeleton, skeletonChecks, steppedInterval,
  withPlanOutlines, type SkeletonRunInput,
} from "../src/index";

const json = (rel: string): unknown => JSON.parse(readFileSync(new URL(rel, import.meta.url), "utf8"));
const seed = json("../seed/checks.seed.json");
const templateJson = json("../../3mf/data/filament_template.json");
const template = filamentTemplate(templateJson);
// The seed slice carries no constants; core joins the shipped constants to it (withConstants in core build.ts), so the test does too.
const tables: ProfileTables = { ...tablesFromSeed(json("../../profile/seed/profile.seed.json")), constants: loadProfile().constants! };
const FLOOR = key01Floor(createProfileLookup(tables));
const defs = skeletonChecks({ seed, filamentTemplate: template });

// a test Author and a Part IR view: the M00 kernel ships the real ones.

const circle = (r: number, at: Vec2 = [0, 0], segments = 64): Ring =>
  Array.from({ length: segments }, (_, i) => {
    const a = (2 * Math.PI * i) / segments;
    return [at[0] + r * Math.cos(a), at[1] + r * Math.sin(a)] as const;
  });

const roundRect = (w: number, h: number, r: number, at: Vec2 = [0, 0]): Ring => {
  const corners: readonly Vec2[] = [[w / 2 - r, -h / 2 + r], [w / 2 - r, h / 2 - r], [-w / 2 + r, h / 2 - r], [-w / 2 + r, -h / 2 + r]];
  const out: Vec2[] = [];
  corners.forEach(([cx, cy], c) => {
    for (let i = 0; i <= 8; i += 1) {
      const a = ((c - 1 + i / 8) * Math.PI) / 2;
      out.push([at[0] + cx + r * Math.cos(a), at[1] + cy + r * Math.sin(a)]);
    }
  });
  return out;
};

function testAuthor(): Author {
  const profile = createProfileLookup(tables);
  const p = profile.preset("ffc5p");
  const machine: MachineView = {
    id: "ffc5p", layerHeight: p.layer, firstLayer: p.firstLayer, lineWidth: p.lineWidth,
    layer: (z) => snapLayer(p, z), layerTop: (i) => layerTop(p, i), layerIndex: (z) => layerIndex(p, z),
    line: (n) => n * p.lineWidth,
  };
  const unused = (name: string) => () => { throw new Error(`${name} is outside the M-S slice`); };
  return {
    profile,
    machine: () => machine,
    ring: { roundRect, circle, offset: unused("ring.offset") },
    body: (id, o) => ({ id, role: o.role, slot: o.slot, base: o.base, material: o.material ?? chase.materials.find((m) => m.slot === o.slot)?.material ?? "" }),
    part: (o) => ({ ...o, frame: { originOnAxis: false, carriesOffset: false, pose: "print", ...o.frame } }) as ReturnType<Author["part"]>,
    fit: (id) => id as FitClassId,
    derive: (_id, value) => value,
    bind: (f) => f,
    warn: () => undefined,
    face: (id, frame) => ({ id, frame }),
    applied: () => [],
    arch: unused("arch"),
    mech: unused("mech"),
  };
}

// The checks under test read no mesh; the stub keeps the Part IR shape.
const STUB_MESH: MeshRef = {
  uri: "hbf://mesh/m-s-t06-stub", hash: "m-s-t06-stub" as MeshRef["hash"], triangles: 0,
  bbox: [[0, 0, 0], [0, 0, 0]], volumeMm3: 0, watertight: false,
};

function partOf(d: PartDraft): Part {
  return {
    id: d.id, name: d.name, process: d.process, machine: d.machine, solid: STUB_MESH,
    bodies: d.bodies.map((b) => ({ id: b.id, mesh: STUB_MESH, material: b.material, slot: b.slot, role: b.role })),
    features: d.features, frame: d.frame, source: { kind: "kernel", routes: ["prism", "stack"] },
    metrics: d.metrics ?? [], warnings: d.warnings ?? [], assertions: d.assertions ?? [],
    buildHash: "m-s-t06-stub" as Part["buildHash"],
  };
}

// The chase field defaults, read from the reference so the suite follows it:
// a list field defaults to one item of its item defaults.
type FieldLike = { readonly id: string; readonly type: string; readonly default?: unknown; readonly item?: readonly FieldLike[] };
const defaultOf = (f: FieldLike): unknown =>
  f.type === "list" ? [Object.fromEntries((f.item ?? []).map((i) => [i.id, i.default]))] : f.default;
const defaults = Object.fromEntries(
  (chase.params as readonly { readonly fields: readonly FieldLike[] }[]).flatMap((g) => g.fields)
    .filter((f) => f.type !== "derived").map((f) => [f.id, defaultOf(f)]),
) as unknown as FlexPairParams;
const withKey = (key: Partial<FlexPairParams["keys"][number]>): FlexPairParams =>
  ({ ...defaults, keys: defaults.keys.map((k) => ({ ...k, ...key })) });
const twoKeys: FlexPairParams = { ...defaults, keys: chase.presets[1]?.params.keys.map((k) => ({ ...k })) ?? [] };

async function built(values: FlexPairParams): Promise<{ part: Part; draft: PartDraft }> {
  const draft = (await build(values, testAuthor())) as PartDraft;
  return { part: partOf(draft), draft };
}

// a four-slot export from the M-S-T07 writer, one filament per chase slot
// as core export3mf builds it (slicer type from the material id).

const tetra = (x: number) => ({
  positions: new Float64Array([x, 0, 0, x + 1, 0, 0, x, 1, 0, x, 0, 1]),
  triangles: new Uint32Array([0, 2, 1, 0, 1, 3, 0, 3, 2, 1, 2, 3]),
});

const SLICER_TYPE: Readonly<Record<string, string>> = { petg: "PETG", cpla: "PLA", tpu95: "TPU", ctpu: "TPU" };
const SLOTS = [...chase.materials].sort((a, b) => a.slot - b.slot);
const FILAMENTS: readonly FilamentSlot[] = SLOTS.map((s) => {
  const type = SLICER_TYPE[s.material];
  if (type === undefined) throw new Error(`no slicer type for ${s.material}`);
  return { colour: s.preview, type, material: s.material };
});

async function exportOf(part: Part): Promise<ArtifactBytes> {
  const preset = tables.machines[0]?.presets[0];
  if (preset === undefined) throw new Error("no ffc5p preset");
  const out = await write3mf({
    title: "flex-pair", chase: "keys-flex-pair", buildHash: part.buildHash, sourceDateEpoch: Date.UTC(2026, 9, 1) / 1000,
    slicer: preset.slicer, nozzleMm: preset.nozzle, template, materials: slicerMaterials(json("../../3mf/seed/materials.json")),
    filaments: FILAMENTS,
    // The draft carries slot 2 as conductor features, not bodies (the M00
    // kernel meshes them), so each slot exports one stub mesh by its label.
    objects: [{ name: "flex-pair", position: [128, 128, 0], bodies: SLOTS.map((s) => ({ name: s.label, slot: s.slot, mesh: tetra(2 * (s.slot - 1)) })) }],
  });
  return { exporter: "3mf", name: "flex-pair.3mf", bytes: out.bytes };
}

const mcu = (id: string): McuPinSpec => mcuPinRow(id);

async function run(values: FlexPairParams, artifacts?: readonly ArtifactBytes[]) {
  const { part, draft } = await built(values);
  const input: SkeletonRunInput = {
    part, draft, profile: createProfileLookup(tables), machine: "ffc5p",
    hookup: chase.hookup as readonly HookupDecl[], mcu,
    artifacts: artifacts ?? [await exportOf(part)],
    params: chase.params, values: values as unknown as Record<string, unknown>,
    rebuild: (v) => built(v as unknown as FlexPairParams),
  };
  return runSkeleton(defs, input);
}

const byId = (rs: readonly CheckResult[], id: string): CheckResult[] => rs.filter((r) => r.id === id);
const one = (rs: readonly CheckResult[], id: string): CheckResult => {
  const hits = byId(rs, id);
  expect(hits, id).toHaveLength(1);
  return hits[0] as CheckResult;
};

function codeOf(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (e) {
    return isThrownCommandError(e) ? e.hbf.code : `not a command error: ${String(e)}`;
  }
  return undefined;
}

async function rezip(bytes: Uint8Array, edit: (name: string, text: string) => string): Promise<Uint8Array> {
  const src = await JSZip.loadAsync(bytes);
  const out = new JSZip();
  for (const f of Object.values(src.files)) if (!f.dir) out.file(f.name, edit(f.name, await f.async("string")));
  return out.generateAsync({ type: "uint8array" });
}

async function settingsEdit(a: ArtifactBytes, edit: (s: Record<string, unknown>) => void): Promise<ArtifactBytes> {
  const bytes = await rezip(a.bytes, (name, text) => {
    if (name !== "Metadata/project_settings.config") return text;
    const s = JSON.parse(text) as Record<string, unknown>;
    edit(s);
    return JSON.stringify(s);
  });
  return { ...a, bytes };
}

// tests.

describe("seed rows (M-S-T06 step 1)", () => {
  const rows = (seed as { checks: { id: string; version: string; appliesTo: { level: string }; status: string }[] }).checks;
  const row = (id: string) => rows.find((r) => r.id === id);

  test("CHK-3MF-06 and -07 apply to artifact and stay at 2.0.0", () => {
    for (const id of ["CHK-3MF-06", "CHK-3MF-07"]) expect(row(id)).toMatchObject({ version: "2.0.0", appliesTo: { level: "artifact" } });
  });

  test("CHK-NET-29 is a draft row at 1.0.0 on level net", () => {
    expect(row("CHK-NET-29")).toMatchObject({ version: "1.0.0", appliesTo: { level: "net" }, status: "entered" });
  });

  test("a seed row whose level disagrees with its run body is refused", () => {
    const stale = { checks: rows.map((r) => (r.id === "CHK-3MF-06" ? { ...r, appliesTo: { level: "project" } } : r)) };
    expect(codeOf(() => skeletonChecks({ seed: stale, filamentTemplate: template }))).toBe("E_SCHEMA");
  });

  test("defs carry the seed fields and run in the card order", () => {
    expect(defs.map((d) => d.id)).toEqual([...SKELETON_CHECK_IDS]);
    expect(defs.find((d) => d.id === "CHK-KEY-01")?.appliesTo).toEqual({ level: "feature", kinds: ["contact"] });
  });
});

describe("keys flex-pair at defaults", async () => {
  const report = await run(defaults);
  const rs = report.results;

  test("the defaults are the D-223 reference: face 10, cone 4, travel 1.84, four slots, preset one", () => {
    expect(defaults).toMatchObject({ W: 60, H: 30, r: 4, w: 1.4, pads: "clip", keys: [{ x: 0, d: 10, cone: 4, gap: 1.84 }] });
    expect(defaults.keys).toEqual(chase.presets[0]?.params.keys);
    expect(FILAMENTS.map((f) => f.material)).toEqual(["petg", "cpla", "tpu95", "ctpu"]);
  });

  test("six results, one per check, each with measured, legal, constraint and origin; none fails", () => {
    expect(rs.map((r) => r.id)).toEqual([...SKELETON_CHECK_IDS]);
    for (const r of rs) {
      expect(r.measured, r.id).toBeDefined();
      expect(r.legal, r.id).toBeDefined();
      expect(r.constraint.length, r.id).toBeGreaterThan(0);
      expect(r.origin).toBe(`hbf://check/${r.id}`);
      expect(r.verdict, r.id).not.toBe("fail");
    }
    expect(report.ran + report.skipped).toBe(6);
  });

  // The PIP well (D-223) at cone 4 snapped to 4.08: rnt = 1.8 + 0.6 / cos 40 = 2.5832,
  // wellR = 2.5832 + 4.08 tan 40 + 0.6 = 6.6068 mm, wall 15 - 6.6068 (computed).
  test("CHK-PRT-04 skips the 8.393 mm well wall as an infill wall (D-198; perimeter band 1.68 mm, computed)", () => {
    const r = one(rs, "CHK-PRT-04");
    expect(r.verdict).toBe("skip");
    expect(r.legal).toEqual({ kind: "none" });
    expect(r.measured as number).toBeCloseTo(15 - (1.8 + 0.6 / Math.cos((40 * Math.PI) / 180) + 4.08 * Math.tan((40 * Math.PI) / 180) + 0.6), 3);
    expect(r.constraint).toContain("infill wall");
    expect(r.extra?.["perimeterBandMm"] as number).toBeCloseTo(1.68, 9);
  });

  test("CHK-NET-02: least edge clearance 0.756 mm, bus to the K1 column half, legal at least 0.60 (computed)", () => {
    const r = one(rs, "CHK-NET-02");
    expect(r.verdict).toBe("pass");
    expect(r.measured as number).toBeCloseTo(0.756, 3);
    expect(r.legal).toMatchObject({ kind: "interval", lo: NET_FLOOR_MM, hi: null, unit: "mm" });
    // An open end is null, never Infinity, so reportHash has one canonical input (CHECKS.md 7.1, D-225).
    expect(canonicalize(r.legal)).toContain('"hi":null');
    expect(r.target).toMatchObject({ level: "pair", a: { net: "GND" }, b: { net: "K1" } });
    expect([r.extra?.["a"], r.extra?.["b"]].sort()).toEqual(["conductor.gnd", "conductor.key1col"]);
  });

  test("CHK-NET-29: path at least 74.4 + 148.8 kohm, legal 0 to 100 Mohm, a pass reported as warn (computed, inferred rows and wait)", () => {
    const r = one(rs, "CHK-NET-29");
    expect(r.verdict).toBe("warn");
    expect(r.measured as number).toBeGreaterThan(74_400 + 148_800);
    expect(r.legal).toMatchObject({ kind: "interval", lo: 0, unit: "ohm" });
    expect(r.legal.kind === "interval" ? r.legal.hi : 0).toBeCloseTo(100e6, 0);
    expect(r.constraint).toMatch(/^charge-release path \d+ ohm, legal 0 to 100000000 ohm, set by wait 3500 us over 5 tau at 7 pF \(key; wait inferred; path rows inferred; 4 contacts unpriced, path a lower bound\)$/);
    expect(r.extra).toMatchObject({ readFrom: "net", waitSource: "default", waitQualifier: "inferred" });
    const net = report.nets.find((n) => n.id === "K1");
    expect(r.measured).toBe(net?.totalOhm[1]);
  });

  test("CHK-KEY-01: gap 1.84 mm inside 1.428 to 2.040 mm (35 and 50 percent of the snapped cone 4.08, computed, D-241)", () => {
    const r = one(rs, "CHK-KEY-01");
    expect(r.verdict).toBe("pass");
    expect(r.measured).toBe(1.84);
    expect(r.legal).toMatchObject({ kind: "interval", unit: "mm", nearest: 1.84 });
    if (r.legal.kind !== "interval") throw new Error("interval expected");
    expect(r.legal.lo).toBeCloseTo(1.428, 9);
    expect(r.legal.hi).toBeCloseTo(2.04, 9);
    expect(r.extra).toMatchObject({ coneMm: 4.08 });
    expect(r.constraint).toBe("0.35 to 0.5 of cone height 4.08, floor 1.2");
    expect(r.fix).toBeUndefined();
  });

  test("CHK-3MF-06 and CHK-3MF-07 pass on the four-slot export", () => {
    expect(one(rs, "CHK-3MF-06")).toMatchObject({ verdict: "pass", measured: true, legal: { kind: "boolean", must: true } });
    const seven = one(rs, "CHK-3MF-07");
    expect(seven).toMatchObject({ verdict: "pass", measured: true });
    expect(seven.extra?.["filaments"]).toBe(4);
  });
});

describe("one-param edit (M-S-T06 step 3)", async () => {
  const rs = (await run(withKey({ gap: 1.0 }))).results;

  test("gap 1.0 fails CHK-KEY-01 with fix set /keys/0/gap = 1.44, the 0.02 step from 0.8 at or above 1.428 (computed)", () => {
    const r = one(rs, "CHK-KEY-01");
    expect(r.verdict).toBe("fail");
    expect(r.measured).toBe(1.0);
    expect(r.legal).toMatchObject({ kind: "interval", nearest: 1.44 });
    if (r.legal.kind !== "interval") throw new Error("interval expected");
    expect(r.legal.lo).toBeCloseTo(1.428, 9);
    expect(r.legal.hi).toBeCloseTo(2.04, 9);
    expect(r.fix).toMatchObject({ param: "/keys/0/gap", set: 1.44, paramLegal: [1.44, 2.04], predicts: { measured: 1.44, verdict: "pass" } });
  });

  test("every other check keeps its default verdict", () => {
    expect(rs.filter((r) => r.verdict === "fail").map((r) => r.id)).toEqual(["CHK-KEY-01"]);
  });
});

describe("CHK-KEY-01 band and floor", () => {
  test("the rule is 35 to 50 percent of the built cone (pip-controller bench/part1.html lines 233 and 238, D-241); band and 1.2 mm floor are profile constants, inferred", () => {
    const lookup = createProfileLookup(tables);
    expect(key01Fractions(lookup)).toEqual({ lo: 0.35, hi: 0.5 });
    for (const id of [KEY01_FRACTION_IDS.lo, KEY01_FRACTION_IDS.hi]) {
      const row = lookup.constant(id);
      expect([row.unit, row.provenance.tier], id).toEqual(["ratio", "inferred"]);
      expect(row.provenance.source, id).toMatch(/bench\/part1\.html line 233/);
    }
    const c = createProfileLookup(tables).constant(KEY01_FLOOR_ID);
    expect([c.id, c.value, c.unit, c.provenance.tier]).toEqual(["key.flexGapFloor", 1.2, "mm", "inferred"]);
    expect(FLOOR).toBe(1.2);
  });

  test("a floor row that is not a positive mm length is E_SCHEMA", () => {
    const row = (value: number, unit: string) => ({ constant: (id: string) => ({ id, value, unit, provenance: { tier: "inferred" as const, method: "derived" as const, date: "2026-10-06", source: "test" } }) });
    expect(codeOf(() => key01Floor(row(1.2, "layers")))).toBe("E_SCHEMA");
    expect(codeOf(() => key01Floor(row(0, "mm")))).toBe("E_SCHEMA");
    expect(key01Floor(row(1.5, "mm"))).toBe(1.5);
  });

  test("the floor binds below a 3.43 mm cone, the fraction above it (computed)", () => {
    const BAND = { lo: 0.35, hi: 0.5 };
    expect(key01Interval(2.5, FLOOR, BAND)).toEqual([1.2, 1.25]);
    expect(key01Interval(3.2, FLOOR, BAND)).toEqual([1.2, 1.6]);
    // 1.2 / 0.35 = 3.4286 mm is the crossover (computed).
    expect(key01Interval(3.4, FLOOR, BAND)[0]).toBe(1.2);
    expect(key01Interval(3.5, FLOOR, BAND)[0]).toBeCloseTo(1.225, 9);
    const [lo, hi] = key01Interval(4.08, FLOOR, BAND);
    expect(lo).toBeCloseTo(1.428, 9);
    expect(hi).toBeCloseTo(2.04, 9);
  });

  test("band rows out of range, in another unit or out of order are E_SCHEMA", () => {
    const rows = (lo: number, hi: number, unit = "ratio") => ({
      constant: (id: string) => ({ id, value: id === KEY01_FRACTION_IDS.lo ? lo : hi, unit, provenance: { tier: "inferred" as const, method: "derived" as const, date: "2026-10-08", source: "test" } }),
    });
    expect(codeOf(() => key01Fractions(rows(0.5, 0.35)))).toBe("E_SCHEMA");
    expect(codeOf(() => key01Fractions(rows(0.35, 1.5)))).toBe("E_SCHEMA");
    expect(codeOf(() => key01Fractions(rows(0.35, 0.5, "mm")))).toBe("E_SCHEMA");
    expect(key01Fractions(rows(0.4, 0.5))).toEqual({ lo: 0.4, hi: 0.5 });
  });
});

describe("CHK-KEY-01 on a cone where the floor binds", async () => {
  const { part } = await built(defaults);
  const key01 = defs[3];
  if (key01 === undefined || key01.id !== "CHK-KEY-01") throw new Error("CHK-KEY-01 fourth");
  const contact = part.features.find((f): f is ContactFeature => f.kind === "contact");
  if (contact === undefined) throw new Error("no contact");
  const ctx = { profile: createProfileLookup(tables), machine: "ffc5p", whitelist: new Map() };
  const runOn = (feature: ContactFeature, c: unknown = ctx) =>
    (key01.run as (t: unknown, c: unknown) => CheckResult[])({ level: "feature", part, feature }, c)[0];

  test("gap 1.1 on a 2.5 mm cone fails with legal 1.2 to 1.25, the floor and not 35 percent (0.875)", () => {
    const r = runOn({ ...contact, coneH: 2.5, gap: 1.1 });
    expect(r?.verdict).toBe("fail");
    expect(r?.legal).toEqual({ kind: "interval", lo: 1.2, hi: 1.25, unit: "mm", nearest: 1.2 });
  });

  test("the run reads the floor from profile: a 1.22 mm floor row moves the legal lo and the constraint", () => {
    const base = createProfileLookup(tables);
    const profile = { ...base, constant: (id: string) => (id === KEY01_FLOOR_ID ? { ...base.constant(id), value: 1.22 } : base.constant(id)) };
    const r = runOn({ ...contact, coneH: 2.5, gap: 1.21 }, { ...ctx, profile });
    expect(r?.verdict).toBe("fail");
    expect(r?.legal).toMatchObject({ kind: "interval", lo: 1.22, hi: 1.25 });
    expect(r?.constraint).toContain("floor 1.22");
    expect(runOn({ ...contact, coneH: 2.5, gap: 1.21 })?.verdict).toBe("pass");
  });

  // cone 2.88 sits on the grid: z0 2.41 + 2.88 = 5.29, a layer top (0.25 + 21 x 0.24; computed).
  test("through the build: cone 2.88 and gap 1.1 fail with fix set /keys/0/gap = 1.2, the floor (computed)", async () => {
    const r = one((await run(withKey({ cone: 2.88, gap: 1.1 }))).results, "CHK-KEY-01");
    expect(r.verdict).toBe("fail");
    expect(r.extra).toMatchObject({ coneMm: 2.88 });
    if (r.legal.kind !== "interval") throw new Error("interval expected");
    expect(r.legal.lo).toBe(1.2);
    expect(r.legal.hi).toBeCloseTo(1.44, 9);
    expect(r.fix).toMatchObject({ param: "/keys/0/gap", set: 1.2, paramLegal: [1.2, 1.44], predicts: { measured: 1.2, verdict: "pass" } });
  });
});

describe("keys flex-pair preset two", async () => {
  const rs = (await run(twoKeys)).results;

  test("three net pairs, two charge-release nets, two contacts", () => {
    expect(byId(rs, "CHK-NET-02")).toHaveLength(3);
    expect(byId(rs, "CHK-NET-29").map((r) => r.target)).toEqual([
      { level: "net", part: "pad", net: "K1" }, { level: "net", part: "pad", net: "K2" },
    ]);
    expect(byId(rs, "CHK-KEY-01").map((r) => r.verdict)).toEqual(["pass", "pass"]);
    const least = Math.min(...byId(rs, "CHK-NET-02").map((r) => r.measured as number));
    expect(least).toBeCloseTo(0.751, 2);
  });
});

describe("CHK-PRT-04 inside the perimeter band", async () => {
  const { draft } = await built(defaults);
  const pocket = draft.features.find((f) => f.kind === "pocket");
  if (pocket === undefined || pocket.kind !== "pocket") throw new Error("no pocket");
  // A pocket of radius r centred at x leaves a wall of 15 - r mm to the long edge of the 60 x 30 pad.
  const withPocket = (r: number): PartDraft => ({
    ...draft, features: [{ ...pocket, outline: circle(r, [0, 0], 64) }],
  });
  const prt = defs[0];
  if (prt === undefined || prt.id !== "CHK-PRT-04") throw new Error("CHK-PRT-04 first");
  // The context is spec CheckCtx exactly: the check reads the Part IR only (D-024, D-224).
  const ctx = { profile: createProfileLookup(tables), machine: "ffc5p", whitelist: new Map() };
  const irOf = (d: PartDraft): Part => withPlanOutlines(partOf(d), d);
  const runOnPart = async (p: Part) => (await (prt.run as (t: unknown, c: unknown) => Promise<unknown> | unknown)({ level: "part", part: p }, ctx)) as CheckResult[];
  const runOn = (d: PartDraft) => runOnPart(irOf(d));

  test("the perimeter band reads wallLoops from the machine preset: 2 walls on ffc5p_20260819, so 1.68 mm (computed)", async () => {
    expect(createProfileLookup(tables).preset("ffc5p").wallLoops).toBe(2);
    const f = (await runOn(withPocket(15 - 1.26)))[0];
    expect(f?.extra).toMatchObject({ wallLoops: 2, perimeterBandMm: 2 * 2 * 0.42 });
  });

  test("a preset with 3 wall loops widens the band to 2.52 mm, so a 2.1 mm wall is graded, not skipped (computed)", async () => {
    const three: ProfileTables = {
      ...tables,
      machines: tables.machines.map((m) => ({ ...m, presets: m.presets.map((p, i) => (i === 0 ? { ...p, wallLoops: 3 } : p)) })),
    };
    const c3 = { ...ctx, profile: createProfileLookup(three) };
    const d = withPocket(15 - 2.1);
    const two = (await runOn(d))[0];
    expect(two?.verdict).toBe("skip");
    expect(two?.constraint).toContain("2 x 2 walls");
    const f = (await (prt.run as (t: unknown, c: unknown) => Promise<unknown> | unknown)({ level: "part", part: irOf(d) }, c3) as CheckResult[])[0];
    expect(f?.verdict).toBe("pass");
    expect(f?.extra).toMatchObject({ wallLoops: 3 });
    expect(f?.extra?.["perimeterBandMm"] as number).toBeCloseTo(2.52, 9);
  });

  test("a 1.26 mm wall, three line widths, passes", async () => {
    const d = withPocket(15 - 1.26);
    expect(pocketWalls(irOf(d))[0]?.mm).toBeCloseTo(1.26, 9);
    expect((await runOn(d))[0]).toMatchObject({ verdict: "pass", legal: { kind: "multipleOf", base: 0.42, unit: "mm" } });
  });

  test("a 1.0 mm wall fails between 0.84 and 1.26", async () => {
    const f = (await runOn(withPocket(14)))[0];
    expect(f?.verdict).toBe("fail");
    expect(f?.measured as number).toBeCloseTo(1.0, 9);
    if (f?.legal.kind !== "multipleOf") throw new Error("multipleOf expected");
    expect(f.legal.nearest[0]).toBeCloseTo(0.84, 9);
    expect(f.legal.nearest[1]).toBeCloseTo(1.26, 9);
  });

  test("the host outline comes from Body.outline in the Part IR, not from the draft", async () => {
    // Shrink the host outline in the Part IR alone: the draft still declares the 60 x 30 pad.
    const d = withPocket(14);
    const host = pocket.body ?? d.bodies[0]?.id;
    const narrowed: Part = {
      ...partOf(d),
      bodies: partOf(d).bodies.map((b) => (b.id === host ? { ...b, outline: [roundRect(60, 28 + 2 * 0.42 * 2, 0.001)] } : b)),
    };
    // Kept as given: withPlanOutlines never overwrites an emitted outline.
    expect(withPlanOutlines(narrowed, d).bodies.find((b) => b.id === host)?.outline).toBe(narrowed.bodies.find((b) => b.id === host)?.outline);
    const f = (await runOnPart(narrowed))[0];
    expect(f?.measured as number).toBeCloseTo(14.84 - 14, 3);
    expect(f?.verdict).toBe("pass");
  });

  test("a pocket host without Body.outline skips and names the body", async () => {
    const f = (await runOnPart(partOf(withPocket(14))))[0];
    expect(f?.verdict).toBe("skip");
    expect(f?.constraint).toContain("no plan outline on body");
    expect(f?.constraint).toContain("D-224");
  });
});

describe("checks read the Part IR only (D-024, D-224)", () => {
  test("runSkeleton hands every run body a context with exactly the spec CheckCtx keys", async () => {
    const seen: string[][] = [];
    const spied = defs.map((d) => ({
      ...d,
      run: (t: unknown, c: object) => {
        seen.push(Object.keys(c).sort());
        return (d.run as (t: unknown, c: unknown) => unknown)(t, c);
      },
    })) as unknown as typeof defs;
    const { part, draft } = await built(defaults);
    await runSkeleton(spied, {
      part, draft, profile: createProfileLookup(tables), machine: "ffc5p",
      hookup: chase.hookup as readonly HookupDecl[], mcu, artifacts: [await exportOf(part)],
      params: chase.params, values: defaults as unknown as Record<string, unknown>,
    });
    expect(seen.length).toBeGreaterThan(0);
    const allowed = ["expect", "hookup", "machine", "profile", "sim", "whitelist"];
    for (const keys of seen) expect(keys.filter((k) => !allowed.includes(k))).toEqual([]);
  });

  test("no check run body imports PartDraft, BodyDraft or ShapeDecl", () => {
    const files = ["prt04.ts", "net02.ts", "net29.ts", "key01.ts", "threemf.ts", "common.ts", "plan.ts"];
    for (const f of files) {
      const src = readFileSync(new URL(`../src/skeleton/${f}`, import.meta.url), "utf8");
      expect(`${f}: ${/\b(PartDraft|BodyDraft|ShapeDecl)\b/.test(src)}`).toBe(`${f}: false`);
    }
  });
});

describe("CHK-NET-02 below the floor", async () => {
  const { draft } = await built(defaults);
  // Move the GND bus down until its edge sits 0.4 mm from the key trace's round end at y = 0.
  const moved: PartDraft = {
    ...draft,
    features: draft.features.map((f) => {
      if (f.kind !== "conductor" || f.id !== "conductor.gnd" || !("centreline" in f.region)) return f;
      const y = 0.7 + 0.4 + 0.7;
      const c: ConductorFeature = { ...f, region: { ...f.region, centreline: [[0, y], [30, y]] } };
      return c;
    }),
  };
  const net02 = defs[1];
  if (net02 === undefined) throw new Error("no CHK-NET-02");

  test("fails with the measured gap and the 0.60 floor", async () => {
    const part = partOf(moved);
    const gnd = { id: "GND", terminals: [], conductors: [] };
    const out = (await (net02.run as (t: unknown) => unknown)({ level: "net", part, net: gnd })) as CheckResult[];
    const r = out[0];
    expect(r?.verdict).toBe("fail");
    expect(r?.measured as number).toBeLessThan(NET_FLOOR_MM);
    expect(r?.legal).toMatchObject({ kind: "interval", lo: 0.6, nearest: 0.6 });
  });
});

describe("CHK-KEY-01 without a cone", async () => {
  const { part } = await built(defaults);
  const key01 = defs[3];
  if (key01 === undefined) throw new Error("no CHK-KEY-01");
  const contact = part.features.find((f) => f.kind === "contact");
  if (contact === undefined || contact.kind !== "contact") throw new Error("no contact");
  const { coneH: _c, ...noCone } = contact;

  test("a missing coneH is E_PARAM_MISSING, never a fail", () => {
    expect(codeOf(() => (key01.run as (t: unknown) => unknown)({ level: "feature", part, feature: noCone }))).toBe("E_PARAM_MISSING");
  });
});

describe("3MF checks on known-bad packages (CHECKS.md 7.2, 7.3)", async () => {
  const { part } = await built(defaults);
  const good = await exportOf(part);
  const six = defs[4];
  const seven = defs[5];
  if (six === undefined || seven === undefined) throw new Error("no 3mf checks");
  const on = async (def: typeof six, a: ArtifactBytes) =>
    ((await (def.run as (t: unknown) => Promise<unknown>)({ level: "artifact", artifact: a })) as CheckResult[])[0];

  test("the gold Flash Studio save passes both (round trip)", async () => {
    const gold: ArtifactBytes = {
      exporter: "3mf", name: "hackbuild-coin-nfc.3mf",
      bytes: new Uint8Array(readFileSync(new URL("../../../tools/corpus/3mf/gold/hackbuild-coin-nfc.3mf", import.meta.url))),
    };
    expect(await on(six, gold)).toMatchObject({ verdict: "pass", extra: { modelParts: 2 } });
    expect(await on(seven, gold)).toMatchObject({ verdict: "pass" });
  });

  test("a root component p:path to the root model fails CHK-3MF-06 as self-reference", async () => {
    const bytes = await rezip(good.bytes, (name, text) =>
      name === "3D/3dmodel.model" ? text.replace("<component objectid=\"1\"", "<component p:path=\"/3D/3dmodel.model\" objectid=\"1\"") : text);
    const r = await on(six, { ...good, bytes });
    expect(r?.verdict).toBe("fail");
    expect(String(r?.extra?.["first"])).toContain("self-reference");
  });

  test("a p:path to a part that is not in the package fails CHK-3MF-06 as missing part", async () => {
    const bytes = await rezip(good.bytes, (name, text) =>
      name === "3D/3dmodel.model" ? text.replace("<component objectid=\"1\"", "<component p:path=\"/3D/Objects/missing.model\" objectid=\"1\"") : text);
    expect(String((await on(six, { ...good, bytes }))?.extra?.["first"])).toContain("missing part");
  });

  test("overhang_fan_threshold as JSON numbers or bare strings fails CHK-3MF-07 at slot 0", async () => {
    for (const bad of [[95, 10, 10], ["95", "10", "10"]]) {
      const r = await on(seven, await settingsEdit(good, (s) => { s["overhang_fan_threshold"] = bad; }));
      expect(r?.verdict).toBe("fail");
      expect(String(r?.extra?.["first"])).toContain("overhang_fan_threshold slot 0");
    }
  });

  test("a missing filament_map and a short vector fail CHK-3MF-07", async () => {
    const r = await on(seven, await settingsEdit(good, (s) => {
      delete s["filament_map"];
      s["nozzle_temperature"] = ["240", "220"];
    }));
    expect(r?.verdict).toBe("fail");
    expect(String(r?.extra?.["first"])).toContain("nozzle_temperature has 2 elements for 4 filaments");
    expect(String(r?.extra?.["first"])).toContain("filament_map missing");
  });

  test("element types", () => {
    expect(["nil", "95%", "-3", "0.02", "1e-3", "Direct Drive Standard"].map(elementType))
      .toEqual(["nil", "percent", "int", "float", "float", "string"]);
  });
});

describe("param step grid", () => {
  const gap = { id: "gap", type: "mm", label: "travel", range: [0.8, 3.0], step: 0.02, default: 1.84 } as const;

  test("1.632 to 2.04 on the gap field steps to 1.64 to 2.04", () => {
    expect(steppedInterval(gap, 1.632, 2.04)).toEqual([1.64, 2.04]);
  });

  test("an off-grid lo rounds up (1.344 to 1.68 steps to 1.36 to 1.68)", () => {
    expect(steppedInterval(gap, 1.344, 1.68)).toEqual([1.36, 1.68]);
  });
});

// One settle table: CHK-NET-29 and the circuit read must agree on how many
// time constants a pin needs, so the check takes the circuit package's table
// rather than a second copy. The values come from the PIP source of record,
// located through its lineage row, never from the table under test.
describe("settle criterion (pip-controller src/model.js:420 to 428)", async () => {
  const circuit = await import("@hackbuild/circuit");
  const { SETTLE_TAUS } = await import("../src/index");

  test("CHK-NET-29 reads the circuit table, never its own copy", () => {
    expect(SETTLE_TAUS).toBe(circuit.SETTLE_TAUS);
    expect(circuit.KEY_SETTLE_TAUS).toBe(circuit.SETTLE_TAUS.key);
  });

  const lineage = json("../../../lineage.json") as { id: string; source: string }[];
  const src = lineage.find((r) => r.id === "pip.model/pip-controller-b137deb-release")?.source ?? "";
  test.skipIf(!existsSync(src))(`key and touch taus equal the ok tests of ${src}`, () => {
    const lines = readFileSync(src, "utf8").split("\n").slice(419, 428).join("\n");
    const touch = /ok: Ph\.waitTouch \* 1e-3 > (\d+) \* tau/.exec(lines)?.[1];
    const key = /ok: Ph\.waitMech \* 1e-3 > (\d+) \* tau/.exec(lines)?.[1];
    expect({ key: Number(key), touch: Number(touch) }).toEqual({ ...circuit.SETTLE_TAUS });
  });
});
