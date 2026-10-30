// Points a local fixture page at release urls, and maps release urls back to
// local files (plan v11.1 3.6). The CDN fixture (tools/fixtures/cdn/index.html)
// loads the staged builds from this checkout; a skill page loads the same
// files from jsDelivr at a release tag. pointAtRelease rewrites the first into
// the second, and releaseFileFor answers a jsDelivr url from this checkout,
// so a test serves the "cdn" with no network.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PACKAGES, ROOT } from "../lib/outputs.mjs";
import { cdnBase, cdnUrl, familyVersion, releaseFiles, UI_CSS } from "./family.mjs";

const installed = (root, name) => JSON.parse(readFileSync(join(root, "node_modules", name, "package.json"), "utf8")).version;

/** Rewrites the import map and stylesheet links of a fixture page to jsDelivr release urls. */
export function pointAtRelease(html, root = ROOT) {
  const version = familyVersion(root);
  let out = html;
  for (const p of PACKAGES) {
    out = out.split(`/out/publish/${p.short}/dist/cdn/${p.short}.js`).join(cdnUrl(version, `${p.dir}/dist/cdn/${p.short}.js`));
    out = out.split(`/out/publish/${p.short}/dist/style.css`).join(cdnUrl(version, `${p.dir}/dist/style.css`));
  }
  out = out.split(`/node_modules/${UI_CSS.from.replace(/^node_modules\//, "")}`).join(cdnUrl(version, UI_CSS.path));
  out = out.replace(/\/node_modules\/((?:@[\w.-]+\/)?[\w.-]+)\/([\w./-]+)/g, (_m, name, file) => `https://cdn.jsdelivr.net/npm/${name}@${installed(root, name)}/${file}`);
  return out;
}

/** The repo file a jsDelivr release or npm url stands for, or null when it names none. */
export function releaseFileFor(url, root = ROOT) {
  const version = familyVersion(root);
  const base = cdnBase(version);
  if (url.startsWith(base)) {
    const path = url.slice(base.length);
    const f = releaseFiles().find((x) => x.path === path);
    return f === undefined ? null : join(root, f.from);
  }
  const m = /^https:\/\/cdn\.jsdelivr\.net\/npm\/((?:@[\w.-]+\/)?[\w.-]+)@([^/]+)\/(.+)$/.exec(url);
  if (m !== null && installed(root, m[1]) === m[2]) return join(root, "node_modules", m[1], m[3]);
  return null;
}
