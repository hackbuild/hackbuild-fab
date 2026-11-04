# keys key-bed

A bed of flex cone keys on a Raspberry Pi Pico press seat, the key count a
param (1 to 13, default 8).

The keys are `flex-cone-key` (pip.md 5.1) in a row below a `pico-seat`
(reference seats/pico-pressfit), one PETG body with PIP's buried stack, as
the four-key MIDI reference lays its keys beside an RP2040-Zero seat. Key k is sensed by
charge-release on GPIO k-1, GPIO0 onward down the Pico's left column, with
PIP's 3500 us wait until a coupon calibrates it (D-079). A chase holds no loop,
so it lists no hookup entry per key of a count; `build.ts` emits them
(`PartDraft.hookup`), and circuit.solve, the build checks and the bench take them
after `chase.hookup` through `hookupOf` (spec/chase.ts), and a port listed in
both is E_SCHEMA.

covers: ['hookup:build']

| file | what it holds |
|---|---|
| `chase.ts` | the literal: key count, key pitch, wall; no hookup (the build emits it) |
| `build.ts` | the seat and the key row, the signal lanes on layer 1, the common bus on layer 2, the hookup per key |
| `expected/` | parity goldens written by `npx --no-install hbf parity reference/keys/key-bed --accept` at SOURCE_DATE_EPOCH 315532800; `edit.json` was written once by hand (no param carries a constraintDim) with the edit count 8 to 4 |

## Routing

Signals leave their seat posts straight down to a lane, run along it and drop
to the key's post. Keys left of their castellation fan left and the rest fan right; the
leftmost castellation of the left group and the rightmost of the right group take the
shallowest lanes, so no lane runs across another signal's drop. Commons run
on layer 2 to a bus between the lanes and the keys, and the bus runs to the
seat's GND post (castellation 3). The keys are turned half a turn so each common post
stands right of its key's centre and every common lies right of the GND post.

Every lead meets a seat post half a post radius off its centre. Ended on the
centre, the lead's round end met the post and its layer discs nearly tangent,
and the union of the bodies failed with open edges at those posts from three
keys up (found from a dump of the failing union, 2026-11-03).

## Goldens

- Eight keys: body 152.4 by 66.1 mm, top 9.6 mm (computed), 162 bodies.
- check.run: 0 fail; CHK-NET-29 warns on each key (the sensing path rows and the
  3500 us wait are inferred) and CHK-PRT-05 on the seat stack, the finding
  every PIP seat reference carries.
- circuit.solve: 0 fail, 8 keys sensed through the emitted hookup on pico GPIO0
  to GPIO7; CHK-NET-46 warns that the seat's board clamp is not in the part.
- The edit to 4 keys moves the body and every lead; the seat does not move.

## What is verified, and what is not

### Verified on this machine

- 2026-11-03: `npx --no-install hbf parity reference/keys/key-bed` exits 0 at
  build f5ab21..63 against the goldens written that day (the first goldens of
  this reference). Builds at 1, 2, 3, 8, 10 and 12 keys give 0 fail; 14 keys
  fail CHK-PRT-16, 266.7 mm over the 256 mm build volume (vendor), so the
  count stops at 13 (computed).

### Measured on a printed body

Nothing. The bed has not been printed and no key has been sensed on a Pico.

### Checked by machine on geometry

- An iso render looked at by an agent: eight key wells in a row, the Pico
  pocket behind them, the USB notch at the cable edge. That is an agent's
  look, not a person's (D-154).

### Not verified by anything

- Sensing any key on silicon, and the charge-release wait.
- The micro-USB height and overhang of the seat (inferred, see the seat).
- 16 keys: the build stops in the mesh kernel with a wasm memory error
  before any check runs; the chase range keeps the count where the bed fits.
- A second row (a second octave on the right column) is not built.
