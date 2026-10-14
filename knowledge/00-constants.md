# Constants

Measured or derived values with provenance. Fully programmatic, and not
knowledge at all: this is versioned data. The model contributes nothing here
and should not be allowed to. Every entry should carry which machine, what
coupon, and when.

## Materials, electrical

| material | resistivity | source | note |
|---|---|---|---|
| Proto-pasta conductive PLA | 15 ohm-cm moulded, 30 across layers, 115 through them | Proto-pasta published | current must run in the print plane |
| conductive PLA (working value) | 30 ohm-cm | used across BLOCKS, TANG, STYLUS, GIB | |
| conductive TPU (Eel class) | 1500 ohm-cm | used across BLOCKS, GIB, TANG R6 | editable in every bench |
| skin (fingertip, as wiper) | 300 kohm default | GIB finger-pot mode | editable |

Derived, worth keeping:

- cTPU wire: about 1 Mohm per 80 mm
- cPLA core: about 20 kohm
- BLOCKS pin to stud: 5 to 50 kohm
- TANG R6 cPLA pot arc: 14k, against 40k of printed leads, swings only 10
  percent of ADC. This is why the pot arcs and slide track had to move to
  cTPU: 709k per arc gives 73 percent swing, slide track 358k gives 74
  percent.
- A printed button on a Teensy or ESP internal 45k pullup sits in the
  UNDEFINED logic band. The BLOCKS sim reports this. Fix is ADC read or a
  stiffer pullup.

## Materials, mechanical

- PLA creeps under sustained load. Structural parts should be PETG or ABS;
  PLA only for shells and non-load parts.
- PETG at 0.24 layer loses about 0.40 of drawn clearance, not the about 0.25
  of PLA. It oozes and bulges so holes come out further under and outsides
  further over, and a coarser layer hurts a small hole's first perimeter
  again.
- PETG yields rather than cracking, which is why it takes a 1.15 mm
  interference barb where PLA might split the lug.

## Process loss (FDM, 0.4 nozzle)

A 0.4 nozzle does not print the number you typed.

- holes and slots come out UNDERSIZE by about 0.15 (inside corners overfill)
- outside features come out OVERSIZE by about 0.10
- so about 0.25 of any drawn clearance is gone before the parts meet
- a drawn 0.2 clearance hole is an interference fit

In PETG at 0.24 the total loss is about 0.40, not 0.25.

Kerf on a laser cut is UNAFFECTED by print settings. In a mixed cut and
printed build the two errors go opposite ways: a kerf-compensated cut slot
lands on its drawn size, a printed feature comes out over. A printed 3.0 lug
in a 3.40 cut slot has only 0.25 of real clearance.

## Fit classes

Every fit is one of these. Bands are on the REAL gap after loss unless noted.

| class | meaning | real gap | drawn (PLA) |
|---|---|---|---|
| SLIDE | moves every actuation | 0.25 to 0.40 | 0.50 to 0.70 |
| LOCATE | assembles by hand, stays | 0.00 to 0.15 | 0.25 to 0.40 |
| PRESS | must not come apart | small interference | 0.05 to 0.15 |
| SNAP | banded on INTERFERENCE | -1.30 to -0.15 | deliberately wide, see below |
| PSLIDE | cut slot taking a printed part | 0.30 to 0.55 real | loss model is neither side's |
| GUIDE | printed in printed, must guide | 0.30 to 0.55 real | 0.55 to 0.80 drawn |
| PGUIDE | printed in cut, must guide | 0.30 to 0.55 real | |

SNAP is wide on purpose because the INTERFERENCE IS NOT THE CONSTRAINT, THE
APPROACH ANGLE IS. A 3.8 barb into a 2.75 real bore is 1.15 of interference,
which works because a long shallow 20 degree taper wedges in and swages the
bore. A short steep one just stops. A "tidier" 0.25 barb was worse.

