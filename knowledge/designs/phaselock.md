# PHASELOCK SHEET: how it is made

Record written 2026-10-05 from the original code. Slug `phaselock`. Family sheet-machines. A flat-printed PETG plus TPU metasheet: five zig-zag rows of rigid PETG links joined by captive TPU flexures between two end bars, whose hidden link angles make each row family straighten (and stiffen) at a different strain. One self-contained HTML file with an exact-geometry kinematic view, the OpenSCAD source, the compiled meshes, a 3MF, a validation coupon pack, a claim ledger and a measurement gate.

Number rules for this file. A number in a code table is a declared value copied from the file and line named in that row. A number marked "computed" was rerun on 2026-10-05: the geometry equations with python 3, and the embedded meshes with trimesh 4 and manifold3d through `uv` (watertightness, body counts, extents, volumes, PETG and TPU intersection). A number marked "measured" comes from the headless drive of the shipped page the same day (Chrome, swiftshader, 1280 x 860, 0 errors). "Declared (page)" means the page states it and this record did not rerun it. "Vendor" means a FlashForge source the page cites.

Short paths: `F` is `fab-knowledge:originals/phaselock/files/`. `H` is `F/phaselock_sheet_v1.html`. `SC` is `F/extracted/phaselock_v1.scad`.

---

## 1. Identity and revision

| field | value |
|---|---|
| name | PhaseLock Sheet V1, a proof-driven metamaterial for the Creator 5 Pro |
| owner's slug | phaselock (no registry row; the nearest registry concept is HEDDLE, "printed mechanical metamaterial as an addressable display", which has no files) |
| canonical file | `F/phaselock_sheet_v1.html` (copied from `~/Downloads/phaselock_sheet_v1.html`) |
| sha256 | 342147d41b665ceab352020ff9a6754c15d4723152a8f51f3cd8b5b70bd1392f |
| bytes | 2400539 (2346490 on line 252, the base64 `EMBED` blob) |
| date | 2026-08-18 18:27; embedded zip and 3MF entries are stamped 2026-08-19 00:43 and 00:45, which is 17:43 and 17:45 in UTC-7 |
| runtime | raw WebGL, no libraries, no network; opens from `file://` |
| provenance | the 3MF `Designer` metadata reads "OpenAI engineering prototype" (`F/extracted/phaselock_v1_aligned.3mf`, `3D/3dmodel.model`), so this design came from a session outside the owner's benches; one revision exists |
| printer | FlashForge Creator 5 Pro, four toolheads, PETG and TPU 95A, 0.40 mm nozzle on both active tools, 0.20 mm layers |

### 1.1 Every revision found

One: `~/Downloads/phaselock_sheet_v1.html`, also copied to `fab-knowledge:evidence/x/downloads/dl-sweep/phaselock/`. No earlier or later file in Downloads.

### 1.2 Why this revision

It is the only one, and it is good on its own terms: every geometry claim on the PROOFS tab recomputes to the stated digits (section 5), the embedded meshes are watertight with the stated body counts and envelope, and PETG and TPU do not overlap (computed, section 6). It claims no physical validation and says so.

### 1.3 What is in `fab-knowledge:originals/phaselock/files/`

| path | what |
|---|---|
| `phaselock_sheet_v1.html` | the page |
| `extracted/phaselock_v1.scad` | the OpenSCAD source from the `SCAD` string (`H:254`), 258 lines |
| `extracted/phaselock_v1_PETG.stl`, `phaselock_v1_TPU.stl` | the compiled meshes from `EMBED.petg`, `EMBED.tpu` |
| `extracted/phaselock_v1_aligned.3mf` | two objects, PETG and TPU 95A, base materials #52B7FF and #82E58F |
| `extracted/phaselock_validation_coupons.zip` | ten STLs (clearance, hinge, three single rows, PETG and TPU each) and `VALIDATION_README.txt` |

The three single-link STLs (`EMBED.l25`, `l30`, `l35`) are used by the moving view and were not copied (derivable from the SCAD).

