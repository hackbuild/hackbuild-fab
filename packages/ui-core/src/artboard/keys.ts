// Board keys (KNUCKLE part6.js:551 to 560, lineage
// inlay.face-editor/knuckle-part6): arrows nudge 0.25 mm and 5 mm with
// shift, Delete and Backspace remove, ctrl or cmd D duplicates, `[` lowers
// and `]` raises. Undo and redo keys belong to the M09 interaction contract,
// so they are left for the host. Keys typed into a field never reach here.

/** Arrow nudge, mm, and with shift (part6.js:556). */
export const NUDGE_MM = 0.25;
export const NUDGE_SHIFT_MM = 5;

export interface BoardKey {
  readonly key: string;
  readonly shiftKey: boolean;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly altKey: boolean;
}

export type KeyAction =
  | { readonly kind: "nudge"; readonly ax: number; readonly ay: number; readonly step: number; readonly shift: boolean }
  | { readonly kind: "delete" }
  | { readonly kind: "duplicate" }
  | { readonly kind: "reorder"; readonly by: 1 | -1 };

const ARROWS: Readonly<Record<string, readonly [number, number]>> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, 1],
  ArrowDown: [0, -1],
};

/** The action a key asks of the selected layer, or null when the board leaves the key alone. */
export function keyAction(e: BoardKey): KeyAction | null {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") return { kind: "duplicate" };
  if (e.ctrlKey || e.metaKey) return null;
  if (e.key === "[") return { kind: "reorder", by: -1 };
  if (e.key === "]") return { kind: "reorder", by: 1 };
  if (e.key === "Delete" || e.key === "Backspace") return { kind: "delete" };
  const a = ARROWS[e.key];
  if (a === undefined) return null;
  return { kind: "nudge", ax: a[0], ay: a[1], step: e.shiftKey ? NUDGE_SHIFT_MM : NUDGE_MM, shift: e.shiftKey };
}
