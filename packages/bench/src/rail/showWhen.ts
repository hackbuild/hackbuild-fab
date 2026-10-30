// Row visibility for the parameter rail (M09-T08 step 2, spec/chase.ts
// ShowWhen). Ported from PIP part3.js `UI.visibility` (lines 296 to 310):
// a hidden row keeps its value in the design and still feeds the build; the
// rail re-evaluates after every commit. PIP compared one dotted path to one
// string; ShowWhen adds notEquals, in, all and any.
//
// Scope: a leaf names a field id. Inside a list instance the instance's own
// fields answer first, then the design's top-level fields, so a sibling
// condition such as "type hidden when this group's kind is stick" is one
// leaf (PIP renderGroups, part3.js lines 316 to 324).

import type { ParamField, Scalar, ShowWhen } from "@hackbuild/spec";

/** One level of values: the design's top level, or one list instance. */
export type Scope = Readonly<Record<string, unknown>>;

/** Value of `id` in the innermost scope that holds it; undefined when none does. */
export function lookup(id: string, scopes: readonly Scope[]): unknown {
  for (const s of scopes) if (Object.hasOwn(s, id)) return s[id];
  return undefined;
}

const same = (a: unknown, b: Scalar): boolean => a === b;

/** True when the row shows. No condition shows. `scopes` runs innermost first. */
export function shows(w: ShowWhen | undefined, scopes: readonly Scope[]): boolean {
  if (w === undefined) return true;
  if ("all" in w) return w.all.every((x) => shows(x, scopes));
  if ("any" in w) return w.any.some((x) => shows(x, scopes));
  const v = lookup(w.field, scopes);
  if ("equals" in w) return same(v, w.equals);
  if ("notEquals" in w) return !same(v, w.notEquals);
  return w.in.some((x) => same(v, x));
}

/**
 * A key field names a list instance and never renders as a row: an enum
 * whose showWhen is `{ field, in: [] }`, which no value matches. The
 * instance head reads its option label (PIP GROUP_NAMES, part3.js line 314).
 */
export function isKeyField(f: ParamField): f is Extract<ParamField, { readonly type: "enum" }> {
  const w = f.showWhen;
  return f.type === "enum" && w !== undefined && "in" in w && w.in.length === 0;
}

/** Head of list instance `index`: the key field's option label, else the list label and a 1-based number. */
export function instanceHead(list: Extract<ParamField, { readonly type: "list" }>, value: Scope, index: number): string {
  const key = list.item.find(isKeyField);
  if (key !== undefined) {
    const opt = key.options.find((o) => o.value === value[key.id]);
    if (opt !== undefined) return opt.label;
  }
  return `${list.label} ${index + 1}`;
}

/** Fields of `fields` that render as rows now, in declared order. */
export function visibleFields(fields: readonly ParamField[], scopes: readonly Scope[]): ParamField[] {
  return fields.filter((f) => !isKeyField(f) && shows(f.showWhen, scopes));
}
