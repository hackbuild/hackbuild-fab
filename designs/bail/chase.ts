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
// Not carried, with the reason in README.md: the cabochon pocket and its preset
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
        { value: "octagon", label: "octagon" }, { value: "arrowhead", label: "arrowhead" }, { value: "outline", label: "die cut" },
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
      { id: "outline", type: "mm", label: "outline margin", range: [0.8, 6], step: 0.1, default: 2.4, showWhen: { field: "shape", in: ["outline"] },
        help: "die cut traces the front path art and grows it by the margin, so the slide is the shape of the art (bail.html 237)" },
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
      id: "hslcut",
      label: "hsl die cut",
      note: "BAIL hslcut. a slide cut to the HeatSync mark grown 2 mm, the mark in ink (flames) and pink (sun disc) on cream, 44 mm wide, a 1.4 mm ink rim, HSL on the back in pink, twin printed bridges, cone tips. BAIL's slots are bone body, ink flames, sun disc in amber, so the disc takes the pink slot here. the mark is two path layers because the die cut outline traces path layers.",
      params: {
        shape: "outline",
        w: 44,
        outline: 2,
        thk: 4.33,
        inlayDepth: 0.72,
        body: 3,
        rim: 1,
        rimOn: true,
        rimW: 1.4,
        clasp: "bridge",
        claspSlot: 1,
        pair: "twin",
        spacing: 11,
        len: 15,
        tunY: 1,
        wall: 1.6,
        roof: 1.2,
        grip: false,
        tips: "cone",
        tipL: 36,
        tipD: 8,
        bore: 11,
        slotA: 1,
        slotB: 2,
        slotC: 3,
        art: {
          uri: "hbf://art/e425b5c844bb824c9c7aa0d84b191281bf72dce54e97e0208b216702181986db",
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
                  d: "M418 164c-46.8 2.8 -99.7 19.6 -142.5 45.2 -9.7 5.8 -9.5 5.5 -11.8 17.5l-0.6 3.1 11.4 -5.3c14.4 -6.8 30.5 -12.7 41.8 -15.4 4.9 -1.2 9.1 -2.1 9.4 -2.1 0.3 0 -0.3 1.2 -1.3 2.7 -39.6 59.4 -55.8 104.1 -57.1 157.5 -0.5 19.6 -0.6 19.8 -2.7 19.8 -3.1 0 -12.3 -2.8 -17.1 -5.2 -17.9 -9.1 -48.4 -31.7 -70 -52.1l-7 -6.6 2.4 -4.3c2.8 -5 15.5 -23.1 23.6 -33.5l5.7 -7.2 -1.6 -5.6 -1.7 -5.5 -2.7 3.2c-4.4 5.1 -14.3 18.5 -19.9 26.8 -40.1 60 -57.9 120.2 -56 190 1.6 60.9 17.8 113.3 50.2 162.5 49.5 75.2 136.8 125.7 228.8 132.6l14.9 1.1 3.6 -2.6c13.4 -9.2 31.6 -10.8 45.7 -4l5 2.4 11.1 -2.7 11.2 -2.7 -0.5 -7.6c-0.4 -5.7 -0.1 -9 1.1 -12.8 1.9 -5.6 8.5 -13.8 12.5 -15.4l2.6 -1.1 -2.5 -0.7c-8 -2.3 -41.3 -18.5 -54.7 -26.6 -47.2 -28.3 -80.7 -59.7 -122.3 -114.3l-2.6 -3.3 -6.7 4.1c-12.8 7.8 -32.5 17.1 -36.3 17.1 -3.4 0 -7.7 -4.5 -11 -11.4 -9.3 -19.5 -14.2 -60.3 -13.1 -108.1 0.8 -33.3 3.4 -52.9 9.3 -71.5 3 -9.6 4.7 -12 8.5 -12 3.1 0 5.3 1.7 19.4 15 31.2 29.3 80 54.6 121.9 63.1 7.7 1.5 10.7 2.6 12.6 4.5l2.5 2.5 -2.9 5.2c-3.8 6.9 -18.2 25.7 -30.1 39.3 -5.2 6 -9.5 11.4 -9.5 12 0 0.5 2.1 4.1 4.6 8 17 25.4 50.1 58.2 80.7 79.9 30.6 21.6 67.1 39.6 102.5 50.4 17.4 5.4 18.4 5.3 13.8 -0.1 -10 -11.7 -10.2 -23.9 -0.4 -28.7 3.7 -1.8 6.2 -2.1 15.9 -2.1 22.9 0.1 38.9 6.4 46.6 18.5 1.5 2.5 3.4 4.5 4.2 4.5 2 0 9.1 -7.6 12.5 -13.3l2.7 -4.8 -2.6 -6.7c-3.4 -8.7 -7.2 -14 -11.5 -16.4 -3 -1.7 -4.7 -1.9 -12.6 -1.3 -9.2 0.6 -9.2 0.6 -11.4 -2.2 -1.9 -2.5 -2.1 -3.6 -1.6 -8.9 0.7 -7.2 3.4 -15.4 7.2 -22.4 3.8 -7 14 -16.5 21.6 -20 12.6 -5.8 33.9 -6.3 49.2 -1 3.3 1.1 6.5 2 7.1 2 0.7 0 2.9 -4.6 4.9 -10.2 3.6 -10.5 9 -29.8 8.4 -30.2 -0.2 -0.2 -4.4 -0.8 -9.3 -1.4 -12.9 -1.7 -23.7 -4.7 -33.5 -9.4 -11.3 -5.4 -23.6 -17.4 -26.9 -26.2 -3.1 -8.4 -2.8 -12.4 1.8 -21 2.7 -5.1 4.8 -11.4 7.1 -21.2 2.6 -11.1 3.8 -14.4 5.9 -16.5 2.8 -2.8 10.1 -4.9 17 -4.9 3.1 0 5.1 -1 10.2 -5.1 3.5 -2.8 7.6 -5.7 9.1 -6.5 2.7 -1.4 18.1 -4.4 22.8 -4.4 4.4 0 4.4 1.1 -0.1 -18.7l-2.1 -9.2 -10.3 0.6c-8.7 0.5 -11.3 0.3 -17.3 -1.6 -13.6 -4.1 -23.4 -13.1 -28.1 -25.6 -2.3 -6.2 -2.9 -20.5 -1 -28.3 0.9 -4.2 0.8 -4.6 -2.5 -8.3 -4.4 -4.8 -7.4 -10.5 -8.2 -15.9 -0.7 -4.5 0.3 -6 3.9 -6 3 0 22.8 -8.1 23.3 -9.5 0.7 -1.7 -6.1 -14.3 -9.7 -18.1 -2.9 -3 -3.3 -3.1 -7.2 -2.2 -10.6 2.5 -25.5 -2.4 -34.1 -11.1l-4.6 -4.7 5.2 -1.4c6.7 -1.6 19.8 -7.6 19.8 -8.9 0 -1.5 -14.5 -16.5 -19.1 -19.7 -4 -2.8 -4.7 -2.9 -15.3 -2.9 -10.5 0 -11.5 -0.2 -17.8 -3.3 -4.2 -2 -7.9 -4.7 -9.8 -7.2 -3.5 -4.4 -7 -13.7 -7 -18.5 0 -1.8 -0.8 -3.9 -1.8 -4.8 -3.5 -3.2 -33 -16.7 -48.3 -22.1 -42.6 -15.1 -83.1 -21.1 -124.9 -18.6z",
                  bx: -7.0,
                  by: -9.5,
                  bw: 985,
                  bh: 985,
                  w: 44,
                  id: "f1",
                  kind: "path"
                },
                {
                  dx: 0,
                  dy: 0,
                  rot: 0,
                  slot: 1,
                  slot2: 1,
                  cut: "none",
                  depth: 1.2,
                  mute: false,
                  d: "M508.2 6c-19.5 5.1 -32.2 17.8 -48.7 48.6 -7.3 13.5 -10.7 18.5 -18.3 26.9 -8.8 9.5 -11.5 15 -11.6 23 0 4.5 0.6 7.4 2.6 11.7 1.5 3.2 3.1 5.8 3.5 5.8 0.4 0 2.9 -4.5 5.5 -9.9 7.8 -16.5 17 -23.3 36.4 -27.2 12 -2.4 16.3 -4.1 20.9 -8.6 5.4 -5.3 7.5 -10.3 9 -22.3 2.3 -17.1 8.2 -29.9 19.7 -42.5 3.2 -3.4 5.4 -6.5 5.1 -6.9 -1.4 -1.3 -17.1 -0.4 -24.1 1.4z M649 36.1c-4.4 1.8 -9 5.9 -11.2 10.2 -1.8 3.4 -2.3 5.8 -2.3 12.7 0 7.5 0.4 9.2 3 14.4 3.7 7.3 7.3 10.3 10.4 8.7 2 -1.1 2.1 -1.9 2.1 -15.9 0 -13 1 -24.1 2.6 -29.5 0.6 -1.9 -0.8 -2.1 -4.6 -0.6z M567.5 48.7c-9.8 1.3 -20.4 6.5 -28.5 13.9 -13 12.1 -16.8 28.4 -12.1 51.5 1.1 5.2 2.3 12.2 2.6 15.6 0.8 6.4 0 17.9 -1.3 20.1 -0.6 0.9 -3.2 0.6 -10.7 -1l-10 -2.2 0 -6.1c0 -7.3 -3.1 -13.2 -11.1 -21.1 -7.3 -7.3 -10 -16.4 -7.3 -24.3 0.6 -1.8 0.9 -3.5 0.5 -3.8 -1.3 -1.3 -10.8 4.3 -15 8.7 -6 6.4 -8 12.1 -7.4 21.4 0.5 8.3 3.4 14.4 9 19.2 3 2.5 3.1 2.7 0.8 2 -1.4 -0.4 -15 -1 -30.2 -1.3l-27.8 -0.6 0 -4.7c0 -6.1 -3.2 -16.4 -6.5 -21.3 -3.7 -5.3 -10 -9.7 -14.2 -9.7 -3 0 -3.6 0.5 -5.2 4.2 -2.2 5.1 -4.5 7.2 -12.8 12.2 -10.7 6.3 -15.4 14 -15.6 25.4l-0.2 6.7 -5.1 0.9c-5.1 0.8 -5.2 0.8 -10.5 -3.4 -16.5 -13.1 -36.8 -16.2 -59.2 -9 -31.7 10.2 -64.5 46.5 -82.6 91.5 -2.7 6.7 -4.7 9.7 -12.7 18.5 -56.6 62.6 -87.3 137.4 -90.1 219.5 -1.7 52.3 7.9 103.7 27.3 145.4 2.4 5.2 4.3 9.6 4.1 9.8 -0.2 0.2 -2.1 -1 -4.2 -2.7 -7 -5.6 -14.2 -8.4 -21.4 -8.4 -8.4 0 -10.6 1.1 -21.9 11.8 -5 4.6 -11.6 10.1 -14.9 12.2 -3.2 2.1 -5.8 4.3 -5.8 4.9 0 1.9 10.1 6.4 19 8.5 9.9 2.4 18.2 5.7 23.2 9.6 12.2 9.3 25.3 9.7 38.5 1.2 2.7 -1.7 5 -2.9 5.2 -2.7 0.2 0.2 3.1 4.6 6.5 9.6 7.8 11.8 19.4 26.2 30.5 38l8.7 9.2 -5.3 5.4c-10.7 10.9 -13.6 20.6 -10.4 34.7 3.7 16.1 1.6 30.8 -6 42.7 -1.9 3.1 -3.4 5.6 -3.2 5.7 1.2 0.9 14.7 2.6 20 2.6 8 0 20.2 -3 27.1 -6.7 8.5 -4.5 17.7 -14.5 22.6 -24.4 2.3 -4.7 4.5 -10.4 4.8 -12.7 0.3 -2.3 0.8 -4.2 1.2 -4.2 0.3 0 5.6 3 11.7 6.7l11.2 6.7 -3.4 4c-1.9 2.2 -4.6 6.5 -6.1 9.6 -2.4 4.9 -2.7 7.2 -3.4 21 -0.4 8.5 -1.2 18.4 -1.9 22 -2.6 15.2 -8.6 28.4 -17.6 39.4 -3.1 3.7 -5.4 6.9 -5.1 7.2 0.3 0.3 4 1.1 8.2 1.7 9.4 1.3 27.4 -0.3 38.5 -3.4 5.7 -1.6 20.2 -7.7 25 -10.6 0.3 -0.2 0.5 1.3 0.5 3.3 0 7.6 5.1 6.8 16.2 -2.5 12.3 -10.1 24.9 -30.5 30.8 -49.4 1.5 -4.8 3.2 -8.7 3.9 -8.6 0.6 0 4.3 0.6 8.1 1.3 5.1 0.9 6.9 1.6 6.8 2.6 -0.2 0.8 -1 4.9 -1.9 9 -2 9.8 -1.3 20.4 2 27.6 3.1 6.8 9.9 14.1 20.2 21.5 16.7 12.1 25 24.2 26.1 38.2 0.8 10 -1.2 16 -9.4 28.7 -7.2 11.3 -9.6 17.8 -8.4 23.2 1.8 7.8 4.8 10.3 17.1 14.2 10.4 3.4 15.6 6.3 20.3 11.5 4.3 4.8 5.2 7.6 4.4 14.2 -0.5 3.7 -0.3 4.9 0.7 4.9 3.4 0 15.8 -11.7 19.1 -18 3.1 -6 3.1 -13.7 0 -23 -4.9 -14.6 -2.7 -19.9 13.3 -32.8 11.8 -9.6 15.7 -13.9 18.9 -20.9 5.9 -12.9 4 -22.2 -7.7 -37.8 -12.2 -16.3 -13.7 -25.3 -7 -42.2 1.7 -4.3 3.4 -10.5 3.7 -13.8l0.5 -6 12.5 -3.1 12.5 -3 7.2 7c9.1 8.9 21.4 15.5 41.6 22.1 8 2.6 17.9 6.1 22 7.7 14.4 5.7 28 16.9 33.3 27.5 3 5.8 5.7 15.6 5.7 20.6 0 2 0.5 3.9 1.1 4.3 1.8 1.1 9.1 -5 14.7 -12.2 16.4 -21.5 23.5 -50.5 18 -73.4 -3.1 -12.6 -13.3 -27 -25.7 -36 -3.3 -2.4 -5.9 -4.6 -5.6 -4.8 0.2 -0.2 3.4 0.8 7.2 2.3 15.8 6.4 35.8 4.7 51.1 -4.1 2.6 -1.5 8.6 -6.6 13.3 -11.4 9.7 -9.7 9.3 -9.6 16.2 -3.1 6.3 5.9 8.2 10.4 8.2 19.6 0 6.2 -0.6 9.2 -2.4 13.2 -2.8 6.4 -10 13.3 -17.5 17 -3.1 1.5 -5.6 3 -5.6 3.4 0 2.4 20.8 2.7 29.5 0.4 16.4 -4.4 27.9 -17 30.6 -33.5 1.8 -10.9 -1.3 -23.5 -8.1 -33.8 -3.6 -5.3 -14 -16.1 -20.2 -20.8 -2.6 -2 -2.7 -2.4 -1.9 -7.4 0.9 -5.9 -0.2 -19.6 -2.3 -27.7 -1.4 -5.4 -1.4 -5.7 1 -9.5l2.5 -3.9 2.7 2.1c1.5 1.2 9.9 9.2 18.7 17.9 13.8 13.6 17.1 16.3 23.8 19.6 6.5 3.2 9.1 3.9 15.7 4.3 11.6 0.7 12.1 0.2 6.1 -5.8 -10.3 -10.3 -13.4 -29.1 -7.5 -46.7 2.2 -6.5 5.5 -12.3 7 -12.3 2.5 0 8 5.9 10.6 11.2 1.4 2.9 3.8 9.7 5.2 15.2 3.7 14 7.6 21.6 15.1 29.2 4.5 4.6 8.4 7.4 14.1 10.1 7.5 3.6 8.4 3.8 17.9 3.8 11.2 0 15.1 -1.4 22.5 -8.1 3.9 -3.6 8 -10.6 8 -13.8 0 -1.6 -0.3 -1.6 -3.6 0.4 -2.8 1.8 -4.6 2.1 -8.5 1.8 -9.5 -0.9 -12.4 -6.5 -13.9 -25.9 -0.5 -7.4 -1.6 -16 -2.4 -19.1 -6.3 -23.7 -20.8 -40.1 -42.6 -48.4 -7 -2.6 -8.5 -2.8 -21.5 -2.8 -12.7 0.1 -18.5 0.8 -30.5 3.9 -2.5 0.6 -2.5 0.5 4 -19.2 3.6 -10.9 7.4 -23.5 8.4 -27.8 1.1 -4.4 2.2 -8.3 2.6 -8.7 0.3 -0.5 4.4 0.8 9 2.6 9.9 4 17.7 6.3 18.6 5.4 0.3 -0.4 0.1 -2.9 -0.5 -5.5 -0.6 -2.6 -1.3 -6.9 -1.7 -9.4l-0.6 -4.5 15.5 -3.8c8.5 -2 16.8 -4.5 18.5 -5.4 1.8 -0.9 4.5 -3.8 6.1 -6.4 3.5 -5.4 5.9 -6.9 15.8 -9.3 8 -1.9 16.8 -6.7 22.6 -12.3 11.5 -11.1 26.2 -42.5 31.2 -66.7 2.3 -11.1 3.1 -28.9 1.5 -36.7 -1.2 -6.3 -3.4 -11.8 -4.8 -11.8 -0.4 0 -2 4.1 -3.6 9.2 -3.9 12 -9.6 23.7 -14.1 28.7 -10.2 11.3 -32.7 14.7 -66.6 10.2 -7.9 -1.1 -20.5 -2.5 -28 -3.2l-13.6 -1.2 -1.2 -9.3c-0.7 -5 -2.3 -13.6 -3.7 -18.9 -1.3 -5.4 -2.3 -9.9 -2.2 -10 0.2 -0.1 3.2 -2.1 6.8 -4.5 15.4 -10.4 31.7 -29.2 41.3 -47.9 15 -29 19.1 -57.2 18.5 -127.1 -0.3 -31.4 -0.2 -32.8 2 -40.5 3.2 -10.9 8.6 -20.8 15.4 -28.1 9.4 -10.1 26.5 -20.8 41.1 -25.9 4.3 -1.6 8 -3.1 8.2 -3.6 0.3 -0.4 -1.8 -1.4 -4.7 -2.3 -38.6 -11.2 -84.1 -0.5 -108 25.3 -10.3 11 -16.1 22.8 -19.6 39.1 -2.7 12.6 -3.4 14.2 -8.6 19.8 -6.4 6.8 -9.2 13.2 -12.1 27.3 -1.4 6.8 -2.5 12.7 -2.5 13 0 0.4 -1.7 3.1 -3.7 6 -3.2 4.5 -3.8 6.2 -3.6 10.1l0.1 4.8 -4.7 0c-6.2 0 -13.1 3.5 -20.8 10.5l-6.1 5.5 -2.6 -4c-3 -4.5 -3.2 -6.2 -1.1 -8 2.1 -1.7 4.8 -11.6 4.1 -14.6 -0.8 -3.2 -4.5 -4 -10.3 -2 -8.9 3 -10 2.6 -19.9 -7.4 -4.9 -5 -10.3 -10 -12.1 -11.3 -1.8 -1.2 -3.3 -2.5 -3.3 -2.8 0 -0.7 13.1 -6.8 23.3 -10.9 23.8 -9.3 34 -18.8 40.3 -37.5 2.5 -7.3 2.8 -9.4 2.8 -23 0.1 -16.6 -0.9 -21.7 -7.1 -38 -9.1 -24 -12.3 -44.4 -9 -58.3 0.8 -3.4 1.1 -6.2 0.7 -6.2 -1.4 0 -8.6 5.7 -11.9 9.5 -6.1 7 -14.7 21.1 -22 35.9 -7.4 15.2 -16.8 31.6 -23.1 40.1 -5.6 7.6 -12.5 13.5 -26.1 22.5 -14.8 9.8 -18.9 12.9 -25 18.8l-4.7 4.4 -3.6 -1.7c-2 -1 -3.6 -2.2 -3.6 -2.7 0 -0.5 1 -4.6 2.2 -9.1 1.6 -6 2.2 -11.2 2.2 -19.7 0.1 -11.2 0 -11.7 -3.6 -19.1 -2.9 -6.3 -5.4 -9.5 -13.6 -17.6 -13.3 -13.2 -15.7 -17.7 -15.7 -29.8 0 -11 2 -15.7 10.7 -24.4l5.9 -5.8 -3.2 -0.7c-3.3 -0.6 -11.2 -0.6 -16.4 0.1zm-240.2 113.9c2 0.4 3.7 0.9 3.7 1.3 0 0.3 -4.4 2.1 -9.8 4 -10.4 3.6 -34.3 14.6 -39.1 18 -4.6 3.3 -4.5 2.5 1 -4.4 8.1 -10.4 16.4 -16.4 25.3 -18.6 4 -0.9 14 -1.1 18.9 -0.3zm144.7 3c24.5 3 45.7 8.1 70.9 17 15.3 5.4 44.8 18.9 48.3 22.1 1 0.9 1.8 3 1.8 4.8 0 4.8 3.5 14.1 7 18.5 1.9 2.5 5.6 5.2 9.8 7.2 6.3 3.1 7.3 3.3 17.8 3.3 10.6 0 11.3 0.1 15.3 2.9 4.6 3.2 19.1 18.2 19.1 19.7 0 1.3 -13.1 7.3 -19.8 8.9l-5.2 1.4 4.6 4.7c8.6 8.7 23.5 13.6 34.1 11.1 3.9 -0.9 4.3 -0.8 7.2 2.2 3.6 3.8 10.4 16.4 9.7 18.1 -0.5 1.4 -20.3 9.5 -23.3 9.5 -3.6 0 -4.6 1.5 -3.9 6 0.8 5.4 3.8 11.1 8.2 15.9 3.3 3.7 3.4 4.1 2.5 8.3 -1.9 7.8 -1.3 22.1 1 28.3 4.7 12.5 14.5 21.5 28.1 25.6 6 1.9 8.6 2.1 17.3 1.6l10.3 -0.6 2.1 9.2c4.5 19.8 4.5 18.7 0.1 18.7 -4.7 0 -20.1 3 -22.8 4.4 -1.5 0.8 -5.6 3.7 -9.1 6.5 -5.1 4.1 -7.1 5.1 -10.2 5.1 -6.9 0 -14.2 2.1 -17 4.9 -2.1 2.1 -3.3 5.4 -5.9 16.5 -2.3 9.8 -4.4 16.1 -7.1 21.2 -4.6 8.6 -4.9 12.6 -1.8 21 3.3 8.8 15.6 20.8 26.9 26.2 9.8 4.7 20.6 7.7 33.5 9.4 4.9 0.6 9.1 1.2 9.3 1.4 0.6 0.4 -4.8 19.7 -8.4 30.2 -2 5.6 -4.2 10.2 -4.9 10.2 -0.6 0 -3.8 -0.9 -7.1 -2 -15.3 -5.3 -36.6 -4.8 -49.2 1 -7.6 3.5 -17.8 13 -21.6 20 -3.8 7 -6.5 15.2 -7.2 22.4 -0.5 5.3 -0.3 6.4 1.6 8.9 2.2 2.8 2.2 2.8 11.4 2.2 7.9 -0.6 9.6 -0.4 12.6 1.3 4.3 2.4 8.1 7.7 11.5 16.4l2.6 6.7 -2.7 4.8c-3.4 5.7 -10.5 13.3 -12.5 13.3 -0.8 0 -2.7 -2 -4.2 -4.5 -7.7 -12.1 -23.7 -18.4 -46.6 -18.5 -9.7 0 -12.2 0.3 -15.9 2.1 -9.8 4.8 -9.6 17 0.4 28.7 4.6 5.4 3.6 5.5 -13.8 0.1 -35.4 -10.8 -71.9 -28.8 -102.5 -50.4 -30.6 -21.7 -63.7 -54.5 -80.7 -79.9 -2.5 -3.9 -4.6 -7.5 -4.6 -8 0 -0.6 4.3 -6 9.5 -12 11.9 -13.6 26.3 -32.4 30.1 -39.3l2.9 -5.2 -2.5 -2.5c-1.9 -1.9 -4.9 -3 -12.6 -4.5 -41.9 -8.5 -90.7 -33.8 -121.9 -63.1 -14.1 -13.3 -16.3 -15 -19.4 -15 -3.8 0 -5.5 2.4 -8.5 12 -5.9 18.6 -8.5 38.2 -9.3 71.5 -1.1 47.8 3.8 88.6 13.1 108.1 3.3 6.9 7.6 11.4 11 11.4 3.8 0 23.5 -9.3 36.3 -17.1l6.7 -4.1 2.6 3.3c41.6 54.6 75.1 86 122.3 114.3 13.4 8.1 46.7 24.3 54.7 26.6l2.5 0.7 -2.6 1.1c-4 1.6 -10.6 9.8 -12.5 15.4 -1.2 3.8 -1.5 7.1 -1.1 12.8l0.5 7.6 -11.2 2.7 -11.1 2.7 -5 -2.4c-14.1 -6.8 -32.3 -5.2 -45.7 4l-3.6 2.6 -14.9 -1.1c-66.3 -5 -130.4 -32.4 -181.6 -77.9 -45.6 -40.4 -78.7 -98.9 -91.2 -160.7 -4.1 -20.2 -5.6 -34 -6.2 -56.5 -1.9 -69.8 15.9 -130 56 -190 5.6 -8.3 15.5 -21.7 19.9 -26.8l2.7 -3.2 1.7 5.5 1.6 5.6 -5.7 7.2c-8.1 10.4 -20.8 28.5 -23.6 33.5l-2.4 4.3 7 6.6c21.6 20.4 52.1 43 70 52.1 4.8 2.4 14 5.2 17.1 5.2 2.1 0 2.2 -0.2 2.7 -19.8 1.3 -53.4 17.5 -98.1 57.1 -157.5 1 -1.5 1.6 -2.7 1.3 -2.7 -0.3 0 -4.5 0.9 -9.4 2.1 -11.3 2.7 -27.4 8.6 -41.8 15.4l-11.4 5.3 0.6 -3.1c2.3 -12 2.1 -11.7 11.8 -17.5 27.1 -16.2 62.1 -30.4 93.3 -37.8 33.4 -7.9 69.1 -9.9 103.2 -5.8zm233.7 529.1c-2.9 4.5 -6.9 8.3 -11.7 11.2 -4.8 2.9 -5.8 2.6 -2.1 -0.5 1.7 -1.4 5.9 -5.5 9.3 -9 3.4 -3.5 6.3 -6.2 6.5 -6 0.3 0.2 -0.7 2.1 -2 4.3zm-390.9 100.2c1 0.5 -0.4 2.3 -4.8 6.5 -3.4 3.1 -6.4 5.5 -6.7 5.2 -0.4 -0.4 -3.2 -14.8 -3.3 -16.8 0 -0.7 11.8 3.4 14.8 5.1z M311.3 92.7c-0.7 0.2 -1.3 2.1 -1.3 4.1 0 4.3 8.3 30.5 9.8 31 1.3 0.4 7.3 -7.1 10.2 -12.8 1.4 -2.6 2.4 -6.4 2.4 -9.2 0.1 -3.9 -0.4 -5.2 -2.9 -7.8 -4 -4.2 -13.9 -7.1 -18.2 -5.3z M907 199.4c-21.9 5.6 -39.5 22.4 -42.9 41.1 -0.6 3.2 -1.1 13.1 -1.1 21.9 0 22.8 -2.4 31.2 -11.9 43.1 -3.9 4.8 -4 5 -1.8 5.5 4.3 1.1 16 -1 22.4 -4.1 16 -7.6 25.5 -22.1 29.8 -45.4 2.8 -15.3 3.7 -18.3 8 -25.1 7.5 -11.7 19.5 -18.2 40.8 -21.8 2 -0.4 3.7 -1.1 3.7 -1.6 0 -1.5 -11.8 -9.1 -18.4 -11.7 -7.6 -3.1 -20.4 -4 -28.6 -1.9z M977.6 221.5c-16 4.1 -29.3 14.5 -36.6 28.8 -2.3 4.7 -4.4 10.4 -4.7 13 -0.5 4.2 -0.3 4.9 2.6 7.8 3.1 3.1 3.4 3.1 9.9 2.7 12.4 -0.9 21.9 -7.7 34 -24.3 2.8 -3.9 6.5 -8.4 8.4 -10.2 4.7 -4.5 14.3 -10.1 20.8 -12 3 -0.9 5.9 -2 6.4 -2.4 0.5 -0.4 -1.6 -1.5 -4.5 -2.4 -7.5 -2.4 -28.4 -2.9 -36.3 -1z M869.3 557c-5.7 1.2 -9.6 3.4 -12.8 7.2 -2.3 2.7 -2.6 3.9 -2.2 7.5 1.2 10.8 13.6 26.7 25.4 32.5 5.7 2.8 7.7 3.2 13.7 3.2 11.8 -0.1 23 -6.6 31.1 -17.8 3.5 -4.9 8.5 -14.4 8.5 -16.1 0 -0.1 -2.9 0 -6.4 0.2 -8.1 0.7 -14 -1.2 -26.6 -8.4 -5.2 -3 -11 -6.1 -12.8 -6.9 -4.5 -1.9 -12.6 -2.5 -17.9 -1.4z M149.8 693.7c-2.8 3.2 -3.9 9.5 -3.6 20.8 0.3 10.9 0.3 11 2.8 11.3 3.3 0.3 8.5 -3 11.1 -7 4 -6.4 1.3 -18.6 -5.4 -24.9 -2.5 -2.3 -3 -2.4 -4.9 -0.2z M100.9 699.4c-12.6 3.6 -27.1 15.9 -32.6 27.6 -11.6 24.5 -12.7 26.5 -17.1 30.9 -2.6 2.6 -7.5 6.4 -11 8.6 -3.4 2.1 -5.9 4.2 -5.4 4.7 0.4 0.4 5.3 1.9 10.8 3.3 22.3 5.6 48.6 1.8 65.9 -9.5 15.8 -10.3 24.4 -25.2 24.8 -42.9 0.2 -10.2 -2.6 -16.2 -9.7 -20.5 -4.1 -2.5 -5.9 -3 -12.9 -3.3 -4.7 -0.1 -10.2 0.3 -12.8 1.1z M139 798c-6 6 2.5 13.9 13 12 4.9 -0.9 10.2 -5.5 9.8 -8.5 -0.7 -4.6 -18.8 -7.5 -22.8 -3.5z M288.5 896.1c-4.4 1 -13.5 4.9 -13.5 5.8 0 0.3 3.2 2.1 7 4 5.8 2.7 8.5 5 15.3 12.4 18.9 20.8 22.2 23.1 33.2 23.1 8.2 0 13.4 -2.3 18.3 -7.9 2.7 -3 3.2 -4.4 3.2 -8.6 0 -6.5 -2.2 -11 -7.6 -15.8 -10.5 -9.2 -25.2 -14.2 -41.8 -14 -5.6 0.1 -11.9 0.5 -14.1 1z",
                  bx: -7.0,
                  by: -9.5,
                  bw: 985,
                  bh: 985,
                  w: 44,
                  id: "f2",
                  kind: "path"
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
                  text: "HSL",
                  font: "plexb",
                  size: 5.5,
                  ls: 0,
                  arc: 0,
                  splitGap: 0.6,
                  id: "b1",
                  kind: "text"
                }
              ]
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
  exports: [{ kind: "3mf", machine: "ffc5p", pose: "print" }, { kind: "stl" }, { kind: "card" }, { kind: "json" }],
  assertions: [],
  // Numbers a person checks with calipers and the cord; every input is an inferred param or catalog row, no profile row is written. The channel claim reads the twin bridge builds (the hackbuild preset) and the clip claim the store back recess builds.
  claims: [
    { id: "channel-clear", fn: "bail.channelClear", args: {},
      want: { nominal: 4.5, lo: 4.25, hi: 5, unit: "mm" },
      why: "cord 4 mm (catalog row bail-cord-saintrygo4, inferred) plus cord clearance 0.5 mm (chase param clr, inferred); lo is the cord plus the 0.25 mm clearance floor of build.ts CLEARANCE (bail.html line 1794, inferred), hi is the cord plus the 1 mm top of the clr range (computed); the owner's PETG print needed a wider channel (print note), no caliper reading recorded" },
    { id: "tip-bore", fn: "bail.tipBore", args: {},
      want: { nominal: 4.3, lo: 4, hi: 4.8, unit: "mm" },
      why: "cord 4 mm (inferred) plus bore clearance 0.3 mm (chase param tipClr, inferred) for a printed tip; lo is the bare cord, hi the cord plus the 0.8 mm top of the tipClr range (computed); a kit tip carries the 4 mm bore of catalog row bail-tips-kit32 plus the 0.05 mm KIT_BORE_TOL_MM (bail.html line 1977, inferred); no caliper reading recorded" },
    { id: "clip-fit", fn: "bail.clipFit", args: {},
      want: { nominal: 0.4, lo: 0.2, hi: 0.6, unit: "mm" },
      why: "recess width over the 17 mm back plate (catalog row bail-back-uclip, inferred): build.ts draws 0.2 mm per side, 0.4 mm total (computed); lo and hi are 0.1 mm per side either way, a typed band (inferred); no fit coupon or caliper reading recorded" },
  ],
});

/** The params type a build function sees. */
export type BailParams = ParamsOf<typeof chase>;
