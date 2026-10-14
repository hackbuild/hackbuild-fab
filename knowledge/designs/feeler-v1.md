# FEELER v1: how it is made

The first harvest of the printed sensor bench (the plan's STYLUS archetype registry): twenty parametric sensor archetypes in one HTML file with no vendor libraries, each building an exact closed mesh per filament role, proving its own continuity and isolation, reading out what it will measure and simulating a stimulus. THINPOT (`fab-knowledge:originals/thinpot/RECORD.md`) is the refined second harvest; this record keeps v1 because it is the origin of the declaration vocabulary, the slab-list net checker and the first dome switch, and because several of its choices were later corrected and the corrections only make sense against it.

Number rule: constants are bench defaults at the line named in `fab-knowledge:originals/feeler-v1/files/feeler_v1.html`; readouts quoted from shots are computed by the bench.

Folder: `fab-knowledge:originals/feeler-v1/`.

## 1. Identity and revision

| field | value |
|---|---|
| owner name | FEELER v1 |
| slug | feeler-v1 |
| canonical revision | harvested `fab-work-directory:benches/feeler-v1/outputs/feeler.html` = `Downloads/feeler (3).html` (2026-08-21 10:24), `(4)` (08-23) and `(5)` (09-08), 279521 bytes, 5382 lines |
| sha256 | `0671193edade919aea986d5a3af3b8ce76d7a4af180b5568b3bae33887f8f8eb` |
| copy here | `fab-knowledge:originals/feeler-v1/files/feeler_v1.html` |
| successor | THINPOT, `feeler (16).html`, 22 archetypes |

Why this file: it is the only v1 build (three Downloads saves are byte identical to it) and it is the one the owner uploaded into the THINPOT chat as the starting point (`fab-work-directory:benches/feeler-thinpot/uploads/feeler__5_.html`, identical). Good in the sense that every default archetype builds with GATES 8/8 (shots below); its known defects are listed in 4.7.

## 2. What it makes and for whom

The same audience as THINPOT: a maker with a four-head printer who wants a printed sensor of a known physics and a 3MF that opens with every part on its slot. Welcome text: "every sensor you can print on a multimaterial machine".

## 3. Shots

Driven with `fab-knowledge:originals/_tools/shoot-tang-sensors.cjs`, 1280 x 860, zero page errors.

| file | what it shows |
|---|---|
| `fab-knowledge:originals/feeler-v1/shots/v1-welcome.png` | welcome card: "Fourteen parametric sensor archetypes" (twenty are registered), the four steps, START and LOAD A DESIGN |
| `fab-knowledge:originals/feeler-v1/shots/v1-type-grid.png` | after START: CAPACITIVE PADS built at defaults (substrate, electrodes, cover, terminals), FINGER sim with per-pad pF, and the ARCHETYPE panel with grouped cards ("20 AVAILABLE") |
| `fab-knowledge:originals/feeler-v1/shots/v1-switch-shape.png` | DOME SWITCH in SHAPE with ghost: revolved TPU dome on its rim over a centre pad and split ring, floating conductive puck, two traces to two terminals; PRESS sim (centre to ring open, LOW); `30.0 x 38.0 x 7.4 mm, 37 layers at 0.20` |
| `fab-knowledge:originals/feeler-v1/shots/v1-switch-drive.png` | DRIVE tab: PRESS, OUTPUT channels, SCOPE with SWEEP and CLEAR |
| `fab-knowledge:originals/feeler-v1/shots/v1-wiper-shape.png` | POTENTIOMETER: body, resistive track, collector rail, wiper carrier, TPU wiper arms, cTPU shoes, D shaft, snap ring; KNOB sim with wiper to low and high ends 2.05 kohm, shoe contact 8.00 kohm |

## 4. Mechanisms, circuits and constructions

Script blocks: `window.geom` (`:299` to `915`), `FEELER_CORE` with materials, Ctx and archetypes 1 to 14 (`:917` to `2545`), archetypes 15 to 20 and `dShaft` (`:2547` to `3441`), `SIM` (`:3443` to `4036`), `FEELER_EXPORT` (`:4038` to `4331`), app (`:4333` to `5380`).

### 4.1 Exact prism kernel with a slab list

"No voxels. Every primitive closes." `Mesh.prism` builds caps from the bridged triangulation and walls from the original loops so bridge edges never become geometry, optional top scale for tapers; every prism appends `{o, h, z0, z1}` to `mesh.slabs` for the net checker. `apex`, `revolve`, `lathe`; lattices `reentrantCell`, `reentrantField` (shared walls emitted once, interior walls split into two strokes offset 0.004), `hexRing`, `serpentine` (8-segment U turns), `spiral`, `combPair`; predicates `pointInPoly`, `pointInRing`, `segHit` (1e-9), `ringsOverlap`, `slabsTouch(a, b, tol 0.02)`. `EPS` 1e-9, `dedupe` 1e-6, `EZ` 0.01 z overlap used freely between materials in v1.

`stroke()` in v1: rounds the outside of every corner with fans at 0.4 rad steps and bevels the inside; fanning the inside "wraps the offset back through the material and self intersects". THINPOT replaced the bevel with a miter intersection and added `cleanLoop`.

### 4.2 Declarations and the net checker

`Ctx` (`:957` to `1017`): `part`, `get`, `drop`, `say`, `note`, `pause`, `net`, `tap`, `joined`, `apart`, `apartExcept`, `bom`, `step`, `wire`, `fit`, `makesContact`. v1 has no `pose`, `circuit`, `absorbTerminals`, `dividerR` or `niceR` (added in THINPOT).

`solve()` (`:1018` to `1087`): union find with path halving over all `cond` and `aux` slab pairs where `slabsTouch` holds (O(n^2)); taps resolve to the first slab containing them within 0.05 in z; assertions `joined`, `apart`, and the articulation check `apartExcept` (drop the named part, the taps must separate). `makesContact` is recorded and listed in the DRIVE pane but never geometrically tested: this is the weakness the wiper bug exposed (knowledge record), and the reason THINPOT added `fit()` windows on domes.

### 4.3 Materials, roles and electrical maths

Same table as THINPOT (cPLA 15 and 60 ohm cm, cPLA low-ohm 1.5 and 8, cTPU 1000 and 3500, cTPU low-ohm 120 and 400, gauge factors and tempcos, structural plastics with E and er; vendor-class bench values). Four roles: rigid STRUCTURE (PETG), cond CONDUCTIVE (CPLA), flex FLEX (TPU95), aux SECOND COND (CTPU); slot colours `#D8D2C4`, `#2A2A2E`, `#6F7D8C`, `#FE0386`. `traceR = rho x 10 x L/(w t)`; `capPF`; `selfCapPF`; `touchPF` (finger area capped at 80 mm2, dielectric `max(0.15, cover) + 0.15` air and skin gap, er falls to 1 for a cover under 0.05, `:1100` to `1105`); `selfCapPF` is the free-disc floor `8 e0 r`; `seriesPF`; `beamF` first cantilever mode.

### 4.4 The v1 dome switch (spring button, first form)

`:1453` to `1550`. Defaults: dome od 18, rise 4, wall 1.0, contact gap 1.2, base 1.6, contact layer 0.6, ring 2.0, puck 7, trace 1.4, terminal pitch 5, skirt tabs on.
1. PETG base plate with mounting holes.
2. Centre pad radius `clamp(puck/2 + 0.6, 0.6, rRo - ring - clr - trace/2 - 0.3)`; outer ring split at the bottom so the centre trace leaves without shorting into it (gap half angle `atan2(trace/2 + clr, rRi)`).
3. Two traces to a terminal row; `joined(centre, term 1)`, `joined(ring, term 2)`, `apart(centre, ring)`.
4. Dome: a revolved shell (outer and inner quarter-ellipse profiles at 0.98 of a quarter turn) sitting on a rim that rises from the base plate.
5. Shorting puck: a conductive disc on the dome underside, floating on purpose, bridging centre to ring only while pressed (`makesContact`).
6. Two TPU skirt tabs at the rim for bed adhesion.
7. Readouts: contact gap and its layers, wiring R, closed R `Rwire + 2k` to `Rwire + 60k` (printed face-to-face contact with an oxide and polymer skin), snap ratio `h/t` (warn under 2.5, "will mush instead of clicking").
8. A print pause at the contact layer to drop a foil disc for a low-ohm contact.

What changed in THINPOT: the puck moved to the cTPU slot (fuses to the TPU ceiling where PLA peels), the dome became either a flip bowl printed upside down with a flange lock or an in-place 40 deg cone, the contacts became two half discs, and fits were added (THINPOT 4.3 and 4.4).

### 4.5 The twenty archetypes

| # | id | name | group | build lines | sim |
|---|---|---|---|---|---|
| 1 | cappad | CAPACITIVE PADS | well behaved | `:1193` to `1452` | FINGER |
| 2 | switch | DOME SWITCH | well behaved | `:1456` to `1550` | PRESS |
| 3 | flexstrip | BEND / STRETCH STRIP | piezoresistive | `:1555` to `1682` | BEND |
| 4 | compress | COMPRESSION CELL | piezoresistive | `:1683` to `1736` | SQUEEZE |
| 5 | meander | RESISTIVE TRACK | well behaved | `:1737` to `1873` | DRIVE |
| 6 | tribo | TRIBOELECTRIC CELL | exotic | `:1874` to `1987` | TAP |
| 7 | horn | PIEZO STRAIN HORN | hybrid | `:1988` to `2041` | STRAIN |
| 8 | comb | CANTILEVER BANK | exotic | `:2042` to `2119` | SHAKE |
| 9 | auxetic | AUXETIC STRAIN GAUGE | metamaterial | `:2120` to `2178` | STRETCH |
| 10 | triaxial | THREE AXIS LOAD CELL | metamaterial | `:2179` to `2246` | FORCE VECTOR |
| 11 | bistable | SNAP THROUGH ARRAY | metamaterial | `:2247` to `2353` | LOAD |
| 12 | gradient | LOG LOAD CELL | metamaterial | `:2354` to `2413` | LOAD |
| 13 | absorber | RF ABSORBER TILE | exotic | `:2414` to `2469` | RF SWEEP |
| 14 | rfpatch | CHIPLESS RF STRAIN TAG | exotic | `:2470` to `2545` | INTERROGATE |
| 15 | encoder | ROTARY ENCODER | well behaved | `:2581` to `2764` | SHAFT |
| 16 | wiper | POTENTIOMETER | well behaved | `:2765` to `3097` | KNOB |
| 17 | matrix | PRESSURE MATRIX | piezoresistive | `:3098` to `3175` | TOUCH |
| 18 | level | LEVEL PROBE | well behaved | `:3176` to `3255` | FILL |
| 19 | hotwire | THERMAL FLOW SENSOR | hybrid | `:3256` to `3347` | FLOW |
| 20 | whisker | TACTILE WHISKER | hybrid | `:3348` to `3441` | CONTACT |

Physics and readouts per archetype are tabulated in `fab-knowledge:sources/benches/benches-conductive-a.md` section 1 (lines 111 to 137 of that note) and match this file; the potentiometer (16) is the canon `printed-rotary-pot` STYLUS provenance (resistive arc, full collector ring, keyed carrier on a 6 mm D shaft (`dShaft`), journal, snap ring groove, end stops, optional detent; sim wear raises contact R `8k (1 + wear/4000)` and noise `min(0.25, wear/60000)`). The KNOB sim (`:3578` to `3597`) puts the shoe contact resistance between the tap and the load, not in the divider leg: `Rpar = Rlo (Rc + Rl) / (Rlo + Rc + Rl)`, `V = Rpar / (Rpar + Rhi)`, so a high-impedance input never sees the shoe and only the load bends the curve; the sim states that wear noise, not resistance drift, is what ends a printed pot.

Interaction model contract (`:3455`): `inputs [{k, label, min, max, step, unit, def}]`, `read(ctx, s) -> {chans, say, digital}`, optional `move(ctx, s) -> {partName: {dz, rot, bend, dy, tilt, stretch, squash, modal, dimple}}`; the renderer's `deform()` applies the moves per part.

### 4.6 Gates and exports

`runGates` (`:4396` to `4424`): fits 256 cube; every part over 1.5 layers; conductive slot conductive; flex slot elastomeric if used; closed manifold shells (`edgeCheck`, `:4425`); bed temps within 35 C; hardened nozzle warning; circuit continuity and isolation.

`make3MF` (`:4232` to `4330`): one `3D/3dmodel.model` with every part as an object plus an assembly object whose components point back at the same file, every triangle carrying `paint_color="<slot>"`, `project_settings.config` with about 100 per-filament keys written N long. THINPOT replaced this writer with the print-forge port (never `paint_color`, only preset names plus per-filament vectors, vectors exactly N long, throws on `extruder_variant_list`), because the v1 dialect did not match what Flash Studio round trips (verified-claims C2).

STL zip per part plus a README print card, single STL of visible parts, print card text, design JSON `{v 1, type, params, slots, layerH, nozzle, printerId, printId, presetPattern, writeFilaments}`.

### 4.7 Known defects (fixed or carried)

- Encoder fit reads `P.armW`, which is not an encoder param (`wiperW` is), so `fit('shoe on its track')` is NaN and always not ok (`:2757`); THINPOT replaced the fit.
- Encoder B marks offset by `step/2` (180 electrical deg) while the sim uses `step/4`; open in both versions (CANONS.md section 3.1 sets the port to step/4).
- Welcome card says fourteen archetypes; twenty are registered.
- `EZ` z overlaps between different materials (dielectric, frames, platens, ground plane); THINPOT removed them so different parts abut exactly.

## 5. UX anatomy

Header: FEELER wordmark with a pink dot, mono subtitle, tabs `1 TYPE / 2 SHAPE / 3 DRIVE / 4 FILAMENT / 5 PRINT` with ticks on visited tabs (`renderTabs`, `:4745`), chips PARTS, TRIS, MASS, GATES n/m. Stage: own WebGL renderer, void background with a pink grid rule, title, ISO, TOP, FRONT, GHOST, EDGES, SPIN; legend with per-part toggles; size and layers. Rail: drive controls and slot legend at the top of every tab; TYPE is a two-column card grid by group (`:4850` to `4860`); SHAPE one control per param with hints and a readout panel; DRIVE OUTPUT bars, SCOPE sweep, CIRCUIT net report and gaps that close, WIRING, YOU ALSO NEED, ASSEMBLY, FITS; FILAMENT four slots; PRINT layer, nozzle, printer profile fold, pauses, exports, checks. Welcome card. No hook global.

## 6. Tests and harness

None in the file; tested by hand in the chat. In-page gates only.

## 7. Port map

| item | value |
|---|---|
| packages | geom, mesh (exact prism, slab list), circuit (net solver, articulation check), sim, profile (materials), archetypes, 3mf (superseded dialect), ui-core |
| feature kinds | conductor, contact, port, pad, pocket, window, detent, pin_in_slot, bore, boss |
| canon ids | dome-button (proven; v1 is its first form), printed-rotary-pot (STYLUS provenance), capacitive-plate; v1 archetypes map to the `feeler-<id>` candidates through THINPOT |
| canon MISSING | none beyond THINPOT's list; v1-only constructions (rim-mounted revolved dome with floating PLA puck, `paint_color` 3MF dialect) are retired and should stay out of the canon |
| reference ids | buttons/dome, sensors/rotary-pot (named in CANONS.md; no folder yet) |
| reference MISSING | none specific to v1 |
| milestone | M06 (candidates via THINPOT), M10 (STYLUS) |
| lineage row | MISSING |
