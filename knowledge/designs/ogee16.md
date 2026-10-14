# OGEE16 R16-P: how it is made

A 4x4 mechanical pin display with no electronics in the pixel. Eight inputs (four row knobs, four column knobs) address sixteen pins by displacement coincidence; a pin under both driven bars rises past a latch plate and hangs there, a pin under one bar rises half way and drops back, and one pull tab clears every pin. R16-P is the printed, hand-cranked build of the verified R16 lasercut machine, with a servo drive that drops into the same frame, a fits table, an orientation scorer, a build plate page and a sheet page for the mixed build. This record says how every part of it is built, from the original code, so a builder can make the next design the same way.

Number rule for this file: every constant is read from the source file and line named beside it; figures marked computed were produced by `kin.py` and `fits.py` rerun on 2026-10-05 from `files/src/source/` (Python 3, no edits) or by hand from the named constants; figures marked stated are written in the bench notes and were not reproduced here; measured figures come from the headless drive of 2026-10-05.

Folder: `fab-knowledge:originals/ogee16/` (files, shots, SHA256SUMS).

## 1. Identity and revision

| field | value |
|---|---|
| owner name | OGEE R16-P (bench `ogee16`, chat "Parametric mechanical display assembly in OpenSCAD", conversation c64448cc) |
| slug | ogee16 |
| canonical revision | harvest snapshot of 2026-08-18 05:05 (byte-identical to `~/Downloads/files (75)/`, dated by `sources/downloads/dl-ogee-stipple-mech.md` line 9) |
| assembly page | `files/ogee16p.html`, 3,209,119 bytes, sha256 `eec1e191cea91a6d04d5b47b68ef334a85b9eedc1446f30b1838fa937f035dc4` |
| plate page | `files/ogee16-plate.html`, sha256 `86a000eb98eeb108fedfedc1d7c4ac9a08cfdeef8e8b2661b71069eb207c8837` |
| source zip | `files/ogee16-source.zip`, 167,837 bytes, sha256 `47d6077e0596eb4e9722a0a9f687cb82ec472c7bc031d8d2f61a98266aa94dd5`, unpacked to `files/src/` (notes in `files/src/*.md`, code in `files/src/source/`) |
| companions | `files/ogee16.html` (R16 lasercut sim), `files/ogee16-sheets.html` (sheet nest, DXF), `files/ogee16c.html` (R16-C cloth), `files/notes/*.md` (README, BUILD, PRINT, SHEETS, MIN, PINS, CLOTH, TIMES), `files/exports/` (one pivot pin STL, print STL zip, cut DXF zip), `files/companions/ogee16-buildit-app-20260818.html` (the newer build-it page, see 1.2) |
| left out | `ogee16m.html` (12.4 MB, the minimal frame page; its geometry is `skeleton.py` plus `printed.scad` `m_*` modules, both in `files/src/source/`), `ogee16-minimal-stl.zip`, `ogee16-pivot-pins-x32.stl`; all in `fab-work-directory:benches/ogee16/outputs/` |

### 1.1 Revision table

From `sources/downloads/dl-ogee-stipple-mech.md` section 3.1 and `sources/benches/benches-mechanisms.md` section 2.

| rev | date | what changed |
|---|---|---|
| R12 | 2026-08-14 20:36 | all lasercut sheet: T 3.0, PITCH 34, STROKE 9.0, R_LATCH 7.6, rockers pinned |
| R13 | 2026-08-14 22:46 | owner's Fusion part set: flat bar strips, separate lugs, dogbone links, notched rods, 9 SG90 |
| R14 | 2026-08-15 01:24 | raked dogleg lugs, CROWN_R 11.0 from here on |
| R15 | 2026-08-15 01:38 | cells yawed 45 deg, C 13.0 |
| R16 | 2026-08-15 02:24 onward | back inline (`DIAG = 0`), C 9.0, link 29.6 (stated) |
| R16-P | 2026-08-16 11:49 to 2026-08-18 00:06 | printed build, plate page bill 92, 98, 99, 129, 137, 135, then 136 pieces in the page (stated, `ogee_bill_timeline.json`) |
| harvest | 2026-08-18 05:05 | adds the shaft collar trap check, `printtime.py`, `collar.scad`, TIMES.md |
| build-it page | 2026-08-18 17:01 | `ogee16 (6).html`: printed, cut and minimal builds in one page on an outline-plus-prism kernel |

### 1.2 Why the harvest snapshot

It is the newest good state. The build-it page is newer and carries a kernel worth keeping (closed outlines plus prisms, 2 MB against 26 MB of meshes, worst volume error 0.32 percent computed by the downloads reader), but its N-parametric `PARTS_TBL` undercounts the bill by 25 pieces (99 in the table against 124 placed by its own scene, computed in `evidence/x/downloads/dl-ogee-stipple-mech/derived/ogee_buildit_run.json`) and its "download every plate" ships those 25 short. The harvest pages and `build_plate.py` agree on 124 pieces in 20 types for knob drive and 119 in 21 for servos (computed from `build_plate.py:5` to `12`), the in-page build check passes (measured, `CHECK OK` in every shot), and every fit in `fits.py` is in band (computed). The build-it page sits in `files/companions/` for its kernel and DXF writer.

