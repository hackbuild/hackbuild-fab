# Art engine: laying colour onto faces

The COLLAR method, reused in COAMING zones, SPRUE and the INLAY bench. Each face (or
rectangular zone on a case) is composed on a 2D canvas at `res` px/mm; layers paint SLOT
NUMBERS into a label grid; hygiene passes make the result printable; the kernel meshes it.

## Layers

Layers are an ordered list per face. Later layers paint over earlier ones, only over body
cells (art never overwrites the rim band or air). Every layer has `dx, dy, rot, slot, cut,
mute`. Kinds:

- text: `text, font, size (mm cap height ish), ls (letter spacing mm), arc (radius mm,
  + top / - bottom, 0 straight), splitGap, slot2`. Live canvas `fillText`, never traced
  outlines: fonts must be loaded first (see below). A pipe splits the string into two
  slots: `hack|.build` puts `.build` in slot2. `splitGap` adds real air at the break,
  which is the period kerning fix from the challenge coin.
- image: `src (data URL), w, mode (mono | silhouette), thr, invert`. Drop PNG / JPG / WebP
  / SVG. mono = luminance below threshold becomes ink; silhouette = any opaque pixel;
  invert flips polarity for dark backgrounds. COLLAR also has match palette: nearest
  filament slot per pixel so a multicolour SVG lands on the right extruders in one step.
  SPRUE uses Otsu thresholding with automatic polarity from the background.
- shape: `ring, rect, ellipse, frame, diamond, chevrons` with `w, h, t (stroke)`.
- logo: the canonical hack.build mark taken from the header SVG (COAMING) or the two
  path favicon geometry (challenge coin). Never redraw the mark; scale it via the
  calibrated viewBox `117 103 800 800`.
- cut: any layer flagged cut routes into a holes mask that removes material through the
  full thickness on both faces (keyring holes, open field emblems).

Layers point at slot NUMBERS, not colours, so the design can be laid down before anyone
decides what the filaments are. The colour step then badges each slot with body / rim /
which faces use it.

## Composition order (composeFace)

1. Base: signed distance of the blank shape per cell; inside = body slot; the rim band
   (0 > d > -rimW) = rim slot; outside = air.
2. Each layer: clear the canvas, paint the layer as an alpha mask (two passes for a piped
   text), stamp cells with alpha > 127 as the layer's slot where the cell is body, or into
   the cuts mask.
3. Hygiene per non body slot (below).
4. Re-stamp the rim band (exact geometry, hygiene must not eat it).
5. Cuts become air.
6. For the bed facing face, mirror in X before it becomes a slab.

Label rows run y up. Canvas rows run down. Flip on stamp.

## Hygiene, in this order

- stroke boost (`RasterMesh.dilate`, default 0.15 mm): grow the slot into body cells so
  thin brush strokes survive the open.
- min feature open (`RasterMesh.open`, radius = floor(minF / 2 * res) cells): erode then
  dilate with a disc; kills anything thinner than minF. 0.6 mm is the floor for a 0.4
  nozzle; SPRUE used 0.62 black minimum and 0.35 white gap minimum.
- despeckle (`RasterMesh.despeckle`): drop islands smaller than 0.35 x the area of a disc
  of diameter minF. The factor matters: at 1.0x the threshold ate the full stop in
  "hack.build" (COLLAR v3 bug). Verified both ways: the period survives, sub minimum
  dashes go.
- colour gap (`RasterMesh.gap`): erode a slot where it touches another non body slot so
  two colours never share one extrusion line.

Show the per layer flags the user needs: "too thin" / "losing detail" when a layer loses
more than a set fraction of its cells to hygiene (SPRUE did this per layer).

## Fonts

canvas `fillText` silently falls back to a system font when a web font is not loaded,
and a font that is never used in the DOM never loads. So:

- ship the brand fonts embedded as base64 woff2 `@font-face` with `font-display: block`
  (`build_bench.py --fonts` pulls them from @fontsource: Permanent Marker, Special Elite,
  VT323, IBM Plex Mono 400/600, about 130 KB). Then the tool is font deterministic offline.
- at boot `await document.fonts.load('16px "Family"')` for every family, then clear any
  bbox cache and rebuild. COAMING's first build ran before the fonts arrived and shipped a
  fallback face.
- typography roles: Permanent Marker for display and wordmarks, VT323 for instrument
  numbers, Special Elite for typewriter flavour, IBM Plex Mono for utility text. Do not set
  everything in one face.

## Text focus bug (do not reintroduce)

The text input's callback used to re-render the whole layer list, which tore the input
out of the DOM mid keystroke. Patch the layer's title span in place (`layerTitle(L)`),
preview on input with a 240 ms debounce, and let the rebuild wait for the field's change
event.

## Direct manipulation on the face canvas

- selection = the layer picked in the list or clicked on the canvas; both stay in sync.
- drag moves (dx, dy in mm snapped to 0.25), shift drag scales, a rotate handle with 0 /
  90 / 180 snaps and shift 15 degrees, arrow keys nudge (shift 5 mm), Delete removes,
  ctrl D duplicates, [ ] reorder, wheel zoom, right or middle drag pan, centre snap guides
  (alt disables), drop an image at the cursor.
- bbox for the selection outline: render the layer alone at low res and take the mask
  bounds, cached by a signature of the layer's fields. Arc text has no dx/dy: dragging it
  sets arcR and arcDeg instead (COLLAR).
- the exact print raster (the slab label grid) is drawn once a build exists; while
  dragging use a 4 px/mm quick preview.

## Seal treatment and other house patterns

- circle stickers and coin backs: band text curving the top edge, a second line curving
  the bottom reading left to right, pink bursts or dots at 9 and 3 o'clock, year in the
  centre. The INLAY example back face is this layout.
- wordmark: "hack" in ink, "." and "build" both in pink; on dark grounds "hack" in cream.
- no four point sparkle or diamond star glyphs anywhere in art or UI; no emoji.
- one texture per artifact; contained single shape designs for anything that gets cut.

## Image to colour research (COLLAR)

HueForge and its browser clones (Kromacut, ColorStack, PrintPal), LithophaneMaker,
ItsLitho, Bambu Make My Lithophane, MakerTools3D are all image to plate. None do coin
geometry, edge treatments, rim bands, insert pockets or minimum feature handling. That
gap is why these benches exist; do not rebuild a HueForge.
