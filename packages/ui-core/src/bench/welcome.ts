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

/** Blank first and primary, then each preset in declared order. */
export function welcomeStarts(presets: readonly { readonly id: string; readonly label: string }[]): WelcomeStart[] {
  return [{ id: "blank", label: "start blank", primary: true }, ...presets.map((p) => ({ id: p.id, label: p.label, primary: false }))];
}
