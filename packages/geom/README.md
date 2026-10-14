2D: offsets, booleans, snapping and triangulation over manifold's CrossSection. Tier 0; milestone M00 (PACKAGES.md).

Built: M00, staged, not released.

Unit-circle points come from the committed table of D-175 (`src/unit-circle.table.ts`, written by `scripts/unit-circle.mjs`); no generator here calls Math.cos or Math.sin. Regenerate with `node packages/geom/scripts/unit-circle.mjs --write`.
