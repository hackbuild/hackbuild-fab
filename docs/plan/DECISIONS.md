# Decisions

Version 4, 2026-10-04. Part of the hackbuild-fab plan set; PLAN.md is the index.

This file is the decision log for hackbuild-fab. Entries D-001 to D-164 carry the id, title, status and decision text of the architect record, `fab-knowledge:plan/_architect.md` section 2, under the same group headings. PLAN.md sections end with a `Decides:` line that cites these ids. Where this file and another plan document disagree on a decision, this file wins; where this file and `fab-knowledge:synthesis/verified-claims.md` disagree on a fact, verified-claims.md wins and the disagreement goes under Gaps found while writing.

Names follow the plan set conventions: hbf (working name) is the binary, CHASE (working name) the typed design document, STYLUS (working name, was FEELER) the printed sensor design, tools.hack.build (proposed) the cookieless bench origin, and PIP (was HAFT) the published print-in-place controller, hackbuild/pip-controller.

After M-1 this file lives at `docs/plan/DECISIONS.md` in hackbuild-fab and the copy in fab-knowledge/plan/ is frozen (D-162).

## Status

| status | meaning | what the builder does |
|---|---|---|
| decided | settled by evidence or by the architect record | acts on the decision text as written |
| owner | only the owner can settle it | uses the default in the decision text, keeps working, and lists the question in the PR body (CLAUDE.md, Owner decisions) |
| superseded | a later entry names this one in its Supersedes row | follows the later entry |

As of 2026-10-08 the log holds 238 entries: 182 decided, 48 owner, 8 superseded. D-176 was never issued. D-165 to D-211 were added after the architect record from named reviews: D-165 from a cold-start review of arch.apply; D-166 to D-169 from a completeness review of the plan set (security, permanent addresses, distribution and community); D-170 to D-172 from a review of LICENSING.md section 7 gaps L-01, L-02 and L-08 (then numbered G-01, G-02, G-08); D-173 to D-179 from expert reviews of 2026-10-04; D-180 to D-190 from the plan audit and the Downloads readers of 2026-10-04 (`fab-knowledge:sources/downloads/README.md`); D-191 to D-211 from the cross-file followups of that audit (`fab-knowledge:audit/AUDIT.md`); D-212 to D-221 from the gold standard of 2026-10-05 (`fab-knowledge:synthesis/gold-standard.md`); D-222 and D-223 from owner instructions of 2026-10-05; D-224 to D-226 from the implementation audit of 2026-10-05; D-227 from the implementation audit of 2026-10-06; D-228 from the M01-T06 build of 2026-10-06; D-229 from the M01-T07 build of 2026-10-06; D-230 from the skills and design downloads reader of 2026-10-06 (`fab-knowledge:sources/downloads/skills-2026-10-06.md`); D-231 to D-233 from the M02 build of 2026-10-07 (`.hbf-notes/m02-report.md`); D-234 to D-238 from the virtual exit B of 2026-10-07, D-234 on an owner instruction of that day (`fab-knowledge:evidence/virtual-print/VIRTUAL-EXIT-B.md`); D-239 from the plan-drift audit of 2026-10-08 (`fab-knowledge:evidence/audit2/plan-drift/`). From M-1 onward tools/counts.mjs generates these counts (D-010).

## Rules for this log

- Entries are append-only after M-1. Nobody edits an entry's text, status or rows in place.
- A change is a new entry with the next free id. Its Supersedes row names the entry it replaces by id. The replaced entry then counts as superseded; the index below shows its status as `superseded by D-###`, and its body stays as written.
- An owner answer is recorded the same way: a new decided entry that supersedes the owner entry and quotes the answer with its date.
- A new entry carries all six rows. Evidence paths are absolute. A number in a new entry carries a qualifier (measured, computed, vendor, inferred, unknown) per D-007.
- Before M-1 lands, a change to an entry's Status or Decision is a new entry with the next free id, sourced from verified-claims.md, the architect record or a named review with its date. A Rationale, Evidence or Supersedes row may be corrected in place before M-1 when the corrected row names its source. The architect record is frozen from 2026-10-04; where it and this file differ, this file wins.

## How to read an entry

| row | content |
|---|---|
| Status | decided or owner, as in the architect record |
| Decision | the architect decision text, unchanged; for an owner entry it states the default in force |
| Rationale | the architect rationale where the record gives one inline, otherwise the rationale of the same entry in the architect decision log data |
| Evidence | absolute paths to the files that support the decision, with section, line or row notes |
| Supersedes | the v3 PLAN.md section or open decision, the handoff file, and the plan-deltas rulings (R##) and owner items (D#) the entry replaces or settles; `new` when nothing earlier covered it |
| Milestone | where the builder first acts on it (M-1, M00 to M16), or `none` when no milestone waits on it |

Path roots used in Evidence rows:

| root | absolute path |
|---|---|
| v3 plan, handoff | `fab-knowledge:evidence/x/plan-to-refine` |
| PIP (was HAFT) clone | `fab-knowledge:evidence/x/pip-controller` |
| other scratch clones (knuckle, tenon, toggle, cotter-src) | `fab-knowledge:evidence/x` |
| knowledge base | `fab-knowledge` |
| harvested corpus | `fab-work-directory` |
| owner repos | `hackbuild` |

Section 22 of v3 PLAN.md is the list of 20 open decisions; "v3 open decision N" refers to it. "plan-deltas R##" and "plan-deltas D#" refer to rulings and owner items in `fab-knowledge:synthesis/plan-deltas.md`.

## Index

| id | title | status | group |
|---|---|---|---|
| D-001 | Rule zero: no AI attribution | decided | House rules and process |
| D-002 | Enforcement of rule zero | decided | House rules and process |
| D-003 | Rules file layout | decided | House rules and process |
| D-004 | lint-voice | decided | House rules and process |
| D-005 | Commit subject convention | owner | House rules and process |
| D-006 | Commit and push only when asked | decided | House rules and process |
| D-007 | Number qualifiers | decided | House rules and process |
| D-008 | Verified block | decided | House rules and process |
| D-009 | Secrets | decided | House rules and process |
| D-010 | Derived counts and lists | decided | House rules and process |
| D-011 | Old AI trailers in hackbuild-resume | owner | House rules and process |
| D-012 | Working names | owner | Names |
| D-013 | PIP is canonical | decided | Names |
| D-014 | Canon package names | decided | Names |
| D-015 | Colliding slugs | superseded by D-189 | Names |
| D-016 | detent kind and DETENT machine | owner | Names |
| D-017 | Feature kind spelling | decided | Names |
| D-018 | Scope | decided | Scope, claim and position |
| D-019 | Shop scope | owner | Scope, claim and position |
| D-020 | Novelty claim | decided | Scope, claim and position |
| D-021 | Related work and citation fixes | decided | Scope, claim and position |
| D-022 | Unverified claims leave the plan | decided | Scope, claim and position |
| D-023 | Positioning | decided | Scope, claim and position |
| D-024 | Kernel and BRep | decided | Scope, claim and position |
| D-025 | Repo boundary rule | decided | Repos, packaging, toolchain, licensing |
| D-026 | Workshop layout | decided | Repos, packaging, toolchain, licensing |
| D-027 | hackbuild-3mf extraction | decided | Repos, packaging, toolchain, licensing |
| D-028 | hackbuild-inlay trigger | decided | Repos, packaging, toolchain, licensing |
| D-029 | hackbuild-copper trigger | decided | Repos, packaging, toolchain, licensing |
| D-030 | hackbuild-radio | owner | Repos, packaging, toolchain, licensing |
| D-031 | Device bench address | owner | Repos, packaging, toolchain, licensing |
| D-032 | hackbuild-beam | owner | Repos, packaging, toolchain, licensing |
| D-033 | Site and registry home | owner | Repos, packaging, toolchain, licensing |
| D-034 | Domains and bench hosting | owner | Repos, packaging, toolchain, licensing |
| D-035 | Graduated design template | decided | Repos, packaging, toolchain, licensing |
| D-036 | One published package | decided | Repos, packaging, toolchain, licensing |
| D-037 | npm scope and names | owner, refined by D-211 | Repos, packaging, toolchain, licensing |
| D-038 | Package manager | owner | Repos, packaging, toolchain, licensing |
| D-039 | Node floor | decided | Repos, packaging, toolchain, licensing |
| D-040 | Toolchain pins (dated 2026-10-04) | superseded by D-181 | Repos, packaging, toolchain, licensing |
| D-041 | Licences for code, designs, boards | decided, refined by D-185, D-195 | Repos, packaging, toolchain, licensing |
| D-042 | Failure corpus licence | decided, owner, 2026-10-13 | Repos, packaging, toolchain, licensing |
| D-043 | Copyleft exclusion | decided | Repos, packaging, toolchain, licensing |
| D-044 | Tiers and imports | decided | Architecture |
| D-045 | Headless kernels | decided | Architecture |
| D-046 | Spec package | decided | Architecture |
| D-047 | Build pipeline and stage order | decided, refined by D-206 | Architecture |
| D-048 | Multi-body parts | decided | Architecture |
| D-049 | Metrics and warnings in Part IR | decided | Architecture |
| D-050 | Addressing | decided | Architecture |
| D-051 | Hash definitions | decided, refined by D-206, D-243 | Architecture |
| D-052 | 3MF bytes and hashes | decided | Architecture |
| D-053 | Mesh routes | decided | Architecture |
| D-054 | Vertex snap | decided, refined by D-208 | Architecture |
| D-055 | wasm ownership | decided | Architecture |
| D-056 | Determinism CI | decided | Architecture |
| D-057 | One KernelId union | decided | Architecture |
| D-058 | Three-part contract by type | decided | Feature kinds |
| D-059 | Eight admitted kinds | decided, refined by D-177 | Feature kinds |
| D-060 | Backlog kinds | decided | Feature kinds |
| D-061 | Board feature namespace | decided | Feature kinds |
| D-062 | Sealed pockets | decided, refined by D-200 | Feature kinds |
| D-063 | Pose, mirrorOnFlip, stack | decided | Feature kinds |
| D-064 | Error contract | superseded by D-182 | Constraints and checks |
| D-065 | Check targets | decided, refined by D-191 | Constraints and checks |
| D-066 | Seed conformance before M00 | decided | Constraints and checks |
| D-067 | Severity mapping | decided | Constraints and checks |
| D-068 | CHK-3MF-06 rewritten | decided | Constraints and checks |
| D-069 | CHK-3MF-07 rewritten | decided | Constraints and checks |
| D-070 | CHK-3MF-04 split | decided | Constraints and checks |
| D-071 | Click-spring rise window (CHK-KEY-04) | superseded by D-229 | Constraints and checks |
| D-072 | Resistance budgets set floors | decided | Constraints and checks |
| D-073 | Strain limits by bend direction | decided, refined by D-191 | Constraints and checks |
| D-074 | Expected-violation sets and capture assertions | decided | Constraints and checks |
| D-075 | Ungated metrics | decided | Constraints and checks |
| D-076 | Per-MCU pin table | decided | Electrical |
| D-077 | BLOCKS verdict scope | decided | Electrical |
| D-078 | Read models on port | superseded by D-183 | Electrical |
| D-079 | PIP timing figures | decided | Electrical |
| D-080 | pip.ino KEY_WAIT_US 200 | owner | Electrical |
| D-081 | Resistivity rows and the working default | decided, refined by D-180 | Electrical |
| D-082 | Physical measurements | owner | Electrical |
| D-083 | Provenance tier ladder | owner | Electrical |
| D-084 | Bleed | decided | Electrical |
| D-085 | Buried stack defaults | decided | Electrical |
| D-086 | Circuit engine | decided | Electrical |
| D-087 | BLOCKS canonical standard | owner | Electrical |
| D-088 | SuperMini dual-supply jumper default | owner | Electrical |
| D-089 | Board backends | decided | Electrical |
| D-090 | KiCad files | decided | Electrical |
| D-091 | Circuit JSON interop | decided | Electrical |
| D-092 | Copper router | decided | Electrical |
| D-093 | link and device safety | decided | Electrical |
| D-094 | rtl-sdr GPL driver | owner | Electrical |
| D-095 | Two canon registries with typed definitions | decided | Canons, reference, profile, catalog |
| D-096 | Canon corrections | decided, refined by D-202 | Canons, reference, profile, catalog |
| D-097 | Canon content in M06 | decided, refined by D-203 | Canons, reference, profile, catalog |
| D-098 | Archetype resistances at load | decided, refined by D-203 | Canons, reference, profile, catalog |
| D-099 | Provenance fields | decided | Canons, reference, profile, catalog |
| D-100 | Fits and loss | decided, refined by D-207 | Canons, reference, profile, catalog |
| D-101 | Machines | decided | Canons, reference, profile, catalog |
| D-102 | Catalog gate | decided | Canons, reference, profile, catalog |
| D-103 | Catalog storage | decided | Canons, reference, profile, catalog |
| D-104 | Actuator rows | decided | Canons, reference, profile, catalog |
| D-105 | Reference library rules | decided | Canons, reference, profile, catalog |
| D-106 | CLI commands | decided | Agent surface |
| D-107 | MCP tools | decided, refined by D-193 | Agent surface |
| D-108 | MCP stack | decided | Agent surface |
| D-109 | Export gate | decided, refined by D-206, D-219, D-243 | Agent surface |
| D-110 | Output size | decided | Agent surface |
| D-111 | Loop detection | decided | Agent surface |
| D-112 | Agent docs | decided | Agent surface |
| D-113 | Name freeze after eval | decided | Agent surface |
| D-114 | Agentic first | decided | Agent surface |
| D-115 | Writes on a branch | decided | Agent surface |
| D-116 | Design system dependency | decided, owner, 2026-10-13 | UI |
| D-117 | Design system package name | owner | UI |
| D-118 | Tokens | decided | UI |
| D-119 | Header verbs | owner | UI |
| D-120 | Shell family | owner | UI |
| D-121 | Tagline face | owner | UI |
| D-122 | Graph rule | owner | UI |
| D-123 | State | decided | UI |
| D-124 | Notes | decided, refined by D-216 | UI |
| D-125 | UX law changes | decided, refined by D-212, D-215, D-218 | UI |
| D-126 | Six kinds fixed | decided, refined by D-217 | UI |
| D-127 | three.js | decided | UI |
| D-128 | BenchHook frozen | decided, refined by D-214 | UI |
| D-129 | Bake | decided | UI |
| D-130 | No extra UI libraries | decided | UI |
| D-131 | Chase format | decided, refined by D-206 | CHASE |
| D-132 | Chase fields | decided, refined by D-216 | CHASE |
| D-133 | chase.validate output | decided | CHASE |
| D-134 | Rapier | decided | Sim, motion, nest, inlay, tools |
| D-135 | Calibration masks and DAVIT target | decided, refined by D-188 | Sim, motion, nest, inlay, tools |
| D-136 | SLUG trial runner | decided, refined by D-232 | Sim, motion, nest, inlay, tools |
| D-137 | nest | decided | Sim, motion, nest, inlay, tools |
| D-138 | DXF writer | decided | Sim, motion, nest, inlay, tools |
| D-139 | Motion and kinematics | decided | Sim, motion, nest, inlay, tools |
| D-140 | Python's role | decided | Sim, motion, nest, inlay, tools |
| D-141 | TypeScript in packages | decided | Sim, motion, nest, inlay, tools |
| D-142 | Designs location | decided | Sim, motion, nest, inlay, tools |
| D-143 | SKETCH and BLOCKS | decided | Sim, motion, nest, inlay, tools |
| D-144 | SKETCH solver | owner | Sim, motion, nest, inlay, tools |
| D-145 | inlay pipeline | decided | Sim, motion, nest, inlay, tools |
| D-146 | OpenSCAD route | decided | Sim, motion, nest, inlay, tools |
| D-147 | Brand packs | owner | Sim, motion, nest, inlay, tools |
| D-148 | OGEE R16-P bill | superseded by D-186 | Sim, motion, nest, inlay, tools |
| D-149 | Missing sources | superseded by D-180 | Sim, motion, nest, inlay, tools |
| D-150 | 97-key 3MFs in Flash Studio | superseded by D-187 | Sim, motion, nest, inlay, tools |
| D-151 | Teen and class kits | owner | Sim, motion, nest, inlay, tools |
| D-152 | Testing pyramid | decided, refined by D-212, D-227, D-228 | Testing, docs, milestones, registry |
| D-153 | Harness exits | decided | Testing, docs, milestones, registry |
| D-154 | Visual review gate | decided | Testing, docs, milestones, registry |
| D-155 | Agent evals | decided | Testing, docs, milestones, registry |
| D-156 | Upstreaming and lineage | decided | Testing, docs, milestones, registry |
| D-157 | Milestone structure | decided | Testing, docs, milestones, registry |
| D-158 | Registry fields and the BENCH union | decided | Testing, docs, milestones, registry |
| D-159 | 3MF dialect | decided | Testing, docs, milestones, registry |
| D-160 | Interop at the edges | decided | Testing, docs, milestones, registry |
| D-161 | Fab capability vocabulary | decided | Testing, docs, milestones, registry |
| D-162 | Plan document set location | decided, refined by D-192 | Testing, docs, milestones, registry |
| D-163 | geom on CrossSection | decided | Testing, docs, milestones, registry |
| D-164 | STYLUS as one design | decided | Testing, docs, milestones, registry |
| D-165 | Archetype apply on a PartDraft and the applied merge | decided | Testing, docs, milestones, registry |
| D-166 | Untrusted input limits | decided, refined by D-240 | Testing, docs, milestones, registry |
| D-167 | Permanent addresses and versioned share links | decided | Testing, docs, milestones, registry |
| D-168 | Distribution channels | owner, refined by D-190 | Testing, docs, milestones, registry |
| D-169 | Community coupon intake | decided | Testing, docs, milestones, registry |
| D-170 | Docs licence | decided, owner, 2026-10-13 | Licensing additions |
| D-171 | Marks reserved outside the open grant | owner | Licensing additions |
| D-172 | MIT-0 for emitter templates | owner | Licensing additions |
| D-173 | Checks selected by the registry; waivers declared | decided | Constraints and checks |
| D-174 | Chase and bench split | decided | CHASE |
| D-175 | meshHash keeps winding on the snap grid | decided | Architecture |
| D-176 | not issued | none | none |
| D-177 | Feature union by admission; four v3 kinds move out | decided | Feature kinds |
| D-178 | Chase read as data; build.ts in a sandbox | decided, refined by D-206 | CHASE |
| D-179 | Walking skeleton before M00; spec draft until first run | decided | Testing, docs, milestones, registry |
| D-180 | Missing sources recovered | decided | Sim, motion, nest, inlay, tools |
| D-181 | Toolchain pins add @types/node 22.20.5 | decided | Repos, packaging, toolchain, licensing |
| D-182 | Error transport rows | decided | Constraints and checks |
| D-183 | Read model on Chase.hookup | decided | Electrical |
| D-184 | HTTP Origin and Host validation; returned text is data | decided | Agent surface |
| D-185 | Licences for designs and boards wait on the owner | decided, owner, 2026-10-13 | Repos, packaging, toolchain, licensing |
| D-186 | OGEE R16-P bill settled | decided | Sim, motion, nest, inlay, tools |
| D-187 | 97-key 3MFs open in Flash Studio | decided | Sim, motion, nest, inlay, tools |
| D-188 | DAVIT R4 interference gate as a parity reference | decided | Sim, motion, nest, inlay, tools |
| D-189 | Colliding slugs, thirteen names | owner | Names |
| D-190 | Welcome line case | decided | Testing, docs, milestones, registry |
| D-191 | D-065 and D-073 wording corrected | decided | Constraints and checks |
| D-192 | Living plan scope | owner | Testing, docs, milestones, registry |
| D-193 | nest.pack moves to layout_solve | decided | Agent surface |
| D-194 | Supply-chain hardening | decided | Repos, packaging, toolchain, licensing |
| D-195 | Code inside design folders is MIT | owner | Licensing additions |
| D-196 | Text on a pink fill is ink | owner | UI |
| D-197 | Ghost as the default render | owner | UI |
| D-198 | CHK-PRT-04 scope and the flex-pair pocket clearance | owner | Constraints and checks |
| D-199 | Derived verdict qualifier | owner | Constraints and checks |
| D-200 | Sealed-pocket floor and roof; pauseBefore is z only | owner | Feature kinds |
| D-201 | Pinning trusted build.ts by defHash | owner | Architecture |
| D-202 | Snap family admits snap-vee-finger-cage | owner | Canons, reference, profile, catalog |
| D-203 | Canon status after the recovered sources | decided, refined by D-252 | Canons, reference, profile, catalog |
| D-204 | Downloads placement by hash, then date, then title | decided | Testing, docs, milestones, registry |
| D-205 | Coupons from the part source module, with a clearance ladder | decided | Testing, docs, milestones, registry |
| D-206 | Spec and runtime contract corrections from the 2026-10-04 audit | decided | Architecture |
| D-207 | realGap pinned on the per-side basis | decided | Canons, reference, profile, catalog |
| D-208 | Layer tops snapped; parity Z exemption | decided | Architecture |
| D-209 | view.render is a software rasterizer | decided | Architecture |
| D-210 | Relay grant MAC and laser safety | decided | Agent surface |
| D-211 | npm name for the CLI | owner | Repos, packaging, toolchain, licensing |
| D-212 | Gold checklist is the bench acceptance bar | decided | Gold standard |
| D-213 | Runtime budgets measured on the gold benches | decided | Gold standard |
| D-214 | BenchHook error state, tilt drive and range clamps | decided | Gold standard |
| D-215 | Drive pad from built geometry, one contact function | decided | Gold standard |
| D-216 | Readouts carry value, verdict and limit | decided | Gold standard |
| D-217 | Composer instances and stage tools, no seventh kind | decided | Gold standard |
| D-218 | Steps, freshness and status describe the view on screen | decided | Gold standard |
| D-219 | Export row names failing checks; the kit and card follow the build | decided | Gold standard |
| D-220 | Slot colour on the stage and in the 3MF | owner | Gold standard |
| D-221 | Legend as the colour key; materials as a step | owner | Gold standard |
| D-222 | Originals are the sample set; mockups are a secondary idea source | decided | Gold standard |
| D-223 | The flex-pair key is the PIP flex cone key; four slots on ffc5p | decided, refined by D-241 | Testing, docs, milestones, registry |
| D-224 | Body carries its plan outline; checks read the Part IR only | decided | Constraints and checks |
| D-225 | An open interval end is null on the wire | decided | Constraints and checks |
| D-226 | Build plate in the machine preset | decided | Canons, reference, profile, catalog |
| D-227 | Golden writers: parity for the JSON goldens, named tools for renders | decided | Testing, docs, milestones, registry |
| D-228 | Query goldens are parity goldens, declared in queries.json | decided | Testing, docs, milestones, registry |
| D-229 | Click-spring window bounds on the 0.01 grid | decided | Constraints and checks |
| D-230 | Organic surfaces: imported mesh or an SDF level set route | owner | Architecture |
| D-231 | Rapier pin for PAWL | owner | Sim, motion, nest, inlay, tools |
| D-232 | SLUG 126 of 128 is unverified | decided | Sim, motion, nest, inlay, tools |
| D-233 | OGEE16 577 mm3 is retired | decided | Sim, motion, nest, inlay, tools |
| D-234 | A virtual exit B stands in provisionally for the M-S print | decided | Testing, docs, milestones, registry |
| D-235 | The virtual print is a reusable test level | decided | Testing, docs, milestones, registry |
| D-236 | The flex-pair pad top keeps PIP's bezel term | decided | Testing, docs, milestones, registry |
| D-237 | Headless slices complete the project from bundled presets; the writer stays names only | decided | Repos, packaging, toolchain, licensing |
| D-238 | TPU slicer preset names for the flex-pair slots 3 and 4 | owner | Canons, reference, profile, catalog |
| D-239 | Corrections from the plan-drift audit of 2026-10-08 to D-232, D-233 and D-236 | decided | Testing, docs, milestones, registry |
| D-240 | The SVG document sanitiser moves to the first milestone that parses an SVG document | decided | Architecture |
| D-241 | CHK-KEY-01 band is 35 to 50 percent of the cone, read from profile | decided | Constraints and checks |
| D-242 | One overhang rule for CHK-PRT-12, CHK-PRT-13 and CHK-SHP-03 | decided | Constraints and checks |
| D-243 | registryHash in the spec form; registry checks reach the export gate | decided | Constraints and checks |
| D-244 | KEYWAY gates enter as CHK-NET-31 to -38; cut-sheet references hold chase.surface.ts | decided | Constraints and checks |
| D-245 | A contact declares its actuator and press axis; the button path checks run in circuit.solve | decided | Constraints and checks |
| D-246 | Conductor parts carry per-object overrides; Part IR records body adjacency; CHK-3MF-08 reads a conductor record and resolves under the circuit kernel | decided | Constraints and checks |
| D-247 | The page milestone moves to M05; the KEYWAY family candidates enter as CHK-NET-40 to -45 | decided | Constraints and checks |
| D-248 | A conductor reads its own material; a trace that is its own only body gets a skin host | owner | Electrical |
| D-249 | Correction: SPINDLE R1 as shipped shorts 5V to GND on B.Cu | decided | Electrical |
| D-250 | Node 24 for the tscircuit backend | owner | Repos, packaging, toolchain, licensing |
| D-251 | M06 and M08 integration: goldens re-accepted once, draft kinds and board builds in the project graph, one writer for the button firmware stubs | decided | Testing, docs, milestones, registry |
| D-252 | Canon exit splits are read from counts.json under the originals rule | decided | Canons, reference, profile, catalog |
| D-253 | Wiring parity target is TANG R5 | decided | Electrical |
| D-254 | SHUNT floating nets expect set | decided | Electrical |
| D-255 | A face frame is orthonormal and refused, never normalised | decided | Kernel, geometry |
| D-256 | hackbuild-ui 0.3.0 enters as a vendored tarball named by its staged tree id | decided | Repos, packaging, toolchain, licensing |
| D-257 | The 0.3.0 branch is rebased onto local a88fcc8 before it publishes | decided, owner, 2026-10-13 | Repos, packaging, toolchain, licensing |
| D-258 | Bench layer details in hackbuild-ui 0.3.0 and the fab overrides | decided | UI |
| D-259 | The COTTER baker stays outside designs/cotter/legacy | owner | House rules and process |
| D-260 | Legacy lineage subjects and allow rows of M09-T01 | decided | Testing, docs, milestones, registry |
| D-261 | Rail declarations M10 adds to spec | decided | CHASE |
| D-262 | The single kind layout, readout rail, log drawer and drive pad | decided | UI |
| D-263 | The drive pad reads circuit equations through a headless circuit subpath | decided | Electrical |
| D-264 | A fab bake carries its library build and its export writers | decided | Architecture |
| D-265 | PIP legacy gold rows are report-only | owner | Gold standard |
| D-266 | Gold harness conventions | decided | Gold standard |
| D-267 | The bake writes a licence manifest and refuses LGPL | decided | Licensing additions |
| D-268 | Absolute owner paths in provenance stay as written | decided | Repos, packaging, toolchain, licensing |
| D-269 | vtracer corpus input 07 leaves the public trees | decided | Licensing additions |
| D-270 | Report goldens accepted for print check scope and the CHK-NET-29 solve capacitance | decided | Testing, docs, milestones, registry |
| D-271 | A design declares a coupon export only once a coupon reference exists | decided | Testing, docs, milestones, registry |
| D-272 | Seat pins are net taps, proved by CHK-NET-46; keys/midi-pad enters as a reference | decided | Electrical |
| D-273 | Goldens re-accepted for platform-stable board writers, the flex-pair coupon drop and coin initials | decided | Testing, docs, milestones, registry |
| D-274 | pip-buried-route goldens accepted: the off-grid emit is the original's geometry | decided | Testing, docs, milestones, registry |
| D-275 | SLUG trials are deterministic across x64 and arm64; the measured value is 90 of 128 | decided | Sim, motion, nest, inlay, tools |
| D-276 | D-249 answered: SPINDLE R1 stays the expect-fail fixture; spindle-r2 drops the four GND vias on the 5V trace | decided | Electrical |
| D-277 | D-254 answered: SHUNT declares CHK-BRD-09's measured set; the legacy floating list stays as shipped | decided | Electrical |
| D-278 | Owner-file derivation finds unguarded and guarded owner-path reads | decided | Testing, docs, milestones, registry |
| D-279 | G-03 on the PIP legacy page is the calibrated original flaw; the zero-fail gold run grades fab bakes only | decided | Gold standard |
| D-280 | MP-01 midi-pad fader: fit a 100 nF hold capacitor at GP26 rather than move the terminals | decided | Electrical |
| D-281 | INLAY_KIND_VERSION 2.0.0 for the text and inside-host change | decided | Sim, motion, nest, inlay, tools |
| D-282 | Coin textSize range and default from COLLAR | decided | Canons, reference, profile, catalog |
| D-283 | Hash-only mutant survivors M04, M05, P02 and P04 are killed by behaviour tests | decided | Testing, docs, milestones, registry |
| D-284 | spindle-r2 goldens pinned at epoch 315532800 | decided | Testing, docs, milestones, registry |
| D-285 | The four owner calls of 2026-10-14 verified independently | decided | Testing, docs, milestones, registry |
| D-286 | M10-T01 legacy copies stay out of git; the folders commit their README and SHA256SUMS | decided | Testing, docs, milestones, registry |
| D-287 | access.pressTargetN tier is inferred, not computed | decided | Canons, reference, profile, catalog |
| D-288 | coin mass at vendor tier from a search excerpt | decided | Canons, reference, profile, catalog |
| D-289 | pressBandPct ties to modulusSpreadPct | decided | Canons, reference, profile, catalog |
| D-290 | no lineage row for profile constants | decided | Canons, reference, profile, catalog |
| D-291 | PJ398SM pad tier is community, not vendor | decided | Canons, reference, profile, catalog |
| D-292 | No inferred panel-hole field on the PJ398SM row | decided | Canons, reference, profile, catalog |
| D-293 | No pins field on the PJ398SM row; pad names serve as pin names | decided | Canons, reference, profile, catalog |
| D-294 | KiCad LICENSE.md committed beside the PJ398SM footprint | decided | Canons, reference, profile, catalog |
| D-295 | Registry module listing order lives in a lib helper | decided | Testing, docs, milestones, registry |
| D-296 | One owner per registry output path; exit 2 for contract errors | decided | Testing, docs, milestones, registry |
| D-297 | A missing registry generator directory is an error, an empty one is not | decided | Testing, docs, milestones, registry |
| D-298 | exportedConst picks the single export, else the one annotated with the type | decided | Testing, docs, milestones, registry |
| D-299 | Stop overtravel read from the profile row inside the archetype | decided | Canons, reference, profile, catalog |
| D-300 | Click curve samples interpolated linearly between FE load steps | decided | Sim, motion, nest, inlay, tools |
| D-301 | Click-spring reference test asserts no curve metric at chase defaults | decided | Testing, docs, milestones, registry |
| D-302 | Core click-curve test added outside the Writes line | decided | Testing, docs, milestones, registry |
| D-303 | Lineage fragments are one JSON array per subject, sorted by id on gather | decided | Testing, docs, milestones, registry |
| D-304 | CLAUDE.md lineage bullet rewrapped over three lines | decided | Testing, docs, milestones, registry |
| D-305 | The cross-file duplicate lineage test accepts either refusal | decided | Testing, docs, milestones, registry |
| D-306 | Counts drift committed in the R1-rails-registries-03 branch | decided | Testing, docs, milestones, registry |
| D-307 | Thin-wall bound is 1.5 preset line widths, not PIP's fixed 0.6 mm | decided | Constraints and checks |
| D-308 | No line width means no thin-wall row | decided | Constraints and checks |
| D-309 | Rerecorded the click-spring 3mf artifact hash | decided | Testing, docs, milestones, registry |
| D-310 | Spring thickness and line width carried through the writer input | decided | Architecture |
| D-311 | The access-switch paddle skirt is the hard stop | decided | Canons, reference, profile, catalog |
| D-312 | Access-switch rim and paddle sizes come from existing numbers | decided | Canons, reference, profile, catalog |
| D-313 | Access-switch body uses the stack route with two bands | decided | Architecture |
| D-314 | No bezel plate on the access switch | decided | Canons, reference, profile, catalog |
| D-315 | Access-switch parity edit golden moves paddle D | decided | Testing, docs, milestones, registry |
| D-316 | Access-switch paddle preload reported, not subtracted | decided | Canons, reference, profile, catalog |
| D-317 | Rerecorded the access-switch 3mf artifact hash | decided | Testing, docs, milestones, registry |
| D-318 | The solver hint names registerSolvers in archetypes | decided | Architecture |
| D-319 | Page click test reads goldens instead of an in-process core build | decided | Testing, docs, milestones, registry |
| D-320 | registerSolvers is once-only | decided | Architecture |
| D-321 | Fix main's stale lineage fragment in this branch | decided | Testing, docs, milestones, registry |
| D-322 | Pack the CHECK_MODULES array to 80 columns | decided | Architecture |
| D-323 | Generated check index refuses a module outside its family directory | decided | Architecture |
| D-324 | CI small jobs merged into build and bake | decided | Repos, packaging, toolchain, licensing |
| D-325 | Build steps guarded on install success | decided | Repos, packaging, toolchain, licensing |
| D-326 | CI job count is 15, not 14 | decided | Repos, packaging, toolchain, licensing |
| D-327 | A ui-css or size failure now blocks browser | decided | Repos, packaging, toolchain, licensing |
| D-328 | Gap marker lines count toward the 150-line cap | decided | Repos, packaging, toolchain, licensing |
| D-329 | Quiet-output markers are case-sensitive and match anywhere in the line | decided | Repos, packaging, toolchain, licensing |
| D-330 | Quiet-output passes through when no git repo is found | decided | Repos, packaging, toolchain, licensing |
| D-331 | Quiet-output keeps the brief's command regex as written | decided | Repos, packaging, toolchain, licensing |
| D-332 | Graph fixture rerecorded although access-switch's own build hash moved | decided | Testing, docs, milestones, registry |
| D-333 | Modulus corners use plus or minus 20 percent of the profile E, not the scout's 1500 and 2200 MPa | decided | Sim, motion, nest, inlay, tools |
| D-334 | Press claim tier typed as a spec Qualifier | decided | Scope, claim and position |
| D-335 | No lineage row for the access-switch press claim | decided | Canons, reference, profile, catalog |
| D-336 | Coupon declares the switch's four material slots | decided | Canons, reference, profile, catalog |
| D-337 | Coupon tips print in TPU 95A, conductors dropped | decided | Canons, reference, profile, catalog |
| D-338 | Coupon rung marked by debossed bars, not digits | decided | Canons, reference, profile, catalog |
| D-339 | Coupon frame takes per-cell host heights | decided | Canons, reference, profile, catalog |
| D-340 | Coupon cup shape and the coins metric | decided | Canons, reference, profile, catalog |
| D-341 | Coupon nested under the switch directory | decided | Testing, docs, milestones, registry |
| D-342 | touched hook calls the tsc bin directly instead of npx --no-install | decided | Agent surface |
| D-343 | projectFor ignores files that are not TypeScript | decided | Agent surface |
| D-344 | touched hook accepts MultiEdit and resolves symlinks | decided | Agent surface |
| D-345 | derived split into derived and derived:counts | decided | Testing, docs, milestones, registry |
| D-346 | Builder branches do not regenerate counts.json | decided | Testing, docs, milestones, registry |
| D-347 | actions/cache major v5 in ci | decided | Testing, docs, milestones, registry |
| D-348 | separate browser folder for Python Playwright in parity | decided | Testing, docs, milestones, registry |
| D-349 | uv cache on in every setup-uv, cold and determinism included | decided | Testing, docs, milestones, registry |
| D-350 | no build cache in determinism, browser cache allowed | decided | Testing, docs, milestones, registry |
| D-351 | stop hook block counts kept in a separate file | decided | Testing, docs, milestones, registry |
| D-352 | stop hook finds state roots through git worktree list | decided | Testing, docs, milestones, registry |
| D-353 | stop hook budget overrun clears the touched record | decided | Testing, docs, milestones, registry |
| D-354 | stop hook round count resets on a non-continuation stop | decided | Testing, docs, milestones, registry |
| D-355 | allowed stop notes carry systemMessage and additionalContext | decided | Testing, docs, milestones, registry |
| D-356 | stop hook resolves tool binaries directly, not through npx | decided | Testing, docs, milestones, registry |
| D-357 | lineage row for shells.ts from DAVIT finalize | decided | Kernel, geometry |
| D-358 | zero-volume shell components count as voids | decided | Kernel, geometry |
| D-359 | ShellGroup.shells counts the outer shell | decided | Kernel, geometry |
| D-360 | shell parity ray uses fixed slopes sqrt2/7 and pi/11 | decided | Kernel, geometry |
| D-361 | hook-script scan covers every .mjs in tools/agent-hooks | decided | Testing, docs, milestones, registry |
| D-362 | CLAUDE.md hooks line added over the 200 line cap | decided | Testing, docs, milestones, registry |
| D-363 | hooks check also rejects export_run | decided | Testing, docs, milestones, registry |
| D-364 | kernel tests join the root run instead of a root test.projects split | decided | Testing, docs, milestones, registry |
| D-365 | three packages/ui test files now run only under the node environment | decided | Testing, docs, milestones, registry |
| D-366 | unit keeps setup-uv and loses its owner-files report step | decided | Testing, docs, milestones, registry |
| D-367 | worstOverlap builds every group's Manifold before the bounds prefilter | decided | Kernel, geometry |
| D-368 | overlap.ts builds its own manifolds instead of reusing stages.ts toManifold | decided | Kernel, geometry |
| D-369 | mesh.overlap lineage points at the original inlay validate_3mf.py | decided | Kernel, geometry |
| D-370 | a zero or other out-of-range import count still parses | decided | Agent surface |
| D-371 | readImports exported for its test | decided | Agent surface |
| D-372 | vue-tsc runs on @typescript/typescript6 beside TS 7 | decided | Repos, packaging, toolchain, licensing |
| D-373 | vue-tsc 3.3.13 rather than 3.3.12 | decided | Repos, packaging, toolchain, licensing |
| D-374 | licence rows for the vue-tsc toolchain cite D-043 | decided | Repos, packaging, toolchain, licensing |
| D-375 | generated import fixtures carry no lineage row | decided | Testing, docs, milestones, registry |
| D-376 | corpus test regenerates script-sourced rows | decided | Testing, docs, milestones, registry |
| D-377 | pile primitives at 16 segments | decided | Testing, docs, milestones, registry |
| D-378 | floating cap is a hemisphere dome | decided | Testing, docs, milestones, registry |
| D-379 | noUnion text keeps the part-count prefix | decided | Kernel, geometry |
| D-380 | pairwise excludes groups that fail the audit, voids included | decided | Kernel, geometry |
| D-381 | body attribution of union pieces by bounds containment | decided | Kernel, geometry |
| D-382 | pieces and bodyPieces are null when the union is refused | decided | Kernel, geometry |
| D-383 | Import piece count and floating piece checks | decided | Constraints and checks |
| D-384 | Import path checks stay out of chase builds | decided | Constraints and checks |
| D-385 | No CHECKS.md section 6 rows for the new checks | decided | Testing, docs, milestones, registry |
| D-386 | fab-knowledge: evidence prefix accepted in seed origins | decided | Testing, docs, milestones, registry |
| D-387 | COMMANDS is ordered by COMMAND_NAMES | decided | Agent surface |
| D-388 | motion.run program ids reach the spec through host lists | decided | Architecture |
| D-389 | VIEW_MODES moves into the view.render spec | decided | Architecture |
| D-390 | Widened CLI examples lose their compile-time check | decided | Agent surface |
| D-391 | The run-body mutation check is split between core and the package | decided | Testing, docs, milestones, registry |
| D-392 | The spec surface test reads the def files | decided | Testing, docs, milestones, registry |
| D-393 | Absent claimFns reads as an empty registry | decided | Constraints and checks |
| D-394 | EvidenceRef shape | decided | Constraints and checks |
| D-395 | Claim range, unit and id rules run outside zod | decided | Constraints and checks |
| D-396 | A zero-width claim band is legal | decided | Constraints and checks |
| D-397 | access-switch goldens accepted after the jack seat | decided | Reference, profile, archetypes |
| D-398 | Jack bore opens up through the rim (U), unlike BAFFLE's closed bore | decided | Reference, profile, archetypes |
| D-399 | Jack turned a quarter turn about its axis | decided | Reference, profile, archetypes |
| D-400 | Jack physical numbers as six new inferred profile rows | decided | Reference, profile, archetypes |
| D-401 | Leg slot drawn at the KiCad pad drill | decided | Reference, profile, archetypes |
| D-402 | key.R.pads emitted by the click archetype | decided | Reference, profile, archetypes |
| D-403 | R.leads written as rho L / A inside jack.ts | decided | Reference, profile, archetypes |
| D-404 | Metric record rerecorded, including claim.press rows main had left out | decided | Reference, profile, archetypes |
| D-405 | Fix the exit-row test mapping, not ci.yml | decided | Rails, CI |
| D-406 | CHECKS.md section 5 PRT entered count is 6 | decided | Plan, checks |
| D-407 | The access switch press-claim README block has no automatic writer | decided | Reference, goldens |
| D-408 | The access switch parity line names build 90e387..5c | decided | Reference, docs |
| D-409 | The access switch coupon README takes the four verified lists | decided | Reference, docs |
| D-410 | Slice into the temp folder, then copy into fab-knowledge | decided | Rails, virtual print |
| D-411 | Beam road check passes despite the 0.60 mm planned road | decided | Reference, virtual print |
| D-412 | The access switch README drops its stale not-sliced line | decided | Reference, docs |
| D-413 | slice.mjs keeps its preset-name output for now | decided | Rails, virtual print |
| D-414 | plot.curve registers through the existing plot.<id> panel id | decided | UI, bench |
| D-415 | The access switch contact closes the pad halves, not a contact feature | decided | Reference, bench |
| D-416 | The access switch chase gains a json export | decided | Reference, goldens |
| D-417 | The gold check host builds the bench's own design | decided | Rails, gold |
| D-418 | Curve scale fmax also covers the claim band top | decided | UI, lineage |
| D-419 | The integrator rerecords graph.jsonl when only the build hash moves | decided | Rails, goldens |
| D-420 | CHK-PRT-19 on floating-cap measures 22 mm, not about 2 mm | decided | Rails, checks |
| D-421 | pieces enters the part.build input schema without a range check | decided | Rails, commands |
| D-422 | Declared pieces enter defHash as the resolved count | decided | Rails, goldens |
| D-423 | With no union, CHK-PRT-18 and CHK-PRT-19 skip with the no-union reason | decided | Rails, checks |
| D-424 | A kernel-refused pairwise fails CHK-PRT-03 with measured kernel refused | decided | Rails, checks |
| D-425 | The access switch print card has no tip into the dovetail step | decided | Reference, docs |
| D-426 | The access switch card reuses the flex-pair card helpers | decided | Reference, docs |
| D-427 | The access switch card derives its brim line from the 3MF | decided | Reference, virtual print |
| D-428 | The access switch card names USE.md before it is written | decided | Reference, docs |
| D-429 | The BOSL2 notice goes in the edge.ts header, not in THIRD-PARTY-NOTICES.txt | decided | Kernel, licences |
| D-430 | Edge profiles refuse an empty inset range with E_UNSAT | decided | Kernel, geometry |
| D-431 | The foot edge profile carries a required inset field | decided | Kernel, geometry |
| D-432 | Edge angleDeg is limited to turn fractions the D-175 table holds | decided | Kernel, geometry |
| D-433 | The coupon card is generated and drift-tested, not hand-typed | decided | Reference, docs |
| D-434 | The coupon result is pasted under Coupon result in the switch README | decided | Reference, docs |
| D-435 | The word per coupon rung decides; scale and coins only record | decided | Reference, docs |
| D-436 | plateRows is exported from the switch card and reused by the coupon card | decided | Reference, docs |
| D-437 | @hackbuild/ui exports six panels, not five | decided | UI |
| D-438 | @hackbuild/ui exports pageBench and pageOf beside mountBench | decided | UI |
| D-439 | useBench reads the hook from the BENCH global | decided | UI |
| D-440 | tsc -b leaves out the ui index; types go to dist/types | decided | Repos, packaging, toolchain, licensing |
| D-441 | the ui exports test builds the package before importing it | decided | Testing, docs, milestones, registry |
| D-442 | Cross-package 3mf tests and the contract type test live in packages/checks | decided | Repos, packaging, toolchain, licensing |
| D-443 | Fab narrows the wider vendored contract types at the two glue sites | decided | Repos, packaging, toolchain, licensing |
| D-444 | packages/3mf keeps data/, seed/ and scripts/ beside the shim | decided | Repos, packaging, toolchain, licensing |
| D-445 | split-fresh compares by repacking the named commit, plus a HEAD js/ tree check | decided | Testing, docs, milestones, registry |
| D-446 | The lineage dest of the thin-wall row names the vendored tgz | decided | Testing, docs, milestones, registry |
| D-447 | The hackbuild-3mf branch for R1-engine-03 is committed outside fab and not merged there | decided | Repos, packaging, toolchain, licensing |
| D-448 | prismWithEdges is async and loads geom itself | decided | Kernel, geometry |
| D-449 | The narrower edge band carries the stack band overlap | decided | Kernel, geometry |
| D-450 | Edge stack body z must sit on the layer grid | decided | Kernel, geometry |
| D-451 | The kernel package depends on mesh and geom | decided | Repos, packaging, toolchain, licensing |
| D-452 | Page seam for constraint versions is page-build.ts, not ui-core bench core.ts | decided | Repos, packaging, toolchain, licensing |
| D-453 | The registry loader also depends on chase, for a type | decided | Repos, packaging, toolchain, licensing |
| D-454 | Imported builds keep a registryHash without exporters | decided | Repos, packaging, toolchain, licensing |
| D-455 | The registry loader imports constraintDefs by name | decided | Repos, packaging, toolchain, licensing |
| D-456 | Loaded constraint versions win over the baked fact on drift | decided | Repos, packaging, toolchain, licensing |
| D-457 | PageResult carries registryHash | decided | Repos, packaging, toolchain, licensing |
| D-458 | Loft and sweep tests sit at packages/mesh/test/ top level | decided | Testing, docs, milestones, registry |
| D-459 | Pappus is applied to the section polygon area, not the true circle | decided | Kernel, geometry |
| D-460 | Lineage canonical rows: loft from TENON part2.js, sweep from the geometry prototype | decided | House rules and process |
| D-461 | Sweep end tangents follow the segment direction | decided | Kernel, geometry |
| D-462 | Profile corner lineage gets its own subject | decided | House rules and process |
| D-463 | ogee16.printed port rows stay copy | decided | House rules and process |
| D-464 | M10 pending list in the surface test | decided | Testing, docs, milestones, registry |
| D-465 | flex-pair Q-TIER pointers are /materials/1 and /materials/3 | decided | Reference, goldens |
| D-466 | flex-pair validate exits 2 on the contact.gap E_REF | decided | Reference, goldens |
| D-467 | claimFns fed from registry-loader, not core | decided | Repos, packaging, toolchain, licensing |
| D-468 | No new spring.curve metric written by R1-engine-11 | decided | Testing, docs, milestones, registry |
| D-469 | CHK-CLAIM-01 kept out of the part build registry run | decided | Testing, docs, milestones, registry |
| D-470 | Vendored hackbuild-3mf repacked from fee8d2d | decided | Repos, packaging, toolchain, licensing |
| D-471 | R1-engine-11 round 3 worktree and branch use the -r3 suffix | decided | House rules and process |
| D-472 | noUnion text says imported part(s) with singular agreement (amends D-379) | decided | Kernel, geometry |
| D-473 | Per-fixture piece counts in the import corpus spelled as words | decided | Testing, docs, milestones, registry |
| D-474 | No new INFORMATIONAL reason for the spring.curve metrics | decided | Testing, docs, milestones, registry |
| D-475 | chase.patch writes designs/<name> only | decided | Agent surface |
| D-476 | A patch is refused only for errors it adds | decided | Constraints and checks |
| D-477 | Adding an absent object key is internal to arch.apply | decided | Agent surface |
| D-478 | chase.patch branch order and git failures | decided | Agent surface |
| D-479 | patches.jsonl location and staging | decided | Agent surface |
| D-480 | chase.patch output adds defHashBefore | decided | Agent surface |
| D-481 | New CLI flag kind edit | decided | Agent surface |
| D-482 | drive.tilt equality uses the flex-pair goldens, not a TOGGLE fixture | decided | UI |
| D-483 | drive.tilt accepts gestures tilt and stick only, and fn must equal the pad's contact | decided | UI |
| D-484 | BENCH.widgets() lives on the ui-core PageHook, not on spec BenchHook | decided | UI |
| D-485 | ParamRef is { param: JSON pointer } | decided | UI |
| D-486 | Absent widgetKinds reads as empty, and core does not feed it yet | decided | Architecture |
| D-487 | Widget registry stays out of the @hackbuild/ui public exports | decided | UI |
| D-488 | Two files outside the brief's Files list were edited | decided | UI |
| D-489 | chase.diff output carries migrations and both defHashes in spec | decided | Agent surface |
| D-490 | chase.diff against defaults to HEAD; an existing path wins over a git ref | decided | Agent surface |
| D-491 | Which build module each side of chase.diff uses | decided | Architecture |
| D-492 | chase.diff fixture is generated in the test, and the card's 1.44 is kept | decided | Testing, docs, milestones, registry |
| D-493 | Parity verdict comparison shared with chase.diff | decided | Architecture |
| D-494 | A taken name is E_SCHEMA, not a new E_EXISTS code | decided | Agent surface |
| D-495 | derivedFrom only when the source has a golden | decided | Agent surface |
| D-496 | A copy may keep its source's errors | decided | Agent surface |
| D-497 | Generate from legal through the dim-form solver only | decided | Constraints and checks |
| D-498 | Minimal build makes a disc instead of throwing | decided | Kernel, geometry |
| D-499 | Composer scaffold returns one part | decided | Agent surface |
| D-500 | Writes go to designs/<name> under the git top of the cwd | decided | Agent surface |
| D-501 | The host passes claim functions in; ui-core does not import packages/checks | decided | UI |
| D-502 | How a widget picks its claim, target and cursor | decided | UI |
| D-503 | One plot drawing for both the rail panel and the widget | decided | UI |
| D-504 | Band line qualifier | decided | UI |
| D-505 | access-switch typecheck gains the DOM lib | decided | Repos, packaging, toolchain, licensing |
| D-506 | Test-local ContactFn and placement prefix on the click-spring-window fixture | decided | Testing, docs, milestones, registry |
| D-507 | widgetsModel takes a WidgetView carrying claimFns and travelMm | decided | UI |
| D-508 | BindOptions gains claimFns and a travel getter | decided | UI |
| D-509 | loft and sweep refuse a stage 6 inset | decided | Kernel, geometry |
| D-510 | hull takes the stage 6 inset on every operand | decided | Kernel, geometry |
| D-511 | part.build proof for loft, sweep and hull is a manual CLI run plus a mesh test | decided | Testing, docs, milestones, registry |
| D-512 | bambu-studio extraArgs track the harness time limit | decided | Rails, virtual print |
| D-513 | Owner profile guard extended to the new slicers | decided | Rails, virtual print |
| D-514 | Version regexes for the unverified slicer rows are inferred from the Flash Studio log line | decided | Rails, virtual print |
| D-515 | probe reports cliVersion unknown | decided | Rails, virtual print |
| D-516 | The finger pot (GIB, canonical) stands in for the BLOCKS SLIDER fixture | decided | UI |
| D-517 | What WidgetDecl.fn names for drive.touch, drive.fader and readout.signal | decided | UI |
| D-518 | The fader divider and ADC formulas live in ui-core and are held to circuit by test | decided | UI |
| D-519 | Charge-release return rail taken from the drive level | decided | UI |
| D-520 | Widget stimuli keyed by port and by pot prefix | decided | UI |
| D-521 | chase.bake output keeps the spec field name hash | decided | Agent surface |
| D-522 | mode draft is refused rather than ignored, and is bakeMode over MCP | decided | Agent surface |
| D-523 | from-chase also writes bench.entry.ts and page-build.ts when absent | decided | UI |
| D-524 | Generated bake title is the directory name | decided | UI |
| D-525 | Off-file check added to the baker, scripts excluded | decided | Constraints and checks |
| D-526 | Licence row for hackbuild-3mf added outside the brief file list | decided | Repos, packaging, toolchain, licensing |
| D-527 | No lineage row for from-chase | decided | Testing, docs, milestones, registry |
| D-528 | drive.code maps a wrong dialed code to tumbSolve's WRONG input | decided | UI |
| D-529 | The host passes the code gate in, already bound to the build's params | decided | UI |
| D-530 | view.light rests at PIP's key light and only aims that light | decided | UI |
| D-531 | The netlens lens ghosts every body not on the lit net | decided | UI |
| D-532 | seeed tier is vendor only for Seeed's own products | decided | Canons, reference, profile, catalog |
| D-533 | a catalog fetch clone with the wrong origin is refused | decided | Canons, reference, profile, catalog |
| D-534 | fetched catalog rows pass the catalog loader before any write | decided | Canons, reference, profile, catalog |
| D-535 | catalog fetch stays all-or-none over refused footprints | decided | Canons, reference, profile, catalog |
| D-536 | recorded kicad fetch tests name the gitlab origin | decided | Canons, reference, profile, catalog |
| D-537 | catalog.find fetch copy split between the description and the field describe | decided | Canons, reference, profile, catalog |
| D-538 | the seeed fetch example queries XIAO-RP2040-SMD | decided | Canons, reference, profile, catalog |
| D-539 | chase.bake page hash goes through spec sha256Hex | decided | Testing, docs, milestones, registry |
| D-540 | gate-mcp exports at a params set of its own | decided | Testing, docs, milestones, registry |
| D-541 | draft is a new command, the 31st, CLI only | decided | Agent surface |
| D-542 | E_DRAFT is error code 12: exit 2, HTTP 409, isError true, stage gate | decided | Agent surface |
| D-543 | a directory is a draft when it holds draft.json | decided | Architecture |
| D-544 | hbf:draft 3MF metadata goes under a declared xmlns prefix, written by post-processing | decided | Repos, packaging, toolchain, licensing |
| D-545 | draft fails become warnings through the existing waiver shape | decided | Constraints and checks |
| D-546 | draft page lands in the draft directory, and chase.bake refuses a page bake of a draft | decided | Architecture |
| D-547 | draft bake files are regenerated on every draft bake | decided | Architecture |
| D-548 | inline draft widget contract | decided | UI |
| D-549 | chase validation still runs on a draft | decided | Constraints and checks |
| D-550 | counts.json and the PLAN.md Appendix B row committed on the R1-engine-24 branch | decided | Testing, docs, milestones, registry |

## House rules and process

### D-001 Rule zero: no AI attribution

| field | value |
|---|---|
| Status | decided |
| Decision | Never add Claude, any AI assistant, or any AI or LLM tool as author, co-author, contributor or credit: commit messages, Co-Authored-By and Signed-off-by trailers, "generated with" lines, package.json author and contributors, code comments, file headers, docs, changelogs, PR bodies, exported file metadata (3MF, DXF, print cards), UI and About panel. package.json author is `Moheeb Zara <hackbuildvideo@gmail.com>`. If a tool inserts a trailer, strip it before the commit lands. |
| Rationale | every owner rules file opens with it (hackbuild-bench RULES.md, hackbuild-ui CLAUDE.md, badge-replicator CLAUDE.md, pip-controller CLAUDE.md); trailers exist in hackbuild-resume 568d8d8, ad197fa, 43e639e, 317ffb8 and freshblu c295890c. |
| Evidence | `fab-knowledge:evidence/x/pip-controller/CLAUDE.md`; `hackbuild-bench/RULES.md`; `hackbuild-ui/CLAUDE.md`; `badge-replicator/CLAUDE.md`; `hackbuild-resume` (git log 568d8d8, ad197fa, 43e639e, 317ffb8); `freshblu` (git log c295890c); `fab-knowledge:synthesis/verified-claims.md` (C7) |
| Supersedes | v3 section 20 (rules 1 to 10 had no rule zero); plan-deltas R1 |
| Milestone | M-1 |

### D-002 Enforcement of rule zero

| field | value |
|---|---|
| Status | decided |
| Decision | `.githooks/commit-msg` installed by `git config core.hooksPath .githooks` in the `prepare` script, tested on 12 messages; CI jobs `lint-commits` (every message in the pushed range) and `lint-authors` (package.json author and contributors, CHANGELOG, 3MF Designer metadata in fixtures); `.claude/settings.json` with `{"attribution": {"commit": "", "pr": ""}}`. |
| Rationale | a rules file is context; hooks and CI enforce. |
| Evidence | `fab-knowledge:synthesis/aesthetic-voice-ux-bible.md` (section 3.3); `fab-knowledge:synthesis/api-library-ai-design.md` (section 13.2); `fab-knowledge:synthesis/verified-claims.md` (C10); `fab-knowledge:synthesis/plan-deltas.md` (R2) |
| Supersedes | plan-deltas R2 |
| Milestone | M-1 (T02, T04, T05) |

### D-003 Rules file layout

| field | value |
|---|---|
| Status | decided |
| Decision | `RULES.md` at the repo root in the owner's skeleton (title "Rules for working in this repository", absolute preamble, Attribution, Language, Design law, Architecture law, Safety posture, Secrets, Code conventions, Verification). `CLAUDE.md` under 200 lines, first line `@RULES.md`, Attribution section first. `AGENTS.md` is "See CLAUDE.md." plus `@CLAUDE.md`. |
| Rationale | the owner writes this skeleton in three repos; Claude Code reads CLAUDE.md and its imports. |
| Evidence | `hackbuild-bench/RULES.md`; `badge-replicator/CLAUDE.md`; `fab-knowledge:evidence/x/pip-controller/CLAUDE.md`; `fab-knowledge:synthesis/aesthetic-voice-ux-bible.md` (section 4.1, 4.2); `fab-knowledge:synthesis/api-library-ai-design.md` (section 13.1); `fab-knowledge:evidence/x/plan-to-refine/CLAUDE.md` (handoff builder brief) |
| Supersedes | v3 builder CLAUDE.md; plan-deltas R5, R6 |
| Milestone | M-1 (T01) |

### D-004 lint-voice

| field | value |
|---|---|
| Status | decided |
| Decision | `tools/lint-voice.mjs` replaces `lint-dashes.mjs`. Scans ts tsx js mjs cjs vue md html css json yaml yml toml py svg txt ino scad sh jsonl, plus the extensionless hook scripts under .githooks/. Blocks U+2012 to U+2015, U+2212 used as a dash, U+2600 to U+27BF, U+1F000 to U+1FAFF, U+FE0F, U+2726 to U+2728 (U+2713 and U+2717 allowed in test output), escaped forms in source strings, wrong brand hex (#ff3366, #ff2d7b, #E91E8C, #f5f2eb), exclamation marks in UI strings and messages, marketing adjectives, filler vocabulary, sentence-initial filler openers. Warns on contrast frames. Runs on staged files, the repo in CI, rendered DOM text in smoke, and commit messages. |
| Rationale | the current lint covers eight extensions and one emoji block; 15 handoff files fail it. |
| Evidence | `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/scaffold/tools/lint-dashes.mjs` (current lint); `fab-knowledge:synthesis/aesthetic-voice-ux-bible.md` (section 2.2); `fab-knowledge:synthesis/api-library-ai-design.md` (section 13.3); `fab-knowledge:sources/repos/voice-aesthetic-skills.md` |
| Supersedes | handoff scaffold/tools/lint-dashes.mjs; plan-deltas R3 |
| Milestone | M-1 (T03) |

### D-005 Commit subject convention

| field | value |
|---|---|
| Status | owner |
| Decision | Default: imperative, lowercase, under 60 characters, no trailing punctuation, optional lowercase package scope (`mesh: freeze pinch healer after three flips`), no type word; body wrapped at 72 saying what failed, what changed, and what was and was not verified, with old and new numbers when a number moved. |
| Rationale | hackbuild-bench and hackbuild-ui use bare lowercase subjects; pip-controller uses `feat(scope):`; a package scope fits both. |
| Evidence | `fab-knowledge:synthesis/aesthetic-voice-ux-bible.md` (section 3.1); `hackbuild-bench` (git log subjects); `hackbuild-ui` (git log subjects); `fab-knowledge:evidence/x/pip-controller` (git log b137deb) |
| Supersedes | plan-deltas D5 |
| Milestone | M-1 |

### D-006 Commit and push only when asked

| field | value |
|---|---|
| Status | decided |
| Decision | The builder stages work and reports; commits and pushes happen when the owner asks. |
| Rationale | pip-controller CLAUDE.md. |
| Evidence | `fab-knowledge:evidence/x/pip-controller/CLAUDE.md` (Git conventions) |
| Supersedes | plan-deltas R1 (last sentence) |
| Milestone | M-1 |

### D-007 Number qualifiers

| field | value |
|---|---|
| Status | decided |
| Decision | Every number in prose, UI, print cards and check messages says measured, computed, vendor, inferred or unknown; data rows carry a provenance tier. A computed figure is never promoted to measured by dropping the qualifier. |
| Rationale | pip-controller CLAUDE.md "Measured, computed, or unknown". |
| Evidence | `fab-knowledge:evidence/x/pip-controller/CLAUDE.md` (Measured, computed, or unknown); `fab-knowledge:evidence/x/pip-controller/README.md` (What is verified, and what is not); `fab-knowledge:synthesis/verified-claims.md` (C1) |
| Supersedes | v3 section 20 rule 6; plan-deltas R3, R91 |
| Milestone | M-1; every milestone |

### D-008 Verified block

| field | value |
|---|---|
| Status | decided |
| Decision | Every design README, reference README and published post carries "What is verified, and what is not" with four lists: verified on this machine (with date), measured on a printed body, checked by machine on geometry, not verified by anything. The registry gains a matching `verified` field. |
| Rationale | PIP README. |
| Evidence | `fab-knowledge:evidence/x/pip-controller/README.md`; `fab-knowledge:sources/repos/site-stack-resume.md` (section 8) |
| Supersedes | plan-deltas R8, R21 |
| Milestone | M-1 (rule); M16 (registry field) |

### D-009 Secrets

| field | value |
|---|---|
| Status | decided |
| Decision | Keys a person types into a bench stay in that browser, shown only as a fingerprint (first 4 and last 4), never logged, echoed or committed; owner keys live only in function environment variables. Applies to catalog, model and fab-house API keys. |
| Rationale | badge-replicator CLAUDE.md. |
| Evidence | `badge-replicator/CLAUDE.md` (Secrets); `fab-knowledge:sources/repos/other-projects.md` |
| Supersedes | plan-deltas R7 |
| Milestone | M-1 |

### D-010 Derived counts and lists

| field | value |
|---|---|
| Status | decided |
| Decision | `tools/counts.mjs` generates every count in docs, READMEs and the registry; reference INDEX, command lists, coverage tables, CLI.md and llms.txt are generated too. The CI `derived` job regenerates and fails on any `git status --porcelain` diff. |
| Rationale | the handoff stated 56 tools against 59, 68 checks against 85, 107 scaffold files against 117 (CHK-LNT-03 failure class). |
| Evidence | `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/registry/tools.json` (59 tools); `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/checks.seed.json` (85 checks); `fab-knowledge:evidence/x/plan-to-refine/CLAUDE.md` (states 56 and 68); `fab-knowledge:synthesis/verified-claims.md` (C6); `fab-knowledge:sources/plan/seed-landscape-gaps.md` |
| Supersedes | plan-deltas R6, R23, R96; table 1.4 |
| Milestone | M-1 (T11) |

### D-011 Old AI trailers in hackbuild-resume

| field | value |
|---|---|
| Status | owner |
| Decision | Default: guard forward only; no history rewrite. |
| Rationale | Rewriting published history is the owner's call. |
| Evidence | `hackbuild-resume` (git log 568d8d8, ad197fa, 43e639e, 317ffb8); `fab-knowledge:synthesis/verified-claims.md` (C7) |
| Supersedes | plan-deltas D25 |
| Milestone | none (guard forward from M-1) |

## Names

### D-012 Working names

| field | value |
|---|---|
| Status | owner |
| Decision | Default: use `hbf` (binary), CHASE (document format) and STYLUS (was FEELER) as working names, marked "(working name)" on first use in each document and listed in the first PR body. RABBET stays rejected. |
| Rationale | Unconfirmed by the owner across every prior handoff. |
| Evidence | `fab-knowledge:evidence/x/plan-to-refine/PLAN.md` (section 22, open decision 1); `fab-knowledge:synthesis/plan-deltas.md` (section 4, D11) |
| Supersedes | v3 open decision 1; plan-deltas D11, R94 |
| Milestone | M-1 (first PR body) |

### D-013 PIP is canonical

| field | value |
|---|---|
| Status | decided |
| Decision | hackbuild/pip-controller (one commit b137deb, 2026-09-19T01:12:56Z, local date 2026-09-18, MIT, author Moheeb Zara) is the source over the unpublished `x/haft` tree. Plan text writes "PIP (was HAFT)" on first use. pip-controller CI rejects "haft" at the start of a word in tracked text files, paths and print/ export members; nothing fab writes may put the old name back into that repo. |
| Rationale | Published and measured (verified-claims C1). PIP is `haft (6).html` (2026-09-18 10:37) plus four changes: iso 0.96; stick padGap 0.8; fit floors raised to 0.4 and 0.72; firmware GUARD_US 2000. The unpublished `x/haft` equals `haft (9).html` (2026-09-18 21:37), a sibling branch made after the PIP commit. It adds bleed 0.15, header sockets, anti-smear slots, a datum corner, a grip ledge, a bezel lip and pry scallops, and it lacks GUARD_US (Downloads reader dl-pip-latest, 2026-10-04). |
| Evidence | `fab-knowledge:evidence/x/pip-controller/.github/workflows/ci.yml` (lines 116 to 150); `fab-knowledge:evidence/x/pip-controller/README.md`; `fab-knowledge:synthesis/verified-claims.md` (C1); `fab-knowledge:sources/latest/haft-toggle.md` (unpublished HAFT); `fab-knowledge:evidence/x/downloads/dl-pip-latest/haft/haft (6).html`; `fab-knowledge:evidence/x/downloads/dl-pip-latest/haft/haft (7).html`; `fab-knowledge:evidence/x/haft/haft.html` (byte-identical to `haft (9).html`); `fab-knowledge:evidence/x/pip-controller/bench/part2.js` (lines 279 to 297); `fab-knowledge:sources/downloads/dl-pip-latest.md` (sections 1.2 and 1.3) |
| Supersedes | v3 section 7 (four buttons from HAFT); plan-deltas R13 |
| Milestone | M-1 |

### D-014 Canon package names

| field | value |
|---|---|
| Status | decided |
| Decision | The circuit canon package is `archetypes` (was `circuits`); commands `arch.find` and `arch.apply` beside `mech.find` and `mech.derive`. |
| Rationale | `circuit` and `circuits` one letter apart is a typo trap for people and models. |
| Evidence | `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/circuits.seed.yaml`; `fab-knowledge:sources/plan/spec-architecture.md` |
| Supersedes | v3 sections 5 and 7 (circuits canon, archetype.apply); plan-deltas R59 |
| Milestone | M06 |

### D-015 Colliding slugs

| field | value |
|---|---|
| Status | owner |
| Decision | Default: namespace slugs by group (`copper/stave`, `laser/stave`), rename the laser STAVE to a CASK process variant, and gate the registry on uniqueness and the never-suggest list. Collisions: STAVE, TANG, TACK, TENON, KERF. |
| Rationale | Each names two tools today; final names are the owner's. |
| Evidence | `fab-knowledge:sources/plan/seed-landscape-gaps.md`; `fab-knowledge:sources/benches/benches-cases.md`; `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/registry/tools.json` |
| Supersedes | plan-deltas R22, D19 |
| Milestone | M16 (slug gate) |

### D-016 detent kind and DETENT machine

| field | value |
|---|---|
| Status | owner |
| Decision | Default: keep the `detent` feature kind; the DETENT machine profile id becomes `detent-28byj`. |
| Rationale | Name taste is the owner's. |
| Evidence | `fab-knowledge:synthesis/plan-deltas.md` (section 4, D11); `fab-work-directory:benches/detent-printed/outputs/detent.html` (DETENT machine) |
| Supersedes | plan-deltas D11 |
| Milestone | M07 (machine profile id) |

### D-017 Feature kind spelling

| field | value |
|---|---|
| Status | decided |
| Decision | camelCase: `tabSlot`, `pinInSlot`, `flexCut`, `edgeProfile`; the loader accepts `tabslot`, `pin_in_slot`, `flexcut` as aliases for one minor version. |
| Rationale | One naming convention enforced by regex. |
| Evidence | `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/spec/part-ir.ts` (lowercase and snake spellings); `fab-knowledge:synthesis/mappings.md` (section 5.1) |
| Supersedes | v3 section 4 kind spellings |
| Milestone | M-1 (spec) |

## Scope, claim and position

### D-018 Scope

| field | value |
|---|---|
| Status | decided |
| Decision | Mechanical, cosmetic and electrical things across FDM multi-material (conductive filament circuits included), laser sheet, vinyl copper and PCB, with paper as a narrow fourth process: card stock thicknesses in profile, a holder fit class, and an `impose` export (tiled inserts, crop ticks, print-at-100-percent note). |
| Rationale | COTTER kit.js, badge pouch cards, badge-replicator presets. |
| Evidence | `fab-knowledge:evidence/x/cotter-src` (kit.js insertSVG, sheetSVG, stripsSVG); `fab-work-directory:benches/badge-pouch-card`; `badge-replicator`; `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/registry/tools.json` (group split) |
| Supersedes | v3 section 2 Scope; plan-deltas R14, R15 |
| Milestone | M00 (card stock in profile); M07 (impose export) |

### D-019 Shop scope

| field | value |
|---|---|
| Status | owner |
| Decision | Default: lumber, paint, yardage, crew scheduling and costing are out of scope; GUSSET stays a HeatSync tool; its MaxRects with five sort orders and first-fit-decreasing lumber packing are mined into `nest`. |
| Rationale | GUSSET is a HeatSync tool outside the brand. |
| Evidence | `fab-knowledge:sources/latest/knuckle-tenon-gusset.md` (GUSSET); `fab-work-directory:gusset (10).html` |
| Supersedes | plan-deltas R14, D14 |
| Milestone | M07 (MaxRects and FFD mined into nest) |

### D-020 Novelty claim

| field | value |
|---|---|
| Status | decided |
| Decision | Public wording: "In hackbuild-fab a printed conductor is a region of the part. The build derives the nets from the conductive geometry it produced, computes each net's resistance from printed cross section, path length and a per-direction resistivity, solves the operating point, and checks the voltage against the thresholds of the pin it lands on. For multi-material printed nets we found none that does this in the surveyed literature; the tools we surveyed take design intent in (a schematic, an electrode list or drawn traces) and put geometry out." Flat PCB netlist extraction (Gerber compared to IPC-D-356 in CAM) is acknowledged. "first", "only", "nobody" and "nothing else" never appear in public copy. |
| Rationale | verified-claims C12: universal negative unprovable; Gerber to IPC-D-356 extraction exists; Altium 3D-MID holds nets on solids. |
| Evidence | `fab-knowledge:synthesis/verified-claims.md` (C12); `fab-knowledge:synthesis/prior-art-and-position.md` (section 1); `fab-knowledge:research/hci-fabrication-prior-art.md` |
| Supersedes | v3 section 2 The novel claim (lines 73 to 86); plan-deltas R9 |
| Milestone | M-1 (PRIOR-ART.md); M05 (demonstration) |

### D-021 Related work and citation fixes

| field | value |
|---|---|
| Status | decided |
| Decision | Capricate (Schmitz et al., UIST 2015; electrode to nearest endpoint, no netlist input; 30 kohm SNR 5:1 ceiling; electrode thickness at least 0.2 mm, width at least the 0.8 mm nozzle; cABS 0.438, 0.817, 0.998 ohm cm); Midas (Savage, Zhang, Hartmann, UIST 2012); Wasserfall, Hendrich, Ahlers, Zhang, Additive Manufacturing 36 (2020) 101523, EAGLE schematics imported into a modified Slic3r; Trilaterate (CHI 2019); Thermoformed Circuit Boards (CHI 2021); Flexibles (CHI 2017); MetaSense (UIST 2021); SurfCuit (IEEE CG&A 2017, arXiv 2016); Printegrated Circuits (TEI 2026); Altium Designer 3D-MID (STEP or IGES substrate, single part). Tactlets (UIST 2019) routes traces by hand and is cited only as placement prior art for arch.apply. ProCAD is the system in "Clarify Before You Draw" (arXiv 2602.03045), one paper. Text2CAD-Bench DeepSeek-V3.2 L1 Geo invalidity 13.3 percent (Table 1, CadQuery) against 67.3 percent (Table 3, command sequence). PCBSchemaGen 81.3 percent is Gemma-4-31B's average on PCBBench. pcbGPT is arXiv 2606.01188. Platener is 39.5 percent of 2,250 models. HPI lists 18 laser projects. |
| Rationale | verified-claims C11, C12 corrections. |
| Evidence | `fab-knowledge:synthesis/verified-claims.md` (C11, C12); `fab-knowledge:synthesis/prior-art-and-position.md`; `fab-knowledge:research/hci-fabrication-prior-art.md` |
| Supersedes | v3 sections 2 and 16; plan-deltas R10, R11, R72 |
| Milestone | M-1 (PRIOR-ART.md) |

### D-022 Unverified claims leave the plan

| field | value |
|---|---|
| Status | decided |
| Decision | Dropped until a primary source is cited: MakerWorld PMM on OpenSCAD 2021.01, KiCad 2025 fund drive 71,366 USD toward 128k, Printables 20 percent fee, Fusion local and Data MCP July 2026 date, 3D-MID tools other than Altium (NEXTRA, TARGET 3001 V18, Nano Dimension FLIGHT and its SOLIDWORKS add-in, Zuken), OSHWA certification cost, ISO/IEC 25422:2025 as Core 1.3, Electrifi 0.006 ohm cm, PETG HF elongation 8.6 and 5.1, the Repomix 882,310 byte figure. |
| Rationale | verified-claims C3, C9, C13, C14 could not confirm them. |
| Evidence | `fab-knowledge:synthesis/verified-claims.md` (C3, C9, C13, C14) |
| Supersedes | plan-deltas R9 (non-Altium 3D-MID), R72 (MakerWorld, Fusion rows), R74 (OSHWA free), table 3 PETG HF row |
| Milestone | M-1 (PRIOR-ART.md, PROFILE.md, LICENSING.md) |

### D-023 Positioning

| field | value |
|---|---|
| Status | decided |
| Decision | A fabrication design environment for mechanical, cosmetic and electrical things. The CAD category and its buyer checklist are avoided. The printed conductor leads only when the question is novelty. The defensible asset is the failure corpus. |
| Rationale | CAD buyer checklist loses on BRep depth, STEP, collaboration; prior-art-and-position.md. |
| Evidence | `fab-knowledge:synthesis/prior-art-and-position.md`; `fab-knowledge:research/code-cad-and-eda-tooling.md` |
| Supersedes | v3 section 16; plan-deltas R16 |
| Milestone | M-1 |

### D-024 Kernel and BRep

| field | value |
|---|---|
| Status | decided |
| Decision | The kernel is the restricted vocabulary. BRep is an opt-in fourth route (`route: "brep"`) via replicad 1.1.0 (replicad-opencascadejs 48.9 MB, LGPL-2.1-only, lazy) at M14, never in a default offline bake and never a model's default. Checks read Part IR only. |
| Rationale | Three general-CAD attempts were set aside; 2026 benchmarks show models fail at sweeps, lofts, freeform. |
| Evidence | `fab-knowledge:evidence/x/plan-to-refine/PLAN.md` (section 2 BRep, as a route; section 22 open decision 18); `fab-knowledge:synthesis/verified-claims.md` (C8 replicad); `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/spec/part-ir.ts` (source union kernel, imported, brep) |
| Supersedes | v3 open decision 18; v3 section 2 BRep; plan-deltas R92 (M13 vs M14) |
| Milestone | M14 |

## Repos, packaging, toolchain, licensing

### D-025 Repo boundary rule

| field | value |
|---|---|
| Status | decided |
| Decision | A new repo needs a different release cadence, a different runtime, or a real external audience. |
| Rationale | Keeps the workshop from paying a versioning tax. |
| Evidence | `fab-knowledge:evidence/x/plan-to-refine/PLAN.md` (section 3 opening paragraph) |
| Supersedes | v3 section 3 (kept) |
| Milestone | M-1 |

### D-026 Workshop layout

| field | value |
|---|---|
| Status | decided |
| Decision | hackbuild-fab root: RULES.md, CLAUDE.md, AGENTS.md, README.md, llms.txt (generated), spec/, packages/, kernel/, core/, apps/ (fab, sketch, blocks), designs/, reference/, knowledge/, registry/, docs/ (including docs/plan/), evals/, tools/ (including tools/py/), .githooks/, .claude/, .github/. |
| Rationale | api-library-ai-design.md 3.1 plus registry home and plan docs. |
| Evidence | `fab-knowledge:evidence/x/plan-to-refine/PLAN.md` (section 3 The workshop); `fab-knowledge:synthesis/api-library-ai-design.md` (section 3.1); `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/scaffold` |
| Supersedes | v3 section 3 The workshop tree; plan-deltas R95 |
| Milestone | M-1 (T01, T13) |

### D-027 hackbuild-3mf extraction

| field | value |
|---|---|
| Status | decided |
| Decision | Built in `packages/3mf` and `tools/py` during M00; at M00 exit split with history (`git subtree split --prefix packages/3mf`) into hackbuild/hackbuild-3mf with the Python half and the conformance corpus; one tag publishes npm `hackbuild-3mf` and PyPI `hackbuild_3mf`; hackbuild-fab then depends on the published version. |
| Rationale | Headless, external audience, quiet once correct; py and js writers have disagreed before. |
| Evidence | `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/3mf`; `fab-knowledge:evidence/x/plan-to-refine/PLAN.md` (section 3 Public headless repos); `fab-knowledge:synthesis/verified-claims.md` (C7) |
| Supersedes | v3 section 3; plan-deltas R17, R92 (M0 public release) |
| Milestone | M00 exit |

### D-028 hackbuild-inlay trigger

| field | value |
|---|---|
| Status | decided |
| Decision | Extract when COLLAR and SPRUE both build on the package in hackbuild-fab and the M03 parity passes. |
| Rationale | v3 extraction order kept. |
| Evidence | `fab-knowledge:evidence/x/plan-to-refine/PLAN.md` (section 3); `fab-work-directory:benches/collar-coin`; `fab-work-directory:benches/sprue` |
| Supersedes | v3 section 3 (kept) |
| Milestone | M03 |

### D-029 hackbuild-copper trigger

| field | value |
|---|---|
| Status | decided |
| Decision | Extract when BLOCKS and KEYWAY both build on the package and the M05 parity passes. |
| Rationale | No maintained tool routes vinyl copper with clearance, weedability and terminal gates (Midas 2012 is prior art). |
| Evidence | `fab-knowledge:evidence/x/plan-to-refine/PLAN.md` (section 3); `fab-knowledge:synthesis/verified-claims.md` (C12 Midas); `fab-work-directory:benches/blocks`; `fab-knowledge:sources/benches/benches-conductive-b.md` (KEYWAY) |
| Supersedes | v3 section 3; plan-deltas R11 |
| Milestone | M05 |

### D-030 hackbuild-radio

| field | value |
|---|---|
| Status | owner |
| Decision | Default: archive the empty repo (created 2026-08-06T20:15:59Z, 13 minutes 7 seconds before hackbuild-bench); no radio.hack.build. Radio lives in hackbuild-bench. |
| Rationale | No rename happened; repo is empty. |
| Evidence | `hackbuild-radio` (empty clone); `fab-knowledge:synthesis/verified-claims.md` (C7) |
| Supersedes | v3 section 3 Domains (radio.hack.build); plan-deltas R17, D3 |
| Milestone | none |

### D-031 Device bench address

| field | value |
|---|---|
| Status | owner |
| Decision | Default: docs cite https://hackbuild.github.io/hackbuild-bench/ ; app.hack.build has no DNS record and no Pages CNAME, and adding one is the owner's DNS change. |
| Rationale | verified-claims C7 (C-16). |
| Evidence | `fab-knowledge:synthesis/verified-claims.md` (C7); `hackbuild-bench/README.md` (line 3 names app.hack.build) |
| Supersedes | v3 section 3 Domains (app.hack.build); plan-deltas R17, R18 |
| Milestone | none |

### D-032 hackbuild-beam

| field | value |
|---|---|
| Status | owner |
| Decision | Default: transfer virgilvox/hackbuild-beam (created 2026-08-05) into the hackbuild org before M13. |
| Rationale | BEAM parity is M13; repo ownership is the owner's. |
| Evidence | `fab-knowledge:synthesis/verified-claims.md` (C7); `fab-knowledge:sources/repos/site-stack-resume.md` |
| Supersedes | v3 section 3 hackbuild-beam; plan-deltas R17, D4 |
| Milestone | M13 |

### D-033 Site and registry home

| field | value |
|---|---|
| Status | owner |
| Decision | Default: hackbuild-site does not exist and live hack.build is the private hackbuild-resume on Netlify; the registry data lives in `hackbuild-fab/registry/` until a site repo exists; the site default is a CommonPub thin app plus a static front page on hackbuild-ui. |
| Rationale | v3 gave the registry to a site that does not exist. |
| Evidence | `fab-knowledge:synthesis/verified-claims.md` (C7); `hackbuild-resume`; `fab-knowledge:sources/repos/site-stack-resume.md` |
| Supersedes | v3 section 3 hackbuild-site; plan-deltas R17, D2 |
| Milestone | M16 |

### D-034 Domains and bench hosting

| field | value |
|---|---|
| Status | owner |
| Decision | Default: baked benches publish as GitHub release assets and on hackbuild-fab GitHub Pages until a cookieless origin exists (proposed `tools.hack.build/<slug>/<sha>.html`, working name); never on the signed-in `.hack.build` cookie origin. fab.hack.build, sketch.hack.build and blocks.hack.build are proposals; every DNS change is the owner's. |
| Rationale | A bench script on the cookie origin can read the session. |
| Evidence | `fab-knowledge:sources/repos/site-stack-resume.md`; `fab-knowledge:evidence/x/plan-to-refine/PLAN.md` (section 3 Domains); `fab-knowledge:evidence/x/downloads/dl-boards-tools/hackbuild/hackbuild-site-v2.html` (2026-08-20 mockup: BENCH at hack.build/tools beside a signed-in CUBBY on one CommonPub origin, the arrangement this entry forbids for baked benches) |
| Supersedes | v3 section 3 Domains (hack.build/tools/<slug>); plan-deltas R18 |
| Milestone | M09 (first bake published) |

### D-035 Graduated design template

| field | value |
|---|---|
| Status | decided |
| Decision | A design that graduates gets a repo on the pip-controller layout: committed single-file bench, src/ headless kernel, bench/ shell, test/, docs/ by task, firmware/ with flash and monitor scripts, print/ exports with sha256, LESSONS.md, CLAUDE.md, README with the verified block, CI jobs kernel, firmware and house rules. |
| Rationale | PIP is the owner's shipped repo format. |
| Evidence | `fab-knowledge:evidence/x/pip-controller` (repo layout); `fab-knowledge:evidence/x/pip-controller/README.md`; `fab-knowledge:evidence/x/pip-controller/.github/workflows/ci.yml` |
| Supersedes | plan-deltas R17 (pip-controller row), section 0 item 1 |
| Milestone | any milestone in which a design graduates |

### D-036 One published package

| field | value |
|---|---|
| Status | decided |
| Decision | `@hackbuild/kernel` with subpath exports is the only published package from hackbuild-fab; every workspace package is `"private": true`; changesets `commit: false`, `privatePackages: {version: false, tag: false}`; exports point at `dist/`; publint and attw gate the pack. |
| Rationale | Scaffold published all 24 packages publicly, contradicting the plan. |
| Evidence | `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/scaffold/packages` (24 public packages); `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/scaffold/package.json`; `fab-knowledge:synthesis/api-library-ai-design.md` (section 3.3, 14.2) |
| Supersedes | v3 section 3 (one published package, kept); plan-deltas R19 |
| Milestone | M-1 (private flags); M00 (pack gates) |

### D-037 npm scope and names

| field | value |
|---|---|
| Status | owner |
| Decision | Default: the owner creates the npm org `hackbuild` before the first publish; until then nothing publishes. Names `@hackbuild/kernel`, `hackbuild-3mf` (npm) and `hackbuild_3mf` (PyPI) are checked for availability at M00. |
| Rationale | Scope ownership unverified. |
| Evidence | `fab-knowledge:synthesis/api-library-ai-design.md` (section 3.3) |
| Supersedes | new |
| Milestone | M00 |

### D-038 Package manager

| field | value |
|---|---|
| Status | owner |
| Decision | Default: npm workspaces with a committed package-lock.json, exact pins, `npm ci` in CI (owner repos and pip-controller use npm). pnpm 12.9.1 with catalogs is the alternative. |
| Rationale | Owner repos and pip-controller use npm; the scaffold specified pnpm 10 without a lockfile. |
| Evidence | `hackbuild-bench/package-lock.json`; `hackbuild-ui/package-lock.json`; `fab-knowledge:evidence/x/pip-controller/package-lock.json`; `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/scaffold/pnpm-workspace.yaml`; `fab-knowledge:synthesis/verified-claims.md` (C7) |
| Supersedes | handoff scaffold pnpm 10; plan-deltas R29, D9 |
| Milestone | M-1 (T01) |

### D-039 Node floor

| field | value |
|---|---|
| Status | decided |
| Decision | `"engines": {"node": "^22.18.0 \|\| >=24.11.0"}`. tsdown 0.23.0 needs 22.18 on the 22 line and 24.11 on the 24 line; vitest 5.0.3 needs 22.12; changesets 3 needs 22.11. |
| Rationale | tsdown 0.23 needs 22.18 (24.11 on 24); vitest 5 needs 22.12; changesets 3 needs 22.11 (C-11). |
| Evidence | `fab-knowledge:synthesis/verified-claims.md` (C14) |
| Supersedes | plan-deltas R30 (Node 22.12) |
| Milestone | M-1 (T01) |

### D-040 Toolchain pins (dated 2026-10-04)

| field | value |
|---|---|
| Status | decided |
| Decision | typescript 7.0.2, vitest 5.0.3, vite 8.3.2, @changesets/cli 3.0.3, zod 4.6.5, @playwright/test 1.63.0, fast-check 4.10.2, tsdown 0.23.0, @modelcontextprotocol/server 2.3.0 with @modelcontextprotocol/core 2.3.0, manifold-3d 3.5.4, three 0.186.1, @dimforge/rapier3d-deterministic-compat 0.21.0, eecircuit-engine 1.8.0, replicad 1.1.0 (lazy), kicadts 0.0.58, conduyt-js 1.0.0, jszip 3.10.1, @virgilvox/hackbuild-ui 0.2.0, lib3mf 2.5.0 (validation only), @visioncortex/vtracer 1.0.0-alpha.4 (evaluation only). tscircuit and circuit-json get exact pins at M08. Pins are re-dated at each milestone exit. |
| Rationale | Scaffold pins were stale; MCP sdk ^2 resolves to nothing (C-11). |
| Evidence | `fab-knowledge:synthesis/verified-claims.md` (C8, C9, C10, C14); `fab-knowledge:synthesis/api-library-ai-design.md` (section 14.3); `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/scaffold/package.json` (stale pins) |
| Supersedes | handoff scaffold pins; plan-deltas R30, R73 |
| Milestone | M-1; re-dated at every milestone exit |

### D-041 Licences for code, designs, boards

| field | value |
|---|---|
| Status | decided |
| Decision | Code and spec MIT; printable designs CC BY-SA 4.0; boards CERN-OHL-W-2.0 with optional OSHWA certification (cost unverified); no claim on user outputs; kernel and dependency licences recorded in BuildInputs. |
| Rationale | PIP and hackbuild-ui are MIT; MIT lets AGPL slicers vendor hackbuild-3mf. |
| Evidence | `fab-knowledge:evidence/x/pip-controller/LICENSE` (MIT); `fab-knowledge:synthesis/verified-claims.md` (C14 OSHWA); `fab-knowledge:research/maker-culture-and-market.md` |
| Supersedes | plan-deltas R74, D12 |
| Milestone | M-1 (LICENSING.md) |

### D-042 Failure corpus licence

| field | value |
|---|---|
| Status | decided, owner, 2026-10-13 |
| Decision | The failure corpus, `knowledge/**` and community coupons are CC BY 4.0, with community coupons credited by contributor. The owner chose the default on 2026-10-13. |
| Rationale | Open vs held-closed asset is the owner's call; the owner chose open. |
| Evidence | `fab-knowledge:research/maker-culture-and-market.md`; `fab-knowledge:synthesis/plan-deltas.md` (section 4, D12) |
| Supersedes | plan-deltas R74, D12 |
| Milestone | M16 |

### D-043 Copyleft exclusion

| field | value |
|---|---|
| Status | decided |
| Decision | No GPL or AGPL code inside MIT packages: esm-potrace-wasm 0.5.1 (GPL-2.0) and upstream potrace (GPL-2.0-or-later) stay out; the rtl-sdr driver (librtlsdr port) stays in hackbuild-bench; brepkit-wasm 3.0.0 (AGPL-3.0-only) is avoided; kiutils (GPL-3.0, last commit 2024-05-02) is replaced by kicadts; planegcs (LGPL) only as a separately loaded file if ever adopted; CommonPub AGPL obligations apply to the site only. |
| Rationale | C-11; RESEARCH.md had potrace as MIT or Apache. |
| Evidence | `fab-knowledge:synthesis/verified-claims.md` (C8, C9); `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/RESEARCH.md` (line 133 lists potrace as MIT or Apache); `fab-knowledge:sources/repos/hackbuild-bench-and-ui.md` (rtl-sdr) |
| Supersedes | handoff RESEARCH.md potrace verdict; v3 section 15 adopt list; plan-deltas R61, R63, R64, R73 |
| Milestone | M-1 (audit); M03 (inlay); M08 (KiCad) |

## Architecture

### D-044 Tiers and imports

| field | value |
|---|---|
| Status | decided |
| Decision | Tier S spec; tier 0 profile, catalog, geom, mesh; tier 1 3mf, sim, circuit, copper, board, nest, inlay, motion, wiring, constraints, mechanisms, archetypes; tier 2 checks, project, reference, knowledge, chase; tier 3 ui-core, ui, link; app core (hbf) and apps. The table lives in `tools/tiers.json`; the CI `tiers` job fails on an unlisted edge. catalog moves down to tier 0; chase holds schema and validator only; the renderer binding moves to ui-core; kernels and canons register ConstraintDef entries into constraints at load (inversion, no cycle). |
| Rationale | Scaffold had board importing catalog upward and chase binding into ui. |
| Evidence | `fab-knowledge:sources/plan/spec-architecture.md`; `fab-knowledge:synthesis/api-library-ai-design.md` (section 3.4); `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/scaffold/packages` |
| Supersedes | v3 section 5 tiers; plan-deltas R20 |
| Milestone | M-1 (T12) |

### D-045 Headless kernels

| field | value |
|---|---|
| Status | decided |
| Decision | No `document`, `window` or `vue` import in tiers S to 2 (lint). KNUCKLE's canvas-dependent kernel gets a headless port before it becomes a reference. |
| Rationale | Same code must run in node sweeps and the browser. |
| Evidence | `fab-knowledge:evidence/x/knuckle/src` (canvas-dependent kernel); `fab-knowledge:sources/latest/knuckle-tenon-gusset.md` |
| Supersedes | plan-deltas R85 |
| Milestone | M-1 (lint); M10 (KNUCKLE headless port) |

### D-046 Spec package

| field | value |
|---|---|
| Status | decided |
| Decision | `@hackbuild/spec` is a private workspace package split into ids, part-ir, features, board-features, feature-kinds, build, checks, constraints, profile, circuit, catalog, canon, sim, registry, chase, hook, commands, errors, capabilities, schema, index. Zero runtime dependencies; `tsc --strict` with noUncheckedIndexedAccess and exactOptionalPropertyTypes passes. zod 4 schemas live in packages and are asserted with `satisfies` against spec types; JSON Schema is derived. |
| Rationale | Three files held ten contracts; each package should import one file. |
| Evidence | `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/spec/part-ir.ts`; `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/spec/contracts.ts`; `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/spec/chase.ts`; `fab-knowledge:synthesis/api-library-ai-design.md` (section 3.2) |
| Supersedes | v3 section 20 (three spec files); plan-deltas R91 |
| Milestone | M-1 (T06) |

### D-047 Build pipeline and stage order

| field | value |
|---|---|
| Status | decided |
| Decision | build.ts returns a PartDraft or AssemblyDraft (declarations). The kernel runs, per body then per part: 1 base shape through its route; 2 pre-union cutters (chamfer, round); 3 union positives; 4 post-union cutters; 5 partition by role priority (flex-conductor, flex, conductor, art, body), ties broken by declaration order with feature kind bodies after declared bodies, so no two parts overlap; 6 insets (coincidence, pinch); 7 frame emit; 8 hash. Chamfer after union is unexpressible. One runner in packages/mesh carries these stages for every design; core holds no mesher of its own. |
| Rationale | Makes chamfer-after-union unexpressible; fixes GeneratedGeometry contradiction. |
| Evidence | `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/spec/contracts.ts` (GeneratedGeometry comment); `fab-knowledge:sources/plan/spec-architecture.md`; `fab-knowledge:synthesis/api-library-ai-design.md` (section 8.1) |
| Supersedes | v3 section 4; plan-deltas R77 |
| Milestone | M00 |

### D-048 Multi-body parts

| field | value |
|---|---|
| Status | decided |
| Decision | `Part.bodies: {id, mesh, material, slot, role}[]` with `solid` as their union; features carry an optional `body`. |
| Rationale | COLLAR inlay, PIP keys, KNUCKLE flip group, TENON parts. |
| Evidence | `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/spec/part-ir.ts` (Part with one solid); `fab-knowledge:sources/plan/spec-architecture.md` |
| Supersedes | v3 section 4; plan-deltas R38 |
| Milestone | M-1 (spec); M00 (mesh) |

### D-049 Metrics and warnings in Part IR

| field | value |
|---|---|
| Status | decided |
| Decision | FITS rows, spring curves, drive readouts, routing warnings and clamps with reasons are `metrics` and `warnings` and hash with the build. |
| Rationale | A FITS row can then never lag its geometry. |
| Evidence | `fab-knowledge:sources/plan/spec-architecture.md`; `fab-knowledge:sources/latest/knuckle-tenon-gusset.md` (derive clamps) |
| Supersedes | v3 section 4; plan-deltas R45 |
| Milestone | M-1 (spec); M01 (constraints adapter) |

### D-050 Addressing

| field | value |
|---|---|
| Status | decided |
| Decision | `hbf://` URIs into `<workspace>/.hbf/store/` keyed by content hash (builds, meshes, reports, artifacts) plus static resources (checks, feature kinds, canon entries, references, profile rows, knowledge). The MCP server holds no state. |
| Rationale | MCP 2026-07-28 removed sessions. |
| Evidence | `fab-knowledge:synthesis/api-library-ai-design.md` (section 7.1, 7.2); `fab-knowledge:synthesis/verified-claims.md` (C10) |
| Supersedes | v3 sections 17 and 18 (bare string handles); plan-deltas R78 |
| Milestone | M04 |

### D-051 Hash definitions

| field | value |
|---|---|
| Status | decided |
| Decision | RFC 8785 canonical JSON for hashed inputs; meshHash over vertices quantised to 1e-6 plus triangles as sorted index triples; BuildInputs = defHash, paramsHash, profileHash, registryHash, kernelVersion, engines (manifold, rapier, ngspice), adapter, seed, sourceDateEpoch, licences. |
| Rationale | v3 omitted profile and engine versions; vertex-only hash collides. |
| Evidence | `fab-knowledge:synthesis/api-library-ai-design.md` (section 7.3); `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/spec/contracts.ts` (BuildInputs) |
| Supersedes | v3 section 20 rule 3; plan-deltas R57 (profile hash row), R78 |
| Milestone | M00 (meshHash); M04 (build hash) |

### D-052 3MF bytes and hashes

| field | value |
|---|---|
| Status | decided |
| Decision | artifactHash is sha256 over sorted (entry name, sha256 of uncompressed bytes) with date metadata normalised. Each writer reproduces its own bytes given SOURCE_DATE_EPOCH: fixed CreationDate and ModificationDate, fixed zip mtimes in UTC, no directory entries, sorted entries, fixed deflate level. js and py writers must agree on entry contents; byte identity across the two writers is outside the requirement. Evidence: same input gave py 3979 B and js 4243 B; JSZip adds 3D/, Metadata/ and _rels/ entries; two py runs 2 s apart differ; the js stamps are orca3mf.js lines 91 and 247, py lines 193 and 384. |
| Rationale | C-08: same input gave py 3979 B vs js 4243 B, JSZip adds directory entries, two py runs differ; stamps at orca3mf.js 91 and 247, py 193 and 384. |
| Evidence | `fab-knowledge:synthesis/verified-claims.md` (C2, row 6); `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/3mf/orca3mf.js` (lines 91 and 247); `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/3mf/orca3mf.py` (lines 193 and 384); `fab-knowledge:synthesis/api-library-ai-design.md` (section 14.4) |
| Supersedes | plan-deltas R50 (byte-identical claim) |
| Milestone | M00 |

### D-053 Mesh routes

| field | value |
|---|---|
| Status | decided |
| Decision | One `MeshRoute` union: raster, prism, stack, revolve (with radial displacement fields), lathe, trace, csg, imported, brep. Each route declares its guarantees (manifold, exact Z, per-slot disjoint). |
| Rationale | Plan said four routes, kernel note three, CASK used a fifth. |
| Evidence | `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/knowledge/kernels`; `fab-knowledge:sources/latest/knuckle-tenon-gusset.md` (TENON revolve); `fab-knowledge:synthesis/patterns-and-lineage.md` (section 2.2, 2.3) |
| Supersedes | v3 section 5 mesh (four routes); plan-deltas R51, R55 |
| Milestone | M00 |

### D-054 Vertex snap

| field | value |
|---|---|
| Status | decided |
| Decision | Dyadic 1/1024 mm grid by default (COTTER), replacing 6-decimal snapping; nudges exceed the downstream weld. |
| Rationale | Dyadic values are exact in float64 and survive float32 STL (COTTER); a 0.2 um CASK nudge recreated non-manifold edges. |
| Evidence | `fab-knowledge:evidence/x/cotter-src`; `fab-knowledge:sources/latest/cotter-sparger.md` (dyadic snap); `fab-knowledge:sources/benches/benches-cases.md` (CASK 0.2 um nudge); `fab-knowledge:evidence/x/downloads/dl-cases/cask/` (CASK v0.3 exports carry 14109 shell and 14108 cap non-manifold edges against 0 in v0.4, computed 2026-10-04) |
| Supersedes | v3 section 5 geom (6-decimal snap); plan-deltas R51, R52 |
| Milestone | M00 |

### D-055 wasm ownership

| field | value |
|---|---|
| Status | decided |
| Decision | Scope-based ownership (COTTER `GEO.scope` with PIP's live count); live object count asserted zero after sweeps; manifold `ExecutionContext` cancels stale rebuilds on slider drag; union tries batch, verifies `is_volume`, then folds; a candidate that fails only on zero-area triangles is taken when its D-054 snapped and welded mesh audits clean; one union in packages/mesh, called by every route, the stage runner and core. |
| Rationale | Two benches solved manifold memory twice; PINTLE union failures. |
| Evidence | `fab-knowledge:evidence/x/pip-controller/src`; `fab-knowledge:evidence/x/cotter-src`; `fab-knowledge:sources/benches/benches-robots-a.md` (PINTLE union); `fab-knowledge:synthesis/verified-claims.md` (C8) |
| Supersedes | v3 section 14; plan-deltas R51 |
| Milestone | M00 |

### D-056 Determinism CI

| field | value |
|---|---|
| Status | decided |
| Decision | Every reference builds on ubuntu x64 and ubuntu arm64 and mesh hashes must match (manifold-3d 3.5.0 introduced cross-platform double determinism). Sim snapshot hashes enter BuildInputs only after D-134 measures Rapier speed. |
| Rationale | manifold-3d 3.5.0 introduced cross-platform determinism; unproven until CI runs. |
| Evidence | `fab-knowledge:synthesis/verified-claims.md` (C8 manifold-3d 3.5.0) |
| Supersedes | plan-deltas R58, R73 |
| Milestone | M00 (mesh); M02 (sim) |

### D-057 One KernelId union

| field | value |
|---|---|
| Status | decided |
| Decision | Used by CheckDef.needs, Bound.kernel, ChaseMeta.kernels and tools.json; includes `3mf`, `board` and `inlay`, which 16 seeded checks already use. |
| Rationale | Five vocabularies named kernels; 16 seeded checks used values outside the union. |
| Evidence | `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/spec/contracts.ts` (line 69 union); `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/checks.seed.json` (16 out-of-union needs); `fab-knowledge:synthesis/verified-claims.md` (C6) |
| Supersedes | plan-deltas R55 |
| Milestone | M-1 (spec, seed conformance) |

## Feature kinds

### D-058 Three-part contract by type

| field | value |
|---|---|
| Status | decided |
| Decision | FeatureKindDef requires `generate`, non-empty `checks`, `fit` (a function or `"none"`), non-empty `reference`, `schema` and `version`. Today hinge, finger, lamination, bridge and coupon lack a check; boss, chamfer, round and snap lack a reference; round has no generator in harvested code. Each gap is closed in the milestone that touches the kind. |
| Rationale | Coverage rule as a type. |
| Evidence | `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/checks.seed.json` (appliesTo.kinds); `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/scaffold/reference`; `fab-knowledge:synthesis/mappings.md` (section 5.1, 11.1) |
| Supersedes | v3 section 4 (fit optional); plan-deltas R39 |
| Milestone | M-1 (spec type); each kind in the milestone that touches it; coverage closes at M11 |

### D-059 Eight admitted kinds

| field | value |
|---|---|
| Status | decided |
| Decision | `thread` (pitch, starts, depth, clearance, hand, phase reference; TENON), `bayonet` (lugs, travel, radial and axial clearance, preload, detent gate, keyed, mirrorOnFlip; TENON, CASK, PINTLE), `magnet` (d, h, sealed; KNUCKLE d+0.2 pocket), `inlay` (art region, slot, depth in layers, min feature, despeckle; COLLAR and seven others), `insert` (knurl OD, length, boss; hole = OD minus 0.2, depth insert plus 0.5), `spring` (span, beam, rise Q, width, end pinning; PIP click spring), `mount` (pattern, symmetry order, handedness; STANCHION, PINTLE, SPOOL), `relief` (first-layer widening by elephant foot; KNURL). Each enters with generator, check, fit class and reference. |
| Rationale | Corpus built these repeatedly; inlay alone spans eight designs; the PIP spring was forced into detent. |
| Evidence | `fab-knowledge:evidence/x/tenon`; `fab-knowledge:evidence/x/knuckle`; `fab-work-directory:benches/collar-coin`; `fab-knowledge:evidence/x/pip-controller/src/layout.js` (click spring); `fab-work-directory:benches/stanchion`; `fab-work-directory:benches/knurl/outputs/knurl/knurl.html`; `fab-knowledge:synthesis/mappings.md` (section 5.2) |
| Supersedes | v3 section 4 (26 kinds); plan-deltas R40 |
| Milestone | spring M01; inlay M03; each other kind in its admitting milestone; coverage closes at M11 |

### D-060 Backlog kinds

| field | value |
|---|---|
| Status | decided |
| Decision | Admitted only when a second design needs them: sweepcut, coupling, loom, keel, seat, hangSlot and peg, sheetThrough, halfLap, stencil, applique, weir, peristaltic. |
| Rationale | Avoid kinds with one user. |
| Evidence | `fab-knowledge:synthesis/mappings.md` (section 5.2); `fab-knowledge:synthesis/plan-deltas.md` (R40 backlog) |
| Supersedes | plan-deltas R40 |
| Milestone | when a second design needs the kind |

### D-061 Board feature namespace

| field | value |
|---|---|
| Status | decided |
| Decision | Inside `board`, outside the solid kinds: outline, routed slot, NPTH mount, keepout, antenna keepout, silk string, art layer, registration mark, castellated seat with `holeDx`, solder jumper with declared default, mask opening, thermal slot, bare lead, declared bridge. |
| Rationale | SHUNT, SHIM, SPINDLE, AUGER, TRUNNION needed them. |
| Evidence | `fab-work-directory:benches/shunt`; `fab-work-directory:benches/shim`; `fab-work-directory:benches/spindle`; `fab-work-directory:benches/ghost-pcb-auger`; `fab-work-directory:benches/trunnion` |
| Supersedes | plan-deltas R41 |
| Milestone | M08 |

### D-062 Sealed pockets

| field | value |
|---|---|
| Status | decided |
| Decision | `pocket.sealed` with `pauseBefore {z, layer}` written to the print card and `Metadata/custom_gcode_per_layer.xml`; floor at least 0.6 mm, roof at least 0.8 mm. |
| Rationale | COLLAR NFC pocket; print reality. |
| Evidence | `fab-knowledge:sources/benches/benches-coins-inlay.md` (COLLAR NFC pocket); `fab-knowledge:research/3dp-landscape.md` |
| Supersedes | v3 section 4 pocket; plan-deltas R42, R50 |
| Milestone | M00 (3mf pause events); M03 (COLLAR) |

### D-063 Pose, mirrorOnFlip, stack

| field | value |
|---|---|
| Status | decided |
| Decision | Sub parts printed in another orientation declare `pose` with volume parity asserted; face-down art and keyed features on flipped parts carry a `mirrorOnFlip` assertion; cut-sheet sensor stacks declare `stack` (layer role, material, outline registration, windows) so KEYWAY gates run on any surface. |
| Rationale | Every multicolour case mirrored by hand; KEYWAY gates need a stack. |
| Evidence | `fab-knowledge:sources/benches/benches-conductive-a.md` (FEELER pose); `fab-knowledge:sources/benches/benches-cases.md` (CASK lug angles); `fab-knowledge:sources/benches/benches-conductive-b.md` (KEYWAY stack) |
| Supersedes | plan-deltas R43, R44 |
| Milestone | M-1 (spec); M05 (stack for KEYWAY) |

## Constraints and checks

### D-064 Error contract

| field | value |
|---|---|
| Status | decided |
| Decision | CheckResult {id, version, verdict, severity, target, measured, legal, constraint, origin (hbf://check/<id>), fix?, extra?}; LegalValues interval carries `nearest`; Fix {param (JSON pointer into params), set, predicts {measured, verdict}} filled from the solver via `CheckDef.drivenBy`; a NaN or missing measured value is E_PARAM_MISSING. Error codes: E_SCHEMA, E_REF (with didYouMean), E_UNSAT, E_HANDLE, E_STALE, E_PROVENANCE, E_GATE, E_GATE_UNAVAILABLE, E_REPEAT, E_KERNEL, E_PARAM_MISSING. |
| Rationale | The error message sets the capability floor (agent-capability.md). |
| Evidence | `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/spec/contracts.ts` (LegalValues); `fab-knowledge:synthesis/api-library-ai-design.md` (section 6.1, 6.2); `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/knowledge/kernels/agent-capability.md` |
| Supersedes | v3 section 18; plan-deltas R53, R83 |
| Milestone | M-1 (spec); M00 (CLI skeleton) |

### D-065 Check targets

| field | value |
|---|---|
| Status | decided |
| Decision | CheckTarget covers part, body, feature, assembly, sheet, net, artifact (exported bytes), source, page and project; 19 project-level and 25 artifact checks become runnable. |
| Rationale | 19 project-level and 25 artifact checks could not run under CheckDef.run. |
| Evidence | `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/checks.seed.json` (targets 28/19/17/9/6/6); `fab-knowledge:synthesis/verified-claims.md` (C6) |
| Supersedes | plan-deltas R53 |
| Milestone | M04 |

### D-066 Seed conformance before M00

| field | value |
|---|---|
| Status | decided |
| Decision | A zod test over checks.seed.json, mechanisms.seed.yaml, circuits.seed.yaml and profile.seed.json: every check gets origin.date, a non-empty `what` (14 are empty), a legal-value kind and a version; `needs` uses KernelId. |
| Rationale | Seeds did not type-check against the spec they seed. |
| Evidence | `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/checks.seed.json`; `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/mechanisms.seed.yaml`; `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/circuits.seed.yaml`; `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/profile.seed.json`; `fab-knowledge:synthesis/verified-claims.md` (C6) |
| Supersedes | plan-deltas R53 (seed conformance) |
| Milestone | M-1 (T07) |

### D-067 Severity mapping

| field | value |
|---|---|
| Status | decided |
| Decision | Three severities, the seed vocabulary: block stops fabrication export, warn is shown, note is informational. No severity stops the build: every build completes and stores Part IR, and the checks read it. A kernel that cannot produce geometry is E_KERNEL, a command error and never a check result. Seeds register without a mapping step. Revised 2026-10-04 before M-1; the earlier text (Critical refuses the build, Major blocks export, Minor warns, Warning notes) is withdrawn. |
| Rationale | Checks read Part IR, which exists only after the build; a refused build leaves nothing to render, probe or locate a finding on, and no re-run to predict a fix. Severity names shared with Verdict (warn) or vague beside it (minor, warning) collided. The seeds use only block and warn (76 and 9). The CircuitLM four-level taxonomy was considered and set aside. |
| Evidence | `fab-knowledge:research/ai-tooling-and-api-design.md` (CircuitLM); `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/checks.seed.json` (severity values) |
| Supersedes | plan-deltas R53 |
| Milestone | M04 |

### D-068 CHK-3MF-06 rewritten

| field | value |
|---|---|
| Status | decided |
| Decision | Title: "every component p:path resolves to a model part in the package, other than the root model, and the referenced object id exists in that part". The gold Flash Studio save (three components in object 4 pointing at /3D/Objects/hackbuild-coin-nfc_2.model) passes; a p:path pointing at /3D/3dmodel.model or at a missing part fails (CASK empty-plate fixture). |
| Rationale | C-07: as titled it refused every Flash Studio save; validator implemented neither 06 nor 07. |
| Evidence | `fab-work-directory:benches/collar-coin/uploads/hackbuild-coin-nfc.3mf` (gold round trip); `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/3mf/validate_3mf.py` (line 119); `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/checks.seed.json` (CHK-3MF-06); `fab-knowledge:synthesis/verified-claims.md` (C2) |
| Supersedes | seed CHK-3MF-06 title; plan-deltas R50 |
| Milestone | M00 |

### D-069 CHK-3MF-07 rewritten

| field | value |
|---|---|
| Status | decided |
| Decision | Title: "per-filament vectors in project_settings.config have one element per filament and each element has the key's per-slot type; overhang_fan_threshold elements are percent strings matching ^[0-9]+%$, never bare numbers or nil". The gold ['95%','10%',...] passes. Length checks are scoped to template filament keys, so printer-scoped 4-element keys on the 4-extruder Creator 5 Pro pass. |
| Rationale | Gold has ['95%','10%',...]; the old title expected one value. |
| Evidence | `fab-work-directory:benches/collar-coin/uploads/hackbuild-coin-nfc.3mf` (project_settings.config); `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/checks.seed.json` (CHK-3MF-07); `fab-knowledge:synthesis/verified-claims.md` (C2) |
| Supersedes | seed CHK-3MF-07 title; plan-deltas R50 |
| Milestone | M00 |

### D-070 CHK-3MF-04 split

| field | value |
|---|---|
| Status | decided |
| Decision | Two parameters: coincidence inset 1 um by true edge normal, pinch inset 0.02 mm Miter (COTTER corner-touching QR modules). |
| Rationale | COTTER corner-touching QR modules needed the larger inset. |
| Evidence | `fab-knowledge:evidence/x/cotter-src` (applyArt HAIR); `fab-knowledge:sources/latest/cotter-sparger.md` |
| Supersedes | seed CHK-3MF-04; plan-deltas R52 |
| Milestone | M00 |

### D-071 Click-spring rise window (CHK-KEY-04)

| field | value |
|---|---|
| Status | decided |
| Decision | An FE-backed interval over Q with stated criteria: the spring snaps (drop above 0), drop at least `click.dropMin` (profile constant, default 0.5), strain at the stop at most the in-plane limit (2.5 percent PETG), and not bistable. At PIP defaults (l 24, t 0.55, w 1.6, E 1900, sw 3) the FE snaps from Q 1.2 (drop 0.01), drop is 0.293 at Q 1.51 and 0.303 at Q 1.52, strain reaches 2.50 percent at Q 2.2, and bistability starts at Q 2.32; the upper bound is 2.2 (strain) and the lower bound is the Q where drop reaches 0.5, computed by the solver at M01 (between Q 1.55, drop 0.335, and Q 2.0, drop 0.765). "Under 2.0 stops snapping" and the fixed 2.0 to 2.4 window are retired. |
| Rationale | C-04: FE sweep rerun on pip-controller snapfe.js. |
| Evidence | `fab-knowledge:evidence/x/pip-controller/src/snapfe.js`; `fab-knowledge:evidence/x/pip-controller/src/layout.js` (line 36); `fab-knowledge:evidence/x/fe2pip.cjs` (sweep rerun); `fab-knowledge:synthesis/verified-claims.md` (C1, C6 rise window row) |
| Supersedes | v3 section 7 and section 21 M1 (fixed 2.0 to 2.4, under 2.0 stops snapping); plan-deltas R47, R56 (about 1.8 to 2.2) |
| Milestone | M01 |

### D-072 Resistance budgets set floors

| field | value |
|---|---|
| Status | decided |
| Decision | R = rho L / (w t), so a maximum-resistance budget bounds width from below. The plan's example becomes: Protopasta printed XY 30 ohm cm (vendor), 62 mm, 0.72 mm, 8 kohm: floor 3.23 mm, with printability and fatigue floors 0.80 and a pitch ceiling 6.00, legal 3.23 to 6.00. At the PIP preset 500 ohm cm (inferred) the floor is 53.8 mm and the query returns E_UNSAT naming 71.8 kohm as the budget that fits 6.00. Each query reports which bound binds. |
| Rationale | C-01: v3 lines 319 to 326 printed the budget as a 1.20 ceiling and the band was empty. |
| Evidence | `fab-knowledge:evidence/x/plan-to-refine/PLAN.md` (lines 319 to 326); `fab-knowledge:synthesis/verified-claims.md` (C4); `fab-knowledge:synthesis/api-library-ai-design.md` (section 6.4) |
| Supersedes | v3 section 5 constraints example (ceil 1.20 resistance); plan-deltas R56 |
| Milestone | M01 |

### D-073 Strain limits by bend direction

| field | value |
|---|---|
| Status | decided |
| Decision | PETG snap and click strain: 2.5 percent for beams bent in the layer plane, an empirical limit from HAFT failures at 2.7 to 3.3 percent; 1.5 percent default (range 1.5 to 1.8) for beams bent across layers until a coupon. Stored per material with bend direction and provenance method `failure`. TDS elongation figures are not the basis. |
| Rationale | C-05; PETG HF 8.6/5.1 elongation unverified. |
| Evidence | `fab-knowledge:synthesis/verified-claims.md` (C4 PETG row); `fab-knowledge:research/3dp-landscape.md` (lines 504 to 516); `fab-knowledge:sources/latest/haft-toggle.md` (failures at 2.7 to 3.3 percent) |
| Supersedes | plan-deltas section 3 confirmation row (PETG HF 8.6/5.1 basis) |
| Milestone | M00 (profile rows); M01 (checks) |

### D-074 Expected-violation sets and capture assertions

| field | value |
|---|---|
| Status | decided |
| Decision | A chase may declare `expect` sets (SHUNT G7: exactly 5 shorts and 5 floating nets); the check passes only when the measured set equals the declared set. Capture assertions pass when interference exceeds a floor (DERRICK 33.4 mm3). |
| Rationale | Deliberate violations and captures shipped as hand exceptions. |
| Evidence | `fab-work-directory:benches/shunt` (G7 inverted gate); `fab-work-directory:benches/shim`; `fab-work-directory:benches/pintle-derrick` (DERRICK snap_check.py) |
| Supersedes | plan-deltas R53 |
| Milestone | M04 |

### D-075 Ungated metrics

| field | value |
|---|---|
| Status | decided |
| Decision | A reported metric has a gate or is labelled informational; DETENT rev C printed overhang area without a gate and let an inverted teardrop through. |
| Rationale | DETENT rev C printed overhang area ungated and let an inverted teardrop through. |
| Evidence | `fab-work-directory:benches/detent-printed/outputs/detent_parts.py` (rev C teardrop); `fab-knowledge:sources/benches/benches-machines.md` |
| Supersedes | plan-deltas R53 |
| Milestone | M04 |

## Electrical

### D-076 Per-MCU pin table

| field | value |
|---|---|
| Status | decided |
| Decision | Catalog rows with provenance: RP2040 (Pico inherits RP2040 GPIO, not checked separately against the Pico datasheet) pullup 50 to 80 kohm, VIL max 0.8 V, VIH min 2.0 V at IOVDD 3.3 V (RP2040 datasheet pp. 616 to 617); ESP32-C3 pullup 45 kohm typical, VIL max 0.825 V (0.25 VDD), VIH min 2.475 V (0.75 VDD) (datasheet v2.4 p. 55). `circuit.solve` classifies LOW, UNDEFINED, HIGH per MCU and sweeps a pullup range at both ends. The BOSS sim's 50 kohm constant and single 0.5 VIO threshold, and blocks.html's 0.3 to 0.7 VIO hint, are legacy, kept only to reproduce BOSS. |
| Rationale | C-02, verified-claims C5. |
| Evidence | `fab-knowledge:synthesis/verified-claims.md` (C5); `fab-work-directory:benches/blocks/outputs/boss/boss-src.zip` (src/sim.js lines 91 and 135); `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/designs/blocks/legacy/blocks.html` (0.3 to 0.7 VIO hint) |
| Supersedes | v3 section 2 (45k and fixed band); plan-deltas R12, R70 |
| Milestone | M05 (circuit.solve); M08 (catalog rows) |

### D-077 BLOCKS verdict scope

| field | value |
|---|---|
| Status | decided |
| Decision | Rerun facts (shipped boss-src, c3mini seat, 50 kohm pullup): with cPLA wires the pressed pin reads 1.31 V at 10 mm, 1.62 at 40, 1.92 at 80, 2.12 at 120, 2.24 at 150, 2.31 at 170 and 2.39 to 2.42 at 200 (straight, zigzag, spiral); with the default cTPU wires it reads 3.15 to 3.27 V for every shape and length and the press is never seen. Against the 0.99 to 2.31 V hint band the verdict holds for short to medium cPLA wires; against the ESP32-C3 band every cPLA case is undefined; under RP2040 thresholds 2.05 V reads HIGH and the press is missed. The page states 50 kohm, the wire material, and that it applies to carbon-filled filament. |
| Rationale | C-03. |
| Evidence | `fab-knowledge:synthesis/verified-claims.md` (C5); `fab-work-directory:benches/blocks/outputs/boss/boss-src.zip` |
| Supersedes | v3 section 2 novel claim example and section 21 M5; plan-deltas R12 (verdict holds at 1.31 to 2.05 V) |
| Milestone | M05 |

### D-078 Read models on port

| field | value |
|---|---|
| Status | decided |
| Decision | `port.read`: pullup, charge-release, adc, ratiometric, column-scan, ladder, with per-net outputs tau, wait and reject; the firmware emitter reads them. Waits are calibrated from a coupon; computed waits carry the computed qualifier. |
| Rationale | PIP measured crossings 10 to 30x computed settle on most keys. |
| Evidence | `fab-knowledge:evidence/x/pip-controller/docs/electrical.md`; `fab-knowledge:sources/latest/haft-toggle.md`; `fab-work-directory:benches/baffle`; `fab-work-directory:benches/feeler-thinpot/outputs/feeler.html` (dividerR, niceR) |
| Supersedes | plan-deltas R49 |
| Milestone | M05 |

### D-079 PIP timing figures

| field | value |
|---|---|
| Status | decided |
| Decision | Computed RC time constant 15.7 us and settle 78 us (5 tau); measured press crossings 113 us (RIGHT) to 2431 us (UP); eight of ten keys cross at 1067 to 2431 us (10 to 30 times computed), RIGHT at 1.4x and SELECT at 5.3x. Drive pad rows: touch paths 0.91 to 0.93 Mohm, key paths 1.5 to 1.72 Mohm, skin 1 to 20 Mohm (bench assumes 20), touch reject under about 4 Mohm (4.35 computed), touch accepts under about 58 Mohm. Emitted firmware uses 3500 us (pip_stick) until a coupon calibrates the wait. |
| Rationale | verified-claims C1; replaces v3 drive example 140 kohm, 1.3 us. |
| Evidence | `fab-knowledge:evidence/x/pip-controller/README.md` (lines 155 to 180); `fab-knowledge:evidence/x/pip-controller/docs/electrical.md` (lines 34 to 41, 55 to 57); `fab-knowledge:evidence/x/pip-controller/firmware/pip_stick/pip_stick.ino` (line 25); `fab-knowledge:evidence/x/pip-controller/print/print-card.txt`; `fab-knowledge:synthesis/verified-claims.md` (C1) |
| Supersedes | v3 section 10 drive pad example (about 140 kohm, 1.3 us; PLAN.md:592); plan-deltas R47, R49 |
| Milestone | M05 |

### D-080 pip.ino KEY_WAIT_US 200

| field | value |
|---|---|
| Status | owner |
| Decision | Default: hackbuild-fab does not edit pip-controller; the gap is recorded in RISKS.md and in the archetype provenance; the owner decides whether to raise pip.ino to 3500 us. |
| Rationale | C-06: only pip_stick was raised. |
| Evidence | `fab-knowledge:evidence/x/pip-controller/firmware/pip/pip.ino` (line 20 KEY_WAIT_US 200); `fab-knowledge:evidence/x/pip-controller/firmware/pip_stick/pip_stick.ino` (line 25 KEY_WAIT_US 3500); `fab-knowledge:synthesis/verified-claims.md` (C1) |
| Supersedes | plan-deltas section 0 item 1 (claimed KEY_WAIT_US went to 3500) |
| Milestone | none |

### D-081 Resistivity rows and the working default

| field | value |
|---|---|
| Status | decided |
| Decision | Rows: Yousu cPLA and cTPU raw filament 240 to 481 ohm cm (vendor, 100 to 200 kohm per 10 cm of 1.75 mm filament, never scaled onto printed traces); PIP preset cPLA 500 along and 2000 through, cTPU 400 (inferred, pip-controller src/layout.js:46, the Yousu default row in docs/electrical.md); Protopasta cPLA 15 molded, 30 printed XY, 115 Z (vendor); Nowka 2024 Protopasta printed 11.69 parallel, 16.37 perpendicular, 8.005 through (measured by others, Protopasta only); Capricate Torwell cABS 0.438, 0.817, 0.998 (measured by others); Electrifi printed 0.021, 0.048, 0.061 with vendor grades 0.01 and 0.1; Eel cTPU inferred with no reference value; GUDGEON 4 kohm per cm moves from the ctpu row to cpla with its section unknown. The working cpla row is the PIP preset (inferred), the shop's shipped preset for its Yousu spools; CHK-NET-05 warns while the tier is inferred. |
| Rationale | C-09, verified-claims C3. |
| Evidence | `fab-knowledge:evidence/x/pip-controller/src/layout.js` (line 46); `fab-knowledge:evidence/x/pip-controller/docs/electrical.md` (lines 15 to 17); `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/profile.seed.json` (lines 46, 68); `fab-knowledge:synthesis/verified-claims.md` (C3); `fab-knowledge:research/3dp-landscape.md` |
| Supersedes | seed profile cPLA 30 ohm cm; plan-deltas R57 cPLA row and section 0 item 7 (8 to 16x) |
| Milestone | M00 (profile) |

### D-082 Physical measurements

| field | value |
|---|---|
| Status | owner |
| Decision | Default: none until the owner prints them: Yousu cPLA and cTPU four-wire coupon along, across and through at shop settings; real RP2040, Pico and C3 pullups and thresholds; SG90 dimensions; KNUCKLE hinge and TENON threads; COTTER hook on the real board. Until then fabrication exports carry inferred warnings and public claims state the tier. |
| Rationale | Only the owner can measure on the shop's machines. |
| Evidence | `fab-knowledge:synthesis/plan-deltas.md` (section 4, D24) |
| Supersedes | plan-deltas D24 |
| Milestone | none (gates the fabrication tier) |

### D-083 Provenance tier ladder

| field | value |
|---|---|
| Status | owner |
| Decision | Default: five tiers, highest first: verified (manufacturer drawing, parsed), measured (shop coupon with machine, coupon id, date, method), vendor, community, inferred. |
| Rationale | Plan listed four, contracts.ts and seed added measured. |
| Evidence | `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/spec/contracts.ts` (tiers with measured); `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/profile.seed.json`; `fab-knowledge:evidence/x/plan-to-refine/PLAN.md` (section 9 (four tiers)) |
| Supersedes | v3 section 9 tier list; plan-deltas R57 provenance row, D16 |
| Milestone | M00 (profile) |

### D-084 Bleed

| field | value |
|---|---|
| Status | decided |
| Decision | A profile field per (machine, material pair), default 0 until a coupon measures it, applied once at emit including coupons. The published PIP draws 1.4 mm traces with no bleed and its coupon matches its controller geometry; the 0.15 bleed, 1.25 drawn width and 0.75 gap belong to the unpublished HAFT source. |
| Rationale | C-06. |
| Evidence | `fab-knowledge:evidence/x/pip-controller/src/layout.js` (lines 27 to 28); `fab-knowledge:evidence/x/pip-controller/src/coupon.js`; `fab-knowledge:sources/latest/haft-toggle.md` (line 161); `fab-knowledge:synthesis/verified-claims.md` (C1) |
| Supersedes | plan-deltas R52 bleed bullet (PIP bleed 0.15) |
| Milestone | M00 (profile field); M05 (emit) |

### D-085 Buried stack defaults

| field | value |
|---|---|
| Status | decided |
| Decision | From PIP: skin 0.72, trace layer 0.72, isolation 0.96, PETG over layer 2 1.68 on the 0.72 floor, trace width 1.4, net-to-net floor 0.60 (computed off the model by the net check). The v3 values 0.48 insulation, 0.48 over layer 2 and 0.3 net floor are retired. |
| Rationale | verified-claims C1. |
| Evidence | `fab-knowledge:evidence/x/pip-controller/src/layout.js` (lines 27 to 28); `fab-knowledge:evidence/x/pip-controller/docs/electrical.md` (lines 77 to 82); `fab-knowledge:evidence/x/pip-controller/print/print-card.txt`; `fab-knowledge:synthesis/verified-claims.md` (C1) |
| Supersedes | v3 section 7 and section 21 M5 (0.48 values); plan-deltas R47 buried stack row (0.75 measured) |
| Milestone | M05 |

### D-086 Circuit engine

| field | value |
|---|---|
| Status | decided |
| Decision | Analytic DC (nodal analysis over the extracted resistor network) in the offline bake; eecircuit-engine 1.8.0 (ngspice 45.2, MIT; one 19 MB ESM file, 43 MB unpacked package) loaded lazily for device models and transients. Timing figures are one machine's measurement (this host: start 449 ms, .op median 0.365 ms). |
| Rationale | Closes v3 open decision 13; rerun measured start 449 ms, .op median 0.365 ms. |
| Evidence | `fab-knowledge:synthesis/verified-claims.md` (C9); `fab-knowledge:research/code-cad-and-eda-tooling.md` |
| Supersedes | v3 open decision 13; plan-deltas R59 |
| Milestone | M05 |

### D-087 BLOCKS canonical standard

| field | value |
|---|---|
| Status | owner |
| Decision | Default: none until a print. BOSS v1 is sockH 2.4, flangeH 0.72, trace 0.72, gap 0.48, L 0.24; the later blocks.html is sockH 2.2, flange 0.6, trace 0.6, gap 0.4, L 0.2 and exports 0.2; the export layer must equal the chosen standard. The stale 0.24 text in blocks.html (PRINT NOTES, DEFAULT_PRINTER, printCard fallback) is fixed on port. |
| Rationale | Two standards shipped. |
| Evidence | `fab-work-directory:benches/blocks/outputs/boss/boss-src.zip` (src/boss.js, src/export.js); `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/designs/blocks/legacy/blocks.html`; `fab-knowledge:synthesis/verified-claims.md` (C5) |
| Supersedes | plan-deltas R47 blocks-stud row, D17 |
| Milestone | M05 (BLOCKS port) |

### D-088 SuperMini dual-supply jumper default

| field | value |
|---|---|
| Status | owner |
| Decision | Default: normally open (SPINDLE), against TRUNNION's normally closed. |
| Rationale | The canon must fix one default. |
| Evidence | `fab-work-directory:benches/trunnion` (SJ1 normally closed); `fab-work-directory:benches/spindle` (normally open); `fab-knowledge:sources/benches/benches-copper-pcb-b.md` |
| Supersedes | plan-deltas R47, D18 |
| Milestone | M06 (archetype default); M08 (board) |

### D-089 Board backends

| field | value |
|---|---|
| Status | decided |
| Decision | Two backends, tscircuit capture and the gated direct-emit Python route, both emitting one pad and net record so CHK-BRD runs on either. The seed face convention is fixed to SHUNT's (world z = -board y, rotation.y = +rot, model z negated with winding swap, flipY true, per-string glyph mirror, BACK preset at azimuth PI); SHUNT's lead-landing proof joins check3d.mjs; two CPL writers by assembler. Amended 2026-10-11 (audit3): a direct-route board's generator (gen.py beside its chase) is design code that runs as the user, under D-201's rule that a person reviews code they did not write. core runs it through the tools/py interpreter; on darwin under sandbox-exec (no network, writes only inside the fresh folder of its run, no program started but that interpreter, a minimal environment), and a denial stops the build with E_KERNEL record build-sandbox/generator (spec BUILD_SANDBOX_REASONS). Reads are unrestricted, so a hostile gen.py can copy any file the user can read into its fab outputs. On Linux and Windows it runs unconfined; a Linux confinement (bwrap --unshare-net with the run folder bound writable) is not implemented. |
| Rationale | Verified boards came from gated Python; tscircuit boards in corpus shipped errors (AUGER 58 unroutable, GROMMET 5 DRC). |
| Evidence | `fab-work-directory:benches/shunt/outputs/shunt-r1/check3d_shunt.mjs`; `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/board/check3d.mjs`; `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/board/sim-template.html` (old face convention); `fab-knowledge:sources/benches/benches-copper-pcb-a.md` |
| Supersedes | v3 section 5 board (wrap tscircuit); plan-deltas R61 |
| Milestone | M-1 (T10 seed fixes); M08 |

### D-090 KiCad files

| field | value |
|---|---|
| Status | decided |
| Decision | kicadts (MIT in LICENSE and GitHub metadata; package.json has no license field, recorded in the licence audit); pygerber and gerbonara for reparse. KiCad 11 adds headless IPC through kicad-cli and schematic plugins; revisit then. |
| Rationale | kiutils GPL-3.0, last commit 2024-05-02, KiCad 10 untested. |
| Evidence | `fab-knowledge:synthesis/verified-claims.md` (C9); `fab-knowledge:evidence/x/web-code-cad-tooling` |
| Supersedes | v3 section 15 kiutils; plan-deltas R61, R73 |
| Milestone | M08 |

### D-091 Circuit JSON interop

| field | value |
|---|---|
| Status | decided |
| Decision | Emit printed parts as source_component ftype printedpart (type source_printed_part) with cad_component.model_3mf_url; read clearance errors' actual_clearance and minimum_clearance; read tscircuit assembly.printedpart, enclosure.fdm.box, enclosure.cutoutaperture and insertionDirection into port and pocket features. |
| Rationale | verified-claims C9 field names. |
| Evidence | `fab-knowledge:synthesis/verified-claims.md` (C9 Circuit JSON rows) |
| Supersedes | plan-deltas R61 |
| Milestone | M08 |

### D-092 Copper router

| field | value |
|---|---|
| Status | decided |
| Decision | One router: PIP core (0.5 grid, 8-connected, octile, negotiation 0.6 x 1.7, history 0.8, Prim trees) with TOGGLE's assignment DP, layer escalation and cache, Float64 costs, a Manhattan mode for vinyl, the lane ranker as one primitive with orientation as a parameter, the SPLICE ladder rule (0.94 mm at 2.54 pitch with 1.6 traces) and the erosion-skeleton weedability proof. |
| Rationale | Seven routers in the corpus; BAFFLE float32 starved the frontier. |
| Evidence | `fab-knowledge:evidence/x/pip-controller/src`; `fab-knowledge:evidence/x/toggle/src/src`; `fab-work-directory:benches/baffle` (float32 cost array); `fab-knowledge:sources/benches/benches-copper-pcb-b.md` (SPLICE); `fab-knowledge:synthesis/verified-claims.md` (C4 SPLICE row); `fab-knowledge:synthesis/patterns-and-lineage.md` (section 2.7) |
| Supersedes | v3 section 5 copper; plan-deltas R62 |
| Milestone | M05 |

### D-093 link and device safety

| field | value |
|---|---|
| Status | decided |
| Decision | Wrap conduyt-js 1.0.0 as one driver (the seed skill retargets from 0.2.1); extract hackbuild-bench's driver contract, transports, capability vocabulary and sim twins; safety rules: duty-cycle limits in the lowest driver, clamp remote input, config authority as (value, rev, origin), never execute a CLASP SNAPSHOT replay, arm confirmed by telemetry, stop on page unload. The CLASP frame payload is uint16 (65535 bytes max); the JPEG check uses 65439 (LOUVER maxJpegBytes = 65535 minus 96) or computes 65535 minus the encoded PUBLISH overhead for the actual address. |
| Rationale | C-11, C-17; closes v3 open decision 7. |
| Evidence | `hackbuild-bench/src/core/drivers/conduyt/index.ts`; `hackbuild-bench/package.json` (conduyt-js ^1.0.0); `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/references/conduyt-SKILL.md` (line 10, 0.2.1); `fab-work-directory:benches/louver-clasp/outputs/LOUVER/LOUVER.ino` (line 134); `fab-knowledge:synthesis/verified-claims.md` (C14 CLASP row) |
| Supersedes | v3 open decision 7; plan-deltas R54 device row (65470), R64 |
| Milestone | M13 |

### D-094 rtl-sdr GPL driver

| field | value |
|---|---|
| Status | owner |
| Decision | Default: stays in the hackbuild-bench app only. |
| Rationale | librtlsdr port licence blocks MIT extraction. |
| Evidence | `fab-knowledge:sources/repos/hackbuild-bench-and-ui.md` (rtl-sdr port) |
| Supersedes | plan-deltas R64, D15 |
| Milestone | M13 |

## Canons, reference, profile, catalog

### D-095 Two canon registries with typed definitions

| field | value |
|---|---|
| Status | decided |
| Decision | `mechanisms` and `archetypes` registries; MechanismDef and ArchetypeDef with computed `derive()` in TypeScript; YAML equations become docs. |
| Rationale | Seed equations were strings with mismatched variables; closes v3 open decision 19. |
| Evidence | `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/mechanisms.seed.yaml` (string equations); `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/spec/contracts.ts` (RegistryKind) |
| Supersedes | v3 open decision 19; plan-deltas R46, R89 |
| Milestone | M06 |

### D-096 Canon corrections

| field | value |
|---|---|
| Status | decided |
| Decision | count-wheel-detent default clr 0.4 gives 0.74 N at 0.48 percent (k = 3E(h t^3/12)/L^3 = 0.9216 N/mm at E 2000, t 1.6, L 20, h 3.6), 0.97 N at 0.63 percent kept as the clr 0.15 jam record; the seed formula's cube on w is fixed to t; Geneva dwell (n+2)/(2n), index (n-2)/(2n), alpha 180 - 360/n; slew ring numbers from PINTLE; snap family of five sharing PLINTH's strain verdict (3 t d / (2 L^2), ok under 2.6, warn under 3.4); counterbalance band (DERRICK about 500 gf at 47.6 mm, 501 gf for exactly 234 N mm); integer metering ratio (SLUG 76/19 = 4); crank-yoke (OGEE16 2R sin(SW) = stroke, SW 48.59 deg at R 6, stroke 9); click-spring-key at PIP defaults (2.527 N peak at 0.629 mm, 76.5 percent drop, contact 1.369 mm, eStop 2.31 percent; the v3 numbers reproduce at l 22, t 0.5 as 2.282 N and 1.245 mm); stick reads by charge and release with its pad printed in place (470k belongs to TOGGLE at Protopasta 30 ohm cm); astable blinky split into TACK (100k, 10 uF, 0.72 Hz) and SHIM (33k, 22 uF, about 1 Hz); three-source power ORing demoted to unproven; hex key across flats 18.53; membrane slider split into FEELER thinpot, GIB membrane and TANG R6 wall; SAO v1.69bis port (2x3 at 2.54, 3V3, GND, SDA, SCL, GPIO1, GPIO2, about 820 mW); pi-hat with EEPROM and back-power checks; SuperMini pad map tier vendor until calipers; wire-cup trace-between claim dropped (pip-controller docs/printing.md:90-92, src/model.js:518: gap 2.0 under lane 3.0). |
| Rationale | verified-claims C1, C4; plan-deltas R46, R47. |
| Evidence | `fab-work-directory:benches/knurl/outputs/knurl/knurl.html` (lines 566 to 649); `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/mechanisms.seed.yaml` (lines 92, 94); `fab-knowledge:evidence/x/pip-controller/src/layout.js` (line 36); `fab-knowledge:evidence/x/pip-controller/docs/printing.md` (lines 90 to 92); `fab-knowledge:evidence/x/pip-controller/src/model.js` (line 518); `fab-work-directory:benches/cresset-plinth/outputs/plinth.html` (lines 2928 to 2929); `fab-knowledge:synthesis/verified-claims.md` (C1, C4) |
| Supersedes | v3 sections 6 and 7 canon values; plan-deltas R46, R47 |
| Milestone | M06 |

### D-097 Canon content in M06

| field | value |
|---|---|
| Status | decided |
| Decision | M06 ships the 24 seeded mechanisms as typed defs (the 11 id-only entries get equations or are marked stubs), the four PIP buttons, all 29 archetypes with tiers, and FEELER THINPOT's 22 printed archetypes as candidates (encoder B phase fixed to step/4, `P.armW` defined). |
| Rationale | Closes v3 open decision 9. |
| Evidence | `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/mechanisms.seed.yaml` (24 entries); `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/circuits.seed.yaml` (29 entries); `fab-work-directory:benches/feeler-thinpot/outputs/feeler.html` (22 archetypes); `fab-knowledge:synthesis/verified-claims.md` (C6) |
| Supersedes | v3 open decision 9; plan-deltas R46, R47 |
| Milestone | M06 |

### D-098 Archetype resistances at load

| field | value |
|---|---|
| Status | decided |
| Decision | Computed from profile resistivity and the declared section at load time, so one coupon updates every archetype and the tier propagates. |
| Rationale | Seed resistances were computed from inferred resistivity on an assumed 1.0 x 0.72 section. |
| Evidence | `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/circuits.seed.yaml` (printed-rotary-pot 709k and 14k); `fab-knowledge:sources/plan/seed-landscape-gaps.md` |
| Supersedes | plan-deltas R48 |
| Milestone | M06 |

### D-099 Provenance fields

| field | value |
|---|---|
| Status | decided |
| Decision | {machine, coupon, date, method, tier, conditions {temperature, speed, layer, lineWidth, direction}}; methods include datasheet, coupon, failure, felt, listing, derived. |
| Rationale | Nowka shows print conditions move resistivity; OGEE16 bands were raised by feel. |
| Evidence | `fab-knowledge:synthesis/verified-claims.md` (C3 Nowka row); `fab-work-directory:benches/ogee16/outputs/ogee16-source.zip` (fits.py bands raised by feel) |
| Supersedes | plan-deltas R57 print conditions and provenance rows |
| Milestone | M00 |

### D-100 Fits and loss

| field | value |
|---|---|
| Status | decided |
| Decision | Material-level loss wins over machine-level when both exist; one loss table keyed by (process A, process B, motion); `realGap` takes layer height and returns both sides; the mixed fit class is PSLIP at 0.15 until a mixed coupon says otherwise (PSLIDE dropped); realGap(0.55, hole, ffc5p, petg) = 0.15 is pinned by test. |
| Rationale | Three incompatible loss models in KNUCKLE, TUMBLER, OGEE. |
| Evidence | `fab-knowledge:evidence/x/knuckle`; `fab-work-directory:benches/tumbler`; `fab-work-directory:benches/ogee16/outputs/ogee16-source.zip`; `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/knowledge/00-constants.md` (PRINT_OVER 0.10) |
| Supersedes | plan-deltas R57 process loss, PRINT_OVER and fit band rows |
| Milestone | M00 |

### D-101 Machines

| field | value |
|---|---|
| Status | decided |
| Decision | ffc5p (Flashforge Creator 5 Pro, 4 extruders, 0.4 nozzle preset; a 0.25 nozzle preset exists in 3d/coin/hsl.3mf), centauri (Elegoo Centauri Carbon, 256 mm cube), laser1220 and sheet600 with kerf null until measured; dated presets keyed like `ffc5p_20260919`; one PETG table harvested from the gold round trip. |
| Rationale | 24 of 25 owner 3MFs use the 0.4 preset; four PETG tables disagreed. |
| Evidence | `3d/coin/hsl.3mf` (0.25 nozzle preset); `3d` (24 of 25 on the 0.4 preset); `fab-work-directory:benches/collar-coin/uploads/hackbuild-coin-nfc.3mf` (PETG table); `fab-knowledge:synthesis/verified-claims.md` (C2) |
| Supersedes | plan-deltas R57 machines and PETG rows |
| Milestone | M00 |

### D-102 Catalog gate

| field | value |
|---|---|
| Status | decided |
| Decision | Tiers on every part row; an inferred part is usable in sim and refused at fabrication export with E_PROVENANCE (exit 4); listing-derived bought parts are vendor tier; imported meshes are checked for winding (the rp2040 pizero standin has signed volume -6506 mm3). |
| Rationale | Every board that went wrong used a part from memory; rp2040 standin has signed volume -6506 mm3. |
| Evidence | `fab-knowledge:sources/benches/benches-cases.md`; `fab-knowledge:sources/latest/cotter-sparger.md` (SPARGER W ghosts); `fab-knowledge:synthesis/plan-deltas.md` (R70 rp2040 standin) |
| Supersedes | v3 section 9 (catalog refuses inferred, kept); plan-deltas R70 |
| Milestone | M08 |

### D-103 Catalog storage

| field | value |
|---|---|
| Status | decided |
| Decision | Verified and vendor rows are committed data in the catalog package; external lookups (KiCad libraries, easyeda2kicad, distributor APIs) run on demand into the `.hbf` cache with provenance. |
| Rationale | Closes v3 open decision 10. |
| Evidence | `fab-knowledge:evidence/x/plan-to-refine/PLAN.md` (section 9, section 22 open decision 10) |
| Supersedes | v3 open decision 10 |
| Milestone | M08 |

### D-104 Actuator rows

| field | value |
|---|---|
| Status | decided |
| Decision | One row type for servos and geared steppers: `mout` separate from the anatomical axis, can, slew, reflected inertia, stall and holding torque, per-field provenance including "scaled from drawing"; PAWL 15BY-GM12 and WASHER servo presets are fixtures; SG90 conflicts (shaft offset 5.3 to 5.9, width 12.2 to 12.4) stay inferred until measured. |
| Rationale | SG90 shaft offset 5.3 to 5.9 across benches. |
| Evidence | `fab-work-directory:benches/pawl/outputs/pawl.html` (15BY-GM12); `fab-work-directory:benches/washer`; `fab-work-directory:benches/davit`; `fab-work-directory:benches/pintle-derrick`; `fab-knowledge:sources/benches/benches-robots-a.md` |
| Supersedes | plan-deltas R70, R71 |
| Milestone | M08 |

### D-105 Reference library rules

| field | value |
|---|---|
| Status | decided |
| Decision | `reference/<area>/<id>/` with chase.ts, build.ts, README.md, `expected/` (build.json, report.json, edit.json, artifacts.json, section.png) and `covers: [ids]`; INDEX generated from folders; references are written in the milestone that admits the item; first entries: resistivity coupon, keys flex-pair, knuckle hinge, Capricate reproduction, fit-gauge coupon. |
| Rationale | INDEX ids did not match canon ids; coverage must be computable. |
| Evidence | `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/scaffold/reference`; `fab-knowledge:sources/plan/seed-landscape-gaps.md` (INDEX ids vs canon ids); `fab-knowledge:synthesis/mappings.md` (section 8) |
| Supersedes | v3 section 8; plan-deltas R67, R68 |
| Milestone | every milestone; coverage closes at M11 |

## Agent surface

### D-106 CLI commands

| field | value |
|---|---|
| Status | decided |
| Decision | 30 commands in six groups. query: constraints.query, catalog.find, catalog.pins, mech.find, mech.derive, arch.find, knowledge.search, reference.list. author: chase.scaffold, chase.validate, chase.diff, chase.patch, arch.apply. build: part.build, part.inspect, part.probe, asm.solve. prove: check.run, fits.table, sim.run, sim.sweep, circuit.solve, motion.run, rules.audit. look: view.render, chase.render, project.graph. make: chase.bake, nest.pack, export.run. Utility verbs without verdicts: mcp, doctor, explain, gc, parity, counts. A test pins the count; raising it edits the test and the reason line in one commit. asm.declare folds into part.build. |
| Rationale | Counts drifted 20 to 30 across six files. |
| Evidence | `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/spec/chase.ts` (line 211, 28 commands); `fab-knowledge:evidence/x/plan-to-refine/PLAN.md` (section 17 lines 879 to 886); `fab-knowledge:synthesis/api-library-ai-design.md` (section 5.1); `fab-knowledge:synthesis/verified-claims.md` (C6) |
| Supersedes | v3 section 17; plan-deltas R82 |
| Milestone | M00 (first three); each milestone adds its own |

### D-107 MCP tools

| field | value |
|---|---|
| Status | decided |
| Decision | 19 tools, underscore names matching ^[a-zA-Z0-9_-]{1,128}$, fixed order: constraints_query, catalog_search, canon_search, mech_derive, knowledge_search, chase_scaffold, chase_validate, chase_patch, arch_apply, part_build, part_probe, asm_solve, check_run, sim_run, circuit_solve, motion_run, view_render, chase_bake, export_run. Every read tool sets annotations explicitly (defaults are readOnly false, destructive true). Toolset profiles `all`, `query,prove`, `sweep`. |
| Rationale | C-12: Claude API names match ^[a-zA-Z0-9_-]{1,128}$; OpenAI guidance under 20 functions at turn start; MCP defaults readOnly false, destructive true. |
| Evidence | `fab-knowledge:synthesis/api-library-ai-design.md` (section 5.2); `fab-knowledge:synthesis/verified-claims.md` (C10, C11) |
| Supersedes | v3 section 17 (dotted names); plan-deltas R82, R83, D13 |
| Milestone | M12 |

### D-108 MCP stack

| field | value |
|---|---|
| Status | decided |
| Decision | @modelcontextprotocol/server ^2.3.0 with @modelcontextprotocol/core, zod/v4, protocol 2026-07-28: stateless (no initialize handshake, no Mcp-Session-Id), `server/discover` implemented, tasks via the io.modelcontextprotocol/tasks extension (working, input_required, completed, failed, cancelled; a check failure is a completed result with a fail verdict). |
| Rationale | C-11: @modelcontextprotocol/sdk ^2 does not exist. |
| Evidence | `fab-knowledge:synthesis/verified-claims.md` (C10); `fab-knowledge:synthesis/api-library-ai-design.md` (section 6.5) |
| Supersedes | v3 section 18 and handoff scaffold (@modelcontextprotocol/sdk ^2); plan-deltas R73 MCP row, R83 |
| Milestone | M12 |

### D-109 Export gate

| field | value |
|---|---|
| Status | decided |
| Decision | A fabrication export (ExporterDef.fabrication true) runs build and checks first and never asks for a failing build. With a client that declared elicitation, the server returns resultType input_required with one flat form and an HMAC-SHA256 requestState binding command, args digest, build hash, 10-minute expiry and a single-use nonce stored in `.hbf/gate-used.jsonl`; a moved build hash re-asks. argsDigest is sha256 of RFC 8785 JSON of the args with requestState removed and every null or false-default field dropped. Without elicitation it returns E_GATE_UNAVAILABLE naming the CLI line. Host side: `ask` on `mcp__hbf__export_run`. The CLI requires an interactive TTY and has no bypass flag. The prompt says approval does not identify who approved. No standing env token. |
| Rationale | MRTR spec requires integrity-protected, bound, single-use state. |
| Evidence | `fab-knowledge:synthesis/api-library-ai-design.md` (section 6.5); `fab-knowledge:synthesis/verified-claims.md` (C10 MRTR row) |
| Supersedes | v3 section 18 safety boundary; plan-deltas R83 (standing env token dropped) |
| Milestone | M00 (CLI TTY gate); M12 (MCP gate) |

### D-110 Output size

| field | value |
|---|---|
| Status | decided |
| Decision | `--detail summary` is the default, capped at 5,000 tokens with a cursor in `truncated`. Claude Code's 25,000-token MCP output default (MAX_MCP_OUTPUT_TOKENS, per-tool _meta anthropic/maxResultSizeChars up to 500,000 characters) is a host setting the server never relies on. |
| Rationale | C-12: the limit is a changeable default. |
| Evidence | `fab-knowledge:synthesis/verified-claims.md` (C10 Claude Code row) |
| Supersedes | plan-deltas R83 (25,000 token cap stated as fixed) |
| Milestone | M12 |

### D-111 Loop detection

| field | value |
|---|---|
| Status | decided |
| Decision | `.hbf/calls.jsonl` keyed on workspace and branch: the same command and inputsHash three times in 30 minutes, or four failing builds with one reportHash, returns E_REPEAT naming a diagnostics record. |
| Rationale | Sessions are gone in MCP 2026-07-28. |
| Evidence | `fab-knowledge:synthesis/api-library-ai-design.md` (section 6.6) |
| Supersedes | plan-deltas R83 |
| Milestone | M12 |

### D-112 Agent docs

| field | value |
|---|---|
| Status | decided |
| Decision | An `hbf` skill modelled on tscircuit/skill (staged checks, exit codes, stop rules), path-scoped `.claude/rules/` built from kernel records, `llms.txt` under 20 KB with `.md` twins, resource templates for every registry entry, prompts from the worked sessions, input examples drawn from references on complex commands. |
| Rationale | Anthropic reports 72 to 90 percent complex-parameter accuracy with examples; tool search cut definition context about 77K to 8.7K. |
| Evidence | `fab-knowledge:synthesis/api-library-ai-design.md` (section 9); `fab-knowledge:synthesis/verified-claims.md` (C9 tscircuit/skill, C11 input examples) |
| Supersedes | plan-deltas R84 |
| Milestone | M12 |

### D-113 Name freeze after eval

| field | value |
|---|---|
| Status | decided |
| Decision | An Inspect eval compares prefix (`part_build`) and suffix (`build_part`) names on a local 30B and a Sonnet-class model before names freeze at kernel 1.0. |
| Rationale | Measure before freezing. |
| Evidence | `fab-knowledge:synthesis/api-library-ai-design.md` (section 4); `fab-knowledge:synthesis/plan-deltas.md` (section 4, D13) |
| Supersedes | plan-deltas D13 |
| Milestone | M12 |

### D-114 Agentic first

| field | value |
|---|---|
| Status | decided |
| Decision | The hbf CLI with CommandResult and the error contract exists from M00 (part.build, check.run, export.run for 3mf); each milestone adds its commands; the MCP projection freezes at M12. |
| Rationale | The error format has to be there from the first check. |
| Evidence | `fab-knowledge:evidence/x/plan-to-refine/PLAN.md` (section 2 The endgame, and why the order is agentic first); `fab-knowledge:synthesis/api-library-ai-design.md` (section 2) |
| Supersedes | v3 section 2 (kept, made concrete) |
| Milestone | M00 through M12 |

### D-115 Writes on a branch

| field | value |
|---|---|
| Status | decided |
| Decision | Written changes go to `hbf/<chase>` through chase.patch, whose text anchors must match exactly once (E_STALE otherwise) or whose JSON pointers must resolve. |
| Rationale | v3 required anchored patches with no carrier command. |
| Evidence | `fab-knowledge:evidence/x/plan-to-refine/PLAN.md` (section 18); `fab-knowledge:synthesis/api-library-ai-design.md` (section 5.1) |
| Supersedes | v3 section 18 (anchored patches without a command) |
| Milestone | M10 |

## UI

### D-116 Design system dependency

| field | value |
|---|---|
| Status | decided, owner, 2026-10-13 |
| Decision | Owner, 2026-10-13: push hackbuild-ui main, rebase the bench branch, push it and merge the 0.3.0 PR; 0.3.0 is not published to npm, so fab keeps the vendored tarball route of D-256. hackbuild-fab depends on @virgilvox/hackbuild-ui ^0.2.0 (65 Vue SFCs, 161 distinct .hb- selectors in dist/styles/hackbuild.css, GUIDELINES v1.2). The bench layer (HbSteps, HbGuide, HbStageOverlay, HbMaterials, HbWelcome, HbParamRow; classes .hb-steps, .hb-guide, .hb-prow, .hb-cams, .hb-legend, .hb-hud, .hb-stagebar, .hb-mat, .hb-welcome) is upstreamed as package 0.3.0 carrying GUIDELINES v1.3. Bakes inline dist/styles/hackbuild.css; CI checks the baked CSS hash against the pinned version. |
| Rationale | the owner's rules files say consume the library and grow it upstream. |
| Evidence | `hackbuild-ui/GUIDELINES.md` (v1.2); `hackbuild-ui/CLAUDE.md`; `hackbuild-bench/RULES.md`; `fab-knowledge:synthesis/verified-claims.md` (C7 hackbuild-ui rows); `fab-knowledge:synthesis/aesthetic-voice-ux-bible.md` (section 5.1) |
| Supersedes | v3 sections 3, 11, 12 (theme copied, never a package); plan-deltas R26 |
| Milestone | M09 |

### D-117 Design system package name

| field | value |
|---|---|
| Status | owner |
| Decision | Default: keep @virgilvox/hackbuild-ui, the name that installs today; @hackbuild/ui is the alternative its README names. |
| Rationale | Rename is the owner's. |
| Evidence | `hackbuild-ui/README.md` (lines 14 and 25 name @hackbuild/ui); `fab-knowledge:synthesis/plan-deltas.md` (section 4, D1) |
| Supersedes | plan-deltas D1 |
| Milestone | M09 |

### D-118 Tokens

| field | value |
|---|---|
| Status | decided |
| Decision | Published token names win; handoff names become a retiring alias table. Added upstream: --hb-part-a to -f, --hb-rail 336px, --hb-tray 210px, --hb-lit-label #9a9184, --hb-ink-line #33312c, --hb-ink-inset #2a2822, --hb-ink-border #44413a, --hb-gold #d9b45a, --hb-mask, --hb-silk. --hb-lit-dim reads 2.90:1 on void (fails AA), so small labels on void use --hb-lit-label. |
| Rationale | Name collisions with the published set; AA failure. |
| Evidence | `hackbuild-ui/src/styles/tokens.css` (lines 25, 54); `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/theme`; `fab-knowledge:synthesis/aesthetic-voice-ux-bible.md` (section 5.2); `fab-knowledge:synthesis/verified-claims.md` (C7 lit-dim row) |
| Supersedes | handoff theme/tokens.css names; plan-deltas R27 |
| Milestone | M09 |

### D-119 Header verbs

| field | value |
|---|---|
| Status | owner |
| Decision | Default: GUIDELINES 4c; the header holds identity and state; undo, redo, open, save and guide sit at the right end of the guide strip. |
| Rationale | Bench lineage and GUIDELINES conflict. |
| Evidence | `hackbuild-ui/GUIDELINES.md` (section 4c); `fab-knowledge:synthesis/aesthetic-voice-ux-bible.md` (section 5.3) |
| Supersedes | v3 section 11 law (header holds undo redo open save guide); plan-deltas R33, D6 |
| Milestone | M09 |

### D-120 Shell family

| field | value |
|---|---|
| Status | owner |
| Decision | Default: one system; paper shell for every kind except board; instrument density (full-bleed void, floating ink panels, VT323 heads) for the board kind and live device views; CONDUYT teal and JetBrains Mono never appear in fab. |
| Rationale | Newest device tool hackbuild-bench is paper with void stages. |
| Evidence | `fab-knowledge:synthesis/aesthetic-voice-ux-bible.md` (section 6); `hackbuild-bench`; `fab-knowledge:sources/repos/voice-aesthetic-skills.md` |
| Supersedes | v3 section 11 (two shells); plan-deltas R33, D6 |
| Milestone | M09 |

### D-121 Tagline face

| field | value |
|---|---|
| Status | owner |
| Decision | Default: Special Elite for tool taglines in headers; Libre Baskerville italic only for "make things. break things. repeat."; bakes include all five faces. |
| Rationale | Every shipped bench uses Special Elite; GUIDELINES reserves Baskerville. |
| Evidence | `fab-knowledge:synthesis/aesthetic-voice-ux-bible.md` (section 5.4); `hackbuild-ui/GUIDELINES.md` |
| Supersedes | v3 section 11 (Libre Baskerville tagline); plan-deltas R33, D7 |
| Milestone | M09 |

### D-122 Graph rule

| field | value |
|---|---|
| Status | owner |
| Decision | Default: 32 px at 10 percent pink for new work; shipped benches keep 26 px until rebaked. |
| Rationale | GUIDELINES vs shipped benches. |
| Evidence | `hackbuild-ui/GUIDELINES.md`; `fab-knowledge:synthesis/aesthetic-voice-ux-bible.md` (section 5.2) |
| Supersedes | plan-deltas R27 graph rule row, D8 |
| Milestone | M09 |

### D-123 State

| field | value |
|---|---|
| Status | decided |
| Decision | ui-core state is plain TypeScript with explicit commit; Pinia setup stores only as thin mirrors for shell state; localStorage keys prefixed `hbf.` inside try/catch; no store below tier 3. |
| Rationale | Owner rules mandate Pinia for cross-view state; hackbuild-bench mirror pattern. |
| Evidence | `hackbuild-bench/RULES.md`; `hackbuild-bench/src/stores`; `hackbuild-bench/src/core/bus/DeviceBus.ts`; `badge-replicator/CLAUDE.md` |
| Supersedes | v3 section 12 (no store); plan-deltas R28 |
| Milestone | M09 |

### D-124 Notes

| field | value |
|---|---|
| Status | decided |
| Decision | ParamField gains `help` (tooltip, aria) and a declared `notes` panel kind; panes hold no free paragraphs; PIP's 16 .note elements migrate into those two homes. |
| Rationale | Constraint notes needed a home under the no-paragraph law. |
| Evidence | `fab-knowledge:evidence/x/pip-controller/bench` (16 .note elements); `fab-knowledge:synthesis/verified-claims.md` (C1 .note row) |
| Supersedes | v3 section 11 law (no paragraphs in panes); plan-deltas R33, R34 |
| Milestone | M09 |

### D-125 UX law changes

| field | value |
|---|---|
| Status | decided |
| Decision | Legend collapses to slot chips under 640; the last step is the export step (PRINT for one process, MAKE for a kit); one focal pink per view, counted in smoke; chip on-state is ink fill; the welcome is remembered once dismissed and Guide reopens it; touch parity with a touch-only Playwright pass at 390 px; every finding is locatable; per-row reset; presets come from the welcome card; share link via deflated design JSON in location.hash; enum options come from legal values; 2D exports carry a reference rectangle. |
| Rationale | aesthetic-voice-ux-bible.md section 9 evidence. |
| Evidence | `fab-knowledge:synthesis/aesthetic-voice-ux-bible.md` (section 9); `fab-knowledge:synthesis/plan-deltas.md` (R33, section 5 ideas 4 and 5) |
| Supersedes | v3 section 11 law lines; plan-deltas R33 |
| Milestone | M09 |

### D-126 Six kinds fixed

| field | value |
|---|---|
| Status | decided |
| Decision | single, composer, surface, board, machine, catalog. A seventh needs a measured layout that shares nothing with these. Slots are the valve. |
| Rationale | Closes v3 open decision 17. |
| Evidence | `fab-knowledge:evidence/x/plan-to-refine/PLAN.md` (section 13 Regions and kinds; section 22 open decision 17); `fab-knowledge:synthesis/aesthetic-voice-ux-bible.md` (section 8) |
| Supersedes | v3 open decision 17; plan-deltas R94 |
| Milestone | M10 |

### D-127 three.js

| field | value |
|---|---|
| Status | decided |
| Decision | three 0.186.1 (r186) inlined as a module script in bakes. Only the decoders a design uses are vendored for file://; Draco, Basis and meshopt decoders still ship in r186 (r185 removed the Draco encoder and the Lottie and TTF libs). |
| Rationale | Closes v3 open decision 3; verified-claims C9. |
| Evidence | `fab-knowledge:synthesis/verified-claims.md` (C9 three.js row) |
| Supersedes | v3 open decision 3; plan-deltas R73 |
| Milestone | M09 |

### D-128 BenchHook frozen

| field | value |
|---|---|
| Status | decided |
| Decision | PIP getter style: ready, state get/set, model, rev, built, busy, buildHash, log, settled(), loadDesign, designJson, ensureMesh, commit, drive(target, value), exportBytes(kind), verbs; settled means ready and not busy and built equals rev; EXPORT_ALIASES maps print-card to card, design to json, stlzip to stl. A Playwright conformance test runs on every baked bench with legacy adapters for TOGGLE, KNUCKLE, TENON, COTTER. |
| Rationale | Nine hook shapes in the corpus. |
| Evidence | `fab-knowledge:evidence/x/pip-controller/bench`; `fab-knowledge:synthesis/api-library-ai-design.md` (section 11.7); `fab-knowledge:synthesis/patterns-and-lineage.md` (section 2.9) |
| Supersedes | v3 section 12 The global hook; plan-deltas R79, R80 |
| Milestone | M09 |

### D-129 Bake

| field | value |
|---|---|
| Status | decided |
| Decision | A per-design asset manifest drives the bake; pip-controller tools/build_bench.py is the seed, with COTTER baker features (ESM manifold to a classic script, base64 wasm, fonts, dash assert, exactly-one-match asserts). Output is deterministic (same sha256 on a cold rebuild), at most 16 MB, with zero network fetches at load; no blob or module Workers under file://. |
| Rationale | build_bench.py injected unused assets; PIP rebuild is deterministic. |
| Evidence | `fab-knowledge:evidence/x/pip-controller/tools/build_bench.py`; `fab-knowledge:evidence/x/pip-controller/build.sh`; `fab-knowledge:evidence/x/cotter-src`; `fab-knowledge:synthesis/verified-claims.md` (C1 bake row) |
| Supersedes | v3 section 12 Single-file bake; plan-deltas R81 |
| Milestone | M09 |

### D-130 No extra UI libraries

| field | value |
|---|---|
| Status | decided |
| Decision | No headless component library, no declarative 3D layer, no Storybook; a /kit route; one custom element <hb-viewer>. Revisit if multi-user. |
| Rationale | Closes v3 open decisions 14 and 15. |
| Evidence | `hackbuild-ui/src`; `fab-knowledge:sources/repos/hackbuild-bench-and-ui.md` |
| Supersedes | v3 open decisions 14 and 15; plan-deltas R24 |
| Milestone | M09 |

## CHASE

### D-131 Chase format

| field | value |
|---|---|
| Status | decided |
| Decision | A TypeScript module built with `defineChase`, type-checked against @hackbuild/spec; a zod schema derived for runtime; `meta.chase: 2` with migrations; deep normalise on load and a check that no stored document yields NaN geometry. |
| Rationale | Closes v3 open decision 16; badge-replicator shallow merges produced NaN. |
| Evidence | `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/spec/chase.ts`; `badge-replicator/src/lib` (normalizeBadgeSpec); `fab-knowledge:synthesis/api-library-ai-design.md` (section 8) |
| Supersedes | v3 open decision 16; v3 section 13; plan-deltas R75, R94 |
| Milestone | M10 |

### D-132 Chase fields

| field | value |
|---|---|
| Status | decided |
| Decision | ChaseMeta gains machines[], shell, license (SPDX), derivedFrom {id, buildHash}, aliases; Chase gains presets, applied (persisted arch.apply results), expect, status; rail is optional for surface; ParamField gains label, help, constraintDim, commit (touch, commit, light) and step on every numeric type; ExportDecl.kind is an exporter registry id and gating comes from ExporterDef.fabrication. |
| Rationale | plan-deltas R34, R75, R90. |
| Evidence | `fab-knowledge:synthesis/api-library-ai-design.md` (section 8.4); `fab-knowledge:sources/repos/hackbuild-bench-and-ui.md` (ParamSpec) |
| Supersedes | v3 section 13 fields; plan-deltas R34, R75, R90 |
| Milestone | M-1 (spec); M10 |

### D-133 chase.validate output

| field | value |
|---|---|
| Status | decided |
| Decision | Returns CommandResult with CommandError[] and typed questions (the completeness audit), never strings. |
| Rationale | Returns are evidence. |
| Evidence | `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/spec/chase.ts` (chase.validate return shape) |
| Supersedes | plan-deltas R76 |
| Milestone | M10 |

## Sim, motion, nest, inlay, tools

### D-134 Rapier

| field | value |
|---|---|
| Status | decided |
| Decision | @dimforge/rapier3d-deterministic-compat 0.21.0. M02 measures 30-trial granular runtime before sim snapshot hashes enter BuildInputs; PAWL's rapier3d-compat 0.14.0 runs are legacy. |
| Rationale | Closes v3 open decision 20 with a measurement step. |
| Evidence | `fab-knowledge:synthesis/verified-claims.md` (C8 Rapier row); `fab-work-directory:benches/pawl/outputs/pawl.html` (line 12) |
| Supersedes | v3 open decision 20; plan-deltas R58, R73 |
| Milestone | M02 |

### D-135 Calibration masks and DAVIT target

| field | value |
|---|---|
| Status | decided |
| Decision | Masks keyed by mesh hash and pose set, calibrated on both arms, reporting constant interference. DAVIT target: 30 designed pairs per pipe (29 in DATA.pairs, 27 inside the arm and 2 base to arm, plus 1 base\|mount hub pair), zero real fails, both arms; the bench README calls the sweep "500 plus poses". |
| Rationale | C-10 found no source for the 43-pair figure. The DAVIT R4 bundle found in Downloads on 2026-10-04 is that source: 43 is the R4 offline interference gate, recorded as a parity reference by D-188. |
| Evidence | `fab-work-directory:benches/davit/outputs/davit.html` (DATA.pairs); `fab-knowledge:synthesis/verified-claims.md` (C6 DAVIT row); `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/knowledge/projects/robots.md` (line 34, 532 poses); `fab-knowledge:evidence/x/downloads/dl-robots-machines/unzipped/davit_r4/sweep.py`; `fab-knowledge:evidence/x/downloads/dl-robots-machines/records/davit_r4_sweep_run_2026-10-04.txt` |
| Supersedes | v3 section 21 M2 (43-pair); plan-deltas R58, R92, table 1.4 |
| Milestone | M02 |

### D-136 SLUG trial runner

| field | value |
|---|---|
| Status | decided |
| Decision | Rebuilt seeded before the M02 SLUG target; slug.html spawns with unseeded Math.random and the runner behind 126 of 128 was never harvested. |
| Rationale | slug.html uses unseeded Math.random; the 126 of 128 runner was never harvested. |
| Evidence | `fab-work-directory:benches/slug`; `fab-knowledge:sources/benches/benches-robots-b.md` |
| Supersedes | v3 section 21 M2 (SLUG 126 of 128); plan-deltas R58, R92 |
| Milestone | M02 |

### D-137 nest

| field | value |
|---|---|
| Status | decided |
| Decision | nest keeps its own sheet loop and part-in-part handling; sparrow (MIT, strip packing only, no npm package) is evaluated through a self-built wasm; jagua-rs 1.0.0 (MPL-2.0) rejects item holes and dropped multi-strip, so nest does not call it directly; MaxRects BSSF and a shelf packer are the offline fallback; laser output has a sheet bound. |
| Rationale | verified-claims C8; v3 stop building MaxRects dropped. |
| Evidence | `fab-knowledge:synthesis/verified-claims.md` (C8 jagua-rs and sparrow rows); `fab-work-directory:benches/ogee16`; `fab-work-directory:gusset (10).html` |
| Supersedes | v3 section 15 (stop building MaxRects; nest collapses into jagua-rs); plan-deltas R60, R73 |
| Milestone | M07 |

### D-138 DXF writer

| field | value |
|---|---|
| Status | decided |
| Decision | One writer that passes CHK-SHT-03 by construction: LWPOLYLINE with handles and AcDbEntity, repeated first vertex, closed flag, $ACADVER, LAYER table, bulges, CIRCLE; ezdxf audit in CI. |
| Rationale | Every shipped emitter failed some part. |
| Evidence | `fab-work-directory:benches/slug`; `fab-work-directory:benches/sketch`; `fab-knowledge:evidence/x/cotter-src` (audit_dxf.py); `fab-knowledge:sources/latest/cotter-sparger.md` |
| Supersedes | plan-deltas R60 |
| Milestone | M07 |

### D-139 Motion and kinematics

| field | value |
|---|---|
| Status | decided |
| Decision | motion merges DETENT's step-space planner and WASHER's mm-space servo planner behind one interface with calibration residual readouts; kinematics is one TypeScript module imported by build and viewer. |
| Rationale | Two planners and JS vs Python FK duplicates. |
| Evidence | `fab-work-directory:benches/detent-printed`; `fab-work-directory:benches/washer`; `fab-knowledge:sources/benches/benches-machines.md`; `fab-knowledge:sources/benches/benches-mechanisms.md` |
| Supersedes | plan-deltas R65, R66 |
| Milestone | M07 |

### D-140 Python's role

| field | value |
|---|---|
| Status | decided |
| Decision | tools/py managed by uv holds validate_3mf.py (numpy declared), orca3mf.py, islands.py and the reparse scripts; a Python tool is ported only at proven parity and never deleted before. |
| Rationale | Closes v3 open decision 5; validator failed under a bare Python without numpy. |
| Evidence | `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/3mf/validate_3mf.py` (needs numpy); `fab-knowledge:synthesis/verified-claims.md` (C2) |
| Supersedes | v3 open decision 5 |
| Milestone | M-1 (tools/py); M00 |

### D-141 TypeScript in packages

| field | value |
|---|---|
| Status | decided |
| Decision | Packages are TypeScript; the kernel ships built ESM consumable through esm.sh. Closes v3 open decision 2. |
| Rationale | Closes v3 open decision 2; TS 7 native compiler. |
| Evidence | `fab-knowledge:evidence/x/plan-to-refine/PLAN.md` (section 22 open decision 2); `fab-knowledge:synthesis/verified-claims.md` (C14 TypeScript 7.0.2) |
| Supersedes | v3 open decision 2 |
| Milestone | M-1 |

### D-142 Designs location

| field | value |
|---|---|
| Status | decided |
| Decision | designs/<id>/ in hackbuild-fab with chase.ts, build.ts, README.md and legacy/ (sha256 plus a lineage README); graduated designs move to their own repo on the pip-controller template. |
| Rationale | Closes v3 open decision 6. |
| Evidence | `fab-knowledge:evidence/x/plan-to-refine/PLAN.md` (section 22 open decision 6); `fab-knowledge:evidence/x/pip-controller` (graduated layout) |
| Supersedes | v3 open decision 6 |
| Milestone | M10 (first designs); M16 (migrations) |

### D-143 SKETCH and BLOCKS

| field | value |
|---|---|
| Status | decided |
| Decision | Stay as apps in hackbuild-fab until an external audience appears. |
| Rationale | Repo boundary rule; closes v3 open decision 8. |
| Evidence | `fab-knowledge:evidence/x/plan-to-refine/PLAN.md` (section 22 open decision 8) |
| Supersedes | v3 open decision 8 |
| Milestone | none |

### D-144 SKETCH solver

| field | value |
|---|---|
| Status | owner |
| Decision | Default: keep SKETCH v3's damped Gauss-Newton with rank DOF; planegcs (LGPL-2.1 on GitHub, LGPL-2.0-or-later on npm, 892 KB) is not adopted; the v3 line "stop building the sketch constraint solver" is deleted. |
| Rationale | v3 sections 14 and 15 contradicted each other; closes open decision 11 pending owner. |
| Evidence | `fab-knowledge:evidence/x/plan-to-refine/PLAN.md` (line 796 (section 14) and line 822 (section 15)); `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/designs/sketch/legacy/sketch.html` (v3 Gauss-Newton solver); `fab-knowledge:synthesis/verified-claims.md` (C8 planegcs row) |
| Supersedes | v3 open decision 11; v3 sections 14 and 15; plan-deltas R73, D10 |
| Milestone | M12 (SKETCH reference shell) |

### D-145 inlay pipeline

| field | value |
|---|---|
| Status | decided |
| Decision | potrace out; vtracer 1.0.0-alpha.4 (MIT OR Apache-2.0, OKLab palette snapping, seam-free cutout) is evaluated against the in-house quantize at M03; an intake stage from badge-replicator (8x8 DLT homography, glare stack reducers, key-colour knockout, content bounds); despeckle 0.35 of a min-feature disc; light over dark needs 1.2 mm. |
| Rationale | C-11; vtracer is alpha. |
| Evidence | `fab-knowledge:synthesis/verified-claims.md` (C8 potrace and vtracer rows); `badge-replicator/src/lib` (intake kernels); `fab-knowledge:sources/benches/benches-coins-inlay.md` (despeckle) |
| Supersedes | v3 section 15 (vtracer and potrace adopted); plan-deltas R63 |
| Milestone | M03 |

### D-146 OpenSCAD route

| field | value |
|---|---|
| Status | decided |
| Decision | An import-and-audit route with a lint for "Ignoring unknown" and `//` before constants. OpenSCAD's Manifold backend was experimental from March 2023 and became the default in August 2025. |
| Rationale | 16 .scad files across six benches; OpenSCAD exits 0 on unknown modules. |
| Evidence | `fab-knowledge:synthesis/verified-claims.md` (C8 OpenSCAD row); `fab-work-directory:benches/slug` (jointcheck.scad) |
| Supersedes | plan-deltas R73 OpenSCAD row |
| Milestone | unassigned (see gaps) |

### D-147 Brand packs

| field | value |
|---|---|
| Status | owner |
| Decision | Default: a brand registry with a brand.json contract; HeatSync assets from the heatsync skill; app chrome stays hack.build. |
| Rationale | COTTER put client brands into geometry and paper. |
| Evidence | `fab-knowledge:evidence/x/cotter-src` (tools/prep_assets.py); `fab-knowledge:sources/latest/cotter-sparger.md` |
| Supersedes | plan-deltas R36, D20 |
| Milestone | none |

### D-148 OGEE R16-P bill

| field | value |
|---|---|
| Status | owner |
| Decision | Default: the shipped build_plate.py (124 pieces in 20 types with KNOB_DRIVE, 119 in 21 with SERVO_DRIVE), derived at build; the "99 in 18" figure lives only in PLAN-v1, PLAN-v2 and the script docstring. |
| Rationale | Three bills disagree. |
| Evidence | `fab-work-directory:benches/ogee16/outputs/ogee16-source.zip` (source/build_plate.py); `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/PLAN-v1.md` (line 233); `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/PLAN-v2.md` (line 1883); `fab-knowledge:synthesis/verified-claims.md` (C6 OGEE row) |
| Supersedes | v3 section 21 M7 (OGEE plates); plan-deltas R92, D22 |
| Milestone | M07 |

### D-149 Missing sources

| field | value |
|---|---|
| Status | owner |
| Decision | Default: rewrite the SLUG trial runner and the SPINDLE reparse (they gate M02 and M08); drop citations of SLATE r5, COAMING 990 KB build, STIPPLE R17, DAVIT R4 truss, TANG R6, BAFFLE R3, ARMATURE board scripts, DETENT rev D and GUDGEON files unless the owner supplies them. |
| Rationale | Files not found in any harvest. |
| Evidence | `fab-knowledge:synthesis/plan-deltas.md` (R69, D21); `fab-work-directory:benches/spindle/outputs` (reparse scripts absent); `fab-work-directory:benches/slug` (runner absent) |
| Supersedes | plan-deltas R69, D21 |
| Milestone | M02 (SLUG runner); M08 (SPINDLE reparse) |

### D-150 97-key 3MFs in Flash Studio

| field | value |
|---|---|
| Status | owner |
| Decision | Default: treat the per-slot 127-key port as a correctness fix until the owner confirms the 97-key exports (PIP, TOGGLE, COTTER, SPARGER, INLAY, SASH) opened with every filament intact. |
| Rationale | Only the owner's slicer runs settle it. |
| Evidence | `fab-work-directory:benches/collar-coin/uploads/hackbuild-coin-nfc.3mf`; `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/3mf/filament_template.json` (97 keys); `fab-knowledge:synthesis/verified-claims.md` (C2) |
| Supersedes | plan-deltas D23 |
| Milestone | M00 |

### D-151 Teen and class kits

| field | value |
|---|---|
| Status | owner |
| Decision | Default: after M06. |
| Rationale | Depends on the canons. |
| Evidence | `fab-knowledge:synthesis/plan-deltas.md` (section 4, D26) |
| Supersedes | plan-deltas D26 |
| Milestone | after M06 |

## Testing, docs, milestones, registry

### D-152 Testing pyramid

| field | value |
|---|---|
| Status | decided |
| Decision | Ten levels: unit, property (fast-check with seed and path replay), contract, parity triple, golden, design harness (cases, sweep, liveness, smoke, islands), 3MF validator corpus, browser, visual review, agent eval. The five tests are the bar a design reaches before it is done. |
| Rationale | Only PIP had all five; KNUCKLE, TENON, COTTER shipped subsets. |
| Evidence | `fab-knowledge:synthesis/api-library-ai-design.md` (section 11.1); `fab-knowledge:evidence/x/pip-controller/test`; `fab-knowledge:sources/latest/knuckle-tenon-gusset.md` (subsets) |
| Supersedes | v3 section 19; plan-deltas R85, R87 |
| Milestone | every milestone |

### D-153 Harness exits

| field | value |
|---|---|
| Status | decided |
| Decision | Harnesses assert and exit non-zero; a harness that did not run is reported as not run, never as a pass. PIP's print-and-exit-0 harnesses with a FAIL\|THROW grep are legacy. |
| Rationale | PIP harnesses print and exit 0 behind a FAIL\|THROW grep. |
| Evidence | `fab-knowledge:evidence/x/pip-controller/test` (no process.exit); `fab-knowledge:evidence/x/pip-controller/.github/workflows/ci.yml` (FAIL\|THROW grep); `fab-knowledge:synthesis/verified-claims.md` (C1) |
| Supersedes | plan-deltas R86 |
| Milestone | M-1 onward |

### D-154 Visual review gate

| field | value |
|---|---|
| Status | decided |
| Decision | A PR that changes any meshHash gets before and after section, assembled and plate PNGs from CI and a required checkbox "I looked at the renders"; a person looks at desktop width and 390 px. |
| Rationale | OGEE crank passed every numeric check and read as loose sticks. |
| Evidence | `fab-knowledge:synthesis/api-library-ai-design.md` (section 11.8); `fab-knowledge:sources/benches/benches-robots-b.md` (OGEE crank) |
| Supersedes | plan-deltas R87 rendered review |
| Milestone | M00 onward (first meshHash) |

### D-155 Agent evals

| field | value |
|---|---|
| Status | decided |
| Decision | Inspect tasks from the worked sessions, references, one-param variants and seeded failures, scored by build hash and verdict counts with no model judge, per model tier, with a held-out split. |
| Rationale | Measure the capability floor claim. |
| Evidence | `fab-knowledge:synthesis/api-library-ai-design.md` (section 11.9); `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/knowledge/worked-sessions.md` |
| Supersedes | plan-deltas R84 |
| Milestone | M12 |

### D-156 Upstreaming and lineage

| field | value |
|---|---|
| Status | decided |
| Decision | `lineage.json` records each kernel's canonical file and every known copy with sha256 and fixes; ports start from the most refined copy; a fix found in a design is ported to the package in the same milestone. |
| Rationale | TOGGLE healer, BAFFLE Float64, COLLAR 127 keys stayed local. |
| Evidence | `fab-knowledge:synthesis/patterns-and-lineage.md` (sections 2 and 3); `fab-knowledge:evidence/x/toggle/src/src/part2e.js` (healer fix); `fab-work-directory:benches/baffle` |
| Supersedes | plan-deltas R50, R51, R62 |
| Milestone | every milestone |

### D-157 Milestone structure

| field | value |
|---|---|
| Status | decided |
| Decision | M-1 housekeeping, then M00 to M16 (M00 foundation, M01 constraints, M02 sim, M03 inlay, M04 checks and project, M05 circuit and copper, M06 canons, M07 motion and nest, M08 board and catalog, M09 ui, M10 chase, M11 reference closure, M12 app and MCP freeze, M13 link, M14 BRep, M15 gesture, M16 knowledge and registry). A milestone is green only when its references pass conformance on CI with the house-rules jobs. |
| Rationale | plan-deltas R92, R93; BRep numbering conflict resolved to M14. |
| Evidence | `fab-knowledge:evidence/x/plan-to-refine/PLAN.md` (section 21); `fab-knowledge:synthesis/plan-deltas.md` (R92, R93) |
| Supersedes | v3 section 21 M0 to M16; plan-deltas R92, R93 |
| Milestone | all |

### D-158 Registry fields and the BENCH union

| field | value |
|---|---|
| Status | decided |
| Decision | tools.json gains repo, built_url, hook, exports[], verified, print[] with sha256, parts[] in CommonPub BOM shape, license, derivedFrom and scope (fab, device, explainer, game, site, other). BENCH source is `hackbuild-tools 2/MANIFEST.json` (157 tools, 16 groups, 153 placeable; an older copy holds 144). 18 of 59 registry tools map to the catalogue by chat URL; 56 of 59 map to the 54-chat corpus. Missing rows added: KNUCKLE, TENON, COTTER, SPARGER W, DERRICK, JIB, SPLICE, LUG, TANG-small, PIP (rename of haft), GUSSET pending D-019. |
| Rationale | verified-claims C6. BENCH grew 38, 66, 90, 144 and 157 tools on 2026-08-06 (zips of 185, 293 and 334 entries); 94 of 153 placeable tools have a name match in Downloads (Downloads reader dl-boards-tools, 2026-10-04). |
| Evidence | `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/registry/tools.json`; `fab-knowledge:evidence/x/downloads/dl-boards-tools/hackbuild-tools-2/MANIFEST.json` (157 tools; sha256 7199d6cd3f43, prefix; copy of `hackbuild-tools 2/MANIFEST.json` from the owner's Downloads); `fab-knowledge:evidence/x/downloads/dl-boards-tools/hackbuild-tools/MANIFEST.json` (144 tools); `fab-work-directory:CHATS.tsv` (54 chats); `fab-knowledge:synthesis/verified-claims.md` (C6) |
| Supersedes | plan-deltas R21, R22, table 1.4 |
| Milestone | M16 |

### D-159 3MF dialect

| field | value |
|---|---|
| Status | decided |
| Decision | Keep Application BambuStudio-01.10.01.50, fixed UUID suffixes, N-long vectors, no process keys, no extruder_variant_list, open as project. Template = the 127 gold keys with per-slot values (COLLAR's rep() wrote one value to every slot; gold differs per slot on 9 keys); keep filament_map, filament_self_index, filament_extruder_variant; the harvester refuses classification when filament count equals extruder count; export targets bbs, prusa and core; `Metadata/hackbuild_chase.json` carries chase id and build hash; per-object overrides from feature kinds; an optional paint_color route using CONST_FILAMENTS. |
| Rationale | C-07; verified-claims C2. |
| Evidence | `fab-work-directory:benches/collar-coin/uploads/hackbuild-coin-nfc.3mf`; `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/3mf/filament_template.json`; `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/3mf/harvest_filament_keys.py`; `fab-knowledge:synthesis/verified-claims.md` (C2) |
| Supersedes | seed 97-key template and per_extruder_exclude; plan-deltas R50 |
| Milestone | M-1 (T08 harvest); M00 |

### D-160 Interop at the edges

| field | value |
|---|---|
| Status | decided |
| Decision | Emit 3MF, STL, DXF, SVG, gerbers, KiCad, Circuit JSON, STEP (M14); import STL, GLB, STEP, WRL, OpenSCAD for audit; UHD export is a later idea. |
| Rationale | Standard rule 9. |
| Evidence | `fab-knowledge:evidence/x/plan-to-refine/PLAN.md` (section 20 rule 9) |
| Supersedes | v3 section 20 rule 9 (kept, STEP dated to M14) |
| Milestone | M00 to M14 per format |

### D-161 Fab capability vocabulary

| field | value |
|---|---|
| Status | decided |
| Decision | One file of capabilities: observe (mesh.3d, sheet.2d, circuit.netlist, print.3mf, cut.svg, render, check) and consequential (send.print, fire.laser, heat.bed, cut.vinyl); panels declare `requires`; consequential capabilities arm per device per session with one informational confirm. |
| Rationale | hackbuild-bench capabilities.ts has 23 strings split the same way. |
| Evidence | `hackbuild-bench/src/core/capabilities.ts` (12 observe, 11 consequential) |
| Supersedes | plan-deltas R31 |
| Milestone | M-1 (spec); M09 (panels); M13 (devices) |

### D-162 Plan document set location

| field | value |
|---|---|
| Status | decided |
| Decision | The documents live in fab-knowledge/plan/ as the source; at M-1 RULES.md, CLAUDE.md and AGENTS.md copy to the hackbuild-fab root, spec/ to hackbuild-fab/spec/, and every other plan document to hackbuild-fab/docs/plan/; after M-1 the repo copy is the source and fab-knowledge/plan/ is frozen. |
| Rationale | One source of truth. |
| Evidence | `fab-knowledge:plan/_architect.md` (section 3) |
| Supersedes | new |
| Milestone | M-1 (T13) |

### D-163 geom on CrossSection

| field | value |
|---|---|
| Status | decided |
| Decision | geom wraps manifold's CrossSection (Clipper2 inside) for offsets and 2D booleans, with exact rounded-rect offsets and the earcut wrapper; no separate Clipper2 dependency. Closes v3 open decision 12. |
| Rationale | Closes v3 open decision 12. |
| Evidence | `fab-knowledge:evidence/x/plan-to-refine/PLAN.md` (section 22 open decision 12); `fab-knowledge:synthesis/plan-deltas.md` (R52, R73) |
| Supersedes | v3 open decision 12; plan-deltas R52, R73 |
| Milestone | M00 |

### D-164 STYLUS as one design

| field | value |
|---|---|
| Status | decided |
| Decision | STYLUS (working name, was FEELER) is one design whose sensor types are entries in the archetypes registry, starting from the THINPOT revision's 22 printed archetypes. Closes v3 open decision 4. |
| Rationale | Closes v3 open decision 4. |
| Evidence | `fab-work-directory:benches/feeler-thinpot/outputs/feeler.html` (22 printed archetypes); `fab-knowledge:evidence/x/plan-to-refine/PLAN.md` (section 22 open decision 4) |
| Supersedes | v3 open decision 4; plan-deltas R47 FEELER row |
| Milestone | M06 (archetypes); M10 (STYLUS renders from a chase) |

### D-165 Archetype apply on a PartDraft and the applied merge

| field | value |
|---|---|
| Status | decided |
| Decision | `ArchetypeDef.apply({draft, face, params, profile})` takes a `PartDraft` and returns `ApplyOut {bodies, features, ports, slots}` with local slot numbers and local ids (spec/canon.ts); it never takes or returns a built `Part`. Before kernel stage 1, `part.build` merges every `chase.applied` entry whose `part` equals a PartDraft id, in array order: it calls `apply()` on the draft as build.ts returned it, maps each local slot to the `chase.materials` entry with the same material and role, prefixes local ids with `<archetype id>.<applied index>.`, and appends the bodies and features (spec/build.ts `APPLIED_MERGE`). `arch.apply` writes the applied entry and every slot `chase.materials` lacks as one patch and returns `slotsAdded`. `Author.applied(partId)` reads placements so build.ts can make room for them and never re-applies them; `Author.arch(id, face, params, draft?)` runs the same `apply()` for placements build.ts computes itself (STYLUS). A merged id that repeats is E_SCHEMA; an entry naming no PartDraft is E_REF. |
| Rationale | `apply()` took and returned a built `Part`, `BuildFn` had no way to read `chase.applied`, and the result carried no bodies or slots, so a printed flex button on a PETG case lid could not be authored through `arch.apply`: nothing carried the entry into the next build, and the dome's cTPU plug and the cTPU and cPLA slots had no path in. M06 line 26, M06-T12 step 2 and M10-T09 step 3 each named a different signature. |
| Evidence | `fab-knowledge:plan/spec/canon.ts` (ApplyIn, ApplyOut); `fab-knowledge:plan/spec/build.ts` (APPLIED_MERGE, Author.applied, Author.arch); `fab-knowledge:plan/spec/commands.ts` (arch.apply output slotsAdded); `fab-knowledge:plan/CANONS.md` (sections 1.2 and 7) |
| Supersedes | spec/canon.ts ApplyResult (pre-M-1 draft); refines D-047 (adds a draft pass before stage 1, stage order unchanged), D-095, D-132 (`applied`) |
| Milestone | M-1 (spec); M06 (M06-T12 merge and arch.apply); M10 (M10-T09 Author.arch in STYLUS); M15 (gesture calls the same command) |

### D-166 Untrusted input limits

| field | value |
|---|---|
| Status | decided |
| Decision | Every input from outside the opened workspace is untrusted and passes a rule before it reaches a kernel. 3MF and zip readers reject an entry name with a `..` segment, a leading `/` or `\`, or a drive letter; they cap entries at 4096 and total inflated size at 256 MB, counted while inflating so the read stops at the cap. Share links refuse an inflated payload over 1 MB and validate against the derived chase zod schema after migrate and before `loadDesign`; design JSON opened by drop, file picker or `loadDesign` takes the same cap and validation. OpenSCAD import runs only on a file the user named, under `openscad` with a 60 s timeout, a fresh temp working directory holding a copy of that file, `OPENSCADPATH` set to that directory, and a pre-scan that refuses any `include`, `use`, `import` or `surface` path that is absolute or contains `..`. SVG intake refuses a DOCTYPE and strips `script`, `foreignObject`, every `on*` attribute and every `href` not starting with `#` before parse. Raster intake decodes at most 8192 px per side. Mesh imports (STL, GLB, WRL, STEP at M14) cap the file at 256 MB. Text from a loaded document renders as text, never as HTML. `chase.ts` and `build.ts` are code: hbf builds modules only from the workspace the user opened and never fetches or evaluates a module a document or link names. A refused input returns E_SCHEMA naming the rule and the limit. The limits are plan budgets (inferred); a design that reaches one gets a new entry, never a silent raise. |
| Rationale | No plan document set a size cap, entry cap, path rule, time limit or isolation on any untrusted input. D-160 imports STL, GLB, STEP, WRL and OpenSCAD, and OpenSCAD reads local files through `include`, `use`, `import` and `surface`; zip readers face path traversal and inflation bombs; the M09-T04 share decoder inflated with `CompressionStream` and loaded with no cap; strangers' design JSON reaches `loadDesign`. |
| Evidence | `fab-knowledge:plan/milestones/M09-ui.md` (M09-T04 step 3); `fab-knowledge:plan/ARCHITECTURE.md` (section 11); `fab-knowledge:plan/RISKS.md` (R-25); `fab-knowledge:plan/TESTING.md` (section 4.2) |
| Supersedes | new; refines D-146 (OpenSCAD route), D-160 (imports), D-125 (share link) |
| Milestone | M00 (3MF and zip reader, fuzz job); M02 (first OpenSCAD run under the rule); M03 (SVG and raster intake); M09 (share decode, drop and picker); M10 (loadDesign through migrate) |

### D-167 Permanent addresses and versioned share links

| field | value |
|---|---|
| Status | decided |
| Decision | Every printed or published link uses one canonical pattern that never moves: `tools.hack.build/<slug>/` for the current bench and `tools.hack.build/<slug>/v<major>/` for each chase schema major (host proposed under D-034). An address under the pattern is never removed: a rebaked or superseded bench stays served at its old address with one line linking forward. No QR code or printed short link points at a github.io address, a release asset or app.hack.build; until the canonical host exists, print cards and coins carry no QR. Share links encode as `#d=<meta.chase>.<base64url of deflate-raw JSON>`; decode reads the version, inflates under the D-166 cap, runs `packages/chase` migrate from that version, deep-normalises, validates, then calls `loadDesign`. A payload with no version prefix is read as the design's legacy bench JSON through `migrate/legacy.ts`. Every design whose legacy bench is public ships `migrate/legacy.ts` with the legacy example saves as fixtures, in the milestone that ports it to a chase: M10 for KNURL, STYLUS, BLOCKS, KEYWAY, OGEE, PIP, KNUCKLE and TENON. For COLLAR, TOGGLE, COTTER, SASH, SPRUE and INLAY, which have no chase port yet, M16-T07 copies their legacy example saves into `designs/<slug>/test/fixtures/legacy/`, their legacy benches stay served at their addresses so those saves keep opening, and the later port ships `migrate/legacy.ts` against those fixtures. |
| Rationale | Printed QR codes on coins, SAOs and provenance cards outlive any host. REPOS.md section 2 records that a transferred repo's old Pages address may not redirect; app.hack.build has no DNS record (C-16); the M09-T04 payload carried no schema version, so a schema bump could not route old links through migrate; only five designs had a stated legacy-save path. |
| Evidence | `fab-knowledge:plan/REPOS.md` (section 2, Pages after transfer); `fab-knowledge:plan/milestones/M09-ui.md` (M09-T04); `fab-knowledge:plan/milestones/M10-chase.md` (M10-T03); `fab-knowledge:plan/LICENSING.md` (provenance card QR); `fab-knowledge:research/maker-culture-and-market.md` (section 13, event drops); `fab-knowledge:synthesis/verified-claims.md` (C7) |
| Supersedes | new; refines D-034 (adds the versioned path), D-125 (share link format), D-131 (migrations reach share links) |
| Milestone | M09 (versioned encode and decode); M10 (migrate wiring, legacy fixtures); M16 (legacy fixtures for later migrations); first print card with a QR only after the owner's DNS change |

### D-168 Distribution channels

| field | value |
|---|---|
| Status | owner |
| Decision | Default: hack.build tools at the D-167 pattern, with GitHub release assets until that host exists; npm `@hackbuild/kernel` and `hackbuild-3mf` and PyPI `hackbuild_3mf` after D-037; an MCP docs page ("ask your agent to use hbf") at M12; Printables and MakerWorld cross-posts, non-exclusive, with `chase.ts` attached and a link to the bench, never MakerWorld Exclusive; Tindie for SAO and circuit-card kits after M06 (D-151); CommonPub build logs once a site exists (D-033); failure of the week from M16-T10 data, published outside the repo; con drops carry a QR at the D-167 pattern only. Every tool page welcome and the root README carry the line "Works from a file. No account. Your exports are yours." No bounties or contests run until the owner sets their rules. |
| Rationale | The plan carried only the community coupon licence (D-042) and failure of the week; the market note recommends these channels and states the MakerWorld Exclusive lock (90 days, research note) conflicts with self-hosting the source. Channels, money and events are the owner's. |
| Evidence | `fab-knowledge:research/maker-culture-and-market.md` (section 13 Distribution, Community, Content; section 15 delta D5); `fab-knowledge:plan/LICENSING.md` (D-042) |
| Supersedes | new; plan-deltas section 5 ideas 7 and 13 |
| Milestone | M12 (MCP docs page); M16 (failure of the week data); listings after the owner answers |

### D-169 Community coupon intake

| field | value |
|---|---|
| Status | decided |
| Decision | A community coupon arrives as one JSON record matching `packages/profile/coupons/community/coupon.schema.json`: contributor (name as credited), machine (a profile machine id or a proposed machine row), material (brand, product, lot), coupon (reference id and the build hash of the printed coupon), date, method and conditions (D-099), results (values with units and the instrument), and photo sha256 with the photo attached. It is submitted through the issue form `.github/ISSUE_TEMPLATE/coupon.yml` or a PR adding one file under `packages/profile/coupons/community/`. `tools/profile/coupon-validate.mjs` checks the schema, checks that the build hash names a published coupon reference build, and recomputes the row through `profile` (resistivity from the four-wire reading and the built section; a fit band from the cell that fit). The owner accepts or closes; nothing merges on validator output alone, and no model submits or accepts a record (D-082). An accepted row enters at tier community, never measured, since measured is the shop's own coupon (D-083), and credits the contributor per D-042. A record with no photo, a failed recompute or an unknown build hash is closed with the validator output quoted. A later shop coupon that disagrees keeps both rows; lookups prefer the higher tier. |
| Rationale | PROFILE.md's community tier depends on community rows, and no submission format, review rule or moderation path existed. |
| Evidence | `fab-knowledge:plan/PROFILE.md` (tier table, coupon records); `fab-knowledge:synthesis/plan-deltas.md` (section 5 idea 3); `fab-knowledge:research/maker-culture-and-market.md` (section 13 Community 2) |
| Supersedes | new; plan-deltas section 5 idea 3 |
| Milestone | M16 (M16-T13) |

## Licensing additions

Appended before M-1 from LICENSING.md section 7. Each closes one gap that had no entry; the gaps L-03 to L-07, L-09 and L-10 stay open there.

### D-170 Docs licence

| field | value |
|---|---|
| Status | decided, owner, 2026-10-13 |
| Decision | The owner chose the default on 2026-10-13: `docs/**`, the root README.md and package README.md files are CC-BY-4.0, with code samples inside them also offered under MIT so a reader can paste them into MIT or closed code. Design and reference READMEs follow their folder's `ChaseMeta.license` (D-041); `spec/` stays MIT. The path map in `tools/licences.json` carries the rule; the extracted hackbuild-3mf repo carries the same split for its docs. |
| Rationale | Docs sat under the root MIT LICENSE by default. Creative Commons advises CC licences for docs and against them for software; hackbuild-3mf ships publicly at M00 exit with READMEs and docs, so the question arrives at the first publish. |
| Evidence | `fab-knowledge:plan/LICENSING.md` (section 1.1, section 7 gap L-01); `fab-knowledge:research/maker-culture-and-market.md` (section "License choices" CC BY 4.0 row; section 13 Licensing table, boards row "CC BY 4.0 docs") |
| Supersedes | LICENSING.md gap L-01; refines D-041 (adds a docs row) |
| Milestone | M00 (path map row and LICENSES/CC-BY-4.0.txt already landed at M-1; hackbuild-3mf extraction carries it) |

### D-171 Marks reserved outside the open grant

| field | value |
|---|---|
| Status | owner |
| Decision | Default: the hack.build name, the hackbuild name as a product prefix, and the hack.build logo files are the owner's marks and are outside every open licence in the repo. A root `TRADEMARKS.md` states this: the open licences grant no right to the marks; a fork or remix renames before it publishes; nominative use (saying a design is compatible with or derived from a hack.build design) is allowed; the `hackbuild-3mf` and `@hackbuild/kernel` package names identify the upstream and a fork publishes under another name. `reference/copper/_inputs/hackbuild-logo.svg` is excluded from the MIT grant by a path-map row ahead of the `**` MIT row; any later logo file joins the same row. The extracted hackbuild-3mf repo carries the same TRADEMARKS.md. Client and HeatSync marks keep their owners' terms (D-147). |
| Rationale | No file stated the marks, so the logo in `reference/copper/_inputs/` fell to the catch-all MIT row. The OSHW definition criterion 2 allows a project to reserve its marks while opening the design. hackbuild-3mf publishes under the hackbuild name at M00 exit. |
| Evidence | `fab-knowledge:plan/LICENSING.md` (section 1.2 path map, section 7 gap L-02); `fab-knowledge:research/maker-culture-and-market.md` (section 13 Licensing table, marks row) |
| Supersedes | LICENSING.md gap L-02 |
| Milestone | M00 (TRADEMARKS.md and path-map row before the hackbuild-3mf 0.1.0 publish) |

### D-172 MIT-0 for emitter templates

| field | value |
|---|---|
| Status | owner |
| Decision | Default: template text that an exporter or firmware emitter copies verbatim into a user's output is MIT-0 (`packages/*/templates/**`, `core/templates/**`, `designs/*/firmware/templates/**`), so outputs carry no notice the user must keep, matching "no claim on user outputs" (D-041). The code that fills the templates stays MIT. Path-map rows for the three globs sit ahead of the `designs/*/firmware/**` MIT row. `LICENSES/MIT-0.txt` lands with the first template. |
| Rationale | An MIT template asks every user to keep an MIT notice in their own firmware or export, which contradicts the no-claim rule. MIT-0 drops the notice condition and stays OSI-approved, which OSHWA certification of boards needs for their firmware. |
| Evidence | `fab-knowledge:plan/LICENSING.md` (section 1.1 user outputs row, section 7 gap L-08); `fab-knowledge:plan/PACKAGES.md` (firmware emitters row in the no-package-home table) |
| Supersedes | LICENSING.md gap L-08; refines D-041 |
| Milestone | M00 (path-map rows; the 3MF writer's static entries are the first templates) |

## Additions after the architect record

Appended before M-1 from named reviews dated 2026-10-04. Each cites its review or source in its Rationale and Evidence rows.

### D-173 Checks selected by the registry; waivers declared

| field | value |
|---|---|
| Status | decided |
| Decision | A chase has no check selector. The registry runs every check whose `appliesTo` matches a level or feature kind present in the Part IR, on every build. `Chase.checks` is removed. A chase keeps `expect` for deliberate violations (D-074) and gains `waive: {check, target, reason, until?}[]`: an exact check id and target id, a non-empty reason, an optional end date. A waived fail becomes a warn with `CheckResult.waived` set and shows in the CHECKS panel and the print card. `chase.validate` refuses an empty reason (E_SCHEMA), an unknown check (E_REF) and a waiver on a precondition check (E_SCHEMA; CheckDef.precondition, D-067). A lapsed waiver fails again; an unused waiver is reported. |
| Rationale | The tool proves the declarations. If the author also chooses which checks run, a model that drops CHK-NET-05 from the list gets a green build, and the keys flex-pair fixture already listed a hand-picked subset. CANONS.md section 1.2 already states that the registry selects by feature kind and level. |
| Evidence | `fab-knowledge:plan/spec/chase.ts` (WaiverDecl, Chase.waive); `fab-knowledge:plan/spec/checks.ts` (CheckDef.appliesTo, CheckResult.waived); `fab-knowledge:plan/CHECKS.md` (section 4 selection rule, section 10 waivers); `fab-knowledge:plan/CANONS.md` (section 1.2) |
| Supersedes | the `checks` field of handoff `hbf/spec/chase.ts`; refines D-074 and D-132 |
| Milestone | M04 (registry selection and waiver handling); M10 (chase.validate rules) |

### D-174 Chase and bench split

| field | value |
|---|---|
| Status | decided |
| Decision | The design and its layout are two files. `chase.ts` (defineChase) holds the design: meta, materials, params, presets, build, expect, waive, exports, assertions, applied, stack, motion, items. `bench.ts` (defineBench in spec/bench.ts) holds the layout: shell, views, rail, welcome, status, slots; `ViewMode`, `Overlay`, `RailStep`, `StatusChip`, `Shell` and the rest of the layout types live in spec/bench.ts. `defineBench(chase, {...})` refuses at compile time a rail panel `params.<g>` naming no param group of that chase and a welcome preset naming no chase preset. `BuildInputs.defHash` covers the canonical chase plus `build.ts` source bytes and never `bench.ts`, so a tagline edit or a reordered rail moves no build hash, cached build, pending export approval or `E_REPEAT` key; a bench hash enters the bake hash and BenchHook. `chase.scaffold` writes a default `bench.ts` generated from the params (one rail step per param group, then the kind's export step); a model never needs to edit it and a person may. `meta.kind` stays on the chase because it selects the build and export path. ParamField `label`, `help`, `showWhen` and `commit` stay on params, since the CLI, `chase.validate` questions and the MCP descriptions read them too. |
| Rationale | With layout in the chase, `defHash` moved on every layout edit, which invalidated cached builds, export approvals and the loop-detection history; a model had to author UI fields it never needs; and tier S carried UI types into every tier 2 package. |
| Evidence | `fab-knowledge:plan/spec/bench.ts`; `fab-knowledge:plan/spec/chase.ts`; `fab-knowledge:plan/spec/registry.ts` (BuildInputs.defHash); `fab-knowledge:plan/spec/fixtures/keys-flex-pair.ts` (chase and bench); `fab-knowledge:plan/spec/fixtures/negative.ts` (bad panel, bad preset) |
| Supersedes | the `shell` field of D-132 (moves from ChaseMeta to the bench) and the `status` and `rail` fields D-132 placed on Chase; refines D-051 (defHash scope), D-111 (inputsHash no longer moves on layout edits), D-126 (slots are bench slots) |
| Milestone | M-1 (spec); M09 (ui-core reads the bench); M10 (defineBench, chase.scaffold writes bench.ts) |

### D-175 meshHash keeps winding on the snap grid

| field | value |
|---|---|
| Status | decided |
| Decision | meshHash takes coordinates after the D-054 snap as int32 `round(v * 1024)`, sorts deduplicated vertices and remaps indices, rotates each triangle so its smallest index leads with cyclic order kept, sorts the triangles, and hashes the little-endian bytes behind the tag `hbf-mesh-2`. A test proves a flipped mesh hashes different. Geometry generators take unit-circle points from a committed table in packages/geom and never call Math.sin or Math.cos; the determinism job adds Playwright WebKit and Chromium legs beside x64 and arm64. |
| Rationale | Sorting each triple dropped winding, so a mesh and its inside-out twin hashed equal (the imported rp2040 standin has signed volume -6506 mm3); a decimal 1e-6 grid over a dyadic snap rounds twice; Safari's trig is not bit-identical to V8, so circle rings could hash differently in browser and node. The table (M00-T03 step 9) holds the correctly rounded cos and sin of every turn fraction a ring of 3 to 256 points reads, folded to the first octant, computed in BigInt fixed point so any machine regenerates the same bytes; a count outside 3 to 256 is E_SCHEMA. The earcut rotation reads the same file. Correct rounding makes the octant fold exact; against V8 every row is within one ulp (computed) and the snapped rings and every node meshHash were unchanged when it landed (computed, 2026-10-06). The revolve route still takes Math.cos and Math.sin over arbitrary feature-edge angles, which a per-count table cannot serve; it stays open under this decision until revolve reads a table or the browser legs prove it. |
| Evidence | `fab-knowledge:plan/AGENT-SURFACE.md` (section 7.3); `fab-knowledge:plan/spec/ids.ts` (MeshHash, MESH_GRID_PER_MM, MESH_HASH_TAG); `fab-knowledge:plan/spec/build.ts` (Author.ring.circle); `fab-knowledge:plan/milestones/M00-foundation.md` (M00-T03 step 9, M00-T04 step 5, M00-T14 step 5); `packages/geom/scripts/unit-circle.mjs`, `packages/geom/src/unit-circle.ts`, `packages/geom/test/unit-circle.test.ts` |
| Supersedes | refines the meshHash clause of D-051; extends D-056 with browser legs |
| Milestone | M00 (M00-T04, M00-T14) |

### D-177 Feature union by admission; four v3 kinds move out

| field | value |
|---|---|
| Status | decided |
| Decision | A feature is geometry on one part that a generator makes and a check proves. The Feature union holds 30 kinds: 22 carried from v3 and the eight of D-059. Four v3 kinds leave it. `latch` becomes the mechanism `displacement-coincidence-latch`, whose optional `MechanismDef.apply()` emits features of admitted kinds, metrics each gated by a check id, and an `identity` assertion (now keyed by `mechanism`) that CHK-MOT-05 proves; build.ts calls it through `Author.mech`. `coupon` becomes a reference under `reference/coupons/<id>/` whose chase declares `Chase.coupon` (CouponDecl: carries, machine, material, method coupon). `pivot` becomes `JointDecl` kind revolute with `via` and the new `stock` field. `pinInSlot` becomes `JointDecl` kind prismatic or planar with `via` and `range`, plus a `contact` assertion over range. `MOVED_FEATURE_KINDS` names each target and the loader refuses the old kinds with E_SCHEMA quoting it; the `pin_in_slot` alias is dropped. Every kind has one admitting milestone in `FEATURE_KIND_ADMISSION` (M03 pocket, inlay; M05 conductor, contact, port, pad; M06 bore, window, detent, finger, flexCut, spring; M10 hinge, thread, bayonet, magnet, insert, relief; M11 the other twelve). `FeatureAt<M>` is what a build.ts may declare at milestone M, `PartDraftAt<M>` carries it, and `FeatureKindRegistryAt<M>` requires a complete FeatureKindDef for every kind admitted by M, so no kind is usable before its generator, check and reference compile. M00 admits no kind. `detent` and `spring` stay feature kinds (D-016, D-059) holding beam and strip geometry; their governing numbers come from the mechanisms `count-wheel-detent` and `click-spring-key` through the optional `mechanism` field, as gated metrics. `horn` stays a feature: it cuts a recess on one part from a catalog actuator row, and the servo mate is a joint. |
| Rationale | An expert review found 34 kinds at three levels of abstraction: geometry primitives beside mechanisms with governing identities, a part type and relations between two parts. FeatureKindDef required non-empty checks and references, yet five kinds had no check, four no reference and round no generator, and all of them could be declared in build.ts with nothing proving them, which contradicts the thesis. |
| Evidence | `fab-knowledge:plan/spec/features.ts` (FEATURE_KIND_ADMISSION, FeatureAt, MOVED_FEATURE_KINDS); `fab-knowledge:plan/spec/feature-kinds.ts` (FeatureKindRegistryAt); `fab-knowledge:plan/spec/canon.ts` (MechanismDef.apply, MechanismApplyOut); `fab-knowledge:plan/spec/build.ts` (Author.mech, PartDraftAt); `fab-knowledge:plan/spec/part-ir.ts` (JointDecl.stock, identity assertion); `fab-knowledge:plan/spec/chase.ts` (CouponDecl); `fab-knowledge:plan/spec/fixtures/negative.ts` (early bore, missing def, latch kind) |
| Supersedes | v3 section 4 kinds latch, coupon, pivot, pinInSlot; refines D-017 (pin_in_slot alias dropped), D-058 (the gap list now holds kinds back to their milestone), D-095 (mechanisms gain apply), D-059 (admission milestones move to FEATURE_KIND_ADMISSION in spec/features.ts: inlay M03; spring M06; thread, bayonet, magnet, insert, relief M10; mount M11) |
| Milestone | M-1 (spec); M03, M05, M06, M10, M11 (admissions per FEATURE_KIND_ADMISSION); M06 (MechanismDef.apply for displacement-coincidence-latch, M06-T06) |

### D-178 Chase read as data; build.ts in a sandbox

| field | value |
|---|---|
| Status | decided |
| Decision | `chase.ts` is never executed. Its source is one `export const chase = defineChase({...})` over a literal object (string, number, boolean, null, array and object literals, `as const`), with imports only from `@hackbuild/kernel/author` and `@hackbuild/spec` and type declarations the reader skips; no identifier value, call, spread, computed key, shorthand, getter, method or template substitution; at most 262144 bytes and 32 levels deep (inferred plan budgets). `packages/chase/src/source.ts` parses that form without importing, evaluating or compiling it and returns the chase plus byte spans; a breach is E_SCHEMA with record `chase-source/<rule>`. `chase.validate`, `chase.diff`, `chase.patch`, `part.build` and the app read the chase only through it. `chase.patch` pointer edits replace one literal's span, keep every other byte, and reparse before writing (E_STALE on any difference). `build.ts` runs only in a child node process under `--permission` with read access to the design directory and the resolved kernel and dependency directories, no write, child process, worker, addon or WASI access, an import allowlist (`@hackbuild/kernel/author`, `@hackbuild/spec`, relative files inside the design directory, dynamic import included), `fetch`, `WebSocket`, `EventSource` and `process.binding` removed, a 30000 ms wall budget then SIGKILL and a 2048 MB heap (inferred plan budgets); the parent validates the returned draft against the derived schema before kernel stage 1. A stop is E_KERNEL with record `build-sandbox/<reason>`. `chase.bake` embeds the chase as JSON and bundles `build.ts` with the pinned vite under the same allowlist, so a bake carries JavaScript only. `defHash` covers the reader's canonical chase plus the bytes of `build.ts` and its relative imports, sorted by path. Tests: a `build.ts` calling `fetch`, writing through `node:fs`, importing `node:child_process` or `../outside.ts`, looping forever or returning NaN stops with its reason and writes nothing; each source rule refuses its case; the reader's value equals the module's default export for every reference. | Amended 2026-10-08 (audit, security lens), as built in `core/src/sandbox.ts` and `core/src/sandbox-child.ts` and recorded on spec/build.ts BUILD_SANDBOX: on POSIX the child starts through /bin/sh with `ulimit -t` of wallMs plus 2 s under `env -u PWD -u SHLVL -u _`; the parent SIGKILLs every live child on exit, SIGINT, SIGTERM and SIGHUP; process.send and process._send are sealed in the child and restored only around its one reply, a v8.serialize buffer the parent size-checks before it deserializes; an allowlisted import must resolve by realpath inside its package root; `meta.id` must be a lowercase slug (CHASE_SOURCE_RULES `id`, record `chase-source/id`). Residual risk, accepted: process.channel stays reachable because Node's disconnect path asserts it, so a build that writes raw IPC frames to the pipe handle still meets the buffer-only rule and the size cap but could forge a small reply's profile reads list. Windows keeps a plain fork with no rlimit.
| Rationale | MCP, the CLI and the bake imported and executed `chase.ts` and `build.ts`, and no plan document defined a loader or a trust boundary for a `build.ts` the person did not write (a reference, a copied design, a catalog chase's items). `chase.validate` had to execute code to read declarations, and `chase.patch` JSON-pointer edits on TypeScript source needed an AST writer nobody specified. The literal form also enforces mechanically the rule that a chase declares and never computes. |
| Evidence | `fab-knowledge:plan/spec/chase.ts` (CHASE_SOURCE_RULES, ChaseSourceSpan, ReadChaseSource); `fab-knowledge:plan/spec/build.ts` (BUILD_SANDBOX, BUILD_IMPORTS, BUILD_SANDBOX_REASONS); `fab-knowledge:plan/AGENT-SURFACE.md` (section 3.7); `fab-knowledge:plan/ARCHITECTURE.md` (section 11.2); `fab-knowledge:plan/RISKS.md` (R-25) |
| Supersedes | new; refines D-131 (chase as a TS module, now read as data), D-115 (pointer edits through spans), D-166 (code from the opened workspace, now also sandboxed), D-051 (defHash covers relative imports of build.ts) |
| Milestone | M00 (source reader and sandbox with `part.build`); M10 (span patching with `chase.patch`, bake bundling with `chase.bake`) |

### D-179 Walking skeleton before M00; spec draft until first run

| field | value |
|---|---|
| Status | decided |
| Decision | A milestone M-S (walking skeleton) runs between M-1 and M00. The reference keys flex-pair goes from chase.ts through build.ts, Part IR, six checks (CHK-PRT-04, CHK-NET-02, CHK-NET-05, CHK-KEY-01, CHK-3MF-06, CHK-3MF-07) and a three-slot 3MF, with the CLI only (part.build, check.run, export.run), realGap, prism and stack mesh routes and a 1D path resistance with a charge-release operating point against the rp2040 row. Pocket, conductor, contact and port run as draft defs on that reference only; FEATURE_KIND_ADMISSION does not move. Exit A (machine) gates M00. Exit B: the owner prints it on ffc5p, opens it in Flash Studio and reads both keys on a Pico; each contract problem found becomes a decision entry, and only then do the spec parts the path ran freeze. M04 waits on exit B. Every spec file is draft until the exit of the milestone that first runs it in package code (MILESTONES.md 1.5); a frozen part changes only through a new entry. Plan documents link to spec types and never copy their bodies; tools/lint-plan-types.mjs lists copies from M-S and blocks from the M00 exit. |
| Rationale | Expert review (2026-10-04): the plan set fixes 30 feature kinds, 11 registries, 30 commands, the export gate and loop detection as types before any package code exists, for a one-person studio. A contract wrong at first contact with a real design would force a coordinated rewrite across every plan document that copies it. spec/README.md already lists choices made where the plan was silent, and CANONS.md section 10 lists spec gaps. One printed and read reference tests the contracts cheaper than a rewrite. |
| Evidence | `fab-knowledge:plan/milestones/M-S-walking-skeleton.md`; `fab-knowledge:plan/MILESTONES.md` (1.1, 1.5, 3.7, Part 4); `fab-knowledge:plan/spec/fixtures/keys-flex-pair.ts`; `fab-knowledge:plan/spec/README.md` (choices where the plan was silent); `fab-knowledge:plan/CANONS.md` (section 10) |
| Supersedes | refines D-157 (M-S inserted between M-1 and M00) and D-114 (the CLI exists from M-S on draft contracts) |
| Milestone | M-S; M00 and M04 depend on its exits |

### D-180 Missing sources recovered

| field | value |
|---|---|
| Status | decided |
| Decision | Found on 2026-10-04 in the owner's `~/Downloads` and cited from copies under `fab-knowledge:evidence/x/downloads/<family>/`, each with its sha256 in that family's SHA256SUMS or in its reader note under `fab-knowledge:sources/downloads/`: TANG R6 (r6_0 2026-09-08 to r6_4 2026-09-15); the TANG R5 wiring diagram, `tang_r5_wiring.html` (2026-08-21), which is the R5.29 target although no file carries that label; the TANG R5 scan-six-pads source, R5.26 (`tang_r5_circuit_files.zip` DIMENSIONS.txt, `tang_r5_circuit.html`, `tang_r5_sim (13).html`), checked against `tang_r5_parts (4).zip` before M06; GUDGEON (`gudgeon.html`, 2026-09-16); BAFFLE R3 (14 builds, 2026-09-14 to 09-18) and BAFFLE R2 (11 builds, 2026-09-11 to 09-13); SLATE r5, with r3, r4 and r6; the COAMING 990 KB build (`coaming (3).html`, 991,566 B); STIPPLE R17 and OGEE R17b (2026-08-15); the DAVIT R4 truss (`davit_r4.zip`, with sweep.py, pack_sim.py and verify_sim.py); DETENT rev D (`detentfiles.zip`, 2026-07-30 to 08-01). Citations of these sources stay and point at the copies. Each lineage record names the copied path and its sha256 (D-156); the provenance tier stays as the source states it; an owner-authored file without a LICENSE is ported only after its licence is confirmed in the PR body (LICENSING.md section 3). Recovered files are legacy evidence and parity references; a milestone card that names one decides whether it is ported. The GUDGEON 4 kohm per cm row of D-081 takes its section from `gudgeon.html` at M00. Still missing after searching file names, content to depth 3, the .py and .mjs members of all 205 zips, and all 32 loose .py files: the SLUG trial runner, the SPINDLE pygerber and kiutils reparse scripts, the ARMATURE board scripts and the HEDDLE design files. Defaults for those four: (1) the SLUG runner is rebuilt, seeded, and its status stays unverified (M02, D-136); (2) the SPINDLE reparse is rewritten at M08, and the legacy 99.91 and 99.28 percent figures (35 and 22 holes, 0.32 mm) are kept as history with the method unknown, never as acceptance targets, because they were stated for the pre-hybrid R1, whose gerber set differs from the shipped set in 8 of 9 members and whose module drills miss the 15.24 row; (3) ARMATURE citations are dropped, and three-source power ORing stays unproven; (4) the HEDDLE canon gate stays closed. |
| Rationale | None of the 13 sources D-149 listed was in any harvest. Nine were in the owner's Downloads: TANG R6, TANG R5 wiring, GUDGEON, BAFFLE R3, SLATE r5, COAMING 990 KB, STIPPLE R17, DAVIT R4 and DETENT rev D. Four remain absent. Plan files also cited D-149 for TANG R5.26, TANG R5.29 and HEDDLE, which D-149 did not list; this entry covers them. A SPINDLE README figure stated for a different gerber set cannot gate a rewrite of the shipped set (dl-boards-tools reader). |
| Evidence | `fab-knowledge:sources/downloads/README.md` (section 3, D-149 items); `fab-knowledge:sources/downloads/dl-gudgeon-tang-keyway.md`; `fab-knowledge:sources/downloads/dl-baffle-inlay-coin.md`; `fab-knowledge:sources/downloads/dl-cases.md`; `fab-knowledge:sources/downloads/dl-ogee-stipple-mech.md`; `fab-knowledge:sources/downloads/dl-robots-machines.md`; `fab-knowledge:sources/downloads/dl-boards-tools.md`; `fab-knowledge:sources/downloads/dl-sweep-unmatched.md`; `fab-knowledge:evidence/x/downloads/dl-gudgeon-tang-keyway/tang/tang_r6 (4).html`; `fab-knowledge:evidence/x/downloads/dl-gudgeon-tang-keyway/tang/tang_r6.html`; `fab-knowledge:evidence/x/downloads/dl-gudgeon-tang-keyway/tang/tang_r5_wiring.html`; `fab-knowledge:evidence/x/downloads/dl-gudgeon-tang-keyway/tang/tang_r5_parts (4).zip`; `fab-knowledge:evidence/x/downloads/dl-gudgeon-tang-keyway/unzipped/tang_r5_circuit_files/`; `fab-knowledge:evidence/x/downloads/dl-gudgeon-tang-keyway/gudgeon/gudgeon.html`; `fab-knowledge:evidence/x/downloads/dl-gudgeon-tang-keyway/runs/gud_out.json`; `fab-knowledge:evidence/x/downloads/dl-gudgeon-tang-keyway/runs/r6_out.json`; `fab-knowledge:evidence/x/downloads/dl-baffle-inlay-coin/baffle/baffle (36).html`; `fab-knowledge:evidence/x/downloads/dl-baffle-inlay-coin/baffle/extracted/baffle-r3-model.from-baffle-36.js`; `fab-knowledge:evidence/x/downloads/dl-cases/slate/slate-r5.html`; `fab-knowledge:evidence/x/downloads/dl-cases/coaming/coaming (3).html`; `fab-knowledge:evidence/x/downloads/dl-ogee-stipple-mech/stipple/stipple (1).html`; `fab-knowledge:evidence/x/downloads/dl-ogee-stipple-mech/stipple/stipple.html` (R17); `fab-knowledge:evidence/x/downloads/dl-robots-machines/davit_r4.zip`; `fab-knowledge:evidence/x/downloads/dl-robots-machines/records/davit_r4_verify_sim_run_2026-10-04.txt`; `fab-knowledge:evidence/x/downloads/dl-robots-machines/detentfiles.zip`; `fab-knowledge:evidence/x/downloads/dl-robots-machines/records/detent_revD_verify_run_2026-10-04.txt`; `fab-knowledge:evidence/x/downloads/dl-boards-tools/spindle/files (33)/README.md` (reparse result, lines 290 to 299, no script); `fab-knowledge:evidence/x/downloads/dl-boards-tools/spindle/files (33)/pcb.py`; `fab-knowledge:synthesis/plan-deltas.md` (R69, D21) |
| Supersedes | D-149; plan-deltas R69, D21; refines D-081 (GUDGEON section source) |
| Milestone | M00 (GUDGEON section in profile); M02 (SLUG runner rebuilt; DAVIT R4 parity reference); M06 (TANG, GUDGEON, BAFFLE R3 and STIPPLE sources; TANG R5.26 checked against the parts zip); M08 (SPINDLE reparse rewritten; TANG R5 wiring parity candidate); M16 (legacy folders) |

### D-181 Toolchain pins add @types/node 22.20.5

| field | value |
|---|---|
| Status | decided |
| Decision | typescript 7.0.2, vitest 5.0.3, vite 8.3.2, @changesets/cli 3.0.3, zod 4.6.5, @playwright/test 1.63.0, fast-check 4.10.2, tsdown 0.23.0, @modelcontextprotocol/server 2.3.0 with @modelcontextprotocol/core 2.3.0, manifold-3d 3.5.4, three 0.186.1, @dimforge/rapier3d-deterministic-compat 0.21.0, eecircuit-engine 1.8.0, replicad 1.1.0 (lazy), kicadts 0.0.58, conduyt-js 1.0.0, jszip 3.10.1, @types/node 22.20.5, @virgilvox/hackbuild-ui 0.2.0, lib3mf 2.5.0 (validation only), @visioncortex/vtracer 1.0.0-alpha.4 (evaluation only). The base tsconfig keeps `"types": []`; a package that needs Node types opts in with `"types": ["node"]` (packages/3mf and core). tscircuit and circuit-json get exact pins at M08. Pins are re-dated at each milestone exit. |
| Rationale | The D-040 list had no `@types/node`. A cold-start run (typescript 7.0.2) showed `tsc -b` failing inside jszip 3.10.1's declarations (TS2304 Blob, TS2591 Buffer, TS2503 NodeJS) under the base `types []`, and passing with `@types/node` 22.20.5 (the last 22.x on 2026-10-04, vendor) opted in for packages/3mf. |
| Evidence | `fab-knowledge:evidence/x/coldstart-types`; `fab-knowledge:plan/PLAN.md` (section 16 pin table, @types/node row); `fab-knowledge:synthesis/verified-claims.md` (C8, C9, C10, C14) |
| Supersedes | D-040; plan-deltas R30, R73 |
| Milestone | M-1 (M-1-T01); M00 (M00-T01); re-dated at every milestone exit |

### D-182 Error transport rows

| field | value |
|---|---|
| Status | decided |
| Decision | D-064's contract stands: CheckResult {id, version, verdict, severity, target, measured, legal, constraint, origin (hbf://check/<id>), fix?, extra?}; LegalValues interval carries `nearest`; Fix {param (JSON pointer into params), set, predicts {measured, verdict}} filled from the solver via `CheckDef.drivenBy`; a NaN or missing measured value is E_PARAM_MISSING; error codes E_SCHEMA, E_REF (with didYouMean), E_UNSAT, E_HANDLE, E_STALE, E_PROVENANCE, E_GATE, E_GATE_UNAVAILABLE, E_REPEAT, E_KERNEL, E_PARAM_MISSING. Every code and verdict has one exit and HTTP row, held in `ERROR_TRANSPORT` and `VERDICT_TRANSPORT` in spec/errors.ts, which core/test/transport-map.test.ts imports. The rows D-064 lacked: E_GATE exit 3, HTTP 403 (shared with E_GATE_UNAVAILABLE); E_KERNEL exit 1, HTTP 200 (shared with E_UNSAT; exit 70 stays for crashes); E_PARAM_MISSING exit 2, HTTP 422 (a non-finite value computed from complete inputs is a crash, exit 70, check id in `record`); E_UNSAT exit 1, HTTP 200, `isError: false` (an empty interval is an answer, revising api-library-ai-design.md 6.2); verdict skip exit 0, HTTP 200. AGENT-SURFACE.md 6.2 and M12-T03 carry the same rows. |
| Rationale | D-064 named the codes and EXIT_CODES but gave no exit or HTTP row for E_GATE, E_KERNEL or E_PARAM_MISSING, and earlier drafts disagreed (spec 1 and 1; M12-T03 3 and 70 with HTTP 500). One table that the test imports keeps the CLI, MCP and HTTP in step. |
| Evidence | `fab-knowledge:plan/spec/errors.ts` (ERROR_TRANSPORT, VERDICT_TRANSPORT); `fab-knowledge:plan/AGENT-SURFACE.md` (section 6.2); `fab-knowledge:synthesis/api-library-ai-design.md` (section 6.2) |
| Supersedes | D-064; plan-deltas R53, R83 |
| Milestone | M-1 (spec); M00 (CLI skeleton); M12 (M12-T03 HTTP) |

### D-183 Read model on Chase.hookup

| field | value |
|---|---|
| Status | decided |
| Decision | Read models are pullup, charge-release, adc, ratiometric, column-scan and ladder, with per-net outputs tau, wait and reject; the firmware emitter reads them. They live on `Chase.hookup` entries keyed by port id (`HookupDecl` in spec/chase.ts: port, mcu, pin, read, instance), together with the receiving MCU and pin. PortFeature keeps net, type, interface and voltage. circuit.solve, CHK-NET-05, CHK-NET-29 and the firmware emitter read hookup through CheckCtx; geometry checks never do. Waits are calibrated from a coupon; computed waits carry the computed qualifier. |
| Rationale | PIP measured crossings 10 to 30x computed settle on most keys (D-078). Expert review (2026-10-04) found that the receiving MCU and read model are wiring facts: one printed pad can be wired to an RP2040 or an ESP32-C3, and keeping them on PortFeature forced a new buildHash for a wiring change. |
| Evidence | `fab-knowledge:plan/spec/chase.ts` (HookupDecl, Chase.hookup); `fab-knowledge:evidence/x/pip-controller/docs/electrical.md`; `fab-knowledge:sources/latest/haft-toggle.md` |
| Supersedes | D-078; plan-deltas R49 |
| Milestone | M-1 (spec); M05 |

### D-184 HTTP Origin and Host validation; returned text is data

| field | value |
|---|---|
| Status | decided |
| Decision | `hbf mcp --http <port>` checks `Origin` and `Host` on every request to `/mcp` and `/v1/` before any token comparison: Origin absent, the literal `null` from a `file://` bake, or exactly `http://127.0.0.1:<port>` or `http://localhost:<port>`; Host the bound loopback address. Anything else gets 403 with an empty body and no `E_*` code (AGENT-SURFACE.md 3.4). Text a command returns that a person or another tool wrote (knowledge records, reference READMEs, catalog rows, profile rows, community coupons) travels as `DataText` with tier and contributor (spec/commands.ts) and is data, never instructions (AGENT-SURFACE.md 7.4). One held-out injection task in the agent evals tests it (TESTING.md section 14). |
| Rationale | No entry covered either rule. The MCP Streamable HTTP transport requires servers to validate Origin against DNS rebinding, and clients treat server content as untrusted unless the server is trusted. |
| Evidence | `fab-knowledge:plan/AGENT-SURFACE.md` (sections 3.4 and 7.4); `fab-knowledge:plan/spec/commands.ts` (DataText); `fab-knowledge:plan/TESTING.md` (section 14, injection row); `fab-knowledge:research/ai-tooling-and-api-design.md` (section 2.1) |
| Supersedes | new; refines D-106 (serve over HTTP) and D-107 to D-112 (content rule) |
| Milestone | M12 (M12-T03 HTTP checks); M16 (DataText on knowledge records) |

### D-185 Licences for designs and boards wait on the owner

| field | value |
|---|---|
| Status | decided, owner, 2026-10-13 |
| Decision | Owner, 2026-10-13: the defaults hold. Printable designs are CC BY-SA 4.0, boards CERN-OHL-W-2.0, docs CC BY 4.0 (D-170) and the failure corpus and coupons CC BY 4.0 (D-042); LICENSES/CC-BY-SA-4.0.txt and LICENSES/CERN-OHL-W-2.0.txt land and the path-map rows drop "(owner, default)". The four `reference/boards/*/chase.ts` files declare CERN-OHL-W-2.0 since 2026-10-13; their build goldens were re-recorded with `hbf parity --accept`, and only build.json moved (the licence field, defHash and buildHash), every mesh hash and volume equal (computed). The record before the answer: code and spec stay MIT, no claim on user outputs, and kernel and dependency licences are recorded in BuildInputs (D-041, decided). Default for printable designs: CC BY-SA 4.0; for boards: CERN-OHL-W-2.0 with optional OSHWA certification (cost unverified). The owner's published design repo, pip-controller, is MIT for everything; designs under MIT is the other option. No design, board, knowledge or coupon file reaches a public repo, and LICENSES/CC-BY-SA-4.0.txt, CERN-OHL-W-2.0.txt and CC-BY-4.0.txt do not land, until the owner answers this entry, D-042 and D-170. The path map marks the designs, boards and `knowledge/**` rows "(owner, default)" until then. |
| Rationale | A published licence grant cannot be withdrawn. plan-deltas R74 states that the licence defaults are owner items (D12), yet D-041 was filed decided. REPOS.md makes hackbuild-fab public, so a first push before an answer would grant the defaults. Commits and pushes already wait on the owner (D-006), so the owner is asked at that point. |
| Evidence | `fab-knowledge:synthesis/plan-deltas.md` (R74, line 1046, "Defaults are OWNER (D12)"); `fab-knowledge:evidence/x/pip-controller/LICENSE` (MIT); `fab-knowledge:evidence/x/pip-controller/README.md` (line 249); `fab-knowledge:plan/LICENSING.md` (section 1.2 path map); `fab-knowledge:plan/REPOS.md` (section 6 first commits) |
| Supersedes | refines D-041 (designs and boards become owner items); plan-deltas R74, D12 |
| Milestone | M-1 (path-map rows marked owner); the first public push |

### D-186 OGEE R16-P bill settled

| field | value |
|---|---|
| Status | decided |
| Decision | The nest parity target is the build_plate.py QTY bill: 124 pieces in 20 types with KNOB_DRIVE and 119 in 21 with SERVO_DRIVE, derived at build as 12 + 8N + 5N^2 and 15 + 6N + 5N^2 at N 4 (computed). That bill held from the 2026-08-16 19:39 plate page through the harvest. "99 in 18" is the plate of 14:29 to 16:09 the same day, before caps and the drive split; it shipped in `ogee16-plate (4).html`. "115" is 16:50 to 17:11. The bill derives from scene instances, never from a hand table. Which plate the owner printed is recorded in no file. |
| Rationale | Seven plate-page states were extracted (dl-ogee-stipple-mech reader, 2026-10-04). The newest page, `ogee16 (6).html`, undercounts the same machine at 99 from its N table, and the build-it page prints a 99-piece table beside a 124-piece sim count, so a hand table is not a parity source. |
| Evidence | `fab-knowledge:evidence/x/downloads/dl-ogee-stipple-mech/derived/ogee_bill_timeline.json`; `fab-knowledge:evidence/x/downloads/dl-ogee-stipple-mech/derived/ogee_buildit_run.json` (printed_table_knobs 99, printed_sim_counts_knobs 124); `fab-knowledge:evidence/x/downloads/dl-ogee-stipple-mech/ogee/ogee16-plate (4).html`; `fab-knowledge:evidence/x/downloads/dl-ogee-stipple-mech/ogee/ogee16-plate (9).html`; `fab-knowledge:evidence/x/downloads/dl-ogee-stipple-mech/ogee/ogee16 (6).html`; `fab-work-directory:benches/ogee16/outputs/ogee16-source.zip` (source/build_plate.py) |
| Supersedes | D-148; plan-deltas R92, D22 |
| Milestone | M07 |

### D-187 97-key 3MFs open in Flash Studio

| field | value |
|---|---|
| Status | decided |
| Decision | The 97-key seed exports open in Flash Studio (OrcaSlicer 2.3.2) with every filament intact. Owner saves of BAFFLE, SASH and COTTER generator files keep filament_type, filament_ids, colours and the part to extruder map, rewrite filament_maps to 1..N, fill all 127 template keys from the named preset, and drop the seed's 7 extra keys. The per-slot 127-key port is a fidelity upgrade. Written per-filament values reach the slice only when the preset name resolves on load: a TPU slot written as Generic TPU @FF C5P came back as Generic TPU @System in the FEELER (2026-09-08) and HAFT (2026-09-18 to 19) saves, and those saves replaced the written overrides. A TPU slot therefore carries a warning (PROFILE.md 8.1). |
| Rationale | Owner round trips found in Downloads, 2026-10-04: 12 Flash Studio saves of seed exports (dl-baffle-inlay-coin); FEELER 97-key bench exports followed by same-day saves with the gold's header (669 keys, 127 per-filament keys at 4 slots); five case saves filled to 127 from 114, 80 and 3 exported keys (dl-cases). The FEELER saves overwrote their inputs, so that pairing is inferred. Saves of actual 97-key generator files settle the question; the case saves alone started from other key counts. |
| Evidence | `fab-knowledge:evidence/x/downloads/dl-baffle-inlay-coin/baffle/baffle-wire (1).3mf`; `fab-knowledge:evidence/x/downloads/dl-baffle-inlay-coin/baffle/baffle-wire.3mf`; `fab-knowledge:evidence/x/downloads/dl-baffle-inlay-coin/sash/sash (2).3mf`, `sash (3).3mf`, `sash (4).3mf`; `fab-knowledge:evidence/x/downloads/dl-baffle-inlay-coin/3mf/cotter-kit_custom_2026-09-22 (1)/print/x01_qr-tile-waiver.3mf`; `fab-knowledge:evidence/x/downloads/dl-gudgeon-tang-keyway/feeler/feeler-ladder (1).3mf`; `fab-knowledge:evidence/x/downloads/dl-gudgeon-tang-keyway/feeler/feeler-ladder (2).3mf`; `fab-knowledge:evidence/x/downloads/dl-pip-latest/haft/haft (5).3mf`; `fab-knowledge:evidence/x/downloads/dl-cases/cask/cask_cap_hackbuild (1).3mf`; `fab-knowledge:sources/downloads/dl-baffle-inlay-coin.md` (section 2) |
| Supersedes | D-150; plan-deltas D23 |
| Milestone | M00 |

### D-188 DAVIT R4 interference gate as a parity reference

| field | value |
|---|---|
| Status | decided |
| Decision | D-135's target stands: 30 designed pairs per pipe, zero real fails, both arms, with the runtime mask set. The R4 offline gate is added as an informational parity reference at M02: 43 pair sweeps, zero intersections above 0.5 mm3 except declared press fits. |
| Rationale | 43 is the R4 offline interference gate. sweep.py declares 31 pairs, runs all 31 at 1.25 in, and runs the 6 static-body pairs again at 1 in and 1.5 in (31 + 6 + 6). Reproduced 2026-10-04 (measured): 43 pairs, 38 reaching tier 2, and one intersection above 0.5 mm3, palm and pincap at 3.21 mm3, the designed press fit. |
| Evidence | `fab-knowledge:evidence/x/downloads/dl-robots-machines/unzipped/davit_r4/sweep.py`; `fab-knowledge:evidence/x/downloads/dl-robots-machines/unzipped/davit_r4/pack_sim.py`; `fab-knowledge:evidence/x/downloads/dl-robots-machines/records/davit_r4_sweep_run_2026-10-04.txt`; `fab-knowledge:sources/downloads/dl-robots-machines.md` |
| Supersedes | refines D-135; plan-deltas R58 |
| Milestone | M02 |

### D-189 Colliding slugs, thirteen names

| field | value |
|---|---|
| Status | owner |
| Decision | Default: namespace slugs by group (`copper/stave`, `laser/stave`), rename the laser STAVE to a CASK process variant, and gate the registry on uniqueness and the never-suggest list. Collisions: STAVE, TANG, TACK, TENON, KERF, SPLINE, TESSERA, SHIM, HASP, GROMMET, DETENT, PAWL, SPOOL. |
| Rationale | Each names two or more tools (KERF four, HASP four, GROMMET five, DETENT three), merged from three Downloads readers on 2026-10-04. Final names are the owner's. |
| Evidence | `fab-knowledge:sources/plan/seed-landscape-gaps.md`; `fab-knowledge:sources/benches/benches-cases.md`; `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/registry/tools.json`; `fab-knowledge:sources/downloads/README.md` (section 6); `fab-knowledge:evidence/x/downloads/dl-gudgeon-tang-keyway/spline/spline (5).html`; `fab-knowledge:evidence/x/downloads/dl-gudgeon-tang-keyway/tessera/tessera-architecture.md`; `fab-knowledge:evidence/x/downloads/dl-boards-tools/collisions/`; `fab-knowledge:evidence/x/downloads/dl-robots-machines/detent-L-assembly (1).html`; `fab-knowledge:evidence/x/downloads/dl-robots-machines/pawl.html`; `fab-knowledge:evidence/x/downloads/dl-robots-machines/spool (4).html` |
| Supersedes | D-015; plan-deltas R22, D19 |
| Milestone | M16 (slug gate) |

### D-190 Welcome line case

| field | value |
|---|---|
| Status | decided |
| Decision | Every tool page welcome carries `works from a file. no account. your exports are yours.` and the root README carries the same sentence in sentence case. The rest of D-168 stays an owner item. |
| Rationale | RULES.md sets UI copy lowercase, and UI.md already writes the welcome line in lowercase; D-168 wrote it capitalised for both places. A README is prose, so sentence case applies there. |
| Evidence | `fab-knowledge:plan/RULES.md` (Language, UI copy is lowercase); `fab-knowledge:plan/UI.md` (welcome line) |
| Supersedes | refines D-168 (case of the welcome line) |
| Milestone | M09 (tool page welcome); M-1 (root README) |

### D-191 D-065 and D-073 wording corrected

| field | value |
|---|---|
| Status | decided |
| Decision | D-065 reads: 19 project-level seed checks could not run under the old `CheckDef.run` (computed over hbf/seed/checks.seed.json); after the M04 retarget they are 7 artifact, 7 source, 2 page and 3 project rows. D-073 reads: the 2.5 percent PETG in-plane strain limit is inferred, set below the 2.7 to 3.3 percent the HAFT solver computed for 0.6 mm beams that broke in print; beams bent across layers use 1.5 to 1.8 percent (inferred). |
| Rationale | D-065 quoted "25 artifact checks" from an estimate in prior-art-and-position.md; the seed has no artifact level. D-073 called the limit empirical, which is not one of the D-007 qualifiers, and the 2.7 to 3.3 percent figure is solver output, never a measurement (plan audit 2026-10-04, trace-numbers-a). |
| Evidence | `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/checks.seed.json` (appliesTo levels: feature 28, project 19, part 17, assembly 9, sheet 6, net 6); `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/profile.seed.json` line 140; `fab-knowledge:plan/CHECKS.md` (section 4 retarget, section 7.6); `fab-knowledge:audit/AUDIT.md` |
| Supersedes | refines D-065 (counts) and D-073 (qualifier) |
| Milestone | M01 (strain golden); M04 (retarget) |

### D-192 Living plan scope

| field | value |
|---|---|
| Status | owner |
| Decision | Default: at M-1 the plan set is copied to docs/plan/. DECISIONS.md (append-only), MILESTONES.md Parts 1 and 4, and the current milestone card stay living; every other plan file is frozen as history at M-1. Tables in PACKAGES.md and ARCHITECTURE.md are regenerated from tools/tiers.json and the registries, and every id range and count in docs comes from tools/counts.mjs (keys decisions.range and featureKinds.byOwner, M-1-T11). |
| Rationale | The plan set is about 47,700 lines with about 270 task cards; hand-typed counts and id ranges already disagreed across PLAN.md, DECISIONS.md and DOCS.md before M-1 ran (plan audit 2026-10-04, architecture-scope). Keeping every file living asks one maintainer to sync it with code. |
| Evidence | `fab-knowledge:plan/PLAN.md` (Reading order); `fab-knowledge:plan/DOCS.md` (decision range); `fab-knowledge:plan/PACKAGES.md` (3.4 mesh kinds); `fab-knowledge:audit/AUDIT.md` |
| Supersedes | refines D-162 (which plan files stay living after M-1) |
| Milestone | M-1 |

### D-193 nest.pack moves to layout_solve

| field | value |
|---|---|
| Status | decided |
| Decision | MCP tool 12 is `layout_solve`, covering asm.solve and nest.pack with selector `op` (`assembly` or `nest`), BUILD annotations and task over2s; nest writes only to the store. `export_run` covers export.run alone and keeps the EXPORT annotations and the gate. The `sweep` profile is tools 1, 10, 12, 13, 17 and 19 (6 tools). MCP_TOOL_NAMES keeps 19. |
| Rationale | Host ask rules match tool names, and export_run is annotated destructive, so every nest call (which writes nothing) raised a person prompt and taught people to approve without reading (plan audit 2026-10-04, agent-usability). |
| Evidence | `fab-knowledge:plan/spec/commands.ts` (MCP_TOOL_NAMES, MCP_TOOLS, McpToolIO.layout_solve); `fab-knowledge:plan/AGENT-SURFACE.md` (5.2, 6.5) |
| Supersedes | refines D-107 (the name of tool 12 and the sweep profile) |
| Milestone | M12 |

### D-194 Supply-chain hardening

| field | value |
|---|---|
| Status | decided |
| Decision | Release publishes through npm trusted publishing over OIDC with a pinned npm 11.5.1 or later installed in release.yml; no NPM_TOKEN exists in any repo; the owner does the first publish by hand after D-037 and then registers release.yml as the trusted publisher. Every GitHub Action `uses:` pins a 40-character commit sha with the tag as a trailing comment, and the house-rules check fails on any other ref. `.npmrc` sets ignore-scripts=true; dependencies that need an install script are listed in tools/allowed-scripts.json and rebuilt by `npm run prepare`. `npm audit signatures` runs in release step 2 and in the supply-chain job. |
| Rationale | Token-stealing npm worms in 2025 spread through long-lived publish tokens, mutable action tags and install scripts; the plan used all three (plan audit 2026-10-04, risk-safety-license). |
| Evidence | `fab-knowledge:plan/REPOS.md` (7.3, 8.1 preamble, 10.3 steps 2 and 4); `fab-knowledge:plan/milestones/M-1-housekeeping.md` (T01, T05); `fab-knowledge:plan/TESTING.md` (supply-chain job) |
| Supersedes | new |
| Milestone | M-1 |

### D-195 Code inside design folders is MIT

| field | value |
|---|---|
| Status | owner |
| Decision | Default: build.ts, bench.ts and src/** inside a design or reference folder are MIT; chase.ts and all geometry, exports and docs follow ChaseMeta.license. |
| Rationale | Creative Commons advises against its licences for software, and builder code from designs is ported into the MIT kernel; CC-BY-SA code could not move there without relicensing. `designs/*/firmware/**` is already MIT (LICENSING.md 1.2). |
| Evidence | `fab-knowledge:plan/LICENSING.md` (1.2 path map, section 7 L-04) |
| Supersedes | refines D-041 (code inside design folders); closes LICENSING.md gap L-04 |
| Milestone | M-1 (path map) |

### D-196 Text on a pink fill is ink

| field | value |
|---|---|
| Status | owner |
| Decision | Default: text on a `--hb-pink` fill is `--hb-ink` (4.62:1, computed) in place of `--hb-paper` (3.32:1, computed), through `.hb-on-pink` in fab glue and proposed upstream in the hackbuild-ui 0.3.0 PR (M09-T02 step 3b). |
| Rationale | Every published pink fill sets paper text at 11 px Plex Mono 600, which fails WCAG AA; the focal element the pink budget requires would fail the M09-T14 axe gate (plan audit 2026-10-04, ux-aesthetic-fidelity). |
| Evidence | `hackbuild-ui/src/styles/hackbuild.css` (lines 262, 292, 499, 556, 585); `fab-knowledge:plan/UI.md` (2.1, 17.2) |
| Supersedes | new; GUIDELINES v1.3 item |
| Milestone | M09 |

### D-197 Ghost as the default render

| field | value |
|---|---|
| Status | owner |
| Decision | Default: render modes solid, ghost and xray as UI.md section 12 lists; ghost is the default, keeping conductive and flex bodies solid, as the 2026-09-15 FAB mockup sets it. |
| Rationale | The FAB mockup sets ghost by default; no shipped bench does, so the owner confirms. |
| Evidence | `fab-knowledge:evidence/x/downloads/dl-boards-tools/fab/fab (2).html` (lines 224 to 232); `fab-knowledge:plan/UI.md` (section 12 intro) |
| Supersedes | new |
| Milestone | M09 |

### D-198 CHK-PRT-04 scope and the flex-pair pocket clearance

| field | value |
|---|---|
| Status | owner |
| Decision | Default: CHK-PRT-04 measures walls up to 2 x walls x lineWidth thick (the perimeter-only band); a thicker wall is infill-filled and the check skips it with reason "infill wall". The keys flex-pair pocket clearance becomes 0.26 mm per side (fixture radius key.d / 2 + 0.26), inside the LOCATE drawn band 0.20 to 0.275 at ffc5p petg (computed), so the pocket fit passes CHK-FIT-01. |
| Rationale | At preset one the pocket-to-edge wall is 9.2 mm, 21.9 line widths at 0.42, and the x walls are not line multiples at any preset, so CHK-PRT-04 as written fails a wall nobody prints as perimeters. The declared 0.3 per side sat outside the LOCATE band (plan audit 2026-10-04, execute-m0-ms). |
| Evidence | `fab-knowledge:plan/spec/fixtures/keys-flex-pair.ts`; `fab-knowledge:plan/PROFILE.md` (7.3 LOCATE drawnFor); `fab-knowledge:plan/CHECKS.md` (CHK-PRT-04) |
| Supersedes | new |
| Milestone | M-S (exit A) |

### D-199 Derived verdict qualifier

| field | value |
|---|---|
| Status | owner |
| Decision | Default: not adopted. A claim proved from geometry alone with no material constant reads computed, as today. The proposal: a `derived` qualifier, reported apart from vendor and measured claims, touching the spec/checks.ts verdict schema and the RULES.md qualifier list. |
| Rationale | PhaseLock Sheet V1 separates geometry-only claims from material-constant claims; the plan has five qualifiers (D-007) and no such split. |
| Evidence | `fab-knowledge:evidence/x/downloads/dl-sweep/phaselock/phaselock_sheet_v1.html`; `fab-knowledge:plan/CHECKS.md` |
| Supersedes | new |
| Milestone | none |

### D-200 Sealed-pocket floor and roof; pauseBefore is z only

| field | value |
|---|---|
| Status | owner |
| Decision | Default: the sealed-pocket floor (at least 0.6 mm) and roof (at least 0.8 mm) of D-062 count all plastic below and above the pocket, the reading the owner COLLAR cards pass (1.60/1.60 and 1.68/1.72 mm, computed). The alternative counts only the wall between the pocket and the inlay body, which both cards fail on the roof (0.40 and 0.52 mm). PauseBefore carries z only, as spec/features.ts declares; the layer is derived from z on the machine grid. |
| Rationale | The COLLAR 0.24 card declares z 2.28 while its layer 11 starts at 2.41 mm on ffc5p_20260819 (computed), so a stored layer would disagree with z. |
| Evidence | `fab-knowledge:evidence/x/downloads/dl-baffle-inlay-coin/collar/collar-print-card.txt`; `fab-knowledge:evidence/x/downloads/dl-baffle-inlay-coin/collar/collar-print-card (1).txt`; `fab-knowledge:plan/spec/features.ts` (PauseBefore); `fab-knowledge:plan/milestones/M03-inlay.md` |
| Supersedes | refines D-062 (reading of floor and roof; pauseBefore fields) |
| Milestone | M03 |

### D-201 Pinning trusted build.ts by defHash

| field | value |
|---|---|
| Status | owner |
| Decision | Default: not adopted. A person reviews a build.ts they did not write before it runs; the sandbox (D-178) limits an honest or careless build and is no security boundary against a hostile one. The proposal: `hbf trust <design>` pins defHash in .hbf/trusted.json, and an untrusted build over MCP returns E_GATE_UNAVAILABLE. Amended 2026-10-11 (audit3): the rule covers a direct-route board's gen.py as it covers build.ts (D-089). On darwin gen.py runs under sandbox-exec with no network, writes only to its run folder and no program but the tools/py interpreter; its reads are unrestricted, so it can copy readable files into its fab outputs, and on Linux and Windows it runs unconfined. Pinning a reviewed gen.py by its hash (defHash already covers it, core/src/board.ts generatorInputs) stays an owner option under this entry. |
| Rationale | Node documents its permission model as no guarantee against malicious code; a copied design or catalog chase can carry a hostile build.ts (plan audit 2026-10-04, risk-safety-license). |
| Evidence | `fab-knowledge:plan/ARCHITECTURE.md` (11.2); `fab-knowledge:plan/spec/build.ts` (BUILD_SANDBOX) |
| Supersedes | new |
| Milestone | none |

### D-202 Snap family admits snap-vee-finger-cage

| field | value |
|---|---|
| Status | owner |
| Decision | Default: snap-vee-finger-cage (DETENT rev D) is listed in the CANONS.md snap table and kept out of the M06 counts until the owner widens the D-096 snap family from five to six. |
| Rationale | DETENT rev D, recovered on 2026-10-04, carries a vee finger cage that none of the five D-096 snap forms describes. |
| Evidence | `fab-knowledge:evidence/x/downloads/dl-robots-machines/unzipped/detentfiles/DETENT-build-notes.md`; `fab-knowledge:plan/CANONS.md` (snap table) |
| Supersedes | refines D-096 (snap family size) |
| Milestone | M06 |

### D-203 Canon status after the recovered sources

| field | value |
|---|---|
| Status | decided |
| Decision | pin-free-balance-beam is typed with reference joints/balance-beam (STIPPLE R17 link()). membrane-slider-wall, scan-six-pads and face-as-board are proven with references sensors/membrane-slider, sensors/scan-six-pads (new) and conductors/face-as-board (TANG R5 and R6). printed-pullup-meander is a candidate (r6_0 source only). Expected at M06 exit: mechanisms typed 23, stub 1; archetypes over 34 ids proven 26 in 27 reference folders, stub 0, candidate 7, unproven 1 (computed from the CANONS.md tables; generated at M06 exit). |
| Rationale | D-180 recovered the STIPPLE and TANG sources these entries were waiting on. |
| Evidence | `fab-knowledge:plan/CANONS.md` (2.1, 4.1, 8.1, 8.2); `fab-knowledge:evidence/x/downloads/dl-ogee-stipple-mech/stipple/stipple (1).html`; `fab-knowledge:evidence/x/downloads/dl-gudgeon-tang-keyway/tang/tang_r6 (4).html`; `fab-knowledge:evidence/x/downloads/dl-gudgeon-tang-keyway/runs/r6_out.json` |
| Supersedes | refines D-097 (stub and typed split) and D-098 (archetype statuses); follows D-180 |
| Milestone | M06 |

### D-204 Downloads placement by hash, then date, then title

| field | value |
|---|---|
| Status | decided |
| Decision | tools/registry/place.mjs (M16-T09 step 2a) selects a Downloads file by sha256 dedupe, then newest mtime, then a title check, and never by basename. It replaces the shipped place.py. |
| Rationale | Downloads hold up to 14 copies of one name, several byte identical and several different revisions; basename picks the wrong one. |
| Evidence | `fab-knowledge:evidence/x/downloads/dl-boards-tools/hackbuild-tools-2/place-dryrun-2026-10-04.tsv`; `fab-knowledge:plan/milestones/M16-knowledge-registry.md` (M16-T09) |
| Supersedes | new |
| Milestone | M16 |

### D-205 Coupons from the part source module, with a clearance ladder

| field | value |
|---|---|
| Status | decided |
| Decision | A coupon is generated from the same source module as the part it qualifies, with identical joint dimensions. Each joint coupon set carries a clearance ladder at 0.20, 0.30, 0.40 and 0.50 mm per side; the smallest step that moves freely enters the profile as a measured row (D-082, D-083). |
| Rationale | A coupon written as a separate model drifts from the part. PhaseLock V1 builds its coupons from the joint module it ships. |
| Evidence | `fab-knowledge:plan/TESTING.md` (6.2.1); `fab-knowledge:evidence/x/downloads/dl-sweep/phaselock/phaselock_sheet_v1.html` |
| Supersedes | new |
| Milestone | M05 (first coupons) |

### D-206 Spec and runtime contract corrections from the 2026-10-04 audit

| field | value |
|---|---|
| Status | decided |
| Decision | Kernels and check runners dispatch through the typed registry lookups featureKind, checksFor and check, with the one correlated cast in core/src/registry.ts. Check run bodies return Finding; the registry stamps id, version, severity, origin and waived. CheckDef is generic over feature kind K; AnyCheckDef uses K = any. Generators return ShapeDecl declarations; MeshRef exists only in Part IR, assigned at stages 7 and 8; KernelCtx carries MachineView, the host BodyDraft and the declared faces. Bound carries side lo or hi. A feature records the param pointers it took through Author.bind (FeatureBase.drivenBy). bore, pocket and tabSlot fit is a FitDecl. defineChase checks preset keys, field id uniqueness, enum defaults and showWhen references at the type level; chase.validate and chase.patch apply CHASE_PARAM_RULES, default-range included, at runtime. The charge-release read model carries waitSource and the emitter derives the qualifier. Fix carries paramLegal and an optional patch; PatchEdit gains a param form. drawnFor returns null when no loss row matches. nest.pack and export.run take kerfMode. The build.ts child runs with an empty environment. spec/jcs.ts is the one canonicalizer and sha256 for every tier; core assembles BuildInputs and buildHash from M-S and M00, and project owns the coverage test at M04. NonceLedger.consume takes .hbf/gate-used.lock and args-moved is checked before the nonce is spent. CHK-MOT-05 uses margin + overshoot = (fullRise - halfRise) - camlift - lugTot, a major bump folded into the D-177 2.0.0 retarget. |
| Rationale | Each item is a verified finding of the plan audit of 2026-10-04 where the contract as written could not be implemented without casts, guesswork or a second implementation. |
| Evidence | `fab-knowledge:audit/AUDIT.md`; `fab-knowledge:plan/spec/` (tsc 7.0.2 strict, exit 0 on 2026-10-04); `fab-knowledge:evidence/audit/spec/impl/mem.ts` (AUDIT tags) |
| Supersedes | refines D-047, D-051, D-058, D-064, D-109, D-131, D-173, D-177 and D-178 |
| Milestone | M-S, M00, M04, M06, M10, M12 |

### D-207 realGap pinned on the per-side basis

| field | value |
|---|---|
| Status | decided |
| Decision | The D-100 joint is pinned as realGap(0.275, "hole", "ffc5p", "petg") = 0.075 per side to 6 digits (computed; 0.55 drawn and 0.15 real across the joint). Seed loss values are diametral and are halved on import into LossRow.holeUnderPerSide and outerOverPerSide; the machine-level fallback is 0.275 - 0.075 - 0.05 = 0.15 per side. realGap returns Mm; realGaps returns both sides. |
| Rationale | The diametral call realGap(0.55, ...) = 0.15 gives 0.35 under the per-side contract of spec/profile.ts (execute-m0-ms, ms-t02-profile.txt). |
| Evidence | `fab-knowledge:plan/spec/profile.ts` (realGap); `fab-knowledge:plan/PROFILE.md` (7.1, 7.2); `fab-knowledge:evidence/audit/m0/exec/logs/ms-t02-profile.txt` |
| Supersedes | refines D-100 (the pinned call) |
| Milestone | M-S, M00 |

### D-208 Layer tops snapped; parity Z exemption

| field | value |
|---|---|
| Status | decided |
| Decision | Layer tops enter the mesh kernel as q(firstLayer + i x layerHeight), never accumulated, where q is the D-054 1/1024 mm snap; exactZ compares against that snapped grid exactly. A parity route that must match a non-dyadic legacy grid states the exemption in its card: the COLLAR raster parity build passes legacy slab bounds unsnapped in Z (XY snap only), and a second test snaps Z on both sides. |
| Rationale | The snap moves 0.2 to 0.2001953125 and 0.4 to 0.400390625, and COLLAR parity then misses by 0.06 to 0.57 mm3 against a 1e-3 tolerance; without the Z snap it matches to 5e-11 mm3 (execute-m0-ms). |
| Evidence | `fab-knowledge:evidence/audit/m0/exec/logs/collar-raster-parity.txt`; `fab-knowledge:evidence/audit/m0/exec/logs/ms-t03-mesh.txt` |
| Supersedes | refines D-054 (Z on parity routes; layer tops) |
| Milestone | M-S, M00 |

### D-209 view.render is a software rasterizer

| field | value |
|---|---|
| Status | decided |
| Decision | view.render draws top, front, iso and section orthographic PNGs of a stored build with a z-buffer rasterizer over Part IR triangles in core/src/render/ and a node:zlib PNG writer, with no browser and no three. Its PNG hashes join the determinism comparison. Browser screenshots stay in chase.render and tools/smoke. |
| Rationale | Playwright 1.63.0 installs no Chromium on the owner machine (macOS 12, arm64), and core may not import three or a browser (ARCHITECTURE.md section 3). |
| Evidence | `fab-knowledge:evidence/audit/m0/exec/logs/pw-install.txt`; `fab-knowledge:plan/RISKS.md` (R-24); `fab-knowledge:plan/milestones/M00-foundation.md` (M00-T13) |
| Supersedes | new; reverses the earlier rule that excluded render PNGs from determinism |
| Milestone | M00 |

### D-210 Relay grant MAC and laser safety

| field | value |
|---|---|
| Status | decided |
| Decision | A relay grant secret never travels on a relay. Each relay-origin consequential message carries seq (u32, strictly increasing per grant) and mac = HMAC-SHA256(secret, deviceUid || armGeneration || seq || canonicalPayload) truncated to 16 bytes; consequential commands go as CLASP Events, never Params. A device offering fire.laser declares a non-null deadmanMs, a DutyLimit, a laser block (class, wavelength, power, tier) and a bootSafe row for the beam pin (CHK-DEV-04, block); the manual-hold keepalive stops on blur, hidden visibility and pagehide. M13-T19 measures dead-man, duty and boot state on hardware. |
| Rationale | A bearer token on a public relay reaches every subscriber of the base path; a keepalive proves a page is open, not that a person is present (plan audit 2026-10-04, risk-safety-license). |
| Evidence | `fab-knowledge:plan/milestones/M13-link.md` (T01, T07, T08, T18, T19); `fab-knowledge:plan/CHECKS.md` (9.8) |
| Supersedes | new |
| Milestone | M13 |

### D-211 npm name for the CLI

| field | value |
|---|---|
| Status | owner |
| Decision | Default: every plan command runs `npx --no-install hbf`, which resolves the workspace bin and never falls back to the registry; the owner reserves `hbf` or `@hackbuild/hbf` on npm when the org exists (D-037). |
| Rationale | No package named hbf exists on npm (404 on 2026-10-04); a bare `npx hbf` with no local bin installs whatever later claims the name. |
| Evidence | `fab-knowledge:evidence/audit/m0/exec/logs/ms-t08-npx-hbf.txt`; `fab-knowledge:plan/MILESTONES.md` (2.5) |
| Supersedes | refines D-037 (adds the CLI name question) |
| Milestone | M-S |

## Gold standard

Appended 2026-10-05 from `fab-knowledge:synthesis/gold-standard.md`, the study of the six benches the owner named as their best (TOGGLE, BLOCKS, PIP/HAFT, COTTER, COLLAR, TANG R6), each driven in headless Chrome at 1280 x 860 and 390 x 844 on 2026-10-05. Study notes are `fab-knowledge:sources/gold/*.md`; screenshots are `fab-knowledge:evidence/gold/<bench>/shots/` (526 PNGs, counted). "G-NN" is a rule of gold-standard.md section 11; "P-NN" is a plan gap of its section 12.

### D-212 Gold checklist is the bench acceptance bar

| field | value |
|---|---|
| Status | decided |
| Decision | The 57 rules G-01 to G-57 of gold-standard.md section 11 are acceptance rules for every baked bench from M09. A rule binds where its precondition holds (a contact model for G-19 to G-24, an electrical panel for G-29, firmware for G-50); a rule that does not apply reports `n/a` with the reason, never pass, and a rule that did not run reports not run (D-153). TOGGLE, BLOCKS, PIP/HAFT, COTTER, COLLAR and TANG R6 are the reference set for the `single` and `composer` kinds; `surface`, `board`, `machine` and `catalog` have no gold bench and take only the rules that apply. G-43 (one focal pink) and G-54 (44 px targets) hold even though every gold bench breaks them today. Plan gaps P-01 to P-35 are adopted as draft changes to spec/chase.ts, spec/bench.ts, spec/hook.ts, spec/checks.ts, UI.md, CHECKS.md and TESTING.md, with the D ids below, except P-20 and P-21, which go to the owner (D-220, D-221). |
| Rationale | The owner named these six as their best work; ranking the patterns they share (gold-standard.md section 2) gives a bar a generated bench can be tested against, and the gaps list names what in the plan stops a generated bench reaching it. |
| Evidence | `fab-knowledge:synthesis/gold-standard.md` (sections 1, 2, 11, 12); `fab-knowledge:sources/gold/toggle.md`, `blocks.md`, `pip-haft.md`, `cotter.md`, `collar-coin.md`, `tang-r6.md` |
| Supersedes | new; refines D-125 (adds the G checklist beside the UX law) and D-152 (smoke level gains the G rules) |
| Milestone | M09 (bench layer rules on the reference bake); M10 (every applicable rule on the six designs) |

### D-213 Runtime budgets measured on the gold benches

| field | value |
|---|---|
| Status | decided |
| Decision | TESTING.md 8.3 inferred targets are replaced by the gold-standard.md section 9 budgets, measured 2026-10-05 on swiftshader: navigation to ready 4 s (fail 15 s); first build 600 ms (fail 2 s); commit to settled p90 over liveness edits 2 s (fail 4.5 s); light commit 50 ms with no build (fail: any build); a build over 1 s shows `building` and accepts input; a build over 2.5 s logs a slow-build line naming the param to lower (`BenchDecl.build.slowMs`, default 2500, P-29); 3MF export 1 s (fail 10 s); a hook value outside a param range is clamped or refused with a log line in under 100 ms. Zero console errors and zero external requests across the drive (G-57). |
| Rationale | Five of six gold benches reach ready under 4.2 s and first build under 520 ms (measured); the plan targets were inferred before any bench was driven. PIP hung over 20 minutes on a 40 x 30 body set through the hook (measured). |
| Evidence | `fab-knowledge:synthesis/gold-standard.md` (section 9, rules G-55 to G-57, gaps P-29 and P-30); `fab-knowledge:sources/gold/pip-haft.md` (40 x 30 hang); `fab-knowledge:plan/TESTING.md` (8.3) |
| Supersedes | TESTING.md 8.3 inferred targets (P-30) |
| Milestone | M09 |

### D-214 BenchHook error state, tilt drive and range clamps

| field | value |
|---|---|
| Status | decided |
| Decision | spec/hook.ts (draft until M09) gains: `drive(target, value)` accepts `{ tiltDeg, phiDeg }` beside number and boolean; `release(target?)`; `readonly error: string \| null`, the last build error, cleared by the next good build. `exportBytes` with an unknown kind rejects with `unknown export kind: <k>`. The `state` setter and `loadDesign` clamp to declared ranges and log field, value and range for each clamp. A thrown build clears busy, keeps the last mesh, shows an error chip with text, and a valid commit recovers. Non-Error throws are stringified. |
| Rationale | PIP's kernel crash left busy true for good; PIP and TOGGLE throw TypeErrors on unknown export kinds; COTTER logs `failed to build: undefined`; TOGGLE's tilt target cannot be driven through a scalar (gold-standard.md 7.2, P-06, P-07). |
| Evidence | `fab-knowledge:synthesis/gold-standard.md` (sections 7.2, 11 rules G-10, G-11, G-51; section 12 P-06, P-07); `fab-knowledge:plan/spec/hook.ts` |
| Supersedes | refines D-128 (adds members; the PIP getter style stays) |
| Milestone | M09 |

### D-215 Drive pad from built geometry, one contact function

| field | value |
|---|---|
| Status | decided |
| Decision | A design with a contact model declares a drive pad (`DriveDecl.gesture` one of hold, tilt, slide, stick; `pad.draw` geometry; `springMs` default 360; `holdToggle`, `chords`, `split`; P-05). Every region and threshold the pad draws comes from the solved geometry. Pad, 3D pose, readout and `BENCH.drive` call one contact function and agree to 0.01. Gestures use pointer capture, `touch-action: none` and release on pointercancel. Clicking a target in 3D drives it as the pad does. While held, the held net and its return light in xray and the rest dim; section follows the last driven target. Two lit colours mark contact state, the same on pad, legend and 3D. At 390 px the pad covers at most 25 percent of the stage and each key is 44 x 44 px. |
| Rationale | The two gold benches with a drive pad, TOGGLE and PIP, are the two the owner names first; the pad closes the loop from finger to pin level (gold-standard.md 2 rank 4, 3.2). At 390 px TOGGLE's pad covers about a third of the stage and PIP's about half, with 19 px keys (measured). |
| Evidence | `fab-knowledge:synthesis/gold-standard.md` (sections 3.2, 10, rules G-19 to G-24, G-52; gaps P-05, P-33); `fab-knowledge:sources/gold/toggle.md`; `fab-knowledge:sources/gold/pip-haft.md` |
| Supersedes | new; refines D-125 (touch parity) |
| Milestone | M09 (pad and contact function); M10 (TANG-style pads and membrane when ported) |

### D-216 Readouts carry value, verdict and limit

| field | value |
|---|---|
| Status | decided |
| Decision | A derived field may carry `limit` (min, max and the check id that holds the same limit), `verdict` (threshold-keyed words) and `focal`; a `ParamGroup` may carry `readouts`, rendered as the VT323 grid at the foot of the group (P-02, P-03). A solved mechanism may declare a plot with contact, peak and zero marks and a behaviour word (P-04). A constraint note is a CheckResult bound to its field (`ParamField.checks`) rendered under the row; static help stays in `help` (P-25). Readouts are re-measured from built geometry, recompute on every build and on every material property edit, render in the error colour past a limit, take logic verdicts from the MCU pin table with its undefined band, and never parse check text. Quantities the geometry computes are readouts, never inputs. |
| Rationale | All six gold benches put a value with its meaning under the control that moves it (gold-standard.md 1 item 3, 4.2); BLOCKS' single 0.5 VIO threshold and TANG's report parsing check text are the counter examples. |
| Evidence | `fab-knowledge:synthesis/gold-standard.md` (sections 4, rules G-25 to G-31, G-39; gaps P-02 to P-04, P-25); `fab-knowledge:sources/gold/tang-r6.md`; `fab-knowledge:sources/gold/blocks.md` |
| Supersedes | refines D-124 (constraint notes get a bound home) and D-132 (derived field and group shape) |
| Milestone | M09 (rail rendering); M10 (chase fields) |

### D-217 Composer instances and stage tools, no seventh kind

| field | value |
|---|---|
| Status | decided |
| Decision | No seventh kind. A `composer` whose chase has an `instances` param (typed instances with per-type fields, optional lattice placement with pitch, faces and mirror; P-12) gets an inspector drawer for the selected instance and the declared stage tools (`ViewsDecl.tools`: move, wire, rotate, delete, place, run; P-13). TOGGLE, TANG and COTTER join BLOCKS and PIP as composer references (P-31). A part whose build throws becomes a visible placeholder with a warning while the rest stays built (G-38). |
| Rationale | COTTER and BLOCKS compose typed instances on a lattice and edit on the stage; the slot valve of D-126 covers them once the instance type and the tools are declared (gold-standard.md 0, 6). |
| Evidence | `fab-knowledge:synthesis/gold-standard.md` (sections 0, 6, rule G-38; gaps P-12, P-13, P-31); `fab-knowledge:sources/gold/cotter.md`; `fab-knowledge:sources/gold/blocks.md` |
| Supersedes | refines D-126 (kinds stay six; the composer row gains the inspector and tools) |
| Milestone | M10 |

### D-218 Steps, freshness and status describe the view on screen

| field | value |
|---|---|
| Status | decided |
| Decision | A step's done badge means its checks pass; visited is a separate underline mark (P-34). A `RailStep` may set `view` and `cam`, applied on step entry, and its `focus` may name a derived field (P-08). Status chips add `mesh.fresh`, `mesh.manifold`, `route.verdict`, `warn.count`, `bed.fit`, `mass` and `derived.<id>` (P-09). Range input marks the mesh stale and the chip reads `mesh stale` until the build lands. The status count equals the findings in the rail for the view on screen; the all-clear names what passed and how many checks ran, and zero checks reads as zero. A bad design file leaves the design untouched behind an error chip; no alert() or confirm() for errors. |
| Rationale | Gold freshness and failure display carry trust in every number (gold-standard.md 2 rank 1 and 5); BLOCKS reports `all pass (0 fits checked)` and `circuit solved` while the scene reads nothing; COTTER and TANG use alert() on a bad file. |
| Evidence | `fab-knowledge:synthesis/gold-standard.md` (sections 5, 7, rules G-03, G-33, G-36, G-37, G-40, G-44, G-45; gaps P-08, P-09, P-34) |
| Supersedes | new; refines D-125 (the last step is the export step) |
| Milestone | M09 |

### D-219 Export row names failing checks; the kit and card follow the build

| field | value |
|---|---|
| Status | decided |
| Decision | In the bench, the export row lists failing checks by id and message, and a fabrication export from a design with any fail needs one confirm that names them (P-27). Exports await ensureMesh, pause the render loop and are byte deterministic apart from 3MF dates. `ExportDecl` gains `bundle`, `naming: "xNN_"`, `plates` (FDM packing on a bed), `card.sections` and `presets` (printer, process, filament names); the card's assembly lines come from a build function so they follow the current mode (P-26). The agent route is unchanged: D-109 still governs `export.run`. |
| Rationale | No gold bench annotates an export from a failing design (TOGGLE ROUTE FAILED exports the same; COLLAR exports a 0.20 mm roof); PIP's card says to press the bezel onto its pegs with pegs off; COTTER's kit zip is the reference for quantity naming and plates (gold-standard.md 5.2, 8). |
| Evidence | `fab-knowledge:synthesis/gold-standard.md` (sections 5.2, 8, rules G-46 to G-49; gaps P-26, P-27); `fab-knowledge:sources/gold/cotter.md`; `fab-knowledge:sources/gold/collar-coin.md` |
| Supersedes | new; refines D-109 for the person-facing bench |
| Milestone | M09 (export row); M10 (ExportDecl fields) |

### D-220 Slot colour on the stage and in the 3MF

| field | value |
|---|---|
| Status | owner |
| Decision | Default (gold behaviour): `MaterialSlot` gains `preview?: string` (hex). The stage, legend and art boards draw each slot in its colour, and the 3MF writer writes it as that slot's filament colour, as TANG, TOGGLE, COLLAR and COTTER do. A colour edit is a light commit: no build, meshHash and buildHash unchanged, export bytes change. The alternative is the plan as written: "colours belong to the slicer", the stage draws role colours and the 3MF carries no slot colour. |
| Rationale | Five of six gold benches carry slot colour to the stage, legend and 3MF; BLOCKS recolours stage and legend on a colour edit (measured, blocks-d-41); the plan's MaterialSlot comment leaves HAFT's colour pickers with no home. Owner saves already keep colours through Flash Studio (D-187). |
| Evidence | `fab-knowledge:synthesis/gold-standard.md` (section 12, P-20); `fab-knowledge:sources/gold/pip-haft.md` (mapping table, slot colour row); `fab-knowledge:sources/gold/blocks.md` (3.2 MATERIALS); `fab-knowledge:plan/spec/chase.ts` (`MaterialSlot.slot` comment); `fab-knowledge:plan/UI.md` (6.3) |
| Supersedes | spec/chase.ts `MaterialSlot` comment "colours belong to the slicer" and UI.md 6.3, under the default |
| Milestone | M09 (stage and legend); M10 (`MaterialSlot.preview` and the 3MF colour) |

### D-221 Legend as the colour key; materials as a step

| field | value |
|---|---|
| Status | owner |
| Decision | Default (gold behaviour): the stage legend is the colour key on every step and collapses to status chips under 640 px (D-125). Materials and resistivity are a step pane, or a fold in the first step, where they drive readouts (BLOCKS MATERIALS step, PIP fold); the rail no longer pins a materials panel first on every pane. The alternative is the plan as written: a materials panel pinned first on every pane as the colour key. |
| Rationale | None of the six gold benches pins materials first; all six use the stage legend as the colour key and give materials a step or a fold (gold-standard.md 3.1, 5.1). A pinned panel spends rail height on every step that the readout grids under each group (D-216) need. |
| Evidence | `fab-knowledge:synthesis/gold-standard.md` (sections 3.1, 5.1; section 12, P-21); `fab-knowledge:sources/gold/blocks.md` (3.2); `fab-knowledge:sources/gold/pip-haft.md` (MATERIALS AND READ TIMING fold); `fab-knowledge:plan/UI.md` (6.3, 9 law row "the materials panel is the colour key") |
| Supersedes | UI.md 6.3 first bullet, the UI.md section 9 law row and PLAN.md section 15 "materials pinned first", under the default |
| Milestone | M09 |

### D-222 Originals are the sample set; mockups are a secondary idea source

| field | value |
|---|---|
| Status | decided |
| Decision | The sample set for every builder and agent is `knowledge/designs/` (one record per design, plus `INDEX.md` and `MECHANISMS.md`) and `fab-knowledge:originals/` (the canonical files, shots and SHA256SUMS per design). Before writing code a builder reads the record of the design the task touches, and ports a mechanism (spring buttons, hinges, snaps, detents, joints and the rest) from the original file and lines its MECHANISMS.md row names. The gold benches (D-212) and the originals are the quality bar. The fourteen generated mockups, moved to `fab-knowledge:mockups`, are a secondary, untested idea source. Their good ideas are ranked in `fab-knowledge:originals/IDEAS-FROM-MOCKUPS.md`; an idea is adopted only where it does not conflict with an original, and only after it is built and tested like any other change. No number, fixture or golden comes from a mockup, and a mockup is never a reference or few-shot example. |
| Rationale | Owner instruction of 2026-10-05: the fourteen generated mockups fall below the original benches (not all 3D, janky interaction, a coin designer weaker than COLLAR), and they must not muddy the sample set. Clarified the same day: the mockups hold some good and some better ideas, with UI and UX not fully there and nothing tested, so they are worth incorporating below the originals. Every proven design and mechanism has to stay traceable to the original that made it, so a builder makes new things the same way. |
| Evidence | owner instruction relayed 2026-10-05; `fab-knowledge:originals/INDEX.md` (79 designs in 13 families, tiers gold, bar, lineage and evidence); `fab-knowledge:originals/MECHANISMS.md` (section 1 spring buttons: PIP flex cone and click spring, THINPOT dome, BLOCKS and BOSS cone array, ladder keypad); `knowledge/designs/` (repo copies); `lineage.json` (canonical rows per design file) |
| Supersedes | new; replaces the CLAUDE.md on-demand line that pointed at `fab-knowledge/examples/` as illustrative target outputs and the hard rule on copying numbers from it |
| Milestone | M-1 (CLAUDE.md); every milestone that ports a design or mechanism |

### D-223 The flex-pair key is the PIP flex cone key; four slots on ffc5p

| field | value |
|---|---|
| Status | decided |
| Decision | The keys flex-pair reference (`reference/keys/flex-pair`, M-S, D-179) builds each key the way PIP builds its flex cone key (`knowledge/designs/pip.md` 5.1), ported from pip-controller `src/layout.js` flexDims lines 149 to 160 and `src/model.js` lines 61 to 88 and replacing the stair-stepped cTPU cone the walking skeleton first approximated. Each key is a TPU 95A cone and its buried foot ring as one revolved profile on the M00-T05 revolve route, from one layer into the body, kink points inset EZ 0.02 mm inside the well (CHK-KEY-06), alpha 40 deg, wall 0.6 mm, hole 3.6 mm (source values); a separate cTPU cap disc of radius rnt + 0.3 mm, 0.72 mm thick, bridging the hole; the TPU key top (collar, 45 deg flare, face disc 1.2 mm, protrude 2.6 mm) as a second revolved profile; split cPLA half columns of radius colR = max(0.9, rh - 0.2) = 1.6 mm, colGap 0.8 mm, rising from the trace band to colTop = zf + cone - gap; and a well of radius wellR = rsb + 0.6 mm. The pad thickness is PIP's flex need snapped up to a layer top and the key floor is PIP's snapN rule, with the under-cone pocket when the floor lifts. The materials follow PIP's slots on the four-toolhead ffc5p: slot 1 PETG body, slot 2 cPLA traces and columns, slot 3 TPU 95A cones and key tops, slot 4 cTPU caps, with PIP's slot colours; the export has four filaments. PIP's flex fits rows (cap bridge, split, column to cone wall, proud, smallest feature) are informational metrics that warn on failure. Two choices are kept from M-S: the cone top snaps to a layer top through `m.layer` so the cap starts on a layer, and the travel stays a mm param (default 1.84 mm, PIP's gapPct 45 over the built cone 4.08 mm on the 0.02 mm step; computed) because CHK-KEY-01 fixes the value it measures (D-064). At defaults the cone is 4.08 mm, colTop 4.65 mm, cap underside 6.49 mm, pad top 8.41 mm and the CHK-KEY-01 interval 1.632 to 2.04 mm with fix 1.64 mm for gap 1.0 (all computed). |
| Rationale | Owner instruction of 2026-10-05: the originals are the bar (D-222), and the printed key must follow the owner's proven PIP flex cone key instead of the skeleton approximation. The revolve route and the stage runner of M00-T05 now carry a revolved profile, so the stacked bands are no longer needed. A percent param cannot take CHK-KEY-01's mm fix, so the travel keeps its unit. |
| Evidence | `knowledge/designs/pip.md` sections 4.2, 5.1, 5.14 and 5.15; `fab-knowledge:evidence/x/pip-controller/src/layout.js` lines 35, 47 to 52 (slots) and 149 to 160; `fab-knowledge:evidence/x/pip-controller/src/model.js` lines 61 to 88 and 455 to 462; `fab-knowledge:originals/pip/files/haft-src/src/model.js` lines 63 to 88; `reference/keys/flex-pair/expected/` (goldens, section PNGs) |
| Supersedes | new; changes the M-S card numbers of M-S-T04 step 0, M-S-T06 and the three-slot export of M-S-T07. Old to new at defaults (all computed): CHK-KEY-01 measured 1.44 to 1.84 mm, legal 1.344 to 1.680 becomes 1.632 to 2.04 mm, gap 1.0 fix 1.36 becomes 1.64 mm; CHK-NET-29 path 290.46 becomes 295.12 kohm (warn, inferred rows); CHK-PRT-04 wall 9.2 becomes 8.39 mm (skip, D-198); CHK-NET-02 1.6 becomes 0.7525 mm; three filaments become four. The skeleton-era numbers stay valid only for the spec fixture (cone 3.2 snapped to 3.36 mm) in packages/checks tests. Correction 2026-10-06: the reference draws the column with 40 sides as PIP does (`model.js:65`), and its golden `reference/keys/flex-pair/expected/report.json` reads CHK-NET-02 0.7559 mm and CHK-NET-29 295.31 kohm (both computed); 0.7525 mm and 295.12 kohm above are the earlier 64-segment build |
| Milestone | M-S |

### D-224 Body carries its plan outline; checks read the Part IR only

| field | value |
|---|---|
| Status | decided |
| Decision | spec/part-ir.ts Body gains an optional `outline: readonly Ring[]`, the body's plan outline in the part frame (outer ring first, then holes): a prism body's outline, a stack body's bottom band; any other route leaves it absent. Stage 7 emit fills it. CHK-PRT-04 reads its pockets from Part.features and each host outline from Body.outline, and skips naming the body when a pocket host carries none. The skeleton registry hands run bodies spec CheckCtx exactly; the private `SkeletonCtx` with its `draft` field and the `draftOf` downcast are gone. Until the mesh (`packages/mesh/src/partir.ts` assemblePart) and core (`core/src/commands/build.ts` buildPart) emitters fill the field, the registry completes it from the draft at the kernel side of the boundary (`withPlanOutlines` in `packages/checks/src/skeleton/run.ts`), which never overwrites an emitted outline. SkeletonRunInput.draft stays as the input of that completion and of the circuit slice (skeletonNets); deriving nets from conductive bodies is M05 work under D-086. |
| Rationale | D-024 says checks read Part IR only, and the M-S card says a contract change forced by the skeleton is recorded as a decision. CHK-PRT-04 read body outlines from the PartDraft through a downcast of CheckCtx, a contract bypass M04 would have copied. Growing Body by one optional field keeps CheckCtx as specified and lets every plan-wall check read the same record (implementation audit of 2026-10-05, spec-arch lens). |
| Evidence | `packages/checks/src/skeleton/prt04.ts`; `packages/checks/test/skeleton.test.ts` (the run-context keys test and the Body.outline tests); `npx --no-install hbf check.run reference/keys/flex-pair --json` keeps CHK-PRT-04 skip "infill wall" at 8.394 mm (computed, D-198) |
| Supersedes | new |
| Milestone | M-S (exit A); the emitter fill lands with the next mesh change |

### D-225 An open interval end is null on the wire

| field | value |
|---|---|
| Status | decided |
| Decision | An open end of an interval is `null` in every result, report, hash input and CLI output: spec/checks.ts `LegalValues` interval types `lo` and `hi` as `number \| null`, null meaning unbounded on that side, spec/constraints.ts `Interval.legal` types each end as `number \| null` the same way (M01-T04, 2026-10-06; an empty interval stays `legal: null`), and spec/circuit.ts `PinReading.pullupOhm` is `Ohm \| null`, null meaning the pin floats with no pull. No producer emits Infinity or NaN, and spec/jcs.ts `canonicalize` throws CanonicalizeError on NaN, +Infinity, -Infinity and bigint (RFC 8785, ARCHITECTURE.md 3); core `hashOf` answers that as E_PARAM_MISSING at the value's JSON pointer, and core prints results with plain JSON.stringify, with no replacer. Every consumer treats a null end as unbounded: the interval evidence helper (`packages/checks/src/skeleton/common.ts`), the fix search (`steppedInterval` in `packages/checks/src/skeleton/run.ts`) and the one-line legal text (`core/src/text.ts`: "at least", "at most"). Producers today are CHK-NET-02 (`hi` null), CHK-3MF-04 (`hi` null) and the declared charge-release read of `solveKeys` (`pullupOhm` null). |
| Rationale | CHECKS.md 7.1 writes CHK-3MF-04 with `hi` null, and its open-question row "one-sided intervals" left the spelling to spec/checks.ts. The walking skeleton had instead hashed and printed open bounds as the string "Infinity" through a core-only canonicalizer and a JSON.stringify replacer, while spec/checks.ts typed `hi` as a plain number and the profile and 3mf canonicalizers refused non-finite numbers, so one value had three spellings and a report hash depended on which tier wrote it (m-s-report.md T08 note; implementation audit of 2026-10-05, spec-arch lens). null is the one form RFC 8785 and JSON.stringify agree on. |
| Evidence | `spec/checks.ts` LegalValues; `spec/circuit.ts` PinReading; `spec/test/jcs.test.ts` (Appendix B NaN and Infinity throw); `core/test/store.test.ts` (hashOf refuses NaN and Infinity at the pointer, report text carries no "Infinity", legalText of open ends); `packages/checks/test/skeleton.test.ts` (CHK-NET-02 `hi` null); `packages/circuit/test/skeleton.test.ts` (declared read `pullupOhm` null, points canonicalize); `reference/keys/flex-pair/expected/report.json` CHK-NET-02 `"hi":null` |
| Supersedes | new; answers the CHECKS.md open-question row "one-sided intervals". The flex-pair golden reportHash moves because CHK-NET-02 `legal.hi` changes from the string "Infinity" to null (together with the other golden changes of 2026-10-05, 5243d865c8912a7fae61091feecc2fe68a351f71c188df9f592a3f0caa1c66e0 becomes b34c72c7268fba9659e9c9200f5444bf41e5560285ed3a5914224441a30af773) |
| Milestone | M-S (exit A) |

### D-226 Build plate in the machine preset

| field | value |
|---|---|
| Status | decided |
| Decision | spec/profile.ts MachinePreset.slicer gains an optional `bedType`, an OrcaSlicer plate enum string ("Textured PEI Plate", "High Temp Plate", "Cool Plate", "Engineering Plate", "Textured Cool Plate", "Supertack Plate"). Both ffc5p presets (`ffc5p_20260819`, `ffc5p-n025_20260819`) carry "Textured PEI Plate" (PROFILE.md 8.1, tier owner). The TypeScript writer (`packages/3mf/src/writer/settings.ts` SCALAR_KEYS) and the Python writer (`tools/py/orca3mf.py` SCALAR_KEYS) emit it as `project_settings` `curr_bed_type`, the ninth scalar key outside the 127 template keys, written only when the preset sets it, so an export carries 127 + 9 = 136 keys (measured on both corpus inputs 2026-10-06). CHK-3MF-03 under `--export` accepts exactly the nine scalar keys and fails any other. The value follows the preset, not the gold: the template test compares the other eight scalar keys with the gold and leaves `curr_bed_type` out. Both validators note a writer file that lacks the key. |
| Rationale | Owner report 2026-10-05: app exports without the key opened on the cold plate in Flash Studio, and the owner prints on textured PEI. The gold save and the hsl save wrote High Temp Plate, so a gold-equal value would open on the wrong plate; 14 of 18 owner Creator 5 Pro saves that carry the key read Textured PEI Plate (High Temp 3, Cool 1; counted 2026-10-05). The writers shipped the key in M00 without a plan entry, while CHECKS.md and the M00-T07 card still named eight scalar keys (implementation audit of 2026-10-05, plan-drift lens; m00-report.md). |
| Evidence | `packages/profile/src/lookup.ts` FFC5P_BED_TYPE (the count); `packages/profile/data/machines.json` (both ffc5p presets); `packages/3mf/test/template.test.ts` (nine scalar keys, gold equality without curr_bed_type); `tools/py/test/test_agreement.py` test_bed_type_from_machine_preset; `tools/corpus/3mf/gold/hackbuild-coin-nfc.3mf` and `tools/corpus/3mf/owner/coin/hsl.3mf` `project_settings.config` (`curr_bed_type` "High Temp Plate"); `tools/test/plan-bed-type.test.mjs` (plan text equals the writer key list) |
| Supersedes | new; changes the eight scalar keys of M00-T07 step 2 and the CHK-3MF-03 note in CHECKS.md to nine |
| Milestone | M00 |

### D-227 Golden writers: parity for the JSON goldens, named tools for renders

| field | value |
|---|---|
| Status | decided |
| Decision | `npx --no-install hbf parity <reference> --accept` is the only updater of the four JSON goldens of a reference, `expected/build.json`, `report.json`, `edit.json` and `artifacts.json` (core/src/commands/parity.ts GOLDEN_FILES). A rendered file under `expected/` is not a parity golden and has one named writer: for keys flex-pair, `expected/section-key<n>.svg` and `expected/section-key<n>.png` and the generated README blocks (print card, checks) are rewritten only by `HBF_ACCEPT=1 npx vitest run reference/keys/flex-pair` (reference/keys/flex-pair/test/reference.test.ts); for orca-3mf-roundtrip, `expected/section.png` is written by `npx --no-install hbf view.render --mode section`. For the virtual exit B probe simulation (D-234), `tools/skeleton/flexpair_probe/sim/expected/electrical.json` and `summary.json` are written only by `node tools/skeleton/flexpair_probe/sim/run.mjs --write-expected`, which refuses `--analysis` so the figures come from the build alone; `tools/test/flexpair-probe-sim.test.mjs` compares a fresh run with them and never writes. Of a section, the SVG is the compared golden (the vitest fails when it differs from the build) and the PNG is its rendering by rsvg-convert for a person to read; no test compares PNG bytes. Each writer is run by a person, who reads the diff and the PNGs before they land (D-154). CI, package.json scripts and tools never set HBF_ACCEPT and never pass `--accept` (D-152). |
| Rationale | MILESTONES.md 1.3 and M-S-T08 step 1 called `hbf parity --accept` the only golden updater, while the flex-pair section SVG and PNG under `expected/` and the README print card were rewritten by the reference vitest under HBF_ACCEPT, and D-223 calls those section PNGs goldens: a second updater the plan did not name (implementation audit of 2026-10-06, plan-drift lens). Moving the writes into parity would pull Manifold section code and rsvg-convert into core/src/commands/parity.ts, which M-S-T08 limits to the four JSON files, so the plan names each writer instead. |
| Evidence | `core/src/commands/parity.ts` (GOLDEN_FILES, the four JSON names); `reference/keys/flex-pair/test/reference.test.ts` (HBF_ACCEPT, the section SVG write and compare, the rsvg-convert PNG, the README splice); `reference/exports/orca-3mf-roundtrip/README.md` (section.png from view.render); `.github/workflows/ci.yml` (no HBF_ACCEPT, no `--accept`); `tools/test/golden-writers.test.mjs` (code and plan text agree with this entry); `tools/skeleton/flexpair_probe/sim/run.mjs` (`--write-expected`, added to this entry 2026-10-08) |
| Supersedes | new; refines D-152 (the golden level names its writers). Rewords MILESTONES.md 1.3, the 2.5 parity row and 3.1 step 2, M-S-T08 step 1, M-S-T09 step 2, TESTING.md 5.3, PLAN.md section 17, REPOS.md 8 (the parity job row) and the GLOSSARY entry for expected/ |
| Milestone | M-S (exit A) |

### D-228 Query goldens are parity goldens, declared in queries.json

| field | value |
|---|---|
| Status | decided |
| Decision | A reference that answers constraints.query declares each query golden in `<reference>/queries.json` as `{"queries": [{"golden": "expected/query-<name>.json", "input": {<dim-form CommandInput>}}]}`. `npx --no-install hbf parity <reference>` reruns every declared input as a CommandResult (inputsHash the RFC 8785 hash of the declared input) and compares it with the golden; `--accept` writes it. Parity is the only writer of these files, as D-227 makes it for the four JSON goldens; GOLDEN_FILES stays those four, and the query goldens are named by queries.json, never by a list in code. Given ParityArgs.expectedDir (the API form; the CLI has no flag), the query goldens are read from that directory too. `npm test -w core -- message-numbers` reruns the same declarations and traces every number (M01-T05 step 4). |
| Rationale | M01-T05 named queries.json and said parity regenerates the query goldens, while D-227 and parity.ts named only the four JSON goldens, so the M01-T06 to T10 goldens had no writer the plan named. Found at M01-T06 build, 2026-10-06. |
| Evidence | `core/src/commands/parity.ts` (QUERY_DECL, queryGoldens); `core/test/trace-width-budget.test.ts` (parity equal on the committed goldens, differs on a tampered copy); `reference/electrical/trace-width-budget/queries.json` |
| Supersedes | new; refines D-227 (the query goldens join the parity writer) and D-152 |
| Milestone | M01 |

### D-229 Click-spring window bounds on the 0.01 grid

| field | value |
|---|---|
| Status | decided |
| Decision | `sim/click-spring-window` bounds dim `spring.Q` (unit `x t`, step 0.01) with the four criteria of D-071, each evaluated on the grid Q 1.00 to 2.60 with a strict limit: the strain ceiling is the last grid Q, searched up from the drop floor, whose strain at the stop is at most the click strain row for the declared bend direction. At PIP defaults (l 24, t 0.55, w 1.6, E 1900, sw 3, petg in-plane) that ceiling is 2.19 (eStop 2.495 percent, computed; Q 2.20 gives 2.504 percent, computed), the drop floor is 1.72 (drop 0.509, computed), and legal is 1.72 to 2.19 x t (computed). D-071's upper bound 2.2 is the 2.504 percent rounded to 2.50. A grid point inside the floor to ceiling run that fails a criterion splits the run: the def returns a split floor one step above it and a split ceiling one step below it, so the query is E_UNSAT. E is the declared fact when given, else the material's modulusMPa row. The criteria, the lower bound rule and the retirement of the 2.0 to 2.4 window stand as D-071 states them. | Inside the window only snap and drop are rechecked per grid point: the strain ceiling is searched up from the drop floor and the bistable ceiling stops before the first bistable point, so neither can fail inside the run (written back 2026-10-08, `packages/sim/src/constraints/click-spring-window.ts` header).
| Rationale | The M01-T07 golden: the strict criterion on the 0.01 grid gives 2.19 where D-071 wrote 2.2; CHECKS.md section 15 listed the difference for this log. Found at M01-T07 build, 2026-10-06. |
| Evidence | `packages/sim/src/constraints/click-spring-window.ts`; `packages/sim/test/constraints/click-spring-window.test.ts` (card golden and evidence at each bound); `packages/sim/test/click.parity.test.ts` (eStop 2.495 at 2.19 and 2.504 at 2.2); `reference/keys/click-spring-window/expected/query-pip.json` |
| Supersedes | D-071 (upper bound 2.2 becomes 2.19 on the 0.01 grid; the rest of D-071 carries over) |
| Milestone | M01 |

### D-230 Organic surfaces: imported mesh or an SDF level set route

| field | value |
|---|---|
| Status | owner |
| Decision | Default in force: no new route. An organic part such as BUCK's head enters as an `imported` part source (D-053), placeable and checkable with its provenance tier, and the `MeshRoute` union stays as D-053 lists it. The owner question: add an `sdf` member to the union, a field written in build.ts and grown by manifold-3d `Manifold.levelSet` (the 3.5.4 pin `geom` and `mesh` already carry), with its guarantees, parity and reference, or record the SDF level set as a backlog route in CANONS.md section 8.3. |
| Rationale | PLAN.md section 2 names organic and sculptural surfaces as the ceiling of the vocabulary and answers it with imported meshes and the M14 `brep` route (D-024). BUCK, the owner's bench of 2026-10-06, grows a parametric head and its cavity from a signed distance field in the browser with the pinned manifold-3d, caps the cavity at 45 deg for a rim-down print and checks the jaw and the slide-on fit on the result: level sets 1,610 ms on the first build and 58 ms with the shape cache, whole build 2,586 ms and 994 ms (measured 2026-10-06, Chrome headless on SwiftShader, this host only). That is the first evidence the ceiling can rise without BRep. A route is a kernel commitment, a new union member with declared guarantees, a parity target and a reference, so the owner decides; the imported default ports BUCK's head with no new kernel code and loses its parameters. |
| Evidence | `fab-knowledge:originals/buck/RECORD.md` sections 5.1 to 5.3 and 9; `fab-knowledge:originals/buck/files/src/sdf.js` lines 30 to 60; `fab-knowledge:originals/buck/files/src/engine.js` lines 137 and 183 to 231; `fab-knowledge:sources/downloads/skills-2026-10-06.md` section 4.3 and ranked item 3; `docs/plan/PLAN.md` line 226; `docs/plan/PACKAGES.md` lines 69 to 70 and 402 |
| Supersedes | new; D-053 and D-024 stand as written until the owner answers |
| Milestone | none until answered; an answer that adds the route names the `mesh` milestone that admits it with its reference |

## Findings from the M02 build

Appended 2026-10-07 from the M02 sim report, `.hbf-notes/m02-report.md`, and its verifier round 2 logs under `fab-knowledge:evidence/m02-verify/r2/`. Each entry reran the original code beside the port before it was written.

### D-231 Rapier pin for PAWL

| field | value |
|---|---|
| Status | owner |
| Decision | Default in force: keep `@dimforge/rapier3d-deterministic-compat` 0.21.0 for every sim scene, PAWL included (D-134). PAWL stays blocked: its scene declares the legacy pass set, reads "recorded, target not met", and no `core.mjs` constant is retuned. Both records stay committed, `packages/sim/records/pawl-legacy-0.14.0-<arch>.json` (15 of 17) and `packages/sim/records/pawl-0.21.0-<arch>.json` (9 of 17). The owner question: (a) retune PAWL's constants for 0.21.0 and declare a new pass set, (b) accept 9 of 17 as the 0.21.0 target and keep 15 of 17 as history, or (c) admit `@dimforge/rapier3d-compat` 0.14.0 as a second pin for PAWL only, which gives up the deterministic build for that scene. |
| Rationale | The original `final.mjs` and `core.mjs`, run unedited, walk 15 of 17 on `@dimforge/rapier3d-compat` 0.14.0 (byte-identical to the legacy record, 40.4 s, measured) and 9 of 17 on `@dimforge/rapier3d-deterministic-compat` 0.21.0 (byte-identical to `det1.txt`, 1096 s under contention, measured); pass counts computed, Apple M1, 2026-10-07. The TypeScript port reproduces the 0.21.0 output byte for byte on arm64 and on x64 under Rosetta 2 (sha256 b6383eec, computed) and its 2 s stand parity has a worst torso difference of 0 m over 960 steps (computed), so the six lost trials follow the Rapier version and the port adds no difference. 0.21.0 applies gravity once per solver iteration, four per step, and a 1 s drop ends at y -3.907539 m (computed, M02-T01). Retuning a legacy machine or carrying a second physics pin is a design choice only the owner can make; D-134 already chose determinism. |
| Evidence | `fab-knowledge:evidence/m02-verify/r2/pawl/v014/run.out` ("15/17 pass"); `fab-knowledge:evidence/m02-verify/r2/pawl/v021/run.out` ("9/17 pass"); `packages/sim/records/pawl-legacy-0.14.0-arm64.json`, `pawl-legacy-0.14.0-x64.json`, `pawl-0.21.0-arm64.json`, `pawl-0.21.0-x64.json`; `designs/pawl/legacy/records/det1.txt`; `packages/sim/test/pawl-suite.test.ts`; `docs/plan/milestones/M02-sim.md` M02-T03 card defects and Blockers |
| Supersedes | new; D-134 stands as written until the owner answers |
| Milestone | M02 (the PAWL exit row reads blocked until answered); M10 and M11 (`machines/pawl-leg` takes its `expected/sim.json` from the record the answer names) |

### D-232 SLUG 126 of 128 is unverified

| field | value |
|---|---|
| Status | decided |
| Decision | "126 of 128 vends across eight trials delivered exactly one capsule" is a declared bench claim (`BUILD.md` line 266) with status unverified. It is not a measured or computed result and no plan document states it as one. The runner that produced it was never found in the harvest or in Downloads (D-136, D-180). The rebuilt seeded runner of M02-T08 measures 91 of 128 over 8 seeded trials (seeds 1 to 8, computed) on the canonical `slug.html` physics, with end-state hash 50e70943 for seed 8 (computed). The SLUG scene keeps 126 as its declared set, so `hbf sim.run --scene slug` exits 1 and prints "unverified, measured 91 of 128", and the M02 SLUG exit row is met by that line. Where a plan document cites 126 of 128 it reads "declared, unverified (D-232)". A later claim of 126 of 128 needs the original runner or an owner statement of its capsule count, refill and vends per run. Note of 2026-10-14: D-275 replaces the measured value with 90 of 128, hash 32447a60 (computed); 91 of 128 was the arm64 V8 trig drift. |
| Rationale | The M02-T08 protocol (18 capsules, 2.0 s settle, 16 vends per trial) cannot reach 126 of 128 on the canonical page: the hood is a flat ledge that parks about 6 of 18 capsules, so the hopper stalls at vend 12 or 13 (computed), and the first vend always delivers, so "both misses on the first vend" does not occur at reset. `mandrel-spec.md` (2026-08-16 20:23) already cites the figure, and the cage drum rebuild reported 56 of 56 over 4 trials (declared, sheet-design.md), so 126 of 128 may predate the current page. The capsule solver is bit-identical to the legacy step over 2400 steps for seeds 1 and 7 (computed), so the gap is the protocol or the page revision, not the port. |
| Evidence | `packages/sim/records/slug-trials.json` (trials8, trials30 335 of 480); `packages/sim/scenes/slug.ts` lines 66 to 78; `packages/sim/test/slug-trials.test.ts`; `designs/slug/legacy/BUILD.md` line 266; `docs/plan/milestones/M02-sim.md` M02-T08 card defects; `.hbf-notes/m02-report.md` (SLUG trials, as printed by the CLI) |
| Supersedes | refines D-136 (the target status after the rebuild); corrects PLAN.md section 21 (M02 exit row), CANONS.md sections 2.1 and 8.1 (SLUG seed provenance) and, still to edit, MILESTONES.md 1.1 (M02 row), TESTING.md and RISKS.md, which state 126 of 128 as the target |
| Milestone | M02 |

### D-233 OGEE16 577 mm3 is retired

| field | value |
|---|---|
| Status | decided |
| Decision | The bench figure "577 mm3 per pin head" (OGEE16 R16, chat record) is retired; no plan document, check origin or golden uses it as a number of record. The figure of record for the proud-head regression is about 682 mm3 per bar crank (computed): the original `check_sweep.py` gives 681.7 mm3 (row cranks) and 681.9 to 682.0 mm3 (column cranks), and the M02 port's per-step sum over the same 25 copies gives 681.95 mm3 for each. Both are per-step sums at the oracle's 25 steps: they count overlapping copies more than once and grow with the step count (2659.83 mm3 at 97 steps, 10570.22 at 385, computed). The count-once (union) volume is 78.96 to 79.16 mm3 per bar crank over 25 to 385 steps (computed), and a check or origin that quotes a volume names the measure and the step count. The CHK-ASM-05 origin quotes 682 mm3 per bar crank, computed, per-step sum over 25 steps in `check_sweep.py`. |
| Rationale | M02-T07 rebuilt the proud-head fixture from `drive_pin()` in `printed.scad` and ran the unedited oracle and the port on it: the clash set matches (the eight bar cranks, each against its own servo), and neither the per-step sum nor the union gives 577. The harvest holds only the fixed geometry, so the geometry and measure behind 577 are unknown; a number that two independent runs of the original code do not reproduce cannot stand as a provenance figure. |
| Evidence | `fab-knowledge:evidence/m02-verify/r2/ogee/proud.out` (8 swept collisions, 681.7 to 682.0 mm3); `fab-knowledge:evidence/m02-verify/r2/ogee/own_swept.py` and `own_swept.out` (row crank 0 at 25, 97 and 385 steps: per-step sum 681.98, 2659.83, 10570.22 mm3; union 78.96, 79.12, 79.16 mm3); `packages/sim/records/ogee-sweep.json`; `packages/sim/test/goldens/ogee-sweep-oracle.json`; `designs/ogee16/legacy/source/check_sweep.py`; `docs/plan/milestones/M02-sim.md` M02-T07 card defects |
| Supersedes | new; corrects PLAN.md section 21 (M02 exit row), CHECKS.md section 8 (CHK-ASM-05 origin example), and, still to edit, MILESTONES.md 1.1 (M02 row), the M04 card (CHK-ASM-05 explain acceptance), PACKAGES.md 5.2 (sim failure table), `packages/checks/seed/checks.seed.json` (CHK-ASM-05 `what`) and `packages/sim/test/ogee-sweep.test.ts` (the record's bench figure field) |
| Milestone | M02 (record); M04 (CHK-ASM-05 origin numbers) |

## Findings from the virtual print

Appended 2026-10-07 from the virtual exit B of the keys flex-pair reference, `fab-knowledge:evidence/virtual-print/VIRTUAL-EXIT-B.md`. Nothing was printed; every figure below is computed unless it says measured.

### D-234 A virtual exit B stands in provisionally for the M-S print

| field | value |
|---|---|
| Status | decided |
| Decision | Owner instruction of 2026-10-07: the owner cannot print now and asked that printing be simulated so work continues. A virtual exit B stands in provisionally for M-S exit B. It writes the preset "two" 3MF in process through packages/3mf from the built Part IR at SOURCE_DATE_EPOCH 315532800 (the export gate is never opened or bypassed and nothing is written under `reference/*/*/out`), slices it headless with the Flash Studio CLI (Orca-Flashforge 2.3.2) through `tools/slice/slice.mjs` with a fresh `--datadir` under the evidence folder, reads the G-code back with `tools/py/gcode/analyze.py`, prices each key path from the Part IR, and runs the unchanged `flexpair_probe.ino` against a host simulation with failure injections (`tools/skeleton/flexpair_probe/sim/`). Every figure it yields is computed. The physical exit B (M-S-T10) stays open: it is required before any public claim about the printed key and before the M-S-T11 freeze of any contract part it touches. M04 proceeds on draft contracts now; the M04 card records that its M-S exit B dependency is provisional and that a contract change the print later forces is an expected edit, as M00 to M03 already treat one. |
| Rationale | D-179 makes M04 wait on exit B, and exit B waits on the owner's machine and time (D-082, RISKS.md R-18). The virtual run exercises the slicer, the G-code and the read firmware on the same bytes the print card names, and on its first run it found a design defect (D-236) before any filament was spent, the class of fault exit B exists to find. It cannot measure contact resistance, press force, bridge sag, TPU overhang quality or the cTPU to TPU bond, so it cannot freeze the contracts those touch. |
| Evidence | `fab-knowledge:evidence/virtual-print/VIRTUAL-EXIT-B.md`; `fab-knowledge:evidence/virtual-print/report-slice.md` and `before/report-slice.md`; `fab-knowledge:evidence/virtual-print/electrical.json`; `fab-knowledge:evidence/virtual-print/probe/summary.json`; `docs/plan/milestones/M-S-walking-skeleton.md` (Two exits, M-S-T10, M-S-T11); `docs/plan/milestones/M04-checks-project.md` (header) |
| Supersedes | refines D-179: "M04 waits on exit B" becomes "M04 proceeds on draft contracts with a provisional dependency on exit B"; the freeze of what the print touches still waits on the physical print |
| Milestone | M-S (T10, T11); M04 |

### D-235 The virtual print is a reusable test level

| field | value |
|---|---|
| Status | decided |
| Decision | Slicer G-code analysis joins the testing levels beside islands (TESTING.md 2.6). `tools/slice/slice.mjs` slices plate 1 of a 3MF headless with a fresh datadir, a time limit and the project completed from bundled presets (D-237); `tools/py/gcode/analyze.py` reads the G-code back as deposited roads and compares each layer with the 3MF section at mid height: model area printed by another tool, dropped features, unsupported deposit with its span and bridge role, deposited conductor regions that touch two nets, conductor continuity from each lead, the printed contact gap, tool changes and the slicer's own estimates. A design with a multi-material 3MF export can run it. Its results are computed and go in a separate "simulated" block of the reference README verified section, never under "measured on a printed body". M-S-T10 records the virtual results there; M-S-T11 may freeze provisionally only the contract parts that both exit A and the virtual print exercised and leaves every other part draft until the physical print. The run needs Flash Studio on the host, so it is a person's step or a nightly job on such a host; CI does not run it (no slicer on the runners, inferred). |
| Rationale | The flex-pair defect of D-236 arises in the slicer's region and infill assignment, where islands.py and the mesh checks never look: the exported 3MF passes the seed validator with `--overlap` and the checks, and only the G-code shows PETG in the key top. The harness and analyzer are general (3MF in, G-code and sections out) and already carry tests (`tools/test/slice.test.mjs`, `tools/py/test/test_gcode.py`). |
| Evidence | `tools/slice/slice.mjs`; `tools/py/gcode/analyze.py`; `tools/test/slice.test.mjs`; `tools/py/test/test_gcode.py`; `fab-knowledge:evidence/virtual-print/before/report-slice.md` (section (a), regions of a body printed by another tool) |
| Supersedes | corrects TESTING.md section 10, "Flash Studio has no CLI this plan knows of": Flash Studio 1.7.14 carries the Orca-Flashforge 2.3.2 CLI (`--slice`, `--datadir`, `--outputdir`; measured 2026-10-07) |
| Milestone | M-S (T10, T11); every later milestone whose reference exports a multi-material 3MF |

### D-236 The flex-pair pad top keeps PIP's bezel term

| field | value |
|---|---|
| Status | decided |
| Decision | `reference/keys/flex-pair/build.ts` computes the pad top from PIP's flex need with the bezel, `z0 + keyH - protrude - bezel`, snapped up to a layer top, and the key floor as `snapN(max(z0, T + bezel + protrude - keyH))`, with bezel PIP's `stack.bezel` 2.4 mm (source value), as pip-controller `src/layout.js` lines 27, 219, 223 and 231 and pip.md 4.3 and 5.1 step 1 write them. No bezel is printed, so the cap and key top stand above the pad top as they stand above PIP's printed body. At defaults (all computed): pad top 6.01 mm (was 8.41), face 5.057 mm above it (was 2.657), cone 4.08, colTop 4.65, cap underside 6.49 and contact gap 1.84 mm unchanged; every key, column, trace and cap mesh hash is unchanged and only the pad mesh moves. `test/reference.test.ts` holds each cap underside at or above the pad top. |
| Rationale | The virtual print of 2026-10-07 found PETG (slot 1, role Internal Bridge) printed across the interior of both TPU key tops in layer 30 (z 7.21 to 7.45), directly on the cTPU cap: 8.653 and 8.635 mm2 (computed). Probes on the completed 3MF tie it to the pad's first top shell layer over its sparse infill: top_shell_layers 4 moves it to layer 31, 6 moves it into the cap at layer 29, pad sparse infill 100 percent removes it, and swapping the pad and key extruders moves it to the pad's tool; part order, one part per slot, a 100 percent infill modifier around each key, internal_bridge_support_thickness 0, the extra bridge layer off, minimum_sparse_infill_area 0 and a 100 percent cap or key top did not change it (all computed from the G-code). Without the bezel term the key's solid layers lie inside the pad's top shells; PIP's construction never puts them there. After the change the analyzer reports 0 regions of a body printed by another tool. |
| Evidence | `fab-knowledge:evidence/virtual-print/before/report-slice.md` and `before/layers/key1-layer-30-z7.45.png`; `fab-knowledge:evidence/virtual-print/probes/bridge/` (variant 3MFs and role tables); `fab-knowledge:evidence/virtual-print/report-slice.md` (after); `fab-knowledge:originals/pip/files/pip-controller/src/layout.js` lines 27, 219, 223, 227 and 231; `knowledge/designs/pip.md` sections 4.3 and 5.1; `reference/keys/flex-pair/expected/` |
| Supersedes | refines D-223: its pad top 8.41 mm becomes 6.01 mm (computed); the key geometry, the checks and the travel stand. Parity buildHash 570cb410...b01e becomes 26a96948...0d75 and reportHash f08c5831 becomes 6cc03c40 (CHK-PRT-03 volume 14520.061 becomes 10561.734 mm3, computed); the print card file 64865 bytes, sha256 72fd08b9...75ae8 becomes 65344 bytes, sha256 823fddb9...d018 |
| Milestone | M-S |

### D-237 Headless slices complete the project from bundled presets; the writer stays names only

| field | value |
|---|---|
| Status | decided |
| Decision | packages/3mf keeps the dialect rule of `knowledge/kernels/3mf-dialect.md`: project_settings carries no printer- or process-scoped key, so the writer does not add `nozzle_diameter`, `printable_height` or `gcode_flavor`. A headless CLI slice goes through `tools/slice/slice.mjs`, which flattens the bundled machine, process and per-slot filament presets the project names and lays every embedded key over them, as the GUI fills a project from its presets; `--load-settings` stays unused because the CLI ranks it above the 3MF. A slot whose preset name is not bundled needs an explicit `--filament-map`, recorded in `slice-run.json` as an inferred stand-in. |
| Rationale | With a fresh datadir the CLI exits on SIGSEGV (139) on the writer's 3MF as exported (136 embedded keys); key bisection against an owner save found the three missing keys above, and the completed project slices with exit 0 (all measured 2026-10-07). The missing step is the preset fill the GUI does on load. Writing printer-scoped keys into the export would let a file override the owner's printer profile on open, the fault the dialect rule exists to prevent. The GUI open of the writer's 3MF stays the owner's step (M-S-T10 step 2). |
| Evidence | `tools/slice/slice.mjs` (header and `completeProject`); `fab-knowledge:evidence/virtual-print/probes/probe1`, `probe2` and `bis`; `fab-knowledge:evidence/virtual-print/slice/slice-run.json`; `knowledge/kernels/3mf-dialect.md` (rules on the key set) |
| Supersedes | new |
| Milestone | M-S; M00 3MF corpus (TESTING.md 10 round trip) |

### D-238 TPU slicer preset names for the flex-pair slots 3 and 4

| field | value |
|---|---|
| Status | owner |
| Decision | Default in force: the writer keeps naming `Generic TPU @FF C5P` for the tpu95 and ctpu slots with its PRESET_INFERRED warning (D-187), the print card and EXIT-B.md keep that name, and a headless slice maps it to the bundled `Generic TPU-95A @FF C5P` as an inferred stand-in through `--filament-map` (D-237). The owner question: name `Generic TPU-95A @FF C5P` for slot 3 in the profile seed that supplies slicer filament names, and choose the preset slot 4 (cTPU) names. Flash Studio 1.7.14 (Orca-Flashforge 2.3.2) bundles Generic TPU-95A, TPU-90A and TPU-64D @FF C5P and the Flashforge branded TPU presets, and no `Generic TPU @FF C5P` (measured 2026-10-07). |
| Rationale | pip.md 5.15 and D-187 already record that `Generic TPU @FF C5P` does not resolve and that saves replaced it with `Generic TPU @System`; the virtual print confirms the name is not bundled. Which TPU and cTPU presets the owner's spools want is the owner's call. |
| Evidence | `/Applications/Flash Studio.app/Contents/Resources/profiles/Flashforge/filament/` (listing, measured 2026-10-07); `fab-knowledge:evidence/virtual-print/slice/slice-run.json` (filament map); `packages/3mf/src/writer/template.ts` (TPU_FALLBACK_PRESET); `knowledge/designs/pip.md` 5.15 |
| Supersedes | new; D-187 stands |
| Milestone | M-S (print card, EXIT-B.md slot table); M00 profile seed of slicer filament names |

## Findings from the audit of 2026-10-08

Appended 2026-10-08 from the plan-drift lens of the implementation audit, `fab-knowledge:evidence/audit2/plan-drift/`. The log is append-only, so a wrong figure in an earlier entry is corrected here and the earlier entry stays as written.

### D-239 Corrections from the plan-drift audit of 2026-10-08 to D-232, D-233 and D-236

| field | value |
|---|---|
| Status | decided |
| Decision | Read D-236's Supersedes row with the reportHash of the golden: the flex-pair reportHash f08c5831 becomes d84f325c (computed, `reference/keys/flex-pair/expected/report.json`), not 6cc03c40. The buildHash 570cb410...b01e to 26a96948...0d75, the CHK-PRT-03 volume 14520.061 to 10561.734 mm3 and the print card bytes and sha256 in that row stand. The "still to edit" lists of D-232 and D-233 are closed for every plan document: MILESTONES.md 1.1 (M02 row), TESTING.md 2.3, RISKS.md (SLUG trial runner row), PACKAGES.md 5.2 (sim parity target and failure table) and the M04 card (CHK-ASM-05 explain acceptance and the OriginRecord example) now cite 126 of 128 as declared and unverified with the measured 91 of 128 (D-232), and 577 mm3 only as retired beside about 682 mm3 per bar crank (D-233). The seed `what` of CHK-ASM-05 was already edited at M04-T02 and reads "the bench 577 is retired by D-233". One item stays open: the `benchFigureMm3PerBarCrank` field of `packages/sim/test/ogee-sweep.test.ts` and the record `packages/sim/records/ogee-sweep.json`, which the packages owner renames or requalifies with the record regenerated. |
| Rationale | `git grep 6cc03c40` finds the hash only in D-236; the golden and a fresh `hbf check.run reference/keys/flex-pair` give d84f325c, and a reportHash census over the evidence folder finds f08c5831 and d84f325c and never 6cc03c40 (computed, 2026-10-08). Two milestones after D-232 and D-233, the living MILESTONES.md Part 1 still stated 577 mm3 and 126 of 128 as targets. `tools/test/plan-drift.test.mjs` now fails when the latest recorded reportHash differs from the golden, or when a plan paragraph cites 577 or 126 of 128 without its decision. |
| Evidence | `reference/keys/flex-pair/expected/report.json` (reportHash d84f325ceb94...); `fab-knowledge:evidence/audit2/plan-drift/`; `packages/checks/seed/checks.seed.json` (CHK-ASM-05); `tools/test/plan-drift.test.mjs` |
| Supersedes | corrects the D-236 Supersedes row (reportHash only) and closes the "still to edit" clauses of the D-232 and D-233 Supersedes rows except the ogee-sweep field named above; D-232, D-233 and D-236 stand |
| Milestone | M04 (plan text in MILESTONES.md, PACKAGES.md, TESTING.md, RISKS.md and the M04 card); no reference file or golden changes |

### D-240 The SVG document sanitiser moves to the first milestone that parses an SVG document

| field | value |
|---|---|
| Status | decided |
| Decision | The D-166 SVG document sanitiser (refuse a DOCTYPE; strip script, foreignObject, every on* attribute and every href that is not a `#` fragment) and its property fuzz land with the first milestone that parses an SVG document, which is M05 (M05-T14, the KEYWAY logo SVG input), and the M09 drop and picker read through the same sanitiser. M03 reads SVG path data strings only (`d` attributes the art layers carry), never a document, so it has nothing to sanitise; its raster intake keeps the D-166 side cap (8192 px per side, ARCHITECTURE.md 11.1) as built in `packages/inlay/src/intake/image.ts`. |
| Rationale | D-166 put "SVG and raster intake" at M03, and M00-T16 step 4 said the SVG and design-JSON readers join the fuzz "at M03 and M09". The M03 build parses no SVG document, so a sanitiser there would guard nothing and a fuzz of it would test code no path calls (audit of 2026-10-08, packages/inlay lens). |
| Evidence | `packages/inlay/src/intake/image.ts` (RASTER_MAX_SIDE, checkImage, checkSide); `packages/inlay/test/raster-limit.test.ts`; `packages/inlay/test/raster.fuzz.prop.test.ts`; `docs/plan/milestones/M05-circuit-copper.md` (M05-T14 inputs) |
| Supersedes | refines D-166 (milestone of the SVG document rule); corrects M00-T16 step 4 ("the SVG and design-JSON readers at M03 and M09" becomes M05 and M09 for SVG documents, M09 and M10 for design JSON) and the M03-T02 card note |
| Milestone | M05 (sanitiser and fuzz); M09 (drop and picker) |

### D-241 CHK-KEY-01 band is 35 to 50 percent of the cone, read from profile

| field | value |
|---|---|
| Status | decided |
| Decision | CHK-KEY-01 holds a flex key's contact gap at 35 to 50 percent of the built cone height and never under 1.2 mm, as PIP does: pip-controller `bench/part1.html` line 233 (the contact gap slider `flex.gapPct`, min 35, max 50) and line 238 ("the gap is held at 35 to 50 percent of the cone, never under 1.2 mm"). The band ends are profile constants `key.flexGapFracMin` 0.35 and `key.flexGapFracMax` 0.50 and the floor stays `key.flexGapFloor` 1.2 mm (all inferred); the check's `key01Interval` reads them and the typed `KEY01` table is gone. CHK-KEY-01 moves to 2.0.0 (CHECKS.md 1.3: a gap between 35 and 40 percent of the cone now passes). At the flex-pair defaults (cone 4.08 mm, computed) the legal interval becomes 1.428 to 2.04 mm and the fix for gap 1.0 becomes 1.44 mm, the 0.02 mm param step from 0.8 at or above 1.428 (computed; the audit note's 1.43 assumed a 0.01 step). The BOSS example (cone 3.20 mm) becomes 1.2 to 1.60 mm, the floor binding over 35 percent (1.12 mm). |
| Rationale | D-223 and CHECKS.md wrote 40 to 50 percent, a band no PIP source states; the bench slider and note in the canonical pip-controller bench hold 35 to 50 (audit of 2026-10-08, packages/checks finding 2). The fractions were typed in `packages/checks/src/skeleton/key01.ts`, a number outside profile. |
| Evidence | `fab-knowledge:originals/pip/files/pip-controller/bench/part1.html` lines 233 and 238; `packages/profile/data/constants.json` (key.flexGapFracMin, key.flexGapFracMax); `packages/checks/src/skeleton/key01.ts`; `packages/checks/test/skeleton.test.ts` |
| Supersedes | the CHK-KEY-01 numbers of D-223 (interval 1.632 to 2.04 mm and fix 1.64 mm at defaults become 1.428 to 2.04 mm and 1.44 mm); corrects CHECKS.md section 6 (CHK-KEY-01 row) and 2.6 A, CANONS.md section 5 and its flex rules, PLAN.md section 21 (the flex button row), AGENT-SURFACE.md 8.5 and 12 (the worked output), the M04, M05, M06 and M10 cards where they state the band, and the six reference report goldens (regenerated once) |
| Milestone | M04 (check and profile rows); M06 (the button canon reads the same rows) |

### D-242 One overhang rule for CHK-PRT-12, CHK-PRT-13 and CHK-SHP-03

| field | value |
|---|---|
| Status | decided |
| Decision | CHK-PRT-12, CHK-PRT-13 and CHK-SHP-03 share one overhang rule in `packages/checks/src/defs/prt/overhang.ts`, ported from PAWL `fdm.py` analyse() (lines 27 to 50, lineage `pawl.fdm/mk3`): the limit is profile constant `overhang.maxDeg` (45 deg from vertical, inferred); the bed contact band is per triangle, a triangle whose highest vertex sits under profile constant `overhang.bedBandMm` (0.35 mm, inferred, fdm.py line 43) above the part's lowest point sits on the plate; a face within 1e-4 deg of the limit is at it, not past it (fdm.py's `ang <= 45` in float32 counts modelled 45 deg faces by rounding: the PAWL foot flips 6 of its 8 such faces, computed). CHK-PRT-12 and CHK-PRT-13 took the shared rule at 2.0.0 (a verdict can flip) and 2.0.1 when their messages named the band's profile row. fdm.py's 6 percent "needs support" flag is a report line and enters no verdict. |
| Rationale | The three checks typed 45 and 0.35 in their own modules (core/test/message-numbers.test.ts TYPED_IN_CHECKS), and the per-face tie rule existed only in the M04-T12 card defects. |
| Evidence | `fab-knowledge:originals/pawl/files/src/fdm.py`; `packages/checks/src/defs/prt/overhang.ts`; `packages/profile/data/constants.json` (overhang.maxDeg, overhang.bedBandMm); `core/test/message-numbers.test.ts` |
| Supersedes | records the M04-T12 card defect as a decision; CHECKS.md section 6 (CHK-PRT-12 major 2) and section 9.2 (CHK-PRT-13 at 2.0.1) |
| Milestone | M04 |

### D-243 registryHash in the spec form; registry checks reach the export gate

| field | value |
|---|---|
| Status | decided |
| Decision | `BuildInputs.registryHash` is sha256 over the RFC 8785 JSON of the sorted (kind, id, version) triples of every registry entry a build used, kinds `featureKind`, `constraint`, `check` and `exporter`, sorted by kind, then id, then version (`core/src/checks.ts` registryHashOf, the one formula part.build, the import path and the scene audit share). Constraint defs enter as every def core collects at load (D-044); exporters enter where the path exports (part.build: the 3MF exporter by the hash of its filament template). `runAllChecks` runs, beside the skeleton set and the M00 Part IR checks, every registered check of the part, body and feature levels on the build, through runRegistry on the kernels of the page milestone with the body mesh and declared shape views; export.run gates on those results (D-109), and their versions enter registryHash and reportHash. Two views stay out until a person decides two findings recorded in the M04-T03 card defects: the union solid (CHK-KEY-06 reads stage 7 snap slivers on the flex-pair cone shells as vertices on faces) and the plan outlines (CHK-NET-04 fails the flex-pair leads that end on the pad edge for their clips). reportHash sorts findings by id, then target, then the canonical JSON of the hashed fields: CHK-PRT-16 returns one result per axis on one target, so id and target alone left the order, and the hash, to the order the results arrived in. |
| Rationale | spec/registry.ts, spec/commands.ts RepeatKey and ARCHITECTURE.md 8 name constraint defs among the registry entries, while the hash covered kinds, checks and exporters only (audit of 2026-10-08, arch-quality finding 2). export.run gated on the M-S skeleton and M00 checks, so a registry block check such as CHK-PRT-16 (build volume) never reached the gate (security finding 3). Both move every pinned build and report golden, so they land together and the goldens are regenerated once. |
| Evidence | `core/src/checks.ts` (registryHashOf, constraintVersions); `core/src/commands/build.ts` (registryDefs, runBuildRegistry); `core/src/commands/check-run.ts` (runAllChecks); `core/test/export-gate-registry.test.ts` |
| Supersedes | refines D-051 (the registryHash formula) and D-109 (what the export gate runs); at the flex-pair defaults the parity buildHash 26a96948...0d75 becomes 8bd01ef4...fac7 and reportHash d84f325c becomes 82c86bec (computed); moves every reference build, report and artifact golden, the CHK-ART-02 fixtures and the packages/project graph fixture, regenerated once |
| Milestone | M04 |

### D-244 KEYWAY gates enter as CHK-NET-31 to -38; cut-sheet references hold chase.surface.ts

| field | value |
|---|---|
| Status | decided |
| Decision | The eight KEYWAY gates no seeded or R54 row covered enter the checks seed as CHK-NET-31 to CHK-NET-38 (named netlist audit, art weeding, wedge copper, spacer windows, wiper landing, film keepout, spacers whole, one document size), status entered, pending M05, with KEYWAY origins and knowledge records; their run bodies and those of CHK-NET-01, -02, -08, -14, -15, -18, -19 and -21 for cut sheets live in `packages/checks/src/copper` and run over a vinyl board through `runVinyl`, and every one stays pending in the registry until a producer puts a vinyl board into Part IR. A cut-sheet reference names its chase `chase.surface.ts`: core has no build path for the surface chase kind (D-126), and part.build, parity, the metric record, the project graph, cold rebuild and the determinism hashes take every `reference/<area>/<id>/chase.ts` as a part.build reference; it becomes `chase.ts` when core builds a surface chase. Amended 2026-10-09 (M05 fix pass): core builds a surface chase for hbf parity (`core/src/commands/surface.ts`, build.ts in the sandbox, the board gated by `runVinyl`, goldens gates, layers and stack, or ladder for a ladder board), and the name stays `chase.surface.ts` because the part.build enumerators still list `chase.ts` only. The conductor dissipation candidate (CHECKS.md 9.9, RISKS.md R-26) takes CHK-NET-39 if entered. |
| Rationale | M05-T14 step 2 gives a gate with no row a row; the KEYWAY build is declarations evaluated by packages/copper, since build.ts may import only the spec and the author and a feature generator may not use wasm (D-178, spec/feature-kinds.ts), so no vinyl geometry reaches part.build. |
| Evidence | `packages/checks/seed/checks.seed.json`; `packages/checks/src/copper/run.ts`; `reference/copper/keyway/test/parity.test.ts`; `docs/plan/milestones/M05-circuit-copper.md` (M05-T14 card defects) |
| Supersedes | moves the registryHash of every build: at the flex-pair defaults the parity buildHash 8bd01ef4...fac7 becomes 6cd21aac...5989 and reportHash 82c86bec becomes d283814c (computed; CHK-NET-31 joins the report as a pending skip on the part); the six reference goldens, the CHK-ART-02 fixtures, the packages/project graph fixture and the flex-pair print card file (65345 bytes, sha256 64f25341...cd92 becomes 65343 bytes, sha256 6f6e9af8...bda7, only the build hash in `Metadata/hackbuild_chase.json` differing) regenerated once; CHECKS.md 9.9 and RISKS.md R-26 (the candidate's id) |
| Milestone | M05 |

### D-245 A contact declares its actuator and press axis; the button path checks run in circuit.solve

| field | value |
|---|---|
| Status | decided |
| Decision | `ContactFeature` gains optional `actuator` (the body a press moves) and `axis` (its direction, print pose); CHK-NET-27 moves that body by the contact's `gap` along `axis` as a rigid translation and tests touch against both terminal conductors with the net extraction touch rule, and CHK-NET-26 builds its actuated net graph from the same presses (packages/circuit `extract/actuated.ts`, FEELER apartExcept and makesContact). `ConductorFeature` gains optional `role: "element"` for CHK-NET-30 and `BoreFeature` optional `onStud` (stud diameter and height, collet fingers) for CHK-FIT-07. circuit.solve runs CHK-NET-13, -26, -27, -29 and -30 on a part with a contact, an apartExcept assertion or a charge-release hookup, and CHK-NET-29 on a declared drive scene; a part with none keeps its goldens. CHK-NET-29 reads the one charge-release reader's record (chargePort), with the skin in series for a touch port; the M-S skeleton runs the same body over its nets. The wait is a hookup fact, so its fix travels in the finding's constraint and extra, never as a Fix. |
| Rationale | M05-T19 step 3 moves "the actuating body along its declared axis", and ContactFeature declared neither; no SimHandle method moves one body, so the move is a translation of the built mesh (no physics step). Fix.param and drivenBy point into params, and the wait lives in Chase.hookup. |
| Evidence | `spec/features.ts`; `packages/circuit/src/extract/actuated.ts`; `packages/checks/src/net/net29.ts`; `core/src/commands/circuit-solve.ts`; `docs/plan/milestones/M05-circuit-copper.md` (M05-T19 card defects) |
| Supersedes | refines D-074 and D-078 (how the contact and charge-release checks run); at the flex-pair defaults the parity buildHash 111aab32...a998 becomes 2ccfa0b8...ac82 (defHash only; registryHash and every mesh unchanged) and reportHash d283814c becomes 158dc87a (computed; the CHK-NET-29 line moves); the flex-pair and pip-drive goldens, the packages/project graph fixture and the flex-pair print card file (65345 bytes, sha256 af9c438b...b95c becomes 65344 bytes, sha256 3c0bc6e8...1de7) regenerated once; eight more report goldens move only the CHK-FIT-07 skip reason, run lands M05 becoming no feature target in this build, reportHash unchanged |
| Milestone | M05 |

### D-246 Conductor parts carry per-object overrides; Part IR records body adjacency; CHK-3MF-08 reads a conductor record and resolves under the circuit kernel

| field | value |
|---|---|
| Status | decided |
| Decision | Stage 8 of the mesh stage runner records `Part.bodyAdjacency`: one row per pair of bodies with a coincident face, area half the surface their union loses, rows at or under one grid cell squared dropped, rounded to 1e-6 mm2, hashed in the part content hash; an imported part leaves it absent. The 3MF writer (`packages/3mf/src/overrides.ts`, and `tools/py/orca3mf.py` the same) writes `sparse_infill_density` `100%` as part metadata on each part whose body role is `conductor` or `flex-conductor`, and `interlocking_beam` `0` as object metadata on each object holding one or sharing a face with one, in `Metadata/model_settings.config`; the TPU-to-PETG beam row is recorded and not written. When such an object exists it also writes a conductor record (objects, conductor parts with declared width, touching parts with the shared area) into `Metadata/hackbuild_chase.json`, so a package with no conductor keeps its bytes. CHK-3MF-08 (entered by M05-T20, 1.0.0) reads that record in `packages/3mf/src/validate/chk-3mf-08.ts`, which the validator mirror runs, and in `tools/py/checks/chk_3mf_08.py`; with a build at hand (`ArtifactBytes.part`) the run body also holds the record against Part IR roles and adjacency. A package without the record skips. The loss quote reads profile constants `3mf.interlockingBeamWidth` 0.8 mm and `3mf.interlockingDepth` 2 cells (vendor). The check resolves for a chase that lists the circuit kernel (`core/src/kinds.ts`), including the flex-pair's draft-kind design, runs in check.run, parity, the export.run package gate and `tools/slice/slice.mjs`, and in `check.run --artifact`. |
| Rationale | M05-T20 step 3 takes the roundtrip Part IR from rebuilding the chase, which neither validator mirror can do (packages/3mf imports no workspace package, D-027; the Python validator has no core), so the package carries the roles the check needs. Registering the check with the kernel that makes conductor bodies keeps the registryHash of every reference without one. |
| Evidence | `packages/3mf/src/overrides.ts`; `packages/3mf/src/validate/chk-3mf-08.ts`; `packages/mesh/src/stages.ts`; `packages/checks/test/fixtures/CHK-3MF-08/`; `fab-knowledge:research/3dp-landscape.md` (lines 320 to 343, section 11 idea 8); `docs/plan/milestones/M05-circuit-copper.md` (M05-T20 card defects) |
| Supersedes | refines D-159 (per-object overrides come from body roles, not feature kinds) and CHECKS.md 9.11 (where the check reads body adjacency); moves the registryHash, so the buildHash, of every chase listing the circuit kernel (computed): flex-pair defaults 2ccfa0b8...ac82 to 724252f9...59e2 and reportHash 158dc87a becomes b1395d08 (report.json gains CHK-3MF-08 pass on flex-pair.3mf), pip-buried-route 1d1be8ad to 7c9397fb (reportHash bdf10a03 to bbaa0081), blocks-pullup-band 6a666777 to 2069fdae (3a2d5a34 to d8b0c034, CHK-3MF-08 pass), capricate-touch 8aeb1a98 to 01149ada (e4de4285 to a72a4999), trace-width-budget c759a57b to c6173c5b (cd422333 to 5dc367b1, CHK-3MF-08 pass) and pip-drive f16fdd18 to e7666f1d (1d76147d to 410164e7); every mesh hash and volume unchanged; the six reference goldens, the packages/project graph fixture, tools/corpus/3mf/inputs/flex-pair-two.json and the flex-pair print card file (65344 bytes, sha256 3c0bc6e8...1de7 becomes 65701 bytes, sha256 ea0dd4f7...dc63, which adds the overrides and the conductor record) regenerated once; the virtual print rerun on it gives G-code equal to M05-T18's but for its generated-at line, and two probe slices show the Flash Studio CLI applies both keys from model_settings.config (`fab-knowledge:evidence/virtual-print/m05-t20/`) |
| Milestone | M05 |

### D-247 The page milestone moves to M05; the KEYWAY family candidates enter as CHK-NET-40 to -45

| field | value |
|---|---|
| Status | decided |
| Decision | At the M05 exit `PAGE_MILESTONE` (packages/checks `page.ts`) moves from M04 to M05, so the check pages, `hbf explain` and the build registry that part.build, check.run, parity, the export.run gate and rules.audit run (D-243) read the kernels and target levels M05 registers: circuit, copper and the net level. A feature-level circuit check with a run body now runs on the build as well as in circuit.solve (D-245): CHK-NET-13 on every conductor and CHK-NET-27 on a contact that names its actuator; a check that still skips names its own reason instead of the kernel. CHK-NET-13's message cites TCB at CHI without the year (its origin keeps 2021-05) and CHK-NET-27 records the press axis in `extra` (axisX, axisY, axisZ), so every number either prints traces to a field (D-010). The six gate families of the KEYWAY family that ran under candidate names at M05-T15 enter the seed in one batch as CHK-NET-40 to -45 (plate, travel, zones, channels, isomorphic lattice, stock fit), status entered, sheet level, pending M05, with origins and knowledge records; CHK-NET-39 stays reserved for the conductor dissipation candidate. M07 moves the page milestone again at its exit. |
| Rationale | `page.ts` says each milestone that registers a kernel or target level moves the page milestone to its own id, and at M05's exit the pages still said circuit was not registered. M05-T17 step 8 enters the six rows; they are sheet level, which the build registry does not run, so no registryHash moves. |
| Evidence | `packages/checks/src/page.ts`; `packages/checks/test/origin.test.ts`; `core/test/message-numbers.test.ts`; `packages/checks/seed/checks.seed.json`; `docs/plan/milestones/M05-circuit-copper.md` (M05-T17 card defects) |
| Supersedes | refines D-243 (the kernels the build registry runs on) and D-245 (where CHK-NET-13 and -27 run); every buildHash and registryHash unchanged but trace-width-budget's, whose build.ts comment moves defHash: c6173c5b to 9b0aa139, with its writer 3MF; at the flex-pair defaults reportHash b1395d08 becomes d38a5269 (computed; five CHK-NET-13 pass and one CHK-NET-27 pass join, no new warn or fail), pip-buried-route reportHash bbaa0081 to 2a8523c4 (76 CHK-NET-13 pass); eight other report goldens move only skip reasons, reportHash unchanged; the six vinyl gates.json goldens change by check id only; the flex-pair README checks block, the packages/project graph fixture, the check pages and counts regenerated once; the flex-pair 3MF and print card file are unchanged |
| Milestone | M05 |

### D-248 A conductor reads its own material; a trace that is its own only body gets a skin host

| field | value |
|---|---|
| Status | owner |
| Decision | Default in force: a conductor feature's material is the material it declares (`ConductorFeature.material`, spec/features.ts, "profile material id; must carry resistivity rows"), and core's `featureMaterial` (core/src/commands/param-bindings.ts), which constraints.query uses for a feature and for each param binding, returns a feature's declared material before its body's, and its body's before the part's first body's. A conductor stays a region partitioned out of a host body at stage 5 (D-058); a printed trace that would be its own only body gets a non-conductive host instead of claiming its body, laid as the PIP buried stack lays trace layer 1: a PETG skin of `stack.skin` (0.72 mm, inferred, pip-controller layout.js line 168) under the trace, with the conductor the top `tMm` of that host. reference/electrical/trace-width-budget applies it: a PETG slot 2 skin, one conductor `trace` in slot 1 (cpla-protopasta) bound to `/w`, so the param form answers `/w` legal 3.23 to 6.00 mm (computed) with `unbound` empty (M01-T06 acceptance line 2, M05-T17 step 7). The alternative the owner may pick instead: a conductor whose region covers its whole host claims that body (the host takes the conductor's role and material), which keeps the trace a single body and moves stage 5 partition semantics. |
| Rationale | M05-T17 step 7 was blocked: a conductor over the trace's own only body left one of the two empty after partition (E_KERNEL "a body with volume after partition"), and `featureMaterial` read the host body's material, never the conductor's, so a conductor in a non-conductive host (the PIP buried route declares its traces in a PETG body) would be priced on the host material, which carries no resistivity row. The card names two ways out; the host route keeps D-058 and the one partition rule, and the skin thickness is the one profile row that already says what a printed trace sits on. Which of the two the owner wants is the owner's call, since it decides how a single-material printed trace is declared from M06 on. |
| Evidence | `core/src/commands/param-bindings.ts` (featureMaterial); `core/test/feature-material.test.ts`; `core/test/trace-width-budget.test.ts` (the param form test); `reference/electrical/trace-width-budget/build.ts`; `packages/profile/data/constants.json` (stack.skin); `docs/plan/milestones/M05-circuit-copper.md` (M05-T17 step 7 and card defects) |
| Supersedes | new; refines D-058 (where a conductor's material is read) and D-072 (the trace-width-budget reference now carries the conductor); trace-width-budget buildHash 9b0aa139 becomes fd8d4263 (computed) with its goldens accepted once and the packages/project graph fixture regenerated; no other reference moves |
| Milestone | M05 (M05-T17 step 7); M06 and M08 (how a printed trace is declared) |

### D-249 Correction: SPINDLE R1 as shipped shorts 5V to GND on B.Cu

| field | value |
|---|---|
| Status | decided |
| Decision | Correction recorded: the shipped SPINDLE R1 board shorts 5V to GND. The 5V bottom trace from (2.40, 20.00) to (43.60, 20.00), width 0.80 (pcb.py lines 184 to 185), runs through the four GND vias at (9.80, 20.00), (16.00, 20.00), (30.60, 20.00) and (36.20, 20.00), 0.8 mm pads (lines 197 to 200): their rings and the trace are one B.Cu piece of 34.15 mm2 (computed, the M08-T07 reparse on the port and on the shipped gerbers, whose layers equal the port's to 0.000001 mm2). The legacy DRC printed `DRC OK` because its GND island test unioned the uncleared pour and no rule read bottom copper between nets, and the M08 Records row "22 of 22 GND holes bonded" counted the shorted piece as pour; the port gives non-GND holes isolated 33 of 35 and GND holes bonded 18 of 22 (computed). CHK-BRD-01 (reparse) and CHK-BRD-21 (islands and shorts, entered M08-T12 with this origin) fail on it. Default in force until the owner answers: reference/boards/spindle-r1 keeps the shipped design and fails both checks; its gerbers export already stops at E_PROVENANCE on the inferred hand pads (M08-T03), so nothing reaches a fab. The fix is the owner's: move the four GND vias off y 20.00, or route 5V around them; either moves the fab zip and every SPINDLE golden. Answered 2026-10-14 by D-276 under owner delegation: R1 stays the shipped board with the short as a CHK-BRD-21 expect set, and reference/boards/spindle-r2 drops the four vias. |
| Rationale | A board the plan named as orderable carries a dead short between its supply and ground; the record must say so before anyone orders it, and the choice of fix changes the layout, which is a design decision this repo does not make for the owner. |
| Evidence | `fab-work-directory:benches/spindle/outputs/spindle/pcb.py` lines 184 to 200; `fab-work-directory:benches/spindle/outputs/spindle/spindle-r1-gerbers.zip`; `reference/boards/spindle-r1/expected/reparse.json`; `reference/boards/spindle-r1/expected/report.json`; `packages/checks/test/brd-islands.test.ts`; `docs/plan/milestones/M08-board-catalog.md` (M08-T07 and M08-T12 card defects) |
| Supersedes | corrects the M08 Records rows "pour isolation" (22 of 22 GND holes on a pour piece) and the Exit row "35 of 35 non-GND holes isolated; 22 of 22 GND holes bonded"; PLAN.md Appendix A C-21 |
| Milestone | M08 (M08-T07, M08-T12, M08-T15); the fix is a SPINDLE revision |

### D-250 Node 24 for the tscircuit backend

| field | value |
|---|---|
| Status | owner |
| Decision | Default in force: Node 24.11 becomes the development floor. `.nvmrc` and CI move to 24.11, D-039's engines range `^22.18.0 \|\| >=24.11.0` stays as it is, engine-strict stays on (D-038), and the four recorded tscircuit packages (tscircuit 0.0.2806, @tscircuit/core 0.0.2121, circuit-json-to-gerber 0.0.112, circuit-to-svg 0.0.447) install at their exact pins so M08-T10 and M08-T11 can run. Until the owner answers, the builder installs nothing: the four stay under `hbf.pinsBlocked` in packages/board, and M08-T10 and M08-T11 are reported not run. Options: (a) Node 24.11 as the dev floor (the default); (b) Node 24 only for the board tscircuit backend, a separate install or process the Node 22 workspace calls, the rest of the toolchain on 22.18; (c) an older tscircuit set whose tree installs on 22.18 with every `*` peer pinned by hand (the newest that installed was tscircuit 0.0.2713, whose @tscircuit/core 0.0.2042 failed to import against the day's peers, measured). Separate from the engines question and open under every option: @tscircuit/props peers zod `*` and runs on zod 3, against the zod 4.6.5 root pin (D-040), so the tscircuit runtime needs zod 3 where props resolves it. |
| Rationale | circuit-to-svg from 0.0.437 (2026-10-02, vendor) and jscad-electronics 0.0.210 declare `engines.node` 24.x, and `.npmrc` engine-strict refuses them on install and on `npm ci` under the 22.18.0 floor (measured, M08-T01). D-039 already admits 24.11, so moving the floor changes no engines range; the cost is every developer machine and CI image moving to 24, which is the owner's call. |
| Evidence | `docs/plan/milestones/M08-board-catalog.md` (M08-T01 card defects); `packages/board/package.json` (`hbf.pinsBlocked`); `docs/plan/PLAN.md` section 16; `.npmrc`; `.nvmrc` |
| Supersedes | refines D-039 (which Node line development runs on) and D-040 and D-181 (the tscircuit pins wait on it) |
| Milestone | M08 (M08-T10, M08-T11, the M08 exit pins) |

### D-251 M06 and M08 integration: goldens re-accepted once, draft kinds and board builds in the project graph, one writer for the button firmware stubs

| field | value |
|---|---|
| Status | decided |
| Decision | The integration pass after the M06 and M08 lanes re-accepts the reference goldens once with `hbf parity --accept` (D-227). The check version bumps of M06 (CHK-PRT-03 2.0.0, CHK-PRT-04 2.0.0, CHK-KEY-01 2.1.0, CHK-KEY-02 2.0.0, CHK-KEY-04 2.0.1, CHK-SHT-04 2.0.1) and CHK-SHT-11 joining the build registry move registryHash and report.json of every reference; mesh hashes and volumes stay unchanged except at electrical/pip-buried-route, whose route.data.ts was regenerated from the M06 emit that computes PIP's regions off the 1/1024 mm grid (packages/copper test/trace-layer-volume.test.ts holds it to the original's 869.687808 mm3 within 1e-3 mm3). That reference moves 37 of 77 mesh hashes, every one a trace layer or the body the traces cut, and the same build on the previous route.data.ts reproduces every previous mesh hash and volume. Its goldens are not re-accepted: a mesh or volume move waits for a person (D-152), the staged goldens stay at build 078773..bd, the proposed set is kept in fab-knowledge evidence/m06-m08-integration/pip-buried-route-proposed-goldens/, and until a person accepts it hbf parity on that reference, its reference test and core project-graph.test.ts fail on it alone. The project graph links a draft feature kind (skeleton-kinds.ts of a DRAFT_KIND_DIRS design) as `featureKind:<target>/<kind>`, an item of the design that registers it, so flex-pair's draft pad (0.1.0-draft.0) and packages/circuit's pad (1.0.0) are two sources and neither makes the other's readers stale; a board build writes its build line (chase, build.ts and params; it reads no profile row and meshes no body), so its report is checked against a build the graph holds. `expected/firmware.ino` of the three PIP button references has one named writer, `node packages/archetypes/scripts/firmware-stubs.mjs --write`, and the reference tests only compare. |
| Rationale | The lanes left their golden moves for the integration re-accept (M06 card, 2026-10-10 build notes). A mesh that moves is a regression unless it is the fix an independent source holds; here the original's cPLA volume is that source, but the acceptance of a moved mesh is still a person's. The graph keyed feature kind versions by kind id across every design, so two registries with one id gave one current version and the fresh recording was never clean; the board path stored builds without graph lines. The button reference tests wrote firmware.ino under HBF_ACCEPT, a writer D-227 does not name. |
| Evidence | `reference/electrical/pip-buried-route/README.md` (verified block, 2026-10-11); `packages/copper/test/trace-layer-volume.test.ts`; `packages/project/src/links.ts`; `core/src/commands/project-graph.ts`; `core/src/commands/board.ts`; `packages/project/test/stale.test.ts`; `packages/archetypes/scripts/firmware-stubs.mjs`; `docs/plan/milestones/M06-canons.md` (M06-T09 build notes) Note of 2026-10-11 (third audit, computed): until a person accepts pip-buried-route five rows fail on it, where the Decision above names three: `hbf parity` on the reference, its `test/reference.test.ts`, core `project-graph.test.ts`, core `message-numbers.test.ts` (the committed report.json gives CHK-KEY-06 the mesh uri hbf://mesh/b449b452..., a fresh run 7ab46570...) and `tools/test/determinism-queries.test.mjs` (query-solve.json query id 993c7ed4 committed, cae4e063 fresh); `fab-knowledge:evidence/audit3/repo-health/ws/core.log`, `.../node-test.log`. The staged goldens also predate the integration's registry moves: staged expected/build.json inputs carry registryHash f6d68717 and defHash 8c1867e3, the proposed set registryHash d6007192 and defHash e6353d78 (route.data.ts), so the proposed set mixes the registry move and the mesh move. If the off-grid route is rejected, restore route.data.ts from the previous emit, check that every mesh hash equals build 078773..bd, and accept the registry-only move with `hbf parity --accept` after reading its diff (D-152). The packages/project graph fixture (test/fixtures/graph.jsonl line 62) held the proposed golden for pip-buried-route (item hash 3bec52f8, hashAtLink 1adfb9..b0), left over from the reverted re-accept; the audit3 fixer round rerecorded it with HBF_ACCEPT_GRAPH=1 after reading the diff (line 62 to the staged 3ddbc625, hashAtLink 07877381, plus the GIB lines of its own re-accept, nothing else), so five packages/project stale.test.ts cases now fail on pip-buried-route alone until its accept, after which the fixture is rerecorded once more. Note of 2026-10-14: D-274 accepts the proposed set (buildHash 1adfb9..b0), the fixture is rerecorded (item 3bec52f8), and the five rows pass. |
| Supersedes | refines D-227 (names the firmware stub writer) and M04-T09 (the item id of a draft kind); at the flex-pair defaults reportHash d38a5269 becomes 4704229c (computed; CHK-SHT-11 joins as a skip, 71 results: pass 25, warn 2, skip 44), every mesh hash and volume unchanged, writer 3MF 65703 bytes, sha256 4419e5df...0eeb; pip-buried-route proposed, not accepted: buildHash 078773..bd to 1adfb9..b0 and reportHash 98001903 to 6160def1 (computed); the packages/project graph fixture regenerated once (178 to 560 lines, every reference build and report and the board builds) |
| Milestone | M06, M08 (integration) |

## Findings from the audit of 2026-10-11

Recorded by the third implementation audit (honesty-drift lens) over M05 to M08 and the M06 and M08 integration.

### D-252 Canon exit splits are read from counts.json under the originals rule

| field | value |
|---|---|
| Status | decided |
| Decision | The M06 exit status splits of the mechanism and archetype registries are the generated `canon.mechanisms` and `canon.archetypes` blocks of `docs/plan/counts.json` (D-010); MILESTONES.md, CANONS.md and the M06 card cite them and type no split of their own. An entry is typed or proven only when its port regenerates its original's numbers and bodies from the file and function its MECHANISMS.md row names (D-222); a split computed from source availability before a port exists is a forecast and binds nothing. The M06 Exit rows `npm test -w packages/mechanisms -- derive` and `npm test -w packages/archetypes -- status` pass when the printed split equals counts.json and every entry not typed or proven carries a statusReason naming its promotion card. At the 2026-10-11 integration counts.json reads mechanisms typed 19, candidate 88 over 107 registered (of the 24 seeded: typed 19, candidate 5) and archetypes proven 11, candidate 97, unproven 1 over 109 registered (computed by `node tools/counts.mjs`). |
| Rationale | D-203 set typed 23, stub 1 and proven 26 in 27 reference folders from the CANONS.md tables before any port ran. The M06-T03 and M06-T07 builds found that most of those entries do not regenerate their originals' bodies (KNURL raster traces, trimesh icospheres, hull rails, routes off the original's grid), so the originals rule keeps them candidate. The M06 report and card notes already followed counts.json; this entry records the change so the living rows stop promising the retired numbers. |
| Evidence | `docs/plan/counts.json` (canon); `docs/plan/milestones/M06-canons.md` (M06-T03 and M06-T07 build notes); `.hbf-notes/m06-report.md` ("Proven and candidate, with reasons"); `tools/test/plan-drift-audit3.test.mjs` |
| Supersedes | refines D-203 (the expected M06 splits), and through it D-097 (stub and typed split) and D-098 (archetype statuses); the MILESTONES.md 1.1 M06 row, CANONS.md section 2.1 and 8 split notes and the two M06 Exit split rows now point here |
| Milestone | M06 (Exit); M10 and M11 promote entries under it |

### D-253 Wiring parity target is TANG R5

| field | value |
|---|---|
| Status | decided |
| Decision | The M08 wiring parity target is TANG R5 wiring: the pin, net and label pairs a Teensy 4.0 catalog row gives through `packages/wiring` equal the TANG R5 net list, 15 pairs, in `reference/boards/wiring-tang-r5`. The owner picked it during the M08-T13 second pass (card build notes, 2026-10-09). PIP wiring SVG and SPARGER W stay possible later references; no M08 exit row reads them. |
| Rationale | MILESTONES.md 1.1 and 1.4 left the target to the owner with no decision id, while the card's build notes record the owner's pick and the reference was built and passes. The pick needs an id so the index stops calling it open. |
| Evidence | `docs/plan/milestones/M08-board-catalog.md` (M08-T13 build notes, 2026-10-09, second pass, owner picked TANG R5; Exit row "wiring parity"); `reference/boards/wiring-tang-r5/`; `.hbf-notes/m08-report.md` (Exit table) |
| Supersedes | closes the MILESTONES.md 1.4 row "wiring parity target (M08)" |
| Milestone | M08 (M08-T13) |

### D-254 SHUNT floating nets expect set

| field | value |
|---|---|
| Status | decided |
| Decision | Default in force: reference/boards/shunt-art keeps the floating nets set its original declares by hand (gen_board.py lines 705 to 709: GND?, MAGIC, MATRIX, PROBE, VIBES), and the chase `expect` on CHK-BRD-09 fails, because the check measures ENC, MAGIC, PROBE, RF_OUT, VBUS (computed, M08-T12). The owner question: enter a check for a net no source drives (SHUNT's meaning of floating, which no registered check measures) whose measured set the declaration matches, or rewrite the declared set to CHK-BRD-09's meaning (a net with fewer than two members) so the expect passes. Answered 2026-10-14 by D-277 under owner delegation: the expect set is CHK-BRD-09's measured set, and no undriven-net check is entered. |
| Rationale | The legacy list matches no rule on the record, so neither reading can be derived from the original; which one the reference carries changes the SHUNT goldens and the meaning of a declared floating net. |
| Evidence | `docs/plan/milestones/M08-board-catalog.md` (M08-T12 notes, Blockers); `.hbf-notes/m08-report.md` (Exit row "SHUNT expect sets", Records "SHUNT gen_board.py") |
| Supersedes | new; gives the M08 card question an id |
| Milestone | M08 (M08-T09 step 3, M08-T12) |

### D-255 A face frame is orthonormal and refused, never normalised

| field | value |
|---|---|
| Status | decided |
| Decision | spec FaceFrame normal and u are unit vectors and u is perpendicular to normal, each within 1e-9 (packages/geom FACE_FRAME_TOL); v is normal x u. packages/geom/src/face-frame.ts is the one home of face placement: `faceBasis` refuses any other frame with E_SCHEMA at the face's path and never scales or normalises it, `placeOnFace` maps a face point to the part, `horizontalFrame` adds the horizontal-face rule (E_KERNEL, or a caller's code, for a tilted face). Every generator and check that places on a face reads it (conductor, pocket, CHK-NET-13, the skeleton plan, CHK-KEY-05, the PIP frameOf, path1d), core takes `cross` from it, and tools/tiers.json forbids the inline normal x u pattern outside packages/geom/src. |
| Rationale | FaceFrame carried no length rule, so a u of [2, 0, 0] doubled every copper and pocket point while CHK-NET-13 normalised the same frame and measured a different part (reproduced, audit3); one reader with one refusal keeps the generator and the check on one frame. |
| Evidence | `packages/geom/src/face-frame.ts`; `spec/ids.ts` (FaceFrame); `packages/circuit/test/conductor-frame.test.ts`; `packages/mesh/test/pocket-frame.test.ts`; `tools/tiers.json` (forbid rows) |
| Supersedes | refines D-165 (face frames and FaceRef) |
| Milestone | M05, M06 (audit3 fix) |

## Findings from the M09 build

Recorded by the M09 close of 2026-10-12 from the builder, verifier, gold and fixer reports (`.hbf-notes/m09-report.md`).

### D-256 hackbuild-ui 0.3.0 enters as a vendored tarball named by its staged tree id

| field | value |
|---|---|
| Status | decided |
| Decision | packages/ui depends on `file:../../tools/vendor/hackbuild-ui-0.3.0-b3962ab.tgz`, an `npm pack` of hackbuild-ui commit b3962ab on main, the merged 0.3.0 branch (repacked 2026-10-13; the CSS sha256 is unchanged, measured). Before the merge the name carried `pr.<shortsha>`, the staged git tree id of the unmerged branch (D-006). `tools/vendor/SHA256SUMS` pins the tarball and `tools/test/vendor.test.mjs` holds its sha256, the package spec, the lock `resolved` and the sha512 integrity. Pins added at M09: vue 3.5.43 (installed as the hackbuild-ui peer) and pinia 4.0.3 in packages/ui; @vitejs/plugin-vue 6.0.10 and happy-dom 21.0.1 as root devDependencies; @vue/devtools-api as pinia's peer. tools/licences.json gains 18 rows: the vue runtime and hackbuild-ui are bundled, the compiler, SSR and typing packages dev-only (inferred). These pins enter the D-040 re-date at M09-T15. When the branch is repacked (D-257), the tarball, SHA256SUMS, the packages/ui spec and the lock regenerate together. |
| Rationale | An unpublished upstream branch has no registry version and no commit sha; a tree id is reproducible from the staged content and survives the owner's first commit. |
| Evidence | `tools/vendor/SHA256SUMS`; `tools/test/vendor.test.mjs` (2 of 2, a corrupted sum fails 1, measured 2026-10-11); `packages/ui/package.json`; `tools/licences.json`; `fab-knowledge:evidence/m09/hackbuild-ui-pr.md` |
| Supersedes | refines D-116 (how fab installs the unpublished 0.3.0) and D-040 (pins added) |
| Milestone | M09 (M09-T02, M09-T07, M09-T15) |

### D-257 The 0.3.0 branch is rebased onto local a88fcc8 before it publishes

| field | value |
|---|---|
| Status | decided, owner, 2026-10-13 |
| Decision | Owner, 2026-10-13: push a88fcc8 to main, rebase the branch onto it, push it and merge the 0.3.0 PR; no npm publish (D-116). The rebase changes the tree id, so the D-256 tarball set regenerates in a separate step. The record before the answer: the branch `bench-layer-0.3.0` in `hackbuild-ui-bench` stays cut from origin/main 96d1bec, adds the floppy-disk icon itself, and nothing is pushed. The owner question: push local a88fcc8 to GitHub and rebase the branch onto it before 0.3.0 publishes. a88fcc8 is what npm 0.2.0 was built from; a branch from 96d1bec alone drops the 48 icons 0.2.0 shipped (computed by M09-T02). The rebase changes the tree id, so the D-256 tarball set regenerates. The hackbuild-ui README still names `@hackbuild/ui` (lines 14 and 25 and others) and is left for D-117; src/index.ts and docs/tokens.md name `@virgilvox/hackbuild-ui`. |
| Rationale | The M09 card said local a88fcc8 never enters the PR, and the build found that it carries the published 0.2.0 icon set; publishing 0.3.0 from 96d1bec would remove icons that installs use today. Pushing owner work is the owner's. |
| Evidence | `fab-knowledge:evidence/m09/hackbuild-ui-pr.md`; `hackbuild-ui` (local a88fcc8, ahead 1); `docs/plan/milestones/M09-ui.md` (Legacy sources, hackbuild-ui row) |
| Supersedes | refines D-116 and the M09 card row "local a88fcc8 is unpushed owner work and never enters the PR" |
| Milestone | M09 (M09-T02); the owner merge and publish |

### D-258 Bench layer details in hackbuild-ui 0.3.0 and the fab overrides

| field | value |
|---|---|
| Status | decided |
| Decision | HbHeader gains `taglineKind` `brand` or `tool`, default `brand`; `.hb-tagline.is-tool` sets Special Elite, so 0.2.0 headers keep the brand line in Libre Baskerville and D-121 applies by opt-in. The HbParamRow reset mark sits at the end of the 96 px label column and is hidden until the value differs from its default. A seg or switch inside `.hb-prow` is a toggle and fills ink when on; pink stays for the one primary selection of a step. Bench layer spacing reads the 4 px scale tokens; measured values off the scale take the nearest step, listed in GUIDELINES 9. Until upstream carries them, packages/ui/src/bench/bench.css overrides: welcome step numbers and `.hb-readout` fit values in ink, the building pill `is-warn` (never `is-live`), 44 px minimum sizes for steps, row numbers, small buttons and chips under 640 px or a coarse pointer, and every bench px figure in one `:root` block of `--hbf-*` tokens, each a candidate upstream token. Shell components mark their pink budget elements through packages/ui/src/bench/pink-marks.ts; slot swatches are marked `data-hb-pink=data` (a material preview colour); the smoke pink counter reads the mark on the element only. HbGuide and HbWelcome carry no `data-hb` hooks and HbParamRow has no help, aria-describedby or legal band slot; the shell patches each locally and each is an upstream candidate. |
| Rationale | A fifth reset column did not fit a 336 px rail at PIP's row metrics (measured, M09-T02); ink toggles keep the one focal pink per view countable (RULES design law); RULES forbid raw px in components (verifier F-06). |
| Evidence | `hackbuild-ui-bench/GUIDELINES.md` (section 9); `packages/ui/src/bench/bench.css`; `packages/ui/src/bench/pink-marks.ts`; `fab-knowledge:evidence/m09/verify1.md` (F-06) |
| Supersedes | refines D-118, D-121 and D-125 (ink chip on-state extended to toggles in a param row) |
| Milestone | M09 (M09-T02, M09-T07, M09-T14); upstream at 0.3.x |

### D-259 The COTTER baker stays outside designs/cotter/legacy

| field | value |
|---|---|
| Status | owner |
| Decision | Default in force: the COTTER baker `build.py` is not copied into `designs/cotter/legacy/`. Its dash assert (line 24) writes the em and en dash as escapes, lint-voice blocks that in any repo file, its allow file can never exempt the dash rule, and D-142 forbids editing legacy bytes. lineage.json records it with dest null: `cotter.baker/r5` is canonical at `originals/cotter/files/cotter-src/tools/build.py` (sha256 434d8b1b...4bf, measured) and `cotter.baker/evidence-x` is the copy. M09-T13 ports from the originals path, which D-222 permits; the baked cotter.html is in the repo. The owner question: admit a byte-identical legacy file that names dashes as escapes (a lint-voice exemption scoped to escapes under `designs/*/legacy`), or keep such files outside the repo. |
| Rationale | Two absolute rules meet on one file: RULES Language and D-142. Only the owner can relax either. |
| Evidence | `fab-knowledge:originals/cotter/files/cotter-src/tools/build.py`; `lineage.json` (cotter.baker rows); `tools/lint-voice.allow.json` |
| Supersedes | narrows the M09-T01 done-when (every legacy input read from the repo) for this one file |
| Milestone | M09 (M09-T01, M09-T13) |

### D-260 Legacy lineage subjects and allow rows of M09-T01

| field | value |
|---|---|
| Status | decided |
| Decision | M09-T01 adds canonical lineage rows for pip.baked, pip.baker, manifold-classic, pip.build-sh, pip.package, pip.package-lock, pip.smoke, pip.overflow, pip.license, knuckle.bench, tenon.bench, cotter.bench, cotter.baker, hackbuild-ui.css/0.2.0, hackbuild-ui.guidelines/v1.2, hbf-theme.tokens/handoff, hackbuild-bench.css/main and ui-anatomy/handoff. A copy of a file that already has a canonical row goes under that row's subject (bench/part2.js under catalog-src.pip.part2, tools/orca3mf.js under orca3mf, tools/rastermesh.js under healer). tools/lint-voice.allow.json gains per-file exclaim rows for the new legacy benches and the manifold classic script, whose exclaims come from minified three.js and manifold bundles, as the sash.html row does. The hackbuild-bench on-ink token row records the working-file hash bcac41d7...d3ea: the card names git 2c66696 (blob 11a4260f...dd51), lines 12 to 21 are identical in both (measured), and lineage.test checks each row against the file on disk. |
| Rationale | The lineage cross-subject rule refuses a copy filed under a second subject, and the voice gate refuses vendor bundles that D-142 keeps byte-identical. |
| Evidence | `lineage.json`; `tools/lint-voice.allow.json`; `tools/test/lineage.test.mjs` (20 of 20, 602 of 602 sources hashed, measured 2026-10-11) |
| Supersedes | refines the M09 card Legacy sources rows for the hackbuild-bench on-ink tokens (git 2c66696) |
| Milestone | M09 (M09-T01) |

### D-261 Rail declarations M10 adds to spec

| field | value |
|---|---|
| Status | decided |
| Decision | Inside a list instance a showWhen leaf reads the instance's own fields first, then the design top level (packages/ui/src/rail/showWhen.ts). An enum option whose value reads as a number outside `legal` is dropped; a non-numeric option stays; a set-valued constraint form waits for its own decision. At M10 spec/chase.ts gains `key: true` on a list item field to name an instance head; until then the PIP fixture names each group with an enum whose showWhen is `{field, in: []}`. A rail step may list `notes.<id>`, which renders the notes panel under the head of the param group with that id, showing the note the last build filled for that id or else the group's declared note; a group's foot note renders through the same component. spec Welcome gains an optional `pitch` (one paragraph under the tool title in Special Elite, PIP note 1 at bench/part1.html line 195) and RailStep gains `empty` (PIP note 8, shown when no panel of the pane is visible); until then both live in packages/ui/test/fixtures/pip-notes.ts. A drive declaration gains a `label`, so the flex-pair key reads as PIP's A or SELECT did. `defaultsOf` moves into spec so one copy exists; packages/ui/src/rail/model.ts holds a second copy because core's imports node:fs, and rail.test.ts asserts the two agree on the flex-pair chase until the move. |
| Rationale | The M09 rail and notes cards met these gaps while porting PIP part1.html, part3.js and src/layout.js; each was carried by a fixture so M09 did not change the draft spec. |
| Evidence | `packages/ui/src/rail/showWhen.ts`; `packages/ui/src/rail/model.ts`; `packages/ui/test/fixtures/pip-notes.ts`; `designs/pip/legacy/bench/part1.html` |
| Supersedes | refines D-124 (notes panel kind) and D-132 (ParamField additions) |
| Milestone | M10 (spec); M09 carries them in fixtures |

### D-262 The single kind layout, readout rail, log drawer and drive pad

| field | value |
|---|---|
| Status | decided |
| Decision | The `single` kind lays out 330 px, 1fr, 300 px above 1180 px; from 900 to 1180 px two columns, with the design rail carrying every panel; below 900 px the composer stack. A step with no params panel gives the stage the left column. The readout rail shows only when the step declares a readout panel, and the log sits in a drawer opened from the status strip, in place of COLLAR's always-on LOG column. Materials appear as a fold at the top of step 1 when no step declares `materials` (D-221). Under 640 px the cams fold into one HbSelect. The `layers` view mode is the slot lift the explode already draws, until per-body insertion explode lands. The drive pad fills a held key with paper and ink and borders the pad with `--hb-ink-border`; keys cap at 300 px, or 220 px under 640 px, as in PIP, and the mode hint hides under 640 px. |
| Rationale | The gold grade found the 1280 px stage at 574 px between an empty left rail and a log-only right rail (measured); collapsing the rail gave 890 px (measured). The stage keeps its one focal pink, so the pad no longer uses pink. |
| Evidence | `packages/ui/src/bench/BenchShell.vue`; `packages/ui/src/bench/bench.css`; `fab-knowledge:evidence/m09/gold-report.md` (GOLD-11); `fab-knowledge:evidence/m09/recheck.md` (R-01 and R-02: the log chip is 48 x 17 px at 390 and the pad share is 0.256, measured) |
| Supersedes | refines D-126 (the single region map), D-221 and D-125 |
| Milestone | M09 (M09-T07, M09-T10) |

### D-263 The drive pad reads circuit equations through a headless circuit subpath

| field | value |
|---|---|
| Status | decided |
| Decision | ui-core `drive.ts` reads the catalog pin table from `@hackbuild/catalog/data/mcu-pins.json`. At M10 `@hackbuild/circuit` gains a headless subpath export (`@hackbuild/circuit/read`) holding the classify equation and the floatPoint decay and droop equations, and drive.ts imports it. Until then drive.ts carries a copy of those three equations, and packages/ui-core/test/drive/drive.test.ts holds the copy equal to circuit floatPoint on the catalog row, including waitUs at 0.5, 1 and 2 tau. |
| Rationale | Importing `@hackbuild/circuit` or the catalog index pulls manifold-3d through mesh and failed the esbuild probe on node:module; one implementation of each thing requires the subpath. |
| Evidence | `packages/ui-core/src/drive/drive.ts`; `packages/ui-core/test/drive/drive.test.ts` (the 2 x tau mutant fails, measured 2026-10-12) |
| Supersedes | refines D-076, D-078 and D-079 (read models feed the pad) |
| Milestone | M09 (M09-T10); M10 (the subpath) |

### D-264 A fab bake carries its library build and its export writers

| field | value |
|---|---|
| Status | decided |
| Decision | A fab bake counts green on an Exit row or a G row only when that row passes on the file as shipped, opened from `file://`, with no injected `hbfHostBuild`. The browser-safe build and check pipeline (buildPart, runAllChecks, the build.ts entry imported directly, no node:fs) and the 3mf, stl and card writers move out of core into one package that core and the bench share; tools/bake inlines it and mountBench passes it as `opts.build` and registers the writers. In a page, `json` and `png` are free exports (ui-core FREE_EXPORTS) and every other declared kind is a fabrication export behind the gate. A fabrication export with a blocking fail rejects with `<kind> export refused: <ids> failed. fix the finding, then export.`, and the exports panel shows the same line on the disabled button (ui-core blockingChecks and blockedLine). |
| Rationale | The flex-pair bake as shipped boots to "build failed" with an empty stage and writes only json (measured 2026-10-12); every flex-pair pass in the M09 smoke and gold runs used the node host build. RULES calls a bench that cannot build from file:// a bug. |
| Evidence | `packages/ui/src/bench/entry.ts` (WRITERS); `tools/smoke/host-build.ts`; `fab-knowledge:evidence/m09/verify1.md` (F-01); `fab-knowledge:evidence/m09/gold-report.md` (GOLD-01) |
| Supersedes | refines D-128 and D-129 (what a baked fab bench carries) |
| Milestone | M09 (Exit, blocker); the extraction is core and tools work |

### D-265 PIP legacy gold rows are report-only

| field | value |
|---|---|
| Status | owner |
| Decision | Default in force: the bench-layer gold rules on `dist/legacy/pip-legacy.html` are graded report-only against `tools/gold/calibration.json` and do not count in the M09 Exit zero-fail row, which counts fab bakes only. Where the legacy page has no subject for a rule (no checks panel, step scope, done or visited badge, declared cam, view or focus, viewer accessor, or CHK-PRT-16), the rule grades n/a with its reason, listed per adapter in `tools/smoke/gold/gold.ts` LEGACY_NA; every other rule runs through the adapter. The fixes land when PIP is rebuilt from a chase at M10. Measured fails on the legacy bake: G-03, G-10 (a hang), G-11, G-21, G-37, G-42, G-43 (18 focal pinks at 390 px), G-52 (pad 320 x 107 px on a 390 x 324 px stage), G-54 (undo 41 x 24 px). |
| Rationale | D-142 freezes the legacy bytes and CI compares the bake with pip.html (sha256 a1fa88bd...1263), so no fix can land on that file; its fails are the gold bench's recorded flaws. |
| Evidence | `fab-knowledge:evidence/m09/gold-report.md`; `tools/gold/calibration.json`; `tools/smoke/gold/gold.ts` |
| Supersedes | refines D-212 (which benches the M09 zero-fail row counts) and applies D-142 |
| Milestone | M09 (Exit); M10 (PIP from a chase) |

### D-266 Gold harness conventions

| field | value |
|---|---|
| Status | decided |
| Decision | spec/hook.ts `built` is the rev of the last completed build: G-01 reads "model present and built equals rev", G-04 counts builds as observed changes of `built`, and TESTING.md 8.5 follows. BENCH.model is the ViewPart `{part, meshes}` with the build's metrics and `report.results` added. G-11 on a reference bake uses a forced throw in the build host until designs carry `test/faults/throw.json`. The G-42 harness reads a declared panel's stub (`data-hb=panel-absent`) as a status line. report.mjs grades a rule "no harness" (exit 2) only when its input file is present and holds no test with that id; a missing input file grades not run. runtime.json is `{ bench: [{measure, value, unit, failed, grade, rules?}] }`; a row tagged with rules grades only those rules; a row between the target and the D-213 fail bound grades "over target" and exits 1; the busy and slow-build rows carry G-56. gold-static.json is `{ benches: { id: [{id, check, result, message?}] } }`. The slow-build line fires at `BenchDecl.build.slowMs`, default 2500 ms (D-213, COLLAR collar.html line 2808), and names the param set last. The kit page has no BenchHook and is out of gold scope. |
| Rationale | The gold report must grade each rule from a named input, and an Exit row that says under 2 s cannot pass at 2203 ms (measured). |
| Evidence | `tools/gold/report.mjs`; `tools/gold/report.test.mjs` (12 of 12); `tools/smoke/gold/perf.spec.ts`; `packages/ui-core/src/bench/core.ts` |
| Supersedes | refines D-212, D-213 and D-214 |
| Milestone | M09 (M09-T11, M09-T14); M10-T17 fills the chase-bound rows |

### D-267 The bake writes a licence manifest and refuses LGPL

| field | value |
|---|---|
| Status | decided |
| Decision | The bake writes `dist/<out>/<id>.licences.json` and fails when an inlined package has no tools/licences.json row or is LGPL (eecircuit-engine 1.8.0 is refused in a default bake). THIRD-PARTY-NOTICES.txt is committed at the repo root and `node tools/licences.mjs --notices --check` holds it to the rows; the CI bake job runs it. |
| Rationale | A single-file bench redistributes every package it inlines; the notice must come from the same rows the gate reads. |
| Evidence | `tools/bake/test/bake.test.mjs` (13 of 13); `THIRD-PARTY-NOTICES.txt`; `tools/licences.json` |
| Supersedes | refines D-129 |
| Milestone | M09 (M09-T13, M09-T14) |

### D-268 Absolute owner paths in provenance stay as written

| field | value |
|---|---|
| Status | decided |
| Decision | Absolute paths into the owner's home folder in provenance records (lineage.json, corpus manifests, seeds, check pages and the corpus generators that name their sources) stay as written in the public trees of hackbuild-fab and hackbuild-3mf. They name where a copy came from in the owner's archive, which is not published; `tools/publish-paths.mjs` does not remap them. |
| Rationale | Remapping changes bytes that goldens and lineage sha256 rows record, so goldens would move for no change in geometry. The owner delegated the call on 2026-10-13. |
| Evidence | `fab-knowledge:publish/recheck.md` (R-02: 1169 fab lines and 159 3mf lines, counted); `lineage.json` |
| Supersedes | closes recheck R-02 |
| Milestone | the first public push |

### D-269 vtracer corpus input 07 leaves the public trees

| field | value |
|---|---|
| Status | decided |
| Decision | `tools/corpus/inlay/vtracer/07-user-art-reference.png` (mirrored KCR lettering from a SPRUE upload, author unknown) is untracked and listed in .gitignore; the file stays on the owner's disk. SHA256SUMS, inputs.json, the corpus generator and the vtracer-eval tests drop it, so the corpus holds nine inputs; its lineage row keeps the source and sha256 with dest null, and its path-map row is gone. The row 7 numbers in `docs/evaluations/vtracer-1.0.0-alpha.4.md` stay as measured on 2026-10-07. hackbuild-3mf never held it. |
| Rationale | A grant needs an author; with none known the file cannot carry one. The owner delegated the call on 2026-10-13. |
| Evidence | `fab-knowledge:publish/safety.md` (S-13); `fab-knowledge:publish/recheck.md` (R-04); `tools/test/vtracer-eval.test.mjs` |
| Supersedes | closes S-13; refines D-185 (the file had a pending path-map row) |
| Milestone | the first public push |

### D-270 Report goldens accepted for print check scope and the CHK-NET-29 solve capacitance

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-13, on the rule the owner set: accept a reference's report move if and only if its geometry did not move. Each reference below was run with `SOURCE_DATE_EPOCH=315532800 npx --no-install hbf parity <ref>`; build.json (every meshHash and volume), artifacts.json, edit.json and every query golden came back equal, and report.json moved only in the checks the two fixes change. OK-07 (print checks skip non-fdm parts): CHK-PRT-07, -12 and -13 go from pass to skip on 19 sheet600 references, 57 findings (counted), reason "machine sheet600 cuts laser sheet and has no layer grid". D-04 (CHK-NET-29 priced at the solve capacitance): flex-pair K1 at 7 to 8.96 pF, ceiling 100000000 to 78125000 ohm; flex-cone KEY at 7 to 8.6 pF, ceiling 100000000 to 81395349 ohm (computed), verdict warn unchanged on both. Accepted with `hbf parity <ref> --accept`; packages/project/test/fixtures/graph.jsonl rerecorded with HBF_ACCEPT_GRAPH=1 (21 report items moved, nothing else). reportHash before to after: buttons/flex-cone 0f275359...f1d1 to 40e517cb...70c6; joints/balance-beam 0060cf50...b41a to e488181e...15bf; joints/finger b523fdb6...1c3c to 31496e9a...c37b; keys/flex-pair 4704229c...1292 to 41d6ef7c...4335; mechanisms/coanda-gate b4c71c2a...7dca to 5a24664f...4338; mechanisms/coincidence-and ce76ba2b...723d to bba4361d...4824; mechanisms/detent-latch 8a562adf...8c9e to 6ea35dfb...87b6; mechanisms/differential-xor 6906977e...d724 to d724432b...2155; mechanisms/inhibit ebe78fc3...0498 to c524e58f...4932; mechanisms/living-hinge bed34823...649a to 1ba7b999...7757; mechanisms/membrane-valve 553bd68d...c80c to 936e69e7...b660; mechanisms/ratchet-pawl e23d9214...ce26 to 94d4496a...a456; mechanisms/shift-drum 6ffdd3ed...4194 to 08da8222...fd3a; mechanisms/snap-flexure b6346b26...11ae to bea235f8...1e62; mechanisms/spur-pair 5ef3d37f...2a09 to 8b32527d...e9a1; mechanisms/teeter-not 280b0f9e...b716 to 05cfb15d...2ebe; mechanisms/tesla-valve cfb4f14b...c331 to 2c6c8b70...7089; mechanisms/tumbler-coded-and a1b8b85d...a10f to 22e8df68...f9f1; mechanisms/wedge-or 8500b525...9124 to 28d64792...55de; mechanisms/whiffletree 3d3acef9...9dfd to a2333669...d028; sheet/capsule-rotor-cage d4e93e63...57fc to 138320a0...577c. electrical/pip-buried-route stays unaccepted: its build.json, meshes and query-solve golden moved (D-251). |
| Rationale | The two fixes change what a check reports, never a solid; a golden whose geometry is equal records only the corrected report. The owner delegated the call on 2026-10-13. |
| Evidence | `fab-knowledge:evals/2026-10-13/commit-plan.md` (commits 4 and 5); `fab-knowledge:evals/2026-10-13/personas/okafor.md` (OK-07); `fab-knowledge:evals/2026-10-13/personas/devon.md` (D-04); `packages/checks/test/print-scope.test.ts`; `packages/checks/test/skeleton-cap.test.ts`; `core/test/project-graph.test.ts` |
| Supersedes | applies D-152 and D-227; leaves D-251 in force for pip-buried-route; at the flex-pair defaults reportHash 4704229c becomes 41d6ef7c (computed; 71 results, CHK-NET-29 K1 still warn), every mesh hash and volume unchanged |
| Milestone | none |

### D-271 A design declares a coupon export only once a coupon reference exists

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-14. flex-pair declares the exports 3mf, stl, card and json; `coupon` leaves its chase. The coupon export returns when `reference/coupons/resistivity` (bar geometry set in a card from PROFILE.md 6.1 stack rows) or `reference/coupons/pip-electrical` (M10-T13, the port of PIP `src/coupon.js` lines 45 to 246) exists and the pipeline exports it through the gate. The same rule holds for any design: no coupon export is declared before its coupon reference builds. |
| Rationale | An export with no writer fails smoke and hook conformance, and a writer now would invent bar geometry no card sets (D-222). PROFILE.md 11 and 11.1 and UI.md 6.3 define a design's coupon export as the export of a separate coupon reference, and none exists. |
| Evidence | PROFILE.md 11.1 and 11.2; UI.md 6.3; M10-chase.md M10-T13; `packages/archetypes/src/defs/originals/electrical-coupon.ts`; `tools/hook/errors.spec.ts` ("unknown export kind: coupon"); `fab-knowledge:evals/2026-10-14/task-b/notes.txt` |
| Supersedes | refines D-177; at the flex-pair defaults buildHash e00fb015 becomes b22ba364 (computed, defHash hashes the parsed chase), every mesh hash and volume unchanged |
| Milestone | M09, revisit at M10-T13 |

### D-272 Seat pins are net taps, proved by CHK-NET-46; keys/midi-pad enters as a reference

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-14. A used castellation port on a seat carries an optional `PortTap` (spec/features.ts): the bump the pin presses on, the catalog pin centre placed by the seat frame on the bump top, the board, the MCU, the pin and the clamp. path1d, solveKeys and net extraction end a tapped net's read path at the bump, so a seated net needs no lead to the body outline. CHK-NET-46 proves the landing: pin on contact at least `seat.pinOnContactMin` 0.11 mm (inferred, from the catalog inset conflict 1.38 vs 1.27), press over `seat.bumpPress` 0 to 0.5 mm (PIP model.js line 576) or a socket pin of at least `seat.socketPinMin` 2.0 mm (line 595). `reference/keys/midi-pad` enters with its first goldens at build dc7800..a1 (epoch 315532800). Its report golden was re-accepted once on 2026-10-14 after the CHK-NET-29 message fix: K2 now reads "at 11.0 pF" (cPf 10.9996, computed), the only field that moved; build.json, edit.json, artifacts.json and query-solve.json came back equal. |
| Rationale | PIP seats the board on bumps under a clamp (model.js lines 313 to 319); a lead to the outline modelled a wire the part does not have. A new reference's first goldens need no prior golden to match. |
| Evidence | `packages/circuit/test/seat-tap.test.ts`; `packages/archetypes/test/seat-tap.test.ts`; `packages/checks/test/net46.test.ts`; `packages/checks/test/fmt-whole.test.ts`; `reference/keys/midi-pad/test/reference.test.ts`; `fab-knowledge:evals/2026-10-14/verify.md` |
| Supersedes | new; the midi-pad open items (fader wiper over the ADC line, no bezel clamp, whole bus leg pricing) stay listed in its README |
| Milestone | M09 |

### D-273 Goldens re-accepted for platform-stable board writers, the flex-pair coupon drop and coin initials

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-14, on the rule of D-270: accept a golden move if and only if its geometry did not move. spindle-r1: the gerber writer snaps region vertices to the 1 nm grid with half-to-even rounding and sorts draw order on an exact integer area, so macOS arm64 and Linux amd64 write the same bytes (computed, docker and CI run 38530766459). buildHash dd60cfc6 becomes c1e4e60e, zip sha256 465431..10; build.json moves defHash and buildHash only, report.json worstSymdiffMm2 only, reparse symmetric differences 0.000000 mm2; every layer folds to 0.0 mm2 symmetric difference and 0.0 Hausdorff distance against the old zip (computed). shunt-art: buildHash 976f6a5d becomes 05c147f5, defHash and buildHash only. flex-pair: buildHash e00fb015 becomes b22ba364 (D-271); the print card 3MF moves from 65703 bytes sha256 4419e5df to 65702 bytes f20da97e because its metadata carries the build hash, resliced on 2026-10-14 with G-code equal apart from its generated-at line (computed). coin-inlay: the `initials` and `textSize` params move buildHash bb1aa7c2 to 2cf47f04, defHash, paramsHash and the 3mf hash; an empty `initials` adds no layer. Every mesh hash and volume in these goldens is unchanged (computed). |
| Rationale | Each move records a hash of source or params, or a byte order, never a solid. The owner delegated the call on 2026-10-14. |
| Evidence | `tools/py/board/test/test_direct.py`; `tools/py/board/test/test_reparse.py`; `packages/inlay/test/text-coin.test.ts`; `fab-knowledge:evals/2026-10-14/verify.md`; `fab-knowledge:evals/2026-10-14/flex-pair-slice/`; `fab-knowledge:evals/2026-10-14/text-coin/` |
| Supersedes | applies D-152 and D-270; leaves D-251 in force for pip-buried-route; packages/project/test/fixtures/graph.jsonl is not rerecorded until D-251 is ruled. Note of 2026-10-14: the fixture was rerecorded with SOURCE_DATE_EPOCH=315532800 HBF_ACCEPT_GRAPH=1 after reading the diff, so packages/project failed on these references as well; the build, golden and report lines of shunt-art, spindle-r1, coin-inlay and flex-pair moved (their mesh lines only in the build hash they link to, every mesh item hash unchanged) and keys/midi-pad was added (111 lines); the pip-buried-route lines are byte for byte those of HEAD, so its five stale.test.ts failures remain until D-251 is ruled (computed) |
| Milestone | none |

## Owner calls of 2026-10-14

Taken by the agent under owner delegation on 2026-10-14: the owner asked the work to continue without them looking at anything. Where a person was meant to look at a render, an agent looked with the Read tool, and each entry says so. Evidence lives in `fab-knowledge:evals/2026-10-14/calls/`; the independent recheck is `fab-knowledge:evals/2026-10-14/calls/verify.md`.

### D-274 pip-buried-route goldens accepted: the off-grid emit is the original's geometry

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-14. Accept the pip-buried-route goldens proposed under D-251: buildHash 078773..bd moves to 1adfb9..b0 and reportHash 98001903 to 6160def1 (computed). `SOURCE_DATE_EPOCH=315532800 npx --no-install hbf parity reference/electrical/pip-buried-route --accept` wrote them; a second run exits 0, and build.json, report.json, query-solve.json, edit.json and artifacts.json equal the proposed set in `fab-knowledge:evidence/m06-m08-integration/pip-buried-route-proposed-goldens/` byte for byte. The graph fixture `packages/project/test/fixtures/graph.jsonl` was rerecorded with `SOURCE_DATE_EPOCH=315532800 HBF_ACCEPT_GRAPH=1`; its build.json golden item moves from 3ddbc625 to 3bec52f8, hashAtLink 1adfb966. The D-251 known-red line and its step-name note leave `.github/workflows/ci.yml`, the two `tools/test/plan-drift-audit3.test.mjs` tests that held only while the reference was unaccepted are removed, and the reference README records the accept. |
| Rationale | The change judged is the M06 emit that computes PIP's regions off the 1/1024 mm grid. At the emit the new regions are the original's: the symmetric difference on all 31 moved trace regions is at most 1e-6 mm3, where the grid-snapped emit read up to 0.034828 mm3 (computed). As built, the 37 moved bodies differ from the previous build by at most 0.000302 mm of mean wall travel (trace.GND.l1.1), under half a 1/1024 mm grid step, the build's own vertex resolution (D-054). Against the raw original 24 of them read slightly smaller, 8 closer and 5 equal; the 5 equal are the posts, whose hash moved with no geometry change. The smaller reading follows from the stage 6 coincidence inset (3mf.coincidenceInset 0.001 mm, inferred), which the old emit's outward grid snap partly offset. Against the original given the same inset, 24 of the 31 moved traces are closer and 7 differ by 1.4e-5 mm3 each, snap noise on the 24-gon terminal discs (computed). Rejecting would restore an emit that `packages/copper/test/trace-layer-volume.test.ts` holds to be 0.105 mm3 over the original. Report verdict tallies are unchanged and circuit.solve stays pass 91, skip 25, fail 0 (computed). The closest built pairs are B/Y 0.716, 3V3/UP 0.718 (was 0.7175), Y/A 0.726 and LEFT/RIGHT 0.727 mm against PIP's model pairs 0.714, 0.716, 0.724 and 0.725, within the test's 0.004 mm inset slack (computed). Report changes beyond those are the M06 check version bumps (CHK-KEY-01 2.1.0, CHK-KEY-02 2.0.0, CHK-KEY-04 2.0.1, CHK-PRT-03 2.0.0, CHK-PRT-04 2.0.0, CHK-SHT-11 1.0.1), measured gaps a few tenths of a micron over, and the CHK-KEY-06 mesh uri. The moved bodies were rendered and looked at by an agent, not a person: the routing is the same and every trace is whole and buried. |
| Evidence | `fab-knowledge:evals/2026-10-14/calls/pip-buried-route/`: `dump.mjs` builds both route.data.ts versions, the old one (`fab-knowledge:evidence/m06-unblock/route.data.before.ts`, sha 18c229d2) reproducing all 77 mesh hashes of build 078773..bd and the new one (f9db90fd) all 77 of the proposed set; `orig.mjs` runs pip-controller b137deb from `originals/pip/files/pip-controller/src` in place on manifold-3d 3.5.3, captures the conductor extrusions of model.js lines 29 to 51 with their z bands checked, and reproduces the recorded 869.687808 mm3 of cPLA below the pad plane (computed); `compare.log`, `compare.json`, `compare-levels.json`, `displacement.json`, the renders, `goldens-before/` and the parity logs. The recheck in `calls/verify.md` picks each original counterpart by z band and overlap and reproduces the symmetric differences to 6 decimals on five moved traces. Not run: `validate_3mf.py --overlap` and the design sweep, since artifacts.json is STL only and the export gate needs a person at a TTY. |
| Supersedes | applies D-152 and D-251; closes the D-251 open accept for electrical/pip-buried-route (AUDIT-2026-10-11 section 5 owner item 1); at the defaults 37 of 77 mesh hashes move (body 40915.671154 to 40915.714180 mm3, traces 741.253298 to 741.210298 mm3, computed) |
| Milestone | M06, M08 (integration) |

### D-275 SLUG trials are deterministic across x64 and arm64; the measured value is 90 of 128

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-14. The SLUG capsule solver takes sine, cosine, tangent and atan2 from `packages/sim/src/trig.ts`, a port of fdlibm 5.3 in plain double arithmetic with the Sun notice kept, and no longer calls V8 Math for them. One committed record, `packages/sim/records/slug-trials.json`, holds for every platform; no per-platform record is made. The measured value of D-232 changes from 91 of 128 (hash 50e70943) to 90 of 128, end-state hash of seed 8 32447a603bb988f99476f18c9255a1496abd4c705cdcdf57f78b917f39110daa (computed); 30 trials read 332 of 480 (b5a431fb) and the 58 mm mouth 69 of 78 (2bde4657), mean 11.5 against 11.33, belowMouth156 false (computed). The declared 126 of 128 stays declared and unverified, `sim.run --scene slug` still exits 1, and the exit row reads "unverified, measured 90 of 128". `packages/sim/test/trig.test.ts` pins the split arguments to their fdlibm values, an 80,000-call sweep hash, a 1 ulp bound against host Math, the edge cases and the argument-limit error, and fails on any host trig call in the capsule solver. |
| Rationale | The cause was ours: V8 computes Math.sin, cos and atan2 in compiled C++, and Node 22.18.0 on macOS arm64 returns 1 ulp off Linux x64 on about 0.4 percent of the solver's calls (computed: 136 atan2, 2907 sin and 2877 cos of 3,000,000 recorded calls). The SLUG pile amplifies one ulp into a different vend outcome. Rapier is not involved, since the capsule solver is plain JS. The port equals Linux x64 Math on all 13,643,653 test calls, and arm64 Math differs from it by 1 ulp on 41,837 of them and never more (computed), so the new set is the one CI x64 already produced; 91 was an artifact of the arm64 last-bit drift. No declared number changed. |
| Evidence | CI run 38542405799 (x64 90 of 128, 32447a60; M1 91 of 128, 50e70943); `fab-knowledge:evals/2026-10-14/calls/slug-sim-drift/` (`cmp-x64.txt`, `arm.txt`, `x64.txt`, `all-arm.txt`, `all-x64.txt`); x64 runs in the node:22.18.0-bookworm-slim linux/amd64 container on the M1, which reproduced the CI failure bit for bit before the fix; `slug-parity.test.ts` still agrees to 0 mm with the legacy module's Math trig pointed at the same port. The recheck (`calls/verify.md`) gives equal results on two arm64 runs and the container, and on its own 2,000,000-call sweep the port hashes the same on both architectures. Checked from run output by an agent, not looked at by a person. Not run: the hosted runners before this push. |
| Supersedes | D-232 (measured value and hash only; the rest stands); PLAN.md, MILESTONES.md, CANONS.md, RISKS.md, TESTING.md, PACKAGES.md and the M02 card now cite 90 of 128 |
| Milestone | M02 |

### D-276 D-249 answered: SPINDLE R1 stays the expect-fail fixture; spindle-r2 drops the four GND vias on the 5V trace

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-14. `reference/boards/spindle-r1` keeps the shipped R1 board unchanged and declares the short as a CHK-BRD-21 expect set ["5V\|GND"] (D-074), which passes only while the measured short set is exactly that pair. CHK-BRD-01 has no expect set; the exit-m06-m08 CI job requires it to exit 1 with exactly its 3 reparse lines (a B_Cu piece of 34.15 mm2 joining 5V and GND; 2 holes off GND touching the pour; 4 GND holes off the pour), and requires R1 part.build to exit 1 on exactly CHK-BRD-01, CHK-BRD-06 and CHK-BRD-09 with DRC 19 nets, 70 pads, 57 holes. The new `reference/boards/spindle-r2` is the R1 port with the four GND vias at (9.80, 20.00), (16.00, 20.00), (30.60, 20.00) and (36.20, 20.00) removed; its silk revision, Excellon headers and zip name read R2, and no other copper changes. Its goldens are build b319922f..a2, fab zip a808f13b..9d (computed, D-284). The shipped pcb.py, gerbers and KiCad file stay as shipped in `fab-knowledge:originals/spindle/files`. |
| Rationale | Removing these vias is the smallest fix the original supports and adds no copper of its own. pcb.py line 192 says GND vias are stub ends ("short stubs into vias, the bottom pour carries it"); each of the other nine GND vias ends a stub (lines 201 to 209), and these four end nothing. The pour clear around the 0.80 mm 5V trace reaches 0.75 mm from its centre line (lines 234 to 237) while a via ring reaches 0.50 mm, so each of the four touches only the 5V trace. Moving the vias or rerouting 5V would place copper the source does not declare. |
| Evidence | Computed: R1 reparse gives GND holes bonded 18 of 22 and isolated 33 of 35; R2 gives bonded 18 of 18, isolated 35 of 35, drills 53 of 53, worst symmetric difference 0.000000 mm2, CHK-BRD-21 19 nets one island each, DRC 19 nets, 66 pads, 53 holes, tightest 0.32 against 0.25. R2 part.build fails only CHK-BRD-06 (inferred hand pads) and CHK-BRD-09 (GPIO8, GPIO9), as R1 does. Every exit-m06-m08 board step exits as asserted locally, and the R1 assertions fail on R2 output. An agent looked at the parsed-gerber renders of both boards (`tools/py/board/render_parsed.py`), not a person: the R2 back shows the 5V trace with its two 5V vias only and the pour running past both ends; the front silk reads "R2  hack.build". spindle-r1 parity moved build.json and report.json only, with artifacts.json and reparse.json byte equal. No R2 board has been fabricated. Paths: `reference/boards/spindle-r1/expected/reparse.json`, `reference/boards/spindle-r2/expected/reparse.json`, `reference/boards/spindle-r2/README.md`, `fab-work-directory:benches/spindle/outputs/spindle/pcb.py` lines 184 to 209 and 234 to 239. |
| Supersedes | answers D-249 (its default "the fix is the owner's"); amends the M08 Exit row "SPINDLE R1 DRC" from a bare part.build to the asserted failure set and adds the spindle-r2 row; PLAN.md C-21; applies D-152 under owner delegation, with no person acceptance |
| Milestone | M08 (M08-T07, M08-T12) |

### D-277 D-254 answered: SHUNT declares CHK-BRD-09's measured set; the legacy floating list stays as shipped

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-14. `reference/boards/shunt-art/chase.ts` declares the CHK-BRD-09 expect set ENC, MAGIC, PROBE, RF_OUT, VBUS, the nets with fewer than two pads, in place of GND?, MAGIC, MATRIX, PROBE, VIBES. No check for undriven nets is entered. board.json (its defects.floating list) and `designs/shunt/legacy` are not changed. |
| Rationale | The legacy list is a hand-named filter (gen_board.py lines 705 to 709) whose gate compared only a count of 5 (line 712); no registered rule derives it. Under CHK-BRD-20's own definition of a source (a J connector pin or a module power pin), GND? holds J1 and PROBE holds J2, so a no-source check would contradict the legacy list instead of reproducing it, and an expect set built to match a hand list would keep its own copy of the answer. The measured set says what is on the fab copper: ENC, PROBE and VBUS reach no pad because SW1, J2 and J1 are stand-ins with no copper; MAGIC reaches U1.1 alone and RF_OUT Y1.1 alone. The count is 5, which the legacy gate also required. A corrected revision does not apply because SHUNT is non-functional by design. |
| Evidence | Computed: `hbf check.run reference/boards/shunt-art --only CHK-BRD-09,CHK-BRD-21` exits 0 with both sets exact and missing and extra empty. Parity re-accepted build.json and report.json only; artifacts.json and reparse.json are byte equal. Paths: `.hbf/out/shunt-art/record.json` nets, `reference/boards/shunt-art/board.json` parts (stand_in J1, J2, SW1), `fab-work-directory:benches/shunt/outputs/shunt-r1/gen_board.py` lines 699 to 716. |
| Supersedes | answers D-254 (second reading); corrects the M08 Exit row "SHUNT expect sets" run note; applies D-152 under owner delegation, with no person acceptance |
| Milestone | M08 (M08-T09, M08-T12) |

### D-278 Owner-file derivation finds unguarded and guarded owner-path reads

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-14. `.github/scripts/owner-files.mjs` also marks a test that passes an owner path to a file read: a lineage.json row `.source`, a `/Users/` literal, or a name bound to either, through multi-line helpers and a local function that reads its first parameter. An unguarded file is excluded from hosted runs; a file whose read sits behind existsSync (a skip or skipIf in the same test) stays in hosted runs and is listed for the owner-files job. `designs/collar/test/nfc-pause.test.ts` reads committed copies of the two COLLAR print cards (`designs/collar/test/fixtures/owner-collar-print-card-20260819-nfc-020.txt` and `-20260830-nfc-024.txt`, new lineage copy rows checked by sha256), so the M03 exit row keeps running on the hosted parity job. |
| Rationale | The ENOENT in the CI parity job came from `readFileSync(row.source)`; the derivation knew only imports and fab-work-directory literals. The sprue print card is the precedent for a committed print card copy. |
| Evidence | CI run 38542405799 job parity; the owner-files report lists 10 guarded files and 0 unguarded besides the import list; `owner-files.test.mjs` gains 4 cases, node --test 16 of 16 across `.github/scripts` and ci-exit-rows. Known gap: any existsSync earlier in the same test counts as a guard, even one on another path. |
| Supersedes | new |
| Milestone | M09 (CI) |

### D-279 G-03 on the PIP legacy page is the calibrated original flaw; the zero-fail gold run grades fab bakes only

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-14. The failing "chip after input without change" row was G-03 on `dist/legacy/pip-legacy.html`, not G-36 and not packages/ui. `tools/smoke/gold/gold.ts` writes each bench's `origin` into gold.json, and `tools/gold/report.mjs` takes `--origin fab\|legacy`. The CI browser job grades the legacy page with `--calibrate --origin legacy`, report-only, and runs the zero-fail `--only` run with `--origin fab`. |
| Rationale | PIP's original touch() redraws chips without raising REV (pip.html lines 3104 and 3781), so its chip stays "mesh current" on input; `tools/gold/calibration.json` records it as an expected fail (pip-haft.md line 539). The job graded legacy flaws as fails, against D-265's default. |
| Evidence | Browser job 115780406858 log; replay of run 38542405799's smoke artifact through report.mjs: legacy rows all expected fails except suite defect G-47 not run (chase-bound, waits on M10-T17); fab zero fails except G-44 not run. The recheck ran the browser suite in a scratch clone with fresh bakes: smoke 28 passed, gold specs 37 passed. `tools/gold/report.test.mjs` 13 of 13. Looked at by an agent, not a person. |
| Supersedes | applies D-265's default to the browser job; D-265 stays an owner entry |
| Milestone | M09 (gold Exit row) |

### D-280 MP-01 midi-pad fader: fit a 100 nF hold capacitor at GP26 rather than move the terminals

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-14. Keep the midi-pad layout and list a 100 nF ceramic from GP26 to GND on the RP2040-Zero as a part in the reference README's Parts table; CHK-NET-06 keeps its warn (138968 ohm, computed) as the reminder. No pull-down. chase.ts is unchanged, so no golden moves. |
| Rationale | GIB part2.js line 544 (and BLOCKS parts.js line 702) is the original practice for a printed wiper over 100 kohm: 100 nF from W to ground, sample slowly. PIP reads no analog pin. The four through legs alone are 65382 ohm (computed). Straight down from GP26 the lead is at least 20.78 mm, 102864 ohm at the 3.85 mm wW maximum, and the T1 post sits in that line. Turning the fader so the terminals face the seat gives 17.68 mm, 109231 ohm at 2.8 mm and 97272 ohm at 3.85 mm, a 2.7 percent margin on a lower-bound path over inferred rows, hangs the 96 mm fader off the long edge and runs a lead under the T2 pad (computed). The numbers leave no fix without an extra part that keeps a margin. THINPOT's 100 k pull-down (feeler_thinpot.html line 4202) is under GIB's 20x rule (2.78 Mohm, computed). The chase hookup type has no field for an off-print part, and a comment edit in chase.ts would move defHash, buildHash and the 3MF hash. |
| Evidence | `hbf part.build` IR of `reference/keys/midi-pad`; parity PASS at build dc7800..a1, five files equal; `reference/keys/midi-pad/README.md`. The recheck confirmed GIB line 544 and the read.adc.holdCapNf profile row. |
| Supersedes | answers the D-272 open item "fader wiper over the ADC line"; proposed, not done: a holdCapNf field on the adc ReadModel so CHK-NET-06 can prove the part (spec, checks and a CHK-NET-06 version bump over six query-solve goldens) |
| Milestone | M09 |

### D-281 INLAY_KIND_VERSION 2.0.0 for the text and inside-host change

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-14. The inlay feature kind moves from 1.0.0 to 2.0.0 (`packages/inlay/src/kind.ts`, TXT-04). |
| Rationale | `RegistryEntry.version` (spec/registry.ts), PLAN 6.1 and CHECKS 1.3 make a bump major when the result can flip on the same input. checkInsideHost (3035fb3) refuses with E_SCHEMA art past the host outline that used to build as a loose body; the optional straight-text baseline is additive. |
| Evidence | coin-inlay registryHash moves and its mesh hashes and volumes stay equal (computed); `reference/cosmetic/orca-3mf-roundtrip` parity equal; packages/inlay vitest 274 passed, 1 skipped. |
| Supersedes | new |
| Milestone | M03 (inlay kind) |

### D-282 Coin textSize range and default from COLLAR

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-14. coin-inlay `textSize` is 1 to 30 mm, step 0.1, default 9, from COLLAR's text size control (collar.html line 2542) and its back face text size 9 (line 2891), the same bytes as the original of record. The help text qualifies 0.698 as computed (IBM Plex Mono cap height 698 of 1000 units). With D-281 the goldens are re-accepted as a new revision at build 8aa6bd..0e, recorded in the coin README. |
| Rationale | The old range 3 to 20 and default 10 had no cited source (D-222). |
| Evidence | Parity diff before the accept: buildHash, defHash, paramsHash and registryHash move, the 3mf hash moves, the 6 mesh hash and volume fields are equal (computed); the rerun passes. The recheck confirmed collar.html lines 2542 and 2891 and the cap height. |
| Supersedes | refines D-273 (coin params); coin-inlay buildHash 2cf47f04 becomes 8aa6bd..0e (computed), every mesh hash and volume unchanged |
| Milestone | M03 |

### D-283 Hash-only mutant survivors M04, M05, P02 and P04 are killed by behaviour tests

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-14. Behaviour tests replace golden hashes as the only killers of four mutants. M04: `packages/archetypes/test/seat-tap.test.ts`, the seat at inset 1.0 moves the bumps 0.38 x sqrt 2 mm and keeps the taps on the catalog pins. M05: `packages/circuit/test/seat-tap.test.ts`, an outline stub on a tapped net is not a terminal. P02: `tools/py/board/test/test_direct.py`, two congruent triangles with equal exact nm2 areas and float areas 0.105 and 0.10499999999999998 draw in normal order. P04: the same file, record rings sit on the 1 nm grid with no -0.0. |
| Rationale | `fab-knowledge:evals/2026-10-14/verify.md` section 2 left these four killed only by hashes, which name no behaviour. |
| Evidence | Each mutant run rebuild-first (apply, tsc -b, run, restore, tsc -b, file restored clean) fails only its new test; board pytest 27 passed. The recheck ran 7 further mutants rebuild-first, all killed. |
| Supersedes | new |
| Milestone | none |

### D-284 spindle-r2 goldens pinned at epoch 315532800

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-14. The spindle-r2 parity goldens are recorded at SOURCE_DATE_EPOCH 315532800 like every other board reference: build b319922f..a2, fab zip sha256 a808f13b..9d (computed). The first accept had pinned the commit time 1791969993 at build 225cb4..5a, zip 8f49a9..dc. |
| Rationale | core/test/project-graph.test.ts, the CI jobs and every board build at 315532800, so a golden pinned at another epoch reads stale in the project graph even while hbf parity passes on the epoch its build.json records. |
| Evidence | The gerbers at the two epochs differ only in line 2 (TF.CreationDate) and the drill files are byte equal; report.json and reparse.json are byte equal across the re-accept; hbf parity reference/boards/spindle-r2 passes; project-graph 9 of 9 after the graph fixture rerecord. The old set is kept in `fab-knowledge:evals/2026-10-14/calls/verify/boards/r2-goldens-epoch-1791969993/`. The recheck also added the "Checked by machine" list to the R2 README and spindle-r2's six board metrics to `packages/checks/test/metric-gates/builds.json`. Accepted under owner delegation; no person has accepted it (D-152). |
| Supersedes | the first spindle-r2 accept (build 225cb4..5a, zip 8f49a9..dc) |
| Milestone | M08 |

### D-285 The four owner calls of 2026-10-14 verified independently

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-14. D-274 to D-284 stand after an independent recheck. |
| Rationale | Each call was made by one agent on its own evidence; a second agent reran the evidence before the commit. |
| Evidence | Computed, in `fab-knowledge:evals/2026-10-14/calls/verify.md` and `calls/verify/`: pip-buried-route, an independent script reproduces the symmetric differences to 6 decimals on five moved traces and the new emit is 0 to 8e-7 mm3 from the original; SLUG, two arm64 runs and a linux/amd64 container run give identical results on the 8-trial, 30-trial and mouth58 sets with equal row hashes; boards, every exit-m06-m08 board step behaves as asserted locally; mutants, 7 run rebuild-first, all killed, a host Math.sin in rotZ caught only after the source guard in `packages/sim/test/trig.test.ts`. Gates: tsc on all three configs, lint-voice, lint-authors, tiers, counts, licences; tools tests 386 of 386; hbf parity on all 55 references, one at a time. Renders were looked at by an agent, not a person. Not run: `validate_3mf.py --overlap` and the design sweep (the export gate needs a person at a TTY), `tools/cold-rebuild.mjs`, and the hosted CI jobs before the push. |
| Supersedes | new |
| Milestone | none |

## Calls of release 1, from 2026-10-20

Taken by the agent under the owner delegation of 2026-10-20 for release 1 of plan v9 (`fab-knowledge:plan-v5/PLAN.md` section 6). The owner can reverse any of them.

### D-286 M10-T01 legacy copies stay out of git; the folders commit their README and SHA256SUMS

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The M10-T01 commit holds the ten `designs/<id>/legacy/` folders as their lineage README.md and SHA256SUMS only. The 115 copied files (66 MB, measured, owner slicer saves among them) stay on the owner's disk, named one per line in a `.gitignore` block that `tools/legacy/held.mjs` reads; the canonical copies are in `fab-knowledge:originals/`. Legacy files tracked before stay tracked until their readers move (PLAN.md section 5, rails item R1-rails-public-11). A test that reads a held copy reports not run when the copy is absent. `reference/test/legacy-embedded.test.ts` scans tracked legacy files only, since the notices cover what the repo publishes. |
| Rationale | PLAN.md section 5 moves the legacy copies to the private archive and leaves the history rewrite to the owner; a committed copy stays in public history until that rewrite. Holding the files out is reversible (commit them later); committing them is not. |
| Evidence | `git diff --cached --numstat` lists 0 binary rows after the change (measured). Suites one workspace at a time with the copies present, and the same suites in a worktree built from the commit tree without them, logged in `.hbf-notes/r1/health/` and `.hbf-notes/r1/m10ci/` (computed, 2026-10-20). |
| Supersedes | new |
| Milestone | none |

### D-287 access.pressTargetN tier is inferred, not computed

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The `access.pressTargetN` profile row, 1.47 N, is tier inferred with method derived (R1-flagship-access-switch-01). |
| Rationale | TIERS has no computed tier. The g to N conversion is exact (150 g times 9.80665 m/s2 is 1.471 N, computed), but its input, the owner's 150 g target, is a design target and not a measurement, so the row takes the lowest tier of its inputs. |
| Evidence | `spec/ids.ts` line 217: verified, measured, vendor, community, inferred. `fab-knowledge:plan-v5/old-skills-scenarios.md` line 17 names the 150 g press. |
| Supersedes | new |
| Milestone | none |

### D-288 coin mass at vendor tier from a search excerpt

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `coupon.coinMassG` is 5.0 g at tier vendor, method datasheet, citing the US Mint coin specifications URL. The row source says the value was read through a search excerpt after a direct fetch returned HTTP 403; tolerance unknown. |
| Rationale | The 5.000 g figure appears on several US Mint pages in the excerpt. No page was fetched directly, so the owner can lower the tier or re-read the page. |
| Evidence | Builder WebFetch of the usmint.gov coin specifications and nickel pages: HTTP 403, 2026-10-20 (reported by the builder, not rerun by the integrator). |
| Supersedes | new |
| Milestone | none |

### D-289 pressBandPct ties to modulusSpreadPct

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `access.pressBandPct` is 20 percent, matching `click.modulusSpreadPct`; the row source says so. The band is 1.18 to 1.76 N, or 120 to 180 g (computed). |
| Rationale | The brief gives 20 percent. While the PETG modulus is only a working value (1900 MPa, inferred), a band narrower than the modulus spread could not be held by the drawn point alone. |
| Evidence | `.hbf-notes/r1/briefs/flagship-access-switch.md` scout finding 2: 1500 and 2200 MPa at l 28, t 0.55 give 125 and 183 g (computed). |
| Supersedes | new |
| Milestone | none |

### D-290 no lineage row for profile constants

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The six R1-flagship-access-switch-01 rows in `packages/profile/data/constants.json` add no `lineage.json` row; each row names its source inline. |
| Rationale | No code or file was ported. Existing `click.*` rows cite originals inline without lineage rows. |
| Evidence | `constants.json` `click.rigidSpanMin` source text; `lineage.json` has no profile rows. |
| Supersedes | new |
| Milestone | none |

### D-291 PJ398SM pad tier is community, not vendor

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The `pads` and `dims.body` fields of the `pj398sm` catalog row carry tier community, method listing. |
| Rationale | The footprint is a KiCad library file drawn by the KiCad librarians, not a vendor drawing. The parts audit already gives a KiCad library footprint the tier community, and the catalog data README admits community rows whose source file is committed beside them. |
| Evidence | `packages/catalog/test/parts-audit.test.ts` lines 126 and 155; `packages/catalog/data/README.md` lines 3 to 10. |
| Supersedes | new |
| Milestone | none |

### D-292 No inferred panel-hole field on the PJ398SM row

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The KERF panel-hole radius (r 3.2 mm, inferred) is left out of the `pj398sm` row. The row tier stays community. |
| Rationale | One inferred geometry field would make the whole row tier inferred, because the row tier is its weakest field. The data README admits inferred rows only when a design on record reads them, and no design reads this one yet. The jack seat (item R1-flagship-access-switch-06) can carry the hole size with its own provenance. |
| Evidence | `packages/catalog/src/load.ts` `weakest()` and the row tier; `packages/catalog/data/README.md` lines 8 to 10; `knowledge/designs/kerf-eurorack.md` line 73. |
| Supersedes | new |
| Milestone | none |

### D-293 No pins field on the PJ398SM row; pad names serve as pin names

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The `pj398sm` row has no `pins` field. The pad names S, TN and T come straight from the footprint. |
| Rationale | The v5 mirror has no `.kicad_sym`. A literal pins list needs an integer n, and `catalogPins` joins pins to pads by `String(n)`, so pins numbered 1 to 3 would match no pad named S, TN or T, and the numbering would be invented. |
| Evidence | `packages/catalog/src/load.ts` `checkValue` pins (an integer n is required); `packages/catalog/src/pins.ts` line 47. |
| Supersedes | new |
| Milestone | none |

### D-294 KiCad LICENSE.md committed beside the PJ398SM footprint

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. KiCad LICENSE.md is copied verbatim next to the footprint. Both files join the existing CC-BY-SA-4.0 KiCad row in `tools/licences.json`. A lint-voice exclaim allow row covers line 27 of the licence text. |
| Rationale | CC-BY-SA redistribution asks for the licence documents to travel with the files. Without the new paths the catch-all MIT row would have matched the footprint. The allow row follows the precedent of the verbatim fonts LICENSE text. |
| Evidence | `tools/licences.json` KiCad row (D-090); `tools/lint-voice.allow.json` row for `tools/py/board/fonts/LICENSE-*.txt`. |
| Supersedes | new |
| Milestone | none |

### D-295 Registry module listing order lives in a lib helper

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `tools/gen/registries.mjs` lists its modules through `generatorFiles(readdirSync(dir))` in `tools/gen/lib.mjs`, which keeps `*.mjs` files, skips dotfiles and sorts. The frame does not sort inline. |
| Rationale | On this machine node's `readdirSync` already returns names in byte order, so a frame that drops its own sort passes any end to end order test and the sort mutant could not be killed. Testing a pure helper makes the sort load-bearing in a test. |
| Evidence | A probe on APFS showed `readdirSync` returning 10, 9, B, Z, _x, a, m1, m4, m6 (byte order, measured) while `ls -f` printed another order; the libuv alphasort cause is inferred. The frame-only no-sort mutant left 11 of 11 passing; with the helper, the no-sort mutant gives 1 fail (measured). |
| Supersedes | new |
| Milestone | none |

### D-296 One owner per registry output path; exit 2 for contract errors

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. Two registry modules returning the same output path is an error naming both modules, as is a path outside the root. Exit codes of `tools/gen/registries.mjs`: 0 fresh or written, 1 stale under `--check`, 2 a usage or module contract error. |
| Rationale | With file name order a second writer would silently replace the first module's output; the error keeps one gathered file under one generator. Separate exit codes let CI tell stale output apart from a broken module. |
| Evidence | `tools/gen/registries.mjs` and the contract-errors test in `tools/test/gen-registries.test.mjs`. Disabling the duplicate-owner check fails 1 of 12 tests (measured, integrator mutant). |
| Supersedes | new |
| Milestone | none |

### D-297 A missing registry generator directory is an error, an empty one is not

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. If `<root>/tools/gen/registries` does not exist, the frame exits 2. If it exists with no `.mjs` modules (only README.md), it exits 0. |
| Rationale | A wrong `--root` should never make `--check` pass silently. The brief requires an empty directory to exit 0. |
| Evidence | The empty-registries test in `tools/test/gen-registries.test.mjs` passes; README.md in the directory is ignored because only `.mjs` files load. `node tools/gen/registries.mjs --check` on main prints 0 generators, 0 outputs, exit 0 (measured). |
| Supersedes | new |
| Milestone | none |

### D-298 exportedConst picks the single export, else the one annotated with the type

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `exportedConst(tsText, typeName)` in `tools/gen/lib.mjs` returns the name when the file has exactly one `export const`. Otherwise it returns the one export annotated with `typeName`, and throws when there is none or more than one. |
| Rationale | Brief item 08 says def export names follow no single rule, and most def files call factory functions with no type annotation, so matching only on the type would miss them. |
| Evidence | `packages/mechanisms/src/defs/*.ts`: `export const crankYoke = refusedMechanism({` against `export const capsulePocketRotor: MechanismDef<Values> = {`. |
| Supersedes | new |
| Milestone | none |

### D-299 Stop overtravel read from the profile row inside the archetype

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `packages/archetypes/src/pip/click.ts` reads `profile.constant("click.stopOvertravel").value` to set the curve sample range, `cg` plus overtravel. `ClickCurve` does not carry a `stopMm` field. |
| Rationale | The R1-flagship-access-switch-03 brief names this range. Tier rules stop archetypes from importing `CLICK_RULE_IDS` from sim, so the row id appears as a literal in two places, sim and archetypes. The alternative is a `stopMm` field on `ClickCurve` filled by core. |
| Evidence | `packages/sim/src/fe/click.ts` lines 41 to 45 and 76; `packages/profile/data/constants.json` `click.stopOvertravel` 0.3 mm (inferred tier). |
| Supersedes | new |
| Milestone | none |

### D-300 Click curve samples interpolated linearly between FE load steps

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. Sample i sits at d = stop * i / (n - 1) for n of 2 or more; the single sample of n = 1 sits at the stop. F is interpolated linearly between the two neighbouring SNAPFE load steps, about 0.039 mm apart at PIP defaults (computed). |
| Rationale | The brief asks for equal travel steps. Linear interpolation does not overshoot the original's curve, and the test checks that each sample lies between its two neighbouring steps. |
| Evidence | `packages/archetypes/test/click-curve.test.ts`; `test/legacy/pip-fits.json` `haft.defaults` has 57 points running to d = 2.2 mm. |
| Supersedes | new |
| Milestone | none |

### D-301 Click-spring reference test asserts no curve metric at chase defaults

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The brief's mutant premise did not hold: the click-spring goldens hold hashes, not metric ids, so they cannot see extra metrics. One assertion was added to `reference/buttons/click-spring/test/reference.test.ts`, outside the brief's Writes line: no `.spring.curve.` metric at the chase defaults. |
| Rationale | This makes the brief's done condition hold: the click-spring test now fails under the "default 0 read as 16" mutant. |
| Evidence | The mutant run before the assertion: 4 of 4 passed. After the assertion: 1 of 4 failed. |
| Supersedes | new |
| Milestone | none |

### D-302 Core click-curve test added outside the Writes line

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `core/test/click-curve.test.ts` covers the `pts` fill in `simClickCurve` in `core/src/canon.ts`, checking all 57 load steps against the original's within 1e-5 (computed). |
| Rationale | Tier rules stop archetypes tests from importing sim or core, so the archetype test alone never runs the real solver's `pts`. |
| Evidence | `tools/tiers.mjs` applies its edge rules to test folders as well. |
| Supersedes | new |
| Milestone | none |

### D-303 Lineage fragments are one JSON array per subject, sorted by id on gather

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `lineage/<subject>.json` holds a JSON array of rows in the shape of `tools/lineage.schema.json`. `tools/gen/registries/lineage.mjs` sorts all rows by id when it gathers them into the root `lineage.json` and does not require a fragment to be sorted inside itself. The split wrote each fragment in its current id order. |
| Rationale | Follows the R1-rails-registries-03 brief (lineage stays sorted by id) and keeps `tools/test/lineage.test.mjs` as the schema checker on the gathered file, so each check has one implementation. |
| Evidence | `tools/gen/registries/lineage.mjs`; `git diff --exit-code lineage.json` clean after regeneration; `node tools/gen/registries.mjs --check` exit 0 on merged main (computed, 2026-10-20). |
| Supersedes | new |
| Milestone | none |

### D-304 CLAUDE.md lineage bullet rewrapped over three lines

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The brief scoped the CLAUDE.md edit to line 114. The new wording did not fit that line at the file's wrap width, so lines 114 to 116 of the same bullet were rewrapped (3 insertions, 2 deletions). No other line changed. |
| Rationale | Keeps the file's line width without changing any other rule. |
| Evidence | `git show 4c4c93b -- CLAUDE.md` |
| Supersedes | new |
| Milestone | none |

### D-305 The cross-file duplicate lineage test accepts either refusal

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. While the subject rule holds, two fragments cannot hold the same id. The cross-file test in `tools/test/lineage-fragments.test.mjs` therefore asserts only that gather refuses and names the second file: the subject rule refuses first, and the duplicate rule refuses when the subject rule is removed. The duplicate rule itself is tested with an in-file duplicate. |
| Rationale | The brief asks for a cross-file duplicate test. This keeps the test meaningful without a mutant that only one of the two rules can expose. |
| Evidence | `tools/test/lineage-fragments.test.mjs` tests 5 and 6; deleting the duplicate check line in `tools/gen/registries/lineage.mjs` fails test 5, run by the builder and again by the integrator on merged main (measured, 2026-10-20). |
| Supersedes | new |
| Milestone | none |

### D-306 Counts drift committed in the R1-rails-registries-03 branch

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `node tools/counts.mjs` moved `docs/plan/counts.json` and the PLAN.md Appendix B row because D-295 to D-298 were on main without a counts run. The builder committed both in a separate commit, 0c1010e. PLAN.md is outside the brief's Writes line, but `tools/counts.mjs` writes it; it was not edited by hand. At merge both files conflicted with main's later counts; main's side was taken and `tools/counts.mjs` rerun, with no diff. |
| Rationale | The task says to commit counts.json when it moves, and counts.mjs writes the PLAN.md table in the same run. |
| Evidence | `git show 0c1010e`; merge d379850 |
| Supersedes | new |
| Milestone | none |

### D-307 Thin-wall bound is 1.5 preset line widths, not PIP's fixed 0.6 mm

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `detect_thin_wall` 1 is written in `Metadata/model_settings.config` when the thinnest spring t on a body is under 1.5 times the preset line width (0.63 mm at ffc5p line width 0.42, computed), as the R1-flagship-access-switch-07 brief specifies. The key never goes in project_settings. |
| Rationale | PIP's fit note fires at a fixed C.t < 0.6. A bound tied to line width also holds on the 0.25 nozzle preset, where a 0.55 mm beam is two lines. The two bounds differ only for t between 0.60 and 0.63 mm on the 0.4 nozzle. The Flash Studio 1.7.14 process "0.24mm Standard @FF C5" sets detect_thin_wall 0 and wall_generator classic (vendor), so the preset does not handle sub-line walls itself. Whether Flash Studio honours the key per object is unverified until item 08 slices it. |
| Evidence | `fab-knowledge:originals/pip/files/haft-src/src/model.js` line 540; pip RECORD.md line 350; `packages/profile/data/machines.json` ffc5p_20260819 lineWidth 0.42 (vendor); lineage row `pip.model/haft-9-thin-wall` in `lineage/pip.model.json`; `packages/3mf/test/thin-wall.test.ts`, two mutants killed (builder, computed) |
| Supersedes | new |
| Milestone | none |

### D-308 No line width means no thin-wall row

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. When the writer input carries no `lineWidthMm`, `overridesOf` does not write `detect_thin_wall`, even for a spring part. |
| Rationale | Every physical number comes from profile, so there is no fallback width. The pipeline always passes `preset.lineWidth`, so only hand-built writer inputs skip the row. |
| Evidence | `packages/3mf/src/overrides.ts` `isOneLineBeam`; test 'writes no thin-wall key without a line width to compare against' in `packages/3mf/test/thin-wall.test.ts` |
| Supersedes | new |
| Milestone | none |

### D-309 Rerecorded the click-spring 3mf artifact hash

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. Accepted the new `reference/buttons/click-spring/expected/artifacts.json` 3mf hash (373cfa7c... to d4960e42...). |
| Rationale | Only the package bytes moved, by the one intended `model_settings.config` line. The mesh hashes, volumes, report and edit goldens are equal, so this is not a geometry move. |
| Evidence | hbf parity output: build.json, report.json, edit.json equal; artifacts.json moved on 3mf only; with the write removed the old golden matched; the 3mf entries differ only by `<metadata key="detect_thin_wall" value="1"/>` (builder, computed). Integrator rerun on the merged tree: `npx vitest run reference/buttons/click-spring` 4 passed |
| Supersedes | new |
| Milestone | none |

### D-310 Spring thickness and line width carried through the writer input

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. Added optional `WriterPart.springTMm`, `BodyEntry.springTMm`, and `lineWidthMm` on `ThreeMfInput`, `BuildConfig` and `CardInput`. The pipeline fills them from spring features (a feature without a body falls back to the part's first body) and from `preset.lineWidth`; the print card lists the key. |
| Rationale | The writer had no feature data apart from conductor width, so a row in overrides.ts alone could never fire on a real build. This follows the existing widthMm pattern. |
| Evidence | `packages/pipeline/src/build.ts` threeMfInput; `packages/3mf/src/writer/index.ts` configOf; `npx tsc -b` exit 0 on the merged tree |
| Supersedes | new |
| Milestone | none |

### D-311 The access-switch paddle skirt is the hard stop

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. In `reference/keys/access-switch`, at rest the paddle skirt edge sits over the body top by contact travel plus `click.stopOvertravel`, snapped down a layer (1.56 mm, computed). The skirt bottoming on the body top is the end stop, so travel never passes the point where eStop is read. |
| Rationale | This keeps beam strain inside the 1.67 percent computed at the stop, with no new number. The R1-flagship-access-switch-02 brief did not name a stop. |
| Evidence | `reference/keys/access-switch/build.ts`; metric paddle.travel 1.56 mm (computed); the reference test asserts contact < travel <= contact + 0.3 mm. |
| Supersedes | new |
| Milestone | none |

### D-312 Access-switch rim and paddle sizes come from existing numbers

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. Rim top is the cap top snapped up a layer. Plate thickness and skirt thickness both equal the body wall param. Boss radius is the cap stem radius, read from the archetype cap body. Every paddle face snaps to a layer top. A paddle H too short for the skirt to outreach the plate and rim is raised, with a CLAMP warning. |
| Rationale | No new physical constants are typed. Off-layer faces would shift the stop by up to half a layer. |
| Evidence | `reference/keys/access-switch/build.ts`; README section Body and paddle; CHK-PRT-02 passes at 0.0146 mm band overlap (computed). |
| Supersedes | new |
| Milestone | none |

### D-313 Access-switch body uses the stack route with two bands

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The access-switch body is a stack route: a disc band and a rim band overlapping by the middle of `stack.bandOverlap`. A csg union of prisms was tried first and dropped. |
| Rationale | circuit path1d `bodyOutline` reads only prism or stack bases in the M-S slice; the csg body failed with E_SCHEMA. |
| Evidence | `packages/circuit/src/path1d.ts` line 191; the builder's first parity attempt error. |
| Supersedes | new |
| Milestone | none |

### D-314 No bezel plate on the access switch

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. Following `reference/buttons/click-spring`, the access switch has no PIP bezel. The ribs and slot locate the spring end blocks, and nothing holds them down. |
| Rationale | Keeps item R1-flagship-access-switch-02 to its brief. A bezel is a separate printed part the brief does not name. |
| Evidence | README section Deviations of `reference/keys/access-switch`; archetype fits row "under the bezel 0.12". |
| Supersedes | new |
| Milestone | none |

### D-315 Access-switch parity edit golden moves paddle D

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `reference/keys/access-switch/expected/edit.json` was written by hand once: pointer `/params/1/fields/0/default`, from 56 to 60. |
| Rationale | No chase param carries a constraintDim, so parity has no default edit to make. |
| Evidence | `core/src/commands/parity.ts` defaultEdit; edit.json metricDelta layout.diameter 4 mm and paddle.massG 1.873 g (computed). |
| Supersedes | new |
| Milestone | none |

### D-316 Access-switch paddle preload reported, not subtracted

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. paddle.massG is 15.926 g solid (computed). The README gives about 0.156 N at standard gravity (computed). No preload metric in N is emitted, because no gravity profile row exists. |
| Rationale | The brief says to report the preload and never subtract it silently. Typing standard gravity into build.ts would be an unprofiled number. |
| Evidence | `reference/keys/access-switch/build.ts` metrics; a search for gravity in `packages/profile/data` returned only a source string (builder). |
| Supersedes | new |
| Milestone | none |

### D-317 Rerecorded the access-switch 3mf artifact hash

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. At the merge of R1-flagship-access-switch-02, accepted the new `reference/keys/access-switch/expected/artifacts.json` 3mf hash (c822edc8... to 504f54c8...), and rerecorded `packages/project/test/fixtures/graph.jsonl` with 21 access-switch lines added and none removed. |
| Rationale | The branch recorded its goldens before main gained the detect_thin_wall object row (D-307). Its spring t 0.55 mm is under the 0.63 mm bound (computed), so only the package bytes move, by one `model_settings.config` line. The mesh, build, report and edit goldens are equal, so this is not a geometry move. |
| Evidence | Package members of the branch tip and the merged tree, read in memory: only `Metadata/model_settings.config` differs, by `<metadata key="detect_thin_wall" value="1"/>`; `3D/3dmodel.model` is byte-equal (computed). hbf parity: build.json, report.json, edit.json equal. `npx vitest run reference/keys/access-switch` 6 passed; core/test/project-graph.test.ts 11 passed. |
| Supersedes | new |
| Milestone | none |

### D-318 The solver hint names registerSolvers in archetypes

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. R1-designs-reach-03 edits `packages/archetypes/src/solvers.ts`, outside the brief's Writes line: the header comment, the `provideClickSolver` doc and the `E_KERNEL` hint now name `registerSolvers` from `@hackbuild/pipeline`, so a missing registration names the registrar. |
| Rationale | The done condition asks the mutant to fail with `E_KERNEL` naming the registrar. The old hint sent callers through core, which is wrong for a baked page. |
| Evidence | With the `registerSolvers()` call removed from `packages/pipeline/src/page.ts`, `packages/pipeline/test/page-click.test.ts` failed with `E_KERNEL /solvers/click no click-spring solver is registered; call registerSolvers from @hackbuild/pipeline (core and createPageBuild call it) before the archetype` (measured, builder run); restored, it passed. Merge commit of `r1/R1-designs-reach-03`. |
| Supersedes | new |
| Milestone | none |

### D-319 Page click test reads goldens instead of an in-process core build

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `packages/pipeline/test/page-click.test.ts` builds `reference/buttons/click-spring` through `createPageBuild` in a child process and compares it to the committed `expected/build.json` (buildHash and every mesh hash) and to the legacy record `packages/archetypes/test/legacy/pip-fits.json` (peak, drop, contact travel, cg and stop strain to 6 places, bistable, the CHK-KEY-04 gates, all 11 click fits rows). It does not run core's `buildPart` in the same process. |
| Rationale | Importing core registers the solver at load and would hide the mutant, and `tools/tiers.json` forbids pipeline tests from importing core. A child-process core build returns no metrics (`part.build --json` has none). |
| Evidence | `node core/bin/hbf.mjs part.build reference/buttons/click-spring --json` gave buildHash `9be09937ffda67074dc73115cecbdf103ad8402f9e1f757ce614b4d14e70b977`, equal to `expected/build.json` (measured, builder run). `npx vitest run packages/pipeline` on the merged tree: 3 passed (measured). |
| Supersedes | new |
| Milestone | none |

### D-320 registerSolvers is once-only

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `registerSolvers` in `packages/pipeline/src/solvers.ts` sets a module flag, so repeat calls do nothing. A test that later calls `provideClickSolver` directly still replaces the solver. |
| Rationale | The brief asks for an idempotent registration, and the archetype parity tests inject a legacy curve through `provideClickSolver`. |
| Evidence | `npx vitest run packages/archetypes` on the merged tree: 19 files, 198 tests passed (measured). |
| Supersedes | new |
| Milestone | none |

### D-321 Fix main's stale lineage fragment in this branch

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The R1-rails-registries-04 branch appended the row `pip.model/haft-9-thin-wall`, unchanged, to `lineage/pip.model.json` so `node tools/gen/registries.mjs --check` passes; root `lineage.json` is unchanged. Main had landed the same row in 0627158 before the merge, so the merge held it twice; the integrator restored main's fragment in ee48dd0 and one copy stands. |
| Rationale | The brief's done condition needs `--check` to exit 0. The R1-flagship-access-switch-07 merge wrote the row straight into root `lineage.json` after the switch to fragments, so regenerating would have deleted the row. |
| Evidence | On bc3a9d1, `node tools/gen/registries.mjs` removed 10 lines (that row) from `lineage.json` (measured by the builder). After the merge `--check` refused the duplicate id; the two rows were byte-identical (computed); after ee48dd0 it reports 2 generators, 3 outputs, all fresh (measured). |
| Supersedes | new |
| Milestone | none |

### D-322 Pack the CHECK_MODULES array to 80 columns

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The generated `packages/checks/src/defs/index.ts` packs the `CHECK_MODULES` names to 80 columns with a two-space indent, replacing the old uneven hand wrapping. |
| Rationale | Same output on every run with no hand edits; the brief allowed a change only in line wrapping. |
| Evidence | `git diff` of `packages/checks/src/defs/index.ts` changes no import line, only the array lines and two header lines saying it is generated (measured). |
| Supersedes | new |
| Milestone | none |

### D-323 Generated check index refuses a module outside its family directory

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `tools/gen/registries/checks.mjs` refuses a check module filed outside its family directory, such as `defs/net/CHK-BRD-01.ts`, by name, with no guess about where it belongs. |
| Rationale | All 158 modules follow the rule today (measured), and the variable name comes from the file name. |
| Evidence | `tools/test/checks-fragments.test.mjs` test "a module outside its family directory is refused" passes on main after the merge (measured). |
| Supersedes | new |
| Milestone | none |

### D-324 CI small jobs merged into build and bake

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. typecheck, derived, tiers, contract, seed, property and vtracer-eval are now named steps of one `build` job in `.github/workflows/ci.yml`. ui-css and size are now steps at the end of `bake`. house-rules, cold, determinism and bake-determinism stay separate. 23 job keys become 15. |
| Rationale | PLAN.md 6 release 1 rails asks for CI as one build job with merged small jobs. These nine jobs each repeated checkout, setup-node, npm ci and mostly tsc -b to run a short check. |
| Evidence | Run 38667622976 on 13856c3: 5772 runner seconds (measured). Job seconds: typecheck 57, derived 50, tiers 12, contract 51, seed 43, property 44, vtracer-eval 46, ui-css 28, size 5 (measured). Branch protection on main returns 404, so no required check breaks (measured). The merged workflow has not run on GitHub; its runner seconds are unknown. |
| Supersedes | new |
| Milestone | none |

### D-325 Build steps guarded on install success

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. Each `build` step after the first check uses `if: ${{ !cancelled() && steps.install.outcome == 'success' }}` in place of a plain `!cancelled()`. |
| Rationale | A plain `!cancelled()` runs every step after a failed `npm ci` and shows a dozen red steps from one cause. The guard keeps one red check from hiding the rest, and skips everything when the install fails. |
| Evidence | `.github/scripts/ci-workflow.test.mjs` test "every build check after the first reports even when one before it failed" passes on main after the merge (measured). |
| Supersedes | new |
| Milestone | none |

### D-326 CI job count is 15, not 14

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `.github/scripts/ci-workflow.test.mjs` pins the 15 job names the item lists, in order. The item text's count of 14 was a miscount. |
| Rationale | 23 jobs minus 9 merged plus 1 new build job is 15, and the item's own list has 15 names. |
| Evidence | A yaml parse of `.github/workflows/ci.yml` prints 15 job keys (measured). |
| Supersedes | new |
| Milestone | none |

### D-327 A ui-css or size failure now blocks browser

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. ui-css and size run inside `bake`, so either one failing fails bake, and `browser` (needs bake) is skipped. The bake upload still runs under `!cancelled()`. |
| Rationale | This follows from the merge in D-324. It is accepted because both are hard gates on the bake. |
| Evidence | `.github/scripts/ci-workflow.test.mjs` test that bake runs bake:all before ui-css and size, and both before the upload, passes on main after the merge (measured). |
| Supersedes | new |
| Milestone | none |

### D-328 Gap marker lines count toward the 150-line cap

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `reduce()` in `tools/agent-hooks/quiet-output.mjs` (R1-rails-ci-hooks-05) writes a `[n lines omitted]` line at each gap, and these lines count within the 150-line cap. When the failure context overflows, the earliest failures stay and the last 15 lines are always kept. |
| Rationale | Without a marker, lines from far-apart parts of the log would sit next to each other and look continuous. Keeping the end of the log keeps the summary the brief requires. |
| Evidence | `tools/test/agent-hooks-quiet.test.mjs`: the tsc 40-error test asserts at most 150 lines, that the first error and the Found line are kept, and that an omitted marker is present. Mutant CAP = 1500 fails that test (measured, 2026-10-20). |
| Supersedes | new |
| Milestone | none |

### D-329 Quiet-output markers are case-sensitive and match anywhere in the line

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. FAILURE and SUMMARY in `tools/agent-hooks/quiet-output.mjs` are the brief's literal lists, case-sensitive. Pytest's `E   ` is anchored to the start of the line. The U+00D7 sign matches anywhere in a line. |
| Rationale | This follows the brief word for word. `Failed Tests` with a capital F is not a marker, but the FAIL lines that follow it are. |
| Evidence | The marker-per-line test in `tools/test/agent-hooks-quiet.test.mjs` covers each FAILURE entry; deleting `/FAIL/` fails 2 tests (measured by the builder). |
| Supersedes | new |
| Milestone | none |

### D-330 Quiet-output passes through when no git repo is found

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. When `git rev-parse` fails for the cwd, the hook prints nothing and does not rewrite the output. |
| Rationale | With nowhere to write the full log, a rewrite would hide output. |
| Evidence | `handle()` in `tools/agent-hooks/quiet-output.mjs` returns null when `repoRoot()` is null. |
| Supersedes | new |
| Milestone | none |

### D-331 Quiet-output keeps the brief's command regex as written

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. COMMAND in `tools/agent-hooks/quiet-output.mjs` is the brief's regex unchanged. Because of word boundaries it also matches commands like `cat vitest.config.ts`. |
| Rationale | The match only becomes a rewrite when the output is longer than 80 lines and has failure or summary markers, so a false match does little harm. |
| Evidence | The command filter test in `tools/test/agent-hooks-quiet.test.mjs` uses `cat README.md` as its non-match. |
| Supersedes | new |
| Milestone | none |

### D-332 Graph fixture rerecorded although access-switch's own build hash moved

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `packages/project/test/fixtures/graph.jsonl` was rerecorded with HBF_ACCEPT_GRAPH=1 for R1-flagship-access-switch-04, though the task text allows a rerecord only when no build hash moved. Accepted at merge because no mesh hash or volume moved. |
| Rationale | The brief requires new metrics in `reference/keys/access-switch/build.ts`. That moves defHash, and through it the buildHash, without moving geometry. Leaving the fixture stale would leave packages/project red on merge. The rerecord touches only access-switch lines. |
| Evidence | meshHashes and volumes in `reference/keys/access-switch/expected/build.json` equal before and after (computed, compared by script at merge); the graph diff is 20 lines changed, all access-switch; packages/project 15 tests pass on main after the merge (measured). |
| Supersedes | new |
| Milestone | none |

### D-333 Modulus corners use plus or minus 20 percent of the profile E, not the scout's 1500 and 2200 MPa

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The press claim's E corners are 1520 and 2280 MPa, from the profile row click.modulusSpreadPct, as the brief says. |
| Rationale | The profile row is the source of record. The scout's 1500 and 2200 MPa are not symmetric about 1900 MPa. |
| Evidence | `reference/keys/access-switch/README.md` generated block: E minus 127 g, E plus 190 g (computed); scout values 125 and 183 g (computed). |
| Supersedes | new |
| Milestone | none |

### D-334 Press claim tier typed as a spec Qualifier

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. PressClaim.tier in `reference/keys/access-switch/claim.ts` is a spec Qualifier (measured, computed, vendor, inferred, unknown), not a profile Tier. |
| Rationale | The brief's mutant sets the tier to computed. The profile Tier union has no computed, so that mutant would fail tsc, not the test. |
| Evidence | The first mutant run stopped at tsc TS2322; after the type change the named test in `reference/keys/access-switch/test/claim.test.ts` fails as the brief asks (measured by the builder). |
| Supersedes | new |
| Milestone | none |

### D-335 No lineage row for the access-switch press claim

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `reference/keys/access-switch/claim.ts` gets no lineage row. |
| Rationale | claim.ts ports nothing from an original. The band logic is new, and the sim functions it calls already carry lineage (pip.layout/haft-9). |
| Evidence | The header of `packages/sim/src/fe/click.ts` cites lineage row pip.layout/haft-9. |
| Supersedes | new |
| Milestone | none |

### D-336 Coupon declares the switch's four material slots

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `reference/keys/access-switch/coupon/chase.ts` declares petg 1, cpla 2, tpu95 3 and ctpu 4, but only slots 1 and 3 carry bodies (R1-flagship-access-switch-10). |
| Rationale | `placeArchetype` refuses a placement unless every slot the archetype uses is declared, so a two-slot chase cannot place click-spring-key. The brief's same four slots fits this. |
| Evidence | check.run with only slots 1 and 3 failed with E_SCHEMA 'add a conductor slot of cpla to the chase materials; click-spring-key needs it' (`packages/archetypes/src/pip/place.ts` line 67, builder run). |
| Supersedes | new |
| Milestone | none |

### D-337 Coupon tips print in TPU 95A, conductors dropped

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The coupon `build.ts` remaps each ctpu tip body to tpu95 (slot 3, role flex) and filters out conductor, port and pad features and the R readouts. |
| Rationale | The brief says force only, printed in PETG and TPU. Keeping the tip as a soft stop holds the spring's travel geometry the same as the switch's. |
| Evidence | `reference/keys/access-switch/coupon/test/reference.test.ts` asserts the body materials are only petg and tpu95 and that no conductor, port or pad features remain; passes on main after the merge. |
| Supersedes | new |
| Milestone | none |

### D-338 Coupon rung marked by debossed bars, not digits

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. Cell N carries N bars (0.6 x 2.6 mm, 0.48 mm deep snapped to a layer, ported from PIP coupon.js lines 37, 163 and 165); the chase help text maps bars to beams. |
| Rationale | No feature route debosses text on an FDM face (inlay is multi-colour art), and the PIP stroke font (font.js) has no 0, 5 or 6 glyphs. Drawing new glyphs would be reinventing. |
| Evidence | font.js glyph table lines 7 to 26; the spec feature kinds list no FDM engrave kind; lineage rows in `lineage/pip.coupon.json` and `lineage/pip.font.json`. |
| Supersedes | new |
| Milestone | none |

### D-339 Coupon frame takes per-cell host heights

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. Each coupon cell asks the archetype for its own host top, and the frame is one block per cell to that height on a tie plate, rather than one shared top. |
| Rationale | Each rung then sits in the frame exactly as the switch would at that beam, and the build needs no second archetype call to probe the tallest need. |
| Evidence | host.top 13.20, 13.68 and 13.92 mm; frame 49.08 x 79.58 mm (computed, committed `expected/build.json`). |
| Supersedes | new |
| Milestone | none |

### D-340 Coupon cup shape and the coins metric

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The cup is a loose PETG revolve with a cone socket at profile overhang.maxDeg plus half of access.paddleGuideClr as clearance. Its inside diameter is a chase param (24 mm default) because no coin diameter row exists in profile. rung.N.coins is peak g over coupon.coinMassG as the brief defines it; cup.massG is reported separately and not subtracted. |
| Rationale | Self-centring with no support and no physical number typed in. Preload is reported, never subtracted silently (brief 02 rule). |
| Evidence | cup.massG 6.287 g, 1.26 coins (computed); mesh volume 4942.65 mm3 at 1.27 g/cm3 gives 6.277 g (computed, 64-segment faceting); cup.lift 4.736 mm, more than every rung's contact travel (test). |
| Supersedes | new |
| Milestone | none |

### D-341 Coupon nested under the switch directory

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The coupon lives at `reference/keys/access-switch/coupon` as the brief names, with its own entry in root `tsconfig.json`. |
| Rationale | The brief's Files line. The cost is that the depth-2 reference walkers (metric-gates builds.json, project graph) do not list it, so those suites do not cover the coupon. |
| Evidence | `packages/checks/test/metric-gates.test.ts` chases() reads reference/<area>/<id> only; `npx tsc -b` exit 0 on main after the merge type-checks the coupon. |
| Supersedes | new |
| Milestone | none |

### D-342 touched hook calls the tsc bin directly instead of npx --no-install

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The touched-package type check hook (`tools/agent-hooks/touched-typecheck.mjs`, item R1-rails-ci-hooks-06) runs `node <root>/node_modules/.bin/tsc` and falls back to the tsc bin next to the hook script. The item brief said `npx --no-install tsc`. |
| Rationale | It avoids npx start-up time on every edit, and it lets the hook check a project in a directory with no node_modules, which the scratch-project test needs. |
| Evidence | `commandFor` in `tools/agent-hooks/touched-typecheck.mjs`. A clean run on an edit of `packages/geom/src/index.ts` took 0.34 s (measured by the builder). `node --test tools/test/agent-hooks-touched.test.mjs`: 11 pass on merged main (measured). |
| Supersedes | new |
| Milestone | none |

### D-343 projectFor ignores files that are not TypeScript

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. In `tools/agent-hooks/touched.mjs`, only .ts, .tsx, .mts, .cts and tsconfig*.json files map to a build, tests or tools check, and .vue maps to vue. Every other file, such as a README or a .mjs test, gives null and starts no check. |
| Rationale | A README or fixture edit inside a package should not start a tsc run. The item brief's README.md case expects null. |
| Evidence | The `CHECKED` regex in `tools/agent-hooks/touched.mjs`. A manual run on `tools/test/settings.test.mjs` printed nothing in 0.07 s (measured by the builder). |
| Supersedes | new |
| Milestone | none |

### D-344 touched hook accepts MultiEdit and resolves symlinks

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The touched-package type check hook acts on Edit, Write and MultiEdit. The edited path is resolved through symlinks before it is made relative to the git root. |
| Rationale | `git rev-parse --show-toplevel` prints the resolved path (/private/var on macOS). Without resolving symlinks, temp-dir and symlinked worktrees would map to null. |
| Evidence | The worktree-copy test and the hook spawn test in `tools/test/agent-hooks-touched.test.mjs` use `realpathSync(mkdtemp)` under /var/folders; 11 pass on merged main (measured). |
| Supersedes | new |
| Milestone | none |

### D-345 derived split into derived and derived:counts

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The `derived` script runs only `node tools/gen/registries.mjs --check`. A new `derived:counts` script runs `node tools/counts.mjs` and then `git diff --exit-code` on `docs/plan/counts.json` and `docs/plan/PLAN.md`, for the integrator after each merge and for CI on main. |
| Rationale | Builder branches stop failing on counts drift that only the integrator can fix, since decisions land on main after each merge. |
| Evidence | `package.json` scripts in commit 39491f1, merged to main; `node tools/gen/registries.mjs --check` reports 2 generators, 3 outputs, all fresh on merged main (measured). CI wiring for `derived:counts` is not changed yet. |
| Supersedes | new |
| Milestone | none |

### D-346 Builder branches do not regenerate counts.json

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. Builder branches skip `node tools/counts.mjs` and never commit `docs/plan/counts.json` or PLAN.md Appendix B, even where the generic done list asks for it. The integrator regenerates both after each merge and with each decision commit. Package tests compute their counts from the sources they already load, and the D-010 cross-check lives in `tools/test/counts.test.mjs`. |
| Rationale | One writer for the generated counts removes the drift conflicts between parallel branches (see D-306). |
| Evidence | `tools/counts.mjs` header lines 5 to 10 in commit 39491f1; `git grep counts.json packages/` has no hits; `node --test tools/test/counts.test.mjs` 9 pass, 0 fail on merged main (measured). |
| Supersedes | new |
| Milestone | none |

### D-347 actions/cache major v5 in ci

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `.github/workflows/ci.yml` uses `actions/cache@v5` and `actions/cache/restore@v5`, and the version floor in `.github/scripts/ci-workflow.test.mjs` sets cache to 5. The brief named v4 as the node24 floor; this call reads that as wrong. |
| Rationale | The repo already pins the node24 majors of the other actions (checkout and setup-node v7, upload-artifact v7). That v4 of actions/cache runs on node20 is inferred by the builder, not checked against the vendor release notes. |
| Evidence | `.github/scripts/ci-workflow.test.mjs` floor map; the `uses:` lines of `ci.yml`; 16 of 16 workflow tests pass (measured, 2026-10-20). No CI run was pushed, so the major is not checked on a runner. |
| Supersedes | new |
| Milestone | none |

### D-348 separate browser folder for Python Playwright in parity

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. Python Playwright in the parity job installs into `${{ runner.temp }}/ms-playwright-py` through PLAYWRIGHT_BROWSERS_PATH, with its own cache key `pw-py-<os>-<hash of tools/py/uv.lock>-chromium`, apart from the Node Playwright cache in `~/.cache/ms-playwright`. |
| Rationale | Node and Python Playwright both default to `~/.cache/ms-playwright` and may pin different chromium builds, so two cache entries on one path would each save both browsers. runner.temp is used because `~` is not expanded in an env value. |
| Evidence | The parity steps in `.github/workflows/ci.yml` (step id pwpy and the M03 browser rows step); the workflow test that every Playwright cache id is read by a later cache-hit check (measured pass, 2026-10-20). |
| Supersedes | new |
| Milestone | none |

### D-349 uv cache on in every setup-uv, cold and determinism included

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. Every setup-uv step in `.github/workflows/ci.yml` sets `enable-cache: true` with `cache-dependency-glob: tools/py/uv.lock`, the cold job and the determinism legs included. |
| Rationale | The brief asks for every setup-uv. The uv cache holds downloaded Python packages only, never built project output, so cold and determinism still build from nothing. |
| Evidence | Brief R1-rails-ci-hooks-02 step 1; the workflow test 'every setup-uv caches on the uv lock' (measured pass, 2026-10-20). |
| Supersedes | new |
| Milestone | none |

### D-350 no build cache in determinism, browser cache allowed

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. Brief step 4 ('no cache step in determinism') is read as build output only. The workflow test forbids every cache step in cold and bake-determinism, and lets determinism hold the Playwright browser cache on its browser legs and nothing else. |
| Rationale | Brief step 2 asks for a Playwright cache in the determinism browser legs while step 4 forbids a cache step there; the two hold together only if step 4 means build output, which is what a determinism run must rebuild. |
| Evidence | Brief R1-rails-ci-hooks-02 steps 2 and 4; the workflow test that cold and bake-determinism have no cache step and determinism caches browsers only (measured pass, 2026-10-20). |
| Supersedes | new |
| Milestone | none |

### D-351 stop hook block counts kept in a separate file

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The stop hook's per-failure block counter lives in `.hbf/agent-hooks/<session>.stop.json`, not as a `blocks` key in the touched record that item R1-rails-ci-hooks-06 writes. |
| Rationale | `tools/agent-hooks/touched.mjs` recordTouched rewrites the record with only files and workspaces on every edit. A counter stored there would be wiped whenever the agent edits between stops, and the two-rounds rule would never trigger. |
| Evidence | recordTouched builds `rec = {files, workspaces}` and writes only those keys. `tools/test/agent-hooks-stop.test.mjs` red-workspace case blocks, blocks, then allows with the two-rounds line; with the counter disabled the third stop blocks and the case fails (measured, builder). |
| Supersedes | new |
| Milestone | none |

### D-352 stop hook finds state roots through git worktree list

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The fallback to roots recorded in the state file is done by searching every worktree git lists for the root of the input cwd and of `CLAUDE_PROJECT_DIR`. |
| Rationale | The item 06 record stores no roots, and an edit in a worktree is recorded in that worktree while the session cwd can be the main checkout. |
| Evidence | The case "a record in a worktree is found from the start root" in `tools/test/agent-hooks-stop.test.mjs` passes (measured, 2026-10-20). |
| Supersedes | new |
| Milestone | none |

### D-353 stop hook budget overrun clears the touched record

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. A stop run with no failure clears files and workspaces from the touched record even when some workspaces ran out of the `HBF_STOP_BUDGET_S` budget (default 300 s). Those workspaces are named once as not run and then left to CI. |
| Rationale | Keeping them would charge every later stop the full 300 s again. |
| Evidence | core through the hook took 300 s and was reported as "not run: core" at load average 97 to 126 (measured, builder, shared machine). |
| Supersedes | new |
| Milestone | none |

### D-354 stop hook round count resets on a non-continuation stop

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. When `stop_hook_active` is false, the stop hook resets its block counts before counting. |
| Rationale | A new user turn starts a new two-rounds window, per PLAN.md section 7 rule 1. |
| Evidence | The red-workspace case in `tools/test/agent-hooks-stop.test.mjs` runs the first stop with false, then true, then true, and passes (measured, 2026-10-20). |
| Supersedes | new |
| Milestone | none |

### D-355 allowed stop notes carry systemMessage and additionalContext

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. An allowed stop with notes emits both `systemMessage` and `hookSpecificOutput.additionalContext`, with `hookEventName` Stop or SubagentStop. |
| Rationale | The brief asks for additionalContext. Whether Stop accepts hookSpecificOutput is unknown, so systemMessage makes sure the person sees the note either way. |
| Evidence | Brief step 3 and the hooks docs as quoted in the brief facts. The hook has not run inside a live session; wiring is item R1-rails-ci-hooks-08 (not run). |
| Supersedes | new |
| Milestone | none |

### D-356 stop hook resolves tool binaries directly, not through npx

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The stop hook runs `node_modules/vitest/vitest.mjs` and `tools/lint-voice.mjs` from the checked root, falling back to the copies beside the hook, in place of `npx --no-install`. |
| Rationale | This matches item 06's tscBin pattern and avoids npx startup cost. |
| Evidence | `tools/agent-hooks/touched-typecheck.mjs` tscBin. |
| Supersedes | new |
| Milestone | none |

### D-357 lineage row for shells.ts from DAVIT finalize

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `lineage/mesh.shells.json` is a canonical row whose source is `fab-knowledge:originals/davit/files/src/parts_r4.py` (sha256 ddae2111..., matching the originals SHA256SUMS), lines 328 to 333, with dest `packages/mesh/src/shells.ts`. The brief's Writes line did not list this file. |
| Rationale | D-222 asks for the canonical lineage row in the same change as a port. DAVIT finalize splits a mesh into trimesh bodies by face adjacency and counts the real ones, the closest original to this split; the void grouping is new. |
| Evidence | `parts_r4.py` line 329: `bodies=[b for b in m.split(only_watertight=False) if b.volume>1.0]`. `npm run registries -- --check` and `node --test tools/test/lineage.test.mjs` pass on the merged tree (computed, 2026-10-20). |
| Supersedes | new |
| Milestone | none |

### D-358 zero-volume shell components count as voids

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. In `shellGroups`, a component is an outer shell only when its signed volume is above 0. A component at 0 or below goes through void assignment, and the group's voids count includes it. |
| Rationale | An open sheet with a volume near zero should not host real voids. A caller can refuse a group whose volume is not positive. |
| Evidence | `packages/mesh/src/shells.ts`, the outers filter `s.volume > 0`. |
| Supersedes | new |
| Milestone | none |

### D-359 ShellGroup.shells counts the outer shell

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `ShellGroup.shells` is the number of closed components in the group, outer included: a hollow cube gives shells 2, voids 1, and an orphan void group gives shells 1, voids 1. |
| Rationale | The brief named the fields but not this convention. Counting every component lets a caller read both numbers without arithmetic. |
| Evidence | `packages/mesh/test/shells.test.ts`, the summary expectations. |
| Supersedes | new |
| Milestone | none |

### D-360 shell parity ray uses fixed slopes sqrt2/7 and pi/11

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The void containment parity ray in `shellGroups` is `[1, SQRT2/7, PI/11]` from the void's first-use vertex. A test pins the case where a pure +x ray fails: manifold-3d 3.5.4 splits a cube's x = 10 face along y + z = 10 (computed, read from getMesh). |
| Rationale | A ray grazing a shared face diagonal counts twice and calls a held void outside. The fixed slopes make the result deterministic. |
| Evidence | `shells.test.ts` case "keeps a void whose ray from its first vertex meets the outer face diagonal"; the builder's mutant with a pure +x ray failed that case (computed, 2026-10-20). |
| Supersedes | new |
| Milestone | none |

### D-361 hook-script scan covers every .mjs in tools/agent-hooks

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The permissionDecision check in `tools/test/settings.test.mjs` reads every top-level `.mjs` in `tools/agent-hooks/`, including `touched.mjs`, beyond the three scripts named in `.claude/settings.json`. |
| Rationale | A helper the hooks import could also return a permission decision; scanning the folder covers that and any hook added later. |
| Evidence | `settings.test.mjs` test "no hook script approves a call"; the builder's mutant appending a permissionDecision allow comment to `quiet-output.mjs` failed it (measured, 2026-10-20). |
| Supersedes | new |
| Milestone | none |

### D-362 CLAUDE.md hooks line added over the 200 line cap

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. R1-rails-ci-hooks-08 adds the one line its brief asks for to the end of Verification lessons in `CLAUDE.md`, naming the three hooks and the `.hbf/agent-hooks/` state and log folder, which takes the file from 214 to 215 lines. |
| Rationale | The file was already over the D-003 cap before this change. The brief asks for exactly one line, and trimming other text is outside the item's writes. The cap breach stays open for a later trim. |
| Evidence | `wc -l CLAUDE.md`: 214 at main 38d666f, 215 after (measured). |
| Supersedes | new |
| Milestone | none |

### D-363 hooks check also rejects export_run

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The export check in `tools/test/settings.test.mjs` rejects a hook entry that names `export_run` as well as `export.run`. |
| Rationale | The ask list names `mcp__hbf__export_run`, so a hook could reach the export by that name too. The export gate stays person-only. |
| Evidence | `settings.test.mjs` test "no hook entry names export.run" (passes, measured, 2026-10-20). |
| Supersedes | new |
| Milestone | none |

### D-364 kernel tests join the root run instead of a root test.projects split

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. Add `kernel/test/**/*.test.ts` to the root vitest include and to `TEST_FILE` in `.github/scripts/owner-files.mjs`, and add `kernel` to the exit-a vitest filters. No vitest `test.projects`. |
| Rationale | Only one file was missing from the root set, and it has no config of its own. An include line is the smallest change that makes the root set a superset of the workspace sets. |
| Evidence | `tools/ci/test-sets.mjs` before the change reported only in workspaces 1 (`kernel/test/author.test.ts`) and exited 1 (measured by the builder); on merged main it reports workspace files 312, root files 347, only in workspaces 0, and exits 0 (measured, 2026-10-20). |
| Supersedes | new |
| Milestone | none |

### D-365 three packages/ui test files now run only under the node environment

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. Accept that `page-bench`, `range` and `steps` in `packages/ui/test/` run in exit-a under node, where the workspace loop ran them under happy-dom. No `@vitest-environment` comment and no project split. |
| Rationale | None of the three touches the DOM; they import `node:fs` or pure modules. The browser job still runs `range` under the ui config (`npm test -w packages/ui -- range`). `tools/ci/test-sets.mjs` prints them under environment differs so the gap stays visible. |
| Evidence | A grep found no `document`, `window` or `mount` in the three files (builder). The three run from the root config on merged main: 3 files, 12 tests pass (measured, 2026-10-20). |
| Supersedes | new |
| Milestone | none |

### D-366 unit keeps setup-uv and loses its owner-files report step

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The `unit` job no longer prints the owner-files not-run list, since it runs no vitest. `setup-uv` stays, and `SPAWNS_UV` in `.github/scripts/ci-workflow.test.mjs` points `unit` at its `node --test` step. |
| Rationale | `tools/test/pytest.test.mjs` spawns uv. The not-run report belongs to the job that applies the excludes, which is exit-a. |
| Evidence | `tools/test/pytest.test.mjs` line 14 calls `spawnSync("uv", ...)`. `node --test .github/scripts/ci-workflow.test.mjs` passes 16 of 16 on merged main, and fails 1 of 16 with an `npm test --workspaces` step put back into unit (measured, 2026-10-20). |
| Supersedes | new |
| Milestone | none |

### D-367 worstOverlap builds every group's Manifold before the bounds prefilter

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `worstOverlap` in `packages/mesh/src/overlap.ts` builds a Manifold for every group first, so a group the kernel refuses throws E_KERNEL with path `groups/<i>` even when its bounds touch no other group. |
| Rationale | Building manifolds only for pairs that pass the bounds prefilter would leave a broken group far from the others unbuilt, and it would read as 0 overlap, a pass. A refusal must be a fail. The Python version collects such groups in its broken list instead of skipping them. |
| Evidence | The test that refuses an open group in `packages/mesh/test/overlap.test.ts` places that group at x 50, apart from the other group, and expects E_KERNEL at path `groups/1`; it passes on merged main (measured, 2026-10-20). |
| Supersedes | new |
| Milestone | none |

### D-368 overlap.ts builds its own manifolds instead of reusing stages.ts toManifold

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `packages/mesh/src/overlap.ts` builds its manifolds with a try/catch around the constructor, the way `packages/checks/src/capture.ts` `interferenceMm3` does, instead of calling `toManifold` from `packages/mesh/src/stages.ts`. This is a third copy of the mesh to Manifold step; merging the three is a followup. |
| Rationale | `toManifold` does not catch the constructor throw that manifold-3d 3.5.4 gives for an open mesh, so that case would escape as a ManifoldError instead of E_KERNEL. Its hint also names a route shell and the declaration, which is wrong for an imported group. |
| Evidence | `packages/checks/src/capture.ts` lines 54 to 66 wrap `new wasm.Manifold(mesh)` in a try/catch; `toManifold` in `packages/mesh/src/stages.ts` does not (read, 2026-10-20). |
| Supersedes | new |
| Milestone | none |

### D-369 mesh.overlap lineage points at the original inlay validate_3mf.py

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `lineage/mesh.overlap.json` names `fab-knowledge:originals/inlay` `validate_3mf.py` lines 257 to 269 as the canonical source. The bounds prefilter and the max over pairs, taken from `_worst_pair` in the repo copy `tools/py/validate_3mf.py` lines 809 to 830, are listed as fixes. |
| Rationale | `_worst_pair` exists only in the modified repo copy, not in the original, and D-222 says to port from the original. |
| Evidence | A grep for `_worst_pair` under `fab-knowledge/originals` finds nothing; the original's overlap loop is at lines 257 to 269, sha256 cdc2c7d5 recorded in the row (read, 2026-10-20). |
| Supersedes | new |
| Milestone | none |

### D-370 a zero or other out-of-range import count still parses

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `readImports` in `core/src/main.ts` takes any run of digits after the final `#`, so `plate.stl#0` gives `pieces: 0`. Only a non-digit tail leaves the `#` in the path. The range check is part.build's (rails item R1-rails-import-07). |
| Rationale | One place checks the range, so `#0` gets a schema message that names pieces instead of a file-not-found on `plate.stl#0`. |
| Evidence | `core/test/import-flag.test.ts` "passes a zero count through for part.build to refuse"; rails item R1-rails-import-06 brief step 3. |
| Supersedes | new |
| Milestone | none |

### D-371 readImports exported for its test

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `readImports` in `core/src/main.ts` is a named export. |
| Rationale | Every other path to the parser goes through main and the strict zod schema, which refuses `pieces` until rails item R1-rails-import-07, so the item 06 done test could not run through main. |
| Evidence | `core/test/import-flag.test.ts` imports `readImports` from `../src/main.js`; 4 of 4 pass on the merged tree (measured, 2026-10-20). |
| Supersedes | new |
| Milestone | none |

### D-372 vue-tsc runs on @typescript/typescript6 beside TS 7

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. Single-file components are type-checked by vue-tsc 3.3.13 on `typescript6` (`npm:@typescript/typescript6@6.0.2`, which carries `@typescript/old` 6.0.3), started only through `tools/vue-check.mjs`. typescript 7.0.2 stays the compiler for `tsc -b`. Drop the alias once a TS 7.1 API lets vue-tsc run on TS 7. |
| Rationale | TS 7.0.2 has no classic JS API, so vue-tsc cannot run on it. Plain `npx vue-tsc` would load the TS 7 native launcher. The alias avoids the nested-install fallback the brief describes. |
| Evidence | Builder run before the fixes: exit 2 with 3 errors (Legend.vue 24, Rail.vue 46, ParamRail.vue 49); after: exit 0 in 5.0 to 5.3 s wall at load 68 (measured, builder worktree). A mutant on the tsc path fails the test (measured, builder). Dropping at TS 7.1 is inferred from research-build-speed.md. |
| Supersedes | new |
| Milestone | none |

### D-373 vue-tsc 3.3.13 rather than 3.3.12

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. vue-tsc is pinned at 3.3.13, published 2026-10-10 (vendor), 10 days old at the pin. |
| Rationale | No pin-age rule was found in RULES.md, CLAUDE.md, .npmrc or PLAN.md (grep). The brief says both versions behave the same here, and 3.3.13 is the version the scout trial ran. |
| Evidence | A grep for "two weeks" and minimum-release-age found nothing that applies; .npmrc holds only save-exact and engine-strict (measured, builder). |
| Supersedes | new |
| Milestone | none |

### D-374 licence rows for the vue-tsc toolchain cite D-043

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The 11 new `tools/licences.json` rows are status adopted, load dev-only, decision `["D-043"]`, the same as other transitive dev-toolchain rows. The vue-tsc, typescript6 and `@typescript/old` rows may add D-372 in a later licences change. |
| Rationale | D-372 had no id when the rows were written, and D-043 is the decision every other dev-toolchain row cites. |
| Evidence | The `tools/licences.json` diff adds lines only (154, counted); `node tools/licences.mjs --check` passes over 382 rows on the merged tree (measured, 2026-10-20). |
| Supersedes | new |
| Milestone | none |

### D-375 generated import fixtures carry no lineage row

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The six STLs that `tools/corpus/import/make-pieces.mjs` writes (floating-cap, pile, pile-union, hollow-box, two-on-bed, corner-touch) have no `lineage/<subject>.json` fragment. Their MANIFEST.json source is the generator script, and `core/test/part-build-import.test.ts` proves the link by regenerating the files and comparing sha256. |
| Rationale | D-222 lineage rows record ports and harvested copies. These fixtures are primitives built from numbers stated in the R1-rails-import-02 brief, with no original file to point to. |
| Evidence | `lineage/import-corpus.lug.json` (the harvest row shape); `tools/corpus/import/MANIFEST.json`; merge of r1/R1-rails-import-02 at 72d4351 (computed, 2026-10-20). |
| Supersedes | new |
| Milestone | none |

### D-376 corpus test regenerates script-sourced rows

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. In `core/test/part-build-import.test.ts` the bench-source sha check runs only when a MANIFEST source path is absolute. A new test runs `make-pieces.mjs` into a temporary directory and checks that the files it writes, and their sha256, equal the MANIFEST rows whose source is the script. |
| Rationale | A relative source path exists from the repo root, so the old check would compare the script's sha256 against the STL's and fail. Regenerating the files ties them to the script more tightly than a stored hash, and a mutant in the script fails the test. |
| Evidence | Mutant at integration: the floating-cap dome moved from z 22 to z 21 failed the regeneration test (sha 157c1a3a... against fa85d837..., computed); the restored script passes 12 of 12. Builder's own run of the same mutant failed with sha 0cecf91b... (computed). |
| Supersedes | new |
| Milestone | none |

### D-377 pile primitives at 16 segments

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `pile.stl` and `pile-union.stl` use circularSegments 16; `floating-cap.stl` uses 24. |
| Rationale | At 24 segments `pile.stl` was 77884 bytes and `pile-union.stl` 52184 bytes (computed), over the brief's 50 KB limit. |
| Evidence | Generator output at 16 segments: `pile.stl` 36284 bytes, `pile-union.stl` 27184 bytes (computed). |
| Supersedes | new |
| Milestone | none |

### D-378 floating cap is a hemisphere dome

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The floating-cap fixture's cap is a sphere of r 8 centred at z 22 and cut to z 22 and above, so its flat base sits at z 22, 2 mm above the stem top at z 20. |
| Rationale | The brief puts the cap's lowest point at z 22. A flat base makes the gap exactly 2 mm whatever the tessellation. |
| Evidence | Builder's shellGroups probe: the cap group's z min is 22 and the stem group's z max is 20 (computed). |
| Supersedes | new |
| Milestone | none |

### D-379 noUnion text keeps the part-count prefix

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. noUnion reads 'N of M parts fail the audit (x of y shell groups), first body/part#k' and 'the union of N parts is refused (y shell groups): ...'. The prefixes still count parts, with the group counts in brackets. |
| Rationale | core/test/part-build-import.test.ts line 140 and imported-glb.test.ts line 173 match the part-count prefix. Keeping it leaves part-build unchanged until item 07 rewires it. |
| Evidence | The builder's first wording, 'the union of 2 shell groups is refused', failed core part-build-import; after the rewording all 15 core tests pass, and the integrator's run of part-build-import, import-flag and root-references gives 19 passed. |
| Supersedes | new |
| Milestone | none |

### D-380 pairwise excludes groups that fail the audit, voids included

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. worstOverlap runs only over groups whose audit.ok is true. A negative-volume void group fails the audit and is left out. If the kernel still refuses a group, pairwise is null and a UNION warning is raised; stageImported does not throw. |
| Rationale | The brief says 'groups that pass the audit'. The import audit reports rather than refuses, as the existing stageImported doc comment says. |
| Evidence | packages/mesh/test/imported-pieces.test.ts: the void case gives pairwise {0, null} with only the cube compared (computed). |
| Supersedes | new |
| Milestone | none |

### D-381 body attribution of union pieces by bounds containment

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. Each body-union piece is assigned to the smallest union piece whose bounds hold it, with a tolerance of one grid step. A union piece with exactly one owning body takes that body; otherwise its body is null. |
| Rationale | Any connected piece of a body's union lies inside exactly one piece of the full union. Bounds avoid a point-in-solid test; a piece nested inside a hollow piece is resolved by taking the smallest box. |
| Evidence | packages/mesh/test/imported-pieces.test.ts: the three-body case gives pieces [null, 1500] (a and b overlap) and [c, 1500] (computed, mm3). |
| Supersedes | new |
| Milestone | none |

### D-382 pieces and bodyPieces are null when the union is refused

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. Neither pieces nor bodyPieces is filled when no union exists, and pairwise is null when the union verifies. |
| Rationale | This follows the brief's step 5 types. A verified union lets CHK-PRT-03 use the union against the summed volumes. |
| Evidence | packages/mesh/test/imported-pieces.test.ts: the corner-touch case asserts pieces null, bodyPieces null and pairwise set. |
| Supersedes | new |
| Milestone | none |

### D-383 Import piece count and floating piece checks

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. Enter CHK-PRT-18 and CHK-PRT-19 at 1.0.0, block, part level, needs mesh, legal interval. CHK-PRT-18 compares the measured count with the declared count (default 1). CHK-PRT-19 measures the largest lift of a piece above the part's lowest point, legal 0 to 1/1024 mm. A floating piece fails even when the pieces are declared. CHK-PRT-03 keeps 2.0.0 because its rule and legal are unchanged; only the input the import path gives it changes (item 04). |
| Rationale | The image eval mushroom imported with no warning (fab-knowledge:plan-v5/image-eval.md line 25). Part IR carries no pieces, so the rule can only run where the import is read. |
| Evidence | packages/checks/src/defs/prt/CHK-PRT-18.ts and CHK-PRT-19.ts, packages/checks/test/prt18-19.test.ts, fixtures measured by the builder from mush-first.stl and mush-prim.stl with manifold-3d 3.5.4 (measured). |
| Supersedes | new |
| Milestone | none |

### D-384 Import path checks stay out of chase builds

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. IMPORT_PATH_CHECKS (packages/checks/src/defs/prt/import-path.ts) lists CHK-PRT-18 and CHK-PRT-19. Pipeline registryDefs, the conformance run and the message-numbers fixture run all leave them out. Both stay registered, because the generator requires a module for every seed row. |
| Rationale | registryDefs takes every registered check of the part, body and feature levels (D-243). Including the two checks would have moved the registryHash and reportHash of every pinned reference build, and they could only ever skip there. The brief's own fallback (leave the modules out of defs/index.ts) no longer works, because defs/index.ts is generated. |
| Evidence | packages/pipeline/src/build.ts registryDefs; core/test/export-gate-registry.test.ts asserts the exclusion, and the mutant without it fails; core/test/project-graph.test.ts passes with graph.jsonl unchanged. |
| Supersedes | new |
| Milestone | none |

### D-385 No CHECKS.md section 6 rows for the new checks

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The rows for CHK-PRT-18 and CHK-PRT-19 go in section 9.2 only, as CHK-PRT-16 did. |
| Rationale | Section 6 lists the 86 seeded rows. packages/checks/test/seeded-ids.ts derives SEEDED_IDS from it, and entered.test expects 86 rows with no enteredBy. |
| Evidence | packages/checks/test/seeded-ids.ts line 11; packages/checks/test/entered.test.ts, the 86 seeded rows case. |
| Supersedes | new |
| Milestone | none |

### D-386 fab-knowledge: evidence prefix accepted in seed origins

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. origin.test resolves fab-knowledge:<path> to the archive and checks it exists when the archive is on this host, the same rule as for absolute paths. |
| Rationale | The brief asked for no absolute path, and the test tried to read any non-absolute path as a repo path. |
| Evidence | packages/checks/test/origin.test.ts; tools/publish-paths.mjs defines the prefix. |
| Supersedes | new |
| Milestone | none |

### D-387 COMMANDS is ordered by COMMAND_NAMES

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. R1-engine-01: `bind()` in `packages/commands/src/spec.ts` sorts the bound defs into spec `COMMAND_NAMES` order. The hand-written `COMMANDS` array in `core/src/registry.ts` is gone. |
| Rationale | The generated def index sorts by file name, so the order has to come from a derived list. The old array comment said it was in `COMMAND_NAMES` order, but the array did not follow it. |
| Evidence | The order of `hbf --help` lines and of the MCP tool list follows `COMMANDS`, so it changed. `core/test/mcp-parity.test.ts` (wire order) and `core/test/surface.test.ts` pass on the merged tree (computed, 2026-10-20). No golden of help output was found. |
| Supersedes | new |
| Milestone | none |

### D-388 motion.run program ids reach the spec through host lists

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. R1-engine-01: `CommandSpec.input` may be a function of `HostLists` (`{ programIds }`). Only `motion.run` uses it, and core passes `PROGRAM_IDS` when it calls `bind`. |
| Rationale | `PROGRAM_IDS` is derived from the motion families in core, which import motion and profile at runtime. A tier 2 package that depends only on spec cannot read it, and typing the ids into the package would hand-list something another file determines. |
| Evidence | `packages/commands/src/spec.ts` `HostLists`; `packages/commands/src/defs/motion-run.ts`; the `bind` call in `core/src/registry.ts`. `packages/commands/test/bind.test.ts` validates a `motion.run` example after bind (computed, 2026-10-20). |
| Supersedes | new |
| Milestone | none |

### D-389 VIEW_MODES moves into the view.render spec

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. R1-engine-01: `VIEW_MODES` is a literal in `packages/commands/src/defs/view-render.ts` that satisfies spec `ViewMode[]`. Core's `MODE_VIEW` is typed as a map over exactly those modes. |
| Rationale | The spec's description and schema text need the list, and the package cannot import core. tsc fails if the list and core's map disagree, so there is still one source. |
| Evidence | `core/src/commands/view-render.ts` lines 9 to 19; `npx tsc -b` exits 0 on the merged tree (computed, 2026-10-20). |
| Supersedes | new |
| Milestone | none |

### D-390 Widened CLI examples lose their compile-time check

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. R1-engine-01: in `packages/commands`, `example<N>()` takes a plain record. The widened input types (`SimRunInput`, `NestPackInput`, `ExportInput` and the rest) stay in core with their run bodies. |
| Rationale | Those types live in core command files the package cannot import. The examples are still validated against each input schema at runtime by `core/test/contract.test.ts`. The widened CLI layer comes out at M10 (D-107). |
| Evidence | `packages/commands/src/shared.ts` comment; `core/test/contract.test.ts` passes on the merged tree (computed, 2026-10-20). |
| Supersedes | new |
| Milestone | none |

### D-391 The run-body mutation check is split between core and the package

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. R1-engine-01: `packages/commands/test/bind.test.ts` proves `bind()` rejects a deleted run body with a synthetic runs map and does not import core's real `RUNS`. A run body deleted from core's `RUNS` stops the core load with E_KERNEL. |
| Rationale | In `tools/tiers.mjs` a relative import from a package test into core counts as an edge from commands up to core, and that edge fails the tier gate. |
| Evidence | `tools/tiers.mjs` header comment. Builder mutants (computed, 2026-10-20): deleting the `fits.table` run body failed `core/test/contract.test.ts` at load with E_KERNEL; removing the no-run-body check from `bind()` failed the bind test case. |
| Supersedes | new |
| Milestone | none |

### D-392 The spec surface test reads the def files

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. R1-engine-01: `spec/test/surface.test.ts` finds network-only fields in `packages/commands/src/defs/*.ts`, not in `core/src/registry.ts`, and fails on any def file that does not declare `spec: CommandSpec<name>`. The file is outside the item's Writes line. |
| Rationale | The schemas moved, and the old text parse would have passed with nothing to read. |
| Evidence | `spec/test/surface.test.ts` lines 60 to 78; `npx vitest run spec` 38 passed on the merged tree (computed, 2026-10-20). |
| Supersedes | new |
| Milestone | none |

### D-393 Absent claimFns reads as an empty registry

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. R1-engine-10: when `ChaseRegistries.claimFns` is absent, every claim fn is refused with E_REF (record `chase-ref/claim-fn`) instead of going unchecked. R1-engine-11 feeds claimFns through the loader before any chase declares claims. |
| Rationale | The resolve.ts rule is that an id resolving to nothing is an error, never a check that does not run. No chase declares claims today, so nothing breaks. |
| Evidence | `packages/chase/src/resolve.ts`; `packages/chase/test/claims.test.ts` test "refuses every claim fn when the registries carry no claim fns"; `npx vitest run packages/chase` 251 passed on the merged tree (computed, 2026-10-20). |
| Supersedes | new |
| Milestone | none |

### D-394 EvidenceRef shape

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. R1-engine-10: EvidenceRef is `{kind: "coupon" \| "record" \| "file"; ref: string}`, defined in `spec/claims.ts`. The brief named the type but no spec file defined it. |
| Rationale | The smallest shape that holds a coupon result, a profile or knowledge record, or a file on record. It is the input CHK-CLAIM-01 (R1-engine-11) needs to tell "inferred, no evidence" from "backed". |
| Evidence | `spec/claims.ts`; a grep of spec/, packages/ and core/ found no prior EvidenceRef; the brief `.hbf-notes/r1/briefs/engine.md` line 350 names it. |
| Supersedes | new |
| Milestone | none |

### D-395 Claim range, unit and id rules run outside zod

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. R1-engine-10: zod types the claim fields only. The range, unit and id-unique rules run in `claimRuleErrors` so they carry the record `chase-claim/<rule>`. The why field stays a zod refine, like the waiver reason. |
| Rationale | A zod issue gets a `chase-schema/<zod code>` record, which would not match `chase-claim/<rule>`. |
| Evidence | `packages/chase/src/schema.ts` `claimRuleErrors`; mutant disabling the unit rule fails 1 of 13 claims tests, mutant disabling the range rule fails 3 of 13 (computed, 2026-10-20). |
| Supersedes | new |
| Milestone | none |

### D-396 A zero-width claim band is legal

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. R1-engine-10: a claim band with lo == nominal == hi validates. |
| Rationale | The brief's rule is lo <= nominal <= hi, which is not strict. |
| Evidence | `packages/chase/test/claims.test.ts` test "accepts a zero-width band at the nominal". |
| Supersedes | new |
| Milestone | none |

### D-397 access-switch goldens accepted after the jack seat

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The access-switch goldens are accepted at buildHash 90e3873d after reading the diff: the body mesh moves by design (volume 42885.147 to 40990.216 mm3, computed) where the jack bore, pocket and sockets cut it; conductor.lead0 and lead1 become leadT and leadS with the socketT and socketS bodies and their walls; every other body keeps its mesh hash and volume. graph.jsonl rerecorded on access-switch lines only. The builder had left the set for a person under D-251; this entry makes that call under the delegation (D-152, D-274 form). |
| Rationale | The move is the item itself (seating the jack), confined to the bodies the jack touches, and the checks hold on the new geometry. |
| Evidence | Per-body meshHashes diff between main and the proposed set; hbf check.run on the branch 47 pass, 1 warn (CHK-PRT-05, also on main), 0 fail, 55 skip; reference/keys/access-switch 21 of 21; project-graph 11 of 11 (computed, 2026-10-20). The accepted set equals the builder proposed set. Not run: validate_3mf --overlap (export gate), the virtual slice, any print, any render look. |
| Supersedes | new |
| Milestone | none |

### D-398 Jack bore opens up through the rim (U), unlike BAFFLE's closed bore

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. Below the axis the bore is BAFFLE R3's stepped circle. Above the axis it is a straight 6.2 mm slot up to the rim top. |
| Rationale | The legs drop into vertical slots in printed sockets. With a closed bore the jack would have to slide outward through the wall, and its legs could not reach sockets placed behind the body. The rim sits over the wall, so the bushing could not drop in either. |
| Evidence | baffle-r3 model.js lines 593 to 596 and 635 to 639. jack.ts features pocket.jackBore0 to 4 and pocket.jackBoreU. |
| Supersedes | new |
| Milestone | none |

### D-399 Jack turned a quarter turn about its axis

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The pads lie along x at the axis height (world x = -(y_part + 6.48), z = axis + x_part). This is a proper rotation of the KiCad front view, not a mirror. |
| Rationale | In the KiCad orientation the pads would stand 11.4 mm tall. With the jack top held under the 13.68 mm body top that does not fit, and it would not leave all three legs on one trace level. |
| Evidence | jack.ts toWall. Test: T socket 11.4 mm from S along x. |
| Supersedes | new |
| Milestone | none |

### D-400 Jack physical numbers as six new inferred profile rows

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. Added jack.boreD 6.2 and jack.panelT 3.6 (BAFFLE R3), jack.bodyDepth 11 (KERF's drawn box), and jack.clr 0.3, jack.socketWall 0.525 and jack.socketLen 3.0 (PIP layout.js line 39). |
| Rationale | Every physical number comes from profile. The PJ398SM catalog row has no bushing, depth or leg data. |
| Evidence | packages/profile/data/constants.json. packages/profile/test/origins.test.ts reads each cited line through canonical lineage. |
| Supersedes | new |
| Milestone | none |

### D-401 Leg slot drawn at the KiCad pad drill

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The S and T slots are 1.22 and 1.43 mm wide (the footprint drills, community). |
| Rationale | The leg section and length are not in any source in the repo. The drill is the only bound on record. Grip is unknown until a jack sits in a print. |
| Evidence | PJ398SM_PADS in jack.ts. README jack seat section. |
| Supersedes | new |
| Milestone | none |

### D-402 key.R.pads emitted by the click archetype

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. One line in packages/archetypes/src/pip/click.ts emits the existing clickSwitch pads value as metric key.R.pads. |
| Rationale | R.closed needs R.pads, and the formula already lives in the archetype. Re-deriving it in build.ts would make a second copy of the same calculation. |
| Evidence | hbf parity on buttons/click-spring and access-switch/coupon: equal on all four goldens. |
| Supersedes | new |
| Milestone | none |

### D-403 R.leads written as rho L / A inside jack.ts

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. jack.ts computes ohmCm x 10 x L / A itself, and the reference test holds the result equal to @hackbuild/profile sectionResistance. |
| Rationale | BUILD_IMPORTS forbids @hackbuild/profile inside the build sandbox. |
| Evidence | The test 'R.closed is the key's switch and pads plus the leads, and R.leads equals sectionResistance over the features'. |
| Supersedes | new |
| Milestone | none |

### D-404 Metric record rerecorded, including claim.press rows main had left out

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. Rerecorded packages/checks/test/metric-gates/builds.json and added INFORMATIONAL reasons for claim.press.*, jack.* and R.leads/R.closed. |
| Rationale | The rerecord is needed for the new metrics. It also showed that R1-flagship-access-switch-04 never recorded its claim metrics, so those rows had no reason entries. |
| Evidence | The builds.json diff is 40 added lines, no deletions. packages/checks 558 passed. |
| Supersedes | new |
| Milestone | none |

### D-405 Fix the exit-row test mapping, not ci.yml

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. tools/test/ci-exit-rows.test.mjs proves a workspace Exit row with a root `npx vitest run` line whose directory argument is or contains the workspace. The `npm test --workspaces` step was not restored. |
| Rationale | The job merge (R1-rails-ci-hooks-03, tools/ci/test-sets.mjs) runs each vitest file once from the root config. Bringing the workspace step back would run those files twice. The root config's include list (packages/*/test, designs/**/test, core/test) covers the same files as the workspace runs. |
| Evidence | Before the change, 5 tests failed and listed only `npm test -w` rows. After it, 15 of 15 pass. Removing the exit-a or designs vitest step makes the test fail again (both mutants killed, run by the builder). |
| Supersedes | new |
| Milestone | none |

### D-406 CHECKS.md section 5 PRT entered count is 6

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The PRT entered count is 6 and the total entered is 86. These are computed from the section 9 rows the same way tools/counts.mjs enteredChecks reads them. |
| Rationale | CHK-PRT-18 and -19 were entered in e66e9bc (2026-10-20) and the family table was not updated. The brief put this down to the R1-rails-import-05 import checks, but the section 9 rows point to e66e9bc. |
| Evidence | Per-prefix tally of section 9 (computed): PRT 6, FIT 3, ASM 3, SHT 4, NET 33, BRD 16, 3MF 3, SHP 1, LNT 2, KEY 1, ART 10, DEV 4, total 86, equal to counts.json checks.entered. plan-drift test "CHECKS.md seeded counts equal counts.json" passes after the merge. |
| Supersedes | new |
| Milestone | none |

### D-407 The access switch press-claim README block has no automatic writer

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `reference/keys/access-switch/test/claim.test.ts` only compares the README press-claim block with this run. When they differ, the test fails and prints the expected block, and a person pastes it in. The README marker reads "paste the block the claim test prints when it fails". The test no longer reads HBF_ACCEPT. |
| Rationale | D-227 and `tools/test/golden-writers.test.mjs` allow one HBF_ACCEPT reader, the flex-pair render writer. A second writer for README prose would need its own decision. |
| Evidence | golden-writers 8 of 8 pass on the merged tree (computed); changing a gram figure in the README press block (180 g to 999 g) fails the claim test (builder mutant, computed). |
| Supersedes | new |
| Milestone | none |

### D-408 The access switch parity line names build 90e387..5c

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The verified block of `reference/keys/access-switch/README.md` cites build 90e387..5c, the hash in the committed `expected/build.json`, not the 6608e9..50 the R1-fix-01 brief named. |
| Rationale | The goldens were re-accepted after the jack seat in commit 5c1db0e (D-397), so 6608e9..50 was right only at a1e5005. The readme-verified test checks the README against the committed golden. |
| Evidence | `hbf parity reference/keys/access-switch` exit 0 at build 90e387..5c, four goldens equal (builder run, computed); readme-verified and access-switch tests 172 of 172 pass on the merged tree (computed). |
| Supersedes | new |
| Milestone | none |

### D-409 The access switch coupon README takes the four verified lists

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. R1-fix-01 also converted `reference/keys/access-switch/coupon/README.md`, outside its Writes line, to the four DOCS.md 9.3 lists, each line backed by fresh parity and check.run runs on the coupon. |
| Rationale | The brief's done condition needs plan-drift test 28 to pass, and after the switch fix it failed only on this file's "### Not verified" heading. |
| Evidence | plan-drift, ci-exit-rows, ci-workflow and lineage tests 68 of 68 pass on the merged tree (computed); coupon parity PASS at build d6f43d..34 and check.run 0 fail (builder runs, computed). |
| Supersedes | new |
| Milestone | none |

### D-410 Slice into the temp folder, then copy into fab-knowledge

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. R1-flagship-access-switch-08 ran `tools/slice/slice.mjs` with its output and datadir under the temp folder and copied the run byte for byte to `fab-knowledge/evidence/virtual-print/2026-10-20-access-switch/`. Paths inside the run record name the temp folder. |
| Rationale | From a worktree, slice.mjs resolves its evidence root to `wt/fab-knowledge/evidence`, and its out-dir guard refuses the real fab-knowledge path. Editing slice.mjs was outside the item. |
| Evidence | `tools/slice/slice.mjs` evidence root `path.resolve(ROOT, '..', 'fab-knowledge', 'evidence')` and its out-dir guard; `SLICE.md` section "How it ran" in the evidence folder. |
| Supersedes | new |
| Milestone | none |

### D-411 Beam road check passes despite the 0.60 mm planned road

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The access switch beam check is recorded as pass, since every beam is deposited and continuous on layers 0 to 6, and the 0.587 to 0.601 mm planned road width (computed) against the drawn 0.55 mm is recorded as a separate finding. Beam t is not changed. |
| Rationale | The item asks whether the beams are deposited, and they are. Changing t to suit the slicer needs a claim note first. The width risk is covered by the inferred press claim and the thickness ladder coupon. |
| Evidence | `beam-roads.json` in the evidence folder, road cover 1.000 and longest gap 0.00 mm (computed); the Virtual slice block of `reference/keys/access-switch/README.md`. |
| Supersedes | new |
| Milestone | none |

### D-412 The access switch README drops its stale not-sliced line

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. R1-flagship-access-switch-08 changed "Not sliced; no force has been on a gauge (unknown)." to "No force has been on a gauge (unknown). The slice below is virtual." outside its own README block. |
| Rationale | After the virtual slice the old line would be false. The edit is one line in the same README. |
| Evidence | Commit 13e095b, merged in 9e74d75. |
| Supersedes | new |
| Milestone | none |

### D-413 slice.mjs keeps its preset-name output for now

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. R1-flagship-access-switch-08 left `tools/slice/slice.mjs` unchanged and skipped the optional preset-name step. |
| Rationale | The step is optional, the switch declares a preset, and slice.mjs is shared by every virtual print. |
| Evidence | The run wrote `access-switch-default.3mf` in the evidence folder. |
| Supersedes | new |
| Milestone | none |

### D-414 plot.curve registers through the existing plot.<id> panel id

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. R1-flagship-access-switch-12 adds no panel id to `spec/bench.ts`. `PanelRef` is already a string and `defineBench` already checks `plot.<id>` against `BenchDecl.plots`, so `packages/ui/src/bench/panels.ts` resolves any `plot.` prefix to `CurvePanel`. `PlotDecl` gains optional `band` and `measured` fields instead. |
| Rationale | One implementation. The gold fixture already uses `plots.spring` with metric `spring.curve`, so the sampled metric form fits the existing contract. |
| Evidence | `spec/bench.ts` PanelRef doc and PlotDecl; `spec/fixtures/gold.ts` plots.spring; `packages/ui/src/bench/panels.ts` resolvePanel. |
| Supersedes | new |
| Milestone | none |

### D-415 The access switch contact closes the pad halves, not a contact feature

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `ContactFn.closed` in `reference/keys/access-switch/build.ts` lists `click-spring-key.0.conductor.pad` and `conductor.padCommon`, the split the tip bridges. |
| Rationale | The archetype emits no contact feature because the loose tip cannot be named (scout finding 7). The pad therefore shows no logic or ohm read, since there is no hookup and no contact feature, and its line says so. |
| Evidence | `reference/keys/access-switch/build.ts` contact; `packages/ui-core/src/drive/drive.ts` readOf. |
| Supersedes | new |
| Milestone | none |

### D-416 The access switch chase gains a json export

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. Added `{ kind: "json" }` to the keys-access-switch exports. This moves defHash; goldens were re-accepted with mesh hashes and volumes equal (computed, field by field), and the graph fixture was rerecorded with only access-switch build, golden and link lines moved. |
| Rationale | The header save verb and gold G-57 export json, and the bench failed G-57 with `unknown export kind: json`. flex-pair declares json too. |
| Evidence | `tools/smoke/gold/perf.spec.ts` line 52; `reference/keys/flex-pair/chase.ts` line 73; `packages/project/test/fixtures/graph.jsonl` rerecord commit. |
| Supersedes | new |
| Milestone | none |

### D-417 The gold check host builds the bench's own design

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `startHost(design)` passes the folder of the bench `bake.json` to `tools/smoke/flex-pair-host.mjs`, which still defaults to flex-pair. |
| Rationale | With the host hardwired to flex-pair, G-33, G-36, G-40 and the check report failed with E_SCHEMA on every other fab bench. That was a harness defect, not a bench defect. |
| Evidence | Builder first gold run: `E_SCHEMA /H set H inside its range`; second run: those rows pass. flex-pair was not re-graded after the change (not run). |
| Supersedes | new |
| Milestone | none |

### D-418 Curve scale fmax also covers the claim band top

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `curveSvg` takes fmax as 1.15 times the larger of the curve peak and `band.hi`. PIP drawCurve used the peak only. |
| Rationale | This keeps the shaded claim band inside the frame when the band top is above the peak. It is recorded as a fix in the lineage row. |
| Evidence | `lineage/pip.bench-part3.json` row `pip.bench-part3/ui-curve-panel`; `packages/ui/src/panels/curve.ts`. |
| Supersedes | new |
| Milestone | none |

### D-419 The integrator rerecords graph.jsonl when only the build hash moves

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The R1-flagship-access-switch-12 builder left `packages/project/test/fixtures/graph.jsonl` for the integrator, who rerecorded it with `HBF_ACCEPT_GRAPH=1` after checking that every mesh item hash and volume was unchanged and that no line outside access-switch moved. |
| Rationale | The build hash moved by design from the chase json export, not from geometry. Item 02 took the same path after a mesh-equal re-accept. |
| Evidence | `core/test/project-graph.test.ts` 11 pass after the rerecord (computed); graph diff 26 lines, all access-switch, mesh hashes equal; LOG.md line for R1-flagship-access-switch-02. |
| Supersedes | new |
| Milestone | none |

### D-420 CHK-PRT-19 on floating-cap measures 22 mm, not about 2 mm

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The CHK-PRT-19 rule merged in R1-rails-import-05 is kept as it is. The golden and `tools/corpus/import/MANIFEST.json` record 22 mm (computed), the floating cap's lift above the part's bed plane. |
| Rationale | `prt19Finding` measures a piece's lowest point minus the bed plane. The cap's base is 22 mm above the bed and 2 mm above its stem. Changing the check is outside R1-rails-import-07's Writes, and the fail verdict is the same either way. |
| Evidence | `packages/checks/src/defs/prt/CHK-PRT-19.ts` `prt19Finding`; the in-process run gives firstFloating -8,-8,22 to 8,8,30 mm and measured 22 (computed). |
| Supersedes | new |
| Milestone | none |

### D-421 pieces enters the part.build input schema without a range check

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `packages/commands/src/defs/part-build.ts` takes `pieces` as `z.number().exactOptional()`. Only `part.build` checks for an integer of at least 1 and refuses others with E_SCHEMA at `/import/<i>/pieces`. |
| Rationale | Without the field the cli refused `path#N` as an unknown input, so the R1-rails-import-06 syntax never reached the command. One range rule in one place matches the comment in `core/test/import-flag.test.ts`, which says the range check is part.build's. |
| Evidence | Before the change the cli run of `two-on-bed.stl#2` gave exit 2 with "remove pieces; part.build takes no such input"; after it, exit 0 (computed). 0 and 1.5 are refused with E_SCHEMA in `core/test/part-build-import.test.ts`. |
| Supersedes | new |
| Milestone | none |

### D-422 Declared pieces enter defHash as the resolved count

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The defHash import rows hash `pieces: spec.pieces ?? 1`, so an undeclared file and `#1` hash the same and `#2` hashes differently. Every import build hash moved once because of this; no mesh hash or volume moved. |
| Rationale | The declaration enters the build hash, as `ImportSpec.pieces` documents, and absent and 1 declare the same thing. |
| Evidence | `core/test/part-build-import.test.ts` asserts that two-on-bed and two-on-bed#2 have different build hashes; the golden volumes and triangles of locket-r2.glb and lug.glb are unchanged (computed). |
| Supersedes | new |
| Milestone | none |

### D-423 With no union, CHK-PRT-18 and CHK-PRT-19 skip with the no-union reason

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. When CHK-PRT-01 finds no union (for example lug.glb), CHK-PRT-18 and CHK-PRT-19 skip with "no union of the imported parts to count pieces in: <reason>", not with the CHK-PRT-01 precondition gate, so neither passes without a union. |
| Rationale | The R1-rails-import-07 brief asks for the no-union reason, and `core/test/precondition.test.ts` asserts that CHK-PRT-03 is the only gated skip. |
| Evidence | `core/test/precondition.test.ts` 9 pass on the merged tree (computed). |
| Supersedes | new |
| Milestone | none |

### D-424 A kernel-refused pairwise fails CHK-PRT-03 with measured kernel refused

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. When the kernel refuses a shell group, CHK-PRT-03 fails with measured "kernel refused", legal kind none, and a constraint that quotes the UNION warning's pairwise reason. |
| Rationale | Under D-064 the measured value must be a real value, and the interval legal kind needs a number, which does not exist here. |
| Evidence | `core/src/commands/part-build.ts` importChecks. |
| Supersedes | new |
| Milestone | none |

### D-425 The access switch print card has no tip into the dovetail step

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The access switch print card (R1-flagship-access-switch-09) has no "tip into the dovetail" step. Step 1 peels the spring with its grey tip as one piece, and step 2 sets the spring with the tip down toward the floor pads, as the PIP print card does. |
| Rationale | `click-spring-key` has no dovetail: grep finds no hits in `packages/archetypes/src/pip/click.ts`. PIP prints the tip on the spring element (original print card: click elements are springs in slot 1, tips in slot 4), so the brief's step does not match the geometry. |
| Evidence | `fab-knowledge:originals/pip/files/print-card.txt` lines 13 and 36; `packages/archetypes/src/pip/click.ts` header lines 12 to 14. |
| Supersedes | new |
| Milestone | none |

### D-426 The access switch card reuses the flex-pair card helpers

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `reference/keys/flex-pair/test/card.ts` exports `overrideLines`, and the access switch card imports it with `splice` and `between` from that file rather than copying them. |
| Rationale | House rule: one implementation of each thing. The change is one keyword in a file outside the item's Writes line. |
| Evidence | `reference/keys/flex-pair/test/card.ts` line 44; the flex-pair suite passes 32 of 32 on the merged tree (computed, 2026-10-20). |
| Supersedes | new |
| Milestone | none |

### D-427 The access switch card derives its brim line from the 3MF

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. When the 3MF sets no `brim_type`, the print card tells the person to turn the brim off and cites the virtual slice finding that the slicer laid the brim in TPU 95A. The line changes by itself once the writer sets the key. |
| Rationale | Item 08 found `auto_brim` laid in TPU on PETG. Until the writer sets `brim_type`, the card is where the person learns about it. |
| Evidence | `reference/keys/access-switch/README.md` Virtual slice block, finding on `brim_type` `auto_brim`, 2143 mm2 (computed). |
| Supersedes | new |
| Milestone | none |

### D-428 The access switch card names USE.md before it is written

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The access switch print card links `USE.md` at the repository root and says the file is not written yet. |
| Rationale | Plan v9 section 5 says the use policy is linked from the print card, but no `USE.md` exists in the repo. |
| Evidence | The repo root has no `USE.md` (measured, 2026-10-20); `fab-knowledge:plan-v5/PLAN.md` line 167. |
| Supersedes | new |
| Milestone | none |

### D-429 The BOSL2 notice goes in the edge.ts header, not in THIRD-PARTY-NOTICES.txt

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The full BOSL2 BSD 2-Clause text (Copyright (c) 2017-2019, Revar Desmera) sits in the header of `packages/geom/src/edge.ts`; `THIRD-PARTY-NOTICES.txt` is not edited. |
| Rationale | `THIRD-PARTY-NOTICES.txt` is generated by `tools/licences.mjs --notices` from the bake-inlined npm packages and says never to edit it by hand; a hand edit fails `--check`. The earcut port already carries its notice in the source header. No BOSL2 source is copied; only the os_circle and os_teardrop profile ideas are used. |
| Evidence | `tools/bake/notices.mjs` lines 1 to 7 and 41 to 46; `packages/geom/src/earcut.ts` lines 1 to 16; https://raw.githubusercontent.com/BelfrySCAD/BOSL2/master/LICENSE |
| Supersedes | new |
| Milestone | none |

### D-430 Edge profiles refuse an empty inset range with E_UNSAT

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. When the widest edge inset is at or over the inradius, or the top and bottom zones are taller than the body, `edgeInset` fails with E_UNSAT and a hint. A bad size, angle or inset field is E_SCHEMA. |
| Rationale | E_GEOM is not in `spec/errors.ts` ERROR_CODES and that file is outside the item. E_UNSAT means an interval is empty, which is the case for an empty legal inset range. |
| Evidence | `spec/errors.ts` lines 17 to 29; `packages/geom/src/edge.ts` |
| Supersedes | new |
| Milestone | none |

### D-431 The foot edge profile carries a required inset field

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. EdgeProfile gains an optional `inset: Mm`, required for kind foot and refused for every other kind. For foot, `size` is the height of the relieved band. |
| Rationale | The brief's type had no way to set the relief amount. KNURL uses two numbers (foot 0.25, footZ 0.5, inferred from the original), and geom carries no default physical number, so the caller reads both from profile. |
| Evidence | `fab-knowledge:originals/knurl/files/knurl.html` lines 578 and 1014 to 1015 |
| Supersedes | new |
| Milestone | none |

### D-432 Edge angleDeg is limited to turn fractions the D-175 table holds

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. Chamfer and teardrop read cos and sin from `unitCircle`. angleDeg must make angleDeg * n / 360 whole for some n from 3 to 256, so every even degree and 22.5 pass and 7 is E_SCHEMA. On a chamfer, `size` is the inset at the face and the vertical extent is size * tan(angle). |
| Rationale | geom forbids Math.cos, sin and tan, enforced by a test, so that hashes match across node and WebKit (D-175). |
| Evidence | `packages/geom/test/unit-circle.test.ts` lines 84 to 89 |
| Supersedes | new |
| Milestone | none |

### D-433 The coupon card is generated and drift-tested, not hand-typed

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `reference/keys/access-switch/COUPON.md` carries a generated card block written by `coupon/test/card.ts` and guarded by a drift test in `coupon/test/reference.test.ts`; `HBF_ACCEPT=1` rewrites the block. This adds two coupon test files beyond the brief's Writes line of item R1-flagship-access-switch-11. |
| Rationale | The checklist states the export bytes and sha256 the owner checks against. The house rules forbid hand-typed numbers that another file determines, and flex-pair EXIT-B has a test-backed card for the same reason. |
| Evidence | A cup depth mutant (chase.ts default 8 to 8.5 mm) makes the drift test fail, 91918 against 91914 bytes (computed); the access-switch suites pass 36 of 36 on the merged tree (computed, 2026-10-20). |
| Supersedes | new |
| Milestone | none |

### D-434 The coupon result is pasted under Coupon result in the switch README

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The owner pastes the coupon result under "Coupon result" in `reference/keys/access-switch/README.md`, not in the coupon README. Until then the subsection reads "none yet" and every force stays computed. |
| Rationale | The result sets the switch's `spring.t` and its press claim, and the item brief puts the link block in the design README. |
| Evidence | `reference/keys/access-switch/README.md`, the R1-flagship-access-switch-11 block. |
| Supersedes | new |
| Milestone | none |

### D-435 The word per coupon rung decides; scale and coins only record

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The one-word verdict per rung (too soft, right, too stiff) picks the rung. Caliper, scale and coin readings are recorded as evidence and do not override it. The rung marked right sets the switch default `spring.t` to that rung's drawn beam, not to its caliper reading. Only the owner enters a result; an agent may only propose the change. |
| Rationale | The item brief's rule is that the rung marked right sets the switch default t. The same drawn beam on the same printer is expected to print the same way (inferred). |
| Evidence | `reference/keys/access-switch/COUPON.md`, section "Pass, and what to record". |
| Supersedes | new |
| Milestone | none |

### D-436 plateRows is exported from the switch card and reused by the coupon card

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `plateRows` in `reference/keys/access-switch/test/card.ts` (item 09's file) is exported and the coupon card imports it rather than copying it. |
| Rationale | House rule: one implementation of each thing. |
| Evidence | A one-word diff in `test/card.ts`; the switch suites pass 29 of 29 on the branch and the access-switch workspace 36 of 36 on the merged tree (computed, 2026-10-20). |
| Supersedes | new |
| Milestone | none |

### D-437 @hackbuild/ui exports six panels, not five

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `packages/ui/src/index.ts` (R1-engine-04) exports all six panel components: ChecksPanel, CurvePanel, ExportsPanel, FitsPanel, LogPanel and NotesPanel. |
| Rationale | The R1-engine-04 brief says five panels and names none, while `packages/ui/src/panels/` holds six. Leaving one out would mean choosing which with nothing to go on. |
| Evidence | `ls packages/ui/src/panels` lists 6 .vue files; `packages/ui/test/exports.test.ts` checks the exact export list (measured, 2026-10-20). |
| Supersedes | new |
| Milestone | none |

### D-438 @hackbuild/ui exports pageBench and pageOf beside mountBench

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The package also exports pageBench, pageOf and the MountOptions, MountedBench, BenchBuild, BenchWriter and PageBuildLike types from `packages/ui/src/bench/entry.ts`. |
| Rationale | Every design bench entry calls `mountBench(pageBench(pageOf(...)))`, so mountBench alone does not mount a real bench. |
| Evidence | `reference/keys/flex-pair/bench.entry.ts` line 8. |
| Supersedes | new |
| Milestone | none |

### D-439 useBench reads the hook from the BENCH global

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. useBench (`packages/ui/src/bench/use-bench.ts`) returns the shell store from useShell and the hook from `globalThis[BENCH_GLOBAL]`, or null when the bench was mounted with `hook: false`. `entry.ts` is unchanged; no provide or inject. |
| Rationale | Changing `entry.ts` would change the flex-pair bake bytes, which the brief holds fixed. The kit mounts with `hook: false`, so the hook is null there. |
| Evidence | flex-pair bake sha256 6481b19e483e5be44cdba92a0037b250386464f4ed4a995fb4d9a58146304dd2, 4537728 bytes, before and after (computed, builder). A mutant returning a null hook always failed the useBench test in `exports.test.ts` (measured, integrator). |
| Supersedes | new |
| Milestone | none |

### D-440 tsc -b leaves out the ui index; types go to dist/types

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `packages/ui/tsconfig.json` excludes `src/index.ts`. The vite library build (`packages/ui/vite.config.ts`) owns `dist/index.js` and `dist/style.css`; vue-tsc through `tools/vue-check.mjs` and `packages/ui/tsconfig.lib.json` owns `dist/types`. No file has two writers. |
| Rationale | tsc cannot compile the single-file components the index names; compiling it would write a `dist/index.js` importing .vue files absent from dist and clash with the vite output. A separate `dist/types` keeps vue-tsc from overwriting the .d.ts files tsc writes. |
| Evidence | `npx tsc -b` exit 0 and `node tools/vue-check.mjs tsconfig.lib.json` exit 0 on the merged tree (measured, 2026-10-20). |
| Supersedes | new |
| Milestone | none |

### D-441 the ui exports test builds the package before importing it

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `packages/ui/test/exports.test.ts` runs the vite build and the vue-tsc emit in child processes (NODE_ENV production), then imports `@hackbuild/ui` through a variable specifier. |
| Rationale | Building first means the test never reads a stale dist, so a mutant in `src/index.ts` is caught. The variable specifier keeps `tsc -p tsconfig.tests.json` passing in CI, where the typecheck runs before any build. |
| Evidence | Deleting the DrivePad export failed 2 of 5 tests (measured, builder); `npx tsc -p tsconfig.tests.json --noEmit` exit 0 on the merged tree (measured, integrator). |
| Supersedes | new |
| Milestone | none |

### D-442 Cross-package 3mf tests and the contract type test live in packages/checks

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The canonical, mesh-parity and skeleton tests moved from `packages/3mf/test` to `packages/checks/test` (`canonical-3mf`, `mesh-parity-3mf`, `skeleton-3mf`). The SlicerPreset type test is `packages/checks/src/3mf/contracts.ts`, compiled by `tsc -b`, not a test file in `packages/3mf`. |
| Rationale | With the 3mf edge exception gone, `packages/3mf` (edges []) may not import spec, mesh or profile, even from tests. checks is the lowest tier that sees spec, profile, mesh and 3mf. A type test inside a vitest file is never compiled by `tsc -b`, so it would catch nothing. |
| Evidence | `tools/tiers.mjs` scans test/ and devDependencies for edges; 0 failures on the merged tree (measured, integrator). Removing readonly bedType from the vendored `contracts.d.ts` failed tsc at `contracts.ts` line 13 (measured, builder). |
| Supersedes | new |
| Milestone | none |

### D-443 Fab narrows the wider vendored contract types at the two glue sites

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `packages/pipeline/src/build.ts` export3mf casts artifactHash (string to spec ArtifactHash) and warnings to spec BuildWarning; `packages/checks/src/defs/3mf/validator.ts` annotates with the vendored CheckResult before the existing cast to Finding. hackbuild-3mf `contracts.ts` is unchanged. |
| Rationale | The vendored copy types Fix.patch and BuildWarning.bound as unknown and brands Hash with its own unique symbol, so they are not assignable to spec. The vendored code never sets patch or bound (grep), so narrowing is sound; copying PatchEdit and Bound into hackbuild-3mf would add a large type tree to the public package. |
| Evidence | Without the casts tsc failed at `build.ts:565` and `validator.ts:16` (measured, builder). `packages/checks/src/3mf/contracts.ts` asserts the spec types fit the vendored ones; `npx tsc -b` exit 0 on the merged tree (measured, integrator). |
| Supersedes | new |
| Milestone | none |

### D-444 packages/3mf keeps data/, seed/ and scripts/ beside the shim

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The harvest script and the data files stay in fab; `packages/3mf/test/vendored.test.ts` holds them equal to the vendored copies (`filament_presets.json` after mapping save paths to file names). |
| Rationale | `tools/py/orca3mf.py`, the harvest tools and reference builds read `packages/3mf/data` and seed paths; moving them is outside R1-engine-03. |
| Evidence | `git grep packages/3mf/data` hits in tools/py and `reference/sheet/ogee16-r16p-plates/build.ts`; `npx vitest run packages/3mf` 14 files, 258 pass on the merged tree (measured, integrator). |
| Supersedes | new |
| Milestone | none |

### D-445 split-fresh compares by repacking the named commit, plus a HEAD js/ tree check

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `tools/test/split-fresh.test.mjs` archives the hackbuild-3mf commit named by the sha7 in the tgz name, runs npm pack, and compares sha256 with the vendored file. A second test fails when the sibling HEAD js/ tree differs from that commit's. |
| Rationale | npm pack of a fixed commit gave identical bytes twice (computed), so the hash is checkable. The HEAD check is the brief's literal requirement; it fails against hackbuild-3mf main until aa3a173 is merged there. |
| Evidence | Two packs gave 5b5d06a3... (computed, builder). On the merged fab main with sibling hackbuild-3mf at main 73e1120, the HEAD test fails with the merge hint, 2 pass 1 fail (measured, integrator); the old split-fresh test was already red against that sibling on the pre-merge main (measured, integrator). |
| Supersedes | new |
| Milestone | none |

### D-446 The lineage dest of the thin-wall row names the vendored tgz

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. In `lineage/pip.model.json`, row pip.model/haft-9-thin-wall has dest `tools/vendor/hackbuild-3mf-0.1.0-aa3a173.tgz`, and a fix line records the move. Each vendor bump updates this dest. |
| Rationale | `lineage.test.mjs` requires every dest to exist in the repo; the code now lives in hackbuild-3mf `js/src/overrides.ts`. |
| Evidence | lineage.test 'every dest exists' failed before the edit and passed after (measured, builder); `node --test tools/test/lineage.test.mjs` green on the merged tree (measured, integrator). |
| Supersedes | new |
| Milestone | none |

### D-447 The hackbuild-3mf branch for R1-engine-03 is committed outside fab and not merged there

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. hackbuild-3mf commit aa3a173 sits on branch r1/R1-engine-03-r1 in worktree `wt/R1-engine-03-r1-3mf`, on top of main 73e1120, not pushed and not merged into hackbuild-3mf main. |
| Rationale | The brief's step 2 needs js/src brought up to date (fab had gained the thin-wall override) and a commit for the tgz sha7; the brief names a separate worktree for ../hackbuild-3mf. The fab integrator writes only fab main. |
| Evidence | aa3a17395c6c1fcc5a9ff24f7cf70bf31eac3dfe; `git -C hackbuild-3mf branch --contains aa3a173` lists only r1/R1-engine-03-r1 (measured, integrator). |
| Supersedes | new |
| Milestone | none |

### D-448 prismWithEdges is async and loads geom itself

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `prismWithEdges` in `packages/mesh/src/edge-stack.ts` returns `Promise<StackShape>` and calls the cached `loadGeom()`; the geom handle is not a parameter. A build.ts awaits it, which `BuildFn` allows. |
| Rationale | `Author.ring.offset` throws E_KERNEL in this kernel build (`outsideSlice`), so a build.ts has no synchronous offset. The R1-engine-06 brief's signature has no geom field. |
| Evidence | `packages/pipeline/src/author.ts` line 96; `spec/build.ts` `BuildFn` returns `BuildResultAt` or a Promise of it. Not run: no build.ts calls it inside the core build sandbox yet. |
| Supersedes | new |
| Milestone | none |

### D-449 The narrower edge band carries the stack band overlap

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. Of two neighbouring bands from `prismWithEdges`, the one with the larger inset reaches into the other by q((lo+hi)/2) of profile `stack.bandOverlap` (0.0146484375 mm, computed). In the bottom zone the lower band reaches up; in the top zone the upper band reaches down. The wider band keeps both bounds on q(layerTop(i)). |
| Rationale | The union then adds no volume: -0.0160 percent against the analytic volume, the COLLAR prototype row 2a was -0.0151 percent (both computed). The overlap value is the D-313 middle-of-range choice the access switch already uses. |
| Evidence | `packages/mesh/test/edge-stack.test.ts` band bounds and volume cases; `reference/keys/access-switch/build.ts` line 66. |
| Supersedes | new |
| Milestone | none |

### D-450 Edge stack body z must sit on the layer grid

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. For `prismWithEdges` the bottom must be 0 or a layer top and the top must be a layer top, otherwise E_SCHEMA with a hint to snap with `machine.layer`. Adjacent bands with equal snapped inset merge into one band. An inset that splits or empties the outline is E_UNSAT; the generator does not compute an inradius. |
| Rationale | This keeps every band bound on q(layerTop(i)) as the brief requires. A stack band outline holds one outer ring plus holes, so a split section cannot be expressed. |
| Evidence | `packages/mesh/src/edge-stack.ts` layerBounds and insetOutline; `packages/mesh/src/routes/prism.ts` outlineComponents takes outline[0] as the single outer ring. |
| Supersedes | new |
| Milestone | none |

### D-451 The kernel package depends on mesh and geom

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `kernel/package.json` and `kernel/tsconfig.json` gain `@hackbuild/geom` and `@hackbuild/mesh`, and `package-lock.json` was updated through `npm install --package-lock-only`. These files sit outside the R1-engine-06 brief's Writes line. |
| Rationale | The brief requires exporting `prismWithEdges` through `kernel/src/author/index.ts`. `tools/tiers.json` lets the kernel import tier 0. |
| Evidence | `tools/tiers.json` kernel mayImport S, 0, 1, 2; `node tools/tiers.mjs` reports 0 failures on the merged tree (computed, 2026-10-20). |
| Supersedes | new |
| Milestone | none |

### D-452 Page seam for constraint versions is page-build.ts, not ui-core bench core.ts

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The page computes its constraint versions in `reference/keys/*/page-build.ts` with `pageFacts(facts)` from `@hackbuild/registry-loader` (R1-engine-02). `packages/ui-core/src/bench/core.ts` is not edited. |
| Rationale | ui-core `core.ts` never sees PageFacts. The facts flow is `hbf:facts`, then `page-build.ts`, then `createPageBuild`. pipeline cannot import the loader because the loader depends on pipeline, so the per-page entry is the one place left. |
| Evidence | `packages/pipeline/src/page.ts` `createPageBuild` reads `facts.constraints`; `reference/keys/flex-pair/page-build.ts` is the bake entry; ui-core `package.json` has no pipeline dependency. |
| Supersedes | new |
| Milestone | none |

### D-453 The registry loader also depends on chase, for a type

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `registry-loader` edges in `tools/tiers.json` are spec, profile, constraints, circuit, mechanisms, mesh, sim, checks, chase and pipeline; sameTier gets `registry-loader>checks`, `registry-loader>chase` and `registry-loader>pipeline`. |
| Rationale | `chaseRegistries` returns the `ChaseRegistries` type from `@hackbuild/chase`. Declaring the type a second time would make two implementations of one thing. |
| Evidence | `tools/tiers.json`; `node tools/tiers.mjs` reports 0 failures and `tools/test/tiers.test.mjs` 39 of 39 pass on the merged tree (computed, 2026-10-20). |
| Supersedes | new |
| Milestone | none |

### D-454 Imported builds keep a registryHash without exporters

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The import path in `core/src/commands/part-build.ts` still hashes no exporter into registryHash (review finding F3 of R1-engine-02, left unchanged). |
| Rationale | `export.run` takes only a chase (a design dir), so an `import:` build cannot reach `export3mf` and exports nothing. `RegistryEntries` documents exporters as absent where the build exports nothing. Adding 3mf would also move every imported buildHash. |
| Evidence | `core/src/commands/export-run.ts` `runExportRun` requires `input.chase` and calls `buildTarget`; `part-build.ts` `importAudit` returns `artifacts: []` with adapter `none`; `packages/pipeline/src/part-checks.ts` `RegistryEntries.exporters` doc comment. |
| Supersedes | new |
| Milestone | none |

### D-455 The registry loader imports constraintDefs by name

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `packages/registry-loader/src/index.ts` imports `constraintDefs` by name from the six source packages instead of namespace imports, so the clause "a package that exports none contributes nothing" is gone. |
| Rationale | Namespace imports kept whole packages in the page bundle. All six packages export `constraintDefs` today. |
| Evidence | flex-pair bake 4540614 bytes before the change, 4653731 with namespace imports (+113117), 4551510 with named imports (+10896, +0.24%), measured by the builder on 2026-10-20. |
| Supersedes | new |
| Milestone | none |

### D-456 Loaded constraint versions win over the baked fact on drift

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. When the loader's constraint versions differ from the baked fact, `pageFacts` uses the loader's versions and logs the drifting ids with `console.warn`. The baked fact stays one release as a cross-check (`tools/bake/design-facts.mjs` comment). |
| Rationale | The R1-engine-02 brief says to compute the versions in the page and keep the baked fact only as a cross-check that logs a mismatch. |
| Evidence | `packages/registry-loader/src/index.ts` `pageFacts`; the cross-check test in `packages/registry-loader/test/hash.test.ts` asserts no drift today and passes (4 of 4 on the merged tree, computed 2026-10-20). |
| Supersedes | new |
| Milestone | none |

### D-457 PageResult carries registryHash

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `packages/pipeline/src/page.ts` sets `PageResult.registryHash` to `built.inputs.registryHash`. |
| Rationale | The smoke spec and `hash.test.ts` compare registryHash directly instead of through buildHash, so a registry drift names itself. |
| Evidence | `tools/smoke/page-build.spec.ts` checks the page registryHash equals the one `tools/smoke/cli-3mf.mjs` prints; `packages/registry-loader/test/hash.test.ts`. |
| Supersedes | new |
| Milestone | none |

### D-458 Loft and sweep tests sit at packages/mesh/test/ top level

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The R1-engine-08 tests are `packages/mesh/test/loft.test.ts` and `packages/mesh/test/sweep.test.ts`, as the brief's Files line names them, instead of `packages/mesh/test/routes/` next to the other route tests. |
| Rationale | The brief was followed literally. Moving them later is a rename with no behaviour change. |
| Evidence | Brief R1-engine-08 Files line; `packages/mesh/test/routes/` holds the prism, raster, revolve and stack tests. |
| Supersedes | new |
| Milestone | none |

### D-459 Pappus is applied to the section polygon area, not the true circle

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The sweep volume check holds the mesh volume to the 32-gon section area times the quarter arc travelled by its centroid, as the geometry prototype did. |
| Rationale | The mesher is given a polygon. Its own area isolates the sweep error from the circle's facet error, which is -0.64 percent (computed). The sweep error is -0.0118 percent against a 0.05 percent bound (computed). |
| Evidence | `fab-knowledge` evidence proto.mjs line 119, `sweepAnalytic = polyArea(SR, NP) * PR * PI / 2`; `packages/mesh/test/sweep.test.ts`. |
| Supersedes | new |
| Milestone | none |

### D-460 Lineage canonical rows: loft from TENON part2.js, sweep from the geometry prototype

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `mesh.loft/tenon-src` is the canonical row of `lineage/mesh.loft.json`, with source TENON part2.js; the prototype is cited in its fixes text, not as a copy row. `mesh.sweep/geom-proto` is the canonical row of `lineage/mesh.sweep.json`, with source the `fab-knowledge` evidence proto.mjs. |
| Rationale | `tools/test/lineage.test.mjs` needs a canonical `mesh.<route>` row for every route file and refuses a file that is a copy under one subject and canonical under another. No original holds a sweep, so the prototype is the nearest source; the rotation minimizing frame method comes from Wang et al. 2008. |
| Evidence | `tools/test/lineage.test.mjs` lines 103 to 150; the brief's line that the loft ports the TENON revolve skinning pattern. |
| Supersedes | new |
| Milestone | none |

### D-461 Sweep end tangents follow the segment direction

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. In `sweepMesh` each end section is normal to its first or last path segment, and each interior section lies on the bisector of its two segments. There is no end tangent option. |
| Rationale | The input stays a plain polyline. On the 90 deg arc in 48 steps the end sections tilt by half a step, and the volume stays -0.0118 percent from Pappus (computed). |
| Evidence | `packages/mesh/src/routes/sweep.ts` `tangents()`; `packages/mesh/test/sweep.test.ts`. |
| Supersedes | new |
| Milestone | none |

### D-462 Profile corner lineage gets its own subject

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The roundCorner port row is `geom.profile-corner/tenon-src`, kind canonical, in a new fragment `lineage/geom.profile-corner.json`. It is no longer a row under `tenon.kernel`. |
| Rationale | Under `tenon.kernel`, kind copy breaks the D-156 rule (a file canonical in `mesh.revolve` and `mesh.loft` cannot be a copy elsewhere), and kind canonical breaks one canonical row per subject. A new subject per port follows the precedent `mesh.loft` set in R1-engine-08 (D-460). |
| Evidence | `tools/test/lineage.test.mjs`: with `tenon.kernel` kind canonical, "one canonical row per subject" failed; with the new subject, 21 of 21 pass (computed, 2026-10-20). Precedent: `lineage/mesh.loft.json` (commit d78bbcd). |
| Supersedes | new |
| Milestone | none |

### D-463 ogee16.printed port rows stay copy

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `ogee16.printed/geom-profile-chamfer` and `ogee16.printed/mesh-junction` keep kind copy under their own subject. |
| Rationale | `printed.scad` is canonical only under `ogee16.printed` (the r16p row), and a copy under the same subject does not break D-156. `m02-proud-head` already does this. |
| Evidence | A grep of `lineage/*.json` for `printed.scad` finds one canonical row, `ogee16.printed/r16p`; lineage tests pass, 21 of 21 (computed, 2026-10-20). |
| Supersedes | new |
| Milestone | none |

### D-464 M10 pending list in the surface test

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `core/test/surface.test.ts` reads the M10 row of MILESTONES.md 1.3 and lists chase.scaffold, chase.diff, chase.patch, chase.render and chase.bake as pending. Each later card deletes its own entry. |
| Rationale | This follows the existing M01, M04 and M06 pending lists and keeps the expected surface coming from MILESTONES.md instead of a count typed into the test. |
| Evidence | `core/test/surface.test.ts`; adding chase.validate to M10_PENDING fails 2 surface cases (measured, mutant killed by the builder); integrator packet `.hbf-notes/r1/packets/R1-engine-16.txt`. |
| Supersedes | new |
| Milestone | none |

### D-465 flex-pair Q-TIER pointers are /materials/1 and /materials/3

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The flex-pair Q-TIER questions point at /materials/1 (cpla) and /materials/3 (ctpu), not the /materials/2 the brief names. |
| Rationale | materials is a 0-based array: cpla is at index 1 and ctpu at index 3 in `reference/keys/flex-pair/chase.ts`. The brief's /materials/2 reads as a stale index. |
| Evidence | `reference/keys/flex-pair/chase.ts` lines 38 to 43; `core/test/chase-validate.test.ts` lines 24 and 25. |
| Supersedes | new |
| Milestone | none |

### D-466 flex-pair validate exits 2 on the contact.gap E_REF

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. flex-pair validates with one error, E_REF /params/1/fields/0/item/3/constraintDim contact.gap, where the brief says 0 errors. The test pins that single error and says the list empties once something registers contact.gap. |
| Rationale | No ConstraintDef registers contact.gap, so validate reports a real missing reference. Fixing the constraint registry is outside the brief's Writes line. |
| Evidence | `core/test/chase-validate.test.ts` line 22 and header comment line 5. |
| Supersedes | new |
| Milestone | none |

### D-467 claimFns fed from registry-loader, not core

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. ChaseRegistries.claimFns is assigned in packages/registry-loader chaseRegistries; core/src/chase/registries.ts stays the one-line delegate to the loader. |
| Rationale | After R1-engine-02 the registry loader is the one place that assembles the chase registries (one implementation of each thing); brief step 4 names the loader once 02 has merged. |
| Evidence | `packages/registry-loader/src/index.ts` chaseRegistries; `packages/registry-loader/test/hash.test.ts` asserts contact.at, spring.contactTravel, spring.forceAt and spring.peak; the mutant that drops claimFns fails 1 of 4 tests. |
| Supersedes | new |
| Milestone | none |

### D-468 No new spring.curve metric written by R1-engine-11

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. Brief step 2 asked for a spring.curve build metric. R1-engine-11 adds none and reads the spring.curve samples already emitted. |
| Rationale | R1-engine-10 (715db0e) already emits the FE curve samples as metrics from archetypes click.ts; a second emitter would duplicate it and move build hashes. |
| Evidence | `packages/archetypes/src/pip/click.ts`; `packages/checks/src/claims/fns.ts` reads spring.curve.n, dN and FN. |
| Supersedes | new |
| Milestone | none |

### D-469 CHK-CLAIM-01 kept out of the part build registry run

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. CLAIM_CHECKS is excluded from pipeline registryDefs, as IMPORT_PATH_CHECKS is. |
| Rationale | The check reads chase claims, which Part IR does not carry; on a build it would only skip and could move build hashes. |
| Evidence | `packages/pipeline/src/build.ts` registryDefs; core skeleton test 9 pass and pipeline 3 pass on the merged tree. |
| Supersedes | new |
| Milestone | none |

### D-470 Vendored hackbuild-3mf repacked from fee8d2d

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. tools/vendor/hackbuild-3mf-0.1.0-fee8d2d.tgz replaces aa3a173 to add the CLAIM check area to the vendored contracts; hackbuild-3mf main is fast-forwarded to fee8d2d locally, not pushed. |
| Rationale | The R1-engine-03 guard SPEC_CHECK_RESULT_FITS fails when spec CHECK_AREAS gains CLAIM and the vendored contract types lack it. |
| Evidence | sha256 1a0b9622a0e71e2f0edc6eda203923b5101522547a513e41040cc4eb3a7ee239 matches `tools/vendor/SHA256SUMS`; vendor test 2 pass; hackbuild-3mf js vitest 237 pass, 1 skipped on fee8d2d; split-fresh 3 pass after the fast-forward. |
| Supersedes | new |
| Milestone | none |

### D-471 R1-engine-11 round 3 worktree and branch use the -r3 suffix

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The builder used /Users/obsidian/Projects/hackbuild/wt/R1-engine-11-r3 and branch r1/R1-engine-11-r3 instead of the -r1 names in the task text. |
| Rationale | The failure packet and the round note ask for -r3, and r1/R1-engine-11-r1 already exists from an earlier round. |
| Evidence | git branch list shows r1/R1-engine-11-r1, -r2 and -r3. |
| Supersedes | new |
| Milestone | none |

### D-472 noUnion text says imported part(s) with singular agreement (amends D-379)

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `packages/mesh/src/stages.ts` noUnion now reads 'N of M imported part(s) fail(s) the audit (x of y shell groups), first ...' and 'the union of N imported part(s) is refused (y shell groups): ...'. The part-count prefix that D-379 kept is still there. |
| Rationale | The old text produced '1 parts' and '1 of 1 parts fail'. Tests quoting it beside '16 parts' tripped CHK-LNT-03 as two totals for one bill noun. Fixing the string at its source keeps the rule as it is. The core prefix already says 'imported parts'. CHK-LNT-03 matches only a digit directly followed by the noun, so it no longer matches these messages. |
| Evidence | rules-audit failed with CHK-LNT-03 on `core/test/part-build-import.test.ts` and `packages/mesh/test/imported-pieces.test.ts`. After the change rules-audit 9 of 9, part-build-import 23 of 23 and packages/mesh 191 of 191 pass (computed, 2026-10-20). |
| Supersedes | new |
| Milestone | none |

### D-473 Per-fixture piece counts in the import corpus spelled as words

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `tools/corpus/import/MANIFEST.json` outcome text and the `tools/corpus/import/make-pieces.mjs` header now say 'one piece', 'two pieces' and 'one void' instead of digits. |
| Rationale | Each count describes a different fixture, not a hand-kept total. CHK-LNT-03 reads a whole file as one bill and cannot tell them apart, so words avoid a false drift while the rule stays strict. The comment already used 'two shells' and 'five'. |
| Evidence | rules-audit passes. Putting the digits back fails it with CHK-LNT-03 on make-pieces.mjs (mutant killed). No STL sha in MANIFEST.json changed (computed, 2026-10-20). |
| Supersedes | new |
| Milestone | none |

### D-474 No new INFORMATIONAL reason for the spring.curve metrics

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The 49 spring.curve metrics on reference/keys/access-switch stay gated CHK-KEY-04 as the build emits them, so no INFORMATIONAL row was added to `packages/checks/test/metric-gates.test.ts`. The done mutant ungated one curve row instead of removing a reason. |
| Rationale | The brief expected new informational metrics. The recorded diff holds none: every new row carries gate CHK-KEY-04 from 715db0e. The record holds no mesh hash or volume. |
| Evidence | The metric-record diff was 49 added rows, none removed or relabelled. Ungating curve.d5 fails both metric-gates ('neither a gate nor informational (D-075)') and metric-record (computed, 2026-10-20). |
| Supersedes | new |
| Milestone | none |

### D-475 chase.patch writes designs/<name> only

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The writer refuses any `chase.ts` or `build.ts` whose directory, relative to its git top, is not `designs/<name>`. chase.patch returns E_REF; arch.apply returns written false and says why. |
| Rationale | `reference/` holds committed goldens, and test fixtures are not designs. Without this rule, the arch.apply tests (which apply to `reference/conductors/blocks-stud-applied` with exit 0) would switch the branch of the checkout the tests run in. `scaffold --from reference` is the path to a writable copy. |
| Evidence | `core/test/arch-apply.test.ts` lines 58 to 60 and the blocks-stud standards case; the brief risk line "tests must use a temp git repo, never the main checkout". |
| Supersedes | new |
| Milestone | none |

### D-476 A patch is refused only for errors it adds

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The writer compares validation errors before and after the patch by code, path and record, and refuses only when the patch adds one. The card says "a patch that leaves errors is not written", and the writer reads that narrowly. |
| Rationale | `reference/keys/flex-pair` already fails chase.validate with E_REF contact.gap (no ConstraintDef registers it). Under the strict reading the card acceptance, the pointer --set 1.44 exiting 0, could not pass, and no chase with a known error could ever be patched. |
| Evidence | `hbf chase.validate reference/keys/flex-pair --json` gives an E_REF at `/params/1/fields/0/item/3/constraintDim`; the R1-engine-16 commit message records the same. |
| Supersedes | new |
| Milestone | none |

### D-477 Adding an absent object key is internal to arch.apply

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. A pointer naming an absent key of an existing object is E_REF for edits a model writes. arch.apply passes addMembers so it can add `chase.applied` when the chase has none. |
| Rationale | Keeps the spec rule (a pointer that names no node is E_REF with didYouMean) for typos, while arch.apply can still record a first placement. |
| Evidence | `spec/errors.ts` E_REF text; `spec/chase.ts` ChaseSourceSpan lists only replace, `/-` append and remove. |
| Supersedes | new |
| Milestone | none |

### D-478 chase.patch branch order and git failures

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. If `hbf/<chase>` exists, the writer checks it out before planning, so the edits apply to that branch text. If it does not exist, the writer creates it from HEAD only after the patch validates. A git checkout failure is E_REF with record `chase-patch/write` and the first line of the git message; there is no git-specific error code. |
| Rationale | A refused patch never creates a branch, and an existing branch is never patched against the wrong text. |
| Evidence | `core/test/chase-patch.test.ts`: after the E_STALE and schema refusals the branch stays main and no `hbf/*` branch exists. |
| Supersedes | new |
| Milestone | none |

### D-479 patches.jsonl location and staging

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The log lives at `<git top>/.hbf/patches.jsonl` and is not staged; only the `chase.ts` or `build.ts` is staged. The revert field is the id of the latest entry whose inverse equals the edits of this patch, otherwise null. The entry id is a 12-hex hash over the entry count and the entry. |
| Rationale | M12-T13 undo sends the recorded inverse as a new chase.patch, and the log must mark that entry as a revert. `.hbf/` is gitignored in this repository. |
| Evidence | `docs/plan/milestones/M12-app-mcp.md` lines 1125 to 1142. |
| Supersedes | new |
| Milestone | none |

### D-480 chase.patch output adds defHashBefore

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. Added defHashBefore to the chase.patch output in `spec/commands.ts`. |
| Rationale | Card step 3 says the command reports the defHash before and after; the spec output carried only defHash. |
| Evidence | `M10-chase.md` T05 step 3. |
| Supersedes | new |
| Milestone | none |

### D-481 New CLI flag kind edit

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. Added an `edit` flag kind: --anchor/--replace and --pointer/--set build one edit, and --set is parsed as JSON when it parses, otherwise kept as a string. --edits still takes a JSON list. |
| Rationale | The card acceptance lines use --anchor and --pointer --set, and the CLI form mapped each flag to its own input field. |
| Evidence | `M10-chase.md` T05 acceptance; `packages/commands/src/spec.ts` FlagKind. |
| Supersedes | new |
| Milestone | none |

### D-482 drive.tilt equality uses the flex-pair goldens, not a TOGGLE fixture

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The equality test runs on reference/keys/flex-pair (Part IR, CHK-NET-29 report, build.ts contact) with the DriveDecl gesture set to tilt. The TOGGLE-shaped stick decl in spec/fixtures/gold.ts is checked only for shape equality. |
| Rationale | No TOGGLE build has a Part IR or goldens (designs/toggle has only legacy html). padModel reads no gesture, so the flex-pair goldens hold real reads. |
| Evidence | `designs/toggle` holds README.md and legacy/ only; `packages/ui-core/test/widgets.test.ts` header. |
| Supersedes | new |
| Milestone | none |

### D-483 drive.tilt accepts gestures tilt and stick only, and fn must equal the pad's contact

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. A hold or slide pad gives a problem that points to drive.press. A widget fn other than DriveDecl.contact gives a problem. |
| Rationale | Plan 3.2 splits drive.tilt (TOGGLE stick) from drive.press (keys). One function for the pad and the widget keeps G-20 agreement. |
| Evidence | `packages/ui-core/src/widgets/tilt.ts`. |
| Supersedes | new |
| Milestone | none |

### D-484 BENCH.widgets() lives on the ui-core PageHook, not on spec BenchHook

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. PageHook = BenchHook & { widgets() } in `packages/ui-core/src/bench/hook.ts`; spec/hook.ts is unchanged. |
| Rationale | spec/hook.ts is outside the brief's Files list, and hook.test.ts keys every BenchHook member through Required<BenchHook>. Adding the member to the spec contract is an owner-visible spec change. |
| Evidence | `packages/ui-core/test/bench/hook.test.ts` line 95. |
| Supersedes | new |
| Milestone | none |

### D-485 ParamRef is { param: JSON pointer }

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. spec/widgets.ts defines ParamRef as { readonly param: string }, a JSON pointer into params. |
| Rationale | The brief names ParamRef but no such type existed. A JSON pointer matches StageTool.writes. |
| Evidence | grep ParamRef spec/*.ts returned nothing before this change. |
| Supersedes | new |
| Milestone | none |

### D-486 Absent widgetKinds reads as empty, and core does not feed it yet

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. resolveBenchRefs treats a missing ChaseRegistries.widgetKinds as an empty list, so every bench widget is E_REF at hbf chase.validate until core supplies the list. |
| Rationale | This matches claimFns (nothing passes unresolved). tools/tiers.json forbids core and registry-loader from importing ui-core, where the registry lives. |
| Evidence | `tools/tiers.json` edges for core and registry-loader; `packages/chase/test/widgets.test.ts`. |
| Supersedes | new |
| Milestone | none |

### D-487 Widget registry stays out of the @hackbuild/ui public exports

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. packages/ui/src/index.ts is unchanged. |
| Rationale | exports.test.ts pins the public list from the R1-engine-04 brief. |
| Evidence | `packages/ui/test/exports.test.ts` EXPECTED. |
| Supersedes | new |
| Milestone | none |

### D-488 Two files outside the brief's Files list were edited

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. packages/chase/src/validate.ts (one call to resolveBenchRefs) and packages/ui/src/bench/entry.ts (wires widgets() into mountBench). |
| Rationale | Step 4 needs the rule to run inside chase.validate. Step 3 needs a real bench hook to return widgets for the smoke suite. |
| Evidence | git show 740c90d --stat. |
| Supersedes | new |
| Milestone | none |

### D-489 chase.diff output carries migrations and both defHashes in spec

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The chase.diff output in `spec/commands.ts` gains `migrations` {against, chase} (each from, to, lines), `defHashBefore` and `defHashAfter`. `ChaseChange` gains `op` (added, removed or changed), with from or to set to null on the missing side. `ChaseVerdictChange` gains `target`. |
| Rationale | M10-T04 step 4 asks for the migrations applied, the defHash before and after, and added, removed or changed entries; the old shape had no field for any of them. A check can fire on several targets, so target tells repeats apart. |
| Evidence | `docs/plan/milestones/M10-chase.md` lines 588 to 594; `spec/commands.ts` ChaseChange, ChaseMigrations, chase.diff (merge of r1/R1-engine-17). |
| Supersedes | new |
| Milestone | none |

### D-490 chase.diff against defaults to HEAD; an existing path wins over a git ref

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. When against is absent, chase.diff compares with HEAD. When against names an existing path on disk it is read as a file, and a directory means its chase.ts; otherwise it is a git ref. A ref starting with '-' is refused as E_REF. |
| Rationale | `docs/plan/AGENT-SURFACE.md` row 7 makes against nullable for diff, and the work tree against the last commit is the useful default. The '-' refusal keeps option text from reaching git. |
| Evidence | `docs/plan/AGENT-SURFACE.md` line 457; `core/src/commands/chase-diff.ts` runChaseDiff and refSide. |
| Supersedes | new |
| Milestone | none |

### D-491 Which build module each side of chase.diff uses

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The chase side builds as its own design. A file side builds in its own directory when its build module is there, and otherwise with the chase directory's build module. A git ref builds the ref's chase with the work tree's build module, and its defHash uses each source as the ref holds it. When the ref's build sources differ from the work tree, --build is E_STALE naming the moved files. |
| Rationale | The ref's old build.ts is not on disk, and building the ref's chase with the new build.ts would report verdicts that no commit ever produced. |
| Evidence | `core/src/commands/chase-diff.ts` header comment; HEAD~0 gives equal defHash before and after (computed). The E_STALE path has no test yet. |
| Supersedes | new |
| Milestone | none |

### D-492 chase.diff fixture is generated in the test, and the card's 1.44 is kept

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The diff fixture is not a committed copy of the flex-pair chase. The test writes two variants under .hbf/ with chase.patch's pointer edit at the travel default, one at 1.44 and one at 2.15, matching the card's literal pair. The reference default stays 1.84 (D-241). |
| Rationale | A committed copy of the reference chase would drift when the reference changes; generating it from the reference keeps one source. Keeping the card's 1.44 makes the acceptance numbers match as written. |
| Evidence | `core/test/chase-diff.test.ts`; `reference/keys/flex-pair/chase.ts` line 57 default 1.84; CHK-KEY-01 interval 1.428 to 2.04 mm (computed). |
| Supersedes | new |
| Milestone | none |

### D-493 Parity verdict comparison shared with chase.diff

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `parity.ts` verdictFlips now maps from a new exported verdictPairs(before, after), and chase.diff reads the same pairs. The edit.json shape is unchanged. |
| Rationale | Keeps one implementation of the verdict comparison, and the diff needs the before measured value, which the parity golden form drops. |
| Evidence | `core/src/commands/parity.ts` verdictPairs; core vitest including the parity tests passes on the merged tree (computed). |
| Supersedes | new |
| Milestone | none |

### D-494 A taken name is E_SCHEMA, not a new E_EXISTS code

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. chase.scaffold refuses a name whose `designs/<name>` exists on disk or on branch `hbf/<name>` with E_SCHEMA at /name. It adds no error code. |
| Rationale | `spec/errors.ts` has no E_EXISTS. R1-engine-23 (init) plans to add it, and scaffold can move to it then. |
| Evidence | `spec/errors.ts` ERROR_TRANSPORT list; `core/test/chase-scaffold.test.ts` 'a taken name' case (merge of r1/R1-engine-19). |
| Supersedes | new |
| Milestone | none |

### D-495 derivedFrom only when the source has a golden

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. reference: and design: sources set meta.derivedFrom from `<source>/expected/build.json` when it exists. draft: sources and designs without a golden get no derivedFrom. |
| Rationale | The schema requires a buildHash, and a draft has none. R1-engine-25 adopt stores the draft export as its golden separately. |
| Evidence | `packages/chase/src/schema.ts` metaSchema derivedFrom; `core/src/commands/chase-scaffold.ts` goldenHash. |
| Supersedes | new |
| Milestone | none |

### D-496 A copy may keep its source's errors

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. As D-476 does for chase.patch, a from-copy is refused only for validation errors it adds. The minimal scaffold must give 0 errors. |
| Rationale | `reference/keys/flex-pair` already fails with E_REF contact.gap, so a strict rule would make the pair-copy acceptance impossible. |
| Evidence | `hbf chase.validate reference/keys/flex-pair` gives E_REF /params/1/fields/0/item/3/constraintDim. |
| Supersedes | new |
| Milestone | none |

### D-497 Generate from legal through the dim-form solver only

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. A numeric default with a registered constraintDim is moved to the nearest on-step value inside range and interval. The interval comes from solve() with the chase's first material and machine and empty facts. A dim that throws, is unsat or is in another unit keeps the source default. |
| Rationale | The param-form solver needs a build of the copy before it exists. Most dims need build facts, so the move is narrow today. No test yet copies a source whose default moves; legalDefault unit cases cover the move. |
| Evidence | `hbf constraints.query conductor.width --material cpla` gives E_PARAM_MISSING pitchMm; `packages/chase/src/scaffold/index.ts` legalDefault. |
| Supersedes | new |
| Milestone | none |

### D-498 Minimal build makes a disc instead of throwing

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The v3 template build threw 'implement'. The scaffold build returns one PETG disc of diameter d, layerTop(7) thick (1.93 mm on ffc5p, computed; the eight-layer count is an inferred placeholder). |
| Rationale | Without this, the first part.build of a new design fails. The thickness reads the machine's layer grid from profile and adds no physical constant of its own. |
| Evidence | `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/scaffold/designs/_template/build.ts`; `lineage/chase.scaffold-template.json`. |
| Supersedes | new |
| Milestone | none |

### D-499 Composer scaffold returns one part

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. composer differs from single only in meta.kind, with the rail ending in print as the card says. Its build returns a PartDraft. |
| Rationale | No build path in kernel or core reads an AssemblyDraft yet. |
| Evidence | grep for AssemblyDraft in `kernel/src`, `core/src` and `packages/*/src` finds no consumer. |
| Supersedes | new |
| Milestone | none |

### D-500 Writes go to designs/<name> under the git top of the cwd

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The target is `<git top of cwd>/designs/<name>`. Sources resolve from the workspace root (design: also tries the git top first). Outside a git work tree the command gives E_REF. |
| Rationale | This lets tests run in throwaway repos under `.hbf/` without moving the branch of the checkout, as chase.patch does (D-475). |
| Evidence | `core/test/chase-scaffold.test.ts` asserts ROOT HEAD unchanged. |
| Supersedes | new |
| Milestone | none |

### D-501 The host passes claim functions in; ui-core does not import packages/checks

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `WidgetBuild` gains `claimFns`: a record of claim id to entry, typed structurally as `WidgetClaimFn` so the `packages/checks` registry entry fits as is. The test passes `claimFn('spring.forceAt')` from `@hackbuild/checks`, the same object CHK-CLAIM-01 calls. |
| Rationale | Importing checks from ui-core src would pull checks, sim and mesh into every bench bundle. Bakes already get checks through the page build script (D-264). Both widgets and the check still call one function object, so the agreement rule (G-20) holds. |
| Evidence | `packages/ui-core/src/widgets/press.ts` `WidgetClaimFn` and `claimBinding`; `reference/keys/access-switch/bench.entry.ts` comment on D-264. |
| Supersedes | new |
| Milestone | none |

### D-502 How a widget picks its claim, target and cursor

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. A claim widget reads the claim whose id equals the widget id, otherwise the only claim calling the widget's fn; anything else is a named problem. The drive target is the one whose metric prefix equals the claim's `at` arg. The press travel comes from `WidgetBuild.travelMm` (one press per bench in release 1), then `inputs.travelMm`, then the claim's own `travelMm`. plot.curve uses the same travel as its cursor. |
| Rationale | `WidgetDecl.inputs` holds only numbers and param refs, so a claim id or a widget-to-widget link cannot be declared there. One stimulus per build matches the access switch. |
| Evidence | `packages/ui-core/src/widgets/press.ts` `claimBinding`, `claimTarget`, `pressTravel`; `packages/ui-core/src/widgets/registry.ts` `WidgetBuild`. |
| Supersedes | new |
| Milestone | none |

### D-503 One plot drawing for both the rail panel and the widget

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The SVG template moved from `CurvePanel.vue` to `widgets/PlotCurve.vue`, which takes a `CurveView` plus lines. CurvePanel wraps it. The contact search and the `CurveView` types moved to ui-core `widgets/curve.ts`; `panels/curve.ts` re-exports them and keeps `curveSvg`, so the lineage dest is unchanged. |
| Rationale | House rule: one implementation of each thing. Existing panel tests and the access-switch test pass unchanged. |
| Evidence | `lineage/pip.bench-part3.json` row `pip.bench-part3/ui-curve-panel`; `packages/ui/test/curve.test.ts` passes. |
| Supersedes | new |
| Milestone | none |

### D-504 Band line qualifier

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The plot.curve band line reads 'claim <id> band lo to hi N, inferred until a coupon backs it'. |
| Rationale | The band is the chase's declared target, not a measurement. Inferred is the honest qualifier until evidence rows exist. |
| Evidence | `packages/ui-core/src/widgets/curve.ts` `plotLines`. |
| Supersedes | new |
| Milestone | none |

### D-505 access-switch typecheck gains the DOM lib

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. Added lib `[ES2023, DOM]` to `reference/keys/access-switch/tsconfig.json`. This file is outside the brief's Writes line. |
| Rationale | Since TypeScript 5.5, ui-core's .d.ts files no longer carry `/// <reference lib="dom" />`. The access-switch bench test reaches them through `panels/curve.ts`. The alternative was adding `preserve="true"` to five ui-core DOM files. |
| Evidence | `tsc -b` error TS2304 Element/HTMLElement in `packages/ui-core/dist/*.d.ts` before the change; exit 0 after. |
| Supersedes | new |
| Milestone | none |

### D-506 Test-local ContactFn and placement prefix on the click-spring-window fixture

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The click-spring-window reference exports no ContactFn and writes no spring curve metrics. The test therefore builds the metrics as item 11's claims test does, prefixes them with `click-spring-key.0` the way the kernel places an archetype, and uses a ContactFn that closes at `spring.cg` with its stop at the last curve sample. |
| Rationale | The brief names this fixture. The only other design with a contact function (access-switch) needs a `paddle.travel` metric the fixture does not have. |
| Evidence | `packages/ui-core/test/widgets-press.test.ts` header. |
| Supersedes | new |
| Milestone | none |

### D-507 widgetsModel takes a WidgetView carrying claimFns and travelMm

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. ui-core `bind.ts` exports `WidgetView` (BuildView plus optional `claimFns` and `travelMm`). `widgetsModel` is the only builder of widget records and passes `chase.claims`, `claimFns` and `travelMm` into `widgetRecords`. In packages/ui, `WidgetSource` extends `WidgetView` and `widgetsOf` calls `widgetsModel`. |
| Rationale | Keeps one implementation of the widget records without dropping the R1-engine-13 claim threading that main's `widgetsOf` carried. |
| Evidence | `packages/ui-core/src/chase/bind.ts` widgetsModel; `packages/ui/src/widgets/registry.ts` widgetsOf; the claimFns mutant is killed by `packages/ui-core/test/chase/bind.test.ts`. |
| Supersedes | new |
| Milestone | none |

### D-508 BindOptions gains claimFns and a travel getter

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `bindChase` takes optional `claimFns` (claim registry entries by id) and `travel: () => number \| undefined`. `widgets()` reads both on every call. |
| Rationale | `BENCH.widgets()` takes no arguments, so the current press travel has to come from the host through a getter. Main's `entry.ts` supplied neither, so today's pages behave the same as before. |
| Evidence | `packages/ui-core/src/chase/bind.ts` BindOptions and widgets(); the bind.test travel 0.25 to 1.2 case (hand computed, not measured). |
| Supersedes | new |
| Milestone | none |

### D-509 loft and sweep refuse a stage 6 inset

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. A loft or sweep body with an inset role (flex-conductor, flex, conductor, art) is refused with E_KERNEL, expected `no stage 6 inset on a <route> body`. The same applies when such a body is a csg operand. |
| Rationale | An offset of a section ring changes its point count, so loft rings can no longer be joined point for point. The imported route already refuses the inset. |
| Evidence | `packages/mesh/src/stages.ts` noInset; test `refuses a stage 6 inset on a loft insert` in `packages/mesh/test/routes-loft-sweep-hull.test.ts` (computed, 2026-10-20). |
| Supersedes | new |
| Milestone | none |

### D-510 hull takes the stage 6 inset on every operand

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. csg hull insets every operand, as union and intersection do, and then hulls the result. |
| Rationale | Hulling the shrunk operands keeps the result inside the original hull, so an insert cannot grow. |
| Evidence | `packages/mesh/src/stages.ts` csg build comment and operand inset choice. |
| Supersedes | new |
| Milestone | none |

### D-511 part.build proof for loft, sweep and hull is a manual CLI run plus a mesh test

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The mesh test runs the loft-sweep-hull fixture build.ts with a stub author (body, part, ring.circle from geom) through runStages. The part.build run is recorded as a manual CLI verification and is not a vitest case. |
| Rationale | @hackbuild/kernel depends on mesh, and core is a higher tier, so a mesh test cannot import either one without breaking `tools/tiers.json`. |
| Evidence | `kernel/package.json` dependencies; `tools/tiers.mjs` edge rules; `hbf part.build packages/mesh/test/fixtures/loft-sweep-hull --json` verdict pass, 12 pass, 0 fail, 44 skip (computed, builder run 2026-10-20). |
| Supersedes | new |
| Milestone | none |

### D-512 bambu-studio extraArgs track the harness time limit

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `extraArgs` in each `SLICERS` row of `tools/slice/orca-family.mjs` is a function of the run options. For bambu-studio it returns `['--mstpp', ceil(timeLimitS)]`, so the slicer's own per-plate cap equals the harness kill limit; the other rows return `[]`. |
| Rationale | A fixed `--mstpp` value would disagree with `--time-limit`. Tying the two lets Bambu Studio stop by itself before the harness kills it. The flag comes from the vendor docs and is unverified here, since no Bambu Studio is installed (measured). |
| Evidence | `fab-knowledge:plan-v5/slicers.md` Bambu Studio section (vendor); `tools/slice/orca-family.mjs` `SLICERS['bambu-studio']`; `tools/test/orca-family.test.mjs` args test fails when extraArgs returns `[]` (mutant killed, measured). |
| Supersedes | new |
| Milestone | none |

### D-513 Owner profile guard extended to the new slicers

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `ownerProfileDirs` is the union of each `SLICERS` row's `profileDirs`. This adds `BambuStudio`, `Snapmaker_Orca` and `Snapmaker Orca` to the five Flash Studio names. The added names are inferred. |
| Rationale | A fresh datadir must never overlap the owner's profile of any slicer the driver can run. The only change in behaviour is more refusals; the five existing names still refuse as before. |
| Evidence | `tools/test/slice.test.mjs` datadir test passes on the merged tree (measured); `tools/slice/orca-family.mjs` `ownerProfileDirs`. |
| Supersedes | new |
| Milestone | none |

### D-514 Version regexes for the unverified slicer rows are inferred from the Flash Studio log line

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The orcaslicer, bambu-studio and snapmaker-orca rows match `Current <AppName> Version (\S+)`, following the measured `Current Orca-Flashforge Version` line of Flash Studio. A miss stays `unknown`. |
| Rationale | These forks share the Orca CLI logging. No binary is installed to measure the real line, so the pattern is inferred and a miss degrades to `unknown` instead of a wrong version. |
| Evidence | `tools/slice/orca-family.mjs` `SLICERS` versionRe comments; Flash Studio run record appVersion 1.7.14, cliVersion 2.3.2 (measured, builder run). |
| Supersedes | new |
| Milestone | none |

### D-515 probe reports cliVersion unknown

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `probe` in `tools/slice/orca-family.mjs` never launches the slicer, so its `cliVersion` is always `unknown`. Only a slice log names the CLI version, and the run record carries it. |
| Rationale | The brief says probe works without slicing, and the CLI prints its version only in the `--debug 3` log of a run. |
| Evidence | `tools/slice/orca-family.mjs` `probe`; `tools/test/orca-family.test.mjs` missing-app probe test (measured). |
| Supersedes | new |
| Milestone | none |

### D-516 The finger pot (GIB, canonical) stands in for the BLOCKS SLIDER fixture

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `drive.fader` is proven on the GIB finger-pot case in `packages/archetypes/test/legacy/gib.json`, with the original's `simFinger` recorded in place. No BLOCKS SLIDER build was used. |
| Rationale | MECHANISMS.md names GIB `buildFinger` as the canonical finger pot, with BLOCKS SLIDER as its brick form. blocks.md row 453 lists the BLOCKS slider archetype variants as MISSING, and the BOSS/BLOCKS pot element was never ported into circuit. |
| Evidence | `knowledge/designs/MECHANISMS.md` line 48; `knowledge/designs/blocks.md` lines 284 to 288 and 453; `fab-knowledge/originals/gib/files/src/src/part2.js` lines 431 to 436. |
| Supersedes | new |
| Milestone | none |

### D-517 What WidgetDecl.fn names for drive.touch, drive.fader and readout.signal

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. For `drive.touch`, fn is `CHK-NET-29`. For `drive.fader`, fn is the finger-pot metric prefix, for example `finger-pot.0`. For `readout.signal`, fn is a hookup port id. The `spec/widgets.ts` fn doc comment says so. |
| Rationale | None of the three calls a claim function or a ContactFn, and `WidgetDecl.inputs` holds only numbers or param refs, so fn is the only string binding available. |
| Evidence | `spec/widgets.ts` `WidgetDecl.fn`; `packages/ui-core/src/widgets/touch.ts`, `fader.ts` and `signal.ts`. |
| Supersedes | new |
| Milestone | none |

### D-518 The fader divider and ADC formulas live in ui-core and are held to circuit by test

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `wiperV` and `adcCounts` are written in ui-core, and `widgets-fader.test.ts` holds them to circuit `dividerV` and `fullScaleCounts`. Touch reuses `chargeReleaseLevels` from `drive.ts`. |
| Rationale | The bake cannot import `@hackbuild/circuit`, whose index loads manifold. `drive.ts` already follows this pattern against `floatPoint`. `simFinger` had no TS port before this change. |
| Evidence | `packages/ui-core/src/drive/drive.ts` header comment; `packages/ui-core/package.json` lists circuit as a devDependency only. |
| Supersedes | new |
| Milestone | none |

### D-519 Charge-release return rail taken from the drive level

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. A charge-release pin returns to VDD when it is driven low and to ground when it is driven high. |
| Rationale | The CHK-NET-29 record does not name the return port. The read model drives the pin away from its active level, and the PIP touch pads (drive low, 3V3 common) agree with the golden points (computed). |
| Evidence | `spec/circuit.ts` ReadModel charge-release drive doc; `reference/electrical/pip-drive` `chase.ts` scene.drive return 3V3 for touch. |
| Supersedes | new |
| Milestone | none |

### D-520 Widget stimuli keyed by port and by pot prefix

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `WidgetBuild.closed` lists the hookup ports that are closed now. `WidgetBuild.positions` is keyed by finger-pot prefix, so a fader and a signal readout of the same pot always agree. |
| Rationale | Models do not see each other's declarations; keying the position by the pot itself gives one source for both widgets. |
| Evidence | `packages/ui-core/src/widgets/registry.ts` `WidgetBuild`. |
| Supersedes | new |
| Milestone | none |

### D-521 chase.bake output keeps the spec field name hash

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The result is `{file, bytes, hash}`, as `spec/commands.ts` declares, not `{file, bytes, sha256}` as the card text says. `hash` is the lowercase sha256 hex of the file bytes. |
| Rationale | Renaming a declared CommandIO output field touches the spec contract and MCP output for no gain; the Hash brand already means lowercase sha256. |
| Evidence | `spec/commands.ts` chase.bake output; `spec/ids.ts` Hash doc; `core/test/chase-bake.test.ts` compares hash to `shasum -a 256` (measured). |
| Supersedes | new |
| Milestone | none |

### D-522 mode draft is refused rather than ignored, and is bakeMode over MCP

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. chase.bake takes `mode` `page` or `draft`; `draft` returns E_SCHEMA at `/mode` until R1-engine-24. On the `chase_bake` MCP tool the field is `bakeMode`, because the tool selector is already named `mode`. |
| Rationale | Ignoring draft silently would produce a release page with no DRAFT markings. The rename follows the nest.pack `nestMode` precedent. |
| Evidence | `core/src/mcp/schema.ts` FIELD_RENAMES; `spec/commands.ts` BakeArgs; test `refuses mode draft` (measured). |
| Supersedes | new |
| Milestone | none |

### D-523 from-chase also writes bench.entry.ts and page-build.ts when absent

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. Beyond `bake.json`, a design without these files gets plain ones. The entry mounts chase and bench with no ContactFn. The page build runs `createPageBuild({chase, module, facts})` with no draft kinds. Existing files are never touched. |
| Rationale | The manifest names both files, and scaffolded, drafted or adopted designs have neither, so without them chase.bake could not bake those designs. |
| Evidence | `tools/bake/from-chase.ts`; the test that writes bake.json, the entry and the page build into an access-switch copy and bakes it (4755596 bytes, measured). |
| Supersedes | new |
| Milestone | none |

### D-524 Generated bake title is the directory name

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. Manifest id and title are both `basename(dir)`, so the generated manifest equals the committed flex-pair one exactly. The committed access-switch manifest has a hand-set title, `access switch`, and is not regenerated. |
| Rationale | The acceptance requires the M09 flex-pair hash when the manifest is unchanged. |
| Evidence | Byte-for-byte test against `reference/keys/flex-pair/bake.json` (measured). |
| Supersedes | new |
| Milestone | none |

### D-525 Off-file check added to the baker, scripts excluded

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `tools/bake/bake.mjs` fails on src, srcset and poster attributes and CSS url() that point to http(s) or protocol-relative URLs, outside script blocks. Script text and anchors are not checked. |
| Rationale | D-129 requires zero network at load. Library code carries URL strings it never fetches, such as the SVG namespace, so scanning scripts would refuse valid pages. Script-side requests are left to the smoke runner network count (item 22, not run). |
| Evidence | `tools/bake/bake.mjs` offFileRequests; `tools/bake/test/bake.test.mjs` case; all four committed bakes still pass (measured). |
| Supersedes | new |
| Milestone | none |

### D-526 Licence row for hackbuild-3mf added outside the brief file list

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. Added a `tools/licences.json` row for hackbuild-3mf 0.1.0: MIT, bundled, D-043, with evidence from the lock entry and the tarball LICENSE. |
| Rationale | Since R1-engine-03, main failed `licences --check` and every ui bake. Without the row the acceptance could not run. |
| Evidence | Before: `bake: licence manifest: hackbuild-3mf@0.1.0 is inlined and has no row in tools/licences.json`. After: licences pass, 383 rows (counted). |
| Supersedes | new |
| Milestone | none |

### D-527 No lineage row for from-chase

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. No lineage fragment written for `tools/bake/from-chase.ts`. |
| Rationale | from-chase copies the in-repo M09 flex-pair manifest, not an original or a knowledge design. The baker lineage, pip.baker and cotter.baker, already covers bake.mjs. |
| Evidence | `lineage/pip.baker.json`; byte-for-byte test against the committed flex-pair manifest (measured). |
| Supersedes | new |
| Milestone | none |

### D-528 drive.code maps a wrong dialed code to tumbSolve's WRONG input

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The widget calls the gate with KEY set to the insertion and WRONG set to 1 when any dialed digit differs from the cut code. It does not compare each pin against its own digit. |
| Rationale | tumbSolve only ever reads the one cut code, so its only wrong-key input is the original's WRONG KEY switch. Calling the gate unchanged keeps the widget and the check on one function. The cost: a wrong code always shows pin 2 failing, whichever digit is wrong, as in the original's illustration. |
| Evidence | `tumbler.html` lines 473 to 484 (tumbSolve) and line 1714 (the SIMS inputs KEY and WRONG); `packages/ui-core/src/widgets/code.ts` |
| Supersedes | new |
| Milestone | none |

### D-529 The host passes the code gate in, already bound to the build's params

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. WidgetBuild.gates holds a WidgetCodeGate per fn id: the cut digits, the top digit and a solve(u) function. ui-core does not import @hackbuild/mechanisms. |
| Rationale | This follows the claimFns pattern from R1-engine-13. ui-core does not depend on mechanisms, and a gate depends on the current params, which WidgetBuild does not carry. |
| Evidence | `packages/ui-core/package.json` dependencies; `packages/ui-core/src/widgets/press.ts` header |
| Supersedes | new |
| Milestone | none |

### D-530 view.light rests at PIP's key light and only aims that light

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. Azimuth and elevation move the key DirectionalLight at its own distance; fill and rim stay put. The elevation range is 0 to 90 degrees (inferred). The range step is 1 degree (inferred). |
| Rationale | No original in fab-knowledge/originals has a light control that moves (checked coin, collar and others with grep), so the widget builds on the ported key light rather than inventing a new rig. |
| Evidence | pip-controller `bench/part3.js` line 16; `packages/ui-core/src/viewer/scene.ts` LIGHTS |
| Supersedes | new |
| Milestone | none |

### D-531 The netlens lens ghosts every body not on the lit net

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. In lens mode, bodies off the lit net, including bodies with no net, draw at the existing ghost opacity, XRAY_GHOST (0.13). Lens is off in plate mode. |
| Rationale | This reuses the existing xray ghost opacity, so no new number is introduced. |
| Evidence | `packages/ui-core/src/viewer/scene.ts` draw() |
| Supersedes | new |
| Milestone | none |

### D-532 seeed tier is vendor only for Seeed's own products

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. A `catalog.find --fetch seeed` row is tier vendor when its path starts with `Seeed Studio ` or it is a root `XIAO*.kicad_mod` file. Under `Seeed Fusion Component Libraries for KiCad/OPL_*` it is tier community. |
| Rationale | `parts-sources.md` section 3 says a footprint from the part maker's own library is vendor. The OPL_* folders hold other makers' parts (switches, ICs, passives) drawn by Seeed Fusion. |
| Evidence | `git ls-tree` of OPL_Kicad_Library at b0035c51 (measured 2026-10-20): 13 OPL_*.pretty folders plus the Seeed Studio XIAO Series Library, Wio folders and a root XIAO-STM32C5-SMD.kicad_mod. `core/test/catalog-fetch-sources.test.ts`; a mutant setting the rule to community fails 2 of 8 tests (measured by the builder). |
| Supersedes | new |
| Milestone | none |

### D-533 a catalog fetch clone with the wrong origin is refused

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `fetchKicadRows` throws E_KERNEL when the clone's origin differs from `FETCH_SOURCES[source].origin` in `core/src/catalog-fetch.ts`, and writes nothing. |
| Rationale | A row's source must name the library its bytes came from. A stale or edited clone would otherwise give false provenance. |
| Evidence | `core/test/catalog-fetch-sources.test.ts`, test "a clone whose origin is not the library's". |
| Supersedes | new |
| Milestone | none |

### D-534 fetched catalog rows pass the catalog loader before any write

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. Each row built by a catalog fetch goes through `loadRow` with `KICAD_RESOLVERS` on an in-memory file set before anything is written. A refusal stops the fetch, keeping the existing all-or-none rule. |
| Rationale | The first network run wrote XIAO-RP2040-DIP rows that the loader refuses (pad 1 listed twice), which breaks every later `catalog.find` in that workspace. |
| Evidence | `.hbf-notes/fetch-rp2040.log` in the builder worktree (measured 2026-10-20), and the test "pad 1 listed twice ... nothing written" in `core/test/catalog-fetch-sources.test.ts`. |
| Supersedes | new |
| Milestone | none |

### D-535 catalog fetch stays all-or-none over refused footprints

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. A fetch whose hits include one footprint the catalog cannot read writes nothing, so `catalog.find XIAO --fetch seeed` is refused (E_SCHEMA, pad shape custom). The R1-designs-reach-04 done condition was met on the narrower query `XIAO-RP2040-SMD`, which writes 1 vendor row. Skipping refused footprints instead is left to the owner. |
| Rationale | The M08-T14 test "the fetch stops and the first row is not written" fixes this behaviour, and changing it is the owner's call. |
| Evidence | `.hbf-notes/net.log` in the builder worktree (measured 2026-10-20). |
| Supersedes | new |
| Milestone | none |

### D-536 recorded kicad fetch tests name the gitlab origin

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The origins in `core/test/catalog-commands.test.ts` changed from the GitHub mirror to `https://gitlab.com/kicad/libraries/kicad-footprints.git`. |
| Rationale | `--fetch kicad` now requires the gitlab origin, and commit 7ebfa6b2 is a commit of the gitlab repository too. |
| Evidence | The gitlab API `/projects/kicad%2Flibraries%2Fkicad-footprints/repository/commits/7ebfa6b2...` returned the commit (measured 2026-10-20 by the builder). |
| Supersedes | new |
| Milestone | none |

### D-537 catalog.find fetch copy split between the description and the field describe

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The `catalog.find` description keeps one sentence about fetch: both libraries and their tier rule. The note that each fetched row records its origin, commit and licence moves to the `fetch` field's describe in `packages/commands/src/defs/catalog-find.ts`. |
| Rationale | The contract caps a command description at 120 words; the round 1 sentence took `catalog.find` to 144 (measured). |
| Evidence | `core/test/contract.test.ts` passes on the merged tree (measured 2026-10-20); `packages/commands/src/defs/catalog-find.ts`. |
| Supersedes | new |
| Milestone | none |

### D-538 the seeed fetch example queries XIAO-RP2040-SMD

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The seeed example in the `catalog.find` def queries `XIAO-RP2040-SMD` instead of `XIAO`. |
| Rationale | The query `XIAO` is refused for a custom pad shape and writes nothing (D-535); `XIAO-RP2040-SMD` writes one vendor row. |
| Evidence | Builder network run 2026-10-20 (measured): `seeed-xiao-rp2040-smd/row.json` written with tier vendor, source OPL_Kicad_Library at commit b0035c51. |
| Supersedes | new |
| Milestone | none |

### D-539 chase.bake page hash goes through spec sha256Hex

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `core/src/commands/chase-bake.ts` hashes the baked bytes with `sha256Hex` from `@hackbuild/spec` instead of `node:crypto`. The jcs test allowlist stays as it is, with only `core/src/gate.ts` allowed. |
| Rationale | One implementation of each thing (D-206). The brief says to use the jcs helper rather than widen the allowlist. |
| Evidence | `spec/test/jcs.test.ts` lines 153 to 184 pass, 13 of 13 (measured); `core/test/chase-bake.test.ts` still checks the hash against `shasum -a 256` and passes, 7 of 7 (measured). |
| Supersedes | new |
| Milestone | none |

### D-540 gate-mcp exports at a params set of its own

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `core/test/gate-mcp.test.ts` exports flex-pair with params `{"/keys/0/gap": 1.86}`, not the defaults. A `beforeAll` approved export names the artifact hash, and the writes-nothing snapshot covers only the out folder, that artifact and the graph lines naming it. |
| Rationale | `gate.test.ts` and `skeleton.test.ts` write the default-params artifact into the shared store at the same time, so no snapshot of the default hash can tell their writes from a gate leak. A private workspace with symlinks back to the checkout is refused by the build sandbox (node permission model, fs-read), and moving the store would mean changing `core/src`, which the brief does not allow. |
| Evidence | The first fix (golden-hash scope) failed in a full core run with only the artifact mtime and graph line count moving and no out file (measured). The final version passed gate-mcp in three full core runs (measured), and the cancel-writes mutant at `core/src/mcp/handlers.ts` line 176 is killed (measured). |
| Supersedes | new |
| Milestone | none |

### D-541 draft is a new command, the 31st, CLI only

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. Added `draft` to COMMAND_NAMES in group make and to CLI_ONLY, raising the D-106 count from 30 to 31. The MCP tool list stays at 19, so the MCP form waits on engine brief finding F4 (selector values on chase_scaffold). |
| Rationale | The brief asks for a def file and `core/src/commands/draft.ts` with --json output. F4 keeps 19 MCP tools but has no decision row yet, and CLI_ONLY is the existing way to hold a command off MCP. A utility verb would have needed the same plan edit and has no CommandResult. |
| Evidence | `spec/commands.ts` COMMAND_NAMES and CLI_ONLY; `spec/test/surface.test.ts` (31, make 4); MILESTONES.md 1.3 R1 row; counts.json spec.commands 31 (computed by counts.mjs). |
| Supersedes | new |
| Milestone | none |

### D-542 E_DRAFT is error code 12: exit 2, HTTP 409, isError true, stage gate

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. E_DRAFT maps to EXIT_CODES.input (2) and HTTP 409, and reports stage gate. |
| Rationale | The caller fixes it by acting (adopt); nothing about the design failed. 409 marks a conflict with the resource state. Exit 4 belongs to provenance and keeps that meaning. |
| Evidence | `spec/errors.ts` ERROR_TRANSPORT.E_DRAFT; `core/src/result.ts` STAGE_OF_ERROR; `spec/test/surface.test.ts`. |
| Supersedes | new |
| Milestone | none |

### D-543 a directory is a draft when it holds draft.json

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. isDraftDir checks only for draft.json. export.run and chase.bake use it, and the draft: copy in adopt does not carry draft.json. |
| Rationale | A draft copied elsewhere stays a draft, and one rule is shared by export.run, chase.bake and adopt. The export gate stays the real safeguard. |
| Evidence | `core/src/draft-block.ts` isDraftDir; `spec/draft.ts` DRAFT_BLOCK_FILE. |
| Supersedes | new |
| Milestone | none |

### D-544 hbf:draft 3MF metadata goes under a declared xmlns prefix, written by post-processing

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The pipeline rewrites the writer's 3D/3dmodel.model entry: it adds xmlns:hbf="https://tools.hack.build/3mf/2026/draft" (tools.hack.build is a working name) and the metadata line before resources, then zips with the writer's own zipEntries. The vendored hackbuild-3mf writer is not changed. |
| Rationale | A metadata name with an undeclared prefix is not namespace-valid XML, and the writer has no hook for extra metadata. The writer lives in another repo (D-027). Package checks still pass on the marked bytes. A slicer opening a draft 3MF was not run. |
| Evidence | `packages/pipeline/src/draft-mark.ts`; `core/test/draft.test.ts` package checks 0 fail (computed). |
| Supersedes | new |
| Milestone | none |

### D-545 draft fails become warnings through the existing waiver shape

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. Each unwaived fail becomes verdict warn with waived.reason set to the draft waiver; measured, legal and fix are kept. |
| Rationale | Reuses D-173, so blockingChecks and the export gate in the page treat draft results the way the bench already handles waived fails, with no new UI path. |
| Evidence | draftResults in `packages/pipeline/src/draft-mark.ts`; draft.test waiver case. |
| Supersedes | new |
| Milestone | none |

### D-546 draft page lands in the draft directory, and chase.bake refuses a page bake of a draft

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `tools/bake/draft.ts` sets manifest out "." and chase.bake defaults the out root of a draft to its own directory. chase.bake without --mode draft on a draft gives E_DRAFT. |
| Rationale | Keeps draft pages out of dist/bench, where they could collide with a design of the same name. Only adopted designs bake without the banner (plan v9 3.1). |
| Evidence | `core/src/commands/chase-bake.ts`; `core/test/draft.test.ts`. |
| Supersedes | new |
| Milestone | none |

### D-547 draft bake files are regenerated on every draft bake

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. `tools/bake/draft.ts` overwrites bake.json, bench.entry.ts and page-build.ts each time, while from-chase still never touches the existing files of a design. draft.json is also rewritten before each bake, keeping goal and from. |
| Rationale | A widget.ts or source edit made after the first draft must reach the page, and these files are generated output in a draft. |
| Evidence | draft.test widget case. |
| Supersedes | new |
| Milestone | none |

### D-548 inline draft widget contract

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. widget.ts exports widget { id, model(state, metrics) returning a record of numbers or strings, render(el, model) }. It is drawn in a host element beside the banner after each build. |
| Rationale | Item 12 defined no inline contract. This one has no framework dependency, and adopt can lift it to designs/<name>/widgets/. |
| Evidence | `packages/ui/src/bench/entry.ts` DraftWidget; DraftBanner.vue; `packages/ui/test/draft-banner.test.ts`. |
| Supersedes | new |
| Milestone | none |

### D-549 chase validation still runs on a draft

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. hbf draft goes through the scaffold plan, so chase.validate errors still refuse the draft. Only check results are relaxed to warnings. |
| Rationale | No validator rule restricting routes was found to relax, and a chase that fails to read would not bake. |
| Evidence | `core/src/commands/draft.ts` uses plan() from `core/src/commands/chase-scaffold.ts`. |
| Supersedes | new |
| Milestone | none |

### D-550 counts.json and the PLAN.md Appendix B row committed on the R1-engine-24 branch

| field | value |
|---|---|
| Status | decided |
| Decision | Taken by the agent under owner delegation on 2026-10-20. The builder committed the counts.mjs output (spec commands 31) on the branch, although the counts.mjs header calls these files integrator-only. The integrator reran counts.mjs on the merged tree and it did not move. |
| Rationale | plan-drift fails while the staged counts lag, and the task prompt allowed counts.json through counts.mjs. |
| Evidence | plan-drift and the other plan tests 98 of 98 on the merged tree; counts.mjs then git diff --exit-code docs/plan/counts.json exit 0 (computed). |
| Supersedes | new |
| Milestone | none |

## Owner queue

Every owner entry, with the default the builder uses until the owner answers. As of 2026-10-07 the queue holds 48 entries; from M-1 onward tools/counts.mjs generates the count. Answered since the architect record: D-148 by D-186, D-149 by D-180 and D-150 by D-187, from owner files found in Downloads. D-015 is carried by D-189. D-042, D-170, D-185 and D-257 were answered by the owner on 2026-10-13. D-249 and D-254 were answered by the agent under owner delegation on 2026-10-14 (D-276, D-277).

| id | question | default in force | what an answer unblocks |
|---|---|---|---|
| D-005 | Which commit subject form does hackbuild-fab use? | imperative, lowercase, under 60 characters, no trailing punctuation, optional lowercase package scope (`mesh: freeze pinch healer after three flips`), no type word; body wrapped at 72 saying what failed, what changed, and what was and was not verified, with old and new numbers when a number moved. | the first commit and the commit-msg hook subject test |
| D-011 | Should the hackbuild-resume commits with AI trailers be rewritten? | guard forward only; no history rewrite. | closes the hackbuild-resume item; no fab work waits on it |
| D-012 | Are hbf, CHASE and STYLUS the final names? | use `hbf` (binary), CHASE (document format) and STYLUS (was FEELER) as working names, marked "(working name)" on first use in each document and listed in the first PR body. RABBET stays rejected. | the binary name, the MCP server key mcp__hbf__*, the package bin field and docs freeze at kernel 1.0 |
| D-016 | Is the DETENT machine id detent-28byj and the feature kind detent? | keep the `detent` feature kind; the DETENT machine profile id becomes `detent-28byj`. | the M07 machine profile id |
| D-019 | Is shop work (lumber, paint, yardage, crew, costing) in scope? | lumber, paint, yardage, crew scheduling and costing are out of scope; GUSSET stays a HeatSync tool; its MaxRects with five sort orders and first-fit-decreasing lumber packing are mined into `nest`. | the GUSSET registry row (D-158) and any shop package |
| D-030 | Archive hackbuild-radio, or make it the radio driver package? | archive the empty repo (created 2026-08-06T20:15:59Z, 13 minutes 7 seconds before hackbuild-bench); no radio.hack.build. Radio lives in hackbuild-bench. | REPOS.md state; no milestone waits |
| D-031 | Add DNS for app.hack.build? | docs cite https://hackbuild.github.io/hackbuild-bench/ ; app.hack.build has no DNS record and no Pages CNAME, and adding one is the owner's DNS change. | every doc link to the device bench |
| D-032 | Transfer virgilvox/hackbuild-beam into the hackbuild org? | transfer virgilvox/hackbuild-beam (created 2026-08-05) into the hackbuild org before M13. | M13 BEAM parity in the transferred repo |
| D-033 | What is hackbuild-site and where does the registry live? | hackbuild-site does not exist and live hack.build is the private hackbuild-resume on Netlify; the registry data lives in `hackbuild-fab/registry/` until a site repo exists; the site default is a CommonPub thin app plus a static front page on hackbuild-ui. | M16 registry publishing and the BENCH union page |
| D-034 | Which origin hosts baked benches, and which subdomains exist? | baked benches publish as GitHub release assets and on hackbuild-fab GitHub Pages until a cookieless origin exists (proposed `tools.hack.build/<slug>/<sha>.html`, working name); never on the signed-in `.hack.build` cookie origin. fab.hack.build, sketch.hack.build and blocks.hack.build are proposals; every DNS change is the owner's. | M09 publishing of baked benches beyond release assets |
| D-037 | Will the owner create the npm org hackbuild before the first publish? | the owner creates the npm org `hackbuild` before the first publish; until then nothing publishes. Names `@hackbuild/kernel`, `hackbuild-3mf` (npm) and `hackbuild_3mf` (PyPI) are checked for availability at M00. | the hackbuild-3mf 0.1.0 publish at M00 exit and @hackbuild/kernel |
| D-038 | npm workspaces or pnpm 12.9.1? | npm workspaces with a committed package-lock.json, exact pins, `npm ci` in CI (owner repos and pip-controller use npm). pnpm 12.9.1 with catalogs is the alternative. | M-1 T01 lockfile and every CI install step |
| D-080 | Raise pip.ino KEY_WAIT_US from 200 to 3500 us? | hackbuild-fab does not edit pip-controller; the gap is recorded in RISKS.md and in the archetype provenance; the owner decides whether to raise pip.ino to 3500 us. | removes RISKS.md R-21; the archetype provenance note |
| D-082 | When will the owner print the coupons and measure the chips and parts? | none until the owner prints them: Yousu cPLA and cTPU four-wire coupon along, across and through at shop settings; real RP2040, Pico and C3 pullups and thresholds; SG90 dimensions; KNUCKLE hinge and TENON threads; COTTER hook on the real board. Until then fabrication exports carry inferred warnings and public claims state the tier. | promotes resistivity, pin and catalog rows from inferred or vendor to measured; removes export warnings |
| D-083 | Is measured a fifth tier between verified and vendor? | five tiers, highest first: verified (manufacturer drawing, parsed), measured (shop coupon with machine, coupon id, date, method), vendor, community, inferred. | the Tier union in spec/ids.ts and the profile seed |
| D-087 | Which BLOCKS standard is canonical? | none until a print. BOSS v1 is sockH 2.4, flangeH 0.72, trace 0.72, gap 0.48, L 0.24; the later blocks.html is sockH 2.2, flange 0.6, trace 0.6, gap 0.4, L 0.2 and exports 0.2; the export layer must equal the chosen standard. The stale 0.24 text in blocks.html (PRINT NOTES, DEFAULT_PRINTER, printCard fallback) is fixed on port. | the BLOCKS port export layer and the blocks-stud archetype |
| D-088 | Is the SuperMini dual-supply jumper normally open or normally closed? | normally open (SPINDLE), against TRUNNION's normally closed. | the c3-carrier archetype default at M06 and board emit at M08 |
| D-094 | Can the rtl-sdr driver leave the hackbuild-bench app? | stays in the hackbuild-bench app only. | M13 link driver extraction scope |
| D-117 | Keep @virgilvox/hackbuild-ui or rename to @hackbuild/ui? | keep @virgilvox/hackbuild-ui, the name that installs today; @hackbuild/ui is the alternative its README names. | the M09 dependency line and the 0.3.0 upstream release |
| D-119 | Where do undo, redo, open, save and guide sit? | GUIDELINES 4c; the header holds identity and state; undo, redo, open, save and guide sit at the right end of the guide strip. | the M09 shell header and guide strip |
| D-120 | One shell system, or a separate dark instrument shell? | one system; paper shell for every kind except board; instrument density (full-bleed void, floating ink panels, VT323 heads) for the board kind and live device views; CONDUYT teal and JetBrains Mono never appear in fab. | the M09 shell family and board kind styling |
| D-121 | Which face sets tool taglines? | Special Elite for tool taglines in headers; Libre Baskerville italic only for "make things. break things. repeat."; bakes include all five faces. | M09 header typography and bake font set |
| D-122 | 32 px at 10 percent or 26 px graph rule? | 32 px at 10 percent pink for new work; shipped benches keep 26 px until rebaked. | M09 stage background tokens |
| D-144 | Keep SKETCH v3's solver or adopt planegcs? | keep SKETCH v3's damped Gauss-Newton with rank DOF; planegcs (LGPL-2.1 on GitHub, LGPL-2.0-or-later on npm, 892 KB) is not adopted; the v3 line "stop building the sketch constraint solver" is deleted. | the M12 FAB app shell built on the SKETCH reference |
| D-147 | Where do brand packs live? | a brand registry with a brand.json contract; HeatSync assets from the heatsync skill; app chrome stays hack.build. | COTTER port and any client-branded design |
| D-151 | When do teen and class kits start? | after M06. | kit references after M06 |
| D-168 | Which channels carry hack.build designs and kits, and do paid bounties or contests run? | hack.build tools at the D-167 pattern (release assets until the host exists); npm and PyPI after D-037; an MCP docs page at M12; Printables and MakerWorld cross-posts, non-exclusive, chase attached, never MakerWorld Exclusive; Tindie for SAO and circuit-card kits after M06; CommonPub build logs once a site exists; no bounties or contests until the owner sets rules. | listing copy, the kit bake, the M12 docs page and any bounty rules |
| D-171 | Are the hack.build name and logo reserved as marks? | yes; TRADEMARKS.md at the root and in hackbuild-3mf; `reference/copper/_inputs/hackbuild-logo.svg` excluded from the MIT grant. | the hackbuild-3mf 0.1.0 publish and any fork's naming |
| D-172 | Are emitter and exporter templates MIT-0? | MIT-0 for template text copied into user outputs; the filling code stays MIT. | M00 3MF writer templates and the firmware emitters |
| D-189 | What are the final names for the colliding slugs STAVE, TANG, TACK, TENON, KERF, SPLINE, TESSERA, SHIM, HASP, GROMMET, DETENT, PAWL, SPOOL? | namespace slugs by group (`copper/stave`, `laser/stave`), rename the laser STAVE to a CASK process variant, and gate the registry on uniqueness and the never-suggest list. | the M16 slug uniqueness gate and names.json |
| D-192 | Which plan files stay living after M-1? | DECISIONS.md, MILESTONES.md Parts 1 and 4 and the current card stay living; the rest freeze at M-1; tables and counts are generated. | the M-1-T13 copy and the docs counts job |
| D-195 | Is code inside a design folder (build.ts, bench.ts, src/**) MIT? | MIT; chase.ts, geometry, exports and docs follow ChaseMeta.license. | the LICENSING.md path map and L-04 |
| D-196 | Does text on a pink fill turn ink (4.62:1) in place of paper (3.32:1)? | ink, through `.hb-on-pink` in fab glue and proposed upstream in the 0.3.0 PR | the M09-T14 axe gate on the focal element; GUIDELINES v1.3 |
| D-197 | Does ghost stay the default render? | ghost by default, conductive and flex bodies solid | the M09 stage default and the bake screenshots |
| D-198 | Is CHK-PRT-04 limited to perimeter-band walls, and is the flex-pair pocket clearance 0.26 per side? | yes to both | M-S exit A for CHK-PRT-04 and CHK-FIT-01 |
| D-199 | Is there a derived qualifier for geometry-only claims? | not adopted; such claims read computed | the spec/checks.ts verdict schema and RULES.md qualifier list |
| D-200 | Do sealed-pocket floor and roof count all plastic, or only the wall to the inlay body? | all plastic below and above; pauseBefore is z only | the M03 sealed-pocket check and the COLLAR NFC fixtures |
| D-201 | Pin trusted build.ts by defHash before first run? | not adopted; a person reviews a build.ts they did not write | an `hbf trust` verb and an MCP refusal for untrusted builds |
| D-202 | Is snap-vee-finger-cage a sixth snap form? | listed, kept out of the M06 counts | the M06 snap family count |
| D-211 | Reserve `hbf` or `@hackbuild/hbf` on npm? | `npx --no-install hbf` everywhere; reserve when the org exists | the CLI package name and the D-037 publish |
| D-220 | Does slot colour reach the stage, legend and 3MF, as in TANG, TOGGLE, COLLAR and COTTER? | yes: `MaterialSlot.preview` (hex) drawn on stage, legend and art boards and written as the slot's 3MF filament colour; a colour edit is a light commit | `MaterialSlot` in spec/chase.ts, the M09 legend and the M10 3MF colour write |
| D-221 | Does the stage legend replace the materials panel pinned first on every pane? | yes: the legend is the colour key on every step (chips under 640 px); materials and resistivity are a step pane or a fold in the first step | UI.md 6.3 rail order and the M09 rail layout |
| D-230 | Do organic surfaces get an SDF level set route in the `MeshRoute` union, or stay imported meshes? | no new route; BUCK's head and any organic part enter as an `imported` part source with a provenance tier; the SDF level set waits as a CANONS.md backlog note | an `sdf` member in `packages/mesh` with its guarantees and reference, and a parametric BUCK port instead of a fixed head mesh |
| D-231 | Does PAWL stay on Rapier 0.21.0 with 9 of 17, get retuned for 0.21.0, or run on a second 0.14.0 pin (15 of 17)? | keep `@dimforge/rapier3d-deterministic-compat` 0.21.0 (D-134); PAWL scene blocked with the legacy set declared; no constant retuned; both records kept (0.14.0 15 of 17, 0.21.0 9 of 17, computed) | the M02 PAWL exit row and the `machines/pawl-leg` expected sim record at M10 and M11 |
| D-238 | Which slicer presets do the flex-pair TPU 95A (slot 3) and cTPU (slot 4) slots name? | keep `Generic TPU @FF C5P` with the PRESET_INFERRED warning (D-187); headless slices map it to `Generic TPU-95A @FF C5P` as an inferred stand-in | the writer filament names, the print card and the EXIT-B.md slot table |
| D-248 | Where does a printed conductor get its material, and what hosts a trace that is its own only body? | the conductor's declared material, read by featureMaterial before the body's; the trace gets a PETG skin host of `stack.skin` under it, as the PIP buried stack lays trace layer 1 (reference/electrical/trace-width-budget built so) | how single-material printed traces are declared at M06 and M08; whether stage 5 lets a conductor claim its body |
| D-250 | Node 24.11 as the dev floor, Node 24 only for the tscircuit backend, or an older tscircuit set on 22.18? | Node 24.11 as the dev floor (D-039 range unchanged); until answered the four tscircuit packages stay uninstalled and M08-T10 and M08-T11 do not run | M08-T10, M08-T11, the tscircuit pins and the LUG, AUGER and Circuit JSON exit rows |
| D-259 | May a byte-identical legacy file that writes dashes as escapes enter designs/*/legacy, or does it stay outside the repo? | the COTTER baker build.py stays outside; lineage records it with dest null and M09-T13 ports from the originals path | the M09-T01 done-when for that file and a lint-voice escape exemption under designs/*/legacy |
| D-265 | Are the PIP legacy gold rows report-only, outside the M09 zero-fail count? | report-only against tools/gold/calibration.json; rules with no subject on the legacy page grade n/a with a reason | the M09 gold Exit row; the PIP fixes wait for the M10 rebuild from a chase |

## v3 open decisions to D ids

v3 PLAN.md section 22 listed 20 open decisions. Each now maps to one entry.

| v3 open decision | question in v3 | entry | status |
|---|---|---|---|
| 1 | Confirm hbf, STYLUS, CHASE | D-012 | owner |
| 2 | TypeScript or plain ESM with JSDoc | D-141 | decided |
| 3 | three.js version | D-127 | decided |
| 4 | STYLUS as one design with an archetype registry | D-164 | decided |
| 5 | Python's role | D-140 | decided |
| 6 | Where designs live | D-142 | decided |
| 7 | Whether link subsumes conduyt-js | D-093 | decided |
| 8 | Whether SKETCH and BLOCKS graduate to repos | D-143 | decided |
| 9 | How much of the two canons ships in M6 | D-097 | decided |
| 10 | Catalog caching versus on-demand | D-103 | decided |
| 11 | The planegcs LGPL question | D-144 | owner |
| 12 | Whether CrossSection replaces Clipper2 | D-163 | decided |
| 13 | Whether ngspice per tick is fast enough | D-086 | decided |
| 14 | Whether the four overlays justify Reka UI | D-130 | decided |
| 15 | Whether TresJS earns a place | D-130 | decided |
| 16 | Chase as JSON or TS module | D-131 | decided |
| 17 | Six kinds fixed or extensible | D-126 | decided |
| 18 | When BRep lands | D-024 | decided |
| 19 | Two canons, one registry or two | D-095 | decided |
| 20 | Rapier deterministic speed for thirty-trial runs | D-134 | decided |

## plan-deltas owner items D1 to D26 to D ids

plan-deltas.md section 4 listed 26 owner items with defaults. The column v4 default compares the default in force here with the plan-deltas default.

| plan-deltas item | question | plan-deltas default | entry | v4 default |
|---|---|---|---|---|
| D1 | design system package name | move to @hackbuild/ui before fab depends on it | D-117 | changed: keep @virgilvox/hackbuild-ui, the name that installs today |
| D2 | what hackbuild-site is | CommonPub thin app plus static front page on hackbuild-ui | D-033 | same, plus registry in hackbuild-fab/registry/ until then |
| D3 | radio.hack.build and hackbuild-radio | drop the domain, archive the repo | D-030 | same |
| D4 | transfer hackbuild-beam | yes | D-032 | same, before M13 |
| D5 | commit subject convention | lowercase imperative, no prefix | D-005 | changed: optional lowercase package scope |
| D6 | header verbs and shells | GUIDELINES 4c, one shell | D-119, D-120 | same |
| D7 | tagline face | Libre Baskerville per GUIDELINES; fix benches on port | D-121 | changed: Special Elite for taglines, Baskerville only for the motto |
| D8 | graph rule | 32 px | D-122 | same; shipped benches keep 26 px until rebaked |
| D9 | package manager | npm | D-038 | same |
| D10 | SKETCH constraint solver | keep v3's solver | D-144 | same |
| D11 | names hbf, STYLUS, CHASE; detent kind vs DETENT machine | keep hbf and CHASE; detent kind, machine id detent-28byj | D-012, D-016 | same |
| D12 | licence defaults and failure corpus | open corpus, CC BY-SA designs, CERN-OHL-W boards | D-041, D-042, D-185 | same defaults, decided by the owner 2026-10-13 (D-042, D-185); OSHWA cost marked unverified |
| D13 | MCP tool name form | underscores, measured in an eval | D-107, D-113 | decided: underscores; prefix vs suffix eval before freeze |
| D14 | shop scope | out of scope | D-019 | same |
| D15 | rtl-sdr driver licence | app only | D-094 | same |
| D16 | measured as a fifth tier | fifth tier | D-083 | same |
| D17 | canonical BLOCKS standard | none until a print | D-087 | same |
| D18 | SuperMini jumper default | normally open | D-088 | same |
| D19 | colliding slugs | namespace by group, laser STAVE to a CASK variant | D-015, D-189 | same; collision list widened to thirteen names (D-189) |
| D20 | brand packs | brand registry, heatsync skill assets | D-147 | same |
| D21 | missing sources | recover, rewrite or drop each | D-149, D-180, D-136 | decided (D-180): nine sources recovered and cited from evidence/x/downloads/; SLUG runner (rebuilt), SPINDLE reparse (rewritten), ARMATURE scripts (dropped), HEDDLE (gate closed) |
| D22 | OGEE R16-P bill | shipped builder | D-148, D-186 | decided (D-186): shipped builder, 124 in 20 and 119 in 21, derived at build |
| D23 | 97-key 3MFs in Flash Studio | correctness fix until confirmed | D-150, D-187 | decided (D-187): fidelity upgrade, confirmed by owner saves |
| D24 | physical measurements | none; gate the fabrication tier | D-082 | same |
| D25 | rewrite hackbuild-resume history | guard forward only | D-011 | same |
| D26 | teen and class kits | after M6 | D-151 | same |

## plan-deltas rulings R1 to R97 to D ids

Generated from the Supersedes rows above. A ruling with no entry is carried by a plan document or a milestone card instead of a decision; each such ruling is listed under Gaps found while writing.

| ruling | entries |
|---|---|
| R1 | D-001, D-006 |
| R2 | D-002 |
| R3 | D-004, D-007 |
| R4 | none (see gaps) |
| R5 | D-003 |
| R6 | D-003, D-010 |
| R7 | D-009 |
| R8 | D-008 |
| R9 | D-020, D-022 |
| R10 | D-021 |
| R11 | D-021, D-029 |
| R12 | D-076, D-077 |
| R13 | D-013 |
| R14 | D-018, D-019 |
| R15 | D-018 |
| R16 | D-023 |
| R17 | D-027, D-030, D-031, D-032, D-033, D-035 |
| R18 | D-031, D-034 |
| R19 | D-036 |
| R20 | D-044 |
| R21 | D-008, D-158 |
| R22 | D-015, D-158, D-189 |
| R23 | D-010 |
| R24 | D-130 |
| R25 | none (see gaps) |
| R26 | D-116 |
| R27 | D-118, D-122 |
| R28 | D-123 |
| R29 | D-038 |
| R30 | D-039, D-040, D-181 |
| R31 | D-161 |
| R32 | none (see gaps) |
| R33 | D-119, D-120, D-121, D-124, D-125 |
| R34 | D-124, D-132 |
| R35 | none (see gaps) |
| R36 | D-147 |
| R37 | none (see gaps) |
| R38 | D-048 |
| R39 | D-058 |
| R40 | D-059, D-060 |
| R41 | D-061 |
| R42 | D-062 |
| R43 | D-063 |
| R44 | D-063 |
| R45 | D-049 |
| R46 | D-095, D-096, D-097 |
| R47 | D-071, D-079, D-085, D-087, D-088, D-096, D-097, D-164 |
| R48 | D-098 |
| R49 | D-078, D-079, D-183 |
| R50 | D-052, D-062, D-068, D-069, D-156, D-159 |
| R51 | D-053, D-054, D-055, D-156 |
| R52 | D-054, D-070, D-084, D-163 |
| R53 | D-064, D-065, D-066, D-067, D-074, D-075, D-182 |
| R54 | D-093 |
| R55 | D-053, D-057 |
| R56 | D-071, D-072 |
| R57 | D-051, D-081, D-083, D-099, D-100, D-101 |
| R58 | D-056, D-134, D-135, D-136, D-188 |
| R59 | D-014, D-086 |
| R60 | D-137, D-138 |
| R61 | D-043, D-089, D-090, D-091 |
| R62 | D-092, D-156 |
| R63 | D-043, D-145 |
| R64 | D-043, D-093, D-094 |
| R65 | D-139 |
| R66 | D-139 |
| R67 | D-105 |
| R68 | D-105 |
| R69 | D-149, D-180 |
| R70 | D-076, D-102, D-104 |
| R71 | D-104 |
| R72 | D-021, D-022 |
| R73 | D-040, D-043, D-056, D-090, D-108, D-127, D-134, D-137, D-144, D-146, D-163, D-181 |
| R74 | D-022, D-041, D-042, D-185 |
| R75 | D-131, D-132 |
| R76 | D-133 |
| R77 | D-047 |
| R78 | D-050, D-051 |
| R79 | D-128 |
| R80 | D-128 |
| R81 | D-129 |
| R82 | D-106, D-107 |
| R83 | D-064, D-107, D-108, D-109, D-110, D-111, D-182 |
| R84 | D-112, D-155 |
| R85 | D-045, D-152 |
| R86 | D-153 |
| R87 | D-152, D-154 |
| R88 | none (see gaps) |
| R89 | D-095 |
| R90 | D-132 |
| R91 | D-007, D-046 |
| R92 | D-024, D-027, D-135, D-136, D-148, D-157, D-186 |
| R93 | D-157 |
| R94 | D-012, D-126, D-131 |
| R95 | D-026 |
| R96 | D-010 |
| R97 | none (see gaps) |

## Gaps found while writing

Nothing here is a decision. Each item names a mismatch or an uncovered ruling found while writing this file, and where it is carried today. Each is resolved by a new entry; the architect record is frozen from 2026-10-04. D-181 to D-184 closed the D-040 pins, D-064 transport rows, D-078 location and agent-surface trust rules items that stood here.

### Text mismatches between sources

| item | what differs | carried as |
|---|---|---|
| D-003 skeleton | The architect decision text lists the RULES.md sections without Git conventions. The RULES.md brief, the architect decision log data, plan-deltas R5 and `fab-knowledge:synthesis/aesthetic-voice-ux-bible.md` section 4.1 include it. | This file keeps the architect text unchanged. RULES.md follows its brief and carries a Git conventions section. |
| Titles | Several architect titles differ in wording from the architect decision log data (for example D-004 "lint-voice" against "lint-voice replaces lint-dashes", D-039 "Node floor" against "Node floor 22.18", D-116 "Design system dependency"). The decision substance matches. | This file uses the architect record titles, as its brief requires. |
| Rationale source | 150 entries carry no inline "Rationale:" in the architect record (as of 2026-10-04). | Their Rationale row uses the architect decision log data for the same id. |
| Defaults changed from plan-deltas | D-005 adds an optional package scope (plan-deltas D5 had no prefix). D-117 keeps @virgilvox/hackbuild-ui (plan-deltas D1 moved to @hackbuild/ui). D-121 sets Special Elite for taglines (plan-deltas D7 chose Libre Baskerville). | The defaults in this file are the ones in force. The table "plan-deltas owner items D1 to D26 to D ids" marks each change. |
| Owner queue unblocks column | No source states what each owner answer unblocks. | The column is derived from each entry's decision text and from the milestone briefs in `fab-knowledge:plan/_briefs.md`. Treat it as inferred. |
| D-065 counts | D-065 stated 19 project-level and 25 artifact checks; the M04 retarget gives 7 artifact, 7 source, 2 page, 3 project | resolved by D-191 |

### Entries without a milestone in any brief

| entry | gap |
|---|---|
| D-146 OpenSCAD route | No milestone brief in `_briefs.md` names the import-and-audit route or its lint for "Ignoring unknown". Its Milestone row reads unassigned. Carried since by milestones/M04-checks-project.md M04-T14 (`part.build` with `import`, format scad). |
| D-160 interop | Only STEP has a dated milestone (M14). The other formats land with the package that emits them (3MF M00, DXF M07, gerbers, KiCad and Circuit JSON M08); no brief states the import side (STL, GLB, STEP, WRL, OpenSCAD) as a card. Carried since by M04-T14 (STL, GLB, OpenSCAD) and M14-T02 step 7 (STEP, WRL) through `ImportSpec` on `part.build` in spec/commands.ts; no new command, so D-106 keeps 30. |

### plan-deltas rulings with no decision entry

| ruling | content | where it is carried |
|---|---|---|
| R4 | Rewrite the contrast frames at v3 PLAN.md lines 85, 89, 1057, 1060 to 1061, and in `handoff/hbf/knowledge/kernels/agent-capability.md`. | PLAN.md section 1 outline; lint-voice warns on contrast frames (D-004). The agent-capability.md rewrite has no owner document. |
| R25 | KEEP: extension is a registry entry, never a switch on kind. | PLAN.md section 20 rule 4 and ARCHITECTURE.md extension points. |
| R32 | KEEP the bench skeleton. Its count "#FE0386 in 31 bench folders" is corrected to 32 by verified-claims C6 and C-10. | UI.md skeleton; Appendix B of PLAN.md carries 32. |
| R35 | A typed mm entry parser on the model of hackbuild-bench `parseFrequency` (bare number is mm; in, um, cm suffixes). | No decision entry. Carried as a card step: milestones/M09-ui.md M09-T03 step 10 (`parseLength`). |
| R37 | Delete the seed/brand copies (wrong hex, dashes) and point at the package; patch the skills separately. | M-1 card T07 skips seed/brand on import. Patching the three skills (hackbuild-explainer, brand-forge, design-forge) is owner work outside the repo, recorded in milestones/M-1-housekeeping.md Open items. |
| R54 | New check families from the corpus (print, layer contract, sheet, copper, board, circuit, assembly, artifact, device) with origins. | CHECKS.md and the M04 card; only the device row's CLASP limit has an entry (D-093). |
| R88 | KEEP `validate_3mf.py --overlap` on every browser export; 21 of 21 BOSS 3MFs pass; demo coin sums to 5473.667 mm3 (measured by rerun, verified-claims C2). | M00 card corpus acceptance; TESTING.md 3MF corpus. |
| R97 | The first commit to hackbuild-fab carries RULES.md, CLAUDE.md, AGENTS.md, the hook, lint-voice, the house-rules job and the corrected scaffold; no geometry code before them. | M-1 card and REPOS.md first commits; D-157 names M-1 first. Commits still wait for the owner to ask (D-006). |

### Rulings carried in part

| ruling | part with no entry | where it is carried |
|---|---|---|
| R5 | Moving the current builder brief to START-HERE.md. | Not carried, by choice: the handoff brief stays evidence and START-HERE.md is not created; RULES.md, CLAUDE.md and docs/plan/ take its place (milestones/M-1-housekeeping.md Open items). |
| R50 | Export completeness check (unique resolved object names, STL zip entry count equals object count; TENON tenon-undefined). | M00 card known-bad fixture. |
| R53 | Fix `{text, param, to}` shape in plan-deltas. | D-064 sets `Fix {param, set, predicts}` instead. |
| R56 | Interval fixtures (TUMBLER cascade, OGEE LSV_X 123.3 to 125, COTTER hook rule, SLUG mouth). | M01 card. |
| R57 | New profile fields (lineWidth, strainMax, fatigue, changer type, purge per change, skin and contact resistance, servo profile, process presets by part role, LEGO studgrid). | PROFILE.md. |
| R58 | Insertion by search (COTTER hook_fit.py) and prismatic sweep (SASH). | M02 card. |
| R61 | Fab-house facts with dates in profile (PCBWay pink mask through Advanced PCB only, verified-claims C13). | No decision entry. Carried as dated rows in PROFILE.md 8.2 and milestones/M08-board-catalog.md M08-T03 step 10. |
| R64 | Codecs (DETENT text, WASHER CRC-8 binary) with a lossy mock transport. | M13 card. |
| R82 | Per-transport exposure field on CommandDef; nest.pack loses its gate. | AGENT-SURFACE.md CommandDef. |
| R83 | Input-validation failures return isError tool results. | AGENT-SURFACE.md transport mapping. |
| R87 | Cross-implementation agreement, firmware compile, slicer round-trip harness, viewer probe, doc-number drift. | TESTING.md. |
| R89 | Generic `RegistryEntry<K>` with `DefFor<K>`; `kinds` dropped from registries. | spec/registry.ts brief; PLAN.md section 20 rule 4. |
| R92 | KEYWAY sims throwing on `S.span` (four of seven) and the KEYWAY input shipping. | M05 card ships the inputs; the S.span fix has no card. |

### Facts awaiting a source

| item | state |
|---|---|
| plan-deltas R59 and section 0 item 7 | Cite eecircuit-engine timings as 302 ms start and 0.32 ms median; verified-claims C9 reran 449 ms and 0.365 ms on this host. D-086 carries the rerun as one machine's measurement. |
| `hackbuild-tools 2/MANIFEST.json` (D-158) | Settled 2026-10-04: copied to `fab-knowledge:evidence/x/downloads/dl-boards-tools/hackbuild-tools-2/MANIFEST.json` with its sha256 in that folder's SHA256SUMS; D-158 Evidence cites the copy. M16 copies it under registry/. |
