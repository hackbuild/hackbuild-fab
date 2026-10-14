// M00-T03 done-when: geom is the only 2D code path in mesh and 3mf. No
// source file there imports polygon-clipping or a clipper package (D-163).

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const PACKAGES = fileURLToPath(new URL("../../", import.meta.url));
const SCANNED = ["mesh", "3mf", "geom"];
const SKIP = new Set(["node_modules", "dist", "seed", "fixtures"]);
const BANNED = /(?:from\s+|require\(\s*|import\(\s*)["'](?:polygon-clipping|clipper[\w-]*|clipper2[\w-]*|js-angusj-clipper|@countertype\/clipper2[\w-]*)["']/;

function sources(dir: string): string[] {
  const out: string[] = [];
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of names) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...sources(p));
    else if (/\.(?:[cm]?[jt]s)$/.test(name)) out.push(p);
  }
  return out;
}

test("mesh, 3mf and geom import no polygon-clipping or clipper package", () => {
  const files = SCANNED.flatMap((pkg) => sources(join(PACKAGES, pkg)));
  expect(files.length).toBeGreaterThan(0);
  const offenders = files.filter((f) => BANNED.test(readFileSync(f, "utf8")));
  expect(offenders).toEqual([]);
});

test("no package.json in mesh, 3mf or geom depends on polygon-clipping or a clipper package", () => {
  for (const pkg of SCANNED) {
    const json = JSON.parse(readFileSync(join(PACKAGES, pkg, "package.json"), "utf8")) as Record<string, Record<string, string> | undefined>;
    const deps = Object.keys({ ...json["dependencies"], ...json["devDependencies"], ...json["peerDependencies"] });
    expect(deps.filter((d) => /polygon-clipping|clipper/i.test(d))).toEqual([]);
  }
});
