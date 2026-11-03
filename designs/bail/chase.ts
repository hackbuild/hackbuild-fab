// designs/bail/chase.ts
// BAIL, the owner's bolo tie bench (knowledge/designs/bail.md, original
// fab-knowledge:originals/bail/files/bail.html, D-222), as a chase: a slide
// with art on both faces as flush colour inlay, a clasp on the back, and the
// two tips that cap the cord. A chase declares and never computes (D-178):
// the blank outline, the clasp geometry, the tip profiles, every refusal and
// the rigid grip fin evidence live in build.ts.
//
// Sources. Slide, rim, clasp and tip fields are blankState, bail.html lines
// 1076 to 1096; the presets are PRESETS, lines 1143 to 1243, as values (the
// make(s) functions become the value objects below, and the layer factories
// become the art documents in `art`). Tip kinds and sizes are TIP_DEFAULTS,
// line 1879. Revision 6 (bail-6.html) leaves the kernel, clasps and tips
// of this file as they are (lines 1685 to 2018 equal lines 17157 to 17518 of
// bail-6.html); it adds an uploaded slide shape, the badge preset and the
// relief placeholder, none of which this design carries.
//
// Hardware. cord, hwW, hwL, plateT, hole and the tip kit are the rows the
// owner's parts photo gave (HW, lines 1098 to 1111): packages/catalog rows
// bail-cord-saintrygo4, bail-back-uclip, bail-back-flap and bail-tips-kit32,
// tier inferred. The fields carry the row numbers because build.ts reads
// params only.
//
// Colour. A preset keeps the filament slots (spec Preset), so the four slots
// hold the hack.build palette and a preset note names BAIL's own palette.
// The slide body prints in slot `body` (BAIL's colour.body), the rim band in
// slot `rim`, the bridges in slot `claspSlot`, the grip fins in slot `gripSlot`,
// which is the TPU slot 4.
//
// Not carried, with the reason in README.md: the die cut outline shape and
// its preset (needs k.ring.offset), the cabochon pocket and its preset
// (the inlay kind refuses cut pocket), the relief cameo (no painter), the
// image layer, the wear pose and the extra exports.

