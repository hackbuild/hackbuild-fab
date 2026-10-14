# GUDGEON: how it is made

A pocket clamshell printed flat in one piece with its hinge already
assembled: a base whose floor is a printed circuit (nine touch pads and a
finger slider in conductive PLA, two buried trace layers, conductive cups a
header-pinned RP2040-Zero presses into) and a lid that carries a 1.28 in
GC9A01 round screen behind a window, wired over the hinge. This record is
written from the original code so a builder can make the same parts, the
same way. Nothing in it comes from the quarantined mockups.

Number convention. Every number carries a qualifier: `computed` (the bench's
own arithmetic or a headless rerun of it), `measured` (a drive of the bench,
a byte count, a timer), `vendor` (a supplier or retailer figure),
`inferred` or `unknown`; or it cites the source file and line that declares
it. Short paths:

| short | absolute path |
|---|---|
| ORIG | `fab-knowledge:originals/gudgeon/` |
| EX | `fab-knowledge:originals/gudgeon/files/extracted/` (project scripts cut out of the bench; three r128, JSZip, earcut and the fonts left out) |

Line numbers cite `EX/<file>`. `03` is `03_part2b_kernel.js`, `04` is
`04_part2c_state.js`, `05` is `05_part2d_circuit.js`, `06` is
`06_part2e_compose.js`, `07` is `07_part2f_build.js`, `08` is `08_part3.js`.
The bench also inlines `rastermesh.js` and `orca3mf.js` (print-forge skill
copies, read at
`fab-knowledge:evidence/x/downloads/dl-gudgeon-tang-keyway/extracted/gudgeon/01_rastermesh.js`
and `02_orca3mf.js`).

---

## 1. Identity and revision

| item | value |
|---|---|
| canonical revision | `gudgeon.html`, the only revision found, copied as `ORIG/files/gudgeon.html` |
| sha256 | `6ab837e3e233ffbed8c635ab9230649109c3a05cd525ce6db9d6aa89aded3735` |
| date | 2026-09-16 12:31 local (file mtime, `~/Downloads/gudgeon.html`) |
| bytes | 1052653 (measured); app scripts 101522 bytes (measured, the six files `03` to `08`), plus a 203 KB shell with inlined fonts |
| storage | none (no localStorage key); designs move as `gudgeon-design.json` |
| title | `GUDGEON.deck`, "print in place folding round screen deck with a printed circuit face" |

Why this revision: it is the only one. No 3MF, design JSON or source zip
was ever downloaded, and no print is recorded (unknown whether it was
printed). Search scope: `~/Downloads`, the fab work directory
(its only `gudgeon` hit is `pintle-derrick/outputs/derrick/stl/derrick-gudgeon.stl`,
an unrelated part name), and the knowledge base
(`fab-knowledge:sources/downloads/dl-gudgeon-tang-keyway.md`
section 3). It sits two days before HAFT and is the earlier of the two
printed-circuit bodies with an RP2040-Zero: GUDGEON (2026-09-16) has single
square touch pads, an H/V router and header-pin cups; HAFT (2026-09-17
onward) has combs, moving keys, a negotiated router and press-fit bumps.

Corrections to the family brief. GUDGEON has no touch comb; its keys are one
exposed square pad per GPIO. Its hinge carries no conductor; the seven screen
wires are real wires routed through a pass in each rear wall and over the
hinge.

### 1.1 Files in ORIG/files

| file | what |
|---|---|
| `gudgeon.html` | the bench, one file, opens from disk |
| `extracted/00_shell.html` | shell markup and CSS (fonts inlined) |
| `extracted/03` to `08` | the six project scripts, sha256 in `ORIG/SHA256SUMS` |
| `runs/gud.js`, `runs/gud_out.json` | headless rerun of geometry, router and electrics (blank, example, 4 x 3 keys, no keys), from the downloads reader |
| `exports/gudgeon.3mf` | the hack.build deck example, written by the bench's own exporter on 2026-10-05 (1385353 bytes, measured) |
| `exports/print-card.txt` | the bench print card for the same design (3153 bytes) |
| `exports/gudgeon-design.json` | the design JSON (4004 bytes) |

Skipped as vendor-only: three r128, JSZip, earcut, fonts.

---

## 2. What it makes and for whom

A maker with a four head printer (Flashforge Creator 5 Pro, 0.4 nozzle,
`04:24` to 25) wants a small handheld with a round screen and touch input and
no circuit board of its own. They set the tray size, the key grid and the
slider, lay art on three faces, and get one 3MF: both halves flat on the bed,
open side up, the hinge between them, 92 x 141 mm footprint for a 92 x 66 x
22.08 mm closed deck (computed, `MODEL.dims`). After printing they work the
hinge free, press the header-pinned RP2040-Zero into its cups, screw the
screen into its collar, run seven wires over the hinge, and fold it shut.

---

## 3. Shots

Driven with puppeteer-core and Chrome headless (software WebGL,
`--use-angle=swiftshader`) at 1280 x 860, driver
`ORIG/drive/drive.mjs`, report `ORIG/drive/report.json`. Zero page errors and
zero console errors (measured). Boot to a settled blank build 8.8 s, the
example build 2804 ms and 161,390 triangles (measured on software WebGL).

