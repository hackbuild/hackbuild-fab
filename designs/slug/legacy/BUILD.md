# SLUG build notes

Lasercut capsule vending machine. 50.8 mm (2 inch) capsules, coin acceptor,
28BYJ-48 stepper. 3 mm ply throughout, 3 mm acrylic for the panes.
Zero 3D printed parts, zero bearings, zero bushings.

Exterior 269 x 222 x 696 mm. Interior 257 x 210.

## What changed for 3 mm stock

The z stack derives from `t` now rather than being written out, so the whole machine
moved down: deck top 306, drum 310.6 to 364.6, ceiling 366.5. The pinion and the
motor plate are laminated pairs so the gear face matches the drum's toothed pair and
the motor has something solid to hang from. A stiffener frame went into the hopper at
z 530: the funnel head tabs already brace the front and both sides at mid height, but
the back upper panel had a 320 mm unsupported span in 3 mm ply.

Two faults surfaced when the thickness changed, both on the front panel. The coin
wall's upper tab slot ran into the coin return opening and left a 5.9 x 0.8 mm island
of ply that would simply have fallen out; the tab stations moved to z 30 and 75. And
the return opening overlapped the delivery door in x, merging the two into one
L-shaped hole, so it narrowed from 60 to 44 mm wide.

## Cut sheet units

The exported SVG carries width and height in real millimetres so it cuts at 1:1.
The on-screen preview deliberately does not: an SVG tagged width="600mm" renders
about 2270 px wide in a browser and runs straight off the page, which is what the
preview used to do. The preview ships a viewBox only and is sized by CSS, with
non-scaling strokes so the cut lines stay visible when it shrinks.

If you re-export by hand, make sure the millimetre units are on the file. A unitless
SVG will land in the cutter at whatever scale it guesses.

## Audit

`audit.py` runs 41 numeric checks over the gear train, capsule clearances, funnel
rakes, the motor, the z stack, joinery fits, capacity and drive timing. All 41 pass
at the current numbers. Re-run it after changing anything in the parameter block.

## The coin acceptor

JY-133A class: drop-insert comparable selector, yellow faceplate, flip cover, four
long bolts and nuts in the box. Not a CH-926, which is a different, larger unit.

There is no published drawing for it, so the faceplate and bolt spacing were
measured off the product photographs and cross checked against the 65 x 123 mm
front size that is published across this family:

| | |
|---|---|
| Faceplate | 67 x 123 mm, sits OUTSIDE the panel |
| Its four bolts | 51.5 x 103 mm, 7.8 mm in from the faceplate edge |
| Coin range | 22 to 28 mm diameter, 1.7 to 2.2 mm thick |
| Supply | 12 V |

The photo measurement is good to a couple of millimetres, no better. Everything
acceptor specific therefore lives on `coin_plate`, a 99 x 155 adapter that bolts
over a plain 60 x 112 window in the front panel. Its four bolt holes are 12 mm
slots. Guess wrong and you re-cut one small part, not the front of the machine.

The tight number is the 3.45 mm of ply between each bolt slot and the body cutout.
That is what the part geometry dictates, not a choice: the bolts are 51.5 apart with
the mech body between them. If your body is wider than 45 mm the adapter needs
rethinking, so measure it.

Rejected coins come out of the bottom of the faceplate, on the FRONT. The cup is
therefore hung on the outside of the panel under the acceptor, and the front panel
has no return opening at all. The acceptor also moved to x -95 so the cup clears the
delivery door by 15 mm.

## Measure these before you cut anything
## Kerf

Cut with kerf compensation OFF. Outlines are nominal. Parts come out about
0.15 mm small, which is the gear backlash and the slip fit this design wants.
Do not correct it.

## Stock

Sheets are nested by the viewer, not placed by hand. The old hand-placed sheets had
parts overlapping each other. Open the Cut sheets tab, set your bed size, press
Re-nest, and export DXF or SVG per sheet.

At 600 x 400 that comes to 10 sheets of 6 mm ply plus 1 of 3 mm acrylic, packed
largest first with every part free to turn 90 degrees, 4 mm between parts and a
6 mm edge margin. Pre-exported copies at that size are in the sheets folder.

Four parts set the minimum bed: front_upper and back_upper at 269 x 390, and the
two upper side panels at 222 x 390. Anything under about 400 mm in one direction
will not take them, and the viewer says so rather than dropping them silently.

