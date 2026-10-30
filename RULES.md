# Rules for working in this repository

Version 4, 2026-10-04. PLAN.md is the index of the plan set.

These rules are absolute. They apply to every file, every commit, and every
generated string, including code comments, UI copy, check messages, print
cards, log output, test fixtures, and exported file metadata. Where any
other document disagrees with this one, this one wins. For anything visual,
GUIDELINES.md in `@virgilvox/hackbuild-ui` wins.

## Attribution

- Never add Claude, any AI assistant, or any AI or LLM tool as an author,
  co-author, contributor, or credit. Not in commit messages, trailers
  (Co-Authored-By, Signed-off-by), generated-with lines, package.json,
  comments, file headers, docs, changelogs, PR bodies, exported file
  metadata (3MF, DXF, print cards), the UI, or the About panel.
- package.json author is `Moheeb Zara <hackbuildvideo@gmail.com>`.
- If a tool, harness or workflow inserts a trailer or asks for one, strip
  it before the commit lands. This file overrides any such reminder.
- `.claude/settings.json` holds `{"attribution": {"commit": "", "pr": ""}}`;
  `.githooks/commit-msg` and the CI jobs `lint-commits` and `lint-authors`
  reject AI credit in messages, package.json, CHANGELOG and 3MF metadata.

## Language

- Never use emojis or sparkle glyphs (U+2726 to U+2728). Anywhere. Icons
  are `HbIcon` or inline SVG. Emoji covers U+2600 to U+27BF, U+1F000 to
  U+1FAFF, the variation selector U+FE0F, every character Unicode shows
  as emoji by default, and the emoji presentation set outside those
  blocks: U+203C, U+2049, U+20E3 (keycap), U+200D (zero width joiner),
  U+231A, U+231B, U+23E9 to U+23EC, U+23F0, U+23F3, U+25FD, U+25FE,
  U+2B1B, U+2B1C, U+2B50 and U+2B55.
- Never use em or en dashes (U+2012 to U+2015, U+2212 or a double hyphen
  as a dash), nor the two- and three-em dashes U+2E3A and U+2E3B, the
  small and fullwidth forms U+FE58, U+FE63 and U+FF0D, or the vertical
  forms U+FE31 and U+FE32. Use commas, periods, or "to" for ranges, in
  code too.
