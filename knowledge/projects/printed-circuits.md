# Printed circuits: conductive filament

## BLOCKS

The standard: 8 mm pitch, 4.8 x 1.8 studs, 3.2 plate, 9.6 brick. Per
conductive position a conductive TPU socket ring (4.6 ID, 6.6 OD, 2.4 tall)
under a conductive PLA flange, post and stud. Two buried conductive PLA trace
layers 1.0 wide 0.72 tall with 0.48 PETG between. Four slots: PETG cream,
cPLA black, TPU pink, cTPU grey.

The stated brief, worth keeping because it names features the shipped bench
covers only partly: a board carrier that takes either press-fit header pins
or a bare board with castellated or regular pads held by a FOLD-OVER SNAP
HOLDER along the board edges with a window over the front, both modes;
boards C3 SuperMini, an RP2040 board and Teensy 4.0; traces from the pins
run to a LEGO style base whose pegs are conductive top and bottom, one per
pin, so it sits on a printed plate with conductive traces to other modules
or another conductive piece plugs onto its pegs; printable wires in TPU plus
cTPU in any length and shape (pre-printed spiral to save bed space) with a
version that has pegs at the ends; components in the same LEGO form drawn
from the STYLUS catalogue; every part parametric (arrays of buttons, slider
length and type, knobs) with peg modes bottom, both, top only, and non-block
flexible versions that connect via pegs; a wire prints at the length the
virtual build needs so the plate matches the build; parts whose top face is
the control surface carry conductive pegs beside themselves, lower, that
still conduct below.

The shipped bench: four steps PART, MATERIALS, BUILD, PRINT; three.js viewer
with x-ray; catalog and schema driven params; a pin set editor; a PLATE NET
PAINTER; the 3D drag-and-drop scene with LEGO stacking; a wire tool; a
per-pin mode panel; the MNA DC solver; scene export laid out on one plate.
Pico defaults to a 24-pin set and all 40 route on 7 x 18. The button cap
follows the cone's inner wall profile so it is supported at every layer.

SEAT: press mode uses 0.9 bores into cPLA cups; snap mode uses 0.48 proud
bumps, rails, a lid frame with window and USB notch, TPU pressers, two TPU
barbed hooks, and either a filament pin hinge or four hooks. Boards: C3
SuperMini, Pico (24-pin default, all 40 route on 7 x 18), Teensy 4.0, custom.
Brick autosizes from board, pin count and lane budget.

Honest numbers: pin to stud 5 to 50 kohm, cTPU wire about 1 Mohm per 80 mm,
cPLA core about 20 kohm. A printed button on the internal 45k pullup sits in
the UNDEFINED band; the sim says so and the fix is ADC read or a stiffer
pullup. THIS IS THE PROOF OF THE WHOLE CLAIM.

Everything was validated: every 3MF passed `validate_3mf.py --overlap` in node
AND through the browser hook, headless sweep of every part in chromium clean,
no console errors, no horizontal scroll at 390/768/1280.

ONLY HIS FLASH STUDIO ROUND TRIP can confirm the four-filament import and
whether the cTPU really grips a stud after cycles.

## STYLUS

22 archetypes. The audit pass that mattered: a GEOMETRIC NET CHECKER was built
into the tool (Mesh.prism records every slab, union-find over polygon overlap
plus z intersection, declared taps resolve into nets). IT FOUND MOST
ARCHETYPES WERE ELECTRICALLY BROKEN, including terminals hanging off the
board, traces shorting through guard rings, single-terminal resistors with no
return path, and floating electrodes wired to nothing.

The pot rebuild, after research into real designs, is the best record of what
a printed part actually needs: 6 mm D shaft, 300 degree sweep, panel bushing,
journal bore, axial retention, keyed and electrically isolated wiper carrier,
end stops, and terminals a wire can really attach to. Plus: a rigid wiper
SCRATCHES THE TRACK OFF, so the arm has to be a leaf spring, and WEAR not
drift is the real lifetime limit.

The wiper bug is the best single lesson in the file. The arms were built as
narrow strips sitting BESIDE the tracks, so the shoes landed at radius
rr * 1.41 and never touched anything. The net checker missed it because
makesContact is a DECLARATION, not a geometric test.

THINPOT: tapered resistive track (lin, log, rlog by width profile, R
integrated along the length), rim frame, separate flat printed membrane with a
flush pocketed collector strip, all three terminals at one end, five terminal
options.

LADDER KEYPAD: nx by ny dome keys on ONE analogue pin. Each key's top half pad
is a node of a boustrophedon chain of equal printed serpentine resistors,
bottom halves sit on a buried common plane that is the output. Common net uses
two buried layers with printed vias so the top chain crosses it with a full
layer of plastic between. Cuttable trim bridges across every leg pair.

