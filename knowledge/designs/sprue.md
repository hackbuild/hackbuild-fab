# SPRUE: batch plates of two colour giveaway coins and picks

How SPRUE is made, read from the original code. SPRUE is the fast-giveaway member of the coin family: flush two colour coins and 351 style guitar picks, packed onto a full 256 x 256 plate and written as a project 3MF with both extruders assigned. Nothing here comes from the quarantined mockups.

Code roots: `fab-knowledge:originals/sprue/files/sprue.html` (browser bench, 1683 lines; engine script lines 275 to 943, app script lines 944 to 1682; lines 10 and 11 are embedded woff2 fonts) and `fab-knowledge:originals/sprue/files/sprue.py` (python generator, 984 lines). A location written `sprue.html:668-717` means those lines of that file.

Number qualifiers: a number with a `file:line` citation is a constant read there; `measured` is from the drive of the canonical file on 2026-10-05 (`fab-knowledge:originals/sprue/drive/sprue.cjs`) or from the shipped print card `fab-knowledge:originals/sprue/files/print-card.txt`; `computed` is arithmetic done here; `vendor` is a slicer preset value; `inferred` and `unknown` mean what they say.

## 1. Identity and revision

| item | value |
|---|---|
| name | SPRUE, the runner tree in a casting mold: one shot, many small parts (`sprue.py:3`, README) |
| slug | `sprue` (registry status `reference`) |
| conversation | `6794b094-b698-4192-8dc1-2321c473be09`, "Fast multi-color 3D printed giveaway coins" |
| canonical bench | `sprue.html`, sha256 `a1acb293ad96c7dd5062a9e65741a7f27959584dfb10e64decb41468c59e4fe7`, 160912 bytes, built 2026-09-06 15:59 (`~/Downloads/sprue.html` mtime, measured; byte identical to the harvest copy) |
| canonical generator | `sprue.py`, sha256 `1c2f22a66394abff83774c9dbcac2c0c5766959cbc22564c362530b7b8c5da4b`, 43104 bytes; plates it wrote carry CreationDate 2026-09-06 (`sprue.py:651`) |
| harvest | `fab-work-directory:benches/sprue/outputs/sprue/` |

### 1.1 Why this revision

Only one build of each file exists. `~/Downloads/sprue.html` equals the harvest (`fab-knowledge:sources/downloads/dl-baffle-inlay-coin.md` section 9), and no later sprue file was found in Downloads, evidence/x or the harvest. The owner used this build: `sprue_design.json` (2026-09-06 16:06) and its Flash Studio save `sprue_plate.3mf` (2026-09-07 15:37, 15 picks) are copied as owner files. Newest and best are the same file.

### 1.2 Companions copied

Under `fab-knowledge:originals/sprue/files/`, sha256 in `fab-knowledge:originals/sprue/SHA256SUMS`.

| file | what it is |
|---|---|
| `sprue.html`, `sprue.py`, `README.md`, `requirements.txt`, `print-card.txt` | bench, generator, README, python deps, the generator's print card |
| `fonts/BarlowCondensed-Bold.ttf` | the generator's default text font |
| `plates/sprue_mix.3mf` | 6 coins + 20 picks written by `sprue.py` |
| `plates/sprue_picks_phx_backonly.3mf` | the bench's default design exported: 40 picks, FAN / PROJECT / PHX 2026 on the back |
| `previews/faces.png`, `previews/sprue_*.png` | generator previews of the four faces and the three plates |
| `owner-sprue_design-20260906.json` | the owner's design: pick with an image on the front, FAN / PROJECT / PHX on the back, colours swapped to a black body with white inlay (`colWhite #000000`, `colBlack #ffffff`), inlay 3 layers |
| `owner-sprue_plate-flashstudio-20260907.3mf` | the owner's Flash Studio save of that design, 15 picks duplicated in the slicer, 2 filaments kept |

## 2. What it makes and for whom

