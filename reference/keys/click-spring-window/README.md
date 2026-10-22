# click-spring-window

The reference for `sim/click-spring-window` and CHK-KEY-04 version 2.0.0
(M01-T07, D-071, D-073). The window over Q, rise over beam thickness, is an
FE-backed interval: the SNAPFE port in `packages/sim/src/fe` runs at every
grid Q from 1.00 to 2.60 in steps of 0.01, and four criteria each give a
bound with its reason.

| bound | criterion | limit from |
|---|---|---|
| floor snap | first Q that snaps with a force drop | FE |
| floor drop | first Q whose drop is at least `click.dropMin` | profile constant |
| ceiling strain | last Q before strain at the stop passes the click strain row for the bend direction, searched up from the drop floor | profile strain row |
| ceiling bistable | last Q before the element latches | FE |

At PIP defaults (l 24 mm, t 0.55 mm, w 1.6 mm, E 1900 MPa, sw 3 mm, petg
bent in the layer plane) the window is 1.72 to 2.19 x t (computed): drop
binds the floor and strain the ceiling, and PIP's Q 2.0 lies inside. Bent
across layers, the 1.5 percent row (inferred) puts the strain ceiling at
1.71 under the drop floor 1.72, and the query is E_UNSAT (computed).

## Files

- `chase.ts` declares PIP's `clicky` defaults; Q carries constraintDim
  `spring.Q`.
- `build.ts` builds the two cosine arches as prisms printed flat, ported from
  `clickElement2D` in PIP's `model.js`, with the rise as an informational
  metric.
- `queries.json` names three constraints.query inputs: PIP defaults, l 22
  with t 0.5, and bend across layers. `hbf parity` reruns each and compares
  it with its golden under `expected/`.
- `expected/` holds the parity goldens, pinned to SOURCE_DATE_EPOCH
  315532800. `hbf parity --accept` is their only writer (D-227).
- `test/reference.test.ts` checks the goldens against the card numbers and
  against volumes computed from the defaults, then reruns parity.

## Run

```
npx --no-install hbf constraints.query spring.Q --material petg --facts l=24,t=0.55,w=1.6,E=1900,sw=3,bend=inPlane
npx --no-install hbf parity reference/keys/click-spring-window
```

## Not here yet

The FE readout (peak, drop, contact, strain at the stop) is not a Part IR
metric of this build: build.ts imports only spec and the author surface
(D-178), and `k.mech("click-spring-key")` lands at M06.

CHK-KEY-04 is registered since M04, but this build emits no spring feature
(features: [] in build.ts), so check.run finds no target here; the row is
proven on the fixture
`packages/checks/test/fixtures/CHK-KEY-04/fix-q-2.40/` (same beam, fix /Q
= 2.19, drop 0.91, pass, computed).

## What is verified, and what is not

### Verified on this machine

- 2026-10-21 (R1-score-02): `npx --no-install hbf parity reference/keys/click-spring-window`
  exits 0 at build ac8154..c2 against the goldens re-accepted when the
  key/flex-gap constraint def registered contact.gap and moved
  registryHash; every mesh hash and volume is unchanged and the report
  does not move (computed).
- 2026-10-21 (R1-fix-19): `npx --no-install hbf parity reference/keys/click-spring-window`
  exits 0 at build 1f7c83..e1 against the goldens re-accepted when CHK-KEY-05
  went to 2.0.0 and moved registryHash; every mesh hash and volume is
  unchanged and the report moves only by that check (computed).
- 2026-10-11 (integration after M06 and M08): `npx --no-install hbf parity reference/keys/click-spring-window`
  exits 0 at build 35baf9..64 against the goldens re-accepted when CHK-KEY-01 2.1.0,
  CHK-KEY-02 2.0.0, CHK-PRT-03 2.0.0, CHK-PRT-04 2.0.0, CHK-KEY-04 2.0.1,
  CHK-SHT-04 2.0.1 and CHK-SHT-11 1.0.1 moved registryHash; every mesh hash
  and volume is unchanged and the report moves only by those checks (computed).
- 2026-10-09 (M06-T02 to M06-T06): `npx --no-install hbf parity
  reference/keys/click-spring-window` exits 0 at build 04b2c8..31 against the goldens
  re-accepted when CHK-SHT-11 and the mechanisms ConstraintDefs joined the
  registry: in build.json only registryHash moved, the report gains
  CHK-SHT-11 as a skip row, the 3MF and solve hashes follow buildHash, and
  every mesh hash and volume is unchanged (computed).
- 2026-10-09 (M05-T17): `npx --no-install hbf parity
  reference/keys/click-spring-window` exits 0 at build 6065a6..96
  against the goldens re-accepted once at the M05 exit, when the page
  milestone moved to M05 (circuit, copper and the net level registered;
  packages/checks PAGE_MILESTONE). report.json moves only the reasons of
  the circuit checks that skip (the kernel is registered, so each skips
  on its own reason); the reportHash, build.json, edit.json and
  artifacts.json are unchanged (computed). CHK-NET-40 to -45, entered at
  the same exit, are sheet level and enter no build registry, so
  registryHash is unchanged.
- 2026-10-08 (M05-T12): `npx --no-install hbf parity
  reference/keys/click-spring-window` exits 0 at build 6065a6..96 against the goldens
  re-accepted after the constraint def circuit/capacitive-path-ceiling
  joined the registry: in build.json only registryHash moved, and every
  mesh hash and volume is unchanged (computed).
- 2026-10-08 (M05-T14): `npx --no-install hbf parity
  reference/keys/click-spring-window` exits 0 at build 7dec76..58 against
  the goldens re-accepted for the eight KEYWAY gate rows M05-T14 entered,
  CHK-NET-31 to -38: in build.json only registryHash moved, the report
  gains CHK-NET-31 as a pending skip on the part, and every mesh hash and
  volume is unchanged (computed).
- 2026-10-08 (audit fixer round): `npx --no-install hbf parity
  reference/keys/click-spring-window` exits 0 at build 3b1930..bf against
  the goldens regenerated once for the registry checks in the report, the
  spec registryHash and the check version bumps (D-241 to D-243); every
  mesh hash and volume is unchanged (computed).
- 2026-10-08 (M04 verifier, the audit after it): `npx --no-install hbf
  parity reference/keys/click-spring-window` exits 0 at build be4023..f9
  against the goldens in `expected/`, the three query goldens included.
- 2026-10-08: `test/reference.test.ts` passes.

### Measured on a printed body

None. No click spring from this reference has been printed.

### Checked by machine on geometry

- constraints.query `spring.Q`, the three goldens under `expected/`: PIP
  defaults give 1.72 to 2.19 x t, exit 0; l 22 with t 0.5 passes with
  drop and strain binding; bent across layers is E_UNSAT, drop floor 1.72
  over strain ceiling 1.71 (computed by the SNAPFE port).
- Both arches have volume t l w within 0.1 percent (computed).

### Not verified by anything

- The FE readout (peak, drop, contact, strain at the stop) is no Part IR
  metric of this build until M06.
- The 1.5 percent across-layers strain row is inferred.
- No printed spring has confirmed the window; the click, the drop and the
  latch are computed only.
