<script setup lang="ts">
// text, art and part rows (M09-T08 table). text is a field that commits on
// change. art hosts the M03 art board, which mounts on the stage of a kind
// that declares it; part is the catalog picker stub until M10. Both say so
// on the row instead of offering a control that does nothing.
import { computed } from "vue";
import { HbInput } from "@virgilvox/hackbuild-ui";
import type { ParamField, ParamPointer } from "@hackbuild/spec";
import { describe, settleKind, type CommitKind } from "../context.js";

type TextLike = Extract<ParamField, { readonly type: "text" | "art" | "part" }>;

interface Props {
  field: TextLike;
  value: unknown;
  path: string;
  pointer: ParamPointer;
}

const props = defineProps<Props>();
const emit = defineEmits<{ edit: [path: string, value: unknown, kind: CommitKind] }>();
const tip = computed(() => describe(props.field, null));
const inputId = computed(() => `hbf-in-${props.path.replace(/\W/g, "-")}`);
const max = computed(() => (props.field.type === "text" ? props.field.max : undefined));

function onChange(e: Event): void {
  emit("edit", props.path, (e.target as HTMLInputElement).value, settleKind(props.field));
}
</script>

<template>
  <div class="hbf-row hb-prow" data-hb="param" :data-field="field.id" :data-path="path" :title="tip || undefined">
    <label class="hb-prow-label" :for="inputId">{{ field.label }}</label>
    <div class="hb-prow-ctl">
      <HbInput
        v-if="field.type === 'text'"
        :id="inputId"
        :model-value="String(value ?? '')"
        :maxlength="max"
        @change="onChange"
      />
      <span v-else-if="field.type === 'art'" :id="inputId" class="hb-prow-why" data-hb="art-host">art board opens on the stage of this step.</span>
      <span v-else :id="inputId" class="hb-prow-why" data-hb="part-stub">catalog picker not in this bench yet. {{ value ?? "no part" }} stays set.</span>
    </div>
  </div>
</template>
