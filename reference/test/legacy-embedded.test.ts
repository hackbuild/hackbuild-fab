// designs/README.md keeps the notices for the third-party libraries inlined
// in the legacy pages, which are byte identical copies and are not edited.
// This test finds every inlined library by its banner or a signature the
// minified code keeps and fails when the table does not list the file
// under that library. It also holds the publish trims: no text file under
// designs/ or reference/ names a local scratch folder, and no legacy
// README names a home directory.

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const DESIGNS = path.join(ROOT, "designs");

/** Signatures that survive minification, keyed by the first cell of the README table row. */
const SIGNATURES: Record<string, RegExp> = {
  "three.js r128": /Three\.js Authors/,
  "JSZip 3.10.1": /JSZip v3\.10\.1/,
  "earcut (UMD build)": /\)\.earcut=e\(\)/,
  "qrcode-generator": /Kazuhiko Arase/,
  "manifold-3d with its wasm": /_ManifoldInitialized/,
};

function walk(dir: string, keep: (rel: string) => boolean, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === "dist" || e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, keep, out);
    else if (keep(path.relative(ROOT, p).split(path.sep).join("/"))) out.push(p);
  }
  return out;
}

const rel = (p: string): string => path.relative(ROOT, p).split(path.sep).join("/");
const isLegacy = (r: string): boolean => /^designs\/[^/]+\/legacy\//.test(r) || /^reference\/[^/]+\/[^/]+\/legacy\//.test(r);
const code = walk(ROOT + "/designs", (r) => isLegacy(r) && /\.(html|js|mjs|cjs)$/.test(r))
  .concat(walk(ROOT + "/reference", (r) => isLegacy(r) && /\.(html|js|mjs|cjs)$/.test(r)));

/** The rows of the "Third-party code inside legacy files" table: library to the files it lists. */
function tableRows(): Map<string, string> {
  const md = readFileSync(path.join(DESIGNS, "README.md"), "utf8");
  const start = md.indexOf("## Third-party code inside legacy files");
  const rows = new Map<string, string>();
  for (const line of md.slice(start).split("\n")) {
    const cells = line.split("|").map((c) => c.trim());
    if (cells.length >= 6 && cells[1] !== "library" && !cells[1]!.startsWith("---")) rows.set(cells[1]!, cells[4]!);
  }
  return rows;
}

describe("legacy third-party notices", () => {
  test("the scan finds the legacy pages", () => {
    expect(code.length).toBeGreaterThan(10);
  });

  test("every library inlined in a legacy file is listed under that file in designs/README.md", () => {
    const rows = tableRows();
    const missing: string[] = [];
    let found = 0;
    for (const f of code) {
      const text = readFileSync(f, "utf8");
      const short = rel(f).replace(/^designs\//, "");
      for (const [lib, sig] of Object.entries(SIGNATURES)) {
        if (!sig.test(text)) continue;
        found += 1;
        const listed = rows.get(lib);
        if (listed === undefined) missing.push(`${lib}: no row in designs/README.md`);
        else if (!listed.includes(`\`${short}\``)) missing.push(`${lib} inlined in ${rel(f)}, not listed`);
      }
    }
    expect(found).toBeGreaterThan(0);
    expect(missing).toEqual([]);
  });

  test("every listed file exists and carries the library its row names", () => {
    const wrong: string[] = [];
    for (const [lib, files] of tableRows()) {
      const sig = SIGNATURES[lib];
      if (sig === undefined) continue;
      for (const m of files.matchAll(/`([^`]+)`/g)) {
        const f = path.join(DESIGNS, m[1]!);
        let text = "";
        try { text = readFileSync(f, "utf8"); } catch { wrong.push(`${m[1]} listed under ${lib} does not exist`); continue; }
        if (!sig.test(text)) wrong.push(`${m[1]} listed under ${lib} does not carry it`);
      }
    }
    expect(wrong).toEqual([]);
  });
});

describe("publish trims", () => {
  const TEXT = /\.(txt|md|json|jsonl|py|js|mjs|cjs|ts|html|csv|scad|svg|yaml|yml)$/;
  const text = [...walk(DESIGNS, (r) => TEXT.test(r)), ...walk(path.join(ROOT, "reference"), (r) => TEXT.test(r))]
    .filter((f) => statSync(f).size < 8_000_000);

  test("no file under designs/ or reference/ names a local scratch folder", () => {
    const hits = text.filter((f) => /\/private\/tmp\/claude|\/private\/var\/folders\//.test(readFileSync(f, "utf8"))).map(rel);
    expect(hits).toEqual([]);
  });

  test("no legacy README names a home directory", () => {
    const hits = text.filter((f) => isLegacy(rel(f)) && f.endsWith("README.md") && /\/Users\/[a-z]/.test(readFileSync(f, "utf8"))).map(rel);
    expect(hits).toEqual([]);
  });
});
