# PIP (was HAFT): how it is made

A game controller printed in one pass on a four head printer: a PETG body
with two buried layers of conductive PLA traces, TPU keys printed in place,
conductive TPU contacts, and a Waveshare RP2040-Zero pressed into a pocket.
No resistors, no capacitors, no bought switches. This record is written from
the original code so a builder can make the same parts, the same way, and
make new things on the same pattern. It is the bar the owner set; nothing in
it comes from the quarantined mockups.

Number convention. Every number carries a qualifier: `computed` (the bench's
own solver, router or arithmetic, never put on a meter), `measured` (a meter,
a timer, a compile or a drive of the bench), `vendor` (a supplier figure),
`inferred` (reasoned, not checked) or `unknown`; or it cites the source file
and line that declares it (`layout.js:36` means the default is declared
there). Short paths:

| short | absolute path |
|---|---|
| ORIG | `fab-knowledge:originals/pip/` |
| SRC | `fab-knowledge:originals/pip/files/haft-src/` (unpacked `haft-src.zip`; `src/` is the kernel, `bench/` the shell) |
| REPO | `fab-knowledge:originals/pip/files/pip-controller/` (pip-controller at b137deb, copied without `.git`, `vendor/` and the large print blobs) |
| GOLD | `fab-knowledge:evidence/gold/pip-haft/` (the gold drive, its reports and all 133 shots) |
| DL | `fab-knowledge:evidence/x/downloads/dl-pip-latest/haft/` (older revisions for the failure lessons) |

Line numbers below cite `SRC/src/*.js` and `SRC/bench/*` unless a path says
otherwise. `SRC` is byte-contained in the canonical `haft.html` (checked by
the gold reader, `fab-knowledge:sources/gold/pip-haft.md` section 1).

---

## 1. Identity and revision

PIP and HAFT are one bench under two names. HAFT was renamed PIP for the
public repo hackbuild/pip-controller (D-013). Both descend from
`haft (6).html`: PIP is `haft (6)` plus four changes, and HAFT went on for
three more revisions after the PIP commit. Neither contains the other.

### 1.1 Canonical revision

| item | value |
|---|---|
| canonical bench | `haft (9).html`, copied as `ORIG/files/haft.html` |
| sha256 | `6c9717338b2e09a2364a464876da47116727f5c3fd8911beb6e87af0bd0b82ea` |
| date | 2026-09-18 21:37 local (file mtime, `~/Downloads/haft (9).html`) |
| bytes | 1932855 (measured); app code about 216 KB (measured), the rest is three r128, JSZip 3.10.1, manifold-3d 3.5.3 wasm and four fonts inlined |
| source | `ORIG/files/haft-src.zip`, sha256 `b7b9ca40f5e029da404e9c46e958898c379deabe85c15f2ba2aff6d4ce379b00`; unpacked at `SRC` without `vendor/manifold-classic.js` |
| required companion | pip-controller b137deb, 2026-09-18 18:12:56 -0700 (git), `REPO/pip.html` sha256 `a1fa88bd6ffa603c76059567c8b27c804536e39e7c07ec56c58daad55b001263` |

Why `haft (9)` and not merely the newest: it is the newest, and it is also
the good one. It carries every PIP UI behaviour; it adds the fixes that came
from handling the first printed set (bezel lip instead of pegs, header socket
contact, datum corner, grip ledge, anti-smear slots, print bleed, pry
scallops, socket fits); its exports reproduce the shipped files byte for byte
apart from two 3MF date fields; the gold drive ran about 150 interactions
with zero console errors (measured, GOLD/drive/report-A.json); and the owner
sliced its header-socket body on 2026-09-19 (`haft (5).3mf`, OrcaSlicer
2.3.2, body 14.88 mm, which is the socket body height, measured from the
3MF). It is not complete on its own: its firmware generator lacks PIP's
`GUARD_US` fix and ships `KEY_WAIT_US 200`, which a printed board showed to be
too short (section 3.13). So the canonical design is `haft (9)` for geometry,
UI and exports, plus PIP's firmware folder, probe and bring-up tools, which
are copied under `REPO/firmware/`, `REPO/flash`, `REPO/keys`, `REPO/mon`.

### 1.2 Revision table

| file | date (mtime) | sha256 (first 16) | what changed |
|---|---|---|---|
| `haft.html` | 2026-09-17 03:55 | `72b6e9fe3003c10c` | first bench; no coupon; Protopasta resistivity; stick stem 4.0 |
| `haft.3mf` | 2026-09-17 19:47 | `c0279c211c624318` | first printed set (stick layout), the set the failure lessons come from |
| `haft (1).html` | 2026-09-17 19:45 | `8ebc0810bacb9147` | coupon added; Yousu resistivity; reject threshold per row |
| `haft (2).html` | 2026-09-18 01:30 | `d840109b92705f87` | fits table; thumb pad printed in place; USB opening carried into the bezel |
| `haft (4).html` | 2026-09-18 07:50 | `69c992ce50524de5` | spring rib keyed into the end blocks; stem 4.0 to 6.0 with a conductive collar |
| `haft (5).html` | 2026-09-18 10:04 | `5c53ffcd882a36f4` | slot relief 1.2 over the arch |
| `haft (6).html` | 2026-09-18 10:37 | `eb928a19d9f3db83` | stick pad TOGGLE style; last common ancestor of PIP and HAFT |
| pip-controller b137deb | 2026-09-18 18:12 | `a1fa88bd6ffa603c` (pip.html) | insulation 0.48 to 0.96; stick pad split; tighter trace fits; `GUARD_US 2000`; probe and tools |
| `haft (7).html` | 2026-09-18 21:03 | `c1c2c6b5384b9116` | PIP's geometry changes plus bleed, socket contact, anti-smear slots, datum, grip ledge, bezel lip |
| `haft (8).html` | 2026-09-18 21:27 | `8f06b549387a3a16` | lip 1.6 deep, inset 3.6; pry scallop R 3.0, D 1.4 |
| `haft (9).html` | 2026-09-18 21:37 | `6c9717338b2e09a2` | socket OD 1.9 to 1.8; sockets stand on the floor; socket fits. Canonical |
| `haft (5).3mf` | 2026-09-19 07:13 | `91a88ac454c63669` | owner slicer save, OrcaSlicer 2.3.2, 0.24 mm process, body 14.88 |

Full table with bytes and app sizes:
`fab-knowledge:sources/downloads/dl-pip-latest.md` section 1.1.

### 1.3 Files in ORIG/files

| file | what |
|---|---|
| `haft.html` | the canonical bench, one file, opens from disk |
| `haft-src.zip`, `haft-src/` | kernel (`src/`), shell (`bench/`), `build.sh`, `README.md`, every test harness (`test/`) |
| `haft-design.json` | the worked example design, bench output |
| `haft-header-design.json` | the header-socket variant design |
| `haft.3mf` | worked example 3MF, bench output (shipped) |
| `haft-coupon.zip` | test coupon 3MF, coupon card and STLs, bench output |
| `print-card.txt` | worked example print card (shipped) |
| `haft-stick-card.txt` | stick example print card (gold drive export) |
| `haft.ino` | generated firmware for the worked example (gold drive export; lacks `GUARD_US`) |
| `haft-wiring.svg` | generated wiring drawing (gold drive export) |
| `pip-controller/` | PIP repo: `pip.html`, `src/`, `bench/`, `firmware/pip`, `firmware/pip_stick`, `firmware/pip_probe`, `flash`, `keys`, `mon`, `docs/`, `LESSONS.md`, `README.md`, `test/`, `examples/`, `print/print-card.txt`, `print/pip.3mf`, `print/pip-wiring.svg` |

Skipped as vendor-only: `vendor/manifold-classic.js` (manifold-3d 3.5.3 with
embedded wasm) in both trees, `package-lock.json`.

---

## 2. What it makes and for whom

A maker with a four head FDM printer (Flashforge Creator 5 Pro, 0.4 nozzle,
`layout.js:53`) opens one HTML file, picks a body shape and four button
groups, picks a switch type per group (flex cone, click spring, touch comb,
or a stick on the left), and gets a 3MF with every part on its print face,
a print card, a firmware sketch for the pin map, a wiring drawing and a test
coupon. The person assembles it with no soldering in press-fit mode: drop the
springs and caps in, lay the board in its pocket, press the bezel on, flash.

The reference build (worked example, `blankState`/`exampleState`,
`part2.js:11` to 22): 150 x 64 mm stadium, d-pad of four flex keys, four
click-spring face keys, two touch menu keys, body 13.68 mm, assembled 16.08 mm,
ten keys, twelve nets, 36 fit rows, no warnings (all computed, gold drive).

---

## 3. Shots

Copied from the gold drive (`GOLD/shots/`), Chrome headless with software
WebGL at 1280 x 860.

