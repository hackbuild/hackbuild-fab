#!/usr/bin/env node
// tools/bake/from-chase.ts: the bake.json of a design generated from its
// chase directory (M10-T07 step 2, D-129). The manifest is the M09
// flex-pair one (reference/keys/flex-pair/bake.json) with the design's id:
// a `ui` shell, the five faces of the hackbuild-ui type scale, the
// hackbuild-ui and bench CSS, manifold-3d as a classic script plus base64
// wasm, jszip, the page build and the bench entry. three 0.186.1 reaches the
// page through the entry bundle. A design that has no bench.entry.ts or
// page-build.ts gets the plain ones below: the chase and bench mounted by
// the bench shell, and the chase and build.ts run by the shared page build
// (D-264). The plain entry imports the shell by the @hackbuild/ui source
// export, as designs/blocks/bench.entry.ts does, so tools/tiers.mjs checks
// the edge; when it writes the entry it also gives the design's
// package.json that devDependency, writing the package.json when there is
// none. Any other existing file is never touched.
//
//   node tools/bake/from-chase.ts <design dir>   prints {"manifest": <path>, "wrote": [...]}
//
// Node strips the types (22.18). chase.bake (core/src/commands/chase-bake.ts)
// runs it, then tools/bake/bake.mjs on the manifest it names.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { BakeManifest } from "./manifest.ts";

export const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

const posix = (p: string): string => p.split(sep).join("/");

/** The five faces, as the M09 flex-pair manifest lists them. */
const FACES: readonly [string, number, "normal" | "italic", string][] = [
  ["Permanent Marker", 400, "normal", "permanent-marker/files/permanent-marker-latin-400-normal"],
  ["Special Elite", 400, "normal", "special-elite/files/special-elite-latin-400-normal"],
  ["VT323", 400, "normal", "vt323/files/vt323-latin-400-normal"],
  ["IBM Plex Mono", 400, "normal", "ibm-plex-mono/files/ibm-plex-mono-latin-400-normal"],
  ["IBM Plex Mono", 500, "normal", "ibm-plex-mono/files/ibm-plex-mono-latin-500-normal"],
  ["IBM Plex Mono", 600, "normal", "ibm-plex-mono/files/ibm-plex-mono-latin-600-normal"],
  ["IBM Plex Mono", 700, "normal", "ibm-plex-mono/files/ibm-plex-mono-latin-700-normal"],
  ["Libre Baskerville", 400, "italic", "libre-baskerville/files/libre-baskerville-latin-400-italic"],
];

/** The bake.json of the design in `dir`; its id and title are the directory name. */
export function manifestFor(dir: string): BakeManifest {
  const id = basename(resolve(dir));
  const repo = posix(relative(resolve(dir), REPO)) || ".";
  return {
    id,
    shell: "ui",
    title: id,
    fonts: FACES.map(([family, weight, style, file]) => ({ family, weight, style, from: `npm:@fontsource/${file}.woff2` })),
    css: [{ from: "npm:@virgilvox/hackbuild-ui/dist/styles/hackbuild.css" }, { from: `${repo}/packages/ui/src/bench/bench.css` }],
    wasm: { from: "npm:manifold-3d/manifold.wasm", global: "MANIFOLD_WASM_B64", label: "manifold.wasm" },
    classic: [{
      from: "npm:manifold-3d/manifold.js",
      label: "manifold-3d (Apache 2.0), classic script form",
      exportDefault: "Module",
      global: "ManifoldModule",
      replace: [
        { match: "require=createRequire(import.meta.url)", with: 'require=createRequire("")' },
        { match: "var _scriptName=import.meta.url;", with: 'var _scriptName="";' },
        { match: 'new URL("manifold.wasm",import.meta.url).href', with: '"manifold.wasm"' },
      ],
    }],
    blocks: [{ from: "npm:jszip/dist/jszip.min.js", label: "inlined jszip.min.js", vendored: true }],
    build: { from: "./page-build.ts", global: "HbfPageBuild", label: `${id} page build: chase, build.ts and the build and check pipeline` },
    entry: "./bench.entry.ts",
  };
}

/** The workspace the plain entry imports the bench shell from. */
export const UI_PACKAGE = "@hackbuild/ui";
/** The shell's source export (packages/ui/package.json `./bench/entry`). */
export const UI_ENTRY = `${UI_PACKAGE}/bench/entry`;

type PackageJson = Record<string, unknown> & { devDependencies?: Record<string, string>; dependencies?: Record<string, string> };

