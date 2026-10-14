# Profile

Version 4, 2026-10-04. Part of the hackbuild-fab plan set; PLAN.md is the index.

Profile is the package and data that hold every number a build reads about
materials, machines, fits, process loss, bleed and named constants. Each row
carries provenance. Builds read rows through `ProfileLookup`
(`spec/profile.ts`), the lookup records every read, and `profileHash` covers
exactly the rows read (D-051). Coupons are the only route to a measured row,
and a person writes it. No model enters a coupon or measured result or
raises a row's tier; a model adds a row only at vendor, community or
inferred tier with its source, in the milestone card that names it.

Decisions carried: D-007, D-073, D-076 (cross reference), D-081, D-082,
D-083, D-084, D-085, D-098, D-099, D-100, D-101, D-102 (cross reference),
D-159 (PETG table). Cited where they touch profile rows: D-071, D-072,
D-079, D-080, D-096, D-103, D-104, D-136, D-145. Corrections carried: C-01, C-02, C-05, C-06, C-09, C-15.
PLAN.md section 12 is the summary; this file is the detail.

Working names on first use: hbf (working name) is the binary, CHASE
(working name) the design document. PIP (was HAFT) is
`hackbuild/pip-controller` at b137deb.

Evidence roots used throughout:

| short name | absolute path |
|---|---|
| handoff | `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf` |
| pip | `fab-knowledge:evidence/x/pip-controller` |
| ogee16 | `fab-work-directory:benches/ogee16/outputs/ogee16-source.zip` |
| gold | `fab-work-directory:benches/collar-coin/uploads/hackbuild-coin-nfc.3mf` (sha256 24ee9c66419ac23eb2075e859bd0191a6431abb1d7d3628eea2372abc854f0c5, entries dated 2026-08-19 18:28) |
| hsl | `3d/coin/hsl.3mf` (entries dated 2026-08-19 18:44) |
| kb | `fab-knowledge` |
| vc | `fab-knowledge:synthesis/verified-claims.md` |
| 3dp | `fab-knowledge:research/3dp-landscape.md` (FDM and materials research note) |
| dl | `fab-knowledge:evidence/x/downloads` (copies of owner Downloads files recovered 2026-10-04; mtimes kept) |

## 1. Where profile lives and who writes it

| item | repo path | written by |
|---|---|---|
| types | `spec/profile.ts`, `spec/ids.ts` (Tier, Qualifier, BendDirection, ResistivityDirection) | spec, M-1 |
| seed import | `packages/profile/seed/profile.seed.json` from `handoff/seed/profile.seed.json` | M-1-T07 |
| row data | `packages/profile/data/materials.json`, `machines.json`, `fits.json`, `loss.json`, `bleed.json`, `constants.json`, `resistivity.json` | M00-T02, M01-T03, then coupons only |
| coupon records | `packages/profile/coupons/<coupon-id>.json` (section 11.1) | a person |
| lookup | `packages/profile/src/lookup.ts` and siblings | M00-T02 |
| per-MCU pin rows | catalog, `PartRow.mcu` (`spec/catalog.ts`); profile holds none | M05, M08 |

Rules:

- A builder agent may add rows that a decided D entry fixes (seed data), with
  the tier and source that entry names. It never adds a `measured` row, never
  raises a tier, and never edits a coupon record (CLAUDE.md, D-082).
- Every number in a row has a unit stated in the field name or the type doc
  comment (`spec/profile.ts`).
- Values typed by hand into a check message, README or UI are a defect; they
  are formatted from the row (D-010).
- A row the lookup cannot find returns `E_REF` with the closest ids
  (D-064). A missing value a check needs returns `E_PARAM_MISSING`
  (for example a null kerf, section 8).

## 2. Data model

### 2.1 Provenance (D-099)

Every row carries one record:

| field | type | meaning |
|---|---|---|
| tier | Tier | section 2.2 |
| method | `datasheet`, `coupon`, `failure`, `felt`, `listing`, `derived` | how the value was obtained |
| date | ISO date | when the value was obtained or published |
| machine | machine id, optional | required for tier measured |
| coupon | coupon id, optional | required for tier measured |
| conditions | `{temperatureC, speedMmS, layer, lineWidth, direction}`, optional | print conditions; required on resistivity rows with method coupon |
| source | string | repo path with line, datasheet and page, URL, or record id |

Methods:

| method | use it when | example |
|---|---|---|
| datasheet | a manufacturer or vendor page states the value | Protopasta 30 ohm cm printed XY |
| coupon | a printed test piece was measured with an instrument | Nowka 2024 bars; any future shop coupon |
| failure | the value is the boundary where a print failed | PETG click strain 2.5 percent from failures at 2.7 to 3.3 percent |
| felt | a person adjusted the value by hand feel after a print | OGEE16 fit bands raised 0.20 mm because parts "still feel tight" |
| listing | a store listing, not the maker's datasheet | SuperMini pad positions from a seller photo |
| derived | computed from other values or scaled from a ratio | PIP preset 500 ohm cm from the Yousu figure and the Protopasta ratio |

Print conditions move resistivity (Nowka 2024, PMC11510930), so a
resistivity row with method coupon is refused at load without `conditions`.

### 2.2 Tiers (D-083, owner)

Status owner. Question: is `measured` a fifth tier between verified and
vendor. Default in force: five tiers, highest first.

| tier | definition | export behaviour |
|---|---|---|
| verified | a manufacturer drawing, parsed | usable everywhere |
| measured | a shop coupon on a named machine, with coupon id, date and method | usable everywhere |
| vendor | a maker's published figure | usable; public claims state the tier |
| community | a third party's measurement: a paper, or a community coupon credited by contributor (D-042) | usable; public claims state the tier |
| inferred | derived, scaled, felt or carried from a bench without a coupon | usable in sim; exports carry an inferred warning (D-082) |

A profile row at tier inferred adds a warning to the export and never
refuses it. Every loss row and fit band (sections 7.1, 7.3) and the
working cPLA resistivity row load at tier inferred today, so a refusal
would stop every FDM export. The refusal with `E_PROVENANCE` (exit 4)
belongs to catalog part rows only: bought parts and footprints (D-102).
CHK-NET-05 warns while the resistivity row it reads is inferred (D-081).

`part.build` returns `readsInferred: { row: string; movesChecks: string[] }[]`
(`spec/commands.ts`, `InferredRead`): each inferred profile row whose value
reached a check's measured or legal value, with the ids of those checks.
Attribution comes from `ProfileLookup.reads()` recorded during each
check's run. The card and the PRINT step show each entry as "this verdict
rests on an inferred row", and the PRINT step offers the coupon that
carries the row (section 11.1, UI.md 6.3). A coupon that raises the
row's tier empties the entry on the next build.

Load-time rules, enforced by `packages/profile/test/provenance.test.ts`:

- A row without a tier fails with `E_SCHEMA`.
- A row at tier measured without `machine`, `coupon`, `date` and a coupon
  record that exists fails with `E_PROVENANCE`.
- A value computed from rows carries the lowest tier among the rows it read.
  Archetype resistances computed at load (D-098) inherit the resistivity
  row's tier.
- No code path raises a tier. Dropping a qualifier to promote a computed or
  inferred number is a defect (D-007).

As of 2026-10-04 profile holds no measured row. Every physical measurement
waits on the owner (D-082, section 12).

### 2.3 Qualifiers (D-007)

Every number shown in prose, UI, print cards and check messages carries one
qualifier: measured, computed, vendor, inferred or unknown. The tier maps to
the qualifier a reader sees:

| row tier | qualifier shown for the stored value | qualifier for a value computed from it |
|---|---|---|
| verified | vendor | computed |
| measured | measured | computed |
| vendor | vendor | computed |
| community | measured, with the citation | computed |
| inferred | inferred | computed, and the message names the inferred input |

A computed number keeps "computed" even when every input is measured. The
message names the lowest input tier, for example "floor 3.23 mm (computed
from 30 ohm cm, vendor)".

Nobody types a qualifier by hand. spec/ids.ts holds the table above as
`TIER_QUALIFIER` and a `Qualification` type, `{qualifier, basis}`, where
basis is the tier the number rests on. spec/profile.ts produces it:

| function | use | result |
|---|---|---|
| `qualifyRow(tier)` | a value read straight from one row | `TIER_QUALIFIER[tier]`, basis the tier |
| `qualify(tiers)` | a number an equation produced from rows | computed, basis the lowest input tier |
| `qualify([])` | a number from geometry or params alone | computed, basis null |
| `qualify([..., null])` | a row the equation needed is missing | unknown, basis null |

Metric, Bound, DerivedValue and Qualified carry a Qualification, so a
reader of any shown number can recover the lowest input tier.

### 2.4 Seed tier corrections

The seed (`handoff/seed/profile.seed.json`) labels several rows measured or
verified without a coupon record. Under the D-083 ladder they load at the
tier below. Values are unchanged unless a D entry changes them.

| seed row | seed tier | v4 tier, method | reason | decision |
|---|---|---|---|---|
| `cpla` 30 ohm cm, anisotropy 15/30/115, brand Yousu | inferred | replaced by the D-081 rows (section 4) | Protopasta numbers filed under the Yousu spool | D-081, C-09 |
| `ctpu` 1500 ohm cm | inferred | replaced by PIP preset 400 ohm cm, inferred | GUDGEON figure filed under ctpu is a cPLA computation from 30 ohm cm (vc C3; source recovered from Downloads 2026-10-04, section 4.1) | D-081 |
| `electrifi` 0.01 ohm cm "Multi3D marketing" | inferred | community printed rows plus vendor grades | Nowka 2024; vendor page grades | D-081 |
| `petg.processLossAt024` 0.25/0.15 (diametral; loads as 0.125/0.075 per side, section 7.1) | measured | inferred, failure | TIMES.md says "call it 0.40 lost"; no coupon id | D-083, D-100 |
| `ffc5p.processLoss` 0.15/0.10 (diametral; loads as 0.075/0.05 per side) | measured | inferred, derived | `fits.py` docstring says "roughly"; no coupon id | D-083, D-100 |
| `ffc5p` machine row | measured | vendor, datasheet | envelope and toolheads read from the gold slicer save | D-101 |
| `petg-click.strainMax` 0.025 | measured | inferred, failure (bend inPlane) | failures at 2.7 to 3.3 percent on the PIP (was HAFT) beam; no coupon id | D-073 |
| `28byj48.halfStepsPerRev` 4075.7728 | measured | vendor, derived | equals the gear train 63.68395 x 64 half steps; no coupon recorded (M07 open question) | D-083 |
| `esp32c3.supermini.padCentres` 8.75 | verified | vendor, listing; moves to catalog | D-096 sets SuperMini pads to vendor tier | D-096, D-103 |
| `sg90.flangeSpan`, `sg90.body`, `sg90.shaftFromEnd` | vendor | inferred; move to catalog actuator rows | SG90 shaft offset 5.3 to 5.9 mm across benches | D-104 |
| `despeckle.factor` 0.35 | measured | inferred, failure | "the period survives" in COLLAR v3, `collar.html` lines 1161 to 1166; no coupon | D-145 |
| `capsule.archBelowDiameters` 2.0 | measured | inferred, derived | SLUG trial runner not harvested; `slug.html` spawns unseeded | D-136 |
| `fits` rows | none | inferred, derived (section 7.3) | seed rows carry no provenance | D-099 |

The M00-T02 card (`milestones/M00-foundation.md`) asserts tier measured on
the realGap source row as seeded. Under this table that assertion becomes
tier inferred; the joint is unchanged (0.15 real across the part, 0.075
per side on the basis of section 7.1).

## 3. Materials

Material ids are stable. A chase slot names a material id; the 3MF writer
maps it to a slicer filament type (section 9).

### 3.1 Material rows

| id | name and brand | processes | modulus, MPa | creep | density, g/cm3 | tier | source |
|---|---|---|---|---|---|---|---|
| `petg` | PETG, shop default | fdm | 1900 working (inferred); Bambu PETG HF 1810 +/- 190 XY, 1540 +/- 130 Z (vendor, reseller page) | low | 1.27 (vendor) | inferred | working E: `pip/src/layout.js` clicky defaults; KNURL uses 2000 (`knurl.html:648`); HF figures: filament2print PETG HF page via `3dp:501-505`, confirm against Bambu's TDS before citing (C-15 applies to the same page's elongation); density: gold `filament_density` |
| `pla` | PLA | fdm | unknown | high | 1.24 (vendor) | vendor | seed (print-forge materials.json); creep from `handoff/knowledge/00-constants.md` "PLA creeps under sustained load" |
| `tpu95` | TPU 95A | fdm | Bambu TPU 95A 9.2 +/- 0.4 XY, 7.8 +/- 0.4 Z "as published" (vendor) | low | 1.22 (vendor) | vendor | Bambu TPU 95A TDS (3drepublika PDF) via `3dp:501`; density COLLAR `MATERIALS` |
| `cpla` | conductive PLA, Yousu (shop spool) | fdm | unknown | high | unknown | inferred | seed; spool brand per seed note |
| `cpla-protopasta` | Protopasta conductive PLA | fdm | unknown | high | unknown | vendor | proto-pasta.com/pages/conductive-pla |
| `ctpu` | conductive TPU 95A, Yousu (shop spool) | fdm | unknown | low | unknown | inferred | seed; PIP slot "conductive TPU" |
| `ctpu-eel` | NinjaTek Eel | fdm | 305 tensile, 310 flexural (vendor, TDS Rev1 26-06) | unknown | unknown | vendor | TDS_EEL-Revision1_26-06_V1.pdf; Shore D 60 in Rev1 against 90A in the older TDS (vc C3) |
| `electrifi` | Multi3D Electrifi, copper filled | fdm | unknown | unknown | unknown | vendor | multi3dllc.com/product/electrifi; prints 130 to 160 C at 10 to 30 mm/s, "currents below 1.75 A" (vendor) |
| `cabs` | Torwell conductive ABS (Capricate) | fdm | unknown | unknown | unknown | community | Schmitz et al. UIST 2015 |
| `ply3` | plywood 3 mm | laser | 10000 (inferred) | unknown | unknown | inferred | seed, "SLUG 3mm rev"; thickness 3.00 also in SPINDLE `checkstack.mjs` |
| `acrylic3` | acrylic 3 mm | laser | 3200 (inferred) | unknown | unknown | inferred | seed, OGEE R12 ramp analysis; OGEE16 `params.scad` T 3.0 |
| `acrylic1p5` | acrylic 1.5 mm | laser | unknown | unknown | unknown | inferred | STIPPLE R17 params: T 1.5, TC 3.0, FIT_SLIP 0.3, FIT_LAP 0.1, FIT_TEN 0.12, FIT_BORE 0.2 (design parameters, no coupon; `dl/dl-ogee-stipple-mech/stipple/stipple (1).html`) |
| `copper-tape` | adhesive copper tape, 0.07 mm | vinyl | n/a | n/a | n/a | vendor | seed (KEYWAY); SPLICE sim TAPE Z 0.07 mm |
| `copper-foil-005` | adhesive copper foil, 0.05 mm | vinyl | n/a | n/a | n/a | vendor | SHIM README (`kb/sources/benches/benches-copper-pcb-a.md:368`) |
| `velostat` | Velostat 0.1 mm (4 mil) | vinyl | n/a | n/a | n/a | vendor | seed (KEYWAY) |
| `cardstock` | card stock for inserts | paper | n/a | n/a | n/a | inferred | thickness unknown (section 3.5) |

