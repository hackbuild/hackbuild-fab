// spec/fixtures/gold.ts
// Compiles the gold standard shapes (synthesis/gold-standard.md section 12)
// against the spec: compound showWhen, readout grids with limits and
// verdicts, zero means auto, quality params, slot and instances params,
// group folds and presets, preset notes and expected readings, kit
// exports, a contact scene, slot colour, and on the bench a stick drive
// pad with its contact function, plots, step cams, chips, combined views,
// installed context, stage tools and welcome starts. Shapes after TOGGLE
// and COTTER; numbers are illustrations and prove nothing.
// 2026-10-05.

import { defineChase, type ParamsOf } from "../chase.js";
import { defineBench } from "../bench.js";
import type { ContactFn } from "../build.js";
import type { BenchHook } from "../hook.js";
import type { ResultTarget } from "../checks.js";
import type { ReadModel } from "../circuit.js";

export const chase = defineChase({
  meta: {
    id: "gold-stick", kind: "composer", name: "GOLD STICK", version: 1, chase: 2,
    kernels: ["geom"], machines: ["ffc5p"], license: "CC-BY-SA-4.0",
  },
  materials: [
    { slot: 1, material: "pla", role: "body", preview: "#1a1a1a" },
    { slot: 2, material: "ctpu", role: "flex-conductor", preview: "#7fff00" },
  ],
  params: [
    {
      id: "travel", label: "TRAVEL",
      fields: [
        { id: "contactTilt", type: "deg", label: "contact tilt", range: [10, 20], step: 0.5, default: 14 },
        { id: "gate", type: "enum", label: "gate", default: "round",
          options: [{ value: "round", label: "round" }, { value: "square", label: "square" }, { value: "octagon", label: "octagon" }] },
        { id: "texture", type: "enum", label: "texture", default: "dots",
          options: [{ value: "dots", label: "dots" }, { value: "none", label: "none" }] },
        { id: "textureDepth", type: "mm", label: "texture depth", range: [0.2, 1], step: 0.04, default: 0.4,
          showWhen: { field: "texture", notEquals: "none" } },
        { id: "seg", type: "int", label: "segments", range: [24, 96], step: 8, default: 48, quality: true },
      ],
      readouts: [
        { id: "stop", type: "derived", label: "stop", fn: "stopDeg", unit: "deg" },
        { id: "neckStrain", type: "derived", label: "neck strain", fn: "neckStrain", unit: "percent",
          limit: { max: 25, check: "CHK-PRT-30" },
          verdict: [{ below: 15, word: "springs back" }, { below: 25, word: "near yield" }, { below: 1000, word: "will crack" }] },
      ],
      note: "contact tilt sets where the pads close; overtravel stops the stem on the lip.",
    },
    {
      id: "body", label: "BODY",
      fields: [
        { id: "base", type: "enum", label: "base", default: "solo",
          options: [{ value: "solo", label: "solo" }, { value: "blocks", label: "blocks" }] },
        { id: "studs", type: "int", label: "body studs", range: [0, 6], step: 1, default: 0,
          auto: { at: 0, label: "auto", fn: "autoStuds" },
          showWhen: { all: [{ field: "base", equals: "blocks" }, { any: [{ field: "gate", in: ["square", "octagon"] }, { field: "contactTilt", notEquals: 14 }] }] } },
        { id: "padSlot", type: "slot", label: "pad filament", roles: ["flex-conductor"], default: 2 },
        { id: "modulus", type: "number", label: "tpu modulus", unit: "MPa", range: [10, 60], step: 1, default: 26,
          checks: ["CHK-PRT-30"] },
        { id: "pauseLayer", type: "derived", label: "pause before layer", fn: "pauseLayer", focal: true },
      ],
      fold: { label: "physics", fields: ["modulus"] },
      presets: [{ id: "yousu", label: "yousu", params: { modulus: 26 } }],
    },
    {
      id: "wall", label: "WALL",
      fields: [
        {
          id: "hooks", type: "instances", label: "hooks", min: 0, max: 24,
          types: {
            hook: { label: "hook", blurb: "a bent rod hook for the pegboard",
              fields: [{ id: "rod", type: "mm", label: "rod", range: [3, 6], step: 0.1, default: 4.6 }] },
            shelf: { label: "shelf", blurb: "a flat shelf on two hooks",
              fields: [{ id: "depth", type: "mm", label: "depth", range: [40, 120], step: 5, default: 80 }] },
          },
          place: { lattice: { pitchMm: 25.4, extent: "board.cells", faces: 2, mirror: "x" } },
        },
      ],
    },
  ],
  presets: [
    { id: "solo4", label: "solo, 4 way", params: { base: "solo" },
      note: "the smallest stick. drag the pad east past 14 degrees to close e.",
      expect: [{ drive: "stick", value: true, reads: { dir: "E", logic: "LOW" }, tol: 0.05 }] },
  ],
  build: { module: "./build.ts", fn: "build" },
  exports: [
    { kind: "3mf", pose: "print", presets: { printer: "ffc5p", process: "0.24 standard", filament: "pla" },
      card: { sections: ["layer", "breakers", "assembly", "pause", "hookup", "grams", "fit-test"], assembly: "assemblyLines" } },
    { kind: "stl", bundle: ["card", "json", "pinout"], naming: "xNN_", plates: { pack: "fdm", bedMm: [256, 256] } },
  ],
  assertions: [],
  scene: { nets: "contact", wires: { fit: { slackMm: 4 }, shapes: ["straight", "spiral"], export: true } },
});

