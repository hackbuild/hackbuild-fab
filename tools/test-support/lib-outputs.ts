// Shared checks for the per-package output tests (plan v10 Phase 1 step 4):
// the IIFE loads in a node vm context with its globals and exposes the
// package global, and the CDN file imports only allowed bare specifiers.
// The outputs come from npm run build:lib; a test skips when its output is
// absent and lint:packages fails on an absent output, so a missing build
// is never a pass.

import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import vm from "node:vm";
import { PACKAGES, ROOT, VENDOR_THREE, externalsOf, type LibPackage } from "../lib/outputs.mjs";

export const pkgOf = (short: string): LibPackage => {
  const p = PACKAGES.find((x) => x.short === short);
  if (p === undefined) throw new Error(`no published package ${short}`);
  return p;
};
export const iifePath = (p: LibPackage): string => join(ROOT, p.dir, "dist/iife", `${p.short}.js`);
export const cdnPath = (p: LibPackage): string => join(ROOT, p.dir, "dist/cdn", `${p.short}.js`);
export const builtOutputs = (p: LibPackage): boolean => existsSync(iifePath(p)) && existsSync(cdnPath(p)) && existsSync(join(ROOT, VENDOR_THREE));

/** Module specifiers a built ES file imports or re-exports: static, side-effect and dynamic literal forms. */
export function importSpecifiers(code: string): string[] {
  const out = new Set<string>();
  for (const re of [/\b(?:import|export)\s*(?:[\w*${},\s]+?\s*from\s*)?["']([@\w./-]+)["']/g, /\bimport\(\s*["']([^"']+)["']\s*\)/g]) {
    for (const m of code.matchAll(re)) out.add(m[1] as string);
  }
  return [...out].sort();
}

/** Stand-in for Pinia: each property reads as a function returning another stand-in. */
function stub(): unknown {
  const fn = function () {
    return stub();
  };
  return new Proxy(fn, { get: (_t, k) => (k === Symbol.toPrimitive ? () => "" : stub()), apply: () => stub(), construct: () => ({}) });
}

/**
 * Load the vendor three, Vue and the prerequisite published IIFEs into one
 * context, then the package's own, in dependency order. Returns the context.
 */
export function loadIife(short: string): vm.Context {
  const ctx = vm.createContext({ console, setTimeout, clearTimeout, queueMicrotask, TextEncoder, TextDecoder, URL, performance });
  const run = (file: string): void => {
    vm.runInContext(readFileSync(file, "utf8"), ctx, { filename: file });
  };
  vm.runInContext("var self = globalThis; var window = globalThis; var location = { href: 'file:///bench.html' };", ctx);
  const needs: Record<string, string[]> = { spec: [], viewer: ["spec"], "bench-core": ["spec", "viewer"], bench: ["spec", "viewer", "bench-core"] };
  const wants = PACKAGES.find((p) => p.short === short)?.peers ?? [];
  if (short !== "spec") run(join(ROOT, VENDOR_THREE));
  if (wants.includes("vue")) run(createRequire(join(ROOT, "packages/bench/package.json")).resolve("vue/dist/vue.global.prod.js"));
  if (wants.includes("pinia")) ctx.Pinia = stub();
  for (const dep of needs[short] ?? []) run(iifePath(pkgOf(dep)));
  run(iifePath(pkgOf(short)));
  return ctx;
}

export const allowedImports = (short: string): string[] => externalsOf(pkgOf(short));
