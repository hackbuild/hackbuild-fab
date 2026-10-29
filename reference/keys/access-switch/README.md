# keys/access-switch

The access switch flagship (plan v9 section 6, release 1 "designs"): one
PIP click spring under a 56 mm round paddle, on a round PETG body with the
PIP buried stack, two leads to a PJ398SM panel jack. Every number below is
computed from the build and the profile rows, tier inferred where a profile
row is inferred, unless it says otherwise. Nothing here has been printed.
It is meant as an accessibility switch for an adapted toy or a switch
interface on its jack; whether a given device reads it closed is unknown
until a person tries one (The jack seat).

Location: `reference/keys/`, beside `keys/midi-pad`, so the reference
harness, `hbf parity` and its goldens apply as they do to the other
flagship.

| part | source | original of record | reference |
|---|---|---|---|
| spring, tip, cap, slot, pads, ribs | click-spring-key through `k.arch`, overrides l, t, Q, w and E | `originals/pip/files/haft-src/src/layout.js` clickerDims (lines 81 to 97), `model.js` lines 89 to 112 and 366 to 390, `snapfe.js` (pip.md 5.2) | buttons/click-spring |
| materials | PIP's four slots | `layout.js` lines 47 to 52 | buttons/click-spring |
| stack | profile stack rows | `layout.js` line 27 | electrical/pip-buried-route |
| body, rim, paddle | build.ts, new to this design (no original) | none | this reference |
| jack pads and body outline | jack.ts, the catalog row connectors/pj398sm | KiCad v5 `Jack_3.5mm_QingPu_WQP-PJ398SM_Vertical_CircularHoles.kicad_mod` | packages/catalog |
| jack bore | jack.ts, stacked three-layer prisms, half chord on the circle | `originals/baffle-r3/files/src/model.js` lines 110, 124, 593 to 596, 635 to 639 | none |
| jack body depth | profile `jack.bodyDepth` | `originals/kerf-eurorack/files/kerf-eurorack.html` line 1634 | none |
| leg sockets | jack.ts, PIP's printed socket | `layout.js` line 39, `model.js` lines 204 to 205 and 593 to 595 | seats/rp2040-zero-pressfit |
| R.leads, R.closed | jack.ts and build.ts | `model.js` lines 453 to 460 and 481 | none |

## The spring point

Span 28 mm and beam 0.55 mm (PIP draws 24 and 0.55), rise Q 2.0, width
1.6, E the PETG `modulusMPa` row read through `k.profile.material` (1900
MPa, a working value, tier inferred). Through packages/sim the spring
reads peak 1.552 N (158 g at standard gravity), drop 0.765, contact
travel 1.369 mm, strain at the stop 1.67 percent against the 2.5 percent
PETG click row (all computed). The span 24 point reads 2.527 N; the
reference test holds the default inside 1.3 to 1.8 N and fails at span 24.
A 0.05 mm beam error moves the peak from 108 g to 224 g (computed, scout
sweep), so the force claim waits on the thickness ladder coupon.

## The press claim

`claim.ts` holds the drawn peak to a target band, the stopgap for the
engine function claims; build.ts emits the band as metrics
`claim.press.targetN`, `claim.press.lo` and `claim.press.hi`, and
`test/claim.test.ts` runs the five corners through packages/sim and
writes the block below (R1-flagship-access-switch-04).

<!-- generated: press claim; paste the block the claim test prints when it fails -->

Claim `press.peak`, tier inferred, unproven until coupon. Band 1.176 to 1.764 N
(120 to 180 g), target 1.470 N (150 g) plus or minus
20 percent, from `access.pressTargetN` and `access.pressBandPct` (profile, inferred;
the band edges computed). Drawn peak 1.552 N (158 g, computed), in band.

Each corner moves one input alone: beam thickness by `click.beamPrintErrorMm`
0.05 mm, modulus by `click.modulusSpreadPct` 20 percent (profile,
inferred), through packages/sim clickRigid and clickReadout at span 28, rise 2,
width 1.6, shuttle 3 (all peaks computed, grams at standard gravity):

| corner | t mm | E MPa | peak N | peak g | band |
|---|---|---|---|---|---|
| drawn | 0.55 | 1900 | 1.552 | 158 | in |
| t minus | 0.50 | 1900 | 1.062 | 108 | out |
| t plus | 0.60 | 1900 | 2.195 | 224 | out |
| E minus | 0.55 | 1520 | 1.242 | 127 | in |
| E plus | 0.55 | 2280 | 1.863 | 190 | out |