| file | caption |
|---|---|
| `fab-knowledge:originals/gudgeon/shots/g-01-example-step1-deck-open110.png` | Step 1 DECK on the hack.build deck example, assembled view open at 110 deg: nine black conductive PLA pads, the slider track and bus, the RP2040-Zero ghost (cyan) seated on its cup row with the USB plug ghost at the left wall, the screen ghost (green) in the lid collar, nine hinge knuckles; status `fits bed, mesh current, fold clear` and one amber warning `build over 2.5 s, drop resolution` |
| `fab-knowledge:originals/gudgeon/shots/g-02-example-top.png` | top camera: the knuckle row alternating lid and base, the board with its two cup rows and tail, the key block centred in the front strip, the slider beside the board, the deck art (chevrons, GUDGEON) kept off the circuit |
| `fab-knowledge:originals/gudgeon/shots/g-03-print-bed-flat.png` | PRINT BED view: both halves flat and open side up, lid beyond the hinge, exactly as it prints |
| `fab-knowledge:originals/gudgeon/shots/g-04-lid-folding-30deg.png` | open slider at 30 deg: the lid swings about the hinge axis over the base, its outer face (pink ring around the window, black `hack.build`, chevrons) now visible from above |
| `fab-knowledge:originals/gudgeon/shots/g-07-step3-art-deck-circuit.png` | Step 3 ART, deck zone: the stage splits into the 3D view and the face editor showing the exact print raster of the deck face, with the cup ring row, slider and pads reserved and the art layers (chevrons, GUDGEON) around them; LAYERS list and the drag hint |
| `fab-knowledge:originals/gudgeon/shots/g-09-step4-print-rail-bottom.png` | Step 4 PRINT, rail bottom: HOOKUP readout (trace 4.2 k/cm, routed 12 / 12, slider range 11 percent, 8.6 counts per mm, pad C about 8 pF, all computed) above the hookup text; EXPORT with 3MF PROJECT (pink), STL ZIP, PRINT CARD, FACES PNG and the readout (closed height 22.08, base and lid 13.68 / 8.40, knuckles 9 x 8.7, axis z 11.04, base layers 57, deck plate 6.24, grams per slot) |

Extra states not kept as record shots are in `ORIG/drive/extra-shots/`
(welcome card, step 2 shell, lid art, step 4 rail top).

---

## 4. Frame, stack and build order

### 4.1 Frame

Tray local mm: x right, y toward the hinge, z up from the bed (`05:2` to 3).
The base occupies y 0 to D; the hinge axis sits at `ya = D + gap/2`; the lid
prints at y `LID0 = D + gap` to `LID0 + D`, mirrored so its hinge edge faces
the base (`04:74` onward, `geom()`).

### 4.2 Derived geometry (`geom()`, `04:73` onward)

Every height is snapped to the 0.24 layer (`snapLayers`, `04:73`). Base plate
stack from the bed, computed at defaults (`runs/gud_out.json`):

| slab | z | contents |
|---|---|---|
| bottom art | 0 to 1.20 | underside art, mirrored for the bed face |
| solid core | 1.20 to 1.68 | body only |
| bore core | 1.68 to 2.64 | body; cup rings conductive; pin bores open |
| H trace layer | 2.64 to 3.36 | traces running in x, vias, cup rings |
| insulation 1 | 3.36 to 3.84 | body; vias at layer changes and at each pad, cup rings |
| V trace layer | 3.84 to 4.56 | traces running in y, vias, cup rings |
| insulation 2 | 4.56 to 5.04 | body; pad vias, cup rings |
| pad layer | 5.04 to 5.76 | pads, slider, cup rings |
| face | 5.76 to 6.24 | deck art; pads and slider exposed (or covered, `keys.cover`) |
| base wall | 6.24 to 13.68 | `baseWall 7.5` snapped (7.44) |

Lid: plate 1.68 (art plus core) plus room for the screen module and pin
stubs `thk 3.2 + pinRoom 3.5`, snapped: `HL` 8.40. Closed height `HB + HL`
22.08. Hinge: `gap = 2 (KR + 0.7)` 9.0, `ya` 70.5, `za = (HB + HL)/2` 11.04,
`LID0` 75, knuckle span `min(96, W - 2 wall - 4)` 83.2, `n = max(3, knuckles | 1)`
(odd, at least 3) 9, knuckle width `kw = (span - (n-1) clear)/n` 8.71, first knuckle at
`xs = (W - span)/2` 4.4. Even knuckles belong to the lid, odd to the base. All
computed at defaults (`04:9` to 28 declares: tray 92 x 66, wall 2.4, corner 9;
screen disc 37.5, length 45, tab 20, thickness 3.2, pcb 1.2, glass 35.3,
active 32.4, window 33.0, hole spacing 30, hole 1.8, pin room 3.5; mcu 18 x
23.5, pitch 2.54, pin room 3.0, USB left, lane 6, bore 0.9, cup 1.9; keys 3 x
3, 8.5 square, pitch 10.5, corner 1.5; slider on, 50 long, track 3, bus 2,
gap 1.5; trace 1.0, clearance 0.5, via 1.6, rho 30 ohm cm; shell baseWall
7.5, KR 3.8, PR 2.0, 9 knuckles, axial clear 0.6, bore clear 0.3, rod flat
0.15).

