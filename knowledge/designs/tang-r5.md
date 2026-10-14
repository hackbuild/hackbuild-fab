# TANG R5: how it is made

All printed slide instrument with a copper (or printed conductive PLA) force-pad face, a film slide sensor in a segmented neck, three panel pots and an I2S speaker. R5 is the revision the owner printed (the `tang-small` slicer projects are its print set, see `fab-knowledge:originals/tang-small/RECORD.md`). It carries two proven pieces the plan cites: the scan-six-pads read and the TANG R5 wiring diagram (M08 wiring parity candidate).

Number rule for this file: every constant is read from the source file and line named beside it (the bench default); figures marked computed come from those constants; measured means measured by the owner and stated so in the source.

Folder: `fab-knowledge:originals/tang-r5/`.

## 1. Identity and revision

| field | value |
|---|---|
| owner name | TANG R5 |
| slug | tang-r5 |
| canonical revision | `tang_r5_sim (13).html`, 2026-08-17 19:21, 700774 bytes, sha256 `f251530457b2338c7403cae94dd0f43ab9847725062b3ba1c7ae9eddfcad2add` |
| companions | `tang_r5_circuit.html` (2026-08-17 19:21, sha256 `5125de903db8f843b27f69bc02eb3f4d9de6abc900c8c587c76de0680b0813ee`), `tang_r5_wiring.html` (2026-08-21 01:33, sha256 `1b4f1347b15b6d5f0d09214d7081a4a1f31310964d5ff2a7e4a31395d5cf3331`), `tang_r5_circuit_files.zip` (2026-08-17 19:12, `a153df328416f98e`), `tang_r5_parts (4).zip` (2026-08-17 19:12, `f3c2510b2aeebbb7`), `tang_r5_presser.stl` (2026-08-17 03:25) |
| copies here | `fab-knowledge:originals/tang-r5/files/tang_r5_sim_13.html`, `fab-knowledge:originals/tang-r5/files/tang_r5_circuit.html`, `fab-knowledge:originals/tang-r5/files/tang_r5_wiring.html`, `fab-knowledge:originals/tang-r5/files/tang_r5_circuit_files.zip`, `fab-knowledge:originals/tang-r5/files/tang_r5_parts_4.zip`, `fab-knowledge:originals/tang-r5/files/tang_r5_presser.stl`; unpacked `fab-knowledge:originals/tang-r5/files/unzipped/` (DIMENSIONS.txt, five SVGs, parts and plates MANIFEST.txt) |
| extracted sources | `fab-knowledge:originals/tang-r5/files/src/tang_r5_13_core.js` (geometry, 880 lines), `fab-knowledge:originals/tang-r5/files/src/tang_r5_13_app.js` (viewer, plates, STL zip, 673 lines), `fab-knowledge:originals/tang-r5/files/src/tang_r5_circuit_data.js` (`window.CIRC`), `fab-knowledge:originals/tang-r5/files/src/tang_r5_circuit_app.js` (SVG viewer, press simulator) |

### 1.1 Revision table

| file | date | what it is |
|---|---|---|
| `tang_r5_sim.html` to `(12).html` | 2026-08-16 12:13 to 19:35 | 13 distinct R5 sims; parts zips `tang_r5_parts.zip` to `(3).zip` |
| `tang_r5_plates.zip` | 2026-08-17 15:56 | five single-material plates for the Creator 5 Pro |
| `tang_r5_parts (4).zip` and `tang_r5_circuit_files.zip` | 2026-08-17 19:12 | final 17-STL part set with `cbuttons.stl`; copper, sticker, Velostat, overlay SVGs and DIMENSIONS.txt |
| `tang_r5_sim (13).html` and `tang_r5_circuit.html` | 2026-08-17 19:21 | latest sim: first with the scan wiring, clip-on rail caps and the conductive PLA pad set (`cbuttons`) |
| `tang_r5_wiring.html` | 2026-08-21 01:33 | the only TANG wiring diagram (second copy 2026-08-26 identical) |

### 1.2 Why sim (13)

