# Inlay and printed cases

## COLLAR, the reference art bench

Single file, about 105 KB, runs from file://. Assembled by build.sh from
part1.html plus part2.js plus part3.js plus part4.js. Real smoke tests via
playwright, then STL edge-pairing in python plus trimesh plus lib3mf.

Typical output: 44 mm coin at grid 512 gives 88k triangles and a 775 KB 3MF,
all parts watertight with consistent winding, zero overlap, parts summing to
the solid.

Four revisions of UI, each one a real complaint:
- v2: hard to navigate for someone new, and the mesh should rebuild when a
  change is locked in. Gave numbered steps, a guide bar, the touch/commit
  model, auto-rebuild, and ensureMesh() so a stale mesh can never ship.
- v3: too busy, options in the wrong order. He starts with art and text, then
  edge and colours. The idea that made the reorder work: ART LAYERS POINT AT
  SLOT NUMBERS, NOT COLOURS.
- v4: the exported 3MF must actually carry the filaments. Root cause and fix
  are in `kernels/3mf-dialect.md`.
- v5: direct manipulation on the face previews, shapes, cutouts, casino edge,
  and the printer dropdown fix.

Research on what people actually want in challenge coins
(challengecoins4less, veperpins, unitcoins, challengecoinwarehouse,
miraclecustom): cutouts, custom shapes, edge treatments (rope, cross cut,
oblique line, wave, petal, spur, bezel, reeded), edge lettering, sequential
numbering, 3 to 6 colours, 1.75 and 2 inch standard sizes.

STILL NOT DONE: edge lettering (needs cylinder-wrapped text) and sequential numbering with batch export.

## SPRUE

White body, black inlay, BECAUSE two layers of black hide white while white
over black needs 1.2 mm. Coin 36 x 2.4 mm, inlay 3 layers each face, 0.8 mm
border ring. Pick is a 351 teardrop 25.8 x 30.7 x 1.2 with a keyring hole.
Bed-side art mirrored in X. 0.62 mm min feature cleanup.

CAVEAT recorded: SPRUE's 3MF uses the Application tag trick and instanced
objects but NOT the full 127-key template, so the filament list may import as
one. Fallback is loading the plate white plus black STLs as one multi-part
object.

## COAMING

About 990 KB single file after the last pass. Seven archetypes: FOLDING DECK
(default), SLAB, HANDHELD, FIELD BOX, PANEL HEAD, WRITER, HOST.

The complaint that started it: "selecting custom dims doesn't do anything.
this ui is ass the file also doesn't export right." The fix: THERE IS NO
CUSTOM MODE. Every part row shows editable w/d/t at all times; selecting a
library part prefills them, typing over any field rebuilds live.

Part library with provenance on every entry (manufacturer drawing vs retailer
vs community consensus, marked with a tilde in the UI). Verified entries
include spi35 85.42 x 55.6 (lcdwiki), hdmi5 121.00 x 89.48 act 108.0 x 64.8
(Waveshare H V4 drawing, correcting an earlier wrong rev), rii518 108.5 x 58.2
x 10.2, round4 126 x 126 x 17 act 101.52 sq, pi5 t = 17 per official drawing,
18650 cells 18.6 x 65.2 exact.

ASSEMBLED VIEW: builders return an `asm` block with per-object pos, rotX,
lift, group, and a hinge or tilt. Fold prisms carry grp base/lid so the lid
swings on an open slider. Hardware ghost boxes colour-coded by kind at 0.38
alpha. Print bed mode uses a shared shelf packer, which is ALSO the 3MF build
placement, with an explode slider and a plate that goes glassy when the camera
dips below.

## SLATE

The hinge went through six designs, each rejected for a real reason: rear
hinge blocked a slot, outside hinge was over-engineered, C-socket ears were
janky, 3 mm lug discs were garbage with many weak points, 7 mm cheek discs
were too big.

FINAL (r5): plain three-knuckle barrel on the top hinge-end corner, axis on
the outer face of the end wall 3 mm above the rim, 8 mm body knuckle in each
show wall, one 38 mm knuckle on the stick, all rounds r5.5 with 45 degree
flats wherever they would overhang, separate 6 mm D pin printed LYING ON ITS
FLAT, slit and barbed at both ends. Three printed parts, no hardware.

The rule that came out of it: EVERY HINGE AND LATCH PART LOADED ALONG ITS
LAYERS, NEVER ACROSS THEM.

The print audit found a full-width 15.4 x 109 mm slot across the back wall
left over from a removed feature, a comb rail bridging 17 mm, a latch window
bridging 18 mm, and thumb ribs starting as ledges in air. After fixes the
longest unsupported bridge anywhere is 8.8 mm.

113.2 x 82.7 x 54.65 mm case, about 124 g PETG.

## KNURL

The detent is a SEPARATE FLAT STRIP (30 x 3.6 x 1.6, bump on one edge)
dropping into a slot in a block on the tray floor, 20 mm free length, about
0.97 N click at 0.63 percent strain, printed standing so the click tunes by
strip thickness. The earlier integral beam was fused to the floor along its
length and would have been about TEN TIMES too stiff. A tapered flag shape
cannot get enough free length support-free.

