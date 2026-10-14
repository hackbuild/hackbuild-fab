# M15 gesture

Version 4, 2026-10-04. Part of the hackbuild-fab plan set; PLAN.md is the index.

Goal: arch.apply with a mouse.
Depends on: M12, M14
Adopted dependency: none; the gesture runs on commands and packages that already exist (MILESTONES.md 1.2)
Commands added: none. The CLI stays at 30 commands and MCP at 19 tools (D-106, D-107); the surface test pins both at the M15 exit
Release at exit: none

hbf (working name) is the binary with CLI, MCP and HTTP transports. CHASE
(working name) is the typed design document. STYLUS (working name, was
FEELER) is the printed sensor design built from archetypes (D-164). PIP (was
HAFT) is the published print-in-place controller at hackbuild/pip-controller
(D-013). The circuit canon package is `archetypes`, formerly `circuits`
(D-014). Every number in this file carries a qualifier (measured, computed,
vendor, inferred, unknown) or names the file it comes from (D-007). Repo
paths are relative to the hackbuild-fab root; evidence paths are absolute.
"Bench" is the internal word for a layout a chase renders into; user-facing
copy uses the tool name.

## What this milestone is

v3 set the order: the operation that places a proven circuit on a face of
any part is a command first and a gesture second, so the agent surface
exercises it at scale before a person gets a mouse on it (v3 PLAN.md lines
125 to 135). M06-T12 shipped the command, `arch.apply {part, face, id,
params?}`, writing `{archetype, part, face, params}` into `chase.applied` on
the work branch. M12 froze it as the MCP tool `arch_apply`. M14 proved it on
a BRep-route part (a STYLUS dome on the LOCKET lid). M15 adds no command and
no geometry code. It adds a way for a person to produce the same call by
dragging an archetype card onto a face in the FAB app, and it proves that the
call, the written chase, the build and the check report are byte-for-byte
what the CLI produces for the same face.

Three rules hold the whole milestone together.

| rule | what it means for a card | decision |
|---|---|---|
| one write path | The only thing that writes `chase.applied` is the arch.apply command reached through the app's command client. The preview never writes, never builds and never calls an archetype's `apply()`. | D-106, D-115 |
| one commit per drop | A drop that writes is one ui-core commit: rev plus 1, one undo entry, one scheduled rebuild. Hover, drag and turning the ghost are touches with no rev bump. Undo and redo are one commit each. | D-123, D-125 |
| the tool proves | The gesture refuses nothing the command accepts. Checks run after the write and decide. Legality shown in the UI comes from command results, never from UI code. | D-064, PLAN.md section 1 |

## What this milestone decides and carries

| item | decision | where in this file |
|---|---|---|
| arch.apply is the operation; the gesture calls it and writes `chase.applied`; no new command | D-014, D-106, D-107, D-114, D-132 | M15-T05, M15-T10 |
| writes go to `hbf/<chase>`; anchors match once or E_STALE; undo and redo write through chase.patch | D-115 | M15-T05, M15-T06 |
| ui-core state is plain TypeScript with explicit commit; Pinia mirrors only; no store below tier 3 | D-123 | M15-T02, M15-T06 |
| touch parity, one focal pink per view, locatable findings, enum options from legal values | D-125 | M15-T04, M15-T05, M15-T07, M15-T09 |
| header verbs: undo and redo at the right end of the guide strip | D-119 (owner; default in force) | M15-T06 |
| one system, paper shell; no CONDUYT teal or JetBrains Mono | D-120 (owner; default in force) | M15-T04 |
| typed questions from the command, never strings | D-133 | M15-T05 |
| error codes and transport mapping (E_REF, E_STALE, E_REPEAT, E_KERNEL, typed question at exit 2 / HTTP 422) | D-064 | M15-T05 |
| loop detection keyed on workspace and branch, applied as written | D-111 | M15-T05, gaps |
| BenchHook frozen; verbs are design extras | D-128 | M15-T01, M15-T09 |
| no extra UI libraries; the stage is `<hb-viewer>` | D-130 | M15-T03 |
| renderer binding in ui-core; nothing below tier 3 touches the DOM | D-044, D-045 | M15-T02, M15-T03 |
| dyadic 1/1024 mm grid for free placement offsets | D-054 | M15-T02 |
| face picking on kernel, imported and BRep parts; checks read Part IR only | D-024, D-053, D-102 | M15-T08 |
| build hash and canonical JSON define parity between gesture and CLI | D-050, D-051 | M15-T07 |
| BLOCKS standard has no default; apply asks | D-087 (owner; default none until a print) | M15-T05 |
| stub, candidate and unproven archetypes are refused by the command | D-097 | M15-T04, M15-T05 |
| test scripts assert and exit non-zero; a test that did not run is reported as not run | D-153 | every card |
| a person looks at desktop and 390 px | D-154 | M15-T10 |
| pins re-dated at exit; counts derived; voice lint | D-040, D-010, D-004 | M15-T10 |

Detail on bench anatomy and the law lives in ../UI.md; command shapes,
transport mapping and the error contract in ../AGENT-SURFACE.md; archetype
definitions and arch.apply in ../CANONS.md; package boundaries in
../PACKAGES.md and ../ARCHITECTURE.md; test levels in ../TESTING.md. This
file holds what a builder runs.

## Evidence roots

| short | absolute path |
|---|---|
| v3 | `fab-knowledge:evidence/x/plan-to-refine/` |
| hbf | `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/` |
| x | `fab-knowledge:evidence/x/` |
| syn | `fab-knowledge:synthesis/` |
| corpus | `fab-work-directory:` |

Cards write evidence paths in full.

## Legacy sources and their hashes

The gesture has two shipped ancestors: BOSS placed parts on a scene with a
ghost, quarter turns and one undo entry per drop, and SKETCH carried the app
shell, the command palette and ranked snaps. Neither is ported as code; both
are read for behaviour, and lineage.json records them (D-156). Hashes are
sha256, measured 2026-10-04.