Two colour flush inlay giveaways for events and fans, printed many per plate in about an hour on the Creator 5 Pro: a 36 x 2.4 mm coin and a 351 teardrop pick 25.8 x 30.7 x 1.2 mm with a keyring hole (`sprue.py:54-59`). The defining choice: white body, black inlay, because two layers of black hide white while white over black stays grey until about 1.2 mm, so the inlay can be 2 or 3 layers and the print stays short (README; panel hint `sprue.html:160`). The owner's own design swapped the slot colours to a black body with white inlay at 3 layers (owner design JSON), which keeps the shallow inlay but drops the contrast rule's margin; whether it read well in print is unknown. The owner also set inlay 3 and edge break 2 on a 1.20 mm pick, but the bench clamps inlay layers to `floor(n / 2)` of the snapped layer count (`sprue.html:672`), so on a 5-layer pick the mesh carries 2 inlay layers per face whatever the slider says (computed: round(1.20 / 0.24) = 5, floor(5 / 2) = 2). The python generator has no such clamp (`build_object`, `sprue.py:487-526`).

The chat declined third party logos: built-in art is original (marching snare, lightning bolt) plus a drop-in slot (`fab-knowledge:sources/benches/benches-coins-inlay.md` section 2).

## 3. Shots

Folder `fab-knowledge:originals/sprue/shots/`, all 1280 x 860 drives of the canonical `sprue.html` (measured, 2026-10-05). The drive dropped the hack.build mark SVG from the print-forge skill (`fab-knowledge:originals/inlay/files/skill/print-forge/assets/hackbuild-mark.svg`) through the real file input.

| shot | caption |
|---|---|
| `s-01-boot-phx-pick-step1-blank.png` | Boot state: the fan project pick on step 1 BLANK, face cards FRONT (empty) and BACK (FAN / PROJECT / PHX 2026 in Anton), status strip `pick 25.8 x 30.7 x 1.20 mm`, 8,384 triangles, white 654 + black 57 mm3, 5 layers, 40 parts about 59 min (measured). |
| `s-02-pick-front-mark-dropped-step2-art.png` | Step 2 ART after dropping the mark SVG on the front: Otsu threshold picks the dark pixels, the art fits the pick's art zone around the keyring hole, the 3D card and the plate card (40 picks) update on commit. 16,108 triangles (measured). |
| `s-03-pick-back-text-selected-handles.png` | Back face active (pink card header, "back sits on the bed, mirrored in the mesh"), PROJECT selected: rotated bbox, corner scale square, top rotate dot; LAYER panel with font, weight, size, tracking, x, y, rotation. |
| `s-04-coin-year-preset-step1-coin.png` | The year coin preset with the mark on the front: 36 x 2.4 mm, black border ring, FOR THE FANS arc and 2026 on the back, inlay 3 layers with a 2-layer edge break. The plate card reads overflow because the year preset sets 12 coins while the pick pinned just before still holds its count of 40 (status `overflow: lower the counts`, measured; sequence in `drive/sprue.cjs` lines 31 to 40). |
| `s-05-mixed-plate-20-picks-6-coins-step3.png` | Step 3 PLATE + EXPORT after pinning the pick (count 20) and setting this coin to 6: "6 coins + 20 picks, about 60 min, 37 g", filament panel with body on extruder 1 and inlay on extruder 2, exports plate 3mf, stl zip, faces png, print card (measured). |
| `s-06-mixed-plate-3d-and-plate-view-scrolled.png` | Same state scrolled to the 3D card (coin, legend body extruder 1 / inlay extruder 2, 43,632 triangles) and the PLATE card: shelf-packed rows of picks and coins centred on the 256 mm bed (measured). |

## 4. Mechanisms and constructions

No moving mechanism and no circuit. The constructions are the two colour flush inlay object, the art hygiene, the mask-to-prism mesher, the plate packer and the 3MF writer. SPRUE has two implementations of the same object: vector booleans in python and raster masks traced to prisms in the browser.

### 4.1 The two colour object: slab plan with an edge break

What it does: builds a white body and a black inlay as two closed solids that sum to the blank, with art on both faces and a stepped top edge.

