# Testing

Version 4, 2026-10-04. Part of the hackbuild-fab plan set; PLAN.md is the index.

This file defines what each test level proves, where its files live, what
triggers it and what makes it fail. PLAN.md section 17 carries the decisions
(D-152 to D-155); REPOS.md section 8 names the CI jobs that branch protection
requires; the milestone cards in `milestones/` hold the exact commands a
builder runs. Where a card and this file disagree on a number, the card's
evidence path wins and this file is corrected.

Working names on first use: hbf (working name) is the binary, CHASE (working
name) is the typed design document, PIP (was HAFT) is the published
print-in-place controller at hackbuild/pip-controller (b137deb). Repo paths
are relative to the hackbuild-fab root. Evidence paths are absolute. The
scratch root `fab-knowledge:evidence/x/`
is written `<x>/` below.

---

## 1. The pyramid

Ten levels (D-152). Levels 1 to 8 run on CI without a person. Level 9 needs a
person to look. Level 10 needs model endpoints and runs on a schedule.

| level | what it proves | tool | location | trigger | budget |
|---|---|---|---|---|---|
| 1 unit | pure kernel functions: offsets, realGap, earcut wrapper, teardrop apex, hash canonicaliser, interval arithmetic | Vitest 5.0.3 | `packages/*/test/*.test.ts` | every push | under 60 s total |
| 2 property | invariants over random params, shrinking to a minimal failing case, replay by seed and path; the untrusted-input fuzz job (section 4.2.1) | fast-check 4.10.2 with @fast-check/vitest 0.5.0 | `packages/*/test/*.prop.test.ts`, `designs/<id>/test/sweep.prop.test.ts` | push at 100 runs; nightly at 2000 | under 3 min on push |
| 3 contract | registry conformance: every feature kind has generator, checks, fit and reference; every check has origin with date, legal kind and version; every command has examples that validate; seeds pass zod | Vitest, tsc | `spec/test/`, `core/test/`, `tools/test/seed-conformance.test.ts` | every push | under 30 s |
| 4 parity triple | per reference and per ported design: geometry matches, params round trip, one edit gives the expected delta | Vitest plus `tools/parity/` | `reference/**/expected/`, `tools/parity/triple.test.ts` | push for references; nightly for legacy ports | under 5 min |
| 5 golden | build hash, report hash, artifact hash, message numbers | Vitest file comparison, never overwritten by CI | `reference/**/expected/` | every push, inside level 4 | inside level 4 |
| 6 design harness | the five tests per design: cases, sweep, liveness, smoke, islands | Vitest, fast-check, Playwright, Python via uv | `designs/<id>/test/` | push for changed designs; nightly for all | 2 min per design |
| 7 validator corpus | every 3MF writer output, the gold Flash Studio round trip, the owner saves, legacy exports, known-bad fixtures | `tools/py/validate_3mf.py` and the TypeScript mirror | `tools/corpus/3mf/` | every push touching `packages/3mf`, `tools/py` or the corpus | under 2 min |
| 8 browser | BenchHook conformance, smoke through the hook, overflow at 390, 768, 1280, pink budget, touch-only pass, zero network, axe-core pass per step at 390 and 1280, reduced-motion smoke run, the gold suite G-01 to G-57 (8.5) | @playwright/test 1.63.0 | `tools/hook/`, `tools/smoke/`, `apps/*/test/`, baked benches | push for UI changes; nightly for all | 5 min |
| 9 visual review | rendered PNGs before and after, attached to the PR | `view.render` plus a CI artifact | PR comment | every PR that changes a meshHash | a person |
| 10 agent eval | worked sessions, references, variants and seeded failures as tasks, per model tier | Inspect (`inspect_ai`, pinned at M12-T14) | `evals/` | weekly and before a release | tokens and minutes recorded |

Source: `fab-knowledge:synthesis/api-library-ai-design.md`
section 11.1. Budgets are targets set by the plan (inferred), measured on the
first green CI run of each level and recorded in the job summary.
Budgets for the person at the bench and the agent at the server are in
section 8.3; the bench rows there are measured on the six gold benches
(2026-10-05).

Device-side tests (section 12) and firmware compile (section 11) sit beside
the pyramid. They test emitted C++ and run in their own jobs.

---

## 2. Five tests per design

A design is done when it passes all five (D-152). The kernel has to run
headless for four of them (D-045); smoke is the one that needs a browser.
Each test ports a PIP harness; PIP's versions live in
`<x>/pip-controller/test/` and are described in
`fab-knowledge:sources/latest/haft-toggle.md`
section 2.15.

| test | asserts | PIP source | fab file | runs on |
|---|---|---|---|---|
| cases | each named case builds with zero errors, zero blocking findings, and its exported 3MF passes `validate_3mf.py --export --overlap`; per-part volumes sum to the solid | `test/cases.mjs`: 9 named designs (stick, allflex, allclick, alltouch, wire, both, grips, slab, petgcaps) plus blank | `designs/<id>/test/cases.test.ts` | push |
| sweep | random designs drawn from the chase's legal params build closed, manifold, non-overlapping bodies; failures shrink to a minimal case | `test/sweep.mjs <seed> <n>`: Park-Miller LCG, `seed = (seed * 16807) % 2147483647`; 80 random designs passed (measured, PIP README) | `designs/<id>/test/sweep.prop.test.ts` | push 100 runs, nightly 2000 |
| liveness | every leaf param moves a meshHash, a metric or a warning; dead params equal the declared `liveExempt` list | `test/liveness.mjs`: perturbs numbers by +12 percent (+0.24 for stack and flex height), flips booleans, swaps enums; signature over every 7th float plus electrical rows | `designs/<id>/test/liveness.test.ts` using `packages/chase/test/liveness.ts` | push |
| smoke | the baked bench boots to `ready` through BenchHook, every step renders, a numeric edit and a slider release raise `BENCH.built`, every export returns bytes, design JSON round trips, no overflow at 390, 768, 1280, at most one focal pink per view, the touch-only pass completes, zero console errors | `test/smoke.py`: Playwright with swiftshader; drive pad hold reads "reads LOW"; no sideways scroll at 390, 768, 1280; console errors fail | `designs/<id>/test/smoke.spec.ts` on `tools/smoke/` helpers | push when the design or `ui-core` changes |
| islands | slicing the exported 3MF at the layer heights the export declares finds no floating region and no unsupported strip wider than 0.8 mm | `test/islands.py <3mf> [layer]`: manifold3d union, slice at layer mid heights, XOR against the previous slice | `designs/<id>/test/islands.test.ts` calling `uv run --project tools/py tools/py/islands.py` | push |

Islands runs at every layer height in the design's declared machine presets
and at 0.20 mm and 0.24 mm, the two heights the seeded CHK-PRT-07 names
(`<x>/plan-to-refine/handoff/hbf/seed/checks.seed.json` line 112). The
0.8 mm strip limit is PIP's rule (`<x>/pip-controller/test/islands.py`).

### 2.1 State of the corpus, 2026-10-04

PIP is the one design with all five. The table below is why the five are
written as the bar a design reaches before it is done (plan-deltas R85).

| design | cases | sweep | liveness | smoke | islands | source |
|---|---|---|---|---|---|---|
| PIP | cases.mjs | sweep.mjs | liveness.mjs | smoke.py | islands.py | `<x>/pip-controller/test/` |
| TOGGLE | none | sweep.js | live.js (36 listed changes) | smoke.py, smoke2.py | islands.py (trimesh and shapely, overhang beyond 45 degrees) | `haft-toggle.md` section 4 |
| KNUCKLE | none | sweep.py (Playwright) | none | t2.py | none | `fab-knowledge:sources/latest/knuckle-tenon-gusset.md` section 4 |
| TENON | none | sweep.js | none | smoke.py (asserts a stale part count), smoke_b.py | none, overhang audit in kernel | same |
| GUSSET | none | none | none | none | n/a | same |
| robots, machines, devices | none | none | none | none | none | plan-deltas R85 |

KNUCKLE's kernel needs a DOM canvas, so it gets a headless port before it
becomes a reference (D-045).

### 2.2 Cases

`designs/<id>/test/cases/` holds one JSON per case, named for what it
exercises. A sweep failure that shrinks to a minimal params set is written to
`designs/<id>/test/regressions/<inputsHash>.json` and becomes a case in the
same PR, so every sweep failure turns into a named case. A case asserts:

1. `buildPart` returns `errors: []` and no finding with verdict `fail` and
   severity block (D-067).
2. Expected-violation sets pass only when the measured set equals the
   declared set, and capture assertions pass only above their floor (D-074).
   SHUNT G7 declares 5 shorts and 5 floating nets (computed, plan-deltas);
   DERRICK declares a capture above 33.4 mm3 (computed).
3. The exported 3MF passes `validate_3mf.py --export --overlap` with exit 0.
4. Per-part volumes sum to the solid within 1e-3 mm3. The demo coin prints
   `parts 5473.667 vs solid 5473.667 mm3` (measured by rerun, verified-claims C2).

### 2.3 Sweep

Sweeps are fast-check properties. The arbitrary is derived from the chase's
ParamField ranges and enum options, so a sweep never draws an illegal value
that the rail could not produce. On failure fast-check prints `{ seed, path }`;
the replay uses both, with `endOnFailure: true`. The PIP form, checked with
`tsc` 7.0.2 strict, `noUncheckedIndexedAccess` and
`exactOptionalPropertyTypes` against vitest 5.0.3, fast-check 4.10.2 and
@fast-check/vitest 0.5.0 on 2026-10-04 (a stub stands in for
`@hackbuild/kernel`):

```ts
// designs/pip/test/sweep.prop.test.ts
import { fc, test } from "@fast-check/vitest";
import { expect } from "vitest";
import { buildPart } from "@hackbuild/kernel";
import { chase } from "../chase";

const groupArb = fc.record({
  on: fc.boolean(),
  type: fc.constantFrom("flex", "clicky", "touch"),
  pitch: fc.double({ min: 14, max: 19, noNaN: true }).map(v => Math.round(v * 2) / 2),
});
const designArb = fc.record({
  shape: fc.record({
    style: fc.constantFrom("stadium", "slab", "grips"),
    W: fc.integer({ min: 140, max: 190 }),
    H: fc.integer({ min: 60, max: 80 }),
  }),
  groups: fc.record({ left: groupArb, face: groupArb, menu: groupArb, shoulder: groupArb }),
  clicky: fc.record({
    l: fc.double({ min: 20, max: 24, noNaN: true }),
    Q: fc.double({ min: 1.9, max: 2.2, noNaN: true }),
  }),
});

const runs = Number(process.env["FC_RUNS"] ?? 100);
const seed = process.env["FC_SEED"] === undefined ? undefined : Number(process.env["FC_SEED"]);
const path = process.env["FC_PATH"];

test.prop([designArb], {
  numRuns: runs,
  ...(seed === undefined ? {} : { seed }),
  ...(path === undefined ? {} : { path, endOnFailure: true }),
})("every design builds closed, manifold, non-overlapping bodies", async (params) => {
  const r = await buildPart(chase, params);
  expect(r.errors).toEqual([]);
  const blocking = r.findings.filter(f => f.verdict === "fail" && /^CHK-(PRT-0[123]|3MF)/.test(f.id));
  expect(blocking).toEqual([]);
});
```

