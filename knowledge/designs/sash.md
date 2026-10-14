# SASH: the slider badge bench (social battery indicator)

How SASH is made, read from the original code. SASH is the mechanism-bearing member of the coin family: a printed slider badge whose slide clicks between positions on an in-plane cantilever detent, is kept from lifting out by a keeper rib, and shows a different face through a window at each position. Nothing here comes from the quarantined mockups.

Code roots: the source parts `fab-knowledge:originals/sash/files/src/src/part1.html` (markup and CSS, 321 lines), `.../src/src/part2.js` (state, presets, geometry, glyph library, composers, build, fit check, 887 lines) and `.../src/src/part3.js` (exports, viewer, UI, boot, 872 lines), all under `fab-knowledge:originals/sash/files/`. The shipped bench `sash.html` is those parts concatenated with three r128, JSZip, `rastermesh.js` and `orca3mf.js` inlined; its part2 and part3 script blocks equal the source parts after trailing whitespace (measured by diff), and its `rastermesh.js` and `orca3mf.js` blocks equal the print-forge skill copies byte for byte (measured). A location written `part2.js:762-787` means those lines of the source part.

Number qualifiers: a number with a `file:line` citation is a constant read there; `measured` is from the drive of the canonical file on 2026-10-05 (`fab-knowledge:originals/sash/drive/sash.cjs`) or from the shipped print card `fab-knowledge:originals/sash/files/examples/sash-battery-print-card.txt`; `computed` is arithmetic done here from cited constants; `vendor`, `inferred` and `unknown` mean what they say.

## 1. Identity and revision

| item | value |
|---|---|
| name | SASH (registry `sash`), "slider badges for social batteries, flags and tallies" (`part1.html:160`) |
| slug | `sash` |
| conversation | `bb4cf64f-652f-49e9-9e1a-f73b4faa8def`, "Parametric multicolor social battery indicator" |
| canonical file | `fab-knowledge:originals/sash/files/sash.html` |
| sha256 | `1af452be6cccc94aced78f7d7cb292ba34742740410bd7560b2edf07b5d33cf5`, 1076328 bytes (measured) |
| built | 2026-09-08 01:38, `~/Downloads/sash (1).html` (mtime, measured), byte identical to the harvest |
| source zip | `sash-src.zip`, sha256 `57d810decb4b107a3b2ffaadf5dea57855f01b6bbeaad250414210c2a0570f14`, unpacked to `files/src/` (part mtimes 2026-09-08 01:25 to 01:34, measured) |

### 1.1 Every revision, and why this one is canonical

| mtime | file in `~/Downloads` | sha256 (12) | state |
|---|---|---|---|
| 2026-09-07 22:20 | `sash.html` | 97783ae99d66 | before the keeper rib: slide 1.44, no tab thinning |
| 2026-09-08 01:38 | `sash (1).html` | 1af452be6ccc | keeper rib, tab 0.96 of a 1.68 slide, `fit.tabZ` 0.2, station height 9 with rrect windows, pitch 6.5, `startLeft` count-up lanes, `strokeFor` clamped 0.8 to 1.4 |

The 01:38 build is the newest and the best: it carries the fix for the registry's open bug "slide plate can escape at full bars" (the keeper rib) and the fix for "glyphs too small" (art bigger than the window, 1 mm strokes, single VT323 words), per the README and `fab-knowledge:sources/downloads/dl-baffle-inlay-coin.md` section 7. The owner's last design (`sash-design (2).json`, 2026-09-08 01:43) is on the keeper-rib parameters.

### 1.2 Companions copied

| file | what it is |
|---|---|
| `sash.html`, `sash-src.zip`, `src/` | bench and source (parts plus `smoke.py`, `sweep.py`, `diag5.py`) |
| `README.md` | the bench README |
| `examples/sash-battery.3mf`, `sash-battery.json`, `sash-battery-print-card.txt` | the social battery preset exported (103 project keys, measured) |
| `examples/sash-flag.json`, `sash-availability.json`, `sash-spoons.json`, `sash-drinks.json` | the other four preset designs |
| `examples/windows.png` | every station window at print raster, all presets (`diag5.py` output) |
| `owner-sash-design-20260908.json` | the owner's battery design on the keeper-rib parameters |
| `owner-sash-flashstudio-20260907.3mf` | the owner's Flash Studio save of a SASH export (`sash (3).3mf`, 2026-09-07 23:09): 4 filaments kept, types and part-to-slot map intact (`fab-knowledge:sources/downloads/dl-baffle-inlay-coin.md` section 2.2) |

