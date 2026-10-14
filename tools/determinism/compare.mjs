#!/usr/bin/env node
// M00-T14 (D-056, TESTING.md 7): compare two hash files, id to hash. Exits
// 1 when any required id differs or is missing on one side, printing each
// id with both hashes; exits 2 on a usage or read error.
//
// zip: ids are recorded, never required (cross-arch byte identity of one
// writer's zip, M00-T14 step 4): a difference prints as "recorded".
// --subset compares only the ids the right file holds; the browser legs
// hash the route fixtures and the ring set, a subset of the node list.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Ids whose hash differs or which one side lacks, sorted. */
export function diff(a, b, { subset = false } = {}) {
  const ids = subset ? Object.keys(b) : [...new Set([...Object.keys(a), ...Object.keys(b)])];
  return ids.sort().filter((id) => a[id] !== b[id]);
}

export const RECORDED_ONLY = "zip:";

function read(file) {
  const v = JSON.parse(readFileSync(file, "utf8"));
  if (typeof v !== "object" || v === null || Array.isArray(v)) throw new Error(`${file}: want an object of id to hash`);
  return v;
}

function main(argv) {
  const subset = argv.includes("--subset");
  const files = argv.filter((a) => a !== "--subset");
  if (files.length !== 2) {
    process.stderr.write("usage: compare.mjs [--subset] <a.json> <b.json>\n");
    return 2;
  }
  let a, b;
  try {
    a = read(files[0]);
    b = read(files[1]);
  } catch (e) {
    process.stderr.write(`compare: ${e instanceof Error ? e.message : String(e)}\n`);
    return 2;
  }
  const bad = diff(a, b, { subset });
  let required = 0;
  for (const id of bad) {
    const pair = `${a[id] ?? "missing"} ${b[id] ?? "missing"}`;
    if (id.startsWith(RECORDED_ONLY)) {
      process.stdout.write(`recorded ${id} ${pair}\n`);
    } else {
      required += 1;
      process.stdout.write(`differs ${id} ${pair}\n`);
    }
  }
  const compared = subset ? Object.keys(b).length : new Set([...Object.keys(a), ...Object.keys(b)]).size;
  process.stdout.write(`compared ${compared} ids (counted), ${required} required differ, ${bad.length - required} recorded differ\n`);
  return required === 0 ? 0 : 1;
}

if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