The dome saga, four passes, each a real print:
1. the conductive TPU plug would print disconnected with nothing to land on,
   and supports inside a dome are not acceptable. Fixed the whole CLASS:
   anything hanging in mid air in place now prints as its own posed part.
2. an in-place cone mode was added, and Flash Studio reported empty layers
   because the cone's inner wall was not parallel to its outer.
3. the plug was most of the dome wide and 2 mm thick, leaving no shoulder to
   flex. Plug radius capped at 0.4 rimR, held 0.4 to 1.0 thick.
4. the cap printed into the columns and the button had essentially no press.
   In-place contact gap is now held between 35 and 50 percent of the cavity
   and never under 1.2 mm.

GENERAL RULE: budget for HALF the cavity as usable stroke.

## GIB

Two orthogonal choices: BODY flex (all TPU) or rigid (PETG body); SENSING
touch, membrane pot, or finger pot.

The three-terminal placement went through three rounds because the physical
constraint kept changing: side row, then bottom edge, then the END EDGE like a
normal sensor tail, each on its own lane (return lane, bus or W lead band,
track) so nothing crosses. Min widths about 14 (finger) and 16 (membrane) at
2.5 mm pads.

Verification bar: 600 random states with zero manifold failures outside "too
small" warnings, parameter liveness sweep, 17 to 20 designs through the
browser export and `validate_3mf.py --overlap` green, no console errors, no
horizontal scroll at three widths.

## TANG

R6 is the fully multimaterial version and the best worked example of a PRINTED
CIRCUIT BOARD as a printed part.

FACE = circuit board 3.12 thick (13 layers), printed pad side down: L1
underside traces 0 to 0.72, PLA 0.48, L2 buried 1.2 to 1.92, PLA 0.48, top pad
inlays 2.4 to 3.12, 1.6 mm square vias, pin holes only 0.96 deep so L2 runs
under the socket.

NECK 240 x 30 x 12 PLA beam printed ON ITS SIDE: the membrane is a VERTICAL
WALL with a 0.6 mm in-plane air gap, so no bridging and no support. 0.8 TPU
skin plus 0.8 cTPU strip is the resistive track; a cPLA strip flush in the
deck is the wiper.

NECK TO FACE: no screws, no flat land on flat land. The face carries three
3 mm square cPLA pegs under the pads; putting the lid on plugs them into the
tenon sockets.

NECK TO BODY: the tenon has a 2 mm waist through the wall so the 30 wide beam
shoulders stop it going in and the 30 wide part inside stops it pulling out,
plus a foot resting in a floor cradle. Drops in from above, the face pegs lock
it down.

THE RESISTANCE FINDING: cPLA pot arcs (14k) against 40k of printed leads swing
only 10 percent of the ADC. So the pot arcs and the slide track are conductive
TPU (709k per arc, 73 percent swing; slide track 358k, 74 percent). No
discrete resistors anywhere: pads read by RC charge time through the internal
22k pullup, slide and pots are ratiometric.

THE SLIDE SENSOR IS THE WRONG PART. His film (Flexniss YD-SF23-600) is a
COMPOSITE piezoresistive plus piezoelectric film, force plus dynamic impact,
NOT a position sensor. Position needs a membrane potentiometer (SoftPot class).
Two wiring option panels were drawn for the two possibilities. UNRESOLVED: he
has not sent meter readings.

Copper art history worth keeping: 6 interdigitated hex force pads, REGULAR
hexagons (a z-stretched version was rejected outright), size coming from
moving the rows IN toward the COM spine rather than distorting the shape. The
comb finger taper is in `kernels/copper-routing.md`.

## BAFFLE

R3 in progress. The decisions that landed:

- rejected a 4x2 key matrix, wants DIRECT PINS, one pin per key. Fewer bigger
  buttons is fine.
- screw terminals fully conductive with thicker material, each land a plain
  conductive ring (4.6 outside, full height panel to deck top) whose bore IS
  the screw pilot, no relief gap, carried straight down as a solid annulus so
  tightening cannot crack a thin post.
- eight numbered lands in ONE ROW along the front wall, not spread around.
- extra height goes in the LID, not the body, so an already printed body does
  not need reprinting.
- body and lid exportable separately, plus a combined plate.
- his firmware field notes: printed conductive filament is
  megohms, three sensing methods with no external parts, per-key thresholds,
  filter across passes, ratiometric slider, keep the class D amp supply off
  the sensing path.

## TOGGLE

A low profile parametric multimaterial thumbstick that prints in place on
four heads with no support. The stem is a TPU cylinder that angles out
midway into a fat CONDUCTIVE band, back to a cylinder, then cones out to a
flat disk under a rounded textured thumb top. Tilting bridges the band across
conductive trace segments on the body walls. Four presets: solo 4 way, solo
8 way, BLOCKS 4 way, BLOCKS 8 way. Solo 4 way is 18.2 square by 10.6 tall,
18.3 top, 14 degree contact, 16 degree hard stop, 470k pullup.

