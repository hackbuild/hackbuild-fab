// The rebuild view CHK-ART-02 reads (M04-T10 step 5). Given the source a 3MF
// states, {chase, buildHash} plus the epoch of its zip mtime, it finds the
// design and rebuilds it at those inputs, then writes the 3MF the export
// path writes. A build record under the stated hash supplies its target and
// params; without one (a fresh clone, a stranger's machine) the design is
// the one directory under reference/ or designs/ whose chase.ts meta.id is
// the stated chase, built at its defaults. chase.ts is read as data (D-178).

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { readChaseSource } from "@hackbuild/chase";
import { buildPart, export3mf, loadDesign, resolveParams, type Values } from "./commands/build.js";
import type { Store } from "./store.js";

// The shapes of ArtifactRebuild in packages/checks defs/art/CHK-ART-02.ts.
// The checks index does not export that module until M04-T12 registers it
// (card defect M04-T10), so core states the same shapes; a drift fails
// core/test/artifact-rebuild.test.ts, which passes this view to the check.
export interface StatedSource { readonly chase: string; readonly buildHash: string; readonly sourceDateEpoch: number }
export type Rebuilt = { readonly buildHash: string; readonly bytes: Uint8Array } | { readonly reason: string };
export type ArtifactRebuild = (stated: StatedSource) => Promise<Rebuilt>;

const posix = (p: string): string => p.split(path.sep).join("/");

/** Directories at most two levels under reference/ and one under designs/ that hold chase.ts, relative to root. */
export function designDirs(root: string): string[] {
  const out: string[] = [];
  const walk = (rel: string, depth: number): void => {
    const abs = path.join(root, rel);
    if (!existsSync(abs) || !statSync(abs).isDirectory()) return;
    if (existsSync(path.join(abs, "chase.ts"))) out.push(rel);
    if (depth === 0) return;
    for (const name of readdirSync(abs).sort()) if (!name.startsWith(".")) walk(path.join(rel, name), depth - 1);
  };
  walk("reference", 2);
  walk("designs", 1);
  return out.map(posix);
}

/** Every design directory whose chase meta.id is `id`. */
export function designsByChaseId(root: string, id: string): string[] {
  return designDirs(root).filter((rel) => {
    const file = path.join(root, rel, "chase.ts");
    try {
      return readChaseSource(readFileSync(file, "utf8"), `${rel}/chase.ts`).chase.meta.id === id;
    } catch {
      return false;
    }
  });
}

/** The rebuild view over one workspace; `store` lends exact params when it holds the stated build. */
export function artifactRebuild(root: string, store?: Store): ArtifactRebuild {
  return async (stated: StatedSource): Promise<Rebuilt> => {
    let target: string | undefined;
    let values: Values | undefined;
    if (store !== undefined && await store.has(`hbf://build/${stated.buildHash}` as never)) {
      const rec = store.build(`hbf://build/${stated.buildHash}`);
      target = rec.target;
      values = rec.values as Values;
    } else {
      const found = designsByChaseId(root, stated.chase);
      if (found.length !== 1) {
        return { reason: found.length === 0 ? `no chase.ts under reference/ or designs/ has meta.id ${stated.chase}` : `meta.id ${stated.chase} names ${found.length} designs: ${found.join(", ")}` };
      }
      target = found[0]!;
    }
    const design = await loadDesign(target, root);
    const built = await buildPart(design, values ?? resolveParams(design.chase, undefined, undefined), { epoch: stated.sourceDateEpoch });
    const pkg = await export3mf(built);
    return { buildHash: built.part.buildHash, bytes: pkg.bytes };
  };
}
