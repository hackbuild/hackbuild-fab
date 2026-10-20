// R1-engine-03: the writer lives once, in hackbuild-3mf. This package is a
// re-export of the build vendored under tools/vendor, pinned by name in
// package.json and by sha256 in tools/vendor/SHA256SUMS; npm installs it
// as node_modules/hackbuild-3mf. The data files fab keeps beside it (the
// harvest and tools/py read them) equal the vendored copies.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { describe, expect, it } from "vitest";
import * as shim from "../src/index.js";

const ROOT = new URL("../../../", import.meta.url);
const PKG = new URL("../", import.meta.url);
const VENDORED = new URL("node_modules/hackbuild-3mf/", ROOT);
const json = (u: URL): unknown => JSON.parse(readFileSync(u, "utf8"));

const pkg = json(new URL("package.json", PKG)) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
const dep = pkg.dependencies?.["hackbuild-3mf"] ?? "";
const TGZ = /^file:\.\.\/\.\.\/tools\/vendor\/(hackbuild-3mf-(\d+\.\d+\.\d+)-[0-9a-f]{7}\.tgz)$/.exec(dep);

describe("packages/3mf re-exports the vendored hackbuild-3mf", () => {
  it("depends on one vendored tgz and no workspace package", () => {
    expect(TGZ).not.toBeNull();
    expect(Object.keys(pkg.dependencies ?? {})).toEqual(["hackbuild-3mf"]);
    const all = [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})];
    expect(all.filter((d) => d.startsWith("@hackbuild/"))).toEqual([]);
  });

  it("pins the tgz by sha256 in tools/vendor/SHA256SUMS", () => {
    const sums = new Map(readFileSync(new URL("tools/vendor/SHA256SUMS", ROOT), "utf8").trim().split("\n").map((l) => {
      const [sum, name] = l.split(/\s+/);
      return [name!, sum!] as const;
    }));
    const name = TGZ![1]!;
    const bytes = readFileSync(new URL(`tools/vendor/${name}`, ROOT));
    expect(sums.get(name)).toBe(createHash("sha256").update(bytes).digest("hex"));
  });

  it("installed the version the tgz name carries", () => {
    const installed = json(new URL("package.json", VENDORED)) as { name: string; version: string };
    expect([installed.name, installed.version]).toEqual(["hackbuild-3mf", TGZ![2]]);
  });

  it("holds no source of its own beyond the re-export", () => {
    const code = readFileSync(new URL("src/index.ts", PKG), "utf8").split("\n").filter((l) => l.trim() !== "" && !l.startsWith("//"));
    expect(code).toEqual(['export * from "hackbuild-3mf";']);
    expect(typeof shim.build).toBe("function");
    expect(typeof shim.validateEntries).toBe("function");
  });
});

describe("fab data files equal the vendored copies", () => {
  for (const f of ["data/default_preset.json", "data/filament_template.json", "seed/materials.json"]) {
    it(`${f} byte for byte`, () => {
      expect(readFileSync(new URL(f, PKG), "utf8")).toBe(readFileSync(new URL(f, VENDORED), "utf8"));
    });
  }

  it("data/filament_presets.json up to the save paths, which hackbuild-3mf maps into its corpus", () => {
    // tools/import-from-fab.sh rewrites tools/corpus/3mf/ to corpus/ and an owner save to corpus/owner/; the file names stay.
    const strip = (v: unknown): unknown => JSON.parse(JSON.stringify(v, (k, x: unknown) => ((k === "file" || k === "source") && typeof x === "string" ? basename(x) : x)));
    const fab = json(new URL("data/filament_presets.json", PKG));
    const vendored = json(new URL("data/filament_presets.json", VENDORED));
    expect(JSON.stringify(fab)).not.toBe(JSON.stringify(vendored));
    expect(strip(fab)).toEqual(strip(vendored));
  });
});
