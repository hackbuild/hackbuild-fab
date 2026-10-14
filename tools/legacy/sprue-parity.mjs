// M03-T10: SPRUE's faces from sprue.html against @hackbuild/inlay in one
// Chromium. The puppeteer form of tools/py/harness/sprue_parity.py, for
// hosts where Playwright 1.63 refuses to run (macOS 12); both read the same
// page code (designs/sprue/test/legacy-read.js and the bundled
// test/parity.entry.ts) and print the same lines.
//
// usage: node tools/legacy/sprue-parity.mjs [designs/sprue/legacy/sprue.html] [designs/sprue/test/parity.html] [--out DIR]
//
// 1. Checks the legacy page against designs/sprue/legacy/sha256.txt and the
//    print card beside it, cuts checkThin (lines 1114 to 1125) and the two
//    embedded @font-face rules (lines 10 and 11) from it.
// 2. Bundles designs/sprue/test/parity.entry.ts with tsdown 0.23.0 as one IIFE.
// 3. Opens both pages from file:// in one browser. Every http(s) request is
//    aborted; font stylesheet requests (the legacy chrome fonts, which never
//    reach the art) are listed apart, anything else is counted and fails.
// 4. Per scenario: the legacy page runs the preset and reads compose raw and
//    clean and its own checkThin flags; the package page composes the same
//    layers. Gate: 0 differing cells raw and clean on both faces and every
//    thin flag equal, for every scenario.
// 5. Prints per-object volumes: the package build (hbf part.build, pick at
//    the defaults, coin with the coin preset) beside print-card.txt and the
//    legacy browser mesh of the phx and year coin scenarios, with the
//    differences. Informational: the print card comes from the shapely
//    route with sprue.py's own art, so no line here fails the run.
//
// Driver: puppeteer-core from HBF_PUPPETEER_DIR (default the originals
// _tools folder) with HBF_CHROMIUM or system Chrome, headless. HBF_DRIVER=
// playwright runs Playwright instead.
//
// exit 0 parity holds; 1 a difference, a counted request or a page error;
// 2 a missing input or a pin mismatch.

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const MAC_CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PUPPETEER_DIR = process.env.HBF_PUPPETEER_DIR ?? "/Users/obsidian/Projects/hackbuild/fab-knowledge/originals/_tools";
const FLAGS = ["--allow-file-access-from-files", "--no-first-run", "--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"];
/** Scenarios and whether they gate (all do; see legacy-read.js for what each holds). */
const SCENARIOS = ["phx", "phx-small", "coinyear"];
const EPOCH = "315532800";

class Refused extends Error {}

const sha256 = (b) => createHash("sha256").update(b).digest("hex");

function args(argv) {
  const pos = [], out = { out: join(ROOT, ".hbf", "harness", "sprue") };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--out") out.out = resolve(argv[++i]);
    else pos.push(argv[i]);
  }
  out.legacy = resolve(pos[0] ?? join(ROOT, "designs/sprue/legacy/sprue.html"));
  out.parity = resolve(pos[1] ?? join(ROOT, "designs/sprue/test/parity.html"));
  return out;
}

/** The pinned legacy page and print card, checkThin's source and the embedded fonts. */
function legacyInputs(legacy) {
  const dir = dirname(legacy);
  const pins = new Map(readFileSync(join(dir, "sha256.txt"), "utf8").trim().split("\n").map((l) => l.split(/\s+/).reverse()));
  const html = readFileSync(legacy);
  if (sha256(html) !== pins.get("sprue.html")) throw new Refused(`${legacy} does not match ${join(dir, "sha256.txt")}`);
  const card = readFileSync(join(dir, "print-card.txt"));
  if (sha256(card) !== pins.get("print-card.txt")) throw new Refused("print-card.txt does not match sha256.txt");
  const lines = html.toString("utf8").split("\n");
  if (!lines[1113].startsWith("function checkThin(side) {") || lines[1124] !== "}") throw new Refused("checkThin is not at sprue.html lines 1114 to 1125");
  const fonts = [];
  for (const line of lines.slice(9, 11)) {
    const m = /^@font-face\{font-family:"([^"]+)";font-style:normal;font-weight:(\d+);src:url\((data:font\/woff2;base64,[A-Za-z0-9+/=]+)\) format\("woff2"\)\}$/.exec(line);
    if (m === null) throw new Refused("sprue.html lines 10 and 11 are not the two embedded @font-face rules");
    fonts.push({ family: m[1], weight: m[2], url: m[3] });
  }
  return { thinSrc: lines.slice(1113, 1125).join("\n"), fonts, card: card.toString("utf8") };
}

