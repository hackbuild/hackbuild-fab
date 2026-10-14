# Mesh kernels

Three distinct meshing approaches have been used and each is right for
different work. Do not merge them; pick per part kind.

## 1. Raster in XY, exact in Z

Used by COLLAR, SPRUE, KNURL, PLINTH, and the inlay family.

Each face is composed on a 2D CANVAS, so images, live text and arc text all
land in the same place with ZERO vector boolean code. Then the solid is cut
into Z slabs, each slab gets a Uint8 label grid (0 = air, 1..N = filament
slot), and the mesh is the quads where two labels differ.

Consequences:
- No CSG at all. Every hole is a hole in a label grid.
- Text is live canvas fillText, not traced outlines.
- Edge styles are r(theta, z) functions sampled into an 8192-entry angular
  LUT per slab, so the per-pixel loop is a table read. Styles flagged zDep
  (knurl, rope, beaded) force slab-per-layer slicing.

Mesh reduction chain, in order: greedy rectangle merge on caps, run merge
along walls, cross-slab wall merge keyed by run identity, then
`conformQuads()` which REINSERTS vertices that greedy merging left dangling.
Without that last pass the parts are hole-free but NOT manifold (13k to 30k
dangling edges). Cross-slab wall merge cut triangles from 180k to 110k.

Pinch repair before meshing: a voxel set that meets itself corner to corner
or edge to edge has a non-manifold vertex or edge no matter how it is
meshed. Every 2x2x2 window (padded with air) must have both the L cells and
the not-L cells face connected, for every label L present including air.
Violations are healed by flipping one cell (bridge a B cell to L, or
dissolve the smaller component). Invisible at grid resolution. `fixPinches()`
returns the cells flipped; warn if over 0.2 percent of the grid.
`validate_3mf.py` runs a vertex-fan check precisely because edge pairing
alone passes these.

Watertight rule for raster boxes: a same-slot box adjacent along the right or
top edge OR AT A DIAGONAL (a shared vertical edge once vertices merge) gets a
0.012 overlap. Body boxes at a zone border bleed 0.03 into the lamina.

Typical output: a 44 mm coin at grid 512 is 88k triangles and a 775 KB 3MF.
Default grid 512, not 640, to keep auto rebuild around a second.

BLOCKS was built on the print-forge skill (orca3mf.js verbatim,
validate_3mf.py as the gate, part1.html shell) and found the exact prism
kernel needs the 1 micron insert insets and 6-decimal vertex snapping to [superseded by D-054: dyadic 1/1024 mm grid]
pass the overlap and sliver checks on LARGE parts. Those two rules are now
in the 3MF dialect and in `02-ordering-rules.md`.

## 2. Constructive prisms, no CSG

Used by COAMING, OGEE's consolidated app, PLINTH, SCABBARD, BLOCKS.

Parts are STACKS of overlapping watertight prisms per object; slicers union
them. Every hole is a hole in an OUTLINE. Walls needing apertures extrude in
their OWN plane (px/py) so ports and vents are region holes.

The OGEE app measured whether this is general: `prismatic.py` walks each mesh
in z, cuts a band wherever the cross-sectional area steps, extrudes one
section per band, and compares against the mesh's own volume. 49 of 69 parts
rebuild EXACTLY. Nearly every failure was a POSE artifact (parts lying along
x or y need banding on their own axis).

What falls outside a prism stack: revolves. Pivot pins, drive pins, shaft
collars, and hub and bore chamfers. But no revolve primitive was needed in
the end: BISECT bands whose two ends disagree until parallel, so a cone comes
out as fine prisms at 0.1 mm, well under a layer. Bisect, do not slice the
whole band.

So the kernel needs exactly two primitives: PRISM (outline plus thickness,
earcut) and optionally REVOLVE. And no CSG.

Skinning: skin once per contiguous RUN, and cap only where a neighbour's
section differs.

THE BUG THAT MATTERED: `canon()` forcing every ring positive, holes included,
means winding cannot be read back off the area. Skinning a hole the same way
round as its outer boundary turns the surface INSIDE OUT through the hole.
Use the hole FLAG.

Geometry can be POLYGON RINGS parsed from the same DXF the laser gets, then
extruded. STIPPLE did this: 8632 points and 128 kB, versus tens of thousands
of triangles, and the viewer cannot drift from the laser.

## 3. Exact prism / apex / revolve / lathe

Used by STYLUS, GIB, TANG R6.