| source | what M15 takes from it | absolute path | sha256 |
|---|---|---|---|
| BOSS source archive | placement ghost, quarter turns, one undo per drop, R rotates, Escape cancels | fab-work-directory:benches/blocks/outputs/boss/boss-src.zip | 185c1d1bb6692945a3d2b956c7512ee7fd3b9766576396f404d2501a28ffa3b2 |
| BOSS `src/app2.js` (member of the archive) | lines 79 to 81 ghost and hud text "click to drop, R rotates, esc cancels"; line 88 ray from camera; line 110 `pushUndo()` once per drop; line 137 one undo on the first move of a drag | member `src/app2.js` of the archive above | 698ae1233dd66e1e041532ef16573b6fcf96f398d4d8358d6ce6d253a824dce8 |
| SKETCH v3 single file | FAB app shell reference, command palette on `/` or ctrl K, snap ranking (points, features, intersections, guides), undo as a snapshot per op | fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/designs/sketch/legacy/sketch.html | 39b5ebce5ce14ac50233f16f3875e5bbcf32136c8ba47fb1e28558243b8a98d5 |
| PIP bench core | commit, 320 ms schedule, HIST undo | fab-knowledge:evidence/x/pip-controller/bench/part2.js | e1cf608f117d655ca6e4e95e7075c2669b2e8a77767b1fd345a548c1e612496c |
| PIP bench input | pointer capture on the stage canvas (line 82) and on drive keys (line 373) | fab-knowledge:evidence/x/pip-controller/bench/part3.js | 594ee29b0c4ff173c0c656a818c4ea626b76c25b31e977d2e25bb20525253e24 |

One BOSS behaviour is not carried. Its ghost is a pink box (`0xfe0386` at
0.35 opacity, app2.js line 80). Under the pink budget of D-125 the placing
ghost is ink, and the view's one focal pink stays on the step's primary
action (M15-T03).

Other evidence the cards cite:

| evidence | absolute path and location |
|---|---|
| endgame order: command before gesture | fab-knowledge:evidence/x/plan-to-refine/PLAN.md lines 125 to 135, 500 to 504, 1006 |
| handoff command shape `archetype.apply` with face `{origin, normal, u}` | fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/spec/chase.ts line 220 |
| CLI and MCP surface, `arch_apply` writes branch, `part_probe` with `ray?` | fab-knowledge:synthesis/api-library-ai-design.md sections 5.1 and 5.2 |
| transport mapping (exit codes and HTTP statuses) | fab-knowledge:synthesis/api-library-ai-design.md section 6.2 |
| `Chase.applied` type | fab-knowledge:synthesis/api-library-ai-design.md line 1006 |
| `hbf://chase/<id>` resolves to the chase on the current branch | fab-knowledge:synthesis/api-library-ai-design.md section 7.1 |
| manifold `rayCast` distance is a fraction of the segment; `faceID` is a BigInt | fab-knowledge:research/code-cad-and-eda-tooling.md lines 164 to 175 |
| touch parity law: pinch zoom and two-finger pan, long press for the right button, 44 px targets | fab-knowledge:synthesis/aesthetic-voice-ux-bible.md section 10 |
| face editor handle set is mouse only (the cause of the touch law) | fab-knowledge:research/parametric-ux-prior-art.md lines 380, 484, 526 |
| type picker is a grid of rendered previews with nothing preselected | fab-knowledge:synthesis/aesthetic-voice-ux-bible.md section 9 |
| SKETCH plan target: incremental update under 16 ms for a 30 plate box | fab-knowledge:sources/benches/benches-robots-b.md section 4, Technology |

## Package placement

| package | tier | M15 adds | may import |
|---|---|---|---|
| ui-core | 3 | `gesture/faceFrame.ts` (frame math), `gesture/region.ts` (coplanar region and snap targets), `gesture/pick.ts` (ray from the viewer camera, hit on the displayed mesh), `gesture/placement.ts` (framework-free state machine), `bench/writeQueue.ts` (builds wait for pending writes) | spec, tiers 0 to 2, three 0.186.1 (pick.ts only) |
| apps/fab | app | canon panel, ghost overlay, input bindings (pointer, touch, keyboard, palette), question popover, undo bridge, hook verbs `project`, `placement`, `viewState` | ui, ui-core, the command client M12 ships |
| tools/smoke | tool | `gesture.spec.ts`, `gesture-touch.spec.ts`, `gesture-undo.spec.ts`, `gesture-brep.spec.ts` | @playwright/test 1.63.0 |
| core | app | `test/arch-apply-gesture.test.ts` (parity test); no source change | as M12 left it |

faceFrame.ts and region.ts import nothing from three or vue. pick.ts is the
one file that reads the three scene, through `<hb-viewer>` (D-130). The
tiers job holds these edges (D-044, D-045).

---

## M15-T01 Preflight: inputs, client, hook and probe

Goal: every input the gesture needs exists at the M12 and M14 exits, and
any gap is recorded as a blocker before code is written.

Inputs:
- core/src/commands/arch.apply.ts and core/test/arch-apply.test.ts (M06-T12)
- reference/conductors/blocks-stud-applied/ with expected/ (M06-T12)
- packages/archetypes, the status of each entry (M06-T07)
- apps/fab and the command client it uses (milestones/M12-app-mcp.md)
- core/src/mcp/tools (19 tools, D-107) and core/test/surface.test.ts
- the M14 LOCKET lid reference and its applied dome entry (milestones/M14-brep.md)
- the part.probe command (assigned to M02 in MILESTONES.md 1.3; argument `ray?` per D-107)

Steps:
1. Run the M06-T12 acceptance lines and the M14 exit lines on the M14 exit
   tag. Record pass or not run for each in `apps/fab/test/preflight.md`.
