# SLUG: how it is made

Record written 2026-10-05 from the original code. Slug `slug`. Family sheet-machines. One bench: a lasercut gashapon (capsule vending) machine with an OpenSCAD source, a browser viewer that runs capsule physics against the baked cut outlines, a shelf nester with DXF and SVG writers, and a set of python and node audits.

Number rules for this file. A number in a code table is a declared value copied from the file and line named in that row. A number marked "computed" was rerun on 2026-10-05 with node v22.18.0 or python 3 against the files in `fab-knowledge:originals/slug/files/`: `audit.py` against the baked outlines extracted from `slug.html` line 272 (51 checks, 0 failures), the page's own `nest`, `sheetDXF` and `sheetSVG` functions loaded in node, and the page's funnel functions (lines 236 to 262). A number marked "measured" comes from the headless drive of the shipped page on 2026-10-05 (Chrome, swiftshader, 1280 x 860, 0 page errors, 0 console errors). "Inferred" means a reading of the code with no run behind it. "Declared (BUILD.md)" means the owner's build notes say it and nothing here reran it.

Short paths: `F` is `fab-knowledge:originals/slug/files/`. `S` is `F/slug.scad`. `H` is `F/slug.html`.

---

## 1. Identity and revision

| field | value |
|---|---|
| name | SLUG, lasercut capsule vending machine |
| owner's slug | slug (registry: slug, shipped, group mechanism, kernels shape motion fab) |
| chat | "Laser-cut gashapon vending machine design", conversation 21d782be-cd0c-4150-8049-4052d4cd2b92 |
| canonical file | `F/slug.html` |
| sha256 | 2d09238c27d5ca4bf023eeee44939b1500470ad2058822b8d0add48ec9bf3241 |
| bytes | 367953 (307566 of them on line 272, the baked `OUTLINES` blob) |
| date | 2026-08-16 17:54 (mtime of `~/Downloads/slug (12).html`, byte identical; `(13)` 18:32 and `(14)` 2026-08-17 17:07 are the same bytes) |
| source of truth | `F/slug.scad` (734 lines), `MODE` asm, cut, sheet, part |
| runtime | three.js 0.160 from esm.sh and Google Fonts; needs network, does not open offline |
| process | laser, 3 mm birch ply (structure) and 3 mm acrylic (window, door flap, thrust washers); zero printed parts, zero bearings, zero bushings |

### 1.1 Every revision found

| file | date | bytes | sha256 | what changed |
|---|---|---|---|---|
| `~/Downloads/slug.html` | 2026-08-16 11:50 | 42567 | 654005163b8a6cf8c8153ede6736a60ed2022c9e9f89566ceb881f9edf658244 | first viewer; outlines rebuilt in JS |
| `slug (1).html` to `(4)` | 13:53 to 14:33 | 46194 to 51523 | e938528c86d1..., 6d807521ae91..., 04a641768d8a..., 43ae59a803f3... | JS-built outlines, unseeded random spawn (five `Math.random` sites) |
| `slug (5).html`, `(6)` | 16:09, 16:48 | 302361 | 4061cd76075510d1631ce85267661e4f79562abc2de3a70dea24e2e9b7e062d9 | first baked `OUTLINES` blob from `bake.py` |
| `slug (7).html` | 16:58 | 306599 | c6d732dc661ee11ad14ee91f9a7625a34abc5a7105a5642ad7991b47926e188f | placement offsets |
| `slug (8).html`, `(9)` | 17:03, 17:16 | 307531 | ca4297392dd35240468bf9ba13e4f44500128ccb0e340adf94afd8825ae86fac | |
| `slug (10).html` | 17:26 | 351267 | 117d5163c9eb87df41eea2683b4039caaf47dd497c67a4ef34d4e7fb17a467b0 | nester and cut sheet tab |
| `slug (11).html` | 17:37 | 361327 | ec4dbf7d3b5c23628b19238392b0a3043aca12c4b93ff52160c48f6d08a2dc8d | radial posts `post_r [18,70]` through the pocket web, reject cup behind a front opening, acceptor at x -73 |
| `slug (12).html` to `(14)` | 17:54 to 08-17 17:07 | 367953 | 2d09238c27d5... | tangential rim spacers in two staggered tiers, external reject cup, acceptor at x -95; the canonical revision |
| `fab-work-directory:benches/slug/outputs/slug/` | harvest | | same bytes for `slug.html` | the whole output set, copied into `F` |

### 1.2 Why this revision

It is the newest and it is good. The diff from `(11)` to `(12)` (computed with `diff`, OUTLINES line elided) replaces the radial posts that cut the 5.2 mm pocket web with tangential spacers in the 13.4 mm rim, which is the fix for the crack the owner photographed at 17:38 (`F/uploads/Screen_Shot_2026-08-16_at_5_38_16_PM.png`). On this revision `audit.py` passes 51 of 51 results (computed), the page's nester rebuilds all ten shipped sheets in `F/sheets/` byte for byte in both DXF and SVG (computed), and the headless drive vends one capsule per coin with no errors (measured, shot `s04`). Nothing after 17:54 changed the file.

### 1.3 What is in `fab-knowledge:originals/slug/files/`

| path | what |
|---|---|
| `slug.html` | the shipped viewer, physics, nester, writers |
| `slug.scad` | geometry source of every part |
| `params.json` | parameter echo read by `audit.py` (drifted: see section 12) |
| `BUILD.md` | the owner's build notes: hardware, wiring, assembly order, failure record |
| `bake.py`, `inject.py` | SCAD to SVG to outline JSON, then into line 272 of the page |
| `audit.py`, `vol.py` | numeric audit; ASCII STL volume |
| `tri2.mjs`, `placecheck.mjs`, `nesttest.mjs`, `emit.mjs`, `svgcheck.mjs`, `drumcheck.mjs` | node tests against a module extraction of the page |
| `jointcheck.scad` | intersection test of nine drum part pairs |
| `sheets/` | the shipped cut sheets: 9 ply plus 1 acrylic at 600 x 400, SVG and DXF each |
| `uploads/` | the four owner screenshots: acceptor product page (2026-08-15 13:10), acceptor faceplate photos (2026-08-16 17:28, 17:29), rotor cut sheet showing the web crack (17:38) |
| `extracted/outlines.json` | the baked outlines pulled out of `slug.html` line 272, 46 parts (derived, for running `audit.py`) |