It is the newest R5 sim and the one the printed parts came from: the owner's `facewithbuttons.3mf` (2026-08-17 22:07) slices `cbuttons.stl`, which first appears in the 19:12 parts zip and the 19:21 sim. It is the first sim that wires the pads as a scan (drive six, sense one), which is the canon `scan-six-pads`. The wiring page of 08-21 is newer and is kept as a companion because it is the wiring parity target, but it holds no geometry.

## 2. What it makes and for whom

A maker with an FDM printer (no multi-material needed), a vinyl cutter, a Teensy 4.0, a MAX98357A amp, a 76 mm speaker, three RV097NS B100K pots and a 610 mm Flexniss SF23-600 film builds a slide instrument 782 mm long (computed: 158 body plus 624 neck at the 610 film). The bench is a viewer with build plates and STL export, not a parametric composer: parameters live in the `P` table in code, the person picks only the sensor length, layers to show, stack exaggeration and the conductive PLA option.

## 3. Shots

Driven with `fab-knowledge:originals/_tools/shoot-tang-sensors.cjs` (puppeteer-core, headless Chrome, swiftshader), 1280 x 860, no page errors.

| file | what it shows |
|---|---|
| `fab-knowledge:originals/tang-r5/shots/r5-assembly-overall.png` | ASSEMBLY tab, WHOLE cam: cream face with the sensor island, magenta gear knobs, the charcoal three-segment neck with the white film between rails and the magenta tip cap; rail with LIFT, STACK EXAGGERATION, CAMERA, SENSOR STRIP LENGTH (610 mm measured), EXPORT, MATERIALS |
| `fab-knowledge:originals/tang-r5/shots/r5-body-lift.png` | BODY cam with LIFT 40: face, pots and knobs lifted off the charcoal body; speaker seat with cable channel, screw columns, mortise collar, Teensy and amp lying on the floor |
| `fab-knowledge:originals/tang-r5/shots/r5-face-stack-x24.png` | FACE cam with the film stack exaggerated 24 times: sticker, copper hex combs with escapes and the COM spine, Velostat patches, PET overlay |
| `fab-knowledge:originals/tang-r5/shots/r5-cpla-pads.png` | conductive PLA option ticked: the same comb art printed 0.6 thin in cPLA replaces the copper stack, leads jog to their own slot entries |
| `fab-knowledge:originals/tang-r5/shots/r5-build-plates.png` | BUILD PLATES tab: one material per plate, shelf packed, with the plate list and print notes per part |
| `fab-knowledge:originals/tang-r5/shots/r5-circuit-copper.png` | `tang_r5_circuit.html`: the copper cut layer at 1:1 with net tails P6 P5 P4 COM P1 P2 P3, layers panel, PRESS SIMULATOR (1005 counts untouched), NETS list, EXACT DIMENSIONS |
| `fab-knowledge:originals/tang-r5/shots/r5-wiring-diagram.png` | `tang_r5_wiring.html`: Teensy 4.0 pin row, sensor island tails, MAX98357A, YD76-02, three pots, the 47k and 1 nF on SNS, SF23-600 film and the wire colour legend |

## 4. Mechanisms, circuits and constructions

Line numbers are in `fab-knowledge:originals/tang-r5/files/src/tang_r5_13_core.js` unless named.

### 4.1 Parameter table as the single source

`var P` (`:13` to `77`) holds every dimension: body, speaker, grille, pot, knob, sensor island, hex, COM, route, wire slot, stack, bosses, neck, film, presser, fit, lip, cable, cap, bed, tray, port, plug. Comments mark measured values (pot shaft 6.0 and 25 x 9.5 x 11 overall, `:19` to `22`; film 610 long, `:49` to `50`) and design choices with their reason. `MAT` (`:79` to `98`) names each material and colour. The geometry builder `buildParts(THREE)` (`:103` to `877`) returns parts with `print` poses and notes; the viewer, plates and exporters read only that list.

### 4.2 Body: one printed piece with a band builder

