# PIP

PIP, the printed game controller (`knowledge/designs/pip.md`), as a chase:
flex cone, click spring and touch comb keys or a tilt stick in a PETG body,
an RP2040-Zero pressed onto conductive bumps, and two buried conductive PLA
trace layers routed between them. The harvested original stays in
`legacy/`. Every number below is computed from the build and the profile
rows unless it says otherwise. Nothing here has been printed, and no person
has looked at the build yet.

| file | holds |
|---|---|
| `chase.ts` | params, presets (worked example, stick example, blank), four slots, the hookup |
| `build.ts` | the layout, the archetypes at one host top, the route, the buried stack, the bezel; the drive pad `contact` |
| `migrate/legacy.ts` | a legacy PIP save mapped onto chase params |
| `queries.json`, `expected/` | parity goldens at SOURCE_DATE_EPOCH 315532800 for the chase defaults, with the edit `/clickCap` 10 to 11 and a circuit.solve golden |
| `test/chase.test.ts` | the chase through packages/chase, the legacy saves, the defaults against `layout.js` defaults() |
| `test/build.test.ts`, `test/golden/` | build.ts in process: the layout against the original's own record, the route against copper's route of PIP's route input, the contact function, every worked example metric against `worked-metrics.json` (rewritten only with HBF_ACCEPT_METRICS=1) |

## The chase

`chase.ts` declares PIP as a single-kind chase (release 1; the composer
binding of M10-T13 is engine work). Its param groups follow the legacy
steps: LAYOUT (body, then the left cluster, face keys, menu keys and top
l / r as four fixed groups), BUTTONS (flex cone, click spring, touch comb,
stick), BOARD (mount, bezel) and PRINT (routing, plate). Rows, ranges and
steps are the haft (9) bench `part1.html` and `part3.js` renderGroups, and
defaults its `src/layout.js` defaults() (the canonical lineage rows
pip.bench-part1, pip.bench-part3 and pip.layout). Presets: the worked
example and the stick example, which are the two pip-controller saves, and
blank.

What the chase leaves to profile and catalog rows: the buried stack
(stack.skin, stack.trace, stack.iso, stack.overL2, D-085), the trace width
(stack.traceWidth), bleed (0, D-084), the petg modulus, the cpla and ctpu
resistivity rows (500 along and 2000 through, 400; inferred, D-081), the
rp2040 pin capacitance and leakage, and the RP2040-Zero board dimensions.
The hookup reads keys by charge-release with the 3500 us wait and touch
pads with 1500 us, waitSource default, until a coupon calibrates them
(D-079, inferred). pip.ino in pip-controller still ships a 200 us key wait
(D-080); this repository never edits pip-controller.

`npx --no-install hbf chase.validate designs/pip --json` exits 0 with 0
errors and lists Q-TIER for the cPLA and cTPU slots with the inferred rows
as the default.

`migrate/legacy.ts` reads a legacy PIP save (`{app: "pip-bench", v: 1,
state}` or a bare state) into a design document for share links with no
version prefix (D-167), and `legacyParams` maps the save onto chase params,
routing every legacy key to a chase field or to the row the chase reads in
its place; a key with no route is listed as unknown. The example saves it
loads are copied under `test/fixtures/legacy/` with `SHA256SUMS` (M10-T03).

## How it builds

The order is the original's layout() then model() (haft-src `layout.js`
lines 61 to 78 and 163 to 421, `model.js` lines 29 to 50 and 301 to 319;
lineage rows pip.layout/haft-9-designs-pip-build and
pip.model/haft-9-designs-pip-build):

1. The outline: a stadium (the hull of two 96 point circles, PIP's own
   half step circle), a slab (rounded rectangle) or grips (the stadium
   and two lobes).
2. The buttons of each group at the group's x, y and pitch, as layout.js
   places them.
3. One host top: each archetype's own need (flexZ, clickDerive, touchZ,
   stickZ, seatZ, re-exported by `@hackbuild/kernel/author`) snapped up a
   layer, and the highest wins. At the defaults it is 13.68 mm and the
   bezel top 16.08 mm, the original's own record (computed,
   `packages/archetypes/test/legacy/pip-fits.json` haft.bleed0).
4. The cavities and the click slot direction search, then the edge and
   overlap warnings. At the defaults X, B, Y and A take 180, 0, 180 and
   45 deg, the original's.
5. The archetypes through Author.arch on the stack floor face at that top:
   flex-cone-key, click-spring-key, touch-comb-key, tilt-stick (PIP
   preset) and rp2040-zero-seat.
6. The route: the posts the archetypes emit are the terminals, in the
   original's net order (commons first), routed by packages/copper
   route(). At the defaults the route equals copper's route of PIP's own
   route input dumped from pip-controller b137deb: 0 conflicts, 0
   unrouted, 2 iterations, every net length equal to 1e-3 mm (computed,
   `packages/copper/test/golden/pip-b137deb-default.json`).
