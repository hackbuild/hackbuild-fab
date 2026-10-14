# INLAY: the print-forge inlay bench and the skill that carries it

How the INLAY bench is made, read from the original code. INLAY is the template bench the print-forge skill ships: a flush inlay coin or tile with art on both faces, built on the shared `rastermesh.js` kernel and the shared `orca3mf.js` writer. It is the source of the plan's `seed/bench/`, `seed/mesh/rastermesh.js` and `seed/3mf/orca3mf.js`, and SASH, BAFFLE, TOGGLE, HAFT, KNUCKLE and COTTER were built from its parts. Nothing here comes from the quarantined mockups.

Code roots, all under `fab-knowledge:originals/inlay/files/`:
- `inlay-bench.html`, the shipped bench (1763 lines; three r128 and JSZip inlined; `rastermesh.js` at lines 276 to 629, `orca3mf.js` at 630 to 929, `part2.js` at 930 to 1229, `part3.js` at 1230 to 1761).
- `skill/print-forge/`, the unpacked `print-forge.skill`: `assets/bench/part1.html` (246 lines), `assets/bench/part2.js` (297 lines), `assets/bench/part3.js` (529 lines), `assets/rastermesh.js` (351 lines), `assets/orca3mf.js` (297 lines), `scripts/*.py`, `references/*.md`.

The bench's part2 and part3 blocks equal the skill's `assets/bench/part2.js` and `part3.js` after trailing whitespace (measured by diff), and the skill parts equal the plan seed `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/bench/` byte for byte (measured by sha256). Locations below cite the skill files, written `part2.js:231-265`, `rastermesh.js:66-142` and so on, meaning `fab-knowledge:originals/inlay/files/skill/print-forge/assets/bench/part2.js` and `fab-knowledge:originals/inlay/files/skill/print-forge/assets/rastermesh.js`.

Number qualifiers: a number with a `file:line` citation is a constant read there; `measured` is from the drive of the canonical file on 2026-10-05 (`fab-knowledge:originals/inlay/drive/inlay.cjs`) or a hash or diff taken here; `computed` is arithmetic done here; `vendor`, `inferred` and `unknown` mean what they say.

## 1. Identity and revision

| item | value |
|---|---|
| name | INLAY.bench, "flush inlay tiles and coins" (header tagline); part of the print-forge skill ("3MF multicolor file creation skill") |
| slug | `inlay` (harvest folder `print-forge-3mf`) |
| conversation | `07105bac-840b-4631-9f4a-8e028d1679b3` |
| canonical bench | `inlay-bench.html`, sha256 `6524005d7d6b82b2a8cd6c9f148fe64817425dc804d3fa54b187f182fcfbddef`, 988861 bytes, built 2026-09-07 16:20 (`~/Downloads/inlay-bench (1).html` mtime, measured) |
| skill | `print-forge.skill`, sha256 `e60afcaa03a008497553b9e8148647c40488b0c0e30f5f1d94c2a388be632e49`, 94994 bytes; file mtimes 2026-09-07 21:36 to 23:19 (measured) |
| examples | `example-inlay.3mf` (2026-09-07 23:18 per the source map), `demo-coin.3mf` (21:40), `inlay-bench-editor.png` |

### 1.1 Every revision, and why this one is canonical

| mtime | file in `~/Downloads` | sha256 (12) | bytes | state |
|---|---|---|---|---|
| 2026-09-07 16:10 | `inlay-bench.html` | 1b20cf208888 | 979767 | ancestor without the exact-raster face editor |
| 2026-09-07 16:20 | `inlay-bench (1).html` | 6524005d7d6b | 988861 | adds the face editor with corner scale, rotate dot, wheel zoom and pan; equals the harvest |

The 16:20 build is the newest bench and the best one; the skill packaged the same parts later that evening (skill part mtimes 23:13 to 23:14, content identical, measured). No newer INLAY exists in Downloads, the harvest or evidence/x (`fab-knowledge:sources/downloads/dl-baffle-inlay-coin.md` section 6).

