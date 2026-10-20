// The derived chase schemas (D-131, M10-T02 step 1). Two zod schemas live
// here. chaseDocSchema is the shape of a chase document, strict at every
// level spec/chase.ts closes, so a field the spec lacks (the retired
// `checks` selector, D-173, or a layout field that moved to bench.ts,
// D-174) is E_SCHEMA. paramsSchema(chase) is the shape of the params a
// build function reads, derived from the chase's own ParamField
// declarations: a chase edit changes it, and nobody writes it by hand.
// JSON Schema for MCP and docs is derived from the same zod value.
//
// The param rules of CHASE_PARAM_RULES (spec/chase.ts) run here too: tsc
// checks the first ones in the editor through CheckedChase, but a chase
// read as data (D-178) never meets tsc, so they hold at runtime as well.

import { z } from "zod";
import {
  CARD_SECTIONS, CHASE_ID_PATTERN, CHASE_KINDS, CHASE_SCHEMA_VERSION, KERNEL_IDS, didYouMean,
  type Chase, type CommandError, type ParamField, type ParamGroup, type ShowWhen,
} from "@hackbuild/spec";

/** RFC 6901 escape of one pointer segment. */
export const seg = (s: string | number): string => String(s).replace(/~/g, "~0").replace(/\//g, "~1");
const ptr = (path: readonly PropertyKey[]): string => (path.length === 0 ? "/" : path.map((p) => `/${seg(String(p))}`).join(""));

// ---- the chase document ----

const scalar = z.union([z.string(), z.number(), z.boolean()]);

const showWhen: z.ZodType<unknown> = z.lazy(() => z.union([
  z.strictObject({ field: z.string().min(1), equals: scalar }),
  z.strictObject({ field: z.string().min(1), notEquals: scalar }),
  z.strictObject({ field: z.string().min(1), in: z.array(scalar) }),
  z.strictObject({ all: z.array(showWhen) }),
  z.strictObject({ any: z.array(showWhen) }),
]));

const common = {
  id: z.string().min(1),
  label: z.string(),
  help: z.string().optional(),
  showWhen: showWhen.optional(),
  constraintDim: z.string().regex(/^[^.\s]+\.[^\s]+$/, "a dim named <kind>.<field>").optional(),
  commit: z.enum(["touch", "commit", "light"]).optional(),
  remember: z.boolean().optional(),
  quality: z.literal(true).optional(),
  checks: z.array(z.string().min(1)).optional(),
};

const numeric = {
  range: z.tuple([z.number(), z.number()]),
  step: z.number().positive().optional(),
  default: z.number(),
  auto: z.strictObject({ at: z.number(), label: z.string(), fn: z.string().min(1) }).optional(),
};

const presetExpect = z.strictObject({
  drive: z.string().min(1),
  value: z.union([z.number(), z.boolean()]),
  reads: z.record(z.string(), z.union([z.number(), z.string()])),
  tol: z.number().nonnegative().optional(),
});

const preset = z.strictObject({
  id: z.string().min(1),
  label: z.string(),
  params: z.record(z.string(), z.unknown()),
  note: z.string().optional(),
  expect: z.array(presetExpect).optional(),
});

const count = z.number().int().nonnegative();

const field: z.ZodType<unknown> = z.lazy(() => z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("mm"), ...numeric, ...common }),
  z.strictObject({ type: z.literal("deg"), ...numeric, ...common }),
  z.strictObject({ type: z.literal("int"), ...numeric, ...common }),
  z.strictObject({ type: z.literal("ratio"), ...numeric, ...common }),
  z.strictObject({ type: z.literal("number"), unit: z.string().min(1), log: z.boolean().optional(), ...numeric, ...common }),
  z.strictObject({ type: z.literal("bool"), default: z.boolean(), ...common }),
  z.strictObject({ type: z.literal("enum"), options: z.array(z.strictObject({ value: z.string(), label: z.string() })).min(1), default: z.string(), ...common }),
  z.strictObject({ type: z.literal("text"), default: z.string(), max: count.optional(), ...common }),
  z.strictObject({ type: z.literal("art"), accepts: z.array(z.enum(["svg", "png", "text"])).min(1), ...common }),
  z.strictObject({ type: z.literal("part"), catalog: z.string().min(1), default: z.string().optional(), ...common }),
  z.strictObject({ type: z.literal("list"), item: z.array(field).min(1), min: count, max: count, ...common }),
  z.strictObject({
    type: z.literal("instances"),
    types: z.record(z.string(), z.strictObject({ label: z.string(), blurb: z.string(), fields: z.array(field), presets: z.array(preset).optional() })),
    place: z.strictObject({
      lattice: z.strictObject({
        pitchMm: z.number().positive(), extent: z.string().min(1), faces: z.union([z.literal(1), z.literal(2)]).optional(), mirror: z.literal("x").optional(),
      }).optional(),
      z: z.literal("stack").optional(),
    }).optional(),
    min: count, max: count, ...common,
  }),
  z.strictObject({ type: z.literal("slot"), roles: z.array(z.string().min(1)).optional(), default: z.number().int().min(1), ...common }),
  z.strictObject({
    type: z.literal("derived"), fn: z.string().min(1), unit: z.string().optional(),
    limit: z.strictObject({ max: z.number().optional(), min: z.number().optional(), check: z.string().min(1) }).optional(),
    verdict: z.array(z.strictObject({ below: z.number(), word: z.string().min(1) })).optional(),
    focal: z.boolean().optional(),
    ...common,
  }),
]));

