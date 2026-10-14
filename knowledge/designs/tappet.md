# TAPPET R3: how it is made

The direct ancestor of OGEE: a 4x4 mechanical pin display addressed like a Jacquard loom. Under every pin hangs a hook; a row plate and a column plate, each with one slit, let needles push every hook aside except the one under both slits; a knife (the griffe) then rises and lifts only the hook still standing over its blade, which drives its pin up into a printed leaf-spring detent that holds it. One clear bar pushes every pin back down. Four servos (row plate, column plate, knife on SG90; clear on MG996R). The page integrates forces at 20 microsecond steps rather than animating, and publishes the torques that made it work. This record says how it is built, from the original page, so a builder can make the next selection mechanism the same way.

Number rule for this file: constants are read from the page's embedded `model` JSON (`P`, `PH`, `stack`, line 97 of `files/tappet-r3.html`) or the line named beside them; figures marked stated are printed in the page rail and were not reproduced; figures marked computed are by hand from the named constants; measured figures come from the headless drive of 2026-10-05.

Folder: `fab-knowledge:originals/tappet/` (files, shots, SHA256SUMS).

## 1. Identity and revision

| field | value |
|---|---|
| owner name | TAPPET (registry manifest row "TAPPET FAB, tappet-fab.html, Fabrication"; the tool folder in the KB is empty) |
| slug | tappet |
| canonical revision | R3, `~/Downloads/tappet-r3.html`, 2026-08-12 05:22, 2,410,184 bytes |
| sha256 | `f321a1772ee597bb71abc53258fbb4bb5c9d99afa97c9b70b82ded0ad6e84a06` |
| copy here | `files/tappet-r3.html` (copied from `evidence/x/downloads/dl-sweep/tappet/`) |
| companions | `files/companions/tappet-r1.html` (R1 whiffletree, `tappet (3).html`, sha256 `10b7ed87ab05...`), `tappet-r1-3d.html`, `tappet-r2-pin-module.html` (sha256 `0de44011e8cf...`), and the seven July 15 builds as `jul15-*.html` (`tappet`, `tappet-fab`, `tappet-mech`, `tappet-laser`, `tappet-affixed`, `tappet-print`, `tappet-3dprint`) |
| generator source | MISSING. R2 says "every mesh here is the exact STL the generator writes" and R3 says its integrator is "line for line the same integrator validated headless in physics.py" (line 106); neither the CAD generator nor `physics.py` was found. The meshes are embedded as base64 float and index arrays in the `model` JSON |

### 1.1 Revision table

From `sources/downloads/dl-sweep-unmatched.md` section 3.1 and the page titles.

| date | file | build |
|---|---|---|
| Jul 15 11:57 | `jul15-tappet.html` | rev A, averaging-rocker coincident lift, hand driven |
| Jul 15 13:22 | `jul15-tappet-fab.html` | buildable 2 x 2 or 3 x 3, 3 or 5 mm stock, DXF and STL |
| Jul 15 13:42 | `jul15-tappet-mech.html` | rigid-body seesaw on a slider riding a row bar and a column bar at two heights |
| Jul 15 14:17 to 17:12 | laser, affixed, print, 3dprint | flat parts with M3 pivots; every joint pinned (40 laser parts, 18 printed blocks, 27 M3); all printed with 1.75 filament offcuts as pins in 2 mm holes; in-line seesaws with zero overhang |
| Aug 11 20:21 | R1 (`tappet-r1.html`) | 4 x 4, whiffletree coincidence, two cam drums, three servos, lost-motion gate, solver margins |
| Aug 11 21:41 | R2 (`tappet-r2-pin-module.html`) | pin module with real generator meshes, solved stack, 0 clashes |
| Aug 12 05:22 | R3 (`tappet-r3.html`) | Jacquard griffe addressing, 4 servos, force integrator |
| Aug 12 17:04 | (OGEE) | first OGEE build, 12 hours later |

### 1.2 Why R3

Newest and the first whose selection is cheap: "Selection deflects free hooks, so it costs 1.8 N mm. Earlier attempts gated loaded pushers and needed 87 to 233 N mm. That is why this one works." (lines 93 to 94). Its motion comes from forces at a fixed step (`physStep`, lines 134 to 162) and its detent curve is computed from the groove and leaf, not drawn. R1 is kept beside it because it holds the solver with ten named assertions and the two-margin form of the half-select rule; R2 holds the solved stack and purchased parts.

## 2. What it makes and for whom

