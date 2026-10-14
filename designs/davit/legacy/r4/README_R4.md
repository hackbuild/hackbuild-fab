# DAVIT R4

Pair of pipe-mounted 9g robot arms. R4 is a mini-only structural rework of
R3: same joint frames, same chain constants, same mount and foot interfaces,
so R3 hardware placements and the simulator chain carry over unchanged. The
standard-servo variant is retired.

Files: STLs in stl_r4/, generator parts_r4.py (imports lib.py, reuses the
R3 mount from parts.py), kinematics assembly.py, interference gate sweep.py,
sim packer pack_sim.py plus verify_sim.py, viewer sim_r4.html.

## Why R4 exists

Mesh inspection of the R3 mini STLs found real defects, several fatal:

1. Four gear teeth were detached bodies. The jaw tooth boxes met the D13.2
   boss along a tangent line, so three drive teeth and one idle tooth were
   separate solids inside the STL. The gripper could not work as printed.
2. The fore yoke plates hung on octagon-vertex slivers. Total cross section
   at the plate-to-post junction (z -15) was 42.5 mm2, about 20 mm2 per
   side. R4 replaces the posts with full side plates lapping a widened
   bridge through the whole plate thickness: 224 mm2 at the same station.
3. The crank flange carried the whole shoulder moment through a 0.8 mm lap,
   54 mm2 across two disconnected slivers. R4 replaces the whole stick truss
   with one full-thickness gusset panel filling the bay from the driver
   channel down into the drum, two triangular windows with a 5.5 diagonal
   brace between them, the beam buried 2.8 into the drum with end wedges
   flaring onto the shoulders. 299 mm2 continuous immediately behind the
   disc, about 500 mm2 through the panel.
4. Boss lightening bores left 0.95 mm walls to the servo pockets. R4 uses
   two or three stadium through-voids per boss, self sized to keep 2.0 mm
   to the OD and pocket; min wall is now 2.65 mm.
5. The upper frustum was a 35 degree overhang printed cup-up. R4 cones are
   45.0 degrees everywhere, including the internal shell voids.
6. The palm carried a sealed 2.24 cm3 internal box that vented nowhere. R4
   replaces the solid slab with an open cradle, cheek windows, and a wing
   plate carrying the idle pad and pin at their exact R3 coordinates.
7. The roll and wrist horn screws could not be driven. Their head cbores
   sat behind a D2.8 waist inside solid material. R4 adds a D6.4 axial
   driver channel from each cup floor down into the open servo pocket
   below; the assembly order already installs those servos afterward.
8. The grip servo could not seat. Its mounting tabs top out 7.0 below the
   shaft face, but the R3 palm tab channel stopped at 4.6, leaving 247 mm3
   of interference. The R4 channel clears to 7.2 and the pilot bores moved
   up to match. This one is invisible in the sim because R3's auto
   calibrated masks whitelisted it.
9. A 22 mm3 splinter body floated under the base journal bore. Removed
   with a relief cut.
10. The mini base wire window existed only on one side. Mirrored.

One deliberate non-change: the axial joint stays D45.6 boss in D46.3 cup,
D52.8 outside. The roll and wrist servo tab corners swing at r 22.47, so
the cup bore cannot go below D45.6. A smaller joint fails on hardware, not
on plastic. The far tab screw pilot at r 19.4 sets a similar floor on the
boss. Both constraints are now written down here so nobody shrinks it
again.

## What R4 adds

Skeletal geometry in the style of open micro-servo arms: the crank gusset
panel, diamond windows in the yoke plates, through-windows in the upper
block sides, back, and lower bulk, side windows through both journal boss
walls into the stadium voids (the crank one doubles as the roll servo
wire route: pocket, wall notch, void, out the -y window), four arc slots
through each cup floor, slotted gripper fingers, shelled 45 degree cones
over hollow tube cores, yoke struts from the boss top to the bridge wings
so the bridge prints supported, and one-sided keyed horn recesses that
clock every horn correctly and restore the drive jaw's 180 degree tooth
root.

Material, arm plus base, no mount: 189.6 cm3 against 226.7 for R3, 16.4
percent less, with every load path thicker than before.

volumes, cm3: crank 32.4, upper 42.4, fore 40.8, palm 35.9, jaw_drive 2.5,
jaw_idle 2.7, pincap 0.2, base 32.7, mounts 41.2 / 45.5 / 48.8.

## Fits

flange D36.0 in base bore D36.7. boss D45.6 in cup D46.3, cavity 13.4 deep.
elbow stub D7.0 in socket teardrop D7.9 (stub grew from D6.0, ip plate
thickened 4.0 to 4.8 outward, inner face unchanged). jaw pivots D4.8 on
pins, pincap D2.35 press pin in D2.2 bore. Horn hub relief runs 0.2 proud
for screw clamp. Servo pockets 0.35 per side, 0.2 vertical.

## Printing

Print as authored, no supports. crank: boss down, flange standing. upper:
block down, cup up. fore: boss down. palm: cradle down, cup up. base:
upright on the foot. jaws and pincap flat. Remaining flat ceilings are the
same classes R3 shipped: servo pocket roofs, tab seats, and window tops
bridging 3 to 9 mm. PETG, 3 to 4 perimeters, 40 to 50 percent infill on
crank and fore, 25 percent elsewhere.

## Assembly notes that changed

Horn recesses are keyed: each single-arm horn only drops in one way. Crank
and elbow horns point down at zero pose, cup-floor horns point along +x,
the drive jaw horn points toward the fingertip. Center every servo before
seating the horn. The roll and wrist horn screws drive through the D6.4
axial channel in the cup floor, reached through the still-empty elbow and
grip pockets, so keep the R3 joint order: shoulder, roll, elbow, wrist,
grip. The grip servo now seats fully; slide it in from below until the
tabs stop at the channel top, then run the two M2 tab screws upward.

## Validation

Every part watertight and single body. 43 pair sweeps across full joint
ranges at 1 to 2 degree steps, exact manifold booleans on every approach
inside 1 mm: zero interference, the only nonzero contact being the 3.2 mm3
designed pincap press fit. Simulator data regenerated from the R4 meshes
with masks calibrated the same way, then verified independently: 416
random legal poses clean across all three pipe sizes, and stripping the
masks produces the expected designed-contact hits. sim_r4.html boots the
full three.js scene headless with all presets clean.