const group = z.strictObject({
  id: z.string().min(1),
  label: z.string(),
  fields: z.array(field),
  live: z.enum(["touch", "commit"]).optional(),
  showWhen: showWhen.optional(),
  readouts: z.array(field).optional(),
  note: z.string().optional(),
  fold: z.strictObject({ label: z.string(), fields: z.array(z.string().min(1)).min(1) }).optional(),
  presets: z.array(z.strictObject({ id: z.string().min(1), label: z.string(), params: z.record(z.string(), z.unknown()) })).optional(),
});

const mm2 = z.tuple([z.number(), z.number()]);

const metaSchema = z.strictObject({
  id: z.string().regex(CHASE_ID_PATTERN, "a lowercase slug, letters and digits joined by single hyphens"),
  kind: z.enum(CHASE_KINDS),
  name: z.string().min(1),
  version: z.number().int().nonnegative(),
  chase: z.literal(CHASE_SCHEMA_VERSION),
  kernels: z.array(z.enum(KERNEL_IDS)),
  machines: z.array(z.string().min(1)),
  license: z.string().min(1),
  derivedFrom: z.strictObject({ id: z.string().min(1), buildHash: z.string().min(1) }).optional(),
  aliases: z.array(z.string().min(1)).optional(),
});

/**
 * Strict where spec/chase.ts closes a type; loose (`looseObject`) only on
 * the subtrees another package's validator owns: assertions (Part IR),
 * applied (arch.apply), hookup (circuit), stack, scene and coupon.
 */
