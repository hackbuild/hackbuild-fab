# designs

One folder per design: `chase.ts` and `build.ts` at the top, the harvested
original under `legacy/`. A `legacy/` tree is kept byte identical to the
file it was copied from; its `SHA256SUMS` checks it, and its `README.md`
says where it came from. A `legacy/` tree takes the licence its folder's
`chase.ts` declares (D-185, `tools/licences.json` path map).

A legacy file whose bytes carry a character RULES.md bans in every repo
file (an emoji entity, a dash in a third-party comment) is kept byte
identical as a member of a stored zip written by
`tools/legacy/stored-zip.mjs`; `SHA256SUMS` lists the zip, and the
folder's README lists the member's sha256 (M10-T01: `stylus/legacy/` and
`knurl/legacy/three-0.185.1.zip`). `tang/` and `gudgeon/` are archive
folders: a lineage README and a `SHA256SUMS`, no chase or build.

Legacy copies added from M10-T01 on stay out of git (D-286): the folder
keeps its `README.md` and `SHA256SUMS` in the repo, the files themselves
live in the owner's archive (`fab-knowledge:originals/`), and a test that
reads one reports not run when it is absent.

## Paths inside legacy files

The legacy harnesses ran on the owner's machines and in chat sandboxes, so
some of them name the paths they ran under: `/home/claude/...` and
`/mnt/skills/...` (sandbox paths), and the owner's working tree. Those
files are kept as they were, so a harness that reads or writes one of
those paths does not run from a clone without editing a copy first. Files
that carry such a path, as of 2026-10-13 (grep, computed):

| file | path it expects |
|---|---|
| `blocks/legacy/boss-src/export_all.js` | `/mnt/skills/plugins/print-forge/assets/orca3mf.js` |
| `blocks/legacy/boss-src/smoke.py` | `/home/claude/boss/out`, `/mnt/skills/plugins/print-forge/scripts/validate_3mf.py` |
| `blocks/legacy/boss-src/browser_sweep.py` | `/home/claude/boss/out`, `/mnt/skills/plugins/print-forge/scripts/validate_3mf.py` |
| `derrick/legacy/arm_build.py` | `/home/claude/out` |
| `derrick/legacy/smoke_arm.js` | `/home/claude/out` |
| `slug/legacy/tri2.mjs`, `slug/legacy/placecheck.mjs` | `/home/claude/slug/node_modules/three` |
| `reference/copper/*/legacy/gen_*.py` | `/mnt/skills/user/board-forge/assets/hackbuild-logo.svg` (the mark sits at `reference/copper/_inputs/hackbuild-logo.svg`) |
| `reference/fit/ogee16-r16p/legacy/fits.stdout.txt`, `fits-slide055.stdout.txt` | a `# source:` header naming the OGEE16 source zip in the owner's working tree, as recorded output only |
| `reference/boards/spindle-r1/gen.py` and its `expected/report.json`, `expected/cpl.json` | the absolute path of the SPINDLE R1 `pcb.py` and `spindle-CPL.csv` in the owner's working tree, as a provenance string only; nothing reads it, and changing it would move the committed goldens |

The provenance tables in each `legacy/README.md` name sources in the
owner's archive as `fab-knowledge:<path>` (plan and evidence) and
`fab-work-directory:<path>` (bench outputs), the form `CLAUDE.md` defines.
Neither is public; the sha256 in each table is what a reader can check
against a copy.

One record was trimmed when the tree was prepared for publishing:
`davit/legacy/r4/records/davit_r4_sweep_run_2026-10-04.txt` lost its first
four lines, two trimesh `RuntimeWarning` lines that named a local scratch
folder. The JSON body is unchanged and `r4/SHA256SUMS` holds the trimmed
hash. The record as run is
`fab-knowledge:evidence/x/downloads/dl-robots-machines/records/davit_r4_sweep_run_2026-10-04.txt`
(sha256 96d716e4baaaccb3f4f0901225cd300bbfa2d58cd2e2e0ffb43a281eca19333e).

## Third-party code inside legacy files

