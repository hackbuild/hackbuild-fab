# Sheet and lasercut design

This is the technical record for everything cut from flat stock: the laser
line (SLUG, OGEE R12 through R17, TUMBLER, JIB, the lasercut TANG era, the
OGEE R16 sheet build) and what it taught. The vinyl copper line is in
`copper-routing.md`; this file covers plywood, acrylic and mixed builds.

Read this before touching `nest`, `export.dxf`, any `tabslot` or `finger` or
`flexcut` feature, or SKETCH.

## The representation

A sheet part is an outline, a plane, and a thickness. That is the whole Part
IR for it. OGEE R12 made the rule explicit: every part is a 3 mm sheet prism
in one of three planes (XZ, YZ, XY), no exceptions, no 3D printed part, no
fastener except a servo's own screws. 23 distinct parts, 137 pieces, two
sheets of 600 x 400.

Consequences that follow from the representation and nothing else:

- a sheet part has no feature that is not visible in its outline, so
  skeletonising and lightening work on the profile and cannot see anything
  that was never in it
- a rotating joint between two sheet parts needs an axle NORMAL to the sheet,
  and you cannot cut a round axle from flat stock along that axis. Lasercut
  pegs are rectangular prisms and rectangular prisms are not journals. A
  3.00 square shaft in a 4.443 round bore has a contact radius that swings
  from 1.500 to 2.121 as it turns, which injected 0.6 mm of wander into a 9
  mm stroke. It is a cam, not a bearing. Plate-to-plate rotation needs bought
  round stock: 3 mm rod solvent-welded into the lug, the link turning on it,
  a cut washer as keeper. Or M3 screws. This is the one bought part that is
  not optional in an all-cut mechanism
- a sheet part is a prism, so its geometry comes from the DXF and the viewer
  can extrude the same rings the laser gets. STIPPLE did this: 8632 points
  and 128 kB against tens of thousands of triangles, and the viewer cannot
  drift from the cut file

## Fits, cut to cut

Laser profiles join with CLEARANCE, which is right for a tab in a slot and
wrong for anything unioned later. FIT_LAP 0.15 for tabs, FIT_SLIP 0.40 for
things that slide, slop 0.15 per side for SLUG's ply.

Kerf compensation is ONE operation: rebuild polygons with holes and buffer
by +kerf/2, which grows outers and shrinks holes at once. KERF lives in
exactly one place and is set from the coupon. In Boxes.py terms, the burn
parameter is half the beam width; bigger burn is a tighter fit, and the
counterintuitive direction has caught everyone once.

The COUPON is a part carrying every fit class in the machine: slip slot, lap
slot, press square, pivot bore, tower slot, tab slot, loose tab, tight tab,
the SG90 body cutout, the horn screw pattern. Cut it first. Its measured
values write back into the machine profile, which is what turns kerf from a
guess into a provenance-stamped number.

Material behaviour that decides tolerance direction: spongy wood cuts
oversize for a press fit that assembles without glue; brittle acrylic cuts
undersize to leave a glue gap and because acrylic-on-acrylic static friction
is about 0.45, which is why RAMP_A had to be 40 degrees and not 25.

## Fits, cut to printed

In a mixed build the two errors go OPPOSITE ways. A kerf-compensated cut slot
lands on its drawn size. A printed feature comes out over its drawn size by
about 0.15. So a printed 3.0 lug in a 3.40 cut slot has only 0.25 of real
clearance.

PRINT_OVER 0.15 and FIT_PSLIP = FIT_SLIP + PRINT_OVER = 0.55, applied only to
laser slots that receive a printed part. Cut-to-cut stays untouched. A fourth
fit class, PSLIDE, is banded on the REAL gap because the loss model is
neither side's own. Every interface in a mixed build has to know which
process made each side; a single FIT_SLIP cannot serve both.

## Connectivity, the check that refuses

`check_connected()` runs inside the cut file emitter and REFUSES TO NEST if
any profile falls apart. This exists because two designs severed themselves
and nothing but a connectedness check could see it:

- a deck whose four column channels ran edge to edge cut it into five strips
  (shorten the bars so the channels stop short)
- a keeper washer whose two relief slits cut it in half (use one slit, so it
  is a C hinging about its solid back)
- a crank hub severed by its own bore plus pin hole (a hole at radius r
  spans r plus or minus d/2 and must clear the bore radius; check
  arithmetically, not by eye)
