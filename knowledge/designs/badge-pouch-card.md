# Badge pouch card: how it is made

Record written 2026-10-05 from the original files. Slug `badge-pouch-card`. Printed paper inserts for a clear con badge pouch; no code shipped, no copper. It matters to the fabrication family because SHIM's guide sticker inherits its format and type roles (`fab-knowledge:originals/shim/RECORD.md`).

Number rules for this file. A number in a table is read from the file named in that row (PNG header, PDF objects); "computed" means a conversion shown here; "measured" means read off the rendered image on 2026-10-05; "inferred" means a reading with no file behind it.

Short paths: `F` is `fab-knowledge:originals/badge-pouch-card/files/`.

---

## 1. Identity and revision

| field | value |
|---|---|
| name | badge pouch cards: hack.build card plus two con joke cards |
| owner's slug | badge-pouch-card |
| canonical files | `F/hackbuild-badge-card.png`, `F/defcon-meme-inspector-card.png`, `F/defcon-party-qa-card.png`, `F/badge-cards-print.pdf`; hashes in `fab-knowledge:originals/badge-pouch-card/SHA256SUMS` |
| date | PDF `CreationDate` D:20260808233334+00'00' (2026-08-08 23:33 UTC); `~/Downloads/badge-cards-print.pdf` is byte identical, mtime 2026-08-08 16:34 local |
| process | paper print at 100 percent, cut on crop ticks, slid into a clear 4 x 3 in pouch |
| producer | "ReportLab PDF Library" (PDF `/Producer`) |

Revisions: one. The generating script is not in the harvest or in Downloads; only its outputs exist. `~/Downloads/badge-imposer.html` and `badge-imposer (1).html` (2026-09-04, "Badge Imposer", a generic imposition tool with its own palette) and the `badge_*in_300dpi.png` series (2026-06 and later) are other badge projects, not copied.

Why this revision: the only one; the three cards and the print sheet are what the owner printed.

`files/`: the three 1200 x 900 PNGs, the print PDF, `uploads/` (the HACK.BUILD wordmark screenshot of 2026-08-08 16:27 and two DEFCON skull references).

---

## 2. What it makes and for whom

Three 4 x 3 in insert cards for the owner's con badge pouch: the hack.build identity card with the `@virgilvox` handle, and two DEFCON joke cards (MEME INSPECTOR, PARTY QUALITY ASSURANCE). The hack.build card is the visual source for SHIM's printed face. The DEFCON marks are a third party's identity; those two cards are personal con inserts and stay out of hack.build product.

---

## 3. Shots

No viewer exists, so the shots are the shipped card PNGs and a render of the print PDF (`sips` on macOS, first page, 1275 x 1650 px, which is 150 dpi for a US Letter page, computed). The PDF page has no background fill, so the render shows black outside the cards. Files in `fab-knowledge:originals/badge-pouch-card/shots/`.

| file | caption |
|---|---|
| `b01-hackbuild-card.png` | The hack.build card, 1200 x 900: cream paper with grain, hand-drawn wavy ink frame, "HACK" in a brush marker with a pink blob full stop, "BUILD" knocked out of a rough ink block, the circle-and-wrench mark with the wrench in pink beside `@virgilvox` in a typewriter face, tagline "make things. break things. repeat." in an italic serif. |
| `b02-meme-inspector-card.png` | Black field, yellow and black hazard stripes top and bottom, DEFCON wordmark with a Jolly Roger in the O, MEME in white, INSPECTOR in green, 20 skull 26 in yellow. |
| `b03-party-qa-card.png` | Black field, DEFCON wordmark, PARTY with pink and cyan offset shadows, QUALITY ASSURANCE in cyan, 20 (pink) skull 26 (cyan), confetti. |
| `b04-print-sheet-letter.png` | The Letter imposition: two of each card in a 2 x 3 grid with grey crop ticks and the footer "badge pouch cards, 4 x 3 in each, print at 100% scale (no fit to page), cut on tick lines". |

