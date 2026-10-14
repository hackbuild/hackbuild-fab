DAVIT
=====

A pair of 5 DOF robot arms with grippers for 1 in to 1-1/2 in pipe. Each arm
has its own pipe mount, so arms attach separately, anywhere along the pipe, at
any angle and spacing. Two builds from one design: DAVIT runs 2 standard plus
3 micro servos per arm and reaches 314 mm. DAVIT MINI runs 9g micros at every
joint, reaches 255 mm, and shares the palm, jaws, and pin cap prints with the
standard build.
Johnny Five posture, printed parts only, every fastener comes out of the servo
bags. davit.html is a single file simulator that renders the real STLs with
solid body collision detection and live gravity torque on every servo.

DAVIT per arm: 2 standard servos (MG996R class) and 3 micros (MG90S class,
metal gear recommended). Shoulder pitch and elbow are standard. Shoulder roll,
wrist roll, and grip are micros. The roll micro is the honest weak point,
watch its bar. MINI per arm: 5 micros, metal gear strongly recommended, and
it is a desk scale machine, not a lifter.

Left arm is the same prints as the right rotated 180 degrees around the pipe.

The simulator
-------------
Open davit.html from disk. MODEL buttons switch between DAVIT and MINI 9G,
swapping parts, chain geometry, servo torque models, and collision data
together. The EXPLODE slider pulls every part apart along its
assembly direction so you can see what goes where; collision detection pauses
while exploded and comes back when you close it up. Every printed part and servo carries a calibrated
sphere collision proxy. Drag any joint into another part and the slider stops
at the touch point, the contacting pair turns red, and the collision readout
names it. The 30 designed contact pairs, journals, horns in recesses, servos
in pockets, gear mesh, are whitelisted from a 500 plus pose calibration sweep
so only real interference registers. SAG WHEN STALLED lets any joint pushed
past stall torque fall until it rests against gravity, a limit, or another
part. Torque bars update live against 4.8 or 6 V stall with payload and
infill sliders. The verified joint ranges are pitch 120 both ways, roll and
wrist continuous, elbow 110 both ways, grip 3 to 46 degrees.

Mounting to the pipe
--------------------
The mount is one piece on the pipe that both arms connect to: a full ring
collar with two opposed dovetail pads. Slide it onto the pipe, then drill
straight through any 4 of the 6 guide holes with a 3.2 mm bit into the PVC
and drive #8 x 3/4 pan head self tappers. The counterbores seat the heads
flush against the curved wall.

Each arm base slides straight down onto a pad from above. The base foot is a
C channel that wraps the pad lips, lands on the stop wings, and locks with a
single #8 x 1/2 screw driven vertically from above through the top tab into
the pad pilot. Nothing blocks the driver, it comes straight down in open air.
The lips carry the shear and moment, the one screw only stops lift out. An
arm comes off in one screw, the mount stays on the pipe. The same pads take
the DAVIT base and the MINI base, so one mount runs two standard arms, two
minis, or one of each.

Rotating joints, why they turn
------------------------------
Every rotating interface is round against round as printed. Vertical bosses
and bores print as true circles. The crank flange, which prints standing up,
uses a shield profile: a true semicircle on top so the journal has round
contact at every rotation angle, and a 45 degree V below so it prints vertex
down with no supports. The hub bore is 96 segments with a gabled roof. The
elbow idler stub uses the same shield section.

Parts and print orientation, no supports needed
-----------------------------------------------
mount_(size)  one piece, both arms. Upright, pipe bore vertical. Screw
              holes are teardropped, prints without support.
base          the DAVIT arm base, one per arm. Upright, foot vertical, barrel
              bore gabled. mini_base is the MINI version. Both fit every
              mount size, since the shoulder offset is pipe radius plus a
              constant.

MINI parts print in the same orientations as their counterparts:
mini_mount_(size), mini_crank (boss down, shield flange standing),
mini_upper (block down, cup up), mini_fore (boss down, yoke up). The palm,
jaws, and pincap prints are shared between both builds.
crank  x2     boss down, shield flange standing, vertex down.
upper  x2     elbow block down, cup up. Hollow tube, 45 cone roof, r6 rounded
              vertical edges on the elbow block.
fore   x2     wrist boss down, yoke up. Hollow tube, vented internally.
palm   x2     slab down, cup up.
jaw_drive x2, jaw_idle x2, pincap x2   flat.