Left out: `slug.stl` (7.9 MB) because `MODE="asm"` uses the stale second `funnel3d` module (section 12), so the STL does not match the cut files.

Hashes: `fab-knowledge:originals/slug/SHA256SUMS`.

---

## 2. What it makes and for whom

A coin-operated vending machine for 50.8 mm (2 inch) capsules that a maker can cut on a 600 x 400 laser bed from 3 mm ply and glue together. Coin acceptor (JY-133A class, 12 V), 28BYJ-48 stepper on a ULN2003, ESP32-C3 SuperMini. Exterior 269 x 222 x 696 mm, interior 257 x 210 (declared, BUILD.md lines 7). A coin pulse credits; VEND turns the drum exactly one motor revolution; one pocket carries one capsule from under the hopper to the exit hole and down the delivery ramp to the front door.

The whole mechanism in four sentences. A 156 mm square funnel mouth feeds a 54 mm tall rotor drum with four 62 mm pockets; a hood (half the ceiling, 0 to 180 degrees) covers the exit side so the pocket over the exit cannot be refilled. A 76 tooth rotor driven by a 19 tooth pinion gives exactly 4:1, so one quarter turn of the drum (one pocket) is exactly one motor revolution, 4075.7728 half steps. The rotor's moving top face sits 1.9 mm under the mouth and shears any arch of capsules. Everything is flat ply joined by tabs in slots, with the funnel's three leaning panels joined to the ceiling and walls by slots whose size is derived from the lean angle.

---

## 3. Shots

From the headless drive (puppeteer-core through `fab-knowledge:originals/_tools/shoot-tang-sensors.cjs`, Chrome headless, swiftshader, 1280 x 860, 2026-10-05; the page has no hook, so the drive clicks the rail buttons and sends wheel events to the canvas). Copies in `fab-knowledge:originals/slug/shots/`.

| file | caption |
|---|---|
| `s01-machine-whole.png` | The whole cabinet, solid, camera dollied out 7 wheel steps. Paper stage, cream rail of instrument panels: COIN MECH readout (credit, vended, hopper), DRIVE readout (half steps, per vend 4075.8, state), step rate slider at 1000. The default camera (620, -720, 760) looks at the BACK and the right wall: the back upper opening, the back lower access hole, the cash drawer face at the bottom left and the carry slot near the top of the right wall. The front, with the hopper window, acceptor and door, faces away. |
| `s02-ghost-funnel-drum.png` | GHOST FRAME (opacity 12 percent): the funnel's three leaning panels and vertical back face over the ceiling, the toothed drum on the deck, the delivery ramp, cash drawer and electronics plate below. |
| `s03-drum-cage-pockets.png` | Front, sides, funnel, ceiling and roof unticked, zoomed in: the capsule pile resting on the rotor top face, the toothed pair and the cage, the deck lamination, motor plate and pinion at left. This is the shot that explains the metering. |
| `s04-vend-in-progress.png` | Coin then VEND: STATE VENDING, half steps 1500 of 4075.8, rotor 33.1 deg, motor 132.5 deg (4:1 visible in the legend). |
| `s05-explode.png` | After the vend (rotor 90.0 deg, motor 0.0 deg, vended 1), explode 160 mm, solid: every panel offset along its own direction, the delivered capsule below the deck. |
| `s06-cut-sheets.png` | CUT SHEETS tab: "10 sheets at 600 x 400", ply sheet 1 with front_upper, back_upper and the left lower side with its chute slots, 82 percent full, DXF and SVG buttons per sheet. |

---

## 4. Build pipeline and code map

```
slug.scad (parameters, 2D modules, MODE)
  -> bake.py: openscad -D MODE="part" -D PART=<name>  per part, 46 parts  -> /tmp/bake_<part>.svg
     parse path data, y flipped, round to 0.1, sort loops by area, drop repeated closing vertex
     -> /tmp/outlines.json
  -> inject.py: replace the line starting "const OUTLINES=JSON.parse(" in slug.html
  -> slug.html: extrude every baked loop set with THREE.ExtrudeGeometry at t,
                place by matrix (Mex, Myz, Mxz, MxzAt), run capsule physics against the same numbers,
                nest the same loops into sheets, write DXF and SVG
```

| file | lines | holds |
|---|---|---|
| `S` | 1 to 150 | parameters: stock, capsule, gear, drum, envelope, z stack, throat, motor, funnel, acceptor, coin path, delivery |
| `S` | 152 to 187 | helpers `tabc`, `tab_row_h`, `tab_row_v`, `slot_row_h`, `tslot`, involute `gear2d` |
| `S` | 189 to 225 | rotating parts: `rotor_mortise`, `rotor_common`, `rotor_gear`, `rotor_ring`, `rotor_top`, `spacer`, `pinion`, `thrust_washer` |
| `S` | 227 to 294 | horizontal plates, hood and throat, ceiling, stiffener, roof |
| `S` | 296 to 394 | vertical panels, splice, coin adapter plate, window |
| `S` | 396 to 468 | funnel: `fun_*` functions, `funnel_panel`, `funnel_back`, `funnel_ceiling_slots`, first `funnel3d` |
| `S` | 470 to 594 | coin path, reject cup, ramp, door, motor plate, cash drawer, turnbutton, electronics plate, `gauge` |
| `S` | 596 to 679 | 3D assembly; second `funnel3d` at 617 to 621 (the stale one OpenSCAD uses) |
| `S` | 681 to 734 | dead `sheet1`, `sheet2`; MODE dispatch with the 46 part names |
| `H` | 202 to 262 | `P` echo of the SCAD parameters, constants, funnel functions identical to the SCAD |
| `H` | 272 | `OUTLINES`, 46 parts baked from the SCAD |
| `H` | 279 to 455 | the old JS outline builders (`gear2d`, `plate_blank`, `ceilingSlots`, `funnelOutline`, ...), kept but no longer used by `build()` |
| `H` | 457 to 671 | three.js scene, materials, `slab`, placement matrices, `reg` and explode, `build()` |
| `H` | 673 to 954 | capsule physics: spawn, funnel planes, `plateTop`, `plateTopRect`, pockets, `step`, `relax` |
| `H` | 956 to 1035 | UI: coin, vend, jog, door, refill, reset, explode, ghost, sync, spec table |
| `H` | 1037 to 1197 | nesting, `placedLoops`, `sheetSVG`, `sheetDXF`, cut sheet tab |
| `H` | 1199 to 1231 | resize, fixed-step loop |

