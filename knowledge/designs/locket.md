# LOCKET: how it is made

Record written 2026-10-05 from the original code. Slug `locket`. Family cases-joinery: the folding Pi cyberdeck. LOCKET R2 (revision J geometry, revision K sim) is a print flat one piece body with a print in place knuckle hinge, a nub latch, a finger collar faceplate, press fit port plugs with crush ribs and a belt holster with spring tabs; the early LOCKET is a screwed deck with an adjustable friction clamp hinge. The owner's slicer save in `3d/locket/` belongs here. COAMING, the case maker that grew out of LOCKET R2, has its own record at `fab-knowledge:originals/coaming/RECORD.md`.

Number rules for this file. A number in a code table is a declared value copied from the file and line named in that row. "Measured" numbers come from the headless drives of both sims on 2026-10-05 (configs `fab-knowledge:originals/locket/shots/_drive.json` and `_drive2.json`, logs beside them) or, where marked, from the STL and 3MF checks in `fab-knowledge:sources/benches/benches-cases.md` sections 6 and 7 and `fab-knowledge:sources/downloads/dl-cases.md` section 4. "Computed" means worked by hand from declared values. The Python source was read, not run: it hard codes `/home/claude/locket/` paths and a font file that is not shipped.

Short paths: `F` is `fab-knowledge:originals/locket/files/`, `BP` is `F/src/build.py`, `EF` is `F/early-friction-hinge/`.

---

## 1. Identity and revision

| field | value |
|---|---|
| name | LOCKET R2, parametric folding Pi deck |
| owner's slug | locket |
| canonical files | `F/locket_r2_sim.html` (rev K sim, sha256 afa0e593a71af9af06a13d9929ff48b0bc840e3b6be4d3265dc39c3edffd3244, 1,847,901 bytes, 2026-08-21 00:57) and the rev J source `F/src/build.py` (sha256 20ad46eead8132a69f69ec3d9142d1ded7ef1e5e3255acc7b61d4e8de96eb90b), `export.py`, `simdata.py`, `gen_sim.py`, `run.sh`, `fa_icons.json` |
| exports | `F/locket-r2.3mf` (sha256 eccd38e5...177d, Orca style, the last of the R2 3MFs), `F/locket-r2-generic.3mf` (lib3mf, base materials) |
| owner save | `F/owner-saves/locket-r2.3d-folder.orca232-save.3mf` = `3d/locket/locket-r2 (1).3mf` (sha256 df56c888...4904, 2026-08-19 18:28): an OrcaSlicer 2.3.2 save of an earlier R2 export |
| runtime | Python 3 with manifold3d, shapely, trimesh, lib3mf, svgpathtools, matplotlib TextPath; the sim inlines three.js from `src/package/build/three.min.js` and runs offline |
| print target | Flashforge Creator 5 Pro, 0.24 preset, PETG black, white, pink; no supports, NO BRIM on the body |

### 1.1 Every revision found

| date | file | what |
|---|---|---|
| 2026-08-04 23:26 to 08-05 13:12 | `locket.html` to `locket (12).html` (the early bench, OpenSCAD) | four knuckle hinge; from `(5)` (2026-08-05 02:43) the M3 friction clamp; `(12)` = harvest `EF/locket.html` (sha256 932ed5df...) |
| 2026-08-19 12:58 | `locket_r2_sim.html` | R2: HL 33.0, closed 49.0, base, lid, faceplate, tray |
| 2026-08-19 14:17 to 18:27 | `locket-r2.3mf`, `(2)`, `(3)`, `(1)` | body plus faceplate, then the service plug; `(1)` is the Flash Studio save (owner copy in `3d/locket`) |
| 2026-08-19 16:13 | `locket_r2_sim (5).html` | HL 34.2, service plugs |
| 2026-08-20 16:57 to 23:48 | `(6)` to `(9)` | HL 39.2, closed 55.2: the "R5 +5 mm lid" step; wrench and gear plugs, holster |
| 2026-08-21 00:57 | `locket_r2_sim (10).html` = harvest | canonical rev K: CONFIG panel, v35 and v40 precomputed variants |

No LOCKET later than this exists in Downloads (dl-cases.md section 4).

### 1.2 Why this revision

