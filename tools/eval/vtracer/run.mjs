// tools/eval/vtracer/run.mjs
// M03-T11: vtracer 1.0.0-alpha.4 against the in-house quantize, one row per
// corpus input. Evaluation only; nothing here is imported by packages/*.
//
// Route A (in-house): intake trim, quantize (palette or Otsu mono), the
// print-forge hygiene recipe. Route B (vtracer): colour clustering, cutout,
// polygon mode, fixed palette of the same slot colours, filter-speckle from
// route A's despeckle cell count; its SVG paths are filled onto the same grid
// with geom fillPolygonEvenOdd, then the same recipe runs.
//
// Route A and the even-odd fill come from the built packages and nowhere
// else (one implementation each). When a binding is missing the row prints
// "not run" in that column and the process exits 2, so a partial table is
// never read as a pass.
//
// Usage: node tools/eval/vtracer/run.mjs <corpus dir> [--json <out file>]

import { readFileSync, writeFileSync, statSync } from "node:fs";
import { createRequire, register } from "node:module";
import { cpus, release, totalmem, platform, arch } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { inflateSync } from "node:zlib";
import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..", "..");
const require = createRequire(import.meta.url);
/** vtracer loads on first use, so the pure helpers import without it installed. */
let vt = null;
function vtracer() { return (vt ??= require("@visioncortex/vtracer")); }
const vtracerDir = () => dirname(require.resolve("@visioncortex/vtracer/package.json"));

/** Grid and recipe inputs of the card (M03-T11 step 2); the physical numbers come from profile. */
const RES_PX_PER_MM = 8;
/** Art long side on the grid, mm (inferred: the card names none; a 44 mm COLLAR blank less its rim). */
const ART_LONG_MM = 40;
const RUNS = 5;

const sha = (b) => createHash("sha256").update(b).digest("hex");
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };

// ---------------------------------------------------------------- corpus

export function readCorpus(dir) {
  const sums = readFileSync(join(dir, "SHA256SUMS"), "utf8").trim().split("\n");
  const manifest = JSON.parse(readFileSync(join(dir, "inputs.json"), "utf8")).inputs;
  const rows = sums.map((line) => {
    const m = /^([0-9a-f]{64}) {2}(.+)$/.exec(line);
    if (!m) throw new Error(`SHA256SUMS: unreadable line "${line}"`);
    const bytes = readFileSync(join(dir, m[2]));
    if (sha(bytes) !== m[1]) throw new Error(`${m[2]}: sha256 ${sha(bytes)}, SHA256SUMS records ${m[1]}`);
    const spec = manifest[m[2]];
    if (!spec) throw new Error(`${m[2]}: no entry in inputs.json`);
    return { name: m[2], bytes, spec };
  });
  const extra = Object.keys(manifest).filter((k) => !rows.some((r) => r.name === k));
  if (extra.length) throw new Error(`inputs.json names files missing from SHA256SUMS: ${extra.join(", ")}`);
  return rows;
}

/** 8-bit, non-interlaced PNG (grey, grey+alpha, RGB, RGBA) to RGBA. Refuses anything else. */
export function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error("not a PNG");
  let p = 8, w = 0, h = 0, depth = 0, ct = 0, il = 0;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString("latin1", p + 4, p + 8), data = buf.subarray(p + 8, p + 8 + len);
    if (type === "IHDR") { w = data.readUInt32BE(0); h = data.readUInt32BE(4); depth = data[8]; ct = data[9]; il = data[12]; }
    else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    p += 12 + len;
  }
  const ch = { 0: 1, 2: 3, 4: 2, 6: 4 }[ct];
  if (depth !== 8 || il !== 0 || !ch) throw new Error(`PNG depth ${depth}, colour type ${ct}, interlace ${il}: unsupported`);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * ch, out = new Uint8ClampedArray(w * h * 4), prev = new Uint8Array(stride), cur = new Uint8Array(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const v = raw[y * (stride + 1) + 1 + x], a = x >= ch ? cur[x - ch] : 0, b = prev[x], c = x >= ch ? prev[x - ch] : 0;
      let r;
      if (f === 0) r = v; else if (f === 1) r = v + a; else if (f === 2) r = v + b; else if (f === 3) r = v + ((a + b) >> 1);
      else { const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c); r = v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); }
      cur[x] = r & 255;
    }
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4, s = x * ch;
      if (ch <= 2) { out[o] = out[o + 1] = out[o + 2] = cur[s]; out[o + 3] = ch === 2 ? cur[s + 1] : 255; }
      else { out[o] = cur[s]; out[o + 1] = cur[s + 1]; out[o + 2] = cur[s + 2]; out[o + 3] = ch === 4 ? cur[s + 3] : 255; }
    }
    prev.set(cur);
  }
  return { width: w, height: h, data: out };
}

