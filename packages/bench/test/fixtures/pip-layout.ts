// PIP's layout step as ParamGroups (M09-T08 step 6). Rows, ranges and steps
// from designs/pip/legacy/bench/part1.html lines 211 to 217 (BODY) and
// part3.js lines 316 to 324 (BUTTON GROUPS); defaults from
// designs/pip/legacy/src/layout.js lines 26 to 33. Copies of the
// pip-controller b137deb files (lineage pip.bench-part1, pip.bench-part3).
//
// PIP keyed its groups by name; a list has no instance id, so the fixture
// carries the name as a key field: an enum whose showWhen `in: []` never
// matches, so it names the instance head and never renders as a row
// (packages/bench/src/rail/showWhen.ts isKeyField). kind exists only on the
// left cluster, type hides when the left cluster is a stick, and pitch
// hides on the shoulder group and on a stick, as renderGroups did.

import type { ParamGroup } from "@hackbuild/spec";

export const PIP_LAYOUT: readonly ParamGroup[] = [
  {
    id: "body", label: "BODY", live: "commit", fields: [
      { id: "shape", type: "enum", label: "shape", default: "stadium",
        options: [{ value: "stadium", label: "stadium" }, { value: "slab", label: "slab" }, { value: "grips", label: "grips" }] },
      { id: "W", type: "mm", label: "width", range: [100, 220], step: 1, default: 150 },
      { id: "H", type: "mm", label: "depth", range: [50, 100], step: 1, default: 64 },
      { id: "corner", type: "mm", label: "corner", range: [2, 30], step: 0.5, default: 10,
        showWhen: { field: "shape", equals: "slab" } },
      { id: "drop", type: "mm", label: "grip drop", range: [4, 30], step: 0.5, default: 14,
        showWhen: { field: "shape", equals: "grips" } },
      { id: "bezel", type: "mm", label: "bezel", range: [1.44, 4.8], step: 0.24, default: 2.4 },
      { id: "bezelChamfer", type: "mm", label: "bezel edge", range: [0, 1.92], step: 0.24, default: 0.96 },
      { id: "T", type: "derived", label: "thickness", fn: "bodyThickness", unit: "mm",
        help: "the body grows to whatever the tallest key and the board pocket need, snapped to layers" },
    ],
  },
  {
    id: "groups", label: "BUTTON GROUPS", live: "commit", fields: [
      { id: "groups", type: "list", label: "groups", min: 4, max: 4, item: [
        { id: "group", type: "enum", label: "group", default: "left", showWhen: { field: "group", in: [] },
          options: [
            { value: "left", label: "left cluster" }, { value: "face", label: "face keys" },
            { value: "menu", label: "menu keys" }, { value: "shoulder", label: "top l / r" },
          ] },
        { id: "on", type: "bool", label: "on", default: true },
        { id: "kind", type: "enum", label: "kind", default: "dpad", showWhen: { field: "group", equals: "left" },
          options: [{ value: "dpad", label: "d-pad" }, { value: "stick", label: "stick" }] },
        { id: "type", type: "enum", label: "type", default: "flex", showWhen: { field: "kind", notEquals: "stick" },
          options: [{ value: "flex", label: "flex" }, { value: "clicky", label: "clicky" }, { value: "touch", label: "touch" }] },
        { id: "x", type: "mm", label: "x", range: [-90, 90], step: 0.5, default: 0 },
        { id: "y", type: "mm", label: "y", range: [-40, 40], step: 0.5, default: 0 },
        { id: "pitch", type: "mm", label: "pitch", range: [10, 30], step: 0.5, default: 17,
          showWhen: { all: [{ field: "group", notEquals: "shoulder" }, { field: "kind", notEquals: "stick" }] } },
      ] },
    ],
  },
];

/** PIP's default layout state (src/layout.js lines 26 to 33) in the fixture's shape. */
export const PIP_LAYOUT_VALUES = {
  shape: "stadium", W: 150, H: 64, corner: 10, drop: 14, bezel: 2.4, bezelChamfer: 0.96,
  groups: [
    { group: "left", on: true, kind: "dpad", type: "flex", x: -44, y: 1, pitch: 14 },
    { group: "face", on: true, kind: "dpad", type: "clicky", x: 42, y: 1, pitch: 17 },
    { group: "menu", on: true, kind: "dpad", type: "touch", x: 0, y: -15, pitch: 17 },
    { group: "shoulder", on: false, kind: "dpad", type: "flex", x: 27, y: 22, pitch: 17 },
  ],
};
