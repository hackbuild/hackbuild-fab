#!/usr/bin/env node
// check-page: the enforcer of plan v11.1 3.6. A bench page is a thin consumer
// of the libraries; this refuses one that is not.
//
//   node tools/skill-kit/check-page.mjs <page.html> [--allow <version>]...
//
// Exit 0 when every check passes, 1 when one fails, 2 when the page cannot be
// read. Checks, each named in the output:
//   libraries         the page loads @hackbuild/bench at a published family
//                     version, by a jsDelivr url or by an inlined IIFE whose
//                     banner version and sha256 match that version's sidecar
//   bench-hook        the page's own code turns BENCH on (createBench hook,
//                     mountBench, or a BENCH assignment)
//   own-3mf-writer    no script of the page's own writes a 3MF
//   own-mesh-kernel   no script of the page's own meshes solids
//   own-bench-shell   no script of the page's own draws a viewer and shell
// "Own" scripts are the ones that are not library blocks: not a @hackbuild
// IIFE, a peer build, the entry, the kernel wasm and jszip a bake inlines, or
// a design page build. Signatures are listed once, below.

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { PACKAGES, ROOT } from "../lib/outputs.mjs";
import { sidecarPath } from "../lib/sidecar.mjs";
import { familyVersion, TAG_PREFIX } from "./family.mjs";

/** A block label that marks library code rather than the page's own. */
const LIBRARY_LABEL = /^\/\*\s*(?:@hackbuild\/|vue |pinia |three |manifold|inlined (?:jszip|three)|[\w.-]+ page build)/;

