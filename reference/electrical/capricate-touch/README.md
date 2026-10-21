# electrical capricate-touch

The M05-T12 reference (D-021, C-12, C-13): Capricate's 30 kohm ceiling for
capacitive touch electrodes in conductive ABS, rebuilt as a sweep that
`circuit.solve` and CHK-NET-28 read, with the cABS rows and the citation
as corrected.

covers: [CHK-NET-28, command:circuit.solve, constraint:circuit/capacitive-path-ceiling]

## Scope

- Capricate (Schmitz et al., UIST 2015) measured the capacitance change
  of touch electrodes of 5, 10, 15 and 20 mm against series resistors of
  20 to 120 kohm in 10 kohm steps, and for every size saw the
  signal-to-noise ratio fall under 5:1 above 30 kohm (measured by
  others, `capricate.txt` lines 407 to 416). The resistors stood in for
  trace resistance.
- The ceiling is a capacitive touch SNR rule on cABS. It says nothing
  about a pullup read (verified-claims C3, C12), so CHK-NET-28 applies
  only to a net that ends at a port of interface `capacitive`.
- The resistivity rows are Capricate's Torwell cABS figures, 0.4382 along,
  0.8171 across and 0.9976 ohm cm through (measured by others, profile
  rows `cabs.capricate.*`, D-081). The ceiling is profile constant
  `capacitive.pathCeilOhm`, 30000 ohm, tier community.

## What is in this folder

