// Widget liveness: which declared outputs hold a value on this build. Kept
// apart from registry.ts so a kind's file imports no value from the
// registry that imports it.

import type { WidgetDecl } from "@hackbuild/spec";

/** A value counts as live when it is present and, for a list or record, not empty. */
export function isLive(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "number") return Number.isFinite(v);
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.keys(v).length > 0;
  return true;
}

/** Declared outputs whose value is live; the default liveness of an entry. */
export function liveOutputs(model: { readonly outputs: Readonly<Record<string, unknown>> }, decl: WidgetDecl): string[] {
  return decl.outputs.filter((o) => isLive(model.outputs[o]));
}
