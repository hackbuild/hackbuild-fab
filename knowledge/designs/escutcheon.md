# ESCUTCHEON: how it is made

Record written 2026-10-05 from the original files. Slug `escutcheon`. A printed and electroplated delta badge in the Starfleet combadge shape, 45.72 x 74 x 3.2 mm, with an emblem left standing in a 1.10 mm recessed field, two backers (magnet and bar pin), eight watertight STLs, and a single-file raw WebGL2 viewer with plating finishes and an exploded assembly. The mesh generator is not in any source; the record is built from the README, the viewer code and the meshes.

Marks rule. Four faces reproduce marks held by others (the Starfleet delta outline, EFF, iFixit, hive76). Per `docs/plan/LICENSING.md` section 1.6 these outputs never appear in a worked example, a docs page, a tutorial, a canon seed, a reference folder or a check fixture; the geometry methods may be reused with the mark removed or replaced by a project-owned shape. This record's shots use the plain, hack.build, HARDWARE (DIP chip) and backer models only. The outline itself is a traced third-party mark.

Number rules for this file. A number in a code table is a declared value from the file and line named. "Measured" means the headless drive of 2026-10-05 (Chrome, swiftshader WebGL2, puppeteer-core, 1280 x 860) or a reading of a file in `fab-knowledge:originals/escutcheon/files/`. "Computed" means a calculation shown here. "Inferred" means a reading of the code. Provenance: no chat, bench or registry row names ESCUTCHEON; found by the Downloads sweep (`fab-knowledge:sources/downloads/dl-sweep-unmatched.md` section 3.4).

Short paths: `F` is `fab-knowledge:originals/escutcheon/files/`. `V` is `F/escutcheon-viewer.html`. `VJS` is its script with the model data removed, at `fab-knowledge:originals/board-viewers/files/extracted/escutcheon-webgl2-badge-viewer.app.js`.

---

## 1. Identity and revision

| field | value |
|---|---|
| name | ESCUTCHEON R5 |
| owner's slug | escutcheon |
| canonical files | `V`, sha256 9700d867ec6762d51a83a23d4a74254e8e462560a049c43af4eda75584c8cdaf, 485513 bytes; `F/README.md`, sha256 7419423fd0a1...; the STLs in `F/stl/` |
| date | 2026-08-07 03:02 (members of `~/Downloads/deltas.zip` and `~/Downloads/deltas/`) |
| set | six badges (plain, hive76, EFF, iFixit, hack.build, HARDWARE DIP chip) and two backers |
| every hash | `fab-knowledge:originals/escutcheon/SHA256SUMS` |

### 1.1 Every revision found

| when | file | what | role |
|---|---|---|---|
| R1, R2 | not found | hand-drawn silhouettes, "both were wrong" (README) | named only |
| 2026-08-06 18:42 | `~/Downloads/escutcheon-viewer.html` (730382 B), copied to `F/lineage/escutcheon-viewer-2026-08-06.html` | a wider combadge 68 x 56 x 3.4 mm with the marks cut through (modes `cut` and `window`, reported min web, min cut and bridge counts), an OWL face, backers 66.78 x 54.99 x 3.0, magnets at (+/-17.5, -15) | lineage |
| R3 | (in R5) | outline traced from the insignia SVG to 260 points, normalised to unit height and embedded | |
| 2026-08-07 03:02 | `deltas.zip` | R5: the tall delta 45.72 x 74 x 3.2, recess mode, owl replaced by the real iFixit mark, mark and glyph bugs fixed, recess shading in the viewer, magnets at (+/-11.5, -5.5) | canonical |

### 1.2 Why this revision

R5 is newest and the README records the fixes that make it right: the traced outline (never hand drawn again), the hack.build mark with both path translations applied, and glyph outlines with every quadratic segment kept. The early viewer is kept as lineage because its cut-through mode and its web, cut and bridge readouts are a different, still useful construction for stencils.

### 1.3 What is in `fab-knowledge:originals/escutcheon/files/` and what was left out

Kept: `V`, `F/README.md`, five STLs (`escutcheon-delta-plain.stl`, `escutcheon-delta-hackbuild.stl`, `escutcheon-delta-chip.stl`, `escutcheon-backer-magnet.stl`, `escutcheon-backer-pin.stl`), the early viewer. Left out: the hive76, EFF and iFixit STLs (third-party marks; at `fab-knowledge:evidence/x/downloads/dl-sweep/escutcheon/`). `V` still embeds all eight meshes. Missing everywhere: the generator and the `escutcheon-delta-*.svg` flat outlines the README lists.