R2 rev K is the newest and the finished design: one body prints open and flat with the hinge in place, all 13 shipped STLs pass edge pairing with zero bad edges (body black 12,740 tris, 110,136 mm3, measured in benches-cases.md), the build's own fold sweep and watertight checks run every build, and the sim switches screens live with no errors (measured). The early friction hinge deck is kept in `EF` because its adjustable clamp hinge is a mechanism no other design in the corpus has; it is described in section 5.9.

### 1.3 What is in `files/`

| path | what |
|---|---|
| `locket_r2_sim.html`, `preview.png` | rev K sim and the owner preview image |
| `src/` | `build.py` (1394 lines), `export.py`, `simdata.py`, `gen_sim.py`, `run.sh`, `fa_icons.json` |
| `README.md`, `print-card.txt` | owner README and the rev J print card |
| `locket_config.json`, `alt_config.json` | default config (MPI3501, Rii 518BT) and the DEVECO field deck variant (MHS40, custom 112 x 62 x 12.5 keyboard) |
| `locket-r2.3mf`, `locket-r2-generic.3mf` | exports |
| `stl/` | `body_black`, `fp_black`, `hol_black`, `plugw_black` (representative per colour STLs) |
| `owner-saves/` | the `3d/locket` slicer save |
| `early-friction-hinge/` | `locket.scad`, `params.scad`, `components.scad`, README, the early sim `locket.html`, `base_frame.stl`, `lid_frame.stl` |

Not copied: the GLB, the remaining STLs, the vendored three.min.js. Hashes: `fab-knowledge:originals/locket/SHA256SUMS`.

---

## 2. What it makes and for whom

A pocket cyberdeck for a Pi Zero, a GPIO SPI touchscreen (MPI3501 family), a PiSugar 3 and a Rii 518BT keyboard, that prints as one flat body with the hinge in place and assembles with no tools: "keyboard into the bay . screen into the faceplate collar until it clicks . zero+pisugar sandwich onto the screen socket . faceplate into the lid . plugs into the ports . deck into the holster" (print card). For a maker who wants a deck that closes, fits the parts they bought, and regenerates from one config file.

Derived dimensions at the default config (BP 100 to 124):

```
W   = max(120, round((KB_W + 11.5)/2) 2, round((SCR_W + 24)/2) 2) = 120
D   = max(70, round((KB_D + 11.8)/2) 2) = 70
H_B = max(16, TF 2.4 + 2.5 + KB_H 10.2 + 0.9) = 16.0
stack: PiSugar on the lid floor 2.4 + 11.0 -> Zero at 13.4; screen pcb at 13.4 + 1.4 + 11.0 = 25.8; glass top 25.8 + 1.6 + 3.6 = 31.0
H_L = 31.0 + foam 0.4 + faceplate 2.4 + headroom 5.4 = 39.2
closed 120 x 70 x 55.2; hinge gap 9.0; Y_AX = D + 4.5 = 74.5; Z_AX = (H_B + H_L)/2 = 27.6; lid y 79 to 149
```

Five objects (print card): body (black, white, pink; whole case flat, hinge in place), faceplate (face down, collar fingers up), port plug wrench, port plug gear (flange down), belt holster (plate down).

---

## 3. Shots

Driven headless on 2026-10-05 (1280 x 860). Copies in `fab-knowledge:originals/locket/shots/`.

| file | caption |
|---|---|
| `k01-r2-open-105.png` | R2 open at 105 deg: the lid with the faceplate's pink window ring and the screen texture, LOCKET R2 on the chin, the seven knuckle hinge, the keyboard in its bay, the latch tab with pink chevrons at the front, the gear plug in the lid's side port. Panel: VIEW (OPEN, CLOSED, PRINT PLATE), POSE (lid angle, explode), PARTS toggles, CONFIG (screen, keyboard, three colour slots with names, lid mark, five text fields, glyphs). |
| `k02-r2-half-open-60.png` | Lid at 60 deg from the same front camera: the faceplate, its pink window ring and the screen seen past the lid rim, the V score lines on the lid side, the wrench plug in the lid's side port, and the lid arms over the hinge. The outside face of the lid is not in view at this pose (looked at 2026-10-05). |
| `k03-r2-closed.png` | Closed: the hack.build mark and HACK.BUILD wordmark inlaid in the lid top, corner facets, score lines, the latch tab over the seam. |
| `k04-r2-print-plate.png` | PRINT PLATE: the body open and flat (base and lid side by side across the hinge), the faceplate face down with its collar, the two plugs flange down. The default camera crops the body at the right edge of the stage. |
| `k05-r2-config-mhs40.png` | Screen switched to the 4.0in MHS40 variant: the larger window and faceplate rebuilt live from the precomputed v40 geometry. |
| `k06-early-friction-hinge-sim.png` | The early LOCKET sim (dark teal theme): the deck folded open with the Rii keyboard ghost, the screw clamped knuckles, MODE assembly or build plate, FOLD closed, deck, flat, standard or deep lid, part and ghost toggles. |

