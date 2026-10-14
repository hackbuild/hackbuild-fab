<script setup lang="ts">
// mm, deg, ratio and number rows: range plus number on one value, unit span
// (M09-T08 table). Range input is touch, change is commit (PIP part3.js line
// 292). A constraintDim draws the legal band on the track from the envelope.
import { computed, inject } from "vue";
import { HbParamRow } from "@virgilvox/hackbuild-ui";
import type { ParamPointer } from "@hackbuild/spec";
import { bandSpan, stepOf, unitOf, type NumericField } from "../model.js";
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

const band = computed(() => fieldBand(ctx, props.field, props.pointer));
const tip = computed(() => describe(props.field, band.value));
const span = computed(() => (band.value === null ? null : bandSpan(band.value, props.field)));
const helpId = computed(() => `hbf-help-${props.path.replace(/\W/g, "-")}`);
</script>

<template>
  <div
    class="hbf-row"
    data-hb="param"
    :data-field="field.id"
    :data-path="path"
    :title="tip || undefined"
    :aria-describedby="tip ? helpId : undefined"
  >
    <HbParamRow
      type="range"
      :label="field.label"
      :min="field.range[0]"
      :max="field.range[1]"
      :step="stepOf(field)"
      :unit="unitOf(field)"
      :default-value="field.default"
      :model-value="value"
      @touch="(v) => emit('edit', path, v, 'touch')"
      @commit="(v) => emit('edit', path, v, settleKind(field))"
    />
    <div
      v-if="span !== null"
      class="hbf-band"
      data-hb="legal-band"
      :class="{ 'is-unsat': band?.unsat }"
      :style="{ '--hbf-band-from': span.from, '--hbf-band-to': span.to }"
      aria-hidden="true"
    />
    <span v-if="tip" :id="helpId" class="hb-sr">{{ tip }}</span>
  </div>
</template>