---

## 2. What it makes and for whom

A wearable badge for a maker who wants a metal-looking prop from a printer: print face down, sand, paint with conductive paint, plate copper then nickel or chrome, glue a backer, add magnets or a bar pin. The hack.build face makes it a team badge; the DIP-chip face a hardware badge.

---

## 3. Shots

Driven headless 2026-10-05 from `V`; ready when 8 model tiles exist (0.8 s); zero page errors (measured). Re-driven by the checker the same day: the left rail draws an SVG silhouette of every model, including the hive76, EFF and iFixit marks, so those three thumbnails are hidden in the page before each capture (LICENSING 1.6); their names stay as text. The drive clicks the tiles, `data-f` finish buttons and `data-v` view buttons, toggles `#wire` for EDGES and sets `#asm` to 100 with an input event; 600 ms settle per shot. Files in `fab-knowledge:originals/escutcheon/shots/`.

| file | caption |
|---|---|
| `e01-hackbuild-face-copper-iso.png` | HACK.BUILD selected, COPPER finish, ISO: the arc and wrench standing in the recessed field, the wrench on its 0.42 mm shelf, recess floors darkened by the depth term; rail of model tiles with SVG thumbnails (three third-party thumbnails blanked); BENCH with FINISH, VIEW, ASSEMBLY, SPEC (45.72 x 74 x 3.2, 3.2 mm, recess 1.10, 4.33 cm3, 5,436 triangles), DOWNLOAD STL, EXPORT ALL; footer status. |
| `e02-hackbuild-face-chrome-front.png` | CHROME finish, FRONT: the low-roughness environment reflection. |
| `e03-chip-face-nickel-edges.png` | HARDWARE (DIP chip) in NICKEL with EDGES on: the triangle wireframe over the shaded mesh shows the stepped chamfer bands and the fan triangulation of the outline. |
| `e04-assembly-open-badge-backer-magnets.png` | Plain delta with ASSEMBLY at 100: badge lifted 24 mm, raw backer behind it, two 6 x 2 mm magnet discs further back. |
| `e05-backer-magnet-raw-back.png` | BACKER / MAGNET in RAW from BACK: the two 6 mm pockets on the face that points away from the badge, and the bench note "Pockets face away from the badge. Press magnets in, north out." (The first capture used ISO, which shows the plain front with no pockets; replaced.) |

---

## 4. Mechanisms and constructions

### 4.1 Plate, recess and emblem (README "Geometry")

1. Outline: the 2160s insignia SVG traced to a 260-point polygon, normalised to unit height, scaled to 74 mm tall (45.72 wide). The shape is asymmetric; every mirror-symmetric attempt looked wrong.
2. Plate: 3.2 mm extrusion of the outline.
3. Emblem field: a circle on the delta's inscribed circle, centre (0.8, 3.6), radius 12.4 mm, recessed 1.10 mm, with the mark left standing at face level, so each badge is one solid with nothing to bridge and nothing to fall out.
4. Two-colour marks become two depths: hack.build arc standing at the face, wrench on a 0.42 mm shelf, the step standing in for the colour break.
5. Edges: stepped chamfer 0.6 mm on top and 0.35 mm on the bottom, split into steps of about 0.12 mm, so it prints as a bevel and lowers current density at the tips while plating.
6. Inversion: subtracting the mark instead of the field gives an embossed set (offered, not built).

| face | emblem (README) |
|---|---|
| plain | bare delta, no recess |
| hive76 | hexagon outline and "76" both debossed; 2.4 mm from numerals to ring |
| EFF | recessed disc, EFF proud |
| iFixit | recessed disc, rounded X proud |
| hack.build | arc at 1.10, wrench on a 0.42 shelf |
| HARDWARE | DIP package debossed into the face |

Mesh facts from `V` (measured): badge 45.72 x 74.0 x 3.2, 4052 to 5436 triangles, volume 4.21 to 4.61 cm3; backers 44.58 x 72.15 x 3.0, 3.92 and 4.0 cm3. The README calls all eight watertight; the viewer's MANIFOLD PASS is a fixed string (`VJS` line 391), not a check.

