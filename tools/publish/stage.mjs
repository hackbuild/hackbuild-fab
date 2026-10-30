// Publish staging (plan v10 3.2, Phase 1 step 4): out/publish/<short>/ holds
// one installable copy of each published package, built from the workspace
// package without changing it. The workspace dist keeps importing the private
// workspace packages (tsc -b, the bake and the sandbox need that); the staged
// copy is what a registry would carry.
//
//   package.json   generated from the workspace one: same name, version,
//                  licence, sideEffects, unpkg and jsdelivr; the author is
//                  fixed; private stays true until the owner flips it (D-037);
//                  dependencies and peers come from what the build imports
//   dist/esm       Vite lib build, preserveModules; private workspace packages
//                  inline under _inlined/<name>/, every real npm package, peer
//                  and published @hackbuild package stays an import
//   dist/types     one bundled index.d.ts (tsdown, rolldown-plugin-dts), the
//                  private packages' types inlined the same way
//   dist/cdn, dist/iife, dist/style.css   copied from the build:lib outputs
//
// Nothing here lists a dependency by hand: the import scan of the emitted
// files decides, and a private package left as an import fails the stage with
// a line naming the package and the import.

import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { PACKAGES, ROOT, externalsOf, matches } from "../lib/outputs.mjs";
import { importSpecifiers, isBare, isBuiltin, packageName } from "./imports.mjs";

export const PUBLISH_DIR = join(ROOT, "out", "publish");
/**
 * Syntax level of dist/esm. The npm form is not downleveled for old browsers
 * (a consumer's bundler sets its own target); es2022 keeps class fields and
 * the like native, so the build adds no @oxc-project/runtime helper imports.
 */
export const ESM_TARGET = "es2022";
export const AUTHOR = "Moheeb Zara <hackbuildvideo@gmail.com>";

export class StageError extends Error {}
const fail = (msg) => {
  throw new StageError(msg);
};
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
const bytes = (file) => statSync(file).size;

/** The workspace packages by name, as the root workspaces field lists them. */
export function workspace() {
  const root = readJson(join(ROOT, "package.json"));
  const dirs = [];
  for (const w of root.workspaces ?? []) {
    if (w.endsWith("/*")) {
      const base = join(ROOT, w.slice(0, -2));
      for (const e of readdirSync(base, { withFileTypes: true })) if (e.isDirectory()) dirs.push(join(base, e.name));
    } else dirs.push(join(ROOT, w));
  }
  const list = dirs.filter((dir) => existsSync(join(dir, "package.json"))).map((dir) => ({ dir, json: readJson(join(dir, "package.json")) }));
  return { list, byName: new Map(list.map((w) => [w.json.name, w])) };
}

/** Installed version of a package at the repo root. */
function installedVersion(name) {
  const file = join(ROOT, "node_modules", name, "package.json");
  if (!existsSync(file)) fail(`${name} is not installed at the repo root. run npm ci.`);
  return readJson(file).version;
}

/**
 * The version a staged package.json names for `name`: what the workspace
 * declares under dependencies, which must equal the installed version, or the
 * installed version when only a peer or a file: specifier names it.
 */
function versionOf(name, ws) {
  const specs = new Set();
  for (const { json } of ws.list) {
    const s = json.dependencies?.[name];
    if (typeof s === "string" && !s.startsWith("file:")) specs.add(s);
  }
  if (specs.size > 1) fail(`${name} is declared as ${[...specs].join(" and ")} across the workspace; pin one version`);
  const installed = installedVersion(name);
  const [declared] = [...specs];
  if (declared !== undefined && declared !== installed) fail(`${name} is declared as ${declared} and installed as ${installed}. run npm ci.`);
  return installed;
}

/** A workspace package outside the published set: its code inlines into the packages that use it. */
const privateWorkspace = (name, ws) => ws.byName.has(name) && !PACKAGES.some((p) => p.name === name);

/** Emitted file name of a source path: .ts and .js become .js, any other extension gains .js. */
const jsName = (rel) => (/\.[cm]?[jt]s$/.test(rel) ? rel.replace(/\.[cm]?[jt]s$/, "") : rel) + ".js";

