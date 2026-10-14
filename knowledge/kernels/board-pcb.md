# Boards, gerbers and fab output

This is `packages/board`. Wrap tscircuit rather than reimplementing; this file
is what the wrapper has to get right and what has already gone wrong.

## Gerber emission, the two bugs

1. `if ring is polygon.exterior` NEVER FIRES. Shapely returns a NEW ring
   object on every `.exterior` access. The identity test silently wrote every
   interior hole as FILLED COPPER, which would have shorted all 35 non-GND
   pads to the ground pour. INDEX the rings.
2. Island polygons must be emitted AFTER the pour, LARGEST AREA FIRST. An
   island sitting inside another polygon's cleared interior gets wiped by that
   clear if it was drawn first.

## Pour rules

Do not clear the pour under the whole module body: that also strips the bottom
annular rings off the module's own through-holes. Keep out ONLY the ceramic
antenna zone. Copper under a castellated module is fine, it is covered by
soldermask.

Through-hole pads need BOTH sides' annular rings. Copper and mask layers that
only get their own side's pads produce holes with no bottom ring.

## Drill position is not pad centre

A hybrid pad spanning a castellation (11.20 from centre) and a 0.6 inch hole
row (7.62) has its centre at 8.75. Drilling at the pad centre gave a 17.5 mm
row spacing instead of 15.24 and the module physically would not have fitted.

`pad()` takes `hole_dx`, and EVERY consumer uses it: drills, rings, mask,
Excellon, and the KiCad `(drill d (offset dx 0))`. DRC rule: a drill must sit
inside its own pad with margin.

## Verification

Re-parse the emitted gerbers with an INDEPENDENT renderer and grid-compare
against the shapely source geometry.

pygerber 2.4.3 with `Rasterized2DLayer` and `ColorScheme.COPPER` works, but
NOTE: pygerber paints CLEARED regions as a distinct colour (grey 131) rather
than background (0), with copper at 100. A naive >40 threshold counts cleared
areas as copper and gives a false failure.

gerbonara is the other parser used, for cross-checking drills and silk
vertices in integer nanometres.

SPINDLE R1 as shipped: 19 nets / 70 pads / 57 holes / 0.32 mm tightest
against a 0.25 rule (computed); bottom copper matches its geometry 99.91
percent, top 99.28 percent; the legacy DRC printed DRC OK, but 5V on B.Cu runs
through four GND vias at y 20.00, so non-GND holes isolated 33 of 35 and GND
holes bonded 18 of 22 (computed, D-249, PLAN.md C-21). The legacy island test
unioned the uncleared pour and no rule read bottom copper between nets, which
is why it missed the short; CHK-BRD-01 and CHK-BRD-21 fail on it.

## KiCad output

Emit a genuine KiCad 7 board, not a gerber import: self-contained footprints
with real pads, segments on F.Cu and B.Cu, vias, Edge.Cuts as lines plus true
`gr_arc` corners, silkscreen as EDITABLE `gr_text`, a GND zone on B.Cu, and a
keepout rule area over the antenna.

Silkscreen must be gr_text and NOT outlined polygons, because `gr_poly` has no
holes for letter counters. (Outlined paths are correct for the guide sticker
SVG, and wrong here. Different consumer, different rule.)

KiCad output must contain ONLY things that exist on a real fabricated board.
The vinyl mask, guide sticker and plywood backer are copper-tape build
artifacts and never belong in a .kicad_pcb.

Validate by reading it BACK with kiutils: reconstruct absolute pad positions
from footprint origin plus pad offset, compare position, size, net and drill
offset against the source, rebuild each net's geometry and confirm one
connected island, and round-trip write then reparse. kiutils gotchas: pad
drill offset is at `p.drill.offset.X`, and `Via.net` is an integer id needing
lookup against `Board.nets`, not a name.

## Footprint and chirality

UNMIRRORED BACK FOOTPRINTS mean a physically flipped part lands its pins
MIRRORED. Symmetric 2-pad parts do not care; SOT-23 swaps B and E. Check
chirality on every back-mounted asymmetric part.

SOT-23 MOSFETs are 1=G 2=S 3=D for BOTH polarities. P-FET high-side entries
are easy to write with S and D swapped.

KiCad PinHeader footprints run along footprint Y. Declaring a 1x03 or 2x06
with the body sideways needs rot 90, and that also changes the CPL rotation
column.