Built as six kernel files (lathe mesher, tilt model and contact physics, a
two-layer grid router with negotiated congestion, layout and raster body and
build, and a patched pinch healer) plus the bench shell, viewer with tilt
simulation, drive pad, exports and rail. Routing cached by floor layout
signature: 3.5 s to 1.6 s on BLOCKS 8 way.

Open: Flash Studio import, measured spool resistance, and whether BLOCKS
plain sockets are TPU rings or bare PETG bores.

## HAFT

The fully printed game controller, briefed as "look at how TOGGLE was made."
Four steps LAYOUT, BUTTONS, BOARD, PRINT. Every button group picks flex,
clicky or touch. The board seat is press-fit bumps under the RP2040-Zero's
castellations OR wire cups, both modes shipped. Exports: 3MF, STL zip, design
JSON, print card, firmware, wiring SVG.

Kernel: snapfe beam solver, geometry, font and mark, layout, router, model,
package, in `src/`; bench shell, state and exports, viewer and UI in
`bench/`; manifold-3d 3.5.3 as a classic script with embedded wasm in
`vendor/`; assembled by `build_bench.py` with `--vendor` and `--fonts`.

Numbers: click spring span 22, beam 0.5, rise 2.0, width 1.6 gives a 2.3 N
peak, 76 percent force drop after the snap, 2.3 percent strain at the stop;
PETG stays under about 2.5. Face pitch 16 so four spring slots find
non-colliding directions. Closest two nets 0.48 mm. Holding A reads GP4 LOW,
about 140 kohm, settling in about 1.3 us. Boots in 2.0 s, worked example in
2.1 s.

The four switches as finally designed (Sep 18), which are the reference
button set for the whole system and are in `seed/circuits.seed.yaml`:

- FLEX: a TPU cone at 40 degrees on a foot ring buried one layer into the
  body, a 3 layer conductive TPU cap bridged over the cone's hole, two
  conductive PLA half columns under it split by 0.8. Column tops at 45
  percent of cone height below the cap, never under 1.2, because a pressed
  cone travels about half its height. 10 face, 4 cone, 1.8 to contact.
- CLICKY: a double cosine beam spring printed flat in PETG, a conductive TPU
  tip dovetailed into its shuttle, dropped on edge into a slot under the key,
  end blocks held by the bezel, a flanged TPU cap on its stem. Corotational
  beam solve checked to five digits against linear theory. Span 22, beam
  0.5, rise 2.0 t, width 1.6: 2.3 N peak, 76 percent drop, contact at 1.24,
  2.3 percent strain. Warns above 2.5 percent, at rise 2.4 (latches) and
  under 2.0 (stops snapping). 0.5 beams print as single lines.
- TOUCH: interdigitated cPLA combs flush with the bezel top on a PETG boss.
  Nothing moves.
- STICK: TOGGLE's mechanism, a TPU stem on a neck under a PETG ring, a
  conductive TPU band flat against the well wall at full tilt bridging one of
  four low wall pads to the common ring above them.

Body thickness is not a setting; the body grows to what the tallest key and
the board pocket need, snapped to 0.24 layers. Three shapes: stadium, slab,
grips. The welcome card has a four-cell grid describing the steps and three
buttons: start blank, stick example, worked example.

Tests: cases (stick, all flex, all clicky, all touch, wire, both, grips,
slab, PETG caps), an 80-design seeded sweep with no mesh failures (42 with
layout warnings from deliberately crowded layouts), liveness, smoke through
the BENCH hook, islands, and the browser-exported 3MFs through the
validator. Fixed on the way: the 390 overflow (cams wrap, card fits, rows
wrap, legend hidden under 640), a flex cone vertex on a cavity face, trace
layers rebuilt per net from one outline offset, false routing conflicts from
router margin, silent routing problems, wire cups in pad order. Seen and
queued: chip selected state overridden by the generic pink button, section
cutting the wrong half, plate view keeping a low camera, wiring labels
overlapping.

## GUDGEON

A print-in-place folding pocket cyberdeck for a 1.28in GC9A01 round screen
and an RP2040-Zero, with a printed circuit deck face. LOCKET's hinge topology
(nine knuckles, one rod through the lid knuckles), a raster-kernel printed
circuit floor with two buried conductive layers and printed vias, conductive
cups for clipped header pins, 3x3 exposed touch pads, a finger slider, a
USB-C wall notch, three body shapes, the COLLAR art editor on lid, underside
and deck zones, a two-layer A* router, and a numeric fold sweep on every
build. Closed 92 x 66 x 22, prints 92 x 141 flat. The screen is real wired,
because conductive PLA at about 4 kohm per cm cannot carry SPI.

Screen ear geometry (tab 34, holes 28 apart) was read from a product photo
and needs calipers.