---

## 5. Mechanism: capsule pocket rotor (metering)

What it does. Four 62 mm bores on a 47.5 mm radius in a 54 mm tall drum carry one 50.8 mm capsule each from the fill half to the exit hole. The pocket is the only metering element. Capsules fall freely onto the rotor face through a wide mouth; whichever pocket passes under them fills; the hood keeps the pocket over the exit from being refilled.

Construction, in order (`S` lines 192 to 207):
1. `rotor_common(mw, off, both)`: a d 8.4 axle bore, four pocket circles d 62 at r 47.5, eight tie rod holes d 4.5 at r 11 and r 52 on the 45 degree diagonals, and (when `mw > 0`) six tangential mortises `[t + 2 slop, mw + 2 slop]` on r 85 at `off + i*60`; with `both` a second set at `off + 30`.
2. `rotor_gear(mw)` = `gear2d(2.5, 76)` minus `rotor_common(mw, 0)`. The bottom disc is `rotor_gear(0)`: no mortises, the tier A spacers land on it.
3. `rotor_ring()` = disc at the root radius (91.875) minus `rotor_common(18, 0, true)`: twelve mortises, both tiers.
4. `rotor_top()` = disc at the root radius minus `rotor_common(18, 30)`.
5. `spacer(gap)` = shoulder `[24, gap]` plus two tenons `[18, t]` below and above it. `spacer_a` spans `spc_gap1 = rot_ring_z - rot_gear_n*t` = 13 (computed); `spacer_b` spans `spc_gap2 = rot_top_z - (rot_ring_z + t)` = 29 (computed).
6. Stack (`S` lines 605 to 616): toothed disc at local z 0, toothed disc at 3, ring at 19, top at 51; six tier A spacers at 0, 60 ... degrees standing on the toothed pair, six tier B spacers at 30, 90 ... standing on the ring.

| constant | value | where |
|---|---|---|
| `cap_d` | 50.8 | `S:28` |
| `pock_d`, `pock_rc`, `npock` | 62, 47.5, 4 | `S:29 to 31` |
| `rot_h`, `rot_gear_n`, `rot_ring_z`, `rot_top_z` | 54, 2, 19, 51 | `S:46 to 49` |
| `spc_r`, `spc_n`, `spc_w`, `spc_body` | 85, 6 per tier, 18, 24 | `S:61 to 64` |
| `rot_bore` | 8.4 on an M8 axle | `S:67` |
| `tie_r`, `tie_r2`, `tie_d` | 11, 52, 4.5 | `S:68` (the page `P` and `params.json` say 70; section 12) |
| hood | 0 to 180 deg, r 100 | `S:270` |

Equations and results:
- Pocket clearance per side = pock_d/2 - cap_d/2 = 5.6 mm; exit clearance per side = exi_d/2 - cap_d/2 = 7.6 mm; the exit must beat the pocket (computed, `audit.py` lines 46 to 47).
- Capsule drift = pock_r - sqrt(r^2 - dz^2) for the ring nearest the capsule equator; equator at z_deckB + t + r = 331.4; the equator ring locates; drift 5.60 mm, under the 7.6 mm exit tolerance (computed, `audit.py` lines 33 to 43). Only the ring nearest the equator locates a sphere, so the cage locates exactly as a solid drum would.
- Web between adjacent pockets = 2 pock_rc sin 45 - pock_d = 5.2 mm; rim between pocket and gear root = 91.875 - 78.5 = 13.4 mm; adjacent pocket to exit 3.2 mm (computed).
- Pocket depth 58.6 mm against a 50.8 capsule; drum top to ceiling 1.9 mm; ceiling clears a carried capsule by 9.7 mm (computed).
- Material: the cage is about 0.65 sheets against 2.85 for eighteen solid 3 mm discs (declared, BUILD.md lines 176 to 182).

Fits. Mortise = t + 2 x 0.15; tenon 18 into an 18.3 slot, 3 mm of shoulder bearing either side; glued (declared, `S:55 to 57`).

Failure lessons (BUILD.md and code comments):
- Radial spacer slots through the 5.2 mm web left 0.94 mm of ply either side, a crack; moved to tangential spacers in the 13.4 mm rim (BUILD.md lines 190 to 194; owner screenshot 2026-08-16 17:38).
- Two tiers on the same angle wanted the same 3.3 mm ring slot; tiers staggered half a pitch, twelve slots at 30 degrees with 26 mm bridges (BUILD.md lines 196 to 199; `drumcheck.mjs`, `jointcheck.scad`).
- A 24 mm drum is dimensionally fine (drift 5.64) and still fails, because its moving face sits 23 mm below the mouth and cannot shear an arch; stalled at vend 9 with 21 left (BUILD.md lines 237 to 240). Rotor height is set by the moving-face-to-mouth gap, not by the gear.
- Without the hood the pocket on the exit is refilled from above and the machine hands out the hopper for one coin (BUILD.md lines 220 to 222).

---

## 6. Mechanism: integer metering ratio (gear train)

What it does. Makes one vend exactly one motor output revolution, so position error never accumulates per vend and the firmware counts whole revolutions.