/**
 * Nearest sample at cell centres of `box` onto gw x gh cells. The browser
 * does this resample on a canvas (bench-core); here both routes read the same
 * samples, so the comparison does not depend on the resampler.
 */
export function resample(img, box, gw, gh) {
  const kx = gw / box.w, ky = gh / box.h;
  const data = new Uint8ClampedArray(gw * gh * 4);
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    const sx = Math.min(img.width - 1, box.x + Math.floor((i + 0.5) / kx)), sy = Math.min(img.height - 1, box.y + Math.floor((j + 0.5) / ky));
    data.set(img.data.subarray((sy * img.width + sx) * 4, (sy * img.width + sx) * 4 + 4), (j * gw + i) * 4);
  }
  return { width: gw, height: gh, data };
}

/** The art long side at ART_LONG_MM on the RES_PX_PER_MM grid. */
export function toGrid(img, box) {
  const k = (ART_LONG_MM * RES_PX_PER_MM) / Math.max(box.w, box.h);
  return resample(img, box, Math.max(1, Math.round(box.w * k)), Math.max(1, Math.round(box.h * k)));
}

// ---------------------------------------------------------------- bindings

/** Each entry names the package, the export and the card that adds it. */
const NEEDS = [
  ["inlay", "contentBounds", "M03-T02"],
  ["inlay", "quantize", "M03-T03"],
  ["inlay", "otsu", "M03-T03"],
  ["inlay", "otsuSize", "M03-T03"],
  ["inlay", "hygiene", "M03-T05"],
  ["inlay", "checkInl01", "M03-T08"],
  ["inlay", "checkInl02", "M03-T08"],
  ["geom", "fillPolygonEvenOdd", "M03-T04"],
  ["geom", "flattenSvgPath", "M03-T04"],
  ["profile", "minFeature", "M03-T07 or T08 (profile row)"],
];

async function bind() {
  register(pathToFileURL(join(REPO, "core", "dist", "resolve-hook.js")).href, import.meta.url);
  const mods = {};
  for (const pkg of ["inlay", "geom", "profile"]) {
    try { mods[pkg] = await import(`@hackbuild/${pkg}`); }
    catch (e) { mods[pkg] = {}; mods[`${pkg}Error`] = String(e.message ?? e); }
  }
  const b = { missing: [] };
  const prof = mods.profile;
  let constants = null;
  if (prof.loadProfile) { try { constants = prof.loadProfile().constants; } catch { constants = null; } }
  const constant = (id) => {
    try { return constants && prof.findConstant ? prof.findConstant(constants, id) : null; } catch { return null; }
  };
  for (const [pkg, name, card] of NEEDS) {
    if (pkg === "profile") {
      const row = constant("inlay.minFeature") ?? constant("minFeature");
      if (row) b.minFeature = row; else b.missing.push(`profile constant inlay.minFeature (${card})`);
      continue;
    }
    const fn = mods[pkg][name];
    if (typeof fn === "function") b[name] = fn; else b.missing.push(`${pkg}.${name} (${card})`);
  }
  const factor = constant("despeckle.factor");
  if (factor) b.despeckleFactor = factor; else b.missing.push("profile constant despeckle.factor");
  return b;
}