Several legacy pages are single files with libraries inlined. They are
copies of the originals and are not edited, so their notices are kept
here. `THIRD-PARTY-NOTICES.txt` at the root covers the bakes only. Found
by scanning every legacy `.html`, `.js` and `.mjs` file and the pages
inside the legacy zips for library banners and signatures, 2026-10-13
(computed); `reference/test/legacy-embedded.test.ts` fails when a page
gains a library this table does not list.

| library | licence | banner kept in the file | files |
|---|---|---|---|
| three.js r128 | MIT | yes, `Copyright 2010-2021 Three.js Authors` | `cotter/legacy/cotter.html`, `knuckle/legacy/knuckle.html`, `ogee16/legacy/ogee16-buildit-app-20260818.html`, `ogee16/legacy/ogee16-plate.html`, `pip/legacy/pip.html`, `sash/legacy/sash.html`, `stipple/legacy/stipple-r17.html`, `stipple/legacy/stipple-r17b.html`, `tenon/legacy/tenon.html`, `toggle/legacy/toggle.html` |
| JSZip 3.10.1 | MIT or GPLv3, used under MIT | yes, `(c) 2009-2016 Stuart Knightley` | `cotter/legacy/cotter.html`, `knuckle/legacy/knuckle.html`, `pip/legacy/pip.html`, `sash/legacy/sash.html`, `tenon/legacy/tenon.html`, `toggle/legacy/toggle.html` |
| pako, bundled inside JSZip | MIT | named in the JSZip banner, no copyright line | the six JSZip files |
| earcut (UMD build) | ISC | no | `knuckle/legacy/knuckle.html`, `ogee16/legacy/ogee16-buildit-app-20260818.html` |
| qrcode-generator | MIT | yes, `Copyright (c) 2009 Kazuhiko Arase` | `cotter/legacy/cotter.html` |
| manifold-3d with its wasm | Apache-2.0 | a one line `manifold-3d (Apache 2.0)` comment; 3.5.3 in the pip files, version unknown in cotter | `cotter/legacy/cotter.html`, `pip/legacy/pip.html`, `pip/legacy/vendor/manifold-classic.js` |

Loaded from a CDN at run time, not inlined: three.js 0.160.0
(`davit/legacy/davit.html`, `davit/legacy/r4/sim_r4.html`,
`davit/legacy/r4/sim_r4-loose.html`, `slug/legacy/slug.html`), three.js
0.147.0 with its OrbitControls, SVGLoader and RoundedBoxGeometry examples
(`gusset/legacy/gusset-10.html`), and Font Awesome 6.5.1 CSS
(`detent/legacy/detent-plot.html` and the pages in the detent and washer
zips).

The MIT text is the one in `THIRD-PARTY-NOTICES.txt`; it applies to three.js,
JSZip, pako and qrcode-generator with these copyright lines:

    three.js          Copyright 2010-2021 Three.js Authors
    JSZip             Copyright (c) 2009-2016 Stuart Knightley, David Duponchel, Franz Buchinger, Antonio Afonso
    pako              Copyright (C) 2014-2017 by Vitaly Puzrin and Andrei Tuputcyn
    qrcode-generator  Copyright (c) 2009 Kazuhiko Arase

The Apache-2.0 text for manifold-3d is in `THIRD-PARTY-NOTICES.txt`.

`knurl/legacy/google-fonts-20261018.zip` keeps six Google Fonts families
as served (Amiri, IBM Plex Mono, Noto Naskh Arabic, Scheherazade New and
VT323 under the SIL Open Font License 1.1, Permanent Marker under
Apache-2.0); each licence text is a member under `LICENSES/`.
earcut is under ISC:

    ISC License

    Copyright (c) 2016, Mapbox

    Permission to use, copy, modify, and/or distribute this software for any purpose
    with or without fee is hereby granted, provided that the above copyright notice
    and this permission notice appear in all copies.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
    FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
    OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
    TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
    THIS SOFTWARE.

"QR Code" is a registered trademark of DENSO WAVE INCORPORATED, as the
qrcode-generator banner says.
