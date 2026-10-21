---
name: hbf
description: Draft, adopt, check and slice printed parts with the hbf engine in a hackbuild-fab workspace, and prepare their kit for a person to export. Use it when someone asks for a multicolour 3MF, a flush inlay coin, tag or face, a flex, click or touch key, a thumbstick, a board seat, a printed or vinyl-cut copper circuit, a mechanism or case, a bench page, a print card or a virtual slice, or names hbf, a chase or a bench. It absorbs the print-forge, board-forge, datasheet-forge and hardware-diagrams skills.
---

# hbf

hbf turns a declaration into a checked part. You write the declaration (a chase),
hbf builds it, runs its checks and returns evidence, and a person approves every
fabrication export. Work inside the hackbuild-fab workspace; the plugin's MCP server
runs `hbf mcp` there.

## When to use it

- A person wants a printed thing: a key, stick or slider, a coin or tag with art,
  a case or mechanism, a seat for a board, a copper circuit.
- A person wants a bench page for a design, a virtual slice, a print card, or the
  checks on a design they already have.
- A person asks what hbf can do, or which design or mechanism fits a goal.

## Read capabilities first

Before you plan, run `hbf capabilities` (or `hbf capabilities --json`, or
`hbf capabilities --function <name>`). It lists, by function (make a key, read a
pin, seat a board, make a mechanism or case, make a coin, tag or face, draft and
build a design, check, slice, export, find parts and knowledge), the commands,
archetypes, references, designs and knowledge files that serve it, with computed
counts. A group with a note names what is missing; say so to the person rather
than working around it.

`hbf explain <check id, error code or hbf:// uri>` explains any id a result names.

## Draft, then adopt

1. `hbf draft <goal>` (or `hbf draft <goal> --from <bench>`) writes one offline
   bench in one turn. Checks show as warnings and every export carries the DRAFT
   banner. Put it in front of the person early.
2. The person drives the bench and says what is wrong. Their words, slicer saves
   and caliper numbers are evidence: `hbf evidence add`.
3. `hbf adopt <draft>` lifts the draft into a chase and build.ts and runs every
   check, the routing, the virtual slice and the bake. Only an adopted design
   exports without the DRAFT banner.

Laws while you work:

- A chase declares. Expressions, conditionals and loops live in build.ts, never
  in chase.ts. `hbf chase.validate` says when a chase breaks this.
- Every physical number comes from profile with provenance. Never type one into
  a kernel, never raise a profile tier, never enter a coupon result. A person
  enters coupon results.
- Every number you report says measured, computed, vendor, inferred or unknown.
  A simulated or sliced result is computed, never measured.
- Port from the original a design record names; do not invent a mechanism the
  knowledge already holds.

## The export gate

Every fabrication export passes build, checks and the host gate, in that order.
The gate is person only. A standing authorization from the owner covers building,
never exporting.

- The plugin's PreToolUse hook asks a person before every `export_run` call.
  Do not try to route around it, and do not ask the person to turn it off.
- On the command line `hbf export.run` needs a terminal and has no bypass flag.
  Without one it stops and names the line a person runs. Hand that line over.
- Never read `.hbf/gate.key` or `.hbf/http.token`.

## Refusals

Refuse these, say which category applies, and offer nothing that gets around it
(USE.md in the workspace is the policy):

- weapon or firearm parts, including receivers, frames and magazines;
- suppressors and silencers, or parts sold as solvent traps for that use;
- parts made to injure a person or an animal;
- restraints meant to hold a person against their will;
- traps meant to catch or harm a person or an animal;
- marks the person does not own: logos, wordmarks and brand art on an inlay, a
  relief or any other part, unless they hold the mark or a licence for it.

A safety-critical part (a load on a person, a medical part, a vehicle part, a part
on or near mains electrics) exports as unproven until a person enters a coupon
result. Say "computed, not tested" and mean it.

## Where to read

`references/INDEX.md` lists every reference this skill carries, with its title and
line count. Read the one the task needs, not all of them.

| task | read |
|---|---|
| what hbf can do, by function | `hbf capabilities` |
| multicolour 3MF that opens with every part on its filament | `references/print-forge/3mf-dialect.md` |
| art on faces, inlays, slot numbers, hygiene passes | `references/print-forge/art-engine.md` |
| the single file bench page pattern | `references/print-forge/bench-ui.md` |
| which geometry route to take | `references/print-forge/kernels.md` |
| prior benches to model a request on | `references/print-forge/lineage.md` |
| the printer and the rules it imposes | `references/print-forge/print-reality.md` |
| what green means before an export | `references/print-forge/validation.md` |
| boards, copper, sensor surfaces, datasheets, doc figures | `references/archive/INDEX.md`, built from the owner archive where it is on disk |
| designs and their mechanisms | `knowledge/designs/INDEX.md` and `knowledge/designs/MECHANISMS.md` in the workspace |

The print-forge references name `scripts/<x>` files from the skill they came from.
In the workspace those scripts live under `tools/py/` and `packages/`; run Python
through `uv run --project tools/py`, never bare python3.

When `references/archive/` is absent, the board-forge, datasheet-forge and
hardware-diagrams text is not on this machine. Say so, and use
`hbf capabilities --function read` and `hbf capabilities --function seat` for the
commands that do the work.
