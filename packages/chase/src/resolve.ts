// Registry-validated strings (D-132, plan-deltas R90; M10-T02 step 5). A
// chase names exporters, checks, constraint dims, machines and materials
// by id; each id must resolve in its registry or the chase refuses to
// render with E_REF and didYouMean. Nothing is skipped silently: a check
// id that resolves to nothing is an error (v3 section 13), never a check
// that quietly does not run. A chase never selects checks (D-173), so a
// check id appears only in expect, waive, a row's `checks` binding or a
// derived limit. A waiver on a precondition check is E_SCHEMA (D-067,
// spec/chase.ts WaiverDecl); an empty reason is caught by the schema.
//
// The registries are passed in. This package runs in a bake as well as in
// node, and the exporter and constraint registries are assembled by core
// (core/src/commands/export-run.ts EXPORT_KINDS, core/src/load/
// constraints.ts), so the caller hands over the id lists. Panels are a
// bench.ts reference since D-174 and resolve with the bench, not here.

import { didYouMean, type Chase, type CommandError, type ParamField } from "@hackbuild/spec";
import { seg } from "./schema.js";

export interface CheckEntry {
  readonly id: string;
  /** CheckDef.precondition: a waiver may never cover it (D-067). */
  readonly precondition?: true;
}

export interface ChaseRegistries {
  readonly checks: readonly CheckEntry[];
  /** Old check id to current id (packages/checks CHECK_ID_ALIASES). */
  readonly checkAliases?: Readonly<Record<string, string>>;
  readonly exporters: readonly string[];
  readonly constraintDims: readonly string[];
  /** Profile machine ids. */
  readonly machines: readonly string[];
  /** Profile material ids. */
  readonly materials: readonly string[];
  /**
   * Claim function registry ids (packages/checks claim registry). Absent
   * reads as empty: a claim whose fn resolves to nothing is E_REF, never a
   * claim that quietly goes unchecked.
   */
  readonly claimFns?: readonly string[];
  /**
   * Widget kinds a widget registry holds (packages/ui-core widgetKinds).
   * Absent reads as empty: a bench widget whose kind resolves to nothing
   * is E_REF, never a control that quietly draws nothing.
   */
  readonly widgetKinds?: readonly string[];
}

function fieldsAt(fields: readonly ParamField[], base: string, out: [ParamField, string][]): void {
  fields.forEach((f, i) => {
    const p = `${base}/${i}`;
    out.push([f, p]);
    if (f.type === "list") fieldsAt(f.item, `${p}/item`, out);
    if (f.type === "instances") for (const [k, t] of Object.entries(f.types)) fieldsAt(t.fields, `${p}/types/${seg(k)}/fields`, out);
  });
}

/** Every ParamField of the chase at any depth, with its pointer. */
export function allFields(chase: Pick<Chase, "params">): [ParamField, string][] {
  const out: [ParamField, string][] = [];
  chase.params.forEach((g, gi) => {
    fieldsAt(g.fields, `/params/${gi}/fields`, out);
    fieldsAt(g.readouts ?? [], `/params/${gi}/readouts`, out);
  });
  return out;
}

/** E_REF and E_SCHEMA errors for every id the registries do not hold; [] when all resolve. */
export function resolveRefs(chase: Chase, reg: ChaseRegistries): CommandError[] {
  const out: CommandError[] = [];
  const checks = new Map(reg.checks.map((c) => [c.id, c]));
  const checkIds = [...checks.keys()];
  const ref = (got: string, set: readonly string[], path: string, what: string, record: string): boolean => {
    if (set.includes(got)) return true;
    out.push({ code: "E_REF", path, got, didYouMean: didYouMean(got, set), hint: `name a registered ${what}, not ${got}`, record: `chase-ref/${record}` });
    return false;
  };
  const check = (got: string, path: string): ReturnType<typeof checks.get> => {
    const id = reg.checkAliases?.[got] ?? got;
    const c = checks.get(id);
    if (c === undefined) {
      out.push({ code: "E_REF", path, got, didYouMean: didYouMean(got, checkIds), hint: `name a registered check id, not ${got}; the chase refuses to render until it resolves`, record: "chase-ref/check" });
    }
    return c;
  };

  chase.meta.machines.forEach((m, i) => ref(m, reg.machines, `/meta/machines/${i}`, "machine", "machine"));
  chase.materials.forEach((m, i) => ref(m.material, reg.materials, `/materials/${i}/material`, "material", "material"));
  chase.exports.forEach((e, i) => {
    ref(e.kind, reg.exporters, `/exports/${i}/kind`, "exporter", "exporter");
    if (e.machine !== undefined) ref(e.machine, reg.machines, `/exports/${i}/machine`, "machine", "machine");
    (e.bundle ?? []).forEach((k, j) => ref(k, reg.exporters, `/exports/${i}/bundle/${j}`, "exporter", "exporter"));
  });
  (chase.expect ?? []).forEach((x, i) => check(x.check, `/expect/${i}/check`));
  (chase.waive ?? []).forEach((w, i) => {
    const c = check(w.check, `/waive/${i}/check`);
    if (c?.precondition === true) {
      out.push({
        code: "E_SCHEMA", path: `/waive/${i}/check`, got: w.check, expected: "a check that is not a precondition",
        hint: `remove the waiver; ${c.id} is a precondition check and a precondition failure is never waived (D-067)`, record: "chase-ref/waive-precondition",
      });
    }
  });
  for (const [f, p] of allFields(chase)) {
    if (f.constraintDim !== undefined) ref(f.constraintDim, reg.constraintDims, `${p}/constraintDim`, "constraint dim", "constraint-dim");
    (f.checks ?? []).forEach((id, j) => check(id, `${p}/checks/${j}`));
    if (f.type === "derived" && f.limit !== undefined) check(f.limit.check, `${p}/limit/check`);
  }
  if (chase.coupon !== undefined) {
    ref(chase.coupon.machine, reg.machines, "/coupon/machine", "machine", "machine");
    const mats = typeof chase.coupon.material === "string" ? [chase.coupon.material] : chase.coupon.material;
    mats.forEach((m, i) => ref(m, reg.materials, typeof chase.coupon!.material === "string" ? "/coupon/material" : `/coupon/material/${i}`, "material", "material"));
  }
  (chase.claims ?? []).forEach((c, i) => ref(c.fn, reg.claimFns ?? [], `/claims/${i}/fn`, "claim function", "claim-fn"));
  return out;
}

/**
 * E_REF for every bench widget whose kind no widget registry holds
 * (spec/widgets.ts, R1-engine-12), record "chase-ref/widget-kind". The
 * bench is read as data, so each field is guarded; pointers start at the
 * bench literal (/views/widgets/0/kind). [] when every kind resolves.
 */
export function resolveBenchRefs(bench: unknown, reg: Pick<ChaseRegistries, "widgetKinds">): CommandError[] {
  const rec = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
  if (!rec(bench) || !rec(bench["views"])) return [];
  const widgets = bench["views"]["widgets"];
  if (!Array.isArray(widgets)) return [];
  const kinds = reg.widgetKinds ?? [];
  const out: CommandError[] = [];
  widgets.forEach((w: unknown, i) => {
    const got = String(rec(w) ? w["kind"] : w);
    if (kinds.includes(got)) return;
    out.push({
      code: "E_REF", path: `/views/widgets/${i}/kind`, got, didYouMean: didYouMean(got, kinds),
      hint: `bench.ts: name a registered widget kind, not ${got}`, record: "chase-ref/widget-kind",
    });
  });
  return out;
}
