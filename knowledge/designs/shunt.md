# SHUNT: how it is made

Record written 2026-10-05 from the original code. Slug `shunt`. A deliberately non-functional art PCB for KevinCon 2026 whose fab set is real, which makes it the most complete PCB fabrication and viewer pipeline in the corpus.

Number rules for this file. A number in a code table is a declared value from the file and line named. "Gate output" and "proof output" mean the generator, checker and harness output recorded in `F/README.md` and `F/REVIEW.md`. "Measured" means the headless drive of 2026-10-05 (Chrome with swiftshader WebGL, puppeteer-core, 1280 x 860). "Computed" means a calculation shown here. "Inferred" means a reading of the code. The Python and node harnesses were not rerun for this record (`build_sim.py` needs board-forge `wrl.py` and `three.min.js`, neither in the folder).

Short paths: `F` is `fab-knowledge:originals/shunt/files/`. `GEN` is `F/gen_board.py`. `FAB` is `F/gen_fab.py`. `BS` is `F/build_sim.py`. `SIM` is `F/sim.html`.

---

## 1. Identity and revision

| field | value |
|---|---|
| name | SHUNT R1, the KevinCon counterfeit Jumperless |
| owner's slug | shunt |
| canonical files | `GEN` (geometry and gates), `FAB` (fab set), `BS` (viewer); every hash in `fab-knowledge:originals/shunt/SHA256SUMS` |
| viewer | `SIM`, sha256 14a920023e795562eb4c49d005a4704508b1ac8b9cf28b13da555d99e6297fb6, 1224244 bytes, three.js r128 inlined |
| date | fab set 2026-08-11 02:56 (`~/Downloads/files (54).zip`, members stamped 2026-08-11 09:56 UTC); `shunt-r1-gerbers.zip` in Downloads 2026-08-11 02:56 |
| board | 154.0 x 110.0 mm, r 3.0, 2 layer, 1.6 mm, ENIG, purple mask `#4E324E`, white silk (`GEN` lines 19 to 27) |
| parts | 28 (27 front, 1 back), 3 parametric stand-ins (gate output) |

### 1.1 Every revision found

| where | file | date | role |
|---|---|---|---|
| `~/Downloads/sim (5).html` | SHUNT R1 viewer, 1207887 bytes | 2026-08-10 22:26 | earlier: no `fitDist`, no mobile panel |
| `~/Downloads/sim (6).html` | 1204147 bytes | 2026-08-10 22:41 | earlier, same |
| `~/Downloads/sim (7).html` | 1224841 bytes, sha256 a4571b2a... | 2026-08-10 23:00 | after the mobile pass; its markup and script equal the harvest viewer outside the inlined data line, and its data predates the fab-set fixes |
| `~/Downloads/files (54).zip` | gerber zip, previews, UV art, CPL, BOM, README, REVIEW | 2026-08-11 02:56 | fab-set delivery; README byte identical to the harvest |
| harvest `fab-work-directory:benches/shunt/outputs/shunt-r1/` | 73 files | after 2026-08-11 | canonical: newest viewer data, full source and harnesses |

Uploads: three screenshots from 2026-08-10 22:25 (`F/uploads/`); the 22:25:50 shot shows JUMPERLESS rendered reversed, which started the mirror fixes (section 6).

### 1.2 Why this revision

The harvest is the newest and the good one: its viewer carries the post-fab data (G2c fix in place), every proof in the README passes, and the drive shows zero page errors (measured). The earlier sims are superseded steps of the same build.

### 1.3 What is in `files/` and what was left out

All 73 harvest files except: `parts/*.wrl` (10 KiCad `packages3D` models, vendor blobs; paths in the harvest `parts/`) and `shunt-r1-gerbers.zip` (sha256 8baf71c5a961dce7f22258dd286b3655f3896e09a8e7776d1ba43a64cb2c4905; the same gerbers and drills as `F/fab/`). Kept: generators, checkers, harnesses, `board.json`, `fab/` (9 gerbers, 2 Excellon, CPL, UV and preview SVGs), renders, `fonts/` (5 woff2 needed by `textpoly.py`), `parts/*.kicad_mod`, README, REVIEW, BOM.

---

## 2. What it makes and for whom