| file | caption |
|---|---|
| `fab-knowledge:originals/pip/shots/d-04-worked-example-step1.png` | Step 1 LAYOUT on the worked example: four pink flex d-pad keys with inlaid arrows, four click caps with inlaid letters, two touch combs, the hack.build mark inlaid over the board pocket; rail shows BODY and BUTTON GROUPS; DRIVE pad bottom left; status `fits bed, mesh current, no warnings, routed` |
| `fab-knowledge:originals/pip/shots/d-16-view-xray-hold-A.png` | xray while A is held: shell ghosted, A's net and the GND return lit pink, every other net dimmed; readout `A GP4 reads LOW (1.73 Mohm, crosses in 80 us)` (computed). The body in this frame is 204 x 80, the state the gold drive left after its width drag and typed depth (`GOLD/drive/drive.mjs:171` to 190), not the 150 x 64 worked example |
| `fab-knowledge:originals/pip/shots/d-step2-panel-click-spring.png` | CLICK SPRING panel: the solved force curve (N against mm), green dot at the snap peak, dashed amber contact line; readout peak 2.53 N at 0.63, after snap 0.59 N, drop 76 percent, contact 1.37 mm, strain 2.31 percent, behaviour clicks (computed) |
| `fab-knowledge:originals/pip/shots/d-step2-spring-Q2p6-latches.png` | the same panel at rise Q 2.6: the curve goes negative after the peak, behaviour `latches`, strain in red; the bench warns "click springs are bistable at this rise, keys will latch down" |
| `fab-knowledge:originals/pip/shots/d-46-stick-section-xray-hold-LEFT.png` | stick example, section plus xray while LEFT is held: the stem tilts, the conductive collar lands on the LEFT wall pad and the common ring above it; the LEFT net and GND lit through the ghosted shell; readout `LEFT GP28 reads LOW (1.69 Mohm, crosses in 76 us)` (computed) |
| `fab-knowledge:originals/pip/shots/d-20-view-explode-hold-A.png` | explode with A held: bezel lifted 22 mm, caps 30, springs 8 (`model.js:399` to 415); the A cap and spring move down. Same 204 x 80 drive state as d-16, not the worked example size |
| `fab-knowledge:originals/pip/shots/d-step3-panel-hookup.png` | HOOKUP panel: board top view with used pads pink and their function, per key table (pin, path Mohm, settles, wait, leak under), FIRMWARE .INO and WIRING SVG buttons, the computed note on the read. Taken on the 204 x 80 drive state (`GOLD/drive/drive.mjs:306`), so its key paths (1.59 to 1.77 Mohm, touch 0.99 and 1.01 Mohm, computed) differ from the worked example figures in section 5.10 |
| `fab-knowledge:originals/pip/shots/d-step4-panel-fits.png` | FITS AND CLEARANCES: every interface grouped (traces, flex key, click spring, touch pad, board, bezel, print) with value and a plain note |

Every other state (133 shots: rise sweep, wait too short, duplicate pin,
thin insulation, routing incomplete, bed too small, phone at 390 px) is under
`GOLD/shots/` and indexed in
`fab-knowledge:sources/gold/pip-haft.md` section 3.

---

## 4. Shared frame, stack and build order

### 4.1 Frame and units

x right, y toward the cable edge, z up from the bed, millimetres
(`layout.js:1` to 2, `model.js:3`). The body outline is centred on the origin.

### 4.2 The z stack (buried trace stack)

Declared at `layout.js:27`, built at `layout.js:166` to 171:

| slab | z (computed at defaults) | thickness source |
|---|---|---|
| bottom skin (PETG) | 0 to 0.72 | `stack.skin 0.72` |
| trace layer 1 (cPLA) | 0.72 to 1.44 | `stack.trace 0.72` |
| insulation 1 (PETG) | 1.44 to 2.40 | `stack.iso 0.96`, four layers |
| trace layer 2 (cPLA) | 2.40 to 3.12 | `stack.trace 0.72` |
| insulation 2 (PETG) | 3.12 to 4.08 | `stack.iso 0.96` |
| pad layer | 4.08 to 4.80 | `stack.pad 0.72` |
| floor (pads flush) | 4.80 | `z.floor = z.pl[1]` |
| body top | snapped need, 13.68 on the worked example | section 4.3 |
| bezel | top to top + 2.4 | `stack.bezel 2.4` |

Every slab is a whole number of 0.24 layers (`stack.layer 0.24`,
`layout.js:27`). The rail note says why insulation is four layers: two layers
means one bad layer bridges a crossing, and a buried crossing is
uninspectable (`part1.html:358`; `REPO/LESSONS.md`).

### 4.3 Body thickness is solved, never set

`layout.js:223` to 231. Needs: the board pocket (`floor + stand + board T +
usbH + clr`), a 1.44 floor minimum, the click spring (`floor + vTop +
flangeT`), the flex key (`floor + keyH - protrude - bezel`), the stick
(`topNeed`), the wire cups (`floor + cups.h + 0.6`). `ztop = snapUp(max(needs),
0.24)` with `snapUp = ceil(v / q - 1e-9) * q` (`layout.js:58`). The rail
says so in one line (`part1.html:218`). Face keys flex instead of clicky drop
the body from 13.68 to 9.84 mm; rise Q 1.5 to 2.6 moves it 12.72 to 14.40
(computed, gold drive).

### 4.4 The build pipeline

`doBuild()` (`part2.js:59` to 70) runs three pure calls, the same three the
node twin runs: `H.LAYOUT.layout(P)` then `H.ROUTER.route(L)` then
`H.MODEL.build(P, L, R)`. Inside `build` (`model.js:10` to 621) the order is:

1. conductors per net: both trace layers as one 2D region per net, posts and vias (`model.js:30` to 51)
2. switch geometry per key into five bags: `tpu`, `ctpu`, `cav` (cavities), `envAdd`, `bodyAdd`, plus per net conductors (`model.js:62` to 178)
3. board seat (`model.js:180` to 248)
4. bezel lip groove, pry scallops, peg sockets into `cav` (`model.js:249` to 265)
5. per net union, `decompose()` for connectivity, pairwise `minGap` (`model.js:268` to 285)
6. exact partition into four body parts (`model.js:288` to 298)
7. bezel plate, holes, ribs, pegs, lip, inlays (`model.js:301` to 363)
8. click elements and caps (`model.js:366` to 390)
9. objects, print poses, volume parity, plate packing (`model.js:393` to 448)
10. electrical rows, mech readouts, fits (`model.js:451` to 611)
11. `GEO.flush([])` frees every wasm object (`model.js:616`)

Exact partition (`model.js:288` to 296): `ctpuM = union(ctpu)`;
`tpuM = union(tpu) - ctpuM`; `condM = union(nets) - ctpuM - tpuM`;
`shell = (extrude(outline, 0, ztop) + envAdd) - union(cav) + union(bodyAdd)`,
then `shell - condM - tpuM - ctpuM`. Priority is contacts over keys over
traces over shell, so no two slots ever share a volume. Anything conductive
or TPU outside the envelope is reported as a note, expected for keys and the
stick (`model.js:297` to 298).

---

## 5. Mechanisms, circuits and constructions

### 5.1 Flex cone key (canon `flex-cone-key`)

What it does. A TPU cone printed in place buckles under the thumb and lands a
conductive TPU cap across two split conductive PLA half columns. Nothing is
assembled. Origin: FEELER's in-place cone.

Defaults (`layout.js:35`): face 10, cone height `Hs` 4.0, cone angle `alpha`
40 deg, wall 0.6, hole 3.6, cap 0.72, faceT 1.2, protrude 2.6, gapPct 45,
colGap 0.8. Group at x -44, y 1, pitch 14 (`layout.js:30`).

Derived (`flexDims`, `layout.js:149` to 160), computed at defaults:

| quantity | equation | value |
|---|---|---|
| horizontal wall | `wallH = wall / sin(90 - alpha)` | 0.783 |
| hole radius | `rh = hole / 2` | 1.80 |
| neck top outer | `rnt = rh + wallH` | 2.583 |
| cone base | `rsb = rnt + Hs tan(alpha)` | 5.940 |
| contact gap | `gap = max(1.2, gapPct / 100 * Hs)` | 1.80 |
| flare | `max(0, face/2 - rnt)` | 2.417 |
| key height | `keyH = Hs + cap + 0.24 + flare + faceT` | 8.577 |
| column radius | `colR = max(0.9, rh - 0.2)` | 1.60 |
| well radius | `wellR = rsb + 0.6` | 6.54 |

Construction, in order (`model.js:63` to 88):

1. Floor of the key `zf = snapN(max(floor, ztop + bezel + protrude - keyH), 0.24)` (`layout.js:231`), so the face stands `protrude` above the bezel.
2. Two conductive PLA half columns: a circle `colR` clipped by two half planes at `x = +-(colGap + bleed)/2`, extruded from the pad layer bottom `z.pl[0]` to `colTop = zf + Hs - gap`; the right half is the key net, the left half GND (`model.js:64` to 68).
3. Two 1.2 wide stubs from each half out to its terminal post at `termOff = colR + 0.55 + post` (`layout.js:371`, `model.js:69` to 70).
4. The TPU cone and its buried foot ring as one revolved profile (lathe, 64 segments): foot ring from `z.floor - layer` (one layer into the body) up to `zf`, then the cone wall to `zc0 = zf + Hs`. The kink points sit `EZ * Hs / (rIn - rh)` inside the well so no profile vertex lands on a cavity face (`model.js:77` to 81; this is CHK-KEY-06).
5. If the key floor is above the body floor, a cylinder `rIn` is cut under the cone (`model.js:82`).
6. The conductive TPU cap: a disc `rnt + 0.3`, 0.72 thick, from `zc0` to `zc1` (`model.js:83`). It bridges the 3.6 hole unsupported.
7. The key top as one lathe: collar over the cap, a 45 deg flare to the face radius, the face disc to `zf + keyH` (`model.js:86`).
8. The well: cylinder `wellR` from `zf` to the top, cut from the shell (`model.js:87`).

