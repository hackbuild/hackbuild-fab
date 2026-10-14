# OGEE (printed R7 to R10): how it is made

The first working OGEE: a 4x4 tactile pin display printed in PETG with no springs, screws or magnets in the drive train. Each pin stands on a rocker that averages a row bar and a column bar; a pin under both bars rises past one rigid latch plate and hangs on a printed shelf, a pin under one bar rises half way and falls back, and pulling the plate 1.5 mm drops every pin. Nine actuators (4 rows, 4 columns, 1 clear) for sixteen pins. This is the line that proved the latch; OGEE16 (`originals/ogee16/RECORD.md`) and STIPPLE (`originals/stipple/RECORD.md`) rebuild it in sheet. This record says how the printed line was built, from the original code.

Number rule for this file: constants are read from `files/src/source/params.scad` and `ogee.scad` at the lines named; figures marked stated are written in `files/BUILD.md` (R7 notes) or code comments and were not reproduced here; figures marked computed are by hand from the named constants; measured figures come from the headless drive of 2026-10-05.

Folder: `fab-knowledge:originals/ogee/` (files, shots, SHA256SUMS).

## 1. Identity and revision

| field | value |
|---|---|
| owner name | OGEE (bench `ogee`, chat "Charlieplexed tactile display matrix", conversation 9545b21d) |
| slug | ogee |
| canonical revision | printed line final state, `files/ogee.html`, 1,467,077 bytes, sha256 `34b54040649693b40d748bc7142b3ac93d5f95e5a16149e7807cf639bd6e2e3e`; same size as `~/Downloads/ogee (19).html` (2026-08-13 15:45) and `ogee (20).html` |
| source | `files/ogee-source.zip` (sha256 `700e8cb9b21b785e34e000e0e83d9e0605062979543fddccc798054cb10cc2ee`), unpacked to `files/src/source/`: `params.scad` (header R9, R10 comments), `ogee.scad` (header R6), `audit.scad`, `verify.py`, `printability.py`, `physics.py` (R5), `beam.py`, `cell_curve.json`, `sweep.py`, `sweep2.py`, `build_viewer.py`, `check_viewer.py`, `viewer_template.html` |
| exports | `files/ogee-stl.zip` (12 STLs: pin, rocker, rowbar, colbar, crankr, crankc, latchplate, face, base, wallx, wally, servomount) |
| notes | `files/BUILD.md` (R7 build notes) |
| owner uploads | `files/owner-uploads/` (six screenshots of 2026-08-12 and 2026-08-13 from the bench) |

### 1.1 Revision table

From `sources/downloads/dl-ogee-stipple-mech.md` section 3.1 and the file headers.

| rev | date | what it was |
|---|---|---|
| R1 to R4 | 2026-08-12 17:04 to 18:59 | bistable TPU metamaterial cell display (`beam.py`, `cell_curve.json`); killed by creep and force coincidence |
| R5 | 2026-08-12 19:20 | two plates, a latch plate and a cover (`physics.py` still reads R5 names) |
| R6 | 2026-08-12 19:50 | one notched rod per pixel, one sliding latch plate, one cover (`ogee.scad` header) |
| R7 | 2026-08-12 20:28 onward | rocker hinge: C bores snapping on 3 mm rods between posts (`BUILD.md`) |
| R9, R10 | 2026-08-13 | solid 4 mm pegs on the rocker, bore in a post on the bar, stations back on the 45 deg diagonal, dogleg rocker (`params.scad`) |
| final | 2026-08-13 15:45 | `ogee.html` as harvested; then the line moves to lasercut R12 on 2026-08-14 |

### 1.2 Why this state

It is the newest and last state of the printed line, and the one whose STLs, viewer and params agree (the viewer embeds `params.scad` values and the STLs at build time, `build_viewer.py`). Older states are the bistable TPU era or the finger-plate latch that released every set pin when a new one was admitted (stated, `BUILD.md` lines 20 to 23). The checkers in the zip rotted against it (section 6), which is itself a lesson the later benches fixed.

## 2. What it makes and for whom

