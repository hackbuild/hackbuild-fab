# The art and inlay pipeline

This is `hackbuild-inlay` plus `artboard`. The operation COLLAR, SPRUE, SLATE,
CASK, SASH, COAMING and KNURL all perform.

## The operation

Art in (raster or vector), flush inlay out. Trace, clean, place, project,
quantize to N filaments, split into bodies with an exact shared boundary,
check printability, emit.

Headless half (`inlay`): trace, clean, project, quantize, split, check. The
MCP needs all of this with no UI.
Surface half (`artboard`): drag, scale, rotate, snap, live preview.

## Colour modes

Three, and all three are needed:
- mono threshold
- silhouette
- match palette (nearest filament slot, so a multicolour SVG lands on the
  right extruders in one step)

Otsu threshold with a dark-background polarity flip is the default for
dropped art.

## Zones

Generalised from COLLAR's faces to COAMING's rectangular zones. Each carrying
face has a zone rect {id, cx, cy, w, h, mirror, cuts}. Layers paint SLOT
NUMBERS onto a canvas label grid at res px/mm. The vector lamina holes out the
zone rect only, so window rings and chamfers stay vector.

Any layer can be flagged `cut`, routing it into a holes mask that removes
material through the full thickness on both faces.

## Print-reality controls

Every bench needs these four, and they are the difference between art that
prints and art that does not:

- stroke boost (dilate per slot)
- colour gap
- despeckle
- min feature

DESPECKLE THRESHOLD IS 0.35x THE AREA OF A DISC OF MIN FEATURE, not the disc
itself. At the full disc it ate the full stop out of "hack.build". Verified
both ways: the period survives and sub-minimum dashes still get removed.

Min feature values in use: 0.62 mm (SPRUE), 0.6 black / 0.35 white gap with
per-layer too-thin and losing-detail flags.

## Text

Text is live canvas fillText, NOT traced, for the benches. A pipe splits a
string into two colours (`hack|.build` puts the tail in the accent slot) and a
split-gap slider adds real air at the break. That gap is the fix for the
period-kerning problem.

For cut files and gerbers, text must be OUTLINED to polygons with fontTools,
because those consumers have no font. But not for KiCad silkscreen: use
editable gr_text there, because gr_poly has no holes for letter counters.

FONT DETERMINISM: canvas fillText SILENTLY FALLS BACK when a web font is not
loaded, and a font never used in the DOM never loads. Embed the brand fonts as
base64 @font-face with font-display block, await document.fonts.load for them
at boot, THEN clear the bbox cache and rebuild.

## Mirroring

Art on a bed-facing face is read from the other side once the part is flipped,
so mirror it in X AT EXTRUDE TIME. The face function still returns it as-read;
only the extrude mirrors. Expect it to look backwards in the slicer's bottom
view.

Lid art follows the laptop convention: upright to the person across the table
when the lid is open.

## Depth

Inlay depth 0.6 to 1.2 mm. 1.2 = exactly 5 layers at 0.24. Two layers of black
hide white, while white over black needs 1.2. That asymmetry decides which
colour is the body.

## Direct manipulation, the acceptance bar

A face editor without the full handle set was REJECTED. The bar is:

- mask-bounds bbox (layerBBox computed by rendering the layer at res 160 and
  taking mask bounds, cached by a signature)
- corner scale squares
- rotate dot with 0/90/180 snaps and shift for 15 degrees
- click to select, both ways in sync with the layer list
- wheel zoom, right or middle drag pan
- centre snap guides, alt to disable
- shift axis lock
- arrow nudge, shift for 5 mm
- Delete, ctrl D, bracket keys
- drop images at the cursor
- double click on text focuses the textarea
- exact print raster after a build, 4 px/mm quick preview while dragging

THE HARNESS MUST DRAW THE HANDLES AND DRIVE THEM TOO.

Arc text has no dx/dy, so dragging it sets arcR and arcDeg instead.

## The text focus bug

The text input's callback must not re-render the layer list; that tears the
input out of the DOM mid-typing. Patch the header title in place, debounce the
preview at 240 ms while typing, and wait for the field's `change` event before
rebuilding.

## Checks that belong to inlay and nobody writes

- stroke below line width
- island smaller than a nozzle
- inlay depth below the opacity floor for that filament
- art crossing a chamfer where projection distorts
- negative space too thin to survive the inset
- a same-slot box adjacent at a diagonal without the 0.012 overlap

## Prior art, checked

HueForge and its browser clones (Kromacut, ColorStack, PrintPal),
LithophaneMaker, ItsLitho, Bambu Make My Lithophane, MakerTools3D. All are
image-to-plate. None have geometry, edge treatments, rim bands, insert
pockets or minimum-feature handling. That gap is the reason to exist.