### 1.2 Companions copied

| file | what it is |
|---|---|
| `inlay-bench.html` | the bench |
| `print-forge.skill` and `skill/` | the skill zip and its unpacked tree: SKILL.md, references (3mf-dialect, kernels, art-engine, bench-ui, print-reality, validation, lineage), scripts (orca3mf.py, validate_3mf.py, demo_coin.py, harvest_filament_keys.py, build_orca3mf_js.py, build_bench.py, smoke_bench.py, filament_template.json, materials.json, orca3mf.template.js), assets (orca3mf.js, rastermesh.js, hackbuild-mark.svg, bench parts) |
| `example-inlay.3mf` | the worked example exported (103 project keys per the source map) |
| `demo-coin.3mf` | the python route demo coin |
| `inlay-bench-editor.png` | three frames of the face editor: select, rotate, scale x1.1 |

## 2. What it makes and for whom

A flush inlay coin or tile with art on both faces and a rim band, up to four colours, for anyone who needs a new art-on-a-flat-part bench quickly: the template is copied, the composer and kernel glue in `part2.js` are changed, and `part3.js`'s UI wiring is kept (SKILL.md workflow step 4). It is also the reference for how every later bench in the family is shaped: header, numbered steps, guide bar, stage with a split face editor, paper rail, status strip, touch and commit, undo, `BENCH` hook, exports with `ensureMesh`.

## 3. Shots

Folder `fab-knowledge:originals/inlay/shots/`, 1280 x 860 drives of the canonical file (measured, 2026-10-05).

| shot | caption |
|---|---|
| `i-00-welcome-blank-boot.png` | Boot: the welcome card over the blank coin (built behind it, 35,036 triangles in 660 ms, measured), four step tiles, start blank or worked example. |
| `i-01-worked-example-art-step-face-editor-handles.png` | Worked example on step 1 ART: three viewer left, face editor right at the exact print raster, the ring layer selected with pink dashed bbox, four corner squares and the rotate dot; hack.build split into white and pink by the pipe. 122,594 triangles in 856 ms (measured). |
| `i-02-art-step-back-face-arc-text.png` | Back (bed side) face: MAKE THINGS on a positive arc, BREAK THINGS on a negative arc reading left to right, 2026 in pink; the FACE panel explains the bed side mirror. |
| `i-03-shape-step-exploded.png` | Step 2 SHAPE with the explode cam: each slot lifted by `(slot - 1) x 1.2 x thk`, showing the pink rim plus ring, the white text inlays and the pocketed black body; BLANK and RIM panels. |
| `i-04-colour-step-slots-roles.png` | Step 3 COLOUR: slot count chips, slot rows with colour, name, material and role (body, rim, front+back), body and rim role selects, slicer profile fold. |
| `i-05-print-step-under-cam-mirrored-back.png` | Step 4 PRINT with the under cam: the bed face seen from below reads upside down and the right way round (rotated, not mirrored), which is the mirror rule working; PRINT REALITY, PLATE and EXPORT panels with the readout (15 layers, 5 inlay layers, grid 354, grams per slot). |

## 4. Mechanisms and constructions

No moving mechanism and no circuit. The constructions are the face composer with hygiene, the three-slab build, the `rastermesh.js` kernel with its pinch healer, the `orca3mf.js` writer, and the face editor.

### 4.1 Blank shapes as signed distance

`SHAPES` (`part2.js:68-80`): round `hypot - R`; square `max(|x|, |y|) - R`; squircle `(x^4 + y^4)^(1/4) - R`; hex via `max(|y|, |x| sin 60 + |y| 0.5) - R cos 30`; pick, a 351 teardrop: circle of `0.86 R` centred at `0.16 R` above, a linear taper to a tip at `-1.05 R` below.

### 4.2 Face composer and hygiene

What it does: turns each face's layers into a label grid, slot numbers per cell, ready for the slab build.

