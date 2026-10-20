// The NaN check of D-131 (M10-T03 step 4): after every build, any
// non-finite vertex coordinate or metric value is E_PARAM_MISSING naming
// the param pointers in the metric's drivenBy, and the build yields no
// mesh. bindChase (M10-T06) runs it in the bench; the property test runs
// it over every generated document.

import type { CommandError, Metric } from "@hackbuild/spec";

export interface BuiltValues {
  readonly metrics: readonly Pick<Metric, "id" | "value" | "drivenBy">[];
  /** Vertex coordinates per body, x y z interleaved, mm. */
  readonly bodies?: readonly { readonly id: string; readonly positions: ArrayLike<number> }[];
}

/** The first non-finite value of a build as E_PARAM_MISSING, or undefined when every value is finite. */
export function nonFiniteError(b: BuiltValues): CommandError | undefined {
  for (const m of b.metrics) {
    if (typeof m.value !== "number" || Number.isFinite(m.value)) continue;
    const by = m.drivenBy ?? [];
    return {
      code: "E_PARAM_MISSING", path: by[0] ?? `/metrics/${m.id}`, got: String(m.value), expected: "a finite number",
      hint: by.length > 0
        ? `metric ${m.id} is ${String(m.value)}; check the params at ${by.join(", ")}`
        : `metric ${m.id} is ${String(m.value)} and names no driving param; declare drivenBy on it in build.ts`,
      record: "agent-capability",
    };
  }
  for (const body of b.bodies ?? []) {
    for (let i = 0; i < body.positions.length; i += 1) {
      const v = body.positions[i]!;
      if (Number.isFinite(v)) continue;
      return {
        code: "E_PARAM_MISSING", path: "/", got: String(v), expected: "finite vertex coordinates",
        hint: `body ${body.id} vertex ${Math.floor(i / 3)} has coordinate ${String(v)}; a param reached the geometry without a value`,
        record: "agent-capability",
      };
    }
  }
  return undefined;
}
