#!/usr/bin/env node
// Generates docs/skill/LIBRARIES.md (plan v11.1 3.6): the one reference a
// skill author reads to build a bench on the libraries without reading this
// repo. Everything in it is derived: the packages and globals from
// tools/lib/outputs.mjs, the versions from the package.json files, the SRI
// hashes from the built files, the IIFE order from the sidecars the way
// tools/bake derives it, the option and hook shapes from the built types.
//
//   node tools/skill-kit/reference.mjs            write docs/skill/LIBRARIES.md
//   node tools/skill-kit/reference.mjs --check    exit 1 when the file differs from a fresh generation
//
// Needs npm run build:lib first; a missing built file is an error that says so.

import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PACKAGES, PEER_FILES, PEER_GLOBALS, ROOT, VENDOR_THREE } from "../lib/outputs.mjs";
import { sidecarPath } from "../lib/sidecar.mjs";
import { libraryOf, libraryOrder } from "../bake/bake.mjs";
import { cdnBase, cdnUrl, familyVersion, REFERENCE_PATH, releaseFiles, tagOf, UI_CSS, UI_TOKENS } from "./family.mjs";

const read = (root, p) => {
  const f = join(root, p);
  if (!existsSync(f)) throw new Error(`${p} is missing. run npm run build:lib first.`);
  return readFileSync(f);
};
const sri = (buf) => `sha384-${createHash("sha384").update(buf).digest("base64")}`;
const installed = (root, name) => JSON.parse(readFileSync(join(root, "node_modules", name, "package.json"), "utf8")).version;

/** The npm ESM files an import map needs for the peers and what they import, by package. */
const NPM_ESM = {
  vue: "dist/vue.esm-browser.prod.js",
  pinia: "dist/pinia.esm-browser.js",
  three: "build/three.module.js",
  nostics: "dist/index.mjs",
  "@vue/devtools-api": "dist/vue-devtools-api.esm-browser.js",
  "manifold-3d": "manifold.js",
};
/** The classic builds of the peers an IIFE page loads from npm. */
const NPM_CLASSIC = { vue: "dist/vue.runtime.global.prod.js", pinia: "dist/pinia.iife.prod.js" };
const npmUrl = (name, version, file) => `https://cdn.jsdelivr.net/npm/${name}@${version}/${file}`;

/** The text of `export interface|type|const <name>` in a built .d.ts, with its comment, brace balanced. */
export function declOf(text, name) {
  const m = new RegExp(`(?:\\/\\*\\*(?:(?!\\*\\/)[\\s\\S])*\\*\\/\\s*)?export (?:declare )?(interface|type|const|function) ${name}\\b`).exec(text);
  if (m === null) throw new Error(`no declaration ${name} in the built types`);
  let depth = 0;
  let i = m.index + m[0].length;
  for (; i < text.length; i++) {
    const c = text[i];
    if (c === "{" || c === "(" || c === "[") depth++;
    else if (c === "}" || c === ")" || c === "]") {
      depth--;
      if (depth === 0 && c === "}" && m[1] === "interface") { i++; break; }
    } else if (c === ";" && depth === 0) { i++; break; }
  }
  return text.slice(m.index, i).trim();
}

/** The members of an interface body as { name, decl, doc }; a nested object member is flattened to `outer.inner`. */
export function membersOf(body, prefix = "") {
  const out = [];
  let doc = "";
  for (let i = 0; i < body.length;) {
    const ws = /^\s+/.exec(body.slice(i));
    if (ws !== null) { i += ws[0].length; continue; }
    if (body.startsWith("/**", i)) {
      const end = body.indexOf("*/", i);
      doc = body.slice(i + 3, end).split("\n").map((l) => l.replace(/^\s*\*\s?/, "")).join("\n").trim();
      i = end + 2;
      continue;
    }
    let depth = 0, j = i;
    for (; j < body.length; j++) {
      const c = body[j];
      if ("({[".includes(c)) depth++;
      else if (")}]".includes(c)) depth--;
      else if (c === ";" && depth === 0) break;
    }
    const decl = body.slice(i, j).trim();
    i = j + 1;
    const nested = /^(?:readonly )?(\w+): \{([\s\S]*)\}$/.exec(decl);
    if (nested !== null) out.push(...membersOf(nested[2], `${prefix}${nested[1]}.`));
    else out.push({ name: prefix + /^(?:readonly )?(\w+)/.exec(decl)[1], decl, doc });
    doc = "";
  }
  return out;
}