Construction, browser (`SPRUE.build`, `sprue.html:668-717`):
1. Snap thickness to whole layers: `n = max(1, round(thk / layer))`, `thk = n x layer`; inlay layers clamped to `floor(n / 2)`; `D = inlay x layer` (`sprue.html:669-673`).
2. Mirror the back mask in X, because the bed face is read from the other side (`sprue.html:675`).
3. Bottom slab 0 to D: black = back art AND blank minus holes; white = blank minus black minus holes (`sprue.html:680-684`).
4. Core slab D to thk - D: white blank minus holes (`sprue.html:685`).
5. Top slabs, one per layer: layer k gets an inset `breakStep x j` with `j = k - (inlayLayers - breakLayers) + 1` when positive, applied by eroding the blank mask; black = front art AND the inset blank; white = inset blank minus black (`sprue.html:686-694`). This steps the top edge in by layer, a printed 45 degree-ish break.
6. Consecutive slabs per colour with identical masks merge (`sprue.html:696-702`).
7. Each merged slab is meshed by `slabMesh` (4.3) into a triangle soup; the mesher records shell ranges for the 3MF indexer (`sprue.html:703-711`).
8. Stats: volumes by divergence over the soup, triangle counts, blank volume from cell count, and an issue when the cap area differs from the wanted area by more than `max(0.05, 0.2 percent)` (`sprue.html:707`, `sprue.html:713-715`).

Construction, python (`build_object`, `sprue.py:487-525`): the same plan with shapely regions and manifold3d. Art is clipped to `blank.buffer(-0.5)`, cleaned (4.2), minus holes grown 0.5 mm; each slab is a `CrossSection` with EvenOdd fill extruded and translated (`to_cs`, `slab`, `sprue.py:455-475`); colour parts are unioned with `Manifold.batch_boolean(Add)` (`sprue.py:477-484`).

Constants: `LAYER = 0.24` (`sprue.py:48`; bench default 0.24, options 0.20, 0.24, 0.28 at `sprue.html:161`). Coin: d 36, thk 2.40, inlay 3 layers, edge break 2 layers, break step 0.16, ring inset 1.5, ring width 0.8, art margin 2.7 (`sprue.py:55-56`). Pick: thk 1.20, inlay 2 layers, break 1 layer, step 0.30, hole 3.5 at y 10.4 (`sprue.py:57-58`). Bench: break step 0.16 for coins and 0.30 for picks (`sprue.html:1000`); the coin forces inlay to at least 3 and break 2 (`sprue.html:1583`).

Measured result (shipped print card): coin 10 layers, white 2067 + black 363 = 2430 mm3 against a 2442 mm3 blank, the 12 mm3 difference being the edge break (computed); pick 5 layers, 658 + 53 = 711 against 718.

### 4.2 Art hygiene: min black, min white gap

What it does: removes black slivers thinner than the nozzle can lay and fills white gaps thinner than the nozzle can leave open, so the preview is what prints.

Construction, browser (`compose`, `sprue.html:1097-1112`): draw layers black on white at `ppm`, luminance under 128 is ink, AND with the art zone; then open with radius `minF / 2` (erode, dilate) and close with radius `minGap / 2` (dilate, erode); finally OR the coin border ring. Disc dilation uses per-row prefix sums, cost `(2r + 1) w h` (`SPRUE.dilate`, `sprue.html:294-321`); erode is `not dilate not` (`sprue.html:322`).

Construction, python (`clean`, `sprue.py:123-131`): `buffer(0)`, open by `buffer(-r).buffer(r)`, close by `buffer(r).buffer(-r)`, `simplify(0.015)`, with `r = MIN_FEATURE / 2` and `MIN_FEATURE = 0.62` (`sprue.py:49`).

Thin-layer flags (`checkThin`, `sprue.html:1114-1125`): each layer is composed alone raw and cleaned; nothing left is `gone` ("too thin" pill), under 75 percent left is `weak` ("losing detail" pill) (`sprue.html:1429`).

Art zones (`geo`, `sprue.html:1006-1033`): coin with ring, a disc of `R - ringIn - ringW - 0.9`; coin without ring, `R - margin`; pick, the blank eroded by the margin minus the hole dilated 0.9 mm.

Constants: bench min black 0.6 (range 0.4 to 1.2), min white gap 0.35 (0 to 0.8), art margin 1.6 (0.6 to 4), 12 px per mm (8, 12, 16) (`sprue.html:958`, `sprue.html:161-171`).

Failure lesson: `previews/faces.png` shows the pick back `2026` (Barlow Condensed Bold, cap 5.8, tracking 0) fused into one blob, and the 0.62 close filled the bowl of the 6. A text size and tracking check against min gap would catch it (`fab-knowledge:sources/benches/benches-coins-inlay.md` section 2).

