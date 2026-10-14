# UI anatomy, measured

Derived from the actual files, not from memory: COLLAR v13, BLOCKS v3,
SKETCH v3, STAVE rev A, SPLICE-C 3D, LOCKET R2 sim, AUGER rev A viewer.
Placed under `designs/<slug>/legacy/` with SHA256 in the registry.

This is the spec the `theme`, `ui-core`, `ui` and `chase` packages implement.
Where it disagrees with the prose in `05-taste.md`, this file wins, because
this one was measured.

## The skeleton every bench converges on

COLLAR and BLOCKS were written separately, months apart, and arrived at the
same structure. That is the strongest possible evidence it is right.

```
header        ink bar, 3px pink rule, wordmark, global actions
steps         numbered strip, equal width, pink underline on current,
              green tick on done            (BLOCKS)  or tabs (COLLAR)
guide         one line: step name in VT323 pink, goal in Special Elite
main
  stage       void (or paper) with overlays: cams top-left,
              legend top-right, hud bottom-left, welcome centred
  rail        raised, 3px ink border, one pane per step
status        ink bar, VT323 chips, live values turn pink
welcome       overlay, the one card with the pink shadow
```

Panes are one per step. Global actions live in the header (guide, preset,
save, load, build; undo, redo). Per-step actions live in the pane. Nothing
lives in both.

## HAFT, September 17, the newest instance

The game controller bench is the same skeleton one more time, from a chat
whose brief was "look at how TOGGLE was made," so the style propagates by
lineage on purpose:

```
header   wordmark, tagline, undo redo open save guide
steps    1 LAYOUT  2 BUTTONS  3 BOARD  4 PRINT
guide    STEP 1 LAYOUT  shape the body and place the button groups...
stage    canvas
         cams: iso top front under explode xray section plate   (one strip)
         legend: slot, name, role (body/bezel, traces/ink, keys/pink, contacts)
                 plus mode notes in lit colours (xray in slime, section in amber,
                 plate fits/does not fit)
         ov: DRIVE pad (hold a key, or click one in the view; reads GP4 LOW,
             about 140 kohm, settles 1.3 us)
         busy: "building"
         welcome card: HAFT.bench plus a two-line note
rail     one pane per step; per-group type chips (flex / clicky / touch)
```

Three things it adds to the earlier measurements. Cams and modes merged into
one strip. The DRIVE pad as a first-class stage overlay, the stimulus that
makes a printed control legible before it exists. And per-instance type chips
inside a repeatable group in the rail, which is the `list` param type.

The last step is always PRINT. BLOCKS is PART / MATERIALS / BUILD / PRINT;
HAFT is LAYOUT / BUTTONS / BOARD / PRINT; the earlier benches end the same
way. A chase's rail should too.

The global hook (`BENCH` on globalThis: ready, state, model, rev, built, busy,
log, loadDesign, designJson, exportBytes) is what the smoke test drives, and
it is the reason the style can be verified without a person. Every bench in
this lineage has one. `BenchHook` in `spec/chase.ts` is the contract.

## Why this style

Read across the chats, the reasons the same shape keeps being chosen:

- numbered steps with a one-line guide replace prose, so the UI is not busy
- interaction lives on the stage (cams, drive pad, click-in-view), not in
  the rail, so the model is what you touch
- one pane per step means you are never lost, and the last step is always
  the export
- the legend is pinned on the stage so materials and modes read at a glance
- a global hook makes every element driveable by Playwright, so the style
  ships tested; the UI is designed to be tested, not tested afterward
- src/ is the headless kernel and bench/ is the shell, so the same code runs
  in node for cases and sweeps and in the browser for the person

## Per-kind variations

The skeleton is fixed. What varies is which regions exist and where the rail
sits. These are the five CHASE kinds, measured.

`single` (COLLAR)
: rail-left, stage, rail-right. Three columns at 330 / 1fr / 300, collapsing
  to two at 1180. Left rail is the design (ART, EDGE, COLOUR, PRINT). Right
  rail is output and readouts. Stage carries a stagebar (ink strip) and the
  face previews below the 3D view. Left rail is sunk, not raised.

`composer` (BLOCKS)
: stage-left, rail-right at 340. Stage is the void with the full overlay set:
  cams, tools, legend, hud, welcome. Steps strip above the guide. Rail is
  raised with a 3px ink left border. Undo and redo in the header.

`surface` (STAVE)
: no rail at all. Header, then a nav of tabs, then full-width sections:
  STACK, SENSE, WIRE. The tabs ARE the sections. This kind is a document with
  interactive figures, not a workbench.

`board` (AUGER, SPLICE-C)
: dark instrument shell. Stage full-bleed, a floating panel that toggles,
  a hud, a pick readout, a device card. No steps, no guide. AUGER's panel
  has seventeen independently toggleable layers, front/back/iso/edge presets,
  an explode slider, an opacity slider, click-to-inspect, and PNG at 2x.
  That list is the `board` view spec.

