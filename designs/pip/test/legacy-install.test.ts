// The PIP legacy bake reads its `npm:` sources from
// designs/pip/legacy/node_modules, which git ignores. Every CI job that bakes
// all manifests must install that folder from its lock before each bake, and
// a cold run that deletes it must install it again. The README states the
// same step for a person.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const LEGACY = "designs/pip/legacy";
const INSTALL = `npm ci --prefix ${LEGACY}`;
const BAKE = /npm run bake:all|tools\/bake\/bake\.mjs --all/;

const read = (p: string): string => readFileSync(ROOT + p, "utf8");

/** Top-level jobs of ci.yml as name to body text, split on two-space keys. */
function jobs(yml: string): Map<string, string> {
  const start = yml.indexOf("\njobs:\n");
  if (start < 0) throw new Error("ci.yml has no jobs key");
  const out = new Map<string, string>();
  let name = "";
  let body: string[] = [];
  for (const line of yml.slice(start + 7).split("\n")) {
    const m = /^ {2}([A-Za-z0-9_-]+):\s*$/.exec(line);
    if (m !== null) {
      if (name !== "") out.set(name, body.join("\n"));
      name = m[1]!;
      body = [];
    } else if (/^\S/.test(line)) break;
    else body.push(line);
  }
  if (name !== "") out.set(name, body.join("\n"));
  return out;
}

/** Each command line of a job body with comments dropped. */
const commands = (body: string): string[] =>
  body.split("\n").filter((l) => !/^\s*#/.test(l)).map((l) => l.replace(/^\s*-?\s*(run:|name:)?\s*/, ""));

/** npm package names the PIP manifest reads, in manifest order. */
function npmSources(): string[] {
  const m = JSON.parse(read(`${LEGACY}/bake.json`)) as Record<string, unknown>;
  const out: string[] = [];
  for (const key of ["vendor", "fonts", "blocks"]) {
    for (const x of (m[key] as { from: string }[] | undefined) ?? []) {
      if (!x.from.startsWith("npm:")) continue;
      const parts = x.from.slice(4).split("/");
      out.push(parts.slice(0, parts[0]!.startsWith("@") ? 2 : 1).join("/"));
    }
  }
  return out;
}

describe("pip legacy bake inputs", () => {
  test("every npm source is a pinned dependency present in the lock", () => {
    const pkgs = npmSources();
    expect(pkgs).toContain("three");
    expect(pkgs).toContain("@fontsource/vt323");
    const deps = (JSON.parse(read(`${LEGACY}/package.json`)) as { dependencies: Record<string, string> }).dependencies;
    const lock = (JSON.parse(read(`${LEGACY}/package-lock.json`)) as { packages: Record<string, { version: string }> }).packages;
    for (const p of pkgs) {
      expect(deps[p], p).toMatch(/^\d+\.\d+\.\d+$/);
      expect(lock[`node_modules/${p}`]?.version, p).toBe(deps[p]);
    }
  });

  test("node_modules of the legacy copy is ignored, so a checkout lacks it", () => {
    const ignore = read(".gitignore").split("\n").map((l) => l.trim());
    expect(ignore).toContain("node_modules/");
  });

  test("every CI job that bakes all manifests installs the legacy copy first", () => {
    const all = jobs(read(".github/workflows/ci.yml"));
    const baking = [...all].filter(([, body]) => BAKE.test(body));
    expect(baking.map(([n]) => n).sort()).toEqual(["bake", "bake-determinism"]);
    for (const [name, body] of baking) {
      // Walk the commands in order; a delete of the legacy node_modules
      // clears the install, and each bake needs a live install.
      let installed = false;
      let bakes = 0;
      for (const cmd of commands(body)) {
        for (const part of cmd.split("&&").map((s) => s.trim())) {
          if (part.startsWith("rm ") && part.includes(`${LEGACY}/node_modules`)) installed = false;
          if (part === INSTALL) installed = true;
          if (BAKE.test(part)) {
            expect(installed, `${name}: bake without ${INSTALL}`).toBe(true);
            bakes++;
          }
        }
      }
      expect(bakes, name).toBeGreaterThan(0);
    }
  });

  test("bake-determinism deletes the legacy node_modules between cold runs", () => {
    const body = jobs(read(".github/workflows/ci.yml")).get("bake-determinism") ?? "";
    expect(body).toMatch(new RegExp(`rm -rf [^\\n]*${LEGACY}/node_modules`));
  });

  test("the legacy README states the install step", () => {
    expect(read(`${LEGACY}/README.md`)).toContain(`    ${INSTALL}\n`);
  });
});
