// The sources sidecar of a library IIFE (plan v10 Phase 1 step 4). build-lib
// writes <short>.sources.json beside each dist/iife/<short>.js, and the
// three vendor IIFE gets one beside it. tools/bake/bake.mjs reads it: the
// baker cannot see inside a finished classic script, so the sidecar names
// the repo files the script was built from (each with a sha256, so a script
// older than its sources is refused), the installed packages it inlines
// (for the licence manifest) and the bare imports it reads from globals (for
// the load order).

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { ROOT } from "./outputs.mjs";

export const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

const posix = (p) => p.split(sep).join("/");

/** Version and name of the installed package that holds a resolved file, if any. */
export function packageOf(file) {
  for (let dir = dirname(file); dirname(dir) !== dir; dir = dirname(dir)) {
    const meta = join(dir, "package.json");
    if (existsSync(meta) && dir.split(sep).includes("node_modules")) {
      const { name, version } = JSON.parse(readFileSync(meta, "utf8"));
      if (name) return { name, version, root: dir };
    }
  }
  return null;
}

/** The sidecar path of an IIFE file path. */
export const sidecarPath = (iifeFile) => iifeFile.replace(/\.js$/, ".sources.json");

/** The module files of a bundle (query and virtual ids dropped), split into the repo's own and the installed packages. */
export function sourcesOf(moduleIds, root = ROOT) {
  const files = [...new Set(moduleIds.map((id) => id.replace(/\?.*$/, "").replace(/^\0/, "")))].filter((id) => existsSync(id));
  const installed = (id) => id.includes(`${sep}node_modules${sep}`);
  const own = Object.fromEntries(
    files
      .filter((id) => !installed(id))
      .map((id) => [posix(relative(root, id)), sha256(readFileSync(id))])
      .sort(([a], [b]) => (a < b ? -1 : 1)),
  );
  const seen = new Map();
  for (const id of files.filter(installed)) {
    const p = packageOf(id);
    if (p !== null) seen.set(`${p.name}@${p.version}`, { name: p.name, version: p.version, root: posix(relative(root, p.root)) });
  }
  const packages = [...seen.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([, p]) => p);
  return { own, packages };
}

/**
 * Vite plugin for a library IIFE build: emits <fileName minus .js>.sources.json
 * into the output folder. `reads` is the bundle's external imports, as written;
 * the own paths are relative to `root`.
 */
export function sourcesPlugin(fileName, root = ROOT) {
  return {
    name: "hbf-sources",
    generateBundle(_options, bundle) {
      const chunks = Object.values(bundle).filter((c) => c.type === "chunk");
      if (chunks.length !== 1) throw new Error(`${fileName}: expected one chunk for the sources sidecar, got ${chunks.length}`);
      const [chunk] = chunks;
      const { own, packages } = sourcesOf(chunk.moduleIds, root);
      const sidecar = { iife: fileName, sha256: sha256(chunk.code), reads: [...chunk.imports].sort(), own, packages };
      this.emitFile({ type: "asset", fileName: sidecarPath(fileName), source: `${JSON.stringify(sidecar, null, 1)}\n` });
    },
  };
}
