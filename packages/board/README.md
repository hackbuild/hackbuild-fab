Boards that refuse to emit wrong: two backends, one pad and net record. Tier 1; milestone M08 (PACKAGES.md). May import spec, profile, catalog and circuit (tools/tiers.json).

Built: M08, staged, not released.

The record is `BoardRecord` in `spec/board-features.ts`, re-exported here: board frame, mm, origin at the outline bounding-box minimum, +y up, top view. `parseBoardRecord` enforces the rules the type cannot and `recordHash` hashes it (D-051 method). The tscircuit set is pinned in `package.json`; the pins under `hbf.pinsBlocked` wait on the Node 24 engines question in docs/plan/PLAN.md section 16.
