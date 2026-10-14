# NACELLE: how it is made

Record written 2026-10-05 from the original files. Slug `nacelle`. Family cases-joinery: a freestanding glow in the dark screen and a sci fi CRT style housing whose LEGO stud rail mounts a laser rig (WASHER servo pan tilt, or DETENT galvo) aimed at the back of the screen, so the beam paints the phosphor face from behind as in a real CRT.

Number rules for this file. A number in a code table is a declared value copied from the file named in the row. "Measured" numbers come from the headless drive of the two viewers on 2026-10-05 (configs `fab-knowledge:originals/nacelle/shots/_drive.json` and `_drive2.json`, logs beside them) or, where marked, from the STL checks in `fab-knowledge:sources/benches/benches-coins-inlay.md` section 6. "Computed" means worked by hand from declared values.

Short paths: `F` is `fab-knowledge:originals/nacelle/files/`, `SC` is `F/scad/`.

---

## 1. Identity and revision

| field | value |
|---|---|
| name | NACELLE, glow screen and CRT shell |
| owner's slug | nacelle |
| canonical files | `F/stl/nacelle_body.stl` and `F/stl/nacelle_screen.stl` (the CRT revision as shipped), `F/nacelle_viewer.html` (sha256 1b6e0d3100d8b8ab4e7108430b6c53bc12d51dbb79e15b0ae6a675e773ce1969, "CRT shell preview"), `F/README.md`, and the OpenSCAD sources in `SC` |
| date | 2026-08-03 (the CRT revision; `nacelle_viewer (2).html` in Downloads at 2026-08-03 08:50 embeds the same CRT body) |
| source | OpenSCAD: `SC/params.scad`, `nacelle_body.scad`, `nacelle_screen.scad`, `lego_fit_test.scad`, `washer_lego_adapter.scad`, `detent_lego_adapter.scad`; export `openscad --export-format binstl` |
| runtime | the viewer loads three.js r128 from cdnjs and embeds both STLs as base64 with its own binary STL parser and orbit |
| print target | Elegoo Centauri Carbon, 256 x 256 x 256 (not the Creator 5 Pro); screen in glow filament, body and adapters in PETG |

### 1.1 Every revision found

From `fab-knowledge:sources/downloads/dl-cases.md` section 7.

| date | file | sha256 prefix | embedded body |
|---|---|---|---|
| 2026-08-02 20:43 | `nacelle_viewer.html`, copied to `F/precursor-console-aug02/` | 1e52790e | the console revision: ASCII STL, body 200.0 x 230.0 x 73.0, "assembly preview" |
| 2026-08-03 08:50 | `nacelle_viewer (2).html` | 7821eea5 | the CRT revision: binary STL, body 170.0 x 233.0 x 193.2 |
| harvest | `nacelle_viewer.html` | 1b6e0d31 | same CRT body; header "CRT shell preview" |

### 1.2 Why this revision, and the drift it carries

The CRT revision is the newest and the one the owner described and shipped: its STLs are watertight (README: "Every part here was independently verified watertight"), its viewer runs with 0 errors (measured), and its README carries the design reasoning. Its source is one revision behind: the shipped `params.scad` and `nacelle_body.scad` build the Aug 2 console (stepped tiers, screen pocket at the back, LEGO rail up front, 200 x 230 x 73), while the README and `nacelle_body.stl` are the Aug 3 CRT (170 x 233 x 193.2 with a recessed bezel and a tapered tube). The screen STL (130 x 70 x 169) matches the SCAD. The README's claim "Everything is one parameter file ... nothing is hardcoded in the part files" is therefore false for the body as shipped (benches-coins-inlay.md section 6). The Aug 2 viewer is kept as the console precursor; it throws "THREE.OrbitControls is not a constructor" and renders an empty stage on 2026-10-05 (measured, `n05`), because it calls OrbitControls without loading it.

### 1.3 What is in `files/`

| path | what |
|---|---|
| `nacelle_viewer.html` | CRT revision viewer with both STLs embedded |
| `README.md` | owner README (CRT revision) |
| `scad/` | the six OpenSCAD sources (console revision for the body) |
| `stl/` | `nacelle_body.stl` (CRT), `nacelle_screen.stl`, `lego_fit_test.stl`, `washer_lego_adapter.stl`, `detent_lego_adapter.stl` |
| `precursor-console-aug02/` | the Aug 2 console viewer |

