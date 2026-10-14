// M00-T11 step 2: drive the legacy COLLAR bench (designs/collar/legacy/collar.html)
// from file:// and record what the port is compared against, in
// tools/corpus/collar/legacy-defaults.json. The page is read, never edited:
// COLLAR has no BENCH hook (knowledge/designs/collar.md F1), so the script
// reaches the page's global lexical scope. A needed function that is not a
// page global is a blocker; the script exits 1 and names it.
//
// Two rows:
// - literal: boot applies the 'blank coin' preset (collar.html lines 2836
//   to 2848 and 3170 to 3177), so the script then assigns the line 643 ST
//   values in page code and calls buildMesh(). Expected parts slot 1 and 3.
// - booted: the page as boot leaves it (edge plain, rim off), one part.
//
// Per row: per part {slot, name, tris, volume, bbox} with the signed volume
// summed in float64 over the float32 positions; the planSlabs bands with
// per slot cell counts and a sha256 of each labelSlab grid; the seed healer
// (packages/mesh/seed/rastermesh.js, lineage healer rows) run on those
// bands, for its changed count; the same bands with each bound snapped to
// the 1/1024 mm grid, relabelled by the legacy labelSlab and measured by the
// legacy estimateVolume; and the per-filament key list of
// projectSettings(parts), which returns JSON text.
//
// Driver: Playwright 1.63.0 (D-040) by default, the browser from
// HBF_CHROMIUM when set. HBF_DRIVER=puppeteer runs puppeteer-core from
// HBF_PUPPETEER_DIR instead, with HBF_CHROMIUM or system Chrome; Playwright
// 1.63 refuses macOS 12 hosts.
//
// usage: node tools/legacy/collar-dump.mjs [out.json]
// exit 0 written, 1 on a blocker or a page error

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SRC = join(ROOT, "designs", "collar", "legacy", "collar.html");
const SEED = join(ROOT, "packages", "mesh", "seed", "rastermesh.js");
const OUT = resolve(process.argv[2] ?? join(ROOT, "tools", "corpus", "collar", "legacy-defaults.json"));
const MAC_CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PUPPETEER_DIR = process.env.HBF_PUPPETEER_DIR ?? "/Users/obsidian/Projects/hackbuild/fab-knowledge/originals/_tools";
const NEEDED = ["buildMesh", "planSlabs", "insetAt", "labelSlab", "estimateVolume", "projectSettings"];

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
const expectSha = readFileSync(join(ROOT, "designs", "collar", "legacy", "sha256.txt"), "utf8").split(/\s+/)[0];
const html = readFileSync(SRC);
if (sha256(html) !== expectSha) {
  console.error(`collar.html sha256 ${sha256(html)} does not match legacy/sha256.txt ${expectSha}; restore the legacy copy`);
  process.exit(1);
}

async function launch() {
  const exe = process.env.HBF_CHROMIUM;
  if ((process.env.HBF_DRIVER ?? "playwright") === "puppeteer") {
    const require = createRequire(join(PUPPETEER_DIR, "package.json"));
    const puppeteer = require("puppeteer-core");
    const path = exe ?? (existsSync(MAC_CHROME) ? MAC_CHROME : undefined);
    if (path === undefined) throw new Error("no browser: set HBF_CHROMIUM to a Chrome or Chromium binary");
    const browser = await puppeteer.launch({ executablePath: path, headless: true, args: ["--allow-file-access-from-files", "--no-first-run"] });
    return { browser, driver: `puppeteer-core ${require("puppeteer-core/package.json").version}`, version: await browser.version() };
  }
  const { chromium } = await import("playwright");
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  return { browser, driver: "playwright", version: browser.version() };
}