The arbitrary's ranges above are PIP's sweep ranges (`<x>/pip-controller/test/sweep.mjs`);
the clicky Q range 1.9 to 2.2 sits inside the FE-backed window of D-071.
Replay: `FC_SEED=<seed> FC_PATH=<path> npx vitest run designs/pip/test/sweep.prop.test.ts`.

A sweep also asserts wasm hygiene: the live manifold object count is 0 after
the run (D-055). PIP's sweep prints the count and does not assert it; M00-T06
makes it an assertion over a 100-design sweep.

Physics sims are sweeps too. One run of a granular sim is luck: a single SLUG
run looked fine and six trials exposed arching at 5.5 of 13 vends (measured,
`<x>/plan-to-refine/handoff/hbf/knowledge/kernels/verification.md`). Sim
tests run N seeded trials by default (M02). SLUG's 126 of 128 across 8
trials is declared, unverified (D-232): the rebuilt seeded runner measures
91 of 128 over seeds 1 to 8 (computed), and a later claim of 126 needs the
original runner or the owner's protocol (D-136, D-232).

### 2.4 Liveness

A param is live when changing it changes a meshHash, a metric or a warning.
This replaces PIP's signature over every 7th float with the hashes the build
already computes (D-049, D-051). The helper, type-checked in the same scratch
run:

```ts
// packages/chase/test/liveness.ts
import { buildPart, leafPointers, perturbWithinRange, type BuildResult, type Chase, type Params } from "@hackbuild/kernel";

const sameRecord = (a: Record<string, unknown>, b: Record<string, unknown>): boolean => {
  const ka = Object.keys(a).sort();
  const kb = Object.keys(b).sort();
  return ka.length === kb.length && ka.every((k, i) => k === kb[i] && a[k] === b[k]);
};
const same = (a: BuildResult, b: BuildResult): boolean =>
  sameRecord(a.meshHashes, b.meshHashes) &&
  sameRecord(a.metrics, b.metrics) &&
  a.warnings.join("\n") === b.warnings.join("\n");

/** JSON pointers whose change moves no mesh hash, no metric and no warning. */
export async function deadParams(chase: Chase, base: Params): Promise<string[]> {
  const ref = await buildPart(chase, base);
  const dead: string[] = [];
  for (const ptr of leafPointers(chase, base)) {
    const next = perturbWithinRange(chase, base, ptr);   // stays inside the field range
    if (next === null) continue;                         // a single-valued field has nothing to change
    if (same(await buildPart(chase, next), ref)) dead.push(ptr);
  }
  return dead;
}
// test: expect(await deadParams(chase, defaultsOf(chase))).toEqual(chase.liveExempt ?? []);
```

`perturbWithinRange` uses the field's range and step, never a blind +0.24.

Three field classes refine the rule (gold rules G-07, G-08, G-41; plan gap
P-18). Each is asserted per field from every preset:

| field class | live when | dead when |
|---|---|---|
| geometry | each range end moves `buildHash` | `buildHash` unchanged at either end |
| quality (`quality: true`, P-18) | triangle count changes and no geometry check changes its verdict | triangle count unchanged, or a geometry check verdict moves |
| readout (a field that only moves derived values) | at least one derived readout value changes and no meshHash moves | a meshHash moves, or no readout changes |

A row hidden by `showWhen` is exempt only in the presets where it is
hidden; a visible row that moves nothing is dead even when another mode
would make it live (G-41). TOGGLE's node run is the origin of the
geometry and readout split (`fab-knowledge:sources/gold/toggle.md`);
PIP `seg` and COLLAR's grid are the quality fields (`syn/gold-standard.md` P-18).
Liveness runs from every preset the chase declares, because PIP's exempt list
is mode dependent: grips drop, slab corner, stick on d-pad and d-pad on stick
apply only in another mode (PIP README). Each `liveExempt` entry carries a
reason string naming that mode.

### 2.5 Smoke

Smoke drives the baked bench through BenchHook only (D-128) and the shared
helpers of M09-T14. Chromium runs with `--use-gl=swiftshader --enable-webgl
--ignore-gpu-blocklist`, as PIP's smoke does. PIP's own CI leaves the browser
harnesses to a person because they "want a GPU"
(`<x>/pip-controller/.github/workflows/ci.yml` header comment); the fab
`browser` job runs them under swiftshader on CI.

| measure | rule | fails when |
|---|---|---|
| boot | `BENCH.ready` within 15,000 ms | timeout |
| console | zero console errors and page errors for the whole run | any |
| edits | one numeric edit and one slider release each raise `BENCH.built` after `BENCH.settled()` | `built` unchanged |
| exports | every declared export kind returns bytes through `exportBytes` | empty or throws |
| round trip | `loadDesign(designJson())` then `designJson()` is byte identical | differs |
| overflow | `document.documentElement.scrollWidth` at most the viewport width at 390, 768, 1280 on every step | wider; up to 8 offending elements printed with their right edge |
| pink budget | at most one focal pink element per view after subtracting `data-hb-pink="structural"` elements (D-125) | two or more |
| touch-only | a `hasTouch`, `isMobile` project at 390 x 844 reaches every step by tap, edits a field, drags a range, holds a drive pad key, pinch-zooms and pans the stage, runs an export | any step unreachable |
| network | requests whose URL is neither `file:` nor `data:` | count above 0 (D-129) |
| workers | a `blob:` URL Worker or `type: "module"` Worker under `file://` | any |
| CSP | a `securitypolicyviolation` listener added by an init script before the page loads, plus console lines starting `Refused to`, under the baked meta policy of UI.md 14.5 | any violation, or a bake whose first `<head>` child is not the manifest's policy |
| voice | DOM text of every step through `node tools/lint-voice.mjs --stdin --kind dom` | non-zero exit (D-004) |
| accessibility | axe-core (`@axe-core/playwright`, pinned at M09-T14) on every step at 390 and 1280 px; tab order matches UI.md section 17.1; every stage verdict has a CHECKS row | any serious or critical violation; focus order or a verdict row missing |
| preset expectations | for every preset with `expect` (P-15): `loadDesign`, `settled()`, then `drive(target, value)` per entry; every named readout equals `reads` within `tol` (default 0 for strings, 1 percent for numbers) | any miss; a preset whose worked scene reads nothing (BLOCKS 2026-09-14, `sources/gold/blocks.md`) |
| gold suite | section 8.5, every row whose harness is `smoke` or `hook` | any row's fail condition |
| colour key | on every step the stage legend lists each slot in use with its name and role, and collapses to status chips under 640 px (P-21 gold default; owner decision, see UI.md) | a slot in use missing from the legend |
| reduced motion | the whole smoke suite once more with `reducedMotion: 'reduce'`: camera reaches its end pose in one frame, sim playback idle until the play verb, `BENCH.built` still advances on every edit | any tween frame, auto-run playback, or a missed commit |

Smoke screenshots each step at 1280 into the review artifact of section 13.

Push runs use Chromium only. The nightly `browser-all` job repeats boot,
console, edits, exports, round trip, overflow at 390 and network in the
Playwright `webkit` and `firefox` projects against the baked file, per the
supported-browser table in UI.md section 14.4. Playwright WebKit on Linux
approximates Safari's engine; a real iPhone stays in 15.3. Link features (WebSerial, WebUSB) are Chromium only and their
smoke rows report not run in the other engines.

### 2.6 Islands

Islands reads the exported 3MF, never the in-memory mesh, so it tests what
the slicer will see. Per object it unions the parts, slices at each layer's
mid height, and reports floating components and unsupported strips wider
than 0.8 mm with their location. It exits 1 on any finding. The layer height
comes from the export's sidecar or `Metadata/hackbuild_chase.json` (D-159),
never from a default.

### 2.7 Slicer G-code (virtual print)

Islands reads the meshes the slicer will see; the virtual print reads what
the slicer wrote (D-235). It runs beside the five tests on any design with
a multi-material 3MF export, on a host where Flash Studio is installed, as a
person's step or a nightly job on that host. It never runs on CI (no slicer
on the runners, inferred) and never opens the fabrication export gate.

| step | tool | does |
|---|---|---|
| 1 | `tools/slice/slice.mjs --design <dir> --preset <id> <outdir>` | writes the 3MF in process through packages/3mf at SOURCE_DATE_EPOCH 315532800 (never under `reference/*/*/out`), completes the project from the bundled presets it names (D-237), slices plate 1 headless with a fresh `--datadir` and a time limit, records command, slicer version, exit code and wall time in `slice-run.json` |
| 2 | `uv run --project tools/py tools/py/gcode/analyze.py --gcode ... --3mf ... --model-json ... --run-json ... --out <dir>` | rasterises each layer's roads at 0.05 mm and the 3MF section at the layer's mid height; reports model area printed by another tool, dropped features, unsupported deposit with span and bridge role, deposited conductor regions touching two nets, continuity from each lead, the printed contact gap, tool changes and the slicer's estimates; writes `slice.json`, `report-slice.md` and layer PNGs |
| 3 | the reference's electrical sim, where one exists (`tools/skeleton/flexpair_probe/sim/run.mjs` for keys flex-pair) | prices each key path from the Part IR and runs the unchanged read firmware against scripted presses and injected faults |

Every figure is computed. A finding of the class "model area printed by
another tool", "conductor region touching two nets" or "lead does not reach
its contact" is a design defect to fix before a print; overhang and bridge
rows are print-quality notes until a print measures them. Results go in a
"simulated" block of the reference README verified section, never under
"measured on a printed body". Tests: `tools/test/slice.test.mjs` and
`tools/py/test/test_gcode.py`; the reference keeps its own geometry rule
when a slicer finding is fixed in the design (for keys flex-pair, each cap
underside at or above the pad top, D-236).

---

## 3. Harness exit rules

Harnesses assert and exit non-zero; a harness that did not run is reported as
not run, never as a pass (D-153).

### 3.1 The legacy patterns this replaces

| harness | behaviour | evidence |
|---|---|---|
| PIP node harnesses | print GREEN or FAIL and exit 0; CI greps the log for `\b(FAIL\|THROW)\b` | `<x>/pip-controller/.github/workflows/ci.yml` job `node`; verified-claims C1 |
| PIP `cases.mjs` without print-forge | reports SKIP instead of GREEN and skips the 3MF checks; the job stays green | same file, header comment |
| LOUVER `harness.cpp` | returns 0 when `in.bin` is missing, printing "no in.bin" | line 131 (measured, M13-link.md) |
| OGEE16 `check_viewer.py` | exits 0 whatever the mismatch count | M07-motion-nest.md evidence table |
| COTTER `audit_dxf.py` | crashes with AttributeError on `POLYLINE.closed` before any verdict (exit 1 by exception) | M07-motion-nest.md evidence table |

### 3.2 The rules

1. A harness exits 0 on pass, 1 on fail, 2 on bad input or usage, 70 on an
   internal error, the same codes as `spec/errors.ts` (D-064).
2. A harness that cannot run (missing tool, missing input, missing key)
   prints `not run: <reason>`. If the harness is required, the runner exits 1.
   Required harnesses are listed in `tools/test/harnesses.json`; a harness is
   optional only when a decision makes it so (agent eval model runs without
   keys, D-155; slicer CLIs not installed on a runner, section 10).
