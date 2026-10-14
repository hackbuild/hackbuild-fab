# Diagnostics

Symptom to cause. Where the symptom is observable in software it becomes a
check; where it needs the rig it stays an index the model queries. This is
where retrieval earns its keep.

## Printing

| symptom | cause | fix |
|---|---|---|
| Flash Studio reports empty layers between two heights | a cone's inner wall not parallel to its outer, leaving a sub-line-width wall above the skirt | true parallel offset, horizontal wall = wallT / sin(theta) |
| Flash Studio opens an app-written 3MF on the cold plate instead of textured PEI | project_settings.config has no curr_bed_type (the seed writers never wrote it; owner report 2026-10-05) | write curr_bed_type from the machine preset `slicer.bedType` (ffc5p: Textured PEI Plate); validate_3mf.py notes a missing key |
| the slice prints PETG (slot 1, role Internal Bridge) across the interior of each TPU key top, directly on the cTPU cap, though the 3MF passes `validate_3mf.py --overlap` and the checks (keys flex-pair, layer 30, z 7.21 to 7.45, 8.653 and 8.635 mm2, computed from the G-code of the virtual print, 2026-10-07) | the key's solid layers lay below the pad top, inside the pad's top shells: the pad top came from the flex need without PIP's bezel term, so Flash Studio (Orca-Flashforge 2.3.2) printed the pad's first top shell layer over its sparse infill as an internal bridge in the pad's filament across the key. Part order, one part per slot, a 100 percent infill modifier around each key, internal_bridge_support_thickness 0, the extra bridge layer off and minimum_sparse_infill_area 0 did not move it; pad sparse infill 100 percent removed it and swapping the pad and key extruders moved it to the pad's tool (all computed, D-236) | keep PIP's bezel term, as pip-controller `src/layout.js` lines 27, 219, 223, 227 and 231 write it: the pad top is `z0 + keyHOf(cone, d) - protrude - bezel` snapped up to a layer top (`reference/keys/flex-pair/build.ts:155`) and the key floor `snapNear(max(z0, T + bezel + protrude - keyHOf))` (`reference/keys/flex-pair/build.ts:198`), so no key body lies in the pad's top shells; `reference/keys/flex-pair/test/reference.test.ts:105` holds each `capUnderside` at or above `padTop`. Only a slice shows this fault: run the virtual print (`tools/slice/slice.mjs`, then `tools/py/gcode/analyze.py`), which reports 0 regions of a body printed by another tool after the fix |
| floating regions reported by the slicer | a slab starting in mid air with nothing under it | run `islands.py` on the exported 3MF at the real layer height |
| part comes off the bed in six pieces | a skeletonisation weld met its neighbour at a tangency, and the print shrink pulled it apart | buffer(+0.35).buffer(-0.35) before the shrink |
| colours do not load in Flash Studio | Application metadata tag not starting with "BambuStudio-" or "OrcaSlicer-", so only geometry imports | write Application=BambuStudio-01.10.01.50 plus the p:UUIDs |
| parts import on the right extruders but the filament list stays at one | per-filament vectors not all length N; num_filaments comes from len(filament_colour) | write every per-filament key N times |
| printer dropdown lists the file name instead of a machine | no printer_settings_id / print_settings_id, so the slicer invents an external preset | write the preset NAMES only, never the settings behind them |
| slicer crashes on the filament configuration | process-scoped keys, excluded keys, Bambu-2.x-only keys, wrong tray ids, or paint_color on triangles in project_settings | port the known-good writer verbatim |
| back-face art prints backwards | it sits on the bed-facing face and is read from the other side once flipped | mirror the back-face art in X at extrude time; expect it to look backwards in the slicer's bottom view |
| a knurl or reed prints practically round | too shallow and too narrow for the nozzle | 64 reeds / 0.5 deep / 1.4 mouth became 40 / 1.0 / 2.8 on a 3.45 pitch |
| pink reads dark over a black core | inlay too thin at top and bottom | raise inlay 0.8 to 1.2 (6 layers) and thicken the coin |
| the period in a wordmark disappears | despeckle threshold was the area of a disc of exactly min feature | use 0.35x that area |
| a print-in-place hinge fuses | pin stubs cantilevered into the bores, so seed layers sag onto the keels and weld | parity swap so one half owns both end knuckles, plus one continuous rod anchored at both ends of every bore crossing |
| a keel binds mid fold | keel on the pin instead of the bore | keel on the bore only, pins round |
| socket mouths weld shut | brim on the body | no brim |
| blobs in the hinge gaps | seam position rear | seam front or nearest |