### 4.3 Build order (`build()`, `07:7` to 118)

1. Geometry `geom()`.
2. Circuit: `CIRC.layout` then `CIRC.route` then `CIRC.electrics` (`07:13` to 16).
3. Art: compose the bottom, deck and lid zones on a tray grid at `print.res` 6 cells per mm (`07:18` to 19, section 5.9).
4. Circuit masks on the same grid (`07:20`, `06:162` to 183).
5. Base raster volume: one label array per slab (the table in 4.2), each the body mask with conductive masks painted in and pin bores cleared, stacked with `addSlab` in ascending z (`07:21` to 33).
6. `fixPinches()` heals cells where two labels meet only along an edge or a corner (`07:34`); a warning when more than 0.2 percent of cells changed (`07:43`).
7. Lid raster volume: lid art on the bed face, then the core with the screen window open (`07:36` to 42).
8. Constructive prisms: base wall ring with notches, lid wall ring with its wire pass, screen collar and screw bosses, hinge knuckles and webs, the rod (`07:44` to 93).
9. Group by slot per half, move the lid group to world y `LID0 + y`, merge per slot (`07:94` to 105).
10. Fold sweep (`07:107` to 108), rod bridge and min feature warnings (`07:109` to 111).

No CSG anywhere. Parts are stacks of overlapping watertight prisms per slot,
and the slicer unions them (`03:2` to 4).

---

## 5. Mechanisms, circuits and constructions

### 5.1 Constructive prism kernel (route B)

What it does. Builds every non-raster solid from extruded 2D loops with
holes, so walls with openings never need a boolean.

Construction (`03`):

1. Loop hygiene: `K.dedupe` strips duplicate points and collinear midpoints in up to three passes, because earcut skips collinear boundary vertices and the caps would T-junction against per-vertex wall skins (`03:12` to 28).
2. `K.prism(outer, holes, c0, c1, map)`: outer CCW, holes CW; caps from earcut over the bridged loops, walls from the original loops; flip if the signed volume is negative (`03:38` to 66).
3. Three extrusion frames: `pz` along z, `px` along x (for profiles in y, z: knuckles, webs, the rod), `py` along y (`03:70` to 72).
4. Stacked prisms of one part overlap by `EZ 0.02` in z so the slicer sees one solid (`07:5`).
5. Tray outline: straight hinge edge at y = D, front corners round (radius `corner`, `max(6, round(1.2 corner))` segments per quarter circle, so 11 at the default 9) or facet (chamfer). CAPSULE is a chip, not a kernel shape: it stores `shape 'round'` with `corner = min(W/2, 0.45 D)` (29.7 at defaults, computed), so a reload shows ROUND with a large corner (`03:93` to 106; `08:178`).
6. Wall ring with notches (`K.ring`, `03:113` to 147): the outer and inset loops get extra vertices where each notch meets the edge, and the band between them is cut into C-shaped loops between notch ends. A wall with k notches becomes k separate prisms; the opening is simply where no loop runs.

### 5.2 Clamshell shell: walls, notches, screen bay (canon MISSING)

Base wall (`07:46` to 59): a full ring from the face to the lowest notch
floor, then the notched band up to `HB`. Two notches: the USB notch on the
side wall (left by default), y `board.cy +- 5.5`, floor at `face + 2.5`; the
screen wire pass in the rear edge (y max), x `wall + 1` to `wall + 7`, floor
at `face + 1.5`. The code comment says the pass is "outside the knuckle span"
(`07:48`); at defaults it is not: the pass runs x 3.4 to 9.4 and knuckle 0
(a lid knuckle) runs x 4.4 to 13.1, so 5.0 mm of the pass sits behind a
knuckle (computed from `geom()`). The seven wires leave the base wall 0.7 mm
in front of that knuckle's circle and have to bend over or round it; no
check covers the wires (inferred). If the two floors differ, the
band is split again at the higher one.

Lid wall (`07:61` to 64): the base outline mirrored about `D/2` so the hinge
edge is at lid y 0, a full ring to `lidPlate + 1.5`, then a ring with the wire
pass at y min.

Screen collar and bosses (`07:66` to 79): `moduleLoop(o)` traces the module
outline (disc `disc/2 + o` and the tab `tabW/2 + o` running toward the hinge
to `tabY0 = wall + 1.5`), the collar is the loop at offset 1.45 minus the loop
at 0.25, from the lid plate to `lidPlate + 2.0`; two screw bosses r 2.3 with
`holeD/2` pilots at `+-holeSp/2`, `tabY0 + 3.0`, up to `lidPlate + (thk -
pcb)`. The window `win/2` is cut through the lid raster (`06:125`). Screen
centre `scy = wall + 1.5 + (len - disc/2)` in lid local y (`04`, end of
`geom()`).

Limits. Screen ears and their 30 mm spacing are read from a product photo
(vendor photo, inferred), and the 37.5 / 45 / 3.2 figures are the retailer's
for the 7 pin blue board (vendor); the rail note asks for calipers
(`00_shell.html`, SCREEN panel). USB notch height and plug clearance have no
fit row.

### 5.3 Print-in-place knuckle hinge with a continuous rod (LOCKET topology; canon MISSING for this variant)

