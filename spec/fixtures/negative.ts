// spec/fixtures/negative.ts
// Each @ts-expect-error below must be needed. If a contract loosens so that
// one of these lines compiles, tsc fails with "Unused '@ts-expect-error'
// directive" and the acceptance command exits non-zero.
// Version 4, 2026-10-04. Carries D-058, D-064, D-107, D-131, D-165, D-173, D-174, D-177.

import type { FeatureKindDef, GeneratedGeometry } from "../feature-kinds.js";
import type { CheckResult } from "../checks.js";
import type { CommandIO, McpToolDef, McpToolIO, McpToolName } from "../commands.js";
import type { Severity } from "../ids.js";
import type { AppliedArchetype, Chase, ParamsOf, WaiverDecl } from "../chase.js";
import type { SchemaLike } from "../schema.js";
import type { BoreFeature, FeatureAt, FeatureKind } from "../features.js";
import type { FeatureKindRegistryAt } from "../feature-kinds.js";
import type { SimHandle } from "../sim.js";
import type { FitClassId } from "../ids.js";
import type { BuildFn } from "../build.js";
import { defineBuild, defineChase } from "../chase.js";
import { defineBench } from "../bench.js";
import { build, chase } from "./keys-flex-pair.js";

declare const boreSchema: SchemaLike<unknown, BoreFeature>;
declare const empty: GeneratedGeometry;
declare const pocketDef: FeatureKindDef<"pocket">;

// A feature kind with an empty check set fails the contract (D-058).
const noChecks: FeatureKindDef<"bore"> = {
  kind: "bore",
  version: "1.0.0",
  schema: boreSchema,
  generate: () => empty,
  // @ts-expect-error checks must hold at least one check id
  checks: [],
  fit: (f) => f.fit.class,
  reference: ["mech/fit-gauge"],
};

// A feature kind without a reference breaks the coverage rule (D-058).
// @ts-expect-error reference is required
const noReference: FeatureKindDef<"bore"> = {
  kind: "bore",
  version: "1.0.0",
  schema: boreSchema,
  generate: () => empty,
  checks: ["CHK-PRT-04"],
  fit: "none",
};

// A param typo in build.ts fails through ParamsOf (D-131).
void build;
const typo = defineBuild(chase, (p, k) => {
  const travel = p.keys.map((key) => key.gap);
  // @ts-expect-error gpa is not a field of the keys item
  const wrong = p.keys.map((key) => key.gpa);
  void travel; void wrong;
  return k.part({
    id: "pad", name: "PAD", process: "fdm", machine: "ffc5p",
    bodies: [], features: [],
  });
});

// MCP tool names use underscores (D-107, C-12).
// @ts-expect-error dotted names are CLI command names
const dotted: McpToolName = "part.build";

// Severity never stops the build; the four-level scale is retired (D-067).
// @ts-expect-error severities are block, warn and note
const refuses: Severity = "critical";

// A check result without origin is a bug (D-064).
// @ts-expect-error origin is required
const noOrigin: CheckResult = {
  id: "CHK-KEY-01",
  version: "1.0.0",
  verdict: "fail",
  severity: "block",
  target: { level: "feature", part: "pad", feature: "contact.key1" },
  measured: 2.15,
  legal: { kind: "interval", lo: 1.28, hi: 1.6, unit: "mm", nearest: 1.6 },
  constraint: "a pressed cone travels about half its height before the cap bottoms",
};

// A persisted placement in absolute coordinates floats when a param moves
// the face; chase.applied addresses a declared face by id (D-165).
const absolute: AppliedArchetype = {
  archetype: "blocks-stud",
  part: "body",
  // @ts-expect-error face is a FaceRef, never a FaceFrame
  face: { origin: [0, 0, 9.6], normal: [0, 0, 1], u: [1, 0, 0] },
  params: { standard: "boss-v1" },
};

export const negatives = [noChecks, noReference, typo, dotted, noOrigin, absolute] as const;

// A chase never selects checks; the registry does (D-173).
// @ts-expect-error checks is not a Chase field
type NoSelector = Chase["checks"];

// A waiver names its reason (D-173).
// @ts-expect-error reason is required
const noReason: WaiverDecl = { check: "CHK-NET-05", target: "K1" };