Construction (`S` lines 171 to 187, 218 to 224): `gear2d(m, z, pa=20, steps=10)`: pitch r = m z/2, base r = pr cos(pa), addendum r = pr + m, root r = pr - 1.25 m; `inv_a(br, r) = tan(acos(br/r)) - acos(br/r)` in degrees; half tooth angle = 90/z + inv(pr); flank sampled from max(root, base) to addendum in 10 steps; one tooth polygon from the centre through the root, the mirrored flank and the flank, unioned with a root disc "so every tooth is welded", then rotated z times. The pinion is `gear2d(2.5, 19)` minus `intersection() { circle(d=5.1); translate([-10,-10]) square([18.15,20]); }` and three d 2.6 holes at r 14 (`S:218 to 224`). The box runs from x -10 to 8.15, which contains the whole r 2.55 circle, so the intersection is the full circle and the bore is ROUND: there is no D flat. The baked `pinion` outline confirms it, a 72 point circle of r 2.5 to 2.6 (computed from `extracted/outlines.json`). BUILD.md step 5 says "Pinion onto the D shaft" and the motor table says "5 mm, flatted" (BUILD.md lines 147 and 324). As cut, the pinion pair only grips the flatted 28BYJ-48 shaft by friction or glue. A port should cut the flat: for a 5 mm shaft with 3 mm across the flats, the box edge belongs at x 1.5, which means `square([11.5, 20])` from x -10.

| constant | value | where |
|---|---|---|
| module `gm` | 2.5 | `S:34` |
| `gz_rot`, `gz_pin` | 76, 19 | `S:35 to 36` |
| pressure angle | 20 | `S:37` |
| centre distance | gm (76 + 19)/2 = 118.75 (the comment on `S:38` says 106.25, stale) | `S:38`, `H:205` |
| ratio | 76/19 = 4 exactly | `S:39` |
| half steps per output rev | 4075.7728 | `H:224` |

Equations and results (computed, `audit.py` lines 20 to 31): centre distance equals the sum of pitch radii (118.75 vs 118.75); ratio 4.0000 integral; pinion 19 teeth over the 17 tooth undercut limit; contact ratio 1.68 (check wants over 1.2); gear face 6 mm on the laminated toothed pair. 4075.7728 = 25792/405 x 64 half steps, the 28BYJ-48 gear train (computed: 4075.7728395). Rotor degrees per half step = 90/4075.7728 = 0.02208 (computed). At 1000 half steps per second one vend takes 4.08 s (computed). Torque: 0.025 Nm needed at the rotor against 0.034 Nm x 4 = 0.136 Nm (`audit.py` line 69, hard-coded; BUILD.md line 171 says "roughly 0.08 available"; both declared, neither measured).

Fits. Cut with kerf compensation off: parts come out about 0.15 mm small, which is the gear backlash (declared, `S:12 to 14`).

Limits. The 28BYJ-48 shaft stands 10 mm above its flange. BUILD.md lines 328 to 331 say the flange lands at z 318 and the pinion pair sits at 320 to 326 with 2 mm spare each side; those are 6 mm stock numbers and are stale (declared). In the 3 mm geometry the motor plate is a laminated pair at `z_mplate` 306, so 306 to 312 (`S:79`; the page draws two slabs, `H:599 to 600`; `PART_QTY.motor_plate` is 2), and the pinion pair sits at `z_pin = z_rot` 310.6 to 316.6 (`S:82`). The pinion's lower 1.4 mm therefore occupies the same z as the upper motor plate lamination, inside the plate's footprint (the plate runs x -28 to 12 and y -38 to 38 about the shaft, the pinion tip radius is 26.25) (computed). The SCAD assembly draws only one motor plate (`S:646`), which is why the clash does not show there. `audit.py` line 66 checks only `z_pin + t <= 328` and never compares the pinion with the motor plate. A builder has to either glue a single motor plate, or raise the pinion pair by at least 1.4 mm and lose that much of the 6 mm gear face. The pinion bore in the page's old JS builder (`H:336`) is round too.

---

## 7. Construction: tilted plate through plate (funnel)

What it does. Three funnel panels lean at different angles (the throat is not centred in the box) and each joins the ceiling with two feet and the side or front wall with two heads. A foot leaning as it descends sweeps a band, not a line, and a head crossing a vertical wall sweeps vertically; the slot sizes are derived from the lean.

Construction (`S` lines 396 to 462; JS twin `H` lines 236 to 262):
1. For face p (0 front, 2 left, 3 right): `run` = horizontal distance from the mouth edge to the wall; `dz = z_funtop - (z_ceil + t)` = 145.5 (computed); `ang = atan2(dz, run)`.
2. Place the panel by its INNER face: `R0 = fb + (t/2)/sin(ang)`.
3. Slant width `uw = (run - (t/2)/sin(ang))/cos(ang)`; cut length `s = uw - (t/2) tan(ang)` so the outer face lands on the wall.
4. Panel polygon from the bottom edge `[bL, bR]` to the top edge `[tL, tR]` (side panels lap 6 mm off the front panel, `f_lap`); feet `[16, q_tab=3]` at 25 and 75 percent of the bottom; heads `[26, head_len]` at 30 and 70 percent of the top; d 20 lightening holes every 70 mm of slant.
5. Ceiling foot slot: a radial band from `R0 - q_tab cos(ang) - (t/2) sin(ang)` to `R0 + (t/2) sin(ang)`, width 16, widened by slop.
6. Wall head slot: height `t tan(ang) + t/cos(ang)` centred at `head_z = z_ceil + t + ((run + t/2 - (t/2)/sin(ang))/cos(ang)) sin(ang)`; `head_len = t/cos(ang) + 3`, so each head stands about 3 mm proud as a wedge point.
7. The back face is vertical (its run would only be 19 mm): a plain tabbed panel with tabs into the ceiling and both side walls.

| face | rake (computed) | R0 | slant cut s | foot band r | head slot height | head_z |
|---|---|---|---|---|---|---|
| front (0) | 79.49 deg | 79.53 | 131.54 | 77.50 to 81.00 | 32.61 | 514.86 |
| left (2) | 63.04 deg | 79.68 | 156.58 | 76.99 to 81.02 | 12.52 | 514.64 |
| right (3) | 79.49 deg | 79.53 | 131.54 | 77.50 to 81.00 | 32.61 | 514.86 |

All computed from the page's funnel functions with `P` (`H:202 to 262`).