Spread 1.062 to 2.195 N (108 to 224 g, computed)
leaves the band, so the claim stays inferred until a person
enters a reading from the thickness ladder coupon.

<!-- end generated: press claim -->

## Body and paddle

- Body: a 62 mm disc (paddle diameter plus two walls) to host.top 13.68 mm,
  the spring's need snapped up a layer, and a 3 mm rim from there to 19.21
  mm, the cap top snapped up a layer. The rim bore is the paddle diameter
  plus `access.paddleGuideClr` 0.4 mm diametral (profile, inferred). No
  CHK-FIT row covers this guide; metric `paddle.guideClr` carries it.
- Paddle: a PETG revolve printed plate down beside the body: plate 3.13 mm,
  skirt 3 mm thick to 12.01 mm, a central boss of the cap stem radius that
  rests on the TPU cap. Every paddle face is a layer top.
- Stop: at rest the skirt edge sits 1.56 mm over the body top (metric
  `paddle.travel`), the contact travel plus `click.stopOvertravel` 0.3 mm
  (inferred) snapped down a layer, so the skirt stops the paddle past
  contact and no later than the travel eStop is read to.
- Preload: the paddle weighs 15.926 g solid (metric `paddle.massG`, PETG
  density 1.27 from profile, inferred; infill lowers it, unknown). Its
  weight, 0.156 N at standard gravity (computed), rests on the spring. The
  peak above does not subtract it.
- Leads: as buttons/click-spring, on trace layer 1, one straight lead per
  net from the key's routed post to a jack socket: KEY to T, GND to S.

## The jack seat

`jack.ts` (R1-flagship-access-switch-06) sets a PJ398SM 3.5 mm mono panel
jack (catalog row `connectors/pj398sm`) in the -y side wall, axis along
-y, its pads along x at the axis height: the jack lies a quarter turn
about its axis from the KiCad top view, a turn and never a mirror. The
build sandbox cannot read the catalog, so jack.ts copies the pad table and
the F.Fab outline, and the reference test holds them equal to the row
loaded from the committed footprint.

