# Taste

Not programmatic, should not be. Stored as style records the model reads as
context. These are preferences with reasons attached, not rules with triggers.

## Naming

Workshop and fastener terminology. CLASP, LATCH, CONDUYT, SATCHEL, FERRULE,
TREADLE, COLLAR, COAMING, SLATE, SPRUE, KNURL, GIB, SASH, PINTLE, SHUNT,
SHIM, TACK, STAVE, FRET, SPLINE, QUADRANT, TESSERA, VERNIER, KEYWAY, COFFER,
SLUG, TUMBLER, DAVIT, PAWL, SPOOL, STANCHION, SPROCKET, PLENUM, QUENCH,
NACELLE, SCABBARD, DETENT, BEAM, ARMATURE, SPINDLE, WASHER, TRUNNION.

Never suggest again: ANVIL, JOIST, PRONG, RIVET, LATHE, STUD, PLINTH, DOWEL,
CLEAT, BRACE. Generate fresh options every time; do not recycle a list.

Names that were rejected in use: RABBET (called dumb), BOSS (renamed to
BLOCKS), MANDREL (superseded by FAB), CASTING CALL (became Table Read),
BRIGADE (became Working the Line), CRESSET (superseded by PLINTH).

A name should have a real reason. COLLAR is the collar die, the ring that
surrounds a blank during striking and actually forms the coin's edge. SLATE
is what a clapperboard is called. SPRUE is the runner on a moulding. SLUG is
both a counterfeit coin and a blank punched from sheet. KEYWAY, GIB, PINTLE
are all real machine features.

"Bench" is no longer a generic noun for a parametric tool. BENCH is the name
of the tool catalogue. BLOCKS is not called a bench.

## hack.build visual language

Colours, exact: pink #FE0386, cream #f5f0e6, black #1a1a1a, dark #0a0a0a.
The values #ff2d7b, #ff3366 and #f5f2eb that appear in some older skills are
WRONG; the favicon values win.

Surfaces ladder: page / raised #fffdf7 / sunk #efe9db / edge #e8e0d0 /
ink / void #0a0a0a.

LIT palette for text on void: slime #a6e22e, warn #ffb020, err #ff5c4d,
info #58a6ff, plus a dim.

Signal colours ok #1f9d55, warn #c77700, err #c3251f, info #2b6cb0, for DATA
only.

Typography has DISTINCT ROLES; do not set everything in one face.
IBM Plex Mono is the wordmark and utility text. Special Elite is typewriter
band and body text. Libre Baskerville italic is the tagline. Permanent Marker
is display headlines only. VT323 is instrument readouts and panel heads.

Two panel-head styles: editorial (Permanent Marker on a rule) and instrument
(VT323 on a full-bleed ink bar, which is what KERF and the laser rigs use).

Shadows: 3 px controls, 5 px panels, 7 px hover, 5 px pink for the ONE stage.
Radius zero except numeric chips and nav dots.

One texture per artifact: halftone for app chrome, grain for pages, pink
graph rule for canvases.

Site hero wordmark: brush display caps. "HACK." in ink with a chunky pink
period, "BUILD" in cream knocked out of a slightly tilted ink block, rough
displaced edges, paper grain. In the wordmark treatment generally, "hack" is
ink and both the period and "build" are pink.

Tagline: make things. break things. repeat.

Likes the textured screen-print logo style (rough displacement, distressed
print feel) over clean flat marks.

Likes the seal treatment on circle stickers: band text curving around the top
edge, pink bursts at 9 and 3 o'clock.

Stickers must be contained single-shape designs, easy to cut and weed, no
floating transparent elements.

The logo must be scaled via a calibrated viewBox, never guessed transforms.
Mark paths use transform origins translate(490,121) for the arc and
translate(498,314) for the wrench; the calibrated square viewBox is
117 103 800 800.

Banned in art and UI: four-point sparkle or diamond-star icons. They read as
an AI signature.

## The v1.0 and v1.1 design system package

Built August 2026 and it is the ancestor of `theme/tokens.css`. Shipped as
`hackbuild.css` (hb- prefixed tokens plus every component),
`hackbuild-design-system.html` (an 87 KB living style guide rendered in the
system, nine sections, self-contained), `GUIDELINES.md` (skill-ready spec
plus a ship checklist), and nine logo SVGs (mark, mark reversed, horizontal
and stacked lockups in both polarities, wordmark both polarities, favicon)
with all type converted to OUTLINES via fontTools from fontsource woff2, so
zero font dependency. It lives in the BENCH catalogue chat.

