// Source scanning shared by tools/tiers.mjs and tools/extract-check.mjs:
// the source walk, the import specifier patterns and comment blanking.
import fs from 'node:fs';
import path from 'node:path';

export const SOURCE = /\.(?:[cm]?[jt]sx?|vue)$/;
export function walk(dir, out = [], skip = new Set()) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === 'dist' || skip.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (SOURCE.test(e.name)) out.push(p);
  }
  return out;
}

const SPECIFIER = [
  /\bimport\s+(?:type\s+)?[^'"`;]*?\bfrom\s*['"]([^'"]+)['"]/g,
  /\bexport\s+(?:type\s+)?[^'"`;]*?\bfrom\s*['"]([^'"]+)['"]/g,
  /\bimport\s*['"]([^'"]+)['"]/g,
  /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
];
export function specifiers(text) {
  const out = new Set();
  for (const re of SPECIFIER) for (const m of text.matchAll(re)) out.add(m[1]);
  return [...out];
}
// import( calls whose argument is not one quoted literal: a computed
// specifier reaches modules the edge list cannot see. The calls are found
// in bare text, so prose inside a string or a comment ("may not import
// (tools/tiers.json)") is never a call; bare keeps every offset, and the
// argument is read from the source between the call's parentheses.
export function computedImports(text) {
  const out = [];
  const b = bare(text);
  for (const m of b.matchAll(/(?<![\w$.])import\s*\(/g)) {
    const start = m.index + m[0].length;
    let depth = 1;
    let end = start;
    while (end < b.length && depth > 0) {
      if (b[end] === '(') depth++;
      else if (b[end] === ')') depth--;
      if (depth > 0) end++;
    }
    const arg = text.slice(start, end).trim();
    if (!/^(['"])[^'"`$\\]+\1$/.test(arg)) out.push(arg);
  }
  return out;
}
// The quoted relative path of every new URL('../...', ...) in the source,
// comments blanked; the caller resolves it against the file to see whether
// it leaves the workspace.
export function urlPaths(text) {
  const out = [];
  for (const m of code(text).matchAll(/\bnew\s+URL\(\s*(['"`])(\.{1,2}\/[^'"`]*)\1/g)) out.push(m[2]);
  return out;
}
// Source text with // and /* */ comments blanked, so prose such as "the
// design document. A chase" never reads as DOM use. Quoted strings and
// template literals are kept whole.
export function code(text) {
  let out = '';
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    const n = text[i + 1];
    if (c === '/' && n === '/') {
      while (i < text.length && text[i] !== '\n') i++;
    } else if (c === '/' && n === '*') {
      const end = text.indexOf('*/', i + 2);
      const stop = end === -1 ? text.length : end + 2;
      out += text.slice(i, stop).replace(/[^\n]/g, ' ');
      i = stop;
    } else if (c === "'" || c === '"' || c === '`') {
      let j = i + 1;
      while (j < text.length && text[j] !== c) j += text[j] === '\\' ? 2 : 1;
      out += text.slice(i, j + 1);
      i = j + 1;
    } else {
      out += c;
      i++;
    }
  }
  return out;
}
// Source text with comments and the contents of quoted strings and template
// literals blanked (the quotes kept), so only code is left: a name inside a
// test title or an error message never reads as a call or an identifier.
// Blanking keeps the length, so an offset in bare text is one in the source.
export function bare(text) {
  let out = '';
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    const n = text[i + 1];
    if (c === '/' && n === '/') {
      while (i < text.length && text[i] !== '\n') {
        out += ' ';
        i++;
      }
    } else if (c === '/' && n === '*') {
      const end = text.indexOf('*/', i + 2);
      const stop = end === -1 ? text.length : end + 2;
      out += text.slice(i, stop).replace(/[^\n]/g, ' ');
      i = stop;
    } else if (c === "'" || c === '"' || c === '`') {
      let j = i + 1;
      while (j < text.length && text[j] !== c) j += text[j] === '\\' ? 2 : 1;
      out += c + text.slice(i + 1, j).replace(/[^\n]/g, ' ') + c;
      i = j + 1;
    } else {
      out += c;
      i++;
    }
  }
  return out;
}