| file | what it holds |
|---|---|
| `chase.ts` | `scene.series`: the four electrodes (0.2 mm thick, Capricate's minimum), the minimal trace lead (0.8 by 0.2 mm, 100 mm, printed along), and 45 nets: 44 sweep cases and the trace |
| `build.ts` | the four electrode discs and the lead as cABS prisms, built from the same `scene.series`; `circuit.solve` does not read the bodies |
| `queries.json` | the `circuit.solve` golden and three `constraints.query` goldens: `net.ohm`, and `conductor.pathLen` along and across |
| `expected/` | parity goldens written by `npx --no-install hbf parity reference/electrical/capricate-touch --accept` at SOURCE_DATE_EPOCH 315532800: `build.json`, `report.json`, `edit.json`, `artifacts.json` (empty, no 3mf), `query-solve.json`, `query-ceiling.json`, `query-along.json`, `query-across.json` |

In each of the 44 sweep cases the resistor's terminals sit on the
electrode edge and on the sensing pad, so the lead is 0 mm and the path
is the declared resistor alone. The electrode disc is the sensing surface
and is not on the path. `query-solve.json` records, per case, the lead
length (0 mm) and the conductor share (0 ohm) beside the total, so a
later layout that adds a lead moves the totals visibly instead of
flipping a 30 kohm case.

## The sweep

Path resistance and CHK-NET-28 verdict, the same for each electrode of 5,
10, 15 and 20 mm (computed from the declared resistors; the ceiling is
measured by others):

| resistor, kohm | lead, mm | conductor, ohm | path, ohm | CHK-NET-28 |
|---|---|---|---|---|
| 20 | 0 | 0 | 20000 | pass |
| 30 | 0 | 0 | 30000 | pass, on the bound (legal at most 30000) |
| 40 to 120 | 0 | 0 | 40000 to 120000 | fail |

Over the 44 cases 8 pass and 36 fail (computed). Each fail names 30000
ohm, profile constant `capacitive.pathCeilOhm` and the Capricate source.

Capricate gives no per-case results; the 44 cases are its test grid (four
electrodes by eleven resistors, 20 to 120 kohm), and the split reads its
"should not exceed 30 kohm" as including 30 kohm (`capricate.txt` lines
411 to 414). Read as excluding it, the split is 4 pass and 40 fail
(computed, M05 audit recompute).

The minimal trace, 0.8 by 0.2 mm and 100 mm long, printed along: 2738.75
ohm (computed from the along row, 4.382 ohm mm x 100 mm / 0.16 mm2;
2738.8 at one decimal), pass. Capricate reports reliable sensing up to 10
cm for minimal traces (measured by others); the reproduction agrees in
direction, inside the ceiling.

The ceiling inverts to a length ceiling for a declared section,
L at most 30000 w t / rho:

| section | direction | row | length ceiling |
|---|---|---|---|
| 0.8 by 0.2 mm | along | `cabs.capricate.along`, 0.4382 ohm cm | 1095.39 mm, 1095.4 at one decimal (computed) |
| 0.8 by 0.2 mm | across | `cabs.capricate.across`, 0.8171 ohm cm | 587.44 mm, 587.4 at one decimal (computed) |

These are the lengths at which the trace alone reaches 30 kohm by R = rho
L / A, with the 0.16 mm2 section Capricate names as its minimal trace
(lines 420 to 421). Nobody tested them: Capricate reports reliable sensing
up to 10 cm (line 423), so past 100 mm the ceiling is unknown in practice.

`npx --no-install hbf constraints.query conductor.pathLen --material cabs --facts wMm=0.8,tMm=0.2,capacitive=true --json`
exits 0 with that ceiling; `--facts ...,direction=across` gives the
across row.

## What differs from Capricate

- Capricate routes each electrode to its nearest endpoint with A* on a
  regular 3D grid inside the model (`capricate.txt` lines 172 to 180):
  design intent in (an electrode list) and geometry out. Here the nets,
  their resistors and leads are declared, and the solve and the check
  run against them; no router runs.
- Capricate's resistors are physical parts on the bench. Here they are
  declared numbers a mesh does not hold, so the series cases stay in
  `scene.series` and never come from geometry.
- Capricate printed on its own Ultimaker with a 0.8 mm nozzle at a 0.2
  mm layer. This reference is laid out for ffc5p but writes no 3MF: the
  profile has no harvested ffc5p preset for cABS (ABS), and the 3MF
  writer refuses a guessed preset row.

## Related work

In hackbuild-fab a printed conductor is a region of the part. The build
derives the nets from the conductive geometry it produced, computes each
net's resistance from printed cross section, path length and a
per-direction resistivity, solves the operating point, and checks the
voltage against the thresholds of the pin it lands on. For multi-material
printed nets with anisotropic resistance we found none that does this in
the surveyed literature; the tools we surveyed take design intent in (a
schematic, an electrode list or drawn traces) and put geometry out.
Capricate (Schmitz et al., UIST 2015) is the nearest prior art: it routes
each printed capacitive electrode to its nearest endpoint with A* on a 3D
grid inside the model, with no schematic, measures direction-dependent
cABS resistivity, and states the 30 kohm ceiling as a design rule. This
reference reproduces that ceiling; it runs on declared nets, so it shows
the solve and the check, and the net extraction half of the claim runs
elsewhere (M05-T04). Flat PCB netlist extraction (Gerber compared to
IPC-D-356 in CAM) exists and is outside this claim. Sources:
`docs/plan/PRIOR-ART.md` sections 1 and 3.

## What is verified, and what is not

### Verified on this machine

- 2026-10-21 (R1-fix-19): `npx --no-install hbf parity reference/electrical/capricate-touch`
  exits 0 at build 16c752..46 against the goldens re-accepted when CHK-KEY-05
  went to 2.0.0 and moved registryHash; every mesh hash and volume is
  unchanged and the report moves only by that check (computed).
- 2026-10-11 (integration after M06 and M08): `npx --no-install hbf parity reference/electrical/capricate-touch`
  exits 0 at build db8d4f..86 against the goldens re-accepted when CHK-KEY-01 2.1.0,
  CHK-KEY-02 2.0.0, CHK-PRT-03 2.0.0, CHK-PRT-04 2.0.0, CHK-KEY-04 2.0.1,
  CHK-SHT-04 2.0.1 and CHK-SHT-11 1.0.1 moved registryHash; every mesh hash
  and volume is unchanged and the report moves only by those checks (computed).
- 2026-10-09 (M06-T02 to M06-T06): `npx --no-install hbf parity
  reference/electrical/capricate-touch` exits 0 at build 99834a..82 against the goldens
  re-accepted when CHK-SHT-11 and the mechanisms ConstraintDefs joined the
  registry: in build.json only registryHash moved, the report gains
  CHK-SHT-11 as a skip row, the 3MF and solve hashes follow buildHash, and
  every mesh hash and volume is unchanged (computed).
- 2026-10-09 (M05-T17): `npx --no-install hbf parity
  reference/electrical/capricate-touch` exits 0 at build 01149a..ff
  against the goldens re-accepted once at the M05 exit, when the page
  milestone moved to M05 (circuit, copper and the net level registered;
  packages/checks PAGE_MILESTONE). report.json moves only the reasons of
  the circuit checks that skip (the kernel is registered, so each skips
  on its own reason); the reportHash, build.json, edit.json and
  artifacts.json are unchanged (computed). CHK-NET-40 to -45, entered at
  the same exit, are sheet level and enter no build registry, so
  registryHash is unchanged.
- 2026-10-09 (M05-T20): `npx --no-install hbf parity
  reference/electrical/capricate-touch` exits 0 at build 01149a..ff against the goldens
  re-accepted once for CHK-3MF-08, which the circuit kernel the chase
  lists now resolves (D-246): in build.json only registryHash and
  buildHash moved, and every mesh hash and volume is unchanged
  (computed); report.json lists CHK-3MF-08, with no package to run it on (no 3mf export declared); `query-solve.json` moves its buildHash and buildInputs registryHash only.
- 2026-10-08 (M05-T10): `npx --no-install hbf parity
  reference/electrical/capricate-touch` exits 0 at build 8aeb1a..83 against the goldens
  re-accepted after the conductor feature kind joined the circuit
  kernel's registry: in build.json only registryHash moved, and every
  mesh hash and volume is unchanged (computed). `query-solve.json` moves its buildHash and buildInputs registryHash only.
- 2026-10-08 (M05-T12): `npx --no-install hbf parity
  reference/electrical/capricate-touch` exits 0 at build 6ff28d..8f
  against the goldens in `expected/`, the four query goldens included.
- 2026-10-08: `npm test -w packages/circuit -- capricate`,
  `npm test -w packages/checks -- capacitive-ceiling` and
  `npm test -w core -- capricate-touch` exit 0: the sweep counts, the
  trace total and the two length ceilings equal the card's figures,
  recomputed from the committed profile rows (computed).

### Measured on a printed body

None. The 30 kohm ceiling and the cABS rows were measured by the
Capricate authors on their own prints; nothing here was printed or
touched.

### Checked by machine on geometry

`expected/report.json` holds the part checks on the five cABS bodies the
build emits. CHK-PRT-05 warns: the 0.2 mm electrodes and lead do not land
on a layer top of the ffc5p preset (0.24 mm layer, 0.25 mm first layer).
No number in the sweep reads the bodies.

### Not verified by anything

- Capricate's SNR on any electrode, resistor or trace printed on ffc5p.
- The ceiling on materials other than Torwell cABS, and on electrodes
  outside 5 to 20 mm.
- Contact resistance at the resistor terminals: no contact row exists,
  and the declared resistor stands for the whole path.
