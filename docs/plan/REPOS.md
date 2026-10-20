# Repos

Version 4, 2026-10-04, local path and pointers updated 2026-10-05. Part of the hackbuild-fab
plan set; PLAN.md is the index.

This file holds every repository the plan touches, its verified state, its
role, and the procedures that create, check, split and release them. PLAN.md
section 4 states the decisions; this file is how a builder carries them out.
LICENSING.md holds the licence audit, TESTING.md the test levels behind each
CI job, MILESTONES.md the order of work.

Working names on first use: hbf (working name) is the binary with CLI, MCP
and HTTP transports; CHASE (working name) is the typed design document;
tools.hack.build (proposed) is a cookieless origin that does not exist. PIP
(was HAFT) is the published controller at hackbuild/pip-controller.

Repo paths are relative to the hackbuild-fab root, which is the local
repo `hackbuild-fab` with remote
`hackbuild/hackbuild-fab`. Before M-1 has run, `docs/plan/` resolves to
`fab-knowledge:plan/`, `spec/` to
`fab-knowledge:plan/spec/` and
`knowledge/` to
`fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/knowledge/`
(CLAUDE.md "Reading order", D-162). Evidence paths are absolute. Every state in this file was read on 2026-10-04 (local date,
America/Phoenix) with `gh repo list hackbuild --json
name,visibility,createdAt,pushedAt,isEmpty`, `gh repo view`, `gh api
repos/<repo>/pages`, `gh api repos/<repo>/branches/main/protection`, `dig
+short`, `curl -sI`, `npm view` and the PyPI JSON API, unless a row names
another source. verified-claims.md C7 recorded the same states earlier that
day.

Owner-status decisions carry their default in force; the builder uses the
default and keeps working (MILESTONES.md rule 15).

---

## 1. The boundary rule

A new repo needs a different release cadence, a different runtime, or a real
external audience (D-025). Everything else lives in hackbuild-fab, the
workshop. SKETCH and BLOCKS stay as apps in the workshop until an external
audience appears (D-143). A design that graduates gets its own repo on the
pip-controller layout (section 11, D-035).

| candidate | cadence | runtime | audience | where it lives |
|---|---|---|---|---|
| hackbuild-3mf | quiet once correct | Node and Python | slicer and tool authors | own repo from M00 exit (D-027) |
| hackbuild-inlay | quiet once correct | Node | art-to-print tools | own repo when D-028 trigger holds |
| hackbuild-copper | quiet once correct | Node | vinyl copper users | own repo when D-029 trigger holds |
| a graduated design | its own prints and firmware | browser plus device | makers of that thing | own repo on the pip-controller layout (D-035) |
| SKETCH, BLOCKS | workshop | browser | none outside yet | `apps/sketch`, `apps/blocks` (D-143) |
| every package in `packages/` | workshop | Node and browser | through `@hackbuild/kernel` only | hackbuild-fab (D-036) |

---

## 2. Repository state on 2026-10-04

### 2.1 Repos in the plan

| repo | owner | visibility | created (UTC) | state on 2026-10-04 | role in the plan | decision |
|---|---|---|---|---|---|---|
| hackbuild-fab | hackbuild | public | 2026-09-15T06:54:59Z | empty, no commits; `gh api repos/hackbuild/hackbuild-fab/pages` returns 404; branch protection waits for a first branch | the workshop: spec, packages, kernel, core, apps, designs, reference, knowledge, registry, docs | D-025, D-026 |
| hackbuild-3mf | hackbuild | public | 2026-09-15T06:55:16Z | empty | js and py 3MF writers, validator, conformance corpus; filled by subtree split at M00 exit | D-027 |
| hackbuild-inlay | hackbuild | public | 2026-09-15T06:58:43Z | empty | art to flush inlay bodies; filled when COLLAR and SPRUE build on `packages/inlay` and M03 parity passes | D-028 |
| hackbuild-copper | hackbuild | public | 2026-09-15T06:59:43Z | empty | vinyl copper routing and gates; filled when BLOCKS and KEYWAY build on `packages/copper` and M05 parity passes | D-029 |
| hackbuild-radio | hackbuild | public | 2026-08-06T20:15:59Z | empty; created 13 min 7 s before hackbuild-bench (verified-claims C7) | none; owner, default: archive the repo, no radio.hack.build, radio lives in hackbuild-bench | D-030 |
| pip-controller | hackbuild | public | 2026-09-19T01:13:02Z | one commit b137deb (2026-09-19T01:12:56Z UTC, 2026-09-18 local), MIT in `LICENSE` (GitHub `licenseInfo` reads MIT on 2026-10-04), CI jobs kernel, firmware, house rules; main unprotected; lineage: PIP is `haft (6).html` plus four changes, and `x/haft` (equal to `haft (9).html`) is a later sibling (evidence/x/downloads/dl-pip-latest/haft/, evidence/x/haft) | graduated-design template; source of PIP numbers; hackbuild-fab never edits it | D-013, D-035, D-080 |
| hackbuild-bench | hackbuild | public | 2026-08-06T20:29:06Z | 17 commits, 343fa2d to 2c66696 (last commit 2026-10-03T18:32:07-07:00, pushed 2026-10-04T01:32:14Z); Pages live at https://hackbuild.github.io/hackbuild-bench/ (HTTP 200, build_type workflow, cname null); `public/CNAME` reads `app.hack.build` but no DNS record exists; one workflow `deploy.yml`, no tests; MIT in package.json, no LICENSE file; the app.hack.build mockups of 2026-08-06 (evidence/x/downloads/dl-boards-tools/hackbuild/apphackbuild-mockup.html, apphackbuild-bench.html, bench-hackbuild.html) precede it | device bench with radio and CONDUYT; source of the driver contract, transports, capability vocabulary and sim twins that `link` extracts at M13 | D-031, D-093, D-094 |
| hackbuild-ui | hackbuild | public | 2026-08-06T20:22:28Z | 8 commits on GitHub, last 96d1bec (2026-08-06T22:57:50Z), the commit npm 0.2.0 was published from (`npm view @virgilvox/hackbuild-ui@0.2.0 gitHead`); the local clone holds one unpushed owner commit a88fcc8 (icons) that never enters an upstream PR; publishes `@virgilvox/hackbuild-ui` 0.1.0 and 0.2.0 on npm (`npm view ... versions`); GUIDELINES v1.2; 161 distinct `.hb-` classes in the 0.2.0 stylesheet (verified-claims C7); no workflows; MIT in package.json, no LICENSE file | the design system hackbuild-fab consumes at ^0.2.0 and grows upstream as package 0.3.0 with GUIDELINES v1.3 at M09 | D-116, D-117 |
| hackbuild-stack | hackbuild | public | 2025-12-15T04:04:37Z | 10 commits by a second contributor, last 374d30d (2025-12-12); pnpm 10.22, Turborepo, Next.js 16; CI `ci.yml` on Node 20; commits carry AI trailers (site-stack-resume.md section 2) | none; older stack, read for history only | none |
| hackbuild-beam | virgilvox | public | 2026-08-05T05:19:49Z | pushed 2026-08-05T23:21:46Z; Pages at https://virgilvox.github.io/hackbuild-beam/ (HTTP 200) | BEAM wire protocol, motion planner, browser SDK; owner, default: transfer into the hackbuild org before M13 | D-032 |
| hackbuild-resume | hackbuild | private | 2025-12-18T22:25:16Z | 15 commits, last 2edf8a4 (2026-09-05); serves live hack.build on Netlify (`server: Netlify`); no CI; four commits carry `Co-Authored-By` trailers (317ffb8, 43e639e, ad197fa, 568d8d8) | the current site; owner, default: guard forward only, no history rewrite | D-011, D-033 |
| hackbuild-site | hackbuild | none | none | does not exist; the 2026-08-20 site mockups define the zones a site would have (evidence/x/downloads/dl-boards-tools/hackbuild/hackbuild-site-v2.html) | owner, default: registry data stays in `hackbuild-fab/registry/`; a site later as a CommonPub thin app plus a static front page on hackbuild-ui | D-033 |

