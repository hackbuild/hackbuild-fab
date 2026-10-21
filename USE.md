# Use policy

This policy covers the tools, the benches, the canon of designs, the agent
skill and every file they export. The open licences in this repository
grant the code and the designs; this policy states what the project will
not help make and what it never claims about a part. PLAN.md section 5 and
boundaries.md section 4 in the owner's plan set are its source.

## What you may not make

The skill refuses these categories, the canon carries no design in them,
and no plugin for them is accepted.

- Weapon or firearm parts, including receivers, frames and magazines.
- Suppressors and silencers, or parts sold as solvent traps for that use.
- Parts made to injure a person or an animal.
- Restraints meant to hold a person against their will.
- Traps meant to catch or harm a person or an animal.
- Marks you do not own: logos, wordmarks and brand art on an inlay, a relief
  or any other part, unless you hold the mark or a licence for it. See
  TRADEMARKS.md.

No technical filter stops a determined person (inferred). These rules
state what the project will not take part in.

## Safety-critical parts

A safety-critical part is one that carries a load on a person, a medical
part, a vehicle part, or a part on or near mains electrics.

- Every number the tool shows is computed, vendor or inferred until a
  person prints a coupon and enters the measured result. Simulated and
  sliced results are computed, never measured.
- A safety-critical part exports as unproven until a person enters a coupon
  result for the material and printer it was made on. The print card and
  the gate say "computed, not tested".
- An agent never enters a coupon result and never raises a profile tier.

## The export gate

- Every fabrication export passes build, checks and the host gate, in that
  order. The gate is person only: a TTY prompt in node, a confirm in the
  page.
- A standing authorization given to an agent covers building, never
  exporting. No tool argument, script or agent token opens the gate.
- `.claude/settings.json` asks before `export.run` and denies reads of the
  gate key. SECURITY.md describes the gate key.

## API keys

A key typed into a bench stays in that browser's memory for the session.
It never goes into the store, a share link, an export or provenance. The
page shows only its first 4 and last 4 characters.

## Provenance

Every export's provenance is to record the design hash, the hash of each
plugin that ran, the versions of partner tools, the bodies whose numbers
are inferred, the art source of any inlay, and whether an agent or a person
proposed the export. Release 1 adds these fields to every exporter; until
an exporter writes a field, its provenance lacks that field and holds no
guess in its place.

## No warranty

The software and the designs come with no warranty of any kind, as the
licences state. The project makes no claim that a part is fit for a
safety-critical use. You decide, test and carry the risk of what you
print, cut and use.

## Reporting misuse

Report a canon entry, a plugin or a reference that breaks this policy
through the issue tracker on hackbuild/hackbuild-fab. Report a security
fault through the path in SECURITY.md.
