// Records STANCHION's own horn solve for the aileron-differential parity
// test (M06-T03 step 3). solveHorns (originals/stanchion/files/stanchion.html
// lines 293 to 314) lives inside the page's IIFE over a three.js scene, so
// it cannot be called from node; this drives the original in headless
// Chrome the way the record's drive did (stanchion record 5.3): it sets the
// tilt and roll sliders, lets the frame loop run placeRods, and reads the
// HUD line the page prints ("servo A x deg servo B y deg", one decimal, or
// "linkage cannot reach this pose", and "near travel limit"). The page
// loads three.js r128 from cdnjs, so this needs a network. The file's
// sha256 is checked against the lineage row stanchion.viewer/v2 first.
//
//   node packages/mechanisms/test/legacy/record-stanchion.cjs
//
// writes packages/mechanisms/test/legacy/stanchion.json.

const { createHash } = require("node:crypto");
const { readFileSync, writeFileSync } = require("node:fs");
const path = require("node:path");
const puppeteer = require("/Users/obsidian/Projects/hackbuild/fab-knowledge/originals/_tools/node_modules/puppeteer-core");

const ROW = "stanchion.viewer/v2";
const repo = path.resolve(__dirname, "../../../..");
const row = JSON.parse(readFileSync(path.join(repo, "lineage.json"), "utf8")).find((r) => r.id === ROW);
const sha256 = createHash("sha256").update(readFileSync(row.source)).digest("hex");
if (sha256 !== row.sha256) throw new Error(`${row.source}: sha256 ${sha256}, lineage ${row.sha256}`);

const POSES = [];
for (const tilt of [-22, -15, -10, -5, 0, 5, 10]) for (const roll of [-10, -5, 0, 5, 10]) POSES.push([tilt, roll]);

(async () => {
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--allow-file-access-from-files"] });
  try {
    const p = await b.newPage();
    const errors = [];
    p.on("pageerror", (e) => errors.push(String(e)));
    await p.goto(`file://${row.source}`, { waitUntil: "load", timeout: 60000 });
    await p.waitForFunction(() => /servo A|cannot reach/.test(document.getElementById("hornout").textContent), { timeout: 60000 });
    const poses = [];
    for (const [tilt, roll] of POSES) {
      const text = await p.evaluate(async (t, r) => {
        for (const [id, v] of [["pitch", t], ["roll", r]]) {
          const el = document.getElementById(id);
          el.value = String(v);
          el.dispatchEvent(new Event("input"));
        }
        await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
        return document.getElementById("hornout").textContent;
      }, tilt, roll);
      const m = /servo A\s*(-?[\d.]+)°\s*servo B\s*(-?[\d.]+)°/.exec(text.replace(/\s+/g, " "));
      poses.push({ tilt, roll, text: text.replace(/\s+/g, " ").trim(), servoA: m ? Number(m[1]) : null, servoB: m ? Number(m[2]) : null, nearLimit: /near travel limit/.test(text), reachable: m !== null });
    }
    const record = { source: { lineage: ROW, file: "files/stanchion.html", sha256, fn: "solveHorns, placeRods", lines: "293 to 331", hud: "line 684" }, errors, poses };
    writeFileSync(path.join(__dirname, "stanchion.json"), `${JSON.stringify(record, null, 1)}\n`);
    console.log(poses.map((q) => `${q.tilt},${q.roll}: ${q.text}`).join("\n"));
  } finally {
    await b.close();
  }
})();