## Mechanism

| symptom | cause | fix |
|---|---|---|
| a linkage is jammed and cannot average | a rigid two-pin link between two vertical sliders forces L^2 = S^2 + dz^2, so dz is FIXED by L | only a link HORIZONTAL at rest has a second-order length change; make both pivots the same height |
| a rotating plate-to-plate joint wanders | a square lasercut peg in a round bore has a contact radius swinging from 1.500 to 2.121 as it turns; it is a cam, not a bearing | bought round stock, 3 mm rod or M3 |
| a pin never engages its yoke | crank_body puts the arm and its pin bore at profile (r, 0), not (0, r) | check the 90; and a clash audit cannot see this, since a pin in a slot is SUPPOSED to touch |
| a pixel refuses to set | LUG_RAMP / LUG_P must EXCEED tan(RAMP_A), or the crown over-drives into a rod that cannot get out of the way | raise LUG_RAMP |
| a bar sags more than the half-select margin | a flat laminated bar at scale | the bar has to get DEEP, not thicker. an on-edge comb spine 1.5 x 14 beats 6 laminations of 6 x 6 for the same mass |
| a part cannot sit flat in ANY of 24 poses | the PART is wrong, not the pose | the column bar's lugs ran to the floor because that is what the cut version lands on; cut the feet, move the stops onto the base |
| a pin head sweeps into its own servo | the head sits on the crank's far face and sweeps a ring no endpoint test visits | recess the head into a counterbore, flush with the face |
| a printed pot reads full scale error unloaded | wiper contact resistance modelled in the divider leg instead of between the tap and the load | put it between tap and load; a high-impedance input never sees it |
| a printed pot's wiper touches nothing | the arms were built BESIDE the tracks, so the shoes landed at radius rr*1.41 | one radial finger from the hub out across the collector ring and on to the resistive arc, with fit() assertions on the shoe |
| a shaft orbits its own board instead of spinning | deform rotated about (0,0) but upload recentres every vertex on the model bbox | rotate about the true axis, world origin by default or an explicit pivot |
| a cone button has essentially no press | contacts one contact gap below the cap | hold the in-place contact gap between 35 and 50 percent of the cavity and never under 1.2 mm |
| a dome has no shoulder to flex | the conductive plug is most of the dome wide | cap plug radius at 0.4 rimR, hold 0.4 to 1.0 thick |
| a walking-skeleton key is thrown away and rebuilt before its first print (M-S to M00) | the skeleton approximated a proven mechanism (the PIP flex cone as stair-stepped cTPU stack bands) instead of porting it, so its cone, wall, slots and travel interval were not the proven ones | port the mechanism from the original file and lines its MECHANISMS.md row names (D-222); the flex-pair key was rebuilt from pip-controller layout.js lines 149 to 160 and model.js lines 61 to 88 (D-223) |

## Firmware and rigs