Hashes: `fab-knowledge:originals/nacelle/SHA256SUMS`.

---

## 2. What it makes and for whom

A standalone glow screen that holds a laser's afterglow, and a CRT style housing that frames it, built for the owner's laser rigs WASHER (servo pan tilt) and DETENT (galvo). README: "A real CRT's screen sits right behind the glass at the front, and the electron gun is deep in the tapered neck at the back, firing forward the whole length of the tube to paint the phosphor face. That maps directly onto this build."

| part | measured (benches-coins-inlay.md) | what |
|---|---|---|
| `nacelle_screen.stl` | 130.0 x 70.0 x 169.0, 196 tris, 66,833 mm3 | glow PLA panel on a foot with two gussets |
| `nacelle_body.stl` | 170.0 x 233.0 x 193.2, 18,420 tris, 682,844 mm3 | PETG CRT shell |
| `lego_fit_test.stl` | 20.0 x 36.0 x 4.8, 1,164 tris | 2 x 4 stud coupon, print first |
| `washer_lego_adapter.stl` | 59.0 x 53.0 x 4.0 | plate for WASHER's `servo_base` 51 x 45 x 16 |
| `detent_lego_adapter.stl` | 90.0 x 65.0 x 4.0 | placeholder plate with two 30 x 4 slots |

---

## 3. Shots

Driven headless on 2026-10-05 (1280 x 860, network on for cdnjs). Copies in `fab-knowledge:originals/nacelle/shots/`.

| file | caption |
|---|---|
| `n01-crt-shell-default.png` | The CRT shell from the back corner: the wide fascia section, the shoulder into the narrower tube section, vent slots in the side, the screen visible inside; the panel text lists screen 130 x 70 x 169 and body 170 x 230 x 193. |
| `n02-crt-from-front.png` | From the front: the glow screen standing in the recessed two step bezel viewport, the knob details on the fascia. |
| `n03-crt-top-down-rail.png` | From above with the open top: the screen on its foot in the rim pocket behind the bezel, the LEGO stud rail in the tube section, and the weight relief lattice holes either side of it. |
| `n04-screen-alone.png` | Body hidden: the screen alone, a 110 x 165 x 1.6 panel on a 130 x 70 foot with two triangular back gussets. |
| `n05-console-aug02-from-scad.png` | The Aug 2 console viewer: an empty stage, because the page throws "THREE.OrbitControls is not a constructor"; kept as the failure record of the precursor. |

---

## 4. Build pipeline and code map

OpenSCAD CSG: `hull()` of four circles for rounded rectangles, `linear_extrude`, `difference` for lattice holes, vents and anti stud holes, `union` of floor, island, studs, pocket rim and walls. Export `openscad --export-format binstl -o <part>.stl <part>.scad` ("this OpenSCAD version defaults to ASCII STL, which is ~3x larger for no benefit", README). The viewer is hand written.

| file | modules and role |
|---|---|
| `SC/params.scad` | every shared parameter (print reality, screen, body, tiers, pocket, LEGO rail, lattice, greebles) |
| `SC/nacelle_body.scad` | `rounded_rect`, `hole_grid`, `floor_plate`, `lego_island`, `pocket_rim`, `vent_row`, `side_wall`, `side_wall_greebles`, `front_wall`, `back_wall`, `body` (console revision) |
| `SC/nacelle_screen.scad` | `foot`, `back_gusset`, `screen` |
| `SC/lego_fit_test.scad` | 2 x 4 stud patch |
| `SC/washer_lego_adapter.scad`, `SC/detent_lego_adapter.scad` | anti stud plates |
| `F/nacelle_viewer.html` lines 35 to 66 | `b64ToBuffer`, `parseBinarySTL`; lines 68 to 155 scene, materials, the screen placed at (19.7, 25.8, 3.2), a self contained orbit (`theta`, `phi`, `radius`), toggles |

---

## 5. Mechanisms, circuits and constructions

### 5.1 The LEGO stud rail and its fit coupon

What it does: a grid of printed LEGO studs on a raised island so a rig on a LEGO base mounts on any row, which sets the throw distance at assembly time.

