// Every relative import in a package's source names its file extension, so
// the dist tsc emits loads in plain node with no resolve hook. tsc with
// moduleResolution Bundler copies a specifier as written, and node ESM never
// guesses an extension: an extensionless "./lookup" in src is an
// ERR_MODULE_NOT_FOUND in dist. The dist check reads what tsc actually
// emitted (pretest runs tsc -b), so a src file this scan misses still fails.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const PACKAGES = join(ROOT, "packages");

/** Static and dynamic relative specifiers: from "./x", import "./x", import("./x"). */
const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(?\s*)(["'])(\.{1,2}\/[^"'\n]*)\1/g;
const EXTENSION = /\.(?:js|mjs|cjs|json|wasm)$/;
/**
 * Packages whose bench vite builds (packages/ui, M09): their bench modules
 * import single file components as "./X.vue", which vite compiles and plain
 * node never loads, because the package entry dist/index.js reaches no bench
 * module (held below). Every other package keeps the plain node rule.
 */
const VITE_BUILT = new Set(["ui"]);
const VUE = /\.vue$/;

function files(dir: string, keep: (name: string) => boolean): string[] {
  const out: string[] = [];
  const walk = (d: string): void => {
    for (const name of readdirSync(d)) {
      if (name === "node_modules") continue;
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (keep(name)) out.push(p);
    }
  };
  if (existsSync(dir)) walk(dir);
  return out;
}

/** True when plain node could not load the specifier from this package. */
function rejects(pkg: string, specifier: string): boolean {
  return !EXTENSION.test(specifier) && !(VITE_BUILT.has(pkg) && VUE.test(specifier));
}

function extensionless(paths: readonly string[]): string[] {
  const hits: string[] = [];
  for (const p of paths) {
    const text = readFileSync(p, "utf8");
    const pkg = relative(PACKAGES, p).split(/[\\/]/)[0]!;
    for (const m of text.matchAll(SPECIFIER)) {
      if (rejects(pkg, m[2]!)) hits.push(`${relative(ROOT, p)}: ${m[2]}`);
    }
  }
  return hits;
}

/** Relative module files a dist entry reaches, following static and dynamic specifiers. */
function reach(entry: string): string[] {
  const seen = new Set<string>();
  const walk = (f: string): void => {
    if (seen.has(f)) return;
    seen.add(f);
    if (!f.endsWith(".js") || !existsSync(f)) return;
    for (const m of readFileSync(f, "utf8").matchAll(SPECIFIER)) walk(resolve(dirname(f), m[2]!));
  };
  walk(entry);
  return [...seen];
}

const packages = readdirSync(PACKAGES).filter((p) => statSync(join(PACKAGES, p)).isDirectory());

describe("relative specifiers carry their extension (plain node loads dist)", () => {
  test("SPECIFIER finds the forms it guards", () => {
    const sample = 'import { a } from "./a";\nexport * from "../b";\nconst c = await import("./c");\nimport "./d";\nimport x from "./e.js";';
    expect([...sample.matchAll(SPECIFIER)].map((m) => m[2])).toEqual(["./a", "../b", "./c", "./d", "./e.js"]);
  });

  test("no extensionless relative import in packages/*/src", () => {
    const src = packages.flatMap((p) => files(join(PACKAGES, p, "src"), (n) => /\.(?:ts|tsx|mts)$/.test(n) && !n.endsWith(".d.ts")));
    expect(src.length).toBeGreaterThan(20);
    expect(extensionless(src)).toEqual([]);
  });

  test("no extensionless relative import in packages/*/dist", () => {
    const dist = packages.flatMap((p) => files(join(PACKAGES, p, "dist"), (n) => n.endsWith(".js")));
    expect(dist.length).toBeGreaterThan(20);
    expect(extensionless(dist)).toEqual([]);
  });

  test("the vite exemption: .vue specifiers pass only in a vite-built package, and its node entry reaches none", () => {
    expect(rejects("ui", "./BenchShell.vue")).toBe(false);
    expect(rejects("ui", "./lookup")).toBe(true);
    expect(rejects("mesh", "./Panel.vue")).toBe(true);
    for (const p of VITE_BUILT) {
      const entry = join(PACKAGES, p, "dist", "index.js");
      expect(existsSync(entry), `${p} dist/index.js; pretest runs tsc -b`).toBe(true);
      expect(reach(entry).filter((f) => VUE.test(f)).map((f) => relative(ROOT, f))).toEqual([]);
    }
  });
});
