// The catalog the CLI reads (D-103): the committed rows under
// packages/catalog/data, then rows an external lookup wrote into
// <workspace>/.hbf/cache/catalog. The catalog package is pure; this is the
// one place its files are listed and read from disk.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { KICAD_RESOLVERS, loadCatalog, type Catalog, type CatalogFiles } from "@hackbuild/catalog";
import { schemaError } from "@hackbuild/profile";

/** Every file under dir, keyed by its path relative to dir with "/" separators. */
export function filesUnder(dir: string): Map<string, Uint8Array> {
  const out = new Map<string, Uint8Array>();
  const walk = (d: string): void => {
    for (const n of readdirSync(d).sort()) {
      const p = path.join(d, n);
      if (statSync(p).isDirectory()) walk(p);
      else out.set(path.relative(dir, p).split(path.sep).join("/"), new Uint8Array(readFileSync(p)));
    }
  };
  if (existsSync(dir)) walk(dir);
  return out;
}

/** Committed rows plus the workspace cache; a cache row may not shadow a committed id. */
export function workspaceCatalog(workspace: string): Catalog {
  const committed = loadCatalog(filesUnder(path.join(workspace, "packages", "catalog", "data")) as CatalogFiles, { resolvers: KICAD_RESOLVERS });
  const cache = loadCatalog(filesUnder(path.join(workspace, ".hbf", "cache", "catalog")) as CatalogFiles, { resolvers: KICAD_RESOLVERS });
  const rows = new Map(committed.rows);
  for (const [id, r] of cache.rows) {
    if (rows.has(id)) throw schemaError(`/.hbf/cache/catalog/${id}`, `cache row ${id} shadows a committed row; delete the cache row`);
    rows.set(id, r);
  }
  return { rows };
}