### 4.3 Mask to prism mesher (trace, simplify, ear clip)

What it does: turns a binary mask into closed vector prisms per slab with far fewer triangles than per-cell quads; a fourth meshing route beside COLLAR quads, `rastermesh.js` and shapely.

Construction:
1. `trace(m)`: emit a directed boundary edge on every pixel side facing empty space, walking each pixel clockwise in image space; at a corner with two candidate edges take the clockwise turn, which splits diagonal contacts (4-connectivity) (`sprue.html:403-447`).
2. `simplify(loop, tol)`: drop collinear points, rotate to start at the lexicographically smallest point and orient positively so a loop and its reverse simplify identically, split at the farthest point from the start, Douglas-Peucker both halves (`sprue.html:450-496`). Tolerance 0.75 px (`sprue.html:1233`).
3. `group(loops)`: outers CCW, holes CW, each hole to the smallest containing outer by point in polygon (`sprue.html:514-527`).
4. `triangulate(outer, holes)`: bridge each hole from its rightmost vertex to the nearest visible outer vertex, holes processed by max x descending, then ear clip with a guard of `4n + 10` passes and a zero-area corner drop when stuck (`sprue.html:531-624`).
5. `slabMesh`: top cap CCW at z1, bottom cap reversed at z0, walls from every loop as two triangles per edge; returns cap area against wanted area (`sprue.html:628-663`).
6. `checkClosed`: every directed edge must appear once and its reverse once (`sprue.html:720-736`).

Measured: the pick with the mark is 16,108 triangles and the coin 43,632 (drive), against 88,650 for COLLAR's quad mesher on a 44 mm coin (example print card). Cap-area mismatch is the failure signal; the status strip turns amber "built with N cap warning(s), try a different min feature or ppm" (`sprue.html:1238`).

### 4.4 Blanks and art intake

- Pick outline: a closed Catmull-Rom spline through 10 right-side points mirrored to the left, 12 subdivisions per span, about 25.8 x 30.7 mm at scale 1 (`pickOutline`, `sprue.html:380-385`; `catmull`, `sprue.html:364-377`; python `pick_blank`, `sprue.py:444-449`, `simplify(0.01)`). Coin: a 192-gon (`sprue.html:387-391`).
- Polygon to mask: even-odd scanline fill with pixel-centre sampling (`fromPolygon`, `sprue.html:337-360`).
- Image drop (`addImageFile`, `sprue.html:1488-1514`): SVGs are rasterised to 1600 px first; the layer is fitted to the art zone; `autoThreshold` scales to 256 px, composites alpha over white, runs Otsu over a 256-bin luminance histogram and flips polarity when the border mean is darker than the threshold, with a toast "dark background detected" (`sprue.html:1517-1538`). Images also arrive by clipboard paste (`sprue.html:1597`).
- Text: straight text uses canvas `letterSpacing`; arc text on top places each glyph at `phi = pi/2 + (total/2 - centre) / r`, on the bottom at `phi = -pi/2 + (centre - total/2) / r` with the baseline pushed out by 0.72 x size so glyphs sit outside the arc (`drawLayer`, `sprue.html:1040-1095`). Python uses fontTools outlines sized by OS/2 cap height with quadratics flattened at 8 and cubics at 12 segments and even-odd XOR of contours (`Face`, `sprue.py:148-272`).
- Fonts: Anton and Barlow Condensed embedded as woff2 so the bench works offline; Permanent Marker, Special Elite, VT323, IBM Plex Mono, Impact, Arial Black, Georgia, plus any loaded TTF, OTF or WOFF (`sprue.html:951`, `sprue.html:1602-1606`).
- Built-in python art: a marching snare in three quarter view with two crossed sticks, rotated 8 degrees (`motif_snare`, `sprue.py:278-309`); a lightning bolt for the pick (`motif_bolt`, `sprue.py:312-315`); a coin back of arc text, year and three stars (`coin_back_default`, `sprue.py:318-326`).
- Python raster art: alpha over white, luminance, downsample to 640 px max, Otsu via OpenCV, `findContours(RETR_CCOMP, CHAIN_APPROX_NONE)`, y flipped, rings XORed (`sprue.py:353-387`); SVG via cairosvg at 1200 px or a svgpathtools outline fallback (`sprue.py:390-419`).

