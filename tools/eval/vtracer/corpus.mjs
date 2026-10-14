// tools/eval/vtracer/corpus.mjs
// M03-T11: writes the ten evaluation inputs into tools/corpus/inlay/vtracer/
// and their SHA256SUMS. Inputs 1 to 4 and 10 come from Chromium driving the
// legacy benches (file://, headless), 5 to 7 are copied as is, 8 and 9 come
// from tools/py/render_sprue_motifs.py. Every source is checked against the
// sha256 the M03 card records before it is read.
//
// Playwright refuses this macOS 12 host, so the drive uses puppeteer-core
// from the originals tool folder with the system Chrome. Override with
// HBF_PUPPETEER and HBF_CHROME.
//
// Usage: node tools/eval/vtracer/corpus.mjs

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const OUT = join(REPO, "tools/corpus/inlay/vtracer");
const PUPPETEER = process.env.HBF_PUPPETEER ?? "/Users/obsidian/Projects/hackbuild/fab-knowledge/originals/_tools/node_modules/puppeteer-core";
const CHROME = process.env.HBF_CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const SRC = {
  mark: ["/Users/obsidian/Projects/hackbuild/fab-knowledge/evidence/x/plan-to-refine/handoff/hbf/seed/brand/hackbuild-mark.svg", null],
  collar: ["/Users/obsidian/Projects/hackbuild/fab-work-directory/benches/collar-coin/outputs/collar/collar.html", "ef0864ab66ca40e2930d12aba4cab3159aa470f743eee533d052fc99f844fd46"],
  coinPreview: ["/Users/obsidian/Projects/hackbuild/fab-work-directory/benches/collar-coin/outputs/hackbuild-coin/hackbuild-coin-preview.png", null],
  spruePreview: ["/Users/obsidian/Projects/hackbuild/fab-work-directory/benches/sprue/outputs/sprue/previews/faces.png", null],
  sprue: ["/Users/obsidian/Projects/hackbuild/fab-work-directory/benches/sprue/outputs/sprue/sprue.html", "a1acb293ad96c7dd5062a9e65741a7f27959584dfb10e64decb41468c59e4fe7"],
};

const sha = (buf) => createHash("sha256").update(buf).digest("hex");
function source(key) {
  const [path, want] = SRC[key];
  const buf = readFileSync(path);
  if (want && sha(buf) !== want) throw new Error(`${path}: sha256 ${sha(buf)}, card records ${want}`);
  return path;
}

async function waitFile(dir, name, ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (existsSync(join(dir, name)) && !readdirSync(dir).some((f) => f.endsWith(".crdownload"))) return join(dir, name);
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`download ${name} did not land in ${ms} ms`);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const require = createRequire(pathToFileURL(join(PUPPETEER, "package.json")));
  const puppeteer = require(PUPPETEER);
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--allow-file-access-from-files"] });
  const dl = join(OUT, ".dl");
  rmSync(dl, { recursive: true, force: true });
  mkdirSync(dl, { recursive: true });
  const written = [];
  try {
    // 1: the mark rasterised at 1200 px wide by a canvas drawImage, alpha kept.
    {
      const page = await browser.newPage();
      const svg = readFileSync(source("mark"), "utf8");
      const b64 = await page.evaluate(async (text) => {
        const img = new Image();
        img.src = "data:image/svg+xml;base64," + btoa(text);
        await img.decode();
        const c = document.createElement("canvas");
        c.width = 1200;
        c.height = Math.round((1200 * img.naturalHeight) / img.naturalWidth);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        return c.toDataURL("image/png").split(",")[1];
      }, svg);
      writeFileSync(join(OUT, "01-hackbuild-mark.png"), Buffer.from(b64, "base64"));
      written.push("01-hackbuild-mark.png");
      await page.close();
    }
    // 2 to 4: COLLAR face png export per preset.
    const collar = [["hack.build coin", "02-collar-hackbuild.png"], ["seal + tagline", "03-collar-seal-tagline.png"], ["casino chip", "04-collar-casino-chip.png"]];
    for (const [preset, name] of collar) {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 900 });
      page.on("dialog", (d) => d.accept());
      const cdp = await page.createCDPSession();
      await cdp.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: dl, eventsEnabled: true });
      await page.goto(pathToFileURL(source("collar")).href, { waitUntil: "load" });
      await page.waitForFunction(() => document.querySelectorAll("#presetChips .chip").length > 0, { timeout: 30000 });
      await page.evaluate(() => document.querySelector("#welcome")?.classList.add("hide"));
      await page.evaluate((p) => { [...document.querySelectorAll("#presetChips .chip")].find((b) => b.textContent === p).click(); }, preset);
      await page.evaluate(() => { document.querySelector("#btnPng").disabled = true; });
      await page.evaluate(() => document.querySelector("#btnBuild")?.click());
      await page.waitForFunction(() => !document.querySelector("#btnPng").disabled, { timeout: 120000 });
      await new Promise((r) => setTimeout(r, 1500));
      rmSync(join(dl, "collar-faces.png"), { force: true });
      await page.evaluate(() => document.querySelector("#btnPng").click());
      copyFileSync(await waitFile(dl, "collar-faces.png", 30000), join(OUT, name));
      written.push(name);
      await page.close();
    }
    // 10: SPRUE faces png with PRESETS.phx() (the boot preset, applied again).
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 900 });
      page.on("dialog", (d) => d.accept());
      const cdp = await page.createCDPSession();
      await cdp.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: dl, eventsEnabled: true });
      await page.goto(pathToFileURL(source("sprue")).href, { waitUntil: "load" });
      await page.waitForFunction(() => globalThis.SPRUE_APP != null, { timeout: 30000 });
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => document.querySelector('[data-preset="phx"]').click());
      await new Promise((r) => setTimeout(r, 2500));
      await page.evaluate(() => globalThis.SPRUE_APP.renderFaces());
      rmSync(join(dl, "sprue_faces.png"), { force: true });
      await page.evaluate(() => document.querySelector("#exPng").click());
      copyFileSync(await waitFile(dl, "sprue_faces.png", 30000), join(OUT, "10-sprue-phx-faces.png"));
      written.push("10-sprue-phx-faces.png");
      await page.close();
    }
  } finally {
    await browser.close();
    rmSync(dl, { recursive: true, force: true });
  }
  // 5 and 6 as is. 7, a SPRUE upload whose author is unknown, stays out of the public tree (D-269).
  copyFileSync(source("coinPreview"), join(OUT, "05-python-coin-preview.png"));
  copyFileSync(source("spruePreview"), join(OUT, "06-sprue-face-previews.png"));
  written.push("05-python-coin-preview.png", "06-sprue-face-previews.png");
  // 8 and 9 from the SPRUE generator's own motif functions.
  execFileSync("uv", ["run", "--project", "tools/py", "tools/py/render_sprue_motifs.py", OUT], { cwd: REPO, stdio: "inherit" });
  written.push("08-sprue-snare.png", "09-sprue-bolt.png");

  const names = written.sort();
  const sums = names.map((n) => `${sha(readFileSync(join(OUT, n)))}  ${n}`).join("\n") + "\n";
  writeFileSync(join(OUT, "SHA256SUMS"), sums);
  process.stdout.write(sums);
}

main().catch((e) => { console.error(e); process.exit(1); });
