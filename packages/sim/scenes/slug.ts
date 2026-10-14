// Scene slug: the SLUG capsule machine and its vend protocol (M02-T08).
// Data only. The funnel and lattice rows the Rapier granular-funnel scene
// also reads (t, capD, xl, xr, yb, yf, zCeil, zFunTop, thr, fb and the spawn
// lattice) live once, with per-value provenance, in
// granular-funnel.world.json (lineage slug.params/slug-12) and are read from
// there; every other number is copied unchanged from the legacy line it
// cites. The file imports node:fs and types alone so Node strips it without
// a build. Lineage rows slug.capsule-geometry/slug-12,
// slug.capsule-solver/slug-12 and slug.vend-drive/slug-12.

import { readFileSync } from "node:fs";
import type { Provenance } from "@hackbuild/spec";
import type { SlugScene } from "../src/capsule/vend.js";

const PAGE = "designs/slug/legacy/slug.html (lineage slug.bench/slug-12, sha256 2d09238c27d5ca4bf023eeee44939b1500470ad2058822b8d0add48ec9bf3241)";
const BUILD = "designs/slug/legacy/BUILD.md (sha256 9babb59b59ecbc3f5a6f991c2804d10858fd6cc155baa1223ec1117b7f2e4a3e)";
const fromPage = (lines: string): Provenance => ({ tier: "inferred", method: "derived", date: "2026-10-07", source: `${PAGE} lines ${lines}` });

/** The shared SLUG rows file, beside this one. */
const ROWS = "granular-funnel.world.json";
const funnel = (JSON.parse(readFileSync(new URL(ROWS, import.meta.url), "utf8")) as { funnel: Record<string, { value: unknown }> }).funnel;
/** The value of one shared row, mm; a missing or non-finite row stops the load naming it. */
const row = (k: string): number => {
  const v = funnel[k]?.value;
  if (typeof v !== "number" || !Number.isFinite(v)) throw new Error(`scene slug: ${ROWS} has no finite funnel.${k}`);
  return v;
};

export const SLUG_SCENE: SlugScene = {
  id: "slug",
  geometry: {
    provenance: fromPage(`202 to 229 (P echo of slug.scad and the z constants), 236 to 244 (funnel), 685 to 693 (spawn), 713 (faces), 766 (hood), 874 (ramp normal); t, capD, xl, xr, yb, yf, zCeil, zFunTop, thr, fb and spawn read from packages/sim/scenes/${ROWS}, each row with its own provenance`),
    // shared rows, lines 203, 209 to 212, 685 to 693
    t: row("t"), capD: row("capD"), xl: row("xl"), xr: row("xr"), yb: row("yb"), yf: row("yf"),
    zCeil: row("zCeil"), zFunTop: row("zFunTop"), thr: [row("thrX"), row("thrY")], fb: row("fb"),
    spawn: { pitch: row("spawnPitch"), edgeGap: row("spawnEdgeGap"), above: row("spawnAboveTop") },
    // line 204
    pockD: 62, pockRc: 47.5, nPock: 4,
    // lines 210 to 211
    zBase: 0, zDeckB: 303, zRot: 310.6,
    // line 206
    rotH: 54,
    // lines 212 and 214
    exi: [0, 47.5], exiD: 66, yFback: -78,
    // line 215
    rampA: [-20, 120], rampB: [95, 35], rampW: 94,
    // line 874
    rampNormal: [0, 85, 115],
    // line 221
    doorZ1: 100,
    // line 766
    hood: { a0: 0, a1: 180, r: 100 },
    // lines 236 and 247: FUN_SIDES and fun_rz
    funnelFaces: [{ face: 0, rzDeg: 0 }, { face: 2, rzDeg: 90 }, { face: 3, rzDeg: 270 }],
  },
  contact: {
    provenance: fromPage("701, 730, 739, 750, 761 to 762, 787, 797, 814, 818 to 826, 833, 852 to 864, 874 to 885, 899, 904 to 908"),
    gravity: 9810,
    wallRestitution: 0.2,
    faceReflect: 1.15, faceDamp: 0.93,
    edgeReflect: 1.1, edgeDamp: 0.9,
    restBounce: 0.12, restKeep: 0.86,
    rimReflect: 1.1, rimDamp: 0.90,
    pocketKeep: 0.25, pocketCarry: 0.75,
    pocketRate: 9, faceRate: 7,
    rampReflect: 1.1, rampKeepX: 0.97, rampKeepY: 0.995, rampMargin: 6,
    baseBounce: 0.15, baseKeep: 0.8,
    pairImpulse: 0.55,
    relaxIters: 4,
    speedCap: 2600, damping: 0.9975,
    spawnLateralSpan: 20,
  },
  drive: {
    provenance: fromPage("224 to 226 (STEPS_REV, STEPS_VEND, DEG_PER_STEP), 960 (rate), 1208 (DT)"),
    stepsRev: 4075.7728,
    rotorDegPerVend: 90,
    rate: 1000,
    dt: 1 / 240,
  },
  protocol: {
    // The runner behind 126 of 128 is absent (D-136, D-180), so the protocol is the card's.
    provenance: { tier: "inferred", method: "derived", date: "2026-10-07", source: "docs/plan/milestones/M02-sim.md M02-T08 step 4; 18 capsules is the page reset (slug.html line 975)" },
    capsules: 18,
    settleS: 2.0,
    vends: 16,
    afterS: 1.5,
  },
  trials: 8,
  seed: 1,
  expected: {
    trials: 8,
    runs: 128,
    passes: 126,
    missVends: [1],
    source: `${BUILD} line 266 to 267: "126 of 128 vends across eight trials delivered exactly one capsule. The two misses are both the first vend of a run"`,
  },
  status: "unverified",
};
