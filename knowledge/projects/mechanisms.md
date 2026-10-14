# Mechanisms

## OGEE, seventeen revisions

The full revision history is the single densest record in this body of work.
The condensed version:

- R1-R3: force coincidence disproven. Displacement coincidence adopted.
- R4: bistable TPU cell, killed by sustained fibre strain and creep.
- R5-R7: the notched rod through a plate, with a second plate holding the
  notches up. THE ANGLE ON THE NOTCH DEFLECTS THE ROD, which already has
  lateral freedom because it stands loose on a rocker crown.
- R8-R11: printed line, dog-leg rocker. R11 is the last printed revision of
  that generation.
- R12: all lasercut sheet. The rocker crown struck from its own origin is the
  best idea in the revision. Rejected on two counts: square pegs are cams not
  bearings, and the parts diverged from his screenshots.
- R13: his part set with ONE forced change (horizontal link, two lug lengths).
- R14: raked lugs. Wrong; "at an angle" meant YAW, not tilt.
- R15: 45 degree yawed cells. Chosen because every cell part profile is
  UNCHANGED and only the placement gains the yaw.
- R16: back to inline, because yawing the cell yaws the rod's foot slot, so
  the latch plate has to release along the diagonal normal and the tray slides
  diagonally. DIAG became a real parameter rather than a rewrite.
- R16-P: printed hand-cranked variant, 99 parts in 18 shapes.
- R16-M: minimal skeletonised frame, 776 to 198 cm3.
- R16-C: elastic cloth over the pins, real PBD solve.
- R17 STIPPLE: 10x10 miniature, on-edge combs, the pin-free joint.
- R17b: the cap well, four laminations. Pinning the well to whole sheets
  pinned R_LATCH and FORCED STROKE.

The checker suite that grew out of it, in the order it was needed:
`kin.py`, `audit.py` (mesh interference at solved placements),
`cutfiles.py` with `check_connected()`, `check_viewer.py` (JS vs Python
placements), `fits.py`, `check_drive.py`, `check_sweep.py`, `check_servos.py`,
`check_frame.py`, `check_bores.py`, `check_guide.py`, `orient.py`,
`printtime.py`, `audit_print.py`, `skeleton.py`, `prismatic.py`, `shots*.py`,
`headless.py`.

Each one exists because the previous set had a HOLE, and the holes are
documented in `kernels/verification.md`.

The two most expensive single bugs:
1. The link-origin bug. Exporting a moving part with its world offset baked
   in, so three rotated it about a point 48 mm below its pins. Measured error
   22.06 mm at one bar driven. Survived every still render, the rest-state
   audit, and a 128-placement kinematics comparison, because AT ZERO TILT THE
   ERROR IS EXACTLY ZERO.
2. The pin sweep. Every pin head swept into its own servo on the bar
   cranks. The bench record said 577 mm3 of real overlap each; D-233 retires
   that figure: the original check_sweep.py gives about 682 mm3 per bar crank
   as a per-step sum over 25 steps and 78.96 to 79.16 mm3 counted once
   (computed). Invisible because every existing check
   sampled STATES, which is correct for translating bars and wrong for
   rotating cranks.

## SLUG

Zero 3D printed parts, zero bearings, zero bushings. 6 mm birch ply or 3 mm
acrylic, slop 0.15 per side. Exterior 269 x 222 x 696.

The rotor is 9 layers of 6 mm = 54 mm with teeth on only the BOTTOM TWO
layers. The 54 mm IS A CAPSULE WELL, NOT A GEAR: it exists so the moving rotor
face sits 1.9 mm under the funnel mouth and can shear arches.

NO NARROW THROAT. The ceiling has a 156 mm opening (3.07 capsule diameters)
over the fill half, plus a HOOD keeping the ceiling solid from 0 to 180
degrees covering the exit. THE POCKET IS THE ONLY METERING ELEMENT, as in a
real gashapon.

Failures the simulator caught, all headless in node before any browser run:
- a 62 mm round throat under a 76 mm square mouth left a 7 mm ledge that
  capsules parked on permanently
- funnel panels placed by mid plane instead of inner face pulled the opening
  from 58 to 49.9, under the 50.8 capsule
- a 58 mm mouth is 1.14 capsule diameters; spheres arch below 2. Six trials,
  mean 5.5 of 13 vends, worst 2
- thinning the rotor to 24 mm is dimensionally fine but moves the only moving
  face 23 mm from the mouth, so arches never break
- a fully open throat with no hood lets the exit pocket refill from above and
  dump the whole hopper for one coin

Final: 126 of 128 vends across eight trials delivered exactly one capsule.
Both misses are a first vend with an empty pocket.

THE METHOD NOTE: running the physics headless across MULTIPLE TRIALS is what
exposed the arching. A single run looked fine and was luck.

The R2 audit found five build stoppers AS CUT: a round pinion bore with no D
flat, a coin chute 6 mm too narrow to engage its wall slots, a cash drawer
blocked by a 3 mm hatch sill, a stiffener cut with no panel slots, and a
duplicate function definition in the source where the second definition wins.

## TUMBLER

18 parametric modules across LOGIC (coincidence AND, inhibit, wedge OR, teeter
NOT, differential XOR, tumbler coded AND), MEMORY (detent latch, snap flexure,
ratchet, shift drum), MOTION (geneva, spur pair, whiffletree DAC), KERF
(living hinge, finger joint) and FLUID (tesla valve, coanda gate, membrane
valve).

A global material strip drives every dimension: 9 materials each with t, kerf
and E, plus a fit clearance. Change material and every cut file changes.

The design insight it is built around: THE SAME NOTCHED BAR MOUNTED BACKWARDS
INVERTS THE INPUT, so one part gives AND and INHIBIT, and a bar with two holes
at opposite phases is an XOR in two moving parts.

Each module has a live animated action elevation whose output is DERIVED FROM
GEOMETRY, not from a boolean.

The v2 pass rebuilt the part model as one closed outer loop plus closed holes
plus OPEN score polylines, with per-part topology warnings and SVG export
layers that enforce it (cut closed evenodd, score open). Mechanical
corrections that pass: geneva slots open to the rim with dimensions derived
from the crank (c = cr/sin(pi/n), wr = c cos(pi/n)) plus locking-disc
scallops; a snap flexure beam formed by TWO CRESCENT HOLES so it stays
attached; a membrane valve as a 4-layer Quake stack.

`fitVB()` fixed the alignment problem: draws measured off a hidden svg at
input extremes 0 and 1, and the union bbox becomes the viewBox. 3D viewBoxes
grow MONOTONICALLY to avoid jitter.
