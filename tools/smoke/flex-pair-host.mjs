// The flex-pair build host: the library build and check run behind `hbf
// part.build` (core buildPart and runAllChecks) in one node process. The
// flex-pair bake builds in its own page (D-264); the gold specs ask this
// host for the check rows of the page's state, an oracle that never reads
// the page (tools/smoke/host-build.ts).
//
// Protocol: one JSON request per stdin line, one JSON reply per stdout line.
// request  { "id": n, "blank": true }
// reply    { "id": n, "ok": true, "values": chase defaults, "slots": { slot: preview colour } }
// request  { "id": n, "params": {...} | null, "checks": true | false }
// reply    { "id": n, "ok": true, "part": Part, "meshes": { body: { positions, triangles } }, "results": CheckResult[], "buildHash": "..." }
//          { "id": n, "ok": false, "error": "..." }
// The first line written is { "ready": true } once the design is loaded.
// SOURCE_DATE_EPOCH is pinned to 315532800 so build hashes match the goldens.

import { register } from "node:module";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.env["SOURCE_DATE_EPOCH"] = "315532800";
register(pathToFileURL(path.join(ROOT, "core/dist/resolve-hook.js")).href, import.meta.url);

const { buildPart, defaultsOf, loadDesign, resolveParams } = await import(pathToFileURL(path.join(ROOT, "core/dist/commands/build.js")).href);
const { runAllChecks } = await import(pathToFileURL(path.join(ROOT, "core/dist/commands/check-run.js")).href);

// argv[2] names another design folder (the gold specs pass the bench's own); flex-pair by default.
const design = await loadDesign(process.argv[2] ?? "reference/keys/flex-pair", ROOT);
const out = (o) => process.stdout.write(`${JSON.stringify(o)}\n`);

async function serve(req) {
  if (req.blank === true) {
    const slots = Object.fromEntries(design.chase.materials.flatMap((m) => (m.preview === undefined ? [] : [[m.slot, m.preview]])));
    return { values: defaultsOf(design.chase), slots };
  }
  const built = await buildPart(design, resolveParams(design.chase, req.params ?? undefined, undefined));
  const meshes = {};
  for (const b of built.meshed.bodies) meshes[b.id] = { positions: Array.from(b.mesh.positions), triangles: Array.from(b.mesh.triangles) };
  const results = req.checks ? (await runAllChecks(built, [], undefined)).results : [];
  return { part: built.part, meshes, results, buildHash: built.part.buildHash };
}

let chain = Promise.resolve();
const rl = readline.createInterface({ input: process.stdin });
rl.on("line", (line) => {
  if (line.trim() === "") return;
  chain = chain.then(async () => {
    let req = { id: -1 };
    try {
      req = JSON.parse(line);
      out({ id: req.id, ok: true, ...(await serve(req)) });
    } catch (e) {
      out({ id: req.id, ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  });
});
out({ ready: true });