## 2. What it makes and for whom

A wearable slider badge for meetups and hackerspaces: a social battery that drains from full to empty with a face that gets tired, a HI / NO flag, an availability tag, a spoons counter, a drink tally. Four printed parts: the shell (front plate with windows over walled cavities), one slide per lane (art on its face, a thumb tab in plane on one edge, a cantilever with a bump on the other), and a cover that presses onto pegs and carries a keeper rib and optional magnets. Everything prints flat, face down, no supports, with the colours on their filaments (README; print card `part3.js:51-68`).

## 3. Shots

Folder `fab-knowledge:originals/sash/shots/`, 1280 x 860 drives of the canonical file (measured, 2026-10-05).

| shot | caption |
|---|---|
| `a-01-battery-worked-example-layout-worn-view-filmstrip.png` | Worked example on step 1 LAYOUT: 3D assembled view left, the badge "FRONT as worn" right with the four pink gauge cells and the grin face in the station window, and the filmstrip of all five positions (pos 1 full to pos 5 empty) along the bottom. Status: 65.4 x 20.4 x 5.28 mm, 54,500 triangles, 1859 ms, chips fits bed, mesh current, slides clear (measured). |
| `a-02-fit-step-exploded-check-panel.png` | Step 3 FIT, exploded view: shell (front plate face up for viewing, windows, SOCIAL BATTERY inlay), slide with gauge stripe, station faces, tab and beam, and the cover with its pegs. Shell panel: corner, walls, front plate 1.92, front inlay 1.2, nub. |
| `a-03-fit-shell-ghosted-slide-at-pos3.png` | Shell chip cycled to ghost and the pose slider at position 3: the slide sits in its cavity under the translucent shell, the tab through the wall gap, the cover pegs below. |
| `a-04-art-step-slide-station4-tired-face-handles.png` | Step 2 ART on surface "slide 1 (battery)", station pos 4 selected: the slide art face at print raster with dashed station frames, the tired face selected with the pink bbox, four corner squares and the rotate dot. Props show glyph face, face tired, eyes / mouth / brows auto. |
| `a-05-flag-preset-two-lanes-layout.png` | The battery + flag preset: two lanes, the second lane's tab on the bottom edge, HI in its window, "say hi?" label. 64,470 triangles in 2839 ms, so the status shows the amber chip "build over 2.5 s, drop resolution" (measured under SwiftShader). |
| `a-06-print-step-plate-view-exports.png` | Step 5 PRINT: entering the step switches the stage to the print plate view with shell, slides and cover laid out flat; PRINT REALITY panel (layer 0.24, min feature 0.6, stroke boost 0.15, colour gap 0, despeckle, 10 px/mm), PLATE, EXPORT with the readout of layer counts and grams per slot. |

## 4. Mechanisms and constructions

SASH has four mechanisms (the in-plane cantilever detent, the sliding tab under a keeper rib, the press-fit cover pegs, the magnet pocket in two modes) and three constructions (lane and shell geometry, surface composers with the worn composite, and the raster mesher per part). It has no circuit.

### 4.1 Lane and shell geometry

What it does: derives every dimension of the badge from per-lane settings (positions, pitch, rows) so a change of positions resizes slide, cavity, shell and windows together.