2. Confirm the FAB app reaches commands through one client used by every
   app view. Record the transport (HTTP through core/http, or in-process
   dispatch) and the call form for arch.apply, part.probe, chase.patch,
   part.build and check.run. The gesture uses this client and no other
   path. If the app calls a command any other way, that is a blocker for
   M12 and is named in the PR body.
3. Confirm `globalThis.BENCH` exists in the FAB app with the D-128 members
   (`ready`, `state`, `rev`, `built`, `busy`, `buildHash`, `settled()`,
   `commit`, `verbs`). If M12 did not install it, install it with ui-core
   `installHook` (M09-T11) in `apps/fab/src/hook.ts`.
4. Call `part.probe` with a ray on reference/conductors/blocks-stud-applied
   from `[0, 0, 50]` to `[0, 0, -50]`. Record which output fields exist. The
   gesture needs: hit point in part coordinates (mm), the hit triangle's
   unit normal, the part id, the body id, and the triangle index. manifold
   `rayCast` returns distance as a fraction of the segment length, so the
   hit point is origin plus fraction times segment; `faceID` is a BigInt
   and is carried as a decimal string in JSON. If any field is missing,
   add it as an optional output field of part.probe with a contract test.
   Optional output fields leave the frozen tool name and its required
   arguments unchanged (D-113 freezes names).
5. Record the top face z of the blocks-stud-applied prism as the Part IR
   reports it. M06-T12 typed `9.6`; if the mesh route snaps vertices to the
   D-054 grid the face sits at 9.599609375 mm (computed). Every test in
   this milestone reads the face from the Part IR, never from this file.

Files to create:
- apps/fab/test/preflight.md (result table, regenerated by the test, never typed)
- apps/fab/src/hook.ts (only when step 3 finds no hook)
- core/test/probe-ray.test.ts

Acceptance:
- `npm test -w core -- arch-apply` exits 0 (M06-T12 still green).
- `npm test -w core -- probe-ray` exits 0: the vertical ray hits the top
  face at the Part IR z within 1e-9 mm (computed), normal `[0, 0, 1]`,
  part id `body`, `faceID` a decimal string.
- `npm test -w core -- surface` exits 0 with 30 commands and 19 MCP tools.

Done when: the preflight table shows every input present, or the PR body
names the missing one as a blocker.

## M15-T02 Face frame and snap targets in ui-core

Goal: a hit on a face turns into the `FaceFrame` the command takes, with
exact values on axis-aligned faces and stable canonical JSON everywhere.

Inputs:
- spec/chase.ts (`AppliedArchetype`, face `{origin, normal, u}`)
- spec/ids.ts (`Vec3`)
- D-054 (dyadic 1/1024 mm), D-051 (RFC 8785 canonical JSON)
- BOSS `src/app2.js` lines 129, 147 (quarter turns, `rot + 1`)
- SKETCH v3 inference engine (snap ranking), sketch.html above

Steps:
1. `region.ts`: from the hit triangle, flood-fill neighbouring triangles
   whose unit normals equal the hit normal within 1e-6 per component and
   whose planes lie within 1e-6 mm of the hit plane (both tolerances
   chosen here, inferred; recorded in the module doc comment). Return the
   region's triangles, its bbox in the face basis, and its centre.
2. The face basis: `u0` is part +X projected onto the plane, or part +Y
   when the normal is within 1e-9 of the X axis; `v0 = n x u0`. The region
   centre is the bbox centre in that basis, computed from mesh vertices and
   kept as computed.
3. Snap targets in the face basis, in rank order: region centre, the four
   bbox edge midpoints. A target within 12 px of the pointer on screen
   wins (12 px chosen here, inferred; a person tunes it at M15-T10 and the
   value moves with a note in the PR). With no target in range the
   in-plane offsets round to 1/1024 mm, so the origin stays on the plane
   and its text form is short and exact (D-054).
4. `faceFrame.ts` carries the reference implementation below. Quarter
   turns rotate u about n by the exact four-element cycle `u0, v0, -u0,
   -v0`, so axis-aligned faces never pick up rounding. Adding 0 to each
   component turns -0 into 0 so the canonical JSON of a frame is stable.
5. Property tests with fast-check 4.10.2 (seeded, path replay on failure):
   for random planar faces, `|n| = 1`, `|u| = 1`, `n . u = 0` within 1e-12
   (computed), and the origin lies on the face plane within 1e-9 mm.

Reference implementation (type-checked 2026-10-04 with
`npx -y -p typescript@7.0.2 tsc` under strict, noUncheckedIndexedAccess and
exactOptionalPropertyTypes; exit 0):

