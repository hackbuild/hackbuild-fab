# Copper and printed conductors

This is `hackbuild-copper` plus the electrical half of `circuit`. It covers
vinyl-cut copper on a backer, printed conductive filament traces, and the
single-layer routing problem they share.

## The stack (vinyl-cut)

Guide sticker -> copper -> transparent vinyl. The guide is printed on sticker
paper and applied to the lasercut backer first, then vinyl-cut copper foil,
then a transparent vinyl mask over the top.

ALL LAYERS SHARE ONE OUTLINE and must report identical SVG dimensions. On the
copper layer that outline must not touch anything: gate copper at >= 1.0 mm
from the outline.

KEYWAY's full eight-layer version: copper foil, Velostat/Linqstat 4 mil, two
0.3 mm cardstock spacers (lower windows so pad Velostat tents, upper slot
holds the wiper off the slider), top copper wiper, 2 mm EVA caps, 2 mm
chipboard backer, print-then-cut sticker guide. All cut on the same machine
against one outline.

## Vinyl mask rules

- must follow the REAL rounded board outline, not a plain rect
- must stay a SINGLE CONTINUOUS piece
- no opening may eat the border: keep 1.2 mm all the way round and verify
  per-edge coverage is 100 percent

DEPARTURE for hex tiles (COFFER): the vinyl there is a dielectric FACEPLATE,
not a soldermask. A plain hexagon inset 6.0 mm, one piece, nothing to lift,
with the whole port band left bare so every pad and tab stays solderable. The
soldermask rules (follow the outline, 1.2 border, pad openings) shredded the
mask into 11 pieces around a hex perimeter.

## Single-layer routing, the whole problem

One conductive layer cannot route everything. The recurring results:

- An N x M pad grid to one edge: IMPOSSIBLE. Make it a real two-layer mutual
  capacitance matrix.
- All three terminals of a LINEAR pot out of one end: IMPOSSIBLE. Any lead
  from the far end crosses the collector rail.
- A ground ring can be cut ONCE per tile without an interior GND feature.
- A centre bus on a finger-pot cannot exit without crossing the track, and a
  U track double-reads. Bus goes on ONE side.
- A module with two pad rows is a WALL: ground leaves it only at its own pad
  and the two ends of the channel between the rows. So only TWO opposite
  edges of a carrier tile can carry signals.

## Lane assignment

LANE ORDER IS A PARTIAL ORDER, NOT A SORT KEY. Sorting by travel DEADLOCKS,
because a short-travel net whose source lands inside a long-travel net's
horizontal must sit FARTHER from the rail.

Build the constraints and rank them:
- a source drop crosses lanes FARTHER from the rail
- a finger drop crosses lanes NEARER it

And the rank must index DOWN the lane list when lane zero is farthest from the
rail. Indexing up inverts every constraint, and the clearance gate catches it
as a dead-on overlap.

The lane rule has TWO conditions and checking only one shaves traces: no two
horizontals overlap on a lane, AND each vertical clears only the lanes it
actually passes through.

Two escape drops 1.6 mm apart made the lane constraint graph CYCLIC, because
each net's source landed inside the other's span. Give one a proper sub-lane
slot instead of an arbitrary x.

## Escape patterns that worked

- MONOTONE FAN: bring all escapes to a gather line in monotone x order, then
  run straight diagonals to the pads. Monotone straight diagonals cannot
  cross and their tightest spacing is fixed.
- PARKED TERMINALS: park every top terminal at exactly the x its trace
  arrives on, and the whole upper fan disappears.
- RADIAL STUB: radial keys cannot escape straight DOWN because the blades are
  angled and a vertical drop cuts the neighbour. Stub out through the inner
  radius into the hub void, where the radius only shrinks on the way down,
  then drop.
- CONCENTRIC DETOUR: a slider outside a fan is trapped behind it. Step both
  arc ends radially out to a clear radius, run angularly past the end of the
  fan, then drop. A short detour instead of a jumper.
- ZIGZAG RIBBON: for a honeycomb, a straight vertical channel would push the
  columns apart by more than a hex width and destroy the interlock. Weave
  down the zigzag ribbon between columns. Two facts make it work: shifting a
  zigzag polyline SIDEWAYS keeps a constant perpendicular gap (so sub-lanes
  are a horizontal offset, spacing is shift * sin60), and the top key takes
  the innermost shift so a lower key never crosses a higher key's lane.