Construction (`laneGeom`, `part2.js:162-187`; `shellGeom`, `part2.js:189-238`):
1. Slide frame: origin at the slide's left corner on the notch edge, x along the slide, y toward the tab edge (comment `part2.js:159`).
2. `N = max(2, round(N))`; station offset `m`; slide length `Ls = (N + m) p`; slide width `Ws = 2 margin + (flex.t + flex.gap) + sum(row heights) + (rows - 1) rowGap` (`part2.js:164-173`).
3. Tab x: `block` puts it at `(N - 1) p`, `centre` at `Ls / 2`, `end` at `Ls - tabW/2 - 0.5`, clamped inside the slide (`part2.js:178-179`).
4. Beam: `Lf = min(flex.L, Ls - 3)`, root at x 1.0, free end at `1.0 + Lf`; bump radius `rb = min(0.7, (flex.t + flex.bump) / 2 - 0.02)`, bump x `xFree - rb - 0.3` (`part2.js:180-183`).
5. Cavity: `Lc = Ls + (N - 1) p + 2 cx`, `Hc = Ws + 2 cy` (`part2.js:184-185`). A linear slide needs about `(2N - 1) p` of length, which the lane note teaches ("fewer positions or a tighter pitch is the way to a smaller badge", `part3.js:360`).
6. Lanes stack top to bottom with a mid wall; the slide's left edge at position k is `xLeft(k) = cav.x0 + cx + (N - 1 - k) p` (`part2.js:194-202`).
7. End walls grow in 0.5 mm steps, up to 40 times, until every cavity corner sits at least 1 mm inside the outline SDF (`requiredEndWall`, `part2.js:293-305`).
8. Outline shapes as SDFs: battery (rounded rect plus a nub of height `nub` and width `0.42 Ho`), rrect, stadium, tag (point of `0.45 Ho`), hex, ticket (corner notches of radius 2.4) (`shellOutline`, `part2.js:267-291`; `sdRRect`, `sdPoly` at `part2.js:256-266`).
9. Windows (design frame): gauge cells are `N - 1` rects with half a mullion each side and an inset; the station window is `p - mullion` wide and `row h - 2 inset` tall, round, rrect (corner `min(1.2, h/2 - 0.05)`) or rect (`part2.js:219-231`, `part2.js:537`).
10. Vertical stack: cavity depth `hc = snap(ts + 2 cz)`, front plate `tf = snap(tf)`, totals `tf + hc + coverT` (`part2.js:205-237`), every height snapped to whole layers (`snapLayers`, `part2.js:156`).

Defaults (`blankState`, `part2.js:22-42`): shell wall 1.6, end wall 3.2, mid wall 1.6, front plate 1.92, front inlay 1.2, nub 2.5, art keep 0.5; slide 1.68 thick, inlay 0.72, margin 0.6, row gap 0.6, tab 0.96; fits ends 0.25, sides 0.2, depth 0.2, tab slack 0.3, tab to rib 0.2; cover 1.2, inlay 0.48, 2 pegs per end, peg 1.8, hole 1.9, peg length 1.2; lane 5 positions at 6.5, tab top 6 x 2.2 at the block, gauge row 4.5 with cells [3, 3, 3, 3], station row 9 with rrect window, flex L 9, t 1.0, gap 0.5, bump 0.5, notch 0.35; print layer 0.24, min feature 0.6, boost 0.15, gap 0, 10 px per mm.

Battery preset result (print card, measured): slide 32.5 x 16.8, travel 26, badge 65.4 x 20.4 x 5.28 mm assembled, front plate 1.92 (8 layers, inlay 1.20), walls 2.16 tall.

### 4.2 Mechanism: in-plane cantilever slide detent

What it does: gives each position a click. A cantilever beam is cut into the slide's notch edge by a slot, with a round bump near its free end; the bump rides over the notched rail of the cavity and drops into a notch at each position.

Construction:
1. Slide grid (`composeSlide`, `part2.js:571-640`): inside the nominal rect, the beam slot is air from the root to past the free end at `t <= y <= t + gap`, plus the free end gap `xFree <= x <= xFree + gap` for `0 <= y <= t + gap` (`part2.js:591-594`). Cells of the beam are marked meta 2.
2. The bump is a disc of radius `rb` centred at `(xBump, rb - bump)`, so it stands `bump` proud of the notch edge (`part2.js:599-601`).
3. Shell wall grid (`wallGrid`, `part2.js:684-709`): at each position k a notch disc of radius `rn = rb + 0.1` is cut into the rail at `(xLeft(k) + xBump, railY + dir (rn - notch))`, so its depth into the rail is `notch` (`part2.js:690-693`, `part2.js:704`).
4. The beam bends in the plane of the layers because the slide prints flat; the slot on both sides keeps it free along its whole length, which avoids the fused-beam stiffness the mechanism canon warns about (`mech/detent-strip-separate`, `docs/plan/CANONS.md` line 537).

Equations (`runCheck`, `part2.js:814-861`):

| quantity | formula | code |
|---|---|---|
| second moment | `I = ts t^3 / 12` (ts is the slide thickness across the layers, t the beam width in the bending direction) | `part2.js:819` |
| deflection | `defl = max(0, bump - cy)` | `part2.js:820` |
| normal force | `Fn = 3 E I defl / Lf^3`, `E = 2000 N/mm2` PETG | `part2.js:816`, `part2.js:821` |
| push to click | `Fn (cos 45 + mu sin 45) / (cos 45 - mu sin 45)`, `mu = 0.3`, a 45 degree flank | `part2.js:822` |
| strain | `3 defl t / (2 Lf^2) x 100` percent | `part2.js:823` |
| notch slack | `notch - defl` | `part2.js:824` |