```ts
/** A point or direction in part coordinates, millimetres for points. */
export type Vec3 = readonly [number, number, number];

/** The face an archetype lands on: origin in mm, unit normal, unit in-plane u axis. */
export interface FaceFrame {
  origin: Vec3;
  normal: Vec3;
  u: Vec3;
}

/** Quarter turns of u about the normal, counted counterclockwise seen from outside. */
export type QuarterTurns = 0 | 1 | 2 | 3;

const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
/** Adding 0 turns -0 into 0 so canonical JSON (RFC 8785) of a frame is stable. */
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k + 0, a[1] * k + 0, a[2] * k + 0];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const unit = (a: Vec3): Vec3 => scale(a, 1 / Math.hypot(a[0], a[1], a[2]));

/** 1/1024 mm, the dyadic grid of D-054; values on it are exact in float64. */
export const DYADIC = 1 / 1024;
export const toDyadic = (x: number): number => Math.round(x / DYADIC) * DYADIC;

/**
 * u before turns: part +X projected onto the face plane, or part +Y when the
 * normal lies within 1e-9 of the X axis. Axis-aligned faces give exact 0 and 1.
 */
export function baseU(normal: Vec3): Vec3 {
  const x: Vec3 = [1, 0, 0];
  const y: Vec3 = [0, 1, 0];
  const pick = Math.abs(dot(normal, x)) > 1 - 1e-9 ? y : x;
  return unit(sub(pick, scale(normal, dot(pick, normal))));
}

/** Rotates u by k quarter turns about n using the exact four-element cycle. */
export function turnU(normal: Vec3, u0: Vec3, k: QuarterTurns): Vec3 {
  const v0 = cross(normal, u0);
  const cycle: readonly [Vec3, Vec3, Vec3, Vec3] = [u0, v0, scale(u0, -1), scale(v0, -1)];
  return cycle[k];
}

/** In-plane offset from the region centre along u0 and v0 = n x u0, in mm. */
export interface PlaneOffset {
  s: number;
  t: number;
}

/**
 * Builds the frame written into chase.applied. `centre` is the bbox centre
 * of the coplanar region, computed from mesh vertices and kept as computed.
 * `offset` is the hit point measured in the plane; a snap target replaces it
 * with an exact offset (0, 0 for the centre, a half extent for an edge
 * midpoint), and a free offset is rounded to the dyadic grid, so the origin
 * stays on the face plane.
 */
export function faceFrame(centre: Vec3, normal: Vec3, offset: PlaneOffset, k: QuarterTurns, snapped: boolean): FaceFrame {
  const n = unit(normal);
  const u0 = baseU(n);
  const v0 = cross(n, u0);
  const s = snapped ? offset.s : toDyadic(offset.s);
  const t = snapped ? offset.t : toDyadic(offset.t);
  const origin = add(centre, add(scale(u0, s), scale(v0, t)));
  return { origin, normal: n, u: turnU(n, u0, k) };
}
```

Computed with node v22.12.0 on 2026-10-04 from the code above:

| call | result |
|---|---|
| centre `[0, 0, 9.6]`, normal `[0, 0, 1]`, offset `(0, 0)`, k 0, snapped | origin `[0, 0, 9.6]`, normal `[0, 0, 1]`, u `[1, 0, 0]` (the M06-T12 CLI face) |
| same, k 3 | u `[0, -1, 0]` |
| centre `[0, 0, 9.6]`, offset `(3.30001, -1.2)`, k 2, free | origin `[3.2998046875, -1.2001953125, 9.6]`, u `[-1, 0, 0]` |

Files to create:
- packages/ui-core/src/gesture/faceFrame.ts
- packages/ui-core/src/gesture/region.ts
- packages/ui-core/src/gesture/faceFrame.test.ts
- packages/ui-core/src/gesture/region.test.ts

Acceptance:
- `npm test -w packages/ui-core -- gesture` exits 0 with the three table
  rows above as cases and the step 5 properties over 1000 seeded runs.
- On the blocks-stud-applied mesh, the region of a hit at `(5, 3)` on the
  top face is the whole top face; its centre equals `[0, 0, z_top]` with
  z_top read from the Part IR; its bbox is 32 x 24 mm (computed from the
  M06-T12 prism).
- `node tools/tiers.mjs` exits 0: faceFrame.ts and region.ts import no
  three and no vue.

Done when: the frame for a face is a pure function of the hit, the region
and the turn count, with tests pinning the axis-aligned values.

## M15-T03 Pick and ghost on the stage

Goal: while an archetype is armed, the face under the pointer is
highlighted and an ink ghost shows origin and u, with no write and no
build.

Inputs:
- packages/ui-core `<hb-viewer>` and its three binding (M09-T06)
- packages/ui-core/src/gesture/ (M15-T02)
- BOSS `src/app2.js` lines 79 to 91 (ghost, ray from camera, hud text)
- fab-knowledge:synthesis/aesthetic-voice-ux-bible.md sections 5 and 9 (tokens, pink budget)

Steps:
1. `pick.ts`: `pickFace(viewer, clientX, clientY)` builds a ray from the
   viewer camera through the pointer and intersects the meshes of the
   current build (the `hbf://mesh/<hash>` the viewer shows). It returns
   the part id, body id, triangle index, hit point and normal, or null.
   Picks run at most once per animation frame; a pointermove between
   frames replaces the pending one.
2. Ghost overlay in apps/fab: the coplanar region tinted with
   `--hb-ink` at low alpha, a cross at the candidate origin, a u arrow and
   a v tick, all in ink tokens; labels on the void stage use
   `--hb-lit-label` (D-118). The ghost adds no pink; the smoke pink count
   stays at one during a drag (D-125).
3. Hud line, lowercase, voice-linted: `placing <archetype id> on <part>,
   <snap name or free>: drop to apply, r turns, esc cancels`. On touch the
   hud shows buttons `turn` and `cancel` instead of key names.
4. Measure the pick handler on the largest mesh among the M10 designs (the
   test finds it by triangle count). Record median and 95th percentile in
   the test output as measured with the machine name. The target is under
   16 ms, the SKETCH plan target for one incremental update (inferred as a
   frame budget). Over target, the card records the number and the PR
   names it; no BVH dependency enters without a decision.
5. The ghost frees its three geometries and materials on cancel, on drop
   and on unmount; the viewer live count returns to its value before
   arming (D-055 ownership, as M09-T06 counts it).

Files to create:
- packages/ui-core/src/gesture/pick.ts
- packages/ui-core/src/gesture/pick.test.ts
- apps/fab/src/gesture/Ghost.vue
- apps/fab/src/gesture/ghost.ts

Acceptance:
- `npm test -w packages/ui-core -- pick` exits 0: with a fixed camera
  looking down on blocks-stud-applied, a pointer at the screen projection
  of `[5, 3, z_top]` returns the top face with normal `[0, 0, 1]`; a
  pointer off the part returns null.
- `npx playwright test tools/smoke/gesture.spec.ts -g ghost` exits 0:
  arming and moving across the stage changes `BENCH.rev` by 0, starts 0
  builds and 0 command calls that write (the client call log shows only
  reads), keeps the pink count at 1, and after cancel the viewer live
  count equals its pre-arm value.

Done when: a person sees which face and which spot the archetype will land
on before letting go, and nothing has been written.

