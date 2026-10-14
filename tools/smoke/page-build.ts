// A fab bake builds in its own page (D-264): bake.json `build` bundles the
// library build and check pipeline into a classic script that assigns
// `globalThis.<global>`, and the bench entry mounts it as `opts.build`.
// The harness opens the file as shipped and injects no build. Probes that
// need a thrown or a held build (G-11, G-56, the D-214 error spec) arm
// `hbfFaults` before the page loads: the switch wraps the page build's own
// build(), so the next build throws `forced throw` or waits, then runs the
// in-page build unchanged.

import { readFileSync } from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";
import { findManifests } from "../bake/bake.mjs";

interface Manifest { id: string; out?: string; shell: string; build?: { global: string } }

/** The page build global of each fab bake id that carries one, read from every bake.json. */
export function pageBuilds(): ReadonlyMap<string, string> {
  const out = new Map<string, string>();
  for (const file of findManifests() as string[]) {
    const m = JSON.parse(readFileSync(file, "utf8")) as Manifest;
    if (m.shell === "ui" && m.build !== undefined) out.set(m.id, m.build.global);
  }
  return out;
}

/** The fault switches a harness sets in the page. */
export interface Faults {
  /** The next build throws `forced throw`. */
  throwNext: boolean;
  /** The next build waits this long first, ms; 0 is none. */
  holdNextMs: number;
}

/**
 * Wraps the page build's build() before any page script runs. `global` is
 * the bake.json build.global; the classic script's `var` assignment lands
 * on the accessor, so the wrap is in place before the bench mounts.
 */
export async function armFaults(page: Page, global: string): Promise<void> {
  await page.addInitScript((name: string) => {
    const g = globalThis as unknown as Record<string, unknown> & { hbfFaults: { throwNext: boolean; holdNextMs: number } };
    const faults = { throwNext: false, holdNextMs: 0 };
    g.hbfFaults = faults;
    let held: unknown;
    Object.defineProperty(globalThis, name, {
      configurable: true,
      get: () => held,
      set: (ns: { page?: { build(v: unknown): Promise<unknown> } } | undefined) => {
        const p = ns?.page;
        if (p !== undefined) {
          const build = p.build.bind(p);
          p.build = async (v: unknown) => {
            if (faults.throwNext) {
              faults.throwNext = false;
              throw new Error("forced throw");
            }
            if (faults.holdNextMs > 0) {
              const ms = faults.holdNextMs;
              faults.holdNextMs = 0;
              await new Promise((r) => setTimeout(r, ms));
            }
            return build(v);
          };
        }
        held = ns;
      },
    });
  }, global);
}

/** Sets one fault switch in an armed page. */
export const setFault = (page: Page, faults: Partial<Faults>): Promise<void> =>
  page.evaluate((f) => {
    Object.assign((globalThis as unknown as { hbfFaults: Faults }).hbfFaults, f);
  }, faults);

/** The flex-pair bake path, for the specs that drive it alone. */
export const flexPairBake = (root: string): string => path.join(root, "dist/bench/flex-pair.html");
