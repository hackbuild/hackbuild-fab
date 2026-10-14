// M07-T12: the DETENT and WASHER planners behind one interface. Expected
// values come from the legacy pages only: the M07-T01 records
// packages/motion/records/detent-plan.json (detent-plot.html planSpeeds run
// in node) and washer-plan.json (the harvested laser-rig.html planChainPen),
// the canonical WASHER drive record (originals/washer/drive/
// plan-square-2026-10-05.json, copied with its sha256 to
// designs/washer/legacy/), and the M07 Records table figures typed
// below. Fixtures are the records' own: the 400 step square sampled every
// 10 steps, beam on, closed (designs/detent/legacy/tools/extract-plan.mjs
// squareFixture), and the 60 mm square centred on the target densified at
// 0.25 mm.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import {
  type WasherCtx, SERVO_PRESETS, degPerMm, densify, detentBatchLines, detentSquare, washerSquare, detentBatchMax, detentPlan, detentPlanner, planSpeeds,
  resolutionMM, resolutionSlew, servoPreset, toDetentCmd, washerPlan, washerPlanner, washerRig, washerSegments, washerStream,
} from "@hackbuild/motion";

const root = new URL("../../../", import.meta.url);
const read = (p: string): string => readFileSync(new URL(p, root), "utf8");
const sha256 = (b: Uint8Array): string => createHash("sha256").update(b).digest("hex");
/** A repo copy of an original, held to the sha256 it was copied with; a missing or changed copy fails. */
const pinned = (p: string, sha: string): Buffer => {
  const b = readFileSync(new URL(p, root));
  expect(sha256(b), `${p} is the copy it was pinned as`).toBe(sha);
  return b;
};
/** The one stored (method 0) member of a legacy zip: its bytes follow the 30 byte local header, name and extra. */
const storedMember = (zip: Buffer): Buffer => {
  expect(zip.readUInt32LE(0)).toBe(0x04034b50);
  expect(zip.readUInt16LE(8), "member is stored, not deflated").toBe(0);
  const at = 30 + zip.readUInt16LE(26) + zip.readUInt16LE(28);
  return zip.subarray(at, at + zip.readUInt32LE(18));
};
const profile = createProfileLookup(loadProfile());

interface Rec<R> { result: R }
const detentRec = JSON.parse(read("packages/motion/records/detent-plan.json")) as Rec<{
  params: { rate: number; travel: number; accel: number; tickHz: number; side: number; sample: number };
  points: number; ivStart: number; ivCruise: number; ivCorner: number; ivBeforeCorner: number; ivAfterCorner: number; ivEnd: number; iv: number[];
}>;
const washerRec = JSON.parse(read("packages/motion/records/washer-plan.json")) as Rec<{
  params: {
    plan: { feed: number; travel: number; accel: number; jd: number; steps: number; tol: number; jerk: number; speed: number };
    servo: { slew: number; accel: number; deadband: number; frame: number; lash: number; band: number };
    cfg: { dist: number; wallW: number; wallH: number; mountH: number; minUs: number; maxUs: number };
    square: number; dense: number;
  };
  points: number; durationS: number; peakMmS: number;
  corner: { at: [number, number]; index: number; mmS: number };
  midBottom: { at: [number, number]; index: number; mmS: number };
  resolutionSlewDegS: number; degPerMmCentre: number; resolutionMm: number; lengthMm: number;
}>;
const relClose = (got: number, want: number, rel = 1e-9): void => {
  expect(Math.abs(got - want), `${got} against ${want}`).toBeLessThanOrEqual(rel * Math.max(1, Math.abs(want)));
};

