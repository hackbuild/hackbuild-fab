# conductors/blocks-stud

The blocks-stud archetype (M06-T09) at the blocks-html standard, peg both,
placed by `build.ts` through `Author.arch` on the top face of a one stud
BLOCKS brick (8 x 8 mm, corner 0.6, 9.6 mm tall, the brickBody of parts.js
line 52): a cTPU clutch ring in the socket under the brick, a cPLA flange
over it, the post up through the brick, a 0.04 mm tip and the stud on top,
one net. Original of record: `originals/blocks/files/src-extracted/blocks.js`
column and clutchRing (lines 168 to 226); the boss-v1 preset ports
`originals/boss/files/boss-src/src/boss.js` lines 93 to 110; records
`knowledge/designs/blocks.md` 5.4 and `boss.md` 5.3. The standard has no
default until a print (D-087), so build.ts names blocks-html.

## Made the way the original makes it

| rule (blocks.md 5.4) | where it lands | test |
|---|---|---|
| clutch ring in the socket from the brick bottom to sockH, bore 4.6 drawn for the 4.8 stud | `packages/archetypes/src/blocks/stud.ts` studColumn | blocks.parity: cTPU volume within 1e-3 mm3 and bbox within 1e-6 mm, every peg mode, both presets |
| flange over the socket, post from L1 to the top, tip, stud 4.8 x 1.8 | studColumn | blocks.parity: cPLA volume and bbox per case; test/reference.test.ts: the post runs to 9.6, as the original's post feature |
| taps on the stud and in the socket | studApply metrics | test/reference.test.ts: S at 6.19 and S.sock at 1.10 mm, the original's taps |
| the post resistance through the post section | studDerive | blocks.parity: R.post at the profile row |

## Deviations, each named

- Volumes are compared on the declarations before the kernel's D-054 snap
  and D-070 inset; the built bodies carry the kernel's.
- CHK-KEY-02 holds a flex cap bridge to 4.5 mm (PIP). The flange over the
  4.6 mm socket bridges 4.525 mm (computed on the 0.05 mm grid), and it is
  cPLA, so CHK-KEY-02 2.0.0 skips it as no flex cap and CHK-PRT-09 holds the
  bridge; the originals print the same socket (blocks.js line 177, boss.js
  line 99).

## Virtual print (computed, not printed)

Sliced 2026-10-10 by `tools/slice/slice.mjs --design reference/conductors/blocks-stud`
(Orca-Flashforge 2.3.2, fresh datadir, the cTPU slot mapped to Generic
TPU-95A @FF C5P, an inferred stand-in) and read by
`tools/py/gcode/analyze.py`: 0 regions of a body printed by another tool, 0
deposits in air, 0 cPLA components joining two nets, 0 features dropped; 47
layers, 42 tool changes, 19 m 19 s and 4.39 g by the slicer's estimate. The
lead to column line reads no because analyze.py keys on flex-pair's leads.
Evidence: `fab-knowledge:evidence/m06-unblock/vprint-conductors-blocks-stud/`.

## What is verified, and what is not

### Verified on this machine

- 2026-10-21 (R1-score-02): `npx --no-install hbf parity reference/conductors/blocks-stud`
  exits 0 at build de69e9..7c against the goldens re-accepted when the
  key/flex-gap constraint def registered contact.gap and moved
  registryHash; every mesh hash and volume is unchanged and the report
  does not move (computed).
- 2026-10-21 (R1-fix-19): `npx --no-install hbf parity reference/conductors/blocks-stud`
  exits 0 at build c42259..df against the goldens re-accepted when CHK-KEY-05
  went to 2.0.0 and moved registryHash; every mesh hash and volume is
  unchanged and the report moves only by that check (computed).
- 2026-10-11 (integration after M06 and M08): `npx --no-install hbf parity reference/conductors/blocks-stud`
  exits 0 at build b0f4ca..63 against the goldens re-accepted when CHK-KEY-01 2.1.0,
  CHK-KEY-02 2.0.0, CHK-PRT-03 2.0.0, CHK-PRT-04 2.0.0, CHK-KEY-04 2.0.1,
  CHK-SHT-04 2.0.1 and CHK-SHT-11 1.0.1 moved registryHash; every mesh hash
  and volume is unchanged and the report moves only by those checks (computed).
- 2026-10-10 (M06-T09): `npx --no-install hbf parity reference/conductors/blocks-stud`
  exits 0 against the goldens in `expected/`, build 0e4de7..a4, accepted at
  SOURCE_DATE_EPOCH 315532800 and rerun equal at 1000000000 (computed).
- 2026-10-10: `npx --no-install hbf check.run reference/conductors/blocks-stud`
  exits 0: 18 pass, 1 warn (CHK-PRT-05, the stud top at 11.40 mm off the
  0.25 first layer grid), 0 fail, 46 skip (computed).
- 2026-10-10: `npx vitest run reference/conductors/blocks-stud` exits 0
  (computed).

### Measured on a printed body

- None. Nothing here has been printed.

### Checked by machine

- `packages/archetypes/test/blocks.parity.test.ts` holds both presets and
  every peg mode to the originals' record (`test/legacy/blocks.json`).
- `core/test/arch-apply.test.ts` places this stud on a fresh prism with
  arch.apply and holds the checks on its features to this reference.

### Not verified by anything

- No print. Clutch, contact resistance and the socket bridge of a printed
  stud: unknown.
- The mesh has not been rendered and looked at by a person.
