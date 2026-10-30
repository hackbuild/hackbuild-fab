// command constraints.query, group query.
// spec/commands.ts CommandIO takes this interface; npm run registries regenerates it.

import type { ConstraintDim, Interval, ParamEnvelope, ParamPointer } from "../constraints.js";
import type { Facts, Params } from "./_shared.js";

export interface ConstraintsQueryIO {
  /**
   * Two forms, one flat object (strict tool modes refuse a top-level
   * oneOf).
   *
   * Param form, `dim` absent: `chase` is required (E_PARAM_MISSING at
   * /chase otherwise). The command builds the chase with `params` and
   * `preset` exactly as part.build with the same params and preset would,
   * or reuses the store entry for that build hash, resolves each pointer
   * in `pointers` to a dim through ParamField.constraintDim, reads facts
   * from that built part and its declarations, and returns a
   * ParamEnvelope whose buildHash equals that part.build's. So where one
   * param moves another's band (cone height moves the contact.gap band),
   * the envelope answers for the values the caller is trying. `pointers`
   * absent answers every param that has a constraintDim. This is the call
   * a model makes before editing params and the call the rail makes to
   * grey out illegal ranges.
   *
   * Dim form, `dim` set: the raw query for canon and reference work,
   * returning one Interval; `pointers`, `params` and `preset` must be
   * absent (E_SCHEMA otherwise).
   *
   * In both forms `facts` overrides derived facts key by key, and
   * material and machine are profile ids; absent takes them from the chase
   * (the feature's material, the part's machine), and E_PARAM_MISSING
   * when nothing names one. There is no process argument: the material
   * row and machine imply it. Narrow the output on `"dim" in result`.
   */
  input: {
    dim?: ConstraintDim;
    /** JSON pointers into the chase's params; absent with `dim` absent means every param with a constraintDim. */
    pointers?: readonly ParamPointer[];
    /** Param form only: param values with part.build's meaning and merge rule; E_SCHEMA in dim form. */
    params?: Params;
    /** Param form only: preset id with part.build's meaning; E_SCHEMA in dim form. */
    preset?: string;
    chase?: string;
    feature?: string;
    material?: string;
    machine?: string;
    facts?: Facts;
  };
  output: Interval | ParamEnvelope;
}
