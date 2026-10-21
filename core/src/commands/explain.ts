// hbf explain <id> (utility verb, M00-T13 step 12, AGENT-SURFACE.md 5.1): a
// check record (title, version, severity, origin, legal kind, origin uri)
// from the check seed, the meaning and exit code of an error code, or any
// hbf:// resource through the one resolver in packages/project (M04-T08). An
// unknown bare id is E_REF with up to three ids by edit distance; an unknown
// uri is E_HANDLE.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ERROR_CODES, ERROR_TRANSPORT, type AnyFeatureKindDef, type ErrorCode } from "@hackbuild/spec";
import { resolveUri, type ResolveSources, type Resolved } from "@hackbuild/project";
import { renderCheckPage } from "@hackbuild/checks";
import { checkRecord, readSeedRows, type CheckRecord } from "../checks.js";
import { cmdError, didYouMean } from "../errors.js";
import { PACKAGE_KINDS } from "../kinds.js";
import { fullProfile } from "../load-build.js";
import { Store } from "../store.js";
import { safeLines } from "../text/safe.js";
import { DRAFT_KIND_DIRS } from "./build.js";
import { projectGraph, viewOf } from "./project-graph.js";
import { CANON_SOURCE } from "./canon-view.js";

/** One line per code, AGENT-SURFACE.md 6.1; the type requires every ERROR_CODES entry. */
const MEANING = {
  E_SCHEMA: "input failed its schema; path names the field and expected what is accepted",
  E_REF: "an id, dim, check, archetype or tool argument value does not exist; didYouMean lists up to 3 near ids",
  E_UNSAT: "an interval is empty; every bound is attached and expected names the smallest change that fits",
  E_HANDLE: "an hbf:// uri or cursor is unknown or collected; chase names the chase to rebuild when the store recorded it",
  E_STALE: "a patch anchor matched 0 or more than 1 times, or a build hash moved under an approval",
  E_PROVENANCE: "fabrication refused: an inferred catalog part or an unprovenanced number on the export path",
  E_GATE: "approval declined, cancelled, expired, forged, replayed, or bound to other arguments; nothing written",
  E_GATE_UNAVAILABLE: "the client cannot be asked; personRuns carries the cli line a person runs at a terminal",
  E_REPEAT: "the same call a third time or the same failing report a fourth; read the named diagnostics record",
  E_KERNEL: "a kernel refused; record names the knowledge record to read",
  E_PARAM_MISSING: "a check's measured value is NaN or missing; path is the pointer to fill",
  E_DRAFT: "the design is an hbf draft; fabrication exports refuse it until hbf adopt lifts it into a design",
} as const satisfies Record<ErrorCode, string>;

export type Explained =
  | CheckRecord
  | { readonly kind: "error"; readonly id: ErrorCode; readonly meaning: string; readonly exit: number; readonly http: number };

export function explain(id: string, workspace: string): Explained {
  if ((ERROR_CODES as readonly string[]).includes(id)) {
    const code = id as ErrorCode;
    return { kind: "error", id: code, meaning: MEANING[code], exit: ERROR_TRANSPORT[code].exit, http: ERROR_TRANSPORT[code].http };
  }
  const rows = readSeedRows(workspace);
  const bare = id.replace(/^hbf:\/\/check\//, "");
  const row = rows.get(bare);
  if (row !== undefined) {
    return checkRecord(row, workspace);
  }
  throw cmdError({
    code: "E_REF", path: "/id", got: id, didYouMean: didYouMean(bare, [...rows.keys(), ...ERROR_CODES]),
    hint: "name a check id such as CHK-3MF-06 or an error code such as E_SCHEMA",
  });
}

export function renderExplained(e: Explained): string {
  // A check page carries repo-side text (titles, origins, design names); each line prints as one line.
  if (e.kind === "error") return safeLines(`${e.id}  ${e.meaning}\n  exit ${e.exit}   http ${e.http}`);
  return safeLines(renderCheckPage(e));
}

/** Knowledge record ids: paths under knowledge/ without .md, forward slashes, sorted. */
function knowledgeIds(root: string): string[] {
  const base = path.join(root, "knowledge");
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) walk(abs);
      else if (e.name.endsWith(".md")) out.push(path.relative(base, abs).split(path.sep).join("/").slice(0, -3));
    }
  };
  if (existsSync(base)) walk(base);
  return out.sort();
}

/** The registered feature kinds: every package kind (core/src/kinds.ts) and the draft kinds of DRAFT_KIND_DIRS. */
async function featureKinds(root: string): Promise<AnyFeatureKindDef[]> {
  const kinds: AnyFeatureKindDef[] = Object.values(PACKAGE_KINDS).flatMap((e) => [...(e?.kinds ?? [])]);
  for (const dir of DRAFT_KIND_DIRS) {
    const file = path.join(root, dir, "skeleton-kinds.ts");
    if (!existsSync(file)) continue;
    const mod = (await import(pathToFileURL(file).href)) as { SKELETON_KINDS: Record<string, AnyFeatureKindDef> };
    kinds.push(...Object.values(mod.SKELETON_KINDS));
  }
  return kinds;
}

/** What the resolver reads in a workspace: its store, check seed, kinds, profile and knowledge records. */
export async function resourceSources(root: string, store: Store = new Store(root)): Promise<ResolveSources> {
  const ids = knowledgeIds(root);
  return {
    store,
    checks: { ids: [...readSeedRows(root).keys()], page: (id) => store.check(id) },
    featureKinds: await featureKinds(root),
    profile: fullProfile(),
    knowledge: { ids, read: (id) => readFileSync(path.join(root, "knowledge", `${id}.md`), "utf8") },
    projectGraph: async () => viewOf(await projectGraph(root, store), {}),
    canon: CANON_SOURCE,
  };
}

/** hbf explain <hbf:// uri>: the resolved resource. */
export async function explainUri(uri: string, root: string): Promise<Resolved> {
  return resolveUri(uri, await resourceSources(root), "/id");
}