A maker with an FDM printer, three SG90, one MG996R, four 6 mm smooth rods and screws with heat-set inserts (R2 purchased parts, `tappet-r2-pin-module.html` lines 81 to 88) builds a 4x4 tactile display on a 20 mm pitch with a 10 mm pin stroke (`P.PITCH`, `P.STROKE`). "No magnets, rubber bands, bearings, belts or O-rings. The latch is printed into the deck." It is the reference for loom-style selection: the selected element is the one left alone.

## 3. Shots

Driven headless on 2026-10-05 with `fab-knowledge:originals/_tools/shoot-tang-sensors.cjs` (Chrome, swiftshader, 1280 x 860) by setting the rail controls (no hook). Three r161 is inlined as a data URL import map, fonts from Google. Console errors: 0 on all three pages (measured).

| file | what it shows |
|---|---|
| `shots/t02-r3-select-row1-col2-hooks-view.png` | hooks camera at 0.04x speed during "select and strike" on row 1 col 2: one amber hook standing over the knife, the rest dull and pushed aside by their needles; footer `knife 5.9 mm`, `queue 3`, `100 steps/frame` |
| `shots/t03-r3-checker-written-front.png` | iso after write frame with the checker bitmap: lit teal pins proud of the face deck, brass latch deck, guide deck, hooks below, clear bar on top; footer `9 / 16 latched`, `2500 steps/frame` (the ninth is the earlier single strike, see 5) |
| `shots/t04-r3-checker-top.png` | top camera on the same state |
| `shots/t05-r1-whiffletree-solver-margins.png` | R1: section of row 0 with tipping 4.75 and gap 14.5, the two cam drums, plan of the 4x4 field, coincidence window bar (half 11.3, full 22.5) and the margins half-select clearance 3.25 mm, full-select overshoot 3.25 mm; chip MECHANISM VALID |
| `shots/t06-r2-pin-module-real-meshes.png` | R2 pin module: face deck with 16 caps, brass latch deck, guide deck on standoffs; chip 0 CLASHES; solved stack list (face -2.50, latch -21.30, guide -32.80, pin down -26.05, pin up -16.05) |

## 4. Mechanisms and constructions

Line numbers are `files/tappet-r3.html` unless named otherwise.

### 4.1 Griffe selection (Jacquard addressing)

What it does: every hook is pushed sideways out of the knife's path unless its row and its column are both addressed. The knife then lifts only the hooks still over its blade.

The AND, `physStep` line 137: `tgt = max(i == row ? 0 : DESELECT, j == col ? 0 : DESELECT)`. Each hook has a lateral coordinate `hx` driven by a return spring `K_RET` 0.03 and a penalty contact against the needle target; a hook is selected while `hx < SEL_X` 1.1 (lines 138 to 142). Needles move `DESELECT` 2.2 (`P.DESELECT`); needle bar travel 15 mm (stated). The row and column plates each carry a slit and translate a full span so the slit lands on the addressed lane (`pose`, lines 244 to 246; `PLATE_TR` 60 in `stack`).

Knife: `KNIFE_TR` 14.7 travel (`PH`); a selected hook gets a penalty contact against the knife top (line 146); the hook pushes the pin through a gap `GAP0` 3.2 (lines 149 to 150). The knife lifts a selected hook 14.7; after the 3.2 gap that would carry the pin 11.5 against a 10.0 stroke, so the last 1.5 is spent against the hard stop at `STROKE` (line 158, a clamp, not a penalty contact) (computed). Hooks rest on a floor contact at z 0 (line 145) and their lateral motion carries 0.06 of viscous damping beside `K_RET` (line 138). `P` also carries `Q` 15, `STEP` 5, `TRAVEL` 15, `MISS` 5, `NOTCH_W` 4, `FOOT_W` 3, `HOOK_G` 1.4 and `CRANK` 11, which no line of the R3 script reads; they are generator parameters whose meaning the page does not give (unknown), except that `TRAVEL` 15 matches the stated needle bar travel.

Sequencer `pumpSeq` (lines 165 to 179): a pixel is `sel` (30 ms), `up` (90 ms ramp to `KNIFE_TR`), `down` (90 ms), `settle` (20 ms); a frame is `clearAll()` (`clrDown` 90 ms driving the clear plane down `STROKE + 1.5` = 11.5, `clrUp` 90 ms, `settle` 20 ms, line 167) then one `addressPixel` per set pixel (lines 266 to 267). Selection is per pixel, so a frame of n pixels costs n strokes.