Construction (`:245` to `305`):
1. Outline (`:215` to `238`): straight sides, a tail semicircle of `tailR` 52 at `+X`, `neckR` 18 corners at the neck end, with extra vertices at the USB window and the mortise edges so cut predicates have points to act on.
2. Floor slab `floorT` 3.0 with a 14 mm round access port and two M3 clearance holes for the neck screws.
3. `bandPieces(outI, inI, h, y0, cuts)` (`:186` to `209`) builds a wall band between two outline offsets and breaks it wherever a cut predicate hits either boundary. Bands: back to mortise floor, mortise to USB, USB window, to the snap groove, the groove band thinned by `grooveD` 1.0, groove to the tub top. Cuts: neck slot open from the mortise floor to the rim (`cutNeck`), USB window (`cutUSB`).
4. Speaker seat and bore as arc rings with a 16 deg cable channel at -157 deg (`:278` to `282`).
5. Six screw columns 10.4 od with 2.6 pilots for thread-forming M3 (`:283` to `286`, `P.boss`).
6. Neck mortise collar: cap, floor with two M3 holes, side walls and gussets (`:287` to `300`), mortise `N.W + 0.5` by `N.H + 0.5`.

Print: floor down, no supports, 5 walls, 20 percent gyroid (`:303`).

### 4.3 Face plate with snap lip

(`:308` to `343`): 3.4 slab with grille arc slots (rings r 10 to 34, slot 3.0, 7 deg gaps, slots per ring `round(2 pi r / 22)`), pot bushing holes 7.4 with 2.6 anti-rotation pockets at r 6.4, a 3.4 x 45 wire slot at z 36, six 3.4 screw holes. A registration lip 1.6 x 4.0 at 0.25 clearance drops inside the wall and a 0.9 bead 1.0 tall snaps into the wall groove (`P.lip`, `:55`); both bands break at the mortise and every screw column. Print top face down on smooth PEI.

### 4.4 Six force pads, COM spine and escapes (canon force-comb, scan-six-pads)

Copper art (`:352` to `422`), constants `P.hex`, `P.com`, `P.route` (`:34` to `41`):
1. Regular hexagons, circumradius 8.2 (16.4 across points, 14.2 across flats), rows at x -53 and -32, columns z -17.8, 0, 17.8.
2. `comb(cx, cz, R, side)` (`:362` to `388`): each hex is split into a sense half and a COM half; 5 lanes between `-h + margin` and `h - margin`; a finger's reach at lane height is limited by the slanted edge, `reach = clamp(R - (R/2)(|z|/h) - clr - gap/2, minFinger 1.2, fL 4.2)` with `clr` 1.33 so the tip stays about 1.2 perpendicular off the slope. Fingers alternate owner by lane parity.
3. Row one senses to `-X`, row two to `+X`, so both COM halves face a 2.4 spine down the middle (x -43.7 to -41.3, z -26 to 31) with a 2.4 link into each COM half (`:390` to `403`).
4. Sense escapes 1.6 wide attach 5.8 outside the finger band; the column nearest the tail row goes straight, the other two take one L bend to their lanes (left x -68, -64; right x -17.8, -21.5). `elbow()` draws the L as one polygon so the corner is real (`:357` to `361`).
5. Seven solder pads 2.4 x 3 at z 29.5 (`:417` to `419`).
6. Velostat patches: hex R `8.2 + 1.2` = 9.4 over the combs only; the slider stays bare (`:424` to `431`). DIMENSIONS.txt in the 19:12 circuit zip states R 9.0, so the cut file and the sim (13) code disagree by 0.4 on the patch radius; cut from the code value or recheck the SVG before cutting. PET overlay with a window over the tail row (`:433` to `440`).

Stack (`P.stack`, `:43`): sticker 0.14, copper 0.07, Velostat 0.30, PET 0.10 = 0.61 (computed). Copper gate from DIMENSIONS.txt: minimum gap 1.20 against a 1.0 weeding floor, tightest pair 1.30; fill rule nonzero so overlapping shapes in one net union.

