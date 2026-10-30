#!/usr/bin/env node
// npm run build:design -- <design dir> [<design dir> ...]
//
// Writes out/design/<id>/ for a design that has a bake.json, so a page or an
// app other than the bake can load the design from published builds:
//
//   design.js       one ES module exporting chase, bench and, when the bench
//                   entry names one, contact. Published @hackbuild packages
//                   stay imports (an import map or an install supplies them);
//                   a private workspace package would be inlined, and the
//                   build fails if any import left is not a published package.
//   page-build.js   the classic page build the bake inlines (bake.mjs
//                   bundleBuild, the bake.json `build` entry), one global
//                   named by bake.json build.global
//   facts.json      the PageFacts bake.mjs designFacts computes
//   manifold-wasm.js, manifold.js, jszip.js
//                   the classic scripts the bake inlines before the page
//                   build, byte for byte, in that load order
//   design.json     ids, globals, load order and the imports design.js keeps
//
// Chase, bench and contact come from the imports of the bake.json `entry`
// file (bench.entry.ts), which already names the module each one lives in.

import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BakeError, REPO, bundleBuild, classicScript, designFacts, resolveFrom } from "../bake/bake.mjs";
import { PACKAGES } from "../lib/outputs.mjs";
import { looseSpecifiers } from "./imports.mjs";

export const DESIGN_OUT = join(REPO, "out", "design");
const PUBLISHED = PACKAGES.map((p) => p.name);
const NAMES = ["chase", "bench", "contact"];

const fail = (msg) => {
  throw new BakeError(msg);
};

/** The module each of chase, bench and contact is imported from in the bench entry, as an absolute path. */
export function entrySources(entryFile) {
  const text = readFileSync(entryFile, "utf8");
  const found = {};
  for (const m of text.matchAll(/import\s*\{([^}]*)\}\s*from\s*["'](\.[^"']*)["']/g)) {
    for (const raw of m[1].split(",")) {
      const name = raw.trim().replace(/^type\s+/, "");
      if (NAMES.includes(name)) found[name] = resolve(dirname(entryFile), m[2]);
    }
  }
  for (const need of ["chase", "bench"]) if (found[need] === undefined) fail(`${relative(REPO, entryFile)} imports no ${need} from a relative module`);
  return found;
}

/**
 * Vite lib build of the design entry to one ES module string. The entry is a
 * file next to the output (removed after the build), since a lib entry must
 * resolve as a path.
 */
async function bundleDesign(sources, entryFile) {
  process.env.NODE_ENV = "production";
  const { build } = await import("vite");
  const code = NAMES.filter((n) => sources[n] !== undefined)
    .map((n) => `export { ${n} } from ${JSON.stringify(sources[n])};\n`)
    .join("");
  writeFileSync(entryFile, code);
  let out;
  try {
    out = await build({
      configFile: false,
      logLevel: "silent",
      root: REPO,
      mode: "production",
      build: {
        write: false,
        target: "es2022",
        minify: true,
        sourcemap: false,
        copyPublicDir: false,
        reportCompressedSize: false,
        lib: { entry: entryFile, formats: ["es"], fileName: () => "design.js" },
        rollupOptions: {
          external: (id) => PUBLISHED.some((n) => id === n || id.startsWith(`${n}/`)),
          output: { codeSplitting: false },
        },
      },
    });
  } finally {
    rmSync(entryFile, { force: true });
  }
  const outputs = (Array.isArray(out) ? out : [out]).flatMap((o) => o.output);
  if (outputs.length !== 1 || outputs[0].type !== "chunk") fail(`the design entry bundled to ${outputs.length} files, legal 1`);
  const chunk = outputs[0];
  const left = looseSpecifiers(chunk.code);
  const bad = left.filter((s) => !PUBLISHED.some((n) => s === n || s.startsWith(`${n}/`)));
  if (bad.length > 0) fail(`design.js keeps imports of ${bad.join(", ")}, which are not published packages`);
  for (const name of NAMES) if (sources[name] !== undefined && !chunk.exports.includes(name)) fail(`design.js does not export ${name}`);
  return { code: chunk.code.replace(/\s+$/, "") + "\n", imports: left, exports: chunk.exports };
}

/** Build one design into out/design/<id>/. Returns the files written and their sizes (bytes, measured). */
export async function buildDesign(designDir, opts = {}) {
  let dir = resolve(designDir);
  if (basename(dir) === "bake.json") dir = dirname(dir);
  const manifestPath = join(dir, "bake.json");
  let m;
  try {
    m = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (e) {
    return fail(`${relative(REPO, manifestPath)} cannot be read: ${e.message}`);
  }
  for (const k of ["id", "build", "entry", "wasm", "classic", "blocks"]) if (m[k] === undefined) fail(`${relative(REPO, manifestPath)}: ${k} missing; build:design needs a ui bake manifest with a page build`);
  const manifold = m.classic.find((c) => c.from.startsWith("npm:manifold-3d/"));
  const jszip = m.blocks.find((b) => b.from.startsWith("npm:jszip/"));
  if (manifold === undefined || jszip === undefined) fail(`${relative(REPO, manifestPath)}: a page build needs the manifold-3d classic script and the jszip block`);

  const facts = designFacts(dir);
  const page = await bundleBuild(m.build, dir, m, facts);
  const out = join(opts.outRoot ?? DESIGN_OUT, m.id);
  mkdirSync(out, { recursive: true });
  const design = await bundleDesign(entrySources(resolve(dir, m.entry)), join(out, "design.entry.js"));
  const wasm = readFileSync(resolveFrom(dir, m.wasm.from));
  const files = {
    "design.js": design.code,
    "page-build.js": page.code + "\n",
    "facts.json": JSON.stringify(facts, null, 2) + "\n",
    "manifold-wasm.js": `globalThis.${m.wasm.global}="${wasm.toString("base64")}";\n`,
    "manifold.js": classicScript(manifold, dir) + "\n",
    "jszip.js": readFileSync(resolveFrom(dir, jszip.from), "utf8"),
  };
  const manifest = {
    id: m.id,
    files: ["design.js", "page-build.js", "facts.json", "manifold-wasm.js", "manifold.js", "jszip.js"],
    exports: design.exports,
    imports: design.imports,
    globals: { page: m.build.global, manifold: manifold.global, wasm: m.wasm.global, jszip: "JSZip" },
    loadOrder: ["manifold-wasm.js", "manifold.js", "jszip.js", "page-build.js"],
  };
  files["design.json"] = JSON.stringify(manifest, null, 2) + "\n";
  const sizes = {};
  for (const [name, text] of Object.entries(files)) {
    writeFileSync(join(out, name), text);
    sizes[name] = Buffer.byteLength(text, "utf8");
  }
  return { id: m.id, dir: out, sizes, imports: design.imports, exports: design.exports };
}

async function main(argv) {
  const args = argv.slice(2);
  if (args.length === 0) {
    console.error("usage: npm run build:design -- <design dir> [<design dir> ...]");
    return 2;
  }
  try {
    for (const a of args) {
      const r = await buildDesign(a);
      console.log(`build:design: ${relative(REPO, r.dir)} exports ${r.exports.join(", ")}, keeps imports ${r.imports.join(", ") || "none"}`);
      console.log(`  bytes (measured) ${Object.entries(r.sizes).map(([k, v]) => `${k} ${v}`).join(", ")}`);
    }
    return 0;
  } catch (e) {
    if (e instanceof BakeError) {
      console.error(`build:design: ${e.message}`);
      return 1;
    }
    throw e;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv);
}
