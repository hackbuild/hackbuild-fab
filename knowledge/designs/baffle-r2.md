# BAFFLE R2: how it is made

The rewrite that turned BAFFLE from a raster bench into the band kernel: four hex skin-bridge keys in a 2 x 2 stagger, a 44 mm skin-bridge slider, an ESP32-C3 SuperMini on printed contact bumps or wired to numbered screw lands, an I2S amp and a 30 mm speaker, in a white PETG case with a deep-tray lid. R3 grew it to six keys, a board table, a jack and a tile (`fab-knowledge:originals/baffle-r3/RECORD.md`); R2 is the smaller, direct-pin form and the first revision whose every route is a stated polyline.

Number rule: constants are bench defaults in the source file and line named beside them; check results are measured from a headless run on 2026-10-05; resistances are computed by the bench at rho 300 ohm mm (30 ohm cm).

Folder: `fab-knowledge:originals/baffle-r2/`.

## 1. Identity and revision

| field | value |
|---|---|
| owner name | BAFFLE R2 |
| slug | baffle-r2 |
| canonical revision | `~/Downloads/baffle (21).html`, 2026-09-13 21:20, 1747782 bytes |
| sha256 | `f29f203ed9d67b7326b3eb2402732719d8344eb491ffe42999d2768e8a067593` |
| copy here | `fab-knowledge:originals/baffle-r2/files/baffle_21.html` |
| sources | `fab-knowledge:originals/baffle-r2/files/src/model.js` (R2 model, 659 lines, equal to the downloads reader's `baffle-r2-model.from-baffle-21.js`), `fab-knowledge:originals/baffle-r2/files/src/bench.js` (UI, 296 lines), `fab-knowledge:originals/baffle-r2/files/src/orca3mf.js`; three.js, JSZip and the manifold wasm left out |
| exports | `fab-knowledge:originals/baffle-r2/files/baffle-wire-body.3mf` and `fab-knowledge:originals/baffle-r2/files/baffle-wire_4.3mf` (bench exports, 2026-09-13 17:16), `fab-knowledge:originals/baffle-r2/files/baffle-wire_3.slicer-save.3mf` (owner slice, 2026-09-13 17:16) |
| predecessor | `fab-knowledge:originals/baffle-r2/files/r1-raster/` holds the harvested pre-R2 release (README, print card, Python generator `baffle-src.zip`, raster bench `baffle-bench-src.zip`) from `fab-work-directory:benches/baffle/outputs/`; its rules (FIT table, slider topology fix, bump geometry) carry into R2 |

### 1.1 Revision table

| Downloads file | date | what it is |
|---|---|---|
| `baffle.html`, `(2).html` | 2026-09-08, 09-10 | Python generator layer viewers, 4 x 2 scan keys |
| `baffle (1).html` | 2026-09-08 20:09 | 3MF viewer over the shipped file |
| `baffle (3)` to `(8).html` | 2026-09-10 to 09-11 18:32 | raster bench (`RasterMesh`, maze router); `(8)` is the harvested build |
| `baffle (9).html` | 2026-09-11 20:24 | R2 first: manifold CrossSection bands, hex keys af 11.5, pitch 12.5 |
| `baffle (10)` to `(18).html` | 2026-09-12 to 09-13 17:04 | key af 14.0 by 09-12 13:10, af 21.0 pitch 22.0 by 09-13 17:04; 4 keys (2 x 2 stagger) |
| `baffle (19)`, `(20).html` | 2026-09-13 17:11, 17:16 | same R2, exports of 17:16 saved beside it |
| `baffle (21).html` | 2026-09-13 21:20 | last R2 |
| `baffle (22).html` | 2026-09-14 19:33 | R3 first |

### 1.2 Why (21)

It is the last R2 and every check is green in both mounts (measured below). The owner exported and sliced R2 wire mode at 17:16 the same day (`baffle-wire_3.slicer-save.3mf`), so the af 21 design was the one taken to the printer; (21) keeps that geometry.

## 2. What it makes and for whom

A 118 x 66 case and its lid printed flat on one plate in four filaments (white PETG body, pink PETG accent, conductive PLA, TPU 95A), with four keys and a slider played by skin, an ESP32-C3 SuperMini read on its ADC1 pins, and an I2S amp. For a maker who wants a no-solder instrument from one print plus a board.

## 3. Shots

Driven with `fab-knowledge:originals/_tools/shoot-tang-sensors.cjs`, 1280 x 860, ready about 4.8 s (measured), zero page errors.

| file | what it shows |
|---|---|
| `fab-knowledge:originals/baffle-r2/shots/r2-iso-plate.png` | ISO cam: body and lid side by side as printed; seat with three numbered I2S lands, amp posts, speaker gasket ring and grille; MOUNT chips (contact bumps, screw lands), CASE and KEYS rows; status `contact bumps`, `41,692 tris`, `build 1454 ms, checks 422 ms`, `plate 118 x 140 x 30.00 mm`, `all checks green` |
| `fab-knowledge:originals/baffle-r2/shots/r2-asm-closed.png` | ASSEMBLED cam with the lid closed |
| `fab-knowledge:originals/baffle-r2/shots/r2-play-face.png` | PLAY FACE cam: four pink hex tiles with conductive comb pairs, the 44 mm slider frame, the grille ring |
| `fab-knowledge:originals/baffle-r2/shots/r2-wire-nets.png` | NETS cam: body and TPU hidden; every conductive route from the castellation bumps down to the key and slider vias, the three I2S land rings, the pink tiles and border |
| `fab-knowledge:originals/baffle-r2/shots/r2-checks.png` | the CHECKS panel |
| `fab-knowledge:originals/baffle-r2/shots/slicer-baffle-wire-3.png` | the owner's slice of R2 wire mode: body and lid, orange TPU gasket ring |

## 4. Mechanisms, circuits and constructions

Line numbers in `fab-knowledge:originals/baffle-r2/files/src/model.js`.

### 4.1 Band kernel

Same construction as R3 (see `fab-knowledge:originals/baffle-r3/RECORD.md` 4.1): `LH 0.24`, `snap()`, bands ART 0 to 0.72, ISO1 to 1.20, RTE1 to 1.92, ISO2 to 2.40, RTE2 to 3.12, CAP to 3.84, PANEL 3.84 (`derive`, `:42` to `78`); cavity 14.64, lid rise 9.6 (the lid is a deep tray carrying extra wall so the body print stays short), lid 1.92, closed 30.00 (computed; matches the status strip). Helpers in `makeGeo` (`:118` to `172`) add `oblong()`. `build()` (`:321` to `558`), `check()` (`:560` to `620`), `weld()` and `meshes()` (`:625` to `655`).

### 4.2 Four hex skin-bridge keys, direct pins

`keyCentres` (`:174` to `183`): 2 x 2, row 1 at y 16.0 from x 17.0, row 2 offset half a pitch, pitch 22.0. `keyArt` (`:185` to `224`): af 21.0 tile, ring 1.0 inset 0.9 split at `gap/2 + 0.05`, fingers 1.0 on 2.0 pitch, reach limited by the slanted inner ring face and the split cut (the same rule R3 keeps, comments `:205` to `210`).

Pin map (`:81` to `105`): K1 to K4 on IO0 to IO3 (ADC1 channels 0 to 3, internal pull-down), VKEY on 3V3 drives all four combs (no scanning), SLD_S wiper on IO4, SLD_A and SLD_B on IO5 and IO6, I2S on IO10 (BCLK, land 3), IO20 (LRCLK, land 2), IO21 (DIN, land 1); IO7, IO8 (LED), IO9 (BOOT) unused and left without bumps. GND and 5V get no bump either: the amp's G and V are hand-soldered wires to the board because printed traces are kilohms and cannot carry amp power (`PIN_NOTES`, `:96` to `97`). Under IO9 a PETG block 2.6 x 1.7 at bump height (`:482` to `483`) gives the board a non-conductive rest at that corner. The board sits component side up with USB out the back wall (+Y); `COL_R` index 0 is the pin farthest from the USB (`:78` to `86`). Notes per pin explain the strapping and UART consequences (IO2 floats untouched at boot, touched sits at 3V3 through skin: both fine; IO20 and IO21 cost the UART0 console, USB CDC stays).

### 4.3 Skin-bridge slider

`sliderArt` (`:226` to `239`): track 1.2 from x 25.5 to 65.3, rails 2.2 at a 1.0 gap, end bar, frame 1.0, wiper tap at x 42.6. Swapped drive read as in R3 4.3. Swing measured at defaults: track 13.8 k, drives 12.1 k and 7.3 k, 42 percent (bump); 13.8 k, 8.7 k and 13.6 k, 38 percent (wire); warn under 30. Model (`:612` to `619`): rho 300 ohm mm; the track resistance uses the art band thickness 0.72 over its 39.8 length and 1.2 width (13.8 k computed), the drives use the route band thickness and add any 1.2 wide stub; `swing = Rtrack / (Rtrack + RA + RB)`.

### 4.4 Stated routes on two buried layers

`routes()` (`:255` to `317`): VKEY on route layer 1 as a spine joining both drive-via rows; every other net on layer 2. In snap mode each pin goes straight to its sense via, with stated jogs where IO2 to IO4 pass under the slider tap (lanes at the pad y minus 0.4 and 0.9, packed at 0.8 clearance) and K4 rounding the amp boss; slider drives stay 1.2 wide across the pin column and widen to 2.4 after. In wire mode eight lands sit in one numbered row at y 5.0 along the front wall (VKEY, K1, K3, SLD_S, K2, SLD_B, K4, SLD_A); in snap mode three lands (DIN, LRCLK, BCLK) sit in front of the seat.

### 4.5 Seat with contact bumps, lid ribs and lip

Defaults `seat` (`:24` to `25`): bumps 3.0 x 1.7 proud 0.48, pocket clearance 0.15, slide 0.7, wall 1.6, rim 1.92, lip 6.0 wide 1.4 proud. Lid ribs (`:536` to `544`): in snap mode two ribs 4.0 wide run along the two pin columns (`colL`, `colR`) from `pinY[0] - 0.4` to `pinY[5] + 1.0`, which is y 42.85 to 56.95 at defaults (computed), so they press the castellations of IO0 to IO5 and IO21 to IO6 and skip the unbumped 5V and G end; in wire mode one 3 x 6 rib presses the board centre. Each rib is PETG from the lid plate down to `ribBot` with a TPU tip 0.72 (`lid.tpu`) below, and `ribBot = snap(boardTop - preload + tpu)` sets a 0.28 preload (`:31`, `derive` `:75` to `76`). The `lid.ribY` default [42.5, 56.8] at `:31` is not read by `build()`; the rib span comes from the pin rows. Checks (`:596` to `605`): bumps keep 0.84 along the 2.54 pitch, ribs preload the board 0.28, lip clears the board top by 0.20, amp terminal clears the lid by 12.18, speaker by 15.78, USB arch closes below the groove, screw pilots 6.00 deep for a #2 x 1/4 in screw (all measured, snap mode).

### 4.6 Screw land deck

Deck top 7.2, conductive annulus 0.48, ring 2.3, pilot 1.7 (R3 later opens it to 2.4), post offset 1.6, pink digits 2.4 (`:30`, `:390` to `412`, `:488` to `495`). The screw threads into conductive PLA.

### 4.7 Case, lid, amp and speaker

Snap lid with skirt 3.84 x 1.2, bead 0.6 into a 0.6 groove at 0.2 clearance; pink stripe on the lid; button holes 3.6; amp bay at x 44, y 39.8; speaker at x 99, y 32, frame 30, gasket in TPU; grille holes 2.0 on a 3.2 hex pitch inside a 25 port (`grilleArt`, `:241` to `253`).

### 4.7a Printed fit details in the shell (`build()`, `:449` to `544`)

- Board lip on the far end wall (`:473` to `478`): a 6.0 wide overhang starting `lipZ0 = snap(boardTop + 0.2)`, grown in four 0.24 steps of 1.4/4 each and then held at 1.4 for one more layer band, so it prints as a 45 deg corbel with no support and the board slides under it toward the USB window.
- USB window and stepped arch (`:458` to `466`): the window spans `usbW + 0.7` from `boardBot - 0.3` to `boardTop + usbH + 0.7`; above it each 3-layer step pulls both sides in by 1.08 (45 deg at 0.72 per step), three steps, so the bridge that closes it is about 4 mm instead of 10 (code comment).
- Lid groove in the body wall (`:452` to `456`): three layer bands thin the wall by 0.6, 0.4 and 0.2 from the bottom of the groove up, so the groove top is a printable chamfer.
- Lid bead (`:530` to `534`): three layers on the skirt, protruding 0.3, 0.6 and 0.35 in print order (catch face, full bead, lead in), clipped to the two long sides only, so the short ends flex less and the lid can still be opened.
- Deep-tray lid walls (`:524` to `527`): the lid wall continues the body outline up by `rise` 9.6 and is filled inward to the skirt's inner face (wall + gap + skirt, about 3.8 thick) so the skirt rises straight off it instead of hanging over the cavity.
- Lid art (`:516` to `521`): a pink stripe from y 5 to 10 inlaid flush in the top art band, and two 3.6 holes over the SuperMini BOOT and RESET buttons at `by1 - 5.5`, `bcx +/- 4.5`.
- Screw land ring (`:388` to `396`): the conductive ring (`ringR` 2.3) runs as a solid annulus from its route band to the deck top with the 1.7 pilot bored through it, plus a neck to the trace end, so tightening a screw loads a 4.6 tube bonded on every layer instead of a 1.6 post.
- Relief under the board (`:423` to `425`): snap mode leaves a pocket in the CAP band under the 5V, G and 3V3 solder stubs; wire mode leaves two channels for the header tails along both columns, registered as obstacles for the route bands.
- Amp seat (`:497` to `500`): a 0.8 wide ridge two layers tall round the 38.4 x 22.4 module footprint (0.3 slack) and two bosses 4.6 dia, four layers tall, with 1.7 pilots at the module holes.
- Speaker (`:502` to `505`): TPU gasket ring four layers tall from `port/2 + 1.0` to `port/2 + 2.6` round the grille, and two ear bosses 5.0 wide at the 39 ear span with pilots, kept 0.3 clear of the gasket.

### 4.8 Checker

`check()` (`:560` to `620`): each net one printed body; body count equals nets minus one (the slider track is one body shared by SLD_A and SLD_B, and the art-band clearance test skips that pair); band clearance with thresholds from the code (`:574`: art `gap - 0.03` = 0.97, rte1 and rte2 `clear - 0.05` = 0.75, seat 0.80, deck 0.60), each net grown by the threshold must not touch any other; slot pairs do not overlap; fits in 4.5; every feature boundary on a 0.24 line; slider swing. Measured build 1236 ms and checks 343 ms headless (snap).

### 4.9 The R1 lessons R2 kept (from `fab-knowledge:originals/baffle-r2/files/r1-raster/README.md`)

- Slider topology inverted: driving the rails and reading the track ends against about 45 kohm pull-downs moved the ratio under 10 percent; drive the track ends both ways and read the rail.
- Cavity must be a whole number of 0.24 layers (13.36 moved to 13.68 in R1, `check.py` refused off-layer z).
- Contact bump size at 2.54 pitch: anything wider than about 1.74 along the pitch leaves a gap narrow enough for slicer gap fill to weld pads; R1 used 1.6 to 1.7 by 2.6; R2 and R3 use 1.7 along the pitch (0.84 gap measured).
- Wipe tower on and purge to the tower, or conductive material bleeds into the PETG and shorts neighbouring pads (R1 print card).
- R1 used a grid Dijkstra router (and a JS port that starved on Float32 costs); R2 replaced searching with stated lanes the checker proves.

## 5. UX anatomy

Same shell as R3 without the board table and tile: header with OPEN JSON, SAVE JSON, PRINT CARD, STL BUNDLE, EXPORT 3MF, BODY 3MF, LID 3MF; three-step guide strip; cams ISO, AS PRINTED, PLAY FACE, ASSEMBLED, NETS; legend with net chips that light one net through the stack; section and lid sliders; rail panels MOUNT, CASE, KEYS, SLIDER, CONDUCTIVE, PANEL, SEAT, LID, SNAP FIT, SPEAKER, AMP, SCREW LANDS, CHECKS, PIN MAP, WIRING (`fab-knowledge:originals/baffle-r2/files/src/bench.js:13` to `27`); status with mode, tris, ms, plate and verdict. Defect seen in every R2 shot: the header carries BODY 3MF and LID 3MF twice, because `baffle_21.html:61` declares `bExportBody` and `bExportLid` twice (once lower case, once upper case) with the same ids, so only the first pair is wired by `getElementById`; R3 has one pair. Hook `window.BENCH = { P, model, exportBytes, setP, boot }` (`bench.js:11`, `:272`, `:286`, `:292`).

## 6. Tests and harness

In-page `check()` only; no node test file in the recovered R2 files. R1's Python `check.py` ("Nothing ships until every line here is green") is in `fab-knowledge:originals/baffle-r2/files/r1-raster/baffle-src.zip`.

## 7. Port map

| item | value |
|---|---|
| packages | geom (CrossSection), mesh (band prisms, weld), circuit (net per body, band clearance, swing), 3mf, checks, ui-core |
| feature kinds | conductor, pad, port (bumps, lands), contact (bump to castellation), pocket (seat), snap (lid bead), boss, window (grille, USB arch), bore (pilots), lamination (art band inlays) |
| canon ids | blocks-board-seat (bumps mode), buried-trace-stack (family) |
| canon MISSING | direct-pin hex skin-bridge key and the skin-bridge slider with swapped drive pair (both only candidates in CANONS.md section 8.3); C3 SuperMini bump seat as its own row (c3-carrier is a board-family candidate); deep-tray lid with preload ribs |
| reference ids | seats/blocks-seat, conductors/buried-trace-stack (named in CANONS.md; no folder yet) |
| reference MISSING | skin-bridge key, skin-bridge slider |
| milestone | M05, M06, M09 |
| lineage row | MISSING |