---

## 4. Build pipeline and code map

`src/run.sh [config.json]` runs `build.py` (geometry and QA), `export.py` (executes `build.py` up to the QA marker, then print transforms, per colour STLs, the Orca 3MF, the lib3mf generic 3MF with base materials, the GLB), `simdata.py` (packs two variants, v35 and v40, as base64 float32 vertices and uint32 indices with print matrices and component boxes), `gen_sim.py` (writes the sim HTML with the CONFIG panel). `build.py` grows by redefinition: R2 functions, then `# R3` (styling, knockout ports, thicker pins), `# R4` (strength pass, integral keyboard pocket), `# R5` (+5 mm lid, gutted lid furniture, faceplate collar, Font Awesome icon plugs, holster), each rebuilding the parts; the last definition of each function is the one that runs.

| BP lines | contents |
|---|---|
| 22 to 69 | `SCREENS` (mpi3501, mhs40, custom), `KEYBOARDS` (rii_518bt, custom), `CONFIG`, config merge from the JSON |
| 71 to 124 | `P` parameters and the derived W, D, H_B, H_L, stack heights, Y_AX, Z_AX, LID0, LID1, LIDC |
| 127 to 245 | 2D art: `poly_to_rings`, `shp_cs` (orients polygons CCW before building a CrossSection), `rings_evenodd`, `svgpath_region`, `hb_mark`, `text_region`, `wordmark` |
| 248 to 300 | solids: `rbox(x0, y0, z0, x1, y1, z1)`, `prism_along_x`, `cyl_x`, `teardrop_x`, `shell` |
| 355 to 374 | `latch_parts` |
| 423 to 442 | `lip_parts` |
| 484 to 501 | `pocket_and_inlay`, `merge_inl` |
| 711 to 720 | `mrot_lid`, `to_tm` |
| 726 to 779 | R3 parameters and the final `hinge_parts` |
| 781 to 905 | `corner_facets`, `rim_bottom_chamfers`, `score_lines`, `open_ports`, `build_plug`, `glyph_block` |
| 974 to 1035 | R4: `base_pocket`, `hinge_rail`, `lid_crenellation`, `art_mark`, `art_text` |
| 1038 to 1087 | R4 `build_body` (the one that runs) |
| 1122 to 1315 | R5: `fa_region`, `lid_furniture` (gutted), `build_faceplate` (collar), `build_plug_icon`, `build_holster` |
| 1317 to 1347 | R5 rebuild into `PARTS` |
| 1349 to 1391 | QA: fold sweep, faceplate vs lid, keyboard vs closed lid, parts sum vs union, watertight |

---

## 5. Mechanisms, circuits and constructions

### 5.1 The print in place hinge: parity swap and one anchored rod

What it does: joins base and lid along the back edge while both print open and flat in one object; one firm fold frees it.

Constants (R3, BP 726): `HINGE_N 7, HINGE_SPAN 96.0, HINGE_GAP 9.0, KN_R 5.2, PIN_R 2.6, PIN_CLR 0.6, AX_CLR 0.6`. Knuckle width `(96 - 6 x 0.6)/7 = 13.2` (computed).

Construction (`hinge_parts`, BP 734 to 779):