A snap fit has TWO constraints, the catch AND the closure. Checking only the
catch shipped a pin that physically could not go in: its barb had to close
1.4 mm to pass the bore and the slot between its legs was 1.0 mm wide.

OGEE final values after the hand test: FIT_SLIDE 0.75 (0.50 real),
FIT_PSLIP 0.70 (0.55 real), FIT_BORE 0.40, CAP_FIT 0.50 + PRINT_OVER,
FIT_GUIDE 0.55 (0.40 real PLA, 0.25 PETG), FIT_GUIDE_Y 0.20.
IN BAND ON PAPER IS NOT THE SAME AS LOOSE ENOUGH IN THE HAND, AND THE HAND
WINS.

PRINT_SHRINK 0.05, not 0.075: the shrink applies to BOTH halves of a frame
joint so it contributes 4x itself.

## Machines

| machine | envelope | note |
|---|---|---|
| FlashForge Creator 5 Pro | 256 x 256 x 256 | 4 FlashSwap toolheads, textured PEI, heated chamber, 0.4 nozzle, corexy, single_extruder_multi_material=0 |
| Elegoo Centauri Carbon | 256 x 256 x 256 | |
| laser cutter | 610 x 1220 mm sheets | plywood, foamcore |
| Cricut | copper tape roll 4 inch x 33 ft, 101.6 mm usable | |

Slicer: Flash Studio is OrcaSlicer 2.3.2 under a BambuStudio-01.10.01.50
header. Printer preset name "Flashforge Creator 5 Pro 0.4 nozzle", process
"0.24mm Standard @FF C5", filament pattern "Generic {TYPE} @FF C5P".

Usable bed after margin: 236 square at a 10 mm inset on all four sides.

## Mechanism numbers

OGEE R16 (4x4, DIAG 0, lasercut):
T 3.0, FIT_SLIP 0.40, FIT_LAP 0.15, PITCH 34, C 9.0, YOFF 3.4, STROKE 9.0,
R_LATCH 7.6, CRANK_R 6.0, CROWN_R 9.0, CROWN_OFF 0.50, ROW_SLOT_E 2.60,
PIN_W 10, NOTCH_W 4.45, NOTCH_D 14, RAMP_A 40, LUG_P 1.25, LUG_H 0.6,
SLOT_E 6.05, LP_SLIDE 3.0.
Verified: cam needs 0.925 of a 1.450 budget, cam lift 0.776, full select rise
9.000 exact, half select 4.249 with 0.775 margin, full select overshoots
1.400, slot use 2.125 of 2.60, pin return 0.0114 N vs 0.0061 N friction at
mu 0.45.

OGEE R17 STIPPLE (10x10, 1.5 mm sheet):
T 1.5, TC 3.0, N 10, PITCH 18, C 6.0, STROKE 5.0 (was 4.8, see below),
LINK_L 12, NOSE_R 2.0, BOSS_R 1.6, CROWN_R 6.0, TILT_MAX 24.62, R_LATCH 4.5,
NOTCH_W 2.05, RAMP_A 40, CRANK_R 4.0, CRANK_HUB 12, YOKE_LAT 6.0.
half select 2.500, margin 0.785, overshoot 0.500, drift 1.091, rest clearance
2.100. Box 223 x 223 x 78.5.

RAMP_A had to go 25 to 40 degrees. tan(25) = 0.466 is marginal against
acrylic on acrylic static friction (about 0.45); tan(40) = 0.839 gives 1.9x.
Do not lower it.

DETENT laser scanner:
4075.7728 half-steps per rev, 0.088327 deg/step, about 0.53 mm/step at
d=150 e=22. Kinematics thetaX = atan2(x, d+e)/2,
thetaY = atan(y*cos(2*thetaX)/d)/2. Case aperture formula: window width =
2 d tan(half angle) at 0.1766 deg per step. Tick 20 kHz. Accel default 3000
steps/s2. Pin map motor X = GPIO 0/1/3/4, motor Y = 5/6/7/10, laser = 20.

