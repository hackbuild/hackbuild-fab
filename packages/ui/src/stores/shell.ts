// The shell mirror (M09-T07 step 10, D-123): a Pinia setup store that holds
// what the shell shows and copies the ui-core bench core on each core event.
// The core stays the truth: nothing here is written back except through the
// core's own verbs, and the copy is a structured clone, so a component that
// mutates what it reads changes nothing.

import { defineStore } from "pinia";
import { computed, ref, shallowRef } from "vue";
import type { BenchCore, BuildResult } from "@hackbuild/ui-core";
import type { CheckResult, Metric, ParamEnvelope } from "@hackbuild/spec";

export type Values = Record<string, unknown>;

/** What a bench build reports beside the part, read by the status strip and the rail. */
export interface BenchReport {
  readonly results?: readonly CheckResult[];
  readonly metrics?: readonly Metric[];
  /** constraints.query in param form for this build (M01); null when the build ran none. */
  readonly envelope?: ParamEnvelope | null;
  /** Triangle count of every body, computed. */
  readonly tris?: number;
  /** Bounding box size x, y, z in mm, computed. */
  readonly dims?: readonly [number, number, number] | null;
  /** True when the part fits the machine bed, false when over, null when unknown. */
  readonly fitsBed?: boolean | null;
  /** Notes the build filled from Part IR data, by notes panel id (D-124). */
  readonly notes?: Readonly<Record<string, string>>;
}

export type BenchResult = BuildResult<unknown, BenchReport>;

export const useShell = defineStore("hbf-shell", () => {
  const step = ref(0);
  const visited = ref<number[]>([0]);
  const cam = ref("iso");
  const modes = ref<string[]>([]);
  const welcomeOpen = ref(false);
  /** Drive pad targets held, in press order (ui-core createPad mirror). */
  const held = ref<string[]>([]);

  const values = shallowRef<Values>({});
  const rev = ref(0);
  const built = ref(-1);
  const busy = ref(false);
  const building = ref(false);
  const stale = ref(true);
  const error = ref<string | null>(null);
  const log = shallowRef<readonly string[]>([]);
  const result = shallowRef<BenchResult | null>(null);

  /** Copy every field the shell reads from the core. Called on each core event. */
  function mirror(core: BenchCore<Values, unknown, BenchReport>): void {
    values.value = structuredClone(core.state);
    rev.value = core.rev;
    built.value = core.built;
    busy.value = core.busy;
    building.value = core.building;
    stale.value = core.stale;
    error.value = core.error;
    log.value = [...core.log];
    result.value = core.result as BenchResult | null;
  }

  function goto(i: number): void {
    step.value = i;
    if (!visited.value.includes(i)) visited.value = [...visited.value, i];
  }

  /** mesh current: the last build read the current rev and no touch is pending. */
  const current = computed(() => !stale.value && built.value === rev.value && result.value !== null);
  const report = computed<BenchReport>(() => result.value?.report ?? {});
  const metrics = computed<ReadonlyMap<string, Metric>>(() => new Map((report.value.metrics ?? []).map((m) => [m.id, m])));
  const findings = computed(() => (report.value.results ?? []).filter((r) => r.verdict === "fail" || r.verdict === "warn").length
    + (result.value?.warnings.length ?? 0));

  return { step, visited, cam, modes, welcomeOpen, held, values, rev, built, busy, building, stale, error, log, result, mirror, goto, current, report, metrics, findings };
});
