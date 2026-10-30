// Builds the Vue host fixture from the published packages, not the workspace
// (plan v10 Phase 1 step 4). A temp project gets the staged tarballs, vue,
// pinia and three through tools/publish/install.mjs; the app and the design
// bundle from out/design/<id> are copied in, vite builds it, and the result
// lands in out/fixtures/vue-host/ for tools/fixtures/serve.mjs.
// Needs npm run build:lib, npm run pack:lib and npm run build:design -- designs/toggle first.
// Run: node tools/fixtures/vue-host/build.mjs [designId]

import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ROOT } from "../../lib/outputs.mjs";
import { installConsumer } from "../../publish/install.mjs";

const id = process.argv[2] ?? "toggle";
const src = dirname(fileURLToPath(import.meta.url));
const design = join(ROOT, "out", "design", id);
if (!existsSync(join(design, "design.json"))) throw new Error(`out/design/${id} is missing. run npm run build:design -- designs/${id} first.`);
const meta = JSON.parse(readFileSync(join(design, "design.json"), "utf8"));

const tmp = mkdtempSync(join(tmpdir(), "hbf-vue-host-"));
try {
  const r = installConsumer(tmp, "hbf-vue-host");
  if (r.status !== 0) throw new Error(`npm install failed (exit ${r.status})\n${r.stdout}${r.stderr}`);
  const app = join(tmp, "app");
  mkdirSync(join(app, "public", "design"), { recursive: true });
  cpSync(join(src, "main.js"), join(app, "main.js"));
  cpSync(join(design, "design.js"), join(app, "design.js"));
  writeFileSync(join(app, "design-meta.js"), `export const meta = ${JSON.stringify(meta)};\n`);
  for (const f of meta.loadOrder) cpSync(join(design, f), join(app, "public", "design", f));
  const scripts = meta.loadOrder.map((f) => `<script src="./design/${f}"></script>`).join("\n");
  writeFileSync(join(app, "index.html"), `<!doctype html>\n<html lang="en">\n<head><meta charset="utf-8"><link rel="icon" href="data:,"><meta name="viewport" content="width=device-width, initial-scale=1"><title>vue host fixture</title></head>\n<body class="hb">\n<div id="root"></div>\n${scripts}\n<script type="module" src="./main.js"></script>\n</body>\n</html>\n`);
  process.env["NODE_ENV"] = "production";
  const { build } = await import("vite");
  const out = join(ROOT, "out", "fixtures", "vue-host");
  rmSync(out, { recursive: true, force: true });
  await build({
    root: app, base: "./", configFile: false, logLevel: "warn", mode: "production",
    build: { outDir: out, emptyOutDir: true, target: "es2022", minify: true, reportCompressedSize: false },
  });
  console.log(`vue host fixture: out/fixtures/vue-host (design ${id}, packages from tarballs)`);
} finally {
  if (process.env["HBF_KEEP_TMP"] === undefined) rmSync(tmp, { recursive: true, force: true });
  else console.log(`vue host fixture: kept ${tmp}`);
}
