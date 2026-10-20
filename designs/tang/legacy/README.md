# TANG archive copy

TANG is archive only at M10: this folder keeps the R6 and R5 benches and
the R5 circuit files byte identical, with a SHA256SUMS and this lineage
README, and M10 ports neither (M10-T01 step 1; the handoff registry slug
`tang`, path `designs/tang/legacy/`). There is no adapter, chase or build;
the hook suite lists the three pages as not benches with that reason
(`ARCHIVED` in `tools/hook/legacy-adapters.ts`). Nothing here is edited;
`shasum -a 256 -c SHA256SUMS` checks every file.

| field | value |
|---|---|
| records | `knowledge/designs/tang-r6.md` (gold), `knowledge/designs/tang-r5.md` |
| produced by | the TANG bench chats, single files, no git: R5 on 2026-08-16 to 2026-08-17, R6 from 2026-09-08 to 2026-09-15 (tang-r6.md 1.1, tang-r5.md 1.1) |
| copied from | `fab-knowledge:evidence/x/downloads/dl-gudgeon-tang-keyway/tang/`, the newest copy of each revision line by mtime; no two files in that folder share a hash (computed 2026-10-14) |
| equal to | `fab-knowledge:originals/tang-r6/files/tang_r6_4.html`, `originals/tang-r5/files/tang_r5_sim_13.html`, `tang_r5_wiring.html` and `tang_r5_circuit_files.zip` (compared by sha256 2026-10-14) |

## Files

| file | date (mtime) | sha256 (12) | bytes | lineage rows |
|---|---|---|---|---|
| `tang_r6 (4).html` | 2026-09-15 00:20 | 9a12993fb5eb | 1074782 | `tang-r6.bench/r6-4` (canonical), `tang-r6.bench/dl` |
| `tang_r5_sim (13).html` | 2026-08-17 19:21 | f251530457b2 | 700774 | `tang-r5.sim/sim-13` (canonical), `tang-r5.sim/dl` |
| `tang_r5_wiring.html` | 2026-08-21 01:33 | 1b4f1347b15b | 50510 | `tang-r5.wiring/r5` (canonical), `tang-r5.wiring/dl` |
| `tang_r5_circuit_files.zip` | 2026-08-17 19:12 | a153df328416 | 6453 | `tang-r5.circuit-files/r5` (canonical), `tang-r5.circuit-files/dl` |

Why these: r6_4 is the newest R6 and its design modules equal r6_2, the
first with the peg and socket neck and the wall notch USB (tang-r6.md
1.2); sim (13) is the last R5 sim, the first with the scan wiring and the
conductive pad set (tang-r5.md 1.1).

## Inherited defects a later port must not carry

From the gold note (tang-r6.md section 5): readouts parsed from check
text, dead chips (slide pressure), fields shown for the wrong topology,
slider ranges wider than legal, range drag without preview. r6_1 removed
the pull-up meander from the geometry while its UI chip stayed.
