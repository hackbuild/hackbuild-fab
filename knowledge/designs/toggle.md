# TOGGLE: how it is made

Record written 2026-10-05 from the original code. Slug `toggle`. Family TOGGLE: the solo and BLOCKS bodies, 4 way and 8 way, one bench.

Number rules for this file. A number in a code table is a declared value copied from the file and line named in that row. A number marked "computed" was rerun on 2026-10-05 with node v22.18.0 against the files in `fab-knowledge:originals/toggle/files/` (script: the kernel loaded with `vm.runInThisContext` in the order rastermesh, orca3mf, part2a to part2e, then `TOGGLE.build(TOGGLE.preset(k))` per preset). A number marked "measured" comes from the gold drive of the shipped page on 2026-10-05 (`fab-knowledge:evidence/gold/toggle/drive-run-desktop.txt`, summarised in `fab-knowledge:sources/gold/toggle.md`). "Inferred" means a reading of the code with no run behind it.

Short paths: `F` is `fab-knowledge:originals/toggle/files/`, `SRC` is `F/src/src/`.

---

## 1. Identity and revision

| field | value |
|---|---|
| name | TOGGLE, printed thumbstick |
| owner's slug | toggle |
| canonical file | `F/toggle.html` |
| sha256 | 865fabfd703dad5c7fefdd1adcb21be715356e3fa1e5d202f986ca4ab9a1977b |
| bytes | 1046843 |
| date | 2026-09-15 18:10 (mtime of `~/Downloads/toggle.html`, byte identical) |
| source | `F/toggle-src.zip` (sha256 4aa852e759763103b43bdb6b54a41a95243a894b7ab5622acf2118456b780b4c), unpacked at `F/src/`; parts stamped 2026-09-15 15:54 to 16:53; every part file is byte-contained in the html (checked by the gold reader 2026-10-05) |
| runtime | three.js r128, JSZip 3.10.1, four fonts, all inlined; opens from `file://` offline |
| print target | Flashforge Creator 5 Pro, four toolheads, 0.24 mm layers, one pass, no supports |

### 1.1 Every revision found

| where | file | date | sha256 | role |
|---|---|---|---|---|
| `~/Downloads/toggle.html` | bench | 2026-09-15 18:10 | 865fabfd...a1977b | same bytes as canonical |
| `fab-knowledge:evidence/x/toggle/` | bench, src zip, four preset kits, README | copied 2026-10-04 | as `SHA256SUMS` | harvest copy, canonical source of these files |
| `fab-knowledge:evidence/x/downloads/dl-pip-latest/toggle/toggle-solo4.3mf` | OrcaSlicer 2.3.2 owner save | 2026-09-16 11:32 | 19c1c8b34118e01461a9bb2073ffaf2fdccfeb5d963fca2b9a2edec9300b52bf | slicer save of the solo4 export with the owner's spools; geometry unchanged; kept as `F/owner-saves/toggle-solo4.orca232-owner-save.3mf` |
| same folder, `matrix_toggle_sim.html` | a 4 x 4 bistable pixel matrix sim | 2026-08-18 13:59 | 804d6c42cf3d4a980949bfb825c77d577ef41848d584b6312476ebfacbd754c4 | a different mechanism; see section 14; not copied |
| `fab-work-directory:benches/` | none | | | no toggle bench there |

### 1.2 Why this revision

There is one revision of the bench. It is also a good one, which is the bar: the gold drive on 2026-10-05 found 0 console errors, 0 page errors and 0 off-page requests (measured); all four presets build with no warnings, 0 pinch flips and 0 open edges (computed); fresh exports match the owner's shipped kits byte for byte except the two 3MF date lines (measured). The Sep 16 file is a slicer save of an export with the geometry unchanged. The later PIP and HAFT benches absorbed the stick but changed the read model and the stem; they are their own designs, and TOGGLE keeps the better drive pad and the tilt solver (section 9 of `fab-knowledge:sources/gold/toggle.md`).

### 1.3 What is in `files/`

| path | what |
|---|---|
| `toggle.html` | the shipped bench |
| `toggle-src.zip`, `src/` | part1.html, part2a to part2e.js, part3.js, part4.js, harness/, README.md, package.json |
| `README.md` | the owner's README (same bytes as `src/README.md`) |
| `extracted/rastermesh.js`, `extracted/orca3mf.js` | the two print-forge kernels as inlined in `toggle.html`; identical to `fab-knowledge:evidence/x/latest-haft-toggle/` copies apart from the one banner line the bake adds |
| `examples/` | the four preset design JSONs, print cards and pinouts; `toggle-solo4.3mf`, `toggle-blocks8.3mf` and `toggle-solo4-stl.zip` as representative exports |
| `owner-saves/` | the Sep 16 OrcaSlicer save |

Hashes: `fab-knowledge:originals/toggle/SHA256SUMS`.

---

## 2. What it makes and for whom

A low profile thumbstick that prints in place, in one pass, on four toolheads, with no supports. For a maker with a multi-head printer who wants a joystick that plugs into a breadboard (solo, header pins), solders to wire, touches pogo pins (pads), or presses onto a BLOCKS plate (BLOCKS brick at 8 mm pitch).

The welcome card states the mechanism in four sentences (`SRC/part1.html` line 208, verbatim): "A low profile stick that prints in one go on four toolheads, no supports. A TPU neck is the spring. A conductive TPU collar tilts into split pads on the well wall and bridges them, so each direction is a switch to a shared common. The traces, pins or BLOCKS studs print inside the body." The README adds that the neck is "both the return spring and the pivot" (`F/README.md` line 12). Read from the slab plan (section 5.3): the split pads are a direction pad below and a common ring above, and no conductor crosses the flexing neck (inferred from the feature list, `SRC/part2d.js` lines 279 to 292).

Filament slots, BLOCKS order (`SRC/part2a.js` lines 9 to 14):

| slot | role | default |
|---|---|---|
| 1 | body, floor, well, roof steps, lip, ledge | PETG cream `#F5F0E6` |
| 2 | direction pads, common ring and column, buried traces, pin cups or BLOCKS flanges, posts and studs | conductive PLA `#1A1A1A` |
| 3 | foot, flex neck, stem, thumb cap; plain BLOCKS socket rings | TPU pink `#FE0386` |
| 4 | contact collar; conductive BLOCKS socket rings | conductive TPU `#8A8A8A` |

Presets (`SRC/part2a.js` lines 29 to 40) patch only `body`: solo4 `{}`, solo8 `{dirs 8}`, blocks4 `{base blocks}`, blocks8 `{base blocks, dirs 8}`.

---

## 3. Shots

From the gold drive (headless Chrome, swiftshader, 1280 x 860, 2026-10-05). Copies in `fab-knowledge:originals/toggle/shots/`.

| file | caption |
|---|---|
| `d01-boot-welcome.png` | Welcome card over the built solo4: title, the mechanism in four sentences, a four step grid, four preset tiles with a one line blurb each, and the instruction to drag the round pad. |
| `d04-drive-north-held.png` | solo4 in iso with the pad dragged north to the rim: TILT 16.1 deg (the hard stop), DIR N, LEDs N and COM lit. The lit wedge is slime green, COM amber; the stick leans in 3D, lit pad and ring visible in the well. Rail shows STEM and TRAVEL with one note each. |
| `d10-view-section-plus-ghost.png` | Section plus ghost, stick held east: the PETG body at 0.16 opacity, the pink TPU stem and cap, the grey cTPU collar landing on the lit east pad (green) and the common ring (amber) above it, the floor trace and cups below. This is the shot that explains the mechanism. |
| `d09-view-ghost.png` | Ghost alone, stick still held east at 16.1 deg: every conductor solid (four wall pads, the ring, five pin cups and the floor traces) inside the faded body, with the pink TPU foot and neck visible in the well below the grey collar. |
| `d13-step1-square-gate-knurl-dome.png` | Edited state: square gate, knurl texture, dome top, contact tilt 18 deg, cap clamped to 30 mm by the harness's number field. The dashed contact curve on the pad becomes a rounded square; STICK READOUT shows contact 18.00, stop 19.99 / 24.5 (cardinal / diagonal). The knob sits on the NE diagonal at 20.0 deg and DIR reads E+N, the 4 way two neighbour format. |
| `d16-step2-rail-p2.png` | HOOKUP panel: the schematic generated from the build (TOGGLE box, MCU box, a pink pull up per direction to 3V3, ground on COM), six numbered hookup sentences with computed voltages, and the pin table. Stage still in the edited state of d13. |
| `d30-preset-blocks8-tilted.png` | blocks8 preset tilted to 22.5 deg azimuth: E and NE both closed, DIR reads 23 deg (centroid). Brick 3 x 3 studs plus three ledge rows of conductive studs; status ROUTED 2L. |
| `d28-warn-tiny-body.png` | Failure shown on purpose: auto size off, size 10. The body still builds, pads break through the walls, two red warnings name the 18.1 mm minimum and both router fixes; chips ROUTE FAILED and 2 WARN. |