## M15-T04 Canon panel and arming

Goal: proven archetypes appear as rendered preview cards in the FAB app,
and a card can be armed by drag, tap or the command palette.

Inputs:
- arch.find through the app's command client (M06-T11; MCP `canon_search`)
- packages/archetypes status values (M06-T07: proven, stub, candidate, unproven)
- view.render artifacts for card previews (M00 assignment, MILESTONES.md 1.3)
- SKETCH v3 shell: rail 336, tray 210, palette on `/` or ctrl K (sketch.html above)
- fab-knowledge:synthesis/aesthetic-voice-ux-bible.md sections 9 and 10

Steps:
1. Canon panel in the FAB rail: a grid of preview cards from `arch.find`,
   one line per card (id and family), nothing preselected (bible section
   9, type picker law). Entries whose status is not proven are listed in a
   collapsed `not placeable` group with their status; they cannot be
   armed. arch.apply also refuses them with E_REF (M06-T12), and T05 tests
   that refusal through the gesture path by forcing an arm in a test
   build.
2. Previews come from `view.render` of each archetype's reference
   (`hbf://artifact/<hash>` PNGs), cached by hash; a missing reference shows
   the id only and logs it. Card previews are not part of any bake.
3. Arming paths:
   - mouse: pointerdown on a card, drag past 4 px (chosen here, inferred)
     with pointer capture, then over the stage the placement state takes
     over (BOSS drag, PIP pointer capture);
   - touch: tap a card to arm it; the card shows the on-state chip ink
     fill (D-125); a second tap or `cancel` disarms;
   - keyboard: the command palette entry `apply archetype` lists proven
     ids; choosing one arms it and the stage takes focus.
4. `placement.ts` state machine in ui-core: `idle -> armed -> over-face ->
   asking -> writing -> idle`, with `cancel` from every state before
   `writing`. Escape, a tap on `cancel`, or releasing over no face returns
   to idle with no command call.
5. All targets at least 44 px on touch (bible section 10); the panel
   collapses into the drawer under 640 px as the rail does.

Files to create:
- apps/fab/src/canon/CanonPanel.vue
- apps/fab/src/canon/cards.ts
- packages/ui-core/src/gesture/placement.ts
- packages/ui-core/src/gesture/placement.test.ts
- apps/fab/src/palette/applyArchetype.ts

Acceptance:
- `npm test -w packages/ui-core -- placement` exits 0: every transition in
  step 4 is covered; no path from `armed` reaches `writing` without a
  face.
- `npx playwright test tools/smoke/gesture.spec.ts -g arm` exits 0: the
  card count equals the proven count from `npx --no-install hbf arch.find --json`
  (read at test time, never typed); a stub entry has no draggable card;
  the palette arms `blocks-stud`.

Done when: every proven archetype can be picked up three ways and none of
the others can.

## M15-T05 Drop calls arch.apply

Goal: releasing an armed archetype over a face calls arch.apply once
through the app's command client with the face frame of the drop, and the
command's answers (written, question, refusal) appear where the person
dropped.

Inputs:
- core/src/commands/arch.apply.ts (M06-T12), the app's command client (M15-T01)
- part.probe with `ray` (M15-T01)
- fab-knowledge:synthesis/api-library-ai-design.md section 6.2 (transport mapping)
- D-087 (BLOCKS standard: no default), D-111 (loop detection), D-133 (typed questions)

Steps:
1. On release over a face, call `part.probe` with the same ray the last
   pick used. The probe result is authoritative: the frame is rebuilt from
   the probe's hit, normal and triangle with the snap state of the last
   pick. If the probe and the pick name different triangles, the probe
   wins and the client log records both.
2. Call `arch.apply {part, face, id, params?}` once. `params` holds only
   what the person chose in a question (step 3). The UI adds no defaults
   of its own.
3. Typed question: when the command returns a question (exit 2 on the
   CLI, HTTP 422 per api-library-ai-design.md 6.2), show one flat popover
   at the drop point with the options the question lists, rendered as
   choices from its legal values (D-125, D-133). blocks-stud asks for
   `standard` with `boss-v1` and `blocks-html`, since D-087's default is
   none until a print. Choosing calls arch.apply again with that param.
   Dismissing writes nothing.
4. Refusals map to a status row naming the code and the command's own
   message, and the stage stays as it was: E_REF (unknown, stub,
   candidate or unproven id, with `didYouMean` when present), E_STALE (the
   anchor did not match once; the app reloads `hbf://chase/<id>` and
   says so), E_KERNEL, E_REPEAT (D-111: the same command and inputsHash
   three times in 30 minutes on this workspace and branch; the row names
   the diagnostics record the command returns). The gesture does not
   retry and does not alter inputs to dodge the counter. See the gaps
   section for what this means for a person.
5. On a written result, one ui-core commit (kind `commit`, M09-T03) whose
   state change is the new `applied` list read back from
   `hbf://chase/<id>`. That commit bumps rev by 1, takes one undo
   snapshot 450 ms later and schedules the rebuild 320 ms later (M09
   values). The emitted feature ids from the result are stored for locate
   (M15-T07).
6. Every client call in this card goes to `.hbf/calls.jsonl` through the
   command layer as any transport's calls do; the app keeps no second log.

Files to create:
- apps/fab/src/gesture/drop.ts
- apps/fab/src/gesture/QuestionPopover.vue
- apps/fab/src/gesture/drop.test.ts
- tools/smoke/gesture.spec.ts (cases `drop`, `question`, `refuse`, `repeat`)

Acceptance:
- `npx playwright test tools/smoke/gesture.spec.ts -g drop` exits 0 on
  reference/conductors/blocks-stud-applied opened in the FAB app: dragging
  `blocks-stud` to the screen projection of the top face centre (found
  with `BENCH.verbs.project([0, 0, z_top])`) shows the `standard`
  question; choosing `boss-v1` leaves exactly one entry in
  `chase.applied` on branch `hbf/blocks-stud-applied` with face origin
  `[0, 0, z_top]`, normal `[0, 0, 1]`, u `[1, 0, 0]`; `BENCH.rev` rose by
  exactly 1; the client log shows 1 part.probe and 2 arch.apply calls (the
  question, then the write).
