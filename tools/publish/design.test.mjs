// The design bundles (npm run build:design) for designs/toggle and
// reference/keys/flex-pair. For each design:
//   design.js     imports only published @hackbuild packages and exports
//                 chase, bench and contact
//   page-build.js loads in a node vm after the manifold wasm, the manifold
//                 classic script and jszip, in the load order design.json
//                 names, builds at the chase's default values, and returns
//                 the buildHash in the design's expected/build.json
// A page build holds no wasm object after a build (liveCount 0), as the
// browser smoke checks.

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { before, describe, it } from "node:test";
import { pathToFileURL } from "node:url";
import vm from "node:vm";
import { normaliseParams } from "@hackbuild/chase";
import { REPO } from "../bake/bake.mjs";
import { PACKAGES } from "../lib/outputs.mjs";
import { buildDesign } from "./build-design.mjs";
import { looseSpecifiers } from "./imports.mjs";

const CLONE = `globalThis.structuredClone = function copy(v) {
  if (v === null || typeof v !== "object") return v;
  if (ArrayBuffer.isView(v)) return new v.constructor(v);
  if (Array.isArray(v)) return v.map(copy);
  const o = {};
  for (const k of Object.keys(v)) o[k] = copy(v[k]);
  return o;
};`;
const DESIGNS = ["designs/toggle", "reference/keys/flex-pair"];
const published = PACKAGES.map((p) => p.name);

describe("design bundles", () => {
  for (const dir of DESIGNS) {
    describe(dir, () => {
      let built;
      before(async () => {
        built = await buildDesign(join(REPO, dir));
      });

      it("writes design.js, page-build.js and facts.json", () => {
        for (const f of ["design.js", "page-build.js", "facts.json", "design.json"]) assert.ok(existsSync(join(built.dir, f)), `${dir}: ${f} was not written`);
        const facts = JSON.parse(readFileSync(join(built.dir, "facts.json"), "utf8"));
        assert.equal(typeof facts.defHash, "string");
        assert.equal(facts.epoch, 315532800);
      });

      it("design.js imports only published packages and exports chase, bench and contact", async () => {
        const text = readFileSync(join(built.dir, "design.js"), "utf8");
        const bad = looseSpecifiers(text).filter((s) => !published.includes(s));
        assert.deepEqual(bad, [], `${dir}: design.js imports ${bad.join(", ")}, not published packages`);
        const mod = await import(pathToFileURL(join(built.dir, "design.js")).href);
        assert.deepEqual(Object.keys(mod).sort(), ["bench", "chase", "contact"]);
        assert.equal(typeof mod.contact, "function");
      });

      it("page-build.js builds in a vm at the default values to the expected buildHash", async () => {
        const manifest = JSON.parse(readFileSync(join(built.dir, "design.json"), "utf8"));
        const { chase } = await import(pathToFileURL(join(built.dir, "design.js")).href);
        const ctx = vm.createContext({ console, setTimeout, clearTimeout, queueMicrotask, TextEncoder, TextDecoder, URL, URLSearchParams, performance, atob, btoa, crypto: globalThis.crypto });
        vm.runInContext("var self = globalThis; var window = globalThis; var location = { href: 'file:///design.html' };", ctx);
        // A vm context has no structuredClone, and the host one returns host-realm objects that the page's plain-data check refuses.
        // The page clones drafts and values, which are plain data by contract (pipeline plainProblem), so a plain-data copy made in the realm equals it.
        vm.runInContext(CLONE, ctx);
        for (const f of manifest.loadOrder) vm.runInContext(readFileSync(join(built.dir, f), "utf8"), ctx, { filename: f });
        const page = ctx[manifest.globals.page]?.page;
        assert.ok(page, `${dir}: page-build.js defined no ${manifest.globals.page}.page`);
        // The values are written into the vm realm: the page build tests for plain objects against its own Object.prototype.
        const defaults = vm.runInContext(`(${JSON.stringify(normaliseParams(chase, undefined).params)})`, ctx);
        const result = await page.build(defaults);
        const want = JSON.parse(readFileSync(join(REPO, dir, "expected/build.json"), "utf8")).buildHash;
        assert.equal(result.buildHash, want, `${dir}: page buildHash differs from expected/build.json`);
        assert.equal(page.liveCount(), 0, `${dir}: wasm objects still owned after the build`);
      });
    });
  }
});
