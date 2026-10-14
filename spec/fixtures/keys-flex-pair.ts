// spec/fixtures/keys-flex-pair.ts
// The keys flex-pair reference, seen from the spec. Its chase, build and
// bench moved to reference/keys/flex-pair/ at M-S-T09 (D-179); this file
// re-exports them so the type proofs in spec/fixtures and the M-S slice
// tests keep one source, and holds the CommandIO examples for that chase.
// Version 4, 2026-10-05.

import type { CommandIO, McpToolIO } from "../commands";
import type { FlexPairParams } from "../../reference/keys/flex-pair/chase";

export { chase, type FlexPairParams } from "../../reference/keys/flex-pair/chase";
export { build, contact } from "../../reference/keys/flex-pair/build";
export { bench } from "../../reference/keys/flex-pair/bench";

// Compile-time proofs that ParamsOf maps fields as specified, at the D-223
// defaults of the reference.
const sample: FlexPairParams = {
  W: 60, H: 30, r: 4,
  keys: [{ x: 0, d: 10, cone: 4, gap: 1.84 }],
  w: 1.4,
  pads: "clip",
};
void sample;

// constraints.query in param form: every param with a constraintDim, then
// one pointer. The rail and a library caller write the CommandIO form and
// leave optional fields out; a model sends the strict MCP form of the same
// call, every field present and null where unset.
export const envelopeAll: CommandIO["constraints.query"]["input"] = { chase: "keys-flex-pair" };
export const envelopeGap: CommandIO["constraints.query"]["input"] = { chase: "keys-flex-pair", pointers: ["/keys/0/gap"] };
// The same query for values the caller is trying: a 4.08 mm cone moves the
// band to 1.63 to 2.04 mm (computed, 40 and 50 percent of 4.08).
export const envelopeGapTrying: CommandIO["constraints.query"]["input"] = {
  chase: "keys-flex-pair", params: { keys: [{ x: 0, d: 10, cone: 4.08, gap: 1.6 }] }, pointers: ["/keys/0/gap"],
};
export const envelopeGapMcp: McpToolIO["constraints_query"] = {
  dim: null, pointers: ["/keys/0/gap"], params: null, preset: null, chase: "keys-flex-pair", feature: null, material: null, machine: null, facts: null,
};
