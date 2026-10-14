# Motion, mechanism and the latch identities

This is `packages/motion`. It covers the displacement-coincidence mechanism
family (OGEE and STIPPLE), the general linkage results, and the Motion IR.

## What is dead, do not retry

FORCE COINCIDENCE. Mechanical contact forces do not sum cleanly the way
magnetic fields do against ferrite hysteresis; soft contacts smear the 1x/2x
threshold. Rigid two-plate AND gating fails because blocking a rigid member
COSTS FORCE, so the unselected cells reappear as load.

Also dead: acrylic flexures (craze), scotch yokes cut from sheet (need a
cylindrical pin), bistable TPU cells (about 11 percent sustained fibre strain
in the latched state, plus creep), ball joints on a 45 degree cone seat (the
ball centre sits below the rocker underside so a retaining bead hangs below
the bed), and lasercut square pegs as journals (see below).

DISPLACEMENT COINCIDENCE is the live idea and every revision since uses it.

## The general linkage result

A rigid two-pin link between two vertical sliders forces
L^2 = S^2 + dz^2, so dz is FIXED by L. Length change is D*dz/L to first order
in the rest offset D, and only dz^2/2S when D = 0.

Offsets of 0 / 2 / 4 / 6 / 8 / 13 mm need 2.12 / 2.98 / 3.76 / 4.46 / 5.06 /
6.22 mm of slot.

ONLY A LINK THAT IS HORIZONTAL AT REST HAS A SECOND-ORDER LENGTH CHANGE. This
is not a style choice. A dogleg link with a 13 mm rest height difference was
6x short of the travel it needed and the two bars were locked together.

## The crown

THE ROCKER CROWN IS AN ARC STRUCK FROM THE ROCKER'S OWN ORIGIN. The top of a
circle does not move when the circle rotates about its own centre, so the
crown top sits CROWN_R above the pivot-line midpoint at ANY tilt. That makes
the averaging EXACT rather than approximate.

A plain straight top edge offset d from the pivot line gives
height = average + d/cos(theta), erring upward by d*0.118 at 26.6 degrees of
tilt, about 0.53 mm at d=4.5.

The pivot separation is NOT indeterminate. Both pivots are fixed in X (bars
only translate in Z), so the distance is forced to sqrt((2C)^2 + dz^2) and the
slot offset is exactly L - 2C.

## The pin-free joint (STIPPLE, best idea in that revision)

The link is a floating balance beam.
- column end: a CYLINDER r2.0 resting on the FLAT FLOOR of a slot in a
  PERPENDICULAR tooth. Locates y and z, free in x.
- row end: a cylindrical BOSS r1.6 in a slot in a COPLANAR tooth. Locates x
  and z.

A cylinder on a plane has its centre exactly r above that plane at ANY tilt,
so crown_top = (z_col + z_row)/2 + CROWN_R is EXACT. No chord error, no cos
error, no row slot. Half select is an exact half.

A coplanar tooth cannot locate y and a perpendicular sheet cannot locate x;
the pair is exactly COMPLEMENTARY, which is why one end gets each. This
deleted 200 rods and 200 washers, which at that cell count was the real
buildability blocker.

## The notch

The angle on the notch deflects THE ROD, not the plate and not a finger. The
rod is a loose pin standing on a rocker crown so it ALREADY HAS lateral
freedom. That freedom is the per-pin compliance. No fingers, no springs,
nothing flexes.

LEAD-IN GOES ON TOP: going up, the lug's top leads, so the ramp is the top
face and the flat retaining face is the bottom. Built upside down twice.

RAMP_A 40 degrees, not 25. tan(25) = 0.466 is marginal against acrylic on
acrylic static friction (about 0.45); tan(40) = 0.839 gives 1.9x.

The rod stands on a ramp carried by a RISING rocker, so camming aside converts
straight into rise. It is a BUDGET, not a contest. The notch demands
tan(40) = 0.839 of rise per mm of cam; the lug's top ramp permits
LUG_RAMP/LUG_P = 0.960. The rod climbing its own notch supplies 0.776 of the
0.888 of rise the cam needs, so the crown only has to rise 0.112 mm, 1.2
percent of the stroke. What matters is only that the LUG RATIO EXCEEDS THE
NOTCH RATIO.

## The governing identities

```
margin + overshoot = STROKE/2 - CAMLIFT - LUG_TOT
overshoot          = STROKE - R_LATCH
margin             = R_LATCH - STROKE/2 - CAMLIFT - LUG_TOT
```

NEVER CHANGE R_LATCH WITHOUT RE-DERIVING STROKE. Pinning a cap well to a whole
number of sheets pinned R_LATCH = 3T = 4.5, and the identities then FORCED
STROKE = 5.0. At 4.8 the overshoot was 0.300 and failed.

Why the stroke is large: a latch plate of thickness t forces
R_LATCH >= plate + lug height + cam lift + gap, which forces half select to
stay well under that. Chasing a smaller stroke is chasing a thinner plate.

## The drive chain