### 4.5 Plate packer, fill the bed, mixed plates

What it does: lays every instance of every pinned design onto the bed and estimates time and mass.

Construction:
1. Shelf packing: items sorted by height descending, rows fill to `bed - 2 x margin`, each row and the block centred; overflow returns `{overflow: true}` (`SPRUE.pack`, `sprue.html:739-759`; python `pack`, `sprue.py:540-566` raises instead).
2. Mixed plates: "pin this design" stores the current mesh, bounds, count and a thumbnail in a roster; the next design keeps its own count (`sprue.html:1618-1625`); roster rows edit their count or are removed (`sprue.html:1359-1368`).
3. Fill the bed: binary search over 0 to 200 for the largest count that still packs (`sprue.html:1626-1633`).
4. Plate view draws each instance's face thumbnail at its packed position (`renderPlate`, `sprue.html:1332-1358`).
5. Time model: `vol / flow / 60 + 3 + twoColourLayers x 2 x 5 / 60` minutes, meaning 3 minutes of overhead and two 5 s tool swaps per two colour layer; mass `vol x density / 1000` (`sprue.html:1351-1353`; `sprue.py:969`).

Constants: bed 256, margin 8, gap 3 (`sprue.py:50-52`, `sprue.html:1329`); flow PETG 8.5, PLA 11, ABS 9, ASA 9 mm3/s; density PETG 1.27, PLA 1.24, ABS 1.04, ASA 1.07 (`sprue.html:949-950`). The flows are plate averages for small flat parts (comment `sprue.py:65`), and the slicer's estimate is the real one (print card).

Measured: mixed plate 6 coins + 20 picks about 60 min and 37 g (drive and print card); 12 coins 61 min; 40 picks 59 min.

### 4.6 Project 3MF writer (split model files)

What it does: writes the plate as one Orca-dialect project with instances, both parts of each object on their extruders.

Construction (`SPRUE.threeMF`, `sprue.html:844-939`; python `write_3mf`, `sprue.py:613-780`):
1. Meshes live in `3D/Objects/object_<parent>.model`, one per printed object, with `3D/_rels/3dmodel.model.rels`; the root model holds components with `p:path` and one build item per instance. This is the layout the slicer itself saves.
2. `Application` `BambuStudio-01.10.01.50`, `OrcaSlicer` 2.3.2 (`sprue.html:839`, `sprue.html:857`).
3. UUID tails fixed; the item tail `b1ec-4553-aec9-6006b5ede3f9` differs from COLLAR's (`sprue.html:837`).
4. `model_settings.config`: per part extruder (white 1, black 2), `source_*` metadata, face counts, one model_instance per instance with identify ids from 101, one assemble_item per instance (`sprue.html:894-914`).
5. `project_settings.config`: version, printer and process names, and 21 per-filament keys for 2 filaments when write filaments is on (`sprue.html:916-936`; python writes the same 21 per-filament keys plus version and two preset names, `sprue.py:746-774`). Both shipped plates carry 24 project keys of which 21 are per-filament lists (measured by unzipping `plates/sprue_mix.3mf` and `plates/sprue_picks_phx_backonly.3mf`). `cool_plate_temp` is written with the bed temperature, not a cool-plate value (`sprue.html:931`, `sprue.py:767`).
6. STORE-only zip with a fixed DOS date 2024-09-01 (`SPRUE.zip`, `sprue.html:766-787`).
7. STL zip: per object white and black STLs plus merged plate STLs per colour with positions baked, so the fallback import keeps the layout (`stlZipBytes`, `sprue.html:1388-1404`).

Limit: 21 keys instead of the 127 Flash Studio writes. The owner's Flash Studio save of a SPRUE design kept both filaments (`owner-sprue_plate-flashstudio-20260907.3mf`, per `fab-knowledge:sources/downloads/dl-baffle-inlay-coin.md` section 2.2), so the short set opened correctly; the README and print card still carry the STL fallback.

### 4.7 Face editor