Constants (`SC/params.scad`): `lego_pitch 8.0`, `lego_stud_d 4.85` ("printed stud diameter, TEST with lego_fit_test.scad first and adjust; not verified against real bricks"), `lego_stud_h 1.8`, `lego_plate_t 3.0`, console revision `lego_studs_x 8`, `lego_studs_y 16` (64 x 128, "~17-145mm throw range"), `lego_margin_front 10`. CRT revision (README): 8 x 13 studs, 64 x 104, throw "roughly 89mm at the row closest to the shoulder, up to about 193mm (7.6in) at the row nearest the back wall", bracketing the rigs' "~150mm/6in default calibration distance".

Construction (`lego_island`, nacelle_body.scad): a cube `island_w x island_d x lego_plate_t` on the floor, then one cylinder per stud at pitch centres.

Coupon (`lego_fit_test.scad`): a 2 x 4 stud patch on a 3.0 plate, a few minutes to print; "If the studs are too fat, drop lego_stud_d in params.scad by 0.1-0.2mm and reprint this coupon before committing to the full body."

### 5.2 Anti stud adapter plates

What it does: lets a rig without a LEGO base press onto the rail.

`washer_lego_adapter.scad`: plate `base + 2 x 4 margin` (59 x 53), 4 thick; a registration lip pocket 1.5 deep for WASHER's `servo_base` 51 x 45 with `base_clr` 0.3; anti stud holes from the bottom `hole_d = lego_stud_d + 0.35 = 5.20` (computed), cylinders of height `plate_t / 2` starting at z -0.1, so 1.9 deep against a 1.8 stud (computed), on the 8 mm pitch centred in the plate (a 7 x 6 grid on the 59 x 53 plate, computed from `floor(59/8)` and `floor(53/8)`), leaving 0.6 of plate between the hole tops and the lip pocket floor at z 2.5 (computed), "oversized slightly for a firm press fit". The lip is location only ("secure it with tape or a dot of glue until real hole positions are captured").

`detent_lego_adapter.scad`: a PLACEHOLDER 90 x 65 x 4 plate with two 30 x 4 slots so it can be zip tied or bolted to whatever DETENT's hole spacing turns out to be; same anti stud underside. The comment calls the slots "crossed", but both are cut at rotation 0, parallel, at `plate_d/2 plus or minus 12`. Each slot is `linear_extrude(height = plate_t/2 + 1, center = true)` placed at `z = plate_t/2`, so it spans z 0.5 to 3.5 inside the 4 mm plate: it never breaks the top face and reaches the bottom only where it crosses the anti stud rows at y 20.5 and 44.5 (computed from the SCAD; the shipped STL has vertex levels at z 0, 0.5, 1.9, 3.5 and 4.0 and one connected shell, measured 2026-10-05). As shipped, a zip tie cannot pass through the top of the plate; a port must cut the slots through `plate_t + 0.2`.

### 5.3 The glow screen on a foot

`nacelle_screen.scad`: foot `rounded_rect(130, 70, 6)` 4 thick; a blade 110 x 1.6 x 165 standing on it, front face flush with the foot's front edge; two back gussets, each a `hull()` between a 0.1 sliver near the top of the brace (`gusset_h` 42 above the foot) and a flat run along the foot (`gusset_base` 18), `gusset_t` 2.0 thick, 30 mm either side of centre. Panel `panel_t` 1.6 "4 perimeters at 0.4mm nozzle, no infill needed"; `panel_h` 165 "(>= 152.4mm / 6in)".

Print (README): glow filament, panel face vertical, foot flat on the bed, 4 perimeters, 0 infill, brim under the foot for the 169 mm height. Two source notes disagree with the code (read 2026-10-05): the `nacelle_screen.scad` header says "panel face up" while the README and the geometry (foot at z 0, blade standing in z) mean panel vertical; and `params.scad` says `gusset_base` runs "along X" while `back_gusset` lays the 18 mm run along Y, behind the blade, which is the direction that braces it. The screen pocket in the console body is `foot + 2 clr` (130.6 x 70.6, computed) inside a rim 2 wide and 2.5 tall (`pocket_rim`), set against the inside of the back wall.

