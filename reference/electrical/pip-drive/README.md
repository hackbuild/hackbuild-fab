# electrical pip-drive

The M05-T11 reference (D-079, D-080, C-06): the drive readout a person
sees on a PIP stage overlay, per key path resistance, node capacitance,
tau, settle and reject, as a `circuit.solve` result with its qualifiers,
and the crossings the owner measured on a printed body beside it with
their source.

covers: [CHK-NET-29, command:circuit.solve, read:charge-release]

## Scope

- PIP's default layout at hackbuild/pip-controller b137deb (D-013),
  routed by packages/copper in default mode (M05-T08). Each key path is
  composed as PIP's model composes it (pip-controller src/model.js lines
  393 to 416): the key net's trace and its two terminal posts and vias,
  the switch posts, the switch contact, and the common net (GND for keys,
  3V3 for touch) with its two terminal posts. Traces read the profile row
  `cpla.pip.along` (500 ohm cm), posts `cpla.pip.through` (2000 ohm cm),
  both inferred (PROFILE.md 4.1, D-081).
- The switch contact is declared: PIP computes it from its switch
  geometry over `ctpu.pip.bulk` (400 ohm cm, inferred), and those
  formulas move to the archetypes in M06. The contact takes that row's
  tier.
- The hookup reads every key by charge-release as the emitted firmware
  does (pip_stick.ino lines 25, 31 and 54 to 64): keys drive high and
  wait 3500 us, touch pads drive low and wait 1500 us. Both waits are
  inferred, a margin above the crossings measured on a printed stick
  (D-079).
- pip.ino, the published firmware, still ships a 200 us key wait
  (pip.ino line 20). The gap between pip.ino's 200 us and pip_stick's
  3500 us is recorded on every key read as `wait.firmwareShipped`,
  qualifier unknown; hackbuild-fab does not edit pip-controller, and the
  owner decides which wait ships (D-080).
- Only the key paths are solved. The routed buried stack, its net gaps
  and CHK-NET-12 on the same route are `reference/electrical/pip-buried-route`;
  this folder declares the route's lengths and builds one straight trace
  per net to carry them.

## What is in this folder

| file | what it holds |
|---|---|
| `chase.ts` | the hookup and `scene.drive`, both written by `node packages/copper/scripts/pip-drive-scene.mjs --write` between the generated markers: per net the routed length with stubs, terminal posts and vias; per key its switch posts, declared contact and common net; the stack heights and trace section from profile; never edited by hand |
| `build.ts` | one conductive PLA prism per net, its routed length by the 1.40 by 0.72 mm trace section, laid out one pitch apart; `circuit.solve` does not read the bodies |
| `queries.json` | the `circuit.solve` golden |
| `expected/` | parity goldens written by `npx --no-install hbf parity reference/electrical/pip-drive --accept` at SOURCE_DATE_EPOCH 315532800: `build.json`, `report.json`, `edit.json` (pitch 6 to 7 mm, hand-declared pointer), `artifacts.json` (empty, stl only), `query-solve.json` |
| `test/reference.test.ts` | holds the chase's generated blocks to the generator, and the golden to the card and to PIP's bench rows |

