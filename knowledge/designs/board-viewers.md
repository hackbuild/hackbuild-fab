# Board viewers: how they are made

Record written 2026-10-05 from the original code. Slug `board-viewers`. A cross-design record of the single-file board viewers in the boards family, so a builder porting the `board` view kind sees every proven construction side by side: what each draws, how, which parts to keep, and which defects to leave behind. Each viewer's design is recorded in full in its own folder; this record holds the extracted viewer scripts and one more viewer, the TRUNNION KiCad layer viewer, because it is the one that parses a `.kicad_pcb` live.

Number rules for this file. A number in a code table is a declared value from the file and line named. "Measured" means a headless drive of 2026-10-05 (Chrome, swiftshader WebGL, puppeteer-core, 1280 x 860). "Inferred" means a reading of the code.

Short paths: `X` is `fab-knowledge:originals/board-viewers/files/extracted/`. `O` is `fab-knowledge:originals/`.

---

## 1. Identity and revisions

| viewer | canonical file | sha256 (first 16) | date | full record |
|---|---|---|---|---|
| AUGER board viewer | `O/auger/files/out/auger-viewer.html` (source `O/auger/files/viewer/`) | 8dcff79f69bb4b17 | 2026-07-30 | `O/auger/RECORD.md` |
| GROMMET assembly viewer (LUG is the same shell) | `O/grommet/files/grommet-viewer.html` | 16a639e2edfd3cdc | 2026-07-28 21:49 | `O/grommet/RECORD.md`; LUG at `O/lug/` |
| SPINDLE v5 layer-stack sim | `O/spindle/files/sim.html` | ddbc7951bf792d30 | 2026-08-01 | `O/spindle/RECORD.md` |
| BOBBIN layer-plane inspector | `O/bobbin/files/bobbin-rev-b.html` | de008dba21e8f88f | 2026-07-28 21:47 | `O/bobbin/RECORD.md` |
| ESCUTCHEON WebGL2 badge viewer | `O/escutcheon/files/escutcheon-viewer.html` | 9700d867ec6762d5 | 2026-08-07 | `O/escutcheon/RECORD.md` |
| TRUNNION KiCad layer viewer | `fab-knowledge:originals/board-viewers/files/trunnion-layers-3d.html` | 61d9e562378d6ffe | 2026-08-01 02:49 (`~/Downloads/trunnion-layers-3d (1).html`; an earlier build 2026-07-30 18:34, 411016604070...) | this record, section 4.6 (the TRUNNION board itself is outside this family) |

Extracted scripts in `X` (three.js and embedded data removed): `auger-board-viewer.app.js`, `auger-firmware-ui.sim.js`, `auger-viewer-bake.pack.ts`, `auger-int16-mesh-pack.stl2json.py`, `grommet-assembly-viewer.app.js`, `spindle-layer-stack-sim.app.js`, `spindle-wrl-parse.wrl.py`, `bobbin-layer-plane-inspector.app.js`, `escutcheon-webgl2-badge-viewer.app.js`. Hashes in `fab-knowledge:originals/board-viewers/SHA256SUMS`.

Other board viewers in the corpus, recorded elsewhere: SHUNT R1 sim (`O/shunt/RECORD.md`, the face convention and mobile pointer map), TACK and SHIM (`O/tack/`, `O/shim/`), ARMATURE sim and viewer (`fab-work-directory:benches/armature/outputs/`), TRUNNION sim and 3D, SPLICE and SPLICE-C 3D (`fab-work-directory:benches/trunnion/outputs/trunnion/`).

### 1.1 Why these revisions

Each is the canonical revision of its design (reasons in each design record). The TRUNNION layer viewer of 08-01 is the build whose embedded `.kicad_pcb` matches the shipped TRUNNION board; the 07-30 build is 19 bytes shorter and superseded.

---

## 2. What they make and for whom

A board viewer lets the owner and a buyer judge a board before it exists: the true outline, every layer, the parts at size, the enclosure or the object the board lives in, and, at best, the board running. They are all single HTML files that open from `file://`.

---

## 3. Shots