// ParamsOf maps instances to tagged records and slot to its number.
type GoldParams = ParamsOf<typeof chase>;
const sample: GoldParams = {
  contactTilt: 14, gate: "square", texture: "none", textureDepth: 0.4, seg: 48,
  base: "blocks", studs: 0, padSlot: 2, modulus: 26,
  hooks: [{ id: "h1", type: "hook", at: [2, 3], face: 1, rod: 4.6 }, { id: "s1", type: "shelf", depth: 80 }],
};
void sample;

export const contact: ContactFn = (metrics, _target, stimulus) => {
  const at = metrics.find((m) => m.id === "stick.contactDeg");
  const tilt = typeof stimulus === "object" ? stimulus.tiltDeg : 0;
  const closes = typeof at?.value === "number" && tilt >= at.value;
  return { closed: closes ? ["pad.E"] : [], dir: closes ? "E" : "none", pose: { tiltDeg: tilt, phiDeg: 0 } };
};

export const bench = defineBench(chase, {
  shell: "paper",
  views: {
    default: "assembled", modes: ["assembled", "exploded", "section", "plate", "split"],
    render: ["solid", "ghost", "xray", "wire"], overlays: ["cams", "legend", "hud", "tools", "drive", "busy", "welcome"],
    drive: {
      targets: "metrics.pads", gesture: "stick", contact: "contact", pickInView: true,
      readout: ["dir", "tilt", "logic", "pinV", "pullupOhm"],
      pad: { draw: "geometry", regions: "pads.wedges", threshold: "stick.contactCurve", stop: "stick.stopCurve" },
      springMs: 360, holdToggle: true, split: "4",
    },
    cams: ["iso", "top", "front", "under", "eye"], stage: "graph",
    combine: [["exploded", "section", "xray"]],
    section: { follows: "drive" },
    explode: { along: "insertion", unit: "explode.step" },
    scene: { mountMm: 1200, floor: true, eyeMm: 1600, props: { seed: "part.id", export: false } },
    tools: [{ id: "move", writes: "/hooks", steps: ["wall"] }],
  },
  plots: {
    spring: { metric: "spring.curve", x: { label: "travel", unit: "mm" }, y: { label: "force", unit: "N" },
      marks: ["contact", "peak"], behaviour: { metric: "spring.q", words: [{ below: 2, word: "soft spring" }, { below: 2.6, word: "clicks" }, { below: 100, word: "latches" }] } },
  },
  rail: [
    { step: "stick", goal: "shape the neck and set the contact tilt", panels: ["params.travel", "plot.spring"], focus: "contactTilt" },
    { step: "body", goal: "pick the base and the pad filament", panels: ["params.body", "materials"], cam: "under" },
    { step: "wall", goal: "hang the hooks", panels: ["params.wall"], cam: "eye" },
    { step: "print", goal: "pause where the card says, then export", panels: ["checks", "exports"], focus: "pauseLayer", view: "plate" },
  ],
  welcome: { tagline: "a printed thumbstick", starts: [{ preset: "solo4", intent: "a 4 way stick on its own", process: "fdm, two filaments", time: "1 h 40 min" }] },
  status: ["mesh.fresh", "warn.count", "bed.fit", "mass", "route.verdict", "derived.pauseLayer"],
  build: { autoToggle: true, slowMs: 2500 },
});

// Hook: stick stimulus, release, error, unknown export kind.
export async function driveStick(hook: BenchHook): Promise<string | number | boolean | undefined> {
  const read = await hook.drive("stick", { tiltDeg: 14.2, phiDeg: 180 });
  await hook.release();
  return hook.error ?? read["dir"];
}

// A pair target and the new read models.
export const collision: ResultTarget = {
  level: "pair", a: { level: "part", part: "hook.h1" }, b: { level: "part", part: "shelf.s1" }, at: [0, 0, 12],
};
export const reads: readonly ReadModel[] = [
  { model: "pullup", active: "low", externalOhm: { auto: "e12", ratio: 10 } },
  { model: "rc-time", thresholdV: 1.65, cpuHz: 125000000 },
  { model: "slide", wiper: "adc", pressure: "pullup" },
];