Direct manipulation on the face canvases (`wirePointer`, `sprue.html:1173-1215`): a rotated bbox per layer (`layerBox`, `sprue.html:1129-1137`), a 14 px pink scale square on the box's lower right corner and a rotate dot of 7 px radius 2.2 mm above the box (`renderFace`, `sprue.html:1164-1166`), both hit within 1.4 mm; click selects the topmost unmuted layer; move, rotate (`atan2 - 90` degrees), scale (image width, arc radius or text size by distance ratio). Arrows nudge 0.2 mm, shift 1 mm; Delete removes (`sprue.html:1607-1614`). Faces render grey 138 outside the blank, 244 white body, 17 black ink (`renderFace`, `sprue.html:1141-1169`).

Touch and commit (`sprue.html:1217-1221`): `touch` re-renders the face after 40 ms; `commit` re-renders both faces, re-runs the thin flags and schedules a build after 350 ms; builds queue (`sprue.html:1224-1245`); `ensureMesh` resolves after any pending build (`sprue.html:1246`).

### 4.8 Layer list, layer panel and intake routes

What it does: the per-face layer stack and the selected layer's controls, plus every way art gets in.

Construction:
1. `renderLayerList` (`sprue.html:1423-1439`): one row per layer with a kind tag `IMG`, `ARC` or `TXT`, the name or text, the thin pill (`too thin` red when `gone`, `losing detail` when `weak`), and buttons up, down, hide/show, dup, x. Dup inserts a copy right after the original moved down 2 mm (`y - 2`) and selects it. Every button commits.
2. `renderLayerPanel` (`sprue.html:1441-1478`): image rows width 2 to 60, x and y -30 to 30, rotation, threshold 1 to 254, invert ("light pixels become inlay"), and two actions `fit to face` (largest width that fits the art zone bounds, centred, rotation 0) and `centre`. Text rows: text, font (the 9 built-ins plus loaded fonts), weight 400 / 600 / 700 / 900, size 1.5 to 30, tracking -0.5 to 3, x, y, rotation, arc radius 0 to 30 (0 is straight), `arc runs over the top`; the hint says size is the em height and caps come out 0.7 to 0.85 of it. Inputs `touch` on input and `commit` on change. During a drag the panel refreshes numbers only (`light` mode) so it never rebuilds under the pointer.
3. Intake routes (`wireArt`, `sprue.html:1586-1615`): the drop box and its hidden file input; dropping on a face canvas routes the file to that face; clipboard paste of any image; `+ text` (size 8 on a coin, 5 on a pick); `+ arc text` (Barlow Condensed 700, tracking 0.25, radius `coinD / 2 - 7` on a coin or 8 on a pick); `clear face` with a confirm; presets with a confirm when either face has layers; a font file input that registers a `FontFace` and adds it to every font list.
4. New image layers take Otsu's threshold and polarity and are fitted to the art zone at insertion (`addImageFile`, `sprue.html:1488-1497`).
5. Pin (`sprue.html:1618-1625`) asks for a name with `prompt`, default the kind plus a running number.
6. Design JSON: `designJSON` writes `{sprue: 1, state}` with image layers carrying `src` data URLs and no `img`; `loadDesign` checks only for `state`, reassigns layer ids, reloads images and commits once they decode (`sprue.html:1641-1658`).
7. Boot runs the `phx` preset, builds, then re-renders and rebuilds when `document.fonts.ready` resolves and once more after 1500 ms, so embedded and Google fonts both land in the first mesh (`sprue.html:1671-1678`).

Limits: no undo; `loadDesign` accepts any JSON with a `state` key, so a COLLAR or SASH design loads as garbage rather than being refused.

## 5. UX anatomy

