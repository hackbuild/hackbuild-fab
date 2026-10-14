// Types for bake.json, the per-design bake manifest read by tools/bake/bake.mjs (D-129).
//
// Paths in `from` resolve against the manifest's folder. A path starting
// `npm:` names a file inside an installed package, found by walking up from
// the manifest folder to the first node_modules that holds the package.
// Script-producing fields (`wasm`, `classic`, `blocks`, `entry`) are emitted
// in the order their keys appear in the manifest.

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
  /** Size ceiling in bytes; default 16777216 (16 MB, D-129). */
  budget?: number;
}