Sheet thickness lives on the material row (`thickness`, mm). Sheet backers
seen in the corpus: 1.5 mm plywood or 2 mm acrylic (SHIM README), 3.00 mm
plywood (SPINDLE), 3.0 mm acrylic (OGEE16), 1.5 mm acrylic with a 3.0 mm
second stock (STIPPLE R17). A design that needs a thickness
without a row adds one with its source; no thickness is assumed.

Friction: `acrylic3` against `acrylic3` static 0.45 (inferred, seed, OGEE
R12). OGEE R17 raised RAMP_A from 25 to 40 degrees because tan 25 = 0.466 is
marginal against it and tan 40 = 0.839 gives 1.9x (computed,
`handoff/knowledge/00-constants.md:123-125`). STIPPLE R17 carries the same
RAMP_A 40.0 in its params (`dl/dl-ogee-stipple-mech/stipple/stipple (1).html`).

### 3.2 Strain limits by bend direction (D-073, C-05)

The orientation scorer decides whether a beam is bent in the layer plane
(`inPlane`, the beam printed flat) or across layers (`acrossLayers`, the
beam built up in Z). The snap and click checks read the row for that
direction. TDS elongation is never the basis for a limit.

| material | use | bend | limit, percent | range, percent | tier | method | source |
|---|---|---|---|---|---|---|---|
| petg | click | inPlane | 2.5 | | inferred | failure | PIP (was HAFT) click beam failed at 2.7 to 3.3 percent; seed `petg-click` |
| petg | snap | inPlane | 2.5 | | inferred | failure | same row, applied to snaps (D-073) |
| petg | click | acrossLayers | 1.5 | 1.5 to 1.8 | inferred | derived | `3dp:512-516` |
| petg | snap | acrossLayers | 1.5 | 1.5 to 1.8 | inferred | derived | same |
| pla | snap | inPlane | 2.0 | 2 to 3 one-time | community | datasheet | filamentfeed snap guide via `3dp:487` |

Readings at PIP defaults (l 24, t 0.55, w 1.6, E 1900, sw 3) from the SNAPFE
sweep (computed, vc C6): strain at stop 2.50 percent at Q 2.2, 2.55 at
Q 2.25. CHK-KEY-04 takes 2.2 as its upper bound from the inPlane row
(D-071). PETG HF elongation 8.6 XY and 5.1 Z (reseller page) is unverified
(C-15) and is not cited.

The PLINTH snap verdict (strain 3 t d / (2 L^2), ok under 2.6, warn under
3.4 percent, D-096) is a canon band from one design. Where a snap check
reads both, the material row governs the verdict and the PLINTH band is
reported as the design's own record. Whether the snap family keeps its
own bands once a PETG coupon exists is open; until then the material row
governs.

### 3.3 Fatigue

| id | value | tier | method | source |
|---|---|---|---|---|
| `snap.repeatFactor` | 0.6 times the one-time allowable for a snap declared as cycling | community | datasheet | MIT snap-fit notes, `3dp:490` |
| `cpla.flexFatigueWidthMin` | 0.80 mm minimum width for cPLA crossing layer lines under flex | inferred | derived | cited as `knowledge:04-heuristics` in `kb/synthesis/api-library-ai-design.md` 6.4 C; no matching line found in `handoff/knowledge/04-heuristics.md` |
| PETG strain-life curve | none found for desktop FDM | unknown | | `3dp:518-521` |

Published PLA and PETG S-N curves exist at R = 0.2 for 45 degree rasters;
45 degree and concentric orientations outlast 0 and 90 degree ones (same
source). No row is derived from them.

PIP's assembly guide asks for fifty presses on the coupon flex key while
watching the pressed reading (`pip/docs/assembly.md`). The fatigue coupon is
that cell; a person records the drift.

### 3.4 Creep

Creep is a three-value field: low, high, unknown. Structural parts in a
material with creep high get a warning from the material check
(`handoff/knowledge/00-constants.md:32-33`: structural parts PETG or ABS,
PLA only for shells and non-load parts). PETG yields rather than cracking,
which is why it takes a 1.15 mm interference barb where PLA may split the
lug (same file, lines 38-39; about 1.33 mm in PETG per OGEE16 TIMES.md).

### 3.5 Paper (D-018)

Paper is a narrow fourth process: card stock in profile, a holder fit class
(section 7.3) and an `impose` export. Card stock thickness has no source in
the corpus. COTTER uses card washers from cereal box board "about 0.5 mm"
(inferred, `kb/sources/latest/cotter-sparger.md:221`); that is a washer, so
the `cardstock` row keeps `thickness` absent until a person measures the
stock the shop uses. Letter sheets for imposition are 215.9 x 279.4 mm
(vendor, COTTER `sheetSVG`).

### 3.6 Toolhead handling

Every material with process fdm carries a `handling` record
(spec/profile.ts MaterialHandling): `abrasive`, `flexible` and
`minNozzleMm`, with provenance. CHK-3MF-09 (CHECKS.md 9.12) reads it
against the toolhead each slot resolves to (section 8.3). Seed conformance
(M-1-T07) refuses an fdm row without it.

Two entry rules keep the check failing safe. A filled filament whose
abrasiveness has no source is entered `abrasive: true` at tier inferred.
`minNozzleMm` is the smallest bore with a print on record for that
material; a smaller bore needs a printed body at that bore before the row
moves. No conductive material has a print on record below 0.4 mm as of
2026-10-04, so a conductive slot on `ffc5p-n025_20260819` fails the check
(inferred: no clog is on record either; the bound is the absence of a
print, not an observed failure).

| material | abrasive | flexible | minNozzleMm | tier | source |
|---|---|---|---|---|---|
| `petg` | false | false | 0.4 | inferred | unfilled; prints on record at 0.4 only (24 owner 3MFs on the 0.4 preset); hsl.3mf at 0.25 printed PLA |
| `pla` | false | false | 0.25 | inferred | unfilled; `3d/coin/hsl.3mf` prints Generic HS PLA at 0.25 (vendor preset, section 8.1) |
| `tpu95` | false | true | 0.4 | inferred | PIP slot 3 on ffc5p at 0.4 (`pip-controller/docs/printing.md:9-19`) |
| `cpla` | true | false | 0.4 | inferred | carbon filled; PIP slot 2 at 0.4 (`pip-controller/docs/printing.md:18`) |
| `cpla-protopasta` | true | false | 0.4 | inferred | carbon filled; no shop print on record, bore taken from `cpla` |
| `ctpu` | true | true | 0.4 | inferred | carbon filled; PIP slot 4 at 0.4 (`pip-controller/docs/printing.md:20`) |
| `ctpu-eel` | true | true | 0.4 | inferred | carbon filled; no shop print on record, bore taken from `ctpu` |
| `electrifi` | true | false | 0.4 | inferred | copper filled; no shop print on record |
| `cabs` | true | false | 0.4 | inferred | carbon filled; Capricate printed on its own machine, no shop print on record |

The flexible and abrasive facts for the conductive rows come from the
filler and the base polymer, not from a wear or feed test on the shop's
toolheads. A nozzle that wears shows up as line width drift on the
fit-gauge coupon (section 11.3); the coupon record is where a measured
wear figure would enter.

## 4. Resistivity (D-081, C-09)

### 4.1 Rows

Units ohm cm. Direction names: `along` is in the print plane along the
extrusion, `across` is in the print plane perpendicular to it, `through` is
across layers (Z), `bulk` is a molded or filament figure with no print
direction.

| row id | material | form | direction | ohm cm | tier | method | brand scope | source |
|---|---|---|---|---|---|---|---|---|
| `cpla.yousu.raw` | cpla | raw-filament | bulk | 240 to 481 | vendor | datasheet | Yousu | ysfilament.com conductive page: 100 to 200 kohm per 10 cm of 1.75 mm filament, A = 2.4053 mm2 (computed, vc C3) |
| `ctpu.yousu.raw` | ctpu | raw-filament | bulk | 240 to 481 | vendor | datasheet | Yousu | same page, same figure |
| `cpla.pip.along` | cpla | printed | along | 500 | inferred | derived | Yousu | `pip/src/layout.js:46` (`rhoC`); `pip/docs/electrical.md:15-17` |
| `cpla.pip.through` | cpla | printed | through | 2000 | inferred | derived | Yousu | `pip/src/layout.js:46` (`rhoCz`) |
| `ctpu.pip.bulk` | ctpu | printed | bulk | 400 | inferred | derived | Yousu | `pip/src/layout.js:46` (`rhoT`), "contact TPU" |
| `cpla-protopasta.molded` | cpla-protopasta | molded | bulk | 15 | vendor | datasheet | Protopasta | proto-pasta.com/pages/conductive-pla |
| `cpla-protopasta.xy` | cpla-protopasta | printed | along | 30 | vendor | datasheet | Protopasta | same page, printed XY |
| `cpla-protopasta.z` | cpla-protopasta | printed | through | 115 | vendor | datasheet | Protopasta | same page, printed Z |
| `cpla-protopasta.nowka.along` | cpla-protopasta | printed | along | 11.69 | community | coupon | Protopasta only | Nowka 2024, PMC11510930, Table 4, parallel (0.2 mm monolayer, infill 0 deg, section 2.3.4) |
| `cpla-protopasta.nowka.across` | cpla-protopasta | printed | across | 16.37 | community | coupon | Protopasta only | same, Table 4, perpendicular (0.2 mm monolayer, infill 90 deg, section 2.3.4) |
| `cpla-protopasta.nowka.through` | cpla-protopasta | printed | through | 8.005 | community | coupon | Protopasta only | same, Table 4, z direction (hollow cylinder, 0.2 mm layers, section 2.3.5); `note` required, see below |
| `cabs.capricate.along` | cabs | printed | along | 0.4382 | community | coupon | Torwell cABS | Schmitz et al. UIST 2015 (4.382 ohm mm, SD 1.285) |
| `cabs.capricate.across` | cabs | printed | across | 0.8171 | community | coupon | Torwell cABS | same, "perpendicular" is in plane (8.171 ohm mm, SD 0.658) |
| `cabs.capricate.through` | cabs | printed | through | 0.9976 | community | coupon | Torwell cABS | same, "vertical" is Z (9.976 ohm mm, SD 1.729) |
| `electrifi.nowka.along` | electrifi | printed | along | 0.021 | community | coupon | Electrifi | Nowka 2024 |
| `electrifi.nowka.across` | electrifi | printed | across | 0.048 | community | coupon | Electrifi | Nowka 2024 |
| `electrifi.nowka.through` | electrifi | printed | through | 0.061 | community | coupon | Electrifi | Nowka 2024 |
| `electrifi.grade10k` | electrifi | raw-filament | bulk | 0.01 (10,000 S/m) | vendor | datasheet | Electrifi | multi3dllc.com/product/electrifi |
| `electrifi.grade1k` | electrifi | raw-filament | bulk | 0.1 (1,000 S/m) | vendor | datasheet | Electrifi | same |

The Nowka through row is lower than the Nowka along row, and the Protopasta
vendor row and the PIP preset both run the other way (115 against 30, 2000
against 500). The axis labels were re-read against PMC11510930 on
2026-10-04: Table 4 gives 11.69 parallel, 16.37 perpendicular and 8.005 ohm
cm z direction, and the text reports z below the perpendicular in-plane value
for most composites, which it attributes to wider inter-layer contact. The
row is not swapped. The in-plane values come from 0.2 mm monolayers and the z
value from a hollow cylinder, so the three are different specimens and the
ordering holds for those specimens only. `cpla-protopasta.nowka.through` carries `note`
(`spec/profile.ts`, `ResistivityRow.note`) stating the specimen geometry and
Table 4 before it enters `profile.seed.json`. Profile conformance warns on
any printed row set for one brand and source where through is below along
and the through row has no note citing the source table or figure.

Materials with no row:

- `ctpu-eel`: inferred, no reference value. The Rev1 26-06 TDS lists
  1.1E+5 "Ohm.m" by IEC 62631-3-1; the older TDS gives 1.5E+3 with no unit
  by ANSI/ESD STM 11.12, which measures volume resistance in ohm. They
  disagree by about four orders of magnitude (vc C3).
- GUDGEON: the about 4 kohm per cm figure is computed. rho 30 ohm cm over
  the bench's 1.0 x 0.72 mm trace gives 4166.7 ohm per cm
  (`dl/dl-gudgeon-tang-keyway/extracted/gudgeon/05_part2d_circuit.js:171-175`;
  `runs/gud_out.json` `perCm` 4166.67). It adds no independent value to
  `cpla`, and no row is stored. The seed's "measured" wording is wrong.

Retired: the v3 working value 30 ohm cm for cPLA and 1500 ohm cm "Eel
class" for cTPU. The Electrifi 0.006 ohm cm figure is unverified (C-15) and
is not stored.

### 4.2 Rules (C-09)

- The Yousu 240 to 481 ohm cm figure is raw factory filament. The vendor
  page states that printed models do not share the filament resistance.
  The figure is never scaled onto printed traces, and printed traces are
  never multiplied by an 8 to 16x filament ratio.
