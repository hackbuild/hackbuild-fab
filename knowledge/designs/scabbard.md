# SCABBARD: how it is made

Record written 2026-10-05 from the original code. Slug `scabbard`. Family cases-joinery: the SATCHEL mark thumbdrive shell, a one piece four colour body that holds the board of a gutted USB-A drive, and its plug cap.

Number rules for this file. A number in a code table is a declared value copied from the file and line named in that row. "Derived" numbers are the values in `F/scabbard-dims.json`, which the bench wrote from `solve()` at defaults. "Measured" numbers come from the headless drive on 2026-10-05 (config `fab-knowledge:originals/scabbard/shots/_drive.json`, log beside it) or, where marked, from the STL checks in `fab-knowledge:sources/benches/benches-cases.md` section 3. "Computed" means worked by hand.

Short paths: `F` is `fab-knowledge:originals/scabbard/files/`, `SB` is `F/scabbard.html`.

---

## 1. Identity and revision

| field | value |
|---|---|
| name | SCABBARD r2, SATCHEL drive shell, one piece plus cap |
| owner's slug | scabbard |
| canonical file | `SB` |
| sha256 | e43210b00c3812511fea2f8d7c6727bf07bff3d4fb0dfbe1e6e8a35408eaa0a1 |
| bytes | 49526 (1104 lines) |
| date | 2026-08-23 15:04 (mtime of `~/Downloads/scabbard (1).html`, byte identical) |
| source | the page itself: three script blocks, the first two UMD so they load in node (geometry `window.SCABBARD`, SB 160 to 568; exporters `window.SCABEXPORT`, 569 to 746; app, 747 to 1104) |
| runtime | three.js r128 from cdnjs (SB 159); everything else inline; needs the network for three, and states that every export still works without WebGL |
| print target | any four toolhead FDM printer; 0.2 layers put the 0.6 inlay at three layers (README) |

### 1.1 Every revision found

| date | file | sha256 prefix | what it is |
|---|---|---|---|
| 2026-08-21 10:40 | `scabbard.html` (r1), copied to `F/precursor-r1/scabbard-r1.html` | 163dc1aa | separate lid with a lip and snap, raised board seat; scale locked to the plug width: `s = autoWidth ? (plugW + 2 tabClear) / 72 : caseW / 120`, so most sliders moved only hidden internals (dl-cases.md section 6) |
| 2026-08-23 15:04 | `scabbard (1).html` = harvest | e43210b0 | canonical r2 |

### 1.2 Why this revision

r2 is newer and is the fix for r1's failure: in r2 the pocket comes from the drive, the silhouette from the pocket and everything else from the mark's aspect, so every slider moves the visible fob (section 5.1). The drive on 2026-10-05 built it with 0 errors and reproduced the dims readout (body 22.6 x 31.3 x 8.7, pocket 12.8 x 21.0 x 4.7, cap 15.5 x 8.0 x 11.6, 42.9 on a keyring, measured).

### 1.3 What is in `files/`

| path | what |
|---|---|
| `scabbard.html` | the bench |
| `scabbard-4color.3mf` | the default build, four colours (sha256 a22eabf5...ac711) |
| `scabbard-dims.json` | every parameter and every derived number at defaults |
| `stl/` | body, inlay amber, inlay mint, inlay bone, cap, cap end, in print pose |
| `logo/` | the SATCHEL mark with the punk displacement baked into paths, eight colourways in punk and flat, PNG previews; `logo/source/` the repo originals with the SVG filter |
| `README.md` | owner README |
| `precursor-r1/scabbard-r1.html` | r1 |

Hashes: `fab-knowledge:originals/scabbard/SHA256SUMS`.

---

## 2. What it makes and for whom

A keyring fob for the board of a cheap USB-A thumb drive, cut to the SATCHEL mark (a notched cartridge with five pin tabs along the bottom). "Nothing screws, nothing snaps together, there is no seam across the face." The board slides in through the bottom edge until it stops against the top wall; a separate cap covers the plug. The five tabs sit on the front and back skins, above and below the plug in Z, "so the comb shrouds the connector without ever touching it and without costing you a millimetre of insertion depth" (README). For the SATCHEL project's own drives; four colours on a toolchanger, or one colour with the art off.