| file | caption |
|---|---|
| `v01-auger-paper-panel-device-card.png` | AUGER: paper shell, 22 layer rows with counts, live firmware LCD as the board's own display texture and as the device card (copied from `O/auger/shots/a01-iso-default-hunt-screen.png`) |
| `v02-grommet-tabbed-assembly-exploded.png` | GROMMET: dark tabbed shell, stack of stand-ins and the board GLB exploded (from `O/grommet/shots/g02-assembly-exploded-80.png`) |
| `v03-spindle-layer-stack-lift.png` | SPINDLE: layers in build order lifted apart, copper x24, vinyl on (from `O/spindle/shots/s03-iso-lift-60-tape-x24-vinyl-on.png`) |
| `v04-bobbin-layer-planes-exploded.png` | BOBBIN: one textured plane per layer, exploded (from `O/bobbin/shots/b02-exploded-spread.png`) |
| `v05-escutcheon-finish-shader.png` | ESCUTCHEON: raw WebGL2 with plating finishes and recess shading (from `O/escutcheon/shots/e01-hackbuild-face-copper-iso.png`, re-driven with the three third-party rail thumbnails blanked) |
| `v06-kicad-live-parse-iso.png` | TRUNNION layer viewer at ISO, driven 2026-10-05 (ready 7.7 s, zero page errors, measured): the `.kicad_pcb` parsed in the page; V5 net in pink, GND darker, Hershey silk stroked from the file's `gr_text`; LAYER STACK with counts (81 F.Cu shapes over 20 nets, 757 B.Cu shapes over 18 nets, 720 zone polygons) |
| `v07-kicad-separate-slider-blanks-scene.png` | Same viewer after moving SEPARATE: the whole board disappears and the slider label goes blank (section 6, item 1; measured) |

---

## 4. Constructions, one per viewer

### 4.1 Real geometry from circuit JSON (AUGER, `X/auger-board-viewer.app.js`)

Substrate extruded from the true outline with cutouts and drills as holes; mask skins; traces as rotated rects plus round joints merged per side; pads per shape; barrels plus annuli; silk rasterised at 22 px/mm per side; body boxes from each part's own silkscreen extents when pad bounds misplace the body; a `SHAPES` table for per-part 3D; case STLs decoded from int16; a procedural studio environment so metal reads as metal; layer groups each with a toggle and a live count; explode offsets per group; custom z-up spherical orbit; PNG at 2x. Lines and constants in `O/auger/RECORD.md` sections 4.12 and 5.

### 4.2 Firmware on the board (AUGER, `X/auger-firmware-ui.sim.js`)

One 360 x 360 canvas drives both the DOM device card and the emissive map of the round display mesh, updated every frame; the LED arc materials take their colours from the same sim. Inputs from buttons, keys, the mouse wheel over the LCD and clicks on parts in 3D all call one `input(action)`. Exposed as `window.AUGER_SIM` for the harness. `O/auger/RECORD.md` section 4.13.

### 4.3 Assembly with bought-body stand-ins (GROMMET and LUG, `X/grommet-assembly-viewer.app.js`)

The board comes in as a base64 GLB from `circuit-json-to-gltf`; its orientation is decided by rotating the thinnest bbox axis to Z and flipping when more sampled vertices sit below than above; the Pi and the display are labelled dimensional stand-ins built from boxes and discs at their real heights; the stack table and a "glass to battery 34.1 mm" readout state the fit; PCB, schematic, BOM, netlist and DRC sit in tabs. `O/grommet/RECORD.md` section 4.9.

### 4.4 Layer stack in build order (SPINDLE, `X/spindle-layer-stack-sim.app.js`)

Copper extruded from the cutter's own polygons, the guide sticker as the printed SVG rasterised onto the backer, the vinyl mask as a translucent extrusion with its openings, the module from its castellation coordinates, real KiCad WRL parts, LIFT separating the layers in the order you lay them, foil thickness exaggeration x1, x8, x24, current-flow particles along routed paths, a transistor bench as a drive pad, and an inspector that lights a whole net. `O/spindle/RECORD.md` section 4.9. The WRL parser and lead recovery are at `X/spindle-wrl-parse.wrl.py`.

### 4.5 One textured plane per layer (BOBBIN, `X/bobbin-layer-plane-inspector.app.js`)

Each of ten layers (silk, mask, copper top; inner 1 and 2; copper, mask, silk bottom; drills; substrate) is a 26 px/mm canvas texture on its own plane at its true z; drills punched with `destination-out`; 3D stack with a solid slab, Exploded (z times spread), Flat 2D; render order recomputed from the camera side. Cheap (ten draw calls) and faithful for layer reading; parts are boxes. `O/bobbin/RECORD.md` section 4.4.

### 4.6 KiCad file parsed live (TRUNNION layer viewer)

The page embeds `trunnion.kicad_pcb` as text (`<script id="pcbsrc" type="text/plain">`) and a Hershey-style glyph table (`<script id="glyphs">`), and any `.kicad_pcb` dropped on the window replaces it. App script = the fourth script block of the file.