| symptom | cause | fix |
|---|---|---|
| a honed setup breaks on every reload | connect PUSHED app defaults over the board | connect PULLS a config dump and adopts it, with explicit SEND / ADOPT / PERSIST |
| drift at direction reversals | no ramp reset at reversal, lash take-up at the fast travel rate, and re-energising released coils steps from an unknown detent | per-axis direction tracking that resets the ramp on flip, slow-rate take-up, 30 ms settle dwell |
| plotted text comes out almost flat | content laid out in a square field while the real captured quad is wide and short | quad-aspect readout, FIT FIELD TO QUAD, and a loud CLIPPING banner |
| the beam behaves unpredictably | firmware silent when idle, so a lost BLE notify wedges host flow control mid plot | idle heartbeat, host poke after 1 s stall, 5 s dead-man that kills the beam, app keepalive while held on |
| an 8-coefficient command silently truncates | parseArgs capped at 6 args | raise the cap and assert arg count |
| one dead axis on a 28BYJ-48 | GPIO 8 and 9 sit between 7 and 10 on the SuperMini header, so an off-by-one on IN4 is the classic cause | PIN WALK test sketch driving all eight phase pins one at a time, naming each GPIO and wire colour |
| the laser flashes at every reset | U0TXD (GPIO21) strobes the ROM boot log | move the laser to GPIO20 (U0RXD), never driven at boot; and a gate pulldown so it cannot fire while the pin floats |
| torque collapses with step rate | winding L/R time constant at 5 V minus the ULN2003 Darlington drop (about 1 V) | TBD62003 DMOS drop-in reclaims the volt; 9 V intermittent; 12 V plus series resistor; zener between COM and V+ for faster decay. The largest gain is the bipolar mod plus TMC2209 at 12 V with StallGuard |
| the ESP32 SuperMini dies when the motor rail is raised | its LDO maxes about 6 V | never touch the board's 5V pin when raising the motor rail |
| a board blocks boot in bright light | an LDR pulling a strapping pin low at reset | LDR UP to 3V3 with 10k down to GND, keeping the node above VIH with real swing |

## Sim and viewer

| symptom | cause | fix |
|---|---|---|
| a part is invisible with no console error | three.js builds a mesh with undefined geometry and renders NOTHING, silently | derive the needed-mesh list by regex from the template and raise if any referenced mesh was never rendered |
| a part vanishes after a rename | three swallows NaN transforms without error | grep the template after any param rename |
| a whole part sits at the origin | a registry snapshotted position but the code assigned `o.position` afterwards | write to the registry's own lx/ly/lz. And never exclude a part class from a checker to make it pass |
| the board renders as a mirror image | board y mapped to world +Z; the XZ plane seen from above is left-handed | board y maps to world MINUS Z |
| back-face text reads backwards in the sim | position mirroring and glyph mirroring are INDEPENDENT, and mirroring both cancels for glyphs while mirroring positions | positions in board coords on both faces, per-string mirror only on text-shaped things |
| tabs are visible but unclickable | the canvas is appended after them, position absolute inset 0, and with alpha true you still SEE through it | give overlay UI an explicit z-index whenever a canvas shares its container |
| z-fighting on orbit | face planes microns off the mask with near/far 0.5/3000 | 20 micron gap, polygonOffset, near/far 4/1400 |
| inlaid text looks striped | EdgesGeometry on raster zone prisms | tag raster prisms and skip edge lines |
| nothing ever latches under headless | latching decided by whichever frames happened to render; swiftshader fired two frames in a 700 ms sweep | commit the outcome SYNCHRONOUSLY at command time and treat the sweep as picture only |
| every later click is silently dropped | a "refuse a new command while animating" guard, plus a starved rAF leaving the animation unfinished | remove the guard |
| picking returns zero hits in jsdom | clientWidth is 0, so aspect goes NaN, the projection matrix goes NaN, and every raycast misses | define a real test viewport and guard resize with Math.max(1, ...) |
| the linkage solves against last frame | localToWorld reads matrixWorld, which three only refreshes during render | call root.updateMatrixWorld(true) at the top of the solver |
| the model sits off frame and the UI feels dead | the home camera was hardcoded for an older size | compute framing from the model dims |
| a distance query says parts overlap when they do not | bounding boxes; a bar assembly's bbox includes its lugs | trimesh.proximity.closest_point. And report CLOSEST APPROACH, flagging under 3 mm, because 2.40 mm reads as contact in a render |
| the sim renders fine but the object looks wrong | no one has ever LOOKED at it | render to PNG with a small z-buffer rasterizer that replicates the viewer's exact placement math, and look. Every numeric checker can pass while the model is visibly broken |

## Printed circuit floors and folding decks