export const chaseDocSchema = z.strictObject({
  meta: metaSchema,
  materials: z.array(z.strictObject({
    slot: z.number().int().min(1),
    material: z.string().min(1),
    role: z.string().min(1),
    toolhead: z.number().int().min(1).optional(),
    label: z.string().optional(),
    preview: z.string().regex(/^#[0-9a-fA-F]{6}$/, "a #rrggbb colour").optional(),
  })),
  params: z.array(group),
  presets: z.array(preset).optional(),
  build: z.strictObject({ module: z.string().min(1), fn: z.string().min(1) }),
  expect: z.array(z.strictObject({
    check: z.string().min(1), target: z.string().min(1), verdict: z.enum(["fail", "warn"]), set: z.array(z.string().min(1)).optional(),
  })).optional(),
  waive: z.array(z.strictObject({
    check: z.string().min(1),
    target: z.string().min(1),
    reason: z.string().refine((s) => s.trim() !== "", "a non-empty reason"),
    until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "an iso date yyyy-mm-dd").optional(),
  })).optional(),
  exports: z.array(z.strictObject({
    kind: z.string().min(1),
    machine: z.string().min(1).optional(),
    pose: z.enum(["print", "assembly"]).optional(),
    sheet: mm2.optional(),
    bundle: z.array(z.string().min(1)).optional(),
    naming: z.literal("xNN_").optional(),
    plates: z.strictObject({ pack: z.literal("fdm"), bedMm: mm2 }).optional(),
    card: z.strictObject({ sections: z.array(z.enum(CARD_SECTIONS)), assembly: z.string().min(1).optional() }).optional(),
    presets: z.strictObject({ printer: z.string(), process: z.string(), filament: z.string() }).optional(),
  })),
  assertions: z.array(z.looseObject({ type: z.string().min(1) })),
  applied: z.array(z.looseObject({ archetype: z.string().min(1), part: z.string().min(1) })).optional(),
  hookup: z.array(z.looseObject({ port: z.string().min(1), mcu: z.string().min(1), pin: z.string().min(1), read: z.looseObject({}) })).optional(),
  stack: z.looseObject({}).optional(),
  motion: z.string().min(1).optional(),
  items: z.array(z.string().min(1)).optional(),
  scene: z.looseObject({ nets: z.literal("contact") }).optional(),
  coupon: z.looseObject({ carries: z.array(z.string()), machine: z.string().min(1), method: z.literal("coupon") }).optional(),
});

/** Why a top-level key is not on a schema 2 chase, by key. */
const RETIRED: Readonly<Record<string, string>> = {
  checks: "a chase never selects checks; the registry runs every check whose appliesTo matches (D-173). remove checks",
  views: "layout lives in bench.ts (D-174). move views to the bench",
  rail: "layout lives in bench.ts (D-174). move rail to the bench",
  status: "layout lives in bench.ts (D-174). move status to the bench",
  slots: "layout lives in bench.ts (D-174). move slots to the bench",
  welcome: "layout lives in bench.ts (D-174). move welcome to the bench",
};

const at = (root: unknown, path: readonly PropertyKey[]): unknown => {
  let v = root;
  for (const p of path) {
    if (v === null || typeof v !== "object") return undefined;
    v = (v as Record<PropertyKey, unknown>)[p];
  }
  return v;
};

/** zod issues as CommandErrors, one per issue (and one per unrecognised key). */
export function issuesToErrors(issues: readonly z.core.$ZodIssue[], root: unknown, record: string): CommandError[] {
  const out: CommandError[] = [];
  for (const i of issues) {
    if (i.code === "unrecognized_keys") {
      for (const k of i.keys) {
        const p = ptr([...i.path, k]);
        const retired = i.path.length === 0 ? RETIRED[k] : undefined;
        out.push({
          code: "E_SCHEMA", path: p, got: k, expected: "no such field on this schema",
          hint: retired ?? `remove ${k}; spec/chase.ts declares no such field here`, record: `${record}/unrecognized-key`,
        });
      }
      continue;
    }
    const got = at(root, i.path);
    out.push({
      code: "E_SCHEMA", path: ptr(i.path), got: got === undefined ? null : got, expected: i.message.toLowerCase(),
      hint: `fix ${ptr(i.path)}: ${i.message.toLowerCase()}`, record: `${record}/${i.code}`,
    });
  }
  return out;
}

/** The chase document against the strict schema; [] when it conforms. */
export function shapeErrors(value: unknown): CommandError[] {
  const r = chaseDocSchema.safeParse(value);
  return r.success ? [] : issuesToErrors(r.error.issues, value, "chase-schema");
}

// ---- params derived from the declarations ----

const NUMERIC = new Set(["mm", "deg", "int", "ratio", "number"]);
type Numeric = Extract<ParamField, { readonly type: "mm" | "deg" | "int" | "ratio" | "number" }>;
export const isNumeric = (f: ParamField): f is Numeric => NUMERIC.has(f.type);

/** Relative slack on the step test: decimal steps such as 0.02 are not exact in binary. */
const STEP_EPS = 1e-9;

/** True when v lies on lo + k * step for a whole k. */
export function onStep(v: number, lo: number, step: number): boolean {
  const k = (v - lo) / step;
  return Math.abs(k - Math.round(k)) <= STEP_EPS * Math.max(1, Math.abs(k));
}

