# BAFFLE R3: how it is made

One-piece printed touch instrument: six hex skin-bridge keys, a 92 mm skin-bridge slider, a speaker, an I2S amp and a board seat driven by a board table, all in a white PETG case with a pink accent, conductive PLA circuits printed into the play face and a TPU gasket and rib tips. Three board mounts: contact bumps under a castellated board, ten numbered screw lands, or a LEGO-style tile that clicks onto ten conductive studs. Every solid is a manifold CrossSection swept between two 0.24 layer lines, every route is a stated polyline, and the checker proves clearance, one body per net and no slot overlap on every build.

Number rule for this file: constants are the bench defaults in the source file and line named beside them; check results are measured from a headless run of the bench on 2026-10-05 (this record's drive); resistances are computed by the bench at rho 300 ohm mm (30 ohm cm, the code's Proto-pasta in-plane figure).

Folder: `fab-knowledge:originals/baffle-r3/`.

## 1. Identity and revision

| field | value |
|---|---|
| owner name | BAFFLE R3 |
| slug | baffle-r3 |
| canonical revision | `~/Downloads/baffle (36).html`, 2026-09-18 00:32, 2001732 bytes |
| sha256 | `98756a03f69208806dca37563ec29728baeb36346096129f85852f074dc5cc56` |
| copy here | `fab-knowledge:originals/baffle-r3/files/baffle_36.html` |
| sources | `fab-knowledge:originals/baffle-r3/files/src/model.js` (BAFFLE R3 model, 1082 lines, byte equal to the downloads reader's `baffle-r3-model.from-baffle-36.js`), `fab-knowledge:originals/baffle-r3/files/src/bench.js` (UI, viewer, exports, 367 lines), `fab-knowledge:originals/baffle-r3/files/src/orca3mf.js` (print-forge writer); vendor blocks left out: three.js, JSZip, manifold wasm, and the 199 KB hack.build mark polygons |
| exports | `fab-knowledge:originals/baffle-r3/files/baffle-zero-tile.3mf` and `fab-knowledge:originals/baffle-r3/files/baffle-tile_2.3mf` (bench exports 2026-09-16 11:31), `fab-knowledge:originals/baffle-r3/files/baffle-zeror1-tile.slicer-save.3mf` (owner slice 2026-09-16 21:52), `fab-knowledge:originals/baffle-r3/files/baffle-tile-tile_1.slicer-save.3mf` (owner slice 2026-09-18 01:48), `fab-knowledge:originals/baffle-r3/files/baffle-wire_5.lid.slicer-save.3mf` (owner slice of the R3 wire lid, 2026-09-14 19:48) |

### 1.1 Revision table

| Downloads file | date | sha256 (first 12) | change |
|---|---|---|---|
| `baffle (22).html` | 2026-09-14 19:33 | `01791f848c3f` | R3 first: six keys, long slider, jack, board table |
| `baffle (23).html` | 2026-09-14 20:39 | `bbf7efb6c026` | adds RP2040-Zero; jack moves to the front wall for long boards |
| `baffle (24).html` | 2026-09-14 21:16 | `1fe4fbdd104c` | tile mode and the hack.build lockup on the lid |
| `baffle (25)` to `(28).html` | 2026-09-14 21:36 to 22:24 | `227f80ddc51b` to `d6bbc711dea6` | terminals become LEGO studs on the 8 mm grid; weld fallback for sliver faces |
| `baffle (29)` to `(34).html` | 2026-09-14 22:34 to 09-16 00:37 | `ed5f5834b49f` to `3dd1ab1bd996` | bounding-box prefilter in clearance and overlap checks; 4.8 studs bored 2.4; RP2040-Zero castellation map and back-clearance well; IO9 BOOT on a charge-timed key |
| `baffle (35).html` | 2026-09-16 11:31 | `f72b20d3edd9` | every peg east of the board, all four RP2040 ADC pins used |
| `baffle (36).html` | 2026-09-18 00:32 | `98756a03f692` | `rp2040zero_r1` board row for a body already printed with the first peg row; tile sockets split into a 4-finger collet |

### 1.2 Why (36)

Newest and good: every check is green in all three mounts (measured below), and it is the revision the owner kept printing from: the owner sliced the `rp2040zero_r1` tile on 2026-09-16 21:52 and a tile again at 2026-09-18 01:48, 76 minutes after (36) was saved. (36) also carries the collet split that makes the tile socket spring instead of crack.

## 2. What it makes and for whom

A maker with a four-head printer and a cheap microcontroller (ESP32-C3 SuperMini by default; S3 SuperMini, Waveshare RP2040-Zero, RP2040-Zero first body, Pico or Pico 2, Pico W, Teensy 4.0 and 4.1, XIAO, generic: ten rows in `BOARDS`, `:27` to `104`) prints a 130 x 66 case and a lid on one plate, flat, with no supports, drops in a 30 mm speaker and an NS4168-class amp board (38.4 x 22.4), and plays six keys and a slider with bare skin. No wires between the board and the controls in bump or tile mode.

## 3. Shots

Driven with `fab-knowledge:originals/_tools/shoot-tang-sensors.cjs`, 1280 x 860, ready about 7.7 s (measured), zero page errors. Slicer thumbnails are the 512 x 512 plate images inside the owner's saves.

| file | what it shows |
|---|---|
| `fab-knowledge:originals/baffle-r3/shots/r3-iso-plate.png` | ISO cam: body and lid side by side on the plate as printed, seat with numbered I2S lands, amp posts, speaker gasket ring and grille; BOARD chips (ten board rows) and MOUNT chips with the mode note; status `contact bumps`, `127,914 tris`, `build 3494 ms, checks 85 ms`, `plate 130 x 140 x 30.00 mm`, `all checks green` |
| `fab-knowledge:originals/baffle-r3/shots/r3-asm-closed.png` | ASSEMBLED cam, lid closed: the pink stripe and the hack.build lockup inlaid in the lid (mark black in conductive PLA, pink in the accent) |
| `fab-knowledge:originals/baffle-r3/shots/r3-play-face.png` | PLAY FACE cam: six pink hex tiles with grey conductive drive and sense combs, the slider frame with track and rails, the speaker grille ring |
| `fab-knowledge:originals/baffle-r3/shots/r3-wire-nets.png` | NETS cam: body and TPU hidden, every route on both buried layers visible from the seat pads to the key vias, the numbered I2S lands |
| `fab-knowledge:originals/baffle-r3/shots/r3-checks.png` | the CHECKS panel: one row per net (one printed body), per-band clearance rows with the measured margin, slot overlap rows at 0.0000 mm3, bump pitch and rib preload |
| `fab-knowledge:originals/baffle-r3/shots/r3-tile-rp2040zero.png` | RP2040-Zero in LEGO tile mode: the third object (tile) on the plate behind the lid with its seat and black contact pads, the RP2040-Zero board note in the rail, TILE 3MF button (the stud row along the front wall is out of frame at this camera), status `plate 130 x 183 x 31.92 mm`, `all checks green` |
| `fab-knowledge:originals/baffle-r3/shots/slicer-zeror1-tile.png` | owner slice of the `rp2040zero_r1` tile: plate underside up, board seat with clips and lip, conductive bumps |
| `fab-knowledge:originals/baffle-r3/shots/slicer-wire-lid.png` | owner slice of the R3 wire-mode lid in pink: deep tray lid with a rib post |

## 4. Mechanisms, circuits and constructions

Line numbers in `fab-knowledge:originals/baffle-r3/files/src/model.js` unless named.

### 4.1 Band kernel: CrossSections swept between layer lines

Header (`:2` to `11`): print pose is the modelling pose, play face on the bed at z 0, cavity up. Every solid is a 2D region swept between two z values on 0.24 lines; regions inside one band are disjoint by construction and bands only stack, so the four slot parts never overlap and sum to the solid.

Construction:
1. `LH = 0.24`, `snap(z)` (`:19` to `20`).
2. Panel bands from `derive()` (`:163` to `220`): ART 0 to 0.72, ISO1 0.72 to 1.20, RTE1 1.20 to 1.92, ISO2 1.92 to 2.40, RTE2 2.40 to 3.12, CAP 3.12 to 3.84, PANEL 3.84, TOP = PANEL + cavity 15.6 = 19.44 (plus 1.92 in tile mode), lid rise 8.64, lid 1.92, closed height 30.00 (computed, matches the status strip).
3. Geometry helpers `makeGeo` (`:239` to `294`): `poly`, `rect`, `disc` with segment count `round(seg x min(1, 0.4 + r/6))`, `rrect` by round offset, pointy-top `hex(x, y, af)`, union, difference, intersection, offset, and `trace(pts, w)`: a disc at every vertex 0.03 wider than the segment plus a rectangle per segment, so joint vertices never land exactly on a segment edge (the clipper would return two points nanometres apart, a sliver in the export). Seven-segment `digit()` and `digits()` for land numbers. `prism(cs, z0, z1)` extrudes and translates. Every object goes on a LIVE list freed after each build (wasm memory).
4. `build()` (`:471` to `891`) pushes `{cs, z0, z1}` per slot (`add`) and per net (`addNet`) and per check band (`inBand`), then unions prisms per slot with `Manifold.union` and cuts the stepped jack bore out of the body last (`:879` to `886`).
5. `meshes()` (`:1057` to `1070`) splits body, lid and tile by y window and welds vertices at 1e-5; `weld()` (`:1018` to `1056`) falls back to the kernel's own indices when position welding would make the mesh non-manifold.

Lessons in comments: same-band disjointness is the reason the four filament parts sum exactly; the trace joint 0.03 rule; the weld fallback (introduced at (25) to (28)).

### 4.2 Play face art: pink hex tiles with skin-bridge combs (canon candidate direct-pin hex skin-bridge key)

`keyCentres` (`:297` to `304`): two rows, `cols` 3; row 1 at `y1` 18.0, x from `x1` 20.0 at pitch 22.0; row 2 offset by half a pitch and `pitch x sqrt(3)/2` = 19.05 up (computed).

`keyArt` (`:308` to `343`), defaults `key: { af 21.0, pitch 22.0, spine 1.0, finger 1.0, fpitch 2.0 }`, `gap 1.0` (`:114` to `115`):
1. Pink hex tile, across flats 21.0.
2. Ring 1.0 wide inset 0.9 from the tile edge, split at `gap/2 + 0.05` into a drive half (left) and a sense half (right).
3. Fingers 1.0 wide on 2.0 pitch, `n = floor((2 (R - inset - 0.6) - finger)/fpitch) + 1`; even fingers from the drive side, odd from the sense side.
4. Finger reach `min(a2 - gap, a2 - 2 (gap + 0.866 (yt - Y0)))` so the outer corner stays a full gap from the opposite ring's inner face where it slants at 30 deg; near a vertex the finger also stops a gap short of the split cut. Fingers shorter than 1.5 are dropped.
5. Combs are clipped to the inset hex; drive via at the left flat 2.3 below centre, sense via at the right flat 2.3 above.

Art band assembly (`:487` to `502`): conductive art is the union of all combs, rails and track; pink = tiles + slider frame + grille ring + a 1.0 border 1.8 in from the edge, minus conductive; white body = outline minus both and minus grille holes. Every comb therefore sits in a halo of pink on white.

Read (board table notes, `:27` to `58`): drive combs all on VKEY (3V3, off the regulator, no scanning); skin bridges drive to sense. On the C3: K3, K5, K6 on ADC1 pins IO1, IO0, IO3; K1, K2, K4 charge-timed on IO9, IO8, IO7 (no converter left). IO2 left alone (fitted pull-up, strapping pin). IO9 is BOOT, so it carries a charge-timed key (low for a microsecond or two a scan) rather than a slider end. The R1 README states the skin at a few hundred kohm for a light touch to tens of kohm pressed hard. Check line: the longest key sense trace is about 27.2 k in bump mode, 11.4 k wire, 16.5 k tile, "in series with a megohm finger, so it costs nothing" (measured from the bench check list).

### 4.3 Skin-bridge slider with swapped drive pair (canon candidate BAFFLE skin bridge slider)

`sliderArt` (`:344` to `358`), defaults `sld: { x0 26.0, x1 118.0, y 56.5, track 1.2, rail 2.2, inset 1.0, frame 1.0, tapS 43.0 }` (`:116`):
1. Track 1.2 wide from `x0 + inset` to `x1 - rail - gap`, on net SLD_A at one end and SLD_B at the other (one body, two nets: the checker allows the pair, `:924`).
2. Rails 2.2 above and below at a 1.0 skin gap, joined by an end bar at `x1`: net SLD_S, the wiper is the finger bridging track to rail.
3. Pink frame 1.0 around the whole at a gap.
4. Vias: A at the left track end, B at the right, S on the lower rail at `tapS`.

Read (R1 README history, kept in R2 and R3): drive A high and B low, read the rail V1; swap, read V2; position `V1/(V1 + V2)` cancels the skin; `V1 + V2` is pressure. The first raster BAFFLE read the track ends against internal pull-downs and the ratio moved under 10 percent; inverting the roles fixed it.

Swing check (`:1005` to `1012`): `R = rho L / (w t)` with rho 300 ohm mm, track `(x1 - rail - gap - x0 - inset)` over `track x art` = 30.5 k; drive traces SLD_A and SLD_B summed along their polylines; swing = track over track plus both drives; warn under 30 percent. Measured at defaults: 49 percent (bump), 44 (wire), 50 (tile).

### 4.4 Two buried route layers with stated lanes (canon buried-trace-stack family)

`routes()` (`:377` to `468`): every route is a stated polyline; nothing is searched. Two rules (`:371` to `376`): a net leaves its pad at the pad's own y, runs east, then turns south, and the turn x rises with pad y, so no vertical meets a stranger's horizontal; the drive comb and the three I2S nets live on route layer 1, everything else on layer 2, so the two families cross freely and only vias and posts pierce both (`LAYER1`, `:224`). Trace 1.2, slider drive 2.2 (stays 1.2 while it passes the pad columns, then widens), clearance 0.8, via 2.0, pin post 1.7, land post 1.6 (`:113`).

Body cut per band (`:567` to `581`): white body in each band = outline minus grille holes, minus via columns below a net's route band, minus that net's trace inside its band, minus its posts above, minus pilots above ISO1; conductive in each band = the union of net prisms spanning it.

### 4.5 Board seat with printed contact bumps (canon blocks-board-seat, rp2040-zero-seat)

Board table `BOARDS` (`:27` to `104`): per board L, W, T, pitch, row spacing, USB size, castellated or not, standoff, button positions, pad columns, net map, sense kind, tile map, tile lanes, tile I2S, notes. `applyBoard` (`:138` to `159`) writes the mcu block, sets depth `max(66, round(L + 13))`, moves the jack to the south wall for boards over 40 long, and drops a mode the board cannot do (no pad map, no tile; not castellated, no snap).

Seat (`:641` to `664`, defaults `seat` `:118` to `119`): pocket board plus 0.15 clearance plus a 0.7 slide for the USB shell; walls 1.6 to a rim 1.92 above the panel; a lip 6.0 wide at the far end that grows 1.4 proud over four layers then holds; in snap mode a conductive bump 3.0 x 1.7, 0.48 proud under every mapped castellation, one PETG spacer bump on the first spare pad; otherwise four standoff pads 2.4 radius. USB window with a stepped 45 deg arch: each 3-layer step pulls each side in by 1.08 so the closing bridge is about 4 mm instead of 10 (`:613` to `621`).

Board table rows (`:27` to `104`; numbers from the rows, ADC facts from each row's `hint` or `notes`):

| key | board | L x W x T | castellated (snap) | standoff | tile map | sense plan stated in the row |
|---|---|---|---|---|---|---|
| c3super | ESP32-C3 SuperMini | 22.52 x 18.0 x 1.0 | yes, `map` | 0 | yes | 3 keys plus wiper on ADC1 (IO0, IO1, IO3, IO4), 3 keys charge-timed (IO7, IO8, IO9), IO2 left alone |
| s3super | ESP32-S3 SuperMini | 22.0 x 18.0 x 1.2 | no (pad order varies between clones) | 1.2 | no | ADC1 covers IO1 to IO10, all six keys and the wiper as ADC |
| rp2040zero | Waveshare RP2040-Zero | 23.5 x 18.0 x 1.0 | castellated but no `map`, so tile or wire only | 1.44 | yes, `backClear` 0.72 | GP26 to GP29 are the only ADC pins: wiper plus three keys, three keys charge-timed; I2S out of PIO on GP6 to GP8 |
| rp2040zero_r1 | RP2040-Zero (first body) | as rp2040zero | as rp2040zero | 1.44 | yes, its own `tileLayer` and `tileLaneOf` tables | same case and peg row x 7 to 88; only the tile differs, for a body already printed |
| pico | Pi Pico or Pico 2 | 51.0 x 21.0 x 1.0 | no | 3.12 | no | GP26 to GP28: wiper plus two keys, four keys charge-timed |
| picow | Pi Pico W or WH | 51.0 x 21.0 x 1.0 | no | 3.12 | no | as Pico; GP25 and GP29 belong to the radio |
| teensy40 | Teensy 4.0 | 35.6 x 17.8 x 1.6 | no | 3.12 | no | fourteen analog inputs; Audio library I2S BCLK 21, LRCLK 20, DIN 7 |
| teensy41 | Teensy 4.1 | 61.0 x 17.8 x 1.6 | no | 3.12 | no | as 4.0; keep the lid ribs off the SD slot |
| xiao | Seeed XIAO (ESP32 or RP2040) | 21.0 x 17.5 x 1.2 | no | 1.2 | no | eleven pads, check the silk per variant |
| generic | generic board | 40.0 x 20.0 x 1.2 | no | 3.12 | no | set the size, wire the ten lands by hand |

So snap mode exists only for the C3 SuperMini; boards over 40 long (Pico, Pico W, Teensy 4.1) push the jack onto the south wall at `pos` 19.05, `z` 9.12 with a 6.0 land, and the land row steps south to stay in front of the board (`routes()`, `:411` to `414`), dropping the printed digits when there is no room under the rings.

Snap-mode I2S lands (`:395` to `398`): three numbered lands stacked north of each other beside the seat at `x = seat.x0 + 2.8`, y 20.0, 26.8 and 33.6 (pitch 6.8), labelled 1 BCLK, 2 LRCLK, 3 DIN with the digit east of the ring; the I2S hops ride route layer 1 and jog at `colL + 4.5` and `colL + 7.0` so the three never cross. On the C3 the left-column keys K1, K2, K4 drop into a lane bundle between the pad columns at `colL + 7.8`, `+ 10.2`, `+ 12.6` and run east under the key field; the right-column nets go east at their own pad y, so turn x rises with pad y (`:431` to `459`).

Fits checked (`:952` to `963`): bumps keep `pitch - bump width` = 0.84 to their neighbour (at least 0.8); lid ribs preload the board by 0.28 of TPU (0 to 0.4); board lip clears the board top by 0.20 (at least 0.1); board fits the seat; board top below the wall.

### 4.6 Screw land deck and conductive LEGO studs (canon candidate LEGO tile carrier on conductive studs)

Wire mode (`:399` to `417`, `:665` to `687`): ten lands in one numbered row along the front wall, order VKEY, SLD_A, SLD_B, K1, K4, K2, K5, K3, SLD_S, K6 at x 7.2 to 84.0, between the lower vertices of the row 1 keys; ring radius 2.3, pilot 2.4, deck top 7.2, conductive annulus 0.48 proud; pink seven-segment digits 2.4 tall beside each ring when there is room. A post carries each net from its route band up to the ring.

Tile mode: the deck top drops to 4.32 and rings finish flush; each land carries a conductive stud 4.8 diameter, 1.8 tall, bored 2.4 so a wire can still be melted in (`:676` to `686`); the row opens out to about the 8 mm brick pitch (`tileXs` per board).

### 4.7 The tile: a printed carrier with split-collet sockets

(`:770` to `877`, defaults `tile` `:123`): a 4.32 plate (plus `backClear` 0.72 for the RP2040-Zero), its own band stack (socket 1.68, route 1 0.72, iso 0.48, route 2 0.72, cap), ten conductive sockets 4.68 bore with a 0.72 wall, each wall split by four 0.6 axial slots into a collet so it springs onto the stud instead of cracking and wipes it on the way in; routes from the board pads to the sockets on two layers with one lane per net rising as the pad goes east; posts up to conductive bumps under the castellations; board seat with walls, a far-end lip and two clips. A back-clearance well 0.72 deep between the pad rows lets a board with parts on its back land square. Prints underside down so sockets are holes and nothing overhangs.

Checks (`:983` to `1002`): tile conductive one body per net; tile clear of speaker (1.4 mm measured) and amp bay; socket interference `studD - sockD` = 0.12 (window 0.08 to 0.2); at least three collet fingers (4); axial squeeze `studH - sockH` = 0.12 (window 0.06 to 0.2) so the socket bottoms on the peg tip rather than the deck; a standing warning that neither mating interface (pad to bump, socket to peg) is proven by geometry and continuity must be measured on the assembly.

### 4.8 Case, snap lid with TPU-tipped ribs, jack, amp, speaker, lockup

- Walls and lid groove (`:583` to `623`): wall ring 2.4; the groove band steps the wall in by 0.6, 0.4, 0.2 over three layers.
- Lid (`:706` to `768`): printed beside the body, outer face down; pink stripe band and the hack.build lockup inlaid flush in the outer four layers (mark black and wordmark in conductive PLA, pink in the accent; art only, no net); deep-tray rise 8.64 so the body print stays short; skirt 3.84 x 1.2 at 0.2 clearance with a three-step bead (0.3, 0.6, 0.35) on the long sides; button holes 3.6 over the board's buttons; ribs 4.0 wide over the pin rows (snap) or across the board (wire) with a 0.72 TPU tip and 0.28 preload.
- Jack (`:624` to `640`): 6.2 bore cut as stacked three-layer prisms whose half chord follows the circle, through the wall and an 11.0 nut land 1.2 deep; west wall centred or as near as the seat allows, south wall for long boards, north wall in tile mode. Checks: bore above the panel and below the rim, land clear of seat and deck, jack away from the speaker.
- Amp (`:688` to `696`): bay ring two layers tall around the board outline plus 0.3 slack; posts with a shoulder at 1.2 then a spigot up through the 4.7 hole, pilot bored the whole way.
- Speaker (`:697` to `704`): TPU gasket ring four layers tall; ear pegs raised 3.36 with pilots; grille holes 2.0 on a 3.2 hex pitch inside a 25 port (`grilleArt`, `:359` to `368`).

### 4.9 Checker

`check()` (`:894` to `1016`): each net one printed body (`decompose()`); conductive body count equals nets minus one (slider track counts once); per band every net keeps the limit from every other (art `gap - 0.03`, routes `clear - 0.05`, seat 0.8, deck 0.6, tile bands) with bounding boxes deciding first and only close pairs grown and intersected; slot pairs overlap under 0.001 mm3 by a prism-against-prism test with z and bbox rejection; fits and clearances listed in 4.5 to 4.8; every feature boundary on a 0.24 line; slider swing; key trace resistance. Measured at defaults: art band 0.97, rte1 and rte2 0.75, seat 0.80, deck 0.60, slot overlaps 0.0000 mm3, build 2389 ms and checks 47 ms headless (bump mode).

### 4.10 Exports

`bench.js:301` to `357`: 3MF with body and lid (and tile) as separate objects on one plate through `Orca3MF.build`, slot names body-white, accent-pink, conductive, tpu; body, lid and tile 3MFs alone; STL bundle per object and slot with print card and design.json; print card from `Orca3MF.printCard` plus mode and plate notes; save and open design JSON; JSZip deflate level 1 with the render loop paused during zipping.

## 5. UX anatomy

- Header: BAFFLE.BENCH, tagline, OPEN JSON, SAVE JSON, PRINT CARD, STL BUNDLE, EXPORT 3MF, BODY 3MF, LID 3MF (TILE 3MF in tile mode).
- Three-step guide strip: pick a board and a mount; drag the numbers, every check goes green or red; export, open in Flash Studio, print flat with no supports.
- Cams: ISO, AS PRINTED, PLAY FACE, ASSEMBLED, NETS (`bench.js:142` to `153`); NETS hides body and TPU and colours each net.
- Legend: slot swatches plus a chip per net; clicking a chip lights that net pink through the whole stack and dims the rest (`bench.js:228` to `236`, `:269` to `278`).
- Stage sliders: section (clip plane by height) and lid (on plate to closed, the tile drops onto its studs over the first half) (`bench.js:154` to `166`, `:360` to `361`).
- Rail: BOARD chips with a note, MOUNT chips with a note (unavailable modes greyed), CASE, KEYS, SLIDER, JACK, CONDUCTIVE, PANEL, SEAT, LID, SNAP FIT, SPEAKER, AMP, SCREW LANDS (some folded), then CHECKS, PIN MAP, WIRING (`bench.js:14` to `69`). Each row label, range, number, unit; range input previews the number, change commits.
- Status: mode chip, tris, build and check ms, plate size, check verdict chip (`bench.js:239` to `265`).
- Hook: `window.BENCH = { P, model, cfgInfo, exportBytes(piece), timeExport, setP, boot }`.

What makes it excellent: one model file runs in node and the page, so preview and export are the same triangles; the board table makes one design serve nine boards with honest notes per pin; three mount modes share one routing plan; the checker proves electrical and multi-material facts on every drag and names what passed with numbers; the tile turns a board seat into a swappable carrier with checked interference and squeeze.

## 6. Tests and harness

No node test file ships for R3 in the recovered files (the R1 Python `check.py` gate is in `fab-knowledge:originals/baffle-r2/files/r1-raster/baffle-src.zip`). The in-page `check()` is the harness. This record's drive: three mounts all green (measured, see 4.9 and section 3).

## 7. Port map

| item | value |
|---|---|
| packages | geom (manifold CrossSection), mesh (band prism route, weld), circuit (net per body, band clearance, swing), copper or circuit lane plans, catalog (board table rows: C3 SuperMini, RP2040-Zero, Pico, Teensy, XIAO), 3mf, checks (layer line, slot disjointness, sum to solid), ui-core (net highlight, lid slider), chase |
| feature kinds | conductor, pad (combs, rings), port (bumps, lands, studs), contact (bump to castellation, socket to stud), pocket (seat, amp bay), snap (lid bead in groove), boss (posts, studs), window (grille, USB arch, jack), bore (jack, pilots), lamination (art band inlays) |
| canon ids | blocks-board-seat (proven, provenance includes BAFFLE R3), rp2040-zero-seat (proven, provenance includes BAFFLE R3), buried-trace-stack (proven, different stack values) |
| canon MISSING (candidates only in CANONS.md section 8.3) | direct-pin hex skin-bridge key; BAFFLE skin bridge slider with swapped drive pair; LEGO tile carrier on conductive studs with split collet; plus no entry for: stepped 45 deg USB arch, stepped jack bore prism stack, deep-tray lid with TPU-tipped preload ribs, board table driven seat |
| reference ids | seats/blocks-seat, seats/rp2040-zero-pressfit, conductors/buried-trace-stack (named in CANONS.md; no folder under `reference/` yet) |
| reference MISSING | skin-bridge key, skin-bridge slider, tile carrier |
| milestone | M05 (circuit checks), M06 (canons and candidates), M08 (catalog board rows), M09 (bench), M10 (chase) |
| lineage row | MISSING |
