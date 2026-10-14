# Ideas from the mockups, ranked

Written 2026-10-05 under D-222. The originals in this folder and the gold benches are the sample set and the quality bar. The fourteen mockups in `fab-knowledge:mockups/` are a secondary, untested idea source: nothing in them was built by a kernel, printed, cut or flashed, several stages are 2D SVG, and the coin bench is weaker than COLLAR. This file is the one path by which a mockup idea enters the plan (M10 "decision or correction" table, D-222 row).

Read for this file: every mockup README, GOLD.md, session.md and `outputs/` (print cards, coupon files, pinouts, BOM, motion programs, catalog files), the chase.ts and build.ts declaration shapes, every `bench-1280.png`, and the mockups README "Spec gaps found by the examples". Each idea was then checked against the record of the original it touches and against the current plan (`docs/plan/`) and spec (`spec/`). Where the original or the plan already does the thing, the idea is dropped or reduced to what is new, and the entry says so.

Rules that apply to every entry:

- An idea is adopted only where it does not conflict with an original, and only after it is built and tested like any other change.
- No number, fixture or golden comes from a mockup. Every test named below uses an original's files, its record, or a value computed in the test itself.
- A mockup is never a reference or a few-shot example. Where an entry names a mockup file, it is the place the idea was seen, nothing more.
- Record sections are cited as `<slug> RECORD §n`; the same text is in `hackbuild-fab/knowledge/designs/<slug>.md`.

Ranking: value to the person printing the part and to the agent loop, weighed against conflict with an original and build cost. Tier A ideas close a gap an original already exposed; tier B extend an original pattern; tier C are spec and session refinements; tier D are low value or wait on other work.

Each entry carries: what it is; where it was seen; the original it extends or conflicts with; whether an original or the plan already covers it; value; risk; where it lands (milestone task and plan file); how to test it.

## Tier A: close gaps the originals already exposed

### A1. The inferred-rows ledger on the card, with the checks each row moves

- What: a card block that lists every inferred profile row the build read, the checks each row moves, and the coupon that replaces it, plus one line saying which printed figures are targets until that coupon is entered ("claims not made"). A status chip counts the inferred rows.
- Seen in: 01 `outputs/print-card.txt` ("this print rests on inferred rows"), 03 card ("THIS PRINT RESTS ON INFERRED ROWS"), 05 card ("WHAT YOU CHECK"), 06 card ("FIT TEST FIRST"), 09 card ("CLAIMS NOT MADE"); chips `5 inferred rows` (05 bench-1280.png) and `3 rows inferred` (09 bench-1280.png).
- Original: extends PIP RECORD §5.10 and §5.13 (the electrical model says it rests on inferred resistivity and sends the person to the coupon) and PIP RECORD §6 "what makes it excellent" item 7. No conflict.
- Already covered: partly. `part.build` returns `readsInferred: { row, movesChecks }[]` (PLAN.md line 1129) and UI.md opens the export step with one coupon row per coupon. Neither puts the row list or the moved checks on the card or in a chip. Keep the plan's one-row-per-coupon rule on the bench; the card gets the full list.
- Value: high. The card is the contract that leaves the screen; it should say which verdicts are guesses.
- Risk: low. Text only, from data the build already returns.
- Lands: `docs/plan/milestones/M00-foundation.md` M00-T07 (card.ts writes the block inside the existing `fit-test` section), `spec/bench.ts` StatusChip (a `profile.inferred` chip, P-09 family), `docs/plan/milestones/M09-ui.md` M09-T07 (status strip).
- Test: on the PIP reference (`reference/keys/flex-pair`), the card's fit-test block lists exactly the rows in `readsInferred` and, for each, exactly its `movesChecks`; a build with no inferred rows prints no block and no chip. CHK-ART-03 (card against build) covers it once the block exists.

### A2. Card sections the originals carry and `CARD_SECTIONS` lacks

- What: add `fits` (the fits table with a CHECK mark on a failing row) and `bought` (the parts the person must buy, with catalog tier) to `CARD_SECTIONS` in `spec/chase.ts`.
- Seen in: FITS blocks on the 03, 04, 05 and 09 cards; YOU ALSO NEED on the 03 card.
- Original: PIP RECORD §5.14 and §6 (the print card prints the full fits table with CHECK marks); STYLUS (thinpot RECORD §5, YOU ALSO NEED and FITS panes, listed in the M10 "Original UX of record" table). The originals do this already and better; the mockups only showed the spec cannot declare it.
- Already covered: no. `CARD_SECTIONS` is layer, breakers, assembly, pause, pinout, hookup, grams, checked, fit-test.
- Value: high. A PIP or STYLUS port cannot declare its own card today.
- Risk: low.
- Lands: `spec/chase.ts` (CARD_SECTIONS), `docs/plan/milestones/M10-chase.md` M10-T13 (PIP from a chase) and M10-T09 (STYLUS).
- Test: the PIP chase declares `fits`; its card golden equals the shipped PIP card's fits block (`x/pip-controller/print/print-card.txt`, M10 legacy inputs table) row for row; a failing fit row prints CHECK.

### A3. CHK-INL-05: body gaps that close under one line width