function valueSchema(f: ParamField): z.ZodType<unknown> | undefined {
  if (isNumeric(f)) {
    const [lo, hi] = f.range;
    let n = z.number().min(lo).max(hi);
    if (f.type === "int") n = n.int();
    const step = f.step;
    return step === undefined ? n : n.refine((v) => onStep(v, lo, step), `a value on the ${step} step from ${lo}`);
  }
  switch (f.type) {
    case "bool": return z.boolean();
    case "enum": {
      const values = f.options.map((o) => o.value);
      return values.length === 0 ? z.never() : z.enum(values as [string, ...string[]]);
    }
    case "text": return f.max === undefined ? z.string() : z.string().max(f.max);
    case "art": return z.strictObject({ uri: z.string().min(1), kind: z.enum(["svg", "png", "text"]) }).nullable();
    case "part": return z.string();
    case "slot": return z.number().int().min(1);
    case "list": return z.array(z.strictObject(shapeOf(f.item))).min(f.min).max(f.max);
    case "instances": {
      const kinds = Object.entries(f.types).map(([k, t]) => z.strictObject({
        id: z.string().min(1),
        type: z.literal(k),
        at: z.tuple([z.number(), z.number()]).optional(),
        face: z.union([z.literal(1), z.literal(2)]).optional(),
        ...shapeOf(t.fields),
      }));
      const one = kinds.length === 0 ? z.never() : kinds.length === 1 ? kinds[0]! : z.discriminatedUnion("type", kinds as [typeof kinds[0], ...typeof kinds]);
      return z.array(one).min(f.min).max(f.max);
    }
    case "derived": return undefined;
  }
  return undefined;
}

function shapeOf(fields: readonly ParamField[]): Record<string, z.ZodType<unknown>> {
  const shape: Record<string, z.ZodType<unknown>> = {};
  for (const f of fields) {
    const s = valueSchema(f);
    if (s !== undefined) shape[f.id] = s;
  }
  return shape;
}

/** Every top-level input field of the chase, flattened across groups (ParamsOf's set). */
export function inputFields(chase: Pick<Chase, "params">): readonly ParamField[] {
  return chase.params.flatMap((g) => g.fields).filter((f) => f.type !== "derived");
}

/**
 * The params schema of a chase: one strict object over every input field,
 * derived fields absent. Numbers are finite (zod 4 refuses NaN and
 * Infinity), inside `range`, and on `step` where one is declared.
 */
export function paramsSchema(chase: Pick<Chase, "params">): z.ZodType<Record<string, unknown>> {
  return z.strictObject(shapeOf(inputFields(chase))) as unknown as z.ZodType<Record<string, unknown>>;
}

/** JSON Schema (draft 2020-12) of the params, for MCP and docs. Step refinements are not expressible and stay runtime-only. */
export function paramsJsonSchema(chase: Pick<Chase, "params">): Record<string, unknown> {
  return z.toJSONSchema(paramsSchema(chase), { unrepresentable: "any" }) as Record<string, unknown>;
}

/** Params against the derived schema; [] when they conform. */
export function paramsErrors(chase: Pick<Chase, "params">, params: unknown): CommandError[] {
  const r = paramsSchema(chase).safeParse(params);
  return r.success ? [] : issuesToErrors(r.error.issues, params, "chase-params");
}

// ---- CHASE_PARAM_RULES at runtime ----

function walkShowWhen(w: ShowWhen | undefined, out: string[]): string[] {
  if (w === undefined) return out;
  if ("field" in w) out.push(w.field);
  else if ("all" in w) w.all.forEach((x) => walkShowWhen(x, out));
  else w.any.forEach((x) => walkShowWhen(x, out));
  return out;
}

function fieldRules(fields: readonly ParamField[], base: string, out: CommandError[]): void {
  const seen = new Map<string, string>();
  fields.forEach((f, i) => {
    const p = `${base}/${i}`;
    const first = seen.get(f.id);
    if (first !== undefined) {
      out.push({
        code: "E_SCHEMA", path: `${p}/id`, got: f.id, expected: `one field per id; ${f.id} is already declared at ${first}`,
        hint: `rename one of the two fields ${f.id} at ${first} and ${p}`, record: "chase-param/field-id-unique",
      });
    } else seen.set(f.id, p);
    oneField(f, p, out);
  });
}

