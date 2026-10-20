// mech.derive (M06-T11 step 2): resolve the id (E_REF with didYouMean),
// refuse a param that is missing or non-finite with E_PARAM_MISSING naming it,
// validate and default-fill the rest through the def's schema (E_SCHEMA),
// refuse a stub, candidate or unproven entry with E_REF naming its status,
// its reason and its original, then run derive() on the default-filled
// params. Params are validated before the status refusal, so a typed
// param list answers for every entry that declares one.

import type { CanonOriginal, CommandInput, CommandOutput, DerivedValue, MechanismDef } from "@hackbuild/spec";
import { mechanisms } from "@hackbuild/mechanisms";
import { createProfileLookup } from "@hackbuild/profile";
import { cmdError } from "../errors.js";
import { fullProfile } from "../load-build.js";
import type { CommandOut } from "../result.js";
import type { CoreCtx } from "../ctx.js";
import { ZERO } from "./canon-hits.js";

type Values = Readonly<Record<string, number>>;

/** "originals/<slug>/<file> <fn> lines <lines>", the line a refusal names. */
export function originalLine(o: CanonOriginal): string {
  return [`originals/${o.slug}/${o.file}`, o.fn, o.lines === undefined ? undefined : `lines ${o.lines}`].filter((x) => x !== undefined).join(" ");
}

/** The refusal of a stub, candidate or unproven entry; the hint is "mechanism <id> is <status>: <reason>". */
export function refusal(def: MechanismDef): never {
  const first = def.original?.[0];
  throw cmdError({
    code: "E_REF", path: "/id", got: def.id,
    expected: first === undefined ? "a typed mechanism" : `a typed mechanism; ${def.id} ports from ${originalLine(first)}`,
    hint: `mechanism ${def.id} is ${def.status}: ${def.statusReason ?? "no reason recorded"}`,
  });
}

/** Missing or non-finite values by key: E_PARAM_MISSING naming the first. */
function finite(params: Readonly<Record<string, unknown>>): void {
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined || (typeof v === "number" && !Number.isFinite(v))) {
      throw cmdError({ code: "E_PARAM_MISSING", path: `/params/${k}`, got: String(v), expected: "a finite number in the unit the mechanism's schema states", hint: `give ${k} a finite value, or leave it out to take the default` });
    }
  }
}

/** The def's schema over the params: default-filled values, or E_SCHEMA at the first refused key. */
export function validated(def: MechanismDef, params: Readonly<Record<string, unknown>>): Values {
  const r = def.params["~standard"].validate(params) as { readonly value?: unknown; readonly issues?: readonly { readonly message: string; readonly path?: readonly unknown[] }[] } | Promise<unknown>;
  if (r instanceof Promise) throw cmdError({ code: "E_KERNEL", path: "/params", got: def.id, hint: `mechanism ${def.id} validates its params asynchronously; mech.derive needs a synchronous schema`, record: "agent-capability" });
  if (r.issues !== undefined && r.issues.length > 0) {
    const issue = r.issues[0]!;
    const at = (issue.path ?? []).map((k) => String(typeof k === "object" && k !== null && "key" in k ? (k as { key: unknown }).key : k)).join("/");
    const keys = (r.issues as readonly { readonly keys?: readonly string[] }[])[0]?.keys;
    const key = keys !== undefined && keys.length > 0 ? keys[0]! : at;
    throw cmdError({ code: "E_SCHEMA", path: `/params${key === "" ? "" : `/${key}`}`, got: key === "" ? def.id : key, expected: issue.message, hint: `mech.derive ${def.id} params: ${issue.message}; pass the params the mechanism declares` });
  }
  return r.value as Values;
}

export function runMechDerive(input: CommandInput<"mech.derive">, ctx: CoreCtx): CommandOut<CommandOutput<"mech.derive">> {
  const def = mechanisms.resolve(input.id).def;
  const given = (input.params ?? {}) as Readonly<Record<string, unknown>>;
  finite(given);
  const inputs = validated(def, given);
  if (def.status !== "typed") refusal(def);
  const derived: Readonly<Record<string, DerivedValue>> = def.derive(inputs, createProfileLookup(fullProfile()));
  return {
    verdict: "pass", stage: "done", inputsHash: ctx.inputsHash,
    result: { derived, inputs, origin: `hbf://mechanism/${def.id}` },
    findings: [], counts: { ...ZERO }, errors: [], artifacts: [], next: [],
  };
}
