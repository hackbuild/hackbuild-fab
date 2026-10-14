# Verification method

The checkers are the strongest part of this body of work. This file is the
method, not a list of checks (those are in `01-invariants.md`).

## The layered gate suite

Every serious project ends up with the same shape of suite. Run all of them
before shipping.

1. Kinematics check (pure numbers, node or python)
2. Mesh audit at SOLVED placements (trimesh plus manifold3d boolean
   intersection, per pose)
3. Swept-volume audit for anything that ROTATES
4. Fits table (drawn / after-loss / class / verdict, exits nonzero out of
   band)
5. Physical possibility (insertability, loom continuity, socket void vs
   material, wall thickness)
6. Printability (overhang, islands, bridges, first-layer footprint, support)
7. Connectivity (single body per part, single island per net)
8. Print-pose parity (volume of each part vs its assembly twin)
9. Export validation (3MF, STL, DXF, gerbers, all reparsed independently)
10. Viewer placement diff (world AABBs vs the independent build)
11. Headless browser run in real chromium, driving every control
12. RENDER TO PNG AND LOOK AT IT

## The big process lesson

I CAN RENDER MESHES TO PNG AND VIEW THEM. Every prior round shipped 3D content
sight unseen, and numeric checkers pass while the model looks broken.

`render.py` replicates the viewer's EXACT placement math so the PNGs show what
the browser shows. What looking revealed, all invisible to every numeric
checker: output shafts floating disconnected, knee shafts pointing inboard, a
shoulder incoherent three ways.

ALWAYS RENDER AND LOOK BEFORE SHIPPING ANY 3D DELIVERABLE.

An ASCII silhouette via `trimesh.contains` over a raster (multiple samples,
avoid sampling exactly on faces) is a reliable fallback when image echo drops
renders. It caught a wire-slot conflict the numbers alone missed.

And SILHOUETTE COMPOSITION MATTERS AS MUCH AS SECTION AREA. A technically
welded plate can still read as four loose sticks.

## The holes in each kind of check

These are the important part. Each one cost a real bug.

- A CLASH AUDIT can only find things that should NOT touch. A pin in a slot is
  supposed to touch, so the pair is whitelisted, and a pin that never engages
  looks exactly like one that engages perfectly. Whitelisted pairs need a
  CLEARANCE check instead.
- A STATE-SAMPLING CHECK is only valid for parts that TRANSLATE. An arc is not
  bounded by its endpoints.
- AN ANALYTIC CHECKER THAT MODELS THE GEOMETRY INDEPENDENTLY CANNOT CATCH CAD
  ERRORS. The mesh must be ROUND-TRIPPED. A parts file built every body
  downward and placed every motor pocket 160 mm sideways; two analytic
  checkers passed and only decoding the STL into the sim found it.
- A CHECKER THAT COVERS ONLY THE PARTS YOU MODELLED misses bought boxes.
  Servos are not meshes.
- A CHECKER THAT COVERS ONLY THE INSTANCES YOU THOUGHT OF misses the family.
  Row and column drive chains were checked; the latch chain had no pin at all.
- AN AUDIT THAT KEEPS ITS OWN COPY OF THE NUMBERS IT IS AUDITING IS NOT AN
  AUDIT. Three times.
- A GATE THAT TESTS VERTICES can pass while a triangulation EDGE crosses the
  obstruction.
- BOUNDING BOXES ARE USELESS for collision answers on assemblies. Use
  proximity.closest_point, and report CLOSEST APPROACH rather than pass/fail,
  because 2.40 mm reads as contact in a render.
- A SYMMETRIC PROBE POINT is blind to a mirror by construction. Use two
  features of DIFFERENT colour at mirror-image x on the same y for position,
  and an L-shaped fiducial drawn THROUGH the text transform for glyph
  orientation.
- A DECLARATION IS NOT A TEST. makesContact only claims.
- RUNNING A PHYSICS SIM ONCE IS LUCK. Run MULTIPLE TRIALS headless. A single
  SLUG run looked fine; six trials exposed arching at 5.5 of 13 vends.

## Headless browser

Playwright is available and chromium launches with
`--enable-unsafe-swiftshader --use-gl=swiftshader`. USE IT on every
single-file sim. It caught a class of bug (frame-timing latching) that node
stubs, the mesh audit and the placement diff all missed.

Expose a debug hook on globalThis (`__ogee`, `__feeler`) with the sim's verbs
and state. Keep it: it is how the hard bugs get found.

Always REGENERATE the harness from the current HTML. A stale harness with the
old page baked in cost a full debugging pass twice.

Careful writing the script: calling clear and then drive in the same tick lets
the still-running clear animation wipe the writes, which looks exactly like a
regression.

## jsdom

Cheaper than a browser and catches ReferenceErrors and dead controls that
`node --check` cannot. Gotchas that cost time:

- `view.clientWidth` is 0, so aspect goes NaN, the projection matrix goes NaN,
  and EVERY raycast silently returns zero hits. Picking looks broken when it
  is fine. Define a real viewport and guard resize with Math.max(1, ...).
- a dblclick with no hit calls reset-view, so measuring camera movement after
  a burst of synthetic events shows 0. Test ONE interaction per assertion.
- node cannot import https URLs; install three locally and rewrite the
  specifiers
- the three module namespace is FROZEN, so stub WebGLRenderer in the SOURCE
  TEXT, not by assignment
- the body must be written into the project dir to resolve node_modules
- `global.performance = jsdom's performance` recurses infinitely; use node's
- stub HTMLCanvasElement.getContext with a Proxy no-op for 2d, plus a Path2D
  shim and requestAnimationFrame
- WebGLRenderer will throw, which is the intended fallback path, so wrap its
  construction in try/catch

## Parameter sweeps

- perturb EVERY parameter and assert the triangle set CHANGES. This is how a
  "the parametrics do not do anything" complaint gets answered with evidence.
  Dead params are then either a real bug or a documented exception.
- 600 random states, or 1015 parameter cases across all archetypes, asserting
  mesh manifoldness and every net assertion.
- a full param liveness sweep plus a headless pass driving every slider on
  every archetype.

## Cross-implementation agreement

- pull the kinematics block straight out of the BUILT HTML, run it in node
  against stub three.js, and compare N placements against the python. This is
  the tool that closes the "sim drifts from CAD" bug class.
- port the assembly to JS and cross-check every instance's world position
  against the python build.
- assert that the browser bundle and the headless test run IDENTICAL code by
  substring check.
- md5 the exported STLs before and after any change to a part that has already
  been physically printed.

## Environment, cold start

A fresh sandbox has no openscad (`apt-get install openscad`), no trimesh /
shapely / rtree / ezdxf / matplotlib (`pip --break-system-packages`), and no
three.min.js (`npm pack three@0.128.0`).

trimesh sectioning and ray casting need `rtree`.

Source zips often do not carry generated intermediates, so minimal or derived
parts rebuild EMPTY until the generator chain has run. The tell is two parts
reporting the same wrong volume.