Header pin ORDER must follow the module column order. Getting it backwards
turns every phase into a long diagonal and produced 51 DRC violations in one
go.

## 3D models

Source: `raw.githubusercontent.com/KiCad/kicad-packages3D/master/<Lib>.3dshapes/<Footprint>.wrl`.
The `api.github.com` directory listing rate-limits fast, so PROBE candidate
filenames with curl instead.

Parser gotchas:
- these .wrl files put GEOMETRY FIRST and `material USE X` LAST inside each
  Shape, with DEF'd materials declared in empty Shape blocks at the top. A
  parser expecting material-then-geometry silently finds nothing.
- authored in units of 0.1 inch, so scale by 2.54
- Z-up with the board plane at Z=0
- axis mapping: if the sim's world is X-right / Y-up / Z = MINUS board-Y, the
  right transform is (x,y,z) -> (x, z, -y), which is a PROPER ROTATION so
  winding is PRESERVED. A bare y/z swap is a REFLECTION and needs the winding
  flipped. Both are correct; they pair differently.
- recover true lead positions by clustering vertices below the board plane

Names NOT in the library, substitute or build parametrically:
ESP32-S3-WROOM-1 (use ESP32-WROOM-32, identical 18 x 25.5 x 3.1),
HTSSOP-16-1EP (use TSSOP-16), SOIC-8-1EP (use SOIC-8),
SRN4018TA (filed as L_Bourns-SRN4018 with a HYPHEN),
CP_Elec_10x10.2 (use 10x10.5).
No model at all: USB-C, JST-SH, 3.5 mm terminal blocks, solder jumper.

The check that earns its keep: compare each placed part's REAL model bbox
against the declared body box, plus assert per-package expected x/z/height
spans so a bad axis mapping shows up as height landing in Z. That found three
real design errors the 2D checker could not.

## checkfit

Check physical fit using real model bounding FOOTPRINTS: part vs part, part vs
module body, part vs foreign pads, part vs mounting holes, part vs board edge,
plus a clearance ranking. BODY footprints, as well as pads, decide where a
header can go.

## Board-level gates that earn their keep

- pin on two nets
- part with no net
- GPIO-map vs netlist agreement
- body overlap
- mounting-hole DISC vs part BBOX (centre-to-centre is too weak and passed a
  real collision)
- edge margin
- antenna keepout
- named netlist audit (assert the exact connection count)
- single-island per net
- BOM, CPL and netlist cross-checked against each other by designator before
  shipping. The first BOM was stale and described headers that no longer
  existed.

## Silkscreen as real type

Fetch display fonts as woff2 from npm @fontsource (permanent-marker,
special-elite, ibm-plex-mono) and convert to filled polygons with fontTools.

Decide contour nesting by POINT-IN-POLYGON CONTAINMENT, not winding direction,
because that font set mixes TrueType and CFF which wind opposite ways.

Use EXACT font metrics in the silk clearance gates. Per-character width
estimates were 15 percent narrow on the marker face and had been passing real
collisions. Silk-to-silk needs 0.4 mm clearance.

GERBER CONVENTION: all layers in board coordinates, back layers NOT
pre-mirrored (the fab mirrors when imaging), back silk GLYPHS mirrored in
board space. So the back gerber render reads backwards ON PURPOSE.

A fab defect found this way: back silk landed 12 mm off-board because the
mirror negated the pen position instead of mirroring glyphs inside the ink
box.

## Boot-safety rules

- a gate pulldown on a MOSFET guarantees the load cannot fire while the pin
  floats through reset
- GPIO21 is U0TXD and strobes the ROM boot log at every reset
- GPIO20 is U0RXD and is never driven at boot
- an LDR must go UP to 3V3 with 10k down to GND on a strapping pin, keeping
  the node above VIH with real ADC swing. Down to ground blocks boot in bright
  light
- GPIO8/9 with I2C pull-ups are strapping-safe because I2C idles high

## PCB manufacturing facts in use

- JLC offers PINK soldermask, so the hack.build palette lands on the real
  board
- 2 layer, 1.6 mm, 2 oz copper is the working default
- deliberately use no GPIO in 33-37 on an ESP32-S3 module so N16R8 (octal
  PSRAM) and N8R2 (quad) are interchangeable in one layout
- DRV8833 abs max is 11.8 V, which makes a raw-VIN jumper position a real
  footgun that must be labelled loudly
