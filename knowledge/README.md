# knowledge

The accumulated experience, sorted by how executable each kind is. The goal
is to move material down this list over time, from prose the model reads into
code the tool enforces.

| tier | file | executable | who owns it |
|---|---|---|---|
| constants | `00-constants.md` | fully, as versioned data | measurement, never the model |
| invariants | `01-invariants.md` | fully, as checks | the tool |
| ordering rules | `02-ordering-rules.md` | fully, as compiler rules and lints | the tool |
| diagnostics | `03-diagnostics.md` | partly, symptom to cause index | split |
| heuristics | `04-heuristics.md` | mostly, trigger plus consequence | split |
| taste | `05-taste.md` | no, and should not be | the person |

Rough split across this corpus (inferred): about 40 percent constants, 25
percent invariants and ordering, 20 percent diagnostics, 15 percent taste. So
about 65 to 75 percent becomes executable (inferred).

## Model versus tools

Enforcement is entirely the tool. The model proposes, the tool decides, never
the reverse. The asymmetry justifies it: a wrong check costs a false
positive, a wrong model assertion costs a print, a rig, or a silently bad
file discovered three weeks later.

The model's five jobs are the things checks cannot do:

1. turn a failure narrative into a candidate check
2. retrieve relevant records when starting something new
3. propose geometry and parameters
4. explain why a check failed
5. handle taste

The ratchet: every time the model's judgment proves right and repeatable, it
gets promoted into a check, and the model's role for that specific thing
drops to zero forever. The system gets more deterministic over time and the
model's remaining surface is novel design rather than re-deriving
things already learned. A lesson from DETENT ends up protecting BLOCKS
automatically.

## Kernels

`kernels/` holds the per-domain technical record: the 3MF dialect, the
meshing kernels, copper routing, motion and latch identities, board and
gerber work, the art and inlay pipeline, sheet and lasercut design, viewer
and sim patterns, the measured UI anatomy, agent capability, and the
verification method. Read the kernel file before touching that domain.

## Projects

`projects/` holds per-project records with honest numbers and what each
project taught. These are what a model gets wrong from first principles.

## Also here

- `worked-sessions.md`: three end-to-end sessions, the acceptance narrative
  for the command surface
- `kernels/agent-capability.md`: the capability floor, what each model size
  can do, the seventeen-revision count
- `kernels/ui-anatomy.md`: the measured layout from the real bench files
- `kernels/sheet-design.md`: everything cut from flat stock, SLUG in full