Construction (`composeFace`, `part2.js:174-225`):
1. Grid of `ceil(size x res) + 2` square cells, cell size `1 / res` mm; base labels from the SDF: rim slot where `-rimW < d <= 0`, body elsewhere inside (`part2.js:175-184`).
2. Each unmuted layer is painted alone on a canvas in mm with y up (`paintLayer`, `part2.js:94-171`): shapes (rect, ellipse, ring, frame, diamond, chevrons, even-odd fill); text with a pipe split into two passes, `splitGap` mm of air between the runs and per-character letter spacing `ls`; arc text along radius `|arc|`, positive on top reading clockwise, negative on the bottom with glyphs upright reading left to right; images thresholded to an alpha mask (mono `lum < thr`, invert flips, silhouette any alpha over 40).
3. Stamping flips rows because label rows run y up and canvas rows run down; a cell takes the layer's slot only where it is still body, and cut layers write a cuts mask (`part2.js:189-205`). Without the flip, text printed upside down while the preview agreed with the mesh (skill `references/kernels.md`; the INLAY bench had exactly that bug once).
4. Hygiene per non-body slot (`part2.js:206-217`): stroke boost `dilate` by `round(boost x res)` cells into body, `open` with radius `floor(minF / 2 x res)`, `despeckle` islands under `round(0.35 pi (minF / 2 x res)^2)` cells, colour `gap` by `round(gap x res)` cells.
5. The rim band is re-stamped from the SDF afterwards, because it is exact geometry and hygiene must not eat it (`part2.js:218-222`); cuts become air (`part2.js:223`).

Defaults (`blankState`, `part2.js:9-23`): blank round 44 x 3.6, inlay 1.2; rim on, 2.2; 3 slots, body 1, rim 3 (black, white, pink, cream PETG); layer 0.24, min feature 0.6, stroke boost 0.15, gap 0, despeckle on, 8 px per mm; printer `Flashforge Creator 5 Pro 0.4 nozzle`, process `0.24mm Standard @FF C5`, pattern `Generic {TYPE} @FF C5P`.

Worked example (`exampleState`, `part2.js:24-36`): front ring 36 x 36 stroke 1.4 in slot 3, `hack|.build` Permanent Marker 5 mm in slots 2 and 3 with split gap 0.8; back MAKE THINGS VT323 6 on arc 14, BREAK THINGS on arc -14, 2026 Plex 5 in slot 3.

### 4.3 Three-slab build

What it does: one solid with art inlays on both faces and a body-plus-rim core, every Z on a whole layer.

Construction (`build`, `part2.js:231-265`):
1. Compose both faces; mirror the back labels and cuts in X with `RasterMesh.mirrorX` because the bed face is read from the other side (`part2.js:234-241`).
2. Snap thickness and inlay to whole layers (`snapLayers`, `part2.js:229`); if `2 inlay >= thk`, clamp the inlay to `(thk - layer) / 2` and warn (`part2.js:242-245`).
3. Core labels: body and rim only, art removed; cuts are air in every slab (`part2.js:246-250`).
4. `vol.addSlab(back, 0, inlay).addSlab(mid, inlay, thk - inlay).addSlab(front, thk - inlay, thk)`, then `fixPinches()` and `mesh()` (`part2.js:252-255`).
5. Warnings: pinch cells healed over 0.2 percent of the grid ("art is at the resolution limit"), min feature under 0.4, build over 2.5 s (`part2.js:258-263`).

Measured: blank 35,036 triangles in 660 ms; worked example 122,594 in 856 ms (drive). The skill's own figure for a 44 mm coin at 8 px per mm is about 120k triangles, three parts, about 1 s, about 1 MB 3MF (skill `references/kernels.md`).

### 4.4 Touch, commit, undo

