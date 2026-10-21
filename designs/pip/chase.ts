// designs/pip/chase.ts
// PIP, the printed game controller (knowledge/designs/pip.md), as a chase.
// A chase declares and never computes (D-178). Release 1 takes kind single:
// the composer binding of M10-T13 is engine work, so the four button
// archetypes are placed by build.ts from the groups list.
//
// Sources, the canonical lineage row of each (D-222): rows, ranges and
// steps from originals/pip/files/haft-src/bench/part1.html (lineage
// pip.bench-part1/haft-9, cited as part1.html), defaults from the same
// tree's src/layout.js defaults() (pip.layout/haft-9, cited as layout.js).
// pip-controller b137deb carries the same lines with the same values
// except where a comment names the difference. The BODY rows are the M09
// fixture packages/ui/test/fixtures/pip-layout.ts.
//
// Steps (bench.ts lands with the bench item): LAYOUT body and the groups;
// BUTTONS flex, clicky, touch and stick; BOARD mount and bezel; PRINT
// routing and plate. A group of button rows cannot yet show only while a
// list item uses its type (showWhen reads one field, not a list), so the
// four button groups always show.
//
// Not params, because profile or catalog owns the number: the buried
// stack (layout.js line 27: skin, trace, iso, pad) is profile stack.skin,
// stack.trace, stack.iso and stack.overL2 (D-085); the trace width
// (route.w) is stack.traceWidth; bleed is the profile bleed table, 0
// (D-084); the beam modulus (clicky.E) is the petg row; the phys fold
// (layout.js line 46) is the cpla, ctpu and rp2040 pin rows (D-081); the
// board dimensions (layout.js line 39) are the rp2040-zero catalog row.
// migrate/legacy.ts names the row each legacy key reads.
//
// Where a legacy default is off its slider step (G-09), the step is the
// largest that holds both the legacy step and the default: flexHs,
// clickBeam, clickWidth, clickFlangeT and cupH. stickCapH defaults to 1.2
// (layout.js line 38) under a slider whose floor is 1.92 (part1.html line
// 283), so its range starts at 1.2.
//
// Hookup (layout.js line 42 pins): keys read by charge-release driven
// high with the 3500 us wait and touch pads driven low with 1500 us, as
// the emitted firmware does, until a coupon calibrates them (D-079,
// waitSource default, inferred). pip.ino still ships a 200 us key wait
// (D-080); hackbuild-fab never edits pip-controller. The read model follows
// the default group types: a group switched to another type keeps its
// entry until the hookup is edited.