Read, the scan (DIMENSIONS.txt WIRING; sim Wiring panel): SNS (COM tail) on pin 14 (A0) with 47k to 3V3 and 1 nF to GND; P1 to P6 on pins 0 to 5. To read pad k: pin k OUTPUT LOW, the other five INPUT, settle 200 us, analogRead A0. Only pad k has a path to ground, so there is no ghosting; six pads in about 1.5 ms, a 600 Hz scan (declared). `analogReadResolution(12)`, `analogReadAveraging(8)`. Falling reading is more pressure; velocity is the slope during onset. Plain on and off: drop the 47k and 1 nF, use INPUT_PULLUP on SNS and threshold.

Press simulator (`fab-knowledge:originals/tang-r5/files/src/tang_r5_circuit_app.js:130` to `156`): Velostat through a comb `R = max(1200, 1200 + (1.2e6 - 1200) exp(-8.5 f/100))`, pull-up 22k, `ADC = 1023 R / (R + 22k)`; untouched reads 1005 counts (computed, `r5-circuit-copper.png`). The code says the numbers are indicative and must be calibrated per sheet.

Why a scan: the art already has one shared conductor through all six pads and six outward tails, so swapping which side drives costs nothing and frees the analog side (sim Wiring panel text). CANONS.md section 4 records the rule that a scan of six pads works where a row and column matrix cannot.

### 4.5 Conductive PLA pad set (`cbuttons`)

(`:742` to `781`, constants `P.cpla` `:59` to `65`): the same comb art printed 0.6 thin in conductive PLA; every lead gets its own entry into the wire slot (`slotX` P6 -58 to P3 -22, same x order as the pads so no two routes cross) and jogs at one of three levels (`jogZ` 30.5, 33.2, 35.9); each lead ends in an elbow leg down through the face slot to a loop 5.0 od, 2.6 id, 1.2 thick for copper tape and a wire. Print pad face down on smooth PEI, 0.2 layers, 100 percent infill.

Electrical note in the sim text: cPLA 15 ohm cm moulded, 30 printed across layers, 115 through (vendor, Proto-pasta); worst lead near 9k in plane plus about 3k down the leg (computed in the sim); 12k of series lead is a fixed offset on an ADC read with a pull-up; use 100k on SNS with cPLA pads, 47k with copper tape (wiring page). Do not bend the tabs; clamp copper tape to the loops and solder to the tape.

### 4.6 Pots and gear knobs

Pots RV097NS at x -56, -38, -20, z -41 (`P.pot`, `:21` to `22`, measured shaft 6.0). Knob (`:443` to `525`): a 10-tooth rounded gear `r = rRoot + (rTip - rRoot) smoothstep(0.5 + 0.5 cos(10 th + pi))`, rTip 8.5, rRoot 6.9, so tips and roots go flat and flanks stay steep; bottom chamfer band, bushing counterbore 7.6 x 1.6, shaft bore 6.2, cap 2.4, two shrinking fillet bands (0.965 and 0.90 scale, 0.6 each); a set screw tunnel cut through a tooth in five bands by `gearSlot()` so the M3 grub sits flush; pointer rib over one tooth. Shaft above the bushing `25 - 9 - 7 = 9` (computed, `:445`). Print bore down, set screw hole sideways, no supports.

### 4.7 Segmented neck with joiners and film channel

(`:560` to `642`): neck section 35 x 18 U channel, 2.2 walls, deck 2.0, film recess 0.9 between 1.0 rails, a 12 mm wire lane down the middle. Exposed length `film + 14` = 624; segments `ceil((624 + 24)/235)` = 3 of 216.0 each (computed). Deck split at the root for the film tail slot (-42 to -28); ribs every 30 notched for the wire lane; heel pads at the root take two M3x16 up through the body floor. Internal joiner blocks 44 long with 0.3 gap and M3 pilots 2.6, four M3x8 per joint through the side walls; tip cap with a spigot. Print each segment on its side, channel facing sideways, 5 walls, no supports.

