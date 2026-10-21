// Writes packages/inlay/test/fixtures/quantize-golden.json by running the
// quantize cases (test/fixtures/quantize-cases.ts) through the original code:
// COLLAR renderLayer's palette and mono branches and hex2rgb, and SPRUE
// autoThreshold, each cut from the original file by its first and last line
// and run as written. The port is compared against these digests and never
// against itself (M03-T03). Run from the repo root:
//   node packages/inlay/scripts/quantize-golden.mjs
// It refuses when an original's sha256 differs from its lineage.json row or
// a cut does not start and end on the lines the card names.

import { readFileSync, writeFileSync } from "node:fs";
import { localSource } from "../../../tools/test-support/originals-root.ts";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const { sha256Hex } = await import(pathToFileURL(join(root, "spec/jcs.ts")).href);
const { quantizeCases, otsuCases } = await import(pathToFileURL(join(root, "packages/inlay/test/fixtures/quantize-cases.ts")).href);

const ROWS = { quantize: "collar.bench/inlay-quantize", otsu: "sprue.bench/inlay-otsu" };
const rows = JSON.parse(readFileSync(join(root, "lineage.json"), "utf8"));
const sources = {};
const text = {};
for (const [name, id] of Object.entries(ROWS)) {
  const row = rows.find((r) => r.id === id);
  if (!row) throw new Error(`lineage.json has no row ${id}`);
  const bytes = readFileSync(localSource(row.source));
  const got = sha256Hex(new Uint8Array(bytes));
  if (got !== row.sha256) throw new Error(`${row.source} sha256 ${got}, lineage row ${id} records ${row.sha256}`);
  sources[name] = { id, sha256: got };
  text[name] = bytes.toString("utf8").split("\n");
}

/** Lines first to last (1-based, inclusive), checked against the markers they must start and end with. */
function cut(lines, first, last, head, tail) {
  const a = lines[first - 1]?.trim() ?? "", b = lines[last - 1]?.trim() ?? "";
  if (!a.startsWith(head) || !b.startsWith(tail)) throw new Error(`cut ${first} to ${last} reads "${a}" .. "${b}"`);
  return lines.slice(first - 1, last).join("\n");
}

// collar.html 1086 to 1116: the read back, palette branch and mono or alpha
// branch of renderLayer. 1119 to 1123: hex2rgb.
const layerBody = cut(text.quantize, 1086, 1116, "const d = SCTX.getImageData(0, 0, res, res).data;", "return { mask: map, slot: L.slot };");
const hexSrc = cut(text.quantize, 1119, 1123, "function hex2rgb(h) {", "}");
const renderImage = new Function("SCTX", "res", "L", "ST", `${hexSrc}\n${layerBody}`);
// sprue.html 1517 to 1538: autoThreshold (the card cites 1517 to 1540, which runs into the next section comment).
const otsuSrc = cut(text.otsu, 1517, 1538, "function autoThreshold(img) {", "}");
const autoThreshold = new Function("document", `${otsuSrc}\nreturn autoThreshold;`);

const digest = (labels) => {
  const counts = {};
  for (const v of labels) counts[v] = (counts[v] ?? 0) + 1;
  return { sha256: sha256Hex(labels), counts };
};

const cases = {};
for (const c of quantizeCases()) {
  const { width: res, height, data } = c.img;
  if (res !== height) throw new Error(`${c.id}: COLLAR reads a square grid`);
  const SCTX = { getImageData: () => ({ data }) };
  const slots = c.opts.slots ?? [];
  const ST = { nSlots: slots.length, slots: slots.map((color) => ({ color })), base: c.opts.body };
  const L = { mode: c.mode, thr: c.opts.thr, invert: c.opts.invert, slot: c.opts.slot };
  const out = renderImage(SCTX, res, L, ST);
  const flipped = out.map ?? out.mask.map((v) => (v ? out.slot : 0));
  // The source writes row res - 1 - j; quantize leaves rows in read order
  // (card step 6), so the golden records the rows put back.
  const labels = new Uint8Array(res * res);
  for (let j = 0; j < res; j++) labels.set(flipped.subarray((res - 1 - j) * res, (res - j) * res), j * res);
  cases[c.id] = digest(labels);
}

for (const c of otsuCases()) {
  const { width, height, data } = c.img;
  const document = {
    createElement: () => {
      const canvas = {
        width: 0,
        height: 0,
        getContext: () => ({
          drawImage: () => {},
          getImageData: (x, y, w, h) => {
            // Identity draw: the fixture is already at the size the source scales to.
            if (w !== width || h !== height) throw new Error(`${c.id}: source scaled to ${w} x ${h}, fixture is ${width} x ${height}`);
            return { data };
          },
        }),
      };
      return canvas;
    },
  };
  cases[`otsu-${c.id}`] = autoThreshold(document)({ width, height });
}

const golden = { producedBy: "packages/inlay/scripts/quantize-golden.mjs", sources, cases };
writeFileSync(join(root, "packages/inlay/test/fixtures/quantize-golden.json"), JSON.stringify(golden, null, 2) + "\n");
console.log(`wrote ${Object.keys(cases).length} cases`);
