// M02-T08 parity: the legacy SLUG physics, extracted from the page bytes by
// designs/slug/extract/extract.mjs and run in node, against the port in
// src/capsule. Both draw spawn velocities from the same seeded generator
// (the legacy module's Math.random is replaced for its reset) and are
// driven by the page's loop body at frame dt = DT. Expected values come
// from the legacy page itself, never from the port. Both sides take sine,
// cosine, tangent and atan2 from src/trig.ts: the legacy module reads Math
// at call time, and this file points those four at the fdlibm port for its
// run, so the comparison is of the page's arithmetic on every machine
// (CI-03). The page is the original of record
// (fab-knowledge:originals/slug/files/slug.html), read here and by the
// extraction through tools/test-support/originals-root.ts, so this file runs
// on the owner runner and never skips.

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { localOriginal } from "../../../tools/test-support/originals-root.js";
import { capsuleGeometry } from "../src/capsule/geometry.js";
import { capsuleWorld, resetWorld, type CapsuleWorld } from "../src/capsule/solver.js";
import { driveStep, runSlugTrial } from "../src/capsule/vend.js";
import { createPrng } from "../src/prng.js";
import * as trig from "../src/trig.js";
import { SLUG_SCENE } from "../scenes/slug.js";

const SIM = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = path.resolve(SIM, "..", "..");
const PAGE = "fab-knowledge:originals/slug/files/slug.html";
const EXTRACT = path.join(ROOT, "designs", "slug", "extract", "extract.mjs");
const lineage = JSON.parse(readFileSync(path.join(ROOT, "lineage.json"), "utf8")) as { id: string; sha256: string; dest: string | null }[];

interface V { x: number; y: number; z: number }
interface Legacy {
  P: Record<string, number | number[]>;
  CAP_R: number; ZCEIL_TOP: number; ZROT_TOP: number; ZDECK_TOP: number; STEPS_VEND: number; DEG_PER_STEP: number;
  rad(d: number): number;
  caps: { p: V; v: V }[];
  funPlanes: { n: V; d: V; o: V; len: number }[];
  step(dt: number, omega: number): void;
  reset(): void;
  rotorDeg: number; motorSteps: number; targetSteps: number;
}

/** Steps compared: reset, 2 s settle, then one vend and its settle, to 10 s (M02-T08 acceptance). */
const STEPS = 2400;
/** Position agreement the card asks for, mm. */
const TOL_MM = 1e-9;
const DT = 1 / 240;
/** The page's step rate, half steps/s (slug.html line 960). */
const RATE = 1000;

let legacyModule: string;
let loads = 0;

async function loadLegacy(): Promise<Legacy> {
  // A fresh module instance per trial: the query string defeats the ESM cache.
  const mod = (await import(`${pathToFileURL(legacyModule).href}?n=${++loads}`)) as { slug: Legacy };
  return mod.slug;
}

/** The legacy reset with Math.random replaced by the seeded generator, restored after. */
function seededReset(L: Legacy, seed: number): void {
  const prng = createPrng(seed);
  const orig = Math.random;
  Math.random = () => prng.next();
  try { L.reset(); } finally { Math.random = orig; }
}

/** The page loop body (slug.html lines 1213 to 1222) with frame dt = DT, so one physics step per frame. */
function legacyTick(L: Legacy): void {
  let omega = 0;
  if (L.targetSteps > L.motorSteps) {
    const adv = Math.min(RATE * DT, L.targetSteps - L.motorSteps);
    L.motorSteps += adv;
    const dDeg = adv * L.DEG_PER_STEP;
    L.rotorDeg += dDeg;
    omega = L.rad(dDeg) / Math.max(DT, 1e-6);
  }
  L.step(DT, omega);
}

function worstGap(L: Legacy, w: CapsuleWorld): number {
  let worst = 0;
  L.caps.forEach((c, i) => {
    const p = w.caps[i]!.p;
    worst = Math.max(worst, Math.abs(c.p.x - p.x), Math.abs(c.p.y - p.y), Math.abs(c.p.z - p.z));
  });
  return worst;
}

const TRIG = ["sin", "cos", "tan", "atan2"] as const;
const mathTrig = Object.fromEntries(TRIG.map((k) => [k, Math[k]])) as Pick<Math, (typeof TRIG)[number]>;

let dir = "";
afterAll(() => {
  Object.assign(Math, mathTrig);
  if (dir !== "") rmSync(dir, { recursive: true, force: true });
});
beforeAll(() => {
  Object.assign(Math, { sin: trig.sin, cos: trig.cos, tan: trig.tan, atan2: trig.atan2 });
  dir = mkdtempSync(path.join(tmpdir(), "hbf-slug-"));
  legacyModule = path.join(dir, "slug-app.mjs");
  const r = spawnSync(process.execPath, [EXTRACT, "--out", legacyModule], { encoding: "utf8" });
  expect(r.status, r.stderr).toBe(0);
});

