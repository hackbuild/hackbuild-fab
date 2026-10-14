# M-S skeleton findings

Places where a draft spec type fought the keys flex-pair geometry during the
M-S walking skeleton (D-179). Each entry gives the file, the type, what
failed and the change proposed. M-S-T11 resolves every entry before the
freeze. Numbers are computed from the build at defaults unless stated.

D-223 rebuilt the reference as the PIP flex cone key in M-S
(reference/keys/flex-pair/build.ts): cone and foot ring, and the key top,
are revolved profiles on the M00-T05 revolve route, the cap is a prism, the
column is PIP's 40-sided circle, and the export has four slots. Entries
below are stated against that build; an entry D-223 resolved says so and
names the decision. Decisions taken in M-S since this file was first
written are listed under "Decided in M-S" so M-S-T11 reads one list.

## M-S-T04 draft feature defs

### F-01 pocket cutter stage

- File: spec/feature-kinds.ts; also docs/plan/milestones/M-S-walking-skeleton.md M-S-T03 step 1.
- Type: `GeneratedGeometry.preUnionCutters`, `PRE_UNION_KINDS`.
- What failed: the spec lets only chamfer and round emit stage 2 cutters, while
  the M-S-T03 card and `packages/mesh` cut the pocket at stage 2, now as a
  `preUnionCutters` entry of the runStages cutters input
  (`StageInput.cutters[bodyId].preUnionCutters`).
  The draft pocket def emits `postUnionCutters` (stage 4), as the spec says.
- Change proposed: M-S-T03 and M-S-T08 run the pocket at stage 4, or the
  M-S-T03 card text changes "pre-union cutter" to "post-union cutter". The
  pad has no positives, so the solid is equal either way.

### F-02 width on a filled conductor region

- File: spec/features.ts.
- Type: `ConductorFeature.width`.
- What failed: the column halves are `path` regions, where a trace width means
  nothing; the type still requires it. build.ts declares colR - colGap / 2 =
  1.2 mm.
- Change proposed: make `width` part of the `centreline` region variant only.

### F-03 conductor body slot

- File: spec/features.ts, spec/feature-kinds.ts.
- Type: `ConductorFeature.material`, `GeneratedGeometry.bodies[].slot`, `KernelCtx`.
- What failed: a generator must emit a 1-based slot, the feature names only a
  material, and `KernelCtx` carries no slot table. The draft reads the slot
  from the keys flex-pair chase it serves.
- Change proposed: add `KernelCtx.slotOf(material, role)` resolved from
  chase.materials, or let the kernel fill `slot` at stage 5.

### F-04 contact has no geometry

- File: spec/features.ts.
- Type: `ContactFeature`.
- What failed: the contact carries `a`, `b`, `gap` and `coneH` and no
  position, so it cannot generate the flex key it describes. build.ts
  declares the cone and cap as a body and the split column as two conductor
  features; the contact def generates no solid and owns the two column tops.
- Change proposed: either a flex key mechanism (D-177) owns cone, cap and
  column, or `ContactFeature` gains a centre and the column dims.

### F-05 contact ends and the net graph

- File: reference/keys/flex-pair/build.ts (the spec fixture spec/fixtures/keys-flex-pair.ts keeps the skeleton-era cone for packages tests, D-223).
- Type: `ContactFeature.a`, `ContactFeature.b`.
- What failed: nothing in the types; the meaning moved. `contact.key<n>` now
  joins `conductor.key<n>col` to `conductor.gnd<n>col`, the column halves,
  and `conductor.gnd<n>stub` joins the GND half to the bus. Nets join by
  `net`. The column adds a through-layer path the M-S-T05 numbers leave out:
  one half of PIP's 40-sided column (radius 1.6 mm, gap 0.8 mm) is 2.741
  mm2 in section and runs from the trace skin 0.73 mm to colTop 4.65 mm,
  3.92 mm, so 28.6 kohm per half at 2000 ohm cm (computed, inferred row
  `cpla.pip.through`). The pressed path is 295.31 kohm in the report
  golden (reference/keys/flex-pair/expected/report.json CHK-NET-29).
- Change proposed: M-S-T05 builds nets by `net` over every conductor and adds
  the column halves to the CHK-NET-29 path; the 74.4 and 148.8 kohm trace
  numbers do not move (key trace 15 mm, bus 30 mm, asserted in the skeleton
  test). The M-S-T06 card row and the circuit path now carry both halves
  (packages/circuit/test/skeleton.test.ts, two through legs); no spec change.

### F-06 CHK-NET-02 at defaults