Throat and hood. The ceiling hole is the funnel mouth square itself, `offset(r=38)` of a square of half width 78 - 38, minus the hood half disc (0 to 180 deg, r 100) (`S:270 to 279`). Mouth 2 fb = 156 mm = 3.07 capsule diameters (computed). A round throat under a square mouth leaves a ledge.

Failure lessons:
- A 62 mm round throat under a 76 mm square mouth left a 7 mm ledge and a capsule parked on it forever; the throat is now the mouth square (BUILD.md lines 226 to 227).
- Panels placed by their mid plane pulled the mouth from 58 to 49.9 mm under a 50.8 capsule; placement by inner face (BUILD.md lines 229 to 231; comment `S:408 to 410`).
- A 58 mm mouth (1.14 diameters) arched: six trials, mean 5.5 of 13 vends, worst 2 (declared, BUILD.md lines 233 to 235). Spheres arch across anything under 2 diameters.
- Foot slots open into the throat. In the baked ceiling (computed from `extracted/outlines.json`), the slots for the rear feet of the left and right panels and for the centre back tab are merged into the throat loop; the left rear foot slot reaches r 76.8 against the throat edge at 78, so it opens by about 1.2 mm, and the right by about 0.6 mm. BUILD.md line 271 says 0.19 mm; that figure is stale. The feet still bear outboard (declared).

This is a reusable kernel: a plate crossing a plate at an angle, with slot sizes from (angle, thickness, station).

---

## 8. Construction: tab and slot cabinet, split seam, tee-slot bolts

What it does. Five horizontal plates (base, deck lower, deck upper, ceiling, roof) and a stiffener frame tab into four walls; the walls split at z 306 into lower and upper panels bolted through splice plates so the machine comes apart in two.

Construction (`S` lines 152 to 168, 227 to 394):
- `plate_blank(tw=30)`: the interior rectangle `[XL..XR] x [YB..YF]` plus three 30 mm tabs per side, depth t, at `tabc(a, b, 3)` = 1/6, 1/2, 5/6 of each edge.
- `slot_row_h`: matching slots `[w + 2 slop, t + 2 slop]` in the walls at each plate z (0, 300, 303, ceiling, 690).
- `tslot()`: a tee slot 18 deep, 4.4 bolt width, 7.3 x 3.4 nut pocket at 11 from the edge, two per side wall edge at y +-32, for M4 x 30 bolts from the side panels into the decks.
- Vertical panels carry absolute machine z as their local y (`S:299`), so slot z values are the plate z values.
- The coin wall, ramp rails and drawer tray use the same `tabc` stations.
- Hood stiffener at z 530 braces all four upper panels (`S:288 to 293`).

| constant | value | where |
|---|---|---|
| `t`, `ta` | 3.0, 3.0 ("MEASURE YOUR STOCK, IT IS NOT 3.00") | `S:23 to 24` |
| `slop` | 0.15 per side | `S:25` |
| envelope | XL -152, XR 105, YB -105, YF 105 | `S:72` |
| z stack | base 0, deckA 300, deckB 303, motor plate 306, drum 310.6 to 364.6, ceiling 366.5, funnel top 515, stiffener 530, roof 690, split 306 | `S:76 to 87` |

Results (computed, `audit.py` lines 95 to 105): every z band ends before the next starts; the motor plate shares the drum's z band but sits 9.25 mm outboard in x (plate to x -106.75, drum from x -97.5); the split seam is on a panel joint; slot 3.30 vs stock 3.00, 0.30 total clearance, under a kerf.

Fits and cut settings. Slot = t + 2 x 0.15; kerf compensation OFF; parts about 0.15 small (declared, `S:12 to 14`, BUILD.md lines 73 to 77). Glue every tab joint except the seam, which is bolted (declared, BUILD.md line 111). Deck lamination screws countersunk M4 x 16 on r 88 because the rotor clears the deck by 4.6 mm (declared, BUILD.md line 104).

Failure lessons: the 3 mm change put the coin wall's upper tab slot into the coin return opening and left a 5.9 x 0.8 mm island (tab stations moved to z 30 and 75); the return opening merged with the delivery door into an L hole; the 3 mm back upper panel spanned 320 mm unsupported (stiffener added) (BUILD.md lines 9 to 22).

---

## 9. Mechanism: coin path, cash drawer and acceptor adapter

What it does. Accepted coins fall onto a sloped chute into a drawer that pulls out through the back panel; rejected coins come out of the acceptor's own faceplate into an external cup; all acceptor-specific holes live on one small adapter plate cut last.

Construction (`S` lines 102 to 139, 357 to 366, 470 to 514, 558 to 594):
- Coin wall at x -59, base to z 140, tabs into base, front and back; the chute (87 wide) is tabbed into the left wall and the coin wall at stations 0.25, 0.5, 0.75 along its length; its slots are rotated by the chute angle.
- Cash drawer 84 x 106 x 60 sliding through an 88 x 72 back hatch; face 92 x 84 with a 40 x 8 finger pull; lasercut turnbutton (hull of d16 and d11 circles 26 apart) holds it.
- `coin_plate()`: 99 x 155 adapter with the 40 x 98 body cutout, the acceptor's bolts as 12 mm slots of d 4.6 at 51.5 x 103, and four M4 holes at 85 x 141 to the front panel's plain 60 x 112 window.
- `gauge()`: a test part carrying the adapter cutout and bolt slots, a faceplate width notch, a tab slot gauge, an M8 axle gauge (d 8.4) and a "D shaft gauge" that is a plain d 5.1 circle (`S:592`), so it tests the shaft diameter but not the flat. Cut it first.
- External reject cup (floor, two sides, lip) hung under the faceplate. The only cup part with bolt holes is `ret_back`, an 80 x 28 plate with two d 4.4 holes 44 apart at 6 mm below its top (`S:511 to 514`), which line up with the two front panel holes at `ca_pos[0] +- 22`, z 112 (`S:351`). `ret_back` is baked but appears neither in the SCAD assembly (`S:667 to 672`) nor in `PART_QTY`, so as shipped the cup has nothing to bolt through. The floor's two side strips (`S:505`) lie inside its own rectangle and add nothing, so the floor, sides and lip meet edge to edge with no tabs: glued butt joints. In the page the cup is drawn as boxes, not baked outlines (`H:643 to 653`).