- The Nowka 2024 figures are Protopasta conductive PLA only. They never
  apply to Yousu or to cPLA in general. Nowka's z value (8.005, hollow
  cylinder) is the lowest of the three, against the vendor's Z figure of
  115; the specimens differ, so the two orderings are not compared as one
  claim (section 4.1).
- A row with `brand` applies only to a material id of that brand. The
  lookup never returns a `cpla-protopasta` row for `cpla`.
- Raw-filament rows are never returned for a `printed` request. The lookup
  test asserts this.

### 4.3 Working row and lookup

`resistivity(material, direction, "printed")` returns:

| material | along | across | through | bulk |
|---|---|---|---|---|
| cpla | `cpla.pip.along` 500 | falls back to along with warning "no across row; in-plane figure used" | `cpla.pip.through` 2000 | `E_REF` |
| ctpu | `ctpu.pip.bulk` 400 for every direction, with a warning naming the direction | same | same | `ctpu.pip.bulk` |
| cpla-protopasta | `cpla-protopasta.xy` 30 | `cpla-protopasta.xy` with warning | `cpla-protopasta.z` 115 | molded 15 |

The vendor rows outrank the community rows for the same material in the
lookup because the design intent is the vendor's printed figure; the Nowka
rows stay available by row id for comparison and for the Capricate
reproduction reference. When a measured row exists for the material on the
build's machine, it outranks every other row.

The working cPLA row is the PIP preset, which is the shop's Yousu default
(inferred). PIP derived 500 and 2000 from the Yousu filament figure "on the
same ratio Protopasta report between moulded and printed"
(`pip/src/layout.js` comment above `phys`). PIP also ships a Protopasta
preset of 30 in plane, 115 across layers and 1500 contact TPU
(`pip/docs/electrical.md`).

CHK-NET-05 warns while the row it reads is inferred. Exports carry the
inferred warning, and public claims state the tier (D-082).

### 4.4 What reads these rows

- The circuit kernel: per-net resistance R = rho L / (w t) per direction
  from the built conductive geometry (D-086).
- The constraints solver: a resistance budget is a width floor (C-01,
  D-072). At 30 ohm cm (Protopasta XY, vendor), 62 mm path, 0.72 mm thick
  and an 8 kohm budget the floor is 300 x 62 / (8000 x 0.72) = 3.23 mm
  (computed); with the 0.80 printability and fatigue floors and a 6.00 mm
  pitch ceiling the legal band is 3.23 to 6.00 mm (computed). At the PIP
  preset 500 ohm cm (inferred) the floor is 53.8 mm and the query returns
  `E_UNSAT` naming 71.8 kohm as the budget that fits 6.00 mm (computed).
- Archetypes: resistances computed at load from the row and the declared
  section, so one coupon updates every archetype and the tier propagates
  (D-098). The seed archetype figures (for example printed-rotary-pot 709k
  and 14k) were computed on an assumed 1.0 x 0.72 section and retire.

## 5. Per-MCU pin table (D-076, C-02)

These rows live in the catalog (`PartRow.mcu`, `spec/catalog.ts`;
`McuPinSpec`, `spec/circuit.ts`) and are read by `circuit.solve` and
`catalog.pins`. They appear here because the operating-point verdict pairs
them with the resistivity rows above.

| catalog id | pullup | VIL max | VIH min | at | tier | source |
|---|---|---|---|---|---|---|
| `rp2040` | 50 to 80 kohm (range) | 0.8 V | 2.0 V | IOVDD 3.3 V | vendor | RP2040 datasheet pp. 616 to 617 |
| `pico` | inherits `rp2040` | 0.8 V | 2.0 V | 3.3 V | vendor (inherited) | not checked against the Pico datasheet (M05-T02 defect 7) |
| `esp32-c3` | 45 kohm typical | 0.825 V (0.25 VDD) | 2.475 V (0.75 VDD) | 3.3 V | vendor | ESP32-C3 datasheet v2.4 p. 55 |
| legacy BOSS | 50 kohm | single threshold 0.5 VIO (1.65 V) | | 3.3 V | kept only to reproduce BOSS | `boss-src.zip` `src/sim.js:91`, `:135` |
| legacy blocks.html hint | | 0.3 to 0.7 VIO (0.99 to 2.31 V) UI hint | | 3.3 V | never used for a verdict | `handoff/designs/blocks/legacy/blocks.html` hint code |

`circuit.solve` classifies each read LOW, UNDEFINED or HIGH per MCU and
sweeps both ends of a pullup range. The v3 sentence "a printed button on a
Teensy or ESP internal 45k pullup sits in the UNDEFINED band"
(`handoff/knowledge/00-constants.md:26-28`) is scoped by D-077: it holds for
short to medium cPLA wires at BOSS 50 kohm; default cTPU wires never
register a press (3.15 to 3.27 V, computed); under RP2040 thresholds a
2.05 V press reads HIGH and is missed (C-03). Real pullups and thresholds on
the shop's boards are an owner measurement (D-082).

## 6. Electrical constants, stack and bleed

### 6.1 Buried stack defaults (D-085, C-06)

From published PIP (`pip/src/layout.js:27-28`; `pip/docs/electrical.md:77-82`).

| constant id | value | tier | qualifier note |
|---|---|---|---|
| `stack.layer` | 0.24 mm | vendor | 0.4 preset layer height |
| `stack.skin` | 0.72 mm | inferred | PIP default |
| `stack.trace` | 0.72 mm | inferred | PIP default |
| `stack.iso` | 0.96 mm (4 layers PETG) | inferred | PIP default; started at 2 layers |
| `stack.overL2` | 1.68 mm on the 0.72 floor | inferred | PIP default |
| `stack.traceWidth` | 1.4 mm (about 3 lines at 0.4) | inferred | PIP default, drawn with no bleed |
| `stack.netToNetMin` | 0.60 mm | inferred | computed off the model by the net check; PIP's card calls it measured, meaning measured on the model |

PIP's net check refuses under 0.3 mm and its fits table fails under 0.4 mm
(computed, `pip/docs/electrical.md`). Retired v3 values: 0.48 insulation,
0.48 over layer 2 and the 0.3 net floor.

### 6.2 Bleed (D-084)

Bleed is the growth of a printed trace edge into its neighbour, one row per
(machine, material pair):

| machine | materials | bleed, mm | tier | source |
|---|---|---|---|---|
| any | any | 0 | inferred | default until a coupon measures it (D-084) |

Rules:

- `bleed(machine, a, b)` returns the row or the default 0 with tier
  inferred and reason "no coupon".
- Bleed is applied once, at emit, to every export of the design and to
  every coupon of it, so the coupon measures the geometry it calibrates.
- Published PIP draws 1.4 mm traces with no bleed; its coupon applies none
  either (vc C1). The 0.15 bleed, 1.25 drawn trace and 0.75 gap belong to
  unpublished HAFT (`kb/sources/latest/haft-toggle.md:161`) and are retired.

### 6.3 Skin, contact and read waits

| constant id | value | tier | source |
|---|---|---|---|
| `skin.ohm.pip` | 1 to 20 Mohm; the bench assumes 20 | inferred | `pip/docs/electrical.md:34-35` |
| `skin.ohm.gibWiper` | 300 kohm default, finger-pot wiper mode | inferred | `handoff/knowledge/00-constants.md:15` (GIB) |
| `read.keys.driveUs` | 30 us, drive high | inferred | `pip/docs/electrical.md` charge and release table |
| `read.keys.waitUs` | 3500 us in emitted firmware | inferred | `pip/firmware/pip_stick/pip_stick.ino:25`; chosen from crossings measured on a printed body, 113 to 2431 us (measured, `pip/README.md:155-180`) |
| `read.touch.driveUs` | 30 us, drive low | inferred | `pip/docs/electrical.md` |
| `read.touch.waitUs` | 1500 us | inferred | same |

`pip.ino` still ships `KEY_WAIT_US` 200 (`pip/firmware/pip/pip.ino:20`);
only `pip_stick` uses 3500. hackbuild-fab does not edit pip-controller
(D-080, owner; default: record the gap in RISKS.md and archetype
provenance). The computed figures beside these (RC tau 15.7 us, settle
78 us, touch accept under about 58 Mohm, reject under about 4 Mohm with
4.35 computed) belong to the read model (D-078, D-079).

Contact resistance and capacitance have rows of their own. `ContactRow`
(`spec/profile.ts`) prices one series contact by material pair and kind
(printed-interface, clip, solder, press) as an ohm range with provenance;
no row exists as of 2026-10-04, so a net with a terminal or a cPLA to cTPU
interface reports its total as a lower bound with qualifier unknown. The
constant `petg.epsR` (relative permittivity, unitless) has no sourced
value; until a datasheet or coupon gives one, net capacitance uses PIP's
rule of 7 pF pin plus 0.02 pF per mm plus 1 pF (inferred,
`pip/src/model.js:418`, `pip/src/layout.js:46`).

A wait calibration (`WaitCalibration`, `spec/circuit.ts`) is a profile row
written by a person from crossings measured with `pip_probe` on a coupon's
key cells or a printed body: coupon id, date, slowest crossing in us and
the chosen wait in us. The rule of thumb PIP states is a key wait about
five times the slowest settle (`pip/docs/electrical.md`). Until a
calibration exists the emitted firmware uses 3500 us.

## 7. Fits and process loss (D-100)

### 7.1 Loss table

One table keyed by (process A, process B, motion). Process A makes the
hole, process B makes the part that goes in it. A row may scope to a
machine, a material and a layer height.

Every gap in profile is per side (`GapBasis` in `spec/ids.ts`): the offset
one contour moves, the quantity a slicer's XY compensation applies. The
corpus figures are diametral or total across the joint: OGEE16 `fits.py`
subtracts shaft diameter from hole diameter, and its `PRINT_SHRINK` note
says a 0.05 per side shrink "counts four times in a tab-in-slot
clearance". Each corpus figure is halved on entry and the source column
keeps the original. Mixing bases is a factor of 2: a hinge drawn at 0.3
per side checked against a diametral band of 0.25 to 0.40 passes at half
its real clearance.

| processA | processB | motions | machine | material | layer | holeUnderPerSide, mm | outerOverPerSide, mm | tier | method | source |
|---|---|---|---|---|---|---|---|---|---|---|
| fdm | fdm | static, slide, rotate, snap, press | ffc5p | | | 0.075 | 0.05 | inferred | derived | `ogee16` `source/fits.py:4-8` docstring, 0.15 and 0.10 diametral; `handoff/knowledge/00-constants.md:41-48` |
| fdm | fdm | static, slide, rotate, snap, press | | petg | 0.24 | 0.125 | 0.075 | inferred | failure | OGEE16 TIMES.md "call it 0.40 lost", diametral (`kb/sources/benches/benches-mechanisms.md:340-358`); seed `petg.processLossAt024` 0.25/0.15 diametral |
| laser | fdm | static, slide, rotate, snap, press | ffc5p | | | 0 | 0.075 | inferred | derived | OGEE16 `source/params.scad:28` `PRINT_OVER = 0.15` across the part: a kerf-compensated cut slot lands on its drawn size, the printed part prints 0.15 over its drawn width |

The data holds one row per motion with equal values; the conformance test
asserts they agree until a coupon separates them. The ffc5p machine row is
a PLA-basis rule of thumb at the 0.4 nozzle. `PRINT_OVER` is 0.15 across
the part (0.075 per side) until a mixed coupon says otherwise; the 0.10
figure in 00-constants retires (D-100, plan-deltas R57). The loader
rejects a row whose `basis` is anything other than `perSide`.

Precedence (D-100): a matching material row wins over a machine row. Among
matches the most specific wins: material and layer, then material, then
machine and layer, then machine. A row with a layer matches only that layer
(within 0.005 mm). When the build's layer has no material row, the machine
row applies and the result carries tier inferred and a warning naming the
missing material row.

Three things move a printed hole that the four keys above do not hold. The
row carries each one as an optional field (`spec/profile.ts` `LossRow`).

| field | what it keys | how it is matched | evidence |
|---|---|---|---|
| `axis` | `vertical` (axis within 45 deg of build Z, circle in the layer plane) or `horizontal`, in the print pose | read after frame emit (D-047 stage 7), so a part with a declared `pose` (D-063) is matched in its print orientation; the bore picks holeUnderPerSide from its row and the pin picks outerOverPerSide from its own row | DETENT rev C vertical holes +0.20, horizontal +0.35; rev D states the same allowances as printability rules (inferred, section 7.5) |
| `dRange` | drawn diameter band [lo, hi) mm, a size across the joint, not a gap | the bore's drawn diameter | small holes lose more to polygon chords and the seam; no shop figure yet |
| `comp` | slicer compensation the row was measured under | compared with the active preset's `comp` (section 8.1) | gold 0.4 preset: xy hole 0, xy contour 0, elephant foot 0.1 (vendor) |

Within one rank of the precedence list, a row that names `axis` or `dRange`
and matches beats a row that leaves them unset; `axis` counts before
`dRange`. A row that names `axis` or `dRange` never matches a query that
does not supply it, so `realGap` called without a feature reads only the
plain rows and the D-100 pin of section 7.2 is unchanged. Today every row
above leaves all three unset; the fit-gauge coupon (section 11.3) is the
only writer of axis and diameter rows.

Slicer compensation is the user's process preset in the 3MF dialect (D-159
writes no process keys), so a user who turns on X-Y hole compensation moves
every bore after the fit check has passed. Two rules close that:

- The 3MF writer emits the preset's `xy_hole_compensation`,
  `xy_contour_compensation`, `elefant_foot_compensation` and
  `elefant_foot_compensation_layers` as per-object overrides in
  `Metadata/model_settings.config` on every object (D-159 per-object
  overrides). Whether Flash Studio honours a per-object override of each
  key is unknown until the M00 round trip; a key it drops is written to the
  print card as a slicer setting the person must match, and the export
  carries a BuildWarning naming it.
- A loss row records the `comp` it was measured under. When the active
  preset differs on any field, the lookup still returns the row and adds a
  BuildWarning naming both values. A row without `comp` is not compared;
  coupon rows must carry it (section 11.1).

Chord loss from the kernel's own tessellation is computed and stays out of
the table: a circle of radius r drawn as n segments sags r (1 - cos(pi/n))
at each chord midpoint. Diameter-banded rows are measured on bores built
at the default segment count, which the coupon record stores.

