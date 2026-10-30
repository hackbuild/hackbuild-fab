// Save offline (plan v11.1 3.6): a bench page that loads the libraries from a
// CDN writes one HTML file with the classic (IIFE) builds inlined, plus the
// design's own scripts, so the file opens from file:// with no network (the
// bench law). The page is read, not parsed by a second tool: the import map
// names the libraries, each library's cdn url maps to its iife url, the
// sidecars give the load order, and the design folder's design.json gives the
// design's classic scripts and its ES module, which is rewritten into a
// classic script that reads the libraries from their globals.

export interface OfflineOptions {
  /** Folder of the design bundle (build:design output): design.json, design.js and the classic scripts it lists. */
  readonly designBase?: string;
}

export interface OfflineAvailability {
  readonly ok: boolean;
  /** Why the action is disabled; empty when it is not. */
  readonly why: string;
}

export interface OfflineDeps {
  readonly doc: Pick<Document, "querySelector" | "querySelectorAll" | "baseURI" | "title">;
  readonly protocol: string;
  readonly fetchText: (url: string) => Promise<string>;
}

/** Peer globals and classic files, as tools/lib/outputs.mjs (PEER_GLOBALS, PEER_FILES). */
const PEER_CLASSIC: Readonly<Record<string, string>> = { vue: "vue.runtime.global.prod.js", pinia: "pinia.iife.prod.js" };
const PEER_GLOBAL: Readonly<Record<string, string>> = { vue: "Vue", pinia: "Pinia", three: "THREE" };
const VENDOR_THREE = "tools/vendor/three/dist/three.js";
/** Tie order of the load order, as tools/bake RANK. */
const RANK = ["vue", "pinia", "three", "@hackbuild/spec", "@hackbuild/viewer", "@hackbuild/bench-core", "@hackbuild/bench"];
const HB_CDN = /^(.*\/)((?:spec|packages\/[^/]+)\/)dist\/cdn\/([^/]+)\.js$/;

export function offlineAvailability(deps: Pick<OfflineDeps, "doc" | "protocol">, options: OfflineOptions | null): OfflineAvailability {
  if (deps.protocol === "file:") return { ok: false, why: "this page already runs from a file and needs no network." };
  const map = deps.doc.querySelector('script[type="importmap"]');
  if (map === null || !/@hackbuild\/bench/.test(map.textContent ?? "")) return { ok: false, why: "this page does not load the libraries from a cdn, so there is nothing to fetch." };
  if (options?.designBase === undefined) return { ok: false, why: "this page names no design folder, so the design script cannot be saved." };
  return { ok: true, why: "" };
}

const abs = (u: string, base: string): string => new URL(u, base).href;
/** The family version a release url names: .../@lib-v0.1.0/... or .../@0.1.0/...; unknown otherwise. */
const versionOf = (url: string): string => /@(?:lib-v)?(\d+\.\d+\.\d+)\//.exec(url)?.[1] ?? "unknown";

interface Lib { readonly name: string; readonly url: string; readonly global: string; reads: string[] }

/** The ES module text of a design bundle as a classic script: imports of @hackbuild packages read their globals, exports land on `target`. */
export function classicDesign(esm: string, globals: Readonly<Record<string, string>>, target: string): string {
  let body = esm.replace(/^\s*import\s*(?:([\w$]+)\s*,?\s*)?(?:\*\s+as\s+([\w$]+)|\{([^}]*)\})?\s*from\s*["']([^"']+)["'];?/gm, (_all, def: string | undefined, ns: string | undefined, named: string | undefined, spec: string) => {
    const g = globals[spec];
    if (g === undefined) throw new Error(`design imports ${spec}, which has no classic global`);
    if (ns !== undefined) return `const ${ns} = ${g};`;
    if (named !== undefined) return `const { ${named.split(",").map((x) => x.trim()).filter((x) => x !== "").map((x) => x.replace(/\s+as\s+/, ": ")).join(", ")} } = ${g};`;
    return def === undefined ? "" : `const ${def} = ${g};`;
  });
  const names: string[] = [];
  body = body.replace(/^\s*export\s*\{([^}]*)\};?/gm, (_all, list: string) => {
    for (const item of list.split(",")) {
      const [local, as] = item.trim().split(/\s+as\s+/);
      if (local !== undefined && local !== "") names.push(`${as ?? local}: ${local}`);
    }
    return "";
  });
  if (/^\s*export\s/m.test(body)) throw new Error("design.js uses an export form other than export { a, b }");
  return `(function () {\n${body}\n${target} = { ${names.join(", ")} };\n})();`;
}