A parody of the Jumperless V5: a real 400 point half-size breadboard foam-taped to a PCB at 3.5 deg off square, with silkscreen making product claims the copper refutes (README table: an empty DIP-8 as a "128-core RP9350B-XXL", one SOIC-16 555 as "CH446Q x12", six red LEDs behind 1 Gohm as "445 RGB LEDs", a 32.768 kHz crystal as "2.4 GHz", 30 Nano pins on one net, a shorted CR2032 as "+-8V x4 supplies"). For a con badge that has to survive inspection by people who build boards, so the fab set, the silk type and the 3D viewer must be real. Do not apply power.

---

## 3. Shots

Driven headless 2026-10-05 from `SIM` with swiftshader WebGL; zero page errors (measured). The viewer calls `select(ref)` from page scope, which the driver used for the inspector shots. Files in `fab-knowledge:originals/shunt/shots/`.

| file | caption |
|---|---|
| `u01-iso-default.png` | ISO at load: purple board, breadboard on its tape, real KiCad models (DIP socket, SOIC, LEDs, headers, crystal, TO-92, tact switch) and stand-ins (EC11 knob, TRS jack), graffiti art layer. Rail: CAMERA (RESET ISO TOP BACK, USB EDGE, NANO EDGE), PEEL BB1, LIFT PARTS, SHOW toggles, INSPECTOR, pink defect banner listing the five intentional shorts. Footer hint. |
| `u02-top-peel-bb1-hidden-silk.png` | TOP with PEEL BB1 at 60: the breadboard lifts and tilts off the tape; the hidden silk under it starts to show ("NO MATRIX. NO LEDS. JUST ONE SPIRAL TRACE."). |
| `u03-back-preset-readable.png` | BACK preset (azimuth PI): back silk reads correctly, "DEFCON 2028 OFFICIAL SHAREHOLDER BADGE", compliance list, fake barcode and data matrix, the CR2032 holder, lanyard slot top centre, green graffiti band. |
| `u04-lift-parts-inspector-u1.png` | LIFT PARTS 20 with U1 selected: parts float above the board on their leads; inspector shows ref in marker type, value, the note, MODEL (KiCad .wrl), PACKAGE, ACTUAL PART none, PADS 8. |
| `u05-net-filter-nano.png` | J3 selected, NANO net chip clicked: both headers tinted; footer reads "net NANO, J3 J4". |
| `u06-usb-edge.png` | USB EDGE preset (azimuth -PI/2 + 0.001, elevation 1.35), looking at the edge J1 sits on. |

---

## 4. Mechanisms, circuits and constructions

### 4.1 Architecture and data flow

```
GEN --gates--> board.json --+--> FAB --> fab/*.gbr *.drl CPL UV previews zip
 (parts, pads, copper, vias,|        \--> check_fab.py (gerbonara reparse)
  slots, silk, art, nets)   |        \--> render_fab.py (picture of PARSED data)
                            +--> BS + parts/*.wrl --> sim.html
                                     \--> check3d_shunt, smoke, smoke_mobile, render_faces, probe
                                     \--> view_preset.py (texture warp per preset)
```

Everything downstream reads `board.json` (168 KB); nothing reads the generator. The 1:1 SVGs and the viewer faces paint from the same data.

### 4.2 Footprint pads and the placement transform

`PAD_RE` over `.kicad_mod` (`GEN` lines 39 to 42); `footprint_pads` raises if no pad parses (lines 45 to 58). `place(px, py, rot, fx, fy)` (lines 69 to 80):

```
r = rot in radians, c = cos r, s = sin r
board = (px + fx*c + fy*s,  py + fx*s - fy*c)        # p + R(rot) * (fx, -fy)
```

`part()` (lines 90 to 112) swaps body and pad w/h when `rot % 180`, stores the body centre from a footprint-local body centre `bc` (KiCad origins sit on pad 1 for headers and sockets). The docstring in `place` still describes the pre-fix sign; the math is the one the lead check proves.

### 4.3 Copper art, vias, pads