// No MCP tool declares a consequential capability; a person arms those (D-161).
// @ts-expect-error requires admits observe capabilities only
const armsLaser: McpToolDef["requires"] = ["fire.laser"];

// Layout lives in bench.ts, outside defHash (D-174).
// @ts-expect-error views is a bench field, never a chase field
type NoViews = Chase["views"];

const benchViews = { default: "assembled", modes: ["assembled"], render: ["solid"], overlays: [] } as const;

// A rail panel names a param group of its chase (D-174).
const badPanel = defineBench(chase, {
  shell: "paper", views: benchViews,
  // @ts-expect-error params.pda names no param group of keys-flex-pair
  rail: [{ step: "pad", goal: "size the pad", panels: ["params.pda"] }],
});

// A welcome preset names a chase preset (D-174).
const badPreset = defineBench(chase, {
  shell: "paper", views: benchViews,
  // @ts-expect-error three is not a preset of keys-flex-pair
  welcome: { presets: ["three"] },
});

export const benchNegatives = [badPanel, badPreset] as const;

// A param pointer starts with a slash, as Fix.param does.
export const badPointer: CommandIO["constraints.query"]["input"] = {
  // @ts-expect-error pointers start with a slash, never a dotted dim
  pointers: ["keys.0.gap"], chase: "keys-flex-pair",
};

// The library form leaves an unset option out; null belongs to the MCP form.
export const nullInLibraryForm: CommandIO["check.run"]["input"] = {
  build: "hbf://build/0",
  // @ts-expect-error optional CommandIO fields take no null
  only: null,
};

// The MCP form carries every field, null where unset (StrictArgs).
// @ts-expect-error cursor is missing from a strict check_run argument
export const missingInMcpForm: McpToolIO["check_run"] = { report: "findings", build: "hbf://build/0", only: null };

// A kind is usable in a build only from its admitting milestone (D-058,
// D-177): bore is admitted at M06, so an M03 draft cannot declare one.
const earlyBore: FeatureAt<"M03">[] = [
  // @ts-expect-error bore is not admitted at M03
  { kind: "bore", id: "bore.pivot", axis: { origin: [0, 0, 0], dir: [0, 0, 1] }, d: 5, depth: "through", fit: { class: "SLIDE" as FitClassId, drawnPerSide: 0.2, basis: "perSide" } },
];

// A kernel registry at M03 must hold a def for every kind admitted by M03.
// @ts-expect-error inlay is admitted at M03 and has no def here
const missingDef: FeatureKindRegistryAt<"M03"> = { pocket: pocketDef };

// latch left the Feature union; it is a mechanism (D-177).
// @ts-expect-error latch is not a feature kind
const latchKind: FeatureKind = "latch";

export const admissionNegatives = [earlyBore, missingDef, latchKind] as const;

// Author is typed at the kernel milestone, so k.part refuses a kind that
// milestone has not admitted (D-058, D-177).
const m03Build: BuildFn<Record<string, never>, "M03"> = (_p, k) => k.part({
  id: "pad", name: "PAD", process: "fdm", machine: "ffc5p", bodies: [],
  features: [
    // @ts-expect-error bore is admitted at M06 (D-058)
    { kind: "bore", id: "bore.pivot", axis: { origin: [0, 0, 0], dir: [0, 0, 1] }, d: 5, depth: "through", fit: { class: "SLIDE" as FitClassId, drawnPerSide: 0.2, basis: "perSide" } },
  ],
});