/** object -> { white, black, total, blank } mm3 from the print card lines "pick: ... white 658 mm3, black 53 mm3, total 711 mm3 (blank 718 mm3)". */
function cardVolumes(card) {
  const out = {};
  const re = /^(coin|pick): [^\n]*\n\s+white (\d+) mm3, black (\d+) mm3, total (\d+) mm3 \(blank (\d+) mm3\)/gm;
  for (const m of card.matchAll(re)) out[m[1]] = { white: +m[2], black: +m[3], total: +m[4], blank: +m[5] };
  if (!out.coin || !out.pick) throw new Refused("print-card.txt holds no coin and pick volume lines");
  return out;
}

function bundle(parity) {
  const entry = join(dirname(parity), "parity.entry.ts");
  const outDir = join(dirname(parity), "dist");
  const r = spawnSync("npx", ["--no-install", "tsdown", entry, "--no-config", "--format", "iife", "--platform", "browser",
    "--target", "es2022", "--out-dir", outDir, "--logLevel", "error", "--no-fail-on-warn"], { cwd: ROOT, encoding: "utf8" });
  const js = join(outDir, "parity.entry.iife.js");
  if (r.status !== 0 || !existsSync(js)) throw new Refused(`tsdown failed: ${(r.stderr || r.stdout).slice(-2000)}`);
  return js;
}

async function launch() {
  const exe = process.env.HBF_CHROMIUM ?? (existsSync(MAC_CHROME) ? MAC_CHROME : undefined);
  if ((process.env.HBF_DRIVER ?? "puppeteer") === "playwright") {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ args: FLAGS, ...(exe ? { executablePath: exe } : {}) });
    const ctx = await browser.newContext();
    return {
      driver: "playwright", version: browser.version(), close: () => browser.close(),
      page: async (onReq) => { const p = await ctx.newPage(); await p.route(/^https?:\/\//, (r) => { onReq(r.request().url(), r.request().resourceType()); return r.abort(); }); return p; },
      wait: (p, fn) => p.waitForFunction(fn, null, { timeout: 30000 }),
    };
  }
  const require = createRequire(join(PUPPETEER_DIR, "package.json"));
  const puppeteer = require("puppeteer-core");
  if (exe === undefined) throw new Refused("no browser: set HBF_CHROMIUM to a Chrome or Chromium binary");
  const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: FLAGS });
  return {
    driver: `puppeteer-core ${require("puppeteer-core/package.json").version}`, version: await browser.version(), close: () => browser.close(),
    page: async (onReq) => {
      const p = await browser.newPage();
      await p.setRequestInterception(true);
      p.on("request", (r) => {
        if (/^https?:\/\//.test(r.url())) { onReq(r.url(), r.resourceType()); return r.abort(); }
        return r.continue();
      });
      return p;
    },
    wait: (p, fn) => p.waitForFunction(fn, { timeout: 30000 }),
  };
}

const unb64 = (s) => Buffer.from(s, "base64");
const diffCount = (a, b) => { let n = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++; return n; };

/** hbf part.build volumes per body, mm3, at the pinned epoch. */
function packageVolumes(params) {
  const argv = ["--no-install", "hbf", "part.build", "designs/sprue", "--json", "--detail", "full", ...(params ? ["--params", JSON.stringify(params)] : [])];
  const r = spawnSync("npx", argv, { cwd: ROOT, encoding: "utf8", env: { ...process.env, SOURCE_DATE_EPOCH: EPOCH }, maxBuffer: 1 << 28 });
  const j = JSON.parse(r.stdout);
  if (r.status !== 0 || j.result?.ir == null) throw new Refused(`hbf part.build designs/sprue failed: ${JSON.stringify(j.errors ?? r.stderr)}`);
  const v = Object.fromEntries(j.result.ir.bodies.map((b) => [b.id, b.mesh.volumeMm3]));
  return { white: v.white ?? 0, black: v.black ?? 0, total: j.result.ir.solid.volumeMm3, build: j.result.build };
}