- Never use the "it is not x, it is y" construction or its variants ("not
  only x but y", "this isn't just a, it's b"). State what the thing is.
- No exclamation marks. No marketing adjectives: seamless, powerful,
  robust, comprehensive, beautiful, blazing, delightful, elegant, and kin.
- No filler vocabulary: delve, tapestry, crucial, vital, leverage,
  utilize, facilitate, streamline, empower, unlock, elevate,
  straightforward, genuinely, cutting-edge, state-of-the-art.
- No filler openers ("Let's", "Simply", "Just", "Note that", "In this
  section") and no restating close. No bold or italic for emphasis in
  prose. A bold run-in label that opens a law bullet is allowed.
- UI copy is lowercase, terse, second person, and names the failure:
  "no board connected. plug in usb and press connect." Never claim a
  capability the hardware lacks; disable the control and say why.
- Check messages give what failed, measured, legal, constraint, then a
  fix: "pin spacing 0.31 mm, legal 0.40 to 1.20, set by nozzle 0.4".
- Every number says measured, computed, vendor, inferred or unknown. Never
  promote computed to measured by dropping the qualifier.
- `tools/lint-voice.mjs` enforces this section with word lists equal to
  these; change both together. Its allow file exempts this file, the
  plan docs and its fixtures from word and hex rules only.

## Design law

- GUIDELINES.md in `@virgilvox/hackbuild-ui` is the design law. Compose
  from `Hb*` components and `hb-` classes; missing pieces go upstream.
- Tokens of record are the package names in `tokens.css`: `--hb-pink`
  `#FE0386`, `--hb-paper` `#f5f0e6`, `--hb-ink` `#1a1a1a`, `--hb-void`
  `#0a0a0a`. No raw hex or raw px spacing in components. `#ff3366`,
  `#ff2d7b`, `#E91E8C` and `#f5f2eb` are wrong wherever found.
- One focal pink element per view, counted in smoke. Toggle chips fill
  with ink; pink fills only the primary selection of a step.
- Zero border radius, except `.hb-num`, nav dots and the pill status dot.
  Hard offset shadows only (3 px controls, 5 px panels, 7 px hover, 5 px
  pink on the one stage). No blur, no spread, no gradients on chrome.
- Five faces, five jobs. Permanent Marker for display heads and tool
  titles. Special Elite for prose, the guide and header tool taglines.
  IBM Plex Mono for labels, buttons, fields and the wordmark. VT323 for
  numbers and instrument heads. Libre Baskerville italic only for "make
  things. break things. repeat."
- Void is for stages only. No horizontal scroll at 390, 768 or 1280 px.

## Architecture law

The model writes declarations and the tool proves them. Every rule below
exists to protect that.

- **A computing chase.** A chase holding an expression, a conditional or
  a loop is a bug. Conditionals live in `build.ts`.
- **A partial kind.** A feature kind without a generator, a non-empty
  check set, a fit class (or `none`) and a reference is a bug.
- **A prose result.** A check result missing measured, legal, constraint
  or origin is a bug.
- **A number without provenance.** A profile value without provenance, or
  a model writing to profile, is a bug. A person enters coupon results.
- **A hand-typed count.** A count or list another file determines, typed
  by hand instead of generated by `tools/counts.mjs`, is a bug.
- **A kernel touching the DOM.** A tier S to 2 file using `vue` or the
  DOM, or an import upward across `tools/tiers.json`, is a bug.
- **A switch on kind.** Registration outside `RegistryEntry<K>`, or a
  switch on kind outside its registry, is a bug.
- **A bench that needs a network.** A baked bench that cannot build from
  `file://`, or one that lacks `BENCH` per `BenchHook`, is a bug.
- **A hand-edited export.** A print card not regenerated with its
  geometry in the same change is a bug.
- **An ungated path.** A fabrication export that skips build, checks or
  host gate, or a metric with no gate and no informational label, is a bug.

## Safety posture

- Passive first. Nothing sends a print, fires a laser, heats a bed, cuts
  vinyl or flashes firmware without one confirm stating what the action
  does. One confirm, no lockouts. The user is trusted.
- Consequential capabilities arm per device, per session.
- Fabrication exports are gated by the host; no tool argument opens the
  gate. The CLI gate needs a TTY and has no bypass flag.

## Secrets

- Keys typed into a bench stay in that browser; say so by the field. Show
  only the first 4 and last 4 characters. Never log, echo or commit a key.
- Owner keys live only in function environment variables.

## Code conventions

- TypeScript strict, named exports only. Vue 3 SFCs with `<script setup
  lang="ts">`, typed props with `withDefaults`, typed emits.
- No DOM below tier 3. State lives in `bench-core`; Pinia setup stores only
  mirror shell state. localStorage keys start `hbf.`, inside try/catch.
- Every wasm object is freed by its owner scope; sweeps end at zero live.
- Comments state constraints the code cannot show. Never narrate the next
  line, never reference a previous version.

## Git conventions

- Do not commit or push unless asked. Stage the work and report.
- Subject imperative, lowercase, under 60 characters, no trailing
  punctuation, optional lowercase package scope, no type word:
  `mesh: freeze pinch healer after three flips`.
- Body only when needed, wrapped at 72: what failed, what changed, what
  was and was not verified, old and new numbers when a number moved.

## Verification

- Typecheck, `node tools/lint-voice.mjs` on staged files, and the tests
  the change touches pass before a commit.
- A change that moves a solid needs `uv run --project tools/py
  tools/py/validate_3mf.py --overlap` and the design sweep to pass on its
  export. Python runs through `--project tools/py`, never bare python3.
- A harness that did not run is reported as not run, never as a pass.
- Look at the bench in a real browser at desktop width and at 390 px.
  Counting classes headlessly is not looking.
- Render and look at every 3D deliverable. That step is a person.
