// One verdict on a chase value (D-131, D-132): the strict document schema,
// the build path and id rules of the source reader, CHASE_PARAM_RULES, and
// the registry references when registries are given. chase.validate
// (M10-T04) adds the typed questions on top of these errors.

import type { Chase, CommandError } from "@hackbuild/spec";
import { claimRuleErrors, paramRuleErrors, shapeErrors } from "./schema.js";
import { resolveRefs, type ChaseRegistries } from "./resolve.js";
import { buildPathProblem } from "./source.js";

/** Every error of the chase value; [] when it validates. Shape errors stop the later rules, which read the shape. */
export function validateChase(value: unknown, reg?: ChaseRegistries): CommandError[] {
  const shape = shapeErrors(value);
  if (shape.length > 0) return shape;
  const chase = value as Chase;
  const out: CommandError[] = [];
  const problem = buildPathProblem(chase.build.module);
  if (problem !== undefined) {
    out.push({ code: "E_SCHEMA", path: "/build/module", got: chase.build.module, expected: "./<file>.ts inside the design directory", hint: problem, record: "chase-source/build-path" });
  }
  out.push(...paramRuleErrors(chase));
  out.push(...claimRuleErrors(chase));
  if (reg !== undefined) out.push(...resolveRefs(chase, reg));
  return out;
}