Cost: select torque 1.8 N mm, 96x margin on an SG90; knife torque 18.7 N mm, 9.4x; select force for the whole plate 0.17 N; global clear 246 N mm, needs an MG996R (all stated, lines 85 to 92).

### 4.2 Printed leaf-spring detent latch

What it does: the pin carries a groove; two printed leaf beams in the latch deck ride its flanks. Two wells (down and up) with one ramp peak each.

`detent(z, v)` (lines 115 to 124): take the nearer well, `u = z` or `z - STROKE`; `d = 0` on the land (`LAND` 1.8 wide), `GD` 0.6 past the ramp, linear across the ramp width `RAMP`; normal force `K_LEAF d`; axial force `-sign(u) N tan(FLANK)` on the ramp, plus Coulomb friction `-sign(v) N MU`.

| constant | value | source |
|---|---|---|
| `LEAF_L`, `LEAF_T`, `LEAF_W`, `E`, `NF` | 10, 0.8, 5, 2000 MPa, 2 leaves | `P` |
| leaf stiffness `k` | 2.56 N/mm | `P`; equals 2 x 3 E (W T^3/12) / L^3 (computed) |
| groove depth `GD`, flank, `mu` | 0.6, 35 deg, 0.3 | `P` |
| ramp width | 0.8569 = GD / tan(35 deg) | `PH.RAMP`; matches (computed) |
| peak normal `Fpk` | 1.536 N = k GD | `P`; matches (computed) |
| breakaway, pin moving out of the down well | `Fpk (tan 35 deg + mu)` = 1.536 x 1.0002 = 1.536 N | computed from `detent()`; because tan 35 deg + 0.3 is 1.0002, the rail's "latch breakaway 1.54 N" equals both the peak normal and the axial breakaway. Leaving the up well the friction opposes the ramp force and the axial peak is `Fpk (tan 35 deg - mu)` = 0.61 N (computed) |
| pin mass, hook mass | 1.99 g, 1.44 g | `PH.M_PIN`, `PH.M_HOOK` |

The DETENT FORCE panel samples `detent(z, 1e-3)` once per canvas pixel over the stroke; its peak label reads "1.50 N peak" in every shot (measured) against the 1.536 analytic, because the peak sits at the far end of the ramp (z 1.757) and the 300 px canvas samples z every 0.0334 mm, so the nearest sample (z 1.739) gives 1.504 N (computed). It plots with the live pin position as an amber line (`plot`, lines 291 to 303); "Nothing here is drawn by hand."

### 4.3 Force integrator

`physStep(dt)` with `DT` 2e-5 s (line 132), positions in mm, velocities in m/s, forces in N: gravity on hook and pin; penalty contacts `pen(gap, rv) = -K_C gap - C_C rv` with `K_C` 30000 N/m and `C_C` 11 (line 125, `PH`); pin damping 0.05; hard stops at 0 and `STROKE`; the clear bar is a moving penalty plane at `STROKE + 1.5 - clear` (lines 151 to 154). `frame()` runs up to 4000 steps per animation frame and drops the backlog if it falls behind (lines 309 to 316). A pin counts as up when `pz > STROKE/2` (line 160). The footer shows sim time and steps per frame so a viewer can see it is integrating (lines 318 to 323).

### 4.4 Solved stack (R2 and R3)

`stack` in R3: deck 5.0 thick, pin 45.5 long, pin centre down -26.05, latch deck -21.3, guide deck -32.8, hook top -49.8, knife bill -57.8, needles -84.0, row plate -89.5, column plate -94.5 (z = 0 at the face). R2: "Solved from the latch engagement outward, not eyeballed. The cap nests flush in its counterbore when down and stands 10mm proud when up." (`tappet-r2-pin-module.html` lines 75 to 79).

### 4.5 R1 whiffletree with a lost-motion gate (companion)

What it does: two cam drums (columns, rows) each lift one lane; a whiffletree rocker under each pin averages its two feet, a 3:1 lever multiplies, and a lost-motion gap swallows a half select so the pin is never touched by one drum alone.