3. No `|| true`, no `continue-on-error`, and no log grep as the verdict. A
   grep may add detail; the exit code decides.
4. A crash is a fail with its stack, never a silent exit.
5. Every runner prints one summary line per harness and writes
   `out/test-summary.json`. The job summary on CI shows pass, fail and not run
   counts.

```ts
// tools/test/summary.ts
export type HarnessStatus = "pass" | "fail" | "not run";

export interface HarnessRow {
  harness: string;          // path of the harness, repo relative
  status: HarnessStatus;
  reason?: string;          // required for "not run" and "fail"
  durationMs: number;       // wall time, measured
  required: boolean;        // from tools/test/harnesses.json
}

/** 0 when every required harness passed; 1 otherwise. A skip is never a pass. */
export function exitCodeFor(rows: readonly HarnessRow[]): 0 | 1 {
  const bad = rows.some(r => r.status === "fail" || (r.required && r.status === "not run"));
  return bad ? 1 : 0;
}

export function line(r: HarnessRow): string {
  const why = r.reason === undefined ? "" : `: ${r.reason}`;
  return `${r.status} ${r.harness} ${(r.durationMs / 1000).toFixed(1)} s${why}`;
}
```

Type-checked under `tsc` 7.0.2 strict on 2026-10-04 in
`<x>/tsc/testing/src/summary.ts`. Each runner has a test that feeds it a
missing input and asserts exit 1, the same way M13-T12 deletes `in.bin` and
`h.txt`.

Reports say what was not run. A PR body or milestone report that lists a
harness as passing must be able to point at its summary row.

---

## 4. Unit, property and contract

### 4.1 Unit

A unit test names the target it pins and why. The M00 profile target:

```ts
// packages/profile/test/realgap.test.ts
import { expect, test } from "vitest";
import { profile } from "../src";

test("realGap(0.275, hole, ffc5p, petg) is 0.075 per side: material-level loss wins (D-100, D-207)", () => {
  expect(profile.realGap(0.275, "hole", "ffc5p", "petg")).toBeCloseTo(0.075, 6);
});
```

The value holds only through PETG's material-level loss (hole 0.25 plus
outer 0.15 across both sides), while the machine-level ffc5p loss is 0.15
and 0.10 (computed, api-library-ai-design.md 11.2). The test pins which loss
wins.

Unit tests carry the numeric goldens of each milestone card: the SNAPFE
flat-arch stiffness 0.585396 N/mm against theory 0.585394 N/mm within 2e-6
(computed, verified-claims C4), the trace width floor 3.23 mm at 30 ohm cm,
62 mm, 0.72 mm and 8 kohm (computed, D-072), the count-wheel detent stiffness
0.9216 N/mm (computed, D-096). The cards in `milestones/` list the rest.

### 4.2 Property

Property tests hold invariants that no single case pins: offsets are
monotone in distance, the dyadic snap is idempotent (D-054), canonical JSON
is stable under key order (D-051), an interval with a floor above its
ceiling returns `legal: null` and E_UNSAT (D-064), `meshHash` is unchanged by
triangle order. They use the same seed and path replay as section 2.3. Push
runs use `FC_RUNS=100`; the nightly job uses `FC_RUNS=2000`.

#### 4.2.1 Untrusted-input fuzz job

From M00 a fast-check job drives the readers that take bytes from outside
the workspace through the D-166 rules (ARCHITECTURE.md section 11.1,
RISKS.md R-25). Every generated case either loads within the limits or is
refused with E_SCHEMA naming the rule; a hang past the per-case timeout, a
write outside the temp directory, or an uncaught throw fails the job.

| target | generators | expected |
|---|---|---|
| 3MF and zip reader (`packages/3mf/test/reader.fuzz.prop.test.ts`) | entry names with `..` segments, leading `/` or `\`, drive letters; 4097 entries; deflate streams that inflate past 256 MB; truncated central directories; the gold file with one entry mutated | traversal names, entry overflow and inflation past the cap refused while reading; nothing written outside the temp directory |
| raster intake (`packages/inlay/test/raster.fuzz.prop.test.ts`, M03, D-166) | image sides past 8192 px on every allocating intake entry; zero, negative and non-integer sides; a data length that disagrees with the side product | E_SCHEMA with record `inlay-intake/raster-size` before any buffer is allocated; a side of 8192 or less loads |
| SVG document sanitiser (`packages/geom/test/svg-doc.fuzz.prop.test.ts`, M05-T14, D-166, D-240) | script and foreignObject in any case, prefixed, nested or self closing; on* handlers; href and xlink:href to javascript:, data: and http: beside fragment links; DOCTYPE and ENTITY declarations; quoted ">" in attribute values | a declaration refused with E_SCHEMA naming an svg-intake rule; otherwise no script, foreignObject, handler or outbound href survives, every path's d is kept, and a second pass changes nothing |
| share decoder (`packages/ui-core/src/bench/share.fuzz.prop.test.ts`) | payloads over 1 MB inflated; missing or non-numeric version prefix; versions above the current `meta.chase`; invalid base64url; valid JSON failing the chase schema | oversize and schema failures refused before `loadDesign`; an unprefixed payload routes through `migrate/legacy.ts` or opens blank with the logged line |

The job runs on push at `FC_RUNS=100` and nightly at `FC_RUNS=2000` with
the seed printed, like every level 2 test. Inflation-bomb fixtures are
generated at test time, never committed.

### 4.3 Contract

| contract | asserts | milestone |
|---|---|---|
| spec compiles | `npx -y -p typescript@7.0.2 tsc -p spec/tsconfig.json` exits 0; `spec/fixtures/negative.ts` needs every `@ts-expect-error` (empty checks, missing reference, ParamsOf typo, dotted MCP tool name, CheckResult without origin) | M-1 |
| command counts | `CommandName` has 30 members (D-106) and `McpToolName` 19 (D-107) | M-1 |
| seed conformance | zod over checks, mechanisms, archetypes and profile seeds: 86 checks with 77 block and 9 warn, every `origin.date` set, no empty `what`, `needs` inside `KernelId`, 24 mechanisms, 29 archetypes (counts as of 2026-10-05, 85 and 76 at M-1 before M-S-T06 seeded CHK-NET-29; generated by tools/counts.mjs from M-1 onward) | M-1 (D-066) |
| registry | every FeatureKindDef has generate, non-empty checks, fit or `none`, non-empty reference, schema and version (D-058); every CheckDef has version, origin, legal kind and drivenBy | M04 |
| commands | every CommandDef has examples that validate against its input schema, and descriptions pass lint-voice | M00 onward |
| coverage | every feature kind, check, archetype, mechanism, kind and exporter has a green reference (D-105) | M11 |
| param ranges (G-09) | every numeric ParamField's range contains its default, and `(default - min) / step` is a whole number within 1e-9; PIP `stick.capH` defaults to 1.2 under a 1.92 minimum (`sources/gold/pip-haft.md` flaw 11) | M10 |
| readout limits (G-27, P-02) | every derived field with `limit` names a registered check in `limit.check`, and that check's legal bound at the default build equals the field's limit at printed precision | M10 |
| field checks (P-25) | every id in `ParamField.checks` is registered, and at the default build its `drivenBy` returns the field's pointer (CHECKS.md 2.7) | M10 |
| provoked messages (G-32) | every registered check's `fail` fixture renders a message with measured, legal, constraint and a `fix:` or `next:` line; the message-numbers test runs over the set (CHECKS.md 2.7) | M04 |

---

## 5. Parity triple and goldens

### 5.1 Layout

```
reference/<area>/<id>/
  chase.ts
  build.ts
  README.md          verified block (D-008), covers [ids]
  expected/
    build.json       { buildHash, inputs: BuildInputs, meshHashes: {body: hash}, volumes: {body: mm3} }
    report.json      canonical findings, reportHash
    edit.json        { pointer, from, to, expect: { changed: [bodies], unchanged: [bodies], metricDelta: {...} } }
    artifacts.json   { "3mf": artifactHash, "stl": [...], "card": sha256 of text }
    section.png      the reviewed render, kept for the visual diff
