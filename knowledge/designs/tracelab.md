# TraceLab Explorer: how it is made

Record written 2026-10-05 from the original file. Slug `tracelab`. A single-file library of 139 printable conductor templates (touch buttons, sliders, wheels, touchpads, coils, antennas, interdigitated and resistive sensors, heaters, thermocouple masks) with a 25-field electrical record per template (which MCU peripheral reads it, what front end it needs, how to wire and measure it, what material stack it needs, whether a plain MCU can read it, a connectivity audit verdict), 13 parametric SVG generators, print and SVG export.

Provenance is unknown. The file carries no hack.build fonts, colours or marks, uses underscore file naming unlike the owner's tools, and no chat or registry row names it; it was found by the Downloads sweep (`fab-knowledge:sources/downloads/dl-sweep-unmatched.md` section 3.3). Its records are tier inferred until the owner confirms the source (`docs/plan/CANONS.md` line 1184).

Number rules for this file. A count is measured from the embedded `TEMPLATES` array on 2026-10-05 (also written to `F/templates-record.extracted.json`). A generator constant is a declared default from the file. "Measured" also covers the headless drive of 2026-10-05 (Chrome, puppeteer-core, 1280 x 860). "Inferred" means a reading of the code. No template was printed or measured electrically.

Short paths: `F` is `fab-knowledge:originals/tracelab/files/`. `T` is `F/TraceLab_Explorer.html` (one script: `const TEMPLATES=[...]` then `CATEGORIES`, `MATERIALS`, `MCU_CLASSES`, `IFACE_TAGS`, `state`, helpers, `GENERATORS`, UI functions). Functions are cited by name because the script is one long line per block.

---

## 1. Identity and revision

| field | value |
|---|---|
| name | TraceLab Explorer |
| owner's slug | tracelab |
| canonical file | `T`, sha256 ed2dad77d3b05a862f9976faf798ee6d72c193431538799e709c074eb61c1844, 1719199 bytes |
| date | 2026-08-10 18:33 (`~/Downloads/TraceLab_Explorer.html`) |
| content | 139 templates in 25 categories, 25 fields each, 13 generators plus "static template only" |
| every hash | `fab-knowledge:originals/tracelab/SHA256SUMS` |

### 1.1 Every revision found

| when (2026-08-10) | file | content | role |
|---|---|---|---|
| 15:57 | `circuit_trace_svg_library_viewer.html` (1243602 B), copied to `F/lineage/circuit_trace_svg_library_viewer-2026-08-10-1557.html` | 43 templates with 6 fields, 11 parametric generators (sweep reader count) | lineage |
| 16:53 | `viewer (2).html` (1632576 B), copied to `F/lineage/viewer-2-2026-08-10-1653.html` | 139 templates with 19 fields, 12 generators plus static, titled "TraceLab Explorer" | lineage |
| 18:33 | `T` | 139 templates with 25 fields (adds `mcu_direct_class`, `interface_tags`, `plain_mcu_ready`, `mcu_quick_take`, `fabrication_status`, `connection_audit`), adds the `round_coil` generator, renames several templates to state isolation ("4-element mutual-capacitance slider, isolated TX/RX", "Capacitive button with isolated guard ring", "4x4 self-capacitive touch grid, 16 local terminals") | canonical |

### 1.2 Why this revision

It is the newest and the most complete record: the six fields added at 18:33 are the ones that say whether a template can be read and whether its copper is connected. The 16:53 build has the same 139 drawings without those answers.

### 1.3 What is in `fab-knowledge:originals/tracelab/files/` and what was left out

Kept: `T`, both earlier builds, and `F/templates-record.extracted.json` (the 139 records without their SVG bodies, extracted 2026-10-05 so a builder can read the fields without opening the page). Nothing left out; the 139 SVGs live inside `T`.

---

## 2. What it makes and for whom

A reference shelf for someone about to print, cut or etch a sensor surface: pick a template, read what it needs electrically, export its SVG at 1:1 in mm (or regenerate it with your own channel count and size), and know before cutting whether a plain microcontroller pin can read it. It is the broadest single catalogue of conductor archetypes in the corpus and the record shape the archetype canon asks for.

---

## 3. Shots

Driven headless 2026-10-05 from `T`; ready under 0.2 s; zero page errors (measured). The page's own `selectTemplate(file)` was used. Files in `fab-knowledge:originals/tracelab/shots/`.