`SOLVED = {H 9.5, L 22.5, g 14.5, k 3, arm 10.5, pitch 27, ramp 40, F 2.0}` and fixed `STOPS 5, SWEEP 270, ROLL 2.5, DWELL 4.0, CLR 1.5, MU 0.10, TOL 0.50, MARG 0.8, ROCK_LIM 32` (`tappet-r1.html` lines 201 to 206). `derive()` (lines 209 to 243): tip `H/2`; rocker lift `Lr = L/k`; drum cell `DWELL + 2 Lr / tan(ramp) + CLR`; drum radius from four cells over 270 deg; rail force `k F/2 + FFRIC`; select torque `Ftan r`. The rule as two signed margins: half-select clearance `mg = g - L/2` and full-select overshoot `mp = (L - g) - tip`, both 3.25 mm at the solved values (computed), worst 6.5x the 0.50 print tolerance (computed). Ten checks (MG, MP, TOL, LH, RK, ARM, TQ, TC, DW, DIA) drive the MECHANISM VALID chip: "Same assertions as the headless solver. If a slider breaks the mechanism these go red before anything looks wrong on screen." Pins commit up from geometry when the push crosses tipping (`step`, line 277 onward, comment lines 274 to 276: "never let a solver decide the flip"). Lane lift `laneLift()` (lines 257 to 263) is a trapezoid in arc length: full `Lr` across the `DWELL` 4.0, falling linearly to 0 over `run = Lr / tan(ramp)`; `cellDrive()` (lines 267 to 272) takes the mean of the two feet, multiplies by `k` and by the set stroke, and only the excess over `g` pushes the pin. Clearing is per row in R1: the clear bar is gated by the Y drum, so a row clear presses `1.25 H` down on the lane at `yStop` only (lines 285 to 287), with `Tclear = (4 F k / 3) x 8` checked against half an SG90 (`TC`, line 237). Drum and stroke positions follow first-order lags at rates 11 and 9 per second (lines 278 to 281).

## 5. UX anatomy

R3 page:

| region | content |
|---|---|
| shell | dark teal instrument (`--bg #0d1113`, teal `#2ee6c5`, amber `#e8a33d`), JetBrains Mono, 344 px right panel, header `TAPPET.R3` with sub and a PHYSICS VALIDATED tag |
| stage | three r161 with ACES tone mapping, hand orbit (lines 273 to 288); cameras iso, front, top, hooks; boot cover "LOADING GEOMETRY" |
| footer | `n / 16 latched`, address, knife mm, queue, sim seconds, steps per frame |
| panel | VIEW (with the note "Amber hooks are selected..."), DRIVE (row and column selects, select and strike one pixel, speed 0.02 to 1x with "Slow it down to watch the needle bars push the unselected hooks aside before the knife rises"), FRAME (4x4 bitmap canvas to click, checker, ring, diag, full, blank, write frame, global clear), DETENT FORCE plot, VERIFIED NUMBERS |
| materials | lit teal emissive pins when up, amber emissive hooks when selected, brass latch deck |

What makes it excellent: the speed slider turns a mechanism that happens in 230 ms into something a person can watch, the hooks camera is aimed at the one place the AND happens, and the footer proves the sim integrates. Limits seen in the drive: write frame replaces the queue but not the running phase, so a strike already in progress finishes after the clear (9 of 16 after a checker write, measured); no hook object for a harness; R1 is a 2D SVG section and plan, not 3D.

## 6. Tests and harness

| tool | asserts |
|---|---|
| R1 `derive().checks` | ten named checks, chip MECHANISM VALID or not |
| R2 header chip | 0 CLASHES (stated, generator audit not shipped) |
| R3 | PHYSICS VALIDATED tag (stated; `physics.py` not shipped) |

No test file or headless runner shipped with any TAPPET build.

## 7. Port map

| item | value |
|---|---|
| packages | `mechanisms` (griffe selection, leaf detent, whiffletree gate), `sim` (penalty-contact integrator with fixed step), `constraints` (two signed margins against print tolerance), `motion` (strike sequencer) |
| feature kinds | `detent` (leaf beam on a grooved pin), `pin_in_slot`, MISSING: `slit-plate selector` (needle field behind a translating slit) as a kind |
| canon ids | `displacement-coincidence-latch` (CANONS.md line 405 lists OGEE R7 to R17; TAPPET R1 is the earlier source of the half-select rule, not cited); `whiffletree-dac` (line 398, a different use); MISSING: `jacquard-griffe-select`, `leaf-detent-pin`, `lost-motion-coincidence-gate` |
| reference ids | MISSING (no TAPPET row in the handoff INDEX) |
| milestones | M01 (two signed margins as constraint intervals), M02 (deterministic sim; the R3 integrator is a candidate fixture), M06 (canon entries) |
| lineage row | MISSING |