Battery numbers (computed from the defaults, matching the print card): `I = 1.68 x 1.0^3 / 12 = 0.14 mm4`; `defl = 0.5 - 0.2 = 0.3 mm`; `Fn = 3 x 2000 x 0.14 x 0.3 / 9^3 = 0.346 N`; push `= 0.346 x 1.3 / 0.7 = 0.64 N`; strain `= 3 x 0.3 x 1.0 / (2 x 81) = 0.56 percent`; slack `= 0.35 - 0.3 = 0.05 mm`.

Warnings: click under 0.15 N ("thicken the beam"), strain over 3 percent, negative notch slack, bump taller than clearance plus notch plus 0.05 ("it will never fully seat") (`part2.js:845-847`, `part2.js:800`). UI ranges: beam length 4 to 20, beam 0.6 to 2, slot 0.35 to 1.2, bump 0.2 to 1, notch 0.1 to 1 (`part3.js:382`). The DETENT panel shows click, normal, deflection, strain, slack and beam per lane after each build (`readDetents`, `part3.js:388-391`).

Limits: the force is an analytic cantilever estimate at 2 GPa; whether 0.6 N on a 9 x 1 mm beam feels right is untested in print (README, "Not checked"). The 3 percent strain ceiling disagrees with D-073's 2.5 percent for PETG beams bent in the layer plane (`docs/plan/CANONS.md` lines 85 to 92).

### 4.3 Mechanism: sliding tab under a keeper rib

What it does: the thumb tab pokes through a slot in the shell wall over the full travel; the slide must not lift out through that slot at the full position. The fix that closed the registry bug: the tab is only the art-side layers of the slide, and a rib on the cover fills the top of the tab slot, so the tab rides under the rib while the slide body cannot pass it.

Construction:
1. Tab: cells with `|x - xt| <= tabW/2` and `Ws < y <= Ws + tabReach`, meta 3 (`part2.js:597-598`), where `tabReach` is the distance from the slide's tab edge to the shell outline plus `tab.h` proud (`part2.js:215-217`).
2. Tab slot through the wall from `xLeft(N - 1) + xt - tabW/2 - tabSlack` to `xLeft(0) + xt + tabW/2 + tabSlack` (`part2.js:218`, `part2.js:701-702`).
3. Slide slabs at z breaks `{0, inlay, tabT, ts}`: below `tabT` the tab is present; above `tabT` it is stripped (`stripTab`, `noTab`), so the tab is `tabT` thick on the art side (`part2.js:765-777`, `part2.js:743`).
4. Rib height `ribH = snap(hc - cz - tabT - tabZ)` when `tabT < ts`, else 0; overlap `keep = cz + ts - hc + ribH` is how far the slide body rises above the rib's underside (`part2.js:209-212`).
5. Cover band above the cover plate: for `zMid < tc + ribH`, a rib rect over each tab slot, inset 0.15 from the slot ends and from the wall, and at least 0.4 inside the outline (`coverBand`, `part2.js:714-728`).

Battery numbers (computed): `hc = snap(1.68 + 0.4) = 2.16` (9 layers at 0.24); `ribH = snap(2.16 - 0.2 - 0.96 - 0.2) = snap(0.80) = 0.72`; `keep = 0.2 + 1.68 - 2.16 + 0.72 = 0.44 mm`; print card: "the rib holds the slide body by 0.44 mm so it cannot lift out through the slot".

Checks: no rib ("the slide can lift out through the tab slot. thin the tab or thicken the walls"); keep under 0.24 ("thin the tab") (`part2.js:855-857`); the CHECK panel shows tab thickness, rib height, overlap and tab room (`part3.js:406`).

Limit: the rib at 0.72 tall with 0.44 overlap may drag on the tab; the README says to raise "tab to rib" in CLEARANCE if it does. Untested in print (README).

### 4.4 Mechanism: press-fit cover pegs

What it does: the cover snaps onto the shell by pegs that press into holes in the end walls.

Construction: pegs at `(+-(Lin/2 + wallEnd/2), +-pegY)` with `pegY = min(Hin/4, Hin/2 - 2.2)` for 2 per end, or on the centreline for 1 (`part2.js:233-235`); holes of `holeD` cut through the wall grid (`part2.js:705`); pegs extruded from the cover for `zMid < tc + pegL` (`part2.js:724`); the cover outline is mirrored `sdf(-x, y)` because it is read from behind (`part2.js:647-653`).

