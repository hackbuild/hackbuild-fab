<script setup lang="ts">
// The FITS panel (M09-T05): build metrics grouped as PIP groups its fits
// table (part3.js lines 443 to 445), one row per metric with its value, unit,
// qualifier and note. A row gated by a check carries that check's verdict and
// locates the check's finding on the stage; an informational row says so.
// When a gate check ran more than once, the finding whose fix writes a param
// that drives the metric wins, then the worst verdict.
import { computed } from "vue";
import { HbPanel, HbTag } from "@virgilvox/hackbuild-ui";
import type { CheckResult, Metric } from "@hackbuild/spec";
import { fmt, locate, VERDICT_ORDER, type Located } from "@hackbuild/bench-core";
import { type LocatePart } from "@hackbuild/viewer";

interface Props {
  metrics: readonly Metric[];
  results: readonly CheckResult[];
  part: LocatePart | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{ locate: [result: CheckResult, at: Located, index: number] }>();

interface Row {
  readonly m: Metric;
  readonly gate: { readonly r: CheckResult; readonly i: number } | null;
}

function gateOf(m: Metric): Row["gate"] {
  if (m.gate === "informational") return null;
  const hits = props.results.map((r, i) => ({ r, i })).filter((x) => x.r.id === m.gate);
  const driven = hits.find((x) => x.r.fix !== undefined && (m.drivenBy ?? []).includes(x.r.fix.param));
  if (driven !== undefined) return driven;
  return [...hits].sort((a, b) => VERDICT_ORDER.indexOf(a.r.verdict) - VERDICT_ORDER.indexOf(b.r.verdict))[0] ?? null;
}

const groups = computed(() => {
  const out = new Map<string, Row[]>();
  for (const m of props.metrics) {
    const g = m.group ?? "other";
    out.set(g, [...(out.get(g) ?? []), { m, gate: gateOf(m) }]);
  }
  return [...out.entries()];
});

const value = (m: Metric): string => `${typeof m.value === "number" ? fmt(m.value) : m.value}${m.unit === undefined ? "" : ` ${m.unit}`}, ${m.qualifier}`;

function pick(row: Row): void {
  if (row.gate === null || props.part === null) return;
  emit("locate", row.gate.r, locate(row.gate.r, props.part), row.gate.i);
}
</script>

<template>
  <HbPanel heading="fits" head="instrument" data-hb="fits">
    <p v-if="metrics.length === 0">no fits yet. the first build measures them.</p>
    <div v-for="[group, rows] in groups" :key="group" class="hb-list" :data-group="group">
      <div class="hb-row" style="cursor: default">
        <span class="hb-label">{{ group }}</span>
      </div>
      <div
        v-for="row in rows"
        :key="row.m.id"
        class="hb-row"
        role="button"
        tabindex="0"
        data-hb="fit-row"
        :data-metric="row.m.id"
        :data-gate="row.m.gate"
        :data-verdict="row.gate?.r.verdict ?? 'informational'"
        style="flex-wrap: wrap"
        @click="pick(row)"
        @keydown.enter.prevent="pick(row)"
      >
        <span style="flex: 1 1 8em; min-width: 0">{{ row.m.id }}</span>
        <span class="hb-readout hbf-fit-value">{{ value(row.m) }}</span>
        <HbTag v-if="row.gate !== null" :variant="row.gate.r.verdict === 'fail' ? 'ink' : 'outline'">{{ row.gate.r.verdict }}</HbTag>
        <span style="flex: 1 1 100%; min-width: 0">{{ row.m.note }}</span>
      </div>
    </div>
  </HbPanel>
</template>