`touch()` refreshes the 2D preview only; `commit()` bumps the revision, snapshots for undo, refreshes the preview and schedules a build after 320 ms; builds queue rather than overlap; `ensureMesh()` rebuilds before any export when dirty (`part2.js:267-294`). Undo snapshots the design portion of the state (not `ui`) as JSON with a 450 ms debounce, 80 deep (`part2.js:44-65`). Ranges are wired once: `input` touches, `change` commits (`bindAll`, `part3.js:181-191`). Text fields write in place and touch at 240 ms, committing on change, so focus is never lost (`part3.js:263-269`).

### 4.5 The `rastermesh.js` kernel: raster in XY, exact in Z, with a pinch healer

What it does: meshes stacked label slabs into one closed, strictly 2-manifold mesh per slot, faces only where labels differ, after healing corner and edge pinches in the label volume.

API (`rastermesh.js:12-16`): `RasterMesh.volume(W, H, px, x0, y0)`, `addSlab(labels, z0, z1)` (slabs ascending, contiguous, positive height, checked at `rastermesh.js:26-31`), `fixPinches()`, `mesh()`.

Pinch healer (`fixPinches`, `rastermesh.js:66-142`):
1. Visit every 2 x 2 x 2 window of cells, with air padded outside the grid and above and below.
2. For each label L in the window: the window is well formed when the L cells are face connected and the not-L cells are face connected (`components` over the 8-cell cube adjacency, `rastermesh.js:49-64`).
3. Otherwise apply the first rule that fires: (1) a not-L cell face-adjacent to two L components becomes L, bridging the pinch; (2) an L cell face-adjacent to two not-L components takes the commonest adjacent not-L label; (3) vertex pinch: dissolve the smallest L component into its commonest neighbour label; (4) the same for a not-L pinch into L (`rastermesh.js:99-133`).
4. After the first full pass only windows near flipped cells are revisited; at most 60 passes (`rastermesh.js:73-140`).
5. `flip` refuses cells outside the grid and the padded air slabs, so a pinch against the padding can only be healed by changing a real cell (`rastermesh.js:89-94`).

Mesher (`mesh`, `rastermesh.js:164-220`; `triangulate`, `rastermesh.js:233-267`):
1. Per slot, per slab: z caps where the cell above or below differs, merged into greedy rectangles (`greedyRects`, `rastermesh.js:145-162`); x and y walls as runs (no cross-slab wall merge, unlike COLLAR).
2. Every face's corners and every lattice vertex on its edges that exists in the mesh are collected into a ring, and the ring is fanned from the face centroid; this conformal fan is what makes the result strictly 2-manifold, since edge pairing alone leaves thousands of dangling T-junction edges (comment `rastermesh.js:1-11`).
3. Output per slot: `positions` Float32Array, `indices` Uint32Array, `tris`.

Raster helpers the benches reuse (`rastermesh.js:269-348`): `stamp`, `despeckle` (4-connected islands back to `into`), `open` (disc erode then dilate), `dilate` (grow slot S into cells labelled `over`), `gap` (erode slot S where it touches another non-body slot), `mirrorX`.

Lineage: this file is byte identical to row `healer/hbf-seed-rastermesh` (sha256 `a99a159b91c9d392987b22393f04caf035762fe5301013c601c6e5f3a6697fe0`, kind copy) in `lineage.json`. The canonical healer in the lineage is TOGGLE's `part2e.js` (row `healer/toggle-part2e`): a flips map per cell, a freeze after 3 flips, 200 passes and dirty-window revisits. The 60-pass, no-freeze version here is the one to replace.

### 4.6 The `orca3mf.js` writer (and its python twin)

What it does: the shared project 3MF writer every later bench vendored.