describe("SLUG legacy step against the port (M02-T08)", () => {
  test("the page is the lineage row's bytes and the extraction copies step and relax verbatim", () => {
    const page = readFileSync(localOriginal(PAGE));
    expect(createHash("sha256").update(page).digest("hex")).toBe(lineage.find((r) => r.id === "slug.bench/slug-12")?.sha256);
    const lines = page.toString("utf8").split("\n");
    const mod = readFileSync(legacyModule, "utf8");
    // step and relax, slug.html lines 811 to 954
    expect(mod).toContain(lines.slice(810, 954).join("\n"));
    // P and the funnel functions, lines 202 to 262
    expect(mod).toContain(lines.slice(201, 262).join("\n"));
    for (const dest of ["packages/sim/src/capsule/geometry.ts", "packages/sim/src/capsule/solver.ts", "packages/sim/src/capsule/vend.ts"]) {
      expect(lineage.some((r) => r.dest === dest && r.sha256 === lineage.find((x) => x.id === "slug.bench/slug-12")?.sha256), dest).toBe(true);
    }
  });

  test("the scene rows equal the page's P and constants", async () => {
    const L = await loadLegacy();
    const P = L.P;
    const g = SLUG_SCENE.geometry;
    expect([g.t, g.capD, g.pockD, g.pockRc, g.nPock, g.xl, g.xr, g.yb, g.yf, g.zBase, g.zDeckB, g.zRot, g.rotH, g.zCeil, g.zFunTop, g.exiD, g.fb, g.yFback, g.rampW, g.doorZ1])
      .toEqual([P.t, P.cap_d, P.pock_d, P.pock_rc, P.npock, P.XL, P.XR, P.YB, P.YF, P.z_base, P.z_deckB, P.z_rot, P.rot_h, P.z_ceil, P.z_funtop, P.exi_d, P.fb, P.y_fback, P.ramp_w, P.door_z1]);
    expect([g.thr, g.exi, g.rampA, g.rampB]).toEqual([P.thr, P.exi, P.ramp_a, P.ramp_b]);
    const geo = capsuleGeometry(g);
    expect([geo.capR, geo.zCeilTop, geo.zRotTop, geo.zDeckTop]).toEqual([L.CAP_R, L.ZCEIL_TOP, L.ZROT_TOP, L.ZDECK_TOP]);
    expect(SLUG_SCENE.drive.stepsRev).toBe(L.STEPS_VEND);
    expect(SLUG_SCENE.drive.rotorDegPerVend / SLUG_SCENE.drive.stepsRev).toBe(L.DEG_PER_STEP);
    expect(SLUG_SCENE.drive.dt).toBe(DT);
    expect(SLUG_SCENE.drive.rate).toBe(RATE);
    // the funnel faces bit for bit, three.js quaternion rotation included
    expect(geo.funPlanes.map((f) => [f.n, f.d, f.o, f.len])).toEqual(L.funPlanes.map((f) => [{ ...f.n }, { ...f.d }, { ...f.o }, f.len]));
  });

  test("reset spawns the same lattice and the same seeded lateral velocities", async () => {
    const L = await loadLegacy();
    seededReset(L, 1);
    const w = capsuleWorld(capsuleGeometry(SLUG_SCENE.geometry), SLUG_SCENE.contact);
    resetWorld(w, SLUG_SCENE.protocol.capsules, createPrng(1));
    expect(w.caps).toHaveLength(18);
    expect(w.caps.map((c) => [c.p, c.v])).toEqual(L.caps.map((c) => [{ ...c.p }, { ...c.v }]));
    // the range is (r - 0.5) x 20 mm/s on x and y, so every draw lies inside 10 mm/s
    for (const c of w.caps) expect(Math.max(Math.abs(c.v.x), Math.abs(c.v.y))).toBeLessThan(10);
  });

  for (const seed of [1, 7]) {
    test(`seed ${seed}: every capsule position agrees to 1e-9 mm through ${STEPS} steps of reset, settle and one vend`, async () => {
      const L = await loadLegacy();
      seededReset(L, seed);
      const w = capsuleWorld(capsuleGeometry(SLUG_SCENE.geometry), SLUG_SCENE.contact);
      resetWorld(w, SLUG_SCENE.protocol.capsules, createPrng(seed));
      const m = { steps: 0, target: 0 };
      const settle = Math.round(SLUG_SCENE.protocol.settleS / DT);
      let worst = 0, moved = 0;
      const start = L.caps.map((c) => c.p.z);
      // crossings below the deck top seen on the legacy side, the page's own ZDECK_TOP
      const down = L.caps.map((c) => c.p.z < L.ZDECK_TOP);
      const crossed: { vend: number; capsule: number; step: number }[] = [];
      for (let s = 1; s <= STEPS; s++) {
        if (s === settle + 1) {
          L.targetSteps = L.motorSteps + L.STEPS_VEND;
          m.target = m.steps + SLUG_SCENE.drive.stepsRev;
        }
        legacyTick(L);
        driveStep(w, m, SLUG_SCENE.drive);
        worst = Math.max(worst, worstGap(L, w));
        L.caps.forEach((c, i) => {
          if (!down[i] && c.p.z < L.ZDECK_TOP) { down[i] = true; crossed.push({ vend: s > settle ? 1 : 0, capsule: i, step: s }); }
        });
      }
      L.caps.forEach((c, i) => { moved = Math.max(moved, Math.abs(c.p.z - start[i]!)); });
      expect(worst).toBeLessThanOrEqual(TOL_MM);
      expect(worst).toBe(0);
      expect(w.rotorDeg).toBe(L.rotorDeg);
      // the vend ran to its target and something moved: the comparison was not of two frozen piles
      expect(L.motorSteps).toBe(L.targetSteps);
      expect(Math.abs(L.rotorDeg - 90)).toBeLessThan(1e-9);
      expect(moved).toBeGreaterThan(100);
      // the first vend delivered on both sides
      const below = (zs: number[]): number => zs.filter((z) => z < L.ZDECK_TOP).length;
      expect(below(w.caps.map((c) => c.p.z))).toBe(below(L.caps.map((c) => c.p.z)));
      expect(below(L.caps.map((c) => c.p.z))).toBeGreaterThan(0);
      // the runner's protocol counts the same crossings at the same steps
      const row = runSlugTrial(SLUG_SCENE, seed);
      expect(crossed.length).toBeGreaterThan(0);
      expect(row.crossings.filter((c) => c.step <= STEPS)).toEqual(crossed);
    });
  }
});
