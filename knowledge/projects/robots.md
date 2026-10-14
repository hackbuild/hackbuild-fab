# Robots and joints

## DAVIT

Four major revisions plus sub-revisions, driven almost entirely by looking at
renders and screenshots.

Zero extra hardware is the defining constraint: a keyed horn recess plus a
relief depth so the STOCK HORN SCREW clamps the part between head and horn
hub; a printed stub in a teardrop socket for the elbow far side; an idle jaw
on a printed octagon pin with a press cap; a printed tapered wedge clamping
the pipe.

The CAD lessons:
- `lib.diff` unions all cutters then does ONE manifold difference. Sequential
  subtraction corrupted meshes when cutters shared an axis and silently ate
  later cuts.
- A journal profile that prints without support: a TRUE SEMICIRCLE top (round
  contact at every angle) plus a 45 degree V bottom (prints vertex down, max
  radius everywhere). This is PROVABLY the only profile; tangent-line
  alternatives all exit max radius.
- A single-arm horn modelled as a double-ended bar produces PHANTOM
  COLLISIONS. Model it -3 to +arm.
- One-sided keyed horn recesses CLOCK every horn, which restores a 180 degree
  tooth root on the drive jaw. But arm direction then matters PER MOUNT.
- Joint size lower bound, discovered and written into the README so it is
  never retried: roll and wrist servo tab corners swing r22.47 (shaft offset
  5.4 plus half tab span 16.2, half width 6.2), so the cup ID floor is 45.6.
  The joint stays D45.6 / 46.3 / 52.8 forever.

The collision system is the most developed in the body of work: two-level
sphere proxies per body (fine surface samples plus grid-cluster coarse
spheres), per-size masks, 30 designed-contact pairs AUTO-WHITELISTED from a
532-pose sweep, and at runtime AABB then coarse then fine with binary-search
slider clamping at the touch point.

The whitelist gotcha: right-arm-only calibration MISSED the left arm's
mirrored hub contact points. And auto-calibrated skip masks WHITELIST CONSTANT
INTERFERENCE SILENTLY, which is how two latent assembly defects survived.

The crank saga, three attempts, is the record of SILHOUETTE MATTERING:
1. the 9.5 mm driver channel FULLY SEVERED the 8.8 mm crank plate; the upper
   half had been a dead cantilever since v1
2. the gusset-web version read as FOUR DISCONNECTED STICKS in his screenshots,
   and the 635 mm2 neck claim had been measured THROUGH the flange disc; the
   true neck behind the disc was about 75 mm2
3. final: ONE rectangular gusset panel absorbing topbar and endpost, with two
   triangular windows cut via an inner box minus a diagonal LineString buffer,
   so the diagonal is a deliberate brace landing in solid borders

An ASCII silhouette via trimesh.contains over an xz raster confirmed his
screenshots exactly and is the reliable visual check when image echo drops.

## PAWL

The big process fix came from here: I CAN RENDER MESHES TO PNG AND LOOK AT
THEM. Every prior round shipped 3D content sight unseen.

What looking revealed, all invisible to every numeric checker: output shafts
floating disconnected (shaft position used the joint's absolute x instead of
subtracting the driven link's origin), knee and hip-pitch shafts pointing
INBOARD (basis mirroring flipped the anatomical axis sign instead of using the
mechanical direction), and a shoulder incoherent three ways.

The fix that prevents recurrence: `joints()` carries `mout`, the MECHANICAL
shaft direction, separate from the anatomical `axis` which is only a control
sign convention.

The parts file was BADLY WRONG and neither analytic checker could see it:
`cq.Workplane('XZ')` extrudes along -Y and `.workplane(offset=)` offsets along
+Z, so every body built downward and every motor pocket was placed 160 mm
sideways. Found only by DECODING THE STL INTO THE SIM. Rewritten on explicit
`makeBox`/`makeCylinder` with explicit centres and directions, plus
bounding-box assertions per part.

mk2 failed three physical checks measured off the solid with ray probes: the
motor pocket was SEALED on all four faces, free space for wiring was 0.00 x
1.50 mm against a needed 5 mm channel, and the "coupling" was a plain round
clearance hole transmitting ZERO TORQUE.

Five checkers run before shipping: `pack.py` (swept packaging), `route.py`
(mating concentricity), `check_parts.py` (physical possibility), `fdm.py`
(printability), `robot.py` (whole-robot self-clearance), plus `final.mjs`
(physics suite) and `smoke.mjs` (HTML runtime).

Proportion audit against human canon made "the model is weird" concrete: the
pelvis was WIDER than the shoulders (0.94 against a human 1.45), torso 0.74x
too short, head 1.6x too small, feet 1.43x long and 2.15x wide. Only the ankle
stack is forced at 3.6x, because it IS the actuator stack.

## SPOOL

The floating-parts bug: mated pads whose bolt circle sat OVER A HOLLOW, so
parts seated on nothing; plus two joints assembled with the plain yoke instead
of the bridged variant, leaving the torso and head hovering by exactly the
3.2 mm bridge plate.

The seat check must be SURFACE TO SURFACE (sample triangle interiors,
KD-tree). Vertex-to-vertex distance is meaningless for flat faces in contact
and gave false readings both ways.

## STANCHION

ONE MOUNT PATTERN EVERYWHERE is what makes the arms modular: PAD is 4x M4 on
22 x 20; HORN is 6x M3 on r8 plus shaft relief, concentric, on the SAME FACE
of every bracket. Any bracket bolts to any pad or any servo horn.

A split clamp can carry at most TWO OPPOSED accessory pads cleanly, one per
half, because pads that straddle the kerf get cut in two.

The aileron differential: two servos into a printed cardan cross into a camera
plate, where horn SUM is tilt and DIFFERENCE is roll. And the reach is SET BY
THE HORN, NOT THE PLATE. Usable socket rise is about 11 mm on a 15 mm SG90
horn; a 20 mm arm opens the range from +-95/+10-22/+-10 to about +-20/+-18
with no other change. LONGER PLATE ARMS MAKE IT WORSE (more rod travel per
degree).

Pairwise boolean-intersection volume across every instance pair, at neutral
AND swept, went 84 interfering pairs to 0. Report the intersection bbox in the
FIRST part's local frame; that localises the fault instantly.