- `-g question` exits 0: dismissing the popover leaves `chase.ts`
  byte-identical (sha256 before equals after) and `BENCH.rev` unchanged.
- `-g refuse` exits 0: a forced arm of a stub id produces an E_REF row,
  zero writes, and `chase.ts` byte-identical.
- `-g repeat` exits 0 and records the observed behaviour of D-111 as
  written: drop, undo, drop, undo, drop at one spot within 30 minutes.
  Each drop on blocks-stud makes two calls (the question call without
  `standard`, then the write), so the third question call is the third
  identical inputsHash and returns E_REPEAT; the stage and `chase.ts`
  stay as the second undo left them. The case also passes the `standard`
  in a test-only arm to record whether the third write call alone trips
  the counter, and prints both outcomes.

Done when: a drop produces the same call an agent would make, and every
answer the command gives is shown where the person is looking.

## M15-T06 Undo and redo are one commit each

Goal: one undo after a drop restores the chase file byte-for-byte and the
previous build; one redo restores the dropped state; neither calls
arch.apply.

Inputs:
- packages/ui-core/src/bench/core.ts and undo.ts (M09-T03: snapshot 450 ms after the last commit, 80 deep, identical snapshots skipped)
- chase.patch with JSON pointer edits (M10; example `--pointer /params/1/fields/0/item/3/default --set 1.44` in api-library-ai-design.md section 8.6)
- D-115, D-119 (verbs at the right end of the guide strip; owner default in force)

Steps:
1. `writeQueue.ts` in ui-core: writes run one at a time; the build
   scheduled by a commit waits until the queue is empty, so a build never
   reads a chase that a pending write is about to change.
2. Undo bridge in apps/fab: after `undo()` or `redo()` restores a
   snapshot, compare its `applied` with the current branch value. When
   they differ, enqueue one `chase.patch` that sets `/applied` to the
   snapshot value, or removes the key when the snapshot has none, so the
   file returns to its exact earlier bytes. If chase.patch has no remove
   form, that is a blocker named in the PR (see gaps); the card does not
   write an empty array in its place.
3. Stale branch: before an undo or redo write, read `hbf://chase/<id>` and
   compare its defHash with the one the app last wrote or read. When they
   differ (an agent or the CLI changed the branch), the app writes
   nothing, shows `the chase changed on the branch since your last edit;
   reloaded`, reloads, and clears the undo stack.
4. Hover, drag, turning and the question popover never call `commit`;
   only a written drop, an undo and a redo do.
5. Undo and redo stay where D-119's default puts them; keyboard ctrl Z and
   ctrl shift Z reach the same functions.

Files to create:
- packages/ui-core/src/bench/writeQueue.ts
- packages/ui-core/src/bench/writeQueue.test.ts
- apps/fab/src/gesture/undoBridge.ts
- tools/smoke/gesture-undo.spec.ts

Acceptance:
- `npm test -w packages/ui-core -- writeQueue` exits 0: a commit during a
  pending write starts its build after the write resolves; two writes run
  in order.
- `npx playwright test tools/smoke/gesture-undo.spec.ts` exits 0 on
  blocks-stud-applied:
  - record sha256 of `chase.ts` (A) and `BENCH.buildHash` (H0); drop
    blocks-stud at the top face centre with `boss-v1`; after
    `BENCH.settled()` record sha256 (B) and buildHash (H1);
  - one undo: sha256 equals A, `BENCH.buildHash` equals H0 after settle,
    `BENCH.rev` rose by 1, the undo stack shrank by 1;
  - one redo: sha256 equals B, buildHash equals H1;
  - the client log for the undo and the redo shows chase.patch calls only,
    no arch.apply;
  - a branch edit made with `npx --no-install hbf chase.patch` between the drop and the
    undo makes the undo write nothing and show the reload row.

Done when: one press of undo takes the design back to exactly where it was
before the drop.

## M15-T07 Checks re-run, and the gesture equals the CLI

Goal: after a drop the build and the checks run as for any commit, and
the written chase, build hash and report hash equal those of the CLI path
for the same face.

Inputs:
- reference/conductors/blocks-stud-applied and its M06-T12 baseline (selected check ids and versions per standard)
- part.build and check.run through the app's command client; the `next` calls arch.apply returns (`part.build`, `check.run`)
- packages/ui-core/src/bench/locate.ts (M09-T05)
- D-050, D-051 (build hash over canonical BuildInputs), D-064 (CheckResult fields)

Steps:
1. The bench core's `build` function in the FAB app runs `part.build`
   then `check.run` through the client, as M12 wired it. The drop's commit
   triggers it through the 320 ms schedule. The gesture adds no build call
   of its own.
2. The checks panel lists the new results; each row carries measured,
   legal, constraint and origin (D-064); rows targeting emitted features
   are locatable (M09-T05) and clicking one frames the applied feature.
3. Parity test `core/test/arch-apply-gesture.test.ts`: create two
   scratch worktrees of the repo at HEAD. In worktree G, run the Playwright
   drop of M15-T05 and read back the written face. In worktree C, run
   `npx --no-install hbf arch.apply --part body --face '<that face as JSON>' --id
   blocks-stud --params standard=boss-v1 --json`, then `npx --no-install hbf part.build`
   and `npx --no-install hbf check.run` on the reference. Compare.
4. Repeat step 3 for `standard=blocks-html` and for a free drop at an
   offset that rounds to the dyadic grid (the test picks the screen point
   and reads the face back).
5. Off-face drop, recorded without assertion on verdicts: drop
   blocks-stud with its origin on a bbox edge midpoint of the top face, so
   part of the stud overhangs. Record which checks select and what each
   returns in the test output. No check is named in a decision for an
   applied footprint leaving its face; the result goes to the gaps list in
   the PR.