Every sheet fits a 600 x 400 bed. Largest is sheet 1 at 590 x 393.

## Hardware

| Qty | Item | Where |
|---|---|---|
| 1 | M8 x 110 bolt, plain shank, plus nut and two washers | rotor axle |
| 8 | M4 x 70 bolt, nut, two washers | rotor tie rods, 4 at r11 and 4 at r70 |
| 1 | M8 steel washer, 1.6 mm | rotor thrust face, on top of the acrylic washer |
| 8 | M4 x 30 bolt, nut | side panel to deck tee slots |
| 16 | M4 x 20 bolt, nut | splice plates across the z=306 seam |
| 6 | M4 x 16 countersunk | deck lamination, r88 ring. Countersunk matters: the rotor clears the deck by 4.6 mm |
| 4 | M4 x 16 bolt, nut | motor plate to deck |
| 2 | M3 x 8 | 28BYJ-48 ears to motor plate |
| 4 | M4 x 20 bolt, nut | coin adapter plate to front panel |
| 4 | M4 | acceptor to adapter plate, through the 16 mm slots |
| 2 | M3 x 12 | acrylic door flap hinge |
| 8 | M3 x 8 | window retainers |
| - | Wood glue | every tab joint except the seam, which is bolted so the machine splits in two |

## Electronics

| Qty | Item | Notes |
|---|---|---|
| 1 | Coin acceptor, CH-926 / 133A class | accepts 22 to 28 mm coins, 1.7 to 2.2 mm thick |
| 1 | 28BYJ-48 stepper, 5 V | 4075.7728 half steps per output revolution |
| 1 | ULN2003 driver board | the one that ships with the motor |
| 1 | ESP32-C3 SuperMini | mounts on the electronics plate, sheet 11 |
| 1 | 12 V 2 A supply | the acceptor wants 12 V |
| 1 | Buck converter, 12 V to 5 V, 1 A | motor and board |

Wiring:

- Acceptor red to 12 V, black to ground.
- Acceptor COIN line is open collector. Pull it up to 3.3 V with 10k and read it
  on a GPIO. Share grounds with the ESP32 or you will read nothing.
- The acceptor pulses once per credit at roughly 20 to 100 ms. Debounce in
  firmware, do not trust the rising edge alone.
- ULN2003 IN1 to IN4 on four GPIO, VCC to 5 V, ground shared.
- One vend is 4075.7728 half steps at whatever rate you pick. 1000 half steps per
  second is about 4 seconds per vend and is well inside the motor's torque curve.

## Assembly order

1. Laminate the rotor. Stack all 9 discs on the M8 bolt with the pockets lined up,
   glue between every layer, run the 8 tie rods, clamp, let it cure overnight. Do
   not skip the glue; the tie rods alone will let the layers creep.
2. Base plate, lower deck and upper deck onto the side panels dry. Check the deck
   tabs seat fully before glue.
3. Motor plate onto the upper deck with the ears facing up and the body hanging
   down through the two 30 mm deck bores. The 28BYJ-48 shaft only stands about
   10 mm above its flange, which is why the plate sits on top rather than under.
4. Rotor onto the axle, acrylic washer and steel washer underneath. Spin it by
   hand. It should turn freely with a little end float.
5. Pinion onto the D shaft. Check the mesh before the ceiling goes on, because
   afterwards you cannot reach it.
6. Ramp and rails, then the ceiling plate.
7. Funnel: back face first, it is a plain vertical panel and everything else laps
   onto it. Then left and right, then front. Each leaning panel has two feet into
   the ceiling and two heads through the wall.
8. Front and back panels, roof, acrylic, door.
9. Coin adapter and acceptor last.

## Numbers worth knowing

| | |
|---|---|
| Capsule | 50.8 mm |
| Funnel mouth | 58 mm square. The ceiling throat is this exact square, not a circle inside it |
| Pocket bore | 62 mm on a 95 mm circle, four at 90 degrees |
| Exit | 66 mm |
| Drum | cage, 54 mm tall: two toothed discs at OD 195, one equator ring at 170, one top disc at 184, eight posts |
| Gear | 76 tooth, module 2.5, 6 mm face on the laminated toothed pair |
| Funnel mouth | 156 mm, 3.07 capsule diameters |
| Hood | ceiling solid from 0 to 180 degrees, covering the exit |
| Pinion | 19 tooth, OD 52.5, centre distance 118.75 |
| Ratio | exactly 4:1, so one vend is exactly one motor revolution |
| Funnel rake | front 47.9, left 48.0, right 60.9 degrees |
| Torque | about 0.025 Nm needed at the rotor against roughly 0.08 available |

