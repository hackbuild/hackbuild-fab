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

## BOSS and BLOCKS benches (M10-T01)

M10-T01 adds the two shipped benches and the BOSS example set beside the
source, byte identical, as the parity inputs of M10-T10 and the BenchHook
adapter targets `boss` and `blocks`. `SHA256SUMS` in this folder now lists
every file, the `boss-src/` block above included.

| file | copied from | sha256 (12) | bytes | lineage rows |
|---|---|---|---|---|
| `blocks.html` | `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/designs/blocks/legacy/blocks.html` (2026-09-15 15:11) | 96bf187a3c56 | 1201487 | `blocks.bench/blocks-1` (canonical, `originals/blocks/files/blocks.html`), `blocks.bench/handoff` |
| `boss.html` | `fab-work-directory:benches/blocks/outputs/boss/boss.html` | 00badce59c66 | 1131340 | `blocks.bench/boss-v1`, `blocks.bench/boss-v1-bench-outputs` (copies: BOSS v1 is the parent revision) |
| `boss-examples.zip` | `fab-work-directory:benches/blocks/outputs/boss-examples.zip` | df211c444d19 | 16508691 | `blocks.boss-examples/bench-outputs` (21 project 3MFs, STL zips, print cards) |
| `shots/blocks-d-*.png`, `shots/boss/` | `fab-knowledge:originals/blocks/shots/`, `originals/boss/shots/` | per SHA256SUMS | | side by side review |

Sizes and hashes measured 2026-10-14. `blocks.html` equals
`originals/blocks/files/blocks.html`, the canonical `blocks (1).html` of
2026-09-14 16:59 (every later download is byte identical), and
`boss.html` equals `originals/boss/files/boss.html`
(`knowledge/designs/blocks.md` section 1, `boss.md` section 1). The
record of UX is `knowledge/designs/blocks.md` section 6.

Both pages install the same `window.BENCH` (boss.html line 2855,
blocks.html line 3948): `state`, `setPart`, `goStep`, `run`, `example`,
`exportBytes` resolving to a Uint8Array, and `ready()` as a function. The
adapters synthesise `rev` and `built`, take design JSON in the save
button's shape (part and scene) and give exports as base64; no drive pad
is provided by the legacy bench.

Inherited defects the port must not carry, beyond the solver notes above
(`knowledge/designs/blocks.md` section 8): the PALETTE chip `PLATE 8x8`
calls `partFor('plate')`, which throws since BLOCKS replaced PLATE with
DECK; `seatAt: 'gutter'` never applies; BUTTON travel 2.20 of a 3.20 cone
fails the flex cone rule at its defaults (D-241; the chase default
carries the fix, M10-T10); `MINWALL` is declared and never checked.

## Public through release 1 (R1-rails-public-10)

Kept in git: `boss-src.zip`, `boss-src/`, `README.md` and `SHA256SUMS`.
`packages/circuit/test/nodal.test.ts` hashes the zip and every unpacked
file against the block above and counts the solves of `test_sim.js` and
`test_sim2.js`; `designs/blocks/test/route-seat.test.ts` hashes
`src/parts.js` and `src/boss.js`.

Held out of git since M10-T01 (D-286): `blocks.html`, `boss.html`,
`boss-examples.zip` and `shots/`. `blocks.html` is the original release 1
grades the BLOCKS chase beside (`fab-knowledge:plan-v5/PLAN.md` 6, designs
row); on a runner without the owner's archive that comparison is not run.
