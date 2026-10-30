// Captures what BAIL's own painters put on a canvas, so packages/inlay can be
// compared with them without a browser at test time. Loads the canonical
// bench from file:// in system Chrome through the repo's Playwright, runs
// BAIL's paintLayer and circuitOf unchanged (bail.html:1299 and 1408) on the
// layers below and writes packages/inlay/test/fixtures/bail-canvas.json.gz.
//
//   node tools/inlay/bail-canvas.cjs [path to bail.html]
//
// Cells are alpha above 127 (bail.html:1651), rows bottom first, as composeFace
// reads them. The grid is 400 x 320 cells at 8 cells per mm (BAIL print.res default), centred.
const { chromium } = require("playwright");
const { gzipSync } = require("node:zlib");
const { createHash } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..", "..");
const SRC = process.argv[2] || path.resolve(ROOT, "..", "fab-knowledge", "originals", "bail", "files", "bail.html");
const OUT = path.join(ROOT, "packages", "inlay", "test", "fixtures", "bail-canvas.json.gz");
const GRID = { w: 400, h: 320, res: 8 };

const base = { dx: 0, dy: 0, rot: 0, slot: 1, slot2: 2, cut: "none", depth: 1.2, mute: false };
let n = 0;
const L = (kind, o) => ({ id: "c" + n++, kind, ...base, ...o });
const SH = (shape, o) => L("shape", { shape, w: 20, h: 20, t: 1.2, n: 6, ...o });
const CASES = [];
const add = (name, layer) => CASES.push({ name, layer });
for (const s of ["ring", "rect", "ellipse", "frame", "diamond", "chevrons", "grid", "sun", "saguaro", "mesa", "zigzag", "steps", "arrow"]) {
  add(`shape ${s}`, SH(s, { w: 34, h: 22, t: 2.4, n: 5 }));
  add(`shape ${s} moved and turned`, SH(s, { w: 26, h: 30, t: 1.6, n: 3, dx: 3.5, dy: -2, rot: 33 }));
}
add("scope 3 2", L("scope", { a: 3, b: 2, phase: 90, w: 30, h: 22, t: 0.9 }));
add("scope 5 4 turned", L("scope", { a: 5, b: 4, phase: 30, w: 34, h: 28, t: 1.4, rot: 20, dx: 2 }));
for (const [seed, clip] of [[7, "ellipse"], [11, "ellipse"], [42, "rect"], [999, "ellipse"]]) {
  add(`circuit seed ${seed} ${clip}`, L("circuit", { seed, w: 34, h: 36, pitch: 2.4, tw: 0.8, pad: 2.2, drill: 0.7, density: 1, clip }));
}
add("circuit dense moved", L("circuit", { seed: 5, w: 30, h: 26, pitch: 2, tw: 0.7, pad: 2, drill: 0.6, density: 2, clip: "ellipse", dx: -3, dy: 2, rot: 15 }));
add("logo hb", L("logo", { brand: "hb", w: 30 }));
add("logo hsl", L("logo", { brand: "hsl", w: 36 }));
add("logo hb turned", L("logo", { brand: "hb", w: 24, rot: 25, dx: 3, dy: -2 }));
add("logo hsl turned", L("logo", { brand: "hsl", w: 30, rot: -40, dx: -2, dy: 3 }));
const T = (o) => L("text", { text: "T", font: "plex", size: 5, ls: 0, arc: 0, splitGap: 0.6, ...o });
add("text straight", T({ text: "HACK 42", ls: 0 }));
add("text straight spaced", T({ text: "HACK 42", ls: 0.6, dx: 1, dy: -2 }));
add("text split", T({ text: "hack|.build", ls: 0.2, splitGap: 0.8, slot: 1, slot2: 2 }));
add("text arc up", T({ text: "MAKE THINGS", arc: 15.6, ls: 0.6 }));
add("text arc down", T({ text: "BREAK THINGS", arc: -17.2, ls: 0.6 }));
add("text arc moved and turned", T({ text: "MESA AZ", arc: 12, ls: 0.4, dx: 2, dy: 1, rot: 30 }));
add("text turned", T({ text: "AB", size: 9, rot: 40, dx: -3, dy: 2 }));

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--allow-file-access-from-files"] });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 860 } })).newPage();
  await page.goto("file://" + SRC);
  await page.waitForFunction(() => globalThis.BENCH && BENCH.ready === true, null, { timeout: 60000 });
  const out = await page.evaluate(({ cases, grid }) => {
    const { w: W, h: H, res } = grid;
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    const rle = (m) => { const r = []; let cur = 0, run = 0; for (let p = 0; p < m.length; p++) { if (m[p] === cur) run++; else { r.push(run); cur = m[p]; run = 1; } } r.push(run); return r; };
    return cases.map((c) => {
      const parts = partsOf(c.layer);
      const masks = [];
      for (let part = 0; part < parts; part++) {
        ctx.clearRect(0, 0, W, H);
        paintLayer(ctx, c.layer, res, part);
        const a = ctx.getImageData(0, 0, W, H).data, m = new Uint8Array(W * H);
        for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) m[j * W + i] = a[((H - 1 - j) * W + i) * 4 + 3] > 127 ? 1 : 0;
        masks.push(rle(m));
      }
      const o = { name: c.name, layer: c.layer, masks };
      if (c.layer.kind === "circuit") o.circuit = circuitOf(c.layer);
      return o;
    });
  }, { cases: CASES, grid: GRID });
  await browser.close();
  const doc = { source: "fab-knowledge:originals/bail/files/bail.html", sha256: createHash("sha256").update(fs.readFileSync(SRC)).digest("hex"), grid: GRID, cases: out };
  fs.writeFileSync(OUT, gzipSync(Buffer.from(JSON.stringify(doc)), { level: 9 }));
  console.log("wrote", path.relative(ROOT, OUT), fs.statSync(OUT).size, "bytes,", out.length, "cases, sha256", doc.sha256.slice(0, 12));
})().catch((e) => { console.error(e); process.exit(1); });
