// Chase params as part.build resolves them (CommandIO part.build):
// defaults, then a preset, then params by field or group id, then JSON
// pointer keys, each validated against its field. Shared by core and a
// baked bench, so a page hashes the values the CLI hashes (D-264).

import { commandError as cmdError, didYouMean, type Chase, type ParamField, type ParamGroup } from "@hackbuild/spec";

export type Values = Record<string, unknown>;

type NumericField = Extract<ParamField, { readonly range: readonly [number, number] }>;
const NUMERIC_TYPES: ReadonlySet<string> = new Set(["mm", "deg", "int", "ratio", "number"]);
const UNIT_OF: Readonly<Record<string, string>> = { mm: "mm", deg: "deg", int: "count", ratio: "ratio" };

const inputFields = (fields: readonly ParamField[]): ParamField[] => fields.filter((f) => f.type !== "derived");

function fieldDefault(f: ParamField): unknown {
  if (f.type === "list") {
    const item = itemDefaults(f.item);
    return Array.from({ length: f.min }, () => ({ ...item }));
  }
  return "default" in f ? f.default : undefined;
}

function itemDefaults(fields: readonly ParamField[]): Values {
  const out: Values = {};
  for (const f of inputFields(fields)) {
    const d = fieldDefault(f);
    if (d !== undefined) out[f.id] = d;
  }
  return out;
}

/** Defaults of every input field; a list takes `min` items at the item defaults. */
export function defaultsOf(chase: Chase): Values {
  return itemDefaults(chase.params.flatMap((g) => g.fields));
}

const isObject = (v: unknown): v is Values => typeof v === "object" && v !== null && !Array.isArray(v);

/** Objects merge key by key; a list or scalar replaces whole (CommandIO part.build). */
function merge(base: Values, over: Values): Values {
  const out: Values = { ...base };
  for (const [k, v] of Object.entries(over)) out[k] = isObject(v) && isObject(out[k]) ? merge(out[k] as Values, v) : v;
  return out;
}

function schemaError(p: string, got: unknown, expected: string, hint: string): never {
  throw cmdError({ code: "E_SCHEMA", path: p, got, expected, hint });
}

function checkValue(f: ParamField, v: unknown, p: string): unknown {
  if (NUMERIC_TYPES.has(f.type)) {
    const nf = f as NumericField;
    const unit = f.type === "number" ? (f as { unit: string }).unit : UNIT_OF[f.type] ?? "";
    if (typeof v !== "number" || !Number.isFinite(v)) schemaError(p, v, `a number in ${unit}`, `set ${f.id} to a number`);
    if (nf.range !== undefined && (v < nf.range[0] || v > nf.range[1])) {
      schemaError(p, v, `${nf.range[0]} to ${nf.range[1]} ${unit}`, `set ${f.id} inside its range`);
    }
    if (f.type === "int" && !Number.isInteger(v)) schemaError(p, v, "a whole number", `set ${f.id} to a whole number`);
    return v;
  }
  if (f.type === "enum") {
    const values = f.options.map((o) => o.value);
    if (typeof v !== "string" || !values.includes(v)) schemaError(p, v, `one of ${values.join(", ")}`, `pick a listed value for ${f.id}`);
    return v;
  }
  if (f.type === "bool") {
    if (typeof v !== "boolean") schemaError(p, v, "true or false", `set ${f.id} to true or false`);
    return v;
  }
  if (f.type === "text") {
    if (typeof v !== "string") schemaError(p, v, "a string", `set ${f.id} to text`);
    return v;
  }
  if (f.type === "list") {
    if (!Array.isArray(v) || v.length < f.min || v.length > f.max) {
      schemaError(p, Array.isArray(v) ? v.length : v, `a list of ${f.min} to ${f.max} items`, `give ${f.id} between ${f.min} and ${f.max} items`);
    }
    const defaults = itemDefaults(f.item);
    return v.map((item, i) => checkGroup(inputFields(f.item), isObject(item) ? merge(defaults, item) : item, `${p}/${i}`));
  }
  return v;
}

/**
 * Validate one level of params. `at` maps a field id to the pointer the
 * caller wrote it under, so a group-qualified value reports its own path
 * ("/rim/w" for field w of group rim).
 */
function checkGroup(fields: readonly ParamField[], v: unknown, p: string, at: ReadonlyMap<string, string> = new Map(), more: readonly string[] = []): Values {
  if (!isObject(v)) schemaError(p === "" ? "/" : p, v, "an object of param values", "pass params as a json object");
  const ids = fields.map((f) => f.id);
  const out: Values = {};
  for (const [k, val] of Object.entries(v)) {
    const f = fields.find((x) => x.id === k);
    const where = at.get(k) ?? `${p}/${k}`;
    if (f === undefined) {
      throw cmdError({ code: "E_SCHEMA", path: where, got: k, expected: `a param id: ${ids.join(", ")}`, didYouMean: didYouMean(k, [...ids, ...more]), hint: `remove ${k}; the chase declares no such param` });
    }
    out[k] = checkValue(f, val, where);
  }
  return out;
}