### 2.2 Other repos in the org

These have no role in the plan. They are listed so a builder does not
mistake one for a target.

| repo | visibility | created (UTC) | last push (UTC) | what it is |
|---|---|---|---|---|
| hack-build | private | 2026-01-28 | 2026-01-31 | Vue and Convex platform attempt (site-stack-resume.md section 4) |
| hack-build-vue | private | 2025-10-28 | 2025-10-28 | earlier Vue site (site-stack-resume.md section 5) |
| app-hack-build | public | 2017-08-24 | 2017-08-30 | 2017 repo, description "Idk"; unrelated to the app.hack.build name |
| ecodot-cuymc-hackathon | public | 2017-08-24 | 2017-09-01 | hackathon files |
| cerebro | private | 2017-09-07 | 2017-09-07 | 2017 project |

### 2.3 Owner actions on existing repos

| action | decision | default in force | command the owner runs |
|---|---|---|---|
| archive hackbuild-radio | D-030, owner | archive | `gh repo archive hackbuild/hackbuild-radio --yes` |
| transfer hackbuild-beam into the org | D-032, owner | transfer before M13 | `gh api -X POST repos/virgilvox/hackbuild-beam/transfer -f new_owner=hackbuild` |
| rewrite hackbuild-resume history | D-011, owner | none; guard forward only | none |
| add a LICENSE file to hackbuild-bench and hackbuild-ui | none | none; package.json says MIT | outside this plan; listed in RISKS.md R-10 context only |
| raise pip.ino KEY_WAIT_US from 200 to 3500 us | D-080, owner | hackbuild-fab does not edit pip-controller; the gap is recorded | the owner's own commit in pip-controller |

After a transfer, the Pages address of hackbuild-beam moves to the new
owner's Pages domain (https://hackbuild.github.io/hackbuild-beam/, inferred
from the bench's address pattern); GitHub redirects the repo URL, and
whether it redirects the old Pages URL is unknown. Any link to the old Pages
address in docs is updated in the same change.

---

## 3. What goes where in hackbuild-fab

The tree is D-026. The milestone column says when the folder first holds
files.

| path | holds | first filled | decision |
|---|---|---|---|
| `RULES.md` | house rules; wins over every other document | M-1-T01 | D-003 |
| `CLAUDE.md` | builder brief, first line `@RULES.md` | M-1-T01 | D-003 |
| `AGENTS.md` | three lines: title, `See CLAUDE.md.`, `@CLAUDE.md` | M-1-T01 | D-003 |
| `README.md` | repo README with the verified block | M-1 skeleton, verified block grows per milestone | D-008 |
| `llms.txt` | generated agent index, under 20 KB | M12 | D-010, D-112 |
| `spec/` | `@hackbuild/spec`, private, zero runtime dependencies | M-1-T06 | D-046 |
| `packages/<name>/` | the 24 private workspace packages of D-044, each with `seed/` until ported | M-1-T12 skeletons, T07 seeds | D-036, D-044 |
| `kernel/` | `@hackbuild/kernel`, the one package that may publish | M-1-T12 skeleton | D-036 |
| `core/` | hbf (working name): CLI, then MCP and HTTP transports | M00 | D-114 |
| `apps/fab`, `apps/sketch`, `apps/blocks` | browser apps | M12 (fab); sketch and blocks when ported | D-143 |
| `designs/<id>/` | chase.ts, build.ts, README.md, `legacy/` with a lineage README; `legacy/` may hold several revision subfolders, each with its own SHA256SUMS and origin path (davit r3 and r4, detent revC and revD, baffle r2 and r3, tang r5 and r6) | M10 | D-142 |
| `reference/<area>/<id>/` | worked minimal designs with `expected/` goldens and `covers` | M00 first entries | D-105 |
| `knowledge/` | knowledge records, `knowledge/references/` from the seed | M-1-T07, T13 | D-162 |
| `registry/` | `tools.json` (59 tools as of 2026-10-04), later `names.json` | M-1-T13 | D-033, D-158 |
| `docs/` | Diataxis tree; `docs/plan/` holds this plan set | M-1-T13 | D-162 |
| `evals/` | Inspect tasks | M12 | D-155 |
| `tools/` | lint-voice, counts, tiers, lint-commits, lint-authors, determinism scripts, `tools/corpus/3mf/`, `tools/test/` | M-1 | D-004, D-010, D-044 |
| `tools/py/` | uv project: validate_3mf.py, orca3mf.py, islands.py, reparse scripts; numpy declared | M-1-T07 | D-140 |
| `.githooks/` | commit-msg, pre-commit | M-1-T02, T03 | D-002 |
| `.claude/` | settings.json; path-scoped `rules/` from M12 | M-1-T04 | D-002, D-112 |
| `.github/` | workflows, pull request template | M-1-T05 | D-002, D-154 |
| `.changeset/` | changesets config with `commit: false` | M-1-T01 | D-036 |
| `.hbf/` | content-addressed store; gitignored | M00 | D-050 |

Where a new file goes:

| new thing | goes in | not in |
|---|---|---|
| code for one kernel | `packages/<name>/src/` | `tools/`, `core/` |
| a port of legacy bench code | `packages/<name>/src/`, with the source kept in `packages/<name>/seed/` until parity passes | `designs/*/legacy/` (that folder holds byte-identical legacy files only) |
| a Python script | `tools/py/` | anywhere else (D-140) |
| a 3MF fixture | `tools/corpus/3mf/` with a manifest row | `test/` folders |
| a check | its CheckDef in `packages/checks`, its reference in `reference/` in the same milestone | a seed file only |
| a plan change | `docs/plan/` in hackbuild-fab | `fab-knowledge/plan/`, frozen after M-1 (D-162) |
| a count | generated by `tools/counts.mjs` | typed by hand (D-010) |