/** The members of `export interface <name>` in a built .d.ts. */
export function interfaceMembers(text, name) {
  const m = new RegExp(`export interface ${name}\\b[^{]*\\{`).exec(text);
  if (m === null) throw new Error(`no interface ${name} in the built types`);
  let depth = 1, i = m.index + m[0].length;
  const start = i;
  for (; i < text.length && depth > 0; i++) depth += text[i] === "{" ? 1 : text[i] === "}" ? -1 : 0;
  return membersOf(text.slice(start, i - 1));
}

function fence(lang, body) {
  return `\`\`\`${lang}\n${body.replace(/\n+$/, "")}\n\`\`\`\n`;
}

/** Load order of the classic scripts for a page that reads @hackbuild/bench, from the sidecars. */
export function iifeOrder(root, entries = ["@hackbuild/bench"]) {
  const reads = new Map();
  for (const p of PACKAGES) reads.set(p.name, JSON.parse(read(root, sidecarPath(`${p.dir}/dist/iife/${p.short}.js`)).toString()).reads);
  return libraryOrder(entries, (lib) => reads.get(lib) ?? []);
}

export async function generate(root = ROOT) {
  const version = familyVersion(root);
  const tag = tagOf(version);
  const files = releaseFiles().map((f) => ({ ...f, url: cdnUrl(version, f.path), sri: sri(read(root, f.from)) }));
  const byPath = new Map(files.map((f) => [f.path, f]));
  const pkgOf = (name) => PACKAGES.find((p) => p.name === name);
  const vers = Object.fromEntries(Object.keys(NPM_ESM).map((n) => [n, installed(root, n)]));
  const esmSri = (n) => sri(read(root, `node_modules/${n}/${NPM_ESM[n]}`));
  const classicSri = (n) => sri(read(root, `node_modules/${n}/${NPM_CLASSIC[n]}`));

  // ---- import map
  const imports = {
    vue: npmUrl("vue", vers["vue"], NPM_ESM["vue"]),
    pinia: npmUrl("pinia", vers["pinia"], NPM_ESM["pinia"]),
    three: npmUrl("three", vers["three"], NPM_ESM["three"]),
    nostics: npmUrl("nostics", vers["nostics"], NPM_ESM["nostics"]),
    "@vue/devtools-api": npmUrl("@vue/devtools-api", vers["@vue/devtools-api"], NPM_ESM["@vue/devtools-api"]),
    "manifold-3d": npmUrl("manifold-3d", vers["manifold-3d"], NPM_ESM["manifold-3d"]),
    ...Object.fromEntries(PACKAGES.map((p) => [p.name, byPath.get(`${p.dir}/dist/cdn/${p.short}.js`).url])),
  };
  const integrity = {
    [imports["vue"]]: esmSri("vue"), [imports["pinia"]]: esmSri("pinia"), [imports["three"]]: esmSri("three"),
    [imports["nostics"]]: esmSri("nostics"), [imports["@vue/devtools-api"]]: esmSri("@vue/devtools-api"), [imports["manifold-3d"]]: esmSri("manifold-3d"),
    ...Object.fromEntries(PACKAGES.map((p) => [imports[p.name], byPath.get(`${p.dir}/dist/cdn/${p.short}.js`).sri])),
  };
  const importMap = JSON.stringify({ imports, integrity }, null, 2);
  const cssUi = byPath.get(UI_CSS.path), cssBench = byPath.get("packages/bench/dist/style.css");
  const links = [
    `<link rel="stylesheet" href="${cssUi.url}" integrity="${cssUi.sri}" crossorigin="anonymous">`,
    `<link rel="stylesheet" href="${cssBench.url}" integrity="${cssBench.sri}" crossorigin="anonymous">`,
  ].join("\n");

  // ---- iife
  const order = iifeOrder(root);
  const globalOf = (lib) => PEER_GLOBALS[lib] ?? pkgOf(lib).global;
  const scriptOf = (lib) => {
    if (lib in NPM_CLASSIC) return { url: npmUrl(lib, vers[lib], NPM_CLASSIC[lib]), sri: classicSri(lib) };
    if (lib === "three") { const f = byPath.get(VENDOR_THREE); return { url: f.url, sri: f.sri }; }
    const f = byPath.get(`${pkgOf(lib).dir}/dist/iife/${pkgOf(lib).short}.js`);
    return { url: f.url, sri: f.sri };
  };
  const scripts = order.map((lib) => ({ lib, global: globalOf(lib), ...scriptOf(lib) }));
  const scriptTags = scripts.map((s) => `<script src="${s.url}" integrity="${s.sri}" crossorigin="anonymous"></script>`).join("\n");

  // ---- types
  const benchTypes = read(root, "packages/bench/dist/types/bench/entry.d.ts").toString();
  const hookTypes = read(root, "spec/dist/hook.d.ts").toString();
  const artTypes = read(root, "spec/dist/art.d.ts").toString();
  const checkTypes = read(root, "packages/bench-core/dist/export/selfcheck.d.ts").toString();
  const art = await import(pathToFileURL(join(root, "spec/dist/art.js")).href);

  const page = (body) => body;
  const chase = `const chase = defineChase({
  meta: { id: "plate", kind: "single", name: "PLATE", version: 1, chase: 2, kernels: ["geom", "mesh", "inlay", "3mf"], machines: ["ffc5p"], license: "CC-BY-SA-4.0" },
  materials: [
    { slot: 1, material: "petg", role: "body", label: "black", preview: "#1A1A1A" },
    { slot: 2, material: "petg", role: "art", label: "pink", preview: "#FE0386" },
  ],
  params: [
    { id: "plate", label: "PLATE", live: "commit", fields: [{ id: "thk", type: "mm", label: "thickness", range: [2.41, 6.01], step: 0.24, default: 3.61 }] },
    { id: "face", label: "FACE ART", live: "commit", fields: [{ id: "art", type: "art", label: "layers", accepts: ["layers", "svg"], frame: [100, 64] }] },
  ],
  build: { module: "./build.ts", fn: "build" },
  exports: [{ kind: "json" }],
  assertions: [],
});
const bench = defineBench(chase, {
  shell: "paper",
  views: { default: "assembled", modes: ["assembled"], render: ["solid"], overlays: ["busy", "welcome"], cams: ["iso", "top"], stage: "graph" },
  rail: [
    { step: "art", goal: "lay text, shapes and marks on the faces.", panels: ["params.face"], focus: "art" },
    { step: "print", goal: "save the design file.", panels: ["exports"], focus: "export" },
  ],
  welcome: { tagline: "a plate with art", presets: [], starts: [] },
  status: ["build.hash"],
});`;
  const cdnPage = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>plate bench</title>
${links}
<script type="importmap">
${importMap}
</script>
</head>
<body class="hb">
<div id="app"></div>
<script type="module">
import { defineBench, defineChase } from "@hackbuild/spec";
import { createBench } from "@hackbuild/bench";
${chase}
createBench({ chase, bench, hook: true }).mount(document.getElementById("app"));
</script>
</body>
</html>`;
  const iifePage = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>plate bench</title>
${links}
</head>
<body class="hb">
<div id="app"></div>
${scriptTags}
<script>
const { defineBench, defineChase } = HackbuildSpec;
const { createBench } = HackbuildBench;
${chase}
createBench({ chase, bench, hook: true }).mount(document.getElementById("app"));
</script>
</body>
</html>`;

  // ---- engine and author types
  const engineFacts = read(root, "packages/engine/dist/facts.d.ts").toString();
  const pageTypes = read(root, "packages/pipeline/dist/page.d.ts").toString();
  const buildTypes = read(root, "spec/dist/build.d.ts").toString();
  const chaseTypes = read(root, "spec/dist/chase.d.ts").toString();
  const authorCalls = interfaceMembers(buildTypes, "Author");
  const buildOrder = iifeOrder(root, ["@hackbuild/bench", "@hackbuild/engine"]);
  const worked = (id) => ["chase", "build"].map((f) => `// reference/cosmetic/${id}/${f}.ts\n${readFileSync(join(root, `reference/cosmetic/${id}/${f}.ts`), "utf8").replace(/^\/\/ reference\/cosmetic\/[^\n]*\n/, "")}`);
  const buildScript = `import { defineBench, defineBuild, defineChase } from "@hackbuild/spec";
import { createPageBuild, factsFor } from "@hackbuild/engine";
import { createBench, pageBench } from "@hackbuild/bench";

const chase = defineChase({ /* declarations only: meta, materials, params, build, exports */ });
const bench = defineBench(chase, { /* the rail steps and panels */ });
const build = defineBuild(chase, (p, k) => {
  /* geometry from the params p, written with the author calls k */
  return k.part({ /* id, name, process, machine, bodies, features */ });
});

// the engine hashes the text of this script into defHash, so an edit moves the build hash
const source = document.querySelector("script[data-hbf-page]").textContent;
const page = createPageBuild({ chase, module: { build }, facts: factsFor(chase, source) });
createBench({ chase, bench, ...pageBench(page), hook: true, offline: { inline: true } }).mount(document.getElementById("app"));`;

  const out = [];
  const h = (s) => out.push(s);
  h(`# hackbuild bench libraries ${version}

Generated by tools/skill-kit/reference.mjs from the built files and types. Do not edit by hand; \`npm run skill:reference\` rewrites it and a test fails when it is stale. Release tag \`${tag}\`, base \`${cdnBase(version)}\`.

A bench page loads these libraries and writes only what belongs to its design: its chase, its bench declaration, its build. It carries no mesh kernel, no 3MF writer and no bench shell of its own. \`node tools/skill-kit/check-page.mjs <page.html>\` refuses a page that does.
`);
  h(`## Packages and versions

One family version, ${version}, set in each published package.json. Every url below carries it.

| package | version | iife global | peers |
|---|---|---|---|`);
  for (const p of PACKAGES) h(`| \`${p.name}\` | ${version} | \`${p.global}\` | ${p.peers.length === 0 ? "none" : p.peers.map((x) => `\`${x}\``).join(", ")} |`);
  h(`
