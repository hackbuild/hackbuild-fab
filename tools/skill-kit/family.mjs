// The library family version and the files a release carries (plan v11.1
// 3.6). One version is set in each published package.json; everything else,
// the tag name, the CDN urls and the reference, is derived from those files.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PACKAGES, ROOT, VENDOR_THREE } from "../lib/outputs.mjs";
import { sidecarPath } from "../lib/sidecar.mjs";

export const REPO_SLUG = "hackbuild/hackbuild-fab";
export const TAG_PREFIX = "lib-v";
export const REFERENCE_PATH = "docs/skill/LIBRARIES.md";
/** The stylesheet every bench page loads first; hackbuild-ui 0.3.0 is not on npm, so the release carries the installed copy. */
export const UI_CSS = { path: "tools/vendor/hackbuild-ui/hackbuild.css", from: "node_modules/@virgilvox/hackbuild-ui/dist/styles/hackbuild.css" };
/** hackbuild.css imports ./tokens.css, so the release holds it beside. */
export const UI_TOKENS = { path: "tools/vendor/hackbuild-ui/tokens.css", from: "node_modules/@virgilvox/hackbuild-ui/dist/styles/tokens.css" };

/** The one family version; throws when the published packages disagree. */
export function familyVersion(root = ROOT) {
  const seen = new Map(PACKAGES.map((p) => [p.name, JSON.parse(readFileSync(join(root, p.dir, "package.json"), "utf8")).version]));
  const versions = new Set(seen.values());
  if (versions.size !== 1) throw new Error(`the published packages hold ${[...seen].map(([n, v]) => `${n} ${v}`).join(", ")}; set one family version in each package.json`);
  return [...versions][0];
}

export const tagOf = (version) => `${TAG_PREFIX}${version}`;
export const cdnBase = (version) => `https://cdn.jsdelivr.net/gh/${REPO_SLUG}@${tagOf(version)}/`;
export const cdnUrl = (version, path) => `${cdnBase(version)}${path}`;

/**
 * The files the CDN needs, as { path, from }: `path` is where the release
 * holds it, `from` the file it is read from (repo relative). Order is stable.
 */
export function releaseFiles() {
  const out = [];
  for (const p of PACKAGES) {
    const iife = `${p.dir}/dist/iife/${p.short}.js`;
    out.push({ path: `${p.dir}/dist/cdn/${p.short}.js`, from: `${p.dir}/dist/cdn/${p.short}.js` });
    out.push({ path: iife, from: iife });
    out.push({ path: sidecarPath(iife), from: sidecarPath(iife) });
    if (p.vue) out.push({ path: `${p.dir}/dist/style.css`, from: `${p.dir}/dist/style.css` });
  }
  out.push({ path: VENDOR_THREE, from: VENDOR_THREE });
  out.push({ path: sidecarPath(VENDOR_THREE), from: sidecarPath(VENDOR_THREE) });
  out.push({ path: UI_CSS.path, from: UI_CSS.from });
  out.push({ path: UI_TOKENS.path, from: UI_TOKENS.from });
  return out;
}