function oneField(f: ParamField, p: string, out: CommandError[]): void {
  if (isNumeric(f)) {
    const [lo, hi] = f.range;
    if (!(lo <= hi)) out.push({ code: "E_SCHEMA", path: `${p}/range`, got: f.range, expected: "min at most max", hint: `swap the range of ${f.id}`, record: "chase-param/default-range" });
    else if (f.default < lo || f.default > hi) {
      out.push({ code: "E_SCHEMA", path: `${p}/default`, got: f.default, expected: `inside ${lo} to ${hi}`, hint: `set the default of ${f.id} inside its range`, record: "chase-param/default-range" });
    } else if (f.step !== undefined && !onStep(f.default, lo, f.step)) {
      out.push({ code: "E_SCHEMA", path: `${p}/default`, got: f.default, expected: `a value on the ${f.step} step from ${lo}`, hint: `land the default of ${f.id} on its step (G-09)`, record: "chase-param/default-range" });
    }
    if (f.type === "int" && !Number.isInteger(f.default)) {
      out.push({ code: "E_SCHEMA", path: `${p}/default`, got: f.default, expected: "a whole number", hint: `write the default of ${f.id} as a whole number`, record: "chase-param/default-range" });
    }
    if (f.auto !== undefined && (f.auto.at < lo || f.auto.at > hi)) {
      out.push({ code: "E_SCHEMA", path: `${p}/auto/at`, got: f.auto.at, expected: `inside ${lo} to ${hi}`, hint: `set auto.at of ${f.id} inside its range`, record: "chase-param/readout" });
    }
  }
  if (f.type === "enum" && !f.options.some((o) => o.value === f.default)) {
    out.push({
      code: "E_SCHEMA", path: `${p}/default`, got: f.default, expected: `one of ${f.options.map((o) => o.value).join(", ")}`,
      hint: `set the default of ${f.id} to one of its options`, record: "chase-param/enum-default",
    });
  }
  if (f.type === "list") {
    if (f.min > f.max) out.push({ code: "E_SCHEMA", path: `${p}/min`, got: f.min, expected: `at most max ${f.max}`, hint: `lower min of ${f.id} to at most its max`, record: "chase-param/default-range" });
    fieldRules(f.item, `${p}/item`, out);
  }
  if (f.type === "instances") {
    if (f.min > f.max) out.push({ code: "E_SCHEMA", path: `${p}/min`, got: f.min, expected: `at most max ${f.max}`, hint: `lower min of ${f.id} to at most its max`, record: "chase-param/default-range" });
    for (const [k, t] of Object.entries(f.types)) fieldRules(t.fields, `${p}/types/${seg(k)}/fields`, out);
  }
  if (f.type === "derived") derivedRules(f, p, out);
}

function derivedRules(f: Extract<ParamField, { readonly type: "derived" }>, p: string, out: CommandError[]): void {
  if (f.limit !== undefined && f.limit.max === undefined && f.limit.min === undefined) {
    out.push({ code: "E_SCHEMA", path: `${p}/limit`, got: f.limit, expected: "max or min", hint: `give the limit of ${f.id} a max or a min`, record: "chase-param/readout" });
  }
  const v = f.verdict ?? [];
  for (let i = 1; i < v.length; i += 1) {
    if (!(v[i]!.below > v[i - 1]!.below)) {
      out.push({ code: "E_SCHEMA", path: `${p}/verdict/${i}/below`, got: v[i]!.below, expected: `above ${v[i - 1]!.below}`, hint: `order the verdict bands of ${f.id} by ascending below`, record: "chase-param/readout" });
    }
  }
}

/**
 * The CHASE_PARAM_RULES of spec/chase.ts on a chase value. field-id-unique
 * spans every group (and the group readouts, which share the namespace)
 * because ParamsOf flattens them, and holds inside each list item and
 * instance type on its own.
 */