| file | caption |
|---|---|
| `t01-library-wheel-6ch-selected.png` | `wheel_capacitive_6ch_50mm.svg` selected: list with thumbnails and badges, generated preview of the 6-sector wheel with radial leads and rotated pads, QUICK TAKE, ELECTRICAL INTERFACE (MCU class, pin type, driver, measurement), PARAMETRIC GENERATOR prefilled from the file name (6 channels, 50 OD, ring 12, margin 8, gap 4 deg, pad 3.5). |
| `t02-filter-sliders-tapered-10ch.png` | Category filter `capacitive_slider` (10 shown), `slider_linear_10ch_120x12mm_tapered.svg` selected: the list thumbnail shows the tapered wedge electrodes, the preview shows the generator's spine-and-stub approximation instead (section 6, item 1). |
| `t03-generator-linear-slider-default-5ch.png` | Linear slider generator at its defaults (5 channels, 60 x 12, gap 0.5, pad 4). |
| `t04-coil-square-mcu-needs-lc-front-end.png` | A square planar coil: MCU class "Needs inductive/LC front end", the square spiral generator. |
| `t05-midi-keyboard-12-keys.png` | `midi_touch_keyboard_12_keys.svg` with no generator ("Static template only"): QUICK TAKE badges BEST ON MCU WITH TOUCH PINS, PLAIN MCU: CONDITIONAL, AUDIT: PASS; the full stored verdict is "PASS \| repaired 12 bridge(s), removed 0 detached pad(s)". |

---

## 4. Mechanisms and constructions

### 4.1 The template record (25 fields)

`file`, `category`, `size_mm`, `title`, `notes`, `terminals`, `mcu_channels`, `pin_type`, `driver_type`, `chip_examples`, `measurement_method`, `output_type`, `wiring`, `material_stack`, `material_class`, `readout`, `resolution`, `caveats`, `mcu_direct_class`, `interface_tags`, `plain_mcu_ready`, `mcu_quick_take`, `fabrication_status`, `connection_audit`, `svg`. Example (`antenna_nfc_round_25mm_5turn.svg`): 39 x 39 mm, "2 loop terminals", pin type "RF feed / balanced feed pins to a radio or NFC front end, not GPIO", chips PN532, ST25R3916/3911B, MFRC522, measurement "Measure/tune loop inductance, Q and resonance with a VNA", MCU class "Needs RF front end", plain MCU ready "no", audit PASS.

| field | distribution (measured, 139 templates) |
|---|---|
| category (25) | capacitive_touch 14, inductive_coil 13, capacitive_touchpad 12, antenna 11, capacitive_slider 10, functional_material_layer 10, position_sensor 9, environmental_sensor 8, capacitive_wheel 6, pressure_sensor 5, temperature_sensor 5, force_sensor 4, resistive_trace 4, chemical, electrochemical, inductive_coupler, midi_touch, resistive_actuator, resistive_sensor, switch_contact 3 each, piezoelectric, strain 2 each, biopotential, optical, resistive_protection 1 each |
| material_class | copper or conductor only 101; functional or special material 38 |
| mcu_direct_class (20 buckets) | best on MCU with touch pins 33; needs inductive/LC front end 16; needs mutual-cap controller 12; needs RF front end 11; not standalone 10; direct on plain MCU (ADC) 9; direct ADC after stack complete 8; needs external AFE 8; and 12 smaller buckets |
| plain_mcu_ready | no 69, conditional 44, yes after stack 14, yes 12 |
| connection_audit | PASS 138 (98 plain, 36 "PASS, repaired N bridge(s), removed 0 detached pad(s)" with N from 1 to 18, 4 PASS with a sentence); 1 "LAYERED REFERENCE" (`touch_keypad_mutual_4x4_8pin.svg`: TX and RX overlaps valid only on separate layers) |

`interface_tags` (11): direct_adc, direct_gpio, direct_gpio_adc, external_afe, gpio_rc_touch, mutual_cap, not_standalone, power_driver, rf_front_end, stack_required, touch_peripheral. The audit itself (bridge repair, detached pad removal) ran outside this file; only its verdict is stored.

### 4.2 Parametric generators (`GENERATORS` in `T`)

Every generator returns `wrapSvg(w, h, body)`: an SVG in mm (`width="Wmm"`, `viewBox 0 0 W H`), black fill, values rounded to 0.001 (`f()`). Each channel is wrapped in `<g id="chN">` (or `ROW_n`, `COL_n`, `PAD_n`, `A`, `B`) so a downstream tool can split nets by group.