What it does. Nine knuckles alternate lid and base along the rear edge; one
rod runs the whole span and is anchored in every lid knuckle, so each bore
crossing in a base knuckle is a bridge held at both ends. Flats on the rod
stop it rolling.

Construction:

1. Knuckle profile in (y, z) (`K.knuckle`, `03:153` to 177): a circle of radius `KR` from its bottom point around the wall side to the far equator, then a chord back to the bottom, so the unsupported lower quadrant becomes a 45 deg facet (base: facet on the y > ya side; lid: on the y < ya side). A web quad reaches from the circle into the wall: top edge meets the wall face at the rim and never above it, 0.6 into the wall, 45 deg underside, stopping `webStop = bore + 0.4` short of the axis so it never touches the bore. If the 45 deg underside would go below the bed, the web is cut flat at z 0.
2. Base knuckles (odd): profile with a bore hole `PR + boreClear` (2.3), extruded along x over `[x0, x1]` (`07:83` to 86).
3. Lid knuckles (even): profile with no hole, extruded along x (`07:87` to 90).
4. Rod (`K.rod`, `03:179` to 184): a 36-point circle r `PR` with z clamped to `za +- (PR - flat)`, extruded along the whole span in the lid group, so it fuses with every lid knuckle and passes through every base bore with 0.3 radial clearance (`07:93`).
5. Axial gaps `clear 0.6` between knuckles: "0.6 mm gaps for 2.5 layers of air" (SHELL note, `00_shell.html`).

Checks: `hinge axis too low` if `za - KR < 0` (`07:11`); rod bridge inside each
base knuckle `kw` warned over 8.8 mm, "the 8.8 mm PETG record" (`07:109` to
110; 8.71 at defaults, computed). Print card: "Work the hinge gently after
printing"; no brim, because a brim welds the knuckle gaps (`08:24` to 25).

Limits. No printed hinge is recorded (unknown). The 8.8 mm figure is a bench
constant with no source cited in the file; the nearest recorded 8.8 mm PETG
bridge is a SLATE print audit
(`fab-knowledge:sources/benches/benches-cases.md:885`,
inferred link).

### 5.4 Fold sweep (canon MISSING; the plan's hinge rule waits in CHECKS section 9.9)

What it does. Proves on every build that the lid can swing from flat to
closed without hitting the base (`sweepCheck`, `07:121` to 161).

Algorithm:

1. Rasterise y, z profiles at 0.2 mm on a canvas, for five x-slot types: `edge` (full blocks), `plain` (plates, walls and the screen collar band), `gap` (plain plus the rod), `lidK` (plain plus a lid knuckle, its web and the rod), `baseK` (plain plus a base knuckle with its bore and web, and the rod).
2. Collect the centres of the lid's filled cells.
3. For each angle from 2 to 178 deg in 2 deg steps, rotate those points about (`ya`, `za`) and count how many land in a filled base cell; more than 3 hits is a collision.
4. Report the smallest colliding angle and its slot type; the status strip shows `fold clear` or `fold collides` in red, and a warning names the angle (`07:107` to 108; `08:413`).

Limits. It needs a DOM canvas, so it does not run in the node rerun
(`runs/gud.js` stops before it). Profiles are 2D per slot type, so a
collision between two different x positions is not seen. The 3-hit tolerance
is a bench constant (`07:155`).

### 5.5 Touch pads (canon `capacitive-plate`)

What it does. A grid of exposed conductive PLA pads on the deck, one GPIO
each, read as self capacitance through skin.

Layout (`05:36` to 54): up to `nx x ny` keys, capped at the 12 free key
GPIOs `GP0 to GP8, GP27, GP28, GP29` (`05:19`) with a warning; the block
`nx pitch x ny pitch` centred in the front strip from `inner.y0 + 2` to
`board.y0 - 3`; pad size `min(size, pitch - 1.5)`. Pins are assigned column
by column, front row first, so the fan-out from the header row stays planar
(`05:52` to 54). Warnings when the block is too wide or too deep.

Construction: a rounded square of `size`, corner `corner`, painted into the
pad slab (5.04 to 5.76) and the face slab (5.76 to 6.24) in the conductive
slot (`06:180`; `07:30` to 31). With `keys.cover` the face slab keeps the
deck art instead, so the pads sit two layers under the face; the rail note
says the signal then drops to a few pF and wants an MPR121 (`00_shell.html`,
KEYS panel). A via disc at the pad centre runs from the pad down through both
insulation slabs to the trace layers (`06:172` to 179).

Read (hookup text, `05:201`): drive the pin high, switch to input with the
internal pull down, count until it reads low; a finger adds body capacitance
and the count grows several fold; threshold against a per-key baseline;
PIO or a tight loop; MPR121 as the plug-and-play alternative. Pad C bare is
`0.0885 x size^2 / 1000 x 3 + 8` pF, about 8 pF (computed, labelled rough,
`05:190`).

Limits. Pad area at defaults is 70.3 mm2 (`8.5^2 - (4 - pi) 1.5^2`, computed),
under the 120 mm2 `plate.minArea` inferred constant of `capacitive-plate`
(CANONS section 4 limits). The bench writes no firmware, so the read is text
only. No measurement exists (unknown).

### 5.6 Finger slider (canon `finger-pot`)