The bar these set: a lit, flat-shaded 3D model on a void stage with a pink graph grid, a drive instrument on the stage, and a paper rail of instrument panels. Every view is the real built mesh, posed by the same contact model the readouts use.

---

## 4. Build pipeline and code map

```
ST (plain JSON, TOGGLE.blankState or a preset)
  -> layoutXY(S)        G: clamps, radii, well, sectors, terminals or BLOCKS positions, bbox
  -> routeAll(G, S)     R: layer count, lead angles, COM gap angle, net to terminal map, routed nets
  -> stack(G, layers)   floor slabs, zf
  -> solveZ(G, S)       contact zones, gate, roof, cap height, thContact, thStop, rest clearance
  -> rasterBody(G, S)   slab plan -> label grids -> pinch heal -> per slot meshes, keep-out and edge audits
  -> lathes(G, S)       TPU stick lathe with textured cap, cTPU collar lathe
  -> physics(G, S)      stiffness, force, strain, resistances, pull up, vLow
  -> parts {1..4}       raster slots 1, 2; slot 3 = TPU lathe + raster TPU; slot 4 = collar lathe + raster cTPU
```

`TOGGLE.build` is `SRC/part2d.js` lines 417 to 453. The kernel (part2a to part2e) is DOM free and loads in node unchanged (`SRC/../harness/load.js`). The shell (part3, part4) holds state, history, viewer, drive pad, rail and exports.

| file | lines | holds |
|---|---|---|
| `SRC/part1.html` | 234 | markup, CSS tokens, drive overlay CSS, mobile rules |
| `SRC/part2a.js` | 214 | slots, blankState, presets, small math, gate test, texture heightfields, cap top profile, lathe mesher, signedVolume, concat, quickEdges, edgeAudit |
| `SRC/part2b.js` | 296 | occupancy, profile sampling, Rodrigues hit test, thetaFirst, bandPen, setGate, solveZ, contact, stopAt, physics |
| `SRC/part2c.js` | 221 | binary heap, grid router with negotiated congestion, traceRects |
| `SRC/part2d.js` | 454 | layoutXY, assignments DP, stack, tryRoute, routeAll cache, routeSearch, features (slab plan), paintFeature, rasterBody, lathes, build |
| `SRC/part2e.js` | 108 | pinch healer with the three flip freeze |
| `SRC/part3.js` | 333 | ST, MODEL, history, commit and build loop, ensureMesh, setTilt, viewer, pose, drive pad |
| `SRC/part4.js` | 425 | plate layout, exports, BENCH hook, PANES schema, GUIDE, UI render and bind, custom panels, chips, header, boot |
| `F/extracted/rastermesh.js` | 353 | RasterMesh: label volume, greedy rect caps, conformed faces (print-forge asset) |
| `F/extracted/orca3mf.js` | 299 | Orca3MF: project 3MF writer, STL, print card (print-forge asset) |

Script order in the html: three, jszip, rastermesh, orca3mf, part2a, 2b, 2c, 2d, 2e, part3, part4.

---

## 5. Mechanisms, circuits and constructions

### 5.1 The stick: one TPU lathe (foot, flex neck, stem, cap)

What it does. One TPU body is the spring, the pivot, the stem through the lip, and the thumb cap. The foot is locked into the floor under the PETG lip, so the stick prints in place and cannot pull out.

Construction, in order (`SRC/part2d.js` lines 394 to 414, `lathes`):

1. Profile points in (r, z), counter clockwise, closed: `[0, zf0]`, `[rf, zf0]`, `[rf, zf1]` (the foot disc, inside the top trace layer, inset by `EPS` 0.001 top and bottom), `[rn, zf1]`, `[rn, zci]` (the neck and the core up through the collar), `[rs, zci]` if the stem is wider than the neck, `[rs, zcb]` (stem up to the cap base), `[Rd, zcb + (Rd - rs)]` (a 45 degree cone out to the cap radius, so the cap prints without support), `[Rd, zrim]` (the rim), then every point of `capTop` after its first (section 5.9; the first point is `[Rd, zrim]` again, so the loop starts at `k = 1`, line 404) with its texture flag. `[rs, zcb]` is pushed only when `zcb > zci` (line 400).
2. Revolve with `T.lathe(profile, 192, texture, PI/192)` (section 5.10). The half step start angle `PI/N` keeps seams off the axes.
3. Slot 3 = this lathe concatenated (no boolean) with any raster TPU from the body (BLOCKS plain socket rings). The lathe keep-outs in section 5.12 are what make the concatenation non overlapping.

Constants and equations:

| symbol | value or rule | source |
|---|---|---|
| neck radius `rn` | `neckD/2`, clamped 0.8 to 4 with a warning | `SRC/part2d.js` line 20 |
| neck length `neckL` | `max(2L, round(neckL/L) L)`, snapped to the layer | line 21 |
| foot radius `rf` | `rn + 1.2` | line 35 |
| stem radius `rs` | `stemD/2`; raised to `rn` if smaller; cut to `r1 - 0.3` with "stem cut to X so the collar keeps a top cone" | lines 30 to 32 |
| cap radius `Rd` | `max(rs + 1, capD/2)` | line 33 |
| rim `rimT` | `max(2L, rimT)` | line 34 |
| neck top `zn1` | `zf + neckL` | `SRC/part2b.js` line 134 |
| pivot `zp` | `zf + neckL * pivot`, pivot clamped 0.3 to 1.2, default 1.0 (neck top) | `SRC/part2b.js` line 135; `SRC/part2d.js` line 22 |
| segments | 192 | `SRC/part2d.js` line 395 |

Defaults (`SRC/part2a.js` lines 18 to 19): neckD 3.2, neckL 2.4, collarD 8.8, bandH 2.4, stemD 6, tilt 14, over 2, gate round, capD 14, rimT 1.2, top dish, topH 1.2, edge 1.6, dish 0.7, tex dots, texH 0.3, texP 1.6.

At solo4 defaults (computed): zf 1.92, zp 4.32, rn 1.6, rs 3.0, Rd 7.0, zci 10.322, zcb 11.64, zrim 16.84, stick top 18.34.

Fits and print. Brim off (it welds the stick to the lip), supports off, TPU at the preset volumetric limit with short retraction (print card, `SRC/part4.js` lines 47 to 49). Rest clearance to everything is `phys.minGap` 0.4 (default, `SRC/part2a.js` line 22), checked by sampling (section 5.4).

Limits and lessons.

- Stem strength is not checked. Through the band the TPU core is the 3.2 mm neck; a 20 N side push at the cap top (lever from band top 9.52 to cap top 18.34 = 8.82 mm) gives `20 * 8.82 / (pi 3.2^3 / 32)` = 54.8 MPa on the core (computed). HAFT's first stick snapped at this section and HAFT moved to an unbroken 6 mm TPU stem with a 1.2 mm cTPU collar (`docs/plan/CANONS.md` section 5.6). A port must add the stem stress row before TOGGLE becomes a reference.
- Neck strain readout `rn theta / neckL` is 18.7 percent at defaults (computed); the readout paragraph turns red above 25 percent (`SRC/part4.js` line 244) but no warning chip fires.
- The pivot at the neck top is an assumption. The README says a softer real neck rolls the band flat from its lower edge; the PHYSICS fold exposes `pivot` for that.

### 5.2 The conductive collar and its tapered band

What it does. A cTPU collar wraps the stick above the neck: it cones out at 45 degrees, runs a contact band, then cones back to the stem. The band is tapered by the contact tilt, so at that tilt the band stands vertical and lands flat on the well wall.

Construction (`SRC/part2d.js` lines 407 to 412):

1. Points `[rn + e, zn1]`; if a riser exists, `[r0, zn1 + (r0 - rn) - e]`; then `[r0, zb0]`, `[r1, zb1]` (the band); `[rs + e, zci - e]` if the band top is wider than the stem; `[rn + e, zci - e]` if the stem is wider than the neck or the band met the stem.
2. Revolve at 192 segments, no texture. Slot 4.

Equations:

| symbol | rule | source |
|---|---|---|
| `r0` | `collarD/2`, clamped `rn + 1` to 12 | `SRC/part2d.js` line 23 |
| band height | clamped 1.2 to 8 | line 24 |
| contact tilt `alpha` | clamped 4 to 25 deg | line 25 |
| overtravel | clamped 0.5 to 8 deg | line 26 |
| band top radius `r1` | `r0 - bandH tan(alpha)`; if under `rn + 0.4`, warn "band too tall for this tilt; the collar top would pass the neck" and set `rn + 0.4` | lines 28 to 29 |
| riser | `max(0, (minGap + 0.03 + r0 (1 - cos a)) / sin a - dz0)`, with `dz0 = neckL (1 - pivot) + (r0 - rn)` | lines 38 to 41 |
| band base `zb0` | `zn1 + (r0 - rn) + riser` | `SRC/part2b.js` line 136 |
| band top `zb1` | `zb0 + bandH` | line 137 |
| collar top `zci` | `zb1 + max(0, r1 - rs)` | line 138 |