Construction (`fab-knowledge:originals/inlay/files/skill/print-forge/assets/orca3mf.js`):
1. Config: filaments with colour, type, name; printer name keys; preset pattern; write filaments flag; layer height; title; objects with positions and parts (`orca3mf.js:6-21`).
2. `MATERIALS` per type with tray id, nozzle, first layer, bed, density, cost, vitrification, max volumetric speed, fans, flow and range (`orca3mf.js:25`): PETG 240 / 245 / 70 / 1.27, PLA 215 / 220 / 55 / 1.24, TPU 225 / 230 / 40 / 1.21 (nozzle / first / bed / density).
3. `projectSettings`: printer name keys and version; when write filaments is off only colour, settings id and type; otherwise the verbatim template keys repeated N times plus the computed keys per slot from `MATERIALS`; asserts every list is N long and refuses `extruder_variant_list` (`orca3mf.js:162-201`).
4. `signedVolume` for grams on the card (`orca3mf.js:61-72`); `stl(part)` binary STL; `printCard(cfg)` with printer, process, layer, per slot colour, type, name and grams, objects and parts, and the STL fallback sentence (`orca3mf.js:253-294`).
5. `build(cfg).zip()` needs JSZip on the page; the bench pauses its render loop during zipping because one software-GL frame between deflate chunks costs seconds: export went from 172 s to 1.4 s in headless Chromium (skill `references/bench-ui.md`; `VIEW.paused`, `part3.js:35`, `part3.js:152-153`).

The python `scripts/orca3mf.py` (classes `Part`, `PrintObject`, `Orca3MF` at lines 72, 111, 121) writes the same dialect with the same template; `build_orca3mf_js.py` restamps the JS from `orca3mf.template.js` and the JSON tables.

Limit: `filament_template.json` holds 68 verbatim plus 29 computed = 97 per-filament keys, missing 37 of the 127 that Flash Studio writes and carrying 7 it drops (`fab-knowledge:sources/benches/benches-coins-inlay.md` section 4.4). Twelve owner Flash Studio saves of 97-key exports (BAFFLE, SASH, COTTER) kept every filament, so the short set opens correctly; the 127 set is a fidelity upgrade (`fab-knowledge:sources/downloads/dl-baffle-inlay-coin.md` section 2.1).

### 4.7 Layer stack, props panel and the first-wins stamp

What it does: the ART rail's layer list and the selected layer's controls.

Construction (`part3.js:212-286`):
1. `renderLayers` lists the face's layers in reverse array order, so the last added sits on top; each row shows the kind (or `cut`), the title, `s<slot>` and an x button.
2. `add(kind)` defaults (`part3.js:227-234`): every layer starts in slot 3 when there are 3 or more slots, else 2. Text `TEXT`, Permanent Marker 6 mm, `slot2` 2, split gap 0.6. Shape ring 20 x 20, stroke 1.2. Image width `min(30, 0.6 x size)`, mono, threshold 0.5. A dropped JSON file anywhere on the page loads a design; a dropped image goes to ART step 1 and adds an image layer (`part3.js:279-287`).
3. `renderProps` (`part3.js:237-278`): text (text field, the pipe note, font, size 2 to 30, spacing -1 to 3, arc radius -40 to 40, split gap 0 to 4, slot after the pipe); shape (ring, rect, ellipse, frame, diamond, chevrons; width and height 1 to 120, stroke 0.4 to 20); image (mono threshold or silhouette, width 2 to 120, threshold 0.05 to 0.95, invert); then x and y -60 to 60 in 0.25 steps, rotate, slot, cut through, mute; buttons duplicate (copy offset +2, -2 mm), raise, lower, copy to other face. Range and number boxes are paired per key and kept in step. Ranges `touch` on input and `commit` on change; text touches at 240 ms; selects and checkboxes commit and redraw the list.
4. Stamp order (`stampInto`, `part2.js:190-195`): a cell takes a layer's slot only while it is still the body slot, so the earliest layer in the array claims any overlap and later layers fill only what is left. That is the reverse of COLLAR and SASH, where a later layer paints over an earlier one (`collar.html:1141-1147`; `stampMask`, SASH `part2.js:494-515`). Because the list shows the array reversed and `raise` moves a layer later in the array, raising a layer above an overlapping one in the list sends it underneath on the print (computed from the code; not observed in a drive). The rim band is never body, so art never paints into it.

