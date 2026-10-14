#!/usr/bin/env node
// M00-T14 step 5 (D-175): bake one HTML page that runs
// tools/determinism/routes.mjs in a browser from file://. The packages and
// manifold-3d are bundled into one classic script with the wasm embedded
// as base64, so the page needs no server, no fetch and no module Worker
// (the bench rule in CLAUDE.md). The page sets globalThis.DETERMINISM to a
// promise of {hashes, liveCount} or {error}.
//
// @hackbuild/kernel is still an empty entry at M00, so the page bundles
// @hackbuild/mesh and @hackbuild/geom from their dist builds; when the
// kernel bake lands it replaces this bundle. Run `npx tsc -b` first.
//
// Usage: node tools/determinism/bake.mjs <out.html>

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const MANIFOLD_JS = path.join(ROOT, "node_modules", "manifold-3d", "manifold.js");
const MANIFOLD_WASM = path.join(ROOT, "node_modules", "manifold-3d", "manifold.wasm");

const ENTRY = `
import * as mesh from "@hackbuild/mesh";
import { circleRing, loadGeom } from "@hackbuild/geom";
import { routeHashes } from "./routes.mjs";
import bossPrism from "../corpus/mesh/boss-prism.json";
import revolveCalls from "../corpus/mesh/tenon-revolve-calls.jsonl";
globalThis.DETERMINISM = (async () => {
  try {
    const hashes = routeHashes({ mesh, geom: await loadGeom(), circleRing, bossPrism, revolveCalls });
    return { hashes, liveCount: mesh.liveCount() };
  } catch (e) {
    return { error: String(e && e.stack || e) };
  }
})();
`;

// manifold-3d with its wasm handed over as bytes, so it never fetches.
const SHIM = `
import factory from ${JSON.stringify(MANIFOLD_JS)};
const B64 = __MANIFOLD_WASM_B64__;
function bytes() {
  const s = atob(B64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}
export default function Module(o) { return factory({ ...(o || {}), wasmBinary: bytes() }); }
`;

const embedWasm = {
  name: "embed-manifold-wasm",
  setup(build) {
    build.onResolve({ filter: /^manifold-3d$/ }, () => ({ path: "manifold-shim", namespace: "hbf-shim" }));
    build.onLoad({ filter: /.*/, namespace: "hbf-shim" }, () => ({ contents: SHIM, loader: "js", resolveDir: ROOT }));
  },
};

/** The page HTML: one inline classic script. */
export async function bakePage() {
  const esbuild = await import("esbuild-wasm");
  const r = await esbuild.build({
    stdin: { contents: ENTRY, resolveDir: HERE, sourcefile: "determinism-page.mjs", loader: "js" },
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
    target: "es2022",
    loader: { ".jsonl": "text", ".ts": "ts" },
    resolveExtensions: [".ts", ".js", ".mjs", ".json"],
    external: ["node:*", "module", "fs", "path", "url", "crypto"],
    define: {
      "import.meta.url": JSON.stringify("file:///determinism/manifold.js"),
      __MANIFOLD_WASM_B64__: JSON.stringify(readFileSync(MANIFOLD_WASM).toString("base64")),
    },
    plugins: [embedWasm],
    logLevel: "error",
  });
  // A literal closing script tag inside the bundle would end the element early.
  const js = r.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
  return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>determinism</title></head>\n<body><script>${js}</script></body></html>\n`;
}

if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = process.argv[2];
  if (out === undefined) {
    process.stderr.write("usage: bake.mjs <out.html>\n");
    process.exitCode = 2;
  } else {
    writeFileSync(out, await bakePage());
    process.stdout.write(`baked ${out}\n`);
  }
}
