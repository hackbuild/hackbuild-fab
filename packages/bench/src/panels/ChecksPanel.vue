<script setup lang="ts">
// The CHECKS panel (M09-T05, bible 9): one row per finding in the bible 2.5
// shape, fails first. Clicking a row locates it on the stage; a row whose
// target has no place on the stage says so. A finding with a fix shows the
// fix line and one button that writes it as one undoable commit. Skipped
// checks fold into one count; with no fail and no warn the panel says what
// passed (PIP part3.js line 425).
import { computed } from "vue";
import { HbButton, HbPanel, HbTag } from "@virgilvox/hackbuild-ui";
import type { CheckResult } from "@hackbuild/spec";
import { findingLine, fixLabel, fixLine, locate, NOT_ON_STAGE, VERDICT_ORDER, type Located } from "@hackbuild/bench-core";
import { type LocatePart } from "@hackbuild/viewer";

interface Props {
  results: readonly CheckResult[];
  /** The built part findings locate on; null before the first build. */
  part: LocatePart | null;
  /** Current value at a params json pointer, for the fix direction. */
  valueAt?: (pointer: string) => unknown;
  /** Index into `results` of the row the stage shows. */
  selected?: number | null;
}

const props = withDefaults(defineProps<Props>(), { valueAt: () => undefined, selected: null });
const emit = defineEmits<{
  locate: [result: CheckResult, at: Located, index: number];
  fix: [result: CheckResult, index: number];
}>();

interface Row {
  readonly r: CheckResult;
  readonly i: number;
  readonly at: Located;
}

const rows = computed<Row[]>(() =>
  props.results
    .map((r, i) => ({ r, i, at: props.part === null ? { focus: [], bbox: null } : locate(r, props.part) }))
    .filter((x) => x.r.verdict !== "skip")
    .sort((a, b) => VERDICT_ORDER.indexOf(a.r.verdict) - VERDICT_ORDER.indexOf(b.r.verdict) || a.i - b.i),
);
const skipped = computed(() => props.results.filter((r) => r.verdict === "skip").length);
const clear = computed(() => rows.value.length > 0 && rows.value.every((x) => x.r.verdict === "pass"));
// G-33: with any fail or warn the panel still says how many checks ran.
const counts = computed(() => ({
  fail: rows.value.filter((x) => x.r.verdict === "fail").length,
  warn: rows.value.filter((x) => x.r.verdict === "warn").length,
  pass: rows.value.filter((x) => x.r.verdict === "pass").length,
}));

function pick(row: Row): void {
  emit("locate", row.r, row.at, row.i);
}
</script>

<template>
  <HbPanel heading="checks" head="instrument" data-hb="checks">
    <p v-if="results.length === 0">no checks yet. the first build runs them.</p>
    <p v-else-if="clear" data-hb="checks-clear">all {{ rows.length }} checks that ran pass.</p>
    <p v-else data-hb="checks-count">{{ rows.length }} checks ran: {{ counts.fail }} fail, {{ counts.warn }} warn, {{ counts.pass }} pass.</p>
    <div class="hb-list">
      <div
        v-for="row in rows"
        :key="row.i"
        class="hb-row"
        :class="{ 'is-on': selected === row.i }"
        role="button"
        tabindex="0"
        data-hb="check-row"
        :data-check="row.r.id"
        :data-verdict="row.r.verdict"
        :data-index="row.i"
        style="flex-wrap: wrap"
        @click="pick(row)"
        @keydown.enter.prevent="pick(row)"
      >
        <HbTag :variant="row.r.verdict === 'fail' ? 'ink' : 'outline'" data-hb="verdict">{{ row.r.verdict }}</HbTag>
        <span data-hb="finding" style="flex: 1 1 16em; min-width: 0">{{ findingLine(row.r) }}</span>
        <span v-if="row.at.focus.length === 0" class="hb-label" data-hb="not-on-stage">{{ NOT_ON_STAGE }}</span>
        <template v-if="row.r.fix !== undefined && row.r.verdict !== 'pass'">
          <span data-hb="fix-line" style="flex: 1 1 16em; min-width: 0">{{ fixLine(row.r.fix, valueAt(row.r.fix.param)) }}</span>
          <HbButton size="sm" variant="secondary" data-hb="fix" @click.stop="emit('fix', row.r, row.i)">{{ fixLabel(row.r.fix) }}</HbButton>
        </template>
      </div>
    </div>
    <p v-if="skipped > 0" data-hb="checks-skipped">{{ skipped }} not run on this design.</p>
  </HbPanel>
</template>
