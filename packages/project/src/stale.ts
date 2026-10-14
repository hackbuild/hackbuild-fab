// The stale rule (M04-T09 step 3): an item is stale when a link it depends
// on recorded a hash its target no longer has, or when an item it depends
// on is stale. A target that no longer exists is a changed target. The
// because list is the path of links to the changed item, so its last entry
// names what changed.

import type { Item, Link, MadeLine, ProjectGraph, StaleEntry } from "./graph.js";

// UTF-16 code-unit order, independent of the host locale; localeCompare
// would follow LANG and reorder ids such as "aa" (after "z" under da_DK).
const byCode = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

export function computeStale(items: readonly Item[], links: readonly Link[]): StaleEntry[] {
  const byId = new Map(items.map((i) => [i.id, i] as const));
  const out = new Map<string, string[]>();
  const deps = new Map<string, Link[]>();
  for (const l of links) deps.set(l.from, [...(deps.get(l.from) ?? []), l]);
  const visit = (id: string, seen: Set<string>): string[] | null => {
    if (out.has(id)) return out.get(id) ?? null;
    if (seen.has(id)) return null;
    seen.add(id);
    for (const l of deps.get(id) ?? []) {
      const to = byId.get(l.to);
      if (to === undefined || to.hash !== l.hashAtLink) {
        const path = [`${l.kind} ${l.to}`];
        out.set(id, path);
        return path;
      }
      const up = visit(l.to, seen);
      if (up !== null) {
        const path = [`${l.kind} ${l.to}`, ...up];
        out.set(id, path);
        return path;
      }
    }
    return null;
  };
  for (const i of items) visit(i.id, new Set());
  return [...out.entries()].map(([id, because]) => ({ id, because })).sort((a, b) => byCode(a.id, b.id));
}

/** Ids of every item with a path of links to `id`: what a change to `id` can make stale. */
export function downstream(links: readonly Link[], id: string): string[] {
  const dependents = new Map<string, string[]>();
  for (const l of links) dependents.set(l.to, [...(dependents.get(l.to) ?? []), l.from]);
  const found = new Set<string>();
  const queue = [id];
  while (queue.length > 0) {
    for (const d of dependents.get(queue.shift()!) ?? []) {
      if (d === id || found.has(d)) continue;
      found.add(d);
      queue.push(d);
    }
  }
  return [...found].sort(byCode);
}

/**
 * The graph over made lines (folded, newest per item) and the current
 * items they link to. A made item keeps the hash it was made with; a
 * source item (chase, profile row, CheckDef, legacy file) carries the hash
 * its source has now, which is what a link compares against.
 */
export function assembleGraph(made: readonly MadeLine[], current: readonly Item[]): ProjectGraph {
  const items = new Map<string, Item>();
  for (const i of current) items.set(i.id, i);
  for (const l of made) items.set(l.item.id, l.item);
  const all = [...items.values()].sort((a, b) => byCode(a.id, b.id));
  const links = made.flatMap((l) => l.links);
  return { items: all, links, stale: computeStale(all, links) };
}
