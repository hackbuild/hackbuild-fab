// factsFor: the PageFacts a page computes for itself. tools/bake/design-facts.mjs
// computes the same object in node from core's loadDesign; this reads the
// same data files, bundled into the engine, so a page that carries a chase and
// a build function needs no bake step. For a design without draft kinds every
// field equals the bake's except defHash: the bake hashes the design's source
// files on disk, this hashes the source text the page passes in.

import { hashOf, type PageFacts } from "@hackbuild/pipeline";
import { loadProfile, type ProfileTables } from "@hackbuild/profile";
import { constraintVersions } from "@hackbuild/registry-loader";
import { commandError, didYouMean, sha256Hex, type Chase, type Hash } from "@hackbuild/spec";
import checksSeed from "@hackbuild/checks/seed/checks.seed.json" with { type: "json" };
import kernelMeta from "@hackbuild/kernel/package.json" with { type: "json" };
import geomMeta from "@hackbuild/geom/package.json" with { type: "json" };

/** SOURCE_DATE_EPOCH when the page names none, s: 1980-01-01, the earliest time a zip entry holds. */
export const DEFAULT_EPOCH = 315532800;

export interface FactsOptions {
  /** SOURCE_DATE_EPOCH for the build, s; below DEFAULT_EPOCH it is raised to it, as core raises it. */
  readonly epoch?: number;
  /** The 3MF object name and file stem; default the chase's meta.id, which is the folder name of a design. */
  readonly name?: string;
}

/**
 * The source text of a page's build: one string for a single build script, or
 * a record of path to text when the page carries several modules. A path is
 * relative to the design folder, forward slashes.
 */
export type PageSource = string | Readonly<Record<string, string>>;

/** The file name core's source closure gives a build module: the chase's path without a leading ./, with .ts when it has no extension. */
function buildPath(chase: Chase): string {
  const rel = chase.build.module.replace(/^\.\//, "");
  return /\.[cm]?[jt]s$/.test(rel) ? rel : `${rel}.ts`;
}

function sourcesOf(chase: Chase, source: PageSource): { readonly path: string; readonly sha256: string }[] {
  const files: [string, string][] = typeof source === "string" ? [[buildPath(chase), source]] : Object.entries(source);
  return files
    .map(([path, text]) => ({ path, sha256: sha256Hex(text) }))
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

/** Every machine and material the chase names must be a profile row; a miss names the closest id. */
function checkProfile(chase: Chase, tables: ProfileTables): void {
  const machines = tables.machines.map((m) => m.id);
  const materials = tables.materials.map((m) => m.id);
  const named = [
    ...(chase.meta.machines ?? []).map((id, i) => ({ id, ids: machines, path: `/meta/machines/${i}` })),
    ...chase.materials.map((m, i) => ({ id: m.material, ids: materials, path: `/materials/${i}/material` })),
  ];
  for (const { id, ids, path } of named) {
    if (!ids.includes(id)) {
      throw commandError({
        code: "E_REF", path, got: id, expected: "a machine or material id of the profile", didYouMean: didYouMean(id, ids),
        hint: `the profile has no row ${id}; use one of ${ids.join(", ")}`, record: "agent-capability",
      });
    }
  }
}

/**
 * PageFacts for a chase and the text of its build source. The tables are the
 * full profile, which is what core's loadDesign gives a design without draft
 * kinds and what the page build meshes on. defHash covers the chase and the
 * sha256 of each source text, so an edit to either moves it. It equals core's
 * defHash when the page passes the files core's source closure names (the
 * build module and what it imports, by relative path), and differs otherwise.
 */
export function factsFor(chase: Chase, source: PageSource, options: FactsOptions = {}): PageFacts {
  const tables = loadProfile();
  checkProfile(chase, tables);
  const epoch = Math.max(Math.trunc(options.epoch ?? DEFAULT_EPOCH), DEFAULT_EPOCH);
  // geom pins manifold-3d exactly, so its dependency string is the version core reads from the installed package.
  const manifold = geomMeta.dependencies["manifold-3d"];
  if (manifold === undefined) throw new Error("geom lists no manifold-3d dependency");
  return {
    name: options.name ?? chase.meta.id,
    defHash: hashOf({ chase, sources: sourcesOf(chase, source) }) as Hash,
    tables,
    checksSeed,
    versions: { kernel: kernelMeta.version, manifold },
    constraints: constraintVersions(),
    epoch,
  };
}
