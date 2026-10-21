# electrical blocks-pullup-band

The M05-T07 reference (D-077, C-03): the BLOCKS undefined-band result,
reproduced from `circuit.solve` on the BOSS button scenes at BOSS v1
values (the default while D-087 is open), with per-MCU verdicts beside
the BOSS read.

covers: [CHK-NET-05, command:circuit.solve, read:pullup]

## Scope

- The BOSS sim used a 50 kohm pullup and one 0.5 VIO threshold
  (`designs/blocks/legacy/boss-src/src/sim.js` lines 91 and 135); the UI
  hint band is 0.3 to 0.7 VIO, 0.99 to 2.31 V on a 3.3 V board (`app2.js`
  line 236).
- The undefined-band verdict holds for short and medium cPLA wires: 10 to
  170 mm straight read 1.31 to 2.31 V at 50 kohm (computed).
- With the default cTPU wires the press is never seen: every cTPU scene
  reads HIGH under the BOSS read and under every catalog row (computed).
- It applies to carbon-filled filament alone. The wire values are BOSS's
  30 ohm cm cPLA and 1500 ohm cm cTPU (`boss.js` SLOTS, inferred), never
  measured on a print here.

## What is in this folder

| file | what it holds |
|---|---|
| `chase.ts` | `scene.legacy`: the BOSS element lists in `scenes/`, pin IO2, rows rp2040 and esp32-c3; params for the two wire cores |
| `build.ts` | the two wire cores of the default scene, 80 mm of cPLA, 1.2 by 0.96 mm, on the 8.0 mm stud pitch; `circuit.solve` does not read them |
| `scenes/` | one element list per pressed BUTTON scene, written by `node tools/legacy/boss/dump-elements.cjs designs/blocks/legacy/boss-src reference/electrical/blocks-pullup-band/scenes --table`; byte equal to the M05-T03 fixtures of the same name |
| `queries.json` | the `circuit.solve` golden: the reference at defaults, no `--mcu` |
| `expected/` | parity goldens written by `npx --no-install hbf parity reference/electrical/blocks-pullup-band --accept` at SOURCE_DATE_EPOCH 315532800: `build.json`, `report.json`, `edit.json`, `artifacts.json`, `query-solve.json` (the table below as result lines and CHK-NET-05 findings) |

The scene (M05-T07 step 1): c3mini press seat, BUTTON at its defaults and
pressed, IO2 in PULLUP, two wires of one shape, length and core from IO2
to button A and from GND to button B. The element list holds the IO2 and
GND pin stud paths, both wires, the switch, the rails and the 1e9 ohm
inputs as BOSS built them. Legacy mode solves it with the PULLUP element at
the `boss-legacy` row's 50000 ohm and reads it the BOSS way; per-MCU mode
replaces the PULLUP element with each end of a catalog row's pullup and
classifies by that row's VIL and VIH.

## The table

Pressed IO2, V (computed, nodal solve over the BOSS element list; straight
wires unless named):

| core, length | V at 50 kohm (BOSS) | BOSS 0.5 VIO read | hint band 0.99 to 2.31 | rp2040 at 50 kohm | rp2040 at 80 kohm | esp32-c3 at 45 kohm |
|---|---|---|---|---|---|---|
| cPLA 10 mm | 1.308 | LOW | undefined | 1.308 UNDEFINED | 0.960 UNDEFINED | 1.392 UNDEFINED |
| cPLA 40 mm | 1.624 | LOW | undefined | 1.624 UNDEFINED | 1.245 UNDEFINED | 1.711 UNDEFINED |
| cPLA 80 mm | 1.917 | HIGH | undefined | 1.917 UNDEFINED | 1.531 UNDEFINED | 2.001 UNDEFINED |
| cPLA 120 mm | 2.122 | HIGH | undefined | 2.122 HIGH | 1.748 UNDEFINED | 2.201 UNDEFINED |
| cPLA 150 mm | 2.240 | HIGH | undefined | 2.240 HIGH | 1.879 UNDEFINED | 2.315 UNDEFINED |
| cPLA 170 mm | 2.307 | HIGH | undefined | 2.307 HIGH | 1.954 UNDEFINED | 2.378 UNDEFINED |
| cPLA 200 mm | 2.392 | HIGH | released | 2.392 HIGH | 2.053 HIGH | 2.460 UNDEFINED |
| cPLA zigzag 200 mm | 2.420 | HIGH | released | 2.420 HIGH | 2.086 HIGH | 2.487 HIGH |
| cPLA spiral 200 mm | 2.397 | HIGH | released | 2.397 HIGH | 2.059 HIGH | 2.465 UNDEFINED |
| cTPU 10 mm | 2.812 | HIGH | released | 2.812 HIGH | 2.583 HIGH | 2.854 HIGH |
| cTPU 40 mm | 3.153 | HIGH | released | 3.153 HIGH | 3.070 HIGH | 3.167 HIGH |
| cTPU 80 mm | 3.224 | HIGH | released | 3.224 HIGH | 3.180 HIGH | 3.231 HIGH |
| cTPU 200 mm | 3.269 | HIGH | released | 3.269 HIGH | 3.250 HIGH | 3.272 HIGH |
| cTPU zigzag 200 mm | 3.270 | HIGH | released | 3.270 HIGH | 3.253 HIGH | 3.273 HIGH |
| cTPU spiral 200 mm | 3.269 | HIGH | released | 3.269 HIGH | 3.251 HIGH | 3.272 HIGH |