async function ready(page) {
  const t0 = Date.now();
  while (Date.now() - t0 < 30000) {
    const s = await page.evaluate(() => document.querySelector("#status")?.textContent ?? "");
    if (/ready/.test(s)) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("collar.html status never read ready within 30 s");
}

// Runs as page code: ST is a const of the page script, not a window property.
function measure(baseline) {
  if (baseline === "literal") {
    Object.assign(ST, { dia: 44, thk: 3.6, cham: 0.5, inlay: 1.2, layer: 0.2, res: 512, nSlots: 3, base: 1, presetPattern: "Generic {TYPE} @FF C5P", writeFilaments: true });
    ST.slots = DEF_SLOTS.map((s) => ({ ...s }));
    ST.shape = { kind: "round", aspect: 0.72, corner: 0.3 };
    ST.edge = { style: "reeded", count: 40, depth: 1.0, width: 2.8, twist: 35, gapDeg: 0 };
    ST.rim = { on: true, w: 2.2, slot: 3, dashOn: false, dashN: 12, dashDuty: 45, dashSlot: 2, dashAlt: false, dashSlot2: 1, dashPhase: 0 };
    ST.nfc = { on: false, dia: 26, depth: 0.6, tag: 25 };
    ST.art = { boost: 0.10, gap: 0.45, keep: 1.4, despeck: true, minF: 0.90 };
    ST.faces.front = [];
    ST.faces.back = [];
  }
  const st = JSON.parse(JSON.stringify(ST));
  const M = buildMesh(() => {});
  const parts = M.parts.map((p) => {
    const P = p.pos;
    let v = 0;
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < P.length; i += 9) {
      v += (P[i] * (P[i + 4] * P[i + 8] - P[i + 5] * P[i + 7]) - P[i + 1] * (P[i + 3] * P[i + 8] - P[i + 5] * P[i + 6]) + P[i + 2] * (P[i + 3] * P[i + 7] - P[i + 4] * P[i + 6])) / 6;
    }
    for (let i = 0; i < P.length; i += 3) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], P[i + k]); hi[k] = Math.max(hi[k], P[i + k]); }
    return { slot: p.slot, name: p.name, tris: p.tris, volume: v, bbox: [lo, hi] };
  });

  // the labels exactly as buildMesh makes them, faces empty
  const res = ST.res, n = res * res, mm = ST.dia / res, half = res / 2;
  const D2 = new Float32Array(n), TH = new Float32Array(n);
  for (let j = 0; j < res; j++) for (let i = 0; i < res; i++) {
    const x = (i + 0.5 - half) * mm, y = (j + 0.5 - half) * mm;
    const p = j * res + i;
    D2[p] = Math.hypot(x, y); TH[p] = Math.atan2(y, x);
  }
  const artF = new Uint8Array(n), artB = new Uint8Array(n);
  const b64 = (L) => { let s = ""; for (let i = 0; i < L.length; i += 8192) s += String.fromCharCode.apply(null, L.subarray(i, i + 8192)); return btoa(s); };
  const describe = (z0, z1, L) => {
    const counts = {};
    for (let i = 0; i < L.length; i++) if (L[i]) counts[L[i]] = (counts[L[i]] || 0) + 1;
    return { z0, z1, counts, labels: b64(L) };
  };
  const plan = planSlabs();
  const bands = plan.map(([z0, z1]) => ({ z0, z1, L: labelSlab(z0, z1, artF, artB, null, D2, TH) }));
  const V = RasterMesh.volume(res, res, mm, -half * mm, -half * mm);
  for (const b of bands) V.addSlab(b.L.slice(), b.z0, b.z1);
  const heal = V.fixPinches();
  const q = (z) => Math.round(z * 1024) / 1024;
  const snappedBands = plan.map(([z0, z1]) => ({ z0: q(z0), z1: q(z1), L: labelSlab(q(z0), q(z1), artF, artB, null, D2, TH) }));
  const snappedVolume = estimateVolume(snappedBands, n, mm);

  const raw = projectSettings(M.parts);
  const ps = typeof raw === "string" ? JSON.parse(raw) : raw;
  const nParts = M.parts.length;
  return {
    baseline, st, slabs: M.slabs, mm: M.mm, estimateVolume: M.volume, parts,
    bands: bands.map((b) => describe(b.z0, b.z1, b.L)),
    heal,
    snapped: { bands: snappedBands.map((b) => describe(b.z0, b.z1, b.L)), estimateVolume: snappedVolume },
    projectSettingsType: typeof raw,
    perFilament: Object.keys(ps).filter((k) => Array.isArray(ps[k]) && ps[k].length === nParts).sort(),
    nonList: Object.keys(ps).filter((k) => !Array.isArray(ps[k])).sort(),
    filamentSettingsId: ps.filament_settings_id,
  };
}

const { browser, driver, version } = await launch();
const errors = [];
const rows = [];
try {
  for (const baseline of ["literal", "booted"]) {
    const page = await browser.newPage();
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(pathToFileURL(SRC).href, { waitUntil: "load" });
    await ready(page);
    const missing = await page.evaluate((names) => names.filter((k) => typeof globalThis[k] !== "function"), NEEDED);
    if (missing.length > 0) {
      console.error(`blocker: collar.html does not expose ${missing.join(", ")} as page globals; collar.html is never edited, so the dump stops here`);
      process.exitCode = 1;
      break;
    }
    await page.addScriptTag({ content: readFileSync(SEED, "utf8") });
    rows.push(await page.evaluate(measure, baseline));
    await page.close();
  }
} finally {
  await browser.close();
}
if (process.exitCode === 1) process.exit(1);
if (errors.length > 0) {
  console.error(`page errors: ${errors.join(" | ")}`);
  process.exit(1);
}

// Label grids go to a gzip sidecar, one byte per cell, so the JSON stays readable and a
// mismatch can name its cells. Every band carries its byte offset and sha256.
const labelFile = OUT.replace(/\.json$/, ".labels.gz");
const chunks = [];
for (const r of rows) {
  for (const set of [r.bands, r.snapped.bands]) {
    for (const b of set) {
      const bytes = Buffer.from(b.labels, "base64");
      b.offset = chunks.reduce((s, c) => s + c.length, 0);
      b.cells = bytes.length;
      b.sha256 = sha256(bytes);
      delete b.labels;
      chunks.push(bytes);
    }
  }
}
const out = {
  source: relative(ROOT, SRC),
  sha256: expectSha,
  driver,
  browser: version,
  labels: relative(ROOT, labelFile),
  labelsSha256: sha256(Buffer.concat(chunks)),
  rows,
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(labelFile, gzipSync(Buffer.concat(chunks), { level: 9 }));
writeFileSync(OUT, `${JSON.stringify(out, null, 1)}\n`);
for (const r of rows) {
  console.log(`${r.baseline}: ${r.parts.map((p) => `slot ${p.slot} ${p.name} ${p.tris} tris ${p.volume.toFixed(6)} mm3`).join(", ")}; ${r.bands.length} bands, healer changed ${r.heal.changed}, ${r.perFilament.length} per-filament keys (measured)`);
}
console.log(`wrote ${relative(ROOT, OUT)} and ${relative(ROOT, labelFile)} (${driver}, ${version})`);
