// PIP's 16 `.note` elements and where each one lives in a declared bench
// (M09-T09 step 2, D-124). Line numbers and source text are in
// designs/pip/legacy/bench/part1.html (lineage pip.bench-part1, a copy of
// pip-controller b137deb); notes.test.ts parses that file and holds this
// table to it. M10 reads the same table when PIP renders from its chase.
//
// Homes: the welcome description, a field `help`, a notes panel (the one
// note of a param group, or a `notes.<id>` panel for a group with no rows),
// a pane's empty state, or materials data with no note at all (D-221).
// Every migrated string keeps PIP's wording unless `rewrite` names why it
// changed.

import type { MaterialSlot, ParamGroup, RailStep } from "@hackbuild/spec";
import { PIP_LAYOUT } from "./pip-layout.js";

export type NoteHome =
  | { readonly kind: "welcome" }
  | { readonly kind: "help"; readonly group: string; readonly fields: readonly string[] }
  | { readonly kind: "notes"; readonly panel: string }
  | { readonly kind: "empty"; readonly step: string }
  | { readonly kind: "role" };

export interface PipNote {
  /** Row number of the M09-T09 migration table. */
  readonly n: number;
  /** 1-based line of the `.note` element in part1.html. */
  readonly line: number;
  readonly where: string;
  readonly home: NoteHome;
  /** The migrated string; null where data replaces the note or a build fills it. */
  readonly text: string | null;
  /** Build function that fills the note from Part IR data (PIP part3.js line 442 wrote it at runtime). */
  readonly fill?: string;
  /** Why the migrated string differs from PIP's; the PR body carries old and new. */
  readonly rewrite?: string;
}

export const PIP_NOTES: readonly PipNote[] = [
  { n: 1, line: 196, where: "welcome card", home: { kind: "welcome" },
    text: "a game controller printed in one go on a four head machine: PETG body, conductive PLA traces buried in it, TPU keys, conductive TPU contacts. a Waveshare RP2040-Zero drops into the pocket." },
  { n: 2, line: 218, where: "BODY", home: { kind: "help", group: "body", fields: ["T"] },
    text: "the body grows to whatever the tallest key and the board pocket need, snapped to layers",
    rewrite: "drops the lead \"thickness is not a setting:\", the not-x construction RULES.md Language bans; a help line is one line with no closing period" },
  { n: 3, line: 238, where: "FLEX CONE", home: { kind: "notes", panel: "flex" },
    text: "printed in place: a TPU cone on a buried foot ring, a conductive TPU cap over the hole, two split conductive PLA columns under it. the gap is held at 35 to 50 percent of the cone, never under 1.2 mm, because a pressed cone only travels about half its height." },
  { n: 4, line: 262, where: "CLICK SPRING", home: { kind: "notes", panel: "clicky" },
    text: "a double cosine beam, printed flat in PETG with a conductive TPU tip locked in by a dovetail. the slot is snug only under the end blocks, where a rib keys each one down; over the arch it opens out so the beams never touch a wall. the curve comes from a corotational beam solve of these numbers; the contact lands just past the snap." },
  { n: 5, line: 271, where: "TOUCH COMB", home: { kind: "notes", panel: "touch" },
    text: "interdigitated conductive PLA flush with the bezel top on a PETG boss. a fingertip bridges the sense comb to the 3V3 comb; no moving part." },
  { n: 6, line: 287, where: "STICK", home: { kind: "help", group: "stick", fields: ["top"] },
    text: "printed on: the thumb pad comes out of the printer attached, with a 45 degree dish you can feel, and the bezel hole is sized to drop over it. separate cap: a small stem through a tight hole, with the pad pressed on afterwards." },
  { n: 7, line: 288, where: "STICK", home: { kind: "notes", panel: "stick" },
    text: "the TOGGLE mechanism: a TPU stem on an anchored neck, a conductive TPU band that lies flat against the well wall at full tilt, bridging a low wall pad to the common ring above it." },
  { n: 8, line: 290, where: "step 2 pane", home: { kind: "empty", step: "buttons" },
    text: "no button group uses a moving key yet. turn groups on in step 1." },
  { n: 9, line: 312, where: "MOUNT", home: { kind: "help", group: "mount", fields: ["mode"] },
    text: "press fit: conductive bumps under the castellations, the bezel ribs push the board onto them. wire cups: numbered conductive cups beside the pocket; push a hot wire into the bore or drive an M1.2 screw. both keeps the cups as a backup." },
  { n: 10, line: 319, where: "HOOKUP", home: { kind: "notes", panel: "hookup" }, text: null, fill: "hookupNote" },
  { n: 11, line: 335, where: "materials and read timing", home: { kind: "help", group: "phys", fields: ["rhoC"] },
    text: "yousu raw filament is 240 to 481 ohm cm (vendor). printed traces use the profile row, 500 along and 2000 through (inferred), until a coupon is measured.",
    rewrite: "the corrections changed the number: the vendor figure is 240 to 481 ohm cm for raw filament and is never scaled onto printed traces, which read the inferred profile row until a coupon is measured (D-081, C-09)" },
  { n: 12, line: 346, where: "STACK", home: { kind: "notes", panel: "stack" },
    text: "two buried conductive PLA layers with PETG between: layer 1, insulation, layer 2, insulation, then the pad layer the keys stand on. the insulation is what stops a trace shorting to the one crossing it, so it is four layers by default; every 0.24 here costs 0.48 of body height." },
  { n: 13, line: 358, where: "FILAMENTS", home: { kind: "role" }, text: null },
  { n: 14, line: 365, where: "slicer profile", home: { kind: "help", group: "print", fields: ["pattern", "printer", "process"] },
    text: "names only, never settings. blank leaves the slicer's selection alone." },
  { n: 15, line: 374, where: "FITS AND CLEARANCES", home: { kind: "notes", panel: "fits" },
    text: "every place two parts meet, with what the printer usually does to it. holes come out about 0.15 mm small and pegs about 0.05 mm big, so a 0.10 mm clearance on paper is a press fit in the hand." },
  { n: 16, line: 379, where: "EXPORT", home: { kind: "notes", panel: "export" },
    text: "print the coupon first. it carries the same stack, a trace run of known length, a layer crossing, three split gaps, a bump pair, one flex key and one click spring. measure it, then type the numbers into step 3." },
];