First print feedback and fixes: the star could not move (body interfered with
the count wheel), the Geneva pin was a tight fit and SNAPPED, and he wanted a
top hole for alignment. Fixed with sliding fits 0.15 to 0.3, bore fits 0.2,
star-to-wheel gap 0.5, wheel-to-lid 0.4, star on a 6 mm hub in a cup, lid
keeper rib moved to an arc over the star's far half, pin 2.6 mm with a
one-layer flared root. No top peg is possible because the wheel rim passes
over the star axis. Sampled minimum gaps over the cycle: star/wheel 0.27,
star/lid 0.40.

Art research went to Islamic geometry with Pakistan influence: ajrak (Sindhi
block print in the round, now the default), wazir (ten-fold rosette after
Wazir Khan mosque kashi kari), chaukhandi (Sindh tombs sunflower medallion),
jali hexafoil. Plus a keffiyeh preset and a Hirbawi-faithful preset with the
band order from the fringe inward.

## CASK

Round LCD case with a Raspberry Pi inside; the cap seats on the body with a
BAYONET and prints face down. Two variants that share the CASKGEOM library
verbatim between marker comments and differ only in defaults: cask.scad and
cask_bench.html for the 5in Waveshare HDMI round (150 mm drum), cask4.scad
and cask4_bench.html for the 4in Waveshare DSI round (126 OD, 75x75 VESA,
DSI chin at 270, four corner bosses). Do not assume which variant an
uploaded cap belongs to; check the OD. The cask4 header label still reads
5in from the fork; the footer is right.

5in cap params: display_od 150, wall 3, inner_depth 40, cap_face_t 3.0,
skirt_t 2.4, skirt_len 12, lug_angles [30, 120, 225], lug_w 7, lug_h 3.2,
bay_clr 0.35, rim_land 1.8. Yields 150.0 dia, 15.0 tall, skirt_od 143.30,
lug_z0 5.15. Cap vents sit at r30 to 34 and r44 to 48 on BOTH variants, so
the clear centre disc is r under 30 either way and a centred logo comes out
the same size on both faces.

The cap ships as a 3MF with the mark and wordmark inlaid centre-face. This
is the project that found the p:path empty-plate bug (in
`kernels/3mf-dialect.md`).

A cap can be rebuilt without its bench: extract the CASKGEOM lib, install
three 0.160, three-bvh-csg 0.0.16, three-mesh-bvh 0.7.8 and manifold-3d
2.5.1, and call buildCap in node. That is a FOURTH mesh route (CSG via
three-bvh-csg) used exactly once; the plan's rule is do not invent a fourth
kernel, so treat it as a legacy path. STLExporter returns a DataView, so
write Buffer.from(data.buffer, data.byteOffset, data.byteLength) or the file
lands at zero bytes.

## LOCKET

Eleven revisions, A through K. The two that matter most:

REV F, the hinge print question. The audit found a real flaw: pin stubs were
CANTILEVERED into the bores, so seed layers in midair would sag onto the keels
and weld. Fixed by parity swap (lid owns both end knuckles) plus ONE
CONTINUOUS ROD anchored in all four lid knuckles, so every bore crossing is a
both-ends-anchored bridge. A dense two-way surface-gap audit measures min
half-to-half gap per layer band: 0.60 mm, 2.5 layers, everywhere in the hinge
zone.

REV I, the collar faceplate. 1.2 mm wall wrapping the screen PCB with 0.35
give, ten flexible fingers with snap wedges hooking under the PCB, audited at
3.42 mm3 of spring grip at the PCB bottom edges only, glass clear, about 1.1
percent snap strain.

Rev J made it parametric across screen and keyboard libraries with editable
colours and art, driven by a config JSON. Rev K added a live configurator in
the sim with precomputed geometry variants.

QA that caught real bugs and should be reused: fold sweep at 5 degree steps
(boolean intersect lid vs base), single-shell connectivity, keeled pins bind
mid fold (keel on the bore only, pins round), `rbox` arg order is
(x0,y0,z0,x1,y1,z1) and passing the wrong order creates invalid manifolds that
SILENTLY POISON every later union to empty, and CW input polygons also poison
unions so winding must be normalised.

## SCABBARD

The parametric complaint and its fix: the r1 silhouette was locked to the plug
width and the logo aspect, so most sliders only moved hidden internals.
`sweep.js` perturbs every parameter and asserts the triangle set changes.

Scale rule that made it fully parametric: pocket = drive length minus plug
sticking out; silhouette height = pocket + top wall + size boost; everything
else follows the mark's 120:146 aspect.

The back window is a NOTCH through the bottom edge, not a hole: it kills every
bridge in the print, shows the board, and lets you thumb it out.

Defaults 34.0 drive length and 13.0 plug out are ASSUMED, not measured.