| symptom | cause | fix |
|---|---|---|
| lid window, collar and bosses drift apart across variants | lid geometry built in two frames | one frame, hinge at y = 0; hinge parts stay at the axis, never shifted with the lid |
| the A* router skips valid nodes and leaves nets unrouted | the g array is Float32 and rounding defeats the stale-entry check | Float64 |
| a header row will not fan out to a key grid | one buried layer cannot cross itself | two buried layers with printed vias |
| repeat builds take 3.5 s when nothing on the floor changed | routing recomputed every build | cache routing by a floor-layout signature; 1.6 s |
| non-manifold edges at coarse grid settings | the pinch healer oscillates a cell forever | freeze a cell after three flips, cap at 200 passes (TOGGLE part2e; the seed rastermesh.js predates this fix) |
| zero-area triangles where two bodies share an exact face | exact coincidence before subtraction; not the collinear slivers of a union of disjoint raster slots, which share no face (see Mesh kernel, M00-T06 fault A) | overlap slightly before the boolean; simplify(1e-4) after |
| traces come out lumpy | union of capsules | one outline offset, simplified before extrusion |
| the view never refreshes after a rebuild | VIEW and UI not reachable from the other scripts | expose them on globalThis with the hook |
| every export takes 2 s, even JSON | in the headless SOFTWARE renderer a no-op call takes 0.6 s; it is the test renderer, not a rebuild | measure against a no-op before chasing it |
| a shell exports broken on one example only | a vertex sits exactly on a cavity face | inset kink points into the well |
| parallel traces to 2.54 mm pads read as conflicts | the router added margin beyond the real gap check | remove the margin; keep the measured gap check |
| wire-cup traces cross | cups not in the board's pad order | cups follow pad order, 5.2 mm apart so a trace fits between |
| type chips all show selected | a generic pink button style overrides the chip state | chip state class must win; test it in smoke |
| the manifold heap grows every build | the cleanup does not reach most manifold objects | walk every Manifold and CrossSection; liveCount() in the sweep |

## Mesh kernel

Faults met while building packages/mesh and packages/geom (M-S, M00). An
OPEN row names a defect still in the code: the symptom, what is known, and
the replay. These are kernel defects, not design checks, so they carry no
CheckOrigin (CHECKS.md section 8); a row gets one only if a check is later
derived from it.

| symptom | cause | fix |
|---|---|---|
| M00-T06 fault A: a stage 8 union of disjoint raster slots refuses with zero-area triangles whose three vertices lie on one line (x -7.96875, z 2, y 4.0625 to 4.53125 on the evidence coin) | Manifold.union writes float32 output over coplanar raster faces; the slots share no face, so overlapping before the boolean does not apply | when the batch fails only on zero-area triangles, simplify it and take it when it verifies (`packages/mesh/src/union.ts:169`, via "simplified"; volume 651.5006 mm3, computed). Replay: `FC_SEED=20261004 FC_PATH=13:0:0:0:0:1:2:7:7:7:7:7:7:8 FC_FAMILY=collar npm run sweep -w packages/mesh` |
| M00-T06 fault B, OPEN: the pinch healer stops with 1 ill-formed 2x2x2 window on one hex COLLAR coin, with the freeze after three flips and the 200-pass cap in place | not diagnosed. The freeze and cap (Printed circuit floors row) stop the oscillation; they do not make the healer converge. M-1 fixture C also ends converged false with 2 ill-formed windows | OPEN. In sweep mode the raster route throws E_KERNEL, in build mode it warns HEAL_NOT_CONVERGED (`packages/mesh/src/routes/raster.ts:449`). Replay: the hex draw among the 40 COLLAR draws of `fc.sample(coinArb, {seed: 7})` in `packages/mesh/test/sweep.property.ts`; the drawn parameters were not kept in the repo, so record them when the fault is taken up |
| M00-T06 fault C, OPEN: a raw ManifoldError "Not manifold" escapes a build instead of E_KERNEL | toManifold (`packages/mesh/src/stages.ts:366`) reads status() only after `new wasm.Manifold(mesh)` returns, and that constructor throws on a mesh that is not manifold | OPEN. Wrap the constructor in try/catch and map the error to E_KERNEL with the shape path; then widen the prism and stack hole bounds in `packages/mesh/test/sweep.property.ts` back past the inradius. Repro: a triangle of circumradius 3 with a 16-gon hole of radius 1.5, touching the inradius |
| 304 zero-area triangles on 1 of the 448 TENON revolve calls (call 276, case 38) after the D-054 snap (M00-T05) | two feature-edge columns of thetaList sit closer than half a grid step on a small radius and snap onto one grid point | snapWeld welds shared grid points and drops collapsed triangles (`packages/mesh/src/hash.ts:27`), run on every revolve (`packages/mesh/src/routes/revolve.ts:495`) |
| a union refuses with only degenerate triangles, and simplify at 1e-6 to 5e-4 mm leaves them | two kernel vertices under half a grid step apart (0.0003 mm, computed, flex-pair preset two) snap onto one D-054 grid point | audit the snapped and welded mesh (snapWeld); packages/mesh union takes the candidate when that audit is clean, as via "welded" |
| 6 zero-area triangles after the trace-to-bus booleans of the flex-pair (M-S-T08) | boolean output vertices under half a grid step apart collapse when the D-054 snap runs | weld after meshOf. M-S added a weld in core; the stage runner now welds every boolean output with snapWeld at stage 7 (`packages/mesh/src/stages.ts:558`) |
| earcut leaves zero-area cap triangles on a row of holes with identical Y even after the 0.1 micron jitter (18 on a 12-hole row, attempt 0, M00-T03) | three vertices from different rings on one line give a triangle with its middle vertex on the long edge | an edge-flip pass with no new vertices (flipDegenerate, `packages/geom/src/earcut.ts:593`, run at :572); the row then gives 0 |