import { defineChase, type ParamsOf } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "pip", kind: "single", name: "PIP", version: 1, chase: 2,
    kernels: ["geom", "mesh", "circuit", "3mf"], machines: ["ffc5p"],
    license: "CC-BY-SA-4.0",
  },
  // layout.js lines 47 to 52; roles as part1.html line 372 names them.
  materials: [
    { slot: 1, material: "petg", role: "body", label: "structure and bezel", preview: "#F4F1EA" },
    { slot: 2, material: "cpla", role: "conductor", label: "conductive traces and label ink", preview: "#1A1A1A" },
    { slot: 3, material: "tpu95", role: "flex", label: "tpu keys and the pink of the mark", preview: "#FE0386" },
    { slot: 4, material: "ctpu", role: "flex-conductor", label: "conductive tpu contacts", preview: "#6E6E6E" },
  ],
  params: [
    // LAYOUT. part1.html lines 211 to 217; layout.js line 26 (shape) and 27 (stack.bezel).
    { id: "body", label: "BODY", live: "commit", fields: [
      { id: "shape", type: "enum", label: "shape", default: "stadium",
        options: [{ value: "stadium", label: "stadium" }, { value: "slab", label: "slab" }, { value: "grips", label: "grips" }] },
      { id: "W", type: "mm", label: "width", range: [100, 220], step: 1, default: 150 },
      { id: "H", type: "mm", label: "depth", range: [50, 100], step: 1, default: 64 },
      { id: "corner", type: "mm", label: "corner", range: [2, 30], step: 0.5, default: 10, showWhen: { field: "shape", equals: "slab" } },
      { id: "drop", type: "mm", label: "grip drop", range: [4, 30], step: 0.5, default: 14, showWhen: { field: "shape", equals: "grips" } },
      { id: "bezel", type: "mm", label: "bezel", range: [1.44, 4.8], step: 0.24, default: 2.4 },
      { id: "bezelChamfer", type: "mm", label: "bezel edge", range: [0, 1.92], step: 0.24, default: 0.96 },
      { id: "T", type: "derived", label: "thickness", fn: "bodyThickness", unit: "mm",
        help: "the body grows to whatever the tallest key and the board pocket need, snapped to layers" },
    ] },
    // The button groups, part3.js lines 317 to 329 (renderGroups), defaults
    // layout.js lines 30 to 33. Four fixed groups, one per legacy group: a
    // list param has one default per item field, so it cannot hold PIP's
    // four different default groups (the M09 fixture's list builds four left
    // clusters at the origin). kind exists only on the left cluster, type and
    // pitch hide while it is a stick, and the shoulder group has no pitch.
    { id: "left", label: "LEFT CLUSTER", live: "commit", fields: [
      { id: "leftOn", type: "bool", label: "on", default: true },
      { id: "leftKind", type: "enum", label: "kind", default: "dpad",
        options: [{ value: "dpad", label: "d-pad" }, { value: "stick", label: "stick" }] },
      { id: "leftType", type: "enum", label: "type", default: "flex", showWhen: { field: "leftKind", notEquals: "stick" },
        options: [{ value: "flex", label: "flex" }, { value: "clicky", label: "clicky" }, { value: "touch", label: "touch" }] },
      { id: "leftX", type: "mm", label: "x", range: [-90, 90], step: 0.5, default: -44 },
      { id: "leftY", type: "mm", label: "y", range: [-40, 40], step: 0.5, default: 1 },
      { id: "leftPitch", type: "mm", label: "pitch", range: [10, 30], step: 0.5, default: 14, showWhen: { field: "leftKind", notEquals: "stick" } },
    ] },
    { id: "face", label: "FACE KEYS", live: "commit", fields: [
      { id: "faceOn", type: "bool", label: "on", default: true },
      { id: "faceType", type: "enum", label: "type", default: "clicky",
        options: [{ value: "flex", label: "flex" }, { value: "clicky", label: "clicky" }, { value: "touch", label: "touch" }] },
      { id: "faceX", type: "mm", label: "x", range: [-90, 90], step: 0.5, default: 42 },
      { id: "faceY", type: "mm", label: "y", range: [-40, 40], step: 0.5, default: 1 },
      { id: "facePitch", type: "mm", label: "pitch", range: [10, 30], step: 0.5, default: 17 },
    ] },
    { id: "menu", label: "MENU KEYS", live: "commit", fields: [
      { id: "menuOn", type: "bool", label: "on", default: true },
      { id: "menuType", type: "enum", label: "type", default: "touch",
        options: [{ value: "flex", label: "flex" }, { value: "clicky", label: "clicky" }, { value: "touch", label: "touch" }] },
      { id: "menuX", type: "mm", label: "x", range: [-90, 90], step: 0.5, default: 0 },
      { id: "menuY", type: "mm", label: "y", range: [-40, 40], step: 0.5, default: -15 },
      { id: "menuPitch", type: "mm", label: "pitch", range: [10, 30], step: 0.5, default: 17 },
    ] },
    { id: "shoulder", label: "TOP L / R", live: "commit", fields: [
      { id: "shoulderOn", type: "bool", label: "on", default: false },
      { id: "shoulderType", type: "enum", label: "type", default: "flex",
        options: [{ value: "flex", label: "flex" }, { value: "clicky", label: "clicky" }, { value: "touch", label: "touch" }] },
      { id: "shoulderX", type: "mm", label: "x", range: [-90, 90], step: 0.5, default: 27 },
      { id: "shoulderY", type: "mm", label: "y", range: [-40, 40], step: 0.5, default: 22 },
    ] },
    // BUTTONS. part1.html lines 227 to 236; layout.js line 35.
    { id: "flex", label: "FLEX CONE", live: "commit",
      note: "printed in place: a TPU cone on a buried foot ring, a conductive TPU cap over the hole, two split conductive PLA columns under it. the gap is held at 35 to 50 percent of the cone, never under 1.2 mm, because a pressed cone only travels about half its height.",
      fields: [
        { id: "flexFace", type: "mm", label: "face", range: [6, 16], step: 0.2, default: 10 },
        { id: "flexHs", type: "mm", label: "cone height", range: [2.4, 7], step: 0.08, default: 4 },
        { id: "flexAlpha", type: "deg", label: "cone angle", range: [25, 50], step: 1, default: 40 },
        { id: "flexWall", type: "mm", label: "wall", range: [0.4, 1.2], step: 0.05, default: 0.6 },
        { id: "flexHole", type: "mm", label: "hole", range: [2, 6], step: 0.1, default: 3.6 },
        { id: "flexCap", type: "mm", label: "cap", range: [0.48, 1.44], step: 0.24, default: 0.72 },
        { id: "flexGapPct", type: "number", unit: "percent", label: "contact gap", range: [35, 50], step: 1, default: 45 },
        { id: "flexSplit", type: "mm", label: "split", range: [0.6, 1.6], step: 0.05, default: 0.8 },
        { id: "flexFaceT", type: "mm", label: "face disc", range: [0.72, 2.4], step: 0.24, default: 1.2 },
        { id: "flexProtrude", type: "mm", label: "protrude", range: [0.8, 5], step: 0.1, default: 2.6 },
      ] },
    // part1.html lines 243 to 259; layout.js line 36. endClr has no row and stays the archetype's.
    { id: "clicky", label: "CLICK SPRING", live: "commit",
      note: "a double cosine beam, printed flat in PETG with a conductive TPU tip locked in by a dovetail. the slot is snug only under the end blocks, where a rib keys each one down; over the arch it opens out so the beams never touch a wall. the curve comes from a corotational beam solve of these numbers; the contact lands just past the snap.",
      fold: { label: "spring internals", fields: ["clickEnd", "clickShuttle", "clickTip", "clickFlange", "clickFlangeT", "clickSlotClr", "clickRelief", "clickRib"] },
      fields: [
        { id: "clickSpan", type: "mm", label: "span", range: [16, 30], step: 0.5, default: 24 },
        { id: "clickBeam", type: "mm", label: "beam", range: [0.4, 0.8], step: 0.01, default: 0.55 },
        { id: "clickRise", type: "ratio", label: "rise q", range: [1.5, 2.8], step: 0.05, default: 2, help: "arch rise over beam thickness" },
        { id: "clickWidth", type: "mm", label: "width", range: [1.2, 3.6], step: 0.08, default: 1.6 },
        { id: "clickGap", type: "mm", label: "beam gap", range: [0.6, 2], step: 0.1, default: 1 },
        { id: "clickCap", type: "mm", label: "cap", range: [7, 14], step: 0.5, default: 10 },
        { id: "clickProtrude", type: "mm", label: "protrude", range: [1, 5], step: 0.1, default: 3 },
        { id: "clickCapMat", type: "enum", label: "cap material", default: "tpu",
          options: [{ value: "tpu", label: "tpu (slot 3)" }, { value: "petg", label: "petg (slot 1)" }] },
        { id: "clickEnd", type: "mm", label: "end block", range: [1.8, 5], step: 0.1, default: 2.2 },
        { id: "clickShuttle", type: "mm", label: "shuttle", range: [2.4, 5], step: 0.1, default: 3 },
        { id: "clickTip", type: "mm", label: "tip", range: [2, 4.4], step: 0.1, default: 3.2 },
        { id: "clickFlange", type: "mm", label: "flange", range: [0.8, 2.4], step: 0.1, default: 1.2 },
        { id: "clickFlangeT", type: "mm", label: "flange thk", range: [0.72, 1.92], step: 0.04, default: 1 },
        { id: "clickSlotClr", type: "mm", label: "end fit", range: [0.15, 0.6], step: 0.05, default: 0.3 },
        { id: "clickRelief", type: "mm", label: "travel relief", range: [0, 2.4], step: 0.1, default: 1.2 },
        { id: "clickRib", type: "mm", label: "rib", range: [0.6, 1.6], step: 0.1, default: 0.8 },
      ] },
    // part1.html lines 265 to 269; layout.js line 37.
    { id: "touch", label: "TOUCH COMB", live: "commit",
      note: "interdigitated conductive PLA flush with the bezel top on a PETG boss. a fingertip bridges the sense comb to the 3V3 comb; no moving part.",
      fields: [
        { id: "touchD", type: "mm", label: "diameter", range: [8, 20], step: 0.5, default: 12 },
        { id: "touchFinger", type: "mm", label: "finger", range: [0.6, 2], step: 0.05, default: 1 },
        { id: "touchGap", type: "mm", label: "gap", range: [0.6, 2], step: 0.05, default: 0.8 },
        { id: "touchSpine", type: "mm", label: "spine", range: [1.2, 3], step: 0.1, default: 1.8 },
        { id: "touchRim", type: "mm", label: "rim", range: [0.6, 2], step: 0.1, default: 0.6 },
      ] },
    // part1.html lines 274 to 285; layout.js line 38; dish hides on a separate cap (part3.js line 303). capRings has no row and stays the archetype's.
    { id: "stick", label: "STICK", live: "commit",
      note: "the TOGGLE mechanism: a TPU stem on an anchored neck, a conductive TPU band that lies flat against the well wall at full tilt, bridging a low wall pad to the common ring above it.",
      fields: [
        { id: "stickTop", type: "enum", label: "thumb pad", default: "inplace",
          help: "printed on: the thumb pad comes out of the printer attached, with a 45 degree dish you can feel, and the bezel hole is sized to drop over it. separate cap: a small stem through a tight hole, with the pad pressed on afterwards.",
          options: [{ value: "inplace", label: "thumb pad printed on" }, { value: "press", label: "separate cap" }] },
        { id: "stickTilt", type: "deg", label: "tilt", range: [8, 22], step: 0.5, default: 14 },
        { id: "stickOver", type: "deg", label: "overtravel", range: [0, 8], step: 0.5, default: 3 },
        { id: "stickBandR", type: "mm", label: "band radius", range: [3.5, 8], step: 0.1, default: 4.8 },
        { id: "stickBandH", type: "mm", label: "band height", range: [1.44, 4.8], step: 0.24, default: 2.4 },
        { id: "stickNeckD", type: "mm", label: "neck", range: [2, 5], step: 0.1, default: 3 },
        { id: "stickNeckH", type: "mm", label: "neck height", range: [1.2, 5], step: 0.24, default: 2.4 },
        { id: "stickStemD", type: "mm", label: "stem", range: [3, 6], step: 0.1, default: 6 },
        { id: "stickCapD", type: "mm", label: "thumb cap", range: [12, 26], step: 0.5, default: 15 },
        { id: "stickCapH", type: "mm", label: "cap thk", range: [1.2, 5], step: 0.24, default: 1.2 },
        { id: "stickDish", type: "mm", label: "dish", range: [0, 3], step: 0.1, default: 1.6, showWhen: { field: "stickTop", notEquals: "press" } },
        { id: "stickPadGap", type: "mm", label: "pad split", range: [0.6, 2], step: 0.1, default: 0.8 },
      ] },
    // BOARD. part1.html lines 296 to 316; layout.js lines 39 (board) and 40 (cups).
    { id: "mount", label: "MOUNT", live: "commit",
      fold: { label: "wire cups", fields: ["cupOd", "cupBore", "cupH", "cupPitch", "cupPerRow"] },
      fields: [
        { id: "mode", type: "enum", label: "mount", default: "press",
          help: "press fit: conductive bumps under the castellations, the bezel ribs push the board onto them. wire cups: numbered conductive cups beside the pocket; push a hot wire into the bore or drive an M1.2 screw. both keeps the cups as a backup.",
          options: [{ value: "press", label: "press fit" }, { value: "wire", label: "wire cups" }, { value: "both", label: "both" }] },
        { id: "contact", type: "enum", label: "contact", default: "bump",
          options: [{ value: "bump", label: "bumps" }, { value: "socket", label: "header sockets" }] },
        { id: "press", type: "mm", label: "press", range: [0, 0.6], step: 0.05, default: 0.3 },
        { id: "bumpH", type: "mm", label: "bump height", range: [0.24, 1.2], step: 0.24, default: 0.48 },
        { id: "bumpW", type: "mm", label: "bump size", range: [1, 2], step: 0.05, default: 1.5 },
        { id: "pocketClr", type: "mm", label: "pocket play", range: [0.1, 0.6], step: 0.05, default: 0.3 },
        { id: "sockOD", type: "mm", label: "socket od", range: [1.4, 2.4], step: 0.05, default: 1.8, showWhen: { field: "contact", equals: "socket" } },
        { id: "sockBore", type: "mm", label: "socket bore", range: [0.6, 0.9], step: 0.05, default: 0.75, showWhen: { field: "contact", equals: "socket" } },
        { id: "pinLen", type: "mm", label: "pin length", range: [2, 6], step: 0.1, default: 3, showWhen: { field: "contact", equals: "socket" } },
        { id: "headerT", type: "mm", label: "header spacer", range: [1.5, 4], step: 0.1, default: 2.5, showWhen: { field: "contact", equals: "socket" } },
        { id: "datum", type: "bool", label: "corner datum", default: true },
        { id: "window", type: "bool", label: "back window", default: true },
        { id: "cupOd", type: "mm", label: "cup od", range: [2.4, 4.4], step: 0.1, default: 3.2 },
        { id: "cupBore", type: "mm", label: "cup bore", range: [0.6, 2], step: 0.1, default: 1 },
        { id: "cupH", type: "mm", label: "cup height", range: [1.44, 5], step: 0.12, default: 3 },
        { id: "cupPitch", type: "mm", label: "cup pitch", range: [3.6, 7], step: 0.1, default: 5.2 },
        { id: "cupPerRow", type: "int", label: "per row", range: [3, 10], step: 1, default: 6 },
      ] },
    // part1.html lines 328 to 336; layout.js line 41. pegs is bezel.pins: false here, true at pip-controller b137deb.
    { id: "bezelGroup", label: "BEZEL", live: "commit",
      fields: [
        { id: "labels", type: "bool", label: "labels", default: true },
        { id: "mark", type: "bool", label: "mark", default: true },
        { id: "lip", type: "bool", label: "lip and groove", default: true },
        { id: "pry", type: "bool", label: "pry notch", default: true },
        { id: "pegs", type: "bool", label: "pegs", default: false },
        { id: "lipD", type: "mm", label: "lip depth", range: [0.6, 2.4], step: 0.1, default: 1.6, showWhen: { field: "lip", equals: true } },
        { id: "lipT", type: "mm", label: "lip thickness", range: [0.8, 2.4], step: 0.1, default: 1.2, showWhen: { field: "lip", equals: true } },
        { id: "lipInset", type: "mm", label: "lip inset", range: [1.2, 6], step: 0.2, default: 3.6, showWhen: { field: "lip", equals: true } },
        { id: "lipFit", type: "mm", label: "lip fit", range: [0.05, 0.3], step: 0.05, default: 0.1, showWhen: { field: "lip", equals: true } },
        { id: "labelH", type: "mm", label: "label height", range: [2.4, 5], step: 0.1, default: 2.4 },
      ] },
    // PRINT. part1.html lines 362 to 366; layout.js line 28. iters has no row; 24 is the router cap.
    { id: "routing", label: "ROUTING", live: "commit",
      fields: [
        { id: "routeClr", type: "mm", label: "clearance", range: [0.5, 1.6], step: 0.05, default: 0.8 },
        { id: "routeGrid", type: "enum", label: "grid", default: "0.5",
          options: [{ value: "0.4", label: "0.40" }, { value: "0.5", label: "0.50" }, { value: "0.6", label: "0.60" }, { value: "0.8", label: "0.80" }] },
        { id: "routeVia", type: "mm", label: "via radius", range: [0.6, 1.2], step: 0.05, default: 0.8 },
        { id: "routeMargin", type: "mm", label: "edge margin", range: [1.5, 6], step: 0.1, default: 3 },
        { id: "iters", type: "int", label: "iterations", range: [1, 24], step: 1, default: 24 },
      ] },
    // part1.html line 383; layout.js line 54.
    { id: "plate", label: "PLATE", live: "commit",
      fields: [
        { id: "seg", type: "int", label: "smoothness", range: [24, 72], step: 4, default: 40, quality: true },
      ] },
  ],
  presets: [
    { id: "worked", label: "worked example", params: { pegs: true },
      note: "the pip-controller worked example: a flex d-pad, clicky face keys, touch menu keys, shoulders off." },
    { id: "stick", label: "stick example", params: { pegs: true, leftKind: "stick", menuType: "flex" },
      note: "the left cluster as a tilt stick and flex menu keys." },
    { id: "blank", label: "blank", params: { leftOn: false, faceOn: false, menuOn: false },
      note: "every group off: the body, the board pocket and the bezel." },
  ],
  build: { module: "./build.ts", fn: "build" },
  exports: [{ kind: "3mf", machine: "ffc5p", pose: "print" }, { kind: "stl" }, { kind: "card" }],
  hookup: [
    { port: "port.UP", mcu: "rp2040", pin: "GP29", read: { model: "charge-release", drive: "high", driveUs: 30, waitUs: 3500, waitSource: "default" } },
    { port: "port.LEFT", mcu: "rp2040", pin: "GP28", read: { model: "charge-release", drive: "high", driveUs: 30, waitUs: 3500, waitSource: "default" } },
    { port: "port.RIGHT", mcu: "rp2040", pin: "GP27", read: { model: "charge-release", drive: "high", driveUs: 30, waitUs: 3500, waitSource: "default" } },
    { port: "port.DOWN", mcu: "rp2040", pin: "GP26", read: { model: "charge-release", drive: "high", driveUs: 30, waitUs: 3500, waitSource: "default" } },
    { port: "port.X", mcu: "rp2040", pin: "GP3", read: { model: "charge-release", drive: "high", driveUs: 30, waitUs: 3500, waitSource: "default" } },
    { port: "port.A", mcu: "rp2040", pin: "GP4", read: { model: "charge-release", drive: "high", driveUs: 30, waitUs: 3500, waitSource: "default" } },
    { port: "port.Y", mcu: "rp2040", pin: "GP5", read: { model: "charge-release", drive: "high", driveUs: 30, waitUs: 3500, waitSource: "default" } },
    { port: "port.B", mcu: "rp2040", pin: "GP6", read: { model: "charge-release", drive: "high", driveUs: 30, waitUs: 3500, waitSource: "default" } },
    { port: "port.SELECT", mcu: "rp2040", pin: "GP12", read: { model: "charge-release", drive: "low", driveUs: 30, waitUs: 1500, waitSource: "default" } },
    { port: "port.START", mcu: "rp2040", pin: "GP10", read: { model: "charge-release", drive: "low", driveUs: 30, waitUs: 1500, waitSource: "default" } },
    { port: "port.L", mcu: "rp2040", pin: "GP15", read: { model: "charge-release", drive: "high", driveUs: 30, waitUs: 3500, waitSource: "default" } },
    { port: "port.R", mcu: "rp2040", pin: "GP1", read: { model: "charge-release", drive: "high", driveUs: 30, waitUs: 3500, waitSource: "default" } },
  ],
  assertions: [],
});

/** The params type a build function sees. */
export type PipParams = ParamsOf<typeof chase>;
