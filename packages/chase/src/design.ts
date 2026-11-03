// designToChase (plan v11.2 section 4.1): lowers a design() module to the
// Chase every other stage reads. Pure data in, data out; the module is never
// executed (D-178). An inline `build` function lowers to the module and
// export the sandbox imports: design.ts and its `build` member.

import type { Chase, ChaseSourceSpan, Design } from "@hackbuild/spec";

/** Directory files that hold a design, in lookup order; chase.ts wins when both exist. */
export const DESIGN_FILES = ["chase.ts", "design.ts"] as const;
export type DesignFile = (typeof DESIGN_FILES)[number];

/** The file and export name an inline build is lowered to. */
export const INLINE_BUILD = { module: "./design.ts", fn: "build" } as const;

/** The exported constant a design.ts holds. */
export const DESIGN_EXPORT = "designModule";

/** What the reader stores for an inline build function it did not evaluate. */
export const OPAQUE_BUILD = "[inline build]" as const;

/**
 * The Chase a design lowers to. A `build` that is the OPAQUE_BUILD marker
 * (an inline function the reader skipped) lowers to INLINE_BUILD. Members the
 * design leaves out stay absent, so a lowered chase equals the chase.ts it
 * replaces key for key.
 */
export function designToChase(d: Design | Record<string, unknown>): Chase {
  const { id, meta, slots, build, widgets: _widgets, exports, assertions, ...rest } = d as Record<string, unknown>;
  const lowered: Record<string, unknown> = {
    meta: { id, ...(meta as Record<string, unknown> | undefined) },
    materials: slots,
    ...rest,
    build: build === OPAQUE_BUILD || typeof build === "function" ? { ...INLINE_BUILD } : build,
    exports: exports ?? [],
    assertions: assertions ?? [],
  };
  return lowered as unknown as Chase;
}

/** The widgets a design declares, for the bench layer; the Chase carries none. */
export function designWidgets(d: Design | Record<string, unknown>): Design["widgets"] {
  return (d as Design).widgets;
}

/** A span pointer in design coordinates, moved to the lowered chase's: /id to /meta/id, /slots to /materials. */
export function chasePointer(pointer: string): string {
  if (pointer === "/id") return "/meta/id";
  if (pointer === "/slots" || pointer.startsWith("/slots/")) return `/materials${pointer.slice("/slots".length)}`;
  return pointer;
}

/** Spans of a design.ts re-keyed to the lowered chase; the inline build span stays at /build. */
export function chaseSpans(spans: readonly ChaseSourceSpan[]): ChaseSourceSpan[] {
  return spans.map((s) => ({ ...s, pointer: chasePointer(s.pointer) }));
}

/** True when the source text is a design module rather than a chase. */
export function isDesignSource(source: string): boolean {
  return /^export\s+const\s+designModule\b/m.test(source);
}