- three of four column comb guide tongues sheared off by a bottom-edge
  relief (pads and tongues now share a station)
- bracket slots cutting off the plate tabs the servo windows left behind,
  until every gap between windows got a bridge
- a wall-to-wall tab sitting above WALL_TOP cutting floating rectangles off
  the walls (whenever WALL_TOP changes, check TAB_Z against it)

The outline count is a diagnostic: a part with fewer rings than it has holes
has a cutout that escaped the boundary. A latch bracket came back with one
outline where it should have had four.

## Sheet stiffness, the thing that kills a shrink

Sag is what kills a naive shrink, not the actuators. Calibrate a
cantilever-under-self-weight model against a known number first (R16's
published 0.168 mm), then apply it.

A single 3 mm strip lifted at one end droops 0.95 mm at the far station,
which is more than the whole 0.775 half-select margin. So OGEE R13's bars
are TWO LAMINATED LAYERS, which takes it to 0.168 and gives the tenons a 6 mm
mortise.

At 10x10 with L=187 and acrylic E=3200: a 0.5x scale of a flat laminated 6x3
bar sags 1.734 mm against about 0.39 of margin. Four laminations of 6x6 gives
0.310, fail. Six gives 0.119, pass, 9 mm thick, 120 strips. An ON-EDGE COMB
SPINE 1.5 x 14 gives 0.073 for the same mass.

THE BAR HAS TO GET DEEP, NOT THICKER. `sanity.py` reproduces it.

## Joinery patterns that earned their place

Tab and slot with FIT_LAP. The workhorse.

Tenon down through a mortise with a shoulder on the bar face. R13's lugs,
32 of them, and two lug lengths because both pivots must be at one height.

A vertical plate passing THROUGH a horizontal plate is a long slot broken by
BRIDGES, with matching mortises in the vertical plate. They lock each other
instead of just clearing. Bridge positions must land in the gaps between
whatever else cuts that region.

Two shelf plates sandwiching a sliding plate, with two 1.5 mm dowels through
both in slots long in Y and tight in X. That is what stops it racking. Rails
do not work at 1.5 mm sheet: a horizontal channel slotted full-length through
a vertical rail severs the rail.

Laminated stacks pinned with cut washers. LamiFold's lamination workflow is
the academic version of this and is worth reading for its primitive set.

Living hinge under 13 degrees per row. Buckled beam bistability at rise over
thickness greater than 2.31. Both are TUMBLER modules with the numbers baked
in.

The guide deck: four towers through four slots cannot yaw, which deleted
every wall guide slot and guide pin in the machine. One well-placed
constraint removes a dozen weak ones.

## TUMBLER's material strip

Nine materials (Delrin, acrylic, ply, cardboard, HDPE, and PLA, PETG, TPU as
print) each with t, kerf and E, plus a FIT clearance. Change material and
every cut file changes. Tab gets +1 kerf, slot gets -1 kerf.

The part model is one closed outer loop plus closed holes plus OPEN score
polylines, with per-part topology warnings and SVG export layers that enforce
it (cut closed evenodd, score open). Getting closed and open right is the
difference between a cutter that cuts and one that plunges through a gap.

## DXF, the emitter bugs

OpenSCAD writes DXF as LOOSE LINE SEGMENTS, not polylines. To nest or re-emit
them they must be STITCHED: index every endpoint on a rounded key, walk
segment to segment until each loop closes, drop open chains.

DXF export needs belt and braces on closure: the closed FLAG (70=1) AND an
explicitly repeated first vertex, in the order 0 LWPOLYLINE, 5 handle, 100
AcDbEntity, 8 layer, 100 AcDbPolyline, 90 count, 70 flags, 10/20. And
$ACADVER in the header, or ezdxf uses a legacy parse that ignores the flag
and reports every outline OPEN when it is not. Get any of this wrong and a
cutter plunges straight through the gap.

Verify by RELOADING every exported sheet with an independent parser.

## Nesting

MaxRects best-short-side-fit inside each group, parts may turn 90 degrees.
Verified: no overlaps, minimum gap exactly 4.00 mm on both sheets, 0 outside
margin. SLUG's shelf nesting has configurable bed size and DXF and SVG
export. The plan replaces both with jagua-rs and sparrow; the connectivity
check stays inside the nest regardless of the packer.

Sheet sizes in use: 600 x 400 (SLUG, OGEE), 1220 x 610 (the shop bed).

## SLUG, the worked example