Peer versions this release was built against (installed, computed): ${Object.entries(vers).map(([n, v]) => `${n} ${v}`).join(", ")}.
`);
  h(`## Files, urls and integrity

Every url is versioned and has an sha384 integrity value. Nothing points at a moving tag.

| file | url | integrity |
|---|---|---|`);
  for (const f of files) h(`| \`${f.path}\` | ${f.url} | \`${f.sri}\` |`);
  h(`
The stylesheet \`${UI_CSS.path}\` is the installed \`@virgilvox/hackbuild-ui\` 0.3.0 file, which is not on npm yet. It names no font files; a page that wants the five faces loads them itself. \`style.css\` of the bench package holds the shell's own rules.
`);
  h(`## Import map for the cdn files

\`dist/cdn/<short>.js\` is one ES module per package with bare \`vue\`, \`pinia\` and \`three\` imports. Put this import map before any module script. \`nostics\` and \`@vue/devtools-api\` are imports of pinia's browser build.

${fence("json", importMap)}`);
  h(`## Classic scripts (IIFE) load order and globals

A page that must open from file:// or in a browser without module support loads classic scripts. The order is derived from what each script reads (sidecar \`reads\`), ties broken by the peer and package order, the way tools/bake derives it. Each script sets one global and reads the earlier ones from theirs.

| order | library | global | url |
|---|---|---|---|`);
  scripts.forEach((s, i) => h(`| ${i + 1} | \`${s.lib}\` | \`${s.global}\` | ${s.url} |`));
  h(`
Each IIFE has a sidecar \`<short>.sources.json\` beside it with the sha256 of the script text and the bare imports it reads. A bake inlines the script under a banner comment \`/* <name> <version>, iife build, global <Global> */\`; \`check-page\` reads that banner and the sidecar sha256.

A page opened over http can call the shell's "save offline" action (print panel): it fetches these classic scripts and writes one file that opens from file:// with no network.
`);
  h(`## The engine

\`@hackbuild/engine\` is the build half of a bench. It carries the kernel a page runs: geom, mesh, inlay, the checks, the profile data and the 3MF writer. A page that loads it writes a chase and a build function and gets geometry, check results and 3MF, STL and card exports, with no bake step and no mesh kernel of its own.

\`createPageBuild({ chase, module, facts })\` returns a page build. \`module\` is an object holding the build function under the name \`chase.build.fn\` names. \`pageBench(page)\` from \`@hackbuild/bench\` turns the page build into the \`build\` and \`writers\` options of \`createBench\`.

${fence("ts", [declOf(pageTypes, "PageInput"), declOf(pageTypes, "PageBuild"), declOf(pageTypes, "PageResult")].join("\n\n"))}
\`factsFor(chase, source)\` computes in the page what tools/bake/design-facts.mjs computes in node: the profile tables, the check seed, the kernel and manifold versions, the constraint versions, the epoch (315532800 unless given) and a defHash. Every field but defHash is equal to the bake's for a design without draft kinds. defHash covers the chase and the sha256 of the source text the page passes, where the bake hashes the design's files on disk, so a page's build hash differs from the golden of the same design. Mesh hashes and volumes are equal. When a page passes the files core's source closure names (\`{ "build.ts": text, "chase.ts": text }\`) defHash is equal too. A chase that names a machine or material the profile lacks is refused with E_REF and the closest id.

${fence("ts", [declOf(engineFacts, "FactsOptions"), declOf(engineFacts, "PageSource"), declOf(engineFacts, "factsFor")].join("\n\n"))}
\`defaultKinds\` is the feature kinds a chase gets from the kernels it lists in \`meta.kernels\` (\`kernelKindsOf(chase.meta.kernels)\`): ${"`"}${Object.keys((await import(pathToFileURL(join(root, "packages/pipeline/dist/kinds.js")).href)).PACKAGE_KINDS).sort().join("`, `")}${"`"} register kinds.

One manifold instance serves the page. \`manifold-3d\` ${installed(root, "manifold-3d")} is a peer: the import map names it (\`manifold-3d\` above) and the engine reads the wasm beside it. The classic script form carries the glue and takes the wasm bytes through \`HackbuildEngine.configureManifold({ wasmBinary })\` before the first build; "save offline" writes that call with the wasm inlined. Every library that bundles geom (bench-core does) reads one shared state on the page, so \`adoptManifold\` through one library and a build through another act on one instance.

Load order of the classic scripts for a page that builds, derived from the sidecars: ${buildOrder.map((l) => `\`${l}\``).join(", ")}.
`);
  h(`## Writing a build