Rules and fits (`model.js:521` to 529): contact gap at least 1.2; cap bridge
at most 4.5; split at least 0.6 ("exposed, a string across it reads as a
press"); column to cone wall over 0.5 at the column top; face through the
bezel hole `2 (bezR - rFace)` with `bezR = rFace + 0.5` (`layout.js:238`);
stands proud at least 0.8. A warning fires if the column nearly touches the
cone wall (`colR + 0.6 > rh + gap tan(alpha)`, `model.js:71` to 72).

Feel readout (`part3.js:431`): soft under `wall / Hs` 0.16, medium under
0.24, stiff above.

Print. In place, no supports, the cap is the only unsupported span (3.6 mm,
`layout.js:35`). Flex each key a few times after peeling (assembly step 1,
`part2.js:148`).

Limits and lessons. A pressed cone travels about half its height, so the
contact gap is held at 35 to 50 percent of `Hs` (slider range `part1.html:233`)
and never under 1.2 (`layout.js:154`); deeper contact bottoms out before it
closes (`REPO/docs/switches.md`). The exposed split is the one place where
stringing turns directly into a stuck key; the coupon carries three split
widths for that reason. No print of the flex key has a recorded force or
contact resistance (unknown).

### 5.2 Click spring key (canon `click-spring-key`)

What it does. A double cosine beam spring printed flat in PETG snaps through
under the cap; a conductive TPU tip on its shuttle lands on two floor pads
just past the snap, so the click felt and the closure read are one event.

Defaults (`layout.js:36`): span `l` 24, beam `t` 0.55, rise `Q` 2.0 (times t),
width `w` 1.6, beam gap `g` 1.0, shuttle `sw` 3.0, end block `eb` 2.2, tip
3.2, cap 10, rib 0.8, flange 1.2, flangeT 1.0, protrude 3.0, E 1900 MPa,
slotClr 0.3, relief 1.2, endClr 0.4, capMat tpu. Face group x 42, y 1,
pitch 17 (`layout.js:31`).

The solver (`snapfe.js`, the whole file, 101 lines). A corotational
Euler-Bernoulli beam FE of one half cosine arch:

1. Nodes on `y = h/2 (1 - cos(2 pi x / l))` for x in 0 to l/2, `nel` elements (`snapfe.js:24` to 26).
2. Element stiffness: axial `EA/L0`, bending `k = EI/L0` with the 4k, 2k, 2k, 4k matrix, `A = w t`, `I = w t^3 / 12` (`snapfe.js:22`, 33 to 64).
3. Geometric stiffness from the axial force `N` and end moments (`snapfe.js:57`).
4. Boundary: node 0 fully fixed; the centre node holds u and theta (the shuttle suppresses the antisymmetric mode, as in a double beam) and its v is prescribed (`snapfe.js:28` to 30).
5. Displacement control in `steps` increments to `dmax h`; Newton iterations (40 max) with dense Gaussian elimination (`snapfe.js:7` to 19, 66 to 85).
6. Reaction at the centre times 2 for the half model; `summarize` multiplies by `arches` 2 and finds the first local maximum (peak), the minimum after it up to `2h` (valley), drop `1 - valley/peak`, bistable when valley is negative, strain `|ul/L0| + (t/2) max|M| / (EI) ...` per element (`snapfe.js:45`, 88 to 99).

The bench wraps it in `SNAPFE_RIGID` (`layout.js:108` to 113): the shuttle is
rigid, so the flexing span is `lEff = max(4, l - 0.5 sw)`, with `nel 18`,
`steps 56`, `dmax 2.0`; results cached by `l, t, Q, w, E, sw`
(`layout.js:98` to 106). Checked against linear theory to 5 digits
(flat-arch stiffness 0.585396 N/mm against 0.585394, computed,
`docs/plan/CANONS.md` section 5.3).

Heights in the spring's own frame (`clickerDims`, `layout.js:81` to 97):

| quantity | equation |
|---|---|
| rise | `h = Q t` |
| contact travel | `cg = max(dPeak + 0.15, 0.85 dValley)`, just after the snap, never before the peak |
| tip exposure, dovetail | `tipExp 0.8`, `dove 1.2` |
| lower beam base | `va = cg + tipExp + dove + 0.4 - h + t/2` |
| upper beam base | `vb = va + t + g` |
| stem | `stemH = cg + 0.45` |
| shuttle top | `vTop = vb + h + t/2 + stemH` |
| strain at the stop | max element strain for `d <= cg + 0.3` |

Readouts at defaults (computed, SNAPFE through the PIP model, CANONS 5.3):
peak 2.527 N at 0.629 mm, valley 0.594 N at 1.611 mm, drop 76.5 percent,
contact 1.369 mm, strain at the stop 2.31 percent, not bistable.

Construction of the spring part (`clickElement2D`, `model.js:683` to 704), a
2D cross section in (u along the slot, v up), then extruded `w` and placed:

1. Two cosine arches as offset polylines of 64 segments each, thickness t, bases `va` and `vb`, each running 0.4 past the span ends into the blocks.
2. Two end blocks `eb` wide, `hBlock = ztop - clickFloor - 0.12` tall (so the bezel sits 0.12 above them).
3. A groove in the bottom of each block, `rib + 0.4` wide, 0.8 deep, for the floor rib.
4. The shuttle rectangle `sw` wide from `cg + tipExp` to `vTop`.
5. The tip: a `tip` wide rectangle from `cg` to the dovetail, unioned with a dovetail trapezoid (1.2 at the root, 1.8 at the top, 1.2 tall). The frame is `blocks + arches + shuttle - tip - grooves`; the tip is its own part in slot 4.
6. Assembly placement: extrude `w`, rotate 90 about x, rotate to the slot angle, translate to the key at `clickFloor` (`model.js:372`). Print pose: every spring flat, stacked in y at `hMax + 3` pitch (`model.js:401` to 405).

Construction of the slot (`model.js:89` to 112):

1. Snug slot `C.w + slotClr` wide, `len = l + 2 eb + endClr` long, from `clickFloor` to the top.
2. Relief slot `C.w + slotClr + relief` wide over `l + 0.6`, so the beams never touch a wall.
3. Cap well: cylinder of the key's collision radius `b.r = cap/2 + flange + 0.4` (6.6 at defaults, computed; `layout.js:239`), not the bezel hole radius, from `ztop - flangeT - (cg + 0.6)` to the top (`model.js:96`). The flange (radius 6.2) therefore sits in a well 0.8 larger in diameter, which is the `cap flange in its well 0.80` fit row.
4. Two half pads flush with the slot floor, one key net and one GND, `u` from `0.3 + bleed/2` to 2.3 either side of centre, half width `min(0.75, slotW/2 - 0.1) - bleed/2`, so the drawn split is `0.6 + bleed`, 0.75 at the default bleed 0.15 (computed); the fit row note hard-codes "pads split by 0.60 mm" and does not follow bleed (`model.js:98` to 103, 539).
5. A rib under each end block, `rib` wide, 0.6 tall, added back to the shell (`bodyAdd`), keyed into the block groove (`model.js:106` to 109).
6. Slot direction is chosen in the layout from a per group try list: face keys try radial from the group centre, radial plus 90, 0, 90; menu keys try 90 then 0; shoulder keys try 0 then 90; every list ends with 45 and 135 deg. The first one whose padded rectangle hits no other cavity and whose ends stay 1.6 inside the outline; else the first try is kept and the warning "no clear direction for its click element slot" fires (`layout.js:314` to 345). The padded test rectangle is the slot plus a 1.2 wall on every side, and an accepted slot is pushed onto the cavity list so later slots avoid it.

The cap (`model.js:386` to 388): a flange disc `cap/2 + flange` by `flangeT`,
unioned with a stepped top chamfer (`chamferTop`, one 0.24 layer per step,
`model.js:624` to 635) up to `bezel top + protrude`. Slot 3 TPU, or slot 1
PETG when `capMat` is petg. The cap's chamfer is 0.48 (two 0.24 steps, `model.js:387`). Printed flange down, the same way up as assembled: its print pose only drops it to the bed by `ztop - flangeT` with no rotation (`model.js:410`), so the flange is the first layers and the chamfered top prints last.

Fits (`model.js:530` to 542): slot at the end blocks 0.2 to 0.6; slot over
the arch at least 1.0; slot length over the spring at least 0.2; rib in the
groove 0.40; under the bezel 0.12; cap through the bezel 0.50; flange in its
well 0.80; travel to contact over 0.6; tip over each pad over 0.5; beam at
least 0.4; strain at the stop at most 2.5 percent. Warnings: bistable ("keys
will latch down") and no snap ("raise Q above 2") (`model.js:508` to 509).
The rise window at defaults is Q 1.72 to 2.19 (computed, CANONS 5.3).

Print. Springs flat, one line thick beams (0.55), so the slicer's thin wall
handling has to be on (fit note, `model.js:540`). PETG fatigue line 2.5
percent for beams bent in the layer plane (empirical from HAFT failures at
2.7 to 3.3 percent, CANONS section 2).

Limits and lessons, all from the first printed set (`haft.3mf`, 2026-09-17):

- A uniform 0.3 slot was a push fit after print tolerance and the springs jammed; the slot is now stepped, snug at the blocks and 1.5 diametral over the arch (`haft (5).html`, `model.js:91` to 95).
- A snap-through arch only snaps when its ends cannot move. Loose in a slot, or in the fingers, it flattens. The rib under each block pins it (`haft (4).html`, comment at `model.js:104` to 105). Out of the slot it feels soft, and that is expected.
- Force goes with the cube of beam thickness: a beam drawn 0.55 that prints 0.45 gives about half the force (computed from `I = w t^3/12`). Measure a beam with calipers before moving the rise slider (`REPO/LESSONS.md`).
- Contact lands at a chosen point in the travel (`cg` above), so the click and the read are one event.
- Nothing has been on a force gauge; every force here is computed.

### 5.3 Touch comb key (canon `touch-comb-key`)

What it does. Interdigitated conductive PLA combs flush with the bezel top on
a PETG boss; a fingertip bridges the sense comb to the 3V3 comb. No moving
part.

Defaults (`layout.js:37`): d 12, finger 1.0, gap 0.8, spine 1.8, rim 0.6.
Menu group x 0, y -15, pitch 17 (`layout.js:32`).

Construction (`model.js:113` to 136):

1. A PETG boss: cylinder `d/2` from the body top to the bezel top, added to the envelope (`envAdd`), so it stands through the bezel hole (`d/2 + 0.3`).
2. Comb region radius `rc = d/2 - rim`; finger width drawn `fw = max(0.4, finger - bleed)`; pitch `finger + gap`; `nF = floor(2 rc / pitch)` fingers centred.
3. Two spines: the sense spine on the left (x from `-rc - 1` to `-rc + spine`), the drive spine on the right.
4. Fingers alternate: even from the sense spine, odd from the drive spine, each stopping `gap` short of the other spine. A finger whose reach inside the disc is under `rc - spine + 0.2` would be cut off its spine, so it is dropped (`model.js:125` to 127).
5. Each comb is unioned, intersected with the disc, extruded from `bezel top - 0.72` to the bezel top: sense to the key net, drive to 3V3.
6. A post from each spine centre (`xs = rc - spine/2`) down to the floor connects it to the trace layers.

Readout: fingers and copper area (`part3.js:438`). Fits: comb gap at least
0.6 ("exposed, skin bridges it"), finger at least 0.6, boss through the bezel
0.60 diametral (`model.js:543` to 547).

Limits. Skin is 1 to 20 Mohm (inferred, the bench assumes 20 Mohm,
`model.js:486`); the touch pins accept anything under about 58 Mohm
(computed), so a smear on a touch key is a weaker filter than on a mech key.
No touch key has a recorded measurement (unknown).

### 5.4 Stick (canon `tilt-stick`, PIP preset)

What it does. TOGGLE's mechanism: a TPU stem on a narrow neck anchored under
a PETG ring tilts in a round well; a conductive TPU collar on the stem lies
flat against the well wall at full tilt and bridges one of four low wall pads
to a common ring above them. A diagonal push lands on two pads, so it reads
eight directions.

Defaults (`layout.js:38`): neckD 3.0, neckH 2.4, bandR 4.8, bandH 2.4, tilt 14
deg, over 3 deg, stemD 6.0, capD 15, capH 1.2, capDish 1.6, capRings 3, top
`inplace`, padGap 0.8.

Geometry solve (`stickDims`, `layout.js:115` to 147), computed at defaults:

| quantity | equation | value |
|---|---|---|
| pivot | `zp = wellFloor + neckH` | well floor is `floor + 0.24` |
| band bottom radius, z | `rbl = bandR`, `zb0 = zp + (rbl - neckR)` (45 deg lead-in) | 4.80 |
| band top radius | `rbt = rbl - bandH tan(tilt)` so the band face is vertical at the tilt | 4.20 |
| well radius | `Rw = rbm cos(tilt) + zbm sin(tilt)`, rbm and zbm the band midpoint | 5.456 |
| contact height | `zc = zp - rbm sin(tilt) + zbm cos(tilt)` | |
| contact span | `span = bandH / cos(tilt)` | 2.47 |
| wall pads | z from `zc - span/2 - 0.8` to `zc - padGap/2` | |
| common ring | z from `zc + padGap/2` to `zc + span/2 + 0.8` | |
| rest gap | `Rw - rbl` | 0.66 |
| pad sector half angle | `max(20 deg, 45 deg - (padGap/2)/Rw)` | 41 deg (pads 82 wide) |
| contact arc at tilt t | penetration `pen = rbl cos t + (zb0 - zp) sin t - Rw`; `Re = rbl Rw / (Rw - rbl)`; half arc `asin(sqrt(2 Re pen) / Rw)` | 36 deg at 1 deg past, 62 deg at full tilt |
| eight way | `arcHalf + sectHalf > 45 deg` | yes |

Construction (`model.js:137` to 177):

1. Four wall pads: an annular sector `Rw - EZ` to `Rw + 1.7`, plus or minus `sectHalf` (narrowed by bleed), rotated to 0, 90, 180, 270 deg, extruded over the pad z band, one net each (RIGHT, UP, LEFT, DOWN).
2. A post from each pad at radius `Rw + 1.1` down to the floor.
3. The common ring `Rw - EZ` to `Rw + 3.9` over the ring z band, net GND, with its post at 45 deg, radius `Rw + 2.9`.
4. TPU anchor foot disc r 5.0 one layer thick under the floor, then a foot cylinder `neckR + 2` up to the well floor (`model.js:151` to 153).
5. The stem core as one lathe: neck `neckR` up to `zp`, a 45 deg cone out to `rc = min(stemR, rbt - 1.0)`, straight to the band top (`model.js:161`).
6. The conductive collar as a lathe on the outside of the stem: from `rc` at `zLead = zb0 - (rbl - rc)` (a 45 deg lead-in so it prints without support), out to `rbl` at `zb0`, up to `rbt` at `zb1` (`model.js:162`). The stem runs through it unbroken.
7. In-place thumb pad (`thumbProfile`, `model.js:668` to 681): stem `stemR` up to `zFl`, a 45 deg underside out to the rim `capD/2`, rim `capH` tall with a 0.35 chamfer, then a parabolic dish `dish (1 - (r/capR)^2)` with `capRings` grip rings 0.55 wide, 0.35 proud.
8. The pad height comes from `stickClear` (`model.js:637` to 664): bisection over 40 steps for the lowest `capBot` where only the rim clears the bezel hole at `tilt + over`, sampling 25 radii on the rotated profile. The underside of the bowl swings down into the hole. Bezel hole `capR + 0.8`.
9. Separate cap mode (`top 'press'`): a small stem through a tight hole (`hole = stemR / cos(ts) + (h + 0.5) tan(ts) + 0.3`) and a bored cap pressed on (`model.js:380` to 384).
10. The well: cylinder `Rw` from the floor to the top, 96 segments.

Fits (`model.js:548` to 572): band to wall at rest at least 0.4; band on the
pad over 0.5; arc 1 deg past over 16 deg total; arc at full tilt over 30 deg
total; diagonals reach two pads; pad to ring at least 0.4; bezel hole over the
pad; rim above the bezel over 0.3; pad diameter 12 to 22 ("a console thumb top
is 18 to 20"); collar at least 1.0; stem stress at a 20 N side push under 15
MPa with `sigma = 20 arm / (pi (2 stemR)^3 / 32)`; well wall to the outline
0.6. Stem stress at defaults 4.9 MPa (computed, CANONS 5.5).

Limits and lessons.

- The first stick made the whole band section conductive TPU on a 4 mm stem, right under the thumb pad where the moment is highest. One snapped off at once on the first printed set. The stem is now 6 mm, unbroken, with a 1.2 mm collar (`haft (4).html`; comment `model.js:157` to 158). The README quotes 38 MPa before and about 10 after; the model at defaults gives 4.9 (computed); the gap is unexplained in the files; the README figure may predate the low-sitting pad (inferred).
- A tilting contact starts as a line with no width and widens with travel; design contact resistance around first touch.
- The pad split and the ring split are the same `padGap`, because a string across either exposed gap holds a direction pressed for ever (PIP change, `layout.js:126` to 129).
- Wherever conductive filament carried load in this design it failed; wherever it is a skin over PETG or TPU it works (`REPO/LESSONS.md`).
- Click-in-view picks a direction from the hit point on the pad top, which sits above the pivot, so a click aimed west read DOWN from the default camera (gold flaw 14, `part3.js:71` to 74).

### 5.5 Buried trace stack and posts (canon `buried-trace-stack`)

What it does. Two buried conductive PLA trace layers carry every key net and
the GND and 3V3 commons inside the PETG body; vertical posts connect them to
the pads and contacts; printed vias join the layers.

Construction per net (`model.js:30` to 51):

1. Per layer, one 2D region: every routed polyline stroked at `wDraw = max(0.6, w - bleed)` (`GEO.stroke`: a thin spine polygon per segment, unioned, offset once by `w/2 - 0.04` with round joints, `geom.js:102` to 115), every terminal stub, a disc at every terminal and via.
2. Close the region by offsetting +0.01 then -0.01 (Miter) so tangent pieces fuse instead of pinching.
3. Extrude over the layer z band.
4. Vias: cylinder `sep(via)` from mid layer 1 to mid layer 2.
5. Terminal posts: cylinder `sep(t.r)` from mid layer 1 up to the floor + EZ.

`sep(r)` moves a radius 0.12 away from `w/2` when the two are within 0.12,
because a round cap and a post of nearly the same radius on one centre leave
sliver triangles; it also subtracts `bleed/2` (`model.js:26` to 29).

Net check (`model.js:268` to 285): union each net, `decompose()` must give one
piece ("net X is in N pieces"), pairwise `minGap(other, 1.0)`; anything under
0.3 is a warning; the closest 8 pairs are kept for the readout.

Fits (`model.js:515` to 520): bleed 0 to 0.4; width at least 0.8 (about
`w / 0.42` lines); net to net at least 0.4; insulation at least 0.72 ("two
layers is thin, one bad layer bridges them"); PETG over layer 2 at least 0.72.
At defaults: width 1.40, net to net 0.75 with bleed 0.15 (0.60 without),
insulation 0.96, PETG over L2 1.68 (computed, print card).

Print bleed (`haft (7)` onward). Multi-material FDM oozes at each colour
change, so a conductive edge lands wider than drawn. `route.bleed 0.15`
(`layout.js:28`) pulls every conductive edge back by half of it: traces drawn
1.25 to land at 1.4, splits, comb gaps and pad sectors opened by the same
amount, bumps and cups shrunk. The closest two nets went from 0.60 to 0.75
mm with no design number changed (computed, README). The plan holds bleed at
default 0 until a print confirms it (D-084).

Limits. The two thresholds disagree: the net check and the all-clear say 0.3,
the fit row requires 0.4 (gold flaw 15). Conductive PLA does not weld to
PETG; the interface is a mechanical key, which is fine only because the
traces are fully encased (README, Printing). The first millimetres of PETG
after a conductive extrusion are the least trustworthy insulation in the
part: prime tower and generous flush volumes are part of the electrical
design (`REPO/LESSONS.md`).

### 5.6 Two layer router (no canon; the one router of D-092 starts from it)

What it does. Routes every multi-terminal net on two layers with vias,
keeping a clearance between nets, PathFinder style.

Algorithm (`router.js`, whole file, 263 lines):

1. Grid over the outline bounding box at `route.grid 0.5` (`layout.js:28`); cells outside the outline less `margin 3.0` are blocked for all (`router.js:37` to 51).
2. Terminals are hard obstacles: each marks cells within `t.r + clr + w/2 + 0.15` as owned by its net; a cell owned by two nets is blocked for both (`router.js:57` to 69).
3. Stencils: trace zone `w + clr + 0.02` (no extra margin, or parallel lanes on the 2.54 pad pitch read as conflicts), via zone `via + clr + w/2 + 0.15` (`router.js:72` to 75).
4. A* per terminal over (layer, cell, incoming direction) with 8-connected moves, octile heuristic, no corner cutting through blocked cells, turn costs from `t = |d - m| mod 8` on the eight direction codes: 4 for a reversal (t 4), 0.9 for t 2 or 6 (90 deg), 0.35 for every odd t, which prices a 135 deg turn the same as a 45 deg turn (a quirk worth keeping in mind when traces zigzag), via cost `7 + pres (zone both layers)/2 + history` (`router.js:103` to 149).
5. Multi-terminal trees: terminals ordered by Prim; each new terminal routes to the existing tree (`router.js:150` to 193).
6. Negotiated congestion: nets in order of bounding box half perimeter; present cost `pres` starts 0.6 and multiplies by 1.7 per iteration; conflicted cells add 0.8 to history; up to `iters 24`; stop when no net crosses another's zone. From the second iteration on only nets that still cross another zone are ripped up and rerouted; a net's own zone is removed while it routes and while its conflicts are counted (`router.js:86` to 102, 195 to 226).
7. Output per net: per layer polylines with collinear points removed, stubs from exact terminal centres to their grid cell on both layers, vias, length; plus `hot` cells for leftover conflicts and `unrouted` count (`router.js:228` to 259).

Readout: nets, conflicts, unrouted, vias, GND tree length, worst path, min
gap (`part3.js:440`). Warnings name the fix: "N connections could not be
routed, widen the body or move groups apart" (`model.js:18`).

Limits. No guard on out-of-range designs: a 40 x 30 body set through the hook
blocked the main thread for over 20 minutes (measured, gold `hang.json`).
`hot` coordinates are never drawn on the stage (gold flaw 8). Route time
104 to 1127 ms, median 167, on software WebGL (measured, gold).

### 5.7 RP2040-Zero seat (canon `rp2040-zero-seat`)

What it does. Holds a Waveshare RP2040-Zero component side up in a pocket at
the cable edge and connects each used castellation to its net with no
soldering (bumps), with a soldered header (sockets), or with wires (cups).

Pad table (`zeroPads`, `layout.js:10` to 21): 23 castellations on one 2.54
grid inset 1.38 from the edges; left column 5V, GND, 3V3, GP29 to GP26, GP15,
GP14 (numbers 1 to 9), tail GP13 to GP9 (10 to 14), right column GP8 to GP0
(15 to 23). Board 23.5 x 18.0 x 1.0, USB height 3.26, USB overhang 0.8
(`layout.js:39`). The pad map is BAFFLE's.

Placement (`layout.js:177` to 184): USB edge flush toward the cable edge,
`by = H/2 - usbOver - L/2`; stand above the pocket floor is `bumpH` (0.48) or,
in socket mode, `pinLen + headerT` (5.5).

Construction (`model.js:180` to 248):

1. Pocket: rectangle board plus `clr` 0.3 each side, extended past the cable edge, from the pocket floor to the top; in wire mode the floor is raised by `bumpH`.
2. Back window under the board, cut whenever `board.window` is on and the contact is not `socket`, in any mode including wire: recessed two layers into the floor, inset 1.3 from the pad rows, clears the parts on the board's back (`model.js:192` to 195).
3. USB notch 12.5 wide, from `max(z.pl[0] + layer, usbCentre - 3.6)` up; carried into the bezel when the body is low (`model.js:196` to 198, 312). This came from a fit row catching a 5.5 mm USB opening on a low body (README).
4. Bumps: one conductive PLA cylinder `(bumpW + 0.2 - bleed)/2` per used pad, floor to `floor + bumpH` (`model.js:209`).
5. Or sockets (`board.contact 'socket'`): a conductive cylinder `(sockOD - bleed)/2` standing `pinLen` above the floor, bored `sockBore` from `floor + 0.72` (`model.js:203` to 207). Solder a 2.54 header under the board, trim pins to `pinLen`, press in.
6. Anti-smear slots: between neighbouring used contacts on one edge, a 0.7 x 3.2 slot 0.5 deep below the floor, so a smear or string has nowhere to bridge (`model.js:211` to 225).
7. Datum corner: packers on the far end (12 wide) and both sides (5 long) push the board away from the cable; the cable end keeps its clearance so the board drops in (`model.js:228` to 235).
8. Grip ledge: 10 wide, 1.2 deep, its underside 0.15 above the board top, over the far edge (`model.js:236` to 238).
9. Press ribs under the bezel: two 1.0 wide ribs over the castellation rows, reaching `boardTop - press` (0.3 interference), so the bezel clamps the board onto the bumps (`model.js:313` to 319).
10. Wire cups (wire or both): numbered conductive cups beside the pocket in the board's pad order so traces nest, `od 3.2`, bore 1.0 from `floor + 0.72`, height 3.0, pitch 5.2, six per row (`layout.js:40`, 256 to 280; `model.js:240` to 248).

Fits (`model.js:573` to 598): pocket at least 0.15; bump height at least
0.24; bezel squeeze 0 to 0.5; bump to bump at least 0.6 (0.84 at defaults,
computed); clearance under the board; USB opening at least 11 wide and 7
tall ("a USB C plug overmould is about 7 mm tall", inferred); cup bore at
least 0.8; cup to cup at least 1.2, with a note on whether a trace lane fits
between; socket bore 0.6 to 0.9 ("a 0.64 mm square header pin; the print
comes out about 0.1 small, which is the grip"); socket wall at least 0.45;
socket to socket at least 0.6; pin length at least 2.0.

Limits and lessons. The wire cup note once claimed a trace fits between two
cups; at 5.2 pitch the gap is 2.0 against a 3.0 lane, so it cannot (computed;
the fit row now says so). Sockets raise the body about 1.2 mm (13.68 to
14.88, computed). Whether bumps hold contact over time is unknown; the probe
(section 5.12) was written to answer whether a pad joined at all.

### 5.8 Layout solver and button groups

`layout()` (`layout.js:163` to 451). Four fixed groups (`layout.js:29` to 34,
186 to 216): LEFT CLUSTER (d-pad of UP, DOWN, LEFT, RIGHT at `pitch` from the
centre, or one STICK), FACE KEYS (X top, B bottom, Y left, A right), MENU KEYS
(SELECT, START at `pitch/2` either side), TOP L / R (mirrored x). Each group
has its own switch type. Collision model: circles of `b.r` per key (stick
`Rw + 3.5`), rectangles for the pocket and cup cavity, rotated rectangles for
click slots; pairwise circle-circle with a 1.2 wall, circle-rectangle, and
the outline test with a 1.6 margin (`layout.js:346` to 360). Terminals per
key type (`layout.js:372` to 391). One GPIO per logical key: duplicates and
missing pins become warnings ("GP4 is assigned to both B and A", "net B has
one terminal", `layout.js:398` to 421). Pins: UP GP29, LEFT GP28, RIGHT GP27,
DOWN GP26, X GP3, A GP4, Y GP5, B GP6, SELECT GP12, START GP10, L GP15, R GP1
(`layout.js:42`). Body outline: stadium (hull of two circles), slab (rounded
rectangle), grips (stadium plus two hulled lobes dropped by `drop`)
(`layout.js:61` to 78).

### 5.9 Bezel

Construction (`model.js:301` to 363):

1. Plate: the outline extruded body top to bezel top with a stepped top chamfer, one 0.24 layer per step, `bezelChamfer 0.96` (`chamferTop`, `model.js:624` to 635; `layout.js:26`). This is what the printer lays down.
2. Holes: flex `rFace + 0.5`, clicky `cap/2 + 0.25`, touch `d/2 + 0.3`, stick from `stickClear` (`layout.js:238` to 241).
3. Lip and groove (`bezel.lip`, `layout.js:41`): ring between the outline inset by `lipInset 3.6` and by `lipInset + lipT 1.2`; groove in the body is that ring grown by `lipFit/2` each side, `lipD + 0.3` deep; the lip is `lipD 1.6` tall with a foot narrowed 0.35 for its bottom 0.5 as a lead-in, and anything crossing a well or pocket is subtracted (`model.js:255` to 261, 321 to 326).
4. Pry scallops: a cylinder `pryR 3.0`, `pryD 1.4` deep at each side of the body top, kept clear of the groove (`pryR < lipInset`) (`model.js:262`, 589).
5. Pegs (optional, off by default): r 1.45 split pins with a 0.4 slot, sockets r 1.55, spots chosen far from every cavity near six targets at least 20 apart (`layout.js:423` to 449; `model.js:263` to 265, 320).
6. Inlays: labels in a single-stroke font stroked 0.64 and inlaid 0.48 deep in slot 2; d-pad arrows as triangles; the hack.build mark 0.48 deep in ink and 0.72 deep in pink, with the ink set clipped 1.6 inside the outline and the pink set left unclipped but subtracted from the ink (`model.js:328` to 363; `font.js`). Placement: face labels sit radially outside their key at `bezR + 1.4 + labelH/2` from the key centre; menu labels sit below at 0.8 of `labelH`; shoulder labels below at full `labelH`; d-pad arrows are triangles of size 1.3 at `pitch - bezR - 2.0` from the group centre; the mark is `min(15, board W - 3)` wide, centred over the board pocket 1.5 toward the far end. The font holds only A B C D E H K L P R S T U X Y Z 1 2 and space (`font.js:6` to 26); any other character in a label is dropped without a warning.
7. Print pose: flipped 180 about x onto its face (`model.js:399`), so labels read backwards in the slicer's bottom view, which is correct.

Lesson. Four pegs let the first bezel feel loose in the middle; the lip holds
the whole perimeter (README). The README says the scallop is 10 mm; the code
cuts 6 mm (`pryR 3.0`, gold card "6 mm wide"); the README is the drift.

### 5.10 Electrical model and the charge and release read (read model `charge-release`)

What it does. Turns printed geometry and resistivity into a path resistance,
a settle time and a reject threshold per key, and drives the drive pad, the
hookup table, the print card and the firmware constants from the same rows
(`model.js:451` to 503).

Equations (`model.js:452` to 497), SI units inside:

| quantity | equation |
|---|---|
| trace resistance | `R = len * rho / (w * trace)`, rho from `phys.rhoC` ohm cm |
| post resistance | `R = rhoZ h / (pi r^2)`, rho from `phys.rhoCz` (across layers) |
| flex switch | column posts at `0.7 colR` plus cap spread `rhoT (colGap + colR) / (cap * 2 colR)` and two cap through-paths |
| clicky switch | tip spread plus two tip through-paths on a 1.3 x w footprint |
| stick switch | `0.5 rhoT span / (bandH * 2e-3)` |
| key path | own trace + 2 posts + vias + switch + common return (GND, or 3V3 for touch) |
| pin capacitance | `Cpf = cpin + 0.02 pF per mm of trace + 1` |
| mech read | `tau = R C`; ok when `waitMech > 5 tau`; reject threshold `waitMech / (5 C)` |
| touch read | `tau = (20 Mohm skin + R) C`; ok when `waitTouch > 3 tau`; reject `waitTouch / (3 C)` |
| idle droop | `leak * waitTouch / cpin` volts |

Material presets (`part3.js:312`): Yousu `rhoC 500, rhoCz 2000, rhoT 400`
ohm cm (the default, `layout.js:46`; Yousu quote 100 to 200 kohm across 10 cm
of 1.75 filament, 240 to 480 ohm cm as extruded, vendor; printed parts assumed
worse, inferred); Protopasta `30, 115, 1500` ohm cm (vendor). Waits
`waitMech 0.2 ms`, `waitTouch 1.5 ms`; `cpin 7 pF` (inferred); leak 1 nA
(unknown, the RP2040 leakage spec is not confirmed, README).

Worked example, computed: key paths 1.505 to 1.723 Mohm, touch paths 0.911
and 0.929 Mohm, tau 15.7 us worst, settle (5 tau) about 78 us, reject about
4.35 Mohm for keys and about 58 Mohm for touch, droop about 0.2 V. Protopasta
moves key A from 1.73 to 0.14 Mohm (computed, gold drive).

Why charge and release. At megohm paths no pull up can work: it would need
tens of megohms, where pin leakage takes over. The firmware drives each pin
away from its active level for 30 us, floats it (`INPUT` means no pull on the
arduino-pico core), waits, and reads. The wait is the discriminator: a path
only counts if it crosses inside the wait, so a string or smear weaker than
the reject threshold is ignored. A shorter wait is a tighter filter and a
deader key (`REPO/LESSONS.md`).

Measured on a printed board, the decisive lesson. The first printed stick
build read nine of ten keys as dead with `KEY_WAIT_US 200`. Probing every pin
with `pip_probe` showed all ten paths close: pressed crossings 113 us (best)
to 2431 us (worst), eight of ten between 1067 and 2431 us; idle crossings 6.5
to 17.8 ms, two pins never crossing inside 20 ms (all measured,
`REPO/docs/electrical.md`). Contact resistance came out 10 to 30 times the
computed figure. `pip_stick.ino` sets `KEY_WAIT_US 3500`, between the two
populations (`REPO/firmware/pip_stick/pip_stick.ino:25`). Rule: measure both
populations, pressed and idle, and put the wait between them; never carry a
wait over from another print; a computed tau is never a wait.

Limits. The table and the pad print 5 tau for touch while the touch ok test
uses 3 tau (gold flaw 16). The droop warning fires over 1.0 V
(`model.js:502`).

### 5.11 Firmware generator (`firmware()`, `part2.js:206` to 339)

Emits an Arduino sketch for the design's pin map: board Waveshare RP2040
Zero, arduino-pico core, USB stack Pico SDK, the core's built-in `Joystick`
library. Constants: `KEY_WAIT_US = waitMech * 1000`, `TOUCH_WAIT_US =
waitTouch * 1000`, `CHARGE_US 30`. Arrays `MECH_PIN`, `TOUCH_PIN`, names, bit
indices; direction keys drive the X and Y axes (`axis(neg, pos)` 0, 512 or
1023), the rest are numbered buttons. `scanOnce()` charges all mech pins high,
floats, waits, reads LOW as pressed; then charges touch pins low, floats,
waits, reads HIGH. Debounce: two agreeing scans, 2 ms loop. Self test on `t`
at 115200: `crossTime` per pin, open after 20 ms, rough path in Mohm as
`dt / (C_PIN_PF * 1.05)`. The header comment states the worst path, its
crossing and the reject threshold from the model.

Required patches from PIP (the canonical firmware is `REPO/firmware/`):

1. `GUARD_US 2000`: interrupts off only for the first 2 ms of a crossing. Holding them off for 20 ms starved USB CDC and whole rows of the self-test table went missing (measured on hardware, `REPO/firmware/pip/pip.ino:63` to 81).
2. `KEY_WAIT_US 3500` until a coupon calibrates (measured basis above; `pip_stick.ino:25`). `pip.ino` still ships 200 (R-21 in `docs/plan/RISKS.md`).
3. Raw mode on `r` (toggle): every 150 ms `scanTimed` charges all mech pins high, floats them together and polls until each crosses LOW or 20 ms passes, then prints one `RAW t1 t2 ...` line in microseconds, 0 for never crossed. One shared float window keeps a pass near the key wait, so it can stream without stalling the gamepad (`pip_stick.ino:118` to 162). `pip_stick.ino` also carries the `GUARD_US 2000` crossing (`pip_stick.ino:73` to 91).

Measured compile: 58028 bytes flash, 9400 bytes RAM, zero warnings at
`--warnings all`, core 6.1.0, FQBN
`rp2040:rp2040:waveshare_rp2040_zero:usbstack=picosdk` (`REPO/CLAUDE.md`).

### 5.12 Bring-up tools (PIP only)

- `REPO/firmware/pip_probe/pip_probe.ino`: separates "key not pressed" from "pad never joined". FLOAT US repeats the firmware's crossing; CAP discharges a pin, releases it with the internal pull up on and counts to high over 300 repetitions, so a pin joined to a trace counts higher than a bare one; DRIFT compares a pin to its own baseline taken with the board out of the body (press `b`), which cancels the ADC mux on GP26 to GP29. A guided sweep on `g` allows 10 s per key. The header says what it cannot prove: a trace broken partway still adds area.
- `REPO/flash`: builds and uploads with arduino-cli, finds the board by USB vendor id 2E8A in either BOOTSEL (UF2 copy to `/Volumes/RPI-RP2`) or CDC mode.
- `REPO/keys`: live table of held keys, hit counts and raw crossing times (sends `r`).
- `REPO/mon`: pyserial monitor with a timeout and a send-on-connect argument; asserts DTR because the RP2040 holds CDC output until the host raises it.

### 5.13 Test coupon (canon MISSING; plan puts the coupon kind in the reference package)

What it does. A 134 x 70 slab on the same stack that measures everything the
controller depends on electrically, before the controller is printed
(`coupon.js`, 249 lines).

Cells (`coupon.js:45` to 150), twenty numbered 6 x 6 pads with engraved
numbers, each pad a flush square plus a post down to layer 1:

1. Trace runs on layer 1: pads 1 to 2 over 32 mm, pads 3 to 4 over a four-leg boustrophedon (148 mm by the README; the code sums `6 + 4 x 29 + |4 - yy|`).
2. A crossing: XA on layer 1 and XB on layer 2 cross; pads 5 to 7 must read open.
3. Exposed splits 0.6, 0.8, 1.0 shaped like a click pad pair, in an open well: pads 9 to 14 must read open.
4. A bump pair at the board pitch with a 0.6 anti-smear groove: pads 15 to 16 open; a wire across both reads a few hundred kohm.
5. One flex key wired to pads 17 to 18 and one click spring slot wired to 19 to 20, the spring and cap printed as separate objects.

The coupon card (`coupon.js:200` to 246) gives the expected resistance per
run from the current resistivity, the conversion `ohm cm = ohms x (w x
trace) / length x 0.1`, what an open or a bridge means, and to measure beam
thickness before changing the rise. The export step says print it first
(`part1.html:393`). The measured numbers go into step 3 and the design
rebuilds around them.

Coupon construction details (`coupon.js:10` to 198). The slab height is
`ceil(max(floor + keyH - protrude, floor + vTop + flangeT, floor + 5) / layer) x layer`
on the same z stack as the controller. Each pad is a 6 x 6 conductive square
1.2 thick flush with the top over a r 1.2 post to layer 1, its number
engraved 0.48 deep beside it in the single stroke font. The splits sit in an
open well 12 x 36 so the gaps are exposed as on a click slot floor. The bump
groove is 0.6 wide and 0.4 deep. The click spring slot stands along y, with
its ribs, relief and cap well cut exactly as in the controller, and the
spring and cap print as separate objects (`coupon-spring`, `coupon-cap`).
The coupon has its own pairwise `minGap` check with the same 0.3 warning.

Limits of the coupon, found on this check:

- It draws every conductive feature at nominal size: traces at `route.w`, the flex split at `colGap`, bumps at `bumpW + 0.2`, click pads with a 0.6 split, none drawn back by `route.bleed` (`coupon.js:41`, 95, 111, 146). The controller draws all of these back by `bleed/2`, so a coupon reading tests the uncompensated geometry, not the geometry the controller prints.
- The card closes with "the key wait in the firmware should be about five times the slowest settle the bench reports" (`coupon.js:244`). The printed board measured in section 5.10 shows that rule fails: pressed crossings were 10 to 30 times the computed figure and the working wait (3500 us) sits between the measured pressed and idle populations. Any port should replace that line with the measure-both-populations rule.

### 5.14 Fits table (`model.js:510` to 611)

`fit(group, name, value, ok, note)` per interface: 36 rows on the worked
example, 41 in the stick case (computed). Each note says what the printer
does or why the number is what it is ("holes come out about 0.15 mm small and
pegs about 0.05 mm big, so a 0.10 mm clearance on paper is a press fit in the
hand", inferred from prints, `part1.html:388`). A failing row renders
`check: <note>` in red, becomes a warning, raises the status count and prints
as `CHECK` on the print card (`part2.js:121` to 124). Smallest feature row at
the end (`model.js:603` to 609).

### 5.15 Objects, poses, plate and 3MF

Objects (`model.js:394` to 416): body (shell slot 1, traces slot 2, flex slot
3, contacts slot 4), bezel (slot 1 plus ink slot 2 and pink slot 3, flipped),
click-elements (springs slot 1, tips slot 4, flat), click-caps (slot 3,
flange down, same way up as assembled), stick-cap in press mode (flipped 180 about x). Each part goes through
`simplify(1e-4)` to collapse sliver triangles, moving no vertex more than
1e-4 mm (`model.js:421`). Volume parity between assembly and print pose
within 1e-3 relative or a warning (`model.js:438` to 439). Shelf packing on
the bed with 6 mm margins (`model.js:419` to 447); plate fit is a status chip.
Packaging (`pkg.js`): one Orca3MF object per object, one part per slot, the
printer and process names only (`'0.24mm Standard @FF C5'`), filament preset
pattern `Generic {TYPE} @FF C5P`, layer height 0.24 (`layout.js:53`).

Print settings (README, Printing): 0.4 nozzle, 0.24 Standard, slot 1 PETG 230
to 250 C, slot 2 conductive PLA 190 to 220 C, slot 3 TPU 95A, slot 4
conductive TPU dried first; one bed 60 to 65 C; prime tower and generous
flush; wipe into infill or object off; no supports, no brim (it welds the key
wells and the pocket). Slicer findings: the owner's TPU preset name
`Generic TPU @FF C5P` does not resolve in OrcaSlicer 2.3.2 and the bench's
filament overrides were lost; one slicer save sliced the 0.24 stack at 0.20
layers over a 0.25 first layer, which puts the 0.72 trace bands between
layers (measured from the 3MFs,
`fab-knowledge:sources/downloads/dl-pip-latest.md` section 1.5).

### 5.16 Memory discipline (`geom.js:11` to 64)

Every manifold method is wrapped so its result is pushed on a `live` list;
`GEO.flush(keep)` deletes all but `keep` after each build. `liveCount()` is
0 after every build and the heap stayed 29 to 43 MB over three rebuilds
(measured, gold `leak.log`). A page that rebuilds on every slider release
cannot leak wasm memory. Circles are rotated half a step so vertices stay off
shared support lines (`geom.js:77` to 83); `ext()` simplifies the cross
section at 5e-4 before extruding (`geom.js:96` to 99).

### 5.17 Wiring drawing (`wiringSvg`, `part2.js:342` to 391)

The WIRING SVG export and the live drawing in the HOOKUP pane
(`part3.js:448`) are one function. It draws the RP2040-Zero top view at 9
px per mm with the USB C body at the cable edge, every castellation as a 7
px circle (pink when used, gold when bare) labelled with its GPIO name and,
when used, its function (`GP4 A`); tail pads get labels rotated 90 deg. In
wire or both mode it adds each cup at its real position relative to the
board, grey with its bore, numbered, with its net under it, and a line from
the pad to the cup coloured by net (GND ink, 3V3 red, keys pink). The foot
note switches between "press fit: no wires. each pink pad sits on a printed
bump..." and the cup instructions. The drawing reads the layout's own
`usedPins` and cup list, so it cannot disagree with the geometry.

### 5.18 Design files, migration and shortcuts

`designJson()` writes `{app: 'haft-bench', v: 1, state}` (`part2.js:187`).
`loadDesign()` merges the loaded state onto fresh defaults: nested objects
merge key by key, arrays and scalars replace, and any key the current
defaults do not have is dropped, so a design saved before a setting was
retired still opens (`part2.js:188` to 197; the gold drive checked a
`retiredKnob` key being dropped). OPEN, SAVE, and dropping a `.json` file
anywhere on the page all go through it (`part3.js:481` to 485). Ctrl or cmd
Z undoes, shift Z or Y redoes, ignored while focus is in a field
(`part3.js:501` to 506). Undo flushes a pending snapshot first, so the last
edit inside the 450 ms debounce is not lost (`part2.js:41`).

### 5.19 Xray, section and plate rendering (`part3.js:194` to 232)

Xray hides the body's trace slot and the bezel, ghosts slot 1 at opacity
0.13 with depth writes off, and draws the per net meshes the model exports
(`netMeshes`) in a 12 colour palette, GND light grey and 3V3 red. Section
sets one clip plane with normal +y at the focused key's y (the last driven
key, else the stick, else the first key), keeps the far half, renders both
faces, and moves the camera to 90 mm from that key looking from the front.
Plate places every print pose at its packed position on a bed plane sized
to `bedW x bedD`, and ignores xray and section. Explode lifts each object by
its own `explode` value. All four compose with the drive pad, because press
animation works on vertex groups built per object and part after every view
update (`part3.js:116` to 153).

### 5.20 Readouts outside the fits table

- Grams per slot: print pose volume of every part in a slot times the Orca3MF material density for that slot's type (`part3.js:449` to 452).
- Build budget: a build over 2500 ms logs "build took N s; lower smoothness in step 4 or raise the routing grid" and the last two log lines show in CHECKS (`part2.js:68`; `part3.js:426`).
- Routing readout: nets, conflicts, unrouted, vias, GND tree length, worst path, min gap (`part3.js:440`).
- Stick readout: well radius, rest gap, wall pad and common ring z bands, bezel hole diameter, from `mech.stick` (`part3.js:439`).

---

## 6. UX anatomy

Shell: hack.build paper chrome. Ink header with the mark, `HAFT.bench`, the
tagline, UNDO, REDO, OPEN, SAVE, GUIDE; ink steps strip with numbered badges
(pink current, green visited); a sunk guide strip (`STEP N NAME` in VT323
pink, one sentence in Special Elite); void stage on a pink 26 px grid with a
paper rail on the right (340 px), ink status strip at the foot
(`part1.html:9` to 160). Fonts: Permanent Marker, Special Elite, VT323, IBM
Plex Mono. One pink `#FE0386`.

Welcome. Boots to a blank design built behind a card: one sentence of what it
makes and from what, a four cell step grid, and three starts: START BLANK,
STICK EXAMPLE, WORKED EXAMPLE (pink, the focal action). STICK EXAMPLE is the defaults with the left group set to the stick and the menu group switched from touch to flex (`part2.js:17` to 22). GUIDE reopens it
(`part1.html:193` to 205; `part3.js:486` to 490).

Steps and rail panes (`part1.html:207` to 400; `part3.js:253` to 258):

1. LAYOUT: BODY (shape chips; width, depth, bezel, bezel edge; slab corner and grip drop only in their shape), BUTTON GROUPS (on, d-pad or stick, flex/clicky/touch chips, x, y, pitch), CHECKS (warnings or the all-clear "no collisions, every net in one piece, clearances over 0.3 mm", then size, body, keys, nets), NEXT.
2. BUTTONS: only the switch types in use get a panel; FLEX CONE (ten rows, readout of gap, key height, cone base, wall, stands at, feel), CLICK SPRING (the curve first, then readout, eight rows and a SPRING INTERNALS fold), TOUCH COMB, STICK (thumb pad chips, eleven rows, readout). Empty state: "no button group uses a moving key yet. turn groups on in step 1."
3. BOARD: MOUNT (contact and mode chips, rows, a BOARD AND CUPS fold), PIN MAP (twelve selects, adc marked), HOOKUP (drawing, per key table, FIRMWARE .INO and WIRING SVG), BEZEL, MATERIALS AND READ TIMING fold (Yousu and Protopasta chips).
4. PRINT: STACK, ROUTING (readout), FILAMENTS (four fixed-role slots), SLICER PROFILE fold ("names only, never settings"), PLATE (bed, smoothness, auto rebuild, REBUILD NOW, SHOW PLATE), FITS AND CLEARANCES, EXPORT (3MF PROJECT pink, STL ZIP, PRINT CARD, DESIGN JSON, TEST COUPON, "print the coupon first", grams per slot, objects, triangles, plate, layers).

Stage. Cams strip top left: iso, top, front, under (exclusive) and explode,
xray, section, plate (toggles that compose). Legend top right keyed by slot,
with one line per active mode. DRIVE pad bottom left. Busy tag bottom right.
Own orbit: left drag orbits, other buttons pan, wheel 0.9 or 1.1, double
click fits (`part3.js:9` to 102).

Drive pad (`part3.js:363` to 394). One button per logical key (a stick
expands to UP DOWN LEFT RIGHT); pointerdown with pointer capture holds,
pointerup and pointercancel release; chords allowed. Holding animates the
mechanism in every view (flex vertices move down weighted by height, clicky
caps and springs follow the cosine, stick vertices above the pivot rotate
toward the summed direction, `part3.js:116` to 183) and in xray lights the
net and its return pink while dimming every other net to 0.22
(`part3.js:184` to 192). Readout per held key:
`<id> <pin> reads LOW|HIGH (<R> Mohm, crosses in <5 tau>)`; idle text
explains both pin populations. Clicking a key in the 3D view does the same
through a raycast (`part3.js:57` to 95). Section follows the last driven key.

Commit model (`part2.js:45` to 92). Range `input` previews, `change` commits;
320 ms debounce; one build at a time with one queued follow-up; a thrown
build keeps the bench alive; undo and redo are 80 JSON snapshots with a 450
ms debounce; colour edits are light commits with no rebuild. Status chips:
`fits bed` or `bed too small`, `mesh current` or `mesh stale`, warning count,
`routed` or `routing incomplete` (`part3.js:458` to 468).

Exports. 3MF project, STL zip (per part STLs plus card, design JSON,
firmware and wiring), print card, design JSON, test coupon zip, firmware
`.ino`, wiring SVG. Every export goes through `ensureMesh()` and pauses the
render loop. Deterministic apart from the 3MF date fields (measured, gold
section 3.6).

Print card (`part2.js:105` to 140): the Orca3MF slot block, then size, body
height in layers, trace and pad heights, supports none, brim none, objects on
the plate with sizes, assembly steps chosen by mode and type, the full fits
table with `CHECK` marks, the pin list with predicted kohm, the read
paragraph with the reject threshold, filament notes, warnings.

What makes it excellent (gold reader section 5, condensed):

1. The drive pad closes the loop from finger to firmware in one gesture, and the stage, the hookup table and the `.ino` read the same model rows, so they cannot disagree.
2. Physics sits next to the slider that drives it: the force curve, the contact line, the peak, and a one-word behaviour (soft spring, clicks, latches).
3. The fits table is a contract with the printer, in plain words, and a failing row becomes a warning and a `CHECK` on the card.
4. Warnings name the fix.
5. Derived quantities are readouts, never settings (body thickness).
6. Views compose with the drive pad: the stick in section plus xray with its net lit shows the whole mechanism in one frame.
7. The electrical model is honest about the material and tells you to print the coupon first.
8. Exports are deterministic and the shipped files are bench output.
9. One commit model with visible state.
10. The rail adapts to the design.
11. The welcome is the manual.
12. It runs from disk, offline, with a test hook from the first build.
13. The voice: lowercase, terse, the failure named.

Known UX flaws to fix in any port (gold section 7): dragging leaves
`mesh current` lit; the curve does not move while dragging; hook commits do
not refresh the rail; log lines stick in CHECKS; no guard on out-of-range
designs; a kernel crash at layer 0 is permanent until reload; print card
assembly copy drifted from the geometry (pegs named when the lip is on, cap
pushed on when the pad is printed in place; CHK-ART-10 in
`docs/plan/CHECKS.md`);
findings are not locatable on the stage; section only cuts through a key;
phone targets are 19 to 24 px; `stick.capH` default 1.2 sits under its 1.92
slider minimum; `exportBytes` throws on an unknown kind.

---

## 7. Tests and harness

In `SRC/test/` (identical in `REPO/test/`):

| harness | what it checks |
|---|---|
| `load.mjs` | node twin: evals the plain kernel scripts in global scope and boots manifold from npm |
| `t_fe.mjs`, `t_fe2.mjs` | FE sweeps over l, t, Q, w: peak, valley, drop, contact, strain at the stop |
| `t_layout.mjs`, `t_build.mjs` | layout and full build smoke |
| `cases.mjs` | nine hand cases plus blank, each exported and run through `validate_3mf.py --overlap` |
| `sweep.mjs <seed> <n>` | random designs, every build topologically clean (`meshcheck.mjs`) |
| `liveness.mjs` | every parameter must change geometry, readouts or firmware |
| `gaps.mjs`, `gaps2.mjs` | where conductors get close, in plane and between layers |
| `coupon.mjs` | coupon build, min gap, meshes |
| `export.mjs`, `routesvg.mjs` | export path, router drawing |
| `smoke.py` | Playwright: every step, slider, view and export; no console errors; no sideways scroll at 390, 768, 1280 |
| `islands.py`, `nmv.py`, `diag.py` | floating regions sliced at 0.24, non-manifold vertices, diagnostics on an exported 3MF |
| `shots.py`, `ship.py`, `dbg.py`, `overflow.py` | the same browser rig for screenshots, shipping and overflow |

`cases.mjs` shells out to `validate_3mf.py` under `/mnt/skills`; when it is
missing the harness did not run (`REPO/CLAUDE.md`). Hook for drivers:
`BENCH.ready`, `rev`, `built`, `busy`, `state`, `model`, `log`,
`loadDesign`, `designJson`, `firmware`, `wiringSvg`, `printCard`,
`ensureMesh`, `commit`, `exportCoupon`, `exportBytes(kind)` (`part2.js:394` to
417). Settled predicate used by the gold drive:
`BENCH.ready && !BENCH.busy && BENCH.built === BENCH.rev`, polled every 100
ms (`GOLD/drive/drive.mjs`).

---

## 8. Port map

Canon ids from `docs/plan/CANONS.md`;
reference ids from the same file's reference column; milestones from
`docs/plan/PLAN.md` and
`PACKAGES.md`. Lineage rows from
`lineage.json`, which holds
three rows, all rastermesh copies, none for this design.

| mechanism | package | feature kinds | canon id | reference id | milestone | lineage row |
|---|---|---|---|---|---|---|
| flex cone key | archetypes; mesh | pocket, contact, conductor x2 | flex-cone-key | buttons/flex-cone | M06 | MISSING |
| click spring key and SNAPFE | archetypes; mesh (spring); sim (FE curve, `sim/click-spring-window`) | spring, pocket, contact, conductor x2, pad x2 | click-spring-key | buttons/click-spring | M01 (FE port), M06 | MISSING |
| touch comb key | archetypes; circuit | conductor x2, port x2 | touch-comb-key | buttons/touch-comb | M06 | MISSING |
| stick | archetypes; mesh | conductor xN, contact xN, port xN | tilt-stick | sticks/pip-stick | M06 | MISSING |
| buried trace stack, posts, vias, net check | circuit; mesh | conductor, port | buried-trace-stack | conductors/buried-trace-stack | M05, M06 | MISSING |
| print bleed | mesh (inset stage) | none | MISSING (listed as a HAFT-only port candidate behind D-084, CANONS 3.1) | MISSING | unknown | MISSING |
| two layer router | copper (one router, D-092) | conductor (router output) | MISSING (no canon entry; D-092 names PIP as the core) | MISSING | M05 (parity: PIP stack routes at net to net 0.60 or more) | MISSING |
| RP2040-Zero seat: bumps, window, notch, ribs, cups | archetypes; board | pocket, contact xN, port xN, window | rp2040-zero-seat | seats/rp2040-zero-pressfit | M06 | MISSING |
| seat options: header sockets, anti-smear slots, datum corner, grip ledge | archetypes | contact, pocket | MISSING as entries (values listed under rp2040-zero-seat in CANONS 3.1) | MISSING | unknown | MISSING |
| bezel lip, groove, pry scallops, pegs, stepped chamfer | mesh; designs (PIP) | snap, chamfer, finger | MISSING (bezel group stays with the PIP design, CANONS 5.6) | MISSING | M10 | MISSING |
| label and mark inlay | inlay | inlay | MISSING | MISSING | M03 | MISSING |
| layout solver, groups, slot orientation | designs (PIP) via chase | none | MISSING | MISSING | M10 | MISSING |
| electrical model, charge-release read | circuit (read model on `port`) | port | read model `charge-release` (D-078) | MISSING | M05, M06 | MISSING |
| firmware emitter with GUARD_US and 3500 us wait | wiring or designs (PIP) | none | MISSING (CANONS 3.1 row on rp2040-zero-seat firmware) | MISSING | M10 (M10-T13) | MISSING |
| bring-up probe and tools | none in the plan | none | MISSING | MISSING | unknown | MISSING |
| test coupon | reference (coupon kind) | coupon | MISSING | MISSING | unknown | MISSING |
| fits table | checks | none | MISSING as a canon; rows asserted in M06-T08 | MISSING | M06 | MISSING |
| drive pad, views, commit model, welcome | ui, ui-core, chase | none | MISSING | MISSING | M09, M10 (M10-T14 PIP replica) | MISSING |
| plate packer and 3MF | 3mf; nest | none | MISSING | MISSING | M00 (3mf exporter binding) | MISSING |
| GEO memory discipline | mesh | none | MISSING | MISSING | M00 | MISSING |
| wiring drawing (`wiringSvg`) | wiring | none | MISSING | MISSING | unknown | MISSING |
| design file merge that drops retired keys | ui-core | none | MISSING | MISSING | unknown | MISSING |