What it does. A ratiometric position slider with no moving part: a resistive
cPLA track and a parallel bus, the fingertip is the wiper.

Layout (`05:56` to 69): in the rear band beside the board, from `board.x1 +
5` to `inner.x1 - 2` (USB left), length `min(len, room)` with a warning when
shortened and the slider turned off under 20 mm; track `track` wide and bus
`bus` wide separated by `gap`, centred on the board's y; terminals A at the
near end of the track, B at the far end, W on the bus one lane inboard at the
far end, so the three rear header pins fan out without crossing. Pins A GP14,
B GP15, W GP26 (ADC0) (`05:20`).

Construction: two rectangles painted into the pad and face slabs, always
exposed (`06:181`; `07:30` to 31).

Electrics (`05:178` to 189), computed at defaults:

| quantity | equation | value |
|---|---|---|
| exposed thickness | `tt = face - ins2 top` | 1.20 mm |
| track | `rho (len/10) / ((track/10)(tt/10))` | 4.2 kohm |
| bus | same with `bus` | 6.3 kohm |
| leads | routed SA plus SB | 35.5 kohm |
| share of ADC | `Rtrack / (Rtrack + Rlead)` | 11 percent, 431 counts of 4096, 8.6 per mm |
| settle | `5 (skin 300 kohm + Rbus) x 100 pF` | 153 us |

Read: drive A high and B low, read W; swap and read again; position is the
ratio of the two reads, so skin resistance cancels; touch is either read off
the rail (`05:207`).

Limits. cPLA leads (35.5 k) swamp a cPLA track (4.2 k), so the slider spans
11 percent of the ADC (computed), the same finding TANG made. The hookup line
says "100 nF from W to GND" while the settle is computed with 100 pF
(`05:187` against `05:208`); at 100 nF the settle would be about 153 ms
(computed). One of the two is a slip; unknown which was meant.

### 5.7 RP2040-Zero header-pin cup seat (canon `rp2040-zero-seat`, header-pin cup variant)

What it does. Seats an RP2040-Zero with a soldered 2.54 header, pins clipped
to length, pressed straight into conductive cups in the deck. No pad bumps,
no clamp.