Hashes: `fab-knowledge:originals/phaselock/SHA256SUMS`.

---

## 2. What it makes and for whom

A test sheet for a maker with a multi-material printer who wants a part that is compliant at small stretch and stiffens in three steps. Stretch the two end bars apart: each row is a zig-zag chain of four rigid PETG links joined by TPU hubs; the hinges rotate easily until a row's chain is straight (its kinematic singularity), after which further extension has to stretch TPU axially and the row gets much stiffer. Two rows straighten at 10.34 percent, two at 15.47, one at 22.08, so the sheet stiffens in three stages. The page refuses to claim any force or stiffness until the builder prints the coupons and enters measured values.

---

## 3. Shots

From the headless drive (puppeteer-core through `fab-knowledge:originals/_tools/shoot-tang-sensors.cjs`, 2026-10-05). Copies in `fab-knowledge:originals/phaselock/shots/`.

| file | caption |
|---|---|
| `p01-sim-rest-materials.png` | SIM tab at 0 percent strain: five rows of blue PETG links with green TPU hubs, tongues and rivet heads between two blue end bars; the rows table (25, 30, 35 deg; L 44.1351, 46.1880, 48.8310; singularity 10.3378, 15.4701, 22.0775 percent); HUD "Phase 0, compliant rotation" with β per row; CAD integrity box. |
| `p02-strain-12pct-phase-colours.png` | Strain 12 percent, colour by phase: the two 25 deg rows straight and orange (AXIAL PHASE), the 30 and 35 deg rows still zig-zag (β 14.08 and 23.44 deg). |
| `p03-strain-23pct-all-axial.png` | Strain 23 percent: every row straight, Phase 3. |
| `p04-exact-openscad-mesh-explode.png` | View "Exact OpenSCAD rest mesh", material explode 8 mm: the compiled PETG mesh below and the TPU mesh above, rivet heads lifted out of their counterbores, tongues out of their slots. |
| `p05-proofs-ledger.png` | PROOFS tab: the claim ledger (PROVED, VERIFIED, MEASURE) and proof 1. |
| `p06-validate-gate.png` | VALIDATE tab: "NOT PHYSICALLY VALIDATED", the zero-hidden-assumption gate fields left blank, coupon download, measured row force inputs. |

---

## 4. Mechanism: phase-programmed zig-zag rows (rigid-link singularity)

What it does. Gives rows of identical rest span different straightening strains by choosing a different hidden link angle per row.

Equations (PROOFS sections 1 to 3, `H:51 to 87`; JS `Lof`, `lockOf`, `betaOf`, `ampOf`, `H:267 to 270`):
- Link length L(α) = X0/(N cos α), so every row has rest span N L cos α = X0.
- At angle β: X = N L cos β; strain ε = X/X0 - 1, so 1 + ε = cos β / cos α and β(ε) = arccos((1 + ε) cos α).
- Singularity when β = 0: ε* = sec α - 1.
- Kinematic gain |dβ/dX| = 1/(N L sin β), which goes to infinity as β goes to 0: near straightening, extension has to become axial deformation. No modulus appears.

| constant | value | where |
|---|---|---|
| N links per row | 4 | `SC:16`, `H:255` |
| X0 rest span | 160.0 | `SC:17` |
| row pitch | 42.0 | `SC:18` |
| row angles | 25, 30, 35, 30, 25 | `SC:19` |
| link width | 11.20 | `SC:21` |
| body inset | 15.10 | `SC:22` |
| anchor offset | 16.50 | `SC:23` |

Results (computed, python):

| α | L | ε* | amplitude L sin α | β at 12 percent |
|---|---|---|---|---|
| 25 | 44.1351 | 10.3378 % | 18.6523 | 0 (straight) |
| 30 | 46.1880 | 15.4701 % | 23.0940 | 14.08 deg |
| 35 | 48.8310 | 22.0775 % | 28.0083 | 23.44 deg |

