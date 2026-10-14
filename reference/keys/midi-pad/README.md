# keys/midi-pad

A MIDI touch pad on one PETG body for the four-toolhead ffc5p: four flex
cone keys, a printed membrane fader and a press-fit RP2040-Zero seat, wired
on the PIP buried stack. Promoted from flagship 1 (`fab-knowledge:evals/2026-10-13/flagship-midi-pad.md`)
once a seated board pin could end a read path (finding K-04). Every number
below is computed from the build and the profile rows, tier inferred, unless
it says otherwise. Nothing here has been printed.

covers: [CHK-KEY-01, CHK-NET-06, CHK-NET-26, CHK-NET-27, CHK-NET-29, CHK-NET-46, command:circuit.solve, read:charge-release, read:adc]

| part | archetype | original of record | reference |
|---|---|---|---|
| keys x4 | flex-cone-key at PIP defaults | `originals/pip/files/haft-src/src/layout.js` flexDims, `model.js` lines 63 to 88 (pip.md 5.1) | buttons/flex-cone |
| fader | membrane-slider-thinpot, len 60 | `originals/thinpot/files/feeler_thinpot.html` archetype thinpot, lines 4022 to 4210 (thinpot.md 4.5) | sensors/membrane-slider-thinpot |
| board seat | rp2040-zero-seat, press mode, bumps | `model.js` lines 180 to 248, `layout.js` zeroPads (pip.md 5.7) | seats/rp2040-zero-pressfit |
| stack | profile stack rows | `layout.js` line 27 and lines 168 to 171 | electrical/pip-buried-route |

Body 103.807 x 33.78 mm, top 9.84 mm (the seat's pocket need snapped up a
layer), fader base 4.05 mm past the cable edge (layout metrics, computed).

## Seat pins as net taps

The seat declares each used castellation as a port with a tap
(`PortFeature.tap`, `spec/features.ts`): the bump the pin presses on, the
pin centre from the catalog row `rp2040-zero` placed by the seat frame on
the bump top, the row's MCU and pin name, and the clamp depth. circuit.solve
ends the net's read path at that bump and reads the pin on the row's MCU;
a hookup entry whose pin or MCU is not the seat's is left unsolved with the
reason. CHK-NET-46 measures the landing. So the flagship's four test leads
to the body edge and the `faderBed` copy of the fader plate are gone; the
fader leads are hosted in the fader base itself.

## Read paths, GP pin to key (circuit.solve, analytic, all computed, tier inferred)

Each key net, seat bump to key column (rows `cpla.pip.through` 2000 ohm cm
and `cpla.pip.along` 500 ohm cm, inferred; trace 1.4 x 0.72 mm):

| key | pin | chain | lane length mm | key net ohm |
|---|---|---|---|---|
| K1 | GP8 | bumpGP8, postGP8, disc1GP8, sig1, key 0 disc1, post, stub, col | 29.655 | 278257 |
| K2 | GP7 | bumpGP7, postGP7, disc1GP7, sig2, key 1 disc1, post, stub, col | 56.325 | 410549 |
| K3 | GP6 | bumpGP6, postGP6, disc1GP6, sig3, key 2 disc1, post, stub, col | 82.995 | 542840 |
| K4 | GP5 | bumpGP5, postGP5, disc1GP5, sig4, key 3 disc1, post, stub, col | 109.665 | 675132 |

The seat end of every key path is the same 48891 ohm: bump 4456 (0.50 mm
through), post 38309 (3.98 mm through), disc 6126 (0.72 mm through). The key
end is 82268 ohm: disc 6126, post 38309, stub 6016, column 31817.

The GND return is priced per key, from the seat's GND bump through the
layer 2 bus and that key's drop to its common column: 595717 ohm for keys 1
to 3 and 589592 ohm for key 4. The bus is one conductor, so each key pays
its whole 91.465 mm (453695 ohm), an upper bound on that leg for keys 1 to
3.

| key | path ohm (key + return) | node pF | tau us | settle us (5 tau) | wait us | reject ohm | margin |
|---|---|---|---|---|---|---|---|
| K1 | 873974 | 8.593 | 7.510 | 37.551 | 3500 (inferred) | 81460707 | 93.2x |
| K2 | 1006266 | 9.127 | 9.184 | 45.918 | 3500 (inferred) | 76699721 | 76.2x |
| K3 | 1138557 | 9.660 | 10.998 | 54.992 | 3500 (inferred) | 72464518 | 63.6x |
| K4 | 1264724 | 10.193 | 12.892 | 64.459 | 3500 (inferred) | 68672559 | 54.3x |

Every key settles inside the wait. Pressed, each pin reads 0.00 V LOW,
qualifier unknown: the seat press contact, the two cap contacts and the
cap bridge have no ContactRow, so four elements per path are unpriced and
the totals are lower bounds on that count while the bus leg is an upper
bound. The build time CHK-NET-29 (path1d over the draft) reads 849472 to
1246347 ohm at 10.466 to 12.066 pF; the two models pick different shortest
GND chains and count trace length over different legs (computed, a
difference of about 3 percent in ohm).