1. Even indices (four) are lid knuckles and own both ends; odd (three) are base knuckles with the bore. This is the parity swap: the lid owns both ends so the rod can be anchored in all four lid knuckles.
2. Knuckle: a cylinder of `KN_R` on the axis with 0.8 frustum chamfers at both ends (`knuck`).
3. Base bore: `teardrop_x(PR + PC, roof 0.6, keel 0.8)`, a circle with a 45 deg roof apex and keel apex, plus 0.6 flared mouths at both ends (`bore`); cut 0.7 past each base knuckle end.
4. Arms: a web from each half's back wall to its knuckles (`prism_along_x` profiles in y, z).
5. Rod: one cylinder of `PIN_R` from the first lid knuckle to the last, embedded in all four lid knuckles and bridging every base bore, with flats 0.15 deep top and bottom ("removal only"): "one continuous rod, embedded in all four lid knuckles, bridging every base bore anchored at both ends" (BP 766 to 767).
6. Clearances: a channel of `KN_R + 0.7` along the whole span so knuckles never touch the opposite wall; for each knuckle a clearance arc of `KN_R + 3.9` cut into the opposite half's wall for its sweep; 45 deg chamfers 3.4 on the gap facing top corners of both back walls.
7. R4 additions (BP 991 to 1006): a hinge rail tying the base knuckle arms and back wall into one beam, held at `z <= 15.8` "so it never meets the folded lid rim"; lid crenellation notches replacing the 0.6 mm slivers the clearance arcs left in the lid hinge wall.

Fit and print (print card): "0.60 mm = 2.5 layers minimum gap in every layer band. continuous rod anchored in all four lid knuckles, every bore crossing bridged both ends, flats top and bottom. one firm fold frees it." No brim on the body. KNUCKLE later took these numbers as its defaults (README there: "the values that freed cleanly on the LOCKET and GUDGEON hinges").

Closed map: the lid rotates about `(Y_AX, Z_AX)` by 180 deg (`mrot_lid`), so a base point y maps to the lid point `2 Y_AX - y` and a base z to `(H_B + H_L) - z`; every feature that must meet across the fold (latch window, lip groove) is placed through this map.

### 5.2 The nub latch

`latch_parts` (BP 355 to 374): a blade 16 wide, 2.0 thick, 0.6 off the base front wall, rising to `H_B + 8`; a root block; a nub 2.6 tall, 1.6 proud, with cam chamfers on both faces, at `H_B + 2.5`; a pull lip at the top. The window through the lid front wall (12.6 x 3.5 after R3) is placed through the closed map: `win_lo = (H_B + H_L) - (nz0c + NUB_H) - 0.6`. Pink chevrons (two stacked) inlay 0.8 deep on the tab's outer face.

### 5.3 Alignment lip and groove

`lip_parts` (BP 423 to 442): a 1.4 x 1.6 lip on the base rim along the front and sides, stopping short of the hinge sweep at y 60, with a gap for the latch; the groove is the lip footprint buffered by 0.35 and mapped across the fold by `y' = 2 Y_AX - y` into the lid rim, 2.6 deep.

### 5.4 The faceplate collar (finger snap around the screen pcb)

What it does: holds the screen in the faceplate by its pcb edges so the whole electronics stack hangs from the faceplate and the lid interior stays open.

Construction (R5 `build_faceplate`, BP 1149 to 1218): plate `W - 2 TW - 0.7` by the lid interior, `FP_T` 2.4 thick, window = active area + 1.2 rounded; collar: a 1.2 wall (`ct`) wrapping the screen pcb with `give` 0.35 per side, from the plate down to `tip = STK_SCRPCB0 - 0.6`; open corners (6 mm slots, `cw`), two relief slots per long side at `plus or minus pw/6` and one per short side, giving ten fingers (three per long side, two per short side); triangular wedges 0.8 proud spanning `pcb - 0.55` to `pcb + 0.45` on the fingers. Print card: "push the screen in from behind: the pcb cams the finger wedges out about 0.8 mm (about 1 percent strain), then the wedges snap under the pcb and hold it sprung. audited: grip interference sits only at the pcb bottom edges, the glass never touches, and the window ring clears the active area." CANONS `snap-finger-collar`.

Faceplate snaps: four fingers 1.8 thick, 8 long, with 1.5 nubs into 9 x 3.2 wall slots at `LIDC plus or minus 22`; pry notches r 3.5 at the front edge. Faceplate inlays: a pink ring round the window 1.0 deep, chin text in white. Fit in the lid 0.35 per side. Prints face down (flipped 180 about X and dropped, `export.py` `mat_flip_fp`).

### 5.5 Press fit port plugs with crush ribs

Service ports (`open_ports`, BP 833 to 857): rounded 32 x 17.5 knockout openings through both lid side walls (`KO` y 86 to 118, z 3.5 to 21), with pink L corner brackets.