import { defineChase, type ParamsOf } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "bail", kind: "single", name: "BAIL", version: 1, chase: 2,
    kernels: ["geom", "mesh", "inlay", "3mf"], machines: ["ffc5p"],
    license: "CC-BY-SA-4.0",
  },
  materials: [
    { slot: 1, material: "petg", role: "art", label: "ink", preview: "#1A1A1A" },
    { slot: 2, material: "petg", role: "art", label: "pink", preview: "#FE0386" },
    { slot: 3, material: "petg", role: "body", label: "cream", preview: "#F5F0E6" },
    { slot: 4, material: "tpu95", role: "flex", label: "grip", preview: "#2B2B2B" },
  ],
  params: [
    { id: "slide", label: "SLIDE", live: "commit", fields: [
      { id: "shape", type: "enum", label: "shape", default: "round", options: [
        { value: "round", label: "round" }, { value: "oval", label: "oval" }, { value: "rect", label: "rounded rectangle" },
        { value: "shield", label: "shield" }, { value: "concho", label: "concho" }, { value: "hex", label: "hexagon" },
        { value: "octagon", label: "octagon" }, { value: "arrowhead", label: "arrowhead" },
      ] },
      { id: "w", type: "mm", label: "width", range: [24, 70], step: 1, default: 44 },
      { id: "h", type: "mm", label: "height", range: [24, 70], step: 1, default: 44, showWhen: { field: "shape", in: ["oval", "rect", "shield", "hex", "octagon", "arrowhead"] } },
      { id: "r", type: "mm", label: "corner radius", range: [0, 20], step: 0.5, default: 6, showWhen: { field: "shape", in: ["rect"] } },
      { id: "scallops", type: "int", label: "scallops", range: [3, 32], step: 1, default: 16, showWhen: { field: "shape", in: ["concho"] } },
      { id: "scallopD", type: "mm", label: "scallop depth", range: [0.2, 3], step: 0.1, default: 1.2, showWhen: { field: "shape", in: ["concho"] } },
      { id: "thk", type: "mm", label: "thickness", range: [2.41, 8.89], step: 0.24, default: 4.81,
        help: "a layer top: the 0.25 mm first layer plus whole 0.24 mm layers. BAIL's 4.8 is 4.81 here" },
      { id: "inlayDepth", type: "mm", label: "colour depth", range: [0.48, 1.68], step: 0.24, default: 0.72,
        help: "a whole number of layers; light over dark needs 1.2. BAIL's front depth, used for both faces" },
      { id: "orient", type: "enum", label: "print pose", default: "down", options: [
        { value: "down", label: "front face down" }, { value: "up", label: "front face up" },
      ], help: "printed bridges and the locating peg need the back face up, which is front face down" },
    ] },
    { id: "rimband", label: "RIM", live: "commit", fields: [
      { id: "rimOn", type: "bool", label: "rim band", default: true },
      { id: "rimW", type: "mm", label: "rim width", range: [0.8, 4], step: 0.2, default: 1.6, showWhen: { field: "rimOn", in: [true] } },
      { id: "rim", type: "slot", label: "rim slot", default: 1, showWhen: { field: "rimOn", in: [true] } },
      { id: "body", type: "slot", label: "body slot", default: 3 },
    ] },
    { id: "clasprow", label: "CLASP", live: "commit", fields: [
      { id: "clasp", type: "enum", label: "clasp", default: "pad", options: [
        { value: "pad", label: "store back recess" }, { value: "bridge", label: "twin printed bridges" }, { value: "buried", label: "buried channels (built as bridges)" },
      ] },
      { id: "cord", type: "mm", label: "cord diameter", range: [2, 6], step: 0.5, default: 4,
        help: "catalog row bail-cord-saintrygo4, Saintrygo braided leather 4 mm, inferred, read off the photo" },
      { id: "clr", type: "mm", label: "cord clearance", range: [0.1, 1], step: 0.05, default: 0.5 },
      { id: "hwW", type: "mm", label: "back plate width", range: [10, 25], step: 0.1, default: 17,
        help: "catalog row bail-back-uclip, U slide clip 17 x 7 mm with 2 loops, inferred, read off the photo" },
      { id: "hwL", type: "mm", label: "back plate length along the cord", range: [4, 20], step: 0.1, default: 8,
        help: "read off the photo; measure one clip and correct it", showWhen: { field: "clasp", in: ["pad"] } },
      { id: "plateT", type: "mm", label: "back plate thickness", range: [0.3, 1.5], step: 0.1, default: 0.6, showWhen: { field: "clasp", in: ["pad"] } },
      { id: "hole", type: "mm", label: "square hole", range: [0, 5], step: 0.1, default: 2.4,
        help: "0 for a back with no hole, so no locating peg; read off the photo", showWhen: { field: "clasp", in: ["pad"] } },
      { id: "padY", type: "mm", label: "recess offset", range: [-10, 10], step: 0.5, default: 3, showWhen: { field: "clasp", in: ["pad"] } },
      { id: "pair", type: "enum", label: "channels", default: "twin", options: [
        { value: "twin", label: "two channels" }, { value: "single", label: "one channel for both strands" },
      ], showWhen: { field: "clasp", in: ["bridge", "buried"] } },
      { id: "spacing", type: "mm", label: "channel spacing", range: [8, 24], step: 0.5, default: 12, showWhen: { field: "clasp", in: ["bridge", "buried"] } },
      { id: "wall", type: "mm", label: "bridge wall", range: [0.8, 3], step: 0.2, default: 1.6, showWhen: { field: "clasp", in: ["bridge", "buried"] } },
      { id: "roof", type: "mm", label: "bridge roof", range: [0.48, 2.4], step: 0.24, default: 1.2, showWhen: { field: "clasp", in: ["bridge", "buried"] } },
      { id: "len", type: "mm", label: "bridge length", range: [6, 30], step: 1, default: 18, showWhen: { field: "clasp", in: ["bridge", "buried"] } },
      { id: "tunY", type: "mm", label: "bridge offset", range: [-10, 10], step: 0.5, default: 2, showWhen: { field: "clasp", in: ["bridge", "buried"] } },
      { id: "claspSlot", type: "slot", label: "bridge slot", default: 1, showWhen: { field: "clasp", in: ["bridge", "buried"] },
        help: "the slot the printed bridges print in; BAIL's clasp.slot, default 1" },
      { id: "grip", type: "bool", label: "grip fins", default: false, showWhen: { field: "clasp", in: ["bridge", "buried"] } },
      { id: "gripSlot", type: "slot", label: "grip slot", default: 4, showWhen: { field: "grip", in: [true] } },
      { id: "gripP", type: "mm", label: "fin projection", range: [0.1, 0.8], step: 0.05, default: 0.35, showWhen: { field: "grip", in: [true] } },
      { id: "gripPitch", type: "mm", label: "fin pitch", range: [1.5, 5], step: 0.1, default: 2.4, showWhen: { field: "grip", in: [true] } },
    ] },
    { id: "endsrow", label: "ENDS", live: "commit", fields: [
      { id: "tips", type: "enum", label: "tips", default: "bullet", options: [
        { value: "bullet", label: "bullet" }, { value: "cone", label: "cone" }, { value: "jack", label: "jack plug" },
        { value: "probe", label: "probe" }, { value: "fuse", label: "fuse" }, { value: "hex", label: "hex" },
        { value: "drop", label: "drop" }, { value: "ots", label: "store bought kit tips" },
      ], help: "kit tips are catalog row bail-tips-kit32, 32 x 8.8 mm with a 4 mm bore, inferred, read off the photo" },
      { id: "tipL", type: "mm", label: "tip length", range: [24, 50], step: 1, default: 38, showWhen: { field: "tips", in: ["bullet", "cone", "jack", "probe", "fuse", "hex", "drop"] } },
      { id: "tipD", type: "mm", label: "tip diameter", range: [6, 14], step: 0.5, default: 8, showWhen: { field: "tips", in: ["bullet", "cone", "jack", "probe", "fuse", "hex", "drop"] } },
      { id: "bore", type: "mm", label: "bore depth", range: [8, 24], step: 0.5, default: 16, showWhen: { field: "tips", in: ["bullet", "cone", "jack", "probe", "fuse", "hex", "drop"] } },
      { id: "tipClr", type: "mm", label: "bore clearance", range: [0.1, 0.8], step: 0.05, default: 0.3, showWhen: { field: "tips", in: ["bullet", "cone", "jack", "probe", "fuse", "hex", "drop"] } },
      { id: "slotA", type: "slot", label: "band a slot", default: 1, showWhen: { field: "tips", in: ["bullet", "cone", "jack", "probe", "fuse", "hex", "drop"] } },
      { id: "slotB", type: "slot", label: "band b slot", default: 2, showWhen: { field: "tips", in: ["bullet", "cone", "jack", "probe", "fuse", "hex", "drop"] } },
      { id: "slotC", type: "slot", label: "band c slot", default: 3, showWhen: { field: "tips", in: ["bullet", "cone", "jack", "probe", "fuse", "hex", "drop"] } },
    ] },
    { id: "printrow", label: "INLAY", live: "commit", fields: [
      { id: "minF", type: "mm", label: "min feature", range: [0.6, 1.4], step: 0.05, default: 0.6,
        help: "the default rim band is 1.6 mm wide, so a larger floor erases it and the slot has no cells" },
      { id: "boost", type: "mm", label: "stroke boost", range: [0, 0.5], step: 0.05, default: 0.15 },
      { id: "gap", type: "mm", label: "colour gap", range: [0, 1], step: 0.05, default: 0 },
      { id: "cells", type: "int", label: "grid", range: [4, 12], step: 1, default: 8, quality: true, help: "cells per mm; 8 is BAIL's default" },
    ] },
    { id: "artrow", label: "ART", live: "commit", fields: [
      { id: "art", type: "art", label: "art", accepts: ["layers", "svg"], frame: [56, 56],
        help: "front and back faces as layers; a dropped svg becomes a path layer" },
    ] },
  ],
  presets: [
    {
      id: "heatsync",
      label: "heatsync concho",
      note: "BAIL hsl. a 46 mm concho with 18 scallops, the HeatSync mark in sun and ink on bone, 34 mm wide here where BAIL's is 36 mm, so it stays inside the rim ring body (the inlay kind refuses art that crosses into it), store back clasp, bullet tips. palette in BAIL: ink #15120F, sun #F99A1C, bone #ECE3D3, grip #2B2B2B; the four slots here keep the chase colours and a person sets the filaments.",
      params: {
        shape: "concho",
        w: 46,
        scallops: 18,
        scallopD: 1,
        thk: 4.81,
        inlayDepth: 0.72,
        body: 3,
        rim: 1,
        rimOn: true,
        rimW: 1.6,
        clasp: "pad",
        padY: 1.5,
        tips: "bullet",
        tipL: 38,
        tipD: 8,
        bore: 16,
        slotA: 1,
        slotB: 2,
        slotC: 3,
        art: {
          uri: "hbf://art/630fe37135b23de49acd5ca03d05077983c624cf79cae5243792ecbf65d24dfc",
          kind: "layers",
          doc: {
            schema: "hbf.art",
            version: 1,
            faces: {
              front: [
                {
                  dx: 0,
                  dy: 0.5,
                  rot: 0,
                  slot: 1,
                  slot2: 2,
                  cut: "none",
                  depth: 1.2,
                  mute: false,
                  brand: "hsl",
                  w: 34,
                  id: "f1",
                  kind: "logo"
                }
              ],
              back: [
                {
                  dx: 0,
                  dy: 0,
                  rot: 0,
                  slot: 1,
                  slot2: 2,
                  cut: "none",
                  depth: 1.2,
                  mute: false,
                  text: "HEATSYNC LABS",
                  font: "plexb",
                  size: 4,
                  ls: 0.4,
                  arc: 17.2,
                  splitGap: 0.6,
                  id: "b1",
                  kind: "text"
                },
                {
                  dx: 0,
                  dy: 0,
                  rot: 0,
                  slot: 2,
                  slot2: 2,
                  cut: "none",
                  depth: 1.2,
                  mute: false,
                  text: "MESA AZ",
                  font: "plexb",
                  size: 4,
                  ls: 0.5,
                  arc: -18.4,
                  splitGap: 0.6,
                  id: "b2",
                  kind: "text"
                }
              ]
            }
          }
        }
      }
    },
    {
      id: "hackbuild",
      label: "hack.build jack tips",
      note: "BAIL hackbuild. a 44 mm round slide, the hack.build mark and wordmark, twin printed bridges with TPU grip fins in slot 4, jack plug tips. print the fins in TPU: in PETG they were too stiff for braided cord (owner print note).",
      params: {
        shape: "round",
        w: 44,
        thk: 4.33,
        inlayDepth: 1.2,
        body: 3,
        rim: 1,
        rimOn: true,
        rimW: 1.6,
        clasp: "bridge",
        claspSlot: 1,
        pair: "twin",
        spacing: 12,
        len: 18,
        tunY: 1,
        grip: true,
        gripSlot: 4,
        gripP: 0.35,
        tips: "jack",
        tipL: 40,
        tipD: 8,
        bore: 15,
        slotA: 1,
        slotB: 3,
        slotC: 2,
        art: {
          uri: "hbf://art/86acc3f920bcb08133dcea8f045251ed70737ae14c8f16d148dea0a2820982e1",
          kind: "layers",
          doc: {
            schema: "hbf.art",
            version: 1,
            faces: {
              front: [
                {
                  dx: 0,
                  dy: 4,
                  rot: 0,
                  slot: 1,
                  slot2: 2,
                  cut: "none",
                  depth: 1.2,
                  mute: false,
                  brand: "hb",
                  w: 26,
                  id: "f1",
                  kind: "logo"
                },
                {
                  dx: 0,
                  dy: -12.4,
                  rot: 0,
                  slot: 1,
                  slot2: 2,
                  cut: "none",
                  depth: 1.2,
                  mute: false,
                  text: "hack|.build",
                  font: "marker",
                  size: 4.8,
                  ls: 0,
                  arc: 0,
                  splitGap: 0.4,
                  id: "f2",
                  kind: "text"
                }
              ],
              back: [
                {
                  dx: 0,
                  dy: 0,
                  rot: 0,
                  slot: 2,
                  slot2: 2,
                  cut: "none",
                  depth: 1.2,
                  mute: false,
                  text: "MAKE THINGS",
                  font: "vt",
                  size: 5.5,
                  ls: 0.6,
                  arc: 15.6,
                  splitGap: 0.6,
                  id: "b1",
                  kind: "text"
                },
                {
                  dx: 0,
                  dy: 0,
                  rot: 0,
                  slot: 1,
                  slot2: 2,
                  cut: "none",
                  depth: 1.2,
                  mute: false,
                  text: "BREAK THINGS",
                  font: "vt",
                  size: 5.5,
                  ls: 0.6,
                  arc: -17.2,
                  splitGap: 0.6,
                  id: "b2",
                  kind: "text"
                }
              ]
            }
          }
        }
      }
    },
    {
      id: "scope",
      label: "scope lissajous",
      note: "BAIL scope. a 44 by 36 rounded rectangle, a graticule and a 3 by 2 lissajous trace. palette in BAIL: bezel #1A1A1A, phosphor #A6E22E, screen #10241A, graticule #3E7A55. BAIL prints the graticule, the CH1 CH2 text and the probe pin band in graticule green, slot 4. slot 4 here is the TPU grip slot, so those three print in slot 1, ink, the nearest of slots 1 to 3 to #3E7A55 (CIELAB distance 49.1 to ink, 57.0 to cream, 114.3 to pink, computed).",
      params: {
        shape: "rect",
        w: 44,
        h: 36,
        r: 6,
        thk: 4.33,
        inlayDepth: 0.72,
        body: 3,
        rim: 1,
        rimOn: true,
        rimW: 2.6,
        clasp: "pad",
        padY: 0,
        tips: "probe",
        tipL: 44,
        tipD: 8,
        bore: 16,
        slotA: 1,
        slotB: 2,
        slotC: 1,
        art: {
          uri: "hbf://art/fa51444df8d4f6b8564e48a762580e2264a38e17ce90bd5afbd1372e2d449508",
          kind: "layers",
          doc: {
            schema: "hbf.art",
            version: 1,
            faces: {
              front: [
                {
                  dx: 0,
                  dy: 0,
                  rot: 0,
                  slot: 1,
                  slot2: 2,
                  cut: "none",
                  depth: 1.2,
                  mute: false,
                  shape: "grid",
                  w: 34,
                  h: 26,
                  t: 0.7,
                  n: 8,
                  id: "f1",
                  kind: "shape"
                },
                {
                  dx: 0,
                  dy: 0,
                  rot: 0,
                  slot: 2,
                  slot2: 2,
                  cut: "none",
                  depth: 1.2,
                  mute: false,
                  a: 3,
                  b: 2,
                  phase: 90,
                  w: 30,
                  h: 22,
                  t: 1,
                  id: "f2",
                  kind: "scope"
                }
              ],
              back: [
                {
                  dx: 0,
                  dy: -11,
                  rot: 0,
                  slot: 2,
                  slot2: 2,
                  cut: "none",
                  depth: 1.2,
                  mute: false,
                  text: "X:Y 3:2",
                  font: "vt",
                  size: 7.5,
                  ls: 0,
                  arc: 0,
                  splitGap: 0.6,
                  id: "b1",
                  kind: "text"
                },
                {
                  dx: 0,
                  dy: 11.5,
                  rot: 0,
                  slot: 1,
                  slot2: 2,
                  cut: "none",
                  depth: 1.2,
                  mute: false,
                  text: "CH1 CH2",
                  font: "vt",
                  size: 7,
                  ls: 0,
                  arc: 0,
                  splitGap: 0.6,
                  id: "b2",
                  kind: "text"
                }
              ]
            }
          }
        }
      }
    },
    {
      id: "trace",
      label: "trace pcb shield",
      note: "BAIL trace. a 40 by 48 shield in solder mask green with seeded copper traces and buried cord channels, built as bridges here. colour depth 1.2 mm because the body slot is the dark ink (CHK-INL-03 light over dark). palette in BAIL: mask #1E5631, copper #C8803A, silk #F4F1EA.",
      params: {
        shape: "shield",
        w: 40,
        h: 48,
        thk: 7.45,
        inlayDepth: 1.2,
        body: 1,
        rim: 1,
        rimOn: false,
        clasp: "buried",
        claspSlot: 1,
        pair: "twin",
        spacing: 12,
        tips: "fuse",
        tipL: 34,
        tipD: 8,
        bore: 13,
        slotA: 3,
        slotB: 2,
        slotC: 1,
        art: {
          uri: "hbf://art/81acb2e185331d5e4c51d963827444632edee8dc0df00cdff8bf89c1e581f685",
          kind: "layers",
          doc: {
            schema: "hbf.art",
            version: 1,
            faces: {
              front: [
                {
                  dx: 0,
                  dy: 0,
                  rot: 0,
                  slot: 2,
                  slot2: 2,
                  cut: "none",
                  depth: 1.2,
                  mute: false,
                  seed: 11,
                  w: 36,
                  h: 44,
                  pitch: 2.4,
                  tw: 0.8,
                  pad: 2.2,
                  drill: 0.7,
                  density: 1,
                  clip: "ellipse",
                  id: "f1",
                  kind: "circuit"
                },
                {
                  dx: 0,
                  dy: 3,
                  rot: 0,
                  slot: 3,
                  slot2: 2,
                  cut: "none",
                  depth: 1.2,
                  mute: false,
                  shape: "frame",
                  w: 14,
                  h: 10,
                  t: 0.9,
                  n: 6,
                  id: "f2",
                  kind: "shape"
                },
                {
                  dx: 0,
                  dy: 3,
                  rot: 0,
                  slot: 3,
                  slot2: 2,
                  cut: "none",
                  depth: 1.2,
                  mute: false,
                  text: "U1",
                  font: "plexb",
                  size: 5,
                  ls: 0,
                  arc: 0,
                  splitGap: 0.6,
                  id: "f3",
                  kind: "text"
                },
                {
                  dx: 0,
                  dy: -15.6,
                  rot: 0,
                  slot: 3,
                  slot2: 2,
                  cut: "none",
                  depth: 1.2,
                  mute: false,
                  text: "HB-01",
                  font: "plexb",
                  size: 4.2,
                  ls: 0,
                  arc: 0,
                  splitGap: 0.6,
                  id: "f4",
                  kind: "text"
                }
              ],
              back: [
                {
                  dx: 0,
                  dy: 14,
                  rot: 0,
                  slot: 3,
                  slot2: 2,
                  cut: "none",
                  depth: 1.2,
                  mute: false,
                  text: "REV A",
                  font: "plexb",
                  size: 4.6,
                  ls: 0,
                  arc: 0,
                  splitGap: 0.6,
                  id: "b1",
                  kind: "text"
                },
                {
                  dx: 0,
                  dy: -14,
                  rot: 0,
                  slot: 3,
                  slot2: 2,
                  cut: "none",
                  depth: 1.2,
                  mute: false,
                  text: "hack.build",
                  font: "plexb",
                  size: 4.2,
                  ls: 0,
                  arc: 0,
                  splitGap: 0.6,
                  id: "b2",
                  kind: "text"
                }
              ]
            }
          }
        }
      }
    },
    {
      id: "mesa",
      label: "mesa sunset",
      note: "BAIL mesa. a 46 mm round slide with a sun cut by gaps, a mesa skyline and a saguaro. the mesa is 27 mm wide here, BAIL's 46 mm runs past the round edge and the inlay kind refuses art outside the rim ring. palette in BAIL: ink, pink, cream and amber #FFB020 in slot 4. slot 4 here is the TPU grip slot, so amber moves to slots 1 to 3. the sun prints in slot 2, pink: cream is the body slot and a sun in the body colour would not show, and of ink and pink the nearer to amber is pink (CIELAB distance 102.7 against 103.7, computed). the cone collar and ball print in slot 3, cream, the nearest of the three to amber (CIELAB distance 74.9, computed).",
      params: {
        shape: "round",
        w: 46,
        thk: 4.81,
        inlayDepth: 1.2,
        body: 3,
        rim: 1,
        rimOn: true,
        rimW: 1.6,
        clasp: "pad",
        padY: 1.5,
        tips: "cone",
        tipL: 38,
        tipD: 8,
        bore: 11.5,
        slotA: 1,
        slotB: 3,
        slotC: 2,
        art: {
          uri: "hbf://art/f5a4773404a764c17d8b7a9c3bd583686291d4bf043c1086f6f74cd13c923137",
          kind: "layers",
          doc: {
            schema: "hbf.art",
            version: 1,
            faces: {
              front: [
                {
                  dx: 0,
                  dy: 4,
                  rot: 0,
                  slot: 2,
                  slot2: 2,
                  cut: "none",
                  depth: 1.2,
                  mute: false,
                  shape: "sun",
                  w: 30,
                  h: 20,
                  t: 1,
                  n: 5,
                  id: "f1",
                  kind: "shape"
                },
                {
                  dx: 0,
                  dy: -11.5,
                  rot: 0,
                  slot: 2,
                  slot2: 2,
                  cut: "none",
                  depth: 1.2,
                  mute: false,
                  shape: "mesa",
                  w: 27,
                  h: 10,
                  t: 1.2,
                  n: 6,
                  id: "f2",
                  kind: "shape"
                },
                {
                  dx: 10,
                  dy: -5,
                  rot: 0,
                  slot: 1,
                  slot2: 2,
                  cut: "none",
                  depth: 1.2,
                  mute: false,
                  shape: "saguaro",
                  w: 13,
                  h: 24,
                  t: 1.2,
                  n: 6,
                  id: "f3",
                  kind: "shape"
                }
              ],
              back: [
                {
                  dx: 0,
                  dy: 0,
                  rot: 0,
                  slot: 2,
                  slot2: 2,
                  cut: "none",
                  depth: 1.2,
                  mute: false,
                  text: "ARIZONA",
                  font: "marker",
                  size: 5,
                  ls: 0.4,
                  arc: 16.5,
                  splitGap: 0.6,
                  id: "b1",
                  kind: "text"
                },
                {
                  dx: 0,
                  dy: -15,
                  rot: 0,
                  slot: 1,
                  slot2: 2,
                  cut: "none",
                  depth: 1.2,
                  mute: false,
                  shape: "steps",
                  w: 10,
                  h: 10,
                  t: 0.8,
                  n: 3,
                  id: "b2",
                  kind: "shape"
                }
              ]
            }
          }
        }
      }
    },
    {
      id: "concho",
      label: "concho base",
      note: "BAIL concho. the generic base to build on: a ring and a stepped diamond on a scalloped 44 mm blank.",
      params: {
        shape: "concho",
        w: 44,
        scallops: 16,
        scallopD: 1.2,
        thk: 4.33,
        inlayDepth: 0.72,
        body: 3,
        rim: 1,
        rimOn: true,
        rimW: 1.6,
        clasp: "pad",
        padY: 0,
        tips: "bullet",
        tipL: 38,
        tipD: 8,
        bore: 16,
        slotA: 1,
        slotB: 2,
        slotC: 3,
        art: {
          uri: "hbf://art/fcb32d4a3b8a435e94afcc10e1dc8ffe38a811c5ea9a9cb536c0d1124bf5515d",
          kind: "layers",
          doc: {
            schema: "hbf.art",
            version: 1,
            faces: {
              front: [
                {
                  dx: 0,
                  dy: 0,
                  rot: 0,
                  slot: 1,
                  slot2: 2,
                  cut: "none",
                  depth: 1.2,
                  mute: false,
                  shape: "ring",
                  w: 34,
                  h: 34,
                  t: 1.2,
                  n: 6,
                  id: "f1",
                  kind: "shape"
                },
                {
                  dx: 0,
                  dy: 0,
                  rot: 0,
                  slot: 2,
                  slot2: 2,
                  cut: "none",
                  depth: 1.2,
                  mute: false,
                  shape: "steps",
                  w: 18,
                  h: 18,
                  t: 1,
                  n: 4,
                  id: "f2",
                  kind: "shape"
                }
              ],
              back: []
            }
          }
        }
      }
    },
    {
      id: "monogram",
      label: "monogram octagon",
      note: "BAIL monogram. a 40 mm octagon with a rotated frame, 25 mm here (BAIL's is 30 mm) so it stays inside the rim ring at the flats, and the initials MZ (set in Plex bold), buried channels built as bridges and hex tips.",
      params: {
        shape: "octagon",
        w: 40,
        h: 40,
        thk: 7.45,
        inlayDepth: 1.2,
        body: 3,
        rim: 1,
        rimOn: true,
        rimW: 1.6,
        clasp: "buried",
        claspSlot: 3,
        pair: "twin",
        spacing: 11,
        tips: "hex",
        tipL: 34,
        tipD: 8,
        bore: 14,
        slotA: 1,
        slotB: 2,
        slotC: 3,
        art: {
          uri: "hbf://art/3b612b47d5aa5e5491995df525e956f71d87e243b3c56ae06485167c9c8ac1f9",
          kind: "layers",
          doc: {
            schema: "hbf.art",
            version: 1,
            faces: {
              front: [
                {
                  dx: 0,
                  dy: 0,
                  rot: 45,
                  slot: 2,
                  slot2: 2,
                  cut: "none",
                  depth: 1.2,
                  mute: false,
                  shape: "frame",
                  w: 25,
                  h: 25,
                  t: 1,
                  n: 6,
                  id: "f1",
                  kind: "shape"
                },
                {
                  dx: 0,
                  dy: -0.5,
                  rot: 0,
                  slot: 1,
                  slot2: 2,
                  cut: "none",
                  depth: 1.2,
                  mute: false,
                  text: "MZ",
                  font: "marker",
                  size: 15,
                  ls: 0,
                  arc: 0,
                  splitGap: 0.6,
                  id: "f2",
                  kind: "text"
                }
              ],
              back: []
            }
          }
        }
      }
    },
    {
      id: "custom",
      label: "your art",
      note: "BAIL custom. a blank 44 mm round slide waiting for art dropped on the art board, with store bought kit tips.",
      params: {
        shape: "round",
        w: 44,
        thk: 4.33,
        inlayDepth: 0.96,
        body: 3,
        rim: 1,
        rimOn: true,
        rimW: 1.6,
        clasp: "pad",
        padY: 0,
        tips: "ots",
        art: {
          uri: "hbf://art/851f469b57c1b87d26217b5c85d76e60580bacb359639bb7331db142e6dc86fa",
          kind: "layers",
          doc: {
            schema: "hbf.art",
            version: 1,
            faces: {
              front: [],
              back: []
            }
          }
        }
      }
    }
  ],
  build: { module: "./build.ts", fn: "build" },
  exports: [{ kind: "3mf", machine: "ffc5p", pose: "print" }, { kind: "stl" }, { kind: "card" }],
  assertions: [],
});

/** The params type a build function sees. */
export type BailParams = ParamsOf<typeof chase>;