The drive's HUD at 12 percent shows the same β values (measured).

Sheet force from measured rows (PROOFS section 9, `H:176 to 182`): the five rows act in parallel between common end bars, so F_sheet(X) = 2 F_25(X) + 2 F_30(X) + F_35(X) with no material law; the VALIDATE tab sums pasted measured curves only at strains present in all three (`commonMeasuredPoints`, `H:297`).

---

## 5. Mechanism: captive TPU flexure joint (rivet, tongue, hub)

What it does. Joins two PETG links with a TPU hub that bends in plane, without relying on PETG to TPU adhesion: each tongue ends in a dumbbell rivet whose heads are wider than the PETG hole.

Construction (`SC` lines 48 to 155), in order:
1. `capsule2d_between(p0, p1, w)`: hull of two circles; `beam3d` extrudes it.
2. PETG link (`petg_link_between`, `SC:71 to 86`): a capsule from `p0 + u body_inset` to `p1 - u body_inset`, width 11.2, 3.0 thick; minus a rivet void at each anchor (`p + u anchor_offset`): counterbore d 6.8 from the bottom face to 0.62, through hole d 4.0, counterbore d 6.8 from 2.38 to the top; minus a tongue slot of width 2.0 from the joint node to the anchor.
3. TPU joint (`tpu_all`, `SC:138 to 155`): a hub disc d 6.0 full thickness at each internal node; two tongues (`beam3d`, width 1.2) from the node to the two neighbouring anchors; a rivet at each anchor: head d 6.0 x 0.6, shaft d 3.2, head d 6.0 x 0.6.
4. End joints (`tpu_end_joint`, `SC:116 to 128`): the hub at each row end connects both the terminal link and the end bar ("The previous concept only reached the bar and left the terminal link unanchored").
5. End bars (`petg_endbar`, `SC:93 to 114`): 14 wide, inner edge at X0/2 + 9.5 (3 mm hub radius + 6.5 mm free flexure), rivet voids and straight tongue slots per row, two d 7 clamp holes.
6. Material switch: `material = "PETG"`, `"TPU"`, `"CHECK"` (intersection, must be empty) or the coloured assembly (`SC:157 to 163`). The default is `"ASSEMBLY"` and the comment on `SC:7` lists only PETG, TPU and ASSEMBLY; CHECK works but is undocumented in the file header.

Tongue in its slot (inferred from `SC:71 to 91`). The PETG body ends 9.5 mm from the node, but the 2.0 mm slot runs on through the body to the rivet at 16.5. Between the body end and the counterbore edge (16.5 - 3.4 = 13.1) the 1.2 mm tongue lies loose in the slot with 0.40 per side, about 3.6 mm of tongue that can bend until it touches a slot wall. The page counts only the 6.5 mm in the open; the extra length lowers the real bending strain, so the 4.03 to 5.64 percent figures stay upper bounds, and the slot walls become a stop once the tongue has deflected 0.40.

| constant | value | where |
|---|---|---|
| layer, thickness | 0.20, 3.00 (15 layers) | `SC:10 to 11` |
| nozzles | 0.40 PETG, 0.40 TPU | `SC:12 to 13` |
| neck (tongue) width | 1.20 | `SC:26` |
| slot width | 2.00 (0.40 per side) | `SC:27` |
| shaft, hole | 3.20, 4.00 (0.40 radial) | `SC:28 to 29` |
| head, counterbore | 6.00, 6.80 (0.40 radial) | `SC:30 to 31` |
| head thickness | 0.60 (3 layers) | `SC:32` |
| hub disc | 6.00 | `SC:33` |
| end bar width, margin, clamp hole | 14.0, 8.0, 7.0 | `SC:36 to 38` |
| EPS | 0.02 | `SC:40` |

