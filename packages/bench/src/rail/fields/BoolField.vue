<script setup lang="ts">
// bool rows (M09-T08 table): one switch, commit on change.
import { computed } from "vue";
import { HbParamRow } from "@virgilvox/hackbuild-ui";
import type { ParamField, ParamPointer } from "@hackbuild/spec";
import { describe, settleKind, type CommitKind } from "../context.js";

interface Props {
  field: Extract<ParamField, { readonly type: "bool" }>;
  value: boolean;
  path: string;
  pointer: ParamPointer;
}

const props = defineProps<Props>();
const emit = defineEmits<{ edit: [path: string, value: unknown, kind: CommitKind] }>();
const tip = computed(() => describe(props.field, null));
const helpId = computed(() => `hbf-help-${props.path.replace(/\W/g, "-")}`);
</script>

<template>
  <div class="hbf-row" data-hb="param" :data-field="field.id" :data-path="path" :title="tip || undefined" :aria-describedby="tip ? helpId : undefined">
    <HbParamRow
      type="switch"
      :label="field.label"
      :default-value="field.default"
      :model-value="value"
      @commit="(v) => emit('edit', path, v, settleKind(field))"
    />
    <span v-if="tip" :id="helpId" class="hb-sr">{{ tip }}</span>
  </div>
</template>
