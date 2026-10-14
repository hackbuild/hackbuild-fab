# Ordering rules

Fully programmatic, but as COMPILER RULES rather than checks, so the wrong
order is unexpressible instead of merely detected. A few become lints.

## Mesh construction order

1. Chamfer each sub-solid BEFORE the union. Chamfer half-spaces are
   unbounded.
2. Cut the bore AFTER the union. A flange disc unioned over a bored clamp
   fills the bore back in.
3. Wall cuts run BEFORE adding knuckles. Running clearance channels after the
   knuckle union severed the base knuckles.
4. Union all cutters, THEN do one manifold difference. Sequential boolean
   subtraction corrupts meshes when cutters share an axis (a horn screw bore
   and a coaxial driver channel silently ate later cuts).
5. Snap vertices to the 6-decimal grid BEFORE triangulation. [superseded by D-054: dyadic 1/1024 mm grid]
6. Build the outer polygon FIRST so nudges write back before the polygon is
   used as a hole.
7. Queue prisms per Mesh and triangulate together at part() time. If any
   nudge fires, re-triangulate the whole design once from the nudged polygons
   so shared polygons stay identical across parts.

## Multi-filament band order

1. PETG bands must cut EVERY feature alive in their overlap zone, or a 13
   micron shelf sits inside the trace above.
2. Holed bands overlap FULL bands, not the reverse.
3. Every non-PETG insert is inset 1 micron by a TRUE EDGE NORMAL offset. A
   homothety about the centroid pushes spirals sideways into the wall.
4. Bed offsets travel as 3MF item transforms so vertices stay small.

## Gerber emission order

1. Emit the pour first, then islands, LARGEST AREA FIRST. An island inside
   another polygon's cleared interior gets wiped by that clear if drawn first.
2. Index the rings; never test `ring is polygon.exterior`. Shapely returns a
   NEW ring object on every `.exterior` access, so the identity test silently
   wrote every interior hole as filled copper.
3. Do not clear the pour under a whole module body: that strips the bottom
   annular rings off the module's own through-holes. Keep out only the antenna
   zone.
4. Through-hole pads need BOTH sides' annular rings. Copper and mask that only
   get their own side's pads produce holes with no bottom ring.
5. Excellon G90/G05/M71 go BEFORE the header terminator.

## Copper lane order

- Lane order is a PARTIAL ORDER, not a sort key. Sorting the fan by travel
  deadlocks, because a short-travel net whose source lands inside a
  long-travel net's horizontal must sit FARTHER from the rail. Build the
  constraints and RANK them.
- The two constraints: a source drop crosses lanes FARTHER from the rail; a
  finger drop crosses lanes NEARER it.
- The rank must index DOWN the lane list when lane zero is farthest from the
  rail. Indexing up inverts every constraint.
- The lane rule has TWO conditions and checking only one shaves traces: no
  two horizontals overlap on a lane, AND each vertical clears only the lanes
  it actually passes through.
- Within a module column, a LOWER pin must take the NEARER lane, or its
  horizontal escape cuts through a higher pin's vertical.
- Route shortest net first in the two-layer A* grid router. Longest first
  blocked the lanes. Rip up and reroute through committed traces at a soft
  cost.
- The trace travelling FARTHEST takes the LOWEST lane when the terminal block
  is above the lanes; the mirror when it is below.
- A ground ring can only be cut ONCE per tile without an interior GND feature,
  or a second cut disconnects it. One window per signal edge, all channels
  through it.

## Slab and lamina order

- Re-slab each part at every z breakpoint, union per slab, step each slab 2
  microns above the one below, and weld with a same-slot foot prism over the
  shared footprint.
- Skin once per contiguous RUN of identical bands, not per band. A wall plate
  sliced into 23 bands for a 0.70 chamfer came out 51k triangles for a
  500-edge outline.
- Cap only where a neighbour's section differs. A cap between identical bands
  is a face buried inside solid material.
- Bisect bands whose two ends disagree until parallel, rather than slicing the
  whole band. Slicing all of a 5 mm cylinder with a 0.5 fillet gave 50 copies
  of four annuli.

## Lints

- em dash or en dash anywhere in source, prose or generated UI: build failure
- emoji: build failure
- chained shapely buffers where an exact offset exists: warn
- a checker that hardcodes a constant that exists in the params file: fail.
  This has shipped three times (fits.py twice, check_drive.py once).
- two assignments on one line with a comment between them: fail. A comment in
  front of `DRIVE_Y = 126;` silently parked four parts at y = -1.5.
- a hand-maintained list that another file already determines: fail. Derive
  it by regex and raise if a referenced item was never produced.