const readJson = (p: string): PackageJson => JSON.parse(readFileSync(p, "utf8")) as PackageJson;

/**
 * The design's package.json text with UI_PACKAGE in devDependencies at the
 * ui workspace's version, or null when it already declares it. With no
 * package.json (`existing` null) it is the designs/blocks form: private, an
 * ES module, the root package's licence and author.
 */
export function packageWithUi(dir: string, existing: string | null): string | null {
  const root = readJson(join(REPO, "package.json"));
  const pj: PackageJson = existing === null
    ? { name: `@hackbuild/design-${basename(resolve(dir))}`, version: "0.0.0", private: true, type: "module", license: root["license"], author: root["author"] }
    : (JSON.parse(existing) as PackageJson);
  if (pj.dependencies?.[UI_PACKAGE] !== undefined || pj.devDependencies?.[UI_PACKAGE] !== undefined) return null;
  const version = readJson(join(REPO, "packages/ui/package.json"))["version"] as string;
  const dev = { ...pj.devDependencies, [UI_PACKAGE]: version };
  pj.devDependencies = Object.fromEntries(Object.entries(dev).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  return `${JSON.stringify(pj, null, 2)}\n`;
}

/** The plain bench entry: the chase and bench beside it, mounted with the page build's library build and writers. */
export function entrySource(): string {
  return [
    "/// <reference lib=\"dom\" />",
    "// The bench entry chase.bake wrote (tools/bake/from-chase.ts): the chase",
    "// and bench beside it, mounted by the ui bench shell. It sits outside",
    "// defHash with bench.ts (D-174); edit it freely.",
    "",
    `import { mountBench, pageBench, pageOf } from ${JSON.stringify(UI_ENTRY)};`,
    'import { bench } from "./bench";',
    'import { chase } from "./chase";',
    "",
    'mountBench({ chase, bench, ...pageBench(pageOf("HbfPageBuild")) });',
    "",
  ].join("\n");
}

/** The plain page build: the chase and build.ts run by the shared build and check pipeline (D-264). */
export const PAGE_BUILD = [
  "// The page build chase.bake wrote (tools/bake/from-chase.ts): the chase",
  "// and build.ts, run in the page by the shared build and check pipeline",
  "// (packages/pipeline createPageBuild, D-264). `hbf:facts` is the virtual",
  "// module the bake writes from core's loadDesign. It sits outside defHash",
  "// with bench.ts (D-174): build.ts never imports it.",
  "",
  'import { createPageBuild } from "@hackbuild/pipeline";',
  'import { pageFacts } from "@hackbuild/registry-loader";',
  'import { facts } from "hbf:facts";',
  'import { chase } from "./chase";',
  'import * as module from "./build";',
  "",
  "export const page = createPageBuild({ chase, module, facts: pageFacts(facts) });",
  "",
].join("\n");

/** Write bake.json, bench.entry.ts (with its package.json devDependency) and page-build.ts into `dir` where absent; returns the manifest path and the files written. */
export function ensureManifest(dir: string): { manifest: string; wrote: string[] } {
  const abs = resolve(dir);
  if (!existsSync(join(abs, "chase.ts"))) throw new Error(`no chase.ts in ${abs}`);
  const wrote: string[] = [];
  const put = (name: string, text: () => string): void => {
    const p = join(abs, name);
    if (existsSync(p)) return;
    writeFileSync(p, text());
    wrote.push(name);
  };
  put("bake.json", () => `${JSON.stringify(manifestFor(abs), null, 2)}\n`);
  put("bench.entry.ts", () => entrySource());
  if (wrote.includes("bench.entry.ts")) {
    const pjPath = join(abs, "package.json");
    const pj = packageWithUi(abs, existsSync(pjPath) ? readFileSync(pjPath, "utf8") : null);
    if (pj !== null) {
      writeFileSync(pjPath, pj);
      wrote.push("package.json");
    }
  }
  put("page-build.ts", () => PAGE_BUILD);
  return { manifest: join(abs, "bake.json"), wrote };
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = process.argv[2];
  if (dir === undefined || process.argv.length !== 3) {
    console.error("usage: node tools/bake/from-chase.ts <design dir>");
    process.exitCode = 2;
  } else {
    try {
      console.log(JSON.stringify(ensureManifest(dir)));
    } catch (e) {
      console.error(`from-chase: ${(e as Error).message}`);
      process.exitCode = 1;
    }
  }
}
