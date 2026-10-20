// Deep normalise (D-131; M10-T03 step 3), the form of x/tsc/m10/snippet.ts
// grown to every ParamField type. A stored document is normalised against
// the chase's own declarations before build.ts sees it: defaults at every
// depth, list items normalised against the item fields and their count
// clamped to min and max, unknown keys dropped, and a value of the wrong
// type or a non-finite number replaced by the default. Every drop, replace
// and clamp is listed by JSON pointer and becomes a W_NORMALISED warning,
// so a normalised load shows in the status strip and in CommandResult.
//
// badge-replicator normalizeBadgeSpec merged one level deep and let NaN
// through to geometry (presets.ts lines 67 to 78); this walks every level
// and writes only declared keys, so nothing reaches build.ts missing,
// non-finite, or under a key the chase does not declare (__proto__
// included).

import type { BuildWarning, Chase, ParamField } from "@hackbuild/spec";
import { isNumeric, seg } from "./schema.js";

export interface NormaliseReport {
  /** Keys the chase does not declare, and derived fields, which are never inputs. */
  readonly dropped: string[];
  /** Values of the wrong type or non-finite, set to the default. */
  readonly replaced: string[];
  /** Lists whose count was raised to min or cut to max. */
  readonly clamped: string[];
}

export const emptyReport = (): NormaliseReport => ({ dropped: [], replaced: [], clamped: [] });

type Obj = Record<string, unknown>;
const isPlain = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const has = (o: Obj, k: string): boolean => Object.prototype.hasOwnProperty.call(o, k);

function scalar(f: ParamField, v: unknown, p: string, rep: NormaliseReport): unknown {
  const keep = (ok: boolean, fallback: unknown): unknown => {
    if (ok) return v;
    if (v !== undefined) rep.replaced.push(p);
    return fallback;
  };
  if (isNumeric(f)) return keep(typeof v === "number" && Number.isFinite(v), f.default);
  switch (f.type) {
    case "bool": return keep(typeof v === "boolean", f.default);
    case "enum": return keep(typeof v === "string" && f.options.some((o) => o.value === v), f.default);
    case "text": return keep(typeof v === "string", f.default);
    case "part": return keep(typeof v === "string", f.default ?? "");
    case "slot": return keep(typeof v === "number" && Number.isInteger(v) && v >= 1, f.default);
    case "art": {
      const ok = v === null || (isPlain(v) && typeof v["uri"] === "string" && typeof v["kind"] === "string" && (f.accepts as readonly string[]).includes(v["kind"]));
      return ok ? (v === null ? null : { uri: (v as Obj)["uri"], kind: (v as Obj)["kind"] }) : keep(false, null);
    }
  }
  return undefined;
}

function list(f: Extract<ParamField, { readonly type: "list" }>, v: unknown, p: string, rep: NormaliseReport): Obj[] {
  if (!Array.isArray(v) && v !== undefined) rep.replaced.push(p);
  const items = Array.isArray(v) ? v : [];
  const n = Math.min(Math.max(items.length, f.min), f.max);
  if (Array.isArray(v) && n !== items.length) rep.clamped.push(p);
  return Array.from({ length: n }, (_x, i) => {
    const it: unknown = items[i];
    if (it !== undefined && !isPlain(it)) rep.replaced.push(`${p}/${i}`);
    return normaliseFields(f.item, it, `${p}/${i}`, rep);
  });
}

function instances(f: Extract<ParamField, { readonly type: "instances" }>, v: unknown, p: string, rep: NormaliseReport): Obj[] {
  if (!Array.isArray(v) && v !== undefined) rep.replaced.push(p);
  const out: Obj[] = [];
  (Array.isArray(v) ? v : []).forEach((it: unknown, i) => {
    const at = `${p}/${i}`;
    const t = isPlain(it) ? it["type"] : undefined;
    if (!isPlain(it) || typeof t !== "string" || !has(f.types, t) || typeof it["id"] !== "string") {
      rep.dropped.push(at);
      return;
    }
    const def = f.types[t]!;
    const base: Obj = { id: it["id"], type: t };
    const cell = it["at"];
    if (Array.isArray(cell) && cell.length === 2 && cell.every((c) => typeof c === "number" && Number.isFinite(c))) base["at"] = [cell[0], cell[1]];
    else if (cell !== undefined) rep.replaced.push(`${at}/at`);
    if (it["face"] === 1 || it["face"] === 2) base["face"] = it["face"];
    else if (it["face"] !== undefined) rep.replaced.push(`${at}/face`);
    const rest: Obj = {};
    for (const k of Object.keys(it)) if (k !== "id" && k !== "type" && k !== "at" && k !== "face") rest[k] = it[k];
    out.push({ ...base, ...normaliseFields(def.fields, rest, at, rep) });
  });
  if (out.length > f.max) {
    out.length = f.max;
    rep.clamped.push(p);
  }
  const first = Object.keys(f.types)[0];
  if (out.length < f.min && first !== undefined) {
    while (out.length < f.min) out.push({ id: `${first}-${out.length + 1}`, type: first, ...normaliseFields(f.types[first]!.fields, undefined, `${p}/${out.length}`, rep) });
    rep.clamped.push(p);
  }
  return out;
}

/** Normalise `stored` against `fields` at pointer `at`, appending to `rep`. */
export function normaliseFields(fields: readonly ParamField[], stored: unknown, at: string, rep: NormaliseReport): Obj {
  const src: Obj = isPlain(stored) ? stored : {};
  if (stored !== undefined && !isPlain(stored) && at === "") rep.replaced.push("/");
  const out: Obj = {};
  const inputs = new Set(fields.filter((f) => f.type !== "derived").map((f) => f.id));
  for (const k of Object.keys(src)) if (!inputs.has(k)) rep.dropped.push(`${at}/${seg(k)}`);
  for (const f of fields) {
    if (f.type === "derived") continue;
    const p = `${at}/${seg(f.id)}`;
    const v = has(src, f.id) ? src[f.id] : undefined;
    if (f.type === "list") out[f.id] = list(f, v, p, rep);
    else if (f.type === "instances") out[f.id] = instances(f, v, p, rep);
    else out[f.id] = scalar(f, v, p, rep);
  }
  return out;
}

/** Params of a chase from a stored params object, with the report. */
export function normaliseParams(chase: Pick<Chase, "params">, stored: unknown): { readonly params: Obj; readonly report: NormaliseReport } {
  const report = emptyReport();
  const params = normaliseFields(chase.params.flatMap((g) => g.fields), stored, "", report);
  return { params, report };
}

/** The params a document carries: `state` of a bench design file, `params`, or the object itself. */
export function storedParams(doc: unknown): unknown {
  if (!isPlain(doc)) return doc;
  if (isPlain(doc["state"])) return doc["state"];
  if (isPlain(doc["params"])) return doc["params"];
  return doc;
}

/** The report as BuildWarnings, code W_NORMALISED, one per pointer. */
export function normalisedWarnings(rep: NormaliseReport): BuildWarning[] {
  return [
    ...rep.dropped.map((p) => ({ code: "W_NORMALISED", text: `dropped ${p}: not a setting of this design`, param: p })),
    ...rep.replaced.map((p) => ({ code: "W_NORMALISED", text: `replaced ${p} with its default: wrong type or not a finite number`, param: p })),
    ...rep.clamped.map((p) => ({ code: "W_NORMALISED", text: `clamped the count of ${p} to its declared min and max`, param: p })),
  ];
}