Colours (SB 203; README): T1 ink `#0d1117` body and cap; T2 amber `#f5b941` outline band, five tabs, hub ring, status dot, cap end; T3 mint `#5eead4` three data lines and the hub pip; T4 bone `#d8dde6` the mid line.

---

## 3. Shots

Driven headless on 2026-10-05 (1280 x 860, network on for cdnjs). Copies in `fab-knowledge:originals/scabbard/shots/`.

| file | caption |
|---|---|
| `b01-iso-default.png` | ISO view at defaults: the ink body with the amber outline band and chamfered corner, the three mint lines and the bone mid line split around the amber hub ring with its mint pip, the amber status dot, the keyring hole, the five amber tabs hanging below with the drive's plug (grey ghost) between them. Legend with extruder numbers; dims tag 22.6 x 31.3 x 8.7. Panel: THE DRIVE YOU ARE GUTTING and BODY groups. |
| `b02-front.png` | FRONT: the mark as a flat graphic, tabs framing the plug. |
| `b03-back-window.png` | BACK: the push out window through the back skin showing the drive's board (green ghost), open through the bottom edge, with the ledges either side; the tabs on the back skin. |
| `b04-iso-explode-drive.png` | Explode 14: the four inlay colours lifted off the front, the pocket rails and grip pads visible behind. |
| `b05-edge-ear-sleeve.png` | Keychain set to ear and cap style to sleeve: the amber ear on top, the sleeve cap swallowing the comb at the bottom. |
| `b06-warning-short-plug.png` | Plug sticking out set to 10: the pocket grows to 24 and the whole silhouette rescales to 25.1 x 34.7 (the scale rule); the bench also raises "Only 10.0mm of plug is out. USB-A wants about 12mm to seat." in the status strip below the stage. |

---

## 4. Build pipeline and code map

No build step. Mesh route: constructive prisms, no CSG. A part is a list of `{poly, holes, z0, z1}` extruded with `THREE.ExtrudeGeometry`; prisms of one part touch face to face and overlap nowhere by design.

| SB lines | contents |
|---|---|
| 187 to 201 | `MK` mark constants in SVG units |
| 206 to 250 | `DEFAULTS` |
| 253 to 282 | polygon helpers: `outerProfile`, `insetProfile`, `cavityProfile`, `circle`, `capsule`, `rect`, `earPoly`, `cShape` |
| 285 to 338 | `solve(p)`: the scale rule, the cap, the warnings |
| 340 to 382 | `mk`, `markShapes`, `tabPolys` |
| 385 to 492 | `buildParts` |
| 495 to 504 | `driveGhost` |
| 507 to 531 | `prismGeometry`, `partTriangles` |
| 537 to 558 | `printTransform`, `applyTransform` |
| 582 to 668 | `stl`, `CRC`, `crc32`, `utf8`, a store only `zip` |
| 670 to 742 | `threeMF` (Slic3r PE dialect) |
| 755 to 814 | `GROUPS` control schema |
| 871 to 885 | camera presets and `window.__scab` |
| 903 to 1100 | three viewer with a hand rolled orbit, `rebuild` (60 ms debounce), `applyView`, `readout`, exports |

---

## 5. Mechanisms, circuits and constructions

### 5.1 The scale rule: the drive sets the fob

What it does: makes every input change the visible fob while the mark keeps its proportions.

Mark space (SB 187 to 201): 200 x 200 SVG units, y down; body x 40 to 160 (120 units), y 20 to 166 (146 units); chamfer 24; stroke 6; five tabs at x 56, 76, 96, 116, 136, 8 wide, hanging to y 186 (20 units); lines 5 wide at y 58 (mint, to x 120), 88 (mint, to 144), 118 (bone, to 144), 148 (mint, to 144); hub at (100, 118) rOut 8.75, rIn 5.25, dot 2.8; status dot (132, 58) r 2.8.