`machine` (LOCKET)
: panel, view, hud. A simpler composer without the steps strip. The panel
  carries part show/hide, explode, render mode, and the config panel that
  swaps geometry variants live.

SKETCH is the outlier and the most app-like: topbar, subbar, optbar, stage
with stagecorner and stagehud and viewchips and stagefoot, rail at 336, a
bottom tray at 210 with its own tabs, a command palette, toasts, a modal
host. It is what a real editor looks like when it grows up, and it is the
reference for the FAB app shell rather than for a bench.

## The primitives, with real values

Measured from COLLAR and BLOCKS. `theme/tokens.css` carries them as classes.

Button `.hb-btn`
: ink background, paper text, 2px ink border, padding 5px 10px, uppercase,
  letter-spacing .06em, 600 weight, 11px mono. Shadow 3px 3px 0 ink. Hover
  goes pink. Active drops the shadow to 1px and translates 2px, so it
  presses in. Radius zero.

Steps `.hb-steps > button`
: transparent on the ink strip, equal flex, 3px transparent bottom border
  that goes pink when current, 12px mono at .14em tracking. A numbered badge
  that goes green when done.

Guide `.hb-guide`
: sunk background, 2px ink bottom border, 13px Special Elite. The step name
  is a 17px VT323 in pink followed by the goal in prose. One line.

Panel head `.hb-ph`
: 17px VT323, uppercase, on a full-bleed ink bar. Negative horizontal margin
  so it reaches the pane edges.

Row `.hb-row`
: flex, label fixed at 96px, 10px uppercase at .12em in ink-3, control fills
  the rest. Range inputs take pink accent-color. That is the entire param
  rail primitive; ParamRail generates rows of this.

Chips `.hb-chip`
: 2px ink border, 11px uppercase at .1em, raised background, ink when on.
  Ok and bad variants recolour the border and text only.

Status `.hb-status`
: ink bar, 16px VT323, chips inline. Live values in pink.

Card `.hb-card`
: paper, 3px ink border, and the single 10px pink shadow in the whole UI.
  Max 640 wide. Special Elite prose. Used for welcome and nothing else.

Stage overlays
: cams top-left with translucent void buttons at 10px; legend top-right in
  15px VT323; hud bottom-left. Position absolute inside a relative stage.

Body
: 13px IBM Plex Mono on paper with a 4px halftone dot texture.

## Token drift, and the fix

Seven files, three vocabularies for the same values:

| value | COLLAR | BLOCKS | SKETCH | STAVE | LOCKET | AUGER |
|---|---|---|---|---|---|---|
| #f5f0e6 | --cream | --cream | --hb-paper | --cream | --cream | --cream |
| #fffdf7 | --raised | --paper | --hb-raised | | | |
| #efe9db | --sunk | --sunk | --hb-sunk | --sunk | --panel | |
| #0a0a0a | --void | --void | --hb-void | --dark | --dark | --dark |
| Marker | --marker | --disp | --disp | --disp | | |
| Elite | --elite | --type | --type | --type | | |
| VT323 | --term | --inst | --inst | | | |
| #ffb020 | --lit-warn | --amber | --hb-lit-warn | | | |

SKETCH's `--hb-` prefixed set is the most complete and the only one with a
namespace, so it is the canonical set in `theme/tokens.css`. The alias table
at the bottom of that file maps every older name onto it. Migrating a bench
is a find-and-replace against that table.

Two one-offs with no canonical equivalent: STAVE's `--gold #d9b45a` for the
copper render and AUGER's `--line` at 20 percent ink. Copper colour belongs
in the part palette; the line belongs at ink alpha.

## Where the text lives, and what to cut

The request is less text-busy UI. Measured against COLLAR, which is the
wordiest, text lives in five places:

1. the guide bar, one line per step: KEEP, it is the whole navigation model
2. the welcome card: KEEP for first run only, dismissed and remembered
3. per-pane prose paragraphs under panel heads: CUT, the panel head is the
   label and a tooltip carries the rest
4. inline hints beside controls: CUT, or collapse into the label
5. the HOOKUP and ASSEMBLY panels: KEEP, they are instructions people follow,
   and they are already declared data rather than prose

The rule for the component library: a pane contains panel heads, rows,
chips, and declared panels. It does not contain paragraphs. If an
explanation is needed, it is a tooltip on the label or a line in the guide.

## What the AUGER zip adds

The zip carries the full tscircuit pipeline that produced the viewer:
`placement.ts` for the floorplan, `footprints.tsx` for hand-built footprints,
`auger.board.tsx` for components and nets and traces and pours, `build.ts`
for render plus DRC to circuit JSON, `export.ts` for gerbers and Excellon,
`pack.ts` to bundle the viewer into one file. Plus `gen-case-geom.ts` and
`clean-traces.ts`, and two case STLs.

That is `packages/board` in embryo, and the file list is the shape the
package should expose: placement, footprints, board, build, export, pack.