- Bore: `jack.boreD` 6.2 mm through `jack.panelT` 3.6 mm of PETG on the
  axis (BAFFLE R3's jack, profile, inferred). Below the axis it is BAFFLE's
  stack of three-layer prisms whose half chord follows the circle; above
  the axis it runs straight up through the rim, so the jack and its legs
  drop in from the top before the paddle goes on. The body is round, so
  the wall the nut clamps thins off the axis to about 2.6 mm at the S lug
  (computed).
- Pocket: the F.Fab body outline and the S pad, `jack.clr` 0.3 mm each side
  except the front face, `jack.bodyDepth` 11 mm along the axis (KERF's
  drawn jack body, inferred; the PJ398SM depth is not in the row, unknown).
  The jack axis sits at 8.83 mm, its top 0.35 mm under the body top where
  the paddle skirt stops (computed).
- Legs: S and T each drop into a cPLA socket: a slot the pad drill wide
  (1.22 and 1.43 mm, community) between two `jack.socketWall` 0.525 mm
  walls, `jack.socketLen` 3.0 mm along the leg, on a column down to trace
  layer 1. `jack.legDepth` 3.0 mm meets `seat.socketPinMin` 2.0 mm (PIP,
  inferred) only if the leg reaches that far past the body; the PJ398SM
  leg length and section are not in the row (unknown), so the grip is
  unknown until a jack sits in a print. TN has no socket, only a PETG
  clearance slot.
- Resistance, PIP's readout: per net the lead along trace layer 1, the
  key's terminal post and the socket column through the layers, at the
  Yousu cPLA rows 500 ohm cm along and 2000 through (profile, inferred).
  Lead T 14.97 mm reads 74.3 kohm, lead S 15.39 mm 76.4 kohm, each key
  post 38.6 kohm, the T and S columns 19.4 and 21.9 kohm (all computed).

At defaults R.leads 269148 ohm, key.R.switch 9952 ohm and key.R.pads
14324 ohm give R.closed 293423 ohm pressed, T to S (all computed, tier
inferred; the reference test holds this line to the build). The legs in
their printed sockets add a contact resistance no profile row covers
(unknown).

## What the contacts can drive

A 3.5 mm switch jack meets two device classes (R1-score-05). build.ts
compares R.closed with each class ceiling, emits metrics
`drive.input.ceilOhm`, `drive.input.pinFrac` and `drive.toy.ceilOhm`,
and warns DRIVE naming each class it cannot drive; the print card carries
one line per class.

- Switch interface input with a pullup (Xbox Adaptive Controller, AbleNet
  or iPad switch adapters): profile `access.drive.input.pullupOhm` 50
  kohm, the BLOCKS sim pull, and `access.drive.input.lowFrac` 0.3, the
  BLOCKS undefined band edge (both inferred; no switch interface datasheet
  on record gives its pullup). The ceiling is 21429 ohm (computed); at
  R.closed the pressed pin sits at 85 percent of its supply (computed), so
  the input reads it as not pressed. The real pullup of a device is
  unknown; a person reads one device before the card claims it closes.
- Adapted toy or battery interrupter, the motor current through the
  switch: profile `access.drive.toy.ceilOhm` 1.5 ohm (two AA cells, 0.2 A,
  10 percent lost in the switch, inferred). Through R.closed the toy will
  not run (computed).
- Fix, named and not drawn: a metal contact, copper tape over the floor
  pads or a microswitch seat. The printed geometry stays as drawn; the
  swap is an owner call (default: warn and name the swap).

circuit.solve and the build price different paths. circuit.solve reads
KEY 4933 ohm and GND 4933 ohm (computed): each net from the key's port
feature through the 0.74 mm seat under its pad, the only terminal it has,
and it warns TAP_NO_LEAD on both ports because the jack sockets carry no
port feature, so it never walks the leads. R.closed walks socket T to
socket S through both leads, both posts, both pads and the switch, the
path the plugged device sees; it is the figure for the closed path, and
the circuit.solve figure is not a T to S value.

## Deviations, each named

- No hookup: the switch carries no MCU, and the tip prints apart from the
  body, so no contact feature names it (M06-T08 finding). The proof is the
  `apart` assertion on KEY and GND plus `key.R.switch`.
- No bezel plate: PIP's bezel holds the spring end blocks down ("under the
  bezel" fits row). Here the ribs and the snug slot locate them and nothing
  holds them down (unknown until the coupon).
- Off-centre presses on a 56 mm paddle tilt it in the bore and add friction
  to the felt force (unknown until the coupon).
- CHK-PRT-05 warns on the cap face at 5.40 mm, as for buttons/click-spring.

## What is verified, and what is not

### Verified on this machine

- 2026-10-21 (R1-score-02): `npx --no-install hbf parity reference/keys/access-switch`
  exits 0 at build 7f1878..79 against the goldens re-accepted when the
  key/flex-gap constraint def registered contact.gap and moved
  registryHash; every mesh hash and volume is unchanged and the report
  does not move (computed).
- 2026-10-21 (R1-fix-19): `npx --no-install hbf parity reference/keys/access-switch`
  exits 0 at build c4188b..4f against the goldens re-accepted when CHK-KEY-05
  went to 2.0.0 and moved registryHash; every mesh hash and volume is
  unchanged and the report moves only by that check (computed).
- 2026-10-20 (R1-fix-01): `npx --no-install hbf parity
  reference/keys/access-switch` exit 0 at build 90e387..5c, all four
  goldens equal (computed). The goldens were accepted at this build after
  the jack seat moved the body mesh (commit 5c1db0e, D-397); the first
  accept was at 88a134..57 (R1-flagship-access-switch-02).
- 2026-10-20 (R1-fix-01): `npx vitest run reference/keys/access-switch`
  passes 21 of 21 tests; the README press claim block equals the run.

### Measured on a printed body

- none

### Checked by machine, on geometry rather than hardware

- 2026-10-20 (R1-fix-01): `npx --no-install hbf check.run
  reference/keys/access-switch` exit 0 at build 90e387..5c: 0 fail, 1 warn
  (CHK-PRT-05, body face at 5.40 mm off the 0.24 mm layer grid), 47 pass,
  55 skip (computed).

### Not verified by anything

- No force has been on a gauge (unknown). The slice below is virtual.
- The press band and the corner spread above are computed; the claim
  stays inferred until a reading from the thickness ladder coupon.

<!-- R1-flagship-access-switch-08: virtual slice -->

## Virtual slice

2026-10-20, preset default, a simulated print through `tools/slice/slice.mjs`
and `tools/py/gcode/analyze.py`; evidence and `SLICE.md` in
`fab-knowledge/evidence/virtual-print/2026-10-20-access-switch/`. Every figure
is computed from the G-code and the meshes unless it says measured. Nothing
was printed.

- Run: `sliced: exit 0, 5592 ms wall (measured)`, Orca-Flashforge 2.3.2, fresh
  datadir, checks worst warn with 0 failed. TPU slots sliced with the
  "Generic TPU-95A @FF C5P" stand-in (D-238, inferred). analyze.py exit 0
  wrote `slice.json`.
- Beam road check: pass. The four spring beams get one road each on every
  layer 0 to 6, road cover 1.000 of the beam section and no gap along the
  beam (computed). `detect_thin_wall 1` is on the object; the process keeps
  the classic wall generator.
- The G-code plans the beam road 0.587 to 0.601 mm wide against the drawn
  0.55 mm (computed). At 0.60 mm the press claim reads 2.195 N, 224 g, out of
  band (computed), so the claim stays inferred until the thickness ladder
  coupon.
- Plate: body, paddle, cap and tip each deposited; 0 regions of a body
  printed by another tool; the two cPLA nets stay apart and both leads reach
  their columns (computed).
- Finding: the bundled process fills `brim_type auto_brim`, and the slicer
  lays a 2143 mm2 brim on layer 0 around body and paddle in the cap's TPU 95A
  (computed). A TPU brim on PETG is hard to peel (inferred). Queued as a
  writer fix; until then, turn the brim off in the slicer.
- The centre shuttle's two small feet get no road on layer 0 (0.74 mm2
  each, computed).