// ---------------------------------------------------------------- vtracer svg

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

export function svgPaths(svg) {
  const out = [];
  for (const m of svg.matchAll(/<path\b([^>]*)\/>/g)) {
    const at = (k) => (new RegExp(`\\b${k}="([^"]*)"`).exec(m[1]) ?? [])[1];
    const t = /translate\(([-\d.]+),([-\d.]+)\)/.exec(at("transform") ?? "");
    out.push({ d: at("d") ?? "", fill: (at("fill") ?? "#000000").toUpperCase(), tx: t ? +t[1] : 0, ty: t ? +t[2] : 0 });
  }
  return out;
}

export function vtracerOptions(palette, speckleCells) {
  // Measured on this pin: filterSpeckle is a side length; a patch of area at
  // most filterSpeckle^2 is dropped. The side whose square stays under the
  // route A despeckle cell count is the nearest equal.
  const side = Math.max(1, Math.floor(Math.sqrt(Math.max(1, speckleCells - 1))));
  return { clustering: "color-cluster", hierarchical: "cutout", mode: "polygon", palette, filterSpeckle: side };
}

// ---------------------------------------------------------------- one input

/**
 * Palette index to the label quantize writes: in palette mode entry q is
 * slot q + 1 and the body (entry 0) stays 0; mono writes slot 1 on a hit.
 */
export function labelMap(isMono) {
  return (i) => (i === 0 ? 0 : isMono ? 1 : i + 1);
}

/** `labelOf` maps a palette index to the label route A writes for it. */
export function routeB(grid, palette, speckleCells, b, labelOf = (i) => i) {
  const opts = vtracerOptions(palette, speckleCells);
  const rgba = new Uint8Array(grid.data.buffer, grid.data.byteOffset, grid.data.byteLength);
  let svg = "";
  const times = [];
  for (let r = 0; r < RUNS; r++) { const t0 = performance.now(); svg = vtracer().convertPixels(rgba, grid.width, grid.height, opts); times.push(performance.now() - t0); }
  const paths = svgPaths(svg);
  const res = { svgBytes: Buffer.byteLength(svg), paths: paths.length, traceMs: median(times), filterSpeckle: opts.filterSpeckle };
  if (!b.fillPolygonEvenOdd || !b.flattenSvgPath) return res;
  const n = grid.width * grid.height, cover = new Uint8Array(n), labels = new Uint8Array(n);
  const slotOf = new Map(palette.map((h, i) => [h.toUpperCase(), i]));
  const t0 = performance.now();
  // geom fills a grid centred on the origin, y up, at res cells per mm. At
  // res 1 one SVG pixel is one cell; the affine moves the SVG frame (origin
  // top left, y down) there, and row order "top" puts SVG row 0 in row 0.
  const cells = { w: grid.width, h: grid.height, res: 1 };
  for (const p of paths) {
    const rings = b.flattenSvgPath(p.d, [1, 0, 0, -1, p.tx - grid.width / 2, grid.height / 2 - p.ty]);
    const mask = b.fillPolygonEvenOdd(cells, rings, "top");
    const slot = labelOf(slotOf.get(p.fill) ?? nearestSlot(hex(p.fill), palette));
    for (let i = 0; i < n; i++) if (mask[i]) { cover[i] = Math.min(255, cover[i] + 1); labels[i] = slot; }
  }
  res.fillMs = performance.now() - t0;
  res.uncovered = cover.reduce((s, c) => s + (c === 0 ? 1 : 0), 0);
  res.overlapped = cover.reduce((s, c) => s + (c > 1 ? 1 : 0), 0);
  res.seamCells = res.uncovered + res.overlapped;
  res.labels = labels;
  return res;
}