describe("DETENT step-space planner (computed)", () => {
  const p = detentPlan(profile);
  const R = detentRec.result;
  const path = detentSquare(R.params.side, R.params.sample);
  const plan = detentPlanner(p).plan(path);

  test("the profile rows are the page defaults the record ran", () => {
    expect([p.rate, p.travel, p.accel, p.tickHz]).toEqual([R.params.rate, R.params.travel, R.params.accel, R.params.tickHz]);
    expect([p.vFloor, p.vMin]).toEqual([120, 60]);
  });

  test("the square gives iv start 167, cruise 50, corner 91, neighbours 61, end 167", () => {
    const iv = plan.iv;
    expect(iv).toHaveLength(R.points);
    expect([iv[0], Math.min(...iv), iv[40], iv[39], iv[41], iv.at(-1)]).toEqual([167, 50, 91, 61, 61, 167]);
    expect([iv[0], Math.min(...iv), iv[40], iv[39], iv[41], iv.at(-1)]).toEqual([R.ivStart, R.ivCruise, R.ivCorner, R.ivBeforeCorner, R.ivAfterCorner, R.ivEnd]);
  });

  test("every interval equals the legacy run", () => {
    expect(plan.iv).toEqual(R.iv);
  });

  test("the readout names the ceiling: feed on the straights, junction at the corner, accel beside it, floor at the ends", () => {
    expect(plan.binding).toBe("feed");
    relClose(plan.points[plan.peakIndex]!.v, R.params.rate);
    expect(plan.bindingAt[40]).toBe("junction");
    expect(plan.bindingAt[39]).toBe("accel");
    expect(plan.bindingAt[0]).toBe("floor");
    expect(plan.bindingAt.at(-1)).toBe("floor");
    expect(plan.bindingAt[20]).toBe("feed");
  });

  test("the planned runtime is the page readout: dominant steps times interval over the tick rate", () => {
    let ticks = 0;
    for (let i = 1; i < path.length; i++) ticks += Math.max(Math.abs(path[i]!.x - path[i - 1]!.x), Math.abs(path[i]!.y - path[i - 1]!.y)) * R.iv[i]!;
    relClose(plan.durationS, ticks / R.params.tickHz);
  });

  test("a single point carries no interval, as the page returns early", () => {
    expect(planSpeeds([{ x: 0, y: 0, l: 1 }], p).iv).toEqual([]);
  });

  test("a batch line carries 4 comma fields per token, at most 6 points a line (plantest rule)", () => {
    const n = detentBatchMax(profile);
    expect(n).toBe(6);
    const lines = detentBatchLines(path.map(toDetentCmd), plan.iv, n);
    expect(lines).toHaveLength(Math.ceil(R.points / 6));
    expect(lines[0]).toBe(`S 0,0,1,${R.iv[0]} 10,0,1,${R.iv[1]} 20,0,1,${R.iv[2]} 30,0,1,${R.iv[3]} 40,0,1,${R.iv[4]} 50,0,1,${R.iv[5]}`);
    for (const line of lines) {
      const tokens = line.split(" ");
      expect(tokens[0]).toBe("S");
      expect(tokens.length - 1).toBeLessThanOrEqual(6);
      for (const t of tokens.slice(1)) expect(t.split(",")).toHaveLength(4);
    }
    expect(detentBatchLines([{ x: 3, y: 4, l: 0 }], [], n)).toEqual(["S 3,4,0"]);
  });
});