No voxel slabs. Caps come from a BRIDGED triangulation, walls from the
ORIGINAL loops, so bridge edges never become geometry.

Traps:
- Naive ear clipping gets stuck on bridge-duplicated vertices and silently
  doubles cap area. Use a full linked-list earcut port.
- earcut output is raw data indices (divide by dim) and its winding must be
  normalised by summing signed area.
- Serpentine arcs: the start angle must be -pi/2 for BOTH turn directions,
  with only the sweep sign flipping. Getting that wrong traverses the arc
  backwards and self-intersects the stroke.
- The trace router must MITER inside corners; the weld drops zero-area
  triangles.
- TANG R6's approach: re-slab each part at every z breakpoint, union per
  slab, step each slab 2 microns above the one below, and weld with a
  same-slot foot prism over the shared footprint. Keeps every mesh watertight
  after vertex merge and every overlap inside one filament.
- earcut fails on rows of holes with identical Y and drops exactly collinear
  triangles, so triangulate a ROTATED COPY with a 0.1 micron jitter KEYED ON
  THE COORDINATES, so shared boundaries stay coincident across parts.
  Jitter alone is not enough: a 12-hole row still gave 18 zero-area cap
  triangles on attempt 0 (M00-T03). An edge-flip pass follows, flipping the
  long edge of each zero-area triangle with its neighbour, so no vertex is
  added and every index still points at an original vertex
  (`flipDegenerate`, packages/geom/src/earcut.ts). The row then gives 0.
- Revolve under the D-054 snap: TENON's thetaList adds feature-edge columns,
  and where two of them sit closer than half a grid step on a small radius
  they snap onto one grid point. 1 of 448 TENON calls left 304 zero-area
  triangles that way (M00-T05). Every revolve mesh goes through `snapWeld`
  (packages/mesh/src/hash.ts), which welds shared grid points and drops the
  collapsed triangles. The stage runner welds boolean output the same way.

## The manifold-3d boundary

- A union over coplanar raster faces can come back with collinear float32
  slivers even when the slots are disjoint (M00-T06 fault A). union.ts
  simplifies a batch whose only failure is zero-area triangles and takes it
  only when it verifies.
- `status()` is not the whole guard. `new wasm.Manifold(mesh)` throws a
  ManifoldError "Not manifold" for some meshes before `status()` can be read,
  so a check of `status()` alone lets a raw error escape E_KERNEL. OPEN as
  M00-T06 fault C in `03-diagnostics.md` (toManifold in
  packages/mesh/src/stages.ts); the fix is a try/catch round the constructor
  that maps the error to E_KERNEL.
- The pinch healer with freeze after three flips and a 200-pass cap still
  fails to converge on one hex COLLAR design. OPEN as M00-T06 fault B.

## Skeletonising (lightening a plate)

Do not redraw. Skeletonise each plate from ITS OWN PROFILE: keep a 4.0 band
round the outside, a 2.6 collar round EVERY hole, a 2.2 lattice on the
feature lines, open the rest. Working from the profile's geometry rather than
a feature list means nothing can be forgotten.

Two traps, both real:
1. Connectedness is the whole risk. Take the smallest loose piece, find the
   SHORTEST LINE to the rest, lay a web along it CLIPPED TO THE ORIGINAL
   PROFILE, repeat. A weld can then only ever add material the full part
   already had.
2. A weld found that way can meet its neighbour at a TANGENCY. One piece in
   2D, six bodies after the 0.05 print shrink. Fix with
   buffer(+0.35).buffer(-0.35) before the shrink sees it.

And the blind spot: it preserves the OUTLINE perfectly and cannot see
anything that was never in the outline. It silently threw away eight stop
bosses. Check the z range of every skeletonised part against its full twin.

Typical result: full OGEE frame 776 cm3 to 198 cm3, 26 percent. The deck
stays densest at 42 percent because it carries a slot for every lug.

## Print orientation

`orient.py` scores all 24 axis-aligned poses per part on bed contact, then
overhang steeper than 45, then height. Bed contact first because a part that
lifts is a failed print; overhang second because it is support and a bad
surface; height last because it is only time.

It caught four parts that were wrong by eye. And the general rule: WHEN NO
POSE SCORES WELL, THE PART IS WRONG, NOT THE POSE.

Every part needs TWO exports where print pose differs from assembly pose: `x`
and `x_asm`. A print export is a REORIENTATION of the assembly part, never a
redrawing. Compare volumes between the twins; that caught a paddle whose
mortise was never cut plus four parts printed with the shrink and assembled
without.