/** What each own-code violation looks like. A hit anywhere in an own script fails the check. */
export const SIGNATURES = {
  "own-3mf-writer": [
    [/\bOrca3MF\b/, "a global named Orca3MF"],
    [/3dmodel\.model/, "the 3dmodel.model part name"],
    [/\[Content_Types\]\.xml/, "the [Content_Types].xml package part"],
    [/3dmanufacturing\/core\/2015/, "the 3MF core namespace"],
    [/model_settings\.config/, "the slicer settings part"],
  ],
  "own-mesh-kernel": [
    [/\bRasterMesh\b/, "a global named RasterMesh"],
    [/marching[\s_-]?squares/i, "a marching squares contouring routine"],
    [/\bnonManifoldEdges?\b|\bweldVertices\b|\bmergeVertices\s*\(/, "a vertex weld or manifold repair routine"],
  ],
  "own-bench-shell": [
    [/new\s+THREE\.WebGLRenderer\s*\(/, "a WebGL renderer constructed in the page"],
    [/\bclass\s+OrbitControls\b|THREE\.OrbitControls\s*=/, "an orbit controls implementation"],
  ],
};

const sha256 = (s) => createHash("sha256").update(s).digest("hex");

/** Versions a page may load: the repo's family version, the lib-v tags of the repo, and any --allow. */
export function publishedVersions(root = ROOT, extra = []) {
  const out = new Set(extra);
  try { out.add(familyVersion(root)); } catch { /* the packages disagree; family check reports it elsewhere */ }
  try {
    const tags = execFileSync("git", ["tag", "--list", `${TAG_PREFIX}*`], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    for (const t of tags.split("\n")) if (t.startsWith(TAG_PREFIX)) out.add(t.slice(TAG_PREFIX.length));
  } catch { /* not a git checkout */ }
  return out;
}

export function scriptsOf(html) {
  return [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].map((m) => {
    const attrs = m[1];
    const body = m[2];
    const first = body.trimStart().split("\n", 1)[0] ?? "";
    return { attrs, body, src: /\bsrc\s*=\s*["']([^"']+)["']/.exec(attrs)?.[1] ?? null, type: /\btype\s*=\s*["']([^"']+)["']/.exec(attrs)?.[1] ?? "", label: first.startsWith("/*") ? first : "" };
  });
}

/** The libraries a page loads, by cdn url and by inlined banner. */
export function loadedLibraries(html, root = ROOT) {
  const found = [];
  for (const m of html.matchAll(/cdn\.jsdelivr\.net\/gh\/hackbuild\/hackbuild-fab@([^/"'\s]+)\/([\w./-]+)/g)) {
    const [, ref, path] = m;
    const pkg = PACKAGES.find((p) => path.startsWith(`${p.dir}/dist/`));
    found.push({ via: "url", ref, version: ref.startsWith(TAG_PREFIX) ? ref.slice(TAG_PREFIX.length) : null, name: pkg?.name ?? null, text: m[0] });
  }
  for (const m of html.matchAll(/cdn\.jsdelivr\.net\/npm\/(@hackbuild\/[\w-]+)@([^/"'\s]+)\//g)) found.push({ via: "url", ref: m[2], version: m[2], name: m[1], text: m[0] });
  for (const s of scriptsOf(html)) {
    const b = /^\/\*\s*(@hackbuild\/[\w-]+) (\S+?), iife build, global (\w+) \*\//.exec(s.label);
    if (b === null) continue;
    const pkg = PACKAGES.find((p) => p.name === b[1]);
    const code = s.body.trimStart().slice(s.label.length).replace(/^\n/, "");
    const side = pkg === undefined ? null : join(root, sidecarPath(`${pkg.dir}/dist/iife/${pkg.short}.js`));
    const want = side !== null && existsSync(side) ? JSON.parse(readFileSync(side, "utf8")).sha256 : null;
    const got = [code.replace(/\s+$/, ""), `${code.replace(/\s+$/, "")}\n`].map(sha256);
    found.push({ via: "inline", ref: b[2], version: b[2], name: b[1], global: b[3], sha256: got[1], matches: want !== null && got.includes(want), sidecar: want !== null, text: s.label });
  }
  return found;
}

export function checkPage(html, { root = ROOT, allow = [] } = {}) {
  const results = [];
  const add = (id, ok, line) => results.push({ id, ok, line });
  const published = publishedVersions(root, allow);
  const list = [...published].sort().join(", ");

  // libraries
  const libs = loadedLibraries(html, root);
  const bench = libs.filter((l) => l.name === "@hackbuild/bench");
  const problems = [];
  if (bench.length === 0) problems.push("@hackbuild/bench is not loaded from a jsDelivr release url or an inlined iife");
  for (const l of libs) {
    if (l.version === null) problems.push(`${l.text} names ${l.ref}, a moving or unversioned ref; use ${TAG_PREFIX}<version>`);
    else if (!published.has(l.version)) problems.push(`${l.name ?? l.text} version ${l.version} is not published, legal ${list}`);
    else if (l.via === "inline" && !l.matches) problems.push(`${l.name} ${l.version} inline script sha256 ${l.sha256} does not match ${l.sidecar ? "its sidecar" : "any sidecar (none found for it)"}`);
  }
  add("libraries", problems.length === 0, problems.length === 0 ? `loads ${[...new Set(libs.map((l) => `${l.name} ${l.version}`))].join(", ")}` : problems.join("; "));

  // own code
  const own = scriptsOf(html).filter((s) => s.src === null && s.type !== "importmap" && s.type !== "application/json" && !/^application\//.test(s.type) && !LIBRARY_LABEL.test(s.label) && s.body.trim() !== "");
  const ownText = own.map((s) => s.body).join("\n");

  // bench hook
  const hook = /\bhook\s*:\s*(?:true|!0)(?![\w$])|\bmountBench\)?\s*\(|\bBENCH\s*=|globalThis\.BENCH\b|window\.BENCH\b|installHook\s*\(/.test(ownText);
  add("bench-hook", hook, hook ? "the page's own code turns BENCH on" : "no BENCH hook: pass hook: true to createBench or mount with mountBench");

  for (const [id, sigs] of Object.entries(SIGNATURES)) {
    const hits = sigs.filter(([re]) => re.test(ownText)).map(([, what]) => what);
    add(id, hits.length === 0, hits.length === 0 ? "none found" : `the page carries ${hits.join(", ")}; use the library instead`);
  }
  return results;
}

export function report(results) {
  return results.map((r) => `${r.ok ? "pass" : "fail"}  ${r.id}: ${r.line}`).join("\n");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const allow = [];
  const files = [];
  for (let i = 0; i < args.length; i++) (args[i] === "--allow" ? allow.push(args[++i]) : files.push(args[i]));
  if (files.length !== 1) { console.error("usage: check-page.mjs <page.html> [--allow <version>]..."); process.exit(2); }
  let html;
  try { html = readFileSync(files[0], "utf8"); } catch (e) { console.error(`cannot read ${files[0]}: ${e.message}`); process.exit(2); }
  const results = checkPage(html, { allow });
  console.log(report(results));
  process.exit(results.every((r) => r.ok) ? 0 : 1);
}
