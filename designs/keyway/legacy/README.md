# KEYWAY legacy copy

The KEYWAY rev A viewer (`keyway_sim.html`: Layer stack, Sense model,
Wiring), kept byte identical as the UX input of M10-T11 and the BenchHook
adapter target of M10-T01 (D-142, D-156, D-222). Nothing here is edited;
`shasum -a 256 -c SHA256SUMS` checks every file.

| field | value |
|---|---|
| record | `knowledge/designs/keyway.md` (UX of record: section 6) |
| produced by | the cricut-midi-seven chat, one shipped revision dated 2026-08-10 18:46 (zip stamp of the owner's download, byte identical member for member to the harvest; record 1.1) |
| copied from | `fab-work-directory:benches/cricut-midi-seven/outputs/keyway/keyway_sim.html` |
| equal to | `fab-knowledge:originals/keyway/files/keyway_sim.html` (compared by sha256 2026-10-14) |
| canonical | the generator is the design: `gen_keyway.py` (sha256 d712ce48...) is the canonical file of record (INDEX.md); it and `keyway_geometry.json`, `svgpath.py` and the 2026-10-04 rerun stay where M05-T13 put them, `reference/copper/keyway/legacy/` |

## Files

| file | sha256 (12) | bytes | lineage rows |
|---|---|---|---|
| `keyway_sim.html` | 7922d05d4e12 | 73864 | `keyway.sim/rev-a` (canonical, originals), `keyway.sim/bench` |
| `shots/k0*.png` (six) | per SHA256SUMS | | copied from `fab-knowledge:originals/keyway/shots/` for the side by side review |

The generator rows are `keyway.generator/rev-a` (canonical, dest
`reference/copper/keyway/legacy/gen_keyway.py`) and
`keyway.geometry/rev-a`.

## Hook

No global: the viewer exposes nothing for a harness (record 7.5). The
adapter `keyway` is ready when the tab bar `#nav` holds its three tabs
(the `TABS` list, line 345). Design JSON, exports and drive are not
provided by the legacy bench.

## Inherited defects the port must not carry

- Fonts load from Google Fonts at run time (line 4); offline the marker
  title falls back.
- With the default 12 ms attack the viewer can report velocity 0 on a full
  press (measured, record 7.3): an attack shorter than one frame defeats
  the slope sampler. Integrate the ramp analytically or sample at a fixed
  step.
- The brand note says "Generate it with KEYWAY_BRAND=0" for the off state,
  which is the default and needs no flag (line 180).
- The generator's document size gate runs after every file is written, so
  it can never block emission (record 7.2).
