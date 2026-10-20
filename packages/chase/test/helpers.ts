// Shared by the chase package tests: the flex-pair chase read as data, and
// the reference and design chases on disk.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Chase } from "@hackbuild/spec";
import { checkDeclares } from "@hackbuild/chase";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

export function readChase(rel: string): Chase {
  const v = checkDeclares(readFileSync(path.join(ROOT, rel), "utf8"), rel);
  if (!v.ok) throw new Error(`${rel}:${v.line} ${v.error.hint}`);
  return v.chase;
}

export const flexPair = (): Chase => readChase("reference/keys/flex-pair/chase.ts");

/** Every chase.ts under reference/<area>/<id>/ and designs/<id>/, sorted. */
export function chaseFiles(): string[] {
  const out: string[] = [];
  const add = (rel: string): void => {
    if (existsSync(path.join(ROOT, rel))) out.push(rel);
  };
  for (const area of readdirSync(path.join(ROOT, "reference"), { withFileTypes: true })) {
    if (!area.isDirectory()) continue;
    for (const id of readdirSync(path.join(ROOT, "reference", area.name), { withFileTypes: true })) if (id.isDirectory()) add(path.join("reference", area.name, id.name, "chase.ts"));
  }
  for (const id of readdirSync(path.join(ROOT, "designs"), { withFileTypes: true })) if (id.isDirectory()) add(path.join("designs", id.name, "chase.ts"));
  return out.sort();
}