- What: an inlay check that fails when a body-colour gap or counter closes under the larger of one line width and the hygiene recipe's own close, with the stray floor CHK-INL-01 uses.
- Seen in: 13 `ratchet/` (check module, seed row, knowledge row, fixtures) and session.md part 2.
- Original: SPRUE RECORD §6 records the failure and asks for this check: the pick back `2026` in Barlow Condensed Bold fused into one blob and the 0.62 close filled the bowl of the 6 (`sources/benches/benches-coins-inlay.md` section 2). SPRUE RECORD §4.2 holds the min black and min white gap hygiene it extends. No conflict.
- Already covered: no. CHECKS.md line 1201 reserves CHK-INL-05 for the clip candidate if entered; this check takes the number or the next free one, decided at entry.
- Value: high. A recorded print failure with no check behind it.
- Risk: medium. The close radius rule (line width against recipe close) needs SPRUE's numbers re-measured, not the mockup's.
- Lands: `docs/plan/milestones/M03-inlay.md` M03-T08 (the inlay feature kind and its checks), `docs/plan/CHECKS.md` (row with origin SPRUE 2026-09-06), `knowledge/03-diagnostics.md` (the record the origin cites).
- Test: fail fixture is SPRUE's own `2026` back under SPRUE's `clean()`, measured in the test from `fonts/BarlowCondensed-Bold.ttf`; pass fixture is the same art under the print-forge recipe; the coin-inlay reference golden gains the pass rows in the same commit.

### A4. The contact margin and the per-segment path in circuit.solve

- What: for a pullup or charge-release read on a path that is a lower bound (no ContactRow, PROFILE.md 6.3), state how much unpriced contact resistance the verdict survives ("LOW holds while the contacts add under N ohm"), and print the path as its segments (pad, trace, post, stud, contact sites) so the person sees where the ohms are.
- Seen in: 10 session.md section 5 (segment list and the margin line under CHK-NET-05).
- Original: extends BLOCKS RECORD §5.22 (DC solver) and §5.23 (undefined band verdict), and PIP RECORD §5.10 (key path as own trace, posts, vias, switch and return; printed keys crossed 10 to 30 times slower than computed). No conflict.
- Already covered: no. CHK-NET-05 and circuit.solve report the path and the verdict, not the margin.
- Value: high. Every printed path today is a lower bound; the margin turns "lower bound" into a number the person can test with a meter.
- Risk: low. Arithmetic on values the solve has.
- Lands: `docs/plan/milestones/M05-circuit-copper.md` M05-T04 (per-direction resistance, segment list) and M05-T06 (circuit.solve and CHK-NET-05 `extra.contactMarginOhm`), `docs/plan/milestones/M09-ui.md` M09-T10 (drive readout line).
- Test: on the BLOCKS reproduction reference (M05-T07), path plus margin equals the threshold path at VIL for the pin row, to the printed precision; the segment sum equals the path; `core/test/message-numbers.test.ts` parses both numbers back to fields.

### A5. An empty interval that names the move that would make it legal

- What: when `constraints.query` returns floors over ceilings, the E_UNSAT `expected` text names the coupled param value, read model or material that would open the interval ("at 4.52, the track at most 2.84 fits", "an external pullup of at least N ohm, or a read that is not a pullup", "cpla-protopasta"). LegalValues gains an empty form that carries the floor and the ceiling.
- Seen in: 06 session.md section 3 (lane pitch and trace), 09 session.md section 4 (bus and track widths), 10 session.md sections 5 and 7, 13 session.md part 2 section 6; mockups README recurring gap "LegalValues has no empty member".
- Original: extends the gold warning standard "cause, amount, move" (gold-standard.md section 7.1, COTTER and COLLAR examples) and COLLAR RECORD §5 (`rimNote` names both radii and two fixes).
- Already covered: partly. `spec/checks.ts` LegalValues has `{ kind: "none" }` with no floor or ceiling; CHECKS.md 2.3 says such a finding carries `legal: null`. The coupled move is not stated anywhere.
- Value: high for agents: a small model reads the next call from the error instead of guessing.
- Risk: medium. The solver must search one coupled param or read model per empty pointer; bound the search to declared ConstraintDefs.
- Lands: `spec/checks.ts` (LegalValues empty with floor, ceiling, unit), `docs/plan/milestones/M01-constraints.md` M01-T04 and M01-T05 (solver and text mirror), M01-T08 (CHK-NET-05 as an interval on the pullup).
- Test: CHECKS.md 7.5 golden N5 (internal pullup on a BOSS path) returns the empty form with floor and ceiling and an `expected` that names the external pullup floor; the message-numbers test parses every number in it.

### A6. A fix that respects every check its param drives