async function run(a) {
  const legacy = legacyInputs(a.legacy);
  const card = cardVolumes(legacy.card);
  const read = readFileSync(join(ROOT, "designs/sprue/test/legacy-read.js"), "utf8");
  bundle(a.parity);
  const b = await launch();
  const fontsAborted = [], counted = [], errors = [];
  const onReq = (url, type) => ((type === "stylesheet" || type === "font") && /fonts\.(googleapis|gstatic)\.com/.test(url) ? fontsAborted : counted).push(url);
  const results = [];
  try {
    for (const scenario of SCENARIOS) {
      const lg = await b.page(onReq);
      lg.on("pageerror", (e) => errors.push(`sprue.html: ${e}`));
      await lg.goto(pathToFileURL(a.legacy).href);
      await b.wait(lg, "globalThis.SPRUE_APP !== undefined && document.readyState === 'complete'");
      // Boot rebuilds once on document.fonts.ready and once after 1500 ms (sprue.html:1675 to 1676).
      await new Promise((r) => setTimeout(r, 2000));
      const L = await lg.evaluate(`(${read})(${JSON.stringify({ scenario, thinSrc: legacy.thinSrc })})`);
      if (L.error) throw new Refused(`legacy page, ${scenario}: ${L.error}`);
      const pk = await b.page(onReq);
      pk.on("pageerror", (e) => errors.push(`parity.html: ${e}`));
      await pk.goto(pathToFileURL(a.parity).href);
      await b.wait(pk, "typeof SPRUE_PARITY !== 'undefined'");
      const P = await pk.evaluate((x) => globalThis.SPRUE_PARITY.run(x), { st: L.st, faces: L.faces, fonts: legacy.fonts });
      results.push({ scenario, L, P });
      await lg.close();
      await pk.close();
    }
  } finally {
    await b.close();
  }

  console.log(`driver: ${b.driver}, ${b.version}, flags ${FLAGS.join(" ")}`);
  console.log(`network: ${fontsAborted.length} chrome font requests aborted, ${counted.length} other requests counted`);
  const fails = [];
  if (counted.length) fails.push(`requests outside file://: ${[...new Set(counted)].join(", ")}`);
  if (errors.length) fails.push(`page errors: ${errors.join("; ")}`);
  for (const { scenario, L, P } of results) {
    const line = [];
    for (const face of ["front", "back"]) {
      const m = L.masks[face];
      if (m.w !== P.w || m.h !== P.h) { fails.push(`${scenario} ${face}: grid ${m.w} x ${m.h} against ${P.w} x ${P.h}`); continue; }
      const raw = diffCount(unb64(m.raw), unb64(P[face].raw)), clean = diffCount(unb64(m.clean), unb64(P[face].clean));
      const ink = unb64(m.clean).reduce((s, v) => s + v, 0);
      line.push(`${face} raw ${raw} clean ${clean} differing cells of ${m.w * m.h} (${ink} ink cells after hygiene)`);
      if (raw || clean) {
        mkdirSync(a.out, { recursive: true });
        for (const [k, v] of [["legacy-raw", m.raw], ["legacy-clean", m.clean], ["package-raw", P[face].raw], ["package-clean", P[face].clean]]) writeFileSync(join(a.out, `${scenario}-${face}-${k}.bin`), unb64(v));
        fails.push(`${scenario} ${face}: ${raw} raw and ${clean} clean cells differ; both grids are in ${a.out}`);
      }
      const lt = JSON.stringify(L.thin[face]), pt = JSON.stringify(P[face].thin);
      line.push(`${face} thin legacy ${lt} package ${pt}`);
      if (lt !== pt) fails.push(`${scenario} ${face}: thin flags ${lt} against ${pt}`);
    }
    console.log(`${scenario} (${L.st.kind}, ppm ${L.st.ppm}, grid ${P.w} x ${P.h}):`);
    for (const l of line) console.log(`  ${l}`);
  }

  console.log("per-object volume, mm3, informational (D-075): package hbf part.build | print-card.txt (sprue.py, shapely) | difference | legacy browser mesh of the scenario");
  const legacyMesh = Object.fromEntries(results.filter((r) => r.scenario !== "phx-small").map((r) => [r.L.mesh.kind, { ...r.L.mesh, scenario: r.scenario }]));
  for (const [obj, params] of [["pick", undefined], ["coin", { kind: "coin", inlay: 3, breakL: 2 }]]) {
    const pk = packageVolumes(params), c = card[obj], lm = legacyMesh[obj];
    console.log(`  ${obj} (${pk.build}):`);
    for (const k of ["white", "black", "total"]) {
      const mine = pk[k], theirs = c[k];
      const lv = lm === undefined ? "n/a" : (k === "total" ? lm.whiteVol + lm.blackVol : lm[`${k}Vol`]).toFixed(1);
      console.log(`    ${k.padEnd(5)} ${mine.toFixed(1).padStart(8)} | ${String(theirs).padStart(5)} | ${(mine - theirs).toFixed(1).padStart(7)} | ${lv}${lm ? ` (${lm.scenario})` : ""}`);
    }
  }
  for (const f of fails) console.log(`FAIL ${f}`);
  return fails.length ? 1 : 0;
}

const a = args(process.argv.slice(2));
try {
  process.exitCode = await run(a);
} catch (e) {
  if (e instanceof Refused) {
    console.error(`refused: ${e.message}`);
    process.exitCode = 2;
  } else throw e;
}
