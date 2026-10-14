# BOSS legacy copy

The shipped BOSS source, kept byte identical as the input of the analytic
DC solver parity (M05-T03) and the BLOCKS reproduction (M05-T07) (D-142,
D-156). BOSS is the harvested build of the printed stud and socket system
BLOCKS; this copy runs at BOSS v1 values while D-087 is open. Nothing here
is edited. `boss-src/` is `boss-src.zip` unpacked with `unzip -X`, less
`build.py`: its line 31 holds U+2014 and U+2013 as the characters its own
dash check bans, and lint-voice allows no dash in a repo file. It stays in
the zip, sha256 `d2547639f21fb4e62def80e4aed31425721d5444c3d336d76b0d648afd0c47bb`
(member `build.py`).

| field | value |
|---|---|
| record | `knowledge/designs/blocks.md` (5.22 the DC solver), `knowledge/designs/boss.md` |
| copied from | `fab-work-directory:benches/blocks/outputs/boss/boss-src.zip` |
| equal to | `fab-knowledge:originals/boss/files/boss-src/` and `fab-knowledge:evidence/x/benches-conductive-b/boss-src/`, file for file less `build.py` (compared 2026-10-08) |
| zip entries | 2026-09-13 22:05 to 23:17 for the sources and harnesses; `README.md` and `package.json` 2026-09-14 00:44 |
| canonical | the solver lines of `src/sim.js` (63 to 154) equal the canonical BLOCKS `sim.js` (lineage `blocks.sim/blocks-1`); BOSS `sim.js` differs only in the header comment and the side tab `portTop` key, which the solver does not read |
| lineage rows | `blocks.legacy/boss-src-zip` (this zip), `blocks.sim/boss-legacy`, `blocks.kernel/boss-legacy`, `blocks.body/boss-legacy`, `blocks.parts/boss-legacy` |
| read by | `tools/legacy/boss/dump-elements.cjs` (refuses other bytes), `packages/circuit/test/nodal.test.ts` (sha256 of every file below) |

## sha256

`shasum -a 256 -c` reads this block from this directory.

```
185c1d1bb6692945a3d2b956c7512ee7fd3b9766576396f404d2501a28ffa3b2  boss-src.zip
a167e600127e394eb57b03cc440ae13715147598fcb7dfd0c113f8d8f7ce6b75  boss-src/README.md
d192d4aa2dfa6c310f9bcae073371ddc88ed9fe36f21825074fedbc82bcf5b20  boss-src/browser_sweep.py
0a1ce91b20dff40f156a961ec9ebc5c2780e6ad6a3293129c37dc9e5940ba1bd  boss-src/export_all.js
6a5f7827cd9a5bd12a6744319ba35492497070839edf638b9b6967f9921a3fd5  boss-src/package.json
f8f5fd99e21fb5f46abaf083526a115227606201458ed41a27dcc1e7f4ec795c  boss-src/smoke.py
9ab685bd4d88f94219e594aee37202eb19f5879a122e50af0ba1a7a9c1719adc  boss-src/src/app1.js
698ae1233dd66e1e041532ef16573b6fcf96f398d4d8358d6ce6d253a824dce8  boss-src/src/app2.js
93f5e120d57bdc7b37203c1fea22993cd44974ac3f1fadab0dafbffe77d7d72a  boss-src/src/app3.js
fad77485920bb29d996610adf577d4d10c60f813ce4abc036a10f5a4aa8bfcf7  boss-src/src/boss.js
0d3df6a1859ad71e3c9718c2a9ab3d9b1f3e524187d5dde5331fa961b67b8318  boss-src/src/export.js
344d80b3df3b6b15e5861de343a03c79663669fd700578bf162f97afba499de1  boss-src/src/kernel.js
e9e44eaca651fac61e248e5d066cb523ec7d71252c8a792d1ef09057f801d9e6  boss-src/src/parts.js
fd82fa85886bfd5dd6c12f982b5866ceb8093d2530a8f10b918deb63e48807ba  boss-src/src/shell.html
27e4b12212b75c63d3e812db7f2dbb6137e7875049b63419676965706a38e6f5  boss-src/src/sim.js
98f2902cf769890bd883631970338d1fca022267a453a91f31d7e7cd3a458d9e  boss-src/sweep.js
20a49f13f19a4b8450ad33ba75f891f82fd4e26fdd78abda79e40f5a7ea19d29  boss-src/test_parts.js
ed86f4dc1d164abcc930fbf6909350c17b54e84a14b29c8e4f2d21ff7b77f0de  boss-src/test_sim.js
72508dc766f68afdc36d6bcd51c0951faf6d4e1eb184925724421e7ca5e957b4  boss-src/test_sim2.js
```

## What the port reads, by line

| file | lines | port |
|---|---|---|
| `src/sim.js` | 63 to 140, `solve()`: element floor 1e-3 ohm, open 1e9 ohm, stamping order, ground row, 1e-12 S leak, Newton on the LED | `packages/circuit/src/dc/nodal.ts` `solveDc` |
| `src/sim.js` | 111 to 118 and 136, piecewise linear LED | `ledPwl` element and `LED_PWL_LEGACY` in `nodal.ts`, legacy only |
| `src/sim.js` | 142 to 154, `solveDense` | `nodal.ts` `solveDense` |
| `src/sim.js` | 91, PULLUP 50 kohm | patched to `globalThis.__PU` by the dump; the catalog `boss-legacy` row holds the value (M05-T02) |

## The scene fixtures

`packages/circuit/test/fixtures/boss-scenes/*.json` are BOSS's own element
lists and results, computed by the BOSS sim and written by

    npm install --no-save polygon-clipping@0.15.7
    node tools/legacy/boss/dump-elements.cjs designs/blocks/legacy/boss-src packages/circuit/test/fixtures/boss-scenes

The dump runs `test_sim.js` and `test_sim2.js` as shipped (one fixture per
`solve()`, with the lines each script printed) and the BUTTON scenes of
M05-T07 step 1. polygon-clipping 0.15.7 stays out of the root lock (its
dependency tree trips lint-voice, `.hbf-notes/m00-report.md`); earcut
2.2.4 is a root devDependency. Licences: earcut ISC, polygon-clipping MIT
(read from each package's `package.json`, 2026-10-08).

## Known unfixed defects

- The ground row is replaced by identity but the ground column is not
  cleared (sim.js lines 121 to 122); harmless since the ground voltage is
  0, and kept for bit parity.
- PULLUP is one 50 kohm constant and the digital read one 0.5 VIO
  threshold (lines 91 and 135); per-MCU rows replace both (D-076, M05-T02,
  M05-T06).
- The TOUCH finger needs a ground found earlier in insertion order (line
  81; `knowledge/designs/blocks.md` 5.22).
