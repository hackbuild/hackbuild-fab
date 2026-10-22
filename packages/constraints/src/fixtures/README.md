# Interval fixtures (M01-T10)

Recorded composition and placement rules from the corpus, each run as a
`constraints.query` dim with the reason behind every bound. They live here
until their canon or design package exists (M01 package placement):
`mech/cascade-slop` and `mech/hook-rule` moved to
`packages/mechanisms/src/constraints` at M06-T02 and M06-T03 with their
sources, disagreements and tests; `mech/ogee16-latch-servo-window` moves
to the OGEE design at M10. Each
imports spec only and reads every physical number from a profile constant
row with provenance (PROFILE.md 10.1).

## Sources

| def | dims | canonical source (lineage row) | lines |
|---|---|---|---|
| `key/flex-gap` | `contact.gap` | `originals/pip/files/haft-src/bench/part1.html` (`pip.bench-part1/haft-9`) | 233, 238 |
| `mech/ogee16-latch-servo-window` | `latchServo.x` | `originals/ogee16/files/src/source/params.scad` (`ogee16.params/r16p`); `check_servos.py` (`ogee16.check-servos/r16p`) | params.scad 143, 148, 175, 177 to 186; check_servos.py 25 to 40 |

Facts: `latchServo.x` reads none. Severity (D-067): `latchServo.x` is
block (a servo clash). `verdictOf` maps a measured value outside legal to
that severity's verdict.

## Unknown terms in the LSV_X window

params.scad states the window and two of its references in a comment:
LSV_X above 123.3 so the printed body clears column servo 3, which ends
at x 104.4, and below 125 so the laser crank plus keeper washer clears the
+X rail at 136 (RAIL_X1, line 175). All four are stated in the source,
read here as inferred constants.

- Floor: check_servos.py boxes the latch body at LSV_X - SV_SHAFT_OFF
  with length SV_L along x, so its -X face sits at LSV_X - 5.5 - 11.4
  (SV_SHAFT_OFF line 148, SV_L 22.8 line 143). Clearing x 104.4 at zero
  gap needs LSV_X at least 121.3 (computed). The stated 123.3 carries 2.0
  mm more (computed) that the source never names: unknown.
- Ceiling: the crank and washer dimensions behind 125 against the rail at
  136 are not in the source: unknown.

The fixture encodes 123.3 and 125 as stated and never invents the
missing terms.

## Tests

`packages/constraints/test/fixtures.test.ts` reads its expectations from
the M01-T10 card tables and the canonical params.scad.