Read on demand from the knowledge base, never copied into the repo:

| path | holds | read when |
|---|---|---|
| `fab-knowledge:HANDOFF.md` | session entry point, environment, milestone status table, owner queue | at the start of every session; update the status row when a card starts, exits or blocks |
| `fab-knowledge:originals/` | the sample set: the owner's original designs, `INDEX.md`, `MECHANISMS.md` (each mechanism to its canonical original) and a `RECORD.md` per design saying how it was made | a task builds that kind of design, mechanism, bench or export; make it the way the canonical original was made |
| `fab-knowledge:mockups/` | NOT A SAMPLE SET: fourteen generated mockups, quarantined | never; nothing is used, cited or copied from it |
| `fab-knowledge:synthesis/gold-standard.md` | rules G-01 to G-57 from the six gold benches; section 11 checklist, section 9 budgets | a task touches a bench, bake or export; M09 and M10 exits grade against it (D-212, D-213) |

---

## 4. Package names and registries

Only names a decision names publish. Every workspace package is
`"private": true` (D-036).

| name | registry | publishes from | when | lookup on 2026-10-04 | decision |
|---|---|---|---|---|---|
| `@hackbuild/kernel` | npm | `hackbuild-fab/kernel/` | after D-037 clears; version at first publish unknown (MILESTONES.md 1.4) | `npm view @hackbuild/kernel` returned E404; a scope search for `scope:hackbuild` returned 0 packages | D-036, D-037 |
| npm org `hackbuild` | npm | owner account | before any `@hackbuild/*` publish | whether the org exists or can be created is unknown; npmjs.com returned 403 to an unauthenticated request | D-037, owner |
| `hackbuild-3mf` | npm | `hackbuild-3mf/js/` | M00 exit, 0.1.0 | `npm view hackbuild-3mf` returned E404 | D-027, D-037 |
| `hackbuild_3mf` | PyPI | `hackbuild-3mf/py/` | M00 exit, 0.1.0 | `https://pypi.org/pypi/hackbuild_3mf/json` returned HTTP 404 | D-027, D-037 |
| `hackbuild-inlay` | npm | hackbuild-inlay | when D-028 holds | not looked up | D-028 |
| `hackbuild-copper` | npm | hackbuild-copper | when D-029 holds | not looked up | D-029 |
| `@virgilvox/hackbuild-ui` | npm | hackbuild-ui | owner publishes 0.3.0 after the M09 upstream PR | 0.1.0 and 0.2.0 published | D-116, D-117 (owner, default: keep the name) |
| `@hackbuild/spec` and the 24 packages | none | none | never | not applicable | D-036 |

A 404 means no package holds the name on that date. It does not reserve the
name. M00-T15 step 1 repeats the three lookups and writes the result with
its date into this table.

| name | M00-T15 lookup on 2026-10-05 (local; 2026-10-06T00:55Z UTC) | result |
|---|---|---|
| `hackbuild-3mf` | `npm view hackbuild-3mf` returned `npm error code E404` | free on that date |
| `@hackbuild/kernel` | `npm view @hackbuild/kernel` returned `npm error code E404`; `npm search --json scope:hackbuild` returned `[]` | free on that date; the org still unverified |
| `hackbuild_3mf` | `curl -s -o /dev/null -w '%{http_code}' https://pypi.org/pypi/hackbuild_3mf/json` printed `404` | free on that date |

---

## 5. Bootstrap hackbuild-fab

### 5.1 First time, on the empty repo (M-1-T01)

Implementation starts in a new local repo. The GitHub repo is empty, so
`git init` with the remote added gives the same state as the clone in
M-1-T01 step 1 without reading the network. Nothing is fetched, committed
or pushed until the owner asks (D-006).

```sh
source ~/.nvm/nvm.sh && nvm use 22.18.0
test -e hackbuild-fab && echo "exists, stop and report"
mkdir hackbuild-fab
cd hackbuild-fab
git init -b main                 # init.defaultBranch is unset on this machine
git remote add origin https://github.com/hackbuild/hackbuild-fab.git
git symbolic-ref HEAD            # refs/heads/main
# copy RULES.md, CLAUDE.md, AGENTS.md from fab-knowledge/plan byte for byte
# write package.json, .npmrc, .gitignore, .changeset/config.json, tsconfig files (M-1-T01)
node --version            # must satisfy ^22.18.0 || >=24.11.0 (D-039)
npm install               # once, to create package-lock.json
npm run prepare           # ignore-scripts=true skips lifecycle scripts, so run it by name
git config core.hooksPath # prints .githooks
```

The root `package.json` carries `"prepare": "git config core.hooksPath
.githooks && node tools/allowed-scripts.mjs"`. With `ignore-scripts=true`
in `.npmrc`, npm skips every lifecycle script during install, the root
`prepare` and `postinstall` included, so bootstrap and every later clone run
`npm run prepare` by name; an explicit `npm run` still runs the named
script. `tools/allowed-scripts.mjs` runs `npm rebuild <name>` for each entry
of `tools/allowed-scripts.json`. The exact root
`package.json` is in milestones/M-1-housekeeping.md card M-1-T01.

### 5.2 Every later clone

```sh
gh repo clone hackbuild/hackbuild-fab
cd hackbuild-fab
npm ci
npm run prepare                       # hook path and allowed install scripts
uv sync --project tools/py            # Python half (D-140)
npm run check
```

`npm run check` runs lint-voice, typecheck, tests, tiers and the derived
check, in that order, and exits non-zero on the first failure. Package
manager is npm workspaces with a committed `package-lock.json`, exact pins
and `npm ci` in CI (D-038, owner, default in force; pnpm 12.9.1 with catalogs
is the alternative). Node floor is `^22.18.0 || >=24.11.0` (D-039); `.npmrc`
sets `engine-strict=true` and `save-exact=true`.

### 5.3 Checks before the first commit is proposed

| command | expected |
|---|---|
| `npm ci` | exit 0 on Node 22.18.0 |
| `git config core.hooksPath` | `.githooks` |
| `node --test tools/test/commit-msg.test.mjs` | 13 pass, 0 fail |
| `node tools/lint-voice.mjs` | exit 0 |
| `npx -y -p typescript@7.0.2 tsc -p spec/tsconfig.json` | exit 0 |
| `npm run check` | exit 0 |

---

## 6. First commits

Commits and pushes happen only when the owner asks (D-006). Until then the
builder stages work and reports. Subjects follow the D-005 default (owner,
default in force): imperative, lowercase, under 60 characters, no trailing
punctuation, optional lowercase package scope, no type word. Bodies wrap at
72 and say what failed, what changed, and what was and was not verified,
with old and new numbers when a number moved. No trailer of any kind
(D-001).

The order below is the commit split of milestones/M-1-housekeeping.md Exit.
It covers the nine groups of the REPOS brief. The CI workflow lands last so
that every job it names has its files when the first push runs it; a CI
commit placed fifth would run jobs whose scripts do not exist yet and fail.