Elephant foot belongs to the slicer when the preset compensates it. The
`relief` kind (D-059, KNURL) reads `comp.elephantFoot`: above 0 it emits no
geometry and records a metric naming the slicer value; at 0 it emits its
declared width. On the gold 0.4 preset (0.1) the relief is off; on the
0.25 preset (0) it is on.

### 7.2 realGap

`realGap(drawnPerSide, side, machine, material, layer?, feature?)`
converts a drawn gap per side to the real gap per side. `layer` defaults to
the machine's default preset layer (0.24 on ffc5p). Input, loss rows, fit
bands and output share one basis, per side; nothing in profile is
diametral.

A drawn gap per side comes from the two drawn sizes across the joint
through `gapPerSide(hole, mate)` = (hole - mate) / 2 (`spec/profile.ts`).
A bore drawn 5.0 around a pin drawn 4.6 has a drawn gap of 0.2 per side; a
slot drawn 10.4 around a tab drawn 10.0 has 0.2 per side. Features declare
mating gaps as `FitDecl` (`class`, `drawnPerSide`, `basis`) in
`spec/features.ts`: `hinge.fit`, `thread.fit`, `bayonet.radialFit` and
`bayonet.axialFit`, `contact.fit`. bore, pocket and tabSlot name a class and
the kernel derives `drawnPerSide` from the drawn sizes of the declared
mate, so every mating gap reaches the fit check through the same
`realGap` call.

| side | process pair | real gap per side |
|---|---|---|
| hole | fdm hole around an fdm part | drawnPerSide - holeUnderPerSide - outerOverPerSide |
| outer | fdm part in a cut hole (laser) | drawnPerSide - outerOverPerSide |

`realGaps` returns both sides. Pinned by test (D-100), on the per-side
basis:

| call | result per side, mm | same joint across the part, mm | qualifier |
|---|---|---|---|
| `gapPerSide(5.0, 4.6)` | 0.2 | 0.4 | computed |
| `realGap(0.275, "hole", "ffc5p", "petg")` | 0.275 - 0.125 - 0.075 = 0.075, to 6 digits (material row) | 0.55 drawn, 0.15 real: the D-100 figure | computed |
| the same call with the petg row removed | 0.15 (machine row) | 0.30 | computed |
| the same call at layer 0.20 | 0.15 (machine row) with a warning naming the missing material row | 0.30 | computed |
| `realGap(0.275, "outer", "ffc5p", "petg")` | 0.20 | 0.40 | computed |

D-100 states its pin as `realGap(0.55, "hole", "ffc5p", "petg")` = 0.15,
on the diametral basis the corpus used. The joint and the numbers are the
same; the call takes half of each. DECISIONS.md needs an entry
superseding the wording of that pin (listed in the PR body).

A test fixture (not profile data) adds a petg layer 0.24 row with `axis`
horizontal and holeUnderPerSide 0.20 (0.40 across the bore): a bore with
`holeAxis` horizontal then gives 0.00 per side, `holeAxis` vertical and the
call with no feature still give 0.075 per side. Every figure in this
section was computed by running the resolution below on per-side rows
(`gapcheck/run.ts` in a session scratch folder, 2026-10-04), in the order of the table and
then the fixture: 0.200000, 0.075000, 0.150000, 0.150000, 0.200000,
0.000000, 0.075000, 0.075000.

The resolution, type-checked against `spec/` with TypeScript 7.0.2
(`tsc --strict --noEmit`, exit 0, scratch copy
`x/tsc/profile-doc/loss-example.ts` in a session scratch folder):

```ts
import type { Mm, Process } from "./ids";
import type { FitMotion, GapFeature, LossRow, PrintAxis } from "./profile";

export type GapSide = "hole" | "outer";

const PAIR: Readonly<Record<GapSide, readonly [Process, Process]>> = {
  hole: ["fdm", "fdm"],
  outer: ["laser", "fdm"],
};

export interface LossPick {
  readonly row: LossRow;
  /** 3 material and layer, 2 material, 1 machine and layer, 0 machine. */
  readonly rank: 0 | 1 | 2 | 3;
  /** Tie-break within a rank: 2 axis, 1 dRange, 3 both, 0 neither. */
  readonly extra: number;
}

/** Most specific matching row wins; material beats machine (D-100). */
export function pickLoss(
  rows: readonly LossRow[], side: GapSide, machine: string,
  material: string, layer: Mm, motion: FitMotion = "static",
  axis?: PrintAxis, d?: Mm,
): LossPick | undefined {
  const [a, b] = PAIR[side];
  const sameLayer = (r: LossRow): boolean =>
    r.layer !== undefined && Math.abs(r.layer - layer) < 0.005;
  /** 2 for a matching axis, 1 for a matching dRange; -1 when either misses. */
  const extra = (r: LossRow): number => {
    if (r.axis !== undefined && r.axis !== axis) return -1;
    if (r.dRange !== undefined && (d === undefined || d < r.dRange[0] || d >= r.dRange[1])) return -1;
    return (r.axis !== undefined ? 2 : 0) + (r.dRange !== undefined ? 1 : 0);
  };
  let best: LossPick | undefined;
  for (const r of rows) {
    if (r.processA !== a || r.processB !== b || r.motion !== motion) continue;
    if (r.machine !== undefined && r.machine !== machine) continue;
    const x = extra(r);
    if (x < 0) continue;
    let rank: LossPick["rank"];
    if (r.material !== undefined) {
      if (r.material !== material) continue;
      if (r.layer !== undefined && !sameLayer(r)) continue;
      rank = r.layer !== undefined ? 3 : 2;
    } else {
      if (r.machine === undefined) continue;
      if (r.layer !== undefined && !sameLayer(r)) continue;
      rank = r.layer !== undefined ? 1 : 0;
    }
    if (best === undefined || rank > best.rank || (rank === best.rank && x > best.extra)) {
      best = { row: r, rank, extra: x };
    }
  }
  return best;
}

/**
 * Per side throughout. hole: drawnPerSide - holeUnderPerSide -
 * outerOverPerSide. outer: drawnPerSide - outerOverPerSide. The bore and
 * the pin each pick their own row by their own print axis.
 */
export function realGapFrom(
  rows: readonly LossRow[], drawnPerSide: Mm, side: GapSide,
  machine: string, material: string, layer: Mm, f: GapFeature = {},
): Mm {
  const need = (axis: PrintAxis | undefined): LossRow => {
    const pick = pickLoss(rows, side, machine, material, layer, "static", axis, f.d);
    if (pick === undefined) throw new Error(`E_REF no loss row for ${side} ${machine} ${material} at ${layer}`);
    return pick.row;
  };
  const over = need(f.outerAxis).outerOverPerSide;
  return side === "hole"
    ? drawnPerSide - need(f.holeAxis).holeUnderPerSide - over
    : drawnPerSide - over;
}
```

In the package the thrown error is a `CommandError` with code `E_REF`, the
pick's row, rank and tie-break go to the read log so `profileHash` covers
it, and a `comp` mismatch between the row and the active preset adds the
BuildWarning of section 7.1.

### 7.3 Fit classes

Bands are on the real gap per side after loss (`FitBand.realLoPerSide`,
`realHiPerSide`). A band row holds no drawn figure. The drawn gap that
lands a joint in its band is a function of the band and the loss row, so
it is derived by `ProfileLookup.drawnFor` (`spec/profile.ts`) and never
typed. The default rows come from `handoff/knowledge/00-constants.md:57-69`
and the seed `fits` array, whose figures are diametral or total across the
joint; each is halved here and the last column keeps the source figure.
They load at tier inferred, method derived.

| class | process pair | motion | real band per side, mm | meaning | source figure across the joint, mm |
|---|---|---|---|---|---|
| SLIDE | fdm, fdm | slide | 0.125 to 0.20 | moves every actuation | real 0.25 to 0.40 (drawn hint not loaded: 0.50 to 0.70 in 00-constants, 0.50 to 0.75 in the seed, 0.50 to 0.65 in OGEE16 fits.py) |
| LOCATE | fdm, fdm | static | 0.00 to 0.075 | assembles by hand, stays | real 0.00 to 0.15 (drawn 0.25 to 0.40 not loaded) |
| PRESS | fdm, fdm | press | -0.075 to -0.025 | must not come apart; the hole shrinking grips | real -0.15 to -0.05 (drawn 0.05 to 0.15 not loaded) |
| SNAP | fdm, fdm | snap | -0.65 to -0.075 | banded on catch interference; the lead-in angle decides | -1.30 to -0.15 (`fits.py` hole minus barb diameter) |
| GUIDE | fdm, fdm | slide | 0.15 to 0.275 | printed in printed, must guide | real 0.30 to 0.55 (drawn 0.55 to 0.80 not loaded) |
| PGUIDE | laser, fdm | slide | 0.15 to 0.275 | printed in cut, must guide | real 0.30 to 0.55 |
| PSLIP | laser, fdm | slide | 0.15 to 0.275 | printed part sliding in a cut slot | real 0.30 to 0.55; cut slot = part drawn + 0.15 + target |
| LAP | laser, laser | static | 0.075 | laser tab in laser slot | 0.15 |
| SLIP | laser, laser | slide | 0.20 | laser part sliding in laser | 0.40 |
| HOLDER | fdm, paper | static | unknown | card insert in a printed holder; COTTER draws the channel at card thickness + 1.0 (frame gap 1.4, lip 2.4), a design parameter until a paper loss row exists | channel card + 1.0 |

The source drawn figures are dropped because they disagree with the loss
table they were meant to pair with. The 00-constants SLIDE hint of 0.50 to
0.70 drawn (the seed says 0.50 to 0.75, fits.py 0.50 to 0.65) across the joint is 0.25 to 0.35 per side; through the petg
row (section 7.2, 0.125 + 0.075 per side) it gives 0.05 to 0.15 real,
below most of the 0.125 to 0.20 band it hints at (computed).

`drawnFor(cls, side, machine, material, layer?, feature?)` inverts
`realGap` over the same row pick: side `hole` returns real +
holeUnderPerSide + outerOverPerSide, side `outer` returns real +
outerOverPerSide, for each end of the band. When no loss row matches
(HOLDER and the laser, laser classes today) it returns null,
constraints.query lists the param under `unbound` with why `no-loss-row`,
and CHK-FIT-01 reports skip with reason "no loss row for <pair>; cut the
fit-gauge coupon". It throws `E_REF` for an unknown class id or when
`side` disagrees with the band's process pair. Readers:

- `fits.table` (the FITS rows of UI.md and AGENT-SURFACE.md) shows drawn
  and real from `drawnFor` and `realGap` on the same rows, so the two
  columns cannot drift apart.
- The constraint dims of bore, pocket, tabSlot and contact gap register a
  `Bound` from `drawnFor` with the fit class as `reason` (no Bound when it
  returns null; the param is `unbound`), so a slider over
  a drawn gap stops at the drawn ends of the class band.
- A test asserts `realGap(drawnFor(...)[i], ...)` returns the band end to
  6 digits for every class and loss row in the seed.

Results on the seed rows at ffc5p, layer 0.24, no feature (computed, the
same resolution as section 7.2):

| call | drawn per side, mm | row picked |
|---|---|---|
| `drawnFor("SLIDE", "hole", "ffc5p", "petg")` | 0.325 to 0.40 | petg, layer 0.24 |
| `drawnFor("LOCATE", "hole", "ffc5p", "petg")` | 0.20 to 0.275 | petg, layer 0.24 |
| `drawnFor("PRESS", "hole", "ffc5p", "petg")` | 0.125 to 0.175 | petg, layer 0.24 |
| `drawnFor("GUIDE", "hole", "ffc5p", "petg")` | 0.35 to 0.475 | petg, layer 0.24 |
| `drawnFor("SLIDE", "hole", "ffc5p", "pla")` | 0.25 to 0.325 | ffc5p machine row (0.075 + 0.05), with the missing-material-row warning |
| `drawnFor("PSLIP", "outer", "ffc5p", "petg")` | 0.225 to 0.35 | (laser, fdm) ffc5p machine row |

PSLIDE is dropped; a lookup of `PSLIDE` returns `E_REF` naming PSLIP
(D-100). PSLIP's print-over is the outerOverPerSide of the (laser, fdm)
loss row, 0.075 per side (0.15 across the part) until a mixed coupon
(section 7.1).

SNAP carries two constraints, the catch and the closure. A pin whose barb
had to close 1.4 mm to pass a bore while the slot between its legs was
1.0 mm wide passed a catch-only check and could not be inserted
(`handoff/knowledge/00-constants.md:76-78`).

### 7.4 Felt bands from OGEE16

OGEE16 raised its bands 0.20 mm after the printed parts "still feel tight";
`fits.py` records "in band on paper is not the same as loose enough in the
hand, and the hand wins" (`ogee16` `source/fits.py:36-40`). These rows keep
method `felt` and stay separate from the defaults. A design that wants them
declares the felt class id.

| class id | process pair | band as shipped, across the joint | real band per side, mm (computed with LOSS 0.25 diametral, 0.125 per side) | source |
|---|---|---|---|---|
| `SLIDE.felt-ogee16` | fdm, fdm | 0.70 to 0.90 drawn | 0.225 to 0.325 | `fits.py:38`; `printed.scad` FIT_SLIDE 0.75 (up from 0.55) |
| `LOCATE.felt-ogee16` | fdm, fdm | 0.25 to 0.40 drawn | 0.00 to 0.075 | `fits.py:39` |
| `PRESS.felt-ogee16` | fdm, fdm | 0.00 to 0.16 drawn | -0.125 to -0.045 | `fits.py:40` |
| `PSLIP.felt-ogee16` | laser, fdm | 0.45 to 0.70 real | 0.225 to 0.35 | `fits.py:38`; `params.scad:31` FIT_PSLIP = FIT_SLIP + PRINT_OVER + 0.15, "0.55 drawn left 0.40 real, which measured fine and felt tight" |
| `SNAP.felt-ogee16` | fdm, fdm | -1.30 to -0.15 real | -0.65 to -0.075 | `fits.py:38` |

All felt rows are tier inferred. OGEE16 also ships `PRINT_SHRINK` 0.05 per
side for frame joints, because the shrink applies to both halves of a joint
and counts four times in a tab-in-slot clearance; PRINT.md's 0.075 retires
(`kb/sources/benches/benches-mechanisms.md:301`). That note is the corpus
meeting the basis problem: on the per-side basis the shrink is 0.05 on the
slot wall plus 0.05 on the tab wall, 0.10 per side, and it is counted once.