| generator | defaults | construction |
|---|---|---|
| `round_button` | d 18, margin 7, lead 1.2, pad 4 | disc, vertical lead to a square pad below |
| `rounded_rect` | 18 x 12, r 3, margin 7, lead 1.2, pad 4 | rounded rect, lead, pad |
| `ring_button` | OD 18, ID 10, margin 8, lead 1.2, pad 4 | evenodd ring path (`ringPath`, two arcs per circle), lead, pad |
| `linear_slider` | 5 ch, 60 x 12, margin 5, gap 0.5, pad 4 | per channel at `pitch = length / ch`: a 1.2 spine, five 2.4 mm fingers alternating left (`c - gap - 2.4`) and right (`c + gap`), lead and pad below |
| `wheel` | 6 ch, OD 50, ring 12, margin 8, gap 4 deg, pad 3.5 | `sector()` annular sectors from `a0 = i seg + gap / 2` to `a1 = (i + 1) seg - gap / 2`, a 1.1 radial lead from the outer radius at the sector mid-angle out to `r = OD/2 + 0.65 margin + 0.9 pad + 1.5`, and a square pad rotated to that angle; sheet `OD + 2 (margin + pad + 2)` square |
| `interdigitated` | 30 x 60, 10 fingers per side, gap 1, margin 6, pad 5 | two 1.2 busbars on the long edges, fingers `fl = (aw - 2.4 - gap) / 2` long (13.3 at defaults), A fingers `pitch - 0.6 gap` tall, B fingers offset `0.5 pitch - 0.15 gap` and 0.85 as tall. Each finger reaches only half the width, so A tips end at `m + 1.2 + fl` and B tips start `gap` further on: the two combs meet tip to tip along one centre line and never interleave (computed from the build; section 6, item 8) |
| `square_coil` | 50 outer, 8 turns, trace 0.7, gap 0.5, margin 8, pad 4 | inward rectangular spiral stepping by `trace + gap` per side, stroked path, pads at both ends |
| `round_coil` | OD 50, 8 turns, trace 0.7, gap 0.5, margin 8, pad 4 | Archimedean spiral `r = OD/2 - trace/2 - t (turns - 1) pitch` over `turns` revolutions from the bottom (angle PI/2 in SVG y-down), sampled at `max(80, 80 turns)` points; inner end pad, outer end led straight down to a pad. The radius shrinks `(turns - 1) pitch` over `turns` revolutions, so neighbouring turns sit `pitch (turns - 1) / turns` apart: 1.05 mm at defaults, leaving 0.35 mm of copper gap against the declared 0.5 (computed) |
| `mutual_rows`, `mutual_cols` | 8 x 12 at pitch 7, width 4, lead 10, pad 4, margin 6 | one layer of bars centred in each pitch, a 1.2 lead off the right end (rows) or bottom end (columns) and a pad; groups `ROW_n` and `COL_n`; the two layers are separate files with matching sheet origins |
| `selfcap_grid` | 4 x 4 cells 14, gap 3, margin 8 | rounded square pads (corner 2), each its own `PAD_n` group, with no leads or terminals: an inner cell of a grid larger than 2 x 2 cannot be wired on one layer |
| `resistive_touch_x`, `resistive_touch_y` | 80 x 55, bus 4, pad 5 | active rectangle with busbars on two opposite edges, leads to pads |

`guessPreset(t)` checks file-name substrings in order (`touch_button_round`, `touch_button_rounded_rect`, `touch_button_ring`, `slider_linear`, `wheel_capacitive`, `coil_square`, `touchscreen_mutual` with rows or columns, `touch_grid_selfcap`, and so on; the round button takes the first number anywhere in the name as its diameter) and reads parameters with regexes (`slider_linear_(\d+)ch(?:_(\d+)x(\d+)mm)?`, `wheel_capacitive_(\d+)ch`, `coil_square_(\d+)mm`, `touchscreen_mutual_(\d+)x(\d+)_`) and opens the matching generator with those parameters; `selectTemplate` shows the generated preview, marked GENERATED and "BASED ON: <template>".

### 4.3 Export and print

`renderSvg` parses the SVG, recolours every non-none fill and stroke to the chosen trace colour, scales the preview by zoom, and keeps an unscaled export copy; Export SVG writes that copy; Print current uses a print stylesheet that hides the controls, so the sheet prints at 1:1 in mm. Background colour and a transparent sheet toggle apply to the preview.

---

## 5. UX anatomy and what makes it excellent