7. The buried stack: packages/copper emitTraceLayers, the one port of
   model.js lines 30 to 51, as `reference/electrical/pip-buried-route`
   takes it. The archetypes' own terminal discs and posts on a routed net
   are dropped, since the stack carries the same ones.
8. The host body up to the host top, and the bezel: the plate with a hole
   per button, the USB notch where the seat's opening rises past the host
   top, and the press ribs over the castellation rows, flipped onto the
   plate above the body.

## Release 1 differences from the original

- The bezel has no stepped chamfer, labels, mark, lip and groove, pry
  notches or pegs. The build warns (BEZEL) whenever one of those rows is
  on, which it is at the defaults.
- The click springs and caps sit at fixed plate spots below the body, two
  to a row; the original packs every object across the bed (model.js lines
  419 to 446).
- Wire cups are not ported (D-096): mount wire or both warns (MOUNT) and
  seats the board press fit. The separate stick cap (STICK) and PETG click
  caps (CLICKY) warn the same way.
- The grips outline routes and runs its edge tests inside the stadium
  (LAYOUT warning); the lobes hold no trace.
- The router sees only the outline, as the original's does.

## Checks

`npx --no-install hbf part.build designs/pip --json` at the defaults reads
250 pass, 1 warn, 4 fail, 188 skip (computed). The stick example reads 2
fail and 1 warn, blank 0 fail and 1 warn.

- The 4 fails are CHK-KEY-05 1.0.1 on the four flex keys' contacts. The
  check takes any contact on a part that holds a click spring for a click
  key contact, so in a part with both kinds it measures the flex column
  halves as a click tip over a pad (0 mm, legal 0.5). The flex keys are
  covered by CHK-KEY-01 and -03, which pass. Classifying by the contact
  (a contact that declares coneH is a flex key) flips a verdict on the
  same input, a major bump by CHECKS.md 1.3 that stales every report
  holding the check; that is left as a follow up.
- The warn is CHK-PRT-05: 34 faces sit between layer tops, the farthest
  0.110 mm off (computed), since PIP's stack is on a 0.24 mm grid from the
  bed and ffc5p's first layer is 0.25 mm.
- Build warnings at the defaults: BEZEL (above), BLEED_DEFAULT (bleed 0,
  inferred), the stage 6 INSET lines, and HOOKUP_PORT_ABSENT for every
  hookup port: the chase names ports `port.A` and so on, while the
  archetypes and the seat declare `click-spring-key.3.port.key` and
  `rp2040-zero-seat.0.port.GP4`. A design port per key fails the build
  (net X has no contact; a click key declares none), so the hookup stays
  unbound in release 1.

## Per-slot volumes

Against the pip-controller b137deb print file
(`hackbuild-3mf/corpus/legacy/pip-controller/pip.3mf`, its defaults with
pegs), mm3, both computed; a recorded number, not a gate (the M10-T13
1e-3 mm3 gate is release 2):

| slot | pip.3mf | this build | difference |
|---|---|---|---|
| 1 PETG | 125074.958 | 125453.397 | 378.439 |
| 2 conductive PLA | 1312.853 | 1232.672 | -80.181 |
| 3 TPU | 3952.484 | 3923.466 | -29.018 |
| 4 conductive TPU | 103.145 | 102.970 | -0.175 |

The original's bezel inlays (ink 61.367 in slot 2, pink 24.542 in slot 3)
are not built here, and its PETG carries the lip, groove, pry notches, peg
sockets and the chamfer this build leaves out; the rest is the stage 6
coincidence inset (0.001 mm, inferred) and the archetype ports' own
recorded differences.

## Drive readouts

`contact` (G-20) closes, on a hold, the region the key's actuator bridges
and its common: the flex column halves, the click half pads, the touch
combs, or the stick's wall pad. `drive('A', true)` closes
`click-spring-key.3.conductor.pad` and `.padCommon`; `drive('SELECT',
true)` closes `touch-comb-key.0.conductor.comb` and `.combCommon`.

The path ohm M10-T13 asks for (A LOW at 1.69 Mohm, SELECT HIGH at 0.93
Mohm, computed by the legacy bench) is not composed here: circuit.solve
(`expected/query-solve.json`) prices the nets, A 87327 ohm and GND
147104 ohm, SELECT 272632 ohm and 3V3 272457 ohm (computed, tier
inferred), but skips both reads, since the hookup ports are unbound
(above) and neither the click nor the touch archetype declares a contact
feature for the solve to cross. The bench item composes the readout.

## Parity

`npx --no-install hbf parity designs/pip` writes the goldens at
SOURCE_DATE_EPOCH 315532800 and a rerun at 1000000000 reads them equal
(build, report, edit, artifacts, query-solve).