Limit: no per-layer thin flags; hygiene runs per slot after all layers are stamped, so the panel cannot say which layer lost cells.

### 4.8 Face editor

What it does: the editing surface the owner judges first (skill `references/bench-ui.md`, "Face editor").

Construction (`part3.js:288-480`):
1. The canvas shows the exact print raster when a build is current and a 4 px per mm quick composition while dragging or stale; the corner label says which (`drawPreview`, `part3.js:353-401`).
2. `layerBBox` renders the layer alone at 3 px per mm with dx, dy, rot stripped and takes the bounds plus 0.5 mm, cached by a signature of the layer fields and the blank size, at most 200 entries (`part3.js:299-320`).
3. `layerHandles` maps the four bbox corners through the layer's rotation and the rotate dot on a 26 px stem along the layer's local +y (`part3.js:322-333`; `HANDLE = 5`, `ROT_STEM = 26`, `HIT = 9` at `part3.js:291`).
4. Hit test: rotate dot, then any corner, then inside the rotated quad (cross products), then any other layer's box selects it (`part3.js:334-352`).
5. Move: 0.25 mm steps, centre snap within 0.6 mm drawn as slime guides, shift locks an axis, alt disables snaps. Scale: about the layer centre by distance ratio (text size, shape w, h and stroke, image width). Rotate: snaps to 0, 90, 180 within 4 degrees, shift for 15 degree steps. Live readouts in VT323 while rotating or scaling (`part3.js:416-447`, `part3.js:395-396`).
6. Wheel zooms about the cursor (0.5 to 8), right or middle drag pans, double click focuses a text layer's field or resets the view; arrows nudge 0.25 mm, shift 5 mm; Delete removes; ctrl D duplicates; `[` and `]` reorder; ctrl Z, ctrl shift Z, ctrl Y (`part3.js:452-479`).
7. `UI.FE` is exposed so a harness can read handle positions and drive them (`part3.js:292`).

## 5. UX anatomy

| region | content | code |
|---|---|---|
| tokens | pink #FE0386, cream, paper #fffdf7, sunk #efe9db, edge #e8e0d0, ink, void, ok #1f9d55, warn #c77700, err #c3251f, slime #a6e22e, amber #ffb020; Plex Mono, Permanent Marker, Special Elite, VT323; radius zero | `part1.html:11-14` |
| header | mark, `INLAY.bench`, tagline, undo, redo, open, save, guide | `part1.html:129-142` |
| steps | 1 ART, 2 SHAPE, 3 COLOUR, 4 PRINT; visited tabs get a green tile; guide bar `STEP N NAME` plus one sentence | `part1.html:143-149`, `GUIDES` at `part3.js:162-167` |
| stage | void with a pink graph rule, three canvas, face editor split on ART, cams iso, top, front, under, explode, legend, welcome | `part1.html:151-169` |
| rail | 340 px; ART (FACE front or back with the bed side note, LAYERS add text, shape, image, list, drop zone, LAYER props), SHAPE (BLANK chips round, squircle, square, hex, pick; size, thickness, inlay depth with the opacity note; RIM band and width), COLOUR (FILAMENTS, ROLES body and rim, slicer profile fold), PRINT (PRINT REALITY layer, min feature, stroke boost, colour gap, despeckle, resolution, auto rebuild, rebuild now; PLATE copies and bed; EXPORT 3MF project, STL zip, print card, faces PNG, readout) | `part1.html:170-243` |
| status | dims, triangles, build ms; chips fits bed or over bed, mesh current or stale, warnings | `part1.html:244`, `UI.status` at `part3.js:482-497` |
| exports | 3MF, STL zip (`inlay-<name>-<slot>.stl`, print card, design JSON), print card, faces PNG, design JSON `{app: 'inlay-bench', v: 1, state}`; `BENCH.exportBytes(kind)` returns base64 for harnesses | `part3.js:17-87` |
| plate | shelf grid of blank size plus 6 mm, centred on the bed, fits flag | `plateLayout`, `part3.js:5-15` |
| viewer | own orbit (left drag orbit, right drag pan, wheel zoom, double click refit), flat shaded MeshStandardMaterial per slot, pure white shown as #F4F1EA, explode toggle | `part3.js:89-156` |
| boot | await all four fonts before the first build, because canvas `fillText` falls back silently; `BENCH.ready` after | `part3.js:522-529` |