The fixture behind the declaration is
`packages/circuit/test/fixtures/pip-b137deb-elec.json`, PIP's own
readouts dumped from a scratch checkout of b137deb by
`node tools/legacy/pip/dump-elec.mjs <checkout>` (manifold-3d 3.5.3 from
that checkout's lock, node v22.18.0). CI never runs pip-controller.

## Numbers

All computed by circuit from PIP's geometry and the inferred rows; none
measured. In the default-mode route every net lands on PIP's own
polylines, so each figure equals PIP's bench row.

| key | pin | type | R ohm | C pF | tau us |
|---|---|---|---|---|---|
| UP | GP29 | flex | 1630665 | 8.738 | 14.249 |
| DOWN | GP26 | flex | 1671506 | 8.903 | 14.881 |
| LEFT | GP28 | flex | 1722798 | 9.109 | 15.694 |
| RIGHT | GP27 | flex | 1578599 | 8.528 | 13.462 |
| X | GP3 | clicky | 1564030 | 8.700 | 13.607 |
| B | GP6 | clicky | 1634986 | 8.986 | 14.692 |
| Y | GP5 | clicky | 1504700 | 8.461 | 12.731 |
| A | GP4 | clicky | 1687980 | 9.200 | 15.529 |
| SELECT | GP12 | touch | 929388 | 8.569 | 179.339 (with 20 Mohm skin) |
| START | GP10 | touch | 910897 | 8.494 | 177.622 (with 20 Mohm skin) |

| figure | value | source |
|---|---|---|
| key paths | 1.50 to 1.72 Mohm | `query-solve.json` |
| touch paths, without the skin | 0.91 to 0.93 Mohm | `query-solve.json` |
| slowest key | LEFT, tau 15.694 us, settle 78.469 us (5 tau) | `query-solve.json` |
| key reject at the 200 us bench wait | 4.35 Mohm on A | `packages/circuit/test/pip-drive.test.ts` |
| key reject at the emitted 3500 us | 76.09 to 82.73 Mohm | `query-solve.json` |
| touch accepts at 1500 us | under 58.35 Mohm (SELECT) | `query-solve.json` |
| idle droop at 1 nA over 1.5 ms | 0.21 V over the 7 pF pin (PIP's figure, model.js line 433); 0.18 V over the 8.5 pF node in the read record | `packages/circuit/test/pip-drive.test.ts`, `query-solve.json` |
| LEFT crossing of the 0.8 V VIL from 3.3 V | 22.24 us, analytic and ngspice 45.2 within 1e-6 relative | `packages/circuit/test/pip-drive.test.ts` |

Leakage is the catalog row for RP2040, 1 nA, inferred (D-082).

## What is verified, and what is not

### Verified on this machine

- 2026-10-21 (R1-score-02): `npx --no-install hbf parity reference/electrical/pip-drive`
  exits 0 at build 05ba6b..36 against the goldens re-accepted when the
  key/flex-gap constraint def registered contact.gap and moved
  registryHash; every mesh hash and volume is unchanged and the report
  does not move (computed).
- 2026-10-21 (R1-fix-19): `npx --no-install hbf parity reference/electrical/pip-drive`
  exits 0 at build be4fdd..45 against the goldens re-accepted when CHK-KEY-05
  went to 2.0.0 and moved registryHash; every mesh hash and volume is
  unchanged and the report moves only by that check (computed).
- 2026-10-11 (integration after M06 and M08): `npx --no-install hbf parity reference/electrical/pip-drive`
  exits 0 at build cb8a0c..63 against the goldens re-accepted when CHK-KEY-01 2.1.0,
  CHK-KEY-02 2.0.0, CHK-PRT-03 2.0.0, CHK-PRT-04 2.0.0, CHK-KEY-04 2.0.1,
  CHK-SHT-04 2.0.1 and CHK-SHT-11 1.0.1 moved registryHash; every mesh hash
  and volume is unchanged and the report moves only by those checks (computed).
- 2026-10-09 (M06-T02 to M06-T06): `npx --no-install hbf parity
  reference/electrical/pip-drive` exits 0 at build c5c900..c8 against the goldens
  re-accepted when CHK-SHT-11 and the mechanisms ConstraintDefs joined the
  registry: in build.json only registryHash moved, the report gains
  CHK-SHT-11 as a skip row, the 3MF and solve hashes follow buildHash, and
  every mesh hash and volume is unchanged (computed).
- 2026-10-09 (M05-T17): `npx --no-install hbf parity
  reference/electrical/pip-drive` exits 0 at build e7666f..91 against
  the goldens re-accepted once at the M05 exit, when the page milestone
  moved to M05 (circuit, copper and the net level registered;
  packages/checks PAGE_MILESTONE). report.json moves only the reasons of
  the circuit checks that skip (the kernel is registered, so each skips
  on its own reason); the reportHash, build.json, edit.json and
  artifacts.json are unchanged (computed). CHK-NET-40 to -45, entered at
  the same exit, are sheet level and enter no build registry, so
  registryHash is unchanged.
- 2026-10-09 (M05-T20): `npx --no-install hbf parity
  reference/electrical/pip-drive` exits 0 at build e7666f..91 against the goldens
  re-accepted once for CHK-3MF-08, which the circuit kernel the chase
  lists now resolves (D-246): in build.json only registryHash and
  buildHash moved, and every mesh hash and volume is unchanged
  (computed); report.json lists CHK-3MF-08, with no package to run it on; `query-solve.json` moves its buildHash and buildInputs registryHash only.
- 2026-10-09 (M05-T19): `npx --no-install hbf parity
  reference/electrical/pip-drive` exits 0 against the goldens accepted
  once for CHK-NET-29, which circuit.solve now runs on each key and touch
  net over the read record chargePort made: all ten warn, inside their
  legal interval with the wait and the path rows inferred (keys 3500 us
  over 5 tau, touch 1500 us over 3 tau with the 20 Mohm bench skin in
  series), computed. build.json, edit.json and artifacts.json are equal.
  The check's fail fixture is this reference's START touch read at
  pip.ino's 200 us (`packages/checks/test/fixtures/CHK-NET-29/fail.json`,
  rounded as M05-T19 states it): 20910897 ohm against legal 0 to 7848677
  ohm, fail, and the fix wait 533 us predicts legal 0 to 20916726 ohm,
  warn (computed); the A key at 3500 us is its pass fixture, legal 0 to
  76086957 ohm, warn.
- 2026-10-08 (M05-T11): `npx --no-install hbf parity
  reference/electrical/pip-drive` exits 0 at build f16fdd..05 against
  the goldens in `expected/`, `query-solve.json` included.
- 2026-10-08: `npm test -w packages/circuit -- pip-drive` exits 0: over
  PIP's legacy route lengths every key path equals PIP's bench row within
  1 ohm and its tau within 0.001 us; the summary figures equal the card's;
  the default-mode route gives the same ranges; the LEFT crossing agrees
  between the analytic form and ngspice (computed).

### Measured on a printed body

Measured by the owner on a printed stick build, 2026-09-18, from
pip-controller docs (README.md lines 155 to 180, docs/electrical.md
lines 143 to 162), never by hackbuild-fab:

- pressed, the running minimum crossing per key: 113 us (RIGHT) to
  2431 us (UP); eight of the ten keys at 1067 to 2431 us, ten to thirty
  times the computed settle; RIGHT and SELECT near it.
- idle, untouched: 6.5 to 17.8 ms, and two pins never crossed inside
  20 ms.

These crossings sit beside the computed rows; nothing here moves a
computed figure toward them.

### Checked by machine on geometry

`expected/report.json` holds the part checks on the twelve trace prisms.
CHK-PRT-05 warns: the 0.72 mm traces do not land on a layer top of the
ffc5p preset (0.24 mm layer, 0.25 mm first layer). No figure in the
solve reads the bodies.

### Not verified by anything

- Contact resistance on the shop's spools: the switch contacts and both
  resistivity rows are inferred, and the measured crossings say the
  printed contacts run ten to thirty times higher (D-082).
- RP2040 pin leakage and input capacitance on a real board (D-082).
- The firmware wait that should ship: pip.ino 200 us against pip_stick
  3500 us is the owner's call (D-080).
- PIP's switch geometry formulas, which land with the archetypes in M06.