A build is a function from the params to a part draft: \`defineBuild(chase, (p, k) => part)\`. \`p\` is the params object the chase declares, typed from the chase; \`k\` is the author. The function is plain data in, plain data out and runs in the page. A chase declares and never computes; conditionals and loops belong in the build.

${fence("ts", [declOf(chaseTypes, "defineBuild"), declOf(buildTypes, "BuildFn")].join("\n\n"))}
### The author calls

Every call on \`k\`, with its signature and doc comment as the types give them. \`k.ring.offset\` throws E_KERNEL in a page build, since it is not in this kernel build.

${authorCalls.map((m) => fence("ts", `${m.doc === "" ? "" : `/** ${m.doc.replace(/\n/g, "\n * ")} */\n`}k.${m.name}: ${m.decl.replace(/^(?:readonly )?\w+/, "").replace(/^: /, "")}`.replace(/^(\/\*\*[\s\S]*?\*\/\n)?k\.(\S+): ([(<])/, "$1k.$2$3"))).join("\n")}
### A page that builds

The shape of a skill page: an import map to the release urls, then one module script. tools/fixtures/skill-page/index.html in the repo is a complete page of this shape (the art-layers chase and build below).

${fence("js", buildScript)}
The script carries a \`data-hbf-page\` attribute so it can read its own text. "Save offline" rewrites the module script into a classic script that reads the libraries from their globals, inlines the wasm, and writes one file that opens from file://; the saved script keeps the attribute, and its mesh hashes equal the online page's.

### Worked build 1: coin-inlay

A 44 mm coin with two faces of art in three slots. The chase and the build, verbatim from reference/cosmetic/coin-inlay.

${worked("coin-inlay").map((t) => fence("ts", t)).join("\n")}
### Worked build 2: art-layers

A plate with all 13 layer kinds on both faces. The chase and the build, verbatim from reference/cosmetic/art-layers.

${worked("art-layers").map((t) => fence("ts", t)).join("\n")}`);
  h(`## createBench

\`createBench(options)\` from \`@hackbuild/bench\` returns a controller. \`controller.mount(el)\` draws the shell; \`controller.core\` is the headless bench core. Effects outside the mount element are opt-in and default off.

${fence("ts", [declOf(benchTypes, "BenchOptions"), declOf(benchTypes, "CreateBenchOptions"), declOf(benchTypes, "BenchWriter")].join("\n\n"))}
The \`build\` option is \`(state) => Promise<{ part: ViewPart, report, buildHash, warnings? }>\`. A page with no build opens with its rail, undo and design files working and an empty stage. A page gets its build from \`createPageBuild\` and \`factsFor\` in \`@hackbuild/engine\` (sections "The engine" and "Writing a build"), never from a mesh kernel typed into the page. A baked design page gets the same build from \`npm run build:design\` or \`hbf adopt\`.
`);
  h(`## The BENCH hook

\`createBench({ hook: true })\` defines \`BENCH\` on globalThis. A page without it is refused by check-page.

${fence("ts", declOf(hookTypes, "BenchHook"))}`);
  h(`## The art document and its layer kinds

An \`art\` param whose \`accepts\` includes \`layers\` mounts the art board: the face canvas takes the stage while the step is active, the layer list and fields stay in the rail, and a stage toggle switches between board and model. The param value is \`{ uri, kind: "layers", doc }\`; every edit writes a new uri.

- schema \`${art.ART_DOCUMENT_SCHEMA}\`, version ${art.ART_DOCUMENT_VERSION}
- faces: ${art.ART_FACES.map((f) => `\`${f}\``).join(", ")}
- layer kinds: ${art.ART_LAYER_KINDS.map((k) => `\`${k}\``).join(", ")}
- cuts: ${art.ART_CUTS.map((k) => `\`${k}\``).join(", ")}
- base layer defaults: \`${JSON.stringify(art.ART_LAYER_BASE_DEFAULTS)}\`
- kind defaults: \`${JSON.stringify(art.ART_KIND_DEFAULTS)}\`

${fence("ts", declOf(artTypes, "ArtDocument"))}`);
  h(`## Export path and self-check

The export kinds a chase declares (\`json\`, \`3mf\`, \`stl\`, \`card\`) write through \`BenchOptions.writers\`; \`pageBench(pageOf(globals.page))\` supplies the 3mf, stl and card writers of a design page build, which run the build and every check and refuse a blocking fail with the export gate's line. A fabrication export also needs the host's approval; no argument opens that gate.

Before the shell hands a 3mf to a download it runs \`assertExportable("3mf", bytes)\` from \`@hackbuild/bench-core\`. The rules, ported from tools/py/validate_3mf.py:

- \`3mf-zip\`: the package is a readable zip with at least one .model part.
- \`3mf-id\`: object ids are unique in each model part and every item and component reference resolves (CHK-3MF-06).
- \`3mf-uuid\`: every \`p:UUID\` is unique across the package.
- \`3mf-name\`: object names are non-empty, carry no unresolved token and are unique (CHK-ART-01).
- \`3mf-manifold\`: every mesh has two faces per undirected edge, one use of each directed edge and positive signed volume (CHK-PRT-01).

A failing rule refuses the download and the log names it. The same functions are exported for a page's own use:

${fence("ts", declOf(checkTypes, "SelfCheckRule"))}`);
  h(`## Minimal page, import map

Opens over http or from a host that serves modules. Loads the libraries at ${version} from jsDelivr.

${fence("html", page(cdnPage))}`);
  h(`## Minimal page, classic scripts

The same bench as classic scripts. Open it over http, then use "save offline" to get one file that opens from file://.

${fence("html", page(iifePage))}`);
  return `${out.join("\n")}\n`.replace(/\n{3,}/g, "\n\n");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const text = await generate();
  const file = join(ROOT, REFERENCE_PATH);
  if (process.argv.includes("--check")) {
    if (!existsSync(file) || readFileSync(file, "utf8") !== text) {
      console.error(`${REFERENCE_PATH} is stale. run npm run skill:reference.`);
      process.exit(1);
    }
    console.log(`${REFERENCE_PATH} is current`);
  } else {
    writeFileSync(file, text);
    console.log(`wrote ${REFERENCE_PATH}, ${text.length} bytes`);
  }
}