| order | subject | brief group | cards |
|---|---|---|---|
| 1 | `add the rules files and the workspace root` | rules and agents files | M-1-T01 |
| 2 | `reject ai credit and dashes in commit messages` | commit-msg hook and test | M-1-T02 |
| 3 | `add lint-voice and the pre-commit hook` | lint-voice | M-1-T03 |
| 4 | `set claude attribution to empty strings` | claude settings | M-1-T04 |
| 5 | `spec: add the typed contracts` | spec | M-1-T06 |
| 6 | `add the tier table and package skeletons` | counts and tiers | M-1-T12 |
| 7 | `import the seeds with a conformance test` | seeds and conformance | M-1-T07 |
| 8 | `3mf: harvest the 127 key template from the gold save` | seeds and conformance | M-1-T08 |
| 9 | `mesh: freeze pinch healer after three flips` | seeds and conformance | M-1-T09 |
| 10 | `board: prove lead landings and fix the face sign` | seeds and conformance | M-1-T10 |
| 11 | `add the plan docs, knowledge and registry` | plan docs | M-1-T13 |
| 12 | `generate counts and fail ci on drift` | counts and tiers | M-1-T11 |
| 13 | `add the ci workflow` | ci workflow | M-1-T05 |

Each subject was checked against the M-1-T02 hook rules: all are under 60
characters, start lowercase and end without punctuation. The first push
creates `main` on the empty repo; branch protection (section 9) is set after
that push, because GitHub protects an existing branch only.

The first PR body, or the first push report when there is no PR, lists the
working names as unconfirmed (D-012) and every owner-status decision M-1
used with its default.

---

## 7. Settings files

### 7.1 `.claude/settings.json`

Exact content (M-1-T04):

```json
{
  "attribution": { "commit": "", "pr": "" },
  "permissions": {
    "ask": ["mcp__hbf__export_run"],
    "deny": ["Bash(git commit*--trailer*)"]
  }
}
```

The empty attribution strings stop Claude Code from adding its own commit
and PR lines (D-002). Any harness or workflow reminder that asks for a
Co-Authored-By line is overridden by RULES.md and is rejected by the hook
and by CI either way. `ask` makes the host ask before the fabrication export
tool runs (D-109). No MCP output limit goes here; the 25,000-token default is
a host setting the server never relies on (D-110). `tools/test/settings.test.mjs`
asserts the file deep-equals the object above.

### 7.2 `.githooks/`

Installed by `npm run prepare` through `core.hooksPath` (D-002).

| hook | runs | rejects |
|---|---|---|
| `commit-msg` | on every commit; CI runs it again per commit in the pushed range through `tools/lint-commits.mjs` | any `<word>-by:` or `<word>-with:` trailer, indented or not; `co-authored`, `generated with`, `generated by` (space or hyphen), `noreply@anthropic`, `ai-generated`; an AI tool name and a credit word (wrote, written, generated, assisted, authored, drafted, made with, created with, help, helped, thanks, courtesy of, powered by) as whole words in either order within one sentence; a credit key (Author, Co-author, Credit, Assistant, Writer, Thanks, singular or plural) whose value names an AI tool; U+2012 to U+2015, U+2212, U+1F000 and up, U+2600 to U+27BF, U+FE0F; an empty subject; a subject of 60 characters or more; a subject starting uppercase (message: starts with a capital, start it lowercase); `!` in the subject; a subject ending in `. , ; :`; anything `node tools/lint-voice.mjs --stdin --kind commit` rejects once that file exists |
| `pre-commit` | on every commit | anything `node tools/lint-voice.mjs --staged` blocks |

The exact `commit-msg` text and its 26-message test are in
milestones/M-1-housekeeping.md card M-1-T02. `pre-commit` is:

```sh
#!/bin/sh
# house rules for staged files: RULES.md Language
exec node tools/lint-voice.mjs --staged
```

Uppercase inside a subject stays legal so ids such as `CHK-3MF-06` and
`PIP` can appear. A subject such as `update claude.md reading order` passes,
because the patterns match credit phrases, not product names.

### 7.3 Other root settings

| file | content | decision |
|---|---|---|
| `.npmrc` | `engine-strict=true`, `save-exact=true`, `ignore-scripts=true`; a dependency that needs its install script is listed in `tools/allowed-scripts.json` and run through `npm rebuild <name>` by `npm run prepare` (the list is empty at M-1) | D-038, D-039, supply-chain hardening (pending decision) |
| `.changeset/config.json` | `"commit": false`, `"access": "public"`, `"baseBranch": "main"`, `"privatePackages": {"version": false, "tag": false}` (api-library-ai-design.md 14.2) | D-036 |
| `.gitignore` | `node_modules/`, `.hbf/`, `dist/`, `*.tsbuildinfo`, `__pycache__/`, `.venv/`, `.DS_Store` | D-050 |
| `.github/pull_request_template.md` | a "What is verified, and what is not" block with four lists, owner-status decisions used with defaults, and the required checkbox `- [ ] I looked at the renders` for any PR that changes a meshHash | D-008, D-154 |

`changesets` with `commit: false` writes no commits of its own, so the
owner's commit form applies and no generated line appears.

---

## 8. CI workflows per repo

Job names below are the check names GitHub shows and branch protection
requires. TESTING.md defines what each level tests; this table says what
each job fails on.

### 8.1 hackbuild-fab

One workflow file `.github/workflows/ci.yml` on push and pull_request,
`ubuntu-24.04`, Node 22.18.0, `npm ci`. A job enters the file in the
milestone that creates what it runs. Every `uses:` pins a full 40-character
commit sha with the tag in a trailing comment (`actions/checkout@<sha> # v4`);
`house-rules` fails on any `uses:` ref that is not a 40-hex sha (M-1-T05).