A maker with an FDM printer and PETG prints twelve part types (`BUILD.md` lines 108 to 121) into a 4x4 tactile display on a 24 mm pitch (`params.scad:2`) with pins standing proud by the 3.40 tactile throw (computed from `params.scad:72`, `:64`, `:77`). Driven by hand through bell cranks on the walls or by eight SG90 on optional mounts. It is a bench machine to feel the latch work before scaling: the notes advise printing one pin, the latch plate and one rocker first and pushing them by hand.

## 3. Shots

Driven headless on 2026-10-05 with `fab-knowledge:originals/_tools/shoot-tang-sensors.cjs` (Chrome, swiftshader, 1280 x 860) by clicking the rail buttons (the page exposes no hook). Three.js 0.160 loads from unpkg, so the page needs a network. Console errors: 0 (measured).

| file | what it shows |
|---|---|
| `shots/g02-checker-written-8-of-16.png` | after the checker button. Pin tops rest flush with the face top (`FACE_Z + FACE_T` = 71 = `PIN_TOP`, computed) and a latched pin stands 3.40 proud, but under the translucent face at this distance the eight raised pins cannot be counted from the image and the STATE table is below the fold, so the shot shows the machine and not the count (looked 2026-10-05). Visible: the bell cranks on the -X wall, crank posts on the -Y wall; dark rail with WRITE A PIXEL, HAND MODE, FRAME, VIEW, PARTS AND SUBASSEMBLIES |
| `shots/g03-hand-mode-R1-held-half-select.png` | hand mode with R1 held: the rail note reads "one bar up: nothing reaches the plate. Half stroke does not even touch it." |
| `shots/g04-section-face-off-R1-C2-full-select.png` | face hidden, section on, R1 and C2 held. The section plane is `THREE.Plane((0,1,0), 12)`, which keeps y > -12, so it removes the -Y wall and its crank posts and opens the front; it does not cut through a row of cells. Visible: purple row bars, teal column bars, orange dogleg rockers on their posts, pins with feet pocketed on the crowns, the latch plate under the pin heads |

## 4. Mechanisms and constructions

### 4.1 Rod latch with compliance in the rod (canon `displacement-coincidence-latch`)

What it does: the pin's one-sided lug cams the loose rod sideways past the plate's slot edge and then hangs by its flat face on the plate top. One rigid plate holds and clears every pin.

Pin construction `pin()` (`ogee.scad:106` to `136`):
1. Foot cylinder `FOOT_D` 12.0 up to `FOOT_TOP` 37.6, shaft `SHAFT_D` 4.0 to `HEAD_Z` 57.0, head cylinder `HEAD_D` 5.0 capped by a sphere at `PIN_TOP` 71.0 (`params.scad:57` to `67`).
2. Lug: a polygon `[0,0], [LUG_OUT,0], [LUG_OUT,LUG_H], [SHAFT_D/2, LUG_H + RAMP_H], [0, LUG_H + RAMP_H]` extruded `NOTCH_W` 3.2 at `LUG_Z` 48.2, with `LUG_OUT = SHAFT_D/2 + NOTCH_N` (2.9 computed), `LUG_H` 0.5, `RAMP_H` 0.7 (`params.scad:61` to `66`). Built with `rotate([90,0,0])`; the comment records that `rotate([-90,0,0])` maps profile +y to world -z and built the lug upside down (`ogee.scad:114` to `115`).
3. Subtract the foot pocket: hull of two `POCKET_D` 8.4 discs spread over `POCKET_W` 9.6 in X with the +X end 0.45 deeper, plus a 1.0 tall 45 deg lead-in cone (`ogee.scad:127` to `134`). The deeper +X end makes gravity lean the rod toward the engaging edge: the return spring is a shape.

Latch plate `latchplate()` (`ogee.scad:143` to `162`): plate `LP_T` 1.6 at `LP_Z` 50.0 with a knob tab; per pin a slot hull of `SLOT_E` radius discs running back `SLOT_BACK = SLOT_E + NOTCH_N + LP_SLIDE + 0.2` and a `SLOT_CHAM` 0.6 underside ease (`params.scad:72` to `76`). `R_LATCH = (LP_Z + LP_T) - LUG_Z` = 3.40 (computed, `params.scad:77`).