Helpers (lines 218 to 248): `ring_rect`; `trace(side, pts, w)` emits one rectangle ring per segment with square caps (`ex, ey = d/L * w/2`), so polyline joins are overlapping rectangles; `spiral(cx, cy, r0, r1, turns, w)` with `turns * 36` points and a linear radius ramp. Features (lines 251 to 304): the single spiral under BB1 (4 turns, r 1.5 to 20, w 0.6), a VBUS trace that runs to the rout line and stops, the P8V and N8V traces joined by a +-8V bar (the rail short), a closed ring, the six LED chain, the NANO comb tying 30 pins, the DELTA+ copper block with a meander, 36 isolated crosspoint squares, a decorative GND pour, and on the back a 28 bar barcode and an 81 cell pseudo data matrix. Gold: every real pad, a 40 x 6 sponsor bar at (116, 99), three TP pads; 24 vias d 0.8, drill 0.4, in two rows at y 104.8 and 107.8 (lines 306 to 317).

### 4.4 Silkscreen and the graffiti layer

`silk(side, x, y, text, size, font, align, weight, rot, hidden)` (lines 323 to 326); 45 front strings, 5 hidden under BB1 at 3.5 deg, 21 back (README, REVIEW). Faces: Permanent Marker, Special Elite, IBM Plex Mono 400/600/700. Graffiti (lines 417 to 467) is a UV print art layer, never silkscreen: `splat` (18 point radial blob with a seeded radius), `band`, `drip`, `tag`, six neon colours.

### 4.5 Geometry gates (refuse to write)

Helpers: `ADV` estimate and the exact `_width` from `textpoly` when the fonts exist (lines 475 to 486); `silk_box` with `SILK_GAP` 0.2 per side (lines 489 to 498); `outline_pts(inset)` four quarter arcs of 9 points (lines 501 to 510); `inside(x, y, m)` (lines 513 to 523); `obb` and `sat_overlap` separating axis on both polygons' edge normals (lines 526 to 549).

| gate | rule | lines | failure that made it |
|---|---|---|---|
| G1 | every body corner, pad (0.5), via (0.4) and breadboard corner inside the rounded outline; copper leaving it is a WARN | 552 to 575 | |
| G2 | pads outside `MOUNT_R + 1.2` of each M3 mount; bodies clear of a 2 (MOUNT_R + 1.2) square | 577 to 588 | |
| G2b | lanyard slot corners 0.8 inside the outline; 1.0 keepout clear of pads, bodies, vias; silk clear of the slot grown 0.3 | 590 to 622 | |
| G2c | back copper ring bbox clear of every THT pad grown 0.2 | 624 to 641 | the data matrix sat under the Nano header bottom rings, seen only in the gerber render |
| G3 | body OBB vs body OBB per side | 643 to 652 | |
| G4 | no top body under the breadboard OBB (1.2 mm tape clears nothing) | 654 to 661 | |
| G5 | hidden silk must be under BB1; visible silk under it is a WARN | 663 to 673 | |
| G5b | silk vs silk with 0.4 total gap (same hidden class); silk over pad is a WARN | 675 to 693 | estimated widths 15 percent narrow on the marker face hid three real collisions |
| G6 | `outline_pts(0)` deterministic, every layer from one outline function | 695 to 697 | |
| G7 | inverted: exactly 5 shorts, 5 floating nets, 0 populated sockets, 1 correct dimension. Only the floating count is derived from data (nets named VIBES, MAGIC, GND?, PROBE, MATRIX, NC that some part carries); `shorts` is the length of a hand-typed `SHORTS` list and `populated_sockets` and `correct_dimensions` are literals 0 and 1, so those three can never drift (inferred from lines 705 to 714) | 699 to 718 | keeps the joke from drifting |

Electrical gates are deliberately not run. On failure: `sys.exit("gates failed: N. Nothing written.")` (line 748). Gate output: PASS, zero warnings.

### 4.6 Fab writer (`FAB`, reads only `board.json`)