Derivation (`solve`, SB 285 to 338; values derived in `F/scabbard-dims.json`):

```
pocketLen = max(2, driveL - plugOut)        21.0
pocketW   = pcbW + 2 clearXY                12.8
H         = pocketLen + wallTop + sizeBoost 27.5    silhouette height
s         = H / 146                          0.18836 mm per mark unit
W = 120 s = 22.60 ; c = 24 s = 4.52 ; tabLen = 20 s = 3.77 ; tabGap = 72 s = 13.56 ; bandW = 6 s = 1.13
cavityH   = max(plugH, pcbT + gripH) + clearZ  5.1
thick     = tBack + cavityH + tFront           8.7 ; zFace0 = thick - inlayD = 8.1
```

Mark to case mapping (`mk`, SB 340 to 343): `x(u) = (u - 40) s`, `y(v) = (166 - v) s`, `l(u) = u s`.

Exact inset of the chamfered pentagon (`insetProfile`, SB 255 to 258): with `K = W + H - c - d sqrt2`, the inset profile is `[[d, d], [W - d, d], [W - d, K - (W - d)], [K - (H - d), H - d], [d, H - d]]`, which keeps the 45 deg chamfer line exact after an inset d. `cavityProfile` does the same with different insets for the sides, bottom and top.

### 5.2 The one piece body with a board pocket open to the bottom edge

Construction (`buildParts`, SB 397 to 447), in z order from the back:

1. Back skin from 0 to `tBack` with the push out window. The window runs out through the bottom edge, so it is a notch in the outline (`cShape`, SB 282) rather than a hole: "A hole that crosses the boundary is exactly the kind of input that makes the triangulator emit overlapping slivers" (SB 401 to 403). Window from `pocX0 + winLedge` to `pocX1 - winLedge`, up to `pocketTop - winTop`.
2. Five tab prisms in the back skin.
3. Walls from `tBack` to `zCav1` as a C shape (outer profile minus the cavity, open across the bottom edge so the drive slides in).
4. Two rails from the side walls to the pocket edges, height `pocketTop`: they bound the pocket and form the sides of the entry slot.
5. Front base layer from `zCav1` to `zFace0` (the full outline with the keyring hole).
6. The ink field from `zFace0` to `zFace` with every inlay shape punched out, plus the black ring inside the hub.
7. Grip pads: two bars 2.4 long across the pocket at 0.30 and 0.72 of its length, `gripH` 0.4 tall, on the inside of the front skin; they squeeze the board onto the back ledges.

Fits (SB 220 to 229): board pocket `clearXY` 0.4 per side, `clearZ` 0.6, grip pads 0.4. Fit trouble table in the README: board too loose, drop clear XY to 0.2 or raise the pads; board will not go in, raise clear XY or Z or drop the pads; plug will not seat, remeasure plug sticking out.

Print: body face down; the inlay is the first three layers and the tab comb lies in the same plane; "The back window means the last layers have nothing to span" (README). Print transform (SB 537 to 542): body `m = diag(1, -1, -1)`, `t = (0, H, thick)`, a proper rotation.

### 5.3 The four colour flush inlay as disjoint shapes

`markShapes` (SB 346 to 376) and the inlay parts (SB 451 to 464):

| colour | shapes | z |
|---|---|---|
| amber | outline band (outer profile minus the inset by `bandW`), hub ring (rOut minus rIn), status dot; plus the five tabs from `zCav1` to `zFace` (the full front skin thickness) | `zFace0` to `zFace` |
| mint | three lines as capsules, the hub pip | same |
| bone | the mid line as two capsules split around the hub | same |
| black | the ring inside the hub (part of the body) | same |

The bone line is split with a hairline `artGap` 0.15 so two shapes never meet at one tangent point: "two shapes meeting at one tangent point make the triangulator throw slivers, and on the plate it stops colour bleed" (SB 360 to 362). Inlay depth `inlayD` 0.6, three layers at 0.2.

### 5.4 The plug cap

What it does: a blind box over the exposed plug, printed closed end down with an amber end face.