v1.1 added the LIT palette, the full surfaces ladder with a texture decision
table, a bars-and-top-strips section (header identity, tabs destinations,
toolbar verbs, status strip counts, with heights and ordering), the two
panel-head styles, and the instrument components: `.hb-seg`, `.hb-dial`,
`.hb-sticker`, `.hb-tiles`, `.hb-segmeter`, `.hb-slider`, `.hb-list` and
`.hb-row`, `.hb-fold`, `.hb-modal`, `.hb-toast`, `.hb-bar`, `.hb-statusbar`,
`.hb-app` shell, `.hb-scope`. Pills must declare their own colour.

The acceptance test was `hackbuild-kerf-replica.html`: the KERF radio shell
rebuilt from system classes only, ten lines of tool-specific glue, live
spectrum and waterfall with the kerf colormap, Playwright driven at
390/768/1280. That is the bar for `ui`: can it rebuild KERF from components
with ten lines of glue.

The doc explicitly supersedes the hack.build sections of hackbuild-explainer,
brand-forge and board-forge; those skills still carry the wrong #ff3366 and
were not patched.

## The other design systems, and where they stop

hack.build is one of five. LumenCanvas is paper and teal with Sora, Space
Mono and IBM Plex Mono. CLASP and CONDUYT are dark industrial with JetBrains
Mono, charcoal panels, teal on dark. CommonPub and Agora are warm
institutional. OSSuary is bone and terracotta. Doc figures (power trees,
pinouts) are white with Inter and are a separate visual language from the
hack.build viewer chrome; never mix them in one artifact. `theme/` is the
hack.build system only; the others are out of scope here.

## A rule about credentials

Do not use project counts from Hackster as a credential in websites, pitch
decks or marketing materials.

## Part styling

45 degrees everywhere. One gabled window motif at four sizes. Hex-lightened
floors. Gabled web windows, hollow tube cores with 45 degree cone roofs
vented into pockets.

Skeletal truss, plate and window style for micro-servo arms, taken from
reference minimalist arm designs.

SILHOUETTE-LEVEL COMPOSITION MATTERS AS MUCH AS SECTION AREA. A technically
welded plate can still read as four loose sticks. The DAVIT crank went
through three versions because the numbers said 299 mm2 of neck and the
picture said disconnected. Verify the bay raster before shipping any crank
change.

## The sim shell

Two shells, and they are not interchangeable.

The hack.build PAPER shell is for mechanical sims: paper #fffdf7 rail on the
right, void stage with a 26 px pink graph rule, header strip in paper with
the wordmark treatment, Special Elite for titles and body, VT323 on
full-bleed ink panel heads, 3 px block shadows that press in on :active,
radius zero, live VT323 chips in the header that turn pink when good.

The CONDUYT / KERF DARK INSTRUMENT shell is for device tools: void
background, floating ink panels with 4 px black block shadows, VT323 heads
and values, 10 px uppercase tracked labels.

Picking the wrong one is a real error. A dark instrument shell was shipped
for a mechanical bench and rejected; the mechanical sims use the paper shell.

Part palette on void: pink row train, slime column train, amber links, cream
rods and pivots, 6b6459 decks and plates, 4a463c frame. Default render mode
is ghost body so the mechanism reads through the case.

## UI conventions that were argued for and won

- Numbered steps with green ticks on visited ones, a persistent guide bar
  naming the current step and its goal, next-step buttons, and a dismissible
  welcome overlay. NOT per-pane hint cards; the guide bar already says it.
- Start from a blank, not from a preset. blankState() is a full factory
  reset, and loading a preset over existing art asks for confirmation.
- Art layers point at SLOT NUMBERS, not colours, so a design can be laid down
  before deciding what the filaments are.
- The art editor handle set is the bar: mask-bounds bbox, corner scale
  squares, rotate dot with 0/90/180 snaps, click to select, wheel zoom, right
  drag pan, snap guides, alt to disable. The harness must draw the handles
  and DRIVE them too. A face editor without them was rejected outright.
- Touch vs commit: touch() is live 2D preview only; commit() locks the change
  in and schedules a debounced rebuild. Wire commit to slider `change`, not
  `input`.
- Type picker as a grid of rendered previews with nothing preselected, not a
  list with params below.
- Materials panel is the colour key, pinned at the TOP of the rail on every
  tab, not buried: swatch, extruder number, material with resistivity noted,
  which parts print in it, the role.
- Every archetype gets a HOOKUP panel with an inline SVG schematic and
  numbered hookup lines with computed resistor values.
- Assembly declarations render as their own panels: WIRING, YOU ALSO NEED,
  ASSEMBLY, FITS.
- Not overly wordy. Delete prose notes from instrument UI.
- 3D first, 2D second.