Plug (`build_plug_icon`, BP 1220 to 1254): body = hole inset 0.25; eight crush ribs 0.4 wide that interfere 0.05 to 0.06 (top, bottom and end ribs clipped to the hole buffered 0.06); a 0.8 lead in nose inset 0.85; a flange 2.6 out, 2.0 thick; two nail tabs relieved 0.6; a Font Awesome wrench or gear icon 11.5 tall inlaid 0.8 in pink on the flange. "either plug fits either side. scale 99.5 or 100.5 percent to tune" (print card). Prints flange down. CANONS `snap-press-plug-ribs`.

### 5.6 The belt holster with spring tabs into a score groove

`build_holster` (BP 1256 to 1315): plate 127 x 69 x 3.2; side walls 3 x 20 x 64; spring tabs freed by 2 mm slots at y 20 and 38 and thinned to 2.0; a triangular ridge 0.55 proud at z 11 to 12 that clicks into the deck's lower score groove (score lines are 0.6 deep V grooves at z 5 and 11 on the base, `score_lines`, BP 813 to 831); belt slots 48 x 7 at y 34 and 48 (belts up to 45 wide); 2.4 entry chamfers at the top of the walls; wordmark and chevron inlays. "audited zero interference at rest, ridges engage the groove on both sides" (print card). CANONS `snap-holster-tab`.

### 5.7 Integral keyboard bay and styling

R4 `base_pocket` (BP 974 to 989): a shoulder block filling the base with the keyboard pocket `KB + 1.2` cut down to a pedestal at 4.9, a front finger scallop r 8, and the left notch for the Rii power switch and charge port continued through it. Styling (R3): 2.5 mm 45 deg facets on all eight vertical corners, 0.8 chamfers on the top and bottom arrises, V score lines (base z 5 and 11, lid z 8 and 26), pink cargo ticks and a hazard triangle, and a hidden wordmark on the pedestal under the keyboard (`bay_text`).

### 5.8 Art as flush inlays

The hack.build mark from verbatim favicon paths (arc translated (490, 121), wrench (498, 314)) through svgpathtools to shapely with even-odd containment parity (`rings_evenodd`, BP 150 to 167); the wordmark "hack" white and ".build" pink in Permanent Marker via matplotlib TextPath with a gap of 0.14 x size "so the period reads" (BP 227 to 242); regions snapped with `set_precision(0.02)` after `simplify(0.08)`; bed faces mirrored in X; depths 1.2 (lid top and underside), 1.0 (faceplate), 0.8 (plug icons, chevrons). Inlay solids are subtracted from the body and kept as separate parts per slot, then split into base and lid by a y region (`split_by_region`, BP 967 to 969). A user SVG can replace the lid mark (`svg:<file>`).

### 5.9 The early LOCKET friction clamp hinge (EF)

From `EF/README.md`, `EF/params.scad` and benches-cases.md section 6:

| item | value |
|---|---|
| layout | four knuckles on a 3.3 bore; base outer pair x [-47, -31] and [31, 47], lid inner pair [-30.5, -9] and [9, 30.5]; barrel 9.6; axis `D/2 + barrel/2 + 0.8` behind the rear wall (44.6); knuckle gap 0.5 |
| clamp | two M3 x 35 socket heads entering from each outer knuckle into 3 mm counterbores (teardrop roofed seats), nylocs in hex pockets (5.8 across flats, 4.2 deep) at the centre gap, nylon collar out |
| friction | raised 0.45 mm pad rings (8.6 OD, 4.8 ID) on each lid knuckle face as the only rubbing contacts; half a millimetre of daylight elsewhere "so the drag is set by those pads and stays smooth instead of stick-slipping" |
| torque | lid about 165 g with its centre of mass about 43 mm off the axis, about 0.07 Nm worst case, held at under 20 N of screw tension (README); "snug until the lid just holds horizontal, then an eighth turn more"; PLA creep relaxes it, PETG creeps less |
| plan B | a 3 mm rod cut to 96 with glued `pin_cap`s, free swinging |
| magnets | four 3 x 1 discs in 3.4 x 1.2 pockets (2.2 deep for 3 x 2 discs) flanking the thumb scallop |
| bores | teardrop along X (`xbore`: circle plus a triangle apex 0.72 d) so horizontal bores print without support |
| ports | gills 14 x 9.5 and 25.6 x 9.5 with 45 deg chamfered low corners so the bridge prints on the flipped lid; a 12.4 hole for an M12 panel mount USB C pigtail with a rebate filler tab and a bottom plate notch "so the nut lands on a flat continuous seat" |
| provenance | Rii 518BT 108.5 x 58.2 x 10.2 VERIFIED from the manufacturer drawing; screen glass stack 4.5 and active offset ASSUMED; "The classic MT3608 does not fit this floor plan, that was a lie in an earlier revision of this file" |