Numbers (stated, `BUILD.md` lines 28 to 34): half select 2.30 mm, 32 percent below the latch; lug clears at 3.40; full select 4.60 with 1.20 over travel; lateral cam 0.90; engagement 0.90; pull to clear 1.50; slot ease 0.6 at 45 deg. "No material property appears in any of those numbers." (line 44).

Lessons (stated): compliance in the plate as fingers was tried twice and released every set pin when the plate moved to admit a new one (`BUILD.md` lines 20 to 23); the lead-in was once on the wrong face; latch height was once measured to the lug top instead of the flat face; widening stroke to 4.6 made the crank pads sweep into each other (`ogee.scad:240` comment).

### 4.2 Rocker as a displacement summer

What it does: output at the crown is the mean of the two bar heights. Stations sit on the 45 deg diagonal so the cell spacing is 24 sqrt 2 = 33.9 mm and rockers 2 C sqrt 2 long clear their neighbours (`params.scad:26` to `28`; `ROCK_LEN`, `ogee.scad:17`).

Construction `rocker()` (`ogee.scad:31` to `58`): a 4.0 plate (`ROCK_W`) made of three pairwise hulls (column end disc `END_R` 3.5 at `ROD_Z_C` 26.0 to the crown disc `BOSS_R` 2.5 at `BOSS_TOP - BOSS_R`; row end disc at `ROD_Z_R` 13.0 to the crown; a slimmer hull end to end), plus a crown cylinder reaching back under the pin, plus two pegs `PEG_D` 4.0 by `PEG_L` 5.0 with a `PEG_FL` 6.0 flange (`params.scad:22` to `48`). Dogleg: the column peg sits 4 mm over the column bar top and the row peg 4 mm over the row bar top; for a rigid rocker the output stays `(zA + zB)/2 + const` (`params.scad:29` to `31`). Printed on its largest face with pegs and crown up, no overhang (`ogee.scad:23` to `30`).

Bar posts `bar_post()` (`ogee.scad:63` to `78`): a 7 x 4 post with a round top and a bore `BORE_D` 4.30 (0.30 total on the 4 mm peg) whose mouth is pinched `LIP` 0.60 narrower, so the peg presses down and clicks in. The row end bore is a slot `SLIDE_E` 0.55 either way, half of the 0.91 mm chord shortening (`params.scad:41` to `42`).

State functions (`ogee.scad:274` to `287`): `barz(sel,k) = sel == k ? STROKE : 0`; `rockz = (barz_R + barz_C)/2`; `pinz = STATE ? max(R_LATCH, rockz) : rockz`; `rocktilt = asin((barz_R - barz_C)/ROCK_LEN)`; `pinx` switches to `PIN_CAM_X` -0.60 while the lug crosses the plate, else `PIN_REST_X` 0.30.

Dead parameters: `TINE_SLOT` 1.0 and `TINE_ROOT` 23.0 (`params.scad:39`, `:40`, "relief either side of the mouth") and `MOUTH_W` (`:25`) are defined but used by no module in `ogee.scad`, `audit.scad` or the viewer (grep 2026-10-05); the post that ships is a plain pinched slot with no relief tines, so the mouth's 0.30 interference on the 4.0 peg (3.70 mouth, computed) is taken by bending the whole post. The header comment at `params.scad:16` to `17` ("Stations are axis aligned") is stale against `:26` to `28` and the code, which rotates every post and rocker -45 deg.

R7 history (stated, `BUILD.md` lines 64 to 87): ball seats under a barbed keeper gave 0.46 mm of play against a 0.70 mm tilt swing and clamped the rocker; replaced by a hinge because a rocker pitches about one axis: C bores lipped 1.3 mm past a 3 mm rod centre, two relief slots making 6.3 mm flexures at about 2.4 N a side (17 N for a short lip), round bore at the column end, 0.7 mm slot at the row end. Rod stress 0.4 MPa; flexure 25 MPa at full spread against about 50 MPa yield, assembly only. R9 and R10 then replaced the C bores with solid pegs in post bores.

### 4.3 Bars, bell cranks and frame

