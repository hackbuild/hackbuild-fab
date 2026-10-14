// core/test/fixtures/sandbox/parent.mjs: a parent process for the orphan
// tests. It runs one sandboxed build of the fixture directory named in
// argv[2] with the wall budget argv[3] ms, prints "child <pid>" once the
// child is forked, and waits; the test then kills this process.

import { register } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CORE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
register(new URL(`file://${path.join(CORE, "dist", "resolve-hook.js")}`));
const { loadDesign, resolveParams } = await import(new URL(`file://${path.join(CORE, "dist", "commands", "build.js")}`).href);
const { runSandboxed } = await import(new URL(`file://${path.join(CORE, "dist", "sandbox.js")}`).href);

const root = path.dirname(CORE);
const design = await loadDesign(path.join(CORE, "test", "fixtures", "sandbox", process.argv[2]), root);
await runSandboxed({
  buildFile: design.buildFile, fn: design.chase.build.fn, designDir: design.dir, root,
  values: resolveParams(design.chase, undefined, undefined), chase: design.chase, tables: design.ws.tables, masks: false,
}, { wallMs: Number(process.argv[3]), onChild: (c) => process.stdout.write(`child ${c.pid}\n`) }).then(
  () => process.stdout.write("built\n"),
  (e) => process.stdout.write(`stopped ${e?.hbf?.record ?? String(e)}\n`),
);