The early sim (`EF/locket.html`) loads three 0.164.1 from esm.sh (not offline); measured 0 errors on 2026-10-05.

### 5.10 Details the first pass left out (checker, 2026-10-05)

Read from `BP` at the lines named; behaviour inferred from the code unless marked.

| item | BP lines | how it is made |
|---|---|---|
| collar wedge count | 1184 to 1196 | the ten collar fingers carry eight wedges: two 10 mm wedges on each short side at `LIDC plus or minus pd/4 - 5`, and two on each long side at `plus or minus pw/4 - 5`; the middle finger of each long side (between the relief slots at `plus or minus pw/6`) has none. Each wedge is the triangle `(edge, pcb - 0.55)`, `(edge + 0.8, pcb - 0.05)`, `(edge, pcb + 0.45)`, so its peak sits 0.05 below the screen pcb underside |
| collar slot depth | 1168 to 1182 | corner and relief slots run from `tip - 1.0` up to `z0 - 1.8`, so every finger stays joined to the plate by a 1.8 band below the faceplate and flexes from there |
| faceplate snap fingers | 1197 to 1203, 408 to 411 | per side two fingers 1.8 thick and 8 long at `LIDC plus or minus 22`, hanging from the faceplate to `H_L - 8.4`; each carries a nub 1.5 proud, 7.2 long, from `H_L - 8.1` to `H_L - 5.9`; the lid wall slots are 9 long from `H_L - 8.6` to `H_L - 5.4`, so the nub has 0.5 of play above and below and 0.9 at each end (computed) |
| plug rib layout | 1229 to 1235 | four ribs across the top and bottom edges at `yc plus or minus 8`, four across the ends at `zc plus or minus 3`; each rib is 0.4 wide and is clipped to the hole outline grown by 0.06, so it stands 0.31 proud of the 0.25 inset body and interferes 0.06 with the port (computed) |
| nail tabs | 1246 to 1248 | two 3.4 x 8.4 tabs at the plug ends on the flange's outer face, starting 0.6 off the wall so a nail gets under them |
| holster stop | 1268 | a full height end wall across the plate at y -3 to 0 is the stop the deck slides against |
| holster ridge height | 1278 to 1281, 825 to 827 | the ridge spans z 11 to 12 with its peak at 11.5; the base V groove it clicks into is centred at z 11.0 and spans 10.4 to 11.6. If the deck sits on the holster plate at z 0, the peak lands 0.5 above the groove root (computed; the print card's "ridges engage the groove on both sides" is the owner's audit, not rerun here) |
| dead code in the holster | 1282 to 1285 | the "wall top chamfers + plate foot chamfer" loop subtracts an empty `Manifold()` (`... if False else Manifold()`), so no foot chamfer is cut; the only chamfer is the entry chamfer that follows |
| nub width | 362 to 365 | the latch nub spans `WIN_W - 1.6` (11.0) of the 12.6 window, 0.8 clear each side |
| QA verdicts | 1352 to 1391 | the fold sweep, faceplate, keyboard and parts sum checks print volumes and the worst fold angle; nothing asserts, so a build with interference still writes every export |

---

## 6. UX anatomy (the rev K sim)

| element | content |
|---|---|
| header | hack.build mark, `LOCKET R2`, "folding pi deck . prints flat . no screws" |
| VIEW | OPEN (105 deg), CLOSED, PRINT PLATE |
| POSE | lid angle 0 to 180, explode |
| PARTS | body, inlays, port plugs, belt holster, faceplate, keyboard, PiSugar 3, Pi Zero, screen, edge lines, ghost body |
| CONFIG | screen select switching between the precomputed v35 and v40 geometry live; keyboard select; three colour pickers with editable names; lid mark; five text fields; glyphs; EXPORT CONFIG downloads `locket_config.json` |
| HUD | dims and stack readout |
| stage | paper background, a terminal texture on the screen ghost |

