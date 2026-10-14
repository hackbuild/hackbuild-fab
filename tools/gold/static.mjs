#!/usr/bin/env node
// The static half of the gold suite (TESTING.md 8.5 harness `static`):
// CHK-LNT-06 for G-37, no alert(), confirm() or prompt() in bench code
// (CHECKS.md CHK-LNT-06). It reads what ships: every baked page in
// dist/bench (bench id from the file name) and every dist/legacy page
// whose sha256 a BenchHook adapter names (bench id from the adapter).
// Writes out/lint/gold-static.json; exits 0 (the report grades the rows).
// Usage: node tools/gold/static.mjs [--root <dir>]

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const i = process.argv.indexOf("--root");
const root = path.resolve(i < 0 ? REPO : process.argv[i + 1] ?? REPO);
const CALL = /\b(?:window\.|globalThis\.)?(alert|confirm|prompt)\s*\(/g;

const html = (dir) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".html")).sort().map((f) => path.join(dir, f)) : []);
const adapters = new Map();
const src = readFileSync(path.join(REPO, "tools/hook/legacy-adapters.ts"), "utf8");
for (const m of src.matchAll(/id: "([a-z0-9-]+)",\s*sha256: "([0-9a-f]{64})"/g)) adapters.set(m[2], m[1]);

export function lint(text) {
  const hits = [];
  for (const m of text.matchAll(CALL)) {
    const line = text.slice(0, m.index).split("\n").length;
    hits.push(`${m[1]}() at line ${line}`);
  }
  return hits;
}

const benches = {};
for (const f of html(path.join(root, "dist/bench"))) benches[path.basename(f, ".html")] = f;
for (const f of html(path.join(root, "dist/legacy"))) {
  const id = adapters.get(createHash("sha256").update(readFileSync(f)).digest("hex"));
  if (id !== undefined) benches[id] = f;
}
const out = { about: "CHK-LNT-06 over each baked page, tools/gold/static.mjs", benches: {} };
for (const [id, f] of Object.entries(benches)) {
  const hits = lint(readFileSync(f, "utf8"));
  out.benches[id] = [{ id: "G-37", check: "CHK-LNT-06", file: path.relative(root, f), result: hits.length === 0 ? "pass" : "fail", ...(hits.length === 0 ? {} : { message: `CHK-LNT-06: ${hits.slice(0, 5).join(", ")}` }) }];
}
mkdirSync(path.join(root, "out/lint"), { recursive: true });
writeFileSync(path.join(root, "out/lint/gold-static.json"), `${JSON.stringify(out, null, 1)}\n`);
for (const [id, rows] of Object.entries(out.benches)) console.log(`static ${id} CHK-LNT-06 ${rows[0].result}${rows[0].message ? `: ${rows[0].message}` : ""}`);
