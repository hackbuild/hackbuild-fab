# coin: the hack.build challenge coin generator and the 3d/coin project

How the first coin was made, read from the original code, and what the owner's `3d/coin` project folder holds. The python generator is where every coin rule in this family was first paid for in failed prints: the Application tag, per-filament vector lengths, the mirrored bed face, period kerning, a 1.2 mm inlay for pink over black, reeds at least 1.0 mm deep, the pause layer. COLLAR (see the `collar` record) replaced it as the tool; the rules carried over. Nothing here comes from the quarantined mockups.

Code root: `fab-knowledge:originals/coin/files/src/` (`coin.py`, `geom.py`, `build.py`, `write3mf.py`, `generate.py`, `preview.py`, `logo_src.py`, `fonts/`). A location written `coin.py:61-69` means those lines of that file in that folder. The owner's project folder is `3d/coin/`, copied to `fab-knowledge:originals/coin/files/project-3d-coin/`.

Number qualifiers: a number with a `file:line` citation is a constant read there; `measured` is read from a shipped file, a hash, or the mesh extraction done here on 2026-10-05 (`fab-knowledge:originals/coin/drive/ex.py`); `computed` is arithmetic done here; `vendor` is a slicer preset value; `inferred` and `unknown` mean what they say.

## 1. Identity and revision

