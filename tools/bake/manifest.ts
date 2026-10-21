// Types for bake.json, the per-design bake manifest read by tools/bake/bake.mjs (D-129).
//
// Paths in `from` resolve against the manifest's folder. A path starting
// `npm:` names a file inside an installed package, found by walking up from
// the manifest folder to the first node_modules that holds the package.
// Script-producing fields (`data`, `wasm`, `classic`, `blocks`, `build`, `entry`) are
// emitted in the order their keys appear in the manifest.

/** One inline script block, written as `<script>/* label *\/` plus source plus `</script>`. */
export interface BakeBlock {
  from: string;
  label: string;
  /** Third-party source: skipped by the dash check. */
  vendored?: boolean;
}

/** A tag in the shell replaced by an inline copy of a library; must match exactly once. */
export interface BakeVendor {
  match: string;
  from: string;
  label: string;
}

/** A wasm binary written as `globalThis.<global>="<base64>";`. */
export interface BakeWasm {
  from: string;
  global: string;
  label: string;
}

/** One exact text replacement inside a classic conversion; must match exactly once. */
export interface BakeReplace {
  match: string;
  with: string;
}

/** An ES module turned into a classic script, the COTTER baker pattern. */
export interface BakeClassic {
  from: string;
  label: string;
  /** The name after the trailing `export default`, assigned to `globalThis.<global>`. */
  exportDefault: string;
  global: string;
  replace: BakeReplace[];
}

/** A woff2 file inlined as an `@font-face` data URI. */
export interface BakeFont {
  family: string;
  weight: number;
  style: "normal" | "italic";
  from: string;
}

/** A stylesheet inlined with relative `@import` resolved; a network `@import` fails the bake. */
export interface BakeCss {
  from: string;
}

/**
 * A page build (D-264): a TypeScript entry bundled by vite into one classic
 * script whose exports land on `globalThis.<global>`. The bake gives it the
 * virtual module `hbf:facts` (tools/bake/design-facts.mjs) and stands the
 * page's manifold-3d classic script and jszip block in for those packages,
 * so `build` follows `wasm`, `classic` and `blocks`.
 */
export interface BakeBuild {
  from: string;
  global: string;
  label: string;
}

/**
 * A JSON file written as a data block, `<script type="<type>">` plus the
 * JSON with every `</` escaped; the page reads it and never runs it. An
 * hbf draft carries its sources this way (application/hbf-draft+json).
 */
export interface BakeData {
  from: string;
  type: string;
  label: string;
}

export interface BakeManifest {
  /** Output name: dist/<out>/<id>.html. */
  id: string;
  /** Output folder under dist; defaults to `legacy` for a file shell and `bench` for `ui`. */
  out?: string;
  /** A legacy shell file, or `ui` for a ui-rendered bench. */
  shell: string;
  /** Page title for a `ui` shell. */
  title?: string;
  /** For `ui` shells: the TypeScript entry bundled by vite into one ES module. */
  entry?: string;
  /** Exact shell strings removed; each must match exactly once. */
  drop?: string[];
  vendor?: BakeVendor[];
  wasm?: BakeWasm;
  classic?: BakeClassic[];
  fonts?: BakeFont[];
  css?: BakeCss[];
  blocks?: BakeBlock[];
  build?: BakeBuild;
  data?: BakeData[];
  /** Size ceiling in bytes; default 16777216 (16 MB, D-129). */
  budget?: number;
}
