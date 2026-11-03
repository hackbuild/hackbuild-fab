// The benches file-url.spec.ts opens from file://, derived from the bake
// manifests so no list is typed by hand: every bake.json findManifests()
// returns whose shell is "ui", that has a build entry, and whose directory
// keeps expected/build.json. The page is dist/<out ?? "bench">/<id>.html.
// A manifest that has a build and no golden, a golden with no buildHash,
// or two manifests that bake to one page are problems, each a line that
// names the manifest, so a new design cannot skip the check silently.

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { REPO, findManifests } from '../bake/bake.mjs';

const posix = (p) => p.split(sep).join('/');

/**
 * @param {string} [root] repository root; a test points it at a fixture tree
 * @returns {{ benches: Array<{ id: string, dir: string, manifest: string, page: string, golden: string, bake: string }>, problems: string[] }}
 *   Paths are relative to `root` with forward slashes. `bake` is the command that writes the page.
 */
export function fileUrlBenches(root = REPO) {
  const benches = [];
  const problems = [];
  const owner = new Map();
  for (const file of findManifests(root)) {
    const manifest = posix(relative(root, file));
    let m;
    try {
      m = JSON.parse(readFileSync(file, 'utf8'));
    } catch (e) {
      problems.push(`${manifest}: not JSON (${e.message}). fix the manifest.`);
      continue;
    }
    if (m.shell !== 'ui' || m.build === undefined) continue;
    const dir = posix(relative(root, dirname(file)));
    const golden = `${dir}/expected/build.json`;
    if (!existsSync(join(root, golden))) {
      problems.push(`${manifest}: has a build and no ${golden}. keep the golden (npx --no-install hbf parity --accept ${m.id}, reviewed by the owner).`);
      continue;
    }
    let hash;
    try {
      hash = JSON.parse(readFileSync(join(root, golden), 'utf8')).buildHash;
    } catch (e) {
      problems.push(`${manifest}: ${golden} is not JSON (${e.message}). regenerate it with hbf parity.`);
      continue;
    }
    if (typeof hash !== 'string' || hash === '') {
      problems.push(`${manifest}: ${golden} holds no buildHash. regenerate it with hbf parity.`);
      continue;
    }
    const page = `dist/${m.out ?? 'bench'}/${m.id}.html`;
    if (owner.has(page)) {
      problems.push(`${manifest}: bakes to ${page}, which ${owner.get(page)} also bakes. give one a distinct id.`);
      continue;
    }
    owner.set(page, manifest);
    benches.push({ id: m.id, dir, manifest, page, golden, bake: `npm run build:lib && node tools/bake/bake.mjs ${manifest}` });
  }
  return { benches, problems };
}