| job | added | runs | fails on | decision |
|---|---|---|---|---|
| `house-rules` | M-1 | hook and lint tests, `tools/lint-voice.mjs`, `tools/lint-commits.mjs`, `tools/lint-authors.mjs` | banned characters, words and hex values; a commit in the range that the commit-msg hook rejects; an author or committer naming an AI tool; a package.json author other than `Moheeb Zara <hackbuildvideo@gmail.com>`; AI credit in contributors, maintainers, a CHANGELOG, or 3MF Designer, DesignerUserId, Copyright, Description or Origin metadata | D-001, D-002, D-004 |
| `build` | R1 (merged the M-1 `typecheck`, `derived`, `tiers`, `seed` and the M00 `property`, `contract`, M03-T11 `vtracer-eval` jobs) | one install, then named steps in order: `derived:` (`node tools/counts.mjs`, `npx tsc -b`, every generator, then `git status --porcelain` before any other step), `typecheck:` (pins-exact, `npx tsc -p tools/tsconfig.json`, `npx tsc -p tsconfig.tests.json` at TypeScript 7.0.2), `tiers:` (`node tools/tiers.mjs`), `contract:` (level 3), `seed:` (seed conformance, healer and board seed tests, filament template check with uv), `property:` (level 2), `vtracer-eval:`; each step after the first runs while the install succeeded | any diff after regeneration; any type error; an import edge not in `tools/tiers.json` or `document.`, `window.` or `vue` under `src/` in tiers S to 2; a seed row failing zod conformance, a healer or lead-landing regression, template drift from the gold save; any level 2 or 3 failure | D-010, D-044, D-045, D-046, D-066, D-152 |
| `unit` | M00 | level 1 | any failure | D-152 |
| `parity` | M00 | levels 4 and 5 on every reference | build, report, edit or artifact hash differs from `expected/`; JSON goldens change only through `hbf parity --accept` in a PR, section renders only through their named writer (D-227) | D-152, D-227 |
| `corpus` | M00-T10 | `uv run --project tools/py tools/corpus/3mf/run.py` | a corpus row outside its expectation, or Python and TypeScript validators disagreeing | D-052, D-068, D-069 |
| `determinism` and `determinism-compare` | M00-T14 | matrix on `ubuntu-24.04`, `ubuntu-24.04-arm` and `macos-14` with `SOURCE_DATE_EPOCH=1791072000`, plus Playwright WebKit and Chromium legs (D-175); compare job diffs the hash files | any meshHash or artifactHash differs across arch or engine; a writer that does not reproduce its own bytes | D-052, D-056 |
| `designs` | M10 | level 6, the five tests, for each changed design | any of cases, sweep, liveness, smoke, islands; a harness that did not run is reported as not run | D-152, D-153 |
| `browser` | M09 | level 8 with @playwright/test 1.63.0 | BenchHook conformance, smoke, overflow at 390, 768, 1280 px, more than one focal pink per view, console errors, a CSP violation | D-125, D-128 |
| `bake` | M09-T13 | `npm run bake:all` (tools/bake) over every design and reference with a `bake.json`; then the `ui-css:` step (`node tools/bake/check-ui-css.mjs`) and the `size:` step over every baked bench, both merged here at R1 | a bake error, a missing CSP meta, an asset the manifest does not name; the installed or inlined hackbuild-ui stylesheet hash differs from `tools/bake/ui-css.lock.json` (D-116); a bench over 16 MB or with any network fetch at load | D-116, D-129 |
| `bake-determinism` | M09-T13 | two cold bakes on a clean checkout | unequal sha256 for any baked file | D-129 |
| `visual` | the milestone that ships `view.render` | level 9: before and after renders attached to the PR | never fails; the PR checkbox is the gate | D-154 |
| `firmware` | the milestone that ships the first firmware emitter (MILESTONES.md names none) | arduino-cli with rp2040 core 6.1.0, `--warnings all` | any `warning:` line | D-078 |
| `publint`, `attw` | first `@hackbuild/kernel` pack | `kernel/` packed | export map errors | D-036 |

Scheduled work outside the push workflow: a nightly slicer round-trip
harness, agent evals (D-155) and a monthly `supply-chain` job run on a
schedule and never block a merge; TESTING.md 15.2 holds their definitions.

Supply chain, in one place:

| control | what it does | where |
|---|---|---|
| committed `package-lock.json`, `npm ci`, `save-exact=true` | every install resolves the same tree | section 5, 7.3 (D-038) |
| `npm publish --provenance` | published packages carry a build attestation | sections 10.3, 13.1 |
| `supply-chain` job, monthly and before a release | `npm audit --omit=dev --audit-level=high`, `npm audit signatures` and `osv-scanner` over the lockfile; one issue per high or critical advisory | TESTING.md 15.2 |
| pins re-verified and re-dated at each milestone exit | registry lookup, licence compared with `tools/licences.json`, open `supply-chain` issues read; a moved pin reruns `determinism` and `parity` | MILESTONES.md rule 10, D-040 |
| meta Content-Security-Policy in every baked file | forbids `eval`, network and Workers in the page; link pages add only declared origins to `connect-src` | UI.md 14.5, smoke in TESTING.md 2.5 |

### 8.2 hackbuild-3mf (after the M00 split)

| job | runs | fails on |
|---|---|---|
| `js` | `npm ci --prefix js && npm test --prefix js` | any failure |
| `py` | `uv run --project py pytest` | any failure |
| `corpus` | the corpus runner over `corpus/manifest.json` with both validators | a row outside expectation, or a js and py verdict disagreeing |
| `bytes` | each writer twice under one `SOURCE_DATE_EPOCH`, at `TZ=UTC` and `TZ=America/Phoenix` | unequal sha256 for one writer; unequal artifactHash between writers (D-052) |
| `house-rules` | lint-voice, lint-commits and lint-authors copied from hackbuild-fab `tools/` with their tests | the same rules as hackbuild-fab |

Release workflow in section 10.3.

### 8.3 hackbuild-inlay and hackbuild-copper (after extraction)

The same five-job shape as hackbuild-3mf, with `py` and `bytes` dropped
where the package has no Python half, and `parity` added running the
extracted references (COLLAR and SPRUE for inlay; BLOCKS and KEYWAY for
copper).

### 8.4 Repos this plan does not change

| repo | workflow on 2026-10-04 | what it fails on | plan action |
|---|---|---|---|
| pip-controller | `ci.yml`: `kernel` (Node 22, `npm test`, then a grep for `FAIL` or `THROW` because the harnesses print and exit 0), `compile <sketch>` matrix over pip, pip_probe, pip_stick (rp2040 core 6.1.0, any `warning:`), `house rules` (dashes and emoji in `*.md`, the old name at word start in tracked text, paths, and `print/*.3mf` and `print/*.zip` members) | as listed | none; fab never edits it (D-013) |
| hackbuild-bench | `deploy.yml`: Node 22, `npm ci`, typecheck, build, Pages deploy | typecheck or build errors | none |
| hackbuild-ui | none | nothing | the M09 upstream PR may propose CI; the owner merges (D-116) |
| hackbuild-stack | `ci.yml`: Node 20, pnpm, sherif, typecheck, lint | as listed | none |

---

## 9. Branch protection

No repo in the org had branch protection on 2026-10-04
(`gh api repos/hackbuild/<repo>/branches/main/protection` returned 404
"Branch not protected" for pip-controller, hackbuild-bench, hackbuild-ui).
Branch protection is an owner action. No decision in DECISIONS.md fixes its
settings; the defaults below are this file's proposal, listed in the first
PR body.

Default settings for hackbuild-fab `main`, applied after the first push:

```sh
cat > /tmp/protection.json <<'JSON'
{
  "required_status_checks": {
    "strict": false,
    "contexts": ["house-rules", "typecheck", "derived", "tiers", "seed"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": null,
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON
gh api -X PUT repos/hackbuild/hackbuild-fab/branches/main/protection --input /tmp/protection.json
```