// defineChase checks preset keys, field id uniqueness, enum defaults and
// showWhen references in the editor (CHASE_PARAM_RULES). A numeric default
// outside its range still compiles; chase.validate refuses it at runtime
// (default-range).
const looseMeta = {
  id: "loose", kind: "single", name: "LOOSE", version: 1, chase: 2,
  kernels: ["geom"], machines: ["ffc5p"], license: "MIT",
} as const;
const presetTypo = defineChase({
  meta: looseMeta, materials: [], build: { module: "./build.ts", fn: "build" }, exports: [], assertions: [],
  params: [{ id: "g", label: "G", fields: [{ id: "gap", type: "mm", label: "gap", range: [0, 5], default: 1 }] }],
  // @ts-expect-error gpa is not a declared field id (preset-param)
  presets: [{ id: "p", label: "p", params: { gpa: 9 } }],
});
const dupField = defineChase({
  meta: looseMeta, materials: [], build: { module: "./build.ts", fn: "build" }, exports: [], assertions: [],
  params: [
    // @ts-expect-error w is declared again in group b (field-id-unique flags both)
    { id: "a", label: "A", fields: [{ id: "w", type: "mm", label: "w", range: [0, 5], default: 1 }] },
    // @ts-expect-error w is declared in group a (field-id-unique)
    { id: "b", label: "B", fields: [{ id: "w", type: "bool", label: "w", default: false }] },
  ],
});
const badEnum = defineChase({
  meta: looseMeta, materials: [], build: { module: "./build.ts", fn: "build" }, exports: [], assertions: [],
  params: [{ id: "g", label: "G", fields: [
    // @ts-expect-error cup is not an option (enum-default)
    { id: "pads", type: "enum", label: "leads", default: "cup", options: [{ value: "clip", label: "clip" }] },
  ] }],
});
const badShowWhen = defineChase({
  meta: looseMeta, materials: [], build: { module: "./build.ts", fn: "build" }, exports: [], assertions: [],
  params: [{ id: "g", label: "G", fields: [
    // @ts-expect-error nope names no field (show-when)
    { id: "w", type: "mm", label: "w", range: [0, 5], default: 1, showWhen: { field: "nope", equals: true } },
  ] }],
});
const badNestedShowWhen = defineChase({
  meta: looseMeta, materials: [], build: { module: "./build.ts", fn: "build" }, exports: [], assertions: [],
  params: [{ id: "g", label: "G", fields: [
    { id: "base", type: "enum", label: "base", default: "solo", options: [{ value: "solo", label: "solo" }] },
    // @ts-expect-error nope is a leaf inside any (show-when walks all and any)
    { id: "w", type: "mm", label: "w", range: [0, 5], default: 1, showWhen: { all: [{ field: "base", equals: "solo" }, { any: [{ field: "nope", in: [1, 2] }] }] } },
  ] }],
});
const goldLoose = defineChase({
  meta: looseMeta, materials: [], build: { module: "./build.ts", fn: "build" }, exports: [], assertions: [],
  params: [{ id: "g", label: "G", fields: [
    { id: "hooks", type: "instances", label: "hooks", min: 0, max: 4,
      types: { hook: { label: "hook", blurb: "a hook", fields: [{ id: "rod", type: "mm", label: "rod", range: [3, 6], default: 4 }] } } },
  ] }],
  presets: [{ id: "one", label: "one", params: {} }],
});
// @ts-expect-error depth is not a field of the hook type (ParamsOf over instances)
const badInstance: ParamsOf<typeof goldLoose> = { hooks: [{ id: "h", type: "hook", rod: 4, depth: 3 }] };
void badInstance;
const badPlotPanel = defineBench(goldLoose, {
  shell: "paper", views: { default: "assembled", modes: ["assembled"], render: ["solid"], overlays: [] },
  // @ts-expect-error plot.curve names no entry of plots
  rail: [{ step: "print", goal: "export", panels: ["plot.curve"] }],
});
const badStart = defineBench(goldLoose, {
  shell: "paper", views: { default: "assembled", modes: ["assembled"], render: ["solid"], overlays: [] },
  // @ts-expect-error two is not a chase preset
  welcome: { starts: [{ preset: "two", intent: "two hooks" }] },
});
const outOfRange = defineChase({
  meta: looseMeta, materials: [], build: { module: "./build.ts", fn: "build" }, exports: [], assertions: [],
  params: [{ id: "g", label: "G", fields: [{ id: "w", type: "mm", label: "w", range: [0, 5], default: 9 }] }],
});

// The joint sweep the checks read always measures a volume; only the
// sim.sweep command output admits a null mm3 (pose and prismatic modes).
type HandleClash = ReturnType<SimHandle["sweep"]>["clashes"][number];
// @ts-expect-error SimHandle.sweep clashes carry a measured volume, never null
const nullHandleClash: HandleClash = { with: "palm", mm3: null, masked: false };
void nullHandleClash;

export const authoringNegatives = [
  m03Build, presetTypo, dupField, badEnum, badShowWhen, badNestedShowWhen, outOfRange, badPlotPanel, badStart,
] as const;
