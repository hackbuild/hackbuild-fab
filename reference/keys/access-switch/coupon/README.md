# keys/access-switch/coupon

The spring coupon of the access switch (plan v9 section 6, "one printed
coupon per flagship"): a thickness ladder of three click-spring-key cells
at the switch's span 28, rise 2.0 and width 1.6, beams 0.50, 0.55 and 0.60
mm, in one PETG frame. A 0.05 mm beam error moves the switch's peak from
108 g to 224 g (computed), more than the 120 to 180 g band holds, so the
force claim waits on a person pressing these three springs. Every number
below is computed from the build and the profile rows, tier inferred where
a profile row is inferred, unless it says otherwise. Nothing here has been
printed.

Location: `reference/keys/access-switch/coupon/`, its own chase and build
beside the switch, so `hbf parity` and its goldens apply.

| part | source | original of record |
|---|---|---|
| slot, relief, cap well, ribs, spring, tip, cap | click-spring-key through `k.arch`, as `../build.ts` places it, overrides l, t, Q, w and E | `originals/pip/files/haft-src/src/coupon.js` lines 131 to 150 and 166 to 170 |
| rung bars | build.ts, PIP's label stroke 0.6, deboss 0.48 and height 2.6 | `coupon.js` lines 37, 163 and 165; `font.js` line 29 (advance) |
| frame, coin cups | build.ts, new to this coupon (no original) | none |

## The rungs

| rung | bars | beam mm | peak N | peak g | coins to snap |
|---|---|---|---|---|---|
| 1 | 1 | 0.50 | 1.062 | 108 | 21.7 |
| 2 | 2 | 0.55 | 1.552 | 158 | 31.7 |
| 3 | 3 | 0.60 | 2.195 | 224 | 44.8 |

Peaks through packages/sim at the PETG `modulusMPa` row (1900 MPa, a
working value, tier inferred), grams at standard gravity, coins as peak g
over `coupon.coinMassG` (5.000 g, vendor, US five cent coin). All three
peaks equal the scout's sweep of the original `snapfe.js` to the third
decimal (brief finding 2). CHK-KEY-04 passes on each cell.

## Frame and cups

- Frame: one block per cell, each to its own host top (13.20, 13.68 and
  13.92 mm), on a plate to the stack floor; 49.08 x 79.58 mm. Each block
  is its cap well plus a 3 mm rim each side; the rung's bars are debossed
  past the slot's +x end.
- Cups: PETG revolves printed upright beside the frame, 24 mm inside, 8 mm
  deep, 1.6 mm wall. The underside is a cone socket 5.29 mm deep, as steep
  as `overhang.maxDeg` allows, that centres the cup on the cap top. At rest
  the cup's underside stands 4.736 mm over its block (metric `cup.lift`),
  past the stop travel.
- Preload: a cup weighs 6.287 g solid (PETG density from profile; infill
  lowers it, unknown), 1.26 coins. The cap rests on the spring too. Coins
  to snap does not subtract either.
- Springs, caps and tips print flat beside the frame, as the switch prints
  its own. The tips print in the cap's TPU 95A: nothing conducts.

## Deviations, each named

- Rung marks are bars, not digits: no route debosses text on an FDM face,
  and PIP's stroke font has no 0, 5 or 6.
- The chase declares the switch's four slots: the archetype places only
  into a chase that declares every slot it uses. Slots 2 and 4 carry no
  body.
- The archetype's pads, posts, ports and resistance readouts are dropped
  from the part.

## What is verified, and what is not

### Verified on this machine

- 2026-10-21 (R1-fix-19): `npx --no-install hbf parity reference/keys/access-switch/coupon`
  exits 0 at build e36b0a..5c against the goldens re-accepted when CHK-KEY-05
  went to 2.0.0 and moved registryHash; every mesh hash and volume is
  unchanged and the report moves only by that check (computed).
- 2026-10-20 (R1-flagship-access-switch-10): `npx --no-install hbf parity
  reference/keys/access-switch/coupon --accept` wrote the first goldens at
  build d6f43d..34; the edit golden sets cup depth 8 to 10 mm and only the
  three cups change (cup.massG up 0.314 g, computed).
- `npx vitest run reference/keys/access-switch/coupon` passes 5 tests; with
  rung 2 set to 0.50 the stepping test fails.
- 2026-10-20 (R1-fix-01): `npx --no-install hbf parity
  reference/keys/access-switch/coupon` exit 0 at build d6f43d..34, all four
  goldens equal (computed).

### Measured on a printed body

- none

### Checked by machine, on geometry rather than hardware

- 2026-10-20 (R1-fix-01): `npx --no-install hbf check.run
  reference/keys/access-switch/coupon` exit 0 at build d6f43d..34: 0 fail,
  1 warn (CHK-PRT-05, 5.40 mm off the layer grid, the same warn the switch
  carries), 25 pass, 42 skip (computed).

### Not verified by anything

- No print and no slice of this coupon. No 3MF export (the export gate is
  the owner's).
- Whether a cup stays level under a stack of 45 coins is unknown; a
  kitchen scale pressing the cap is the other method.

<!-- coupon card (R1-flagship-access-switch-11) -->

## Card and checklist

The coupon card (file, hash, slicer settings, rung table) and the owner's
read steps live in [../COUPON.md](../COUPON.md), generated from this build
by `test/card.ts`; `test/reference.test.ts` fails when the two disagree.
The result goes in the switch README under "Coupon result".