Which band set a new design defaults to (the 00-constants bands or the
felt bands) is open until the fit-gauge coupon (section 11.3) records real
outcomes on the shop's machine.

### 7.5 Other loss and allowance figures in the corpus

These are evidence for the coupon and are not loaded as loss rows, because
the loss table has one model.

| source | figures | status |
|---|---|---|
| KNURL | per wall convex 0.1, concave 0.15; elephant foot 0.25 over the first 0.5 mm | convex and concave: candidate fields (section 13); elephant foot: owned by the preset `comp` and the `relief` rule of section 7.1 |
| DETENT rev C | vertical holes +0.20, horizontal holes +0.35 (diametral; 0.10 and 0.175 per side), self-tap -0.30, bed chamfer 0.6 as three stepped layers, walls in whole 0.4 lines, slicer hole compensation off | inferred, not coupon-measured (`kb/sources/benches/benches-machines.md:1160-1165`); the axis split is why `LossRow.axis` exists, and the fit-gauge coupon writes the rows |
| DETENT rev D | states the allowances as rules: bores +0.20 on diameter vertical and +0.35 horizontal, bed face stepped back 0.6 over the first three layers, slicer hole compensation off because the allowance is in the geometry | inferred, not coupon-measured; rev D records no print (`dl/dl-robots-machines/unzipped/detentfiles/DETENT-build-notes.md:131-140`) |
| KNURL first print | print clr 0.15, axial 0.3, pawl fit 0.2 jammed (`dl/dl-ogee-stipple-mech/knurl/knurl.json`, 2026-09-07 16:33) | inferred, failure |
| KNURL refit | clr 0.4, lock 0.55, cup 0.4, bore 0.35, foot 0.25, footZ 0.5, notch 0.6, axial 0.5, lidGap 0.4, pawl fit 0.5 (`dl/dl-ogee-stipple-mech/knurl/knurl (1).json`, 2026-09-07 23:06) | design parameters after the failure; basis not stated, no coupon |
| SLATE r5 | D pin bore clearance 0.20 per side (the bench labels it per side), axial 0.40, seam 0.30, latch gap 0.4, grab 0.6, at layer 0.24 (`dl/dl-cases/slate/slate-r5.html`, `hinge` and `latch` params) | design parameters |
| SCABBARD r1 | lid lip clearance 0.15, snap depth 0.35 (`dl/dl-cases/scabbard/scabbard.html`, `lipClear`, `snapDepth`) | design parameters |
| TAPPET FAB | one `FIT` 0.4 for both the laser DXF and the print STL, 1.75 mm filament stub as pin (`dl/dl-boards-tools/tappet/tappet-fab.html`) | design parameter; one figure across two processes |
| KERF Eurorack designer, 2026-05-05 | vinyl copper trace min 1.5, clearance 1.0, pad disc 2.5, angles in 45 deg steps (`dl/dl-boards-tools/collisions/kerf (2).html` `ROUTING_RULES`) | design parameters; candidates for copper rule rows, not loss rows |
| TUMBLER | kerf rules and 0.2 per face for prints | inferred |
| COTTER | peg under hole 0.5 to 1.6, slot clearance 0.1 to 0.5 (UI ranges), slotFit default 0.2 | design parameters |

## 8. Machines (D-101)

| id | name | process | envelope | toolheads | kerf | tier | source |
|---|---|---|---|---|---|---|---|
| `ffc5p` | Flashforge Creator 5 Pro | fdm | 256 x 256 x 256 mm | 4 rows (section 8.3) | n/a | vendor | gold `printable_area` 0x0 to 256x256, `printable_height` 256, `nozzle_diameter` has 4 entries |
| `centauri` | Elegoo Centauri Carbon | fdm | 256 x 256 x 256 mm | none recorded; every slot fails CHK-3MF-09 until a person enters the rows | n/a | vendor | seed (NACELLE); DERRICK and the OGEE plates target it |
| `laser1220` | shop laser | laser | sheet 1220 x 610 mm | none | null until measured | inferred | seed "shop; cut the coupon" |
| `sheet600` | laser sheet 600 x 400 | laser | sheet 600 x 400 mm | none | null until measured | inferred | seed (SLUG, OGEE sheets) |
| `cricut` | Cricut, copper tape roll | vinyl | roll 101.6 x 10058 mm (4 in x 33 ft) | none | n/a | vendor | seed (STAVE tape roll) |

Usable FDM bed after margin: 236 x 236 mm at a 10 mm inset on all four sides
(inferred, OGEE16 `build_plate.py` `MARGIN=10`). Creator 5 Pro
configuration per 00-constants: four FlashSwap toolheads, textured PEI,
heated chamber, corexy, `single_extruder_multi_material=0` (inferred).
Flash Studio is OrcaSlicer 2.3.2 under a `BambuStudio-01.10.01.50` header
(vendor, read from owner saves). The header string is in all 25 harvested
owner 3MFs (vc C2). The version is confirmed in owner saves recovered from
Downloads on 2026-10-04: `3D/3dmodel.model` carries `OrcaSlicer-Version`
2.3.2 in `dl/dl-pip-latest/haft/haft (3).3mf`, `haft (5).3mf`,
`dl/dl-pip-latest/toggle/toggle-solo4.3mf`, `dl/dl-pip-latest/tenon/tenon
(1).3mf`, and the BAFFLE, SASH, COTTER and FEELER saves. Files written by
a bench writer carry no version line.

Kerf: `laser1220` and `sheet600` keep `kerf: null`. An export with
`kerfMode` `outline` (the default; `spec/commands.ts` nest.pack and
export.run) and a null kerf returns `E_PARAM_MISSING` with path
`hbf://profile/machine/<id>#/kerf` (exit 2, M07). Its `next` offers the
same call with `kerfMode` `none`, which draws at nominal and needs no kerf,
and `knowledge.search` for the kerf coupon, which a person cuts before
entering the value. Kerf values in the corpus are
evidence for the kerf coupon, not rows: OGEE16 `cutfiles.py` `KERF = 0.18`
"measured beam width. Set this from the test coupon" (no coupon record);
COTTER default 0.15, "fit test one bin; tight raise 0.03, loose lower 0.03"
(`kb/sources/latest/cotter-sparger.md:372`).

### 8.1 Presets

A preset is harvested from a slicer save. Its id is
`<machine>[-n<nozzle x 100>]_<yyyymmdd>`, dated by the slicer save it came
from. D-101 gives `ffc5p_20260919` as an example of the form; the files
dated 2026-09-18 local in `pip/print/` were written by PIP's own writer from
the 97-key template, so they are not a preset source.
`dl/dl-pip-latest/haft/haft (5).3mf` (2026-09-19 07:13) is a slicer save,
and its process values (layer 0.24 over 0.25, line 0.42, 2 walls, 15
percent infill, comp 0, 0, 0.1) all equal `ffc5p_20260819`, so no
`ffc5p_20260919` row is added; it would be a dated duplicate.

| preset id | nozzle | layer | line width | printer | process | filament presets | bed type | tier | source |
|---|---|---|---|---|---|---|---|---|---|
| `ffc5p_20260819` | 0.4 | 0.24 | 0.42 (outer 0.42, inner 0.45); first layer 0.25; 2 walls; 15 percent infill | Flashforge Creator 5 Pro 0.4 nozzle | 0.24mm Standard @FF C5 | Flashforge HS PETG @FF C5P; Flashforge PETG Pro @FF C5P; Generic PETG @FF C5P | Textured PEI Plate (owner) | vendor | gold `project_settings.config` |
| `ffc5p-n025_20260819` | 0.25 | 0.12 | 0.25; first layer 0.1; 3 walls | Flashforge Creator 5 Pro 0.25 nozzle | 0.12mm Standard @FF C5 0.25 nozzle | Generic HS PLA @FF C5P 0.25 nozzle (nozzle 220, max volumetric 2.8) | Textured PEI Plate (owner) | vendor | hsl `project_settings.config` |

Bed type (`MachinePreset.slicer.bedType`, D-226) is the one column not
read from the preset's own save: tier owner, source owner report
2026-10-05 (the owner prints on textured PEI, and app exports without the
key opened on the cold plate in Flash Studio); 14 of 18 owner Creator 5
Pro saves carrying the key read Textured PEI Plate (High Temp 3, Cool 1),
counted 2026-10-05 (`packages/profile/src/lookup.ts` FFC5P_BED_TYPE). The
gold and hsl saves wrote High Temp Plate, so the value follows the preset,
not the gold. Both writers emit it as `project_settings` `curr_bed_type`,
the ninth scalar key outside the template (M00-T07 step 2, CHECKS.md
CHK-3MF-03).

The harvest reads `wall_loops` into `wallLoops` (2 for `ffc5p_20260819`,
3 for `ffc5p-n025_20260819`, vendor; CHK-PRT-04 reads it for the
perimeter band, D-198), `layer_height` into `layer` and
`initial_layer_print_height` into `firstLayer` (spec/profile.ts
MachinePreset): 0.24 over a 0.25 first layer for `ffc5p_20260819`, 0.12
over a 0.1 first layer for `ffc5p-n025_20260819` (vendor, read from
`3d/coin/hsl.3mf` on 2026-10-04). Layer tops sit at firstLayer + n x
layer, so a Z snap that assumes multiples of `layer` is off by 0.01 mm on
the 0.4 preset.

Slicer compensation per preset (`MachinePreset.comp`, section 7.1), read
from the same saves:

| preset id | xy_hole_compensation, mm | xy_contour_compensation, mm | elefant_foot_compensation, mm | elefant_foot_compensation_layers | tier | source |
|---|---|---|---|---|---|---|
| `ffc5p_20260819` | 0 | 0 | 0.1 | 1 | vendor | gold `project_settings.config:186-187, 1590-1591` |
| `ffc5p-n025_20260819` | 0 | 0 | 0 | 1 | vendor | `3d/coin/hsl.3mf` `project_settings.config` |

The writer emits these four values as per-object overrides on every object
it writes, so a fit verdict holds against the slicer the file opens in.

Application string for both: `BambuStudio-01.10.01.50` (D-159). 24 of the
25 owner 3MFs use the 0.4 preset; `3d/coin/hsl.3mf` uses the 0.25 preset
(vc C2). The filament pattern `Generic {TYPE} @FF C5P` stays the writer's
fallback for a type the harvested presets lack. PETG (gold) and PLA
(`baffle-wire.3mf`, section 9.1) are harvested.

TPU resolves inconsistently when Flash Studio opens a writer file that
names `Generic TPU @FF C5P`. Slicer saves recovered from Downloads show
two outcomes:

| outcome | saves | what reaches the slice |
|---|---|---|
| rewritten to `Generic TPU @System` | `dl/dl-gudgeon-tang-keyway/feeler/feeler-ladder (2).3mf` (2026-09-08); `dl/dl-pip-latest/haft/haft (3).3mf`, `haft (5).3mf` (2026-09-18 to 19) | system values; the written overrides are replaced (nozzle 240, flow 1 against the writer's 225 and 0.98) |
| forked as a project copy `Generic TPU @FF C5P(<file>)` | BAFFLE (`dl/dl-baffle-inlay-coin/baffle/baffle-wire.3mf`, 2026-09-12), FEELER thinpot (2026-09-10), TOGGLE (`toggle-solo4.3mf`), TENON (`tenon (1).3mf`) | the written values, kept under the forked name |

The writer files beside these saves (`haft (4).3mf`, `baffle-wire
(1).3mf`, `tenon.3mf`) carry the plain name. `<preset>(<file>)` is the
slicer's project-fork form, a copy of the preset scoped to that file
(inferred from these saves; the rule that picks fork or rewrite is
unknown). Until a TPU preset
is harvested from a fresh slicer install, a TPU slot carries a
BuildWarning that its written values may not reach the slice.

### 8.3 Toolheads and slot assignment

`Machine.toolheads` lists the installed toolheads in index order
(spec/profile.ts Toolhead: `index`, `nozzleMm`, `nozzleMaterial`,
`flexOk`, provenance). It replaces the v3 toolhead count. The count could
not say which head carries which nozzle, so no check could refuse cTPU on
a head with a brass 0.25 nozzle. FlashSwap heads change between prints,
so these rows are a shop fact that a person edits when a nozzle changes,
on the same write path as coupons (section 11.1).

| machine | index | nozzleMm | nozzleMaterial | flexOk | tier | source |
|---|---|---|---|---|---|---|
| `ffc5p` | 1 | 0.4 | hardened_steel | true | vendor | gold `nozzle_diameter` and `nozzle_type` element 1; flexOk from gold `extruder_type` Direct Drive |
| `ffc5p` | 2 | 0.4 | hardened_steel | true | vendor | same, element 2 |
| `ffc5p` | 3 | 0.4 | hardened_steel | true | vendor | same, element 3; PIP printed TPU 95A here (`pip-controller/docs/printing.md:19`) |
| `ffc5p` | 4 | 0.4 | hardened_steel | true | vendor | same, element 4; PIP printed Yousu cTPU here (`pip-controller/docs/printing.md:20`) |

These four rows restate what the Flashforge printer preset writes into a
save, read from `collar-coin/uploads/hackbuild-coin-nfc.3mf` on
2026-10-04. They do not record what is screwed into the shop's heads; the
tier stays vendor until a person confirms the installed nozzles. The 0.25
save (`3d/coin/hsl.3mf`) writes `nozzle_diameter` 0.25 and `nozzle_type`
`hardened_steel` on all four heads, so swapping to that preset means
editing all four rows.

The slicer carries its own abrasion fields: gold `required_nozzle_HRC` is
`['3','3','3']` per filament and `nozzle_hrc` is 0, the same in hsl.3mf
(vendor). Flash Studio opened and saved both files with those values, so
the check does not rely on the slicer to refuse an abrasive filament.

Slot resolution at export:

| step | rule |
|---|---|
| resolve | each chase MaterialSlot maps to `toolhead` when declared (`from: "declared"`), otherwise to toolhead `slot` (`from: "default"`) |
| record | the 3MF writer writes the ToolheadAssignment list to `Metadata/hackbuild_chase.json` under `toolheads`, beside chase id and build hash (D-159) |
| check | CHK-3MF-09 reads that list, the machine's toolhead rows, the preset's `nozzle`, and each material's `handling` |
| print card | the card prints one line per slot: slot, material, toolhead, nozzle bore and material |

`filament_map` is not where the assignment goes. Both Flash Studio saves
on record write `filament_map` `['1','1','1']` with `filament_map_mode`
`Auto For Flush`, so the slicer's own map does not record a slot to head
assignment, and D-159 keeps the gold value. If an owner save with a manual
head assignment shows a different encoding, the writer adopts it and the
check reads it in the same change.

### 8.2 Fab houses (plan-deltas R61)

Board fabrication options that change what a design may declare live as
dated rows, because a house can change its service list without notice.
Each row carries the date it was checked and its source. The rows enter
`packages/profile/data/fab-houses.json` at M08 (milestones/M08-board-catalog.md
M08-T03) with tier `vendor` and method `listing`; the board exporter
copies the row and its date onto the fab notes it writes.

| house | fact | checked | tier | source |
|---|---|---|---|---|
| PCBWay | pink soldermask only through the Advanced PCB service, not the standard prototype order | by 2026-10-04 | vendor | PCBWay orderonline.aspx (verified-claims.md C13) |
| JLCPCB | no pink soldermask in the published capabilities | by 2026-10-04 | vendor | JLCPCB capabilities page (verified-claims.md C13) |

A board chase that declares a pink mask for JLCPCB, or for PCBWay without
the Advanced PCB service, gets a BuildWarning quoting the row and its date.
Other houses and facts enter as rows only with a dated primary source.

## 9. PETG table from the gold round trip (D-101, D-159)

The gold save carries three PETG presets, one per slot. The 3MF writer
writes per-slot values for the 127 template keys; a slot whose preset name
matches a harvested preset writes that preset's values. Values are strings
as the slicer stores them (vendor, read from gold
`Metadata/project_settings.config` on 2026-10-04).

| key | slot 1 | slot 2 | slot 3 |
|---|---|---|---|
| filament_settings_id | Flashforge HS PETG @FF C5P | Flashforge PETG Pro @FF C5P | Generic PETG @FF C5P |
| filament_vendor | Flashforge | Flashforge | Generic |
| nozzle_temperature | 235 | 255 | 255 |
| nozzle_temperature_initial_layer | 235 | 255 | 255 |
| nozzle_temperature_range_low / high | 220 / 260 | 220 / 260 | 220 / 260 |
| hot_plate_temp, textured_plate_temp, eng_plate_temp (and initial layer) | 85 | 85 | 85 |
| filament_max_volumetric_speed | 18 | 12 | 12 |
| fan_max_speed | 50 | 70 | 70 |
| fan_min_speed | 30 | 40 | 40 |
| overhang_fan_speed | 100 | 90 | 90 |
| overhang_fan_threshold | 95% | 10% | 10% |
| close_fan_the_first_x_layers | 2 | 3 | 3 |
| fan_cooling_layer_time | 30 | 30 | 20 |
| slow_down_min_speed | 20 | 15 | 15 |
| slow_down_layer_time | 8 | 8 | 8 |
| pressure_advance (enable_pressure_advance 1) | 0.06 | 0.07 | 0.06 |
| filament_flow_ratio | 1 | 1 | 1 |
| filament_density | 1.27 | 1.27 | 1.27 |
| filament_diameter | 1.75 | 1.75 | 1.75 |
| temperature_vitrification | 70 | 70 | 70 |
| filament_shrink | 100% | 100% | 100% |
| filament_minimal_purge_on_wipe_tower | 15 | 15 | 15 |
| filament_cost | 30 | 30 | 30 |
| filament_retraction_length | nil | nil | nil |
| filament_map | 1 | 1 | 1 |
| filament_self_index | 1 | 2 | 3 |
| filament_extruder_variant | Direct Drive Standard | Direct Drive Standard | Direct Drive Standard |

17 of the 127 list keys differ between slots in the gold (computed
2026-10-04): close_fan_the_first_x_layers, fan_cooling_layer_time,
fan_max_speed, fan_min_speed, filament_colour, filament_max_volumetric_speed,
filament_multi_colour, filament_self_index, filament_settings_id,
filament_start_gcode, filament_vendor, nozzle_temperature,
nozzle_temperature_initial_layer, overhang_fan_speed,
overhang_fan_threshold, pressure_advance, slow_down_min_speed. Of COLLAR's
99 verbatim keys, 9 differ (vc C2), which is why COLLAR's `rep()` writing
one value to every slot is a defect (C-07). `filament_map`,
`filament_self_index` and `filament_extruder_variant` are kept (D-159).

Retired PETG tables (four copies disagreed,
`kb/sources/benches/benches-coins-inlay.md` 7.3):

| PETG value | COLLAR | SPRUE py | SPRUE html | skill materials.json | gold (this table) |
|---|---|---|---|---|---|
| nozzle | 250 | 245 | 245 | 240 (first 245) | 235, 255, 255 |
| bed | 80 | 75 | 75 | 70 | 85 |
| max volumetric | 12 | 12 | 12 | 10 | 18, 12, 12 |

`handoff/seed/3mf/materials.json` (Orca Generic ballparks) stays as the
fallback for filament types the harvested saves lack (ABS, ASA, PC, PA,
PVA, and TPU until a fresh-install preset is harvested), tier vendor with
the note that its own text calls the values ballparks. PLA comes from
section 9.1.

### 9.1 PLA and TPU from owner saves

`dl/dl-baffle-inlay-coin/baffle/baffle-wire.3mf` (BAFFLE R2, 2026-09-12
13:12, `OrcaSlicer-Version` 2.3.2, printer Flashforge Creator 5 Pro 0.4
nozzle, process 0.24mm Standard @FF C5) carries PETG in slots 1 and 2, PLA
in slot 3 and TPU in slot 4. Values read from `Metadata/project_settings.config`
on 2026-10-04.

| key | slot 3 (PLA) | slot 4 (TPU) |
|---|---|---|
| filament_settings_id | Generic PLA @FF C5P | Generic TPU @FF C5P(baffle-wire.3mf) |
| filament_type | PLA | TPU |
| nozzle_temperature | 210 | 225 |
| nozzle_temperature_initial_layer | 220 | 230 |
| nozzle_temperature_range_low / high | 190 / 240 | 200 / 250 |
| hot_plate_temp, textured_plate_temp | 55 | 40 |
| filament_max_volumetric_speed | 18 | 3.2 |
| fan_max_speed / fan_min_speed | 70 / 70 | 100 / 100 |
| close_fan_the_first_x_layers | 1 | 1 |
| slow_down_layer_time | 8 | 8 |
| pressure_advance (enable_pressure_advance) | 0.035 (1) | 0.02 (0) |
| filament_flow_ratio | 1 | 0.98 |
| filament_density | 1.24 | 1.21 |
| temperature_vitrification | 45 | 35 |
| filament_cost | 20 | 40 |
| filament_ids | GFL99 | GFU99 |

Tiers. The PLA column loads as a harvested preset, tier vendor, method
datasheet, source this save: it carries the plain preset name, and its
max volumetric 18 matches the system value that replaced the writer's 12
between `haft (4).3mf` and `haft (5).3mf`. The TPU column is an owner save
that may echo writer values: it carries the forked name, and nozzle 225
and flow 0.98 equal the bench writer's TPU values. It is kept as evidence
and does not load as a preset.

Conflict resolved: one Downloads reading (dl-baffle-inlay-coin) read the
TPU column as a harvested preset; two others (dl-pip-latest,
dl-gudgeon-tang-keyway) showed the TPU name failing to resolve in other
saves (section 8.1). Both observations stand. Only the PLA column counts
as a harvested preset.

## 10. Constants

`constant(id)` returns `{id, value, unit, provenance}`; its shown
qualifier is `qualifyRow(provenance.tier)` (section 2.3). Source
of the starting set: `handoff/knowledge/00-constants.md` and the seed
`constants` array, corrected below. Dimensions of bought parts move to the
catalog.

### 10.1 Constant rows

| id | value | unit | tier | method | source |
|---|---|---|---|---|---|
| `click.dropMin` | 0.5 | ratio | inferred | derived | D-071 |
| `prt.perimetersMin` | 2 | count | inferred | derived | CHK-PRT-04 origin; M01-T03 |
| `print.shrinkPerSide` | 0.05 | mm | inferred | failure | OGEE16 `printed.scad`; 0.075 retired |
| `print.over` | 0.15 | mm | inferred | derived | across the part, 0.075 per side; the per-side value is the (laser, fdm) loss row; kept as a named alias for PSLIP |
| `bed.margin.ffc5p` | 10 | mm | inferred | derived | OGEE16 `build_plate.py` `MARGIN=10` |
| `28byj48.halfStepsPerRev` | 4075.7728 | half steps | vendor | derived | gear train 63.68395 x 64; DETENT, SLUG |
| `despeckle.factor` | 0.35 | fraction of a min-feature disc | inferred | failure | SPRUE (D-145) |
| `opacity.lightOverDark` | 1.2 | mm | inferred | failure | print-reality.md lines 23 to 26, python coin v1 0.8 read grey (D-145); `data/opacity.json`, M03-T07 |
| `opacity.darkOverLight` | 2 | layers | inferred | failure | print-reality.md line 22, SPRUE white body black inlay; `data/opacity.json`, M03-T07 |
| `livingHinge.maxDegPerRow` | 13 | deg | inferred | derived | TUMBLER |
| `buckledBeam.riseOverT` | 2.31 | ratio | inferred | derived | TUMBLER; SNAPFE finds bistable from Q 2.32 at PIP defaults (computed). CHK-KEY-04 uses the FE, never this constant |
| `capsule.archBelowDiameters` | 2.0 | capsule diameters | inferred | derived | SLUG; a 156 mm mouth is 3.07 diameters and works (inferred) |
| `fingertip.mm` | 10 to 16 | mm | inferred | derived | COFFER |
| `plate.minArea` | 120 | mm2 | inferred | derived | COFFER finger-scale gate |
| `plate.minInscribed` | 4.5 | mm | inferred | derived | COFFER (polylabel) |
| `plate.measureOpen` | 0.95 | mm | inferred | derived | COFFER: open each net by 0.95 to erase 1.8 mm traces before measuring plates |
| `weed.erodeSkeleton` | 0.75 | mm | inferred | derived | SPLICE rev C: eroding every shape by 0.75 leaves one connected skeleton |
| `copper.ladderGap` | 0.94 | mm | inferred | derived | SPLICE: 2.54 pitch minus 1.6 trace (computed) |
| `coanda.splitterNozzleWidths` | 8 to 12 | nozzle widths | inferred | derived | 00-constants |
| `tribo.airBreakdown` | 3 | kV per mm of gap | inferred | derived | 00-constants |
| `touch.fingertipArea` | 80 | mm2 | inferred | derived | 00-constants: grounded fingertip through the real cover with its permittivity |
| `printTime.overhead` | 18 | percent | inferred | derived | OGEE16 `printtime.py`: 0.24 layer, 0.42 line, 3 walls, 40/55/90 mm/s |
| `printTime.sanityFlow` | 7.5 | mm3/s average | inferred | derived | 00-constants: 0.8 is implausible |
| `snap.repeatFactor` | 0.6 | ratio | community | datasheet | section 3.3 |
| `key.flexGapFloor` | 1.2 | mm | inferred | derived | PIP 2026-09, CHK-KEY-01 floor; the run body reads it beside the band rows below (D-241) |
| `key.flexGapFracMin` | 0.35 | ratio | inferred | derived | pip-controller bench/part1.html lines 233 and 238; lo end of the CHK-KEY-01 band, read by CHK-KEY-01 (D-241) |
| `key.flexGapFracMax` | 0.5 | ratio | inferred | derived | pip-controller bench/part1.html lines 233 and 238; hi end of the CHK-KEY-01 band, read by CHK-KEY-01 (D-241) |
| `stack.bandOverlap.lo` | 0.01 | mm | inferred | derived | COAMING 2026-08, CHK-PRT-02; the mesh stack route reads it |
| `stack.bandOverlap.hi` | 0.02 | mm | inferred | derived | COAMING 2026-08, CHK-PRT-02; the mesh stack route reads it |
| `click.rigidSpanMin` | 4 | mm | inferred | derived | PIP SNAPFE_RIGID, layout.js:110, flexing span max(this, l - sw/2); sim clickRigid reads it (M01-T01) |
| `click.contactPastPeak` | 0.15 | mm | inferred | derived | PIP clickerDims, layout.js:86, contact at least this past the peak; sim clickReadout reads it (M01-T01) |
| `click.contactValleyFraction` | 0.85 | ratio | inferred | derived | PIP clickerDims, layout.js:86, contact at least this fraction of the valley travel; sim clickReadout reads it (M01-T01) |
| `click.stopOvertravel` | 0.3 | mm | inferred | derived | PIP clickerDims, layout.js:95, strain at the stop read up to contact plus this; sim clickReadout reads it (M01-T01) |
| `cascade.slopWarn` | 1.2 | mm | inferred | derived | TUMBLER tumbler.html:2112, stacked slop over this reads "deep chain, add a restoring lever"; constraints fixture mech/cascade-slop (M01-T10) |
| `cascade.strokePerStage` | 10 | mm | inferred | derived | TUMBLER tumbler.html:2108, input stroke needed per cascade stage; mech/cascade-slop readout (M01-T10) |
| `ogee16.latchServoX.lo` | 123.3 | mm | inferred | derived | OGEE16 params.scad:183 to 185 as stated; 2.0 mm over 104.4 + 5.5 + 11.4 is unknown; mech/ogee16-latch-servo-window (M01-T10) |
| `ogee16.latchServoX.hi` | 125 | mm | inferred | derived | OGEE16 params.scad:185 to 186 as stated; decomposition unknown; mech/ogee16-latch-servo-window (M01-T10) |
| `ogee16.colServo3EndX` | 104.4 | mm | inferred | derived | OGEE16 params.scad:184 comment, the floor reason prints it (M01-T10) |
| `overhang.maxDeg` | 45 | deg | inferred | derived | DETENT rev C verify_revC.py slice_scan lines 201 to 219; the 45 deg roof of CHK-SHP-03; no coupon recorded; read by CHK-PRT-12, CHK-PRT-13 and CHK-SHP-03 (M04-T12, D-242) |
| `overhang.bedBandMm` | 0.35 | mm | inferred | derived | PAWL fdm.py line 43 (lineage pawl.fdm/mk3); read by CHK-PRT-12 and CHK-PRT-13 (D-242) |
| `electrical.contactFactor.lo` | 10 | ratio | inferred | derived | stand-in until the M05 ContactRow rows (M05-T05 card defects); read by tools/skeleton/flexpair_probe/sim/run.mjs |
| `electrical.contactFactor.hi` | 30 | ratio | inferred | derived | stand-in until the M05 ContactRow rows (M05-T05 card defects); read by tools/skeleton/flexpair_probe/sim/run.mjs |
| `electrical.skinOhm.lo` | 1000000 | ohm | inferred | derived | stand-in until the M05 ContactRow rows (M05-T05 card defects); read by tools/skeleton/flexpair_probe/sim/run.mjs |
| `electrical.skinOhm.hi` | 20000000 | ohm | inferred | derived | read by packages/circuit/src/read/charge-release.ts (M05-T05) and by tools/skeleton/flexpair_probe/sim/run.mjs |
| `route.keepoutPad` | 0.15 | mm | inferred | derived | PIP router.js line 68 at b137deb: added to every terminal keepout and via zone radius; read by packages/copper/src/route/negotiated.ts (M05-T08) |
| `route.zonePad` | 0.02 | mm | inferred | derived | PIP router.js line 74 at b137deb: trace zone radius w + clr + this; read by packages/copper/src/route/negotiated.ts (M05-T08) |
| `stack.skin` | 0.72 | mm | inferred | derived | PIP layout.js line 27 at b137deb, PETG under trace layer 1 (section 6.1, D-085); read by reference/electrical/pip-buried-route/build.ts (M05-T10) |
| `stack.trace` | 0.72 | mm | inferred | derived | PIP layout.js line 27, each trace layer (section 6.1); read by reference/electrical/pip-buried-route/build.ts (M05-T10) |
| `stack.iso` | 0.96 | mm | inferred | derived | PIP layout.js line 27, 4 layers PETG between layers (section 6.1); v3 0.48 retired; read by reference/electrical/pip-buried-route/build.ts (M05-T10) |
| `stack.overL2` | 1.68 | mm | inferred | derived | PIP layout.js line 27, iso 0.96 plus the 0.72 pad floor (section 6.1); v3 0.48 retired; read by reference/electrical/pip-buried-route/build.ts (M05-T10) |
| `stack.traceWidth` | 1.4 | mm | inferred | derived | PIP layout.js line 28, drawn with no bleed (section 6.1, D-084); read by packages/copper/src/emit/trace-layer.ts (M05-T10) |
| `stack.netToNetMin` | 0.6 | mm | inferred | derived | PIP model.js lines 216 to 223, 0.59999999 computed on the default model (section 6.1, D-085, C-06); v3 0.3 retired; read by CHK-NET-02 and CHK-NET-12 (M05-T10) |
| `route.postSep` | 0.12 | mm | inferred | derived | PIP model.js line 27 at b137deb: a post or via radius within this of w/2 moves to w/2 + this; read by packages/copper/src/emit/trace-layer.ts and CHK-NET-11 (M05-T10) |
| `route.discPad` | 0.05 | mm | inferred | derived | PIP model.js lines 41 and 42: the layer disc of a post or via is this wider than the post; read by packages/copper/src/emit/trace-layer.ts (M05-T10) |
| `route.regionClose` | 0.01 | mm | inferred | derived | PIP model.js line 43: each trace layer per net closed by +this then -this Miter; read by packages/copper/src/emit/trace-layer.ts and CHK-NET-11 (M05-T10) |
| `route.postOverlap` | 0.02 | mm | inferred | derived | PIP model.js lines 8 and 48 (EZ): a terminal post runs this past the pad plane; read by reference/electrical/pip-buried-route/build.ts (M05-T10) |
| `route.gapSearch` | 1 | mm | inferred | derived | PIP model.js line 221: net-to-net minGap search distance; read by packages/circuit/src/extract/nets.ts (M05-T10) |
| `route.stick.grid` | 0.2 | mm | inferred | derived | TOGGLE part2d.js line 171: tilt stick floor route grid; read by packages/copper/src/route/search.ts (M05-T09) |
| `route.stick.edgePad` | 0.6 | mm | inferred | derived | TOGGLE part2d.js line 176: keep-in past half a trace from the outline; read by packages/copper/src/route/search.ts (M05-T09) |
| `route.stick.leadR` | 0.65 | mm | inferred | derived | TOGGLE part2d.js line 197: direction lead foot radius before clr + w/2; read by packages/copper/src/route/search.ts (M05-T09) |
| `route.stick.comR` | 0.71 | mm | inferred | derived | TOGGLE part2d.js lines 197 and 229: COM column foot radius before clr + w/2; read by packages/copper/src/route/search.ts (M05-T09) |
| `route.stick.leadHalf` | 0.5 | mm | inferred | derived | TOGGLE part2d.js lines 237 and 284: half width of a wall contact lead; read by packages/copper/src/route/search.ts (M05-T09) |
| `electrical.tracePfPerMm` | 0.02 | pF/mm | inferred | derived | read by packages/circuit/src/read/charge-release.ts (M05-T05) and by tools/skeleton/flexpair_probe/sim/run.mjs |
| `electrical.tracePfFixed` | 1 | pF | inferred | derived | read by packages/circuit/src/read/charge-release.ts (M05-T05) and by tools/skeleton/flexpair_probe/sim/run.mjs |
| `electrical.smearOhm` | 300000 | ohm | inferred | derived | stand-in until the M05 ContactRow rows (M05-T05 card defects); read by tools/skeleton/flexpair_probe/sim/run.mjs |
| `electrical.gndLeadPf` | 20 | pF | inferred | derived | stand-in until the M05 ContactRow rows (M05-T05 card defects); read by tools/skeleton/flexpair_probe/sim/run.mjs |
| `electrical.keyLeadPf` | 20 | pF | inferred | derived | stand-in until the M05 ContactRow rows (M05-T05 card defects); read by tools/skeleton/flexpair_probe/sim/run.mjs |
| `electrical.keyLeadPf.lo` | 10 | pF | inferred | derived | stand-in until the M05 ContactRow rows (M05-T05 card defects); read by tools/skeleton/flexpair_probe/sim/run.mjs |
| `electrical.keyLeadPf.hi` | 30 | pF | inferred | derived | stand-in until the M05 ContactRow rows (M05-T05 card defects); read by tools/skeleton/flexpair_probe/sim/run.mjs |
| `electrical.noiseV` | 0.005 | V | inferred | derived | stand-in until the M05 ContactRow rows (M05-T05 card defects); read by tools/skeleton/flexpair_probe/sim/run.mjs |
| `capacitive.pathCeilOhm` | 30000 | ohm | community | coupon | Capricate (Schmitz et al., UIST 2015): above 30 kohm the touch SNR falls under 5:1 for 5 to 20 mm cABS electrodes (`capricate.txt` lines 407 to 416); read by CHK-NET-28 through circuit/capacitive-path-ceiling (M05-T12) |
| `read.adc.lineOhm` | 100000 | ohm | inferred | derived | CHK-NET-06 line (TANG R5); BLOCKS parts.js line 702 verdict, BOSS parts.js line 426; read by packages/circuit/src/read/adc.ts (M05-T05) |
| `read.adc.analogCeilOhm` | 1000000 | ohm | inferred | derived | BLOCKS parts.js line 702: no analog read at or above 1 Mohm; read by packages/circuit/src/read/adc.ts (M05-T05) |
| `read.adc.holdCapNf` | 100 | nF | inferred | derived | BLOCKS parts.js line 702 and GIB part2.js line 544: 100 nF at the pin between the line and the ceiling; read by packages/circuit/src/read/adc.ts (M05-T05) |
| `read.ratiometric.pulldownRatio` | 20 | ratio | inferred | derived | GIB part2.js line 544, part3.js line 247: pull-down at least 20 times the source; read by packages/circuit/src/read/ratiometric.ts (M05-T05) |
| `read.ratiometric.pulldownMinOhm` | 1000000 | ohm | inferred | derived | GIB part3.js line 247: pull-down max(1 Mohm, 20 Rsrc); read by packages/circuit/src/read/ratiometric.ts (M05-T05) |
| `read.ladder.leadOhm` | 4000 | ohm | inferred | derived | FEELER feeler_thinpot.html lines 4504 and 4951 (Rc): lead in series with the ladder pull-down; read by packages/circuit/src/read/ladder.ts (M05-T05) |
| `read.ladder.minStepCounts` | 25 | count | inferred | derived | FEELER feeler_thinpot.html lines 4545 and 4968: under 25 counts printed drift overlaps keys; read by packages/circuit/src/read/ladder.ts (M05-T05) |
| `bridge.maxMm` | 9 | mm | inferred | derived | SLATE 2026-08 print audit (CHK-PRT-09 legal); a later packages/checks pass moves CHK-PRT-09 and CHK-SHP-03 onto it |
| `key.capBridgeMax` | 4.5 | mm | inferred | derived | pip-controller src/model.js lines 455 to 462; a later pass moves CHK-KEY-02 and the flex-pair FITS onto it |
| `key.splitMin` | 0.6 | mm | inferred | derived | pip-controller src/model.js lines 455 to 462; a later pass moves CHK-KEY-03 and the flex-pair FITS onto it |
| `ogee16.railX1` | 136 | mm | inferred | derived | OGEE16 params.scad:175 RAIL_X1, the ceiling reason prints it (M01-T10) |
| `hook.fit` | 0.95 | mm | inferred | derived | COTTER geo.js:102 GEO.hookRule and hook_fit.py design_full default; d = round(hole - fit, 2); mech/hook-rule (M01-T10) |
| `hook.margin` | 0.35 | mm | inferred | derived | COTTER geo.js:102 and design_full; hook_fit.py design alone defaults 0.2 (M01-T10) |
| `hook.rise` | 5.5 | mm | inferred | derived | COTTER geo.js:102, lock height above the hole (M01-T10) |
| `hook.ext` | 2 | mm | inferred | derived | COTTER geo.js:102, tail after the arc (M01-T10) |
| `hook.bendStartOverRadius` | 1 | mm | inferred | derived | COTTER geo.js:102, Rb search starts at d/2 + this (M01-T10) |
| `hook.bendStep` | 0.25 | mm | inferred | derived | COTTER geo.js:102, Rb search step (M01-T10) |
| `hook.sweepMin` | 20 | deg | inferred | derived | COTTER geo.js:102, sweep search start (M01-T10) |
| `hook.sweepMax` | 88 | deg | inferred | derived | COTTER geo.js:102 loop limit, the hook.sweep ceiling (M01-T10) |
| `3mf.interlockingBeamWidth` | 0.8 | mm | vendor | derived | OrcaSlicer PrintConfig.cpp lines 4792 to 4870, the default `interlocking_beam_width` an object inherits (research/3dp-landscape.md lines 324 to 336); CHK-3MF-08 quotes the loss with it (M05-T20, D-246) |
| `3mf.interlockingDepth` | 2 | cells | vendor | derived | same source, the default `interlocking_depth`; the cell size is not in the survey and the loss bound takes one cell as one beam width (inferred) (M05-T20, D-246) |
| `pcb.drillMargin` | 0.15 | mm | inferred | derived | SPINDLE R1 pcb.py drill breakout gate `pad_poly.buffer(-drill/2 - 0.15)`; CHK-BRD-02 |
| `pcb.moduleLanding` | 0.05 | mm | inferred | derived | M08-T12 step 2; CHK-BRD-02 module hole on its catalog pin, CHK-BRD-03 mirror tolerance |

Plus the stack, skin and read rows of section 6.

### 10.2 Corrections to 00-constants.md

| 00-constants entry | correction | decision or correction id |
|---|---|---|
| conductive PLA working value 30 ohm cm | PIP preset 500 along, 2000 through (inferred); Protopasta rows by id | D-081, C-09 |
| conductive TPU (Eel class) 1500 ohm cm | PIP preset 400 (inferred); Eel has no reference value | D-081 |
| derived resistances (cTPU wire about 1 Mohm per 80 mm, cPLA core about 20 kohm, BLOCKS pin to stud 5 to 50 kohm, TANG R6 arcs; TANG R6 source recovered: readouts give arc 709,040 ohm, neck track 357,955 ohm, pad leads 23.9k to 47.2k ohm at 30 ohm cm cPLA and 1500 ohm cm cTPU, `dl/dl-gudgeon-tang-keyway/extracted/tang_r6_4/05_design.js:313-341`, `runs/r6_out.json`; recompute at load) | model outputs at the retired working values; dropped as constants, recomputed at load from rows | D-098 |
| "a printed button on a Teensy or ESP internal 45k pullup sits in the UNDEFINED band" | scoped to short and medium cPLA wires at BOSS 50 kohm; per-MCU table governs | D-076, D-077, C-02, C-03 |
| PETG loses about 0.40 at 0.24 | material loss row 0.125/0.075 per side (0.25/0.15 diametral) at layer 0.24, inferred | D-100 |
| fit class PSLIDE | PSLIP; PSLIDE returns E_REF | D-100 |
| PRINT_OVER 0.10 implied by "outside features oversize about 0.10" | 0.15 across a printed part in a cut slot (0.075 per side) until a mixed coupon | D-100 |
| OGEE final values "after the hand test" | felt rows, section 7.4 | D-099 |
| cantilever spring F = 3EIx/L^3 with I = t w^3/12 | I = w t^3/12 with t the dimension in the bend direction; the seed cubed w | D-096 (vc C4) |
| buckled beam bistability rise over thickness > 2.31 | kept as a TUMBLER constant; the click spring uses the SNAPFE sweep (bistable from Q 2.32 at PIP defaults) | D-071 |
| BLOCKS standard (traces 1.0 x 0.72, 0.48 PETG between) | BOSS v1 numbers; the canonical BLOCKS standard is open | D-087, owner |
| SuperMini pad centres 8.75 verified | catalog, vendor tier | D-096, D-103 |
| SG90 flange span 32.2, body 22.8 x 12.2 x 22.5, shaft 6.1 from one end | catalog actuator rows, inferred until measured | D-104 |
| Teensy 4.0 edge pinout | catalog pin rows | D-103 |
| COFFER hex and port standard | design geometry in the COFFER chase; plate gates stay as constants | D-142 |
| machines table (laser 610 x 1220, Cricut 101.6 usable) | machine rows of section 8 | D-101 |
| Flash Studio is OrcaSlicer 2.3.2 | confirmed: `OrcaSlicer-Version` 2.3.2 in owner saves recovered from Downloads (HAFT, TOGGLE, TENON, BAFFLE, SASH, COTTER, FEELER), section 8 | vc C2 |

## 11. Coupons

A coupon is a reference design under `reference/coupons/<id>/` with
`chase.ts`, `build.ts`, README with the verified block (D-008) and
`expected/` goldens (D-105). Its build records the exact geometry the
reading converts against, so a coupon reading is never paired with a
hand-typed length or section.

### 11.1 Write path

1. hbf builds the coupon like any design. `build.json` holds the build hash,
   the conductive sections and path lengths, and the fit cells.
2. A person prints it on a named machine with a named preset, filament and
   lot, measures it, and writes a coupon record:
   `packages/profile/coupons/<coupon-id>.json` with the coupon build hash,
   machine id, preset id, filament, date, instrument, conditions
   (temperature, speed, layer, line width, direction), the slicer `comp`
   the coupon was sliced with (section 7.1) and the raw readings per cell.
3. Profile code derives the row from the record and the coupon's
   `build.json` (for example rho in ohm cm = R in ohm x A in mm2 / L in mm
   x 0.1, `pip/docs/assembly.md`). The derived value is computed, never
   typed.
4. The person commits the record and the derived row together. The row
   carries tier measured, method coupon, the machine, the coupon id and the
   date.
5. CI: `npm test -w packages/profile -- coupons` recomputes every measured
   row from its record and fails on any difference, a missing record, or a
   record whose build hash matches no coupon build.

A model may build a coupon, render its card, explain what a reading means
and list which rows a coupon would replace. A model never writes a coupon
record, a measured row or a tier.

The in-bench path (UI.md 6.3) carries steps 1 to 4 for a person working
in a design. When `part.build` returns a non-empty `readsInferred`, the
export step shows one coupon row naming the coupon whose
`CouponDecl.carries` (`spec/chase.ts`) covers those rows, with an export
for that coupon built at the design's machine and material slots. After
the print, the `coupon` panel takes the person's entries per cell (ticks
for the fit gauge and kerf, ohm readings for the four-wire bars), shows
the row profile code would derive with tier measured, method coupon and
the machine, preset and conditions taken from the coupon build, and emits
the coupon record only. In the FAB app the record lands as a patch on
branch `hbf/coupon-<coupon-id>` (D-115) for the owner to commit; in a
baked bench it is a file the person saves. The row is still derived in
step 3 and checked in step 5. The person entering ticks is the measuring
instrument; the panel is a form for the record, so this path leaves the
rule above unchanged.