`enforce_admins: false` keeps the owner's own direct push possible, since
the owner is the only maintainer (RISKS.md R-20). Required reviews stay off
for the same reason; the visual review gate is the PR checkbox (D-154).

Required checks grow by milestone. Each exit adds its jobs with the same
command and a longer `contexts` list.

| from | contexts added | decision |
|---|---|---|
| M-1 | `house-rules`, `typecheck`, `derived`, `tiers`, `seed` | D-002, D-010, D-044, D-066 |
| M00 | `unit`, `property`, `contract`, `parity`, `corpus`, `determinism-compare` | D-052, D-056, D-152 |
| M09 | `browser`, `size`, `bake`, `bake-determinism`, `ui-css` | D-116, D-125, D-128, D-129 |
| M10 | `designs` | D-152 |

A matrix job reports one context per leg (`determinism (ubuntu-24.04)`);
the single `determinism-compare` job is the one to require. `visual` is
never required, because it never fails.

hackbuild-3mf `main` gets the same JSON with contexts `js`, `py`, `corpus`,
`bytes`, `house-rules` after its first push.

---

## 10. hackbuild-3mf extraction

### 10.1 Preconditions

| condition | source |
|---|---|
| M00-T07 to M00-T12 green on CI | milestones/M00-foundation.md |
| `packages/3mf/README.md` carries the verified block | D-008 |
| corpus runner green with both validators | M00-T10 |
| `bytes` and `determinism-compare` green | D-052, D-056 |
| lint-voice and lint-authors clean over `packages/3mf`, `tools/py`, `tools/corpus/3mf` | D-001, D-004 |
| the owner asked for the split and the push | D-006 |

### 10.2 Procedure

`git subtree split` carries the history of `packages/3mf` only. The Python
half (`tools/py`) and the corpus (`tools/corpus/3mf`) also hold files that
are not 3MF code (islands.py, reparse scripts, board helpers), so they are
copied, with the source commit recorded, and keep their history in
hackbuild-fab.

```sh
# in hackbuild-fab
git subtree split --prefix packages/3mf -b split/hackbuild-3mf
SRC=$(git rev-parse HEAD)

# in a sibling folder
gh repo clone hackbuild/hackbuild-3mf
cd hackbuild-3mf
git log -1 2>/dev/null && echo "not empty, stop and report"
git symbolic-ref HEAD refs/heads/main
git pull ../hackbuild-fab split/hackbuild-3mf
mkdir js && git mv $(git ls-files | sed 's#/.*##' | sort -u | grep -vx js) js/
mkdir -p py/hackbuild_3mf corpus
cp ../hackbuild-fab/tools/py/validate_3mf.py ../hackbuild-fab/tools/py/orca3mf.py \
   ../hackbuild-fab/tools/py/harvest_filament_keys.py py/hackbuild_3mf/
cp -R ../hackbuild-fab/tools/corpus/3mf/. corpus/
```

Then, by hand:

1. `js/package.json`: remove `"private": true`; name `hackbuild-3mf`;
   version `0.1.0`; author `Moheeb Zara <hackbuildvideo@gmail.com>`;
   license MIT; `exports` pointing at `dist/`; `files` limited to `dist`;
   no dependency on any `@hackbuild/*` package (the split must stand
   alone; the Part IR adapter stays in hackbuild-fab).
2. `py/pyproject.toml`: name `hackbuild_3mf`, version `0.1.0`, the same
   author, license MIT, numpy declared (D-140), console entry points
   `validate-3mf`, `orca3mf`, `harvest-filament-keys`.
3. `corpus/manifest.json` paths rewritten relative to `corpus/`; each
   row keeps its sha256 and its absolute `source`.
4. Root files: `README.md` (what it writes, the dialect of D-159, the
   verified block), `LICENSE` (MIT, "Copyright (c) 2026 Moheeb Zara"),
   `CHANGELOG.md`, `RULES.md` and `CLAUDE.md` copied from hackbuild-fab,
   `AGENTS.md`, `.githooks/` and `.claude/settings.json` copied,
   `tools/` holding lint-voice, lint-commits, lint-authors and their tests.
5. `.github/workflows/ci.yml` with the jobs of section 8.2 and
   `.github/workflows/release.yml` of section 10.3.
6. One commit per step on the owner's request, subjects in the D-005
   default form, for example `move the writer under js` and `add the python
   package and corpus`. The bodies name `SRC`, the hackbuild-fab commit the
   copies came from.

Layout after the split:

```
hackbuild-3mf/
  README.md LICENSE CHANGELOG.md RULES.md CLAUDE.md AGENTS.md
  js/        npm package hackbuild-3mf: writer, template, validator mirror
  py/        PyPI package hackbuild_3mf: validate_3mf, orca3mf, harvest
  corpus/    manifest.json, gold/, known-bad/, boss/, owner/ (owner/roundtrip/, owner/downloads/),
             sprue/, legacy/ (legacy/cotter/), reports/
  tools/     lint-voice, lint-commits, lint-authors and tests
  .githooks/ .claude/ .github/
```

### 10.3 One tag, two registries

`release.yml` runs on a tag `v*`, after `ci.yml` is green on that commit:

| step | command | notes |
|---|---|---|
| 1 | check the tag equals `js/package.json` version and `py/pyproject.toml` version | fail on mismatch |
| 2 | `npm ci --prefix js && npm run build --prefix js && npm test --prefix js && npm audit signatures --prefix js` | |
| 3 | `uv build --project py` | wheel and sdist into `py/dist/` |
| 4 | `npm install -g npm@<pinned 11.x, at least 11.5.1>` then `npm publish --provenance --access public` in `js/` through npm trusted publishing (OIDC, `id-token: write`) | Node 22.18.0 ships npm 10, which lacks trusted publishing; the owner does the first publish by hand after D-037 clears and then registers `release.yml` as the trusted publisher on npmjs.com; no NPM_TOKEN secret exists in any repo |
| 5 | publish `py/dist/` to PyPI with `pypa/gh-action-pypi-publish` and a trusted publisher | the owner registers the trusted publisher on pypi.org |
| 6 | GitHub release for the tag with the CHANGELOG section as body | the body passes lint-voice and carries no attribution line (D-001) |

Nothing publishes before D-037 clears (owner, default: the owner creates the
npm org first and nothing publishes until then). The unscoped npm name and
the PyPI name do not need the org; M00 still waits for the owner's
credentials. Until they exist, M00 exits with the split branch and both
workflows ready, and its exit row reads "publish pending D-037".

### 10.4 Back in hackbuild-fab after publish

1. `packages/3mf` depends on `hackbuild-3mf` at `0.1.0` exactly and keeps
   only the fab glue: ExporterDef registration, `Metadata/hackbuild_chase.json`,
   CHK-3MF-04 on Part IR, the Part IR adapter.