Derivation (SB 310 to 320): plug style grips the metal connector inside the comb: `capMouth = -tabLen`, inner `plugW + 2 capClear` by `plugH + 2 capClear` (12.3 x 4.8, derived), `capDepth = max(1, plugOut + capMouth + 0.4)` (9.63), `capLen = capDepth + capEnd` (11.63), outer `capIn + 2 capWall` (15.5 x 8.0). Sleeve style swallows the comb and grips the body: inner `W + 2 capClear` by `thick + 2 capClear`, mouth at 0. On a keyring with the cap on: `H - capMouth + capLen` = 42.9 (derived and measured).

Construction (SB 467 to 488): four walls, a closed end, the amber end face `inlayD` thick as its own part, and two grip ribs 1.6 long and 0.25 tall inside near the closed end. Fit: `capClear` 0.15. Print transform: `m = [[1, 0, 0], [0, 0, -1], [0, 1, 0]]`, `t = (0, thick, capLen - capMouth)`, closed end down so the socket is a blind vertical hole and the amber face is on the bed.

### 5.5 Keychain and warnings

Keychain (SB 391 to 393, 307 to 308): `none`, `hole` (holeD 3.5 at `H - max(holeD/2 + 1.6, wallTop/2)`), or `ear` (earW 9, earOut 5, an arch on the top edge that carries amber on the face).

Warnings from `solve` (SB 322 to 335): board wider than the shell; plug out under 11.5 ("USB-A wants about 12mm to seat"); top wall too thin for the hole (`wallTop < holeD + 2.8`); board stack does not clear the pocket; back window under 4 mm; tab gap more than 3 mm off the plug width ("Cosmetic only").

### 5.6 Exports

| export | content |
|---|---|
| STL pack zip | one binary STL per part in print pose plus `params.json`, written by a store only zip with CRC32 (SB 582 to 668) |
| 3MF | Slic3r PE dialect (SB 670 to 742): `xmlns:slic3rpe`, one object per printed part (body with four volumes; cap with two), volumes as contiguous triangle ranges listed in `Metadata/Slic3r_PE_model.config` with `firstid`, `lastid`, `extruder`, `volume_type ModelPart`; vertices welded on a 4 decimal key; Application `SCABBARD`; no project settings, so no filament list is carried |

Mesh facts (benches-cases.md, measured): body 2,472 tris with 185 edges not used twice, cap 84 with 4, inlays and cap end 0; the body and cap are touching prism soup with T junctions and no overlap, so a strict checker calls them non manifold; SLATE uses a 0.012 overlap instead.

### 5.7 Details the first pass left out (checker, 2026-10-05)

Read from `SB` at the lines named; behaviour inferred from the code unless marked.

| item | SB lines | how it is made |
|---|---|---|
| window guard and shape | 400 to 408 | the push out window is cut only when `pocketW - 2 winLedge > 1`; its top is `max(1, pocketTop - winTop)` and its outline carries a fifth vertex at the top midpoint `[(wx0 + wx1)/2, wy]`; with the window off the back skin is the plain outline |
| rails guard | 417 to 420 | the two rails exist only when `pocX0 > wallSide + 0.2`, so a board almost as wide as the cavity gets no rails and the cavity walls bound it directly |
| ear keychain | 307 to 308, 392, 424, 455 | `ear` moves the hole to `H + earOut - earW/2`; the arch `earPoly(W/2, H - 0.4, earW, earOut + 0.4)` overlaps the top edge by 0.4, is an ink prism from z 0 to `zFace0` and an amber prism on the face, both with the hole |
| grip pad footprint | 441 to 447 | each pad spans `pocX0 + 0.8` to `pocX1 - 0.8` across the pocket and 2.4 along it (`y plus or minus 1.2`), from `zCav1 - gripH` to `zCav1` |
| cap rib position | 483 to 487 | the two ribs sit 1.0 in from the closed end's inner face (`yIn + 1.0`), one on the back inner wall and one on the front inner wall, each 1.6 long and 0.25 proud |
| plug cap height in z | 313 to 315 | the plug style cap socket is centred on the plug in z: `z0 = zCav0 + (cavityH - plugH)/2 - capClear`; the sleeve style starts at `-capClear` |
| drive ghost | 495 to 504 | the plug box runs from `-plugOut` to `min(4.0, pocketTop)` and the board box from 0 to `pocketTop`, both centred in x; the board sits on the back skin at `zCav0` |
| winding guard in the print transform | 544 to 555 | `applyTransform` swaps two vertices of every triangle when the matrix determinant is negative; both shipped matrices have determinant +1 (computed), so the guard only matters for a mirrored pose |
| prism skip | 520 | a prism with `z1 - z0 <= 1e-6` is dropped before triangulation, so a zero thickness setting (inlay off, gripH 0) leaves no degenerate slab |