## Toolchain

| symptom | cause | fix |
|---|---|---|
| an edit silently does nothing | OpenSCAD renders an unknown module as NOTHING and exits 0 | fail the part if openscad reports ignoring anything |
| a constant silently reverts | OpenSCAD takes the LAST file-scope assignment, so a stray name in the model file overrides params | sweep the model for any name that also exists in params after every params edit |
| a derived param is undef | file-scope assignments evaluate in order | keep params in dependency order, and assert a list of required constants are defined after stripping comments |
| a patch appears to run but applies twice | a python heredoc followed by a bad trailing shell line errors AFTER the python already ran | check for the success print, not the absence of error |
| a string replace no-ops | the anchor text has drifted | assert anchors |
| a minimal part rebuilds empty | the source zip does not carry the generated intermediates | run the generator chain in order; the tell is both walls reporting the same wrong volume |
| a measured feature misses the params by 0.02 | default OpenSCAD tessellation | set $fa=2 $fs=0.25 |
| trimesh says not watertight with 100+ bodies | exactly coincident faces emit duplicated vertices | use process=True (vertex merge, which every slicer does) and overlap joints by 0.02 anyway |
| a ray down a bore axis exits the far side of the frame | it runs down a facet seam of the polygon bore and slips between two triangles | nudge the ray ORIGIN 0.013 mm off axis, and measure radii from the true axis |
| a chamfer reads as having no lead-in | the cone was hulled in the air BELOW the feature | check the z direction of the hull |
| every collar reports its own slot as overhang | the footprint test did not subtract the collar's own bore | subtract it |
| a section of a collar band returns the outer wall too | min/max over section vertices measures the boss, not the bore | cast rays from the cell axis |
| a bore in a VERTICAL plate breaks a horizontal section into pieces | it is not an interior in that section | 4 bores means 5 polygons, not 4 holes; and probe below the shaft height, not above |
| `sandbox-child.js` processes with PPID 1 spin at 50 to 100 percent CPU for hours, load average climbs and test runs slow down | the parent (a vitest worker or an hbf run) died before its wallMs SIGKILL; the child's reply on the closed IPC channel raised an error, and the uncaughtException handler answered it with another reply, forever (5 children for about 40 h, measured with ps, 2026-10-08) | the child exits on its "disconnect" event (`core/src/sandbox-child.ts:271`) and its reply returns before "send" once the channel is closed (`core/src/sandbox-child.ts:178`); core/test/build-sandbox.test.ts closes the channel mid build. Kill any orphan left from an older build with `pkill -f sandbox-child.js` |
| the Flash Studio CLI (Orca-Flashforge 2.3.2) run headless with a fresh `--datadir` exits on SIGSEGV (139) right after loading the writer's 3MF as exported (measured 2026-10-07) | the writer embeds only the keys it sets (136 of about 670 for keys flex-pair); the GUI fills the rest from the presets the project names on load, the headless CLI does not, and a project config without nozzle_diameter, printable_height and gcode_flavor crashes it (found by key bisection against an owner save, D-237) | slice through the harness, never by adding the keys to the writer: `completeProject` (`tools/slice/slice.mjs:188`) flattens the bundled machine, process and per-slot filament presets the project names and lays every embedded key over them, so nozzle_diameter, printable_height and gcode_flavor come from the presets (`tools/slice/slice.mjs:30`). A printer-scoped key in the export would override the owner's printer profile on open, the fault the dialect rule prevents (knowledge/kernels/3mf-dialect.md, key set). `--load-settings` stays unused because the CLI ranks it above the 3MF and would override the design. A slot whose preset name is not bundled needs an explicit `--filament-map`, recorded in slice-run.json as an inferred stand-in (D-238). Every run gets a new, empty `--datadir` under `--datadir-root`; the owner's Flash Studio profile is never used |

