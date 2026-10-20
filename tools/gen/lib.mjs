// Helpers shared by the registry generators in tools/gen/registries/.
// Pure node: no dist reads, no network, so the frame runs before tsc -b.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Fragment files in dir ending in ext, sorted by file name so output never
// depends on directory order. Dotfiles are skipped. id is the file name
// without ext.
export function readFragments(dir, ext) {
  return readdirSync(dir)
    .filter((f) => f.endsWith(ext) && !f.startsWith("."))
    .sort()
    .map((f) => ({ id: f.slice(0, -ext.length), path: join(dir, f), text: readFileSync(join(dir, f), "utf8") }));
}

// Generator module file names in run order. Node on unix already lists a
// directory in byte order (libuv scandir with alphasort); the sort keeps the
// order when a platform or a future node lists it otherwise.
export function generatorFiles(names) {
  return names.filter((f) => f.endsWith(".mjs") && !f.startsWith(".")).sort();
}

// The JSON byte form every gathered registry uses today.
export function jsonText(value) {
  return JSON.stringify(value, null, 2) + "\n";
}

// Ids in frozen order first (the append order a registry held when it was
// converted; the list is never extended), then every other id sorted. A
// frozen id with no fragment is dropped. Duplicate ids are refused.
export function frozenThenSorted(ids, frozen) {
  const have = new Set(ids);
  if (have.size !== ids.length) throw new Error(`duplicate id in ${ids.filter((id, i) => ids.indexOf(id) !== i).join(", ")}`);
  const head = frozen.filter((id) => have.has(id));
  const inHead = new Set(head);
  return [...head, ...ids.filter((id) => !inHead.has(id)).sort()];
}

// The name of the one exported const a def file defines. When the file
// exports more than one, the one annotated with typeName wins; no match or
// a tie throws so a generator never guesses.
export function exportedConst(tsText, typeName) {
  const all = [...tsText.matchAll(/^export const (\w+)\s*(?::\s*([\w.]+))?/gm)].map((m) => ({ name: m[1], type: m[2] ?? null }));
  if (all.length === 1) return all[0].name;
  const typed = all.filter((e) => e.type === typeName);
  if (typed.length === 1) return typed[0].name;
  throw new Error(`expected one exported const of type ${typeName}, found ${all.length} exports and ${typed.length} of that type`);
}