describe("WASHER mm-space planner (computed)", () => {
  const R = washerRec.result;
  const rig = washerRig(profile);
  const ctx: WasherCtx = {
    rig,
    plan: { ...R.params.plan, dense: R.params.dense },
    servo: R.params.servo,
    calib: null,
  };
  const path = washerSquare(R.params.square, R.params.dense);
  const plan = washerPlanner(ctx).plan(path);

  test("the profile rig and the micro9g preset are the ones the record ran", () => {
    const { dist, wallW, wallH, mountH, minUs, maxUs } = rig;
    expect({ dist, wallW, wallH, mountH, minUs, maxUs }).toEqual(R.params.cfg);
    const { label: _label, ...servo } = R.params.servo as typeof R.params.servo & { label?: string };
    expect(servoPreset(profile, "micro9g")).toEqual(servo);
    expect(path).toHaveLength(R.points);
  });

  test("the 60 mm square gives 2.2983 s, peak 143.669 mm/s, corner 29.461 mm/s, mid-side 95.505 mm/s", () => {
    expect(plan.durationS.toFixed(4)).toBe("2.2983");
    expect(plan.peakMmS.toFixed(3)).toBe("143.669");
    expect(plan.points[R.corner.index]!.v.toFixed(3)).toBe("29.461");
    expect(plan.points[R.midBottom.index]!.v.toFixed(3)).toBe("95.505");
  });

  test("each within 1e-9 relative of the legacy run", () => {
    relClose(plan.durationS, R.durationS);
    relClose(plan.peakMmS, R.peakMmS);
    relClose(plan.points[R.corner.index]!.v, R.corner.mmS);
    relClose(plan.points[R.midBottom.index]!.v, R.midBottom.mmS);
    relClose(plan.chain.len, R.lengthMm);
    relClose(resolutionSlew(ctx), R.resolutionSlewDegS);
    relClose(degPerMm(ctx, [0, 0], [1, 0]), R.degPerMmCentre);
    relClose(resolutionMM(ctx), R.resolutionMm);
  });

  test("the readout says resolution binds at mid-side; junction and accel set the corner", () => {
    // the record's own numbers: mid-side speed is the resolution slew over the deg/mm there
    const i = R.midBottom.index;
    relClose(R.midBottom.mmS, R.resolutionSlewDegS / degPerMm(ctx, [path[i]!.x, path[i]!.y], [path[i + 1]!.x, path[i + 1]!.y]));
    expect(plan.bindingAt[i]).toBe("resolution");
    expect(plan.bindingAt[0]).toBe("floor");
    expect(plan.bindingAt[R.corner.index]).toBe("curvature");
    expect(plan.binding).toBe(plan.bindingAt[plan.chain.peakIndex]);
    expect(plan.binding).toBe("resolution");
  });

  test("the four SERVOS presets are profile rows", () => {
    expect(SERVO_PRESETS.map((id) => servoPreset(profile, id).slew)).toEqual([240, 300, 420, 700]);
    expect(SERVO_PRESETS.map((id) => servoPreset(profile, id).frame)).toEqual([50, 50, 50, 200]);
    for (const id of SERVO_PRESETS) {
      for (const f of ["slew", "accel", "deadband", "frame", "lash", "band"]) {
        expect(profile.constant(`servo.${id}.${f}`).provenance.tier, `${id}.${f}`).toBe("inferred");
      }
    }
  });

  // originals/washer/drive/plan-square-2026-10-05.json, copied byte for byte (lineage washer.app/m07-drive-record).
  const drive = "designs/washer/legacy/plan-square-2026-10-05.json";
  test("at the canonical defaults in profile the square plans as the canonical page does: 1.1703 s, peak 260, corner 29.461, mid-side 260", () => {
    const canon = (JSON.parse(pinned(drive, "08404263f86d3d5f52e73327febc9e2a78d3c6400f0c7d5e9e2ea2bb9765a3b1").toString("utf8")) as { canonical: { PLAN: Record<string, number>; dur: number; peak: number; corner: number; midBottom: number } }).canonical;
    const c: WasherCtx = { rig, plan: washerPlan(profile), servo: servoPreset(profile), calib: null };
    for (const k of ["feed", "travel", "accel", "jd", "steps", "tol", "jerk"] as const) expect(c.plan[k], k).toBe(canon.PLAN[k]);
    const q = washerPlanner(c).plan(washerSquare(60, c.plan.dense));
    expect(+q.durationS.toFixed(4)).toBe(canon.dur);
    expect(+q.peakMmS.toFixed(3)).toBe(canon.peak);
    expect(+q.points[R.corner.index]!.v.toFixed(3)).toBe(canon.corner);
    expect(+q.points[R.midBottom.index]!.v.toFixed(3)).toBe(canon.midBottom);
    expect(q.bindingAt[R.midBottom.index]).toBe("feed");
  });
});