## 2. What it makes and for whom

A maker with a 256 mm cube FDM printer (FlashForge Creator 5 Pro named in `notes/PRINT.md`), PETG, and either two hands on eight knobs or nine SG90 servos, builds a 208 x 208 x 97 mm box (stated, `notes/BUILD.md`) with a 4x4 field of 16 mm caps on a 34 mm pitch (`params.scad:37`, `:103`). Writing a pixel is two knobs turned together; clearing is one tab pulled. The build is the printed twin of a 183-piece lasercut machine, and the final ask in the chat was a mixed build: internals printed, body cut from 3 mm sheet, with slots that take a printed part sized differently from slots that take a cut one.

## 3. Shots

Driven headless on 2026-10-05 with `fab-knowledge:originals/_tools/shoot-tang-sensors.cjs` (Chrome, swiftshader, 1280 x 860) through the page hooks `__ogeep`, `__plate`, `__ogee`. Console errors: 0 on all three pages (measured).

| file | what it shows |
|---|---|
| `shots/p02-r16p-checker-latched-8-of-16.png` | R16-P after `__ogeep.drive(i,j)` on the eight checker cells: chips `8/16 SET` and `CHECK OK`, ghost-body frame, pink row bars, lime column bars, amber links, cream rods with yellow caps, blue knobs on +X and +Y walls; rail panels OGEE R16-P, WRITE A PIXEL with the checker cells lit, DRIVE with knobs selected and the knob angle sliders |
| `shots/p03-r16p-servo-drive-xray.png` | `setDrive('servos')` plus x-ray: knobs and shafts hidden, SG90 boxes and brackets shown, same frame |
| `shots/p04-r16p-exploded-solid.png` | solid render, explode 0.6: face and caps lifted, latch plate, deck, links with red pivot pins, bars, walls pulled out along their own assembly axes |
| `shots/p06-r16p-tab-pulled-all-clear.png` | after `pull()`: `0/16 SET`, every rod back on its crown |
| `shots/p07-plate-page-knob-drive.png` | plate page: chips `124 PCS`, `20 PLATES`, `1049 CM3` (amber, over the 900 warning); one plate per part type in the chip row with fill percent and height; the base plate with its eight column stop bosses on the bed; parts table with servo-only rows struck through |
| `shots/p09-r16-lasercut-full-select-0-0.png` | R16 lasercut sim after `__ogee.drive(0,0)`: `1/16 SET`, `AUDIT 0`, magenta caps, laminated bars with raked-free inline lugs, cap shape and show/hide panels |

## 4. Mechanisms, circuits and constructions

Code locations are in `files/src/source/`. There is no circuit; every mechanism below is geometry.

### 4.1 Displacement coincidence latch (canon `displacement-coincidence-latch`)

What it does: a notched rod stands loose on a link crown. Its lug has a ramp on top and a flat retaining face below. Rising, the ramp meets the latch plate's slot edge and cams the rod sideways; once the lug's flat face clears the plate top, gravity on a ramped foot slot brings the rod back and the lug rests on the plate. Pulling the plate `LP_SLIDE` moves every slot edge off every lug at once.

Geometry, rod profile `p_rod()` (`ogee16.scad:68` to `80`):
1. Rectangle `PIN_W` 10 wide from `PIN_BOTL = -NOTCH_D` (-10) to `PIN_TOPL = FACE2_Z + T - CROWN_TOP` (`params.scad:80`, `:87`, `:89`, `:90`).
2. Union the lug polygon on +x: `[PIN_W/2, ZL]`, `[PIN_W/2 + LUG_P, ZL]`, `[PIN_W/2 + LUG_P, ZL + LUG_H]`, `[PIN_W/2, ZL + LUG_H + LUG_RAMP]` with `ZL = Z_LUG0 - CROWN_TOP`, `LUG_P` 1.25, `LUG_H` 0.60, `LUG_RAMP` 1.20 (`params.scad:81` to `84`). Flat face down, ramp up.
3. Subtract the foot notch: `NOTCH_W` 4.45 wide (`params.scad:85`), floor below the rod, ceiling `ceil_v(u) = -(u - (T/2 - PIN_PLAY)) tan(RAMP_A)` with `RAMP_A` 40 (`params.scad:88`, `ogee16.scad:69`). The ramped ceiling is the return spring.
4. Extrude at `T` 3.0 in the YZ plane (`v_rod`, `ogee16.scad:81`).

Constants and equations (`params.scad`, `kin.py`):