Row bars `rowbar_part()` (`ogee.scad:80` to `91`) and column bars `colbar_part()` (`:92` to `101`): 7 wide strips (`BAR_W`) at `RB_Z` 1 and `CB_Z` 14, 8 tall, with the posts rotated -45 deg at each station and a 6 x 3.4 drive slot in the tail. Bars sit captive in wall slots `BAR_W + 2 FIT` (7.6) wide and `RB_H + STROKE + 1` (13.6) tall, starting `FIT` below the bar's drawn bottom (`ogee.scad:207` to `209`, `:231` to `233`), so each slot bounds the travel with 0.3 below and 1.0 above (computed). `BUILD.md` (R7 notes) states the bars rest on the slot bottom as a hard stop and are driven both ways by the crank pin; in the final scad the slot floor sits 0.3 under the drawn rest, so a bar resting on it rides 0.3 below the modelled height unless the crank pin holds it up (computed, not checked on a print). The bell crank's drive pin is a 3.0 x 10 cylinder at `CRANK_S` (`:246`) running in that 6.0 x 3.4 tail slot, so the pin has 0.4 of vertical play in it (computed).

Bell crank `crank()` (`ogee.scad:239` to `256`): hub 10, arm to a drive pin at `CRANK_S` 12, a second arm to a pad at `(0.15, 0.988) CRANK_L` with `CRANK_L` 30; bore `PIVOT_D + 2 FIT`, counterbore for the barb. Angle `crank_ang(z) = asin(z / CRANK_S)`. Cranks clip onto printed barbed posts `pivot_post()` on the walls (`:189` to `193`: shank 3.0, barb 4.4).