| constant | value | where |
|---|---|---|
| acceptor centre | (-95, 200) on the front panel | `S:109` |
| faceplate | 67 x 123, bolts 51.5 x 103, edge margin 7.8 | `S:110, 115`; measured off product photos, cross checked to the 65 x 123 published family size (declared) |
| chute | (y,z) (-20, 76) to (80, 143), width 87 | `S:123 to 125` |
| reject cup | 60 x 34, z 90 to 118 | `S:136` |

Results (computed, `audit.py` lines 74 to 89): chute rake 33.8 deg (audit wants 25 or more; BUILD.md line 287 says 41.8, stale); drawer 84 in an 88 opening; ply between bolt slot and body cutout 3.45 mm; window clears the body by 10 and 7 mm; cup top 118 under the faceplate bottom 138.5; cup clears the delivery door by 15.0 mm.

Wiring (declared, BUILD.md lines 124 to 133): acceptor 12 V; COIN line open collector, 10k pull-up to 3.3 V on a GPIO, shared ground; pulses 20 to 100 ms, debounce in firmware; ULN2003 IN1 to IN4 on four GPIO. No firmware ships in the outputs.

---

## 10. Mechanism: delivery ramp and door

Ramp (`S:519 to 543`): a 94 wide panel at (y,z) (-20, 120) to (95, 35), length 143.0 and -36.5 deg (computed, `H:215`), tabbed into two rails at three stations; rails tab into the base at y +-38 around the ramp middle; three d 24 lightening holes. Door: a 100 x 70 opening at z 30 to 100 in the front lower panel and an acrylic flap 122 x 92 hinged on M3 screws (`S:142, 544 to 549`). The flap's hinge holes are d 3.2 centred at x +-60 on a flap whose edges are at +-61, so each hole breaks out of the side edge (computed: 1.0 mm from centre to edge against r 1.6; the baked `door_flap` is a single 110 point loop with the two bites in its outline). The opening is about 2.5 mm wide, so an M3 shank stays captured, but only by a 0.6 mm hook of acrylic; expect it to crack. A port should move the holes in to x +-57 or widen the flap. The flap hangs inside the cabinet behind the front panel (`H:546 to 547`). The hopper window (231 x 135 acrylic, `S:394`) carries no holes; the six d 3.4 holes in the front upper panel sit at x = XL + 13 and XR - 13 (`S:382`), which is exactly on the window's left and right edges as the page places it (x -139 to 92, `H:544 to 545`), so the screws can only clamp the acrylic edge under a washer (inferred). The page's physics models the ramp as the plane with normal (0, 85, 115) and side rails at ramp_w/2 (`H:873 to 886`).

---

## 11. Simulation: capsule physics (`H` lines 673 to 954)

What it does. Drops capsules into the real funnel, mouth, hood, rotor pockets, deck exit and ramp, and lets a vend move them, so a jam in the viewer is a jam on the bench (comment `H:186 to 189`). The sim never decides the vend: VEND sets a step target and the physics reports where capsules went (`H:965 to 969`, `H:1213 to 1222`).

Algorithm, per fixed step DT = 1/240 s (`H:1208`), gravity 9810 mm/s^2:
1. Integrate; clamp to the box interior with restitution 0.2; the front wall opens below the door when the door is open.
2. Funnel faces as FINITE panels (`hitFunnel`, `H:720 to 740`): on the face, push out along n and reflect with 1.15 normal factor and 0.93 damping; below the bottom edge, collide with the edge as a line (1.1, 0.9). Infinite planes wedged every capsule in the mouth, a sim artefact (comment `H:707 to 710`).
3. Ceiling: solid inside the hood (`inHood`, r 100, 0 to 180 deg); elsewhere `plateTopRect` with perch-on-rim contact at the mouth square.
4. Rotor (`H:839 to 868`): a capsule below the rotor top inside a pocket bore is clamped to `pock_d/2 - r` and dragged at the wall's tangential velocity (75 percent blend at the wall, `dt*9` relaxation inside); on the solid top face it is dragged at `dt*7` (this is what shears an arch); one found under the face outside a pocket is lifted back.
5. Deck top with the exit hole: `plateTop` (round hole, perch on rim). Ramp plane and rails below the deck.
6. Pairs: positional split plus impulse with factor 0.55, then `relax(4)`: four position-only passes that re-apply walls, pocket clamps and the exit rule, moving a capsule in the drum band whichever way out is cheaper (sideways into the pocket or up onto the face).
7. Speed cap 2600 mm/s ("never outrun the contact test"), damping 0.9975 per step.
8. Spawn on a 52 mm lattice above z_funtop + 40, alternate layers offset half a pitch; 18 at reset, 12 per refill; random lateral velocity +-10 mm/s from `Math.random`.

Drive: rotor degrees per half step 90/4075.7728; slider 200 to 1800 half steps per second, default 1000; jog quarter turn.

Sim against cut, where they differ (inferred from `H:766 to 800` and `S:274 to 279`):
- The sim's mouth is a sharp 156 mm square (`plateTopRect` with half width `fb`), while the cut throat is `offset(r=38)` of a square, a rounded square with 38 mm corner radii. In each corner the sim treats about 310 mm² (computed, (1 - pi/4) x 38²) as open where the ply ceiling is solid, so a capsule the sim drops through a corner would perch on the real ceiling.
- The drum's outer rim and the gear teeth are not modelled; only the pockets, the top face and the deck exit are.
- VEND increments `vended` when it is pressed (`H:968`), so the VENDED readout counts commands, not capsules that reached the door. There is no delivered-capsule counter in the page, which is one reason the 126 of 128 trial claim cannot be rerun from it.

Result claims: "126 of 128 vends across eight trials delivered exactly one capsule; the two misses are both the first vend of a run, with the pocket starting empty" (declared, BUILD.md line 266). The multi-trial runner is not in the outputs or in Downloads; the page is single-run and unseeded (`H:701`). The claim stays unverified until M02-T08 rebuilds the runner seeded.

