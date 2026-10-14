# Lineage: the tools this skill distils

Read this to know what already exists before proposing a new bench, and which prior
tool to model a request on. All are single file hack.build benches unless noted; all
export the Orca dialect 3MF plus STLs.

| Tool | What it is | What it taught |
|---|---|---|
| hackbuild challenge coin (python, Aug 2026) | 44 mm three colour flush inlay coin with NFC variant; shapely + trimesh/manifold generator | Application tag trick; per-filament vector lengths; mirror the bed face; period kerning; inlay depth 1.2 mm for pink; knurl depth; pause layer maths |
| COLLAR | the coin bench: edge presets, drag in art, blank shapes, casino edge, cutouts, NFC pocket, multi material 3MF | raster in XY exact in Z; conformQuads for manifoldness; touch/commit; art before colour; slots not colours; 127 key filament template; printer name keys; text focus bug; despeckle 0.35 factor; challenge coin market research (cutouts, shapes, edges, 1.75 in and 2 in) |
| COAMING | cyberdeck case maker, seven archetypes, assembled and print bed views, stage face editor, COLLAR art zones on rectangular faces | constructive prisms, no CSG; earcut pitfalls; z overlap 0.02; raster boxes with 0.012 overlap; embedded fonts and boot awaiting them; assembled view with hinge open angle; shelf packer plate layout; undo/redo; welcome grid |
| SLATE | clapperboard case for the Casting Call deck, black and white PETG | hinges loaded along layers; barrel knuckle with 45 degree flats; gooseneck latch; print audit for bridges and ledges; deck slots at thickness + 1 mm; the user will reject a hinge that is over engineered or that roofs a slot |
| SPRUE | batch plate generator (python) and bench for two colour coins and 351 picks, fan giveaways | white body black inlay for two colour speed; Otsu threshold with polarity flip; per layer too thin / losing detail flags; pin a design for mixed plates; fill the bed; declined third party logos, original motifs plus a drop in slot |
| FEELER | multimaterial printed sensor bench, 20 archetypes, drive sim, net checker | exact prism/apex/revolve meshing; full earcut port; two faces per undirected edge; makesContact is only a claim, fit() needs numbers; materials panel as the colour key; stimulus sliders live, geometry sliders on release |
| SCABBARD | one piece USB drive shell shaped like the SATCHEL mark, four colours | sweep test for dead parametrics; ExtrudeGeometry hole slivers; a lid means a cap for the plug; scale rule from the drive dims |
| PLINTH / CRESSET | retro console cases for a friend's Pico console | working / idle / export grids; two topology passes for corner pinches; verify.py audit list (the ancestor of validate_3mf.py); p:path only with separate model files |
| LOCKET | folding Pi cyberdeck, PIP hinge | hinge topology ported into COAMING's fold archetype; latch that SLATE was asked to copy |
| TACK, SHIM, SHUNT | PCBs and copper circuits with the mark as art | not print benches; board-forge covers them, but the mark handling (calibrated viewBox, verbatim paths) is shared |

## Naming

Workshop and fastener words, one word, uppercase in UI: COLLAR (the die that forms a
coin's edge), COAMING (the frame round a hatch), SLATE (a clapperboard), SPRUE (the
runner on a casting), FEELER, SCABBARD, PLINTH, LOCKET, MANDREL. Never suggest ANVIL,
JOIST, PRONG, RIVET, LATHE, STUD, PLINTH, DOWEL, CLEAT, BRACE again; generate fresh
options every time and check `design-and-naming` before proposing.

## Endgame

MANDREL (areas/parts-platform): the Vue app plus MCP endpoint that consolidates all of
these into one evidence first build system with registries for ops, checks, exporters,
sims, and machine profile gated exports. When a request looks like "make all my benches
one thing", that spec is the starting point; this skill is the per bench craft it would
absorb.