Fit equation: printed interference `(pegD + 0.10) - (holeD - 0.15)`, from the FDM loss table (holes 0.15 small, outer dims 0.10 large); warn under 0 ("drop hole d") or over 0.35 ("it will split the wall") (`part2.js:850-853`). Battery (computed): `(1.8 + 0.1) - (1.9 - 0.15) = 0.15 mm` press.

A peg hole that breaks the outline warns "raise end wall" (`part2.js:804`).

### 4.5 Mechanism: magnet pockets, glue or sealed with a pause

Modes off, glue, sealed (`part2.js:29`, chips at `part1.html:268`). Positions: 1 centre, 2 or 3 along the long axis, 4 near the corners (x pulled in to 0.8 of the end inset), inset 1.5 from the ends and 1.0 from the sides (`magnetPositions`, `part2.js:246-254`). Glue: pocket from z 0 to `t`, open on the back, cover at least `t + 0.72`. Sealed: pocket from z 0.72 to `0.72 + t`, cover at least `t + 1.44`, pause layer `round((0.72 + t) / layer)` printed on the card (`coverThickness`, `part2.js:239-245`; `coverBand`, `part2.js:731-740`; `runCheck`, `part2.js:854`). Pocket diameter `d + fit`, defaults magnet 6 x 2 with 0.15 fit (`part2.js:29`).

Pause layer convention (computed, disagreement): the sealed pocket's ceiling is `snapLayers(0.72 + t)`, 2.64 mm for a 2 mm magnet at 0.24 layers, which is the top of layer 11. SASH prints "PAUSE the cover before layer 11 (z 2.64)" (`part2.js:854`, `part3.js:62`), while COLLAR's rule for the same geometry is `round(z / layer) + 1` = 12, "the one starting Z 2.64" (`collar.html:1886-1889`). Pausing before layer 11 stops at z 2.40 with one pocket wall layer still to print and the magnet standing 0.24 mm proud of the unfinished wall (inferred). A port uses COLLAR's convention and states the start Z of the pause layer. The sealed floor `0.72` is added as a z break unsnapped (`part2.js:784`), so at a 0.20 layer the floor is 3.6 layers (computed).

The owner's last design (`owner-sash-design-20260908.json`) has magnets on in glue mode, 2 of 6 x 2 mm, which grows the cover from 1.20 to `snapLayers(2 + 0.72)` = 2.64 mm (computed from `coverThickness`, `part2.js:239-245`).

### 4.6 Surface composers, glyph library and the worn composite

What it does: puts art on three kinds of surface, all composed as read from the front and mirrored in X for print, because every art face is a bed face (`part2.js:2-3`, `meshPart` at `part2.js:744-751`).

- Shell front (`composeShell`, `part2.js:524-565`): outline body, windows as air, an art region inside the outline by `keep` and outside the windows padded by `keep`; art layers stamped into the region only; colour gap; cut layers become extra windows.
- Slide (`composeSlide`, `part2.js:571-640`): nominal rect plus tab plus bump with the beam slot as air; gauge cells painted by slot with the last cell in the cover colour "so a drained window never shows white" (`part2.js:607-616`); station art clipped per station to its own rect with a 0.3 inset so art never leaks into the neighbour (`part2.js:619-637`).
- Cover (`composeCover`, `part2.js:642-675`): mirrored outline, keepout 0.8, keepouts round pegs and magnets.
- Hygiene per layer (`stampMask`, `part2.js:494-515`): binary mask, stroke boost by `boost x res`, open with radius `floor(minF / 2 x res)`, despeckle at `round(0.35 pi (minF / 2 x res)^2)` cells. Negative glyphs (filled face, bubble, skull, moon) treat the holes as the feature and apply boost and open to the holes (`negLayer`, `part2.js:493`). Raw and kept cell counts per layer drive the layer flags "nothing lands", "too thin" (under 55 percent kept), "losing detail" (under 85 percent) (`layerFlag`, `part3.js:473-477`).
- Glyph library (`part2.js:307-402`): FACES 15 (grin, smile, meh, frown, tired, dead, sleep, dizzy, spiral, wink, shock, angry, sad, love, cheeky) composed from EYES 11, MOUTHS 8, BROWS 4; heads none, ring, fill (fill cuts the features with `destination-out`); ICONS 23 (face, battery with fill fraction, bolt, spoon, pint, wine, cocktail, coffee, drop, hand, wave, bubble, heart, moon, sun, check, cross, skull, star, arrow, tally with the fifth stroke across, zz, logo from the header mark paths). Stroke `clamp(round(size x 0.12 x 20) / 20, 0.8, 1.4)` mm (`strokeFor`, `part2.js:46`).
- Worn composite (`compositeLabels`, `part3.js:126-143`): the shell front with each slide's labels showing through the window cells at the current pose, window floors in the cover colour. The face view, the filmstrip of every position (`drawStrip`, `part3.js:726-743`) and the faces PNG use it.

