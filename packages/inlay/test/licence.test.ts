// M03-T01 step 5 (D-043, C-11, LICENSING.md section 3): packages/inlay and
// its lockfile closure hold no package whose licence matches GPL or AGPL,
// and none of the names LICENSING.md section 2.4 excludes. The excluded
// names are read from LICENSING.md, so the test keeps no list of its own.

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const readJson = (rel: string): any => JSON.parse(readFileSync(root + rel, "utf8"));

// The licences.mjs rule (LICENSING.md section 3): GPL or AGPL at a word
// boundary. LGPL does not match it and falls to the LGPL rule: its row must
// load as a lazy separate file (sharp's libvips, reached through
// manifold-3d, is the case in this closure). A published dual licence such
// as "(MIT OR GPL-3.0-or-later)" passes only when its audited row elects a
// licence that does not match.
const COPYLEFT = /\bA?GPL/;
const LESSER = /LGPL/;

interface LockEntry {
  name?: string;
  version?: string;
  license?: string;
  link?: boolean;
  resolved?: string;
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

interface Member {
  key: string;
  name: string;
  version: string;
  license: string | null;
}

// Node resolution over package-lock v3 keys: look in <dir>/node_modules/<name>
// from the dependent's directory up to the root; a workspace link resolves
// to its package directory entry.
export function closure(packages: Record<string, LockEntry>, start: string): Member[] {
  const seen = new Map<string, Member>();
  const nameOf = (key: string, e: LockEntry): string =>
    e.name ?? key.slice(key.lastIndexOf("node_modules/") + "node_modules/".length);
  const resolve = (from: string, dep: string): string => {
    let dir = from;
    for (;;) {
      const cand = (dir === "" ? "" : dir + "/") + "node_modules/" + dep;
      const hit = packages[cand];
      if (hit) return hit.link ? (hit.resolved as string) : cand;
      if (dir === "") throw new Error(`${from} depends on ${dep}, which the lockfile does not resolve`);
      dir = dir.includes("/") ? dir.slice(0, dir.lastIndexOf("/")) : "";
    }
  };
  const visit = (key: string): void => {
    if (seen.has(key)) return;
    const e = packages[key];
    if (!e) throw new Error(`lockfile has no entry ${key}`);
    seen.set(key, { key, name: nameOf(key, e), version: e.version ?? "", license: e.license ?? null });
    const deps = { ...e.dependencies, ...e.optionalDependencies, ...e.peerDependencies };
    for (const dep of Object.keys(deps).sort()) visit(resolve(key, dep));
  };
  visit(start);
  return [...seen.values()];
}

// Names in the first column of the LICENSING.md section 2.4 table. A cell
// such as "planegcs (@salusoft89/planegcs)" names both; "(upstream)" is a note.
export function excludedNames(md: string): string[] {
  const at = md.indexOf("### 2.4 Excluded");
  if (at < 0) throw new Error("LICENSING.md has no section 2.4 Excluded");
  const section = md.slice(at, md.indexOf("\n### ", at + 1));
  const names: string[] = [];
  for (const line of section.split("\n").filter((l) => l.startsWith("| ")).slice(1)) {
    const cell = (line.split("|")[1] ?? "").trim();
    if (/^-+$/.test(cell)) continue;
    const m = /^([^\s(]+)(?:\s*\(([^)]+)\))?/.exec(cell);
    if (!m || !m[1]) continue;
    names.push(m[1]);
    if (m[2] && m[2] !== "upstream") names.push(m[2]);
  }
  return names;
}

export interface Audit {
  audited: string;
  load: string;
}

export function violations(members: Member[], excluded: string[], audits: Map<string, Audit>): string[] {
  const out: string[] = [];
  for (const m of members) {
    const a = audits.get(`${m.name}@${m.version}`);
    if (m.license !== null && COPYLEFT.test(m.license) && (a === undefined || COPYLEFT.test(a.audited))) out.push(`${m.key} licence ${m.license}`);
    if (a !== undefined && COPYLEFT.test(a.audited)) out.push(`${m.key} audited ${a.audited}`);
    if (a !== undefined && LESSER.test(a.audited) && a.load !== "lazy-separate-file") out.push(`${m.key} audited ${a.audited} with load ${a.load}`);
    if (a === undefined && m.license !== null && LESSER.test(m.license)) out.push(`${m.key} licence ${m.license} with no audited row`);
    if (excluded.includes(m.name)) out.push(`${m.key} is excluded by LICENSING.md 2.4`);
  }
  return out;
}

const lock = readJson("package-lock.json") as { packages: Record<string, LockEntry> };
const licences = readJson("tools/licences.json") as { dependencies: { ecosystem: string; name: string; version: string; audited: string; load: string }[] };
const audited = new Map<string, Audit>(licences.dependencies.filter((d) => d.ecosystem === "npm").map((d) => [`${d.name}@${d.version}`, { audited: d.audited, load: d.load }]));
const excluded = excludedNames(readFileSync(root + "docs/plan/LICENSING.md", "utf8"));
const pkg = readJson("packages/inlay/package.json");

describe("inlay licence closure (D-043)", () => {
  const members = closure(lock.packages, "packages/inlay");

  test("package.json is private MIT with the four workspace dependencies of tools/tiers.json", () => {
    expect(pkg.private).toBe(true);
    expect(pkg.license).toBe("MIT");
    const edges = readJson("tools/tiers.json").edges.inlay as string[];
    expect(Object.keys(pkg.dependencies).sort()).toEqual(edges.map((e) => `@hackbuild/${e}`).sort());
  });

  test("the lockfile entry carries the package.json dependencies, so the walk starts from them", () => {
    expect(lock.packages["packages/inlay"]?.dependencies).toEqual(pkg.dependencies);
    for (const dep of Object.keys(pkg.dependencies)) expect(members.some((m) => m.name === dep)).toBe(true);
  });

  test("LICENSING.md 2.4 yields the excluded names", () => {
    expect(excluded.length).toBeGreaterThanOrEqual(6);
    for (const n of excluded) expect(n).toMatch(/^[@a-z0-9][\w./-]*$/);
  });

  test("no member of the closure is GPL or AGPL, audited or published, no LGPL member loads other than lazily, none is excluded by name", () => {
    expect(violations(members, excluded, audited)).toEqual([]);
  });

  test("every npm member outside the workspace has a tools/licences.json row", () => {
    const npm = members.filter((m) => m.key.includes("node_modules/"));
    expect(npm.length).toBeGreaterThan(0);
    for (const m of npm) expect(audited.has(`${m.name}@${m.version}`), `${m.name}@${m.version}`).toBe(true);
  });

  test("every installed member's package.json licence passes the same rule as its lockfile field", () => {
    const installed = members.flatMap((m) => {
      const file = root + m.key + "/package.json";
      if (!existsSync(file)) return [];
      const lic = JSON.parse(readFileSync(file, "utf8")).license;
      return [{ ...m, license: typeof lic === "string" ? lic : null }];
    });
    expect(installed.length).toBeGreaterThan(0);
    expect(violations(installed, excluded, audited)).toEqual([]);
  });
});

describe("the closure walk catches what it guards", () => {
  const fake: Record<string, LockEntry> = {
    "packages/a": { name: "@x/a", version: "0.0.0", license: "MIT", dependencies: { "@x/b": "0.0.0", ok: "1.0.0" } },
    "node_modules/@x/b": { resolved: "packages/b", link: true },
    "packages/b": { name: "@x/b", version: "0.0.0", license: "MIT", dependencies: { deep: "2.0.0" } },
    "node_modules/ok": { version: "1.0.0", license: "MIT", dependencies: { deep: "1.0.0" } },
    "node_modules/ok/node_modules/deep": { version: "1.0.0", license: "GPL-2.0-or-later" },
    "node_modules/deep": { version: "2.0.0", license: "Apache-2.0", dependencies: { [excluded[0] ?? "x"]: "0.5.1" } },
    [`node_modules/${excluded[0] ?? "x"}`]: { version: "0.5.1", license: "MIT" },
  };

  test("a nested GPL package and an excluded name are both reported", () => {
    const v = violations(closure(fake, "packages/a"), excluded, new Map());
    expect(v).toEqual([
      `node_modules/${excluded[0]} is excluded by LICENSING.md 2.4`,
      "node_modules/ok/node_modules/deep licence GPL-2.0-or-later",
    ]);
  });

  test("an AGPL audited value is reported though the published field says MIT", () => {
    const v = violations([{ key: "node_modules/ok", name: "ok", version: "1.0.0", license: "MIT" }], [], new Map([["ok@1.0.0", { audited: "AGPL-3.0-only", load: "bundled" }]]));
    expect(v).toEqual(["node_modules/ok audited AGPL-3.0-only"]);
  });

  test("LGPL passes only as a lazy separate file; a dual licence passes only on an elected audit", () => {
    const lib: Member = { key: "node_modules/lib", name: "lib", version: "1.0.0", license: "LGPL-3.0-or-later" };
    const dual: Member = { key: "node_modules/dual", name: "dual", version: "1.0.0", license: "(MIT OR GPL-3.0-or-later)" };
    const lazy = new Map([["lib@1.0.0", { audited: "LGPL-3.0-or-later", load: "lazy-separate-file" }], ["dual@1.0.0", { audited: "MIT", load: "bundled" }]]);
    expect(violations([lib, dual], [], lazy)).toEqual([]);
    const bundled = new Map([["lib@1.0.0", { audited: "LGPL-3.0-or-later", load: "bundled" }]]);
    expect(violations([lib, dual], [], bundled)).toEqual([
      "node_modules/lib audited LGPL-3.0-or-later with load bundled",
      "node_modules/dual licence (MIT OR GPL-3.0-or-later)",
    ]);
  });

  test("an unresolved dependency throws", () => {
    expect(() => closure({ "packages/a": { dependencies: { gone: "1" } } }, "packages/a")).toThrow(/does not resolve/);
  });
});