function nearestSlot(rgb, palette) {
  let best = 0, bd = Infinity;
  palette.forEach((h, i) => { const [r, g, bl] = hex(h); const d = 0.3 * (r - rgb[0]) ** 2 + 0.59 * (g - rgb[1]) ** 2 + 0.11 * (bl - rgb[2]) ** 2; if (d < bd) { bd = d; best = i; } });
  return best;
}

/**
 * The print-forge context route A and route B share. The body is label 0
 * (labelMap), so it is the host cells fall back to; the art slots are 1 to
 * the palette length in palette mode and 1 in mono. Boost 0.15 mm is the
 * INLAY default (recipes.ts); despeckle runs at the profile factor.
 */
export function hygieneCtx(isMono, palette, minF, despeckleFactor) {
  return { boost: 0.15, gap: 0, minF, despeck: true, despeckleFactor, host: 0, slots: isMono ? 1 : palette.length };
}

function evaluate(input, b) {
  const img = decodePng(input.bytes);
  const row = { input: input.name, source: `${img.width} x ${img.height}`, mode: input.spec.mode };
  const box = b.contentBounds ? b.contentBounds(img, 8) : null;
  const trim = box ? { x: box.x ?? box.x0, y: box.y ?? box.y0, w: box.w ?? box.width, h: box.h ?? box.height } : { x: 0, y: 0, w: img.width, h: img.height };
  row.trimRun = Boolean(b.contentBounds);
  const grid = toGrid(img, trim);
  row.grid = `${grid.width} x ${grid.height}`;
  const minF = b.minFeature?.value;
  const factor = b.despeckleFactor?.value;
  const speckleCells = minF && factor ? Math.round(factor * Math.PI * ((minF / 2) * RES_PX_PER_MM) ** 2) : 6;
  row.speckleCells = speckleCells;
  const isMono = input.spec.mode === "mono";
  let palette = input.spec.palette;
  let mono = null;
  if (isMono) {
    // Body first: a hit is ink on a light ground, or light on a dark ground when Otsu flips.
    if (b.otsu && b.otsuSize) {
      const s = b.otsuSize(grid.width, grid.height);
      mono = b.otsu(resample(grid, { x: 0, y: 0, w: grid.width, h: grid.height }, s.width, s.height));
      row.otsu = `${mono.thr}${mono.invert ? " inverted" : ""}`;
    }
    palette = mono?.invert ? ["#000000", "#FFFFFF"] : ["#FFFFFF", "#000000"];
  }
  const labelOf = labelMap(isMono);
  const B = routeB(grid, palette, speckleCells, b, labelOf);
  Object.assign(row, { bPaths: B.paths, bSvgBytes: B.svgBytes, bTraceMs: B.traceMs, bFilterSpeckle: B.filterSpeckle, bSeamCells: B.seamCells, bUncovered: B.uncovered, bOverlapped: B.overlapped });
  const diff = (x, y) => x.reduce((s, v, i) => s + (v !== y[i] ? 1 : 0), 0);
  if (!b.quantize || (isMono && !mono)) return row;
  const times = [];
  let aRaw = null;
  for (let r = 0; r < RUNS; r++) {
    const t0 = performance.now();
    aRaw = isMono ? b.quantize(grid, "mono", { res: RES_PX_PER_MM, slot: 1, thr: mono.thr, invert: mono.invert }) : b.quantize(grid, "palette", { res: RES_PX_PER_MM, slots: palette, body: 1 });
    times.push(performance.now() - t0);
  }
  row.aMs = median(times);
  if (B.labels) row.rawAgreePct = 100 * (1 - diff(aRaw.labels, B.labels) / aRaw.labels.length);
  if (!b.hygiene || !B.labels || !minF) return row;
  const ctx = hygieneCtx(isMono, palette, minF, factor);
  const aClean = b.hygiene(aRaw, "print-forge", ctx), bClean = b.hygiene({ ...aRaw, labels: B.labels }, "print-forge", ctx);
  row.agreePct = 100 * (1 - diff(aClean.labels, bClean.labels) / aClean.labels.length);
  row.aHygieneCells = diff(aRaw.labels, aClean.labels);
  row.bHygieneCells = diff(B.labels, bClean.labels);
  if (!b.checkInl01 || !b.checkInl02) return row;
  const c1 = { minF, host: ctx.host }, c2 = { minF, despeckleFactor: factor, host: ctx.host };
  row.aInl01 = b.checkInl01(aClean, c1).verdict; row.bInl01 = b.checkInl01(bClean, c1).verdict;
  row.aInl02 = b.checkInl02(aClean, c2).verdict; row.bInl02 = b.checkInl02(bClean, c2).verdict;
  return row;
}