| piece | what | `FAB` lines |
|---|---|---|
| `class Gerber` | `%FSLAX46Y46*%`, `%MOMM*%`, X2 `TF.FileFunction`, `TF.FilePolarity`, `TF.GenerationSoftware,hack.build,gen_fab.py,R1`, `TA.AperFunction,Other,art`; coordinates in integer nanometres `round(v * 1e6)`; aperture dedup keyed by `(kind, dims rounded 4)`, D codes from 10; regions `G36`/`G37` closed by repeating the first point; `%LPD%`/`%LPC%` polarity | 37 to 100 |
| `layer_pads(side)` | own side's pads plus every THT pad from the other side (a plated barrel needs a ring on both layers) | 103 to 109 |
| `pad_flash` | round pads and every THT pad as circles, SMD as rectangles | 112 to 119 |
| mask | pad +0.05 per side (`MASK_SWELL`), vias too | 32, 177 to 188 |
| paste | SMD only, -0.05 per side (`PASTE_SHRINK`), excluding GOLD and TP | 33, 190 to 202 |
| silk | `textpoly.text_polys` per string as filled regions: dark outer contours then clear counters; back glyphs mirrored in board space | 122 to 147, 204 to 209 |
| Edge_Cuts | outline as a 0.1 stroked closed path; slot as a rounded rectangle of 4 x 13 arc points | 211 to 227 |
| Excellon | `M48`, `METRIC,TZ`, `FMAT,2`, `G90`, `G05`, `M71` inside the header, tools `TnCd.ddd` sorted, `%`, hits `X%.3fY%.3f`, `T0`, `M30` | 231 to 266 |
| CPL | `Designator, Mid X, Mid Y, Rotation, Layer`; Mid is the body centre, not the footprint origin | 268 to 276 |
| UV art, previews, zip | `uv_svg` (graffiti print layer, not a gerber), `fab_svg` (preview from emitted polygons), `shunt-r1-gerbers.zip` | 278 to 400 |

Output (README): 9 gerbers, 83 PTH in 5 tools 0.40 / 0.80 / 0.90 / 1.00 / 1.10, 4 NPTH 3.20, 28 CPL rows.

### 4.7 Text to polygons (`F/textpoly.py`)

fontTools on woff2; a `BasePen` subclass flattens quadratic and cubic segments at `CURVE_STEPS = 8` (about 0.01 mm at 15 mm, line 30); hole detection by odd containment depth of each contour's first point (`_inside` ray cast, lines 117 to 128), because TrueType and CFF wind opposite ways; legacy `kern` table applied, GPOS kerning not (lines 51 to 58); vertical anchor at the canvas `middle` baseline from `hhea`; weights snap to the nearest shipped file. Mirror rule: `lx = dx0 + (width - adv if mirror else adv)`, so the ink box is identical on both faces and only the glyphs flip inside it (`text_polys`, lines 130 to 206).

### 4.8 Independent reparse (`F/check_fab.py`) and render (`F/render_fab.py`)

gerbonara reads everything back: all 9 gerbers and 2 drills parse inside the board (0.35 margin, 0.1 for Edge_Cuts); PTH count equals declared, every hole within 1 um in position and diameter (worst 0.0000 over 83); every pad flash on its own side's copper and mask within 0.01 and every THT pad on both sides; Edge_Cuts bbox equals the outline within 0.1, at least 8 contour points near the slot, 4 NPTH at the mounts; silk vertex sets in integer nanometres equal `textpoly(mirror=flag)` with zero missing and zero extra, and the opposite flag must not match 98 percent (front shares 2030 of 164453 vertices with its mirror, so the test can see a mirror); back silk ink box inside 0.3 of the board width. `render_fab.py` rasterises the parsed objects only at 10 px/mm, which is what found the missing bottom rings and the art under them.

### 4.9 Viewer construction and the face convention (`BS`)