/**
 * Where a source module lands under dist/esm. The package's own modules keep
 * their path under the entry folder; a private workspace package's modules
 * sit under _inlined/<name>/ without its dist/ folder.
 */
function placeOf(moduleId, pkg, ws) {
  const id = moduleId.replace(/\?.*$/, "");
  // plugin-vue splits a component into the module and a ?vue&type=script request; both keep their own file.
  const sub = /[?&]vue&type=(\w+)/.exec(moduleId)?.[1];
  const named = placeBase(id, pkg, ws);
  return sub === undefined ? named : named.replace(/\.js$/, `.${sub}.js`);
}

function placeBase(id, pkg, ws) {
  if (id.startsWith("\0")) return `_virtual/${id.slice(1).replace(/[^\w.-]+/g, "_")}.js`;
  if (!id.startsWith(ROOT + sep)) fail(`${pkg.name}: module ${id} sits outside the repository`);
  const entryDir = dirname(join(ROOT, pkg.dir, pkg.entry));
  if (id.startsWith(entryDir + sep)) return jsName(relative(entryDir, id));
  for (let dir = dirname(id); dir.startsWith(ROOT + sep); dir = dirname(dir)) {
    if (!existsSync(join(dir, "package.json"))) continue;
    const meta = readJson(join(dir, "package.json"));
    if (meta.name === pkg.name) return `_files/${jsName(relative(dir, id))}`;
    if (!privateWorkspace(meta.name, ws)) fail(`${pkg.name}: module ${relative(ROOT, id)} belongs to ${meta.name}, which is neither this package nor a private workspace package`);
    return `_inlined/${meta.name.split("/").pop()}/${jsName(relative(dir, id)).replace(/^dist\//, "")}`;
  }
  return fail(`${pkg.name}: module ${relative(ROOT, id)} has no package.json above it`);
}

/** Vite lib build to dist/esm; returns what the build kept as an import. */
async function buildEsm(pkg, ws, dest) {
  process.env.NODE_ENV = "production";
  const { build } = await import("vite");
  const { default: vue } = await import("@vitejs/plugin-vue");
  const kept = externalsOf(pkg);
  const real = new Set();
  const builtins = new Set();
  const external = (id) => {
    if (!isBare(id)) return false;
    if (matches(id, kept)) return true;
    const name = packageName(id);
    if (ws.byName.has(name)) return !privateWorkspace(name, ws);
    if (isBuiltin(id)) {
      builtins.add(id);
      return true;
    }
    real.add(name);
    return true;
  };
  await build({
    root: join(ROOT, pkg.dir),
    configFile: false,
    logLevel: "warn",
    mode: "production",
    plugins: pkg.vue ? [vue()] : [],
    build: {
      outDir: dest,
      emptyOutDir: true,
      target: ESM_TARGET,
      minify: false,
      sourcemap: false,
      copyPublicDir: false,
      reportCompressedSize: false,
      lib: { entry: join(ROOT, pkg.dir, pkg.entry), formats: ["es"] },
      rollupOptions: {
        external,
        output: {
          preserveModules: true,
          entryFileNames: (chunk) => placeOf(chunk.facadeModuleId ?? chunk.moduleIds[0] ?? chunk.name, pkg, ws),
          chunkFileNames: "_chunks/[name].js",
          assetFileNames: "_assets/[name][extname]",
        },
      },
    },
  });
  if (real.has("@oxc-project/runtime")) fail(`${pkg.name}: dist/esm imports @oxc-project/runtime helpers; raise ESM_TARGET`);
  if (builtins.size > 0) fail(`${pkg.name}: dist/esm imports the node built-in ${[...builtins].join(", ")}; a browser package cannot`);
  const files = walk(dest);
  const names = files.map((f) => relative(dest, f));
  if (new Set(names.map((n) => n.toLowerCase())).size !== names.length) fail(`${pkg.name}: two modules landed on one file name under dist/esm`);
  return { files, real };
}

