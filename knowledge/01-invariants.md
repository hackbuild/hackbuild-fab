# Invariants

Fully programmatic, as checks. Each exists because something failed. The
registry entry should cite the failure that created it.

## Mesh and manifoldness

- Every part is a closed manifold: exactly TWO faces per UNDIRECTED edge.
  Directed-edge balancing passes on coincident faces and trimesh disagrees.
- Signed volume of every prism is positive; flip any that is negative.
- Stacked prisms in the SAME part must z-overlap by about 0.01 to 0.02 mm at
  interfaces, or the mesher fuses coincident rings into 4-face edges.
- Two same-part shells must never share a vertex: lap by EZ or inset by 0.3
  to 0.6.
- Cross-part contacts must abut EXACTLY: an EZ overlap times any real area
  trips the overlap validator.
- Coincident faces do not union in OpenSCAD. Run a leg 1 mm into its base.
- Overlap solids by >= 1 mm and start cutters OUTSIDE the face. A 0.025 mm
  sliver between two boxes, or a cutter face coplanar with the part face,
  both break manifoldness.
- Parts must sum exactly to the solid: no overlap volume between colour
  parts, and their union equals the whole.

## Triangulation

- `dedupe()` must strip consecutive duplicates AND collinear midpoints.
  earcut skips collinear boundary vertices so caps T-junction against
  per-vertex wall skins.
- `cleanLoop()` strips collinear vertices before cap triangulation.
- earcut breaks on: hole inside hole, holes sharing a support line, pinched
  self-touching loops, rows of holes with identical Y, exactly collinear
  triangles.
- A hole polygon vertex exactly collinear with another hole or the outer edge
  makes earcut emit SLIVERS. Rotate circle segmentation half a step, or jitter
  per-hole on a coordinate-keyed hash (linear jitter re-collinearises tab
  corners).
- Stroke end caps centred on the same point as another stroke's cap share
  vertices. Start a joining trace 0.35 mm inside the other.
- Stroke joint circles 0.03 over the half width avoid pinch vertices.
- Snap polygon vertices to the writer's 6-decimal grid BEFORE triangulation, [superseded by D-054: dyadic 1/1024 mm grid]
  so the sliver test is exact and node and Chromium agree.
- Run a sliver detector and retry the triangulation on failure.
- Winding must be normalised by summing signed area. earcut output is raw
  data indices, divide by dim.
- Naive ear clipping gets stuck on bridge-duplicated vertices and silently
  doubles cap area. Use a full linked-list earcut port.
- Decide contour nesting by point-in-polygon containment, NOT winding
  direction, when the font set mixes TrueType and CFF (they wind opposite).
- TextPath glyphs with counters need XOR evenodd fill plus shapely
  set_precision, or letters drop out or go non-manifold.
- Cut files are emitted with fill-rule NONZERO. Evenodd punched holes wherever
  same-net shapes overlapped.

## Printability

- Every slab of an in-place part must start on the bed or on another slab, or
  the part gets a print pose. Run a support audit that finds slabs starting in
  mid air.
- Slice every exported 3MF at the slicer's layer height and flag any region
  with nothing under it (`islands.py`). Run at 0.24 AND 0.20.
- Walls are whole multiples of line width (0.4). Vertical dims are whole
  multiples of layer height (0.2 or 0.24). Vertical steps >= 0.4 is a
  different constraint from nozzle width.
- Horizontal features >= 0.8, walls >= 1.2.
- Inner and outer wall lines must be PARALLEL. A cone whose inner wall was
  not parallel left a sub-line-width wall just above the skirt and Flash
  Studio reported empty layers. Horizontal wall = wallT / sin(theta), skirt
  bore at the same radius.
- Bore allowance +0.20 vertical / +0.35 horizontal, with slicer hole
  compensation OFF.
- Teardrop every horizontal bore, and check the peak points UP. Two composed
  rotations sent profile +Y onto world -Z and every X-axis bore got a plain
  round roof.
- 45 degrees everywhere: top edges, window roofs, snap flanks, cone roofs.
  A 45 degree cone carries itself and needs no support.
- Chamfer half-spaces are UNBOUNDED, so each sub-solid must be chamfered
  BEFORE the union.
- Use exact rounded-rect offsets, not chained shapely buffers. Chained buffers
  resample corner arcs and leave sliver seams.
- shapely closing (buffer(+d).buffer(-d)) is EXTENSIVE. At 0.4 it grew every
  net by 0.4 and ate 0.8 out of every 1.0 mm lane gap, manufacturing a
  clearance failure unrelated to the layout.
- Every hinge and latch part loaded along its layers, never across them.
- Longest unsupported bridge target: under 9 mm. Audit the longest continuous
  unsupported run of each solid's FIRST LAYER in print orientation, and
  classify unsupported regions as bridge, ledge or overhang.