Failure lessons (code comments): random spawn started capsules 47 mm inside each other and blew the pile through the plates (`H:682 to 684`); one impulse pass could not hold 26 spheres apart (`H:913 to 915`); snapping to the pocket axis teleported capsules 25 mm through ply (`H:939 to 940`); testing the clamped radius let a shoved capsule escape and wander the deck (`H:842 to 844`).

---

## 12. Viewer, bake and the one source of truth

The viewer extrudes the baked SCAD outlines, not a JS rebuild (`H:264 to 271`). Placement matrices: `Mex(z)` for plates, `Myz(x)` for side walls (local x to world y, local y to world z), `Mxz(y)` for front and back; `MxzAt`, `MyzAt`, `MexAt` add the 2D origin offset a SCAD module was drawn about (the window from its corner, the coin plate and drawer face about their centres) (`H:500 to 508`). Explode offsets each mesh from its stored base position along a per-part direction (`reg`, `H:515 to 524`); writing an absolute offset had teleported directly positioned parts to the origin. Ghost clones each shell material and remembers its opacity so the acrylic stays at 0.30 (`H:994 to 1013`).

Failure lessons: the JS rebuild drifted, the ceiling got twelve hole paths overlapping the throat, three.js gave up triangulating, the hopper opening was never cut, and 13 parts disagreed with their cut files (BUILD.md lines 251 to 256; `tri2.mjs`). The bake pipeline is the fix.

Drift that remains (computed or read 2026-10-05):
- `tie_r2` is 52 in `S:68` and the baked cut, 70 in `params.json`, the page `P` (`H:208`) and BUILD.md line 100.
- `ca_pos` is (-95, 200) in `S:109` and `H:221`, (-73, 200) in `params.json`; `audit.py` hard-codes -95.
- `funnel3d` is defined twice (`S:463` and `S:617`); OpenSCAD keeps the last, which iterates faces 0 to 3 (including the absent face 1) and translates by `fb` (mid plane). `MODE="asm"` and `slug.stl` carry the old funnel; the baked cut outlines are right.
- `sheet1()` calls `rotor_disc()`, which no longer exists; `MODE="sheet"` renders nothing (`S:686`).
- The spec table reads `P.rot_lay`, which is undefined, so the "rotor stack" row prints "undefined x 3 = 54 mm" (`H:1031`).
- The cut sheet set is labelled "6 mm ply" (`H:1154`) while stock is 3 mm; the SCAD header still says 6 mm ply (`S:6`).
- BUILD.md says 41 checks, `audit.py` produces 51 results from 45 call sites; BUILD.md says 33 baked parts, the blob holds 46; BUILD.md says 10 ply sheets, the nester gives 9 ply plus 1 acrylic (all computed).
- BUILD.md drum text says "eight posts"; the code builds twelve spacers (six per tier).
- `MODE="sheet"` renders nothing because its dispatch branch is empty (`S:705 to 706`); `sheet1` and `sheet2` are never called, and `sheet1` would also fail on the missing `rotor_disc` (`S:686`).
- The page's z comments are 6 mm era: `ZCEIL_TOP` "378.5", `ZROT_TOP` "370.6", `ZDECK_TOP` "312" (`H:227 to 229`) against computed 369.5, 364.6 and 306.
- The SCAD comment at `S:574` says two turnbuttons hold the drawer; the back lower panel has one pivot hole (`S:372`) and `PART_QTY.turnbutton` is 1.
- The 3D is the cut file for the cabinet, funnel, drum, drive plates, ramp and coin wall, but not everywhere: the cash drawer tray, the reject cup and the acceptor body are BoxGeometry (`H:629 to 658`), the thrust washer and motor body are cylinders, and `turnbutton`, `splice`, `ret_back` and `gauge` are baked but never drawn.

---

## 13. Construction: nesting and writers (`H` lines 1037 to 1197)

`nest(names, W, H, gap, margin)`: expand by `PART_QTY`; sort by max side, largest first; each part tries 0 and 90 degrees; first fit into an existing shelf whose height fits, else a new shelf below, else a new sheet; parts that fit neither orientation go to `nest.oversize` and the page prints them in a red box instead of dropping them. Fill = bbox area over sheet area. Defaults 600 x 400, gap 4, margin 6. `placedLoops` maps a rotated part as `[x + h - v, y + u]`.

`sheetSVG(sh, W, H, forCut)`: one evenodd path, y flipped, pink dashed bed outline; for the cut file `width="600mm"` and stroke 0.4; the preview has a viewBox only and `vector-effect="non-scaling-stroke"` (an SVG tagged 600mm rendered about 2270 px and ran off the page). `sheetDXF(sh)`: `$INSUNITS 4` header only, entities as `POLYLINE` with `66 1`, `70 1`, `VERTEX` records and `SEQEND`, all on layer CUT; no `$ACADVER`, no layer table, no handles.

