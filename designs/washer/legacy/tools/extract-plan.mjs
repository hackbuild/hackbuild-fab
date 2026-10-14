// WASHER mm-space planner run headless from the legacy laser rig page
// (M07-T01 step 6). ../laser-rig.zip holds, as its one stored member
// laser-rig.html, the harvested 2026-07-30 18:25 copy
// the M07 golden pins (sha256 1b4f11d8...; the canonical laserriggg bundle
// plans the same square in 1.1703 s at peak 260 with its new defaults,
// knowledge/designs/washer.md section 1.2). The page is zipped because line
// 1610 writes an em dash as an HTML entity that the voice lint blocks in a plain file
// and reports as a warning inside a legacy archive. Blocks copied byte for
// byte:
//   lines 1924 to 1957  CFG, RAD, clamp, usToDeg, degToUs, vOff, ik
//   lines 3248 to 3271  calibReady, calibActive, calibMap, wallToAngles
//   lines 3394 to 3445  PLAN
//   lines 3453 to 3470  SERVOS, SERVO (micro9g), DENSE, ACC_SHARE,
//                       CORNER_FRAC, JOINTOL, SETTLE_AFTER
//   lines 3717 to 3728  densify
//   lines 3740 to 3746  degPerMm
//   lines 3764 to 3767  resolutionSlew
//   lines 3789 to 3795  resolutionMM
//   lines 3798 to 3927  planChainPen
// Calibration is off: calibOn false and no captured corners.
//
// Fixture (the M07 Records table and the washer drive plan-square.cjs): a
// 60 mm square centred on the wall, densified at 0.25 mm by the page's
// densify(), beam on for every segment, no forced stops.
//
//   node designs/washer/legacy/tools/extract-plan.mjs [--write]
//
// Writes packages/motion/records/washer-plan.json. Exit 1 when the page is
// not the pinned copy, a marker moved, a number of the M07 Records table
// moved, or the result differs from the committed record.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";
import { Asserts, finish, marker, readPinned, sha256 } from "../../../../tools/legacy/record.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const ZIP = join(here, "..", "laser-rig.zip");
const ZIP_SHA256 = "6cb396e30a16260f44b8c86dbb35a80f2367141fbbd92e290a5beb1bbf81f72f";
const PAGE_SHA256 = "1b4f11d80a37b4882dccd9f1ae6a70705c270a962bd066f8cabca06ff7fd8ace";

async function page() {
  const zip = await JSZip.loadAsync(readPinned(ZIP, ZIP_SHA256));
  const bytes = Buffer.from(await zip.file("laser-rig.html").async("uint8array"));
  if (sha256(bytes) !== PAGE_SHA256) throw new Error(`laser-rig.html sha256 ${sha256(bytes)}, pinned ${PAGE_SHA256}`);
  return bytes;
}

const BLOCKS = [
  ["const CFG = {", 1924, 1957],
  ["const calibReady = ", 3248, 3271],
  ["const PLAN = {", 3394, 3445],
  ["const SERVOS = {", 3453, 3470, "const SETTLE_AFTER = 5;"],
  ["function densify(pts, step){", 3717, 3728],
  ["function degPerMm(a, b){", 3740, 3746],
  ["function resolutionSlew(){", 3764, 3767],
  ["function resolutionMM(){", 3789, 3795],
  ["function planChainPen(pts, pen, forceStop){", 3798, 3927],
];

async function load() {
  const lines = (await page()).toString("utf8").split("\n");
  const parts = ["let calibOn = false;", "const calib = { tl: null, tr: null, bl: null, br: null };"];
  for (const [text, a, b, end] of BLOCKS) {
    marker(lines, text, a);
    if (end ? !lines[b - 1].startsWith(end) : !/^};?$/.test(lines[b - 1])) throw new Error(`block at line ${a} does not end at line ${b}`);
    parts.push(lines.slice(a - 1, b).join("\n"));
  }
  parts.push("return { CFG, PLAN, SERVO, densify, degPerMm, resolutionSlew, resolutionMM, planChainPen, wallToAngles };");
  return new Function(parts.join("\n"))();
}

async function run() {
  const W = await load();
  const sq = [[-30, -30], [30, -30], [30, 30], [-30, 30], [-30, -30]];
  const pts = W.densify(sq, 0.25);
  const pen = new Array(pts.length - 1).fill(1);
  const m = W.planChainPen(pts, pen, null);
  const at = (x, y) => {
    let best = 0, bd = Infinity;
    pts.forEach((q, i) => { const d = Math.hypot(q[0] - x, q[1] - y); if (d < bd) { bd = d; best = i; } });
    return { index: best, v: m.v[best] };
  };
  const corner = at(30, -30), mid = at(0, -30);
  return {
    params: { plan: { ...W.PLAN }, servo: { ...W.SERVO }, cfg: { dist: W.CFG.dist, wallW: W.CFG.wallW, wallH: W.CFG.wallH, mountH: W.CFG.mountH, minUs: W.CFG.minUs, maxUs: W.CFG.maxUs }, calibration: "off", square: 60, dense: 0.25 },
    points: pts.length,
    durationS: m.dur,
    peakMmS: m.peak,
    corner: { at: [30, -30], index: corner.index, mmS: corner.v },
    midBottom: { at: [0, -30], index: mid.index, mmS: mid.v },
    resolutionSlewDegS: W.resolutionSlew(),
    degPerMmCentre: W.degPerMm([0, 0], [1, 0]),
    resolutionMm: W.resolutionMM(),
    lengthMm: m.len,
  };
}

const argv = process.argv;
if (argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const r = await run();
    const a = new Asserts();
    // The M07 Records table, 2026-10-04 (computed).
    a.eq("duration s", +r.durationS.toFixed(4), 2.2983);
    a.eq("peak mm/s", +r.peakMmS.toFixed(3), 143.669);
    a.eq("corner mm/s", +r.corner.mmS.toFixed(3), 29.461);
    a.eq("mid-side mm/s", +r.midBottom.mmS.toFixed(3), 95.505);
    a.eq("resolution slew deg/s", +r.resolutionSlewDegS.toFixed(3), 36);
    a.eq("deg per mm at the centre", +r.degPerMmCentre.toFixed(5), 0.37694);
    finish({
      record: "washer-plan",
      out: "packages/motion/records/washer-plan.json",
      command: "node designs/washer/legacy/tools/extract-plan.mjs",
      qualifier: "computed: laser-rig.html (2026-07-30 harvest) planChainPen run in node on the 60 mm square, micro9g preset, calibration off",
      inputs: { [ZIP]: ZIP_SHA256, [`${ZIP}!laser-rig.html`]: PAGE_SHA256 },
    }, r, a);
    process.stdout.write(`duration ${r.durationS.toFixed(4)} s, peak ${r.peakMmS.toFixed(3)}, corner ${r.corner.mmS.toFixed(3)}, mid-side ${r.midBottom.mmS.toFixed(3)} mm/s; resolution slew ${r.resolutionSlewDegS.toFixed(3)} deg/s, ${r.degPerMmCentre.toFixed(5)} deg/mm at the centre\n`);
  } catch (e) {
    process.stderr.write(`extract-plan: ${e.message}\n`);
    process.exit(1);
  }
}