| quantity | expression | value |
|---|---|---|
| `PIN_PLAY` | `(NOTCH_W - T)/2` (`params.scad:86`) | 0.725 (computed) |
| `CAM`, lateral travel to pass the edge | `(PIN_W/2 + LUG_P + PIN_PLAY) - SLOT_E`, `SLOT_E` 6.05 (`params.scad:93`, `:96`) | 0.925 of 1.450 available (computed, `kin.py`) |
| `CAMLIFT` | `ceil_v(E_REST + T/2) - ceil_v(E_REST + CAM + T/2)` (`kin.py:90`) | 0.776 (computed) |
| `Z_LUG0` | `LP_Z + LP_T - R_LATCH` (`params.scad:74`) | 72.4 (computed from `LP_Z` 77, `T` 3, `R_LATCH` 7.6) |
| full select rise | crown top rise with both bars at `STROKE` 9.0 | 9.000 (computed) |
| half select rise | one bar at `STROKE` | 4.249, row slot used 2.125 of 2.600, crown x offset -0.503 (computed) |
| half select margin | plate top minus lug top | 0.775 (computed; must stay positive) |
| full select overshoot | lug bottom minus plate top | 1.400 (computed; must stay positive) |
| latch identity (CHK-MOT-05, general form) | margin + overshoot = (full rise - half rise) - CAMLIFT - LUG_TOT | 2.175 = 2.175 (computed) |

`pin_state()` (`kin.py:94` to `119`; JS twin `pinState`, `kin_block.js:17` to `31`): rest is hard against the +Y stop `E_REST = -PIN_PLAY`; the lug is cammed while any part of it is inside the plate thickness and the plate has not been pulled past `CAM + 0.05`; a latched rod holds `max(rise_free, R_LATCH)`.

Latch commit: in the printed page `apply()` sets `latched[i][j]` whenever `lp < 0.05` and the lug bottom is at or above the plate top, and clears all when `lp >= CAM + 0.05` (`printed_viewer_template.html` `apply`, viewer line 285 onward). `drive_()` commits first by setting both bars to `STROKE`, calling `apply()`, and then plays the animation as a picture (`drive_`, template line 349). `pull()` (template line 360) uses the same order for the clear: it sets `lp = LP_SLIDE`, calls `apply()` (3.0 is past `CAM + 0.05`, so every latch clears) and only then plays a 900 ms out-and-back animation. `drive_()` commits only when both a row and a column are given; a single-bar drive never reaches the commit line. Lesson recorded in `notes/PRINT.md` and the R16 page: deciding the latch from rendered frames dropped every pixel under software GL.

Limits and lessons: a latched rod hangs on a 1.0 mm shelf and a sideways poke of about 1 mm releases it (stated, `notes/BUILD.md`); gravity return means face up only; the half select rise is not stroke/2 on this two-pin link (4.249 against 4.5, computed), so the seeded stroke/2 form of the identity gives 1.924 and fails, while the general form holds. STIPPLE's pin-free beam makes the rise exact (see `originals/stipple/RECORD.md`).

### 4.2 Link with a crown struck from its own origin

What it does: averages the row and column bar heights. One end is a round bore on the column pivot, the other a slot on the row pivot that takes up the chord change.

Geometry `p_link()` (`ogee16.scad:48` to `60`):
1. Hull of two `LINK_R` 4.5 circles at `-C` and `C + ROW_SLOT_E` (`params.scad:59`, `:64`).
2. Union the crown: circle `CROWN_R` 11.0 centred at `CROWN_OFF` 0.50, intersected with a 14 wide band from 0 to `CROWN_R + 1` (`params.scad:60`, `:62`).
3. Subtract `LINK_BORE` (3.40, `ROD_D + FIT_BORE`, `params.scad:114`) at `-C` and a slot hull from `C` to `C + ROW_SLOT_E`.

Kinematics `rocker()` (`kin.py:61` to `72`), JS `link3()` (`kin_block.js:8` to `16`): `xa = px(j) - C`, `za = ROD_Z + zC[j]`; `xb = px(j) + C`, `zb = ROD_Z + zR[i]`; `th = atan2(dz, dx)`; crown centre `xa + (C + CROWN_OFF) cos th`; crown top `cz + CROWN_R`. Mesh origin sits on the pivot midpoint so the viewer rotates it about the right point (`ogee16.scad:5` to `8`).

Failure lesson (from the R16 failure table in `sources/benches/benches-mechanisms.md`): a link mesh exported with its world offset baked in swung about a point 48 mm below its pins and looked correct at zero tilt. The printed page's `buildCheck()` now walks the renderer's own transform and asserts both bores land on the pivots at four bar states to 1e-6 (template line 403 onward).

### 4.3 Bar assemblies, lugs and the inline cell