---

## 4. Constructions

### 4.1 Card format

| item | value | source |
|---|---|---|
| card | 4 x 3 in | PDF footer |
| raster | 1200 x 900 px, which is 300 dpi at 4 x 3 in (computed) | PNG headers |
| hack.build type roles | display: brush marker (HACK, BUILD); handle: typewriter (Special Elite family, inferred from the glyphs); tagline: italic serif (Libre Baskerville italic, the face SHIM's `text.py` loads as `bask-italic` for the same tagline) | b01, `fab-knowledge:originals/shim/files/text.py` line 14 |
| colours | ink, cream paper, pink accent on the full stop and the wrench | b01 (measured) |

### 4.2 Print imposition (the reusable mechanism)

One US Letter page, 612 x 792 pt; six 288 x 216 pt cells (4 x 3 in), two of each card, at x 18 and 306 pt, y 504, 288 and 72 pt; 0.5 pt grey crop ticks on the cell lines outside the art; footer instruction to print at 100 percent with no fit to page and cut on the tick lines (`fab-knowledge:sources/benches/benches-copper-pcb-a.md` section 3, read from the PDF; the PDF holds the three cards as ASCII85 images, measured). Margins: 18 pt left and right, 72 pt top and bottom (read from the page content stream on 2026-10-05 with pypdf; it replaces the earlier inference).

Content stream detail (measured, `F/badge-cards-print.pdf` page 1, 496 byte stream):

| element | value |
|---|---|
| cells | `288 0 0 216 x y cm` image draws at x 18 and 306, y 504 (hack.build card), 288 (MEME INSPECTOR), 72 (PARTY QA); the cells abut with no gutter, so neighbouring cards share one cut line (row order confirmed in b04) |
| crop ticks | 0.5 pt lines in grey 0.4, each 10 pt long and starting 4 pt off the cell edge: vertical ticks above the sheet top (y 724 to 734) and below the bottom (y 68 to 58) at x 18, 306, 594; horizontal ticks left (x 14 to 4) and right (x 598 to 608) at y 720, 504, 288, 72. Ticks sit only outside the card block, never between cards |
| footer | Helvetica (`/F1`, base 14 Type1, WinAnsi) at 7 pt, grey 0.5, at (18, 48): "badge pouch cards, 4 x 3 in each, print at 100% scale (no fit to page), cut on tick lines" |
| images | three 1200 x 900 DeviceRGB XObjects, each placed twice, filters ASCII85 plus Flate |
| producer | "ReportLab PDF Library - (opensource)", Author and Creator "anonymous" |

Construction for a port, in order: fix the card size in points; compute a grid that fits the sheet with equal side margins; place each image at its cell origin at native size; draw 10 pt ticks, 4 pt off the block, on the extension of every cell edge outside the card block (with abutting cells one cut serves two cards); print the instruction line in the bottom margin; refuse "fit to page" in the export settings note.

---

## 5. UX anatomy

None: no viewer, no script. The deliverable is a print-ready PDF plus 300 dpi PNGs.

## 6. Known limits

1. The source script is missing; the cards cannot be regenerated or edited as data.
2. Third-party marks on two of the three cards.
3. The PDF page has no background fill; a viewer that renders transparency as black shows a black sheet.

## 7. Tests and harness

None shipped.

## 8. Port map

| item | value |
|---|---|
| packages | an export or print step: `print.impose` (cells, crop ticks, 100 percent instruction) is an idea only in the plan (`fab-knowledge:synthesis/mappings.md`) |
| feature kinds | none |
| canon ids | none |
| canon MISSING | print imposition with crop ticks as an export kind; badge insert format 4 x 3 in at 300 dpi |
| reference ids | `cosmetic/badge` (README only in the handoff reference README; not in INDEX) |
| milestone | none |
| lineage row | MISSING; the lineage edge "SHIM guide sticker inherits the badge card's type roles" is recorded nowhere in `lineage.json` |
