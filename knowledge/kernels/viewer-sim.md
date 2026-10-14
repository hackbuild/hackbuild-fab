# Viewer and sim patterns

This is `packages/viewer` plus the harness conventions. Every single-file sim
in this body of work shares these.

## Offline and file://

three.js is INLINED. `npm pack three@0.128.0` gives the r128 UMD build, about
600 KB. unpkg is blocked in the sandbox, so an importmap page cannot even be
tested there. r128 ships no OrbitControls; 40 lines of hand-rolled orbit, pan
and zoom is enough and should live in the viewer package rather than being
rewritten per tool.

file:// blocks blob and module Workers. Put the engine in a plain `<script>`
that exposes an API on globalThis, try the Worker, fall back to running it
inline.

Meshes embed as base64 BINARY STL or as int16/uint16 quantised indexed
geometry against a bbox lo/span. OpenSCAD writes ASCII STL; convert to binary
before embedding, 7x smaller.

For a big machine, embed OUTLINES and extrude them rather than meshes. 69
meshes as binary STL were 19.4 MB and 26 MB base64, which is not a page. The
DXFs for every cut part totalled 468 kB, and they are also exactly the data
the DXF export needs.

## The origin question, ask it every time

DOES THIS MESH CARRY ITS OWN OFFSET?

This has caused four separate bugs:
- a link exported with its world offset swung about a point 48 mm below its
  pins
- lugs got their offset added a second time by the viewer
- a cap that bakes FACE2_Z means probing local (0,0,T) gives the wrong answer
- a part emitted in world coords then given a viewer offset is buried

RULE: export moving parts in their OWN frame with the origin ON the axis of
rotation, and let the viewer supply position and rotation.

And three composes an object matrix as T(position) * R, so a hand-rebuilt
scene transform puts the recentre AFTER the rotation.

## The assertion that catches placement bugs

Take the transform the RENDERER ACTUALLY APPLIES (position plus
Ry(rotation.y) applied to the local bore centres) and check both bores land on
the two real pivots, at several different states.

At zero tilt the error is exactly zero, which is why the link-origin bug
survived every still render, the rest-state audit, and a 128-placement
kinematics comparison. ASSERTING KINEMATICS IS NOT ASSERTING PLACEMENT.

## The placement diff

Dump every viewer part's world AABB from the headless harness (transform the
geometry bbox corners by the local Euler, then by the parent group) and
greedily match against the independent build's exact mesh bounds. Anything
unmatched is mispositioned.

False positive worth knowing: transforming a bounding box's CORNERS is exact
for a rotated rectangle but INFLATES A ROTATED CIRCLE by sqrt(2).

NEVER EXCLUDE A PART CLASS FROM A CHECKER TO MAKE IT PASS. Model it instead.
A crank excluded as "not modelled by the audit" hid a real bug.

## Cell groups

One THREE.Group per cell at its position with a rotation; every cell part is a
CHILD in cell-local coords using the same placements as the axis-aligned
revision. Assert each group's rotation is a pure expected value. Same trick in
OpenSCAD and in the Python audit.

## Registry discipline

If a registry SNAPSHOTS object state it must snapshot ALL of it, and nothing
may be assigned to the object afterwards. Bit three times: `reg()` captured
position but zeroed rotation, so `a.rotation.x=-PI/2; reg(a,...)` was wiped by
the next apply; and assigning `o.position` after `reg()` reset the part to the
origin. Write to the registry's own lx/ly/lz.

Explode passes must REBUILD position from lx/ly/lz, never read position back
in a later pass.

## Derive the needed-mesh list

three.js BUILDS A MESH WITH UNDEFINED GEOMETRY AND RENDERS NOTHING, SILENTLY.
No console error, no warning, the page looks fine.

So the NEED list is DERIVED by regexing `G.<name>` out of the template, and
the build RAISES if any referenced mesh was never rendered. Never
hand-maintain a list that another file already determines.

Also assert every non-Group registered part HAS geometry. A Group legitimately
has no geometry, so exempt isGroup or you get false failures.

## Camera and controls