Lesson from print: art in the station window must be bigger than the window, which crops it; an 8 mm face behind a 5.6 mm window brings eyes and mouth to printable sizes; presets use single VT323 words at 6.5 to 7.5 mm instead of icon plus caption (README). Observation from `examples/windows.png`: a sliver of the next station or the slide edge shows as a half disc at the right edge of several windows; a window margin check against the station mullion is the fix (`fab-knowledge:sources/benches/benches-coins-inlay.md` section 5).

### 4.7 Build: slabs per part, pinch healing, raster sweep

1. Shell slabs: front labels 0 to inlay, body inlay to `tf`, wall grid `tf` to `tf + hc`; inlay clamped to leave a 0.72 core (`part2.js:758-763`).
2. Slide slabs at `{0, inlay, tabT, ts}` (section 4.3).
3. Cover slabs at `{0, inlay, tc, tc + pegL, tc + ribH, pocket bounds}` (`part2.js:779-792`).
4. Each part: `RasterMesh.volume`, `addSlab` with every label grid mirrored in X, `fixPinches`, `mesh` (`meshPart`, `part2.js:744-751`). The kernel is the print-forge `rastermesh.js` (see the `inlay` record, section 4.5).
5. Warnings: pinch cells over 0.2 percent of the grid ("art at the resolution limit"), tab slot into the corner radius, tab under 1.2 proud, window under 2 mm, build over 2.5 s (`part2.js:795-810`).
6. Raster sweep (`runCheck`, `part2.js:825-840`): for k from 0 to N - 1 in steps of 0.5, map every slide body cell (meta 1) into the shell grid at that pose and count cells that land on wall; the worst count and its position are reported, and any hit warns "slide hits the shell at position k". The status chip reads "slides clear" or "slide binds" (`part3.js:823`). Mid wall at the notches `midWall - 2 max(notch)` warns under 0.8 (`part2.js:858-859`).

Measured: battery 54,500 triangles in 1859 ms; battery + flag 64,470 in 2839 ms (drive, SwiftShader).

### 4.8 Pose bar, count-up lanes and the art layer kinds

Pose bar (`renderPose`, `part3.js:577-594`): one group per lane with a range from 0 to N - 1 in steps of 0.02, step buttons, and a `pos d` readout that adds "(between)" when the pose is more than 0.1 off a detent. Letting go of the range rounds to the nearest detent. `sweep` animates every lane back and forth at 1.2 s per position, driving the 3D pose and the worn face view together; pressing it again stops. `VIEW.pose` moves each slide mesh to `xLeft(k)`.

Count-up lanes (`startLeft`, `part2.js:161`, `part3.js:278-280`): a lane can start at the left so each push lights one more cell (the drink tally preset, `part2.js:114`). Position labels invert (`posOf`, `kOfPos`), the end labels read `all lit` and `start` instead of `full` and `empty`, and the step buttons reverse direction. `fixLane` clamps N to 2 to 12, grows the station list and the gauge cell list to match, clamps the pose, and keeps lane 1 on (`part3.js:315-322`). With both lanes on, lane 1's tab is forced to the top edge and lane 2's to the bottom (`tabSideOf`, `part2.js:160`).

Art layer kinds (`paintLayer`, `part2.js:429-491`), painted as an alpha mask in mm with y up:
- shape: rect, ellipse, ring (ellipse minus an inner ellipse at thickness `t`), frame, diamond, chevrons (three), line, ticks (`h` ticks of width `t`), all filled even-odd.
- text: fonts Permanent Marker, IBM Plex Mono, Special Elite, VT323 (`FONTS`, `part2.js:8`); per-character advance plus letter spacing `ls`; a pipe splits straight text into two passes, part 0 in `slot` and part 1 in `slot2`, with `splitGap` mm between (`composeShell`, `composeSlide` run two stamps); arc text ignores the split and places characters on radius `|arc|`, over the top when `arc > 0`, under when negative.
- glyph: the face and icon library in 4.6.
- image: drawn at width `w`, ink where alpha over 40 and luminance under `thr x 255` (default 0.5), inverted or silhouette modes.
- cut: on the shell, a layer with `cut` set stamps into a cuts mask that becomes extra windows (`part2.js:553-563`; the cover does the same at `part2.js:673`).
Station layers are placed relative to `stationOrigin` (station centre on the slide, `part2.js:415-420`), so copying a layer to every station keeps it centred in each window.

