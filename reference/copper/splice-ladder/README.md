# SPLICE rev C as a ladder board on packages/copper

SPLICE rev C, the 29.8 x 25.9 mm copper tape breakout of the TRUNNION
bench (`knowledge/designs/splice.md`), read from its shipped cut file and
audited by the ladder rule and the weedability proof of packages/copper
(M05-T14, D-092). No generator for SPLICE was harvested, so the cut file
is the design.

covers: [CHK-NET-23]

| file | what |
|---|---|
| `legacy/splice-copper.svg` | the shipped copper cut file, one closed evenodd path per net (lineage `splice.copper/rev-c`) |
| `chase.surface.ts` | the ladder the README states: pitch 2.54 mm, one 1.6 mm trace width, the net names in path order (the key order of the bench's `splice3d.json`); a surface chase, named apart for the reason in `reference/copper/keyway/README.md` |
| `build.ts` | the declarations: the cut file, the names, pitch and width |
| `test/parity.test.ts` | holds the kernel to shapely's figures on the same file and to `expected/ladder.json` |
| `expected/oracle-shapely.json` | shapely 2.1.2 on the shipped SVG through the family's svgpath.py (`tools/py/copper/dump_splice.py`) |
| `expected/ladder.json` | the port's golden; rewrite with `HBF_ACCEPT_VINYL=1 npx vitest run reference/copper/splice-ladder` after reading the diff |

The cut file passes the D-166 SVG document sanitiser before any path is
read (D-240).

## What is verified, and what is not

### Verified on this machine

- 2026-10-08 (M05-T14): `npx vitest run reference/copper/splice-ladder`
  passes: seven nets, each one piece, areas equal to shapely's to 0.001
  mm2; least gap 0.940 mm (0.9399999976 from Clipper2's float32 rings
  against shapely's 0.9399999999999995), pitch less width; shapely's pair
  5V/GND is in the port's tie of seven pairs; no run of 0.5 mm or more is
  off orthogonal or 45 degrees; every net one piece after the profile's
  0.75 mm erosion (all computed).
- At a 0.80 mm erosion, half a 1.6 mm trace, SIGA empties and 5V, GND,
  SIGB, BASE1 and COL split, six nets, BASE2 alone stays one piece; the
  port and shapely agree net by net (computed). The card's five came from
  the 3-decimal rings of `splice3d.json`, where SIGB stays whole.
- Rows: SIGB, SIGA, 5V and GND run on one 2.54 mm grid at y 2.30, 4.84,
  7.38 and 9.92 (SVG y down); the runs at y 18.30 (GND, COL) and 22.80
  (5V) in the transistor and laser field are off that grid by 0.76 and
  0.18 mm (computed). The README's "every row sits on one 2.54 ladder"
  holds for the input ladder.
- 2026-10-09: `npx --no-install hbf parity reference/copper/splice-ladder`
  exits 0: 7 nets whole after the weed erosion, 0 split; ladder.json equal
  (computed).

### Measured on a printed body

- none: no SPLICE board has been cut from this file here.

### Checked by machine on geometry

- 2026-10-08: the weedability proof and the ladder audit on every run of
  `test/parity.test.ts` (exit 0).

### Not verified by anything

- That the shipped file weeds by hand: the proof is geometry only.