Colours and screen switching preview live; text, custom dims and SVG marks need a rebuild with `run.sh`. What makes it excellent: one config regenerates geometry, both 3MFs, STLs, GLB and sim; every part assembles without tools; every snap is audited for where it grips.

---

## 7. Tests and harness

QA in `build.py` (BP 1349 to 1391), run every build:

| check | rule |
|---|---|
| fold sweep | intersection volume of the rotated lid (all lid parts) with the base at 0, 15, 30, ... 165, 175, 180 deg (14 angles), worst reported |
| faceplate vs lid | intersection volume |
| keyboard vs closed lid | the keyboard box against the lid plus faceplate rotated 180 |
| parts sum vs union | body colour parts summed against their union |
| watertight | per part trimesh `is_watertight` |

The README also names a single shell check and a hinge layer band gap audit; neither is in the harvested `build.py` (benches-cases.md). The plan's QA list (fold sweep at 5 deg steps, keeled pins bind, CW polygons poisoning unions) is partly visible: `shp_cs` orients polygons CCW before building a CrossSection (BP 137 to 145), and `rbox` takes `(x0, y0, z0, x1, y1, z1)`.

Exports (`export.py`): Orca 3MF with five component objects, part names like `base_black`, extruder per part, `project_settings.config` with only 8 keys (`filament_colour`, `filament_type`, `filament_settings_id`, `nozzle_diameter`, printer `Flashforge Creator 5`, bed type, version), vertices at 6 decimals; a lib3mf generic 3MF with a base material group; a GLB with face colours; per colour STLs in print pose. Flash Studio filled the owner's save to 127 per filament arrays and came back on the owner's system preset names (dl-cases.md section 3).

---

## 8. How to make a new thing this way

1. Derive the whole case from the bought parts' dimensions in one config; let width, depth and both heights follow.
2. Print both halves open and flat with the hinge between them; give the lid both end knuckles and one continuous rod anchored in all of them; keep 0.60 (2.5 layers) of gap in every layer band.
3. Place every feature that meets across the fold through the closed map.
4. Hold bought boards with finger collars that grip only the pcb edges; audit where the interference lands.
5. Use crush ribs and a lead in nose for press fit plugs, and spring tabs that click into a score line already on the case.
6. Run a fold sweep and a parts sum check on every build.

---

## 9. Port map

| item | value |
|---|---|
| packages | `mesh` (manifold3d and shapely route; BRep import at M14), `hackbuild-3mf` (8 key Orca dialect and a generic lib3mf 3MF), `catalog` (MPI3501, MHS40, Rii 518BT, Pi Zero, PiSugar 3), `inlay` |
| feature kinds | hinge (knuckles, parity, continuous rod), latch, snap (collar fingers, faceplate fingers, holster tabs), pocket (inlays, keyboard bay), tabslot (plug in port), per `fab-knowledge:synthesis/mappings.md` lines 94 and 95 |
| canon id | `snap-finger-collar`, `snap-holster-tab`, `snap-press-plug-ribs` (`docs/plan/CANONS.md` section 2.2, candidates until a snap kind reference). MISSING: the print in place knuckle hinge with continuous rod has no id (section 8.3, lands as the `hinge` kind at M10); the nub latch through the closed map; the friction clamp hinge (section 2.2 note: "R46 also names a friction clamp hinge ... wait for a design that needs them") |
| reference id | `joints/pin-hinge-inplace` (INDEX, from LOCKET R2; superseded by `joints/knuckle-hinge` per the M11 table); `snaps/collar-fingers`, `fits/press-plug-ribs`, `snaps/holster-tab` (proposed, `synthesis/mappings.md` line 95); `brep/locket-step` and `brep/locket-lid-dome` (M14-T03, M14-T07). None exists under `reference/` on 2026-10-05 (MISSING) |
| milestone | M14 (M14-T03 the LOCKET body as STEP from `stl/body_black.stl`; M14-T07 the STYLUS dome on the LOCKET lid); the owner save is in the M00 owner save corpus row |
| lineage rows | MISSING: no row in `lineage.json` for `build.py` (hinge_parts, build_faceplate, build_plug_icon, build_holster) or the early SCAD; M14-T03 plans `designs/locket/legacy/LINEAGE.md` |