| step | construction |
|---|---|
| tokenizer | `sexp(src)`: recursive, lists, quoted strings with backslash escapes, atoms; helpers `kids(n, k)`, `kid(n, k)`, `layerOf`, `layersOf`, `netOf` |
| parse | nets; `gr_line` on Edge.Cuts; `segment` (start, end, width, layer, net); `via` (at, size, drill, net); `zone` `filled_polygon` per layer; `gr_text` with position, rotation, size and thickness; `footprint` pad centres rotated by the footprint angle into board space (the pad rectangle itself is not rotated, see section 6); F.CrtYd lines; extents from the edge lines |
| frame | `SX(x) = x - CX`, `SY(y) = -(y - CY)` (KiCad y points down), shapes extruded then `rotateX(-PI/2)`, so KiCad (x, y) lands at world (x, -, y - CY) with height on +Y. KiCad's own frame (x right, y down, top face toward the viewer) is left-handed, so this reflection yields an unmirrored board: the TOP preset matches the KiCad editor view (measured in `v06`, silk reads normally) |
| substrate | the Edge.Cuts bounding rectangle with every drill as a hole, extruded 1.6 |
| copper | per layer and per net: trace stadiums (two 12-segment semicircles), pads (rect or circle with the drill as a hole; NPTH skipped), vias as annuli, zone polygons; all extruded `0.035 x CZ` (default 8x) and merged per net by `mergeGeos` (non-indexed concatenation), so one mesh is one net and a click lights the whole net |
| materials | V5 and USB5V pink, GND darker copper, others copper |
| barrels | via cylinders merged into one mesh |
| silk | strokes from the glyph table per `gr_text`, mirrored for `B.` layers, extruded as stadiums |
| layers | substrate, F.Cu, B.Cu, via barrels, F.SilkS, B.SilkS, courtyards; SEPARATE moves each layer by `GAP x rank` above or below the substrate |
| pick | click a copper mesh: net name, layer, segment count, routed length, distinct widths, pad count, zone polygons |
| controls | SEPARATE, COPPER Z 1 to 30 (rebuilds on change), SUBSTRATE opacity, ISO, TOP, BOTTOM, EDGE, SPIN; drop a file to reparse (a parse error is printed in the net readout, the old board stays) |
| camera | custom orbit: azimuth and elevation at 0.006 rad/px, elevation clamped +/-1.5, pan with right drag or shift at 0.07 mm/px, wheel x1.09 clamped 14 to 600; fit `r = max(60, 1.9 x board width)` on every build; presets ISO (-0.7, 0.9), TOP (0, 1.5), BOTTOM (0, -1.5), EDGE (0, 0.06); SPIN 0.35 rad/s; lights: hemisphere 0.8, white key 0.9, pink rim `0xFE0386` 0.35 |
| pick detail | each net mesh gets its own cloned material, so lighting a net (emissive `0x1e6b5a`) touches only that net; a click after more than 6 px of drag is ignored |

### 4.7 Raw WebGL2 with finishes (ESCUTCHEON, `X/escutcheon-webgl2-badge-viewer.app.js`)

No three.js: quantised mesh payloads, flat normals from screen derivatives, a procedural environment with Fresnel, six plating finishes, recess darkening by depth below the top face, STL in and out. `O/escutcheon/RECORD.md` section 4.5.

### 4.8 The bake (AUGER `X/auger-viewer-bake.pack.ts`, `X/auger-int16-mesh-pack.stl2json.py`)

Template placeholders filled with function replacers (a string replacement corrupts minified three.js through `$&`), circuit JSON slimmed to the 16 drawn element types, meshes packed as int16 per axis. These are what make a 1 to 3 MB viewer open from disk.

---

## 5. UX anatomy compared, and what to keep

| viewer | shell | stage | panels | drive pad | offline |
|---|---|---|---|---|---|
| AUGER | paper, Plex Mono | full bleed, z-up orbit | left panel with 22 layer rows and counts, sliders, stats; pick card; device card | firmware UI on the board | yes (font only) |
| GROMMET, LUG | dark teal, off-brand | tab pane with OrbitControls | STACK card, dims card, tools row; tabs PCB, SCHEMATIC, BOM, NETLIST, DRC, NOTES | none | yes |
| SPINDLE | dark with brand pink | full bleed | title, LAYER STACK in build order, VIEW, Q1 BENCH, INSPECTOR | transistor bench and current flow | yes |
| BOBBIN | light drafting sheet inside a long product page | framed stage | grouped layer checkboxes, view and side segments, spread | none | no (three.js from unpkg) |
| ESCUTCHEON | void with ink header and pink rule, VT323 readouts | centre | model rail, BENCH (finish, view, assembly, spec, downloads), status footer | assembly slider | yes |
| TRUNNION layers | dark with Permanent Marker title and cream card | full bleed | LAYER STACK with counts, three sliders, view buttons, net readout | none | yes |