- damped orbit (lerp toward a target state)
- elevation sign must match every other 3D tool; it was inverted once
- proportional wheel zoom, not sign-stepped
- zoom toward the CURSOR via raycast
- right or middle drag pan in the screen plane using the camera matrix columns
- double click to focus
- camera presets are CORRECTNESS, not taste. A BACK preset must be azimuth PI
  (vertical-axis flip) or correct ink reads backwards
- compute framing from the model dims, never hardcode
- per-scene bounding radius cached at fit; viewBox derived from pivot plus
  R/zoom plus pan each frame, so no rerender for zoom or pan and no jitter
- painter sort by VIEW-SPACE depth for an SVG iso engine, so it stays correct
  at any yaw; base plates get the lowest priority so the ground never paints
  over far-side parts

## Readability

- black EdgesGeometry overlay at about 24 degrees as a CHILD of each mesh so
  it inherits the transform
- but TAG raster zone prisms and skip edge lines on them, or inlaid text looks
  striped
- hover tooltip with the part name, click to select, selection dims everything
  else to a ghost material and frames the camera on it
- section or clip plane on X/Y/Z with a slider
- ghost keeps conductive, aux and flex SOLID while fading only the structure,
  because the moving parts sit under a carrier on most sensors
- in servo mode the whole drive is inside the case, so ghost or x-ray is the
  useful view; in knob mode the knobs are the only thing outside
- default render mode is ghost body so the mechanism reads through the case
- flat shading plus edge lines plus polygonOffset kills inlay z-fighting
- face-soup records (not merged indexed meshes) give crisp flat shading;
  computeVertexNormals on merged meshes smooths them

## Performance

- cache each part's transform SIGNATURE and only re-upload when its own
  transform changes. Re-uploading every vertex buffer on every slider tick is
  what made a drive sim janky.
- stimulus sliders update live on `input`; GEOMETRY sliders wait for release
- KiCad .wrl models are ONE MESH PER FACE GROUP (a 1x15 header is 364 meshes).
  Merge by material at conversion, and merge repeated grids into one geometry.
  428 to 89 visible meshes, with a budget gate at 150.
- texture scale must adapt to device and clamp to MAX_TEXTURE_SIZE (20 px/mm
  desktop, 12 mobile)
- under swiftshader, a 1100x720 screenshot takes about 40 s and 520x360 takes
  11 s, so headless shots need a 240 s timeout, not playwright's 30 s default
- THREE.DoubleSide on transparent materials doubles fragment load and stalls
  element screenshots past 20 s. Drop DoubleSide and clip a page screenshot.

## Mobile

- viewport-aspect camera framing; a fixed distance cuts the board off in
  portrait
- pointer-map gestures: 1 finger orbit, 2 finger pinch plus pan, tap and
  double-tap with 12 px touch slop
- portrait sheet vs landscape side panel
- verify at 390, 768 and 1280: no console errors, no clipping, no horizontal
  scroll

## The canvas z-index trap

A canvas appended to a container AFTER the tab buttons, with
position:absolute inset:0, stacks OVER them. With alpha:true you still SEE the
tabs through the transparent buffer, so nothing looks broken, but every click
lands on the canvas. Give overlay UI an explicit z-index whenever a canvas
shares its container.

## Physics in a sim

- PBD (position based dynamics) with relaxation, not explicit springs. A sheet
  stiff enough to read as tensioned fabric explodes under explicit integration
  at any sane timestep; relaxation is unconditionally stable and the PASS
  COUNT is the stiffness knob.
- three spring families, all needed: structural (4-neighbour) alone shears
  into nothing; shear (diagonals) alone folds; BEND (2 apart) is what stops a
  crease over an obstacle instead of a curve off it.
- resolve collisions INSIDE the relaxation loop. After it, the constraints
  pull the sheet back through the collider between passes.
- refresh colliders EVERY FRAME from the same state the rest of the sim uses,
  so the skin is driven by the mechanism and not a copy.
- pre-tension is the interesting knob: rest length = spacing x tension. At
  0.94 a set pixel is a crisp bump; at 1.00 the pattern turns to mush.
- A DEAD SOLVER LOOKS EXACTLY LIKE A SETTLED ONE. Assert the height CHANGES by
  the expected throw.
