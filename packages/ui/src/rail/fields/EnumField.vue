<script setup lang="ts">
// enum rows (M09-T08 table, D-125): chips for at most CHIP_MAX options, a
// select past that (PIP: shape, group type and stick top are chips, the pin
// map is selects). With a constraintDim the options come from the legal
// band of the last build; an illegal option is never offered. Chips fill
// ink when on, so pink stays free for the step's one focal element.
import { computed, inject } from "vue";
import { HbChip, HbIcon, HbParamRow } from "@virgilvox/hackbuild-ui";
import type { ParamPointer } from "@hackbuild/spec";
import { CHIP_MAX, legalOptions, type EnumField } from "../model.js";
import { RAIL, describe, fieldBand, settleKind, type CommitKind } from "../context.js";

interface Props {
  field: EnumField;
  value: string;
  path: string;
  pointer: ParamPointer;
}

const props = defineProps<Props>();
const emit = defineEmits<{ edit: [path: string, value: unknown, kind: CommitKind] }>();
const ctx = inject(RAIL, undefined);

const band = computed(() => fieldBand(ctx, props.field, props.pointer));
const options = computed(() => legalOptions(props.field, band.value));
const chips = computed(() => options.value.length <= CHIP_MAX);
const tip = computed(() => describe(props.field, band.value));
const helpId = computed(() => `hbf-help-${props.path.replace(/\W/g, "-")}`);
const changed = computed(() => props.value !== props.field.default);

function pick(v: string): void {
  if (v === props.value) return;
  emit("edit", props.path, v, settleKind(props.field));
}
</script>

<template>
  <div class="hbf-row" data-hb="param" :data-field="field.id" :data-path="path" :title="tip || undefined" :aria-describedby="tip ? helpId : undefined">
    <div v-if="chips" class="hb-prow">
      <span class="hb-prow-label">
        {{ field.label }}
        <button
          type="button"
          class="hb-prow-reset"
          :hidden="!changed"
          :aria-label="`reset ${field.label} to ${field.default}`"
          :title="`reset to ${field.default}`"
          @click="pick(field.default)"
        >
          <HbIcon name="undo" :size="11" />
        </button>
      </span>
      <div class="hbf-chips" role="group" :aria-label="field.label" data-hb="chips">
        <HbChip
          v-for="o in options"
          :key="o.value"
          toggle
          :model-value="o.value === value"
          :data-value="o.value"
          @click="pick(o.value)"
        >{{ o.label }}</HbChip>
      </div>
    </div>
    <HbParamRow
      v-else
      type="select"
      :label="field.label"
      :options="options.map((o) => ({ label: o.label, value: o.value }))"
      :default-value="field.default"
      :model-value="value"
      @commit="(v) => pick(String(v))"
    />
    <span v-if="tip" :id="helpId" class="hb-sr">{{ tip }}</span>
  </div>
</template>