| region | content | code |
|---|---|---|
| tokens | `--hb-*` palette: pink #FE0386, cream, paper, raised #fffdf7, sunk, ink, void, ok #1f9d55, warn #c77700, err #c3251f, slime; Plex Mono body, Special Elite hints, Permanent Marker guide names, VT323 heads and status | `sprue.html:12-20` |
| shell | header, steps, guide, main (400 px side, 1fr stage on a 24 px pink grid), status strip; stacks under 900 px | `sprue.html:30-56`, `sprue.html:117` |
| header | `SPRUE.` in VT323 34 px, tagline "one shot, many small parts. two colour coins and picks, packed to a plate.", auto rebuild, guide, load json, save json | `sprue.html:122-132` |
| steps | 1 BLANK, 2 ART, 3 PLATE + EXPORT, numbered circles; visited tabs turn ok green; guide sentence per step | `sprue.html:133-137`, `setStep` at `sprue.html:1542-1548` |
| step 1 | SHAPE (pick or coin segmented control; pick scale, thickness snapped to layers, keyring hole; coin diameter, thickness, border ring), INLAY (layer, inlay layers, edge break, min black, min white gap, art margin, mesh quality fold) | `sprue.html:142-175` |
| step 2 | FACE (front / back, drop box, + text, + arc text, clear face, layer list with up, down, hide, dup, delete and thin pills), LAYER panel, PRESETS (fan project pick, blank pick, blank coin, year coin) with a fonts fold | `sprue.html:176-198` |
| step 3 | PLATE (count, fill the bed, bed, gap, pin, roster), FILAMENT (material, body ext 1 colour, inlay ext 2 colour, slicer profile names fold), EXPORT (plate 3mf, stl zip, faces png, print card, slicing notes fold) | `sprue.html:199-236` |
| stage | FRONT and BACK face cards (active face has a pink header), 3D card with legend, PLATE card with time and grams | `sprue.html:238-249` |
| status | object dims, mesh triangles and volumes with ok or stale, plate parts and minutes, build ms | `sprue.html:250-256`, `setStatus` at `sprue.html:1561-1566` |
| welcome | three steps, "It opens with a pick that carries FAN PROJECT 2026 PHX on the back", start | `sprue.html:259-272` |

What makes it excellent: it knows the job is many small parts per plate in about an hour, so the time and grams live in the plate card header; the white body black inlay rule is stated where the inlay depth is set; the thin flags warn before a layer silently disappears; Otsu with polarity flip makes a dropped screenshot work with no threshold fiddling; pin and fill the bed make mixed plates a two click job; the merged plate STLs make the fallback import keep the layout.

## 6. Known limits and failure lessons

| limit | evidence |
|---|---|
| 21 filament keys, not 127; worked in the owner's save but relies on the slicer filling the rest | section 4.6 |
| fused glyphs at small sizes; no check for inter glyph gap after hygiene | section 4.2 |
| no undo | app script has no history |
| hook `SPRUE_APP` differs from `BENCH` | `sprue.html:1679` |
| face cards and 3D share the stage, so at 1280 x 860 the 3D and plate cards sit below the fold | `s-01`, `s-06` |
| two writers (python and browser) duplicate the same dialect and material tables; PETG nozzle 245 here, 250 in COLLAR, 240 in the skill | `sprue.html:923`, `sprue.py:66-67` |

## 7. Tests and harness

No test file ships. The bench exposes `globalThis.SPRUE_APP = {ST, mesh, threeMFBytes, stlZipBytes, build, ensureMesh, compose, geo, PRESETS, loadDesign, designJSON, renderFaces, setFace, roster}` (`sprue.html:1679`) and the engine as `globalThis.SPRUE` (`sprue.html:941`), with `SPRUE.checkClosed` as the built-in shell check. The python generator prints its card on every run. This record's drive is `fab-knowledge:originals/sprue/drive/sprue.cjs`.

## 8. Port map

| field | value |
|---|---|
| packages | profile, geom, mesh, 3mf, inlay, nest (`fab-knowledge:synthesis/mappings.md` row SPRUE) |
| feature kinds (in the 26) | pocket, chamfer (the stepped edge break) |
| kinds it needs that the 26 lack | `inlay` (art region by slot); the trace route is named in `docs/plan/PLAN.md` line 458 as mesh route `trace` |
| check families | CHK-INL, CHK-3MF, CHK-PRT; proposed CHK-INL-08 (layer keeps 75 percent of its cells) and CHK-INL-09 (glyph gap) come from SPRUE |
| mechanism canon id | MISSING (no mechanism; CANONS.md has no entry) |
| reference id | MISSING; proposed `cosmetic/giveaway-plate` and `cosmetic/pick-351` in mappings.md |
| milestones | M00 (SPRUE geometry parity, SPRUE writes 21 per-filament keys by that count) and M03 (SPRUE builds on the inlay package), `docs/plan/MILESTONES.md` lines 57 and 60 |
| lineage row | MISSING in `lineage.json` |