Equations and results (PROOFS sections 4 to 8, `H:88 to 175`; all recomputed, python):
- Free flexure length = body inset - link radius - hub radius = 15.10 - 5.60 - 3.00 = 6.50.
- Ideal beam ratio of axial to rotational stiffness, modulus cancels: R = (12/w²) (N² L² sin² α)/((4N - 2)(N + 1)) = 662.7, 1015.9, 1494.2 for 25, 30, 35 deg at w 1.2 (computed). A model, not a measurement.
- In-plane bias: I_out/I_in = (h/w)² = (3.00/1.20)² = 6.25 (computed).
- Constant-curvature outer-fibre strain (w/2)(α/6.5) = 4.03, 4.83, 5.64 percent (computed). Not an allowable.
- Cap to cap gap at a joint 2 x 15.10 cos α - 11.20 = 16.17, 14.95, 13.54 (computed), so neighbouring PETG links are disjoint and the gap only grows under tension.
- Row to row: worst amplitude 28.0083, gap 42.0 - 28.0083 - 11.2 = 2.7917 (computed).
- Capture: head 6.0 over hole 4.0 gives 1.00 mm of overlap per radius; PETG wall around a counterbore (11.2 - 6.8)/2 = 2.20; bridge between counterbores in the shortest link 44.1351 - 33.0 - 6.8 = 4.3351 (computed; 6.388 and 9.031 in the longer links).
- Envelope 207.000 x 223.208 x 3.000 mm against 256 x 256 x 256 (computed from the STL; build volume vendor).

Fits and print settings. 0.40 mm per side everywhere, chosen inside FlashForge's 0.4 to 0.6 "easier insertion" band (vendor, `H:235`), so the clearance coupon must pass before the sheet is printed. Solid infill for coupons and sheet; temperatures, flow, speed, cooling and pressure advance deliberately unspecified (coupon README).

Finding 2026-10-05 (computed): the axial gap between each TPU rivet head and the PETG counterbore floor is EPS, 0.02 mm (the counterbore is cut to `cap_t + EPS` = 0.62 against a 0.60 head). Sampled TPU surface points come no closer than 0.02 mm to the PETG (trimesh signed distance). At 0.20 mm layers the TPU head's top layer and the PETG ledge above it print in contact, so the joint is captive radially with 0.40 clearance but has no axial clearance; any PETG to TPU bond there is real in print even though the design does not count on it. The clearance coupon tests radial clearance only.

---

## 6. Construction: exact meshes, coupons and the CAD audit

The page embeds the compiled meshes and draws them two ways (`H:316 to 365`): "Moving mechanism" instances the exact single-link PETG STL per link at the kinematic node positions and draws TPU hubs, tongues and rivets as boxes and cylinders between their real anchors; "Exact OpenSCAD rest mesh" draws the two full STLs with an optional material explode. After a row passes its singularity the moving view draws the chain at length N L and stretches the end tongues to visualise axial compliance; the page labels this a visualisation, not a force law (`H:358 to 360`).

Coupons (`SC:165 to 258`, packed in `extracted/phaselock_validation_coupons.zip`, eleven entries: ten STLs plus `VALIDATION_README.txt`, all stamped 2026-08-19 00:43): clearance ladder (four captive holes at 0.20, 0.30, 0.40, 0.50 mm per side, with TPU rivets), hinge coupon (two 44 mm arms around one production joint, for a torque-angle curve), single-row coupons for 25, 30 and 35 deg with terminal hubs and small fixture bars. Every coupon calls the same modules and constants as the sheet.

Gaps in the coupon set (inferred from `SC:165 to 258`):
- No value of `material` renders a coupon. The coupon modules are only defined (the single call inside the file is `row_coupon_endbar` from `row_coupon_complete_petg`), so the ten STLs were exported by a wrapper that does not ship. A port should add a `COUPON` switch to the source so the pack can be rebuilt.
- The clearance ladder is a 12 x 12 block per step with the counterbore and through-hole grown by the step on both diameters. It has no tongue slot, so the 2.0 mm slot around the 1.2 mm tongue is never tested, and the axial gap stays at EPS on every step.
- The hinge coupon puts the joint straight (nodes at -44, 0 and 44 on one line, `SC:186 to 190`), while every production joint sits bent at 2α at rest; the torque-angle curve starts from a different zero. Its comment says "Two 40 mm lever arms"; the node spacing is 44.
- The complete row coupon (`row_coupon_endbar` and `row_coupon_complete_*`, `SC:219 to 258`) uses a 30 mm tall end bar with two d 7 clamp holes at plus and minus 9, the same 9.5 inner offset and the same end hub as the sheet.

