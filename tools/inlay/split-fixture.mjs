// Writes the M03-T06 3-slot fixture coin
// (packages/inlay/test/fixtures/split-coin.ts, stageCoin at 128 cells) as a
// 3MF through packages/3mf, for
//   uv run --project tools/py tools/py/validate_3mf.py --overlap <file>
// Run from the repo root after npm run build or tsc -b:
//   node tools/inlay/split-fixture.mjs <out.3mf>
// packages/inlay/test/split.test.ts runs it. The test cannot import
// @hackbuild/3mf itself (inlay and 3mf are one tier and tools/tiers.json
// lists no inlay to 3mf edge), so the export lives in tools/, which may
// import any workspace package (moved from packages/inlay/scripts/ 2026-10-08).
// The zip dates come from SOURCE_DATE_EPOCH 315532800, never git HEAD.
//
// spec ships TypeScript source with extensionless relative imports and the
// fixture imports inlay src by its .js name; the hook below retries a
// relative specifier that does not resolve with .ts (node 22.18 strips the
// types).

import { existsSync, writeFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";

registerHooks({
  resolve(specifier, context, next) {
    if (/^\.{1,2}\//.test(specifier) && context.parentURL !== undefined) {
      const url = new URL(specifier, context.parentURL);
      if (!existsSync(fileURLToPath(url))) {
        for (const alt of [url.href.replace(/\.js$/, ".ts"), `${url.href}.ts`]) {
          if (existsSync(fileURLToPath(alt))) return next(alt, context);
        }
      }
    }
    return next(specifier, context);
  },
});

const out = process.argv[2];
if (out === undefined) {
  process.stderr.write("usage: node tools/inlay/split-fixture.mjs <out.3mf>\n");
  process.exit(2);
}

const { stageCoin } = await import("../../packages/inlay/test/fixtures/split-coin.ts");
const { build } = await import("@hackbuild/3mf");

const SOURCE_DATE_EPOCH = 315532800;
const { out: staged } = await stageCoin(128);
const parts = staged.bodies.map((b) => ({ name: b.draft.id, slot: b.draft.slot, positions: b.mesh.positions, indices: b.mesh.triangles }));
const built = build({
  filaments: [
    { color: "#1A1A1A", type: "PETG", name: "black" },
    { color: "#F5F0E6", type: "PETG", name: "cream" },
    { color: "#FE0386", type: "PETG", name: "pink" },
  ],
  objects: [{ name: "split-coin", parts }],
  title: "split-coin",
  sourceDateEpoch: SOURCE_DATE_EPOCH,
});
if (!built.ok) {
  process.stderr.write(`${JSON.stringify(built)}\n`);
  process.exit(1);
}
writeFileSync(out, await built.zip());
process.stdout.write(`${out} ${built.artifactHash}\n`);
