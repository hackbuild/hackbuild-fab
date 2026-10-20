// designs/pip/migrate/legacy.ts
// A PIP legacy save into a design document (D-167; M10-T03 step 5). The
// legacy bench writes `{app: "pip-bench", v: 1, state}` (pip-controller
// bench/part2.js line 187, lineage pip.example-design/pip-controller-b137deb)
// and its loadDesign reads `o.state || o` (line 190), so a bare state
// object is a save too. A share link with no `#d=<version>.` prefix routes
// here. The state keeps the legacy keys: the PIP chase (M10-T13) merges
// them onto its defaults through packages/chase normalise, which drops a
// retired key and lists it, as part2.js lines 192 to 194 do.

/** The design document a legacy save becomes. */
export interface PipLegacyDocument {
  readonly app: "pip";
  /** Where the save came from: the legacy app name and its save version. */
  readonly legacy: { readonly app: string; readonly v: number };
  readonly state: Readonly<Record<string, unknown>>;
}

const LEGACY_APP = "pip-bench";

type Obj = Record<string, unknown>;
const isPlain = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

/** Read a PIP legacy save; throws when the payload is not one. */
export function legacy(doc: unknown): PipLegacyDocument {
  if (!isPlain(doc)) throw new Error("a pip save is a json object");
  const app = doc["app"];
  if (app !== undefined && app !== LEGACY_APP) throw new Error(`not a pip save: app is ${String(app)}`);
  const state = isPlain(doc["state"]) ? doc["state"] : doc;
  const v = typeof doc["v"] === "number" ? doc["v"] : 1;
  if (v !== 1) throw new Error(`pip save version ${v}; the legacy bench wrote version 1`);
  const rest: Obj = {};
  for (const k of Object.keys(state)) if (k !== "app" && k !== "v") rest[k] = state[k];
  return { app: "pip", legacy: { app: LEGACY_APP, v }, state: rest };
}