## Fader read (circuit.solve, computed, tier inferred)

- Wiper W on GP26, chain bumpGP26, postGP26, disc1GP26, faderW (4.68 mm),
  faderWBase (24.99 mm), t2post: 138968 ohm. The leads at 2.8 mm carry
  73586 ohm; the seat end 48891 and the T2 post 16491 are new in this
  solve, since the flagship priced the lead only.
- CHK-NET-06 warns: 138968 ohm is over the 100000 ohm ADC line
  (read.adc.lineOhm, inferred), so the read needs a 100 nF hold capacitor
  at GP26. At the wW maximum 3.85 mm the leads give 53517 ohm and the path
  118899 ohm, still over the line (computed by hand from the solve's legs):
  the four through legs (bump, seat post, disc, T2 post) take 65382 ohm at
  any lead width.
- 3V3 to T1: 149559 ohm. The track joins 3V3 and GND into one piece
  (NET_SHORT, gap G4), so the divider span is not computed by the tool.
- CHK-NET-26 passes on the track: cut it and 3V3 and GND fall apart.

## Seat landing (CHK-NET-46, computed)

- Pin on contact: each of the seven seated pins (GND, 3V3, GP26, GP8 to
  GP5) sits 0.843 mm inside its bump, legal at least 0.11 mm
  (seat.pinOnContactMin, inferred: the catalog inset conflict 1.38 against
  1.27 mm). Pass.
- Press depth: 0.30 mm on every pin, legal over 0 to 0.50 mm
  (seat.bumpPress, inferred, PIP model.js line 576). Warn: the press comes
  from bezel ribs this part does not carry. Print a bezel or lid with ribs
  reaching the board top less 0.30 mm, or the board rests on the bumps
  under its own weight.

## Goldens (`hbf parity`, SOURCE_DATE_EPOCH 315532800)

- `expected/build.json`: build dc7800..a1, 107 bodies.
- `expected/report.json`: 298 results, 152 pass, 5 warn (CHK-NET-29 x4,
  CHK-PRT-05), 0 fail, 141 skip.
- `expected/query-solve.json`: circuit.solve, 151 results, 102 pass, 12
  warn (CHK-NET-06, CHK-NET-29 x4, CHK-NET-46 x7), 0 fail, 37 skip; no
  hookup entry unsolved.
- `expected/edit.json`: wW 2.8 to 2.85 mm moves the body, faderW,
  faderWBase and the fader base meshes; no check verdict moves.
- `expected/artifacts.json`: the 3MF hash.

## Deviations, each named

- The fader base is 2.40 mm thick (skin + trace + iso, profile stack rows)
  against the original's 2.0, so 0.96 mm of PETG sits over every layer 1
  lead that passes under another net's terminal pad.
- The THINPOT archetype emits no terminal features (gap G5); build.ts reads
  the three terminal pads from the track's prisms and lands a post on each.
- Each key drop ends a quarter trace width past the bus centreline: ended on
  it, the drop's round end meets the bus edge at a tangent and the bus mesh
  opens (CHK-PRT-01 in the flagship run).
- CHK-PRT-05 warns: PIP's 0.72 mm slabs over the 0.25 mm first layer of
  ffc5p, as the seat and thinpot references do.

## What is verified, and what is not

### Verified on this machine

- 2026-10-14: `hbf parity reference/keys/midi-pad` writes the goldens at
  build dc7800..a1, epoch 315532800, and a rerun at epoch 1000000000 comes back equal on all
  five files (computed).
- 2026-10-14: `npx vitest run reference/keys/midi-pad` passes: every net
  starts at a seat tap, each key's chain runs from its GP bump along its own
  lane to its column, the GND return is priced per key, the wiper chain ends
  at the T2 post, each hookup pin is the seat's pin, and the goldens hold.
- 2026-10-14, through `tools/mcp/client.mjs`: part_build verdict warn, 149
  pass, 5 warn, 0 fail, 141 skip; circuit_solve verdict warn, 102 pass, 12
  warn, 0 fail, 37 skip (evidence `fab-knowledge:evals/2026-10-14/midi-pad/`).
- view_render iso and plate looked at by the builder, not by a person.

### Measured on a printed body

- none

### Checked by machine, on geometry rather than hardware

- 2026-10-14: `hbf parity reference/keys/midi-pad` exit 0; its circuit.solve
  golden runs CHK-NET-46 on the seven seated pins (7 pass on contact, 7 warn
  on press), CHK-NET-27 on the four key contacts (4 pass) and CHK-NET-26 on
  the four keys and the fader track (5 pass), computed from the
  declarations and the built meshes.

### Not verified by anything

- No virtual print of this geometry: the flagship's slice ran with the test
  leads and the plate copy that this reference drops.
- No bezel exists for this body, so the press the bumps rely on is
  declared, unbuilt.
- Contact resistance at the seat bumps, the caps and the cap bridge:
  unknown until a coupon row exists.
- A person has not rendered and looked at the meshes.
