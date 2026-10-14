<script setup lang="ts">
// derived rows (M09-T08 table): read-only, VT323 value with unit, the help
// line as the tooltip, never editable. The value is the build's metric
// `derived.<field id>` (Author.derive records join the part's metrics under
// that id, as `derived.T` in packages/ui-core/test/bench/flex-pair.part.json);
// before the first build it reads unknown. The qualifier rides beside it.
import { computed, inject } from "vue";
import type { DerivedField, ParamPointer } from "@hackbuild/spec";
import { RAIL } from "../context.js";
import { unitOf } from "../model.js";

interface Props {
  field: DerivedField;
  path: string;
  pointer: ParamPointer;
}

const props = defineProps<Props>();
const ctx = inject(RAIL, undefined);
const metric = computed(() => ctx?.metrics.value.get(`derived.${props.field.id}`) ?? null);
const shown = computed(() => {
  const m = metric.value;
  if (m === null) return "unknown";
  return typeof m.value === "number" ? String(Number(m.value.toFixed(3))) : m.value;
});
const unit = computed(() => metric.value?.unit ?? unitOf(props.field));
const over = computed(() => {
  const m = metric.value;
  const lim = props.field.limit;
  if (m === null || typeof m.value !== "number" || lim === undefined) return false;
  return (lim.max !== undefined && m.value > lim.max) || (lim.min !== undefined && m.value < lim.min);
});
const word = computed(() => {
  const m = metric.value;
  if (m === null || typeof m.value !== "number") return "";
  return props.field.verdict?.find((b) => (m.value as number) < b.below)?.word ?? "";
});
</script>

<template>
  <div class="hbf-row hb-prow" data-hb="derived" :data-field="field.id" :data-path="path" :title="field.help || undefined">
    <span class="hb-prow-label">{{ field.label }}</span>
    <div class="hb-prow-ctl">
      <output class="hbf-derived" :class="{ 'is-over': over }" :aria-label="`${field.label}, ${shown} ${unit}, ${metric?.qualifier ?? 'unknown'}`">
        <span class="hbf-v">{{ unit ? `${shown} ${unit}` : shown }}</span> <span class="hbf-q">{{ metric?.qualifier ?? "unknown" }}</span><template v-if="word"> <span class="hbf-word">{{ word }}</span></template>
      </output>
    </div>
  </div>
</template>
