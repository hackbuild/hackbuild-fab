// Legacy copies added from M10-T01 on stay out of git (D-286): a folder keeps
// its SHA256SUMS, the bytes live in the owner's archive. A file absent from
// disk that a SHA256SUMS under designs/<id>/legacy lists is a held copy, and
// its row is the record of its bytes.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

/** Every SHA256SUMS row under designs/<id>/legacy: repo-relative path to sha256. */
export function legacySums(root) {
  const out = new Map();
  const designs = path.join(root, 'designs');
  const walk = (rel) => {
    for (const e of readdirSync(path.join(root, rel)).sort()) {
      const child = `${rel}/${e}`;
      if (e === 'node_modules') continue;
      if (statSync(path.join(root, child)).isDirectory()) walk(child);
      else if (e === 'SHA256SUMS') {
        for (const line of readFileSync(path.join(root, child), 'utf8').split('\n')) {
          const m = /^([0-9a-f]{64}) [ *](.+)$/.exec(line.trim());
          if (m) out.set(`${rel}/${m[2]}`, m[1]);
        }
      }
    }
  };
  for (const d of existsSync(designs) ? readdirSync(designs).sort() : []) {
    if (existsSync(path.join(designs, d, 'legacy'))) walk(`designs/${d}/legacy`);
  }
  return out;
}

/**
 * The recorded sha256 of a held copy, or null when the file is on disk or no
 * row lists it. A member of a held stored zip (`x.zip!member`) is recorded by
 * the folder README's row for it, which gives a sha256 prefix of 12 or more
 * hex digits; compare with startsWith. A member of a held zip the README has
 * no row for returns '': the zip is held, the member's bytes are not recorded.
 */
export function heldSha(root, rel, sums = legacySums(root)) {
  const bang = rel.indexOf('!');
  if (bang < 0) return existsSync(path.join(root, rel)) ? null : sums.get(rel) ?? null;
  const zip = rel.slice(0, bang);
  if (existsSync(path.join(root, zip)) || !sums.has(zip)) return null;
  const readme = path.join(root, path.dirname(zip), 'README.md');
  if (!existsSync(readme)) return '';
  const cell = `\`${path.basename(zip)}!${rel.slice(bang + 1)}\``;
  const line = readFileSync(readme, 'utf8').split('\n').find((l) => l.startsWith(`| ${cell} |`));
  return /\| ([0-9a-f]{12,64}) \|/.exec(line ?? '')?.[1] ?? '';
}

/** The held copies the .gitignore block between held-legacy:begin and :end names, repo relative. */
export function heldList(root) {
  const text = readFileSync(path.join(root, '.gitignore'), 'utf8');
  const a = text.indexOf('# held-legacy:begin\n');
  const b = text.indexOf('# held-legacy:end');
  if (a < 0 || b < a) return [];
  return text.slice(a + '# held-legacy:begin\n'.length, b).split('\n').filter(Boolean).map((l) => l.replace(/^\//, ''));
}