### 5.4 The screen pocket with a rim

`pocket_rim` (nacelle_body.scad): a 2.5 tall rounded rectangle rim around a pocket `foot + 2 clr` by `foot_d + 2 clr` (`clr` 0.30 per side), `rim_t` 2, so the screen's foot drops in. In the CRT revision the pocket sits right behind the recessed bezel viewport in the wide front section (README).

### 5.5 Floor weight relief lattice, tiers and greebles

`hole_grid` makes a centred grid of `lattice_hole` 9 holes on `hole + rib` (9 + 4) spacing through the floor in the strips flanking the LEGO island, "skipped near the walls, the island and the screen pocket to keep the load paths solid". The console revision's walls step in three tiers along Y (front 70 deep x 22 tall, mid 80 x 45, back 80 x 70, which must sum to `body_d` 230) The SCAD defines `side_wall_greebles` (recessed `vent_row` panel lines, `greeble_depth` 0.8) but `body()` never calls it, so the console body as written has no greebles. `back_wall()` unions a plain back wall cube with a second copy that has ten 4 x 8 vent slots cut near the top, so the plain copy fills the slots back in and the console's back wall prints solid (read from `SC/nacelle_body.scad` `back_wall` and `body`; the CRT STL is a different body and is not affected). The CRT revision replaces the tiers with a wide fascia section, a shoulder, a tapered tube section, a two step recessed bezel and knob details (README; only in the STL).

### 5.6 Watertightness lesson

README: "the first pass at this shell had three separate coincident-geometry bugs at the section seams that OpenSCAD's own console output didn't reliably flag; each part in this drop was checked with a proper mesh watertightness test."

---

## 6. UX anatomy

The viewer is a single page: a fixed card with the title, two toggles (screen, body) with colour swatches, the part sizes, the design sentence and "drag to orbit, scroll to zoom"; a dark stage (`#101216`) with a grid, the body in a terracotta PETG colour and the screen in a mint with a faint emissive. No steps, no parameters, no exports, no hook. The title and README use em dashes, which the house rules forbid, and the comment "no CDN dependency" sits beside a cdnjs script tag (benches-coins-inlay.md).

What is worth keeping: the README's design reasoning (the CRT layout mapped onto a laser rig), the stated open questions with a fallback for each, and the print first coupon.

---

## 7. Tests and harness

None shipped. The README records a mesh watertightness check per part and the open assumptions: rear projection through 1.6 mm phosphorescent PLA is untested (fallback: mount the rig in the front section facing the screen's front face); the stud size is an estimate; WASHER screw positions are unknown; DETENT rev D's footprint is unknown (only the RGB variant's 108 x 65 x 62.8 envelope is recorded); wall 2.8 and floor 3.2 are not load tested.

---

## 8. How to make a new thing this way

1. Put every dimension in one parameter file and regenerate every part from it; keep the source in step with the shipped mesh.
2. Mount bought rigs on a stud grid so position is chosen at assembly, and ship a stud coupon first.
3. Adapt rigs without studs with anti stud plates sized `stud + 0.35`.
4. Brace thin standing panels with hull gussets instead of thickening them.
5. Lattice the floor only where it carries no load.
6. Verify every exported mesh watertight with a real mesh check, not the CAD console.

---

## 9. Port map

| item | value |
|---|---|
| packages | `profile` (printer: Centauri Carbon), `catalog` (WASHER servo_base, DETENT envelopes, LEGO stud standard), `mesh` (OpenSCAD route, outside the plan's kernels) |
| feature kinds | pocket (screen pocket), window (vents); kind it needs: `studgrid` (coupon gated), per `fab-knowledge:synthesis/mappings.md` lines 86 and 295 |
| canon id | MISSING: no canon entry for a LEGO stud rail with an anti stud adapter (`blocks-stud` in CANONS section 4.1 is the BLOCKS conductive stud, a different mechanism) |
| reference id | `joints/stud-rail` (proposed in `synthesis/mappings.md` line 86); does not exist under `reference/` on 2026-10-05 (MISSING) |
| milestone | none assigned; CHK-ART-02 cites the SCAD to STL drift |
| lineage rows | MISSING: no row in `lineage.json` for the NACELLE SCAD or the CRT body |