### 4.9 Exports

- 3MF via `Orca3MF.build(pkgConfig()).zip()` with the render loop paused (`part3.js:69`): one object per part (shell, `slide-N-name`, cover), one mesh per colour inside, copies placed by `plateLayout` (shell and cover side by side, slides in a row below, 5 mm gaps, groups tiled on the bed) (`part3.js:7-28`, `part3.js:32-50`). 103 project keys (measured on `examples/sash-battery.3mf`): 5 printer names, version, 97 per-filament keys from the seed template.
- STL zip: `sash-<part>-<slot name>-<slot>.stl`, print card and design JSON (`part3.js:70-80`).
- Print card: `Orca3MF.printCard` plus a SASH block with badge size, layer counts, print orientation per part, tab and keeper overlap, click per lane, magnet pause, assembly order, fits (`printCardText`, `part3.js:51-68`).
- Faces PNG of every surface at print raster (`facesPng`, `part3.js:101-112`); design JSON `{app: 'sash-bench', v: 1, state}` (`part3.js:81`).

## 5. UX anatomy

| region | content | code |
|---|---|---|
| tokens | pink #FE0386, cream, paper #fffdf7, sunk, edge, ink, void, ok, warn, err, slime #a6e22e, amber #ffb020; Plex Mono, Permanent Marker, Special Elite, VT323 | `part1.html:11-14` |
| header | mark, `SASH.bench`, tagline, undo, redo, open, save, guide | `part1.html:154-167` |
| steps | 1 LAYOUT, 2 ART, 3 FIT, 4 COLOUR, 5 PRINT; guide bar `STEP N NAME` plus one sentence | `part1.html:168-175`, `GUIDES` at `part3.js:269-275` |
| stage bar | view chips assembled, exploded, print plate; part chips cycling solid, ghost, off per part; a pose slider per lane with step buttons and a sweep animation | `part1.html:178-182`, `part3.js:562-594` |
| stage | three viewer left, face editor right on LAYOUT and ART (`#stage.art`), cam chips iso, top, front, under, colour legend, welcome overlay | `part1.html:183-204`, `part1.html:62-73` |
| rail | 340 px paper rail; panes per step with panels, VT323 heads, slider plus number per value, folds, next buttons | `part1.html:77`, `part1.html:205-318` |
| LAYOUT | presets (social battery, battery + flag, availability, spoons, drink tally), lane 1, lane 2 with positions, pitch, tab side, tab rides, counts up, gauge row fold with cell colour buttons, station row fold, tab fold, lane note | `part3.js:323-372` |
| ART | surface chips (shell front, slide N, cover back) and station chips `pos 1..N`, layer list with flags, add face or icon, text, shape, image, props panel with duplicate, raise, lower, copy to all stations or the other face | `part3.js:451-551` |
| FIT | shell shapes and walls, slide thickness, inlay, tab thickness, clearances, a DETENT panel per lane with live click readout, cover, magnets, CHECK readout | `part1.html:229-277`, `part3.js:375-414` |
| COLOUR | 2 / 3 / 4 colours, slot rows with colour, name, material and role, roles per part, slicer profile fold | `part3.js:416-449` |
| PRINT | layer, min feature, stroke boost, colour gap, despeckle, resolution, auto rebuild, rebuild now, plate copies and bed, exports, readout with layer counts and grams per slot | `part1.html:296-317`, `part3.js:815-833` |
| status | dims, triangles, build ms, chips fits bed or over bed, mesh current or stale, slides clear or binds, every warning | `part1.html:319`, `UI.status` at `part3.js:815-833` |
| face editor | exact print raster after a build, 4 px per mm quick composite while dragging or stale; bbox, four corner scale squares, rotate dot; move in 0.25 mm steps with centre snap guides within 0.6 mm, shift axis lock, alt disables snaps; rotate snaps to 0 / 90 / 180 within 4 degrees, shift for 15 degree steps; wheel zoom about the cursor, right drag pan, double click resets or focuses text; arrows 0.25 mm, shift 5 mm; ctrl D duplicate, [ ] reorder; station frames clickable on a slide | `part3.js:595-813` |
| undo | design slice snapshots, 450 ms debounce, 80 deep, ctrl Z, ctrl shift Z, ctrl Y | `part2.js:139-153` |

