// WASHER four-corner bilinear calibration run headless from the legacy
// laser rig page (M07-T12 step 5). ../laser-rig.zip holds, as its one
// stored member laser-rig.html, the harvested 2026-07-30 copy (sha256
// 1b4f11d8...); its kinematics equal the canonical laserriggg page byte for
// byte (usToDeg, degToUs, vOff, ik, fkCalib, fk, calibMap, wallToAngles).
// Blocks copied byte for byte:
//   lines 1924 to 1957  CFG, RAD, clamp, usToDeg, degToUs, vOff, ik
//   lines 1987 to 2031  fkCalib, fk
//   lines 3248 to 3271  calibReady, calibActive, calibMap, wallToAngles
//
// Fixtures: the four corner aims the ideal map gives at the target corners
// (calibration off, wallToAngles at x and y = +-wallW/2 and +-wallH/2),
// rounded to 0.01 deg as the page stores them on the board (CFG line 4141),
// then captured as calib.tl, tr, bl, br with calibration on. "square" aims
// at the corners as they are; "rolled" aims at them turned 5 deg about the
// target centre, a rig mounted with a roll, so the captured quad is no
// rectangle in angle space and the Newton inverse has work to do (as
// caltest.py simulates a DETENT rig mounted rotated and off axis). The page has
// no calibration readout, so the three readouts M07-T12 defines for both
// rigs are computed here from the page's own functions:
//   residual    each corner mm through wallToAngles and fk against the
//               captured aim through fk, worst mm; the corner error is the
//               same pair in whole pulse us
//   round trip  every grid point (multiples of 10 mm inside the target):
//               mm, wallToAngles, degToUs, usToDeg, fk, back to mm; worst mm
//   aspect      DETENT's rule (detent-plot.html lines 1903 to 1911) on the
//               captured corners placed by the ideal fk: mean horizontal
//               span over mean vertical
//
//   node designs/washer/legacy/tools/extract-cal.mjs [--write]
//
// Writes packages/motion/records/washer-cal.json. Exit 1 when the page is
// not the pinned copy, a marker moved, or a result differs from its record.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";
import { Asserts, finish, marker, readPinned, sha256 } from "../../../../tools/legacy/record.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const ZIP = join(here, "..", "laser-rig.zip");
const ZIP_SHA256 = "6cb396e30a16260f44b8c86dbb35a80f2367141fbbd92e290a5beb1bbf81f72f";
const PAGE_SHA256 = "1b4f11d80a37b4882dccd9f1ae6a70705c270a962bd066f8cabca06ff7fd8ace";

const BLOCKS = [
  ["const CFG = {", 1924, 1957],
  ["function fkCalib(panDeg, tiltDeg){", 1987, 2031],
  ["const calibReady = ", 3248, 3271],
];

async function load() {
  const zip = await JSZip.loadAsync(readPinned(ZIP, ZIP_SHA256));
  const bytes = Buffer.from(await zip.file("laser-rig.html").async("uint8array"));
  if (sha256(bytes) !== PAGE_SHA256) throw new Error(`laser-rig.html sha256 ${sha256(bytes)}, pinned ${PAGE_SHA256}`);
  const lines = bytes.toString("utf8").split("\n");
  const parts = ["let calibOn = false;", "const calib = { tl: null, tr: null, bl: null, br: null };"];
  for (const [text, a, b] of BLOCKS) {
    marker(lines, text, a);
    if (!/^};?$/.test(lines[b - 1])) throw new Error(`block at line ${a} does not end at line ${b}`);
    parts.push(lines.slice(a - 1, b).join("\n"));
  }
  parts.push("return { CFG, calib, setOn: (on) => { calibOn = on; }, usToDeg, degToUs, wallToAngles, fk };");
  return new Function(parts.join("\n"))();
}

export const ROLL_DEG = 5;

