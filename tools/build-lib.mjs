#!/usr/bin/env node
// npm run build:lib: every build output of the published packages, in order.
//   1. tsc -b                      dist/ of every package (the npm ESM for spec, viewer, bench-core)
//   2. bench vite lib + vue-tsc    dist/index.js, dist/style.css, dist/types (the npm ESM for bench)
//   3. dist/cdn/<short>.js         one ESM file, peers and sibling published packages left as bare imports
//   4. dist/iife/<short>.js        one classic script, one global, externals read from globals,
//                                  with <short>.sources.json beside it (tools/lib/sidecar.mjs)
//   5. tools/vendor/three/dist/three.js  the shared three IIFE (global THREE), with its sidecar
//
// Duplication note: a cdn or iife file bundles the private workspace packages
// it uses (geom, chase, catalog, inlay and what they import, zod) until a
// @hackbuild/kernel bundle exists, so bench-core and any other file that
// bundles geom each carry a copy of that code. The manifold wasm module stays
// one instance: packages/geom/src/manifold.ts publishes it under
// Symbol.for("hbf.manifold"), a registry shared by every script on the page.
//
// Vite 8 IIFE output cannot be multi-entry (one build per package) and leaves
// import.meta.url undefined, so it is defined as self.location.href.

import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { PACKAGES, ROOT, TARGET, VENDOR_THREE, externalsOf, globalsOf, matches } from "./lib/outputs.mjs";
import { sourcesPlugin } from "./lib/sidecar.mjs";

// Vue and vite choose development paths when NODE_ENV is unset; set it
// before the first load so the outputs match the bake's.
process.env.NODE_ENV = "production";

const run = (cmd, args, cwd = ROOT) => {
  const r = spawnSync(cmd, args, { cwd, stdio: "inherit" });
  if (r.status !== 0) {
    console.error(`build:lib: ${cmd} ${args.join(" ")} failed (exit ${r.status})`);
    process.exit(1);
  }
};

const { build } = await import("vite");
const { default: vue } = await import("@vitejs/plugin-vue");

async function bundle(pkg, format) {
  const external = externalsOf(pkg);
  const iife = format === "iife";
  await build({
    root: join(ROOT, pkg.dir),
    configFile: false,
    logLevel: "warn",
    plugins: [...(pkg.vue ? [vue()] : []), ...(iife ? [sourcesPlugin(`${pkg.short}.js`)] : [])],
    // Only the iife needs it: es output keeps import.meta.url as written.
    define: iife ? { "import.meta.url": "self.location.href" } : {},
    build: {
      outDir: join(ROOT, pkg.dir, "dist", iife ? "iife" : "cdn"),
      emptyOutDir: true,
      target: TARGET,
      minify: true,
      sourcemap: false,
      copyPublicDir: false,
      reportCompressedSize: false,
      lib: { entry: join(ROOT, pkg.dir, pkg.entry), formats: [format], name: pkg.global, fileName: () => `${pkg.short}.js` },
      rollupOptions: {
        external: (id) => matches(id, external),
        output: iife ? { globals: globalsOf(pkg), codeSplitting: false, exports: "named" } : { codeSplitting: false },
      },
    },
  });
}

console.log("build:lib: tsc -b");
run("npx", ["tsc", "-b"]);
console.log("build:lib: bench vite lib and types");
run("npm", ["run", "build", "-w", "packages/bench"]);
for (const pkg of PACKAGES) {
  console.log(`build:lib: ${pkg.short} cdn`);
  await bundle(pkg, "es");
  console.log(`build:lib: ${pkg.short} iife`);
  await bundle(pkg, "iife");
}

console.log("build:lib: vendor three");
const threeVersion = JSON.parse(readFileSync(join(ROOT, "node_modules/three/package.json"), "utf8")).version;
mkdirSync(join(ROOT, "tools/vendor/three/dist"), { recursive: true });
await build({
  root: join(ROOT, "tools/vendor/three"),
  configFile: false,
  logLevel: "warn",
  plugins: [sourcesPlugin("three.js")],
  build: {
    outDir: join(ROOT, "tools/vendor/three/dist"),
    emptyOutDir: true,
    target: TARGET,
    minify: true,
    copyPublicDir: false,
    reportCompressedSize: false,
    lib: { entry: join(ROOT, "tools/vendor/three/entry.js"), formats: ["iife"], name: "THREE", fileName: () => "three.js" },
    rollupOptions: {
      output: { banner: `/*! three ${threeVersion}, Copyright 2010-2026 three.js authors, MIT licence (node_modules/three/LICENSE). Shared instance, global THREE. */`, codeSplitting: false, exports: "named" },
    },
  },
});
console.log(`build:lib: done, ${VENDOR_THREE} ${statSync(join(ROOT, VENDOR_THREE)).size} bytes`);