The riser is a straight section under the band, added only when the 45 degree cone alone would leave the band closer to the wall at rest than the print gap. At defaults it is 0 (computed).

Limits. The collar is a lathe inside a TPU lathe; they are concatenated without a boolean. The collar starts at `rn + e`, so it touches the neck surface; slicers treat the two parts as separate bodies on two heads. The README asks the owner to measure the cTPU resistivity; 1500 ohm cm is a declared default (`SRC/part2a.js` line 22).

### 5.3 The well, the direction pads and the common ring

What it does. The well wall carries one conductive PLA pad per direction in a lower zone and a full common ring in an upper zone, split by a few PETG layers. The tilted band touches both and closes that direction to COM.

Plan view (`SRC/part2d.js` lines 38 to 56):

| symbol | rule | solo4 value (computed) |
|---|---|---|
| well radius `Rw` | `r0 cos a + (dz0 + riser) sin a` | 4.947 |
| pad depth `pd` | `padD` clamped 0.5 to 1.6, default 0.8 | 0.8 |
| pad lead radius `Re` | `Rw + pd/2` | 5.347 |
| COM column radius `RA` | `Rw + pd + clr + 0.5` | 6.847 |
| body need `needR` | `RA + 0.5 + edge` | 8.147 |
| sector centre | `2 pi k / n` from east, counter clockwise | |
| sector half angle | `pi/n - (gap/2)/Rw`; warn "sector gap leaves no pad" if under `0.6/Rw` | 4.633 deg half gap at gap 0.8 |

Fixed internals (`SRC/part2d.js` line 19): trace width `w` 1.0, clearance `clr` 0.6, lathe keep-out margin `cons` 0.2, body edge 0.8.

Vertical zones (`SRC/part2b.js` lines 139 to 152), all snapped to the layer `L`:

1. Contact line on the wall at the contact tilt: `zc0 = zp - r0 sin a + (zb0 - zp) cos a`, `zc1 = zc0 + bandH / cos a`.
2. Split `g = max(1, round(split)) L` (default 2 layers).
3. Pads B: from `zB0 = max(zf + L, dn(zc0 - margin))` to `zB1 = max(zB0 + L, nr(zm - g/2))`, `zm` the contact line middle.
4. Ring A: from `zA0 = zB1 + g` to `zA1 = max(zA0 + L, up(zc1 + margin))`.
5. Contact length on each: `contactB = zB1 - max(zB0, zc0)`, `contactA = min(zA1, zc1) - zA0`; warn "contact line only lands X mm on one pad; raise band height or cut the split" if either is under 0.5.
6. Roof starts 2 layers above the ring: `zr0 = zA1 + 2L`; lip is 3 layers.

At solo4 (computed): pads 5.28 to 6.96, ring 7.44 to 9.12, on pads 0.988 / 1.006, roof from 9.60, body top 10.56.

Slab features for the conductors (`SRC/part2d.js` lines 283 to 292):

- per direction: a 1.0 mm wide lead sector from the top trace layer to `zB0` at the lead angle (half width `0.5/Re`), then the pad sector `Rw` to `Rw + pd` over `a0..a1` from `zB0` to `zB1`;
- the ring: annulus `Rw` to `Rw + pd` from `zA0` to `zA1`;
- the COM bridge: a 1.0 mm sector from `Rw + pd - 0.3` to `RA + 0.5` at `phiA` over the ring height, and the COM column `RA - 0.5` to `RA + 0.5` from the top trace layer up to `zA1`. `phiA` sits in a sector gap (section 5.6).

Limits. The ring is one conductor around the whole well; its resistance enters every path (1.7 kohm at defaults, computed). The 3D view draws the pads as ribbons at `Rw - 0.04` (`SRC/part3.js` lines 182 to 198) so the lit state shows on the wall.

### 5.4 The tilt solver: occupancy, sampling and the first hit

What it does. Answers "at what tilt toward azimuth phi does this part of the stick first touch the body", against the same slab plan the raster painter prints. Every behaviour number is measured back from geometry, not drawn.

Construction (`SRC/part2b.js`):

1. `occ(G, x, y, z, dil, ignoreWall)` lines 10 to 23: outside the outline or above `zT` is air; below `zf` is body; below `zr0` the well wall is body at `r >= Rw` (skipped with `ignoreWall`, where only the band is meant to land); from `zr0` up, roof step `k = floor((z - zr0)/L)` is body outside `Rw - (k + 1) L` while `k < K`, and the gate hole (round, square or octagon, `inGate`, `SRC/part2a.js` lines 50 to 55) is air.
2. `profileSegs(G, forStop)` lines 44 to 60: stem segment from the pivot to the neck top, cone (or riser and cone) to the band, the band (tag `band`), the top cone, the stem; with `forStop` the stem runs 40 mm up instead of ending at the cap; otherwise the cap cone and rim (tag `cap`). Trims of 0.12 mm keep the corners next to the band out of the stem tag.
3. `samples` lines 26 to 42: points every 0.15 mm along each segment, keeping only points above the pivot, stored as (r, height above pivot, tag).
4. `hits(G, P, tags, phi, theta, dil, ignoreWall, psiList)` lines 70 to 96: each sample at azimuth `phi + psi` is rotated about the horizontal axis `u = (-sin phi, cos phi, 0)` by Rodrigues; `psi` covers -70 to +70 deg in 2.5 deg steps when tilted, 0 to 355 in 5 deg steps at rest. With `dil > 0`, 16 probes on a circle of radius `dil` in the (radial, z) plane test a clearance.
5. `thetaFirst` lines 98 to 109: 0 if it hits at rest; else scan 0.5 deg steps up to 36 deg, then 9 bisections. Returns `Infinity` if nothing hits.
6. `bandPen(G, theta)` lines 112 to 121: the band's radial reach past `Rw` at three points (base, top, middle) after tilting in the plane: `X = r cos th + h sin th`.

Results at defaults (computed): `thContact` 14.000 for a set 14, `thStop` 16.077 for 14 + 2, rest band gap 0.547, squeeze at the stop 0.146.

Limits. Sampling is radial and per azimuth; CANONS records this as the rule ("the stick's band clearance is checked by radial sampling, never by bounding box", `docs/plan/CANONS.md` section 4.1 limits). Cost grows with sample count; solveZ calls `thetaFirst` inside two loops (sections 5.5).

### 5.5 The solved gate, roof and cap height

What it does. The person sets behaviour (contact tilt, overtravel, print gap, gate shape); the solver sizes the lip hole so the stem lands on it exactly at contact plus overtravel, steps the roof in, lifts the roof if it crowds the collar, and raises the cap until it clears the lip past the stop.

Construction (`SRC/part2b.js` lines 155 to 219), in order:

1. `thS = alpha + over` (the target stop).
2. Gate radius by bisection, inside a roof lift loop of up to 16 passes (lines 162 to 180):
   - `f(rh)` sets the gate (`setGate`, lines 123 to 128: `K = ceil((Rw - rh)/L)` roof steps of one layer each, `roofTop = zr0 + K L`, `zT = roofTop + tLip` with `tLip` 3 layers) and returns `thetaFirst` of the stem samples toward east with the wall ignored.
   - bounds `lo = rs + minGap`, `hi = Rw + 1.5`. If even `hi` stops early, warn "stem meets the body at X deg, before the Y deg stop; thin the stem or the collar". If `lo` already reaches the stop, take `lo`. Otherwise 16 bisections for the smallest `rh` whose stop is at or past `thS`.
   - if the stem sampled at rest with a `minGap` dilation hits the roof, lift `zr0` one layer and repeat (`roofLift`).
3. Cap height (lines 182 to 199): start `zcb = max(zci, zT + 0.48)`; up to 60 passes, raise by half a layer until (a) the cap samples outside `rh + 0.3` clear the body at `thS + 1.5` deg with a 0.25 dilation, (b) for square and octagon gates also on the 45 deg diagonal at that diagonal's stop + 1.5 (capped at 36), and (c) the first stem or cap hit is at or past `thS - 0.1`.
4. Cap top profile and `ztop = max top z + texH` (lines 200 to 204).
5. Final numbers (lines 207 to 219): `thContact` from band samples with the wall included; `thStop` and `thStop45` from stem and cap with the wall ignored; `restOk` from all samples at rest with `0.98 minGap` dilation (and on the diagonal for non round gates); warnings when `|thContact - alpha| > 0.35` ("band meets the wall at X deg, not Y"), rest clearance fails, no stop within 36 deg, or the stop comes within 0.3 deg of contact.

Gate shapes (`SRC/part2a.js` lines 50 to 55): round `hypot < r`; square `max(|x|, |y|) < r` (inscribed half width r); octagon `max(|x|, |y|, (|x| + |y|)/sqrt 2) < r`. A square gate gives the diagonals more throw: with tilt 18 the stop is 19.99 on the cardinals and 24.48 on the diagonal (measured, gold drive).

`stopAt(G, phi)` (lines 249 to 255) returns the stop toward any azimuth, cached per 5 deg for non round gates; the drive pad uses it for the knob limit and the dashed contact curve.