/** Bundled d.ts to dist/types/index.d.ts. */
async function buildTypes(pkg, ws, entry, dest) {
  const { build } = await import("tsdown");
  const kept = externalsOf(pkg);
  const keep = (id) => isBare(id) && (matches(id, kept) || !privateWorkspace(packageName(id), ws));
  await build({
    config: false,
    cwd: join(ROOT, pkg.dir),
    entry: { index: entry },
    outDir: dest,
    format: "esm",
    platform: "neutral",
    dts: { dtsInput: true, emitDtsOnly: true },
    clean: true,
    logLevel: "error",
    deps: { neverBundle: (id) => keep(id), alwaysBundle: (id) => isBare(id) && !keep(id) },
  });
  const out = join(dest, "index.d.ts");
  if (!existsSync(out)) fail(`${pkg.name}: the type bundle wrote ${walk(dest).map((f) => relative(dest, f)).join(", ") || "nothing"} and no index.d.ts`);
  return out;
}

/** The staged exports map: the workspace one with its dist paths moved to the staged layout, and source subpaths dropped. */
function stagedExports(workspaceExports, pkg) {
  const out = {};
  for (const [key, value] of Object.entries(workspaceExports)) {
    if (key === ".") {
      out[key] = { types: "./dist/types/index.d.ts", import: "./dist/esm/index.js" };
    } else if (typeof value === "string" && value.startsWith("./dist/")) {
      out[key] = value;
    }
  }
  if (out["."] === undefined) fail(`${pkg.name}: the workspace package.json has no "." export`);
  return out;
}

/**
 * Stage one published package and npm pack it. Returns the report line data:
 * the sizes (measured), what was inlined and what stayed an import.
 */
