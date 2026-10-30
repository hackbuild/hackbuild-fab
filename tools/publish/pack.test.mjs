// npm run test:pack: the staged tarballs install and work in a fresh project
// (plan v10 3.5, Phase 1 step 4). Needs npm run pack:lib first and network
// for vue, pinia, three and their dependencies.
//
// In a temp dir with its own package.json, the four tarballs, the vendored
// hackbuild-ui tarball and the exact peer versions the repo pins are
// installed. Then:
//   1. every installed file imports only what resolves from its own folder,
//      and no import names a private @hackbuild package
//   2. each package imports in node
//   3. attw --pack and publint pass on each tarball
//   4. a consumer .ts file importing each package's public types has no tsc
//      error under moduleResolution bundler and node16, TypeScript 7 and 6,
//      with skipLibCheck off so the bundled d.ts files are checked
//   5. a minimal app that calls createBench and mount builds with Vite and
//      its bundle holds no import of a private @hackbuild package
// A failure line names the package and the unresolved import.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { after, before, describe, it } from "node:test";
import { PACKAGES, ROOT } from "../lib/outputs.mjs";
import { installConsumer, PUBLISH, tarballs } from "./install.mjs";
import { importSpecifiers, isBare, looseSpecifiers, packageName } from "./imports.mjs";

const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
const bin = (name) => join(ROOT, "node_modules", ".bin", name);

const published = new Set(PACKAGES.map((p) => p.name));

let tmp = "";
const installed = (short) => join(tmp, "node_modules", "@hackbuild", short);
const run = (cmd, args, opts = {}) => spawnSync(cmd, args, { cwd: tmp, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, ...opts });

/** Does `spec` resolve from a file in `dir` by walking node_modules folders up to the project? */
function resolves(dir, spec) {
  const name = packageName(spec);
  for (let d = dir; d.startsWith(tmp); d = dirname(d)) if (existsSync(join(d, "node_modules", name, "package.json"))) return true;
  return false;
}

