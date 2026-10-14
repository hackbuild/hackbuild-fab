# arch-apply fixtures

Three designs for `core/test/arch-apply.test.ts` (M06-T12). The proven
archetypes at M06 are PIP's keys, which sit on the buried stack floor, so
each fixture is a 30 x 30 mm PETG prism (the flex-cone reference's body,
reference/buttons/flex-cone) with one declared face, `body.floor`, at the
stack floor read from the profile stack rows.

| fixture | what it declares |
|---|---|
| `host` | the prism and the face, one PETG slot, nothing applied |
| `applied` | the same prism, with the `chase.applied` entry and the slots arch.apply returns for flex-cone-key on `host` at `top` 9.6, the prism's height |
| `authored` | the same prism and slots, with build.ts placing flex-cone-key on the face through Author.arch at `top` H |

The test holds `applied` to what arch.apply returns on `host`, and holds
the merged build of `applied` to the authored build: same bodies, features
and metrics, the same checks selected at the same versions, the same
measured values.

Four more hold the BLOCKS stud on the fresh prism of
`reference/conductors/blocks-stud-applied` (32 x 24 x 9.6 mm PETG, face
`body.top`), once blocks-stud is proven:

| fixture | what it declares |
|---|---|
| `stud-boss-v1`, `stud-blocks-html` | the prism with the `chase.applied` entry, the cPLA and cTPU slots and the circuit kernel arch.apply returns for blocks-stud at that standard |
| `stud-authored-boss-v1`, `stud-authored-blocks-html` | the same prism and slots, with build.ts placing blocks-stud on `body.top` through Author.arch |

At blocks-html the merged build is also held to the BLOCKS baseline,
`reference/conductors/blocks-stud`: the same checks on the stud's features
at the same versions with the same measured values.