At solo4 (computed): gate diameter 9.82 (rh 4.91), K 1 roof step, roofLift 0, zT 10.56.

Lesson. Solving the stop from the stem hitting the lip, and then checking the cap separately with a 1.5 deg margin, is what keeps the cap from becoming the stop. The rule to copy: solve geometry from behaviour, measure the behaviour back, warn when they differ by a stated tolerance (0.35 deg here).

### 5.6 The contact function

What it does. One function answers which pads close at a tilt and azimuth. The drive pad, the 3D ribbons, the LEDs and `BENCH.setTilt` all call it.

`T.contact(G, tiltDeg, phiDeg)` (`SRC/part2b.js` lines 224 to 246):

1. Below `thContact - 1e-6`: nothing closes.
2. Penetration `pen = max(0, bandPen(G, tilt))`; indentation `delta = 0.03 + pen` (0.03 mm declared light contact).
3. Band curvature against the wall: `rho = ((r0 + r1)/2) cos(alpha)`, `kappa = max(1e-3, 1/rho - 1/Rw)`.
4. Contact arc length `sArc = sqrt(2 delta / kappa)` (circle against circle, small sag); half angle `beta = min(pi/2, sArc / Rw)`.
5. A sector closes if either of its edges lies in `phi +- beta`, or `phi` lies inside it. The ring A always closes when on.
6. 8 way direction: the angle of the vector sum of the closed sector centres (centroid), so one pad or two neighbours give 16 directions.

Readouts from the same model (`SRC/part2b.js` lines 268 to 293): patch half angle at light contact 12.8 deg and at the stop 31.0 deg (computed); sector half gap 4.63 deg (computed); for 4 way, `diagonal` is true when the light patch is wider than the half gap (diagonals close two neighbours), `ghost` when the firm patch exceeds 45 deg plus the half gap (a hard cardinal press reaches a neighbour). Defaults: diagonal yes, ghost no (computed).

Checked by the drive (measured): `setTilt(14.2, 180)` closes W, `setTilt(13.8, 180)` closes nothing; `setTilt(30, 22.5)` on 8 way lights E and NE and reads 23 deg.

### 5.7 Physics and the electrical read (HOOKUP)

What it does. Turns modulus, resistivities and the routed trace lengths into force, strain, switch resistance, a recommended pull up and the pressed pin voltage, then writes the wiring as sentences.

`T.physics(G, S)` (`SRC/part2b.js` lines 258 to 295):

| quantity | equation | solo4 (computed) |
|---|---|---|
| neck stiffness `k` | `E (pi rn^4 / 4) / neckL`, E in MPa (N/mm2), N mm per rad | 55.76 |
| lever | `ztop - zp` | 14.02 mm |
| force at contact, stop | `k theta / lever`; contact uses the set tilt `alpha` (not the measured `thContact`), stop uses `thStop` or `thS` when no stop exists (line 264) | 0.97 N, 1.12 N |
| neck strain | `rn theta_stop / neckL` | 18.7 percent |
| collar resistance | `rhoT pathL / (max(0.5, patch) 0.8)`, `pathL = (zA0 - zB1) + 0.6 min(pad, ring heights)`, `patch = 2 sqrt(2 0.03 / kappa)` | 12.6 kohm |
| ring resistance | `rhoP (pi Rw) / ((zA1 - zA0) pd) / 2` | 1.7 kohm |
| per net | trace `rhoP len / (w traceT)` + column `rhoP col / (1.0 or pd)` with `col = zA1 - zf + 1` for COM and `zB0 - zf + 1` for a direction (line 277; the extra 1 mm is a declared allowance with no comment in the code) + vias `rhoP sepT / w^2` each + terminal (`rhoP 3 / (pi 0.25)` solo, `rhoP 3 / pi + 1500` BLOCKS) + ring for COM | pinout CSV column |
| switch | worst direction + COM + collar + `2 rc` | 42.0 kohm |
| pull up | next E12 value at or above `max(100k, 10 rSwitch)` | 470 kohm |
| pressed voltage | `vcc rSwitch / (rSwitch + pullup)` | 0.27 V |
| with a 45 kohm internal pull up | same with 45k | 1.59 V |

Resistivities are entered in ohm cm and multiplied by 10 to ohm mm (line 266). Defaults (`SRC/part2a.js` line 22): E 26 MPa, rhoP 30 ohm cm, rhoT 1500 ohm cm, rc 5 kohm per surface, vcc 3.3 V.

Across presets (computed): solo8 43.2k, 470k, 0.28 V, 1.62 V; blocks4 53.6k, 560k, 0.29 V, 1.79 V; blocks8 54.9k, 560k, 0.29 V, 1.81 V.

HOOKUP panel (`SRC/part4.js` lines 253 to 297):

1. SVG generated from `G.nets`: TOGGLE box left, MCU box right, one row per net with its terminal label; direction rows get a line to GPIO and a pink resistor box to 3V3 (alternating x so labels do not collide); COM gets a ground symbol and GND. Footer: "pink boxes: N ohm pull ups to the logic rail".
2. Numbered sentences with computed values: COM to GND; each direction to a plain INPUT with the recommended pull up, pressed reads LOW; worst path estimate and pressed voltage; "Do not use a built in pull up of about 45 kohm: the pin would sit at X V when pressed, inside the undefined band"; the ADC alternative with 100 kohm; 4 way diagonal rule or 8 way vector average.
3. Pin table: pin or stud, net, degrees, trace length, estimated resistance.

Changing cTPU resistivity to 6000 ohm cm moved the pull up to 1 M and the sentences followed (measured).

Limits. The resistance model is an estimate from declared resistivities; the pin press fit is excluded (stated in the panel note). CANONS keeps 470k as the TOGGLE preset value and charge and release as the PIP read; the computed E12 rule is the TOGGLE behaviour to keep.

### 5.8 Terminals: solo header, wire, pads; BLOCKS brick

Solo (`SRC/part2d.js` lines 60 to 89):

- `n + 1` terminals in a row at 2.54 pitch, centred on x, at `rowY` near the body edge (`-max(rowMin, H - edge - cupR)` for square), labelled P1 from the left seen from the top with the pin edge toward you.
- header: bore radius 0.45 (pins press up from below), cup radius `bore + 0.5`; wire: bore `max(0.3, bore/2)`; pads: cup radius 0.9 flush, no bore.
- square size: `Hmin = max(needR, rowHalf + cupR + edge, rowMin + cupR + edge)`, rounded up to 0.1; with auto off the set size is used and "body size under the X mm minimum" warns. solo4 is 18.2 square, solo8 24.0 (computed).
- round: `Rmin = max(needR, rowMin + cupR + edge)`; if any cup pokes past the circle a rectangular tab is added under the row (lines 72 to 77).
- cups rise to `boreTop = max(topTrace.z1, up(pinDepth))` plus 2 layers (`SRC/part2d.js` lines 429 to 433); bores stay air (feature order 9). At defaults bores are 0.9 diameter, 3.12 deep (computed). Warn "pin cups reach the top of the body" if `cupTop > zT - 0.5`.

BLOCKS (`SRC/part2d.js` lines 90 to 114, features lines 308 to 325):

- 8 mm pitch; body `studs x studs`, auto `max(2, ceil((2 needR + 0.2)/8))`; warn "body under N studs is too small for this collar".
- positions on the 8 mm grid; ledge rows added beside the body: `pegs both` or `top` add `ceil(nets / B)` rows; `bottom` uses sockets under the body that sit at least `Re + 0.65 + clr + 1.0 + 0.3` from the centre first.
- labels column letter and row number (A1, B4).
- floor stack (`SRC/part2d.js` lines 146 to 167): sockets `up(2.4)`, flange 2 layers, spacer 2 layers, trace layer(s), lip 3 layers; `top` mode replaces sockets and flange with a 2 layer skin.
- per used stud: cTPU socket ring r 2.3 to 3.3 (4.6 ID, 6.6 OD) for nets; plain positions TPU ring by default or a 2.45 radius PETG bore; cPLA flange r 3.3; cPLA post r 1.0 up to the ledge top or the trace layer; ledge stud r 2.4, 1.8 tall at `ledgeTop = max(6.4, ceil((zf + 2L)/3.2) 3.2)`, conductive when it carries a net.
- blocks4 3 x 3 body with 2 ledge rows, ledge top 6.4, floor 4.80; blocks8 3 ledge rows, ledge top 9.60, floor 6.00, two trace layers (computed).

Limits. "Plain positions get TPU rings by default. That is an assumption" (owner README). The BLOCKS standard is open in the plan (D-087).

### 5.9 Cap top profile and texture heightfields

`T.capTop(st, R, zRim)` (`SRC/part2a.js` lines 85 to 102): a quarter ellipse rounded edge of 10 steps (`b = clamp(edge, 0.3, 0.6R)`, height `topH`), then rings every 0.12 mm inward to the axis with `z = zRim + H - dish q` (dish), `+ dish q` (dome) or flat, `q = 1 - (r/Ri)^2`. Points after the first are flagged for texture.