- Slicer estimate: 1h 34m 29s, 36.75 g in all (PETG 32.13, cPLA 1.98, TPU
  95A 2.20, cTPU 0.44 g), 71 tool changes (computed).

<!-- end R1-flagship-access-switch-08 -->

<!-- R1-flagship-access-switch-09: print card -->

## Print card

Generated by `test/card.ts` from the build, the 3MF bytes the writer makes
in process and the chase; `test/reference.test.ts` fails when this block
and the build disagree. Nothing in it was measured, and no export was run.

<!-- generated: print card; rewrite with HBF_ACCEPT=1 npx vitest run reference/keys/access-switch -->

- design: keys-access-switch, preset default, machine ffc5p
- file: out/access-switch-default.3mf, 60910 bytes, sha256 78cc757267c786a75f54e6d43603e27ee9b50b9f0c4d8fe0c3d11017ec4d2b96 (computed from the writer bytes in process; no export was run)
- artifact hash (hbf): a3a594b39517d9ae11d08cf8124ea056052296f1fb6dd46e3db6eb8f9ddec2c9
- write it, a person at the export gate: `SOURCE_DATE_EPOCH=315532800 npx --no-install hbf export.run reference/keys/access-switch --kind 3mf --preset default --out reference/keys/access-switch/out/access-switch-default.3mf` (the epoch is pinned; unset, it follows the HEAD commit time and the bytes move)
- build: 3e8178947f4a0d24fcb7e117d660e3bfb5858874151e6afca02fd7b83b535e13
- slicer: Flashforge Creator 5 Pro 0.4 nozzle, process 0.24mm Standard @FF C5
- plate: Textured PEI Plate
- layer grid: ffc5p_20260819, first layer 0.25 mm, then 0.24 mm (profile)
- per-object settings in the file (M05-T20): object access-switch interlocking_beam 0; object access-switch detect_thin_wall 1; sparse_infill_density 100% on tip, traces click-spring-key.0.conductor.pad, traces click-spring-key.0.conductor.padCommon, traces click-spring-key.0.conductor.post, traces click-spring-key.0.conductor.disc1, traces click-spring-key.0.conductor.disc2, traces click-spring-key.0.conductor.postCommon, traces click-spring-key.0.conductor.disc1Common, traces click-spring-key.0.conductor.disc2Common, traces conductor.socketS, traces conductor.socketSWallA, traces conductor.socketSWallB, traces conductor.leadS, traces conductor.socketT, traces conductor.socketTWallA, traces conductor.socketTWallB, traces conductor.leadT; the Flash Studio CLI applies these keys from model_settings.config (computed, M05-T20 headless probes), the GUI is not run, so confirm each in the slicer object list before slicing
- brim: the file sets none, and the bundled process fills auto_brim, which the virtual slice laid in the cap's TPU 95A around body and paddle (computed, see Virtual slice); turn the brim off before slicing
- press: target 1.47 N (150 g), band 1.176 to 1.764 N (120 to 180 g, inferred), drawn peak 1.552 N (158 g, computed at drawn geometry); unproven until a person enters a thickness ladder coupon reading
- R.closed: 293423 ohm pressed, T to S (computed, tier inferred); the legs in their sockets add a contact resistance (unknown)
- switch interface input (Xbox Adaptive Controller, AbleNet or iPad switch adapter): ceiling 21429 ohm (computed from the inferred profile pullup), the pin sits at 85 percent of its supply pressed (computed); it cannot drive this; swap the printed contact for a metal one, copper tape over the floor pads or a microswitch seat; the real pullup of your device is unknown, so read one device before you trust it
- adapted toy or battery interrupter carrying motor current: ceiling 1.5 ohm (inferred); it cannot drive this; swap the printed contact for a metal one, copper tape over the floor pads or a microswitch seat

