// Gathers docs/plan/decisions/D-NNN.md into docs/plan/DECISIONS.md (D-192,
// R1-split-01). Rule: a new decision is a new file docs/plan/decisions/D-NNN.md
// holding its index row, a blank line and its entry from "### D-NNN"; then run
// npm run registries; never edit DECISIONS.md by hand. The prose, the section
// headings and the owner queue live in docs/plan/decisions/_layout.md, where
// "<!-- decisions:index -->" takes every index row and
// "<!-- decisions:entries D-a D-b -->" every entry from D-a to D-b ("on" for
// no upper end). An index row with no entry (D-176, never issued) is a
// fragment of one line.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readFragments } from "../lib.mjs";

export const name = "decisions";

const ID = /^D-\d{3,}$/;
const num = (id) => Number(id.slice(2));

// The fragments in id order: { id, row, entry } with entry null for an
// index-only id. Throws on a file whose name, row and heading disagree.
export function gather(root) {
  const dir = join(root, "docs", "plan", "decisions");
  if (!existsSync(dir)) throw new Error(`no fragment directory at ${dir}`);
  const out = [];
  for (const frag of readFragments(dir, ".md")) {
    if (frag.id.startsWith("_")) continue;
    const file = `docs/plan/decisions/${frag.id}.md`;
    if (!ID.test(frag.id)) throw new Error(`${file} is not named D-NNN.md`);
    const [row, ...rest] = frag.text.replace(/\n+$/, "").split("\n");
    if (!row.startsWith(`| ${frag.id} |`)) throw new Error(`${file} does not open with its index row "| ${frag.id} | title | status | area |"`);
    let entry = null;
    if (rest.length > 0) {
      if (rest[0] !== "" || !rest[1]?.startsWith(`### ${frag.id} `)) throw new Error(`${file}: after the index row comes a blank line and "### ${frag.id} <title>"`);
      entry = rest.slice(1).join("\n");
    }
    out.push({ id: frag.id, row, entry });
  }
  return out.sort((a, b) => num(a.id) - num(b.id));
}

export function render(root) {
  const layoutFile = join(root, "docs", "plan", "decisions", "_layout.md");
  if (!existsSync(layoutFile)) throw new Error(`no layout at ${layoutFile}`);
  const frags = gather(root);
  const placed = new Set();
  let indexes = 0;
  const lines = readFileSync(layoutFile, "utf8").split("\n").map((l) => {
    if (l === "<!-- decisions:index -->") {
      indexes++;
      return frags.map((f) => f.row).join("\n");
    }
    const m = /^<!-- decisions:entries (D-\d+) (D-\d+|on) -->$/.exec(l);
    if (!m) return l;
    const lo = num(m[1]);
    const hi = m[2] === "on" ? Infinity : num(m[2]);
    const run = frags.filter((f) => f.entry !== null && num(f.id) >= lo && num(f.id) <= hi);
    for (const f of run) {
      if (placed.has(f.id)) throw new Error(`${f.id} falls in two entries ranges of _layout.md`);
      placed.add(f.id);
    }
    return run.map((f) => f.entry).join("\n\n");
  });
  if (indexes !== 1) throw new Error(`_layout.md holds ${indexes} index markers, expected 1`);
  const lost = frags.filter((f) => f.entry !== null && !placed.has(f.id)).map((f) => f.id);
  if (lost.length > 0) throw new Error(`no entries range in _layout.md takes ${lost.join(", ")}`);
  return lines.join("\n");
}

export function outputs(root) {
  return [{ path: "docs/plan/DECISIONS.md", text: render(root) }];
}
