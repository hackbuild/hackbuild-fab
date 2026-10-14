# Contributing

Contributions come in under the licence of the path they touch, read from
the path map in `tools/licences.json` (inbound equals outbound, GitHub Terms
of Service section D.6). There is no CLA and no DCO sign-off.

| rule | what it means |
|---|---|
| authors | people only. The git author of every commit is a person. No AI assistant, model or AI tool is an author, co-author, contributor or credit anywhere: messages, trailers, file headers, CHANGELOG, package.json, exported file metadata (D-001). |
| trailers | none of any kind. No Signed-off-by, Co-Authored-By, Reviewed-by or generated-with lines. The commit-msg hook rejects every `<word>-by:` and `<word>-with:` line, people's included, and CI repeats the check (not yet run) (D-002). |
| outside PRs | a maintainer squashes the PR and rewrites the message so it passes the hook. Your git author line is kept; that line is the credit. |
| commit subjects | imperative, lowercase, under 60 characters, no trailing punctuation, optional lowercase package scope: `mesh: freeze pinch healer after three flips` (D-005 default). |
| licence | your change is offered under the licence of each path it touches. Code is MIT and emitter templates are MIT-0. Printable designs are CC BY-SA 4.0, boards CERN-OHL-W-2.0, knowledge and coupons CC BY 4.0, and docs and READMEs CC BY 4.0 with code samples also MIT (D-185, D-042, D-170); `tools/licences.json` maps every path. |
| coupons | a community coupon result follows the intake record and review path of D-169 and enters the profile at tier community. Only a person enters a coupon result. |
| marks | a contribution grants no right to the hack.build name or logo (TRADEMARKS.md, D-171). |
| voice | prose, comments, UI copy and messages follow RULES.md Language; `node tools/lint-voice.mjs` checks staged files. |

Prerequisites: Node 22.18.0 (`.nvmrc`), git, and uv for the Python tools
(`uv run --project tools/py`).

After `npm ci`, run `npx tsc -b` once from the repo root before you
use `npx --no-install hbf`: the bin runs the compiled `core/dist`, which is
gitignored, and a fresh clone has none.

Before you open a PR, run the tests your change touches, one workspace at a
time: `npm test -w packages/mesh`. `npm run check` runs every gate and the
full suite and takes minutes; run it before a PR when you can. A harness that
did not run is reported as not run.
