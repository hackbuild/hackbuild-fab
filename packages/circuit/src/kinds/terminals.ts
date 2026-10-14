// The contact, port and pad feature kinds (M05 admission, PACKAGES.md:
// circuit owns them), ported from the M-S drafts in
// reference/keys/flex-pair/skeleton-kinds.ts, which stay on that reference.
// None generates a solid: a contact relates two conductors and names its
// actuator body, a port is a net terminal whose read model lives in the
// chase hookup (D-078), and a pad carries no position. Registered at
// M06-T08 for the PIP button archetypes.

import type { CheckId, FeatureKindDef, FeatureOf, GeneratedGeometry, NonEmpty, SchemaLike, SchemaResult } from "@hackbuild/spec";

export const TERMINAL_KIND_VERSION = "1.0.0";
export const TERMINAL_REFERENCE = "buttons/flex-cone";

const EMPTY: Omit<GeneratedGeometry, "owns"> = { preUnionCutters: [], positives: [], postUnionCutters: [], bodies: [] };

function schema<K extends "contact" | "port" | "pad">(kind: K, fields: readonly string[]): SchemaLike<unknown, FeatureOf<K>> {
  const validate = (value: unknown): SchemaResult<FeatureOf<K>> => {
    if (typeof value !== "object" || value === null) return { issues: [{ message: `expected a ${kind} feature object` }] };
    const rec = value as Record<string, unknown>;
    if (rec["kind"] !== kind) return { issues: [{ message: `kind ${String(rec["kind"])}, expected ${kind}`, path: ["kind"] }] };
    const missing = ["id", ...fields].filter((f) => rec[f] === undefined);
    if (missing.length > 0) return { issues: missing.map((f) => ({ message: `${kind} needs ${f}`, path: [f] })) };
    return { value: value as FeatureOf<K> };
  };
  return { "~standard": { version: 1, vendor: "hackbuild-circuit", validate } };
}

const one = (id: CheckId): NonEmpty<CheckId> => [id];

export const contactKind: FeatureKindDef<"contact"> = {
  kind: "contact", version: TERMINAL_KIND_VERSION, schema: schema("contact", ["a", "b", "forceMinN", "maxOhm"]),
  generate: (f) => ({ ...EMPTY, owns: { faces: [`${f.a}.top`, `${f.b}.top`] } }),
  checks: one("CHK-KEY-01"), fit: (f) => f.fit?.class ?? null, reference: [TERMINAL_REFERENCE],
};

export const portKind: FeatureKindDef<"port"> = {
  kind: "port", version: TERMINAL_KIND_VERSION, schema: schema("port", ["net", "type", "interface"]),
  generate: () => ({ ...EMPTY, owns: {} }),
  checks: one("CHK-NET-29"), fit: "none", reference: [TERMINAL_REFERENCE],
};

export const padKind: FeatureKindDef<"pad"> = {
  kind: "pad", version: TERMINAL_KIND_VERSION, schema: schema("pad", ["net", "size", "for"]),
  generate: () => ({ ...EMPTY, owns: {} }),
  checks: one("CHK-NET-29"), fit: "none", reference: [TERMINAL_REFERENCE],
};