describe("staged tarballs install and work", () => {
  before(() => {
    tmp = mkdtempSync(join(tmpdir(), "hbf-pack-"));
    const r = installConsumer(tmp);
    assert.equal(r.status, 0, `npm install failed (exit ${r.status})\n${r.stdout}${r.stderr}`);
  });

  after(() => {
    if (tmp !== "" && process.env["HBF_KEEP_TMP"] === undefined) rmSync(tmp, { recursive: true, force: true });
    else console.log(`test:pack: kept ${tmp}`);
  });

  it("1. every installed import resolves and none names a private @hackbuild package", () => {
    const problems = [];
    for (const p of PACKAGES) {
      const root = installed(p.short);
      const dist = join(root, "dist");
      for (const file of walk(dist)) {
        const rel = relative(root, file);
        const text = readFileSync(file, "utf8");
        let specs;
        if (/\.d\.ts$|\/esm\/.*\.js$/.test(file)) specs = importSpecifiers(text);
        else if (/\/(?:cdn|iife)\/[^/]+\.js$/.test(file)) specs = looseSpecifiers(text);
        else continue;
        for (const spec of specs) {
          if (!isBare(spec)) {
            if (!existsSync(join(dirname(file), spec)) && !/\.d\.ts$/.test(file)) problems.push(`${p.name}: ${rel} imports ${spec}, a file the package does not hold`);
            continue;
          }
          const name = packageName(spec);
          if (name.startsWith("@hackbuild/") && !published.has(name)) problems.push(`${p.name}: ${rel} imports ${spec}, a private workspace package`);
          else if (!resolves(dirname(file), spec)) problems.push(`${p.name}: ${rel} imports ${spec}, which is not installed`);
        }
      }
    }
    assert.deepEqual(problems, []);
  });

  it("2. each package imports in node", () => {
    const problems = [];
    for (const p of PACKAGES) {
      const r = run(process.execPath, ["--input-type=module", "-e", `await import(${JSON.stringify(p.name)})`]);
      if (r.status === 0) continue;
      const missing = /Cannot find (?:package|module) '([^']+)'/.exec(r.stderr)?.[1];
      problems.push(`${p.name}: import failed${missing === undefined ? "" : `, unresolved import ${missing}`}: ${r.stderr.trim().split("\n").find((l) => /Error/.test(l)) ?? r.stderr.trim().slice(0, 200)}`);
    }
    assert.deepEqual(problems, []);
  });

  it("3. attw and publint pass on each tarball", async () => {
    const { publint } = await import("publint");
    const problems = [];
    for (const t of tarballs()) {
      const pkg = readJson(join(installed(t.short), "package.json"));
      // style.css and any other non-js export is a stylesheet, not a module entry point.
      const skip = Object.entries(pkg.exports).filter(([, v]) => typeof v === "string" && !v.endsWith(".js")).map(([k]) => k.replace(/^\.\//, ""));
      const attw = run(bin("attw"), [t.file, "--profile", "esm-only", "--format", "table-flipped", "--no-color", ...(skip.length > 0 ? ["--exclude-entrypoints", ...skip] : [])]);
      if (attw.status !== 0) problems.push(`${t.name}: attw exit ${attw.status}\n${attw.stdout}${attw.stderr}`);
      const buf = readFileSync(t.file);
      const result = await publint({ pack: { tarball: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) }, level: "suggestion" });
      for (const m of result.messages) problems.push(`${t.name}: publint ${m.type} ${m.code} at ${m.path.join(".")}`);
    }
    assert.deepEqual(problems, []);
  });

  it("4. a consumer .ts file typechecks under bundler and node16, TypeScript 7 and 6", () => {
    writeFileSync(
      join(tmp, "types.ts"),
      [
        'import type { Bench, Chase, Part } from "@hackbuild/spec";',
        'import { HB_VIEWER_TAG, type HbViewer, type ViewPart } from "@hackbuild/viewer";',
        'import { bindChase, type BenchCore, type ChaseBinding } from "@hackbuild/bench-core";',
        'import { BenchShell, createBench, useShell, type BenchController, type BenchReport, type CreateBenchOptions, type Values } from "@hackbuild/bench";',
        "",
        "export const tag: string = HB_VIEWER_TAG;",
        "export function make(chase: Chase, bench: Bench): BenchController {",
        "  const options: CreateBenchOptions = { chase, bench, stage: false };",
        "  return createBench(options);",
        "}",
        "export type Core = BenchCore<Values, ViewPart, BenchReport>;",
        "export type Binding = ChaseBinding<BenchReport>;",
        "export const bind = bindChase;",
        "export const shell = BenchShell;",
        "export const store = useShell;",
        "export type Elem = HbViewer;",
        "export type Whole = Part;",
        "",
      ].join("\n"),
    );
    const problems = [];
    for (const resolution of ["bundler", "node16"]) {
      const config = { compilerOptions: { noEmit: true, strict: true, skipLibCheck: false, target: "ES2022", lib: ["ES2022", "DOM", "DOM.Iterable"], types: [], module: resolution === "bundler" ? "esnext" : "node16", moduleResolution: resolution }, files: ["types.ts"] };
      writeFileSync(join(tmp, `tsconfig.${resolution}.json`), JSON.stringify(config, null, 2));
      for (const tsc of ["tsc", "tsc6"]) {
        const r = run(bin(tsc), ["-p", `tsconfig.${resolution}.json`]);
        if (r.status !== 0) problems.push(`${tsc} ${resolution}:\n${r.stdout}${r.stderr}`.trim());
      }
    }
    assert.deepEqual(problems, []);
  });

  it("5. a minimal app with createBench and mount builds and bundles no private @hackbuild package", async () => {
    const app = join(tmp, "app");
    mkdirSync(app, { recursive: true });
    for (const f of ["chase.ts", "bench.ts", "contact.ts"]) copyFileSync(join(ROOT, "designs/toggle", f), join(app, f));
    writeFileSync(join(app, "index.html"), '<!doctype html>\n<html lang="en">\n<head><meta charset="utf-8"><title>pack consumer</title></head>\n<body class="hb">\n<div id="app"></div>\n<script type="module" src="./main.ts"></script>\n</body>\n</html>\n');
    writeFileSync(
      join(app, "main.ts"),
      [
        'import { createBench } from "@hackbuild/bench";',
        'import "@hackbuild/bench/style.css";',
        'import { bench } from "./bench";',
        'import { chase } from "./chase";',
        'import { contact } from "./contact";',
        "",
        "const controller = createBench({ chase, bench, contact, stage: false });",
        'controller.mount(document.getElementById("app") as HTMLElement);',
        "",
      ].join("\n"),
    );
    process.env["NODE_ENV"] = "production";
    const { build } = await import("vite");
    const out = await build({
      root: app,
      configFile: false,
      logLevel: "warn",
      mode: "production",
      build: { outDir: join(app, "dist"), emptyOutDir: true, target: "es2022", minify: true, reportCompressedSize: false },
    });
    const outputs = (Array.isArray(out) ? out : [out]).flatMap((o) => o.output);
    const chunks = outputs.filter((o) => o.type === "chunk");
    assert.ok(chunks.length > 0, "the app build wrote no javascript");
    const problems = [];
    for (const c of chunks) {
      for (const spec of looseSpecifiers(c.code)) if (spec.startsWith("@hackbuild/")) problems.push(`app bundle ${c.fileName} imports ${spec}`);
      for (const id of c.moduleIds) if (/[\\/]packages[\\/](?:geom|chase|catalog|inlay|mesh|profile)[\\/]/.test(id)) problems.push(`app bundle holds the workspace file ${id}`);
    }
    assert.deepEqual(problems, []);
  });
});