## Verification and agents

| symptom | cause | fix |
|---|---|---|
| a legacy board prints DRC OK and its README counts every non-GND hole isolated and every GND hole bonded, yet its gerbers short 5V to GND (SPINDLE R1, found by the M08-T07 reparse) | the legacy GND island test unioned the uncleared pour and no rule read bottom copper between nets, so the 5V B.Cu trace run through four GND vias at y 20.00 made one 34.15 mm2 piece that was counted as pour (computed, D-249) | never take a legacy DRC OK or a README count as the record; reparse the gerbers and run CHK-BRD-01 (reparse) and CHK-BRD-21 (islands and shorts, `packages/checks/src/defs/brd/CHK-BRD-21.ts`), which fail on it: non-GND isolated 33 of 35, GND bonded 18 of 22. The layout fix is the owner's (D-249, PLAN.md C-21) |
| a check passes or fails on something other than the claim: CHK-PRT-03 put an absolute ceiling over a whole part, CHK-PRT-04 read walls across z bands as one, CHK-KEY-01 threw E_PARAM_MISSING on a contact without coneH, and M08 exit rows named CHK-BRD-09 and CHK-BRD-08 where CHK-BRD-22 (KiCad readback) and CHK-BRD-19 (lead landings) run | the check's scope (what it measures over, which params it requires, which id answers the row) was never read against the claim it was cited for | before a result counts, read which id ran (`--only` names it) and over what it measured. Fixed by CHK-PRT-03 2.0.0 (against unionVolumeMm3), CHK-PRT-04 2.0.0 (walls per z band), CHK-KEY-01 2.1.0 (.hbf-notes/m06-report.md, the M06-T08 and M06-T09 defect rows and the M06-9 and M06-13 commit rows); the M08 rows were corrected in the card (.hbf-notes/m08-report.md, Exit rows kicadts readback and SHUNT lead landings) |
| an agent stops with no output mid task and leaves its work half staged: 114 AM files from the stalled M06 integration agent (.hbf-notes/m06-report.md, Integration, staging triage) | one tool call ran about 9 minutes without output (a whole suite, or parity over every reference, in one command) and the orchestration killed the agent | run suites one workspace at a time and parity one reference at a time; put anything long in the background with a log and poll it (`cmd > /tmp/hbf-x.log 2>&1 &`, then sleep 60 and tail); kill every child process started; a successor triages the staging area (git status, each AM file finished or reverted) before it builds on it |
| a mutant run passes although a load-bearing line was mutated, or a test fails on code already fixed (core/test/gate.test.ts, .hbf-notes/impl-audit.md, the gate.test.ts stale dist row) | core/bin/hbf.mjs, the sandbox child and every @hackbuild package resolve to ./dist, so a source edit is invisible until tsc -b runs | npm test is guarded: root and workspace pretest run tsc -b, and the vitest globalSetup core/test/global-setup.ts runs it too. A mutant applied and restored by hand outside npm test (node --test, a direct hbf call) still needs tsc -b and a check that dist is newer than src, both after applying the mutant and after restoring it |
| an integration step re-accepts the goldens and 37 of 77 mesh hashes and their volumes move with them (reference/electrical/pip-buried-route, M06 integration, .hbf-notes/m06-report.md, Integration) | `hbf parity --accept` takes every golden at once, so a bulk accept for registryHash and report moves swept in a geometry move | before any accept, diff mesh hashes and volumes; when geometry moved, stop and leave the goldens staged as they were, even when the move goes toward the original. Keep the proposed set in fab-knowledge evidence and let the owner accept it (D-152, D-251) |
| a board fabrication export whose checks fail still reaches the gate and writes, and every export test passes (mutant X1, third audit, `fab-knowledge/audit/AUDIT-2026-10-11.md`) | every test of the path either stopped earlier (E_PROVENANCE on SPINDLE) or used the pair fixture, where every check passes, so the failing branch never ran | give every refusal branch its own fixture that reaches it (`core/test/fixtures/boards/pair-short`, `pair-noreads`) and mutate the branch condition on rebuilt dist |
| a rule in a shared kernel can be deleted with every test and every parity golden equal (the pour keepout in `packages/board/src/connect.ts`, mutant B3, 539 of 539) | ignoring a keepout can only add joins, and the one golden board already has GND as one island, so no golden can move | pin a one-way rule with hand-built cases on both sides of it (keepout on the layer, none, keepout on the other layer) |
| a coverage test cannot fail (`packages/board/test/features.test.ts`) | the gap list was defined as the complement of the covered list, so their lengths always sum to the total | assert against a list typed from the card, never one derived from the code under test |
| a KiCad readback check passes a file that holds four 5V to GND shorts its own kernel finds (CHK-BRD-22 on SPINDLE R1) | the reader kept `conn.islands` and dropped `conn.shorts` | return every output of the kernel and compare the file to its record (`shorts.extra`), leaving the absolute verdict to the check that owns it (CHK-BRD-21) |
| one recordHash writes different BOM, CPL and KiCad bytes | the hash sorts set arrays, the writers emit in array order and the KiCad tstamp counter follows emission | one canonical order exported from record-hash.ts, used by the hash and every writer, plus a permutation test per writer |
| `export.run --dryRun` writes the file for kicad and wiring | the dryRun return sat inside the fabrication branch, and the wiring exporter never read the flag | put the dryRun return before the first write for every kind and test that `--out` stays absent |
| a design file runs with the user's full privileges although design code is sandboxed (a board gen.py wrote outside the workspace and started a child, `evidence/audit3/verify/pwned-gen.txt`) | the D-178 sandbox covered build.ts only; core then ran the gen.py that build.ts named through uv with nothing around it | name every executable design file in the sandbox decision (D-089, D-201, R-25) and confine it (sandbox-exec on darwin; Linux still open) |
| a mutant on a constant survives every test (thinpot ladder 1.5 to 1.4 and 2.1 to 2.0 times nozzle) | the constant sits inside `max()` with a floor that wins at a 0.4 mm nozzle (0.6 and 0.84 either way, computed) | test such a rule at a second nozzle where the scaled term wins |
| the status docs name 3 failing rows where 5 fail, and the handoff quotes print card bytes two moves old | figures copied in from memory or an older report instead of counted from the run logs at write time | count failures from the per-workspace logs, and let `tools/check-handoff.mjs` recompute the quoted file sizes and hashes |
| the data volume reaches 92 percent full and long runs slow down | 116 scratch repo copies (32 GB) kept under `evidence/` by verifier and mutation runs | keep the logs and the probe sources, delete each scratch repo copy when its run ends |
| the CI house-rules job would fail on its first push though every local gate passed | lint-authors ran in CI only, not in the root `check` script | run every CI house-rule script from `npm run check` locally |