PETG for crank, upper, fore. 4 walls, 25 to 45 percent infill. The hollow
tubes and lightening windows cut plastic about 16 percent overall and print
time more than that, since the tube cores were solid infill before.

Fits
----
crank flange, shield Dia 57.3 in hub bore Dia 58.2, 0.45 per side. Horizontal
bore, so it runs looser than the verticals on purpose.
boss journals, Dia 45.6 in cup bore Dia 46.3, 0.35 per side, both print
vertical and round.
elbow stub, shield Dia 8.2 in teardrop socket Dia 9.1, 0.45 per side.
idle jaw pin, Dia 4.8 across vertices in a Dia 5.5 bore, 0.35 at the vertices.
pin cap, Dia 2.35 stem pressed into a Dia 2.2 bore, 0.15 interference, 1.1 mm
wall around it.
servo pockets, tab channels, and horn recesses, 0.35 per side. Horn relief is
0.2 shallow so the horn screw clamps the part.
pilot bores, servo spec vertical, opened 0.2 where horizontal.
gripper gear backlash 0.59 at the pitch radius.
pvc screw holes, Dia 4.6 through with Dia 9.2 counterbores, fits #8 self
tappers or M4.
base to mount, Dia 4.6 clearance through the foot into Dia 3.4 pilots, tongue
and groove registration with 0.35 clearance, 2.5 mm gap between the mount
tongues and the servo case.
If your printer runs tight, scale holes not parts, or add 0.1 to CH in lib.py
and rebuild.

Screws, all from the servo bags
-------------------------------
Each MG996R bag: 4 tapping screws to its pocket pilots, 1 horn screw, 1 X horn.
Each micro bag: 2 tapping screws, 1 horn screw, 1 single arm horn.
The horn drops into a keyed recess and the horn screw clamps the part between
screw head and horn hub. The elbow far side rides a printed stub in a socket,
the idle jaw rides a printed pin with a press fit cap.

Assembly order
--------------
1  Roll micro into the crank boss from below, wires out the slot, 2 screws.
2  Micro horn into the upper cup floor recess. Cup onto the boss, servo
   centered, horn screw up through the floor into the spline.
3  Elbow servo into the block, wires out the side window, 4 screws.
4  X horn into the fore horn plate recess. Stub into the pad socket, plate
   over the spline at center, horn screw.
5  Wrist micro into the fore boss, palm cup goes on like step 2.
6  Grip micro into the palm, 2 screws. Single arm horn into the drive jaw
   recess with the arm toward the fingertip side, away from the pin. Mount at
   full close, screw. Idle jaw over the pin, teeth meshed, press the cap.
7  S1 servo into the hub cradle, 4 screws. Horn into the crank flange recess,
   crank hanging straight down at servo center, horn screw through the channel.
8  Slide the mount onto the pipe, drill 3.2 through 4 guide holes into the
   PVC, drive the #8 x 3/4 screws.
9  S1 servo into the base cradle, 4 screws, horn and crank as in step 7.
   Slide the base down onto a mount pad until it lands, drive one #8 x 1/2
   straight down through the top tab.

Wires
-----
Roll micro out the crank slot, up the web. Elbow out the block window into the
tube groove and rim notch. Wrist out the boss slot, along the taper, up the
groove. Grip out the open palm face. Slack loop at every rotating joint.

Numbers
-------
DAVIT reach shoulder axis to jaw tip 314 mm, MINI 255 mm. Mounts fit 1,
1-1/4, 1-1/2 in schedule 40. A DAVIT arm plus mount is about 300 cm3 printed,
a MINI arm plus mount about 230 cm3.

Load path notes: the crank is a real truss now, top chord, beam bottom
chord, two diagonals, and an end post, taken from how the good micro servo
arms do it. The main tubes are open four rib cages instead of closed
cylinders, wires run through the openings, no more internal grooves. The
upper base window keeps 4 mm of wall behind the idler socket, and the fore
idler plate is 4.8 thick because the stub root takes the elbow reaction in
bending. Every part is verified as a single connected body, and the whole
stack, mount on pipe, bases on mount, arms on bases, is verified
interference free through the full joint ranges. Gripper pinch on the
order of 400 g at the tips with a metal gear micro at 6 V.

Files
-----
davit.html      simulator, open from disk, needs internet once for three.js
stl/            all printable parts
parts.py lib.py assembly.py   parametric source, python3 with trimesh,
                manifold3d, shapely, scipy