export async function stagePackage(pkg, ws = workspace()) {
  const wsPkg = ws.byName.get(pkg.name);
  if (wsPkg === undefined) fail(`${pkg.name} is not a workspace package`);
  const meta = wsPkg.json;
  const need = [`dist/cdn/${pkg.short}.js`, `dist/iife/${pkg.short}.js`, ...(pkg.vue ? ["dist/style.css"] : [])];
  for (const rel of need) if (!existsSync(join(ROOT, pkg.dir, rel))) fail(`${pkg.name}: ${pkg.dir}/${rel} is missing. run npm run build:lib.`);
  const typesRel = meta.exports?.["."]?.types;
  if (typeof typesRel !== "string" || !existsSync(join(ROOT, pkg.dir, typesRel))) fail(`${pkg.name}: workspace types ${typesRel} are missing. run npm run build:lib.`);

  const stageDir = join(PUBLISH_DIR, pkg.short);
  rmSync(stageDir, { recursive: true, force: true });
  mkdirSync(stageDir, { recursive: true });

  const esm = await buildEsm(pkg, ws, join(stageDir, "dist", "esm"));
  const typesFile = await buildTypes(pkg, ws, join(ROOT, pkg.dir, typesRel), join(stageDir, "dist", "types"));
  for (const kind of ["cdn", "iife"]) {
    mkdirSync(join(stageDir, "dist", kind), { recursive: true });
    copyFileSync(join(ROOT, pkg.dir, "dist", kind, `${pkg.short}.js`), join(stageDir, "dist", kind, `${pkg.short}.js`));
  }
  if (pkg.vue) copyFileSync(join(ROOT, pkg.dir, "dist/style.css"), join(stageDir, "dist/style.css"));

  // What the emitted files import decides the dependency lists.
  const published = new Map(PACKAGES.filter((p) => p.name !== pkg.name).map((p) => [p.name, ws.byName.get(p.name)?.json.version]));
  const used = new Map();
  const scan = (file, text) => {
    for (const spec of importSpecifiers(text)) {
      if (!isBare(spec)) continue;
      const name = packageName(spec);
      if (privateWorkspace(name, ws)) fail(`${pkg.name}: ${relative(stageDir, file)} imports ${spec}, a private workspace package`);
      if (isBuiltin(spec)) fail(`${pkg.name}: ${relative(stageDir, file)} imports the node built-in ${spec}`);
      if (!used.has(name)) used.set(name, new Set());
      used.get(name).add(relative(stageDir, file).startsWith(join("dist", "types")) ? "types" : "esm");
    }
  };
  for (const f of esm.files.filter((p) => p.endsWith(".js"))) scan(f, readFileSync(f, "utf8"));
  scan(typesFile, readFileSync(typesFile, "utf8"));

  const dependencies = {};
  for (const name of [...used.keys()].sort()) {
    if (pkg.peers.includes(name)) continue;
    if (published.has(name)) dependencies[name] = published.get(name);
    else if (esm.real.has(name)) dependencies[name] = versionOf(name, ws);
    else fail(`${pkg.name}: the build imports ${name}, which is not a peer, a published package or a resolved npm package`);
  }
  const peerDependencies = {};
  for (const name of pkg.peers) peerDependencies[name] = `^${versionOf(name, ws)}`;
  // A peer whose own package carries no types needs its @types package for the bundled d.ts to resolve.
  const peerDependenciesMeta = {};
  for (const name of pkg.peers) {
    const typed = readJson(join(ROOT, "node_modules", name, "package.json"));
    const types = `@types/${name}`;
    if (typed.types === undefined && typed.typings === undefined && existsSync(join(ROOT, "node_modules", types, "package.json")) && used.get(name)?.has("types")) {
      peerDependencies[types] = `^${installedVersion(types)}`;
      peerDependenciesMeta[types] = { optional: true };
    }
  }

  const staged = {
    name: meta.name,
    version: meta.version,
    private: true,
    type: "module",
    ...(meta.description === undefined ? {} : { description: meta.description }),
    license: meta.license,
    author: AUTHOR,
    sideEffects: meta.sideEffects ?? false,
    exports: stagedExports(meta.exports, pkg),
    files: ["dist"],
    ...(Object.keys(dependencies).length === 0 ? {} : { dependencies }),
    ...(Object.keys(peerDependencies).length === 0 ? {} : { peerDependencies }),
    ...(Object.keys(peerDependenciesMeta).length === 0 ? {} : { peerDependenciesMeta }),
    unpkg: meta.unpkg,
    jsdelivr: meta.jsdelivr,
  };
  for (const target of [staged.unpkg, staged.jsdelivr, ...Object.values(staged.exports).flatMap((v) => (typeof v === "string" ? [v] : Object.values(v)))]) {
    if (typeof target !== "string" || !existsSync(join(stageDir, target))) fail(`${pkg.name}: staged package.json names ${target}, which the stage did not write`);
  }
  writeFileSync(join(stageDir, "package.json"), JSON.stringify(staged, null, 2) + "\n");
  if (existsSync(join(ROOT, pkg.dir, "README.md"))) copyFileSync(join(ROOT, pkg.dir, "README.md"), join(stageDir, "README.md"));
  copyFileSync(join(ROOT, "LICENSE"), join(stageDir, "LICENSE"));

  const packed = spawnSync("npm", ["pack", "--pack-destination", PUBLISH_DIR, "--json", "--ignore-scripts"], { cwd: stageDir, encoding: "utf8" });
  if (packed.status !== 0) fail(`${pkg.name}: npm pack failed\n${packed.stdout}${packed.stderr}`);
  const [info] = JSON.parse(packed.stdout);
  const tarball = join(PUBLISH_DIR, info.filename);

  const inlined = [...new Set(esm.files.map((f) => relative(join(stageDir, "dist", "esm"), f)).filter((n) => n.startsWith("_inlined/")).map((n) => n.split("/")[1]))].sort();
  return {
    name: pkg.name,
    short: pkg.short,
    version: meta.version,
    dir: stageDir,
    tarball,
    inlined,
    dependencies,
    peerDependencies,
    sizes: {
      esmFiles: esm.files.filter((f) => f.endsWith(".js")).length,
      esm: esm.files.reduce((sum, f) => sum + bytes(f), 0),
      types: bytes(typesFile),
      cdn: bytes(join(stageDir, "dist", "cdn", `${pkg.short}.js`)),
      iife: bytes(join(stageDir, "dist", "iife", `${pkg.short}.js`)),
      tarball: bytes(tarball),
    },
  };
}
