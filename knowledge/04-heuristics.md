# Heuristics

These feel like judgment but mostly decompose into a computable TRIGGER plus
a stored CONSEQUENCE. The work is finding the trigger. If you can name the
condition that makes a heuristic fire, it becomes a check. If you cannot, it
stays prose and the model reads it as context.

Each entry below is written as: trigger, consequence, status.

## Optics

- TRIGGER: an optic sweeps a range of angle of incidence wider than a few
  degrees, or the source is polarised.
  CONSEQUENCE: reject dielectric mirrors. They are designed for one AOI and
  one polarisation. DETENT mirrors sweep 45 +/- 9 and diodes are polarised.
  STATUS: computable. AOI range is known from the kinematics.

- TRIGGER: a mirror specified for CO2 is used in the visible band.
  CONSEQUENCE: reject. Molybdenum is 55 to 60 percent in visible, worst at
  blue. Front surface glass with enhanced aluminium instead, same 20 x 3 so
  no geometry change.
  STATUS: computable from a material and wavelength pair.

- TRIGGER: 405 nm proposed as the blue channel of an RGB combiner.
  CONSEQUENCE: reject. Eye response is 0.0008 at 405 against 0.038 at 450.
  Green must be a 520 direct diode, not 532 DPSS. 638 over 650. Roughly
  1.8 blue : 1.0 green : 1.2 red optical power for neutral white.
  STATUS: computable from the photopic curve.

- TRIGGER: identical laser arrays proposed for incoherent beam combining.
  CONSEQUENCE: reject. The etendue limit means combining identical arrays
  does not raise brightness.
  STATUS: computable.

- TRIGGER: a cooling change proposed to raise laser efficiency.
  CONSEQUENCE: sub-ambient cooling buys thermal ROLLOVER HEADROOM, not
  efficiency. And chiller capacity derates about 3 percent per kelvin of
  setpoint depression.
  STATUS: computable from the derate curve.

## Mechanical

- TRIGGER: a radial screw is proposed at a pitch where no driver can reach.
  CONSEQUENCE: use eccentric bushings instead of set screws. At 18 mm module
  pitch, bushing bore 0.55 off centre, two per module 26 mm apart, gives 42.3
  mrad of aim range.
  STATUS: this IS the driver-reach check. Fully computable.

- TRIGGER: a printed pin or hinge shaft would carry load across its layer
  lines.
  CONSEQUENCE: use drawn stock. A filament rivet has no layer lines across
  the shaft. Documented hole sizes: 1.95 real is friction, 2.0 to 2.1 turns
  freely.
  STATUS: computable from print pose plus load direction.

- TRIGGER: a stub or boss is moulded onto the face of a thin plate and
  carries load on a cantilever.
  CONSEQUENCE: make it a separate PRESSED part passing THROUGH the plate with
  a head behind it. This answers "will it break" and "will it print" at once,
  and it fixes the print pose too.
  STATUS: computable as an aspect-ratio plus bond-area rule.

- TRIGGER: two parts at a FIXED pitch both want the same space.
  CONSEQUENCE: move the one that CAN move. Widening a deck cutout to clear a
  32.2 mm flange would have left 0.8 mm between adjacent columns at 34 pitch;
  lifting the servo 3 mm solved it outright.
  STATUS: prose. The trigger is nameable but the resolution is a search.

- TRIGGER: two tight guides on one sliding rod.
  CONSEQUENCE: they fight each other. Make ONE precise and let the other
  clear.
  STATUS: computable as an over-constraint detector.

- TRIGGER: a part needs to feel solid and clearance alone is being tuned.
  CONSEQUENCE: fit alone does not determine how solid something feels. The
  number of guides and the SPAN do. A bar 200 mm long with six lugs in six
  slots cannot turn clearance into lean; one 3 mm rod in one slot turns all
  of it into lean times the lever arm. The LAND is worth about 3x the
  clearance and costs nothing in how freely it slides.
  STATUS: computable. Lean = clearance / land, times the lever arm.

- TRIGGER: an allowance is being sized as a running fit on an axis where
  nothing actually slides.
  CONSEQUENCE: it is not a running fit. Running out of it CLIPS travel rather
  than jamming, so it can go far below a fit floor. OGEE's along-rod face
  allowance went to 0.20 on this argument while the across-rod axis stayed at
  0.55.
  STATUS: computable if the motion model declares which axes move.

- TRIGGER: a rotary element needs three terminals out of one edge on a single
  conductive layer.
  CONSEQUENCE: put the gap in the arc directly over the terminals so the
  centre lead comes straight down through it; make the collector a FULL ring
  (it is one node, it needs no gap); let track ends escape RADIALLY to a lane
  outside everything, then arc the SHORT way on their own side. A straight
  chord cuts the collector.
  STATUS: computable as a routing constraint.

- TRIGGER: a LINEAR pot is asked for all three terminals at one end on a
  single layer.
  CONSEQUENCE: impossible. Any lead from the track's far end crosses the
  collector rail. Real single-sided slide pots take the far terminal out of
  the far end.
  STATUS: computable, and it is a planarity proof.

- TRIGGER: radial budgets are being solved out of order.
  CONSEQUENCE: solve pad pitch, then escape lane, then disc diameter, in that
  order, or the pads and traces end up at different x.
  STATUS: computable as a dependency order.

- TRIGGER: a rigid wiper on a resistive track.
  CONSEQUENCE: it scratches the track off. The arm has to be a leaf spring.
  WEAR, not drift, is the real lifetime limit.
  STATUS: prose, but the leaf-spring requirement is assertable.

## Electrical