Printed `a_rowbar()` and `a_colbar()` (`printed.scad:58` to `87`): the laminated bar strip (`RBW` 12 wide, `TB = T*LAM` 6 thick, `params.scad:19`, `:20`, `:119`), four pivot lugs (`lug_profile`, `ogee16.scad:25` to `34`: rectangle `LUG_W` 12 to `ROD_Z` 48, semicircular top, `LUG_BORE` 2.90 hole, two tenons `TEN_W` 4.0 at `TEN_P` 3.5), one drive lug with its yoke slot and guide lugs, unioned into one solid. The row bar carries one guide (`GUIDE_X = [-30]`) and so 6 lugs; the column bar carries two (`GUIDE_Y = [-30, 51]`, `params.scad:135`, `:136`, because its drive lug's deck slot is swallowed by the crank cutout) and so 7 lugs, although `build_plate.py:24` labels it "column bar + its 6 lugs" (label drift, recorded). The column bar is intersected with a half space at `CB_Z` so its drive and guide feet stop at the bar underside; the stops move to eight printed bosses on the base, `COLSTOP_Y = [-26, 124]` (`printed.scad:88` to `96`). Reason in the code: standing on its feet it printed with 120 mm2 of bed and 1891 mm2 of overhang, best of 24 poses 124 (`printed.scad:68` to `74`).

Cell placement: `cw(i,j,u,v)` and `at_cell` (`ogee16.scad:17` to `19`) translate to the pixel then rotate by `DIAG`; `ROW_BAR_Y = C sin(DIAG) + YOFF cos(DIAG)`, `COL_BAR_X = -C cos(DIAG) + YOFF sin(DIAG)` (`params.scad:124`, `:125`), so `DIAG` 45 restores the R15 yawed build.

Lasercut laminated bars (`p_rowbar`, `p_colbar`, `ogee16.scad:109` to `132`) carry mortise pairs `TEN_W + FIT_TEN` by `T + FIT_TEN` for every lug. Bar sag at the far station 0.168 mm laminated against 0.95 for a single strip (stated, `notes/BUILD.md`), which is more than the half select margin; this is why the bars are two layers and carry no lightening holes.

### 4.4 Crank to yoke drive (canon candidate `crank-yoke`)

What it does: a crank pin rides a slot in the drive lug that is long along the bar and tight across it, so bar rise equals `CRANK_R (sin phi - sin phi_rest)`.

Constants: `CRANK_R` 6.0, `CRANK_SW = asin(STROKE/(2 CRANK_R))` (`params.scad:151`, `:152`), 48.59 deg (computed), so `2 R sin(SW) = STROKE` and the bar follows the crank over the whole stroke. Rest `PHI_REST = 180 + CRANK_SW` (`kin.py:130`); `crank_phi(rise)` inverts it (`kin.py:132` to `135`, `kin_block.js:33` to `34`). Latch crank `LCRANK_SW = asin(LP_SLIDE/(2 LCRANK_R))` (`params.scad:193`), 14.48 deg (computed).

Crank profile `crank_body(r)` (`ogee16.scad:283` to `290`): hull of a `CRANK_HUB` 11 circle and a 0.72 x hub circle at `r`, minus the spline hole `SV_SPLINE_D + 0.4`, two horn screws 1.8 at +-4.5, and `CRANK_BORE` at `r`.

Printed drive pin `drive_pin_flush()` (`printed.scad:252` to `260`): head `PIN_HEAD2_D` x 1.5 recessed in a counterbore (`pin_seat`, d + 0.2, h + 0.11). The head is written as 5.5 at `printed.scad:237`, but the pivot pin section reassigns `PIN_HEAD2_D = 6.0` at `:393`, and OpenSCAD uses the last assignment of a top-level variable everywhere in the file, so the drive pin is built with a 6.0 head in a 6.2 counterbore: `exports/ogee16-print-stl.zip` `print/drivepin.stl` spans x and y -3.0 to 3.0 and z 0 to 8.0 (measured 2026-10-05), and the plate page lists it as 6x6x8 (shot `p07`). A port must give the two pins separate names. Below the head: a press shank `CRANK_BORE` through the full 3 mm crank, boss `BOSS_D = YOKE_H - FIT_SLIDE` (2.85 computed) for `T + BOSS_GAP + BOSS_L` with a 0.5 cone fillet in the 0.5 air gap (`printed.scad:233` to `238`). Comments record why: a stub butted on a face would have snapped; a moulded boss wrecked the print pose; a proud head swept a ring through its own servo (the bench record said 577 mm3 per pin head, `sources/benches/benches-mechanisms.md`; D-233 retires it: the original `check_sweep.py` gives about 682 mm3 per bar crank as a per-step sum over 25 steps and 78.96 to 79.16 mm3 counted once, computed).

Hand drive `a_shaft_row` / `a_shaft_col` (`printed.scad:333` to `363`): crank plus an 8.0 shaft with a 6.4 D flat over its last 14 mm, a retaining collar 11 x 2 with a 45 deg cone underside 0.5 inboard of the hub (`retainer`, `:329` to `332`), and the knob `a_knob()` (`:364` to `379`): 26 x 10 with twelve 3.2 flutes, a PRESS D bore (`SHAFT_D + FIT_PRESS`), and a pointer flat.

Hub `knob_hub()` (`printed.scad:285` to `328`): `HUB_D` 16 for `HUB_L + T` with a 1.5 tall cone root fillet, bore `SHAFT_D + FIT_SLIDE`. Bearing L/D went from 0.375 to 1.00 (computed from 3/8 and 8/8); end float 0.5 (`COLLAR_GAP`, `:289`).

Latch drive: hand pull tab `a_latch()` plus press-on paddle `a_latchpull()` (`printed.scad:184` to `217`), or the servo latch crank with the same flush pin (`:428` to `435`) in the tower `a_latchtower()` (`:444` to `465`) standing on the deck. Latch servo window `LSV_X` 124 between 123.3 and 125 (`params.scad:183` to `186`, two named bounds).

Checks: `check_drive.py` (`run`, line 30; `latch`, line 58) proves pin z equals yoke z to 1e-9 over 41 steps and at least 0.2 inside each slot end; in-page `buildCheck()` repeats it at 9 rise steps.

### 4.4a Drive and guide end lugs, and the servo brackets

What they do: each bar stands on two vertical end lugs that pass through tight deck slots. The drive lug carries the yoke slot the crank pin rides in; the guide lug only squares the bar. Both run down to the base, and that landing is the bar's rest stop.

Geometry `endlug(base, floor, top, w0, w1, cc, yoke_c, yoke0, yoke1)` (`ogee16.scad:145` to `155`):
1. Full width body below the bar (from the base top `BASE_Z + T` up to the bar underside) when the bar is raised off the base; that foot is the rest stop.
2. Full width body from the bar top `floor` to `top`; `ENDLUG_TOP = DECK_Z + T + 1` (41, computed), proud of the deck and under the link (`:141`). The column drive lug runs to `CSV_Z + 6` instead (`:163`).
3. Only two tenons `TEN_W` at `+-TEN_P` through the bar itself. The comment records why: a full width body through the mortise band buried 66.6 mm3 of lug in solid bar, which the audit caught (`:142` to `144`).
4. Drive lugs (`p_rowdrive`, `p_coldrive`, `:160` to `165`) are 17.5 wide (`w0 = bar - 10.5`, `w1 = bar + 7`) and subtract a yoke slot `T + FIT_SLIP` (3.4) tall from `bar - 8.3` to `bar - 1.7` (6.6 long) centred at `ROW_YOKE_C = RSV_Z - CRANK_R sin(CRANK_SW)` (`:139`; 23.0 computed), the crank pin height at rest, so the pin sits in the slot centre when the bar is down.
5. Deck slots (`p_deck`, `:181` to `212`): pivot lug slots `LUG_W + FIT_PSLIP` by `T + FIT_PSLIP` (12.7 x 3.7, sized for a printed lug); guide slots the same through `lug_slot()`; drive lug slots `T + FIT_PSLIP` by `17.5 + FIT_PSLIP`, offset 1.75 toward the yoke side. The comment states the rule: two tight stations per bar square it in x, y and yaw (`params.scad:128` to `134`).

Servo mounting (`ogee16.scad:298` to `358`): `servo_cut()` is a window `SV_L + SV_FIT` by `SV_W + SV_FIT` (23.3 x 12.7, computed) with two `SV_HOLE_D` 2.2 screw holes at `+-SV_HOLE_P/2` (27.8 pitch) (`params.scad:143` to `149`). The row bracket `p_svbracket_row` stands in the YZ plane at `RSV_BRK` 135.6 with four windows at `RSV_Z` and four base tabs at y -8, 40, 78, 126; the column bracket is the same at `CSV_Z` with tabs at x -20, 40, 78, 118. The latch servo is turned 90 deg about Z (`servo_cut_h`, `:327` to `334`) so it needs `SV_W` 12.2 in Y instead of `SV_L` 22.8, and its bracket `p_latchbracket` is sized off the servo flange (`SV_TAB_SPAN` 32.2 plus 4 each side) rather than off the ribs, because sizing off the ribs gave a 24 wide plate under a 32.2 flange (`:335` to `345`). Two ribs `p_latchrib` at `LRIB_X = [110, 122]` carry it on tabs top and bottom.

Latch plate and rails (`ogee16.scad:221` to `233`, `:267` to `277`): the plate is a chamfered rectangle (hull of two rectangles inset 8) with one rod slot per cell from `SLOT_B` -9.10 to `SLOT_E` 6.05, and a drive slot 12 long and `T + FIT_SLIP` wide centred on the latch crank pin at rest (`LDRIVE_U0`, `U1`, `V`). Each rail is a YZ plate from `RAIL_Z0` 70 to `RAIL_Z1` 91 with a groove from `LP_Z - 0.2` to `LP_Z + T + 0.2` (0.4 clearance on a cut plate) and two ear tabs into the walls; the printed rail gap is `RAIL_GAP = (FIT_SLIDE - 4 PRINT_SHRINK)/2` (`printed.scad:151`).

### 4.5 Pivot pin with a printed head and a long lead-in barb

`a_pivot()` (`printed.scad:393` to `408`): head 6.0 x 1.5; shank `PIN_SH_D = LINK_BORE - FIT_SLIDE` (2.65 computed) over `T + PRINT_GAP + T`; ledge 3.8 x 0.4; cone 3.8 to 1.6 over 3.0. The cone wedges the pin through the 2.90 lug bore and swages it; `fits.py` classes it SNAP at -1.15 drawn (computed). Three earlier pins failed (stated, `notes/PINS.md`); the last slotted one had two 0.73 mm legs. Print head down, 100 percent infill or 3 or more perimeters (stated).

### 4.6 Face, cap and the cam allowance

`a_face()` (`printed.scad:119` to `133`): both face layers as one 6 mm plate, a through rod slot `SLOT_X` wide (`T + FIT_PSLIP`, `params.scad:91`) and a 3 mm deep cap pocket `cap_outline(shape, CAP_D + CAM + FIT_SLIDE)` offset by `-CAM/2` in Y. Cap `p_cap()` (`ogee16.scad:90` to `95`): circle, square, hex or triangle at `CAP_D` 16, minus a `T + FIT_TEN` by `PIN_W + FIT_TEN` mortise. Rod and cap stay separate parts so the rod goes in from inside and the cap presses on from the top (`printed.scad:102` to `107`). Lesson: an aperture sized on `CAP_FIT` alone left 0.300 per side against 0.925 of cam and the cap jammed (`ogee16.scad:256` to `259`).

### 4.7 Frame as separate printed plates

`fr()` shrinks every lasercut frame profile by `PRINT_SHRINK` 0.05 all round (`printed.scad:150` to `152`). Because both halves of a tab joint shrink, it adds 4 x 0.05 to the tab clearance: 0.35 drawn LOCATE (computed in `fits.py`). `RAIL_GAP = (FIT_SLIDE - 4 PRINT_SHRINK)/2`. A one-piece 350 cm3 tray was tried and rejected (stated, `printed.scad:140` to `145`). Walls are four distinct parts: +X row knob bores, +Y column knob bores, -X latch tab slot (`:154` to `179`). Wall and hub are one local part placed twice, so print and assembly exports cannot drift (`wallx_hubbed`, `wally_hubbed`, `:294` to `316`); the comments record the mirrored Y wall that showed as 4 bodies.

### 4.8 Fits table (`fits.py`)

Model (`fits.py:1` to `20`, `:25` to `40`): holes print about 0.15 under and outsides about 0.10 over, so `LOSS` 0.25 of drawn clearance is gone. Bands, drawn: SLIDE 0.70 to 0.90, PSLIDE 0.45 to 0.70 (real gap, laser slot taking a printed part), SNAP -1.30 to -0.15, LOCATE 0.25 to 0.40, PRESS 0.00 to 0.16. Bands moved up 0.20 after "they still feel tight" (`fits.py:36` to `37`). Eighteen pairs (`fits.py:53` to `77`), all in band (computed):

| fit | drawn | class |
|---|---|---|
| crank shaft in wall bore; link on pivot; drive pin in yoke; latch plate in rail | 0.75 | SLIDE |
| knob on shaft D; pull knob on tab | 0.10 | PRESS |
| drive pin in crank bore | 0.00 | PRESS |
| cap on rod tenon | 0.15 | PRESS |
| pivot shank in lug bore | 0.25 | LOCATE |
| pivot barb through lug | -1.15 | SNAP |
| printed lug in cut deck slot (across, along); printed rod in cut face and latch slots | 0.55 | PSLIDE |
| printed cap in cut face pocket | 0.50 | PSLIDE |
| deck tab, frame tab, servo bracket tab | 0.35 | LOCATE |

PETG at 0.24 layers loses about 0.40 instead of 0.25 (stated, `notes/TIMES.md`); the PETG column there leaves frame tabs at -0.05 ("taps together") and the knob at -0.30 ("go to 0.20 if a knob will not start").

Lesson in the code: `fits.py` once hardcoded `FIT_SLIDE` and reported 0.55 after the scad had moved to 0.75 (`fits.py:42` to `45`). `PR` still mirrors `printed.scad` constants by hand; a port reads them from one source. The module docstring (`fits.py:10` to `18`) still describes three classes with the bands before the raise (SLIDE 0.50 to 0.65 drawn); the live table is `BAND` at `:38` to `40`. `PR["PIN_BARB_D"]` is set to `LUG_BORE` and never read; the SNAP row uses a literal 3.8 (`:62`).

### 4.9 Print orientation scorer (`orient.py`)

All 24 axis-aligned poses (`poses()`, `orient.py:19` to `35`), score = bed contact area of facets with normal z under -0.99 within 0.05 of zmin, overhang area of facets with normal z under -cos 45 not on the bed, and height (`score()`, `:37` to `45`); sort key `(-round(bed), round(over), round(h, 1))` (`:55`). Results that went into `printed.scad`: rod cap down (bed 16.7 to 201 mm2 stated), shaft stood on its crank, link flat (the one part with separate print and assembly exports), knob flipped (524 to 565 mm2 bed, `printed.scad:609`). Print exports are the assembly part reoriented, never redrawn; `render_print.py` compares volumes of each pair to 1e-3 relative (`printed.scad:597` to `600`).

### 4.10 Build plate page (`build_plate.py`, `plate_template.html`)

`build_plate.py:5` to `12` holds the bill: COMMON 107 pieces (base, face, deck, latch, four walls, 2 rails, 4 + 4 bars, 16 links, 16 rods, 16 caps, 32 pivots, 9 drive pins), KNOB_DRIVE 17, SERVO_DRIVE 12; totals 124 in 20 types and 119 in 21 (computed). Each part is embedded once as base64 binary STL parked at the origin (`binstl`, `:33` to `40`; `:43` to `52`). One part type per plate (`GROUPS`, `:14` to `17`). The page packs with MaxRects best-short-side-fit and 90 deg turns inside a `MARGIN` 10 inset (`packOne`, `pack` in `plate_template.html` lines 268 to 325), Inside a group items are sorted by footprint area, largest first (the comment says tallest first; the code sorts by `w*d`, template line 313). `autoGap()` tries gaps 2 to 16 and keeps the largest that holds the plate count (line 332), and `writeSTL()` writes one binary STL per plate with the header `OGEE R16-P // hack.build // generated in-browser` (line 403). Drive toggle strikes the other drive's rows (shot `p07`).

Limit: the docstring still says "99 pieces" (`build_plate.py:2`), written at the 99-piece state.

### 4.11 Sheets, DXF and kerf (`build_sheets.py`, `cutfiles.py`, `sheet_template.html`)

OpenSCAD DXF arrives as loose LINE segments; `rings_from_dxf()` keys endpoints on rounded coordinates and walks to closure (`cutfiles.py:34`), `polygon_from_rings()` builds outer plus holes (`:69`), `compensate()` buffers `+kerf/2` with mitre join and mitre limit 4 (`:95` to `97`), `check_connected()` refuses any part in more than one piece (`:109` to `121`; it caught a deck severed by its own channels and a keeper severed by relief slits). Kerf default 0.18 (stated, `notes/BUILD.md`); cut a fit coupon first (`p_coupon()`, `ogee16.scad:409` to `425`: one of each fit class plus the SG90 cutout and horn pattern). The page's DXF writer emits `$INSUNITS 4`, one `LWPOLYLINE` per ring with a handle, `100 AcDbEntity`, layer `CUT`, code 70 = 1 and the first vertex repeated, CRLF (stated, `notes/SHEETS.md`).

### 4.12 Minimal frame (`skeleton.py`)

`skeleton()` (`skeleton.py:96` to `111`): band `BAND` 4.0 inside the outline, collar `RIB` 2.6 round every hole, pads under knob hubs, lattice of half width `WEB` 2.2 on the bar lines (`:26` to `28`), intersect with the profile, `stitch()` the smallest island to the rest along `nearest_points` up to 24 times clipped to the host (`:113` to `131`), then close and reopen by 0.35 and stitch again so tangencies survive the 0.05 print shrink. Frame kept 26 percent of 775.8 cm3 before the boss repair (stated, `notes/MIN.md`). Blind spots found: the 3D column stop bosses and the printed-variant knob bores are absent from the 2D profile; `m_base()` and `knob_bores_x/y()` restore them (`printed.scad:489` to `532`).

### 4.13 Cloth skin (R16-C, `cloth_viewer_template.html`)

Verlet with damping 0.994 and gravity -9810 mm/s2 (line 389), position-based distance constraints in `RELAX` 6 passes, structural, shear and bend families (lines 318 to 360), rest length times `TENS` 0.94 (line 336), all four edges pinned, cap colliders whose tops follow `pinState` plus 0.35 (lines 378 to 427). Liveness assertion: the skin height must change by the latch throw when a pattern is written (stated, `notes/CLOTH.md`).

## 5. UX anatomy

Printed page `ogee16p.html` (template `printed_viewer_template.html`):

| region | content |
|---|---|
| top bar | paper with 4 px dot texture, 3 px ink rule, `hack.build` wordmark in Permanent Marker with pink dot, subtitle in VT323, chips `n/16 SET` and `CHECK OK` / `CHECK FAIL` (lines 61 to 67) |
| stage | void with a pink 26 px graph rule, three r128 inlined with a 40-line hand orbit (line 115), camera at (420, 400, 330) looking at both knob walls, hint "drag orbit, scroll zoom, shift-drag pan" |
| rail (380 px) | panels with full-bleed ink VT323 heads and 5 px block shadows: OGEE R16-P blurb; WRITE A PIXEL (4x4 grid, checker, diagonal, fill, pull the tab); DRIVE (knobs or servos, eight knob sliders in degrees between `180 - CRANK_SW` and `180 + CRANK_SW`, latch tab slider in mm); RENDER (solid, ghost body, x-ray; group toggles case, bars, links, rods, knobs, servos); ASSEMBLY (explode 0 to 100, prev, label `k/12 name`, next, whole machine, play the build at 620 ms per step); STATE; BUILD CHECK |
| colours | pink row train, slime column train, amber links, cream rods, yellow caps, red pivots, blue knobs, grey frame: the frame is ink so the mechanism carries the colour |
| explode | `reg()` stores the live pose in `lx/ly/lz` and the explode offset per part; `apply()` writes position as live plus `expl * ex` and never reads position back (template line 184, `apply` line 285) |
| assembly steps | 12 named steps (`ASM`, line 520): base, walls and rails, row bars, row shafts and knobs, deck, column bars, column shafts and knobs, links, latch plate, rods from inside, face, caps |
| build check | `buildCheck()` (line 403): link bores on pivots at 4 states; half select does not latch, full select does; pivot pins span link to lug along their axis; no mesh without geometry; 3 servo mounts and 18 servo bodies; latch servo long axis along X; drive pin in its yoke at 9 steps; collar inboard of the wall with 0.5 end float; pull and caps track their parents to 1e-12; knob angle equals crank angle to 1e-12; mesh tops against params (wall 0.10, others 0.02) |
| hook | `globalThis.__ogeep = {pull, apply, setMode, setAsm, setDrive, latched, PARTS, ASM, drive, driveMode, expl, asmStep, zR, zC, lp, knR, knC, shR, shC}` (end of the template) |
| mobile | under 900 px the rail stacks under a 52 vh stage |

What makes it excellent: every solid on stage is the exact STL off the plate page; the sim cannot place a part by any route other than `kin_block.js`, which is diffed against `kin.py`; the variant toggle swaps drives over one unchanged frame; the build check is visible and names every failure; the assembly stepper teaches the one forced order (row cranks under the deck at z 27.5, column cranks over it at 48.5, `params.scad:156`, `:158`).

Lasercut page `ogee16.html` adds cap shape swap (circle, square, hex, triangle, swaps cap mesh and upper face aperture), nine servo angle sliders, a live clearances panel with per-row thresholds, section cut, lay parts out flat, and a 14-step assembly. Plate page: chips for pieces, plates and cm3, one chip per plate, parts table with click to drop a part, STL export per plate and per part.

## 6. Tests and harness

| tool | asserts |
|---|---|
| `kin.py` | CAM, CAMLIFT, full and half rise, margin, overshoot, latch matrix (rerun 2026-10-05, values in 4.1) |
| `fits.py` | 18 pairs in band, exit 1 otherwise (rerun 2026-10-05: ALL FITS IN BAND) |
| `audit.py`, `audit_print.py` | manifold intersection over 0.5 mm3 for every non-touching pair at 7 laser and 4 printed poses; hardware included |
| `check_drive.py`, `check_sweep.py`, `check_servos.py`, `check_frame.py` | drive chains exact, swept cranks over 25 steps, bought SG90 envelopes and closest approach (flag under 3.0), frame ray casts and section piece counts |
| `check_viewer.py` | cuts the JS kinematics block out of the built page and diffs 128 placements against `kin.py` to 1e-6 |
| `orient.py`, `render_print.py`, `skeleton.py`, `printtime.py` | pose choice, pose-pair volume parity and "Ignoring unknown" stderr refusal, single-body skeletons, print time |
| `headless.py`, `shots*.py` | page module in node under stub three; Playwright swiftshader shots, checker latches 8 of 8, pull drops all after 900 ms, knob and crank drift 0 |

The trimesh, shapely and ezdxf tools were not rerun here (not installed for this pass); their results are stated in the notes.

## 7. Port map

| item | value |
|---|---|
| packages | `mechanisms` (latch, crank-yoke), `motion` (kin as one module), `constraints` (fits table as intervals, `LSV_X` window), `mesh` (orient, pose parity), `nest` (MaxRects plates, shelf sheets, DXF), `geom` (ring stitching, kerf offset, skeletonize), `checks`, `ui-core` (reg, explode, stepper, variant toggle, build check panel) |
| feature kinds | `latch`, `pin_in_slot` (yoke, row slot), `pivot`, `lamination`, `tabslot` with per-process PSLIDE, `bore` with fit, `coupon`, `web`, `window`; missing from the plan: `hub` (bearing L/D and capture), stepped barb pin, crank-yoke drive |
| canon ids (CANONS.md) | `displacement-coincidence-latch` (line 405); `crank-yoke` candidate (line 440); `pin-free-balance-beam` belongs to STIPPLE; MISSING: `pivot-barb-pin`, `captured-shaft-hub`, `printed-frame-shrink-joint` |
| reference ids (handoff INDEX) | `mechanisms/coincidence-latch`, `machines/ogee-cell`, `sheet/laminated-bar`, `sheet/coupon`, `sheet/skeleton-plate`, `joints/tab-slot`; MISSING: a reference for the R16-P printed bill and plates (`expected/` counts) and for the hub plus collar shaft capture |
| milestones | M01 (fits table bounds equal `fits.py`; `LSV_X` 123.3 to 125), M02 (sweep finds the pin head), M04 (printed audit 4 poses 0 clashes), M06 (latch canon), M07 (plates 124 in 20 types, crank-yoke), M10 (OGEE renders from chase), M16 (latch identity in knowledge search) |
| lineage row | MISSING (`lineage.json` holds 3 rows, none for OGEE) |
