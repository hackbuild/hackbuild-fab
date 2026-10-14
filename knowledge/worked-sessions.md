# Worked sessions

What a conversation with the finished toolchain looks like, in three shapes.
Recovered from the plan conversation. These are the acceptance narrative for
the command surface: if a session cannot go like this, something in
`spec/chase.ts` is missing.

## Circuit, from a one-line brief

> a carrier for the C3 supermini, two servos, a laser on a mosfet, screw
> terminal for the laser, copper tape build

1. `catalog.pins ESP32-C3-SuperMini`. Verified, from the SPINDLE work: pad
   centres 8.75, hole row 7.62, castellation 11.25, right column top to
   bottom 5V G 3.3 4 3 2 1 0.
2. Pin plan. GPIO20 for the laser, not 21, because 21 is U0TXD and strobes
   the boot log at every reset. `CHK-BRD-04` would refuse 21. Gate pulldown
   so the laser cannot fire while the pin floats.
3. `constraints.query conductor.width --material copper-tape`. The
   interval comes from the `copper-tape` profile rows, floor from weeding,
   with the note that weeding pain is set by gap and not trace. The v3
   figure of 1.4 to 2.4 mm is unknown provenance until those rows carry it.
4. `chase.scaffold --kind surface --name c3-laser-carrier --from reference:copper/keyway`,
   then `part.build`, the copper router runs, `check.run`. One failure: the
   screw terminal BODY overlaps the laser pad by 0.04 mm, computed. Body
   footprints, not pad positions, decide fit. Move the terminal with one
   `chase.patch`, reroute, clean.
5. `export.run --kind cut`. Returns `input_required` over MCP with the build
   hash and 0 failing checks. Human accepts. Cut SVG, guide sticker, backer
   DXF, and the viewer land in the branch.

Fifteen minutes, inferred. Nothing in it was new. The README says the base resistor
should be resized once the laser's actual draw is measured, because that
number is inferred.

## Mechanical, inside an existing family

> a CASK for the 4in waveshare instead of the 5in, and put the SATCHEL mark
> on the cap

1. `reference.list --covers bayonet`, then
   `chase.scaffold --kind single --name cask-4in --from reference:joints/bayonet`,
   then `catalog.find` for the 4in display and `chase.patch --pointer` to
   set it; skirt OD, lug z and bay clearance rederive from the CASKGEOM
   params. A `design:<id>` source is not accepted (M10-T05); CASK reaches
   `designs/cask/` at M16-T07.
2. Art: the mark traced, min feature checked against nozzle, despeckle at
   0.35 of the min-feature disc so the counters survive. `CHK-INL-02`.
3. `fits.table`. Bayonet lands in LOCATE. `check.run` green.
4. `export.run --kind 3mf --machine ffc5p`. `validate_3mf --overlap` passes;
   per-part volumes sum to the source with zero error; filament arrays are
   length 3.

Twenty minutes, inferred. This is most of what the toolchain is for most days.

## Mechanical, novel

> a printed thing that counts to 12 and holds its position, hand driven,
> one piece where possible

1. `knowledge.search "count and hold"` comes back with what already applies:
   KNURL's detent has to be a separate flat strip because an integral beam
   fused along its length is about ten times too stiff; Geneva ratios derive
   from the crank; a printed pin loaded across its layers is the wrong
   part.
2. `mech.find "intermittent indexing hand driven"` returns geneva-external
   and count-wheel-detent with their equations.
3. `constraints.query detent.freeLen --material petg --facts clickForceN=1.0`
   returns an interval, floor from strain limit, ceiling from the body
   envelope.
4. `chase.scaffold --kind composer --name count12`; build.ts returns an
   AssemblyDraft with the `detent` feature, the wheel and crank parts from
   `mech.derive geneva-external`, and a `pivot` joint between two printed
   parts (allowed; both are FDM, not sheet). `part.build`, then `asm.solve`
   places them or names the unsatisfiable assertion.
5. `sim.sweep --joint wheel --steps 72`, because it rotates and states are
   not enough. Reports minimum gap 0.27 mm, computed, at one point in the cycle. Tight
   and real; `CHK-ASM-07` flags under 3 mm rather than failing.
6. `view.render --mode section`. The person looks. The star looks like it
   binds on the wheel rim. It does. A rendered picture is a source of truth.
7. One `chase.patch`, one more `sim.sweep`, one more `view.render`. The edit produces
   the expected delta, so the parity triple holds.

Two or three passes rather than twelve, inferred. Still a person's eyes on the render,
still one real print to confirm the click feels right, and that measured
click force goes into `profile` with a `measured` provenance and is free
forever after.

## What the three have in common

- the first call is a query, not a build
- every result is a number or a verdict, never "looks good"
- the export is gated and the approval comes from the host
- the person looks at the render, and that step is in the loop on purpose
- anything measured in the real world writes back to profile with
  provenance