- TRIGGER: a ladder keypad with unequal ADC steps is proposed.
  CONSEQUENCE: equal SERIES resistors give equal steps, V_k = Vcc(N-k)/N with
  a pull down for no key. Equal-step PARALLEL ladders need an N-squared
  resistance ratio and cannot be printed.
  STATUS: fully computable.

- TRIGGER: a printed conductor carries amplifier or motor power.
  CONSEQUENCE: reject. Printed traces cannot carry amp power. 5V and GND to a
  class D amp are always soldered wires.
  STATUS: computable from current times resistance.

- TRIGGER: a class D amp shares a supply path with capacitive sensing.
  CONSEQUENCE: keep it off the sensing path.
  STATUS: prose, but assertable as a net-adjacency rule.

- TRIGGER: an N x M pad grid on ONE conductive layer routed to one edge.
  CONSEQUENCE: impossible. Make it a real two-layer mutual-capacitance matrix
  (rows under, columns over, dielectric island between), which is what real
  touch grids are.
  STATUS: computable.

- TRIGGER: lane pitch equals trace width plus clearance and a diagonal fan is
  proposed.
  CONSEQUENCE: the fan can never be separated. Order the assignment so the fan
  is MONOTONE, put terminals directly under their lane, or move to a per-edge
  column or radial ring.
  STATUS: computable.

- TRIGGER: a source impedance above roughly 100 kohm feeds an ADC.
  CONSEQUENCE: flag it. Fixes are 100 nF at the ADC, an op-amp follower, or a
  pull down at 20x the source R.
  STATUS: fully computable.

- TRIGGER: a wedge slider is drawn as triangles rather than trapezoids.
  CONSEQUENCE: the A/(A+B) ratio pins to 1.0 and 0.0 at the ends. Use
  trapezoids and check the span stays inside roughly 20 to 80 percent.
  STATUS: fully computable.

- TRIGGER: an arc slider and a straight slider in the same instrument.
  CONSEQUENCE: the arc reports an ANGLE and the straight reports a DISTANCE.
  Scale each output separately or they feel different. Scale each arc's CC by
  its own radius if they should feel matched.
  STATUS: computable, belongs in the generated firmware notes.

- TRIGGER: a strapping pin is used for a signal.
  CONSEQUENCE: check the boot state. GPIO2 on a C3 with a 10k to 3V3 holds
  high at reset; GPIO8/9 are safe with I2C pull-ups since I2C idles high;
  GPIO21 strobes the boot log.
  STATUS: fully computable from a per-MCU strapping table.

## Fabrication strategy

- TRIGGER: a stated visual feature is being reproduced and a second thing is
  changed at the same time.
  CONSEQUENCE: when the user says preserve everything else, CHANGE ONE THING.
  STATUS: process rule, not a check.

- TRIGGER: three fixes in a row each create a new problem.
  CONSEQUENCE: go look up how the problem is normally solved, AND check
  whether the original was nearly right and one feature was carrying all the
  trouble. On the OGEE pivot pin, the split was the whole problem and
  everything downstream of it was invented complexity.
  STATUS: process rule.

- TRIGGER: a design needs many actuators and a shared-drive scheme is
  proposed to reduce them.
  CONSEQUENCE: check the cycle count first. On a 10x10 display, 20 actuators
  means 1 clear pull plus 10 row cycles per frame instead of 100. That factor
  of ten is the whole return, and smaller actuators buy nothing because the
  MECHANISM sets the pitch, not the servo.
  STATUS: computable.

- TRIGGER: a laser-cut design is being ported to a printed monolith.
  CONSEQUENCE: laser profiles join with CLEARANCE, which is right for a tab in
  a slot and wrong for a printed monolith. Unioning gives a non-watertight
  tray with the walls floating free of the floor. And `offset(delta=-0.075)`
  on each frame profile thins every tab and widens every slot in one
  operation.
  STATUS: fully computable.

- TRIGGER: a mixed cut and printed build.
  CONSEQUENCE: every interface needs to know WHICH PROCESS made each side. A
  single FIT_SLIP cannot serve both.
  STATUS: fully computable once the project model records process per part.

- TRIGGER: a part is being skeletonised or lightened.
  CONSEQUENCE: skeletonising works on the 2D PROFILE and CANNOT SEE anything
  that was never in the outline. Any 3D feature on an otherwise flat part is
  invisible to it (it silently threw away eight stop bosses). Check the z
  range of every skeletonised part against its full twin.
  STATUS: fully computable.

- TRIGGER: decorative holes proposed in a structural part.
  CONSEQUENCE: a bar chosen to be two laminated layers BECAUSE it must not sag
  has no business being lightened. Delete them.
  STATUS: prose.

- TRIGGER: a part grows a feature on one face.
  CONSEQUENCE: re-check its print pose. Minimal walls that gained hubs had the
  hubs pointing into the bed: 562 mm2 of bed and 4634 of overhang, flipped to
  5196 and zero.
  STATUS: fully computable, just re-run the orienter.

- TRIGGER: the print pose scoring wants a tie-break.
  CONSEQUENCE: bed contact first (a part that lifts is a failed print),
  overhang steeper than 45 second (support and a bad surface), height last
  (only time).
  STATUS: fully computable.

- TRIGGER: a tall part stands on a small footprint in its export pose.
  CONSEQUENCE: flip it onto its widest flat face even at the cost of
  overhang. TENON's handle, 163.4 mm tall, left the bench knob end down on
  6.7 mm2 of plate; the owner turned it over onto 56.3 mm2, took 369.8 mm2
  of overhang against 6.7, and still added a 2-layer raft (computed, owner
  save of 2026-10-05, `designs/tenon.md` section 5.9). A slope-only
  overhang audit passes the pose the owner rejected.
  STATUS: computable as bed contact area against height; the limit is
  unknown with one data point (draft CHK-PRT-17).
