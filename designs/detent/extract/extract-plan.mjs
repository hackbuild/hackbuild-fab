// DETENT speed planner and four-corner calibration run headless from the
// legacy control app (M07-T01 step 5). Blocks of ../legacy/detent-plot.html are
// copied byte for byte:
//   lines 474 to 475   STEPS_PER_REV, DEG_PER_STEP (28BYJ-48 half steps)
//   lines 478 to 495   the state object S (rate 400, travel 500, throw 150,
//                      sep 22, field 120 x 120 are its defaults)
//   lines 503 to 570   stepToU, uToStep, mmToUV, uvToMm, mmToSteps,
//                      stepsToMm, solveH, invertH, cornerMm
//   line 1102          TICKHZ 20000
//   lines 1104 to 1151 planSpeeds
//   lines 1883 to 1900 the body of the SOLVE button handler (corners to
//                      homography, then the residual), wrapped as solve()
// `$("mAccel").value` reads 3000, the input's default at line 214; log()
// is inert.
//
// Fixtures are the M07 Records table rows: a 400 step square sampled every
// 10 steps with the beam on, closed back to the start; and the caltest.py
// corners (-150, 140), (170, 155), (165, -130), (-160, -145) with its round
// trip over a 10 mm grid from -60 to 60 (detent-latest.zip
// tests/caltest.py).
//
//   node designs/detent/extract/extract-plan.mjs [--write]
//
// Writes packages/motion/records/detent-plan.json and detent-cal.json.
// Exit 1 when the page is not the pinned copy, a marker moved, a number of
// the M07 Records table moved, or a result differs from its record.

import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Asserts, finish, legacyDir, marker, readPinned } from "../../../tools/legacy/record.mjs";

const PAGE = join(legacyDir("detent"), "detent-plot.html");
const PAGE_SHA256 = "81cdd5d8100dee9d77fce80599adf3244011df1b27e5709a7917ce8d45428bbd";

function load() {
  const lines = readPinned(PAGE, PAGE_SHA256).toString("utf8").split("\n");
  marker(lines, "const STEPS_PER_REV = 4075.7728;", 474);
  marker(lines, "const S = {", 478);
  marker(lines, "const RAD = Math.PI / 180;", 503);
  marker(lines, "function cornerMm(i) {", 567);
  marker(lines, "const TICKHZ = 20000;", 1102);
  marker(lines, "function planSpeeds(cmds) {", 1104);
  marker(lines, "// ---------------------------------------------------------------- fit + optimise", 1153);
  marker(lines, '$("bSolve").onclick = async () => {', 1882);
  marker(lines, "  S.resid = worst;", 1900);
  if (lines[495 - 1] !== "};" || lines[570 - 1] !== "}" || lines[1151 - 1] !== "}") throw new Error("a block does not end where the line table says");
  const take = (a, b) => lines.slice(a - 1, b).join("\n");
  const body = [
    'const $ = (id) => { if (id !== "mAccel") throw new Error(`unexpected element ${id}`); return { value: "3000" }; };',
    "const log = () => {};",
    take(474, 475), take(478, 495), take(503, 570), take(1102, 1102), take(1104, 1151),
    `function solve() {\n${take(1883, 1900)}\n}`,
    "return { S, planSpeeds, solve, mmToSteps, stepsToMm, cornerMm, STEPS_PER_REV };",
  ].join("\n");
  return new Function(body)();
}

function squareFixture() {
  const cmds = [], side = 400, st = 10;
  const c = [[0, 0], [side, 0], [side, side], [0, side], [0, 0]];
  for (let k = 0; k < 4; k++) {
    const [x0, y0] = c[k], [x1, y1] = c[k + 1];
    for (let t = 0; t < side; t += st) cmds.push({ x: x0 + ((x1 - x0) * t) / side, y: y0 + ((y1 - y0) * t) / side, l: 1 });
  }
  cmds.push({ x: 0, y: 0, l: 1 });
  return cmds;
}

function plan() {
  const D = load();
  const cmds = squareFixture();
  D.planSpeeds(cmds);
  const iv = cmds.map((c) => c.iv);
  const corner = 40; // (400, 0), the first corner after the start
  return {
    params: { rate: D.S.rate, travel: D.S.travel, accel: 3000, tickHz: 20000, side: 400, sample: 10 },
    points: cmds.length,
    ivStart: iv[0], ivCruise: Math.min(...iv), ivCorner: iv[corner],
    ivBeforeCorner: iv[corner - 1], ivAfterCorner: iv[corner + 1], ivEnd: iv[iv.length - 1],
    iv,
  };
}

function calibrate() {
  const D = load();
  const corners = [[-150, 140], [170, 155], [165, -130], [-160, -145]];
  D.S.corners = corners.map((c) => c.slice());
  D.solve();
  let worstStep = 0;
  corners.forEach((c, i) => {
    const g = D.mmToSteps(...D.cornerMm(i));
    worstStep = Math.max(worstStep, Math.abs(g[0] - c[0]), Math.abs(g[1] - c[1]));
  });
  let roundTrip = 0;
  for (let x = -60; x <= 60; x += 10) for (let y = -60; y <= 60; y += 10) {
    const s = D.mmToSteps(x, y), m = D.stepsToMm(s[0], s[1]);
    roundTrip = Math.max(roundTrip, Math.hypot(m[0] - x, m[1] - y));
  }
  return {
    params: { throw: D.S.throw, sep: D.S.sep, fieldW: D.S.W, fieldH: D.S.H, stepsPerRev: D.STEPS_PER_REV, corners, grid: [-60, 60, 10] },
    homography: D.S.hom, cornerWorstStepError: worstStep, residualMm: D.S.resid, roundTripWorstMm: roundTrip,
  };
}

const argv = process.argv;
if (argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const p = plan(), c = calibrate();
    const ap = new Asserts(), ac = new Asserts();
    // The M07 Records table, 2026-10-04 (computed).
    ap.eq("iv start", p.ivStart, 167);
    ap.eq("iv cruise", p.ivCruise, 50);
    ap.eq("iv corner", p.ivCorner, 91);
    ap.eq("iv either side of the corner", [p.ivBeforeCorner, p.ivAfterCorner], [61, 61]);
    ap.eq("iv end", p.ivEnd, 167);
    ac.eq("corner step error", c.cornerWorstStepError, 0);
    ac.eq("round trip worst mm", +c.roundTripWorstMm.toFixed(4), 0.2876);
    const inputs = { [PAGE]: PAGE_SHA256 };
    finish({
      record: "detent-plan", out: "packages/motion/records/detent-plan.json",
      command: "node designs/detent/extract/extract-plan.mjs",
      qualifier: "computed: detent-plot.html planSpeeds run in node on the 400 step square; iv in 20 kHz ticks",
      inputs,
    }, p, ap);
    finish({
      record: "detent-cal", out: "packages/motion/records/detent-cal.json",
      command: "node designs/detent/extract/extract-plan.mjs",
      qualifier: "computed: detent-plot.html solveH and invertH through the SOLVE handler body, caltest.py corners and grid",
      inputs,
    }, c, ac);
    process.stdout.write(`iv start ${p.ivStart}, cruise ${p.ivCruise}, corner ${p.ivCorner}, neighbours ${p.ivBeforeCorner} and ${p.ivAfterCorner}, end ${p.ivEnd}; corner step error ${c.cornerWorstStepError}, round trip worst ${c.roundTripWorstMm.toFixed(4)} mm\n`);
  } catch (e) {
    process.stderr.write(`extract-plan: ${e.message}\n`);
    process.exit(1);
  }
}