- A part's bed-contact face is down-facing but NOT an overhang. Exclude faces
  within 0.35 mm of the lowest point or a flat cover reads 41.7 percent.
- No brim on a print-in-place body: it welds knuckle gaps and socket mouths
  shut.

## Assembly and reach

- Every mounting hole must be reachable with a tool. A hole you cannot get a
  driver to is not acceptable.
- Every part must be able to REACH its position past the parts installed
  before it. A geometrically fine combine can make a machine unassemblable:
  fusing rod and cap meant the face could never go on after the rods.
- Servo pockets must be PROVABLY INSERTABLE. Sweep the case pocket AND the
  flange relief to an open face. A closed flange slot means the servo cannot
  go in.
- Drill position is NOT pad centre when a pad spans two features.
- A drill must sit inside its own pad with margin.

## Connectivity

- `check_connected()` runs inside the cut file emitter and REFUSES TO NEST if
  any profile falls apart. Add this to any sheet design.
- Every part is a single connected body. Check volume, and check body count.
- If a part has fewer rings than it has holes, a cutout has escaped the
  boundary.
- A weld found by shortest-line can meet its neighbour at a TANGENCY: one
  piece in 2D, six bodies after the print shrink. Use buffer(+0.35).buffer
  (-0.35) to turn every tangency into real overlap before the shrink sees it.
- Close a profile by LESS than its joint clearance. Closing at 0.25 filled
  the 0.15 interlock notches; 0.10 bridges the tangency and leaves the joints
  open.
- Whenever WALL_TOP changes, check TAB_Z against it: a tab above wall top cuts
  floating rectangles off the wall.

## Electrical

- Single-island per net. Union-find over polygon overlap plus z intersection.
- Real polygon clearance at the EDGE level (segment to segment), not vertex
  level. A gate that tests vertices can pass while a triangulation edge
  crosses the obstruction.
- Declared taps resolve into nets. Assertions are joined / apart /
  apartExcept (articulation: cut a named part out and the set must separate) /
  makesContact.
- makesContact is only a CLAIM. Anything that has to physically touch needs a
  `fit()` with real numbers, or a tap whose radius is checked. The STYLUS pot
  wiper arms sat BESIDE the tracks and the net checker never noticed.
- Every conductor that another conductor lands on needs an explicit
  CONTAINMENT constraint in the layout as well as clearance.
- No copper under a module body on a single-layer board. (On a two-layer PCB,
  copper under a castellated module is fine, it is under soldermask.)
- Copper must stay >= 1.0 mm from the board outline on the cut layer.
- Vinyl mask must follow the real rounded outline, stay a single continuous
  piece, and keep 1.2 mm all the way round with 100 percent per-edge coverage.
- Every net's geometry rebuilds to exactly one connected island after gerber
  emission, verified by an INDEPENDENT parser.

## Motion and latching

- Governing latch identity: margin + overshoot = STROKE/2 - CAMLIFT -
  LUG_TOT. Never change R_LATCH without re-deriving STROKE.
- Half select must NOT commit. Assert it as a property, not a sample.
- A state-sampling check is only valid for parts that TRANSLATE. Anything that
  ROTATES needs its SWEPT volume. An arc is not bounded by its endpoints.
- A clash audit can only find things that should NOT touch. A whitelisted pair
  (pin in yoke, rod in face slot, cap in pocket) needs a CLEARANCE check
  instead.
- Any part with a rotational DOF must have its mesh origin ON the rotation
  axis. Then assert that the transform the renderer actually applies puts the
  local bore centres on the real pivots, at several different states. At zero
  tilt the error is exactly zero, which is why this survived every still
  render and every numeric check.
- Asserting kinematics is not asserting placement.
- Rules must be enforceable in the sim AND in firmware, or the build is
  rejected. Assert the table hash equal.

## 3MF and export

- num_filaments comes from the LENGTH of filament_colour. Every per-filament
  vector must be exactly N long.
- Never hand-roll project_settings. Port the known-good writer.
- Filament arrays all length N on every export, asserted.
- A PRINT EXPORT IS A REORIENTATION OF THE ASSEMBLY PART, NEVER A REDRAWING.
  Compare the VOLUME of every part against its assembly twin. This caught a
  latch pull whose mortise was never cut, plus four parts printed with the
  shrink and assembled without.
- Verify DXF by RELOADING every exported sheet. Belt and braces on closure:
  the closed FLAG (70=1) AND an explicitly repeated first vertex, plus
  $ACADVER in the header or ezdxf uses a legacy parse that ignores the flag.
- Re-parse emitted gerbers with an INDEPENDENT renderer and grid-compare
  against the source geometry.