export interface OfflinePage {
  readonly html: string;
  readonly name: string;
  /** Urls fetched, in the order they are inlined. */
  readonly sources: readonly string[];
}

const NO_CLOSE = (text: string, what: string): string => {
  if (/<\/script/i.test(text)) throw new Error(`${what} holds a closing script tag and cannot be inlined`);
  return text;
};

/** Reads the page, fetches what it loaded in classic form and returns the one-file page. */
export async function buildOfflinePage(deps: OfflineDeps, options: OfflineOptions, page?: { readonly globalName?: string }): Promise<OfflinePage> {
  const base = deps.doc.baseURI;
  const mapEl = deps.doc.querySelector('script[type="importmap"]');
  if (mapEl === null) throw new Error("no import map on the page");
  const imports = (JSON.parse(mapEl.textContent ?? "{}") as { imports?: Record<string, string> }).imports ?? {};
  const libs: Lib[] = [];
  let root: string | null = null;
  for (const [name, url] of Object.entries(imports)) {
    const u = abs(url, base);
    const hb = HB_CDN.exec(u);
    if (name.startsWith("@hackbuild/") && hb !== null) {
      root = hb[1]!;
      libs.push({ name, url: `${hb[1]}${hb[2]}dist/iife/${hb[3]}.js`, global: "", reads: [] });
    } else if (PEER_CLASSIC[name] !== undefined) {
      libs.push({ name, url: u.replace(/[^/]+$/, PEER_CLASSIC[name]!), global: PEER_GLOBAL[name]!, reads: [] });
    }
  }
  if (root === null) throw new Error("the import map names no @hackbuild library at a dist/cdn url");
  libs.push({ name: "three", url: `${root}${VENDOR_THREE}`, global: PEER_GLOBAL["three"]!, reads: [] });

  // globals and reads come from each library's sidecar
  for (const l of libs.filter((x) => x.name.startsWith("@hackbuild/"))) {
    const side = JSON.parse(await deps.fetchText(l.url.replace(/\.js$/, ".sources.json"))) as { reads?: string[] };
    l.reads = (side.reads ?? []).filter((r) => libs.some((x) => x.name === r));
  }
  const globalOf: Record<string, string> = { "@hackbuild/spec": "HackbuildSpec", "@hackbuild/viewer": "HackbuildViewer", "@hackbuild/bench-core": "HackbuildBenchCore", "@hackbuild/bench": "HackbuildBench" };
  const needed = new Set<string>();
  const want = (n: string): void => {
    if (needed.has(n)) return;
    needed.add(n);
    for (const r of libs.find((x) => x.name === n)?.reads ?? []) want(r);
  };
  want("@hackbuild/bench");
  const order: Lib[] = [];
  while (order.length < needed.size) {
    const next = RANK.map((n) => libs.find((x) => x.name === n)).find((l) => l !== undefined && needed.has(l.name) && !order.includes(l) && l.reads.every((r) => order.some((o) => o.name === r)));
    if (next === undefined) throw new Error("the libraries read each other in a cycle");
    order.push(next);
  }

  const sources: string[] = [];
  const blocks: string[] = [];
  const grab = async (url: string): Promise<string> => {
    sources.push(url);
    return deps.fetchText(url);
  };
  const styles: string[] = [];
  for (const el of Array.from(deps.doc.querySelectorAll('link[rel="stylesheet"]'))) {
    const href = el.getAttribute("href");
    if (href === null) continue;
    // a relative @import (hackbuild.css reads ./tokens.css) has no base in a file, so it is inlined here
    let css = await grab(abs(href, base));
    for (const m of [...css.matchAll(/@import\s+(?:url\()?["']([^"')]+)["']\)?\s*;/g)]) {
      if (/^[a-z]+:|^\/\//i.test(m[1]!)) continue;
      css = css.replace(m[0], await grab(abs(m[1]!, abs(href, base))));
    }
    styles.push(`<style>/* ${href.replace(/^.*\//, "")} */\n${css.replace(/<\/style/gi, "<\\/style")}\n</style>`);
  }
  for (const l of order) {
    const code = NO_CLOSE(await grab(l.url), l.url);
    // the banner a bake writes, so check-page reads the version and the sha256 of an offline file as it does a bake's
    const label = l.name.startsWith("@hackbuild/") ? `${l.name} ${versionOf(l.url)}, iife build, global ${globalOf[l.name]}` : `${l.name}, classic build from ${l.url.replace(/^.*\//, "")}`;
    blocks.push(`<script>/* ${label} */\n${code}\n</script>`);
  }

  // the design's classic scripts, then design.js rewritten, then the entry
  const dbase = abs(options.designBase!.endsWith("/") ? options.designBase! : `${options.designBase}/`, base);
  const meta = JSON.parse(await grab(`${dbase}design.json`)) as { id: string; loadOrder: string[]; globals: Record<string, string> };
  // labels follow the bake's, so check-page tells the library's kernel, writer and zip from the page's own code
  const labelOf = (f: string): string => (/^manifold/.test(f) ? `manifold, ${f}` : /jszip/.test(f) ? `inlined jszip, ${f}` : /page-build/.test(f) ? `${meta.id} page build, ${f}` : `design ${meta.id}: ${f}`);
  for (const f of meta.loadOrder) blocks.push(`<script>/* ${labelOf(f)} */\n${NO_CLOSE(await grab(`${dbase}${f}`), f)}\n</script>`);
  const classicGlobals = Object.fromEntries(Object.entries(globalOf).map(([k, v]) => [k, v]));
  const design = classicDesign(await grab(`${dbase}design.js`), classicGlobals, "globalThis.__hbfDesign");
  blocks.push(`<script>/* design ${meta.id}: design.js as a classic script */\n${NO_CLOSE(design, "design.js")}\n</script>`);
  const pageGlobal = page?.globalName ?? meta.globals["page"] ?? "";
  const entry = `const d = globalThis.__hbfDesign;
const { createBench, pageBench, pageOf } = HackbuildBench;
const opts = { chase: d.chase, bench: d.bench, ...(d.contact === undefined ? {} : { contact: d.contact }), hook: true${meta.globals["manifold"] === undefined ? "" : ", globals: true"} };
const built = createBench(${pageGlobal === "" ? "opts" : `{ ...opts, ...pageBench(pageOf(${JSON.stringify(pageGlobal)})) }`});
built.mount(document.getElementById("app"));
globalThis.hbfOffline = built;`;
  blocks.push(`<script>/* entry */\n${entry}\n</script>`);

  const title = deps.doc.title === "" ? meta.id : deps.doc.title;
  const html = `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${title.replace(/</g, "&lt;")}</title>\n<link rel="icon" href="data:,">\n${styles.join("\n")}\n</head>\n<body class="hb">\n<div id="app"></div>\n${blocks.join("\n")}\n</body>\n</html>\n`;
  return { html, name: `${meta.id}-offline.html`, sources };
}

/** Browser entry: fetches over the network, builds the page and hands it to a download. */
export async function saveOffline(options: OfflineOptions): Promise<OfflinePage> {
  const fetchText = async (url: string): Promise<string> => {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${url} answered ${r.status}`);
    return r.text();
  };
  return buildOfflinePage({ doc: document, protocol: location.protocol, fetchText }, options);
}