A fully lasercut gashapon vending 50.8 mm capsules. Zero printed parts,
zero bearings, zero bushings. 3 mm birch ply and 3 mm acrylic, slop 0.15 per
side. Exterior 269 x 222 x 696, interior 257 x 210. Coin acceptor CH-926
class for 22 to 28 mm coins, 28BYJ-48 with ULN2003 on an ESP32-C3 SuperMini.

### The drive

Pinion 19 tooth on the 28BYJ-48 D shaft (the R2 audit found the first bore
was round with no D flat, a build stopper). Centre distance 118.75, ratio
EXACTLY 4:1, so one vend is one motor revolution is 4075.7728 half steps.
Four pockets, 62 mm bore on a 95 mm circle.

Firmware: a 45 degree park offset so no pocket straddles the hood edge.
Full-hopper torque margin 1.3 to 1.7x at 600 half-steps per second or less;
1000 is near the 28BYJ torque cliff.

### The rotor is a capsule well, not a gear

The first rotor was nine layers of 6 mm, 54 mm tall, OD 195, with teeth on
only the bottom two layers. 12 mm of face width is seven times what 0.025 Nm
needs. The 54 mm exists so the MOVING ROTOR FACE sits 1.9 mm under the funnel
mouth and can shear arches.

That was proven by failure: thinning the rotor to 24 mm is dimensionally
fine (5.64 against 5.60 mm of capsule location) but moves the only moving
face 23 mm from the mouth, so arches form 23 mm above it and nothing breaks
them. The 24 mm rotor stalled at vend 9 with 21 capsules still in the
hopper, two of them wedged with centres 51.2 mm apart, touching.

The rotor was then rebuilt as a CAGE: two toothed discs, an equator ring, a
top disc, and eight posts. 0.62 sheets of material against 2.85 for a solid
18-disc stack. Same capsule well, same moving face at the mouth, a fifth of
the ply.

### There is no throat

A 62 mm round throat under a 76 mm square mouth left a 7 mm ledge, and
capsules parked on it permanently. Funnel panels placed by mid plane instead
of inner face pulled the opening from 58 to 49.9 mm, under the 50.8 capsule.

And a 58 mm mouth is 1.14 capsule diameters. Spheres ARCH below two
diameters. Six trials: mean 5.5 of 13 vends, worst 2.

So: no narrow throat at all. The ceiling has a 156 mm opening, 3.07
diameters, over the fill half, plus a HOOD keeping the ceiling solid from 0
to 180 degrees over the exit. Without the hood, a fully open throat lets the
exit pocket refill from above and dump the whole hopper for one coin. THE
POCKET IS THE ONLY METERING ELEMENT, which is how a real gashapon works.

Funnel: back face vertical, three leaning faces, feet into the ceiling and
heads through the walls.

### The coin path

Accepted coins go down a 41.8 degree chute into an 80 x 86 x 60 cash box on
the base. Rejects go to a return cup behind a front panel opening. A coin
wall separates the coin compartment from the delivery chute. The R2 audit
found the chute 6 mm too narrow to engage its wall slots, and the cash drawer
blocked by a 3 mm hatch sill and proud of the back panel. Fill hatch capacity
about 55 to 60 capsules to the stiffener.

### The physics that found all of it

Headless in node, MULTIPLE TRIALS. Lattice spawn, iterated position
relaxation, a speed cap, finite-panel funnel colliders. A single run looked
fine and was luck; six trials exposed the arching, and the rotor height
failure only showed comparing 24 against 54 across runs.

Final: 126 of 128 vends across eight trials delivering exactly one capsule
(both misses a first vend with an empty pocket), later 56 of 56 across four
trials after the cage rebuild.

### The audit that found the rest

`audit.py` with 43 numeric checks. `bake.py` exports cut outlines from
OpenSCAD; `inject.py` puts them in the HTML; all 43 baked parts triangulate
to their exact cut area. `placecheck.mjs` verifies every appliqué part
(window, door flap, coin plate, drawer face) covers its opening, because
after the baked-outline switch they all had wrong origins.

The R2 audit against the 3 mm stock found five build stoppers AS CUT: the
round pinion bore, the narrow chute, the blocked drawer, a stiffener cut with
no panel slots, and a duplicate `funnel3d` module in the source where the
second definition wins and carried the mid-plane bug.

Nine ply sheets plus one acrylic sheet at 600 x 400, zero overlaps.

### What SLUG proves about the representation

