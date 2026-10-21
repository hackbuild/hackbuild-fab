# TOGGLE

TOGGLE, the printed tilt stick (`knowledge/designs/toggle.md`), as a chase:
a TPU stick on a flex neck in a PETG body, a conductive TPU collar that
lands on a direction pad and the common ring when tilted, routed leads to
header pins. The harvested original stays in `legacy/` (D-142). Every
number below is computed from the build and the profile rows unless it
says otherwise. Nothing here has been printed.

| file | holds |
|---|---|
| `chase.ts` | params from the original's blankState and PANES rows, presets solo4, solo8, blocks8, four slots, the pull up hookup |
| `build.ts` | host body, terminals, routed leads and vias around the tilt-stick archetype; the drive pad `contact` |
| `queries.json`, `expected/` | parity goldens at SOURCE_DATE_EPOCH 315532800 for the chase defaults (solo4) |
| `test/build.test.ts`, `test/golden/` | build.ts in process: the plan view against the original's at four presets, the route against copper's default, leads and cups, the contact function against the solver, the readouts against the original's record, every metric against `solo4-metrics.json` (rewritten only with HBF_ACCEPT_METRICS=1) |

## How it builds

The order is the original's T.build (`originals/toggle/files/src/src/part2d.js`
lines 417 to 453):

1. `toggleHost` (packages/archetypes `src/toggle/host.ts`, the port of
   layoutXY lines 60 to 114): terminal row, round tab or BLOCKS grid, the
   plan view the router reads. Its plan equals the one the original
   computes at solo4, solo8, blocks4 and blocks8 (the copper fixtures
   written from the original).
2. `routeSearch` (packages/copper): layer count, COM gap, net to terminal
   map. A build module imports only `@hackbuild/kernel/author` and
   `@hackbuild/spec` (D-178), so that entry now re-exports both functions.
3. The tilt-stick archetype at the route's layer count, COM gap and lead
   angles: stick, collar, pads, ring, COM column, well, roof, gate and the
   lathe keep-outs. tilt-stick is a candidate (its statusReason: an owner
   question on the slicer's bridge over the stem); Author.arch builds it
   and `arch.apply` still refuses it.
4. This build: the host body, the pin cups, the leads (the original's
   traceRects joined into one ring per run) and vias.

A pin cup is a conductive PLA disc from the bed to the cup top with the
pin bore open at the bottom. A conductor region is one ring with no hole,
so the cup is a body with its bore cut out, and a host pocket clears the
PETG under the cup's footprint. A lead into a bored cup stops 0.05 mm
short of the bore inside the cup, where the original paints the bore over
the lead end.

## solo4 at the chase defaults

`hbf part.build designs/toggle --preset solo4`: 44 pass, 2 warn, 0 fail, 58
skip (computed).

- Waived warn, CHK-PRT-04: the PETG wall between two pin cups is 0.64 mm
  (2.54 mm header pitch less two 0.95 mm cups) and the wall from a cup to
  the body edge 0.8 mm, neither a multiple of the 0.42 mm line width. Both
  are the original's dimensions (part2d.js lines 62 to 87): the original
  prints them. `chase.waive` accepts them with D-615 as its reason (D-629),
  so the row keeps its measurement and stops blocking the export gate.
  Widening the cups so the walls land on the line grid is an owner
  question; the chase keeps the original. Drop the waiver to see the fail.
- Warn, CHK-PRT-05: 17 faces sit between layer tops, the solved stick and
  cap heights.
- Build warnings: the dots texture is not built (the cap prints smooth),
  the stem stress at a 20 N side push is 54.8 MPa against PIP's 15 MPa
  limit (the original has no such check), the cPLA on PETG bleed is 0 mm
  inferred.

Route: one trace layer, first try, COM column at 225 deg, pins P1 to P5
carry W, COM, S, E, N, equal to the copper default route of solo4.

Per-slot volumes against the owner's solo4 save
(`originals/toggle/files/owner-saves/toggle-solo4.orca232-owner-save.3mf`,
the same meshes as `examples/toggle-solo4.3mf`), mm3, both computed:

| slot | owner save | this build | difference |
|---|---|---|---|
| 1 PETG body | 2612.386 | 2609.994 | -2.392 |
| 2 conductive PLA | 182.201 | 182.191 | -0.010 |
| 3 TPU stick | 781.974 | 778.419 | -3.555 |
| 4 conductive TPU collar | 192.835 | 192.595 | -0.240 |

The owner save carries the dots texture; the smooth cap the original
builds at texture none is 779.051 mm3, 0.632 over this build. The rest
is the stage 6 coincidence inset (0.001 mm, inferred) and the original's
0.1 mm raster against exact sectors here (toggle.md 5.12). A recorded
number, not a gate.

## Other presets

- solo8: builds; the same waived CHK-PRT-04 row over nine cups, and
  CHK-NET-02 fails two net pairs (E to SE, N to NE) at 0.50 mm plan gap against the
  0.6 mm floor: a routed lead passes the next 8 way lead sector at the
  router's own clearance (leadR 0.65 plus clr 0.6 plus half a trace from
  the foot centre), the original's spacing.
- blocks8: builds on two trace layers; CHK-PRT-04 reads the socket to
  footprint edge wall (1.60 mm), waived as above, and CHK-NET-02 fails
  seven net pairs at 0.48 to 0.50 mm against the buried stack's 0.6 mm floor (D-085): the
  original's 0.48 mm separation layer between its trace layers, and its
  8 way lead sectors beside the routed leads. The original's numbers, not
  changed here.

## Hookup

Each direction pad reads LOW on a plain input with an external pull up,
the next E12 value at or above ten times the switch path (toggle.md 5.7,
470 kohm at solo4 over Protopasta 30 ohm cm, computed, tier inferred). GP2
upward in sector order from east is a choice. circuit.solve does not solve
the reads yet: the collar closes a direction to COM only when tilted, and
the build declares no contact feature for it; the ports carry no tap.

## Not done here

The bench, the drive pad page and the side by side grade (R1-designs-reach-12),
the cap texture heightfield, a contact feature per direction for
circuit.solve, and a person's look at the 3D build (D-154).
