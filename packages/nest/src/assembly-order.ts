// Assembly-order mode (M07-T09): the first sheets hold the first assembly
// steps, so cutting or printing starts before the whole set is laid out.
// The steps come from the design's own assembly sequence, never typed: for
// OGEE16 the `asm` argument of each reg(...) call of its viewers
// (designs/ogee16/legacy/tools/extract-steps.mjs). The objective is
// Roadkill's (Abdullah et al., UIST 2021; fab-knowledge research
// hci-fabrication-prior-art.md line 174): the cutting plan follows the
// assembly, at a cost in sheets this file reports beside fill mode.
//
// The packers are the fill-mode packers, run step by step. Steps go in
// ascending order and, within a step, groups in order of first appearance.
// A step's copies either open new sheets or share the most recent sheet
// when that sheet belongs to the same group: the sheet's copies and the
// step's copies are packed again together, and the share is kept only when
// every copy of that sheet lands on the first sheet of the repack and the
// repack saves a sheet over packing the step alone. So no sheet holds a
// copy of step k + 1 while a copy of step k is unplaced, and the sheet
// order is the step order: the highest step on sheet s never exceeds the
// lowest step on sheet s + 1.

import { commandError, type NestItem, type NestResult } from "@hackbuild/spec";
import type { Box, Frame, PackFn, Packing, Spot } from "./box.js";

/** Item ids in assembly-order mode with no step, in item order; qty 0 items are never refused. */
export function unassignedItems(items: readonly NestItem[]): string[] {
  return items.filter((it) => it.qty > 0 && !(Number.isInteger(it.step) && it.step! >= 0)).map((it) => it.id);
}

/** Refuses an assembly-order request holding a copy with no step, naming every such item. */
export function requireSteps(items: readonly NestItem[]): void {
  const missing = unassignedItems(items);
  if (missing.length === 0) return;
  const i = items.findIndex((it) => it.id === missing[0]);
  throw commandError({
    code: "E_PARAM_MISSING", path: `/items/${i}/step`, got: items[i]!.step,
    expected: "an assembly step, a whole number from 0",
    hint: `no assembly step for ${missing.join(", ")}; give each a step, leave them out, or nest in fill mode`,
  });
}

/**
 * Steps per part, as an extraction gives them: part id to { step: count }.
 * A part on one step keeps its id; a part spread over several steps splits
 * into one item per step, id `<part>@<step>`, so every item carries one
 * step. A part with no steps is returned unchanged, without a step, and
 * listed in `unassigned`. The counts of a part must sum to its qty.
 */
export function assignSteps(
  items: readonly NestItem[],
  steps: Readonly<Record<string, Readonly<Record<string, number>>>>,
): { readonly items: NestItem[]; readonly unassigned: string[] } {
  const out: NestItem[] = [];
  const unassigned: string[] = [];
  items.forEach((it, i) => {
    const per = steps[it.id];
    if (per === undefined) {
      out.push(it);
      if (it.qty > 0) unassigned.push(it.id);
      return;
    }
    const rows = Object.entries(per).map(([s, n]) => [Number(s), n] as const).sort((a, b) => a[0] - b[0]);
    const total = rows.reduce((t, [, n]) => t + n, 0);
    if (total !== it.qty) {
      throw commandError({
        code: "E_SCHEMA", path: `/items/${i}/qty`, got: it.qty, expected: `${total}, the copies the assembly steps place`,
        hint: `part ${it.id} has ${it.qty} copies and its steps place ${total}; take the qty and the steps from one source`,
      });
    }
    const { step: _drop, ...rest } = it;
    for (const [s, n] of rows) out.push({ ...rest, id: rows.length === 1 ? it.id : `${it.id}@${s}`, qty: n, step: s });
  });
  return { items: out, unassigned };
}

/**
 * Packs the groups step by step with one packer; spots carry global sheet
 * indices. `stepOf` gives each box's step.
 */
export function stepLayout(groups: readonly (readonly Box[])[], stepOf: (b: Box) => number, frame: Frame, run: PackFn): Packing {
  const sheets: Spot[][] = [];
  const owner: number[] = [];
  const oversize: Box[] = [];
  const steps = [...new Set(groups.flatMap((g) => g.map(stepOf)))].sort((a, b) => a - b);
  const append = (p: Packing, from: number, g: number): void => {
    for (let s = from; s < p.sheets; s++) {
      sheets.push(p.spots.filter((x) => x.sheet === s));
      owner.push(g);
    }
  };
  for (const k of steps) {
    groups.forEach((group, g) => {
      const boxes = group.filter((b) => stepOf(b) === k);
      if (boxes.length === 0) return;
      const fresh = run(boxes, frame);
      oversize.push(...fresh.oversize);
      const last = sheets.length - 1;
      if (last >= 0 && owner[last] === g) {
        const held = sheets[last]!.map((x) => x.box);
        const shared = run([...held, ...boxes], frame);
        const kept = held.every((b) => shared.spots.find((x) => x.box === b)?.sheet === 0);
        if (kept && shared.oversize.length === fresh.oversize.length && shared.sheets - 1 < fresh.sheets) {
          sheets[last] = shared.spots.filter((x) => x.sheet === 0);
          append(shared, 1, g);
          return;
        }
      }
      append(fresh, 0, g);
    });
  }
  return { sheets: sheets.length, spots: sheets.flatMap((list, s) => list.map((x) => ({ ...x, sheet: s }))), oversize };
}

/** The steps on one sheet. */
export interface SheetSteps {
  /** Sheet index, count from 0. */
  readonly sheet: number;
  /** Lowest step on the sheet. */
  readonly min: number;
  /** Highest step on the sheet. */
  readonly max: number;
  /** Distinct steps on the sheet, count; above 1 marks a shared sheet. */
  readonly steps: number;
}

/** Step span per sheet of a result, from the items' steps. */
export function stepSpans(result: NestResult, items: readonly NestItem[]): SheetSteps[] {
  const stepOf = new Map(items.map((it) => [it.id, it.step]));
  return Array.from({ length: result.sheets }, (_, sheet) => {
    const on = [...new Set(result.placements.filter((p) => p.sheet === sheet).map((p) => stepOf.get(p.id)!))];
    return { sheet, min: Math.min(...on), max: Math.max(...on), steps: on.length };
  });
}

/** Assembly order against fill mode, an informational metric (D-075). */
export interface AssemblyReport {
  /** Sheets in assembly-order mode, count. */
  readonly sheets: number;
  /** Sheets in fill mode on the same items, count. */
  readonly fillSheets: number;
  /** Extra sheets assembly order costs, count. */
  readonly extra: number;
  readonly spans: readonly SheetSteps[];
}

export function assemblyReport(assembly: NestResult, fill: NestResult, items: readonly NestItem[]): AssemblyReport {
  return { sheets: assembly.sheets, fillSheets: fill.sheets, extra: assembly.sheets - fill.sheets, spans: stepSpans(assembly, items) };
}