### 4.8 Film slide sensor, presser and clip-on rail caps

Film 610 x 28 x 0.6 measured (`P.film`, comment `2 ft overall, 1 in + 2 to 3 mm wide`), 32 dead end, tail 10 x 14 drawn as a 3 pin tail (`:715` to `740`). The wiring page of 08-21 states the SF23-600 as `601 x 23, four pin tail` (pins 1 and 2 comb, pins 3 and 4 the strip, relabelled track or piezo in panels A and B), so the sim model and the wiring page disagree on length, width and pin count; the wiring page is the later file and matches the two-panel identity procedure below. Presser: TPU, width `indent - 2 x 0.1` = 28.4 (computed, indent 28.6), 0.8 thick with a 0.4 crown, one piece per segment with a 1.0 seam; TPU 95A flat, 0.2 layers, 3 walls, no infill. Rail caps (`:644` to `713`): separate left and right strips per segment, one part per distinct length (the root pair is shorter because it stops 0.5 outside the body end wall), each printed twice with one copy flipped 180 for the other hand; flange plus lip `lipIn` 1.4 over the presser, underside `rise` 1.5 above the neck top; legs drop 6.0 with three 2.4 screw holes into the neck wall; a tail-slot lid clips over the wire hole. Lesson recorded in code (`:66` to `69`): the printed indent came out too shallow, so the caps assume the recess printed away to nothing (the worst case).

Sensor identity lesson (wiring page panels A and B): measure the SF23-600 first. Panel A, the strip reads a steady few k: it is a track; both comb pins tied are the wiper on A1 with a 100k pull-down; track ends through 10k each. Panel B, the strip reads open and twitches when tapped: it is a piezo; the comb pair is an FSR on A1 with 47k, the strip pair goes to A5 through 10k with a 1M and two clamp diodes.

### 4.9 Speaker, electronics and plugs

Speaker DYS YD76-02 taken as 76.0 frame, 17.0 deep (flagged unverified in the sim), drops in from the top onto a 70.0 seat and is clamped by the face (`:527` to `544`). Teensy 4.0 and MAX98357A lie on the floor; USB at a 16 x 14 side window (`P.tray`). Square plug and knurled round plug close the side window and floor port with 0.4 clearance and a 2.4 flange (`:783` to `817`); with the round plug out the floor port is a bass port.

Fasteners (`:819` to `861`): no inserts, no nuts: 6 M3x12 thread-formed into the face columns, 2 M3x16 up through the floor into the neck heel, 4 M3x8 per neck joint plus 2 into the tip cap spigot (10 M3x8 at three segments, computed from the label at `:853` to `854`), 3 M3x4 grub screws sunk in the knob tunnels (`ssLen` 4; the code comment says M3x6, the part label uses 4); four TPU feet 12 x 3 at x -60 and 52.

Plugs (`:783` to `817`): the square plug body fills the 16 x 14 window with 0.2 per side, a 2.4 flange 1.6 thick sits proud outside, and a 10 x 3.5 pull tab on the flange lets it be prised out; the round plug has a 20-lobe smoothstep knurl 0.5 deep on its flange and a body 0.6 proud of the floor.

### 4.9a Pin map and audio (DIMENSIONS.txt WIRING, part labels `:546` to `558`)

| net | Teensy 4.0 pin | parts |
|---|---|---|
| SNS (COM tail) | 14 (A0) | 47k to 3V3, 1 nF to GND (100k with cPLA pads) |
| P1 to P6 drives | 0 to 5 | none |
| slide wiper | 15 (A1) | 10k pull-down, or it floats untouched |
| pots 1 to 3 wipers | 16, 17, 18 (A2 to A4), labelled MODE, TUNE, LEVEL on the wiring page | ends to 3V3 and GND |
| MAX98357A | DIN 7, BCLK 21, LRC 20, VIN 5V, SD and GAIN floating | none |

I2S owns pins 7, 20 and 21, and 20 and 21 are also A6 and A7, so the analog sensors stay on A0 to A4. The note asks for 3V3 only on analog pins and for the SNS return on its own GND. The Teensy and amp lie loose on the floor with no rails or standoffs (`P.tray` comment), reached through the floor port and the side window.