| slot | material | role | label | slicer type | slicer filament | colour |
|---|---|---|---|---|---|---|
| 1 | petg | body | body and paddle | PETG | Generic PETG @FF C5P | #F4F1EA |
| 2 | cpla | conductor | traces | PLA | Generic PLA @FF C5P | #1A1A1A |
| 3 | tpu95 | flex | cap | TPU | Generic TPU @FF C5P | #FE0386 |
| 4 | ctpu | flex-conductor | tip | TPU | Generic TPU @FF C5P | #6E6E6E |

| object on the plate | slot | parts |
|---|---|---|
| access-switch | 1 | body, click-spring-key.0.rib, click-spring-key.0.ribBack, click-spring-key.0.spring, paddle |
| access-switch | 2 | click-spring-key.0.conductor.pad, click-spring-key.0.conductor.padCommon, click-spring-key.0.conductor.post, click-spring-key.0.conductor.disc1, click-spring-key.0.conductor.disc2, click-spring-key.0.conductor.postCommon, click-spring-key.0.conductor.disc1Common, click-spring-key.0.conductor.disc2Common, conductor.socketS, conductor.socketSWallA, conductor.socketSWallB, conductor.leadS, conductor.socketT, conductor.socketTWallA, conductor.socketTWallB, conductor.leadT |
| access-switch | 3 | cap |
| access-switch | 4 | tip |

| jack lug | plug contact | net | socket |
|---|---|---|---|
| T | tip | KEY | conductor.socketT |
| S | sleeve | GND | conductor.socketS |

Assembly:

1. let the plate cool and peel the body, the paddle, the spring with its grey tip, and the cap; they print apart on one plate.
2. drop the spring into its slot standing on edge, grey conductive tip down toward the two floor pads. the groove in each end block drops over the rib on the slot floor; wiggle it until it seats, it should not need pushing. upside down it will not click. loose in the slot the arch flattens and does not snap.
3. drop the cap into its well, flange down, onto the spring stem.
4. drop the jack in from the top, bushing out through the hole in the 3.6 mm wall, the T and S legs into the two cPLA sockets, and run the nut on from outside. whether the bushing thread clears that wall is unknown.
5. set the paddle on, plate up, skirt down into the rim bore; it rests on the cap.
6. plug a mono 3.5 mm cable from the jack to the device's switch input and press the paddle.

Use policy: USE.md at the repository root (plan v9 section 5); the file is not written yet.

<!-- end generated: print card -->

<!-- end R1-flagship-access-switch-09 -->

<!-- R1-flagship-access-switch-11: coupon result and owner checklist -->

## Coupon

Every force in this README is computed until the block below holds a
coupon reading. The print card above is for the switch; the spring
coupon (`coupon/`) has its own card and the owner's steps in
[COUPON.md](COUPON.md): export, Flash Studio checks, print, then per rung
calipers on the beam, a kitchen scale press, coins in a cup and one word
(too soft, right or too stiff). The rung marked right sets the default
beam `spring.t`; a person enters the reading, and an agent only proposes
the change it implies.

### Coupon result

- none yet

<!-- end R1-flagship-access-switch-11 -->
