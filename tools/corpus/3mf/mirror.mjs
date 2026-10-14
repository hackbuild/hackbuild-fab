// The TypeScript validator mirror over corpus rows, for tools/corpus/3mf/run.py
// (M00-T10 step 6). Reads a JSON list of rows on stdin, prints one JSON
// report per row on stdout. It imports the compiled package, so `npx tsc -b`
// runs first; run.py says so when packages/3mf/dist is missing.
//
// @hackbuild/spec ships as TypeScript source with extensionless imports, so
// the core CLI's resolve hook is registered before the package loads (Node
// 22.18 strips the types).
//
// Row: {id, file, mode, target, stlZip?, names?}. names asks for the export
// completeness rule on a slicer save, which the mirror runs only under
// --export (the TENON known-good row).

import { readFileSync } from "node:fs";
import { register } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const DIST = join(REPO, "packages/3mf/dist");
register(pathToFileURL(join(REPO, "core/dist/resolve-hook.js")).href);
const load = (p) => import(pathToFileURL(join(DIST, p)).href);

const { readEntries, validateEntries, zipMemberNames, readModels, ROOT_MODEL } = await load("index.js");
const { checkCompleteness } = await load("validate/completeness.js");
const { resultSink } = await load("validate/rules.js");

const slim = (r) => ({
  id: r.id, verdict: r.verdict, rule: r.extra?.rule ?? "", path: r.target?.path ?? "",
  ...(r.extra?.first !== undefined ? { first: String(r.extra.first) } : {}),
  ...(r.extra?.objects !== undefined ? { objects: r.extra.objects, parts: r.extra.parts } : {}),
  ...(r.extra?.stlMembers !== undefined ? { stlMembers: r.extra.stlMembers } : {}),
});

const rows = JSON.parse(readFileSync(0, "utf8"));
const out = [];
for (const row of rows) {
  try {
    const entries = await readEntries(new Uint8Array(readFileSync(row.file)));
    const stlMembers = row.stlZip ? await zipMemberNames(new Uint8Array(readFileSync(row.stlZip))) : undefined;
    const rep = validateEntries(entries, { mode: row.mode, target: row.target, artifact: row.id, ...(stlMembers ? { stlMembers } : {}) });
    const results = rep.results.map(slim);
    let names = null;
    if (row.names) {
      const sink = resultSink(row.id);
      names = slim(checkCompleteness(sink, entries, readModels(entries).get(ROOT_MODEL)));
    }
    out.push({ id: row.id, verdict: rep.verdict, results, keySet: rep.keySet, names });
  } catch (e) {
    out.push({ id: row.id, error: String(e?.message ?? e) });
  }
}
process.stdout.write(JSON.stringify(out));