- File: docs/plan/milestones/M-S-walking-skeleton.md, M-S-T06 table.
- Type: none.
- What failed: the table expected 1.6 mm. On the flex key layout the least
  edge clearance between nets is 0.7559 mm, bus to the K1 column half on
  PIP's 40-sided column (computed from the generated footprints; report
  golden CHK-NET-02). It is above the 0.60 mm floor (D-085).
- Change proposed: the M-S-T06 row reads 0.7559 mm, legal at least 0.60.
  Done in the card; no spec change.

### F-07 cone on the stack route

- File: reference/keys/flex-pair/build.ts.
- Type: `ShapeDecl` stack band overlap.
- What failed: the first skeleton cone was one annular stack band per layer
  (14 at defaults) plus the cap band, and the 0.01 to 0.02 mm band overlap
  could lower the cap underside over the hole.
- Resolved by D-223: cone and foot ring, and the key top, are revolved
  profiles on the M00-T05 revolve route in M-S; the stack band overlap
  concern no longer applies to the reference. The revolve shape it now runs
  is F-14.

### F-08 the cap diameter param

- File: spec/fixtures/keys-flex-pair.ts (chase).
- Type: keys item field `d`, "cap diameter at the top face".
- What failed: PIP derives the cone base from hole, wall, angle and cone
  height: 10.80 mm at defaults, 12.01 mm at cone 4.08 (computed). `d` no
  longer sizes a body. The pocket now seats max(d / 2, cone base / 2) + 0.3
  mm per side and build.ts warns CONE_BASE when the cone base is wider.
- Resolved by D-223: the key top landed and `d` is now PIP's key face
  diameter (chase label "face", default 10 mm), the face disc radius of the
  key top and an input of the key height; the well is sized from the cone
  base, wellR = rsb + 0.6 mm. No spec change; the old cap reading and the
  CONE_BASE warning are gone.

### F-09 flex key constants in build.ts

- File: reference/keys/flex-pair/build.ts.
- Type: none; architecture law, profile owns every number.
- What failed: cone wall 0.6 mm, angle 40 degrees, hole 3.6 mm, cap 0.72 mm,
  face 1.2 mm, protrude 2.6 mm, column gap 0.8 mm and the rest of `FLEX`,
  with PIP's fits rows (`FITS`) and EZ 0.02 mm, are PIP source values
  (D-085, D-223) typed as constants in build.ts, with the source cited.
- Change proposed: a `flex` param group in the chase or profile rows with
  provenance, at M05 with the conductor kinds.

### F-10 trigonometry outside the geom table

- File: spec/build.ts (`Author.ring`), reference/keys/flex-pair/build.ts, reference/keys/flex-pair/skeleton-kinds.ts.
- Type: `Author.ring.circle` (D-175).
- What failed: the cone radii use Math.tan and Math.sin in build.ts, and the
  draft stroke ends use a unit circle from Math.cos and Math.sin. Every value
  snaps to 1/1024 mm before meshing; one meshHash across node, Chromium and
  WebKit is unproven for these.
- Change proposed: packages/geom exports the committed table and its angle
  functions at M00; the stroke and the cone read them.

### F-11 half disc

- File: spec/build.ts.
- Type: `Author.ring`.
- What failed: the split column needs a circle clipped by a line; `Author.ring`
  has circle, roundRect and offset only, so build.ts clips with a local
  helper (`halfRing`).
- Change proposed: `Author.ring.clip(ring, halfPlane)` or a manifold
  CrossSection intersection (D-163).

### F-12 which side of the face

- File: spec/features.ts.
- Type: `ConductorFeature.region.face`, `ConductorFeature.t`, `PocketFeature.depth`.
- What failed: both faces in the build point up (+z). The pocket goes depth
  into the face (below it) and the conductor sits t above it. The draft
  follows the fixture; the types do not say which side `t` grows on.
- Change proposed: document that `t` grows along the face normal, and
  generate only on faces whose normal is +z until M05.

### F-13 conductor clip to the body

- File: spec/features.ts, packages/mesh.
- Type: `ConductorFeature` centreline "clipped to the body outline".
- What failed: the key trace ends on the pad edge at y = -H/2, so its round
  end overhangs by w / 2 = 0.7 mm. The draft emits each segment as a csg
  intersection with the host body; the M-S mesh slice has no csg route.
- Change proposed: M-S-T08 lowers that one csg intersection, or the mesh
  slice gains it. The mesh stage runner now carries a csg route
  (packages/mesh/src/stages.ts), so the reference runs csg in M-S; F-15.

### F-14 ShapeDecl revolve field per row