Mesh audit (computed, trimesh and manifold3d):

| mesh | watertight | bodies | extent mm | volume mm³ |
|---|---|---|---|---|
| PETG sheet | yes | 22 (20 links, 2 bars) | 207.0 x 223.208 x 3.0 | 30132.4 |
| TPU sheet | yes | 25 (15 internal joints, 10 end joints) | 199.0 x 192.562 x 3.0 | 6498.9 |
| PETG and TPU intersection | | | empty (volume 0, 0 faces) | 0 |
| clearance coupon PETG, TPU | yes | 4, 4 | 54 x 12 x 3, 48 x 5.9 x 3 | |
| hinge coupon PETG, TPU | yes | 2, 1 | 68.65 x 11.03 x 3, 39 x 5.9 x 3 | |
| row coupons PETG, TPU | yes | 6, 5 each | 207 x 32.8 to 39.9 x 3 | |

These match the page's own claims (22 and 25 watertight bodies, envelope 207 x 223.208 x 3.0, empty CGAL intersection, `H:183`).

Failure lessons the page records: fused PETG link ends and an unanchored terminal link were "earlier fatal failures" caught by the body count and intersection audit (`H:183`); both are designed out (cap gap above, end hub to link and bar).

---

## 7. The claim ledger and the measurement gate

Claim classes (`H:46 to 49`):

| class | contents |
|---|---|
| PROVED | rigid-link geometry, common rest span, singularity strains, geometric clearances, captive rivet topology, build envelope inequalities |
| VERIFIED | Creator 5 Pro build volume, nozzles, layer range, four toolheads, offset calibration, PETG and TPU compatibility (vendor, FlashForge pages cited on the SOURCES tab) |
| MEASURE | printed clearance, TPU torque-angle law, axial stiffness, rivet pull-out, fatigue, dimensional error, transition loads |

Gate (`gate()`, `H:276 to 293`): nine required inputs (clearance coupon free, pull-out load, application joint load, required safety factor, application max strain, measured transition strains at 25, 30, 35, allowed transition error) plus pasted row force curves. Any blank keeps "NOT PHYSICALLY VALIDATED"; with all entered, it passes only if clearance passes, pull/load is at least the factor, each transition is within the allowed error of sec α - 1, and the common measured force samples run from 0 to the application strain. "Leave unknown values blank. The gate will not invent them." No modulus, fatigue limit, tolerance, joint strength or bond strength is hard-coded (`H:240 to 241`).

Gate details (`H:276 to 297`):
- The two "optional diagnostic" inputs, hinge kθ and row Kₐ (`H:194 to 195`), are wired to redraw and re-run the gate, but no line reads their values; they are recorded nowhere.
- `pullOK = pull/load >= sf`; an application load of 0 gives Infinity and passes any factor.
- Measured curves are joined by exact string match on `strain.toFixed(6)` (`parseMeasured`, `H:296`); a sample at 2.0 in one file and 2.00001 in another does not count. There is no interpolation, by design.
- Nothing persists: a reload clears every entry.
- The pass banner is "VALIDATED AGAINST YOUR CRITERIA", the fail banner "FAILED YOUR ACCEPTANCE GATE", and the detail line prints each criterion with its value.

This is the pattern behind D-205 (coupons from the part source module, with a clearance ladder; `docs/plan/TESTING.md` section 6.2.1) and D-199 (a `derived` qualifier for geometry-only claims, owner decision, M16).