---

## 6. UX anatomy

| element | content |
|---|---|
| theme | SATCHEL: `--bg #0d1117`, amber `#f5b941`, mint `#5eead4`, bone `#d8dde6`, danger `#f87171`, JetBrains Mono; 298 px panel plus view; under 820 px the view stacks above the panel |
| header | the mark as inline SVG with the live displacement filter, `SCABBARD`, "SATCHEL drive shell · one piece + cap", dims tag |
| panel groups | amber title bars: THE DRIVE YOU ARE GUTTING (with the note that the pocket sets the scale), BODY, HOLDING THE BOARD (window and pads note), CAP (plug or sleeve note), KEYCHAIN, ART (comb note), VIEW (explode, show the drive, body, inlays, cap, turntable) |
| buttons | FRONT, BACK, EDGE, ISO, `4 COLOUR 3MF` (primary), `STL PACK (ZIP)`, PARAMS, RESET |
| stage | parts legend with extruder numbers and THE DRIVE ghost (plug box and board box); "drag orbit · wheel zoom · shift-drag pan"; a NO WEBGL card ("Everything else on this page still works, including the exports") |
| status bar | body, pocket, plug out, on a keyring, cap, inlay, plus the warning strip |
| hook | `window.__scab = {orbit, view(id)}` |

What makes it good: the object is the brand mark; two measurements set the whole fob; nothing bridges and nothing snaps, so it prints and assembles first time; the README names each fit failure and its slider.

---

## 7. Tests and harness

None shipped. The plan and the print-forge kernels note cite a `sweep.js` from this chat (perturb every parameter and assert the triangle set changes, the liveness test that r1 would have failed); it is not in the harvest or in Downloads. The geometry and exporter blocks are UMD, so a node liveness test can load them directly (inferred from SB 180 to 183).

---

## 8. How to make a new thing this way

1. Let the bought part set the pocket and the pocket set the silhouette; scale the brand shape by one number so its proportions hold.
2. Keep every offset of a chamfered outline exact by solving the chamfer line after the inset.
3. Turn any opening that reaches an edge into a notch in the outline.
4. Split two inlay shapes that would touch at a point with a hairline.
5. Put features that frame a connector on the skins above and below it in Z.
6. Print the face down with the inlay in the first layers, and the cap closed end down.
7. Name each warning with the number and the fix.

---

## 9. Port map

| item | value |
|---|---|
| packages | `mesh` (touching prism route), `inlay` (vector inlay laminae), `hackbuild-3mf` (Slic3r PE volume dialect as a third reader target), `chase` (derived params as named functions: the scale rule) |
| feature kinds | pocket (board pocket open to an edge), window (push out notch), pad (grip pads); `snap` absent by design; kind it needs: `inlay`, per `fab-knowledge:synthesis/mappings.md` line 90 |
| canon id | MISSING: no canon entry for a press in board pocket with grip pads and a push out window, or for the plug cap |
| reference id | `cases/scabbard-shell` (named in the reference README per benches-cases.md, proposed in `synthesis/mappings.md` line 90); does not exist under `reference/` on 2026-10-05 (MISSING) |
| milestone | none assigned |
| lineage rows | MISSING: no row in `lineage.json` for the SCABBARD geometry block (SB 160 to 568) or the exporter block (569 to 746) |
