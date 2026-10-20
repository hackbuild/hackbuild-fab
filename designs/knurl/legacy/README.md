# KNURL legacy copy

The shipped KNURL bench (mechanical tasbih: tray, lid, count wheel, rounds
star, detent strip), its example designs, its default STL set and its own
README, kept byte identical as the parity inputs of M10-T08 and the
BenchHook adapter target of M10-T01 (D-142, D-156, D-222). Nothing here is
edited; `shasum -a 256 -c SHA256SUMS` checks every file.

| field | value |
|---|---|
| record | `knowledge/designs/knurl.md` (UX of record: section 6) |
| produced by | the KNURL bench chat, one hand-written file, no git; revisions `knurl.html` to `knurl (8).html` on 2026-09-07 (record 1.1) |
| copied from | `fab-work-directory:benches/knurl/outputs/knurl/` (harvest of 2026-09-14) |
| equal to | `fab-knowledge:originals/knurl/files/` for `knurl.html`, `README.md` and the two example JSONs (compared by sha256 2026-10-14); `knurl_default_stl.zip` is not in the originals set |
| canonical | `knurl (8).html` (2026-09-07 20:45), the newest revision; every earlier one adds a fit or print correction that (8) keeps, and (8) adds only the keffiyeh art (record 1.2) |

## Files

| file | sha256 (12) | bytes | lineage rows |
|---|---|---|---|
| `knurl.html` | 90a7f98e708e | 137674 | `knurl.bench/knurl-8` (canonical, originals), `knurl.bench/bench-outputs` |
| `examples/knurl_default.json` | 0a1ca507e485 | 2931 | `knurl.example-default/knurl-8`, `/bench-outputs` |
| `examples/knurl_keffiyeh.json` | cfb67046f0e6 | 3021 | `knurl.example-keffiyeh/knurl-8`, `/bench-outputs` |
| `examples/knurl_default_stl.zip` | 0132c744e569 | 4765047 | `knurl.example-stl/bench-outputs` (9 STLs and README.txt) |
| `bench/README.md` | f8a0cc539d64 | 15119 | `knurl.readme/knurl-8`, `/bench-outputs`; the bench's own README, moved under `bench/` because this file holds the lineage |
| `three-0.185.1.zip` | dff55a31dca2 | 2135440 | `knurl.three-module`, `knurl.three-core`, `knurl.three-orbit-controls`, `knurl.three-license` (each `/npm-0-185-1`, dest the zip member) |
| `google-fonts-20261018.zip` | e4d97eaf1da2 | 866054 | none yet (the rows are proposed in M10-T01-F1) |
| `shots/k01` to `k06` | per SHA256SUMS | | copied from `fab-knowledge:originals/knurl/shots/` for the side by side review |

Sizes and hashes measured 2026-10-14.

## The three.js copy

`knurl.html` imports three 0.185.1 and OrbitControls from cdn.jsdelivr.net
through an import map (line 1229), so the stage is dead offline (record
section 9). `three-0.185.1.zip` holds `three@0.185.1/build/three.module.js`
(sha256 bbf5ed13fe43), `build/three.core.js` (3718df126d69),
`examples/jsm/controls/OrbitControls.js` (faabb4e8dfd9) and the MIT
`LICENSE` (8b378ebe60e2), byte identical to the npm tarball
`three-0.185.1.tgz` (npm integrity
`sha512-5aojFCXKwnjBRZvUnt3WFfEcvUJgkN5LlijRFN95hMy8WVkG4I0QNcJE+OuWvuJ0bOdStrbfXn0pkd6/QyiAlg==`,
checked by `npm pack` on 2026-10-14). `three.core.js` carries dashes in its
comments, which RULES.md allows in no repo file, so the four files are
members of a stored zip written by `tools/legacy/stored-zip.mjs` (the
STYLUS README says how). The hook suite serves the import map URLs from
the zip members (`knurl.offline` in `tools/hook/legacy-adapters.ts`) and
reports the network row as not run; the page itself is unchanged.

## The Google fonts copy

`knurl.html` links Amiri, IBM Plex Mono, Permanent Marker, VT323, Noto
Naskh Arabic and Scheherazade New from fonts.googleapis.com (line 9) and
rasters the face and back calligraphy with them, so offline the text falls
back to other faces and the mesh moves: 97,820 tris offline against
98,288 in `shots/k01` (measured 2026-10-18, system Chrome 150, default
design, assembled view). `google-fonts-20261018.zip` is a stored zip of
what Google served Chrome 150 on 2026-10-18 for that link, at the paths
the two URL prefixes map to:

- `fonts.googleapis.com/css2`, the stylesheet (sha256 018973c54de6,
  26083 bytes), unchanged, its 46 faces naming 41 woff2 files;
- `fonts.gstatic.com/s/<family>/<version>/<file>.woff2`, each of the 41,
  unchanged;
- `LICENSES/<family>-OFL.txt` for the five OFL families and
  `LICENSES/permanentmarker-LICENSE.txt` (Apache-2.0), from
  github.com/google/fonts main on the same day.

Served from the zip, with the stylesheet typed `text/css`, the build gives
98,288 tris, equal to `shots/k01` (measured), and the face preview shows
the same calligraphy (looked at by an agent, not a person). Served as
`application/octet-stream`, Chrome refuses the stylesheet and the count
stays 97,820 (measured), so the hook's offline route has to type the
member `css2` as `text/css`. The font versions are the ones Google served
on the fetch day; the shot was taken 2026-09-07, and the equal count is
the evidence they did not change the raster. `test/fonts-offline.test.ts`
checks the families, members, woff2 magic, licences and the SHA256SUMS
line.

## Hook

No `BENCH`: the page keeps the kernel on `window.KNURL` and writes
`<tris> tris, <ms> ms` into the status pill `#pill` after a build (line
1518). The adapter `knurl` is ready when both hold; design JSON, exports
and drive are not provided by the legacy bench.

## Inherited defects the port must not carry

- The stage needs a network: three and the six Google fonts load at run
  time (record section 9).
- Presets are closures that replace `D.colors` without `recolor()`, so the
  keffiyeh preset shows cream and black in the face preview and green and
  gold in 3D (measured, `shots/k05`); presets become data (M10 findings).
- No undo, no hook beyond `window.KNURL`, no persistence between sessions
  except JSON save and load.