- CHANNEL SUB-LANES: top row takes the leftmost sub-lane, bottom row the
  rightmost, so a lower entrant only crosses lanes belonging to rows above.

## The two-layer printed router (BLOCKS)

Two-layer grid A*, SHORTEST NET FIRST (longest first blocked the lanes), rip
up and reroute through committed traces at a soft cost. All boards route
fully.

## Geometry rules

- tail pitch must EQUAL escape pitch or converging diagonals fail clearance
- routes must OVERLAP into pads, never kiss them
- a full guard frame needs exactly ONE window, sized to the escapes
- teardrop fix: hulling a pad with the whole trace leg makes a long wedge that
  manufactures false clearance failures. Hull the pad with ONE round cap just
  outside it so the fillet stays local
- sector angular gap must be sized at the INNER radius. 2 degrees at r=20 is
  only 0.70 mm
- a wedge slider's own diagonal gap (about 3.0 mm) cannot carry its own escape
  trace (needs 3.4). The B end leaves through the outer margin, and it must
  pass OUTSIDE the A wedge's end, not inside it
- an arc's two electrodes need about a 5 degree end offset so each escape
  clears the other; 2 degrees fails
- hub void radius is a ROUTING dimension. 20 mm inner radius is needed for the
  lanes; 14 shaved the sector copper
- finger reach must TAPER per lane to follow a hexagon:
  reach(zRel) = clamp(xb - 1.33 - g2, minFinger, fL) where
  xb = R - (R/2)(|zRel|/h), so tips sit about 1.2 perpendicular off the
  slanted edges. Without the taper the outer tips crowd and you end up with a
  fat stubby four-lane comb. MORE LANES PLUS A TAPER BEATS FEWER LANES.
- 5 lanes gives 3 sense fingers and 2 COM fingers interleaved

## Contact and containment

Every conductor that another conductor LANDS ON needs an explicit CONTAINMENT
constraint in the layout as well as clearance. A collector post that did not
sit entirely on its riser polygon overlapped the body frame by post area
times EZ.

makesContact is only a CLAIM. Anything that has to physically touch needs a
fit() with real numbers or a tap whose radius is checked.

## Scanning instead of multiplexing

TANG's result, and it generalises. Six pads sharing one sense node: the art
already has one shared conductor through all six pads (a spine) and six
separate outward tails, so it is a PURE RELABELLING with zero copper change.

- spine = the single shared SENSE node, on an analog pin, 47k pullup, 1 nF to
  GND
- each tail = a per-pad DRIVE line on an ordinary digital pin
- read pad k: pin k OUTPUT LOW, the other five INPUT (high-Z), settle about
  200 us, analogRead

Only the selected pad has a path to ground, so there is literally NO GHOSTING,
unlike a row/column matrix. Six pads in about 1.5 ms, a 600 Hz scan.

Why a matrix does not work there: sense halves face outward and COM halves
face the middle corridor, so sense groups by ROW but COM cannot group by
COLUMN without three parallel bars in a 4.6 mm corridor.

## Printed conductor reality

- current must run IN the print plane (15 ohm-cm moulded, 30 across layers,
  115 through them)
- thin sections fail along layer lines if flexed, hence printed elbows
- clamp copper tape to the printed loops and solder to the TAPE, never the
  plastic
- force sensing works unchanged; lead resistance is a fixed offset
- attack and velocity work; they come from the ADC slope
- capacitance works but not on a bare Teensy 4.0; needs MPR121 or RC charge
  time
- ratiometric printed tracks mean lead resistance only scales the swing, so
  no discrete resistors are needed at all
- but a cPLA arc at 14k against 40k of printed leads swings only 10 percent of
  the ADC. Move the arc to cTPU (709k, 73 percent swing)

## Channel budgets

- MPR121 is 12 channels. 12 is the deliberate ceiling for a one-chip build.
- ESP32-S3 has 14 native touch pins.
- 18 channels means two MPR121 at 0x5A and 0x5B, or an S3 plus one MPR121.
- The ESP32-C3 has NO touch peripheral.
- A slider that also reads as 8 discrete zones turns 12 channels into 6 pads
  plus 24 virtual buttons.
