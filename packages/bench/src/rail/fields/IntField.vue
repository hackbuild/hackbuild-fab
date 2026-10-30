<script setup lang="ts">
// int rows (M09-T08 table): a number, with a range beside it when the span
// is under INT_RANGE_SPAN. Commit on change; a range drag still touches.
import { computed, inject } from "vue";
import { HbIcon, HbParamRow } from "@virgilvox/hackbuild-ui";
import type { ParamPointer } from "@hackbuild/spec";
import { INT_RANGE_SPAN, type NumericField } from "../model.js";
import { RAIL, describe, fieldBand, settleKind, type CommitKind } from "../context.js";

interface Props {
  field: NumericField;
  value: number;
  path: string;
  pointer: ParamPointer;
}

const props = defineProps<Props>();
const emit = defineEmits<{ edit: [path: string, value: unknown, kind: CommitKind] }>();
const ctx = inject(RAIL, undefined);

const ranged = computed(() => props.field.range[1] - props.field.range[0] < INT_RANGE_SPAN);
const tip = computed(() => describe(props.field, fieldBand(ctx, props.field, props.pointer)));
const helpId = computed(() => `hbf-help-${props.path.replace(/\W/g, "-")}`);
const changed = computed(() => props.value !== props.field.default);

function onNumber(e: Event): void {
  const input = e.target as HTMLInputElement;
  const n = Math.round(Number.parseFloat(input.value));
  if (!Number.isFinite(n)) {
    input.value = String(props.value);
    return;
  }
  const v = Math.min(props.field.range[1], Math.max(props.field.range[0], n));
  input.value = String(v);
  emit("edit", props.path, v, settleKind(props.field));
}
</script>

<template>
  <div class="hbf-row" data-hb="param" :data-field="field.id" :data-path="path" :title="tip || undefined" :aria-describedby="tip ? helpId : undefined">
    <HbParamRow
      v-if="ranged"
      type="range"
      :label="field.label"
      :min="field.range[0]"
      :max="field.range[1]"
      :step="1"
      :default-value="field.default"
      :model-value="value"
      @touch="(v) => emit('edit', path, v, 'touch')"
      @commit="(v) => emit('edit', path, v, settleKind(field))"
    />
    <div v-else class="hb-prow">
      <span class="hb-prow-label">
        {{ field.label }}
        <button
          type="button"
          class="hb-prow-reset"
          :hidden="!changed"
          :aria-label="`reset ${field.label} to ${field.default}`"
          :title="`reset to ${field.default}`"
          @click="emit('edit', path, field.default, settleKind(field))"
        >
          <HbIcon name="undo" :size="11" />
        </button>
      </span>
      <div class="hb-prow-ctl" />
      <input
        class="hb-input hb-prow-num"
        type="number"
        :min="field.range[0]"
        :max="field.range[1]"
        step="1"
        :value="value"
        :aria-label="`${field.label} value`"
        @change="onNumber"
      />
    </div>
    <span v-if="tip" :id="helpId" class="hb-sr">{{ tip }}</span>
  </div>
</template>