### 4.2 Backers

Magnet backer: two 6 x 2 mm disc pockets centred at (+/-11.5, -5.5) (`VJS` line 5), 23 mm apart (computed). The README table says 23 mm and its assembly notes say 25 mm. Bar pin backer: a 26 x 3.2 x 2 mm slot for a standard 26 mm nickel bar pin. Backers are 0.57 mm smaller per side across and 0.93 mm smaller per end along the height than the badge (computed from 45.72 x 74.0 against 44.58 x 72.15), so they hide behind it.

### 4.3 Two bugs fixed in R5 (README)

1. The hack.build mark landed 193 units high: each source SVG path carried its own `translate`, the transform argument was silently ignored, both paths sat on their own origin, and the wrench overlapped the arc. Fix: apply both translations explicitly. Same favicon geometry as SPINDLE's guide mark (`fab-knowledge:originals/spindle/files/layers.py` lines 68 to 91, `translate(490,121)` and `translate(498,314)`).
2. Lumpy numerals: the TrueType quadratic decomposer stepped the point list two at a time and dropped every segment with one control point (most segments). Fix: walk implied on-curve points, as SPINDLE's `glyph_polys` does (`fab-knowledge:originals/spindle/files/pcb.py` lines 350 to 385).

### 4.4 Print and plate (README)

Print face down, no supports, 0.12 mm layers, 4 perimeters; the 1.10 recess lands in the last 9 layers (1.10 / 0.12 = 9.2, computed). Slow the first two layers or elephant foot blunts the bottom chamfer and the tips; check the right leg (the thinnest part) survives slicing. Plating: wet sand to 800, filler primer, 1500; graphite or copper conductive paint in two thin coats into the recess corners; acid copper at about 0.03 to 0.05 A/cm2 on about 32 cm2 (about 1.0 to 1.6 A, computed); bright nickel or chrome over copper; a thieving wire around the perimeter if the apex and tips grow dendrites. Assembly: glue the backer, press N52 discs same pole out, a second pair inside the shirt.

### 4.5 Viewer kernels (`VJS`)

| kernel | construction | lines of `VJS` |
|---|---|---|
| payload `ESC1` | header "ESC1", vertex count, triangle count, per-axis float32 min and span, then uint16 positions `lo + q / 65535 x span` and uint16 indices | 14 to 29 |
| STL out | binary STL writer with per-triangle normals and an "ESCUTCHEON name" header; DOWNLOAD STL and EXPORT ALL (staggered 320 ms) | 66 to 87, 347 to 357 |
| STL in | drop any STL: ASCII by regex or binary, unindexed | 89 to 119, 443 to 461 |
| shader | WebGL2 (vertex shader line 138), flat normals from `cross(dFdx(vW), dFdy(vW))`, a procedural environment (sky gradient, softbox, key, fill, horizon band, pink rim), Fresnel `F0 + (max(1 - r, F0) - F0)(1 - N.V)^5`, recess shading `col x mix(1, 0.34, clamp((uTop - z) / uDeep))` with `uTop = bbox top - 0.02` and `uDeep 1.0`, tone map `c / (c + 0.72)`, gamma 2.2 | 147 to 196, 472 to 492 |
| finishes | RAW (0.72, 0.70, 0.66; metal 0, rough 0.72), COPPER (0.86, 0.44, 0.24; 1.0, 0.27), NICKEL (0.79, 0.79, 0.80; 1.0, 0.20), GOLD (0.94, 0.74, 0.29; 1.0, 0.22), CHROME (0.90, 0.92, 0.95; 1.0, 0.055), BLACK (0.20, 0.20, 0.22; 1.0, 0.30) | 266 to 273 |
| assembly | slider 0 to 100: badge at `+24 a`, backer at -3.0 in RAW, magnets at `-3.0 - 36 a`; the assembly always draws the magnet backer, also for a badge meant for the bar pin | 341 to 345, 494 to 529 |
| camera | yaw and pitch at 0.0085 rad/px, pitch clamped +/-1.53, pan with shift or right drag at `dist x 0.0016`, wheel x1.11 clamped 28 to 520, `baseDist = 2.15 x max(w, h)`, distance grows `1 + 0.62 a` with the assembly slider so the open stack stays in frame; FRONT (yaw 0, pitch 0), ISO (-0.62, -0.52), BACK (PI, 0); SPIN 0.0055 rad per frame; perspective 0.62 rad | 325 to 332, 397 to 434, 494 to 507 |
| shader extras | the derivative normal is flipped toward the viewer (`dot(N, V) < 0`), so a drop-in STL with any winding shades; diffuse light is the environment sampled along N at roughness 0.95; `uFlat` blends to a flat `base x 0.55 + 0.22` | 172 to 193 |
| startup | builds the rail, selects `delta-ifixit` by default (a third-party mark), sets polygon offset (1, 1) for the edge pass, refreshes the status footer every 700 ms; any failure shows "Startup failed: <message>" over the page | 531 to 541 |
| edges | an edge index buffer (`edgeIndex`) drawn as lines with polygon offset when EDGES is on | 37 to 47, 482 to 489 |

