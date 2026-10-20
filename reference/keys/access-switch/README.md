# keys/access-switch

The access switch flagship (plan v9 section 6, release 1 "designs"): one
PIP click spring under a 56 mm round paddle, on a round PETG body with the
PIP buried stack, two leads to placeholder clip pads. Every number below is
computed from the build and the profile rows, tier inferred where a profile
row is inferred, unless it says otherwise. Nothing here has been printed.

Location: `reference/keys/`, beside `keys/midi-pad`, so the reference
harness, `hbf parity` and its goldens apply as they do to the other
flagship.

| part | source | original of record | reference |
|---|---|---|---|
| spring, tip, cap, slot, pads, ribs | click-spring-key through `k.arch`, overrides l, t, Q, w and E | `originals/pip/files/haft-src/src/layout.js` clickerDims (lines 81 to 97), `model.js` lines 89 to 112 and 366 to 390, `snapfe.js` (pip.md 5.2) | buttons/click-spring |
| materials | PIP's four slots | `layout.js` lines 47 to 52 | buttons/click-spring |
| stack | profile stack rows | `layout.js` line 27 | electrical/pip-buried-route |
| body, rim, paddle | build.ts, new to this design (no original) | none | this reference |

## The spring point

Span 28 mm and beam 0.55 mm (PIP draws 24 and 0.55), rise Q 2.0, width
1.6, E the PETG `modulusMPa` row read through `k.profile.material` (1900
MPa, a working value, tier inferred). Through packages/sim the spring
reads peak 1.552 N (158 g at standard gravity), drop 0.765, contact
travel 1.369 mm, strain at the stop 1.67 percent against the 2.5 percent
PETG click row (all computed). The span 24 point reads 2.527 N; the
reference test holds the default inside 1.3 to 1.8 N and fails at span 24.
A 0.05 mm beam error moves the peak from 108 g to 224 g (computed, scout
sweep), so the force claim waits on the thickness ladder coupon.

## Body and paddle

- Body: a 62 mm disc (paddle diameter plus two walls) to host.top 13.68 mm,
  the spring's need snapped up a layer, and a 3 mm rim from there to 19.21
  mm, the cap top snapped up a layer. The rim bore is the paddle diameter
  plus `access.paddleGuideClr` 0.4 mm diametral (profile, inferred). No
  CHK-FIT row covers this guide; metric `paddle.guideClr` carries it.
- Paddle: a PETG revolve printed plate down beside the body: plate 3.13 mm,
  skirt 3 mm thick to 12.01 mm, a central boss of the cap stem radius that
  rests on the TPU cap. Every paddle face is a layer top.
- Stop: at rest the skirt edge sits 1.56 mm over the body top (metric
  `paddle.travel`), the contact travel plus `click.stopOvertravel` 0.3 mm
  (inferred) snapped down a layer, so the skirt stops the paddle past
  contact and no later than the travel eStop is read to.
- Preload: the paddle weighs 15.926 g solid (metric `paddle.massG`, PETG
  density 1.27 from profile, inferred; infill lowers it, unknown). Its
  weight, 0.156 N at standard gravity (computed), rests on the spring. The
  peak above does not subtract it.
- Leads: as buttons/click-spring, on trace layer 1 from the key's two
  posts to the body edge, each ending at a placeholder clip pad that the
  jack seat replaces (R1-flagship-access-switch-06).

## Deviations, each named

- No hookup: the switch carries no MCU, and the tip prints apart from the
  body, so no contact feature names it (M06-T08 finding). The proof is the
  `apart` assertion on KEY and GND plus `key.R.switch`.
- No bezel plate: PIP's bezel holds the spring end blocks down ("under the
  bezel" fits row). Here the ribs and the snug slot locate them and nothing
  holds them down (unknown until the coupon).
- Off-centre presses on a 56 mm paddle tilt it in the bore and add friction
  to the felt force (unknown until the coupon).
- CHK-PRT-05 warns on the cap face at 5.40 mm, as for buttons/click-spring.

## What is verified, and what is not

### Verified on this machine

- 2026-10-20 (R1-flagship-access-switch-02): `npx --no-install hbf parity
  reference/keys/access-switch --accept` wrote the first goldens at build
  88a134..57; `npx --no-install hbf check.run reference/keys/access-switch`
  reports 0 fail, 1 warn (CHK-PRT-05), 31 pass, 49 skip; CHK-KEY-04 passes
  at Q 2.0 inside 1.72 to 2.31 (computed).
- 2026-10-20: `npx vitest run reference/keys/access-switch` passes 6 tests;
  with the default span set to 24 the band test fails at 2.527 N.

### Measured on a printed body

- None. Nothing here has been printed.

### Not verified by anything

- Not sliced; no force has been on a gauge (unknown).

<!-- R1-flagship-access-switch-08: virtual slice -->
<!-- end R1-flagship-access-switch-08 -->

<!-- R1-flagship-access-switch-09: print card -->
<!-- end R1-flagship-access-switch-09 -->

<!-- R1-flagship-access-switch-11: coupon result and owner checklist -->
<!-- end R1-flagship-access-switch-11 -->