Servo option `servomount()` (`ogee.scad:265` to `271`): a 32 x 16 x 6 block with a 23.2 x 12.8 window for the SG90 body (0.4 over 22.8 and 0.6 over 12.2, computed) and two 2.2 screw holes at x 2.4 and 29.6 (27.2 apart, against the SG90's 27.8 tab hole pitch used in OGEE16; recorded, not resolved). The crank's pad arm carries a 2.6 hole at 0.55 of its length (`:251`), the place a servo link would hook.

Frame: base 4 thick, walls 8 thick with snap hooks `snap_hook()` (`:7` to `14`, `SNAP_E` 1.2) into the base and up into the face; face 10 thick with oblong bores `FACE_BORE` 5.3 spread from `PIN_REST_X` to `PIN_CAM_X` (`:166` to `175`); one deck ledge in the walls for the plate to slide (`:211`).

Fits: `FIT` 0.30 general; comment "pin in bore 0.25 total, snap latch face 0.2, sliding rail 0.25 per side" for a 0.4 nozzle at 0.2 layers (`params.scad:20` to `21`, `:93`). Print pins with a brim (38 mm tall on a ring); widest unsupported bridge 7.8 mm, the pocket ceiling (stated, `BUILD.md` lines 123 to 125).

### 4.4 Bistable TPU cell solver (the rejected route, `beam.py`)

What it does: a large-displacement corotational 2D beam FE for a pre-curved clamped-clamped beam `w0 = (h/2)(1 - cos(2 pi x / L))` loaded at midspan by a shuttle that fixes the midpoint's u and theta, which suppresses mode 2 (`beam.py:1` to `45`). Energy per element axial plus bending, solved by L-BFGS-B per prescribed midpoint displacement (`solve`, line 84); `characterize()` finds snap peak, apex and second stable state (line 108). `sweep.py` and `sweep2.py` grid Q = h/t and L. The family is the same as the click-spring solver the plan ports for PIP. OGEE dropped the bistable cell for creep (CANONS.md line 405 failure list).

### 4.5 Viewer build pipeline

`build_viewer.py` renders each part in assembly position through OpenSCAD, converts ASCII STL to binary, base64s them into `const MESHES` and substitutes `params.scad` values into `const P`, so "nothing in the viewer is retyped by hand". `check_viewer.py` regexes every `P.<name>` and `GEO.<name>` the viewer reads and fails if one is not embedded, because three.js swallows the NaN and the part silently vanishes.

## 5. UX anatomy

`viewer_template.html`:

| region | content |
|---|---|
| shell | dark instrument (`--bg #0e1013`, pink `#ff2e88`, 13 px monospace), 340 px right rail, hud "drag to orbit, scroll to zoom"; three 0.160 with OrbitControls from unpkg |
| rail | OGEE blurb; WRITE A PIXEL 4x4 (`drive(i,j)` eases both bars to full stroke and back over 520 ms); HAND MODE R0 to R3 and C0 to C3 hold toggles ("the same as pressing two paddles"); FRAME checker, diagonal, fill all, clear (pull latch plate); VIEW face plate, frame, section (`THREE.Plane((0,1,0), 12)` with `localClippingEnabled`, template line 243: three.js discards points where `y + 12 < 0`, so the cut is at y = -12 and removes the -Y wall, not a row of cells), exploded slider; PARTS AND SUBASSEMBLIES assembled or parts laid out, isolation buttons frame, plates, drive, rockers, pins; STATE table; one-line note |
| state table | pins latched, highest unlatched pin, lug clears plate at, lateral cam, half select, full select, tactile throw, latch plate pulled (`readout`, template lines 295 to 313) |
| explode | every part registered with `{dz,dx,dy}` along its assembly axis; live position in `.lz/.lx/.ly`; position is rebuilt from live plus offset and never read back |
| parts laid out | one representative per type on a 3-wide 90 mm grid, the way it sits on the bed (`applyView`, lines 264 onward) |

What makes it excellent: hand mode lets a person feel the half select by holding one bar, and the note tells them what the mechanism is doing in one sentence. Clear `doClear(900)` (template lines 217 to 221) eases the plate out and back and drops every latch once `lp > 0.9 LP_SLIDE`. The viewer's cam window `CAM_LO = LP_Z - (LUG_Z + LUG_H) - 0.6 RAMP_H` (line 183, 0.88 computed) is not the scad's `LP_Z - (LUG_Z + LUG_H + RAMP_H)` (`ogee.scad:278`, 0.60 computed), so the two disagree on when the pin steps sideways between rises of 0.60 and 0.88. Limits seen in the drive: the latch commits inside `apply()` on every frame (`commit`, line 187), which R16 replaced with commit at command time; `drive()` returns early while an animation runs, so a fast click sequence drops pixels; once a held pair latches, the note falls back to the rest message because `readout` only looks at unlatched pins; parts laid out moves parts but not the camera.

## 6. Tests and harness

| tool | asserts | state |
|---|---|---|
| `verify.py` | six scenarios, every part rendered by OpenSCAD at its real position, all pairs AABB prefiltered, manifold intersection over 0.5 mm3 is a hit unless the pair is in ALLOW | asks `audit.scad` for an `emit="comb"` part that it no longer emits |
| `printability.py` | facets steeper than 45 deg not on the bed, islands by downward ray cast, spans over 12 mm flagged NEEDS SUPPORT, bed 220 x 220 x 250 (line 22, line 91) | current |
| `physics.py` | for all 16 targets exactly one pin reaches `R_LATCH`; margins in percent | reads R5 names (`FING_T`, `COLLAR_D`, `LEAF_T`, `CP_SLIDE`) that no longer exist |
| `check_viewer.py` | every param and mesh the viewer reads is embedded | current |

The rot is the lesson: a check must declare which revision and parameters it applies to, or it skips silently. Not rerun here (trimesh and OpenSCAD not used in this pass).

## 7. Port map

| item | value |
|---|---|
| packages | `mechanisms` (latch, rocker summer), `sim` (corotational beam family), `checks` (mesh audit, printability, viewer lint), `ui-core` (explode registry, parts laid out, subassembly isolation, hand mode drive) |
| feature kinds | `latch`, `pivot` (peg in pinched post bore), `pin_in_slot` (row end slot), `snap` (wall hooks), MISSING: `snap-bore post` (pinched mouth peg seat) as a kind |
| canon ids | `displacement-coincidence-latch` (CANONS.md line 405, cites OGEE R7 to R17); MISSING: `rocker-summer` (dogleg rocker averaging two bars), `gravity-ramp-return` (oblong tilted foot pocket as the return spring), `printed-c-bore-hinge` (R7 lipped flexure bore) |
| reference ids | `mechanisms/coincidence-latch`, `joints/tab-slot` (both name OGEE); MISSING: a printed-line reference for the R10 cell |
| milestones | M02 (beam FE family), M04 (mesh audit ancestor), M06 (latch canon) |
| lineage row | MISSING |