The D-077 rows round the cPLA straight column to 1.31, 1.62, 1.92, 2.12,
2.24, 2.31 and 2.39 V; every cTPU scene from 40 to 200 mm reads 3.153 to
3.270 V. At 10 mm straight cTPU reads 2.812 V, under the 3.15 V D-077
states for every length; the verdict is unchanged, HIGH under every row.

At 80 mm cPLA the BOSS read says HIGH while the rp2040 row at 50 kohm says
UNDEFINED. Under the ESP32-C3 band every straight cPLA case is undefined.
Under the RP2040 band the 200 mm cPLA wires read HIGH at 80 kohm, a missed
press.

`npx --no-install hbf circuit.solve reference/electrical/blocks-pullup-band --mcu rp2040`
exits 1: CHK-NET-05 fails on every scene, since the pullup interval that
reads LOW over each path lies above the rp2040 internal maximum of 80000
ohm (E_UNSAT, floor over ceiling). The `boss-legacy` row is refused as a
verdict row (`--mcu boss-legacy` exits 2, D-076).

## Related work

In hackbuild-fab a printed conductor is a region of the part. The build
derives the nets from the conductive geometry it produced, computes each
net's resistance from printed cross section, path length and a
per-direction resistivity, solves the operating point, and checks the
voltage against the thresholds of the pin it lands on. For multi-material
printed nets we found none that does this in the surveyed literature; the
tools we surveyed take design intent in (a schematic, an electrode list or
drawn traces) and put geometry out. This reference runs the operating
point and pin threshold half of that on element lists from the BOSS sim;
the nets here come from BOSS, and no geometry is extracted. Nearest prior
art is Capricate (Schmitz et al., UIST 2015), which routes printed
capacitive electrodes to the nearest endpoint with no netlist input and
holds trace resistance under 30 kohm for SNR 5:1; Wasserfall, Hendrich,
Ahlers and Zhang (Additive Manufacturing 36 (2020) 101523) import EAGLE
schematics into a modified Slic3r; Flexibles (CHI 2017) maps press,
squeeze and bend of printed tangibles to touchscreen signals. Flat PCB
netlist extraction (Gerber compared to IPC-D-356 in CAM) exists and is
outside this claim. Sources: `docs/plan/PRIOR-ART.md` sections 1 and 3.

## What is verified, and what is not

### Verified on this machine

- 2026-10-21 (R1-fix-19): `npx --no-install hbf parity reference/electrical/blocks-pullup-band`
  exits 0 at build 72b024..a1 against the goldens re-accepted when CHK-KEY-05
  went to 2.0.0 and moved registryHash; every mesh hash and volume is
  unchanged and the report moves only by that check (computed).
- 2026-10-11 (integration after M06 and M08): `npx --no-install hbf parity reference/electrical/blocks-pullup-band`
  exits 0 at build 3d25ff..85 against the goldens re-accepted when CHK-KEY-01 2.1.0,
  CHK-KEY-02 2.0.0, CHK-PRT-03 2.0.0, CHK-PRT-04 2.0.0, CHK-KEY-04 2.0.1,
  CHK-SHT-04 2.0.1 and CHK-SHT-11 1.0.1 moved registryHash; every mesh hash
  and volume is unchanged and the report moves only by those checks (computed).