- File: spec/build.ts (`ShapeDecl` revolve), packages/mesh/src/routes/revolve.ts.
- Type: `field?: { id, params }`, one per shape.
- What failed: TENON gives each profile row its own radial field;
  packages/mesh `revolveRows` takes a field per row (`RevolveRow.f`) and
  passes 448 of 448 recorded TENON calls (m00-report.md M00-T05), while
  `revolveShape` reads the spec type and applies its one field to every
  row with r above 0. The spec type cannot express what the route runs.
- Change proposed: per-row or per-band field refs on the revolve profile,
  decided by a new DECISIONS.md entry.
- Freeze timing: MILESTONES.md 1.5 first put the revolve route under "other
  routes M00". D-223 makes the M-S reference run revolve (no field), and the
  1.5 build.ts row now freezes ShapeDecl revolve at M-S, so M-S-T11 either
  freezes the revolve shape with this change or records why revolve stays
  draft to M00 exit and corrects the 1.5 row.

### F-15 routes the reference runs against the freeze row

- File: docs/plan/MILESTONES.md 1.5 (build.ts row), spec/build.ts.
- Type: `ShapeDecl` route variants.
- What failed: the 1.5 row freezes ShapeDecl prism and revolve at M-S. The
  reference build emits prism (pad, caps) and revolve (cones, key tops), and
  its conductor defs emit csg intersections (F-13), so csg also runs in
  M-S. No reference body runs stack since D-223, though the pocket and
  conductor defs still declare `routes: ["prism", "stack"]`.
- Change proposed: M-S-T11 freezes the variants the reference runs
  (prism, revolve, csg) or names in the 1.5 row why one stays draft, and
  the two skeleton defs declare the routes they emit.

### F-16 model area printed by another tool

- File: reference/keys/flex-pair/build.ts (pad top, the bezel term),
  tools/py/gcode/analyze.py (the foreign deposit rows).
- Type: none; a print defect the virtual exit B found (D-234, D-235).
- What failed: before D-236 the pad top sat below the key tops, so the
  slicer laid a PETG Internal Bridge over both key tops at layer 30: 8.653
  and 8.635 mm2 of cones top1 and top2 replaced by T0 (computed from the
  slice of 2026-10-07; fab-knowledge evidence/virtual-print/before/
  report-slice.md). Every check passed on that build: no check holds the
  class "a body's area printed by another tool", and the guard in
  reference/keys/flex-pair/test/reference.test.ts holds this one design.
  The analyzer test tools/py/test/test_gcode_analyze.py now holds both
  slices (before: 2 rows, after: none).
- Resolved by D-236: the pad top keeps PIP's bezel term, and the slice of
  2026-10-08 (evidence/virtual-print/m04-fixer/report-slice.md) reports no
  region printed by another tool. The class needs its own check so the
  ratchet reaches every design: CHK-KEY-07, the flex key's solid layers
  stand above the host body's top shells, block, origin keys flex-pair
  virtual exit B 2026-10-07, milestone M05 (CHECKS.md 9.16, written
  2026-10-08).

## Decided in M-S

Contract changes the skeleton forced after the first findings. Each is
decided; M-S-T11 freezes the type as decided.

- D-223: the reference is the PIP flex cone key (cone, foot ring and key top
  on the revolve route, four slots on ffc5p). Resolves F-07 and F-08; F-14
  and F-15 follow from it.
- D-224: spec/part-ir.ts `Body.outline`; checks read the Part IR only.
- D-225: spec/checks.ts `LegalValues` interval ends and spec/circuit.ts
  `PinReading.pullupOhm` are null when open.
- D-227: `hbf parity --accept` writes only the four JSON goldens; the
  flex-pair section SVG and PNG and the README print card and checks blocks
  are written only by `HBF_ACCEPT=1 npx vitest run reference/keys/flex-pair`.
  No spec type changes.
- D-234: a virtual exit B stands in provisionally for the print (owner
  instruction 2026-10-07); M04 starts on draft contracts and the physical
  print stays required. No spec type changes.
- D-235: slicer G-code analysis is a test level; T11 may freeze
  provisionally only what exit A and the virtual print both exercised.
- D-236: the flex-pair pad top keeps PIP's bezel term (pad top 6.01 mm,
  computed); found by the virtual print. No spec type changes.
- D-237: the 3MF writer stays names only; headless slices complete the
  project from bundled presets. No spec type changes.
- D-238 (owner): the slicer presets slots 3 and 4 name. No spec type
  changes.

### Held

- `PartDraftAt<"M00">` refuses a pocket in another design and
  `PartDraftAt<"M03">` refuses a conductor
  (reference/keys/flex-pair/test/admission.ts, checked by tsc -b). No change.