What makes it excellent: it is the contract every later bench copies (skill `references/bench-ui.md` states it as rules); exact print raster in the editor whenever the mesh is current; a handle set that responds; the healer that closes the corner-contact gap COLLAR left open; exports that cannot ship stale; a test hook built in from the first line (`part2.js:3`).

## 6. Known limits and failure lessons

| item | evidence |
|---|---|
| hook shape `BENCH = {build, state, model, exportBytes, ready}` does not match the plan's BenchHook | `fab-knowledge:synthesis/mappings.md` row `ui-core` |
| healer at 60 passes with no freeze; TOGGLE's part2e is the canonical healer | lineage rows |
| 97-key filament template | section 4.6 |
| no edge treatments, no insert pocket, no cut-through hole of its own beyond cut layers | `part2.js` has no edge or pocket code |
| text upside down from the row flip, fixed by flipping on stamp | `part2.js:189` comment |
| the shipped copy inlines three and JSZip (988861 bytes, measured) while fonts still come from Google Fonts unless built with `--fonts` | `scripts/build_bench.py` |

## 7. Tests and harness

- `scripts/smoke_bench.py`: Playwright Chromium with SwiftShader; waits for `BENCH.ready`, clicks the worked example, waits for a settled model, fails on warnings, screenshots every step, pulls 3MF, STL and JSON through `BENCH.exportBytes` and fails any export over 20 s, round trips the design JSON, blank start, scrollWidth at 390, 768 and 1280, zero console errors.
- `scripts/validate_3mf.py`: zip and entries; Application tag; components resolve; indices in range; per mesh degenerate triangles, undirected edge count exactly 2, unique directed edges, positive signed volume; trimesh watertight and winding plus the vertex fan check (`nonmanifold_vertices`, line 36); lib3mf manifold and oriented; model_settings parts and extruders; project_settings list lengths N, all strings, no `extruder_variant_list`; `--overlap` pairwise intersection volume over 1e-3 fails; `--solid` parts sum within 0.1 percent.
- `scripts/demo_coin.py`: the python route end to end; four parts (body, back inlay, front inlay, rim) with rim and front inlay sharing slot 3 as separate solids; asserts parts sum to the solid within 1 percent; writes 3MF, STLs and print card.
- This record's drive: `fab-knowledge:originals/inlay/drive/inlay.cjs`.

## 8. Port map

| field | value |
|---|---|
| packages | mesh, 3mf, inlay, ui-core (`fab-knowledge:synthesis/mappings.md` row INLAY bench); its scripts seed `tools/py` and `hackbuild-3mf` |
| feature kinds (in the 26) | pocket |
| kinds it needs that the 26 lack | `inlay` |
| check families | CHK-INL, CHK-3MF |
| mechanism canon id | MISSING (no mechanism) |
| reference id | MISSING; it is the template behind `seed/bench/`, not a reference design |
| milestones | M00 (mesh and 3mf packages seed from its `rastermesh.js` and `orca3mf.js`), M03 (inlay), M09 (ui-core art board passes the existing Playwright harness), per mappings.md |
| lineage row | `healer/hbf-seed-rastermesh` covers its `rastermesh.js` (copy, sha256 `a99a159b...97fe0`); the bench, `orca3mf.js` (sha256 `d1bf7d051e47f9633f069024353bd01ebf0bc5298b36fccbbefa966f7ad8a16a`, equal to the seed `seed/3mf/orca3mf.js`, measured) and the scripts have no rows (MISSING) |