`T.texture(st, Rin)` (`SRC/part2a.js` lines 58 to 82), all faded to 0 over the outer 0.9 mm with a smoothstep:

| kind | heightfield |
|---|---|
| dots | hex lattice pitch p (row spacing `p sqrt3/2`, odd rows offset p/2), dot radius `0.34 p`, raised cosine bump `h (0.5 + 0.5 cos(pi d / rad))`, one dot on the centre |
| rings | `h (0.5 + 0.5 cos(2 pi r / p))`, faded in from r 0.2 to 0.9 |
| ribs | `n = max(6, round(2 pi Rin 0.7 / p))`, `h max(0, cos(n atan2))^3`, faded in from r 1.2 to 2.6 |
| knurl | `h min(tri(u), tri(v))` on the two diagonals of pitch p |
| none | 0 |

Pitch floor 0.6 mm. `ztop` adds `texH` so the cap clearance and the readout include the texture.

### 5.10 The lathe mesher

`T.lathe(profile, N, zmod, a0)` (`SRC/part2a.js` lines 107 to 153):

1. Drop repeated points and a closing duplicate (a zero length edge revolves into degenerate triangles).
2. Each point with `r <= 1e-9` becomes one pole vertex; others become a ring of N vertices at angles `a0 + 2 pi i / N`; flagged vertices get `zmod(x, y)` added to z.
3. Quads between consecutive rings, fans to poles.
4. If the signed volume is negative (profile clockwise), flip every triangle.

`signedVolume`, `concat`, `quickEdges` (exact edge count on raw lattice positions) and `edgeAudit` (5 decimal welding, degenerate count) are lines 155 to 212.

### 5.11 Floor stack and the buried trace router

Floor (`SRC/part2d.js` lines 146 to 167): solo `skin 2L`, `L1 3L`, (`sep 2L`, `L2 3L` when two layers), `lip 3L`. At 0.24: skin 0 to 0.48, L1 0.48 to 1.20, lip 1.20 to 1.92 (computed). Trace thickness `traceT = 3L` (0.72), separation `2L` (0.48).

Router `T.route(spec)` (`SRC/part2c.js` lines 31 to 205):

| item | value | lines |
|---|---|---|
| grid | 0.2 mm (`tryRoute`, `SRC/part2d.js` line 171) | |
| moves | 4-connected, cost 1, turn penalty 2.5 | 66 to 68, 104 |
| vias | cost 30 plus congestion, any layer to any layer at the same cell | 68, 110 to 119 |
| heuristic | Manhattan | 107 |
| obstacle grid | Int16 per layer: -1 blocked, 0 free, net + 1 owned, -2 shared; terminals and pad leads are owned obstacles of radius `r + clr + w/2` | 37 to 57 |
| clearance | each committed path dilated by a square of `R = max(1, ceil((w + clr)/g) - 1)` cells | 34, 128 to 141 |
| negotiation | present cost starts 0.6, times 1.7 per iteration; history +1.5 per conflicted cell; conflicted nets reroute first | 153 to 176 |
| iterations | 22 (`SRC/part2d.js` line 203) | |
| pop cap | 400000 per search | 88 |
| order | shortest straight distance first | 148 to 152 |
| output | runs per layer with collinear points merged, vias, Manhattan length | 177 to 204 |

`traceRects` (lines 208 to 220) turns runs into rectangles `w` wide for the slab plan; vias become a `w x w` square in the separation layer (`SRC/part2d.js` line 299).

Route search around it (`SRC/part2d.js` lines 169 to 260):

1. Allowed area per layer: inside the outline less `w/2 + 0.6`; on the top trace layer, outside `rf + cons + clr + w/2` (the stick foot).
2. COM column angle: one of the sector gap centres, kept only if clear of every solo pin cup by `t.r + 0.71 + clr` (BLOCKS posts and flat pads stay in the floor so any gap works); sorted by angular distance to the terminal centroid; up to 3 tried. Warn "no sector gap is clear of the terminals for the common column" if none.
3. Assignment of nets to terminals: `T.assignments` (lines 121 to 143), an order preserving dynamic program over every rotation of the terminal ring, cost angular distance plus `0.02 x radius`, best few kept (2 on a quick 1 layer try, else 3).
4. Lead angles: variant 0 at sector centres; variant 1 bends each lead toward its terminal by up to `0.8 x slack`, `slack = half - 0.5/Re - 0.08`.
5. Layers: route mode `1`, `2`, or auto (1 then 2). First success wins; `tries` counted.
6. Cache: the last 6 results keyed by the plan view signature: terminal positions and radii, `Re`, `RA`, `rf`, sector centres and half angles, bbox, outline kind, `outR`, `outHx`, tab, BLOCKS foot, dirs, route mode, terminal kind (lines 208 to 217). A cache hit needs an identical key, so only edits that move the plan view reroute. Checked one edit at a time from solo4 defaults (computed): neck diameter, collar diameter, contact tilt, pivot, pad depth and sector gap change the key; neck length, band height, stem diameter, overtravel, gate, cap diameter, print gap, TPU modulus, layer height, split, zone margin and pin depth do not. Neck length and print gap move `Rw` only through the riser or a pivot below 1.0 (`SRC/part2d.js` lines 38 to 42), so at other settings they can reroute too (inferred).
7. Failure: warn "trace router could not connect every net; widen the body or switch routing to 2 layers" and build anyway.