| rule | what | `BS` lines |
|---|---|---|
| model z | negate every `.wrl` model z and swap triangle winding (`idx[i+1], idx[i+2]`) so model z = +footprint y with correct normals | 29 to 45 |
| draw calls | merge model meshes by colour (a 1x15 header arrives as 364 meshes); the breadboard hole grid (340 boxes) merged into one geometry; 428 visible meshes to 89, budget 150 | 46 to 73 |
| world map | board x to world X, board y to world -Z; shapes extruded +Z then `rotateX(-PI/2)`; parts at `(p.x, h, -p.y)`, `rotation.y = +rot` | 223 to 224, 610 to 616 |
| board stack | FR4 slab 0 to 1.6 `0x9a7d55`, mask slabs 0.03 both faces, face planes 0.02 off the mask (`FACE_GAP`) with `polygonOffset -4/-4` | 277, 484 to 495 |
| face textures | painted on canvas at `TEX_S = max(6, min(SMALL ? 12 : 20, floor(maxTextureSize / max(w,h))))` px/mm, `SMALL` under 760 px; `flipY = true` on both faces | 343 to 361, 484 |
| back face | same plane geometry, `THREE.BackSide`, no canvas-wide mirror; silk strings and art tags get a per-string `scale(-1,1)` and left/right swap | 361 onward, 493 |
| holes | mount holes and the slot cut in the slab (`Shape.holes`) and in the texture (`destination-out`) | |
| camera | `fitDist()` frames `max(h/2, (w/2)/aspect) * 1.18` for the current aspect, re-frames on rotation until the user zooms; fov 34, near/far 4/1400 | 242 to 245 |
| presets | iso [0.6, 1.0], top [0.001, 0.12], bottom [PI, 2.95], usb [-PI/2 + 0.001, 1.35], nano [0.001, 1.35] (azimuth, polar) | 839 to 843 |
| pointer map | 1 finger orbit, 2 finger pinch plus midpoint pan, right or middle drag pan; tap slop 12 px touch, 5 px mouse; 600 ms tap window; manual double tap at 320 ms and 34 px; a pointer ever in a two finger gesture cannot tap; wheel `camDist *= 1 + sign(deltaY) * 0.08` per event (0.92 in, 1.08 out), distance clamped 18 to 900 (`BS` line 827) | 736 onward |
| stand-ins | USB-C HRO TYPE-C-31-M-12 shell 9.0 x 3.2 x 7.3; CUI SJ1-3533NG 12.0 x 6.2 x 11.0 plus a 2.6 r bore; EC11E 12.4 x 7.0 x 13.4 plus a 3.0 r shaft and 8.0 r knob, each labelled "parametric stand-in" | |
| LEDs | emissive sphere r 2.5 at (1.27, 7.0, 0), on when `sin(3 t - 0.6 i) > 0.2` | `SIM` tick |

Rule written into the README: POSITION mirroring and GLYPH mirroring are independent; every board coordinate is the same on both faces, and only text-shaped things mirror per string on the back. The BACK preset has a right answer: from underneath, screen right is `(cos t, 0, -sin t)` and board +y projects to `-cos t`, so both need `cos t < 0`, azimuth PI.

### 4.10 Constructions the first pass left out

**Board constants with a reason (`GEN` lines 19 to 36).** The outline is 154.0 x 110.0 against the real Jumperless V5's 154.33 x 110.71 (`REAL_JL`, measured by the owner from its Edge_Cuts gerber), so being 0.33 mm short is itself a joke and the "1 correct dimension" in G7. Mask `#4E324E` and the highlight `#7A4F72` are measured off a V5 render and photo. Four M3 mounts at 5.0 mm from each corner, `MOUNT_R` 1.6 (the 3.20 NPTH). Lanyard slot at (77.0, 104.0), 14.0 x 3.5 with 1.75 ends, sized to clear a 12 mm flat lanyard hook and leave 4.25 mm of FR4 above it.

**The breadboard as a declared body (`GEN` lines 115 to 117).** `BB` is not a part with pads: 84.5 x 54.5 x 9.5 mm, centre (52.0, 60.0), rotated 3.5 deg, on 1.2 mm of foam tape. G1 checks its four corners against the outline with zero margin, G4 keeps every top body out from under it, G5 requires the five hidden silk strings to sit under it, and the viewer's PEEL BB1 lifts and tilts it to reveal them (u02).

**Part records carry the joke and the truth together (`GEN` `part()` calls from line 119).** Each part has the silkscreened value (`val`), the real part (`mpn`, for example "NE555 (relabelled)" for the "CH446Q x12" SOIC), a note, its nets, a zone and a `stand_in` flag. The inspector shows ACTUAL PART from `mpn` (u04 shows "none" for the empty DIP-8), and `BOM.csv` columns are ref, value as silkscreened, actual part, footprint, side, quantity, note (`GEN` lines 851 to 861), plus a hand row for BB1 "445-LED PROGRAMMABLE MATRIX".