| region | contents |
|---|---|
| shell | brutalist print-first: white paper, black 2 px borders, grey screen `#d9d9d9`, Arial; no brand |
| sidebar 360 px | title, "139 templates" line; filters SEARCH (full text over every field), CATEGORY, MATERIAL, MCU SUPPORT, INTERFACE TAG, SORT, CLEAR FILTERS; list items with an SVG thumbnail on a grid, title, category and size, file name, MCU class and tag badges |
| toolbar | selection badge, count badge, FIT, 100%, PRINT CURRENT, EXPORT SVG |
| preview | grid-backed sheet, ZOOM 10 to 600 percent, trace colour, background, show grid, transparent sheet |
| right panel 430 px | QUICK TAKE (MCU class, plain MCU, audit badges, one-line take, tags), ELECTRICAL INTERFACE (pin type, driver, readout, measurement, wiring, chips), PARAMETRIC GENERATOR (family, USE PRESET, RESET, live numeric fields), TEMPLATE DETAILS (all fields), SVG SOURCE |

What makes it excellent: every drawing answers the question a builder asks next (what reads this, with what chip, wired how, what can go wrong), the MCU bucket and the audit verdict are filters, and every template exports as a 1:1 SVG.

---

## 6. Known limits and failure lessons

| # | issue | evidence | state |
|---|---|---|---|
| 1 | the generated preview replaces the library drawing: a tapered 10-channel slider (wedges in the thumbnail) is shown as the generator's spines with short stubs that never interleave with the next channel | `t02` (measured) | the library SVG and the generated SVG must be shown side by side, never one in place of the other |
| 2 | the generator's "connectivity is enforced" note holds only for its own defaults: a left finger ends at `c - gap` and a right finger starts at `c + gap`, while the spine spans `c - 0.6` to `c + 0.6`, so any `gap` above 0.6 mm detaches every finger on both sides from its spine | `linear_slider` build (computed from the code) | a generator must prove its own connectivity (island count per group) |
| 3 | the audit (bridge repair) ran elsewhere; only its verdict string is stored | `connection_audit` | the port reruns it |
| 4 | electrical values are text: no inductance, capacitance or resistance is computed for any template | record fields | |
| 5 | provenance unknown | section 1 | inferred tier |
| 6 | one template is valid only as two layers | `touch_keypad_mutual_4x4_8pin.svg` | flag it as layered reference |
| 7 | `square_coil` puts a 4 mm pad on the inner end of a spiral with a 1.2 mm pitch, so the pad lands across the neighbouring turns and shorts them; the inner terminal also needs a bridge on a second layer, which the single-layer SVG cannot carry. `round_coil` does the same with its inner pad | `t04` (measured); `round_coil` read from the code | a coil generator must clear its inner pad and declare the bridge |
| 8 | `interdigitated` does not interdigitate: A and B fingers each span half the width and face each other tip to tip across one `gap`, so the sensing edge is one centre line instead of 2 x fingers interleaved edges | computed from the build constants | the generator must place B fingers between A fingers over the full width minus the gap |
| 9 | `round_coil` spaces turns at `pitch (turns - 1) / turns`, below the declared trace plus gap | computed | spiral radius steps one pitch per revolution |
| 10 | `selfcap_grid` draws pads with no leads | read from the code | a grid generator routes or declares a second layer |

---

## 7. Tests and harness

None ship. Drive 2026-10-05: five shots, zero page errors (measured).

---

## 8. Port map

| item | value |
|---|---|
| packages | `archetypes` (the 25-field record as a seed shape; MCU bucket and interface tags as read models), `copper` (SVG generators for buttons, sliders, wheels, coils, interdigitated, resistive layers), `exports` (1:1 SVG and print) |
| feature kinds | `conductor`, `pad`, `port`; layered pairs (rows and columns on separate layers) need a layer assignment the record does not carry |
| canon ids | none registered; listed as "archetype seed candidate, tier inferred until the owner confirms provenance" (`docs/plan/CANONS.md` line 1184) |
| canon MISSING | every one of the 139 as an archetype entry; in particular `cap-wheel-sectors`, `cap-linear-slider` (interleaved), `planar-spiral-coil` (square and round), `interdigitated-electrode`, `mutual-cap-rows-cols`, `selfcap-grid`, `resistive-touch-4wire`, `nfc-loop`, `pcb-meander-monopole`, `copper-serpentine-heater`, `kelvin-shunt` |
| reference ids | MISSING |
| milestone | none named (archetype seed review, M06 or M11 by the canon process) |
| lineage row | MISSING |
