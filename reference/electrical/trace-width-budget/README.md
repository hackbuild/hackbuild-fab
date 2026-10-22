# electrical trace-width-budget

The M01-T06 reference (C-01, D-072): one printed trace whose width
`constraints.query` answers. R = rho L / (w t), so a maximum-resistance
budget bounds the width from below. The v3 plan printed this query as the
band 0.80 to 1.20 mm, which is empty at its own numbers: at 30 ohm cm, 62
mm and 0.72 mm an 8000 ohm budget needs at least 3.23 mm (computed).

covers: [constraint:profile/printability-floor, constraint:profile/flex-fatigue-floor, constraint:mesh/pitch-ceiling, constraint:circuit/trace-resistance-floor, route:prism]

| file | what it holds |
|---|---|
| `chase.ts` | the facts of golden 1 as params: path 62 mm, thickness 0.72 mm, budget 8000 ohm, flexes, pitch 8.0 mm, clearance 1.0 mm; width 3.25 mm with `constraintDim: "conductor.width"` |
| `build.ts` | a PETG skin, path by width, from the bed to the trace top, and one conductor feature, the trace, as the top thickness of it, bound to `/w` (D-248) |
| `queries.json` | the four dim-form query inputs whose CommandResults are the query goldens (D-228) |
| `expected/` | parity goldens written by `npx --no-install hbf parity reference/electrical/trace-width-budget --accept` at SOURCE_DATE_EPOCH 315532800: `query-1.json` to `query-4.json`, `build.json`, `report.json`, `edit.json`, `artifacts.json` |

## The four queries

Common facts: path 62 mm, thickness 0.72 mm, flexes, pitch 8.0 mm,
clearance 1.0 mm each side. Floors: printability 0.80 mm (nozzle bore 0.40
mm, vendor, times 2 perimeters, inferred; computed from inferred) and
fatigue 0.80 mm (inferred). Ceiling: pitch 6.00 mm (computed).

| query | material row | rho, ohm cm | budget, ohm | resistance floor, mm | legal, mm | exit |
|---|---|---|---|---|---|---|
| 1 | `cpla-protopasta.xy` | 30 (vendor) | 8000 | 3.23 (computed) | 3.23 to 6.00, the resistance floor binds | 0 |
| 2 | `cpla.pip.along`, PIP preset | 500 (inferred) | 8000 | 53.82 (computed) | none, E_UNSAT: at least 71760 ohm at width 6.00 | 1 |
| 3 | `cpla-protopasta.xy` | 30 (vendor) | 2000 | 12.92 (computed) | none, E_UNSAT: at least 4306 ohm at width 6.00 | 1 |
| 4 | `cpla-protopasta.xy` | 30 (vendor) | none | none | 0.80 to 6.00, printability and fatigue tie | 0 |

Yousu raw-filament figures (240 to 481 ohm cm) are never scaled onto a
printed trace here (C-09).

## Goldens

At defaults (computed): body `skin` slot 2 (PETG) 145.024902344 mm3 and
conductor `trace` slot 1 (Protopasta) 145.129835017 mm3. The skin is
`stack.skin` (0.72 mm, inferred, the PIP buried stack skin under trace
layer 1) plus `tMm` tall; stage 5 partitions the trace out of its top
`tMm`. `expected/edit.json` moves `/w` from 3.25 to 3.30 mm and both
bodies change. The top of each body is snapped to the mesh grid, so
neither lands exactly on the ffc5p_20260819 layer grid and CHK-PRT-05
warns (computed).

The param form (`constraints.query --chase reference/electrical/trace-width-budget`)
answers `/w` through the conductor feature that binds it, exit 0: legal
3.23 to 6.00 mm, the resistance floor binding at 30 ohm cm (vendor), and
`unbound` empty (computed, M05-T17 step 7, M01-T06 acceptance line 2). The
conductor names its own material, which the query reads before its host
body's (D-248). No `envelope.json` golden is written: parity writes query
goldens only from `queries.json` (D-228), and the envelope carries the
buildHash, which moves with the epoch parity does not pin for a param-form
query (M05 card, T17 defects). core/test/trace-width-budget.test.ts holds
the envelope instead.

## What is verified, and what is not

### Verified on this machine

- 2026-10-21 (R1-score-02): `npx --no-install hbf parity reference/electrical/trace-width-budget`
  exits 0 at build 6bbd96..81 against the goldens re-accepted when the
  key/flex-gap constraint def registered contact.gap and moved
  registryHash; every mesh hash and volume is unchanged and the report
  does not move (computed).
- 2026-10-21 (R1-fix-19): `npx --no-install hbf parity reference/electrical/trace-width-budget`
  exits 0 at build b9362e..7c against the goldens re-accepted when CHK-KEY-05
  went to 2.0.0 and moved registryHash; every mesh hash and volume is
  unchanged and the report moves only by that check (computed).
