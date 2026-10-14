// Captures the M03-T05 hygiene fixtures from the legacy benches in a real
// browser and writes them under packages/inlay/test/fixtures/. The pages are
// read, never edited. Run from the repo root:
//   node packages/inlay/scripts/hygiene-fixtures.mjs
//
// COLLAR (designs/collar/legacy/collar.html, sha256 in legacy/sha256.txt):
// boot, apply the 'hack.build coin' preset (collar.html:2852), wait for the
// mark image and Permanent Marker, then per face at res 512 record the slot
// grid buildFace holds just before its hygiene comment (collar.html:1126 to
// 1148, cut from buildFace's own source) and the grid buildFace returns.
// The back face pre-hygiene grid is collar-back-512.labels.bin (card file);
// everything else goes in collar-512.legacy.json.gz with per-slot island
// counts made in the page by a flood fill written here, not by the port.
//
// SPRUE (lineage sprue.bench/sprue-html): boot runs the phx preset; per face
// record compose(side, null, true), compose(side), the ring mask, and per
// layer compose(side, [L], true), compose(side, [L]) and the L.thin flag the
// page set (sprue.html:1112 to 1124). Written to sprue-phx.legacy.json.gz.
//
// Driver: puppeteer-core from HBF_PUPPETEER_DIR with system Chrome headless.
// Playwright 1.63 refuses this macOS 12 host, so the Playwright form is not
// run here. Fonts load from Google Fonts; the script refuses when
// Permanent Marker did not load, since a fallback face moves the full stop.

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const FIX = join(ROOT, "packages/inlay/test/fixtures");
const COLLAR = join(ROOT, "designs/collar/legacy/collar.html");
const PUPPETEER_DIR = process.env.HBF_PUPPETEER_DIR ?? "/Users/obsidian/Projects/hackbuild/fab-knowledge/originals/_tools";
const CHROME = process.env.HBF_CHROMIUM ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const sha256 = (b) => createHash("sha256").update(b).digest("hex");
const rows = JSON.parse(readFileSync(join(ROOT, "lineage.json"), "utf8"));
const sprueRow = rows.find((r) => r.id === "sprue.bench/sprue-html");
const collarWant = readFileSync(join(ROOT, "designs/collar/legacy/sha256.txt"), "utf8").split(/\s+/)[0];
if (sha256(readFileSync(COLLAR)) !== collarWant) throw new Error("collar.html does not match legacy/sha256.txt");
if (sha256(readFileSync(sprueRow.source)) !== sprueRow.sha256) throw new Error(`${sprueRow.source} does not match lineage ${sprueRow.id}`);

const require = createRequire(join(PUPPETEER_DIR, "package.json"));
const puppeteer = require("puppeteer-core");
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--allow-file-access-from-files", "--no-first-run"] });
const driver = `puppeteer-core ${require("puppeteer-core/package.json").version}, ${await browser.version()}`;
const b64 = (a) => Buffer.from(a).toString("base64");

async function waitFor(page, fn, what) {
  const t0 = Date.now();
  while (Date.now() - t0 < 30000) {
    if (await page.evaluate(fn)) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`${what} never happened within 30 s`);
}