Files to create:
- core/test/arch-apply-gesture.test.ts
- tools/smoke/gesture.spec.ts (case `checks`)

Acceptance:
- `npm test -w core -- arch-apply-gesture` exits 0 for both standards and
  the free drop: sha256 of `chase.ts` equal between G and C; buildHash
  equal; reportHash equal.
- The selected check ids and versions in G equal the M06-T12 baseline for
  the same standard.
- `npx playwright test tools/smoke/gesture.spec.ts -g checks` exits 0:
  after the drop `BENCH.settled()` resolves with `built === rev`; the
  checks panel row count equals the result count of `npx --no-install hbf check.run
  --json` on worktree C; clicking a row whose target is an emitted
  feature makes `BENCH.verbs.viewState().focus` contain that feature id.
- `git diff --stat <M14 exit tag>..HEAD -- packages/checks/src
  packages/archetypes/src` in this card's PR is empty.

Done when: nothing downstream can tell whether a stud was placed by a
person with a mouse or by a model with a command.

## M15-T08 Imported and BRep parts

Goal: the gesture places an archetype on a part that the kernel did not
build, with the same parity as the kernel-built prism.

Inputs:
- the M14 LOCKET reference: STEP body on the `brep` route, the dome applied to its lid face by command, and its expected/ (milestones/M14-brep.md)
- D-024 (BRep route opt-in, lazy, never in the default bake; checks read Part IR only), D-053 (MeshRoute `imported`, `brep`), D-102 (imported meshes checked for winding)

Steps:
1. Open the M14 LOCKET reference in the FAB app. The replicad route loads
   lazily as M14 set it; the pick runs on the tessellated mesh the Part IR
   carries, as for any route.
2. Drag the dome archetype M14 used onto the lid face at the centre snap.
   The written face must equal the face M14's command call used; when the
   M14 face was typed by hand and is not a snap target, the test drops at
   the snap nearest to it and runs the CLI comparison with the face the
   gesture wrote, as M15-T07 does.
3. Normals come from triangle winding. An imported mesh with inverted
   winding fails the D-102 winding check before a pick; the gesture shows
   that finding and does not pick on that part.
4. Run the M15-T07 parity test on this reference.

Files to create:
- tools/smoke/gesture-brep.spec.ts
- core/test/arch-apply-gesture.test.ts (case `locket-lid`)

Acceptance:
- `npx playwright test tools/smoke/gesture-brep.spec.ts` exits 0: one
  `chase.applied` entry on the LOCKET branch, part id and archetype id
  equal to M14's.
- `npm test -w core -- arch-apply-gesture -t locket-lid` exits 0: chase
  sha256, buildHash and reportHash equal between gesture and CLI.
- The default bake of any M10 design still contains no replicad bytes
  (the M14 check reruns green).

Done when: a dome dragged onto a STEP lid lands as the command lands it.

## M15-T09 Touch, keyboard and the law

Goal: the whole gesture completes by touch only at 390 px and by keyboard
only at desktop, with the bench law intact.

Inputs:
- tools/smoke suite from M09-T14 (overflow, pink budget, touch-only project, DOM voice lint)
- fab-knowledge:synthesis/aesthetic-voice-ux-bible.md section 10 (touch parity, 44 px targets)

Steps:
1. Touch path: tap card, tap a face (places the ghost), adjust with a
   one-finger drag on the stage that moves the ghost, two-finger pinch and
   pan that move the camera, `turn` button for quarter turns, `place`
   button that drops. Long press on the stage opens the context the right
   button gives on desktop (turn, cancel). The `place` button is the only
   control that writes.
2. Keyboard path: palette arms; arrow keys step the origin between snap
   targets; `r` turns; Enter drops at the current target; Escape cancels.
3. Hook verbs for tests (design extras per D-128): `project(p)` returns
   the screen point of a part-space point; `placement()` returns the state
   machine state, armed id, face frame candidate and snap name;
   `viewState()` as M09-T05 defined it.
4. Smoke at 390, 768 and 1280 px during an armed drag and with the
   question popover open: no horizontal scroll, one focal pink, rendered
   DOM text passes lint-voice (D-004).

Files to create:
- tools/smoke/gesture-touch.spec.ts
- apps/fab/src/gesture/keys.ts
- apps/fab/src/gesture/touch.ts

Acceptance:
- `npx playwright test tools/smoke/gesture-touch.spec.ts` exits 0 in the
  `hasTouch: true` project at 390 x 844: the touch path of step 1
  produces the same `chase.applied` entry as the mouse drop of M15-T05
  (canonical JSON equal), and one undo by the touch verb control restores
  the chase sha256.
- `npx playwright test tools/smoke/gesture.spec.ts -g keyboard` exits 0:
  the keyboard path produces the same entry.
- The smoke overflow, pink and voice cases pass with the placement state
  armed and with the popover open.

Done when: a person on a phone at the printer can place, turn, undo and
redo without a mouse.

## M15-T10 Exit housekeeping

Goal: M15 closes green under the Part 3 rules of MILESTONES.md.

Inputs:
- ../MILESTONES.md Part 3
- tools/counts.mjs, tools/tiers.json, tools/lint-voice.mjs

Steps:
1. Run the full CI set: house-rules, typecheck, derived, tiers, seed,
   unit, property, contract, parity, determinism, corpus, browser.
2. Surface test: 30 commands, 19 MCP tools, names and order unchanged
   from M12 (D-106, D-107, D-113).
3. Re-date the D-040 pin table. M15 adds no dependency, so the re-date is
   a check of the pins in force.
4. Regenerate counts, CLI.md, llms.txt and the reference INDEX (D-010).
5. Visual review (D-154): no reference meshHash moves in M15; a person
   still looks at the ghost, the question popover and the placed stud at
   desktop and 390 px in a real browser, tunes the 12 px snap radius and
   the 4 px drag threshold if needed, and ticks "I looked at the renders".