| item | value |
|---|---|
| name | hack.build challenge coin, python generator ("hackbuild coin"; registry `challenge-coin`, status superseded by COLLAR) |
| slug | `coin` (the owner's folder name `3d/coin`) |
| conversation | `0ae6e90c-b9cb-4869-9852-ee33f5af5386`, the same chat that then built COLLAR |
| canonical generator | `src/` as harvested from `fab-work-directory:benches/collar-coin/outputs/hackbuild-coin/src/` (v2: 3.6 mm, 1.2 inlay, 40 reeds 1.0 deep, period kerning, mirrored back, Application tag, NFC variant) |
| canonical outputs | `hackbuild-coin.3mf` sha256 `678251134422d564e96c21e0aa0e88c94e35d527300634b11dc37dbfd85cd8f1`; `hackbuild-coin-nfc.3mf` sha256 `838cc6626fa3d0ce9693c6c7b1d5c8a2510fe2a63d6a47003507928212b2ad78`, byte identical to `~/Downloads/hackbuild-coin-nfc (1).3mf`, 2026-08-18 20:45 (measured) |
| project file 1 | `project-3d-coin/hackbuild-coin-nfc.3mf`, sha256 `24ee9c66419ac23eb2075e859bd0191a6431abb1d7d3628eea2372abc854f0c5`, 2026-08-19 18:28: the Flash Studio save of the v2 NFC export; the same bytes as `fab-work-directory:benches/collar-coin/uploads/hackbuild-coin-nfc.3mf`, which the plan calls the gold 3MF (`docs/plan/PLAN.md` line 1810) |
| project file 2 | `project-3d-coin/hsl.3mf`, sha256 `6a407afd8e6147d5ea59d1aa702588e2b30819e6ffae98a1bc40ca802ec9b6f8`, 2026-08-19 18:44: a HeatSync Labs coin made in COLLAR and saved in Flash Studio (section 4.9) |

### 1.1 Every revision, and why this one is canonical

| date | evidence | state |
|---|---|---|
| early 2026-08 | coin README "now writes"; print-reality notes | v1: 44 x 3.2 mm, 0.8 inlay, 64 reeds 0.5 deep, no Application tag. Reeds printed round, pink tinted, back wordmark printed backwards, colours dropped in Flash Studio |
| 2026-08-18 19:08 to 19:47 | `~/Downloads/hackbuild-coin-*.stl`, `hackbuild-coin.3mf` (425617 bytes) | intermediate exports |
| 2026-08-18 19:48 | `fab-work-directory:benches/collar-coin/uploads/Screen_Shot_2026-08-18_at_7_48_17_PM.png`, copied as `files/owner-slicer-bottom-view-20260818.png` | the owner's slicer bottom view showing the back wordmark |
| 2026-08-18 19:52 | `~/Downloads/hackbuild-coin (1).3mf` | a write3mf output with a 5-key project settings, version 01.09.00.00 |
| 2026-08-18 20:45 | `hackbuild-coin-nfc (1).3mf` = harvested `hackbuild-coin-nfc.3mf` | v2, the final generator state |
| 2026-08-19 18:28 | `3d/coin/hackbuild-coin-nfc.3mf` | owner's Flash Studio save of the v2 NFC coin |

v2 is the newest and the best generator state: it is the harvested source, its outputs match the last Downloads export byte for byte, and every v1 failure has a fix in its code. The generator was then superseded by COLLAR on 2026-08-19; it was not developed further.

### 1.2 Companions copied

Under `fab-knowledge:originals/coin/files/`, sha256 in `fab-knowledge:originals/coin/SHA256SUMS`: `src/` (all six python files, `logo_src.py`, Permanent Marker and Special Elite TTFs, Apache 2.0), `README.md`, `hackbuild-coin.3mf`, `hackbuild-coin-nfc.3mf`, `hackbuild-coin-preview.png`, `owner-slicer-bottom-view-20260818.png`, `project-3d-coin/hackbuild-coin-nfc.3mf`, `project-3d-coin/hsl.3mf`. The per-colour STLs are skipped (the 3MFs carry the same meshes).

## 2. What it makes and for whom

A 44 mm, 3.6 mm three colour flush inlay challenge coin for the hack.build brand, plus an NFC variant at 4.2 mm with a sealed 26 mm pocket for a 25 mm sticker (`coin.py:17-34`, `generate.py:22-43`). Front: the hack.build mark filling the face, arc in cream, wrench in pink. Back: the wordmark, `hack` in cream and `.build` in pink, mirrored in the model. The README says "hack. in cream white, build in pink", but `kerned_wordmark` returns the dot with the tail, so the dot prints pink (`coin.py:124-133`; visible in `k-01` and `k-05`). COLLAR's `hack|.build` pipe split keeps the same colouring. Edge: 40 reeds in a full-thickness pink rim. Colours ink #1A1A1A, cream #F5F0E6, pink #FE0386 (`generate.py:17-19`).

## 3. Shots

Folder `fab-knowledge:originals/coin/shots/`. The 3D renders are three r128 drawings of the meshes read directly out of the original 3MFs (extraction `drive/ex.py`, page `drive/view.html`, driver `drive/render.cjs`), 1280 x 860.

| shot | caption |
|---|---|
| `k-01-python-v2-solid-coin-3d-front-and-back.png` | `hackbuild-coin.3mf` rendered from its own meshes: front with the mark (cream arc, pink wrench, black body showing through), and the bed face from below, where the mirrored wordmark reads HACK.BUILD the right way round. 12,840 triangles in three parts (measured). |
| `k-02-python-v2-solid-coin-exploded.png` | The same coin exploded by extruder: black body with 1.2 mm pockets, cream inlay prisms, and the pink part as rim ring plus front and back inlays. |
| `k-03-flashstudio-roundtrip-nfc-coin-3d.png` | `3d/coin/hackbuild-coin-nfc.3mf`, the owner's Flash Studio save, exploded: 4.2 mm, the black body carries the sealed pocket; filament colours as the owner set them in the slicer (#FB02FF pink). 13,348 triangles (measured). |
| `k-04-hsl-collar-coin-3d-front-and-back.png` | `3d/coin/hsl.3mf`: the HeatSync Labs coin made in COLLAR, a black mark on a white face with orange accents, 15 square grooves in a 3.5 mm orange rim; the back is plain. 98,746 triangles (measured). |
| `k-05-generator-face-preview-png.png` | The generator's own `hackbuild-coin-preview.png` (2400 x 1240, measured): both faces as read in hand, drawn from the shapely regions. `preview.py` as shipped writes `preview.png` at 11 x 5.6 in and 170 dpi, which is 1870 x 952 (computed from `preview.py:37`, `preview.py:41`), so the shipped PNG came from a different figure size or dpi than the harvested script (inferred). |

## 4. Mechanisms and constructions

No moving mechanism and no circuit. The constructions are the reeded rim, the chamfered body, the colour split by booleans, the period kerning, the mark from verbatim paths, the sealed pocket and pause layer, and the 3MF dialect. Route: 2D colour regions in shapely, extruded and combined in trimesh with the manifold engine; art stays vector end to end.

### 4.1 Reeded rim by circular cutters

What it does: cuts N round flutes into the coin outline.

Construction (`reeded_outline`, `coin.py:61-69`): cutter radius `rc = (FLUTE_W^2 / 4 + FLUTE_D^2) / (2 FLUTE_D)`, centred at `R + rc - FLUTE_D`, one per flute at angle `2 pi i / FLUTES`; the outline is the disc minus the union of the cutters. The rim ring is that outline minus the inner circle `R_RIM_IN` (`rim_shape`, `coin.py:72-74`).

Constants: `FLUTES = 40`, `FLUTE_D = 1.00`, `FLUTE_W = 2.80`, `RIM_W = 2.2` (`coin.py:23-26`). Computed: `rc = (1.96 + 1) / 2 = 1.48 mm`, cutter centre at r 22.48, flute root at r 21.0, which stays 1.2 mm clear of the rim's inner edge at r 19.8; pitch `2 pi 22 / 40 = 3.46 mm`.

Lesson: v1's 64 reeds at 0.5 mm deep printed practically round; 40 reeds at 1.0 mm deep with a 2.8 mm mouth read on a 0.4 nozzle, roughly two and a half extrusion widths into each valley; arc fitting on the outer wall must be off (README). COLLAR's reeded style is this same cutter formula (`collar` record section 4.2).

### 4.2 Chamfered body

Construction (`body`, `build.py:47-59`): revolve the profile `[(0, 0), (RF, 0), (R, CH), (R, THK - CH), (RF, THK), (0, THK)]` at 512 sections, then intersect with the reeded outline extruded from -1 to THK + 1, manifold engine. `CHAMFER = 0.5` (`coin.py:19`), a 45 degree edge break top and bottom.

### 4.3 Colour split by booleans

What it does: three parts (black body, white inlay, pink rim plus inlay) that never overlap and sum to the solid.

Construction (`build`, `build.py:62-89`):
1. Front regions from `face_front`, back regions from `face_back` mirrored in X, both cleaned (4.6).
2. White = front white prisms from `THK - INLAY` to `THK` plus back white prisms from 0 to `INLAY`; pink likewise (`build.py:66-70`).
3. Rim = body minus a core cylinder of `R_RIM_IN`; inner = body intersect the core cylinder (`build.py:72-75`).
4. Black = inner minus white minus pink; the NFC pocket subtracted from black (`build.py:77-81`); pink = pink inlays plus rim (`build.py:82`).
5. Each part's vertices merged; watertightness and volume printed per part (`build.py:84-89`).

Constants: `INLAY = 1.2` (6 layers at 0.2), `GAP = 0.45` (black held between two colours that would touch) (`coin.py:20-21`); thickness 3.6 for the solid variant, 4.2 for NFC (`set_variant`, `coin.py:39-44`; module default `THK = 3.2` at `coin.py:18` is a v1 leftover overridden on every run).

Lesson: pink and white over black at 0.8 mm tinted grey; 1.2 mm stopped it, so the coin went from 3.2 to 3.6 mm to keep a solid core (README; skill `references/print-reality.md`).

Measured volumes (README): about 5.2 cm3, 6.6 g PETG per coin, 3.5 g black, 0.6 g white, 1.1 g pink; NFC about 5.7 cm3.

### 4.4 The mark from verbatim paths

`logo_src.PATHS` holds the two favicon paths verbatim with their translates, viewBox `117 103 800 800` (`logo_src.py`). `svg_path_to_shape` samples each continuous subpath, 2 points per line and 48 per curve segment, and XORs rings even-odd (`geom.py:11-45`). `mark_pieces` flips y, scales the union so its bbox width equals `2 R_ART`, centres it, and returns arc and wrench separately (`coin.py:77-91`). Front: the arc minus the wrench grown by `GAP` (`face_front`, `coin.py:94-97`). `R_ART = R_RIM_IN - 1.4 = 18.4` (computed from `coin.py:49-50`).

The rule this set: never redraw the mark; scale its verbatim paths (skill `references/art-engine.md`).

### 4.5 Period kerning in the wordmark

What it does: keeps the dot in `hack.build` from merging into the k in Permanent Marker.

Construction (`kerned_wordmark`, `coin.py:101-133`): the k's brush tail overlaps the dot in x, so a vertical cut fails (`split_x_gap` at `geom.py:120-131` was the abandoned approach). Instead: measure the right edge of `hack` (a) and `hack.` (b); the dot is the smallest outline whose bounds sit between `a - 0.12 size` and `b + 0.04 size`; shift the dot right by `size x PERIOD_KERN` and every outline after it by twice that. Back face (`face_back`, `coin.py:136-150`): scale to `2 R_ART` wide, ink minus pink grown by `GAP`.

`PERIOD_KERN = 0.11` of the font size (`coin.py:27`). COLLAR generalised this as `runGap` at a pipe split (`collar` record section 4.4).

### 4.6 Region hygiene

`clean(shape, min_area = 0.25, tol = 0.015)` (`build.py:13-26`): drop polygons and holes under 0.25 mm2, open by `buffer(-0.01).buffer(0.01)`, simplify 0.015. Prisms skip polygons under 0.01 mm2 and extrude with the `triangle` engine (`prisms`, `build.py:35-44`).

### 4.7 Sealed NFC pocket and pause layer

Constants: `NFC_DIA = 26.0` (25 mm sticker plus 1 mm), `NFC_DEPTH = 0.6` (sticker plus chip bump), `NFC_Z0 = 1.8` on a 0.2 boundary, `NFC_THK = 4.2` (`coin.py:30-34`). The pocket prism from `NFC_Z0` to `NFC_Z0 + NFC_DEPTH` is subtracted from the black body (`build.py:78-81`). `generate.py` prints the pause: ceiling Z 2.4, layer `round(2.4 / 0.2) + 1 = 13` (`generate.py:33-38`; computed). Walls 0.6 floor and 0.6 roof outside the 1.2 inlays (computed: 1.8 - 1.2 and 4.2 - 1.2 - 2.4).

The README's slicer procedure became COLLAR's print card text verbatim in substance: Preview tab, vertical layer slider, right click the plus dot, Add pause; greyed out unless print order is by layer and the cursor is on the plus dot; check by scrubbing one layer down to see the pocket open and one up to see the roof bridging.

### 4.8 3MF dialect, v2 writer

What it does: the first writer whose colours survived Flash Studio.

Construction (`write_3mf`, `write3mf.py:63-148`):
1. `Application` `BambuStudio-01.10.01.50`, `OrcaSlicer` 2.1.1, `BambuStudio:3mfVersion` 1, empty metadata keys plus Title (`write3mf.py:19-20`, `write3mf.py:45-47`, `write3mf.py:69-77`).
2. One mesh object per part with UUID `index + (BACKUP_ID << 16)` and the sub-object suffix, a components object, one build item at (128, 128, 0) (`write3mf.py:50-61`, `write3mf.py:78-98`). The `<< 16` scheme is the one the slicer writes itself.
3. `model_settings.config` with each part's name and extruder, one plate instance and one assemble item (`write3mf.py:100-130`).
4. `project_settings.config` with `from: project`, version 01.09.00.00, and three per-filament keys: `filament_colour`, `filament_type`, `filament_settings_id` ordered by extruder (`write3mf.py:132-139`, zip written at `write3mf.py:141-147`).

Lessons (README section "Why a 3MF can lose its colours"): without an Application tag starting `BambuStudio-` or `OrcaSlicer-`, the importer logs "the 3mf is not from Bambu Lab, load geometry data only" and keeps only triangles; with a single-filament profile, extruders 2 and 3 are clamped back to 1, so the project must declare N filaments. COLLAR later found that three keys are too few on some loaders and wrote all 127 (`collar` record section 4.9).

### 4.9 The 3d/coin project: two Flash Studio saves

`project-3d-coin/hackbuild-coin-nfc.3mf` (2026-08-19 18:28), measured here and in `fab-knowledge:sources/benches/benches-coins-inlay.md` section 1.2:
- `Application` kept as `BambuStudio-01.10.01.50`; meshes moved to `3D/Objects/hackbuild-coin-nfc_2.model` with `p:path` components and `3D/_rels/3dmodel.model.rels`; components recentred by half the height (2.1); plate thumbnails added.
- 669 project keys, 127 of them per-filament at length 3 (measured): this file is the source of the 127-key set COLLAR writes.
- Filaments: `Flashforge HS PETG @FF C5P`, `Flashforge PETG Pro @FF C5P`, `Generic PETG @FF C5P` (vendor), colours #1A1A1A, #FFFFFF, #FB02FF (measured); printer `Flashforge Creator 5 Pro 0.4 nozzle`, process `0.24mm Standard @FF C5`, layer 0.24 (vendor).
- At 0.24 layers the generator's pocket floor 1.8 is 7.5 layers and the ceiling 2.4 is 10 layers (computed), so the printed "layer 13 at 0.2" is wrong for the layer this file was saved at. A port derives every pocket Z and the pause layer from the process preset's layer height.

`project-3d-coin/hsl.3mf` (2026-08-19 18:44):
- Object `collar-coin`, `source_file` `collar-coin-44mm.3mf`: a COLLAR export saved by Flash Studio (measured).
- 98,746 triangles and 3.8 mm thick (measured), which match the owner's COLLAR print card of 2026-08-19 18:39 (`fab-knowledge:originals/collar/files/owner-collar-print-card-20260819-nfc-020.txt`): square groove 15 reeds 1.65 deep 4.10 wide, rim 3.50 in slot 3, NFC pocket 26 for a 25 tag, floor Z 1.60, ceiling Z 2.20, walls 0.40 and 0.40, pause before layer 12 at 0.20 layers.
- Saved on `Flashforge Creator 5 Pro 0.25 nozzle`, process `0.12mm Standard @FF C5 0.25 nozzle`, layer 0.12, three `Generic HS PLA @FF C5P 0.25 nozzle` slots coloured #FFFFFF, #FD8008, #000000 (vendor, measured). The slot named black holds #FFFFFF: the owner recolours slots and keeps names. The owner also swapped two part assignments in the slicer: the part named `cream (slot 2)` sits on extruder 3 (#000000) and `orange (slot 3)` on extruder 2 (#FD8008), while `black (slot 1)` stays on extruder 1 (measured from `Metadata/model_settings.config`). Part names written by COLLAR therefore do not survive as extruder numbers; a round-trip check compares the extruder map, never the names.
- 668 project keys, 127 per-filament (measured). It is the one owner 3MF on the 0.25 preset that the M00 exit names ("25 owner 3MFs parse (24 on the 0.4 preset, hsl.3mf on 0.25)", `docs/plan/MILESTONES.md` line 57).
- The pocket walls of 0.40 are under the 0.6 floor and 0.8 roof rule, and the 0.20-layer pause (layer 12, Z 2.20) does not land on a 0.12 layer boundary (2.20 / 0.12 = 18.3, computed). Whether the owner re-sliced or re-paused is unknown.

### 4.10 Arc text and other unused helpers in `geom.py`

`geom.py` carries helpers the coin does not call, and one of them is the ancestor of COLLAR's arc text:
- `text_on_arc(txt, font, size, radius, center_deg = 90, flip, tracking)` (`geom.py:86-117`): per-character advances from prefix extents with spaces measured as `n` (`_advances`, `geom.py:74-83`), the string centred on `center_deg`, each glyph centred on its own bbox, placed at `ang = center_deg + sign (mid / radius)` with `sign = -1` on top and `+1` when `flip` puts it on the bottom of a seal, glyphs growing outward on top and inward when flipped. COLLAR's `renderLayer` arc branch is this function moved onto a canvas: same `n` for a space, same sign rule, same `flip` name (`collar.html:1027-1050`).
- `fit_shape` (scale to a target width or height with a y flip, `geom.py:134-149`) and `split_x_gap` (`geom.py:120-131`) are imported by `coin.py` but never called (`coin.py:12-13`); `split_x_gap` is the abandoned vertical-cut approach to the period (section 4.5).

## 5. UX anatomy

There is no UI. The interface is the constants block at the top of `coin.py` (`coin.py:16-37`), the command `python generate.py`, the console report per part (components, watertight, volume, faces, bounds) and the NFC pause line, and `preview.py` writing `preview.png`, a two-face matplotlib preview at 170 dpi, into the working directory (`preview.py:10-43`), then printing the white and pink areas per face. The README is the operator manual: slicing on the Creator 5, the STL fallback (select all three STLs, answer yes to one object with multiple parts, set each part's filament; about thirty seconds, any Orca-derived slicer), the pause procedure, and the regeneration command `pip install numpy shapely trimesh manifold3d svgpathtools matplotlib triangle; cd src; python generate.py`.

What makes it worth keeping: it is the minimal correct coin, every rule visible in a few hundred lines of python; its README explains each failure in the owner's terms; its outputs are the fixtures the plan uses for the 3MF dialect (the round trip) and for parity.

## 6. Known limits and failure lessons

| item | evidence |
|---|---|
| README says "The inlay is 0.8 mm, so it lands on exactly 4 layers", left from v1, while the code uses 1.2 | README, `coin.py:20` |
| README says `hack.` is cream and `build` pink; the code puts the dot in pink with `build` | `coin.py:124-133`, `k-05` |
| module `THK = 3.2` is a v1 leftover; every run sets 3.6 or 4.2 | `coin.py:18`, `coin.py:39-44` |
| three per-filament keys only | `write3mf.py:132-139` |
| pause layer computed at 0.2 layers while the owner sliced at 0.24 | section 4.9 |
| `char_advances` in `geom.py` has dead first-pass code | `geom.py:56-71` |
| no UI: every change is an edit to `coin.py` and a rerun | section 5 |

## 7. Tests and harness

Checks run on every build per the README: each part watertight, zero overlap volume between any pair, the parts summing to the solid, round trip through trimesh and lib3mf. In the shipped source only the per-part watertight and volume report is present (`build.py:84-89`); the overlap and lib3mf checks are not in the harvested files (inferred: they ran in the chat's sandbox). The skill's `validate_3mf.py` and `demo_coin.py` are their descendants (see the `inlay` record, section 7). This record's renders: `fab-knowledge:originals/coin/drive/`.

## 8. Port map

| field | value |
|---|---|
| packages | 3mf, mesh, inlay (`fab-knowledge:synthesis/mappings.md` row "challenge coin (python)") |
| feature kinds (in the 26) | pocket, edgeProfile |
| kinds it needs that the 26 lack | `inlay`, `sealed-pocket` |
| check families | CHK-3MF, CHK-SHP, CHK-INL; the misattributed-origin note in mappings.md places CHK-SHP-02 (reeds) and CHK-INL-04 (mirror the bed face) on this generator |
| mechanism canon id | MISSING (no mechanism) |
| reference id | MISSING. Proposed `exports/orca-3mf-roundtrip` uses `3d/coin/hackbuild-coin-nfc.3mf` as the conformance fixture for `hackbuild-3mf` (mappings.md) |
| milestones | M00: the gold round trip passes `--roundtrip` and 25 owner 3MFs parse including `hsl.3mf` (`docs/plan/MILESTONES.md` line 57) |
| lineage row | MISSING in `lineage.json` |