Every failure was invisible to a static check and visible to either a
multi-trial sim or a connectivity or placement audit. The rotor-as-well
insight came from a sim comparing two heights. The no-throat insight came
from the arching count. The cage rebuild was material accounting. None of it
was a triangle problem; all of it was declarations (a pocket meters, a hood
covers the exit, a moving face sits at the mouth) that a sim could test.

## OGEE's sheet builds, condensed

R12 through R17 are recorded in `mechanisms.md` and `motion-latch.md`. The
sheet-specific residue:

- three planes only, every part a sheet prism
- axis-aligned stations trap printed rockers into overlapping at 24 mm pitch;
  a 45 degree yaw gives 33.9 mm; R16 solved it with pitch instead
- the crown struck from the rocker's own origin is exact at any tilt
- the pin-free floating balance beam at 1.5 mm sheet: a cylinder on a flat
  slot floor plus a boss in a coplanar slot, complementary, no pins
- servos mount flange-inward with bodies hanging OUT through wall windows,
  because the 32.2 mm flange must lie IN the bracket plane and collides
  along an 18 mm pitch
- the cap well: four laminations because a single 1.5 mm sheet spanning 162
  mm with a hundred 12 mm holes is not flat
- 27 parts, 179 pieces, 3 sheets (R16); 25 profiles, 408 pieces, 7 sheets
  (R17)

## JIB and the lasercut TANG era

JIB is the DAVIT variant with a printed pipe mount and lasercut arms on
standard servos, buildable from minimal printed parts plus cut parts plus
the screws in the servo bags. The pattern: print the part that clamps a
round thing, cut everything flat.

TANG R1 through copper v4 was a lasercut ply build with parametric sheet
thicknesses. Superseded by R5's all-printed body, but the copper lessons
carried: tail pitch must equal escape pitch, routes overlap into pads, a
guard frame gets exactly one window.

## The academic line to read

HPI's Baudisch lab published twelve laser-cutting projects across CHI and
UIST from 2015 to 2023, explicitly aimed at moving laser cutting past makers
to non-experts. Each one solves a piece of what this corpus solved by hand:

- Kyub: 3D modelling with boxels that unfold to plates; sturdy closed-box
  structures from 4 mm ply. The SKETCH plan already cites it.
- fastForce: detects structural flaws in laser-cut models and fixes them by
  adding plates, up to 52x stronger. The sag model and the sheet checks are
  the same idea done for one machine at a time.
- SpringFit: joints and mounts that fabricate on ANY laser cutter, by
  designing tolerance-insensitive springs instead of tuning kerf. The
  opposite strategy from the coupon, and worth having both: coupon for
  precision, SpringFit for portability.
- LamiFold: integrated mechanisms via selective cutting and gluing of
  laminated stacks, with a primitive set. R13's laminated bars and TUMBLER
  are this.
- Roadkill: nesting laser-cut objects for FAST ASSEMBLY, placing connected
  plates adjacent so the sheet assembles by folding. 92 percent of the top
  60 Kyub models, 0.89 s average. An untapped idea for `nest`: optimise for
  assembly order as well as fill.
- FoolProofJoint, autoAssembler, Assembler3: assembly instructions and
  joint disambiguation. The forced assembly order in the OGEE stepper is a
  hand version.
- kerf-canceling mechanical metamaterials: HEDDLE's territory.
- LaserStacker, Constructable, LaserOrigami, Platener, FlatFitFab, CutCAD,
  Joinery.

None of them integrates into one deterministic build with a check registry,
none does electronics, and Kyub is the only one that became a product. The
ideas are free to take and the integration is the gap.

## The maker-side tools

Boxes.py: the mature generator library. GPL v3, Python, finger and dovetail
joints, flex cuts, hinges, a burn parameter, an Inkscape plugin, and a real
API for writing generators. GPL means it cannot be vendored into a
permissive kernel; mine its generator catalogue as data, or call it as a
service, and match its burn semantics so users' intuitions carry over.

MakerCase and the LightBurn box plugin: single-purpose box generators with
kerf and dogbones. Joinery adds joints to an existing SVG. Cuttle is the
parametric-template product with daily users. Rayforge is the open GRBL
laser suite with an AI sketcher.

What none of them do: 3D assembly with joints as first-class objects,
mixed-process fits, connectivity refusal, sheet stiffness, physics, or
provenance. That is SKETCH's whole reason to exist, and it should not
rebuild what Boxes.py and Cuttle already do well.