6. PR body lists: working names (hbf, CHASE, STYLUS, archetypes) per
   D-012; owner questions touched with defaults in force (D-087, D-119,
   D-120); the gaps below; every acceptance line that was not run; the
   measured pick timings of M15-T03 with the machine; the off-face record
   of M15-T07. Commit and push happen when the owner asks (D-006).

Files to create:
- none; results go in the PR body against the Exit table

Acceptance:
- Every CI job green on the PR.
- `node tools/lint-voice.mjs` exits 0.
- `node tools/counts.mjs && git status --porcelain` prints nothing.
- `npm test -w core -- surface` exits 0.

Done when: the owner can ask for the M15 merge with every exit row below
proven by a green job.

---

## Exit

| exit number | qualifier | card | command |
|---|---|---|---|
| drop onto a face calls arch.apply once per write and writes one `chase.applied` entry on `hbf/<chase>` | n/a | M15-T05 | `npx playwright test tools/smoke/gesture.spec.ts -g drop` |
| the written face equals the M06-T12 CLI face at the top face centre (origin `[0, 0, z_top]`, normal `[0, 0, 1]`, u `[1, 0, 0]`) | computed, z_top from the Part IR | M15-T02, M15-T05 | same, and `npm test -w packages/ui-core -- gesture` |
| hover, drag, turn and question change rev by 0 and write nothing | n/a | M15-T03, M15-T05 | `npx playwright test tools/smoke/gesture.spec.ts -g ghost`, `-g question` |
| undo is one commit and restores `chase.ts` sha256 and the build hash; redo restores the dropped state; neither calls arch.apply | n/a | M15-T06 | `npx playwright test tools/smoke/gesture-undo.spec.ts` |
| checks re-run after the drop; chase sha256, buildHash and reportHash equal the CLI path for both BLOCKS standards and a free drop | n/a | M15-T07 | `npm test -w core -- arch-apply-gesture` |
| selected check ids and versions equal the M06-T12 baseline; no check or archetype code changed | n/a | M15-T07 | same, and the `git diff --stat` line |
| LOCKET lid on the BRep route: same parity | n/a | M15-T08 | `npm test -w core -- arch-apply-gesture -t locket-lid` |
| touch-only at 390 and keyboard-only paths produce the same entry; no overflow at 390, 768, 1280; one focal pink | n/a | M15-T09 | `npx playwright test tools/smoke/gesture-touch.spec.ts` |
| pick handler timing recorded against the 16 ms target | measured, machine named in the output | M15-T03 | `npm test -w packages/ui-core -- pick` |
| 30 commands and 19 MCP tools, unchanged | n/a | M15-T10 | `npm test -w core -- surface` |
| CI green incl. house-rules, derived, tiers, browser | n/a | M15-T10 | CI |

## Blockers and owner questions

| item | state | default in force |
|---|---|---|
| BLOCKS canonical standard | D-087 owner | none until a print; the drop asks for `standard` |
| header verbs | D-119 owner | undo and redo at the right end of the guide strip |
| shell family | D-120 owner | one system, paper shell for the FAB app views |
| FAB app command client and launch command | defined by M12, named in no decision | M15-T01 records what M12 shipped; the gesture uses that client |
| part.probe `ray` output fields | D-107 lists the argument; no decision lists the output | M15-T01 adds optional output fields with a contract test |
| dome archetype id and LOCKET lid face | defined by M14 | M15-T08 reads them from the M14 reference |

## Gaps found while writing

| gap | evidence | what this file does until a decision exists |
|---|---|---|
| D-111 counts a person's drops. Drop, undo, drop, undo, drop at one spot within 30 minutes returns E_REPEAT on the third identical arch.apply call (the question call of the third drop for blocks-stud); alternating undo and redo three times can do the same on chase.patch. No decision exempts the HTTP transport or a person at the app. | D-111 wording; api-library-ai-design.md section 6.6 code (key is command plus inputsHash per workspace and branch) | applies D-111 as written and tests the behaviour (M15-T05 `-g repeat`) |
| chase.patch has a set form for JSON pointers; no decision names a remove form. A byte-identical undo of the first applied entry needs the `applied` key removed. | api-library-ai-design.md section 8.6 shows `--pointer ... --set` only | M15-T06 treats a missing remove form as a blocker rather than writing `applied: []` |
| No check is named for an applied archetype whose features leave the face (overhang past an edge, a curved face). FaceFrame is planar. | D-064, D-065, CHECKS.md families; M06-T12 covers the centred case only | M15-T07 records what the existing checks return for an edge-midpoint drop |
| M06-T12 typed the face origin as z 9.6. If the prism route snaps vertices to the D-054 grid, the face sits at 9.599609375 mm (computed). | M06-T12 acceptance line; D-054 | tests read z from the Part IR; M15-T01 records which value the route emits |
| The snap radius (12 px), drag threshold (4 px) and coplanar tolerances (1e-6) are chosen in this file. | no source sets them | marked inferred; a person tunes them at M15-T10 and the PR records any change |
| BOSS drew its placing ghost in pink; the pink budget forbids a second pink. | BOSS app2.js line 80; D-125 | the ghost is ink |

## Hands off to

M16 turns check origins into knowledge records; any check admitted to cover
the off-face gap above cites the M15-T07 record as its failure origin. The
gesture adds nothing to the agent surface, so the M12 evals and the D-113
name freeze stand as they are.

Decides: D-004, D-006, D-007, D-010, D-012, D-013, D-014, D-024, D-040, D-044, D-045, D-050, D-051, D-053, D-054, D-055, D-064, D-087, D-097, D-102, D-106, D-107, D-111, D-113, D-114, D-115, D-118, D-119, D-120, D-123, D-125, D-128, D-130, D-132, D-133, D-153, D-154, D-156, D-157, D-164