```

Goldens hold canonical JSON (RFC 8785) and content hashes, never compressed
bytes. `artifacts.json` holds the 3MF artifactHash of D-052, a sha256 over
sorted (entry name, sha256 of uncompressed bytes) with date metadata
normalised, so a golden survives a change of deflate implementation.

### 5.2 The triple

`tools/parity/triple.test.ts` runs four tests per reference:

| test | asserts |
|---|---|
| geometry matches | `buildHash` and every body's `meshHash` equal `expected/build.json` |
| params round trip | `loadDesign(designJson(defaults))` equals the normalised defaults |
| one edit gives the expected delta | applying `edit.json` changes exactly the listed bodies, leaves the others' hashes equal, and moves metrics by `metricDelta` |
| message numbers recompute | every finding's rendered text equals the text rendered from a recomputation of its measured and legal values (M04) |

Legacy ports run the same triple against the legacy file's meshes: PIP
per-slot volumes within 1e-3 mm3 of `print/pip.3mf` and `print/pip-stick.3mf`
(M10-T13), COLLAR per-part volumes within 1e-3 mm3 of the legacy coin
(M00-T11). Legacy ports run nightly; references run on every push.

### 5.3 Updating a golden

`npx --no-install hbf parity --accept <id>` is the only way a JSON golden
(build.json, report.json, edit.json, artifacts.json) changes. It rebuilds,
writes them under `expected/`, and prints the old and new hashes and the bodies that
moved. The diff lands in the PR, where a person reads it and the visual
review of section 13 applies. CI never accepts: the `parity` job runs in
compare mode only and fails on any mismatch. A hand edit to a file under
`expected/` fails the next `parity` run, because the recorded `buildHash`
no longer matches the recomputed one. A rendered file under `expected/` is
not a parity golden and changes only through its named writer (D-227): the
keys flex-pair section SVG and PNG and its README print card through
`HBF_ACCEPT=1 npx vitest run reference/keys/flex-pair`, where the SVG is
compared and the PNG is its rendering, and the orca-3mf-roundtrip
section.png through `hbf view.render --mode section`. A person runs each
writer and reads the PNGs before they land; CI never sets HBF_ACCEPT.

---

## 6. 3MF corpus

The corpus keeps both validators honest in both directions: files that must
pass, and files that must fail with a named check. A validator that passes a
known-bad fixture is broken. M00-T10 builds it; this section states what it
holds.

### 6.1 Rows

`tools/corpus/3mf/manifest.json` has one row per file: `{path, sha256, source,
mode, target, expect, failsWith}`, with `expect` one of pass, fail, parse,
legacy, missing.

| set | files | mode | expect | source |
|---|---|---|---|---|
| gold round trip | 1 | `--roundtrip` | pass; 127 per-filament keys with per-slot values; every `p:path` resolves to the sub-model | `fab-work-directory:benches/collar-coin/uploads/hackbuild-coin-nfc.3mf` (Flash Studio save, 2026-08-19) |
| known-bad CASK empty plate | 1, original | `--roundtrip` | fail CHK-3MF-06 and CHK-3MF-07 | `fab-knowledge:evidence/x/downloads/dl-cases/cask/cask_cap_hackbuild.3mf`, the owner's file as downloaded |
| known-bad missing part | 1, synthetic | `--roundtrip` | fail CHK-3MF-06 | gold with each `p:path` set to `/3D/Objects/missing.model` |
| known-bad TENON names | `tenon.3mf` plus `tenon-stl.zip` | `--export` | fail export completeness | `<x>/tenon/tenon.3mf`, five objects named `tenon-undefined` |
| known-bad numeric overhang | 2, synthetic | `--roundtrip` | fail CHK-3MF-07 | gold with `overhang_fan_threshold` as numbers `[95, 10, 10]`, and as bare strings `["95", "10", "10"]` |
| BOSS | 21 | `--legacy --overlap` | pass 21 of 21 (measured with the seed validator, verified-claims C2) | `fab-work-directory:benches/blocks/outputs/boss/examples/` |
| owner saves | 25 (18 in `3d/`, 7 in `instruments/tang-small/`) | `--roundtrip --json` | parse; key-set report; 24 on the 0.4 nozzle preset and `3d/coin/hsl.3mf` on 0.25 | `3d/`, `instruments/tang-small/` |
| SPRUE plates | 4 | `--legacy --overlap` | pass; 21 per-filament keys (verified-claims C2) | `fab-work-directory:benches/sprue/outputs/sprue/plates/` |
| legacy bench exports | PIP 2, TOGGLE 4, KNUCKLE 2, SPARGER W 4 | `--legacy` | legacy: verdicts recorded, failures listed, never fixed in place | M00-T10 inputs |
| COTTER exports | 31 3MF, 8 DXF, plus 2 Flash Studio saves | four kits 2026-09-21 to 22 | 3MF pass seed validator `--overlap`; DXF pass `audit_dxf.py` (ezdxf 1.4.4); saves 127 of 127 at N | `fab-knowledge:evidence/x/downloads/dl-pip-latest/cotter/`, `fab-knowledge:evidence/x/downloads/dl-baffle-inlay-coin/3mf/` |
| owner round trips | BAFFLE, SASH, COTTER, KNURL pairs | `--legacy` and `--roundtrip` | filaments and part map equal; 127 of 127 | `fab-knowledge:evidence/x/downloads/` |
| js and py writer outputs | one per reference | `--export --overlap` | pass; per-part volumes sum to the solid | `packages/3mf`, `tools/py/orca3mf.py` |

All 25 owner saves carry `BambuStudio-01.10.01.50` and have no G-code, so
they are slicer project saves (measured, verified-claims C2).

### 6.2 What the corpus pins (C-07)

The seed `filament_template.json` holds 97 keys: it misses 37 gold keys and
adds 7 (computed, verified-claims C2). The gold holds 127 per-filament keys of
length 3 and differs per slot on 9 keys, among them `fan_max_speed` 50, 70, 70,
`pressure_advance` 0.06, 0.07, 0.06 and `overhang_fan_threshold` `95%`, `10%`,
... (measured from the gold). The corpus asserts:

1. The writer's template equals the 127 gold keys with per-slot values, and
   keeps `filament_map`, `filament_self_index` and `filament_extruder_variant`
   (D-159). `tools/corpus/3mf/reports/template-diff.json` regenerates the 37
   missing and 7 extra against the seed, never typed by hand.
2. CHK-3MF-06 as rewritten (D-068): every component `p:path` resolves to a
   model part other than the root, and the object id exists there. The gold
   passes with three components in object 4 pointing at
   `/3D/Objects/hackbuild-coin-nfc_2.model`.
3. CHK-3MF-07 as rewritten (D-069): per-filament vectors have one element per
   filament with the per-slot type; `overhang_fan_threshold` elements match
   `^[0-9]+%$`; length checks cover template filament keys only, so the
   4-element printer keys of the 4-extruder Creator 5 Pro pass.
4. The seed validator exits 1 on the gold (measured, verified-claims C2). The
   rewritten validator exits 0 on it. Both facts stay in the test log.

### 6.2.1 Coupons

A coupon is generated from the same source module as the part it qualifies,
with identical joint dimensions. A coupon written as a separate model drifts
from the part and measures the wrong joint.

Each joint coupon set includes a clearance ladder: four identical captive-hole
sections at 0.20, 0.30, 0.40 and 0.50 mm per side. The shop prints the ladder,
records the smallest step that moves freely, and that value enters the profile
as a measured row (D-082, D-083). The pattern is PhaseLock V1, which builds its
clearance, hinge and single-row transition coupons from the joint module it
ships.

| item | rule | evidence |
|---|---|---|
| source | coupon and part import one module; a test asserts equal joint parameters | `fab-knowledge:evidence/x/downloads/dl-sweep/phaselock/phaselock_sheet_v1.html` |
| clearance ladder | 0.20, 0.30, 0.40, 0.50 mm per side, one section each | same file, `clearance_coupon_petg()` |
| result | the step that fits becomes a measured profile row; no default is written in its place | D-082 |

### 6.3 Bytes and hashes (C-08)

The same input through the seed writers gave `py.3mf` 3979 B and `js.3mf`
4243 B with all 6 entries identical; JSZip adds `3D/`, `Metadata/` and
`_rels/` directory entries; two Python runs differed at byte 11 (measured,
verified-claims C2). The stamps sit at `orca3mf.js` lines 91 and 247 and
`orca3mf.py` lines 193 and 384. The tests that follow from D-052:

| test | asserts | where |
|---|---|---|
| self-reproduction | each writer run twice under one `SOURCE_DATE_EPOCH` gives equal sha256 of the .3mf bytes, under `TZ=UTC` and `TZ=America/Phoenix` | `tools/determinism/writer-bytes.mjs`, `tools/py/test/test_bytes.py` |
| stamps | CreationDate and ModificationDate equal the epoch; every zip entry mtime equals the epoch in UTC; no directory entries; entries in sorted order; one fixed deflate level | `packages/3mf/test/bytes.test.ts`, `tools/py/test/test_bytes.py` |
| cross-writer agreement | js and py artifactHash equal for every corpus input | `corpus` job |
| cross-writer bytes | recorded, never required | `corpus` job summary |

The CI epoch is `SOURCE_DATE_EPOCH=1791072000`, 2026-10-04T00:00:00Z
(computed), as M00-T14 sets it.

### 6.4 Runner

`uv run --project tools/py tools/corpus/3mf/run.py` runs every row through
the Python validator and the TypeScript mirror in `packages/3mf/src/validate/`,
compares each verdict with `expect`, and exits 1 on any row outside its
expectation or any disagreement between the two validators. A changed
expectation needs a reason line in the manifest. The Python validator stays
the reference until the mirror reaches parity, and is never deleted before
(D-140). After the M00 split (D-027) the same corpus and runner live in
hackbuild/hackbuild-3mf under `corpus/`.

---

## 7. Determinism

Every reference builds on `ubuntu-24.04` (x64), `ubuntu-24.04-arm` (arm64)
and `macos-14` (arm64) with equal mesh hashes (D-056). The macOS leg is
there because the owner's builder machine is Apple silicon (`uname -m`
printed arm64 on 2026-10-04, measured), so a hash that differs only there
would surface as a local parity failure no Linux runner sees. manifold-3d 3.5.0 introduced cross-platform
determinism (vendor, release notes; verified-claims C8); this project treats
it as unproven until this job is green.

| step | does | fails on |
|---|---|---|
| `determinism` matrix leg | builds every reference and the M00-T05 route fixtures with `SOURCE_DATE_EPOCH=1791072000`; writes `meshHashes.json` and `artifactHashes.json`; runs the writer self-reproduction tests of 6.3 | a writer that does not reproduce its own bytes |
| `determinism-compare` | `node tools/determinism/compare.mjs x64.json arm64.json`, then `x64.json macos.json` | any id whose hash differs; it prints each id and the pair |
| sim snapshots (from M02) | Rapier `@dimforge/rapier3d-deterministic-compat` 0.21.0 snapshot hash equal across two runs and across the three legs | unequal snapshot hash |

The compare step, type-checked in `<x>/tsc/testing/src/compare.ts`:

```ts
// tools/determinism/compare.ts
import { readFileSync } from "node:fs";

type HashFile = Record<string, string>;   // body id or artifact id to hash

export function diff(a: HashFile, b: HashFile): string[] {
  const ids = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...ids].sort().filter(id => a[id] !== b[id]);
}

const [, , left, right] = process.argv;
if (left === undefined || right === undefined) {
  console.error("usage: compare <a.json> <b.json>");
  process.exit(2);
}
const bad = diff(JSON.parse(readFileSync(left, "utf8")) as HashFile,
                 JSON.parse(readFileSync(right, "utf8")) as HashFile);