Coupon id form: `<kind>-<machine>-<yyyymmdd>-<n>`, for example
`res-ffc5p-20261012-1` (proposed in this file).

### 11.2 Resistivity four-wire coupon

Reference `reference/coupons/resistivity`, admitted in M05 (PLAN.md 11).
Bars in cPLA and in cTPU printed along, across and through layers at the
shop's preset, with separate current and voltage pads (four-wire) sized for
silver ink, and a form to enter readings (plan-deltas R68, Ideas 3;
the 3dp note "a coupon generator is the first profile
writer"). Bar dimensions are set in the M05 card from the stack rows of
section 6.1.

| writes | from |
|---|---|
| `cpla.<machine>.along`, `.across`, `.through` | four-wire readings on each cPLA bar |
| `ctpu.<machine>.along`, `.across`, `.through` | four-wire readings on each cTPU bar |

Once these rows exist at tier measured for ffc5p, they outrank the PIP
preset rows, CHK-NET-05 stops warning for that material, and every
archetype resistance recomputes at load (D-098). This coupon closes the
first item of D-082.

### 11.3 Fit-gauge coupon

Reference `reference/coupons/fit-gauge`, admitted in M01 (PLAN.md 11).
Pattern from DETENT rev C: a small base (56 x 26 x 4 mm in DETENT) carrying
the real joint features in the same orientation as the real parts
(`kb/sources/benches/benches-machines.md:130-139`). One cell per fit class
the design declares, ordered by ascending risk (plan-deltas Ideas 10).
DETENT rev D ships two gauges: `detent_fit_gauge` 56 x 26 x 28 mm (13.3
cm3, about six minutes, "for the three fits that matter") and
`detent_snap_gauge` 40 x 32 x 26 mm (4.0 cm3), printed before the cage.
Its snap rule is a flow rule: too stiff, print the shell at 96 percent
flow or in PETG; falls off, 104 percent
(`dl/dl-robots-machines/unzipped/detentfiles/DETENT-build-notes.md:187-203`,
inferred, no print recorded).

XY scale rule (DETENT): when the shaft rocks in the hub, reprint the hub at
99.6 percent XY; when it will not go on, 100.4 percent. The record stores,
per cell, the outcome (fits, rocks, will not go on) and the XY scale that
fit. Through the `coupon` panel (section 11.1) the person ticks one
outcome per cell: `slid` (moves freely; a pass for a sliding class),
`located` (goes on with no play; a pass for a location class), `rocks`
(goes on with play) or `stuck` (will not go on), plus the XY scale when
the cell was reprinted. Profile code maps `rocks` and `stuck` to the
DETENT outcomes above and derives the per-side figure from the scale.
A bore of drawn diameter d printed at scale s changes by d x (s - 1)
across the bore and d x (s - 1) / 2 per side (computed); the person enters
the per-side figure as a loss row update for the
machine, material and layer, and the realGap tests are rerun.

Each bore cell prints twice, once with its axis vertical and once
horizontal, and the bore cells step in drawn diameter (proposed 2, 3, 5, 8
and 12 mm) so the derived rows carry `axis` and, where the loss differs
between steps by more than 0.05 mm, a `dRange` per step. The record stores
the preset `comp` and the circle segment count the coupon was built with;
a row derived under one `comp` warns when read under another (section
7.1).

Variants for bought bodies (CASK collar gauge, NACELLE LEGO stud coupon at
pitch 8, stud 4.85, anti-stud 5.20, inferred) write catalog dimensions, not
profile rows.

### 11.4 Kerf coupon

Proposed reference `reference/coupons/kerf` with the nest and DXF work of
M07. Pattern from SKETCH's KERF COUPON: 9 t-slots stepping 0.02 mm from
-0.08, values engraved, pitch 14 (`kb/sources/benches/benches-robots-b.md:421`).
The person records which slot fits per material and thickness; the record
writes `hbf://profile/machine/<id>#/kerf`. COTTER's one-bin fit test (raise kerf 0.03 when
tight, lower 0.03 when loose) is the quick check after a material change.
Tab plus one kerf, slot minus one kerf, applied in one place (COTTER
`mortiseH`, `mortiseV`).