2. `tools/py/pyproject.toml` pins `hackbuild_3mf==0.1.0`;
   `tools/py/validate_3mf.py` becomes a thin entry point so every
   acceptance path in the milestone files stays valid.
3. The local Python copies are deleted only after the corpus passes on the
   published version (D-140).
4. `npm view hackbuild-3mf version` prints `0.1.0`; the PyPI JSON reports
   `0.1.0`; the hackbuild-fab `corpus` job passes against the published
   package.

### 10.5 hackbuild-inlay and hackbuild-copper

Each milestone exit checks its trigger (M03 for inlay, D-028: COLLAR and
SPRUE both build on `packages/inlay` and M03 parity passes; M05 for copper,
D-029: BLOCKS and KEYWAY both build on `packages/copper` and M05 parity
passes). When the trigger holds, the extraction follows 10.1 to 10.4 with
`--prefix packages/inlay` or `--prefix packages/copper`, the matching
references copied into the new repo's `reference/`, and no `py/` half. When
it does not hold, the exit records why (MILESTONES.md rule 13).
Every evaluation, held or failed, is a row in extractions.md with its date
and commit; `node tools/extract-check.mjs inlay` and `copper` print the
trigger and the import closure.

---

## 11. Graduated-design template

A design that graduates gets its own repo on the layout of
hackbuild/pip-controller at b137deb (D-035). Evidence:
`fab-knowledge:evidence/x/pip-controller/`.
Creating the repo is the owner's action (`gh repo create hackbuild/<slug>
--public`); the slug follows the uniqueness gate of D-015 and D-158.

| path | role | PIP instance |
|---|---|---|
| `<slug>.html` | the built single-file bench, committed so it opens from disk | `pip.html`, 1,924,558 bytes |
| `src/` | headless kernel | `src/snapfe.js`, `geom.js`, `layout.js`, `router.js`, `model.js`, `pkg.js`, `coupon.js` |
| `bench/` | shell, state, exports, the BENCH hook | `bench/part1.html`, `part2.js`, `part3.js` |
| `build.sh`, `tools/` | bake (D-129) | `build.sh`, `tools/build_bench.py` |
| `vendor/` | wasm and classic-script dependencies | `vendor/manifold-classic.js` |
| `test/` | the five tests: cases, sweep, liveness, smoke, islands (D-152) | node and python harnesses |
| `docs/` | one file per task | `bench.md`, `switches.md`, `electrical.md`, `printing.md`, `assembly.md` |
| `firmware/` plus flash and monitor scripts | device code where the design has one | `firmware/pip`, `pip_stick`, `pip_probe`; `flash`, `mon`, `keys` |
| `examples/` | design JSON (later chase.ts) | `pip-design.json`, `pip-stick-design.json` |
| `print/` | reference exports with sha256 | `pip.3mf`, `pip-stick.3mf`, `pip-stl.zip`, `pip-coupon.zip`, `pip-wiring.svg`, `print-card.txt` |
| `LESSONS.md` | what generalises beyond the design | yes |
| `CLAUDE.md` | house rules, attribution first | yes |
| `README.md` | the shape below, with the verified block (D-008) | yes |
| `LICENSE` | MIT for code; printable designs CC BY-SA 4.0 and boards CERN-OHL-W-2.0 per D-041 and LICENSING.md | MIT only |
| `.editorconfig`, `package.json`, `package-lock.json` | author `Moheeb Zara <hackbuildvideo@gmail.com>` | yes |

README order, from PIP: name and one physical paragraph; the fact the design
bends around; start here (numbered steps, coupon first); the table of the
design's parts or keys; build and flash; tooling; "What is verified, and
what is not" with four lists (verified on this machine with a date, measured
on a printed body, checked by machine on geometry, not verified by
anything); repo map; licence line.

CI jobs, three as in PIP, with two changes the plan requires:

| job | from PIP | change |
|---|---|---|
| `kernel` | `npm test`, then a grep for `FAIL` or `THROW` | harnesses assert and exit non-zero; the grep goes away (D-153) |
| `firmware` | arduino-cli, pinned core, `--warnings all`, fails on `warning:` | none |
| `house-rules` | dash and emoji greps over `*.md`, old-name scans | lint-voice over every scanned extension, lint-commits and lint-authors from hackbuild-fab `tools/` (D-004); an old-name scan only when the design was renamed |

hackbuild-fab keeps the design's chase.ts and build.ts in `designs/<id>/`
until it graduates; the graduated repo's `examples/` and `print/` are then
produced by hackbuild-fab's bake and export commands, and the registry row
gains `repo` and `built_url` (D-158).

---

## 12. Domains and hosting

DNS for hack.build is served by NS1 (`dig +short NS hack.build` returns
`dns1.p08.nsone.net` to `dns4.p08.nsone.net`). Every DNS change is the
owner's (D-034).

| name | DNS on 2026-10-04 | serves | default in force | decision |
|---|---|---|---|---|
| hack.build | A records at Netlify's load balancer (13.52.188.95, 52.52.192.191 from one resolver on 2026-10-04; addresses vary by resolver); HTTP 200, `server: Netlify` | private hackbuild-resume | unchanged until a site repo exists | D-033, owner |
| www.hack.build | A records at Netlify's load balancer (13.52.188.95, 52.52.192.191 from one resolver on 2026-10-04; addresses vary by resolver) | Netlify | unchanged | D-033, owner |
| hackbuild.github.io/hackbuild-bench | GitHub Pages, HTTP 200 | hackbuild-bench | the address docs cite for the device bench | D-031, owner |
| app.hack.build | no record; Pages cname null | nothing; `public/CNAME` in hackbuild-bench names it | docs never cite it; adding it is the owner's DNS change | D-031, owner |
| radio.hack.build | no record | nothing | dropped; radio lives in hackbuild-bench | D-030, owner |
| virgilvox.github.io/hackbuild-beam | GitHub Pages, HTTP 200 | hackbuild-beam | moves with the D-032 transfer | D-032, owner |
| beam.hack.build | no record | nothing | no decision proposes it | none |
| fab.hack.build, sketch.hack.build, blocks.hack.build | no record | nothing | proposals only; fab.hack.build is named in hackbuild-fab-plan.md of 2026-09-10 (evidence/x/downloads/dl-boards-tools/fab/hackbuild-fab-plan.md); `fab.hack.build/docs` is the proposed docs address (DOCS.md) | D-034, owner |
| tools.hack.build (proposed) | no record | nothing | cookieless origin for baked benches as `tools.hack.build/<slug>/<sha>.html` | D-034, owner |
| hackbuild.github.io/hackbuild-fab | Pages not enabled; repo empty | nothing yet | baked benches publish here and as GitHub release assets until a cookieless origin exists (address inferred from the bench pattern) | D-034, owner |

Baked benches never run on the signed-in `.hack.build` cookie origin,
because a bench script there could read the session (D-034).

Owner-gated DNS changes, with the record each needs:

| change | record at NS1 | GitHub side | decision |
|---|---|---|---|
| app.hack.build for the bench | `CNAME app.hack.build hackbuild.github.io` | set the custom domain in hackbuild-bench Pages settings; with build_type workflow the `public/CNAME` file in the artifact does not set it (inferred from the Pages API reporting cname null while the file exists) | D-031 |
| tools.hack.build for baked benches | `CNAME tools.hack.build hackbuild.github.io` or another cookieless host | Pages custom domain on the repo that serves the benches | D-034 |
| fab, sketch, blocks .hack.build | owner choice | owner choice | D-034 |

Until the owner makes a change, docs, READMEs and llms.txt cite
`https://hackbuild.github.io/hackbuild-bench/` for the device bench and the
GitHub release assets for baked benches.