async function fixture(rollDeg) {
  const W = await load();
  const hw = W.CFG.wallW / 2, hh = W.CFG.wallH / 2;
  const at = { tl: [-hw, hh], tr: [hw, hh], br: [hw, -hh], bl: [-hw, -hh] };
  const r2 = (x) => +x.toFixed(2);
  const c = Math.cos((rollDeg * Math.PI) / 180), s = Math.sin((rollDeg * Math.PI) / 180);
  const corners = {};
  for (const [k, [x, y]] of Object.entries(at)) {
    const a = W.wallToAngles(x * c - y * s, x * s + y * c);
    corners[k] = { pan: r2(a.pan), tilt: r2(a.tilt) };
  }
  const ideal = Object.fromEntries(Object.entries(corners).map(([k, c]) => [k, W.fk(c.pan, c.tilt)]));
  const uw = (Math.abs(ideal.tr.wx - ideal.tl.wx) + Math.abs(ideal.br.wx - ideal.bl.wx)) / 2;
  const vh = (Math.abs(ideal.tl.wy - ideal.bl.wy) + Math.abs(ideal.tr.wy - ideal.br.wy)) / 2;
  Object.assign(W.calib, corners);
  W.setOn(true);
  let residualMm = 0, cornerWireError = 0;
  for (const k of ["tl", "tr", "br", "bl"]) {
    const [x, y] = at[k], got = W.wallToAngles(x, y), want = corners[k];
    const a = W.fk(got.pan, got.tilt), b = W.fk(want.pan, want.tilt);
    residualMm = Math.max(residualMm, Math.hypot(a.wx - b.wx, a.wy - b.wy));
    cornerWireError = Math.max(cornerWireError, Math.abs(W.degToUs(got.pan) - W.degToUs(want.pan)), Math.abs(W.degToUs(got.tilt) - W.degToUs(want.tilt)));
  }
  let roundTripMm = 0, worstAt = null, gridPoints = 0;
  const k = Math.floor(hw / 10);
  for (let i = -k; i <= k; i++) for (let j = -k; j <= k; j++) {
    const x = i * 10, y = j * 10, g = W.wallToAngles(x, y);
    const w = W.fk(W.usToDeg(W.degToUs(g.pan)), W.usToDeg(W.degToUs(g.tilt)));
    const d = Math.hypot(w.wx - x, w.wy - y);
    if (d > roundTripMm) { roundTripMm = d; worstAt = [x, y]; }
    gridPoints++;
  }
  const quadAspectRaw = vh > 1e-9 ? uw / vh : 0;
  return {
    params: { dist: W.CFG.dist, wallW: W.CFG.wallW, wallH: W.CFG.wallH, mountH: W.CFG.mountH, minUs: W.CFG.minUs, maxUs: W.CFG.maxUs, homePan: W.CFG.homePan, homeTilt: W.CFG.homeTilt, grid: [-k * 10, k * 10, 10], rollDeg },
    corners,
    residualMm, cornerWireError, roundTripMm, roundTripWorstAt: worstAt, gridPoints,
    quadAspectRaw, quadAspect: quadAspectRaw / (W.CFG.wallW / W.CFG.wallH),
  };
}

const argv = process.argv;
if (argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const r = { square: await fixture(0), rolled: await fixture(ROLL_DEG) };
    const a = new Asserts();
    for (const [name, f] of Object.entries(r)) {
      a.ok(`${name} corner error within one pulse us`, f.cornerWireError <= 1, `got ${f.cornerWireError}`);
      a.eq(`${name} grid points`, f.gridPoints, 31 * 31);
    }
    finish({
      record: "washer-cal",
      card: "M07-T12",
      out: "packages/motion/records/washer-cal.json",
      command: "node designs/washer/legacy/tools/extract-cal.mjs",
      qualifier: "computed: laser-rig.html (2026-07-30 harvest) calibMap, fkCalib, fk and wallToAngles run in node on the ideal-map corners rounded to 0.01 deg, square and rolled 5 deg",
      inputs: { [ZIP]: ZIP_SHA256, [`${ZIP}!laser-rig.html`]: PAGE_SHA256 },
    }, r, a);
    for (const [name, f] of Object.entries(r)) {
      process.stdout.write(`${name}: residual ${f.residualMm.toExponential(3)} mm, corner error ${f.cornerWireError} us, round trip worst ${f.roundTripMm.toFixed(4)} mm at ${f.roundTripWorstAt}, quad aspect ${f.quadAspect.toFixed(4)} of the field\n`);
    }
  } catch (e) {
    process.stderr.write(`extract-cal: ${e.message}\n`);
    process.exit(1);
  }
}