### 4.10 Build plates and STL export

`buildBed()` (`fab-knowledge:originals/tang-r5/files/src/tang_r5_13_app.js:171` to `268`): one material per plate, shelf packed on 256 x 256 with 8 margin and 6 gap; the plate manifest lists each part's print note. `exportParts()` and `exportPlates()` (`:567` to `601`): binary STL per part in print pose dropped to z 0 and centred, or per plate as packed, zipped by a hand-written store-only zip with CRC32 (`:467` to `561`), each with a MANIFEST.txt. The plates manifest of 2026-08-17 lists five plates (body and neck; rail caps and tail lid; faceplate and plugs; knobs, joiner, tip; TPU presser and feet).

## 5. UX anatomy

- Header with the hack.build mark, `TANG R5`, tagline; tabs ASSEMBLY and BUILD PLATES (`fab-knowledge:originals/tang-r5/files/tang_r5_sim_13.html`).
- Rail: LIFT (explode), STACK EXAGGERATION x1, x8, x24 (thin films readable), dimension callouts, presser fitted, plugs fitted; CAMERA whole, body, face, neck, tail; SENSOR STRIP LENGTH 292, 400, 610 (measured), 800; EXPORT parts zip and plates zip; MATERIALS as a layer list with swatches where ticking conductive PLA swaps the copper stack for the printed set; Dimensions, Holes and fits, tolerance table (`infoPanel`, `fab-knowledge:originals/tang-r5/files/src/tang_r5_13_app.js:345` to `466`); Conductive PLA notes, Build order (9 steps), Wiring, Unverified.
- Stage: drag orbit, wheel zoom, right drag pan, click isolates, double click focuses; status line `geometry gated headless before it was rendered`.
- Circuit page: SVG of the four film layers at true size, layer toggles, fit and zoom, copper SVG export, net buttons that light a net, press simulator, exact dimensions.
- Wiring page: one SVG with 121 text labels, pan and zoom, SVG download, net list table, read instructions.

What makes it excellent: one `P` table drives the 3D model, the copper art, the cPLA alternative, the plates and the dimension tables, and the copper SVGs are emitted from the same source as the enclosure; tolerances and holes are listed with their reasons; unverified values are flagged by name; the build order and wiring are written for the person holding the parts.

## 6. Tests and harness

No gate file ships with R5. The status line says geometry was gated headless before rendering; the gate script is not among the recovered files (MISSING). The circuit gate values (minimum gap 1.20, tightest 1.30) are stated in DIMENSIONS.txt. This drive: ready about 9.9 s on swiftshader (measured), zero page errors.

## 7. Port map

| item | value |
|---|---|
| packages | copper (comb and lane art, gap gate, SVG layers), geom, mesh (extrude), nest (plates), wiring (diagram, net list), circuit (scan read), ui-core (viewer) |
| feature kinds | conductor, pad, contact (Velostat over comb), pocket (mortise, speaker seat), bore (pot bushing, knob bore), boss (screw columns), snap (face lip bead), window (grille, side window, floor port), lamination (sticker, copper, Velostat, PET) |
| canon ids | scan-six-pads (proven, `sensors/scan-six-pads`), force-comb (proven, `sensors/force-comb`) |
| canon MISSING | segmented neck with internal joiner blocks; clip-on rail caps with lip over a presser; film slide sensor seat (SF23-600 two-panel identity procedure); face snap lip with bead in a wall groove; gear knob with flush set-screw tunnel; cPLA pad set with elbow legs and wire loops |
| reference ids | sensors/scan-six-pads (new at M06), sensors/force-comb (named in CANONS.md; no folder under `reference/` yet) |
| reference MISSING | wiring diagram reference (M08 parity target, owner has not picked it) |
| milestone | M05 (copper art gates), M06 (canon scan-six-pads), M08 (wiring parity candidate) |
| lineage row | MISSING |