export function paramRuleErrors(chase: Chase): CommandError[] {
  const out: CommandError[] = [];
  const top = new Map<string, string>();
  const groupIds = new Map<string, Set<string>>();
  chase.params.forEach((g: ParamGroup, gi) => {
    const ids = new Set<string>();
    groupIds.set(`${gi}`, ids);
    const rows: [ParamField, string][] = [
      ...g.fields.map((f, i): [ParamField, string] => [f, `/params/${gi}/fields/${i}`]),
      ...(g.readouts ?? []).map((f, i): [ParamField, string] => [f, `/params/${gi}/readouts/${i}`]),
    ];
    for (const [f, p] of rows) {
      ids.add(f.id);
      const first = top.get(f.id);
      if (first !== undefined) {
        out.push({
          code: "E_SCHEMA", path: `${p}/id`, got: f.id, expected: `one field per id across groups; ${f.id} is already declared at ${first}`,
          hint: `rename one of the two fields ${f.id} at ${first} and ${p}; ParamsOf flattens groups`, record: "chase-param/field-id-unique",
        });
      } else top.set(f.id, p);
      oneField(f, p, out);
    }
    (g.readouts ?? []).forEach((f, i) => {
      if ((f as ParamField).type !== "derived") {
        out.push({ code: "E_SCHEMA", path: `/params/${gi}/readouts/${i}/type`, got: (f as ParamField).type, expected: "derived", hint: "a readout grid holds derived fields only", record: "chase-param/readout" });
      }
    });
    (g.fold?.fields ?? []).forEach((id, i) => {
      if (!ids.has(id)) {
        out.push({ code: "E_REF", path: `/params/${gi}/fold/fields/${i}`, got: id, didYouMean: didYouMean(id, [...ids]), hint: `fold only fields of group ${g.id}`, record: "chase-param/fold" });
      }
    });
    (g.presets ?? []).forEach((pr, pi) => {
      for (const k of Object.keys(pr.params)) {
        if (!ids.has(k)) {
          out.push({ code: "E_REF", path: `/params/${gi}/presets/${pi}/params/${seg(k)}`, got: k, didYouMean: didYouMean(k, [...ids]), hint: `a group preset sets fields of group ${g.id} only`, record: "chase-param/preset-param" });
        }
      }
    });
  });
  const declared = [...top.keys()];
  const showWhenAt = (w: ShowWhen | undefined, p: string): void => {
    for (const leaf of walkShowWhen(w, [])) {
      if (!top.has(leaf)) out.push({ code: "E_REF", path: `${p}/showWhen`, got: leaf, didYouMean: didYouMean(leaf, declared), hint: `name a declared field in showWhen, not ${leaf}`, record: "chase-param/show-when" });
    }
  };
  chase.params.forEach((g, gi) => {
    showWhenAt(g.showWhen, `/params/${gi}`);
    g.fields.forEach((f, i) => showWhenAt(f.showWhen, `/params/${gi}/fields/${i}`));
  });
  const inputs = new Map(inputFields(chase).map((f) => [f.id, f]));
  const inputIds = [...inputs.keys()];
  (chase.presets ?? []).forEach((pr, pi) => {
    for (const [k, v] of Object.entries(pr.params)) {
      const p = `/presets/${pi}/params/${seg(k)}`;
      const f = inputs.get(k);
      if (f === undefined) {
        out.push({ code: "E_REF", path: p, got: k, didYouMean: didYouMean(k, inputIds), hint: `a preset sets declared input fields only, not ${k}`, record: "chase-param/preset-param" });
        continue;
      }
      if (f.type === "instances" && Array.isArray(v)) {
        v.forEach((inst: unknown, ii) => {
          const t = inst !== null && typeof inst === "object" ? (inst as Record<string, unknown>)["type"] : undefined;
          if (typeof t !== "string" || !Object.prototype.hasOwnProperty.call(f.types, t)) {
            out.push({ code: "E_REF", path: `${p}/${ii}/type`, got: t ?? null, didYouMean: didYouMean(t, Object.keys(f.types)), hint: `give the instance a type ${f.id} declares`, record: "chase-param/instance-type" });
          }
        });
      }
    }
  });
  return out;
}
