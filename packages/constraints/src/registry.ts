// The constraints registry (D-044). Kernels and canons export ConstraintDef
// objects typed against spec only; core collects them at load and
// registers them here, so this package imports no kernel. A def is checked
// whole before it lands: a refused def leaves the registry unchanged.

import { KERNEL_IDS, type ConstraintDef, type ConstraintDim } from "@hackbuild/spec";
import { defSchemaError, pointerToken } from "./errors.js";

export interface ConstraintRegistry {
  /** Adds a def. E_SCHEMA on a duplicate id, a kernel outside KernelId, or a unit or step that disagrees with an earlier def on the same dim. */
  register(def: ConstraintDef): void;
  /** Defs naming dim, in registration order. The solver's result never depends on this order. */
  defsFor(dim: ConstraintDim): readonly ConstraintDef[];
  /** Unit every def on dim declared, or undefined for an unregistered dim. */
  unitOf(dim: ConstraintDim): string | undefined;
  /** Grid step on dim, or undefined when no def declares one. */
  stepOf(dim: ConstraintDim): number | undefined;
  /** Every registered dim, sorted. */
  dims(): readonly ConstraintDim[];
  /** Every registered def id, sorted. */
  ids(): readonly string[];
}

const DIM = /^[^.\s]+\.[^\s]+$/;
const KERNELS: readonly string[] = KERNEL_IDS;

const byCodeUnit = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

export function createRegistry(defs: readonly ConstraintDef[] = []): ConstraintRegistry {
  const byId = new Map<string, ConstraintDef>();
  const byDim = new Map<ConstraintDim, ConstraintDef[]>();
  const units = new Map<ConstraintDim, string>();
  const steps = new Map<ConstraintDim, number>();

  function validate(def: ConstraintDef): void {
    const raw = def as unknown as Record<string, unknown>;
    const id = raw["id"];
    if (typeof id !== "string" || id === "") throw defSchemaError(id, "/id", id ?? null, "a non-empty string", "constraint id is missing; give the def an id");
    if (byId.has(id)) throw defSchemaError(id, "/id", id, "an id no registered def uses", `constraint ${id} is already registered; rename one of the two defs`);
    if (typeof raw["version"] !== "string" || raw["version"] === "") throw defSchemaError(id, "/version", raw["version"] ?? null, "a semver string", "constraint version is missing; give the def a semver version");
    if (typeof raw["bounds"] !== "function") throw defSchemaError(id, "/bounds", null, "a function (dim, ctx) returning bounds", "constraint has no bounds function; add one");
    if (raw["expectedFor"] !== undefined && typeof raw["expectedFor"] !== "function") throw defSchemaError(id, "/expectedFor", null, "a function or absent", "expectedFor is not a function; remove it or make it one");

    const kernels = raw["kernels"];
    if (!Array.isArray(kernels) || kernels.length === 0) throw defSchemaError(id, "/kernels", kernels ?? null, "a non-empty list of kernel ids", "constraint names no kernel; list the kernels its bounds come from");
    kernels.forEach((k: unknown, i) => {
      if (typeof k !== "string" || !KERNELS.includes(k)) throw defSchemaError(id, `/kernels/${i}`, k ?? null, `one of ${KERNELS.join(", ")}`, "unknown kernel id; use one from the KernelId union (D-057)");
    });

    const dims = raw["dims"];
    if (!Array.isArray(dims) || dims.length === 0) throw defSchemaError(id, "/dims", dims ?? null, "a non-empty list of dims", "constraint names no dim; list the dims it bounds");
    const unitRec = (raw["units"] ?? {}) as Record<string, unknown>;
    const stepRec = (raw["steps"] ?? {}) as Record<string, unknown>;
    const seen = new Set<string>();
    dims.forEach((d: unknown, i) => {
      if (typeof d !== "string" || !DIM.test(d)) throw defSchemaError(id, `/dims/${i}`, d ?? null, "<kind or role>.<field>, for example conductor.width", "malformed dim; name it <kind>.<field>");
      if (seen.has(d)) throw defSchemaError(id, `/dims/${i}`, d, "each dim once", "dim listed twice; list it once");
      seen.add(d);
      const dim = d as ConstraintDim;
      const unit = unitRec[d];
      if (typeof unit !== "string" || unit === "") throw defSchemaError(id, `/units/${pointerToken(d)}`, unit ?? null, "a unit string, for example mm", `no unit for ${d}; declare it in units`);
      const known = units.get(dim);
      if (known !== undefined && known !== unit) throw defSchemaError(id, `/units/${pointerToken(d)}`, unit, known, `unit of ${d} disagrees with a registered def; use ${known}`);
      const step = stepRec[d];
      if (step !== undefined && (typeof step !== "number" || !Number.isFinite(step) || step <= 0)) throw defSchemaError(id, `/steps/${pointerToken(d)}`, typeof step === "number" ? String(step) : step, "a finite number above 0", `step of ${d} is not a positive number; fix it`);
      const knownStep = steps.get(dim);
      const declared = byDim.has(dim);
      if (declared && (step ?? undefined) !== knownStep) throw defSchemaError(id, `/steps/${pointerToken(d)}`, step ?? null, knownStep === undefined ? "no step" : String(knownStep), `step of ${d} disagrees with a registered def; declare the same step`);
    });
    for (const k of Object.keys(unitRec)) {
      if (!seen.has(k)) throw defSchemaError(id, `/units/${pointerToken(k)}`, k, "a dim listed in dims", `unit given for ${k}, which the def does not list; remove it or list the dim`);
    }
    for (const k of Object.keys(stepRec)) {
      if (!seen.has(k)) throw defSchemaError(id, `/steps/${pointerToken(k)}`, k, "a dim listed in dims", `step given for ${k}, which the def does not list; remove it or list the dim`);
    }
  }

  const reg: ConstraintRegistry = {
    register(def) {
      validate(def);
      byId.set(def.id, def);
      for (const dim of def.dims) {
        const list = byDim.get(dim);
        if (list === undefined) {
          byDim.set(dim, [def]);
          units.set(dim, def.units[dim]!);
          const s = def.steps?.[dim];
          if (s !== undefined) steps.set(dim, s);
        } else list.push(def);
      }
    },
    defsFor: (dim) => byDim.get(dim) ?? [],
    unitOf: (dim) => units.get(dim),
    stepOf: (dim) => steps.get(dim),
    dims: () => [...byDim.keys()].sort(byCodeUnit),
    ids: () => [...byId.keys()].sort(byCodeUnit),
  };
  for (const d of defs) reg.register(d);
  return reg;
}