What makes the set excellent, and what the `board` kind keeps: real geometry from the design data (never an illustration); every layer toggleable with a count; layers separable in z; parts at true size (real models where they exist, labelled stand-ins where not); the object the board lives in (case, Pi, display, backer) at true height; a drive pad that runs the circuit or its firmware; a click that names a part or lights a net; and everything in one file that opens offline. AUGER (paper shell, device card, case) and SPINDLE (build-order stack, real models with proofs) are the two to start from.

---

## 6. Known limits and failure lessons across the set

| # | viewer | issue | evidence | rule |
|---|---|---|---|---|
| 1 | TRUNNION layers | SEPARATE, COPPER Z and SUBSTRATE handlers read `e.value` from the event instead of `e.target.value`, so GAP becomes NaN and every layer vanishes; COPPER Z rebuilds with NaN thickness; opacity breaks | `v07` (measured for SEPARATE; the other two inferred from the same pattern) | every control is driven by the harness before a viewer ships |
| 2 | TRUNNION layers | substrate is the Edge.Cuts bounding rectangle, `gr_arc` ignored; a board whose Edge.Cuts uses only `gr_rect`, `gr_arc` or `gr_poly` has no edge lines, so the extents become Infinity and the build fails | code | parse the true outline with arcs and every Edge.Cuts primitive |
| 2a | TRUNNION layers | pads: only the pad centre is rotated by the footprint angle; rectangles stay axis aligned, `roundrect` draws as a sharp rectangle, and every other shape (oval included) draws as a circle of the larger dimension | code (`padShape`) | pad outline from shape, size and the sum of footprint and pad angles |
| 2b | TRUNNION layers | silk: `gr_text` rotation is parsed and never applied (`textStrokes` ignores `rot`); footprint `fp_text` is not read, so reference designators never show | code | silk follows the file's own transforms |
| 3 | SPINDLE | the whole scene is the board's mirror image (board +y to world +Z) and the guide texture was built to match | `O/spindle/shots/s02-top-guide-sticker-copper.png` (measured) | board y maps to world -Z; position and glyph mirroring are separate (SHUNT rule) |
| 4 | SPINDLE | bench mixes A and mA, laser never lights | measured | one unit system per model |
| 5 | BOBBIN | bottom silk reads backwards from below; report rows lose their layout; three.js from a CDN; Flat 2D followed by a side switch is drawn rotated; eight rect-pad plated holes draw no copper | measured | |
| 6 | GROMMET | orientation decided by vertex counts, so the component face points at the pouch instead of the Pi and BACK shows it | measured (`O/grommet/shots/g03-back-grommet-only.png`, reasoned from the camera frame) | orientation comes from the exporter's declared frame |
| 7 | AUGER | labels lag the code (rev A titles, 10 of 16 LEDs driven) | code | derived labels carry the build hash |
| 8 | ESCUTCHEON | MANIFOLD PASS is a fixed string | code | status is computed |
| 9 | all but AUGER and SPINDLE | no harness | | every viewer exposes a hook (`window.HB`, `window.AUGER_SIM` pattern) and is driven headless |

---

## 7. Tests and harness

AUGER: `O/auger/files/shot.py` (Playwright through `window.AUGER_SIM` and `window.__LAYER_IDS`). SPINDLE: `check3d.mjs` and `checkstack.mjs` prove the viewer's data, not its rendering. The others ship none. Drives of 2026-10-05 for all six viewers are recorded in each design record and above.

---

## 8. Port map

| item | value |
|---|---|
| packages | `ui-core` (`board` view kind: layer groups with counts, z separation, parts at size, enclosure overlay, net pick, PNG export), `board` (circuit JSON and KiCad readers feeding one view record), `catalog` (WRL parse and lead recovery), `exports` (viewer bake with function replacers, int16 mesh packing) |
| view kinds | `board` (AUGER, SPLICE-C per `docs/plan/UI.md` line 644), `board3d` (UI.md line 931), stack and assembly views (GROMMET, SPINDLE) |
| canon ids | not a canon subject (views, not mechanisms or archetypes) |
| canon MISSING | none; the gaps are view rules: board face convention, build-order layer stack, drive pad for a board, KiCad reader |
| reference ids | `reference/kinds/minimal-board` at M11 (UI.md line 644); `exports/viewer-bake` proposed (`fab-knowledge:synthesis/mappings.md` line 119); a `<hb-viewer kicad>` component from the TRUNNION parser is proposed in `fab-knowledge:sources/benches/benches-copper-pcb-b.md` section 8, idea 4, MISSING in the plan |
| milestone | M08 (board data), M11 (view kinds) |
| lineage row | MISSING |
