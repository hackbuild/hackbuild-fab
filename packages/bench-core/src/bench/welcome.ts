// Welcome memory (D-125, bible section 9): the card shows at boot until it
// is dismissed once; Guide reopens it without clearing the memory. PIP
// showed it on every load (plan-deltas R33). The starts are blank plus the
// chase presets, and the first start is the view's one focal pink.

import { get, set } from "./storage.js";

export const WELCOME_DISMISSED = "dismissed";

export function welcomeKey(designId: string): string {
  return `hbf.${designId}.welcome`;
}

export interface WelcomeStart {
  readonly id: string;
  readonly label: string;
  /** The primary start, filled pink; exactly one per welcome. */
  readonly primary: boolean;
}

export interface Welcome {
  readonly open: boolean;
  /** Close and remember. */
  dismiss(): void;
  /** Guide: open again, memory kept. */
  reopen(): void;
}

/** Boot decision: open unless storage reads `dismissed`. */
export function createWelcome(designId: string, onChange?: (open: boolean) => void): Welcome {
  let open = get(welcomeKey(designId)) !== WELCOME_DISMISSED;
  return {
    get open() {
      return open;
    },
    dismiss() {
      open = false;
      set(welcomeKey(designId), WELCOME_DISMISSED);
      onChange?.(open);
    },
    reopen() {
      open = true;
      onChange?.(open);
    },
  };
}

/** The blank start's id. */
export const BLANK_START = "blank";
// A preset start's id carries this prefix, so no preset id (PIP and COLLAR
// both declare a preset named blank) can equal the blank start's.
const PRESET_START = "preset:";

/** The start id of a chase preset. */
export function presetStart(presetId: string): string {
  return `${PRESET_START}${presetId}`;
}

/** The preset a start id names, or null for the blank start and any id that names no preset. */
export function startPreset(startId: string): string | null {
  return startId.startsWith(PRESET_START) ? startId.slice(PRESET_START.length) : null;
}

/** Blank first and primary, then each preset in declared order. */
export function welcomeStarts(presets: readonly { readonly id: string; readonly label: string }[]): WelcomeStart[] {
  return [{ id: BLANK_START, label: "start blank", primary: true }, ...presets.map((p) => ({ id: presetStart(p.id), label: p.label, primary: false }))];
}
