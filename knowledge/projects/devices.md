# Devices, the live-instrument class

These are the tools with a machine on the other end holding state you did not
set. Safety code belongs to this class and belongs in the library, not the
app.

## The three-app platform

radio.hack.build, a serial-and-exploration app, and app.hack.build. The
platform record is the spec for the live-instrument chases and for `link`.
Gear it must support: HackRF, RTL-SDR, Ubertooth, WiFi Pineapple, USB Nova,
Bus Pirate, FTDI and UART adapters. Easy and advanced modes, non-restrictive
by design. Folds in KERF and HASP. The analysis engine auto-experiments with
standard patterns, CyberChef Magic style (spot a Caesar rotation and decode
it). An xterm.js serial shell. Deliverables that exist: two PRDs and two
mockups, one surface-tab and one device-first bench with per-device control
planes. app.hack.build also carries CONDUYT: flash over WebUSB or serial,
connect as a capability-typed device, fill capability gaps.

## DETENT, becoming BEAM

The audit after field use is the best record of what goes wrong with a live
instrument. His report: drift, the printed case obstructs the beam, the laser
behaves unexpectedly, settings unclear, corner bounds not applying, text plots
almost flat.

Five root causes, and the first is the biggest:

1. CONNECT PUSHED APP DEFAULTS OVER THE BOARD every reconnect, wiping limits,
   inversion and mapping, so honed setups broke on reload. Fixed by connect
   PULLING a config dump and adopting it, with explicit SEND / ADOPT /
   PERSIST. This became a principle: THE BOARD IS SOURCE OF TRUTH.
2. Drift: no ramp at direction reversals, lash take-up running at the faster
   travel rate exactly at reversals, and re-energising released coils stepping
   immediately from an unknown detent.
3. Flat text: content laid out in a square field while the real captured quad
   is wide and short.
4. Beam weirdness: firmware silent when idle, so a lost BLE notify could wedge
   host flow control mid-plot.
5. `parseArgs` capped at 6 args, silently truncating an 8-coefficient command.

The calibration approach that worked: four-corner capture solving a projective
HOMOGRAPHY in (u,v) = (tan 2thetaX, tan 2thetaY) space, where the ideal model
is near-linear, so it absorbs rotation, keystone from off-axis mounting, and a
wrong throw estimate AT ONCE. The app solves it (8x8 Gauss-Jordan), the
firmware just applies 8 coefficients and computes the adjugate inverse.

The inversion bug and its fix are a general lesson: inversion had been applied
INSIDE the kinematics, so it only affected mm-mode moves and jog would not
invert. The correct home is the PHASE-ADVANCE layer in firmware. IT IS A
WIRING CORRECTION, SO IT MUST NOT TRANSFORM THE APP PREVIEW.

Speed work: an app-side trapezoidal planner with junction lookahead, per-point
tick interval sent as an optional 4th field, and a flag bit telling the
firmware to execute the interval verbatim instead of stacking its auto ramp on
top.

STALL HUNT: per axis, out-and-back passes at 500 to 1500 steps/s with proper
accel and decel legs and a TRIPLE HOME BLINK before each pass. The first rate
whose blink returns off the mark is past pull-out; set the draw rate to about
70 percent of the last clean rate.

The rev D printed chassis house rules are in `01-invariants.md`. The rev C bug
found in rev D is the teardrop one.

RGB version known-unfixed, in priority order: the cage crushes the laser
wires; nothing clamps the module inside its bushing; optic slots at 1.35 for a
1.1 optic are too loose; the 3.0 mirror notch assumed molybdenum and glass
chips in an interference fit.

The backlash model that worked: firmware inserts comp steps on direction
reversal; the sim replays that shaft history through a hysteresis band of the
measured mechanical slack. Comp and measured slack are SEPARATE fields, and
the useful metric is mean-subtracted distortion, not absolute offset, because
a uniform offset just shifts the whole drawing.

The calibration app designed and NOT built: fit the inverse mapping as
bivariate cubics s1=F(u,v), s2=G(u,v) from a 5x5 grid, rather than the
physical model, since the physical params are correlated and the fit absorbs
throw, tilt, zero offset and the 4075.7728 gearbox ratio at once. Home
optically off a phototransistor using the centroid, not a threshold.

The speed ladder, in order of cost: TBD62003 DMOS drop-in reclaims the
Darlington volt; 9 V at intermittent duty; 12 V plus a series resistor as
L/R drive; a zener between ULN COM and V+ for faster decay. The largest gain
is the bipolar mod (cut the red common trace inside the motor) plus TMC2209
at 12 V and about 200 mA with microstepping and StallGuard skip detection,
which needs a SPINDLE v6 with StepStick sockets. Raising the motor rail must
never touch the SuperMini 5V pin; its LDO maxes about 6 V.

