BOSS: stud and socket electronics you print
============================================

A LEGO style modular electronics system in four filaments, plus BOSS.bench, the single file
browser tool that generates every part, checks it, simulates a circuit you snap together in 3D,
and exports print files with the filaments already assigned.

Materials (slots, in this order in every 3MF)
  1  PETG                 cream    structure
  2  conductive PLA       black    studs, posts, flanges, buried traces (Protopasta class, 30 ohm cm in plane)
  3  TPU 95A              pink     wire sheaths, button cones, lid hooks and pressers, FORCE membrane
  4  conductive TPU       grey     socket rings, wire cores, button caps, slider track, membrane disc (Eel class, 1500 ohm cm)

The standard (BOSS.STD)
  8 mm pitch, 4.8 x 1.8 studs, 3.2 plate, 9.6 brick, LEGO compatible.
  Every conductive position is one column: a conductive TPU socket ring underneath (4.6 mm bore,
  0.2 mm interference on a stud), a conductive PLA flange as the contact face and mechanical
  lock, a conductive PLA post up through the body, and a conductive PLA stud on top. So the stud
  on top and the socket underneath are the same net, and columns stack.
  Two buried conductive PLA trace layers (1.0 wide, 0.72 tall, 0.48 PETG between) route pins to
  columns. Plain positions get a void ring and a PETG stud.

Parts
  SEAT      board carrier. PRESS: header pins go 6 mm into 0.9 bores whose tips are conductive
            PLA cups. SNAP: the bare board rests on 0.48 mm proud contact bumps under every
            castellation or pad, held by locating rails, a lid frame with a window and USB notch,
            TPU pressers over the pad rows, two TPU barbed hooks into undercut pockets, and a
            filament pin hinge (two 8 mm bits of 1.75 filament pushed in from the gap) or four
            hooks. Boards: ESP32-C3 SuperMini, Raspberry Pi Pico, Teensy 4.0, custom. Pin set is
            editable; the brick autosizes from board, pin count and trace lane budget.
  PLATE     base plate with studs; paint studs into nets and traces are routed inside the plate.
  WIRE      TPU sheath with a conductive core (conductive TPU or conductive PLA), straight, arc,
            spiral, zigzag or S, with stud caps (socket under, stud on top) or bare ends.
  JUMPER    1xN pass through, optional bus bar.
  TOUCH     2x2 flush conductive PLA pad.
  FORCE     2x2 interdigitated comb plus a separate flipped TPU membrane with a conductive disc.
  BUTTON    2x2 in place TPU cone (40 degrees, 0.6 wall, 3 layer conductive TPU cap) bridging two
            conductive PLA half columns.
  SLIDER    2x4 finger pot: conductive TPU track beside a conductive PLA bus, your finger is the wiper.
  LAMP      1x3 holder for a 5 or 3 mm LED, legs into conductive PLA cups, the printed path is the series resistor.
  RESISTOR  1x2 flush meander with cuttable trim bridges.

The number that matters
  Printed conductors are kilohm class. Pin to stud paths in a seat come out 5 to 50 kohm, a
  conductive TPU wire core is about 1 Mohm per 80 mm, conductive PLA core about 20 kohm. That is
  fine for GPIO reads through the ADC, touch, dividers, and faint LEDs. It is not fine for
  motors, LED strips, or an internal 45 kohm pullup (the simulator will show you the pin sitting
  in the undefined band and tell you to read it with ADC or add a stiffer pullup). Every readout
  and the simulator use the resistivity you type into step 2.

Files
  boss.html                       the bench, one file, runs from file://, no server, fonts and
                                  libraries inlined (three r128, jszip, earcut, polygon-clipping,
                                  print-forge orca3mf.js verbatim)
  boss-src.zip                    source: src/*.js, shell, build.py, node harnesses, Playwright
                                  smoke and browser sweep
  examples/*.3mf                  one project 3MF per part with the four filaments declared
  examples/*-stl.zip              per colour STLs plus print-card.txt and design.json (fallback if
                                  the filament list imports as one entry: open all STLs at once,
                                  load as one object with parts, assign filaments)
  examples/*-print-card.txt       what is in the package, readouts, hookup, BOM
  examples/boss-example-scene.3mf the worked example scene laid out on one plate
  screens/                        screenshots from the headless harness

What was validated here
  Every generator at defaults and across a parameter sweep, in node and in headless Chromium:
  manifold audit after vertex merge (two faces per undirected edge), cross slot overlap check,
  union find net check (every pin joined to its stud and socket, no shorts), fit checks.
  Every shipped 3MF and every export made through the bench hook passed
  print-forge/scripts/validate_3mf.py --overlap: package entries, Bambu application tag,
  per mesh degenerate, edge, winding, volume and vertex fan checks, lib3mf manifold read,
  model_settings and project_settings shape, build items, and zero overlap between parts.
  Bench: no console errors, all four steps render, no horizontal scroll at 390, 768 and 1280.

What only your Flash Studio round trip can check
  That the filament list imports as four entries with the colours (the dialect is the same one
  COLLAR, COAMING, SLATE, SPRUE and FEELER shipped, but the writer has not been opened in this
  session's Flash Studio). That your conductive TPU actually stretches 0.2 mm over a stud and
  stays in contact after a few cycles. Real pin to stud resistance on your spools: measure a
  printed bar and type the ohm cm into step 2. Whether the 0.48 mm proud bumps make contact on a
  Teensy (not castellated, they land on the underside annular rings).

Print
  Creator 5 Pro, 0.4 nozzle, 0.24 layers, no supports, everything lays flat. Prime tower on.
  Purge at least 70 mm3 into conductive TPU, it contaminates the cream. The snap seat lid prints
  flat beside the body (inner face up); the FORCE membrane prints face down beside its brick.
