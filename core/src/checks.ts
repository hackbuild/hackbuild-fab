// The check pages and seed reads core serves from the workspace, and the
// constraint versions registryHash reads. The Part IR checks, the seed row
// stamp and registryHashOf live in packages/pipeline, shared with a baked
// bench (D-264); they are re-exported here for core's callers.

import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { CHECK_MODULES, checkPage, coversOf, registerChecks, type CheckPage, type ReferenceCovers } from "@hackbuild/checks";
import { seedRows, type SeedRow } from "@hackbuild/pipeline";
import { cmdError } from "./errors.js";

/** Every constraint def core collects at load, id to version, for registryHash. */
export { constraintVersions } from "@hackbuild/registry-loader";

export {
  M00_PART_CHECKS, gatedSkips, m00Versions, preconditionOrder, registryHashOf, runPartChecks, seedRows, stamp,
  type ExportPart, type M00PartCheck, type PartCheckInput, type RegistryEntries, type SeedRow,
} from "@hackbuild/pipeline";

/** The check seed rows of a workspace, read from packages/checks/seed/checks.seed.json. */
export function readSeedRows(workspace: string): ReadonlyMap<string, SeedRow> {
  return seedRows(JSON.parse(readFileSync(path.join(workspace, "packages", "checks", "seed", "checks.seed.json"), "utf8")));
}

/** What the static hbf://check/<id> resolves to: the check page (M04-T02), one builder for the resource, `hbf explain` and docs/reference/checks. */
export type CheckRecord = CheckPage;

/** Every reference/<area>/<id> of a workspace with the ids its README covers (D-105), sorted by path. */
export function referenceCovers(workspace: string): ReferenceCovers[] {
  const base = path.join(workspace, "reference");
  if (!existsSync(base)) return [];
  const dirs = (p: string): string[] => readdirSync(p, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
  return dirs(base).flatMap((area) => dirs(path.join(base, area)).flatMap((id) => {
    const readme = path.join(base, area, id, "README.md");
    return existsSync(readme) ? [{ path: `reference/${area}/${id}`, covers: coversOf(readFileSync(readme, "utf8")) }] : [];
  }));
}

/** The page of every registered check in a workspace, in seed order. */
export function checkPages(workspace: string): CheckPage[] {
  const seed: unknown = JSON.parse(readFileSync(path.join(workspace, "packages", "checks", "seed", "checks.seed.json"), "utf8"));
  const refs = referenceCovers(workspace);
  return registerChecks({ seed }, CHECK_MODULES).map((def) => checkPage(def, refs));
}

/** The page of one seeded check. */
export function checkRecord(row: SeedRow, workspace: string): CheckRecord {
  const page = checkPages(workspace).find((p) => p.id === row.id);
  if (page === undefined) throw cmdError({ code: "E_REF", path: `/checks/${row.id}`, got: row.id, hint: `${row.id} is seeded but not registered; add its module under packages/checks/src/defs` });
  return page;
}