## Why the drum is a cage

The drum is 54 mm tall because it is a capsule WELL, not because the gear needs the
height. At 3 mm stock a solid stack would be eighteen 195 mm discs, 2.85 sheets of
ply for one part.

It is four discs and twelve spacers instead: a toothed pair at the bottom for the 6 mm
gear face, one ring at the capsule equator, a top disc for the capsules to rest on,
and twelve tangential spacers in the rim holding the spacing. Still about 0.65
sheets against 2.85, so roughly 2.2 sheets saved.

That works because only one ring is actually doing the locating. A capsule is held
by whichever ring is nearest its equator, and the equator ring sits at local 19 to
22 with the equator at 20.8. Drift is 5.60 mm, which is identical to a solid drum
and inside the 7.6 mm the exit hole allows. The other discs are structure and
resting surface, not location.

The spacers sit in the OUTER RIM, not in the web between pockets. That web is only
5.2 mm wide at its waist, so the earlier radial slots through it left 0.94 mm of ply
either side, which is not a part, it is a crack. The rim runs 78.5 to 91.875 all the
way round: 13.4 mm of continuous material. Slots there leave 4.85 mm inboard and
4.4 mm outboard.

Spacers are tangential, one per gap, six per tier, and the two tiers are staggered
half a pitch. Stacked on the same angle both tenons wanted the same 3.3 mm slot in
the equator ring and only one fits. Staggered, the ring carries twelve slots at 30
degrees with 26 mm bridges between them.

Each spacer is a plain tenon, shoulder, tenon: it seats on the disc below and the
next disc seats on it. No stepped widths and nothing to thread past, so it goes
together bottom up and the tenons are locating tabs in plain slots, glued.

| tier | seats on | spans | carries |
|---|---|---|---|
| A, 6 off at 0, 60, 120... | toothed pair | 13 mm gap | the equator ring |
| B, 6 off at 30, 90, 150... | equator ring | 29 mm gap | the top disc |

Shoulders give 3 mm of bearing either side of an 18 mm tenon.

## How the metering actually works

There is no narrow throat. The ceiling has a wide 156 mm opening over the whole
fill half of the rotor, and a HOOD, the solid half of the ceiling from 0 to 180
degrees, covering the exit side. Capsules fall freely onto the rotor face, drop
into whichever pocket is under them, ride round beneath the hood and fall out the
exit. The pocket is the only thing that meters, which is how a real gashapon works.

Both halves of that matter. Without the wide opening, capsules arch. Without the
hood, the pocket sitting on the exit is refilled from above and the machine hands
out the whole hopper for one coin.

## Four things the simulator caught, so you do not have to

A 62 mm round throat under a 76 mm square mouth leaves a 7 mm ledge, and a capsule
parks on that ledge permanently.

Placing the funnel panels by their mid planes rather than their inner faces pulls
the opening in by about 4 mm a side, turning 58 mm into 49.9 mm under a 50.8 mm
capsule.

A 58 mm mouth is 1.14 capsule diameters. Spheres bridge across anything under two
diameters, and it did: six trials, mean 5.5 of a possible 13 vends, worst case 2.
This is why the mouth is now 156 mm, which is 3.07 diameters.

A 24 mm rotor is dimensionally fine, the pocket wall reaches the capsule equator
and holds it to 5.64 mm against the 5.60 mm of a 54 mm rotor. It still fails,
because the 54 mm rotor puts its moving face 1.9 mm under the mouth where it can
shear an arch, and the 24 mm one leaves that face 23 mm away.

Placement note: a baked outline carries the origin its SCAD module was drawn about,
which is not always the panel origin. The window is drawn from its own corner, the
coin adapter plate and the drawer face about their centres. Those three, plus the
door flap, landed in the wrong place when they were first swapped over to baked
outlines. `placecheck.mjs` now confirms each one brackets the opening it closes.