describe("WASHER segments", () => {
  const R = washerRec.result;
  const ctx: WasherCtx = { rig: washerRig(profile), plan: { ...R.params.plan, dense: R.params.dense }, servo: R.params.servo, calib: null };
  const s = washerStream(profile);

  test("the duration rounding residual is carried: wire total plus residual equals the plan", () => {
    const plan = washerPlanner(ctx).plan(washerSquare(R.params.square, R.params.dense));
    const out = washerSegments(ctx, plan.chain, s);
    const wire = out.segments.reduce((a, g) => a + g.dur, 0);
    expect(Math.abs(wire + out.residualMs - plan.durationS * 1000)).toBeLessThan(1e-6);
    expect(Math.abs(out.residualMs)).toBeLessThanOrEqual(0.5);
    for (const g of out.segments) {
      expect(Number.isInteger(g.dur) && g.dur >= 1 && g.dur <= s.mergeMaxMs).toBe(true);
      expect(Number.isInteger(g.pan) && Number.isInteger(g.tilt)).toBe(true);
      expect(g.laser).toBe(1);
    }
  });

  test("no segment straddles a gate change: two strokes with a beam-off travel between", () => {
    const a = densify([[-20, 0], [0, 0]], R.params.dense).map(([x, y]) => ({ x, y, on: true }));
    const gap = densify([[0, 0], [0, 15]], R.params.dense).slice(1).map(([x, y]) => ({ x, y, on: false }));
    const b = densify([[0, 15], [20, 15]], R.params.dense).slice(1).map(([x, y]) => ({ x, y, on: true }));
    const plan = washerPlanner(ctx).plan([...a, ...gap, ...b]);
    const out = washerSegments(ctx, plan.chain, s);
    const flags = out.segments.map((g) => g.laser).join("");
    expect(flags).toMatch(/^1+0+1+$/);
    // the wire time at each flag change lands within a millisecond of the plan's gate
    const gates: number[] = [];
    for (let i = 1; i < plan.chain.pen.length; i++) if (plan.chain.pen[i] !== plan.chain.pen[i - 1]) gates.push(plan.chain.t[i]! * 1000);
    expect(gates).toHaveLength(2);
    let t = 0;
    const changes: number[] = [];
    out.segments.forEach((g, i) => {
      if (i > 0 && g.laser !== out.segments[i - 1]!.laser) changes.push(t);
      t += g.dur;
    });
    expect(changes).toHaveLength(2);
    changes.forEach((c, i) => expect(Math.abs(c - gates[i]!)).toBeLessThanOrEqual(1));
  });
});

// Every profile row this card added names a line of a canonical original;
// the line holds the value.
// The canonical files are read from their repo copies, held to the sha256 of the canonical lineage
// row: DETENT detent-plot.html as is, the WASHER page as the stored member of laser-rig-canonical.zip
// (zipped for the dash entity on its line 1852, as laser-rig.zip is). Before these copies the check read
// absolute paths outside the repo and was skipped wherever they were absent, CI included.
const lineage = JSON.parse(read("lineage.json")) as { id: string; kind: string; sha256: string }[];
const canonicalSha = (id: string): string => lineage.find((r) => r.id === id && r.kind === "canonical")!.sha256;
const canonicalLines = {
  detent: () => pinned("designs/detent/legacy/detent-plot.html", canonicalSha("detent.plot/beam")),
  washer: () => {
    const page = storedMember(pinned("designs/washer/legacy/laser-rig-canonical.zip", "35726c4d01c2a94bf36a8a229a1e72045dc46f3eb5efd506cc61bff7f62e0648"));
    expect(sha256(page)).toBe(canonicalSha("washer.app/laserriggg"));
    return page;
  },
};
const rows = (JSON.parse(read("packages/profile/data/constants.json")) as { constants: { id: string; value: number; provenance: { source: string } }[] }).constants
  .filter((c) => /^(detent|washer|servo)\.|^calibrate\./.test(c.id));
describe.each(rows)("profile row $id", (c) => {
  const m = /^originals\/(detent|washer)\/files\/\S+ line (\d+) /.exec(c.provenance.source);
  test("cites one line of a canonical original", () => expect(m).not.toBeNull());
  test("that line holds the value", () => {
    expect(m, `${c.id} cites no canonical line`).not.toBeNull();
    const line = canonicalLines[m![1] as "detent" | "washer"]().toString("utf8").split("\n")[Number(m![2]) - 1] ?? "";
    const field = c.id.split(".").at(-1)!;
    const numbers = (line.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
    expect(numbers, `${c.id} line ${m![2]}: ${line.trim()}`).toContain(c.value);
    if (c.id.startsWith("servo.")) expect(Number(new RegExp(`\\b${field}:([0-9.]+)`).exec(line)?.[1]), c.id).toBe(c.value);
  });
});
