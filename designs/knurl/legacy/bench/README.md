# KNURL

A mechanical tasbih (misbaha) you roll with your thumb. Every part is 3D printed in PETG, multicolour, no fasteners, no springs, no electronics. `knurl.html` is the bench: a single file that runs from `file://`, lets you edit every dimension and all the art, animates the mechanism, and exports a print plate.

Named for the fluted thumbwheel rim, which is the whole interface.

## How it counts

Five printed parts: tray, lid, count wheel, rounds star, and the detent strip.

- Count wheel. A 50 mm disc with 33 flutes on the rim (one per bead). The rim pokes 2 mm out of the right edge of the body, so rolling the exposed edge down with your thumb turns it. Each flute is also a detent tooth. The numerals 1 to 33 are inlaid flush into the wheel top and read through a cartouche window in the lid, one at a time.
- Detent strip. A separate flat strip, 30 x 3.6 x 1.6 mm with a round bump on one edge, that drops into a slot in a block on the tray floor. Its free length of 20 mm floats above the floor and bends sideways like a diving board as each flute land passes, then springs back into the next flute with a click (about 0.9 N, 0.6 percent strain, comfortably elastic for PETG). It is separate on purpose: a beam printed standing on the floor would be fused along its whole bottom edge and about ten times too stiff to flex. Being a loose part also means you can print it in two or three thicknesses and pick the click you like.
- Rounds star. Under the wheel, a 3 slot Geneva star. A pin on the wheel underside (2.6 mm, with a flared root, or a stub of 1.75 filament pressed into a hole if you pick that option) enters a slot once per revolution and turns the star 120 degrees over about 5.5 beads (28 to 33, finishing exactly as bead 1 of the next round appears). Between drives a lock ring on the wheel underside sits in the star's concave arcs, so the star cannot drift. The star stands on a 6 mm hub that sits in a cup on the tray floor with a peg through the cup into the floor, and a rib on the lid underside bears on its top face over the half the wheel does not cover, so it is located top and bottom. Round numerals 1 to 3 are inlaid on the star and read through a mihrab arch window. A pips mode replaces the numerals with a bar that grows one pip per round. The pin's orbit reaches past the wall on the wheel side, so the wall is opened there below the wheel over about 30 degrees and a shield arc stands inside the orbit to keep the cavity closed; you can see the pin pass once per round, which is the point of a visible mechanism.
- Lid. Snaps onto the tray with five barbed tabs into a groove in the wall. A boss on its underside caps the wheel post and a rib holds the far half of the star down. The lid top and the tray bottom carry the pattern, border and calligraphy as flush inlays.

The star keeps turning after 3 rounds (position 3 rolls back to 1), so the count is continuous. Rolling the wheel backwards runs everything in reverse; the pawl is a symmetric detent, not a ratchet.

The bench animates the strip (it pivots at the block face by the lift computed from the flute profile, shown in the pawl lift readout), and the checks section reports click force and strain for whatever thickness and free length you set.

## The bench

Open `knurl.html` in a browser (Chrome or Firefox, straight from disk is fine). It pulls three.js and fonts from CDNs; if you are offline the fonts fall back to system ones and the art still builds.

Left rail: every parameter, grouped. Numbers commit on the fly; the 2D face preview updates in about 60 ms and the 3D mesh rebuilds half a second after you stop dragging (1 to 2 s, the header pill shows the triangle count when done).

Centre: three.js stage. Assembled, exploded, lid off, and print plate views. The bottom bar is the simulator: `click` (or space) rolls one bead, `run` autorolls, the slider scrubs through all rounds. The readouts show the count, the round, and the star angle with `drv` while the Geneva is engaged.

Right: live face preview showing what the windows reveal at the current count, with back / wheel / star views, readouts, the geometry checks, and exports.

Art: patterns are generated. Lattices: khatam eight point star lattice, hexagram lattice, octagon tiling, jali hexafoil (the overlapping circle screen of Lahore Fort jalis), interlaced square lattice, and an n-fold rosette. Medallions built for the round back: ajrak (a Sindhi block print in the round, kakar zigzag border, riyal coin band, then a jaal of sitara stars in challo rings with phul at the corners), wazir (a ten fold rosette in the manner of the Wazir Khan kashi kari panels, with a kite band to the rim), and chaukhandi (the sunflower medallion carved on the Chaukhandi and Makli tombs, sun ray rim, sixteen pointed petals, eight petal flower). The back text sits in a cartouche cut through the outer band, the way an epigraphic panel interrupts a border. Keffiyeh uses the actual motifs: the knot and the leaf chevron are traced outlines from the public domain keffiyeh frieze vector, and every distance is in units of the thick stripe as measured on it (thin 0.32, gaps 0.34, chevrons 3.37 tall on a 1.66 pitch, rows 3.66 apart, hem 0.32). The default layout is the original one, net across the middle with the border top and bottom, and the round window moves to the upper arc so both windows sit in the net. Keffiyeh corner frames a scarf corner instead, with the stripes crossing and the corner square carrying its own chevron block. Keffiyeh sketch is the earlier free interpretation kept as an option. The net is coarser than the cloth on purpose so its dashes and knots print at 0.4 mm. No text on any of them. Lines run into the border ring when there is one, otherwise only complete units are drawn. Text can be straight or on an arc; arc text is shaped as a straight run and then warped along the arc so Arabic ligatures stay intact. Drop any PNG, JPG or SVG onto the face or back art section and dark pixels become inlay (threshold and invert controls, plus size, position and rotation).