**1:1 face SVGs (`svg_face`, `GEN` lines 770 to 843).** `shunt-front.svg` and `shunt-back.svg` paint mask, copper art in the mask highlight colour, UV art polygons and drips, pads and silk, clipped to the outline path. The back is drawn as seen from the back: every x goes through `MX(x) = W - x` and text anchors swap left and right while the glyphs keep their reading direction. The viewer follows the same position-versus-glyph rule (section 4.9); here it is applied to a 2D print.

**Font loading in the viewer.** `BS` line 82 links Google Fonts (IBM Plex Mono, Permanent Marker, Special Elite), so the inlined page is not fully offline; without the network the face textures and the header fall back to system fonts while the silk geometry itself is unaffected (the gerbers carry outlined polygons from `textpoly.py`).

---

## 5. UX anatomy

| region | content |
|---|---|
| header | ink bar, 3 px pink rule, `SHUNT R1` in Permanent Marker with pink R1, Special Elite sub "counterfeit programmable breadboard, KevinCon 2026" and tagline, CONTROLS button on mobile |
| stage | WebGL canvas, cream `#f5f0e6`, `touch-action:none` |
| rail (274 px, `#efe9db`) | CAMERA (RESET ISO TOP BACK, USB EDGE, NANO EDGE), PEEL BB1 0 to 60, LIFT PARTS 0 to 26, SHOW toggles (board, parts, breadboard, foam tape, graffiti, zone tint, 445-LED display), INSPECTOR card, pink defect banner |
| inspector | ref (marker, pink), value, note, MODEL (real `.wrl` or "parametric stand-in"), PACKAGE, ACTUAL PART, PADS, ORIGIN; net chips filter every part on that net |
| footer | interaction hint and net readout |
| mobile | portrait stacks the controls as a sheet behind CONTROLS; landscape keeps the panel; pixel ratio capped 1.75 on small screens; page zoom left enabled |

What makes it excellent: the joke depends on every claim being checkable, so every output is checked by an independent reader (gerbonara for the fab set, a re-derived transform for the 3D leads, colour probes for the faces), and the camera presets are treated as correctness. The face convention section is the rule set for every board viewer that follows.

---

## 6. Known limits and failure lessons

| # | failure | how found | fix | rule |
|---|---|---|---|---|
| 1 | whole board rendered mirrored | the 22:25:50 upload shows JUMPERLESS reversed | board y to world -Z, model z negated with winding flip, `rotation.y = +rot`, `flipY = true` | the XZ plane seen from +Y with +X right has +Z pointing down the screen |
| 2 | z-fighting on orbit | look | face gap 4 um to 20 um, polygonOffset, near/far 4/1400 | |
| 3 | zero-opacity zone tints drawn every frame | review | hide until a zone or net is selected | |
| 4 | back rendered backwards after fix 1 while the probe passed | `view_preset.py` picture | removed the canvas-wide back mirror, kept the per-string glyph mirror | measure position and glyph mirroring separately |
| 5 | probe blind to the mirror | analysis | asymmetric, different-colour probe pairs; an L fiducial | a probe symmetric about the centreline cannot see a mirror |
| 6 | BACK preset at azimuth 0 | probe D | azimuth PI | |
| 7 | NANO EDGE looked in from the lanyard edge upside down | review | azimuth 0; USB EDGE at -PI/2 since J1 is at x 4.6 | presets point at the edge the connector is on |
| 8 | camera cut about 15 mm per side in portrait | `smoke_mobile.mjs` | aspect-derived `fitDist()` | |
| 9 | 3080 px textures over a 2048 px phone limit | mobile pass | device scale and clamp | |
| 10 | over a thousand draw calls | mobile pass | merge by material and grid; budget 150 | |
| 11 | mouse-only input, `dblclick`, fixed sidebar on a 390 px screen | mobile pass | pointer map, manual double tap, portrait sheet | |
| 12 | silk widths 15 percent narrow on the marker face | building the fab set | exact font metrics in G5b, 0.4 gap | |
| 13 | back silk 12 mm off board at each edge | `check_fab` and render | mirror glyphs inside the ink box | |
| 14 | THT pads with no bottom ring | `render_fab.py` picture | `layer_pads()` adds other-side THT pads | |
| 15 | back copper art under those rings | same render | moved; G2c | |
| 16 | Excellon G90/G05/M71 after the `%` terminator | parser warning | moved inside the header | |
| 17 | `BOM.csv` notes truncated at the first period (`split(".")[0]`, `GEN` line 857), so Y1 reads "HC-49U can silkscreened 2" | reading the BOM (`fab-knowledge:sources/benches/benches-copper-pcb-a.md`) | split on ". " or store a short note | |