Results (computed): solo4, solo8, blocks4 route on 1 layer at the first try; blocks8 needs 2 layers and 13 tries. Whole build time for blocks8 was 2.8 s in node on the checker rerun of 2026-10-05 (measured; the curator's run took 7.0 s, so treat build time as machine and run dependent). The COM column lands at 225 deg (solo4, blocks4) and 247.5 deg (solo8, blocks8) (computed).

Two router details the tables leave out. Pad leads and the COM column foot are obstacles on the top trace layer only, radius `0.65 + clr + w/2` for a direction lead and `0.71 + clr + w/2` for COM; terminals block every layer at `r + clr + w/2` and are owned by the net assigned to them (`SRC/part2d.js` lines 190 to 202). A net whose A* search fails ends that negotiation pass at once (`if (failed.length) break`, `SRC/part2c.js` line 163), so an unroutable net is never ripped up and retried at a higher present cost; the outer search then moves to the next assignment, lead variant, gap or layer count.

### 5.12 The raster body and the pinch healer

What it does. The PETG body, all cPLA conductors and the BLOCKS rings are painted as label grids per z slab and meshed by RasterMesh, raster in XY and exact in Z, so per slot meshes never overlap and sum to the solid.

Slab plan `T.features` (`SRC/part2d.js` lines 263 to 327): records `{z0, z1, lab, sh, ord}` with labels 0 air, 1 PETG, 2 cPLA, 3 TPU, 4 cTPU and shapes rect, disk, ring, sector, hole (roof step or gate), rects (traces). Paint order by `ord`: 0 outline, 1 well, roof steps, lip hole and lathe keep-outs, 2 wall contacts, 3 traces and vias, 4 cups, posts, flanges, studs, 5 socket rings, 9 bores and socket holes. Later features overwrite earlier ones.

Lathe keep-outs (lines 280 to 281): air disc `rf + cons` in the top trace layer (the foot) and `rn + cons` through the lip (the neck); `paintFeature` grows a `cons` disc by `c/sqrt2 + c` (line 335) so no cell centre test leaves a sliver against the lathe.

`rasterBody` (lines 348 to 391):

1. Collect every z breakpoint from the features; for each slab between breakpoints paint every feature spanning it, in order, on a grid of `print.cell` (0.1 default; chips 0.08, 0.10, 0.15) testing cell centres.
2. `RasterMesh.volume(W, H, c, X0, Y0).addSlab(labels, za, zb)` per slab.
3. `T.fixPinches(vol)` (section below).
4. Count keep-out intrusions: cells within reach of the foot disc in the top trace layer or the neck disc in the lip that are not air; any count warns "N body cells crowd the flex neck".
5. `vol.mesh()`, then `quickEdges` per slot; any open edge warns "body mesh has N non manifold edges at this grid; switch the body grid".

RasterMesh (`F/extracted/rastermesh.js` lines 1 to 270): faces only where two labels differ; z caps merged into greedy rectangles, x and y walls into runs; every face conformed to the lattice vertices on its edges and fanned from its centroid, which makes the result strictly 2-manifold.

Pinch healer `fixPinches(V)` (`SRC/part2e.js` lines 24 to 105): for every 2 x 2 x 2 window and every label L in it, the L cells and the not-L cells must each be face connected inside the window. Rules in order: (1) a not-L cell face adjacent to two L components becomes L; (2) an L cell face adjacent to two not-L components takes the commonest adjacent label; (3) dissolve the smallest L component; (4) dissolve the smallest not-L component into L. The TOGGLE change: a per cell flip count, and a cell flipped 3 times is frozen (lines 25, 51 to 53), because two windows that disagreed about one cell flipped it forever and the stock healer hit its pass limit with a pinch left (found by the TOGGLE sweep). Up to 200 passes; after the first, only windows near flipped cells are revisited (lines 32, 36, 102).

Results (computed): 0 pinch cells, 0 open edges, 0 intrusions on all four presets. Triangles: solo4 66562, solo8 81630, blocks4 129210, blocks8 170034.

This healer is the lineage row `healer/toggle-part2e` (canonical) in `lineage.json`, destination `packages/mesh/seed/rastermesh.js`.

### 5.13 Terminal and socket bodies in the slab plan

What it does. Turns each terminal into printed conductor and air so a pin, a wire, a pogo pin or a BLOCKS plate meets cPLA with no assembly but a press.

Construction (`SRC/part2d.js` lines 302 to 325, heights lines 429 to 433):

1. Solo header or wire: a cPLA disc of `cupR` from z 0 up to `cupTop = boreTop + 2L` (ord 4), then an air disc of `boreR` from z 0 up to `boreTop` (ord 9, painted last). The bore is open at the bottom face, so the pin enters from below and the 2 layer cap of cPLA above the bore closes it. At solo4: bore 0.9 diameter from 0 to 3.12, cup 1.9 diameter to 3.60 (computed).
2. Solo pads: a cPLA disc of radius 0.9 from z 0 to the top trace layer top, no bore; the bottom face is the pad.
3. Round outline: when a cup would poke past the circle, a rectangular PETG tab runs under the row from `rowY - cupR - edge` to `y1 = -0.35 outR`, `rowHalf + cupR + edge` each side, and only up to `max(cupTop + 2L, zf)` (line 273), so the tab is a low step, not a full height wall.
4. BLOCKS, per position on the grid (lines 313 to 324): a socket ring (cTPU slot 4 for a used net, TPU slot 3 for a plain position when `plain` is tpu) r 2.3 to 3.3 through the socket slab (ord 5); an air hole r 2.3 (or r 2.45 for a PETG bore) through the same slab (ord 9); a cPLA flange disc r 3.3 in the flange slab under a used socket; a cPLA post r 1.0 from the flange top (or the spacer bottom in `top` mode, which has no sockets) up to the ledge top for a ledge stud or to the top trace layer for a body position; a ledge stud r 2.4, 1.8 tall, cPLA when it carries a net and PETG when it does not.

Lesson. Every terminal is a stack of discs painted in order with air last; no boolean and no separate part. The socket bore and the pin bore are the widest bridges in the print (about 4.6 mm, owner README line 69).

### 5.14 The Orca3MF project writer (print-forge asset, inlined)

What it does. Writes a project 3MF that Orca, Bambu Studio and Flash Studio open with each part already on its toolhead and the filament list declared, from a single file page with no server.

Construction (`F/extracted/orca3mf.js`):

1. `build(cfg)` (lines 225 to 252) checks every part slot is within the filament list, then writes six entries: `[Content_Types].xml`, `_rels/.rels`, `3D/3dmodel.model`, `Metadata/model_settings.config`, `Metadata/project_settings.config` (JSON) and `Metadata/slice_info.config`.
2. Model (lines 86 to 125): one mesh object per part, one component object per design that references them with identity transforms, and one build item per copy translated to its plate position. Ids count up from 1; every UUID is the id in 8 hex digits plus a fixed suffix per kind (lines 30 to 36, 46), so two exports of one design differ only in `CreationDate` and `ModificationDate`, which carry the day (line 92). That is why the 2026-10-05 exports matched the shipped kits except those two lines (measured, section 6.6).
3. Model settings (lines 127 to 161): every part carries `extruder = slot`, a `mesh_stat` with zero repairs, `subtype normal_part`; the plate block sets `filament_map_mode` to `Auto For Flush` and one `model_instance` and `assemble_item` per copy.
4. Project settings (lines 163 to 202): printer and process names; with `writeFilaments` false only colour, settings id (from the pattern `Generic {TYPE} @FF C5P`) and type are written, so the machine's tuned presets stay; otherwise a verbatim filament template plus per material values (temperatures, density, volumetric limit, fans) from `MATERIALS`. Two guards throw: any per filament array whose length differs from the filament count, and any `extruder_variant_list` key.
5. `stl(part)` (lines 254 to 273): binary STL with an 80 byte header `orca3mf <name>` and computed facet normals.
6. `printCard(cfg)` (lines 275 to 295): printer, process, layer, grams per slot from `|signedVolume| / 1000 x density x copies`, the part to slot list, and the fallback for a slicer that imports one filament: open every STL at once as one object with parts.

TOGGLE feeds it from `pkgConfig()` (`SRC/part4.js` lines 23 to 29): one object `toggle`, parts named `body-slot1`, `contacts-slot2`, `stick-slot3`, `collar-slot4`, positions from `plateLayout()`.

Limits. The writer repairs nothing; parts of one object must not overlap (header comment, lines 21 to 22). TOGGLE meets that with disjoint raster labels and the lathe keep-outs (section 5.12).

---

## 6. UX anatomy

Shell (`SRC/part1.html`): ink header with the hack.build mark, `TOGGLE.` in Permanent Marker with a pink full stop, the tagline in Special Elite; undo, redo, open, save, guide. A four tile step strip (STICK, BODY, FILAMENT, PRINT) with numbered badges; a guide line `STEP N NAME` in VT323 pink and one sentence (`SRC/part4.js` lines 160 to 165). Main: stage left (flex), rail right at 340 px on paper. Status strip at the bottom in VT323.

Tokens (`SRC/part1.html` lines 11 to 15): pink `#FE0386`, cream `#f5f0e6`, paper `#fffdf7`, sunk `#efe9db`, edge `#e8e0d0`, ink `#1a1a1a`, void `#0a0a0a`, ok `#1f9d55`, warn `#c77700`, err `#c3251f`, slime `#a6e22e`, amber `#ffb020`; fonts IBM Plex Mono, Permanent Marker, Special Elite, VT323.

### 6.1 Stage and viewer (`SRC/part3.js` lines 67 to 256)

- Void background with a pink 26 px graph grid at 0.14 alpha (`SRC/part1.html` line 52).
- three r128 WebGLRenderer, antialias, alpha, `localClippingEnabled`; PerspectiveCamera 30 deg FOV.
- Lights: ambient 0.62; key 0.85 at (60, -80, 120); fill `0xffe0f0` 0.4 at (-80, 60, 40); rim 0.35 from below (0, 0, -100).
- Materials: MeshStandardMaterial per slot, flat shading, roughness 0.75 for cPLA and 0.55 for the rest, metalness 0.04, double sided. Colour from the slot (white becomes `#F4F1EA`).
- Floor: a dark plane at 0.55 opacity, 1.8 x the footprint, so the model reads as standing on something.
- Orbit: own spherical orbit (theta, phi, dist, target), z up; left drag orbits at 0.008 rad per px with phi clamped to plus or minus 1.5, shift or other buttons pan at `0.0015 dist` per px, wheel 0.9 / 1.1 with dist clamped 15 to 1500, context menu suppressed, double click fits; fit targets the bbox centre at 0.42 of the height, distance `max(dims) 3.4 + 10`.
- Cams: iso (-1.05, 0.62), top, front, under (-1.05, -0.8). Toggles that combine: section (clip plane y = 0, camera to front), ghost (slot 1 at 0.16 opacity, depthWrite off; every conductor and flexure stays solid), explode (TPU stick at 1.15 x ztop, collar at 0.6 x ztop, pad ribbons hidden), plate (bed lines every 16 mm in pink at 0.35, copies packed).
- Pose (`VIEW.pose`, lines 221 to 245): for every stick and collar vertex, tilt 0 below `zf`, linear ramp from `zf` to `zp` (the neck bends), full Rodrigues rotation about the pivot above. Pad ribbons recolour: slime for closed sectors, amber for the ring.
- Legend top right: swatch, slot number and name for each slot the build uses.
- Busy tag bottom right: BUILDING in amber while a build runs.

### 6.2 The drive pad (`SRC/part3.js` lines 259 to 328)

A 240 px canvas drawn at 120 px CSS (84 on phones) in an overlay at the stage's bottom left, with TILT (VT323, pink, 22 px), DIR, one LED per pad plus COM, and a hold checkbox.

1. Draw: a dark disc; one wedge per real sector (`-a1..-a0`, from the built geometry), slime when closed; an inner disc; a dashed amber curve at `thContact / stopAt(phi)` for every 10 deg of azimuth (a circle for a round gate, a rounded square for a square gate); direction names; cross hairs; a pink knob with a cream stroke at `tilt / stopAt(phi)` of the radius.
2. Input: pointer capture, `touch-action: none`; the drag sets `phi = atan2` and `tilt = min(1, r/R) x stopAt(phi)`.
3. Release: spring back `t0 exp(-t / 60 ms)`, cut to 0 after 6 tau or under 0.05 deg, time based so a slow frame rate still settles (about 360 ms).
4. Hold: keeps the tilt after release; unticking returns to rest.
5. Every change calls `setTilt` (`SRC/part3.js` lines 60 to 64), which clamps to `maxTilt(phi)`, calls `TOGGLE.contact`, poses the 3D stick, redraws the pad and the readout.
6. `maxTilt(phi)` (lines 55 to 59) is `stopAt(phi)`; when no stop exists within 36 deg it falls back to `thS + 4`, and to 20 deg before the first model exists, so the knob always has a finite rim.
7. After every rebuild `buildNow` clamps the held tilt to the new stop (line 38): a held stick never pokes through a lip that a geometry edit just moved.
8. Readout (lines 294 to 302): TILT to 0.1 deg; DIR is `none` below contact, the closed pad names joined with `+` on 4 way (`E+N` on a diagonal), and the centroid angle in whole degrees on 8 way (`23 deg`); one LED per pad in slime and a COM LED in amber.

### 6.3 Rail and the PANES schema (`SRC/part4.js` lines 111 to 159, render 186 to 227)

The rail is generated from one array of panes, one per step. A section is `{h, rows, note, custom, fold, show}`; a row is `num(k, label, min, max, step, unit, show)`, `chips(k, label, opts, show)` or `{k, l, bool}`. `show` is a predicate, so rows exist only when they act.

| step | panels |
|---|---|
| 1 STICK | STEM (neck dia 1.6 to 6, neck length 0.48 to 6 step 0.24, collar dia 5 to 20, band height 1.2 to 6, stem dia 1.6 to 12); TRAVEL (contact tilt 4 to 25 step 0.5, overtravel 0.5 to 8, gate chips); THUMB CAP (cap dia 6 to 30, rim 0.48 to 4 step 0.12, top chips, top height, edge round, dish or dome only when top is not flat, texture chips, depth and pitch only when texture is not none); STICK READOUT |
| 2 BODY | BASE (solo or BLOCKS, 4 or 8 way); SOLO BODY when solo (outline, auto size, size only with auto off, terminals, pin depth unless pads, wire bore only for wire); BLOCKS BRICK when BLOCKS (pegs, plain sockets, body studs with 0 meaning auto, the BLOCKS info readout); CONTACTS (pad depth, split layers, sector gap, zone margin); HOOKUP; PHYSICS in a fold (pivot, TPU modulus, cPLA and cTPU rho, contact R, logic V, print gap) |
| 3 FILAMENT | SLOTS (number, colour, name, type per slot, one note); MATERIALS (swatch, type and resistivity, the parts each slot prints, which change with the base) |
| 4 PRINT | PRINT (layer chips 0.20, 0.24, 0.28; body grid 0.08, 0.10, 0.15; trace layers auto, 1, 2; copies 1 to 24; bed width and depth; slicer profile fold); EXPORT; PRINT READOUT |

Commit model (bindings `SRC/part4.js` lines 209 to 228, history and build loop `SRC/part3.js` lines 11 to 54): slider `input` copies to the number twin only; `change` commits; numbers clamp to the slider range; chips and bools commit and re-render the rail; a slider or number commit re-renders the rail only for `stick.top`, `stick.tex` or `body.term` (`renderIfShapeChanged`, line 228), the three keys whose value shows or hides other rows, so a drag never rebuilds the DOM under the pointer. Commit bumps `rev`, marks dirty, schedules a build 320 ms after the last edit; the build runs in a 30 ms timeout so the busy tag paints; one build at a time, rescheduled while dirty. Undo stack of 80 JSON snapshots, 450 ms debounce, dedup by string; ctrl or cmd Z, shift Z, Y when focus is not in a field. Slot colour, name and type never rebuild (`SRC/part4.js` lines 344 to 347).

### 6.4 Readouts

- STICK READOUT (`SRC/part4.js` lines 232 to 245): stick top, body top, well dia, gate, contact, stop (and diagonal stop for non round gates), rest gap, squeeze, on pads (pad / ring), patch (light / firm), force (contact / stop), neck strain; one paragraph defining the terms and a sentence that changes with the design (diagonal and ghost results, the 8 way half step rule, red text above 25 percent strain).
- BLOCKS info (lines 246 to 252): body studs, footprint, ledge top, floor.
- HOOKUP (section 5.7).
- PRINT READOUT (lines 326 to 339): footprint, height, floor, trace layers, slabs, triangles, pinch cells, plate fits or over, grams per slot times copies (density PETG 1.27, PLA 1.24, TPU 1.21, ABS 1.04, ASA 1.05), the floor slab table from the bottom up, one sentence with pad and ring z bands and roof steps.

### 6.5 Warnings and status

Warnings print in red Special Elite at the top of every pane (`SRC/part4.js` lines 375 to 380); nothing pops up. Status chips (lines 362 to 374) carry words: ERROR text, CURRENT or STALE, ROUTED nL or ROUTE FAILED, NO WARNINGS or n WARN, FITS BED or OVER BED; plus dims, triangles and kernel ms. A chip longer than 40 characters is cut on screen and keeps the full text as its title.

A kernel exception never blanks the stage: `buildNow` (`SRC/part3.js` lines 28 to 39) catches it, sets `MODEL.error` and leaves `MODEL.m` on the last good model, so the old mesh stays on stage under an ERROR chip until an edit builds cleanly.

Welcome and presets (`SRC/part4.js` lines 401 to 410): the card opens at boot; a click on the dark backdrop or a preset tile closes it; GUIDE reopens it. A preset tile replaces the state with that preset but keeps the person's four filament slots, commits, returns to step 1, and refits the camera 400 ms later. Undo first flushes any pending snapshot (`SRC/part3.js` line 21), so an undo right after an edit returns to the state before that edit.

Every warning names the quantity, the limit and a fix or what was changed. Full list from the code: clamps (`raised to`, `cut to`), band too tall, stem raised or cut, sector gap leaves no pad, body under minimum, body under N studs, no clear sector gap, router failure, contact line short, stem meets the body early, band meets the wall off target, rest clearance, no stop, stop before firm contact, body top under ledge studs, pin cups reach the top, cells crowd the neck, non manifold edges.

### 6.6 Exports and the print card (`SRC/part4.js` lines 5 to 107)

| kind | file | contents |
|---|---|---|
| 3mf | `toggle-<base><dirs>.3mf` | Orca3MF project: one object, parts `body-slot1`, `contacts-slot2`, `stick-slot3`, `collar-slot4` on their filaments, copies from the plate layout, printer and process names, layer height |
| stl | `toggle-<base><dirs>-stl.zip` | one STL per part, `print-card.txt`, the design JSON, `pinout.csv`: one download is a kit |
| card | `...-print-card.txt` | Orca3MF card plus TOGGLE NOTES: print in place, supports off, brim off, layer height locked, TPU speed, dims, contact and stop angles, trace layers, the assembly step (press header pins up into 0.9 mm bores 3.12 deep, or flex the stick and press onto a BLOCKS plate), pinout, hookup line with the pull up |
| pinout | `...-pinout.csv` | `terminal,net,direction_deg,layer_route_mm,est_kohm` |
| json | `...json` | `{app: "toggle", v: 1, state}` |

Every export calls `ensureMesh()` first (synchronous build if stale) and pauses the render loop while packing. Plate layout (`plateLayout`, lines 5 to 17): pitch is the footprint plus 6 mm each way, `cols = max(1, min(copies, floor(bedW / dx)))`, rows as needed, the grid centred on the bed and offset by the bbox centre; it fits when `cols dx <= bedW + 6` and `rows dy <= bedD + 6` (the + 6 forgives the trailing spacing, inferred). The plate view draws copy 1 by moving the live model and copies 2 on as meshes that share its geometry objects and materials (`SRC/part3.js` lines 169 to 176); the pose writes into that shared position buffer, so every copy tilts with the drive pad (inferred). A failed export sets `MODEL.error` to "export failed: ..." and shows it as the ERROR chip (line 360). Exports are deterministic: a 2026-10-05 run matched the shipped kits byte for byte apart from the 3MF CreationDate and ModificationDate lines (measured).

`loadDesign` (lines 62 to 69) refuses a file whose `app` is not toggle and merges per top level key onto a blank state: an unknown top level key drops, a missing key inside a known group gets its default, `slots` (an array) is replaced whole, and an object group is merged with `Object.assign`, so a retired key inside `stick`, `body`, `phys` or `print` is carried along rather than dropped (harmless, since nothing reads it). Open accepts the file picker or a JSON dropped anywhere.

### 6.7 BENCH hook (`SRC/part4.js` lines 88 to 109)

`ready`; `model()` (meshes, dirty, building, tris, ms, warnings, dims, error); `state()` deep copy; `geom()` (thContact, thStop, thStop45, layers, zT, ztop, routed, phys); `setTilt(t, phi)` returns the contact record; `set(path, v)` sets and commits; `exportBytes(kind)` returns base64 for 3mf, stl, json, card, pinout, and throws `unknown export X` otherwise. `designJson` and `loadDesign` are globals. Settled predicate: `BENCH.ready && BENCH.model().meshes && !BENCH.model().dirty && !BENCH.model().building`.

### 6.8 What makes it excellent

1. The mechanism is the interface: the drive pad is drawn from the built sectors and the solved contact and stop per azimuth, and dragging it moves the 3D stick through the same contact function the readouts and hook use.
2. Every behaviour number is solved and then measured back from the printed geometry; set 14 reads 14.00, the switch closes between 13.8 and 14.2.
3. Electrical consequences come out as instructions with computed values, including the trap to avoid.
4. Failure still builds and shows in 3D, with a warning that names the limit and the fix.
5. Ghost and section answer the engineer's question: the collar lands on both the pad and the ring.
6. Exports are a complete, deterministic kit.
7. The kernel runs unchanged in node, so liveness, sweep, exports and slice audits test the code the page runs.
8. Rows show only when they act; colour edits never rebuild; presets keep the person's filament slots.

### 6.9 Flaws a port must not copy

From the gold drive (`fab-knowledge:sources/gold/toggle.md` section 6): boots into solo4 instead of blank; the camera does not refit after base or cap changes and explode pushes the stick off frame; section moves the camera to front but leaves iso outlined; too many pink elements per view (21 to 24 at 1280, measured); sliders do not mark STALE while dragging; step badges mean visited; exports are not gated on ROUTE FAILED; prose notes where the plan wants short ones; phone: welcome covers the header, the drive overlay covers a third of the stage, 39 controls under 44 px (measured); function style hook with no `rev` or `settled`; no stem stress check; a commit burst can chain builds (6.7 s for five sets 60 ms apart, measured); hex colours written into the 3MF and card.

---

## 7. Tests and harness

Shipped in `F/src/harness/`:

| file | what it checks |
|---|---|
| `load.js` | loads rastermesh, orca3mf (from the print-forge skill path) and part2a to part2e into node with `vm.runInThisContext` |
| `export.js` | presets or a design JSON to 3MF in node |
| `live.js` | 36 param changes, some with prerequisites (size needs auto off, bore needs wire, pegs, plain and studs need BLOCKS); signature = signed volume and index count per part plus ztop; prints DEAD for a param that changes nothing |
| `sweep.js` | seeded random designs over every enum, layer 0.2 to 0.28, cell 0.1 for the first 8 else 0.15; per design: strict edge audit, positive volume, route success, contact within 0.35 deg of the set tilt, finite stop, rest clearance, pinch budget; writes the first 8 clean designs as 3MF and JSON |
| `smoke.py` | Playwright over the page: each preset builds with no warnings, setTilt east, diagonal and low, every export; number field and slider commits; chips; section and ghost; plate; pad drag north and spring back; JSON round trip; undo; no sideways scroll at 390, 768, 1280 |
| `smoke2.py` | drag in four directions with spring back timing, hold, overflow on every step at three widths |
| `islands.py` | trimesh and shapely slice audit at the layer height: floating regions, overhang past 45 deg (one layer plus 0.06 buffer), bridges listed with width |
| `audit_dir.sh` | validate and islands for every 3MF in a folder, layer from the sidecar JSON |

Owner's results (README): 80 random designs build manifold and routed with contact on target; eight random designs and every example pass `validate_3mf.py --overlap`; no floating regions or overhangs; widest bridge a socket top about 4.6 mm.

Gold drive 2026-10-05: `fab-knowledge:evidence/gold/toggle/drive/drive.mjs` (desktop, every control and export), `drive-phone.mjs` (390 x 844, CDP touch drag), `live-node.cjs` (liveness including readouts). Liveness finding: PHYSICS E, rhoP, rhoT, rc move readouts only, so a liveness test must include readouts (measured).

---

## 8. How to make a new thing this way

The recipe TOGGLE proves, in build order:

1. Write the design state as one plain JSON object with defaults and presets that patch it.
2. Clamp every input with a warning that names the new value.
3. Lay out the plan view first (radii, sectors, terminals, outline), then route on it, then stack the floor from the layer count the router needed, then solve heights.
4. Describe the body as a slab plan of labelled shapes; let one occupancy function read that plan for the solver and one painter paint it for the mesh, so the solver checks what prints.
5. Solve geometry from the behaviour the person sets, then measure the behaviour back from the built geometry and warn past a stated tolerance.
6. Snap every derived height to the layer.
7. Mesh flexures as exact lathes and the body as a raster label volume; keep the two disjoint with keep-outs instead of booleans; audit edges and intrusions after meshing.
8. Expose one contact or press function and drive the stage instrument, the 3D pose, the LEDs and the hook from it.
9. Compute the electrical read from resistivities and route lengths, pick the resistor, and write the hookup as sentences with the computed voltages.
10. Generate the rail from a schema with show predicates; colour edits light, geometry edits debounced.
11. Ship a kit: 3MF with parts on their heads, STL zip with card, JSON and pinout, a print card that states the layer height the geometry depends on and the settings that would break the print.
12. Keep the kernel DOM free and run liveness (geometry and readouts), a seeded sweep, exports and a slice audit in node on the same files.

---

## 9. Port map

| item | value |
|---|---|
| packages | `archetypes` (tilt-stick def, TOGGLE preset: pull up read, Protopasta numbers); `copper` (router core plus TOGGLE assignment DP, layer escalation, cache: M05-T08, M05-T09); `mesh` (raster seed with the TOGGLE healer: M-1-T09, M00 raster); `circuit` (pull up read model, E12 choice); `checks` (contact tolerance 0.35, rest clearance, route failure, keep-out intrusions); `hackbuild-3mf` (Orca3MF dialect); `ui-core` and `ui` (BENCH adapter, ParamRail from PANES, drive overlay: M09); `chase` (M10; M16-knowledge-registry lists TOGGLE with no chase port yet) |
| feature kinds | pocket (well, cups), conductor (pads, ring, column, traces), contact (collar), port (terminals, studs), pivot (neck), per `fab-knowledge:synthesis/mappings.md` line 103; the stick and its flexure have no kind of their own |
| canon id (archetype) | `tilt-stick` (`docs/plan/CANONS.md` section 4.1 table and section 5.5); also `blocks-stud` for the BLOCKS sockets and studs, `buried-trace-stack` for the floor traces |
| canon id (mechanism) | MISSING: no mechanism entry for the flex-neck tilt pivot with a solved gate stop; `xy-toggle-matrix` (section 8.3) is a stub for the precursor sim only |
| reference id | `sticks/tilt-stick-4` (M11 lists it as written, M06-T09) and planned `sticks/toggle-solo4`, `sticks/toggle-blocks8` (`fab-knowledge:sources/latest/haft-toggle.md` section 6.4); none present under `reference/` on 2026-10-05; `sticks/tilt-stick-blocks` has no card and M11 marks it not needed; 8 way solo: MISSING |
| milestone | M9 (`synthesis/mappings.md` line 103); legacy adapter M09-T01 (`designs/toggle/legacy/`); router M05-T09; healer M-1-T09; archetype M06-T07 and M06-T09 |
| lineage rows | `healer/toggle-part2e` (canonical, `SRC/part2e.js`, sha256 3b08811c...89060c) present. MISSING: router (`part2c.js`, `part2d.js` 121 to 260), tilt solver (`part2b.js`), lathe mesher and texture (`part2a.js`), PANES schema and hookup generator (`part4.js`), drive pad and pose (`part3.js`) |

---

## 10. Precursor not taken as canonical

`matrix_toggle_sim.html` (2026-08-18, sha256 804d6c42...bfd75c4, `fab-knowledge:evidence/x/downloads/dl-pip-latest/toggle/`) is a 4 x 4 bistable pixel matrix: PETG cam rotors with four detents, TPU flexure islands, row selectors and column strobes, simulated with a fixed 0.15 ms step. It cites `mechanical_matrix_toggle.scad`, which was not found. It shares only a name stem with TOGGLE, uses a different visual language (teal and orange on dark, a canvas software renderer), and exports nothing. It is recorded here so a reader searching by name finds the distinction; it is not part of the sample set. CANONS holds it as the `xy-toggle-matrix` stub (declared: 18 mm pitch, stroke 4.0, 90 deg per click, column strobe 3.2, row travel 2.5).

---

## 11. Check of this record (2026-10-05)

A second reader checked 46 claims in this file against `SRC/` and `F/extracted/`, reran the kernel in node v22.18.0 on all four presets, and viewed all eight shots. Every computed value in sections 5.1 to 5.12 reproduced (contact 13.9995, stop 16.0767, Rw 4.9467, gate radius 4.9097, pull up 470k solo and 560k BLOCKS, switch 42.0k, 43.2k, 53.6k, 54.9k, triangles 66562, 81630, 129210, 170034, 0 pinch cells, 0 open edges; computed). Corrected: the welcome card wording (section 2), the cap profile start point (5.1), the route cache rule (5.11, which had said stick edits never reroute), the blocks8 build time (5.11), the loadDesign merge rule (6.6), the source of the slider bindings (6.3), the d09 caption (3) and a section cross reference (5.1). Added: terminal and socket bodies (5.13), the Orca3MF writer (5.14), router obstacle and failure details (5.11), the force and column terms in PHYSICS (5.7), drive pad fallbacks, post build clamp and DIR format (6.2), orbit limits (6.1), plate layout rule (6.6), error retention, welcome and undo behaviour (6.5).