Step-driven stage: entering PRINT switches to the plate view and leaving it returns to assembled (`part3.js:289-290`). Preset over existing art asks once, and undo brings it back (`part3.js:330-334`). Boot awaits all four fonts before the first build, because canvas `fillText` falls back silently (`part3.js:864-872`).

What makes it excellent: the badge is shown as worn with the slide art showing through the windows at the current pose and a filmstrip of every position, so the design is judged the way it will be read; the detent is a numbers panel beside the sliders that drive it; the raster sweep checks the motion of the slide through its cavity at half steps instead of trusting nominal clearances; the keeper rib is a constructive answer to a reported failure, with its overlap reported in mm.

## 6. Known limits and failure lessons

| item | evidence |
|---|---|
| slide escaped at full bars in the first build; fixed by the keeper rib and the thinned tab | registry status and README |
| glyphs too small; fixed by art bigger than the window, 1 mm strokes, single words | README |
| fits 0.2 sides, 0.2 depth, 0.25 ends are the PETG slide fits that worked on KNURL, not measured on SASH | `part1.html:255`, README |
| click force analytic only; peg press assumes KNURL's hole shrink; rib drag untested | README "Not checked" |
| sliver of the next station at window edges | `examples/windows.png` |
| 97-key filament template, not 127; Flash Studio filled the rest on the owner's save | section 1.2 |
| two-lane build crosses the 2.5 s warning under software GL | `a-05` |
| default iso camera is close on first load; double click refits | `a-01`, `part3.js:187` |

## 7. Tests and harness

- `files/src/smoke.py`: Playwright Chromium with SwiftShader; boot, worked example, fail on warnings and any lane overlap, screenshot every step and view, ghost the shell, scrub the pose, add a glyph on slide station 2 and drive move, rotate and scale through `UI.FE.handles`, export through `BENCH.exportBytes`.
- `files/src/sweep.py`: 21 cases from the battery preset (N2 p4, N12 p4, N8 p16, hex glue magnets, ticket sealed magnets 4, stadium tab bottom, two lanes both top, tight fits thin walls, loose fits thick, big flex, tiny flex, no gauge no station, station rect offset 3, tab centre wide, 2 colours, res 14 layer 0.12, res 6 six copies, rc 8 nub 6, full thickness tab, thin tab thick slide, count up lane); fails on slide binds and console errors; exports five 3MFs.
- `files/src/diag5.py`: renders every station window at 60 px per mm into `windows.png`.
- Hook: `BENCH = {build, state, model, check, presets, geom, exportBytes, ready}` and `UI.FE.handles` with `corners`, `dot`, `centre` (`part2.js:5`, `part2.js:882-887`, `part3.js:114-123`, `part3.js:599`).
- This record's drive: `fab-knowledge:originals/sash/drive/sash.cjs`.

## 8. Port map

| field | value |
|---|---|
| packages | inlay, mesh, sim, 3mf, constraints (`fab-knowledge:synthesis/mappings.md` row SASH) |
| feature kinds (in the 26) | detent, tabslot, window, pocket, boss, bore |
| kinds it needs that the 26 lack | `keeper` (anti-lift rib), `inlay`, `sealed-pocket` (magnet pause) |
| check families | CHK-INL, CHK-FIT, CHK-KEY; proposed: slide raster sweep (CHK-MOT), peg press 0 to 0.35 (CHK-FIT), keeper overlap at least 0.24 (CHK-FIT), detent push at least 0.15 N, strain at most 3 percent, slack at least 0 (CHK-KEY) |
| mechanism canon id | MISSING. Closest typed entries are `count-wheel-detent` (KNURL, same `k = 3 E I / L^3` and strain formula with a separate strip) and `detent-latch` (TUMBLER) in `docs/plan/CANONS.md` section 2.1; the in-plane slotted-cantilever slide detent, the tab under a keeper rib, the press-fit cover peg and the sealed magnet pocket have no canon rows |
| circuit canon | none |
| reference id | MISSING; proposed `mechanisms/slider-badge` (detent, tabslot, window, keeper) in mappings.md |
| milestone | none named in `docs/plan/MILESTONES.md`; PLAN.md line 364 lists SASH among designs with no chase port yet |
| lineage row | the embedded `rastermesh.js` is byte identical to row `healer/hbf-seed-rastermesh` (sha256 `a99a159b91c9d392987b22393f04caf035762fe5301013c601c6e5f3a6697fe0`, kind copy) in `lineage.json`; SASH itself has no row (MISSING) |