Open, per the README: pad tables never diffed against vendor land patterns; J1, J2, SW1 stand-ins from remembered datasheet dimensions; fab set never loaded into a fab's own viewer; silk not pre-clipped off pads; CPL rotations unchecked against an assembler library; purple mask availability unconfirmed; breadboards vary by 1 to 2 mm; jsdom does not evaluate media queries, so breakpoints are unproven on a handset. REVIEW.md numbers its unverified list 1 to 7 with 5 and 6 repeated.

---

## 7. Tests and harness

| harness | asserts | recorded result |
|---|---|---|
| `GEN` gates | G1 to G7 | PASS, 0 warnings (gate output) |
| `F/check_fab.py` | section 4.8 | clean; worst drill offset 0.0000 over 83 (proof output) |
| `F/check3d_shunt.mjs` | numbers finite; indices in range; model bbox within body + 1.6; recovered THT lead count equals declared THT pads; each lead within 0.01 mm of a declared pad after an independently re-derived `place()`; declared allowance SW2 0.12 | 28 parts, 10 real models, 55 lead landings at 0.000 mm, 4 within the allowance, 3 stand-ins |
| `F/smoke.mjs` | stub WebGLRenderer; drive every camera, peel, lift, toggle; click selects D3 by projected point; net chip sets the readout; at least 40 frames; defect banner | every control driven |
| `F/smoke_mobile.mjs` | 390 x 780; TEX_S at most 13; texture at most 4096; pixel ratio at most 1.75; orbit, pinch, two finger pan over 0.5 mm; pinch lift does not tap; tap select, double tap focus, tap clear; CONTROLS; RESET; at most 150 visible meshes | TEX_S 12, 89 meshes |
| `F/render_faces.mjs` | writes `sim-top.png`, `sim-bottom.png`; world Y stack of board, tape, breadboard, parts | clean |
| `F/probe.mjs` | A uv probe (gold bar left end gold, its mirror point not; drill centre `#241c10`, annulus gold); A2 position pair with different colours at mirror x; A3 L fiducial; C slab ray hits at the slot and mount; B and D projection and readability for TOP, ISO, BACK | clean |
| `F/view_preset.py` | homography by Gaussian elimination, warps the face texture into each measured preset quad | `view-top.png`, `view-iso.png`, `view-bottom.png` |
| drive 2026-10-05 | six shots | zero page errors (measured) |

Cost (REVIEW, board-forge `price.py`, JLCPCB-shaped constants 2026-08): 5 boards $86, 30 boards $160, 100 boards $368; flags over 100 x 100 mm and SMD on both sides; recommendation 30 boards, hand-solder BT1, vinyl overlay in place of UV print.

---

## 8. Port map

| item | value |
|---|---|
| packages | `board` (direct Gerber X2, Excellon, CPL emission without tscircuit; gerbonara reparse), `ui-core` (face painter, texture scaling, pointer map, `fitDist`, presets as correctness, draw-call budget), `catalog` (`.kicad_mod` and `.wrl` pairs, labelled stand-ins), `geom` (OBB and SAT, rounded outline) |
| feature kinds | `pad`, `conductor`; board-level things with no kind: outline, mount hole, routed slot, keepout, silk string, UV art layer, taped-on bought body (BB1) |
| canon ids | none (non-functional by design) |
| canon MISSING | board face convention (position vs glyph mirror) as a rule; inverted defect-count gate (expected violation set); lead landing check through a re-derived transform; silk metric exactness and mirror-distinguishable silk check; both-side THT rings; back art vs rings |
| reference ids | MISSING in INDEX; proposed `exports/gerber-fabset` and `boards/shunt-art` (`fab-knowledge:synthesis/mappings.md` row SHUNT) |
| milestone | M08 ("SHUNT lead landings 55 at 0.000 mm", MILESTONES.md line 65) |
| lineage row | MISSING |
