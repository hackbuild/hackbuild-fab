# Agent capability

What a model of a given size can actually do with this toolchain, what sets
the floor, and the argument for why the toolchain matters more than the
model. This is the reasoning behind PLAN.md section 14.

## The floor is the error message, not the model

A check that says "not watertight" is useless to a weak model. It flails. A
check that says "wall is 1.70, must be a whole multiple of line width 0.40,
nearest legal 1.60 or 2.00" turns a geometry problem into a lookup, and a 7B
model fixes it.

So the legal-values contract in `spec/contracts.ts` (measured, legal,
constraint, origin) is the single design decision that
decides whether weak models can drive this. It has to be there from the
first check, because it is unenforceable to add later.

Same for cross-kernel constraints. If a trace width reports "0.8 to 1.2,
floor from line width, ceiling from your 8k budget, fatigue floor because
this flexes" then choosing is arithmetic. If it reports three separate
failures from three packages the model has to synthesise, and that is where
small models lose.

## What a local 30B can do on day one

Anything that is schema filling plus command sequencing:

- parameter sweeps and batch generation (fifty coin variants with different
  names, nested, exported)
- running the check suite on an existing design and reporting what failed
- art placement on an existing bench (drop a logo, quantize, despeckle,
  export)
- nesting, plate packing, regenerating a part at different dimensions from
  the library
- BOM, CPL, datasheet and pin-map generation from a board definition
- answering questions out of `knowledge/` with plain retrieval

That is a real amount of the actual work. Most sessions in the corpus were
about 20 percent new thinking and 80 percent grinding.

## What needs Sonnet class

- porting a bench onto the kernel, because that is translation against a
  parity target with judgment about what is equivalent
- diagnosing a failure the diagnostics table does not cover, and writing the
  new check from it
- assembling a novel design out of existing archetypes, where the
  composition is new but every piece is known
- the whole "fix the thing the check found" loop when the fix is not a
  parameter edit

## What does not get easier

New kernels. New mechanisms. New joint types. The pin-free floating balance
beam, the crown struck from its own origin, the scanning relabel that made
six pads read on one node. Those were insight, and no tool surface makes
them cheap.

And the one weak models are worst at: knowing the approach is wrong rather
than the parameter. "When no pose scores well, the part is wrong, not the
pose." A small model will try all twenty-four poses. This is why loop
detection is in the agent contract: repeated near-identical calls escalate
rather than burn.

## Circuits versus mechanisms, honestly

Functional circuits in an afternoon with a local model: yes, because a
circuit has a right answer the tool can check. The model picks parts and
nets, the router routes, DRC and the solver say whether it is correct, and
the loop converges without much intelligence in the middle, as long as it
stays inside the catalog and the archetypes. What breaks it: a part with no
verified footprint. Every board that went wrong went wrong there, and the
catalog has to refuse rather than guess.

A cool print of something in the system: yes. A CASK variant, a COAMING deck
around your parts, a new inlay on a COLLAR coin. Twenty minutes.

A novel mechanism that does not exist yet: no, not in an afternoon, not
with a local model. The checks catch errors; they do not generate
mechanisms. The gap between "passes every check" and "works" is where the
hard-won material lives.

## The toolchain matters more than the model

Count what OGEE's seventeen revisions actually were:

- eight were building the checker that could see the bug: the link origin,
  the pin sweep, the crank height rule, the fits table lying, DXF closure,
  severed profiles, print-pose parity, the placement diff. All of that is a
  package now. Gone.
- R12's square peg was rejected because contact radius swings 1.500 to
  2.121 through rotation. Computable. A journal check catches it before
  anything is drawn.
- R13's forced change came from L squared equals S squared plus dz squared
  proving the dogleg jammed. Computable. A linkage check rejects it on the
  first pass.
- R14 was wrong because "at an angle" meant yaw and was read as tilt. A
  communication failure.
- three were generative leaps: the notch deflecting the rod, the crown from
  its own origin, the pin-free balance beam.

So of seventeen, maybe three were insight. With the toolchain a frontier
model plausibly reaches a working machine in two or three passes.

And it compounds. Every check prunes the search space for the next design,
forever, for free. The journal check that rejects square pegs rejects them
in every future mechanism. A model working inside a heavily constrained
space searches a smaller, better-shaped space, and finishes sooner.

A local 30B with this toolchain beats a frontier model without it, for this
class of work, and not by a little. A frontier model with no tools reinvents
the 1 micron inset, the band ordering, the num_filaments trap, the hole
winding bug, every time, from scratch. A small model with `export.3mf` gets
a correct file because the correctness lives in the writer.

## What remains after the toolchain

Three things, smaller than they sound:

- the first calibration point for any new physical phenomenon. Sag is a
  table because a measured 0.168 mm existed. The first cTPU that creeps,
  the first hinge that fatigues, each needs one real print, and after that
  it is free forever
- taste and silhouette. The crank read as four loose sticks while passing
  every numeric check
- knowing you are solving the wrong problem. Three fixes each creating a new
  problem meant the original was nearly right and one feature carried all
  the trouble

## Practical consequences

Keep the MCP surface narrow. About twenty commands, not a hundred. Small
models handle ten to twenty tools before they start picking wrong. Do not
expose the subpath packages individually.

The offline versus live-instrument split is the trust boundary. A weak model
driving an offline generator costs filament if wrong. A weak model driving
BEAM leaves the beam on. Safety in the SDK, not the app, is what makes the
first acceptable and the second survivable, and it matters more with a weak
model, not less.

Never accept a prose claim of success from any model, and especially not a
small one. Returns are evidence. A build hash and a check verdict, or it did
not happen.