const textOf = (n: number): string => {
  const t = PIP_NOTES.find((x) => x.n === n)?.text;
  if (t == null) throw new Error(`pip note ${n} has no text`);
  return t;
};

/** The welcome card, with note 1 as its description (a declared welcome field). */
export const PIP_WELCOME = { title: "PIP", description: textOf(1) } as const;

/**
 * Empty states by step, shown when no panel of the pane is visible. Note 8:
 * the buttons pane is empty when no group uses a moving key (part3.js line
 * 307 hid it when any group was on).
 */
export const PIP_EMPTY: Readonly<Record<string, string>> = { buttons: textOf(8) };

const body = PIP_LAYOUT.find((g) => g.id === "body");
if (body === undefined) throw new Error("pip-layout has no body group");

/**
 * PIP's panes as param groups, one note each. Rows are only those a note
 * lands on; M10 brings the rest from PIP's chase. Groups with no rows are
 * the heads `notes.<id>` panels read.
 */
export const PIP_NOTE_GROUPS: readonly ParamGroup[] = [
  body,
  { id: "flex", label: "FLEX CONE", fields: [], note: textOf(3) },
  { id: "clicky", label: "CLICK SPRING", fields: [], note: textOf(4) },
  { id: "touch", label: "TOUCH COMB", fields: [], note: textOf(5) },
  { id: "stick", label: "STICK", note: textOf(7), fields: [
    { id: "top", type: "enum", label: "thumb pad", default: "inplace", help: textOf(6),
      options: [{ value: "inplace", label: "thumb pad printed on" }, { value: "press", label: "separate cap" }] },
  ] },
  { id: "mount", label: "MOUNT", fields: [
    { id: "mode", type: "enum", label: "mount", default: "press", help: textOf(9),
      options: [{ value: "press", label: "press fit" }, { value: "wire", label: "wire cups" }, { value: "both", label: "both" }] },
  ] },
  { id: "hookup", label: "HOOKUP", fields: [] },
  { id: "phys", label: "MATERIALS AND READ TIMING", fields: [
    { id: "rhoC", type: "number", unit: "ohm cm", label: "cpla in plane", range: [1, 100000], step: 1, default: 500, help: textOf(11) },
  ] },
  { id: "stack", label: "STACK", fields: [], note: textOf(12) },
  { id: "print", label: "SLICER PROFILE", fields: [
    { id: "pattern", type: "text", label: "preset", default: "", help: textOf(14) },
    { id: "printer", type: "text", label: "printer", default: "", help: textOf(14) },
    { id: "process", type: "text", label: "process", default: "", help: textOf(14) },
  ] },
  { id: "fits", label: "FITS AND CLEARANCES", fields: [], note: textOf(15) },
  { id: "export", label: "EXPORT", fields: [], note: textOf(16) },
];

/** PIP's four steps (part1.html lines 177 to 180) with the panels each pane declares. */
export const PIP_NOTE_RAIL: readonly RailStep[] = [
  { step: "layout", goal: "shape the body and place the button groups", panels: ["params.body", "checks"] },
  { step: "buttons", goal: "tune each key type", panels: ["params.flex", "params.clicky", "params.touch", "params.stick"] },
  { step: "board", goal: "mount the board and wire it", panels: ["params.mount", "notes.hookup", "params.phys"] },
  { step: "print", goal: "set the stack, check the fits, export", panels: ["params.stack", "materials", "params.print", "fits", "notes.fits", "exports", "notes.export"] },
];

/**
 * Note 13 as data: the four heads and their fixed roles fill the materials
 * pane's role column (D-221). Labels are the roles part1.html line 358
 * names; slot colours stay with the stage legend.
 */
export const PIP_MATERIALS: readonly MaterialSlot[] = [
  { slot: 1, material: "petg", role: "structure", label: "structure and bezel" },
  { slot: 2, material: "cpla", role: "conductor", label: "conductive traces and label ink" },
  { slot: 3, material: "tpu95", role: "flex", label: "TPU keys and the pink of the mark" },
  { slot: 4, material: "ctpu", role: "flex-conductor", label: "conductive TPU contacts" },
];