// ---------------------------------------------------------------- main

function bakeBytes() {
  const wasm = statSync(join(vtracerDir(), "pkg", "vtracer_wasm_bg.wasm")).size;
  const glue = statSync(join(vtracerDir(), "pkg", "vtracer_wasm.js")).size + statSync(join(vtracerDir(), "index.js")).size;
  return { wasm, glue, embedded: Math.ceil(wasm / 3) * 4 + glue };
}

const fmt = (v, d = 0) => (v === undefined || v === null ? "not run" : typeof v === "number" ? v.toFixed(d) : String(v));

async function main() {
  const args = process.argv.slice(2);
  const dir = args[0];
  if (!dir) { process.stderr.write("usage: node tools/eval/vtracer/run.mjs <corpus dir> [--json <out file>]\n"); process.exit(1); }
  const jsonAt = args.indexOf("--json") >= 0 ? args[args.indexOf("--json") + 1] : null;
  const inputs = readCorpus(resolve(dir));
  const b = await bind();
  const bake = bakeBytes();
  const machine = `${cpus()[0]?.model ?? "unknown cpu"}, ${cpus().length} cores, ${Math.round(totalmem() / 2 ** 30)} GiB, ${platform()} ${release()} ${arch()}, node ${process.version}`;
  process.stdout.write(`machine: ${machine}\nvtracer ${require("@visioncortex/vtracer/package.json").version} under node (wasm, route npm); ${RUNS} runs per route, median; grid ${RES_PX_PER_MM} px/mm, art long side ${ART_LONG_MM} mm\n`);
  process.stdout.write(`bake bytes added by route B (measured): wasm ${bake.wasm}, js glue ${bake.glue}, embedded as base64 ${bake.embedded}; route A adds 0\n`);
  const cols = ["input", "mode", "grid", "otsu", "raw agree %", "agree %", "B seam cells (zero / two+)", "A hyg cells", "B hyg cells", "A INL-01", "B INL-01", "A INL-02", "B INL-02", "A ms", "B trace ms", "B paths", "B svg bytes"];
  process.stdout.write(cols.join(" | ") + "\n");
  const rows = [];
  for (const input of inputs) {
    const r = evaluate(input, b);
    rows.push(r);
    process.stdout.write([r.input, r.mode, r.grid, r.mode === "mono" ? fmt(r.otsu) : "n/a", fmt(r.rawAgreePct, 2), fmt(r.agreePct, 2), r.bSeamCells === undefined ? "not run" : `${r.bSeamCells} (${r.bUncovered} / ${r.bOverlapped})`, fmt(r.aHygieneCells), fmt(r.bHygieneCells), fmt(r.aInl01), fmt(r.bInl01), fmt(r.aInl02), fmt(r.bInl02), fmt(r.aMs, 1), fmt(r.bTraceMs, 1), fmt(r.bPaths), fmt(r.bSvgBytes)].join(" | ") + "\n");
  }
  if (jsonAt) writeFileSync(jsonAt, JSON.stringify({ machine, bake, rows }, null, 2) + "\n");
  if (b.missing.length) {
    process.stderr.write(`route A not run; missing bindings: ${b.missing.join("; ")}\n`);
    process.exit(2);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((e) => { process.stderr.write(`${e.stack ?? e}\n`); process.exit(1); });
}