---

## 13. Release steps

### 13.1 hackbuild-fab

A milestone row whose "release at exit" column in MILESTONES.md names a
release runs these steps in CI on a tag, after the owner asks
(MILESTONES.md rule 12):

| step | what | decision |
|---|---|---|
| 1 | all required checks green on the tagged commit, `determinism-compare` included | D-056, D-157 |
| 2 | `npx changeset version`; a person reads the changelog diff; it passes lint-voice and carries no attribution line | D-001, D-036 |
| 3 | publish only what a decision names: `@hackbuild/kernel` from `kernel/` with `npm publish --provenance` once D-037 clears, after `publint` and `attw` pass on the pack | D-036, D-037 |
| 4 | bake every design and reference; attach each single file and its sha256 to the GitHub release; deploy the same files to hackbuild-fab Pages | D-034, D-129 |
| 5 | regenerate llms.txt, the skill and docs; the `derived` job confirms a clean tree | D-010, D-112 |
| 6 | re-verify and re-date the D-040 pin table at the milestone exit (MILESTONES.md rule 10), with the `supply-chain` job run on the tagged commit | D-040 |

Releases by milestone, from MILESTONES.md 1.1:

| milestone | release |
|---|---|
| M00 | hackbuild-3mf 0.1.0 on npm and PyPI from one tag, after D-037 (section 10) |
| M03 | hackbuild-inlay extraction check (D-028) |
| M05 | hackbuild-copper extraction check (D-029) |
| M09 | hackbuild-ui 0.3.0 with GUIDELINES v1.3 as an upstream PR the owner merges and publishes (D-116); baked benches as release assets (D-034) |
| M10 | baked benches for the six designs as release assets (D-034) |
| M12 | MCP tool names frozen at kernel 1.0 (D-113); `@hackbuild/kernel` publish waits for D-037 |
| M13 | BEAM work lands in the transferred repo after D-032 |
| M16 | registry data stays in `registry/` until a site repo exists (D-033) |

### 13.2 hackbuild-ui upstream (M09)

The builder opens a pull request on hackbuild/hackbuild-ui, branched from
origin/main 96d1bec (never from the local a88fcc8, which is unpushed owner
work), with the bench layer (HbSteps, HbGuide, HbStageOverlay, HbMaterials, HbWelcome, HbParamRow
and their `.hb-` classes) and the tokens of D-118, bumping the package to
0.3.0 and GUIDELINES to v1.3 (D-116). The owner merges and runs `npm
publish` from that repo. hackbuild-fab then pins `@virgilvox/hackbuild-ui`
0.3.0 and the CI check of the baked CSS hash moves to the new pin. The
package keeps its name (D-117, owner, default: keep
`@virgilvox/hackbuild-ui`).

### 13.3 Versions

| artifact | scheme | source |
|---|---|---|
| `@hackbuild/kernel` | semver, 0.x until spec 1.0 | changesets in hackbuild-fab |
| `hackbuild-3mf`, `hackbuild_3mf` | semver, one version for both, one tag `vX.Y.Z` | `js/package.json` and `py/pyproject.toml` in hackbuild-3mf |
| workspace packages | 0.0.0, private, never versioned | D-036 |
| baked benches | content hash in the file name and the release asset list | D-129 |

### 13.4 Later: the voice linter as a shared package

The ban list now lives in four places: hackbuild-bench, hackbuild-ui,
pip-controller and hackbuild-fab
(`fab-knowledge:synthesis/aesthetic-voice-ux-bible.md`
section 16). Once `tools/lint-voice.mjs` has run unchanged through one
milestone exit after M09, it can move into a small package consumed by
hackbuild-ui, hackbuild-bench and pip-controller, each CI job calling the
package instead of a copy. Owner decision, no decision id yet; default:
keep the copy in hackbuild-fab `tools/` and copy it into hackbuild-3mf at
the M00 split as section 10 says. Any change to pip-controller is the
owner's (CLAUDE.md, What not to do).

---

## 14. Owner items in this file

| id | question | default in force | what an answer changes here |
|---|---|---|---|
| D-005 | commit subject form | imperative, lowercase, under 60 characters, optional package scope, no type word | the subjects in section 6 and the hook rules in 7.2 |
| D-011 | rewrite hackbuild-resume history | guard forward only | none in fab |
| D-030 | hackbuild-radio | archive the empty repo | section 2.3 command |
| D-031 | device bench address | cite hackbuild.github.io/hackbuild-bench | section 12 rows and the DNS record |
| D-032 | hackbuild-beam ownership | transfer into the org before M13 | section 2.3 command; M13 lands there |
| D-033 | site and registry home | registry in `hackbuild-fab/registry/`; site later | registry location in section 3 |
| D-034 | domains and bench hosting | release assets and hackbuild-fab Pages; never the cookie origin | section 12 and step 4 of 13.1 |
| D-037 | npm org and names | owner creates the npm org first; nothing publishes until then | sections 4, 10.3, 13.1 |
| D-038 | package manager | npm workspaces, committed lockfile, `npm ci` | section 5 commands |
| D-094 | rtl-sdr driver | stays in hackbuild-bench | what `link` may extract at M13 |
| D-117 | design system package name | keep `@virgilvox/hackbuild-ui` | section 13.2 pin |
| none | shared voice linter package (section 13.4) | copies per repo; hackbuild-fab `tools/lint-voice.mjs` is the source | where hackbuild-ui, hackbuild-bench and pip-controller get their ban list |
| none | branch protection settings | section 9 JSON, applied after the first push | section 9 |
| none | how work reaches `main` after M-1 | pull requests from a work branch so required checks run; the owner's direct push stays possible | section 9 |

Decisions carried by this file: D-001, D-002, D-003, D-004, D-005, D-006,
D-008, D-010, D-011, D-012, D-013, D-015, D-025, D-026, D-027, D-028, D-029, D-030,
D-031, D-032, D-033, D-034, D-035, D-036, D-037, D-038, D-039, D-040,
D-041, D-052, D-056, D-080, D-093, D-094, D-109, D-110, D-116, D-117,
D-129, D-140, D-143, D-152, D-153, D-154, D-157, D-158, D-162.