### 11.5 PIP coupon

The PIP design's own coupon (`pip/src/coupon.js`; export
`pip/print/pip-coupon.zip`, sha256
3ce6d4c2ef8aef756c8f11408dc53049fc9bf6595cd35ba0165d58ea83be0177). A
134 x 70 mm slab on the body's trace stack with 20 numbered pads, plus a
click spring and cap. It applies no bleed, and neither does the body, so it
measures the geometry it calibrates (C-06).

| pads | cell | expected |
|---|---|---|
| 1 to 2 | 32 mm trace, layer 1 | card gives the predicted figure |
| 3 to 4 | 148 mm trace, layer 1 | same, longer run |
| 5 to 6 | trace on layer 1 | a few hundred kohm |
| 7 to 8 | trace on layer 2 through its pad posts | a few hundred kohm |
| 5 to 7 | crossing between layers | open; under 50 Mohm is a bridge through the insulation |
| 9 to 10, 11 to 12, 13 to 14 | splits at 0.6, 0.8, 1.0 mm | open; under about 5 Mohm is stringing or smear |
| 15 to 16 | bump pair at 2.54 mm pitch with anti-smear groove | open; a few hundred kohm with a wire across the bumps |
| 17 to 18 | flex key | open released; a few hundred kohm to a few Mohm pressed; fifty presses for drift |
| 19 to 20 | click spring in its slot | open released; same pressed range; the spring clicks |

Source: `pip/docs/assembly.md`. The in-plane rho comes from pads 1 to 2
and 3 to 4 by the formula in 11.1 step 3. In hackbuild-fab this coupon is
the export the PIP design emits (`BenchHook.exportBytes("coupon")`); its
readings write rows through the same record path. A beam that prints thin
is the more likely cause of a weak click, since force goes with the cube of
the 0.55 mm drawn thickness; measure the beam with calipers before changing
the rise (same source).

## 12. Open measurements (D-082)

Status owner. Default in force: none until the owner prints them; exports
carry inferred warnings and public claims state the tier.

D-082 list:

- [ ] Yousu cPLA and cTPU four-wire coupon, along, across and through, at
      Flash Studio settings (section 11.2).
- [ ] Real RP2040, Pico and ESP32-C3 pullups and thresholds on the shop's
      boards (catalog rows, section 5).
- [ ] SG90 dimensions (catalog actuator rows, D-104).
- [ ] KNUCKLE hinge and TENON threads, printed.
- [ ] COTTER hook on the real HSL board.

Further rows waiting on a coupon, from this file:

- [ ] Bleed per (ffc5p, petg, cpla) and (ffc5p, petg, ctpu) (section 6.2).
- [ ] PETG loss at 0.24 on ffc5p from the fit gauge (section 7.1).
- [ ] Print-over for a printed part in a cut slot, the PSLIP figure
      (section 7.1).
- [ ] Which fit band set holds on the shop machine, default or felt
      (section 7.4).
- [ ] Kerf for `laser1220` and `sheet600` per material and thickness
      (section 8).
- [ ] PETG strain across layers, replacing the 1.5 percent default
      (section 3.2).
- [ ] Key and touch wait calibration with `pip_probe` (section 6.3).
- [ ] ContactRow rows (spec/profile.ts `ContactRow`, `ProfileLookup.contact`)
      for the cpla to ctpu printed interface, the clip to pad and the cap
      across the split, from the PIP coupon pads 15 to 18 (section 11.5)
      or a flex-pair coupon. Until a person enters them, `contact()`
      returns null, `packages/circuit` reports each contact as unpriced
      (qualifier unknown), and these inferred stand-ins carry the probe
      simulation: `electrical.contactFactor.lo`, `electrical.contactFactor.hi`,
      `electrical.smearOhm`, `electrical.gndLeadPf`, `electrical.keyLeadPf`,
      `electrical.keyLeadPf.lo`, `electrical.keyLeadPf.hi`,
      `electrical.noiseV`, `electrical.skinOhm.lo` (M05-T05 card defects).
      `packages/profile/test/contact-standins.test.ts` holds this list to
      the data.
- [ ] Card stock thickness for the shop's insert stock (section 3.5).

## 13. Fields proposed, not admitted

plan-deltas R57 and the 3dp note propose fields that no
decided D entry admits. Each is admitted when a check reads it, in the
milestone that adds that check, with a spec change.

| field | evidence |
|---|---|
| per-wall convex or concave loss | KNURL convex 0.1, concave 0.15 (elephant foot moved to `MachinePreset.comp`, section 7.1) |
| machine `changer` (toolchanger, shared_nozzle, dual_nozzle, hotend_swap) and `purge_per_change_g` | decides whether a conductive plus TPU build is legal on a machine; INDX 0.013 g, AMS 0.3 to 1.5 g (vendor) |
| contact resistance table | PIP crossings 10 to 30x slower than computed on eight of ten keys (D-079) |
| servo machine profile (slew, accel, deadband, frame Hz, lash, band) and holding torque | belongs to catalog actuator rows (D-104) |
| process presets by part role (pin and pivot 0.10 layer 100 percent infill; structural flat 0.24, 15 to 20 percent; fine coin 0.25 nozzle at 0.12; buttons 100 percent per object) | plan-deltas R57 |
| material id to slicer type mapping | section 3.1 lists ids; the 3MF writer holds the map in M00 |
| kerf per (machine, material, thickness) | `Machine.kerf` is one number in `spec/profile.ts` |

## 14. Files and tests

| file | test or check |
|---|---|
| `packages/profile/test/realgap.test.ts` | per side throughout: gapPerSide(5.0, 4.6) = 0.2, the 0.075 pin (D-100's 0.15 across the joint), the 0.15 machine-row case, the layer 0.20 warning, the outer side 0.20; the axis fixture (horizontal 0.00, vertical and featureless 0.075); a loss row or fit band with a basis other than perSide is refused; a `dRange` row skipped when no diameter is given; a `comp` mismatch warns and still returns the row |
| `packages/3mf/test/comp-overrides.test.ts` | every written object carries the four compensation overrides equal to the preset `comp`; the M00 Flash Studio round trip records which keys survive |
| `packages/mesh/test/relief.test.ts` | `relief` emits no geometry on `ffc5p_20260819` (elephant foot 0.1) and its declared width on `ffc5p-n025_20260819` (0) |
| `packages/profile/test/provenance.test.ts` | no tier fails E_SCHEMA; measured without coupon fails E_PROVENANCE; PSLIDE returns E_REF; tiers never rise |
| `packages/profile/test/resistivity.test.ts` | raw-filament rows never returned for printed; brand scope; working rows of section 4.3; no cpla or ctpu row at tier measured as of 2026-10-04; a printed row set with through below along and no `note` citing the source figure warns, and `cpla-protopasta.nowka.through` passes with its note |
| `packages/profile/test/lookup.test.ts` | equal reads give equal `profileHash`; one more read changes it |
| `packages/profile/test/coupons.test.ts` | every measured row recomputes from its record |
| `packages/profile/test/m01-rows.test.ts` | the M01 rows read back with value, tier and method |
| `packages/profile/test/toolheads.test.ts` | every fdm material has `handling`; `ffc5p` has four toolhead rows with indices 1 to 4; `toolhead("ffc5p", 5)` throws E_REF; a slot without `toolhead` resolves to its own index |
| seed conformance (M-1-T07) | every row passes the zod schema derived from `spec/profile.ts` |

Acceptance for this file: `node tools/lint-voice.mjs PROFILE.md` exits 0
once the tool exists; before then
`grep -nP '[\x{2012}-\x{2015}\x{2212}]' PROFILE.md` returns nothing.
