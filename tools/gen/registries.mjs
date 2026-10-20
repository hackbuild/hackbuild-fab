#!/usr/bin/env node
// Gathers per-entry fragment files into the registry files consumers read,
// so no two builders edit one file. Each module in tools/gen/registries/
// (*.mjs, run in file name order) exports name and outputs(root), which
// returns [{ path, text }] with path relative to root. A path has one owner:
// two modules writing it is an error. Gathered files are never edited by
// hand; add a fragment and run this.
//
//   node tools/gen/registries.mjs                write every stale output
//   node tools/gen/registries.mjs --check        exit 1 naming each stale output and its fix
//   --only=<name>                                run one module
//   --root=<dir>                                 run against another checkout (tests use a temp root)
//
// Exit 0 fresh or written, 1 stale under --check, 2 a usage or module
// contract error.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { generatorFiles } from "./lib.mjs";

const args = process.argv.slice(2);
const flag = (k) => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const check = args.includes("--check");
const only = flag("only");
const root = resolve(flag("root") ?? join(fileURLToPath(import.meta.url), "..", "..", ".."));
const unknown = args.filter((a) => a !== "--check" && !/^--(only|root)=./.test(a));

function fail(message) {
  console.error(`registries: ${message}`);
  process.exit(2);
}

if (unknown.length) fail(`unknown argument ${unknown.join(" ")}. use --check, --only=<name>, --root=<dir>`);

const dir = join(root, "tools", "gen", "registries");
if (!existsSync(dir)) fail(`no generator directory at ${dir}`);

const modules = [];
for (const file of generatorFiles(readdirSync(dir))) {
  const mod = await import(pathToFileURL(join(dir, file)).href);
  if (typeof mod.name !== "string" || !/^[a-z0-9-]+$/.test(mod.name)) fail(`${file} exports no name of lowercase letters, digits and hyphens`);
  if (typeof mod.outputs !== "function") fail(`${file} exports no outputs(root) function`);
  if (modules.some((m) => m.name === mod.name)) fail(`${file} reuses the name ${mod.name}`);
  modules.push({ name: mod.name, file, outputs: mod.outputs });
}

const run = only === undefined ? modules : modules.filter((m) => m.name === only);
if (only !== undefined && run.length === 0) fail(`no generator named ${only}. known: ${modules.map((m) => m.name).join(", ") || "none"}`);

const owner = new Map();
const stale = [];
let written = 0;
for (const m of run) {
  const outs = await m.outputs(root);
  if (!Array.isArray(outs)) fail(`${m.file} outputs(root) returned no array`);
  for (const o of outs) {
    if (typeof o?.path !== "string" || typeof o.text !== "string") fail(`${m.file} returned an output without a string path and text`);
    const rel = normalize(o.path).split(sep).join("/");
    if (isAbsolute(o.path) || rel.startsWith("../") || rel === "..") fail(`${m.file} writes ${o.path}, outside the root`);
    if (owner.has(rel)) fail(`${rel} is written by both ${owner.get(rel)} and ${m.name}`);
    owner.set(rel, m.name);
    const abs = join(root, rel);
    const fresh = existsSync(abs) && readFileSync(abs).equals(Buffer.from(o.text, "utf8"));
    if (fresh) continue;
    if (check) {
      stale.push(`stale: ${rel}. run node tools/gen/registries.mjs --only=${m.name}`);
    } else {
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, o.text);
      console.log(`wrote ${rel}`);
      written++;
    }
  }
}

if (stale.length) {
  for (const line of stale) console.error(line);
  process.exit(1);
}
console.log(`${run.length} generators, ${owner.size} outputs, ${check ? "all fresh" : `${written} written`}`);