- What: `Fix.predicts` reruns every check the param drives, including the one that produced the fix; when the param's interval across those checks is empty, the finding carries no fix and points at `constraints.query` on the coupled params.
- Seen in: 13 README spec gaps 7 and 8, session.md part 2 section 6 (raising the cap fixed five coins and broke a sixth).
- Original: none conflicts. COLLAR RECORD §5 gives two fixes where one move breaks another rule.
- Already covered: no. AGENT-SURFACE.md 6.1 says predicts reruns "the same check".
- Value: high. A one-param fix that breaks another check is the worst answer an agent can get.
- Risk: medium. More in-memory builds per finding; cache by predicted build hash.
- Lands: `docs/plan/milestones/M04-checks-project.md` M04-T04 (fix and nearest from the solver), `docs/plan/AGENT-SURFACE.md` 6.1.
- Test: a two-check fixture on one param (an inlay cap height bound by a stroke floor and a gap floor, built from SPRUE's font); the fix is withheld when the joint interval is empty and present with both verdicts predicted when it is not.

## Tier B: extend an original pattern

### B1. Agent skill rules from the sessions

- What: rules for the hbf skill. Query the build you will export, with the batch or preset you will export, not a sample. Try a value with `params` before writing it. Take a value inside the band with margin when the bound rests on an inferred row, and say why. Answer a "can it be X" question with a build that is not patched, and report the cost. Never waive a check; ask the person with the options and the numbers. End with one paragraph to the person: verdict, what to watch, what needs their hands.
- Seen in: 13 session.md part 1 sections 1 and 3 (queried the wrong build), 09 session.md section 4 (0.05 over a floor on an unmeasured row), 06 session.md sections 5 and 10, 07 session.md section 3 ("pink, priced"), 10 session.md section 7 (the waiver question), 12 session.md section 5 (keeps the person's dead-man, moves the heartbeat).
- Original: PIP RECORD §5.10 lesson (a computed tau is never a wait; measure both populations). AGENT-SURFACE.md 6.1 already allows a value away from the band edge.
- Already covered: partly (AGENT-SURFACE.md 6.1, P2 "query before build").
- Value: high. Cheap, and it encodes the mistakes a small model makes.
- Risk: low.
- Lands: `docs/plan/milestones/M12-app-mcp.md` M12-T10 (the hbf skill) and M12-T14 (Inspect evals with a held-out split).
- Test: Inspect eval cases built on originals: a BLOCKS scene where the sample preset passes and the real scene fails; a TOGGLE pullup where the band edge sits on an inferred row; a refusal case where only a waiver passes and the model must ask.

### B2. Export dry run that runs artifact checks on bytes kept in the store

- What: `export.run` with `dryRun` renders the artifact into the store, runs the artifact-level checks on those bytes (CHK-BRD-17 silk to mask, CHK-BRD-01 reparse, CHK-3MF-*), writes nothing to the workspace and asks nothing. The bench measures the same quantity at build time where it can, so the finding shows on the step that edits it.
- Seen in: 07 session.md section 4 and README spec gap 9 (silk failed only on exported bytes).
- Original: SHUNT RECORD §4.5 (geometry gates refuse to write) and §4.8 (independent reparse); CHK-BRD-17's origin is SHUNT (estimated widths 15 percent narrow hid 3 collisions).
- Already covered: partly. AGENT-SURFACE.md 6.5 and M12 say a dry run runs "build, checks and preflight, writes nothing"; whether artifact-level checks run is not stated.
- Value: high for boards, medium for 3MF.
- Risk: low; the store already holds artifacts by hash.
- Lands: `docs/plan/AGENT-SURFACE.md` 6.5, `docs/plan/milestones/M12-app-mcp.md` M12-T04, `docs/plan/milestones/M08-board-catalog.md` M08-T09 (SHUNT parity) and M08-T14.
- Test: SHUNT art board fixture with the collision restored: dry run returns CHK-BRD-17 fail with no workspace file and no gate; the same call after the fix passes.

### B3. check.run on an existing artifact over MCP, and CHK-ART-02 that tells rename from change

- What: `check.run` gains an `artifact` input on MCP (the CLI has `--artifact`), so a model can check a staged file without re-exporting it. CHK-ART-02 reports both build hashes and the count of objects whose mesh hash is equal, so "renamed, same geometry" reads differently from "different design" while the verdict stays fail.
- Seen in: 14 README spec gaps 7 and 11, session.md section 2 (stale plate after a rename).
- Original: NACELLE RECORD §1.2 (SCAD, STL and README from different revisions), the origin of CHK-ART-02.
- Already covered: no.
- Value: medium to high for graduated repos and CI.
- Risk: low.
- Lands: `spec/commands.ts` (check.run input), `docs/plan/milestones/M12-app-mcp.md` M12-T02 (freeze candidates), `docs/plan/CHECKS.md` (CHK-ART-02 extra fields).
- Test: NACELLE drift fixture (files from two revisions) fails with mesh-equal 0; the same 3MF with only the chase id changed fails with mesh-equal equal to the object count; MCP `check_run` with `artifact` returns the same result as the CLI.

### B4. Grouped findings with a cause key

- What: findings that share one cause (a check id, a constraint and a measured value pattern across N targets) render as one row with the target list and a count; the status chip counts causes, and the rule is stated so G-36 (chip equals rail) stays testable.
- Seen in: 01 bench (`x18` rows), 13 README spec gap 22 and bench (one cause, five coins).
- Original: PIP RECORD §6 known flaws ("fifteen warnings unlocated"); gold-standard.md section 7.2.
- Already covered: no. `CheckResult` has no group key.
- Value: medium to high. The PIP buried stack carries the same CHK-NET-13 warning on every vertical column.
- Risk: medium: count semantics change for G-36; decide once in UI.md.
- Lands: `spec/checks.ts` (optional `group`), `docs/plan/AGENT-SURFACE.md` 6.3 (text mirror), `docs/plan/milestones/M09-ui.md` M09-T05 (locate a finding).
- Test: PIP reference with its vertical columns: one grouped CHK-NET-13 row, count equal to the column count, chip and rail agree; clicking the row frames every target.

### B5. Batch readouts that name the worst instance

- What: on a design with many instances (a roster, a plate of picks, a tile lattice), each readout reports the worst value and names the instance, and the stage steps through instances with previous and next.
- Seen in: 13 bench-1280.png (`smallest cap 3.95 ALEXANDRIA`, PREV and NEXT), 13 README spec gap 1.
- Original: extends SPRUE RECORD §4.5 (plate packer, 40 picks) and COLLAR RECORD §5 readout rail; P-12 instances.
- Already covered: no.
- Value: medium to high for SPRUE and BLOCKS scenes.
- Risk: low.
- Lands: `docs/plan/milestones/M09-ui.md` M09-T08 (ParamRail, `list` and instances), `docs/plan/milestones/M03-inlay.md` M03-T10 (SPRUE on the package).
- Test: SPRUE default design (40 picks): each readout equals the minimum or maximum over instances computed in the test and names that instance; next and previous visit every instance once.

### B6. A near-limit marks overlay, and tight spots carried to the card

- What: a `marks` view toggle that draws every clearance within a declared margin of its floor with its value; the card's checked block names the tight spots for the person to inspect.
- Seen in: 06 bench-1280.png (`marks: gaps under 1.10 mm`), 07 bench (marks), 06 card ("weed the 4 tight spots under a loupe").
- Original: extends CHK-NET-12 (CHECKS.md: tight spots surface as warnings), PIP RECORD §7 (`gaps.mjs`, `gaps2.mjs`), KEYWAY RECORD gates.
- Already covered: partly (CHK-NET-12 names tight spots; no threshold row, no view).
- Value: medium.
- Risk: the 10 percent margin in 06 is invented; it needs a profile constant (see C1).
- Lands: `spec/bench.ts` ViewsDecl (`marks`), `docs/plan/milestones/M09-ui.md` M09-T06 and M09-T07, `docs/plan/PROFILE.md` (margin constant).
- Test: PIP buried stack: the marks count equals CHK-NET-12's tight spot count at the declared margin; the pink budget is unchanged (marks use the warn colour).

### B7. Coupon outputs: a record template, a derived-row file, and "what it moves"

- What: every coupon export writes a record template with every reading null, the coupon card ends with "what it moves on <design>" (the checks, firmware constants and card lines that follow the rows, and the fact that no build hash moves), and entering readings writes a derived-row file that shows its arithmetic and the row it replaces.
- Seen in: 09 `outputs/coupon/` (card, null template), 05 `outputs/coupon/` (record, `derived-row.sheet600.kerf.json`).
- Original: PIP RECORD §5.13 (coupon card with expected resistance per run and the ohm cm conversion), JIB RECORD §5.3 (coupon first), SKETCH RECORD §7 (kerf belongs to export). PROFILE.md 11.1 holds the write path.
- Already covered: partly (the write path); the three files are new.
- Value: medium to high. The person sees why the coupon is worth the plastic.
- Risk: low.
- Lands: `docs/plan/milestones/M05-circuit-copper.md` (resistivity coupon), `docs/plan/milestones/M07-motion-nest.md` (kerf coupon), `docs/plan/milestones/M11-reference.md` M11-T07 (coupon reference checks).
- Test: the resistivity coupon card for the PIP reference lists exactly the checks in `movesChecks` of the rows it carries; the null template validates against the record schema; CI recomputes the derived row from a hand-entered record and matches.

### B8. Motion programs with expected readings, and a negative program

- What: a motion program carries `expect` per step (display after each count, cells latched), and a design that claims a refusal ships a second program that must produce nothing (each comb alone latches no cell).
- Seen in: 04 `outputs/motion/tally-roll-60.json`, 11 `outputs/motion/speckle.write.rowOnly.json` and `.expect.json`.
- Original: OGEE16 RECORD §5 (BUILD CHECK names "half select does not latch"), KNURL RECORD §6 (run at one bead per 260 ms), STIPPLE RECORD §4.6 (write schedule).
- Already covered: partly (Motion IR at M07-T11; CHK-MOT-04 is boolean).
- Value: medium to high. It turns "proved" into a replayable trace.
- Risk: low.
- Lands: `docs/plan/milestones/M07-motion-nest.md` M07-T02 (spec types) and M07-T11 (runner).
- Test: OGEE16 R16-P: the checker program latches the cells its pattern names; the row-only program latches zero; KNURL bead run reads 1 to N in order.

### B9. The bill as a function of n, from instances

- What: a readout that states the piece count as the build's formula in the array size and equals the nest placements.
- Seen in: 11 bench-1280.png (`258 2n2 + 4n + 18`, `bill 387 from instances`).
- Original: OGEE16 RECORD §1.2 and §4.10 (the build-it page's table undercounted by 25 pieces; its docstring still says 99); CHK-LNT-03 exists for hand tables.
- Already covered: partly (M07-T08 parity test, CHK-LNT-03 on source).
- Value: medium.
- Risk: low.
- Lands: `docs/plan/milestones/M07-motion-nest.md` M07-T08 (OGEE16 plates at parity), `docs/plan/milestones/M09-ui.md` M09-T08 (readout).
- Test: OGEE16 at the knob and servo drives: the readout equals the 124 and 119 the record computes from `build_plate.py` and equals the placements.

### B10. Drive targets beyond keys

- What: four drive forms tied to originals. Slide the supply rail with ticks where the circuit goes dim or off. Press a snap finger shown as a section (travel to engagement, strain, click). Bend a living hinge with each row's share drawn and the over-limit zone shaded. Hold a cell, a row or a column of a coincidence display.
- Seen in: 07 bench (rail slide), 03 bench-1280.png (finger section pad), 05 bench-1280.png (hinge bend pad), 11 bench-1280.png (cell grid pad).
- Original: the drive pad standard (PIP RECORD §6, TOGGLE RECORD §6.2, gold-standard.md section 3.2). Per form: SHIM RECORD §4.1 (CR2032 blinky), PLINTH RECORD §5.3 (snap tongues with a strain check), SKETCH RECORD §9 and TUMBLER RECORD §4.5 (living hinge), STIPPLE RECORD §4.2 and OGEE16 RECORD §5 (WRITE A PIXEL).
- Already covered: partly (DriveDecl gestures from P-05).
- Value: medium. Each makes a non-key design drivable the way PIP is.
- Risk: medium. The 2D pad drawings in the mockups are below the bar; the pad must drive the lit 3D stage and share one contact function (G-20).
- Lands: `spec/bench.ts` DriveDecl, `docs/plan/milestones/M09-ui.md` M09-T10, and the card that ports each original.
- Test: per original, pad, stage, readout and `BENCH.drive` agree to 0.01 through one contact function; release springs back under 400 ms; the snap pad's strain equals CHK-FIT-06 measured on PLINTH.

### B11. Port map table and a type catalog with refusal reasons

- What: on a composer with a port standard, a rail table of slot, u, carrier slot, pin and verdict; type cards that are disabled carry the reason ("six channels; no edge has six").
- Seen in: 10 bench-1280.png (PORT MAP, TILES), 10 `outputs/tile-catalog.csv`.
- Original: COFFER RECORD §5.2 (the six-edge port standard) and §5.8 (M1 carrier edges); STYLUS picker of cards rendered from real builds (M10 UX table).
- Already covered: no.
- Value: medium.
- Risk: low.
- Lands: `docs/plan/milestones/M06-canons.md` M06-T11 (`arch.find` returns the refusal reason), `docs/plan/milestones/M09-ui.md` M09-T08 (inspector, P-12).
- Test: COFFER: K6, S3 and A3 refused on every M1 edge with the channel reason; D1 accepted on edge 2.

### B12. Orientation ranking as metrics, and the other pose as a fact

- What: the print pose scorer's ranking per part rides as informational metrics with bed contact, overhang and height, and `constraints.query --facts bend=inPlane` answers what the other pose would allow.
- Seen in: 03 session.md section 1.4 and 1.5.
- Original: OGEE16 RECORD §4.9 (`orient.py`, 24 poses, bed then overhang then height) and DERRICK RECORD §5.8 (print planning).
- Already covered: partly (the scorer is planned; no output type, README gap 10 of 03).
- Value: medium. It explains why a strain row applies.
- Risk: low.
- Lands: `docs/plan/PACKAGES.md` (mesh orient output type), `docs/plan/milestones/M01-constraints.md` M01-T05 (facts).
- Test: OGEE16 rod cap and knob rankings equal the record's chosen poses.

### B13. Bought parts: refused, measured by a person, then the moves listed

- What: an inferred catalog row builds and checks, then export refuses with E_PROVENANCE; the model stops and asks the person to measure; the person's row uses a caliper method; the next build lists every derived value the row moved.
- Seen in: 03 session.md sections 1.8 and 1.9, 08 session.md section 7 (the `moved` block), 11 and 12 sessions.
- Original: D-102 and D-104 in the plan; DAVIT, JIB, PINTLE and STANCHION records disagree on SG90 dimensions (08 lists the conflicts).
- Already covered: partly (E_PROVENANCE, M08-T03). Open: `ProvenanceMethod` has no caliper value, no write path for a measured catalog row, row tier against per-dimension provenance.
- Value: medium to high.
- Risk: low.
- Lands: `docs/plan/PROFILE.md` 11, `docs/plan/milestones/M08-board-catalog.md` M08-T03, `docs/plan/milestones/M10-chase.md` M10-T04 (diff lists derived moves).
- Test: the SG90 row from DAVIT RECORD §5.4 at tier inferred refuses export; a hand-entered measured row passes; `chase.diff --build` lists the pocket and frame values that moved.

### B14. Hookup additions: bus pullups and strapping pins

- What: the hookup panel computes an I2C bus pullup from bus capacitance and clock rise time and states the internal-pullup case to avoid; pins that are strapping pins on the module are listed as pins to keep free.
- Seen in: 06 card HOOKUP, 03 card HOOKUP.
- Original: extends TOGGLE RECORD §5.7 (E12 pullup, numbered hookup sentences, "do not use a built in pull up") and the per-MCU pin rows of M05-T02 and M08-T04.
- Already covered: no for the bus case; strapping flags depend on catalog rows.
- Value: medium.
- Risk: low; values come from datasheet rows, not from the mockups.
- Lands: `docs/plan/milestones/M05-circuit-copper.md` M05-T05 (read models), `docs/plan/milestones/M08-board-catalog.md` M08-T04 (pin rows with a strapping flag).
- Test: unit test of the rise time formula with datasheet values; the C3 SuperMini row flags GPIO2, GPIO8 and GPIO9 from its vendor source.

### B15. The machine card as a rig contract, and the arm confirm from the manifest

- What: for kind machine, the card states the laser class and wavelength, gate pin and boot state, dead-man, heartbeat, duty, aim window and the firmware file hash and compile line; the bench's arm confirm text is filled from the device manifest only; soft limits computed from the head's geometry go into the firmware window.
- Seen in: 12 `outputs/print-card.txt`, session.md section 13.
- Original: WASHER RECORD §5.1 to §5.7 and §9 (every ceiling named, board-held configuration adopted on connect), SPROCKET RECORD (dead-man, disarmed at boot, arm confirmed by telemetry).
- Already covered: partly (M13-T07 safety layer, CHK-DEV-03 and -04).
- Value: medium.
- Risk: low for the card; the confirm text must never claim what the manifest does not declare.
- Lands: `docs/plan/milestones/M13-link.md` M13-T07 and M13-T16, `docs/plan/milestones/M07-motion-nest.md` M07-T11 (limits into the rule table).
- Test: WASHER: the tilt window derived from the head equals the firmware constants; a manifest with a null dead-man fails CHK-DEV-04 and the confirm never renders.

### B16. Published state on the export step, rename by alias, and cards that carry refusals

- What: the export step of a graduated design shows the chase id and alias, the published build against the current one, the bake hash, the staged plate's hash with CHK-ART-02, and the licences. A design file naming an old id opens with "renamed <new>, params kept". Catalog cards and `llms.txt` lines carry the last verdict and the reason an export is refused today.
- Seen in: 14 bench-1280.png (PUBLISHED grid), 14 `outputs/site/llms.txt`.
- Original: PIP (the graduated repo layout, D-035, D-142), NACELLE RECORD §1.2 for the drift it guards.
- Already covered: partly (M11-T14 gallery as a catalog chase, D-112 llms.txt, aliases).
- Value: medium.
- Risk: low.
- Lands: `docs/plan/milestones/M09-ui.md` M09-T13 (bake), `docs/plan/milestones/M10-chase.md` M10-T03 (migrations, alias), `docs/plan/milestones/M11-reference.md` M11-T14.
- Test: a PIP design file with a renamed id loads with the log line and the same params; the gallery card for a design with an inferred servo row shows the E_PROVENANCE reason.

## Tier C: spec, text mirror and session refinements

### C1. Spec gaps the mockups surfaced, with their state on 2026-10-05

Each gap below came from the mockups README "Spec gaps" tables. State was checked against `spec/*.ts` and `docs/plan/` on 2026-10-05; "verify" means it was not checked here and the owner of the milestone confirms before acting. None conflicts with an original.

| gap | state | lands |
|---|---|---|
| `Author.catalog(id)` and a `BoughtDraft {id, catalogId, pose}` the kernel resolves; `BoughtBody.envelope` needs a kernel hash today | open (no `catalog(` or `BoughtDraft` in spec) | M08-T03, `spec/build.ts` |
| `realGap` side for a bought, unprinted mate | verify | M00-T02, `spec/profile.ts` |
| LegalValues empty with floor and ceiling (A5); open `hi` for "at least" rules | `none` kind exists without numbers; open end missing | M01-T04, `spec/checks.ts` |
| `Fix.paramLegal` of kind set for an enum fix (fit class, key set) | open (numeric pair) | M04-T04 |
| a `drive` hookup for servo PWM, laser gate and driver channels; a field for an intermediate chip (MPR121, PCA9685) | open | M05-T05, M13-T01 |
| a capacitance read model (MPR121, touch peripheral, charge share) | open (read models: pullup, rc-time, slide, charge-release, adc, ratiometric, column-scan, ladder) | M05-T05 |
| which exporters are fabrication exports | flag exists (`ExporterDef.fabrication`); the registered id list (`svg-cut`, `circuit-json`, `motion`, `device`, a free `post`) verify | M07-T14, M08-T14, M13 |
| a router in the authoring surface, `k.route(nets, box, rules)` | verify | M05-T08 |
| `MechanismApplyOut.roles`, one output per declared side, `derived` | verify | M06-T01, M06-T03 |
| `InlayFeature` fields for recipe, boost, text, cap height, arc span, clip; the bed-face depth rule (first layer included); a stray floor for CHK-INL-01 | verify | M03-T08 |
| `nest.pack` takes a build and a margin; a sheet for kinds that do not nest | verify | M07-T03, M07-T14 |
| a tool change time row per machine, so multi-colour print time has a total | open (no row) | PROFILE.md 8, M00-T02 |
| ContactRow; until one lands, every printed path is a lower bound and the card says so | open by PROFILE.md 6.3 | A4, PROFILE.md |
| `ProvenanceMethod` caliper reading; which tier the export gate tests when dimensions carry their own provenance | open | B13 |
| fit classes for a loose bought part, a turning journal, laser in laser, a printed hole on a cut part | verify | PROFILE.md 7 |
| `list` param default | verify | M10-T02 |
| `ring.polar(n, i)`, `ring.rotate`, and the circle table's start and direction | open (no polar helper) | M00-T03 |
| `ContactState.reads` for electrical drive readouts; `pose.turnDeg` for a slide that turns a wheel | open | M09-T10, `spec/build.ts` |
| `RailStep` or `ViewsDecl` section plane by name | verify | M09-T07 |
| a `data` marker in the pink budget for swatches that are data | verify | UI.md 10 |
| layer numbering on the card counts as the slicer does (first layer 1) | verify | M00-T07 |
| board kind with a printed companion, machine kind with steps | owner (D-120, D-126) | UI.md 8 |
| AGENT-SURFACE.md 9.5 lists 19, 10 and 5 tools while 5.2 gives 6 for `sweep`; `sweep` has no `chase_patch` | open, owner decides whether intended | M12-T02 |
| `check.run` artifact input on MCP | open (B3) | M12-T02 |

Test for the table: each closed gap gets the contract test of the milestone it lands in; the TESTING.md param-range contract test refuses a chase default off its field step (the 03 failure on G-09).

### C2. Text mirror lines the renderer cannot print

- What: `renderFinding` in AGENT-SURFACE.md 6.3 has no line for `waived` (reason and until date, D-173), no `reads inferred` line, no `truncated` line, and `legalText` drops `multipleOf.offset` (prints "a multiple of 0.24 mm, nearest 2.89 or 3.13", where 2.89 is not a multiple of 0.24).
- Seen in: 01 README spec gaps 8 and 14, 02 README spec gap 14.
- Original: none conflicts. The `offset` field is already in `spec/checks.ts` LegalValues; only the renderer is behind.
- Value: medium. Message numbers are tested (M04-T05), so a wrong line fails a test once the line exists.
- Risk: low.
- Lands: `docs/plan/AGENT-SURFACE.md` 6.3, `docs/plan/milestones/M04-checks-project.md` M04-T05, `docs/plan/milestones/M12-app-mcp.md` M12-T03.
- Test: message-numbers test on a PIP face height finding prints "0.25 + n x 0.24 mm" with both neighbours; a waived COLLAR pocket bridge prints its reason and date.

### C3. Diffs that list measured moves and derived moves

- What: `chase.diff --build` prints, per verdict move, the old and new measured value, and lists derived values that moved without a verdict change ("also moved: window 16.20 to 15.65").
- Seen in: 02 session.md section 6, 07 session.md section 6, 12 session.md section 6, 13 session.md part 2 section 8.
- Original: none.
- Already covered: mostly. M10-T04 reports changes by pointer and by verdict. The new part is the measured delta and the derived lines.
- Value: low to medium.
- Risk: low.
- Lands: `docs/plan/milestones/M10-chase.md` M10-T04.
- Test: PIP shim change: the diff lists the face height check's fail to pass with both measured values, and the cover readout as a derived move.

### C4. Status chip vocabulary

- What: chips for kerf state (`kerf null`, `kerf measured`), the lowest tier of a bought part (`display inferred`), `not sliced`, `rules equal` and the inferred-row count (A1).
- Seen in: 03, 05, 08, 11, 12 and 14 bench-1280.png status strips.
- Original: extends P-09 (gold-standard.md section 12) and the status strips of PIP, TANG R6 and KNUCKLE records.
- Value: low to medium.
- Risk: the strip must keep describing the view on screen (G-45).
- Lands: `spec/bench.ts` StatusChip, `docs/plan/milestones/M09-ui.md` M09-T07.
- Test: chip text follows the profile row and the rules audit on the OGEE16 and WASHER ports.

### C5. Snap and clamp warnings that say what fits

- What: a build warning for a value that snapped to the layer grid states the built value and what still fits ("tag 0.60 snapped up to a 0.72 pocket; a tag up to 0.72 fits"; "8.00 builds as 8.16"), and the legal band on the range track marks the built value, not the typed one.
- Seen in: 02 session.md section 3 (SNAP), 03 session.md section 1.4 (CLAMP) and bench-1280.png (built length marker).
- Original: gold G-28 (solve and measure back); COLLAR RECORD §6 rule 4 (the pause layer from the same snapped Z).
- Already covered: the band itself is in M09-T08 step 5 and UI.md 12.5; the built-value marker and the warning text are new.
- Value: low to medium.
- Risk: low.
- Lands: `docs/plan/milestones/M09-ui.md` M09-T08, build warnings in `spec/build.ts`.
- Test: COLLAR pocket depth off the grid: the warning names the snapped value and the largest tag that fits; the band marker sits at the snapped value.

### C6. Fix kinds, written down

- What: state the four answers a failed build can get: a one-param fix, an enum or class patch, a wiring patch that moves no build hash (D-078, D-183), and a waiver only a person grants. Findings never carry "fix: accept".
- Seen in: 10 README verdict ("four kinds of answer"), 04 card (the "fix: accept" lines this rejects).
- Original: none conflicts.
- Value: low to medium; it shapes A6, B1 and C1 (set-valued fix).
- Lands: `docs/plan/CHECKS.md` 2.4, `docs/plan/AGENT-SURFACE.md` 6.1.
- Test: a TOGGLE read model change moves no build hash and flips CHK-NET-05; a warn-severity finding never carries a fix whose text is not a param edit.

### C7. Session token budgets per profile

- What: the eval records context size at the end of a scripted session per toolset profile, so the `sweep` profile stays inside a local model's window.
- Seen in: 13 session.md "Token budget".
- Original: none.
- Already covered: partly (D-110 output cap, M12 budget for `--detail summary`).
- Value: low to medium.
- Lands: `docs/plan/milestones/M12-app-mcp.md` M12-T14.
- Test: the eval run fails when the `sweep` scenario ends over the declared budget.

## Tier D: low value or waiting on other work

### D1. A mechanism sheet export

- What: an export that prints each applied canon entry with inputs, equations, outputs, qualifiers and its parity goldens.
- Seen in: 04 `outputs/mechanism-sheet.txt`.
- Original: KNURL RECORD (Geneva closed form, detent strip), TUMBLER RECORD §4.5.
- Value: low; `mech.derive` already prints the same per entry.
- Lands: `docs/plan/milestones/M06-canons.md` M06-T11, only if a design asks for it.
- Test: KNURL goldens of M06-T04 reproduce in the sheet.

### D2. Card time line that admits what it cannot price

- What: print time as volume over rate with tool changes counted and the total marked unknown until a tool change row exists; "not sliced" when no slicer ran.
- Seen in: 02, 04 and 13 cards.
- Original: PIP RECORD §5.20 (grams per slot); no original prices tool changes.
- Lands: waits on the tool change row (C1); M00-T07.
- Test: a two-colour COLLAR card prints the unknown total until the row lands, then a number.

### D3. Firmware that widens its own ADC ends

- What: emitted firmware starts from computed end counts and widens them to what the print reads.
- Seen in: 09 `outputs/firmware/synth_face.ino`.
- Original: PIP RECORD §5.11 (waits from a coupon, never from a computed tau); TANG R6 RECORD §4.4.
- Value: low; risk that a widened range hides a broken path.
- Lands: the M10 firmware emitter card, behind CHK-ART-08.
- Test: on TANG R6's pot, the emitted constants equal the solve and the widening never shrinks the range.

### D4. A deck web check

- What: a sheet check for the thinnest web between two holes, since CHK-SHT-01 and -02 pass a 0.10 web at nominal.
- Seen in: 11 README "Findings worth a maker's attention" and spec gap 5.
- Original: STIPPLE R17b decks (STIPPLE RECORD §4.4). The 0.10 webs are the mockup's claim; the STIPPLE record does not state them. Verify from `files/stipple-r17b.html` `DATA.parts` before entering a check.
- Lands: `docs/plan/milestones/M07-motion-nest.md` or `docs/plan/milestones/M11-reference.md` M11-T07, after verification.
- Test: measured on STIPPLE's own deck outlines in the test.

### D5. Tag every legacy fit constant as diametral or per side at port

- What: a port card records, for each legacy fit constant, whether it is across the joint or per side.
- Seen in: 11 README findings (`CAP_FIT 1.0` read per side gives a 0.425 rattle).
- Original: STIPPLE RECORD §4.3 confirms the aperture is `CAP_D + CAP_FIT`, so `CAP_FIT` is diametral, and OGEE16 offsets its pocket by `CAM`. The record already holds the fact; the rule is the new part.
- Value: medium for sheet ports, low elsewhere.
- Lands: `docs/plan/milestones/M10-chase.md` M10-T01 (lineage and adapters), `docs/plan/milestones/M01-constraints.md` M01-T09 (fits as intervals).
- Test: the STIPPLE port reads 0.5 per side; a fit constant with no tag fails the port card's lineage check.

## Dropped: an original or the plan already does it, or does it better

| mockup idea | why dropped | where it already lives |
|---|---|---|
| torque bars against stall with budget lines (08) | DAVIT and DERRICK do it with one stated budget each; 08 mixes budgets from four benches | DAVIT RECORD §5.13, DERRICK RECORD §5.5 |
| link console that adopts the board's config and pushes nothing (12) | WASHER does it and is the record | WASHER RECORD §5.7 and §9 rule 6, SPROCKET RECORD |
| legal band drawn on the range track (03, 09) | in the plan; only the built-value marker is new (C5) | M09-T08 step 5, UI.md 12.5 |
| pressed pin voltages and the internal pullup to avoid (01) | TOGGLE does it, with the E12 choice | TOGGLE RECORD §5.7, P-22 |
| coupon row first in the export step (01, 05, 09) | in the plan | UI.md (coupon row), PIP RECORD §5.13 |
| slicer settings that break the print, the "load as a single object" fallback, the pause gesture | originals | COLLAR RECORD §4.8 and §4.10, cask-caps RECORD, gold-standard.md section 8 |
| zero checks never reads as pass; a step with none says so (06) | gold standard | gold-standard.md section 7.2 |
| `chase.diff` by verdict (02, 07) | in the plan; only deltas are new (C3) | M10-T04 |
| `readsInferred` on the build result | in the plan; only the card and chip are new (A1) | PLAN.md line 1129 |
| prefer a value away from the band edge | in the plan; the skill rule is new (B1) | AGENT-SURFACE.md 6.1 |
| self-test verbs and `#selftest` inside the shipped page (04, 14) | the Playwright smoke and hook conformance own this; test verbs do not ship in a bake | M09-T12, M09-T14 |
| card text inside the 3MF (05) | COLLAR does it | COLLAR RECORD §4.10 |
| aim field view with the tilt stop on the board (12) | WASHER's field and planner views | WASHER RECORD §5.4 and §6 |
| the gold rule tables in each GOLD.md | the rules come from the originals; the mockups conform to them | gold-standard.md section 11 |

## Do not copy: what the mockups did worse than the originals

1. 2D SVG stages. 04, 06, 07, 10 and 11 draw the stage as flat or painter's-order SVG; 03 and 05 fake depth by draw order. The originals are lit 3D (WebGL or their own renderers with depth), and M10 requires each port to match its original's lit 3D views.
2. A stage that keeps the starter drawing when geometry params change (10). Every view redraws from the current build (G-14).
3. Page kernels hand-ported from build.ts, with their own FNV hashes beside the session's sha256 (03, 05, 07). One kernel runs in node and in the page with one hash (G-13).
4. Metadata stubs as 3MF and STL exports, and overlapping shells for want of a union (03, 04, 05, 09). An export is the slicer file the build makes, or the export kind is not offered.
5. Weaker designers than the original of the same family: the coin bench (02, 13) has none of COLLAR's art board direct manipulation, edge profile registry or layer stack editor (COLLAR RECORD §4.2, §4.12, §4.14).
6. Numbers that disagree between files and stay unfixed: stale hashes after edits (06, 08, 09), the post clearance 1.97 against 2.03 (04), four centidegree values between bench and firmware (08). Regenerate every output from the build, or the file does not ship.
7. Builds on the main thread with a busy chip that cannot show (08 G-56). Builds go to a worker as the originals' budgets require.
8. Infinity written as a number: open ceilings as 1000 or the sheet width (04, 06). Use the open interval form (C1).
9. Thresholds invented in a check: the 10 percent tight spot margin (06), the 30 percent swing default with no field (09). A threshold is a profile row or a declared param with a source.
10. "fix: accept" on a warning (04). A finding's fix is a param edit; anything else is a waiver a person grants.
11. A chase default off its field step, kept for the story (03, G-09). The param-range contract test refuses it.
12. Local shell and layout choices that override a decision: the paper shell for the board and machine kinds (07, 08, 12), the composer skeleton for kinds whose reference layout has none. These are owner decisions (D-120, D-126), not bench choices.
13. Proposed check ids, constraint dims and exporter ids used as if registered (CHK-MOT-07, `motion/sweep-clear`, `kit`). A builder enters an id through CHECKS.md or the registry first.
14. Mixing budgets or rows from several originals into one verdict without a profile row (08 torque, 03 strain rows). One row, one source, one tier.