Results (computed with the page's own functions):

| bed | ply sheets | acrylic sheets | oversize |
|---|---|---|---|
| 600 x 400 | 9 | 1 | none |
| 900 x 600 | 4 | 1 | none |
| 400 x 300 | 20 | 1 | none (front_upper is 263 x 387, it fits 388 by 1 mm) |
| 1220 x 610 | 3 | 1 | none |

At 600 x 400 the ten sheets equal the shipped `F/sheets/` files byte for byte (DXF and SVG); loops per ply sheet 34, 26, 38, 97, 52, 38, 39, 89, 5 (computed).

Defect found 2026-10-05 (computed): `PART_QTY` (`H:1042`) lists 42 names and omits `window`, `door_flap`, `ret_lip` and `ret_back`, although all four are baked. The acrylic sheet therefore carries only three thrust washers (1 percent full) and the shipped sheets never cut the hopper window, the door flap, the reject cup lip or the cup's bolting plate. Add them to `PART_QTY` (window 1, door_flap 1, ret_lip 1, ret_back 1) before cutting; without `ret_back` the cup has no bolt holes (section 9).

File names. The page names downloads `slug_${label.split(" ")[0]}mm_sheetN`, which gives `slug_6mm_sheet1.dxf` for ply and `slug_3mm_sheet1.dxf` for acrylic (`H:1181`, `H:1196`). The shipped files are `slug_ply_sheetN` and `slug_acrylic_sheet1`, so they were written by `emit.mjs`, not by the page's buttons; the bytes inside match (computed).

---

## 14. UX anatomy

| part | what is there |
|---|---|
| shell | paper `--cream #f5f0e6`, ink header with a pink rule, Permanent Marker title "SLUG.", VT323 readouts in slime `#a6e22e`, Special Elite body, Plex Mono buttons with 3 px block shadows (`H:10 to 99`) |
| tabs | Machine, Cut sheets |
| stage | three.js, OrbitControls with damping 0.08, legend overlay with live rotor and motor angles and the hint "ghost the frame to watch the pockets work" |
| rail panes | COIN MECH (credit, vended, hopper; insert coin, vend, open door), DRIVE (half steps, per vend, state; step rate; jog quarter turn), VIEW (explode 0 to 260, frame opacity 4 to 100, ghost, solid, seven group checkboxes, refill, reset), CUT SHEETS (W, H, gap, margin, re-nest, download all DXF), NUMBERS (spec table) |
| drive pad | the coin and vend buttons are the drive; VEND refuses without credit ("NO CREDIT") or while busy ("BUSY") |
| readouts | credit, vended, hopper count (capsules above the ceiling), half steps, per vend, state |
| warnings | oversize parts listed on the cut sheet tab |
| exports | DXF and SVG per sheet, download all DXF |
| missing | steps, guide, welcome card, `BENCH` or `HB` hook (tests use a module extraction with `globalThis.__x`) |

What makes it excellent: the 3D is the cut file (one source, extruded, triangulation area checked); the physics runs against the same numbers and the same finite panels, so the arching failure was found in the browser; every failure is written next to its fix with a number.

---

## 15. Tests and harness

| test | what it asserts | runs today |
|---|---|---|
| `audit.py` | 45 `chk()` call sites, 51 results across gear, capsule, funnel, motor, box, coin, acceptor, stack, joinery, capacity, drive, cut | yes, with the outline path changed: 51 checks, 0 failures (computed) |
| `tri2.mjs` | every baked outline extruded by three.js; cap face area equals loop area within 2 percent | no: imports `/tmp/app.mjs` and `/home/claude/slug/node_modules/three` |
| `placecheck.mjs` | appliqué parts bracket their openings within 0.6 mm; reject cup under the faceplate and clear of the door; every mesh inside the envelope | same dependency |
| `nesttest.mjs` | overlaps and off-sheet parts at four bed sizes | same; the nest itself reruns in node (section 13) |
| `emit.mjs` | writes `sheets/` at 600 x 400 | same; reproduced byte for byte (section 13) |
| `svgcheck.mjs` | preview SVG has no width and uses non-scaling stroke; export has mm width and coordinates inside the bed | same |
| `drumcheck.mjs` | 12 spacers on r 85, radial extent under 8 mm, standing over 10 mm, tier z values | same |
| `jointcheck.scad` | intersection of nine named drum pairs | needs `core.scad`, absent |

The harness pattern is the module extraction: strip the page's script into `/tmp/app.mjs` exporting `globalThis.__x` (`OUTLINES`, `groups`, `P`, `nest`, `sheetSVG`, `sheetDXF`, `placedLoops`, `setExplode`, `PART_QTY`, `ACRYLIC`, `extent`) with a stub DOM. The extractor itself is not shipped.

---

## 16. Port map

| item | value |
|---|---|
| packages | `sim` (granular multi-trial, M02-T08), `nest` (shelf packer and the sheet loop, M07), `geom` (`gear2d`, funnel slot bands), `checks` (audit rows), `project` (bake and inject is a staleness edge between `.scad` and `.html`), `profile` (kerf off, slop 0.15) |
| feature kinds | `tabslot`, `bridge`, `lamination` (toothed pair, motor plate pair, pinion pair), `finger` (registry label), `bore` (pockets, axle, D shaft), `window` (lightening holes), `pivot` (M8 axle, bought round stock), `coupon` (`gauge`) |
| feature kinds MISSING | tilted plate through plate (`sheetThrough`: foot band and head slot from angle, thickness, station); tangential spacer (tenon, shoulder, tenon between stacked discs) |
| canon ids | `capsule-pocket-rotor` (typed, CANONS.md section 2.1 line 409); `integer-metering-ratio` (candidate, CANONS.md line 439, promotion M07); `spur-pair` (typed, TUMBLER source; SLUG's `gear2d` is the second source) |
| canon MISSING | funnel mouth arch rule (mouth at least 2 diameters) and moving-face-to-mouth gap are carried inside `capsule-pocket-rotor` governs only; no entry for the tilted-plate slot band or for the cage drum (only the equator ring locates) |
| reference ids | `sheet/capsule-rotor-cage` (INDEX line 44, written at M06-T06 per M11-reference.md line 477); `machines/slug-drive` (INDEX line 50, written with the vend program at M07) |
| milestones | M02-T08 (seeded trial runner, the 126 of 128 claim), M06 (canon), M07 (nest, vend program, slug-drive) |
| lineage row | MISSING: `lineage.json` holds three healer rows only; M02 step 5 plans rows for SLUG `step` and `relax` |
| checks proposed | pinion bore keyed to the shaft flat; pinion clear of the motor plate stack in z; hinge holes inside the flap edge by at least one diameter; every bolt hole has a mating part in the nest; mouth at least 2 capsule diameters; moving face within 2 mm of the mouth; exit pocket under a hood; appliqué brackets its opening; baked outline triangulates to its loop area; contact ratio over 1.2; capsule drift under exit tolerance; every baked part is in the nest list (the `PART_QTY` defect) |
| catalog | 133A acceptor (photo-measured, inferred tier), 28BYJ-48 (shaft 10 above flange, ears 35 apart, body offset 8), ULN2003, ESP32-C3 SuperMini |