Rev D printed parts: sculpted chassis with the floor running back under
motor 1 with a can cradle, walls falling away at 45 from the plateau, one
gabled window motif at four sizes, hex-lightened floor; a two-part snap
enclosure (shell plus hood, no screws, 45 flanks both sides so it opens with
the force it closed with); six parts, all watertight, none needs support;
detent_snap_gauge and detent_fit_gauge coupons; a quarter embedded in the sim
as a scale reference. The shell has an uncut BELT band nothing may cut so
the cage is one body by construction.

Mirror sourcing: cheapest good front-surface glass is a dead flatbed scanner
(first surface strips, glass, flat).

The BEAM PRD, as specced: product named BEAM, DETENT lives on as the
reference machine profile id `detent-28byj`. Three packages with enforced
dependency rules: `@virgilvox/beam-core` (pure logic: protocol codec,
kinematics and homography, planner, stroke ops, firmware-accurate sim, zero
deps), `beam-sources` (font, 3D models, SVG, raster, patterns; DOM via
injected primitives), `beam-link` (WebSerial, WebBLE, mock transports, Device
with adopt-on-connect, credit-window streaming, safety behaviours, stall
hunt). The theme is a shared root `theme/` directory imported via a `@theme`
Vite alias and vendored into other tools by copying. `apps/studio` is Vue 3
plus Vite plus Pinia, with the manual single-sourced from `docs/manual.md`,
and dual builds: a Pages site with the mock transport plus a single-file
`beam.html` via vite-plugin-singlefile that must run offline from `file://`,
under a 900 KB target. Firmware renamed `beam.ino`, advertises BEAM but the
app accepts DETENT hello strings so flashed boards keep working.

PRD principles worth carrying into the whole plan: board is source of truth,
SAFETY IN THE SDK NOT THE APP, packages ship untranspiled ESM (esm.sh
consumable like conduyt-js), pnpm workspaces, vitest plus playwright porting
the existing g++ and browser suites, changesets with beam-* lockstep (the
theme is unversioned and travels with the repo), MIT, and a lint rule making
em dashes and emoji a BUILD FAILURE. M1 parity is the gate: the single file
and the SDK must both drive the real rig through calibrate-and-plot before
anything publishes. The BEAM PRD's Pinia choice predates the
thinner frontend decision in PLAN.md section 8; reconcile when BEAM is
touched.

## WASHER

The plotting complaints across three rounds were all upstream of the servo:

- text jumped and drew circles: the design was about 3x wider than the target
  with no warning, plus per-stroke stop-start planning. Fixed with a
  whole-job velocity profile, stroke merging, and an on-screen bounds warning.
- manual drawing resolved finer detail than plotted text: coarse stroke-font
  polygons plus a flattening bug that turned gentle curves into chords. The
  stroke font was rewritten with explicit quadratics and lowercase, 94 glyphs,
  replacing a font whose inferred curves made round letters about 13 percent
  fatter than designed.
- x then y instead of both together: needed real vector motion.

The bench log from the first hermite run over BLE is the honest failure
record: repeated board dead-man fires during setup and mid plot, queue-full
drops climbing about 40 per report, lost jumping to 29, an ERR unknown line,
q oscillating 47 to 0.

Physical: servo_base 51x45x16 with the pan servo inside shaft up, galvobody
26x51x23 bolting to the pan horn with a 24x12 through-slot, galvobrack a
17.6x20 clamp with a 12.5 bore. THE SERVO CABLE SLOT MUST RUN THE FULL DEPTH
OF THE SOCKET or the servo cannot be pressed in.

## SPROCKET

One text command protocol reachable over BLE (Nordic UART), CLASP, and USB
serial. NVS config, dead-man timeout, DISARMED AT BOOT.

The CLASP binary v3 codec was hand-written on both sides and verified
BYTE-IDENTICAL against `@clasp-to/core@4.3.1`.

## PLENUM and QUENCH

Both are design tools rather than device controllers, but they carry the
physics models.

PLENUM's finding: sub-ambient cooling buys thermal ROLLOVER HEADROOM, not
efficiency. A 24-emitter bank at 4.5 A gives 117 W optical on a room-temp loop
against 136 W at -10 C. At 5.5 A the room-temp loop rolls over to 95 W while
the cold loop holds 141 W. Chiller capacity derates about 3 percent per kelvin
of setpoint depression, so a 1200 W nameplate unit delivers about 490 W at
-10 C against about a 470 W heat load.

Optics: raw bank BPP about 663 mm.mrad gives about a 4 mm spot and about
1 kW/cm2. Per-emitter beam rotation gets to about 0.7 mm and about 33 kW/cm2.
Steel keyhole cutting needs about 1e6 W/cm2, SO THIS LANDS IN SURFACE
HARDENING, CLADDING, PLASTIC WELDING AND PAINT STRIPPING, NOT CUTTING. That is
why QUENCH exists as the plasma route.
