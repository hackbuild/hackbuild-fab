// The conformance roundtrip row (M09-T12, D-128): designJson through
// loadDesign. A fab bake must give back the exact text; a legacy page is
// compared on its parsed state, as PIP test/smoke.py compares it, since a
// legacy designJson carries volatile fields beside the state.

import { isDeepStrictEqual } from "node:util";
import type { Page } from "@playwright/test";
import type { BenchHook } from "@hackbuild/spec";

/** The reason a roundtrip fails, or null when it holds. */
export function roundtripError(origin: "fab" | "legacy", before: string, after: string): string | null {
  if (origin === "fab") return after === before ? null : "designJson after loadDesign differs from the text loaded";
  const state = (t: string): unknown => (JSON.parse(t) as { state?: unknown }).state;
  return isDeepStrictEqual(state(before), state(after)) ? null : "state after loadDesign differs from the state loaded";
}

/** Runs the roundtrip on the page's __hbfHook and throws the reason when it fails. */
export async function roundtrip(page: Page, origin: "fab" | "legacy", ms: number): Promise<void> {
  const before = await page.evaluate(() => (globalThis as unknown as { __hbfHook: BenchHook }).__hbfHook.designJson());
  const after = await page.evaluate(async ([text, t]) => {
    const h = (globalThis as unknown as { __hbfHook: BenchHook }).__hbfHook;
    h.loadDesign(text);
    await h.settled(t);
    return h.designJson();
  }, [before, ms] as const);
  const err = roundtripError(origin, before, after);
  if (err !== null) throw new Error(err);
}
