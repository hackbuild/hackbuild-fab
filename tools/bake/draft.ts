#!/usr/bin/env node
// tools/bake/draft.ts: the bake files of an hbf draft (plan v9 3.1,
// R1-engine-24), generated from the draft directory each time it bakes.
// The manifest is from-chase.ts's with the draft block (draft.json, written
// by core before the bake) as a data block, so the page carries its own
// sources for hbf adopt. The page build runs with draft true (fails show as
// warnings, exports carry the DRAFT marks, packages/pipeline draft-mark.ts)
// and the bench entry mounts the draft banner and, when widget.ts is
// present, the one inline widget. A draft's bake files are generated, so
// they are rewritten on every bake; a release page's are never touched.
//
//   node tools/bake/draft.ts <draft dir>   prints {"manifest": <path>, "wrote": [...]}

import { existsSync, writeFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { DRAFT_BLOCK_FILE, DRAFT_BLOCK_TYPE } from "../../spec/draft.ts";
import { REPO, manifestFor } from "./from-chase.ts";
import type { BakeManifest } from "./manifest.ts";

const posix = (p: string): string => p.split(sep).join("/");

/** The draft's bake.json: from-chase's manifest with the draft block ahead of the scripts. */
export function draftManifest(dir: string): BakeManifest {
  const { wasm, classic, blocks, build, entry, ...head } = manifestFor(dir);
  return {
    ...head,
    title: `${head.id} draft`,
    // The page lands in the draft directory (chase.bake's out root for a draft), beside its sources.
    out: ".",
    data: [{ from: `./${DRAFT_BLOCK_FILE}`, type: DRAFT_BLOCK_TYPE, label: `${head.id} draft sources` }],
    ...(wasm === undefined ? {} : { wasm }),
    ...(classic === undefined ? {} : { classic }),
    ...(blocks === undefined ? {} : { blocks }),
    ...(build === undefined ? {} : { build }),
    ...(entry === undefined ? {} : { entry }),
  };
}

/** The draft bench entry: the plain one with the draft flag from the page build and the inline widget when there is one. */
export function draftEntrySource(dir: string, widget: boolean): string {
  const ui = posix(relative(resolve(dir), join(REPO, "packages/bench/src/bench/entry")));
  return [
    "/// <reference lib=\"dom\" />",
    "// The draft bench entry hbf draft writes on every bake (tools/bake/draft.ts):",
    "// the chase and bench beside it, mounted with the draft page build, which",
    "// sets draft and so the banner. It sits outside defHash with bench.ts (D-174).",
    "",
    `import { mountBench, pageBench, pageOf } from ${JSON.stringify(ui)};`,
    'import { bench } from "./bench";',
    'import { chase } from "./chase";',
    ...(widget ? ['import { widget } from "./widget";'] : []),
    "",
    `mountBench({ chase, bench, ...pageBench(pageOf("HbfPageBuild"))${widget ? ", widget" : ""} });`,
    "",
  ].join("\n");
}

/** The draft page build: the shared page build with draft set (D-264). */
export const DRAFT_PAGE_BUILD = [
  "// The draft page build hbf draft writes on every bake (tools/bake/draft.ts):",
  "// the chase and build.ts run in the page by the shared build and check",
  "// pipeline with draft set, so fails show as warnings and every export",
  "// carries the DRAFT marks (packages/pipeline draft-mark.ts).",
  "",
  'import { createPageBuild } from "@hackbuild/pipeline";',
  'import { pageFacts } from "@hackbuild/registry-loader";',
  'import { facts } from "hbf:facts";',
  'import { chase } from "./chase";',
  'import * as module from "./build";',
  "",
  "export const page = createPageBuild({ chase, module, facts: pageFacts(facts), draft: true });",
  "",
].join("\n");

/** Write the draft's bake.json, bench.entry.ts and page-build.ts; refuses a directory without chase.ts or draft.json. */
export function writeDraftBake(dir: string): { manifest: string; wrote: string[] } {
  const abs = resolve(dir);
  if (!existsSync(join(abs, "chase.ts"))) throw new Error(`no chase.ts in ${abs}`);
  if (!existsSync(join(abs, DRAFT_BLOCK_FILE))) throw new Error(`no ${DRAFT_BLOCK_FILE} in ${abs}; it is no hbf draft`);
  const files: [string, string][] = [
    ["bake.json", `${JSON.stringify(draftManifest(abs), null, 2)}\n`],
    ["bench.entry.ts", draftEntrySource(abs, existsSync(join(abs, "widget.ts")))],
    ["page-build.ts", DRAFT_PAGE_BUILD],
  ];
  for (const [name, text] of files) writeFileSync(join(abs, name), text);
  return { manifest: join(abs, "bake.json"), wrote: files.map(([n]) => n) };
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = process.argv[2];
  if (dir === undefined || process.argv.length !== 3) {
    console.error("usage: node tools/bake/draft.ts <draft dir>");
    process.exitCode = 2;
  } else {
    try {
      console.log(JSON.stringify(writeDraftBake(dir)));
    } catch (e) {
      console.error(`draft: ${(e as Error).message}`);
      process.exitCode = 1;
    }
  }
}