try {
  // ---- COLLAR
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(pathToFileURL(COLLAR).href, { waitUntil: "networkidle0" });
  await waitFor(page, () => document.fonts.status === "loaded" && /tris/.test(document.querySelector("#status")?.textContent ?? ""), "collar boot build");
  await page.evaluate(() => applyPreset("hack.build coin", true));
  await waitFor(page, () => ST.faces.front[0]?.img?.complete === true, "mark image load");
  const collar = await page.evaluate(async () => {
    await document.fonts.load('40px "Permanent Marker"');
    const font = document.fonts.check('40px "Permanent Marker"');
    const src = buildFace.toString();
    const at = src.indexOf("/* per slot hygiene");
    if (at < 0) throw new Error("buildFace has no hygiene comment");
    const pre = (0, eval)("(" + src.slice(0, at) + "return { out, holes }; })");
    const islands = (g, res) => {
      const seen = new Uint8Array(g.length), per = {};
      for (let s = 0; s < g.length; s++) {
        if (!g[s] || seen[s]) continue;
        const v = g[s], st = [s];
        seen[s] = 1;
        let size = 0;
        while (st.length) {
          const p = st.pop(); size++;
          const i = p % res, j = (p - i) / res;
          for (const q of [i > 0 ? p - 1 : -1, i < res - 1 ? p + 1 : -1, j > 0 ? p - res : -1, j < res - 1 ? p + res : -1]) {
            if (q >= 0 && !seen[q] && g[q] === v) { seen[q] = 1; st.push(q); }
          }
        }
        (per[v] ??= []).push(size);
      }
      return per;
    };
    const res = 512, out = {};
    for (const face of ["front", "back"]) {
      const a = pre(face, res).out, b = buildFace(face, res).art;
      out[face] = { pre: Array.from(a), post: Array.from(b), islandsPre: islands(a, res), islandsPost: islands(b, res) };
    }
    return { font, res, dia: ST.dia, art: ST.art, rArt: R_ART(), back: ST.faces.back.map((L) => ({ text: L.text, font: L.font, size: L.size, slot: L.slot, accent: L.accent, runGap: L.runGap })), faces: out };
  });
  if (errors.length) throw new Error(`collar page errors: ${errors.join("; ")}`);
  if (!collar.font) throw new Error("Permanent Marker did not load; the fixture needs the real face");
  const backPre = Uint8Array.from(collar.faces.back.pre);
  writeFileSync(join(FIX, "collar-back-512.labels.bin"), backPre);
  const collarJson = {
    source: { file: "designs/collar/legacy/collar.html", sha256: collarWant, preset: "hack.build coin", driver },
    res: collar.res, dia: collar.dia, art: collar.art, rArt: collar.rArt, back: collar.back,
    faces: Object.fromEntries(Object.entries(collar.faces).map(([k, f]) => [k, { pre: b64(Uint8Array.from(f.pre)), post: b64(Uint8Array.from(f.post)), islandsPre: f.islandsPre, islandsPost: f.islandsPost }])),
  };
  writeFileSync(join(FIX, "collar-512.legacy.json.gz"), gzipSync(JSON.stringify(collarJson), { level: 9, mtime: 0 }));
  await page.close();

  // ---- SPRUE
  const sp = await browser.newPage();
  const spErr = [];
  sp.on("pageerror", (e) => spErr.push(String(e)));
  await sp.goto(pathToFileURL(sprueRow.source).href, { waitUntil: "networkidle0" });
  await waitFor(sp, () => globalThis.SPRUE_APP !== undefined && document.fonts.status === "loaded", "sprue boot");
  const sprue = await sp.evaluate(async () => {
    const A = globalThis.SPRUE_APP;
    await document.fonts.ready;
    A.renderFaces();
    const g = A.geo();
    const pack = (m) => ({ w: m.w, h: m.h, d: Array.from(m.d) });
    const faces = {};
    for (const side of ["front", "back"]) {
      faces[side] = {
        raw: pack(A.compose(side, null, true)),
        clean: pack(A.compose(side)),
        layers: A.ST.faces[side].filter((L) => !L.mute).map((L) => ({ kind: L.kind, text: L.text ?? null, thin: L.thin ?? null, raw: pack(A.compose(side, [L], true)), clean: pack(A.compose(side, [L])) })),
      };
    }
    return { st: { kind: A.ST.kind, ring: A.ST.ring ?? null, minF: A.ST.minF, minGap: A.ST.minGap, ppm: g.ppm }, ring: pack(g.ring), zone: pack(g.zone), faces };
  });
  if (spErr.length) throw new Error(`sprue page errors: ${spErr.join("; ")}`);
  const m64 = (m) => ({ w: m.w, h: m.h, d: b64(Uint8Array.from(m.d)) });
  const sprueJson = {
    source: { file: sprueRow.source, lineage: sprueRow.id, sha256: sprueRow.sha256, preset: "phx (boot)", driver },
    st: sprue.st, ring: m64(sprue.ring), zone: m64(sprue.zone),
    faces: Object.fromEntries(Object.entries(sprue.faces).map(([k, f]) => [k, { raw: m64(f.raw), clean: m64(f.clean), layers: f.layers.map((L) => ({ ...L, raw: m64(L.raw), clean: m64(L.clean) })) }])),
  };
  writeFileSync(join(FIX, "sprue-phx.legacy.json.gz"), gzipSync(JSON.stringify(sprueJson), { level: 9, mtime: 0 }));

  const files = ["collar-back-512.labels.bin", "collar-512.legacy.json.gz", "sprue-phx.legacy.json.gz"];
  writeFileSync(join(FIX, "collar-back-512.sha256"), files.map((f) => `${sha256(readFileSync(join(FIX, f)))}  ${f}\n`).join(""));
  console.log(readFileSync(join(FIX, "collar-back-512.sha256"), "utf8"));
} finally {
  await browser.close();
}
