// reference/keys/flex-pair/chase.ts
// The keys flex-pair design (api-library-ai-design.md section 8.5; moved
// here from spec/fixtures/keys-flex-pair.ts at M-S-T09, D-179). A chase
// declares and never computes (D-178): one defineChase over a literal. The
// geometry is in build.ts beside it, the layout in bench.ts (D-174).
//
// Numbers: stack inputs from PIP (D-085, pip-controller src/layout.js):
// skin 0.72 mm, trace band 0.72 mm, isolation 0.96 mm, trace width 1.4 mm.
// On the ffc5p_20260819 grid (first layer 0.25, then 0.24; computed) they
// build with tops at 0.73, 1.45 and 2.41 mm. Each key is the PIP flex cone
// key (pip.md 5.1, D-223): cone height Hs 4.0 mm and face 10 mm are PIP's
// defaults (src/layout.js line 35). The cone snaps through m.layer to 4.08
// mm (17 layers) at defaults, so the CHK-KEY-01 interval is 1.428 to 2.04
// mm (35 to 50 percent of the built cone height, floor 1.2 mm; computed;
// D-241).
// The travel default 1.84 mm is PIP's gapPct 45 over the built cone, 1.836
// mm, on the 0.02 mm param step (computed). The travel stays a mm param so
// CHK-KEY-01 can fix the value it measures (D-064).
//
// Every numeric field's default lands on its step from the range minimum
// (G-09, TESTING.md param ranges): the cone range starts at 2.32 mm so the
// default 4.0 mm is seven 0.24 mm steps up; the cone still snaps to layers
// in build.ts. The travel 1.84 mm is not a whole number of 0.24 mm layers,
// so the sliced column ends one layer under colTop and the printed travel
// is 1.92 mm (computed; build.ts metric keys.<n>.printedTravel).

import { defineChase, type ParamsOf } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "keys-flex-pair", kind: "single", name: "FLEX PAIR", version: 1, chase: 2,
    kernels: ["geom", "mesh", "circuit", "3mf"], machines: ["ffc5p"],
    license: "CC-BY-SA-4.0",
  },
  // PIP's four slots and slot colours on the four-toolhead ffc5p
  // (pip-controller src/layout.js, slots): white PETG body, conductive PLA
  // traces and columns, pink TPU 95A cones and key tops, conductive TPU caps.
  materials: [
    { slot: 1, material: "petg", role: "body", label: "pad", preview: "#F4F1EA" },
    { slot: 2, material: "cpla", role: "conductor", label: "traces", preview: "#1A1A1A" },
    { slot: 3, material: "tpu95", role: "flex", label: "cones", preview: "#FE0386" },
    { slot: 4, material: "ctpu", role: "flex-conductor", label: "caps", preview: "#6E6E6E" },
  ],
  params: [
    { id: "pad", label: "PAD", live: "commit", fields: [
      { id: "W", type: "mm", label: "width", range: [40, 90], step: 1, default: 60 },
      { id: "H", type: "mm", label: "depth", range: [24, 50], step: 1, default: 30 },
      { id: "r", type: "mm", label: "corner", range: [0, 8], step: 0.5, default: 4, help: "outer corner radius" },
      { id: "T", type: "derived", label: "thickness", fn: "padThickness", unit: "mm" },
    ] },
    { id: "keys", label: "KEYS", live: "commit", fields: [
      { id: "keys", type: "list", label: "keys", min: 1, max: 2, item: [
        { id: "x", type: "mm", label: "x", range: [-35, 35], default: 0 },
        { id: "d", type: "mm", label: "face", range: [8, 14], step: 0.5, default: 10, help: "key face diameter" },
        { id: "cone", type: "mm", label: "cone", range: [2.32, 4.72], step: 0.24, default: 4,
          help: "cone height, snapped to layers" },
        { id: "gap", type: "mm", label: "travel", range: [0.8, 3.0], step: 0.02, default: 1.84,
          constraintDim: "contact.gap", help: "how far the cap moves before it reads" },
      ] },
    ] },
    { id: "wire", label: "WIRE", live: "commit", fields: [
      { id: "w", type: "mm", label: "trace", range: [0.8, 2.0], step: 0.05, default: 1.4,
        constraintDim: "conductor.width" },
      { id: "pads", type: "enum", label: "leads", default: "clip",
        options: [{ value: "clip", label: "clip pads" }, { value: "cup", label: "wire cups" }] },
    ] },
  ],
  presets: [
    { id: "one", label: "one key", params: { keys: [{ x: 0, d: 10, cone: 4, gap: 1.84 }] } },
    { id: "two", label: "two keys", params: { keys: [{ x: -14, d: 10, cone: 4, gap: 1.84 }, { x: 14, d: 10, cone: 4, gap: 1.84 }] } },
  ],
  build: { module: "./build.ts", fn: "build" },
  exports: [{ kind: "3mf", machine: "ffc5p", pose: "print" }, { kind: "stl" }, { kind: "card" }, { kind: "json" }, { kind: "coupon" }],
  // Wiring facts: changing an MCU or pin here leaves the buildHash unchanged.
  // Wait 3500 us as pip_stick ships it until a coupon calibrates (D-079).
  hookup: [
    { port: "port.key1", mcu: "rp2040", pin: "GP2",
      read: { model: "charge-release", drive: "high", driveUs: 30, waitUs: 3500, waitSource: "default" } },
    { port: "port.key2", mcu: "rp2040", pin: "GP3",
      read: { model: "charge-release", drive: "high", driveUs: 30, waitUs: 3500, waitSource: "default" } },
  ],
  // apart depends on how many keys the preset builds, so build.ts emits it.
  assertions: [
    { type: "volumeParity", part: "pad" },
  ],
});

/** The params type a build function sees. */
export type FlexPairParams = ParamsOf<typeof chase>;
