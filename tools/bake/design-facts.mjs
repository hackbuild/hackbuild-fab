#!/usr/bin/env node
// tools/bake/design-facts.mjs: the PageFacts a fab bake writes into the page
// so the in-page build (packages/pipeline createPageBuild, D-264) hashes what
// `hbf part.build` hashes. It loads the design with core's loadDesign, so
// defHash covers the same source closure, the profile slice and check seed
// are the ones core reads, and the versions come from the same package
// files.
//
//   node tools/bake/design-facts.mjs <design dir>   prints one JSON object
//
// SOURCE_DATE_EPOCH is the environment value when set, else 315532800; the
// bake never reads the HEAD commit time, so the page carries no date the
// bake inputs do not name. Runs in its own process: core's packages need the
// resolve hook, and the bake's vite run should not load under it.

import { register } from 'node:module';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
register(pathToFileURL(resolve(REPO, 'core/dist/resolve-hook.js')).href, import.meta.url);

const at = (p) => pathToFileURL(resolve(REPO, 'core/dist', p)).href;
const { loadDesign } = await import(at('commands/build.js'));
const { constraintVersions } = await import(at('checks.js'));
const { DEFAULT_EPOCH, sourceDateEpoch } = await import(at('epoch.js'));

const target = process.argv[2];
if (target === undefined) {
  process.stderr.write('usage: node tools/bake/design-facts.mjs <design dir>\n');
  process.exit(2);
}
const design = await loadDesign(resolve(target), REPO);
const epoch = sourceDateEpoch(REPO, { SOURCE_DATE_EPOCH: process.env.SOURCE_DATE_EPOCH || String(DEFAULT_EPOCH) }).value;
const facts = {
  name: basename(design.dir),
  defHash: design.defHash,
  tables: design.ws.tables,
  checksSeed: design.ws.checksSeed,
  versions: design.ws.versions,
  constraints: constraintVersions(),
  epoch,
};
process.stdout.write(`${JSON.stringify(facts)}\n`);
