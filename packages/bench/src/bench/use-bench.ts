// useBench (PLAN.md 4, tier 3 row): what a component inside a mounted
// bench reads. The shell store is the Pinia mirror of the bench-core bench
// core (stores/shell.ts); the hook is the `BENCH` global mountBench
// installs (spec/hook.ts BENCH_GLOBAL). A bench mounted with
// `hook: false`, as the kit mounts each of its shells, defines no global,
// so the hook is null there.

import { BENCH_GLOBAL, type BenchHook } from "@hackbuild/spec";
import { useShell } from "../stores/shell.js";

export interface UseBench {
  readonly shell: ReturnType<typeof useShell>;
  readonly hook: BenchHook | null;
}

/** The shell store and the bench hook; call it inside a component setup under mountBench. */
export function useBench(): UseBench {
  const hook = (globalThis as Record<string, unknown>)[BENCH_GLOBAL] as BenchHook | undefined;
  return { shell: useShell(), hook: hook ?? null };
}
