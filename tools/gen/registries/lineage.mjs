// Gathers lineage/<subject>.json into the root lineage.json (D-156).
// Rule: add or edit the rows of lineage/<subject>.json, where subject is the
// id before the first slash, then run npm run registries; never edit the
// root lineage.json by hand. Each fragment is a JSON array of rows in the
// shape of tools/lineage.schema.json; tools/test/lineage.test.mjs checks the
// rows themselves on the gathered file.

import { existsSync } from "node:fs";
import { join } from "node:path";
import { jsonText, readFragments } from "../lib.mjs";

export const name = "lineage";

// Every row of every fragment, sorted by id. Throws on a fragment that is not
// an array, a row whose subject is not its file name, or an id seen twice.
export function gather(root) {
  const dir = join(root, "lineage");
  if (!existsSync(dir)) throw new Error(`no fragment directory at ${dir}`);
  const rows = [];
  const seen = new Map();
  for (const frag of readFragments(dir, ".json")) {
    const file = `lineage/${frag.id}.json`;
    let list;
    try {
      list = JSON.parse(frag.text);
    } catch (e) {
      throw new Error(`${file} is not JSON: ${e.message}`);
    }
    if (!Array.isArray(list)) throw new Error(`${file} holds no array of rows`);
    for (const row of list) {
      const id = row?.id;
      if (typeof id !== "string" || !id.includes("/")) throw new Error(`${file} has a row without a <subject>/<copy> id`);
      const subject = id.slice(0, id.indexOf("/"));
      if (subject !== frag.id) throw new Error(`${file} holds ${id}, whose subject is ${subject}. move it to lineage/${subject}.json`);
      if (seen.has(id)) throw new Error(`${id} is in ${seen.get(id)} and ${file}`);
      seen.set(id, file);
      rows.push(row);
    }
  }
  return rows.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

export function outputs(root) {
  return [{ path: "lineage.json", text: jsonText(gather(root)) }];
}