- 2026-10-11 (integration after M06 and M08): `npx --no-install hbf parity reference/electrical/trace-width-budget`
  exits 0 at build e5a09d..63 against the goldens re-accepted when CHK-KEY-01 2.1.0,
  CHK-KEY-02 2.0.0, CHK-PRT-03 2.0.0, CHK-PRT-04 2.0.0, CHK-KEY-04 2.0.1,
  CHK-SHT-04 2.0.1 and CHK-SHT-11 1.0.1 moved registryHash; every mesh hash
  and volume is unchanged and the report moves only by those checks (computed).
- 2026-10-09 (M06-T02 to M06-T06): `npx --no-install hbf parity
  reference/electrical/trace-width-budget` exits 0 at build 0b53db..35 against the goldens
  re-accepted when CHK-SHT-11 and the mechanisms ConstraintDefs joined the
  registry: in build.json only registryHash moved, the report gains
  CHK-SHT-11 as a skip row, the 3MF and solve hashes follow buildHash, and
  every mesh hash and volume is unchanged (computed).
- 2026-10-09 (M05 audit, D-248): the trace gains its PETG skin host and
  the conductor feature bound to `/w`. `npx --no-install hbf parity
  reference/electrical/trace-width-budget` exits 0 at build fd8d42..aa
  against the goldens accepted once for this change: build.json moves
  buildHash, inputs, meshHashes and volumes (one body becomes two),
  report.json moves its findings (pass 15, warn 1, fail 0, skip 42,
  computed), edit.json and artifacts.json move with them; the four query
  goldens are equal. A person has not looked at the renders (D-154).
- 2026-10-09 (M05-T17): `npx --no-install hbf parity
  reference/electrical/trace-width-budget` exits 0 at build 9b0aa1..2f
  against the goldens re-accepted once at the M05 exit, when the page
  milestone moved to M05 (circuit, copper and the net level registered;
  packages/checks PAGE_MILESTONE). build.ts now says why it carries no
  conductor feature (its comment only), so defHash and buildHash moved,
  and the writer 3MF, whose metadata carries the buildHash, moves
  artifacts.json; every mesh hash and volume is unchanged and the
  reportHash is the same (computed).
- 2026-10-09 (M05-T20): `npx --no-install hbf parity
  reference/electrical/trace-width-budget` exits 0 at build c6173c..18 against the goldens
  re-accepted once for CHK-3MF-08, which the circuit kernel the chase
  lists now resolves (D-246): in build.json only registryHash and
  buildHash moved, and every mesh hash and volume is unchanged
  (computed); report.json gains CHK-3MF-08 pass on its export, and `artifacts.json` moves its 3MF hash, which now carries the conductor overrides and record.
- 2026-10-08 (M05-T10): `npx --no-install hbf parity
  reference/electrical/trace-width-budget` exits 0 at build c759a5..3e against the goldens
  re-accepted after the conductor feature kind joined the circuit
  kernel's registry: in build.json only registryHash moved, and every
  mesh hash and volume is unchanged (computed). `artifacts.json` moves its 3MF hash, whose metadata carries the buildHash.
- 2026-10-08 (M05-T12): `npx --no-install hbf parity
  reference/electrical/trace-width-budget` exits 0 at build c3a4b1..e0 against the goldens
  re-accepted after the constraint def circuit/capacitive-path-ceiling
  joined the registry: in build.json only registryHash moved, and every
  mesh hash and volume is unchanged (computed).
- 2026-10-08 (M05-T14): `npx --no-install hbf parity
  reference/electrical/trace-width-budget` exits 0 at build 6124a6..d2
  against the goldens re-accepted for the eight KEYWAY gate rows M05-T14
  entered, CHK-NET-31 to -38: in build.json only registryHash moved, the
  report gains CHK-NET-31 as a pending skip on the part, and every mesh
  hash and volume is unchanged (computed).
- 2026-10-08 (audit fixer round): `npx --no-install hbf parity
  reference/electrical/trace-width-budget` exits 0 at build 1ba524..32
  against the goldens regenerated once for the registry checks in the
  report, the spec registryHash and the check version bumps (D-241 to
  D-243); every mesh hash and volume is unchanged (computed).
- 2026-10-08 (the audit after M04): `npx --no-install hbf parity
  reference/electrical/trace-width-budget` exits 0 at build bd7644..69
  against the goldens in `expected/`, the four query goldens included.
- 2026-10-06: the three dim-form acceptance queries of M01-T06 exit 0, 1
  and 1 with the legal ranges and expected lines in the table above.

### Measured on a printed body

None. No resistance in this reference was measured on a printed trace:
the 30 ohm cm rows are vendor figures and the 500 ohm cm row is inferred
from the PIP preset.

### Checked by machine on geometry

- `expected/report.json`: CHK-PRT-01 (closed solid), CHK-PRT-03, CHK-3MF-06
  and CHK-3MF-07 pass; CHK-3MF-04 and CHK-PRT-04 skip, not run.

### Not verified by anything

- Whether a printed Protopasta trace at 3.25 x 0.72 mm over 62 mm reads
  under 8000 ohm.
- The 0.80 mm fatigue floor: its source line was not found (PROFILE.md 3.3).