Pin table (`05:9` to 18), board local u across 18, v along 23.5, USB at +v:
edge pins 1.27 in from the edge on a 2.54 grid ("Waveshare drawing; confirm on
the board with calipers"); left column 5V, GND, 3V3, GP29 to GP26, GP15,
GP14; right column GP0 to GP8; bottom row GP13 to GP9.

Placement (`05:27` to 35): long axis along x, USB edge 1.0 in from the inner
wall face so the connector overhang sits in the notch; `by = inner.y1 - lane
- w/2`, a 6 mm lane behind the board for the rear fan-out.

Construction (`06:165` to 166; `07:22` to 31):

1. A bore of `bore 0.9` at every one of the 23 pins, cleared in every slab above the solid core, from z 1.68 to the face at 6.24, 4.56 deep (computed). Unused pins get a bare bore.
2. A conductive ring `cup 1.9` OD at every used pin, painted into every slab from 1.68 up to the face, so the clipped header pin wedges into conductive plastic through the full depth.
3. Escape stubs: from each used cup 2 mm straight out, on the layer that runs that way (x on H, y on V), with the cells around the stub blocked for others (`05:93` to 103).
4. The board itself floats on its header spacer above the deck; the ghost puts it at `face + 2.5` (`08:121`).

No trace passes between two cups (the escape stubs leave straight), so the
retired PIP claim about a trace fitting between 5.2 mm cups does not apply
here (CANONS section 4 limits).

Limits. The rail note says "the blind bores are 3.36 deep", which matches an
earlier single-trace stack; the current stack gives 4.56 (computed). There is
no fit row for bore grip or cup wall; the print card asks to clip pins to
`pinRoom 3.0` "below the spacer" (`08:26`).

### 5.8 Two buried layers and the H/V router (canon `buried-trace-stack`; router canon MISSING)

What it does. Routes every key and slider net from its cup to its pad or
terminal on two buried layers, H running in x and V in y, with printed vias.

Router (`CIRC.route`, `05:79` to 168):

1. Grid 0.5 mm over the tray's bounding rectangle inset 1.5 mm (x 1.5 to W - 1.5, y 1.5 to D - 1.5); traces may run under the walls (`05:80` to 82). The grid does not follow the rounded front corners, and the slab masks keep conductive cells only where the body exists (`07:22`), so a trace routed into a corner outside the outline would be cut without a warning (inferred; the defaults route nowhere near the corners).
2. Obstacles: every pin disc (cup or bore) plus `clear + w/2`, every via target `via/2 + clear + w/2`, on both layers (`05:88` to 91).
3. Escape stubs as in 5.7.
4. Nets in order of Manhattan length, shortest first; for each, open its own cup and target, A* over (cell, layer): layer 0 moves only in x, layer 1 only in y, a layer change costs 8 and needs the other layer's cell free; Manhattan heuristic; 3,000,000 pop guard (`05:138` to 167).
5. After each net, block a square of `ceil((w + clear)/0.5) - 1` cells around every path cell on its layer, and a via disc at each layer change (`05:129` to 133).
6. Up to four passes: failures move to the front of the order; keep the pass with fewest failures, then shortest length (`05:108` to 115).

Defaults route 12 of 12 nets in pass 0 (computed, `runs/gud_out.json` and the
drive). Masks (`06:167` to 182): each layer's segments are stroked at `w`
with round caps, and each stroked layer also carries a `via/2` disc at every
layer change and at the net's pad centre (`06:171` to 173); via discs `via/2`
at layer changes and at each pad centre go into insulation 1, and pad-centre vias into the V layer and insulation 2, so
every pad has a column from whichever layer its trace arrives on up to the
pad (checked by point-in-mesh tests on the exported 3MF at five of the nine
pad centres, K1, K2, K4, K7 and K9, z 3.0 to 6.0, measured 2026-10-05;
K1, K4 and K7 arrive on the H layer).

Electrics (`05:171` to 176): `perCm = rho / ((w/10)(zt/10))` with `zt` the
0.72 trace layer: 4166.7 ohm per cm at 30 ohm cm (computed); path length adds
1.2 mm per via. Key leads 36 to 69 mm, 15.1 to 28.9 kohm (computed, print
card). The hookup text closes: "Fine for touch and high impedance reads;
never for SPI, which is why the screen is wired" (`05:210`).

Limits. Insulation between layers is 0.48 (two layers); HAFT later moved to
0.96 because one bad layer bridges a crossing (PIP lesson). There is no net
connectivity check, no clearance measurement on the mesh and no fit table.
The 30 ohm cm figure is Protopasta's (vendor); the "about 4 kohm per cm"
figure is computed, not measured.

### 5.9 Art zones on three faces (raster inlay; canon MISSING)

What it does. Lets the person place text, shapes and images on the lid's
outer face, the base underside and the deck, printed as inlaid colour in
slots 2 and 3, kept off the circuit and the rim.

Construction (`06:8` to 150):

1. Tray grid at `res` cells per mm (6), one cell border (`06:8` to 12); a canvas in tray mm with y up (`06:14` to 21).
2. Zone frames: lid and bottom centred on the tray, deck centred on the interior (`06:97` to 101).
3. Paint the outline as the body label; paint the reserved mask: the rim band under the walls, and on the deck everything outside the interior plus a 0.6 mm keep-out around pads, slider, cups and the board footprint (`06:116` to 122, 153 to 160).
4. Per layer, paint an alpha mask: shapes (rect, ellipse, ring, frame, diamond, chevrons with stroke `t`), text in one of four fonts with letter spacing, optional arc, and a `|` that splits the text into two slots with a gap (`hack|.build`); arc text ignores the split and prints in the first slot only (`06:58` to 68, 130), images by luminance threshold or silhouette (`06:36` to 94). Cells take the layer's slot where the base is body and not reserved; `cut` layers punch through.
5. Hygiene per inlay slot, skipping the body and the conductive slot (`06:138` to 147), all in cells at `res` cells per mm: stroke boost dilates by `round(boost res)` cells (1 at defaults), morphological open with a disc of `floor(res minF/2)` cells (1, kills features under `minF 0.6`), despeckle drops islands under `round(0.35 pi (res minF/2)^2)` cells (4, computed), optional colour gap of `round(gap res)` cells.
6. Reserved cells revert to body, cuts open, the lid window opens (`06:148`).
7. Bed faces (lid outer face and base underside) are mirrored in x before slabbing so they read upright in the hand (`07:24`, 37).

Face editor (`08:269` to 403): the stage splits on step 3; the right half
shows the exact print raster after a build or a quick 4 cells per mm preview
while dragging; drag moves in 0.25 mm steps (snaps each axis to the zone
centre within 0.6 mm unless alt, shift locks to one axis), corners scale
(text size, shape width, height and stroke, or image width; shift keeps a
shape's stroke), a dot on a stem rotates (snaps to 0, 90, 180 within 4
deg, shift to 15 deg), wheel zooms, right drag pans, arrows nudge 0.25 or 5,
`[` and `]` reorder, cmd D duplicates, delete removes, double click edits
text.

### 5.10 Raster mesher and pinch healer

`RasterMesh.volume(W, H, px, x0, y0)` takes label slabs in ascending z and
emits one watertight mesh per slot from greedy rectangles; `fixPinches()`
looks at every 2 x 2 x 2 window where two labels meet, and when one label's
cells are split into more than one face-connected component it flips a cell
to bridge or dissolve the pinch, revisiting only windows near flipped cells,
up to 60 passes (`01_rastermesh.js:67` onward). This copy has dirty-window
revisits but no per-cell flip freeze; TOGGLE's patched healer freezes a cell
after 3 flips and runs 200 passes
(`lineage.json`, row
`healer/toggle-part2e`). GUDGEON's copy (sha256 `7ce1ed15c2f13e62...`) matches
neither lineage row.

### 5.11 Hookup text and print card

`CIRC.hookup` (`05:194` to 212) writes the wiring in plain lines: the screen
(VCC 3V3, GND, SCL GP10, SDA GP11, DC GP12, RST GP13, BLK GP9, CS tied to GND;
`05:21`), every key with its GPIO, trace length and kohm, the key read
method, the slider pins, resistances, read method and ADC share, and the
conductive layer note. The print card (`08:19` to 31) adds: closed and print
sizes, NO BRIM (it welds the knuckle gaps and the pin bores), seam at the
front, dry PETG, no supports; the hinge numbers; the RP2040-Zero header
instructions and the list of cupped pins; the screen mounting (glass down,
tab toward the hinge, two M2 screws, pins clipped or wires soldered, seven
wires out through the rear wall pass, over the hinge, into the base pass).

### 5.12 Filaments and print settings

Four slots (`04:19` to 21): 1 cream PETG (body), 2 black PETG, 3 pink PETG
(inlay), 4 conductive PLA; the page note says Protopasta conductive PLA,
black, about 30 ohm cm (vendor), everything else PETG. Three or four slot
mode; body and conductive slot selectable. Printer and process names only:
`Flashforge Creator 5 Pro 0.4 nozzle`, `0.24mm Standard @FF C5`, preset
pattern `Generic {TYPE} @FF C5P` (`04:24` to 25). Layer 0.20 or 0.24. One
object `gudgeon` with one part per slot, centred on a 256 x 256 bed
(`08:11` to 17). Grams for the example: 69.0, 0.4, 0.6, 2.1 (computed from
solid volume, print card).

### 5.13 Constructions and UX found on the check pass

Hardware ghosts (`08:119` to 126). With HARDWARE on, the stage adds four
translucent parts at opacity 0.4: the RP2040-Zero as a 23.5 x 18 x 1.0 box
(cyan) with its underside at `face + 2.5`, the USB C plug body as a 9 x 8.9
x 3.3 box (grey) centred 3 mm outside the board's USB edge, the screen disc
`disc/2` by `thk` (green) on the lid plate at `scy`, and the tab `tabW` by
`scy - tabY0` by `pcb`. They are display only and take part in no check.

Fold pose (`08:127` to 135). The lid group sits in a pivot at (`ya`, `za`)
and turns `180 - open` deg about x, so OPEN 180 is the print pose and 0 is
closed; PRINT BED forces the flat pose and shows the 256 x 256 bed plane.
The OPEN slider (0 to 180, default 110, `00_shell.html:167`) changes the
pose only and never rebuilds.

Layer operations (`08:200` to 267). Each layer has mute and cut-through
flags, a slot (and `slot2` after a `|`), duplicate (offset +2, -2 mm),
raise and lower, and copy to either other zone. New text defaults to
Permanent Marker 6 mm in slot 2 with `slot2` 3 and a 0.6 split gap; a new
shape is a 20 mm ring in slot 3; an image is added by the + IMAGE button or
by dropping a PNG, JPG or SVG anywhere on the page, at 24 mm wide in mono
threshold mode. Dropping a `.json` file loads a design instead. Switching
between three and four slots clamps every layer's slot into range
(`08:179`).

Faces PNG (`08:49` to 59, 439). FACES PNG writes the three label rasters
(lid, bottom, deck face slab) side by side in slot colours: the exact cells
that will print, useful for review away from the bench. `BENCH.exportBytes`
does not offer it.

Design files (`08:43` to 48). The design JSON is `{app: 'gudgeon', v: 1,
state}` holding only the design keys (`04:53`); loading replaces each key
wholesale except `print` and `colour`, which merge onto the defaults, so a
file missing a newer `print` or `colour` field still opens, while a file
missing a field inside, say, `shell` loads with that field undefined
(inferred from the code). Undo and redo restore only the design keys and
keep the view state (`04:68`).

---

## 6. UX anatomy

Shell: the same hack.build paper chrome as HAFT (ink header with the mark,
`GUDGEON.deck`, tagline, UNDO, REDO, OPEN, SAVE, GUIDE; ink steps strip;
sunk guide strip; void stage on the pink grid; paper rail; ink status strip).

Welcome (`00_shell.html`): one paragraph of what it is, a four cell step
grid, two starts: START BLANK and HACK.BUILD DECK (pink).

Steps (`08:148` to 153):

1. DECK: TRAY (round, facet, capsule; width, depth, corner, wall), KEYS (columns, rows, pitch, pad size, corner, cover pads, note on exposed versus covered), SLIDER, BOARD SEAT (USB side, rear lane, bore, cup, pin length, note), TRACES (width, clearance, via, resistivity).
2. SHELL: SCREEN (nine number fields and a window slider, note that the ears come from a photo), WALLS (base wall, note on the 7 mm the board, header and plug need), HINGE (knuckle r, rod r, knuckles 3 to 9 odd, axial gap, bore gap, rod flats, LOCKET note).
3. ART: FACE (lid, bottom, deck chips), LAYERS (+ text, + shape, + image, list, drop zone), LAYER properties; the stage splits into 3D and the face editor.
4. PRINT: FILAMENTS (3 or 4 slots, colour, name, type, body and conductive selects), PRINT REALITY (layer, min feature, stroke boost, colour gap, despeckle, resolution, auto rebuild, bed), SLICER PROFILE fold, HOOKUP (readout and text), EXPORT (3MF PROJECT, STL ZIP, PRINT CARD, FACES PNG, readout).

Stage (`08:69` to 142): cams iso, top, front, side, under, explode (slots
lifted 8 mm apart); views ASSEMBLED and PRINT BED; an OPEN slider 0 to 180
deg that rotates the lid group about the hinge axis live; a HARDWARE
checkbox that ghosts the board, the USB plug and the screen at their real
positions. Own orbit, double click homes.

Status chips (`08:405` to 416): `fits bed` or `over bed`, `mesh current` or
`mesh stale`, `fold clear` or `fold collides`, then every warning as an amber
chip.

Commit model (`07:164` to 180): range input previews, change commits, 320 ms
debounce, one build at a time with one queued, a thrown build becomes the
warning `build failed: <message>`. Undo and redo over 80 design snapshots with
a 450 ms debounce (`04:57` to 70).

What makes it excellent:

1. The print-in-place story is visible: one slider folds the real lid about the real axis, and the fold sweep proves every angle on each build.
2. Hardware ghosts put the bought parts (board, plug, screen) where they will sit, so clearances read at a glance.
3. The face editor shows the exact print raster, including the circuit keep-out, so art never lands on a pad or a trace.
4. The hookup text gives every wire and every printed net with its predicted resistance and the read method in one place, and says plainly what printed traces cannot do (SPI).
5. Walls with openings are built without booleans, so any tray size, corner and notch position builds the same way.

Weaknesses to fix in any port: no drive pad or press simulation; no firmware
export (the read is described, not emitted); no fits table and no coupon; no
net connectivity or clearance check on the mesh; `BENCH.ready` is set before
the first build finishes (`08:454`), so a driver must also wait on
`BENCH.model().meshes`; the example build crosses the bench's own 2.5 s
warning on software WebGL (measured, 2804 ms); stale bore-depth note; the
100 nF / 100 pF slip; the hinge has no printed confirmation.

---

## 7. Tests and harness

No test files ship with GUDGEON. Harness available:

- `ORIG/files/runs/gud.js`: node vm rerun of `03`, `04`, `05` for blank, example, 4 x 3 keys and no keys; output `gud_out.json` (z stack, hinge numbers, nets with lengths and kohm, slider electrics).
- `ORIG/drive/drive.mjs`: puppeteer drive of the bench (boot, example, cams, print bed view, fold to 30 deg, each step, art deck zone, exports through `BENCH.exportBytes`), report in `ORIG/drive/report.json`.
- Hook: `BENCH.ready`, `BENCH.state()`, `BENCH.model()` (meshes, groups, dims, circuit, elec, sweep, warnings, ms, tris), `BENCH.build()`, `BENCH.geom`, `BENCH.exportBytes('3mf' | 'stl' | 'card' | 'json')`. Settled predicate used: `BENCH.ready && BENCH.model().meshes && !dirty && !building`.

---

## 8. Port map

Canon ids from `docs/plan/CANONS.md`;
milestones from `PLAN.md` and `PACKAGES.md` in the same folder. GUDGEON has
no milestone of its own in the plan. `lineage.json` holds three rows (all
rastermesh copies), none for GUDGEON.

| mechanism | package | feature kinds | canon id | reference id | milestone | lineage row |
|---|---|---|---|---|---|---|
| touch pads | archetypes; circuit | conductor, pad | capacitive-plate (GUDGEON cited as provenance) | sensors/capacitive-plate | M06 | MISSING |
| finger slider | archetypes; circuit | conductor, pad x3 | finger-pot (GUDGEON cited) | sensors/finger-pot | M06 | MISSING |
| header-pin cup seat | archetypes; mesh | pocket, contact xN, port xN | rp2040-zero-seat (GUDGEON header-pin cup variant cited) | seats/rp2040-zero-pressfit | M06 | MISSING |
| two buried H/V layers, vias | circuit; mesh | conductor, port | buried-trace-stack (GUDGEON cited) | conductors/buried-trace-stack | M05, M06 | MISSING |
| H/V A* router | copper (one router, D-092) | conductor (router output) | MISSING | MISSING | M05 | MISSING |
| key and slider electrics, hookup text | circuit; wiring | port (read models charge-release proposed, ratiometric) | MISSING as a GUDGEON entry | MISSING | M05 | MISSING |
| clamshell walls with notched rings | mesh (prism route) | pocket, web, window | MISSING | MISSING | MISSING | MISSING |
| screen bay: collar, bosses, window, wire passes | mesh | boss, window, pocket | MISSING | MISSING | MISSING | MISSING |
| knuckle hinge with continuous rod | mesh | hinge | MISSING for this variant (printed joinery lands as the `hinge` kind with KNUCKLE as reference) | MISSING (KNUCKLE is the planned hinge reference) | M10 for the hinge kind | MISSING |
| fold sweep | checks | none | MISSING (CHECKS section 9.9 waits; SLATE `sweepCheck` is the cited source) | MISSING | M11 (hinge stop row with the SLATE reference) | MISSING |
| art zones and hygiene | inlay | inlay | MISSING | MISSING | M03 | MISSING |
| raster mesher and pinch healer | mesh (raster route) | none | MISSING | MISSING | M00 | MISSING (GUDGEON copy `7ce1ed15...` matches no lineage row) |
| prism kernel | mesh (prism route) | none | MISSING | MISSING | M00 | MISSING |
| 3MF writer and print card | 3mf | none | MISSING | MISSING | M00 (3mf exporter binding) | MISSING |
| hardware ghosts and fold pose | ui | none | MISSING | MISSING | unknown | MISSING |
| faces PNG export | inlay; ui | none | MISSING | MISSING | unknown | MISSING |
