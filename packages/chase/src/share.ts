// Share links and legacy saves through migrate (D-167; M10-T03 step 5).
// bench-core decodeShare and admitDesign (M09-T04) take a migrate, a legacy
// reader and a validate; this module builds the three from the chase
// package so a `#d=1.` link migrates through 1-to-2 and a link with no
// prefix routes through the design's migrate/legacy.ts. The object is
// structurally bench-core's AdmitOptions; this package cannot import bench-core
// (tier 3), and bindChase (M10-T06) passes it in.

import { CHASE_SCHEMA_VERSION, isThrownCommandError, type Chase, type CommandError } from "@hackbuild/spec";
import { migrateChase } from "./migrate/index.js";
import { normaliseParams, storedParams } from "./normalise.js";
import { paramsErrors } from "./schema.js";
import type { ChaseRegistries } from "./resolve.js";
import { validateChase } from "./validate.js";

export interface ShareOptions {
  readonly migrate: (version: number, doc: unknown) => unknown;
  readonly legacy?: (doc: unknown) => unknown;
  readonly validate: (doc: unknown) => string | null;
}

export interface ShareInputs {
  /** The design's chase; a design document is normalised and validated against its params. */
  readonly chase?: Chase;
  /** Registries for a shared chase document's references. */
  readonly registries?: ChaseRegistries;
  /** designs/<id>/migrate/legacy.ts of the design, when its legacy bench is public. */
  readonly legacy?: (doc: unknown) => unknown;
}

type Obj = Record<string, unknown>;
const isPlain = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

/** A shared payload is a chase document when it carries meta; otherwise a design document. */
export const isChaseDocument = (doc: unknown): boolean => isPlain(doc) && isPlain(doc["meta"]);

function firstNonFinite(v: unknown, at: string): string | undefined {
  if (typeof v === "number") return Number.isFinite(v) ? undefined : at || "/";
  if (Array.isArray(v)) {
    for (let i = 0; i < v.length; i += 1) {
      const hit = firstNonFinite(v[i], `${at}/${i}`);
      if (hit !== undefined) return hit;
    }
  } else if (isPlain(v)) {
    for (const k of Object.keys(v)) {
      const hit = firstNonFinite(v[k], `${at}/${k}`);
      if (hit !== undefined) return hit;
    }
  }
  return undefined;
}

const line = (e: readonly CommandError[]): string => e.slice(0, 3).map((x) => `${x.path ?? "/"} ${x.hint}`).join("; ");

export function shareOptions(inputs: ShareInputs = {}): ShareOptions {
  const migrate = (version: number, doc: unknown): unknown => {
    if (version > CHASE_SCHEMA_VERSION) throw new Error(`chase version ${version}, this bench reads ${CHASE_SCHEMA_VERSION}`);
    if (!isChaseDocument(doc)) return doc;
    const declared = (doc as { meta: Obj }).meta["chase"];
    if (declared !== version) throw new Error(`link version ${version} disagrees with meta.chase ${String(declared)}`);
    try {
      return migrateChase(doc).chase;
    } catch (e) {
      if (isThrownCommandError(e)) throw new Error(e.hbf.hint);
      throw e;
    }
  };
  const validate = (doc: unknown): string | null => {
    if (isChaseDocument(doc)) {
      const errs = validateChase(doc, inputs.registries);
      return errs.length === 0 ? null : line(errs);
    }
    if (!isPlain(doc)) return "a design document is a json object";
    if (inputs.chase !== undefined) {
      const { params } = normaliseParams(inputs.chase, storedParams(doc));
      const errs = paramsErrors(inputs.chase, params);
      return errs.length === 0 ? null : line(errs);
    }
    const state = storedParams(doc);
    if (!isPlain(state)) return "a design document carries a state object";
    const bad = firstNonFinite(state, "");
    return bad === undefined ? null : `not a finite number at ${bad}`;
  };
  return { migrate, validate, ...(inputs.legacy !== undefined ? { legacy: inputs.legacy } : {}) };
}
