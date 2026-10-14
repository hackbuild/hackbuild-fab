# sparrow evaluation for nest

Verdict: do not adopt. nest ships MaxRects BSSF and shelf only (D-137),
and no DECISIONS.md entry is added. On the three sets of M07-T13 the
sparrow sheet loop never used fewer sheets than nest's fill mode, used one
sheet more on the OGEE16 R16 lasercut (3 against 2, computed), took
minutes where fill mode takes milliseconds to seconds (measured), and gave
two layoutHashes for one seed on two of the six seed pairs (computed), so
its layouts cannot enter a build hash (D-051, D-056). The wasm build itself
keeps the bake rules (D-129). Runs of 2026-10-08 local time (2026-10-09
UTC in the record).

## What ran

- sparrow `https://github.com/JeroenGar/sparrow` at commit
  `3be915856b543d18c9cb7d4664fe7c53901fe1fd` (2026-10-06), Cargo.toml
  version 0.3.0, rust-version 1.90, linking jagua-rs 1.0.0. The commit
  tracks no Cargo.lock (sparrow's .gitignore drops it), so the lock cargo
  resolved for the first build on 2026-10-08 is pinned in
  `tools/sparrow/native/Cargo.lock` and copied in after the checkout.
  Built from source by `bash tools/sparrow/build.sh`; nothing under
  `packages/` depends on the outputs.
- Toolchain: rustc 1.92.0, cargo 1.92.0, wasm-pack 0.13.1, node 22.18.0.
- Machine: Apple M1, 8 cores, 16 GiB, macOS 12 (darwin 21.6.0 arm64).
  Other processes ran on the machine during the runs; load was not
  recorded, so wall times carry that noise.
- Native: `cargo build --release --locked --features only_final_svg`, 112 s
  (measured, beside a mutation run on the same machine), binary 2328096 bytes.
- wasm: a wrapper crate in `tools/sparrow/wasm`, ported from Sparrow Studio
  `web/wasm/src/lib.rs` (MIT, commit
  `a738c18d9c28e371983b164129190dad1616d273`) with the solver settings of
  sparrow's own CLI, built by `wasm-pack build --target no-modules
  --release` for `wasm32-unknown-unknown` with no target features.
- Reproducible in any folder: both builds remap the work folder and the
  cargo home (`--remap-path-prefix`), the native link on darwin passes
  `-oso_prefix` so ld64 keeps the folder out of LC_UUID, and the wrapper
  reaches sparrow as `./sparrow` inside its own root so cargo hashes the
  crate id by a relative path. `bash tools/sparrow/repro.sh` built clean
  in two folders of different depth on 2026-10-09 and got the same sha256
  for the wasm (`66b20a667b7dd2f2`), the glue and the native binary
  (`5bd12e31df976546`), measured. The builds of 2026-10-08 were equal
  only in one folder: the wasm named the folder 81 times and a second
  folder gave other bytes (measured by the M07 verifier).
- The evaluation runs below were made with the 2026-10-08 binaries and
  were not rerun on the rebuild. The rebuild changes path strings and
  symbol hashes, not the solver; that the sheets stay the same is
  inferred, not measured.
- Evaluation: `node tools/sparrow/run.mjs eval`. Strip height the sheet's
  short side, quarter turns 0, 90, 180 and 270, `min_item_separation` the
  gap, time limit 60 s per strip with early termination (`-x`), seeds 1
  and 2, each run twice. The record is
  `packages/nest/records/sparrow-eval.json`.

## The sets

| set | source | pieces | sheet | margin, gap |
|---|---|---|---|---|
| slug-ply | `packages/nest/scenes/slug-sheets.ts` (M07-T07), kerf mode none | 60 | 600 x 400 | 6, 4 |
| slug-acrylic | same scene | 3 | 600 x 400 | 6, 4 |
| ogee16-r16 | `packages/nest/records/ogee16-connect.json` (M07-T06), compensated at the `cutfiles.py` KERF 0.18 | 183 | 600 x 400 | 4, 4 |

Both sides get one request: fill mode, part-in-part on, quarter turns.
nest packs it with `packSheets`. sparrow packs the roots nest's
part-in-part pass leaves; the 23 SLUG ply parts that pass puts inside holes
ride with their hosts (M07-T13 step 2). Items enter by their outer ring
only, since jagua-rs 1.0.0 rejects item holes.

The sheet loop over strips (research idea 8): pack every root into one
strip, keep the whole parts left of the cut at the sheet's long side, pack
the rest into the next strip, until nothing is left. jagua-rs grows each
item by half the separation and shrinks the strip by the same half, so the
strip is the sheet less `margin - gap` on each side (`stripFrame` in
`tools/sparrow/to-instance.mjs`). Every sparrow sheet was checked after
the read back: every part at least the margin from the sheet edge and the
gap from its neighbours, within 0.001 mm for sparrow's f32 transforms
(computed).

## Table

Sheets and layoutHashes are computed; wall times are measured on the
machine above. Fill ms is the mean of 3 `packSheets` runs with checks.
sparrow s is the slowest of the four runs of the whole sheet loop,
rounded to the second. Sheets list run 1 and run 2 of seed 1, then of
seed 2; the hash column says whether the two runs of a seed gave one
layoutHash.

| set | pieces | fill sheets | sparrow sheets | fill ms | sparrow s | same seed layoutHash |
|---|---|---|---|---|---|---|
| slug-ply | 60 | 8 | 9 and 8; 9 and 9 | 411 | 431 | differ; equal |
| slug-acrylic | 3 | 1 | 1 and 1; 1 and 1 | 9 | 0 | equal; equal |
| ogee16-r16 | 183 | 2 | 3 and 3; 3 and 3 | 7714 | 194 | differ; equal |

Lengths, mm, computed: the used length sums each sheet's furthest part
plus the margin.

| set | fill used length | sparrow one strip, all roots | sparrow used length over the sheets |
|---|---|---|---|
| slug-ply | 4600.9 | 4011.106 to 4025.187 | 4303.249 to 4533.579 |
| slug-acrylic | 48 | 42.028 | 46.012 to 46.019 |
| ogee16-r16 | 1187.125 | 1142.402 to 1149.928 | 1223.947 to 1269.209 |

## Reading the numbers

- sparrow packs one strip tighter than fill mode packs its sheets: the
  OGEE16 roots fit in 1142.402 mm of strip, under the 1192 mm of two
  sheets' usable length. The cut loses it. The first strip keeps only the
  parts that end left of the cut (12 or 38 of 183 in these runs), because
  sparrow minimises the strip's length and spreads parts along it, so the
  loop needs a third sheet. A strip packer is the wrong shape for fixed
  sheets; research section 5.4 says the same.
- On SLUG ply the best sparrow run matched fill mode's 8 sheets once in
  four runs.
- Determinism: a run that stops on early termination before the time
  limit repeats (slug-acrylic, both seeds). A strip that runs to the 60 s
  limit ends on the wall clock, so what it holds depends on machine load:
  seed 1 gave two layoutHashes on slug-ply and on ogee16-r16, seed 2 gave
  one on both. The wasm build at seed 1 on slug-acrylic gave the native
  layoutHash (computed, `ed9199380431`), in 570 ms against 145 to 163 ms
  native (measured).
- x64 and arm64: not run. Only the arm64 machine above ran the evaluation,
  so cross-architecture equality of layoutHash is not recorded.

## Bake rules (D-129)

| rule | value | qualifier |
|---|---|---|
| wasm size | 900903 bytes, 1201204 as base64, glue 10062 bytes; limit 16 MB | measured |
| load | 8.46 ms mean over 5 fresh node processes (7.59 to 8.93; earlier builds gave 10.66 and 3.33 means), glue evaluated and `initSync` from bytes; V8 compiles lazily, so part of the compile moves to the first call | measured |
| network at load | none when `initSync` gets the bytes; the glue fetches only when `init` is given a URL | read from the glue |
| Workers | the glue names no Worker; the build has no atomics and no shared memory, so the separator runs on the calling thread | read from the glue and the build flags |

## Licence (D-041, D-043)

sparrow is MIT (its LICENSE file; its Cargo.toml has no licence field,
so the audit reads the file, as LICENSING.md section 3 requires). The
wasm links 108 crates for `wasm32-unknown-unknown` (computed from cargo
metadata). One is copyleft: jagua-rs 1.0.0, MPL-2.0, file-level. The rest
are MIT, Apache-2.0, Unlicense OR MIT, Zlib and Unicode-3.0 combinations,
all permissive. LICENSING.md section 3 already answers the bake question:
jagua-rs may be compiled into sparrow's wasm while its MPL files stay
unmodified, with the manifest naming the crate version and its source
location. This evaluation used jagua-rs unmodified from crates.io.

## What would change the verdict

A fixed-sheet packer on jagua-rs (its `bpp` feature with an optimiser of
our own, research idea 8) rather than a strip cut, and a terminator that
stops on iterations instead of the wall clock, so a seed gives one
layoutHash. Either is new work and a new DECISIONS.md entry the owner
accepts.

## Rerun

```
bash tools/sparrow/build.sh
node tools/sparrow/run.mjs eval
node --test tools/test/sparrow-eval.test.mjs
```

The work folder defaults to
`fab-knowledge:evidence/sparrow`
(`$SPARROW_WORK`), outside the repo.