knob or servo horn -> CRANK (a plate rotating about the shaft axis) ->
DRIVE PIN fixed to the crank at CRANK_R from that axis -> YOKE (a HORIZONTAL
slot in the bar's drive lug) -> the bar, which can only move in Z.

THE TRICK: the yoke slot is horizontal, so it constrains the pin ONLY in Z and
lets it slide freely along the bar. The pin's HEIGHT is the bar's height; the
pin's sideways swing is absorbed by the slot's length. CRANK_SW is chosen so
2*R*sin(SW) = STROKE exactly, so the bar follows with ZERO error. Measured
worst |pin z - yoke z| over the stroke: 3.6e-15 mm.

The crank plane sits over its OWN bar's centreline, so its lowest point must
clear that bar at FULL STROKE, not at rest. Lowest =
SHAFT_Z + CRANK_R*sin(180+CRANK_SW) - armR where armR = CRANK_HUB*0.72/2.

## Servo orientation is usually forced, and the reason is the flange

The SG90 flange spans 32.2 mm against a 22.8 mm body, and it is what gets
screwed down. This has forced a decision four separate times:

- flange span must lie IN the bracket plane; along an 18 mm pitch it
  collides, along Z it does not, so servos mount flange-inward with bodies
  hanging OUT through wall windows
- moving a servo inboard once was not enough, because the flange screws still
  landed inside the wall
- column servo flanges clipped the deck 27 mm3 in every state; the fix was to
  MOVE THE SERVO (lift 3 mm), not cut the deck, because widening the cutout
  would leave 0.8 mm between adjacent columns
- "turn the servo" means rotate it about its own vertical axis, not reason
  about the shaft axis. Try the cheap literal reading FIRST

A servo is a BOUGHT BOX, not a mesh, so a part-only audit cannot see it. Box
all servos, BODY AND FLANGE, against every part in every pose.

## Actuator counts

Half select does not latch, so raise one row plus every column that row wants
and only the intersections take. 1 clear pull plus N row cycles per frame
instead of N^2. On a 10x10 that factor of ten is the entire return for 20
actuators instead of 3.

Smaller actuators buy nothing because THE MECHANISM SETS THE PITCH, NOT THE
SERVO. Peak crank torque is 8.8 gf.cm against an SG90's 1800.

Rejected actuators, with reasons: SMA (about 3 s cooldown, needs hard stops),
micro solenoids (weakest at max air gap, which is where the stroke starts),
N20 (no feedback), shared lift plus per-bar clutch (20 extra mechanisms).

## Sag

Sag is what kills a naive shrink, not the actuators. Calibrate a
cantilever-under-self-weight model against a known published number first,
then apply it.

At 10x10 with L=187 and acrylic E=3200: a 0.5x scale of a flat laminated 6x3
bar sags 1.734 mm against about a 0.39 margin. 4 laminations of 6x6 gives
0.310 (fail). 6 laminations gives 0.119 (pass, 9 mm thick, 120 strips). An
ON-EDGE COMB SPINE 1.5 x 14 gives 0.073 for the same mass.

THE BAR HAS TO GET DEEP, NOT THICKER.

## Motion IR

- MotionProgram: steps including commit and guard
- ControlSurface: ctl.pixelGrid, ctl.jog
- Rule with onViolate

Rules must be enforceable in the SIM AND in FIRMWARE, or the build is
rejected, with the table hash asserted equal. Checks:
CHK-MOT-01 limits, -02 programmed-path sweep, -03 rules coverage,
-04 addressing property (half select never commits).

Tween engine animates programs but STATE COMMITS AT COMMAND TIME, animation
only renders. This is the R1-R3 lesson restated: geometry decides the latch,
the bodies only render it. A physics engine must never decide the flip.

## Robot-specific results

- Actuator body goes in the MOVING limb, can down its own tube, parent ends
  in a fork that straddles it. Mounting on the parent link means no can
  direction survives for a pitch joint.
- Joint axes must be OFFSET, not intersecting. Intersecting gives exact
  closed-form IK but two gearbox bodies cannot occupy one point. Offset-axis
  IK is STILL closed form and exact when the foot is held level: the offsets
  are collinear with the leg and subtract off.
- The fork and D-hub belong on whichever link does NOT hold the motor.
- A symmetric 2R leg means ankle pitch ALWAYS equals hip pitch, so the ANKLE
  STOP is what caps the crouch. At +/-25 degrees the usable stance band was 6
  mm; at +/-35 it is 22 mm.
- An IMU correction that offsets the FOOT TARGET only fights the ground in
  double support, and the derivative term saturates into a relay oscillator.
  Use a real ankle strategy biasing ankle TORQUE: pitch bias symmetric, roll
  bias ANTI-symmetric.
- Applying the same joint vector to both legs describes an UNREACHABLE pose
  (both adducting = crossed legs). Drive both legs from ONE pelvis pose via
  the IK the way the gait does.
- `mout`, the MECHANICAL shaft direction, is a separate field from the
  anatomical `axis`. X joints exit outboard on both sides; Z joints exit +Z on
  both sides since parts mirror in x. Never derive hardware orientation from
  the anatomical axis.
- Three and numpy pick DIFFERENT perpendicular axes for the anti-parallel
  setFromUnitVectors case, which rolls a whole chain 180. Build an explicit
  orthonormal basis.
- Cantilevered output is the documented failure mode for servo joints. Horn
  one side, idler bearing the opposite side, hinge frame across both.
- M2 self-tappers into printed pilot holes strip in about 20 cycles.
  Heat-set inserts on load-bearing joints: hole = knurl OD - 0.2, depth =
  insert + 0.5, pad thickened so the boss has material.
