// Save offline: the page text is built from fetched library files, with no
// network. A fake document carries an import map and a stylesheet; a fake
// fetch answers from a table.

import { describe, expect, it } from "vitest";
import { buildOfflinePage, classicDesign, offlineAvailability, type OfflineDeps } from "../../src/offline/save.js";

const ROOT = "https://cdn.jsdelivr.net/gh/hackbuild/hackbuild-fab@lib-v0.1.0/";
const MAP = {
  imports: {
    vue: "https://cdn.jsdelivr.net/npm/vue@3.5.43/dist/vue.esm-browser.prod.js",
    pinia: "https://cdn.jsdelivr.net/npm/pinia@4.0.3/dist/pinia.esm-browser.js",
    three: "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js",
    "@hackbuild/spec": `${ROOT}spec/dist/cdn/spec.js`,
    "@hackbuild/viewer": `${ROOT}packages/viewer/dist/cdn/viewer.js`,
    "@hackbuild/bench-core": `${ROOT}packages/bench-core/dist/cdn/bench-core.js`,
    "@hackbuild/bench": `${ROOT}packages/bench/dist/cdn/bench.js`,
  },
};
const SIDE: Record<string, string[]> = {
  spec: [], viewer: ["@hackbuild/spec", "three"], "bench-core": ["@hackbuild/spec", "@hackbuild/viewer"],
  bench: ["@hackbuild/bench-core", "@hackbuild/spec", "@hackbuild/viewer", "pinia", "vue"],
};

function deps(over: Partial<OfflineDeps> = {}, map: unknown = MAP): OfflineDeps {
  const fetched: Record<string, string> = {
    "https://cdn.jsdelivr.net/npm/vue@3.5.43/dist/vue.runtime.global.prod.js": "var Vue={};",
    "https://cdn.jsdelivr.net/npm/pinia@4.0.3/dist/pinia.iife.prod.js": "var Pinia={};",
    [`${ROOT}tools/vendor/three/dist/three.js`]: "var THREE={};",
    "https://example.test/hackbuild.css": '@import "./tokens.css";\nbody{color:red}',
    "https://example.test/tokens.css": ":root{--a:1}",
    "https://example.test/out/design/toggle/design.json": JSON.stringify({ id: "toggle", loadOrder: ["manifold-wasm.js", "jszip.js", "page-build.js"], globals: { page: "HbfPageBuild", manifold: "ManifoldModule" } }),
    "https://example.test/out/design/toggle/manifold-wasm.js": "globalThis.W=1;",
    "https://example.test/out/design/toggle/jszip.js": "var JSZip=1;",
    "https://example.test/out/design/toggle/page-build.js": "var HbfPageBuild={};",
    "https://example.test/out/design/toggle/design.js": 'import { defineBench as e, defineChase as t } from "@hackbuild/spec";\nvar n = t({});\nvar r = e(n, {});\nexport { r as bench, n as chase };',
  };
  for (const [short, reads] of Object.entries(SIDE)) {
    const dir = short === "spec" ? "spec" : `packages/${short}`;
    fetched[`${ROOT}${dir}/dist/iife/${short}.js`] = `var G_${short.replace("-", "_")}={};`;
    fetched[`${ROOT}${dir}/dist/iife/${short}.sources.json`] = JSON.stringify({ reads });
  }
  const doc = {
    baseURI: "https://example.test/page.html", title: "cdn fixture",
    querySelector: (sel: string) => (sel.includes("importmap") ? { textContent: JSON.stringify(map) } : null),
    querySelectorAll: () => [{ getAttribute: () => "https://example.test/hackbuild.css" }],
  } as unknown as OfflineDeps["doc"];
  return { doc, protocol: "https:", fetchText: async (u) => { const t = fetched[u]; if (t === undefined) throw new Error(`${u} answered 404`); return t; }, ...over };
}

describe("save offline", () => {
  it("is disabled on file://, without an import map and without a design folder, each with its reason", () => {
    expect(offlineAvailability({ ...deps(), protocol: "file:" }, { designBase: "/x/" })).toEqual({ ok: false, why: "this page already runs from a file and needs no network." });
    const bare = { ...deps(), doc: { ...deps().doc, querySelector: () => null } as unknown as OfflineDeps["doc"] };
    expect(offlineAvailability(bare, { designBase: "/x/" }).why).toContain("does not load the libraries from a cdn");
    expect(offlineAvailability(deps(), null).why).toContain("names no design folder");
    expect(offlineAvailability(deps(), { designBase: "/x/" })).toEqual({ ok: true, why: "" });
  });

  it("writes the peers, the libraries in load order, the design scripts and the entry as classic scripts", async () => {
    const out = await buildOfflinePage(deps(), { designBase: "/out/design/toggle/" });
    expect(out.name).toBe("toggle-offline.html");
    const labels = [...out.html.matchAll(/<script>\/\* ([^*]*) \*\//g)].map((m) => m[1]);
    expect(labels).toEqual([
      "vue, classic build from vue.runtime.global.prod.js", "pinia, classic build from pinia.iife.prod.js", "three, classic build from three.js",
      "@hackbuild/spec 0.1.0, iife build, global HackbuildSpec", "@hackbuild/viewer 0.1.0, iife build, global HackbuildViewer",
      "@hackbuild/bench-core 0.1.0, iife build, global HackbuildBenchCore", "@hackbuild/bench 0.1.0, iife build, global HackbuildBench",
      "manifold, manifold-wasm.js", "inlined jszip, jszip.js", "toggle page build, page-build.js",
      "design toggle: design.js as a classic script", "entry",
    ]);
    expect(out.html).toContain("<style>/* hackbuild.css */");
    expect(out.html).toContain(":root{--a:1}\nbody{color:red}");
    expect(out.html).not.toContain("@import");
    expect(out.html).not.toMatch(/<script[^>]+src=/);
    expect(out.html).toContain("const { defineBench: e, defineChase: t } = HackbuildSpec;");
    expect(out.html).toContain("globalThis.__hbfDesign = { bench: r, chase: n };");
    expect(out.html).toContain('pageBench(pageOf("HbfPageBuild"))');
    expect(out.sources).toContain(`${ROOT}tools/vendor/three/dist/three.js`);
  });

  it("names the file that could not be fetched", async () => {
    const d = deps();
    await expect(buildOfflinePage({ ...d, fetchText: async (u) => { if (u.endsWith("three.js")) throw new Error(`${u} answered 404`); return d.fetchText(u); } }, { designBase: "/out/design/toggle/" })).rejects.toThrow("three.js answered 404");
  });

  it("rewrites imports to globals and exports to one object, and refuses a form it cannot read", () => {
    const text = classicDesign('import * as S from "@hackbuild/spec";\nvar a = S.x;\nexport { a as chase, a };', { "@hackbuild/spec": "HackbuildSpec" }, "T");
    expect(text).toContain("const S = HackbuildSpec;");
    expect(text).toContain("T = { chase: a, a: a };");
    expect(() => classicDesign('import { x } from "left-pad";', {}, "T")).toThrow("no classic global");
    expect(() => classicDesign("export default 1;", {}, "T")).toThrow("export form");
  });
});
