import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vue from "@vitejs/plugin-vue";
import { defineConfig, type Plugin } from "vite";

// The @hackbuild/bench library build (PLAN.md 4, tier 3 row): src/index.ts and
// the single-file components it names bundle to dist/index.js, one ES
// module; every dependency stays an import. The types come from vue-tsc
// (tsconfig.lib.json, through tools/vue-check.mjs) into dist/types. tsc -b
// still compiles the .ts modules the bake and the tests read. The bake
// bundles a design's bench entry itself (tools/bake/bake.mjs bundleEntry)
// and never reads this file.

const here = (p: string): string => fileURLToPath(new URL(p, import.meta.url));
const pkg = JSON.parse(readFileSync(here("./package.json"), "utf8")) as { dependencies: Record<string, string> };
const deps = Object.keys(pkg.dependencies);

/** The components carry no <style>; the shell sheet ships as dist/style.css, the bytes of src/bench/bench.css. */
function shellSheet(): Plugin {
  return {
    name: "hbf-ui-style",
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "style.css", source: readFileSync(here("./src/bench/bench.css")) });
    },
  };
}

export default defineConfig({
  plugins: [vue(), shellSheet()],
  logLevel: "warn",
  build: {
    outDir: here("./dist"),
    // tsc -b writes the rest of dist; the library build adds two files.
    emptyOutDir: false,
    target: "es2022",
    minify: false,
    sourcemap: false,
    copyPublicDir: false,
    reportCompressedSize: false,
    lib: { entry: here("./src/index.ts"), formats: ["es"], fileName: "index" },
    rollupOptions: {
      external: (id) => deps.some((d) => id === d || id.startsWith(`${d}/`)),
      output: { codeSplitting: false },
    },
  },
});
