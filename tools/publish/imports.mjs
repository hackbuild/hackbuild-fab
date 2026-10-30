// Module specifiers a built file names, for the publish staging and the
// install test. Written for the unminified output of the staged esm and
// types: an import statement starts its line, so a doc comment that quotes
// `from "x"` is not read as an import.

import { builtinModules } from "node:module";

const STATIC = /^[ \t]*(?:import|export)\b[^\n]*?\bfrom\s*(["'])([^"'\n]+)\1/gm;
const BARE = /^[ \t]*import\s*(["'])([^"'\n]+)\1/gm;
const DYNAMIC = /\bimport\(\s*(["'])([^"'\n]+)\1\s*\)/g;

/** Every specifier an unminified esm or d.ts file imports or re-exports, sorted and unique. */
export function importSpecifiers(code) {
  const out = new Set();
  for (const re of [STATIC, BARE, DYNAMIC]) for (const m of code.matchAll(re)) out.add(m[2]);
  return [...out].sort();
}

/** Is the specifier a package (or package subpath) and not a relative, absolute or virtual path? */
export const isBare = (id) => !/^(?:\.{1,2}\/|\/|\0|[A-Za-z]:[\\/]|data:|https?:)/.test(id) && id !== "." && id !== "..";

/** The package name of a bare specifier: "@a/b/c" is "@a/b", "x/y" is "x". */
export function packageName(id) {
  const parts = id.split("/");
  return id.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

const BUILTINS = new Set(builtinModules.flatMap((m) => [m, `node:${m}`]));
/** Is the specifier a Node built-in module? */
export const isBuiltin = (id) => BUILTINS.has(id) || BUILTINS.has(packageName(id));

/** The same, for a minified file (cdn and iife builds): `from"x"` carries no space and a statement need not start its line. */
export function looseSpecifiers(code) {
  const out = new Set();
  const re = /\b(?:import|export)\s*(?:[\w*${},\s]+?\s*from\s*)?(["'])([@\w./-]+)\1|\bimport\(\s*(["'])([^"']+)\3\s*\)/g;
  for (const m of code.matchAll(re)) out.add(m[2] ?? m[4]);
  return [...out].sort();
}