No three.js: the viewer is about 540 lines of WebGL2 with its own matrix math, which is why it is 485 KB with all eight meshes.

---

## 5. UX anatomy and what makes it excellent

| region | contents |
|---|---|
| shell | void `#0a0a0a`, ink header with a 2 px pink rule, IBM Plex Mono with VT323 for instrument readouts in slime green `#a6e22e` |
| header | ESCUTCHEON, "starfleet delta / hack.build", "SET 6 + 2 BACKERS" |
| left rail 222 px | MODELS: Badges and Backers groups, each tile an SVG silhouette thumbnail, name, size |
| stage | WebGL2 canvas over a radial gradient, hint line, drop zone "DROP STL" |
| right rail 250 px, BENCH | FINISH (six), VIEW (FRONT, ISO, BACK, SPIN, EDGES), ASSEMBLY slider (badges only), SPEC table, DOWNLOAD STL, EXPORT ALL, print note |
| footer | MODEL, TRIS, VERTS, FINISH, MANIFOLD, RECESS |

What makes it excellent: the badge is judged as the finished plated object (copper, nickel, chrome) instead of grey plastic, the recess reads as depth without an AO pass, the assembly slider shows how it is worn, and every model downloads as an STL from the same page.

---

## 6. Known limits and failure lessons

| # | issue | state |
|---|---|---|
| 1 | generator missing; the STLs and the embedded payloads are the only geometry | open |
| 2 | third-party marks | LICENSING 1.6 |
| 3 | magnet spacing 23 (code, README table) against 25 (README assembly) | open |
| 4 | MANIFOLD PASS is a fixed string | the port computes it |
| 5 | R1 and R2 hand-drawn outlines wrong | traced outline, never hand drawn again |
| 6 | mark translation ignored, glyph quadratics dropped | fixed in R5 (section 4.3) |
| 7 | flat SVG outlines listed but not shipped | open |
| 8 | the viewer opens on the iFixit face and its rail shows all three third-party marks as thumbnails | a port opens on a project-owned face and omits third-party models |
| 9 | payload indices are uint16 (`unpack`, lines 14 to 27), so the `ESC1` format holds at most 65535 vertices per model; a dropped STL gets a sequential Uint32 index (three vertices per triangle, `UNSIGNED_INT` draw) and is drawn without the EDGES overlay, which is built only for uint16 meshes under 200000 indices (`VJS` lines 240 to 262) | a port picks the index width per mesh |

---

## 7. Tests and harness

None ship. Drive 2026-10-05: five shots, zero page errors (measured).

---

## 8. Port map

| item | value |
|---|---|
| packages | `geom` (outline extrusion, recessed field with standing mark, stepped chamfer, two-depth marks), `exports` (STL), `ui-core` (finish shader, recess shading, assembly slider, STL drop), `catalog` (magnet and bar pin hardware) |
| feature kinds | `pocket` (magnet pockets, bar pin slot); no kind for a recessed emblem field, a two-depth mark, or a stepped chamfer |
| canon ids | none |
| canon MISSING | `recessed-emblem-badge` (field recess with the mark standing, inverse emboss), `stepped-chamfer` (print-as-bevel steps), `magnet-backer` (pocket pair with spacing rule), `plating-prep` process note, `traced-outline-from-svg` (with explicit path transforms) |
| reference ids | MISSING; never a reference with third-party marks (LICENSING 1.6) |
| milestone | none named |
| lineage row | MISSING |
