2D: offsets, booleans, snapping and triangulation over manifold's CrossSection. Tier 0; milestone M00 (PACKAGES.md).

Built: M00, staged, not released.

Unit-circle points come from the committed table of D-175 (`src/unit-circle.table.ts`, written by `scripts/unit-circle.mjs`); no generator here calls Math.cos or Math.sin. Regenerate with `node packages/geom/scripts/unit-circle.mjs --write`.

Text outlines (OK-01): `src/text/woff2.ts` reads WOFF2 (moved from copper, which re-exports it), `scripts/fonts.mjs` writes the committed glyph tables `src/text/*.table.ts` (IBM Plex Mono, Permanent Marker, Special Elite, VT323) from the vendored OFL-1.1 and Apache-2.0 faces in `assets/fonts`, and `src/text/outline.ts` sets text from the table with no font file, DOM or clock; the vector surface fills it. Regenerate with `npx tsc -b` then `node packages/geom/scripts/fonts.mjs --write`.