/**
 * Params may name a field directly ({"w": 3}) or under its group id
 * ({"rim": {"w": 3}}); field ids are unique across a chase, so both forms
 * name one field. Returns the flat values and each field's written pointer.
 */
function ungroup(groups: readonly ParamGroup[], plain: Values): { readonly flat: Values; readonly at: Map<string, string> } {
  const fieldIds = new Set(groups.flatMap((g) => g.fields.map((f) => f.id)));
  const flat: Values = {};
  const at = new Map<string, string>();
  for (const [k, v] of Object.entries(plain)) {
    const group = fieldIds.has(k) ? undefined : groups.find((g) => g.id === k);
    if (group !== undefined && isObject(v)) {
      for (const [fk, fv] of Object.entries(v)) {
        flat[fk] = fv;
        at.set(fk, `/${k}/${fk}`);
      }
    } else {
      flat[k] = v;
      at.set(k, `/${k}`);
    }
  }
  return { flat, at };
}

/** A pointer whose first segment is a group id names the field below it. */
function fieldPointer(groups: readonly ParamGroup[], pointer: string): string {
  const [, head, ...rest] = pointer.split("/");
  const fieldIds = new Set(groups.flatMap((g) => g.fields.map((f) => f.id)));
  if (head === undefined || fieldIds.has(head) || rest.length === 0) return pointer;
  return groups.some((g) => g.id === head) ? `/${rest.join("/")}` : pointer;
}

/** Every pointer a param edit may name: /<field> and /<list>/<i>/<item field>. */
function pointersOf(groups: readonly ParamGroup[], values: Values): string[] {
  const out: string[] = [];
  for (const f of inputFields(groups.flatMap((g) => g.fields))) {
    if (f.type === "list") {
      const n = Array.isArray(values[f.id]) ? (values[f.id] as unknown[]).length : 0;
      for (let i = 0; i < n; i += 1) for (const it of inputFields(f.item)) out.push(`/${f.id}/${i}/${it.id}`);
    } else out.push(`/${f.id}`);
  }
  return out;
}

function setPointer(values: Values, pointer: string, v: unknown, known: readonly string[]): Values {
  if (!known.includes(pointer)) {
    throw cmdError({ code: "E_REF", path: pointer, got: pointer, didYouMean: didYouMean(pointer, known), hint: "name a param pointer the chase declares" });
  }
  const out = JSON.parse(JSON.stringify(values)) as Values;
  const segs = pointer.split("/").slice(1);
  let at: Values | unknown[] = out;
  for (const s of segs.slice(0, -1)) at = (at as Values)[s] as Values;
  (at as Values)[segs[segs.length - 1]!] = v;
  return out;
}

/**
 * Keys a params object may not carry at any level. JSON.parse makes
 * "__proto__" an own key, and assigning it while merging would set a
 * prototype instead of a param, so the unknown-key check would never see it.
 */
const FORBIDDEN_PARAM_KEYS: ReadonlySet<string> = new Set(["__proto__", "constructor", "prototype"]);

function refuseForbiddenKeys(v: unknown, at: string): void {
  if (Array.isArray(v)) {
    v.forEach((x, i) => refuseForbiddenKeys(x, `${at}/${i}`));
    return;
  }
  if (typeof v !== "object" || v === null) return;
  for (const k of Object.keys(v)) {
    const p = `${at}/${k.replace(/~/g, "~0").replace(/\//g, "~1")}`;
    if (FORBIDDEN_PARAM_KEYS.has(k)) {
      throw cmdError({ code: "E_SCHEMA", path: p, got: k, expected: "a param id", hint: `remove ${k}; it names no param` });
    }
    refuseForbiddenKeys((v as Values)[k], p);
  }
}

/** Merged, validated params: defaults, then the preset, then params, then pointer keys. */
export function resolveParams(chase: Chase, params: Values | undefined, preset: string | undefined): Values {
  refuseForbiddenKeys(params ?? {}, "");
  let values = defaultsOf(chase);
  if (preset !== undefined) {
    const row = (chase.presets ?? []).find((p) => p.id === preset);
    if (row === undefined) {
      const ids = (chase.presets ?? []).map((p) => p.id);
      throw cmdError({ code: "E_REF", path: "/preset", got: preset, didYouMean: didYouMean(preset, ids), hint: "name a preset the chase declares" });
    }
    values = merge(values, row.params as Values);
  }
  const plain = Object.fromEntries(Object.entries(params ?? {}).filter(([k]) => !k.startsWith("/")));
  const fields = inputFields(chase.params.flatMap((g) => g.fields));
  const { flat, at } = ungroup(chase.params, plain);
  values = checkGroup(fields, merge(values, flat), "", at, chase.params.map((g) => g.id));
  for (const [k, v] of Object.entries(params ?? {}).filter(([key]) => key.startsWith("/"))) {
    const known = pointersOf(chase.params, values);
    const field = fieldPointer(chase.params, k);
    if (!known.includes(field)) setPointer(values, k, v, known);
    values = setPointer(values, field, v, known);
  }
  return checkGroup(fields, values, "");
}