---

## 8. UX anatomy

| part | what is there |
|---|---|
| shell | dark, Inter, PETG blue `#60b6ff`, TPU green `#8ae691`, hot `#ffce67`; badges flat print, mechanically captive, no adhesion assumption, proof ledger |
| rail (400 px) | tabs SIM, PROOFS, VALIDATE, CAD, SOURCES |
| SIM | what-it-does card; global strain slider 0 to 23 percent; view (moving mechanism, exact rest mesh); colour (materials, same colour, phase state); material explode; animate strain; reset camera; rows table; geometry-only gain plot with dashed singularity lines; a warning card on what the moving view is and is not |
| PROOFS | ledger and nine numbered proofs with equations and the mesh audit |
| VALIDATE | gate, coupon zip, SCAD download, measured row curves and their summed plot, the coupon sequence |
| CAD | 3MF, SCAD, PETG STL, TPU STL, copy SCAD; key dimensions; the SCAD in a textarea |
| SOURCES | FlashForge spec, fit guidance, TPU guide and filament wiki; one interface paper; the list of what is deliberately not sourced |
| stage | WebGL with own shader (Lambert, light (0.4, -0.25, 0.9)), yaw and pitch orbit, wheel zoom; HUD with phase title and β per row; CAD integrity box |
| camera (`H:337 to 340`) | yaw 0.05, pitch -0.92, distance 330; drag 0.008 rad per px, pitch clamped -1.52 to 1.3; wheel x0.92 or x1.08, distance 120 to 600; perspective 43 deg |
| animate (`H:364`) | strain steps 0.00055 per frame, ping-pong between 0 and 0.23 |
| phase colours (`H:342`) | PHASE STATE paints a row orange once ε reaches sec α - 1, blue before; SAME paints everything grey |
| gain plot (`H:301 to 302`) | 260 samples per family, gain normalised to 0.25 per mm and clipped at 1; dashed verticals at each ε* |
| CAD integrity box (`H:247`) | static text; it states 22 and 25 bodies and the envelope but runs no check on the embedded meshes |
| shader | normals go through `mat3(model)`, so the scaled boxes and cylinders of the moving view shade with skewed normals; the exact meshes are unscaled and shade right |
| missing | steps, hook, print card file (the coupon README carries the print constants), saved gate entries |

What makes it excellent: every number on the page is either derived from geometry with the derivation shown, sourced to the vendor, or left as a blank to be measured; the coupons come from the same modules as the part; the exact meshes are embedded and audited, and the moving view reuses the exact link mesh.

---

## 9. Tests and harness

The SCAD carries its own check (`material="CHECK"`, intersection of PETG and TPU must be empty). This record reran the mesh audit and the equations (sections 4 to 6). No JS tests ship.

---

## 10. Port map

| item | value |
|---|---|
| packages | `mesh` (two-material flat parts, rivet void and rivet as paired features), `checks` (body count, empty intersection, envelope), `profile` (coupon-measured clearance rows, D-082, D-205), `knowledge` (claim ledger classes, D-199) |
| feature kinds | captive rivet (void in one material, dumbbell in the other), flexure tongue in a clearance slot, capsule link |
| canon ids | MISSING: no canon for a rigid-link singularity row or for the captive dumbbell flexure; CANONS.md line 481 (metamaterials and folding) lists PhaseLock as nearest artifact for HEDDLE and lands nothing |
| reference ids | MISSING |
| decisions and milestones | D-205 (decided, TESTING.md 6.2.1); D-199 (owner, M16) |
| lineage row | MISSING |
| fixes to carry | axial clearance under the rivet heads (EPS 0.02 today), or state that the interface prints bonded; the clearance ladder should also vary the axial gap and carry a tongue slot; a coupon switch in the SCAD; a bent hinge coupon at 2α; read or drop the kθ and Kₐ inputs; refuse a zero application load; save gate entries; compute the integrity box from the embedded meshes |
