// Writes packages/inlay/test/fixtures/intake-golden.json by running the
// intake cases (test/fixtures/intake-cases.ts) on the badge-replicator
// originals, so the port is compared against the source functions and never
// against itself (M03-T02 step 5). Run from the repo root:
//   node packages/inlay/scripts/intake-golden.mjs
// It refuses when an original's sha256 differs from its lineage.json row.

import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const lib = "/Users/obsidian/Projects/hackbuild/badge-replicator/src/lib/";
const ROWS = {
  homography: "inlay.intake-homography/badge-replicator",
  stack: "inlay.intake-stack/badge-replicator",
  knockout: "inlay.intake-knockout/badge-replicator",
  composite: "inlay.intake-compose/badge-replicator",
  extract: "inlay.intake-trim/badge-replicator",
};

const rows = JSON.parse(readFileSync(join(root, "lineage.json"), "utf8"));
const sources = {};
for (const [name, id] of Object.entries(ROWS)) {
  const row = rows.find((r) => r.id === id);
  if (!row) throw new Error(`lineage.json has no row ${id}`);
  const got = createHash("sha256").update(readFileSync(row.source)).digest("hex");
  if (got !== row.sha256) throw new Error(`${row.source} sha256 ${got}, lineage row ${id} records ${row.sha256}`);
  sources[name] = { id, sha256: got };
}

// Node 22.18 strips types; the originals import './units' with no extension.
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith(".") && !/\.\w+$/.test(specifier) && context.parentURL?.startsWith(pathToFileURL(lib).href)) {
      const url = new URL(specifier + ".ts", context.parentURL);
      if (existsSync(fileURLToPath(url))) return next(url.href, context);
    }
    return next(specifier, context);
  },
});

{
  // knockout.ts constructs the browser image type; this stand-in has its fields.
  globalThis.ImageData = class {
    constructor(data, width, height) {
      if (typeof data === "number") { height = width; width = data; data = new Uint8ClampedArray(width * height * 4); }
      this.data = data; this.width = width; this.height = height;
    }
  };

  const h = await import(pathToFileURL(lib + "homography.ts").href);
  const s = await import(pathToFileURL(lib + "stack.ts").href);
  const k = await import(pathToFileURL(lib + "knockout.ts").href);
  const { runCases } = await import(pathToFileURL(join(root, "packages/inlay/test/fixtures/intake-cases.ts")).href);

  // composite.ts runComposite (warp marked shots, then stack) and
  // extract.ts refine (knockout, then crop rows when the bounds are smaller).
  async function compose(shots, corners, ko, st) {
    const first = corners.findIndex((c) => c && c.length === 4);
    const size = first < 0 ? { width: shots[0].width, height: shots[0].height } : h.suggestSize(corners[first]);
    const layers = shots.map((shot, i) => (corners[i] && corners[i].length === 4 ? h.warpToRect(shot, corners[i], size.width, size.height) : shot.data));
    const pixels = layers.length > 1 ? await s.stackLayers(layers, size.width, size.height, s.createReducer(st)) : layers[0];
    let image = new ImageData(pixels, size.width, size.height);
    if (!ko || ko.mode === "none") return image;
    const cut = k.applyKnockout(image, ko);
    let output = cut;
    if (ko.trim) {
      const bounds = k.contentBounds(cut);
      if (bounds && (bounds.width < size.width || bounds.height < size.height)) {
        const trimmed = new ImageData(bounds.width, bounds.height);
        for (let y = 0; y < bounds.height; y++) {
          const from = ((y + bounds.y) * size.width + bounds.x) * 4;
          trimmed.data.set(cut.data.subarray(from, from + bounds.width * 4), y * bounds.width * 4);
        }
        output = trimmed;
      }
    }
    return output;
  }

  const cases = await runCases({ ...h, ...s, ...k, compose });
  const golden = { producedBy: "packages/inlay/scripts/intake-golden.mjs", sources, cases };
  writeFileSync(join(root, "packages/inlay/test/fixtures/intake-golden.json"), JSON.stringify(golden, null, 2) + "\n");
  console.log(`wrote ${Object.keys(cases).length} cases`);
}