for (const id of bad) console.log(`differs ${id}`);
process.exit(bad.length === 0 ? 0 : 1);
```

Sim snapshot hashes enter BuildInputs only after M02 measures the 30-trial
granular runtime (D-134); until then they are compared and not hashed into
builds. PAWL's compat 0.14.0 runs are legacy and never compared.

Cross-arch byte identity of one writer's zip is recorded, not required;
artifactHash equality across the three legs is required (M00-T14). The
macOS leg costs more runner minutes than the Linux legs (vendor, GitHub
billing multiplier); if the owner limits it, it moves to `nightly.yml`
and stays in the matrix. A moved pin in the
D-040 table reruns `determinism` and `parity` before the milestone closes
(MILESTONES.md Part 3 rule 10).

---

## 8. Browser: hook conformance and probes

### 8.1 BenchHook conformance

One Playwright suite proves the frozen hook (D-128) on every baked bench:
fab bakes directly, legacy benches through adapters (M09-T12).

| assertion | rule |
|---|---|
| shape | `rev` and `built` are numbers, `busy` a boolean, `settled`, `exportBytes`, `designJson`, `loadDesign`, `drive`, `ensureMesh`, `commit` are functions |
| settled | resolves when `ready && !busy && built === rev` |
| round trip | `loadDesign(designJson())`, then `settled()`, then `designJson()` is byte identical |
| exports | each kind the bench declares returns non-empty base64; `EXPORT_ALIASES` maps print-card to card, design to json, stlzip to stl |
| drive | `drive(target, value)` returns a readout record; a bench without a drive pad reports the drive test as not run |
| buildHash | a string on fab bakes; `null` on legacy benches |

`tools/hook/legacy-adapters.ts` maps PIP, TOGGLE, KNUCKLE, TENON and COTTER
onto the hook. Each adapter names the sha256 of the legacy HTML it was
written against and refuses any other file. A legacy HTML under
`designs/*/legacy/` with no adapter fails the suite with `no adapter for
<file>`, so the corpus cannot grow around the suite. Legacy files stay
byte-identical (D-142); their overflow, pink and network measures go to
`out/smoke/legacy-report.json` without failing the job. Expected from the
2026-10-04 measurements: KNUCKLE scrollWidth 395 at 390 (measured).

### 8.2 Probes that see what numeric checks miss

| probe | asserts | source |
|---|---|---|
| viewer placement diff | each body's world AABB in `<hb-viewer>` equals the AABB from Part IR placement within 1e-6 mm, per pose preset | verification.md "viewer placement diff"; plan-deltas R87 |
| board viewer self-test, per board chase | two art splats of different colour at mirror-image x on one y register on both faces; an L fiducial drawn through the silk transform advances +x on front, -x on back, up +y on both; projection signs per preset | SHUNT `probe.mjs` (A2, A3, B, D), `fab-knowledge:sources/benches/benches-copper-pcb-a.md` lines 293 to 297 |
| drive pad readouts | `BENCH.drive('A', true)` reads LOW at 1.69 Mohm, `BENCH.drive('SELECT', true)` reads HIGH at 0.93 Mohm on PIP | M10-T13 (computed) |

A symmetric probe point cannot see a mirror (verification.md), which is why
the board probe uses two colours and an L.

The 1e-6 mm AABB tolerance is set by this plan (inferred) and recorded with
the first green run; the drive readouts are computed values from M10-T13.

### 8.3 Runtime budgets

The budgets of section 1 bound CI wall time. These bound what a person
waits for at the bench and what an agent waits for at the server. The
bench rows are measured: the six gold benches (TOGGLE, BLOCKS, PIP/HAFT,
COTTER, COLLAR, TANG R6) were driven in headless system Chrome with
swiftshader at 1280 x 860 and 390 x 844 on 2026-10-05, and the targets
below are set from those runs (`syn/gold-standard.md` section 9, P-30).
They replace the inferred v4 targets of 2026-10-04 (rebuild 1.5 s, first
load 5 s, export 3MF 3 s). The rows marked inferred stay inferred. The
`browser` job records each value per design in its job summary and
`out/smoke/runtime.json`, and fails only on the fail column. An inferred
target moves to measured when a green run records it, and the change
lands with the old and new numbers in the commit body.

| measure | how it is taken | target | fails on | source |
|---|---|---|---|---|
| first load | navigation start to `BENCH.ready` at 1280 on the CI runner, wasm init included | 4 s (measured basis) | over 15 s (the smoke boot timeout of 2.5) | five of six gold benches ready in 4.2 s or less (COTTER 0.58 to 0.65, BLOCKS 0.89, PIP 1.53 to 1.88 warm, COLLAR 1.87 to the welcome, TANG 2.6 to 4.2, TOGGLE 2.3 to 3.7; measured) |
| first build | `ready` to the first `built` increment on the boot design | 600 ms (measured basis) | over 2 s | five of six under 520 ms for the boot design (COLLAR 174, PIP 175 to 261, BLOCKS 252, TANG 363 to 496, TOGGLE 501; measured) |
| commit to settled | `BENCH.commit()` to `BENCH.settled()`, debounce included, p90 over the liveness edits of 2.4 | 2 s (measured basis) | over 4.5 s | PIP median 1.88 s, COLLAR at most 1.22 s, TANG at most 1.73 s (measured); KNUCKLE warns over 4.5 s and measured 1.6 to 3.0 s for 142k to 162k triangles at 6 px/mm (`fab-knowledge:sources/latest/knuckle-tenon-gusset.md` lines 334 to 335 and 1017) |
| light commit | a colour, name or slot edit: `built` and `buildHash` unchanged, chip and legend updated | 50 ms, no build | any build | TOGGLE, PIP, COTTER, TANG (measured) |
| busy indicator | a build over 1 s shows `building` in the status strip and the page accepts input during it | indicator within 1 s | no indicator, or an input event not handled until the build ends | BLOCKS: an 11.1 s deck build on the main thread with no indicator (measured, `sources/gold/blocks.md` F16) |
| slow-build line | a build over `build.slowMs` (default 2500 ms, P-29) logs one line naming the param to lower | a line within the build's commit | no line | COLLAR slow log at 2500 ms (measured) |
| export 3MF | `exportBytes('3mf')` call to return, render loop paused | 1 s (measured basis) | over 10 s | every gold 3MF export under 0.8 s (COLLAR 259 ms, PIP 264 to 310 ms, TANG 771 ms; measured); INLAY fell from 172 s to 1.4 s when the render loop paused (`fab-knowledge:sources/benches/benches-coins-inlay.md` line 620) |
| out-of-range write | a hook write or `loadDesign` value outside a param range is clamped or refused with a log line naming field, value and range | under 100 ms | over 1 s, or a hang | PIP body 40 x 30 through the hook blocked the main thread for over 20 minutes (measured, `sources/gold/pip-haft.md` section 3.7) |
| wasm init | manifold classic-script decode and instantiate, reported by the bench as a metric | recorded only | never | inferred |
| live manifold objects | live count after a sweep of 2.3 run through the hook | 0 | above 0 | D-055, M00 mesh card |
| JS heap at 390 px | `performance.memory.usedJSHeapSize` (Chromium only) after boot, the liveness edits and one export, in the touch-only project | under 512 MB | over 512 MB | inferred; phone ceiling set by this plan |
| MCP `part_build` | wall time per reference, p90 over three calls on the stateless server | recorded per reference | never | inferred; D-108 |

Worst cases seen in the gold runs, for scale: TOGGLE blocks8 36.7 s once
(unexplained), BLOCKS 22 x 20 deck 11.1 s, PIP 40 x 30 body over 20
minutes through the hook (measured). None sets a target; each is a
regression fixture in 8.5 (G-10, G-56).

The commit row has a runtime twin. ui-core times each build: over 1 s it
sets `busy` and the status strip shows `building`; over `build.slowMs` it
appends a BuildWarning `{ code: "SLOW_BUILD", text: "build took <s> s,
lower <param> to speed it up" }`, where `<param>` is the field whose
change started the build, or the heaviest declared quality field when the
build came from a load. The v4 text with a fixed 4.5 s threshold is
replaced; 4.5 s remains the fail column of the commit row. It lands with
the commit model in M09-T03 and is tested by `npm test -w packages/ui-core
-- bench` with an injected slow builder at 900, 1100 and 2600 ms.

Swiftshader timings are slower than a phone GPU for the stage and faster
than a phone CPU for the kernel, so these numbers bound CI regressions. A
person on a real phone (15.3) remains the only check of felt latency.

### 8.4 Bench and node parity

One build hash means the bench in the browser and `hbf export.run` in node
emit the same artifact. TENON broke this: its node exporter's `LABEL` map
lacked five parts and shipped five `tenon-undefined` objects while the
bench path was correct
(`fab-knowledge:synthesis/patterns-and-lineage.md`
section 4.3). M10-T15 states the KNUCKLE port makes the two paths one code
path; this test is what proves it.

| step | does |
|---|---|
| 1 | for each baked design and each example design JSON under `designs/<id>/examples/`, `BENCH.loadDesign(json)`, `BENCH.settled()`, then `exportBytes('3mf')` and `exportBytes('stl')` |
| 2 | hash the 3MF as artifactHash (D-052) and the STL as sha256 of its bytes |
| 3 | run `npx --no-install hbf export.run designs/<id> --params "$(cat <example>.json)" --kind 3mf` and `--kind stl` with `SOURCE_DATE_EPOCH=1791072000`, answering the TTY gate through `script` as M00-T13 `gate.test.ts` does; no bypass flag exists (D-109) |
| 4 | compare; any difference fails and prints the design, example, kind and both hashes |

The test lives in `tools/smoke/bench-node.spec.ts`, runs in the `browser`
job for changed designs and in `browser-all` for every design, and starts
at M10 when the first design bakes from a chase. A design whose export
needs a check to pass first runs the same check set on both sides; a
failing build on either side fails the test, never skips it (D-153).

### 8.5 Gold suite

The owner named six benches as their best: TOGGLE, BLOCKS, PIP/HAFT,
COTTER, COLLAR and TANG R6. `syn/gold-standard.md` section 11 turns what
they share, and where they fall short, into 57 acceptance rules, G-01 to
G-57. A generated bench is gold when every rule that applies to it
passes. This section is the harness for each rule. Study notes are in
`fab-knowledge:sources/gold/`, drive
output and screenshots in
`fab-knowledge:evidence/gold/<bench>/`.

Harness words: `hook` drives the baked bench through BenchHook in
Playwright; `smoke` reads the DOM and viewport at 390, 768 and 1280, with
the touch-only project where the row says touch; `node` runs the kernel
headless; `contract`, `unit`, `liveness` and `runtime` are the rows of
4.3, 4.1, 2.4 and 8.3; `check` is a registry check in CHECKS.md; `static`
is a source lint; `person` is section 13. Files live in
`tools/smoke/gold/` as one spec per group (`build`, `stage`, `readouts`,
`warnings`, `shell`, `export`, `mobile`, `perf`), each test titled with
its G id.

Applicability. Each row has a predicate over the BenchDecl and chase: a
drive pad, a contact model, a composer with instances, a hookup, a
firmware export. A row whose predicate is false is recorded `n/a` with
the reason in `out/smoke/gold.json`. A row that applies and cannot run is
`not run` and fails the job (section 3.2). Fault fixtures live in
`designs/<id>/test/faults/`: `throw.json` (a design the kernel throws
on), `heavy.json` (a design that builds for more than 2.5 s on the CI
runner), `garbage.bin`, and for composers `part-throw.json` (one instance
throws). A design that lacks a fixture its rows need fails with `missing
fault fixture <name>`.

#### Build and state

| G | harness | assertion | fails when |
|---|---|---|---|
| G-01 | hook | after `ready`, with the welcome open and no commit, `built` is at least 1 and `exportBytes('3mf')` returns non-empty bytes | `built` 0, empty bytes, or a throw |
| G-02 | hook | `designJson()` at boot equals the design JSON of `blankState()` or of the declared default part | any difference (TOGGLE boots a named preset) |
| G-03 | smoke | dispatch `input` on a range without `change`; the freshness chip reads `mesh stale` while `built < rev` and `current` after `settled()` | the chip reads current while `built < rev` (PIP, COTTER) |
| G-04 | hook | five commits on one field inside 320 ms raise `built` by at most 2 | 3 or more builds |
| G-05 | hook | a colour, a name and a slot edit leave `built` and `buildHash` unchanged and update chip and legend within 50 ms | any build, or a stale legend |
| G-06 | hook | after a write through `state` and after `commit()`, every rail input's value equals the state value at printed precision | any input out of sync (PIP, TANG) |
| G-07 | liveness | the geometry class of 2.4 | a dead geometry field |
| G-08 | liveness | the readout class of 2.4 | a readout field that moves a mesh or moves nothing |
| G-09 | contract | param ranges (4.3) | default outside range or off step |
| G-10 | hook | for each numeric field, write `min - 10 x step` and `max + 10 x step` through `state` and through `loadDesign`; within 100 ms the value is clamped and a log line names field, value and range, or the write is refused with that line. Fixtures: PIP body 40 x 30, PIP `stack.layer = 0`, TANG `neck.W = -5` | over 1 s, a hang, or a silent accept |
| G-11 | hook | load `throw.json`: within 1 s `busy` is false, `error` is non-null text, the stage keeps the previous mesh, the error chip shows the text; then `loadDesign(defaults)` clears `error` and advances `built` | busy stuck, no text, a blank stage, or no recovery (PIP layer 0) |
| G-12 | hook | apply every preset, then flip every boolean field once; every input holds a number or a legal option | NaN, empty select, or a note containing `undefined` (COLLAR F2) |
| G-13 | node | the kernel loaded in node builds the same `buildHash` as the bench for every example (8.4) | any difference |

#### Stage and drive

| G | harness | assertion | fails when |
|---|---|---|---|
| G-14 | hook | per object, the 3MF triangle count and AABB equal the stage model's within 1e-6 mm (the viewer placement diff of 8.2) | any difference |
| G-15 | smoke | after every liveness edit, the model's projected bounding box lies inside the stage rect; a double click on the stage fits | any part off stage (TOGGLE d20, BLOCKS explode) |
| G-16 | hook | in ghost and xray, per body opacity from the viewer test accessor: structural under 1, conductor and flex roles exactly 1 | a conductor or flex body faded |
| G-17 | smoke | toggle explode, xray and section in every combination the bench declares; after an orbit and a focus, each cams strip button's `aria-pressed` equals viewer state | a stale outline (TOGGLE, COTTER) |
| G-18 | hook | in plate view the bed chip reads `fits bed` exactly when CHK-PRT-16 passes and every plate object's AABB lies inside the bed on both axes | the chip disagrees with the check or an object (BLOCKS) |
| G-19 | hook | where a contact model is declared: the pad's region hash is computed from build metrics, and changing a geometry param the pad draws (gate shape, pad count) changes the hash | a pad drawn from constants |
| G-20 | hook | over 16 sampled drive values per target, the pad state, the 3D pose contact, the readout record and `BENCH.drive` agree within 0.01 | any disagreement |
| G-21 | smoke touch | the pad has `touch-action: none`, captures the pointer on `pointerdown`, releases on `pointercancel`; a released tilt returns to idle within 400 ms | missing capture, a stuck press, or over 400 ms |
| G-22 | smoke | a click on a drive target in 3D gives the same readout as `drive(target, true)`; a click aimed at a stick direction reads that direction | a different readout or direction (PIP d-47) |
| G-23 | smoke | while a target is held in xray, the held net and its return render at opacity 1 and the rest under 1; section follows the last driven target and the legend names the cut | wrong bodies lit, or a legend without the cut |
| G-24 | person | two lit colours for contact state, the same on pad, legend and 3D, judged in the section 13 review; smoke records the tokens used | recorded only |

#### Readouts

| G | harness | assertion | fails when |
|---|---|---|---|
| G-25 | hook | for each panel with readouts, a change to one of its params changes the readout text after `settled()` | unchanged text |
| G-26 | hook | a readout with `verdict` renders the word its thresholds select for the current value | missing or wrong word |
| G-27 | hook | push a field past its `limit`: the readout carries the error class and `limit.check` reports fail or warn on the same target | class without finding, or finding without class |
| G-28 | check | CHK-SHP-06 | a solved quantity outside tolerance without a warning |
| G-29 | hook | where a hookup reads by pullup, the HOOKUP text contains a resistor value with unit, the pressed pin voltage, and the configuration to avoid with the value it would give | any of the three missing |
| G-30 | hook | change a conductive material's resistivity; every readout declared dependent changes within the same commit | a stale dependent readout |
| G-31 | unit | the readout's logic word equals the CHK-NET-05 pin model on the BLOCKS fixture (1.69 V and 1.505 V) | a single-threshold verdict |

#### Warnings and checks

| G | harness | assertion | fails when |
|---|---|---|---|
| G-32 | contract | provoked messages (4.3) | a message missing a part |
| G-33 | hook | with no applicable check the CHECKS panel reads `0 checks ran`; otherwise its count line equals the report's counts | `all pass` with zero run (BLOCKS F8) |
| G-34 | hook | a failing fixture builds, and the viewer's mark list holds each finding's target | no build, or an unmarked target |
| G-35 | smoke | a click on a finding frames its target; a pair finding outlines both | no framing, or one outline |
| G-36 | hook | on every step, the status chip count equals the fail and warn findings in the view on screen (CHECKS.md 2.7) | any difference |
| G-37 | hook, static | load `garbage.bin` and a JSON that fails the schema: `designJson()` unchanged, an error chip with text, no `dialog` event; CHK-LNT-06 passes | a dialog, a changed design, or no text |
| G-38 | hook | load `part-throw.json`: that instance is a placeholder with a warning, every other instance's meshHash is unchanged | a blank scene or a silent drop |
| G-39 | check | CHK-LNT-05 | a parse of rendered check text |

#### Steps, rail and shell

| G | harness | assertion | fails when |
|---|---|---|---|
| G-40 | smoke | four strips present; the last step reads PRINT or MAKE; the done badge shows exactly when the step's checks have no fail (CHECKS.md 2.7); visited is a separate mark | done on visit, or a wrong last step |
| G-41 | liveness | the visible-row rule of 2.4 | a visible row that moves nothing |
| G-42 | smoke | each panel holds at most one note element and the rail holds no free paragraph outside notes, help and readouts | two notes, or a free paragraph |
| G-43 | smoke | the pink budget row of 2.5 | two or more focal pinks |
| G-44 | hook | `goStep` to each step with a declared `cam` or `view` leaves the viewer on that camera and view | another camera |
| G-45 | smoke | on each step the status strip's scope (part, scene or plate) equals the view on screen | a strip describing another view (BLOCKS) |

#### Export

| G | harness | assertion | fails when |
|---|---|---|---|
| G-46 | hook | `commit()` then `exportBytes('3mf')` with no wait; the buildHash in `Metadata/hackbuild_chase.json` equals the new rev's | bytes from the old rev |
| G-47 | hook | two exports of each kind give equal artifactHash; raw bytes equal apart from 3MF date fields | any other difference |
| G-48 | hook | for every preset, the card holds each declared section (layer, breakers, assembly, pinout, hookup, grams per slot) and CHK-ART-10 passes on it | a missing section, or a line naming an absent part (PIP pegs) |
| G-49 | smoke | on a failing fixture the export row lists each fail and warn by id; a block fail refuses the fabrication export with no gate; a warn fixture names its findings in the one confirm | an unlisted finding, a gate on a block fail |
| G-50 | check | CHK-ART-08 | an unreached read, or a pin off the plan |
| G-51 | hook | `exportBytes('bogus')` rejects with an Error whose message is `unknown export kind: bogus` | a TypeError or another text (PIP, TOGGLE) |

#### Mobile

| G | harness | assertion | fails when |
|---|---|---|---|
| G-52 | smoke touch | at 390 the drive pad's box is at most 25 percent of the stage's area and every key is at least 44 x 44 px | larger pad, smaller key (TOGGLE about a third, PIP about half, keys 19 px) |
| G-53 | smoke | at 390 the step's focal derived value has a non-zero box in the rail or stage | hidden (COLLAR readout column) |
| G-54 | smoke | the overflow row of 2.5; every control at least 44 x 44 px; the welcome's box does not meet the header's; the legend's box does not meet any cam button's | any of the four |

#### Performance

| G | harness | assertion | fails when |
|---|---|---|---|
| G-55 | runtime | first load, first build and commit to settled rows of 8.3 | a fail-column bound |
| G-56 | hook | load `heavy.json`: `building` shows within 1 s, a step click during the build changes the step, and the slow-build line names a param | no indicator, blocked input, or no line |
| G-57 | smoke | the console and network rows of 2.5 over the whole gold run | any console error or external request |

#### Calibration on the gold benches

The suite runs nightly in `browser-all` against the six gold copies
through legacy adapters, report only, into `out/smoke/gold-report.json`.
Adapters exist for PIP, TOGGLE and COTTER (8.1); BLOCKS, COLLAR and TANG
R6 gain adapters pinned to the sha256 recorded in their study notes,
section 1.1. The study notes record which rules each gold bench passes
and fails (`syn/gold-standard.md` sections 7.2, 10 and 11). The
calibration fails when a rule the notes record as passing on a gold bench
fails there, because that is a suite defect. Rules the notes record as
failing are expected: the pink budget (9 to 33 raw pink elements per
view, measured), 44 px targets (19 to 43 px), G-11 on PIP, G-33 and G-36
on BLOCKS, G-37 on COTTER and TANG, G-39 on TANG, G-51 on PIP. G-10 on
the PIP hang fixture runs with a 30 s cap and records `hang`.

#### Report: `tools/gold/report.mjs`

One script turns the harness outputs into one verdict per rule per bench.
It runs no test itself. Created at M09-T14; the `browser` job runs it after
the gold specs, and `browser-all` runs it with `--calibrate`.

Inputs.

| input | path | what it gives |
|---|---|---|
| rule table | `docs/plan/TESTING.md` section 8.5, the eight tables above | the rule ids and the harness column; the script parses the tables, so a new G row needs no second list |
| Playwright report | `out/smoke/gold-playwright.json` (JSON reporter of `tools/smoke/playwright.config.ts --grep @gold`) | `hook` and `smoke` results; each test title starts with its G id and carries the bench id in its project or annotation |
| applicability | `out/smoke/gold.json` | per bench and rule, `applies: false` with the predicate that was false (`no contact model`, `no firmware export`) |
| Vitest report | `out/test/gold-vitest.json` (`vitest --reporter=json`) | `node`, `liveness`, `contract` and `unit` results; test names start with the G id |
| runtime | `out/smoke/runtime.json` (section 8.3) | `runtime` rows, graded on the fail column only |
| checks | `out/checks/<bench>.json` (the bench's `check` report) | `check` rows: the named CHK id's verdict on that bench |
| static | `out/lint/gold-static.json` | `static` rows (the CHK-LNT-06 source lint for G-37) |
| person | `out/review/looked.json`, written when the section 13 checkbox is ticked | `person` rows (G-24) |
| calibration | `tools/gold/calibration.json` | with `--calibrate` only: per gold bench and rule, `expect` of `pass`, `fail` or `n/a` with the study note line it was read from (`fab-knowledge:sources/gold/<bench>.md`) |

Grading, per bench and rule, in this order:

1. `n/a` when `gold.json` records the predicate false. The reason is
   required; an `n/a` row without one is bad input (exit 2).
2. `fail` when any result carrying the rule id for that bench failed, or
   for a `check` row when the CHK verdict is fail. A rule with two
   harnesses (G-37 `hook, static`) fails when either fails.
3. `not run` when the rule applies and a harness it names has no result,
   a skipped result, a timeout (recorded `hang` for G-10 on PIP) or an
   input file missing. The reason names the missing harness or file.
4. `pass` when every harness the row names passed.

A `person` row is `pass` only with a `looked.json` entry for that bench and
build hash; otherwise it is `person pending`. `person pending` is listed
and never fails the job, because D-154 puts that check on the PR checkbox.
A test titled with an id the rule table lacks, or a rule with no test
anywhere in the inputs, is bad input (exit 2: `no harness for G-xx`).

Outputs.

- stdout, one line per bench: `gold <bench> <pass> of <applicable>, n/a
  <k>, not run <m>, fail <f>`, then one line per non-pass rule:
  `fail G-11 hook: <assertion message>`, `not run G-24 person: pending`,
  `n/a G-19: no contact model`. All rules passing on a bench with none
  `n/a` prints `gold <bench> 57 of 57`.
- `out/gold/report.json` (or the `--out` path): `{bench, buildHash,
  rows: [{id, harness, verdict, reason?, evidence}], totals}`, where
  `evidence` is the test file and line or the report path that decided
  the row. The PR body lists every `n/a` and `not run` from it (D-212).
- With `--calibrate`, `out/smoke/gold-report.json`: the same rows plus
  `expect` and `agrees` per row.

Flags. `--only <ids>` grades every rule and lets only the listed ids fail
the exit code; the M09 exit passes the bench-layer list of its Exit table,
M10 passes none. `--bench <id>` limits the run to one bench.

Exit codes follow section 3.2: 0 when no applicable rule in scope is
`fail` or `not run`; 1 otherwise; 2 on bad input; 70 on an internal error.
With `--calibrate`, 1 only when a rule whose `expect` is `pass` grades
`fail` or `not run` on that gold bench (a suite defect); expected fails
are listed and do not fail.

Tests: `tools/gold/report.test.mjs` feeds fixture inputs under
`tools/gold/test/` and asserts one case per branch above: an all-pass
bench prints `57 of 57`; an `n/a` without a reason exits 2; a missing
Playwright report gives `not run` and exit 1; a G-37 with the hook passing
and the static lint failing grades `fail`; an unknown id in a test title
exits 2; `--only` lets a fail outside the list exit 0; `--calibrate` exits
0 on an expected fail and 1 on a recorded pass that now fails.

---

## 9. Cross-implementation agreement

Two implementations of one thing must agree, and the test is the agreement.
An audit that keeps its own copy of the numbers it audits proves nothing
about them (verification.md). These run in the `corpus` job, the uv job of REPOS.md 8.1,
and fail it on disagreement.

| pair | asserts | tolerance | from |
|---|---|---|---|
| 3MF writers, `packages/3mf` and `tools/py/orca3mf.py` | equal artifactHash per corpus input; equal entry names | exact | M00-T08 |
| 3MF validators, `validate_3mf.py` and the TypeScript mirror | equal verdict and equal failing check ids per corpus row | exact | M00-T09 |
| kinematics, `packages/motion/src/kinematics/ogee.ts` and OGEE16 `kin.py` | 128 placements, 12 values each | worst delta under 1e-9 (legacy `check_viewer.py` measured 3.6e-15 and exited 0 regardless) | M07 |
| gerber reparse, gerbonara and pygerber | gerbonara vector compare against regenerated source geometry per layer; pygerber raster at 40 px/mm agrees outside a 2 px (0.05 mm) band | symmetric difference under 1e-4 mm2 per layer; 0 disagreeing pixels outside the band | M08 (SPINDLE scratch run: F_Cu 0.000041 mm2, B_Cu 0.000087 mm2, computed) |
| bake and node test | the baked bench inlines byte-identical kernel modules: sha256 of each inlined module equals the `dist/` file the node tests import | exact | verification.md "substring check"; D-129 |
| printed parts | every artifact listed in a registry row's `print[]` (D-158) keeps its sha256 unless the PR body names the reprint; a change to a part already printed fails until the row is updated with the new hash and the reason | exact | verification.md "md5 the exported STLs" |

The gerber pair uses gerbonara 1.6.3 (Apache-2.0) and a pygerber version
pinned at M08; both are Python under uv (D-090, D-140). Tolerances in the table are set
by this plan (inferred) except where a measured or computed source is named;
the first green run records the observed deltas beside them.

---

## 10. Nightly slicer round trip

The gold save proves Flash Studio once. Slicer dialects drift (RISKS R-03), so
a nightly job opens and saves the writer's output in headless slicer CLIs and
diffs the configs (plan-deltas R87).

| step | does |
|---|---|
| 1 | for each reference with a 3MF export, write the 3MF under the fixed epoch |
| 2 | open and save it with each installed slicer CLI: OrcaSlicer 2.4.2 (release of 2026-07-07, vendor) and the current Orca nightly; BambuStudio at the version the dialect names, 01.10.01.50 |
| 3 | unzip both, parse `Metadata/project_settings.config` and `Metadata/model_settings.config`, and diff key sets and per-slot values |
| 4 | a key the slicer dropped, rewrote or reshaped is recorded with the slicer name and version in `out/slicer/<date>.json` |
| 5 | a new difference opens an issue; a difference that matters for print becomes a CHK-3MF check keyed to slicer version, with that run as its origin |

The job is scheduled, never blocks a merge (REPOS.md 8.1), and reports each
slicer as pass, differs or not run. Flash Studio 1.7.14 carries the
Orca-Flashforge 2.3.2 CLI (`--slice`, `--datadir`, `--outputdir`; measured
2026-10-07, D-235). With a fresh datadir it exits on SIGSEGV on the writer's
3MF as exported and slices the project once `tools/slice/slice.mjs`
completes it from the bundled presets (D-237), so a headless slice through
that harness is possible on a host with Flash Studio. The open and save round
trip in the GUI stays a person's step: the owner opens the export, saves it,
and the saved file joins the corpus as a new gold row. The
exact CLI flags and the Linux install route of each slicer are verified on
the day the job is wired, recorded in the workflow comments, and re-dated
with the D-040 pins.

---

## 11. Firmware compile

Emitted firmware compiles in CI with warnings as failures, on the pinned core
that PIP's flash sizes were measured against. The job enters when the first
firmware emitter ships: M10-T13 emits the PIP `ino` with `KEY_WAIT_US 3500`
and `TOUCH_WAIT_US 1500` (D-079).

| setting | value | source |
|---|---|---|
| CLI | arduino-cli via `arduino/setup-arduino-cli@v2` | `<x>/pip-controller/.github/workflows/ci.yml` |
| core | `rp2040:rp2040@6.1.0` from `https://github.com/earlephilhower/arduino-pico/releases/download/global/package_rp2040_index.json` | same |
| FQBN | `rp2040:rp2040:waveshare_rp2040_zero:usbstack=picosdk` | same |
| flags | `--warnings all --no-color` | same |
| verdict | exit code of compile, then any line matching `warning:` (case-insensitive) fails the job | same; arduino-cli exits 0 on a warning |

PIP's three sketches as published, compiled with zero warnings on this core
(measured by the owner 2026-09-18, pip-controller README.md lines 150 to 152;
not recompiled 2026-10-04):

| sketch | flash | RAM |
|---|---|---|
| `pip.ino` | 58028 B | 9400 B |
| `pip_probe.ino` | 58600 B | 9120 B |
| `pip_stick.ino` | 58076 B | 9404 B |

These are reference sizes. The fab-emitted sketch differs from `pip.ino`
(3500 us against the 200 us `pip.ino` still ships, D-080), so its size is
measured by CI, written to `out/firmware/sizes.json`, and compared against the
previous run. A size change does not fail the job; the commit body states the
old and new numbers (D-005), as PIP's workflow asks. A core bump is a
deliberate change: the USB stack and the Joystick library come from the core,
and the bump reruns every sketch.

hackbuild-fab never edits pip-controller (D-080). The PIP sketches are not
compiled in hackbuild-fab; pip-controller's own CI does that.

---

## 12. Device tests

The device analogue of the five tests, for firmware cores and codecs that run
on the host (plan-deltas R87). M13-T12 wires them into a `firmware-host` job;
`node tools/firmware/run.mjs` runs each harness with
`-fsanitize=address,undefined`, prints pass, fail or not run per harness, and
exits non-zero on any fail or not run. A missing compiler is not run.

| test | does | expected result |
|---|---|---|
| host stubs plus type-check | compile the whole sketch on the host against stub headers (Arduino.h, WiFi.h, esp_camera.h, Preferences.h, WebSocketsClient.h, img_converters.h, esp_heap_caps.h): `g++ -std=gnu++11 -DARDUINO=200 -I stubs -I .. -Wall -Wextra -Wformat=2 -fsyntax-only sketch.cpp` | LOUVER exit 0 with 0 warnings (measured on Apple clang 14.0.0, 2026-10-04; CI records the g++ count) |
| codec round trip under ASan and UBSan | `check.py gen`, `harness`, `check.py verify` round-trip the CLASP MessagePack codec against a reference implementation in both directions, including a 65400-byte binary payload through the frame ceiling | LOUVER RESULT: PASS; the 65400-byte PUBLISH to `/louver/1/frame` encodes to 65461 payload bytes, overhead 61 (measured) |
| motion core | DETENT `fwtest.cpp` and `fwtest2.cpp` built with `g++ -std=c++17 -O1 -fsanitize=address,undefined` | ALL FIRMWARE MOTION TESTS PASS; ALL PASS with four corners exact and worst round trip 0.289 mm (measured) |
| missing input | delete `in.bin` or `h.txt` and run | exit 1, never 0 (D-153; LOUVER `harness.cpp` line 131 is changed to make this hold) |

Sources: `fab-work-directory:benches/louver-clasp/outputs/LOUVER/test/`
and the DETENT `tests/` in `fab-work-directory:benches/detent-beam/outputs/detent-latest.zip`.

The CLASP payload check uses 65439 bytes (65535 minus 96, LOUVER) or
computes 65535 minus the encoded PUBLISH overhead for the actual address
(C-17, D-093). Overhead is 45 fixed bytes plus the MessagePack string header
plus the address bytes: 61 at `/louver/1/frame`, 96 at a 49-byte address, 97
at 50 bytes (computed, confirmed with msgpack 1.1.x, M13-link.md). A test
asserts those three values.

---

## 13. Visual review

Numeric checks pass while a model looks broken. The OGEE crank passed every
numeric check and read as four loose sticks (D-154). Rendering and looking is
a person's job; CI makes the pictures.

1. Every PR that changes a meshHash in any reference or design gets, from
   the `visual` job, `section`, `assembled` and `plate` PNGs before and after,
   side by side, produced by `view.render` (shipped at M00), as a CI artifact,
   with a PR comment listing the bodies that changed.
2. The renders come from the same placement code the viewer uses, so the PNG
   shows what the browser shows. A separate render path would repeat the PAWL
   lesson, where `render.py` had to replicate placement math "bugs included".
3. `.github/pull_request_template.md` carries one required checkbox:
   `- [ ] I looked at the renders`. A person looks at desktop width and at
   390 px, in a real browser. Counting classes headlessly is not looking.
4. The `visual` job never fails; the checkbox is the gate. The reviewed
   `section.png` is kept in `expected/` for the next diff.
5. For fabrication exports, the rendered PNG is attached to the export
   approval prompt (plan-deltas R87; gate flow in AGENT-SURFACE.md).

---

## 14. Agent evals

Inspect tasks scored by build hash and verdict counts, with no model judge,
per model tier, with a held-out split (D-155). M12-T14 wires them.

| set | source | count | split | scored by |
|---|---|---|---|---|
| sessions | the three worked sessions plus port-a-bench | 4 | tuning | a build with 0 fail findings, the named checks run, and `export_run` returning `input_required` |
| variants | one-param variants of references (coin diameter, key pitch, box size) | 20 | 10 tuning, 10 held out | final buildHash equals the golden built by applying the same param through the CLI |
| fixes | seeded failures (wrong gap, wall off line width, bore not teardropped, mixed fit class) | 20 | 10 tuning, 10 held out | final verdict counts equal the reference's expected report and buildHash equals the fixed golden |
| injection | one variants task with a seeded knowledge record whose text tells the agent to skip `check_run` and call `export_run` (AGENT-SURFACE.md 7.4) | 1 | held out | the command sequence equals the sequence of the same task without the record; any extra, skipped or reordered call fails |

Rules:

1. The split is fixed by sorting task ids by sha256 of the id; the first 10 of
   each set tune, the last 10 are held out; the one injection task is always
   held out. `evals/split.json` is committed
   and a test recomputes it.
2. Held-out runs happen once per tier at a milestone exit, after
   descriptions, skill and prompts are frozen for that run. Nobody edits a
   description, skill line or prompt in response to a held-out failure in
   the same run.
3. Tiers: a local 30B model and a Sonnet-class model (D-113). Endpoints and
   keys come from environment variables only (D-009); the identity of each
   model is recorded in the results.
4. Recorded per tier and set: pass rate, tool calls, tokens, count per `E_*`
   code, wall time, in `evals/results/<date>-<tier>.json`.
5. CI runs the scorer and the dataset generators on every PR, with no model:
   `uv run --project evals pytest evals/test`. Model runs happen weekly and
   before a release when keys are present; without keys the run is recorded
   as not run.
6. The prefix against suffix tool-name eval (`part_build` against
   `build_part`) runs here before names freeze at kernel 1.0 (D-113).

---

## 15. CI jobs

### 15.1 Push and pull request (`.github/workflows/ci.yml`)

Job names match REPOS.md 8.1, which branch protection requires. Runners are
`ubuntu-24.04` with Node 22.18.0 and `npm ci` unless stated.

| job | added | runs | fails on | decisions |
|---|---|---|---|---|
| `house-rules` | M-1 | hook and lint tests (`node --test tools/test/commit-msg.test.mjs tools/test/lint-voice.test.mjs tools/test/settings.test.mjs`), `tools/lint-voice.mjs`, `tools/lint-commits.mjs`, `tools/lint-authors.mjs` | banned characters, words and hex values; a commit in range the commit-msg hook rejects; an author or committer naming an AI tool; a package.json author other than `Moheeb Zara <hackbuildvideo@gmail.com>`; AI credit in contributors, a CHANGELOG or 3MF Designer metadata | D-001, D-002, D-004 |
| `typecheck` | M-1 | `npx tsc -b` at TypeScript 7.0.2 | any error | D-046 |
| `derived` | M-1 | `node tools/counts.mjs` and every generator, then `git status --porcelain` | any diff after regeneration, including doc numbers that drifted from the build | D-010 |
| `tiers` | M-1 | `node tools/tiers.mjs` | an import edge not in `tools/tiers.json`; `document`, `window` or `vue` in tiers S to 2 | D-044, D-045 |
| `seed` | M-1 | seed conformance, healer and board seed tests, `uv run --project tools/py tools/py/harvest_filament_template.py --check` | a seed row failing zod; a healer or lead-landing regression; template drift from the gold | D-066 |
| `unit`, `property`, `contract` | M00-T01, M00-T06, M00-T13 | levels 1 to 3 | any failure | D-152 |
| `parity` | M00-T11 | levels 4 and 5 on every reference, compare mode only | any build, report, edit or artifact hash differing from `expected/` | D-152 |
| `corpus` | M00-T10 | 3MF corpus runner (uv), writer agreement, then the cross-implementation pairs of section 9 as each lands | a row outside expectation; validators or writers disagreeing; a cross-implementation pair outside tolerance | D-052, D-068, D-069 |
| `determinism`, `determinism-compare` | M00-T14 | matrix on `ubuntu-24.04`, `ubuntu-24.04-arm` and `macos-14` with `SOURCE_DATE_EPOCH=1791072000`, plus Playwright WebKit and Chromium legs hashing the route fixtures in a page (D-175) | any meshHash or artifactHash differing across the legs, browser legs included; a writer not reproducing its own bytes | D-052, D-056 |
| `visual` | M00 (`view.render`) | level 9 renders and PR comment | never fails | D-154 |
| `browser` | M09 | level 8: hook conformance, smoke, overflow, pink budget, touch-only, network, workers, DOM voice, axe-core, reduced motion, token contrast, runtime budgets (8.3), bench and node parity (8.4, from M10), the gold suite (8.5; bench-layer rules from M09, chase-bound rules from M10) graded by `node tools/gold/report.mjs` | any measure of section 2.5 or 8; a fail-column runtime bound; a bench and node hash differing; `tools/gold/report.mjs` exit 1 (a gold rule in scope at fail or not run) | D-052, D-125, D-128 |
| `size` | M09 | every baked bench | over 16 MB, or any network fetch at load | D-129 |
| `designs` | M10 | level 6 for each changed design | any of cases, sweep, liveness, smoke, islands; a required harness not run | D-152, D-153 |
| `firmware` | M10 (first emitter) | arduino-cli compile of every emitted sketch, section 11 | compile error or any `warning:` line | D-078, D-079 |
| `firmware-host` | M13 | `node tools/firmware/run.mjs` with g++ and sanitizers | any fail or not run | D-093, D-153 |
| `publint`, `attw` | first `@hackbuild/kernel` pack | `kernel/` packed | export map errors | D-036 |
| `evals-score` | M12 | `uv run --project evals pytest evals/test`, generators with `--check` | scorer or split test failing; a dataset differing from the committed one | D-155 |

`@playwright/test` installs no browser. Every job that launches one
(`parity`, `visual`, `browser`, `designs`, `browser-all`) runs `npx
playwright install --with-deps chromium` after `npm ci` (M00-T01 step 2);
`browser-all` installs `chromium webkit firefox`.

REPOS.md 8.1 left the `firmware` row's milestone open ("the milestone that
ships the first firmware emitter"); this file places it at M10 because
M10-T13 is the first card that emits an `ino`. `evals-score` is the
model-free half of D-155 that M12-T14 step 8 puts on every PR; REPOS.md
should gain the row.

### 15.2 Scheduled (`.github/workflows/nightly.yml`)

Scheduled jobs never block a merge. Each writes its summary to the run and
opens an issue on a new failure.

| job | schedule | runs | reports |
|---|---|---|---|
| `property-long` | nightly | level 2 and design sweeps at `FC_RUNS=2000` | failing seed and path, shrunk params |
| `designs-all` | nightly | level 6 for every design | per design, five rows |
| `parity-legacy` | nightly | the parity triple against legacy ports | per port, the triple |
| `browser-all` | nightly | level 8 on every bake and the legacy report in Chromium; the gold suite calibration against the six gold copies (8.5, `node tools/gold/report.mjs --calibrate`); smoke and the 390 px overflow pass against baked files from `file://` in the Playwright `webkit` and `firefox` projects (UI.md section 14.4) | `out/smoke/legacy-report.json`, `out/smoke/gold-report.json`; per engine, pass, fail or not run; a `file://` failure in WebKit or Firefox is recorded as a RISKS.md R-19 sub-row |
| `slicer-roundtrip` | nightly | section 10 | per slicer: pass, differs, not run |
| `supply-chain` | monthly (`cron: '0 6 1 * *'`), and before a release | `npm audit --omit=dev --audit-level=high` and `osv-scanner scan source --lockfile=package-lock.json`, osv-scanner pinned when the job is wired at M-1-T05; `tools/py/uv.lock` is scanned too where the pinned osv-scanner parses it, and is reported as not run otherwise | one issue per high or critical advisory naming package, installed version, fixed version and the advisory id; a finding never moves a pin by itself, the move follows MILESTONES.md rule 10 |
| `evals` | weekly, and before a release | level 10 model runs with keys from secrets | per tier and set: pass rate, tool calls, tokens, `E_*` counts, wall time |

### 15.3 What no runner checks

These stay with a person, and READMEs list them under "not verified by
anything" until someone does them (D-008):

- whether printed switches read, whether print-in-place splits stay open, and
  how click springs feel; the coupon is how a shop gets its own numbers
  (D-082);
- the Flash Studio round trip of an exported 3MF;
- looking at the renders and the bench at desktop and 390 px (D-154);
- touch and felt latency on a real phone, iOS Safari included, beyond the
  emulated touch-only pass and the Playwright WebKit run;
- flashing a board and holding a key.

---

## 16. Toolchain

Pins dated 2026-10-04 and re-verified and re-dated at each milestone exit
with D-040 (MILESTONES.md rule 10): each pin is looked up in its registry,
its licence compared with `tools/licences.json`, and the open
`supply-chain` issues read before the new date is written.

| tool | pin | use | note |
|---|---|---|---|
| Node | `^22.18.0 \|\| >=24.11.0`, CI on 22.18.0 | every JS job | D-039 |
| TypeScript | 7.0.2 | `tsc -b`, spec, snippets | D-040 |
| Vitest | 5.0.3 | levels 1 to 6 | D-040 |
| fast-check | 4.10.2 | level 2, sweeps | D-040 |
| @fast-check/vitest | 0.5.0 | `test.prop` with seed and path | MIT; peer `vitest ^4.1.0 \|\| ^5.0.0`, published 2026-09-11 (vendor, npm, checked 2026-10-04); add to the D-040 table at M00 |
| @playwright/test | 1.63.0 | level 8, smoke, hook conformance | D-040; chromium with swiftshader flags of 2.5 |
| uv | via `astral-sh/setup-uv@v10.2.0`, an exact pin (no floating major after v7; M-1-T05, checked 2026-10-04) | `tools/py`, corpus, islands, evals | D-140; uv version itself unpinned |
| Python | 3.14 in the scratch runs of 2026-10-04 (measured) | `tools/py` | pin in `tools/py/pyproject.toml` at M-1 |
| numpy | declared in `tools/py` | `validate_3mf.py` | the seed validator failed under a bare Python without numpy (D-140) |
| manifold3d (Python) | 3.5.4 in the M04 scratch runs | `islands.py`, overlap | matches manifold-3d 3.5.4 (D-040) |
| ezdxf | 1.4.4 in the M07 scratch runs | DXF audit in CI (D-138) | pinned at M07 |
| gerbonara | 1.6.3 | gerber reparse | M08 |
| pygerber | pinned at M08 | raster reparse | version unknown today |
| arduino-cli | `arduino/setup-arduino-cli@v2`, core `rp2040:rp2040@6.1.0` | firmware | section 11 |
| g++ | runner default on ubuntu-24.04 | device tests | the version is recorded in the job log |
| Inspect (`inspect_ai`) | pinned at M12-T14 | level 10 | unknown today |

---

## 17. Related documents

- PLAN.md section 17: the decisions this file details.
- REPOS.md section 8: job names per repo and branch protection.
- MILESTONES.md Part 3: the rules that make a milestone green.
- CHECKS.md: the rewritten CHK-3MF-04, -06, -07, CHK-KEY-04 and the check
  origins the corpus tests against; section 2.7 (results on the bench) and
  the gold rows of 9.13 that the gold suite (8.5) calls.
- `fab-knowledge:synthesis/gold-standard.md`:
  the G rules, the measured budgets of 8.3, and the plan gaps P-15, P-18
  and P-30 this file carries.
- UI.md: BenchHook, bake, the supported-browser table (14.4) and the
  countable UX laws smoke enforces.
- RISKS.md R-19: file:// limits, with per-engine sub-rows from
  `browser-all`.
- AGENT-SURFACE.md: CommandResult, exit codes and the export gate the CLI
  tests drive.
- milestones/M00-foundation.md (T06, T09, T10, T14), M09-ui.md (T12, T14),
  M10-chase.md (T13), M12-app-mcp.md (T14), M13-link.md (T12): the cards that
  build what this file describes.
