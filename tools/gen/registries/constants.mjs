// Gathers packages/profile/data/constants/<prefix>.json into
// packages/profile/data/constants.json, the file the profile lookup imports.
// Rule: a new constant goes in the array of constants/<prefix>.json, where
// prefix is its id up to the first dot (a new prefix is a new file), then
// npm run registries; never edit constants.json or the order list in
// _head.json by hand. _head.json holds note, moved and order: the ids in the
// order constants.json had when it was split, frozen. Rows in order come
// first in that order, every later row follows sorted by id, so a split
// never reorders the live file and a new row never moves an old one.

import { join } from "node:path";
import { frozenThenSorted, jsonText, readFragments } from "../lib.mjs";

export const name = "constants";

const DIR = "packages/profile/data/constants";
const HEAD = "_head";

function parse(file, text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`${file} is not JSON: ${e.message}`);
  }
}

/** The id up to its first dot; an id without a dot has no prefix. */
export function prefixOf(id) {
  const at = typeof id === "string" ? id.indexOf(".") : -1;
  return at > 0 ? id.slice(0, at) : null;
}

// The gathered object: note, constants in head order then sorted, then
// moved. Throws on a missing or malformed head, a fragment that is not an
// array of row objects, a row whose prefix is not its file name, or an id
// listed twice across fragments.
export function gatherConstants(root) {
  const dir = join(root, DIR);
  const frags = readFragments(dir, ".json");
  const headFrag = frags.find((f) => f.id === HEAD);
  if (headFrag === undefined) throw new Error(`no ${DIR}/${HEAD}.json holding note, moved and order`);
  const head = parse(`${DIR}/${HEAD}.json`, headFrag.text);
  if (!Array.isArray(head?.order) || head.order.some((id) => typeof id !== "string")) throw new Error(`${DIR}/${HEAD}.json has no order array of ids`);
  if (new Set(head.order).size !== head.order.length) throw new Error(`${DIR}/${HEAD}.json lists an id twice in order`);
  const rows = new Map();
  for (const frag of frags) {
    if (frag.id === HEAD) continue;
    const file = `${DIR}/${frag.id}.json`;
    const list = parse(file, frag.text);
    if (!Array.isArray(list)) throw new Error(`${file} holds no array of constant rows`);
    for (const row of list) {
      if (row === null || typeof row !== "object" || Array.isArray(row)) throw new Error(`${file} holds an entry that is not a constant row object`);
      const prefix = prefixOf(row.id);
      if (prefix === null) throw new Error(`${file} holds id ${JSON.stringify(row.id)} with no prefix. name it <prefix>.<name>`);
      if (prefix !== frag.id) throw new Error(`${file} holds ${row.id}. move it to ${DIR}/${prefix}.json`);
      if (rows.has(row.id)) throw new Error(`${file} lists ${row.id} twice`);
      rows.set(row.id, row);
    }
  }
  const ids = frozenThenSorted([...rows.keys()], head.order);
  const out = {};
  if (head.note !== undefined) out.note = head.note;
  out.constants = ids.map((id) => rows.get(id));
  if (head.moved !== undefined) out.moved = head.moved;
  return out;
}

export function outputs(root) {
  return [{ path: "packages/profile/data/constants.json", text: jsonText(gatherConstants(root)) }];
}