The funnel head tabs deliberately stand about 3 mm proud outside the side and front
walls. That is a wedge point, not an error.

Viewer note: every panel in the 3D view and the cut sheet tab is extruded from an
outline baked straight out of slug.scad, not rebuilt in JS. It used to be rebuilt,
and it drifted: the ceiling was handed twelve hole paths that overlapped the throat
opening, three.js gave up triangulating, and the hopper opening never got cut at
all. Thirteen parts disagreed with their cut files at that point. There is one
source of truth now, and all 33 baked parts triangulate to their exact cut area.

Solver note: the capsules in the simulator are solved with one impulse pass plus
four position-only relaxation passes, and they spawn on a lattice. Before that they
spawned at random points and could start 47 mm inside each other, which blew the
pile apart on the first frame and pushed capsules through the plates. A capsule
that ended up under the drum face was also being snapped straight to the pocket
axis, up to 25 mm sideways through solid ply in one step; it now takes whichever
way out is nearer, sideways into the pocket or back up onto the face.

Current state: 126 of 128 vends across eight trials delivered exactly one capsule.
The two misses are both the first vend of a run, with the pocket starting empty.

## Known risks

- The foot slots in the ceiling open into the throat by 0.19 mm at their inner
  end. The feet still bear on solid plate outboard, which is the direction the
  funnel load acts, but do not widen those slots.
- The rotor rim between the pockets and the gear root is 13.4 mm. Fine in nine
  glued layers, thin in one.
- The rotor top clears the ceiling by 1.9 mm. If your ply runs thick, that gap
  closes. Check it before glue, and shim `z_ceil` if you need to.
- A capsule enters the pocket with about 5.6 mm of centring tolerance. Deburr the
  pocket bores.


## Where the coins go

Two paths, both real parts in the cut files.

Accepted coins drop out of the bottom of the acceptor onto a chute plate raked at
41.8 degrees, which carries them back and left into an open top cash box sitting on
the base plate. The chute is tabbed into the left side wall on one side and into a
coin wall on the other. The coin wall is a full depth vertical plate at x -65,
running from the base up to z 140, which is where it stops so it passes under the
acceptor body. It separates the coin compartment from the delivery chute and
stiffens the lower box.

The cash box is a DRAWER, 84 x 106 x 60. It slides straight out through an 88 x 72
opening in the back panel. Its own face, 92 x 84, is proud of the panel and carries
a finger pull; one lasercut turnbutton above it holds it shut. The chute discharges
10 mm above the drawer rim and 15 mm inside its mouth.

Rejected coins fall into a return cup behind a 60 x 38 opening in the front panel at
z 100 to 138, just under the coin slot. The cup is a floor plus two sides, tabbed
into the front panel.

The cup is open at the back. If your coins bounce out of it, add a lip; the chute
plate above forms a partial roof but nothing closes it off underneath.

## Where the electronics go

Flat on the base plate at x 45, y -66, behind the delivery ramp and to the right of
the coin wall. That whole quadrant is empty from the base up to the lower deck at
z 300, so there is 294 mm of headroom for the ULN2003 board, the ESP32-C3 and the
buck converter. The electronics plate has an M3 hole grid; the base plate carries a
matching pattern. Get to it by pulling the back panel, which is bolted, not glued.

## The stepper

28BYJ-48, 5 V, with the ULN2003 board it ships with. Dimensions used in the model:

| | |
|---|---|
| Body diameter | 28 mm, in a 30 mm deck bore |
| Body height | 19 mm |
| Mounting ear spacing | 35 mm, so 17.5 either side of the shaft |
| Shaft offset from body centre | 8 mm |
| Shaft diameter | 5 mm, flatted |
| Shaft length above the flange | 10 mm |
| Ear holes | M3 |

The shaft reach is the tight one. The flange lands on top of the motor plate at
z 318 and 10 mm of shaft takes you to 328. The pinion sits at 320 to 326, so there
are 2 mm to spare above and below it. Measure your motor's shaft before you glue
the motor plate down; some clones run short.

## Assembly order addition

The coin wall goes in with the base plate, before the lower deck closes the box.
It now sits at x -59, butted against the outer face of the left ramp rail, which
braces both.
It tabs into the base, the front panel and the back panel. The coin chute drops in
after both side walls are on, since it spans between the left wall and the coin
wall.