SLUG: pinion 19 tooth on the 28BYJ-48 D shaft, centre distance 118.75, ratio
exactly 4:1, so one vend = one motor rev = 4075.7728 half steps. Capsule
50.8 mm. Spheres arch below a mouth of 2 capsule diameters; 156 mm mouth is
3.07 diameters and works. 126 of 128 vends delivered exactly one capsule.

## Beam and spring formulas in use

- cantilever spring F = 3EI x / L^3 with I = t w^3 / 12
- buckled beam bistability needs rise over thickness > 2.31
- living hinge under 13 degrees per row
- Coanda splitter at 8 to 12 nozzle widths
- tab +1 kerf, slot -1 kerf
- triboelectric voltage must clamp at air breakdown, about 3 kV per mm of gap
- touch capacitance: a grounded 80 mm2 fingertip through the real cover using
  the cover material permittivity. An earlier model at 25 percent of self-C
  was fiction.

## Geometry constants

- BLOCKS standard: 8 mm pitch, 4.8 x 1.8 studs, 3.2 plate, 9.6 brick.
  Conductive TPU socket ring 4.6 ID / 6.6 OD / 2.4 tall under a conductive PLA
  flange, post and stud. Two buried conductive PLA trace layers 1.0 wide 0.72
  tall with 0.48 PETG between.
- COFFER hex: flat-top, side 54.0 mm = 108.0 x 93.531 mm. Port standard on
  all six edges: 6 signal pads at u = +/-3, +/-8.5, +/-14 (4.4 x 3.4, centre
  3.2 in), 3 ground tabs at u = 0, +/-21 (6.5 wide, tip 1.1 off the outline),
  ground ring band 6.5 to 9.5 in from every edge.
- ESP32-C3 SuperMini footprint: pad centres 8.75, hole row 7.62, castellation
  11.25, body 18.0 x 22.4, 2.54 pitch. Right column top to bottom
  5V G 3.3 4 3 2 1 0; left column 5 6 7 8 9 10 20 21; USB at the 5V end.
- SG90 flange is centred on the CASE, not the shaft: shaft is 6.1 from one
  end of a 22.8 case, so 5.3 off centre. Flange span 32.2 against a 22.8
  body. This has forced a servo placement decision four separate times.
- Teensy 4.0 edge pinout: left column top to bottom GND, 0..12; right column
  Vin, GND, 3.3V, 23..13. USB at the top. A0..A9 are all on the RIGHT column
  (14..23). Not 5V tolerant.

## Finger and human scale gates

- a fingertip patch is 10 to 16 mm
- gate each capacitive plate at area >= 120 mm2 AND largest inscribed circle
  >= 4.5 mm (shapely.ops.polylabel)
- on a wedge pair or a phase group the number that matters is the PAIR width,
  not one electrode, because a finger has to bridge A and B for the ratio to
  mean anything
- to measure the plate, open each net by 0.95 mm first: that erases the 1.8
  mm traces and leaves only the plates

## Print and weeding

- weeding pain is set by GAP width, not trace width. KEYWAY fingers went 1.5
  to 1.8 mm wide on a wider 3.0 mm pitch, dropping 13 fingers to 11.
- 3D print time must be estimated from PATH LENGTH, not volume over flow. A
  skeletonised lattice is nearly all perimeter and perimeters run at half the
  speed of solid infill. Walk each profile's boundary WALLS times at wall
  speed, then fill the remaining area at infill speed. 0.24 lh, 0.42 lw, 3
  walls, 40/55/90 mm/s, +18 percent overhead.
- Sanity check any time estimate against volume over flow: 7.5 mm3/s average
  is plausible, 0.8 is not.
- Layer count comes from the part's THICKNESS in its print pose, not its
  standing height. Getting this wrong reported 274 hours for a 28.6 hour job.
