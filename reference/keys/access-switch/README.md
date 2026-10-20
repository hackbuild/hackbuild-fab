# keys/access-switch

The access switch flagship (plan v9 section 6, release 1 "designs"): one
PIP click spring under a 56 mm round paddle, on a round PETG body with the
PIP buried stack, two leads to a PJ398SM panel jack. Every number below is
computed from the build and the profile rows, tier inferred where a profile
row is inferred, unless it says otherwise. Nothing here has been printed.

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
The input threshold of a switch interface (Xbox Adaptive Controller,
AbleNet or iPad switch adapters) is unknown here; a person reads one
device before the card claims the switch closes for it.

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

- Not sliced; no force has been on a gauge (unknown).
- The press band and the corner spread above are computed; the claim
  stays inferred until a reading from the thickness ladder coupon.

<!-- R1-flagship-access-switch-08: virtual slice -->
<!-- end R1-flagship-access-switch-08 -->

<!-- R1-flagship-access-switch-09: print card -->
<!-- end R1-flagship-access-switch-09 -->

<!-- R1-flagship-access-switch-11: coupon result and owner checklist -->
<!-- end R1-flagship-access-switch-11 -->
