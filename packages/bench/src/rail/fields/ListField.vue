<script setup lang="ts">
// list rows (M09-T08 table): one block per instance with an instance head,
// the item's enum fields as per-instance chips, add and remove inside min
// and max. Each instance edit is one commit. Ported from PIP renderGroups
// (part3.js lines 312 to 327): a group head, its kind and type chips, then
// x, y and pitch, each shown or hidden by the instance's own values.
import { computed } from "vue";
import { HbButton, HbIcon } from "@virgilvox/hackbuild-ui";
import type { ParamPointer } from "@hackbuild/spec";
import FieldRow from "./FieldRow.vue";
import { itemDefaults, type ListField, type Values } from "../model.js";
import { instanceHead, visibleFields, type Scope } from "../showWhen.js";
import type { CommitKind } from "../context.js";

interface Props {
  field: ListField;
  value: unknown;
  path: string;
  pointer: ParamPointer;
  scopes?: readonly Scope[];
}

const props = withDefaults(defineProps<Props>(), { scopes: () => [] });
const emit = defineEmits<{ edit: [path: string, value: unknown, kind: CommitKind] }>();

const items = computed<Values[]>(() => (Array.isArray(props.value) ? (props.value as Values[]) : []));

function add(): void {
  if (items.value.length >= props.field.max) return;
  emit("edit", props.path, [...items.value.map((x) => ({ ...x })), itemDefaults(props.field.item)], "commit");
}

function remove(i: number): void {
  if (items.value.length <= props.field.min) return;
  emit("edit", props.path, items.value.filter((_, j) => j !== i).map((x) => ({ ...x })), "commit");
}
</script>

<template>
  <div class="hbf-list" data-hb="list" :data-field="field.id" :data-path="path">
    <div
      v-for="(inst, i) in items"
      :key="i"
      class="hbf-inst"
      data-hb="instance"
      :data-index="i"
      role="group"
      :aria-label="instanceHead(field, inst, i)"
    >
      <div class="hbf-inst-head">
        <span data-hb="instance-head">{{ instanceHead(field, inst, i) }}</span>
        <button
          v-if="items.length > field.min"
          type="button"
          class="hb-iconbtn hbf-inst-remove"
          data-hb="instance-remove"
          :aria-label="`remove ${instanceHead(field, inst, i)}`"
          @click="remove(i)"
        ><HbIcon name="x" :size="12" /></button>
      </div>
      <FieldRow
        v-for="f in visibleFields(field.item, [inst, ...scopes])"
        :key="f.id"
        :field="f"
        :value="inst[f.id]"
        :path="`${path}.${i}.${f.id}`"
        :pointer="`${pointer}/${i}/${f.id}`"
        :scopes="[inst, ...scopes]"
        @edit="(p: string, v: unknown, k: CommitKind) => emit('edit', p, v, k)"
      />
    </div>
    <HbButton
      v-if="items.length < field.max"
      size="sm"
      variant="secondary"
      data-hb="instance-add"
      @click="add"
    >add {{ field.label }}</HbButton>
    <p v-else class="hb-prow-why" data-hb="instance-full">{{ field.max }} {{ field.label }} is the most this design takes.</p>
  </div>
</template>