- 2026-10-09 (M06-T02 to M06-T06): `npx --no-install hbf parity
  reference/electrical/blocks-pullup-band` exits 0 at build 6e4c99..b9 against the goldens
  re-accepted when CHK-SHT-11 and the mechanisms ConstraintDefs joined the
  registry: in build.json only registryHash moved, the report gains
  CHK-SHT-11 as a skip row, the 3MF and solve hashes follow buildHash, and
  every mesh hash and volume is unchanged (computed).
- 2026-10-09 (M05-T17): `npx --no-install hbf parity
  reference/electrical/blocks-pullup-band` exits 0 at build 2069fd..23
  against the goldens re-accepted once at the M05 exit, when the page
  milestone moved to M05 (circuit, copper and the net level registered;
  packages/checks PAGE_MILESTONE). report.json moves only the reasons of
  the circuit checks that skip (the kernel is registered, so each skips
  on its own reason); the reportHash, build.json, edit.json and
  artifacts.json are unchanged (computed). CHK-NET-40 to -45, entered at
  the same exit, are sheet level and enter no build registry, so
  registryHash is unchanged.
- 2026-10-09 (M05-T20): `npx --no-install hbf parity
  reference/electrical/blocks-pullup-band` exits 0 at build 2069fd..23 against the goldens
  re-accepted once for CHK-3MF-08, which the circuit kernel the chase
  lists now resolves (D-246): in build.json only registryHash and
  buildHash moved, and every mesh hash and volume is unchanged
  (computed); report.json gains CHK-3MF-08 pass on its export; `query-solve.json` moves its buildHash and buildInputs registryHash only, and `artifacts.json` its 3MF hash, which now carries the conductor overrides and record.
- 2026-10-08 (M05-T10): `npx --no-install hbf parity
  reference/electrical/blocks-pullup-band` exits 0 at build 6a6667..be against the goldens
  re-accepted after the conductor feature kind joined the circuit
  kernel's registry: in build.json only registryHash moved, and every
  mesh hash and volume is unchanged (computed). `query-solve.json` moves its buildHash and buildInputs registryHash only, and `artifacts.json` its 3MF hash, whose metadata carries the buildHash.
- 2026-10-08 (M05-T12): `npx --no-install hbf parity
  reference/electrical/blocks-pullup-band` exits 0 at build 1dbd89..71 against the goldens
  re-accepted after the constraint def circuit/capacitive-path-ceiling
  joined the registry: in build.json only registryHash moved, and every
  mesh hash and volume is unchanged (computed). `query-solve.json` gains one CHK-NET-28 skip, no net target in this build.
- 2026-10-08 (M05-T07): `npx --no-install hbf parity
  reference/electrical/blocks-pullup-band` exits 0 at build d083e6..f7
  against the goldens in `expected/`, `query-solve.json` included.
- 2026-10-08: `npm test -w packages/circuit -- blocks-band` exits 0: the
  seven cPLA straight rows equal the D-077 values within 0.01 V, every
  cTPU scene from 40 to 200 mm lies in 3.15 to 3.27 V within 0.01 V, and
  every cell of the table equals the card's; every 50 kohm volt equals
  BOSS's own pin reading within 1e-9 V, and the PULLUP element replaced
  by 80000 and 45000 ohm equals BOSS's own reruns at those values within
  1e-9 V (computed).

### Measured on a printed body

None. Every number here is computed by a simulation of BOSS's element
lists; no button, wire or pin was printed or read.

### Checked by machine on geometry

None for the table: the element lists come from the legacy sim.
`expected/report.json` holds the part checks on the two wire cores the
build emits, which no number in the table reads.

### Not verified by anything

- Real pullups and thresholds on an RP2040, Pico or ESP32-C3 pin (D-082).
- Real wire, pin stud and switch resistance: BOSS's 30 and 1500 ohm cm
  rows, its 400 ohm socket estimate and its 3 kohm switch are inferred.
- Which BLOCKS standard is canonical (D-087): the table runs at BOSS v1.