Presets sit at the top of the body section: classic 33, 99 names (99 flutes on a 76 mm body), eastern digits, pips, left hand, black white pink for the filaments on the shelf, keffiyeh, keffiyeh corner, and keffiyeh sketch.

Design JSON export and load round trips everything except dropped images.

## Printing

Creator 5 Pro, 0.4 mm nozzle, 0.2 mm layers, PETG. All four parts print with their show face on the bed, so the inlays are the first three layers and come out flat and sharp. No supports anywhere: the tab barbs are 0.45 mm one layer overhangs, the groove ceiling is 0.5 mm, everything else is vertical.

- Inlay depth 0.6 mm (3 layers). Body under the lid inlay is 1.2 mm.
- Fits, nominal in the model: lock ring in the star arcs 0.55, pin in slot 0.40, hub in cup 0.40, wheel on post and peg in floor 0.35, lid boss in counterbore 0.40, rim in wall notch 0.60, detent strip in its slot 0.25 per side. The bench reports each as printed, using a simple model of how FDM parts come out: convex walls grow about 0.1, concave walls shrink about 0.15, and the first 0.5 mm on the bed spreads another 0.25 (elephant's foot). With that model the lock ring keeps 0.30, pin, hub and lid boss 0.15, the post and peg 0.10, the rim notch 0.35, and the strip lands on zero, which is the light press fit it should have. The elephant's foot zone is relieved in the model where it matters: the star's bed side skin has its slots and arcs opened by 0.25, the wheel's bed side skin has its flutes and counterbore opened by 0.25, and the cup's first layers are opened by 0.25, so foot spread lands in air instead of on a mating part. Measured on the actual meshes, the lock ring never comes closer than 0.52 to the star anywhere in the cycle. Snap tabs sit 0.15 behind the wall with a 0.5 barb into a 0.5 groove. The drive pin's orbit reaches past the wall on the wheel side, so the wall is opened there under the rim (about 29 degrees each side, from 1.0 mm up to the rim notch) and a shield arc stands just inside the orbit to keep the cavity closed; the pin pokes 0.25 mm past the body outline at its widest, under the 2 mm rim overhang. A fully closed wall needs a 75 mm body with a 55 mm wheel. Star to wheel 0.5 mm, wheel to lid 0.4 mm. All of these are in the print section. The first print at 0.15 bound the star and snapped the pin, which is where these numbers come from.
- Wheel disc 3.0 mm, star 3.0 mm on a 1.0 mm hub, lid 1.8 mm, floor 1.6 mm, wall 1.6 mm. Body 70 mm across, 11.3 mm thick.
- Three filament slots in the 3MF: 1 body (tray, lid, wheel, star), 2 accent (face and back inlays, round labels), 3 numerals. The slot numbers are editable under colours.

3MF and Flash Studio. Open the file as a project (File, Open), not Import; an import only brings geometry and keeps whatever filaments the slicer already has, which is how a file can arrive with every part in one colour. The 3MF carries `Metadata/project_settings.config` declaring one filament per slot with your colours and material (PETG by default), every per-filament key written once per slot so the loader sizes the list correctly, plus the printer preset name (`Flashforge Creator 5 Pro 0.4 nozzle` by default, editable in the print section, blank leaves your selection alone) and an optional process preset name. Filament presets are named by the pattern `Generic {TYPE} @FF C5P`. If the colours still come in wrong, `knurl_default_stl.zip` has each colour as its own STL in print orientation: add a part's STLs as one multi-part object and assign a filament to each.

Suggested: 3 walls, 20 percent infill, no ironing needed on the bed faces. Print the star and wheel a bit slow (30 to 40 mm/s outer walls) so the slot walls and flutes come out clean. The detent strip prints standing on its long edge; its bending is in the layer plane, so layer adhesion is not loaded. Keep its thickness a whole number of extrusion lines: 1.6 mm is four 0.4 lines.

## Assembly

1. Slide the detent strip into the slot in the floor block, bump toward the wheel, until it bottoms out. It should sit with a little friction; sand the root if it is tight.
2. Drop the star into its cup, hub down, peg in the floor hole. Any orientation works; the lock ring will find it.
3. Set the wheel on the post. Lift and rotate it until the lock ring's cutout clears the star and it drops onto the spacer. The pin should sit just outside a slot mouth.
4. Roll the wheel once by hand. To get the wheel on, turn it so a flute sits over the detent bump and it drops straight down; the pin lands in the open slot mouth. You should feel a click per flute, and at some point the star will index 120 degrees.
5. Press the lid on with the boss over the post. The five tabs snap into the wall groove; a light knife chamfer on the inside top edge of the wall makes this easier if the tabs fight you.
6. Roll until 1 shows in the count window, then check the round window shows 1. If the round label is one step off, pull the lid, lift the wheel, and reseat it with the pin one slot over.

## First print checks

- Click strength. Print the strip at 1.2, 1.6 and 2.0 mm and try them; stiffness goes with thickness cubed, so that range covers about 0.4 to 1.8 N. The bump radius is flute radius minus 0.2 so it rolls rather than catches.
- Star core. With a 3 slot Geneva the material between slot bottoms is under 2 mm; the solid hub under it carries the peg, so it is not structural, but if it looks fragile the filament pin option narrows the slots.
- Fits. If the star rattles between rounds, drop the lock fit to 0.45; if anything binds, raise the fit in question by 0.1 and check the as printed line in the checks panel stays above 0.1. Do not go back to 0.15, that is what jammed the first print.
- Numeral legibility. 2.9 mm bold digits in Plex Mono at 0.4 mm nozzle print fine; eastern digits use Amiri and want 3.1 mm.

## Geometry checks the bench enforces

Pin under the wheel disc, star inside the cavity, star core thick enough for the peg, lock disc radius inside its valid band, numeral pitch versus digit height, window height versus pitch (so only one numeral shows), rounds window and pips clear of the wheel, labels inside the lobe, lid and wheel thickness under the inlays, tab count clear of the notch, pawl block clear of the wall, the star sweep, the lid's keeper rib and the snap tabs, strip clear of the star, strip strain under 2 percent and click force in a usable band, flute overlap, minimum text sizes. Errors in pink, warnings in amber.

The default design was verified in node with manifold booleans over a full round at quarter bead steps: wheel/star, tray/star, lid/star, strip/star, tray/wheel and lid/wheel overlap is zero at every pose, tray/lid, tray/strip and lid/strip are zero, and the only nonzero intersection is the strip's bump riding over the rim mid click, which is the detent doing its job. Sampled minimum gaps over the round: star to wheel 0.27 mm, star to lid 0.40 mm. That sweep is what caught the pin passing through the wall, which the first print would have hit; the opening and shield above are the fix. All nine bodies are watertight (stacked shells overlap by 0.01 mm inside their own part instead of sharing faces).

## Files

- `knurl.html`, the bench (core raster engine, design layer, app, all inline).
- `examples/knurl_default.3mf`, the default plate: five objects with extruder slots and the filament list, show faces down, strip standing.
- `examples/knurl_default_stl.zip`, the same as per colour STLs in print orientation.
- `examples/knurl_default.json`, the default design for the load button.
- `examples/knurl_face_preview.png`, the live face preview at bead 1.
- `examples/knurl_parts_render.png`, height shaded views of the tray interior, lid underside, wheel underside and star.
- `examples/knurl_pawl_strip.png`, the strip seated in its block under the star.
- `examples/knurl_pin_opening.png`, the tray with the pin opening and shield, and bead 14 with the disc hidden.
- `examples/knurl_back_options.png`, the four back medallions as they read from the back: ajrak, wazir, chaukhandi, jali.
- `examples/knurl_keffiyeh.png`, `knurl_keffiyeh.3mf`, `knurl_keffiyeh.json`, the keffiyeh preset: face and back preview, its plate, and the design file for the load button.
- `examples/knurl_keffiyeh_variants.png`, the corner and sketch presets.

## How the geometry is made

Raster in XY, exact in Z. Every 2D region is composed on a millimetre canvas with plain canvas booleans (fill, destination-out cuts, stroke insets), traced with marching squares at 12 px/mm into polygons with holes, and extruded between two z planes. Flush inlays are the same alpha field traced twice, once for the body skin minus the art, once for the art. That is what lets any pattern, any font, any dropped image become a printable multi-material solid without a CAD kernel. The 3MF is the Orca dialect: production extension, one mesh object per volume, a components object per part, and a `model_settings.config` that carries the extruder slots.
